const fs = require('node:fs');
const assert = require('node:assert/strict');
const content = require('./reading-content.cjs');
const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
const counters = {};
const rows = [];
for (const [level, title, passage, questions] of content) {
  counters[level] = (counters[level] ?? 0) + 1;
  const slug = `reading-${level.toLowerCase()}-${counters[level]}`;
  assert.equal(questions.length, 5);
  questions.forEach(([prompt, answer, ...others], index) => {
    assert.equal(others.length, 3);
    const choices = [answer, ...others];
    const offset = (index + counters[level] - 1) % 4;
    const rotated = [...choices.slice(offset), ...choices.slice(0, offset)];
    assert.equal(new Set(rotated).size, 4);
    rows.push(`(${[level, slug, title, passage, prompt].map(quote).join(', ')}, ${index + 1}, ${quote(JSON.stringify(rotated))}::jsonb, ${quote(answer)})`);
  });
}
assert.equal(rows.length, 100);
assert.deepEqual(counters, { A1: 4, A2: 4, B1: 4, B2: 4, C1: 4 });
let sql = `-- 100 original reading questions: 20 per level, A1 through C1.
begin;
alter table public.questions add column if not exists reading_passage text;

create temporary table reading_seed (
  level_code text, slug text, title text, passage text, prompt text,
  question_order integer, choices jsonb, answer text
) on commit drop;
insert into reading_seed values
${rows.join(',\n')};

insert into public.lessons (level_id, slug, title, description, category, duration_minutes, sort_order, is_published)
select levels.id, seed.slug, seed.title || ' · ' || levels.code,
  'Leia o texto e responda às cinco questões de interpretação.', 'Leitura e interpretação', 8,
  coalesce((select max(existing.sort_order) from public.lessons existing where existing.level_id = levels.id), 0)
    + row_number() over (partition by levels.id order by seed.slug), true
from (select distinct level_code, slug, title from reading_seed) seed
join public.language_levels levels on levels.code = seed.level_code
join public.languages on languages.id = levels.language_id and languages.code = 'en'
where not exists (select 1 from public.lessons existing where existing.slug = seed.slug);

insert into public.questions (lesson_id, question_type, prompt, reading_passage, choices, sort_order, difficulty, is_published)
select lessons.id, 'multiple_choice', seed.prompt, seed.passage, seed.choices, seed.question_order,
  case when seed.level_code in ('A1', 'A2') then 'easy' when seed.level_code = 'B1' then 'intermediate' else 'hard' end, true
from reading_seed seed join public.lessons on lessons.slug = seed.slug
on conflict (lesson_id, sort_order) do update set
  prompt = excluded.prompt, reading_passage = excluded.reading_passage,
  choices = excluded.choices, difficulty = excluded.difficulty;

insert into public.question_answers (question_id, accepted_answers, explanation, hint)
select questions.id, array[seed.answer],
  'De acordo com o texto, a resposta é: ' || seed.answer || '.',
  'Releia o texto destacado e procure a informação relacionada à pergunta.'
from reading_seed seed join public.lessons on lessons.slug = seed.slug
join public.questions on questions.lesson_id = lessons.id and questions.sort_order = seed.question_order
on conflict (question_id) do update set accepted_answers = excluded.accepted_answers,
  explanation = excluded.explanation, hint = excluded.hint;

`;
const previous = fs.readFileSync('supabase/migrations/20261015000000_word_order_questions.sql', 'utf8');
let view = previous.slice(previous.indexOf('create view public.published_lesson_questions'));
view = view.replace('create view', 'create or replace view').replace('question_answers.hint\n', 'question_answers.hint,\n    questions.reading_passage\n').replace('question_answers.hint\r\n', 'question_answers.hint,\n    questions.reading_passage\n');
assert.ok(view.includes('questions.reading_passage'));
fs.writeFileSync('supabase/migrations/20261015021000_reading_comprehension.sql', sql + view);
console.log(`Validated and generated ${rows.length} questions in ${content.length} lessons.`);
