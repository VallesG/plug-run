// Cover-routing tests — plain Node, no framework, no browser.
//
//   node client/test/cover.test.mjs

import { coverAwareStep, exposedCells, isExposedAt, phaseEscapeDir } from '../src/logic/cover.js';

let passed = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

// 11 wide, 9 tall. Border walls. Rows/cols of interior floor unless listed.
function world(walls = []) {
  const W = new Set(walls.map(([x, y]) => `${x},${y}`));
  return {
    cols: 11, rows: 9,
    isWalkable: (x, y) => x > 0 && y > 0 && x < 10 && y < 8 && !W.has(`${x},${y}`)
  };
}

console.log('\nCover routing\n');

/* ---------------- exposure ---------------- */
{
  const w = world();
  const ex = exposedCells({ ...w, threats: [{ x: 5, y: 4 }] });
  check('a plug covers its own row', ex.has('9,4') && ex.has('1,4'));
  check('and its own column', ex.has('5,1') && ex.has('5,7'));
  check('but not the diagonals', !ex.has('6,5') && !ex.has('4,3'));
}

// A wall stops the shot, and everything behind it is cover. This is the whole
// basis of the routing, so it matters that it is exact.
{
  const w = world([[7, 4]]);
  const ex = exposedCells({ ...w, threats: [{ x: 5, y: 4 }] });
  check('a wall blocks the lane', !ex.has('8,4') && !ex.has('9,4'));
  check('cells before the wall are still exposed', ex.has('6,4'));
}

{
  const w = world();
  check('isExposedAt agrees with the map',
    isExposedAt({ ...w, threats: [{ x: 5, y: 4 }] }, { x: 5, y: 2 }) === true &&
    isExposedAt({ ...w, threats: [{ x: 5, y: 4 }] }, { x: 6, y: 2 }) === false);
}

/* ---------------- routing ---------------- */

// With no threats it must behave exactly like shortest-path, so the change is
// inert when nothing is shooting.
{
  const w = world();
  const step = coverAwareStep({ ...w, from: { x: 1, y: 4 }, goal: { x: 5, y: 4 }, threats: [] });
  check('walks straight at the goal when nothing threatens', step.x === 2 && step.y === 4);
}

// THE CASE THIS EXISTS FOR. Row 4 is a straight shot to the goal and a plug
// owns it from the side. Row 3 is one cell longer and covered. A length-only
// router takes row 4 every time.
{
  const w = world();
  const threats = [{ x: 10, y: 4 }];   // sits on row 4, covering it
  const openRow = coverAwareStep({ ...w, from: { x: 1, y: 4 }, goal: { x: 8, y: 4 }, threats, penalty: 0 });
  const covered = coverAwareStep({ ...w, from: { x: 1, y: 4 }, goal: { x: 8, y: 4 }, threats, penalty: 6 });
  check('penalty 0 reproduces the old shortest-path behaviour', openRow.x === 2 && openRow.y === 4);
  check('with a penalty it steps out of the firing lane instead',
    covered.y !== 4, JSON.stringify(covered));

  // BotDriver multiplies the penalty by coverCarryMul (1.8) while carrying,
  // so a fractional penalty is the normal case, not an edge: 3 x 1.8 = 5.4.
  // It used to index a bucket that did not exist and throw.
  let threw = null, carried = null;
  try { carried = coverAwareStep({ ...w, from: { x: 1, y: 4 }, goal: { x: 8, y: 4 }, threats, penalty: 3 * 1.8 }); }
  catch (e) { threw = e; }
  check('a fractional (carry-scaled) penalty does not throw', threw === null, threw?.message);
  check('and still routes out of the lane', carried && carried.y !== 4, JSON.stringify(carried));
}

// Cover is a preference, not a phobia: when the only route is exposed, take it.
// A single-corridor world, so there is genuinely nowhere else to go — an
// earlier version of this test left row 2 open and the router rightly used it.
{
  const corridor = {
    cols: 11, rows: 9,
    isWalkable: (x, y) => y === 4 && x > 0 && x < 10
  };
  const step = coverAwareStep({
    ...corridor, from: { x: 1, y: 4 }, goal: { x: 5, y: 4 },
    threats: [{ x: 9, y: 4 }], penalty: 6
  });
  check('still advances when every route is exposed',
    step && step.x === 2 && step.y === 4, JSON.stringify(step));
}

