create function public.apply_placement_level(p_level_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_level_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to update a learning level'
      using errcode = '28000';
  end if;

  select levels.id
  into v_level_id
  from public.language_levels as levels
  join public.languages on languages.id = levels.language_id
  where languages.code = 'en'
    and levels.code = p_level_code;

  if v_level_id is null then
    raise exception 'Unknown English level'
      using errcode = '22023';
  end if;

  update public.profiles
  set current_level_id = v_level_id,
      updated_at = pg_catalog.now()
  where user_id = v_user_id
    and onboarding_completed;

  if not found then
    raise exception 'Completed learner profile was not found'
      using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.apply_placement_level(text)
  from public, anon;
grant execute on function public.apply_placement_level(text)
  to authenticated;

create function public.submit_placement_test(p_answers integer[])
returns table (
  recommended_level text,
  a1_score integer,
  a2_score integer,
  b1_score integer,
  b2_score integer,
  c1_score integer,
  c2_score integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_correct_answers integer[] := array[
    0, 1, 2,
    1, 1, 2,
    1, 2, 1,
    2, 1, 2,
    1, 1, 1,
    1, 1, 2
  ];
  v_level_codes text[] := array['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  v_scores integer[] := array[0, 0, 0, 0, 0, 0];
  v_recommended_index integer := 1;
  v_level_index integer;
  v_question_index integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to submit a placement test'
      using errcode = '28000';
  end if;

  if p_answers is null
    or pg_catalog.cardinality(p_answers) <> 18
    or exists (
      select 1
      from pg_catalog.unnest(p_answers) as provided(answer)
      where provided.answer is null or provided.answer < 0 or provided.answer > 3
    ) then
    raise exception 'The placement test must contain 18 valid answers'
      using errcode = '22023';
  end if;

  for v_level_index in 1..6 loop
    for v_question_index in ((v_level_index - 1) * 3 + 1)..(v_level_index * 3) loop
      if p_answers[v_question_index] = v_correct_answers[v_question_index] then
        v_scores[v_level_index] := v_scores[v_level_index] + 1;
      end if;
    end loop;

    if v_scores[v_level_index] >= 2 and v_level_index < 6 then
      v_recommended_index := v_level_index + 1;
    else
      v_recommended_index := v_level_index;
      exit;
    end if;
  end loop;

  return query
  select v_level_codes[v_recommended_index],
         v_scores[1],
         v_scores[2],
         v_scores[3],
         v_scores[4],
         v_scores[5],
         v_scores[6];
end;
$$;

revoke all on function public.submit_placement_test(integer[])
  from public, anon;
grant execute on function public.submit_placement_test(integer[])
  to authenticated;
