// What a block run remembers, and what a contact is therefore allowed to say.
import {
  BLOCK_RUN_VERSION, POWER_IDS, createBlockRun, recordHouseClear, recordBlockDeath,
  recordMissionOutcome, blockRunStats
} from '../src/logic/blockRun.js';
let passed = 0;
function check(name, ok) { if (!ok) throw new Error(name); passed++; }

let run = createBlockRun({}, 1);
check('a fresh run is empty', run.version === BLOCK_RUN_VERSION && run.cleared.length === 0 && run.deaths === 0);
check('garbage in, empty out', createBlockRun(null, 1).cleared.length === 0 && createBlockRun('x', 1).cleared.length === 0);
check('no compliments before a house is cleared', blockRunStats(run, 1).flawless === false && blockRunStats(run, 1).noDeaths === false);

const clear = (state, house, extra = {}) =>
  recordHouseClear(state, 1, { house, hits: 0, deaths: 0, bunk: false, swapped: false, powers: [], ...extra }).state;
run = clear(run, 1); run = clear(run, 2); run = clear(run, 3);
let s = blockRunStats(run, 1);
check('three clean houses is flawless', s.houses === 3 && s.flawless && s.noDeaths && s.cleanBags);
check('a repeated house cannot inflate the run',
  recordHouseClear(run, 1, { house: 2 }).applied === false && blockRunStats(clear(run, 2), 1).houses === 3);
check('house zero and out of range refused',
  recordHouseClear(run, 1, { house: 0 }).applied === false && recordHouseClear(run, 1, { house: 99 }).applied === false);

let hurt = clear(run, 4, { hits: 1 });
check('one bullet ends flawless', blockRunStats(hurt, 1).flawless === false && blockRunStats(hurt, 1).noDeaths === true);
let died = recordBlockDeath(run, 1).state;
check('a death ends both', blockRunStats(died, 1).flawless === false && blockRunStats(died, 1).noDeaths === false);
check('deaths accumulate', blockRunStats(recordBlockDeath(recordBlockDeath(died, 1).state, 1).state, 1).deaths === 3);

let powered = clear(clear(clear(createBlockRun({}, 1), 1, { powers: ['phase', 'dash'] }), 2, { powers: ['phase'] }), 3, { powers: ['decoy'] });
s = blockRunStats(powered, 1);
check('powers are counted per id', s.powers.phase === 2 && s.powers.dash === 1 && s.powers.decoy === 1 && s.powersUsed === 4);
check('the favourite power needs a habit and a clear lead', s.topPower === 'phase');
check('one press is not a habit', blockRunStats(clear(createBlockRun({}, 1), 1, { powers: ['dash'] }), 1).topPower === null);
check('a tie names nobody', blockRunStats(
  clear(clear(createBlockRun({}, 1), 1, { powers: ['dash', 'dash'] }), 2, { powers: ['phase', 'phase'] }), 1).topPower === null);
check('unknown powers are dropped', blockRunStats(clear(createBlockRun({}, 1), 1, { powers: ['laser', 'phase'] }), 1).powersUsed === 1);
check('powers are capped at the two a runner carries',
  blockRunStats(clear(createBlockRun({}, 1), 1, { powers: ['phase', 'dash', 'decoy'] }), 1).powersUsed === 2);

let bagged = clear(clear(createBlockRun({}, 1), 1, { bunk: true }), 2, { bunk: true });
check('bunk grabs are counted', blockRunStats(bagged, 1).bunks === 2 && blockRunStats(bagged, 1).cleanBags === false);
check('spawn swaps are counted', blockRunStats(clear(createBlockRun({}, 1), 1, { swapped: true }), 1).swaps === 1);
check('first-try houses are counted',
  blockRunStats(clear(clear(createBlockRun({}, 1), 1), 2, { deaths: 2 }), 1).firstTryHouses === 1);

// A new block is a new run. Nothing carries over, ever.
check('a different block starts clean', createBlockRun(run, 2).cleared.length === 0 && createBlockRun(run, 2).blockIndex === 2);
check('a stale version starts clean', createBlockRun({ ...run, version: 99 }, 1).cleared.length === 0);
check('round-trip through JSON survives',
  blockRunStats(createBlockRun(JSON.parse(JSON.stringify(powered)), 1), 1).topPower === 'phase');
check('power ids are the three the game ships', POWER_IDS.length === 3 && POWER_IDS.includes('phase'));

// The mission outcome: written once, never rewritten, and it grants nothing.
let job = createBlockRun({}, 1);
check('no outcome before the briefed house', blockRunStats(job, 1).mission === null);
const won = recordMissionOutcome(job, 1, 'win');
check('a win is recorded', won.applied && blockRunStats(won.state, 1).mission === 'win');
check('a later house cannot rewrite it',
  recordMissionOutcome(won.state, 1, 'miss').applied === false
  && blockRunStats(recordMissionOutcome(won.state, 1, 'miss').state, 1).mission === 'win');
check('a miss is recorded too', blockRunStats(recordMissionOutcome(job, 1, 'miss').state, 1).mission === 'miss');
check('nonsense outcomes refused',
  recordMissionOutcome(job, 1, 'maybe').applied === false && recordMissionOutcome(job, 1).applied === false);
check('the outcome survives a reload',
  blockRunStats(createBlockRun(JSON.parse(JSON.stringify(won.state)), 1), 1).mission === 'win');
check('a new block forgets the outcome', createBlockRun(won.state, 2).mission === null);
check('the outcome is not stash, rep or cash',
  Object.keys(blockRunStats(won.state, 1)).every(k => !/rep|cash|credit|stash/i.test(k)));
console.log(passed + ' block run assertions passed');
