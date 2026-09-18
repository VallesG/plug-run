// Fixed Rival course pool: identity, reachability and determinism.
//
// Recorded opponents are only comparable if the seven houses they raced are
// the seven houses the player gets. Everything below is what has to hold for
// that promise before a single bot recording is trusted. The maze generator
// is imported directly (it has no Phaser dependency) so the proof runs on the
// real generator, not a stand-in.
import {
  RIVAL_HOUSES, RIVAL_RULES_VERSION, RIVAL_COURSE_POOL, RIVAL_COURSE_POOL_DOMAIN,
  rivalHash, rivalSlug, rivalCourse, rivalPoolCourse, rivalPoolEntry, rivalPoolEntryBySeed,
  enabledRivalCourses, nextRivalSlot, rivalPathSteps
} from '../src/logic/rivals.js';
import { generateSquareMaze } from '../src/utils/mazeGenerator.js';
import { createSeededRNG } from '../src/utils/seededRandom.js';

let passed = 0;
function check(name, value) { if (!value) throw new Error(name); passed++; }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- identity: the handoff table, byte for byte -------------------------
const HANDOFF = [
  [1, 'Low End Rush', 2722422571], [2, 'Copper Climb', 2917822448], [3, 'Freight Run', 1245351574],
  [4, 'Afterglow Mile', 2476136539], [5, 'Switchyard Seven', 2143714553], [6, 'Lastlight Loop', 2077357177],
  [7, 'Blacktop Crown', 2334749748]
];
check('seven courses in v1 pool', RIVAL_COURSE_POOL.length === 7);
check('pool frozen', Object.isFrozen(RIVAL_COURSE_POOL) && RIVAL_COURSE_POOL.every(Object.isFrozen));
HANDOFF.forEach(([slot, name, seed], i) => {
  const c = RIVAL_COURSE_POOL[i];
  check('slot ' + slot + ' ordered', c.slot === slot);
  check('slot ' + slot + ' named ' + name, c.name === name);
  check('slot ' + slot + ' seed pinned', c.seed === seed);
  check('slot ' + slot + ' seed derives from slug', rivalHash(RIVAL_COURSE_POOL_DOMAIN + rivalSlug(name)) === seed);
  check('slot ' + slot + ' courseID matches course identity', c.courseID === rivalCourse(seed).id && c.courseID === 'rivals-v1-' + seed);
  check('slot ' + slot + ' carries rules version', c.rulesVersion === RIVAL_RULES_VERSION);
  check('slot ' + slot + ' enabled', c.enabled === true);
});
check('slug normalises case and spaces', rivalSlug('  Low  End Rush ') === 'low-end-rush');
check('no duplicate root seeds', new Set(RIVAL_COURSE_POOL.map(c => c.seed)).size === 7);
check('no duplicate course IDs', new Set(RIVAL_COURSE_POOL.map(c => c.courseID)).size === 7);
check('pool does not use daily seed arithmetic', !RIVAL_COURSE_POOL_DOMAIN.includes('route'));

// --- selection policy ----------------------------------------------------
check('first race starts at slot 1', nextRivalSlot(null) === 1 && nextRivalSlot(undefined) === 1);
check('new race rotates forward', nextRivalSlot(1) === 2 && nextRivalSlot(6) === 7);
check('new race wraps', nextRivalSlot(7) === 1);
check('unknown slot restarts rotation', nextRivalSlot(42) === 1);
const withHole = RIVAL_COURSE_POOL.map(c => c.slot === 3 ? { ...c, enabled: false } : c);
check('disabled slot skipped', nextRivalSlot(2, withHole) === 4);
check('disabled slot not served', rivalPoolEntry(3, withHole) === null && rivalPoolCourse(3, withHole) === null);
check('enabled list excludes hole', enabledRivalCourses(withHole).length === 6);
check('empty pool yields no slot', nextRivalSlot(1, []) === null);
check('seed lookup finds pool entry', rivalPoolEntryBySeed(1245351574).slot === 3);
check('seed lookup rejects strangers', rivalPoolEntryBySeed(12345) === null);
const c3 = rivalPoolCourse(3);
check('pool course keeps slot and name', c3.slot === 3 && c3.name === 'Freight Run');
check('pool course is the plain course plus labels', same({ ...c3, slot: undefined, name: undefined }, { ...rivalCourse(1245351574), slot: undefined, name: undefined }));

