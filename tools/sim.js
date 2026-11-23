// Balance simulator: AI vs AI rounds with the real arena physics. node tools/sim.js [rounds]
const fs = require('fs'), vm = require('vm'), path = require('path');
const R = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
const ctx = { console, Math, JSON, Object, Array, Number, String, Set, Map, window: {}, document: { createElement: () => ({ getContext: () => null }) } };
vm.createContext(ctx);
const pre = 'var THREE = { Color: function(){ this.setHSL=()=>this; this.getHexString=()=>"fff"; this.multiplyScalar=()=>this; } };\n';
vm.runInContext(pre + (R('data.js') + '\n' + R('arena.js')).replace(/^(const|let|class) /gm, (m, k) => (k === 'class' ? 'var Arena_ = ' + 'class ' : 'var ')).replace('var Arena_ = class Arena', 'var Arena = class Arena') + '\n;this.__ok=1;', ctx);
const N = +process.argv[2] || 600, MODE = process.argv[3] || 'real';
const out = vm.runInContext(`(() => {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const bl = BLADES.filter((b) => !b.id.includes('@')), ra = RATCHETS.filter((r) => !r.id.includes('@')), bi = BITS.filter((b) => !b.id.includes('@'));
  const st = Object.keys(STADIUMS);
  let ko = 0, spKo = 0; const spK = {}; const res = { spin: 0, out: 0, burst: 0, rift: 0, draw: 0, timeout: 0 }, times = [], hits = [];
  for (let n = 0; n < ${N}; n++) {
    applyStadium(pick(st));
    const A = { b: pick(bl.filter((x) => '${process.argv[4]||''}' ? x.type === '${process.argv[4]||''}' : 1)).id, r: pick(ra).id, t: pick(bi).id }, B = { b: pick(bl).id, r: pick(ra).id, t: pick(bi).id };
    let nh = 0;
    const ar = new Arena(A, B, { onHit: () => nh++ });
    const pa = aiLaunch(null, A, B), pb = aiLaunch(null, B, A);
    const real = '${MODE}' === 'real';
    if (real) { pa.power = rand(0.85, 1); pb.power = rand(0.85, 1); }   // players rip near full power
    ar.launch(0, pa.power, pa.aim); ar.launch(1, pb.power, pb.aim);
    let ev = null, lastSp = null; const spAt = [rand(0.5, 3), rand(0.5, 3)];
    for (let i = 0; i < 120 * 180 && !ev; i++) {
      if (real) for (let s = 0; s < 2; s++) {
        const me = ar.beys[s], o = ar.beys[1 - s];
        if (me.usedSpecial || (me.charge || 0) < 1 || me.state !== 'spin') continue;
        spAt[s] -= 1 / 120;
        const kind = specOf(me.cfg.b).kind, near = Math.hypot(me.x - o.x, me.z - o.z) < 2.2;
        const want = kind === 'rush' ? near : kind === 'regen' ? me.s < 0.45 : kind === 'guard' ? (o.buff && o.buff.t > 0) || me.meter > 0.4 || near : near;
        if (spAt[s] <= 0 && (want || me.s < 0.25)) { ar.special(s); lastSp = { t: ar.t, k: specOf(me.cfg.b).kind, s }; }
      }
      const e = ar.step(1 / 120); if (e.length) ev = e.slice();
    }
    if (!ev) { res.timeout++; continue; }
    if (ev.length > 1 && ev[0].side !== ev[1].side) res.draw++; else { res[ev[0].type]++; if (ev[0].type !== 'spin') { ko++; if (lastSp && ar.t - lastSp.t < 4 && lastSp.s !== ev[0].side) { spKo++; spK[lastSp.k] = (spK[lastSp.k] || 0) + 1; } } }
    times.push(ar.t); hits.push(nh);
  }
  times.sort((a, b) => a - b);
  return { ko, spKo, spK, res, med: times[times.length >> 1], avg: times.reduce((a, b) => a + b, 0) / times.length, hits: hits.reduce((a, b) => a + b, 0) / hits.length };
})()`, ctx);
const tot = Object.values(out.res).reduce((a, b) => a + b, 0);
console.log(Object.entries(out.res).map(([k, v]) => `${k} ${(v / tot * 100).toFixed(1)}%`).join('  '), `| median ${out.med.toFixed(1)}s avg ${out.avg.toFixed(1)}s | hits/round ${out.hits.toFixed(1)}`);
console.log('KOs within 4s after enemy special:', out.spKo, '/', out.ko, JSON.stringify(out.spK));
