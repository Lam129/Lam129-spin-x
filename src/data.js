'use strict';
/* ============================== DATA ============================== */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TYPES = {
  atk: { name: '攻擊型', color: 0xff4141, css: 'var(--atk)', desc: '衝刺快、撞擊力強，擅長把對手撞出場外。' },
  def: { name: '防禦型', color: 0x3d8bff, css: 'var(--def)', desc: '重心穩、承受衝擊，守住中央等對手力竭。' },
  sta: { name: '持久型', color: 0x2fd27a, css: 'var(--sta)', desc: '摩擦小、轉得久，靠旋轉終結取勝。' },
  bal: { name: '平衡型', color: 0xf6c632, css: 'var(--bal)', desc: '攻守兼備，可依發射角度改變戰術。' },
};
const RARITY = {
  common: { name: '普通', w: 62 },
  rare: { name: '稀有', w: 29 },
  sr: { name: '超稀有', w: 9 },
};

/* Blades: shape drives the procedural outline. recoil = how hard contact points bounce. */
const BLADES = [
  { id: 'wolf', name: '蒼狼裂爪', glyph: '狼', type: 'atk', rarity: 'common', atk: 60, def: 28, sta: 26, wt: 33.0, recoil: 1.15,
    shape: { kind: 'fang', n: 3, base: 0.31, amp: 0.13 }, metal: 0xc9d3e6, plastic: 0x2a6bff, accent: 0x9fd0ff,
    desc: '三片前傾的爪刃，衝撞瞬間能咬住對手邊緣。適合新手學習攻擊型的打法。' },
  { id: 'thunder', name: '雷霆斬鋒', glyph: '雷', type: 'atk', rarity: 'rare', atk: 72, def: 30, sta: 28, wt: 35.2, recoil: 1.2,
    shape: { kind: 'saw', n: 6, base: 0.33, amp: 0.11 }, metal: 0xe8e2c8, plastic: 0xffc21a, accent: 0xfff1a8,
    desc: '六道鋸齒狀的刃口連續打擊，衝刺時會擦出大量火花。' },
  { id: 'flame', name: '烈焰龍牙', glyph: '龍', type: 'atk', rarity: 'sr', atk: 86, def: 34, sta: 28, wt: 37.4, recoil: 1.3,
    shape: { kind: 'fang', n: 3, base: 0.3, amp: 0.16 }, metal: 0xf1d7c4, plastic: 0xe0221b, accent: 0xffb070,
    desc: '巨大的三枚龍牙刃，撞擊面積大、角度銳利。頂級的擊飛專用戰刃。' },
  { id: 'silver', name: '白銀守衛', glyph: '衛', type: 'def', rarity: 'common', atk: 30, def: 60, sta: 40, wt: 34.0, recoil: 0.75,
    shape: { kind: 'round', n: 6, base: 0.4, amp: 0.035 }, metal: 0xdfe5ee, plastic: 0x6a7a99, accent: 0xe6edf8,
    desc: '接近正圓的外緣能把衝擊分散掉，穩健的入門防禦戰刃。' },
  { id: 'turtle', name: '玄龜盾甲', glyph: '龜', type: 'def', rarity: 'rare', atk: 28, def: 72, sta: 44, wt: 37.0, recoil: 0.7,
    shape: { kind: 'hex', n: 6, base: 0.42, amp: 0 }, metal: 0xc4d7cf, plastic: 0x1f8a6a, accent: 0xa8f0d4,
    desc: '六角盾形外殼，重量集中在外圈，面對攻擊型也能紋風不動。' },
  { id: 'fortress', name: '鋼鐵堡壘', glyph: '堡', type: 'def', rarity: 'sr', atk: 36, def: 86, sta: 42, wt: 39.0, recoil: 0.65,
    shape: { kind: 'gear', n: 10, base: 0.39, amp: 0.05 }, metal: 0xbfc6d4, plastic: 0x23324f, accent: 0x8fb4ff,
    desc: '十座城垛構成的厚重外圈，是目前最重的戰刃。反彈極小。' },
  { id: 'moon', name: '月影輪舞', glyph: '月', type: 'sta', rarity: 'common', atk: 22, def: 36, sta: 62, wt: 32.0, recoil: 0.85,
    shape: { kind: 'wing', n: 2, base: 0.36, amp: 0.09 }, metal: 0xe6e6f6, plastic: 0x6b4bd8, accent: 0xd8c8ff,
    desc: '兩片平滑的月牙翼減少碰撞時的轉速損失，轉得又穩又久。' },
  { id: 'phantom', name: '幻影旋風', glyph: '影', type: 'sta', rarity: 'rare', atk: 25, def: 36, sta: 75, wt: 34.4, recoil: 0.8,
    shape: { kind: 'wing', n: 3, base: 0.37, amp: 0.08 }, metal: 0xd6f2f4, plastic: 0x13a8b8, accent: 0xa8faff,
    desc: '三片薄翼把重量推向外圈，旋轉慣性大，非常耐久。' },
  { id: 'phoenix', name: '赤鳳天翔', glyph: '鳳', type: 'bal', rarity: 'common', atk: 48, def: 46, sta: 48, wt: 34.0, recoil: 1.0,
    shape: { kind: 'star', n: 5, base: 0.35, amp: 0.1 }, metal: 0xf4e3cc, plastic: 0xff7a1a, accent: 0xffd28a,
    desc: '五枚羽刃均勻分布，攻防兼備，打法由發射角度決定。' },
  { id: 'darkstar', name: '暗星魔刃', glyph: '星', type: 'bal', rarity: 'sr', atk: 64, def: 58, sta: 56, wt: 36.4, recoil: 1.05,
    shape: { kind: 'hybrid', n: 4, base: 0.36, amp: 0.1 }, metal: 0xd0c4e6, plastic: 0x3a1a5e, accent: 0xff4fd8,
    desc: '一半利刃、一半圓弧的雙面設計，可以撞也可以守。高手愛用。' },
];

