/* 陀螺對決 public backend — Cloudflare Worker + D1 + Durable Objects (all on the free plan).
   Routes:
     POST /api/guest                → create an anonymous account   → { id, token }
     POST /api/register             → { email, password, name? } create an account (binds the current guest if signed in) → { id, token, email }
     POST /api/login                → { email, password }           → { id, token, email }
     POST /api/logout               → end this session
     GET  /api/profile              → load my save                  (Authorization: Bearer <id>.<token>)
     PUT  /api/profile              → store my save (≤ 64 KB)
     GET  /api/leaderboard?n=10     → survival best-streak ranking
     POST /api/leaderboard          → { best } submit my best streak
     POST /api/rooms                → create an online battle room  → { code }
     GET  /api/rooms/:code          → WebSocket: relays messages between the two players of a room
     GET  /api/shop                 → coin packs, prices and first-purchase flags
     POST /api/shop/checkout        → { pack, currency } create a Stripe Checkout session → { url }
     POST /api/shop/claim           → credit paid (and reverse refunded) purchases → { delta, items }
     POST /api/stripe/webhook       → Stripe events (signature verified with STRIPE_WEBHOOK_SECRET)
   Secrets (set in the Cloudflare dashboard, never in the repo): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
   Overload: per-IP rate limit and a daily write budget. When exceeded the API answers 503
   { error: "busy", message: "目前流量過大，請稍後再試" } and the game falls back to local saves. */

const BUSY = { error: 'busy', message: '目前流量過大，請稍後再試' };
const MAX_PROFILE = 64 * 1024;
const ipHits = new Map(); // per-isolate sliding window
const loginHits = new Map(); // stricter window for password attempts

function cors(env, req) {
  const origin = req.headers.get('Origin') || '';
  const allow = (env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim());
  const ok = allow.includes('*') || allow.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? (allow.includes('*') ? '*' : origin) : 'null',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,Stripe-Signature',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
const json = (data, status, headers) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function randomHex(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, '0')).join(''); }
function cleanName(s) { return String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12) || '旋鬥士'; }

