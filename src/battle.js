/* ============================== BATTLE CONTROLLER ============================== */
const SIM_SPEED = 1.35; // battles play slightly faster than real time
const Battle = {
  active: false, opp: null, mode: '3v3', pDeck: [], oDeck: [], score: [0, 0], round: 0, errors: [0, 0],
  arena: null, phase: 'idle', phaseT: 0, timeScale: 1, slowT: 0, finishes: [], log: [],
  launch: null, playerLaunched: false, aiPlan: null, goAt: 0, acc: 0,

  start(opp, mode) {
    const P = Store.profile;
    this.opp = opp; this.mode = mode;
    this.survival = !!opp.survival;
    this.winPts = this.survival ? SURV_WIN_POINTS : WIN_POINTS;
    this.pDeck = mode === '3v3' ? P.decks.map((d) => ({ ...d })) : [{ ...P.decks[0] }];
    this.oDeck = opp.deck.map(([b, r, t]) => ({ b, r, t }));
    if (mode === '1v1') this.oDeck = [this.oDeck[Math.min(OPPONENTS.indexOf(opp) % 3, 2)]];
    this.score = [0, 0]; this.round = 0; this.errors = [0, 0]; this.finishes = []; this.active = true;
    GL.battle.setStadium(opp.stadium || 'training');
    GL.setMode('battle');
    UI.show('battle');
    $('#p1n').textContent = P.name; $('#p2n').textContent = opp.name;
    $('#p1av').innerHTML = playerAvatar(40); $('#p2av').innerHTML = oppAvatar(opp, 40);
    this.slotRes = [[], []];
    SFX.ensure(); SFX.startGrind();
    this.renderPips();
    this.nextRound();
  },
  cfgFor(side) { const d = side ? this.oDeck : this.pDeck; return d[this.round % d.length]; },
  nextRound(replay = false) {
    if (!replay) this.round++;
    const rIdx = this.round - 1;
    const a = this.pDeck[rIdx % this.pDeck.length], b = this.oDeck[rIdx % this.oDeck.length];
    this.cur = [a, b];
    $('#roundNo').textContent = this.round;
    $('#p1b').textContent = `${beyName(a)} ${beyCode(a)}`;
    $('#p2b').textContent = `${beyName(b)} ${beyCode(b)}`;
    const scene = GL.battle;
    scene.setBeys(a, b);
    scene.zoomTo = null; scene.follow = null;
    this.arena = new Arena(a, b, this.hooks());
    // boss aura: later opponents hit harder, resist more and keep spinning longer
    const boss = (this.opp && this.opp.boss) || 0;
    if (boss) {
      const c = this.arena.beys[1].c;
      applyBoss(c, boss); this.arena.beys[1].chargeRate = 1 + Math.max(0, boss) * 3;
    }
    this.renderRatchet(); this.renderDecks();
    scene.placeForLaunch(0); scene.placeForLaunch(1);
    this.playerLaunched = false; this.aiLaunched = false; this.ripStarted = false; this.aiSpecialAt = rand(0.5, 3);
    this.renderSpecial();
    this.aiPlan = aiLaunch(this.opp, b, a);
    this.timeScale = 1; this.slowT = 0; this.acc = 0;
    this.setPhase('ready');
    Launcher.reset();
    $('#launcher').hidden = false;
    this.countdown();
  },
  hooks() {
    const scene = () => GL.battle;
    return {
      onHit: (x, z, impact, a, b) => {
        const p = clamp(impact / 8, 0, 1);
        const y = surfH(Math.hypot(x, z)) + 0.25;
        const nx = b.x - a.x, nz = b.z - a.z;
        scene().fx.impact(x, y, z, p, 0xff7a2a, 0x36d3ff, nx, nz);
        scene().shake = Math.max(scene().shake, p * 1.1);
        scene().blurAt = new THREE.Vector3(x, y, z); scene().blurKick = Math.max(scene().blurKick || 0, p > 0.6 ? p * 0.7 : 0);
        SFX.clash(p);
        if (this.phase === 'fight') {
          if (p > 0.45) { this.hitStop = 0.035 + p * 0.06; }          // hit-stop freeze
          if (p > 0.75) { this.timeScale = 0.3; this.slowT = 0.25; }  // brief slow-mo on huge hits
        }
        this.renderRatchet();
      },
      onWall: (b, vr) => { const sc = scene(); sc.fx.spark(b.x * 1.08, surfH(AR.WALL) + 0.2, b.z * 1.08, 8, 2, 0x9fd0ff, 0.3); SFX.wall(vr / 5); },
      onDash: (b) => {
        const sc = scene(), r = Math.hypot(b.x, b.z) || 1;
        const rx = b.x / r, rz = b.z / r;
        if (Math.random() < 0.8) {
          // gear grinding the rail: sparks spray backward and outward
          const back = Math.atan2(-b.vz, -b.vx);
          sc.fx.spark(b.x + rx * 0.42, surfH(r) + 0.08, b.z + rz * 0.42, 3, 2.5 + b.dash * 3, b.side ? 0x8fe6ff : 0xffa040, 0.35, 0.6, back, 1.4);
        }
      },
      onOut: (b, pk) => { SFX.fall(); const sc = scene(); sc.fx.spark(b.x, surfH(AR.WALL) + 0.2, b.z, 40, 4, pk.kind === 'rift' ? 0xff4a1a : 0xffb347, 0.6, 1.2); },
      onBurst: (b, nx, nz) => { scene().burstBey(b.side, b, nx, nz); scene().shake = 1.4; SFX.burst(); this.timeScale = 0.2; this.slowT = 1.0; },
      onStop: () => {},
      onSpecialHit: (a, b, ka, kb) => {
        const sc = scene();
        for (const [bb, k] of [[a, ka], [b, kb]]) {
          if (!k) continue;
          bb.hitPulse = 1;
          const col = specOf(bb.cfg.b).color, y = surfH(Math.hypot(bb.x, bb.z)) + 0.3;
          if (k === 'guard') sc.fx.ring(bb.x, y - 0.2, bb.z, col, 1.4, 0.3);
          if (k === 'counter' || k === 'gravity') { sc.fx.star(bb.x, y, bb.z, 2.5, col, 0.25); sc.fx.spark(bb.x, y, bb.z, 30, 5, col, 0.5); }
          if (k === 'rush') { sc.fx.star(bb.x, y, bb.z, 3, col, 0.3); if (specOf(bb.cfg.b).fx === 'thunder') sc.fx.bolt(bb.x, y + 4, bb.z, bb.x, y, bb.z, 0xffffff); }
        }
      },
    };
  },
  setPhase(p) { this.phase = p; this.phaseT = 0; },
  async countdown() {
    const el = $('#count');
    const seq = ['3', '2', '1', 'GET FIGHT!'];
    this.goAt = 0;
    const token = (this._cd = Symbol());
    for (let i = 0; i < seq.length; i++) {
      if (this._cd !== token || !this.active) return;
      el.textContent = seq[i]; el.classList.toggle('long', i === 3); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      SFX.beep(i === 3); SFX.announce(i);
      if (i === 3) { this.goAt = performance.now(); this.setPhase('go'); }
      await wait(i === 3 ? 650 : 700);
    }
    if (this._cd === token) el.textContent = '';
  },
  /* called by launcher when the cord is ripped */
  playerRip(power) {
    if (this.playerLaunched || !this.active) return;
    if (this.phase === 'ready') { // early launch
      this.launchError(0, '太早發射！');
      return;
    }
    if (this.phase !== 'go' && this.phase !== 'fight') return;
    this.playerLaunched = true;
    const aim = Launcher.aim;
    this.doLaunch(0, power, aim);
    $('#powread').textContent = power >= 0.9 ? `完美發射！ ${Math.round(power * 100)}%` : `${Math.round(power * 100)}%`;
    setTimeout(() => { if (this.playerLaunched) $('#launcher').hidden = true; }, 600);
  },
  doLaunch(side, power, aim) {
    const sc = GL.battle;
    sc.beyObjs[side].userData.hover = false;
    this.arena.launch(side, power, aim);
    const b = this.arena.beys[side];
    const col = side ? 0x36d3ff : 0xff6a1a, gy = surfH(Math.hypot(b.x, b.z));
    sc.fx.spark(b.x, gy + 0.1, b.z, 50, 4, col, 0.6);
    sc.fx.star(b.x, gy + 0.3, b.z, 2.5, col, 0.25);
    sc.fx.ring(b.x, gy + 0.04, b.z, col, 1.6, 0.45);
    sc.fx.ring(b.x, gy + 0.04, b.z, 0xffffff, 0.9, 0.3);
    sc.shake = 0.3;
    if (side === 0) { SFX.launch(); sc.hideAim(); }
  },
  launchError(side, msg) {
    this._cd = null;
    this.errors[side]++;
    const second = this.errors[side] >= 2;
    UI.toast(second ? `${msg} 第 2 次發射失誤，對手得 1 分` : `${msg} 發射失誤（警告）`);
    $('#count').textContent = '';
    this.setPhase('error');
    setTimeout(() => {
      if (!this.active) return;
      if (second) {
        this.errors[side] = 0;
        this.score[1 - side] += 1; this.renderPips();
        this.finishes.push({ round: this.round, winner: 1 - side, type: 'error' });
        if (this.score[1 - side] >= this.winPts) return this.endMatch();
      }
      this.nextRound(true);
    }, 1600);
  },
  update(dtReal) {
    if (!this.active) return;
    this.phaseT += dtReal;
    const sc = GL.battle;
    // slow motion
    if (this.slowT > 0) { this.slowT -= dtReal; if (this.slowT <= 0) this.timeScale = 1; }
    let dt = dtReal * this.timeScale * SIM_SPEED;
    if (this.hitStop > 0) { this.hitStop -= dtReal; dt = 0; }
    if (this.phase === 'ready' || this.phase === 'go') {
      if (!this.playerLaunched) sc.showAim(0, Launcher.aim);
    }
    if (this.phase === 'go') {
      const since = (performance.now() - this.goAt) / 1000;
      if (!this.aiLaunched && since >= this.aiPlan.delay) { this.aiLaunched = true; this.doLaunch(1, this.aiPlan.power, this.aiPlan.aim); }
      if (!this.playerLaunched && since > 2.6 && !Launcher.holding) return this.launchError(0, '太晚發射！');
      if (!this.playerLaunched && since > 3.6) return this.launchError(0, '太晚發射！');
      if (this.playerLaunched && this.aiLaunched) this.setPhase('fight');
    }
    if (this.phase === 'fight' || this.phase === 'go' || this.phase === 'finish') {
      this.acc += dt;
      const step = 1 / 120;
      let guard = 0;
      while (this.acc >= step && guard++ < 12) {
        this.acc -= step;
        // only step bey physics for launched beys
        const evs = this.arena.step(step);
        if (evs.length && this.phase === 'fight') { this.resolve(evs.splice(0)); break; }
        if (this.phase !== 'fight') evs.length = 0;
      }
      if (guard >= 12) this.acc = 0;
    }
    sc.syncBeys(this.arena, dt);
    const [A, B] = this.arena.beys;
    if (this.phase === 'fight') sc.follow = { x: (A.x + B.x) / 2, z: (A.z + B.z) / 2 };
    // rail glow
    const dash = Math.max(A.state === 'spin' ? A.dash : 0, B.state === 'spin' ? B.dash : 0);
    sc.railMat.emissiveIntensity = lerp(sc.railMat.emissiveIntensity, dash * 0.6, 0.2);
    sc.railGlow.material.opacity = 0.05 + dash * 0.28;
    sc.dashFx = lerp(sc.dashFx || 0, this.phase === 'fight' ? dash : 0, 0.15);
    if (dash > 0.05) { const d = A.dash >= B.dash ? A : B; sc.blurAt = new THREE.Vector3(d.x, 0.5, d.z); }
    SFX.setGrind(dash);
    SFX.setHum(0, A.s, A.state === 'spin'); SFX.setHum(1, B.s, B.state === 'spin');
    this.renderGauges();
    if (this.phase === 'fight') {
      const ai = this.arena.beys[1];
      if (!ai.usedSpecial && (ai.charge || 0) >= 1 && ai.state === 'spin') {
        this.aiSpecialAt -= dtReal;
        // AI fires when it's useful: attackers near the opponent, others when low or under pressure
        const kind = specOf(ai.cfg.b).kind, me = this.arena.beys[0];
        const near = Math.hypot(ai.x - me.x, ai.z - me.z) < 2.2;
        const want = kind === 'rush' ? near : kind === 'regen' ? ai.s < 0.45 : kind === 'guard' ? (me.buff && me.buff.t > 0) || ai.meter > 0.4 || near : near;
        if (this.aiSpecialAt <= 0 && (want || ai.s < 0.25)) this.useSpecial(1);
      }
      this.renderSpecial();
    }
  },
  /* Cinematic signature move: charge -> cut-in -> burst -> resume (~2.4s, skippable) */
  useSpecial(side) {
    if (!this.active || this.phase !== 'fight' || this.cine) return;
    const sp = this.arena.special(side); if (!sp) return;
    const b = this.arena.beys[side], sc = GL.battle, y = surfH(Math.hypot(b.x, b.z));
    const col = '#' + sp.color.toString(16).padStart(6, '0');
    const cfg = side ? this.cur[1] : this.cur[0];
    this.cine = { side, sp, t0: performance.now(), stage: 'charge', timers: [] };
    this.timeScale = 0.02; this.slowT = 99;
    SFX.specialCharge();
    // 3D: close orbit camera + ground sigil
    sc.cine = { x: b.x, z: b.z, a: side ? Math.PI * 0.8 : -Math.PI * 0.2, t: 0 };
    sc.fx.sigil(b.x, y + 0.03, b.z, sp.color);
    sc.fx.spark(b.x, y + 0.2, b.z, 60, 2, sp.color, 1.2, 2);
    if (sc.fx.post) { sc.fx.post.uVig.value = 0.9; }
    // DOM overlay
    const el = $('#cine');
    el.className = 'cine ' + (side ? 'right' : 'left');
    el.style.setProperty('--sc', col);
    $('#cnPortrait').innerHTML = side ? oppAvatar(this.opp, 300) : playerAvatar(300);
    $('#cnBlade').src = Thumbs.get('blade', cfg.b);
    $('#cnWho').textContent = `${side ? this.opp.name : Store.profile.name}・${BLADE[cfg.b].name}`;
    $('#cnKind').textContent = SPECIAL_KIND[sp.kind];
    $('#cnName').innerHTML = [...sp.name].map((ch, k) => `<span style="--d:${(k * 0.07).toFixed(2)}s">${ch === '・' ? '<i class="dot"></i>' : esc(ch)}</span>`).join('');
    $('#cnInk').innerHTML = Array.from({ length: 14 }, () => `<i style="left:${rand(5, 95).toFixed(1)}%;top:${rand(15, 85).toFixed(1)}%;--s:${rand(0.4, 1.6).toFixed(2)};--d:${rand(0, 0.25).toFixed(2)}s"></i>`).join('');
    void el.offsetWidth; el.classList.add('on', 'charge');
    const T = (ms, fn) => this.cine.timers.push(setTimeout(fn, ms));
    $('#cnBeast').innerHTML = [3, 2, 1, 0].map((k) => `<div class="cn-bst g${k}">${beastSVG(cfg.b, sp.color)}</div>`).join('');
    T(450, () => this.cineCut());
    T(1150, () => this.cineBeast());
    T(2150, () => this.cineBurst());
    this.renderSpecial();
  },
  cineCut() {
    const c = this.cine; if (!c || c.stage !== 'charge') return;
    c.stage = 'cut';
    const el = $('#cine'); el.classList.remove('charge'); el.classList.add('cut');
    SFX.specialCut();
    GL.battle.shake = 0.5;
  },
  cineBeast() {
    const c = this.cine; if (!c || c.stage !== 'cut') return;
    c.stage = 'beast';
    const el = $('#cine'); el.classList.remove('cut'); el.classList.add('beast');
    SFX.roar(BEAST_OF[baseOf((c.side ? this.cur[1] : this.cur[0]).b)]);
    playRigs($('#cnBeast'), 1200);
    GL.battle.shake = 0.6;
  },
  cineBurst() {
    const c = this.cine; if (!c || c.stage === 'burst') return;
    c.stage = 'burst';
    c.timers.forEach(clearTimeout); c.timers = [];
    const sc = GL.battle, b = this.arena.beys[c.side], y = surfH(Math.hypot(b.x, b.z));
    const el = $('#cine'); el.classList.remove('charge', 'cut', 'beast'); el.classList.add('burst');
    sc.cine = null;
    sc.fx.specialBurst(b.x, y, b.z, c.sp.color);
    sc.fx.dome(b.x, y, b.z, c.sp.color);
    sc.fx.cracks(b.x, y + 0.02, b.z, c.sp.color);
    sc.shake = 1.6; sc.blurAt = new THREE.Vector3(b.x, y, b.z); sc.blurKick = 2.2; sc.fovKick = 14;
    if (sc.fx.post) { sc.fx.post.uVig.value = 0.35; sc.fx.post.uFlash.value = 0.9; sc.fx.post.uFlashCol.value.set(0xffffff); sc.fx.post.uAb.value = 2.4; }
    SFX.specialBurst();
    this.timeScale = 0.3; this.slowT = 0.55;
    setTimeout(() => { el.classList.remove('on', 'burst'); }, 650);
    this.cine = null;
  },
  skipCine() { if (this.cine) this.cineBurst(); },
  renderSpecial() {
    if (!this.arena) return;
    this.arena.beys.forEach((b, i) => {
      const bar = $(i ? '#g2sp' : '#g1sp'); if (!bar) return;
      const v = b.usedSpecial ? 0 : clamp(b.charge || 0, 0, 1);
      bar.style.width = `${v * 100}%`;
      bar.parentElement.classList.toggle('ready', v >= 1);
      bar.parentElement.classList.toggle('used', !!b.usedSpecial);
    });
    const me = this.arena.beys[0], btn = $('#spBtn');
    const ready = this.phase === 'fight' && !me.usedSpecial && (me.charge || 0) >= 1 && me.state === 'spin';
    btn.disabled = !ready; btn.classList.toggle('ready', ready);
    const sp = specOf((this.cur && this.cur[0].b) || 'wolf');
    $('#spName').textContent = me.usedSpecial ? '本回合已使用' : sp.name;
  },
  resolve(evs) {
    let ev;
    if (evs.length > 1 && evs[0].side !== evs[1].side) {
      // simultaneous finish: draw (official), unless one is a burst/out and other a spin stop
      const ranks = { rift: 3, out: 2, burst: 2, spin: 1 };
      if (ranks[evs[0].type] === ranks[evs[1].type]) return this.roundDraw();
      ev = ranks[evs[0].type] > ranks[evs[1].type] ? evs[0] : evs[1];
    } else ev = evs[0];
    const loser = ev.side, winner = 1 - loser;
    const F = FINISH[ev.type];
    this.score[winner] += F.pts;
    this.finishes.push({ round: this.round, winner, type: ev.type });
    const ri = this.round - 1;
    for (const sd of [0, 1]) { const d = sd ? this.oDeck : this.pDeck; const k = ri % d.length; (this.slotRes[sd][k] = this.slotRes[sd][k] || []).push(sd === winner ? `+${F.pts}` : '—'); }
    setTimeout(() => this.renderDecks(), 300);
    this.setPhase('finish');
    const sc = GL.battle, lb = this.arena.beys[loser];
    sc.zoomTo = { x: clamp(lb.x, -4, 4), z: clamp(lb.z, -4, 4) };
    if (ev.type !== 'burst') { this.timeScale = ev.type === 'spin' ? 0.6 : 0.3; this.slowT = 1.0; }
    const fy = surfH(Math.min(Math.hypot(lb.x, lb.z), AR.WALL)) + 0.1;
    sc.fx.ring(lb.x, fy, lb.z, winner ? 0x36d3ff : 0xff6a1a, 3, 0.7);
    sc.blurAt = new THREE.Vector3(lb.x, fy, lb.z); sc.blurKick = 1.1;
    if (ev.type === 'rift' || ev.type === 'out') { sc.fx.star(lb.x, fy + 0.3, lb.z, 4, ev.type === 'rift' ? 0xff3b1a : 0xffb347, 0.4); sc.fx.spark(lb.x, fy, lb.z, 80, 5, ev.type === 'rift' ? 0xff5a2a : 0xffc060, 0.8, 1.3); if (sc.fx.post) { sc.fx.post.uFlash.value = 0.35; sc.fx.post.uFlashCol.value.set(ev.type === 'rift' ? 0xff6a3a : 0xffd090); } }
    setTimeout(() => {
      SFX.finish();
      UI.banner(F.en, F.name, `${winner === 0 ? Store.profile.name : this.opp.name} +${F.pts}`, winner === 1);
      this.renderPips();
    }, 250);
    setTimeout(() => {
      if (!this.active) return;
      if (this.score[0] >= this.winPts || this.score[1] >= this.winPts) this.endMatch();
      else this.nextRound();
    }, 3200);
  },
  roundDraw() {
    this.setPhase('finish');
    UI.banner('DRAW', '同時終結', '平手・本回合不計分', false);
    setTimeout(() => { if (this.active) this.nextRound(true); }, 2800);
  },
  renderDecks() {
    const ri = this.round - 1;
    for (const sd of [0, 1]) {
      const d = sd ? this.oDeck : this.pDeck, cur = ri % d.length;
      $(sd ? '#g2deck' : '#g1deck').innerHTML = d.map((cfg, k) => `<span class="dk ${k === cur ? 'cur' : ''}" title="${esc(beyName(cfg))}"><img src="${Thumbs.get('blade', cfg.b)}" alt=""><i>${k + 1}</i><em>${(this.slotRes[sd][k] || []).join(' ')}</em></span>`).join('');
    }
  },
  renderPips() {
    for (const [i, id] of [[0, '#p1pips'], [1, '#p2pips']]) {
      $(id).innerHTML = Array.from({ length: this.winPts }, (_, k) => `<span class="pip ${k < this.score[i] ? 'on' : ''}"></span>`).join('');
    }
  },
  renderGauges() {
    const [A, B] = this.arena.beys;
    const fmt = (b) => Math.round(b.s * 9800).toLocaleString('en-US');
    $('#g1rpm').innerHTML = `${fmt(A)}<small>RPM</small>`; $('#g2rpm').innerHTML = `${fmt(B)}<small>RPM</small>`;
    $('#g1bar').style.width = `${clamp(A.s, 0, 1) * 100}%`; $('#g2bar').style.width = `${clamp(B.s, 0, 1) * 100}%`;
  },
  renderRatchet() {
    if (!this.arena) return;
    this.arena.beys.forEach((b, i) => {
      const n = RATCHET[b.cfg.r].prongs, filled = Math.min(n, Math.floor(clamp(b.meter, 0, 1) * n + 0.0001));
      $(i ? '#g2rat' : '#g1rat').innerHTML = `<span>鎖芯</span>` + Array.from({ length: n }, (_, k) => `<i class="${k < filled ? 'on' : ''}"></i>`).join('');
    });
  },
  /* survival run state: streak survives across matches until the first loss */
  startSurvival() {
    this.run = { streak: 0, coins: 0 };
    Store.profile.stats.runs = (Store.profile.stats.runs | 0) + 1;
    this.start(makeChallenger(1), '3v3');
  },
  again() {
    if (this.survival) {
      if (this.lastWon) return this.start(makeChallenger(this.run.streak + 1), '3v3');
      return this.startSurvival();
    }
    this.start(this.opp, this.mode);
  },
  endSurvival(won) {
    const P = Store.profile, opp = this.opp, r = this.run;
    this.lastWon = won;
    let coins = 0;
    if (won) { r.streak++; coins = 15 + Math.floor(r.streak / 5) * 25; r.coins += coins; P.coins += coins; P.stats.w++; }
    else P.stats.l++;
    for (const f of this.finishes) if (f.winner === 0 && FINISH[f.type]) P.stats[f.type] = (P.stats[f.type] | 0) + 1;
    const newBest = r.streak > (P.stats.best | 0);
    if (newBest) P.stats.best = r.streak;
    Store.save();
    if (!won || newBest) Board.submit(P.stats.best | 0);
    $('#resTitle').textContent = won ? `${r.streak} 連勝` : 'RUN OVER';
    $('#resTitle').style.color = won ? 'var(--hot2)' : 'var(--dim)';
    $('#resEye').textContent = `生存模式・${opp.title}・${opp.name}`;
    $('#resAv').innerHTML = `${playerAvatar(64)}<span class="vs">VS</span>${oppAvatar(opp, 64)}`;
    $('#resScore').innerHTML = `<span style="color:var(--hot)">${this.score[0]}</span> : <span style="color:var(--ice)">${this.score[1]}</span>`;
    const rows = [];
    if (won) rows.push(['連勝獎金', `+${coins} 金幣`]);
    rows.push(['本次連勝', `${r.streak}`], ['最高紀錄', `${P.stats.best | 0}${newBest ? '（新紀錄！）' : ''}`], ['本次累計獎金', `${r.coins} 金幣`]);
    $('#resList').innerHTML = rows.map(([k, v]) => `<span style="color:var(--hot2)">${k}</span><span style="color:var(--hot2)">${v}</span>`).join('');
    $('#resAgain').textContent = won ? '下一位挑戰者' : '再挑戰一次';
    $('#resHome').textContent = won ? '結束挑戰' : '回到大廳';
    setTimeout(() => { UI.show('result'); SFX.coin(); }, 400);
  },
  endMatch() {
    this.active = false; this._cd = null; this.cine = null; GL.battle.cine = null;
    SFX.stopGrind();
    const won = this.score[0] > this.score[1];
    if (this.survival) return this.endSurvival(won);
    $('#resAgain').textContent = '再戰一次'; $('#resHome').textContent = '回到大廳';
    const P = Store.profile, opp = this.opp, idx = OPPONENTS.indexOf(opp);
    const firstClear = won && idx >= P.ladder;
    // first clear pays full; replays pay 40%; a loss pays 10%
    let coins = won ? (idx >= P.ladder ? opp.reward : Math.round(opp.reward * 0.4)) : Math.round(opp.reward * 0.1);
    const rows = [];
    rows.push([won ? '勝利獎金' : '參戰獎勵', coins]);
    let finishBonus = 0;
    for (const f of this.finishes) if (f.winner === 0 && FINISH[f.type]) { finishBonus += FINISH[f.type].pts * 3; P.stats[f.type] = (P.stats[f.type] | 0) + 1; }
    if (finishBonus) rows.push(['終結獎勵', finishBonus]);
    coins += finishBonus;
    if (firstClear) { rows.push(['首次擊敗', 120]); coins += 120; P.ladder = idx + 1; }
    P.coins += coins;
    won ? P.stats.w++ : P.stats.l++;
    Store.save();
    $('#resTitle').textContent = won ? 'VICTORY' : 'DEFEAT';
    $('#resTitle').style.color = won ? 'var(--hot2)' : 'var(--dim)';
    $('#resEye').textContent = `${opp.title}・${opp.name}`;
    $('#resAv').innerHTML = `${playerAvatar(64)}<span class="vs">VS</span>${oppAvatar(opp, 64)}`;
    $('#resScore').innerHTML = `<span style="color:var(--hot)">${this.score[0]}</span> : <span style="color:var(--ice)">${this.score[1]}</span>`;
    const fin = this.finishes.map((f) => `<span>第 ${f.round} 回合・${f.winner === 0 ? '你' : opp.name}</span><span>${f.type === 'error' ? '發射失誤 +1' : FINISH[f.type].name + ' +' + FINISH[f.type].pts}</span>`).join('');
    $('#resList').innerHTML = fin + rows.map(([k, v]) => `<span style="color:var(--hot2)">${k}</span><span style="color:var(--hot2)">+${v} 金幣</span>`).join('') + (firstClear && idx + 1 < OPPONENTS.length ? `<span style="color:var(--sta)">解鎖新對手</span><span style="color:var(--sta)">${OPPONENTS[idx + 1].name}</span>` : '');
    setTimeout(() => { UI.show('result'); SFX.coin(); }, 400);
  },
  quit() {
    this.active = false; this._cd = null; SFX.stopGrind();
    $('#count').textContent = '';
    if (this.survival) { this.score = [0, 1]; return this.endSurvival(false); }
    UI.go('select');
  },
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Ripcord launcher input ---------- */
const Launcher = {
  holding: false, startY: 0, y: 0, ripT0: 0, maxPull: 230, aim: 0.2, done: false, samples: [],
  init() {
    const track = $('#track');
    const down = (e) => {
      if (this.done || !Battle.active) return;
      e.preventDefault();
      SFX.ensure();
      this.holding = true; this.startY = e.clientY; this.y = 0; this.ripT0 = 0; this.samples = [];
      track.classList.add('hold');
      try { track.setPointerCapture(e.pointerId); } catch (er) {}
    };
    const move = (e) => {
      if (!this.holding) return;
      const dy = clamp(e.clientY - this.startY, 0, this.maxPull);
      if (dy > 8 && !this.ripT0) {
        this.ripT0 = performance.now();
        if (Battle.phase === 'ready') { this.cancel(); Battle.playerRip(0); return; }
      }
      this.y = dy; this.samples.push([performance.now(), dy]);
      this.render();
      if (dy >= this.maxPull) this.fire();
    };
    const up = () => {
      if (!this.holding) return;
      if (this.ripT0 && this.y > 40) this.fire(); else this.cancel();
    };
    track.addEventListener('pointerdown', down);
    track.addEventListener('pointermove', move);
    track.addEventListener('pointerup', up);
    track.addEventListener('pointercancel', up);
    const aim = $('#aim');
    aim.addEventListener('input', () => { this.aim = aim.value / 100; });
    window.addEventListener('keydown', (e) => {
      if (!Battle.active || this.done) return;
      if (e.key === 'a' || e.key === 'ArrowLeft') { aim.value = Math.max(-100, +aim.value - 10); this.aim = aim.value / 100; }
      if (e.key === 'd' || e.key === 'ArrowRight') { aim.value = Math.min(100, +aim.value + 10); this.aim = aim.value / 100; }
    });
  },
  fire() {
    if (this.done) return;
    const t = (performance.now() - this.ripT0) || 1;
    const avg = this.y / t; // px per ms
    // peak speed over last 80ms
    const now = performance.now(); const rec = this.samples.filter((s) => now - s[0] < 90);
    const peak = rec.length > 1 ? (rec[rec.length - 1][1] - rec[0][1]) / Math.max(1, rec[rec.length - 1][0] - rec[0][0]) : avg;
    const speed = avg * 0.6 + peak * 0.4;
    let power = clamp((speed - 0.25) / 1.6, 0.12, 1) * clamp(this.y / this.maxPull, 0.35, 1);
    power = clamp(power, 0.12, 1);
    this.done = true; this.holding = false;
    $('#track').classList.remove('hold');
    this.y = this.maxPull; this.render();
    Battle.playerRip(power);
  },
  cancel() {
    this.holding = false; this.y = 0; this.ripT0 = 0; $('#track').classList.remove('hold'); this.render();
  },
  reset() { this.done = false; this.cancel(); $('#powread').textContent = ''; $('#aim').value = Math.round(this.aim * 100); },
  render() {
    $('#handle').style.transform = `translateY(${this.y}px)`;
    $('#tfill').style.height = `${this.y}px`;
  },
};
