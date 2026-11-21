/* ============================== AVATARS v3 (original anime-style characters, procedural SVG) ==============================
   3/4-view half-body portraits: turned face (near cheek wide, far side narrow, eyes sized by depth), hard-edged
   two-tone cel shading, contour lines thicker than inner lines, lock-based hair with highlight, and a signature
   hand gesture per character. All characters are original. */
const AV_INK = '#1a1222';
function avShade(hex, k) { const c = new THREE.Color(hex); if (k > 1) c.lerp(new THREE.Color(1, 1, 1), k - 1); else c.multiplyScalar(k); return '#' + c.getHexString(); }
function avLock(x0, y0, x1, y1, tx, ty, bend = 0) {
  const mx = (x0 + tx) / 2 + bend, my = (y0 + ty) / 2, nx = (x1 + tx) / 2 + bend, ny = (y1 + ty) / 2;
  return `M${x0},${y0} Q${mx},${my} ${tx},${ty} Q${nx},${ny} ${x1},${y1}Z`;
}
/* hair: back mass, crown cap, bangs locks [x0,y0,x1,y1,tipX,tipY,bend]; tail optional. Coordinates for a head turned to viewer's right. */
const AV_HAIR = {
  spiky: { back: 'M30,54 L14,34 L32,36 L24,14 L44,26 L48,4 L60,22 L72,4 L78,24 L96,12 L90,32 L106,30 L92,54 Q88,30 60,26 Q34,30 30,54Z',
    front: [[30, 36, 50, 30, 30, 60, -4], [40, 30, 60, 28, 44, 62, -2], [52, 28, 72, 30, 62, 60, 3], [62, 30, 84, 34, 80, 58, 5], [74, 34, 90, 46, 92, 56, 4]] },
  long: { back: 'M28,56 Q20,20 60,17 Q100,20 94,58 L100,120 L80,120 L76,70 L42,70 L36,120 L18,120Z',
    front: [[30, 42, 48, 30, 32, 74, -3], [40, 32, 60, 26, 48, 62, -1], [54, 26, 74, 30, 66, 60, 3], [68, 30, 88, 42, 88, 70, 4]] },
  buzz: { back: 'M32,54 Q30,22 60,20 Q90,22 88,54 Q82,36 60,34 Q38,36 32,54Z', front: [[36, 42, 62, 30, 42, 48, 0], [56, 30, 84, 40, 80, 46, 0]] },
  pony: { back: 'M32,58 Q28,20 60,17 Q92,20 88,56 Q84,36 60,34 Q36,36 32,58Z', tail: 'M84,30 Q118,26 114,72 Q112,100 98,118 Q102,84 92,62 Q88,46 78,38Z',
    front: [[32, 40, 52, 28, 34, 64, -2], [44, 30, 64, 26, 54, 60, 1], [58, 26, 78, 32, 72, 56, 3], [72, 32, 90, 44, 90, 58, 3]] },
  twin: { back: 'M32,58 Q28,20 60,17 Q92,20 88,56 Q84,36 60,34 Q36,36 32,58Z',
    tail: 'M30,40 Q2,44 4,84 Q6,108 20,120 Q18,90 24,72 Q28,56 36,48Z M90,40 Q118,44 116,84 Q114,108 100,120 Q102,90 96,72 Q92,56 84,48Z',
    front: [[32, 40, 50, 28, 36, 64, -2], [42, 28, 62, 24, 50, 60, 1], [56, 24, 76, 28, 68, 60, 3], [68, 28, 88, 40, 86, 62, 3]] },
  bob: { back: 'M26,60 Q22,18 60,16 Q98,18 94,60 L96,90 L78,88 L78,64 L42,64 L42,88 L24,90Z',
    front: [[28, 44, 50, 28, 32, 68, -2], [42, 28, 64, 24, 52, 60, 1], [56, 24, 78, 28, 70, 60, 3], [70, 28, 92, 44, 90, 68, 3]] },
  mane: { back: 'M24,64 L6,44 L24,40 L12,18 L36,26 L34,4 L52,20 L60,0 L70,20 L88,4 L86,26 L110,18 L96,40 L114,44 L96,64 L104,88 L84,78 L36,78 L16,88Z',
    front: [[30, 36, 50, 28, 28, 66, -5], [40, 30, 60, 26, 42, 64, -3], [52, 26, 72, 28, 62, 62, 2], [64, 28, 84, 32, 82, 62, 5], [76, 32, 92, 42, 96, 62, 5]] },
  slick: { back: 'M32,56 Q28,18 64,16 Q98,20 92,52 Q80,28 58,30 Q40,32 32,56Z', front: [[36, 44, 72, 20, 34, 56, -6], [56, 22, 94, 34, 42, 38, -8]] },
};
/* hand gestures drawn in the lower foreground (skin, ink, shade passed in) */
function avHand(pose, skin, skinD, ink, accC, typeCss) {
  const fist = (x, y, s = 1, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">
      <path d="M-12,-10 Q-14,-16 -8,-17 L8,-17 Q14,-16 13,-9 L13,8 Q12,15 4,15 L-8,15 Q-14,14 -13,6Z" fill="${skin}" ${ink}/>
      <path d="M5,-17 L5,15 M-9,15 L12,15" fill="none"/>
      <path d="M-6,-17 Q-7,-11 -6,-6 M0,-17 Q-1,-11 0,-6 M6,-17 Q5,-11 6,-6" stroke="${AV_INK}" stroke-width="1" fill="none"/>
      <path d="M-13,0 Q-18,-4 -14,-10 Q-6,-8 -4,-2 Q-6,3 -13,2Z" fill="${skin}" ${ink} stroke-width="1.2"/>
      <path d="M13,-6 Q10,6 4,15 L12,13 Q14,4 13,-6Z" fill="${skinD}"/></g>`;
  const sleeve = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-16,0 L16,0 L20,40 L-20,40Z" fill="${typeCss}" ${ink}/><path d="M-16,0 L16,0 L16,6 L-16,6Z" fill="${avShade(typeCss, 0.65)}" ${ink} stroke-width="1"/></g>`;
  switch (pose) {
    case 'fist': // fist pump by the shoulder
      return sleeve(96, 102, -18) + fist(92, 92, 1.05, -10);
    case 'point': // index finger pointed at the viewer
      return sleeve(100, 108, -30) + `<g transform="translate(100 98) rotate(-48)">
        <path d="M-12,-6 Q-13,-14 -6,-14 L6,-14 Q12,-12 12,-4 L12,10 Q10,16 2,16 L-8,16 Q-13,14 -13,6Z" fill="${skin}" ${ink}/>
        <path d="M-4,-14 L-4,-34 Q-4,-40 2,-40 Q8,-40 8,-34 L8,-14Z" fill="${skin}" ${ink}/>
        <path d="M-4,-30 Q2,-28 8,-30" stroke="${AV_INK}" stroke-width="0.9" fill="none"/>
        <path d="M-13,2 Q-18,-2 -14,-8 Q-6,-6 -4,0Z" fill="${skin}" ${ink} stroke-width="1.2"/>
        <path d="M12,-4 Q10,8 2,16 L10,14Z" fill="${skinD}"/></g>`;
    case 'wave': // open palm
      return sleeve(98, 106, -12) + `<g transform="translate(94 88) rotate(-14)">
        <path d="M-12,-2 Q-12,-10 -6,-10 L8,-10 Q13,-8 13,0 L12,14 Q10,18 0,18 Q-10,18 -12,10Z" fill="${skin}" ${ink}/>
        ${[-9, -3, 3, 9].map((fx, k) => `<path d="M${fx - 2.6},-8 L${fx - 2.6},${-24 - (k === 1 || k === 2 ? 4 : 0)} Q${fx},${-28 - (k === 1 || k === 2 ? 4 : 0)} ${fx + 2.6},${-24 - (k === 1 || k === 2 ? 4 : 0)} L${fx + 2.6},-8Z" fill="${skin}" ${ink} stroke-width="1.2"/>`).join('')}
        <path d="M-12,4 Q-22,0 -20,-8 Q-14,-6 -10,0Z" fill="${skin}" ${ink} stroke-width="1.2"/>
        <path d="M13,0 L12,14 Q10,18 4,18 L10,12Z" fill="${skinD}"/></g>`;
    case 'punch': // fist thrust at the camera, foreshortened
      return `<path d="M70,120 L86,98 L110,104 L106,120Z" fill="${typeCss}" ${ink}/>` + fist(98, 102, 1.3, 6) +
        `<path d="M82,90 L76,84 M112,90 L118,84 M100,82 L100,74" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
    case 'bey': // holding a spinning top up
      return sleeve(96, 104, -14) + `<g transform="translate(92 74)">
        <ellipse cx="0" cy="0" rx="17" ry="6" fill="#d8dde8" ${ink}/><ellipse cx="0" cy="-2" rx="9" ry="3.5" fill="${accC}" ${ink} stroke-width="1"/>
        <path d="M-6,4 L0,14 L6,4" fill="#b8c0d0" ${ink} stroke-width="1"/>
        <path d="M-22,-4 Q-26,0 -22,4 M22,-4 Q26,0 22,4" stroke="#fff" stroke-width="1.6" fill="none" opacity="0.8"/></g>` + fist(92, 98, 0.9, 0);
    case 'chest': // hand on chest, calm
      return `<g transform="translate(60 108) rotate(8)">
        <path d="M-14,-4 Q-14,-12 -6,-12 L10,-12 Q16,-10 15,-2 L14,8 Q12,12 2,12 L-10,12 Q-15,10 -14,4Z" fill="${skin}" ${ink}/>
        <path d="M-8,-12 L-8,-2 M-2,-12 L-2,-1 M4,-12 L4,-1" stroke="${AV_INK}" stroke-width="0.9"/></g>`;
    case 'temple': // two fingers at the temple
      return sleeve(26, 104, 20) + `<g transform="translate(30 76) rotate(18)">
        <path d="M-10,-2 Q-10,-10 -4,-10 L8,-10 Q12,-8 12,0 L11,12 Q9,16 0,16 Q-9,16 -10,8Z" fill="${skin}" ${ink}/>
        <path d="M-4,-10 L-4,-26 Q-1,-30 2,-26 L2,-10Z M3,-10 L3,-27 Q6,-31 9,-27 L9,-10Z" fill="${skin}" ${ink} stroke-width="1.2"/></g>`;
    default: return '';
  }
}
function avatarSVG(av, typeCss = '#888', size = 64) {
  const a = Object.assign({ hair: 'spiky', hairC: '#3a2a1e', skin: '#f6d2b4', eye: '#36a0ff', eyes: 'sharp', brow: 'firm', mouth: 'grin', acc: 'none', accC: '#fff', bg: '#334', pose: 'fist' }, av || {});
  const id = 'v' + Math.random().toString(36).slice(2, 8);
  const H = AV_HAIR[a.hair] || AV_HAIR.spiky;
  const hairD = avShade(a.hairC, 0.6), hairL = avShade(a.hairC, 1.5), skinD = avShade(a.skin, 0.82), skinDD = avShade(a.skin, 0.7);
  const coat = typeCss, coatD = avShade(typeCss, 0.58), coatL = avShade(typeCss, 1.35);
  const ink = `stroke="${AV_INK}" stroke-width="2.2" stroke-linejoin="round"`;
  const inkT = `stroke="${AV_INK}" stroke-width="1.2" stroke-linejoin="round"`;
  // 3/4 face: near (left) cheek wide, far (right) contour with a cheekbone, chin right of centre
  const face = 'M36,46 Q35,64 40,74 Q46,86 58,94 Q62,96 66,93 Q76,86 80,76 Q84,68 82,62 Q84,54 81,44 Q76,30 58,30 Q40,30 36,46Z';
  const farShade = 'M70,40 Q80,46 82,56 Q84,64 81,70 Q78,82 68,90 Q74,78 76,68 Q78,56 70,40Z';
  const E = { sharp: { top: -7.5, bot: 5.5, tilt: -2.5 }, round: { top: -9, bot: 7, tilt: 0 }, narrow: { top: -5, bot: 4, tilt: -3.5 } }[a.eyes] || { top: -7.5, bot: 5.5, tilt: -2.5 };
  const eye = (cx, cy, w, s, depth) => {
    const t = E.top * depth, b = E.bot * depth, tl = E.tilt * s;
    const outer = cx + w * s, inner = cx - w * s * 0.8;
    const white = `M${inner},${cy + 1} Q${cx},${cy + t - 1} ${outer},${cy + tl} Q${cx + s * 2},${cy + b + 1} ${inner},${cy + 1}Z`;
    const ir = (a.eyes === 'narrow' ? 4.8 : 6) * depth, ix = cx + s * 1.2;
    const cid = `${id}e${s > 0 ? 'r' : 'l'}`;
    return `<clipPath id="${cid}"><path d="${white}"/></clipPath>
      <path d="${white}" fill="#fff"/>
      <g clip-path="url(#${cid})">
        <ellipse cx="${ix}" cy="${cy}" rx="${ir * 0.92}" ry="${ir * 1.25}" fill="url(#${id}i)" stroke="${avShade(a.eye, 0.4)}" stroke-width="0.8"/>
        <ellipse cx="${ix}" cy="${cy + 0.6}" rx="${ir * 0.42}" ry="${ir * 0.62}" fill="${AV_INK}"/>
        <path d="${white}" fill="none" stroke="rgba(40,20,60,0.3)" stroke-width="3.4" transform="translate(0,-1.8)"/>
        <ellipse cx="${ix - 1.8 * depth}" cy="${cy - 2.6}" rx="${2 * depth}" ry="${1.6 * depth}" fill="#fff"/>
        <circle cx="${ix + 2}" cy="${cy + 3}" r="${0.9 * depth}" fill="#fff" opacity="0.9"/>
      </g>
      <path d="M${inner - s},${cy + 0.8} Q${cx},${cy + t - 2.8} ${outer + s * 1.6},${cy + tl - 0.6} L${outer + s * 3.4},${cy + tl - 2.8}" fill="none" stroke="${AV_INK}" stroke-width="${2.8 * depth}" stroke-linecap="round"/>
      <path d="M${cx - s * 2},${cy + b + 1.6} L${outer - s},${cy + b - 0.2}" stroke="${AV_INK}" stroke-width="0.9" stroke-linecap="round"/>`;
  };
  const brow = (cx, w, s, kind) => ({
    firm: `M${cx - s * w},55 L${cx + s * w * 0.8},52.5`, angry: `M${cx - s * w},53 L${cx + s * w * 0.8},57`,
    soft: `M${cx - s * w},54.5 Q${cx},51 ${cx + s * w * 0.8},54`, cocky: s < 0 ? `M${cx + w * 0.8},54.5 L${cx - w},51.5` : `M${cx - w},55 Q${cx},52.5 ${cx + w * 0.8},54.5`,
  }[kind] || `M${cx - s * w},55 L${cx + s * w * 0.8},52.5`);
  const mouths = {
    grin: `<path d="M56,82 Q64,89 72,81 Q64,85 56,82Z" fill="#fff" ${inkT}/><path d="M56,82 Q64,86 72,81" fill="none" ${inkT}/>`,
    smile: `<path d="M58,83 Q64,87 70,82" fill="none" stroke="${AV_INK}" stroke-width="1.6" stroke-linecap="round"/>`,
    smirk: `<path d="M58,84 Q66,85 71,80" fill="none" stroke="${AV_INK}" stroke-width="1.6" stroke-linecap="round"/>`,
    shout: `<path d="M56,80 Q64,78 72,80 Q71,92 64,93 Q57,92 56,80Z" fill="#6a1626" ${inkT}/><path d="M57,80.5 Q64,79 71,80.5 L70.5,83 Q64,82 57.5,83Z" fill="#fff"/><ellipse cx="64" cy="90" rx="4" ry="1.7" fill="#e0606a"/>`,
    calm: `<path d="M60,84 L68,84" stroke="${AV_INK}" stroke-width="1.5" stroke-linecap="round"/>`,
  };
  const accs = {
    band: `<path d="M30,44 Q60,32 92,44 L92,50 Q60,38 30,50Z" fill="${a.accC}" ${inkT}/><path d="M28,46 L10,40 L14,48 L8,54 L30,50Z" fill="${a.accC}" ${inkT}/><path d="M56,39 L68,39 L66,45 L58,45Z" fill="#d8dde6" ${inkT}/>`,
    goggles: `<path d="M30,38 Q60,26 92,38" fill="none" stroke="${AV_INK}" stroke-width="4"/><g ${inkT}><ellipse cx="46" cy="33" rx="9.5" ry="7" fill="${a.accC}"/><ellipse cx="74" cy="32" rx="8" ry="6.5" fill="${a.accC}"/></g><ellipse cx="43" cy="30.5" rx="3.4" ry="2" fill="#fff" opacity="0.85"/><ellipse cx="72" cy="30" rx="2.6" ry="1.8" fill="#fff" opacity="0.85"/>`,
    flower: `<g transform="translate(86 36)" ${inkT}><circle cx="0" cy="-5" r="4" fill="${a.accC}"/><circle cx="5" cy="-1" r="4" fill="${a.accC}"/><circle cx="3" cy="5" r="4" fill="${a.accC}"/><circle cx="-3" cy="5" r="4" fill="${a.accC}"/><circle cx="-5" cy="-1" r="4" fill="${a.accC}"/><circle r="2.4" fill="#fff6c0"/></g>`,
    scar: `<path d="M40,68 L48,78 M42,75 L47,70" stroke="${a.accC}" stroke-width="1.8" stroke-linecap="round"/>`,
    scarf: `<path d="M38,98 Q62,108 84,98 L88,110 Q62,122 34,110Z" fill="${a.accC}" ${inkT}/><path d="M38,104 L22,118 L34,120Z" fill="${a.accC}" ${inkT}/>`,
    star: `<path d="M88,30 l2.6,5.4 5.9.7 -4.4 4 1.2 5.8 -5.3-3 -5.3 3 1.2-5.8 -4.4-4 5.9-.7z" fill="${a.accC}" ${inkT}/>`,
    crown: `<path d="M42,26 L46,10 L54,20 L62,6 L70,20 L78,10 L82,26Z" fill="${a.accC}" ${inkT}/><circle cx="62" cy="18" r="2.5" fill="#fff"/>`,
    earring: `<path d="M35,72 l0,6" stroke="${a.accC}" stroke-width="2"/><circle cx="35" cy="80" r="2.8" fill="${a.accC}" ${inkT}/>`,
    mask: `<path d="M34,58 Q60,50 84,56 L82,70 Q72,64 62,66 Q50,64 36,70Z" fill="${a.accC}" ${inkT}/><path d="M42,62 L54,63 M66,62 L76,60" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
  };
  const masked = a.acc === 'mask';
  const front = H.front.map(([x0, y0, x1, y1, tx, ty, bend]) => avLock(x0, y0, x1, y1, tx, ty, bend)).join(' ');
  const frontShadow = H.front.map(([x0, y0, x1, y1, tx, ty, bend]) => avLock(x0 + 2, y0 + 3, x1 - 1, y1 + 3, tx + 1.5, ty - 3, bend)).join(' ');
  const burst = Array.from({ length: 18 }, (_, k) => { const g = (k / 18) * TAU; return `M60,60 L${60 + Math.cos(g - 0.07) * 110},${60 + Math.sin(g - 0.07) * 110} L${60 + Math.cos(g + 0.07) * 110},${60 + Math.sin(g + 0.07) * 110}Z`; }).join(' ');
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true">
  <defs>
    <radialGradient id="${id}b" cx="0.45" cy="0.4" r="0.75"><stop offset="0" stop-color="${avShade(a.bg, 1.45)}"/><stop offset="0.55" stop-color="${a.bg}"/><stop offset="1" stop-color="${avShade(a.bg, 0.32)}"/></radialGradient>
    <linearGradient id="${id}i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${avShade(a.eye, 0.3)}"/><stop offset="0.5" stop-color="${a.eye}"/><stop offset="1" stop-color="${avShade(a.eye, 1.6)}"/></linearGradient>
    <linearGradient id="${id}h" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${avShade(a.hairC, 1.18)}"/><stop offset="1" stop-color="${a.hairC}"/></linearGradient>
    <clipPath id="${id}c"><polygon points="60,2 114,31 114,89 60,118 6,89 6,31"/></clipPath>
    <clipPath id="${id}f"><path d="${face}"/></clipPath>
  </defs>
  <g clip-path="url(#${id}c)">
    <rect width="120" height="120" fill="url(#${id}b)"/>
    <path d="${burst}" fill="#fff" opacity="0.08"/>
    <path d="M0,120 L0,92 L120,52 L120,120Z" fill="#000" opacity="0.12"/>
    ${H.tail ? `<path d="${H.tail}" fill="url(#${id}h)" ${ink}/>` : ''}
    <path d="${H.back}" fill="${hairD}" ${ink}/>
    <!-- body turned 3/4: near shoulder lower-left, far shoulder higher-right -->
    <path d="M4,120 Q8,104 28,98 L50,92 L64,106 L74,92 L92,96 Q110,100 116,120Z" fill="${coat}" ${ink}/>
    <path d="M74,92 L92,96 Q110,100 116,120 L96,120 Q94,106 80,100Z" fill="${coatD}"/>
    <path d="M50,92 L64,106 L74,92 L70,90 L64,100 L54,90Z" fill="#f2f4f8" ${inkT}/>
    <path d="M64,106 L60,120" stroke="${coatD}" stroke-width="2"/><path d="M10,110 Q22,102 34,100" stroke="${coatL}" stroke-width="2.4" fill="none" opacity="0.7"/>
    <!-- neck -->
    <path d="M52,84 L52,96 L62,103 L72,96 L72,84Z" fill="${a.skin}" ${ink}/>
    <path d="M52,86 Q62,96 72,88 L72,84 L52,84Z" fill="${skinDD}"/>
    <!-- near ear -->
    <path d="M38,58 Q28,56 30,67 Q32,76 40,74Z" fill="${a.skin}" ${ink}/><path d="M36,62 Q32,64 35,70" stroke="${skinDD}" stroke-width="1.2" fill="none"/>
    <!-- face -->
    <path d="${face}" fill="${a.skin}" ${ink}/>
    <g clip-path="url(#${id}f)"><path d="${farShade}" fill="${skinD}"/><path d="${frontShadow}" fill="${skinD}"/></g>
    <ellipse cx="46" cy="76" rx="5" ry="2.2" fill="#ff8a8a" opacity="0.38"/><ellipse cx="74" cy="75" rx="3.4" ry="1.8" fill="#ff8a8a" opacity="0.3"/>
    ${masked ? '' : `<path d="${brow(47, 7, -1, a.brow)}" stroke="${hairD}" stroke-width="2.8" stroke-linecap="round"/><path d="${brow(71, 5.5, 1, a.brow)}" stroke="${hairD}" stroke-width="2.4" stroke-linecap="round"/>`}
    ${masked ? '' : eye(47, 65, 10.5, -1, 1) + eye(71, 64, 7.5, 1, 0.86)}
    <path d="M67,71 L70,77 L66,78" fill="none" stroke="${skinDD}" stroke-width="1.3" stroke-linecap="round"/>
    ${mouths[a.mouth] || mouths.grin}
    ${a.hair === 'slick' || a.hair === 'buzz' ? '' : `<path d="M34,52 Q32,24 60,22 Q90,24 88,52 Q80,40 60,40 Q42,40 34,52Z" fill="url(#${id}h)" ${ink}/>`}
    <path d="${front}" fill="url(#${id}h)" ${ink}/>
    <path d="M40,40 Q50,33 58,37 L62,33 Q72,35 82,40" fill="none" stroke="${hairL}" stroke-width="2.8" stroke-linecap="round" opacity="0.9"/>
    ${accs[a.acc] || ''}
    ${avHand(a.pose, a.skin, skinD, ink, a.accC, coat)}
  </g>
  <polygon points="60,2 114,31 114,89 60,118 6,89 6,31" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2.5"/>
  <polygon points="60,6 110,33 110,87 60,114 10,87 10,33" fill="none" stroke="${AV_INK}" stroke-width="1.5" opacity="0.55"/>
</svg>`;
}
const TYPE_HEX = { atk: '#ff4141', def: '#3d8bff', sta: '#2fd27a', bal: '#f6c632' };
function oppAvatar(o, size) { return avatarSVG(o.av, TYPE_HEX[o.type], size); }
function playerAvatar(size) {
  const P = (typeof Store !== 'undefined' && Store.profile) || null, t = (P && P.starter) || 'atk';
  return avatarSVG({ hair: 'spiky', hairC: '#2a2230', skin: '#f6d2b4', eye: TYPE_HEX[t], eyes: 'sharp', brow: 'firm', mouth: 'grin', acc: 'goggles', accC: '#ff8a2a', bg: '#24304e', pose: 'bey' }, TYPE_HEX[t], size);
}
