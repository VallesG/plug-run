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
import { dailyNumber, dailySlot, dailyRival, finishMs, DAILY_EPOCH_MS, DAILY_BOARD_SIZE } from '../../src/logic/dailyRace.js';
import { enabledRivalCourses, rivalPoolCourse, RIVAL_RULES_VERSION } from '../../src/logic/rivals.js';
import { validateRivalRunRecord, rivalRecordMatchesCourse } from '../../src/logic/rivalRecords.js';
import { playerRunErrors, PLAYER_RUN_MAX_BYTES } from '../../src/logic/rivalPlayerRuns.js';
import { createPrizeDesk } from '../lib/prizeDesk.mjs';

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
  nowSec = () => Math.floor(Date.now() / 1000),
  // Loaded when a run is stored, so this module imports without the Blobs SDK (tests).
  dailyRuns = async () => (await import('@netlify/blobs')).getStore({ name: 'daily-runs', consistency: 'strong' }),
  // The owner's Telegram id (the bot's /whoami tells it): prize commands and payout messages.
  adminId = () => process.env.ADMIN_TELEGRAM_ID
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
  // Daily Race prizes (netlify/lib/prizeDesk.mjs).
  const prize = createPrizeDesk({ redis, botApi, nowSec, fetchImpl, adminId, dailyRuns, botName,
    telegramUser: (initData) => validateInitData(initData, token(), { nowSec: nowSec() })?.user || null });

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
    if (await prize.command(msg)) return json(200, { ok: true });
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
  // What today's race is, worked out the way the game does it: the day's
  // course, then its Jev bank filtered exactly as the game filters it, then
  // the day's pick. Cached per day and function instance.
  const dailyCache = new Map();
  const isJevRecord = (r) => r?.driverConfig?.driver === 'jev-strategist' && !!r.driverConfig.jev;
  async function dailySpec(n) {
    if (dailyCache.has(n)) return dailyCache.get(n);
    const slot = dailySlot(n, enabledRivalCourses().map((c) => c.slot));
    const course = rivalPoolCourse(slot);
    if (!course) throw new Error('no daily course');
    const res = await fetchImpl(SITE + '/rivals/jev-v1/courses/' + encodeURIComponent(course.id) + '/opponents.json');
    const data = await res.json();
    if (data?.schemaVersion !== 1 || data.rulesVersion !== RIVAL_RULES_VERSION || !Array.isArray(data.opponents)) throw new Error('daily bank unreadable');
    const entries = data.opponents.filter((e) => e && validateRivalRunRecord(e.record).ok
      && rivalRecordMatchesCourse(e.record, course, RIVAL_RULES_VERSION) && e.record.opponent?.kind === 'bot' && isJevRecord(e.record));
    const pick = dailyRival(n, entries, isJevRecord);
    if (!pick) throw new Error('no daily rival');
    const spec = { slot, courseID: course.id, stashSeed: pick.record.stashSeed, rivalID: pick.record.recordingID };
    dailyCache.set(n, spec);
    return spec;
  }

  // The official run's GO takes today's one start ticket. A run is only
  // ranked if it reaches the server within its own race time (plus the
  // result screen and upload) of that ticket, so a player can't play several
  // races and send the best as their first.
  const DAILY_START_GRACE_S = 240;
  // The ticket is sent at GO, so it lands a little after the race clock
  // started (a slow phone network, a cold function): allow that much.
  const DAILY_TICKET_LAG_S = 15;
  async function dailyStart(req) {
    let body = null;
    try { body = JSON.parse(await req.text()); } catch {}
    const meta = await signedIn(body);
    if (!meta) return json(403, { ok: false, error: 'no identity' });
    const today = dailyNumber(nowSec() * 1000), day = Number(body?.day);
    // A race that reaches GO just after midnight UTC started from yesterday's screen.
    const sinceMidnightS = nowSec() - (DAILY_EPOCH_MS / 1000 + (today - 1) * 86400);
    if (day !== today && !(day === today - 1 && sinceMidnightS < 600)) return json(400, { ok: false, error: "not today's daily" });
    const key = 'daily:' + day + ':start:' + body.userId;
    const set = await redis(['SET', key, String(nowSec()), 'NX', 'EX', String(2 * 86400)]);
    return json(200, { ok: true, day, first: set === 'OK' });
  }

  // A daily result. The first seven-house run a player sends for a day is
  // their official one, and it is only ranked if the server can check it:
  // the full race recording passes the same checks as a shared run, it is
  // today's course and stash layout, it arrived in time for its start ticket,
  // and the ranked time is the recording's own clock, not a number the phone
  // reports. The recording is kept for the prize review.
  async function dailySubmit(req) {
    let body = null;
    const raw = await req.text();
    if (typeof raw !== 'string' || raw.length > PLAYER_RUN_MAX_BYTES) return json(413, { ok: false, error: 'too large' });
    try { body = JSON.parse(raw); } catch {}
    const meta = await signedIn(body);
    if (!meta) return json(403, { ok: false, error: 'no identity' });
    const today = dailyNumber(nowSec() * 1000);
    const day = Number(body.day), houses = Number(body.houses);
    // A race started just before midnight may finish just after it.
    if (!Number.isInteger(day) || day < today - 1 || day > today) return json(400, { ok: false, error: 'not a current daily' });
    if (!Number.isInteger(houses) || houses < 0 || houses > 7) return json(400, { ok: false, error: 'bad result' });
    const board = 'daily:' + day;
    const answer = async (extra) => {
      const rank = await redis(['ZRANK', board, body.userId]);
      const total = Number(await redis(['ZCARD', board])) || 0;
      return json(200, { ok: true, day, rank: rank === null || rank === undefined ? null : Number(rank) + 1, total, ...extra });
    };
    await redis(['INCR', board + ':plays']);
    if (houses !== 7) return answer({ verified: false, reason: 'unfinished' });
    // Already has an official time: nothing a later run sends replaces it.
    if ((await redis(['ZSCORE', board, body.userId])) !== null) return answer({ verified: true, duplicate: true });

    const { record, bundle } = body;
    const refuse = async (reason) => {
      await redis(['INCR', board + ':refused']);
      console.warn('[daily] refused', day, reason);
      return answer({ verified: false, reason });
    };
    if (!record || !bundle) return refuse('no recording');
    const errors = playerRunErrors(record, bundle);
    if (errors.length) return refuse(errors[0]);
    let spec;
    try { spec = await dailySpec(day); } catch { return json(503, { ok: false, error: 'daily check unavailable' }); }
    if (record.courseSlot !== spec.slot) return refuse("not today's course");
    if (record.stashSeed !== spec.stashSeed) return refuse("not today's stash layout");
    const ms = finishMs(record);
    if (ms === null) return refuse('not all seven houses cleared');
    const started = Number(await redis(['GET', board + ':start:' + body.userId]));
    if (!started) return refuse('no start ticket');
    const since = nowSec() - started;
    if (since < ms / 1000 - DAILY_TICKET_LAG_S) return refuse('finished faster than the clock allows');
    if (since > ms / 1000 + DAILY_START_GRACE_S) return refuse('sent too long after the start');

    // Equal times go to the run that arrived first: a sub-millisecond tiebreak
    // from the time into the day (shown and paid times drop it).
    const intoDay = Math.max(0, nowSec() - (DAILY_EPOCH_MS / 1000 + (day - 1) * 86400));
    const score = Math.round(ms) + Math.min(0.999, intoDay / 1e6);
    const added = await redis(['ZADD', board, 'NX', String(score), body.userId]);
    if (Number(added) !== 1) return answer({ verified: true, duplicate: true });
    await prize.dayPrize(day, { create: true });
    await redis(['HSET', board + ':names', body.userId, meta.username]);
    // Prize races are Telegram-only: one entry per Telegram account.
    if (meta.telegramId) await redis(['HSET', board + ':telegram', body.userId, meta.telegramId]);
    for (const k of [board, board + ':names', board + ':telegram']) await redis(['EXPIRE', k, String(40 * 86400)]);
    try {
      await (await dailyRuns()).set(day + '/' + body.userId, JSON.stringify({ day, userId: body.userId, name: meta.username,
        telegram: !!meta.telegramId, ms: Math.round(ms), submittedAt: nowSec(), startedAt: started, record, bundle }));
    } catch (e) { console.warn('[daily] run not stored', e?.message || e); }
    return answer({ verified: true, ms: Math.round(ms) });
  }

  // A day's leaderboard, public: the top ten names and times (never user
  // ids), the number of ranked runs, and where the asking player stands.
  async function dailyBoard(url) {
    const today = dailyNumber(nowSec() * 1000);
    const day = Number(url.searchParams.get('day') || today);
    if (!Number.isInteger(day) || day < 1 || day > today) return json(400, { ok: false, error: 'bad day' });
    const board = 'daily:' + day;
    const flat = (await redis(['ZRANGE', board, '0', String(DAILY_BOARD_SIZE - 1), 'WITHSCORES'])) || [];
    const ids = [], times = [];
    for (let i = 0; i + 1 < flat.length; i += 2) { ids.push(String(flat[i])); times.push(Math.floor(Number(flat[i + 1]))); }
    const names = ids.length ? (await redis(['HMGET', board + ':names', ...ids])) || [] : [];
    const userId = url.searchParams.get('userId');
    const top = ids.map((id, i) => ({ rank: i + 1, name: names[i] || 'Runner', ms: times[i], ...(id === userId ? { you: true } : {}) }));
    let you = null;
    if (userId && userId.length <= USERID_MAX_LEN) {
      const rank = await redis(['ZRANK', board, userId]);
      if (rank !== null && rank !== undefined) you = { rank: Number(rank) + 1, ms: Math.floor(Number(await redis(['ZSCORE', board, userId]))) };
    }
    const total = Number(await redis(['ZCARD', board])) || 0;
    // A prize day adds the prize and the Telegram run currently in line for it.
    const dayPrize = await prize.boardPrize(day);
    return json(200, { ok: true, day, total, top, you, ...(dayPrize ? { prize: dayPrize } : {}) });
  }

  // The game asks what the prize is today and whether this player won one.
  async function prizeStatus(req) {
    let body = null;
    try { body = JSON.parse(await req.text()); } catch {}
    if (!(await signedIn(body))) return json(403, { ok: false, error: 'no identity' });
    return json(200, { ok: true, ...(await prize.playerStatus(body.userId)) });
  }
  async function prizeClaim(req) {
    let body = null;
    try { body = JSON.parse(await req.text()); } catch {}
    if (!(await signedIn(body))) return json(403, { ok: false, error: 'no identity' });
    const [status, out] = await prize.claim(body.userId, body);
    return json(status, out);
  }

  const handler = async (req) => {
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
      if (req.method === 'POST' && action === 'daily-start') return await dailyStart(req);
      if (req.method === 'GET' && action === 'daily-board') return await dailyBoard(url);
      if (req.method === 'POST' && action === 'prize-status') return await prizeStatus(req);
      if (req.method === 'POST' && action === 'prize-claim') return await prizeClaim(req);
      if (req.method === 'GET' && action === 'setup-webhook') return await setupWebhook();
    } catch (e) {
      console.error('[telegram]', action, e?.message ? String(e.message).slice(0, 120) : 'error');
      return json(500, { ok: false, error: 'server error' });
    }
    return json(404, { ok: false, error: 'unknown action' });
  };
  // For the scheduled settle (netlify/functions/daily-prize.mjs).
  handler.settle = () => prize.settleClosed();
  return handler;
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
