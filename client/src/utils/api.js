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
    body: JSON.stringify(body)
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