// --- the scene's RNG and the utility RNG are the same generator ---------
// BaseGameScene keeps a private makeRng copy; rivalSession and this proof use
// createSeededRNG. Both are mulberry32, but only a comparison makes that a
// fact rather than an assumption.
function sceneMakeRng(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
for (const seed of [1, 2722422571, 0xC0FFEE ^ 2917822448]) {
  const a = sceneMakeRng(seed), b = createSeededRNG(seed);
  let equal = true;
  for (let i = 0; i < 2000; i++) if (a() !== b()) { equal = false; break; }
  check('rng parity for seed ' + seed, equal);
}

// --- every house of every course: generated the way BaseGameScene does ---
function buildHouse(course, i) {
  const houseSeed = course.seeds[i];
  const arena = generateSquareMaze(course.cols, course.rows, {
    rng: createSeededRNG(houseSeed), role: 'runner', clusterScale: course.scales[i]
  });
  // Mirrors BaseGameScene: stash assignment from seed ^ 0xC0FFEE, and the
  // Rivals defender weapon is the first gameplayRNG draw (seed ^ 0xABCDEF01).
  const realAtPrimary = createSeededRNG((houseSeed ^ 0xC0FFEE) | 0)() < 0.5;
  const weapon = ['pistol', 'doublebarrel', 'rifle'][Math.floor(createSeededRNG(houseSeed ^ 0xABCDEF01)() * 3)];
  return { arena, realAtPrimary, weapon };
}
const allHouseSeeds = [];
const weapons = {};
for (const entry of RIVAL_COURSE_POOL) {
  const course = rivalPoolCourse(entry.slot);
  check(entry.name + ': seven houses', course.seeds.length === RIVAL_HOUSES && course.scales.length === RIVAL_HOUSES);
  allHouseSeeds.push(...course.seeds);
  for (let i = 0; i < RIVAL_HOUSES; i++) {
    const label = entry.name + ' house ' + (i + 1);
    const first = buildHouse(course, i);
    const again = buildHouse(course, i);
    const { grid, spawns, objectives, egress } = first.arena;
    check(label + ': 16x35 grid', grid.length === 35 && grid.every(r => r.length === 16));
    // The border is not fully sealed: pickDriveway carves the mouth through it.
    check(label + ': driveway entry is floor inside the grid', grid[egress.entry.y]?.[egress.entry.x] === 0);
    const steps = (a, b) => rivalPathSteps(grid, a, b);
    check(label + ': runner reaches primary pocket', Number.isFinite(steps(spawns.runner, objectives.stash)));
    check(label + ': runner reaches secondary pocket', Number.isFinite(steps(spawns.runner, objectives.extract)));
    check(label + ': primary pocket reaches driveway', Number.isFinite(steps(objectives.stash, egress.entry)));
    check(label + ': secondary pocket reaches driveway', Number.isFinite(steps(objectives.extract, egress.entry)));
    check(label + ': defender spawns on floor', grid[spawns.plug.y][spawns.plug.x] === 0);
    check(label + ': pockets distinct', !(objectives.stash.x === objectives.extract.x && objectives.stash.y === objectives.extract.y));
    check(label + ': grid regenerates identically', same(grid, again.arena.grid));
    check(label + ': spawns/objectives/egress regenerate identically',
      same([spawns, objectives, egress], [again.arena.spawns, again.arena.objectives, again.arena.egress]));
    check(label + ': real/bunk stable', first.realAtPrimary === again.realAtPrimary);
    check(label + ': defender weapon stable', first.weapon === again.weapon);
    weapons[first.weapon] = (weapons[first.weapon] || 0) + 1;
  }
}
check('49 house seeds, none repeated across the pool', new Set(allHouseSeeds).size === 49);
check('house seeds are not root seeds', !allHouseSeeds.some(s => RIVAL_COURSE_POOL.some(c => c.seed === s)));
check('bank does not pin a single defender weapon', Object.keys(weapons).length >= 2);
console.log(passed + ' rival course assertions passed; defender weapons across the bank: ' + JSON.stringify(weapons));
