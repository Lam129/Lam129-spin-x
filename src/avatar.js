/* ============================== AVATARS (original anime-style characters, procedural SVG) ==============================
   Cel-shaded bust: lock-based hair with shadow + highlight band, large layered eyes (lash line, gradient iris,
   pupil, double highlight), sharp chin, ink outlines. All characters are original. */
const AV_INK = '#1c1424';
function avShade(hex, k) { const c = new THREE.Color(hex); if (k > 1) c.lerp(new THREE.Color(1, 1, 1), k - 1); else c.multiplyScalar(k); return '#' + c.getHexString(); }
function avLock(x0, y0, x1, y1, tx, ty, bend = 0) {
  // a pointed hair lock from a base segment (x0,y0)-(x1,y1) to tip (tx,ty)
  const mx = (x0 + tx) / 2 + bend, my = (y0 + ty) / 2, nx = (x1 + tx) / 2 + bend, ny = (y1 + ty) / 2;
  return `M${x0},${y0} Q${mx},${my} ${tx},${ty} Q${nx},${ny} ${x1},${y1}Z`;
}
const AV_HAIR = {
  // each: back (behind head), front (bangs/crown), tail (optional extra behind)
  spiky: {
    back: 'M30,52 L18,30 L34,34 L30,12 L46,24 L52,4 L62,22 L74,6 L78,26 L94,14 L88,34 L102,34 L90,54 Q86,30 60,26 Q34,30 30,52Z',
    front: [[31, 34, 55, 30, 30, 62, -4], [41, 30, 65, 28, 46, 60, -2], [53, 28, 75, 30, 62, 58, 2], [63, 30, 87, 34, 80, 62, 4], [73, 34, 91, 44, 88, 60, 2]],
  },
  short: {
    back: 'M32,58 Q28,24 60,20 Q92,24 88,58 Q84,40 60,36 Q36,40 32,58Z',
    front: [[31, 40, 53, 30, 36, 60, -2], [41, 32, 65, 28, 50, 58, 0], [55, 28, 77, 32, 66, 58, 2], [67, 32, 89, 42, 84, 60, 2]],
  },
  long: {
    back: 'M28,56 Q22,22 60,18 Q98,22 92,56 L98,116 L80,110 L76,70 L44,70 L40,110 L22,116Z',
    front: [[29, 42, 51, 30, 34, 72, -3], [39, 32, 63, 26, 48, 60, -1], [53, 26, 77, 30, 64, 60, 2], [67, 30, 91, 42, 86, 72, 3]],
  },
  bob: {
    back: 'M28,58 Q24,20 60,18 Q96,20 92,58 L94,86 L78,84 L78,62 L42,62 L42,84 L26,86Z',
    front: [[27, 44, 53, 28, 34, 66, -2], [41, 28, 65, 24, 52, 58, 0], [55, 24, 79, 28, 68, 58, 2], [67, 28, 93, 44, 86, 66, 2]],
  },
  pony: {
    back: 'M32,56 Q28,22 60,18 Q92,22 88,56 Q84,36 60,34 Q36,36 32,56Z',
    tail: 'M84,32 Q112,30 110,70 Q108,96 96,108 Q100,80 92,60 Q88,46 80,40Z',
    front: [[31, 40, 55, 28, 36, 62, -2], [43, 30, 67, 26, 54, 58, 0], [57, 26, 81, 32, 70, 54, 2], [71, 32, 91, 44, 86, 58, 2]],
  },
  twin: {
    back: 'M32,56 Q28,22 60,18 Q92,22 88,56 Q84,36 60,34 Q36,36 32,56Z',
    tail: 'M30,40 Q6,44 8,80 Q10,102 22,112 Q20,86 26,70 Q30,56 36,48Z M90,40 Q114,44 112,80 Q110,102 98,112 Q100,86 94,70 Q90,56 84,48Z',
    front: [[31, 40, 53, 28, 38, 62, -2], [41, 28, 63, 24, 50, 58, 0], [53, 24, 77, 28, 64, 58, 1], [65, 28, 89, 40, 82, 62, 2]],
  },
  mane: {
    back: 'M26,62 L10,44 L26,40 L14,20 L36,26 L36,6 L52,20 L60,2 L68,20 L84,6 L84,26 L106,20 L94,40 L110,44 L94,62 L100,84 L82,76 L38,76 L20,84Z',
    front: [[29, 36, 53, 28, 30, 64, -5], [39, 30, 63, 26, 44, 62, -3], [51, 26, 73, 28, 60, 60, 1], [61, 28, 85, 32, 78, 62, 4], [73, 32, 93, 42, 92, 64, 4]],
  },
  slick: {
    back: 'M32,56 Q28,20 62,18 Q94,22 90,52 Q80,30 58,32 Q40,34 32,56Z',
    front: [[33, 44, 73, 22, 34, 56, -6], [53, 24, 93, 34, 40, 40, -8]],
  },
  buzz: {
    back: 'M34,52 Q32,24 60,22 Q88,24 86,52 Q80,36 60,34 Q40,36 34,52Z',
    front: [[35, 40, 63, 30, 44, 46, 0], [55, 30, 85, 40, 76, 46, 0]],
  },
};
function avatarSVG(av, typeCss = '#888', size = 64) {
  const a = Object.assign({ hair: 'short', hairC: '#3a2a1e', skin: '#f6d2b4', eye: '#36a0ff', eyes: 'sharp', brow: 'firm', mouth: 'grin', acc: 'none', accC: '#fff', bg: '#334' }, av || {});
  const id = 'v' + Math.random().toString(36).slice(2, 8);
  const H = AV_HAIR[a.hair] || AV_HAIR.short;
  const hairD = avShade(a.hairC, 0.62), hairL = avShade(a.hairC, 1.45), skinD = avShade(a.skin, 0.84), skinDD = avShade(a.skin, 0.72);
  const coat = typeCss, coatD = avShade(typeCss, 0.6), coatL = avShade(typeCss, 1.3);
  const ink = `stroke="${AV_INK}" stroke-width="1.6" stroke-linejoin="round"`;
  // ---- eyes
  const eyeShapes = {
    sharp: { w: 10.5, top: -7.5, bot: 5.5, tilt: -2.5 },
    round: { w: 10, top: -9, bot: 7, tilt: 0 },
    narrow: { w: 10.5, top: -5, bot: 4, tilt: -3.5 },
  };
  const E = eyeShapes[a.eyes] || eyeShapes.sharp;
  const eye = (cx, cy, s) => {
    const w = E.w, t = E.top, b = E.bot, tl = E.tilt * s;
    const outer = cx + w * s, inner = cx - w * s * 0.85;
    const white = `M${inner},${cy + 1} Q${cx},${cy + t - 1} ${outer},${cy + tl} Q${cx + s * 2},${cy + b + 1} ${inner},${cy + 1}Z`;
    const irisR = a.eyes === 'narrow' ? 5 : 6.2;
    return `
      <path d="${white}" fill="#fff" ${ink} stroke-width="1"/>
      <g clip-path="url(#${id}e${s > 0 ? 'r' : 'l'})">
        <ellipse cx="${cx + s * 0.6}" cy="${cy}" rx="${irisR}" ry="${irisR * 1.25}" fill="url(#${id}i)"/>
        <ellipse cx="${cx + s * 0.6}" cy="${cy + 0.5}" rx="${irisR * 0.45}" ry="${irisR * 0.62}" fill="${AV_INK}"/>
        <path d="${white}" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="3" transform="translate(0,-1.5)"/>
        <ellipse cx="${cx + s * 0.6 - 1.8}" cy="${cy - 2.4}" rx="1.9" ry="1.5" fill="#fff"/>
        <circle cx="${cx + s * 0.6 + 2}" cy="${cy + 2.6}" r="0.9" fill="#fff" opacity="0.9"/>
      </g>
      <clipPath id="${id}e${s > 0 ? 'r' : 'l'}"><path d="${white}"/></clipPath>
      <path d="M${inner - s * 1},${cy + 0.5} Q${cx},${cy + t - 2.6} ${outer + s * 1.5},${cy + tl - 0.8} L${outer + s * 3},${cy + tl - 2.6}" fill="none" stroke="${AV_INK}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M${cx - s * 3},${cy + b + 1.4} L${outer - s * 1},${cy + b - 0.4}" stroke="${AV_INK}" stroke-width="0.9" stroke-linecap="round"/>`;
  };
  const brows = {
    firm: (s, cx) => `M${cx - s * 7},${56} L${cx + s * 6},${53.5}`,
    angry: (s, cx) => `M${cx - s * 7},${54} L${cx + s * 6},${57.5}`,
    soft: (s, cx) => `M${cx - s * 7},${55} Q${cx},${51.5} ${cx + s * 6},${54.5}`,
    cocky: (s, cx) => s < 0 ? `M${cx + 7},${55} L${cx - 6},${52}` : `M${cx - 7},${55.5} Q${cx},${53} ${cx + 6},${55}`,
  };
  const browFn = brows[a.brow] || brows.firm;
  const mouths = {
    grin: `<path d="M52,84 Q60,90 68,83 Q60,86 52,84Z" fill="#fff" stroke="${AV_INK}" stroke-width="1.2"/><path d="M52,84 Q60,87 68,83" fill="none" stroke="${AV_INK}" stroke-width="1"/>`,
    smile: `<path d="M54,84 Q60,88 66,84" fill="none" stroke="${AV_INK}" stroke-width="1.5" stroke-linecap="round"/>`,
    smirk: `<path d="M54,85 Q61,86 67,82" fill="none" stroke="${AV_INK}" stroke-width="1.5" stroke-linecap="round"/>`,
    shout: `<path d="M53,82 Q60,80 67,82 Q66,92 60,93 Q54,92 53,82Z" fill="#7a1e2a" stroke="${AV_INK}" stroke-width="1.2"/><path d="M54,82.5 Q60,81 66,82.5 L65.5,84.5 Q60,83.5 54.5,84.5Z" fill="#fff"/><ellipse cx="60" cy="90" rx="3.5" ry="1.6" fill="#e0606a"/>`,
    calm: `<path d="M56,85 L64,85" stroke="${AV_INK}" stroke-width="1.4" stroke-linecap="round"/>`,
  };
  const accs = {
    band: `<path d="M30,44 Q60,32 90,44 L90,50 Q60,38 30,50Z" fill="${a.accC}" ${ink}/><path d="M89,46 L108,38 L104,46 L110,52 L90,50Z" fill="${a.accC}" ${ink}/><path d="M54,40 L66,40 L64,46 L56,46Z" fill="#d8dde6" ${ink} stroke-width="1"/>`,
    goggles: `<path d="M30,38 Q60,26 90,38" fill="none" stroke="${AV_INK}" stroke-width="4"/><g ${ink}><ellipse cx="46" cy="33" rx="9" ry="6.5" fill="${a.accC}"/><ellipse cx="74" cy="33" rx="9" ry="6.5" fill="${a.accC}"/></g><ellipse cx="43" cy="31" rx="3" ry="2" fill="#fff" opacity="0.8"/><ellipse cx="71" cy="31" rx="3" ry="2" fill="#fff" opacity="0.8"/>`,
    flower: `<g transform="translate(84 36)" ${ink} stroke-width="1"><circle cx="0" cy="-5" r="4" fill="${a.accC}"/><circle cx="5" cy="-1" r="4" fill="${a.accC}"/><circle cx="3" cy="5" r="4" fill="${a.accC}"/><circle cx="-3" cy="5" r="4" fill="${a.accC}"/><circle cx="-5" cy="-1" r="4" fill="${a.accC}"/><circle r="2.4" fill="#fff6c0"/></g>`,
    scar: `<path d="M68,70 L78,80 M70,77 L75,72" stroke="${a.accC}" stroke-width="1.8" stroke-linecap="round"/>`,
    scarf: `<path d="M34,100 Q60,110 86,100 L90,112 Q60,124 30,112Z" fill="${a.accC}" ${ink}/><path d="M74,108 L92,122 L80,124Z" fill="${a.accC}" ${ink}/>`,
    star: `<path d="M86,30 l2.6,5.4 5.9.7 -4.4 4 1.2 5.8 -5.3-3 -5.3 3 1.2-5.8 -4.4-4 5.9-.7z" fill="${a.accC}" ${ink} stroke-width="1"/>`,
    crown: `<path d="M40,26 L44,10 L52,20 L60,6 L68,20 L76,10 L80,26Z" fill="${a.accC}" ${ink}/><circle cx="60" cy="18" r="2.5" fill="#fff"/>`,
    earring: `<path d="M36,74 l0,6" stroke="${a.accC}" stroke-width="2"/><circle cx="36" cy="82" r="2.6" fill="${a.accC}" ${ink} stroke-width="0.8"/><path d="M84,74 l0,6" stroke="${a.accC}" stroke-width="2"/><circle cx="84" cy="82" r="2.6" fill="${a.accC}" ${ink} stroke-width="0.8"/>`,
    mask: `<path d="M34,58 Q60,50 86,58 L84,72 Q72,66 60,68 Q48,66 36,72Z" fill="${a.accC}" ${ink}/><path d="M42,62 L54,63 M66,63 L78,62" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
    glasses: `<g fill="rgba(200,230,255,0.25)" stroke="${a.accC}" stroke-width="1.6"><rect x="39" y="60" width="18" height="12" rx="3"/><rect x="63" y="60" width="18" height="12" rx="3"/></g><path d="M57,65 L63,65" stroke="${a.accC}" stroke-width="1.6"/>`,
    cap: `<path d="M30,44 Q32,14 62,14 Q90,16 90,40 Z" fill="${a.accC}" ${ink}/><path d="M28,44 Q60,36 92,44 L106,50 Q60,44 26,50Z" fill="${avShade(a.accC, 0.7)}" ${ink}/><circle cx="60" cy="26" r="5" fill="#fff" ${ink} stroke-width="1"/>`,
  };
  const masked = a.acc === 'mask';
  const front = H.front.map(([x0, y0, x1, y1, tx, ty, bend]) => avLock(x0, y0, x1, y1, tx, ty, bend)).join(' ');
  const frontShadow = H.front.map(([x0, y0, x1, y1, tx, ty, bend]) => avLock(x0 + 2, y0 + 2, x1 - 1, y1 + 2, tx + 1, ty - 4, bend)).join(' ');
  const burst = Array.from({ length: 16 }, (_, k) => { const ang = (k / 16) * TAU; return `M60,60 L${60 + Math.cos(ang - 0.08) * 100},${60 + Math.sin(ang - 0.08) * 100} L${60 + Math.cos(ang + 0.08) * 100},${60 + Math.sin(ang + 0.08) * 100}Z`; }).join(' ');
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true">
  <defs>
    <radialGradient id="${id}b" cx="0.5" cy="0.45" r="0.7"><stop offset="0" stop-color="${avShade(a.bg, 1.4)}"/><stop offset="0.6" stop-color="${a.bg}"/><stop offset="1" stop-color="${avShade(a.bg, 0.35)}"/></radialGradient>
    <linearGradient id="${id}i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${avShade(a.eye, 0.35)}"/><stop offset="0.55" stop-color="${a.eye}"/><stop offset="1" stop-color="${avShade(a.eye, 1.55)}"/></linearGradient>
    <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${avShade(a.hairC, 1.15)}"/><stop offset="1" stop-color="${a.hairC}"/></linearGradient>
    <clipPath id="${id}c"><polygon points="60,2 114,31 114,89 60,118 6,89 6,31"/></clipPath>
    <clipPath id="${id}f"><path d="M37,48 Q36,74 46,86 Q53,95 60,97 Q67,95 74,86 Q84,74 83,48 Q82,30 60,30 Q38,30 37,48Z"/></clipPath>
  </defs>
  <g clip-path="url(#${id}c)">
    <rect width="120" height="120" fill="url(#${id}b)"/>
    <path d="${burst}" fill="#fff" opacity="0.07"/>
    ${H.tail ? `<path d="${H.tail}" fill="url(#${id}h)" ${ink}/>` : ''}
    <path d="${H.back}" fill="${hairD}" ${ink}/>
    <!-- body -->
    <path d="M10,120 Q14,104 34,100 L48,96 L60,108 L72,96 L86,100 Q106,104 110,120Z" fill="${coat}" ${ink}/>
    <path d="M48,96 L60,108 L72,96 L68,94 L60,102 L52,94Z" fill="#f4f6fa" ${ink} stroke-width="1"/>
    <path d="M34,100 L44,120 M86,100 L76,120" stroke="${coatD}" stroke-width="2.4"/>
    <path d="M14,112 Q30,104 40,102" stroke="${coatL}" stroke-width="2" fill="none" opacity="0.7"/>
    <!-- neck -->
    <path d="M52,84 L52,98 L60,104 L68,98 L68,84Z" fill="${skinD}" ${ink}/>
    <path d="M52,90 Q60,96 68,90 L68,86 L52,86Z" fill="${skinDD}" opacity="0.7"/>
    <!-- ears -->
    <path d="M38,60 Q30,58 32,68 Q34,76 40,74Z" fill="${a.skin}" ${ink}/><path d="M82,60 Q90,58 88,68 Q86,76 80,74Z" fill="${a.skin}" ${ink}/>
    <!-- face -->
    <path d="M37,48 Q36,74 46,86 Q53,95 60,97 Q67,95 74,86 Q84,74 83,48 Q82,30 60,30 Q38,30 37,48Z" fill="${a.skin}" ${ink}/>
    <g clip-path="url(#${id}f)"><path d="${frontShadow}" fill="${skinD}" opacity="0.55"/><path d="M76,58 Q82,74 70,90 L86,96 L90,50Z" fill="${skinD}" opacity="0.6"/></g>
    <ellipse cx="45" cy="77" rx="4.5" ry="2" fill="#ff8a8a" opacity="0.35"/><ellipse cx="75" cy="77" rx="4.5" ry="2" fill="#ff8a8a" opacity="0.35"/>
    ${masked ? '' : `<path d="${browFn(-1, 48)}" stroke="${hairD}" stroke-width="2.6" stroke-linecap="round"/><path d="${browFn(1, 72)}" stroke="${hairD}" stroke-width="2.6" stroke-linecap="round"/>`}
    ${masked ? '' : eye(48, 66, -1) + eye(72, 66, 1)}
    <path d="M60,74 L61.5,78.5 L59,79" fill="none" stroke="${skinDD}" stroke-width="1.1" stroke-linecap="round"/>
    ${mouths[a.mouth] || mouths.grin}
    <!-- front hair -->
    ${a.hair === 'slick' || a.hair === 'buzz' ? '' : `<path d="M35,52 Q33,26 60,23 Q87,26 85,52 Q78,42 60,41 Q42,42 35,52Z" fill="url(#${id}h)" ${ink}/>`}
    <path d="${front}" fill="url(#${id}h)" ${ink}/>
    <path d="M40,40 Q50,34 58,38 L62,34 Q70,36 80,40" fill="none" stroke="${hairL}" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/>
    ${accs[a.acc] || ''}
  </g>
  <polygon points="60,2 114,31 114,89 60,118 6,89 6,31" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2.5"/>
  <polygon points="60,6 110,33 110,87 60,114 10,87 10,33" fill="none" stroke="${AV_INK}" stroke-width="1.5" opacity="0.6"/>
</svg>`;
}
const TYPE_HEX = { atk: '#ff4141', def: '#3d8bff', sta: '#2fd27a', bal: '#f6c632' };
function oppAvatar(o, size) { return avatarSVG(o.av, TYPE_HEX[o.type], size); }
function playerAvatar(size) {
  const P = Store.profile, t = (P && P.starter) || 'atk';
  return avatarSVG({ hair: 'spiky', hairC: '#2a2230', skin: '#f6d2b4', eye: TYPE_HEX[t], eyes: 'sharp', brow: 'firm', mouth: 'grin', acc: 'goggles', accC: '#ff8a2a', bg: '#24304e' }, TYPE_HEX[t], size);
}
