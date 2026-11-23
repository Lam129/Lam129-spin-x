/* ============================== AVATARS v4 (original Japanese-anime-style portraits, procedural SVG) ==============================
   Bust portraits drawn the way Japanese character sheets usually are: big low-set eyes (≈¼ of the face height)
   with a heavy upper lash that flicks outward, tall irises with two catch-lights, a soft cheek-to-pointed-chin
   face, hair built from pointed locks with an "angel ring" highlight, thin coloured line art instead of heavy
   black outlines, and one flat shadow tone. Every character is an original design. */
const AV_INK = '#2b1b33';
function avHex(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function avRgb(r, g, b) { return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
/* k < 1 darkens toward a cool purple (anime shadow tint), k > 1 lightens toward white */
function avShade(hex, k) {
  const [r, g, b] = avHex(hex);
  if (k >= 1) { const t = Math.min(1, k - 1); return avRgb(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t); }
  const t = 1 - k; return avRgb(r * k + 40 * t * 0.5, g * k + 20 * t * 0.5, b * k + 70 * t * 0.5);
}
/* ---- hair styles (front view, viewBox 200). back = behind the head, front = bangs/side locks over the face ---- */
const AV_HAIR = {
  spiky: {
    back: 'M54,112 L34,100 L50,92 L28,72 L54,70 L40,46 L66,52 L62,26 L84,44 L96,16 L108,42 L128,22 L128,50 L154,38 L144,64 L172,64 L150,86 L168,96 L146,112Z',
    front: 'M54,104 Q54,66 78,56 Q100,48 122,56 Q146,66 146,104 L138,86 L136,102 L126,78 L120,98 L110,74 L102,96 L96,72 L88,94 L82,76 L76,98 L70,82 L64,102Z M56,96 L46,132 L64,116Z M144,96 L154,132 L136,116Z',
    ring: 'M70,70 Q86,60 98,62 M106,62 Q120,62 132,72',
  },
  long: {
    back: 'M56,98 C48,56 152,56 144,98 L152,198 L130,198 L128,146 L72,146 L70,198 L48,198Z',
    front: 'M56,102 Q56,62 100,58 Q144,62 144,102 L138,90 L132,102 L124,84 L116,100 L108,86 L100,100 L92,86 L84,100 L76,84 L68,102 L62,92Z M58,96 Q50,134 56,176 L66,166 Q62,130 68,104Z M142,96 Q150,134 144,176 L134,166 Q138,130 132,104Z',
    ring: 'M68,70 Q84,62 98,62 M104,62 Q120,62 134,72',
  },
  buzz: {
    back: '',
    front: 'M60,104 Q56,58 100,54 Q144,58 140,104 Q136,84 126,78 L120,84 L112,74 L104,82 L96,74 L88,82 L80,76 Q66,82 60,104Z',
    ring: 'M76,64 Q100,56 124,64',
  },
  pony: {
    back: 'M58,98 C52,60 148,60 142,98Z',
    tail: 'M124,60 C172,46 184,104 162,150 C158,124 150,98 130,82Z',
    front: 'M56,104 Q54,64 98,58 Q142,62 144,102 L136,88 L130,100 Q122,80 104,76 L98,94 Q90,78 80,80 L72,98 L66,88Z M58,96 Q52,128 58,156 L66,146 Q62,124 66,104Z',
    ring: 'M68,72 Q86,60 104,62 Q122,64 134,74',
  },
  twin: {
    back: 'M58,98 C52,60 148,60 142,98Z',
    tail: 'M66,72 C26,68 16,132 34,182 C40,152 50,120 72,94Z M134,72 C174,68 184,132 166,182 C160,152 150,120 128,94Z',
    front: 'M56,102 Q56,62 100,58 Q144,62 144,102 L138,88 L132,100 L124,82 L116,98 L108,84 L100,98 L92,84 L84,98 L76,82 L68,100 L62,88Z',
    ring: 'M68,70 Q84,62 98,62 M104,62 Q120,62 134,72',
  },
  bob: {
    back: 'M54,102 C46,56 154,56 146,102 L150,142 Q134,152 124,138 L76,138 Q66,152 50,142Z',
    front: 'M56,96 Q56,60 100,56 Q144,60 144,96 L134,98 L124,93 L114,97 L104,93 L96,97 L86,93 L76,97 L66,93Z M56,94 Q50,122 56,144 L68,140 Q64,118 66,98Z M144,94 Q150,122 144,144 L132,140 Q136,118 134,98Z',
    ring: 'M68,68 Q86,58 100,60 Q116,58 132,68',
  },
  mane: {
    back: 'M46,146 L20,128 L40,116 L14,92 L44,88 L26,58 L58,62 L50,30 L80,48 L92,16 L108,46 L130,18 L132,50 L162,32 L152,64 L184,62 L160,90 L188,106 L158,116 L178,140 L150,134Z',
    front: 'M52,106 Q52,64 80,54 Q100,46 120,54 Q148,64 148,106 L140,84 L138,104 L128,76 L120,98 L112,70 L104,94 L96,68 L88,94 L82,72 L74,98 L68,80 L62,104Z M54,96 L40,140 L62,118Z M146,96 L160,140 L138,118Z',
    ring: 'M70,68 Q86,56 98,58 M106,58 Q122,58 132,68',
  },
  slick: {
    back: 'M58,98 C54,52 146,52 142,98 L146,112 L138,100 Q124,70 100,68 Q76,70 62,100 L54,112Z',
    front: 'M62,100 Q62,66 100,60 Q138,66 138,100 Q126,78 100,76 Q76,78 62,100Z M98,64 Q82,86 90,112 Q94,90 106,74Z',
    ring: 'M72,70 Q100,58 128,70',
  },
};
const AV_FACE = {
  soft: 'M60,98 C60,126 72,144 90,153 Q100,158 110,153 C128,144 140,126 140,98 C140,62 60,62 60,98Z',
  square: 'M58,98 C58,128 66,146 84,154 Q100,160 116,154 C134,146 142,128 142,98 C142,60 58,60 58,98Z',
};
function avatarSVG(av, typeCss = '#888', size = 64) {
  const a = Object.assign({ hair: 'spiky', hairC: '#3a2a1e', skin: '#f6d2b4', eye: '#36a0ff', eyes: 'sharp', brow: 'firm', mouth: 'grin', acc: 'none', accC: '#fff', bg: '#334', face: 'soft' }, av || {});
  const id = 'v' + Math.random().toString(36).slice(2, 8);
  const H = AV_HAIR[a.hair] || AV_HAIR.spiky, F = AV_FACE[a.face] || AV_FACE.soft;
  const male = a.sex ? a.sex === 'm' : ['spiky', 'buzz', 'mane', 'slick'].includes(a.hair);
  const hairS = avShade(a.hairC, 0.7), hairL = avShade(a.hairC, 1.45), hairLine = avShade(a.hairC, 0.38);
  const skinS = avShade(a.skin, 0.86), skinLine = avShade(a.skin, 0.42);
  const coat = typeCss, coatS = avShade(typeCss, 0.66), coatL = avShade(typeCss, 1.3);
  const L = (c, w = 1.6) => `stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  // ---- eyes: big, low, tall iris, heavy upper lash with an outward flick ----
  const EY = { round: [-20, 18, -2, 0], sharp: [-16, 15, -5, 2], narrow: [-11, 12, -4, 2] }[a.eyes] || [-16, 15, -5, 2];
  const eye = (cx, cy, s) => {
    let [top, bot, outY, flick] = EY;
    if (male) { top *= 0.86; bot *= 0.86; flick = -1.5; }
    const ix = cx - 12 * s, iy = cy + 6, ox = cx + 15.5 * s, oy = cy + outY;
    const white = `M${ix},${iy} Q${cx + s},${cy + top} ${ox},${oy} Q${cx + 3 * s},${cy + bot} ${ix},${iy}Z`;
    const cid = id + 'e' + (s > 0 ? 'r' : 'l');
    const irx = 10.6, iry = a.eyes === 'narrow' ? 11.5 : 14, icx = cx + 1.5 * s, icy = cy + 2.5;
    const lash = `M${ix - 1.5 * s},${iy + 0.5} Q${cx + s},${cy + top - 1.5} ${ox},${oy} L${ox + (4 + flick) * s},${oy - 3.5 - flick} L${ox - 1 * s},${oy + 2.2} Q${cx + s},${cy + top + 3.2} ${ix},${iy + 1.8}Z`;
    return `<clipPath id="${cid}"><path d="${white}"/></clipPath>
      <path d="${white}" fill="#fffdfb"/>
      <g clip-path="url(#${cid})">
        <ellipse cx="${icx}" cy="${icy}" rx="${irx}" ry="${iry}" fill="url(#${id}i)"/>
        <ellipse cx="${icx}" cy="${icy + 1.5}" rx="${irx * 0.45}" ry="${iry * 0.55}" fill="${avShade(a.eye, 0.25)}"/>
        <ellipse cx="${icx}" cy="${icy + 4}" rx="${irx * 0.8}" ry="${iry * 0.38}" fill="${avShade(a.eye, 1.35)}" opacity="0.55"/>
        <path d="${white}" fill="none" stroke="${avShade(a.eye, 0.4)}" stroke-width="4" opacity="0.35" transform="translate(0,-2.2)"/>
        <ellipse cx="${icx - 3.8 * s}" cy="${icy - 5.6}" rx="4.2" ry="3.4" fill="#fff"/>
        <circle cx="${icx + 3.6 * s}" cy="${icy + 4.4}" r="1.5" fill="#fff" opacity="0.95"/>
      </g>
      <path d="${lash}" fill="${AV_INK}"/>
      <path d="M${cx + 5 * s},${cy + bot - 1.2} Q${cx + 10 * s},${cy + bot - 3.6} ${ox - 0.5 * s},${oy + 4}" fill="none" ${L(AV_INK, 1.1)}/>`;
  };
  const browY = 91;
  const brow = (cx, s) => ({
    firm: `M${cx - 9 * s},${browY + 1} Q${cx},${browY - 3} ${cx + 11 * s},${browY - 2}`,
    angry: `M${cx - 9 * s},${browY + 4} Q${cx},${browY} ${cx + 11 * s},${browY - 4}`,
    soft: `M${cx - 9 * s},${browY} Q${cx + s},${browY - 5} ${cx + 11 * s},${browY - 1}`,
    cocky: s > 0 ? `M${cx - 9},${browY - 1} Q${cx},${browY - 6} ${cx + 11},${browY - 4}` : `M${cx + 9},${browY + 3} Q${cx},${browY} ${cx - 11},${browY - 1}`,
  }[a.brow] || `M${cx - 9 * s},${browY + 1} Q${cx},${browY - 3} ${cx + 11 * s},${browY - 2}`);
  const mouths = {
    grin: `<path d="M90,137 Q100,148 110,137 Q100,141 90,137Z" fill="#7a2a3a" ${L(skinLine, 1.2)}/><path d="M91.5,137.6 Q100,140.4 108.5,137.6 L107.5,139.4 Q100,141.6 92.5,139.4Z" fill="#fff"/>`,
    smile: `<path d="M92,138 Q100,144 108,138" fill="none" ${L(skinLine, 1.4)}/>`,
    smirk: `<path d="M93,140 Q101,141 109,135" fill="none" ${L(skinLine, 1.4)}/>`,
    shout: `<path d="M90,134 Q100,131 110,134 Q109,149 100,150 Q91,149 90,134Z" fill="#6e1e2e" ${L(skinLine, 1.2)}/><path d="M91,134.6 Q100,132.4 109,134.6 L108.6,137.4 Q100,136 91.4,137.4Z" fill="#fff"/><ellipse cx="100" cy="146" rx="5" ry="2.2" fill="#e8687a"/>`,
    calm: `<path d="M95,139 Q100,140.4 105,139" fill="none" ${L(skinLine, 1.3)}/>`,
  };
  const ty = typeCss;
  const accs = {
    band: `<path d="M56,84 Q100,68 144,84 L144,93 Q100,77 56,93Z" fill="${a.accC}" ${L(AV_INK, 1.3)}/><path d="M57,86 L34,76 L40,88 L28,96 L57,92Z" fill="${a.accC}" ${L(AV_INK, 1.3)}/><path d="M92,76 L108,76 L106,84 L94,84Z" fill="#e8ecf4" ${L(AV_INK, 1)}/>`,
    goggles: `<path d="M56,74 Q100,58 144,74" fill="none" stroke="${AV_INK}" stroke-width="5"/><g ${L(AV_INK, 1.4)}><ellipse cx="80" cy="66" rx="13" ry="10" fill="${a.accC}"/><ellipse cx="120" cy="66" rx="13" ry="10" fill="${a.accC}"/></g><ellipse cx="76" cy="62" rx="4.5" ry="3" fill="#fff" opacity="0.75"/><ellipse cx="116" cy="62" rx="4.5" ry="3" fill="#fff" opacity="0.75"/>`,
    flower: `<g transform="translate(140 74)" ${L(AV_INK, 1.1)}>${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="0" cy="-7" rx="5" ry="7" fill="${a.accC}" transform="rotate(${r})"/>`).join('')}<circle r="3.6" fill="#fff6b0"/></g>`,
    scar: `<path d="M120,124 L130,112 M122,114 L128,121" stroke="${a.accC}" stroke-width="2" stroke-linecap="round"/>`,
    scarf: `<path d="M82,150 Q100,160 118,150 L124,166 Q100,178 76,166Z" fill="${a.accC}" ${L(AV_INK, 1.3)}/><path d="M86,156 Q100,164 114,156" fill="none" stroke="${avShade(a.accC, 0.75)}" stroke-width="1.6"/><path d="M80,164 Q70,180 54,196 L66,198 Q78,186 90,170Z" fill="${avShade(a.accC, 0.85)}" ${L(AV_INK, 1.2)}/>`,
    star: `<g transform="translate(136 70)"><path d="M0,-9 L2.6,-2.8 9,-2.8 3.8,1.4 5.8,8 0,4.2 -5.8,8 -3.8,1.4 -9,-2.8 -2.6,-2.8Z" fill="${a.accC}" ${L(AV_INK, 1.1)}/></g><circle cx="58" cy="84" r="5" fill="${a.accC}" ${L(AV_INK, 1.1)}/><circle cx="142" cy="84" r="5" fill="${a.accC}" ${L(AV_INK, 1.1)}/>`,
    crown: `<path d="M74,62 L80,46 L90,56 L100,40 L110,56 L120,46 L126,62Q100,56 74,62Z" fill="${a.accC}" ${L(AV_INK, 1.2)}/><path d="M97,50 L100,45 L103,50 L100,55Z" fill="#fff"/>`,
    earring: `<path d="M60,118 L60,124" stroke="${a.accC}" stroke-width="2"/><path d="M60,124 L64,132 L60,140 L56,132Z" fill="${a.accC}" ${L(AV_INK, 1)}/>`,
    mask: `<path d="M58,104 Q80,96 100,104 Q120,96 142,104 L138,118 Q124,124 110,118 L100,122 L90,118 Q76,124 62,118Z" fill="${a.accC}" ${L(AV_INK, 1.4)}/><path d="M68,110 Q78,104 90,110 Q80,115 68,110Z M132,110 Q122,104 110,110 Q120,115 132,110Z" fill="${a.eye}"/><path d="M70,109 Q78,106 86,109" stroke="#fff" stroke-width="1.2" fill="none" opacity="0.8"/><path d="M130,109 Q122,106 114,109" stroke="#fff" stroke-width="1.2" fill="none" opacity="0.8"/><path d="M62,106 Q80,99 98,105" stroke="${avShade(a.accC, 1.6)}" stroke-width="1.2" fill="none"/>`,
    cap: `<path d="M58,82 Q58,48 100,46 Q142,48 142,82 Q100,70 58,82Z" fill="${a.accC}" ${L(AV_INK, 1.5)}/><path d="M56,82 Q100,68 146,82 Q162,86 160,92 Q130,80 100,82 Q72,84 56,90Z" fill="${avShade(a.accC, 0.75)}" ${L(AV_INK, 1.5)}/><circle cx="100" cy="64" r="7" fill="#fff" ${L(AV_INK, 1.2)}/><path d="M96,64 L104,64 M100,60 L100,68" stroke="${ty}" stroke-width="2"/>`,
  };
  const masked = a.acc === 'mask';
  const shirt = (c) => `<path d="M24,200 C30,176 54,164 80,160 L120,160 C146,164 170,176 176,200Z" fill="${c}" ${L(AV_INK)}/>`;
  const OUT = {
    jacket: shirt(`url(#${id}k)`) + `<path d="M120,160 C146,164 170,176 176,200 L150,200 C148,184 136,172 116,168Z" fill="${coatS}" opacity="0.7"/><path d="M80,160 L100,190 L120,160 L112,157 L100,176 L88,157Z" fill="#f4f6fb" ${L(AV_INK, 1.3)}/><path d="M80,160 L70,178 L84,176 L94,200 M120,160 L130,178 L116,176 L106,200" fill="none" ${L(AV_INK, 1.3)}/><path d="M40,186 Q52,174 66,170" fill="none" stroke="${coatL}" stroke-width="2.2" opacity="0.8"/>`,
    sailor: shirt('#f6f7fb') + `<path d="M62,166 L100,190 L138,166 L150,182 L100,200 L50,182Z" fill="${coat}" ${L(AV_INK, 1.3)}/><path d="M66,172 L100,193 L134,172" fill="none" stroke="#fff" stroke-width="2"/><path d="M92,186 L100,200 L108,186 L104,182 L96,182Z" fill="${a.accC}" ${L(AV_INK, 1.2)}/>`,
    tank: `<path d="M18,200 C22,170 50,158 82,156 L118,156 C150,158 178,170 182,200Z" fill="${a.skin}" ${L(skinLine, 1.5)}/><path d="M48,178 Q60,170 74,172 M126,172 Q140,170 152,178" fill="none" stroke="${skinS}" stroke-width="3"/><path d="M70,200 L76,166 L86,164 Q100,180 114,164 L124,166 L130,200Z" fill="${coat}" ${L(AV_INK, 1.4)}/>`,
    high: shirt(`url(#${id}k)`) + `<path d="M80,150 L86,168 L100,174 L114,168 L120,150 L128,160 L120,178 L100,184 L80,178 L72,160Z" fill="${coatS}" ${L(AV_INK, 1.3)}/><path d="M100,184 L100,200" stroke="${AV_INK}" stroke-width="1.3"/><circle cx="100" cy="190" r="2.6" fill="${a.accC}"/>`,
    cape: shirt(`url(#${id}k)`) + `<path d="M50,176 Q60,160 78,154 Q100,168 122,154 Q140,160 150,176 Q140,170 130,174 Q120,168 110,174 Q100,168 90,174 Q80,168 70,174 Q60,170 50,176Z" fill="#ffffff" ${L(AV_INK, 1.3)}/><path d="M96,176 L100,186 L104,176 L100,172Z" fill="${a.accC}" ${L(AV_INK, 1)}/>`,
    open: shirt('#24202c') + `<path d="M24,200 C30,176 54,164 80,160 L90,200Z M176,200 C170,176 146,164 120,160 L110,200Z" fill="url(#${id}k)" ${L(AV_INK, 1.4)}/><path d="M84,162 Q100,182 116,162" fill="none" stroke="${a.accC}" stroke-width="2"/><path d="M100,180 L104,186 L100,192 L96,186Z" fill="${a.accC}" ${L(AV_INK, 1)}/>`,
  };
  const outfit = OUT[a.fit] || OUT.jacket;
  const outfitTop = '';
  const burst = Array.from({ length: 20 }, (_, k) => { const g = (k / 20) * Math.PI * 2; return `M100,96 L${100 + Math.cos(g - 0.06) * 180},${96 + Math.sin(g - 0.06) * 180} L${100 + Math.cos(g + 0.06) * 180},${96 + Math.sin(g + 0.06) * 180}Z`; }).join(' ');
  const hex = '100,4 190,52 190,148 100,196 10,148 10,52';
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" aria-hidden="true">
  <defs>
    <radialGradient id="${id}b" cx="0.5" cy="0.42" r="0.7"><stop offset="0" stop-color="${avShade(a.bg, 1.55)}"/><stop offset="0.6" stop-color="${a.bg}"/><stop offset="1" stop-color="${avShade(a.bg, 0.45)}"/></radialGradient>
    <linearGradient id="${id}i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${avShade(a.eye, 0.35)}"/><stop offset="0.55" stop-color="${a.eye}"/><stop offset="1" stop-color="${avShade(a.eye, 1.5)}"/></linearGradient>
    <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${avShade(a.hairC, 1.12)}"/><stop offset="0.7" stop-color="${a.hairC}"/><stop offset="1" stop-color="${hairS}"/></linearGradient>
    <linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${coatL}"/><stop offset="1" stop-color="${coat}"/></linearGradient>
    <clipPath id="${id}c"><polygon points="${hex}"/></clipPath>
    <clipPath id="${id}f"><path d="${F}"/></clipPath>
  </defs>
  <g clip-path="url(#${id}c)">
    <rect width="200" height="200" fill="url(#${id}b)"/>
    <path d="${burst}" fill="#fff" opacity="0.07"/>
    <circle cx="100" cy="96" r="70" fill="#fff" opacity="0.06"/>
    <g transform="translate(100 104) scale(1.08) translate(-100 -112)">
    ${H.tail ? `<path d="${H.tail}" fill="url(#${id}h)" ${L(hairLine)}/>` : ''}
    ${H.back ? `<path d="${H.back}" fill="${hairS}" ${L(hairLine)}/>` : ''}
    ${outfit}
    <!-- neck -->
    <path d="M88,138 L88,164 Q100,170 112,164 L112,138Z" fill="${a.skin}" ${L(skinLine, 1.4)}/>
    <path d="M88,140 Q100,160 112,140 L112,138 L88,138Z" fill="${skinS}"/>
    <!-- ears -->
    <path d="M62,104 C52,100 52,122 64,124Z M138,104 C148,100 148,122 136,124Z" fill="${a.skin}" ${L(skinLine, 1.4)}/>
    <path d="M59,109 Q56,113 59,118 M141,109 Q144,113 141,118" fill="none" stroke="${skinS}" stroke-width="1.6"/>
    <!-- face -->
    <path d="${F}" fill="${a.skin}" ${L(skinLine, 1.5)}/>
    <g clip-path="url(#${id}f)">
      <path d="${H.front}" fill="${skinS}" transform="translate(2,7)"/>
      <path d="M128,96 Q140,120 128,142 Q138,124 136,104Z" fill="${skinS}" opacity="0.7"/>
    </g>
    <ellipse cx="74" cy="133" rx="9" ry="3.6" fill="#ff8f9a" opacity="${male ? 0.12 : 0.32}"/><ellipse cx="126" cy="133" rx="9" ry="3.6" fill="#ff8f9a" opacity="${male ? 0.12 : 0.32}"/>
    ${male ? '' : '<path d="M70,134 l3,-4 M74,134 l3,-4 M78,134 l3,-4 M122,134 l3,-4 M126,134 l3,-4 M130,134 l3,-4" stroke="#e8707e" stroke-width="0.9" opacity="0.55"/>'}
    ${masked ? '' : `<path d="${brow(79, -1)}" fill="none" ${L(avShade(a.hairC, 0.5), male ? 3.6 : 2.4)}/><path d="${brow(121, 1)}" fill="none" ${L(avShade(a.hairC, 0.5), male ? 3.6 : 2.4)}/>`}
    ${masked ? '' : eye(79, 115, -1) + eye(121, 115, 1)}
    <path d="M101,129 L99,134 L102,134" fill="none" ${L(skinLine, 1.1)} opacity="0.75"/>
    <g transform="translate(0,4)">${mouths[a.mouth] || mouths.smile}</g>
    <!-- front hair: bangs and side locks, shadow tone, angel-ring highlight -->
    ${a.hair === 'buzz' ? '' : `<path d="M58,100 Q56,58 100,54 Q144,58 142,100 Q134,74 100,70 Q66,74 58,100Z" fill="url(#${id}h)"/>`}
    <path d="${H.front}" fill="url(#${id}h)" ${L(hairLine)}/>
    <clipPath id="${id}hf"><path d="${H.front}"/></clipPath>
    <g clip-path="url(#${id}hf)" fill="none" stroke="${hairLine}" stroke-width="1" opacity="0.5">
      <path d="M78,58 Q72,76 70,96 M92,56 Q88,74 88,92 M108,56 Q112,74 112,92 M122,58 Q128,76 130,96 M64,70 Q58,84 58,102 M136,70 Q142,84 142,102"/>
    </g>
    <path d="${H.ring}" fill="none" stroke="${hairL}" stroke-width="4.5" stroke-linecap="round" opacity="0.9"/>
    <path d="${H.ring}" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity="0.55" transform="translate(0,-1)"/>
    ${accs[a.acc] || ''}
    ${outfitTop}
    </g>
  </g>
  <polygon points="${hex}" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="4"/>
  <polygon points="100,10 184,55 184,145 100,190 16,145 16,55" fill="none" stroke="${AV_INK}" stroke-width="2" opacity="0.5"/>
</svg>`;
}
const TYPE_HEX = { atk: '#ff4141', def: '#3d8bff', sta: '#2fd27a', bal: '#f6c632' };
function oppAvatar(o, size) { return avatarSVG(o.av, TYPE_HEX[o.type], size); }
function playerAvatar(size) {
  const P = (typeof Store !== 'undefined' && Store.profile) || null, t = (P && P.starter) || 'atk';
  return avatarSVG({ hair: 'spiky', hairC: '#2a2230', skin: '#f8d9c0', eye: TYPE_HEX[t], eyes: 'sharp', brow: 'firm', mouth: 'grin', acc: 'goggles', accC: '#ff8a2a', bg: '#3a4a7e' }, TYPE_HEX[t], size);
}
