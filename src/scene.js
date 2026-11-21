/* ============================== RENDERER / SCENES ============================== */
const GL = {
  renderer: null, composer: null, bloom: null, env: null, mode: 'show',
  show: null, battle: null, w: 1, h: 1,
  init() {
    const canvas = $('#gl');
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    this.env = makeEnv(r);
    this.show = new Showcase(this.env);
    this.battle = new BattleScene(this.env);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },
  resize() {
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.renderer.setSize(this.w, this.h, false);
    for (const s of [this.show, this.battle]) { s.cam.aspect = this.w / this.h; s.cam.updateProjectionMatrix(); s.layout && s.layout(); }
    this.buildComposer();
  },
  buildComposer() {
    if (!THREE.EffectComposer || !THREE.UnrealBloomPass) { this.composer = null; return; }
    const scene = this.mode === 'battle' ? this.battle : this.show;
    this.composer = new THREE.EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.composer.setSize(this.w, this.h);
    this.composer.addPass(new THREE.RenderPass(scene.scene, scene.cam));
    this.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(this.w, this.h), this.mode === 'battle' ? 0.85 : 0.55, 0.5, this.mode === 'battle' ? 0.8 : 0.9);
    this.composer.addPass(this.bloom);
    if (THREE.GammaCorrectionShader) this.composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
    this.postPass = new THREE.ShaderPass(PostShader);
    this.composer.addPass(this.postPass);
    this.battle.fx.post = this.mode === 'battle' ? this.postPass.uniforms : null;
    if (this.mode !== 'battle') this.postPass.uniforms.uVig.value = 0.45;
  },
  setMode(m) { if (this.mode !== m) { this.mode = m; this.buildComposer(); } },
  render(dt) {
    const s = this.mode === 'battle' ? this.battle : this.show;
    s.update(dt);
    if (this.composer) this.composer.render(); else this.renderer.render(s.scene, s.cam);
  },
};