/* Ratchets: "prongs-height". burst = burst resistance multiplier. */
const RATCHETS = [
  { id: '3-60', prongs: 3, h: 60, rarity: 'common', burst: 1.0, atk: 6, def: 0, sta: 0, stab: 0.05, wt: 6.2, color: 0x2b2f3a, desc: '最基本的低重心固鎖輪，卡榫少，打擊力好但容易爆裂。' },
  { id: '4-60', prongs: 4, h: 60, rarity: 'common', burst: 1.15, atk: 2, def: 4, sta: 2, stab: 0.06, wt: 6.4, color: 0x30343f, desc: '四個卡榫，攻守平衡的標準選擇。' },
  { id: '5-60', prongs: 5, h: 60, rarity: 'common', burst: 1.3, atk: 0, def: 4, sta: 4, stab: 0.07, wt: 6.6, color: 0x343944, desc: '五個卡榫，抗爆裂能力明顯提升。' },
  { id: '3-80', prongs: 3, h: 80, rarity: 'rare', burst: 0.95, atk: 10, def: -2, sta: -2, stab: -0.05, wt: 6.6, color: 0x4a2b2b, desc: '高位固鎖輪，可以從上方打擊對手，但重心較高。' },
  { id: '5-70', prongs: 5, h: 70, rarity: 'rare', burst: 1.28, atk: 4, def: 4, sta: 3, stab: 0.02, wt: 6.7, color: 0x2b3a4a, desc: '中高度的五卡榫，泛用性極高。' },
  { id: '9-60', prongs: 9, h: 60, rarity: 'sr', burst: 1.75, atk: -2, def: 8, sta: 5, stab: 0.08, wt: 7.0, color: 0x3d3420, desc: '九個細密卡榫，幾乎不會爆裂。防禦與持久型的最佳搭檔。' },
];