function rateLimited(ip, limitPerMin) {
  const now = Date.now(), w = ipHits.get(ip) || [];
  const recent = w.filter((t) => now - t < 60000);
  recent.push(now); ipHits.set(ip, recent);
  if (ipHits.size > 5000) ipHits.clear(); // keep isolate memory bounded
  return recent.length > limitPerMin;
}
/* daily write budget so the free D1 quota is never blown; returns true when over budget */
async function overBudget(env) {
  const day = new Date().toISOString().slice(0, 10);
  const limit = +(env.DAILY_WRITE_LIMIT || 80000);
  const row = await env.DB.prepare('INSERT INTO usage (day, writes) VALUES (?1, 1) ON CONFLICT(day) DO UPDATE SET writes = writes + 1 RETURNING writes').bind(day).first();
  return (row && row.writes) > limit;
}
async function auth(env, req) {
  const h = req.headers.get('Authorization') || '';
  const m = h.match(/^Bearer ([a-f0-9]{24})\.([a-f0-9]{48})$/);
  if (!m) return null;
  const th = await sha256(m[2]);
  const row = await env.DB.prepare('SELECT id, token_hash, name FROM players WHERE id = ?1').bind(m[1]).first();
  if (!row) return null;
  if (row.token_hash === th) return row;                       // guest device token
  const ses = await env.DB.prepare('SELECT player_id FROM sessions WHERE token_hash = ?1').bind(th).first();
  return ses && ses.player_id === row.id ? { ...row, session: th } : null;  // logged-in session
}
/* PBKDF2-SHA256 password hashing (WebCrypto, 100k iterations = Workers maximum) */
async function hashPassword(password, saltHex) {
  const salt = Uint8Array.from(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function safeEqual(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
async function newSession(env, playerId) {
  const token = randomHex(24);
  await env.DB.prepare('INSERT INTO sessions (token_hash, player_id, created) VALUES (?1, ?2, ?3)').bind(await sha256(token), playerId, Date.now()).run();
  return token;
}

/* ---------------- coin shop (Stripe Checkout) ----------------
   Prices live here, on the server, so the client cannot change them. Amounts are in each currency's
   smallest unit as Stripe expects (JPY is zero-decimal; TWD/HKD/USD use cents). */
const PACKS = {
  p1: { coins: 500, price: { usd: 199, twd: 6000, hkd: 1500, jpy: 300 } },
  p2: { coins: 1100, price: { usd: 399, twd: 12000, hkd: 3000, jpy: 600 } },
  p3: { coins: 3000, price: { usd: 999, twd: 30000, hkd: 7800, jpy: 1500 } },
  p4: { coins: 6500, price: { usd: 1999, twd: 59000, hkd: 15800, jpy: 3000 } },
  p5: { coins: 14000, price: { usd: 3999, twd: 119000, hkd: 31800, jpy: 6000 } },
};
const STRIPE_LOCALE = { 'zh-Hant': 'zh-TW', 'zh-Hans': 'zh', ja: 'ja', en: 'en' };
async function stripe(env, path, params) {
  const body = new URLSearchParams();
  const add = (k, v) => { if (v && typeof v === 'object') for (const [kk, vv] of Object.entries(v)) add(`${k}[${kk}]`, vv); else if (v != null) body.append(k, String(v)); };
  for (const [k, v] of Object.entries(params)) add(k, v);
  const res = await fetch('https://api.stripe.com/v1/' + path, { method: 'POST', headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await res.json();
  if (!res.ok) throw new Error('stripe: ' + ((data.error && data.error.message) || res.status));
  return data;
}
/* Stripe-Signature: t=<ts>,v1=<hex hmac of "<ts>.<raw body>"> — reject anything unsigned or older than 5 minutes */
async function verifyStripe(env, raw, header) {
  const parts = Object.fromEntries((header || '').split(',').map((kv) => kv.split('=')).filter((x) => x.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const sigs = (header || '').split(',').filter((x) => x.trim().startsWith('v1=')).map((x) => x.trim().slice(3));
  const t = +parts.t; if (!t || !sigs.length || !env.STRIPE_WEBHOOK_SECRET) return false;
  if (Math.abs(Date.now() / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return sigs.some((s) => safeEqual(s, hex));
}
async function firstFlags(env, playerId) {
  const out = {}; for (const k of Object.keys(PACKS)) out[k] = true;
  if (!playerId) return out;
  const r = await env.DB.prepare("SELECT pack, COUNT(*) AS n FROM purchases WHERE player_id = ?1 AND status = 'paid' GROUP BY pack").bind(playerId).all();
  for (const row of r.results || []) out[row.pack] = false;
  return out;
}
async function hasAccount(env, playerId) { return !!(await env.DB.prepare('SELECT 1 AS x FROM accounts WHERE player_id = ?1').bind(playerId).first()); }

export default {
  async fetch(req, env) {
    const H = cors(env, req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: H });
    const url = new URL(req.url), path = url.pathname;
    const ip = req.headers.get('CF-Connecting-IP') || 'local';
    try {
      if (rateLimited(ip, +(env.RATE_PER_MIN || 90))) return json(BUSY, 503, H);

      if (path === '/api/stripe/webhook' && req.method === 'POST') {
        const raw = await req.text();
        if (!(await verifyStripe(env, raw, req.headers.get('Stripe-Signature')))) return json({ error: 'bad_signature' }, 400, H);
        const ev = JSON.parse(raw), o = ev.data && ev.data.object;
        if ((ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') && o && o.payment_status === 'paid' && o.metadata && PACKS[o.metadata.pack]) {
          await env.DB.prepare("INSERT INTO purchases (session_id, player_id, pack, coins, amount, currency, payment_intent, status, claimed, reversed, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'paid', 0, 0, ?8) ON CONFLICT(session_id) DO NOTHING")
            .bind(o.id, o.metadata.player_id, o.metadata.pack, Math.max(0, +o.metadata.coins | 0), o.amount_total | 0, o.currency || '', o.payment_intent || '', Date.now()).run();
        }
        if (ev.type === 'charge.refunded' && o && o.payment_intent) {
          await env.DB.prepare("UPDATE purchases SET status = 'refunded' WHERE payment_intent = ?1").bind(o.payment_intent).run();
        }
        return json({ received: true }, 200, H);
      }
      if (path === '/api/shop' && req.method === 'GET') {
        const me = await auth(env, req);
        const first = await firstFlags(env, me && me.id);
        return json({ enabled: !!env.STRIPE_SECRET_KEY, packs: Object.entries(PACKS).map(([id, p]) => ({ id, coins: p.coins, price: p.price, first: first[id] })) }, 200, H);
      }
      if (path === '/api/shop/checkout' && req.method === 'POST') {
        if (!env.STRIPE_SECRET_KEY) return json({ error: 'shop_disabled', message: '商店尚未開放' }, 501, H);
        const me = await auth(env, req); if (!me) return json({ error: 'auth' }, 401, H);
        if (!(await hasAccount(env, me.id))) return json({ error: 'need_account', message: '請先註冊 Email 帳號再購買' }, 403, H);
        const body = await req.json().catch(() => ({}));
        const pack = PACKS[body.pack]; if (!pack) return json({ error: 'bad_pack' }, 400, H);
        const currency = pack.price[body.currency] ? body.currency : 'usd';
        const first = (await firstFlags(env, me.id))[body.pack];
        const coins = pack.coins * (first ? 2 : 1);
        const back = env.SHOP_RETURN_URL || 'https://lam129.github.io/Lam129-spin-x/';
        const meta = { player_id: me.id, pack: body.pack, coins: String(coins) };
        const ses = await stripe(env, 'checkout/sessions', {
          mode: 'payment', client_reference_id: me.id, locale: STRIPE_LOCALE[body.lang] || 'auto',
          'line_items[0][quantity]': 1,
          'line_items[0][price_data][currency]': currency,
          'line_items[0][price_data][unit_amount]': pack.price[currency],
          'line_items[0][price_data][product_data][name]': `陀螺對決 SPIN DUEL – ${coins.toLocaleString('en-US')} coins${first ? ' (first purchase ×2)' : ''}`,
          metadata: meta, payment_intent_data: { metadata: meta },
          success_url: back + '?shop=success', cancel_url: back + '?shop=cancel',
        });
        return json({ url: ses.url }, 200, H);
      }
      if (path === '/api/shop/claim' && req.method === 'POST') {
        const me = await auth(env, req); if (!me) return json({ error: 'auth' }, 401, H);
        const add = await env.DB.prepare("SELECT session_id, pack, coins FROM purchases WHERE player_id = ?1 AND status = 'paid' AND claimed = 0").bind(me.id).all();
        const rev = await env.DB.prepare("SELECT session_id, coins FROM purchases WHERE player_id = ?1 AND status = 'refunded' AND claimed = 1 AND reversed = 0").bind(me.id).all();
        let delta = 0; const items = [];
        for (const r of add.results || []) { const u = await env.DB.prepare('UPDATE purchases SET claimed = 1 WHERE session_id = ?1 AND claimed = 0').bind(r.session_id).run(); if (!u || !u.meta || u.meta.changes !== 0) { delta += r.coins; items.push({ pack: r.pack, coins: r.coins }); } }
        for (const r of rev.results || []) { await env.DB.prepare('UPDATE purchases SET reversed = 1 WHERE session_id = ?1').bind(r.session_id).run(); delta -= r.coins; items.push({ refund: true, coins: -r.coins }); }
        // refunds of purchases that were never claimed simply stay unclaimed (status 'refunded')
        return json({ delta, items }, 200, H);
      }
      if (path === '/api/guest' && req.method === 'POST') {
        if (await overBudget(env)) return json(BUSY, 503, H);
        const id = randomHex(12), token = randomHex(24);
        await env.DB.prepare('INSERT INTO players (id, token_hash, name, profile, updated) VALUES (?1, ?2, ?3, NULL, ?4)').bind(id, await sha256(token), '旋鬥士', Date.now()).run();
        return json({ id, token }, 200, H);
      }
      if (path === '/api/register' && req.method === 'POST') {
        if (rateLimited('L' + ip, 10)) return json(BUSY, 503, H);
        const body = await req.json().catch(() => ({}));
        const email = String(body.email || '').trim().toLowerCase(), password = String(body.password || '');
        if (!EMAIL_RE.test(email)) return json({ error: 'bad_email', message: 'Email 格式不正確' }, 400, H);
        if (password.length < 8 || password.length > 128) return json({ error: 'weak_password', message: '密碼至少要 8 個字元' }, 400, H);
        if (await env.DB.prepare('SELECT 1 FROM accounts WHERE email = ?1').bind(email).first()) return json({ error: 'email_taken', message: '這個 Email 已經註冊過了，請直接登入' }, 409, H);
        if (await overBudget(env)) return json(BUSY, 503, H);
        // bind to the current guest (keeps progress) unless that guest already owns an account
        let me = await auth(env, req);
        if (me && (await env.DB.prepare('SELECT 1 FROM accounts WHERE player_id = ?1').bind(me.id).first())) me = null;
        let pid = me && me.id;
        if (!pid) {
          pid = randomHex(12);
          await env.DB.prepare('INSERT INTO players (id, token_hash, name, profile, updated) VALUES (?1, ?2, ?3, NULL, ?4)').bind(pid, await sha256(randomHex(24)), cleanName(body.name), Date.now()).run();
        }
        const salt = randomHex(16);
        await env.DB.prepare('INSERT INTO accounts (email, player_id, pass_hash, salt, created) VALUES (?1, ?2, ?3, ?4, ?5)').bind(email, pid, await hashPassword(password, salt), salt, Date.now()).run();
        return json({ id: pid, token: await newSession(env, pid), email }, 200, H);
      }
      if (path === '/api/login' && req.method === 'POST') {
        if (rateLimited('L' + ip, 10)) return json({ error: 'too_many', message: '嘗試次數太多，請稍後再試' }, 429, H);
        const body = await req.json().catch(() => ({}));
        const email = String(body.email || '').trim().toLowerCase(), password = String(body.password || '');
        const acc = await env.DB.prepare('SELECT player_id, pass_hash, salt FROM accounts WHERE email = ?1').bind(email).first();
        const ok = acc && safeEqual(await hashPassword(password, acc.salt), acc.pass_hash);
        if (!ok) return json({ error: 'bad_login', message: 'Email 或密碼不正確' }, 401, H);
        return json({ id: acc.player_id, token: await newSession(env, acc.player_id), email }, 200, H);
      }
      if (path === '/api/logout' && req.method === 'POST') {
        const me = await auth(env, req);
        if (me && me.session) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(me.session).run();
        return json({ ok: true }, 200, H);
      }
      if (path === '/api/profile') {
        const me = await auth(env, req); if (!me) return json({ error: 'auth' }, 401, H);
        if (req.method === 'GET') {
          const row = await env.DB.prepare('SELECT profile FROM players WHERE id = ?1').bind(me.id).first();
          return json({ profile: row && row.profile ? JSON.parse(row.profile) : null }, 200, H);
        }
        if (req.method === 'PUT') {
          const text = await req.text();
          if (text.length > MAX_PROFILE) return json({ error: 'too_large' }, 413, H);
          const body = JSON.parse(text);
          if (!body || typeof body.profile !== 'object') return json({ error: 'bad_request' }, 400, H);
          if (await overBudget(env)) return json(BUSY, 503, H);
          const name = cleanName(body.profile.name);
          await env.DB.prepare('UPDATE players SET profile = ?1, name = ?2, updated = ?3 WHERE id = ?4').bind(JSON.stringify(body.profile), name, Date.now(), me.id).run();
          return json({ ok: true }, 200, H);
        }
      }
      if (path === '/api/leaderboard') {
        if (req.method === 'GET') {
          const n = Math.min(50, Math.max(1, +(url.searchParams.get('n') || 10)));
          const { results } = await env.DB.prepare('SELECT id, name, best FROM leaderboard ORDER BY best DESC, at ASC LIMIT ?1').bind(n).all();
          return json({ rows: results }, 200, { ...H, 'Cache-Control': 'public, max-age=30' });
        }
        if (req.method === 'POST') {
          const me = await auth(env, req); if (!me) return json({ error: 'auth' }, 401, H);
          const body = await req.json();
          const best = Math.floor(+body.best);
          if (!(best > 0 && best <= 500)) return json({ error: 'bad_request' }, 400, H);
          if (await overBudget(env)) return json(BUSY, 503, H);
          await env.DB.prepare('INSERT INTO leaderboard (id, name, best, at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO UPDATE SET name = excluded.name, best = MAX(best, excluded.best), at = CASE WHEN excluded.best > best THEN excluded.at ELSE at END')
            .bind(me.id, cleanName(me.name), best, Date.now()).run();
          return json({ ok: true }, 200, H);
        }
      }
      if (path === '/api/rooms' && req.method === 'POST') {
        const me = await auth(env, req); if (!me) return json({ error: 'auth' }, 401, H);
        const code = randomHex(3).toUpperCase();
        return json({ code }, 200, H);
      }
      const rm = path.match(/^\/api\/rooms\/([A-F0-9]{6})$/);
      if (rm) {
        if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'expected_websocket' }, 426, H);
        if (!env.ROOMS) return json({ error: 'rooms_disabled' }, 501, H);
        const stub = env.ROOMS.get(env.ROOMS.idFromName(rm[1]));
        return stub.fetch(req);
      }
      return json({ error: 'not_found' }, 404, H);
    } catch (e) {
      // D1 / platform limits surface as exceptions: treat as overload so the client degrades gracefully
      return json({ ...BUSY, detail: String(e && e.message || e).slice(0, 120) }, 503, H);
    }
  },
};

/* One Durable Object per room: relays JSON messages between at most two sockets.
   Uses the hibernation API so idle rooms cost nothing. */
export class Room {
  constructor(state) { this.state = state; }
  async fetch(req) {
    const url = new URL(req.url);
    const role = url.searchParams.get('role') === 'host' ? 'host' : 'guest';
    const cid = (url.searchParams.get('cid') || '').replace(/[^a-z0-9]/gi, '').slice(0, 24) || 'x';
    const pair = new WebSocketPair();
    // one host and one guest per room; the same tab reconnecting replaces its old socket, anyone else is turned away
    const same = this.state.getWebSockets(role);
    if (same.some((s) => !this.state.getTags(s).includes('c:' + cid))) {
      this.state.acceptWebSocket(pair[1], ['reject']);
      pair[1].close(4009, 'full');
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    for (const s of same) { try { s.close(4000, 'replaced'); } catch (e) {} }
    const others = this.state.getWebSockets().filter((s) => !same.includes(s) && !this.state.getTags(s).includes('reject'));
    this.state.acceptWebSocket(pair[1], [role, 'c:' + cid]);
    pair[1].send(JSON.stringify({ t: 'hello', role, peers: others.length + 1 }));
    for (const s of others) { try { s.send(JSON.stringify({ t: 'peer-joined' })); } catch (e) {} }
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > 16384) return;
    if (this.state.getTags(ws).includes('reject')) return;
    for (const s of this.state.getWebSockets()) if (s !== ws && !this.state.getTags(s).includes('reject')) { try { s.send(msg); } catch (e) {} }
  }
  webSocketClose(ws, code) {
    const tags = this.state.getTags(ws);
    if (tags.includes('reject') || code === 4000) return;
    for (const s of this.state.getWebSockets()) if (s !== ws && !this.state.getTags(s).includes('reject')) { try { s.send(JSON.stringify({ t: 'peer-left' })); } catch (e) {} }
  }
}
