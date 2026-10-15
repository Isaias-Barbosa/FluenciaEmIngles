create table public.learning_videos (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.language_levels (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  duration_seconds smallint not null check (duration_seconds between 60 and 180),
  video_url text not null unique check (
    video_url ~ '^https://(www\.)?voicetube\.com/videos/[0-9]+/?$'
  ),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create index learning_videos_level_published_idx
  on public.learning_videos (level_id, is_published, created_at desc);

alter table public.learning_videos enable row level security;

create policy "Published learning videos are readable by everyone"
  on public.learning_videos for select
  using (is_published);

revoke all on public.learning_videos from anon, authenticated;
grant select on public.learning_videos to anon, authenticated;
grant select, insert, update, delete on public.learning_videos to service_role;

insert into public.learning_videos (level_id, title, duration_seconds, video_url, is_published)
select levels.id, seed.title, seed.duration_seconds, seed.video_url, true
from public.language_levels as levels
join public.languages as languages on languages.id = levels.language_id
join (
  values
    ('A1', 'Beginner English A1 01 Be Verbs', 121, 'https://www.voicetube.com/videos/198652'),
    ('A1', 'The Oxford 3000: Hey, Hi, Bye & More! Basic English Greetings', 111, 'https://www.voicetube.com/videos/206713'),
    ('A2', 'Exam skills: 5 tips about building vocabulary', 153, 'https://www.voicetube.com/videos/49326'),
    ('A2', 'How to Increase Your Vocabulary — American English Pronunciation', 133, 'https://www.voicetube.com/videos/29878'),
    ('A2', 'Exam skills: 5 tips for dealing with new and difficult vocabulary', 165, 'https://www.voicetube.com/videos/83851'),
    ('A2', 'Airport English', 172, 'https://www.voicetube.com/videos/9215'),
    ('A2', 'Business English: Telephone Conversation', 72, 'https://www.voicetube.com/videos/180903'),
    ('A2', 'Common English Grammar Mistakes', 93, 'https://www.voicetube.com/videos/160431'),
    ('A2', 'What Is the CEFR?', 176, 'https://www.voicetube.com/videos/53012'),
    ('B1', '5 Steps to Increasing Your English Vocabulary', 94, 'https://www.voicetube.com/videos/8158'),
    ('B1', 'Easiest Way to Learn English Grammar', 158, 'https://www.voicetube.com/videos/31153'),
    ('B1', 'Introduction to Grammar | Khan Academy', 166, 'https://www.voicetube.com/videos/59862'),
    ('B1', 'English Language Learning Tips: Varieties of English', 169, 'https://www.voicetube.com/videos/25000'),
    ('B1', 'Business English Conversation: Negotiations', 142, 'https://www.voicetube.com/videos/181865'),
    ('B1', 'Describing Things: English Conversation', 168, 'https://www.voicetube.com/videos/166182'),
    ('B1', 'British English Expressions: Cloud Idioms', 178, 'https://www.voicetube.com/videos/51512'),
    ('B2', 'Advanced Vocabulary: Scrutiny', 165, 'https://www.voicetube.com/videos/178024'),
    ('C1', 'Collision Course | Official Trailer', 133, 'https://www.voicetube.com/videos/221107'),
    ('C1', 'Where''s Wanda? — Season 2 Official Trailer', 103, 'https://www.voicetube.com/videos/220790'),
    ('C1', 'Slow Horses', 90, 'https://www.voicetube.com/videos/220613'),
    ('C2', 'Rage Season 2 | Official Trailer', 128, 'https://www.voicetube.com/videos/220664'),
    ('C2', 'Ghost in the Cell | Official Trailer', 123, 'https://www.voicetube.com/videos/219571'),
    ('C2', 'Kaulitz & Kaulitz | Official Trailer', 119, 'https://www.voicetube.com/videos/212335')
) as seed(level_code, title, duration_seconds, video_url)
  on seed.level_code = levels.code
where languages.code = 'en'
on conflict (video_url) do nothing;
