/* ============================== 3D PART MODELS (procedural, original designs) ==============================
   Design language: layered construction (metal main blade / metal sub-blade / tinted polymer frame / centre chip),
   wedge-profiled blades thinning toward the rim, chamfered contact edges, cut-out windows, engraved panel lines,
   brushed-metal finish. Ratchets with angled lock teeth and printed codes; bits with full gear rims and lock tabs. */
function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function outlineR(shape, th) {
  const { kind, n, base, amp } = shape;
  const u = (((th * n) / TAU) % 1 + 1) % 1;
  switch (kind) {
    case 'fang': return base + amp * (u < 0.14 ? Math.pow(u / 0.14, 0.5) : Math.pow(1 - (u - 0.14) / 0.86, 2.4)) + 0.012 * Math.sin(u * TAU * 3);
    case 'saw': return base + amp * (u < 0.72 ? Math.pow(u / 0.72, 1.3) : 1 - (u - 0.72) / 0.28);
    case 'round': return base + amp * (0.5 + 0.5 * Math.cos(u * TAU)) - 0.012 * smoothstep(0.42, 0.5, u) * (1 - smoothstep(0.5, 0.58, u));
    case 'hex': { const a = (u - 0.5) * TAU / n; return base * Math.cos(Math.PI / n) / Math.cos(a) - 0.015 * Math.pow(Math.abs(Math.cos(u * Math.PI)), 40); }
    case 'gear': return base + amp * (smoothstep(0.04, 0.12, u) - smoothstep(0.5, 0.58, u)) + 0.01 * Math.sin(u * TAU * 2);
    case 'wing': return base + amp * Math.pow(Math.sin(u * Math.PI), 1.4) * (1 - 0.4 * u);
    case 'star': return base + amp * Math.pow(Math.abs(Math.cos(u * Math.PI)), 2.6);
    case 'hybrid': {
      const half = (((th * n / 2) / TAU) % 1 + 1) % 1 < 0.5;
      return half ? base + amp * (u < 0.16 ? Math.pow(u / 0.16, 0.55) : Math.pow(1 - (u - 0.16) / 0.84, 2.2)) : base + amp * 0.42 * (0.5 + 0.5 * Math.cos(u * TAU));
    }
  }
  return base;
}
function makeOutlineShape(fn, holeR = 0, windows = []) {
  const N = 260, s = new THREE.Shape();
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * TAU, r = fn(th);
    const x = Math.cos(th) * r, y = Math.sin(th) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  if (holeR > 0) { const h = new THREE.Path(); h.absarc(0, 0, holeR, 0, TAU, true); s.holes.push(h); }
  for (const w of windows) s.holes.push(w);
  return s;
}
/* slot-shaped window path */
function slotPath(r0, r1, th, halfW) {
  const p = new THREE.Path(), N = 10;
  const pts = [];
  for (let i = 0; i <= N; i++) { const a = th - halfW + (2 * halfW * i) / N; pts.push([Math.cos(a) * r1, Math.sin(a) * r1]); }
  for (let i = N; i >= 0; i--) { const a = th - halfW * 0.7 + (1.4 * halfW * i) / N; pts.push([Math.cos(a) * r0, Math.sin(a) * r0]); }
  // holes must wind opposite to the outline
  pts.reverse();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}
