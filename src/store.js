/* ============================== ACCOUNT / SAVE ============================== */
const Store = {
  mode: 'local', uid: null, db: null, user: null, accountName: '', profile: null,
  _t: null, _writing: false, _dirty: false,
  LKEY: 'spinx-profile-v1',
  async init() {
    const c = window.claude;
    if (c && typeof c.use === 'function') {
      try {
        const [user, db] = await Promise.all([c.use('user'), c.use('db')]);
        this.user = user;
        if (user && db) {
          const id = await user.id();
          if (id) {
            this.uid = id; this.db = db; this.mode = 'cloud';
            try { const me = await user.me(); this.accountName = (me && me.name) || ''; } catch (e) {}
          }
        }
      } catch (e) { /* fall back to local */ }
    }
    return this.load();
  },
  docRef() { return this.db.doc('data/users/' + this.uid + '/profile'); },
  async load() {
    if (this.mode === 'cloud') {
      try {
        const snap = await Promise.race([this.docRef().get(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))]);
        if (snap.exists) { this.profile = migrate(snap.data()); return this.profile; }
        // first cloud login: adopt a local profile if one exists
        const local = this.readLocal();
        if (local) { this.profile = local; this.saveNow(); }
        return this.profile;
      } catch (e) {
        this.mode = 'local';
      }
    }
    this.profile = this.readLocal();
    return this.profile;
  },
  readLocal() {
    try { const s = localStorage.getItem(this.LKEY); return s ? migrate(JSON.parse(s)) : null; } catch (e) { return null; }
  },
  save() { clearTimeout(this._t); this._t = setTimeout(() => this.saveNow(), 700); },
  async saveNow() {
    if (!this.profile) return;
    this.profile.updatedAt = Date.now();
    try { localStorage.setItem(this.LKEY, JSON.stringify(this.profile)); } catch (e) {}
    if (this.mode !== 'cloud') return;
    if (this._writing) { this._dirty = true; return; }
    this._writing = true;
    try { await this.docRef().set(JSON.parse(JSON.stringify(this.profile))); }
    catch (e) {
      if (e && e.code === 'unavailable') { setTimeout(() => this.save(), 1500); }
      else if (e && (e.code === 'revoked' || e.code === 'not_granted' || e.code === 'capability_disabled')) { this.mode = 'local'; UI.toastTop('雲端存檔無法使用，進度改存在這台電腦上。'); }
    } finally {
      this._writing = false;
      if (this._dirty) { this._dirty = false; this.save(); }
    }
  },
};
function newProfile(name, starter) {
  const inv = { blade: {}, ratchet: {}, bit: {} };
  const s = STARTERS[starter];
  const blades = new Set([s.b, 'wolf', 'silver', 'moon', 'phoenix'].filter((x) => x !== s.b).slice(0, 2));
  blades.add(s.b);
  blades.forEach((b) => (inv.blade[b] = 1));
  ['3-60', '4-60', '5-60'].forEach((r) => (inv.ratchet[r] = 1));
  ['F', 'T', 'B', s.t].forEach((t) => (inv.bit[t] = 1));
  const otherBlades = [...blades].filter((b) => b !== s.b);
  const rs = ['3-60', '4-60', '5-60'].filter((r) => r !== s.r);
  const ts = ['F', 'T', 'B', 'N'].filter((t) => t !== s.t && inv.bit[t]);
  const decks = [
    { b: s.b, r: s.r, t: s.t },
    { b: otherBlades[0], r: rs[0], t: ts[0] },
    { b: otherBlades[1], r: rs[1], t: ts[1] },
  ];
  return { v: 1, name, starter, coins: 300, inv, decks, ladder: 0, stats: { w: 0, l: 0, spin: 0, out: 0, burst: 0, rift: 0, pulls: 0 }, createdAt: Date.now(), updatedAt: Date.now() };
}
function migrate(p) {
  if (!p || typeof p !== 'object' || !p.inv || !Array.isArray(p.decks)) return null;
  p.stats = Object.assign({ w: 0, l: 0, spin: 0, out: 0, burst: 0, rift: 0, pulls: 0 }, p.stats || {});
  p.coins = Math.max(0, p.coins | 0);
  p.ladder = p.ladder | 0;
  for (const k of ['blade', 'ratchet', 'bit']) p.inv[k] = p.inv[k] || {};
  p.decks = p.decks.slice(0, 3).map((d) => ({ b: BLADE[d.b] ? d.b : 'wolf', r: RATCHET[d.r] ? d.r : '3-60', t: BIT[d.t] ? d.t : 'F' }));
  return p;
}
const owns = (kind, id) => ((Store.profile.inv[kind] || {})[id] | 0) > 0;
