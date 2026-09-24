// netlify/functions/telegram.mjs
//
// Plug Run's Telegram endpoint.
//
//   GET  ?action=ping   Asks Telegram which bot TELEGRAM_BOT_TOKEN belongs to and
//                       answers { ok, bot: '@name', mainMiniApp }. The token itself
//                       never leaves this function: not in a response, not in a log.
//
//   POST ?action=auth   { initData, userId?, token? } -> { ok, userId, username,
//                       token, recoveryCode?, isNew }. Signs a Telegram player in:
//                       checks Telegram's signature on initData, then links the
//                       Telegram account to one Plug Run identity (the leaderboard's
//                       user:{id} record in Upstash) and names it by the player's
//                       Telegram first name. userId/token are this device's existing
//                       identity, adopted only when the token matches.
import { createHmac, timingSafeEqual, randomUUID, randomBytes } from 'node:crypto';
import { dailyNumber } from '../../src/logic/dailyRace.js';

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

export const AUTH_MAX_AGE_SEC = 24 * 60 * 60;
export const NAME_MAX_LEN = 24; // leaderboard.js USERNAME_MAX_LEN
const USERID_MAX_LEN = 40;

/**
 * Telegram's check, as documented: secret = HMAC_SHA256(key "WebAppData",
 * bot_token); every field but hash, sorted, "key=value", joined by \n;
 * valid when hex(HMAC_SHA256(secret, that)) === hash. Returns the parsed
 * fields ({ user, auth_date, start_param, ... }) or null.
 */
export function validateInitData(initData, botToken, { nowSec = Math.floor(Date.now() / 1000), maxAgeSec = AUTH_MAX_AGE_SEC } = {}) {
  if (typeof initData !== 'string' || !initData || initData.length > 4096 || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return null;
  const pairs = [];
  for (const [k, v] of params) if (k !== 'hash') pairs.push(k + '=' + v);
  pairs.sort();
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(pairs.join('\n')).digest();
  const given = Buffer.from(hash, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || nowSec - authDate > maxAgeSec || authDate - nowSec > 300) return null;
  let user = null;
  try { user = JSON.parse(params.get('user') || 'null'); } catch { return null; }
  if (!user || !Number.isSafeInteger(user.id)) return null;
  return { user, auth_date: authDate, start_param: params.get('start_param') || null };
}

/** A Telegram first name, made safe to show on a leaderboard. Null when nothing usable is left. */
export function displayName(first) {
  if (typeof first !== 'string') return null;
  const clean = first.normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, '') // control, zero-width, bidi overrides
    .replace(/\s+/gu, ' ').trim();
  const chars = Array.from(clean).slice(0, NAME_MAX_LEN).join('').trim();
  return chars || null;
}

const SITE = 'https://plugrun.io';
export const CHALLENGE_TTL_SEC = 30 * 86400;
export const CHALLENGES_PER_DAY = 50;

/** The race a challenge replays, checked field by field; null if anything is off. */
export function challengeSpec(c) {
  if (!c || typeof c !== 'object') return null;
  const slot = Number(c.slot), stashSeed = Number(c.stashSeed), ms = Number(c.ms);
  if (!Number.isInteger(slot) || slot < 0 || slot > 999) return null;
  if (!Number.isInteger(stashSeed) || stashSeed < 0 || stashSeed > 0xffffffff) return null;
  if (!Number.isFinite(ms) || ms < 10_000 || ms > 3_600_000) return null;
  if (typeof c.recordingID !== 'string' || !/^[A-Za-z0-9_.:\/-]{1,160}$/.test(c.recordingID)) return null;
  const pool = typeof c.pool === 'string' && /^[a-z-]{1,24}$/.test(c.pool) ? c.pool : 'ordinary';
  const courseName = typeof c.courseName === 'string' ? c.courseName.replace(/[\p{Cc}\p{Cf}]/gu, '').slice(0, 40) : '';
  const rivalName = typeof c.rivalName === 'string' ? c.rivalName.replace(/[\p{Cc}\p{Cf}]/gu, '').slice(0, 24) : '';
  const daily = Number.isInteger(c.daily) && c.daily > 0 && c.daily < 100000 ? c.daily : null;
  return { slot, stashSeed, recordingID: c.recordingID, pool, ms: Math.round(ms), courseName, rivalName, ...(daily ? { daily } : {}) };
}

export function raceTime(ms) {
  const t = Math.max(0, Math.round(ms / 100));
  const m = Math.floor(t / 600), s = Math.floor((t % 600) / 10), d = t % 10;
  return m + ':' + String(s).padStart(2, '0') + '.' + d;
}

