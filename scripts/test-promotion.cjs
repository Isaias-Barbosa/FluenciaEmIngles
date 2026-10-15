const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual eligibility function used by the home, lessons and exam pages.
const source = fs.readFileSync('app/learn/page.tsx', 'utf8');
const helper = source.slice(source.indexOf('function promotionProgress('), source.indexOf('function choicesFromJson'));
const context = vm.createContext({});
vm.runInContext(ts.transpileModule(helper, {}).outputText, context);
const lessons = (count) => [{ questions: Array.from({ length: count }, (_, id) => ({ id: String(id) })) }];
const completed = (count) => Array.from({ length: count }, (_, id) => String(id));
const progress = context.promotionProgress;

assert.equal(progress(lessons(200), completed(99)).eligible, false);
assert.equal(progress(lessons(200), completed(100)).eligible, true);
assert.equal(progress(lessons(201), completed(100)).eligible, false);
assert.equal(progress(lessons(201), completed(101)).eligible, true);
assert.equal(progress(lessons(0), []).eligible, false);
assert.equal(progress(lessons(200), Array(100).fill('0')).eligible, false);
assert.equal(progress(lessons(200), [...completed(99), 'another-level']).eligible, false);
assert.equal(progress(lessons(202), completed(100)).eligible, false);
assert.equal(progress(lessons(1), completed(1)).eligible, true);
console.log('9 promotion eligibility checks passed.');
