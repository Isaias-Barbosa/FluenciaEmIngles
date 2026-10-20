begin;

-- Private editorial pool: learners only receive an assigned snapshot without its key.
create function public.valid_reserve_choices(p_choices jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select case when pg_catalog.jsonb_typeof(p_choices) is distinct from 'array' then false
    else pg_catalog.jsonb_array_length(p_choices) <= 6
      and not exists (select 1 from pg_catalog.jsonb_array_elements(p_choices) e
        where pg_catalog.jsonb_typeof(e) <> 'string' or pg_catalog.length(pg_catalog.btrim(e #>> '{}')) not between 1 and 250)
      and (select count(*) from pg_catalog.jsonb_array_elements_text(p_choices)) =
          (select count(distinct pg_catalog.lower(pg_catalog.btrim(e))) from pg_catalog.jsonb_array_elements_text(p_choices) e)
    end;
$$;

-- Match the normalizer used by submit_question_answer. Distinct display strings
-- must not collapse to the same accepted answer (e.g. "re-sign" / "re sign").
create function public.distinct_reserve_answer_keys(p_choices jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select case when pg_catalog.jsonb_typeof(p_choices) is distinct from 'array' then false else
    (select count(*) = count(distinct normalized) and bool_and(normalized <> '') from (
      select pg_catalog.lower(pg_catalog.btrim(pg_catalog.regexp_replace(
        pg_catalog.regexp_replace(e, '[[:punct:]]', ' ', 'g'), '\s+', ' ', 'g'))) normalized
      from pg_catalog.jsonb_array_elements_text(p_choices) e
    ) keys) end;
$$;

create table public.question_reserve (
  id uuid primary key default gen_random_uuid(),
  level_id uuid references public.language_levels(id),
  prompt text not null check (length(btrim(prompt)) between 10 and 1200),
  content_key text generated always as (md5(regexp_replace(lower(btrim(prompt)), '\s+', ' ', 'g'))) stored unique,
  choices jsonb not null default '[]' check (public.valid_reserve_choices(choices)),
  correct_answer text not null default '' check (length(correct_answer) <= 250),
  explanation text not null default '' check (length(explanation) <= 1500),
  hint text not null default '' check (length(hint) <= 500),
  source text not null check (source in ('manual','opentdb','trivia')),
  source_url text not null check (source_url ~ '^https://'),
  source_title text not null check (length(source_title) between 1 and 250),
  source_license text not null check (length(source_license) between 1 and 100),
  category text not null default '' check (length(category) <= 200),
  status text not null default 'pending' check (status in ('pending','available','archived')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reserve_available_review check (status <> 'available' or (
    level_id is not null and jsonb_array_length(choices) = 4 and public.distinct_reserve_answer_keys(choices) and choices ? correct_answer
    and length(btrim(explanation)) > 0 and length(btrim(hint)) > 0))
);
create function public.touch_question_reserve() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := pg_catalog.clock_timestamp(); return new; end;
$$;
create trigger question_reserve_updated before update on public.question_reserve
  for each row execute function public.touch_question_reserve();
create index question_reserve_level_status on public.question_reserve(level_id, status);
alter table public.question_reserve enable row level security;
revoke all on public.question_reserve from public, anon, authenticated;
grant all on public.question_reserve to service_role;

alter table public.question_replacements
  add column reserve_question_id uuid references public.question_reserve(id) on delete set null,
  add column source_license text not null default '',
  add column origin text not null default 'web' check (origin in ('web','reserve'));
create unique index question_replacements_reserve_once on public.question_replacements(user_id,reserve_question_id)
  where reserve_question_id is not null;

-- Preserve historical web replacements, now with explicit provenance.
drop function public.get_my_question_replacements();
create function public.get_my_question_replacements()
returns table (question_id uuid, prompt text, choices jsonb, source_url text, source_title text, source_license text, origin text)
language sql stable security definer set search_path = '' as $$
  select r.question_id, r.prompt, r.choices, r.source_url, r.source_title, r.source_license, r.origin
  from public.question_replacements r
  join public.questions q on q.id = r.question_id
  join public.lessons l on l.id = q.lesson_id
  where r.user_id = auth.uid() and q.is_published and l.is_published
  order by r.created_at, r.question_id;
$$;
revoke all on function public.get_my_question_replacements() from public, anon;
grant execute on function public.get_my_question_replacements() to authenticated;

-- One transaction chooses, snapshots and assigns. The original slot is never replaced
-- in questions, so attempts, missions and promotion denominators remain unchanged.
create function public.assign_reserve_question(p_question_id uuid)
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
  if exists (select 1 from public.question_attempts a where a.user_id = v_user and a.question_id = p_question_id and a.is_correct) then
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

create function public.get_question_reserve_counts()
returns table (level_code text, pending bigint, available bigint, archived bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server access required' using errcode = '42501'; end if;
  return query select ll.code, count(r.id) filter (where r.status = 'pending'),
    count(r.id) filter (where r.status = 'available'), count(r.id) filter (where r.status = 'archived')
  from public.language_levels ll join public.languages lang on lang.id = ll.language_id and lang.code = 'en'
  left join public.question_reserve r on r.level_id = ll.id group by ll.code, ll.sort_order order by ll.sort_order;
  return query select 'Sem nível'::text, count(*) filter (where r.status = 'pending'),
    count(*) filter (where r.status = 'available'), count(*) filter (where r.status = 'archived')
    from public.question_reserve r where r.level_id is null;
end;
$$;
revoke all on function public.get_question_reserve_counts() from public, anon, authenticated;
grant execute on function public.get_question_reserve_counts() to service_role;
commit;
