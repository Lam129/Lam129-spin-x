/* ============================== ACCOUNT / SAVE ============================== */
/* Public-site backend client. Any 503 "busy" / network failure is reported as overload. */
const Api = {
  get base() { return (window.SPIN_CONFIG && window.SPIN_CONFIG.api || '').replace(/\/$/, ''); },
  cred: null, CKEY: 'spinx-guest',
  busy: false,
  async call(method, path, body) {
    let res;
    try {
      res = await fetch(this.base + path, { method, headers: { 'Content-Type': 'application/json', ...(this.cred ? { Authorization: `Bearer ${this.cred.id}.${this.cred.token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    } catch (e) { this.flagBusy(); throw Object.assign(new Error('network'), { code: 'busy' }); }
    const data = await res.json().catch(() => ({}));
    if (res.status === 503 || data.error === 'busy') { this.flagBusy(); throw Object.assign(new Error('busy'), { code: 'busy', msg: '目前流量過大，請稍後再試' }); }
    if (!res.ok) throw Object.assign(new Error(data.error || 'error'), { code: data.error || 'error', status: res.status, msg: data.message || '' });
    this.busy = false;
    return data;
  },
  flagBusy() {
    if (!this.busy && typeof UI !== 'undefined' && UI.toast) UI.toast('目前流量過大，請稍後再試。進度先存在這台電腦上。');
    this.busy = true;
  },
  loadCred() { try { this.cred = JSON.parse(localStorage.getItem(this.CKEY) || 'null'); } catch (e) { this.cred = null; } return this.cred; },
  setCred(c) { this.cred = c; try { c ? localStorage.setItem(this.CKEY, JSON.stringify(c)) : localStorage.removeItem(this.CKEY); } catch (e) {} },
  async ensureGuest() {
    this.loadCred();
    if (this.cred && this.cred.id && this.cred.token) return this.cred;
    const g = await this.call('POST', '/api/guest');
    this.cred = { id: g.id, token: g.token };
    try { localStorage.setItem(this.CKEY, JSON.stringify(this.cred)); } catch (e) {}
    return this.cred;
  },
};

const Store = {
  mode: 'local', uid: null, db: null, user: null, accountName: '', profile: null,
  _t: null, _writing: false, _dirty: false,
  LKEY: 'spinx-profile-v1',
  async init() {
    // public site: our own backend (guest account, cloud save)
    if (Api.base && !(window.claude && typeof window.claude.use === 'function')) {
      // public site: nothing is created until the player logs in, registers or chooses to try as a guest
      this.mode = 'server';
      if (Api.loadCred() && Api.cred.id) { this.uid = Api.cred.id; return this.load(); }
      return null;
    }
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
    if (this.mode === 'server') {
      if (!Api.cred) return (this.profile = null);
      try {
        const r = await Api.call('GET', '/api/profile');
        const local = this.readLocal();
        const remote = r.profile ? migrate(r.profile) : null;
        // keep whichever copy is newer (local may hold progress saved while the server was busy)
        this.profile = remote && (!local || (remote.updatedAt | 0) >= (local.updatedAt | 0)) ? remote : local;
        if (this.profile && this.profile !== remote) this.saveNow();
        return this.profile;
      } catch (e) {
        if (e.status === 401) { Api.setCred(null); return (this.profile = null); }
        this.profile = this.readLocal(); return this.profile;
      }
    }
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
  /* public-site account actions */
  async login(email, password) {
    const r = await Api.call('POST', '/api/login', { email, password });
    Api.setCred({ id: r.id, token: r.token, email: r.email });
    this.uid = r.id;
    try { localStorage.removeItem(this.LKEY); } catch (e) {}   // never mix another account's local copy
    return this.load();
  },
  async register(email, password, name) {
    const r = await Api.call('POST', '/api/register', { email, password, name });   // binds the current guest when signed in
    Api.setCred({ id: r.id, token: r.token, email: r.email });
    this.uid = r.id;
  },
  async startGuest() { await Api.ensureGuest(); this.uid = Api.cred.id; },
  async logout() {
    try { await Api.call('POST', '/api/logout'); } catch (e) {}
    Api.setCred(null);
    try { localStorage.removeItem(this.LKEY); } catch (e) {}
    location.reload();
  },
  readLocal() {
    try { const s = localStorage.getItem(this.LKEY); return s ? migrate(JSON.parse(s)) : null; } catch (e) { return null; }
  },
  save() { clearTimeout(this._t); this._t = setTimeout(() => this.saveNow(), 700); },
  async saveNow() {
    if (!this.profile) return;
    this.profile.updatedAt = Date.now();
    try { localStorage.setItem(this.LKEY, JSON.stringify(this.profile)); } catch (e) {}
    if (this.mode === 'server') {
      if (this._writing) { this._dirty = true; return; }
      this._writing = true;
      try { await Api.call('PUT', '/api/profile', { profile: this.profile }); }
      catch (e) { if (e.code === 'busy') setTimeout(() => this.save(), 30000); }
      finally { this._writing = false; if (this._dirty) { this._dirty = false; this.save(); } }
      return;
    }
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
  return { v: 2, name, starter, coins: 200, inv, decks, builds: decks.map((d, i) => ({ id: 'b' + (i + 1), ...d })), deckIds: ['b1', 'b2', 'b3'], ladder: 0, stats: { w: 0, l: 0, spin: 0, out: 0, burst: 0, rift: 0, pulls: 0 }, createdAt: Date.now(), updatedAt: Date.now() };
}
function migrate(p) {
  if (!p || typeof p !== 'object' || !p.inv || !Array.isArray(p.decks)) return null;
  p.stats = Object.assign({ w: 0, l: 0, spin: 0, out: 0, burst: 0, rift: 0, pulls: 0, best: 0, runs: 0 }, p.stats || {});
  p.coins = Math.max(0, p.coins | 0);
  p.ladder = p.ladder | 0;
  for (const k of ['blade', 'ratchet', 'bit']) p.inv[k] = p.inv[k] || {};
  p.decks = p.decks.slice(0, 3).map((d) => ({ b: BLADE[d.b] ? d.b : 'wolf', r: RATCHET[d.r] ? d.r : '3-60', t: BIT[d.t] ? d.t : 'F' }));
  // build library: every saved combination; the 3 default deck slots point at builds by id
  if (!Array.isArray(p.builds) || !p.builds.length) {
    p.builds = p.decks.map((d, i) => ({ id: 'b' + (i + 1), ...d }));
    p.deckIds = ['b1', 'b2', 'b3'];
  }
  p.builds = p.builds.filter((x) => x && x.id).map((x) => ({ id: x.id, b: BLADE[x.b] ? x.b : 'wolf', r: RATCHET[x.r] ? x.r : '3-60', t: BIT[x.t] ? x.t : 'F' }));
  p.deckIds = (p.deckIds || []).slice(0, 3);
  while (p.deckIds.length < 3) p.deckIds.push(p.builds[p.deckIds.length % p.builds.length].id);
  syncDecks(p);
  return p;
}
function syncDecks(p) {
  p.decks = p.deckIds.map((id, i) => { const b = p.builds.find((x) => x.id === id); return b ? { b: b.b, r: b.r, t: b.t } : p.decks[i]; });
}
/* Leaderboard backend. Today: the artifact's shared db (each player writes only their own row).
   To move to a public server later, implement the same three methods against your own API. */
const Board = {
  get backend() { return Store.mode === 'server' ? 'server' : Store.mode === 'cloud' && Store.db ? 'artifact' : 'local'; },
  LKEY: 'spinx-board',
  async top(n = 5) {
    if (this.backend === 'server') {
      try { return (await Api.call('GET', `/api/leaderboard?n=${n}`)).rows || []; } catch (e) { return this.localTop(n); }
    }
    if (this.backend === 'artifact') {
      try {
        const snap = await Promise.race([Store.db.collection('leaderboard').orderBy('best', 'desc').limit(n).get(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))]);
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })).filter((r) => r.best > 0);
      } catch (e) { return this.localTop(n); }
    }
    return this.localTop(n);
  },
  localTop(n) {
    const P = Store.profile; const best = (P && P.stats.best) | 0;
    return best > 0 ? [{ id: 'me', name: P.name, best }] : [];
  },
  myId() { return this.backend === 'local' ? 'me' : Store.uid; },
  async submit(best) {
    const P = Store.profile;
    if (this.backend === 'server' && best) { try { await Api.call('POST', '/api/leaderboard', { best }); } catch (e) {} return; }
    if (this.backend !== 'artifact' || !best) return;
    try {
      const ref = Store.db.doc('leaderboard/' + Store.uid);
      const cur = await ref.get();
      if (cur.exists && (cur.data().best | 0) >= best) { if (cur.data().name !== P.name) await ref.update({ name: P.name }); return; }
      await ref.set({ name: P.name, best, at: Date.now() });
    } catch (e) { /* read-only viewers cannot post */ }
  },
};
const owns = (kind, id) => ((Store.profile.inv[kind] || {})[id] | 0) > 0;
