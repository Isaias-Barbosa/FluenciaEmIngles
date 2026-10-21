begin;
create table public.student_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  message text not null check (char_length(btrim(message)) between 10 and 3000),
  created_at timestamptz not null default now(),
  unique (user_id, request_id)
);
create index student_feedback_created_idx on public.student_feedback (created_at desc, id);
alter table public.student_feedback enable row level security;
revoke all on public.student_feedback from public, anon, authenticated;
grant all on public.student_feedback to service_role;

create function public.submit_student_feedback(p_message text, p_request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'Entre na sua conta para enviar feedback.' using errcode='28000'; end if;
  if not exists (select 1 from public.profiles where user_id=v_user) then raise exception 'Perfil não encontrado.' using errcode='22023'; end if;
  if p_request_id is null or p_message is null or char_length(btrim(p_message)) not between 10 and 3000 then
    raise exception 'Escreva um feedback com 10 a 3000 caracteres.' using errcode='22023';
  end if;
  insert into public.student_feedback(user_id,request_id,message) values(v_user,p_request_id,btrim(p_message))
  on conflict(user_id,request_id) do nothing returning id into v_id;
  if v_id is null then select id into v_id from public.student_feedback where user_id=v_user and request_id=p_request_id; end if;
  return v_id;
end; $$;
revoke all on function public.submit_student_feedback(text,uuid) from public,anon,authenticated;
grant execute on function public.submit_student_feedback(text,uuid) to authenticated;

create function public.get_student_feedback(p_offset integer default 0, p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_offset is null or p_offset<0 or p_offset>1000000 or p_limit is null or p_limit<1 or p_limit>100 then
    raise exception 'Paginação inválida.' using errcode='22023';
  end if;
  return jsonb_build_object('total',(select count(*) from public.student_feedback),'feedbacks',coalesce((
    select jsonb_agg(to_jsonb(rows)) from (
      select f.id,f.user_id,coalesce(nullif(p.display_name,''),'Estudante') as user_name,u.email as user_email,f.message,f.created_at
      from public.student_feedback f join auth.users u on u.id=f.user_id left join public.profiles p on p.user_id=f.user_id
      order by f.created_at desc,f.id limit p_limit offset p_offset
    ) rows
  ),'[]'::jsonb));
end; $$;
revoke all on function public.get_student_feedback(integer,integer) from public,anon,authenticated;
grant execute on function public.get_student_feedback(integer,integer) to service_role;

create table public.flashcard_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.vocabulary_cards(id) on delete cascade,
  rating text not null check(rating in ('remembered','review')),
  updated_at timestamptz not null default now(),
  primary key(user_id,card_id)
);
alter table public.flashcard_progress enable row level security;
revoke all on public.flashcard_progress from public,anon,authenticated;
grant select,insert,update on public.flashcard_progress to authenticated;
grant all on public.flashcard_progress to service_role;
create policy flashcard_progress_read on public.flashcard_progress for select to authenticated using(user_id=auth.uid());
create policy flashcard_progress_insert on public.flashcard_progress for insert to authenticated with check(
  user_id=auth.uid() and exists(select 1 from public.vocabulary_cards c where c.id=card_id and c.is_published)
);
create policy flashcard_progress_update on public.flashcard_progress for update to authenticated using(user_id=auth.uid()) with check(
  user_id=auth.uid() and exists(select 1 from public.vocabulary_cards c where c.id=card_id and c.is_published)
);
create function public.touch_flashcard_progress() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end; $$;
create trigger flashcard_progress_updated before update on public.flashcard_progress for each row execute function public.touch_flashcard_progress();
commit;
