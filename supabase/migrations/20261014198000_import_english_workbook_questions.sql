alter table public.questions
  add column if not exists difficulty text not null default 'intermediate'
  check (difficulty in ('easy', 'intermediate', 'hard'));

create or replace view public.published_lesson_questions
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
    questions.sort_order as question_sort_order,
    questions.difficulty
  from public.lessons
  join public.language_levels on language_levels.id = lessons.level_id
  join public.questions on questions.lesson_id = lessons.id
  where lessons.is_published and questions.is_published;

grant select on public.published_lesson_questions to anon, authenticated;

insert into public.lessons (
  level_id, slug, title, description, category, duration_minutes, sort_order, is_published
)
select
  levels.id,
  lesson.slug,
  lesson.title,
  lesson.description,
  lesson.category,
  lesson.duration_minutes,
  coalesce((
    select max(existing.sort_order)
    from public.lessons as existing
    where existing.level_id = levels.id
  ), 0) + lesson.level_order,
  false
from (
  values
    ('pdf-100-a1-foundations', 'A1', 'Caderno: fundamentos essenciais', 'Questões fáceis de pronomes, artigos, verbo to be e presente simples. Importadas do caderno de exercícios; revisar antes de publicar.', 'Gramática', 15, 1),
    ('pdf-100-a2-tenses', 'A2', 'Caderno: tempos verbais', 'Questões intermediárias de passado, futuro e present perfect; inclui itens difíceis de past perfect e condicionais. Importadas do caderno de exercícios; revisar antes de publicar.', 'Gramática', 15, 1),
    ('pdf-100-a2-prepositions', 'A2', 'Caderno: preposições e modais', 'Questões de preposições de tempo e lugar, modais e comparativos, do nível fácil ao intermediário. Importadas do caderno de exercícios; revisar antes de publicar.', 'Gramática', 15, 2),
    ('pdf-100-b1-connectors', 'B1', 'Caderno: conectores e estruturas avançadas', 'Questões intermediárias e difíceis de condicionais, comparativos, conectores e estruturas so/such. Importadas do caderno de exercícios; revisar antes de publicar.', 'Gramática', 18, 1),
    ('pdf-100-a2-vocabulary', 'A2', 'Caderno: vocabulário e combinações', 'Vocabulário cotidiano, profissões, lugares e combinações verbais. Questões fáceis e intermediárias importadas do caderno de exercícios; revisar antes de publicar.', 'Vocabulário', 15, 3),
    ('pdf-100-b1-expressions', 'B1', 'Caderno: phrasal verbs e expressões', 'Questões intermediárias e difíceis de phrasal verbs e expressões idiomáticas. Importadas do caderno de exercícios; revisar antes de publicar.', 'Vocabulário', 15, 2),
    ('pdf-100-a2-writing', 'A2', 'Caderno: escrita e tradução', 'Exercícios de escrita e tradução de nível fácil e intermediário. Respostas de referência do caderno; revisar variantes aceitáveis antes de publicar.', 'Escrita', 18, 4),
    ('pdf-100-b1-writing', 'B1', 'Caderno: escrita intermediária', 'Exercícios de escrita com respostas abertas ou dependentes de contexto. Mantidos como rascunhos para revisão pedagógica antes da publicação.', 'Escrita', 15, 3),
    ('pdf-100-a2-open-writing', 'A2', 'Caderno: respostas pessoais', 'Exercícios com respostas pessoais. Exemplos do gabarito não representam todas as respostas corretas; revisar manualmente antes de publicar.', 'Escrita', 10, 5)
) as lesson(slug, level_code, title, description, category, duration_minutes, level_order)
join public.languages on languages.code = 'en'
join public.language_levels as levels
  on levels.language_id = languages.id
  and levels.code = lesson.level_code
on conflict (slug) do nothing;

