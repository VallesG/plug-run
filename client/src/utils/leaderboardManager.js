// utils/leaderboardManager.js
// Live leaderboard integration with the Netlify+Upstash backend.
// Public API surface preserved — the game code and menu ticker call
// exactly the same functions as the offline stub did. localStorage
// remains the LOCAL cache (best-round display, offline fallback,
// pre-online history). Online reads live behind small in-memory caches
// so the menu ticker isn't spamming the function on every rebuild.

import { getCurrentRouteID } from './seededRandom.js';
import { getUserID, getUsername, isOnline } from './userManager.js';
import { submitRun, fetchTop, fetchRank } from './api.js';

const STORAGE_KEY_PREFIX = 'pr_leaderboard_';
const STORAGE_KEY_ALLTIME = 'pr_alltime_';
const CACHE_TTL_MS = 15_000;

// ---------------- number formatting ----------------

export function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const n = Number(value);
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (Math.abs(n) >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(Math.round(n));
}

// ---------------- localStorage cache ----------------

function readLocalDaily(routeID, role) {
  try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY_PREFIX}${routeID}_${role}`) || '[]'); }
  catch { return []; }
}
function writeLocalDaily(routeID, role, entries) {
  try { localStorage.setItem(`${STORAGE_KEY_PREFIX}${routeID}_${role}`, JSON.stringify(entries)); } catch {}
}
function readLocalAllTime(role) {
  try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY_ALLTIME}${role}`) || '[]'); }
  catch { return []; }
}
function writeLocalAllTime(role, entries) {
  try { localStorage.setItem(`${STORAGE_KEY_ALLTIME}${role}`, JSON.stringify(entries)); } catch {}
}

function upsertBest(entries, entry) {
  const idx = entries.findIndex(e => e.userId === entry.userId);
  if (idx === -1) { entries.push(entry); return entries; }
  const ex = entries[idx];
  const better = (entry.stash || 0) > (ex.stash || 0)
    || ((entry.stash || 0) === (ex.stash || 0) && (entry.round || 0) > (ex.round || 0));
  if (better) entries[idx] = entry;
  return entries;
}

// ---------------- submission ----------------

export async function submitScore(role, round, stash, rep = 0, runId = null) {
  const routeID = getCurrentRouteID();
  const userId  = getUserID();
  const username = getUsername();

  const entry = { userId, username, role, round, stash, rep, timestamp: Date.now() };
  writeLocalDaily(routeID, role, upsertBest(readLocalDaily(routeID, role), entry));

  if (isOnline()) {
    try {
      const res = await submitRun({ userId, username, role, round, stash, rep, routeID, ...(runId ? { runId } : {}) });
      invalidateCache('daily', role);
      invalidateCache('all', role);
      return { updated: true, rank: 0, total: 0, local: false, improved: res?.improved };
    } catch (err) {
      console.warn('[Leaderboard] online submit failed, kept local:', err.message);
    }
  }
  return { updated: true, rank: 0, total: 0, local: true };
}

export async function submitAllTimeScore(role, round, stash, rep = 0) {
  // Server-side submitRun updates BOTH daily and all-time atomically —
  // this function only maintains the local all-time cache for offline
  // display parity. Don't re-hit the network here or scores double-count.
  const userId  = getUserID();
  const username = getUsername();
  const entry = { userId, username, role, round, stash, rep, timestamp: Date.now() };
  writeLocalAllTime(role, upsertBest(readLocalAllTime(role), entry));
  return { updated: true, rank: 0, total: 0, local: !isOnline() };
}

// ---------------- in-memory read cache ----------------

const cache = new Map();
const cacheKey = (scope, role, sort, routeID) => `${scope}:${role}:${sort}:${routeID ?? ''}`;
function readCache(k) {
  const hit = cache.get(k);
  if (!hit) return null;
  if (Date.now() - hit.t > CACHE_TTL_MS) { cache.delete(k); return null; }
  return hit.v;
}
function writeCache(k, v) { cache.set(k, { t: Date.now(), v }); }
function invalidateCache(scope, role) {
  for (const k of cache.keys()) if (k.startsWith(`${scope}:${role}:`)) cache.delete(k);
}

// ---------------- sync local readers (menu ticker uses these) ----------------

export function getLeaderboard(routeID, role) {
  return readLocalDaily(routeID, role).slice().sort((a, b) => (b.stash - a.stash) || (b.round - a.round));
}
export function getAllTimeLeaderboard(role) {
  return readLocalAllTime(role).slice().sort((a, b) => (b.stash - a.stash) || (b.round - a.round));
}

// ---------------- per-user rank / score (online first) ----------------

export async function getUserRank(role) { return await getGlobalDailyRank(role); }

export async function getUserScore(role) {
  const routeID = getCurrentRouteID();
  const userId = getUserID();
  const local = readLocalDaily(routeID, role).find(e => e.userId === userId) || null;
  if (!isOnline()) return local;
  try {
    const online = await fetchRank({ scope: 'daily', role, sort: 'stash', routeID, userId });
    if (online?.rank == null) return local;
    return { userId, ...local, stash: online.score, rank: online.rank, total: online.total };
  } catch { return local; }
}

