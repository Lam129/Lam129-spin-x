/* 陀螺對決 public backend — Cloudflare Worker + D1 + Durable Objects (all on the free plan).
   Routes:
     POST /api/guest                → create an anonymous account   → { id, token }
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
  const row = await env.DB.prepare('SELECT id, token_hash, name FROM players WHERE id = ?1').bind(m[1]).first();
  if (!row || row.token_hash !== (await sha256(m[2]))) return null;
  return row;
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
