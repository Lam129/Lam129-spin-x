// Packs assets/*.glb into assets/parts.bin + assets/parts.json (int16 positions, int8 normals, uint16/32 indices)
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'assets');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.glb')).sort();
const SCALE = 0.6; // max coordinate magnitude
const index = {}; const groups = { blade1: { chunks: [], offset: 0 }, blade2: { chunks: [], offset: 0 }, ratchet: { chunks: [], offset: 0 }, bit: { chunks: [], offset: 0 } }; const where = {};
const bladeFiles = files.filter((f) => f.startsWith('blade_'));
let chunks, offset;
const push = (buf) => { const pad = (4 - (buf.length % 4)) % 4; const b = Buffer.concat([buf, Buffer.alloc(pad)]); chunks.push(b); const o = offset; offset += b.length; return o; };
for (const f of files) {
  const g = fs.readFileSync(path.join(dir, f));
  const jsonLen = g.readUInt32LE(12); const json = JSON.parse(g.slice(20, 20 + jsonLen).toString());
  const binStart = 20 + jsonLen + 8; const bin = g.slice(binStart);
  const acc = (i) => { const a = json.accessors[i], bv = json.bufferViews[a.bufferView]; return { a, start: (bv.byteOffset || 0) + (a.byteOffset || 0) }; };
  const key = f.replace('.glb', '');
  const kind = key.split('_')[0];
  const gname = kind === 'blade' ? (bladeFiles.indexOf(f) < bladeFiles.length / 2 ? 'blade1' : 'blade2') : kind;
  where[key] = gname;
  const grp = groups[gname]; chunks = grp.chunks; offset = grp.offset;
  index[key] = [];
  for (const node of json.nodes) {
    if (node.mesh == null) continue;
    const mesh = json.meshes[node.mesh];
    for (const prim of mesh.primitives) {
      const P = acc(prim.attributes.POSITION), N = acc(prim.attributes.NORMAL), I = acc(prim.indices);
      const C = prim.attributes.COLOR_0 != null ? acc(prim.attributes.COLOR_0) : null;
      const n = P.a.count;
      const pos = Buffer.alloc(n * 6), nrm = Buffer.alloc(n * 3);
      for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) {
        let v = bin.readFloatLE(P.start + i * 12 + c * 4);
        if (node.translation) v += node.translation[c];
        pos.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v / SCALE)) * 32767), i * 6 + c * 2);
        nrm.writeInt8(Math.round(bin.readFloatLE(N.start + i * 12 + c * 4) * 127), i * 3 + c);
      }
      const ic = I.a.count, big = n > 65535;
      const idx = Buffer.alloc(ic * (big ? 4 : 2));
      for (let i = 0; i < ic; i++) {
        const v = I.a.componentType === 5125 ? bin.readUInt32LE(I.start + i * 4) : I.a.componentType === 5123 ? bin.readUInt16LE(I.start + i * 2) : bin.readUInt8(I.start + i);
        big ? idx.writeUInt32LE(v, i * 4) : idx.writeUInt16LE(v, i * 2);
      }
      // baked ambient occlusion (red channel of COLOR_0) -> one byte per vertex
      let ao = null;
      if (C) {
        const comps = C.a.type === 'VEC4' ? 4 : 3, ct = C.a.componentType;
        const sz = ct === 5126 ? 4 : ct === 5123 ? 2 : 1;
        ao = Buffer.alloc(n);
        for (let i = 0; i < n; i++) {
          const o = C.start + i * comps * sz;
          const v = ct === 5126 ? bin.readFloatLE(o) : ct === 5123 ? bin.readUInt16LE(o) / 65535 : bin.readUInt8(o) / 255;
          ao.writeUInt8(Math.round(Math.max(0, Math.min(1, v)) * 255), i);
        }
      }
      const entry = { name: mesh.name, n, ic, big, p: push(pos), q: push(nrm), i: push(idx) };
      if (ao) entry.c = push(ao);
      index[key].push(entry);
      grp.offset = offset;
    }
  }
}
const sizes = {};
for (const [g, v] of Object.entries(groups)) { const txt = Buffer.concat(v.chunks).toString('base64'); sizes[g] = txt.length; fs.writeFileSync(path.join(dir, `parts_${g}.txt`), txt); }
fs.writeFileSync(path.join(dir, 'parts.json'), JSON.stringify({ scale: SCALE, groups: Object.keys(groups), sizes, where, parts: index }));
console.log('packed', files.length, 'files', Object.entries(groups).map(([g, v]) => g + ':' + v.offset).join(' '));
