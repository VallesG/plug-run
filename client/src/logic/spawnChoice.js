// Where the second opponent goes.
//
// WHY THIS EXISTS
// findAlternateSpawn placed the round-8 second opponent by scanning outward
// from the opposite corner, rejecting only cells too near the stash or the
// extraction. It never considered the player. Measured across 227 runs, that
// put the second plug within 6 cells of the runner on 24% of rounds 8+, with a
// minimum of one cell — spawning on top of them.
//
// Of the 47 runs that began within 6 cells of a plug, ZERO were ever survived.
// Not a low clear rate: none. Meanwhile the FIRST plug, which does respect a
// minimum distance (pickFar, >= (cols+rows)/4), produced that situation on 3%
// of rounds 1-7. The whole problem was one unguarded placement.
//
// Imports nothing, so the choice can be tested headlessly.

// The primary plug's own rule, reused so both opponents are placed by the
// same standard rather than one being held to a stricter one than the other.
const PREFERRED_GAP = (cols, rows) => Math.floor((cols + rows) / 4);

// Below this the data has no survivors at all, so it is a floor rather than a
// preference: every tier that could return something closer is skipped.
const HARD_FLOOR = 7;

function manhattan(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

/**
 * Is there an unobstructed shot from a to b along a row or column?
 *
 * Distance alone is not the whole story: spawning in a clear lane cleared 5%
 * against 12% with cover. A wall between you and the muzzle is the difference
 * between a threat and a neighbour.
 */
export function clearLaneBetween(isWalkable, a, b) {
  const dx = Math.sign(b.x - a.x);
  const dy = Math.sign(b.y - a.y);
  if (dx !== 0 && dy !== 0) return false;   // not aligned at all
  if (dx === 0 && dy === 0) return true;

  let x = a.x + dx;
  let y = a.y + dy;
  let guard = 0;
  while ((x !== b.x || y !== b.y) && guard++ < 1000) {
    if (!isWalkable(x, y)) return false;
    x += dx; y += dy;
  }
  return true;
}

/**
 * Pick the second opponent's cell.
 *
 * Deterministic by construction — no RNG, and ties broken on fixed ordering —
 * because both clients must build an identical world from the seed alone. That
 * property is what the whole async-PvP plan rests on, so this cannot reach for
 * Math.random() even for a tiebreak.
 *
 * Preference order, best first:
 *   0  a full gap from the player, and no clear shot at them
 *   1  a full gap from the player
 *   2  at least the hard floor, and no clear shot
 *   3  at least the hard floor
 *   4  anything legal — a map too cramped to do better still needs an answer
 *
 * @param opts.origin     the first opponent's cell; the search starts opposite it
 * @param opts.avoid      the PLAYER's cell — the thing that was missing
 * @param opts.isWalkable (x, y) => boolean
 */
export function chooseAlternateSpawn(opts) {
  const { cols, rows, origin, avoid, stash, extract, isWalkable } = opts;

  const oppositeX = cols - 1 - origin.x;
  const oppositeY = rows - 1 - origin.y;
  const gap = PREFERRED_GAP(cols, rows);

  const legal = (c) => {
    if (!isWalkable(c.x, c.y)) return false;
    // Existing rules: don't camp the objectives.
    if (stash && manhattan(c, stash) < 3) return false;
    if (extract && manhattan(c, extract) < 2) return false;
    return true;
  };

  const tierOf = (c) => {
    if (!avoid) return 1; // no player to avoid (the spawn-cycle path)
    const d = manhattan(c, avoid);
    const exposed = clearLaneBetween(isWalkable, c, avoid);
    if (d >= gap) return exposed ? 1 : 0;
    if (d >= HARD_FLOOR) return exposed ? 3 : 2;
    return 4;
  };

  let best = null;
  let bestKey = null;

  // Explicit numeric comparison. `[10, 0] < [9, 0]` is TRUE in JavaScript —
  // arrays compare by string coercion — which would quietly pick the wrong
  // cell on any map wider than ten columns.
  const better = (a, b) => {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return a[i] < b[i];
    }
    return false;
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = { x, y };
      if (!legal(c)) continue;

      const tier = tierOf(c);
      // Keep the original intent as the tiebreak: the far corner from the
      // first opponent, so the pair still bracket the map.
      const corner = Math.abs(x - oppositeX) + Math.abs(y - oppositeY);
      const key = [tier, corner, x, y];

      if (!bestKey || better(key, bestKey)) {
        bestKey = key;
        best = c;
      }
    }
  }

  return best;
}
