/* ============================== AUDIO (synthesized) ============================== */
const SFX = {
  ctx: null, master: null, noiseBuf: null, grind: null, hums: [],
  vol: (() => { try { return Object.assign({ master: 0.8, sfx: 0.8, voice: 0.9 }, JSON.parse(localStorage.getItem('spinx-vol') || '{}')); } catch (e) { return { master: 0.8, sfx: 0.8, voice: 0.9 }; } })(),
  setVol(k, v) { this.vol[k] = v; try { localStorage.setItem('spinx-vol', JSON.stringify(this.vol)); } catch (e) {} if (this.master) this.master.gain.value = 0.7 * this.vol.master * this.vol.sfx; },
  /* Announcer: recorded clips in assets/voice/ win if present; otherwise an English browser voice tuned for hype,
     layered with a synthesized stinger so it hits harder than plain text-to-speech. */
  clips: {}, clipsTried: false,
  async loadClips() {
    if (this.clipsTried || !this.ctx) return; this.clipsTried = true;
    for (const k of ['3', '2', '1', 'getfight']) {
      try {
        const r = await fetch(`assets/voice/${k}.mp3`); if (!r.ok) continue;
        this.clips[k] = await this.ctx.decodeAudioData(await r.arrayBuffer());
      } catch (e) {}
    }
  },
  playClip(k) {
    const buf = this.clips[k]; if (!buf || !this.ctx) return false;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = 1.3 * this.vol.voice;
    src.connect(g); g.connect(this.master); src.start(); return true;
  },
  voiceObj: null,
  pickVoice() {
    if (this.voiceObj || !('speechSynthesis' in window)) return this.voiceObj;
    const vs = window.speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
    const pref = [/Google US English/i, /Daniel/i, /Alex/i, /Guy/i, /Davis/i, /Christopher/i, /Eric/i, /Mark/i, /David/i, /Male/i, /en-US/i, /en-GB/i];
    for (const re of pref) { const v = vs.find((x) => re.test(x.name) || re.test(x.lang)); if (v) return (this.voiceObj = v); }
    return (this.voiceObj = vs[0] || null);
  },
  say(text, opts = {}) {
    const vv = this.vol.master * this.vol.voice;
    if (!('speechSynthesis' in window) || vv <= 0.01) return;
    try {
      const synth = window.speechSynthesis, v = this.pickVoice();
      if (opts.cancel !== false) synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = v ? v.lang : 'en-US'; if (v) u.voice = v;
      u.rate = opts.rate || 1.1; u.pitch = opts.pitch || 1; u.volume = vv;
      synth.speak(u);
    } catch (e) {}
  },
  /* countdown call: i = 0..3 */
  announce(i) {
    const key = ['3', '2', '1', 'getfight'][i];
    const clip = this.playClip(key);
    if (!clip) {
      if (i < 3) this.say(['Three!', 'Two!', 'One!'][i], { rate: 1.25, pitch: 0.85 });
      else this.say('Get... FIGHT!', { rate: 1.05, pitch: 1.25 });
    }
    // stinger lands on the word FIGHT (≈0.5 s into the recorded clip)
    if (i === 3) setTimeout(() => this.hype(), clip ? 500 : 0);
  },
  /* stinger under GET FIGHT: drum hit, power chord, crowd swell */
  hype() {
    if (!this.ctx) return;
    this.tone(55, 0.5, 0.45, 'sine', 0, 35);
    this.noise(0.18, 180, 0.7, 0.5, 'lowpass');
    [[110, 165, 220], [147, 220, 294]].forEach((ch, k) => ch.forEach((f) => this.tone(f, 0.55, 0.06, 'sawtooth', 0.05 + k * 0.28)));
    const n = this.noise(1.4, 900, 0.4, 0.0001, 'bandpass', 0.1);
    if (n) { const t = this.ctx.currentTime + 0.1; n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(0.0001, t); n.g.gain.exponentialRampToValueAtTime(0.18, t + 0.35); n.g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4); }
  },
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.7 * this.vol.master * this.vol.sfx;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.loadClips();
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
  specialCharge() {
    const n = this.noise(0.6, 200, 0.8, 0.35, 'bandpass'); if (n) n.f.frequency.exponentialRampToValueAtTime(3000, this.ctx.currentTime + 0.5);
    this.tone(70, 0.6, 0.3, 'sawtooth', 0, 220);
  },
  specialCut() {
    this.noise(0.25, 2500, 0.6, 0.35, 'highpass');
    [392, 523, 659].forEach((f, i) => this.tone(f, 0.5, 0.08, 'square', i * 0.04));
    this.tone(55, 0.9, 0.3, 'sine', 0, 40);
  },
  /* synthesized beast cry: howl / screech / roar by family */
  roar(kind) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const cry = (f0, f1, f2, dur, type, vib) => {
      const o = this.ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + dur * 0.35); o.frequency.linearRampToValueAtTime(f2, t + dur);
      const l = this.ctx.createOscillator(); l.frequency.value = vib; const lg = this.ctx.createGain(); lg.gain.value = f1 * 0.03; l.connect(lg); lg.connect(o.frequency);
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f1 * 2; bp.Q.value = 1.2;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(bp); bp.connect(g); g.connect(this.master); o.start(t); l.start(t); o.stop(t + dur + 0.05); l.stop(t + dur + 0.05);
    };
    if (kind === 'wolf') { cry(420, 760, 520, 1.0, 'sawtooth', 6); cry(430, 770, 530, 1.0, 'triangle', 5); }
    else if (['bird', 'crane', 'owl', 'phoenix'].includes(kind)) { cry(1400, 2600, 1800, 0.6, 'sawtooth', 18); }
    else if (['dragon', 'tiger', 'rhino'].includes(kind)) { cry(90, 160, 70, 0.9, 'sawtooth', 9); this.noise(0.9, 300, 0.6, 0.45, 'lowpass'); }
    else { cry(200, 340, 160, 0.7, 'square', 12); this.noise(0.5, 1200, 0.7, 0.2, 'bandpass'); }
    this.noise(0.8, 2000, 0.5, 0.18, 'highpass');
  },
  specialBurst() {
    this.noise(1.2, 90, 0.6, 0.8, 'lowpass'); this.noise(0.6, 3000, 0.7, 0.45);
    this.tone(60, 1.0, 0.4, 'sawtooth', 0, 30);
    [523, 784, 1046, 1568, 2093].forEach((f, i) => this.tone(f, 0.7, 0.07, 'square', 0.05 + i * 0.04));
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
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 0.8;
    const g = this.ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
    this.grind = { src, f, g };
    // spin hums for two beys
    // soft low whir per bey: triangle + sine an octave up, heavily low-passed, slow wobble
    this.hums = [0, 1].map((i) => {
      const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 70;
      const o2 = this.ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 140;
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 5 + i; const lg = this.ctx.createGain(); lg.gain.value = 0.25;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.5;
      const hg = this.ctx.createGain(); hg.gain.value = 0;
      const g2 = this.ctx.createGain(); g2.gain.value = 0.35;
      o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(hg); hg.connect(this.master);
      lfo.connect(lg); lg.connect(hg.gain);
      o.start(); o2.start(); lfo.start();
      return { o, o2, lfo, hg, lg };
    });
  },
  setGrind(level) { if (this.grind) this.grind.g.gain.setTargetAtTime(clamp(level - 0.15, 0, 1) * 0.07, this.ctx.currentTime, 0.08); },
  setHum(i, spin, alive) {
    const h = this.hums[i]; if (!h) return;
    const f = 48 + spin * 70;
    h.o.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.2); h.o2.frequency.setTargetAtTime(f * 2, this.ctx.currentTime, 0.2);
    const g = alive ? 0.012 + spin * 0.014 : 0;
    h.hg.gain.setTargetAtTime(g, this.ctx.currentTime, 0.25); h.lg.gain.setTargetAtTime(g * 0.3, this.ctx.currentTime, 0.25);
  },
  stopGrind() {
    if (!this.grind) return;
    try { this.grind.src.stop(); this.hums.forEach((h) => { h.o.stop(); h.o2.stop(); h.lfo.stop(); }); } catch (e) {}
    this.grind = null; this.hums = [];
  },
};
