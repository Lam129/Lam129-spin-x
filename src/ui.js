/* ============================== UI ============================== */
const UI = {
  cur: null, asmTab: 'blade', asmBuild: null, collTab: 'blade', collSel: null, oppSel: 0, mode: '3v3', starter: 'atk',
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
    if (name === 'hub') { sh.setOffset(-0.08); this.renderHub(); }
    if (name === 'assembly') { sh.setOffset(0); this.renderAssembly(true); }
    if (name === 'select') { sh.setOffset(-0.22); this.renderSelect(); }
    if (name === 'gacha') { sh.setOffset(0); sh.clear(); $('#revName').textContent = ''; $('#revEye').textContent = ''; this.renderDome(); }
    if (name === 'collection') { sh.setOffset(0.31); this.renderCollection(); }
    if (name === 'rules') { sh.setOffset(0); sh.clear(); }
  },
  renderHub() {
    const P = Store.profile;
    const w = P.stats.w | 0;
    const rank = w >= 60 ? '傳說旋鬥士' : w >= 30 ? '黃金旋鬥士' : w >= 12 ? '白銀旋鬥士' : w >= 3 ? '青銅旋鬥士' : '新手旋鬥士';
    $('#lbName').textContent = P.name;
    $('#lbRank').textContent = rank;
    $('#lbStats').innerHTML = `<span><b>${w}</b>勝場</span><span><b class="hot">${P.stats.best | 0}</b>最高連勝</span><span><b>${this.ownedCount()}/${BLADES.length + RATCHETS.length + BITS.length}</b>圖鑑</span>`;
    const o = OPPONENTS[Math.min(P.ladder, OPPONENTS.length - 1)];
    $('#lbStory').textContent = P.ladder >= OPPONENTS.length ? '已全部擊敗・可重新挑戰' : `第 ${P.ladder + 1} 關・${STADIUMS[o.stadium].name}・${o.name}`;
    $('#lbSurv').textContent = `每位挑戰者先取 ${SURV_WIN_POINTS} 分・最高 ${P.stats.best | 0} 連勝`;
    this.hubBey = this.hubBey || 0;
    this.renderHubBey();
    this.renderBoard();
  },
  renderHubBey() {
    const P = Store.profile, d = P.decks[this.hubBey];
    GL.show.showBey(d);
    $('#lbBeyName').textContent = beyName(d);
    $('#lbBeySlot').textContent = `出戰陀螺 · ${this.hubBey + 1} 號機 · ${beyCode(d)}`;
    $('#lbDeck').innerHTML = P.decks.map((dd, k) => `<button class="lbdk ${k === this.hubBey ? 'on' : ''}" data-showbey="${k}" aria-label="${esc(beyName(dd))}"><img src="${Thumbs.get('blade', dd.b)}" alt=""></button>`).join('');
  },
  medal(n) {
    const c = [['#ffd54a', '#b8860b'], ['#e6ebf3', '#8a94a6'], ['#e09a5a', '#8a4a1e']][n - 1];
    return `<svg width="36" height="40" viewBox="0 0 40 44" aria-label="第 ${n} 名"><path d="M10 0 L18 16 L13 18 L4 2Z" fill="#c8302a"/><path d="M30 0 L22 16 L27 18 L36 2Z" fill="#2a5ac8"/><circle cx="20" cy="27" r="15" fill="${c[1]}"/><circle cx="20" cy="27" r="12" fill="${c[0]}" stroke="${c[1]}" stroke-width="2"/>${n === 1 ? '<path d="M12 22 L15 30 L25 30 L28 22 L23.5 26 L20 20 L16.5 26Z" fill="#7a4a00"/>' : `<text x="20" y="32" text-anchor="middle" font-family="Chakra Petch,sans-serif" font-weight="700" font-size="14" fill="#2a1a0a">${n}</text>`}</svg>`;
  },
  async renderBoard() {
    const box = $('#lbBoard');
    box.innerHTML = '<div class="desc">讀取中…</div>';
    const rows = await Board.top(5);
    const me = Board.myId();
    $('#lbBoardNote').textContent = Board.backend === 'local' ? '本機紀錄' : 'ALL TIME';
    box.innerHTML = rows.length ? rows.map((r, i) => `<div class="lr ${i === 0 ? 'g' : i === 1 ? 's2' : i === 2 ? 'b3' : ''} ${r.id === me ? 'me' : ''}">${i < 3 ? this.medal(i + 1) : `<span class="rn">${i + 1}</span>`}<span class="ln">${esc(r.name || '旋鬥士')}${r.id === me ? '（你）' : ''}</span><span class="s">${r.best | 0}<small>連勝</small></span></div>`).join('')
      : '<div class="desc" style="padding:10px 4px">還沒有紀錄。挑戰生存模式，成為第一名！</div>';
  },
  topbar(name) {
    const P = Store.profile; if (!P) return '';
    const titles = { assembly: '組裝工坊', select: '對戰', gacha: '扭蛋機', collection: '收藏圖鑑', rules: '比賽規則' };
    const back = name !== 'hub' ? `<button class="btn cut" data-go="hub" style="padding:8px 14px" aria-label="返回">‹ 返回</button>` : '';
    return `${back}<div class="brand">陀螺對決<small style="font-family:var(--f-disp);color:var(--hot);margin-left:6px;letter-spacing:.2em">SPIN DUEL</small>${titles[name] ? `<small>／ ${titles[name]}</small>` : ''}</div><div class="spacer"></div>
      <div class="chip"><span class="dot ${Store.mode === 'cloud' || Store.mode === 'server' ? '' : 'off'}"></span><span>${esc(P.name)}</span><span style="color:var(--mute);font-size:12px">${Store.mode === 'cloud' || Store.mode === 'server' ? '雲端存檔' : '本機存檔'}</span></div>
      <div class="chip"><span class="coin"></span><b class="num" id="coinNum">${P.coins.toLocaleString('en-US')}</b></div>
      <div class="corner">${name === 'hub' ? '' : `
        <button class="ibtn" data-go="collection" title="收藏圖鑑" aria-label="收藏圖鑑"><svg viewBox="0 0 24 24"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg><span>圖鑑 ${this.ownedCount()}/${BLADES.length + RATCHETS.length + BITS.length}</span></button>
        <button class="ibtn" data-go="rules" title="比賽規則" aria-label="比賽規則"><svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6zM9 10h7M9 14h7M9 18h5"/></svg><span>規則</span></button>`}
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
    else if (Store.mode === 'server') el.innerHTML = `<span class="dot"></span><span>已建立訪客帳號，進度會自動存到雲端（同一台電腦、同一個瀏覽器）</span>`;
    else el.innerHTML = `<span class="dot off"></span><span>目前無法使用雲端帳號，進度會存在這台電腦的瀏覽器裡</span>`;
  },

  /* ---------- ASSEMBLY ---------- */
  curBuild() {
    const P = Store.profile;
    if (!P.builds.find((x) => x.id === this.asmBuild)) this.asmBuild = P.deckIds[0];
    return P.builds.find((x) => x.id === this.asmBuild);
  },
  renderAssembly(fresh) {
    const P = Store.profile, d = this.curBuild();
    const K = KINDS[this.asmTab];
    $$('[data-ptab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.ptab === this.asmTab));
    const items = K.list.filter((p) => owns(this.asmTab, p.id));
    $('#plist').innerHTML = items.map((p) => {
      const sel = d[K.key] === p.id;
      const meta = this.asmTab === 'blade' ? `<span class="t-${p.type}">${TYPES[p.type].name}</span><span>${p.wt}g</span>` : this.asmTab === 'ratchet' ? `<span>抗解體 ${Math.round(p.burst * 52)}</span><span>${p.wt}g</span>` : `<span class="t-${p.type}">${TYPES[p.type].name}</span><span>衝刺 ${p.dash}</span>`;
      return `<button class="pcard cut" data-part="${p.id}" aria-pressed="${sel}">
        <span class="cnt">×${P.inv[this.asmTab][p.id]}</span>
        ${Thumbs.lazy(this.asmTab, p.id)}
        <span class="pn">${esc(partName(this.asmTab, p))}</span>
        <span class="pm"><span class="r-${p.rarity}">${RARITY[p.rarity].name}</span>${meta}</span></button>`;
    }).join('') || '<div class="desc">還沒有這類零件，去扭蛋機抽抽看吧。</div>';
    Thumbs.observe($('#plist'));
    this.renderAsmInfo();
    // build library (bottom dock): horizontal cards, drag onto deck slots
    const slotOf = (id) => P.deckIds.indexOf(id);
    $('#buildList').innerHTML = `<button class="bcard new" data-bact="new"><i>＋</i>新組裝</button>` + P.builds.map((b) => {
      const sl = slotOf(b.id);
      return `<button class="bcard" data-build="${b.id}" data-drag="build" aria-pressed="${b.id === d.id}">
        ${sl >= 0 ? `<span class="bslot">${sl + 1} 號機</span>` : ''}<img src="${Thumbs.get('blade', b.b)}" alt=""><b>${esc(beyName(b))}</b><small>${beyCode(b)}</small></button>`;
    }).join('');
    const sl = slotOf(d.id);
    $('#buildActs').innerHTML = `<button class="btn cut" data-bact="copy">複製</button><button class="btn cut" data-bact="del" ${sl >= 0 || P.builds.length <= 3 ? 'disabled title="預設牌組中的陀螺不能刪除"' : ''}>刪除</button>`;
    $('#deckSlots').innerHTML = P.deckIds.map((id, k) => { const b = P.builds.find((x) => x.id === id); return `<button class="dslot" data-slotdrop="${k}" data-build="${id}" data-drag="slot" aria-pressed="${id === d.id}"><img src="${Thumbs.get('blade', b.b)}" alt=""><span class="meta"><span class="top"><span class="n">${k + 1}</span><span class="sn">${esc(beyName(b))}</span></span><span class="sc">${beyCode(b)}・${TYPES[beyStats(b).type].name}</span></span></button>`; }).join('');
    const dup = this.deckDupes();
    $('#deckWarn').textContent = dup ? `有重複零件：${dup}` : '';
    if (fresh) GL.show.showBey(d);
  },
  renderAsmInfo() {
    const P = Store.profile, d = this.curBuild(), st = beyStats(d), sl = P.deckIds.indexOf(d.id);
    $('#asmSlotLbl').textContent = sl >= 0 ? `預設牌組 ${sl + 1} 號機` : `我的陀螺（未放入牌組）`;
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
    const P = Store.profile, d = this.curBuild(), K = KINDS[this.asmTab];
    if (d[K.key] === id) return;
    d[K.key] = id;
    syncDecks(P); Store.save();
    GL.show.swapPart(d, this.asmTab);
    this.renderAssembly(false);
  },
  buildAction(act) {
    const P = Store.profile, d = this.curBuild();
    if (act === 'new' || act === 'copy') {
      const src = act === 'copy' ? d : { b: BLADES.find((x) => owns('blade', x.id)).id, r: RATCHETS.find((x) => owns('ratchet', x.id)).id, t: BITS.find((x) => owns('bit', x.id)).id };
      const id = 'b' + Date.now().toString(36);
      P.builds.push({ id, b: src.b, r: src.r, t: src.t });
      this.asmBuild = id;
    } else if (act === 'del') {
      if (P.deckIds.includes(d.id) || P.builds.length <= 3) return;
      P.builds = P.builds.filter((x) => x.id !== d.id);
      this.asmBuild = P.deckIds[0];
    }
    syncDecks(P); Store.save(); this.renderAssembly(true);
  },
  setSlot(k, buildId) {
    const P = Store.profile, id = buildId || this.curBuild().id;
    const other = P.deckIds.indexOf(id);
    if (other === k) return;
    if (other >= 0) P.deckIds[other] = P.deckIds[k]; // swap positions
    P.deckIds[k] = id;
    syncDecks(P); Store.save(); this.renderAssembly(false);
    this.toast(`已放入預設牌組 ${k + 1} 號機`); SFX.tone(1320, 0.08, 0.08, 'square'); SFX.tone(1760, 0.12, 0.06, 'square', 0.06);
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
    $('#oppInfo').innerHTML = `擅長：${TYPES[o.type].name}<br>牌組：${od.map(esc).join('／')}<br>勝利獎金 ${o.reward} 金幣${this.oppSel >= P.ladder ? '，首次擊敗再加 120' : ''}`;
    $$('#modeSeg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === this.mode));
    const decks = this.mode === '3v3' ? P.decks : [P.decks[0]];
    $('#selDeck').innerHTML = decks.map((d, i) => `<div><span>${i + 1}. ${esc(beyName(d))}</span><span class="num" style="color:var(--dim)">${beyCode(d)}</span></div>`).join('');
    const dup = this.mode === '3v3' ? this.deckDupes() : '';
    $('#selWarn').textContent = dup ? `牌組內有重複零件（${dup}），請先到組裝工坊調整。` : '';
    $('#startBattle').disabled = !!dup;
    GL.show.showBey(P.decks[0], false);
  },

  /* ---------- GACHA ---------- */
  rollOne(guaranteeRare) {
    let r = Math.random() * 100, rarity = 'common';
    for (const k of ['ur', 'sr', 'rare']) { if (r < RARITY[k].w) { rarity = k; break; } r -= RARITY[k].w; }
    if (guaranteeRare && rarity === 'common') { const q = Math.random(); rarity = q < 0.07 ? 'ur' : q < 0.3 ? 'sr' : 'rare'; }
    const P = Store.profile;
    P.pity = (P.pity | 0) + 1;
    if (P.pity >= 60) rarity = 'ur';          // pity: guaranteed legendary within 60 pulls
    if (rarity === 'ur') P.pity = 0;
    const pool = [];
    for (const [k, K] of Object.entries(KINDS)) for (const p of K.list) if (p.rarity === rarity) pool.push([k, p, (P.inv[k][p.id] | 0) ? 1 : 3]);
    let w = Math.random() * pool.reduce((a, x) => a + x[2], 0);
    const hit = pool.find((x) => (w -= x[2]) <= 0) || pool[0];
    return { kind: hit[0], part: hit[1], rarity };
  },
  /* ---------- gacha ceremony ---------- */
  async pull(n) {
    const P = Store.profile, cost = n === 10 ? 900 : 100;
    if (this._pulling) return;
    if (P.coins < cost) { this.toast(`金幣不足，還差 ${cost - P.coins} 金幣。去對戰賺金幣吧！`); return; }
    SFX.ensure();
    this._pulling = true; this._skip = false;
    P.coins -= cost; this.refreshCoins();
    const res = [];
    for (let i = 0; i < n; i++) res.push(this.rollOne(false));
    if (n === 10 && !res.some((r) => r.rarity !== 'common')) res[9] = this.rollOne(true);
    let refund = 0;
    for (const r of res) {
      r.had = P.inv[r.kind][r.part.id] | 0;
      r.isNew = !r.had;
      if (r.had) { refund += 10; r.dup = true; }
      P.inv[r.kind][r.part.id] = r.had + 1;
    }
    P.coins += refund; P.stats.pulls += n;
    Store.save();
    const rank = (r) => RARITY_ORDER.indexOf(r.rarity);
    const best = res.reduce((a, b) => (rank(b) > rank(a) ? b : a));
    // 1) crank + capsule drop
    const dome = $('#dome'), crank = $('#crank');
    dome.classList.add('shake'); crank.classList.add('turn');
    for (let i = 0; i < 8; i++) SFX.tone(320 + i * 60, 0.05, 0.05, 'square', i * 0.08);
    await wait(this._skip ? 0 : 750);
    dome.classList.remove('shake'); crank.classList.remove('turn');
    const ov = $('#gcOverlay'); ov.hidden = false; ov.className = 'gc-ov r-' + best.rarity;
    $('#gcRow').innerHTML = res.map((r, k) => `<div class="gc-cap c-${r.rarity}" style="--d:${(k * 0.05).toFixed(2)}s" data-k="${k}"><i class="t"></i><i class="b"></i></div>`).join('');
    $('#gcCard').hidden = true; $('#gcSum').hidden = true;
    SFX.tone(160, 0.3, 0.2, 'sine', 0, 90);
    await wait(this._skip ? 0 : 600);
    // 2) build-up: the capsule glows in the colour of the best rarity it holds
    ov.classList.add('charge');
    SFX.gachaCharge(best.rarity);
    await wait(this._skip ? 0 : (best.rarity === 'ur' ? 2000 : best.rarity === 'sr' ? 1500 : best.rarity === 'rare' ? 1100 : 750));
    // 3) open each capsule in turn
    for (let k = 0; k < res.length; k++) {
      const r = res[k], cap = $(`#gcRow [data-k="${k}"]`);
      cap.classList.add('open'); ov.classList.add('flash-' + r.rarity);
      SFX.rareJingle(r.rarity); SFX.tone(1200, 0.08, 0.06, 'square');
      if (n === 1 || r.rarity === 'sr' || r.rarity === 'ur' || (k === res.length - 1 && n === 10)) {
        this.showCard(r); cap.innerHTML += `<img src="${Thumbs.get(r.kind, r.part.id)}" alt="">`;
        GL.show.showPart(r.kind, r.part.id); GL.show.spinSpeed = 1.4; GL.show.flash = r.rarity === 'ur' ? 3 : r.rarity === 'sr' ? 2.2 : 1.2;
        await wait(this._skip ? 120 : (r.rarity === 'ur' ? 2300 : r.rarity === 'sr' ? 1700 : 1100));
      } else {
        cap.innerHTML += `<img src="${Thumbs.get(r.kind, r.part.id)}" alt="">`;
        await wait(this._skip ? 30 : 260);
      }
      ov.classList.remove('flash-' + r.rarity);
    }
    // 4) summary
    if (n === 10) this.showSummary(res); else $('#gcClose').hidden = false;
    this.renderPullList(res); this.renderPool();
    $('#revEye').innerHTML = `<span class="r-${best.rarity}">${RARITY[best.rarity].name}</span>・${KINDS[best.kind].name}`;
    $('#revName').textContent = partName(best.kind, best.part);
    this.refreshCoins();
    this._pulling = false;
  },
  showCard(r) {
    const c = $('#gcCard'); c.hidden = false; c.className = 'gc-card cut r-' + r.rarity;
    const stars = RARITY_ORDER.indexOf(r.rarity) + 1;
    c.innerHTML = `<div class="gc-stars">${'★'.repeat(stars)}${'☆'.repeat(4 - stars)}</div>
      <div class="gc-kind">${RARITY[r.rarity].name}・${KINDS[r.kind].name}</div>
      <div class="gc-name">${esc(partName(r.kind, r.part))}</div>
      ${r.isNew ? '<div class="gc-new">NEW！ 首次取得</div>' : `<div class="gc-dup">已擁有 ×${r.had} → 轉換為 <span class="coin"></span> 10</div>`}`;
    void c.offsetWidth; c.classList.add('in');
  },
  showSummary(res) {
    const s = $('#gcSum'); s.hidden = false; $('#gcCard').hidden = true;
    s.innerHTML = `<div class="eyebrow" style="margin-bottom:8px">10 連抽結果</div><div class="gc-grid">${res.map((r) => `<div class="gc-it r-${r.rarity} ${r.isNew ? 'isnew' : ''}"><img src="${Thumbs.get(r.kind, r.part.id)}" alt=""><b>${esc(partName(r.kind, r.part))}</b><small>${r.isNew ? 'NEW' : `已擁有 ×${r.had}`}</small></div>`).join('')}</div>
      <div class="desc" style="margin-top:8px">新零件 ${res.filter((r) => r.isNew).length} 個・重複 ${res.filter((r) => r.dup).length} 個（共退還 ${res.filter((r) => r.dup).length * 10} 金幣）</div>`;
    $('#gcClose').hidden = false;
  },
  closeGacha() { $('#gcOverlay').hidden = true; $('#gcClose').hidden = true; },
  renderPullList(res) {
    const list = $('#pullList'); list.innerHTML = '';
    res.forEach((r, i) => {
      const el = document.createElement('div'); el.className = 'pull-item'; el.style.animationDelay = `${i * 0.04}s`;
      el.innerHTML = `<img src="${Thumbs.get(r.kind, r.part.id)}" alt=""><div><div style="font-weight:700">${esc(partName(r.kind, r.part))} ${r.isNew ? '<span class="new">NEW</span>' : '<span class="own">已擁有</span>'}</div><div style="font-size:12px;color:var(--dim)">${KINDS[r.kind].name}${r.dup ? '・重複 → +10 金幣' : ''}</div></div><span class="r-${r.rarity}" style="font-weight:700;font-size:12px">${RARITY[r.rarity].name}</span>`;
      list.appendChild(el);
    });
  },
  /* prize pool: every part, owned ones lit with count, missing ones dimmed */
  renderPool() {
    const P = Store.profile, inv = P.inv;
    const all = [];
    for (const [k, K] of Object.entries(KINDS)) for (const p of K.list) all.push([k, p]);
    const owned = all.filter(([k, p]) => (inv[k][p.id] | 0) > 0).length;
    $('#poolHead').innerHTML = `獎池一覽 <span class="num" style="color:var(--hot)">${owned}</span><span style="color:var(--dim)"> / ${all.length} 已擁有</span>`;
    const order = ['ur', 'sr', 'rare', 'common'];
    $('#poolGrid').innerHTML = order.map((rr) => `<div class="pool-r r-${rr}">${RARITY[rr].name}</div>` + all.filter(([, p]) => p.rarity === rr).map(([k, p]) => {
      const c = inv[k][p.id] | 0;
      return `<div class="pool-it ${c ? 'have' : 'miss'}" title="${esc(partName(k, p))}">${Thumbs.lazy(k, p.id)}<span>${c ? '×' + c : '未擁有'}</span></div>`;
    }).join('')).join('');
    Thumbs.observe($('#poolGrid'));
  },
  renderDome() {
    const cols = ['#ff4141', '#3d8bff', '#2fd27a', '#f6c632', '#ff7a1a', '#c66bff', '#36d3ff'];
    let h = '';
    for (let i = 0; i < 16; i++) {
      const x = 8 + (i % 4) * 21 + (Math.floor(i / 4) % 2) * 9, y = 30 + Math.floor(i / 4) * 16 + rand(-3, 3);
      h += `<span class="cap" style="left:${x}%;top:${y}%;background:linear-gradient(180deg,${cols[i % cols.length]} 50%,#e8ecf6 50%);animation-delay:${(i * 0.05).toFixed(2)}s"></span>`;
    }
    $('#dome').innerHTML = h;
    this.renderPool();
  },

  /* ---------- COLLECTION ---------- */
  renderCollection() {
    const K = KINDS[this.collTab], inv = Store.profile.inv[this.collTab];
    $$('[data-ctab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.ctab === this.collTab));
    const owned = K.list.filter((p) => inv[p.id] > 0).length;
    const all = this.ownedCount(), total = BLADES.length + RATCHETS.length + BITS.length;
    $('#collProg').innerHTML = `<span>${K.name} <b class="num" style="color:var(--fg)">${owned}/${K.list.length}</b></span><span>全部零件 <b class="num" style="color:var(--fg)">${all}/${total}</b></span><span>總抽數 <b class="num" style="color:var(--fg)">${Store.profile.stats.pulls}</b></span>`;
    if (!this.collSel || this.collSel.kind !== this.collTab) this.collSel = { kind: this.collTab, id: K.list[0].id };
    const bases = K.list.filter((p) => p.base === p.id);
    $('#collGrid').innerHTML = bases.map((bp) => {
      const fam = K.list.filter((p) => p.base === bp.id);
      const got = fam.filter((p) => inv[p.id] > 0).length;
      return `<div class="cg-row"><div class="cg-h"><b>${esc(this.collTab === 'ratchet' ? bp.code : bp.name)}</b><span>${got}/${fam.length}</span></div><div class="cg-items">` + fam.map((p) => {
        const has = inv[p.id] > 0;
        return `<button class="pcard cut ${has ? '' : 'locked'}" data-cpart="${p.id}" aria-pressed="${this.collSel.id === p.id}"><span class="cnt">${has ? '×' + inv[p.id] : ''}</span>${Thumbs.lazy(this.collTab, p.id)}<span class="pn">${has ? esc(p.series) : '？？？'}</span><span class="pm"><span class="r-${p.rarity}">${RARITY[p.rarity].name}</span></span></button>`;
      }).join('') + '</div></div>';
    }).join('');
    Thumbs.observe($('#collGrid'));
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
    const t = e.target.closest('button'); if (!t || UI._suppressClick) return;
    SFX.ensure();
    if (t.dataset.go === 'survival') { SFX.click(); return Battle.startSurvival(); }
    if (t.dataset.go === 'online') { SFX.click(); return UI.toast('線上對戰開發中，敬請期待！'); }
    if (t.dataset.showbey) { SFX.click(); UI.hubBey = +t.dataset.showbey; return UI.renderHubBey(); }
    if (t.dataset.go) return UI.go(t.dataset.go);
    if (t.hasAttribute('data-settings')) return UI.toggleSettings();
    if (t.id === 'setClose') return UI.toggleSettings(false);
    if (t.id === 'voiceTest') { SFX.ensure(); [0, 1, 2, 3].forEach((k) => setTimeout(() => SFX.announce(k), k * 700)); return; }
    if (t.dataset.starter) { UI.starter = t.dataset.starter; SFX.click(); return UI.renderAuth(); }
    if (t.dataset.ptab) { UI.asmTab = t.dataset.ptab; SFX.click(); return UI.renderAssembly(false); }
    if (t.dataset.part) { SFX.click(); return UI.pickPart(t.dataset.part); }
    if (t.dataset.build) { UI.asmBuild = t.dataset.build; SFX.click(); return UI.renderAssembly(true); }
    if (t.dataset.setslot) { SFX.click(); return UI.setSlot(+t.dataset.setslot); }
    if (t.dataset.bact) { SFX.click(); return UI.buildAction(t.dataset.bact); }
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
  $('#resAgain').addEventListener('click', () => Battle.again());
  $('#resHome').addEventListener('click', () => UI.go('hub'));
  // drag a build card (or a filled slot) onto one of the 3 deck slots
  (() => {
    let drag = null;
    const ghost = $('#dragGhost');
    document.addEventListener('pointerdown', (e) => {
      const src = e.target.closest('[data-drag]'); if (!src || UI.cur !== 'assembly') return;
      drag = { id: src.dataset.build, from: src.dataset.drag === 'slot' ? +src.dataset.slotdrop : -1, x: e.clientX, y: e.clientY, on: false, src };
    });
    document.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (!drag.on && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
        drag.on = true; const b = Store.profile.builds.find((x) => x.id === drag.id);
        ghost.innerHTML = `<img src="${Thumbs.get('blade', b.b)}" alt=""><span>${esc(beyName(b))}</span>`; ghost.hidden = false;
        document.body.style.cursor = 'grabbing';
      }
      if (!drag.on) return;
      ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
      const over = document.elementFromPoint(e.clientX, e.clientY);
      const slot = over && over.closest('[data-slotdrop]');
      $$('.dslot').forEach((x) => x.classList.toggle('over', x === slot));
    });
    const end = (e) => {
      if (!drag) return;
      const d0 = drag; drag = null; ghost.hidden = true; document.body.style.cursor = '';
      $$('.dslot').forEach((x) => x.classList.remove('over'));
      if (!d0.on) return;
      const over = document.elementFromPoint(e.clientX, e.clientY);
      const slot = over && over.closest('[data-slotdrop]');
      if (slot) UI.setSlot(+slot.dataset.slotdrop, d0.id);
      UI._suppressClick = true; setTimeout(() => (UI._suppressClick = false), 0);
    };
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', () => { drag = null; ghost.hidden = true; $$('.dslot').forEach((x) => x.classList.remove('over')); });
  })();
  $('#pull1').addEventListener('click', () => UI.pull(1));
  $$('[data-vol]').forEach((el) => el.addEventListener('input', () => SFX.setVol(el.dataset.vol, el.value / 100)));
  $('#pull10').addEventListener('click', () => UI.pull(10));
  $('#gcClose').addEventListener('click', () => UI.closeGacha());
  $('#gcOverlay').addEventListener('pointerdown', () => { if (UI._pulling) UI._skip = true; });
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
