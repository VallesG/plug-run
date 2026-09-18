// Steering tests — plain Node, no framework, no browser.
//
//   node client/test/steering.test.mjs

import { phaseSteer, wrapDelta } from '../src/logic/steering.js';

let passed = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

const eq = (a, b) => !!a && a.x === b.x && a.y === b.y;

console.log('\nSteering\n');

/* ---------------- wrapDelta ---------------- */

check('wrapDelta takes the short way across the seam', wrapDelta(1, 9, 10) === -2);
check('wrapDelta is plain subtraction when that is shorter', wrapDelta(1, 4, 10) === 3);
check('wrapDelta handles the other direction', wrapDelta(9, 1, 10) === 2);
check('wrapDelta is zero for the same cell', wrapDelta(5, 5, 10) === 0);

/* ---------------- phaseSteer ---------------- */

// The long axis wins — a short phase window is worth spending on the axis
// that actually closes distance.
check('heads along the longer axis (horizontal)',
  eq(phaseSteer({ x: 1, y: 1 }, { x: 8, y: 3 }, 20, 20), { x: 1, y: 0 }));
check('heads along the longer axis (vertical)',
  eq(phaseSteer({ x: 1, y: 1 }, { x: 3, y: 8 }, 20, 20), { x: 0, y: 1 }));
check('heads backwards when the target is behind',
  eq(phaseSteer({ x: 8, y: 1 }, { x: 1, y: 1 }, 20, 20), { x: -1, y: 0 }));

// Never diagonal. Drifting diagonally through solid wall reads as a collision
// bug, not an ability.
{
  const d = phaseSteer({ x: 1, y: 1 }, { x: 5, y: 5 }, 20, 20);
  check('never returns a diagonal', d.x === 0 || d.y === 0, JSON.stringify(d));
}

// Ties go to the horizontal, deterministically — an AI that flickers between
// two axes on equal distance burns the window going nowhere.
check('breaks an exact tie toward the horizontal',
  eq(phaseSteer({ x: 0, y: 0 }, { x: 3, y: 3 }, 20, 20), { x: 1, y: 0 }));

// Wrapping again: the objective just across the seam is close, and a phase
// aimed the long way round is a wasted power.
check('phases across the wrap seam, not the long way round',
  eq(phaseSteer({ x: 1, y: 5 }, { x: 9, y: 5 }, 10, 10), { x: -1, y: 0 }));

// Already there — the caller falls back to normal steering rather than being
// handed {0,0}, which would read as "stand still" and strand the runner.
check('returns null when already on the target', phaseSteer({ x: 4, y: 4 }, { x: 4, y: 4 }, 20, 20) === null);
check('returns null for a missing target', phaseSteer({ x: 4, y: 4 }, null, 20, 20) === null);
check('returns null for a missing origin', phaseSteer(null, { x: 4, y: 4 }, 20, 20) === null);

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
