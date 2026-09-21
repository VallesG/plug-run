// Serialise a live scene into the payload Jev evaluates.
//
// Pure and dependency-free so it can be exercised under plain node against a
// stub scene, like everything else in logic/.
//
// TWO RULES SHAPE THIS FILE.
//
// 1. IT MAY NOT LEAK WHAT A PLAYER CANNOT SEE. The scene stores the real bag
//    as `stash` and the decoy as `bunkStash`. Handing those labels to a driver
//    would let it walk straight to the real one, which no player can do, and
//    every recorded time made that way would be unbeatable and dishonest. Bags
//    go out as an unlabelled list in a fixed spatial order. Same principle as
//    BotDriver steering through driveMove(): a driver may not do what a player
//    could not.
//
// 2. EVERY FIELD COSTS MONEY. Billing is per input token and this is sent
//    several times a second, so the payload carries a local view and a handful
//    of distances rather than the whole 16x35 grid. Short keys, integers, no
//    prose.

const DIRS = [
  { k: 'up', x: 0, y: -1 },
  { k: 'down', x: 0, y: 1 },
  { k: 'left', x: -1, y: 0 },
  { k: 'right', x: 1, y: 0 }
];

const cellsBetween = (a, b) => Math.round(Math.hypot(a.x - b.x, a.y - b.y));

/** Cell coordinates of a sprite, or null when it is absent. */
function cellOf(scene, sprite) {
  if (!sprite || !Number.isFinite(sprite.x) || !Number.isFinite(sprite.y)) return null;
  const c = scene.toCell(sprite.x, sprite.y);
  return Number.isFinite(c?.x) && Number.isFinite(c?.y) ? { x: c.x, y: c.y } : null;
}

/**
 * @returns {{state: object, questions: object}} ready for Jev's `input`.
 */
export function jevState(scene) {
  const me = cellOf(scene, scene.attacker);
  if (!me) return null;

  const carrying = !!scene.hasStash;

  // Which way can the runner actually go. Sending this stops Jev spending a
  // decision on a direction the grid was never going to allow.
  const open = DIRS.filter(d => scene.isWalkableCell?.(me.x + d.x, me.y + d.y) !== false)
    .map(d => d.k);

  // Bags, deliberately unlabelled. Sorted by position so ordering cannot be
  // read as a hint -- see rule 1 above.
  const bags = (carrying ? [] : [scene.stash, scene.bunkStash])
    .map(b => cellOf(scene, b))
    .filter(Boolean)
    .sort((a, b) => (a.y - b.y) || (a.x - b.x))
    .map(c => ({ x: c.x, y: c.y, d: cellsBetween(me, c) }));

  const plugs = [scene.defender, scene.defender2]
    .filter(p => p && p.active !== false && p.visible !== false)
    .map(p => cellOf(scene, p))
    .filter(Boolean)
    .map(c => ({ x: c.x, y: c.y, d: cellsBetween(me, c) }))
    .sort((a, b) => a.d - b.d);

  const car = cellOf(scene, scene.extract);
  const selected = scene.runnerPowersSelected || [];
  const consumed = scene.runnerPowersConsumed || [];
  const powers = selected.filter((name, i) => name && !consumed[i]);

  const state = {
    me: { x: me.x, y: me.y, hp: scene.attacker?.hp ?? 0 },
    carrying,
    open,
    plugs,
    powers,
    goal: carrying ? 'reach the car' : 'pick up a bag, then reach the car'
  };
  if (bags.length) state.bags = bags;
  if (car) state.car = { x: car.x, y: car.y, d: cellsBetween(me, car) };

  const questions = {
    move: {
      type: 'choice',
      instructions: 'Which way should the runner move right now?',
      criteria: open.length ? open : ['up', 'down', 'left', 'right']
    }
  };
  // Only ask about powers when one is actually available. An unanswerable
  // question is tokens spent for nothing.
  if (powers.length) {
    questions.power = {
      type: 'choice',
      instructions: 'Use a power this instant, or none? Powers are single use.',
      criteria: ['none', ...powers]
    };
  }

  return { state, questions };
}

/** Directions, exported so the driver maps Jev's answer back without guessing. */
export const JEV_DIRECTIONS = DIRS.reduce((acc, d) => (acc[d.k] = { x: d.x, y: d.y }, acc), {});
