const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const id='40000000-0000-4000-8000-000000000001';
const code=ts.transpileModule(fs.readFileSync('app/api/question-replacement/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function harness(){
 const state={user:{id:'learner'},error:null,calls:[],data:[{question_id:id,prompt:'A question from the approved reserve.',choices:['a','b','c','d'],source_url:'https://opentdb.com/',source_title:'Open Trivia DB',source_license:'CC BY-SA 4.0',origin:'reserve'}]};
 class NextResponse {static json(body,init){return new Response(JSON.stringify(body),init);}}
 const context=vm.createContext({exports:{},process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.test',NEXT_PUBLIC_SUPABASE_ANON_KEY:'public'}},
  require(name){if(name==='next/server')return {NextResponse};if(name==='@supabase/supabase-js')return {createClient:(url,key,options)=>{assert.equal(key,'public','no service/OpenAI key needed');state.headers=options.global.headers;return {auth:{getUser:async()=>({data:{user:state.user},error:null})},rpc:async(name,args)=>{state.calls.push({name,args});return {data:state.error?null:state.data,error:state.error};}};}};throw new Error(name);},
  fetch:()=>{throw Error('No external question or paid API may be called');}
 });
 vm.runInContext(code,context);
 return {state,context,call:(body={questionId:id},token='Bearer test')=>context.exports.POST(new Request('https://example.test/api/question-replacement',{method:'POST',headers:token?{authorization:token}:{},body:JSON.stringify(body)}))};
}
(async()=>{
 const h=harness();assert.equal((await h.call({},'')).status,401);h.state.user=null;assert.equal((await h.call()).status,401);h.state.user={id:'learner'};
 assert.equal((await h.call({questionId:'bad'})).status,400);
 const response=await h.call({questionId:id,level:'C2',correct_option:2,userId:'someone-else'});
 assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal((await response.json()).replacement.origin,'reserve');
 assert.equal(h.state.calls[0].name,'assign_reserve_question');assert.deepEqual(JSON.parse(JSON.stringify(h.state.calls[0].args)),{p_question_id:id},'database derives identity, level and answer');
 assert.equal(h.state.headers.Authorization,'Bearer test');
 h.state.error={code:'P0002'};const empty=await h.call();assert.equal(empty.status,409);assert.match((await empty.json()).error,/aprovada/);
 h.state.error={code:'22023'};assert.equal((await h.call()).status,409);
 h.state.error={code:'PGRST202'};assert.equal((await h.call()).status,503);
 h.state.error=null;h.state.data=[];assert.equal((await h.call()).status,503);
 console.log('Replacement API passed: authenticated database-only selection, current learner/level delegated to SQL, no OpenAI/service key, preserved slot and empty-pool handling.');
})().catch(error=>{console.error(error);process.exitCode=1;});
