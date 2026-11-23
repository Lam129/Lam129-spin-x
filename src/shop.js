/* ============================== DEV CONTACT · LEGAL · COIN SHOP ============================== */
const DEV = {
  email: 'kwan.holam129@gmail.com',
  links: [
    { k: 'X', label: 'X（Twitter）', handle: '@jasonkwan_ai', url: 'https://x.com/jasonkwan_ai', bg: '#000' },
    { k: 'IG', label: 'Instagram', handle: '@jasonkwan_ai', url: 'https://www.instagram.com/jasonkwan_ai/', bg: 'linear-gradient(45deg,#f9a825,#e91e63,#7b1fa2)' },
    { k: '@', label: 'Threads', handle: '@jasonkwan.ai', url: 'https://www.threads.net/@jasonkwan.ai', bg: '#111' },
  ],
};
const APP_VERSION = 'v1.7';

const Dev = {
  open() {
    const el = $('#devModal');
    $('#devList').innerHTML = `<div class="dv-row"><span class="dv-ic" style="background:#ea4335">✉</span><span class="dv-t"><b>Email</b><small>${esc(DEV.email)}</small></span><button class="btn cut" data-devcopy="${esc(DEV.email)}">複製</button><a class="btn cut" href="mailto:${esc(DEV.email)}">寄信</a></div>` +
      DEV.links.map((l) => `<div class="dv-row"><span class="dv-ic" style="background:${l.bg}">${l.k}</span><span class="dv-t"><b>${esc(l.label)}</b><small>${esc(l.handle)}</small></span><a class="btn cut" href="${l.url}" target="_blank" rel="noopener">開啟</a></div>`).join('');
    $('#devVer').textContent = APP_VERSION;
    el.hidden = false;
  },
  close() { $('#devModal').hidden = true; },
};

/* gacha odds are computed from the live data so the published numbers can never drift from the game */
function gachaOddsHTML() {
  const counts = {};
  for (const K of Object.values(KINDS)) for (const p of K.list) counts[p.rarity] = (counts[p.rarity] || 0) + 1;
  const total = RARITY_ORDER.reduce((a, r) => a + RARITY[r].w, 0);
  return `<table class="odds"><tr><th>稀有度</th><th>機率</th><th>零件數</th><th>單一零件約</th></tr>` +
    RARITY_ORDER.map((r) => { const pct = RARITY[r].w / total * 100; return `<tr><td class="r-${r}">${RARITY[r].name}</td><td>${pct.toFixed(1)}%</td><td>${counts[r] || 0}</td><td>${(pct / Math.max(1, counts[r] || 1)).toFixed(3)}%</td></tr>`; }).join('') +
    `</table><ul><li>單抽 100 金幣、十連抽 900 金幣；十連抽保證至少一個「稀有」以上。</li><li>連續 60 抽沒有抽到「傳說」，第 60 抽必定是「傳說」。</li><li>同一稀有度內，<b>還沒擁有的零件</b>出現機率是已擁有零件的 3 倍（表中「單一零件約」為全部未擁有時的平均值）。</li></ul>`;
}
const Legal = {
  render() {
    $('#legalBody').innerHTML = `
      <h3>原創聲明</h3>
      <p>《陀螺對決 SPIN DUEL》是個人開發的原創遊戲。所有角色、陀螺與零件設計、名稱、圖像、特效與音效皆為原創，或使用允許商用的授權素材（倒數語音由 Piper TTS 合成，CC0）。本遊戲與任何玩具、動畫或遊戲品牌及其權利人<b>沒有任何關係</b>，亦未獲其授權、贊助或背書。</p>
      <h3>權利人聯絡與下架配合</h3>
      <p>若您認為本遊戲的任何內容侵害您的著作權、商標權或其他權利，請來信 <a href="mailto:${DEV.email}">${DEV.email}</a>，並註明：您的身分與權利內容、涉及的頁面或素材、聯絡方式。我們會在收到通知後 <b>3 個工作天內</b>回覆，確認後立即修改或下架相關內容。</p>
      <h3>扭蛋機率公開</h3>
      ${gachaOddsHTML()}
      <h3>金幣與付費條款</h3>
      <ul>
        <li>金幣是本遊戲內的虛擬道具，只能在本遊戲中使用，<b>不能兌換現金、不能轉讓</b>。</li>
        <li>付款由 Stripe 處理，本站不會接觸或保存您的信用卡資料。</li>
        <li><b>退款</b>：購買後 7 天內，且該筆購買的金幣尚未使用，可來信申請全額退款。已使用的金幣不予退還。重複扣款或未收到金幣，請附上付款收據來信，我們會儘快處理。</li>
        <li>退款完成後，對應的金幣會從帳號中扣回。</li>
        <li>遊戲營運調整或停止服務時，會至少提前 30 天公告；屆時尚未使用的已購金幣可來信申請退款。</li>
      </ul>
      <h3>未成年玩家</h3>
      <p>未滿 18 歲（或您所在地區的成年年齡）的玩家，請在家長或監護人同意並陪同下購買。家長若發現子女未經同意購買，請來信，我們會協助辦理退款。</p>
      <h3>隱私</h3>
      <p>我們只保存遊玩所需的資料：Email、加密後的密碼、暱稱與遊戲進度、購買紀錄。不販售、不分享給第三方（付款資料只交給 Stripe 處理）。如需刪除帳號與資料，請來信。</p>
      <p class="desc">最後更新：2026 年 11 月・版本 ${APP_VERSION}</p>`;
  },
};

