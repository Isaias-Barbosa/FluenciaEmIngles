create table public.languages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.language_levels (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references public.languages (id) on delete cascade,
  code text not null,
  title text not null,
  sort_order smallint not null,
  created_at timestamptz not null default now(),
  unique (language_id, code),
  unique (language_id, sort_order)
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  current_level_id uuid references public.language_levels (id) on delete set null,
  learning_goal text not null default 'Conversar em viagens',
  daily_goal_minutes smallint not null default 20
    check (daily_goal_minutes in (10, 20, 30, 45)),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.language_levels (id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null,
  category text not null,
  duration_minutes smallint not null check (duration_minutes > 0),
  sort_order smallint not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (level_id, sort_order)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  question_type text not null
    check (question_type in ('multiple_choice', 'fill_blank', 'listening')),
  prompt text not null,
  choices jsonb not null default '[]'::jsonb
    check (jsonb_typeof(choices) = 'array'),
  audio_path text,
  sort_order smallint not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (lesson_id, sort_order),
  check (question_type <> 'listening' or audio_path is not null)
);

create table public.question_answers (
  question_id uuid primary key references public.questions (id) on delete cascade,
  accepted_answers text[] not null,
  explanation text not null default '',
  check (cardinality(accepted_answers) > 0)
);

create table public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  submitted_answer text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create index lessons_level_order_idx
  on public.lessons (level_id, sort_order)
  where is_published;

create index questions_lesson_order_idx
  on public.questions (lesson_id, sort_order)
  where is_published;

create index question_attempts_user_created_idx
  on public.question_attempts (user_id, created_at desc);

alter table public.languages enable row level security;
alter table public.language_levels enable row level security;
alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.questions enable row level security;
alter table public.question_answers enable row level security;
alter table public.question_attempts enable row level security;

create policy "Languages are readable by everyone"
  on public.languages for select
  using (true);

create policy "Language levels are readable by everyone"
  on public.language_levels for select
  using (true);

create policy "Learners can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Learners can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Published lessons are readable by everyone"
  on public.lessons for select
  using (is_published);

create policy "Learners can read their own attempts"
  on public.question_attempts for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.languages, public.language_levels, public.lessons
  to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, learning_goal, daily_goal_minutes)
  on public.profiles to authenticated;
grant select on public.question_attempts to authenticated;
revoke all on public.questions, public.question_answers from anon, authenticated;
revoke insert, update, delete on public.question_attempts from anon, authenticated;

create view public.published_questions
with (security_barrier = true)
as
  select
    questions.id,
    questions.lesson_id,
    questions.question_type,
    questions.prompt,
    questions.choices,
    questions.audio_path,
    questions.sort_order
  from public.questions
  join public.lessons on lessons.id = questions.lesson_id
  where questions.is_published and lessons.is_published;

grant select on public.published_questions to anon, authenticated;

create function public.submit_question_answer(
  p_question_id uuid,
  p_submitted_answer text
)
returns table (is_correct boolean, explanation text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_correct boolean;
  v_explanation text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to submit an answer'
      using errcode = '28000';
  end if;

  if p_submitted_answer is null or pg_catalog.btrim(p_submitted_answer) = '' then
    raise exception 'An answer is required'
      using errcode = '22023';
  end if;

  select
    exists (
      select 1
      from public.question_answers as answer_key
      where answer_key.question_id = questions.id
        and pg_catalog.lower(pg_catalog.btrim(p_submitted_answer))
          = any (
            select pg_catalog.lower(pg_catalog.btrim(answer))
            from pg_catalog.unnest(answer_key.accepted_answers) as accepted(answer)
          )
    ),
    answer_key.explanation
  into v_is_correct, v_explanation
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

  return query select v_is_correct, v_explanation;
end;
$$;

revoke all on function public.submit_question_answer(uuid, text) from public, anon;
grant execute on function public.submit_question_answer(uuid, text) to authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_default_level_id uuid;
begin
  select levels.id
  into v_default_level_id
  from public.language_levels as levels
  join public.languages on languages.id = levels.language_id
  where languages.code = 'en' and levels.code = 'A1';

  insert into public.profiles (user_id, display_name, current_level_id)
  values (
    new.id,
    coalesce(
      nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    v_default_level_id
  );

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.languages (code, name)
values ('en', 'Inglês')
on conflict (code) do update set name = excluded.name;

insert into public.language_levels (language_id, code, title, sort_order)
select languages.id, levels.code, levels.title, levels.sort_order
from public.languages
cross join (
  values
    ('A1', 'Beginner', 1),
    ('A2', 'Elementary', 2),
    ('B1', 'Intermediate', 3),
    ('B2', 'Upper intermediate', 4),
    ('C1', 'Advanced', 5),
    ('C2', 'Proficient', 6)
) as levels(code, title, sort_order)
where languages.code = 'en'
on conflict (language_id, code) do update
set title = excluded.title, sort_order = excluded.sort_order;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-audio',
  'lesson-audio',
  true,
  20971520,
  array['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm']
)
on conflict (id) do nothing;
