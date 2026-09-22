// Read a Jev response, whichever door it came through.
//
// The two routes differ in the REQUEST body and nothing else:
//   TypeSafe direct   POST api.typesafe.ai/v1/systemone   { state, model, questions }
//   Cloudflare        POST .../ai/run                     { model, input:{...} }
//
// The RESPONSE is the same either way, except Cloudflare's REST endpoint wraps
// it in { result, success, errors }. One mapper for both, so a fix to either
// route cannot quietly miss the other.
//
// A STRATEGY, NEVER A MOVE
// The output has exactly these decision fields: objective, posture, route,
// powerPlan, power and confidence,
// confidences, model, usage, valid, reason. A response that also carries a
// movement answer (an old prompt, a model improvising) has it DROPPED here —
// it is not copied, not mapped, not looked at again — and `strayMovement`
// says it happened so it can be counted.
//
// Pure and dependency-free: it is the part worth testing without a network.

import { OBJECTIVES, POSTURES, ROUTES, POWER_PLANS, powerForPlan, MOVEMENT_KEYS } from './jevStrategy.js';

const choiceOf = (a) => (a && typeof a.choice === 'string' ? a.choice : null);
const confOf = (a) => (a && Number.isFinite(a.confidence) ? a.confidence : null);

/**
 * @param body   parsed JSON from either route
 * @returns {{ objective, posture, power, confidence, confidences, model,
 *   usage, valid, reason, strayMovement }}
 *   valid is false when there is no usable objective; `reason` says why.
 *   `model` is the version that answered, which matters because 'jev-latest'
 *   is an alias that moves.
 */
export function mapJevAnswer(body) {
  const out = body?.result ?? body;
  const answers = out?.answers && typeof out.answers === 'object' ? out.answers : {};
  const model = typeof out?.model === 'string' ? out.model : null;
  const usage = out?.usage && typeof out.usage === 'object' ? { ...out.usage } : null;
  const strayMovement = MOVEMENT_KEYS.some((k) => k in answers);

  const objective = choiceOf(answers.objective);
  const rawPosture = choiceOf(answers.posture);
  const rawRoute = choiceOf(answers.route);
  const rawPower = choiceOf(answers.power);
  const posture = POSTURES.includes(rawPosture) ? rawPosture : 'balanced';
  const route = ROUTES.includes(rawRoute) ? rawRoute : 'covered';
  // 'none' is a real answer meaning "save it", not an absent one; anything
  // unrecognised is treated the same way rather than guessed at.
  const powerPlan = POWER_PLANS.includes(rawPower) || ['phase', 'dash', 'decoy'].includes(rawPower)
    ? rawPower : 'none';
  const power = powerForPlan(powerPlan);
  const confidences = {
    objective: confOf(answers.objective),
    posture: confOf(answers.posture),
    route: confOf(answers.route),
    power: confOf(answers.power)
  };

  let reason = null;
  if (!objective) reason = 'no-objective';
  else if (!OBJECTIVES.includes(objective)) reason = 'bad-objective';

  return {
    objective: reason ? null : objective,
    posture,
    route,
    power,
    powerPlan,
    confidence: confidences.objective,
    confidences,
    model,
    usage,
    valid: !reason,
    reason,
    strayMovement
  };
}

export const JEV_INPUT_USD_PER_MTOK = 0.042;   // output tokens are not billed

/** Dollars for a run, from the API's own token counts. */
export function jevCostUsd(inputTokens) {
  return (Number(inputTokens) || 0) / 1e6 * JEV_INPUT_USD_PER_MTOK;
}
