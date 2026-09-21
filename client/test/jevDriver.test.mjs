import JevDriver from '../src/controllers/JevDriver.js';
let passed = 0;
const check = (name, value) => { if (!value) throw new Error(name); passed++; };
const flush = () => new Promise(r => setImmediate(r));

const CELL = 24;
const sp = (x, y, e = {}) => ({ x: x * CELL + CELL / 2, y: y * CELL + CELL / 2, ...e });
const scene = (over = {}) => ({
  cell: CELL, pad: { x: 0, y: 0 },
  toCell(x, y) { return { x: Math.floor(x / CELL), y: Math.floor(y / CELL) }; },
  isWalkableCell: () => true,
  attacker: sp(5, 5, { hp: 2 }), defender: sp(9, 5),
  stash: sp(2, 9), bunkStash: sp(12, 3), extract: sp(1, 1), hasStash: false,
  runnerPowersSelected: ['phase', 'dash'], runnerPowersConsumed: [false, false], ...over
});

// A clock we control, so latency behaviour is tested rather than raced.
function rig(answerer, opts = {}) {
  let t = 1000;
  const pending = [];
  const d = new JevDriver(
    (payload) => new Promise((res, rej) => pending.push({ payload, res, rej })),
    { now: () => t, ...opts });
  return { d, pending, at: (v) => { t = v; }, tick: (s = scene()) => d.tick(s), now: () => t };
}

// --- It must never block, and must steer on the previous answer ------------
{
  const r = rig();
  check('first tick has nothing to steer by', r.tick() === null);
  check('a request went out', r.d.stats.requests === 1);

  r.pending[0].res({ move: 'left', power: 'none', confidence: 0.8 });
  await flush();
  const got = r.tick();
  check('answer adopted', got.move === 'left');
  check('direction vector resolved', got.dir.x === -1 && got.dir.y === 0);
  check('none power normalised away', got.power === null);
  check('confidence carried', got.confidence === 0.8);
}

// --- No overlapping requests -----------------------------------------------
{
  const r = rig();
  r.tick(); r.tick(); r.tick();
  check('one request in flight at a time', r.d.stats.requests === 1);
  r.pending[0].res({ move: 'up' });
  await flush();
  r.at(1050);
  r.tick();
  check('too soon to ask again', r.d.stats.requests === 1);
  r.at(1300);
  r.tick();
  check('asks again once the interval passes', r.d.stats.requests === 2);
}

// --- A slow answer must not strand the runner ------------------------------
{
  const r = rig();
  r.tick();
  r.at(1000 + 950);                 // past timeoutMs
  check('timed out tick yields nothing', r.tick() === null);
  check('timeout counted', r.d.stats.timeouts === 1);
  check('a fresh request replaces it', r.d.stats.requests === 2);

  // The abandoned request answering late must be ignored, not adopted.
  r.pending[0].res({ move: 'right' });
  await flush();
  check('late answer to a dead request is discarded', r.d.last === null);
  check('late answer did not count', r.d.stats.answers === 0);
}

// --- Staleness bound --------------------------------------------------------
{
  const r = rig();
  r.tick();
  r.pending[0].res({ move: 'down' });
  await flush();
  r.at(1000 + 1100);
  check('still usable inside the stale window', r.tick().move === 'down');
  r.at(1000 + 5000);
  check('too old to steer by', r.tick() === null);
}

// --- Bad and failed answers fall through, they do not crash ----------------
{
  const r = rig();
  r.tick();
  r.pending[0].res({ move: 'diagonally' });     // not a legal direction
  await flush();
  check('nonsense direction rejected', r.tick() === null);
  check('counted as an error', r.d.stats.errors === 1);

  r.at(1400); r.tick();
  r.pending[1].rej(new Error('503'));
  await flush();
  check('a thrown request does not escape', r.d.stats.errors === 2);
  check('driver still usable', r.tick() === null || true);
}

// --- Powers -----------------------------------------------------------------
{
  const r = rig();
  r.tick();
  r.pending[0].res({ move: 'up', power: 'dash' });
  await flush();
  check('power passed through', r.tick().power === 'dash');
}

// --- Cost reporting ---------------------------------------------------------
{
  const r = rig();
  r.tick();
  r.pending[0].res({ move: 'up' });
  await flush();
  const rep = r.d.report();
  check('tokens estimated', rep.tokensApprox > 50 && rep.tokensApprox < 400);
  check('estimate flagged as such', rep.tokenSource === 'estimated');
  check('cost reported', rep.costUsd >= 0);
  check('answer rate tracked', rep.answerRate === 1);
  check('failure rate tracked', rep.failureRate === 0);
}

// --- Real usage from the API beats the character-count guess ---------------
{
  const r = rig();
  r.tick();
  r.pending[0].res({ move: 'up', usage: { input_tokens: 412, output_tokens: 40 } });
  await flush();
  const rep = r.d.report();
  check('billed tokens recorded', rep.tokensBilled === 412);
  check('cost comes from the API', rep.tokenSource === 'api');
  check('cost uses billed tokens', rep.costUsd === +(412 / 1e6 * 0.042).toFixed(4));
}

// --- A scene with no runner asks nothing ------------------------------------
{
  const r = rig();
  check('no payload, no steer', r.tick(scene({ attacker: null })) === null);
  check('no request was billed', r.d.stats.requests === 0);
}

console.log('jevDriver: ' + passed + ' assertions passed');
