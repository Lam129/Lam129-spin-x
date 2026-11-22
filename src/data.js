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
  common: { name: '普通', w: 55 },
  rare: { name: '稀有', w: 30 },
  sr: { name: '超稀有', w: 12 },
  ur: { name: '傳說', w: 3 },
};
const RARITY_ORDER = ['common', 'rare', 'sr', 'ur'];

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
    desc: '巨大的三枚龍牙刃，撞擊面積大、角度銳利。頂級的擊出專用鋒輪。' },
  { id: 'silver', name: '白銀守衛', glyph: '衛', type: 'def', rarity: 'common', atk: 30, def: 60, sta: 40, wt: 34.0, recoil: 0.75,
    shape: { kind: 'round', n: 6, base: 0.4, amp: 0.035 }, metal: 0xdfe5ee, plastic: 0x6a7a99, accent: 0xe6edf8,
    desc: '接近正圓的外緣能把衝擊分散掉，穩健的入門防禦鋒輪。' },
  { id: 'turtle', name: '玄龜盾甲', glyph: '龜', type: 'def', rarity: 'rare', atk: 28, def: 72, sta: 44, wt: 37.0, recoil: 0.7,
    shape: { kind: 'hex', n: 6, base: 0.42, amp: 0 }, metal: 0xc4d7cf, plastic: 0x1f8a6a, accent: 0xa8f0d4,
    desc: '六角盾形外殼，重量集中在外圈，面對攻擊型也能紋風不動。' },
  { id: 'fortress', name: '鋼鐵堡壘', glyph: '堡', type: 'def', rarity: 'sr', atk: 36, def: 86, sta: 42, wt: 39.0, recoil: 0.65,
    shape: { kind: 'gear', n: 10, base: 0.39, amp: 0.05 }, metal: 0xbfc6d4, plastic: 0x23324f, accent: 0x8fb4ff,
    desc: '十座城垛構成的厚重外圈，是目前最重的鋒輪。反彈極小。' },
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
  { id: 'shark', name: '怒鯊斬浪', glyph: '鯊', type: 'atk', rarity: 'rare', atk: 74, def: 30, sta: 24, wt: 35.6, recoil: 1.22,
    shape: { kind: 'fang', n: 4, base: 0.32, amp: 0.12 }, metal: 0xc6d8e8, plastic: 0x1d4f8a, accent: 0x7fe0ff,
    desc: '四枚背鰭狀的斬刃，像浪頭一樣連續撞擊。' },
  { id: 'hawk', name: '鷹隼穿雲', glyph: '鷹', type: 'atk', rarity: 'common', atk: 62, def: 26, sta: 30, wt: 33.4, recoil: 1.12,
    shape: { kind: 'saw', n: 3, base: 0.33, amp: 0.12 }, metal: 0xe6dccb, plastic: 0x8a5a2b, accent: 0xffd08a,
    desc: '三片斜掠的翼刃，從斜上方切入對手。' },
  { id: 'scorpion', name: '毒蠍尾鉤', glyph: '蠍', type: 'atk', rarity: 'sr', atk: 88, def: 30, sta: 26, wt: 37.0, recoil: 1.35,
    shape: { kind: 'fang', n: 2, base: 0.31, amp: 0.17 }, metal: 0xd9e6c8, plastic: 0x3a5a12, accent: 0xb8ff4a,
    desc: '兩枚巨大的鉤刃，命中時的反彈力是所有鋒輪中最大的。' },
  { id: 'rhino', name: '犀甲衝角', glyph: '犀', type: 'def', rarity: 'common', atk: 34, def: 62, sta: 36, wt: 35.0, recoil: 0.78,
    shape: { kind: 'round', n: 4, base: 0.39, amp: 0.05 }, metal: 0xcfc8bf, plastic: 0x5a4a3a, accent: 0xffc890,
    desc: '四塊厚甲板組成的外圈，正面有微微隆起的衝角。' },
  { id: 'crab', name: '巨蟹鉗盾', glyph: '蟹', type: 'def', rarity: 'rare', atk: 38, def: 74, sta: 38, wt: 37.4, recoil: 0.7,
    shape: { kind: 'gear', n: 6, base: 0.39, amp: 0.06 }, metal: 0xe8cfc0, plastic: 0xb2361f, accent: 0xffa080,
    desc: '六座鉗狀凸起，擋住衝擊之後還能反推回去。' },
  { id: 'crane', name: '白鶴雲翼', glyph: '鶴', type: 'sta', rarity: 'common', atk: 20, def: 34, sta: 64, wt: 32.4, recoil: 0.82,
    shape: { kind: 'wing', n: 4, base: 0.37, amp: 0.07 }, metal: 0xf2f2f6, plastic: 0xd0d6e4, accent: 0xff5a5a,
    desc: '四片輕薄的雲翼，旋轉時幾乎沒有空氣阻力。' },
  { id: 'owl', name: '夜梟靜羽', glyph: '梟', type: 'sta', rarity: 'rare', atk: 24, def: 40, sta: 72, wt: 34.8, recoil: 0.8,
    shape: { kind: 'wing', n: 2, base: 0.38, amp: 0.1 }, metal: 0xc9c2d8, plastic: 0x2e2a4a, accent: 0xffd84a,
    desc: '兩片寬大的羽翼把重量推到最外緣，轉得又穩又安靜。' },
  { id: 'jelly', name: '星海水母', glyph: '海', type: 'sta', rarity: 'sr', atk: 22, def: 42, sta: 84, wt: 35.8, recoil: 0.75,
    shape: { kind: 'round', n: 8, base: 0.41, amp: 0.025 }, metal: 0xd8f0f6, plastic: 0x2a7ab8, accent: 0xff8ad8,
    desc: '八道柔和的波紋外緣，碰撞時幾乎不損失轉速。' },
  { id: 'tiger', name: '猛虎雙牙', glyph: '虎', type: 'bal', rarity: 'rare', atk: 58, def: 52, sta: 50, wt: 35.4, recoil: 1.02,
    shape: { kind: 'hybrid', n: 2, base: 0.36, amp: 0.11 }, metal: 0xf0dcb0, plastic: 0xd87a10, accent: 0x2a1a0a,
    desc: '一枚利牙配一面厚盾，可以進攻也可以硬接。' },
  { id: 'mantis', name: '螳螂雙鐮', glyph: '螳', type: 'bal', rarity: 'common', atk: 50, def: 44, sta: 50, wt: 33.8, recoil: 0.98,
    shape: { kind: 'star', n: 4, base: 0.35, amp: 0.09 }, metal: 0xd8ecd0, plastic: 0x3a9a3a, accent: 0xe8ff7a,
    desc: '四枚鐮刃均勻分布，動作靈活的入門平衡型。' },
  { id: 'viper', name: '赤蛇迅牙', glyph: '蛇', type: 'atk', rarity: 'common', atk: 61, def: 27, sta: 29, wt: 33.2, recoil: 1.14,
    shape: { kind: 'fang', n: 5, base: 0.33, amp: 0.1 }, metal: 0xd8e0c8, plastic: 0x2a7a2a, accent: 0xd8ff5a,
    desc: '五枚細長的蛇牙刃，連續撞擊讓對手來不及反應。' },
  { id: 'falcon', name: '隼翼裂風', glyph: '隼', type: 'atk', rarity: 'rare', atk: 73, def: 28, sta: 30, wt: 35.0, recoil: 1.2,
    shape: { kind: 'saw', n: 4, base: 0.33, amp: 0.12 }, metal: 0xe8e8f0, plastic: 0x3a4a8a, accent: 0x8ad8ff,
    desc: '四片斜削的翼刃，從斜角切入時威力最強。' },
  { id: 'bull', name: '狂牛重角', glyph: '牛', type: 'atk', rarity: 'sr', atk: 87, def: 36, sta: 24, wt: 38.0, recoil: 1.32,
    shape: { kind: 'hybrid', n: 2, base: 0.34, amp: 0.14 }, metal: 0xf0d8c8, plastic: 0x8a2a10, accent: 0xffb070,
    desc: '一對巨大的衝角，正面撞上時幾乎無人能擋。' },
  { id: 'golem', name: '岩魔磐石', glyph: '岩', type: 'def', rarity: 'common', atk: 30, def: 63, sta: 38, wt: 35.4, recoil: 0.72,
    shape: { kind: 'hex', n: 8, base: 0.41, amp: 0 }, metal: 0xc8c0b0, plastic: 0x5a5048, accent: 0xffa040,
    desc: '八角形的岩石外殼，穩穩擋下正面衝擊。' },
  { id: 'beetle', name: '甲蟲重盾', glyph: '甲', type: 'def', rarity: 'rare', atk: 36, def: 75, sta: 40, wt: 37.6, recoil: 0.68,
    shape: { kind: 'gear', n: 8, base: 0.38, amp: 0.06 }, metal: 0xc0d0c8, plastic: 0x1a4a3a, accent: 0x6affb0,
    desc: '八片甲殼交疊，越撞越堅固。' },
  { id: 'dragonfly', name: '蜻蜓薄翼', glyph: '蜓', type: 'sta', rarity: 'common', atk: 21, def: 35, sta: 64, wt: 32.2, recoil: 0.82,
    shape: { kind: 'wing', n: 6, base: 0.37, amp: 0.06 }, metal: 0xe8f4f0, plastic: 0x2a9a8a, accent: 0xb8fff0,
    desc: '六片輕薄的翅翼，旋轉時幾乎沒有阻力。' },
  { id: 'lotus', name: '青蓮靜輪', glyph: '蓮', type: 'sta', rarity: 'rare', atk: 23, def: 40, sta: 76, wt: 35.0, recoil: 0.76,
    shape: { kind: 'round', n: 12, base: 0.4, amp: 0.02 }, metal: 0xf0e8f4, plastic: 0x8a4ab8, accent: 0xffd8f0,
    desc: '十二瓣的蓮花外緣，平穩得像靜止一樣。' },
  { id: 'kirin', name: '麒麟天角', glyph: '麟', type: 'bal', rarity: 'sr', atk: 62, def: 60, sta: 58, wt: 36.6, recoil: 1.02,
    shape: { kind: 'star', n: 6, base: 0.35, amp: 0.1 }, metal: 0xfff0c8, plastic: 0x2a6aa8, accent: 0xffe060,
    desc: '六道天角均勻展開，攻守兼備的頂級平衡型。' },
  { id: 'fox', name: '九尾幻狐', glyph: '狐', type: 'bal', rarity: 'rare', atk: 56, def: 50, sta: 54, wt: 34.8, recoil: 1.0,
    shape: { kind: 'star', n: 9, base: 0.34, amp: 0.08 }, metal: 0xfff0e0, plastic: 0xe86a2a, accent: 0xffffff,
    desc: '九枚尾狀刃，讓對手抓不準撞擊的時機。' },
  { id: 'raven', name: '黑鴉夜刃', glyph: '鴉', type: 'atk', rarity: 'rare', atk: 70, def: 30, sta: 32, wt: 34.6, recoil: 1.16,
    shape: { kind: 'fang', n: 6, base: 0.33, amp: 0.09 }, metal: 0xb8b8c8, plastic: 0x1a1a2a, accent: 0xc06aff,
    desc: '六片羽刃在夜色中劃出殘影。' },
];

