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

console.log('telegram: ' + checks + ' assertions passed');
