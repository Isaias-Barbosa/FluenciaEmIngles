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

  await db.exec(`alter table questions add column choices jsonb default '[]';
   update questions set question_type='multiple_choice',audio_path=null,choices='["old audio answer","wrong","other","last"]' where id in ('${q(1)}','${q(5)}');
   update questions set question_type='fill_blank',audio_path=null where id='${q(2)}';
   update questions set question_type='word_order',audio_path=null where id='${q(4)}';`);
  await db.exec(fs.readFileSync('supabase/migrations/20261021220000_lesson_question_attempts.sql','utf8'));
  const {randomUUID}=require('node:crypto');
  const session=async(role,user=ids.u)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec(`set role ${role}`);};
  const start=async()=>(await db.query('select start_lesson_run($1) as run',[ids.lesson])).rows[0].run;
  const submit=async(run,i,text='old audio answer',request=randomUUID(),expected=run.attempts.filter(a=>a.question_id===q(i)).length+1)=>(await db.query('select submit_lesson_run_answer($1,$2,$3,$4,$5) as run',[run.id,q(i),text,request,expected])).rows[0].run;
  await session('anon');await assert.rejects(submit({id:ids.lesson,attempts:[]},1),/permission denied/);
  await session('authenticated','');await assert.rejects(submit({id:ids.lesson,attempts:[]},1),/Authentication/);
  await session('authenticated');let run=await start();assert.deepEqual(run.attempts,[]);
  const firstId=randomUUID();run=await submit(run,1,'wrong',firstId);assert.equal(run.answers.length,0);assert.equal(run.attempts.length,1);assert.equal(run.attempts[0].hint,'Original hint');assert.equal(run.attempts[0].attempt_limit,2);assert.ok(!JSON.stringify(run).includes('Original explanation'));assert.equal(run.attempts[0].correct_answer,undefined);
  const replay=await submit(run,1,'wrong',firstId,1);assert.equal(replay.attempts.length,1,'lost response replay does not spend another chance');
  await assert.rejects(submit(run,1,'other',randomUUID(),1),error=>error.code==='40001');
  await assert.rejects(submit(run,1,'wrong'),/available option/);await assert.rejects(submit(run,1,'outside choice'),/available option/);
  await assert.rejects(submit(run,2,'wrong'),/current question/);
  assert.equal((await start()).attempts.length,1,'reload restores remaining chances and hint');
  run=await submit(run,1);assert.equal(run.answers[0].is_correct,true);assert.equal(run.answers[0].attempt_count,2);assert.equal(run.answers.length,1);
  run=await submit(run,2,'wrong');assert.equal(run.answers.length,1);assert.equal(run.attempts.at(-1).hint,null,'no fill hint after first error');
  run=await submit(run,2,'wrong again');assert.equal(run.attempts.at(-1).hint,'Original hint');assert.equal(run.answers.length,1);assert.equal(run.attempts.at(-1).attempt_number,2);
  run=await submit(run,2,'wrong third');assert.equal(run.answers.length,2);assert.equal(run.answers[1].is_correct,false);assert.equal(run.answers[1].attempt_count,3);
  run=await submit(run,3);assert.equal(run.answers.length,3,'listening still one submission');run=await submit(run,4,'wrong');assert.equal(run.answers.length,4,'word order still one submission');
  run=await submit(run,5,'wrong');assert.equal(run.answers.length,4);run=await submit(run,5,'other');assert.equal(run.answers.length,5);assert.equal(run.answers.filter(a=>a.is_correct).length,2);assert.equal(run.passed,false);assert.ok(run.finished_at);
  assert.equal((await submit(run,5,'old audio answer')).answers[4].is_correct,false,'final result immutable');
  const failedId=run.id;run=await start();assert.notEqual(run.id,failedId);assert.equal(run.attempts.length,0);assert.equal(run.answers.length,0);
  const concurrentId=randomUUID();const replayed=await Promise.all([submit(run,1,'wrong',concurrentId),submit(run,1,'wrong',concurrentId)]);assert.ok(replayed.every(r=>r.attempts.length===1));run=replayed[0];run=await submit(run,1);
  run=await submit(run,2,'wrong');run=await submit(run,2,'wrong again');run=await submit(run,2);assert.equal(run.answers[1].is_correct,true);assert.equal(run.answers[1].attempt_count,3);
  run=await submit(run,3);run=await submit(run,4,'wrong');run=await submit(run,5,'wrong');run=await submit(run,5,'other');assert.equal(run.passed,true);assert.equal(run.answers.filter(a=>a.is_correct).length,3);assert.equal((await db.query('select * from lesson_completions')).rows.length,1,'3 of 5 after retries still passes');
  await session('authenticated',ids.other);await assert.rejects(submit(run,1),/not found/);
  await session('authenticated');await assert.rejects(db.query("update lesson_runs set attempts='[]'"),/permission denied/);
  run=await start();const parallel=await Promise.allSettled([submit(run,1,'wrong'),submit(run,1,'other')]);assert.equal(parallel.filter(r=>r.status==='fulfilled').length,1);assert.equal(parallel.find(r=>r.status==='rejected').reason.code,'40001');assert.equal((await start()).attempts.length,1,'different requests from stale tabs cannot burn both chances');
  // A saved text replacement uses the multiple-choice policy, even on an original audio slot.
  await session('postgres');await db.query('update lesson_runs set finished_at=now() where id=$1',[run.id]);
  await db.query(`insert into question_replacements(user_id,question_id,level_id,prompt,choices,correct_option,explanation,hint,source_url,source_title) values($1,$2,$3,'Choose a color.','["Green","Red","Blue","Black"]',0,'Green is a color.','Think of grass.','https://example.test','Reserve')`,[ids.u,q(3),ids.a1]);
  await session('authenticated');run=await start();run=await submit(run,1);run=await submit(run,2);run=await submit(run,3,'Red');assert.equal(run.attempts.at(-1).attempt_limit,2);assert.equal(run.attempts.at(-1).hint,'Think of grass.');assert.equal(run.answers.length,2);run=await submit(run,3,'Green');assert.equal(run.answers[2].is_correct,true);
  console.log('Question attempts DB passed: 2-choice/3-fill policies, timed hints, no interim keys, request replay/concurrency, reload, account isolation, fresh rounds, 2/5 failure, 3/5 success, unchanged audio/order and reserve snapshots.');
 }finally{await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
