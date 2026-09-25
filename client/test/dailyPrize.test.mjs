// Daily Race prizes: TON addresses, the prize rules, and the prize desk end to
// end through the telegram function (owner commands, settling, claims, payouts).
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { friendlyAddress, parseFriendlyAddress, parseRawAddress, shortAddress } from '../src/logic/tonAddress.js';
import {
  parsePrizeCommand, prizeForDay, settleable, dayEndSec, gramNano, gramLabel, tonkeeperLink, pickWinner, winState, PRIZE_SETTLE_DELAY_S
} from '../src/logic/dailyPrize.js';
import { DAILY_EPOCH_MS, dailyNote, EMPTY_DAILY } from '../src/logic/dailyRace.js';
import { startParamKind } from '../src/logic/telegramLaunch.js';
import { claimView, claimError, showPrizeClaim } from '../src/platform/prizeClaim.js';
import { createTelegramHandler } from '../netlify/functions/telegram.mjs';

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };

// --- TON addresses (vectors from @tonconnect/ui's toUserFriendlyAddress) -------
const RAW = '0:ca6e321c7cce9ecedf0a8ca2492ec8592494aa5fb5ce0387dff96ef6af982a3e';
eq(friendlyAddress(RAW), 'UQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPuwA', 'raw to non-bounceable, as TON Connect does');
eq(friendlyAddress(RAW, { testOnly: true }), '0QDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPleK', 'testnet form');
eq(friendlyAddress(RAW, { bounceable: true }), 'EQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPrHF', 'bounceable form');
eq(friendlyAddress('-1:' + 'ab'.repeat(32)), 'Uf-rq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq2ep', 'masterchain');
eq(parseFriendlyAddress('EQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPrHF'), { raw: RAW, bounceable: true, testOnly: false }, 'read back');
eq(parseFriendlyAddress('EQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff+W72r5gqPrHF')?.raw, RAW, 'standard base64 accepted too');
eq(parseFriendlyAddress('UQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPuwB'), null, 'a one-character typo fails the checksum');
eq(parseFriendlyAddress('not an address'), null, 'junk');
eq(parseRawAddress('0:' + 'zz'.repeat(32)), null, 'raw needs hex');
eq(shortAddress('UQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPuwA'), 'UQDKbj…gqPuwA', 'short form');

// --- Rules ---------------------------------------------------------------------
eq(parsePrizeCommand('/prize'), { cmd: 'status' }, 'status');
eq(parsePrizeCommand('/prize 1'), { cmd: 'on', gram: 1, days: null }, 'on');
eq(parsePrizeCommand('/prize 1 6'), { cmd: 'on', gram: 1, days: 6 }, 'on for six days');
eq(parsePrizeCommand('/prize 0.5 gram 4'), { cmd: 'on', gram: 0.5, days: 4 }, 'half a GRAM, the word allowed');
eq(parsePrizeCommand('/prize@PlugRunBot off'), { cmd: 'off' }, 'off, with the bot name');
eq(parsePrizeCommand('/paid 12 abc123'), { cmd: 'paid', day: 12, tx: 'abc123' }, 'paid');
eq(parsePrizeCommand('/dq #12 way too fast'), { cmd: 'dq', day: 12, reason: 'way too fast' }, 'dq');
eq(parsePrizeCommand('/prize 5000').cmd, 'bad', 'no runaway amounts');
eq(parsePrizeCommand('/prize lots').cmd, 'bad', 'nonsense is a help reply');
eq(parsePrizeCommand('hello'), null, 'ordinary messages are not commands');
eq(prizeForDay({ gram: 1, from: 3, until: 8 }, 8), { gram: 1 }, 'last day of a run pays');
eq(prizeForDay({ gram: 1, from: 3, until: 8 }, 9), null, 'the day after does not');
eq(prizeForDay({ gram: 1, from: 3, until: null }, 2), null, 'nor a day before it started');
ok(!settleable(4, dayEndSec(4) + PRIZE_SETTLE_DELAY_S - 1) && settleable(4, dayEndSec(4) + PRIZE_SETTLE_DELAY_S), 'settled half an hour after midnight');
eq(gramNano(1), '1000000000', '1 GRAM in nano units');
eq(gramNano(0.5), '500000000', 'half');
eq(gramNano(0), null, 'no amount, nothing to send');
eq([gramLabel(1), gramLabel(0.5), gramLabel(2.25)], ['1 GRAM', '0.5 GRAM', '2.25 GRAM'], 'labels');
eq(tonkeeperLink('UQabc', '1570000000', 'Plug Run Daily #3'), 'https://app.tonkeeper.com/transfer/UQabc?amount=1570000000&text=Plug%20Run%20Daily%20%233', 'Tonkeeper link, comment spaces kept');
eq(pickWinner([{ userId: 'w' }, { userId: 'a' }, { userId: 'b' }], new Map([['a', '1'], ['b', '2']]), new Set(['a']))?.userId, 'b', 'fastest Telegram run that is not disqualified');
eq(winState({ status: 'won', claimBy: 100 }, 101), 'expired', 'unclaimed after a week');

