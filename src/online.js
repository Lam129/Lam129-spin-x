/* ============================== ONLINE BATTLE ==============================
   Two players meet in a room (6-char code or invite link). The room creator ("host") runs the
   physics; the other player ("guest") sends inputs and renders the host's snapshots.
   Blind picks use commit-reveal so neither side can peek. Wagers are taken (escrow) when the
   match starts, so leaving mid-match never saves your stake. */
const EMOTES = ['😤', '😱', '👍', '😭'];
const WAGER_MIN = 10, NEWBIE_MATCHES = 5, PICK_SECONDS = 10, CONSOLATION = 20, FORFEIT_SECONDS = 30;

const Net = {
  ws: null, code: '', role: '', onMsg: null, onState: null, mine: false, tries: 0, rtt: 0, pingT: null,
  connect(code, role, onMsg, onState) {
    this.close(true);
    Object.assign(this, { code, role, onMsg, onState, mine: false, tries: 0 });
    this.open();
  },
  open() {
    if (!this.cid) this.cid = Math.random().toString(36).slice(2, 12);
    const url = Api.base.replace(/^http/, 'ws') + `/api/rooms/${this.code}?role=${this.role}&cid=${this.cid}`;
    let ws;
    try { ws = new WebSocket(url); } catch (e) { return this.onState && this.onState('error'); }
    this.ws = ws;
    ws.onopen = () => { this.tries = 0; this.onState && this.onState('open'); };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (er) { return; }
      if (m.t === 'ping') return this.send({ t: 'pong', ts: m.ts });
      if (m.t === 'pong') { this.rtt = Math.round(performance.now() - m.ts); return Online.renderPing(); }
      this.onMsg && this.onMsg(m);
    };
    ws.onclose = (e) => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.mine) return;
      if (e.code === 4009) return this.onState && this.onState('full');
      if (e.code === 4000) return;
      if (this.tries++ < 6) { this.onState && this.onState('retry'); setTimeout(() => { if (!this.mine && !this.ws) this.open(); }, 800 * this.tries); }
      else this.onState && this.onState('lost');
    };
    clearInterval(this.pingT);
    this.pingT = setInterval(() => this.send({ t: 'ping', ts: performance.now() }), 3000);
  },
  send(o) { if (this.ws && this.ws.readyState === 1) { try { this.ws.send(JSON.stringify(o)); } catch (e) {} } },
  close(silent) { this.mine = true; clearInterval(this.pingT); if (this.ws) { try { this.ws.close(1000); } catch (e) {} } this.ws = null; },
};

async function sha256hex(s) {
  if (window.crypto && crypto.subtle) {
    try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); } catch (e) {}
  }
  return sha256js(s);
}
/* fallback for non-secure contexts (plain-http previews) */
function sha256js(str) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const bytes = [...new TextEncoder().encode(str)], l = bytes.length * 8;
  bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], W = new Array(64);
  const rr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < bytes.length; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
    for (let i = 16; i < 64; i++) { const s0 = rr(W[i - 15], 7) ^ rr(W[i - 15], 18) ^ (W[i - 15] >>> 3), s1 = rr(W[i - 2], 17) ^ rr(W[i - 2], 19) ^ (W[i - 2] >>> 10); W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
      const t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
function remoteAvatar(name) { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) | 0; return OPPONENTS[Math.abs(h) % OPPONENTS.length].av; }
function cleanDeck(d) {
  const ok = Array.isArray(d) && d.length === 3 ? d : [];
  const base = STARTER_PACKS.atk;
  return [0, 1, 2].map((i) => { const c = ok[i] || {}; return { b: BLADE[c.b] ? c.b : base[i].b, r: RATCHET[c.r] ? c.r : base[i].r, t: BIT[c.t] ? c.t : base[i].t }; });
}

