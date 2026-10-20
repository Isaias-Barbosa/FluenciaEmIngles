const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
function load(path, dependencies, globals = {}) {
  const context = vm.createContext({ exports: {}, Error, require: name => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, ...globals });
  vm.runInContext(compile(path), context, { filename: path });
  return context.exports;
}
const types = load('lib/cefr/types.ts', {});
const engine = load('lib/cefr/analyze.ts', { './types': types, './data/vocabulary.json': require('../lib/cefr/data/vocabulary.json') });
const fixtures = [
  ['A1', 'What is your name and where do you live?'],
  ['A2', 'What did you do at school yesterday?'],
  ['B1', 'Have you ever seen this film before?'],
  ['B2', 'If she had known, she would have stayed at home.'],
  ['C1', 'Never before have I seen such a beautiful place.'],
  ['C2', 'Does the allegorical allusion reveal an abhorrent aberration?'],
];
for (const [level, prompt] of fixtures) assert.equal(engine.analyzeCefr(prompt).level, level, prompt);
assert.equal(engine.analyzeCefr('').level, null);
assert.equal(engine.analyzeCefr('Xyzz splurgle blargh').level, null);
assert.equal(engine.analyzeCefr('Qual é a capital do Brasil?').level, null);
assert.equal(engine.analyzeCefr('Which is it?').confidence, 'baixa');
const proper = engine.analyzeCefr('Where do Xylophora and Zorblax live?');
assert.ok(proper.possibleNames.includes('Xylophora'));
assert.notEqual(proper.level, 'C2', 'unrecognized proper names do not imply C2');
assert.ok(engine.analyzeCefr('Where does the constructor live?').level, 'prototype properties cannot break the dictionary lookup');
const extra = engine.analyzeCefr('What is your name?', ['allegory', 'aberration', 'allusion']);
assert.ok(extra.vocabulary.some(word => word.level === 'C2'), 'alternatives contribute linguistic evidence');
console.log('CEFR: A1–C2 linguistic fixtures, short/unknown/non-English input, names, alternatives and dictionary edge cases passed (not a calibration study).');

