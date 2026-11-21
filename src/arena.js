/* ============================== ARENA PHYSICS (pure, render-agnostic) ============================== */
let STEER = 3.5;
const AR = {
  K: 0.06,          // bowl height  h = K r^2
  RB: 3.7,          // bowl edge (start of Xtreme rail band)
  REDGE: 4.1,       // max centre radius (wall contact)
  WALL: 4.55,       // inner wall radius (visual)
  G: 4.0,
  RAD: 0.46,        // bey contact radius
  DRAIN: 0.03,
  rail: 1, drag: 1, stadium: 'training',
  pockets: [
    { kind: 'rift', phi: Math.PI, half: 0.42, vmin: 1.7 },
    { kind: 'out', phi: 0.38 * Math.PI, half: 0.3, vmin: 2.1 },
    { kind: 'out', phi: -0.38 * Math.PI, half: 0.3, vmin: 2.1 },
  ],
  launchPos: [{ x: 1.0, z: 2.3 }, { x: -1.0, z: -2.3 }],
};
function surfH(r) { return r < AR.RB ? AR.K * r * r : AR.K * AR.RB * AR.RB + (r - AR.RB) * 0.12; }
function surfSlope(r) { return r < AR.RB ? 2 * AR.K * r : 0.12; }
function angDiff(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
/* load a stadium's physics into AR */
function applyStadium(id) {
  const S = STADIUMS[id] || STADIUMS.training;
  AR.stadium = id; AR.K = S.K; AR.G = 4.0 * S.grav; AR.rail = S.rail; AR.drag = S.drag;
  AR.pockets = S.pockets.map((p) => ({ ...p, vmin: p.kind === 'rift' ? 1.7 : 2.1 }));
}
function pocketAt(phi) { for (const p of AR.pockets) if (Math.abs(angDiff(phi, p.phi)) < p.half) return p; return null; }

function physCfg(cfg) {
  const st = beyStats(cfg), B = BLADE[cfg.b], R = RATCHET[cfg.r], T = BIT[cfg.t];
  return {
    m: st.weight / 42, atk: st.atk / 100, def: st.def / 100, sta: st.sta / 100,
    mob: T.mob, grip: T.grip, drain: T.drain, stab: clamp(T.stab + R.stab, 0.1, 1),
    burstRes: R.burst, prongs: R.prongs, recoil: B.recoil, high: R.h >= 70 || T.tip === 'hneedle',
  };
}
function launchVector(side, power, aim) {
  const p0 = AR.launchPos[side], r = Math.hypot(p0.x, p0.z);
  const cx = -p0.x / r, cz = -p0.z / r;           // toward centre
  const tx = -p0.z / r, tz = p0.x / r;            // rail tangent (dash direction)
  const th = (0.32 + aim * 0.52) * Math.PI / 2;
  const dx = cx * Math.cos(th) + tx * Math.sin(th), dz = cz * Math.cos(th) + tz * Math.sin(th);
  const sp = 1.0 + power * 3.4;
  return { x: p0.x, z: p0.z, vx: dx * sp, vz: dz * sp, s: 0.58 + 0.42 * power };
}
class Arena {
  constructor(cfgA, cfgB, hooks = {}) {
    this.hooks = hooks; this.t = 0; this.events = []; this.over = false;
    this.beys = [cfgA, cfgB].map((cfg, i) => ({
      side: i, cfg, c: physCfg(cfg), x: 0, z: 0, vx: 0, vz: 0, s: 0, state: 'idle', meter: 0,
      y: 0, tilt: 0, prec: 0, dash: 0, outT: 0, pocket: null, hitCool: 0, launched: false, spinAng: Math.random() * TAU,
    }));
  }
  launch(side, power, aim) {
    const b = this.beys[side], L = launchVector(side, power, aim);
    Object.assign(b, { x: L.x, z: L.z, vx: L.vx, vz: L.vz, s: L.s, state: 'spin', launched: true, power });
  }
  step(dt) {
    this.t += dt;
    for (const b of this.beys) this.stepBey(b, dt);
    const [a, b] = this.beys;
    if (a.state === 'spin' && b.state === 'spin') this.collide(a, b);
    return this.events;
  }
  special(side) {
    const b = this.beys[side]; if (b.state !== 'spin' || b.usedSpecial || (b.charge || 0) < 1) return null;
    const sp = SPECIALS[b.cfg.b];
    b.usedSpecial = true; b.charge = 0;
    b.buff = { kind: sp.kind, t: sp.dur, fx: sp.fx };
    if (sp.kind === 'regen') b.s = Math.min(1, b.s + 0.03);
    if (sp.kind === 'counter') b.s = Math.min(1, b.s + 0.08);
    if (sp.kind === 'guard') b.meter = Math.max(0, b.meter - 0.35);
    if (sp.kind === 'rush') { const v = Math.hypot(b.vx, b.vz) || 1; const o = this.beys[1 - side]; const dx = o.x - b.x, dz = o.z - b.z, l = Math.hypot(dx, dz) || 1; b.vx = (dx / l) * Math.max(v, 4.5); b.vz = (dz / l) * Math.max(v, 4.5); }
    return sp;
  }
  emit(type, side) { this.events.push({ type, side, t: this.t }); }
  stepBey(b, dt) {
    if (b.state === 'idle') return;
    if (b.hitCool > 0) b.hitCool -= dt;
    b.spinAng += (18 + b.s * 40) * dt;
    if (b.state === 'out') return this.stepOut(b, dt);
    if (b.state === 'stopped' || b.state === 'burst') {
      b.vx *= Math.exp(-4 * dt); b.vz *= Math.exp(-4 * dt);
      b.x += b.vx * dt; b.z += b.vz * dt;
      b.tilt = lerp(b.tilt, 0.55, dt * 3);
      return;
    }
    const c = b.c, s = b.s;
    const bf = b.buff && b.buff.t > 0 ? b.buff : null;
    if (b.buff) { b.buff.t -= dt; if (b.buff.t <= 0) b.buff = null; }
    const rush = bf && bf.kind === 'rush' ? 1 : 0;
    let { x, z, vx, vz } = b;
    let r = Math.hypot(x, z) || 1e-6;
    const rx = x / r, rz = z / r;
    let ax = 0, az = 0;
    const sl = surfSlope(r);
    ax -= rx * AR.G * sl; az -= rz * AR.G * sl;
    const sp = Math.hypot(vx, vz);
    if (sp > 0.02) {
      const ux = vx / sp, uz = vz / sp;
      const target = 0.35 + c.mob * 3.5 * s + rush * 2.2;
      const gain = c.mob * 1.5;
      ax += ux * (target - sp) * gain; az += uz * (target - sp) * gain;
      const curv = c.mob * 0.7 * s * Math.min(sp, 3);
      ax += -uz * curv; az += ux * curv;
    }
    // aggressive tips wander into the opponent's path (steer heading, not pull, so they don't orbit)
    const o = this.beys[1 - b.side];
    if ((c.mob > 0.4 || rush) && o.state === 'spin' && !(b.kick > 0) && sp > 0.5) {
      const want = Math.atan2(o.z - z, o.x - x), cur = Math.atan2(vz, vx);
      const d = angDiff(want, cur), rate = (Math.max(c.mob, rush ? 0.9 : 0) - 0.3) * STEER * (1 + rush * 1.2) * s * dt;
      const na = cur + clamp(d, -rate, rate);
      vx = Math.cos(na) * sp; vz = Math.sin(na) * sp;
    }
    // flower pattern: aggressive tips climb toward the rail
    if (c.mob > 0.3) { const ob = (c.mob - 0.3) * 4.2 * (0.4 + 0.6 * s); ax += rx * ob; az += rz * ob; }
    // wobble when low on spin: precession pushes bey around
    if (s < 0.25) {
      const w = (0.25 - s) * 6 * (1.1 - c.stab);
      b.prec += dt * (6 + (0.25 - s) * 20);
      ax += Math.cos(b.prec) * w; az += Math.sin(b.prec) * w;
    }
    const drag = (0.18 + (1 - c.mob) * 0.5) * AR.drag;
    ax -= vx * drag; az -= vz * drag;
    // Xtreme rail
    b.dash = 0;
    if (b.kick > 0) b.kick -= dt;
    if (r >= AR.RB - 0.05 && !(b.kick > 0)) {
      const tx = -rz, tz = rx;
      if (c.grip > 0.1 && s > 0.1) {
        const acc = 7.5 * c.grip * (0.35 + 0.65 * s) * (1 + rush * 0.7) * AR.rail;
        ax += tx * acc; az += tz * acc;
        const vt = vx * tx + vz * tz;
        b.railT = (b.railT || 0) + dt;
        if (vt > 2.8) { b.dash = clamp((vt - 2.8) / 4, 0, 1); b.s -= dt * 0.012 * c.grip; if (this.hooks.onDash) this.hooks.onDash(b); }
        if (vt > 2.2) {
          // gear kicks the bey off the rail and across the stadium
          if (b.railT > 0.3 && Math.random() < dt * (2.2 + 2 * c.grip)) {
            const sp2 = Math.max(3.4, Math.hypot(vx, vz) * rand(1.0, 1.2));
            const o = this.beys[1 - b.side];
            let ix, iz;
            if (o.state === 'spin' && Math.random() < 0.8) {
              // rail launch line heads across the bowl toward the opponent's area
              const te = Math.hypot(o.x - x, o.z - z) / Math.max(sp2, 1);
              const ox = o.x + o.vx * te + rand(-0.55, 0.55) - x, oz = o.z + o.vz * te + rand(-0.55, 0.55) - z, ol = Math.hypot(ox, oz) || 1;
              ix = ox / ol; iz = oz / ol;
              if (ix * tx + iz * tz < 0.1) { ix += tx * 0.4; iz += tz * 0.4; const l2 = Math.hypot(ix, iz); ix /= l2; iz /= l2; }
            } else {
              const ang = rand(0.95, 1.45);
              ix = tx * Math.cos(ang) - rx * Math.sin(ang); iz = tz * Math.cos(ang) - rz * Math.sin(ang);
            }
            vx = ix * sp2; vz = iz * sp2; b.railT = 0; b.kick = 0.35;
          }
        }
      }
      // rail friction keeps it hugging
      ax += rx * 0.6; az += rz * 0.6;
    }
    // opponent's gravity field pulls this bey in
    if (o.buff && o.buff.t > 0 && o.buff.kind === 'gravity' && o.state === 'spin') {
      const gx = o.x - x, gz = o.z - z, gl = Math.hypot(gx, gz) || 1;
      ax += (gx / gl) * 3.0; az += (gz / gl) * 3.0;
    }
    vx += ax * dt; vz += az * dt;
    const vmax = 9;
    const v2 = Math.hypot(vx, vz); if (v2 > vmax) { vx *= vmax / v2; vz *= vmax / v2; }
    x += vx * dt; z += vz * dt;
    r = Math.hypot(x, z);
    if (r > AR.REDGE) {
      const nx = x / r, nz = z / r, vr = vx * nx + vz * nz;
      const phi = Math.atan2(x, z), pk = pocketAt(phi);
      const selfOut = this.t - (b.lastHit || -9) > 0.8 ? 3.6 : 0;
      if (pk && vr > pk.vmin + selfOut) {
        b.state = 'out'; b.pocket = pk; b.outT = 0;
        b.x = x; b.z = z; b.vx = vx; b.vz = vz;
        this.emit(pk.kind, b.side);
        if (this.hooks.onOut) this.hooks.onOut(b, pk);
        return;
      }
      if (vr > 0) { vx -= nx * vr * 1.5; vz -= nz * vr * 1.5; b.s -= vr * 0.004; if (this.hooks.onWall && vr > 1.2) this.hooks.onWall(b, vr); }
      x = nx * AR.REDGE; z = nz * AR.REDGE;
    }
    b.x = x; b.z = z; b.vx = vx; b.vz = vz;
    const late = this.t > 75 ? 1 + (this.t - 75) * 0.15 : 1;
    if (!b.usedSpecial) b.charge = Math.min(1, (b.charge || 0) + dt / 11 + b.dash * dt * 0.25);
    const regen = bf ? (bf.kind === 'regen' ? 0.8 : bf.kind === 'guard' ? 0.65 : 1) : 1;
    b.s -= (dt * AR.DRAIN * c.drain * (1.25 - 0.55 * c.sta) * late + dt * sp * 0.0012 * (1 - c.stab)) * regen;
    b.tilt = s < 0.22 ? (0.22 - s) * 2.2 : lerp(b.tilt, Math.min(sp * 0.02, 0.08), dt * 5);
    if (b.s <= 0.035) { b.s = 0; b.state = 'stopped'; this.emit('spin', b.side); if (this.hooks.onStop) this.hooks.onStop(b); }
  }
  stepOut(b, dt) {
    b.outT += dt;
    b.vx *= Math.exp(-2.2 * dt); b.vz *= Math.exp(-2.2 * dt);
    b.x += b.vx * dt; b.z += b.vz * dt;
    const r = Math.hypot(b.x, b.z), maxR = 5.45;
    if (r > maxR) { b.x *= maxR / r; b.z *= maxR / r; b.vx *= -0.3; b.vz *= -0.3; }
    b.s = Math.max(0, b.s - dt * 0.25);
    b.tilt = lerp(b.tilt, 0.5, dt * 2);
  }
  collide(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), minD = AR.RAD * 2;
    if (d >= minD || d < 1e-5) return;
    const nx = dx / d, nz = dz / d;
    const ca = a.c, cb = b.c;
    // separate
    const ov = minD - d, tm = ca.m + cb.m;
    a.x -= nx * ov * (cb.m / tm); a.z -= nz * ov * (cb.m / tm);
    b.x += nx * ov * (ca.m / tm); b.z += nz * ov * (ca.m / tm);
    const rvx = b.vx - a.vx, rvz = b.vz - a.vz, vn = rvx * nx + rvz * nz;
    if (vn > 0 && a.hitCool > 0) return;
    const approach = Math.max(0, -vn);
    const e = 0.32;
    const j = ((1 + e) * approach) / (1 / ca.m + 1 / cb.m);
    // spin clash: right-spin vs right-spin surfaces meet head-on -> violent push
    const aggA = ca.atk * ca.recoil, aggB = cb.atk * cb.recoil;
    const spinF = (a.s + b.s) * 0.5;
    const clash = 1.5 * spinF * (0.35 + aggA + aggB) * (0.5 + Math.min(approach, 6) * 0.25);
    const ka = a.buff && a.buff.t > 0 ? a.buff.kind : '', kb = b.buff && b.buff.t > 0 ? b.buff.kind : '';
    const defA = ka === 'guard' ? 0.55 : 0, defB = kb === 'guard' ? 0.55 : 0;
    const rushA = ka === 'rush' ? 1.45 : 1, rushB = kb === 'rush' ? 1.45 : 1;
    const ctrA = ka === 'counter' || ka === 'gravity', ctrB = kb === 'counter' || kb === 'gravity';
    let jA = (j + clash * (0.6 + aggB)) * (1 - ca.def * 0.5) * rushB * (1 - defA) * (ctrA ? 0.6 : 1) * (ctrB ? 1.4 : 1);
    let jB = (j + clash * (0.6 + aggA)) * (1 - cb.def * 0.5) * rushA * (1 - defB) * (ctrB ? 0.6 : 1) * (ctrA ? 1.4 : 1);
    if (this.hooks.onSpecialHit && (ka || kb)) this.hooks.onSpecialHit(a, b, ka, kb);
    a.vx -= nx * jA / ca.m; a.vz -= nz * jA / ca.m;
    b.vx += nx * jB / cb.m; b.vz += nz * jB / cb.m;
    // tangential kick (surfaces rub in opposite directions)
    const tx = -nz, tz = nx, tk = clash * 0.35;
    a.vx += tx * tk / ca.m; a.vz += tz * tk / ca.m;
    b.vx -= tx * tk / cb.m; b.vz -= tz * tk / cb.m;
    const impact = approach + clash * 0.6;
    // spin loss
    const lossA = impact * 0.02 * (0.25 + aggB * 1.4) / (0.6 + ca.def) * (1.1 - ca.sta * 0.3);
    const lossB = impact * 0.02 * (0.25 + aggA * 1.4) / (0.6 + cb.def) * (1.1 - cb.sta * 0.3);
    a.s -= Math.min(lossA, 0.16); b.s -= Math.min(lossB, 0.16);
    a.hitCool = b.hitCool = 0.06; a.lastHit = b.lastHit = this.t;
    // ratchet loosening -> burst
    const hiA = cb.high && !ca.high ? 1.15 : 1, hiB = ca.high && !cb.high ? 1.15 : 1;
    const thr = 2.0;
    const incA = Math.max(0, impact - thr) * 0.055 * (0.35 + cb.atk * cb.recoil) * (1.5 - a.s) / ca.burstRes * hiA * rand(0.5, 1.5);
    const incB = Math.max(0, impact - thr) * 0.055 * (0.35 + ca.atk * ca.recoil) * (1.5 - b.s) / cb.burstRes * hiB * rand(0.5, 1.5);
    a.meter += incA * (ka === 'guard' ? 0.2 : 1) * (kb === 'rush' ? 1.12 : 1);
    b.meter += incB * (kb === 'guard' ? 0.2 : 1) * (ka === 'rush' ? 1.12 : 1);
    if (ctrA) { b.s -= lossA * 0.35; a.s += lossA * 0.25; }
    if (ctrB) { a.s -= lossB * 0.35; b.s += lossB * 0.25; }
    if (ka === 'guard') a.s += Math.min(lossA, 0.16) * 0.6;
    if (kb === 'guard') b.s += Math.min(lossB, 0.16) * 0.6;
    a.charge = Math.min(1, (a.charge || 0) + impact * 0.035); b.charge = Math.min(1, (b.charge || 0) + impact * 0.035);
    if (this.hooks.onHit) this.hooks.onHit(a.x + nx * AR.RAD, a.z + nz * AR.RAD, impact, a, b);
    const burstA = a.meter >= 1, burstB = b.meter >= 1;
    if (burstA && burstB) { // the one closer to bursting goes
      if (a.meter >= b.meter) this.burst(a, nx, nz, -1); else this.burst(b, nx, nz, 1);
    } else if (burstA) this.burst(a, nx, nz, -1);
    else if (burstB) this.burst(b, nx, nz, 1);
    if (a.s <= 0.035 && a.state === 'spin') { a.s = 0; a.state = 'stopped'; this.emit('spin', a.side); }
    if (b.s <= 0.035 && b.state === 'spin') { b.s = 0; b.state = 'stopped'; this.emit('spin', b.side); }
  }
  burst(b, nx, nz, sign) {
    b.state = 'burst'; b.meter = 1;
    this.emit('burst', b.side);
    if (this.hooks.onBurst) this.hooks.onBurst(b, nx * sign, nz * sign);
  }
}
/* AI launch choice */
function aiLaunch(opp, cfg, playerCfg) {
  const T = BLADE[cfg.b].type, smart = opp ? opp.smart : 0.5;
  let aim = { atk: 0.75, def: -0.6, sta: -0.45, bal: 0.15 }[T];
  if (BIT[cfg.t].grip > 0.8) aim = Math.max(aim, 0.55);
  aim = clamp(aim + rand(-1, 1) * (1 - smart) * 0.9, -1, 1);
  const [lo, hi] = opp ? opp.pow : [0.6, 0.9];
  return { power: rand(lo, hi), aim, delay: rand(0.05, 0.35) };
}