/* Extrude, then sculpt the top into a wedge that thins toward the rim and chamfers the edge */
function wedgeExtrude(shape, depth, fn, opts = {}) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: opts.bevel ?? 0.008, bevelSize: opts.bevel ?? 0.008, bevelSegments: 2, curveSegments: 8 });
  geo.rotateX(-Math.PI / 2); // extrude now along +y, shape xy -> x,-z
  const pos = geo.attributes.position;
  const top = depth + (opts.bevel ?? 0.008);
  const thin = opts.thin ?? 0.55, hub = opts.hub ?? 0.22;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (y < depth * 0.5) continue;
    const r = Math.hypot(x, z), th = Math.atan2(-z, x);
    const R = fn(th);
    const t = clamp((r - hub) / Math.max(0.01, R - hub), 0, 1);
    const k = (y - depth * 0.5) / (top - depth * 0.5);
    const drop = depth * thin * smoothstep(0.15, 1, t) + depth * 0.25 * smoothstep(0.88, 1, t);
    pos.setY(i, y - drop * k);
  }
  geo.computeVertexNormals();
  return geo;
}
const texCache = {};
function canvasTex(key, w, h, draw, srgb = true) {
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  return (texCache[key] = t);
}
/* brushed metal + engraved panel lines; UVs of extrude caps are shape coords (-0.5..0.5) */
function engraveTex(key, n, accentHex) {
  return canvasTex('eng-' + key, 512, 512, (g, W) => {
    g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, W, W);
    // circular brushing
    for (let i = 0; i < 900; i++) {
      const r = Math.random() * 256, a = Math.random() * TAU, len = rand(0.2, 1.2);
      const v = 130 + Math.random() * 90 | 0;
      g.strokeStyle = `rgba(${v},${v},${v},0.25)`; g.lineWidth = rand(0.5, 1.5);
      g.beginPath(); g.arc(256, 256, r, a, a + len); g.stroke();
    }
    // engraved radial panel lines (dark = grooves)
    g.strokeStyle = 'rgba(20,20,20,0.9)'; g.lineWidth = 3;
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * TAU + 0.15;
      g.beginPath(); g.moveTo(256 + Math.cos(a) * 125, 256 - Math.sin(a) * 125); g.lineTo(256 + Math.cos(a) * 205, 256 - Math.sin(a) * 205); g.stroke();
    }
    g.lineWidth = 2.5;
    for (const rr of [118, 150]) { g.beginPath(); g.arc(256, 256, rr, 0, TAU); g.stroke(); }
    // chevrons
    g.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.35;
      for (let k = 0; k < 3; k++) {
        const r0 = 165 + k * 12;
        g.beginPath(); g.moveTo(256 + Math.cos(a - 0.08) * r0, 256 - Math.sin(a - 0.08) * r0);
        g.lineTo(256 + Math.cos(a) * (r0 + 8), 256 - Math.sin(a) * (r0 + 8));
        g.lineTo(256 + Math.cos(a + 0.08) * r0, 256 - Math.sin(a + 0.08) * r0); g.stroke();
      }
    }
  }, false);
}
function emblemTexture(bl) {
  return canvasTex('emb-' + bl.id, 512, 512, (g) => {
    const col = '#' + bl.plastic.toString(16).padStart(6, '0');
    const acc = '#' + bl.accent.toString(16).padStart(6, '0');
    const grd = g.createRadialGradient(220, 200, 20, 256, 256, 256);
    grd.addColorStop(0, acc); grd.addColorStop(0.5, col); grd.addColorStop(1, '#04050a');
    g.fillStyle = grd; g.beginPath(); g.arc(256, 256, 256, 0, TAU); g.fill();
    // circuit-like rings
    g.strokeStyle = acc; g.lineWidth = 10; g.beginPath(); g.arc(256, 256, 226, 0, TAU); g.stroke();
    g.lineWidth = 3; g.globalAlpha = 0.75;
    g.beginPath(); g.arc(256, 256, 204, 0, TAU); g.stroke();
    for (let i = 0; i < 36; i++) { const a = (i / 36) * TAU; const l = i % 3 ? 8 : 18; g.beginPath(); g.moveTo(256 + Math.cos(a) * (204 - l), 256 + Math.sin(a) * (204 - l)); g.lineTo(256 + Math.cos(a) * 204, 256 + Math.sin(a) * 204); g.stroke(); }
    g.globalAlpha = 1;
    // energy slashes behind glyph
    g.save(); g.translate(256, 256); g.rotate(-0.5);
    const sl = g.createLinearGradient(0, -200, 0, 200); sl.addColorStop(0, 'rgba(255,255,255,0)'); sl.addColorStop(0.5, 'rgba(255,255,255,0.32)'); sl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sl;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 52 - 10, -190); g.lineTo(i * 52 + 14, -190); g.lineTo(i * 52 + 4, 190); g.lineTo(i * 52 - 20, 190); g.fill(); }
    g.restore();
    g.font = '900 230px "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 22; g.strokeStyle = '#04050a'; g.lineJoin = 'round'; g.strokeText(bl.glyph, 256, 272);
    const tg = g.createLinearGradient(0, 150, 0, 380); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, acc);
    g.fillStyle = tg; g.fillText(bl.glyph, 256, 272);
  });
}
/* ---------- Blender-built meshes (assets/parts.bin), with procedural fallback ---------- */
const Assets = {
  ok: false, idx: null, cache: {},
  bufs: {},
  async load(onProgress) {
    try {
      const j = await (await fetch('assets/parts.json')).json();
      const groups = ['blade', 'ratchet', 'bit'];
      const prog = {};
      const one = async (g) => {
        const res = await fetch(`assets/parts_${g}.txt`);
        const total = +res.headers.get('content-length') || 0;
        let bytes;
        if (res.body && total) {
          const reader = res.body.getReader(); const parts = []; let got = 0;
          for (;;) {
            const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length;
            prog[g] = [got, total];
            if (onProgress) { let a = 0, b = 0; for (const k in prog) { a += prog[k][0]; b += prog[k][1]; } onProgress(a / Math.max(b, 1)); }
          }
          bytes = new Uint8Array(got); let o = 0; for (const p of parts) { bytes.set(p, o); o += p.length; }
        } else bytes = new Uint8Array(await res.arrayBuffer());
        const bin = atob(new TextDecoder().decode(bytes).trim()), buf = new ArrayBuffer(bin.length), u8 = new Uint8Array(buf);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        this.bufs[g] = buf;
      };
      await Promise.all(groups.map(one));
      this.idx = j; this.ok = true;
    } catch (e) { this.ok = false; }
    return this.ok;
  },
  has(key) { return this.ok && !!this.idx.parts[key]; },
  geo(key, name) {
    const ck = key + '/' + name; if (this.cache[ck]) return this.cache[ck];
    const m = this.idx.parts[key].find((x) => x.name === name); if (!m) return null;
    const S = this.idx.scale / 32767;
    const B = this.bufs[key.split('_')[0]];
    const p16 = new Int16Array(B, m.p, m.n * 3), n8 = new Int8Array(B, m.q, m.n * 3);
    const pos = new Float32Array(m.n * 3), nrm = new Float32Array(m.n * 3);
    for (let i = 0; i < m.n * 3; i++) { pos[i] = p16[i] * S; nrm[i] = n8[i] / 127; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setIndex(new THREE.BufferAttribute(m.big ? new Uint32Array(B, m.i, m.ic) : new Uint16Array(B, m.i, m.ic), 1));
    // planar UVs (top view) for brushed/engraved maps
    const uv = new Float32Array(m.n * 2);
    for (let i = 0; i < m.n; i++) { uv[i * 2] = pos[i * 3] / 0.96 + 0.5; uv[i * 2 + 1] = -pos[i * 3 + 2] / 0.96 + 0.5; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeBoundingSphere();
    return (this.cache[ck] = g);
  },
};
const geoCache = {};
const cachedGeo = (key, fn) => geoCache[key] || (geoCache[key] = fn());
const MAT = {
  metal: (c, rough = 0.2, bump) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 1, roughness: rough, clearcoat: 0.3, clearcoatRoughness: 0.2, bumpMap: bump || null, bumpScale: 0.004, roughnessMap: bump || null }),
  plastic: (c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.05, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.3 }),
  clear: (c, op = 0.4) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.1, roughness: 0.08, transparent: true, opacity: op, clearcoat: 1, depthWrite: false }),
  dark: () => new THREE.MeshStandardMaterial({ color: 0x15171f, metalness: 0.55, roughness: 0.45 }),
  glow: (c) => new THREE.MeshBasicMaterial({ color: c }),
};
function setUV(tex) { tex.repeat.set(1 / 0.96, 1 / 0.96); tex.offset.set(0.5, 0.5); tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; return tex; }

