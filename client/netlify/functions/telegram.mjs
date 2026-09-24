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

  return async (req) => {
    let action = null;
    try { action = new URL(req.url).searchParams.get('action'); } catch {}
    try {
      if (req.method === 'GET' && action === 'ping') return await ping();
      if (req.method === 'POST' && action === 'auth') return await auth(req);
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
