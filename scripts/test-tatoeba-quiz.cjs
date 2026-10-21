const assert = require('node:assert/strict');
const { build } = require('./build-tatoeba-quiz.cjs');
const snapshot = require('./data/tatoeba-source-snapshot.json');
const selection = require('./data/tatoeba-quiz-selection.json');
const compiled = require('../lib/quiz/data/tatoeba.json');
assert.deepEqual(build(snapshot, selection), compiled, 'offline import is reproducible');
assert.equal(compiled.entries.length, 400);
const rejected = (edit, pattern) => {
  const source = structuredClone(snapshot), chosen = structuredClone(selection);
  const first = source.sentences.find(row => row.sentence.id === chosen[0].sentenceId).sentence;
  edit(first, chosen);
  assert.throws(() => build(source, chosen), pattern);
};
rejected(source => source.license = 'All rights reserved', /license/);
rejected(source => source.owner = '', /attribution/);
rejected(source => source.is_unapproved = true, /Unapproved/);
rejected(source => source.text = 'The target was removed.', /Target absent/);
rejected((source, chosen) => chosen[0].translationId = -1, /Missing source/);
rejected((source, chosen) => chosen[0].level = 'D1', /level/);
const direct = selection.find(row => row.translationId);
const indirect = structuredClone(snapshot);
indirect.sentences.find(row => row.sentence.id === direct.sentenceId).sentence.translations.find(row => row.id === direct.translationId).is_direct = false;
assert.throws(() => build(indirect, selection), /direct Portuguese/);
for (const item of compiled.entries) {
  assert.ok(item.source.sentence.owner && item.source.sentence.id);
  assert.ok(Boolean(item.source.translation) !== Boolean(item.source.editorialTranslation), 'translation origin is explicit');
}
console.log('Tatoeba content passed: exact 400-source import, attribution, licensing, direct/editorial translations, reproducibility and invalid-source rejection.');