export function challengeText(rec) {
  const where = rec.courseName ? ' on ' + rec.courseName : '';
  const vs = rec.rivalName ? ' against ' + rec.rivalName : '';
  const lead = rec.daily ? 'Plug Run Daily #' + rec.daily + ': ' : '';
  return lead + rec.name + ' ran seven houses' + where + vs + ' in ' + raceTime(rec.ms) + '. Think you can beat it?';
}

function challengeId() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from(randomBytes(10), (b) => abc[b % abc.length]).join('');
}

function recoveryCode() {
  const hex = randomBytes(6).toString('hex').toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

export function createTelegramHandler({
  token = () => process.env.TELEGRAM_BOT_TOKEN,
  fetchImpl = (...args) => globalThis.fetch(...args),
  redis = upstash,
  nowSec = () => Math.floor(Date.now() / 1000)
} = {}) {
  async function ping() {
    const botToken = token();
    if (!botToken) return json(500, { ok: false, error: 'TELEGRAM_BOT_TOKEN is not set for this site' });
    let data = null;
    try {
      const res = await fetchImpl('https://api.telegram.org/bot' + botToken + '/getMe');
      data = await res.json();
    } catch {
      // The request URL contains the token, so the error is never echoed.
      return json(502, { ok: false, error: 'could not reach Telegram' });
    }
    if (!data?.ok || typeof data.result?.username !== 'string') {
      return json(502, { ok: false, error: 'Telegram did not accept the token' });
    }
    return json(200, { ok: true, bot: '@' + data.result.username, mainMiniApp: data.result.has_main_web_app === true });
  }

  async function auth(req) {
    const botToken = token();
    if (!botToken) return json(500, { ok: false, error: 'not configured' });
    let body = null;
    try { body = JSON.parse(await req.text()); } catch {}
    const launch = validateInitData(body?.initData, botToken, { nowSec: nowSec() });
    if (!launch) return json(401, { ok: false, error: 'bad initData' });
    const tgKey = 'tg:' + launch.user.id;
    const readMeta = async (id) => { const raw = await redis(['GET', 'user:' + id]); try { return raw ? JSON.parse(raw) : null; } catch { return null; } };
    const name = displayName(launch.user.first_name);

    // 1. This Telegram account already has a Plug Run identity: that one, everywhere.
    let userId = await redis(['GET', tgKey]);
    let meta = userId ? await readMeta(userId) : null;
    let isNew = false;
    if (!meta) {
      // 2. This device already has one, proven by its token: link it, progress and all.
      const localId = typeof body?.userId === 'string' && body.userId.length <= USERID_MAX_LEN ? body.userId : null;
      const localMeta = localId ? await readMeta(localId) : null;
      if (localMeta && typeof body?.token === 'string' && localMeta.token === body.token) {
        userId = localId; meta = localMeta;
      } else {
        // 3. A new player.
        userId = 'u_' + randomUUID().replace(/-/g, '').slice(0, 20);
        const code = recoveryCode();
        meta = { username: name || 'Runner' + String(launch.user.id).slice(-4), token: randomUUID(), recoveryCode: code, lastSubmitAt: 0 };
        await redis(['SET', 'recovery:' + code, userId]);
        isNew = true;
      }
    }
    if (name) meta.username = name;
    meta.telegramId = String(launch.user.id);
    await redis(['SET', 'user:' + userId, JSON.stringify(meta)]);
    await redis(['SET', tgKey, userId]);
    return json(200, { ok: true, userId, username: meta.username, token: meta.token, recoveryCode: meta.recoveryCode || null, isNew });
  }

  // --- Challenges -------------------------------------------------------------
  // A challenge is a finished Block Rivals race someone dares a friend to beat:
  // the same course, stash layout and recorded rival, and the creator's time.
  // Only an id travels in the link (t.me/<bot>/play?startapp=c_<id>); the race
  // lives here, so a link can't be edited into a custom race.
  let botUsername = null;
  async function botName() {
    if (botUsername) return botUsername;
    const res = await fetchImpl('https://api.telegram.org/bot' + token() + '/getMe');
    const data = await res.json();
    if (!data?.ok) throw new Error('getMe refused');
    return (botUsername = data.result.username);
  }
  const readUser = async (id) => {
    if (typeof id !== 'string' || !id || id.length > USERID_MAX_LEN) return null;
    const raw = await redis(['GET', 'user:' + id]);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  };
  async function signedIn(body) {
    const meta = await readUser(body?.userId);
    return meta && typeof body?.token === 'string' && meta.token === body.token ? meta : null;
  }

  async function createChallenge(req) {
    let body = null;
    try { body = JSON.parse(await req.text()); } catch {}
    const meta = await signedIn(body);
    if (!meta) return json(403, { ok: false, error: 'no identity' });
    const spec = challengeSpec(body?.challenge);
    if (!spec) return json(400, { ok: false, error: 'bad challenge' });
    const day = new Date(nowSec() * 1000).toISOString().slice(0, 10);
    const rateKey = 'ch:rate:' + body.userId + ':' + day;
    const count = Number(await redis(['INCR', rateKey]));
    if (count === 1) await redis(['EXPIRE', rateKey, String(2 * 86400)]);
    if (count > CHALLENGES_PER_DAY) return json(429, { ok: false, error: 'too many challenges today' });
    const id = challengeId();
    const record = { ...spec, name: meta.username, userId: body.userId, createdAt: nowSec() };
    await redis(['SET', 'ch:' + id, JSON.stringify(record), 'EX', String(CHALLENGE_TTL_SEC)]);
    const bot = await botName();
    const link = 'https://t.me/' + bot + '/play?startapp=c_' + id;
    const out = { ok: true, id, link, text: challengeText(record), preparedId: null };
    // In Telegram, a prepared message lets the player send the card to any chat.
    const launch = validateInitData(body?.initData, token(), { nowSec: nowSec() });
    if (launch) {
      try {
        const res = await fetchImpl('https://api.telegram.org/bot' + token() + '/savePreparedInlineMessage', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: launch.user.id,
            result: {
              type: 'photo', id: 'c_' + id,
              photo_url: SITE + '/share/challenge-card.jpg', thumbnail_url: SITE + '/share/challenge-thumb.jpg',
              caption: challengeText(record),
              reply_markup: { inline_keyboard: [[{ text: '🏁 RACE ME', url: link }]] }
            },
            allow_user_chats: true, allow_group_chats: true, allow_channel_chats: true
          })
        });
        const data = await res.json();
        if (data?.ok && typeof data.result?.id === 'string') out.preparedId = data.result.id;
      } catch {}
    }
    return json(200, out);
  }

  async function getChallenge(url) {
    const id = url.searchParams.get('id') || '';
    if (!/^[A-Za-z0-9]{6,20}$/.test(id)) return json(400, { ok: false, error: 'bad id' });
    const raw = await redis(['GET', 'ch:' + id]);
    if (!raw) return json(404, { ok: false, error: 'challenge not found' });
    let rec = null;
    try { rec = JSON.parse(raw); } catch { return json(404, { ok: false, error: 'challenge not found' }); }
    await redis(['INCR', 'ch:' + id + ':opens']);
    const { userId, ...pub } = rec;
    return json(200, { ok: true, id, ...pub });
  }

  async function challengeResult(req) {
    let body = null;
    try { body = JSON.parse(await req.text()); } catch {}
    const meta = await signedIn(body);
    if (!meta) return json(403, { ok: false, error: 'no identity' });
    const id = typeof body?.id === 'string' && /^[A-Za-z0-9]{6,20}$/.test(body.id) ? body.id : null;
    const raw = id ? await redis(['GET', 'ch:' + id]) : null;
    if (!raw) return json(404, { ok: false, error: 'challenge not found' });
    const rec = JSON.parse(raw);
    const ms = Number(body.ms), houses = Number(body.houses);
    if (!Number.isFinite(ms) || ms < 0 || ms > 3_600_000 || !Number.isInteger(houses) || houses < 0 || houses > 7) {
      return json(400, { ok: false, error: 'bad result' });
    }
    const self = body.userId === rec.userId;
    if (!self) {
      await redis(['INCR', 'ch:' + id + ':plays']);
      if (houses === 7 && ms < rec.ms) await redis(['INCR', 'ch:' + id + ':beaten']);
    }
    return json(200, { ok: true, beat: houses === 7 && ms < rec.ms, creatorMs: rec.ms, name: rec.name, self });
  }

  // --- The bot's chat ---------------------------------------------------------
  // Someone opening @PlugRunBot sees a welcome card with a PLAY button instead
  // of an empty chat. Telegram delivers messages to ?action=webhook, signed with
  // a secret derived from the bot token (never stored or shown anywhere).
  const webhookSecret = () => createHmac('sha256', 'plugrun-webhook').update(String(token())).digest('hex').slice(0, 48);
  const botApi = async (method, payload) => {
    const res = await fetchImpl('https://api.telegram.org/bot' + token() + '/' + method, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    return res.json();
  };

  async function setupWebhook() {
    if (!token()) return json(500, { ok: false, error: 'not configured' });
    const hook = await botApi('setWebhook', {
      url: SITE + '/.netlify/functions/telegram?action=webhook',
      secret_token: webhookSecret(), allowed_updates: ['message'], drop_pending_updates: true
    });
    await botApi('setMyCommands', { commands: [{ command: 'start', description: 'Play Plug Run' }, { command: 'privacy', description: 'Privacy policy' }] });
    return json(hook?.ok ? 200 : 502, { ok: !!hook?.ok, webhook: hook?.ok ? 'set' : 'refused' });
  }

  async function webhook(req) {
    if (req.headers?.get?.('x-telegram-bot-api-secret-token') !== webhookSecret()) return json(403, { ok: false });
    let update = null;
    try { update = JSON.parse(await req.text()); } catch {}
    const msg = update?.message;
    const chatId = msg?.chat?.id;
    if (!chatId || msg.chat.type !== 'private' || typeof msg.text !== 'string') return json(200, { ok: true });
    if (/^\/privacy\b/.test(msg.text)) {
      await botApi('sendMessage', { chat_id: chatId, text: 'Plug Run privacy policy: ' + SITE + '/privacy' });
    } else {
      await botApi('sendPhoto', {
        chat_id: chatId, photo: SITE + '/share/challenge-card.jpg',
        caption: 'Plug Run: grab the stash, lose the Plug, make the getaway car.\n\nRun the campaign with your crew, or race Block Rivals head-to-head and challenge your friends to beat your time.',
        reply_markup: { inline_keyboard: [[{ text: '▶ PLAY', web_app: { url: SITE + '/tg' } }]] }
      });
    }
    return json(200, { ok: true });
  }

  // --- Daily Race ---------------------------------------------------------------
  // Everyone races the same course and rival each UTC day (src/logic/dailyRace.js
  // picks them). The first seven-house finish a player submits for a day is
  // their official time; the day's board ranks those times.
  async function dailySubmit(req) {
    let body = null;
    try { body = JSON.parse(await req.text()); } catch {}
    const meta = await signedIn(body);
    if (!meta) return json(403, { ok: false, error: 'no identity' });
    const today = dailyNumber(nowSec() * 1000);
    const day = Number(body.day), ms = Number(body.ms), houses = Number(body.houses);
    // A race started just before midnight may finish just after it.
    if (!Number.isInteger(day) || day < today - 1 || day > today) return json(400, { ok: false, error: 'not a current daily' });
    if (!Number.isFinite(ms) || ms < 10_000 || ms > 3_600_000 || !Number.isInteger(houses) || houses < 0 || houses > 7) return json(400, { ok: false, error: 'bad result' });
    const board = 'daily:' + day;
    if (houses === 7) {
      await redis(['ZADD', board, 'NX', String(Math.round(ms)), body.userId]); // first official finish only
      await redis(['HSET', board + ':names', body.userId, meta.username]);
      await redis(['EXPIRE', board, String(8 * 86400)]);
      await redis(['EXPIRE', board + ':names', String(8 * 86400)]);
    }
    await redis(['INCR', board + ':plays']);
    const rank = houses === 7 ? await redis(['ZRANK', board, body.userId]) : null;
    const total = Number(await redis(['ZCARD', board])) || 0;
    return json(200, { ok: true, day, rank: rank === null || rank === undefined ? null : Number(rank) + 1, total });
  }

  return async (req) => {
    let action = null, url = null;
    try { url = new URL(req.url); action = url.searchParams.get('action'); } catch {}
    try {
      if (req.method === 'GET' && action === 'ping') return await ping();
      if (req.method === 'POST' && action === 'auth') return await auth(req);
      if (req.method === 'POST' && action === 'challenge') return await createChallenge(req);
      if (req.method === 'GET' && action === 'challenge') return await getChallenge(url);
      if (req.method === 'POST' && action === 'challenge-result') return await challengeResult(req);
      if (req.method === 'POST' && action === 'webhook') return await webhook(req);
      if (req.method === 'POST' && action === 'daily-submit') return await dailySubmit(req);
      if (req.method === 'GET' && action === 'setup-webhook') return await setupWebhook();
    } catch (e) {
      console.error('[telegram]', action, e?.message ? String(e.message).slice(0, 120) : 'error');
      return json(500, { ok: false, error: 'server error' });
    }
    return json(404, { ok: false, error: 'unknown action' });
  };
}

async function upstash(command) {
  const res = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  return (await res.json()).result;
}

export default createTelegramHandler();
