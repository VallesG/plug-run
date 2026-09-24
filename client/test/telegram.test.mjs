// Telegram Mini App: launch parsing, app setup, the loading-screen handover,
// and the token check endpoint. Runs without a browser or network: Telegram's
// WebApp object and the Bot API are stand-ins.
import assert from 'node:assert/strict';
import {
  isTelegramShell, startParamKind, versionAtLeast, telegramContext, scrubbedUrl, WEB_CONTEXT
} from '../src/logic/telegramLaunch.js';
import { startTelegram, attachTelegramGame } from '../src/platform/telegram.js';
import { createTelegramHandler } from '../netlify/functions/telegram.mjs';

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); checks++; };

// --- Only /tg is the Telegram app; the plain site stays the web game.
eq([isTelegramShell('/tg'), isTelegramShell('/tg/'), isTelegramShell('/tg/x'), isTelegramShell('/'),
  isTelegramShell('/tgx'), isTelegramShell('/c/tg'), isTelegramShell(undefined)],
  [true, true, true, false, false, false, false], 'only /tg paths are the Telegram shell');

// --- startapp values: a prefix and an id, never anything else.
eq(['c_7Fq2Lm9xKa', 'r_abc', 's_launch', 'hello', '', undefined, 'c_' + 'x'.repeat(70), 'c_bad id', 'c_'].map(startParamKind),
  ['challenge', 'ref', 'campaign', 'other', 'none', 'none', 'invalid', 'invalid', 'other'], 'start param kinds');

// --- Telegram versions compare as dotted integers.
ok(versionAtLeast('7.10', '7.7'), '7.10 is newer than 7.7');
ok(versionAtLeast('8.0', '8.0'), 'equal versions pass');
ok(!versionAtLeast('6.9', '7.7'), '6.9 is older than 7.7');
ok(!versionAtLeast(undefined, '6.1'), 'a missing version fails the check');

// --- Analytics context: what the launch was, never who.
const fakeUser = { id: 123456789, first_name: 'Sam', username: 'sam' };
const ctx = telegramContext({ platform: 'android', version: '9.1', initDataUnsafe: { user: fakeUser, start_param: 'c_7Fq2Lm9xKa' } });
eq(ctx, { platform: 'telegram', client: 'telegram_miniapp', source: 'telegram', tg_platform: 'android', tg_version: '9.1', start_kind: 'challenge' }, 'telegram context');
ok(!JSON.stringify(ctx).includes('Sam') && !JSON.stringify(ctx).includes('123456789') && !JSON.stringify(ctx).includes('7Fq2Lm9xKa'),
  'the context carries no user id, name or raw start param');
eq(WEB_CONTEXT, { platform: 'web', client: 'web' }, 'web context');

// --- The address analytics sees: no fragment, no tgWebApp values.
eq(scrubbedUrl('https://plugrun.io/tg?utm_source=telegram&tgWebAppStartParam=c_1#tgWebAppData=user%3D%7B%22id%22%3A1%7D&tgWebAppVersion=9.1'),
  'https://plugrun.io/tg?utm_source=telegram', 'fragment and tgWebApp params removed, UTM kept');
eq(scrubbedUrl('https://plugrun.io/'), 'https://plugrun.io/', 'a clean address is unchanged');
eq(scrubbedUrl('not a url'), null, 'garbage in, null out');

// --- App setup: calls gated by the client's Bot API version.
function fakeWebApp(version, initData = 'query_id=1&user=%7B%7D&auth_date=1&hash=x') {
  const calls = [];
  const rec = (name) => (...args) => calls.push([name, ...args]);
  return {
    calls, version, initData, platform: 'ios', initDataUnsafe: {},
    expand: rec('expand'), ready: rec('ready'), disableVerticalSwipes: rec('disableVerticalSwipes'),
    setHeaderColor: rec('setHeaderColor'), setBackgroundColor: rec('setBackgroundColor'), setBottomBarColor: rec('setBottomBarColor')
  };
}
{
  const wa = fakeWebApp('9.1');
  globalThis.Telegram = { WebApp: wa };
  const started = await startTelegram();
  ok(started && started.webApp === wa, 'a real launch starts');
  eq(wa.calls.map((c) => c[0]), ['expand', 'disableVerticalSwipes', 'setHeaderColor', 'setBackgroundColor', 'setBottomBarColor'], 'setup on a current client');
  ok(!wa.calls.some((c) => c[0] === 'ready'), 'ready() waits for the menu');
  eq(wa.calls.filter((c) => /Color$/.test(c[0])).map((c) => c[1]), ['#0b0b12', '#0b0b12', '#0b0b12'], 'Telegram chrome painted the game background');
}
{
  const wa = fakeWebApp('6.0');
  globalThis.Telegram = { WebApp: wa };
  await startTelegram();
  eq(wa.calls.map((c) => c[0]), ['expand'], 'an old client only gets expand()');
}
{
  globalThis.Telegram = { WebApp: fakeWebApp('9.1', '') };
  eq(await startTelegram(), null, 'Telegram script in a plain browser (no initData) is not a launch');
  const wa = fakeWebApp('9.1');
  wa.expand = () => { throw new Error('boom'); };
  globalThis.Telegram = { WebApp: wa };
  ok(await startTelegram(), 'a throwing Telegram call does not stop the launch');
  delete globalThis.Telegram;
  eq(await startTelegram({ doc: null }), null, 'no script and no document resolves null');
}

