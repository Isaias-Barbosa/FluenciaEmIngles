const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const ids = {
  u: '10000000-0000-4000-8000-000000000001', other: '10000000-0000-4000-8000-000000000002',
  lang: '20000000-0000-4000-8000-000000000001', a1: '20000000-0000-4000-8000-000000000002', a2: '20000000-0000-4000-8000-000000000003',
  lesson: '30000000-0000-4000-8000-000000000001',
};
const q = i => `40000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create function auth.role() returns text language sql as $$ select current_setting('request.jwt.claim.role', true) $$;
      grant usage on schema auth to authenticated, service_role;
      create table public.languages(id uuid primary key, code text);
      create table public.language_levels(id uuid primary key, language_id uuid, code text);
      create table public.profiles(user_id uuid primary key, current_level_id uuid, onboarding_completed boolean);
      create table public.lessons(id uuid primary key, level_id uuid, title text, is_published boolean);
      create table public.questions(id uuid primary key, lesson_id uuid, question_type text, audio_path text, is_published boolean);
      create table public.question_answers(question_id uuid primary key, accepted_answers text[], explanation text, hint text);
      create table public.question_attempts(id uuid primary key default gen_random_uuid(), user_id uuid, question_id uuid, submitted_answer text, is_correct boolean, created_at timestamptz default now());
      insert into auth.users values('${ids.u}'), ('${ids.other}');
      insert into public.languages values('${ids.lang}', 'en');
      insert into public.language_levels values('${ids.a1}', '${ids.lang}', 'A1'), ('${ids.a2}', '${ids.lang}', 'A2');
      insert into public.profiles values('${ids.u}', '${ids.a1}', true), ('${ids.other}', '${ids.a1}', true);
      insert into public.lessons values('${ids.lesson}', '${ids.a1}', 'First steps', true);
    `);
    for (let i = 1; i <= 5; i++) {
      await db.query('insert into public.questions values ($1,$2,$3,$4,true)', [q(i), ids.lesson, i === 5 ? 'multiple_choice' : 'listening', i === 5 ? null : '/audio.wav']);
      await db.query('insert into public.question_answers values ($1,$2,$3,$4)', [q(i), ['old audio answer'], 'Old explanation', 'Old hint']);
    }
    await db.exec(fs.readFileSync('supabase/migrations/20261020140000_persistent_web_question_replacements.sql', 'utf8'));
    const session = async (role, user = ids.u) => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.role', $1, false), set_config('request.jwt.claim.sub', $2, false)", [role, user]);
      await db.exec(`set role ${role}`);
    };
    await session('authenticated');
    await assert.rejects(db.query('select * from public.question_replacements'), /permission denied/);
    await assert.rejects(db.query('select * from public.reserve_question_replacement_search($1,$2)', [ids.u,q(1)]), /permission denied/);
    await assert.rejects(db.query("select public.save_question_replacement($1,'A valid English exercise question','[\"one\",\"two\",\"three\",\"four\"]',0,'explanation','hint','https://cambridgeenglish.org/','Source')", [ids.u]), /permission denied/);
    assert.equal((await db.query('select * from public.get_my_question_replacements()')).rows.length, 0);
    await session('service_role');
    const reserve = async id => (await db.query('select * from public.reserve_question_replacement_search($1,$2)', [ids.u, id])).rows[0];
    const job = await reserve(q(1));
    assert.equal(job.level_code, 'A1');
    await assert.rejects(reserve(q(1)), /already running/);
    await assert.rejects(reserve(q(5)), /audio question/);
    await db.query('select public.save_question_replacement($1,$2,$3,$4,$5,$6,$7,$8)', [job.request_id, 'Complete: She ___ a teacher.', JSON.stringify(['is','are','am','be']),0,'Use is with she.','Pense na terceira pessoa.','https://learnenglish.britishcouncil.org/grammar','British Council']);
    // Repeating a save is idempotent and cannot change the stored answer.
    await db.query('select public.save_question_replacement($1,$2,$3,$4,$5,$6,$7,$8)', [job.request_id, 'A different prompt that must not replace it.', JSON.stringify(['bad','x','y','z']),0,'bad','bad','https://cambridgeenglish.org/','Other']);
    await session('authenticated', ids.other);
    assert.equal((await db.query('select * from public.get_my_question_replacements()')).rows.length, 0, 'private per user');
    const unchanged = (await db.query('select * from public.submit_question_answer($1,$2)', [q(1),'old audio answer'])).rows[0];
    assert.equal(unchanged.is_correct, true, 'original question still works for other learners');
    await session('authenticated');
    const restored = (await db.query('select * from public.get_my_question_replacements()')).rows[0];
    assert.equal(restored.question_id, q(1));
    assert.equal(restored.prompt, 'Complete: She ___ a teacher.');
    assert.deepEqual(Object.keys(restored).sort(), ['question_id','prompt','choices','source_url','source_title'].sort(), 'never expose answer key');
    const wrong = (await db.query('select * from public.submit_question_answer($1,$2)', [q(1),'old audio answer'])).rows[0];
    assert.equal(wrong.is_correct, false, 'original audio answer must not pass replacement');
    assert.equal(wrong.wrong_attempts, 1);
    assert.equal(wrong.explanation.includes('Use is'), false, 'do not reveal replacement answer on error');
    assert.equal((await db.query('select * from public.submit_question_answer($1,$2)', [q(1),'IS'])).rows[0].is_correct, true);
    await db.query('select * from public.submit_question_answer($1,$2)', [q(1),'is']);
    // Complete the other four original slots.
    for (let i = 2; i <= 5; i++) {
      const result = (await db.query('select * from public.submit_question_answer($1,$2)', [q(i),'old audio answer'])).rows[0];
      assert.equal(result.level_completed, i === 5);
    }
    await db.exec('reset role');
    const progress = (await db.query('select count(distinct a.question_id)::int as done from public.question_attempts a join public.questions q on q.id=a.question_id where a.user_id=$1 and a.is_correct and q.lesson_id=$2', [ids.u, ids.lesson])).rows[0];
    assert.equal(progress.done, 5, 'five original slots completed, no duplicate credit');
    assert.equal((await db.query('select count(*)::int as count from public.questions')).rows[0].count, 5, 'never grow the mission denominator');
    await session('authenticated');
    assert.equal((await db.query('select * from public.get_my_question_replacements()')).rows[0].question_id, q(1), 'replacement survives reload');
    await session('service_role');
    await assert.rejects(reserve(q(2)), /already completed/);
    // Test level validation and persistent quota for a separate learner.
    await db.exec('reset role');
    await db.query('delete from public.question_attempts where user_id=$1', [ids.u]);
    await db.query('update public.profiles set current_level_id=$1 where user_id=$2', [ids.a2,ids.u]);
    await session('service_role');
    await assert.rejects(reserve(q(2)), /current level/);
    await db.exec('reset role');
    await db.query('update public.profiles set current_level_id=$1 where user_id=$2', [ids.a1,ids.u]);
    await db.query("insert into public.question_replacement_searches(user_id,question_id,level_id,finished_at) select $1,$2,$3,now() from generate_series(1,20)", [ids.u,q(2),ids.a1]);
    await session('service_role');
    await assert.rejects(reserve(q(2)), /limit reached/);
    console.log('Database regression passed: same 5 slots, persisted reload, unique progress, private answers/users, correct grading, same level, quota and idempotent saves.');
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
