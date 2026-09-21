import { typesafeJev, TYPESAFE_URL, JEV_MODEL } from '../src/controllers/jevTypesafe.js';
import { mapJevAnswer, jevCostUsd } from '../src/logic/jevAnswer.js';
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
// TypeSafe's documented response, unwrapped.
const ok = (answers, usage = { input_tokens: 392, output_tokens: 65 }) => ({
  ok: true, status: 200, json: async () => ({ model: 'jev-1.13.0', answers, usage })
});

// --- The request is FLAT, which is the whole difference from Cloudflare ----
{
  let seen = null;
  const decide = typesafeJev({ apiKey: 'sk-test',
    fetchImpl: async (url, init) => { seen = { url, init }; return ok({
      move: { type: 'choice', choice: 'right', confidence: 0.7 } }); } });
  const answer = await decide(jevState(scene));

  check('posts to the systemone endpoint', seen.url === TYPESAFE_URL
    && TYPESAFE_URL === 'https://api.typesafe.ai/v1/systemone');
  check('bearer key sent', seen.init.headers.Authorization === 'Bearer sk-test');
  const body = JSON.parse(seen.init.body);
  check('state is top level, not nested under input',
    !!body.state && body.input === undefined);
  check('questions are top level', !!body.questions.move);
  check('model defaults to the alias', body.model === JEV_MODEL && JEV_MODEL === 'jev-latest');
  check('answer mapped', answer.move === 'right' && answer.confidence === 0.7);
  check('usage returned', answer.usage.input_tokens === 392);
}

// --- A pinned version overrides the moving alias ---------------------------
{
  let body = null;
  const pinned = typesafeJev({ apiKey: 'k', model: 'jev-1.13.0',
    fetchImpl: async (u, i) => { body = JSON.parse(i.body); return ok({
      move: { type: 'choice', choice: 'up' } }); } });
  await pinned({ state: {}, questions: {} });
  check('version pinned when asked', body.model === 'jev-1.13.0');
}

// --- Failures ----------------------------------------------------------------
{
  const limited = typesafeJev({ apiKey: 'k',
    fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({}) }) });
  let threw = null;
  try { await limited({ state: {}, questions: {} }); } catch (e) { threw = e; }
  check('rate limiting is called out distinctly', /rate limited/.test(threw?.message || ''));

  const down = typesafeJev({ apiKey: 'k',
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }) });
  threw = null;
  try { await down({ state: {}, questions: {} }); } catch (e) { threw = e; }
  check('other failures carry the status', /jev http 503/.test(threw?.message || ''));

  let threw2 = null;
  try { typesafeJev({}); } catch (e) { threw2 = e; }
  check('missing key caught at construction', /needs an apiKey/.test(threw2?.message || ''));
}

// --- The shared mapper handles both envelopes ------------------------------
{
  const bare = mapJevAnswer({ answers: { move: { type: 'choice', choice: 'left', confidence: 0.5 } },
    usage: { input_tokens: 10 } });
  const wrapped = mapJevAnswer({ result: { answers: { move: { type: 'choice', choice: 'left', confidence: 0.5 } },
    usage: { input_tokens: 10 } }, success: true });
  check('bare and wrapped map identically', JSON.stringify(bare) === JSON.stringify(wrapped));

  check('a missing move answer is null, not a throw', mapJevAnswer({ answers: {} }).move === null);
  check('junk maps to null', mapJevAnswer(null).move === null);
  check('"none" power means saved, not chosen',
    mapJevAnswer({ answers: { move: { choice: 'up' }, power: { choice: 'none' } } }).power === null);
  check('a real power comes through',
    mapJevAnswer({ answers: { move: { choice: 'up' }, power: { choice: 'phase' } } }).power === 'phase');
  check('cost helper shared', jevCostUsd(1e6) === 0.042);
}

console.log('jevTypesafe: ' + passed + ' assertions passed');