/* 鎖芯 (lock core): code = C<claws><height L/M/H>. burst = burst resistance multiplier. Internal ids kept for saves. */
const HCODE = { 60: 'L', 70: 'M', 80: 'H' };
const RATCHETS = [
  { id: '3-60', prongs: 3, h: 60, rarity: 'common', burst: 1.0, atk: 6, def: 0, sta: 0, stab: 0.05, wt: 6.2, color: 0x2b2f3a, desc: '三爪低位鎖芯，打擊力好但容易被撞到解體。' },
  { id: '4-60', prongs: 4, h: 60, rarity: 'common', burst: 1.15, atk: 2, def: 4, sta: 2, stab: 0.06, wt: 6.4, color: 0x30343f, desc: '四爪低位鎖芯，攻守平衡的標準選擇。' },
  { id: '5-60', prongs: 5, h: 60, rarity: 'common', burst: 1.3, atk: 0, def: 4, sta: 4, stab: 0.07, wt: 6.6, color: 0x343944, desc: '五爪低位鎖芯，抗解體能力明顯提升。' },
  { id: '3-80', prongs: 3, h: 80, rarity: 'rare', burst: 0.95, atk: 10, def: -2, sta: -2, stab: -0.05, wt: 6.6, color: 0x4a2b2b, desc: '三爪高位鎖芯，可以從上方打擊對手，但重心較高。' },
  { id: '5-70', prongs: 5, h: 70, rarity: 'rare', burst: 1.28, atk: 4, def: 4, sta: 3, stab: 0.02, wt: 6.7, color: 0x2b3a4a, desc: '五爪中位鎖芯，泛用性極高。' },
  { id: '9-60', prongs: 9, h: 60, rarity: 'sr', burst: 1.75, atk: -2, def: 8, sta: 5, stab: 0.08, wt: 7.0, color: 0x3d3420, desc: '九爪低位鎖芯，細密的爪幾乎不會鬆脫。' },
  { id: '1-60', prongs: 1, h: 60, rarity: 'rare', burst: 0.85, atk: 12, def: -2, sta: -1, stab: 0.04, wt: 6.0, color: 0x5a1e1e, desc: '只有一爪的超輕量鎖芯，撞擊力最強，風險也最大。' },
  { id: '4-70', prongs: 4, h: 70, rarity: 'common', burst: 1.12, atk: 4, def: 2, sta: 1, stab: 0.02, wt: 6.5, color: 0x2e3b2e, desc: '四爪中位鎖芯，打擊點稍高，適合和防禦型硬碰。' },
  { id: '6-60', prongs: 6, h: 60, rarity: 'rare', burst: 1.45, atk: 0, def: 5, sta: 5, stab: 0.07, wt: 6.8, color: 0x3a2e4a, desc: '六爪低位鎖芯，持久型愛用的穩定款。' },
  { id: '7-60', prongs: 7, h: 60, rarity: 'sr', burst: 1.58, atk: 2, def: 6, sta: 4, stab: 0.07, wt: 6.9, color: 0x1e3a4a, desc: '七爪低位鎖芯，在抗解體和攻擊力之間取得平衡。' },
  { id: '4-80', prongs: 4, h: 80, rarity: 'rare', burst: 1.08, atk: 8, def: 0, sta: -2, stab: -0.04, wt: 6.8, color: 0x4a3a1e, desc: '四爪高位鎖芯，專門從上方壓制低矮的對手。' },
  { id: '6-70', prongs: 6, h: 70, rarity: 'common', burst: 1.4, atk: 2, def: 4, sta: 3, stab: 0.03, wt: 6.9, color: 0x2e2e3a, desc: '六爪中位鎖芯，什麼組合都能搭的萬用款。' },
  { id: '2-60', prongs: 2, h: 60, rarity: 'common', burst: 0.92, atk: 9, def: -1, sta: 0, stab: 0.05, wt: 6.1, color: 0x3a2a2a, desc: '兩爪低位鎖芯，輕巧又有爆發力。' },
  { id: '8-60', prongs: 8, h: 60, rarity: 'sr', burst: 1.65, atk: 0, def: 7, sta: 5, stab: 0.08, wt: 7.0, color: 0x2a3a3a, desc: '八爪低位鎖芯，抗解體能力僅次於九爪。' },
  { id: '3-70', prongs: 3, h: 70, rarity: 'common', burst: 0.98, atk: 8, def: 0, sta: -1, stab: 0.0, wt: 6.4, color: 0x3a3022, desc: '三爪中位鎖芯，打擊點稍高的攻擊款。' },
  { id: '7-70', prongs: 7, h: 70, rarity: 'rare', burst: 1.52, atk: 2, def: 5, sta: 4, stab: 0.03, wt: 6.9, color: 0x22303a, desc: '七爪中位鎖芯，穩定又耐打。' },
  { id: '9-70', prongs: 9, h: 70, rarity: 'rare', burst: 1.7, atk: -1, def: 7, sta: 4, stab: 0.02, wt: 7.1, color: 0x30223a, desc: '九爪中位鎖芯，給高針、高錐用的防禦款。' },
  { id: '5-80', prongs: 5, h: 80, rarity: 'rare', burst: 1.22, atk: 7, def: 2, sta: -1, stab: -0.04, wt: 6.9, color: 0x3a2236, desc: '五爪高位鎖芯，高位打擊也不容易解體。' },
];
RATCHETS.forEach((r) => (r.code = `C${r.prongs}${HCODE[r.h]}`));

