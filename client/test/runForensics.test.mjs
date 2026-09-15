// Run-forensics tests — plain Node, no framework, no browser.
//
//   node client/test/runForensics.test.mjs

import RunForensics from '../src/logic/runForensics.js';

let passed = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

const CELL = 24;
const at = (cx, cy) => ({ x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2, active: true, visible: true });

// 10x10, open floor with a wall column at x=5 between y=3 and y=6.
function makeScene(over = {}) {
  const grid = Array.from({ length: 10 }, (_, y) =>
    Array.from({ length: 10 }, (_, x) => (x === 0 || y === 0 || x === 9 || y === 9) ? 1 : 0));
  for (let y = 3; y <= 6; y++) grid[y][5] = 1;

  return {
    cell: CELL, cols: 10, rows: 10, grid, simTick: 0, hasStash: false,
    attacker: at(1, 1),
    defender: at(7, 7),
    defender2: null,
    stash: at(3, 1),
    extract: at(8, 1),
    toCell: (x, y) => ({ x: Math.floor(x / CELL), y: Math.floor(y / CELL) }),
    isWalkableCell(cx, cy) {
      return cx >= 0 && cy >= 0 && cx < 10 && cy < 10 && this.grid[cy][cx] !== 1;
    },
    findPath: () => [1, 2, 3], // length 3; enough to exercise the ratio
    ...over
  };
}

console.log('\nRun forensics\n');

/* ---------------- spawn fairness ---------------- */

// The premise the spawn-swap button was built on, finally measurable.
{
  const s = makeScene({ attacker: at(1, 1), defender: at(6, 1) });
  const f = new RunForensics(); f.begin(s); f.tick(s);
  check('flags a spawn already in a plug’s clear lane', f.spawn.inLaneAtStart === true);
  check('records distance to the nearest plug', f.spawn.plugDistCells === 5);
}

// A wall in the lane is cover, not exposure. Counting it would make every map
// look like a shooting gallery.
{
  const s = makeScene({ attacker: at(3, 5), defender: at(8, 5) }); // wall at x=5,y=5
  const f = new RunForensics(); f.begin(s); f.tick(s);
  check('a wall in the lane means the spawn is not exposed', f.spawn.inLaneAtStart === false);
}

// Off-axis is not a lane at all.
{
  const s = makeScene({ attacker: at(1, 1), defender: at(7, 4) });
  const f = new RunForensics(); f.begin(s); f.tick(s);
  check('off-axis plug is not a lane', f.spawn.inLaneAtStart === false);
}

/* ---------------- the leg split ---------------- */

// The single most useful fact: approach and extraction are different games.
{
  const s = makeScene();
  const f = new RunForensics(); f.begin(s); f.tick(s);
  s.simTick = 120; f.pickup(s, 'real');
  s.hasStash = true;
  s.simTick = 300; f.death(s, 'defender', 'bullet');

  const out = f.summary(s);
  check('a death after pickup is on the carry leg', out.leg === 'carry');
  check('splits approach ticks', out.approachTicks === 120);
  check('splits carry ticks', out.carryTicks === 180);
}

{
  const s = makeScene();
  const f = new RunForensics(); f.begin(s); f.tick(s);
  s.simTick = 90; f.death(s, 'defender2', 'bullet');
  const out = f.summary(s);
  check('a death before pickup is on the approach leg', out.leg === 'approach');
  check('carry leg is zero when the stash was never reached', out.carryTicks === 0);
  check('names the plug that landed the kill', out.death.killer === 'defender2');
  check('records how it killed', out.death.method === 'bullet');
}

/* ---------------- the bunk cost ---------------- */

// "What does guessing the wrong duffel cost" — open since the first session.
{
  const s = makeScene();
  const f = new RunForensics(); f.begin(s); f.tick(s);
  s.simTick = 60; f.pickup(s, 'bunk');
  s.simTick = 200; f.pickup(s, 'real');
  s.simTick = 400; f.extract(s);

  const out = f.summary(s);
  check('records that the decoy was taken first', out.tookBunkFirst === true);
  check('prices the wrong guess in ticks', out.bunkCostTicks === 140);
}

