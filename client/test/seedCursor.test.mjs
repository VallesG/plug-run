// Seed-cursor tests — plain Node, no framework, no browser.
//
//   node client/test/seedCursor.test.mjs

import { advanceCursor } from '../src/logic/seedCursor.js';

let passed = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

const LOCK = 8;

// Play a whole batch: `outcomes` is one entry per round, 'died' or 'cleared'.
// Returns the (routeID, attempt) each round actually ran on, which is what the
// telemetry records and therefore what the analysis groups by.
function play(outcomes, repeats, startRoute = 100) {
  let cursor = { routeID: startRoute, attempts: 0 };
  let arriving = LOCK; // first round arrives at the locked round
  const log = [];

  for (const outcome of outcomes) {
    cursor = advanceCursor(cursor, arriving, LOCK, repeats);
    log.push({ route: cursor.routeID, attempt: cursor.attempts });
    // A clear restarts at lockRound + 1; a death restarts at lockRound.
    arriving = outcome === 'cleared' ? LOCK + 1 : LOCK;
  }
  return log;
}

console.log('\nSeed cursor\n');

// 1. seedRepeats 1 — every map gets exactly one shot.
{
  const log = play(['died', 'died', 'died'], 1);
  check('repeats=1 gives each map one attempt',
    log.every((r) => r.attempt === 1), JSON.stringify(log));
  check('repeats=1 advances the map every round',
    log.map((r) => r.route).join() === '100,101,102', JSON.stringify(log));
}

// 2. seedRepeats 3 — three shots, then move on.
{
  const log = play(['died', 'died', 'died', 'died'], 3);
  check('repeats=3 keeps the same map for three attempts',
    log.slice(0, 3).every((r) => r.route === 100), JSON.stringify(log));
  check('repeats=3 numbers the attempts 1,2,3',
    log.slice(0, 3).map((r) => r.attempt).join() === '1,2,3');
  check('repeats=3 moves on for the fourth',
    log[3].route === 101 && log[3].attempt === 1);
}

// 3. A clear ends the map early — nothing left to learn from one you beat.
{
  const log = play(['cleared', 'died', 'died'], 5);
  check('a clear advances the map before the budget is spent',
    log[1].route === 101 && log[1].attempt === 1, JSON.stringify(log));
}

// 4. THE REGRESSION. This is the observed sequence from the first locked batch
//    that came back wrong: two deaths on one map, then a death and a clear on
//    the next. The cursor half was always right — the bug was that the round
//    wasn't actually pinned, so difficulty climbed underneath it. Pinning the
//    round is what the caller does; this locks in the sequencing it relies on.
{
  const log = play(['died', 'died', 'died', 'cleared', 'died'], 2);
  check('reproduces the observed map sequence',
    log.map((r) => `${r.route}.${r.attempt}`).join(' ') === '100.1 100.2 101.1 101.2 102.1',
    log.map((r) => `${r.route}.${r.attempt}`).join(' '));
}

// 5. The input cursor is not mutated — the caller copies fields back itself,
//    and a hidden mutation would double-advance.
{
  const cursor = { routeID: 100, attempts: 0 };
  advanceCursor(cursor, LOCK, LOCK, 2);
  check('does not mutate the cursor it is given',
    cursor.routeID === 100 && cursor.attempts === 0);
}

// 6. First round of a batch stays on the starting map. Advancing immediately
//    would silently skip map 0 of every batch.
{
  const first = advanceCursor({ routeID: 100, attempts: 0 }, LOCK, LOCK, 3);
  check('the first round of a batch uses the starting map',
    first.routeID === 100 && first.attempts === 1);
}

// 7. A round arriving from far above the lock (a stale saved session at round
//    30, say) still reads as "cleared" and just costs one map. It must not
//    wedge or skip a batch's worth of seeds.
{
  const out = advanceCursor({ routeID: 100, attempts: 1 }, 30, LOCK, 3);
  check('a stale high round advances exactly one map',
    out.routeID === 101 && out.attempts === 1);
}

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
