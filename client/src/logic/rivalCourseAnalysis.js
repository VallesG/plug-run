// Structural measurements of one generated house. Pure: no Phaser, no imports.
//
// Used three ways: the designed-course generator (utils/mazeGenerator.js)
// rejects a candidate house that fails its design's acceptance rules, the
// course tests hold every house of every course to those rules, and
// tools/rivals-course-report.mjs prints the numbers behind the course table in
// RIVALS_COURSES.md. Everything is in grid cells and 4-neighbour walking
// steps — what the runner actually walks — never straight-line distance.
//
// Grid convention is the maze generator's: grid[y][x], 0 = floor, 1 = wall.
// The outer ring is border; only interior cells are walkable.

const FLOOR = 0;

function dims(grid) { return { rows: grid.length, cols: grid[0]?.length || 0 }; }
function walkable(grid, x, y, blocked) {
  const { rows, cols } = dims(grid);
  if (x <= 0 || y <= 0 || x >= cols - 1 || y >= rows - 1) return false;
  if (grid[y][x] !== FLOOR) return false;
  return !(blocked && blocked.has(y * cols + x));
}

/** Walking distance from `start` to every cell (-1 = unreachable). */
export function stepsFrom(grid, start, blocked = null) {
  const { rows, cols } = dims(grid);
  const d = new Int32Array(rows * cols).fill(-1);
  if (!start || !walkable(grid, start.x, start.y, blocked)) return d;
  const q = new Int32Array(rows * cols);
  let head = 0, tail = 0;
  d[start.y * cols + start.x] = 0; q[tail++] = start.y * cols + start.x;
  while (head < tail) {
    const i = q[head++], x = i % cols, y = (i - x) / cols;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (!walkable(grid, nx, ny, blocked)) continue;
      const j = ny * cols + nx;
      if (d[j] !== -1) continue;
      d[j] = d[i] + 1; q[tail++] = j;
    }
  }
  return d;
}

export function steps(grid, a, b, blocked = null) {
  if (!a || !b) return null;
  const v = stepsFrom(grid, a, blocked)[b.y * dims(grid).cols + b.x];
  return v >= 0 ? v : null;
}

/** One shortest path from a to b as a list of cells, or null. */
export function shortestPath(grid, a, b, blocked = null) {
  const { cols } = dims(grid);
  const fromB = stepsFrom(grid, b, blocked);
  let cur = a, left = fromB[a.y * cols + a.x];
  if (left < 0) return null;
  const path = [{ x: a.x, y: a.y }];
  while (left > 0) {
    let next = null;
    for (const [nx, ny] of [[cur.x + 1, cur.y], [cur.x - 1, cur.y], [cur.x, cur.y + 1], [cur.x, cur.y - 1]]) {
      if (walkable(grid, nx, ny, blocked) && fromB[ny * cols + nx] === left - 1) { next = { x: nx, y: ny }; break; }
    }
    if (!next) return null;
    path.push(next); cur = next; left--;
  }
  return path;
}

/**
 * A second way from a to b down a DIFFERENT corridor: the shortest route's
 * interior (cells more than `guard` steps from either end — the ends, a
 * pocket mouth or the driveway, are shared by every route by definition) is
 * blocked together with its neighbours, so the lane beside it in a two-wide
 * corridor does not count as an alternative. Returns { steps, alternative,
 * ratio }; alternative/ratio are null when there is no separate corridor.
 */
export function routeAlternative(grid, a, b, { guard = 3 } = {}) {
  const path = shortestPath(grid, a, b);
  if (!path) return { steps: null, alternative: null, ratio: null };
  const { cols } = dims(grid);
  const blocked = new Set();
  const near = (c) => Math.min(Math.abs(c.x - a.x) + Math.abs(c.y - a.y), Math.abs(c.x - b.x) + Math.abs(c.y - b.y));
  for (let i = guard + 1; i < path.length - guard - 1; i++) {
    const p = path[i];
    for (const [x, y] of [[p.x, p.y], [p.x + 1, p.y], [p.x - 1, p.y], [p.x, p.y + 1], [p.x, p.y - 1]]) {
      if (near({ x, y }) > guard) blocked.add(y * cols + x);
    }
  }
  const n = path.length - 1;
  if (!blocked.size) return { steps: n, alternative: n, ratio: 1 };
  const alt = steps(grid, a, b, blocked);
  return { steps: n, alternative: alt, ratio: alt == null ? null : +(alt / Math.max(1, n)).toFixed(2) };
}

/**
 * Hard choke points on the way from a to b: single cells, away from both
 * ends, whose loss would cut a off from b entirely. A choke is what a plug
 * can hold; zero means there is always a way round.
 */
export function hardChokes(grid, a, b, { guard = 3 } = {}) {
  const path = shortestPath(grid, a, b);
  if (!path) return [];
  const { cols } = dims(grid);
  const out = [];
  for (let i = guard + 1; i < path.length - guard - 1; i++) {
    const c = path[i];
    if (steps(grid, a, b, new Set([c.y * cols + c.x])) == null) out.push(c);
  }
  return out;
}

