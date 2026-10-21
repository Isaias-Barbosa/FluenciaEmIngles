begin;
create function public.admin_set_questions_published(p_ids uuid[],p_published boolean) returns integer
language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
 if p_ids is null or p_published is null or cardinality(p_ids) not between 1 and 50
    or (select count(distinct id) from unnest(p_ids) id)<>cardinality(p_ids) then
   raise exception 'Selecione de 1 a 50 questões distintas.' using errcode='22023';
 end if;
 -- Lock both questions and parent lessons until the entire batch is committed.
 perform q.id from public.questions q join public.lessons l on l.id=q.lesson_id
 where q.id=any(p_ids) for update of q,l;
 select count(*) into v_count from public.questions q
 join public.lessons l on l.id=q.lesson_id join public.language_levels ll on ll.id=l.level_id
 join public.languages lang on lang.id=ll.language_id and lang.code='en' where q.id=any(p_ids);
 if v_count<>cardinality(p_ids) then raise exception 'Seleção inválida: use apenas questões de inglês existentes.' using errcode='22023'; end if;
 if p_published and exists(select 1 from public.questions q join public.lessons l on l.id=q.lesson_id
 left join public.question_answers a on a.question_id=q.id where q.id=any(p_ids) and (
   not l.is_published or btrim(q.prompt)='' or coalesce(cardinality(a.accepted_answers),0)=0
   or exists(select 1 from unnest(a.accepted_answers) answer where answer is null or btrim(answer)='')
   or (q.question_type='listening' and coalesce(btrim(q.audio_path),'')='')
   or (q.question_type='multiple_choice' and case when jsonb_typeof(q.choices)='array' then
       jsonb_array_length(q.choices) not between 2 and 8
       or exists(select 1 from unnest(a.accepted_answers) answer where not q.choices @> jsonb_build_array(answer))
       else true end)
 )) then raise exception 'Revise as lições, os gabaritos, as alternativas e os áudios da seleção antes de publicar.' using errcode='22023'; end if;
 update public.questions set is_published=p_published where id=any(p_ids);
 return v_count;
end; $$;
revoke all on function public.admin_set_questions_published(uuid[],boolean) from public,anon,authenticated;
grant execute on function public.admin_set_questions_published(uuid[],boolean) to service_role;
commit;
