begin;

-- A replacement belongs to one learner and keeps the ORIGINAL question/lesson slot.
-- Never grant learners table access: this table contains the private answer key.
create table public.question_replacements (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  level_id uuid not null references public.language_levels(id),
  prompt text not null check (length(prompt) between 10 and 1200),
  choices jsonb not null check (jsonb_typeof(choices) = 'array' and jsonb_array_length(choices) = 4),
  correct_option integer not null check (correct_option between 0 and 3),
  explanation text not null check (length(explanation) between 1 and 1500),
  hint text not null check (length(hint) between 1 and 500),
  source_url text not null check (source_url ~ '^https://'),
  source_title text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id),
  unique (user_id, prompt)
);
alter table public.question_replacements enable row level security;
revoke all on public.question_replacements from public, anon, authenticated;
grant all on public.question_replacements to service_role;

create table public.question_replacement_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  level_id uuid not null references public.language_levels(id),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index question_replacement_searches_user_time on public.question_replacement_searches(user_id, created_at desc);
alter table public.question_replacement_searches enable row level security;
revoke all on public.question_replacement_searches from public, anon, authenticated;
grant all on public.question_replacement_searches to service_role;

-- Only this projection is returned to the learner; no answer key or explanation.
create function public.get_my_question_replacements()
returns table (question_id uuid, prompt text, choices jsonb, source_url text, source_title text)
language sql stable security definer set search_path = ''
as $$
  select r.question_id, r.prompt, r.choices, r.source_url, r.source_title
  from public.question_replacements r
  join public.questions q on q.id = r.question_id
  join public.lessons l on l.id = q.lesson_id
  where r.user_id = auth.uid() and q.is_published and l.is_published
  order by r.created_at, r.question_id;
$$;
revoke all on function public.get_my_question_replacements() from public, anon;
grant execute on function public.get_my_question_replacements() to authenticated;

