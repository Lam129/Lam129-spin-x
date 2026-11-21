// Packs assets/*.glb into assets/parts.bin + assets/parts.json (int16 positions, int8 normals, uint16/32 indices)
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'assets');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.glb')).sort();
const SCALE = 0.6; // max coordinate magnitude
const chunks = []; let offset = 0; const index = {};
const push = (buf) => { const pad = (4 - (buf.length % 4)) % 4; const b = Buffer.concat([buf, Buffer.alloc(pad)]); chunks.push(b); const o = offset; offset += b.length; return o; };
for (const f of files) {
  const g = fs.readFileSync(path.join(dir, f));
  const jsonLen = g.readUInt32LE(12); const json = JSON.parse(g.slice(20, 20 + jsonLen).toString());
  const binStart = 20 + jsonLen + 8; const bin = g.slice(binStart);
  const acc = (i) => { const a = json.accessors[i], bv = json.bufferViews[a.bufferView]; return { a, start: (bv.byteOffset || 0) + (a.byteOffset || 0) }; };
  const key = f.replace('.glb', '');
  index[key] = [];
  for (const node of json.nodes) {
    if (node.mesh == null) continue;
    const mesh = json.meshes[node.mesh];
    for (const prim of mesh.primitives) {
      const P = acc(prim.attributes.POSITION), N = acc(prim.attributes.NORMAL), I = acc(prim.indices);
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
      index[key].push({ name: mesh.name, n, ic, big, p: push(pos), q: push(nrm), i: push(idx) });
    }
  }
}
fs.writeFileSync(path.join(dir, 'parts.txt'), Buffer.concat(chunks).toString('base64'));
fs.writeFileSync(path.join(dir, 'parts.json'), JSON.stringify({ scale: SCALE, parts: index }));
console.log('packed', files.length, 'files ->', offset, 'bytes');
