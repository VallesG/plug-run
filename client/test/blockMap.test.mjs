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

check('cleared houses are revealed', houseState(3, 5, 15) === 'revealed');
check('the house after the last cleared one is next', houseState(6, 5, 15) === 'next');
check('everything beyond that stays fogged', houseState(7, 5, 15) === 'fogged');
check('the last house is the finale', houseState(15, 5, 15) === 'finale-fogged');
check('finale becomes next when 14 are cleared', houseState(15, 14, 15) === 'finale-next');
check('finale is revealed when the block is done', houseState(15, 15, 15) === 'finale-revealed');

{
  const { houses } = layoutBlock({ maps: 15, cleared: 0, width: 440, height: 200 });
  check('a fresh block has nothing revealed', houses.every((house) => !house.state.endsWith('revealed')));
  check('and house 1 is next', houses[0].state === 'next');
}

{
  const { houses } = layoutBlock({ maps: 15, cleared: 7, width: 440, height: 200 });
  const revealed = houses.filter((house) => house.state.endsWith('revealed')).length;
  const next = houses.filter((house) => house.state.endsWith('next'));
  check('revealed count equals cleared', revealed === 7);
  check('exactly one house is next', next.length === 1 && next[0].index === 8);
  check('one house exists per map', houses.length === 15);
}

{
  const width = 440;
  const height = 200;
  const x0 = 20;
  const y0 = 30;
  const layout = layoutBlock({ maps: 15, cleared: 4, width, height, x0, y0 });
  const inside = layout.houses.every((house) => (
    house.x - house.w / 2 >= x0
    && house.x + house.w / 2 <= x0 + width
    && house.y - house.h / 2 >= y0
    && house.y + house.h / 2 <= y0 + height
  ));
  check('15 maps use the prototyped 5 by 3 neighborhood', layout.columns === 5 && layout.rows === 3);
  check('every floor plan stays inside the map card', inside);
  check('map order snakes back across the middle row',
    layout.houses[5].col === 4 && layout.houses[9].col === 0);
  check('mini mazes preserve the real 16 by 35 aspect',
    layout.houses.every((house) => Math.abs(house.w / house.h - 16 / 35) < 1e-9));
}

{
  const over = layoutBlock({ maps: 15, cleared: 40, width: 440, height: 200 });
  const under = layoutBlock({ maps: 15, cleared: -3, width: 440, height: 200 });
  check('out-of-range progress clamps at both ends',
    over.houses.every((house) => house.state.endsWith('revealed')) && under.houses[0].state === 'next');
}

{
  const layout = layoutBlock({ maps: 7, cleared: 6, width: 300, height: 160 });
  check('a 7-map block reflows and still marks its finale',
    layout.columns === 4 && layout.rows === 2 && layout.houses[6].state === 'finale-next');
}

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