// The objective itself may sit in the open. Charging its exposure would make
// it look unreachable and the runner would mill about outside it.
{
  const w = world();
  const step = coverAwareStep({ ...w, from: { x: 5, y: 2 }, goal: { x: 5, y: 3 }, threats: [{ x: 10, y: 3 }], penalty: 20 });
  check('enters an exposed goal rather than refusing it', step.x === 5 && step.y === 3, JSON.stringify(step));
}

/* ---------------- robustness ---------------- */
{
  const w = world();
  check('returns null when already on the goal',
    coverAwareStep({ ...w, from: { x: 4, y: 4 }, goal: { x: 4, y: 4 }, threats: [] }) === null);
  check('returns null with no goal',
    coverAwareStep({ ...w, from: { x: 4, y: 4 }, goal: null, threats: [] }) === null);
}

// Walled off entirely: the caller needs null so it can fall back, not a hang.
{
  const w = world([[1, 3], [2, 4], [1, 5]]);
  const step = coverAwareStep({ ...w, from: { x: 1, y: 4 }, goal: { x: 8, y: 4 }, threats: [], penalty: 6 });
  check('returns null when the goal is unreachable', step === null, JSON.stringify(step));
}

// Every returned step must be adjacent and legal — a router that suggests a
// wall or a teleport would be worse than none.
{
  const w = world();
  let bad = 0;
  for (let y = 1; y < 8; y++) for (let x = 1; x < 10; x++) {
    const s = coverAwareStep({ ...w, from: { x, y }, goal: { x: 9, y: 7 }, threats: [{ x: 5, y: 4 }] });
    if (!s) continue;
    const adj = Math.abs(s.x - x) + Math.abs(s.y - y) === 1;
    if (!adj || !w.isWalkable(s.x, s.y)) bad++;
  }
  check('every step it suggests is adjacent and walkable', bad === 0, `${bad} bad steps`);
}

/* ---------------- phase escape ---------------- */

// Setup for all of these: the runner sits at (1,2) with a plug down row 2, so
// the row IS the lane. The wall to phase through is perpendicular to it — put
// the wall IN the lane instead and the runner has cover and nothing to escape,
// which is how the first version of these tests was wrong.
const pinned = { from: { x: 1, y: 2 }, threats: [{ x: 9, y: 2 }], goal: { x: 8, y: 6 } };

// A one-cell wall with clear floor behind it: exactly what phase is for.
{
  const out = phaseEscapeDir({ ...world([[1, 3]]), ...pinned, maxWall: 3 });
  check('phases through a thin wall to covered floor',
    !!out && out.dir.y === 1 && out.landing.y === 4, JSON.stringify(out));
}

// THE BUG. A wall thicker than the 600ms window can cross strands the runner
// inside the geometry with the power spent. Seen in play before this check
// existed: "gets stuck when phasing if wall is too much".
{
  const out = phaseEscapeDir({
    ...world([[1, 3], [1, 4], [1, 5], [1, 6]]), ...pinned, maxWall: 3
  });
  check('refuses to phase into a wall it cannot cross', out === null, JSON.stringify(out));
}

// ...and clears the same shape when it fits, so the refusal is about thickness
// rather than about giving up.
{
  const out = phaseEscapeDir({
    ...world([[1, 3], [1, 4], [1, 5]]), ...pinned, maxWall: 3
  });
  check('crosses a wall exactly at the budget',
    !!out && out.landing.y === 6, JSON.stringify(out));
}

// Landing back in a firing lane is no escape at all.
{
  const out = phaseEscapeDir({
    ...world([[1, 3]]), from: pinned.from, goal: pinned.goal,
    threats: [{ x: 9, y: 2 }, { x: 9, y: 4 }], maxWall: 3
  });
  check('will not land in another plug\u2019s lane', out === null, JSON.stringify(out));
}

// Not pinned: nothing to escape, so keep the power.
{
  const out = phaseEscapeDir({
    ...world([[1, 3]]), from: pinned.from, goal: pinned.goal,
    threats: [{ x: 7, y: 6 }], maxWall: 3
  });
  check('does not spend phase when not in a lane', out === null);
}

// Open ground on every side — running is the better answer.
{
  const out = phaseEscapeDir({ ...world(), from: { x: 5, y: 2 }, threats: pinned.threats, goal: pinned.goal, maxWall: 3 });
  check('does not spend phase with no wall to pass through', out === null);
}

// The map border is not an exit.
{
  const out = phaseEscapeDir({ ...world([[1, 3]]), ...pinned, maxWall: 3 });
  check('never phases out through the border', !out || (out.landing.x > 0 && out.landing.y > 0));
}

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
