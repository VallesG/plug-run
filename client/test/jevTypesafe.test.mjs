import { typesafeJev, TYPESAFE_URL, JEV_MODEL } from '../src/controllers/jevTypesafe.js';
import { mapJevAnswer, jevCostUsd } from '../src/logic/jevAnswer.js';
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
// TypeSafe's documented response, unwrapped.
const ok = (answers, usage = { input_tokens: 392, output_tokens: 65 }) => ({
  ok: true, status: 200, json: async () => ({ model: 'jev-1.13.0', answers, usage })
});

// --- The request is FLAT, which is the whole difference from Cloudflare ----
{
  let seen = null;
  const decide = typesafeJev({ apiKey: 'sk-test',
    fetchImpl: async (url, init) => { seen = { url, init }; return ok({
      objective: { type: 'choice', choice: 'target_b', confidence: 0.7 },
      posture: { type: 'choice', choice: 'safe', confidence: 0.6 } }); } });
  const answer = await decide(payload());

  check('posts to the systemone endpoint', seen.url === TYPESAFE_URL
    && TYPESAFE_URL === 'https://api.typesafe.ai/v1/systemone');
  check('bearer key sent', seen.init.headers.Authorization === 'Bearer sk-test');
  const body = JSON.parse(seen.init.body);
  check('state is top level, not nested under input',
    !!body.state && body.input === undefined);
  check('questions are top level and strategic', !!body.questions.objective && !body.questions.move);
  check('model defaults to the alias', body.model === JEV_MODEL && JEV_MODEL === 'jev-latest');
  check('answer mapped to a strategy', answer.objective === 'target_b' && answer.posture === 'safe' && answer.confidence === 0.7 && answer.valid);
  check('usage returned', answer.usage.input_tokens === 392);
}

// --- A pinned version overrides the moving alias ---------------------------
{
  let body = null;
  const pinned = typesafeJev({ apiKey: 'k', model: 'jev-1.13.0',
    fetchImpl: async (u, i) => { body = JSON.parse(i.body); return ok({
      objective: { type: 'choice', choice: 'target_a' } }); } });
  await pinned({ state: {}, questions: {} });
  check('version pinned when asked', body.model === 'jev-1.13.0');
}

// --- Failures ----------------------------------------------------------------
{
  const down = typesafeJev({ apiKey: 'k',
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }) });
  let threw = null;
  try { await down({ state: {}, questions: {} }); } catch (e) { threw = e; }
  check('other failures carry the status', /jev http 503/.test(threw?.message || ''));

  let threw2 = null;
  try { typesafeJev({}); } catch (e) { threw2 = e; }
  check('missing key caught at construction', /needs an apiKey/.test(threw2?.message || ''));
}

/* ---------------- retrying ----------------
 *
 * A scripted fetch and a scripted clock, so backoff is asserted rather than
 * waited for. `slept` is the proof: a test that only checked the final answer
 * could not tell a retry from a first attempt that happened to work.
 */

function rig(statuses, { signalMs = 2000, maxRetries } = {}) {
  const calls = [];
  const slept = [];
  let t = 0;
  const queue = [...statuses];
  const decide = typesafeJev({
    apiKey: 'k', signalMs,
    ...(maxRetries === undefined ? {} : { maxRetries }),
    now: () => t,
    sleep: async (ms) => { slept.push(ms); t += ms; },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      const next = queue.shift();
      const status = typeof next === 'number' ? next : next.status;
      const headers = next.retryAfter !== undefined
        ? { get: (k) => (k.toLowerCase() === 'retry-after' ? String(next.retryAfter) : null) }
        : { get: () => null };
      if (status === 200) {
        return { ok: true, status, headers,
          json: async () => ({ model: 'jev-1.13.0',
            answers: { objective: { type: 'choice', choice: 'target_a', confidence: 0.9 } },
            usage: { input_tokens: 400 } }) };
      }
      return { ok: false, status, headers, json: async () => ({}) };
    }
  });
  return { decide, calls, slept, at: () => t, advance: (ms) => { t += ms; } };
}

// A 429 that clears on the retry is a recovery, not a failure.
{
  const r = rig([429, 200]);
  const answer = await r.decide({ state: {}, questions: {} });
  check('recovers from a 429', answer.objective === 'target_a');
  check('attempts counted apart from decisions', r.decide.http.attempts === 2 && r.decide.http.retries === 1);
  check('it really did retry', r.calls.length === 2);
  check('and waited before doing so', r.slept.length === 1 && r.slept[0] === 150);
  check('the model that answered is reported', answer.model === 'jev-1.13.0');
}

// 529 is the other retryable one.
{
  const r = rig([529, 529, 200]);
  const answer = await r.decide({ state: {}, questions: {} });
  check('recovers from repeated 529s', answer.objective === 'target_a');
  check('backoff is exponential', JSON.stringify(r.slept) === '[150,300]');
}

