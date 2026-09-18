// Threat-selection tests — plain Node, no framework, no browser.
//
//   node client/test/threat.test.mjs
//
// nearestPlug() decides which opponent RunnerAI is afraid of. The case worth
// testing is round 8 onward in runner mode, where a second plug exists and the
// AI historically could not see it at all.

import { nearestPlug, toroDist } from '../src/logic/threat.js';

/* ---------------- tiny assert ---------------- */

let passed = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

/* ---------------- stub scene ---------------- */

const CELL = 24;

function plug(cx, cy, over = {}) {
  return { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2, active: true, visible: true, ...over };
}

function makeScene(over = {}) {
  return {
    cell: CELL,
    cols: 10,
    rows: 10,
    toCell: (x, y) => ({ x: Math.floor(x / CELL), y: Math.floor(y / CELL) }),
    defender: null,
    defender2: null,
    ...over
  };
}

console.log('\nThreat selection\n');

/* ---------------- toroDist ---------------- */

// 1. The grid wraps, so opposite edges are neighbours, not opposites.
check('toroDist measures the short way round the torus',
  toroDist({ x: 0, y: 5 }, { x: 9, y: 5 }, 10, 10) === 1);

check('toroDist is plain Manhattan when no wrap is shorter',
  toroDist({ x: 1, y: 1 }, { x: 3, y: 2 }, 10, 10) === 3);

/* ---------------- nearestPlug ---------------- */

// 2. Rounds 1-7, and every round of plug mode: one defender, nothing changes.
//    This is the case that must stay bit-for-bit identical to the old code.
{
  const d1 = plug(5, 5);
  const s = makeScene({ defender: d1 });
  check('returns the only plug when there is no second one',
    nearestPlug(s, plug(1, 1)) === d1);
}

// 3. Round 8+ in runner mode. The whole point: the closer plug wins, even when
//    it is the one the old code could not represent.
{
  const d1 = plug(8, 8);
  const d2 = plug(2, 1);
  const s = makeScene({ defender: d1, defender2: d2 });
  check('picks the second plug when it is the closer threat',
    nearestPlug(s, plug(1, 1)) === d2);
}

// 4. ...and does not flip to it just because it exists.
{
  const d1 = plug(2, 1);
  const d2 = plug(8, 8);
  const s = makeScene({ defender: d1, defender2: d2 });
  check('keeps the first plug when it is the closer threat',
    nearestPlug(s, plug(1, 1)) === d1);
}

// 5. Distance is measured toroidally, matching the pathfinding. A plug just
//    across the wrap seam is on top of you; straight-line pixel maths says it
//    is the width of the map away and would pick the wrong threat.
{
  const d1 = plug(5, 1);   // 4 cells away the ordinary way
  const d2 = plug(9, 1);   // 2 cells away across the seam from x=1
  const s = makeScene({ defender: d1, defender2: d2 });
  check('measures across the wrap seam, not in a straight line',
    nearestPlug(s, plug(1, 1)) === d2);
}

// 6. A dead or despawned plug is not a threat. hit() deactivates sprites rather
//    than nulling the reference, so "exists" is not the same question as "can
//    shoot me".
{
  const d1 = plug(8, 8);
  const d2 = plug(2, 1, { active: false });
  const s = makeScene({ defender: d1, defender2: d2 });
  check('ignores an inactive second plug however close it is',
    nearestPlug(s, plug(1, 1)) === d1);
}

{
  const d1 = plug(8, 8);
  const d2 = plug(2, 1, { visible: false });
  const s = makeScene({ defender: d1, defender2: d2 });
  check('ignores an invisible second plug (spawned, not yet revealed)',
    nearestPlug(s, plug(1, 1)) === d1);
}

// 7. The primary can die first — rounds 8+ let you kill either one. Falling
//    back to a corpse would freeze the AI's panic distance forever.
{
  const d1 = plug(2, 1, { active: false });
  const d2 = plug(8, 8);
  const s = makeScene({ defender: d1, defender2: d2 });
  check('falls back to the second plug when the first is dead',
    nearestPlug(s, plug(1, 1)) === d2);
}

// 8. Nothing left to fear. Callers guard on the result, so this must not throw.
{
  const s = makeScene({ defender: null, defender2: null });
  let threw = false;
  let out;
  try { out = nearestPlug(s, plug(1, 1)); } catch { threw = true; }
  check('returns a falsy plug rather than throwing when both are gone',
    !threw && !out);
}

/* ---------------- report ---------------- */

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
