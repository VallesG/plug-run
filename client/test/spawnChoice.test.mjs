// Spawn-choice tests — plain Node, no framework, no browser.
//
//   node client/test/spawnChoice.test.mjs
//
// The bug these lock down: 47 runs across a 227-run sweep began within 6 cells
// of a plug, and not one of them was ever survived.

import { chooseAlternateSpawn, clearLaneBetween } from '../src/logic/spawnChoice.js';

let passed = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

const COLS = 16, ROWS = 35;
const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// Open field with a border, matching the real grid's proportions.
function openMap(extraWalls = []) {
  const wall = new Set(extraWalls.map(([x, y]) => `${x},${y}`));
  return (x, y) => {
    if (x <= 0 || y <= 0 || x >= COLS - 1 || y >= ROWS - 1) return false;
    return !wall.has(`${x},${y}`);
  };
}

const base = {
  cols: COLS, rows: ROWS,
  stash: { x: 8, y: 17 },
  extract: { x: 8, y: 30 },
  isWalkable: openMap()
};

console.log('\nSpawn choice\n');

/* ---------------- the regression ---------------- */

// THE BUG. The player sits at one end; the second opponent must not be placed
// on top of them. Swept across many player positions because the old code
// failed on roughly a quarter of them.
{
  let worst = Infinity;
  let failures = 0;
  for (let py = 2; py < ROWS - 2; py += 3) {
    const player = { x: 8, y: py };
    const origin = { x: 3, y: 3 };
    const c = chooseAlternateSpawn({ ...base, origin, avoid: player });
    const d = man(c, player);
    worst = Math.min(worst, d);
    if (d < 7) failures++;
  }
  check('never spawns the second opponent inside the dead zone', failures === 0,
    `${failures} placements under 7 cells, closest ${worst}`);
  check('and clears the preferred gap when the map allows', worst >= 12, `closest ${worst}`);
}

// Without a player to avoid — the spawn-cycle path — behaviour is unchanged
// and it still returns a legal cell.
{
  const c = chooseAlternateSpawn({ ...base, origin: { x: 3, y: 3 }, avoid: null });
  check('still returns a cell when there is no player to avoid', !!c && base.isWalkable(c.x, c.y));
}

/* ---------------- the existing rules still hold ---------------- */
{
  const c = chooseAlternateSpawn({ ...base, origin: { x: 3, y: 3 }, avoid: { x: 8, y: 4 } });
  check('never camps the stash', man(c, base.stash) >= 3);
  check('never camps the extraction', man(c, base.extract) >= 2);
  check('always lands on walkable floor', base.isWalkable(c.x, c.y));
}

/* ---------------- determinism ---------------- */

// Both clients build the world from the seed alone. A spawn that varied per
// call would break that, so this must be reproducible with no RNG involved.
{
  const args = { ...base, origin: { x: 5, y: 9 }, avoid: { x: 9, y: 28 } };
  const a = chooseAlternateSpawn(args);
  const b = chooseAlternateSpawn(args);
  const c = chooseAlternateSpawn(args);
  check('is deterministic across repeated calls',
    a.x === b.x && a.y === b.y && b.x === c.x && b.y === c.y);
}

// Guards the lexicographic-comparison trap: [10,0] < [9,0] is true in JS, so a
// map wider than ten columns would silently pick a worse cell. Rather than
// guess a coordinate, recompute the documented ordering over every legal cell
// and assert the function returned the true optimum.
{
  const origin = { x: 14, y: 33 };
  const avoid = { x: 2, y: 2 };
  const c = chooseAlternateSpawn({ ...base, origin, avoid });

  const oppX = COLS - 1 - origin.x, oppY = ROWS - 1 - origin.y;
  const gap = Math.floor((COLS + ROWS) / 4);
  const tier = (p) => {
    const d = man(p, avoid);
    const exposed = clearLaneBetween(base.isWalkable, p, avoid);
    if (d >= gap) return exposed ? 1 : 0;
    if (d >= 7) return exposed ? 3 : 2;
    return 4;
  };

  let bestTier = Infinity, bestCorner = Infinity;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const p = { x, y };
    if (!base.isWalkable(x, y)) continue;
    if (man(p, base.stash) < 3 || man(p, base.extract) < 2) continue;
    const t = tier(p), corner = Math.abs(x - oppX) + Math.abs(y - oppY);
    if (t < bestTier || (t === bestTier && corner < bestCorner)) { bestTier = t; bestCorner = corner; }
  }

  const gotCorner = Math.abs(c.x - oppX) + Math.abs(c.y - oppY);
  check('returns the best cell by the documented ordering, not a string-sorted one',
    tier(c) === bestTier && gotCorner === bestCorner,
    `got tier ${tier(c)} corner ${gotCorner}, best is tier ${bestTier} corner ${bestCorner}`);
  check('and that cell honours the distance rule', man(c, avoid) >= gap, String(man(c, avoid)));
}

/* ---------------- cover ---------------- */

// Distance is not the whole story: a clear lane cleared 5% against 12% with
// cover, so an unobstructed shot is preferred against but not forbidden.
{
  const isW = openMap();
  check('sees a clear shot down a column',
    clearLaneBetween(isW, { x: 5, y: 5 }, { x: 5, y: 15 }) === true);
  check('sees a wall as cover',
    clearLaneBetween(openMap([[5, 10]]), { x: 5, y: 5 }, { x: 5, y: 15 }) === false);
  check('off-axis is not a lane at all',
    clearLaneBetween(isW, { x: 5, y: 5 }, { x: 9, y: 15 }) === false);
}

/* ---------------- cramped maps degrade, they do not fail ---------------- */

// A map with almost nowhere legal still has to produce an answer; returning
// nothing would leave the second opponent unplaced.
{
  const tiny = (x, y) => (x >= 7 && x <= 9 && y >= 16 && y <= 18);
  const c = chooseAlternateSpawn({
    cols: COLS, rows: ROWS, origin: { x: 3, y: 3 }, avoid: { x: 8, y: 17 },
    stash: null, extract: null, isWalkable: tiny
  });
  check('still answers on a map with nowhere good to go', !!c && tiny(c.x, c.y));
}

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
