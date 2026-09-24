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

/** A race's finish time, or null when it did not clear all seven houses. */
export function finishMs(record) {
  const t = record?.clearTimes;
  return Array.isArray(t) && t.length === 7 && Number.isFinite(t[6]) ? t[6] : null;
}

// The day's rival should be a real test: one of Jev's cleanest, fastest runs
// on the course, never one where he got stuck (the bank holds a few 400 s+
// races with dozens of retries).
export const DAILY_MAX_RETRIES = 1;
export const DAILY_FASTEST_SHARE = 0.25;

/**
 * Today's rival on that course: a Jev race when the course has one (Jev is
 * the name players know), with its own stash layout, drawn from the fastest
 * quarter of his clean runs. entries are { record } with recordingID,
 * stashSeed, clearTimes, retries and (for Jev) driverConfig.
 */
export function dailyRival(n, entries, isJev = () => false) {
  const usable = (entries || []).filter((e) => e?.record && typeof e.record.recordingID === 'string'
    && Number.isInteger(e.record.stashSeed) && finishMs(e.record) !== null);
  const jevTest = typeof isJev === 'function' ? isJev : () => false;
  const jev = usable.filter((e) => jevTest(e.record));
  let pool = jev.length ? jev : usable;
  const clean = pool.filter((e) => !(e.record.retries > DAILY_MAX_RETRIES));
  if (clean.length) pool = clean;
  pool = pool.slice().sort((a, b) => finishMs(a.record) - finishMs(b.record)
    || (a.record.recordingID < b.record.recordingID ? -1 : 1));
  if (!pool.length) return null;
  const top = pool.slice(0, Math.max(Math.min(3, pool.length), Math.ceil(pool.length * DAILY_FASTEST_SHARE)));
  return top[dailyHash('plugrun-daily-rival/' + n) % top.length];
}

/** "THU · SEP 24" for Daily #n (UTC). */
export function dailyDateLabel(n) {
  const d = new Date(DAILY_EPOCH_MS + (n - 1) * DAY_MS);
  const day = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getUTCDay()];
  const mon = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getUTCMonth()];
  return day + ' · ' + mon + ' ' + d.getUTCDate();
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
 * The official run is claimed at its GO, before it is raced: the day's first
 * race to start is the official one, finished or not (the server holds the
 * same single start ticket). Returns { state, official }.
 */
export function claimDaily(state, n) {
  const prev = state && typeof state === 'object' ? state : EMPTY_DAILY;
  if (prev.days?.[n]) return { state: prev, official: false };
  return { state: { ...prev, days: { ...(prev.days || {}), [n]: { started: true } } }, official: true };
}

/** A day claimed by a run that never finished (quit, closed, crashed). */
export function dailyUnfinished(day) {
  return !!day && day.started === true && day.houses === undefined;
}

/**
 * Record a finished Daily Race. Only the first result of a day is official:
 * the run that claimed the day fills its claim in (claimed), and a day nobody
 * claimed takes its first finish. A seven-house finish extends the streak.
 * Returns { state, official }.
 */
export function recordDaily(state, n, { ms, houses, retries = 0, result = null, claimed = false } = {}) {
  const prev = state && typeof state === 'object' ? state : EMPTY_DAILY;
  const had = prev.days?.[n];
  if (had && !(claimed && dailyUnfinished(had))) return { state: prev, official: false };
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

export const DAILY_BOARD_SIZE = 10;

/**
 * The leaderboard's rows from the server's answer ({ top, you, total }):
 * the top ten, then your own row under them when you are further down.
 * Each row is { rank, name, time, you }.
 */
export function dailyBoardRows(board) {
  const row = (e, you) => ({ rank: e.rank, name: String(e.name || 'Runner').toUpperCase().slice(0, 16), time: raceTimeLabel(e.ms), you });
  const top = (Array.isArray(board?.top) ? board.top : [])
    .filter((e) => Number.isInteger(e?.rank) && Number.isFinite(e?.ms)).slice(0, DAILY_BOARD_SIZE);
  const rows = top.map((e) => row(e, e.you === true));
  const you = board?.you;
  if (you && Number.isInteger(you.rank) && Number.isFinite(you.ms) && !rows.some((r) => r.you))
    rows.push({ ...row({ ...you, name: 'You' }, true), below: true });
  return rows;
}

/** The menu row's small line: today's result or that it's waiting, plus the streak. */
export function dailyNote(state, n) {
  const today = dailyResult(state, n);
  const streak = liveStreak(state, n);
  const fire = streak > 0 ? '  ·  🔥 ' + streak : '';
  if (!today) return 'NEW RACE TODAY' + fire;
  if (dailyUnfinished(today)) return 'DID NOT FINISH' + fire;
  const rank = today.rank ? '  ·  #' + today.rank : today.unranked ? '  ·  NOT RANKED' : '';
  return (today.houses === 7 ? '✓ ' + raceTimeLabel(today.ms) : today.houses + '/7') + rank + fire;
}
