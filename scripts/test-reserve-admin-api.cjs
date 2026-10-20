const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto');
function load(path,deps){const c=vm.createContext({exports:{},Error,URL,require:name=>{if(name in deps)return deps[name];throw Error(name);}});vm.runInContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,c);return c.exports;}
const types=load('lib/cefr/types.ts',{}),helpers=load('lib/learning/reserve.ts',{'@/lib/cefr/types':types});
const levelId='20000000-0000-4000-8000-000000000001';
function harness(){
 const state={user:{id:'admin',email:'admin@test'},configured:true,records:[],writes:0,missing:false};let revision=0;
 function table(name){
  const query={name,filters:[],mode:'select',values:null,offset:0,end:10000,
   select(){return this;},order(){return this;},eq(key,value){this.filters.push(row=>row[key]===value);return this;},in(key,values){this.filters.push(row=>values.includes(row[key]));return this;},range(from,to){this.offset=from;this.end=to;return this;},
   insert(values){this.mode='insert';this.values=values;return this;},update(values){this.mode='update';this.values=values;return this;},upsert(values){this.mode='upsert';this.values=values;return this;},
   async result(single=false){
    if(name==='languages')return {data:single?{id:'english'}:[{id:'english'}],error:null};
    if(name==='language_levels'){const rows=[{id:levelId,code:'A1',title:'Beginner',language_id:'english'}].filter(row=>this.filters.every(fn=>fn(row)));return {data:single?rows[0]:rows,error:null};}
    assert.equal(name,'question_reserve');if(state.missing)return {data:null,error:{code:'42P01'}};
    const matching=()=>state.records.filter(row=>this.filters.every(fn=>fn(row)));
    if(this.mode==='insert'||this.mode==='upsert'){
      const incoming=Array.isArray(this.values)?this.values:[this.values];
      for(const fields of incoming){const content_key=crypto.createHash('md5').update(fields.prompt.trim().toLowerCase().replace(/\s+/g,' ')).digest('hex');if(state.records.some(row=>row.content_key===content_key)){if(this.mode==='upsert')continue;return {data:null,error:{code:'23505'}};}
       state.records.push({...fields,id:`50000000-0000-4000-8000-${String(++revision).padStart(12,'0')}`,content_key,updated_at:String(revision),created_at:String(revision)});state.writes++;}
    }
    const updated=this.mode==='update'?matching():null;
    if(this.mode==='update'){for(const row of updated){Object.assign(row,this.values,{updated_at:String(++revision)});state.writes++;}}
    const rows=updated||matching();return {data:single?(rows[0]?{...rows[0]}:null):rows.slice(this.offset,this.end+1).map(row=>({...row})),count:rows.length,error:null};
   },single(){return this.result(true);},maybeSingle(){return this.result(true);},then(resolve,reject){return this.result().then(resolve,reject);}
  };return query;
 }
 const client={from:table,rpc:async()=>({data:[{level_code:'A1',pending:state.records.filter(row=>row.status==='pending').length,available:state.records.filter(row=>row.status==='available').length,archived:0}],error:state.missing?{code:'42883'}:null})};
 const auth={adminAuthClient:{auth:{getUser:async()=>({data:{user:state.user},error:null})}},adminServiceClient:client,get hasConfiguredAdmins(){return state.configured;},isConfiguredAdmin:email=>email==='admin@test'};
 class NextResponse{static json(body,init){return new Response(JSON.stringify(body),init);}}
 const route=load('app/api/admin/question-reserve/route.ts',{'next/server':{NextResponse},'@/lib/supabase/admin-server':auth,'@/lib/learning/reserve':helpers});
 const call=(body,token='Bearer token')=>route.POST(new Request('https://example.test/api/admin/question-reserve',{method:'POST',headers:token?{authorization:token}:{},body:JSON.stringify(body)}));
 const get=query=>route.GET(new Request('https://example.test/api/admin/question-reserve'+(query||''),{headers:{authorization:'Bearer token'}}));
 return {state,call,get,client,auth,NextResponse};
}
assert.throws(()=>helpers.assertReserveApproval({level:'A1',choices:['re-sign','re sign','other','none'],correctAnswer:'re-sign',explanation:'Explanation',hint:'Hint'}),/distintas/);
const question={level:'A1',prompt:'What word can you use to greet someone?',choices:['Hello','Bye','Cold','Blue'],correctAnswer:'Hello',explanation:'',hint:'',source:'opentdb',category:'General',source_url:'https://evil.test',source_license:'forged'};
(async()=>{
 const h=harness();assert.equal((await h.call({},'')).status,401);h.state.user=null;assert.equal((await h.get()).status,401);h.state.user={id:'student',email:'student@test'};assert.equal((await h.call({action:'save',question})).status,403);assert.equal(h.state.writes,0);h.state.user={id:'admin',email:'admin@test'};
 let response=await h.call({action:'save',status:'available',question});assert.equal(response.status,201);let row=(await response.json()).question;
 assert.equal(row.status,'pending','imports/manual creation cannot skip review');assert.equal(row.source_url,'https://opentdb.com/');assert.equal(row.source_license,'CC BY-SA 4.0');
 assert.equal((await h.call({action:'save',question})).status,409,'deduplicate');
 assert.equal((await h.call({action:'save',id:row.id,updatedAt:row.updated_at,status:'available',question})).status,400,'cannot approve without teaching notes');
 response=await h.call({action:'save',id:row.id,updatedAt:row.updated_at,status:'available',question:{...question,explanation:'Hello is used as a greeting.',hint:'Think of the beginning of a conversation.'}});assert.equal(response.status,200);row=(await response.json()).question;assert.equal(row.status,'available');
 assert.equal((await h.call({action:'save',id:row.id,updatedAt:'old',status:'archived',question})).status,409,'protect concurrent edits');
 assert.equal((await h.get('?status=available&level=A1')).status,200);
 assert.equal((await h.get('?status=unknown')).status,400);assert.equal((await h.get('?page=-1')).status,400);
 response=await h.call({action:'save',id:row.id,updatedAt:row.updated_at,status:'pending',preserveTeachingNotes:true,question});assert.equal(response.status,200);row=(await response.json()).question;assert.ok(row.explanation,'review screen edits preserve existing explanations');
 h.state.missing=true;assert.equal((await h.get()).status,503);
 const stage=harness();
 const review=load('app/api/admin/question-review/route.ts',{'node:crypto':crypto,'next/server':{NextResponse:stage.NextResponse},'@/lib/supabase/admin-server':stage.auth,'@/lib/learning/reserve':helpers,'@/lib/cefr/analyze':{analyzeCefr:()=>({level:'A1'})},'@/lib/cefr/trivia':{ReviewError:class ReviewError extends Error{},importTrivia:async()=>[{id:'trivia-test',prompt:question.prompt,choices:question.choices,correctAnswer:question.correctAnswer,source:'opentdb',category:'General'}]}});
 const importCall=()=>review.POST(new Request('https://example.test/api/admin/question-review',{method:'POST',headers:{authorization:'Bearer token'},body:JSON.stringify({action:'import',provider:'opentdb',amount:1,saveToReserve:true})}));
 response=await importCall();assert.equal(response.status,200);const imported=(await response.json()).questions[0];assert.ok(imported.reserveId);assert.equal(stage.state.records[0].status,'pending');assert.equal(stage.state.records[0].level_id,levelId);
 stage.state.records[0].status='available';stage.state.records[0].explanation='Editor work';
 response=await importCall();assert.equal(response.status,200);assert.equal(stage.state.records.length,1);assert.equal(stage.state.records[0].explanation,'Editor work');assert.equal(stage.state.records[0].status,'available','reimport never overwrites approvals');
 console.log('Reserve admin API passed: admin access, review gates, canonical attribution, deduplication, optimistic concurrency, filters, migration errors and automatic staging without overwriting editorial work.');
})().catch(error=>{console.error(error);process.exitCode=1;});
