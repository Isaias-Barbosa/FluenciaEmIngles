const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const ids = { u:'10000000-0000-4000-8000-000000000001', other:'10000000-0000-4000-8000-000000000002', lang:'20000000-0000-4000-8000-000000000001', a1:'20000000-0000-4000-8000-000000000002', a2:'20000000-0000-4000-8000-000000000003', lesson:'30000000-0000-4000-8000-000000000001' };
const q = i => `40000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
(async () => {
 const db = new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
   create schema auth; create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   create function auth.role() returns text language sql as $$ select current_setting('request.jwt.claim.role',true) $$;
   grant usage on schema auth to authenticated, service_role;
   create table public.languages(id uuid primary key,code text);
   create table public.language_levels(id uuid primary key,language_id uuid,code text,sort_order integer);
   create table public.profiles(user_id uuid primary key,current_level_id uuid,onboarding_completed boolean);
   create table public.lessons(id uuid primary key,level_id uuid,title text,is_published boolean);
   create table public.questions(id uuid primary key,lesson_id uuid,question_type text,audio_path text,is_published boolean,prompt text);
   create table public.question_answers(question_id uuid primary key,accepted_answers text[],explanation text,hint text);
   create table public.question_attempts(id uuid primary key default gen_random_uuid(),user_id uuid,question_id uuid,submitted_answer text,is_correct boolean,created_at timestamptz default now());
   insert into auth.users values('${ids.u}'),('${ids.other}');
   insert into public.languages values('${ids.lang}','en');
   insert into public.language_levels values('${ids.a1}','${ids.lang}','A1',1),('${ids.a2}','${ids.lang}','A2',2);
   insert into public.profiles values('${ids.u}','${ids.a1}',true),('${ids.other}','${ids.a1}',true);
   insert into public.lessons values('${ids.lesson}','${ids.a1}','Five exercises',true);
  `);
  for(let i=1;i<=5;i++){
   await db.query('insert into public.questions values($1,$2,$3,$4,true,$5)',[q(i),ids.lesson,i===5?'multiple_choice':'listening',i===5?null:'/audio.wav',i===5?'Choose the meaning of reliable.':'Original audio question '+i]);
   await db.query('insert into public.question_answers values($1,$2,$3,$4)',[q(i),['old audio answer'],'Original explanation','Original hint']);
  }
  await db.exec(fs.readFileSync('supabase/migrations/20261020140000_persistent_web_question_replacements.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261020180000_question_reserve.sql','utf8'));
  await db.exec('alter table public.questions add column sort_order integer');
  for(let i=1;i<=5;i++)await db.query('update public.questions set sort_order=$1 where id=$2',[i,q(i)]);
  // Legacy all-correct completions survive the rule change.
  for(let i=1;i<=5;i++)await db.query('insert into public.question_attempts(user_id,question_id,submitted_answer,is_correct) values($1,$2,$3,true)',[ids.other,q(i),'old audio answer']);
  await db.exec(fs.readFileSync('supabase/migrations/20261021120000_lesson_rounds.sql','utf8'));
  assert.equal((await db.query('select * from lesson_completions')).rows[0].user_id,ids.other);
  await db.exec('grant select on public.question_attempts to authenticated');
  const session=async(role,user=ids.u)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec(`set role ${role}`);};
  const start=async()=> (await db.query('select start_lesson_run($1) as run',[ids.lesson])).rows[0].run;
  const answer=async(run,i,text='old audio answer')=>(await db.query('select submit_lesson_run_answer($1,$2,$3) as run',[run.id,q(i),text])).rows[0].run;
  await session('anon');await assert.rejects(start(),/permission denied/);
  await session('authenticated','');await assert.rejects(start(),/Authentication/);
  await session('authenticated');let run=await start();assert.equal(run.question_ids.length,5);assert.equal((await start()).id,run.id);
  await assert.rejects(answer(run,2),/in order/);assert.equal((await db.query('select count(*) from question_attempts where user_id=$1',[ids.u])).rows[0].count,0);
  await assert.rejects(answer(run,1,' '),/answer is required/);
  run=await answer(run,1);const replay=await answer(run,1,'wrong changed answer');assert.equal(replay.answers.length,1);assert.equal(replay.answers[0].is_correct,true);
  run=await answer(run,2);const resumed=await start();assert.equal(resumed.id,run.id);assert.equal(resumed.answers.length,2);
  run=await answer(run,3,'wrong');run=await answer(run,4,'wrong');assert.equal(run.finished_at,null,'even three errors should show the final score after all five');run=await answer(run,5,'wrong');assert.equal(run.passed,false);assert.ok(run.finished_at);assert.equal(run.answers.filter(a=>a.is_correct).length,2);assert.equal((await db.query('select * from lesson_completions')).rows.length,0);
  assert.equal((await answer(run,5)).answers[4].is_correct,false,'finished attempt is immutable');
  const failedId=run.id;run=await start();assert.notEqual(run.id,failedId);assert.equal(run.answers.length,0);
  run=await answer(run,1,'wrong');run=await answer(run,2,'wrong');run=await answer(run,3);run=await answer(run,4);assert.equal(run.passed,false);assert.equal((await db.query('select * from lesson_completions')).rows.length,0,'lifetime correct answers cannot conclude a failed or unfinished round');
  const parallel=await Promise.all([answer(run,5),answer(run,5)]);assert.equal(parallel[0].answers.length,5);assert.equal(parallel[1].answers.length,5);run=parallel[1];assert.equal(run.passed,true);assert.equal(run.answers.filter(a=>a.is_correct).length,3);assert.equal((await db.query('select * from lesson_completions')).rows.length,1);
  assert.equal((await db.query('select count(*) from question_attempts where user_id=$1',[ids.u])).rows[0].count,10,'replays and concurrent double clicks do not record another attempt');
  await assert.rejects(db.query('insert into lesson_completions(user_id,lesson_id) values($1,$2)',[ids.u,ids.lesson]),/permission denied/);await assert.rejects(db.query('update lesson_runs set passed=true'),/permission denied/);
  await session('authenticated',ids.other);await assert.rejects(answer(run,1),/not found/);assert.equal((await db.query('select * from lesson_runs')).rows.length,0);assert.equal((await db.query('select * from lesson_completions')).rows.length,1,'legacy completion preserved and isolated');
  await session('authenticated');const changed=await start();await session('postgres');await db.query('update questions set is_published=false where id=$1',[q(5)]);await session('authenticated');const edited=await start();assert.notEqual(edited.id,changed.id);assert.equal(edited.question_ids.length,4,'content changes create a new snapshot');
  await session('postgres');
  await db.query(`insert into question_reserve(level_id,prompt,choices,correct_answer,explanation,hint,source,source_url,source_title,source_license,status) values($1,'A greeting question from the reserve.',$2,'Hello','Hello is a greeting.','Think greetings.','opentdb','https://opentdb.com/','Open Trivia DB','CC BY-SA 4.0','available')`,[ids.a1,JSON.stringify(['Hello','Bye','Thanks','Please'])]);
  await session('authenticated');await db.query('select * from assign_reserve_question($1)',[q(1)]);
  const replacementRun=await answer(edited,1,'Hello');assert.equal(replacementRun.answers[0].is_correct,true);assert.equal(replacementRun.answers[0].correct_answer,'Hello');assert.equal(replacementRun.answers[0].explanation,'Hello is a greeting.');
  console.log('Lesson runs DB passed: 2/5 fail, 3/5 pass, independent rounds, ordered single answers, resume, immutable retries/concurrency, legacy completion, authorization and content edits.');
 }finally{await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