// --- Loading-screen handover: ready() once, when the menu is created.
{
  const listeners = {};
  const menu = { events: { once: (ev, fn) => { listeners['menu:' + ev] = fn; } } };
  const game = { isBooted: false, events: { once: (ev, fn) => { listeners['game:' + ev] = fn; } }, scene: { getScene: (k) => (k === 'MENU' ? menu : null) } };
  const wa = fakeWebApp('9.1');
  const handover = attachTelegramGame(game, wa, { fallbackMs: 60000 });
  ok(!handover.sent, 'nothing sent before the game boots');
  listeners['game:ready']();
  ok(!handover.sent, 'booting alone does not hide Telegram\'s loader');
  listeners['menu:create']();
  listeners['menu:create']();
  eq(wa.calls.filter((c) => c[0] === 'ready').length, 1, 'ready() exactly once when the menu draws');
}
{
  const wa = fakeWebApp('9.1');
  const game = { isBooted: true, events: { once() {} }, scene: { getScene: () => ({ events: { once() {} } }) } };
  const handover = attachTelegramGame(game, wa, { fallbackMs: 5 });
  await new Promise((r) => setTimeout(r, 30));
  ok(handover.sent && wa.calls.filter((c) => c[0] === 'ready').length === 1, 'the fallback hands over if the menu never draws');
}

// --- Token check: answers with the bot name, never the token.
const SECRET = '123456:SECRET-token-value';
const req = (url, method = 'GET') => ({ url, method });
async function body(res) { return { status: res.status, json: JSON.parse(await res.text()) }; }
{
  let asked = null;
  const handler = createTelegramHandler({ token: () => SECRET, fetchImpl: async (url) => { asked = url; return { json: async () => ({ ok: true, result: { id: 1, is_bot: true, username: 'PlugRunBot', has_main_web_app: true } }) }; } });
  const res = await body(await handler(req('https://plugrun.io/.netlify/functions/telegram?action=ping')));
  eq(res, { status: 200, json: { ok: true, bot: '@PlugRunBot', mainMiniApp: true } }, 'ping names the bot');
  eq(asked, 'https://api.telegram.org/bot' + SECRET + '/getMe', 'ping asks getMe with the token');
}
{
  const bad = createTelegramHandler({ token: () => SECRET, fetchImpl: async () => ({ json: async () => ({ ok: false, error_code: 401, description: 'Unauthorized' }) }) });
  const res = await body(await bad(req('https://x/.netlify/functions/telegram?action=ping')));
  eq(res.status, 502, 'a rejected token is a 502');
  ok(!JSON.stringify(res.json).includes('SECRET'), 'a rejected token is not echoed');
  const down = createTelegramHandler({ token: () => SECRET, fetchImpl: async (url) => { throw new Error('fetch failed ' + url); } });
  const res2 = await body(await down(req('https://x/.netlify/functions/telegram?action=ping')));
  eq(res2.status, 502, 'Telegram unreachable is a 502');
  ok(!JSON.stringify(res2.json).includes('SECRET'), 'a network error carrying the URL is not echoed');
  const unset = createTelegramHandler({ token: () => undefined, fetchImpl: async () => { throw new Error('must not call'); } });
  eq((await body(await unset(req('https://x/.netlify/functions/telegram?action=ping')))).status, 500, 'a missing token says so');
  eq((await body(await unset(req('https://x/.netlify/functions/telegram?action=nope')))).status, 404, 'unknown action');
  eq((await body(await unset(req('https://x/.netlify/functions/telegram?action=ping', 'POST')))).status, 404, 'ping is GET only');
}

