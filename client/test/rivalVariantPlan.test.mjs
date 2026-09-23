// The Jev variant plans: every course, every stash answer, unique identities.
//
//   node client/test/rivalVariantPlan.test.mjs
//
// Checks the committed plans in tools/plans/ against what the generator
// promises, and that regenerating them gives the same files (so a plan is
// never hand-edited).
import { readFileSync } from 'node:fs';
import { RIVAL_COURSE_POOL, rivalPoolCourse } from '../src/logic/rivals.js';
import { buildPlan, stashPattern, PATTERNS, PLAN_PROFILES } from '../tools/rivals-variant-plan.mjs';
import { completeCapture, jobKey } from '../tools/rivals-variant-progress.mjs';

let passed = 0;
const check = (name, ok, detail = '') => { if (!ok) throw new Error(name + (detail ? ' — ' + detail : '')); passed++; };

const FILES = { apex: 'jev-apex-v1', 'rival-hard': 'jev-rival-hard-v1', normal: 'jev-v1' };
const allIndices = new Set();
const allSeeds = new Map();
for (const [profile, file] of Object.entries(FILES)) {
  const plan = JSON.parse(readFileSync(new URL('../tools/plans/' + file + '.json', import.meta.url), 'utf8'));
  check(`${profile}: the committed plan is what the generator writes`, JSON.stringify(plan) === JSON.stringify(buildPlan(profile)));
  check(`${profile}: every job names its profile and bank`, plan.every((j) => j.profile === profile && j.bank === PLAN_PROFILES[profile].bank && j.bank === file));
  check(`${profile}: all 21 courses`, new Set(plan.map((j) => j.slot)).size === RIVAL_COURSE_POOL.length);
  for (const entry of RIVAL_COURSE_POOL) {
    const course = rivalPoolCourse(entry.slot);
    const jobs = plan.filter((j) => j.slot === entry.slot);
    const seeds = jobs.flatMap((j) => j.stashSeeds);
    check(`${profile} ${entry.name}: 128 races`, seeds.length === PATTERNS);
    check(`${profile} ${entry.name}: every seven-house stash pattern exactly once`, new Set(seeds.map((s) => stashPattern(course, s))).size === PATTERNS);
    check(`${profile} ${entry.name}: every loadout used`, new Set(jobs.map((j) => j.powers)).size === 5);
    for (const s of seeds) {
      const key = entry.slot + '/' + s;
      check(`${profile} ${entry.name}: seed ${s} is used by no other race or profile`, !allSeeds.has(key), allSeeds.get(key));
      allSeeds.set(key, profile);
    }
  }
  for (const j of plan) {
    check(`${profile} job ${j.indexBase}: one planned seed per race`, j.stashSeeds.length === j.runs && j.runs >= 1 && j.runs <= 8);
    check(`${profile} job ${j.indexBase}: seeds are uint32`, j.stashSeeds.every((s) => Number.isInteger(s) && s >= 0 && s <= 0xffffffff));
    for (let k = 0; k < j.runs; k++) {
      check(`${profile}: opponent index ${j.indexBase + k} unique across every plan`, !allIndices.has(j.indexBase + k));
      allIndices.add(j.indexBase + k);
    }
    check(`${profile}: indices stay clear of tools/rivals-plan.mjs (starts at 200)`, j.indexBase >= 100000);
  }
  // A batch cut short still spreads over every course: the first 21 jobs are one per course.
  check(`${profile}: jobs round-robin across courses`, new Set(plan.slice(0, RIVAL_COURSE_POOL.length).map((j) => j.slot)).size === RIVAL_COURSE_POOL.length);
  if (profile === 'normal') check('normal keeps balanced routing and never stacks phase with dash',
    plan.every(j => j.style === 'balanced' && !(j.powers.includes('phase') && j.powers.includes('dash'))));
}
check('three plans, 8064 races', allIndices.size === 3 * RIVAL_COURSE_POOL.length * PATTERNS);

const sampleJob = buildPlan('normal')[0];
const sampleCapture = { tool: 'rivals-record/1', done: true, aborted: null, job: sampleJob,
  races: Array.from({ length: sampleJob.runs }, () => ({ ok: true })),
  jev: { route: 'typesafe-direct', report: { budgetStopped: null }, relay: { ok: 20 } } };
check('complete planned capture is resumable', completeCapture(sampleCapture, sampleJob));
check('a failed race is not complete', !completeCapture({ ...sampleCapture,
  races: [{ ok: false }, ...sampleCapture.races.slice(1)] }, sampleJob));
check('a partial job is not complete', !completeCapture({ ...sampleCapture,
  races: sampleCapture.races.slice(1) }, sampleJob));
check('a budget-stopped Jev job is not complete', !completeCapture({ ...sampleCapture,
  jev: { ...sampleCapture.jev, report: { budgetStopped: 'requests' } } }, sampleJob));
check('a different stash plan cannot be mistaken for this job',
  jobKey({ ...sampleJob, stashSeeds: sampleJob.stashSeeds.slice().reverse() }) !== jobKey(sampleJob));

// The recorder and the harness carry the planned seeds through.
const recorder = readFileSync(new URL('../tools/rivals-record.mjs', import.meta.url), 'utf8');
check('the recorder passes a job\'s stash seeds to the page', /stashSeeds: job\.stashSeeds\.join\(','\)/.test(recorder));
check('the recorder accepts the three built Jev profiles and rejects unknown ones', recorder.includes("['apex', 'rival', 'rival-hard', 'normal'].includes(OPTIONS.jevProfileAsked)"));
const harness = readFileSync(new URL('../src/controllers/installBotDriver.js', import.meta.url), 'utf8');
check('the harness reads stashSeeds and hands race N its seed', harness.includes("p.get('stashSeeds')") && harness.includes('rec.stashSeeds[store.races.length'));
const scene = readFileSync(new URL('../src/scenes/BaseGameScene.js', import.meta.url), 'utf8');
check('the scene creates the match on the planned seed', scene.includes('stashSeed: initData?.rivalStashSeed'));

console.log(`rival variant plans: ${passed} assertions passed`);