/* 旋尖 (tip): mob = how much it drives around, grip = rail gear grip for rail drive, drain = spin loss. */
const BITS = [
  { id: 'F', code: 'BW', name: '破風', rarity: 'common', type: 'atk', mob: 1.0, grip: 0.9, drain: 0.8, stab: 0.35, atk: 10, def: -4, sta: -8, dash: 78, wt: 2.0, tip: 'flat', color: 0xd9dde6, desc: '大面積的平底，移動劇烈，咬住軌道就能高速驅衝。' },
  { id: 'R', code: 'SR', name: '星突', rarity: 'rare', type: 'atk', mob: 0.85, grip: 1.0, drain: 0.8, stab: 0.5, atk: 9, def: 0, sta: -4, dash: 84, wt: 2.1, tip: 'rush', color: 0xffa23a, desc: '星形平底兼顧抓地與控制，驅衝最穩定。' },
  { id: 'RF', code: 'GC', name: '膠爪', rarity: 'sr', type: 'atk', mob: 1.2, grip: 1.25, drain: 1.1, stab: 0.3, atk: 15, def: -6, sta: -12, dash: 96, wt: 2.2, tip: 'rubber', color: 0x2a2a2e, desc: '橡膠底抓地力爆表，驅衝最快，但轉速掉得也快。' },
  { id: 'T', code: 'CN', name: '錐鋒', rarity: 'common', type: 'bal', mob: 0.45, grip: 0.5, drain: 0.82, stab: 0.7, atk: 2, def: 3, sta: 3, dash: 46, wt: 2.0, tip: 'taper', color: 0x9fb7d9, desc: '前端收細的平頭，可攻可守的萬用旋尖。' },
  { id: 'P', code: 'PB', name: '點衡', rarity: 'rare', type: 'bal', mob: 0.58, grip: 0.62, drain: 0.9, stab: 0.72, atk: 4, def: 3, sta: 2, dash: 56, wt: 2.0, tip: 'point', color: 0xf6c632, desc: '尖端帶有小平面，平時穩定，傾斜時才會加速。' },
  { id: 'B', code: 'RD', name: '圓舞', rarity: 'common', type: 'sta', mob: 0.22, grip: 0.18, drain: 0.72, stab: 0.86, atk: -6, def: 2, sta: 12, dash: 14, wt: 2.1, tip: 'ball', color: 0x7cf0b0, desc: '圓球狀前端，摩擦小，能在中央長時間旋轉。' },
  { id: 'N', code: 'PN', name: '定針', rarity: 'common', type: 'def', mob: 0.1, grip: 0.05, drain: 0.66, stab: 0.9, atk: -8, def: 8, sta: 10, dash: 4, wt: 1.9, tip: 'needle', color: 0xbfc6d4, desc: '針狀前端幾乎不移動，牢牢守住中央。' },
  { id: 'HN', code: 'HP', name: '高針', rarity: 'rare', type: 'def', mob: 0.15, grip: 0.08, drain: 0.74, stab: 0.84, atk: -4, def: 11, sta: 7, dash: 7, wt: 2.3, tip: 'hneedle', color: 0x8fb4ff, desc: '加高的針尖，讓鋒輪的打擊點提高，專門對付低位攻擊。' },
  { id: 'LF', code: 'LB', name: '低伏', rarity: 'rare', type: 'atk', mob: 1.08, grip: 1.05, drain: 0.9, stab: 0.38, atk: 12, def: -5, sta: -9, dash: 86, wt: 1.9, tip: 'lowflat', color: 0xff5a5a, desc: '壓低重心的平底，從下方鏟起對手。' },
  { id: 'A', code: 'AC', name: '加速', rarity: 'sr', type: 'atk', mob: 0.95, grip: 1.15, drain: 0.86, stab: 0.48, atk: 12, def: -2, sta: -5, dash: 92, wt: 2.2, tip: 'accel', color: 0x36d3ff, desc: '雙層齒圈的平底，驅衝時加速最猛又不容易失控。' },
  { id: 'GB', code: 'GR', name: '齒圓', rarity: 'rare', type: 'bal', mob: 0.38, grip: 0.58, drain: 0.78, stab: 0.78, atk: 0, def: 3, sta: 7, dash: 50, wt: 2.2, tip: 'ball', color: 0xc6a0ff, desc: '帶齒圈的球形旋尖，平時守中央，碰到軌道也能驅衝。' },
  { id: 'O', code: 'DK', name: '盤旋', rarity: 'common', type: 'sta', mob: 0.3, grip: 0.14, drain: 0.64, stab: 0.82, atk: -5, def: 4, sta: 11, dash: 12, wt: 2.3, tip: 'orb', color: 0xe8e0c8, desc: '寬大的圓盤底，即使傾斜也能繼續轉。' },
  { id: 'GN', code: 'GP', name: '齒針', rarity: 'rare', type: 'def', mob: 0.2, grip: 0.5, drain: 0.7, stab: 0.86, atk: -4, def: 9, sta: 7, dash: 40, wt: 2.1, tip: 'needle', color: 0x9adfc0, desc: '針尖加上齒圈，被撞到外圈時能靠驅衝回到中央。' },
  { id: 'HT', code: 'HC', name: '高錐', rarity: 'common', type: 'bal', mob: 0.5, grip: 0.55, drain: 0.85, stab: 0.66, atk: 4, def: 4, sta: 1, dash: 50, wt: 2.2, tip: 'htaper', color: 0xb8c8e0, desc: '加高的錐鋒，打擊點高，適合對付高位的對手。' },
  { id: 'C', code: 'CO', name: '錐突', rarity: 'rare', type: 'atk', mob: 0.9, grip: 0.85, drain: 0.86, stab: 0.45, atk: 10, def: -3, sta: -4, dash: 80, wt: 2.0, tip: 'cone', color: 0xff8a4a, desc: '尖錐狀的攻擊旋尖，轉向靈活。' },
  { id: 'D', code: 'DM', name: '圓頂', rarity: 'common', type: 'sta', mob: 0.24, grip: 0.15, drain: 0.66, stab: 0.86, atk: -6, def: 3, sta: 12, dash: 12, wt: 2.2, tip: 'dome', color: 0xd8c8f8, desc: '大圓頂底，傾斜時依然轉得平穩。' },
  { id: 'Q', code: 'QR', name: '環刃', rarity: 'rare', type: 'bal', mob: 0.55, grip: 0.7, drain: 0.86, stab: 0.68, atk: 5, def: 2, sta: 2, dash: 60, wt: 2.2, tip: 'ring', color: 0x6ad8ff, desc: '環狀接地面，攻守切換自如。' },
  { id: 'W', code: 'WD', name: '寬平', rarity: 'common', type: 'atk', mob: 1.05, grip: 0.95, drain: 0.95, stab: 0.32, atk: 11, def: -5, sta: -9, dash: 82, wt: 2.1, tip: 'wideflat', color: 0xffd04a, desc: '超寬的平底，移動範圍最大。' },
  { id: 'S', code: 'SK', name: '尖錐', rarity: 'rare', type: 'def', mob: 0.12, grip: 0.3, drain: 0.68, stab: 0.9, atk: -6, def: 10, sta: 8, dash: 22, wt: 2.1, tip: 'spike', color: 0xa8b8c8, desc: '細長的尖錐守住中央，被撞開也能靠齒圈回位。' },
  { id: 'G', code: 'GA', name: '守衡', rarity: 'sr', type: 'bal', mob: 0.42, grip: 0.62, drain: 0.74, stab: 0.8, atk: 3, def: 6, sta: 6, dash: 52, wt: 2.3, tip: 'cup', color: 0xffe8a8, desc: '杯狀的旋尖，攻守持久都很平均。' },
];
/* ---- colourway series (original palettes): each base part gets variants with small stat shifts ---- */
const BLADE_VARIANTS = [
  { key: 'ob', name: '黑曜版', bump: 0, metal: 0x4a4a56, plastic: 0x18181f, accent: 0xff3a3a, d: { atk: 3, sta: -2 } },
  { key: 'pt', name: '白金版', bump: 1, metal: 0xf4f6fb, plastic: 0xe2e6ef, accent: 0x6ad8ff, d: { sta: 3, atk: -1 } },
  { key: 'rd', name: '赤焰版', bump: 1, metal: 0xffd2b0, plastic: 0xc81e10, accent: 0xffd040, d: { atk: 4, def: -2 } },
  { key: 'ic', name: '冰晶版', bump: 1, metal: 0xd8f4ff, plastic: 0x3a98d8, accent: 0xffffff, d: { def: 4, atk: -2 } },
  { key: 'nt', name: '暗夜版', bump: 1, metal: 0x8a7ab8, plastic: 0x2a1650, accent: 0xc06aff, d: { def: 2, sta: 2 } },
  { key: 'gd', name: '黃金限定', bump: 2, metal: 0xffd86a, plastic: 0xb88a10, accent: 0xfff6c0, d: { atk: 2, def: 2, sta: 2 } },
  { key: 'cr', name: '水晶限定', bump: 2, metal: 0xe0f8ff, plastic: 0x8fd0f8, accent: 0xff8ad8, d: { atk: 3, def: 3, sta: 3 } },
  { key: 'em', name: '翡翠版', bump: 1, metal: 0xc8f0d8, plastic: 0x18905a, accent: 0xa8ffcc, d: { sta: 2, def: 1 } },
  { key: 'sk', name: '櫻花版', bump: 1, metal: 0xffe4ee, plastic: 0xff7aa8, accent: 0xffffff, d: { sta: 2, atk: 1 } },
  { key: 'lv', name: '熔岩版', bump: 1, metal: 0x6a3a24, plastic: 0xff4a00, accent: 0xffd000, d: { atk: 3, sta: -1 } },
  { key: 'dp', name: '深海版', bump: 1, metal: 0x6a8ab0, plastic: 0x0a2a5a, accent: 0x3affe0, d: { def: 3, atk: -1 } },
  { key: 'cm', name: '迷彩版', bump: 0, metal: 0x8a8a6a, plastic: 0x4a5a2a, accent: 0xd0c080, d: { def: 2 } },
  { key: 'tl', name: '雷光版', bump: 1, metal: 0xfffad0, plastic: 0x2a2a3a, accent: 0xffe83a, d: { atk: 2, def: 1 } },
  { key: 'sy', name: '星空限定', bump: 2, metal: 0x9aa8ff, plastic: 0x14104a, accent: 0xffffff, d: { atk: 3, def: 2, sta: 2 } },
  { key: 'rb', name: '彩虹傳說', bump: 3, metal: 0xffffff, plastic: 0xff3aa0, accent: 0x3affff, d: { atk: 4, def: 4, sta: 4 } },
];
const PART_VARIANTS = [
  { key: 'ob', name: '黑曜', bump: 0, color: 0x15151a, d: { atk: 2 } },
  { key: 'gd', name: '金屬金', bump: 1, color: 0x9a7a18, d: { sta: 2 } },
  { key: 'cr', name: '透明', bump: 1, color: 0x6a8aa8, d: { def: 2 } },
  { key: 'rd', name: '赤紅', bump: 1, color: 0x7a1a14, d: { atk: 3, def: -1 } },
  { key: 'em', name: '翡翠', bump: 1, color: 0x18905a, d: { sta: 1, def: 1 } },
  { key: 'sk', name: '櫻花', bump: 1, color: 0xff7aa8, d: { sta: 2 } },
  { key: 'sy', name: '星空限定', bump: 2, color: 0x2a2470, d: { atk: 1, def: 1, sta: 1 } },
];
const RATCHET_ONLY_VARIANTS = [{ key: 'rb', name: '彩虹傳說', bump: 3, color: 0xd02a8a, d: { atk: 2, def: 2, sta: 2 } }];
const bumpRarity = (r, n) => RARITY_ORDER[Math.min(3, RARITY_ORDER.indexOf(r) + n)];
const addStats = (p, d) => { for (const k in d) p[k] = (p[k] || 0) + d[k]; return p; };
BLADES.forEach((b) => { b.base = b.id; b.series = '標準版'; });
RATCHETS.forEach((r) => { r.base = r.id; r.series = '標準'; });
BITS.forEach((t) => { t.base = t.id; t.series = '標準'; });
for (const b of BLADES.slice()) for (const v of BLADE_VARIANTS) BLADES.push(addStats({ ...b, id: `${b.id}@${v.key}`, base: b.id, series: v.name, name: `${b.name}・${v.name}`, rarity: bumpRarity(b.rarity, v.bump), metal: v.metal, plastic: v.plastic, accent: v.accent }, v.d));
for (const r of RATCHETS.slice()) for (const v of [...PART_VARIANTS, ...RATCHET_ONLY_VARIANTS]) RATCHETS.push(addStats({ ...r, id: `${r.id}@${v.key}`, base: r.id, series: v.name, code: r.code, rarity: bumpRarity(r.rarity, v.bump), color: v.color, burst: r.burst + (v.key === 'gd' ? 0.05 : 0) }, v.d));
for (const t of BITS.slice()) for (const v of PART_VARIANTS) BITS.push(addStats({ ...t, id: `${t.id}@${v.key}`, base: t.id, series: v.name, rarity: bumpRarity(t.rarity, v.bump), color: v.color === 0x15151a ? 0x2a2a32 : v.color, dash: t.dash + (v.key === 'rd' ? 4 : 0) }, v.d));
const baseOf = (id) => String(id).split('@')[0];
const specOf = (bladeId) => SPECIALS[baseOf(bladeId)];
const BLADE = Object.fromEntries(BLADES.map((b) => [b.id, b]));
const RATCHET = Object.fromEntries(RATCHETS.map((b) => [b.id, b]));
const BIT = Object.fromEntries(BITS.map((b) => [b.id, b]));
const KINDS = {
  blade: { name: '鋒輪', list: BLADES, map: BLADE, key: 'b' },
  ratchet: { name: '鎖芯', list: RATCHETS, map: RATCHET, key: 'r' },
  bit: { name: '旋尖', list: BITS, map: BIT, key: 't' },
};
/* display name of a part */
function partName(kind, p) { const sfx = p.base && p.base !== p.id ? `・${p.series}` : ''; return kind === 'ratchet' ? p.code + sfx : kind === 'bit' ? `${p.name} ${p.code}${sfx}` : p.name; }