-- Reserve before paid web search, with a persistent quota shared by server instances.
create function public.reserve_question_replacement_search(p_user_id uuid, p_question_id uuid)
returns table (request_id uuid, level_code text, lesson_title text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_level uuid; v_code text; v_title text; v_request uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server access required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  select p.current_level_id, ll.code, l.title into v_level, v_code, v_title
  from public.profiles p
  join public.questions q on q.id = p_question_id
  join public.lessons l on l.id = q.lesson_id and l.level_id = p.current_level_id
  join public.language_levels ll on ll.id = p.current_level_id
  join public.languages lang on lang.id = ll.language_id and lang.code = 'en'
  where p.user_id = p_user_id and p.onboarding_completed and q.is_published and l.is_published
    and (q.question_type = 'listening' or q.audio_path is not null);
  if v_level is null then raise exception 'Published audio question in your current level required' using errcode = '22023'; end if;
  if exists (select 1 from public.question_attempts a where a.user_id = p_user_id and a.question_id = p_question_id and a.is_correct) then
    raise exception 'This exercise is already completed' using errcode = '22023';
  end if;
  if exists (select 1 from public.question_replacements r where r.user_id = p_user_id and r.question_id = p_question_id) then
    raise exception 'Replacement already exists' using errcode = '23505';
  end if;
  if exists (select 1 from public.question_replacement_searches s where s.user_id = p_user_id and s.question_id = p_question_id and s.finished_at is null and s.created_at > now() - interval '90 seconds') then
    raise exception 'A search is already running. Wait a moment.' using errcode = '55P03';
  end if;
  if (select count(*) from public.question_replacement_searches s where s.user_id = p_user_id and s.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Search limit reached. Try again later.' using errcode = '54000';
  end if;
  insert into public.question_replacement_searches(user_id, question_id, level_id)
    values(p_user_id, p_question_id, v_level) returning id into v_request;
  return query select v_request, v_code, v_title;
end;
$$;
revoke all on function public.reserve_question_replacement_search(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_question_replacement_search(uuid, uuid) to service_role;

create function public.save_question_replacement(p_request_id uuid, p_prompt text, p_choices jsonb,
  p_correct_option integer, p_explanation text, p_hint text, p_source_url text, p_source_title text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_request public.question_replacement_searches%rowtype;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server access required' using errcode = '42501'; end if;
  select * into strict v_request from public.question_replacement_searches where id = p_request_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_request.user_id::text || v_request.question_id::text, 0));
  if exists (select 1 from public.question_replacements r where r.user_id = v_request.user_id and r.question_id = v_request.question_id) then return; end if;
  if v_request.finished_at is not null or v_request.created_at < now() - interval '5 minutes' then
    raise exception 'Search expired. Try again.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles p where p.user_id = v_request.user_id and p.current_level_id = v_request.level_id)
    or exists (select 1 from public.question_attempts a where a.user_id = v_request.user_id and a.question_id = v_request.question_id and a.is_correct) then
    raise exception 'The exercise or learner level has changed' using errcode = '22023';
  end if;
  insert into public.question_replacements(user_id, question_id, level_id, prompt, choices, correct_option, explanation, hint, source_url, source_title)
    values(v_request.user_id, v_request.question_id, v_request.level_id, p_prompt, p_choices, p_correct_option, p_explanation, p_hint, p_source_url, p_source_title);
  update public.question_replacement_searches set finished_at = now() where id = p_request_id;
end;
$$;
revoke all on function public.save_question_replacement(uuid, text, jsonb, integer, text, text, text, text) from public, anon, authenticated;
grant execute on function public.save_question_replacement(uuid, text, jsonb, integer, text, text, text, text) to service_role;

create or replace function public.submit_question_answer(
  p_question_id uuid,
  p_submitted_answer text
)
returns table (
  is_correct boolean,
  explanation text,
  level_completed boolean,
  wrong_attempts integer,
  hint text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_correct boolean;
  v_explanation text;
  v_hint text;
  v_level_id uuid;
  v_level_completed boolean := false;
  v_wrong_attempts integer := 0;
  v_normalized_answer text;
  v_replacement_created_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to submit an answer'
      using errcode = '28000';
  end if;
  if p_submitted_answer is null or pg_catalog.btrim(p_submitted_answer) = '' then
    raise exception 'An answer is required' using errcode = '22023';
  end if;

  v_normalized_answer := pg_catalog.lower(pg_catalog.btrim(
    pg_catalog.regexp_replace(
      pg_catalog.regexp_replace(p_submitted_answer, '[[:punct:]]', ' ', 'g'),
      '\s+', ' ', 'g'
    )
  ));

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || p_question_id::text, 0));

  select
    exists (
      select 1 from pg_catalog.unnest(case when replacement.question_id is not null then array[replacement.choices ->> replacement.correct_option] else answer_key.accepted_answers end) as accepted(answer)
      where pg_catalog.lower(pg_catalog.btrim(
        pg_catalog.regexp_replace(
          pg_catalog.regexp_replace(accepted.answer, '[[:punct:]]', ' ', 'g'),
          '\s+', ' ', 'g'
        )
      )) = v_normalized_answer
    ),
    coalesce(replacement.explanation, answer_key.explanation),
    coalesce(replacement.hint, answer_key.hint),
    replacement.created_at
  into v_is_correct, v_explanation, v_hint, v_replacement_created_at
  from public.questions
  join public.lessons on lessons.id = questions.lesson_id
  join public.question_answers as answer_key on answer_key.question_id = questions.id
  left join public.question_replacements as replacement on replacement.question_id = questions.id and replacement.user_id = v_user_id
  where questions.id = p_question_id
    and questions.is_published
    and lessons.is_published;

  if not found then
    raise exception 'Published question was not found' using errcode = '22023';
  end if;

  insert into public.question_attempts (
    user_id, question_id, submitted_answer, is_correct
  )
  values (v_user_id, p_question_id, pg_catalog.btrim(p_submitted_answer), v_is_correct);

  if not v_is_correct then
    select count(*)::integer into v_wrong_attempts
    from public.question_attempts as attempts
    where attempts.user_id = v_user_id
      and attempts.question_id = p_question_id
      and not attempts.is_correct
      and (v_replacement_created_at is null or attempts.created_at >= v_replacement_created_at);
  else
    select profiles.current_level_id into v_level_id
    from public.profiles
    where profiles.user_id = v_user_id and profiles.onboarding_completed;

    if v_level_id is not null
      and exists (
        select 1 from public.questions
        join public.lessons on lessons.id = questions.lesson_id
        where lessons.level_id = v_level_id
          and lessons.is_published and questions.is_published
      )
      and not exists (
        select 1 from public.questions
        join public.lessons on lessons.id = questions.lesson_id
        left join public.question_attempts as attempts
          on attempts.question_id = questions.id
          and attempts.user_id = v_user_id
          and attempts.is_correct
        where lessons.level_id = v_level_id
          and lessons.is_published
          and questions.is_published
          and attempts.id is null
      ) then
      v_level_completed := true;
    end if;
  end if;

  return query select v_is_correct,
    case when v_replacement_created_at is not null and not v_is_correct then 'Ainda não. Tente outra alternativa.' else v_explanation end,
    v_level_completed,
    v_wrong_attempts, case when v_wrong_attempts >= 5 then v_hint else null end;
end;
$$;

revoke all on function public.submit_question_answer(uuid, text)
  from public, anon;
grant execute on function public.submit_question_answer(uuid, text)
  to authenticated;

commit;
