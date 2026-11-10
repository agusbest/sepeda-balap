// Efek suara sederhana (WebAudio, tanpa file aset).
export class AudioManager {
  constructor() { this.ctx = null; this.muted = false; this.wind = null; }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) { this.muted = m; if (m && this.wind) this.wind.gain.gain.value = 0; }

  // desau angin: derau yang volume & nada filternya mengikuti kecepatan (0..1)
  windLevel(k) {
    if (!this.ctx) return;
    if (!this.wind) {
      const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const filter = this.ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.Q.value = 0.7; filter.frequency.value = 500;
      const gain = this.ctx.createGain(); gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(this.ctx.destination); src.start();
      this.wind = { gain, filter };
    }
    const t = this.ctx.currentTime;
    this.wind.gain.gain.setTargetAtTime(this.muted ? 0 : Math.min(1, k) * 0.07, t, 0.15);
    this.wind.filter.frequency.setTargetAtTime(350 + k * 900, t, 0.15);
  }

  tone(freq, dur = 0.12, type = 'square', vol = 0.06, slide = 0, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  coin() { this.tone(988, 0.07, 'square', 0.05); this.tone(1480, 0.14, 'square', 0.05, 0, 0.06); }
  beep() { this.tone(520, 0.18, 'sine', 0.12); }
  go() { this.tone(880, 0.5, 'sine', 0.14); this.tone(1320, 0.5, 'triangle', 0.08); }
  jump() { this.tone(300, 0.18, 'triangle', 0.1, 360); }
  land() { this.tone(110, 0.12, 'sine', 0.14, -50); }
  bump() { this.tone(90, 0.22, 'sawtooth', 0.12, -40); }
  splash() { this.tone(500, 0.2, 'sawtooth', 0.04, -300); }
  boost() { this.tone(200, 0.35, 'sawtooth', 0.07, 700); }
  checkpoint() { this.tone(660, 0.1, 'square', 0.06); this.tone(990, 0.16, 'square', 0.06, 0, 0.09); }
  win() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.12, 0, i * 0.14)); }
  finish() { [392, 494, 587].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.1, 0, i * 0.12)); }
}
