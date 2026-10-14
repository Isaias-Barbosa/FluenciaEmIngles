drop policy if exists "Learners can create their own profile" on public.profiles;

revoke insert, update on public.profiles from authenticated;
grant update (display_name, learning_goal, daily_goal_minutes)
  on public.profiles to authenticated;

create table public.vocabulary_cards (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.language_levels (id) on delete cascade,
  front text not null,
  back text not null,
  pronunciation text not null default '',
  sort_order smallint not null,
  is_published boolean not null default false,
  unique (level_id, sort_order)
);

alter table public.vocabulary_cards enable row level security;

create policy "Published vocabulary cards are readable by everyone"
  on public.vocabulary_cards for select
  using (is_published);

grant select on public.vocabulary_cards to anon, authenticated;

create view public.published_lesson_questions
with (security_barrier = true)
as
  select
    lessons.id as lesson_id,
    lessons.slug as lesson_slug,
    lessons.title as lesson_title,
    lessons.description as lesson_description,
    lessons.category as lesson_category,
    lessons.duration_minutes,
    lessons.sort_order as lesson_sort_order,
    language_levels.code as level_code,
    language_levels.title as level_title,
    questions.id as question_id,
    questions.question_type,
    questions.prompt,
    questions.choices,
    questions.audio_path,
    questions.sort_order as question_sort_order
  from public.lessons
  join public.language_levels on language_levels.id = lessons.level_id
  join public.questions on questions.lesson_id = lessons.id
  where lessons.is_published and questions.is_published;

grant select on public.published_lesson_questions to anon, authenticated;

create function public.complete_onboarding(
  p_level_code text,
  p_learning_goal text,
  p_daily_goal_minutes smallint
)
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
    raise exception 'Authentication is required to complete onboarding'
      using errcode = '28000';
  end if;

  if p_learning_goal is null
    or pg_catalog.btrim(p_learning_goal) = ''
    or pg_catalog.char_length(p_learning_goal) > 100
    or p_daily_goal_minutes not in (10, 20, 30, 45) then
    raise exception 'Invalid learning goal or daily goal'
      using errcode = '22023';
  end if;

  select levels.id
  into v_level_id
  from public.language_levels as levels
  join public.languages on languages.id = levels.language_id
  where languages.code = 'en' and levels.code = p_level_code;

  if v_level_id is null then
    raise exception 'Unknown English level'
      using errcode = '22023';
  end if;

  update public.profiles
  set current_level_id = v_level_id,
      learning_goal = pg_catalog.btrim(p_learning_goal),
      daily_goal_minutes = p_daily_goal_minutes,
      onboarding_completed = true,
      updated_at = pg_catalog.now()
  where user_id = v_user_id
    and not onboarding_completed;

  if not found then
    raise exception 'Profile not found or onboarding is already complete'
      using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.complete_onboarding(text, text, smallint)
  from public, anon;
grant execute on function public.complete_onboarding(text, text, smallint)
  to authenticated;

drop function public.submit_question_answer(uuid, text);

