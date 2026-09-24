// Matchmaking: measured benchmarks, measured bands, deterministic pairing,
// the unlock boundary, and every way each of those could quietly cheat.
import {
  RIVAL_UNLOCK_BLOCKS, RIVAL_UNLOCK_STASHES, RIVAL_MIN_OBSERVATIONS,
  recordHouseTimes, recordBenchmark, playerSkill, measuredBands, bandOf,
  chooseCalibratedOpponent, adaptSkill, rivalsUnlocked, rivalsUnlockProgress
} from '../src/logic/rivalSkill.js';
import { skillSamples, createSkillEvidence, recordHouseObservation } from '../src/logic/skillEvidence.js';
import { rivalCourse } from '../src/logic/rivals.js';

let passed = 0;
function check(name, ok) { if (!ok) throw new Error(name); passed++; }
const SCALES = rivalCourse(1).scales;

// --- a recording's per-house times come from its own attempts -------------
const attempts = [
  { house: 1, attempt: 1, startedMs: 0, endedMs: 10_000, outcome: 'extracted', clearMs: 10_000 },
  { house: 2, attempt: 1, startedMs: 10_180, endedMs: 16_180, outcome: 'caught' },
  { house: 2, attempt: 2, startedMs: 16_830, endedMs: 36_830, outcome: 'extracted', clearMs: 36_830 },
  { house: 3, attempt: 1, startedMs: 37_010, endedMs: 67_010, outcome: 'extracted', clearMs: 67_010 },
  { house: 4, attempt: 1, startedMs: 67_190, endedMs: 97_190, outcome: 'extracted', clearMs: 97_190 },
  { house: 5, attempt: 1, startedMs: 97_370, endedMs: 137_370, outcome: 'extracted', clearMs: 137_370 },
  { house: 6, attempt: 1, startedMs: 137_550, endedMs: 187_550, outcome: 'extracted', clearMs: 187_550 },
  { house: 7, attempt: 1, startedMs: 187_730, endedMs: 247_730, outcome: 'extracted', clearMs: 247_730 }
];
const times = recordHouseTimes({ attempts }, SCALES);
check('per-house times are keyed by maze scale', Object.keys(times).sort().join() === '0.6,0.75,0.9,0.95,1');
check('the winning attempt is the one measured', times[0.75].clearMs === 20_000);
check('a failed attempt is not a clear time', times[0.6].clearMs === 10_000 && times[0.6].houses === 1);
check('the three dense houses share a group', times[1].houses === 3 && times[1].clearMs === 50_000);
check('a record with no attempts yields nothing',
  Object.keys(recordHouseTimes({}, SCALES)).length === 0 && Object.keys(recordHouseTimes(null, SCALES)).length === 0);
check('race elapsed time is never used as a house time',
  times[1].clearMs < 247_730);

const bench = recordBenchmark({ attempts }, SCALES);
check('a benchmark is one comparable number', Number.isFinite(bench.clearMs) && bench.houses === 7);
check('a benchmark can be limited to the scales the player has seen',
  recordBenchmark({ attempts }, SCALES, [1]).clearMs === 50_000 &&
  recordBenchmark({ attempts }, SCALES, [1]).houses === 3);
check('asking for a scale the record lacks yields nothing',
  recordBenchmark({ attempts: attempts.slice(0, 1) }, SCALES, [1]) === null);

// --- the player's own number ----------------------------------------------
let ev = createSkillEvidence();
const obs = (block, house, activeMs, over = {}) => ({ block, house, activeMs, totalActiveMs: activeMs, attempts: 1, deaths: 0, hits: 0, at: 1, ...over });
check('no evidence means no estimate, and it says so',
  playerSkill(skillSamples(ev)).clearMs === null && playerSkill(skillSamples(ev)).provisional === true);
check('a missing estimate names its reason', playerSkill(skillSamples(ev)).reason === 'no-timed-houses');
for (let h = 1; h <= 5; h++) ev = recordHouseObservation(ev, obs(1, h, 30_000)).state;
let me = playerSkill(skillSamples(ev));
check('a thin record still estimates, but flags itself',
  me.clearMs === 30_000 && me.provisional === true && me.houses === 5);
for (let h = 6; h <= 14; h++) ev = recordHouseObservation(ev, obs(1, h, 30_000)).state;
me = playerSkill(skillSamples(ev));
check('enough houses makes the estimate confident',
  me.houses >= RIVAL_MIN_OBSERVATIONS && me.provisional === false && me.reason === null);
check('retries and deaths are carried as a second axis', me.retryRate === 0 && me.deathRate === 0);
let sloppy = createSkillEvidence();
for (let h = 1; h <= 10; h++) sloppy = recordHouseObservation(sloppy, obs(1, h, 30_000, { attempts: 3, deaths: 2 })).state;
const sloppySkill = playerSkill(skillSamples(sloppy));
check('a player who dies a lot shows it', sloppySkill.retryRate === 2 && sloppySkill.deathRate === 2);

// --- bands are cut from the bank, not from names --------------------------
const benches = [10, 20, 30, 40, 50, 60, 70, 80, 90].map(s => ({ clearMs: s * 1000 }));
const bands = measuredBands(benches);
check('three bands over a real spread', bands.length === 3);
check('band edges come from the data', bands[0].minMs === 10_000 && bands[2].maxMs === 90_000);
check('bands are labelled by speed, not by difficulty words',
  bands.map(b => b.label).join() === 'fast,middle,steady' &&
  !bands.some(b => /easy|medium|hard/i.test(b.label)));
