// Progress backup to Telegram CloudStorage (Telegram only; src/platform).
//
// The game keeps progress in localStorage, which a Telegram WebView can lose
// and which never follows a player to their other devices. CloudStorage does
// both (1024 keys per user, each value up to 4096 characters). This copies the
// progress keys up, and at launch fills in any key the device is missing.
//
// Restore never overwrites what the device already has: a device's own newer
// progress always wins, and the cloud only fills gaps (a new phone, a cleared
// WebView). Bulky or disposable data (Rivals replay history, leaderboard
// caches) and identity secrets (tokens, recovery codes) are never copied.

const PROGRESS_PREFIXES = [
  'pr_journey_v1_', 'pr_city_v1_', 'pr_window_v1_', 'pr_crew_saves_v1_', 'pr_contacts_v1_',
  'pr_blockrun_v1_', 'pr_rival_city_v1_', 'pr_skill_v1_', 'pr_rival_skill_v1_', 'pr_tutorial_v1_', 'pr_route_', 'pr_daily_v1_'
];
const PROGRESS_KEYS = new Set(['prla_inv_v1', 'pr_music_mute', 'pr_sfx_mute', 'pr_sfx_volume', 'pr_corridor_assist', 'pr_user', 'pr_analytics_cid', 'pr_quickstart_v1', 'pr_milestones_v1']);
const CLOUD_PREFIX = 'b_';
const CHUNK = 4000;          // CloudStorage values are at most 4096 characters
const MAX_CHUNKS = 16;       // 64 KB per key is far more than any progress key needs
const MAX_KEY = 100;         // leaves room for the prefix and chunk suffix within 128

export function isBackedUp(key) {
  if (typeof key !== 'string' || key.length > MAX_KEY || !/^[A-Za-z0-9_-]+$/.test(key)) return false;
  return PROGRESS_KEYS.has(key) || PROGRESS_PREFIXES.some((p) => key.startsWith(p));
}

/** A local key/value as CloudStorage entries: { cloudKey: value }. Null if too big. */
export function encodeEntry(key, value) {
  const base = CLOUD_PREFIX + key;
  if (value.length <= CHUNK) return { [base]: '0' + value };
  const n = Math.ceil(value.length / CHUNK);
  if (n > MAX_CHUNKS) return null;
  const out = { [base]: 'c' + n };
  for (let i = 0; i < n; i++) out[base + '__' + i] = value.slice(i * CHUNK, (i + 1) * CHUNK);
  return out;
}

/** CloudStorage entries back to { localKey: value }. Incomplete chunked values are dropped. */
export function decodeEntries(cloud) {
  const out = {};
  for (const [ck, v] of Object.entries(cloud)) {
    if (!ck.startsWith(CLOUD_PREFIX) || ck.includes('__') || typeof v !== 'string') continue;
    const key = ck.slice(CLOUD_PREFIX.length);
    if (!isBackedUp(key)) continue;
    if (v[0] === '0') { out[key] = v.slice(1); continue; }
    const n = Number(v.slice(1));
    if (v[0] !== 'c' || !Number.isInteger(n) || n < 1 || n > MAX_CHUNKS) continue;
    const parts = [];
    for (let i = 0; i < n; i++) parts.push(cloud[ck + '__' + i]);
    if (parts.every((p) => typeof p === 'string')) out[key] = parts.join('');
  }
  return out;
}

/**
 * What to write locally from the cloud: only keys the device does not have.
 * pr_user is special: identity comes from sign-in, so only its stats (STASH,
 * rounds) are taken, and only when this device has none of its own.
 */
export function restorePlan(cloudValues, getLocal) {
  const writes = {};
  for (const [key, value] of Object.entries(cloudValues)) {
    const local = getLocal(key);
    if (key === 'pr_user') {
      let cloudUser = null, localUser = null;
      try { cloudUser = JSON.parse(value); localUser = local ? JSON.parse(local) : null; } catch { continue; }
      const empty = (s) => !s || (!(s.totalStash > 0) && !(s.gamesPlayed > 0) && !(s.totalRounds > 0));
      if (localUser && cloudUser?.stats && empty(localUser.stats) && !empty(cloudUser.stats)) {
        writes[key] = JSON.stringify({ ...localUser, stats: cloudUser.stats });
      }
      continue;
    }
    if (local === null || local === undefined) writes[key] = value;
  }
  return writes;
}

// --- CloudStorage, promisified (callbacks with an error first) -----------------
const wrap = (fn, timeoutMs = 4000) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('CloudStorage timeout')), timeoutMs);
  try { fn((err, res) => { clearTimeout(t); err ? reject(err) : resolve(res); }); } catch (e) { clearTimeout(t); reject(e); }
});

export function createCloudBackup(cloud, storage = globalThis.localStorage, { intervalMs = 15000 } = {}) {
  const uploaded = new Map(); // localKey -> value last known to be in the cloud
  let timer = null, busy = false;

  const localKeys = () => {
    const keys = [];
    for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (isBackedUp(k)) keys.push(k); }
    return keys;
  };

  async function restore() {
    const keys = (await wrap((cb) => cloud.getKeys(cb))).filter((k) => k.startsWith(CLOUD_PREFIX));
    const cloudEntries = {};
    for (let i = 0; i < keys.length; i += 50) {
      Object.assign(cloudEntries, await wrap((cb) => cloud.getItems(keys.slice(i, i + 50), cb)));
    }
    const values = decodeEntries(cloudEntries);
    for (const [k, v] of Object.entries(values)) uploaded.set(k, v);
    const writes = restorePlan(values, (k) => storage.getItem(k));
    for (const [k, v] of Object.entries(writes)) { try { storage.setItem(k, v); } catch {} }
    return Object.keys(writes);
  }

  async function flush() {
    if (busy) return 0;
    busy = true;
    let sent = 0;
    try {
      for (const key of localKeys()) {
        const value = storage.getItem(key);
        if (value === null || uploaded.get(key) === value) continue;
        const entries = encodeEntry(key, value);
        if (!entries) continue;
        for (const [ck, cv] of Object.entries(entries)) await wrap((cb) => cloud.setItem(ck, cv, cb));
        uploaded.set(key, value);
        sent++;
      }
    } catch (e) {
      console.warn('[CloudBackup] upload paused:', e?.message || e);
    } finally { busy = false; }
    return sent;
  }

  function start() {
    if (timer) return;
    timer = setInterval(flush, intervalMs);
    const soon = () => { flush(); };
    try { globalThis.addEventListener?.('pagehide', soon); } catch {}
    try { globalThis.document?.addEventListener?.('visibilitychange', () => { if (globalThis.document.visibilityState === 'hidden') soon(); }); } catch {}
  }

  return { restore, flush, start, uploaded };
}
