const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto');
function load(path,deps={},globals={}){const c={exports:{},Error,...globals,require:name=>{if(name in deps)return deps[name];throw Error(name);}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,c);return c.exports;}
const question={level:'A1',prompt:'Which word greets someone?',choices:['Hello','Goodbye','Cold','Blue'],correctAnswer:'Hello'},good={explanation:'Hello é uma saudação usada ao encontrar alguém.',hint:'Pense na expressão usada para iniciar uma conversa.',provider:'Groq'};
(async()=>{
 const notes=load('lib/admin/teaching-notes.ts');let calls=0,fail=false,invalid=false,state='claimed',dbError=false,finishError=false,finishes=[],ttl;
 const cache=load('lib/admin/cached-teaching-notes.ts',{'node:crypto':crypto,'./teaching-notes':notes,'./free-teaching-router':{generateTeachingNotes:async(q,client)=>{calls++;assert.ok(client);if(fail)throw new notes.TeachingNotesError('Quota reached.',429);return invalid?{...good,hint:'A resposta é Hello.'}:good;}}},{process:{env:{}}});
 const hash=cache.teachingNotesCacheKey(question);assert.match(hash,/^[a-f0-9]{64}$/);assert.equal(cache.teachingNotesCacheKey({correctAnswer:question.correctAnswer,choices:question.choices,prompt:question.prompt,level:question.level}),hash,'object property order is irrelevant');
 const variants=[{...question,level:'A2'},{...question,prompt:question.prompt+' Again.'},{...question,choices:['Goodbye','Hello','Cold','Blue']},{...question,choices:['Hello','Goodbye','Warm','Blue']},{...question,correctAnswer:'Goodbye'}];for(const variant of variants)assert.notEqual(cache.teachingNotesCacheKey(variant),hash);
 assert.equal(cache.teachingNotesCacheTtl(),86400);assert.equal(cache.teachingNotesCacheTtl('3600'),3600);assert.equal(cache.teachingNotesCacheTtl('604800'),604800);for(const v of ['0','NaN','3.5','604801',''])assert.equal(cache.teachingNotesCacheTtl(v),86400);
 const timing={generated_at:'2026-10-21T14:00:00Z',expires_at:'2026-10-22T14:00:00Z'};
 const client={rpc:async(name,args)=>{
  assert.equal(args.p_cache_key,hash);ttl=args.p_ttl_seconds;
  if(name==='claim_teaching_notes_cache')return {error:dbError?Error('DB'):null,data:{state,lease_id:'lease',...good,...timing}};
  assert.equal(name,'finish_teaching_notes_cache');finishes.push(args);return {error:finishError?Error('DB'):null,data:finishError?null:timing};
 }};
 let result=await cache.generateCachedTeachingNotes(question,client);assert.equal(result.cached,false);assert.equal(result.generatedAt,timing.generated_at);assert.equal(result.hint,good.hint);assert.equal(calls,1);assert.equal(finishes[0].p_hint,good.hint);assert.equal(ttl,86400);
 state='hit';result=await cache.generateCachedTeachingNotes(question,client);assert.equal(result.cached,true);assert.equal(calls,1,'cache hit never calls a provider or its quota router');assert.equal(finishes.length,1,'cache hit never writes or refreshes expiry');assert.equal(result.lease_id,undefined);
 state='busy';await assert.rejects(cache.generateCachedTeachingNotes(question,client),error=>error.status===409);assert.equal(calls,1);
 state='claimed';fail=true;await assert.rejects(cache.generateCachedTeachingNotes(question,client),error=>error.status===429);assert.equal(finishes.at(-1).p_explanation,null);assert.equal(finishes.at(-1).p_hint,null);fail=false;
 invalid=true;await assert.rejects(cache.generateCachedTeachingNotes(question,client),error=>error.status===422);assert.equal(finishes.at(-1).p_explanation,null,'invalid outputs never enter cache');invalid=false;
 dbError=true;const before=calls;await assert.rejects(cache.generateCachedTeachingNotes(question,client),error=>error.status===503);assert.equal(calls,before,'DB failure does not cause an uncached provider call');dbError=false;
 finishError=true;await assert.rejects(cache.generateCachedTeachingNotes(question,client),error=>error.status===503);finishError=false;await assert.rejects(cache.generateCachedTeachingNotes(question,null),error=>error.status===503);
 console.log('Teaching cache passed: stable content/version keys, all input invalidations, TTL configuration, cached result reuse, no quota use on hit/busy, failure release, validation and fail-closed persistence.');
})().catch(error=>{console.error(error);process.exitCode=1;});
