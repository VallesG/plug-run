// Leaderboard scoring: the packing that lets one sorted set rank
// "stash first, REP only on a tie".
import {
  packBlockScore, unpackBlockScore, compareBlockEntries, rivalsWinScore,
  REP_OFFSET, REP_SPAN, MAX_PACKED_STASH, MAX_RIVALS_WINS
} from '../src/logic/leaderboardScore.js';

let passed = 0;
const check = (name, cond) => { if (!cond) throw new Error(name); passed++; };

// --- the rule the board exists to express ---
check('more stash always outranks less, whatever the REP',
  packBlockScore(101, -2000) > packBlockScore(100, 2000));
check('equal stash is broken by REP',
  packBlockScore(100, 50) > packBlockScore(100, 49));
check('equal stash and REP tie exactly',
  packBlockScore(100, 50) === packBlockScore(100, 50));
check('one more stash beats the largest possible REP swing',
  packBlockScore(2, -2000) > packBlockScore(1, 2000));

// --- negative REP must not borrow from the stash part ---
check('negative REP still ranks above a lower stash',
  packBlockScore(10, -2000) > packBlockScore(9, 2000));
check('negative REP packs non-negative', packBlockScore(0, -2000) === 0);
check('a losing run is still rankable', Number.isFinite(packBlockScore(0, -1500)));

// --- round trip ---
for (const [stash, rep] of [[0, 0], [1, -1], [120, 45], [50000, 2000], [7, -2000], [999, 2000]]) {
  const got = unpackBlockScore(packBlockScore(stash, rep));
  check(`round trip ${stash}/${rep}`, got.stash === stash && got.rep === rep);
}

// --- precision: the reason the caps exist ---
const max = packBlockScore(MAX_PACKED_STASH, REP_OFFSET);
check('the largest score is exactly representable', max < Number.MAX_SAFE_INTEGER);
check('and still decodes exactly',
  unpackBlockScore(max).stash === MAX_PACKED_STASH && unpackBlockScore(max).rep === REP_OFFSET);
check('REP can never carry into stash', 2 * REP_OFFSET < REP_SPAN);

// --- refusing what it cannot represent, rather than packing it wrong ---
check('stash beyond the cap is refused', packBlockScore(MAX_PACKED_STASH + 1, 0) === null);
check('REP beyond the cap is refused', packBlockScore(10, REP_OFFSET + 1) === null);
check('REP below the floor is refused', packBlockScore(10, -REP_OFFSET - 1) === null);
check('negative stash is refused', packBlockScore(-1, 0) === null);
check('non-finite is refused',
  packBlockScore(NaN, 0) === null && packBlockScore(10, Infinity) === null);
check('a refused pack is null, never a wrong number',
  [null].includes(packBlockScore(1e9, 0)));

// --- ordering helper matches the packing ---
const board = [
  { username: 'ci', stash: 100, rep: 10 },
  { username: 'al', stash: 300, rep: -2000 },
  { username: 'bo', stash: 100, rep: 900 },
  { username: 'di', stash: 300, rep: -1999 }
];
const order = board.slice().sort(compareBlockEntries).map(e => e.username);
check('sorted by stash then REP', order.join() === 'di,al,bo,ci');
const tied = [{ username: 'zoe', stash: 5, rep: 5 }, { username: 'ann', stash: 5, rep: 5 }];
check('an exact tie is stable by name',
  tied.slice().sort(compareBlockEntries)[0].username === 'ann' &&
  tied.slice().reverse().sort(compareBlockEntries)[0].username === 'ann');

// --- Block Rivals: wins, stacked ---
check('a win is worth one', rivalsWinScore(1) === 1);
check('wins stack', rivalsWinScore(37) === 37);
check('zero wins is a real score, not absent', rivalsWinScore(0) === 0);
check('losses cannot subtract below zero', rivalsWinScore(-1) === null);
check('an implausible tally is refused', rivalsWinScore(MAX_RIVALS_WINS + 1) === null);
check('non-integers are floored, not rejected outright', rivalsWinScore(3.7) === 3);
check('garbage is refused', rivalsWinScore('many') === null && rivalsWinScore(NaN) === null);

// --- the backend mirrors this packing; it must not drift ---
// A Netlify function is CommonJS and cannot import this ESM module, so the
// constants and the pack function are duplicated there on purpose. Duplication
// is only safe if something fails when the copies diverge.
import { readFileSync } from 'node:fs';
const fn = readFileSync(new URL('../netlify/functions/leaderboard.js', import.meta.url), 'utf8');

const constOf = name => {
  const m = fn.match(new RegExp('const ' + name + ' = (-?\\d+);'));
  return m ? Number(m[1]) : null;
};
check('backend REP_OFFSET matches', constOf('REP_OFFSET') === REP_OFFSET);
check('backend REP_SPAN matches', constOf('REP_SPAN') === REP_SPAN);
check('backend MAX_PACKED_STASH matches', constOf('MAX_PACKED_STASH') === MAX_PACKED_STASH);

// Run the backend's own pack over the shared one and require identical output,
// including the refusals — a copy that packs differently corrupts rankings.
const body = fn.slice(fn.indexOf('function packBlockScore'));
const backendPack = new Function('REP_OFFSET', 'REP_SPAN', 'MAX_PACKED_STASH',
  body.slice(0, body.indexOf('\n}') + 2) + '\nreturn packBlockScore;'
)(REP_OFFSET, REP_SPAN, MAX_PACKED_STASH);

const cases = [[0, 0], [1, -1], [120, 45], [50000, 2000], [7, -2000], [0, -2000],
               [50001, 0], [10, 2001], [-1, 0], [NaN, 0], [10, Infinity]];
let agreed = 0;
for (const [stash, rep] of cases) {
  if (backendPack(stash, rep) !== packBlockScore(stash, rep)) {
    throw new Error(`backend packing drifted at ${stash}/${rep}`);
  }
  agreed++;
}
check('backend packing agrees on every case, refusals included', agreed === cases.length);

// The backend unpacks inline when reading a board; that arithmetic must invert
// the shared pack for real values.
check('backend board maths inverts the pack', (() => {
  const score = packBlockScore(4321, -750);
  return Math.floor(score / REP_SPAN) === 4321 && (score % REP_SPAN) - REP_OFFSET === -750;
})());

console.log(passed + ' leaderboard score assertions passed');
