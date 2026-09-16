// Portable Rival replay segments. Pure: no Phaser, no imports.
//
// WHY NOT ReplaySystem'S FORMAT
// ReplaySystem snapshots the display list: Maps keyed by runtime object ids,
// baked textures that live in one scene's texture manager, pixel coordinates
// of one viewport. It plays back the last house on the machine that recorded
// it and nothing else. A rival's race has to cross machines, screen sizes and
// weeks of time, so this format records SEMANTIC state in GRID units:
// where the runner is in cells, which way it faces, whether it is phasing or
// carrying; where the defender is; bullets; the decoy; and discrete events.
// The static house is regenerated from the house seed at playback (proved
// deterministic in rivalCourses.test.mjs), so none of it ships.
//
// Frames are arrays, not objects, because a two-minute race at 15Hz is ~1800
// frames and key names would be most of the file. Column meaning lives in the
// FRAME constants below and nowhere else.
export const RIVAL_REPLAY_SCHEMA = 1;
export const RIVAL_REPLAY_HZ = 15;
export const RIVAL_REPLAY_STEP_MS = Math.round(1000 / RIVAL_REPLAY_HZ);
export const RIVAL_REPLAY_MAX_FRAMES = RIVAL_REPLAY_HZ * 60 * 12;
export const RIVAL_REPLAY_MAX_EVENTS = 4000;
export const RIVAL_REPLAY_MAX_BULLETS = 40;

// frame = [t, runnerX, runnerY, runnerFlags, plugs, bullets, decoy]
export const FRAME = Object.freeze({ T: 0, RX: 1, RY: 2, RF: 3, PLUGS: 4, BULLETS: 5, DECOY: 6 });
// runner / plug flag bits
export const FLAG = Object.freeze({ FLIP: 1, PHASE: 2, CARRY: 4, HIDDEN: 8, HIT: 16 });
export const REPLAY_EVENT_KINDS = Object.freeze([
  'pickup', 'bunk', 'power', 'shot', 'hit', 'death', 'extract', 'timeout', 'sound'
]);

const q = n => Math.round(n * 100) / 100;          // cells, two decimals
const finite = n => typeof n === 'number' && Number.isFinite(n);

/**
 * Start a segment. `stashes` are the two pocket cells in generation order
 * (primary, secondary); which one is real is NOT stored — the player, the
 * bot and the spectator all learn it at pickup, from the event.
 */
export function newReplaySegment({ house, attempt, houseSeed, cols, rows, scale, stashes, car, runnerSpawn, plugSpawn, weapon = null }) {
  return {
    v: RIVAL_REPLAY_SCHEMA, house, attempt, houseSeed, cols, rows, scale,
    stashes: stashes.map(s => ({ x: q(s.x), y: q(s.y) })),
    car: { x: q(car.x), y: q(car.y) },
    spawn: { r: { x: q(runnerSpawn.x), y: q(runnerSpawn.y) }, p: { x: q(plugSpawn.x), y: q(plugSpawn.y) } },
    weapon,
    frames: [], events: [], durationMs: 0, sealed: false
  };
}

export function packFlags({ flip = false, phase = false, carry = false, hidden = false, hit = false } = {}) {
  return (flip ? FLAG.FLIP : 0) | (phase ? FLAG.PHASE : 0) | (carry ? FLAG.CARRY : 0) | (hidden ? FLAG.HIDDEN : 0) | (hit ? FLAG.HIT : 0);
}
export function unpackFlags(bits) {
  return { flip: !!(bits & FLAG.FLIP), phase: !!(bits & FLAG.PHASE), carry: !!(bits & FLAG.CARRY), hidden: !!(bits & FLAG.HIDDEN), hit: !!(bits & FLAG.HIT) };
}

/**
 * Append a sample. `t` is ms since the attempt started. Out-of-order or
 * duplicate times are dropped rather than sorted: a recorder that goes
 * backwards is broken and sorting would hide it.
 * state: { runner:{x,y,flags}, plugs:[{x,y,flags}], bullets:[{x,y}], decoy:{x,y}|null }
 */
export function pushReplayFrame(seg, t, state) {
  if (seg.sealed || !finite(t) || t < 0) return false;
  const last = seg.frames[seg.frames.length - 1];
  if (last && t <= last[FRAME.T]) return false;
  if (seg.frames.length >= RIVAL_REPLAY_MAX_FRAMES) return false;
  const r = state.runner;
  const bullets = (state.bullets || []).slice(0, RIVAL_REPLAY_MAX_BULLETS);
  seg.frames.push([
    Math.round(t), q(r.x), q(r.y), r.flags | 0,
    (state.plugs || []).map(p => [q(p.x), q(p.y), p.flags | 0]),
    bullets.flatMap(b => [q(b.x), q(b.y)]),
    state.decoy ? [q(state.decoy.x), q(state.decoy.y)] : 0
  ]);
  return true;
}

