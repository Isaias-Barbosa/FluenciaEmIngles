const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const context=vm.createContext({exports:{}});
vm.runInContext(ts.transpileModule(fs.readFileSync('lib/quiz/vocabulary.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
const {vocabulary,makeVocabularyRound,quizReducer,initialQuizState,readQuizStats}=context.exports;
assert.equal(vocabulary.length,90);
for(const level of ['A1','A2','B1','B2','C1','C2']){
 assert.equal(vocabulary.filter(row=>row.level===level).length,15);
 const round=makeVocabularyRound(level);
 assert.equal(round.length,10);assert.equal(new Set(round.map(row=>row.id)).size,10);
 for(const row of round){assert.equal(row.level,level);assert.equal(row.options.length,4);assert.equal(new Set(row.options).size,4);assert.equal(row.options.filter(value=>value===row.meaning).length,1);assert.ok(row.example&&row.translation);}
}
const layouts=new Set();for(let i=0;i<20;i++)layouts.add(makeVocabularyRound('B1').map(row=>row.id+':'+row.options.indexOf(row.meaning)).join(','));assert.ok(layouts.size>1,'new rounds and option positions are shuffled');
let state=quizReducer(initialQuizState,{type:'start',round:makeVocabularyRound('A1')});
assert.equal(quizReducer(state,{type:'check'}),state,'no blank answer');
assert.equal(quizReducer(state,{type:'next'}),state,'must check before advancing');
assert.equal(quizReducer(state,{type:'select',value:'not an option'}),state);
for(let i=0;i<10;i++){
 const question=state.round[state.index];
 const selected=i%2===0?question.meaning:question.options.find(option=>option!==question.meaning);
 state=quizReducer(state,{type:'select',value:selected});state=quizReducer(state,{type:'check'});
 assert.equal(quizReducer(state,{type:'check'}),state,'double click never duplicates credit');
 assert.equal(quizReducer(state,{type:'select',value:question.meaning}),state,'checked answer cannot be changed');
 state=quizReducer(state,{type:'next'});
}
assert.equal(state.phase,'finished');assert.equal(state.answers.length,10);assert.equal(state.answers.filter(answer=>answer.correct).length,5);
assert.equal(quizReducer(state,{type:'next'}),state);assert.equal(quizReducer(state,{type:'reset'}).phase,'idle');
assert.deepEqual(JSON.parse(JSON.stringify(readQuizStats('{bad'))),{});
assert.deepEqual(JSON.parse(JSON.stringify(readQuizStats('{"A1":{"rounds":2,"best":7,"last":5},"C2":{"rounds":-1,"best":999,"last":0}}'))),{A1:{rounds:2,best:7,last:5}});
console.log('Vocabulary quiz passed: 90 contextual entries, 6 levels, 10 unique questions, 4 distinct options, shuffled rounds, one score per answer, results/reset and invalid history recovery.');

// Exercise the actual client handlers and effects with a deterministic hook runtime.
const source=ts.transpileModule(fs.readFileSync('app/learn/components/vocabulary-quiz.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const progressContext=vm.createContext({exports:{},require:name=>{if(name==='@/lib/cefr/types')return {cefrLevels:['A1','A2','B1','B2','C1','C2']};throw Error(name);}});
vm.runInContext(ts.transpileModule(fs.readFileSync('lib/quiz/progress.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,progressContext);
const store=new Map();
function client(blockStorage=false){
 const slots=[],dependencies=[];let cursor=0,dirty=false,effects=[],tree;
 const hooks={useState(initial){const index=cursor++;if(!(index in slots))slots[index]=typeof initial==='function'?initial():initial;return [slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;dirty=true;}];},useReducer(reducer,initial){const [value,set]=hooks.useState(initial);return [value,action=>set(previous=>reducer(previous,action))];},useRef(initial){const index=cursor++;if(!(index in slots))slots[index]={current:initial};return slots[index];},useEffect(callback,deps){const index=cursor++;if(!dependencies[index]||deps.some((value,i)=>value!==dependencies[index][i])){dependencies[index]=deps;effects.push(callback);}}};
 const jsx=(type,props)=>({type,props:props||{}});
 const c=vm.createContext({exports:{},window:new EventTarget(),Event,localStorage:{getItem:key=>{if(blockStorage)throw Error('blocked');return store.get(key)||null;},setItem:(key,value)=>{if(blockStorage)throw Error('blocked');store.set(key,value);}},require:name=>{
  if(name==='react')return hooks;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name==='@/lib/cefr/types')return {cefrLevels:['A1','A2','B1','B2','C1','C2']};if(name==='@/lib/quiz/vocabulary')return context.exports;if(name==='@/lib/quiz/progress')return progressContext.exports;if(name==='./use-answer-sounds')return {useAnswerSounds:()=>({enabled:false,prepare(){},play(){},toggle(){}})};throw Error(name);
 }});vm.runInContext(source,c);
 function render(){let loops=0;do{dirty=false;cursor=0;effects=[];tree=c.exports.default({userId:'learner-1',initialLevel:'A1'});const queued=effects;queued.forEach(effect=>effect());if(++loops>10)throw Error('Render loop');}while(dirty);}
 function nodes(node=tree,result=[]){if(Array.isArray(node))node.forEach(item=>nodes(item,result));else if(node&&typeof node==='object'){result.push(node);if(node.props?.children!==undefined)nodes(node.props.children,result);}return result;}
 const content=node=>!node?'':typeof node==='string'?node:Array.isArray(node)?node.map(content).join(''):content(node.props?.children);
 const button=label=>nodes().find(node=>node.type==='button'&&content(node).startsWith(label));
 render();return {render,button,nodes,content,slots};
}
const ui=client();ui.button('Começar quiz').props.onClick();ui.render();
assert.ok(ui.button('Conferir resposta').props.disabled);
for(let i=0;i<10;i++){
 const current=ui.slots.find(value=>value?.phase==='playing');const item=current.round[current.index];
 const option=ui.nodes().find(node=>node.type==='button'&&node.props.className?.includes('answer-option')&&ui.content(node).includes(item.meaning));
 option.props.onClick();ui.render();ui.button('Conferir resposta').props.onClick();ui.render();
 assert.ok(ui.nodes().some(node=>node.props.role==='status'&&ui.content(node).includes(item.translation)),'feedback includes translation');
 (ui.button('Próxima palavra')||ui.button('Ver resultado')).props.onClick();ui.render();
}
assert.equal(JSON.parse(store.get('fluencia-vocabulary-quiz-v1:learner-1')).A1.best,10);
assert.equal(JSON.parse(store.get('fluencia-vocabulary-quiz-v1:learner-1')).A1.rounds,1,'persist completed round once');
ui.render();assert.equal(JSON.parse(store.get('fluencia-vocabulary-quiz-v1:learner-1')).A1.rounds,1);
ui.button('Jogar novamente').props.onClick();ui.render();ui.button('Encerrar rodada').props.onClick();ui.render();assert.equal(JSON.parse(store.get('fluencia-vocabulary-quiz-v1:learner-1')).A1.rounds,1,'abandoned round is not recorded');
const restored=client();assert.equal(restored.slots.find(value=>value?.A1?.best===10).A1.rounds,1,'completed results restored per user');
const blocked=client(true);assert.ok(blocked.nodes().some(node=>node.props.role==='status'&&blocked.content(node).includes('não permitiu salvar')));
console.log('Quiz client passed: answer feedback/translation, complete round, one persisted result, replay, abandoned round, history reload and blocked storage.');
