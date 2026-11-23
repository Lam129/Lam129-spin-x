/* ============================== I18N ==============================
   The game is authored in Traditional Chinese. Other languages are applied at display time: every text
   node / attribute that contains Chinese is looked up in I18N_DICT (exact match, then "{0}" templates with
   recursively translated captures, then "・"-separated pieces, then known sub-phrases). That keeps the game
   code untouched and also covers dynamic text such as toasts and battle banners. */
const I18N = {
  LANGS: { 'zh-Hant': '繁體中文', 'zh-Hans': '简体中文', ja: '日本語', en: 'English' },
  lang: 'zh-Hant', dict: null, cache: new Map(), pats: [], subs: [], t2s: null, done: new WeakMap(),
  detect() {
    let l = null; try { l = localStorage.getItem('spinx-lang'); } catch (e) {}
    if (l && this.LANGS[l]) return l;
    const n = ((navigator.languages && navigator.languages[0]) || navigator.language || 'zh-Hant').toLowerCase();
    if (n.startsWith('zh')) return /tw|hk|mo|hant/.test(n) ? 'zh-Hant' : 'zh-Hans';
    if (n.startsWith('ja')) return 'ja';
    return 'en';
  },
  init() {
    this.lang = this.detect();
    document.documentElement.lang = this.lang;
    if (this.lang === 'zh-Hant') return;
    this.dict = I18N_DICT[this.lang] || {};
    if (this.lang === 'zh-Hans') { this.t2s = new Map(); for (let i = 0; i < I18N_T2S.length; i += 2) this.t2s.set(I18N_T2S[i], I18N_T2S[i + 1]); }
    const esc = (s) => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
    for (const k of Object.keys(this.dict)) {
      if (/\{\d\}/.test(k)) {
        const re = new RegExp('^' + esc(k).replace(/\\?\{(\d)\\?\}/g, '(.+?)') + '$');
        this.pats.push({ re, k, lit: k.replace(/\{\d\}/g, '').length });
      } else if (k.length >= 2) this.subs.push(k);
    }
    this.pats.sort((a, b) => b.lit - a.lit);
    this.subs.sort((a, b) => b.length - a.length);
    this.walk(document.documentElement);
    if (document.title) document.title = this.t(document.title);
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === 'characterData') this.node(m.target);
        else for (const n of m.addedNodes) this.walk(n);
        if (m.type === 'attributes') this.attrs(m.target);
      }
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] });
  },
  set(l) { try { localStorage.setItem('spinx-lang', l); } catch (e) {} location.reload(); },
  has(s) { return /[㐀-鿿]/.test(s); },
  conv(s) { if (!this.t2s) return s; let o = ''; for (const c of s) o += this.t2s.get(c) || c; return o; },
  /* translate one string */
  t(s, vars) {
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    if (this.lang === 'zh-Hant' || !s || !this.has(s)) return s;
    const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), core = m[2];
    let r = this.cache.get(core);
    if (r == null) { r = this.core(core); if (this.cache.size > 4000) this.cache.clear(); this.cache.set(core, r); }
    return m[1] + r + m[3];
  },
  core(s) {
    const d = this.dict;
    if (d[s] != null) return d[s];
    for (const p of this.pats) {
      const mm = s.match(p.re);
      if (mm) return d[p.k].replace(/\{(\d)\}/g, (_, i) => this.t(mm[+i + 1] || ''));
    }
    const sep = s.includes('・') ? '・' : s.includes(' · ') ? ' · ' : s.includes('、') ? '、' : null;
    if (sep) { const j = this.lang === 'en' ? (sep === '、' ? ', ' : ' · ') : sep; return s.split(sep).map((x) => this.t(x)).join(j); }
    let out = s;
    for (const k of this.subs) if (out.includes(k)) out = out.split(k).join(d[k]);
    return this.conv(out);
  },
  skip(el) { return el && el.closest && el.closest('[data-noi18n],script,style,textarea'); },
  node(n) {
    if (n.nodeType !== 3) return;
    const v = n.nodeValue; if (!v || !this.has(v) || this.done.get(n) === v || this.skip(n.parentElement)) return;
    const r = this.t(v); this.done.set(n, r);
    if (r !== v) n.nodeValue = r;
  },
  attrs(el) {
    if (el.nodeType !== 1 || this.skip(el)) return;
    for (const a of ['placeholder', 'title', 'aria-label']) { const v = el.getAttribute(a); if (v && this.has(v)) { const r = this.t(v); if (r !== v) el.setAttribute(a, r); } }
  },
  walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return this.node(root);
    if (root.nodeType !== 1 || this.skip(root)) return;
    this.attrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n; while ((n = tw.nextNode())) { if (n.nodeType === 3) this.node(n); else this.attrs(n); }
  },
};
const tr = (s, vars) => I18N.t(s, vars);
