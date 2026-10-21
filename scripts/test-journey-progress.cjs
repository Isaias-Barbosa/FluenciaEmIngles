const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const cefrLevels=['A1','A2','B1','B2','C1','C2'];
const core=vm.createContext({exports:{},require:name=>{if(name==='@/lib/cefr/types')return {cefrLevels};throw Error(name);}});vm.runInContext(compile('lib/quiz/progress.ts'),core);
const {summarizeQuizHistory,summarizeLearning,quizHistoryKey,quizHistoryEvent}=core.exports;
const stats={A1:{rounds:2,best:8,last:6},B1:{rounds:1,best:9,last:9}};
assert.deepEqual(JSON.parse(JSON.stringify(summarizeQuizHistory(stats))),{rounds:3,questions:30,practicedLevels:2,best:9});
assert.equal(summarizeQuizHistory({}).best,null);assert.equal(summarizeQuizHistory({A1:{rounds:0,best:5,last:5}}).rounds,0);
assert.notEqual(quizHistoryKey('one'),quizHistoryKey('two'));
const lessons=[{id:'a',level:'A1',questions:[{id:'q1'},{id:'q2'}]},{id:'a',level:'A1',questions:[{id:'q1'},{id:'q2'}]},{id:'b',level:'A1',questions:[{id:'q2'},{id:'q3'}]},{id:'empty',level:'A1',questions:[]}];
const learning=summarizeLearning(lessons,['q1','q2','q2','unknown']);
assert.equal(learning.length,6);assert.equal(learning[0].totalQuestions,3);assert.equal(learning[0].completedQuestions,2);assert.equal(learning[0].percent,67);assert.equal(learning[0].completedLessons,1);assert.equal(learning[0].totalLessons,3);assert.equal(learning[5].percent,0);

// The hook uses the same v1 storage key as existing quizzes and reacts to real events.
const store=new Map([[quizHistoryKey('one'),JSON.stringify(stats)]]);let blocked=false,reads=0;const window=new EventTarget();
const vocabulary=vm.createContext({exports:{},require:name=>{if(name==='./data/tatoeba.json')return {default:require('../lib/quiz/data/tatoeba.json')};throw Error(name);}});vm.runInContext(compile('lib/quiz/vocabulary.ts'),vocabulary);
let slots=[],deps=[],cleanups=[],cursor=0,pending=[];
const hooks={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>slots[i]=value];},useEffect(fn,values){const i=cursor++;if(!deps[i]||values.some((v,j)=>v!==deps[i][j])){deps[i]=values;pending.push(()=>{cleanups[i]?.();cleanups[i]=fn();});}}};
const context=vm.createContext({exports:{},window,localStorage:{getItem:key=>{reads++;if(blocked)throw Error('blocked');return store.get(key)||null;}},require:name=>{
 if(name==='react')return hooks;if(name==='@/lib/quiz/vocabulary')return vocabulary.exports;if(name==='@/lib/quiz/progress')return core.exports;throw Error(name);
}});vm.runInContext(compile('app/learn/components/use-quiz-history.ts'),context);
function render(user,flush=true){cursor=0;const result=context.exports.useQuizHistory(user);if(flush){const run=pending;pending=[];run.forEach(fn=>fn());}return result;}
assert.equal(render('one').ready,false);assert.equal(render('one').stats.A1.rounds,2,'restore historical v1 data');
store.set(quizHistoryKey('one'),JSON.stringify({A1:{rounds:3,best:8,last:7}}));window.dispatchEvent(new Event(quizHistoryEvent));assert.equal(render('one').stats.A1.rounds,3,'update same-page cards immediately');
const before=reads;const unrelated=new Event('storage');Object.defineProperty(unrelated,'key',{value:'other-key'});window.dispatchEvent(unrelated);assert.equal(reads,before);
assert.equal(render('two',false).ready,false,'hide prior account before effect');pending.splice(0).forEach(fn=>fn());assert.deepEqual(JSON.parse(JSON.stringify(render('two').stats)),{});
store.set(quizHistoryKey('two'),JSON.stringify({C2:{rounds:1,best:10,last:10}}));const external=new Event('storage');Object.defineProperty(external,'key',{value:quizHistoryKey('two')});window.dispatchEvent(external);assert.equal(render('two').stats.C2.rounds,1);
blocked=true;window.dispatchEvent(new Event('focus'));assert.equal(render('two').unavailable,true);cleanups.forEach(fn=>fn?.());

