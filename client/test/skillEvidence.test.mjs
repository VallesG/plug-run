// Campaign timing evidence: what is recorded, what is missing, and the rule
// that a gap is never a zero.
import {
  SKILL_EVIDENCE_VERSION, SKILL_MAX_OBSERVATIONS, DUAL_DEFENDER_HOUSE, CAMPAIGN_HOUSES,
  campaignHouseScale, comparableScale, createSkillEvidence, recordHouseObservation,
  skillCoverage, skillSamples, median
} from '../src/logic/skillEvidence.js';
import { rivalCourse } from '../src/logic/rivals.js';

let passed = 0;
function check(name, ok) { if (!ok) throw new Error(name); passed++; }

// The calibration bridge only holds if the two scale tables really agree.
const course = rivalCourse(1);
check('campaign and rivals share the early difficulty curve',
  [1, 2, 3, 4].every(h => campaignHouseScale(h) === course.scales[h - 1]));
check('late campaign houses match the late rivals houses',
  [5, 9, 14].every(h => campaignHouseScale(h) === 1) && [5, 6, 7].every(h => course.scales[h - 1] === 1));
check('every rivals scale has a campaign counterpart',
  course.scales.every(s => comparableScale(s) !== null));
check('an unknown scale is not comparable', comparableScale(0.42) === null && comparableScale(NaN) === null);

let ev = createSkillEvidence();
check('a new account has no evidence', ev.version === SKILL_EVIDENCE_VERSION && ev.observations.length === 0);
check('garbage in, empty out',
  createSkillEvidence(null).observations.length === 0 &&
  createSkillEvidence({ observations: 'no' }).observations.length === 0 &&
  createSkillEvidence({ observations: [null, {}, { house: 99, block: 1, activeMs: 1000 }] }).observations.length === 0);

const obs = (house, over = {}) => ({ block: 1, house, activeMs: 20_000, totalActiveMs: 20_000, attempts: 1, deaths: 0, hits: 0, at: 1, ...over });
ev = recordHouseObservation(ev, obs(1)).state;
check('a cleared house is recorded', ev.observations.length === 1 && ev.observations[0].activeMs === 20_000);
check('its scale comes from the house', ev.observations[0].scale === campaignHouseScale(1));
check('the same house is not recorded twice', recordHouseObservation(ev, obs(1, { activeMs: 5000 })).applied === false);
check('an implausible duration is refused',
  recordHouseObservation(ev, obs(2, { activeMs: 10 })).applied === false &&
  recordHouseObservation(ev, obs(2, { activeMs: 4_000_000 })).applied === false &&
  recordHouseObservation(ev, obs(2, { activeMs: -1 })).applied === false);
check('a house outside the block is refused', recordHouseObservation(ev, obs(16)).applied === false);
check('a total below the winning attempt is corrected up',
  recordHouseObservation(ev, obs(2, { activeMs: 30_000, totalActiveMs: 5_000 })).state
    .observations.find(o => o.house === 2).totalActiveMs === 30_000);
check('retries make the total exceed the clear',
  recordHouseObservation(ev, obs(3, { activeMs: 20_000, totalActiveMs: 65_000, attempts: 3, deaths: 2 })).state
    .observations.find(o => o.house === 3).totalActiveMs === 65_000);

// Coverage is the honest part: it never fills a gap.
let partial = createSkillEvidence();
for (const h of [1, 2, 3, 4, 5]) partial = recordHouseObservation(partial, obs(h)).state;
let cov = skillCoverage(partial);
check('coverage counts what exists', cov.observations === 5 && cov.blocksSeen === 1);
check('an unfinished block is not a completed block', cov.blocksCompleted === 0);
check('coverage states what three blocks would be', cov.expected === CAMPAIGN_HOUSES * 3);
check('coverage never invents the missing houses', cov.blocks[0].houses === 5);

let full = createSkillEvidence();
for (let block = 1; block <= 3; block++) {
  for (let h = 1; h <= CAMPAIGN_HOUSES; h++) full = recordHouseObservation(full, obs(h, { block })).state;
}
cov = skillCoverage(full);
check('three complete blocks are counted', cov.blocksCompleted === 3 && cov.observations === 45);
check('house fifteen is excluded from comparison', cov.comparable === 42);
check('a legacy save with no evidence reports zero blocks, not three',
  skillCoverage(createSkillEvidence()).blocksCompleted === 0);

// Samples group by the scale they were measured at.
let mixed = createSkillEvidence();
mixed = recordHouseObservation(mixed, obs(1, { activeMs: 10_000 })).state;      // scale 0.6
mixed = recordHouseObservation(mixed, obs(5, { activeMs: 30_000 })).state;      // scale 1
mixed = recordHouseObservation(mixed, obs(6, { activeMs: 40_000 })).state;      // scale 1
mixed = recordHouseObservation(mixed, obs(15, { activeMs: 90_000 })).state;     // excluded
const s = skillSamples(mixed);
check('samples split by scale', Object.keys(s.byScale).sort().join() === '0.6,1');
check('the dense group takes its own median', s.byScale[1].clearMs === 35_000 && s.byScale[1].houses === 2);
check('the open house stays in its own group', s.byScale[0.6].clearMs === 10_000);
check('the dual-defender house never appears',
  s.houses === 3 && !Object.values(s.byScale).some(g => g.clearMs === 90_000));
check('empty evidence yields no numbers to compare',
  skillSamples(createSkillEvidence()).clearMs === null && Object.keys(skillSamples(createSkillEvidence()).byScale).length === 0);
check('median handles both parities and emptiness',
  median([3, 1, 2]) === 2 && median([4, 2]) === 3 && median([]) === null && median([NaN]) === null);

// The record stays bounded without forgetting recent blocks.
let long = createSkillEvidence();
for (let block = 1; block <= 12; block++) {
  for (let h = 1; h <= CAMPAIGN_HOUSES; h++) long = recordHouseObservation(long, obs(h, { block })).state;
}
check('the record is bounded', long.observations.length === SKILL_MAX_OBSERVATIONS);
check('the newest blocks survive', long.observations.at(-1).block === 12);
check('round-trip through JSON survives',
  createSkillEvidence(JSON.parse(JSON.stringify(long))).observations.length === SKILL_MAX_OBSERVATIONS);
check('the dual-defender house number is the one the game uses', DUAL_DEFENDER_HOUSE === 15);
console.log(passed + ' skill evidence assertions passed');
