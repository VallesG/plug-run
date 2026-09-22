// Rivals retries reroll which stash is genuine — deterministically.
//
//   node client/test/rivalStashReroll.test.mjs
//
// A retry keeps the house (same seed, same layout) but not the answer. It
// used to be one draw per house seed, so every attempt at a house had the
// genuine stash in the same pocket: on Low End Rush house 4 the bunk was the
// same bag on all 59 attempts of a paid run. Now attempt k takes the k-th
// draw of the house's stash stream (rivalGenuinePocket), which captures and
// replays reproduce from the (houseSeed, attempt) every segment carries.

import { readFileSync } from 'node:fs';
import { rivalGenuinePocket, rivalSessionPocket, newRivalStashSeed, newRivalRace, rivalRecordMatchesStashes, randomRivalSlot, rivalUpcomingAttempt, rivalPoolCourse, RIVAL_COURSE_POOL, RIVAL_HOUSES } from '../src/logic/rivals.js';
import { createSeededRNG } from '../src/utils/seededRandom.js';
import { generateSquareMaze } from '../src/utils/mazeGenerator.js';
import { beginRaceCapture, beginAttemptCapture, tickAttemptCapture, endAttemptCapture } from '../src/controllers/RivalReplayCapture.js';
import { validateReplaySegment } from '../src/logic/rivalReplay.js';

let passed = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) passed++;
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

const houseSeeds = RIVAL_COURSE_POOL.flatMap((e) => rivalPoolCourse(e.slot).seeds);

// 1. Attempt 1 is exactly the old single draw, for every house in the pool:
//    the simulated pace, the course tests and the first attempt of every
//    shipped recording are unchanged.
for (const seed of houseSeeds) {
  const legacy = createSeededRNG((seed ^ 0xC0FFEE) | 0)() < 0.5 ? 0 : 1;
  check('attempt 1 matches the legacy assignment for house seed ' + seed, rivalGenuinePocket(seed, 1) === legacy);
}
check('attempt defaults to 1', rivalGenuinePocket(houseSeeds[0]) === rivalGenuinePocket(houseSeeds[0], 1));
check('a junk attempt index is treated as 1',
  [0, -3, NaN, undefined, 'x'].every((a) => rivalGenuinePocket(houseSeeds[3], a) === rivalGenuinePocket(houseSeeds[3], 1)));

// 2. Across many attempts both pockets are genuine, for EVERY house; the
//    split is fair overall; and nothing forces alternation — repeats happen.
const ATTEMPTS = 200;
let ones = 0, total = 0, repeats = 0, pairs = 0, housesWithBoth = 0, housesWithRepeat = 0;
for (const seed of houseSeeds) {
  const seq = Array.from({ length: ATTEMPTS }, (_, i) => rivalGenuinePocket(seed, i + 1));
  const both = seq.includes(0) && seq.includes(1);
  if (both) housesWithBoth++;
  check('house ' + seed + ': both pockets are genuine within 200 attempts', both);
  const firstDiff = seq.findIndex((p) => p !== seq[0]);
  check('house ' + seed + ': the other pocket turns up within 12 attempts', firstDiff > 0 && firstDiff <= 12, String(firstDiff));
  let rep = 0;
  for (let i = 1; i < seq.length; i++) { pairs++; if (seq[i] === seq[i - 1]) { repeats++; rep++; } }
  if (rep > 0) housesWithRepeat++;
  ones += seq.reduce((a, b) => a + b, 0); total += seq.length;
  // Determinism: the same (seed, attempt) always answers the same.
  check('house ' + seed + ': recomputing gives the same sequence',
    seq.every((p, i) => p === rivalGenuinePocket(seed, i + 1)));
}
check('every one of the 49 pool houses rerolls', housesWithBoth === houseSeeds.length && houseSeeds.length === 49);
check('the split is fair overall (45-55% secondary pocket)', ones / total > 0.45 && ones / total < 0.55, (ones / total).toFixed(3));
check('not forced alternation: consecutive repeats happen (35-65% of steps)',
  repeats / pairs > 0.35 && repeats / pairs < 0.65, (repeats / pairs).toFixed(3));
check('and on every house', housesWithRepeat === houseSeeds.length);

