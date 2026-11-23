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
// ---- accounts
env.DAILY_WRITE_LIMIT = '1000';
let [s2, g2] = await call('POST', '/api/guest'); const gt = g2.id + '.' + g2.token;
await call('PUT', '/api/profile', { profile: { name: '試玩者', coins: 42 } }, gt);
let [rs, reg] = await call('POST', '/api/register', { email: 'Player@Example.com', password: 'secret123' }, gt);
ok(rs === 200 && reg.id === g2.id, 'register binds current guest (keeps progress)');
let [ds] = await call('POST', '/api/register', { email: 'player@example.com', password: 'secret123' }); ok(ds === 409, 'duplicate email rejected');
let [ws] = await call('POST', '/api/register', { email: 'x@y.com', password: 'short' }); ok(ws === 400, 'short password rejected');
let [bs] = await call('POST', '/api/login', { email: 'player@example.com', password: 'wrongpass' }); ok(bs === 401, 'wrong password rejected');
let [ls, lg] = await call('POST', '/api/login', { email: 'PLAYER@example.com', password: 'secret123' }); ok(ls === 200 && lg.id === g2.id, 'login works, email case-insensitive');
let [, pp] = await call('GET', '/api/profile', null, lg.id + '.' + lg.token); ok(pp.profile && pp.profile.coins === 42, 'login session loads the same progress');
await call('POST', '/api/logout', null, lg.id + '.' + lg.token);
let [os] = await call('GET', '/api/profile', null, lg.id + '.' + lg.token); ok(os === 401, 'logout ends the session');
// ---- coin shop (Stripe mocked)
import crypto from 'node:crypto';
let [, shop0] = await call('GET', '/api/shop'); ok(shop0.enabled === false && shop0.packs.length === 5, 'shop lists packs, disabled without a key');
let [cs0] = await call('POST', '/api/shop/checkout', { pack: 'p1', currency: 'twd' }, lg2tok()); ok(cs0 === 501, 'checkout refused while the shop is disabled');
function lg2tok() { return null; }
env.STRIPE_SECRET_KEY = 'sk_test_dummy'; env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
let lastStripe = null;
globalThis.fetch = async (u, o) => { lastStripe = { u, body: String(o.body) }; return new Response(JSON.stringify({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }), { status: 200 }); };
let [gs, gg] = await call('POST', '/api/guest'); const guestTok = gg.id + '.' + gg.token;
let [na] = await call('POST', '/api/shop/checkout', { pack: 'p1', currency: 'twd' }, guestTok); ok(na === 403, 'guests must register before buying');
let [, acct] = await call('POST', '/api/login', { email: 'player@example.com', password: 'secret123' }); const at = acct.id + '.' + acct.token;
let [cs, co] = await call('POST', '/api/shop/checkout', { pack: 'p2', currency: 'twd', lang: 'ja' }, at);
const sent = new URLSearchParams(lastStripe.body);
ok(cs === 200 && co.url.startsWith('https://checkout.stripe.com/') && sent.get('line_items[0][price_data][unit_amount]') === '12000' && sent.get('line_items[0][price_data][currency]') === 'twd' && sent.get('metadata[coins]') === '2200' && sent.get('locale') === 'ja', 'checkout uses server price (NT$120) and first-purchase ×2 coins');
const hook = async (obj, type, secret = 'whsec_test', ts = Math.floor(Date.now() / 1000)) => {
  const raw = JSON.stringify({ type, data: { object: obj } });
  const sig = crypto.createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex');
  const res = await worker.fetch(new Request('http://x/api/stripe/webhook', { method: 'POST', body: raw, headers: { 'Stripe-Signature': `t=${ts},v1=${sig}` } }), env);
  return res.status;
};
const sess = { id: 'cs_test_1', payment_status: 'paid', amount_total: 12000, currency: 'twd', payment_intent: 'pi_1', metadata: { player_id: acct.id, pack: 'p2', coins: '2200' } };
ok(await hook(sess, 'checkout.session.completed', 'whsec_wrong') === 400, 'webhook rejects a bad signature');
ok(await hook(sess, 'checkout.session.completed', 'whsec_test', Math.floor(Date.now() / 1000) - 3600) === 400, 'webhook rejects a stale timestamp');
ok(await hook(sess, 'checkout.session.completed') === 200, 'webhook accepts a signed event');
ok(await hook(sess, 'checkout.session.completed') === 200, 'duplicate delivery is harmless');
let [, cl1] = await call('POST', '/api/shop/claim', null, at); ok(cl1.delta === 2200, 'claim credits the purchase once');
let [, cl2] = await call('POST', '/api/shop/claim', null, at); ok(cl2.delta === 0, 'second claim credits nothing');
let [, shop1] = await call('GET', '/api/shop', null, at); ok(shop1.packs.find((p) => p.id === 'p2').first === false && shop1.packs.find((p) => p.id === 'p1').first === true, 'first-purchase bonus used up only for that pack');
ok(await hook({ payment_intent: 'pi_1' }, 'charge.refunded') === 200, 'refund event accepted');
let [, cl3] = await call('POST', '/api/shop/claim', null, at); ok(cl3.delta === -2200, 'refund reverses the credited coins');
