// The vocabulary Jev decides in, and the adapter that turns a decision into a
// place on the board. Pure and dependency-free, like everything in logic/.
//
// THREE LAYERS, AND THIS IS THE MIDDLE ONE
//   1. JevStrategist (controllers/) chooses an objective, a posture and an
//      optional power. Nothing it produces is a direction.
//   2. This file resolves that objective into a legal, reachable cell — the
//      "where", never the "how".
//   3. The game's own runner AI (RunnerAI.updateRunnerBehavior, reached
//      through BotDriver.driveBorrowedAI) walks there: path following, wall
//      sliding, stuck recovery, and BotDriver's dodge layer on top.
//
// A STRATEGY IS NOT A MOVE
// There is no field in any of these structures that could carry one. Jev
// picks "bag A", the adapter says "that is cell (4, 17)", and the capable AI
// decides every step of getting there.

export const OBJECTIVES = Object.freeze(['target_a', 'target_b', 'extract', 'hold']);
export const POSTURES = Object.freeze(['safe', 'balanced', 'aggressive']);
export const POWERS = Object.freeze(['phase', 'dash', 'decoy']);

// Keys a strategy must never carry. Checked by the answer mapper and by the
// tests, so a future edit that "just adds a direction hint" fails loudly.
export const MOVEMENT_KEYS = Object.freeze(['move', 'dir', 'direction', 'heading', 'vx', 'vy', 'dx', 'dy', 'step']);
export const MOVEMENT_WORDS = Object.freeze(['up', 'down', 'left', 'right', 'north', 'south', 'east', 'west']);

/**
 * Path distance, in cells, from `from` to every reachable cell.
 *
 * Over the game's own walkable test and 4-neighbourhood, so "distance" means
 * what the runner would actually have to walk, not a straight line through
 * walls. Returns { cols, rows, d } with d an Int16Array (-1 = unreachable):
 * this runs whenever the runner changes cell, so it is kept cheap.
 */
export function pathDistances({ cols, rows, isWalkable }, from, limit = Infinity) {
  const d = new Int16Array(cols * rows).fill(-1);
  const out = { cols, rows, d };
  if (!from || !isWalkable(from.x, from.y)) return out;
  const q = new Int32Array(cols * rows);
  let head = 0, tail = 0;
  const start = from.y * cols + from.x;
  d[start] = 0; q[tail++] = start;
  while (head < tail) {
    const i = q[head++];
    const dist = d[i];
    if (dist >= limit) continue;
    const x = i % cols, y = (i - x) / cols;
    for (let k = 0; k < 4; k++) {
      const nx = k === 0 ? x + 1 : k === 1 ? x - 1 : x;
      const ny = k === 2 ? y + 1 : k === 3 ? y - 1 : y;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const j = ny * cols + nx;
      if (d[j] !== -1 || !isWalkable(nx, ny)) continue;
      d[j] = dist + 1;
      q[tail++] = j;
    }
  }
  return out;
}

export const distTo = (dist, cell) => {
  if (!dist || !cell || cell.x < 0 || cell.y < 0 || cell.x >= dist.cols || cell.y >= dist.rows) return null;
  const v = dist.d[cell.y * dist.cols + cell.x];
  return v < 0 ? null : v;
};

/**
 * The live bags as unlabelled candidates, in a fixed spatial order.
 *
 * `bags` are cells with no identity attached — the caller strips which one
 * is real before this ever sees them (see BotDriver._jevView). Order is by
 * row, then column: position only, so "target_a" says where a bag is and
 * nothing about what it is.
 */
export function orderCandidates(bags) {
  return (bags || [])
    .filter((c) => c && Number.isFinite(c.x) && Number.isFinite(c.y))
    .map((c) => ({ x: c.x, y: c.y }))
    .sort((a, b) => (a.y - b.y) || (a.x - b.x))
    .map((c, i) => ({ id: i === 0 ? 'target_a' : 'target_b', cell: c }))
    .slice(0, 2);
}

/** Which objectives are legal to choose right now. */
export function legalObjectives(view) {
  if (view.carrying) return ['extract', 'hold'];
  return [...view.candidates.map((c) => c.id), 'hold'];
}

/**
 * Resolve a strategic objective to a cell the runner AI can be sent to.
 *
 * @returns {{ ok: true, objective, cell } | { ok: false, reason }}
 *   Reasons: 'unknown', 'carrying' (a bag while holding the stash: extraction
 *   is the only destination), 'not-carrying' (extract with nothing to
 *   extract), 'absent' (that bag is gone), 'unreachable'.
 */
