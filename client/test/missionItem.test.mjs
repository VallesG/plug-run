// Where the job object lands: reachable, deterministic, out of the way, and
// proved against the real generator on every house of a real block.
import {
  MISSION_ITEM_COLOR, missionItemSeed, placeMissionItem, missionObject, missionSucceeded, MISSION_OBJECTS
} from '../src/logic/missionItem.js';
import { generateSquareMaze } from '../src/utils/mazeGenerator.js';
import { createSeededRNG } from '../src/utils/seededRandom.js';
import { worldHouseSeed, WORLD_HOUSES } from '../src/logic/worldBlocks.js';
import { CONTACTS, activeMissionContact, CONTACT_TARGET_HOUSE, CONTACT_BEATS } from '../src/logic/contacts.js';

let passed = 0;
function check(name, ok) { if (!ok) throw new Error(name); passed++; }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

check('the ring is not stash green and not beacon blue',
  MISSION_ITEM_COLOR !== 0x86efac && MISSION_ITEM_COLOR !== 0x60a5fa);
check('every job contact has an object',
  CONTACTS.filter(c => c.role === 'secondary').every(c => missionObject(c.id)));
check('no primary carries a job object', CONTACTS.filter(c => c.role === 'primary').every(c => !missionObject(c.id)));
check('objects are named distinctly', new Set(Object.values(MISSION_OBJECTS).map(o => o.label)).size === 3);
check('unknown contact has no object', missionObject('switch') === null && missionObject() === null);

// Exactly one house per block carries a job, and only for a chosen gang.
for (const gang of ['crossline', 'iron-row', 'afterlight']) {
  const houses = Array.from({ length: 15 }, (_, i) => i + 1).filter(h => activeMissionContact(gang, h));
  check('one mission house for ' + gang, houses.length === 1 && houses[0] === CONTACT_TARGET_HOUSE);
  check('the job contact owns it ' + gang, activeMissionContact(gang, CONTACT_TARGET_HOUSE).role === 'secondary');
  check('that contact has the object ' + gang, !!missionObject(activeMissionContact(gang, CONTACT_TARGET_HOUSE).id));
}
check('no gang, no job', activeMissionContact(null, CONTACT_TARGET_HOUSE) === null
  && activeMissionContact('nope', CONTACT_TARGET_HOUSE) === null);
check('the mission house is the briefed house',
  CONTACT_BEATS.find(b => b.kind === 'brief').house === CONTACT_TARGET_HOUSE);

check('success needs all three',
  missionSucceeded({ tookItem: true, tookRealStash: true, extracted: true }) === true);
for (const missing of ['tookItem', 'tookRealStash', 'extracted']) {
  const arg = { tookItem: true, tookRealStash: true, extracted: true, [missing]: false };
  check('no success without ' + missing, missionSucceeded(arg) === false);
}
check('nothing succeeds by default', missionSucceeded() === false && missionSucceeded({}) === false);

check('seed domain is its own', missionItemSeed(1, 1, 9) !== 1 && missionItemSeed(1, 1, 9) !== missionItemSeed(1, 1, 8));
check('seed is stable', missionItemSeed(1234, 2, 9) === missionItemSeed(1234, 2, 9));
check('a different block moves the item', missionItemSeed(1234, 2, 9) !== missionItemSeed(1234, 3, 9));

// Walk real houses from the real generator, the way the game builds them.
const scales = [0, 0.6, 0.75, 0.9, 0.95];
function house(blockIndex, houseIndex) {
  const seed = worldHouseSeed(blockIndex, houseIndex, 'runner');
  const arena = generateSquareMaze(16, 35, {
    rng: createSeededRNG(seed), role: 'runner', clusterScale: scales[houseIndex] ?? 1
  });
  return { seed, arena };
}
const walk = (grid, from, to) => {
  const seen = new Set([from.y * 1000 + from.x]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (p.x === to.x && p.y === to.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = p.x + dx, y = p.y + dy, id = y * 1000 + x;
      if (grid[y]?.[x] !== 0 || seen.has(id)) continue;
      seen.add(id); queue.push({ x, y });
    }
  }
  return false;
};

let placed = 0;
for (let block = 1; block <= 4; block++) {
  for (let h = 1; h <= WORLD_HOUSES; h++) {
    const { seed, arena } = house(block, h);
    const args = {
      grid: arena.grid, spawn: arena.spawns.runner, stash: arena.objectives.stash,
      extract: arena.objectives.extract, egress: arena.egress.entry,
      seed: missionItemSeed(seed, block, h)
    };
    const spot = placeMissionItem(args);
    const tag = 'block ' + block + ' house ' + h;
    check('every house can hold a job: ' + tag, !!spot);
    placed++;
    check('the item sits on floor: ' + tag, arena.grid[spot.y][spot.x] === 0);
    check('the runner can reach it: ' + tag, walk(arena.grid, arena.spawns.runner, spot));
    check('it can still be carried out: ' + tag, walk(arena.grid, spot, arena.egress.entry));
    check('it is not a stash pocket: ' + tag,
      !same(spot, arena.objectives.stash) && !same(spot, arena.objectives.extract));
    check('it is not the driveway: ' + tag, !(spot.x === arena.egress.entry.x && spot.y === arena.egress.entry.y));
    check('it is not underfoot at the whistle: ' + tag, spot.fromSpawn >= 3);
    check('the same house puts it in the same place: ' + tag, same(spot, placeMissionItem(args)));
  }
}
check('sixty real houses were placed', placed === 60);

// A house with nowhere to go must fail honestly rather than invent a cell.
const wall = Array.from({ length: 6 }, () => Array(6).fill(1));
check('a sealed house holds no job', placeMissionItem({ grid: wall, spawn: { x: 1, y: 1 }, seed: 1 }) === null);
check('no grid, no job', placeMissionItem({ seed: 1 }) === null && placeMissionItem() === null);
const closet = [
  [1, 1, 1, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 1]
];
check('a house too small for the rules still holds a job or says so',
  placeMissionItem({ grid: closet, spawn: { x: 1, y: 1 }, stash: { x: 2, y: 2 }, seed: 5 }) === null);
console.log(passed + ' mission item assertions passed');
