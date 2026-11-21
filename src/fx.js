/* ============================== EFFECTS ==============================
   Layered impact language: hit-stop -> white core flash + star burst -> streak sparks -> shock ring -> screen
   aberration/flash. Spinning beys carry a type-coloured energy aura and a ribbon trail; Xtreme dashes ignite
   the trail, light the rail teeth around the bey and add radial speed blur. */
function radialTex(key, stops) {
  return canvasTex(key, 128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }, false);
}
function starTex() {
  return canvasTex('star', 256, 256, (g) => {
    g.translate(128, 128);
    const core = g.createRadialGradient(0, 0, 0, 0, 0, 60);
    core.addColorStop(0, 'rgba(255,255,255,1)'); core.addColorStop(0.3, 'rgba(255,255,255,0.7)'); core.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = core; g.fillRect(-128, -128, 256, 256);
    for (let i = 0; i < 10; i++) {
      g.save(); g.rotate((i / 10) * TAU + (i % 2) * 0.15);
      const len = i % 2 ? 80 : 124, w = i % 2 ? 4 : 7;
      const sg = g.createLinearGradient(0, 0, len, 0); sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sg; g.beginPath(); g.moveTo(0, -w); g.lineTo(len, 0); g.lineTo(0, w); g.fill();
      g.restore();
    }
  }, false);
}
function ringTex() {
  return canvasTex('shock', 256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.72, 'rgba(255,255,255,0.05)'); gr.addColorStop(0.86, 'rgba(255,255,255,1)'); gr.addColorStop(0.92, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }, false);
}

/* Type-coloured energy aura: open cylinder with scrolling noise flames */
const AuraShader = {
  uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uPower: { value: 0 }, uDash: { value: 0 } },
  vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){ vUv=uv; vec4 wp=modelMatrix*vec4(position,1.0); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-wp.xyz); gl_Position=projectionMatrix*viewMatrix*wp; }`,
  fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uPower; uniform float uDash; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){ v+=a*n(p); p*=2.03; a*=0.5; } return v; }
    void main(){
      vec2 p=vec2(vUv.x*10.0 - uTime*3.0, vUv.y*2.5 - uTime*(2.0+uDash*4.0));
      float f=fbm(p);
      float rim=pow(1.0-abs(dot(vN,vV)),1.4);
      float fade=smoothstep(1.0,0.05,vUv.y)*smoothstep(0.0,0.08,vUv.y);
      float flame=smoothstep(0.35-uDash*0.15,0.9,f+ (1.0-vUv.y)*0.35);
      float a=flame*fade*(0.35+rim*0.9)*uPower;
      vec3 c=mix(uColor, vec3(1.0), smoothstep(0.7,1.0,f)*0.7 + uDash*0.25);
      gl_FragColor=vec4(c*1.6, a);
    }`,
};
class FlameAura {
  constructor(scene, color) {
    const geo = new THREE.CylinderGeometry(0.52, 0.42, 0.7, 48, 1, true);
    geo.translate(0, 0.35, 0);
    this.mat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(AuraShader.uniforms), vertexShader: AuraShader.vertexShader, fragmentShader: AuraShader.fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.mat.uniforms.uColor.value.set(color);
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.frustumCulled = false; scene.add(this.mesh);
    // ground glow disc
    this.disc = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: radialTex('glowdisc', [[0, 'rgba(255,255,255,0.9)'], [0.35, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]), color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.disc.rotation.x = -Math.PI / 2; scene.add(this.disc);
    // spin ring (motion-blur halo at blade height)
    this.halo = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.5, 64), new THREE.MeshBasicMaterial({ map: this.haloTex(), color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.halo.rotation.x = -Math.PI / 2; scene.add(this.halo);
  }
  haloTex() {
    return canvasTex('halo', 256, 256, (g) => {
      g.translate(128, 128);
      for (let i = 0; i < 3; i++) {
        g.rotate(TAU / 3);
        const gr = g.createConicGradient ? g.createConicGradient(0, 0, 0) : null;
        if (gr) { gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.18, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; }
        else g.fillStyle = 'rgba(255,255,255,0.3)';
        g.beginPath(); g.arc(0, 0, 128, 0, TAU); g.arc(0, 0, 80, TAU, 0, true); g.fill();
      }
    }, false);
  }
  update(t, x, y, z, power, dash, dt, bladeY) {
    const u = this.mat.uniforms;
    u.uTime.value = t; u.uPower.value = lerp(u.uPower.value, power, 0.2); u.uDash.value = lerp(u.uDash.value, dash, 0.2);
    this.mesh.position.set(x, y, z); this.mesh.scale.set(1 + dash * 0.25, 1 + dash * 0.6, 1 + dash * 0.25);
    this.disc.position.set(x, y + 0.02, z); this.disc.material.opacity = power * 0.5 + dash * 0.5;
    this.halo.position.set(x, y + bladeY, z); this.halo.rotation.z -= dt * 30; this.halo.material.opacity = power * 0.55;
  }
  hide() { this.mat.uniforms.uPower.value = 0; this.disc.material.opacity = 0; this.halo.material.opacity = 0; }
}

/* Ribbon trail behind a bey */
class Trail {
  constructor(scene, color, n = 48) {
    this.n = n; this.pts = []; this.color = new THREE.Color(color);
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 2 * 3); this.col = new Float32Array(n * 2 * 4);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 4));
    const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false; scene.add(this.mesh);
  }
  push(x, y, z, width, heat) { this.pts.unshift({ x, y, z, w: width, h: heat }); if (this.pts.length > this.n) this.pts.pop(); }
  fade() { for (const p of this.pts) p.w *= 0.86; }
  clear() { this.pts = []; this.pos.fill(0); this.col.fill(0); this.mesh.geometry.attributes.position.needsUpdate = true; this.mesh.geometry.attributes.color.needsUpdate = true; }
  update() {
    const P = this.pts, n = this.n;
    const hot = new THREE.Color(0xfff2c0);
    for (let i = 0; i < n; i++) {
      const p = P[Math.min(i, P.length - 1)];
      if (!p) { this.pos.fill(0); break; }
      const q = P[Math.min(i + 1, P.length - 1)] || p;
      let dx = p.x - q.x, dz = p.z - q.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const k = 1 - i / n, w = p.w * k;
      const nx = -dz * w, nz = dx * w;
      this.pos.set([p.x + nx, p.y, p.z + nz, p.x - nx, p.y, p.z - nz], i * 6);
      const c = this.color.clone().lerp(hot, p.h * k * 0.8);
      const a = k * k * (i < P.length ? 1 : 0) * clamp(p.w * 6, 0, 1);
      this.col.set([c.r, c.g, c.b, a, c.r, c.g, c.b, a], i * 8);
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.color.needsUpdate = true;
  }
}

