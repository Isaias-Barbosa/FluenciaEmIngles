begin;
alter table public.lesson_runs add column attempts jsonb not null default '[]'::jsonb check(jsonb_typeof(attempts)='array');
-- Replace the single-answer protocol. Request IDs and expected attempt numbers
-- prevent network retries/double clicks in different tabs from spending chances.
drop function public.submit_lesson_run_answer(uuid,uuid,text);
create function public.submit_lesson_run_answer(p_run_id uuid,p_question_id uuid,p_submitted_answer text,p_request_id uuid,p_expected_attempt integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_user uuid:=auth.uid();v_run public.lesson_runs;v_existing jsonb;v_result record;
 v_type text;v_prompt text;v_choices jsonb;v_hint text;v_answer text;v_explanation text;
 v_used integer;v_limit integer;v_threshold integer;v_score integer;v_final boolean;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='28000';end if;
 if p_request_id is null or p_expected_attempt is null or p_expected_attempt not between 1 and 3
  or p_submitted_answer is null or length(btrim(p_submitted_answer)) not between 1 and 2000 then
  raise exception 'Valid answer and request required' using errcode='22023';end if;
 select * into v_run from public.lesson_runs where id=p_run_id and user_id=v_user for update;
 if not found then raise exception 'Lesson attempt not found' using errcode='22023';end if;
 select item into v_existing from jsonb_array_elements(v_run.attempts) item where item->>'request_id'=p_request_id::text;
 if v_existing is not null then
  if v_existing->>'question_id'<>p_question_id::text or v_existing->>'submitted_answer'<>btrim(p_submitted_answer) then
   raise exception 'Request ID already used' using errcode='22023';end if;
  return to_jsonb(v_run);
 end if;
 -- Completed questions are immutable, including legacy rounds without attempts.
 if exists(select 1 from jsonb_array_elements(v_run.answers) item where item->>'question_id'=p_question_id::text) then return to_jsonb(v_run);end if;
 if v_run.finished_at is not null or v_run.question_ids[jsonb_array_length(v_run.answers)+1] is distinct from p_question_id then
  raise exception 'Answer the current question in order' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text||p_question_id::text,0));
 select case when r.question_id is not null then 'multiple_choice' else q.question_type end,
 coalesce(r.prompt,q.prompt),coalesce(r.choices,q.choices,'[]'::jsonb),
 coalesce(r.hint,a.hint),coalesce(r.choices->>r.correct_option,a.accepted_answers[1]),coalesce(r.explanation,a.explanation)
 into v_type,v_prompt,v_choices,v_hint,v_answer,v_explanation
 from public.questions q join public.lessons l on l.id=q.lesson_id and l.is_published
 join public.question_answers a on a.question_id=q.id
 left join public.question_replacements r on r.question_id=q.id and r.user_id=v_user
 where q.id=p_question_id and q.lesson_id=v_run.lesson_id and q.is_published;
 if not found then raise exception 'Published question required' using errcode='22023';end if;
 v_limit:=case v_type when 'multiple_choice' then 2 when 'fill_blank' then 3 else 1 end;
 v_threshold:=case v_type when 'multiple_choice' then 1 when 'fill_blank' then 2 else 1 end;
 select count(*)::integer into v_used from jsonb_array_elements(v_run.attempts) item where item->>'question_id'=p_question_id::text;
 if v_used+1<>p_expected_attempt then raise exception 'Question attempts changed; reload current round' using errcode='40001';end if;
 if v_type='multiple_choice' and (not(v_choices ? btrim(p_submitted_answer)) or exists(
  select 1 from jsonb_array_elements(v_run.attempts) item where item->>'question_id'=p_question_id::text
  and item->>'prompt'=v_prompt and item->>'submitted_answer'=btrim(p_submitted_answer) and not(item->>'is_correct')::boolean)) then
  raise exception 'Choose an available option' using errcode='22023';end if;
 select * into v_result from public.submit_question_answer(p_question_id,p_submitted_answer);
 v_used:=v_used+1;
 v_final:=v_result.is_correct or v_used>=v_limit;
 if not v_result.is_correct and v_used>=v_threshold then
  v_hint:=coalesce(nullif(btrim(v_hint),''),case when v_type='multiple_choice'
   then 'Compare o enunciado com cada alternativa e elimine as que não se encaixam.'
   else 'Observe a estrutura da frase e o contexto antes de completar a lacuna.' end);
 else v_hint:=null;end if;
 -- Intermediate records contain no answer key or explanation of the solution.
 v_run.attempts:=v_run.attempts||jsonb_build_array(jsonb_build_object(
  'request_id',p_request_id,'question_id',p_question_id,'submitted_answer',btrim(p_submitted_answer),
  'is_correct',v_result.is_correct,'attempt_number',v_used,'attempt_limit',v_limit,'hint',v_hint,'prompt',v_prompt));
 if v_final then
  v_run.answers:=v_run.answers||jsonb_build_array(jsonb_build_object('question_id',p_question_id,
   'submitted_answer',btrim(p_submitted_answer),'is_correct',v_result.is_correct,'correct_answer',v_answer,
   'explanation',v_explanation,'attempt_count',v_used));
 end if;
 if jsonb_array_length(v_run.answers)=cardinality(v_run.question_ids) then
  select count(*)::integer into v_score from jsonb_array_elements(v_run.answers) item where (item->>'is_correct')::boolean;
  v_run.finished_at:=clock_timestamp();v_run.passed:=v_score>=ceil(cardinality(v_run.question_ids)*0.6);
  if v_run.passed then insert into public.lesson_completions(user_id,lesson_id) values(v_user,v_run.lesson_id) on conflict do nothing;end if;
 end if;
 update public.lesson_runs set attempts=v_run.attempts,answers=v_run.answers,passed=v_run.passed,finished_at=v_run.finished_at where id=v_run.id;
 return to_jsonb(v_run);
end;$$;
revoke all on function public.submit_lesson_run_answer(uuid,uuid,text,uuid,integer) from public,anon;
grant execute on function public.submit_lesson_run_answer(uuid,uuid,text,uuid,integer) to authenticated;
commit;