// --- Sign-in: Telegram's signature, then one Plug Run identity per Telegram account.
{
  const { createHmac } = await import('node:crypto');
  const { validateInitData, displayName } = await import('../netlify/functions/telegram.mjs');
  const BOT = '123456:TEST-bot-token';
  const NOW = 1_758_600_000;
  const sign = (fields, bot = BOT) => {
    const p = new URLSearchParams(fields);
    const check = [...p].map(([k, v]) => k + '=' + v).sort().join('\n');
    const secret = createHmac('sha256', 'WebAppData').update(bot).digest();
    p.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
    return p.toString();
  };
  const tgUser = (id, first_name) => JSON.stringify({ id, first_name, username: 'u' + id, language_code: 'en' });
  const good = sign({ query_id: 'AAH1', user: tgUser(987654321, 'Sam'), auth_date: String(NOW - 60), signature: 'abc' });
  ok(validateInitData(good, BOT, { nowSec: NOW })?.user.id === 987654321, 'a correctly signed launch validates (signature field included in the check)');
  eq(validateInitData(good, '999:other', { nowSec: NOW }), null, 'signed for another bot: refused');
  eq(validateInitData(good.replace('Sam', 'Max'), BOT, { nowSec: NOW }), null, 'edited user data: refused');
  eq(validateInitData(good, BOT, { nowSec: NOW + 2 * 86400 }), null, 'older than a day: refused');
  eq(validateInitData('user=%7B%7D&auth_date=1', BOT, { nowSec: NOW }), null, 'no hash: refused');
  eq(validateInitData(sign({ user: 'not json', auth_date: String(NOW) }), BOT, { nowSec: NOW }), null, 'broken user: refused');

  eq(displayName('  Sam  '), 'Sam', 'trimmed');
  eq(displayName('Sa​m‮'), 'Sam', 'zero-width and bidi characters removed');
  eq(Array.from(displayName('🔥'.repeat(40))).length, 24, 'capped at 24 characters (emoji count as one)');
  eq(displayName('​​'), null, 'nothing usable left: null');
  eq(displayName(undefined), null, 'no name: null');

  const store = new Map();
  const redis = async ([cmd, key, value]) => { if (cmd === 'GET') return store.get(key) ?? null; if (cmd === 'SET') { store.set(key, value); return 'OK'; } throw new Error(cmd); };
  const handler = createTelegramHandler({ token: () => BOT, redis, nowSec: () => NOW });
  const auth = async (body) => body_(await handler({ url: 'https://plugrun.io/.netlify/functions/telegram?action=auth', method: 'POST', text: async () => JSON.stringify(body) }));
  async function body_(res) { return { status: res.status, json: JSON.parse(await res.text()) }; }

  // An existing web player opens the Telegram app: their identity, proven by its token, is kept and renamed.
  store.set('user:guest_1', JSON.stringify({ username: 'NeonRunr42', token: 'tok-1', recoveryCode: 'AAAA-BBBB-CCCC', lastSubmitAt: 5 }));
  const linked = await auth({ initData: good, userId: 'guest_1', token: 'tok-1' });
  eq([linked.status, linked.json.userId, linked.json.username, linked.json.token, linked.json.isNew], [200, 'guest_1', 'Sam', 'tok-1', false], 'existing identity linked and named by Telegram');
  eq(store.get('tg:987654321'), 'guest_1', 'Telegram account mapped to it');
  eq(JSON.parse(store.get('user:guest_1')).lastSubmitAt, 5, 'leaderboard record kept');

  // Same Telegram account on another device (fresh storage): the same identity comes back.
  const again = await auth({ initData: good, userId: 'guest_new', token: null });
  eq([again.json.userId, again.json.token, again.json.isNew], ['guest_1', 'tok-1', false], 'another device gets the linked identity back');

  // Someone offering another player's id without its token gets nothing of theirs.
  const other = sign({ user: tgUser(5555, 'Eve'), auth_date: String(NOW) });
  const stolen = await auth({ initData: other, userId: 'guest_1', token: 'wrong' });
  ok(stolen.json.userId !== 'guest_1' && stolen.json.isNew === true && stolen.json.username === 'Eve', 'a wrong token cannot claim an identity');

  // A brand-new player with an unusable name gets a readable fallback.
  const blank = sign({ user: tgUser(424242, '​'), auth_date: String(NOW) });
  const fresh = await auth({ initData: blank });
  ok(fresh.json.isNew && fresh.json.username === 'Runner4242' && /^u_/.test(fresh.json.userId) && fresh.json.token, 'new player provisioned with a fallback name');
  ok(store.get('recovery:' + fresh.json.recoveryCode) === fresh.json.userId, 'new player gets a working recovery code');

  eq((await auth({ initData: good.replace('Sam', 'Max') })).status, 401, 'forged launch: 401');
  const unset = createTelegramHandler({ token: () => undefined, redis });
  eq((await body_(await unset({ url: 'https://x/?action=auth', method: 'POST', text: async () => '{}' }))).status, 500, 'no token configured: 500');
  const broken = createTelegramHandler({ token: () => BOT, redis: async () => { throw new Error('Upstash 503'); }, nowSec: () => NOW });
  eq((await body_(await broken({ url: 'https://x/?action=auth', method: 'POST', text: async () => JSON.stringify({ initData: good }) }))).status, 500, 'storage down: 500, not a crash');
}