/* Bits: mob = how much it drives around, grip = rail gear grip for Xtreme dash, drain = stamina loss. */
const BITS = [
  { id: 'F', code: 'F', name: '平軸', rarity: 'common', type: 'atk', mob: 1.0, grip: 0.9, drain: 0.8, stab: 0.35, atk: 10, def: -4, sta: -8, dash: 78, wt: 2.0, tip: 'flat', color: 0xd9dde6, desc: '平面的大接觸面，移動劇烈，咬住軌道就能極限衝刺。' },
  { id: 'R', code: 'R', name: '突擊軸', rarity: 'rare', type: 'atk', mob: 0.85, grip: 1.0, drain: 0.8, stab: 0.5, atk: 9, def: 0, sta: -4, dash: 84, wt: 2.1, tip: 'rush', color: 0xffa23a, desc: '星形平底兼顧抓地與控制，衝刺最穩定。' },
  { id: 'RF', code: 'RF', name: '橡膠平軸', rarity: 'sr', type: 'atk', mob: 1.2, grip: 1.25, drain: 1.1, stab: 0.3, atk: 15, def: -6, sta: -12, dash: 96, wt: 2.2, tip: 'rubber', color: 0x2a2a2e, desc: '橡膠材質抓地力爆表，衝刺速度最快，但轉速掉得也快。' },
  { id: 'T', code: 'T', name: '錐軸', rarity: 'common', type: 'bal', mob: 0.45, grip: 0.5, drain: 0.82, stab: 0.7, atk: 2, def: 3, sta: 3, dash: 46, wt: 2.0, tip: 'taper', color: 0x9fb7d9, desc: '前端收細的平頭，可攻可守的萬用軸心。' },
  { id: 'P', code: 'P', name: '點軸', rarity: 'rare', type: 'bal', mob: 0.58, grip: 0.62, drain: 0.9, stab: 0.72, atk: 4, def: 3, sta: 2, dash: 56, wt: 2.0, tip: 'point', color: 0xf6c632, desc: '尖端帶有小平面，平時穩定，傾斜時才會加速移動。' },
  { id: 'B', code: 'B', name: '球軸', rarity: 'common', type: 'sta', mob: 0.22, grip: 0.18, drain: 0.72, stab: 0.86, atk: -6, def: 2, sta: 12, dash: 14, wt: 2.1, tip: 'ball', color: 0x7cf0b0, desc: '圓球狀前端，摩擦小，能在中央長時間旋轉。' },
  { id: 'N', code: 'N', name: '尖軸', rarity: 'common', type: 'def', mob: 0.1, grip: 0.05, drain: 0.66, stab: 0.9, atk: -8, def: 8, sta: 10, dash: 4, wt: 1.9, tip: 'needle', color: 0xbfc6d4, desc: '針狀前端幾乎不移動，牢牢守住中央。' },
  { id: 'HN', code: 'HN', name: '高針軸', rarity: 'rare', type: 'def', mob: 0.15, grip: 0.08, drain: 0.74, stab: 0.84, atk: -4, def: 11, sta: 7, dash: 7, wt: 2.3, tip: 'hneedle', color: 0x8fb4ff, desc: '加高的針軸，讓戰刃的打擊點提高，專門對付低位攻擊。' },
];
const BLADE = Object.fromEntries(BLADES.map((b) => [b.id, b]));
const RATCHET = Object.fromEntries(RATCHETS.map((b) => [b.id, b]));
const BIT = Object.fromEntries(BITS.map((b) => [b.id, b]));
const KINDS = {
  blade: { name: '戰刃', list: BLADES, map: BLADE, key: 'b' },
  ratchet: { name: '固鎖輪', list: RATCHETS, map: RATCHET, key: 'r' },
  bit: { name: '軸心', list: BITS, map: BIT, key: 't' },
};

const STARTERS = {
  atk: { b: 'wolf', r: '3-60', t: 'F' },
  def: { b: 'silver', r: '5-60', t: 'N' },
  sta: { b: 'moon', r: '5-60', t: 'B' },
  bal: { b: 'phoenix', r: '4-60', t: 'T' },
};

const OPPONENTS = [
  { id: 'o1', name: '阿哲', title: '見習刀鋒', type: 'bal', deck: [['phoenix', '4-60', 'T'], ['moon', '5-60', 'B'], ['wolf', '3-60', 'F']], pow: [0.45, 0.7], smart: 0.25, reward: 120 },
  { id: 'o2', name: '小晴', title: '月下舞者', type: 'sta', deck: [['moon', '5-60', 'B'], ['silver', '4-60', 'N'], ['phoenix', '3-60', 'T']], pow: [0.5, 0.75], smart: 0.4, reward: 150 },
  { id: 'o3', name: '鐵拳・剛', title: '不動要塞', type: 'def', deck: [['turtle', '5-60', 'N'], ['silver', '4-60', 'P'], ['moon', '3-60', 'B']], pow: [0.55, 0.8], smart: 0.5, reward: 180 },
  { id: 'o4', name: '疾風・凜', title: '疾風迅雷', type: 'atk', deck: [['thunder', '3-60', 'R'], ['wolf', '4-60', 'F'], ['phoenix', '5-60', 'T']], pow: [0.6, 0.86], smart: 0.6, reward: 220 },
  { id: 'o5', name: '星羅', title: '雙子星', type: 'bal', deck: [['darkstar', '5-70', 'P'], ['phantom', '4-60', 'B'], ['thunder', '3-80', 'F']], pow: [0.66, 0.9], smart: 0.7, reward: 260 },
  { id: 'o6', name: '雪乃', title: '冰之女王', type: 'sta', deck: [['phantom', '9-60', 'B'], ['turtle', '5-60', 'HN'], ['darkstar', '4-60', 'T']], pow: [0.72, 0.93], smart: 0.8, reward: 300 },
  { id: 'o7', name: '獅堂', title: '狂嵐之王', type: 'atk', deck: [['flame', '3-60', 'RF'], ['thunder', '3-80', 'R'], ['fortress', '9-60', 'N']], pow: [0.78, 0.96], smart: 0.88, reward: 360 },
  { id: 'o8', name: '黑曜', title: '極限王者', type: 'bal', deck: [['darkstar', '9-60', 'P'], ['flame', '3-60', 'RF'], ['fortress', '5-70', 'HN']], pow: [0.85, 1.0], smart: 0.95, reward: 500 },
];

