// Build a JevDriver from the page, if the page asked for one.
//
// Returns null unless ?jev=1 is on the URL, so a normal player's build never
// constructs one and never issues a request. Same posture as the bot harness
// it plugs into: off is not there at all.
//
// WHERE THE KEY COMES FROM, AND WHY NOT AN ENV VAR
// Vite inlines import.meta.env.VITE_* into the bundle at build time. A key
// put there would end up in whatever dist/ someone later deployed, and the
// first sign of it would be the bill. So the key is read at RUNTIME from
// window.__JEV_KEY or sessionStorage, both of which the spike harness sets
// per browser session and neither of which can survive into a build artifact.
//
// Both routes reach the same model. TypeSafe direct avoids Cloudflare's 5%
// credit fee; Cloudflare is there for an account whose credit already sits
// with Cloudflare.

import JevDriver from './JevDriver.js';
import { typesafeJev } from './jevTypesafe.js';
import { cloudflareJev } from './jevCloudflare.js';

const SESSION_KEYS = {
  key: 'jevKey',
  account: 'jevAccount',
  gateway: 'jevGateway'
};

function fromSession(name) {
  try { return window.sessionStorage?.getItem(SESSION_KEYS[name]) || null; }
  catch { return null; }   // private mode, blocked storage — not an error here
}

/** Query flags and credentials, or null when Jev is off. */
export function jevConfig() {
  try {
    if (typeof window === 'undefined') return null;
    const p = new URLSearchParams(window.location.search);
    if (p.get('jev') !== '1') return null;

    const num = (name, fallback) => {
      const v = Number(p.get(name));
      return Number.isFinite(v) && v > 0 ? v : fallback;
    };

    return {
      route: p.get('jevRoute') === 'cloudflare' ? 'cloudflare' : 'typesafe',
      // Post to a same-origin path instead of api.typesafe.ai. The Node
      // recorder intercepts that path and forwards the body with the real
      // key, so the page never holds one -- and, because the request never
      // leaves the origin, there is no CORS preflight to go wrong either.
      proxy: p.get('jevProxy') === '1',
      // Safety ceilings, passed through to the driver. See JevDriver.DEFAULTS.
      maxRequests: num('jevMaxRequests', undefined),
      maxInputTokens: num('jevMaxInputTokens', undefined),
      // Pin a version to stop an alias moving the answers under a threshold
      // tuned against a different one.
      model: p.get('jevModel') || null,
      apiKey: window.__JEV_KEY || fromSession('key'),
      accountId: window.__JEV_ACCOUNT || fromSession('account'),
      gatewayId: window.__JEV_GATEWAY || fromSession('gateway'),
      minIntervalMs: num('jevIntervalMs', undefined),
      timeoutMs: num('jevTimeoutMs', undefined)
    };
  } catch { return null; }
}

/**
 * @returns {JevDriver|null} one driver for the whole session, so its cost and
 *   answer-rate figures cover the batch rather than the last house.
 */
export function makeJevDriver(cfg = jevConfig()) {
  if (!cfg) return null;
  if (!cfg.apiKey) {
    // Loud, because the alternative is a session that looks like a Jev run
    // and is quietly the pathfinder the whole way through.
    console.error('[JEV] ?jev=1 but no key. Set sessionStorage.jevKey (or window.__JEV_KEY) before the game boots.');
    return null;
  }

  const opts = {};
  if (cfg.minIntervalMs) opts.minIntervalMs = cfg.minIntervalMs;
  if (cfg.timeoutMs) opts.timeoutMs = cfg.timeoutMs;
  if (cfg.maxRequests) opts.maxRequests = cfg.maxRequests;
  if (cfg.maxInputTokens) opts.maxInputTokens = cfg.maxInputTokens;

  let decide;
  if (cfg.route === 'cloudflare') {
    if (!cfg.accountId) {
      console.error('[JEV] jevRoute=cloudflare needs sessionStorage.jevAccount (the Cloudflare account id).');
      return null;
    }
    if (!cfg.gatewayId) {
      // Not fatal — the call still works, it just bills the wrong pocket.
      console.warn('[JEV] no gateway id: this will bill Workers Paid neurons instead of your prepaid credits.');
    }
    decide = cloudflareJev({
      accountId: cfg.accountId, apiToken: cfg.apiKey, gatewayId: cfg.gatewayId || undefined,
      // Give up on the socket a little after the driver has stopped caring.
      signalMs: (opts.timeoutMs || 900) + 400
    });
  } else {
    decide = typesafeJev({
      apiKey: cfg.apiKey,
      ...(cfg.model ? { model: cfg.model } : {}),
      ...(cfg.proxy ? { url: window.location.origin + '/v1/systemone' } : {}),
      // Total budget across retries. A little over the driver's own timeout,
      // so a retry has somewhere to happen but cannot outlive the decision.
      signalMs: (opts.timeoutMs || 900) + 400
    });
  }

  console.log('[JEV] driver on —', JSON.stringify({
    route: cfg.route, proxied: !!cfg.proxy, model: cfg.model || 'default', ...opts }));
  return new JevDriver(decide, opts);
}

export default makeJevDriver;
