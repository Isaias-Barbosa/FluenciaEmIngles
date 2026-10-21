begin;
-- Private state: the browser cannot edit usage or read the answer context.
create table public.student_question_ai_help (
 user_id uuid primary key references auth.users(id) on delete cascade,
 next_available_at timestamptz not null default '-infinity',
 lease_id uuid,
 lease_until timestamptz not null default '-infinity',
 run_id uuid,
 question_id uuid,
 context_key text,
 hint text,
 provider text
);
alter table public.student_question_ai_help enable row level security;
revoke all on public.student_question_ai_help from public,anon,authenticated;
grant all on public.student_question_ai_help to service_role;

create function public.prepare_student_question_help(p_user_id uuid,p_run_id uuid,p_question_id uuid,p_claim boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_state public.student_question_ai_help;
 v_question jsonb; v_answers text[]; v_key text;
 v_now timestamptz; v_lease uuid; v_retry integer; v_available timestamptz;
begin
 if p_user_id is null or p_claim is null then raise exception 'Invalid request' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,40));
 v_now:=pg_catalog.clock_timestamp();
 -- Only the pending question of an owned practice round; never exams/onboarding.
 -- Context is read from the database, including this learner's saved replacement.
 select jsonb_build_object('level',ll.code,
  'prompt',case when replacement.question_id is not null then replacement.prompt
   else concat_ws(E'\n\n',q.reading_passage,q.prompt) end,
  'choices',coalesce(replacement.choices,q.choices,'[]'::jsonb),
  'correctAnswer',coalesce(replacement.choices->>replacement.correct_option,a.accepted_answers[1])),
  case when replacement.question_id is not null then array[replacement.choices->>replacement.correct_option] else a.accepted_answers end
 into v_question,v_answers
 from public.lesson_runs run
 join public.profiles p on p.user_id=run.user_id and p.onboarding_completed
 join public.language_levels current_level on current_level.id=p.current_level_id
 join public.lessons l on l.id=run.lesson_id and l.is_published
 join public.language_levels ll on ll.id=l.level_id and ll.language_id=current_level.language_id and ll.sort_order<=current_level.sort_order
 join public.languages lang on lang.id=ll.language_id and lang.code='en'
 join public.questions q on q.lesson_id=l.id and q.id=p_question_id and q.is_published
 join public.question_answers a on a.question_id=q.id
 left join public.question_replacements replacement on replacement.user_id=p_user_id and replacement.question_id=q.id
 where run.id=p_run_id and run.user_id=p_user_id and run.finished_at is null
 and run.question_ids[jsonb_array_length(run.answers)+1]=p_question_id;
 if v_question is null or coalesce(length(btrim(v_question->>'correctAnswer')),0)=0
  or length(v_question->>'prompt')>12000 or jsonb_typeof(v_question->'choices')<>'array'
 then raise exception 'Current practice question required' using errcode='22023';end if;
 v_key:=md5(v_question::text||to_jsonb(v_answers)::text);
 select * into v_state from public.student_question_ai_help where user_id=p_user_id for update;
 v_available:=case when v_state.next_available_at>v_now then v_state.next_available_at else null end;
 if v_state.hint is not null and v_state.run_id=p_run_id and v_state.question_id=p_question_id and v_state.context_key=v_key then
  return jsonb_build_object('state','cached','hint',v_state.hint,'provider',v_state.provider,'next_available_at',v_available,'server_now',v_now);
 end if;
 if v_state.lease_until>v_now then
  v_retry:=greatest(1,ceil(extract(epoch from v_state.lease_until-v_now))::integer);
  return jsonb_build_object('state','busy','retry_after',v_retry,'server_now',v_now);
 end if;
 if v_available is not null then
  v_retry:=greatest(1,ceil(extract(epoch from v_available-v_now))::integer);
  return jsonb_build_object('state','cooldown','next_available_at',v_available,'retry_after',v_retry,'server_now',v_now);
 end if;
 if not p_claim then return jsonb_build_object('state','ready','server_now',v_now);end if;
 v_lease:=gen_random_uuid();
 insert into public.student_question_ai_help(user_id,lease_id,lease_until,run_id,question_id,context_key)
 values(p_user_id,v_lease,v_now+interval '90 seconds',p_run_id,p_question_id,v_key)
 on conflict(user_id) do update set lease_id=excluded.lease_id,lease_until=excluded.lease_until,
 run_id=excluded.run_id,question_id=excluded.question_id,context_key=excluded.context_key,hint=null,provider=null;
 return jsonb_build_object('state','claimed','lease_id',v_lease,'question',v_question,'accepted_answers',v_answers);
end;$$;

create function public.finish_student_question_help(p_user_id uuid,p_lease_id uuid,p_hint text,p_provider text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_available timestamptz;v_now timestamptz:=pg_catalog.clock_timestamp();v_updated integer;
begin
 if p_hint is not null and (length(btrim(p_hint)) not between 10 and 500 or coalesce(length(p_provider),0) not between 1 and 80) then
  raise exception 'Invalid hint' using errcode='22023';end if;
 update public.student_question_ai_help set
 lease_id=null,lease_until='-infinity',hint=p_hint,provider=case when p_hint is not null then p_provider else null end,
 next_available_at=case when p_hint is not null then v_now+interval '40 minutes' else next_available_at end
 where user_id=p_user_id and lease_id=p_lease_id and lease_until>v_now
 returning next_available_at into v_available;
 get diagnostics v_updated=row_count;
 if v_updated<>1 then return null;end if;
 return jsonb_build_object('next_available_at',case when v_available>v_now then v_available else null end,'server_now',v_now);
end;$$;
revoke all on function public.prepare_student_question_help(uuid,uuid,uuid,boolean) from public,anon,authenticated;
revoke all on function public.finish_student_question_help(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.prepare_student_question_help(uuid,uuid,uuid,boolean) to service_role;
grant execute on function public.finish_student_question_help(uuid,uuid,text,text) to service_role;
commit;