// --- In the game ------------------------------------------------------------------
eq(dailyNote({ ...EMPTY_DAILY, days: {} }, 3, '1 GRAM'), 'WIN 1 GRAM TODAY', 'a prize day\'s menu line names the prize');
eq(dailyNote({ days: { 3: { ms: 64321, houses: 7, rank: 2 } }, streak: 1, last: 3 }, 3, '1 GRAM'), '✓ 1:04.3  ·  #2  ·  🔥 1', 'after the run it shows the result as always');
eq(startParamKind('prize_12'), 'prize', 'the winner\'s link');
eq(startParamKind('prize_x'), 'other', 'only a day number');
{
  const win = { day: 3, gram: 1, ms: 62000, claimBy: Date.UTC(2026, 8, 30, 0, 30) / 1000 };
  const v = claimView('won', win);
  ok(v.title === 'DAILY RACE #3 · WINNER' && v.big === '1 GRAM' && v.line === 'FASTEST TIME 1:02.0' && /Claim by SEP 30\./.test(v.note), 'the claim screen');
  eq(v.buttons.map((b) => b.label), ['CONNECT WALLET', 'LATER'], 'its buttons');
  eq(claimView('claimed', win, { wallet: 'UQDKbj…gqPuwA' }).line, 'ON ITS WAY TO UQDKbj…gqPuwA', 'claimed');
  eq(claimError(new Error('HTTP 410 {"ok":false,"error":"the claim window has closed"}')), 'The claim window has closed.', 'the server\'s reason, as a sentence');
  ok(/Check your connection/.test(claimError(new Error('timeout'))), 'a network failure');

  // The screen's flow, on a stand-in document.
  const make = (tag) => ({ tag, children: [], listeners: {}, setAttribute(k, v) { this[k] = v; }, addEventListener(t, f) { this.listeners[t] = f; },
    appendChild(c) { this.children.push(c); }, replaceChildren(...c) { this.children = c; }, remove() { this.removed = true; } });
  const doc = { createElement: make, body: make('body') };
  const labels = (ui) => ui.root.children[0].children.filter((c) => c.tag === 'button').map((b) => b.textContent);
  const press = async (ui, label) => { ui.root.children[0].children.find((c) => c.tag === 'button' && c.textContent === label).listeners.click(); for (let i = 0; i < 6; i++) await Promise.resolve(); };
  let connectAnswer, claims = [], closed = [];
  const ui = showPrizeClaim(win, { doc, connect: () => new Promise((r) => { connectAnswer = r; }), claim: async (w) => { claims.push(w); return { wallet: 'UQDKbj…gqPuwA' }; }, onClose: (st) => closed.push(st) });
  ok(doc.body.children[0] === ui.root && labels(ui).join() === 'CONNECT WALLET,LATER', 'it opens over the game');
  await press(ui, 'CONNECT WALLET');
  eq(labels(ui), ['CONNECTING…', 'CANCEL'], 'waiting on the wallet');
  const late = connectAnswer;
  await press(ui, 'CANCEL');
  late({ address: RAW, chain: '-239' }); for (let i = 0; i < 6; i++) await Promise.resolve();
  ok(ui.state() === 'won' && claims.length === 0, 'a cancelled connect is ignored even if it answers later');
  await press(ui, 'CONNECT WALLET'); connectAnswer(null); for (let i = 0; i < 6; i++) await Promise.resolve();
  ok(ui.state() === 'won', 'backing out of the wallet picker returns to the claim');
  await press(ui, 'CONNECT WALLET'); connectAnswer({ address: RAW, chain: '-239' }); for (let i = 0; i < 6; i++) await Promise.resolve();
  ok(ui.state() === 'claimed' && claims.length === 1 && claims[0].address === RAW, 'a connected wallet is claimed');
  eq(labels(ui), ['DONE'], 'done');
  await press(ui, 'DONE');
  ok(ui.root.removed && closed.join() === 'claimed', 'and closes');
  const failing = showPrizeClaim(win, { doc, connect: async () => ({ address: RAW, chain: '-239' }), claim: async () => { throw new Error('HTTP 403 {"ok":false,"error":"open Plug Run in Telegram to claim"}'); } });
  await press(failing, 'CONNECT WALLET');
  ok(failing.state() === 'error' && labels(failing).join() === 'TRY AGAIN,LATER', 'a refused claim says why and offers another try');
  eq(showPrizeClaim(win, { doc: {} }), null, 'no document, no screen');
}

