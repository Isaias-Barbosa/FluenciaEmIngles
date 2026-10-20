const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const contexts = [];
class MockContext {
  state = 'suspended'; currentTime = 5; destination = {}; notes = []; gains = [];
  constructor() { contexts.push(this); }
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
  createOscillator() {
    const note = { frequency: { setValueAtTime: (frequency, time) => { note.hz = frequency; note.time = time; } }, connect() {}, disconnect() { note.disconnected = true; }, start(time) { note.start = time; }, stop(time) { note.stop = time; } };
    this.notes.push(note); return note;
  }
  createGain() {
    const gain = { peaks: [], gain: { setValueAtTime() {}, linearRampToValueAtTime: value => gain.peaks.push(value), exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
    this.gains.push(gain); return gain;
  }
}
const code = ts.transpileModule(fs.readFileSync('lib/learning/feedback-audio.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const context = vm.createContext({ exports: {}, AudioContext: MockContext });
vm.runInContext(code, context);
const feedback = new context.exports.FeedbackAudio();
feedback.play('correct');
assert.equal(contexts.length, 0, 'never start audio without a gesture');
feedback.prepare();
const audio = contexts[0];
feedback.play('correct');
assert.deepEqual(audio.notes.map(note => note.hz), [523.25, 659.25, 783.99]);
assert.ok(audio.notes.at(-1).stop - audio.currentTime < 0.4, 'keep cues short');
assert.ok(audio.gains.every(gain => gain.peaks[0] <= 0.06), 'keep volume low');
feedback.play('incorrect');
assert.ok(audio.notes.slice(0, 3).every(note => note.disconnected), 'cancel preceding cue');
assert.deepEqual(audio.notes.slice(3).map(note => note.hz), [293.66, 246.94]);
feedback.stop();
assert.ok(audio.notes.every(note => note.disconnected), 'mute stops active voices');
feedback.dispose();
assert.equal(audio.state, 'closed');
const unsupported = vm.createContext({ exports: {} });
vm.runInContext(code, unsupported);
assert.doesNotThrow(() => { const cue = new unsupported.exports.FeedbackAudio(); cue.prepare(); cue.play('correct'); cue.dispose(); });
console.log('Feedback audio: distinct short cues, low volume, mute, cleanup and unsupported browser checks passed.');
