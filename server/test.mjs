// Local test: runs the Worker's fetch handler against an in-memory SQLite that mimics the D1 API.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import worker from './src/index.js';
const sql = new DatabaseSync(':memory:');
sql.exec(fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
const D1 = { prepare(q) { let args = []; const st = sql.prepare(q.replace(/\?(\d+)/g, '?'));
  return { bind(...a) { args = a; return this; }, first() { return st.get(...args) || null; }, all() { return { results: st.all(...args) }; }, run() { st.run(...args); return { success: true }; } }; } };
const env = { DB: D1, ALLOWED_ORIGINS: '*', RATE_PER_MIN: '1000', DAILY_WRITE_LIMIT: '6' };
const call = async (method, path, body, token) => {
  const res = await worker.fetch(new Request('http://x' + path, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) } }), env);
  return [res.status, await res.json()];
};
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
let [s, g] = await call('POST', '/api/guest'); ok(s === 200 && g.id && g.token, 'create guest');
const tok = g.id + '.' + g.token;
[s] = await call('GET', '/api/profile'); ok(s === 401, 'profile requires auth');
[s] = await call('GET', '/api/profile', null, g.id + '.' + 'a'.repeat(48)); ok(s === 401, 'wrong token rejected');
[s] = await call('PUT', '/api/profile', { profile: { name: '測試<b>玩家', coins: 5 } }, tok); ok(s === 200, 'save profile');
let [, p] = await call('GET', '/api/profile', null, tok); ok(p.profile && p.profile.coins === 5, 'load profile');
[s] = await call('POST', '/api/leaderboard', { best: 7 }, tok); ok(s === 200, 'submit best 7');
[s] = await call('POST', '/api/leaderboard', { best: 3 }, tok); ok(s === 200, 'submit lower best 3');
let [, lb] = await call('GET', '/api/leaderboard?n=5'); ok(lb.rows.length === 1 && lb.rows[0].best === 7 && lb.rows[0].name === '測試b玩家', 'leaderboard keeps max and sanitises name');
[s] = await call('POST', '/api/leaderboard', { best: 99999 }, tok); ok(s === 400, 'reject absurd streak');
[s] = await call('POST', '/api/rooms', null, tok); ok(s === 200, 'create room code');
// daily write budget = 6 in this test: further writes must answer busy
let last; for (let i = 0; i < 4; i++) last = await call('PUT', '/api/profile', { profile: { name: 'x' } }, tok);
ok(last[0] === 503 && last[1].error === 'busy' && last[1].message === '目前流量過大，請稍後再試', 'over budget answers busy');
