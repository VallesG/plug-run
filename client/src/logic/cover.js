// Cover-aware routing — treating exposure as a cost, not as invisible.
//
// WHY
// findNextStepTowards runs BFS over walkable cells, so it optimises path length
// and nothing else. A corridor three cells shorter but fully in a plug's firing
// line wins every time, and the runner walks down it because nothing in its
// model says that is worse. Watching a sweep, that reads as "he doesn't foresee
// that's a bad area to just stay in".
//
// The telemetry says the same thing from the other side: across 227 runs, the
// runs that CLEARED spent a median 0.03 of their life in a clear firing lane,
// and the runs that DIED spent 0.23. Nearly eight times more.
//
// This is not about making the bot superhuman. Nobody walks calmly down a long
// open corridor with a gun at the far end, so a router with no concept of
// exposure is not a human-like player being imperfect — it has a blind spot no
// human has, which biases measurements exactly as much as playing too well
// would.
//
// Imports nothing, so it can be tested headlessly.

const key = (x, y) => `${x},${y}`;

/**
 * Every cell a threat has an unobstructed shot at.
 *
 * Walks out from each threat along its row and column until a wall stops it,
 * which is the same geometry a bullet travels. Costs O(threats * (cols + rows))
 * rather than testing every cell against every threat.
 */
export function exposedCells({ cols, rows, isWalkable, threats }) {
  const out = new Set();
  for (const t of threats || []) {
    if (!t) continue;
    out.add(key(t.x, t.y));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let x = t.x + dx;
      let y = t.y + dy;
      let guard = 0;
      while (x >= 0 && y >= 0 && x < cols && y < rows && guard++ < 1000) {
        if (!isWalkable(x, y)) break;   // a wall is cover; everything past it is safe
        out.add(key(x, y));
        x += dx; y += dy;
      }
    }
  }
  return out;
}

/**
 * The next step toward `goal`, taking the cheapest route where standing in a
 * firing lane costs extra.
 *
 * Uniform-cost search rather than plain BFS, because the whole point is that
 * steps are no longer equal. `penalty` is how many extra cells of walking a
 * player should accept to stay behind cover — at 0 this degrades exactly to
 * shortest-path, which makes it easy to A/B against the old behaviour.
 *
 * Returns null when there is no route at all, so the caller can fall back to
 * whatever it was doing rather than freeze.
 */
export function coverAwareStep({ cols, rows, isWalkable, from, goal, threats, penalty = 6 }) {
  if (!from || !goal) return null;
  if (from.x === goal.x && from.y === goal.y) return null;

  const exposed = exposedCells({ cols, rows, isWalkable, threats });
  const costOf = (x, y) => 1 + (exposed.has(key(x, y)) ? penalty : 0);

  // Small integer costs over ~560 cells: a bucket queue is both faster and
  // more predictable than a heap, and keeps the whole thing allocation-light
  // enough to run on the bot's replan tick.
  const dist = new Map();
  const firstStep = new Map();
  const start = key(from.x, from.y);
  dist.set(start, 0);

  const buckets = [[{ x: from.x, y: from.y, step: null }]];
  let d = 0;

  while (d < buckets.length) {
    const bucket = buckets[d];
    if (!bucket || !bucket.length) { d++; continue; }
    const node = bucket.pop();
    const k = key(node.x, node.y);
    if (dist.get(k) !== d) continue;           // stale entry

    if (node.x === goal.x && node.y === goal.y) return firstStep.get(k) || node.step;

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = node.x + dx;
      const ny = node.y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (!isWalkable(nx, ny)) continue;

      // The goal is worth reaching even if it sits in the open, so its own
      // exposure is not charged — otherwise a stash in a lane looks
      // unreachable and the runner mills about outside it.
      const atGoal = (nx === goal.x && ny === goal.y);
      const nd = d + (atGoal ? 1 : costOf(nx, ny));
      const nk = key(nx, ny);
      if (dist.has(nk) && dist.get(nk) <= nd) continue;

      dist.set(nk, nd);
      firstStep.set(nk, node.step || { x: nx, y: ny });
      while (buckets.length <= nd) buckets.push([]);
      buckets[nd].push({ x: nx, y: ny, step: node.step || { x: nx, y: ny } });
    }
  }

  return null;
}

/** Is this cell in anyone's firing line right now? */
export function isExposedAt({ cols, rows, isWalkable, threats }, cell) {
  if (!cell) return false;
  return exposedCells({ cols, rows, isWalkable, threats }).has(key(cell.x, cell.y));
}

/**
 * A direction worth spending phase on, or null.
 *
 * WHY THIS IS NOT JUST "IS A WALL NEXT TO ME"
 * That was the first version, and it stranded the runner. Phase lasts 600ms
 * and the runner covers 7 cells/sec (5.95 carrying the stash), so the window
 * crosses about four cells at the absolute best and realistically three. Fire
 * it at a wall thicker than that and the intangibility expires with the runner
 * still inside the geometry — ensureUnstuck then teleports it somewhere
 * arbitrary, and the power has been spent to go nowhere.
 *
 * So the wall has to be thin enough to cross AND have somewhere worth landing:
 * a walkable cell immediately beyond, out of the firing lane the phase is
 * escaping. Without all three, running is the better answer and the power
 * keeps for a wall that matters.
 *
 * @param maxWall how many consecutive wall cells the window can clear
 * @returns { dir, landing } or null
 */
export function phaseEscapeDir({ cols, rows, isWalkable, from, threats, goal, maxWall = 3 }) {
  if (!from) return null;
  const exposed = exposedCells({ cols, rows, isWalkable, threats });
  if (!exposed.has(key(from.x, from.y))) return null;   // not pinned; nothing to escape

  let best = null;
  let bestScore = Infinity;

  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    // Must actually start with a wall — phase is for going THROUGH something.
    if (isWalkable(from.x + dx, from.y + dy)) continue;

    for (let thickness = 1; thickness <= maxWall; thickness++) {
      const lx = from.x + dx * (thickness + 1);
      const ly = from.y + dy * (thickness + 1);
      if (lx < 0 || ly < 0 || lx >= cols || ly >= rows) break;

      // Still inside the wall: keep looking, up to the budget.
      if (!isWalkable(lx, ly)) continue;

      // Found floor. Only worth it if it is out of the lane we are stuck in.
      if (exposed.has(key(lx, ly))) break;

      const score = goal ? Math.abs(goal.x - lx) + Math.abs(goal.y - ly) : 0;
      if (score < bestScore) {
        bestScore = score;
        best = { dir: { x: dx, y: dy }, landing: { x: lx, y: ly } };
      }
      break;
    }
  }

  return best;
}