export function pushReplayEvent(seg, t, kind, data = null) {
  if (seg.sealed || !finite(t) || t < 0 || !REPLAY_EVENT_KINDS.includes(kind)) return false;
  if (seg.events.length >= RIVAL_REPLAY_MAX_EVENTS) return false;
  seg.events.push(data ? { t: Math.round(t), k: kind, ...data } : { t: Math.round(t), k: kind });
  return true;
}

export function sealReplaySegment(seg, durationMs) {
  const lastT = seg.frames.length ? seg.frames[seg.frames.length - 1][FRAME.T] : 0;
  seg.durationMs = Math.max(Math.round(finite(durationMs) ? durationMs : lastT), lastT);
  seg.sealed = true;
  return seg;
}

const cellIn = (v, max) => finite(v) && v >= -1 && v <= max + 1;
export function validateReplaySegment(seg) {
  const errors = [];
  if (!seg || typeof seg !== 'object') return { ok: false, errors: ['segment missing'] };
  if (seg.v !== RIVAL_REPLAY_SCHEMA) errors.push('unsupported replay schema');
  if (!Number.isInteger(seg.cols) || !Number.isInteger(seg.rows) || seg.cols < 4 || seg.rows < 4) errors.push('bad grid size');
  if (!Number.isInteger(seg.houseSeed) || seg.houseSeed < 0) errors.push('bad house seed');
  if (!finite(seg.scale)) errors.push('bad cluster scale');
  const pt = p => p && cellIn(p.x, seg.cols) && cellIn(p.y, seg.rows);
  if (!Array.isArray(seg.stashes) || seg.stashes.length !== 2 || !seg.stashes.every(pt)) errors.push('bad stash cells');
  if (!pt(seg.car) || !pt(seg.spawn?.r) || !pt(seg.spawn?.p)) errors.push('bad car/spawn cells');
  if (!Array.isArray(seg.frames)) errors.push('frames missing');
  else {
    if (seg.frames.length > RIVAL_REPLAY_MAX_FRAMES) errors.push('too many frames');
    if (seg.frames.length < 2) errors.push('too few frames');
    let lastT = -1;
    for (let i = 0; i < seg.frames.length && errors.length < 4; i++) {
      const f = seg.frames[i];
      if (!Array.isArray(f) || f.length !== 7) { errors.push('frame ' + i + ' malformed'); break; }
      if (!finite(f[FRAME.T]) || f[FRAME.T] <= lastT) { errors.push('frame ' + i + ' time not increasing'); break; }
      lastT = f[FRAME.T];
      if (!cellIn(f[FRAME.RX], seg.cols) || !cellIn(f[FRAME.RY], seg.rows) || !Number.isInteger(f[FRAME.RF])) { errors.push('frame ' + i + ' runner invalid'); break; }
      if (!Array.isArray(f[FRAME.PLUGS]) || !f[FRAME.PLUGS].every(p => Array.isArray(p) && p.length === 3 && cellIn(p[0], seg.cols) && cellIn(p[1], seg.rows))) { errors.push('frame ' + i + ' plugs invalid'); break; }
      if (!Array.isArray(f[FRAME.BULLETS]) || f[FRAME.BULLETS].length % 2 || f[FRAME.BULLETS].length > RIVAL_REPLAY_MAX_BULLETS * 2 || !f[FRAME.BULLETS].every(finite)) { errors.push('frame ' + i + ' bullets invalid'); break; }
      const d = f[FRAME.DECOY];
      if (!(d === 0 || (Array.isArray(d) && d.length === 2 && d.every(finite)))) { errors.push('frame ' + i + ' decoy invalid'); break; }
    }
  }
  if (!Array.isArray(seg.events) || seg.events.length > RIVAL_REPLAY_MAX_EVENTS) errors.push('events invalid');
  else if (seg.events.some(e => !e || !finite(e.t) || e.t < 0 || !REPLAY_EVENT_KINDS.includes(e.k))) errors.push('event malformed');
  if (!finite(seg.durationMs) || seg.durationMs < 0) errors.push('bad duration');
  else if (Array.isArray(seg.frames) && seg.frames.length && seg.durationMs < seg.frames[seg.frames.length - 1][FRAME.T]) errors.push('duration shorter than frames');
  return { ok: !errors.length, errors };
}

