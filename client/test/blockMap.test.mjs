// Block-map tests — plain Node, no framework, no browser.
//
//   node client/test/blockMap.test.mjs

import { layoutBlock, houseState } from '../src/logic/blockMap.js';

let passed = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

console.log('\nBlock map\n');

// The three states, in order down the street.
check('cleared houses are lit', houseState(3, 5, 15) === 'lit');
check('the house after the last cleared one is next', houseState(6, 5, 15) === 'next');
check('everything beyond that is dark', houseState(7, 5, 15) === 'dark');

// The finale keeps the same states with a prefix, so a renderer can draw it
// differently without a second state machine.
check('the last house is the finale', houseState(15, 5, 15) === 'finale-dark');
check('finale becomes next when 14 are cleared', houseState(15, 14, 15) === 'finale-next');
check('finale is lit when the block is done', houseState(15, 15, 15) === 'finale-lit');

// Fresh night: nothing lit, house 1 is next.
{
  const { houses } = layoutBlock({ maps: 15, cleared: 0, width: 440 });
  check('a fresh block has nothing lit', houses.every((h) => !h.state.endsWith('lit')));
  check('and house 1 is next', houses[0].state === 'next');
}

// Mid-night: counts add up.
{
  const { houses } = layoutBlock({ maps: 15, cleared: 7, width: 440 });
  const lit = houses.filter((h) => h.state.endsWith('lit')).length;
  const next = houses.filter((h) => h.state.endsWith('next'));
  check('lit count equals cleared', lit === 7);
  check('exactly one house is next', next.length === 1 && next[0].index === 8);
  check('one house per map', houses.length === 15);
}

// Layout fits its width — houses must not spill past the panel edge.
{
  const width = 440, x0 = 20;
  const { houses } = layoutBlock({ maps: 15, cleared: 4, width, x0 });
  const minL = Math.min(...houses.map((h) => h.x - h.w / 2));
  const maxR = Math.max(...houses.map((h) => h.x + h.w / 2));
  check('houses stay inside the given width', minL >= x0 && maxR <= x0 + width, `${minL}..${maxR}`);
  check('houses are left-to-right in map order',
    houses.every((h, i) => i === 0 || h.x > houses[i - 1].x));
  check('the finale is the widest house', houses[14].w > houses[0].w);
}

// Out-of-range input is clamped, not trusted.
{
  const over = layoutBlock({ maps: 15, cleared: 40, width: 440 });
  check('cleared past the end clamps to all lit', over.houses.every((h) => h.state.endsWith('lit')));
  const under = layoutBlock({ maps: 15, cleared: -3, width: 440 });
  check('negative cleared clamps to none lit', under.houses[0].state === 'next');
}

// A 7-map PvP block works with the same code.
{
  const { houses } = layoutBlock({ maps: 7, cleared: 6, width: 300 });
  check('a 7-map block puts its finale next when 6 are cleared', houses[6].state === 'finale-next');
}

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
