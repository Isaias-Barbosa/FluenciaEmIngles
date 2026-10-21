begin;
create table public.lesson_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key(user_id,lesson_id)
);
-- Preserve lessons completed under the former all-questions-correct rule.
insert into public.lesson_completions(user_id,lesson_id)
select a.user_id,q.lesson_id from public.question_attempts a
join public.questions q on q.id=a.question_id and q.is_published
join public.lessons l on l.id=q.lesson_id and l.is_published
where a.is_correct group by a.user_id,q.lesson_id
having count(distinct q.id)=(select count(*) from public.questions p where p.lesson_id=q.lesson_id and p.is_published);
create table public.lesson_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  question_ids uuid[] not null check(cardinality(question_ids)>0),
  answers jsonb not null default '[]'::jsonb check(jsonb_typeof(answers)='array'),
  passed boolean not null default false,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create unique index lesson_runs_one_active on public.lesson_runs(user_id,lesson_id) where finished_at is null;
alter table public.lesson_runs enable row level security;
alter table public.lesson_completions enable row level security;
revoke all on public.lesson_runs,public.lesson_completions from public,anon,authenticated;
grant select on public.lesson_runs,public.lesson_completions to authenticated;
grant all on public.lesson_runs,public.lesson_completions to service_role;
create policy lesson_runs_own on public.lesson_runs for select to authenticated using(user_id=auth.uid());
create policy lesson_completions_own on public.lesson_completions for select to authenticated using(user_id=auth.uid());

create function public.start_lesson_run(p_lesson_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_run public.lesson_runs; v_ids uuid[];
begin
 if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text||p_lesson_id::text,1));
 select array_agg(q.id order by q.sort_order,q.id) into v_ids from public.questions q
 join public.lessons l on l.id=q.lesson_id
 where l.id=p_lesson_id and l.is_published and q.is_published;
 if v_ids is null then raise exception 'Published lesson not found' using errcode='22023'; end if;
 select * into v_run from public.lesson_runs where user_id=v_user and lesson_id=p_lesson_id and finished_at is null for update;
 -- Changes to the question set or order invalidate an unfinished snapshot.
 if found and v_run.question_ids is distinct from v_ids then
   update public.lesson_runs set finished_at=now() where id=v_run.id;
   v_run.id:=null;
 end if;
 if v_run.id is null then
   insert into public.lesson_runs(user_id,lesson_id,question_ids) values(v_user,p_lesson_id,v_ids) returning * into v_run;
 end if;
 return to_jsonb(v_run);
end; $$;