/* Screen-space post: chromatic aberration, flash, radial speed blur, vignette */
const PostShader = {
  uniforms: { tDiffuse: { value: null }, uAb: { value: 0 }, uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color(1, 1, 1) }, uBlur: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uVig: { value: 0.35 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uAb; uniform float uFlash; uniform vec3 uFlashCol; uniform float uBlur; uniform vec2 uCenter; uniform float uVig; varying vec2 vUv;
    void main(){
      vec2 d=vUv-uCenter; float r=length(d);
      vec3 col=vec3(0.0);
      if(uBlur>0.001){ for(int i=0;i<10;i++){ float s=1.0-float(i)*uBlur*0.008; col+=texture2D(tDiffuse,uCenter+d*s).rgb; } col/=10.0; }
      else col=texture2D(tDiffuse,vUv).rgb;
      if(uAb>0.001){ vec2 o=d*uAb*0.012; col.r=texture2D(tDiffuse,vUv+o).r; col.b=texture2D(tDiffuse,vUv-o).b; }
      col=mix(col,uFlashCol,uFlash);
      col*=1.0-uVig*smoothstep(0.35,0.85,r);
      gl_FragColor=vec4(col,1.0);
    }`,
};

class FX {
  constructor(scene) {
    this.scene = scene;
    // glow points
    const N = (this.N = 1200);
    this.pos = new Float32Array(N * 3); this.col = new Float32Array(N * 3); this.base = new Float32Array(N * 3);
    this.vel = new Float32Array(N * 3); this.life = new Float32Array(N); this.max = new Float32Array(N); this.grav = new Float32Array(N);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.075, map: radialTex('spark', [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.pts.frustumCulled = false; scene.add(this.pts);
    // streaks (line segments drawn from pos back along velocity)
    this.lpos = new Float32Array(N * 6); this.lcol = new Float32Array(N * 6);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(this.lpos, 3));
    lg.setAttribute('color', new THREE.BufferAttribute(this.lcol, 3));
    this.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.lines.frustumCulled = false; scene.add(this.lines);
    this.cursor = 0; this.sprites = []; this.rings = []; this.debris = []; this.flashes = []; this.rays = [];
    for (let i = 0; i < N; i++) this.pos[i * 3 + 1] = -99;
    this.starMat = new THREE.SpriteMaterial({ map: starTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.ringMatBase = new THREE.MeshBasicMaterial({ map: ringTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.post = null; // set by scene
  }
  spark(x, y, z, n, speed, color, life = 0.5, up = 1, dir = null, spread = TAU) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % this.N;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      const a = dir == null ? Math.random() * TAU : dir + rand(-spread / 2, spread / 2);
      const el = rand(0.05, 1) * up, sp = speed * rand(0.35, 1.25);
      this.vel[i * 3] = Math.cos(a) * sp; this.vel[i * 3 + 1] = el * sp * 0.7; this.vel[i * 3 + 2] = Math.sin(a) * sp;
      const cc = c.clone().offsetHSL(rand(-0.03, 0.03), 0, rand(-0.05, 0.2));
      this.base.set([cc.r * 1.6, cc.g * 1.6, cc.b * 1.6], i * 3);
      this.life[i] = this.max[i] = life * rand(0.5, 1.2);
      this.grav[i] = 9;
    }
  }
  star(x, y, z, size, color, dur = 0.22) {
    const s = new THREE.Sprite(this.starMat.clone()); s.material.color.set(color);
    s.position.set(x, y, z); s.scale.setScalar(size * 0.3); s.material.rotation = Math.random() * TAU;
    this.scene.add(s); this.sprites.push({ s, t: 0, dur, size });
  }
  ring(x, y, z, color, size = 1.6, dur = 0.45) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.ringMatBase.clone());
    m.material.color.set(color);
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); this.scene.add(m);
    this.rings.push({ m, t: 0, dur, size });
  }
  /* layered impact */
  impact(x, y, z, p, colA, colB, nx = 0, nz = 0) {
    const dir = Math.atan2(nz, nx);
    this.star(x, y, z, 1.2 + p * 3.2, 0xffffff, 0.12 + p * 0.12);
    this.star(x, y, z, 0.8 + p * 2.2, colA, 0.2 + p * 0.15);
    this.spark(x, y, z, Math.round(16 + p * 70), 3 + p * 6, 0xffc070, 0.35 + p * 0.35, 0.9);
    this.spark(x, y, z, Math.round(8 + p * 30), 4 + p * 6, colA, 0.3 + p * 0.3, 0.6, dir + Math.PI / 2, 1.2);
    this.spark(x, y, z, Math.round(8 + p * 30), 4 + p * 6, colB, 0.3 + p * 0.3, 0.6, dir - Math.PI / 2, 1.2);
    if (p > 0.3) this.ring(x, y - 0.15, z, 0xffe0a0, 1.2 + p * 2.6, 0.32 + p * 0.15);
    if (p > 0.6) this.ring(x, y - 0.12, z, colA, 2 + p * 2, 0.5);
    const l = new THREE.PointLight(0xffd090, 3 + p * 10, 5); l.position.set(x, y + 0.4, z); this.scene.add(l);
    this.flashes.push({ l, t: 0 });
    if (this.post) { if (p > 0.4) this.post.uAb.value = Math.max(this.post.uAb.value, p * 1.0); if (p > 0.6) { this.post.uFlash.value = Math.max(this.post.uFlash.value, p * 0.16); this.post.uFlashCol.value.set(0xfff0d0); } }
  }
  burstFlash(p, color) {
    this.star(p.x, p.y + 0.3, p.z, 7, 0xffffff, 0.35);
    this.star(p.x, p.y + 0.3, p.z, 5, color, 0.5);
    this.spark(p.x, p.y + 0.2, p.z, 220, 8, 0xffd28a, 1.0, 1.5);
    this.spark(p.x, p.y + 0.2, p.z, 120, 5, color, 1.2, 1.3);
    this.ring(p.x, p.y + 0.05, p.z, 0xffffff, 6, 0.6);
    this.ring(p.x, p.y + 0.05, p.z, color, 4, 0.9);
    // light rays fan
    const rays = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 4), new THREE.MeshBasicMaterial({ map: radialTex('ray', [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]), color: i % 2 ? 0xffffff : color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.position.y = 2; const piv = new THREE.Group(); piv.add(m);
      piv.rotation.z = rand(-1.2, 1.2); piv.rotation.y = (i / 14) * TAU; piv.rotation.x = rand(-0.4, 0.4);
      rays.add(piv);
    }
    rays.position.copy(p); this.scene.add(rays); this.rays.push({ g: rays, t: 0 });
    const l = new THREE.PointLight(0xffa050, 14, 10); l.position.copy(p).add(new THREE.Vector3(0, 0.6, 0)); this.scene.add(l);
    this.flashes.push({ l, t: 0 });
    if (this.post) { this.post.uFlash.value = 0.6; this.post.uFlashCol.value.set(0xffffff); this.post.uAb.value = 1.6; }
  }
  addDebris(obj, v, w, color) { this.scene.add(obj); this.debris.push({ obj, v, w, t: 0, color }); }
  clearDebris() { this.debris.forEach((d) => this.scene.remove(d.obj)); this.debris = []; }
  update(dt) {
    const N = this.N;
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      if (this.life[i] <= 0) { this.lpos[i * 6 + 1] = this.lpos[i * 6 + 4] = -99; continue; }
      this.life[i] -= dt;
      this.vel[j + 1] -= this.grav[i] * dt;
      this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      const r = Math.hypot(this.pos[j], this.pos[j + 2]);
      const floor = r < AR.WALL ? surfH(r) : -0.6;
      if (this.pos[j + 1] < floor) { this.pos[j + 1] = floor; this.vel[j + 1] *= -0.3; this.vel[j] *= 0.55; this.vel[j + 2] *= 0.55; }
      const k = Math.max(0, this.life[i] / this.max[i]);
      // colour cools from white-hot to base to dark ember
      const hot = smoothstep(0.75, 1, k);
      const fade = k * k;
      for (let c = 0; c < 3; c++) this.col[j + c] = (this.base[j + c] * (1 - hot) + 2.0 * hot) * fade;
      if (this.life[i] <= 0) this.pos[j + 1] = -99;
      // streak
      const sl = 0.035;
      this.lpos.set([this.pos[j], this.pos[j + 1], this.pos[j + 2], this.pos[j] - this.vel[j] * sl, this.pos[j + 1] - this.vel[j + 1] * sl, this.pos[j + 2] - this.vel[j + 2] * sl], i * 6);
      this.lcol.set([this.col[j], this.col[j + 1], this.col[j + 2], 0, 0, 0], i * 6);
    }
    this.pts.geometry.attributes.position.needsUpdate = true; this.pts.geometry.attributes.color.needsUpdate = true;
    this.lines.geometry.attributes.position.needsUpdate = true; this.lines.geometry.attributes.color.needsUpdate = true;
    for (const s of this.sprites) { s.t += dt; const k = s.t / s.dur; if (!s.line) s.s.scale.setScalar(s.size * (0.3 + 0.9 * Math.sqrt(k))); s.s.material.opacity = Math.max(0, 1 - k * k); }
    this.sprites = this.sprites.filter((s) => { if (s.t >= s.dur) { this.scene.remove(s.s); s.s.material.dispose(); if (s.line) s.s.geometry.dispose(); return false; } return true; });
    for (const r of this.rings) { r.t += dt; const k = r.t / r.dur; r.m.scale.setScalar(0.4 + (1 - Math.pow(1 - k, 2.2)) * r.size * 2); r.m.material.opacity = Math.max(0, 1 - k); }
    this.rings = this.rings.filter((r) => { if (r.t >= r.dur) { this.scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); return false; } return true; });
    for (const f of this.flashes) { f.t += dt; f.l.intensity *= Math.exp(-dt * 8); }
    this.flashes = this.flashes.filter((f) => { if (f.t > 0.7) { this.scene.remove(f.l); return false; } return true; });
    for (const r of this.rays) {
      r.t += dt;
      if (r.sigil) { r.g.material.opacity = Math.min(0.9, r.t * 3) * Math.max(0, 1 - Math.max(0, r.t - 1.6) * 2); r.g.rotation.z += dt * 1.4; r.g.scale.setScalar(0.6 + Math.min(r.t, 0.5) * 0.8); continue; }
      if (r.dome) { const k = r.t / 0.8; r.g.scale.setScalar(0.3 + (1 - Math.pow(1 - Math.min(k, 1), 3)) * 4.5); r.g.material.uniforms.uA.value = Math.max(0, 1 - k); continue; }
      if (r.crack) { r.g.material.opacity = r.t < 0.15 ? 1.4 : Math.max(0, 1 - (r.t - 0.15) / 2.4); continue; }
      if (r.pillar) { const k = r.t / 0.9; r.g.scale.set(1 + k * 0.6, Math.min(1, k * 6), 1 + k * 0.6); r.g.material.opacity = Math.max(0, 1 - k); r.g.rotation.y += dt * 2; continue; }
      r.g.scale.setScalar(0.5 + r.t * 2.5); r.g.rotation.y += dt * 0.6; r.g.traverse((m) => { if (m.material) m.material.opacity = Math.max(0, 1 - r.t / 0.9); });
    }
    this.rays = this.rays.filter((r) => { const life = r.sigil ? 2.2 : r.crack ? 2.6 : 0.9; if (r.t > life) { this.scene.remove(r.g); return false; } return true; });
    for (const d of this.debris) {
      d.t += dt; d.v.y -= 12 * dt;
      d.obj.position.addScaledVector(d.v, dt);
      d.obj.rotation.x += d.w.x * dt; d.obj.rotation.y += d.w.y * dt; d.obj.rotation.z += d.w.z * dt;
      const r = Math.hypot(d.obj.position.x, d.obj.position.z);
      const fl = r < AR.WALL ? surfH(r) + 0.05 : r < 6.3 ? 0.35 : -0.55;
      if (d.obj.position.y < fl) { d.obj.position.y = fl; d.v.y *= -0.35; d.v.x *= 0.6; d.v.z *= 0.6; d.w.multiplyScalar(0.6); if (Math.abs(d.v.y) > 0.6) this.spark(d.obj.position.x, fl + 0.05, d.obj.position.z, 6, 2, 0xffc070, 0.3); }
      if (d.t < 1.2 && Math.random() < 0.7) this.spark(d.obj.position.x, d.obj.position.y, d.obj.position.z, 1, 0.4, d.color || 0xffa040, 0.4, 0.2);
    }
    if (this.post) {
      const u = this.post;
      u.uAb.value *= Math.exp(-dt * 9); u.uFlash.value *= Math.exp(-dt * 9);
    }
  }
}

/* ---------- Signature-move visuals ---------- */
const ShieldShader = {
  uniforms: { uColor: { value: new THREE.Color() }, uTime: { value: 0 }, uAlpha: { value: 0 } },
  vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vP=position; vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-wp.xyz); gl_Position=projectionMatrix*viewMatrix*wp; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uTime; uniform float uAlpha; varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main(){ float f=pow(1.0-abs(dot(vN,vV)),2.2); float hex=step(0.92,fract(vP.y*14.0+uTime*0.5))+step(0.94,fract(atan(vP.z,vP.x)*3.0)); float scan=smoothstep(0.0,0.05,abs(fract(vP.y*2.0-uTime*1.5)-0.5));
      gl_FragColor=vec4(uColor*1.8,(f*0.9+hex*0.25+(1.0-scan)*0.3)*uAlpha); }`,
};
Object.assign(FX.prototype, {
  pillar(x, y, z, color) {
    const geo = new THREE.CylinderGeometry(0.55, 0.75, 7, 32, 1, true); geo.translate(0, 3.5, 0);
    const tex = canvasTex('pillar', 64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); }, false);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, y, z); this.scene.add(m);
    this.rays.push({ g: m, t: 0, pillar: true });
  },
  specialBurst(x, y, z, color) {
    this.pillar(x, y, z, color);
    this.star(x, y + 0.4, z, 6, color, 0.5); this.star(x, y + 0.4, z, 4, 0xffffff, 0.3);
    this.ring(x, y + 0.05, z, color, 4, 0.7); this.ring(x, y + 0.05, z, 0xffffff, 2.5, 0.5);
    this.spark(x, y + 0.3, z, 140, 6, color, 0.9, 1.6);
    const l = new THREE.PointLight(color, 12, 9); l.position.set(x, y + 1, z); this.scene.add(l); this.flashes.push({ l, t: 0 });
    if (this.post) { this.post.uFlash.value = 0.45; this.post.uFlashCol.value.set(color); this.post.uAb.value = 1.2; }
  },
  bolt(x0, y0, z0, x1, y1, z1, color) {
    const pts = []; const N = 10;
    for (let i = 0; i <= N; i++) { const t = i / N, j = i && i < N ? 0.18 : 0; pts.push(new THREE.Vector3(lerp(x0, x1, t) + rand(-j, j), lerp(y0, y1, t) + rand(-j, j), lerp(z0, z1, t) + rand(-j, j))); }
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending }));
    this.scene.add(ln); this.sprites.push({ s: ln, t: 0, dur: 0.12, size: 1, line: true });
  },
  /* per-frame element emission while a move is active */
  element(kind, x, y, z, color, dt, power = 1) {
    const rate = dt * 60 * power;
    if (kind === 'fire' || kind === 'phoenix') {
      for (let i = 0; i < 3 * rate; i++) { this.spark(x + rand(-0.35, 0.35), y + rand(0.1, 0.4), z + rand(-0.35, 0.35), 1, 1.2, i % 2 ? 0xffd060 : color, 0.6, 2.5); this.grav[(this.cursor + this.N - 1) % this.N] = -2.5; }
      if (kind === 'phoenix' && Math.random() < rate * 0.15) this.star(x + rand(-0.6, 0.6), y + rand(0.5, 1.2), z + rand(-0.6, 0.6), 0.9, 0xffc040, 0.3);
    } else if (kind === 'thunder') {
      if (Math.random() < rate * 0.35) { const a = Math.random() * TAU, r = rand(0.5, 1.1); this.bolt(x, y + 0.3, z, x + Math.cos(a) * r, y + rand(0, 0.6), z + Math.sin(a) * r, Math.random() < 0.5 ? 0xffffff : color); }
      if (Math.random() < rate * 0.08) this.bolt(x + rand(-0.2, 0.2), y + 4, z + rand(-0.2, 0.2), x, y + 0.2, z, 0xfff6c0);
      this.spark(x, y + 0.2, z, Math.ceil(rate), 2.5, color, 0.25, 0.6);
    } else if (kind === 'wind') {
      for (let i = 0; i < 2 * rate; i++) { const a = Math.random() * TAU, r = rand(0.55, 0.85); const k = (this.cursor) % this.N; this.spark(x + Math.cos(a) * r, y + rand(0.05, 0.6), z + Math.sin(a) * r, 1, 0.1, color, 0.45, 0); this.vel[k * 3] = -Math.sin(a) * 4; this.vel[k * 3 + 2] = Math.cos(a) * 4; this.vel[k * 3 + 1] = 1.2; this.grav[k] = 0; }
    } else if (kind === 'moon') {
      for (let i = 0; i < 2 * rate; i++) { const a = Math.random() * TAU, r = rand(0.6, 1.0); const k = this.cursor; this.spark(x + Math.cos(a) * r, y + rand(0.2, 0.9), z + Math.sin(a) * r, 1, 0.1, i % 2 ? 0xffffff : color, 0.8, 0); this.vel[k * 3 + 1] = rand(-0.2, 0.4); this.grav[k] = -0.3; }
    } else if (kind === 'dark') {
      for (let i = 0; i < 3 * rate; i++) { const a = Math.random() * TAU, r = rand(1.2, 2.2); const k = this.cursor; this.spark(x + Math.cos(a) * r, y + rand(0.05, 0.5), z + Math.sin(a) * r, 1, 0.1, i % 3 ? color : 0xffffff, 0.5, 0); this.vel[k * 3] = -Math.cos(a) * r * 2.2 - Math.sin(a) * 1.5; this.vel[k * 3 + 2] = -Math.sin(a) * r * 2.2 + Math.cos(a) * 1.5; this.vel[k * 3 + 1] = 0; this.grav[k] = 0; }
    } else if (kind === 'steel' || kind === 'water') {
      if (Math.random() < rate * 0.4) { const a = Math.random() * TAU; this.spark(x + Math.cos(a) * 0.75, y + rand(0.1, 0.8), z + Math.sin(a) * 0.75, 2, 0.6, kind === 'water' ? 0x9ffff0 : 0xffffff, 0.4, 0.4); }
    }
  },
});
class Shield {
  constructor(scene) {
    this.mat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(ShieldShader.uniforms), vertexShader: ShieldShader.vertexShader, fragmentShader: ShieldShader.fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.78, 40, 20, 0, TAU, 0, Math.PI * 0.55), this.mat);
    this.wire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.mesh.add(this.wire); this.mesh.visible = false; scene.add(this.mesh);
  }
  update(on, x, y, z, color, t, hitPulse) {
    const u = this.mat.uniforms;
    u.uAlpha.value = lerp(u.uAlpha.value, on ? 0.9 + hitPulse : 0, 0.15);
    this.mesh.visible = u.uAlpha.value > 0.01;
    if (!this.mesh.visible) return;
    u.uColor.value.set(color); u.uTime.value = t;
    this.wire.material.color.set(color); this.wire.material.opacity = u.uAlpha.value * 0.35;
    this.mesh.position.set(x, y, z); this.wire.rotation.y = t * 0.8; this.mesh.scale.setScalar(1 + hitPulse * 0.15);
  }
}

