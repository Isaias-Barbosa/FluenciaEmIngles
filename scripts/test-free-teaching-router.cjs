const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(path,deps={},globals={}){const c={exports:{},Error,URL,AbortSignal,Headers,Date,...globals,require:name=>{if(name in deps)return deps[name];throw Error(name);}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,c);return c.exports;}
const question={level:'A1',prompt:'Which word is used to greet someone?',choices:['Hello','Goodbye','Cold','Blue'],correctAnswer:'Hello'};
const good={explanation:'Hello é uma saudação usada para iniciar uma conversa em inglês.',hint:'Pense na expressão usada ao encontrar alguém.',needsReview:false,reviewNote:''};
const env={OPENAI_API_KEY:'must-never-use',GEMINI_API_KEY:'g',GEMINI_FREE_TIER_CONFIRMED:'true',GROQ_API_KEY:'q',GROQ_FREE_TIER_CONFIRMED:'true',OPENROUTER_API_KEY:'o',CLOUDFLARE_AI_API_TOKEN:'c',CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_FREE_TIER_CONFIRMED:'true'};
(async()=>{
 let behavior='ok',status=200,retry='120',calls=[],body,output=good;
 const adapter=load('lib/admin/free-teaching-providers.ts',{}, {process:{env},fetch:async(url,options)=>{
  assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.ok(options.signal);calls.push(url);body=JSON.parse(options.body);
  assert.ok(!url.includes('api.openai.com'));assert.ok(!body.tools&&!body.plugins&&!body.models);
  if(behavior==='network')throw Error('network');
  const payload=status!==200?{error:{message:'secret error'}}:url.includes('googleapis')?{candidates:[{finishReason:behavior==='truncated'?'MAX_TOKENS':'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]}:url.includes('cloudflare')?{success:true,result:{response:output}}:{choices:[{finish_reason:behavior==='truncated'?'length':'stop',message:{content:JSON.stringify(output)}}]};
  return new Response(JSON.stringify(payload),{status,headers:{'retry-after':retry}});
 }});
 assert.equal(adapter.configuredFreeProviders({OPENAI_API_KEY:'x'}).length,0);
 assert.equal(adapter.configuredFreeProviders({GEMINI_API_KEY:'g',GROQ_API_KEY:'q',CLOUDFLARE_AI_API_TOKEN:'c',CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32)}).length,0,'free plan confirmation mandatory');
 assert.equal(adapter.configuredFreeProviders({...env,CLOUDFLARE_ACCOUNT_ID:'../../evil'}).length,3);
 const providers=adapter.configuredFreeProviders(env);assert.equal(providers.length,4);
 for(const provider of providers){assert.equal(JSON.stringify(await adapter.requestTeachingNotes(provider,question,AbortSignal.timeout(1000))),JSON.stringify(good));if(provider.id==='openrouter')assert.equal(body.model,'openrouter/free');if(provider.id==='groq')assert.equal(body.response_format.json_schema.strict,true);if(provider.id==='gemini')assert.equal(body.generationConfig.responseFormat.text.mimeType,'APPLICATION_JSON');}
 assert.equal(adapter.retryDelay(new Headers({'retry-after':'91'}),null),91);
 const now=Date.now();assert.equal(adapter.retryDelay(new Headers({'retry-after':new Date(now+90000).toUTCString()}),null,Math.floor(now/1000)*1000),90);
 assert.equal(adapter.retryDelay(new Headers(),{error:{details:[{retryDelay:'12.5s'}]}}),13);assert.equal(adapter.retryDelay(new Headers(),null),900);
 behavior='truncated';await assert.rejects(adapter.requestTeachingNotes(providers[0],question,AbortSignal.timeout(1000)),error=>error instanceof adapter.ProviderFailure);behavior='network';await assert.rejects(adapter.requestTeachingNotes(providers[1],question,AbortSignal.timeout(1000)));behavior='ok';status=429;
 await assert.rejects(adapter.requestTeachingNotes(providers[0],question,AbortSignal.timeout(1000)),error=>error.cooldownSeconds===120&&error.limited);status=401;
 await assert.rejects(adapter.requestTeachingNotes(providers[1],question,AbortSignal.timeout(1000)),error=>error.cooldownSeconds===3600&&!error.limited);status=200;
 const notes=load('lib/admin/teaching-notes.ts');
 const router=load('lib/admin/free-teaching-router.ts',{'./free-teaching-providers':adapter,'./teaching-notes':notes},{process:{env}});
 let eligible=['gemini','groq','openrouter','cloudflare'],finishes=[],claims=0,claimFailure=false,finishFailure=false;
 const client={rpc:async(name,args)=>{
  if(name==='claim_teaching_provider'){
   claims++;if(claimFailure)return {error:Error('DB'),data:null};
   assert.ok(args.p_daily_limit===100&&args.p_minute_limit===2);
   const id=eligible.find(id=>!args.p_exclude.includes(id));return {error:null,data:id?{provider:id,lease_id:'lease-'+id}:null};
  }
  assert.equal(name,'finish_teaching_provider');finishes.push(args);return {error:finishFailure?Error('DB'):null,data:!finishFailure};
 }};
 // The second provider succeeds after the first reaches its limit; the cooldown persists.
 const requests=adapter.requestTeachingNotes;let first=true;
 adapter.requestTeachingNotes=async(...args)=>{if(first){first=false;throw new adapter.ProviderFailure(3600,true);}return requests(...args);};
 calls=[];finishes=[];let result=await router.generateTeachingNotes(question,client);assert.equal(result.provider,'Groq');assert.equal(finishes.length,2);assert.equal(finishes[0].p_cooldown_seconds,3600);assert.equal(finishes[1].p_cooldown_seconds,0);
 eligible=['groq','openrouter','cloudflare'];finishes=[];await router.generateTeachingNotes(question,client);assert.equal(finishes[0].p_provider,'groq','simulated shared database skips cooled provider');
 adapter.requestTeachingNotes=requests;
 eligible=['gemini','groq','openrouter','cloudflare'];calls=[];finishes=[];status=429;await assert.rejects(router.generateTeachingNotes(question,client),error=>error.status===429);assert.equal(calls.length,4);assert.equal(new Set(calls).size,4);assert.ok(finishes.every(item=>item.p_cooldown_seconds===120));status=200;
 calls=[];eligible=[];await assert.rejects(router.generateTeachingNotes(question,client),error=>error.status===429);assert.equal(calls.length,0);
 eligible=['gemini','groq'];output={...good,needsReview:true,reviewNote:'Gabarito ambíguo.'};finishes=[];await assert.rejects(router.generateTeachingNotes(question,client),error=>error.status===422);assert.equal(finishes.length,1);assert.equal(finishes[0].p_cooldown_seconds,0);
 output={...good,hint:'Use Hello como saudação.'};finishes=[];await assert.rejects(router.generateTeachingNotes(question,client),error=>error.status===422);assert.equal(finishes.length,1);
 output={...good,explanation:'bad'};finishes=[];await assert.rejects(router.generateTeachingNotes(question,client),error=>error.status===503);assert.equal(finishes.length,2);assert.ok(finishes.every(item=>item.p_cooldown_seconds===60));output=good;
 behavior='network';finishes=[];await assert.rejects(router.generateTeachingNotes(question,client),error=>error.status===503);assert.equal(finishes.length,2);behavior='ok';
 claimFailure=true;calls=[];await assert.rejects(router.generateTeachingNotes(question,client),error=>error.status===503);assert.equal(calls.length,0);claimFailure=false;
 finishFailure=true;calls=[];await assert.rejects(router.generateTeachingNotes(question,client),error=>error.status===503);assert.equal(calls.length,1,'coordination failure stops further network calls');finishFailure=false;
 await assert.rejects(router.generateTeachingNotes(question,null),error=>error.status===503);
 for(const key of Object.keys(env))delete env[key];env.OPENAI_API_KEY='never-fallback';calls=[];await assert.rejects(router.generateTeachingNotes(question,client),/provedor gratuito/);assert.equal(calls.length,0);
 console.log('Free teaching router passed: four adapters, fixed free models, opt-in, failover, Retry-After, pauses, exhaustion, network failure, output checks, review stop, database failures and no paid fallback.');
})().catch(error=>{console.error(error);process.exitCode=1;});
