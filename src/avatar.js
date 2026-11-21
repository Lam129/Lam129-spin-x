/* ============================== AVATARS (original characters, procedural SVG) ============================== */
function avatarSVG(av, typeCss = '#888', size = 64) {
  const { hair = 'short', hairC = '#222', skin = '#f2c9a0', eye = '#36d3ff', acc = 'none', accC = '#fff', bg = '#334' } = av || {};
  const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
  const hairD = shade(hairC, 0.7), skinD = shade(skin, 0.86);
  const id = 'a' + Math.random().toString(36).slice(2, 8);
  // hair pieces: back layer (behind face) and front layer (fringe)
  const back = {
    long: `<path d="M18 40 Q14 76 22 96 L78 96 Q86 76 82 40 Q78 14 50 12 Q22 14 18 40Z" fill="${hairD}"/>`,
    twin: `<path d="M16 38 Q4 60 10 90 Q18 84 22 60Z M84 38 Q96 60 90 90 Q82 84 78 60Z" fill="${hairD}"/>`,
    pony: `<path d="M74 30 Q98 40 92 78 Q84 70 80 52Z" fill="${hairD}"/>`,
    mane: `<path d="M12 50 Q6 22 30 12 Q50 2 70 12 Q94 22 88 50 Q96 70 84 84 L16 84 Q4 70 12 50Z" fill="${hairD}"/>`,
    bob: `<path d="M20 36 Q16 66 26 74 L74 74 Q84 66 80 36 Q76 14 50 13 Q24 14 20 36Z" fill="${hairD}"/>`,
  }[hair] || '';
  const front = {
    spiky: `<path d="M24 40 L20 22 L32 28 L34 12 L44 24 L50 8 L56 24 L66 12 L68 28 L80 22 L76 40 Q64 30 50 32 Q36 30 24 40Z" fill="${hairC}"/>`,
    long: `<path d="M24 42 Q26 18 50 16 Q74 18 76 42 Q66 30 56 34 L50 26 L44 34 Q34 30 24 42Z" fill="${hairC}"/>`,
    buzz: `<path d="M26 38 Q28 18 50 17 Q72 18 74 38 Q62 28 50 28 Q38 28 26 38Z" fill="${hairC}"/>`,
    pony: `<path d="M24 42 Q24 16 52 15 Q76 17 76 40 Q70 30 60 28 L54 36 L46 28 Q34 30 24 42Z" fill="${hairC}"/>`,
    twin: `<path d="M24 42 Q24 16 50 15 Q76 16 76 42 L68 32 L62 38 L56 30 L50 38 L44 30 L38 38 L32 32Z" fill="${hairC}"/>`,
    bob: `<path d="M23 44 Q22 16 50 15 Q78 16 77 44 Q72 34 50 32 Q28 34 23 44Z" fill="${hairC}"/>`,
    mane: `<path d="M22 42 L16 26 L30 30 L30 14 L42 24 L50 10 L58 24 L70 14 L70 30 L84 26 L78 42 Q66 30 50 31 Q34 30 22 42Z" fill="${hairC}"/>`,
    slick: `<path d="M24 40 Q24 16 50 15 Q78 16 76 36 Q64 22 40 28 Q30 30 24 40Z" fill="${hairC}"/><path d="M40 28 Q56 22 74 32" stroke="${hairD}" stroke-width="2" fill="none"/>`,
    short: `<path d="M24 40 Q24 17 50 16 Q76 17 76 40 Q68 30 58 31 L52 26 L46 32 Q32 30 24 40Z" fill="${hairC}"/>`,
  }[hair] || '';
  const accs = {
    band: `<path d="M24 34 Q50 26 76 34 L76 40 Q50 32 24 40Z" fill="${accC}"/><path d="M76 36 L90 30 L86 40Z" fill="${accC}"/>`,
    flower: `<g transform="translate(72 26)"><circle r="6" fill="${accC}"/><circle r="2.5" fill="#fff"/></g>`,
    scar: `<path d="M60 44 L68 54 M62 50 L66 46" stroke="${accC}" stroke-width="2"/>`,
    scarf: `<path d="M28 78 Q50 86 72 78 L76 90 Q50 98 24 90Z" fill="${accC}"/><path d="M66 86 L80 100 L70 100Z" fill="${accC}"/>`,
    star: `<path d="M74 22 l2.4 5 5.4.6 -4 3.7 1.1 5.3 -4.9-2.7 -4.9 2.7 1.1-5.3 -4-3.7 5.4-.6z" fill="${accC}"/>`,
    crown: `<path d="M34 20 L38 8 L44 16 L50 4 L56 16 L62 8 L66 20Z" fill="${accC}" stroke="#fff" stroke-width="1"/>`,
    earring: `<circle cx="24" cy="58" r="3" fill="${accC}"/><circle cx="76" cy="58" r="3" fill="${accC}"/>`,
    mask: `<path d="M26 44 Q50 38 74 44 L72 54 Q62 50 50 52 Q38 50 28 54Z" fill="${accC}" opacity="0.92"/>`,
  }[acc] || '';
  const eyes = acc === 'mask'
    ? `<ellipse cx="39" cy="48" rx="4" ry="2.4" fill="${eye}"/><ellipse cx="61" cy="48" rx="4" ry="2.4" fill="${eye}"/>`
    : `<g><ellipse cx="39" cy="50" rx="4.6" ry="5.6" fill="#141018"/><ellipse cx="39" cy="51" rx="3.4" ry="4.2" fill="${eye}"/><circle cx="37.6" cy="48.4" r="1.4" fill="#fff"/>
       <ellipse cx="61" cy="50" rx="4.6" ry="5.6" fill="#141018"/><ellipse cx="61" cy="51" rx="3.4" ry="4.2" fill="${eye}"/><circle cx="59.6" cy="48.4" r="1.4" fill="#fff"/>
       <path d="M33 42 L45 43 M55 43 L67 42" stroke="${hairD}" stroke-width="2.2" stroke-linecap="round"/></g>`;
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${shade(bg, 0.45)}"/></linearGradient>
    <clipPath id="${id}c"><polygon points="50,2 96,26 96,74 50,98 4,74 4,26"/></clipPath></defs>
    <g clip-path="url(#${id}c)">
      <rect width="100" height="100" fill="url(#${id})"/>
      <path d="M0 100 L0 80 L100 40 L100 100Z" fill="rgba(255,255,255,0.08)"/>
      ${back}
      <path d="M18 100 Q20 80 38 76 L62 76 Q80 80 82 100Z" fill="${typeCss}"/>
      <path d="M40 76 L50 88 L60 76" fill="${shade(typeCss.startsWith('#') ? typeCss : '#666', 0.6)}"/>
      <rect x="43" y="64" width="14" height="14" rx="3" fill="${skinD}"/>
      <ellipse cx="50" cy="48" rx="24" ry="26" fill="${skin}"/>
      <ellipse cx="27" cy="52" rx="3.5" ry="5" fill="${skinD}"/><ellipse cx="73" cy="52" rx="3.5" ry="5" fill="${skinD}"/>
      ${eyes}
      <path d="M45 63 Q50 66 55 63" stroke="#7a3a2a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      ${front}${accs}
    </g>
    <polygon points="50,2 96,26 96,74 50,98 4,74 4,26" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
  </svg>`;
}
const TYPE_HEX = { atk: '#ff4141', def: '#3d8bff', sta: '#2fd27a', bal: '#f6c632' };
function oppAvatar(o, size) { return avatarSVG(o.av, TYPE_HEX[o.type], size); }
function playerAvatar(size) {
  const P = Store.profile, t = (P && P.starter) || 'atk';
  return avatarSVG({ hair: 'short', hairC: '#2a1e14', skin: '#f2c9a0', eye: TYPE_HEX[t], acc: 'band', accC: '#ff6a1a', bg: '#1e2840' }, TYPE_HEX[t], size);
}
