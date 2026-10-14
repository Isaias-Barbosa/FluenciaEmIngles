create or replace function public.get_proficiency_exam(p_exam_type text)
returns table (
  exam_id uuid,
  question_id uuid,
  level_code text,
  prompt text,
  choices jsonb,
  question_number integer,
  question_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_level_id uuid;
  v_exam_id uuid;
  v_question_ids uuid[];
  v_expected_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to start an exam'
      using errcode = '28000';
  end if;

  if p_exam_type is null or p_exam_type not in ('placement', 'promotion') then
    raise exception 'Unknown proficiency exam type'
      using errcode = '22023';
  end if;

  select profiles.current_level_id
  into v_level_id
  from public.profiles
  where profiles.user_id = v_user_id;

  if v_level_id is null then
    raise exception 'A learner profile with a current level is required'
      using errcode = '22023';
  end if;

  if p_exam_type = 'placement' then
    with randomized as (
      select questions.id, levels.sort_order as level_order, random() as random_order,
        row_number() over (
          partition by questions.level_id order by random()
        ) as level_question_order
      from public.proficiency_questions as questions
      join public.language_levels as levels on levels.id = questions.level_id
      join public.languages on languages.id = levels.language_id
      where languages.code = 'en' and questions.is_published
    )
    select array_agg(id order by level_order, random_order)
    into v_question_ids
    from randomized
    where level_question_order <= 3;
    v_expected_count := 18;
  else
    if not exists (
      select 1 from public.profiles
      where user_id = v_user_id and onboarding_completed
    ) then
      raise exception 'Complete onboarding before taking a promotion exam'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.questions
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
      select array_agg(id order by random_order)
      into v_question_ids
      from (
        select questions.id, random() as random_order
        from public.proficiency_questions as questions
        where questions.level_id = v_level_id and questions.is_published
        order by random()
        limit 10
      ) as selected_questions;
    else
      raise exception 'Complete every published lesson question in the current level first'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.language_levels as current_level
      join public.language_levels as next_level
        on next_level.language_id = current_level.language_id
        and next_level.sort_order = current_level.sort_order + 1
      where current_level.id = v_level_id
    ) then
      raise exception 'There is no higher level to unlock'
        using errcode = '22023';
    end if;
    v_expected_count := 10;
  end if;

  if coalesce(cardinality(v_question_ids), 0) <> v_expected_count then
    raise exception 'The proficiency question bank does not contain enough published questions'
      using errcode = '55000';
  end if;

  insert into public.proficiency_exam_sessions (
    user_id, exam_type, source_level_id, question_ids
  )
  values (
    v_user_id,
    p_exam_type,
    case when p_exam_type = 'promotion' then v_level_id else null end,
    v_question_ids
  )
  returning id into v_exam_id;

  return query
  select v_exam_id, questions.id, levels.code, questions.prompt, questions.choices,
    assigned.ordinality::integer, v_expected_count
  from pg_catalog.unnest(v_question_ids) with ordinality as assigned(id, ordinality)
  join public.proficiency_questions as questions on questions.id = assigned.id
  join public.language_levels as levels on levels.id = questions.level_id
  order by assigned.ordinality;
end;
$$;
