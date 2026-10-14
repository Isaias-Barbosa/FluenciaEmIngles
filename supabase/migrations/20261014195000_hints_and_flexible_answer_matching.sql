alter table public.question_answers
  add column if not exists hint text;

update public.question_answers as answer_key
set hint = case
  when pg_catalog.cardinality(
    pg_catalog.regexp_split_to_array(pg_catalog.btrim(answer_key.accepted_answers[1]), '\s+')
  ) > 1 then
    'A resposta tem '
    || pg_catalog.cardinality(
      pg_catalog.regexp_split_to_array(pg_catalog.btrim(answer_key.accepted_answers[1]), '\s+')
    )::text
    || ' palavras e começa com “'
    || pg_catalog.split_part(pg_catalog.btrim(answer_key.accepted_answers[1]), ' ', 1)
    || '”.'
  else
    'A resposta tem '
    || pg_catalog.char_length(pg_catalog.btrim(answer_key.accepted_answers[1]))::text
    || ' letras e começa com “'
    || pg_catalog.left(pg_catalog.btrim(answer_key.accepted_answers[1]), 1)
    || '”.'
end
where answer_key.hint is null;

drop function public.submit_question_answer(uuid, text);

create function public.submit_question_answer(
  p_question_id uuid,
  p_submitted_answer text
)
returns table (
  is_correct boolean,
  explanation text,
  level_advanced boolean,
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
  v_level_advanced boolean := false;
  v_wrong_attempts integer := 0;
  v_normalized_answer text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to submit an answer'
      using errcode = '28000';
  end if;

  if p_submitted_answer is null or pg_catalog.btrim(p_submitted_answer) = '' then
    raise exception 'An answer is required'
      using errcode = '22023';
  end if;

  v_normalized_answer := pg_catalog.lower(
    pg_catalog.btrim(
      pg_catalog.regexp_replace(
        pg_catalog.regexp_replace(
          p_submitted_answer,
          '[[:punct:]]',
          ' ',
          'g'
        ),
        '\s+',
        ' ',
        'g'
      )
    )
  );

  select
    exists (
      select 1
      from pg_catalog.unnest(answer_key.accepted_answers) as accepted(answer)
      where pg_catalog.lower(
        pg_catalog.btrim(
          pg_catalog.regexp_replace(
            pg_catalog.regexp_replace(
              accepted.answer,
              '[[:punct:]]',
              ' ',
              'g'
            ),
            '\s+',
            ' ',
            'g'
          )
        )
      ) = v_normalized_answer
    ),
    answer_key.explanation,
    answer_key.hint
  into v_is_correct, v_explanation, v_hint
  from public.questions
  join public.lessons on lessons.id = questions.lesson_id
  join public.question_answers as answer_key on answer_key.question_id = questions.id
  where questions.id = p_question_id
    and questions.is_published
    and lessons.is_published;

  if not found then
    raise exception 'Published question was not found'
      using errcode = '22023';
  end if;

  insert into public.question_attempts (
    user_id,
    question_id,
    submitted_answer,
    is_correct
  )
  values (
    v_user_id,
    p_question_id,
    pg_catalog.btrim(p_submitted_answer),
    v_is_correct
  );

  if not v_is_correct then
    select pg_catalog.count(*)::integer
    into v_wrong_attempts
    from public.question_attempts as attempts
    where attempts.user_id = v_user_id
      and attempts.question_id = p_question_id
      and not attempts.is_correct;
  end if;

  if v_is_correct then
    select profiles.current_level_id
    into v_level_id
    from public.profiles
    where profiles.user_id = v_user_id
      and profiles.onboarding_completed;

    if v_level_id is not null
      and exists (
        select 1
        from public.questions
        join public.lessons on lessons.id = questions.lesson_id
        where lessons.level_id = v_level_id
          and lessons.is_published
          and questions.is_published
      )
      and not exists (
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
      update public.profiles
      set current_level_id = next_level.id,
          updated_at = pg_catalog.now()
      from public.language_levels as current_level
      join public.language_levels as next_level
        on next_level.language_id = current_level.language_id
        and next_level.sort_order = current_level.sort_order + 1
      where profiles.user_id = v_user_id
        and current_level.id = profiles.current_level_id
        and profiles.current_level_id = v_level_id;

      v_level_advanced := found;
    end if;
  end if;

  return query
  select
    v_is_correct,
    v_explanation,
    v_level_advanced,
    v_wrong_attempts,
    case when v_wrong_attempts >= 5 then v_hint else null end;
end;
$$;

revoke all on function public.submit_question_answer(uuid, text)
  from public, anon;
grant execute on function public.submit_question_answer(uuid, text)
  to authenticated;