const openItem = { type: 'multiple', category: 'General%20Knowledge', difficulty: 'hard', question: 'What%20is%20a%20%22cat%22%3F', correct_answer: 'An%20animal', incorrect_answers: ['A%20car', 'A%20tree', 'A%20house'] };
const triviaItem = { type: 'text_choice', category: 'science', difficulty: 'easy', question: { text: 'Where does a cat live?' }, correctAnswer: 'A home', incorrectAnswers: ['Mars', 'The Sun', 'The Moon'] };
function providerHarness() {
  const state = { calls: [], status: 200, payload: [triviaItem], fail: false, raw: null };
  const api = load('lib/cefr/trivia.ts', { 'node:crypto': crypto }, { AbortSignal, fetch: async (url, options) => {
    state.calls.push({ url, options });
    if (state.fail) throw new Error('network timeout');
    return new Response(state.raw ?? JSON.stringify(state.payload), { status: state.status });
  } });
  return { api, state };
}
async function providerTests() {
  const { api, state } = providerHarness();
  const [open] = api.normalizeTrivia({ response_code: 0, results: [openItem] }, 'opentdb');
  assert.equal(open.prompt, 'What is a "cat"?');
  assert.ok(open.choices.includes(open.correctAnswer));
  assert.equal(open.license, 'CC BY-SA 4.0');
  const [trivia] = api.normalizeTrivia([triviaItem], 'trivia');
  assert.equal(trivia.license, 'CC BY-NC 4.0');
  const changedDifficulty = { ...openItem, difficulty: 'easy' };
  const [easy] = api.normalizeTrivia({ response_code: 0, results: [changedDifficulty] }, 'opentdb');
  assert.deepEqual(JSON.parse(JSON.stringify(engine.analyzeCefr(open.prompt, [...open.choices].sort()))), JSON.parse(JSON.stringify(engine.analyzeCefr(easy.prompt, [...easy.choices].sort()))), 'provider difficulty is not a CEFR signal');
  assert.throws(() => api.normalizeTrivia([{ ...triviaItem, incorrectAnswers: ['A home', 'Mars', 'Mars'] }], 'trivia'));
  assert.throws(() => api.normalizeTrivia({ response_code: 0, results: [{ ...openItem, question: '%ZZ' }] }, 'opentdb'));
  assert.throws(() => api.normalizeTrivia([], 'trivia'));
  await api.importTrivia('trivia', 1);
  assert.ok(state.calls[0].url.startsWith('https://the-trivia-api.com/v2/questions?limit=1'));
  assert.equal(state.calls[0].options.headers.Authorization, undefined, 'never forward admin credentials');
  state.payload = { response_code: 0, results: [openItem] };
  await api.importTrivia('opentdb', 1);
  await assert.rejects(api.importTrivia('opentdb', 1), error => error.status === 429 && error.retryAfter > 0);
  state.status = 429; await assert.rejects(api.importTrivia('trivia', 1), error => error.status === 429);
  state.status = 503; await assert.rejects(api.importTrivia('trivia', 1), error => error.status === 502);
  state.status = 200; state.raw = '{'; await assert.rejects(api.importTrivia('trivia', 1), error => error.status === 502);
  state.raw = null; state.fail = true; await assert.rejects(api.importTrivia('trivia', 1), error => error.status === 502);
  console.log('Imports: decoding, answer mapping, licenses, schema errors, provider limits, timeouts and fixed URLs passed.');
}
function routeHarness() {
  const state = { email: 'admin@example.test', valid: true, configured: true, imports: 0 };
  class NextResponse { static json(value, init) { return new Response(JSON.stringify(value), init); } }
  const auth = {
    get hasConfiguredAdmins() { return state.configured; },
    adminAuthClient: { auth: { getUser: async () => ({ data: { user: state.valid ? { email: state.email } : null }, error: null }) } },
    isConfiguredAdmin: email => email === 'admin@example.test',
  };
  const { ReviewError } = providerHarness().api;
  const route = load('app/api/admin/question-review/route.ts', {
    'next/server': { NextResponse }, '@/lib/supabase/admin-server': auth, '@/lib/cefr/analyze': engine,
    '@/lib/cefr/trivia': { ReviewError, importTrivia: async () => { state.imports++; return [triviaItem]; } },
  });
  const call = (body = { action: 'analyze', prompt: fixtures[0][1], choices: [] }, token = 'Bearer token') => route.POST(new Request('https://example.test/api/admin/question-review', { method: 'POST', headers: token ? { authorization: token } : {}, body: typeof body === 'string' ? body : JSON.stringify(body) }));
  return { call, state };
}
async function routeTests() {
  const { call, state } = routeHarness();
  assert.equal((await call(undefined, '')).status, 401);
  state.valid = false; assert.equal((await call()).status, 401); state.valid = true;
  state.email = 'student@example.test'; assert.equal((await call({ action: 'import', provider: 'trivia', amount: 1 })).status, 403);
  assert.equal(state.imports, 0); state.email = 'admin@example.test';
  state.configured = false; assert.equal((await call()).status, 503); state.configured = true;
  assert.equal((await call('{')).status, 400);
  assert.equal((await call({ action: 'import', provider: 'https://evil.test', amount: 1 })).status, 400);
  assert.equal((await call({ action: 'import', provider: 'trivia', amount: 100 })).status, 400);
  assert.equal((await call({ action: 'analyze', prompt: 'x'.repeat(1501), choices: [] })).status, 400);
  assert.equal((await call({ action: 'analyze', prompt: fixtures[0][1], choices: [42] })).status, 400);
  assert.equal((await call('x'.repeat(20001))).status, 413);
  const response = await call();
  assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal((await response.json()).analysis.level, 'A1');
  assert.equal((await call({ action: 'import', provider: 'trivia', amount: 1 })).status, 200);
  assert.equal(state.imports, 1);
  console.log('Admin API: missing/invalid session, non-admin denial, configuration, body limits, free analysis and authorized import passed.');
}