/* ---------- Showcase: pedestal for assembly / hub / gacha / collection ---------- */
class Showcase {
  constructor(env) {
    const sc = (this.scene = new THREE.Scene());
    sc.environment = env;
    sc.background = new THREE.Color(0x06080e);
    sc.fog = new THREE.Fog(0x06080e, 8, 22);
    this.cam = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
    this.cam.position.set(0, 1.6, 3.4);
    sc.add(new THREE.HemisphereLight(0xbfd4ff, 0x1a1420, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2.5, 4, 2); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
    sc.add(key);
    const rim1 = new THREE.PointLight(0xff6a1a, 2.2, 8); rim1.position.set(-2, 0.8, -1.5); sc.add(rim1);
    const rim2 = new THREE.PointLight(0x36d3ff, 1.8, 8); rim2.position.set(2.2, 0.6, -1.8); sc.add(rim2);
    // pedestal
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.12, 64), new THREE.MeshStandardMaterial({ color: 0x0c0f18, metalness: 0.4, roughness: 0.6, envMapIntensity: 0.3 }));
    ped.position.y = -0.06; ped.receiveShadow = true; sc.add(ped);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: 0xff6a1a }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.002; sc.add(ring); this.ring = ring;
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.57, 96), new THREE.MeshBasicMaterial({ color: 0x36d3ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.003; sc.add(ring2); this.ring2 = ring2;
    // floor grid
    const grid = new THREE.GridHelper(30, 60, 0x1a2236, 0x111827); grid.position.y = -0.12; sc.add(grid);
    // floating dust
    const n = 300, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = rand(-6, 6); pos[i * 3 + 1] = rand(0, 4); pos[i * 3 + 2] = rand(-6, 3); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffa060, size: 0.02, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    sc.add(this.dust);
    this.holder = new THREE.Group(); sc.add(this.holder);
    this.obj = null; this.t = 0; this.offset = 0; this.spinSpeed = 0.6; this.zoom = 1; this.lookY = 0.25;
    this.drop = []; this.flash = 0;
  }
  layout() { this.applyOffset(); }
  setOffset(fx) { this.offset = fx; this.applyOffset(); }
  applyOffset() {
    const w = GL.w, h = GL.h;
    if (this.offset) this.cam.setViewOffset(w, h, -w * this.offset, 0, w, h); else this.cam.clearViewOffset();
  }
  clear() { if (this.obj) { this.holder.remove(this.obj); disposeTree(this.obj); this.obj = null; } this.drop = []; }
  showBey(cfg, animate = true) {
    this.clear();
    const bey = buildBey(cfg);
    this.obj = bey; this.holder.add(bey);
    bey.traverse((n) => { if (n.isMesh) n.castShadow = true; });
    this.zoom = 1; this.lookY = 0.25;
    if (animate) {
      const p = bey.userData.parts;
      [p.bit, p.ratchet, p.blade].forEach((part, i) => {
        const base = part.position.y;
        part.position.y = base + 1.2 + i * 0.35;
        this.drop.push({ part, base, t: -i * 0.12 });
      });
    }
  }
  /* animate a single part changing (assembly) */
  swapPart(cfg, kind) {
    if (!this.obj) return this.showBey(cfg, true);
    this.showBey(cfg, false);
    const p = this.obj.userData.parts[kind];
    const base = p.position.y; p.position.y = base + 1.0;
    this.drop.push({ part: p, base, t: 0 });
  }
  showPart(kind, id) {
    this.clear();
    const g = buildPart(kind, id);
    g.traverse((n) => { if (n.isMesh) n.castShadow = true; });
    const box = new THREE.Box3().setFromObject(g); const sz = box.getSize(new THREE.Vector3());
    const s = 0.75 / Math.max(sz.x, sz.y, sz.z);
    const wrap = new THREE.Group(); wrap.add(g); g.scale.setScalar(s);
    g.position.y = 0.05;
    if (kind === 'blade') { wrap.rotation.x = 0.35; }
    this.obj = wrap; this.holder.add(wrap);
    wrap.position.y = 1.4; this.drop.push({ part: wrap, base: 0.12, t: 0 });
    this.flash = 1;
  }
  update(dt) {
    this.t += dt;
    this.holder.rotation.y += dt * this.spinSpeed;
    this.ring.material.color.setHSL(0.06, 1, 0.5 + Math.sin(this.t * 2) * 0.08);
    this.ring2.rotation.z += dt * 0.4;
    this.ring2.material.opacity = 0.35 + this.flash * 0.6;
    this.flash = Math.max(0, this.flash - dt * 1.2);
    for (const d of this.drop) {
      d.t += dt;
      if (d.t < 0) continue;
      const k = clamp(d.t / 0.45, 0, 1);
      const e = k < 1 ? 1 - Math.pow(1 - k, 3) : 1;
      const bounce = k >= 1 ? Math.max(0, Math.sin((d.t - 0.45) * 22) * 0.03 * Math.exp(-(d.t - 0.45) * 10)) : 0;
      d.part.position.y = lerp(d.part.position.y, d.base, e) + bounce;
      if (k >= 1 && !d.clicked) { d.clicked = true; if (SFX.ctx) SFX.tone(1800, 0.05, 0.05, 'square'); }
    }
    this.drop = this.drop.filter((d) => d.t < 1.2);
    const p = this.dust.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt * 0.08; if (y > 4) y = 0; p.setY(i, y); }
    p.needsUpdate = true;
    const r = 3.3 / this.zoom;
    this.cam.position.set(Math.sin(this.t * 0.15) * 0.4, 1.35 + Math.sin(this.t * 0.3) * 0.05, r);
    this.cam.lookAt(0, this.lookY, 0);
  }
}

