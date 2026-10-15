with canonical_lessons (slug, title, description) as (
  values
    ('listening-a1-practice', 'Inglês A1: compreensão oral', 'Diálogos e frases curtas sobre apresentações, rotina, família e objetos do dia a dia. Vinte áudios originais gerados para prática de transcrição. Todas as questões começam como rascunho para revisão.'),
    ('listening-a2-practice', 'Inglês A2: compreensão oral', 'Mensagens e situações cotidianas com descrições e planos simples. Vinte áudios originais gerados para prática de transcrição. Todas as questões começam como rascunho para revisão.'),
    ('listening-b1-practice', 'Inglês B1: compreensão oral', 'Narrativas curtas, experiências e situações práticas com mais detalhes. Vinte áudios originais gerados para prática de transcrição. Todas as questões começam como rascunho para revisão.'),
    ('listening-b2-practice', 'Inglês B2: compreensão oral', 'Conversas e informações mais longas com condicionais, opiniões e explicações. Vinte áudios originais gerados para prática de transcrição. Todas as questões começam como rascunho para revisão.'),
    ('listening-c1-practice', 'Inglês C1: compreensão oral', 'Discursos articulados com linguagem formal, inferências e estruturas avançadas. Vinte áudios originais gerados para prática de transcrição. Todas as questões começam como rascunho para revisão.'),
    ('listening-c2-practice', 'Inglês C2: compreensão oral', 'Trechos densos e sutis que exigem compreensão de argumentos, nuance e precisão. Vinte áudios originais gerados para prática de transcrição.')
)
update public.lessons as lessons
set
  title = canonical.title,
  description = canonical.description,
  category = 'Compreensão oral'
from canonical_lessons as canonical
where lessons.slug = canonical.slug
  and (
    lessons.title like '%?%'
    or lessons.description like '%?%'
    or lessons.category like '%?%'
  );

update public.questions as questions
set prompt = 'Ouça o áudio e transcreva o que foi dito.'
from public.lessons as lessons
where lessons.id = questions.lesson_id
  and lessons.slug in (
    'listening-a1-practice',
    'listening-a2-practice',
    'listening-b1-practice',
    'listening-b2-practice',
    'listening-c1-practice',
    'listening-c2-practice'
  )
  and questions.question_type = 'listening'
  and questions.prompt like '%?%';

update public.question_answers as answers
set explanation = format(
  'Questão de compreensão oral %s, item %s. Transcrição usada para conferência; revisar antes de publicar.',
  case lessons.slug
    when 'listening-a1-practice' then 'A1'
    when 'listening-a2-practice' then 'A2'
    when 'listening-b1-practice' then 'B1'
    when 'listening-b2-practice' then 'B2'
    when 'listening-c1-practice' then 'C1'
    when 'listening-c2-practice' then 'C2'
  end,
  lpad(questions.sort_order::text, 2, '0')
)
from public.questions as questions
join public.lessons as lessons on lessons.id = questions.lesson_id
where answers.question_id = questions.id
  and lessons.slug in (
    'listening-a1-practice',
    'listening-a2-practice',
    'listening-b1-practice',
    'listening-b2-practice',
    'listening-c1-practice',
    'listening-c2-practice'
  )
  and questions.question_type = 'listening'
  and answers.explanation like '%?%';