/** The longest straight run of floor, horizontal or vertical: the longest firing lane. */
export function longestLane(grid) {
  const { rows, cols } = dims(grid);
  let best = 0;
  for (let y = 1; y < rows - 1; y++) {
    let run = 0;
    for (let x = 1; x < cols - 1; x++) { run = grid[y][x] === FLOOR ? run + 1 : 0; best = Math.max(best, run); }
  }
  for (let x = 1; x < cols - 1; x++) {
    let run = 0;
    for (let y = 1; y < rows - 1; y++) { run = grid[y][x] === FLOOR ? run + 1 : 0; best = Math.max(best, run); }
  }
  return best;
}

/** Straight floor runs of at least `min` cells: the lanes a dash can use or a gun can cover. */
export function laneCount(grid, min = 8) {
  const { rows, cols } = dims(grid);
  let n = 0;
  const scan = (len, at) => {
    let run = 0;
    for (let i = 1; i < len - 1; i++) {
      if (at(i) === FLOOR) run++;
      else { if (run >= min) n++; run = 0; }
    }
    if (run >= min) n++;
  };
  for (let y = 1; y < rows - 1; y++) scan(cols, (x) => grid[y][x]);
  for (let x = 1; x < cols - 1; x++) scan(rows, (y) => grid[y][x]);
  return n;
}

/**
 * Phase shortcuts: one-cell-thick walls with floor on both faces where
 * walking round costs at least `minSaving` more steps than phasing through.
 */
export function phaseShortcuts(grid, { minSaving = 6 } = {}) {
  const { rows, cols } = dims(grid);
  let n = 0;
  for (let y = 2; y < rows - 2; y++) {
    for (let x = 2; x < cols - 2; x++) {
      if (grid[y][x] === FLOOR) continue;
      for (const [ax, ay, bx, by] of [[x - 1, y, x + 1, y], [x, y - 1, x, y + 1]]) {
        if (grid[ay][ax] !== FLOOR || grid[by][bx] !== FLOOR) continue;
        const round = steps(grid, { x: ax, y: ay }, { x: bx, y: by });
        if (round == null || round - 2 >= minSaving) { n++; break; }
      }
    }
  }
  return n;
}

export function deadEnds(grid) {
  const { rows, cols } = dims(grid);
  let n = 0;
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (grid[y][x] !== FLOOR) continue;
      const open = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => walkable(grid, a, b)).length;
      if (open === 1) n++;
    }
  }
  return n;
}

export function wallDensity(grid) {
  const { rows, cols } = dims(grid);
  let w = 0;
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) if (grid[y][x] !== FLOOR) w++;
  return +(w / ((rows - 2) * (cols - 2))).toFixed(3);
}

/**
 * Everything about one house. `arena` is generateSquareMaze's result.
 * Legs: runner -> each pocket, each pocket -> car. The car is the driveway
 * entry (where BaseGameScene puts the extraction sensor).
 */
export function analyzeHouse(arena, { guard = 3 } = {}) {
  const { grid, spawns, objectives, egress } = arena;
  const { rows, cols } = dims(grid);
  const car = egress.entry;
  const legs = {
    toA: [spawns.runner, objectives.stash],
    toB: [spawns.runner, objectives.extract],
    aToCar: [objectives.stash, car],
    bToCar: [objectives.extract, car]
  };
  const out = { cols, rows, density: wallDensity(grid), legs: {}, carSide: egress.side };
  for (const [k, [a, b]] of Object.entries(legs)) {
    const alt = routeAlternative(grid, a, b, { guard });
    out.legs[k] = { steps: alt.steps, alternative: alt.alternative, ratio: alt.ratio, chokes: hardChokes(grid, a, b, { guard }).length };
  }
  out.reachable = Object.values(out.legs).every((l) => l.steps != null);
  out.chokes = Object.values(out.legs).reduce((a, l) => a + l.chokes, 0);
  out.singleRouteLegs = Object.values(out.legs).filter((l) => l.alternative == null).length;
  // The shortest full run: nearer bag, then (worst case, it was bunk) the other, then the car.
  const L = out.legs;
  const ab = steps(grid, objectives.stash, objectives.extract);
  out.bestRun = out.reachable ? Math.min(L.toA.steps + L.aToCar.steps, L.toB.steps + L.bToCar.steps) : null;
  out.worstRun = out.reachable && ab != null
    ? Math.max(L.toA.steps + ab + L.bToCar.steps, L.toB.steps + ab + L.aToCar.steps) : null;
  out.plug = {
    toRunner: steps(grid, spawns.plug, spawns.runner),
    toA: steps(grid, spawns.plug, objectives.stash),
    toB: steps(grid, spawns.plug, objectives.extract),
    toCar: steps(grid, spawns.plug, car)
  };
  out.lane = longestLane(grid);
  out.lanes = laneCount(grid, 8);
  out.phase = phaseShortcuts(grid);
  out.deadEnds = deadEnds(grid);
  return out;
}

/** Stable short fingerprint of a house's geometry, for "no two houses are the same" checks. */
export function houseFingerprint(arena) {
  let h = 2166136261;
  const feed = (n) => { h = Math.imul(h ^ (n & 0xff), 16777619) >>> 0; };
  for (const row of arena.grid) for (const c of row) feed(c);
  for (const p of [arena.spawns.runner, arena.spawns.plug, arena.objectives.stash, arena.objectives.extract, arena.egress.entry]) { feed(p.x); feed(p.y); }
  return h.toString(16);
}