const FINISH = {
  spin: { name: '旋轉終結', en: 'SPIN FINISH', pts: 1 },
  over: { name: '擊飛終結', en: 'OVER FINISH', pts: 2 },
  burst: { name: '爆裂終結', en: 'BURST FINISH', pts: 2 },
  xtreme: { name: '極限終結', en: 'XTREME FINISH', pts: 3 },
};
const WIN_POINTS = 4;

function beyStats(cfg) {
  const B = BLADE[cfg.b], R = RATCHET[cfg.r], T = BIT[cfg.t];
  return {
    atk: clamp(Math.round(B.atk + R.atk + T.atk), 0, 100),
    def: clamp(Math.round(B.def + R.def + T.def), 0, 100),
    sta: clamp(Math.round(B.sta + R.sta + T.sta), 0, 100),
    dash: T.dash,
    burst: clamp(Math.round(R.burst * 52), 0, 100),
    weight: +(B.wt + R.wt + T.wt).toFixed(1),
    type: B.type,
  };
}
function beyName(cfg) { return BLADE[cfg.b].name; }
function beyCode(cfg) { return `${cfg.r}${BIT[cfg.t].code}`; }

/* Signature moves (original). kind drives physics; fx drives visuals. */
const SPECIALS = {
  wolf:     { name: '蒼狼・裂空連爪', kind: 'rush',    fx: 'wind',    color: 0x5fb4ff, dur: 4.5, desc: '化身疾風，連續衝刺撕裂對手。衝刺力與追擊能力大幅提升。' },
  thunder:  { name: '雷霆・萬雷轟擊', kind: 'rush',    fx: 'thunder', color: 0xfff06a, dur: 4.0, desc: '雷光纏身的高速突擊，撞擊時放出落雷，撞擊力提升。' },
  flame:    { name: '烈焰・龍牙崩擊', kind: 'rush',    fx: 'fire',    color: 0xff4a1a, dur: 4.5, desc: '燃起龍炎，以最高速度衝撞。下一次撞擊威力倍增。' },
  silver:   { name: '白銀・不落結界', kind: 'guard',   fx: 'steel',   color: 0xdfe8ff, dur: 6.0, desc: '展開銀色護盾，大幅減少被撞飛的距離並修復固鎖輪。' },
  turtle:   { name: '玄龜・磐石甲陣', kind: 'guard',   fx: 'water',   color: 0x3fe0b0, dur: 6.5, desc: '六角水盾環繞，重量感倍增，幾乎不會被撞動。' },
  fortress: { name: '鋼鐵・絕對城壁', kind: 'guard',   fx: 'steel',   color: 0x8fb4ff, dur: 7.0, desc: '升起鋼鐵城壁，承受一切衝擊，固鎖輪大幅修復。' },
  moon:     { name: '月影・無盡輪舞', kind: 'regen',   fx: 'moon',    color: 0xc0a0ff, dur: 6.0, desc: '吸收月光回復轉速，之後一段時間轉速幾乎不會下降。' },
  phantom:  { name: '幻影・旋風迴天', kind: 'regen',   fx: 'wind',    color: 0x7af6ff, dur: 6.0, desc: '捲起旋風重新加速，並大幅減少摩擦損耗。' },
  phoenix:  { name: '赤鳳・浴火重生', kind: 'counter', fx: 'phoenix', color: 0xffa030, dur: 5.5, desc: '鳳凰之火回復少量轉速，並把受到的撞擊反彈給對手。' },
  darkstar: { name: '暗星・黑洞引力', kind: 'gravity', fx: 'dark',    color: 0xc04cff, dur: 4.5, desc: '製造引力場把對手拉近，並以反擊姿態迎擊。' },
};
const SPECIAL_KIND = { rush: '突擊強化', guard: '防禦強化', regen: '轉速回復', counter: '反擊', gravity: '引力反擊' };
