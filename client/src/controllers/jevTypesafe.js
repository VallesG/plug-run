import { mapJevAnswer } from '../logic/jevAnswer.js';

// A decide() for JevDriver, backed by TypeSafe's own API.
//
//   POST https://api.typesafe.ai/v1/systemone
//   Authorization: Bearer <TYPESAFE_API_KEY>
//   { "state": ..., "model": "jev-latest", "questions": { ... } }
//
// Note the body is FLAT here. Cloudflare's Workers AI route nests the same
// two fields under `input` because that is its env.AI.run(model, input)
// convention; posting Cloudflare's shape to this endpoint sends a request
// with no state at all.
//
// Going direct avoids Cloudflare's 5% credit fee. Against that, TypeSafe's
// Purchased Credits expire 12 months after purchase and are non-refundable,
// so buy small and often rather than once and large.

export const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
export const JEV_MODEL = 'jev-latest';

/**
 * @param apiKey     TypeSafe API key
 * @param model      pin a version (e.g. 'jev-1.13.0') to stop an alias moving
 *                   the answers under a tuned confidence threshold
 * @param fetchImpl  injectable for tests
 * @param signalMs   abort a request that outlives the decision it answers
 */
export function typesafeJev({ apiKey, model = JEV_MODEL, fetchImpl, signalMs = 2000 } = {}) {
  if (!apiKey) throw new Error('typesafeJev needs an apiKey');
  const doFetch = fetchImpl || globalThis.fetch;
  if (!doFetch) throw new Error('no fetch available');

  return async function decide({ state, questions }) {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), signalMs) : null;
    let res;
    try {
      res = await doFetch(TYPESAFE_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, model, questions }),
        signal: ctrl?.signal
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
    // 429 is its own case: the rate limit is 1,200 req/min and we use ~300, so
    // seeing one means something is wrong with our pacing, not with capacity.
    if (res?.status === 429) throw new Error('jev rate limited (429)');
    if (!res?.ok) throw new Error('jev http ' + (res?.status ?? '?'));

    const answer = mapJevAnswer(await res.json());
    if (!answer.move) throw new Error('jev returned no move answer');
    return answer;
  };
}
