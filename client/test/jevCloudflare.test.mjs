import { cloudflareJev, jevCostUsd, JEV_MODEL } from '../src/controllers/jevCloudflare.js';
import { jevState } from '../src/logic/jevState.js';
import { orderCandidates, pathDistances } from '../src/logic/jevStrategy.js';
let passed = 0;
const check = (name, value) => { if (!value) throw new Error(name); passed++; };

// A strategic payload, built the way JevStrategist builds one.
const view = {
  cols: 14, rows: 12, isWalkable: (x, y) => x > 0 && y > 0 && x < 13 && y < 11,
  runner: { x: 5, y: 5 }, house: 2, attempt: 1, hp: 2, carrying: false, phasing: false, decoyActive: false,
  candidates: orderCandidates([{ x: 2, y: 9 }, { x: 12, y: 3 }]), extract: { x: 1, y: 1 },
  inLane: false, exposedAt: () => false, powers: { selected: ['phase', 'dash'], consumed: [false, false] }
};
const payload = () => jevState(view, { dist: pathDistances(view, view.runner), plugDists: [pathDistances(view, { x: 9, y: 5 })], trigger: 'house_start' });

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
      objective: { type: 'choice', choice: 'target_a', confidence: 0.8, probabilities: { target_a: 0.8 } } }); }
  });
  const answer = await decide(payload());

  check('posts to the account ai/run endpoint',
    seen.url === 'https://api.cloudflare.com/client/v4/accounts/acct123/ai/run');
  check('bearer token sent', seen.init.headers.Authorization === 'Bearer tok456');
  const body = JSON.parse(seen.init.body);
  check('model slug is typesafe/jev', body.model === JEV_MODEL && JEV_MODEL === 'typesafe/jev');
  check('payload goes under input', !!body.input.state && !!body.input.questions);
  check('state and questions are nested, not flattened',
    body.state === undefined && body.questions === undefined);
  check('choice criteria survive as an object',
    !Array.isArray(body.input.questions.objective.criteria));

  check('choice answer mapped to an objective', answer.objective === 'target_a' && answer.valid);
  check('confidence mapped', answer.confidence === 0.8);
  check('usage returned for billing', answer.usage.input_tokens === 412);
}

// --- Prepaid credits need the gateway header -------------------------------
{
  let seen = null;
  const withGw = cloudflareJev({ accountId: 'a', apiToken: 't', gatewayId: 'plug-run',
    fetchImpl: async (u, i) => { seen = i; return ok({ objective: { type: 'choice', choice: 'hold' } }); } });
  await withGw({ state: {}, questions: {} });
  check('gateway id sent so prepaid credits are used',
    seen.headers['cf-aig-gateway-id'] === 'plug-run');

  let bare = null;
  const noGw = cloudflareJev({ accountId: 'a', apiToken: 't',
    fetchImpl: async (u, i) => { bare = i; return ok({ objective: { type: 'choice', choice: 'hold' } }); } });
  await noGw({ state: {}, questions: {} });
  check('header omitted entirely when no gateway configured',
    !('cf-aig-gateway-id' in bare.headers));
}

// --- Both response envelopes are accepted ----------------------------------
{
  const bare = cloudflareJev({ accountId: 'a', apiToken: 't',
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({
      model: 'jev-1.13.0',
      answers: { objective: { type: 'choice', choice: 'hold', confidence: 1 } },
      usage: { input_tokens: 100 } }) }) });
  const a = await bare({ state: {}, questions: {} });
  check('bare Workers-binding shape works', a.objective === 'hold' && a.usage.input_tokens === 100);
}

// --- Powers -----------------------------------------------------------------
{
  const decide = cloudflareJev({ accountId: 'a', apiToken: 't',
    fetchImpl: async () => ok({
      objective: { type: 'choice', choice: 'target_b', confidence: 0.6 },
      power: { type: 'choice', choice: 'dash', confidence: 0.9 } }) });
  const a = await decide({ state: {}, questions: {} });
  check('power answer mapped', a.power === 'dash');

  const noPower = cloudflareJev({ accountId: 'a', apiToken: 't',
    fetchImpl: async () => ok({ objective: { type: 'choice', choice: 'target_b' } }) });
  check('missing power answer means save it',
    (await noPower({ state: {}, questions: {} })).power === 'none');
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
  const none = await empty({ state: {}, questions: {} });
  check('a response with no objective comes back invalid for the strategist to count',
    none.valid === false && none.reason === 'no-objective');
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
