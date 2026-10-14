create function public.get_listening_transcript(p_question_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_transcript text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to get a listening transcript'
      using errcode = '28000';
  end if;

  select answer_key.accepted_answers[1]
  into v_transcript
  from public.questions
  join public.lessons on lessons.id = questions.lesson_id
  join public.question_answers as answer_key on answer_key.question_id = questions.id
  where questions.id = p_question_id
    and questions.question_type = 'listening'
    and questions.is_published
    and lessons.is_published;

  if v_transcript is null or pg_catalog.btrim(v_transcript) = '' then
    raise exception 'Published listening transcript was not found'
      using errcode = '22023';
  end if;

  return v_transcript;
end;
$$;

revoke all on function public.get_listening_transcript(uuid) from public, anon;
grant execute on function public.get_listening_transcript(uuid) to authenticated;
