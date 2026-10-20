export type AnswerResult = "correct" | "incorrect";

/** Small, quiet cues generated locally. No files, requests, or API keys. */
export class FeedbackAudio {
  private context: AudioContext | null = null;
  private voices: OscillatorNode[] = [];

  prepare() {
    try {
      if (!this.context || this.context.state === "closed") this.context = new AudioContext();
      if (this.context.state === "suspended") void this.context.resume().catch(() => {});
    } catch { /* Audio may be unavailable or blocked; feedback still works visually. */ }
  }

  stop() {
    for (const voice of this.voices) {
      try { voice.stop(); } catch { /* The cue may have already ended. */ }
      voice.disconnect();
    }
    this.voices = [];
  }

  play(result: AnswerResult) {
    const context = this.context;
    if (!context || context.state !== "running") return;
    this.stop();
    const notes = result === "correct" ? [523.25, 659.25, 783.99] : [293.66, 246.94];
    try {
      notes.forEach((frequency, index) => {
        const start = context.currentTime + index * 0.085;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.055, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
          this.voices = this.voices.filter((voice) => voice !== oscillator);
        };
        this.voices.push(oscillator);
        oscillator.start(start);
        oscillator.stop(start + 0.15);
      });
    } catch { this.stop(); }
  }

  dispose() {
    this.stop();
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
  }
}
