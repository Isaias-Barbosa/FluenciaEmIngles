const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const imported=require('../lib/quiz/data/tatoeba.json');
const context=vm.createContext({exports:{},require:name=>{if(name==='./data/tatoeba.json')return {default:imported};throw Error(name);}});
vm.runInContext(ts.transpileModule(fs.readFileSync('lib/quiz/vocabulary.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
const {vocabulary,makeVocabularyRound,quizReducer,initialQuizState,readQuizStats}=context.exports;
assert.equal(vocabulary.length,610);
assert.equal(new Set(vocabulary.map(row=>row.id)).size,610);
assert.equal(new Set(vocabulary.map(row=>row.word.toLowerCase()+'|'+row.example.toLowerCase())).size,610);
assert.equal(new Set(vocabulary.map(row=>row.example)).size,610);
const totals={A1:102,A2:102,B1:102,B2:102,C1:101,C2:101};
assert.equal(require('node:crypto').createHash('sha256').update(JSON.stringify(vocabulary.slice(0,210))).digest('hex'),'354801eff0f5606077c06ed157cab32871f105a5b4c65a751790962400145c72','preserve every legacy question and ID');
for(const level of ['A1','A2','B1','B2','C1','C2']){
 assert.equal(vocabulary.filter(row=>row.level===level).length,totals[level]);
 for(const item of vocabulary.filter(row=>row.level===level)){assert.ok(item.word.trim()&&item.meaning.trim()&&item.example.trim()&&item.translation.trim());}
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
console.log('Vocabulary quiz passed: 610 contextual entries (400 from Tatoeba), 6 levels, 10 unique questions, 4 distinct options, shuffled rounds, one score per answer, results/reset and invalid history recovery.');

// Exercise the actual client handlers and effects with a deterministic hook runtime.
const source=ts.transpileModule(fs.readFileSync('app/learn/components/vocabulary-quiz.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const progressContext=vm.createContext({exports:{},require:name=>{if(name==='@/lib/cefr/types')return {cefrLevels:['A1','A2','B1','B2','C1','C2']};throw Error(name);}});
vm.runInContext(ts.transpileModule(fs.readFileSync('lib/quiz/progress.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,progressContext);
const store=new Map();
function client(blockStorage=false,userId='learner-1'){
 const slots=[],dependencies=[];let cursor=0,dirty=false,effects=[],tree;
 const hooks={useState(initial){const index=cursor++;if(!(index in slots))slots[index]=typeof initial==='function'?initial():initial;return [slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;dirty=true;}];},useReducer(reducer,initial){const [value,set]=hooks.useState(initial);return [value,action=>set(previous=>reducer(previous,action))];},useRef(initial){const index=cursor++;if(!(index in slots))slots[index]={current:initial};return slots[index];},useEffect(callback,deps){const index=cursor++;if(!dependencies[index]||deps.some((value,i)=>value!==dependencies[index][i])){dependencies[index]=deps;effects.push(callback);}}};
 const jsx=(type,props)=>({type,props:props||{}});
 const c=vm.createContext({exports:{},window:new EventTarget(),Event,localStorage:{getItem:key=>{if(blockStorage===true)throw Error('blocked');return store.get(key)||null;},setItem:(key,value)=>{if(blockStorage)throw Error('blocked');store.set(key,value);}},require:name=>{
  if(name==='react')return hooks;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name==='@/lib/cefr/types')return {cefrLevels:['A1','A2','B1','B2','C1','C2']};if(name==='@/lib/quiz/vocabulary')return context.exports;if(name==='@/lib/quiz/progress')return progressContext.exports;if(name==='./use-answer-sounds')return {useAnswerSounds:()=>({enabled:false,prepare(){},play(){},toggle(){}})};throw Error(name);
 }});vm.runInContext(source,c);
 function render(){let loops=0;do{dirty=false;cursor=0;effects=[];tree=c.exports.default({userId,initialLevel:'A1'});const queued=effects;queued.forEach(effect=>effect());if(++loops>10)throw Error('Render loop');}while(dirty);}
 function nodes(node,result=[]){if(arguments.length===0)node=tree;if(Array.isArray(node))node.forEach(item=>nodes(item,result));else if(node&&typeof node==='object'){result.push(node);if(node.props?.children!==undefined)nodes(node.props.children,result);}return result;}
 const content=node=>!node?'':typeof node==='string'?node:Array.isArray(node)?node.map(content).join(''):content(node.props?.children);
 const button=label=>nodes().find(node=>node.type==='button'&&content(node).startsWith(label));
 render();return {render,button,nodes,content,slots};
}
const ui=client();ui.button('Começar quiz').props.onClick();ui.render();
const firstIds=ui.slots.find(value=>value?.phase==='playing').round.map(row=>row.id);
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
ui.button('Jogar novamente').props.onClick();ui.render();
assert.ok(ui.slots.find(value=>value?.phase==='playing').round.every(row=>!firstIds.includes(row.id)),'replay prioritizes unseen questions');
ui.button('Encerrar rodada').props.onClick();ui.render();assert.equal(JSON.parse(store.get('fluencia-vocabulary-quiz-v1:learner-1')).A1.rounds,1,'abandoned round is not recorded');
const restored=client();assert.equal(restored.slots.find(value=>value?.A1?.best===10).A1.rounds,1,'completed results restored per user');
const blocked=client(true);assert.ok(blocked.nodes().some(node=>node.props.role==='status'&&blocked.content(node).includes('não permitiu salvar')));
console.log('Quiz client passed: answer feedback/translation, complete round, one persisted result, replay, abandoned round, history reload and blocked storage.');

const {drawVocabularyRound,readQuizDrawHistory,quizDrawHistoryKey}=context.exports;
let seed=731;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const level of ['A1','A2','B1','B2','C1','C2']){
 const size=totals[level]; let seen=[],sequence=[];
 for(let i=0;i<size;i++){
  const draw=drawVocabularyRound(level,seen,random);
  assert.equal(draw.round.length,10);
  assert.equal(new Set(draw.round.map(row=>row.id)).size,10,'no duplicates at cycle boundaries');
  for(const row of draw.round){assert.equal(row.level,level);assert.equal(row.options.length,4);assert.equal(new Set(row.options).size,4);assert.equal(row.options.filter(option=>option===row.meaning).length,1);}
  sequence.push(...draw.round.map(row=>row.id));
  seen=readQuizDrawHistory(JSON.stringify({[level]:draw.seenIds}))[level];
 }
 for(let start=0;start<sequence.length;start+=size)assert.equal(new Set(sequence.slice(start,start+size)).size,size,'exhaust every level before repeating across reloads');
 const all=vocabulary.filter(row=>row.level===level).map(row=>row.id);
 const expanded=drawVocabularyRound(level,all.slice(0,35),random);
 assert.ok(expanded.round.every(row=>!all.slice(0,35).includes(row.id)),'new content is automatically eligible for existing users');
 assert.equal(drawVocabularyRound(level,all,random).round.length,10,'completed cycles refill');
}
assert.deepEqual(JSON.parse(JSON.stringify(readQuizDrawHistory('{bad'))),{});
assert.deepEqual(JSON.parse(JSON.stringify(readQuizDrawHistory('null'))),{});
assert.deepEqual(JSON.parse(JSON.stringify(readQuizDrawHistory('{"A1":["A1-vocab-1","A1-vocab-1","C2-vocab-1","removed",null,7],"A2":"bad"}'))),{A1:['A1-vocab-1']});

const roundIds=ui=>ui.slots.find(value=>value?.phase==='playing').round.map(row=>row.id);
const start=ui=>{ui.button('Começar quiz').props.onClick();ui.render();return roundIds(ui);};
const abort=ui=>{ui.button('Encerrar rodada').props.onClick();ui.render();};
const persisted=client(false,'draw-reload');const beforeReload=start(persisted);abort(persisted);
const reloaded=client(false,'draw-reload');const afterReload=start(reloaded);
assert.ok(afterReload.every(id=>!beforeReload.includes(id)),'draw sequence survives component reload');abort(reloaded);
reloaded.nodes().find(node=>node.type==='select').props.onChange({target:{value:'A2'}});reloaded.render();
assert.ok(start(reloaded).every(id=>vocabulary.find(row=>row.id===id).level==='A2'),'level changes use separate pools');
assert.equal(JSON.parse(store.get(quizDrawHistoryKey('draw-reload'))).A1.length,20,'switching level preserves previous deck');
assert.equal(JSON.parse(store.get(quizDrawHistoryKey('draw-reload'))).A2.length,10);
assert.equal(store.has('fluencia-vocabulary-quiz-v1:draw-reload'),false,'draws and abandoned rounds never grant progress');
const isolated=client(false,'other-learner');start(isolated);
assert.equal(JSON.parse(store.get(quizDrawHistoryKey('other-learner'))).A1.length,10,'accounts use separate draw histories');
for(const failure of [true,'write-only']){
 const fallback=client(failure,'storage-failure');const first=start(fallback);abort(fallback);const second=start(fallback);
 assert.ok(second.every(id=>!first.includes(id)),'blocked or full storage retains session rotation');
}
console.log('Rotation passed: 10 cycles per level, cycle boundaries, reload, expansion, malformed history, levels/accounts, abandoned rounds and blocked/full storage.');

for(const [target,alternative] of [['bellicose','pugnacious'],['as a rule','in general'],['effect','impact'],['recondite','abstruse'],['sycophant','unctuous']]){
 const question=vocabulary.find(row=>row.word===target),other=vocabulary.find(row=>row.word===alternative);
 assert.equal(context.exports.canBeDistractor(question,other),false,'close synonyms are not competing answers');
}
console.log('Editorial answer families passed: close synonyms and repeated targets are excluded from distractors.');