// Two retries and no more. Three failures is a failure.
{
  const r = rig([429, 429, 429]);
  let threw = null;
  try { await r.decide({ state: {}, questions: {} }); } catch (e) { threw = e; }
  check('gives up after the cap', /rate limited \(429\)/.test(threw?.message || ''));
  check('exactly three attempts — the original and two retries', r.calls.length === 3);
  check('the message says how many retries were spent', /after 2 retries/.test(threw?.message || ''));
}

{
  const r = rig([529, 529, 529]);
  let threw = null;
  try { await r.decide({ state: {}, questions: {} }); } catch (e) { threw = e; }
  check('529 exhaustion is named distinctly', /overloaded \(529\)/.test(threw?.message || ''));
  check('still capped at three attempts', r.calls.length === 3);
}

// Nothing else is retried — a 401 or a 422 fails the same way twice, and
// trying again only spends the deadline.
{
  for (const status of [400, 401, 403, 422, 500, 503]) {
    const r = rig([status, 200]);
    let threw = null;
    try { await r.decide({ state: {}, questions: {} }); } catch (e) { threw = e; }
    check(status + ' is not retried', threw !== null && r.calls.length === 1);
  }
}

// Retrying must not outlive the decision it answers.
{
  // 120ms of budget: the first attempt fails, and the 150ms backoff would
  // land past the deadline, so it gives up instead of sleeping through it.
  const r = rig([429, 200], { signalMs: 120 });
  let threw = null;
  try { await r.decide({ state: {}, questions: {} }); } catch (e) { threw = e; }
  check('no budget left to retry is its own message', /no budget left/.test(threw?.message || ''));
  check('the retry never went out', r.calls.length === 1);
  check('and it did not sleep through the deadline', r.slept.length === 0);
}

// Retry-After wins over the backoff curve when the server sends a usable one.
{
  const r = rig([{ status: 429, retryAfter: 1 }, 200], { signalMs: 5000 });
  const answer = await r.decide({ state: {}, questions: {} });
  check('Retry-After honoured over the default backoff',
    answer.objective === 'target_a' && r.slept[0] === 1000);

  const junk = rig([{ status: 429, retryAfter: 'Wed, 21 Oct 2026 07:28:00 GMT' }, 200]);
  await junk.decide({ state: {}, questions: {} });
  check('an HTTP-date Retry-After falls back to the backoff curve', junk.slept[0] === 150);
}

// Retrying can be switched off entirely.
{
  const r = rig([429, 200], { maxRetries: 0 });
  let threw = null;
  try { await r.decide({ state: {}, questions: {} }); } catch (e) { threw = e; }
  check('maxRetries 0 means one attempt', r.calls.length === 1 && threw !== null);
}

// The endpoint is overridable, which is how the recorder keeps the real key
// in Node and off the page.
{
  let seen = null;
  const decide = typesafeJev({ apiKey: 'sentinel', url: 'http://127.0.0.1:4173/v1/systemone',
    fetchImpl: async (u) => { seen = u; return { ok: true, status: 200, headers: { get: () => null },
      json: async () => ({ answers: { objective: { choice: 'hold' } } }) }; } });
  await decide({ state: {}, questions: {} });
  check('a same-origin proxy URL is used when given',
    seen === 'http://127.0.0.1:4173/v1/systemone');
}

// --- The shared mapper handles both envelopes ------------------------------
{
  const bare = mapJevAnswer({ answers: { objective: { type: 'choice', choice: 'target_a', confidence: 0.5 } },
    usage: { input_tokens: 10 } });
  const wrapped = mapJevAnswer({ result: { answers: { objective: { type: 'choice', choice: 'target_a', confidence: 0.5 } },
    usage: { input_tokens: 10 } }, success: true });
  check('bare and wrapped map identically', JSON.stringify(bare) === JSON.stringify(wrapped));

  check('a missing objective is invalid, not a throw', mapJevAnswer({ answers: {} }).valid === false);
  check('junk maps to invalid', mapJevAnswer(null).valid === false && mapJevAnswer(null).objective === null);
  check('"none" power means saved',
    mapJevAnswer({ answers: { objective: { choice: 'hold' }, power: { choice: 'none' } } }).power === 'none');
  check('a real power comes through',
    mapJevAnswer({ answers: { objective: { choice: 'hold' }, power: { choice: 'phase' } } }).power === 'phase');
  check('an unknown posture defaults to balanced',
    mapJevAnswer({ answers: { objective: { choice: 'hold' }, posture: { choice: 'reckless' } } }).posture === 'balanced');
  check('a 200 with no objective is returned (and billed), not thrown',
    mapJevAnswer({ answers: { move: { choice: 'up' } }, usage: { input_tokens: 5 } }).usage.input_tokens === 5);
  check('cost helper shared', jevCostUsd(1e6) === 0.042);
}

console.log('jevTypesafe: ' + passed + ' assertions passed');
