/* ============================== AUDIO (synthesized) ============================== */
const SFX = {
  ctx: null, master: null, noiseBuf: null, grind: null, hums: [],
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.55;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) { this.ctx = null; return false; }
  },
  noise(dur, freq, q, gain, type = 'bandpass', when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
    return { src, f, g };
  },
  tone(freq, dur, gain, type = 'sine', when = 0, slideTo) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  clash(power) {
    const p = clamp(power, 0.1, 1);
    this.noise(0.08 + p * 0.12, 3200 + Math.random() * 1500, 1.4, 0.35 * p + 0.05);
    this.tone(1400 + Math.random() * 900, 0.18 + p * 0.2, 0.08 * p + 0.02, 'square', 0, 900);
    this.tone(2600 + Math.random() * 600, 0.12, 0.05 * p, 'triangle');
    if (p > 0.6) this.noise(0.25, 180, 0.8, 0.4 * p, 'lowpass');
  },
  wall(p) { this.noise(0.08, 900, 1, 0.12 * clamp(p, 0, 1)); },
  launch() {
    this.noise(0.45, 1200, 0.6, 0.35, 'bandpass');
    const n = this.noise(0.5, 400, 0.7, 0.3, 'bandpass');
    if (n) n.f.frequency.exponentialRampToValueAtTime(5000, this.ctx.currentTime + 0.4);
    for (let i = 0; i < 9; i++) this.tone(300 + i * 60, 0.03, 0.05, 'square', i * 0.025);
  },
  burst() {
    this.noise(0.9, 120, 0.6, 0.7, 'lowpass');
    this.noise(0.5, 2500, 0.8, 0.45);
    this.tone(90, 0.6, 0.35, 'sawtooth', 0, 40);
    for (let i = 0; i < 5; i++) this.tone(1800 + Math.random() * 1200, 0.15, 0.06, 'square', 0.05 + i * 0.06, 700);
  },
  fall() { this.tone(420, 0.5, 0.12, 'triangle', 0, 120); this.noise(0.3, 600, 1, 0.2, 'bandpass', 0.15); },
  beep(hi) { this.tone(hi ? 1320 : 880, hi ? 0.45 : 0.18, 0.18, 'square'); if (hi) this.tone(1980, 0.4, 0.08, 'square', 0.02); },
  finish() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, 0.12, 'square', i * 0.07)); },
  coin() { this.tone(1320, 0.08, 0.1, 'square'); this.tone(1760, 0.18, 0.1, 'square', 0.07); },
  rareJingle(r) {
    const seq = r === 'sr' ? [784, 988, 1175, 1568, 1976] : r === 'rare' ? [659, 880, 1175] : [880];
    seq.forEach((f, i) => this.tone(f, 0.3, 0.1, 'triangle', i * 0.08));
  },
  special() {
    const n = this.noise(1.0, 300, 0.7, 0.4, 'bandpass'); if (n) n.f.frequency.exponentialRampToValueAtTime(6000, this.ctx.currentTime + 0.8);
    this.tone(110, 1.0, 0.25, 'sawtooth', 0, 440);
    [523, 784, 1046, 1568].forEach((f, i) => this.tone(f, 0.6, 0.09, 'square', 0.35 + i * 0.05));
    this.noise(0.5, 120, 0.6, 0.5, 'lowpass', 0.35);
  },
  click() { this.tone(700, 0.04, 0.05, 'square'); },
  startGrind() {
    if (!this.ctx || this.grind) return;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 2;
    const g = this.ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
    this.grind = { src, f, g };
    // spin hums for two beys
    this.hums = [0, 1].map(() => {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const hg = this.ctx.createGain(); hg.gain.value = 0;
      o.connect(lp); lp.connect(hg); hg.connect(this.master); o.start();
      return { o, hg };
    });
  },
  setGrind(level) { if (this.grind) this.grind.g.gain.setTargetAtTime(clamp(level, 0, 1) * 0.22, this.ctx.currentTime, 0.05); },
  setHum(i, spin, alive) {
    const h = this.hums[i]; if (!h) return;
    h.o.frequency.setTargetAtTime(60 + spin * 160, this.ctx.currentTime, 0.1);
    h.hg.gain.setTargetAtTime(alive ? 0.018 + spin * 0.02 : 0, this.ctx.currentTime, 0.15);
  },
  stopGrind() {
    if (!this.grind) return;
    try { this.grind.src.stop(); this.hums.forEach((h) => h.o.stop()); } catch (e) {}
    this.grind = null; this.hums = [];
  },
};