check('a thin bank is one honest band', measuredBands(benches.slice(0, 4)).length === 1);
check('an empty bank still answers', measuredBands([]).length === 1 && measuredBands([])[0].count === 0 && measuredBands([])[0].minMs === null);
check('a time lands in a band', bandOf(bands, 15_000).index === 0 && bandOf(bands, 85_000).index === 2);
check('an unmeasured time lands nowhere', bandOf(bands, NaN) === null && bandOf([], 1000) === null);

// --- pairing ---------------------------------------------------------------
const pool = [10, 25, 40, 55, 70, 85, 100].map((s, i) => ({ recordingID: 'rec-' + i, benchmark: { clearMs: s * 1000 } }));
check('an empty pool yields nothing', chooseCalibratedOpponent([], {}) === null && chooseCalibratedOpponent(null, {}) === null);
check('a rematch returns the named recording',
  chooseCalibratedOpponent(pool, { recordingID: 'rec-5', targetMs: 10_000 }).recordingID === 'rec-5');
check('an unknown rematch id falls back to the target',
  ['rec-1', 'rec-2', 'rec-0', 'rec-3'].includes(chooseCalibratedOpponent(pool, { recordingID: 'gone', targetMs: 25_000 }).recordingID));
const near = new Set(Array.from({ length: 24 }, (_, i) =>
  chooseCalibratedOpponent(pool, { targetMs: 40_000, salt: 'u/' + i }).recordingID));
// "Near" is defined by measured distance, computed here rather than assumed.
const closest = pool.slice()
  .sort((a, b) => Math.abs(a.benchmark.clearMs - 40_000) - Math.abs(b.benchmark.clearMs - 40_000)
    || (a.recordingID < b.recordingID ? -1 : 1))
  .slice(0, 4).map(c => c.recordingID);
check('pairing stays among the four closest', [...near].every(id => closest.includes(id)));
check('the furthest opponents are never paired', !near.has('rec-6') && !near.has('rec-5'));
check('pairing varies rather than serving one opponent forever', near.size >= 3);
check('the same inputs give the same opponent',
  chooseCalibratedOpponent(pool, { targetMs: 40_000, salt: 'x' }).recordingID ===
  chooseCalibratedOpponent(pool, { targetMs: 40_000, salt: 'x' }).recordingID);
check('a recently raced opponent is set aside',
  chooseCalibratedOpponent(pool, { targetMs: 40_000, salt: 'x', recent: ['rec-2', 'rec-1', 'rec-3'] }).recordingID !== 'rec-2');
check('but a fully raced pool still returns someone',
  !!chooseCalibratedOpponent(pool, { targetMs: 40_000, salt: 'x', recent: pool.map(p => p.recordingID) }));
check('a player faster than the bank gets its fastest',
  chooseCalibratedOpponent(pool, { targetMs: 1, salt: 'x', spread: 1 }).recordingID === 'rec-0');
check('a player slower than the bank gets its slowest',
  chooseCalibratedOpponent(pool, { targetMs: 999_000, salt: 'x', spread: 1 }).recordingID === 'rec-6');
check('no target still picks deterministically',
  chooseCalibratedOpponent(pool, { salt: 'q' }).recordingID === chooseCalibratedOpponent(pool, { salt: 'q' }).recordingID);
check('unbenchmarked candidates are still raceable',
  !!chooseCalibratedOpponent([{ recordingID: 'only' }], { targetMs: 5000, salt: 'z' }));

// --- adaptation moves, but never forces a result --------------------------
check('a win against a faster rival speeds the estimate up',
  adaptSkill(60_000, { opponentMs: 40_000, result: 'win' }) === 55_000);
check('a loss to a slower rival slows it down',
  adaptSkill(40_000, { opponentMs: 60_000, result: 'loss' }) === 45_000);
check('beating a slower rival proves nothing new',
  adaptSkill(40_000, { opponentMs: 60_000, result: 'win' }) === 40_000);
check('losing to a faster rival proves nothing new',
  adaptSkill(60_000, { opponentMs: 40_000, result: 'loss' }) === 60_000);
check('a draw or forfeit moves nothing',
  adaptSkill(50_000, { opponentMs: 10_000, result: 'draw' }) === 50_000 &&
  adaptSkill(50_000, { opponentMs: 10_000, result: 'forfeit' }) === 50_000);
check('one race cannot reclassify a player',
  Math.abs(adaptSkill(100_000, { opponentMs: 0, result: 'win', weight: 5 }) - 100_000) <= 25_000);
check('an unknown estimate stays unknown', adaptSkill(null, { opponentMs: 1, result: 'win' }) === null);

// --- the unlock ------------------------------------------------------------
const cov = blocks => ({ blocksCompleted: blocks });
check('Block Rivals is open from the start', rivalsUnlocked() && rivalsUnlocked(cov(0)) && rivalsUnlocked(null));
check('fifteen is one complete block', RIVAL_UNLOCK_STASHES === RIVAL_UNLOCK_BLOCKS * 15);
check('progress text is short and honest',
  rivalsUnlockProgress(cov(1)).text === '1 of 1 block run' && rivalsUnlockProgress(cov(0)).blocks === 0);
check('progress never overstates', rivalsUnlockProgress(cov(9)).blocks === 1);
check('a legacy stash count shows as progress too', rivalsUnlockProgress(cov(0), { stashes: 15 }).blocks === 1);
console.log(passed + ' rival skill assertions passed');