/* ---------- cinematic special: ground sigil, shock dome, glowing cracks ---------- */
Object.assign(FX.prototype, {
  sigil(x, y, z, color) {
    const tex = canvasTex('sigil', 512, 512, (g) => {
      g.translate(256, 256); g.strokeStyle = '#fff'; g.fillStyle = '#fff';
      const ring = (r, w) => { g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); };
      ring(246, 6); ring(226, 2); ring(150, 4); ring(70, 3);
      for (let i = 0; i < 48; i++) { g.save(); g.rotate((i / 48) * TAU); g.fillRect(-2, -240, 4, i % 4 ? 10 : 22); g.restore(); }
      g.lineWidth = 3;
      for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i <= 3; i++) { const a = (i / 3) * TAU + k * Math.PI / 3 - Math.PI / 2; const px = Math.cos(a) * 220, py = Math.sin(a) * 220; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
      for (let i = 0; i < 8; i++) { g.save(); g.rotate((i / 8) * TAU); g.beginPath(); g.moveTo(0, -150); g.lineTo(10, -185); g.lineTo(0, -205); g.lineTo(-10, -185); g.closePath(); g.fill(); g.restore(); }
    }, false);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); this.scene.add(m);
    this.rays.push({ g: m, t: 0, sigil: true });
  },
  dome(x, y, z, color) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, TAU, 0, Math.PI / 2), new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uA: { value: 1 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-wp.xyz); gl_Position=projectionMatrix*viewMatrix*wp; }',
      fragmentShader: 'uniform vec3 uColor; uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(vN,vV)),2.5); gl_FragColor=vec4(mix(uColor,vec3(1.0),f*0.6)*2.0,(f*0.9+0.08)*uA); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    m.position.set(x, y, z); this.scene.add(m);
    this.rays.push({ g: m, t: 0, dome: true });
  },
  cracks(x, y, z, color) {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.translate(256, 256); g.strokeStyle = '#fff'; g.lineCap = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 10;
    for (let k = 0; k < 11; k++) {
      let a = (k / 11) * TAU + rand(-0.2, 0.2), r = 20; g.lineWidth = rand(3, 6);
      g.beginPath(); g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      while (r < 240) { r += rand(14, 30); a += rand(-0.25, 0.25); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); if (Math.random() < 0.2) { const b = a + rand(-0.6, 0.6); g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(b) * (r + 30), Math.sin(b) * (r + 30)); g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.lineWidth *= 0.92; }
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * TAU; m.position.set(x, y, z); this.scene.add(m);
    this.rays.push({ g: m, t: 0, crack: true });
  },
});
