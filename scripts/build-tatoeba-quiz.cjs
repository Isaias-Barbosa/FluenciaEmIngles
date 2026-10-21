const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const snapshotPath = path.join(root, 'scripts/data/tatoeba-source-snapshot.json');
const selectionPath = path.join(root, 'scripts/data/tatoeba-quiz-selection.json');
const outputPath = path.join(root, 'lib/quiz/data/tatoeba.json');
const licenseNames = new Set(['CC BY 2.0 FR', 'CC0 1.0']);
const expected = { A1: 67, A2: 67, B1: 67, B2: 67, C1: 66, C2: 66 };
function requireValue(condition, message) { if (!condition) throw Error(message); }
function build(snapshot, selection) {
  requireValue(Array.isArray(snapshot.sentences) && Array.isArray(selection), 'Invalid import files');
  const sources = new Map(snapshot.sentences.map(row => [row.sentence.id, row.sentence]));
  requireValue(sources.size === snapshot.sentences.length, 'Duplicate source sentence');
  const ids = new Set(), examples = new Set(), totals = {};
  const entries = selection.map(row => {
    requireValue(Object.hasOwn(expected, row.level), 'Invalid editorial level');
    const source = sources.get(row.sentenceId);
    const translation = source?.translations.find(t => t.id === row.translationId);
    requireValue(source && (translation || typeof row.editorialTranslation === 'string' && row.editorialTranslation.trim()), `Missing source/translation ${row.sentenceId}`);
    requireValue(!(translation && row.editorialTranslation), 'Ambiguous translation origin');
    for (const s of [source, translation].filter(Boolean)) {
      requireValue(Number.isSafeInteger(s.id) && s.id > 0 && typeof s.text === 'string' && s.text.trim(), 'Invalid source identity/text');
      requireValue(typeof s.owner === 'string' && s.owner.trim(), 'Missing author attribution');
      requireValue(licenseNames.has(s.license), 'Unsupported source license');
      requireValue(s.is_unapproved === false, 'Unapproved sentence');
    }
    requireValue(source.lang === 'eng', 'Not an English source');
    if (translation) requireValue(translation.lang === 'por' && translation.is_direct === true, 'Not a direct Portuguese translation');
    requireValue(typeof row.word === 'string' && row.word.trim() && typeof row.meaning === 'string' && row.meaning.trim(), 'Missing editorial question/answer');
    const escaped = row.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    requireValue(new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'iu').test(source.text), `Target absent from source ${row.word}: ${source.text}`);
    const id = `tatoeba-${source.id}-${translation?.id || 'editorial'}`;
    requireValue(!ids.has(id) && !examples.has(source.text.toLowerCase()), 'Duplicate imported question');
    ids.add(id); examples.add(source.text.toLowerCase()); totals[row.level] = (totals[row.level] || 0) + 1;
    const credit = s => ({ id: s.id, owner: s.owner, license: s.license });
    return { id, level: row.level, word: row.word, meaning: row.meaning, example: source.text, translation: translation?.text || row.editorialTranslation,
      source: translation ? { sentence: credit(source), translation: credit(translation) } : { sentence: credit(source), editorialTranslation: true } };
  });
  requireValue(entries.length === 400, 'Expected exactly 400 new questions');
  for (const [level, count] of Object.entries(expected)) requireValue(totals[level] === count, `Unexpected ${level} count`);
  return { provider: 'Tatoeba', retrievedAt: snapshot.retrievedAt,
    snapshotSha256: crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),
    levelNote: 'Editorial vocabulary practice bands; not official Tatoeba or CEFR certification.', entries };
}
if (require.main === module) {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const selection = JSON.parse(fs.readFileSync(selectionPath, 'utf8'));
  const output = JSON.stringify(build(snapshot, selection), null, 2) + '\n';
  if (process.argv.includes('--check')) requireValue(fs.readFileSync(outputPath, 'utf8') === output, 'Generated quiz differs; run node scripts/build-tatoeba-quiz.cjs');
  else fs.writeFileSync(outputPath, output);
  console.log('Tatoeba import verified: 400 source examples, translations, authors, licenses, unique examples and editorial level distribution.');
}
module.exports = { build };