const CURRENCY = {
  twd: { sym: 'NT$', div: 100, name: '新台幣' },
  hkd: { sym: 'HK$', div: 100, name: '港幣' },
  usd: { sym: 'US$', div: 100, name: '美元' },
  jpy: { sym: '¥', div: 1, name: '日圓' },
};
const Shop = {
  data: null, cur: null,
  guessCurrency() {
    const l = (navigator.language || '').toLowerCase();
    return l.includes('tw') || l === 'zh-hant' ? 'twd' : l.includes('hk') || l.includes('mo') ? 'hkd' : l.startsWith('ja') ? 'jpy' : 'usd';
  },
  fmt(p, c) { const C = CURRENCY[c]; const v = p[c] / C.div; return C.sym + (C.div === 1 || v % 1 === 0 ? v.toLocaleString('en-US') : v.toFixed(2)); },
  async open() {
    UI.go('shop');
    this.cur = this.cur || this.guessCurrency();
    $('#shopCur').value = this.cur;
    $('#shopPacks').innerHTML = '<div class="desc">讀取中…</div>';
    $('#shopNote').textContent = '';
    if (Store.mode !== 'server') { $('#shopPacks').innerHTML = '<div class="desc">金幣商店需要在公開網站上使用。</div>'; return; }
    try { this.data = await Api.call('GET', '/api/shop'); } catch (e) { $('#shopPacks').innerHTML = '<div class="desc">商店暫時無法連線，請稍後再試。</div>'; return; }
    this.render();
  },
  render() {
    const d = this.data; if (!d) return;
    const c = this.cur, best = d.packs.length - 1;
    $('#shopPacks').innerHTML = d.packs.map((p, i) => {
      const bonus = Math.round((p.coins / d.packs[0].coins / (p.price.usd / d.packs[0].price.usd) - 1) * 100);
      return `<div class="sp-card panel cut">${i === 2 ? '<span class="sp-tag">人氣</span>' : i === best ? '<span class="sp-tag">最划算</span>' : ''}
        <div class="sp-coins">${'<i></i>'.repeat(Math.min(3, 1 + Math.floor(i / 2)))}</div>
        <b class="sp-n">${p.coins.toLocaleString('en-US')}</b>
        <small>金幣${bonus > 0 ? ` <em>+${bonus}%</em>` : ''}</small>
        ${p.first ? `<div class="sp-first">首購雙倍 → ${(p.coins * 2).toLocaleString('en-US')}</div>` : '<div class="sp-first off">　</div>'}
        <button class="btn primary cut" data-buy="${p.id}" ${d.enabled ? '' : 'disabled'}>${this.fmt(p.price, c)}</button></div>`;
    }).join('');
    $('#shopNote').textContent = d.enabled ? '' : '商店即將開放，敬請期待。';
  },
  async buy(pack) {
    if (!(Api.cred && Api.cred.email)) { UI.toast('購買前請先註冊 Email 帳號，金幣才能安全保存在你的帳號裡。'); UI.show('auth'); UI.renderAuth(); UI.setAuthTab('register'); UI.startAuthCycle(); return; }
    if (!$('#shopAge').checked) { UI.toast('請先勾選年齡確認。'); $('#shopAge').focus(); return; }
    const btn = document.querySelector(`[data-buy="${pack}"]`); if (btn) { btn.disabled = true; btn.textContent = '前往付款…'; }
    try {
      const r = await Api.call('POST', '/api/shop/checkout', { pack, currency: this.cur, lang: (typeof I18N !== 'undefined' && I18N.lang) || 'zh-Hant' });
      await Store.saveNow();
      location.href = r.url;
    } catch (e) { UI.toast(e.msg || '無法建立付款，請稍後再試。'); this.render(); }
  },
  /* credit paid purchases (and reverse refunded ones); safe to call often */
  async claim(quiet) {
    if (Store.mode !== 'server' || !(Api.cred && Api.cred.email) || !Store.profile) return;
    try {
      const r = await Api.call('POST', '/api/shop/claim');
      if (r.delta) {
        Store.profile.coins = Math.max(0, Store.profile.coins + r.delta);
        Store.profile.stats.bought = (Store.profile.stats.bought | 0) + Math.max(0, r.delta);
        await Store.saveNow(); UI.refreshCoins();
        UI.toast(r.delta > 0 ? `購買成功！已加入 ${r.delta.toLocaleString('en-US')} 金幣` : `退款已完成，扣回 ${(-r.delta).toLocaleString('en-US')} 金幣`);
        SFX.coin();
      } else if (!quiet) UI.toast('付款處理中，金幣到帳後會自動加入。');
    } catch (e) { /* try again next time */ }
  },
};
