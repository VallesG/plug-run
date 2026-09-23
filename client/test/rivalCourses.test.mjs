// Fixed Rival course pool: identity, reachability, determinism and variety.
//
// Recorded opponents are only comparable if the seven houses they raced are
// the seven houses the player gets. Everything below is what has to hold for
// that promise before a single bot recording is trusted. The maze generator
// is imported directly (it has no Phaser dependency) so the proof runs on the
// real generator, not a stand-in.
//
// Two fingerprints pin the geometry. The original seven courses (49 houses)
// must stay byte-identical forever: every recording on them depends on it.
// The fourteen designed courses (98 houses) are pinned too: changing a design
// or the designed generator changes those houses and retires their
// recordings, so it has to be a deliberate act that updates the pin.
import { createHash } from 'node:crypto';
import {
  RIVAL_HOUSES, RIVAL_RULES_VERSION, RIVAL_COURSE_POOL, RIVAL_COURSE_POOL_DOMAIN,
  rivalHash, rivalSlug, rivalCourse, rivalPoolCourse, rivalPoolEntry, rivalPoolEntryBySeed,
  enabledRivalCourses, nextRivalSlot, rivalPathSteps, rivalHouseMazeOptions, rivalHouseDesign, rivalSessionPocket
} from '../src/logic/rivals.js';
import { RIVAL_COURSE_DESIGNS } from '../src/logic/rivalCourseDesigns.js';
import { generateSquareMaze, judgeDesignedHouse } from '../src/utils/mazeGenerator.js';
import { createSeededRNG } from '../src/utils/seededRandom.js';
import { analyzeHouse, houseFingerprint } from '../src/logic/rivalCourseAnalysis.js';

let passed = 0;
function check(name, value) { if (!value) throw new Error(name); passed++; }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const quiet = (fn) => { const l = console.log, w = console.warn; console.log = () => {}; console.warn = () => {}; try { return fn(); } finally { console.log = l; console.warn = w; } };

// --- identity: the handoff table, byte for byte -------------------------
const ORIGINAL = [
  [1, 'Low End Rush', 2722422571], [2, 'Copper Climb', 2917822448], [3, 'Freight Run', 1245351574],
  [4, 'Afterglow Mile', 2476136539], [5, 'Switchyard Seven', 2143714553], [6, 'Lastlight Loop', 2077357177],
  [7, 'Blacktop Crown', 2334749748]
];
const DESIGNED = [
  [8, 'Canal Street', 2222013742], [9, 'Rooftop Relay', 2425999850], [10, 'Market Square', 2192743687],
  [11, 'Tunnel Nine', 1463392172], [12, 'Crosstown Loop', 2134477327], [13, 'Dockside Drop', 3741482466],
  [14, 'Brickyard Courts', 3233406759], [15, 'Grid Iron', 2004320439], [16, 'Ember Alley', 1710778652],
  [17, 'Neon Terrace', 3768736447], [18, 'Undercroft', 3032893508], [19, 'Harbor Lights', 247653485],
  [20, 'Switchback Stairs', 949173954], [21, 'Last Call Heights', 4051534186]
];
const TABLE = [...ORIGINAL, ...DESIGNED];
check('twenty-one courses in the pool', RIVAL_COURSE_POOL.length === 21);
check('pool frozen', Object.isFrozen(RIVAL_COURSE_POOL) && RIVAL_COURSE_POOL.every(Object.isFrozen));
TABLE.forEach(([slot, name, seed], i) => {
  const c = RIVAL_COURSE_POOL[i];
  check('slot ' + slot + ' ordered', c.slot === slot);
  check('slot ' + slot + ' named ' + name, c.name === name);
  check('slot ' + slot + ' seed pinned', c.seed === seed);
  check('slot ' + slot + ' seed derives from slug', rivalHash(RIVAL_COURSE_POOL_DOMAIN + rivalSlug(name)) === seed);
  check('slot ' + slot + ' courseID matches course identity', c.courseID === rivalCourse(seed).id && c.courseID === 'rivals-v1-' + seed);
  check('slot ' + slot + ' carries rules version', c.rulesVersion === RIVAL_RULES_VERSION);
  check('slot ' + slot + ' enabled', c.enabled === true);
  check('slot ' + slot + (slot <= 7 ? ' is an original course' : ' is designed'), (slot > 7) === (c.designed === true));
});
check('every designed slot has a design', DESIGNED.every(([, name]) => RIVAL_COURSE_DESIGNS[rivalSlug(name)]));
check('every design is in the pool', Object.keys(RIVAL_COURSE_DESIGNS).every((slug) => RIVAL_COURSE_POOL.some((c) => c.slug === slug)));
check('slug normalises case and spaces', rivalSlug('  Low  End Rush ') === 'low-end-rush');
check('no duplicate root seeds', new Set(RIVAL_COURSE_POOL.map(c => c.seed)).size === 21);
check('no duplicate course IDs', new Set(RIVAL_COURSE_POOL.map(c => c.courseID)).size === 21);
check('no duplicate names', new Set(RIVAL_COURSE_POOL.map(c => c.name)).size === 21);
check('pool does not use daily seed arithmetic', !RIVAL_COURSE_POOL_DOMAIN.includes('route'));

