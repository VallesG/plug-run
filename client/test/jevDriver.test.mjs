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

/* ---------------- safety ceilings ----------------
 *
 * The point of these is that a runaway loop costs a worse recording rather
 * than a bill, so every assertion here is about a request NOT being made.
 */

// Request ceiling: once reached, nothing else is ever asked.
{
  const r = rig(null, { maxRequests: 3, minIntervalMs: 0 });
  for (let i = 0; i < 3; i++) {
    r.tick();
    r.pending[i].res({ move: 'up' });
    await flush();
    r.at(1000 + (i + 1) * 10);
  }
  check('three requests went out', r.d.stats.requests === 3);

  const before = r.d.stats.requests;
  for (let i = 0; i < 20; i++) { r.at(2000 + i * 100); r.tick(); }
  check('NO further request after the ceiling', r.d.stats.requests === before);
  check('the stop is reported', r.d.report().budgetStopped === 'requests');
  check('the limit is reported', r.d.report().requestLimit === 3);
}

// Token ceiling: the API's own counts are what it spends against.
{
  const r = rig(null, { maxInputTokens: 500, minIntervalMs: 0 });
  r.tick();
  r.pending[0].res({ move: 'up', usage: { input_tokens: 400 } });
  await flush();
  r.at(1100);
  r.tick();
  check('still under the ceiling, so it asked again', r.d.stats.requests === 2);
  r.pending[1].res({ move: 'up', usage: { input_tokens: 400 } });   // 800 > 500
  await flush();

  const before = r.d.stats.requests;
  for (let i = 0; i < 20; i++) { r.at(2000 + i * 100); r.tick(); }
  check('NO further request once billed tokens pass the ceiling',
    r.d.stats.requests === before);
  check('stopped for tokens, not requests', r.d.report().budgetStopped === 'tokens');
  check('the token limit is reported', r.d.report().tokenLimit === 500);
}

// The request ceiling is the backstop for the case the token ceiling cannot
// see: every request failing means nothing is ever billed to count.
{
  const r = rig(null, { maxRequests: 2, maxInputTokens: 1e9, minIntervalMs: 0 });
  r.tick();
  r.pending[0].rej(new Error('503'));
  await flush();
  r.at(1100);
  r.tick();
  r.pending[1].rej(new Error('503'));
  await flush();
  check('two failed requests still count against the ceiling', r.d.stats.requests === 2);
  for (let i = 0; i < 10; i++) { r.at(2000 + i * 100); r.tick(); }
  check('a driver billed nothing still stops', r.d.stats.requests === 2);
  check('and says why', r.d.report().budgetStopped === 'requests');
}

// Latched: a stop stays stopped.
{
  const r = rig(null, { maxRequests: 1, minIntervalMs: 0 });
  r.tick();
  r.pending[0].res({ move: 'up' });
  await flush();
  r.at(5000); r.tick();
  check('stopped', r.d.budgetStopped === 'requests');
  // Raising the ceiling afterwards must not reopen the tap.
  r.d.cfg.maxRequests = 100;
  r.at(6000); r.tick();
  check('a later config change cannot restart spending', r.d.stats.requests === 1);
}

// A stopped driver still hands back a fresh answer, and reset() does not
// forgive the budget.
{
  const r = rig(null, { maxRequests: 1, minIntervalMs: 0, staleMs: 100000 });
  r.tick();
  r.pending[0].res({ move: 'left' });
  await flush();
  r.at(1100);
  check('the last answer still steers while it is fresh', r.tick().move === 'left');
  r.d.reset();
  r.at(1200); r.tick();
  check('reset clears the answer but not the ceiling', r.d.stats.requests === 1);
}

// Defaults are finite, so a forgotten session has a floor under it.
{
  const r = rig();
  const rep = r.d.report();
  check('a request ceiling exists by default', Number.isFinite(rep.requestLimit));
  check('a token ceiling exists by default', Number.isFinite(rep.tokenLimit));
  check('nothing stopped yet', rep.budgetStopped === null);
}

/* ---------------- drive counters ---------------- */
{
  const r = rig();
  r.d.drive.steps = 6; r.d.drive.fallbacks = 2; r.d.drive.illegal = 2;
  const rep = r.d.report();
  check('decisions totals every route decision', rep.decisions === 10);
  check('steer share is Jev\'s slice of them', rep.steerShare === 0.6);
}

console.log('jevDriver: ' + passed + ' assertions passed');
