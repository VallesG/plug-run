import { cloudflareJev, jevCostUsd, JEV_MODEL } from '../src/controllers/jevCloudflare.js';
import { jevState } from '../src/logic/jevState.js';
let passed = 0;
const check = (name, value) => { if (!value) throw new Error(name); passed++; };

const CELL = 24;
const sp = (x, y, e = {}) => ({ x: x * CELL + CELL / 2, y: y * CELL + CELL / 2, ...e });
const scene = {
  cell: CELL, pad: { x: 0, y: 0 },
  toCell(x, y) { return { x: Math.floor(x / CELL), y: Math.floor(y / CELL) }; },
  isWalkableCell: () => true,
  attacker: sp(5, 5, { hp: 2 }), defender: sp(9, 5),
  stash: sp(2, 9), bunkStash: sp(12, 3), extract: sp(1, 1), hasStash: false,
  runnerPowersSelected: ['phase', 'dash'], runnerPowersConsumed: [false, false]
};

// Response shaped exactly like Cloudflare's documented example for a choice
// question, wrapped in the REST envelope the endpoint actually returns.
const ok = (answers, usage = { input_tokens: 412, output_tokens: 44 }) => ({
  ok: true, status: 200,
  json: async () => ({ result: { model: 'jev-1.13.0', answers, usage }, success: true, errors: [] })
});

// --- The request matches the documented contract ---------------------------
{
  let seen = null;
  const decide = cloudflareJev({
    accountId: 'acct123', apiToken: 'tok456',
    fetchImpl: async (url, init) => { seen = { url, init }; return ok({
      move: { type: 'choice', choice: 'left', confidence: 0.8, probabilities: { left: 0.8 } } }); }
  });
  const payload = jevState(scene);
  const answer = await decide(payload);

  check('posts to the account ai/run endpoint',
    seen.url === 'https://api.cloudflare.com/client/v4/accounts/acct123/ai/run');
  check('bearer token sent', seen.init.headers.Authorization === 'Bearer tok456');
  const body = JSON.parse(seen.init.body);
  check('model slug is typesafe/jev', body.model === JEV_MODEL && JEV_MODEL === 'typesafe/jev');
  check('payload goes under input', !!body.input.state && !!body.input.questions);
  check('state and questions are nested, not flattened',
    body.state === undefined && body.questions === undefined);
  check('choice criteria survive as an object',
    !Array.isArray(body.input.questions.move.criteria));

  check('choice answer mapped to move', answer.move === 'left');
  check('confidence mapped', answer.confidence === 0.8);
  check('usage returned for billing', answer.usage.input_tokens === 412);
}

// --- Both response envelopes are accepted ----------------------------------
{
  const bare = cloudflareJev({ accountId: 'a', apiToken: 't',
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({
      model: 'jev-1.13.0',
      answers: { move: { type: 'choice', choice: 'up', confidence: 1 } },
      usage: { input_tokens: 100 } }) }) });
  const a = await bare({ state: {}, questions: {} });
  check('bare Workers-binding shape works', a.move === 'up' && a.usage.input_tokens === 100);
}

// --- Powers -----------------------------------------------------------------
{
  const decide = cloudflareJev({ accountId: 'a', apiToken: 't',
    fetchImpl: async () => ok({
      move: { type: 'choice', choice: 'down', confidence: 0.6 },
      power: { type: 'choice', choice: 'dash', confidence: 0.9 } }) });
  const a = await decide({ state: {}, questions: {} });
  check('power answer mapped', a.power === 'dash');

  const noPower = cloudflareJev({ accountId: 'a', apiToken: 't',
    fetchImpl: async () => ok({ move: { type: 'choice', choice: 'down' } }) });
  check('missing power answer is null, not undefined',
    (await noPower({ state: {}, questions: {} })).power === null);
}

// --- Failures surface as throws, for the driver to count and fall back -----
{
  const http500 = cloudflareJev({ accountId: 'a', apiToken: 't',
    fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
  let threw = null;
  try { await http500({ state: {}, questions: {} }); } catch (e) { threw = e; }
  check('http failure throws', /jev http 500/.test(threw?.message || ''));

  const empty = cloudflareJev({ accountId: 'a', apiToken: 't',
    fetchImpl: async () => ok({}) });
  threw = null;
  try { await empty({ state: {}, questions: {} }); } catch (e) { threw = e; }
  check('a response with no move answer throws', /no move answer/.test(threw?.message || ''));
}

// --- Credentials are required up front, not at first call ------------------
{
  let threw = null;
  try { cloudflareJev({ accountId: 'a' }); } catch (e) { threw = e; }
  check('missing token is caught at construction', /accountId and apiToken/.test(threw?.message || ''));
}

// --- Cost helper ------------------------------------------------------------
{
  check('cost from tokens', jevCostUsd(1e6) === 0.042);
  check('zero and junk are free', jevCostUsd(0) === 0 && jevCostUsd(undefined) === 0);
}

console.log('jevCloudflare: ' + passed + ' assertions passed');