// --- selection policy ----------------------------------------------------
check('first race starts at slot 1', nextRivalSlot(null) === 1 && nextRivalSlot(undefined) === 1);
check('new race rotates forward', nextRivalSlot(1) === 2 && nextRivalSlot(7) === 8 && nextRivalSlot(20) === 21);
check('new race wraps', nextRivalSlot(21) === 1);
check('unknown slot restarts rotation', nextRivalSlot(42) === 1);
const withHole = RIVAL_COURSE_POOL.map(c => c.slot === 3 ? { ...c, enabled: false } : c);
check('disabled slot skipped', nextRivalSlot(2, withHole) === 4);
check('disabled slot not served', rivalPoolEntry(3, withHole) === null && rivalPoolCourse(3, withHole) === null);
check('enabled list excludes hole', enabledRivalCourses(withHole).length === 20);
check('empty pool yields no slot', nextRivalSlot(1, []) === null);
check('seed lookup finds pool entry', rivalPoolEntryBySeed(1245351574).slot === 3 && rivalPoolEntryBySeed(4051534186).slot === 21);
check('seed lookup rejects strangers', rivalPoolEntryBySeed(12345) === null);
const c3 = rivalPoolCourse(3);
check('pool course keeps slot and name', c3.slot === 3 && c3.name === 'Freight Run');
check('an original pool course is the plain course plus labels', same({ ...c3, slot: undefined, name: undefined }, { ...rivalCourse(1245351574), slot: undefined, name: undefined }));
check('an original course has no layouts', !('layouts' in c3) && !c3.designed);
const c12 = rivalPoolCourse(12);
check('a designed pool course is its bare-seed course plus labels', same({ ...c12, slot: undefined, name: undefined }, { ...rivalCourse(c12.seed), slot: undefined, name: undefined }));
check('a designed course carries a layout per house', c12.designed && c12.layouts.length === RIVAL_HOUSES && c12.scales.length === RIVAL_HOUSES);

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
  const o = rivalHouseMazeOptions(course, i);
  const arena = quiet(() => generateSquareMaze(o.cols, o.rows, {
    rng: createSeededRNG(houseSeed), role: 'runner', clusterScale: o.clusterScale, layout: o.layout
  }));
  // Mirrors BaseGameScene: the Rivals defender weapon is the first
  // gameplayRNG draw (seed ^ 0xABCDEF01).
  const weapon = ['pistol', 'doublebarrel', 'rifle'][Math.floor(createSeededRNG(houseSeed ^ 0xABCDEF01)() * 3)];
  return { arena, weapon };
}
const allHouseSeeds = [];
const weapons = {};
const originalHash = createHash('sha256'), designedHash = createHash('sha256');
const fingerprints = new Set();
const designedMetrics = [];
let intentional = 0;
for (const entry of RIVAL_COURSE_POOL) {
  const course = rivalPoolCourse(entry.slot);
  check(entry.name + ': seven houses', course.seeds.length === RIVAL_HOUSES && course.scales.length === RIVAL_HOUSES);
  if (!entry.designed) originalHash.update(JSON.stringify([course.id, course.cols, course.rows, course.seeds, course.scales]));
  allHouseSeeds.push(...course.seeds);
  for (let i = 0; i < RIVAL_HOUSES; i++) {
    const label = entry.name + ' house ' + (i + 1);
    const first = buildHouse(course, i);
    const again = buildHouse(course, i);
    const { grid, spawns, objectives, egress } = first.arena;
    (entry.designed ? designedHash : originalHash).update(JSON.stringify(first.arena));
    const board = entry.designed ? [course.cols, course.rows] : [16, 35];
    check(label + ': ' + board.join('x') + ' grid', grid.length === board[1] && grid.every(r => r.length === board[0]));
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
    check(label + ': defender weapon stable', first.weapon === again.weapon);
    weapons[first.weapon] = (weapons[first.weapon] || 0) + 1;

    // Stash truth: either pocket can be the real one in some match, and one
    // match's answer never depends on which attempt it is.
    const pockets = new Set(Array.from({ length: 64 }, (_, k) => rivalSessionPocket(course.seeds[i], k * 2654435761 >>> 0)));
    check(label + ': both pockets are genuine in some match', pockets.size === 2);
    check(label + ': a match keeps its answer across retries', rivalSessionPocket(course.seeds[i], 777) === rivalSessionPocket(course.seeds[i], 777));

    // A replay knows only the house seed; it must rebuild the same house.
    const d = rivalHouseDesign(course.seeds[i]);
    if (entry.designed) {
      check(label + ': replay lookup finds its layout', d && d.layout === course.layouts[i] && d.cols === course.cols && d.rows === course.rows && d.scale === course.scales[i]);
      const replayed = quiet(() => generateSquareMaze(d.cols, d.rows, { rng: createSeededRNG(course.seeds[i]), role: 'runner', clusterScale: d.scale, layout: d.layout }));
      check(label + ': a replay rebuilds the same house', same(replayed, first.arena));
      check(label + ': passes its own design rules', judgeDesignedHouse(first.arena, course.layouts[i].accept).ok);
      check(label + ': never the emergency centre cross', !first.arena.failed);
      const a = analyzeHouse(first.arena);
      if (course.layouts[i].accept?.intentionalSingleRoute) intentional++;
      else check(label + ': no more than ' + (course.layouts[i].accept?.maxChokes ?? 2) + ' hard chokes', a.chokes <= (course.layouts[i].accept?.maxChokes ?? 2));
      designedMetrics.push({ slot: entry.slot, house: i + 1, kind: course.layouts[i].structure.kind, board: course.cols + 'x' + course.rows, a });
      const fp = houseFingerprint(first.arena);
      check(label + ': a house of its own (no duplicate geometry)', !fingerprints.has(fp));
      fingerprints.add(fp);
    } else {
      check(label + ': an original house has no design', d === null);
    }
  }
}
const ORIGINAL_PIN = '1d60056bb961441aa848798f36a08d1a09a24ec0f20ab74e6724ad3d6d26c835';
const DESIGNED_PIN = 'a14e8f4207d76e8050e2c46c6344dafaa4a619e010eed20948304ade1d5df9f4';
check('the original 49 houses are byte-identical to the recorded bank\'s', originalHash.digest('hex') === ORIGINAL_PIN);
const designedDigest = designedHash.digest('hex');
check('the 98 designed houses match their pin (a design change retires recordings: update the pin on purpose) — got ' + designedDigest, designedDigest === DESIGNED_PIN);
check('147 house seeds, none repeated across the pool', new Set(allHouseSeeds).size === 147);
check('house seeds are not root seeds', !allHouseSeeds.some(s => RIVAL_COURSE_POOL.some(c => c.seed === s)));
check('bank does not pin a single defender weapon', Object.keys(weapons).length >= 2);

