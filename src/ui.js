/* ============================== UI ============================== */
const UI = {
  cur: null, asmTab: 'blade', asmSlot: 0, collTab: 'blade', collSel: null, oppSel: 0, mode: '3v3', starter: 'atk',
  show(name) {
    $$('#ui .screen').forEach((s) => (s.hidden = s.id !== 's-' + name));
    this.cur = name;
  },
  go(name) {
    SFX.click();
    const P = Store.profile;
    if (name !== 'battle' && name !== 'result') GL.setMode('show');
    this.show(name);
    $$('[data-topbar]').forEach((el) => (el.innerHTML = this.topbar(name)));
    const sh = GL.show;
    sh.spinSpeed = 0.6;
    if (name === 'hub') {
      sh.setOffset(0.18); sh.showBey(P.decks[0]);
      const d = P.decks[0], st = beyStats(d);
      $('#hubGreet').textContent = `歡迎回來，${P.name}`;
      $('#hubBeyName').textContent = `${beyName(d)} ${beyCode(d)}`;
      $('#hubBeyTags').innerHTML = `<span class="tag t-${st.type}">${TYPES[st.type].name}</span><span class="tag" style="color:var(--dim)">${st.weight} g</span><span class="tag" style="color:var(--dim)">${P.stats.w} 勝 ${P.stats.l} 敗</span>`;
    }
    if (name === 'assembly') { sh.setOffset(0); this.renderAssembly(true); }
    if (name === 'select') { sh.setOffset(-0.22); this.renderSelect(); }
    if (name === 'gacha') { sh.setOffset(0); sh.clear(); $('#revName').textContent = ''; $('#revEye').textContent = ''; this.renderDome(); }
    if (name === 'collection') { sh.setOffset(0.31); this.renderCollection(); }
    if (name === 'rules') { sh.setOffset(0); sh.clear(); }
  },
  topbar(name) {
    const P = Store.profile; if (!P) return '';
    const titles = { assembly: '組裝工坊', select: '對戰', gacha: '扭蛋機', collection: '收藏圖鑑', rules: '比賽規則' };
    const back = name !== 'hub' ? `<button class="btn cut" data-go="hub" style="padding:8px 14px">‹ 大廳</button>` : '';
    return `${back}<div class="brand">旋鋒對決<small style="font-family:var(--f-disp);color:var(--hot);margin-left:6px;letter-spacing:.2em">SPIN DUEL</small>${titles[name] ? `<small>／ ${titles[name]}</small>` : ''}</div><div class="spacer"></div>
      <div class="chip"><span class="dot ${Store.mode === 'cloud' ? '' : 'off'}"></span><span>${esc(P.name)}</span><span style="color:var(--mute);font-size:12px">${Store.mode === 'cloud' ? '雲端存檔' : '本機存檔'}</span></div>
      <div class="chip"><span class="coin"></span><b class="num" id="coinNum">${P.coins.toLocaleString('en-US')}</b></div>
      <div class="corner">
        <button class="ibtn" data-go="collection" title="收藏圖鑑" aria-label="收藏圖鑑"><svg viewBox="0 0 24 24"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg><span>圖鑑 ${this.ownedCount()}/${BLADES.length + RATCHETS.length + BITS.length}</span></button>
        <button class="ibtn" data-go="rules" title="比賽規則" aria-label="比賽規則"><svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6zM9 10h7M9 14h7M9 18h5"/></svg><span>規則</span></button>
        <button class="ibtn" data-settings title="設定" aria-label="設定"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg><span>設定</span></button>
      </div>`;
  },
  refreshCoins() { const el = $('#coinNum'); if (el) el.textContent = Store.profile.coins.toLocaleString('en-US'); },
  ownedCount() { const inv = Store.profile.inv; return ['blade', 'ratchet', 'bit'].reduce((n, k) => n + Object.values(inv[k]).filter((c) => c > 0).length, 0); },
  toggleSettings(force) {
    const el = $('#settings'); const on = force ?? el.hidden;
    el.hidden = !on;
    if (on) for (const k of ['master', 'sfx', 'voice']) $('#vol-' + k).value = Math.round(SFX.vol[k] * 100);
  },
  toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('show'), 2200); },
  toastTop(msg) { this.toast(msg); },
  banner(en, zh, pts, blue) {
    const b = $('#banner'); $('#bnBig').textContent = en; $('#bnSub').textContent = zh; $('#bnPts').textContent = pts;
    b.classList.toggle('blue', !!blue); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  },

  /* ---------- AUTH ---------- */
  renderAuth() {
    const grid = $('#starterGrid');
    grid.innerHTML = Object.entries(TYPES).map(([k, t]) => `<button type="button" class="starter t-${k}" data-starter="${k}" aria-pressed="${k === this.starter}">${t.name}<small>${esc(beyName(STARTERS[k]))}</small></button>`).join('');
    $('#starterDesc').textContent = `${TYPES[this.starter].desc} 起始陀螺：${beyName(STARTERS[this.starter])} ${beyCode(STARTERS[this.starter])}`;
    GL.show.setOffset(0); GL.show.showBey(STARTERS[this.starter]);
  },
  acctLine() {
    const el = $('#acctLine');
    if (Store.mode === 'cloud') el.innerHTML = `<span class="dot"></span><span>已連結 claude.ai 帳號${Store.accountName ? '：' + esc(Store.accountName) : ''}，進度會存在你的帳號裡</span>`;
    else el.innerHTML = `<span class="dot off"></span><span>目前無法使用雲端帳號，進度會存在這台電腦的瀏覽器裡</span>`;
  },

  /* ---------- ASSEMBLY ---------- */
  renderAssembly(fresh) {
    const P = Store.profile, d = P.decks[this.asmSlot];
    const K = KINDS[this.asmTab];
    $$('[data-ptab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.ptab === this.asmTab));
    const usedBy = {};
    P.decks.forEach((dd, i) => { if (i !== this.asmSlot) usedBy[dd[K.key]] = i + 1; });
    const items = K.list.filter((p) => owns(this.asmTab, p.id));
    $('#plist').innerHTML = items.map((p) => {
      const sel = d[K.key] === p.id;
      const meta = this.asmTab === 'blade' ? `<span class="t-${p.type}">${TYPES[p.type].name}</span><span>${p.wt}g</span>` : this.asmTab === 'ratchet' ? `<span>抗解體 ${Math.round(p.burst * 52)}</span><span>${p.wt}g</span>` : `<span class="t-${p.type}">${TYPES[p.type].name}</span><span>衝刺 ${p.dash}</span>`;
      return `<button class="pcard cut ${usedBy[p.id] ? 'used' : ''}" data-part="${p.id}" aria-pressed="${sel}">
        ${usedBy[p.id] ? `<span class="usedby">${usedBy[p.id]} 號機使用中</span>` : ''}<span class="cnt">×${P.inv[this.asmTab][p.id]}</span>
        <img src="${Thumbs.get(this.asmTab, p.id)}" alt="">
        <span class="pn">${esc(partName(this.asmTab, p))}</span>
        <span class="pm"><span class="r-${p.rarity}">${RARITY[p.rarity].name}</span>${meta}</span></button>`;
    }).join('') || '<div class="desc">還沒有這類零件，去扭蛋機抽抽看吧。</div>';
    this.renderAsmInfo();
    $('#deckSlots').innerHTML = P.decks.map((dd, i) => `<button class="slot cut" data-slot="${i}" aria-pressed="${i === this.asmSlot}"><span class="n">${i + 1}</span><span><div class="sn">${esc(beyName(dd))}</div><div class="sc">${beyCode(dd)}・${TYPES[beyStats(dd).type].name}</div></span></button>`).join('');
    const dup = this.deckDupes();
    $('#deckWarn').textContent = dup ? `牌組內有重複零件（${dup}）。3 對 3 牌組戰中同名零件只能使用一次。` : '';
    if (fresh) GL.show.showBey(d);
  },
  renderAsmInfo() {
    const d = Store.profile.decks[this.asmSlot], st = beyStats(d);
    $('#asmSlotLbl').textContent = `牌組 ${this.asmSlot + 1} 號機`;
    $('#asmName').textContent = beyName(d);
    $('#asmCode').textContent = beyCode(d);
    $('#asmType').innerHTML = `<span class="tag t-${st.type}">${TYPES[st.type].name}</span>`;
    const rows = [['攻擊', st.atk], ['防禦', st.def], ['持久', st.sta], ['衝刺', st.dash], ['抗解體', st.burst]];
    $('#asmStats').innerHTML = rows.map(([k, v]) => `<div class="stat"><span>${k}</span><div class="bar"><i style="width:${v}%"></i></div><span class="num">${v}</span></div>`).join('') + `<div class="stat"><span>總重量</span><span class="num" style="color:var(--fg)">${st.weight} g</span><span></span></div>`;
    const K = KINDS[this.asmTab], part = K.map[d[K.key]];
    $('#asmDesc').innerHTML = `<b style="color:var(--fg)">${esc(K.name)}・${esc(partName(this.asmTab, part))}</b><br>${esc(part.desc)}`;
  },
  deckDupes() {
    const P = Store.profile, out = [];
    for (const [k, K] of Object.entries(KINDS)) {
      const ids = P.decks.map((d) => d[K.key]);
      ids.forEach((id, i) => { if (ids.indexOf(id) !== i) out.push(partName(k, K.map[id])); });
    }
    return [...new Set(out)].join('、');
  },
  pickPart(id) {
    const P = Store.profile, d = P.decks[this.asmSlot], K = KINDS[this.asmTab];
    if (d[K.key] === id) return;
    // swap with another slot if that slot uses it (keeps deck legal)
    const other = P.decks.findIndex((dd, i) => i !== this.asmSlot && dd[K.key] === id);
    if (other >= 0 && (P.inv[this.asmTab][id] | 0) < 2) P.decks[other][K.key] = d[K.key];
    d[K.key] = id;
    Store.save();
    GL.show.swapPart(d, this.asmTab);
    this.renderAssembly(false);
  },

  /* ---------- SELECT ---------- */
  renderSelect() {
    const P = Store.profile;
    this.oppSel = Math.min(this.oppSel, P.ladder);
    $('#ladder').innerHTML = OPPONENTS.map((o, i) => {
      const locked = i > P.ladder, cleared = i < P.ladder;
      return `<button class="opp cut ${locked ? 'locked' : ''}" data-opp="${i}" aria-pressed="${i === this.oppSel}">
        <span class="lv num">${String(i + 1).padStart(2, '0')}</span>
        <span class="av">${locked ? '<span class="avq">?</span>' : oppAvatar(o, 56)}</span>
        <span class="on">${locked ? '？？？' : esc(o.name)}</span><span class="ot">${esc(o.title)}・${TYPES[o.type].name}</span>
        <span class="ot"><span class="coin" style="display:inline-block;width:11px;height:11px;vertical-align:-1px"></span> ${o.reward}</span>
        ${cleared ? '<span class="clr">已擊敗</span>' : ''}</button>`;
    }).join('');
    const o = OPPONENTS[this.oppSel];
    $('#oppName').textContent = `${o.name}・${o.title}`;
    $('#oppAv').innerHTML = oppAvatar(o, 84);
    const S = STADIUMS[o.stadium];
    $('#oppStadium').innerHTML = `<b>${esc(S.name)}</b>・${esc(S.desc)}<br><span style="color:var(--mute)">裂界區 ${S.pockets.filter((p) => p.kind === 'rift').length} 個・場外區 ${S.pockets.filter((p) => p.kind === 'out').length} 個</span>`;
    const od = o.deck.map(([b, r, t]) => `${BLADE[b].name} ${beyCode({ b, r, t })}`);
    $('#oppInfo').innerHTML = `擅長：${TYPES[o.type].name}<br>牌組：${od.map(esc).join('／')}<br>勝利獎金 ${o.reward} 金幣${this.oppSel >= P.ladder ? '，首次擊敗再加 200' : ''}`;
    $$('#modeSeg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === this.mode));
    const decks = this.mode === '3v3' ? P.decks : [P.decks[0]];
    $('#selDeck').innerHTML = decks.map((d, i) => `<div><span>${i + 1}. ${esc(beyName(d))}</span><span class="num" style="color:var(--dim)">${beyCode(d)}</span></div>`).join('');
    const dup = this.mode === '3v3' ? this.deckDupes() : '';
    $('#selWarn').textContent = dup ? `牌組內有重複零件（${dup}），請先到組裝工坊調整。` : '';
    $('#startBattle').disabled = !!dup;
    GL.show.showBey(P.decks[0], false);
  },

  /* ---------- GACHA ---------- */
  renderDome() {
    const cols = ['#ff4141', '#3d8bff', '#2fd27a', '#f6c632', '#ff7a1a', '#c66bff', '#36d3ff'];
    let h = '';
    for (let i = 0; i < 16; i++) {
      const x = 8 + (i % 4) * 21 + (Math.floor(i / 4) % 2) * 9, y = 30 + Math.floor(i / 4) * 16 + rand(-3, 3);
      h += `<span class="cap" style="left:${x}%;top:${y}%;background:linear-gradient(180deg,${cols[i % cols.length]} 50%,#e8ecf6 50%);animation-delay:${(i * 0.05).toFixed(2)}s"></span>`;
    }
    $('#dome').innerHTML = h;
  },
  rollOne(guaranteeRare) {
    let r = Math.random() * 100;
    let rarity = r < RARITY.sr.w ? 'sr' : r < RARITY.sr.w + RARITY.rare.w ? 'rare' : 'common';
    if (guaranteeRare && rarity === 'common') rarity = Math.random() < 0.24 ? 'sr' : 'rare';
    const pool = [];
    for (const [k, K] of Object.entries(KINDS)) for (const p of K.list) if (p.rarity === rarity) pool.push([k, p]);
    const [kind, part] = pick(pool);
    return { kind, part, rarity };
  },
  async pull(n) {
    const P = Store.profile, cost = n === 10 ? 900 : 100;
    if (this._pulling) return;
    if (P.coins < cost) { this.toast(`金幣不足，還差 ${cost - P.coins} 金幣。去對戰賺金幣吧！`); return; }
    SFX.ensure();
    this._pulling = true;
    P.coins -= cost; this.refreshCoins();
    const res = [];
    for (let i = 0; i < n; i++) res.push(this.rollOne(false));
    if (n === 10 && !res.some((r) => r.rarity !== 'common')) res[9] = this.rollOne(true);
    let refund = 0;
    for (const r of res) {
      const had = (P.inv[r.kind][r.part.id] | 0) > 0;
      r.isNew = !had;
      if (had) { refund += 30; r.dup = true; }
      P.inv[r.kind][r.part.id] = (P.inv[r.kind][r.part.id] | 0) + 1;
    }
    P.coins += refund; P.stats.pulls += n;
    Store.save();
    $('#dome').classList.add('shake');
    for (let i = 0; i < 6; i++) SFX.tone(400 + i * 80, 0.06, 0.05, 'square', i * 0.09);
    await wait(700);
    $('#dome').classList.remove('shake');
    const list = $('#pullList'); list.innerHTML = '';
    const best = res.slice().sort((a, b) => ['common', 'rare', 'sr'].indexOf(b.rarity) - ['common', 'rare', 'sr'].indexOf(a.rarity))[0];
    for (let i = 0; i < res.length; i++) {
      const r = res[i];
      const nm = partName(r.kind, r.part);
      const el = document.createElement('div'); el.className = 'pull-item'; el.style.animationDelay = `${i * 0.06}s`;
      el.innerHTML = `<img src="${Thumbs.get(r.kind, r.part.id)}" alt=""><div><div style="font-weight:700">${esc(nm)} ${r.isNew ? '<span class="new">NEW</span>' : ''}</div><div style="font-size:12px;color:var(--dim)">${KINDS[r.kind].name}${r.dup ? '・重複 → +30 金幣' : ''}</div></div><span class="r-${r.rarity}" style="font-weight:700;font-size:12px">${RARITY[r.rarity].name}</span>`;
      list.appendChild(el);
    }
    const show = n === 1 ? res[0] : best;
    GL.show.showPart(show.kind, show.part.id);
    GL.show.spinSpeed = 1.2;
    $('#revEye').innerHTML = `<span class="r-${show.rarity}">${RARITY[show.rarity].name}</span>・${KINDS[show.kind].name}`;
    $('#revName').textContent = partName(show.kind, show.part);
    SFX.rareJingle(show.rarity);
    const sc = GL.show; sc.flash = show.rarity === 'sr' ? 2 : 1;
    this.refreshCoins();
    this._pulling = false;
  },

  /* ---------- COLLECTION ---------- */
  renderCollection() {
    const K = KINDS[this.collTab], inv = Store.profile.inv[this.collTab];
    $$('[data-ctab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.ctab === this.collTab));
    const owned = K.list.filter((p) => inv[p.id] > 0).length;
    const all = this.ownedCount(), total = BLADES.length + RATCHETS.length + BITS.length;
    $('#collProg').innerHTML = `<span>${K.name} <b class="num" style="color:var(--fg)">${owned}/${K.list.length}</b></span><span>全部零件 <b class="num" style="color:var(--fg)">${all}/${total}</b></span><span>總抽數 <b class="num" style="color:var(--fg)">${Store.profile.stats.pulls}</b></span>`;
    if (!this.collSel || this.collSel.kind !== this.collTab) this.collSel = { kind: this.collTab, id: K.list[0].id };
    $('#collGrid').innerHTML = K.list.map((p) => {
      const has = inv[p.id] > 0;
      const nm = partName(this.collTab, p);
      return `<button class="pcard cut ${has ? '' : 'locked'}" data-cpart="${p.id}" aria-pressed="${this.collSel.id === p.id}"><span class="cnt">${has ? '×' + inv[p.id] : ''}</span><img src="${Thumbs.get(this.collTab, p.id)}" alt=""><span class="pn">${has ? esc(nm) : '？？？'}</span><span class="pm"><span class="r-${p.rarity}">${RARITY[p.rarity].name}</span></span></button>`;
    }).join('');
    this.renderCollInfo();
  },
  renderCollInfo() {
    const { kind, id } = this.collSel, K = KINDS[kind], p = K.map[id], has = (Store.profile.inv[kind][id] | 0) > 0;
    const nm = partName(kind, p);
    let stats = '';
    if (kind === 'blade') stats = [['攻擊', p.atk], ['防禦', p.def], ['持久', p.sta]].map(([k, v]) => `<div class="stat"><span>${k}</span><div class="bar"><i style="width:${v}%"></i></div><span class="num">${v}</span></div>`).join('') + `<div class="stat"><span>重量</span><span class="num">${p.wt} g</span><span></span></div>`;
    if (kind === 'ratchet') stats = `<div class="stat"><span>卡榫數</span><span class="num">${p.prongs}</span><span></span></div><div class="stat"><span>高度</span><span class="num">${(p.h / 10).toFixed(1)} mm</span><span></span></div><div class="stat"><span>抗解體</span><div class="bar"><i style="width:${Math.round(p.burst * 52)}%"></i></div><span class="num">${Math.round(p.burst * 52)}</span></div>`;
    if (kind === 'bit') stats = [['衝刺', p.dash], ['移動性', Math.round(p.mob * 80)], ['穩定性', Math.round(p.stab * 100)]].map(([k, v]) => `<div class="stat"><span>${k}</span><div class="bar"><i style="width:${v}%"></i></div><span class="num">${v}</span></div>`).join('');
    $('#collInfo').innerHTML = `<div class="eyebrow">${K.name}・<span class="r-${p.rarity}">${RARITY[p.rarity].name}</span></div><h2 style="font-size:24px;font-weight:900">${has ? esc(nm) : '尚未取得'}</h2>${p.type ? `<div><span class="tag t-${p.type}">${TYPES[p.type].name}</span></div>` : ''}${has ? stats : ''}<div class="desc">${has ? esc(p.desc) : '在扭蛋機抽到這個零件後就能看到完整資料。'}</div>`;
    GL.show.showPart(kind, id);
    if (!has) GL.show.obj.traverse((n) => { if (n.isMesh) { n.material = new THREE.MeshStandardMaterial({ color: 0x0b0e16, roughness: 1 }); } });
  },
};

/* ============================== EVENTS / BOOT ============================== */
function bindEvents() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    SFX.ensure();
    if (t.dataset.go) return UI.go(t.dataset.go);
    if (t.hasAttribute('data-settings')) return UI.toggleSettings();
    if (t.id === 'setClose') return UI.toggleSettings(false);
    if (t.id === 'voiceTest') { SFX.ensure(); return SFX.say('三、二、一，旋鋒出擊！'); }
    if (t.dataset.starter) { UI.starter = t.dataset.starter; SFX.click(); return UI.renderAuth(); }
    if (t.dataset.ptab) { UI.asmTab = t.dataset.ptab; SFX.click(); return UI.renderAssembly(false); }
    if (t.dataset.part) { SFX.click(); return UI.pickPart(t.dataset.part); }
    if (t.dataset.slot) { UI.asmSlot = +t.dataset.slot; SFX.click(); return UI.renderAssembly(true); }
    if (t.dataset.opp) { UI.oppSel = +t.dataset.opp; SFX.click(); return UI.renderSelect(); }
    if (t.dataset.mode) { UI.mode = t.dataset.mode; SFX.click(); return UI.renderSelect(); }
    if (t.dataset.ctab) { UI.collTab = t.dataset.ctab; UI.collSel = null; SFX.click(); return UI.renderCollection(); }
    if (t.dataset.cpart) { UI.collSel = { kind: UI.collTab, id: t.dataset.cpart }; SFX.click(); return UI.renderCollection(); }
  });
  $('#authForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#nick').value.trim();
    if (name.length < 2) { $('#authWarn').textContent = '暱稱至少要 2 個字。'; return; }
    SFX.ensure(); SFX.coin();
    Store.profile = newProfile(name, UI.starter);
    Store.saveNow();
    UI.go('hub');
  });
  $('#startBattle').addEventListener('click', () => Battle.start(OPPONENTS[UI.oppSel], UI.mode));
  $('#quitBattle').addEventListener('click', () => Battle.quit());
  $('#spBtn').addEventListener('click', () => Battle.useSpecial(0));
  window.addEventListener('keydown', (e) => { if (!Battle.active) return; if (Battle.cine) { e.preventDefault(); return Battle.skipCine(); } if (e.code === 'Space') { e.preventDefault(); Battle.useSpecial(0); } });
  $('#cine').addEventListener('pointerdown', () => Battle.skipCine());
  $('#resAgain').addEventListener('click', () => Battle.start(Battle.opp, Battle.mode));
  $('#resHome').addEventListener('click', () => UI.go('hub'));
  $('#pull1').addEventListener('click', () => UI.pull(1));
  $$('[data-vol]').forEach((el) => el.addEventListener('input', () => SFX.setVol(el.dataset.vol, el.value / 100)));
  $('#pull10').addEventListener('click', () => UI.pull(10));
  Launcher.init();
}
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (Battle.active || UI.cur === 'battle') Battle.update(dt);
  GL.render(dt);
  requestAnimationFrame(loop);
}
async function boot() {
  if (!window.THREE) { $('#loading').textContent = '3D 引擎載入失敗，請重新整理頁面。'; return; }
  if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
  await Assets.load((f) => { $('#loading').textContent = `LOADING MODELS ${Math.round(f * 100)}%`; });
  GL.init();
  bindEvents();
  requestAnimationFrame(loop);
  const p = await Store.init();
  $('#loading').hidden = true;
  if (p) UI.go('hub');
  else {
    UI.show('auth'); UI.acctLine(); UI.renderAuth();
    if (Store.accountName) $('#nick').value = Store.accountName.slice(0, 12);
  }
}
boot();