// every starter pack: three common blades of the chosen type, with common ratchets and bits that suit it
const STARTER_PACKS = {
  // a deck may not repeat a part, so each top gets a different (common) ratchet and bit
  atk: [{ b: 'wolf', r: '3-60', t: 'F' }, { b: 'hawk', r: '4-60', t: 'W' }, { b: 'viper', r: '5-60', t: 'HT' }],
  def: [{ b: 'silver', r: '5-60', t: 'N' }, { b: 'golem', r: '4-60', t: 'D' }, { b: 'rhino', r: '3-60', t: 'T' }],
  sta: [{ b: 'moon', r: '5-60', t: 'B' }, { b: 'crane', r: '4-60', t: 'O' }, { b: 'dragonfly', r: '3-60', t: 'D' }],
  bal: [{ b: 'phoenix', r: '4-60', t: 'T' }, { b: 'mantis', r: '3-60', t: 'HT' }, { b: 'mantis@ob', r: '5-60', t: 'D' }],
};
const STARTERS = Object.fromEntries(Object.entries(STARTER_PACKS).map(([k, v]) => [k, v[0]]));

/* Stadiums: physics + look. pockets: kind 'rift' (3 pts) / 'out' (2 pts). */
const STADIUMS = {
  training: { name: '訓練競技盤', desc: '標準規格，適合練習。', K: 0.06, grav: 1, rail: 1, drag: 1,
    pockets: [{ kind: 'rift', phi: Math.PI, half: 0.42 }, { kind: 'out', phi: 0.38 * Math.PI, half: 0.3 }, { kind: 'out', phi: -0.38 * Math.PI, half: 0.3 }],
    theme: { floor: ['#1b2740', '#101828', '#0b101c'], line: 'rgba(120,170,255,0.18)', rim: 0x36d3ff, accent: 0xff6a1a, bg: 0x05070c, wall: 0x8fb8ff, light: [0xff7a2a, 0x36d3ff], pattern: 'radial' } },
  lake: { name: '月光湖盤', desc: '盤面較淺，持久型能轉得更久。', K: 0.045, grav: 0.9, rail: 0.9, drag: 0.85,
    pockets: [{ kind: 'rift', phi: Math.PI, half: 0.38 }, { kind: 'out', phi: 0.4 * Math.PI, half: 0.28 }, { kind: 'out', phi: -0.4 * Math.PI, half: 0.28 }],
    theme: { floor: ['#1d3550', '#122236', '#0a1424'], line: 'rgba(160,210,255,0.22)', rim: 0xa8d8ff, accent: 0xc0a0ff, bg: 0x060a14, wall: 0xb8d8ff, light: [0xc0a0ff, 0x7ad8ff], pattern: 'ripple' } },
  fortress: { name: '鋼鐵要塞盤', desc: '盤面陡峭，陀螺會被拉回中央，很難擊出場外。', K: 0.075, grav: 1.1, rail: 0.95, drag: 1,
    pockets: [{ kind: 'rift', phi: Math.PI, half: 0.32 }, { kind: 'out', phi: 0.38 * Math.PI, half: 0.24 }, { kind: 'out', phi: -0.38 * Math.PI, half: 0.24 }],
    theme: { floor: ['#2a2e36', '#1a1d24', '#0e1014'], line: 'rgba(200,210,230,0.16)', rim: 0xc8d0dc, accent: 0xffb347, bg: 0x070809, wall: 0xa0a8b8, light: [0xffb347, 0xc8d0dc], pattern: 'plate' } },
  gale: { name: '疾風環道盤', desc: '驅動軌道特別強，攻擊型的主場。', K: 0.055, grav: 1, rail: 1.3, drag: 1,
    pockets: [{ kind: 'rift', phi: Math.PI, half: 0.4 }, { kind: 'out', phi: 0.36 * Math.PI, half: 0.3 }, { kind: 'out', phi: -0.36 * Math.PI, half: 0.3 }],
    theme: { floor: ['#163a2e', '#0e261e', '#081610'], line: 'rgba(120,255,190,0.18)', rim: 0x4affb0, accent: 0x9aff4a, bg: 0x040a07, wall: 0x9affd0, light: [0x9aff4a, 0x4affd0], pattern: 'spiral' } },
  twin: { name: '雙子星盤', desc: '前後各有一個裂界區，沒有場外區。', K: 0.06, grav: 1, rail: 1.05, drag: 1,
    pockets: [{ kind: 'rift', phi: Math.PI, half: 0.36 }, { kind: 'rift', phi: 0, half: 0.32 }],
    theme: { floor: ['#2e1b40', '#1e1030', '#120a1e'], line: 'rgba(210,150,255,0.2)', rim: 0xd08aff, accent: 0xff4fd8, bg: 0x08050c, wall: 0xd8b0ff, light: [0xff4fd8, 0x8a7aff], pattern: 'star' } },
  ice: { name: '冰晶盤', desc: '盤面極滑，陀螺滑動距離變長。', K: 0.058, grav: 1, rail: 0.85, drag: 0.6,
    pockets: [{ kind: 'rift', phi: Math.PI, half: 0.42 }, { kind: 'out', phi: 0.38 * Math.PI, half: 0.3 }, { kind: 'out', phi: -0.38 * Math.PI, half: 0.3 }],
    theme: { floor: ['#3e6a88', '#24465e', '#132838'], line: 'rgba(200,240,255,0.32)', rim: 0xb8eaff, accent: 0x7ad8ff, bg: 0x061018, wall: 0xa8d8f0, light: [0x7ad0ff, 0xc8e8ff], pattern: 'crystal' } },
  lava: { name: '熔岩裂谷盤', desc: '裂界區特別寬，軌道驅衝更猛烈。', K: 0.062, grav: 1, rail: 1.2, drag: 1,
    pockets: [{ kind: 'rift', phi: Math.PI, half: 0.55 }, { kind: 'out', phi: 0.38 * Math.PI, half: 0.28 }, { kind: 'out', phi: -0.38 * Math.PI, half: 0.28 }],
    theme: { floor: ['#3a1408', '#220a04', '#120402'], line: 'rgba(255,120,40,0.35)', rim: 0xff5a1a, accent: 0xffb020, bg: 0x0a0302, wall: 0xff9a6a, light: [0xff4a1a, 0xffb020], pattern: 'crack' } },
  throne: { name: '黑曜王座盤', desc: '兩個裂界區加兩個場外區，任何失誤都會致命。', K: 0.06, grav: 1.05, rail: 1.15, drag: 1,
    pockets: [{ kind: 'rift', phi: Math.PI, half: 0.34 }, { kind: 'rift', phi: 0, half: 0.28 }, { kind: 'out', phi: 0.5 * Math.PI, half: 0.26 }, { kind: 'out', phi: -0.5 * Math.PI, half: 0.26 }],
    theme: { floor: ['#2a2210', '#16120a', '#0a0805'], line: 'rgba(255,210,120,0.22)', rim: 0xffd27a, accent: 0xc04cff, bg: 0x050403, wall: 0xffe0a0, light: [0xffd27a, 0xc04cff], pattern: 'throne' } },
};