const Online = {
  role: '', code: '', peer: null, view: 'menu', wager: 0, acc: [false, false], amt: 0, mid: '',
  used: [[], []], picks: [null, null], locks: [null, null], myNonce: '', pickT: null, pickLeft: 0,
  cur: null, st: 'training', again: [null, null], lostT: null, inMatch: false, emoAt: 0,

  available() { return Store.mode === 'server' && Api.cred && Api.cred.email; },
  newbie(p) { return ((p ? p.online : (Store.profile.stats.online | 0)) | 0) < NEWBIE_MATCHES; },
  open(code) {
    if (Store.mode !== 'server') return UI.toast('線上對戰需要在公開網站上遊玩。');
    if (!this.available()) { UI.toast('線上對戰需要先註冊 Email 帳號。'); UI.show('auth'); UI.renderAuth(); UI.setAuthTab('register'); UI.startAuthCycle(); return; }
    if (Store.profile.decks.length < 3) return UI.toast('請先在組裝工坊設定 3 顆預設陀螺。');
    UI.go('online');
    if (code) return this.join(code.toUpperCase(), 'guest');
    if (!this.role) this.render('menu');
  },
  async create() {
    try { const r = await Api.call('POST', '/api/rooms'); this.join(r.code, 'host'); }
    catch (e) { UI.toast(e.msg || '建立房間失敗，請稍後再試。'); }
  },
  join(code, role) {
    if (!/^[A-F0-9]{6}$/.test(code)) return UI.toast('房號是 6 碼英數字。');
    Object.assign(this, { code, role, peer: null, wager: 0, acc: [false, false], again: [null, null], inMatch: false, mid: '' });
    this.render('room', '連線中…');
    Net.connect(code, role, (m) => this.onMsg(m), (s) => this.onNet(s));
  },
  leave() {
    if (this.inMatch) return this.confirmForfeit();
    Net.close(); this.role = ''; this.peer = null; clearTimeout(this.lostT);
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  },
  me() { const P = Store.profile; return { name: P.name, starter: P.starter, deck: P.decks.map((d) => ({ b: d.b, r: d.r, t: d.t })), coins: P.coins, online: P.stats.online | 0, wins: P.stats.onlineW | 0, mid: this.mid }; },
  side() { return this.role === 'host' ? 0 : 1; },
  send(o) { Net.send(o); },

  onNet(s) {
    if (s === 'open') { this.send({ t: 'hi', ...this.me() }); this.renderStatus(); }
    else if (s === 'retry') this.renderStatus('連線中斷，重新連線中…');
    else if (s === 'full') { this.render('menu'); UI.toast('這個房間已經滿了。'); this.role = ''; }
    else if (s === 'lost' || s === 'error') { this.renderStatus('無法連線到房間，請稍後再試。'); if (this.inMatch) this.forfeitTimer(); }
  },
  onMsg(m) {
    switch (m.t) {
      case 'peer-joined': this.send({ t: 'hi', ...this.me() }); break;
      case 'peer-left': this.peerLeft(); break;
      case 'hi': return this.onHi(m);
      case 'wager': if (this.role === 'guest') { this.wager = m.amt | 0; this.acc = [false, false]; this.renderRoom(); } break;
      case 'acc': this.acc[1 - this.side()] = m.amt === this.wager; this.renderRoom(); if (this.role === 'host') this.tryStart(); break;
      case 'start': if (this.role === 'guest') this.beginMatch(m.amt | 0, m.mid); break;
      case 'pick': if (this.role === 'guest') this.showPick(); break;
      case 'lock': this.locks[1 - this.side()] = m.h; this.renderPick(); this.maybeOpen(); break;
      case 'open': this.onOpen(m); break;
      case 'round': if (this.role === 'guest') this.startRound(m.a, m.b, m.st, m.replay); break;
      case 'sync': if (this.role === 'guest') { Battle.score = m.score; Battle.errors = m.errors || [0, 0]; Battle.renderPips(); } break;
      case 'end': if (this.role === 'guest') this.matchEnd(m.score); break;
      case 'ff': this.matchEnd(null, 'peer-ff'); break;
      case 'emo': this.showEmote(1 - this.side(), m.k); break;
      case 'again': this.again[1 - this.side()] = m.amt | 0; this.renderResult(); if (this.role === 'host') this.tryAgain(); break;
      // battle traffic
      case 'rip': if (this.role === 'host') Battle.remoteRip = m; break;
      case 'sp': if (this.role === 'host') Battle.useSpecial(1); break;
      case 'mo': if (this.role === 'host') Battle.useMomentum(1); else if (Battle.arena) { Battle.arena.beys[m.side].mo = (Battle.arena.beys[m.side].mo | 0) + 1; Battle.momentumFx(m.side); } break;
      case 'ph': if (this.role === 'guest' && Battle.active) Battle.setPhase(m.p); break;
      case 'L': if (this.role === 'guest' && Battle.arena) { const b = Battle.arena.beys[m.side]; Object.assign(b, { x: m.x, z: m.z, state: 'spin', launched: true }); Battle.netSnap = null; Battle.launchFx(m.side, m.power); } break;
      case 's': if (this.role === 'guest') { Battle.netSnap = m.b; Battle.timeScale = m.ts || 1; } break;
      case 'e': if (this.role === 'guest' && Battle.arena) Battle.netEvent(m.n, m.a); break;
      case 'cine': if (this.role === 'guest' && Battle.cur) Battle.presentSpecial(m.side, specOf(Battle.cur[m.side].b)); break;
      case 'res': if (this.role === 'guest') Battle.showResult(m.side, m.type); break;
      case 'draw': if (this.role === 'guest') Battle.showDraw(); break;
      case 'lerr': if (this.role === 'guest') Battle.showLaunchError(m.side, m.msg); break;
    }
  },
  onHi(m) {
    const back = this.inMatch && this.peer && m.mid && m.mid === this.mid;
    this.peer = { name: String(m.name || '旋鬥士').slice(0, 12), starter: TYPES[m.starter] ? m.starter : 'atk', deck: cleanDeck(m.deck), coins: Math.max(0, m.coins | 0), online: m.online | 0, wins: m.wins | 0 };
    clearTimeout(this.lostT); this.lostT = null; $('#netLost').hidden = true;
    if (this.inMatch) {
      if (!back) return this.matchEnd(null, 'peer-ff');        // the other player reloaded: their stake is already taken
      if (this.role === 'host') { this.send({ t: 'sync', score: Battle.score, errors: Battle.errors }); setTimeout(() => this.hostReplayRound(), 600); }
      UI.toast('對手回來了，本回合重賽。');
      return;
    }
    if (this.role === 'host') { this.clampWager(); this.send({ t: 'wager', amt: this.wager }); }
    if (this.view === 'result') this.renderResult(); else this.render('room');
  },
  peerLeft() {
    if (this.inMatch) { $('#netLost').hidden = false; this.forfeitTimer(); return; }
    this.peer = null; this.acc = [false, false]; this.again = [null, null];
    if (this.view === 'result') this.renderResult(); else this.renderRoom();
    UI.toast('對手離開了房間。');
  },
  forfeitTimer() {
    if (this.lostT) return;
    let left = FORFEIT_SECONDS;
    const tick = () => {
      $('#netLostN').textContent = left;
      if (left-- <= 0) { this.lostT = null; $('#netLost').hidden = true; return this.matchEnd(null, 'peer-ff'); }
      this.lostT = setTimeout(tick, 1000);
    };
    tick();
  },

  /* ---- wager ---- */
  maxWager() { const mine = Store.profile.coins; return this.peer ? Math.min(mine, this.peer.coins) : mine; },
  clampWager() {
    if (this.newbie() || (this.peer && this.newbie(this.peer))) this.wager = 0;
    else this.wager = Math.min(this.wager, this.maxWager());
  },
  setWager(v) {
    if (this.role !== 'host') return;
    if (this.newbie() || (this.peer && this.newbie(this.peer))) { this.wager = 0; UI.toast(`新手保護：前 ${NEWBIE_MATCHES} 場線上對戰不下注。`); }
    else {
      v = Math.floor(+v || 0);
      if (v && v < WAGER_MIN) { UI.toast(`下注最少 ${WAGER_MIN} 金幣。`); v = WAGER_MIN; }
      if (v > this.maxWager()) { UI.toast(`最多只能下注 ${this.maxWager()} 金幣（雙方都要付得起）。`); v = this.maxWager(); }
      this.wager = Math.max(0, v);
    }
    this.acc = [false, false];
    this.send({ t: 'wager', amt: this.wager });
    this.renderRoom();
  },
  accept() {
    if (!this.peer) return;
    if (this.wager > Store.profile.coins) return UI.toast('金幣不足，無法接受這個下注。');
    this.acc[this.side()] = true;
    this.send({ t: 'acc', amt: this.wager });
    this.renderRoom();
    if (this.role === 'host') this.tryStart();
  },
  tryStart() {
    if (!(this.acc[0] && this.acc[1] && this.peer)) return;
    const mid = Math.random().toString(36).slice(2, 10);
    this.send({ t: 'start', amt: this.wager, mid });
    this.beginMatch(this.wager, mid);
  },

  /* ---- match ---- */
  beginMatch(amt, mid) {
    const P = Store.profile;
    this.amt = amt; this.mid = mid; this.inMatch = true; this.used = [[], []]; this.again = [null, null];
    P.coins = Math.max(0, P.coins - amt);                         // escrow
    P.stats.online = (P.stats.online | 0) + 1;
    Store.saveNow();
    Battle.startNet(this.peer);
    if (this.role === 'host') setTimeout(() => this.hostPickPhase(), 500);
  },
  deckOf(side) { return side === this.side() ? Store.profile.decks : this.peer.deck; },
  deckRow(side) {
    const d = this.deckOf(side), used = this.used[side];
    return d.map((cfg, k) => `<span class="dk ${this.cur && this.picks[side] === k ? 'cur' : ''} ${used.includes(k) && !(this.picks[side] === k) ? 'used' : ''}"><img src="${Thumbs.get('blade', cfg.b)}" alt=""><i>${k + 1}</i></span>`).join('');
  },
  hostPickPhase() { if (!this.inMatch) return; this.send({ t: 'pick' }); this.showPick(); },
  showPick() {
    for (const s of [0, 1]) if (this.used[s].length >= 3) this.used[s] = [];
    this.picks = [null, null]; this.locks = [null, null]; this.mySel = null; this.cur = null;
    Battle.setPhase('idle'); $('#launcher').hidden = true;
    $('#pickOv').hidden = false;
    this.pickLeft = PICK_SECONDS;
    const avail = [0, 1, 2].filter((k) => !this.used[this.side()].includes(k));
    this.mySel = avail[0];
    clearInterval(this.pickT);
    this.pickT = setInterval(() => {
      this.pickLeft--;
      if (this.pickLeft <= 0) { clearInterval(this.pickT); if (!this.locks[this.side()]) { const a = [0, 1, 2].filter((k) => !this.used[this.side()].includes(k)); this.mySel = a[Math.floor(Math.random() * a.length)]; this.lock(); } }
      this.renderPick();
    }, 1000);
    this.renderPick();
  },
  select(k) { if (this.locks[this.side()] || this.used[this.side()].includes(k)) return; this.mySel = k; SFX.click(); this.renderPick(); },
  async lock() {
    const s = this.side();
    if (this.locks[s] || this.mySel == null) return;
    this.myNonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const h = await sha256hex(`${this.mid}:${this.mySel}:${this.myNonce}`);
    this.locks[s] = h; this.myPick = this.mySel;
    this.send({ t: 'lock', h });
    SFX.tone(1320, 0.08, 0.06, 'square');
    this.renderPick(); this.maybeOpen();
  },
  maybeOpen() { if (this.locks[0] && this.locks[1] && this.picks[this.side()] == null) { this.picks[this.side()] = this.myPick; this.send({ t: 'open', k: this.myPick, n: this.myNonce }); this.afterOpen(); } },
  async onOpen(m) {
    const s = 1 - this.side(), k = m.k | 0;
    const h = await sha256hex(`${this.mid}:${k}:${m.n}`);
    if (h !== this.locks[s] || this.used[s].includes(k) || k < 0 || k > 2) { UI.toast('對手的選擇驗證失敗，判對手棄權。'); return this.matchEnd(null, 'peer-ff'); }
    this.picks[s] = k; this.afterOpen();
  },
  afterOpen() {
    if (this.picks[0] == null || this.picks[1] == null) return;
    clearInterval(this.pickT);
    this.renderPick(true);
    if (this.role === 'host') {
      const st = Object.keys(STADIUMS);
      const a = this.peerSafe(0), b = this.peerSafe(1), pick = st[Math.floor(Math.random() * st.length)];
      setTimeout(() => { this.send({ t: 'round', a, b, st: pick }); this.startRound(a, b, pick); }, 1600);
    }
  },
  peerSafe(side) { return { ...this.deckOf(side)[this.picks[side]] }; },
  startRound(a, b, st, replay) {
    if (!this.inMatch) return;
    $('#pickOv').hidden = true;
    if (!replay) for (const s of [0, 1]) if (this.picks[s] != null && !this.used[s].includes(this.picks[s])) this.used[s].push(this.picks[s]);
    this.cur = [cleanDeck([a, a, a])[0], cleanDeck([b, b, b])[0]]; this.st = st;
    GL.battle.setStadium(STADIUMS[st] ? st : 'training');
    Battle.nextRound(!!replay);
  },
  hostReplayRound() { if (!this.inMatch || !this.cur) return; this.send({ t: 'round', a: this.cur[0], b: this.cur[1], st: this.st, replay: 1 }); this.startRound(this.cur[0], this.cur[1], this.st, true); },
  hostAfterRound() {
    if (!this.inMatch) return;
    if (Battle.score[0] >= Battle.winPts || Battle.score[1] >= Battle.winPts) return this.hostMatchEnd();
    this.hostPickPhase();
  },
  hostMatchEnd() { this.send({ t: 'end', score: Battle.score }); this.matchEnd(Battle.score); },
  confirmForfeit() {
    if (!window.confirm(`現在離開會判輸${this.amt ? `，下注的 ${this.amt} 金幣不會退還` : ''}。確定要離開嗎？`)) return;
    this.send({ t: 'ff' });
    this.matchEnd(null, 'me-ff');
    this.leave();
    UI.go('hub');
  },
  matchEnd(score, why) {
    if (!this.inMatch) return;
    this.inMatch = false; clearInterval(this.pickT); clearTimeout(this.lostT); this.lostT = null;
    $('#pickOv').hidden = true; $('#netLost').hidden = true;
    const s = this.side();
    const won = why === 'peer-ff' ? true : why === 'me-ff' ? false : score[s] > score[1 - s];
    const P = Store.profile;
    const gain = won ? this.amt * 2 : why === 'me-ff' ? 0 : CONSOLATION;   // quitting forfeits the consolation too
    P.coins += gain;
    if (won) P.stats.onlineW = (P.stats.onlineW | 0) + 1;
    Store.saveNow();
    this.last = { won, why, score: score || Battle.score.slice(), gain, finishes: Battle.finishes.slice(), log: this.roundLog() };
    Battle.endNet();
    if (why === 'me-ff') return;
    UI.go('online'); this.render('result');
    SFX.coin();
  },
  roundLog() {
    return Battle.finishes.map((f) => ({ ...f }));
  },
  playAgain(amt) {
    amt = Math.max(0, amt | 0);
    if (amt > Store.profile.coins) return UI.toast('金幣不足。');
    if (this.peer && amt > this.peer.coins) return UI.toast('對手的金幣不夠這個下注。');
    if (amt && (this.newbie() || (this.peer && this.newbie(this.peer)))) amt = 0;
    this.again[this.side()] = amt;
    this.send({ t: 'again', amt });
    this.renderResult();
    if (this.role === 'host') this.tryAgain();
  },
  tryAgain() {
    const [a, b] = this.again;
    if (a == null || b == null || a !== b || !this.peer) return;
    const mid = Math.random().toString(36).slice(2, 10);
    this.wager = a; this.send({ t: 'start', amt: a, mid }); this.beginMatch(a, mid);
  },
  emote(k) {
    if (!this.inMatch || performance.now() - this.emoAt < 1200) return;
    this.emoAt = performance.now();
    this.send({ t: 'emo', k });
    this.showEmote(this.side(), k);
  },
  showEmote(side, k) {
    const el = $(side === this.side() ? '#emoMe' : '#emoOp'); if (!el || !EMOTES[k]) return;
    el.textContent = EMOTES[k]; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 2200);
  },

  /* ---- rendering ---- */
  inviteUrl() { return `${location.origin}${location.pathname}?room=${this.code}`; },
  render(view, status) {
    this.view = view;
    $$('#s-online [data-ov]').forEach((el) => (el.hidden = el.dataset.ov !== view));
    if (view === 'room') this.renderRoom(status);
    if (view === 'result') this.renderResult();
  },
  renderStatus(msg) { const el = $('#onStatus'); if (el) el.textContent = msg || (this.peer ? '' : this.role === 'host' ? '等待好友加入…' : '正在進入房間…'); },
  renderPing() { const t = Net.rtt ? `● ${Net.rtt}ms` : ''; $$('.ping-txt').forEach((el) => { el.textContent = t; el.style.color = Net.rtt > 200 ? 'var(--atk)' : Net.rtt > 100 ? 'var(--bal)' : 'var(--sta)'; }); },
  renderRoom(status) {
    if (this.view !== 'room') return;
    const host = this.role === 'host', P = Store.profile, guard = this.newbie() || (this.peer && this.newbie(this.peer));
    $('#onCode').textContent = this.code ? this.code.slice(0, 3) + ' ' + this.code.slice(3) : '------';
    $('#onHostBox').hidden = !host; $('#onGuestBox').hidden = host;
    $$('[data-wg]').forEach((b) => { b.classList.toggle('on', +b.dataset.wg === this.wager); b.disabled = !!guard; });
    $('#wgCustom').disabled = !!guard;
    $('#wgNote').innerHTML = guard ? `新手保護：雙方都要打滿 ${NEWBIE_MATCHES} 場線上對戰才能下注（目前不下注）` : `贏家拿走雙方下注・你有 <b style="color:var(--bal)">${P.coins.toLocaleString('en-US')}</b> 金幣${this.peer ? `・最多可下 ${this.maxWager()}` : ''}`;
    $('#onGuestWager').textContent = `房主設定的下注：${this.wager} 金幣`;
    const card = (who, side, p) => p ? `<div class="on-pl"><div class="av" style="border-color:${side === this.side() ? 'var(--hot)' : 'var(--ice)'}">${side === this.side() ? playerAvatar(72) : avatarSVG(remoteAvatar(p.name), TYPE_HEX[p.starter], 72)}</div><b>${esc(p.name)}</b><small>線上 ${p.online} 場・勝率 ${p.online ? Math.round(p.wins / p.online * 100) : 0}%</small><span class="${this.acc[side] ? 'ok' : 'wait'}">${this.acc[side] ? '✓ 已接受下注' : p === this.peer || side !== this.side() ? '⋯ 確認中' : '尚未接受'}</span></div>` : `<div class="on-pl empty"><div class="av"></div><b>等待對手…</b><small>把房號或連結傳給好友</small></div>`;
    const meP = { name: P.name, starter: P.starter, online: P.stats.online | 0, wins: P.stats.onlineW | 0 };
    const s = this.side();
    $('#onPlayers').innerHTML = (s === 0 ? card('me', 0, meP) : card('peer', 0, this.peer)) + '<div class="on-vs">VS</div>' + (s === 1 ? card('me', 1, meP) : card('peer', 1, this.peer));
    const btn = $('#onAccept');
    btn.disabled = !this.peer || this.acc[s] || this.wager > P.coins;
    btn.textContent = !this.peer ? '等待對手加入' : this.acc[s] ? (this.acc[1 - s] ? '開始對戰！' : '等待對手接受…') : this.wager ? `接受下注 ${this.wager} 金幣` : '準備好了（不下注）';
    this.renderStatus(status);
    this.renderPing();
  },
  renderPick(reveal) {
    const s = this.side(), d = this.deckOf(s), od = this.deckOf(1 - s);
    $('#pkRound').textContent = `ROUND ${Battle.round + 1} · BLIND PICK`;
    $('#pkTimer').textContent = reveal ? 'VS' : String(Math.max(0, this.pickLeft)).padStart(2, '0');
    const T = (cfg) => BLADE[cfg.b].type;
    $('#pkMine').innerHTML = d.map((cfg, k) => {
      const used = this.used[s].includes(k), sel = this.mySel === k;
      return `<button class="pk-card ${used ? 'used' : ''} ${sel ? 'pick-on' : ''}" data-pick="${k}" ${used || this.locks[s] ? 'disabled' : ''}><img src="${Thumbs.get('blade', cfg.b)}" alt=""><b>${esc(BLADE[cfg.b].name)}</b><span class="ty t-${T(cfg)}">${TYPES[T(cfg)].name}</span>${used ? '<small>已出戰</small>' : ''}</button>`;
    }).join('');
    $('#pkTheirs').innerHTML = od.map((cfg, k) => {
      const shown = this.used[1 - s].includes(k) || (reveal && this.picks[1 - s] === k);
      return shown ? `<div class="pk-card ${reveal && this.picks[1 - s] === k ? 'pick-on op' : 'used'}"><img src="${Thumbs.get('blade', cfg.b)}" alt=""><b>${esc(BLADE[cfg.b].name)}</b><span class="ty t-${T(cfg)}">${TYPES[T(cfg)].name}</span></div>` : `<div class="pk-card back">?</div>`;
    }).join('');
    const lk = $('#pkLock');
    lk.disabled = !!this.locks[s] || this.mySel == null;
    lk.textContent = this.locks[s] ? '已鎖定' : this.mySel != null ? `鎖定 ${BLADE[d[this.mySel].b].name}` : '選一顆陀螺';
    $('#pkOpp').textContent = this.locks[1 - s] ? `● ${this.peer.name} 已鎖定` : `${this.peer.name} 選擇中…`;
    $('#pkOpp').style.color = this.locks[1 - s] ? 'var(--sta)' : 'var(--dim)';
    if (reveal) {
      const a = d[this.picks[s]], b = od[this.picks[1 - s]], e = counterOf(a, b);
      $('#pkHint').textContent = e > 0 ? `相剋優勢！對手能力 −10%` : e < 0 ? `被剋了，你的能力 −10%` : '沒有相剋';
    } else $('#pkHint').textContent = '';
  },
  renderResult() {
    if (this.view !== 'result' || !this.last) return;
    const L = this.last, s = this.side();
    $('#orTitle').textContent = L.won ? 'WIN!' : 'LOSE';
    $('#orTitle').classList.toggle('lose', !L.won);
    $('#orScore').innerHTML = L.why ? (L.won ? '對手棄權' : '你已棄權') : `<span style="color:var(--hot)">${L.score[s]}</span> : <span style="color:var(--ice)">${L.score[1 - s]}</span>`;
    $('#orLog').innerHTML = L.finishes.length ? L.finishes.map((f, i) => `<div class="or-row"><b>R${f.round}</b><span>${f.winner === s ? '你' : esc(this.peer ? this.peer.name : '對手')}</span><em style="color:${f.winner === s ? 'var(--hot)' : 'var(--ice)'}">${f.type === 'error' ? '發射失誤' : FINISH[f.type].name} +${f.type === 'error' ? 1 : FINISH[f.type].pts}</em></div>`).join('') : '<div class="desc">沒有完成的回合</div>';
    $('#orGain').textContent = `+${L.gain}`;
    $('#orGainNote').textContent = L.won ? (this.amt ? `拿回自己的 ${this.amt} 並贏得對手的 ${this.amt} 金幣` : '這場沒有下注') : (this.amt ? `下注的 ${this.amt} 金幣歸對手・安慰獎 ${CONSOLATION} 金幣` : `安慰獎 ${CONSOLATION} 金幣`);
    const peer = this.peer, mine = this.again[s], theirs = this.again[1 - s];
    $('#orPeer').innerHTML = !peer ? '<span class="desc">對手已離開房間</span>' : theirs != null ? `<span class="bubble">想再來一局${theirs ? `（${theirs} 金幣）` : ''}！</span>` : `<span class="desc">${esc(peer.name)} 還在房間裡</span>`;
    const base = this.amt || 0;
    $('#orAgain').textContent = mine === base ? '等待對手…' : `再來一局${base ? `（${base}）` : ''}`;
    $('#orAgain').disabled = !peer || mine === base;
    const dbl = base * 2;
    $('#orDouble').hidden = !base;
    $('#orDouble').textContent = mine === dbl && base ? '等待對手…' : `雙倍或歸零（${dbl}）`;
    $('#orDouble').disabled = !peer || (mine === dbl) || dbl > Store.profile.coins || (peer && dbl > peer.coins);
    UI.refreshCoins && UI.refreshCoins();
  },
};
