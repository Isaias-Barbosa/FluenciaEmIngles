const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=code=>ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
(async()=>{
 const source=fs.readFileSync('app/learn/page.tsx','utf8');const start=source.indexOf('  useEffect(() => {\n    if (!supabase) {');const end=source.indexOf('\n  useEffect(() => {\n    if (!session)',start);
 assert.ok(start>0&&end>start);let callback,cleanup,resolveInitial;const values={placementQuestionIndex:4,placementAnswers:[1,2,3,4],placementResult:null,onboardingExam:{id:'exam'}};
 const context={supabase:{auth:{onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}};},getSession:()=>new Promise(resolve=>resolveInitial=resolve)}},useEffect:fn=>cleanup=fn(),authIdentity:{current:'one'},syncAdminSession:async()=>{},console,Error};
 for(const match of source.slice(start,end).matchAll(/\bset([A-Z]\w*)\(/g)){const name=match[1];context[`set${name}`]=value=>values[name[0].toLowerCase()+name.slice(1)]=value;}
 vm.runInNewContext(compile(source.slice(start,end)),context);
 const same={user:{id:'one'},access_token:'token'};
 for(const event of ['SIGNED_IN','TOKEN_REFRESHED','INITIAL_SESSION']){callback(event,same);assert.equal(values.placementQuestionIndex,4);assert.equal(values.placementAnswers.length,4);assert.equal(values.onboardingExam.id,'exam');}
 callback('SIGNED_IN',{user:{id:'two'},access_token:'new'});assert.equal(values.placementQuestionIndex,0);assert.equal(values.placementAnswers.length,0);assert.equal(values.onboardingExam,null);assert.equal(values.profile,null);
 resolveInitial({data:{session:same},error:null});await new Promise(resolve=>setImmediate(resolve));assert.equal(values.session.user.id,'two','stale initial lookup cannot overwrite latest login');
 callback('SIGNED_OUT',null);assert.equal(values.session,null);cleanup();callback('SIGNED_IN',same);assert.equal(values.session,null);
 let user={email:'admin@test'},configured=true,dbError=false,calls=0,args;
 const auth={adminAuthClient:{auth:{getUser:async()=>({data:{user},error:null})}},adminServiceClient:{rpc:async(name,p)=>{calls++;args=p;return {data:{feedbacks:[{message:'A useful feedback'}],total:21},error:dbError?{}:null};}},get hasConfiguredAdmins(){return configured;},isConfiguredAdmin:email=>email==='admin@test'};
 const route={exports:{},URL,Error,require:name=>{if(name==='next/server')return {NextResponse:{json:(body,options)=>new Response(JSON.stringify(body),options)}};if(name==='@/lib/supabase/admin-server')return auth;throw Error(name);}};
 vm.runInNewContext(compile(fs.readFileSync('app/api/admin/feedback/route.ts','utf8')),route);
 const get=(query='',token='Bearer token')=>route.exports.GET(new Request('https://example.test/api/admin/feedback'+query,{headers:token?{authorization:token}:{}}));
 assert.equal((await get('','')).status,401);user=null;assert.equal((await get()).status,401);user={email:'student@test'};assert.equal((await get()).status,403);assert.equal(calls,0);user={email:'admin@test'};
 for(const page of ['-1','NaN','0.5','50001'])assert.equal((await get('?page='+page)).status,400);
 const response=await get('?page=1');assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(args.p_offset,20);assert.equal((await response.json()).total,21);
 dbError=true;assert.equal((await get()).status,503);configured=false;assert.equal((await get()).status,503);
 console.log('Auth/feedback API passed: same-account focus events preserve exam, account changes clear state, stale session protection, cleanup, admin access and pagination.');
})().catch(error=>{console.error(error);process.exitCode=1;});
