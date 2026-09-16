// Where the job contact's object sits in a house. Pure: no imports.
//
// RULES THIS OBEYS
// The maze, the collision grid and the generator's RNG stream are untouched.
// Placement is a read-only pass over the finished grid using its own seed
// domain, so adding or removing a mission cannot shift a single wall, spawn
// or stash pocket — the same house plays identically with or without it.
//
// It is an EXTRA objective, never a replacement: the real bag still has to
// come out, and this never counts as stash.
export const MISSION_ITEM_VERSION = 1;
// Deliberately not the stash green (0x86efac) and not the car beacon blue.
// One colour for every gang, so the ring is learnable rather than decorative.
export const MISSION_ITEM_COLOR = 0xb07cf0;
export const MISSION_ITEM_CSS = '#b07cf0';

const FLOOR = 0;
const key = (x, y) => y * 1000 + x;

function hash(value) {
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  return (h ^ (h >>> 15)) >>> 0;
}
/** Its own domain, so the item's seed can never collide with maze or stash RNG. */
export function missionItemSeed(houseSeed, blockIndex, house) {
  return hash('plug-run/mission/v' + MISSION_ITEM_VERSION + '/' + (houseSeed >>> 0) + '/' + blockIndex + '/' + house);
}

/** Cells reachable from a start, with their step distance. Read-only. */
function reachable(grid, start) {
  const rows = grid.length, cols = grid[0]?.length ?? 0;
  const seen = new Map();
  if (!start || grid[start.y]?.[start.x] !== FLOOR) return seen;
  const queue = [{ x: start.x, y: start.y, d: 0 }];
  seen.set(key(start.x, start.y), 0);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = p.x + dx, y = p.y + dy;
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      if (grid[y][x] !== FLOOR || seen.has(key(x, y))) continue;
      seen.set(key(x, y), p.d + 1);
      queue.push({ x, y, d: p.d + 1 });
    }
  }
  return seen;
}

/**
 * Choose the item's cell, or null when the house has nowhere sensible.
 *
 * It must be reachable from the runner's spawn — an unreachable objective is
 * a lie — and it is pushed away from the two stash pockets so nobody grabs it
 * by accident while reading the duffels, and away from the driveway so it is
 * never collected on the way out for free. Among everything that qualifies,
 * the seed picks one, so a retry finds it in exactly the same place.
 */
export function placeMissionItem({ grid, spawn, stash, extract, egress, seed, minFromStash = 4, minFromExit = 4 } = {}) {
  if (!Array.isArray(grid) || !grid.length || !spawn) return null;
  const from = reachable(grid, spawn);
  if (!from.size) return null;
  const avoid = [stash, extract, egress].filter(Boolean);
  const stashDistance = avoid.map(point => reachable(grid, point));

  const near = (cell, limit, maps) => maps.some(map => {
    const d = map.get(key(cell.x, cell.y));
    return d === undefined ? false : d < limit;
  });

  const candidates = [];
  for (const [id, distance] of from) {
    const x = id % 1000, y = (id - x) / 1000;
    const cell = { x, y };
    // Not on top of the player at the whistle, and not a doorstep pickup.
    if (distance < 3) continue;
    if (avoid.some(p => p.x === x && p.y === y)) continue;
    if (near(cell, minFromStash, stashDistance.slice(0, 2))) continue;
    if (stashDistance[2] && near(cell, minFromExit, [stashDistance[2]])) continue;
    candidates.push({ x, y, fromSpawn: distance });
  }
  // Falls back by dropping the exit rule, then the stash rule, rather than
  // returning nothing: a tight house should still be able to hold a job.
  const pool = candidates.length ? candidates : relaxed(grid, from, avoid, minFromStash, stashDistance);
  if (!pool.length) return null;
  pool.sort((a, b) => a.fromSpawn - b.fromSpawn || a.y - b.y || a.x - b.x);
  const chosen = pool[(seed >>> 0) % pool.length];
  return { x: chosen.x, y: chosen.y, fromSpawn: chosen.fromSpawn, version: MISSION_ITEM_VERSION };
}

function relaxed(grid, from, avoid, minFromStash, stashDistance) {
  const out = [];
  for (const [id, distance] of from) {
    const x = id % 1000, y = (id - x) / 1000;
    if (distance < 3) continue;
    if (avoid.some(p => p.x === x && p.y === y)) continue;
    out.push({ x, y, fromSpawn: distance });
  }
  return out;
}

/**
 * The job itself, as the brief describes it. Names come from the secondary's
 * own line, so the panel and the pickup toast cannot disagree.
 */
export const MISSION_OBJECTS = Object.freeze({
  mags: Object.freeze({ id: 'tube', label: 'DOCUMENT TUBE', short: 'TUBE' }),
  rook: Object.freeze({ id: 'keys', label: 'SERVICE KEYS', short: 'KEYS' }),
  sol: Object.freeze({ id: 'marker', label: 'PAINT MARKER', short: 'MARKER' })
});
export function missionObject(contactID) {
  return MISSION_OBJECTS[contactID] || null;
}

/** Did the run earn it? Item plus the real bag plus an extraction. Nothing less. */
export function missionSucceeded({ tookItem, tookRealStash, extracted } = {}) {
  return Boolean(tookItem && tookRealStash && extracted);
}

/** Mandatory-job policy is confined to Journey; race recordings stay unchanged. */
export function missionExitAllowed({ mode, runKind, role, required, tookItem, hasStash } = {}) {
  if (mode !== 'pve' || runKind !== 'journey' || role !== 'runner' || !required) return true;
  return Boolean(tookItem && hasStash);
}

/** Normal seeded placement first; a tiny valid room must not become unwinnable. */
export function placeRequiredMissionItem(options = {}) {
  const placed = placeMissionItem(options);
  if (placed) return placed;
  const { grid, spawn } = options;
  if (!spawn || !Array.isArray(grid) || grid[spawn.y]?.[spawn.x] !== FLOOR) return null;
  return { x: spawn.x, y: spawn.y, fromSpawn: 0, version: MISSION_ITEM_VERSION };
}

// Stylized item foley, not random tones or downloaded samples. Seconds/Hz.
const tone = (type, hz, endHz, delay, duration, volume) =>
  Object.freeze({ type, hz, endHz, delay, duration, volume });
const PICKUP_SOUNDS = Object.freeze({
  keys: Object.freeze([
    tone('sine', 2400, 1800, 0, 0.08, 0.3),
    tone('sine', 3100, 2200, 0.035, 0.07, 0.2),
    tone('sine', 1800, 1300, 0.07, 0.1, 0.25)
  ]),
  marker: Object.freeze([
    tone('square', 650, 190, 0, 0.025, 0.25),
    tone('triangle', 1700, 900, 0.04, 0.045, 0.22)
  ]),
  tube: Object.freeze([
    tone('triangle', 210, 100, 0, 0.075, 0.55),
    tone('triangle', 440, 180, 0.025, 0.09, 0.2)
  ])
});
export function missionPickupSound(objectID) {
  return Object.prototype.hasOwnProperty.call(PICKUP_SOUNDS, objectID) ? PICKUP_SOUNDS[objectID] : null;
}