function buildBlade(bl) {
  const g = new THREE.Group(); g.name = 'blade';
  const sh = bl.shape;
  const n = sh.kind === 'hex' ? 6 : sh.n;
  const mainFn = (th) => outlineR(sh, th);
  // ---- Layer 1: metal sub-blade (lower, offset, finer teeth)
  const subFn = (th) => {
    const u = (((th * n * 2) / TAU) % 1 + 1) % 1;
    return (sh.base - 0.02) + 0.035 * (u < 0.25 ? u / 0.25 : 1 - (u - 0.25) / 0.75);
  };
  const AK = 'blade_' + bl.id, useA = Assets.has(AK);
  const subGeo = useA ? Assets.geo(AK, 'sub') : cachedGeo('bs-' + bl.id, () => wedgeExtrude(makeOutlineShape(subFn, 0.2), 0.035, subFn, { thin: 0.3 }));
  const eng = setUV(engraveTex(bl.id, n, bl.accent).clone()); eng.needsUpdate = true;
  const metalMat = MAT.metal(new THREE.Color(bl.metal).multiplyScalar(0.82), 0.26, eng);
  const sub = new THREE.Mesh(subGeo, MAT.metal(new THREE.Color(bl.metal).multiplyScalar(0.72), 0.32));
  if (!useA) sub.rotation.y = Math.PI / n; sub.castShadow = true; g.add(sub);
  // ---- Layer 2: metal main blade with windows
  const windows = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + Math.PI / n;
    const rr = sh.base - 0.04;
    if (rr > 0.27) windows.push(slotPath(0.245, Math.min(rr, 0.31), a, Math.min(0.34, 1.1 / n)));
  }
  const mainGeo = useA ? Assets.geo(AK, 'metal') : cachedGeo('bm-' + bl.id, () => wedgeExtrude(makeOutlineShape(mainFn, 0.205, windows), 0.075, mainFn, { thin: 0.62 }));
  const main = new THREE.Mesh(mainGeo, metalMat);
  if (!useA) main.position.y = 0.03; main.castShadow = true; main.receiveShadow = true; g.add(main);
  // glowing accent edge line along contact outline
  const linePts = [];
  for (let i = 0; i <= 200; i++) { const th = (i / 200) * TAU, r = mainFn(th) - 0.004; linePts.push(new THREE.Vector3(Math.cos(th) * r, 0.03 + 0.02, -Math.sin(th) * r)); }
  const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePts), new THREE.LineBasicMaterial({ color: bl.accent, transparent: true, opacity: 0.9 }));
  g.add(edge);
  // ---- Layer 3: tinted polymer frame (angular, rotated so metal tips lead)
  const frameFn = (th) => {
    const u = (((th * n) / TAU) % 1 + 1) % 1;
    const wing = u < 0.5 ? smoothstep(0, 0.12, u) * (1 - smoothstep(0.32, 0.5, u)) : 0;
    return 0.255 + wing * (sh.base - 0.22);
  };
  const frameGeo = useA ? Assets.geo(AK, 'frame') : cachedGeo('bf-' + bl.id, () => wedgeExtrude(makeOutlineShape(frameFn, 0.19), 0.05, frameFn, { thin: 0.5, hub: 0.2 }));
  const frame = new THREE.Mesh(frameGeo, MAT.plastic(bl.plastic));
  if (!useA) { frame.position.y = 0.1; frame.rotation.y = -0.22; } frame.castShadow = true; g.add(frame);
  // clear tinted overlay wings (translucent)
  const clearFn = (th) => frameFn(th + 0.35) * 0.96;
  const clearGeo = useA ? Assets.geo(AK, 'clear') : cachedGeo('bc-' + bl.id, () => wedgeExtrude(makeOutlineShape(clearFn, 0.19), 0.02, clearFn, { thin: 0.2, bevel: 0.004 }));
  const clr = new THREE.Mesh(clearGeo, MAT.clear(bl.accent, 0.3)); if (!useA) clr.position.y = 0.155; g.add(clr);
  // ---- Layer 4: centre chip (faceted metal ring + emblem + dome + screws)
  const ring = new THREE.Mesh(useA ? Assets.geo(AK, 'chip') : cachedGeo('chipring', () => {
    const s = new THREE.Shape(); const N = 12;
    for (let i = 0; i <= N; i++) { const a = (i / N) * TAU, r = i % 2 ? 0.215 : 0.228; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const h = new THREE.Path(); h.absarc(0, 0, 0.17, 0, TAU, true); s.holes.push(h);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2 });
    geo.rotateX(-Math.PI / 2); return geo;
  }), MAT.metal(0x2a2e3a, 0.35));
  if (!useA) ring.position.y = 0.11; ring.castShadow = true; g.add(ring);
  const chipBase = new THREE.Mesh(cachedGeo('chipbase', () => new THREE.CylinderGeometry(0.172, 0.172, 0.06, 48)), MAT.dark());
  chipBase.position.y = 0.14; g.add(chipBase);
  const emT = emblemTexture(bl);
  const em = new THREE.Mesh(cachedGeo('emb', () => new THREE.CircleGeometry(0.165, 64)), new THREE.MeshStandardMaterial({ map: emT, emissive: 0xffffff, emissiveMap: emT, emissiveIntensity: 0.18, metalness: 0.3, roughness: 0.3 }));
  em.rotation.x = -Math.PI / 2; em.position.y = 0.171; g.add(em);
  const dome = new THREE.Mesh(cachedGeo('dome', () => { const d = new THREE.SphereGeometry(0.17, 48, 16, 0, TAU, 0, Math.PI * 0.5); d.scale(1, 0.28, 1); return d; }), MAT.clear(0xffffff, 0.22));
  dome.position.y = 0.171; g.add(dome);
  const screwGeo = cachedGeo('screw', () => new THREE.CylinderGeometry(0.014, 0.014, 0.012, 6));
  const screwMat = MAT.metal(0xd8dde8, 0.25);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.5;
    const sc = new THREE.Mesh(screwGeo, screwMat); sc.position.set(Math.cos(a) * 0.198, 0.186, Math.sin(a) * 0.198); g.add(sc);
  }
  // accent lights on each contact tip
  const studGeo = cachedGeo('stud', () => new THREE.BoxGeometry(0.05, 0.012, 0.02));
  const studMat = MAT.glow(bl.accent);
  for (let i = 0; i < n; i++) {
    const th = (i / n) * TAU + 0.18;
    const r = 0.29;
    const st = new THREE.Mesh(studGeo, studMat);
    st.position.set(Math.cos(th) * r, 0.137, -Math.sin(th) * r); st.rotation.y = th;
    g.add(st);
  }
  return g;
}
function ratchetLabel(rt) {
  return canvasTex('rl-' + rt.id, 512, 64, (g, W, H) => {
    g.fillStyle = '#' + rt.color.toString(16).padStart(6, '0'); g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = '700 38px "Chakra Petch",sans-serif'; g.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) { g.fillText(rt.code, i * 128 + 14, H / 2 + 2); g.fillRect(i * 128 + 118, 18, 3, 28); }
  });
}
function buildRatchet(rt) {
  const g = new THREE.Group(); g.name = 'ratchet';
  const h = rt.h / 500; // 60 -> 0.12
  const col = new THREE.Color(rt.color);
  // body: notched ring
  const AK = 'ratchet_' + rt.id, useA = Assets.has(AK);
  const body = new THREE.Mesh(useA ? Assets.geo(AK, 'body') : cachedGeo('rbody' + rt.prongs + rt.h, () => {
    const s = new THREE.Shape(), N = 120;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TAU, u = (((a * rt.prongs) / TAU) % 1 + 1) % 1;
      const r = 0.235 - 0.012 * smoothstep(0.42, 0.48, u) * (1 - smoothstep(0.52, 0.58, u));
      i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const hole = new THREE.Path(); hole.absarc(0, 0, 0.12, 0, TAU, true); s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: h * 0.7, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 6 });
    geo.rotateX(-Math.PI / 2); return geo;
  }), MAT.plastic(col));
  if (!useA) body.position.y = 0.006; body.castShadow = true; g.add(body);
  // printed code band
  const band = new THREE.Mesh(cachedGeo('rband' + rt.h, () => new THREE.CylinderGeometry(0.238, 0.238, h * 0.28, 64, 1, true)), new THREE.MeshStandardMaterial({ map: ratchetLabel(rt), metalness: 0.2, roughness: 0.5 }));
  band.position.y = h * 0.33; g.add(band);
  // metal reinforcement ring
  const ring = new THREE.Mesh(cachedGeo('rring', () => new THREE.TorusGeometry(0.24, 0.008, 6, 64)), MAT.metal(0xc9d0dc, 0.25));
  ring.rotation.x = Math.PI / 2; ring.position.y = h * 0.53; g.add(ring);
  // angled lock teeth (ratchet prongs) rising above the body
  const toothW = clamp(TAU / rt.prongs * 0.42, 0.18, 0.9);
  const tg = cachedGeo('rtooth' + rt.prongs + rt.h, () => {
    const s = new THREE.Shape();
    // profile in (angle, height): ramp up then sharp drop = ratchet tooth
    const r0 = 0.165, r1 = 0.255, N = 10;
    const pts = [];
    for (let i = 0; i <= N; i++) { const a = (i / N) * toothW; pts.push([Math.cos(a) * r1, Math.sin(a) * r1]); }
    for (let i = N; i >= 0; i--) { const a = (i / N) * toothW; pts.push([Math.cos(a) * r0, Math.sin(a) * r0]); }
    pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    const geo = new THREE.ExtrudeGeometry(s, { depth: h * 0.45, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 });
    geo.rotateX(-Math.PI / 2);
    // ramp: height grows with angle
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i); if (y < h * 0.2) continue;
      const a = Math.atan2(-p.getZ(i), p.getX(i));
      const t = clamp(a / toothW, 0, 1);
      p.setY(i, h * 0.12 + (y - h * 0.12) * (0.35 + 0.65 * t));
    }
    geo.computeVertexNormals(); return geo;
  });
  const tm = MAT.plastic(col.clone().offsetHSL(0, 0.05, 0.12));
  if (useA) { const tt = new THREE.Mesh(Assets.geo(AK, 'teeth'), tm); tt.castShadow = true; g.add(tt); }
  else for (let i = 0; i < rt.prongs; i++) {
    const t = new THREE.Mesh(tg, tm); t.position.y = h * 0.62; t.rotation.y = (i / rt.prongs) * TAU; t.castShadow = true; g.add(t);
  }
  g.userData.h = h;
  return g;
}
const BIT_LEN = { flat: 0.25, rush: 0.25, rubber: 0.25, taper: 0.26, point: 0.26, ball: 0.26, needle: 0.28, hneedle: 0.34, lowflat: 0.22, accel: 0.25, orb: 0.25, htaper: 0.32 };
function bitProfile(tip, L) {
  const V = (x, y) => new THREE.Vector2(x, y);
  const p = [V(0.001, 0), V(0.19, 0), V(0.2, -0.01), V(0.2, -0.045), V(0.16, -0.06), V(0.145, -0.075), V(0.145, -0.13), V(0.135, -0.14)];
  switch (tip) {
    case 'flat': p.push(V(0.12, -0.16), V(0.115, -L + 0.012), V(0.105, -L), V(0.001, -L)); break;
    case 'rush': p.push(V(0.12, -0.16), V(0.108, -L + 0.03), V(0.09, -L + 0.004), V(0.07, -L), V(0.001, -L)); break;
    case 'rubber': p.push(V(0.125, -0.16), V(0.125, -L + 0.06), V(0.001, -L + 0.06)); break;
    case 'taper': p.push(V(0.11, -0.16), V(0.05, -L + 0.012), V(0.04, -L), V(0.001, -L)); break;
    case 'point': p.push(V(0.1, -0.16), V(0.035, -L + 0.016), V(0.016, -L + 0.002), V(0.001, -L)); break;
    case 'ball': p.push(V(0.1, -0.16)); for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; p.push(V(Math.cos(a) * 0.075 + 0.001, -L + 0.075 - Math.sin(a) * 0.075)); } break;
    case 'needle': p.push(V(0.095, -0.15), V(0.03, -L + 0.03), V(0.004, -L)); break;
    case 'hneedle': p.push(V(0.11, -0.16), V(0.085, -0.25), V(0.03, -L + 0.03), V(0.004, -L)); break;
    case 'lowflat': p.push(V(0.13, -0.15), V(0.13, -L + 0.012), V(0.12, -L), V(0.001, -L)); break;
    case 'accel': p.push(V(0.125, -0.16), V(0.118, -0.19), V(0.128, -0.2), V(0.11, -L + 0.012), V(0.095, -L), V(0.001, -L)); break;
    case 'orb': p.push(V(0.12, -0.15)); for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; p.push(V(Math.cos(a) * 0.115 + 0.001, -L + 0.06 - Math.sin(a) * 0.06)); } break;
    case 'htaper': p.push(V(0.11, -0.16), V(0.08, -0.24), V(0.045, -L + 0.012), V(0.035, -L), V(0.001, -L)); break;
  }
  return p;
}
function gearGeo(teeth, rIn, rOut, depth) {
  const s = new THREE.Shape(), N = teeth * 8;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU, u = (i % 8) / 8;
    const r = u < 0.15 ? lerp(rIn, rOut, u / 0.15) : u < 0.5 ? rOut : u < 0.65 ? lerp(rOut, rIn, (u - 0.5) / 0.15) : rIn;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const h = new THREE.Path(); h.absarc(0, 0, rIn - 0.03, 0, TAU, true); s.holes.push(h);
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 1 });
  geo.rotateX(-Math.PI / 2); return geo;
}
function buildBit(bt) {
  const g = new THREE.Group(); g.name = 'bit';
  const L = BIT_LEN[bt.tip];
  const AK = 'bit_' + bt.id;
  if (Assets.has(AK)) {
    const add = (name, mat) => { const gg = Assets.geo(AK, name); if (!gg) return null; const m = new THREE.Mesh(gg, mat); m.position.y = -L; m.castShadow = true; g.add(m); return m; };
    add('body', MAT.plastic(bt.tip === 'rubber' ? 0xd9dde6 : bt.color));
    add('tabs', MAT.plastic(new THREE.Color(bt.color).offsetHSL(0, 0, -0.15)));
    add('gear', MAT.metal(0xc8ced9, 0.28)); add('guard', MAT.metal(0x9aa3b4, 0.3)); add('tip', MAT.metal(0xe6e9f0, 0.15));
    if (bt.tip === 'rubber') {
      const rub = new THREE.Mesh(cachedGeo('rub', () => new THREE.CylinderGeometry(0.125, 0.112, 0.06, 40)), new THREE.MeshStandardMaterial({ color: 0x18181d, roughness: 0.95 }));
      rub.position.y = -L + 0.03; g.add(rub);
    }
    g.userData.len = L;
    return g;
  }
  const geo = cachedGeo('bit-' + bt.tip, () => new THREE.LatheGeometry(bitProfile(bt.tip, L), 56));
  const body = new THREE.Mesh(geo, MAT.plastic(bt.tip === 'rubber' ? 0xd9dde6 : bt.color));
  body.material.side = THREE.DoubleSide;
  body.castShadow = true; g.add(body);
  // lock tabs on the collar
  const tab = cachedGeo('btab', () => new THREE.BoxGeometry(0.05, 0.035, 0.06));
  const tabM = MAT.plastic(new THREE.Color(bt.color).offsetHSL(0, 0, -0.15));
  for (let i = 0; i < 2; i++) { const t = new THREE.Mesh(tab, tabM); const a = i * Math.PI; t.position.set(Math.cos(a) * 0.2, -0.025, Math.sin(a) * 0.2); t.rotation.y = -a; g.add(t); }
  // ribs on the body
  const rib = cachedGeo('brib', () => new THREE.BoxGeometry(0.012, 0.05, 0.02));
  const ribM = MAT.dark();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; const r = new THREE.Mesh(rib, ribM); r.position.set(Math.cos(a) * 0.146, -0.105, Math.sin(a) * 0.146); r.rotation.y = -a; g.add(r); }
  if (bt.tip === 'rubber') {
    const rub = new THREE.Mesh(cachedGeo('rub', () => new THREE.CylinderGeometry(0.125, 0.112, 0.06, 40)), new THREE.MeshStandardMaterial({ color: 0x18181d, roughness: 0.95 }));
    rub.position.y = -L + 0.03; g.add(rub);
  }
  if (bt.tip === 'needle' || bt.tip === 'hneedle' || bt.tip === 'ball' || bt.tip === 'point') {
    const tipM = MAT.metal(0xe6e9f0, 0.15);
    const tipG = cachedGeo('tipcap-' + bt.tip, () => new THREE.LatheGeometry(bitProfile(bt.tip, L).filter((v) => v.y < -L + 0.05), 40));
    const tc = new THREE.Mesh(tipG, tipM); tc.scale.setScalar(1.01); g.add(tc);
  }
  // full gear rim for rail-gripping bits (larger, more teeth for higher grip)
  if (bt.grip > 0.3) {
    const teeth = bt.grip > 1 ? 20 : bt.grip > 0.8 ? 18 : 14;
    const gm = new THREE.Mesh(cachedGeo('gear' + teeth, () => gearGeo(teeth, 0.15, 0.185, 0.03)), MAT.metal(0xc8ced9, 0.28));
    gm.position.y = -0.125; gm.castShadow = true; g.add(gm);
  } else {
    // smooth guard ring for stamina/defence bits
    const ring = new THREE.Mesh(cachedGeo('bguard', () => new THREE.TorusGeometry(0.15, 0.012, 8, 48)), MAT.metal(0x9aa3b4, 0.3));
    ring.rotation.x = Math.PI / 2; ring.position.y = -0.11; g.add(ring);
  }
  // code letter disc on top
  const cap = new THREE.Mesh(cachedGeo('bcap', () => new THREE.TorusGeometry(0.19, 0.01, 6, 48)), MAT.metal(0x8a93a6, 0.3));
  cap.rotation.x = Math.PI / 2; cap.position.y = -0.002; g.add(cap);
  g.userData.len = L;
  return g;
}
/* Full bey: tip touches y=0 */
function buildBey(cfg) {
  const root = new THREE.Group();
  const spin = new THREE.Group(); root.add(spin);
  const bit = buildBit(BIT[cfg.t]), rat = buildRatchet(RATCHET[cfg.r]), bl = buildBlade(BLADE[cfg.b]);
  const L = bit.userData.len, h = rat.userData.h;
  bit.position.y = L; rat.position.y = L - 0.004; bl.position.y = L + h * 0.5;
  spin.add(bit, rat, bl);
  root.userData = { spin, parts: { blade: bl, ratchet: rat, bit }, height: L + h * 0.5 + 0.2, bladeY: L + h * 0.5 + 0.08 };
  return root;
}
function buildPart(kind, id) {
  if (kind === 'blade') return buildBlade(BLADE[id]);
  if (kind === 'ratchet') return buildRatchet(RATCHET[id]);
  const b = buildBit(BIT[id]); b.position.y = b.userData.len; const g = new THREE.Group(); g.add(b); return g;
}
function disposeTree(o) {
  o.traverse((n) => { if (n.material) { (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => m.dispose()); } });
}
/* Studio environment for metal reflections: softboxes + coloured rims */
function makeEnv(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 32, 16);
  const cols = []; const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 10;
    const c = new THREE.Color().setHSL(0.62, 0.3, clamp(0.03 + Math.max(0, y) * 0.22, 0.01, 0.4));
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const panel = (x, y, z, w, h, col, k = 1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
  panel(0, 9, 0, 6, 6, 0xffffff, 3);           // top softbox
  panel(8, 3, 3, 2, 8, 0xffffff, 2);           // strip right
  panel(-8, 3, 3, 2, 8, 0xffffff, 1.5);        // strip left
  panel(5, 1, -7, 4, 3, 0xff7a2a, 2.5);        // warm rim
  panel(-5, 1, -7, 4, 3, 0x36c8ff, 2.5);       // cool rim
  panel(0, -2, 8, 10, 1, 0x8899bb, 0.8);       // floor bounce
  const env = pm.fromScene(s, 0.02).texture; pm.dispose();
  return env;
}