with question_data (
  source_number,
  lesson_slug,
  difficulty,
  question_type,
  prompt,
  choices,
  correct_choice,
  written_answers,
  explanation
) as (
  values
    (1, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'I ___ a student at the university.', '["is", "am", "are", "be"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 1.'),
    (2, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', '___ she your sister?', '["Are", "Am", "Does", "Is"]'::jsonb, 4, null::text[], 'Importado do caderno de exercícios, questão 2.'),
    (3, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'They ___ from Japan. They are from China.', '["isn''t", "aren''t", "am not", "not are"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 3.'),
    (4, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'I bought ___ apple and ___ banana.', '["a / a", "an / an", "an / a", "a / an"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 4.'),
    (5, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'Look at ___ birds flying high above us!', '["this", "that", "these", "those"]'::jsonb, 4, null::text[], 'Importado do caderno de exercícios, questão 5.'),
    (6, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'This book belongs to John. It is ___ book.', '["his", "her", "their", "your"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 6.'),
    (7, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'We have a car. ___ car is blue.', '["Us", "Our", "Ours", "We"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 7.'),
    (8, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', '___ name is Sarah, and she is my friend.', '["His", "Her", "She", "Hers"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 8.'),
    (9, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'Can you give ___ the pen, please?', '["I", "my", "me", "mine"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 9.'),
    (10, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'There ___ a cat under the table.', '["is", "are", "be", "have"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 10.'),
    (11, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'There ___ many people at the party.', '["is", "are", "was", "be"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 11.'),
    (12, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'I don''t have ___ money left.', '["some", "any", "no", "many"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 12.'),
    (13, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'Would you like ___ coffee?', '["some", "any", "much", "a few"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 13.'),
    (14, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'How ___ friends do you have?', '["much", "many", "some", "any"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 14.'),
    (15, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'How ___ time is left?', '["much", "many", "long", "a lot"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 15.'),
    (16, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'He works as ___ engineer.', '["a", "an", "the", "-"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 16.'),
    (17, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', '___ sun is very hot today.', '["A", "An", "The", "-"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 17.'),
    (18, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'Whose bag is this? It''s ___.', '["my", "me", "mine", "I"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 18.'),
    (21, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'She usually ___ up at 7 AM.', '["wake", "wakes", "waking", "is waking"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 21.'),
    (22, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'I ___ watching TV right now.', '["am", "is", "are", "do"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 22.'),
    (23, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'They ___ play soccer on Sundays.', '["doesn''t", "don''t", "aren''t", "isn''t"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 23.'),
    (24, 'pdf-100-a1-foundations', 'easy', 'multiple_choice', 'What ___ you do for a living?', '["are", "is", "do", "does"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 24.'),
    (25, 'pdf-100-a2-tenses', 'easy', 'multiple_choice', 'He ___ to the cinema last night.', '["go", "goes", "went", "going"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 25.'),
    (26, 'pdf-100-a2-tenses', 'easy', 'multiple_choice', 'We ___ a great time at the party yesterday.', '["have", "has", "had", "having"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 26.'),
    (27, 'pdf-100-a2-tenses', 'intermediate', 'multiple_choice', '___ she finish her homework yesterday?', '["Do", "Does", "Did", "Was"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 27.'),
    (28, 'pdf-100-a2-tenses', 'intermediate', 'multiple_choice', 'I was reading a book when the phone ___.', '["ring", "rang", "ringing", "rung"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 28.'),
    (29, 'pdf-100-a2-tenses', 'intermediate', 'multiple_choice', 'While they ___ walking, it started to rain.', '["are", "was", "were", "be"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 29.'),
    (30, 'pdf-100-a2-tenses', 'intermediate', 'multiple_choice', 'I ___ travel to Paris next year. (Plan)', '["will", "am going to", "going to", "would"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 30.'),
    (31, 'pdf-100-a2-tenses', 'intermediate', 'multiple_choice', 'Look at those clouds! It ___ rain.', '["will", "is going to", "can", "must"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 31.'),
    (32, 'pdf-100-a2-tenses', 'intermediate', 'multiple_choice', 'I promise I ___ help you with the project.', '["will", "am going to", "do", "am"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 32.'),
    (33, 'pdf-100-a2-tenses', 'intermediate', 'multiple_choice', '___ you ever been to London?', '["Has", "Have", "Did", "Are"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 33.'),
    (34, 'pdf-100-a2-tenses', 'intermediate', 'multiple_choice', 'She has ___ finished her dinner. (Just now)', '["yet", "already", "just", "ever"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 34.'),
    (35, 'pdf-100-a2-tenses', 'intermediate', 'multiple_choice', 'I haven''t seen him ___ 2015.', '["for", "since", "in", "at"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 35.'),
    (36, 'pdf-100-a2-tenses', 'intermediate', 'multiple_choice', 'They have lived here ___ ten years.', '["for", "since", "from", "by"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 36.'),
    (37, 'pdf-100-b1-connectors', 'hard', 'multiple_choice', 'By the time we arrived, the movie ___ started.', '["has", "have", "had", "was"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 37.'),
    (38, 'pdf-100-b1-connectors', 'intermediate', 'multiple_choice', 'If it rains, we ___ stay home.', '["would", "will", "could", "are"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 38.'),
    (39, 'pdf-100-b1-connectors', 'hard', 'multiple_choice', 'If I had a million dollars, I ___ buy an island.', '["will", "can", "would", "am"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 39.'),
    (40, 'pdf-100-b1-connectors', 'hard', 'multiple_choice', 'I wish I ___ speak French.', '["can", "will", "could", "am able"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 40.'),
    (41, 'pdf-100-a2-prepositions', 'easy', 'multiple_choice', 'My birthday is ___ October.', '["in", "on", "at", "to"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 41.'),
    (42, 'pdf-100-a2-prepositions', 'easy', 'multiple_choice', 'The meeting is ___ Monday morning.', '["in", "on", "at", "by"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 42.'),
    (43, 'pdf-100-a2-prepositions', 'easy', 'multiple_choice', 'I usually wake up ___ 7 o''clock.', '["in", "on", "at", "from"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 43.'),
    (44, 'pdf-100-a2-prepositions', 'easy', 'multiple_choice', 'The keys are ___ the table.', '["in", "on", "at", "over"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 44.'),
    (45, 'pdf-100-a2-prepositions', 'intermediate', 'multiple_choice', 'She is very good ___ math.', '["in", "on", "at", "with"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 45.'),
    (46, 'pdf-100-a2-prepositions', 'intermediate', 'multiple_choice', 'I am interested ___ learning new languages.', '["on", "in", "about", "for"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 46.'),
    (47, 'pdf-100-a2-prepositions', 'intermediate', 'multiple_choice', 'He apologized ___ being late.', '["for", "to", "with", "about"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 47.'),
    (48, 'pdf-100-a2-prepositions', 'easy', 'multiple_choice', 'You ___ wear a uniform at school. (Obligation)', '["can", "must", "might", "could"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 48.'),
    (49, 'pdf-100-a2-prepositions', 'intermediate', 'multiple_choice', '___ I use your bathroom, please?', '["Must", "Should", "May", "Will"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 49.'),
    (50, 'pdf-100-a2-prepositions', 'intermediate', 'multiple_choice', 'You ___ smoke in the hospital.', '["don''t have to", "shouldn''t", "mustn''t", "couldn''t"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 50.'),
    (51, 'pdf-100-b1-connectors', 'intermediate', 'multiple_choice', 'You ___ see a doctor about that cough; it’s the best thing to do.', '["should", "might", "can", "would"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 51.'),
    (52, 'pdf-100-b1-connectors', 'easy', 'multiple_choice', 'She is ___ than her sister.', '["tall", "taller", "tallest", "more tall"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 52.'),
    (53, 'pdf-100-b1-connectors', 'intermediate', 'multiple_choice', 'This is the ___ book I have ever read.', '["better", "goodest", "best", "most good"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 53.'),
    (54, 'pdf-100-b1-connectors', 'intermediate', 'multiple_choice', 'He drives ___ carefully than I do.', '["more", "most", "much", "very"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 54.'),
    (55, 'pdf-100-b1-connectors', 'easy', 'multiple_choice', 'I like both apples ___ oranges.', '["or", "but", "and", "so"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 55.'),
    (56, 'pdf-100-b1-connectors', 'easy', 'multiple_choice', 'I was tired; ___, I went to bed early.', '["because", "therefore", "but", "although"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 56.'),
    (57, 'pdf-100-b1-connectors', 'intermediate', 'multiple_choice', '___ it was raining, we went for a walk.', '["However", "Despite", "Although", "Because"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 57.'),
    (58, 'pdf-100-b1-connectors', 'intermediate', 'multiple_choice', 'I didn''t buy it ___ it was too expensive.', '["because", "so", "due to", "but"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 58.'),
    (59, 'pdf-100-b1-connectors', 'hard', 'multiple_choice', 'The movie was ___ boring that I fell asleep.', '["such", "so", "very", "too"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 59.'),
    (60, 'pdf-100-b1-connectors', 'hard', 'multiple_choice', 'It was ___ a cold day that we stayed inside.', '["such", "so", "very", "too"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 60.'),
    (61, 'pdf-100-b1-expressions', 'intermediate', 'multiple_choice', 'Could you ___ the lights? It''s too dark in here.', '["turn off", "turn on", "turn up", "turn down"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 61.'),
    (62, 'pdf-100-b1-expressions', 'intermediate', 'multiple_choice', 'I need to ___ smoking for my health.', '["give up", "take up", "look up", "get up"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 62.'),
    (63, 'pdf-100-b1-expressions', 'intermediate', 'multiple_choice', 'Please ___ your shoes before entering the house.', '["take off", "put on", "try on", "get off"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 63.'),
    (64, 'pdf-100-b1-expressions', 'intermediate', 'multiple_choice', 'I am looking ___ my keys. Have you seen them?', '["at", "after", "for", "into"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 64.'),
    (65, 'pdf-100-b1-expressions', 'intermediate', 'multiple_choice', 'The plane is going to ___ off in ten minutes.', '["fly", "get", "take", "set"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 65.'),
    (66, 'pdf-100-a2-vocabulary', 'easy', 'multiple_choice', 'My uncle is the brother of my ___.', '["aunt", "grandfather", "father or mother", "cousin"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 66.'),
    (67, 'pdf-100-a2-vocabulary', 'easy', 'multiple_choice', 'A person who works in a restaurant kitchen is a ___.', '["waiter", "cook/chef", "manager", "host"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 67.'),
    (68, 'pdf-100-a2-vocabulary', 'easy', 'multiple_choice', 'The opposite of "expensive" is ___.', '["rich", "cheap", "poor", "low"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 68.'),
    (69, 'pdf-100-a2-vocabulary', 'easy', 'multiple_choice', 'The opposite of "beautiful" is ___.', '["handsome", "ugly", "pretty", "cute"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 69.'),
    (70, 'pdf-100-a2-vocabulary', 'easy', 'multiple_choice', 'If you are sick, you should go to the ___.', '["bakery", "pharmacy", "library", "butcher"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 70.'),
    (71, 'pdf-100-a2-vocabulary', 'easy', 'multiple_choice', 'I need to buy bread at the ___.', '["bakery", "butcher", "hardware store", "library"]'::jsonb, 1, null::text[], 'Importado do caderno de exercícios, questão 71.'),
    (72, 'pdf-100-a2-vocabulary', 'intermediate', 'multiple_choice', 'What time did you ___ at the hotel?', '["reach", "arrive", "come", "approach"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 72.'),
    (73, 'pdf-100-a2-vocabulary', 'intermediate', 'multiple_choice', 'Can you ___ me some money? I''ll pay you back tomorrow.', '["borrow", "lend", "rent", "owe"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 73.'),
    (74, 'pdf-100-a2-vocabulary', 'easy', 'multiple_choice', 'I ___ to music while I study.', '["hear", "listen", "sound", "play"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 74.'),
    (75, 'pdf-100-a2-vocabulary', 'intermediate', 'multiple_choice', 'She likes to ___ photos when she travels.', '["do", "make", "take", "get"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 75.'),
    (76, 'pdf-100-a2-vocabulary', 'intermediate', 'multiple_choice', 'I usually ___ my bed in the morning.', '["do", "make", "take", "build"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 76.'),
    (77, 'pdf-100-a2-vocabulary', 'intermediate', 'multiple_choice', 'We need to ___ a decision soon.', '["do", "make", "get", "take"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 77.'),
    (78, 'pdf-100-b1-expressions', 'hard', 'multiple_choice', 'It''s a piece of ___. (Very easy)', '["bread", "cake", "pie", "meat"]'::jsonb, 2, null::text[], 'Importado do caderno de exercícios, questão 78.'),
    (79, 'pdf-100-b1-expressions', 'hard', 'multiple_choice', 'Break a ___! (Good luck)', '["arm", "finger", "leg", "bone"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 79.'),
    (80, 'pdf-100-b1-expressions', 'hard', 'multiple_choice', 'Under the ___. (Feeling sick)', '["sun", "rain", "weather", "clouds"]'::jsonb, 3, null::text[], 'Importado do caderno de exercícios, questão 80.'),
    (81, 'pdf-100-a2-writing', 'intermediate', 'fill_blank', 'Translate into English: "Eu gosto de ler livros nos finais de semana."', '[]'::jsonb, null, array['I like to read books on weekends.', 'I like reading books on weekends.'], 'Importado do caderno, questão 81. Tradução de referência; revisar variantes válidas antes de publicar.'),
    (82, 'pdf-100-a2-writing', 'easy', 'fill_blank', 'Translate into English: "Qual é o seu nome e de onde você é?"', '[]'::jsonb, null, array['What is your name and where are you from?', 'What''s your name and where are you from?'], 'Importado do caderno, questão 82. Tradução de referência; revisar variantes válidas antes de publicar.'),
    (83, 'pdf-100-a2-writing', 'intermediate', 'fill_blank', 'Translate into English: "Ela não está trabalhando hoje."', '[]'::jsonb, null, array['She is not working today.', 'She isn''t working today.'], 'Importado do caderno, questão 83. Tradução de referência; revisar variantes válidas antes de publicar.'),
    (84, 'pdf-100-a2-writing', 'intermediate', 'fill_blank', 'Write the question for this answer: "Yes, I have a dog."', '[]'::jsonb, null, array['Do you have a dog?', 'Have you got a dog?'], 'Importado do caderno, questão 84. Pergunta de referência; revisar variantes válidas antes de publicar.'),
    (85, 'pdf-100-a2-writing', 'easy', 'fill_blank', 'Write the question for this answer: "I am 25 years old."', '[]'::jsonb, null, array['How old are you?', 'What is your age?'], 'Importado do caderno, questão 85. Pergunta de referência; revisar variantes válidas antes de publicar.'),
    (86, 'pdf-100-b1-writing', 'hard', 'fill_blank', 'Complete in English: "If I have time tomorrow, I..." (write a consequence)', '[]'::jsonb, null, array['I will go to the park.'], 'Importado do caderno, questão 86. Resposta aberta: exemplo do gabarito, não gabarito único. Manter como rascunho.'),
    (87, 'pdf-100-a2-writing', 'intermediate', 'fill_blank', 'Translate into English: "Nós fomos à praia no verão passado."', '[]'::jsonb, null, array['We went to the beach last summer.'], 'Importado do caderno, questão 87. Tradução de referência; revisar variantes válidas antes de publicar.'),
    (88, 'pdf-100-a2-writing', 'intermediate', 'fill_blank', 'Change to the negative: "He plays tennis every Friday."', '[]'::jsonb, null, array['He doesn''t play tennis every Friday.', 'He does not play tennis every Friday.'], 'Importado do caderno, questão 88. Resposta de referência; revisar variantes válidas antes de publicar.'),
    (89, 'pdf-100-a2-writing', 'intermediate', 'fill_blank', 'Change to the past: "I eat a sandwich for lunch."', '[]'::jsonb, null, array['I ate a sandwich for lunch.'], 'Importado do caderno, questão 89. Resposta de referência; revisar variantes válidas antes de publicar.'),
    (90, 'pdf-100-a2-writing', 'intermediate', 'fill_blank', 'Change to the future using "will": "They study hard."', '[]'::jsonb, null, array['They will study hard.'], 'Importado do caderno, questão 90. Resposta de referência; revisar variantes válidas antes de publicar.'),
    (91, 'pdf-100-a2-writing', 'easy', 'fill_blank', 'Translate into English: "Há um computador na mesa."', '[]'::jsonb, null, array['There is a computer on the table.'], 'Importado do caderno, questão 91. Tradução de referência; revisar variantes válidas antes de publicar.'),
    (92, 'pdf-100-a2-writing', 'intermediate', 'fill_blank', 'Complete with IN, ON, or AT: "The concert starts ___ 8 PM ___ Friday."', '[]'::jsonb, null, array['at / on', 'at on'], 'Importado do caderno, questão 92. Resposta de referência; revisar variantes válidas antes de publicar.'),
    (93, 'pdf-100-a2-writing', 'intermediate', 'fill_blank', 'Rewrite in the plural: "This is a beautiful city."', '[]'::jsonb, null, array['These are beautiful cities.'], 'Importado do caderno, questão 93. Resposta de referência; revisar variantes válidas antes de publicar.'),
    (94, 'pdf-100-b1-writing', 'intermediate', 'fill_blank', 'Translate into English: "Você poderia me ajudar, por favor?"', '[]'::jsonb, null, array['Could you help me, please?', 'Could you help me please?'], 'Importado do caderno, questão 94. Tradução de referência; revisar variantes válidas antes de publicar.'),
    (95, 'pdf-100-b1-writing', 'hard', 'fill_blank', 'Translate into English: "Eu nunca estive nos Estados Unidos."', '[]'::jsonb, null, array['I have never been to the United States.', 'I''ve never been to the United States.', 'I have never been to the United States of America.'], 'Importado do caderno, questão 95. Tradução de referência; revisar variantes válidas antes de publicar.'),
    (96, 'pdf-100-a2-open-writing', 'intermediate', 'fill_blank', 'Complete with your own information: "My favorite hobby is..."', '[]'::jsonb, null, array['playing guitar', 'reading'], 'Importado do caderno, questão 96. Resposta pessoal; exemplos do gabarito não representam todas as respostas corretas. Manter como rascunho.'),
    (97, 'pdf-100-a2-open-writing', 'intermediate', 'fill_blank', 'Describe today''s weather in English in one short sentence.', '[]'::jsonb, null, array['It is sunny today.'], 'Importado do caderno, questão 97. Resposta pessoal; exemplo do gabarito não representa todas as respostas corretas. Manter como rascunho.')
),
prepared_questions as (
  select
    question_data.*,
    row_number() over (
      partition by question_data.lesson_slug
      order by question_data.source_number
    )::smallint as question_order
  from question_data
),
inserted_questions as (
  insert into public.questions (
    lesson_id, question_type, prompt, choices, sort_order, is_published, difficulty
  )
  select
    lessons.id,
    prepared.question_type,
    prepared.prompt,
    prepared.choices,
    prepared.question_order,
    false,
    prepared.difficulty
  from prepared_questions as prepared
  join public.lessons on lessons.slug = prepared.lesson_slug
  on conflict (lesson_id, sort_order) do nothing
  returning id, lesson_id, sort_order
)
insert into public.question_answers (question_id, accepted_answers, explanation)
select
  inserted.id,
  case
    when prepared.correct_choice is not null
      then array[prepared.choices ->> (prepared.correct_choice - 1)]
    else prepared.written_answers
  end,
  prepared.explanation
from inserted_questions as inserted
join public.lessons on lessons.id = inserted.lesson_id
join prepared_questions as prepared
  on prepared.lesson_slug = lessons.slug
  and prepared.question_order = inserted.sort_order;
