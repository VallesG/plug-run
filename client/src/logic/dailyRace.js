// The Daily Race, as data. Pure: no Phaser, storage, clock or network.
//
// One Block Rivals race a day, the same for everyone: the same course, stash
// layout and recorded rival, picked from the UTC date. Your first seven-house
// finish of the day is your official time; a streak counts consecutive days
// with one. Missing a day only resets the streak. Nothing is bought or lost.

export const DAILY_EPOCH_MS = Date.UTC(2026, 8, 24); // Daily #1: September 24, 2026 (UTC)
const DAY_MS = 86400000;

/** Daily number for a moment (UTC days since the epoch, starting at 1). */
export function dailyNumber(nowMs) {
  return Math.max(1, Math.floor((nowMs - DAILY_EPOCH_MS) / DAY_MS) + 1);
}

/** FNV-1a, so every device picks the same thing from the same inputs. */
export function dailyHash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** Today's course: one of the enabled course slots. */
export function dailySlot(n, slots) {
  const list = [...new Set(slots)].filter(Number.isInteger).sort((a, b) => a - b);
  if (!list.length) return null;
  return list[dailyHash('plugrun-daily-course/' + n) % list.length];
}

/**
 * Today's rival on that course: a Jev race when the course has one (Jev is
 * the name players know), with its own stash layout. entries are
 * { record } with recordingID, stashSeed and (for Jev) driverConfig.
 */
export function dailyRival(n, entries, isJev = () => false) {
  const usable = (entries || []).filter((e) => e?.record && typeof e.record.recordingID === 'string' && Number.isInteger(e.record.stashSeed));
  const jevTest = typeof isJev === 'function' ? isJev : () => false;
  const jev = usable.filter((e) => jevTest(e.record));
  const pool = (jev.length ? jev : usable).slice().sort((a, b) => (a.record.recordingID < b.record.recordingID ? -1 : 1));
  if (!pool.length) return null;
  return pool[dailyHash('plugrun-daily-rival/' + n) % pool.length];
}

export const EMPTY_DAILY = Object.freeze({ days: {}, streak: 0, best: 0, last: 0 });

/** The day's official result, if any. */
export function dailyResult(state, n) {
  return state?.days?.[n] || null;
}

/** The streak as it stands today: yesterday or today keeps it alive. */
export function liveStreak(state, n) {
  const last = state?.last || 0;
  return last === n || last === n - 1 ? state.streak || 0 : 0;
}

/**
 * Record a finished Daily Race. Only the first result of a day is official;
 * a seven-house finish extends the streak. Returns { state, official }.
 */
export function recordDaily(state, n, { ms, houses, retries = 0, result = null } = {}) {
  const prev = state && typeof state === 'object' ? state : EMPTY_DAILY;
  if (prev.days?.[n]) return { state: prev, official: false };
  const days = { ...(prev.days || {}), [n]: { ms: Math.round(ms), houses, retries, result } };
  // Keep a month of history; older days never matter to the streak.
  for (const k of Object.keys(days)) if (Number(k) < n - 31) delete days[k];
  let { streak = 0, best = 0, last = 0 } = prev;
  if (houses === 7) {
    streak = last === n - 1 ? streak + 1 : last === n ? streak : 1;
    last = n;
    best = Math.max(best, streak);
  }
  return { state: { days, streak, best, last }, official: true };
}

export function raceTimeLabel(ms) {
  const t = Math.max(0, Math.round(ms / 100));
  return Math.floor(t / 600) + ':' + String(Math.floor((t % 600) / 10)).padStart(2, '0') + '.' + (t % 10);
}

/** The menu row's small line: today's result or that it's waiting, plus the streak. */
export function dailyNote(state, n) {
  const today = dailyResult(state, n);
  const streak = liveStreak(state, n);
  const fire = streak > 0 ? '  ·  🔥 ' + streak : '';
  if (!today) return 'NEW RACE TODAY' + fire;
  const rank = today.rank ? '  ·  #' + today.rank : '';
  return (today.houses === 7 ? '✓ ' + raceTimeLabel(today.ms) : today.houses + '/7') + rank + fire;
}
