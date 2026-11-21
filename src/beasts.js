/* ============================== SPIRIT BEASTS (original designs) ==============================
   Each beast is an SVG silhouette in a 400x240 box, facing right. Body is filled with an energy gradient,
   detail strokes add fur/feather lines, a glowing slit eye sells the anime look. mode drives the animation. */
const BEASTS = {
  wolf: {
    mode: 'run',
    body: `M390,84 L352,70 L336,58 L334,18 L320,50 L312,22 L300,54 L292,58 L284,46 L276,62 L266,40 L258,62 L246,44 L240,66 L226,58 L222,74
      Q190,80 160,82 L132,76 L112,64 L90,40 L96,62 L66,34 L70,58 L30,40 L48,66 L10,62 L46,82 L80,88 L112,96
      L118,100 L96,118 L70,132 L44,140 L30,146 L36,154 L58,152 L84,146 L112,134 L136,120
      L146,122 L132,144 L116,164 L108,174 L128,176 L142,162 L162,138 L176,124
      Q210,128 244,122 L258,126 L284,142 L318,156 L346,160 L352,152 L330,146 L300,130 L286,116
      L298,114 L326,118 L352,120 L372,118 L370,110 L346,106 L320,102 L306,96 L320,94 L342,90 L378,104 L358,94 L348,86 L390,88Z`,
    detail: `M356,87 L360,93 L364,87 M370,88 L373,94 L376,88 M318,62 L326,40 M304,62 L310,42 M278,72 L262,84 M250,76 L232,86 M206,86 L176,94 M88,60 L58,52 M84,72 L40,70 M300,108 L322,112 M262,132 L286,146 M96,124 L66,138`,
    eye: [[328, 64], [344, 69]],
  },
  tiger: {
    mode: 'run',
    body: `M374,96 L352,84 L340,70 L332,52 Q326,44 318,50 L314,60 Q304,56 296,64 Q270,72 240,78 Q200,84 160,84 Q138,82 124,78
      Q100,70 80,74 Q60,80 40,70 Q30,64 22,70 Q36,84 60,90 Q86,94 110,96
      L96,120 L72,140 L44,150 L34,158 L44,164 L72,158 L100,144 L126,126
      L138,126 L118,150 L100,168 L92,176 L114,176 L136,158 L160,132 L180,122
      Q216,128 250,122 L268,128 L298,144 L338,154 L358,154 L362,146 L340,140 L308,128 L294,116
      L306,116 L336,122 L360,124 L372,120 L368,112 L346,108 L322,102 L340,106 L360,104 L376,100Z`,
    detail: `M150,84 L160,104 M180,84 L186,108 M210,82 L212,110 M240,78 L238,104 M268,74 L262,96 M120,80 L128,98 M86,74 L92,90 M62,84 L66,94 M340,96 L366,98`,
    eye: [[334, 78], [348, 80]],
  },
  rhino: {
    mode: 'run',
    body: `M384,104 L372,68 L362,92 L348,82 L340,62 L330,80 Q310,64 280,62 Q230,56 180,62 Q140,66 118,76 Q100,82 90,96 L84,92 Q80,104 88,110
      L84,140 L70,166 L66,178 L92,178 L102,160 L118,130
      L140,134 L130,166 L126,180 L152,180 L160,158 L170,132
      Q220,140 262,132 L276,140 L290,170 L292,182 L318,182 L314,160 L304,130
      L318,128 L338,154 L346,168 L370,166 L362,146 L344,120 Q360,120 372,116 Q386,114 384,104Z`,
    detail: `M150,72 Q200,64 250,70 M140,92 Q200,84 270,90 M300,80 L320,96 M120,90 L130,110`,
    eye: [[338, 92], [350, 94]],
  },
  rabbit: {
    mode: 'run',
    body: `M360,104 Q368,92 360,82 L352,78 L362,20 Q364,8 354,14 L338,72 L330,74 L326,22 Q324,10 316,18 L314,76
      Q296,78 282,86 Q240,74 196,82 Q160,90 140,104 Q124,110 112,104 Q100,104 104,116 Q114,124 132,122
      L112,146 L70,162 L54,170 L68,176 L120,164 L150,140
      Q200,146 250,134 L278,150 L318,164 L340,164 L338,156 L300,142 L286,128 Q316,128 334,120 Q356,114 360,104Z`,
    detail: `M356,30 L344,66 M322,30 L320,68 M200,90 Q240,84 270,96 M160,104 Q190,98 220,104`,
    eye: [[332, 92], [344, 94]],
  },
  bird: {
    mode: 'fly',
    body: `M380,120 L350,112 Q334,104 316,108 Q290,112 260,116 Q230,118 206,120 L150,112 L96,96 L40,90 L70,108 L36,118 L84,124 L48,140 L104,134 L150,130 Q190,134 230,134 Q270,136 300,130 Q320,128 336,126 Z`,
    wings: `M250,118 Q230,70 200,40 Q180,20 150,10 Q170,40 176,60 Q150,40 118,34 Q140,56 150,74 Q120,62 92,64 Q130,86 170,104 Q200,116 230,122Z`,
    wings2: `M262,124 Q240,90 214,72 Q196,60 176,58 Q194,80 200,96 Q178,86 156,88 Q184,106 214,118Z`,
    detail: `M200,48 L220,96 M168,40 L196,100 M130,52 L178,104 M60,100 L110,112 M60,130 L110,124`,
    eye: [[344, 112], [356, 114]],
  },
  crane: {
    mode: 'fly',
    body: `M392,96 L360,98 Q344,96 334,104 Q318,116 300,124 Q260,136 220,136 L170,130 L120,128 L170,140 Q200,146 230,146 Q270,144 300,136 Q330,124 346,108 Q356,104 366,104 Z M180,140 L120,180 L112,186 L124,186 L190,144Z`,
    wings: `M260,128 Q240,70 214,30 Q200,10 176,0 Q186,30 190,52 Q166,26 138,18 Q156,44 162,64 Q132,46 104,44 Q140,74 180,100 Q214,122 240,132Z`,
    wings2: `M270,134 Q250,104 226,86 Q208,74 186,72 Q204,94 210,110 Q190,100 166,104 Q196,122 226,132Z`,
    detail: `M196,38 L222,104 M160,30 L196,104 M126,52 L180,108`,
    eye: [[350, 100], [358, 101]],
    crest: true,
  },
  owl: {
    mode: 'fly',
    body: `M356,128 Q362,100 344,84 L352,64 L334,76 Q320,70 304,76 L292,62 L290,84 Q270,100 268,124 Q264,150 290,166 Q320,180 344,164 Q360,150 356,128Z M290,166 L240,176 L276,184 L250,196 L298,180Z`,
    wings: `M290,110 Q250,70 200,50 Q170,40 130,44 Q160,60 172,74 Q140,66 108,74 Q140,90 158,100 Q128,100 104,110 Q150,124 200,128 Q250,130 280,128Z`,
    wings2: `M300,128 Q270,104 236,96 Q212,92 190,98 Q210,110 218,120 Q196,120 176,130 Q216,140 250,140Z`,
    detail: `M300,100 Q314,96 326,104 M320,140 L334,150 M300,150 L314,160 M180,62 L230,110 M140,80 L210,118`,
    eye: [[302, 98], [314, 100]],
    eye2: [[322, 100], [334, 98]],
  },
  phoenix: {
    mode: 'fly',
    body: `M384,112 L354,106 L360,88 L346,96 L340,80 L332,98 Q310,102 286,110 Q250,120 214,122 Q180,124 150,118 Q110,104 70,80 Q40,64 6,70 Q40,82 64,96 Q30,96 4,110 Q44,112 80,118 Q50,130 20,152 Q66,140 110,132 Q150,136 196,138 Q240,140 280,134 Q314,128 340,124 Z`,
    wings: `M260,118 Q244,60 214,26 Q196,6 166,-4 Q180,26 184,48 Q156,24 122,14 Q144,42 152,64 Q118,46 84,44 Q122,76 164,100 Q206,120 240,124Z`,
    wings2: `M272,126 Q252,92 222,72 Q202,60 178,58 Q196,82 202,100 Q178,90 152,94 Q184,114 218,126Z`,
    detail: `M60,84 Q100,96 140,110 M40,104 Q90,110 140,120 M60,130 Q100,126 140,124 M190,30 L220,100 M156,24 L196,102 M120,46 L180,108`,
    eye: [[346, 104], [358, 106]],
  },
  dragon: {
    mode: 'fly',
    body: `M388,92 L362,88 L370,70 L354,78 L350,58 L342,78 L332,74 Q318,74 308,84 Q290,100 284,120 Q276,150 250,160 Q220,170 194,154 Q172,138 150,140 Q120,144 100,162 Q80,180 50,176 Q24,172 6,152 Q30,160 50,156 Q72,150 86,132 Q104,110 134,108 Q164,108 186,122 Q206,136 226,132 Q246,126 252,104 Q258,80 282,66 Q300,56 320,60 L330,40 L336,60 Q350,62 360,72 L380,74 L374,84 Z
      M226,132 L218,150 L206,160 L226,158 L236,140Z M170,124 L160,140 L148,148 L168,148 L180,132Z`,
    wings: `M250,108 Q234,66 204,40 Q184,24 158,20 Q172,44 174,60 Q150,44 124,44 Q146,66 152,82 Q126,76 104,84 Q146,104 190,114 Q224,120 246,116Z`,
    detail: `M300,70 L306,60 M282,90 L290,80 M268,120 L278,112 M240,150 L246,142 M200,150 L206,140 M150,130 L156,120 M110,140 L116,130 M70,160 L76,150 M362,84 L384,90`,
    eye: [[340, 80], [352, 82]],
  },
  shark: {
    mode: 'swim',
    body: `M392,124 Q370,104 330,98 Q300,94 270,96 L246,60 L232,96 Q180,100 130,108 L96,90 L70,62 L80,110 L58,152 L96,130 L130,134 Q180,144 230,146 L250,170 L258,146 Q300,146 336,140 Q372,134 392,124Z`,
    detail: `M340,110 L340,130 M330,108 L330,132 M320,108 L320,132 M380,126 Q360,134 340,134`,
    eye: [[352, 112], [364, 114]],
  },
  turtle: {
    mode: 'crawl',
    body: `M360,132 Q380,128 386,118 Q384,104 366,104 Q350,104 340,114 Q330,80 280,66 Q230,54 180,62 Q130,72 104,104 Q92,120 80,124 L60,132 L84,138 Q100,140 120,140
      L104,166 L94,180 L120,180 L140,148 L230,150 L250,180 L278,180 L264,148 Q310,146 336,138 Z`,
    detail: `M150,80 L190,70 L230,74 L262,86 M130,106 L176,96 L220,98 L260,106 L300,118 M176,96 L190,70 M220,98 L230,74 M260,106 L262,86 M150,80 L130,106`,
    eye: [[362, 112], [372, 113]],
  },
  crab: {
    mode: 'crawl',
    body: `M200,92 Q250,80 300,92 Q330,100 330,124 Q330,146 300,152 Q250,162 200,152 Q170,146 170,124 Q170,100 200,92Z
      M300,100 L340,70 L348,40 Q370,30 386,46 Q394,64 380,74 L362,66 L374,80 Q360,94 346,86 L314,112Z
      M200,100 L160,70 L152,40 Q130,30 114,46 Q106,64 120,74 L138,66 L126,80 Q140,94 154,86 L186,112Z
      M300,140 L344,160 L360,186 L350,190 L332,166 L296,152Z M290,148 L322,178 L326,200 L316,202 L308,182 L282,156Z
      M200,140 L156,160 L140,186 L150,190 L168,166 L204,152Z M210,148 L178,178 L174,200 L184,202 L192,182 L218,156Z`,
    detail: `M210,110 Q250,100 290,110 M220,130 Q250,124 280,130`,
    eye: [[232, 96], [240, 92]],
    eye2: [[260, 92], [268, 96]],
  },
  scorpion: {
    mode: 'crawl',
    body: `M230,140 Q260,124 300,128 Q330,132 344,144 Q330,156 300,160 Q260,162 230,150 Q210,146 196,150 Q176,156 160,150 Q144,140 140,124 Q138,100 150,80 Q160,60 180,48 Q196,40 212,46 L226,30 L222,52 Q206,56 196,66 Q180,82 176,104 Q176,124 190,132 Q206,138 230,140Z
      M336,140 L360,120 L382,112 Q394,116 388,128 L370,130 L384,140 Q374,150 360,144 Z
      M326,152 L350,170 L374,174 Q386,180 378,190 L362,184 L370,196 Q356,200 346,188 Z
      M300,160 L290,190 L280,194 L284,166Z M270,162 L256,190 L246,192 L254,164Z M240,154 L222,180 L212,180 L228,152Z`,
    detail: `M150,100 L162,104 M156,80 L168,86 M170,62 L180,70 M250,136 L254,154 M280,132 L282,156`,
    eye: [[320, 136], [330, 138]],
  },
  mantis: {
    mode: 'crawl',
    body: `M380,82 Q392,74 384,64 Q372,58 360,68 L354,82 Q340,92 330,110 Q320,130 300,140 Q260,150 200,146 Q150,142 110,148 Q80,152 60,144 Q90,136 120,128 Q170,118 220,120 Q260,122 290,112 Q310,104 320,90 Z
      M340,96 L330,60 L346,20 L354,24 L344,58 L352,90Z M330,104 L360,96 L392,66 L398,72 L368,104 L338,114Z
      M280,124 L270,170 L262,190 L254,190 L262,168 L270,126Z M240,128 L220,170 L208,186 L200,184 L212,166 L230,128Z M190,132 L170,176 L160,190 L152,188 L164,172 L180,132Z`,
    detail: `M346,24 L340,56 M392,70 L366,98 M150,134 Q200,128 250,130`,
    eye: [[366, 70], [378, 72]],
  },
  jelly: {
    mode: 'swim',
    body: `M120,120 Q120,40 200,36 Q280,40 280,120 Q264,112 248,122 Q232,112 216,122 Q200,112 184,122 Q168,112 152,122 Q136,112 120,120Z
      M140,120 Q130,160 146,200 Q136,160 152,124Z M172,124 Q160,170 178,214 Q170,170 182,126Z M208,124 Q200,176 220,222 Q212,176 218,126Z M242,124 Q236,166 252,206 Q246,166 252,124Z M266,120 Q264,154 278,186 Q272,154 274,122Z`,
    detail: `M150,80 Q200,60 250,80 M140,104 Q200,90 260,104`,
    eye: [[180, 90], [190, 92]],
    eye2: [[210, 92], [220, 90]],
  },
  shield: {
    mode: 'emblem',
    body: `M200,10 L320,40 Q330,140 200,230 Q70,140 80,40 Z`,
    detail: `M200,30 L300,56 Q306,136 200,208 Q94,136 100,56 Z M200,60 L200,180 M140,100 L260,100`,
  },
  castle: {
    mode: 'emblem',
    body: `M60,220 L60,90 L84,90 L84,70 L108,70 L108,90 L132,90 L132,60 L160,60 L160,40 L184,40 L184,20 L216,20 L216,40 L240,40 L240,60 L268,60 L268,90 L292,90 L292,70 L316,70 L316,90 L340,90 L340,220 Z`,
    detail: `M176,220 L176,150 Q200,124 224,150 L224,220 M100,120 L120,120 L120,150 L100,150Z M280,120 L300,120 L300,150 L280,150Z M190,70 L210,70 L210,100 L190,100Z`,
  },
  star: {
    mode: 'emblem',
    body: `M200,6 L228,90 L316,90 L246,142 L272,228 L200,176 L128,228 L154,142 L84,90 L172,90 Z`,
    detail: `M200,60 L214,104 L260,104 L224,130 L238,174 L200,148 L162,174 L176,130 L140,104 L186,104 Z`,
  },
};
/* which beast each blade summons (original pairings) */
const BEAST_OF = {
  wolf: 'wolf', thunder: 'dragon', flame: 'dragon', shark: 'shark', hawk: 'bird', scorpion: 'scorpion',
  silver: 'shield', turtle: 'turtle', fortress: 'castle', rhino: 'rhino', crab: 'crab',
  moon: 'rabbit', phantom: 'dragon', crane: 'crane', owl: 'owl', jelly: 'jelly',
  phoenix: 'phoenix', tiger: 'tiger', mantis: 'mantis', darkstar: 'star',
};
function beastSVG(bladeId, color) {
  const key = BEAST_OF[bladeId] || 'wolf', B = BEASTS[key];
  const c = '#' + new THREE.Color(color).getHexString();
  const id = 'b' + Math.random().toString(36).slice(2, 7);
  const eyes = [B.eye, B.eye2].filter(Boolean).map(([[x0, y0], [x1, y1]]) => `<path d="M${x0},${y0} L${x1},${y1}" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M${x0},${y0} L${x1},${y1}" stroke="${c}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`).join('');
  const body = (extra = '') => `<path d="${B.body}" fill="url(#${id}g)" stroke="#fff" stroke-width="3" stroke-linejoin="round" ${extra}/>`;
  const wings = B.wings ? `<g class="bw-back" style="transform-origin:250px 118px"><path d="${B.wings2 || B.wings}" fill="url(#${id}g)" stroke="#fff" stroke-width="2" opacity="0.7"/></g><g class="bw" style="transform-origin:250px 118px"><path d="${B.wings}" fill="url(#${id}g)" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></g>` : '';
  const rig = typeof rigMarkup === 'function' ? rigMarkup(key, color, id) : null;
  if (rig) {
    return `<svg class="beast rigged" viewBox="-20 -30 440 300" aria-hidden="true">
    <defs><linearGradient id="${id}g" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="${c}"/><stop offset="1" stop-color="${new THREE.Color(color).multiplyScalar(0.35).getStyle()}"/></linearGradient>
    <filter id="${id}f" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="5" result="d"/><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="5"><animate attributeName="baseFrequency" dur="0.5s" values="0.03;0.055;0.03" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="d" scale="20" result="w"/><feFlood flood-color="${c}"/><feComposite in2="w" operator="in" result="aura"/><feGaussianBlur in="aura" stdDeviation="3" result="ab"/><feMerge><feMergeNode in="ab"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g filter="url(#${id}f)">${rig}</g></svg>`;
  }
  return `<svg class="beast mode-${B.mode}" viewBox="-20 -30 440 300" aria-hidden="true">
    <defs>
      <linearGradient id="${id}g" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="${c}"/><stop offset="1" stop-color="${new THREE.Color(color).multiplyScalar(0.35).getStyle()}"/>
      </linearGradient>
    </defs>
    ${B.mode === 'fly' ? `<g class="bw-back-wrap">${wings.split('</g>')[0]}</g></g>` : ''}
    <filter id="${id}f" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3"><animate attributeName="baseFrequency" dur="0.6s" values="0.03;0.05;0.03" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" scale="22"/><feGaussianBlur stdDeviation="2"/></filter>
    <g class="baura" filter="url(#${id}f)"><path d="${B.body}" fill="none" stroke="${c}" stroke-width="16" stroke-linejoin="round" opacity="0.75"/><path d="${B.body}" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round" opacity="0.6"/></g>
    <g class="bb">${body()}<path d="${B.detail || ''}" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2.2" stroke-linecap="round"/>${eyes}</g>
    ${B.mode === 'fly' ? wings.slice(wings.indexOf('<g class="bw"')) : ''}
  </svg>`;
}
