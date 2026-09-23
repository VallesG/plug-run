// Real players' Block Rivals races, banked as opponents like Jev.
//
// One module, three users: the submission function
// (netlify/functions/rivals-run.mjs), the bank tool
// (tools/rivals-assemble-players.mjs) and the tests. Pure: no Phaser, no
// network, no storage; the function injects its store, identity lookup and
// hashing.
//
// A player's race is recorded in exactly the format Jev's is
// (controllers/RivalReplayCapture.js): a record of attempts and clears, and a
// replay bundle of 15Hz samples and events per attempt. Nothing here changes
// that format.
//
// WHAT A SUBMITTED RACE MUST PROVE
//   - The record and bundle pass the same validators every bank uses
//     (rivalRecords.js, rivalReplay.js), for a pool course, under match
//     stash rules, all seven houses cleared.
//   - Every house is the course's house (seed, board size and both bag
//     pockets rebuilt here from the seed), every attempt used the match's one
//     stash seed, and every pickup took the genuine bag.
//   - The runner moved like the game allows: walking pace, a dash-sized burst
//     only when a dash was used, never standing inside a wall without
//     phasing, powers used at most once per slot, no long holes in the
//     samples, a finishing runner at the car, and an overall pace no faster
//     than the runner's fixed speed (which also catches a sped-up clock).
// It cannot prove a human played it. A run faked consistently frame by frame
// would still pass, which is why runs are banked by a reviewed tool and never
// published by the submission itself.
//
// PRIVATE DATA. The banked record carries the player's server-side display
// name and an opaque key derived from their account on the server, never the
// account id, token or anything else from the request.
import {
  validateRivalRunRecord, validateRivalReplayBundle, rivalRecordMatchesCourse,
  buildRivalRunRecord, buildRivalReplayBundle
} from './rivalRecords.js';
import { validateReplaySegment, FRAME, FLAG, replayStateAt } from './rivalReplay.js';
import { RIVAL_RULES_VERSION, RIVAL_HOUSES, rivalPoolCourse, rivalSessionPocket, rivalHouseMazeOptions } from './rivals.js';
import { generateSquareMaze } from '../utils/mazeGenerator.js';
import { createSeededRNG } from '../utils/seededRandom.js';

export const PLAYER_BANK_ID = 'players-v1';
export const PLAYER_BANK_ROOT = 'public/rivals/players-v1';
// Nobody meets a player's run until the bank holds this many.
export const PLAYER_BANK_ROTATION_MIN = 500;
export const PLAYER_RUNS_KEEP = 3;             // per player, per course; newest kept
export const PLAYER_RUNS_PER_DAY = 20;         // per player
export const PLAYER_RUN_MAX_BYTES = 2 * 1024 * 1024;
export const PLAYER_RUN_SOURCE = 'rivals-run/1';

// The runner's fixed speed in cells per second (the same on every board: race
// distances scale with the cell, logic/rivals.js rivalPixels). Measured from
// every banked Jev race: the median moving sample is 6.06 on all of them.
export const RUNNER_CELLS_PER_S = 6.06;
const WALK_CAP = RUNNER_CELLS_PER_S * 1.25;   // one sample's movement, generous
const SAMPLE_S = 1 / 15;
const SLACK_CELLS = 0.7;                      // sampling jitter and knockback; banked max 1.17 in 74ms
const DASH_CELLS = 4.6;                       // largest banked dash burst is 4.02
const DASH_WINDOW = [-150, 600];              // ms around the dash event
const PACE_MAX = 7.3;                         // an attempt's median sample pace; banked 5.9-7.0
const MAX_GAP_MS = 2000;                      // longest banked sample gap is 1278
const EXTRACT_REACH = 5;                      // cells from the car; banked max 4.09

const grids = new Map();
function houseGrid(seg, layout) {
  const key = seg.houseSeed + '/' + seg.cols + 'x' + seg.rows;
  if (!grids.has(key)) {
    if (grids.size > 64) grids.clear();
    grids.set(key, generateSquareMaze(seg.cols, seg.rows, {
      rng: createSeededRNG(seg.houseSeed), role: 'runner', clusterScale: seg.scale, layout
    }));
  }
  return grids.get(key);
}
const near = (a, b, d = 0.01) => a && b && Math.abs(a.x - b.x) <= d && Math.abs(a.y - b.y) <= d;

