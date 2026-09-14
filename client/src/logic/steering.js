// Steering helpers — pure direction maths, no Phaser, so they can be tested
// headlessly (see logic/threat.js for why that constraint exists).

/**
 * Signed distance from a to b on an axis that wraps at `n`.
 *
 * The maze is a torus. Going from column 1 to column 9 on a 10-wide grid is
 * two steps left, not eight steps right, and a plain `b - a` picks the long
 * way every time.
 */
export function wrapDelta(a, b, n) {
  let d = b - a;
  if (!n) return d;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

/**
 * Which way to head while phasing through walls.
 *
 * Ordinary steering plans over walkable cells: a BFS that only visits floor,
 * and a guard that refuses any direction ending in a wall. That is correct
 * almost always and exactly wrong while intangible, when the whole point of
 * the power is that the wall is not there. So phasing gets its own answer —
 * point at the objective and go, geometry be damned.
 *
 * One axis at a time, longer axis first: a diagonal drift through solid wall
 * reads as a collision bug rather than an ability, and the long axis is the
 * one worth spending a ~600ms window on.
 *
 * Returns null when already on the target cell, so the caller can fall back
 * to normal steering rather than being handed a zero vector.
 */
export function phaseSteer(from, to, cols, rows) {
  if (!from || !to) return null;

  const dx = wrapDelta(from.x, to.x, cols);
  const dy = wrapDelta(from.y, to.y, rows);
  if (dx === 0 && dy === 0) return null;

  return (Math.abs(dx) >= Math.abs(dy))
    ? { x: Math.sign(dx), y: 0 }
    : { x: 0, y: Math.sign(dy) };
}
