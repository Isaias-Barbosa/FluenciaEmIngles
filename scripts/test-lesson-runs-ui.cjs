const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function runtime(){let slots=[],deps=[],effects=[],cleanups=[],cursor=0;return {hooks:{useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useEffect(fn,values){const i=cursor++;if(!deps[i]||values.some((v,j)=>v!==deps[i][j])){deps[i]=values;effects.push(()=>{cleanups[i]?.();cleanups[i]=fn();});}}},render(fn){cursor=0;const result=fn();effects.splice(0).forEach(fn=>fn());return result;},cleanup(){cleanups.forEach(fn=>fn?.());}};}
function load(path,deps){const context={exports:{},Error,Object,crypto:require('node:crypto'),require:name=>{if(name in deps)return deps[name];throw Error(name);}};vm.runInNewContext(compile(path),context);return context.exports;}
(async()=>{
 const initial={id:'run',user_id:'one',lesson_id:'lesson',question_ids:['a','b','c','d','e'],answers:[],passed:false,finished_at:null};
 let stored=structuredClone(initial),fail=false,calls=0,resolveDelayed;
 const client={rpc:async(name,args)=>{
  calls++;if(fail)return {error:{}};
  if(name==='start_lesson_run')return {data:structuredClone(stored),error:null};
  if(resolveDelayed)return await new Promise(resolve=>resolveDelayed=resolve);
  const correct=args.p_submitted_answer==='correct';stored.answers.push({question_id:args.p_question_id,is_correct:correct,submitted_answer:args.p_submitted_answer,correct_answer:'correct',explanation:'Explanation'});
  return {data:structuredClone(stored),error:null};
 }};
 const rt=runtime(),hook=load('app/learn/components/use-lesson-run.ts',{'react':rt.hooks,'@/lib/supabase/client':{supabase:client}}).useLessonRun;
 const view=(user='one')=>rt.render(()=>hook(user));view();await view().start('lesson');assert.equal(view().run.answers.length,0);
 await view().answer('a','wrong');assert.equal(view().run.answers.length,1);assert.equal(view().run.answers[0].is_correct,false,'wrong response advances round');
 fail=true;const before=calls;assert.equal(await view().answer('b','correct'),null);assert.equal(view().run.answers.length,1);assert.match(view().error,/não foi pulada/);fail=false;
 const pending=view().answer('b','correct');assert.equal(await view().answer('b','correct'),null);await pending;assert.equal(calls,before+2,'one request for the successful double click');
 view().cancel();assert.equal(view().run,null);await view().start('lesson');assert.equal(view().run.answers.length,2,'reopen restores saved attempt');
 resolveDelayed=true;const old=view().answer('c','correct');assert.equal(view('two').run,null);resolveDelayed({data:{...initial,answers:[{question_id:'c',is_correct:true}]},error:null});await old;assert.equal(view('two').run,null,'stale response cannot populate another account');rt.cleanup();
 const score=load('lib/learning/lesson-run.ts',{}).lessonRunScore({...initial,answers:[{is_correct:true},{is_correct:false},{is_correct:true},{is_correct:false},{is_correct:true}]});assert.equal(score.correct,3);assert.equal(score.incorrect,2);assert.equal(score.required,3);
 const progress=load('lib/quiz/progress.ts',{'@/lib/cefr/types':{cefrLevels:['A1','A2','B1','B2','C1','C2']}}).summarizeLearning;
 const lessons=[{id:'lesson',level:'A1',questions:initial.question_ids.map(id=>({id}))}];
 assert.equal(progress(lessons,['a','b','c'],['lesson'])[0].completedLessons,1,'3/5 passed round completes the lesson');
 assert.equal(progress(lessons,initial.question_ids,[])[0].completedLessons,0,'cumulative correct answers cannot bypass round approval');
 const source=fs.readFileSync('app/learn/page.tsx','utf8');const fragment=source.slice(source.indexOf('  async function submitAnswer()'),source.indexOf('  async function saveProfileDetails'));
 const state={selected:'wrong',profile:{userId:'one',completedQuestionIds:['a'],completedLessons:[]},saving:false};let response={...initial,answers:[{question_id:'a',is_correct:false}]},resolveAnswer;
 const ctx={profile:state.profile,activeQuestion:{id:'a'},selectedAnswer:'wrong',answerPending:{current:false},replacementPending:{current:false},currentUserId:{current:'one'},answerSounds:{prepare(){},play(type){state.sound=type;}},setAnswerSaving:value=>state.saving=value,setSelectedAnswer:value=>state.selected=value,setAudioSessionNotice(){},setProfile:update=>state.profile=update(state.profile),round:{answer:async()=>response},Set};
 vm.runInNewContext(ts.transpileModule(fragment,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,ctx);
 await ctx.submitAnswer();assert.equal(state.sound,'incorrect');assert.equal(state.selected,'','previously correct questions are answered again in a fresh attempt');assert.equal(state.profile.completedLessons.length,0);
 response={...initial,passed:true,finished_at:'now',answers:[{question_id:'a',is_correct:true}]};await ctx.submitAnswer();assert.equal(state.profile.completedLessons[0],'lesson');
 state.selected='keep draft';response=null;await ctx.submitAnswer();assert.equal(state.selected,'keep draft','network failure keeps selected answer');assert.equal(state.saving,false);
 console.log('Lesson run UI passed: incorrect advance, reload/resume, failed save, double-click guard, account changes, 3/5 score, historical answers remain playable and pass-only completion.');
})().catch(error=>{console.error(error);process.exitCode=1;});