/** Does this attempt's movement stay inside what the game allows? */
export function attemptMotionErrors(seg, orderedPowers) {
  const errors = [];
  const frames = seg.frames || [];
  // Powers: each slot fires at most once per attempt, as the game allows.
  const uses = [0, 0];
  for (const e of seg.events || []) if (e.k === 'power' && (e.slot === 0 || e.slot === 1)) uses[e.slot]++;
  if (uses.some(n => n > 1)) errors.push('a power slot used twice');
  const dashes = (seg.events || []).filter(e => e.k === 'power' && e.power === 'dash').map(e => ({ t: e.t, left: DASH_CELLS }));
  if (dashes.length && !(orderedPowers || []).includes('dash')) errors.push('dash without a dash power');
  const moving = [];
  for (let i = 1; i < frames.length && errors.length < 4; i++) {
    const a = frames[i - 1], b = frames[i];
    const dtMs = b[FRAME.T] - a[FRAME.T];
    if (dtMs > MAX_GAP_MS) { errors.push('a ' + Math.round(dtMs) + 'ms hole in the samples'); break; }
    if ((a[FRAME.RF] | b[FRAME.RF]) & FLAG.HIDDEN) continue;
    const d = Math.hypot(b[FRAME.RX] - a[FRAME.RX], b[FRAME.RY] - a[FRAME.RY]);
    const dt = dtMs / 1000;
    if (dt >= 0.05 && d >= 0.1) moving.push(d / dt);
    let excess = d - (WALK_CAP * Math.max(dt, SAMPLE_S) + SLACK_CELLS);
    if (excess > 0) {
      for (const dash of dashes) {
        if (b[FRAME.T] < dash.t + DASH_WINDOW[0] || a[FRAME.T] > dash.t + DASH_WINDOW[1]) continue;
        const use = Math.min(dash.left, excess);
        dash.left -= use; excess -= use;
        if (excess <= 0) break;
      }
      if (excess > 0) errors.push('runner moved ' + d.toFixed(2) + ' cells in ' + Math.round(dtMs) + 'ms at t=' + b[FRAME.T]);
    }
  }
  if (moving.length >= 20) {
    const sorted = moving.slice().sort((x, y) => x - y);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median > PACE_MAX) errors.push('pace ' + median.toFixed(2) + ' cells/s is faster than the runner');
  }
  return errors;
}

/** Every reason this submitted race cannot be banked; empty when it can. */
export function playerRunErrors(record, bundle) {
  const v = validateRivalRunRecord(record);
  if (!v.ok) return ['record: ' + v.errors[0]];
  if (record.opponent?.kind !== 'human') return ['not a player race'];
  if (record.stashRules !== 'match-v1' || !Number.isInteger(record.stashSeed)) return ['no match stash seed'];
  if (record.clearTimes.length !== RIVAL_HOUSES) return ['not all seven houses cleared'];
  const course = rivalPoolCourse(record.courseSlot);
  if (!course || !rivalRecordMatchesCourse(record, course, RIVAL_RULES_VERSION)) return ['not a pool course, or old rules'];
  const b = validateRivalReplayBundle(bundle, record, { validateSegment: validateReplaySegment });
  if (!b.ok) return ['bundle: ' + b.errors[0]];
  const errors = [];
  bundle.segments.forEach((s, i) => {
    const seg = s.replay, at = 'house ' + s.house + ' attempt ' + s.attempt + ': ';
    const opts = rivalHouseMazeOptions(course, s.house - 1);
    // The course's own house, rebuilt from its seed.
    if (seg.houseSeed !== course.seeds[s.house - 1] || seg.cols !== opts.cols || seg.rows !== opts.rows) { errors.push(at + 'not the course house'); return; }
    const arena = houseGrid(seg, opts.layout);
    const pocket = (c) => ({ x: c.x + 0.5, y: c.y + 0.5 });
    if (!near(seg.stashes[0], pocket(arena.objectives.stash)) || !near(seg.stashes[1], pocket(arena.objectives.extract))) { errors.push(at + 'bag pockets are not the house\'s'); return; }
    // One stash seed for the whole race; every pickup is the genuine bag.
    const genuine = rivalSessionPocket(seg.houseSeed, record.stashSeed);
    for (const e of seg.events) {
      if (e.k === 'pickup' && e.i !== genuine) errors.push(at + 'picked up the bunk bag');
      if (e.k === 'bunk' && e.i !== 1 - genuine) errors.push(at + 'the genuine bag was a bunk');
    }
    // Never inside a wall unless phasing.
    for (const f of seg.frames) {
      if (f[FRAME.RF] & (FLAG.PHASE | FLAG.HIDDEN)) continue;
      if (arena.grid[Math.floor(f[FRAME.RY])]?.[Math.floor(f[FRAME.RX])] === 1) { errors.push(at + 'inside a wall without phasing at t=' + f[FRAME.T]); break; }
    }
    // A cleared house ends at the car.
    if (s.outcome === 'extracted') {
      const ex = seg.events.find(e => e.k === 'extract');
      const r = ex && replayStateAt(seg, ex.t)?.runner;
      if (!ex || !r || Math.hypot(r.x - seg.car.x, r.y - seg.car.y) > EXTRACT_REACH) errors.push(at + 'cleared away from the car');
    }
    for (const m of attemptMotionErrors(seg, record.attempts[i].orderedPowers ?? record.orderedPowers)) errors.push(at + m);
  });
  return errors;
}

