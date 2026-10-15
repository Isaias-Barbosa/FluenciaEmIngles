const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('app/learn/page.tsx', 'utf8');
const helper = source.slice(source.indexOf('async function readAllStudyRows'), source.indexOf('function choicesFromJson'));
const context = vm.createContext({});
vm.runInContext(ts.transpileModule(helper, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);

(async () => {
  for (const count of [0, 499, 500, 1000, 1201]) {
    const rows = Array.from({ length: count }, (_, id) => ({ id }));
    const result = await context.readAllStudyRows((from, to) => Promise.resolve({ data: rows.slice(from, to + 1), error: null }));
    assert.equal(result.error, null);
    assert.deepEqual(Array.from(result.data), rows);
  }
  const failed = await context.readAllStudyRows(() => Promise.resolve({ data: null, error: { message: 'offline' } }));
  assert.equal(failed.error.message, 'offline');
  const profile = source.slice(source.indexOf('function ProfilePage('), source.indexOf('function ProgressPage('));
  assert.equal(profile.includes('fetchProficiencyExam'), false);
  assert.equal(profile.includes('Descubra seu ponto de partida'), false);
  console.log('Pagination and profile checks passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
