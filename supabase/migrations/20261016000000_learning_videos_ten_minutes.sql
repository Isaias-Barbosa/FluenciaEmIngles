begin;

alter table public.learning_videos
  drop constraint learning_videos_duration_seconds_check;

alter table public.learning_videos
  add constraint learning_videos_duration_seconds_check
  check (duration_seconds between 60 and 600);

commit;