/* Opponents: original characters. av = avatar recipe. */
const OPPONENTS = [
  { id: 'o1', name: '阿哲', title: '見習旋鬥士', type: 'bal', stadium: 'training', deck: [['phoenix', '4-60', 'T'], ['moon', '5-60', 'B'], ['wolf', '3-60', 'F']], pow: [0.5, 0.72], smart: 0.35, boss: -0.24, reward: 60,
    av: { hair: 'spiky', hairC: '#6a3a1e', skin: '#f6d2b4', eye: '#3a7aff', eyes: 'round', brow: 'firm', mouth: 'grin', acc: 'band', accC: '#ff6a1a', bg: '#f6b432', pose: 'fist' } },
  { id: 'o2', name: '小晴', title: '月下舞者', type: 'sta', stadium: 'lake', deck: [['moon', '6-60', 'B'], ['crane', '4-60', 'O'], ['mantis', '3-60', 'T']], pow: [0.58, 0.8], smart: 0.5, boss: -0.14, reward: 75,
    av: { hair: 'long', hairC: '#7a5ad8', skin: '#fbe0cc', eye: '#a07aff', eyes: 'round', brow: 'soft', mouth: 'smile', acc: 'flower', accC: '#ffd84a', bg: '#3ad28a', pose: 'wave' } },
  { id: 'o3', name: '鐵拳・剛', title: '不動要塞', type: 'def', stadium: 'fortress', deck: [['turtle', '5-60', 'N'], ['rhino', '4-70', 'P'], ['silver', '6-60', 'B']], pow: [0.66, 0.86], smart: 0.62, boss: 0.16, reward: 90,
    av: { hair: 'buzz', hairC: '#26262c', skin: '#d8a070', eye: '#5a3a24', eyes: 'narrow', brow: 'angry', mouth: 'calm', acc: 'scar', accC: '#a04a3a', bg: '#3d7bdf', pose: 'punch' } },
  { id: 'o4', name: '疾風・凜', title: '疾風迅雷', type: 'atk', stadium: 'gale', deck: [['thunder', '3-60', 'R'], ['hawk', '4-60', 'LF'], ['phoenix', '5-60', 'T']], pow: [0.74, 0.92], smart: 0.72, boss: 0.38, reward: 110,
    av: { hair: 'pony', hairC: '#1a7a5a', skin: '#f6d2b4', eye: '#2affb0', eyes: 'sharp', brow: 'cocky', mouth: 'smirk', acc: 'scarf', accC: '#e8ff7a', bg: '#e83a3a', pose: 'point' } },
  { id: 'o5', name: '星羅', title: '雙子星', type: 'bal', stadium: 'twin', deck: [['darkstar', '5-70', 'P'], ['phantom', '4-60', 'GB'], ['tiger', '3-80', 'F']], pow: [0.8, 0.95], smart: 0.8, boss: -0.16, reward: 130,
    av: { hair: 'twin', hairC: '#f0a8ff', skin: '#fde4d4', eye: '#ff4fd8', eyes: 'round', brow: 'soft', mouth: 'grin', acc: 'star', accC: '#ffd84a', bg: '#8a5ae8', pose: 'bey' } },
  { id: 'o6', name: '雪乃', title: '冰之女王', type: 'sta', stadium: 'ice', deck: [['jelly', '9-60', 'B'], ['crab', '5-60', 'HN'], ['owl', '6-70', 'O']], pow: [0.86, 0.98], smart: 0.88, boss: -0.34, reward: 150,
    av: { hair: 'bob', hairC: '#dcecfa', skin: '#fdeee6', eye: '#36c8ff', eyes: 'narrow', brow: 'soft', mouth: 'calm', acc: 'crown', accC: '#9ae0ff', bg: '#4ab0d8', pose: 'chest' } },
  { id: 'o7', name: '獅堂', title: '狂嵐之王', type: 'atk', stadium: 'lava', deck: [['flame', '1-60', 'RF'], ['scorpion', '3-80', 'A'], ['fortress', '9-60', 'N']], pow: [0.9, 1.0], smart: 0.94, boss: 0.0, reward: 180,
    av: { hair: 'mane', hairC: '#e05a1a', skin: '#e8b080', eye: '#ffb020', eyes: 'sharp', brow: 'angry', mouth: 'shout', acc: 'earring', accC: '#ffd27a', bg: '#d83a1a', pose: 'fist' } },
  { id: 'o8', name: '黑曜', title: '陀螺王者', type: 'bal', stadium: 'throne', deck: [['darkstar', '7-60', 'P'], ['scorpion', '1-60', 'RF'], ['jelly', '5-70', 'GN']], pow: [0.95, 1.0], smart: 1.0, boss: 0.05, reward: 250,
    av: { hair: 'slick', hairC: '#1c1628', skin: '#f0d0b8', eye: '#c04cff', eyes: 'sharp', brow: 'cocky', mouth: 'smirk', acc: 'mask', accC: '#2a2236', bg: '#b08a2a', pose: 'temple' } },
];

