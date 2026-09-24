// utils/api.js
// Thin wrapper around the Netlify leaderboard function. Keeps all fetch
// plumbing in one place; leaderboardManager just calls these.

const ENDPOINT = '/.netlify/functions/leaderboard';
const TOKEN_KEY = 'pr_lb_token'; // localStorage anti-cheat token per userId

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || null; } catch { return null; }
}

function setToken(t) {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); } catch {}
}

async function tryFetch(url, opts, timeoutMs = 5000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${text}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Submit a run to the leaderboard. Returns { ok, improved, token } or throws.
 * @param {object} payload - { userId, username, role, round, stash, rep, routeID, inputLog? }
 */
export async function submitRun(payload) {
  const body = { ...payload, token: getToken() };
  const data = await tryFetch(`${ENDPOINT}?action=submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    // Survive page unload: if the player closes the tab or hits browser-back
    // right after a round ends, the browser completes this request anyway
    // instead of killing it mid-flight. (Ignored by browsers that don't
    // support it — harmless.)
    keepalive: true
  });
  if (data?.token) setToken(data.token);
  return data;
}

/**
 * Fetch top N. sort = 'stash' | 'rep', scope = 'daily' | 'all'.
 * For daily, pass routeID.
 */
export async function fetchTop({ scope, role, sort = 'stash', routeID = null, limit = 50 }) {
  const qs = new URLSearchParams({ action: 'top', scope, role, sort, limit: String(limit) });
  if (routeID != null) qs.set('routeID', String(routeID));
  return await tryFetch(`${ENDPOINT}?${qs.toString()}`, { method: 'GET' });
}

/**
 * Fetch a specific user's rank on a board. Returns { rank, score, total }.
 * rank is 1-indexed, null if user not on the board.
 */
export async function fetchRank({ scope, role, sort = 'stash', routeID = null, userId }) {
  const qs = new URLSearchParams({ action: 'rank', scope, role, sort, userId });
  if (routeID != null) qs.set('routeID', String(routeID));
  return await tryFetch(`${ENDPOINT}?${qs.toString()}`, { method: 'GET' });
}

export function hasToken() { return !!getToken(); }

/**
 * Provision an identity: get a server-issued CamelCase name + recovery code.
 * seedUserId lets an existing local guest carry their userId forward.
 */
export async function provisionIdentity({ seedUserId = null } = {}) {
  const data = await tryFetch(`${ENDPOINT}?action=provision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(seedUserId ? { seedUserId } : {})
  });
  // Store the token immediately so the FIRST submit passes the auth
  // check. Provisioning creates the userMeta on the server, which puts
  // subsequent submits on the "meta exists → require token" branch.
  if (data?.token) setToken(data.token);
  return data;
}

/**
 * Restore an identity by recovery code on a new device.
 * @returns { userId, username, token } or throws.
 */
export async function restoreIdentity(recoveryCode) {
  const data = await tryFetch(`${ENDPOINT}?action=restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recoveryCode })
  });
  if (data?.token) setToken(data.token);
  return data;
}

/**
 * Sign in with Telegram: the server checks Telegram's signed initData and
 * answers with the Plug Run identity linked to that Telegram account. This
 * device's own identity (userId + stored token) is offered so a player who
 * already has one keeps it. Resolves { userId, username, token, recoveryCode, isNew }.
 */
export async function telegramSignIn({ initData, userId = null }, timeoutMs = 5000) {
  const data = await tryFetch('/.netlify/functions/telegram?action=auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, userId, token: getToken() })
  }, timeoutMs);
  if (data?.token) setToken(data.token);
  return data;
}

// --- Challenges (netlify/functions/telegram.mjs) ------------------------------
const TG = '/.netlify/functions/telegram';
/** Create a challenge from a finished race. Resolves { id, link, text, preparedId } or throws. */
export async function createChallenge({ userId, challenge, initData = null }) {
  return await tryFetch(TG + '?action=challenge', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, token: getToken(), challenge, initData })
  }, 8000);
}
/** The race a challenge link points at: { slot, stashSeed, recordingID, pool, ms, name, ... }. */
export async function getChallenge(id) {
  return await tryFetch(TG + '?action=challenge&id=' + encodeURIComponent(id), { method: 'GET' }, 6000);
}
/** Report how a challenge race went. Resolves { beat, creatorMs, name } or throws. */
export async function reportChallengeResult({ id, userId, ms, houses }) {
  return await tryFetch(TG + '?action=challenge-result', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, userId, token: getToken(), ms, houses })
  }, 6000);
}
/** Submit today's official Daily Race. Resolves { rank, total } (rank null if not seven houses). */
export async function submitDaily({ userId, day, houses, retries, record = null, bundle = null }) {
  // The whole race recording rides along: the server ranks only what it can
  // check, and takes the time from the recording's own clock.
  return await tryFetch(TG + '?action=daily-submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, token: getToken(), day, houses, retries, record, bundle })
  }, 25000);
}
/** Take today's start ticket when the official run starts (once per day, server-side). */
export async function startDaily({ userId, day }) {
  return await tryFetch(TG + '?action=daily-start', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, token: getToken(), day })
  }, 6000);
}
/**
 * Share a finished Block Rivals race (the player opted in for this race).
 * Sends the race's own record and replay with this device's identity; the
 * server checks it, names it by the player's display name, and holds it for
 * review. Resolves { ok, error? }; never throws.
 */
export async function submitRivalRun({ userIds, localId = null, record, bundle }) {
  const ids = [...new Set(userIds || [])].filter(Boolean);
  const send = async () => {
    const token = getToken();
    if (!ids.length || !token) return { ok: false, error: 'no identity' };
    try {
      return await tryFetch('/.netlify/functions/rivals-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: ids[0], userIds: ids.slice(0, 2), token, consent: true, record, bundle }),
        keepalive: false
      }, 15000);
    } catch (e) {
      return { ok: false, error: String(e?.message || e).slice(0, 120) };
    }
  };
  const first = await send();
  // No token on this browser, or one the server does not know: fetch this
  // browser's leaderboard identity (the same idempotent setup the menu uses,
  // which returns the existing token for this id) and try once more.
  if (first.ok || !localId || !/no identity|HTTP 40[13]/.test(String(first.error || ''))) return first;
  try {
    const identity = await provisionIdentity({ seedUserId: localId });
    if (identity?.userId) ids.unshift(identity.userId);
  } catch (e) {
    return { ok: false, error: 'no identity (' + String(e?.message || e).slice(0, 60) + ')' };
  }
  ids.splice(0, ids.length, ...[...new Set(ids)]);
  return send();
}
