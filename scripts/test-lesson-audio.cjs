const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const source = fs.readFileSync('app/api/lesson-audio/route.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
function harness() {
  const state = { user: { id: 'user' }, transcript: 'Hello, my name is Anna.', generations: 0, requests: [], rpcCalls: 0, failProvider: false };
  class NextResponse extends Response { static json(value, init) { return new Response(JSON.stringify(value), init); } }
  const context = vm.createContext({ exports: {}, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon', OPENAI_API_KEY: 'secret' } }, AbortSignal,
    require(name) {
      if (name === 'node:crypto') return crypto;
      if (name === 'next/server') return { NextResponse };
      if (name === '@supabase/supabase-js') return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: state.user }, error: null }) }, rpc: async () => { state.rpcCalls++; return { data: state.transcript, error: null }; } }) };
      throw new Error(name);
    }, fetch: async (url, options) => { state.generations++; state.requests.push(JSON.parse(options.body)); return new Response('mock-mp3', { status: state.failProvider ? 503 : 200 }); },
  });
  vm.runInContext(code, context);
  const request = (body, token = 'Bearer test') => new Request('https://example.test/api/lesson-audio', { method: 'POST', headers: token ? { authorization: token } : {}, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { state, context, call: (body, token) => context.exports.POST(request(body, token)) };
}
(async () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const h = harness();
  assert.equal((await h.call({ questionId: id }, '')).status, 401);
  h.state.user = null;
  assert.equal((await h.call({ questionId: id })).status, 401);
  h.state.user = { id: 'user' };
  assert.equal((await h.call('{')).status, 400);
  assert.equal((await h.call({ questionId: 'invalid' })).status, 400);
  const response = await h.call({ questionId: id, text: 'Do not speak this client text.' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'audio/mpeg');
  assert.equal(h.state.requests[0].input, h.state.transcript);
  assert.equal(h.state.requests[0].model, 'gpt-4o-mini-tts');
  assert.equal((await h.call({ questionId: id })).status, 200);
  assert.equal(h.state.generations, 1);
  h.state.transcript = null;
  assert.equal((await h.call({ questionId: id })).status, 404);
  const noKey = harness(); delete noKey.context.process.env.OPENAI_API_KEY;
  assert.equal((await noKey.call({ questionId: id })).status, 503);
  const failing = harness(); failing.state.failProvider = true;
  assert.equal((await failing.call({ questionId: id })).status, 502);
  const concurrent = harness();
  await Promise.all([concurrent.call({ questionId: id }), concurrent.call({ questionId: id })]);
  assert.equal(concurrent.state.generations, 1);
  const limited = harness();
  for (let i = 0; i < 10; i++) { limited.state.transcript = `Sentence ${i}`; assert.equal((await limited.call({ questionId: id })).status, 200); }
  limited.state.transcript = 'One more';
  assert.equal((await limited.call({ questionId: id })).status, 429);
  console.log('Lesson-audio authentication, trusted transcript, cache, failure, concurrency and rate-limit checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
