// Read a Jev response, whichever door it came through.
//
// The two routes differ in the REQUEST body and nothing else:
//   TypeSafe direct   POST api.typesafe.ai/v1/systemone   { state, model, questions }
//   Cloudflare        POST .../ai/run                     { model, input:{ state, questions } }
//
// The RESPONSE is the same either way, except Cloudflare's REST endpoint wraps
// it in { result, success, errors }. One mapper for both, so a fix to either
// route cannot quietly miss the other.
//
// Pure and dependency-free: it is the part worth testing without a network.

/**
 * @param body   parsed JSON from either route
 * @returns { move, power, confidence, model, usage } — move is null when
 *          unusable. `model` is the version that answered, which matters
 *          because 'jev-latest' is an alias that moves.
 */
export function mapJevAnswer(body) {
  const out = body?.result ?? body;
  const answers = out?.answers;
  const move = answers?.move;
  if (!move || typeof move.choice !== 'string') {
    return { move: null, power: null, confidence: null, model: out?.model || null, usage: out?.usage || null };
  }
  return {
    move: move.choice,
    // 'none' is a real answer meaning "save it", not an absent one.
    power: answers.power?.choice && answers.power.choice !== 'none' ? answers.power.choice : null,
    confidence: Number.isFinite(move.confidence) ? move.confidence : null,
    model: out.model || null,
    usage: out.usage || null
  };
}

export const JEV_INPUT_USD_PER_MTOK = 0.042;   // output tokens are not billed

/** Dollars for a run, from the API's own token counts. */
export function jevCostUsd(inputTokens) {
  return (Number(inputTokens) || 0) / 1e6 * JEV_INPUT_USD_PER_MTOK;
}
