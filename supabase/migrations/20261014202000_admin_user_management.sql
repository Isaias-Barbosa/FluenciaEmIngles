create or replace function public.admin_update_user_profile(
  p_user_id uuid,
  p_display_name text,
  p_level_id uuid,
  p_learning_goal text,
  p_daily_goal_minutes smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_catalog.length(pg_catalog.btrim(p_display_name)) not between 1 and 80
    or p_learning_goal not in (
      'Conversar em viagens',
      'Crescer na carreira',
      'Entender filmes e séries',
      'Estudar ou morar fora',
      'Aprender por prazer'
    )
    or p_daily_goal_minutes not in (10, 20, 30, 45)
  then
    raise exception 'Invalid profile data'
      using errcode = '22023';
  end if;

  if p_level_id is not null and not exists (
    select 1
    from public.language_levels as levels
    join public.languages as languages on languages.id = levels.language_id
    where levels.id = p_level_id
      and languages.code = 'en'
  ) then
    raise exception 'English level was not found'
      using errcode = '22023';
  end if;

  update public.profiles
  set display_name = pg_catalog.btrim(p_display_name),
      current_level_id = p_level_id,
      onboarding_completed = p_level_id is not null,
      learning_goal = p_learning_goal,
      daily_goal_minutes = p_daily_goal_minutes,
      updated_at = pg_catalog.now()
  where user_id = p_user_id;

  if not found then
    raise exception 'Profile was not found'
      using errcode = '22023';
  end if;
end;
$$;

create or replace function public.admin_reset_user_progress(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.question_attempts
  where user_id = p_user_id;

  update public.profiles
  set current_level_id = null,
      onboarding_completed = false,
      updated_at = pg_catalog.now()
  where user_id = p_user_id;

  if not found then
    raise exception 'Profile was not found'
      using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.admin_reset_user_progress(uuid) from public, anon, authenticated;
grant execute on function public.admin_reset_user_progress(uuid) to service_role;
revoke all on function public.admin_update_user_profile(uuid, text, uuid, text, smallint) from public, anon, authenticated;
grant execute on function public.admin_update_user_profile(uuid, text, uuid, text, smallint) to service_role;