/** Index of the last frame at or before t (binary search). -1 before the first. */
export function replayFrameIndex(seg, t) {
  const frames = seg.frames;
  let lo = 0, hi = frames.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid][FRAME.T] <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

/**
 * Interpolated state at t. Positions lerp between the surrounding samples;
 * flags, bullets and decoy step (they are discrete, and a bullet that lerps
 * between two unrelated bullets streaks across the room). Before the first
 * frame it holds the first; after the last it holds the last.
 */
export function replayStateAt(seg, t) {
  const frames = seg.frames;
  if (!frames.length) return null;
  const i = Math.max(0, replayFrameIndex(seg, t));
  const a = frames[i], b = frames[Math.min(i + 1, frames.length - 1)];
  const span = b[FRAME.T] - a[FRAME.T];
  const p = span > 0 ? Math.min(1, Math.max(0, (t - a[FRAME.T]) / span)) : 0;
  const lerp = (u, v) => u + (v - u) * p;
  const plugs = a[FRAME.PLUGS].map((pa, k) => {
    const pb = b[FRAME.PLUGS][k] || pa;
    return { x: lerp(pa[0], pb[0]), y: lerp(pa[1], pb[1]), flags: pa[2] };
  });
  const bullets = [];
  for (let k = 0; k < a[FRAME.BULLETS].length; k += 2) bullets.push({ x: a[FRAME.BULLETS][k], y: a[FRAME.BULLETS][k + 1] });
  return {
    t, index: i,
    runner: { x: lerp(a[FRAME.RX], b[FRAME.RX]), y: lerp(a[FRAME.RY], b[FRAME.RY]), flags: a[FRAME.RF] },
    plugs, bullets,
    decoy: a[FRAME.DECOY] ? { x: a[FRAME.DECOY][0], y: a[FRAME.DECOY][1] } : null
  };
}

/** Events with t in (from, to]. Playback calls this once per rendered frame. */
export function replayEventsBetween(seg, from, to) {
  return seg.events.filter(e => e.t > from && e.t <= to);
}

/** Which stash pockets are still on the floor at t, from the events alone. */
export function replayStashesAt(seg, t) {
  const gone = new Set();
  for (const e of seg.events) {
    if (e.t > t) break;
    if (e.k === 'bunk' && Number.isInteger(e.i)) gone.add(e.i);
    if (e.k === 'pickup') { gone.add(0); gone.add(1); }
  }
  return seg.stashes.map((s, i) => ({ ...s, i, visible: !gone.has(i) }));
}

export function replayCardLabel(segment) {
  const house = 'HOUSE ' + segment.house;
  return segment.attempt > 1 ? house + '  ·  RETRY ' + (segment.attempt - 1) : house;
}

/**
 * Concatenate a bundle's segments into one playable timeline: a title card
 * before each attempt, then the attempt. `total` is playback time, which is
 * NOT race time — the race clock ran through transitions and retries that no
 * segment covers, so the race clock shown during playback comes from
 * segment.startedMs + local time, never from the timeline position.
 */
export function raceReplayTimeline(bundle, { cardMs = 1100, tailMs = 500 } = {}) {
  const items = [];
  let cursor = 0;
  (bundle?.segments || []).forEach((s, index) => {
    items.push({ kind: 'card', index, label: replayCardLabel(s), start: cursor, end: cursor + cardMs });
    cursor += cardMs;
    const ms = Math.max(0, (s.replay?.durationMs ?? s.durationMs ?? 0)) + tailMs;
    items.push({ kind: 'segment', index, start: cursor, end: cursor + ms });
    cursor += ms;
  });
  return { items, total: cursor };
}

export function timelineCursor(timeline, t) {
  const items = timeline.items;
  if (!items.length) return null;
  if (t >= timeline.total) { const last = items[items.length - 1]; return { item: last, local: last.end - last.start, done: true }; }
  let lo = 0, hi = items.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (items[mid].start <= t) lo = mid; else hi = mid - 1;
  }
  const item = items[lo];
  return { item, local: Math.max(0, t - item.start), done: false };
}

/** The first house where the opponent was ahead of the player, if any. */
export function decisiveHouse(playerTimes, rivalTimes) {
  for (let i = 0; i < rivalTimes.length; i++) {
    const player = playerTimes[i] ?? Infinity;
    if (rivalTimes[i] < player) return i + 1;
  }
  return null;
}