create function public.submit_lesson_run_answer(p_run_id uuid,p_question_id uuid,p_submitted_answer text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_run public.lesson_runs;v_existing jsonb;v_result record;v_score integer;v_answer text;v_explanation text;v_count integer;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select * into v_run from public.lesson_runs where id=p_run_id and user_id=v_user for update;
 if not found then raise exception 'Lesson attempt not found' using errcode='22023'; end if;
 select item into v_existing from jsonb_array_elements(v_run.answers) item where item->>'question_id'=p_question_id::text;
 -- A retry after a lost network response returns the original result without scoring twice.
 if v_existing is not null then return to_jsonb(v_run); end if;
 v_count:=jsonb_array_length(v_run.answers);
 if v_run.finished_at is not null or v_run.question_ids[v_count+1] is distinct from p_question_id then
   raise exception 'Answer the current question in order' using errcode='22023';
 end if;
 if not exists(select 1 from public.questions where id=p_question_id and lesson_id=v_run.lesson_id and is_published) then
   raise exception 'Question is no longer available; reopen the lesson' using errcode='22023';
 end if;
 select * into v_result from public.submit_question_answer(p_question_id,p_submitted_answer);
 select coalesce(r.choices->>r.correct_option,a.accepted_answers[1]),coalesce(r.explanation,a.explanation)
 into v_answer,v_explanation from public.question_answers a
 left join public.question_replacements r on r.question_id=a.question_id and r.user_id=v_user
 where a.question_id=p_question_id;
 v_run.answers:=v_run.answers||jsonb_build_array(jsonb_build_object('question_id',p_question_id,'submitted_answer',btrim(p_submitted_answer),'is_correct',v_result.is_correct,'correct_answer',v_answer,'explanation',v_explanation));
 select count(*)::integer into v_score from jsonb_array_elements(v_run.answers) item where (item->>'is_correct')::boolean;
 if jsonb_array_length(v_run.answers)=cardinality(v_run.question_ids) then
   v_run.finished_at:=now();
   v_run.passed:=v_score>=ceil(cardinality(v_run.question_ids)*0.6);
   if v_run.passed then insert into public.lesson_completions(user_id,lesson_id) values(v_user,v_run.lesson_id) on conflict do nothing; end if;
 end if;
 update public.lesson_runs set answers=v_run.answers,passed=v_run.passed,finished_at=v_run.finished_at where id=v_run.id;
 return to_jsonb(v_run);
end; $$;
revoke all on function public.start_lesson_run(uuid),public.submit_lesson_run_answer(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.start_lesson_run(uuid),public.submit_lesson_run_answer(uuid,uuid,text) to authenticated;
-- A prior correct answer must not block text replacement in a fresh attempt.
create or replace function public.assign_reserve_question(p_question_id uuid)
returns table (question_id uuid, prompt text, choices jsonb, source_url text, source_title text, source_license text, origin text)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_level uuid;
  v_reserve public.question_reserve%rowtype;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  -- Serialize assignments per learner and coordinate with submit_question_answer.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || p_question_id::text, 0));
  if exists (select 1 from public.get_my_question_replacements() r where r.question_id = p_question_id) then
    return query select r.* from public.get_my_question_replacements() r where r.question_id = p_question_id;
    return;
  end if;
  select p.current_level_id into v_level
  from public.profiles p
  join public.questions q on q.id = p_question_id
  join public.lessons l on l.id = q.lesson_id and l.level_id = p.current_level_id
  join public.language_levels ll on ll.id = p.current_level_id
  join public.languages lang on lang.id = ll.language_id and lang.code = 'en'
  where p.user_id = v_user and p.onboarding_completed and q.is_published and l.is_published
    and (q.question_type = 'listening' or q.audio_path is not null)
  for share of p, q, l;
  if v_level is null then raise exception 'Published audio question in current level required' using errcode = '22023'; end if;
  if exists (select 1 from public.question_attempts a where a.user_id = v_user and a.question_id = p_question_id and a.is_correct)
    and not exists (select 1 from public.lesson_runs run where run.user_id=v_user
      and run.finished_at is null
      and run.question_ids[jsonb_array_length(run.answers)+1]=p_question_id) then
    raise exception 'Exercise already completed' using errcode = '22023';
  end if;
  select r.* into v_reserve from public.question_reserve r
  where r.level_id = v_level and r.status = 'available'
    and not exists (select 1 from public.question_replacements used where used.user_id = v_user and (
      used.reserve_question_id = r.id or
      pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(used.prompt)), '\s+', ' ', 'g') =
      pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(r.prompt)), '\s+', ' ', 'g')))
    and not exists (
      select 1 from public.question_attempts a join public.questions q on q.id = a.question_id
      where a.user_id = v_user and
        pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(pg_catalog.split_part(q.prompt, E'\n\nFonte:', 1))), '\s+', ' ', 'g') =
        pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(r.prompt)), '\s+', ' ', 'g'))
  order by pg_catalog.random() limit 1 for share of r;
  if not found then raise exception 'No available reserve questions for this learner' using errcode = 'P0002'; end if;
  insert into public.question_replacements(user_id, question_id, level_id, prompt, choices, correct_option,
    explanation, hint, source_url, source_title, reserve_question_id, source_license, origin)
  values (v_user, p_question_id, v_level, v_reserve.prompt, v_reserve.choices,
    (select (e.ordinality - 1)::integer from pg_catalog.jsonb_array_elements_text(v_reserve.choices) with ordinality e(answer, ordinality)
      where e.answer = v_reserve.correct_answer),
    v_reserve.explanation, v_reserve.hint, v_reserve.source_url, v_reserve.source_title, v_reserve.id, v_reserve.source_license, 'reserve');
  return query select r.* from public.get_my_question_replacements() r where r.question_id = p_question_id;
end;
$$;
revoke all on function public.assign_reserve_question(uuid) from public, anon;
grant execute on function public.assign_reserve_question(uuid) to authenticated;

commit;
