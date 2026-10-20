const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const compile = path => ts.transpileModule(fs.readFileSync(path,'utf8'), { compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020} }).outputText;
const shared = vm.createContext({exports:{}, URL});
vm.runInContext(compile('lib/learning/web-question.ts'),shared);
const id = '40000000-0000-4000-8000-000000000001';
const source = 'https://learnenglish.britishcouncil.org/grammar';
const question = {level:'B1',prompt:'Complete: If I ___ you, I would wait.',choices:['were','am','will be','be'],correct_option:0,explanation:'Use were.',hint:'Pense numa hipótese.',source_url:source,source_title:'British Council'};
function harness() {
  const state = {user:{id:'learner'}, saved:null, generations:0, reservations:0, reserveError:null, saveError:null, providerFails:false, search:true, finished:0};
  class NextResponse extends Response { static json(value,init) {return new Response(JSON.stringify(value),init);} }
  const query = () => ({ eq(){return this;}, async maybeSingle(){return {data:state.saved,error:null};} });
  const context = vm.createContext({exports:{},process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.test',NEXT_PUBLIC_SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server-secret',OPENAI_API_KEY:'openai-secret'}},AbortSignal,
    require(name) {
      if(name==='node:crypto')return crypto;
      if(name==='next/server')return {NextResponse};
      if(name==='@/lib/learning/web-question')return shared.exports;
      if(name==='@supabase/supabase-js')return {createClient:()=>({
        auth:{getUser:async()=>({data:{user:state.user},error:null})},
        rpc(name,args){
          if(name==='get_my_question_replacements')return query();
          if(name==='reserve_question_replacement_search'){state.reservations++;state.reservedArgs=args;return Promise.resolve({data:state.reserveError?null:[{request_id:'job',level_code:'B1',lesson_title:'Current lesson'}],error:state.reserveError});}
          if(name==='save_question_replacement'){
            state.saveArgs=args;
            if(!state.saveError)state.saved={question_id:id,prompt:args.p_prompt,choices:args.p_choices,source_url:args.p_source_url,source_title:args.p_source_title};
            return Promise.resolve({error:state.saveError});
          }
          throw new Error(name);
        },
        from(){return {update(){return {eq:async()=>{state.finished++;return {error:null};}};}};}
      })};
      throw new Error(name);
    },
    fetch:async(url,options)=>{state.generations++;state.providerRequest=JSON.parse(options.body);return new Response(JSON.stringify({status:'completed',output:[...(state.search?[{type:'web_search_call',status:'completed',action:{sources:[{url:source}]}}]:[]),{type:'message',content:[{type:'output_text',text:JSON.stringify(question)}]}]}),{status:state.providerFails?503:200});}
  });
  vm.runInContext(compile('app/api/question-replacement/route.ts'),context);
  const call = (body={questionId:id},token='Bearer test')=>context.exports.POST(new Request('https://example.test/api/question-replacement',{method:'POST',headers:token?{authorization:token}:{},body:JSON.stringify(body)}));
  return {state,context,call};
}
(async()=>{
  const h = harness();
  assert.equal((await h.call({},'')).status,401);
  h.state.user=null;assert.equal((await h.call()).status,401);h.state.user={id:'learner'};
  assert.equal((await h.call({questionId:'bad'})).status,400);
  const success=await h.call({questionId:id,level:'C2',correct_option:2});
  assert.equal(success.status,200);
  const body=await success.json();
  assert.equal(body.replacement.question_id,id);
  assert.equal('correct_option' in body.replacement,false);
  assert.equal(h.state.providerRequest.tool_choice,'required');
  assert.equal(h.state.providerRequest.input.includes('CEFR level: B1'),true,'trust server level, not request level');
  assert.equal(h.state.saveArgs.p_correct_option,0,'never trust client answer key');
  assert.equal(h.state.reservedArgs.p_user_id,'learner');
  assert.equal(h.state.finished,1);
  assert.equal((await h.call()).status,200);assert.equal(h.state.generations,1,'reuse saved question');
  const quota=harness();quota.state.reserveError={code:'54000'};
  assert.equal((await quota.call()).status,429);assert.equal(quota.state.generations,0);
  const failure=harness();failure.state.providerFails=true;
  assert.equal((await failure.call()).status,502);assert.equal(failure.state.saved,null);assert.equal(failure.state.finished,1);
  const noSearch=harness();noSearch.state.search=false;
  assert.equal((await noSearch.call()).status,502);assert.equal(noSearch.state.saved,null);
  const noSave=harness();noSave.state.saveError={message:'database unavailable'};
  assert.equal((await noSave.call()).status,502);assert.equal(noSave.state.saved,null);
  const noKey=harness();delete noKey.context.process.env.OPENAI_API_KEY;
  assert.equal((await noKey.call()).status,503);assert.equal(noKey.state.generations,0);
  console.log('Replacement API passed: authenticated user/current level, forced web search, private answer key, persistence-before-response, saved retry, quota and failure rollback.');
})().catch(error=>{console.error(error);process.exitCode=1;});