// Execute the client component with a small hook runtime: test the actual handlers
// without a browser or network; rerender explicitly after state updates.
async function uiTests() {
  const states = []; let cursor = 0;
  const hooks = { useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; }, useRef(initial) { const i = cursor++; if (!(i in states)) states[i] = { current: initial }; return states[i]; } };
  const jsx = (type, props) => ({ type, props: props || {} });
  const Component = load('app/admin/question-review.tsx', { react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx }, '@/lib/cefr/types': types }).default;
  let fail = false; const calls = []; let handedOff = null;
  const imported = providerHarness().api.normalizeTrivia([triviaItem], 'trivia')[0];
  const props = { availableLevels: [...types.cefrLevels], request: async body => { calls.push(body); if (fail) throw new Error('Fonte indisponível'); return body.action === 'import' ? { questions: [imported] } : { analysis: engine.analyzeCefr(body.prompt, body.choices) }; }, onUseQuestion: (question, level) => { handedOff = { question, level }; } };
  let tree;
  function render() { cursor = 0; tree = Component(props); }
  function all(node = tree, result = []) { if (Array.isArray(node)) { node.forEach(child => all(child, result)); } else if (node && typeof node === 'object') { result.push(node); if (node.props?.children !== undefined) all(node.props.children, result); } return result; }
  const content = node => !node ? '' : typeof node === 'string' ? node : Array.isArray(node) ? node.map(content).join('') : content(node.props?.children);
  const byId = id => all().find(node => node.props.id === id);
  const button = label => all().find(node => node.type === 'button' && content(node).startsWith(label));
  const change = (id, value) => { byId(id).props.onChange({ target: { value } }); render(); };
  const settle = async () => { await new Promise(resolve => setImmediate(resolve)); render(); };
  render();
  assert.ok(button('Analisar questão').props.disabled);
  change('review-prompt', fixtures[0][1]);
  all().find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await settle();
  assert.equal(byId('review-level').props.value, 'A1');
  assert.ok(button('Enviar para cadastro').props.disabled, 'answer needed for registration');
  change('review-answer', 'Anna');
  assert.equal(button('Enviar para cadastro').props.disabled, false);
  change('review-level', 'B1'); button('Enviar para cadastro').props.onClick();
  assert.equal(handedOff.level, 'B1', 'use the administrator override');
  change('review-prompt', 'What did you do yesterday?');
  assert.equal(byId('review-level'), undefined, 'editing invalidates old analysis');
  button('Buscar questões').props.onClick(); await settle();
  assert.equal(byId('review-prompt').props.value, 'What did you do yesterday?', 'import preserves manual edits');
  button('Próxima').props.onClick(); render();
  assert.equal(byId('review-prompt').props.value, imported.prompt);
  all().find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await settle();
  button('Enviar para cadastro').props.onClick();
  assert.equal(handedOff.question.license, 'CC BY-NC 4.0');
  assert.equal(handedOff.question.sourceUrl, 'https://the-trivia-api.com/');
  change('review-answer', 'not an option'); assert.ok(button('Enviar para cadastro').props.disabled);
  fail = true; button('Buscar questões').props.onClick(); await settle();
  assert.equal(byId('review-prompt').props.value, imported.prompt, 'upstream errors preserve question');
  assert.ok(all().some(node => node.props.role === 'alert' && content(node).includes('Fonte indisponível')));
  console.log('Client: manual entry, analysis, stale result invalidation, answer validation, CEFR override, queue, attribution and recoverable errors passed.');
}
async function handoffTests() {
  const page = fs.readFileSync('app/admin/admin-dashboard.tsx', 'utf8');
  const handoff = page.slice(page.indexOf('  function useReviewedQuestion('), page.indexOf('  async function submitAdminAction('));
  const create = page.slice(page.indexOf('  async function createQuestion('), page.indexOf('  async function createVideo('));
  const state = { data: { levels: [{ id: 'level-b1', code: 'B1' }], lessons: [{ id: 'lesson-b1', levelId: 'level-b1' }] }, submitted: null };
  const context = vm.createContext(state);
  for (const name of ['SelectedLevelId', 'QuestionLessonId', 'QuestionType', 'QuestionPrompt', 'QuestionChoices', 'QuestionAnswers', 'QuestionExplanation', 'QuestionAudioPath', 'View', 'Error', 'Notice']) {
    context[`set${name}`] = value => { context[name[0].toLowerCase() + name.slice(1)] = value; };
  }
  context.submitAdminAction = async (_event, action, payload) => { context.submitted = { action, payload }; return false; };
  vm.runInContext(ts.transpileModule(handoff + create, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
  const imported = providerHarness().api.normalizeTrivia([triviaItem], 'trivia')[0];
  context.useReviewedQuestion(imported, 'B1');
  assert.equal(context.selectedLevelId, 'level-b1');
  assert.equal(context.questionLessonId, 'lesson-b1');
  assert.equal(context.view, 'questions');
  assert.ok(context.questionPrompt.includes('CC BY-NC 4.0'));
  assert.ok(context.questionPrompt.includes('https://the-trivia-api.com/'));
  assert.equal(context.submitted, null, 'handoff prepares a form and does not publish or save automatically');
  await context.createQuestion({ preventDefault() {} });
  assert.equal(context.submitted.action, 'createQuestion');
  assert.equal(context.submitted.payload.question.lessonId, 'lesson-b1');
  assert.equal(context.submitted.payload.question.acceptedAnswers[0], imported.correctAnswer);
  assert.equal(context.submitted.payload.question.choices.length, 4);
  assert.equal(context.submitted.payload.question.audioPath, '');
  console.log('Dashboard handoff: reviewed level/lesson, attribution, answer mapping and explicit draft registration passed.');
}
(async () => { await providerTests(); await routeTests(); await uiTests(); await handoffTests(); })().catch(error => { console.error(error); process.exitCode = 1; });
