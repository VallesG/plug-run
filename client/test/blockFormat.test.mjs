// Block-format tests — plain Node, no framework, no browser.
//
//   node client/test/blockFormat.test.mjs

import {
  PVE_BLOCK_MAPS, PVP_BLOCK_MAPS, dualOpponentMap, hasDualOpponent, isBlockComplete
} from '../src/logic/blockFormat.js';

let passed = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

console.log('\nBlock format\n');

check('a PvE block is 15 maps', PVE_BLOCK_MAPS === 15);
check('a PvP block is half that', PVP_BLOCK_MAPS === 7);

// THE CHANGE THAT MATTERS. The second opponent used to arrive on every map
// from 8 onward, and that boundary is exactly where per-map clear rate fell
// 50% -> 17% with defender2 taking 56-76% of the kills.
{
  const dual = [];
  for (let i = 1; i <= PVE_BLOCK_MAPS; i++) if (hasDualOpponent(i)) dual.push(i);
  check('only one map in the block has a second opponent', dual.length === 1, JSON.stringify(dual));
  check('and it is the last one', dual[0] === PVE_BLOCK_MAPS);
}

check('map 8 is no longer a dual map', hasDualOpponent(8) === false);
check('map 14 is still single', hasDualOpponent(14) === false);
check('map 15 is the finale', hasDualOpponent(15) === true);
check('dualOpponentMap names the finale', dualOpponentMap() === PVE_BLOCK_MAPS);

// A PvP block is shorter, so its finale lands earlier.
check('a 7-map block puts its finale on map 7', dualOpponentMap(PVP_BLOCK_MAPS) === 7);
check('and map 7 carries the second opponent there',
  hasDualOpponent(7, PVP_BLOCK_MAPS) === true);
check('while map 7 is ordinary in a 15-map block', hasDualOpponent(7) === false);

// The run has to END. It used to run forever, which meant every player's run
// finished by hitting a wall rather than by finishing.
check('the block is not complete mid-run', isBlockComplete(14) === false);
check('the block completes on the last map', isBlockComplete(15) === true);
check('and stays complete past it', isBlockComplete(16) === true);
check('a PvP block completes at 7', isBlockComplete(7, PVP_BLOCK_MAPS) === true);

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