export async function getAllTimeRank(role) { return await getGlobalAllTimeRank(role); }

export async function getAllTimeScore(role) {
  const userId = getUserID();
  const local = readLocalAllTime(role).find(e => e.userId === userId) || null;
  if (!isOnline()) return local;
  try {
    const online = await fetchRank({ scope: 'all', role, sort: 'stash', userId });
    if (online?.rank == null) return local;
    return { userId, ...local, stash: online.score, rank: online.rank, total: online.total };
  } catch { return local; }
}

// ---------------- top-N ----------------

export async function getTopScores(role, limit = 10) {
  return (await getGlobalDailyLeaderboard(role, null, limit))?.entries || [];
}
export async function getAllTimeTopScores(role, limit = 10) {
  return (await getGlobalAllTimeLeaderboard(role, limit))?.entries || [];
}

// ---------------- online reads (used by leaderboard screen + menu) ----------------

export async function getGlobalDailyLeaderboard(role, routeID = null, limit = 100, sort = 'stash') {
  const rid = routeID ?? getCurrentRouteID();
  const k = cacheKey('daily', role, sort, rid);
  const c = readCache(k); if (c) return c;
  if (!isOnline()) return { entries: [] };
  try {
    const data = await fetchTop({ scope: 'daily', role, sort, routeID: rid, limit });
    writeCache(k, data);
    return data;
  } catch (err) {
    console.warn('[Leaderboard] daily fetch failed:', err.message);
    return { entries: [] };
  }
}

export async function getGlobalAllTimeLeaderboard(role, limit = 100, sort = 'stash') {
  const k = cacheKey('all', role, sort, null);
  const c = readCache(k); if (c) return c;
  if (!isOnline()) return { entries: [] };
  try {
    const data = await fetchTop({ scope: 'all', role, sort, limit });
    writeCache(k, data);
    return data;
  } catch (err) {
    console.warn('[Leaderboard] all-time fetch failed:', err.message);
    return { entries: [] };
  }
}

export async function getGlobalDailyRank(role, sort = 'stash') {
  if (!isOnline()) return null;
  try {
    const rid = getCurrentRouteID();
    const uid = getUserID();
    const data = await fetchRank({ scope: 'daily', role, sort, routeID: rid, userId: uid });
    return data?.rank ?? null;
  } catch { return null; }
}

export async function getGlobalAllTimeRank(role, sort = 'stash') {
  if (!isOnline()) return null;
  try {
    const uid = getUserID();
    const data = await fetchRank({ scope: 'all', role, sort, userId: uid });
    return data?.rank ?? null;
  } catch { return null; }
}

// ---------------- legacy helpers (still used elsewhere in the codebase) ----------------

export async function getTodaysLeaderboards() {
  const routeID = getCurrentRouteID();
  return { routeID, runner: readLocalDaily(routeID, 'runner'), plug: readLocalDaily(routeID, 'plug') };
}

export function getTodaysWinners() {
  const routeID = getCurrentRouteID();
  return {
    routeID,
    runner: readLocalDaily(routeID, 'runner')[0] || null,
    plug:   readLocalDaily(routeID, 'plug')[0]   || null
  };
}

export function isWinner(role) {
  const winners = getTodaysWinners();
  const uid = getUserID();
  return winners[role]?.userId === uid;
}

export function cleanupOldLeaderboards() {
  const currentRouteID = getCurrentRouteID();
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_KEY_PREFIX)) continue;
      const parts = key.slice(STORAGE_KEY_PREFIX.length).split('_');
      const rid = parseInt(parts[0], 10);
      if (!isNaN(rid) && rid < currentRouteID - 7) toRemove.push(key);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) { console.warn('[Leaderboard] cleanup failed:', e); }
}

export function exportLeaderboardData(routeID) {
  const rid = routeID ?? getCurrentRouteID();
  return { routeID: rid, runner: readLocalDaily(rid, 'runner'), plug: readLocalDaily(rid, 'plug') };
}

export function importLeaderboardData(data) {
  if (!data || !Number.isInteger(data.routeID)) return false;
  if (Array.isArray(data.runner)) writeLocalDaily(data.routeID, 'runner', data.runner);
  if (Array.isArray(data.plug))   writeLocalDaily(data.routeID, 'plug',   data.plug);
  return true;
}

export default {
  formatNumber, submitScore, submitAllTimeScore,
  getLeaderboard, getAllTimeLeaderboard,
  getUserRank, getUserScore, getAllTimeRank, getAllTimeScore,
  getTopScores, getAllTimeTopScores,
  getGlobalDailyLeaderboard, getGlobalAllTimeLeaderboard,
  getGlobalDailyRank, getGlobalAllTimeRank,
  getTodaysLeaderboards, getTodaysWinners, isWinner,
  cleanupOldLeaderboards, exportLeaderboardData, importLeaderboardData
};