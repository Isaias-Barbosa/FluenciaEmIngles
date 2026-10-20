const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compile = text => ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const helper = vm.createContext({exports:{},URL});
vm.runInContext(compile(fs.readFileSync('lib/learning/web-question.ts','utf8')),helper);
const page = fs.readFileSync('app/learn/page.tsx','utf8');
const code = compile(page.slice(page.indexOf('  async function studyWithoutAudio()'),page.indexOf('  function openLesson(')));
function harness(fail=false) {
  const questions=Array.from({length:5},(_,i)=>({id:`q${i}`,type:i===2?'listening':'multiple_choice',audioUrl:i===2?'/audio.wav':null,prompt:`Question ${i}`,options:[],hint:null,passage:null}));
  const lesson={id:'original-lesson',level:'B1',questions};
  const state={lessons:[lesson],activeLesson:lesson,selected:'old',notice:'',muted:false,requests:0};
  const context=vm.createContext({AbortSignal,
    activeLesson:lesson,activeQuestion:questions[2],profile:{userId:'learner',completedQuestionIds:['q0','q1']},
    answerSaving:false,replacementPending:{current:false},currentUserId:{current:'learner'},activeQuestionId:{current:'q2'},
    answerSounds:{mute(){state.muted=true;}},supabase:{auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}},
    applyReplacement:helper.exports.applyReplacement,
    setReplacingAudio(value){state.busy=value;},setAudioSessionNotice(value){state.notice=value;},
    setLessons(update){state.lessons=update(state.lessons);},setActiveLesson(update){state.activeLesson=update(state.activeLesson);},
    setSelectedAnswer(value){state.selected=value;},setAnswerResult(){},setAnswerFeedback(){},setAnswerHint(){},setWrongAttempts(){},
    fetch:async(url,options)=>{state.requests++;state.body=JSON.parse(options.body);return {ok:!fail,json:async()=>fail?{error:'Search failed'}:{replacement:{question_id:'q2',prompt:'A new question from a web search.',choices:['a','b','c','d'],source_url:'https://cambridgeenglish.org/',source_title:'Cambridge English'}}};},
  });
  vm.runInContext(code,context);
  return {context,state,questions};
}
(async()=>{
  const h=harness();
  await Promise.all([h.context.studyWithoutAudio(),h.context.studyWithoutAudio()]);
  assert.equal(h.state.requests,1);
  assert.equal(h.state.body.questionId,'q2');
  assert.equal(h.state.muted,true);
  assert.equal(h.state.activeLesson.id,'original-lesson');
  assert.equal(h.state.activeLesson.questions.length,5);
  assert.deepEqual(h.state.activeLesson.questions.map(q=>q.id),h.questions.map(q=>q.id));
  assert.equal(h.state.activeLesson.questions[2].type,'multiple_choice');
  assert.equal(h.state.activeLesson.questions[1],h.questions[1],'other slots unchanged');
  assert.equal(h.state.lessons[0].questions[2].id,'q2','roadmap uses the same slot');
  assert.equal(h.context.profile.completedQuestionIds.length,2,'replacement alone never gives credit');
  const failure=harness(true);await failure.context.studyWithoutAudio();
  assert.equal(failure.state.activeLesson.questions[2].type,'listening');
  assert.equal(failure.state.notice,'Search failed');
  assert.equal(failure.state.busy,false);
  console.log('Student flow passed: single clicked slot, 5 stable IDs, progress preserved, concurrent-click guard and original retained on failure.');
})().catch(error=>{console.error(error);process.exitCode=1;});
