// Run-statistics tests — plain Node, no framework, no browser.
//
//   node client/test/runStats.test.mjs
//
// mapStats() is the function the map-sizing decision gets read off. If it is
// wrong, it is wrong quietly and in the direction of a confident conclusion.

import { mapStats } from '../src/logic/runStats.js';

/* ---------------- tiny assert ---------------- */

let passed = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

/* ---------------- row builders ---------------- */

const died = (seed) => ({ seed, outcome: 'runner_eliminated', durationMs: 4600 });
const won = (seed) => ({ seed, outcome: 'extracted', durationMs: 6500 });

// n-1 deaths then a clear, in play order — a map that cost n attempts.
function map(seed, attempts) {
  return [...Array(attempts - 1)].map(() => died(seed)).concat(won(seed));
}

console.log('\nRun statistics\n');

// 1. A ladder session has one map per round, so grouping by seed says nothing
//    that the round numbers don't. Withholding the block is the honest answer.
check('returns null for a single map', mapStats([...map(1, 3)]) === null);
check('returns null for no rows', mapStats([]) === null);
check('returns null for undefined', mapStats(undefined) === null);

// 2. Rows with no seed can't be attributed to a map and must not be pooled
//    into one phantom group.
check('ignores rows with no seed',
  mapStats([died(null), won(undefined), ...map(1, 1)]) === null);

// 3. The straightforward read.
{
  const s = mapStats([...map(1, 1), ...map(2, 3), ...map(3, 2)]);
  check('counts distinct maps', s.mapsSampled === 3);
  check('counts attempts to clear each map', s.attemptsToClear.median === 2, JSON.stringify(s.attemptsToClear));
  check('reports the cheapest map', s.attemptsToClear.min === 1);
  check('reports the most expensive map', s.attemptsToClear.max === 3);
  check('reports first-try clear rate', s.clearedFirstTry === '33.3%');
  check('reports nothing uncleared', s.neverCleared === 0);
}

// 4. THE case this exists for. Nine maps that fall immediately and one wall
//    that eats 29 attempts: pooled over runs that is a 26% completion rate and
//    looks like a hard round. Per map it is nine gifts and a lottery ticket,
//    and only the second reading tells you the block format is broken.
{
  const rows = [];
  for (let seed = 1; seed <= 9; seed++) rows.push(...map(seed, 1));
  rows.push(...map(99, 29));

  const s = mapStats(rows);
  check('the wall map does not move the median', s.attemptsToClear.median === 1);
  check('the wall map shows up in the tail', s.attemptsToClear.max === 29);
  check('nine of ten maps fell first try', s.clearedFirstTry === '90.0%');
}

// 5. A map that never fell is not an attempts-to-clear sample — folding it in
//    as "cost 29" would understate the problem, and dropping it silently would
//    hide it. It gets counted separately.
{
  const rows = [...map(1, 1), died(2), died(2), died(2)];
  const s = mapStats(rows);
  check('counts a never-cleared map', s.neverCleared === 1);
  check('excludes it from attempts-to-clear', s.attemptsToClear.max === 1);
  check('still counts it as a map sampled', s.mapsSampled === 2);
  check('and against the first-try rate', s.clearedFirstTry === '50.0%');
}

// 6. Every map a wall: no clears at all, and nothing to take a median of.
{
  const s = mapStats([died(1), died(2)]);
  check('handles a batch with no clears at all', s.attemptsToClear === null);
  check('and reports both maps uncleared', s.neverCleared === 2);
}

// 7. Even attempt counts take the midpoint of the two middle values.
{
  const s = mapStats([...map(1, 1), ...map(2, 2), ...map(3, 3), ...map(4, 6)]);
  check('medians an even number of maps', s.attemptsToClear.median === 2.5, JSON.stringify(s.attemptsToClear));
}

/* ---------------- report ---------------- */

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