{
  const s = makeScene();
  const f = new RunForensics(); f.begin(s); f.tick(s);
  s.simTick = 80; f.pickup(s, 'real');
  s.simTick = 300; f.extract(s);
  const out = f.summary(s);
  check('no bunk cost when the first guess was right', out.tookBunkFirst === false && out.bunkCostTicks === null);
}

/* ---------------- a clean win is the baseline ---------------- */
{
  const s = makeScene();
  const f = new RunForensics(); f.begin(s); f.tick(s);
  s.simTick = 100; f.pickup(s, 'real');
  s.simTick = 250; f.extract(s);
  const out = f.summary(s);
  check('a win still records its leg split', out.approachTicks === 100 && out.carryTicks === 150);
  check('a win records no death', out.death === null);
}

/* ---------------- exposure and route ---------------- */
{
  const s = makeScene({ attacker: at(1, 1), defender: at(6, 1) }); // in lane
  const f = new RunForensics(); f.begin(s);
  for (let i = 0; i < 10; i++) { s.simTick = i; f.tick(s); }
  s.defender = at(7, 4); // off-axis now
  for (let i = 10; i < 20; i++) { s.simTick = i; f.tick(s); }
  const out = f.summary(s);
  check('measures the fraction of a run spent exposed', out.laneFrac === 0.5, String(out.laneFrac));
}

{
  const s = makeScene();
  const f = new RunForensics(); f.begin(s);
  f.tick(s); // capture frame
  // Walk 6 cells' worth of pixels.
  for (let i = 1; i <= 6; i++) { s.attacker = at(1 + i, 1); s.simTick = i; f.tick(s); }
  const out = f.summary(s);
  check('measures the route actually walked', out.walkedCells === 6, String(out.walkedCells));
  check('compares it against the optimal route', out.routeRatio === 1, String(out.routeRatio));
}

/* ---------------- powers ---------------- */
{
  const s = makeScene();
  const f = new RunForensics(); f.begin(s); f.tick(s);
  s.simTick = 55; f.power(s, 0, 'dash');
  s.simTick = 210; f.power(s, 1, 'phase');
  const out = f.summary(s);
  check('records which power was spent and when',
    out.powers.length === 2 && out.powers[0].name === 'dash' && out.powers[1].tick === 210);
}

/* ---------------- the setup-order regression ---------------- */

// THE BUG THIS LOCKS DOWN. startMatch() arms the recorder before it makes the
// plugs visible and before the stash pair is placed. Reading the board at that
// moment gives plugDistCells null and inLaneAtStart false on every run — which
// is a recording of the setup order, not a measurement. It shipped that way and
// all 63 rows of the first sweep came back dead.
{
  const s = makeScene({ attacker: at(1, 1), defender: at(6, 1) });
  const invisible = { ...s.defender, visible: false };
  const booting = { ...s, defender: invisible, defender2: null, stash: null, extract: null };

  const f = new RunForensics();
  f.begin(booting);            // nothing is on the board yet
  check('captures nothing while the board is still being built', f.spawn === null);

  f.tick(s);                   // first real frame: everything placed and visible
  check('captures the spawn once the board exists', f.spawn.inLaneAtStart === true);
  check('and gets the distance it could not see before', f.spawn.plugDistCells === 5);
  check('and the optimal route', f.summary(s).optimalCells === 6);
}

/* ---------------- robustness ---------------- */

// Never recorded a begin(): a half-built scene must not take the run down.
{
  const f = new RunForensics();
  const s = makeScene();
  let threw = false;
  try { f.tick(s); f.pickup(s, 'real'); f.death(s, null, 'clock'); } catch { threw = true; }
  check('is inert before begin()', !threw && f.summary(s) === null);
}

// The first death wins — later hits during the death animation must not
// overwrite who actually landed the kill.
{
  const s = makeScene();
  const f = new RunForensics(); f.begin(s); f.tick(s);
  s.simTick = 100; f.death(s, 'defender', 'bullet');
  s.simTick = 140; f.death(s, 'defender2', 'melee');
  check('keeps the first death, not the last', f.summary(s).death.killer === 'defender');
}

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
