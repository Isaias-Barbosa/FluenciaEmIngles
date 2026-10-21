const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(path,deps={},globals={}){const c={exports:{},Error,URL,AbortSignal,...globals,require:name=>{if(name in deps)return deps[name];throw Error(name);}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,c);return c.exports;}
class NextResponse{static json(body,options){return new Response(JSON.stringify(body),options);}}
const question={level:'A1',prompt:'Which word is used to greet someone?',choices:['Hello','Goodbye','Cold','Blue'],correctAnswer:'Hello'};
(async()=>{
 const workflow=load('lib/admin/question-workflow.ts');
 const lesson={id:'lesson',title:'Saudações',published:true,category:'Vocabulário'};
 const managed={id:'q',lessonId:'lesson',type:'multiple_choice',prompt:'Choose a greeting',choices:['Hello','Bye'],acceptedAnswers:['Hello'],published:false,audioPath:null};
 assert.equal(workflow.filterQuestions([managed],[lesson],'SAUDAÇÕES','','draft','multiple_choice').length,1);
 assert.equal(workflow.filterQuestions([managed],[lesson],'','','published','').length,0);
 assert.equal(workflow.publicationIssue(managed,lesson),'');
 assert.match(workflow.publicationIssue(managed,{...lesson,published:false}),/lição/);
 assert.match(workflow.publicationIssue({...managed,acceptedAnswers:['unknown']},lesson),/gabarito/);
 assert.match(workflow.publicationIssue({...managed,type:'listening'},lesson),/áudio/);

 const notes=load('lib/admin/teaching-notes.ts');
 assert.throws(()=>notes.parseTeachingQuestion({...question,correctAnswer:'absent'}),/gabarito/);
 assert.throws(()=>notes.parseTeachingQuestion({...question,level:''}),/nível/);
 assert.throws(()=>notes.parseTeachingQuestion({...question,choices:['a','a','b','c']}),/distintas/);
 const upstream={explanation:'Hello é uma saudação usada para iniciar uma conversa em inglês.',hint:'Pense na expressão usada ao encontrar alguém.',needsReview:false,reviewNote:''};
 let result=notes.validateTeachingNotes(upstream,question);assert.equal(result.hint,upstream.hint);
 assert.throws(()=>notes.validateTeachingNotes({...upstream,hint:'Use hello para cumprimentar alguém.'},question),error=>error.status===422);
 assert.throws(()=>notes.validateTeachingNotes({...upstream,needsReview:true,reviewNote:'Gabarito inconsistente.'},question),/Gabarito inconsistente/);
 assert.throws(()=>notes.validateTeachingNotes({...upstream,explanation:'short'},question),error=>error.status===502);
 let user={email:'admin@test'},configured=true,generations=0;
 const auth={adminAuthClient:{auth:{getUser:async()=>({data:{user},error:null})}},get hasConfiguredAdmins(){return configured;},isConfiguredAdmin:email=>email==='admin@test',adminServiceClient:{rpc:async(name,args)=>{assert.equal(name,'admin_set_questions_published');assert.equal(args.p_ids.length,2);return {data:2,error:null};}}};
 const route=load('app/api/admin/question-notes/route.ts',{'next/server':{NextResponse},'@/lib/supabase/admin-server':auth,'@/lib/admin/teaching-notes':notes,'@/lib/admin/cached-teaching-notes':{generateCachedTeachingNotes:async()=>{generations++;return {explanation:'Specific explanation.',hint:'Specific hint.'};}}});
 const call=(body={question},token='Bearer token')=>route.POST(new Request('https://example.test/api/admin/question-notes',{method:'POST',headers:token?{authorization:token}:{},body:typeof body==='string'?body:JSON.stringify(body)}));
 assert.equal((await call({},'')).status,401);user=null;assert.equal((await call()).status,401);user={email:'student@test'};assert.equal((await call()).status,403);assert.equal(generations,0);user={email:'admin@test'};assert.equal((await call('{bad')).status,400);assert.equal((await call({question:{}})).status,400);assert.equal((await call('x'.repeat(5001))).status,413);result=await call();assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');assert.equal(generations,1);
 const admin=load('app/api/admin/route.ts',{'next/server':{NextResponse},'@/lib/supabase/admin-server':auth});
 const ids=['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'];
 const batch=body=>admin.POST(new Request('https://example.test/api/admin',{method:'POST',headers:{authorization:'Bearer token'},body:JSON.stringify(body)}));
 assert.equal((await batch({action:'setQuestionsPublished',ids,published:true})).status,200);assert.equal((await batch({action:'setQuestionsPublished',ids:[ids[0],ids[0]],published:true})).status,400);assert.equal((await batch({action:'setQuestionsPublished',ids:['invalid'],published:true})).status,400);user={email:'student@test'};assert.equal((await batch({action:'setQuestionsPublished',ids,published:true})).status,403);
 console.log('Admin workflow API passed: admin authorization, input validation, protected batches, validated notes, hint leakage, review flags and invalid output.');
})().catch(error=>{console.error(error);process.exitCode=1;});