/**
 * The record as banked: rebuilt from the submitted attempts under the
 * player's public identity, with a bank recording ID and the server's time.
 * The replay samples and events are kept exactly as submitted.
 */
export function bankPlayerRun(record, bundle, { playerKey, displayName, recordedAt }) {
  const course = rivalPoolCourse(record.courseSlot);
  const recordingID = 'player-' + course.slug + '-' + String(record.payloadHash).slice(0, 12);
  const banked = buildRivalRunRecord({
    rulesVersion: RIVAL_RULES_VERSION, course,
    opponent: { kind: 'human', id: playerKey, displayName },
    orderedPowers: record.orderedPowers, attempts: record.attempts, recordingID, recordedAt,
    driverConfig: { driver: 'player', source: PLAYER_RUN_SOURCE }, stashSeed: record.stashSeed
  });
  return { record: banked, bundle: buildRivalReplayBundle(banked, bundle.segments.map(s => s.replay)) };
}

/** Newest PLAYER_RUNS_KEEP per player per course; returns [kept, dropped]. */
export function keepNewestPlayerRuns(entries, keep = PLAYER_RUNS_KEEP) {
  const groups = new Map();
  for (const e of entries) {
    const k = e.record.opponent.id + '|' + e.record.courseSlot;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  const kept = [], dropped = [];
  for (const list of groups.values()) {
    list.sort((a, b) => (a.record.recordedAt < b.record.recordedAt ? 1 : -1));
    kept.push(...list.slice(0, keep)); dropped.push(...list.slice(keep));
  }
  return [kept, dropped];
}

const nonEmpty = s => typeof s === 'string' && s.length > 0;
/**
 * The submission, with its storage and identity injected:
 *   deps.userMeta(userId)    -> { username, token } | null   (the leaderboard identity)
 *   deps.countToday(userId)  -> number after counting this submission
 *   deps.store               -> { get(key), set(key, value), list(prefix) -> keys, delete(key) }
 *   deps.playerKey(userId)   -> opaque stable key, never the account id
 *   deps.now()               -> ms
 * Returns { status, body }. Stores pending runs only; publishing is the
 * bank tool's job, after review.
 */
export async function submitPlayerRun(raw, deps) {
  const bad = (status, error) => ({ status, body: { ok: false, error } });
  if (typeof raw !== 'string' || raw.length > PLAYER_RUN_MAX_BYTES) return bad(413, 'too large');
  let body;
  try { body = JSON.parse(raw); } catch { return bad(400, 'not JSON'); }
  const { userId, token, consent, record, bundle } = body || {};
  if (consent !== true) return bad(400, 'no consent');
  if (!nonEmpty(userId) || userId.length > 64 || !nonEmpty(token)) return bad(401, 'no identity');
  const meta = await deps.userMeta(userId);
  if (!meta || meta.token !== token || !nonEmpty(meta.username)) return bad(403, 'identity not recognised');
  const errors = playerRunErrors(record, bundle);
  if (errors.length) return bad(422, errors[0]);
  if (await deps.store.get('seen/' + record.payloadHash)) return { status: 200, body: { ok: true, duplicate: true } };
  if ((await deps.countToday(userId)) > PLAYER_RUNS_PER_DAY) return bad(429, 'daily limit');
  const playerKey = await deps.playerKey(userId);
  const at = deps.now();
  const banked = bankPlayerRun(record, bundle, { playerKey, displayName: meta.username.slice(0, 24), recordedAt: new Date(at).toISOString() });
  const prefix = 'pending/' + record.courseSlot + '/' + playerKey + '/';
  await deps.store.set(prefix + String(at).padStart(15, '0') + '-' + banked.record.recordingID, JSON.stringify(banked));
  await deps.store.set('seen/' + record.payloadHash, JSON.stringify({ at, recordingID: banked.record.recordingID }));
  // Storage stays bounded: only the newest few per player per course wait.
  const keys = (await deps.store.list(prefix)).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - PLAYER_RUNS_KEEP))) await deps.store.delete(k);
  return { status: 200, body: { ok: true, recordingID: banked.record.recordingID } };
}
