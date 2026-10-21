const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function runtime(){let slots=[],deps=[],effects=[],cleanups=[],cursor=0;return {hooks:{useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useEffect(fn,values){const i=cursor++;if(!deps[i]||values.some((v,j)=>v!==deps[i][j])){deps[i]=values;effects.push(()=>{cleanups[i]?.();cleanups[i]=fn();});}}},render(fn){cursor=0;const result=fn();effects.splice(0).forEach(fn=>fn());return result;},cleanup(){cleanups.forEach(fn=>fn?.());}};}
function load(path,deps){const context={exports:{},Error,Object,crypto:require('node:crypto'),require:name=>{if(name in deps)return deps[name];throw Error(name);}};vm.runInNewContext(compile(path),context);return context.exports;}
(async()=>{
 const initial={id:'run',user_id:'one',lesson_id:'lesson',question_ids:['a','b','c','d','e'],answers:[],passed:false,finished_at:null};
 let stored=structuredClone(initial),fail=false,calls=0,resolveDelayed,conflict=false;
 const client={rpc:async(name,args)=>{
  calls++;if(fail)return {error:{}};
  if(name==='start_lesson_run')return {data:structuredClone(stored),error:null};
  if(conflict)return {data:null,error:{code:'40001'}};
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
 stored.attempts=[{question_id:'c',attempt_number:1,is_correct:false}];conflict=true;assert.equal(await view().answer('c','wrong'),null);assert.equal(view().run.attempts.length,1);assert.match(view().error,/outra aba/);conflict=false;
 resolveDelayed=true;const old=view().answer('c','correct');assert.equal(view('two').run,null);resolveDelayed({data:{...initial,answers:[{question_id:'c',is_correct:true}]},error:null});await old;assert.equal(view('two').run,null,'stale response cannot populate another account');rt.cleanup();
 const lessonHelpers=load('lib/learning/lesson-run.ts',{});
 const score=lessonHelpers.lessonRunScore({...initial,answers:[{is_correct:true},{is_correct:false},{is_correct:true},{is_correct:false},{is_correct:true}]});assert.equal(score.correct,3);assert.equal(score.incorrect,2);assert.equal(score.required,3);
 const progress=load('lib/quiz/progress.ts',{'@/lib/cefr/types':{cefrLevels:['A1','A2','B1','B2','C1','C2']}}).summarizeLearning;
 const lessons=[{id:'lesson',level:'A1',questions:initial.question_ids.map(id=>({id}))}];
 assert.equal(progress(lessons,['a','b','c'],['lesson'])[0].completedLessons,1,'3/5 passed round completes the lesson');
 assert.equal(progress(lessons,initial.question_ids,[])[0].completedLessons,0,'cumulative correct answers cannot bypass round approval');
 const source=fs.readFileSync('app/learn/page.tsx','utf8');const fragment=source.slice(source.indexOf('  async function submitAnswer()'),source.indexOf('  async function saveProfileDetails'));
 const state={selected:'wrong',profile:{userId:'one',completedQuestionIds:['a','b','c','d','e'],completedLessons:[],lessonResults:{}},saving:false};let response={...initial,answers:[{question_id:'a',is_correct:false}]},resolveAnswer;
 const ctx={profile:state.profile,activeQuestion:{id:'a'},selectedAnswer:'wrong',answerPending:{current:false},replacementPending:{current:false},currentUserId:{current:'one'},answerSounds:{prepare(){},play(type){state.sound=type;}},setAnswerSaving:value=>state.saving=value,setSelectedAnswer:value=>state.selected=value,setAudioSessionNotice(){},setProfile:update=>state.profile=update(state.profile),round:{answer:async()=>response},lessonRunScore:lessonHelpers.lessonRunScore,Set};
 vm.runInNewContext(ts.transpileModule(fragment,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,ctx);
 await ctx.submitAnswer();assert.equal(state.sound,'incorrect');assert.equal(state.selected,'','previously correct questions are answered again in a fresh attempt');assert.equal(state.profile.completedLessons.length,0);
 response={...initial,attempts:[{question_id:'a',submitted_answer:'wrong',is_correct:false,attempt_number:1,attempt_limit:2,hint:'Think about it.'}],answers:[]};state.selected='wrong';await ctx.submitAnswer();assert.equal(state.sound,'incorrect');assert.equal(state.selected,'','an intermediate error clears the input without advancing');assert.equal(state.profile.completedLessons.length,0);assert.equal(Object.keys(state.profile.lessonResults).length,0,'an intermediate error does not create a final score');
 response={...initial,passed:true,finished_at:'2026-10-21T12:00:00Z',answers:initial.question_ids.map((id,index)=>({question_id:id,is_correct:index%2===0}))};await ctx.submitAnswer();assert.equal(state.profile.completedLessons[0],'lesson');
 assert.equal(state.profile.lessonResults.lesson.correct,3);assert.equal(state.profile.lessonResults.lesson.incorrect,2);assert.equal(state.profile.completedQuestionIds.length,5,'cumulative history remains distinct from this attempt');
 const failed={...response,answers:initial.question_ids.map((id,index)=>({question_id:id,is_correct:index<2})),passed:false};
 const oldPerfect={...response,answers:initial.question_ids.map(id=>({question_id:id,is_correct:true})),finished_at:'2026-10-20T12:00:00Z'};
 const abandoned={...response,answers:response.answers.slice(0,2),finished_at:'2026-10-22T12:00:00Z'};
 const unfinished={...response,finished_at:null};
 const restored=lessonHelpers.latestLessonResults([abandoned,unfinished,response,oldPerfect]);
 assert.equal(restored.lesson.correct,3);assert.equal(restored.lesson.incorrect,2);
 assert.match(lessonHelpers.lessonResultLabel(lessons[0],restored.lesson),/3\/5 acertos · 2 erros/);
 assert.equal(lessonHelpers.latestLessonResults([failed,oldPerfect]).lesson.correct,2,'failed attempt keeps actual score');
 assert.equal(Object.keys(lessonHelpers.latestLessonResults([{...response,answers:[...response.answers.slice(0,4),response.answers[0]]}])).length,0,'duplicate answer IDs cannot fabricate a result');
 assert.doesNotMatch(lessonHelpers.lessonResultLabel(lessons[0]),/5\/5/,'no invented score for lessons without a complete attempt');
 // Render the actual content/home cards after closing and after restoring the saved score.
 const jsx=(type,props)=>({type,props:props||{}}),text=node=>node==null?'':typeof node==='string'||typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(''):text(node.props?.children);
 const cardContext={exports:{},useState:value=>[value,()=>{}],useEffect:()=>{},lessonResultLabel:lessonHelpers.lessonResultLabel,promotionProgress:()=>({completed:5,required:3,eligible:true}),levels:['A1','A2','B1','B2','C1','C2'].map(id=>({id,name:id,subtitle:id})),require:name=>{if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};throw Error(name);}};
 const cardsSource=source.slice(source.indexOf('function HomePage('),source.indexOf('function VideoPlayerModal('));
 vm.runInNewContext(ts.transpileModule(cardsSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,cardContext);
 const cardLesson={...lessons[0],title:'Practice',description:'Learn English',category:'Vocabulary',duration:5};
 for(const results of [state.profile.lessonResults,restored]){
   const profile={...state.profile,name:'Student',level:'A1',goal:'Travel',dailyMinutes:20,lessonResults:results};
   const content=text(cardContext.LessonsPage({profile,lessons:[cardLesson],videos:[]}));
   const home=text(cardContext.HomePage({profile,lessons:[cardLesson],progressPercent:100,completedInLevel:1,levelIndex:0,nextLesson:cardLesson}));
   for(const rendered of [content,home]){assert.match(rendered,/Última tentativa: 3\/5 acertos · 2 erros/);assert.doesNotMatch(rendered,/5 de 5 questões|5\/5 acertos/);}
 }

 state.selected='keep draft';response=null;await ctx.submitAnswer();assert.equal(state.selected,'keep draft','network failure keeps selected answer');assert.equal(state.saving,false);
 console.log('Lesson run UI passed: incorrect advance, reload/resume, failed save, double-click guard, account changes, 3/5 score, historical answers remain playable and pass-only completion.');
})().catch(error=>{console.error(error);process.exitCode=1;});