/* ---------- Battle scene: stadium, beys, effects ---------- */
class BattleScene {
  constructor(env) {
    const sc = (this.scene = new THREE.Scene());
    sc.environment = env;
    sc.background = new THREE.Color(0x05070c);
    sc.fog = new THREE.Fog(0x05070c, 14, 30);
    this.cam = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    this.camBase = new THREE.Vector3(0, 9.8, 9.4);
    this.cam.position.copy(this.camBase); this.cam.lookAt(0, 0, 0.4);
    this.look = new THREE.Vector3(0, 0, 0.4);
    this.shake = 0; this.t = 0; this.zoomTo = null;
    sc.add(new THREE.HemisphereLight(0xa9c4ff, 0x14101a, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(4, 12, 6); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
    key.shadow.bias = -0.0005; sc.add(key);
    const s1 = new THREE.SpotLight(0xff7a2a, 1.4, 30, 0.5, 0.6); s1.position.set(-9, 7, -4); sc.add(s1);
    const s2 = new THREE.SpotLight(0x36d3ff, 1.2, 30, 0.5, 0.6); s2.position.set(9, 7, -4); sc.add(s2);
    this.spots = [s1, s2];
    this.setStadium('training');
    this.fx = new FX(sc);
    this.beyObjs = [null, null];
    this.auras = [0, 1].map((i) => new FlameAura(sc, i ? 0x36d3ff : 0xff6a1a));
    this.trails = [0, 1].map((i) => new Trail(sc, i ? 0x36d3ff : 0xff6a1a));
    this.shields = [0, 1].map(() => new Shield(sc));
    this.baseCols = [0xff6a1a, 0x36d3ff];
    this.arrow = this.makeArrow(); sc.add(this.arrow);
    this.ghost = null;
  }
  setStadium(id) {
    applyStadium(id);
    if (this.stadium) { this.scene.remove(this.stadium); disposeTree(this.stadium); this.stadium.traverse((n) => n.geometry && n.geometry.dispose()); }
    const T = STADIUMS[AR.stadium].theme;
    this.scene.background = new THREE.Color(T.bg);
    this.scene.fog = new THREE.Fog(T.bg, 14, 30);
    this.spots[0].color.set(T.light[0]); this.spots[1].color.set(T.light[1]);
    this.buildStadium(T);
  }
  drawFloor(x, T) {
    const grd = x.createRadialGradient(512, 512, 40, 512, 512, 512);
    grd.addColorStop(0, T.floor[0]); grd.addColorStop(0.6, T.floor[1]); grd.addColorStop(1, T.floor[2]);
    x.fillStyle = grd; x.fillRect(0, 0, 1024, 1024);
    x.strokeStyle = T.line; x.lineWidth = 2;
    const C = 512, R = 500;
    const ring = (r, w = 2) => { x.lineWidth = w; x.beginPath(); x.arc(C, C, r, 0, TAU); x.stroke(); };
    const spoke = (a, r0, r1) => { x.beginPath(); x.moveTo(C + Math.cos(a) * r0, C + Math.sin(a) * r0); x.lineTo(C + Math.cos(a) * r1, C + Math.sin(a) * r1); x.stroke(); };
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    switch (T.pattern) {
      case 'radial': for (let i = 1; i <= 7; i++) ring(i * 66); for (let i = 0; i < 36; i++) spoke((i / 36) * TAU, 70, R); break;
      case 'ripple': for (let i = 1; i <= 14; i++) ring(i * 34 + Math.sin(i) * 6, 1 + (i % 3)); for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(C + Math.cos(i) * 260, C + Math.sin(i * 1.7) * 260, 30 + i * 4, 0, TAU); x.stroke(); } break;
      case 'plate': for (let i = 1; i <= 5; i++) ring(i * 95, 4); for (let i = 0; i < 16; i++) spoke((i / 16) * TAU, 95, R);
        x.fillStyle = T.line; for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU, r = 95 * (2 + (i % 4)); x.beginPath(); x.arc(C + Math.cos(a) * r, C + Math.sin(a) * r, 5, 0, TAU); x.fill(); } break;
      case 'spiral': for (let k = 0; k < 6; k++) { x.lineWidth = 3; x.beginPath(); for (let t = 0; t < 1; t += 0.01) { const a = k / 6 * TAU + t * 5, r = 60 + t * 440; t ? x.lineTo(C + Math.cos(a) * r, C + Math.sin(a) * r) : x.moveTo(C + Math.cos(a) * r, C + Math.sin(a) * r); } x.stroke(); } ring(480, 3); break;
      case 'star': for (let i = 1; i <= 6; i++) ring(i * 80); for (let k = 0; k < 2; k++) { x.lineWidth = 3; x.beginPath(); for (let i = 0; i <= 5; i++) { const a = (i * 2 / 5) * TAU + k * Math.PI / 5 - Math.PI / 2, r = 300; i ? x.lineTo(C + Math.cos(a) * r, C + Math.sin(a) * r) : x.moveTo(C + Math.cos(a) * r, C + Math.sin(a) * r); } x.stroke(); }
        x.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 120; i++) { x.beginPath(); x.arc(rnd() * 1024, rnd() * 1024, rnd() * 2, 0, TAU); x.fill(); } break;
      case 'crystal': for (let i = 0; i < 26; i++) { const a = rnd() * TAU, r0 = rnd() * 200, r1 = r0 + 120 + rnd() * 260; x.lineWidth = 1 + rnd() * 2; spoke(a, r0, r1); spoke(a + 0.08, r1 - 60, r1); spoke(a - 0.08, r1 - 60, r1); } ring(470, 3); break;
      case 'crack': { x.lineWidth = 3; x.shadowColor = 'rgba(255,90,20,0.9)'; x.shadowBlur = 18;
        for (let k = 0; k < 14; k++) { let a = rnd() * TAU, r = 40; x.beginPath(); x.moveTo(C + Math.cos(a) * r, C + Math.sin(a) * r); while (r < R) { r += 30 + rnd() * 40; a += (rnd() - 0.5) * 0.35; x.lineTo(C + Math.cos(a) * r, C + Math.sin(a) * r); } x.stroke(); }
        x.shadowBlur = 0; break; }
      case 'throne': for (let i = 1; i <= 6; i++) ring(i * 78, i % 2 ? 2 : 4); for (let i = 0; i < 24; i++) spoke((i / 24) * TAU, 78, R);
        x.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; x.beginPath(); x.moveTo(C + Math.cos(a - 0.12) * 380, C + Math.sin(a - 0.12) * 380); x.lineTo(C + Math.cos(a) * 440, C + Math.sin(a) * 440); x.lineTo(C + Math.cos(a + 0.12) * 380, C + Math.sin(a + 0.12) * 380); x.stroke(); } break;
    }
    const acc = '#' + new THREE.Color(T.accent).getHexString();
    x.strokeStyle = acc; x.globalAlpha = 0.6; ring(60, 6); x.globalAlpha = 0.25;
    x.fillStyle = acc; x.font = '900 70px "Noto Sans TC",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('旋', C, C + 4); x.globalAlpha = 1;
  }
  buildStadium(T) {
    const sc = this.scene, g = new THREE.Group(); this.stadium = g; sc.add(g);
    const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
    this.drawFloor(x, T);
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    // bowl surface as a polar-mapped disc with displaced height
    const seg = 96, rings = 40, Rf = AR.WALL;
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= rings; j++) {
      const r = (j / rings) * Rf;
      for (let i = 0; i <= seg; i++) {
        const th = (i / seg) * TAU;
        const px = Math.sin(th) * r, pz = Math.cos(th) * r;
        pos.push(px, surfH(r), pz);
        uv.push(0.5 + (px / Rf) * 0.5, 0.5 - (pz / Rf) * 0.5);
      }
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = j * (seg + 1) + i, b = a + seg + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    bg.setIndex(idx); bg.computeVertexNormals();
    const bowl = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ map: tex, metalness: 0.2, roughness: T.pattern === 'crystal' ? 0.15 : T.pattern === 'ripple' ? 0.25 : 0.55, emissive: T.pattern === 'crack' ? 0xffffff : 0x000000, emissiveMap: T.pattern === 'crack' ? tex : null, emissiveIntensity: T.pattern === 'crack' ? 0.35 : 0 }));
    bowl.receiveShadow = true; g.add(bowl);
    // Xtreme rail: toothed ring
    const teeth = 160, tg = new THREE.BoxGeometry(0.07, 0.07, 0.12);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.85, roughness: 0.3, emissive: 0xff5a10, emissiveIntensity: 0 });
    const rail = new THREE.InstancedMesh(tg, railMat, teeth);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < teeth; i++) {
      const th = (i / teeth) * TAU, rr = AR.REDGE + 0.36;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), th);
      m.compose(new THREE.Vector3(Math.sin(th) * rr, surfH(rr) + 0.03, Math.cos(th) * rr), q, one);
      rail.setMatrixAt(i, m);
    }
    rail.receiveShadow = true; g.add(rail); this.railMat = railMat; this.rail = rail; this.railTeeth = teeth;
    this.railHeat = new Float32Array(teeth);
    for (let i = 0; i < teeth; i++) rail.setColorAt(i, new THREE.Color(0x9aa4b8));
    const glow = new THREE.Mesh(new THREE.RingGeometry(AR.RB, AR.WALL, 128, 1), new THREE.MeshBasicMaterial({ color: T.accent, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = surfH(AR.RB) + 0.02; g.add(glow); this.railGlow = glow;
    // walls with pocket gaps
    const wallMat = new THREE.MeshPhysicalMaterial({ color: T.wall, metalness: 0, roughness: 0.08, transmission: 0.0, transparent: true, opacity: 0.28, side: THREE.DoubleSide });
    const wallEdge = new THREE.MeshStandardMaterial({ color: 0x1b2438, metalness: 0.6, roughness: 0.4 });
    const gaps = AR.pockets.map((p) => [p.phi - p.half, p.phi + p.half]);
    const segs = []; // free arcs between gaps
    const sorted = gaps.map(([a, b]) => [((a % TAU) + TAU) % TAU, ((b % TAU) + TAU) % TAU]).sort((u, v) => u[0] - v[0]);
    for (let i = 0; i < sorted.length; i++) {
      const start = sorted[i][1], end = sorted[(i + 1) % sorted.length][0] + (i + 1 === sorted.length ? TAU : 0);
      segs.push([start, end - start]);
    }
    const yTop = surfH(AR.WALL) + 0.55;
    for (const [st, len] of segs) {
      const prof = [new THREE.Vector2(AR.WALL, surfH(AR.WALL) - 0.1), new THREE.Vector2(AR.WALL, yTop), new THREE.Vector2(AR.WALL + 0.22, yTop), new THREE.Vector2(AR.WALL + 0.22, -0.3)];
      const w = new THREE.Mesh(new THREE.LatheGeometry(prof, 64, st, len), wallMat); g.add(w);
      const lip = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(AR.WALL - 0.01, yTop), new THREE.Vector2(AR.WALL + 0.24, yTop + 0.04)], 64, st, len), wallEdge); g.add(lip);
    }
    // pocket trays
    this.pocketMeshes = [];
    for (const p of AR.pockets) {
      const isX = p.kind === 'rift';
      const col = isX ? 0xff3b1a : 0xffb347;
      const trayProf = [new THREE.Vector2(AR.WALL, surfH(AR.WALL)), new THREE.Vector2(AR.WALL + 0.5, 0.35), new THREE.Vector2(5.75, 0.3), new THREE.Vector2(5.75, 1.15), new THREE.Vector2(5.95, 1.15), new THREE.Vector2(5.95, -0.3)];
      const tray = new THREE.Mesh(new THREE.LatheGeometry(trayProf, 24, p.phi - p.half - 0.06, p.half * 2 + 0.12), new THREE.MeshStandardMaterial({ color: isX ? 0x2a0e0a : 0x2a1d0a, metalness: 0.3, roughness: 0.6, side: THREE.DoubleSide, emissive: col, emissiveIntensity: 0.08 }));
      tray.receiveShadow = true; g.add(tray);
      // side walls of tray
      for (const sgn of [-1, 1]) {
        const a = p.phi + sgn * (p.half + 0.06);
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 1.5), wallEdge);
        side.position.set(Math.sin(a) * 5.2, 0.7, Math.cos(a) * 5.2); side.rotation.y = a; g.add(side);
      }
      // label
      const lc = document.createElement('canvas'); lc.width = 512; lc.height = 128; const lx = lc.getContext('2d');
      lx.fillStyle = isX ? '#ff4a1a' : '#ffb347'; lx.font = '900 64px "Noto Sans TC",sans-serif'; lx.textAlign = 'center'; lx.textBaseline = 'middle';
      lx.fillText(isX ? '裂界區 ×3' : '場外區 ×2', 256, 64);
      const lt = new THREE.CanvasTexture(lc); lt.encoding = THREE.sRGBEncoding;
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false }));
      const lr = 5.3; lbl.position.set(Math.sin(p.phi) * lr, 0.36, Math.cos(p.phi) * lr);
      lbl.rotation.x = -Math.PI / 2; lbl.rotation.z = p.phi + Math.PI;
      g.add(lbl);
      const strip = new THREE.Mesh(new THREE.RingGeometry(AR.WALL - 0.02, AR.WALL + 0.06, 24, 1, Math.PI / 2 - p.phi - p.half, p.half * 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      strip.rotation.x = -Math.PI / 2; strip.position.y = surfH(AR.WALL) + 0.025; g.add(strip);
      this.pocketMeshes.push({ p, tray });
    }
    // base / table
    const base = new THREE.Mesh(new THREE.CylinderGeometry(6.3, 6.8, 0.6, 64), new THREE.MeshStandardMaterial({ color: 0x0d111b, metalness: 0.5, roughness: 0.5 }));
    base.position.y = -0.32; base.receiveShadow = true; g.add(base);
    const table = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x080a10, roughness: 0.9 }));
    table.rotation.x = -Math.PI / 2; table.position.y = -0.62; table.receiveShadow = true; g.add(table);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(6.32, 0.03, 8, 128), new THREE.MeshBasicMaterial({ color: T.rim }));
    edge.rotation.x = Math.PI / 2; edge.position.y = -0.02; g.add(edge);
  }
  makeArrow() {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.85, depthWrite: false });
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.4), mat); shaft.rotation.x = -Math.PI / 2; shaft.position.z = 0.7; g.add(shaft);
    const sh = new THREE.Shape(); sh.moveTo(-0.22, 0); sh.lineTo(0.22, 0); sh.lineTo(0, 0.4); sh.closePath();
    const head = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat); head.rotation.x = -Math.PI / 2; head.position.z = 1.4; g.add(head);
    g.visible = false; return g;
  }
  setBeys(cfgA, cfgB) {
    this.beyObjs.forEach((o) => { if (o) { this.scene.remove(o); disposeTree(o); } });
    this.beyObjs = [cfgA, cfgB].map((cfg) => {
      const o = buildBey(cfg); o.traverse((n) => { if (n.isMesh) n.castShadow = true; });
      o.visible = false; this.scene.add(o); return o;
    });
    this.fx.clearDebris();
    this.trails.forEach((t) => t.clear());
  }
  placeForLaunch(side) {
    const o = this.beyObjs[side], p = AR.launchPos[side];
    o.visible = true; o.position.set(p.x, surfH(Math.hypot(p.x, p.z)) + 1.1, p.z);
    o.rotation.set(0, 0, 0); o.userData.spin.rotation.set(0, 0, 0);
    o.userData.hover = true;
  }
  showAim(side, aim) {
    const L = launchVector(side, 1, aim), p = AR.launchPos[side];
    this.arrow.visible = true;
    this.arrow.position.set(p.x, surfH(Math.hypot(p.x, p.z)) + 0.05, p.z);
    this.arrow.rotation.y = Math.atan2(L.vx, L.vz);
  }
  hideAim() { this.arrow.visible = false; }
  syncBeys(arena, dt) {
    arena.beys.forEach((b, i) => {
      const o = this.beyObjs[i]; if (!o) return;
      const aura = this.auras[i], trail = this.trails[i];
      if (o.userData.hover) {
        o.position.y += Math.sin(this.t * 3) * 0.002;
        o.userData.spin.rotation.y += dt * 0.6;
        aura.hide();
        return;
      }
      if (b.state === 'burst' && o.userData.burstDone) { aura.hide(); trail.fade(); trail.update(); this.shields[i].update(false); return; }
      const r = Math.hypot(b.x, b.z);
      let y = surfH(Math.min(r, AR.WALL));
      if (b.state === 'out') {
        const k = clamp(b.outT / 0.35, 0, 1);
        y = lerp(surfH(AR.WALL), 0.32, k) + Math.sin(k * Math.PI) * 0.25;
      }
      o.position.set(b.x, y, b.z);
      o.userData.spin.rotation.y = -b.spinAng;
      const sl = r < AR.RB ? surfSlope(r) * 0.55 : 0.08;
      const nx = r > 0.01 ? b.x / r : 0, nz = r > 0.01 ? b.z / r : 0;
      const wob = b.tilt, pa = b.prec || 0;
      o.rotation.x = -nz * sl * 0.6 + Math.sin(pa) * wob;
      o.rotation.z = nx * sl * 0.6 + Math.cos(pa) * wob;
      const spinning = b.state === 'spin';
      const bf = spinning && b.buff && b.buff.t > 0 ? b.buff : null;
      const spc = bf ? SPECIALS[b.cfg.b].color : this.baseCols[i];
      aura.mat.uniforms.uColor.value.lerp(new THREE.Color(spc), 0.15);
      trail.color.lerp(new THREE.Color(spc), 0.15);
      aura.update(this.t, b.x, y, b.z, spinning ? clamp(0.25 + b.s * 0.75 + (bf ? 0.9 : 0), 0, 1.8) : 0, spinning ? Math.max(b.dash, bf && bf.kind === 'rush' ? 0.8 : 0) : 0, dt, o.userData.bladeY);
      if (bf) this.fx.element(bf.fx, b.x, y, b.z, spc, dt);
      this.shields[i].update(!!bf && (bf.kind === 'guard'), b.x, y, b.z, spc, this.t, b.hitPulse || 0);
      b.hitPulse = Math.max(0, (b.hitPulse || 0) - dt * 4);
      const sp = Math.hypot(b.vx, b.vz);
      if (spinning || b.state === 'out') trail.push(b.x, y + 0.12, b.z, 0.08 + b.dash * 0.22 + Math.min(sp, 6) * 0.012 + (bf ? 0.14 : 0), Math.max(b.dash, bf ? 0.5 : 0));
      else trail.fade();
      trail.update();
      // rail teeth heat near a dashing bey
      if (spinning && b.dash > 0.05 && r > AR.RB - 0.1) {
        const phi = Math.atan2(b.x, b.z);
        const c = Math.round(((phi % TAU + TAU) % TAU) / TAU * this.railTeeth);
        for (let k = -6; k <= 6; k++) { const id = (c + k + this.railTeeth) % this.railTeeth; this.railHeat[id] = Math.max(this.railHeat[id], b.dash * (1 - Math.abs(k) / 7)); }
      }
    });
    // cool rail
    const cold = new THREE.Color(0x9aa4b8), hot = new THREE.Color(0xffd27a), tmp = new THREE.Color();
    let any = false;
    for (let i = 0; i < this.railTeeth; i++) {
      if (this.railHeat[i] <= 0.001 && !this._railDirty) continue;
      this.railHeat[i] *= Math.exp(-dt * 3);
      tmp.copy(cold).lerp(hot, clamp(this.railHeat[i] * 1.6, 0, 1)).multiplyScalar(1 + this.railHeat[i] * 4);
      this.rail.setColorAt(i, tmp); any = true;
    }
    if (any) this.rail.instanceColor.needsUpdate = true;
  }
  burstBey(side, b, nx, nz) {
    const o = this.beyObjs[side]; o.userData.burstDone = true;
    const parts = o.userData.parts;
    const world = new THREE.Vector3(); o.getWorldPosition(world);
    ['blade', 'ratchet', 'bit'].forEach((k, i) => {
      const src = parts[k];
      const clone = src.clone(true);
      const wp = new THREE.Vector3(); src.getWorldPosition(wp);
      clone.position.copy(wp);
      const a = Math.atan2(nz, nx) + rand(-0.9, 0.9);
      const sp = rand(2.5, 4.5) * (k === 'blade' ? 1 : 0.8);
      this.fx.addDebris(clone, new THREE.Vector3(Math.cos(a) * sp, rand(3.5, 6) - i * 0.6, Math.sin(a) * sp), new THREE.Vector3(rand(-14, 14), rand(-20, 20), rand(-14, 14)), side ? 0x36d3ff : 0xff6a1a);
    });
    o.visible = false;
    this.fx.burstFlash(world, side ? 0x36d3ff : 0xff6a1a);
    this.auras[side].hide();
  }
  update(dt) {
    this.t += dt;
    // camera
    const base = this.camBase.clone();
    let lookT = new THREE.Vector3(0, 0, 0.4);
    if (this.cine) {
      const c = this.cine; c.t += dt; c.a += dt * 1.6;
      const r = 2.6 - Math.min(c.t, 1) * 0.6;
      base.set(c.x + Math.sin(c.a) * r, 1.1 + Math.min(c.t, 1) * 0.3, c.z + Math.cos(c.a) * r);
      lookT.set(c.x, 0.45, c.z);
      this.cam.position.lerp(base, 1 - Math.exp(-dt * 10));
    } else if (this.zoomTo) {
      const z = this.zoomTo;
      base.set(z.x * 0.55, 4.2, z.z * 0.55 + 4.6);
      lookT.set(z.x, 0.4, z.z);
    } else if (this.follow) {
      const f = this.follow;
      lookT.set(f.x * 0.25, 0, f.z * 0.25 + 0.4);
      base.x += f.x * 0.2; base.z += f.z * 0.12;
    }
    this.cam.position.lerp(base, 1 - Math.exp(-dt * 3));
    this.look.lerp(lookT, 1 - Math.exp(-dt * 4));
    if (this.shake > 0) {
      this.cam.position.x += rand(-1, 1) * this.shake * 0.25;
      this.cam.position.y += rand(-1, 1) * this.shake * 0.18;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    this.cam.lookAt(this.look);
    this.fovKick = Math.max(0, (this.fovKick || 0) - dt * 30);
    const fov = 42 - (this.dashFx || 0) * 4 - (this.zoomTo ? 6 : 0) - (this.cine ? 8 : 0) + this.fovKick;
    if (Math.abs(this.cam.fov - fov) > 0.01) { this.cam.fov = lerp(this.cam.fov, fov, 1 - Math.exp(-dt * 5)); this.cam.updateProjectionMatrix(); }
    const post = this.fx.post;
    if (post) {
      const target = (this.dashFx || 0) * 0.35 + (this.blurKick || 0);
      post.uBlur.value = lerp(post.uBlur.value, target, 1 - Math.exp(-dt * 8));
      this.blurKick = Math.max(0, (this.blurKick || 0) - dt * 3);
      if (this.blurAt) { const v = this.blurAt.clone().project(this.cam); post.uCenter.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5); }
    }
    this.fx.update(dt);
  }
}