// Test the actual form handlers without a backend or a browser.
const page=fs.readFileSync('app/learn/page.tsx','utf8');const fragment=page.slice(page.indexOf('function ProfilePage('),page.indexOf('function PromotionExamPage('));
const jsx=(type,props)=>({type,props:props||{}});slots=[];cursor=0;let calls=0,saveError=false,payload;
const formHooks={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];}};
const profile={userId:'one',name:'Student',email:'student@example.test',level:'C1',levelTitle:'Advanced',dailyMinutes:20,goal:'Conversar em viagens',completedQuestionIds:['q1','q2','q2'],completedLessons:['a']};
const sandbox=vm.createContext({exports:{},...formHooks,Error,summarizeLearning,summarizeQuizHistory,useQuizHistory:()=>({stats,ready:true,unavailable:false}),FeedbackForm:()=>{},JourneyMetric:()=>{},QuizHistoryPanel:()=>{},levels:cefrLevels.map(id=>({id,name:id,subtitle:id})),goals:['Conversar em viagens','Aprender por prazer'],require:name=>{if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};throw Error(name);}});
vm.runInContext(ts.transpileModule(fragment,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,sandbox);
let tree;const props={profile,levelIndex:4,lessons,onSave:async(...values)=>{calls++;payload=values;if(saveError)throw Error('Falha ao salvar.');},onPage:()=>{}};
function view(){cursor=0;tree=sandbox.ProfilePage(props);}
function nodes(node=tree,result=[]){if(Array.isArray(node))node.forEach(child=>nodes(child,result));else if(node&&typeof node==='object'){result.push(node);if(node.props.children!==undefined)nodes(node.props.children,result);}return result;}
const text=node=>!node?'':typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):text(node.props?.children);
const input=id=>nodes().find(node=>node.props.id===id);
const button=label=>nodes().find(node=>node.type==='button'&&text(node).startsWith(label));
const change=(id,value)=>{input(id).props.onChange({target:{value}});view();};
(async()=>{
 view();assert.equal(input('profile-email').props.readOnly,true);assert.equal(button('Salvar alterações').props.disabled,true);
 change('profile-name','  ');await nodes().find(node=>node.type==='form').props.onSubmit({preventDefault(){}});view();assert.equal(calls,0);assert.ok(nodes().some(node=>node.props.role==='alert'));
 change('profile-name','  Updated Student  ');change('profile-goal','Aprender por prazer');change('profile-minutes','30');
 await Promise.all([nodes().find(node=>node.type==='form').props.onSubmit({preventDefault(){}}),nodes().find(node=>node.type==='form').props.onSubmit({preventDefault(){}})]);view();assert.equal(calls,1);assert.deepEqual(payload,['Updated Student','Aprender por prazer',30]);assert.ok(nodes().some(node=>node.props.role==='status'&&text(node).includes('salvas')));
 button('Desfazer alterações').props.onClick();view();assert.equal(input('profile-name').props.value,'Student');assert.equal(input('profile-minutes').props.value,20);
 saveError=true;change('profile-name','Failed Student');await nodes().find(node=>node.type==='form').props.onSubmit({preventDefault(){}});view();assert.ok(nodes().some(node=>node.props.role==='alert'&&text(node).includes('Falha ao salvar')));assert.equal(input('profile-name').props.value,'Failed Student');
 cursor=0;tree=sandbox.ProgressPage({...props,canTakePromotionExam:false});const metrics=nodes().filter(node=>node.type===sandbox.JourneyMetric);assert.equal(metrics.find(node=>node.props.label==='Quizzes concluídos').props.value,3);assert.equal(metrics.find(node=>node.props.label==='Perguntas no Quiz').props.value,30);
 console.log('Journey checks passed: legacy quiz totals, repeated practice vs unique words, unique lesson/question progress, live events, account isolation, storage failure, profile validation/save/reset/errors and progress cards.');
})().catch(error=>{console.error(error);process.exitCode=1;});