/* Survival mode: endless original challengers that scale with the streak */
const SURV_NAMES = ['迅雷・翔', '白狐', '鐵壁・豪', '流星', '赤炎・烈', '冰刃', '暴風・颯', '月牙', '鋼牙', '星塵', '雷鳴', '幻刃', '焰舞', '霜狼', '天翔', '黑鴉', '碧濤', '金剛', '紫電', '朧月'];
const SURV_HAIR = ['spiky', 'short', 'long', 'bob', 'pony', 'twin', 'mane', 'slick', 'buzz'];
const SURV_POSE = ['fist', 'point', 'wave', 'punch', 'bey', 'chest', 'temple'];
function makeChallenger(n) {
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const hue = Math.random();
  const col = (h, s, l) => '#' + new THREE.Color().setHSL(h, s, l).getHexString();
  const types = ['atk', 'def', 'sta', 'bal'];
  // rarer parts appear as the streak grows
  const pickParts = (list, k) => {
    const w = (p) => (p.rarity === 'sr' ? Math.min(1, 0.05 + n * 0.08) : p.rarity === 'rare' ? Math.min(1, 0.3 + n * 0.07) : 1);
    const pool = list.slice(), out = [];
    while (out.length < k && pool.length) {
      const tot = pool.reduce((a, p) => a + w(p), 0); let r = Math.random() * tot;
      const idx = pool.findIndex((p) => (r -= w(p)) <= 0); out.push(pool.splice(Math.max(0, idx), 1)[0]);
    }
    return out;
  };
  const bl = pickParts(BLADES, 3), ra = pickParts(RATCHETS, 3), bi = pickParts(BITS, 3);
  const keys = Object.keys(STADIUMS);
  const type = bl[0].type;
  return {
    id: 'surv' + n, survival: true, name: rnd(SURV_NAMES), title: `生存挑戰者 第 ${n} 位`, type,
    stadium: keys[(n - 1) % keys.length],
    deck: [0, 1, 2].map((k) => [bl[k].id, ra[k].id, bi[k].id]),
    pow: [Math.min(0.95, 0.5 + n * 0.03), Math.min(1, 0.72 + n * 0.02)], smart: Math.min(1, 0.35 + n * 0.05),
    boss: Math.min(0.4, -0.25 + n * 0.035), reward: 0,
    av: { hair: rnd(SURV_HAIR), hairC: col(hue, 0.55, 0.35 + Math.random() * 0.3), skin: rnd(['#f6d2b4', '#fbe0cc', '#e8b080', '#d8a070', '#f0d0b8']),
          eye: col(Math.random(), 0.8, 0.55), eyes: rnd(['sharp', 'round', 'narrow']), brow: rnd(['firm', 'angry', 'soft', 'cocky']),
          mouth: rnd(['grin', 'smile', 'smirk', 'shout', 'calm']), acc: rnd(['none', 'band', 'goggles', 'scar', 'scarf', 'earring', 'star']),
          accC: col(Math.random(), 0.8, 0.6), bg: col(hue + 0.5, 0.5, 0.45), pose: rnd(SURV_POSE) },
  };
}
const SURV_WIN_POINTS = 3;

