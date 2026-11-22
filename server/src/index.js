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
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
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

export default {
  async fetch(req, env) {
    const H = cors(env, req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: H });
    const url = new URL(req.url), path = url.pathname;
    const ip = req.headers.get('CF-Connecting-IP') || 'local';
    try {
      if (rateLimited(ip, +(env.RATE_PER_MIN || 90))) return json(BUSY, 503, H);

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
    const sockets = this.state.getWebSockets();
    if (sockets.length >= 2) return new Response(JSON.stringify(BUSY), { status: 409 });
    const pair = new WebSocketPair();
    const role = sockets.length === 0 ? 'host' : 'guest';
    this.state.acceptWebSocket(pair[1], [role]);
    pair[1].send(JSON.stringify({ t: 'hello', role, peers: sockets.length + 1 }));
    for (const s of sockets) s.send(JSON.stringify({ t: 'peer-joined' }));
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > 16384) return;
    for (const s of this.state.getWebSockets()) if (s !== ws) { try { s.send(msg); } catch (e) {} }
  }
  webSocketClose(ws) {
    for (const s of this.state.getWebSockets()) if (s !== ws) { try { s.send(JSON.stringify({ t: 'peer-left' })); } catch (e) {} }
  }
}
