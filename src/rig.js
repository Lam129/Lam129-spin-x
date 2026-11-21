/* ============================== RIGGED SPIRIT BEASTS (original designs, code-driven animation) ==============================
   Quadrupeds (wolf, tiger): torso / neck+mane / head / jaw / 3-joint tail / 4 legs x 2 segments, animated with a
   rotary-gallop cycle. Dragon: serpentine spine rebuilt every frame as a tapered ribbon with dorsal fins. */
const RIG = {
  quad: {
    torso: 'M120,96 Q150,78 200,80 Q250,76 282,84 Q302,90 306,108 Q302,128 280,136 Q246,142 210,132 Q176,128 150,134 Q124,134 116,118 Q112,104 120,96Z',
    neck: 'M272,90 Q286,66 312,62 L328,78 Q320,102 300,114 Q284,110 272,90Z',
    mane: 'M268,94 L254,72 L276,82 L270,56 L290,74 L292,48 L306,70 L314,50 L318,72 L304,96Z',
    head: { wolf: 'M300,72 Q304,54 322,50 L326,22 L340,46 L348,26 L354,52 Q368,56 386,64 L400,70 Q398,78 386,80 L358,82 Q350,92 334,92 Q312,90 302,84Z',
            tiger: 'M298,70 Q300,50 320,46 Q322,34 334,36 Q340,42 338,48 Q350,46 360,54 Q374,58 390,66 L398,74 Q394,84 380,84 L356,86 Q348,96 330,96 Q308,92 300,84Z' },
    jaw: 'M346,82 L392,82 Q388,92 366,96 L344,92Z',
    tail: ['M126,100 Q104,88 86,84 Q96,94 92,100 Q104,108 122,112Z', 'M92,90 Q72,80 56,80 Q66,90 62,96 Q76,102 92,104Z', 'M62,88 Q40,78 20,80 Q34,90 28,96 Q46,100 62,100Z'],
    upper: 'M-16,-6 Q-18,20 -9,44 L9,44 Q17,18 16,-6 Q0,-14 -16,-6Z',
    lower: 'M-9,0 L-6,36 Q-7,46 4,47 L22,47 Q25,40 13,37 L7,34 L9,0Z',
    legs: [ // [pivotX, pivotY, phaseOffset, front?, far?]
      [136, 114, 0.08, false, true], [268, 112, 0.58, true, true],
      [150, 120, 0.0, false, false], [282, 118, 0.5, true, false],
    ],
  },
};
function rigQuadSVG(kind, color, id) {
  const Q = RIG.quad, c = '#' + new THREE.Color(color).getHexString();
  const far = new THREE.Color(color).multiplyScalar(0.55).getStyle();
  const fill = `url(#${id}g)`, line = 'stroke="#fff" stroke-width="2.6" stroke-linejoin="round"';
  const leg = (i, [x, y, , , isFar]) => { const f = isFar ? far : fill; return `<g data-leg="${i}" transform="translate(${x} ${y})"><g class="u"><g class="l" transform="translate(0 42)"><path d="${Q.lower}" fill="${f}" ${line}/><circle r="9" fill="${f}"/></g><path d="${Q.upper}" fill="${f}" ${line}/><circle cy="42" r="8.5" fill="${f}"/><circle r="15" fill="${f}"/></g></g>`; };
  const stripes = kind === 'tiger' ? `<path d="M170,84 L176,104 M196,82 L200,108 M224,80 L224,106 M252,80 L248,102 M146,92 L154,108" stroke="${far}" stroke-width="6" stroke-linecap="round" opacity="0.8"/>` : `<path d="M160,90 Q200,84 250,88 M150,112 Q190,104 240,110" stroke="rgba(255,255,255,0.7)" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  const headFur = kind === 'wolf' ? `<path d="M322,56 L328,34 M340,52 L346,34" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>` : `<path d="M320,60 L326,70 M334,56 L338,68 M348,58 L350,70" stroke="${far}" stroke-width="4" stroke-linecap="round"/>`;
  return `
    <g data-rig="quad">
      ${leg(0, Q.legs[0])}${leg(1, Q.legs[1])}
      <g data-body>
        <g data-tail transform="translate(126 104)"><g transform="translate(-126 -104)"><path d="${Q.tail[0]}" fill="${fill}" ${line}/>
          <g data-t1 transform="translate(92 96)"><g transform="translate(-92 -96)"><path d="${Q.tail[1]}" fill="${fill}" ${line}/>
            <g data-t2 transform="translate(62 92)"><g transform="translate(-62 -92)"><path d="${Q.tail[2]}" fill="${fill}" ${line}/></g></g></g></g></g></g>
        <path d="${Q.torso}" fill="${fill}" ${line}/>${stripes}
        <g data-neck transform="translate(286 96)"><g transform="translate(-286 -96)">
          <path d="${Q.mane}" fill="${fill}" ${line}/><path d="${Q.neck}" fill="${fill}" ${line}/>
          <g data-head transform="translate(316 76)"><g transform="scale(1.18) translate(-316 -76)">
            <g data-jaw transform="translate(348 84)"><g transform="translate(-348 -84)"><path d="${Q.jaw}" fill="${far}" ${line}/>
              <path d="M360,86 L363,92 L366,86 M374,85 L377,91 L380,85" fill="#fff"/></g></g>
            <path d="${Q.head[kind] || Q.head.wolf}" fill="${fill}" ${line}/>${headFur}
            <path d="M358,74 L364,80 L370,74 M376,74 L380,79 L384,74" fill="#fff"/>
            <path d="M330,66 L346,70" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/><path d="M330,66 L346,70" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
          </g></g>
        </g></g>
      </g>
      ${leg(2, Q.legs[2])}${leg(3, Q.legs[3])}
    </g>`;
}
function rigDragonSVG(color, id) {
  const c = '#' + new THREE.Color(color).getHexString();
  return `<g data-rig="dragon"><path data-fins fill="url(#${id}g)" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path data-body fill="url(#${id}g)" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
    <path data-belly fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
    <g data-head><g transform="scale(1.45)"><path d="M-6,-16 L18,-20 L30,-38 L32,-18 L52,-12 L72,-4 Q78,2 70,6 L52,8 L58,16 L38,14 Q20,22 -2,16Z" fill="url(#${id}g)" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
      <path d="M20,-22 L8,-46 M30,-26 L26,-52" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <path d="M26,-8 L42,-6" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/><path d="M26,-8 L42,-6" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
      <path data-whisk1 fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path data-whisk2 fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.8"/></g></g></g>`;
}
/* returns SVG inner markup if this beast kind is rigged, else null */
function rigMarkup(kind, color, id) {
  if (kind === 'wolf' || kind === 'tiger') return rigQuadSVG(kind, color, id);
  if (kind === 'dragon') return rigDragonSVG(color, id);
  return null;
}
/* drive one rigged svg at time t (seconds) */
function animateRig(svg, t) {
  const g = svg.querySelector('[data-rig]'); if (!g) return;
  if (g.dataset.rig === 'quad') {
    const p = (t * 2.6) % 1, TAU2 = Math.PI * 2;
    const body = g.querySelector('[data-body]');
    body.setAttribute('transform', `translate(0 ${(-6 * Math.sin(TAU2 * 2 * p)).toFixed(2)}) rotate(${(4 * Math.sin(TAU2 * p)).toFixed(2)} 210 110)`);
    RIG.quad.legs.forEach(([x, y, off, front], i) => {
      const ph = TAU2 * (p + off);
      const up = front ? 38 * Math.sin(ph) : -36 * Math.sin(ph);
      const lo = front ? -55 * Math.max(0, Math.sin(ph + 1.3)) : 50 * Math.max(0, Math.sin(ph - 1.0));
      const lg = g.querySelector(`[data-leg="${i}"]`);
      const bob = -6 * Math.sin(TAU2 * 2 * p);
      lg.setAttribute('transform', `translate(${x} ${(y + bob).toFixed(2)})`);
      lg.querySelector('.u').setAttribute('transform', `rotate(${(-up).toFixed(2)})`);
      lg.querySelector('.l').setAttribute('transform', `translate(0 42) rotate(${(-lo).toFixed(2)})`);
    });
    g.querySelector('[data-neck]').setAttribute('transform', `translate(286 96) rotate(${(-6 * Math.sin(TAU2 * p + 0.6)).toFixed(2)})`);
    g.querySelector('[data-head]').setAttribute('transform', `translate(316 76) rotate(${(4 * Math.sin(TAU2 * p + 1.2)).toFixed(2)})`);
    g.querySelector('[data-jaw]').setAttribute('transform', `translate(348 84) rotate(${(8 + 10 * (0.5 + 0.5 * Math.sin(t * 9))).toFixed(2)})`);
    const tw = Math.sin(TAU2 * p + 1);
    g.querySelector('[data-tail]').setAttribute('transform', `translate(126 104) rotate(${(10 * tw).toFixed(2)})`);
    g.querySelector('[data-t1]').setAttribute('transform', `translate(92 96) rotate(${(14 * Math.sin(TAU2 * p + 1.8)).toFixed(2)})`);
    g.querySelector('[data-t2]').setAttribute('transform', `translate(62 92) rotate(${(18 * Math.sin(TAU2 * p + 2.6)).toFixed(2)})`);
  } else if (g.dataset.rig === 'dragon') {
    const N = 22, pts = [];
    for (let k = 0; k < N; k++) {
      const u = k / (N - 1); // 0 = tail, 1 = head
      const x = 20 + u * 310, y = 120 + Math.sin(u * 7 - t * 9) * (34 * (1 - u * 0.55)) + Math.sin(u * 3 - t * 4) * 8;
      pts.push([x, y]);
    }
    const thick = (u) => 4 + 24 * Math.sin(Math.min(1, u * 1.1) * Math.PI * 0.55);
    const top = [], bot = [], fins = [];
    for (let k = 0; k < N; k++) {
      const [x, y] = pts[k], [x2, y2] = pts[Math.min(N - 1, k + 1)], [x0, y0] = pts[Math.max(0, k - 1)];
      let dx = x2 - x0, dy = y2 - y0; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const nx = -dy, ny = dx, w = thick(k / (N - 1));
      top.push([x - nx * w, y - ny * w]); bot.push([x + nx * w, y + ny * w]);
      if (k % 2 === 0 && k > 1 && k < N - 2) fins.push(`M${(x - nx * w - dx * 7).toFixed(1)},${(y - ny * w - dy * 7).toFixed(1)} L${(x - nx * (w + 18) - dx * 12).toFixed(1)},${(y - ny * (w + 18) - dy * 12).toFixed(1)} L${(x - nx * w + dx * 7).toFixed(1)},${(y - ny * w + dy * 7).toFixed(1)}Z`);
    }
    const path = 'M' + top.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' L') + ' L' + bot.reverse().map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' L') + 'Z';
    g.querySelector('[data-body]').setAttribute('d', path);
    g.querySelector('[data-fins]').setAttribute('d', fins.join(' '));
    g.querySelector('[data-belly]').setAttribute('d', 'M' + pts.slice(3, N - 2).map(([x, y]) => `${x.toFixed(1)},${(y + 4).toFixed(1)}`).join(' L'));
    const [hx, hy] = pts[N - 1], [px, py] = pts[N - 3];
    const ang = Math.atan2(hy - py, hx - px) * 180 / Math.PI;
    g.querySelector('[data-head]').setAttribute('transform', `translate(${hx.toFixed(1)} ${hy.toFixed(1)}) rotate(${ang.toFixed(1)})`);
    const wv = (s) => `M60,4 Q${90},${10 + Math.sin(t * 7 + s) * 14} ${120},${4 + Math.sin(t * 6 + s + 1) * 22}`;
    g.querySelector('[data-whisk1]').setAttribute('d', wv(0));
    g.querySelector('[data-whisk2]').setAttribute('d', wv(2).replace('M60,4', 'M56,10'));
  }
}
/* run rig animation on all rigged svgs inside root until stopFn returns true */
function playRigs(root, durationMs) {
  const svgs = Array.from(root.querySelectorAll('svg')).filter((s) => s.querySelector('[data-rig]'));
  if (!svgs.length) return;
  const t0 = performance.now();
  const step = () => {
    const el = (performance.now() - t0) / 1000;
    svgs.forEach((s, i) => animateRig(s, el - i * 0.04));
    if (el * 1000 < durationMs) requestAnimationFrame(step);
  };
  step();
}