// --- variety: fourteen courses, not fourteen seeds ------------------------
const designs = DESIGNED.map(([slot]) => rivalPoolCourse(slot));
check('at least six board sizes among the designed courses', new Set(designs.map((c) => c.cols + 'x' + c.rows)).size >= 6);
check('every structure kind is used', ['lanes', 'bands', 'ring', 'rooms', 'streets', 'pillars', 'none'].every((k) => designedMetrics.some((m) => m.kind === k)));
check('courses differ in character (board + districts)', new Set(designs.map((c) => c.cols + 'x' + c.rows + '/' + [...new Set(c.layouts.map((l) => l.structure.kind))].join(''))).size >= 12);
check('cars exit on every side across the pool', ['N', 'S', 'E', 'W'].every((side) => designedMetrics.some((m) => m.a.carSide === side)));
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const bySlot = (slot, key) => avg(designedMetrics.filter((m) => m.slot === slot).map((m) => key(m.a)));
const density = designs.map((c) => bySlot(c.slot, (a) => a.density));
check('wall density spans open to dense', Math.max(...density) - Math.min(...density) >= 0.07);
const phase = designs.map((c) => bySlot(c.slot, (a) => a.phase));
check('phase shortcuts vary widely between courses', Math.max(...phase) >= 2.5 * Math.min(...phase));
const runs = designs.map((c) => bySlot(c.slot, (a) => a.bestRun));
check('route length varies between courses', Math.max(...runs) - Math.min(...runs) >= 20);
const plug = designs.map((c) => bySlot(c.slot, (a) => Math.min(a.plug.toA ?? 99, a.plug.toB ?? 99)));
check('plug pressure varies (bags near the plug somewhere, far elsewhere)', Math.max(...plug) - Math.min(...plug) >= 5);
check('single-route houses are rare and deliberate', intentional > 0 && intentional <= 2);
check('designed difficulty rises across a course (house 7 denser than house 1 on most courses)',
  designs.filter((c) => {
    const h = designedMetrics.filter((m) => m.slot === c.slot);
    return h[6].a.density >= h[0].a.density;
  }).length >= 10);

console.log(passed + ' rival course assertions passed; defender weapons across the pool: ' + JSON.stringify(weapons));