export function resolveObjective(objective, view, dist) {
  if (!OBJECTIVES.includes(objective)) return { ok: false, reason: 'unknown' };
  if (objective === 'hold') return { ok: true, objective, cell: { ...view.runner } };
  if (view.carrying) {
    if (objective !== 'extract') return { ok: false, reason: 'carrying' };
    if (!view.extract) return { ok: false, reason: 'absent' };
    if (distTo(dist, view.extract) == null) return { ok: false, reason: 'unreachable' };
    return { ok: true, objective, cell: { ...view.extract } };
  }
  if (objective === 'extract') return { ok: false, reason: 'not-carrying' };
  const c = view.candidates.find((k) => k.id === objective);
  if (!c) return { ok: false, reason: 'absent' };
  if (distTo(dist, c.cell) == null) return { ok: false, reason: 'unreachable' };
  return { ok: true, objective, cell: { ...c.cell } };
}

/**
 * Where to go when there is no usable strategy: the extract when carrying,
 * otherwise the NEAREST bag by walking distance.
 *
 * Nearest, never real — the same rule BotDriver.currentGoal has always used.
 * The runner AI's own objective code heads for `scene.stash` (the real bag)
 * because it was written to drive an AI opponent; in the hybrid that choice
 * is never consulted, so the fallback has to be one a player could make.
 */
export function fallbackObjective(view, dist) {
  if (view.carrying) {
    return view.extract && distTo(dist, view.extract) != null
      ? { objective: 'extract', cell: { ...view.extract } } : null;
  }
  let best = null, bestD = Infinity;
  for (const c of view.candidates) {
    const d = distTo(dist, c.cell);
    if (d != null && d < bestD) { best = c; bestD = d; }
  }
  return best ? { objective: best.id, cell: { ...best.cell } } : null;
}

/**
 * A committed target cell, re-identified after the candidate list changed.
 * A bag does not move, so the same cell is the same bag; its A/B label may
 * change when the other one vanishes, and that is fine.
 */
export function stillCandidate(view, cell) {
  return !!cell && view.candidates.some((c) => c.cell.x === cell.x && c.cell.y === cell.y);
}

/**
 * What a posture changes. Routing weight and evasion range only — how
 * cautiously the capable AI and BotDriver's lane layer treat exposure. It
 * never touches where the runner goes or how it steers.
 */
export function postureTactics(posture, base = {}) {
  const danger = Number.isFinite(base.dangerCells) ? base.dangerCells : 7;
  const cover = Number.isFinite(base.coverPenalty) ? base.coverPenalty : 0;
  if (posture === 'safe') return { dangerCells: Math.max(danger, 7), coverPenalty: Math.max(cover, 6) };
  if (posture === 'aggressive') return { dangerCells: Math.max(3, danger - 2), coverPenalty: 0 };
  return { dangerCells: danger, coverPenalty: cover };
}

/**
 * A recovery waypoint while the watchdog has taken the plan away.
 *
 * With a `goal` (a pathDistances map from what the runner was walking to):
 * a cell 3-8 steps away that is as close to the goal as possible while still
 * short of it (at least 3 steps out, so it is a waypoint and not the same
 * destination again), preferring one off the direct route that just stalled,
 * penalised for sitting in a firing lane or within reach of a plug, with a
 * little jitter so two stalls in one spot do not pick the same cell. The
 * stall is broken by a short sidestep that keeps the progress already made,
 * rather than by a walk in a random direction.
 *
 * Without one: somewhere reachable 4-10 cells away, preferring cells out of
 * every plug's firing lane.
 */
export function recoveryCell(view, dist, { rng = Math.random, exposed = () => false, goal = null, nearPlug = () => false } = {}) {
  const total = goal && view.runner ? distTo(goal, view.runner) : null;
  if (goal && total != null) {
    const near = [];
    for (let i = 0; i < dist.d.length; i++) {
      const d = dist.d[i];
      if (d < 3 || d > 8) continue;
      const g = goal.d[i];
      if (g < 3) continue;
      const x = i % dist.cols, y = (i - x) / dist.cols;
      near.push({ x, y, g, onRoute: d + g <= total + 1 });
    }
    if (near.length) {
      near.sort((a, b) => a.g - b.g);
      let best = null, bestScore = Infinity;
      for (const c of near.slice(0, 24)) {
        const score = c.g + (c.onRoute ? 4 : 0) + (exposed(c) ? 6 : 0) + (nearPlug(c) ? 10 : 0) + rng() * 3;
        if (score < bestScore) { best = c; bestScore = score; }
      }
      return { x: best.x, y: best.y };
    }
  }
  const pool = [];
  for (let i = 0; i < dist.d.length; i++) {
    const d = dist.d[i];
    if (d < 4 || d > 10) continue;
    const x = i % dist.cols, y = (i - x) / dist.cols;
    pool.push({ x, y });
  }
  // Exposure is costly to compute; only a sample is checked.
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  for (const c of pool.slice(0, 24)) c.safe = !exposed(c);
  if (!pool.length) return null;
  const c = pool.slice(0, 24).find((k) => k.safe) || pool[0];
  return { x: c.x, y: c.y };
}