// 3. The attempt index the house is built for is the one the capture stamps.
check('no race: attempt 1', rivalUpcomingAttempt(null, 4) === 1);
check('no capture yet (countdown of house 1): attempt 1', rivalUpcomingAttempt({}, 1) === 1);
check('after 3 attempts at house 4: attempt 4', rivalUpcomingAttempt({ capture: { houseAttempts: { 4: 3 } } }, 4) === 4);
check('another house is counted separately', rivalUpcomingAttempt({ capture: { houseAttempts: { 4: 3 } } }, 5) === 1);

// 4. The scene builds the house with exactly this assignment in Rivals, and
//    keeps the legacy per-seed draw everywhere else.
{
  const src = readFileSync(new URL('../src/scenes/BaseGameScene.js', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('  makeObjectives(stashCell, extractCell){'), src.indexOf('    // Spawn visually identical packages'));
  check('makeObjectives uses the match stash seed for Rivals',
    /rivalSessionPocket\(this\.seed,\s*this\.rivalRace\?\.stashSeed/.test(body));
  check('and the legacy draw otherwise', body.includes("makeRng((this.seed ^ 0xC0FFEE) | 0)() < 0.5"));
}

// 5. REPLAY ROUND TRIP on the real Low End Rush house 4 layout. Each attempt
//    is built the way makeObjectives builds it, run through the real capture
//    pipeline (sometimes taking the bunk first, sometimes the genuine bag),
//    and sealed. The recorded segment alone — houseSeed and attempt — must
//    recreate the assignment the board had, and its pickup/bunk events must
//    agree with it.
{
  const course = rivalPoolCourse(1);
  const HOUSE = 4;
  const houseSeed = course.seeds[HOUSE - 1];
  const arena = generateSquareMaze(course.cols, course.rows, {
    rng: createSeededRNG(houseSeed), role: 'runner', clusterScale: course.scales[HOUSE - 1]
  });
  const CELL = 20;
  const world = (c) => ({ x: c.x * CELL + CELL / 2, y: c.y * CELL + CELL / 2 });
  const race = { course, powers: ['phase', 'dash'], startedAt: 0, clearTimes: [1, 2, 3] };
  beginRaceCapture(race);

  const errors = [];
  const origErr = console.error; console.error = (...a) => errors.push(a.join(' '));
  let clock = 1000;
  const boards = [];
  for (let n = 0; n < 24; n++) {
    // --- build the house as makeObjectives does ---
    const attempt = rivalUpcomingAttempt(race, HOUSE);
    const genuine = rivalGenuinePocket(houseSeed, attempt);
    const pockets = [arena.objectives.stash, arena.objectives.extract];
    const scene = {
      pveRound: HOUSE, seed: houseSeed, cols: course.cols, rows: course.rows, cell: CELL, pad: { x: 0, y: 0 },
      stashCell: pockets[0], extractCell: pockets[1], egress: arena.egress,
      attacker: { ...world(arena.spawns.runner), active: true, visible: true, hp: 1 },
      defender: { ...world(arena.spawns.plug), active: true, visible: true },
      stash: { ...world(pockets[genuine]), active: true, visible: true },
      bunkStash: { ...world(pockets[1 - genuine]), active: true, visible: true },
      runnerPowersSelected: ['phase', 'dash'], runnerPowersConsumed: [false, false], hasStash: false
    };
    boards.push({ attempt, genuine });
    beginAttemptCapture(scene, race, clock);
    // --- play it: bunk first on odd n, then the genuine bag ---
    clock += 700; tickAttemptCapture(scene, race, clock);
    if (n % 2) { scene.bunkStash._fading = true; clock += 700; tickAttemptCapture(scene, race, clock); }
    scene.hasStash = true; clock += 700; tickAttemptCapture(scene, race, clock);
    endAttemptCapture(scene, race, n === 23 ? 'extracted' : 'caught', clock += 700);
  }
  console.error = origErr;

  const segs = race.capture.segments;
  check('24 attempts captured, numbered 1..24', segs.length === 24 && segs.every((s, i) => s.attempt === i + 1));
  check('no stash-assignment mismatch reported by the capture', errors.length === 0, errors[0]);
  for (const seg of segs) {
    const derived = rivalGenuinePocket(seg.houseSeed, seg.attempt);
    const pickup = seg.events.find((e) => e.k === 'pickup');
    const bunk = seg.events.find((e) => e.k === 'bunk');
    check(`attempt ${seg.attempt}: the recorded segment recreates the board's assignment`,
      derived === boards[seg.attempt - 1].genuine);
    check(`attempt ${seg.attempt}: the pickup event names the derived pocket`, pickup && pickup.i === derived);
    if (bunk) check(`attempt ${seg.attempt}: the bunk event names the other pocket`, bunk.i === 1 - derived);
    check(`attempt ${seg.attempt}: segment still validates`, validateReplaySegment(seg).ok === true,
      JSON.stringify(validateReplaySegment(seg)).slice(0, 120));
    check(`attempt ${seg.attempt}: the genuine pocket is still not stored on the segment`,
      !('real' in seg) && !('genuine' in seg) && !('realAtPrimary' in seg));
  }
  // Anti-camp can move a camped bag to a random floor cell mid-attempt
  // (BaseGameScene: randomFloorCellFarFrom). Events still name the bag by the
  // pocket it started in: here both bags are moved next to each other's
  // pocket before they are taken, and nothing is mislabelled.
  {
    const attempt = rivalUpcomingAttempt(race, HOUSE);
    const genuine = rivalGenuinePocket(houseSeed, attempt);
    const pockets = [arena.objectives.stash, arena.objectives.extract];
    const scene = {
      pveRound: HOUSE, seed: houseSeed, cols: course.cols, rows: course.rows, cell: CELL, pad: { x: 0, y: 0 },
      stashCell: pockets[0], extractCell: pockets[1], egress: arena.egress,
      attacker: { ...world(arena.spawns.runner), active: true, visible: true, hp: 1 },
      stash: { ...world(pockets[genuine]), active: true, visible: true },
      bunkStash: { ...world(pockets[1 - genuine]), active: true, visible: true },
      runnerPowersSelected: ['phase', 'dash'], runnerPowersConsumed: [false, false], hasStash: false
    };
    beginAttemptCapture(scene, race, clock += 100);
    Object.assign(scene.stash, world(pockets[1 - genuine]));
    Object.assign(scene.bunkStash, world(pockets[genuine]));
    scene.bunkStash._fading = true; tickAttemptCapture(scene, race, clock += 700);
    scene.hasStash = true; tickAttemptCapture(scene, race, clock += 700);
    endAttemptCapture(scene, race, 'caught', clock += 700);
    const seg = race.capture.segments.at(-1);
    const ev = (k) => seg.events.find((e) => e.k === k);
    check('a relocated real bag is still recorded as the genuine pocket', ev('pickup')?.i === genuine, JSON.stringify(seg.events));
    check('a relocated bunk is still recorded as the other pocket', ev('bunk')?.i === 1 - genuine);
  }

  // And the guard is real: a board built the OLD way (one draw per seed) on
  // an attempt where the reroll differs is reported, not silently recorded.
  {
    const attempt = rivalUpcomingAttempt(race, HOUSE);
    let a = attempt;
    while (rivalGenuinePocket(houseSeed, a) === rivalGenuinePocket(houseSeed, 1)) a++;
    race.capture.houseAttempts[HOUSE] = a - 1;
    const legacy = rivalGenuinePocket(houseSeed, 1);
    const pockets = [arena.objectives.stash, arena.objectives.extract];
    const stale = {
      pveRound: HOUSE, seed: houseSeed, cols: course.cols, rows: course.rows, cell: CELL, pad: { x: 0, y: 0 },
      stashCell: pockets[0], extractCell: pockets[1], egress: arena.egress,
      attacker: { ...world(arena.spawns.runner), active: true, visible: true, hp: 1 },
      stash: { ...world(pockets[legacy]), active: true, visible: true },
      bunkStash: { ...world(pockets[1 - legacy]), active: true, visible: true },
      runnerPowersSelected: ['phase', 'dash'], runnerPowersConsumed: [false, false]
    };
    const seen = [];
    const e0 = console.error; console.error = (...x) => seen.push(x.join(' '));
    beginAttemptCapture(stale, race, clock += 100);
    endAttemptCapture(stale, race, 'caught', clock += 700);
    console.error = e0;
    check('a board with the pre-fix assignment is reported as a mismatch',
      seen.some((m) => /stash assignment mismatch/.test(m)), seen[0]);
  }

  const genuines = segs.map((s) => rivalGenuinePocket(s.houseSeed, s.attempt));
  check('on house 4, both pockets were genuine across the 24 retries', genuines.includes(0) && genuines.includes(1),
    genuines.join(''));
  check('the old behaviour is gone: not every attempt has the same genuine pocket', new Set(genuines).size === 2);
}

// Legacy tests above preserve old replay decoding. Live matches now keep
// their answer through retries and roll only when a fresh match is created.
{
  const course = rivalPoolCourse(5);
  const times = Array.from({ length: 7 }, (_, i) => (i + 1) * 10000);
  const race = newRivalRace(course, times, { stashSeed: newRivalStashSeed(() => 0.25) });
  const before = course.seeds.map(s => rivalSessionPocket(s, race.stashSeed));
  for (let retry = 0; retry < 30; retry++) {
    race.retries++;
    check('retry keeps every house assignment ' + retry,
      JSON.stringify(before) === JSON.stringify(course.seeds.map(s => rivalSessionPocket(s, race.stashSeed))));
  }
  const patterns = new Set(Array.from({ length: 64 }, (_, seed) => course.seeds.map(s => rivalSessionPocket(s, seed)).join('')));
  check('new matches on the same course produce varied assignments', patterns.size > 20);
  const record = { stashRules: 'match-v1', stashSeed: race.stashSeed };
  check('recorded opponent with matching assignment is eligible', rivalRecordMatchesStashes(record, race));
  let other = 0;
  while (rivalRecordMatchesStashes({ ...record, stashSeed: other }, race)) other++;
  check('different assignment is not a fair opponent', !rivalRecordMatchesStashes({ ...record, stashSeed: other }, race));
  check('legacy per-retry bank cannot impersonate a match recording', !rivalRecordMatchesStashes({}, race));
  check('random course selection can reach all seven slots', new Set(Array.from({ length: 7 }, (_, i) => randomRivalSlot(() => (i + 0.5) / 7))).size === 7);

  // Exercise capture on a real generated house with several deaths. Every
  // segment carries the same session seed and agrees on pickup identity.
  const houseSeed = course.seeds[0];
  const arena = generateSquareMaze(course.cols, course.rows, {
    rng: createSeededRNG(houseSeed), role: 'runner', clusterScale: course.scales[0]
  });
  const pockets = [arena.objectives.stash, arena.objectives.extract];
  const genuine = rivalSessionPocket(houseSeed, race.stashSeed);
  const world = c => ({ x: c.x * 20 + 10, y: c.y * 20 + 10 });
  race.startedAt = 0; race.status = 'racing'; race.powers = ['phase', 'dash'];
  beginRaceCapture(race);
  for (let attempt = 1; attempt <= 4; attempt++) {
    const scene = {
      pveRound: 1, seed: houseSeed, cols: 16, rows: 35, cell: 20, pad: { x: 0, y: 0 },
      stashCell: pockets[0], extractCell: pockets[1], egress: arena.egress,
      attacker: { ...world(arena.spawns.runner), active: true, visible: true, hp: 1 },
      defender: { ...world(arena.spawns.plug), active: true, visible: true },
      stash: { ...world(pockets[genuine]), active: true, visible: true },
      bunkStash: { ...world(pockets[1 - genuine]), active: true, visible: true },
      runnerPowersSelected: ['phase', 'dash'], runnerPowersConsumed: [false, false], hasStash: false
    };
    const t = attempt * 3000;
    beginAttemptCapture(scene, race, t);
    scene.bunkStash._fading = true; tickAttemptCapture(scene, race, t + 500);
    scene.hasStash = true; tickAttemptCapture(scene, race, t + 1000);
    endAttemptCapture(scene, race, 'caught', t + 1500);
    const seg = race.capture.segments.at(-1);
    check('new capture preserves match seed through retry ' + attempt, seg.stashSeed === race.stashSeed);
    check('same pickup pocket through retry ' + attempt, seg.events.find(e => e.k === 'pickup')?.i === genuine);
    check('same bunk pocket through retry ' + attempt, seg.events.find(e => e.k === 'bunk')?.i === 1 - genuine);
    check('match capture validates ' + attempt, validateReplaySegment(seg).ok);
  }
}

console.log('');
if (failures.length) {
  console.log(`rival stash reroll: ${passed} passed, ${failures.length} FAILED`);
  failures.slice(0, 20).forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log(`rival stash reroll: ${passed} assertions passed`);
