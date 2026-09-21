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

// The two statuses worth trying again: 429 is the rate limiter and 529 is the
// service asking for room. Everything else — 401, 422, 500 — will fail the
// same way on a second attempt, and retrying it just spends the deadline.
export const RETRY_STATUSES = [429, 529];
export const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 150;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * `Retry-After`, in ms, when the server sent a usable one.
 *
 * Only the delta-seconds form is honoured. The HTTP-date form is legal and
 * the clock skew between a browser and an API makes it worth less than the
 * backoff we would have used anyway.
 */
function retryAfterMs(res) {
  const raw = res?.headers?.get?.('retry-after');
  // Number(null) and Number('') are both 0, which would read as "retry
  // immediately" every time the header is absent. Require a real string.
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const secs = Number(raw);
  return Number.isFinite(secs) && secs >= 0 ? secs * 1000 : null;
}

/**
 * @param apiKey      TypeSafe API key
 * @param model       pin a version (e.g. 'jev-1.13.0') to stop an alias moving
 *                    the answers under a tuned confidence threshold
 * @param url         override the endpoint. The recorder points this at a
 *                    same-origin path so the browser never holds the real key
 *                    and never makes a cross-origin request; see
 *                    tools/rivals-record.mjs.
 * @param fetchImpl   injectable for tests
 * @param signalMs    TOTAL budget for the call including every retry and the
 *                    waits between them — not per attempt. A retrying adapter
 *                    that got signalMs each time would outlive the decision it
 *                    answers by three times over, and the driver would have
 *                    timed out and moved on long before the last attempt left.
 * @param maxRetries  at most MAX_RETRIES; 0 disables retrying
 * @param sleep       injectable so tests exercise backoff without waiting
 * @param now         injectable clock
 */
export function typesafeJev({
  apiKey, model = JEV_MODEL, url = TYPESAFE_URL, fetchImpl, signalMs = 2000,
  maxRetries = MAX_RETRIES, sleep = wait, now = () => Date.now()
} = {}) {
  if (!apiKey) throw new Error('typesafeJev needs an apiKey');
  const doFetch = fetchImpl || globalThis.fetch;
  if (!doFetch) throw new Error('no fetch available');
  const retries = Math.max(0, Math.min(maxRetries, MAX_RETRIES));

  return async function decide({ state, questions }) {
    const body = JSON.stringify({ state, model, questions });
    const deadline = now() + signalMs;
    let attempt = 0;

    for (;;) {
      const left = deadline - now();
      // Out of budget before the attempt even leaves: say so rather than
      // firing a request whose answer nobody is still waiting for.
      if (left <= 0) throw new Error('jev deadline exceeded');

      const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), left) : null;
      let res;
      try {
        res = await doFetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body,
          signal: ctrl?.signal
        });
      } finally {
        if (timer) clearTimeout(timer);
      }

      const status = res?.status;
      if (res?.ok) {
        const answer = mapJevAnswer(await res.json());
        if (!answer.move) throw new Error('jev returned no move answer');
        return answer;
      }

      const retryable = RETRY_STATUSES.includes(status) && attempt < retries;
      if (!retryable) {
        // Named distinctly so a caller can tell "we asked too fast" from
        // "the service is unwell" from "the request was wrong".
        if (status === 429) throw new Error('jev rate limited (429) after ' + attempt + ' retries');
        if (status === 529) throw new Error('jev overloaded (529) after ' + attempt + ' retries');
        throw new Error('jev http ' + (status ?? '?'));
      }

      // Exponential, and capped by what is left of the deadline. Waiting past
      // the deadline would burn the whole budget on sleeping and then throw
      // without having tried again, which is strictly worse than throwing now.
      const backoff = retryAfterMs(res) ?? BASE_BACKOFF_MS * Math.pow(2, attempt);
      if (now() + backoff >= deadline) {
        throw new Error('jev http ' + status + ' — no budget left to retry');
      }
      await sleep(backoff);
      attempt++;
    }
  };
}