create function public.submit_question_answer(
  p_question_id uuid,
  p_submitted_answer text
)
returns table (
  is_correct boolean,
  explanation text,
  level_advanced boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_correct boolean;
  v_explanation text;
  v_level_id uuid;
  v_level_advanced boolean := false;
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
      from pg_catalog.unnest(answer_key.accepted_answers) as accepted(answer)
      where pg_catalog.lower(pg_catalog.btrim(accepted.answer))
        = pg_catalog.lower(pg_catalog.btrim(p_submitted_answer))
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

  return query select v_is_correct, v_explanation, v_level_advanced;
end;
$$;

revoke all on function public.submit_question_answer(uuid, text)
  from public, anon;
grant execute on function public.submit_question_answer(uuid, text)
  to authenticated;

insert into public.lessons (
  level_id, slug, title, description, category, duration_minutes, sort_order, is_published
)
select levels.id, lesson.slug, lesson.title, lesson.description, lesson.category,
  lesson.duration_minutes, lesson.sort_order, true
from public.language_levels as levels
join public.languages on languages.id = levels.language_id
join (
  values
    ('a1-introductions', 'A1', 'Diga olá e se apresente', 'Aprenda cumprimentos e como dizer seu nome em uma conversa.', 'Conversação', 8, 1),
    ('a1-to-be', 'A1', 'O verbo to be: I am, you are', 'Monte suas primeiras frases usando o verbo mais importante do inglês.', 'Gramática', 10, 2),
    ('a1-age', 'A1', 'Números e idade', 'Conte de zero a vinte e fale quantos anos você tem.', 'Vocabulário', 7, 3),
    ('a1-routine', 'A1', 'Sua rotina em inglês', 'Fale sobre seu dia com verbos simples e o presente.', 'Vocabulário', 9, 4),
    ('a2-past', 'A2', 'Conte o que aconteceu', 'Use o passado simples para falar sobre experiências recentes.', 'Gramática', 12, 1),
    ('a2-restaurant', 'A2', 'Peça comida no restaurante', 'Faça um pedido e converse com confiança em um restaurante.', 'Conversação', 9, 2),
    ('a2-future', 'A2', 'Planos para o futuro', 'Fale sobre planos e intenções com going to.', 'Gramática', 10, 3),
    ('b1-experiences', 'B1', 'Experiências de vida', 'Conecte experiências passadas ao presente com present perfect.', 'Gramática', 12, 1),
    ('b1-opinions', 'B1', 'Dê sua opinião', 'Compartilhe ideias, concorde e discorde com naturalidade.', 'Conversação', 10, 2),
    ('b1-connectors', 'B1', 'Conecte suas ideias', 'Use conectores para deixar suas histórias mais claras.', 'Escrita', 11, 3),
    ('b2-possibilities', 'B2', 'Explique possibilidades', 'Explore condicionais para falar de hipóteses e consequências.', 'Gramática', 12, 1),
    ('b2-work', 'B2', 'O inglês no trabalho', 'Participe de reuniões e apresente suas ideias profissionalmente.', 'Vocabulário', 10, 2),
    ('b2-debate', 'B2', 'Debata com confiança', 'Construa argumentos e reconheça pontos de vista diferentes.', 'Conversação', 13, 3),
    ('c1-nuance', 'C1', 'Nuances e expressões', 'Entenda expressões idiomáticas e o que elas comunicam além do literal.', 'Vocabulário', 14, 1),
    ('c1-writing', 'C1', 'Escrita persuasiva', 'Organize argumentos complexos em textos claros e convincentes.', 'Escrita', 15, 2),
    ('c1-precision', 'C1', 'Comunique com precisão', 'Ajuste tom e escolha de palavras a diferentes situações.', 'Conversação', 12, 3),
    ('c2-register', 'C2', 'Domínio de registros', 'Alterne entre registros formais, informais e acadêmicos com precisão.', 'Comunicação', 15, 1),
    ('c2-subtext', 'C2', 'Leia nas entrelinhas', 'Interprete ironia, referências culturais e significados implícitos.', 'Compreensão', 14, 2),
    ('c2-refine', 'C2', 'Refine sua expressão', 'Aprimore estilo, ritmo e precisão em textos sofisticados.', 'Escrita', 16, 3)
) as lesson(slug, level_code, title, description, category, duration_minutes, sort_order)
  on lesson.level_code = levels.code
where languages.code = 'en'
on conflict (slug) do update set
  level_id = excluded.level_id,
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  duration_minutes = excluded.duration_minutes,
  sort_order = excluded.sort_order,
  is_published = true;

insert into public.questions (
  lesson_id, question_type, prompt, choices, sort_order, is_published
)
select lessons.id, 'multiple_choice', question.prompt, question.choices, 1, true
from (
  values
    ('a1-introductions', 'Como você diz “Meu nome é Ana” em inglês?', '["I am name Ana.", "My name is Ana.", "I name Ana."]'::jsonb, 'My name is Ana.'),
    ('a1-to-be', 'Complete: “They ___ happy.”', '["is", "am", "are"]'::jsonb, 'are'),
    ('a1-age', 'Qual frase significa “Eu tenho 20 anos”?', '["I have 20 years old.", "I am 20 years old.", "I has 20."]'::jsonb, 'I am 20 years old.'),
    ('a1-routine', 'Complete: “I ___ coffee every morning.”', '["drink", "drinks", "drinking"]'::jsonb, 'drink'),
    ('a2-past', 'Complete: “We ___ a movie last night.”', '["watch", "watched", "watches"]'::jsonb, 'watched'),
    ('a2-restaurant', 'Qual é uma forma educada de pedir água?', '["Water now!", "Can I have some water, please?", "Give water to me."]'::jsonb, 'Can I have some water, please?'),
    ('a2-future', 'Complete: “She is ___ visit London.”', '["going to", "go to", "will to"]'::jsonb, 'going to'),
    ('b1-experiences', 'Complete: “I have ___ to New York twice.”', '["be", "been", "was"]'::jsonb, 'been'),
    ('b1-opinions', 'Complete: “___, this is a great idea.”', '["In my opinion", "I am opinion", "For my think"]'::jsonb, 'In my opinion'),
    ('b1-connectors', 'Complete: “It was raining, ___ we stayed home.”', '["because", "so", "although"]'::jsonb, 'so'),
    ('b2-possibilities', 'Complete: “If I had more time, I ___ travel more.”', '["will", "would", "did"]'::jsonb, 'would'),
    ('b2-work', 'O que significa “deadline”?', '["Prazo final", "Reunião inicial", "Promoção"]'::jsonb, 'Prazo final'),
    ('b2-debate', 'O que “on the other hand” indica?', '["Uma conclusão", "Um contraste", "Um exemplo"]'::jsonb, 'Um contraste'),
    ('c1-nuance', '“To hit the nail on the head” significa:', '["Acertar em cheio", "Começar uma tarefa", "Desistir de algo"]'::jsonb, 'Acertar em cheio'),
    ('c1-writing', 'Qual conector introduz uma ressalva formal?', '["Nevertheless", "By the way", "First of all"]'::jsonb, 'Nevertheless'),
    ('c1-precision', 'Qual expressão soa mais diplomática?', '["You are wrong.", "I see your point, however…", "That makes no sense."]'::jsonb, 'I see your point, however…'),
    ('c2-register', 'Qual opção é mais formal?', '["Kids", "Children", "Little ones"]'::jsonb, 'Children'),
    ('c2-subtext', 'Uma afirmação “tongue-in-cheek” é:', '["Levada literalmente", "Feita com humor ou ironia", "Muito formal"]'::jsonb, 'Feita com humor ou ironia'),
    ('c2-refine', '“Concise” descreve um texto que é:', '["Breve e claro", "Complexo e longo", "Informal e engraçado"]'::jsonb, 'Breve e claro')
) as question(lesson_slug, prompt, choices, correct_answer)
join public.lessons on lessons.slug = question.lesson_slug
on conflict (lesson_id, sort_order) do update set
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  choices = excluded.choices,
  is_published = true;

insert into public.question_answers (question_id, accepted_answers, explanation)
select questions.id, array[question.correct_answer], ''
from (
  values
    ('a1-introductions', 'My name is Ana.'),
    ('a1-to-be', 'are'),
    ('a1-age', 'I am 20 years old.'),
    ('a1-routine', 'drink'),
    ('a2-past', 'watched'),
    ('a2-restaurant', 'Can I have some water, please?'),
    ('a2-future', 'going to'),
    ('b1-experiences', 'been'),
    ('b1-opinions', 'In my opinion'),
    ('b1-connectors', 'so'),
    ('b2-possibilities', 'would'),
    ('b2-work', 'Prazo final'),
    ('b2-debate', 'Um contraste'),
    ('c1-nuance', 'Acertar em cheio'),
    ('c1-writing', 'Nevertheless'),
    ('c1-precision', 'I see your point, however…'),
    ('c2-register', 'Children'),
    ('c2-subtext', 'Feita com humor ou ironia'),
    ('c2-refine', 'Breve e claro')
) as question(lesson_slug, correct_answer)
join public.lessons on lessons.slug = question.lesson_slug
join public.questions on questions.lesson_id = lessons.id
  and questions.sort_order = 1
on conflict (question_id) do update set
  accepted_answers = excluded.accepted_answers,
  explanation = excluded.explanation;

insert into public.vocabulary_cards (
  level_id, front, back, pronunciation, sort_order, is_published
)
select levels.id, card.front, card.back, card.pronunciation, card.sort_order, true
from public.language_levels as levels
join public.languages on languages.id = levels.language_id
join (
  values
    ('A1', 'Hello', 'Olá', '/həˈloʊ/', 1),
    ('A1', 'Thank you', 'Obrigado(a)', '/ˈθæŋk juː/', 2),
    ('A1', 'Good morning', 'Bom dia', '/ɡʊd ˈmɔːrnɪŋ/', 3),
    ('A1', 'How are you?', 'Como você está?', '/haʊ ɑːr juː/', 4),
    ('A1', 'Nice to meet you', 'Prazer em conhecer você', '/naɪs tə miːt juː/', 5),
    ('A2', 'Yesterday', 'Ontem', '/ˈjestərdeɪ/', 1),
    ('A2', 'Could you help me?', 'Você poderia me ajudar?', '/kʊd juː help miː/', 2),
    ('A2', 'I would like…', 'Eu gostaria de…', '/aɪ wʊd laɪk/', 3),
    ('A2', 'Around the corner', 'Logo ali na esquina', '/əˈraʊnd ðə ˈkɔːrnər/', 4),
    ('B1', 'As far as I know', 'Até onde eu sei', '/æz fɑːr æz aɪ noʊ/', 1),
    ('B1', 'I have been there', 'Eu já estive lá', '/aɪ hæv bɪn ðer/', 2),
    ('B1', 'It depends on…', 'Depende de…', '/ɪt dɪˈpendz ɑːn/', 3),
    ('B1', 'On the other hand', 'Por outro lado', '/ɑːn ði ˈʌðər hænd/', 4),
    ('B2', 'To meet a deadline', 'Cumprir um prazo', '/tə miːt ə ˈdedlaɪn/', 1),
    ('B2', 'That makes sense', 'Isso faz sentido', '/ðæt meɪks sens/', 2),
    ('B2', 'To bring something up', 'Mencionar um assunto', '/tə brɪŋ ˈsʌmθɪŋ ʌp/', 3),
    ('B2', 'As a matter of fact', 'Na verdade / aliás', '/æz ə ˈmætər əv fækt/', 4),
    ('C1', 'To hit the nail on the head', 'Acertar em cheio', '/tə hɪt ðə neɪl ɑːn ðə hed/', 1),
    ('C1', 'Nevertheless', 'No entanto', '/ˌnevərðəˈles/', 2),
    ('C1', 'To shed light on', 'Esclarecer / lançar luz sobre', '/tə ʃed laɪt ɑːn/', 3),
    ('C1', 'By all means', 'Certamente / fique à vontade', '/baɪ ɔːl miːnz/', 4),
    ('C2', 'Tongue-in-cheek', 'Irônico, dito com humor', '/ˌtʌŋ ɪn ˈtʃiːk/', 1),
    ('C2', 'To read between the lines', 'Ler nas entrelinhas', '/tə riːd bɪˈtwiːn ðə laɪnz/', 2),
    ('C2', 'Notwithstanding', 'Não obstante', '/ˌnɑːtwɪðˈstændɪŋ/', 3),
    ('C2', 'Concise', 'Breve e claro', '/kənˈsaɪs/', 4)
) as card(level_code, front, back, pronunciation, sort_order)
  on card.level_code = levels.code
where languages.code = 'en'
on conflict (level_id, sort_order) do update set
  front = excluded.front,
  back = excluded.back,
  pronunciation = excluded.pronunciation,
  is_published = true;