// --- Challenges: create, open, report; the welcome card.
{
  const { createHmac } = await import('node:crypto');
  const { challengeSpec, challengeText, raceTime } = await import('../netlify/functions/telegram.mjs');
  const BOT = '123456:TEST-bot-token', NOW = 1_758_600_000;
  const sign = (fields) => {
    const p = new URLSearchParams(fields);
    const check = [...p].map(([k, v]) => k + '=' + v).sort().join('\n');
    const secret = createHmac('sha256', 'WebAppData').update(BOT).digest();
    p.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
    return p.toString();
  };
  const store = new Map();
  const redis = async ([cmd, key, value]) => {
    if (cmd === 'GET') return store.get(key) ?? null;
    if (cmd === 'SET') { store.set(key, value); return 'OK'; }
    if (cmd === 'INCR') { const n = Number(store.get(key) || 0) + 1; store.set(key, String(n)); return n; }
    if (cmd === 'EXPIRE') return 1;
    throw new Error(cmd);
  };
  const tgCalls = [];
  const fetchImpl = async (url, opts) => {
    const method = url.split('/').pop();
    tgCalls.push({ method, body: opts?.body ? JSON.parse(opts.body) : null });
    if (method === 'getMe') return { json: async () => ({ ok: true, result: { username: 'PlugRunBot' } }) };
    if (method === 'savePreparedInlineMessage') return { json: async () => ({ ok: true, result: { id: 'prep-1', expiration_date: NOW + 3600 } }) };
    return { json: async () => ({ ok: true, result: true }) };
  };
  const h = createTelegramHandler({ token: () => BOT, redis, fetchImpl, nowSec: () => NOW });
  const call = async (method, action, body, extra = '', headers = {}) => {
    const res = await h({ url: 'https://plugrun.io/.netlify/functions/telegram?action=' + action + extra, method,
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)), headers: { get: (k) => headers[k] ?? null } });
    return { status: res.status, json: JSON.parse(await res.text()) };
  };
  store.set('user:u_sam', JSON.stringify({ username: 'Sam', token: 'tok-sam' }));
  store.set('user:u_max', JSON.stringify({ username: 'Max', token: 'tok-max' }));
  const race = { slot: 4, stashSeed: 123456, recordingID: 'jev-v1/rivals-v1-1463392172/0042', pool: 'ordinary', ms: 66100, courseName: 'Canal Row', rivalName: 'JEV' };
  eq(challengeSpec({ ...race, extra: 'x' }), race, 'challenge spec keeps only the race fields');
  eq([challengeSpec({ ...race, ms: 5 }), challengeSpec({ ...race, slot: 'x' }), challengeSpec({ ...race, recordingID: 'bad id!' }), challengeSpec(null)], [null, null, null, null], 'bad specs refused');
  eq(raceTime(66100), '1:06.1', 'race time label');
  eq(challengeText({ ...race, name: 'Sam' }), 'Sam ran seven houses on Canal Row against JEV in 1:06.1. Think you can beat it?', 'card caption');

  eq((await call('POST', 'challenge', { userId: 'u_sam', token: 'wrong', challenge: race })).status, 403, 'a challenge needs the player\'s token');
  const initData = sign({ user: JSON.stringify({ id: 777, first_name: 'Sam' }), auth_date: String(NOW) });
  const made = await call('POST', 'challenge', { userId: 'u_sam', token: 'tok-sam', challenge: race, initData });
  ok(made.status === 200 && /^[A-Za-z0-9]{10}$/.test(made.json.id), 'challenge created with a short id');
  eq(made.json.link, 'https://t.me/PlugRunBot/play?startapp=c_' + made.json.id, 'link opens the direct-link app with the id as start param');
  ok(('c_' + made.json.id).length <= 64, 'start param within Telegram\'s limit');
  eq(made.json.preparedId, 'prep-1', 'a prepared Telegram message is returned for the share dialog');
  const prep = tgCalls.find((c) => c.method === 'savePreparedInlineMessage').body;
  ok(prep.user_id === 777 && prep.result.type === 'photo' && prep.result.reply_markup.inline_keyboard[0][0].url === made.json.link, 'the card is for this Telegram user and its button is the challenge link');
  ok(!('web_app' in prep.result.reply_markup.inline_keyboard[0][0]), 'shared cards use a URL button (web_app buttons only work in the bot chat)');
  const web = await call('POST', 'challenge', { userId: 'u_sam', token: 'tok-sam', challenge: race });
  ok(web.status === 200 && web.json.preparedId === null, 'outside Telegram: a link, no prepared message');

  const opened = await call('GET', 'challenge', null, '&id=' + made.json.id);
  ok(opened.status === 200 && opened.json.slot === 4 && opened.json.stashSeed === 123456 && opened.json.recordingID === race.recordingID && opened.json.name === 'Sam', 'the friend gets the same race and the creator\'s name');
  ok(!('userId' in opened.json), 'the creator\'s account id is not handed out');
  eq(store.get('ch:' + made.json.id + ':opens'), '1', 'opens are counted');
  eq((await call('GET', 'challenge', null, '&id=nope')).status, 400, 'malformed id');
  eq((await call('GET', 'challenge', null, '&id=ZZZZZZZZZZ')).status, 404, 'unknown challenge');

  const beat = await call('POST', 'challenge-result', { id: made.json.id, userId: 'u_max', token: 'tok-max', ms: 60000, houses: 7 });
  ok(beat.json.beat === true && beat.json.creatorMs === 66100, 'a faster full run beats it');
  eq([store.get('ch:' + made.json.id + ':plays'), store.get('ch:' + made.json.id + ':beaten')], ['1', '1'], 'plays and beats are counted');
  const short = await call('POST', 'challenge-result', { id: made.json.id, userId: 'u_max', token: 'tok-max', ms: 50000, houses: 5 });
  eq(short.json.beat, false, 'an unfinished run never beats it');
  const own = await call('POST', 'challenge-result', { id: made.json.id, userId: 'u_sam', token: 'tok-sam', ms: 50000, houses: 7 });
  ok(own.json.self && store.get('ch:' + made.json.id + ':plays') === '2', 'the creator\'s own replay is not counted as a friend playing');

  for (let i = 0; i < 50; i++) await call('POST', 'challenge', { userId: 'u_max', token: 'tok-max', challenge: race });
  eq((await call('POST', 'challenge', { userId: 'u_max', token: 'tok-max', challenge: race })).status, 429, 'a daily cap on new challenges');

  // Welcome card: only with Telegram's secret header, only in the private bot chat.
  const setup = await call('GET', 'setup-webhook', null);
  const hook = tgCalls.find((c) => c.method === 'setWebhook').body;
  ok(setup.status === 200 && hook.url === 'https://plugrun.io/.netlify/functions/telegram?action=webhook' && /^[0-9a-f]{48}$/.test(hook.secret_token), 'webhook registered with a derived secret');
  ok(!JSON.stringify(setup.json).includes(hook.secret_token) && !JSON.stringify(hook).includes('TEST-bot-token'), 'the secret and token are never returned');
  const start = { message: { chat: { id: 42, type: 'private' }, text: '/start' } };
  eq((await call('POST', 'webhook', start, '', {})).status, 403, 'a webhook call without the secret is refused');
  tgCalls.length = 0;
  await call('POST', 'webhook', start, '', { 'x-telegram-bot-api-secret-token': hook.secret_token });
  const card = tgCalls.find((c) => c.method === 'sendPhoto')?.body;
  ok(card?.chat_id === 42 && card.reply_markup.inline_keyboard[0][0].web_app.url === 'https://plugrun.io/tg', '/start answers with a PLAY button that opens the game');
  tgCalls.length = 0;
  await call('POST', 'webhook', { message: { chat: { id: -5, type: 'group' }, text: '/start' } }, '', { 'x-telegram-bot-api-secret-token': hook.secret_token });
  eq(tgCalls.length, 0, 'group messages are ignored');
}

console.log('telegram: ' + checks + ' assertions passed');