// --- The desk, through the telegram function ----------------------------------
{
  const BOT = '12345:TEST', ADMIN = '999';
  const DAY = 86400;
  const n = 3;
  let clock = DAILY_EPOCH_MS / 1000 + (n - 1) * DAY + 3600; // 01:00 UTC on Daily #3
  const store = new Map(), blobs = new Map();
  const z = (k) => store.get(k) instanceof Map ? store.get(k) : (store.set(k, new Map()), store.get(k));
  const redis = async ([cmd, key, ...a]) => {
    const sorted = () => [...z(key).entries()].sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : 1));
    switch (cmd) {
      case 'GET': { const v = store.get(key); return v instanceof Map ? null : v ?? null; }
      case 'MGET': return [key, ...a].map((k) => { const v = store.get(k); return v instanceof Map ? null : v ?? null; });
      case 'SET': if (a.includes('NX') && store.has(key)) return null; store.set(key, a[0]); return 'OK';
      case 'DEL': return store.delete(key) ? 1 : 0;
      case 'INCR': { const v = Number(store.get(key) || 0) + 1; store.set(key, String(v)); return v; }
      case 'EXPIRE': return 1;
      case 'HSET': z(key).set(a[0], a[1]); return 1;
      case 'HGET': return z(key).get(a[0]) ?? null;
      case 'HMGET': return a.map((f) => z(key).get(f) ?? null);
      case 'HGETALL': return [...z(key).entries()].flat();
      case 'ZADD': { const nx = a[0] === 'NX'; const [score, member] = nx ? a.slice(1) : a; if (nx && z(key).has(member)) return 0; z(key).set(member, Number(score)); return 1; }
      case 'ZSCORE': { const v = z(key).get(a[0]); return v === undefined ? null : String(v); }
      case 'ZCARD': return z(key).size;
      case 'ZRANK': { const i = sorted().map(([m]) => m).indexOf(a[0]); return i < 0 ? null : i; }
      case 'ZRANGE': return sorted().slice(Number(a[0]), Number(a[1]) + 1).flatMap(([m, sc]) => [m, String(sc)]);
    }
    throw new Error('redis ' + cmd);
  };
  const sent = [];
  const fetchImpl = async (url, opts) => {
    const u = String(url);
    const m = u.match(/\/bot[^/]+\/(\w+)$/);
    if (!m) throw new Error('unexpected fetch ' + u);
    if (m[1] === 'getMe') return { json: async () => ({ ok: true, result: { username: 'PlugRunBot' } }) };
    const body = JSON.parse(opts.body);
    sent.push({ method: m[1], ...body });
    return { json: async () => ({ ok: body.chat_id !== 333 && body.chat_id !== '333' }) };
  };
  const h = createTelegramHandler({ token: () => BOT, redis, fetchImpl, nowSec: () => clock, adminId: () => ADMIN,
    dailyRuns: async () => ({ set: async (k, v) => blobs.set(k, JSON.parse(v)), get: async (k) => blobs.get(k) ?? null }) });
  const call = async (method, action, body, q = '') => {
    const res = await h({ url: 'https://plugrun.io/.netlify/functions/telegram?action=' + action + q, method,
      headers: { get: (k) => (k === 'x-telegram-bot-api-secret-token' ? secret : null) }, text: async () => JSON.stringify(body) });
    return { status: res.status, json: JSON.parse(await res.text()) };
  };
  const secret = createHmac('sha256', 'plugrun-webhook').update(BOT).digest('hex').slice(0, 48);
  const said = (fn) => { const i = sent.findIndex(fn); return i < 0 ? null : sent.splice(i, 1)[0]; };
  const to = (chatId) => (m) => m.method === 'sendMessage' && String(m.chat_id) === String(chatId);
  const chat = async (fromId, text) => { await call('POST', 'webhook', { message: { chat: { id: Number(fromId), type: 'private' }, from: { id: Number(fromId) }, text } }); };
  const sign = (id) => {
    const q = new URLSearchParams({ user: JSON.stringify({ id: Number(id), first_name: 'P' + id }), auth_date: String(clock - 60) });
    const check = [...q].map(([k, v]) => k + '=' + v).sort().join('\n');
    q.set('hash', createHmac('sha256', createHmac('sha256', 'WebAppData').update(BOT).digest()).update(check).digest('hex'));
    return q.toString();
  };
  // Players and boards, as the verified submit leaves them.
  const users = { u_web: ['Webby', null], u_a: ['Ana', '111'], u_b: ['Ben', '222'], u_c: ['Cy', '333'] };
  for (const [id, [name, tg]] of Object.entries(users)) store.set('user:' + id, JSON.stringify({ username: name, token: 't_' + id, ...(tg ? { telegramId: tg } : {}) }));
  const rank = (day, id, ms) => {
    z('daily:' + day).set(id, ms); z('daily:' + day + ':names').set(id, users[id][0]);
    if (users[id][1]) z('daily:' + day + ':telegram').set(id, users[id][1]);
    blobs.set(day + '/' + id, { record: { clearTimes: [11000, 23000, 36000, 49000, 61000, 74000, Math.floor(ms)], retries: 1, orderedPowers: ['dash', 'phase'] } });
  };
  const status = async (id) => (await call('POST', 'prize-status', { userId: id, token: 't_' + id })).json;
  const claim = (id, extra) => call('POST', 'prize-claim', { userId: id, token: 't_' + id, day: n, ...extra });
  const board = async (day) => (await call('GET', 'daily-board', null, '&day=' + day)).json;

  // Anyone can ask for their id; only the owner runs prize commands.
  await chat(555, '/whoami');
  ok(/Your Telegram ID: <code>555<\/code>/.test(said(to(555))?.text || ''), '/whoami answers anyone with their id');
  await chat(555, '/prize 1');
  ok(!!said((m) => m.method === 'sendPhoto' && m.chat_id === 555) && store.get('prize:config') === undefined, 'a stranger sending /prize gets the welcome card, and nothing changes');
  eq((await board(n)).prize, undefined, 'no prize, nothing on the board');

  await chat(ADMIN, '/prize 1 6');
  ok(/1 GRAM a day<\/b>, from Daily #3 .* through #8/.test(said(to(ADMIN))?.text || ''), 'the owner turns it on for six days');
  eq(JSON.parse(store.get('prize:config')), { gram: 1, from: 3, until: 8 }, 'config stored');
  eq((await status('u_a')).today, { day: n, gram: 1 }, 'the game hears about today\'s prize');

  // Daily #3: the fastest run is from the web; the prize goes to the fastest Telegram run.
  rank(n, 'u_web', 60000.01); rank(n, 'u_b', 64000.05); rank(n, 'u_a', 62000.02);
  const b3 = await board(n);
  eq(b3.prize, { gram: 1, leader: { rank: 2, name: 'Ana', ms: 62000 } }, 'the board shows the prize and who is in line for it');
  eq(b3.top.map((e) => e.ms), [60000, 62000, 64000], 'board times drop the tiebreak');
  eq(await h.settle(), [null, null], 'nothing settles while the day is open');

  clock = DAILY_EPOCH_MS / 1000 + n * DAY + PRIZE_SETTLE_DELAY_S; // 00:30 UTC on Daily #4
  const [, win] = await h.settle();
  ok(win.status === 'won' && win.userId === 'u_a' && win.telegramId === '111' && win.ms === 62000 && win.rank === 2 && win.ranked === 3, 'settled: Ana wins Daily #3');
  const dm = said(to('111'));
  ok(/You won Plug Run Daily #3/.test(dm?.text) && dm.reply_markup.inline_keyboard[0][0].url === 'https://t.me/PlugRunBot/play?startapp=prize_3', 'the winner is told, with a claim link into the game');
  const review = said(to(ADMIN))?.text || '';
  ok(/Daily #3 winner: Ana<\/b> · 1:02\.0/.test(review) && /Rank 2 of 3 ranked/.test(review) && /Houses \(s\): 11\.0 · 12\.0/.test(review) && /Told them in Telegram/.test(review) && /\/dq 3/.test(review), 'the owner gets the run to review');
  await h.settle();
  eq(sent.filter((m) => m.method === 'sendMessage').length, 0, 'settling again sends nothing');

  eq((await status('u_a')).wins, [{ day: 3, gram: 1, ms: 62000, status: 'won', claimBy: win.claimBy, wallet: null }], 'the winner\'s game sees the win');
  eq((await status('u_b')).wins, [], 'nobody else\'s does');

  // Claiming.
  eq((await claim('u_b', { wallet: RAW, initData: sign('222') })).status, 404, 'only the winner can claim');
  eq((await claim('u_a', { wallet: RAW })).status, 403, 'a claim needs Telegram\'s signed launch data');
  eq((await claim('u_a', { wallet: RAW, initData: sign('222') })).status, 403, 'from the winning Telegram account');
  eq((await claim('u_a', { wallet: RAW, chain: '-3', initData: sign('111') })).status, 400, 'no testnet wallets');
  eq((await claim('u_a', { wallet: '0QDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPleK', initData: sign('111') })).status, 400, 'nor testnet addresses');
  eq((await claim('u_a', { wallet: 'UQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPuwB', initData: sign('111') })).status, 400, 'a mistyped address is refused');
  eq((await call('POST', 'prize-claim', { userId: 'u_a', token: 'nope', day: n, wallet: RAW })).status, 403, 'and the player token');
  const good = await claim('u_a', { wallet: RAW, chain: '-239', initData: sign('111') });
  eq(good.json, { ok: true, day: 3, status: 'claimed', wallet: 'UQDKbj…gqPuwA' }, 'claimed with the connected wallet');
  const pay = said(to(ADMIN));
  ok(/Ana claimed Daily #3/.test(pay?.text) && /<code>UQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPuwA<\/code>/.test(pay.text) && /Send: <b>1 GRAM<\/b>/.test(pay.text), 'the owner gets the wallet and the amount');
  eq(pay.reply_markup.inline_keyboard[0][0], { text: 'Pay 1 GRAM in Tonkeeper', url: 'https://app.tonkeeper.com/transfer/UQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPuwA?amount=1000000000&text=Plug%20Run%20Daily%20%233' }, 'with a prefilled Tonkeeper payment');
  await claim('u_a', { wallet: RAW, initData: sign('111') });
  eq(sent.length, 0, 'claiming again with the same wallet sends nothing new');

  await chat(ADMIN, '/paid 3 txhash1');
  ok(/marked paid/.test(said(to(ADMIN))?.text) && /has been sent to <code>UQDKbj…gqPuwA<\/code>/.test(said(to('111'))?.text), 'paid: the owner marks it, the winner is told');
  eq(JSON.parse(store.get('prize:win:3')).tx, 'txhash1', 'the transaction is kept');
  eq((await claim('u_a', { wallet: RAW, initData: sign('111') })).status, 409, 'nothing to claim once paid');
  await chat(ADMIN, '/dq 3 late');
  ok(/already paid/.test(said(to(ADMIN))?.text), 'a paid day cannot be passed on');

  // Daily #4: a disqualified winner passes the prize to the next Telegram runner.
  rank(4, 'u_b', 58000.03); rank(4, 'u_a', 59000.01); rank(4, 'u_c', 61000.02);
  clock = DAILY_EPOCH_MS / 1000 + 4 * DAY + PRIZE_SETTLE_DELAY_S;
  await h.settle();
  ok(/You won Plug Run Daily #4/.test(said(to('222'))?.text) && /winner: Ben/.test(said(to(ADMIN))?.text), 'Ben wins Daily #4');
  await chat(ADMIN, '/dq 4 impossible splits');
  ok(/could not be confirmed/.test(said(to('222'))?.text), 'Ben is told it passes on');
  ok(/Ben disqualified from Daily #4 \(impossible splits\)/.test(said(to(ADMIN))?.text), 'the owner sees it');
  ok(/You won Plug Run Daily #4/.test(said(to('111'))?.text) && /winner: Ana/.test(said(to(ADMIN))?.text), 'and Ana, next in line, wins it');
  eq(JSON.parse(store.get('prize:win:4')).userId, 'u_a', 'stored');
  await call('POST', 'prize-claim', { userId: 'u_a', token: 't_u_a', day: 4, wallet: RAW, initData: sign('111') });
  ok(/Ana claimed Daily #4/.test(said(to(ADMIN))?.text), 'the new winner can claim it');

  // Daily #5: a winner the bot cannot message, who then never claims.
  rank(5, 'u_web', 50000.01); rank(5, 'u_c', 70000.01);
  clock = DAILY_EPOCH_MS / 1000 + 5 * DAY + PRIZE_SETTLE_DELAY_S;
  await h.settle();
  ok(/Could not message them/.test(said(to(ADMIN))?.text || ''), 'the owner hears the winner could not be messaged');
  sent.length = 0;

  // Status, and turning it off.
  clock = DAILY_EPOCH_MS / 1000 + 6 * DAY + 3600; // Daily #7
  await chat(ADMIN, '/prize');
  const st = said(to(ADMIN))?.text || '';
  ok(/Daily prize: 1 GRAM a day, through #8/.test(st) && /Today #7: 1 GRAM · 0 ranked · leader none yet/.test(st) && /#3 Ana 1:02\.0 · 1 GRAM · paid/.test(st) && /#4 Ana 0:59\.0 · 1 GRAM · claimed, not paid/.test(st) && /#5 Cy 1:10\.0 · 1 GRAM · waiting for a wallet/.test(st), 'the owner\'s status: setting, today, recent days');
  sent.length = 0;
  await chat(ADMIN, '/prize off');
  ok(/off from tomorrow\. Today's 1 GRAM \(Daily #7\) still stands/.test(said(to(ADMIN))?.text), 'off from tomorrow, today stands');
  clock += DAY;
  eq((await status('u_a')).today, null, 'no prize the next day');
  rank(8, 'u_a', 50000);
  clock += DAY + PRIZE_SETTLE_DELAY_S;
  await h.settle();
  eq(store.get('prize:win:8'), undefined, 'and nothing to settle');
  sent.length = 0;
  await chat(ADMIN, '/prize nonsense');
  ok(/Commands:/.test(said(to(ADMIN))?.text), 'a mistyped command gets the help');

  // Daily #9 on again; nobody from Telegram raced.
  await chat(ADMIN, '/prize 1');
  sent.length = 0;
  rank(9, 'u_web', 50000);
  clock += DAY;
  await h.settle();
  ok(/Daily #9: no Telegram runs among 1 ranked/.test(said(to(ADMIN))?.text), 'a day without Telegram runs pays nothing');

  // Cy never claimed Daily #5: a week after it settled, it has expired.
  clock = DAILY_EPOCH_MS / 1000 + 5 * DAY + PRIZE_SETTLE_DELAY_S + 7 * DAY + 60;
  eq((await status('u_c')).wins.find((w) => w.day === 5)?.status, 'expired', 'a week later the win has expired');
  eq((await call('POST', 'prize-claim', { userId: 'u_c', token: 't_u_c', day: 5, wallet: RAW, initData: sign('333') })).status, 410, 'and cannot be claimed');
}
console.log('dailyPrize: ' + checks + ' assertions passed');