const FINISH = {
  spin: { name: '旋轉終結', en: 'SPIN FINISH', pts: 1 },
  out: { name: '場外終結', en: 'RING OUT', pts: 2 },
  burst: { name: '解體終結', en: 'BREAK FINISH', pts: 2 },
  rift: { name: '裂界終結', en: 'RIFT FINISH', pts: 3 },
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
function beyCode(cfg) { return `${RATCHET[cfg.r].code}·${BIT[cfg.t].code}`; }

/* Signature moves (original). kind drives physics; fx drives visuals. */
const SPECIALS = {
  wolf:     { name: '蒼狼・裂空連爪', kind: 'rush',    fx: 'wind',    color: 0x5fb4ff, dur: 4.5, desc: '化身疾風，連續衝刺撕裂對手。衝刺力與追擊能力大幅提升。' },
  thunder:  { name: '雷霆・萬雷轟擊', kind: 'rush',    fx: 'thunder', color: 0xfff06a, dur: 4.0, desc: '雷光纏身的高速突擊，撞擊時放出落雷，撞擊力提升。' },
  flame:    { name: '烈焰・龍牙崩擊', kind: 'rush',    fx: 'fire',    color: 0xff4a1a, dur: 4.5, desc: '燃起龍炎，以最高速度衝撞。撞擊威力大增。' },
  shark:    { name: '怒鯊・狂濤噬咬', kind: 'rush',    fx: 'water',   color: 0x3ab0ff, dur: 4.3, desc: '掀起狂濤，一口氣撲向對手。' },
  hawk:     { name: '鷹隼・貫雲急襲', kind: 'rush',    fx: 'wind',    color: 0xffd08a, dur: 4.2, desc: '從高空俯衝的急襲，追擊能力大幅提升。' },
  scorpion: { name: '毒蠍・猛毒尾針', kind: 'rush',    fx: 'dark',    color: 0x9aff3a, dur: 4.0, desc: '尾針蓄滿劇毒，一擊就讓對手的鎖芯鬆動。' },
  silver:   { name: '白銀・不落結界', kind: 'guard',   fx: 'steel',   color: 0xdfe8ff, dur: 6.0, desc: '展開銀色護盾，大幅減少被撞飛的距離並修復鎖芯。' },
  turtle:   { name: '玄龜・磐石甲陣', kind: 'guard',   fx: 'water',   color: 0x3fe0b0, dur: 6.5, desc: '六角水盾環繞，重量感倍增，幾乎不會被撞動。' },
  fortress: { name: '鋼鐵・絕對城壁', kind: 'guard',   fx: 'steel',   color: 0x8fb4ff, dur: 7.0, desc: '升起鋼鐵城壁，承受一切衝擊，鎖芯大幅修復。' },
  rhino:    { name: '犀甲・鐵角衝陣', kind: 'guard',   fx: 'steel',   color: 0xffc890, dur: 6.0, desc: '低頭架起鐵角，正面衝擊全部擋下。' },
  crab:     { name: '巨蟹・雙鉗鐵壁', kind: 'guard',   fx: 'water',   color: 0xff8060, dur: 6.5, desc: '雙鉗交疊成盾，把衝擊推回去。' },
  moon:     { name: '月影・無盡輪舞', kind: 'regen',   fx: 'moon',    color: 0xc0a0ff, dur: 6.0, desc: '吸收月光回復轉速，之後一段時間轉速掉得更慢。' },
  phantom:  { name: '幻影・旋風迴天', kind: 'regen',   fx: 'wind',    color: 0x7af6ff, dur: 6.0, desc: '捲起旋風重新加速，並減少摩擦損耗。' },
  crane:    { name: '白鶴・雲上長鳴', kind: 'regen',   fx: 'wind',    color: 0xff7a7a, dur: 6.0, desc: '乘雲而起，轉速緩緩回升。' },
  owl:      { name: '夜梟・靜夜無聲', kind: 'regen',   fx: 'moon',    color: 0xffd84a, dur: 6.5, desc: '收起羽翼靜靜旋轉，幾乎感覺不到轉速下降。' },
  jelly:    { name: '水母・深海潮汐', kind: 'regen',   fx: 'water',   color: 0xff8ad8, dur: 6.5, desc: '隨潮汐擺動，把撞擊的力道化為轉速。' },
  phoenix:  { name: '赤鳳・浴火重生', kind: 'counter', fx: 'phoenix', color: 0xffa030, dur: 5.5, desc: '鳳凰之火回復少量轉速，並把受到的撞擊反彈給對手。' },
  tiger:    { name: '猛虎・雙牙反噬', kind: 'counter', fx: 'fire',    color: 0xffa020, dur: 5.5, desc: '咬住撲來的對手，把衝擊原封不動還回去。' },
  mantis:   { name: '螳螂・鐮刃迴旋', kind: 'counter', fx: 'wind',    color: 0xb8ff6a, dur: 5.0, desc: '雙鐮迴旋，在對手撞上來的瞬間反斬。' },
  viper:    { name: '赤蛇・毒牙纏身', kind: 'rush',    fx: 'dark',    color: 0x8aff3a, dur: 4.2, desc: '如蛇般纏上對手，連續撕咬。' },
  falcon:   { name: '隼翼・裂風俯衝', kind: 'rush',    fx: 'wind',    color: 0x8ad8ff, dur: 4.2, desc: '從高空俯衝，速度快到看不清。' },
  bull:     { name: '狂牛・怒角衝鋒', kind: 'rush',    fx: 'fire',    color: 0xff6a2a, dur: 4.5, desc: '低頭狂奔，一路撞開所有阻礙。' },
  golem:    { name: '岩魔・磐石不動', kind: 'guard',   fx: 'steel',   color: 0xffa040, dur: 6.5, desc: '化身岩石，紋風不動。' },
  beetle:   { name: '甲蟲・重甲護身', kind: 'guard',   fx: 'steel',   color: 0x6affb0, dur: 6.5, desc: '收起甲殼，把衝擊全部擋下。' },
  dragonfly:{ name: '蜻蜓・輕翼浮空', kind: 'regen',   fx: 'wind',    color: 0xb8fff0, dur: 6.0, desc: '輕盈浮空，轉速緩緩回升。' },
  lotus:    { name: '青蓮・靜水流轉', kind: 'regen',   fx: 'water',   color: 0xd8a8ff, dur: 6.5, desc: '如蓮花在靜水上旋轉，幾乎不損失轉速。' },
  kirin:    { name: '麒麟・天雷反擊', kind: 'counter', fx: 'thunder', color: 0xffe060, dur: 5.5, desc: '天雷護身，把撞擊反彈回去。' },
  fox:      { name: '九尾・幻影迷蹤', kind: 'counter', fx: 'moon',    color: 0xffa060, dur: 5.5, desc: '九道幻影迷惑對手，趁機反擊。' },
  raven:    { name: '黑鴉・夜羽急襲', kind: 'rush',    fx: 'dark',    color: 0xc06aff, dur: 4.2, desc: '在夜色中無聲急襲。' },
  darkstar: { name: '暗星・黑洞引力', kind: 'gravity', fx: 'dark',    color: 0xc04cff, dur: 4.5, desc: '製造引力場把對手拉近，並以反擊姿態迎擊。' },
};
const SPECIAL_KIND = { rush: '突擊強化', guard: '防禦強化', regen: '轉速回復', counter: '反擊', gravity: '引力反擊' };
