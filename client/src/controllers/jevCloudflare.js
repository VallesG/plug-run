// A decide() for JevDriver, backed by Jev on Cloudflare Workers AI.
//
// Request shape, from Cloudflare's model docs:
//   POST /client/v4/accounts/{account}/ai/run
//   { "model": "typesafe/jev", "input": { state, questions } }
//
// Answers come back keyed by question name, typed to the primitive asked:
//   answers.move  = { type:'choice', choice:'left', confidence:0.8, probabilities:{...} }
//   answers.power = { type:'choice', choice:'none',  confidence:0.9, probabilities:{...} }
//
// `usage.input_tokens` is the real billing figure, so the driver reports spend
// from the API rather than from a character-count guess.

import { mapJevAnswer } from '../logic/jevAnswer.js';

export const JEV_MODEL = 'typesafe/jev';
export { JEV_INPUT_USD_PER_MTOK, jevCostUsd } from '../logic/jevAnswer.js';

/**
 * @param accountId  Cloudflare account id
 * @param apiToken   Cloudflare API token with Workers AI access
 * @param gatewayId  AI Gateway id. REQUIRED to spend prepaid credits: without
 *                   it the call bills Workers Paid neurons instead of the
 *                   balance you topped up. The gateway's Workers AI Billing
 *                   setting must also be "Unified billing".
 * @param fetchImpl  injectable for tests
 * @param signalMs   abort a request that outlives the driver's own timeout
 * @returns async ({state, questions}) => { move, power, confidence, usage }
 */
export function cloudflareJev({ accountId, apiToken, gatewayId, fetchImpl, signalMs = 2000 } = {}) {
  if (!accountId || !apiToken) throw new Error('cloudflareJev needs accountId and apiToken');
  const doFetch = fetchImpl || globalThis.fetch;
  if (!doFetch) throw new Error('no fetch available');
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`;

  return async function decide(payload) {
    // Abort rather than let a stalled socket outlive the decision it answers.
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), signalMs) : null;
    let res;
    try {
      res = await doFetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          // Routes the call through the gateway so it draws on prepaid
          // credits; omitted, the same request bills neurons instead.
          ...(gatewayId ? { 'cf-aig-gateway-id': gatewayId } : {})
        },
        body: JSON.stringify({ model: JEV_MODEL, input: payload }),
        signal: ctrl?.signal
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!res?.ok) throw new Error('jev http ' + (res?.status ?? '?'));

    const answer = mapJevAnswer(await res.json());
    if (!answer.move) throw new Error('jev returned no move answer');
    return answer;
  };
}
