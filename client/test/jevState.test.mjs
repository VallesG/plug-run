import assert from 'node:assert/strict';
import { jevState, JEV_DIRECTIONS } from '../src/logic/jevState.js';
let passed = 0;
const check = (name, value) => { if (!value) throw new Error(name); passed++; };

const CELL = 24;
const sprite = (cx, cy, extra = {}) => ({ x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2, ...extra });
function scene(over = {}) {
  const walls = over.walls || [];
  const blocked = new Set(walls.map(([x, y]) => x + ',' + y));
  return {
    cell: CELL, pad: { x: 0, y: 0 },
    toCell(x, y) { return { x: Math.floor(x / CELL), y: Math.floor(y / CELL) }; },
    isWalkableCell(cx, cy) { return !blocked.has(cx + ',' + cy); },
    attacker: sprite(5, 5, { hp: 2 }),
    defender: sprite(9, 5),
    stash: sprite(2, 9),            // the REAL bag
    bunkStash: sprite(12, 3),       // the decoy
    extract: sprite(1, 1),
    hasStash: false,
    runnerPowersSelected: ['phase', 'dash'],
    runnerPowersConsumed: [false, false],
    ...over
  };
}

// --- The fairness invariant, which is the whole point of the file ----------
{
  const s = scene();
  const { state } = jevState(s);
  const blob = JSON.stringify(state);
  check('bags are present', state.bags.length === 2);
  check('nothing names the real bag', !/stash|bunk|real|decoy|fake/i.test(blob));
  check('bags carry no distinguishing flag',
    state.bags.every(b => Object.keys(b).sort().join() === 'd,x,y'));

  // Swapping which bag the scene considers real must not change the payload.
  const swapped = scene({ stash: sprite(12, 3), bunkStash: sprite(2, 9) });
  check('payload is identical when real and decoy swap',
    JSON.stringify(jevState(swapped).state) === blob);
}

// --- Only legal moves are offered -----------------------------------------
{
  const s = scene({ walls: [[5, 4], [4, 5]] });   // up and left are walls
  const { state, questions } = jevState(s);
  check('walls removed from open moves', state.open.sort().join() === 'down,right');
  check('move question offers only legal directions',
    questions.move.criteria.sort().join() === 'down,right');
  check('every direction maps to a vector',
    state.open.every(k => JEV_DIRECTIONS[k] && Number.isFinite(JEV_DIRECTIONS[k].x)));
}

// --- Carrying changes the objective, and drops the bags from the payload ---
{
  const { state, questions } = jevState(scene({ hasStash: true }));
  check('carrying is reported', state.carrying === true);
  check('bags omitted once carrying', state.bags === undefined);
  check('goal reflects carrying', state.goal === 'reach the car');
  check('car distance present', state.car.d === Math.round(Math.hypot(4, 4)));
  check('move question still asked', questions.move.type === 'choice');
}

// --- Powers -----------------------------------------------------------------
{
  const both = jevState(scene());
  check('available powers offered with none', both.questions.power.criteria.join() === 'none,phase,dash');

  const spent = jevState(scene({ runnerPowersConsumed: [true, false] }));
  check('consumed powers drop out', spent.state.powers.join() === 'dash');

  const none = jevState(scene({ runnerPowersConsumed: [true, true] }));
  check('no power question when nothing is available', none.questions.power === undefined);
  check('unanswerable question is not billed', Object.keys(none.questions).join() === 'move');
}

// --- Plugs ------------------------------------------------------------------
{
  const two = jevState(scene({ defender2: sprite(6, 5) }));
  check('both plugs reported', two.state.plugs.length === 2);
  check('nearest plug first', two.state.plugs[0].d < two.state.plugs[1].d);

  const dead = jevState(scene({ defender: sprite(9, 5, { active: false }) }));
  check('inactive plug omitted', dead.state.plugs.length === 0);
}

// --- Cost discipline --------------------------------------------------------
{
  const { state, questions } = jevState(scene());
  const chars = JSON.stringify({ state, questions }).length;
  // Billing is per input token several times a second. The whole 16x35 grid
  // would be ~600 chars on its own; a local view plus distances must stay far
  // under that or the recording pass stops being cheap.
  check('payload stays compact (' + chars + ' chars)', chars < 700);
  check('no grid was sent', !/grid|walls|tiles/i.test(JSON.stringify(state)));
}

// --- Degenerate scenes ------------------------------------------------------
{
  check('no runner yields no payload', jevState(scene({ attacker: null })) === null);
  const noCar = jevState(scene({ extract: null }));
  check('missing car omitted rather than crashing', noCar.state.car === undefined);
}

console.log('jevState: ' + passed + ' assertions passed');
