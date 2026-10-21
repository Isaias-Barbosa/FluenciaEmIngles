const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(path,deps={},globals={}){const c={exports:{},Error,URL,AbortSignal,...globals,require:name=>{if(name in deps)return deps[name];throw Error(name);}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,c);return c.exports;}
class NextResponse{static json(body,options){return new Response(JSON.stringify(body),options);}}
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const question={level:'A1',prompt:'Choose the greeting.',choices:['Hello','Blue','Cold','Bye'],correctAnswer:'Hello'};
const good={hint:'Pense na expressão usada ao encontrar alguém.',explanation:'Hello é uma saudação para começar uma conversa.',provider:'Groq'};
(async()=>{
 let user={id:id(1)},enabled=true,state='claimed',generationError=false,generation=good,generated=0,prepared=0,finished=0,rpcError=null,finishError=false;
 const privateData={question,accepted_answers:['Hello','Hi'],lease_id:id(4)};
 const client={rpc:async(name,args)=>{
  assert.equal(args.p_user_id,id(1),'identity always comes from verified auth');
  if(name==='prepare_student_question_help'){
   prepared++;assert.equal(args.p_run_id,id(2));assert.equal(args.p_question_id,id(3));
   return {error:rpcError,data:{state,...privateData,hint:state==='cached'?good.hint:undefined,provider:'Groq',next_available_at:'2026-10-21T13:40:00Z',server_now:'2026-10-21T13:00:00Z',retry_after:2400}};
  }
  assert.equal(name,'finish_student_question_help');finished++;assert.equal(args.p_lease_id,id(4));
  if(generationError||generation.hint.includes('Hi'))assert.equal(args.p_hint,null,'failure must release without consuming');
  return {error:finishError?Error('private failure'):null,data:finishError?null:{next_available_at:'2026-10-21T13:40:00Z',server_now:'2026-10-21T13:00:00Z'}};
 }};
 const notes=load('lib/admin/teaching-notes.ts');
 const route=load('app/api/question-help/route.ts',{'next/server':{NextResponse},'@/lib/supabase/admin-server':{adminAuthClient:{auth:{getUser:async token=>{assert.equal(token,'token');return {data:{user},error:null};}}},adminServiceClient:client},'@/lib/admin/free-teaching-providers':{configuredFreeProviders:()=>enabled?[{}]:[]},'@/lib/admin/free-teaching-router':{generateTeachingNotes:async(q,c)=>{generated++;assert.equal(c,client);assert.equal(q,question);if(generationError)throw new notes.TeachingNotesError('The correct answer is Hello!',422);return generation;}},'@/lib/admin/teaching-notes':notes});
 const call=(method='POST',body={runId:id(2),questionId:id(3)},token='Bearer token')=>route[method](new Request('https://example.test/api/question-help'+(method==='GET'?`?runId=${body.runId}&questionId=${body.questionId}`:''),{method,headers:token?{authorization:token}:{},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}));
 assert.equal((await call('POST',{},'')).status,401);assert.equal(prepared,0);
 user=null;assert.equal((await call()).status,401);user={id:id(1)};
 assert.equal((await call('POST','bad')).status,400);assert.equal((await call('POST','x'.repeat(1001))).status,400);assert.equal((await call('POST',{runId:'bad',questionId:id(3)})).status,400);assert.equal(prepared,0);
 enabled=false;assert.equal((await call()).status,503);assert.equal(prepared,0);enabled=true;
 state='ready';let result=await call('GET');assert.equal(result.status,200);let body=await result.json();assert.equal(body.state,'ready');assert.equal(body.question,undefined);assert.equal(body.lease_id,undefined);assert.equal(body.accepted_answers,undefined);assert.equal(generated,0);assert.equal(finished,0);assert.equal(result.headers.get('cache-control'),'no-store');
 for(const mode of ['cooldown','busy']){state=mode;result=await call();assert.equal(result.status,429);assert.equal(result.headers.get('retry-after'),'2400');body=await result.json();assert.equal(body.question,undefined);assert.equal(body.lease_id,undefined);assert.equal(generated,0);}
 state='cached';body=await (await call()).json();assert.equal(body.hint,good.hint);assert.equal(body.question,undefined);assert.equal(body.accepted_answers,undefined);assert.equal(generated,0);
 state='claimed';result=await call('POST',{runId:id(2),questionId:id(3),userId:id(99),question:{correctAnswer:'malicious'}});assert.equal(result.status,200);body=await result.json();assert.equal(body.hint,good.hint);assert.equal(body.provider,'Groq');assert.equal(body.explanation,undefined);assert.equal(body.question,undefined);assert.ok(!JSON.stringify(body).includes('Hello'));assert.equal(generated,1);assert.equal(finished,1);
 generationError=true;result=await call();assert.equal(result.status,503);assert.ok(!(await result.text()).includes('Hello'));assert.equal(finished,2);generationError=false;
 generation={...good,hint:'Use Hi para iniciar uma conversa.'};assert.equal((await call()).status,503,'secondary accepted answer must also be blocked');assert.equal(finished,3);generation=good;
 finishError=true;assert.equal((await call()).status,503);finishError=false;
 rpcError={code:'22023',message:'private answer'};result=await call();assert.equal(result.status,409);assert.ok(!(await result.text()).includes('private answer'));
 rpcError={code:'42883',message:'missing function'};assert.equal((await call()).status,503);
 console.log('Student AI API passed: authentication, server identity/context, UUID/body validation, private projections, shared router, cooldown/retry header, cached hints, no keys/explanations/review-note leakage, failure release and accepted-answer variants.');
})().catch(error=>{console.error(error);process.exitCode=1;});