/* ---------- thumbnails (separate small renderer) ---------- */
const Thumbs = {
  r: null, scene: null, cam: null, cache: {},
  init() {
    const c = document.createElement('canvas'); c.width = c.height = 224;
    this.r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.r.setPixelRatio(1); this.r.setSize(224, 224, false);
    this.r.outputEncoding = THREE.sRGBEncoding; this.r.toneMapping = THREE.ACESFilmicToneMapping; this.r.toneMappingExposure = 1.2;
    this.scene = new THREE.Scene(); this.scene.environment = makeEnv(this.r);
    this.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x202030, 0.6));
    const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(2, 4, 3); this.scene.add(d);
    const r1 = new THREE.PointLight(0xff7a2a, 1.5, 6); r1.position.set(-1.5, 0.5, -1); this.scene.add(r1);
    this.cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  },
  get(kind, id) {
    const k = kind + ':' + id; if (this.cache[k]) return this.cache[k];
    if (!this.r) this.init();
    const obj = buildPart(kind, id);
    this.scene.add(obj);
    const box = new THREE.Box3().setFromObject(obj), ctr = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    const R = Math.max(sz.x, sz.y, sz.z);
    const dist = R * (kind === 'blade' ? 2.0 : 2.3);
    const elev = kind === 'blade' ? 0.9 : kind === 'bit' ? 0.25 : 0.55;
    this.cam.position.set(ctr.x + dist * 0.5, ctr.y + dist * elev, ctr.z + dist * 0.8);
    this.cam.lookAt(ctr);
    this.r.render(this.scene, this.cam);
    const url = this.r.domElement.toDataURL('image/png');
    this.scene.remove(obj); disposeTree(obj);
    return (this.cache[k] = url);
  },
};
