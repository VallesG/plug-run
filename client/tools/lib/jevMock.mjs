// A deterministic stand-in for Jev, for free integration runs.
//
//   node tools/rivals-record.mjs ... --jevMock
//
// The recorder answers the page's same-origin /v1/systemone with this instead
// of forwarding to TypeSafe: same request body in, same response shape out
// (`answers.<question>.choice`), so the page runs exactly the code path a
// paid run does. No network, no key, and nothing billed — usage reports zero
// input tokens, so the strategist's tokenSource stays 'estimated' and no
// figure from a mocked run can be quoted as spend.
//
// THE SCRIPT
// A pure function of the payload, so the same board gets the same answer. It
// is meant to be a plausible strategy, not a clever one, and to exercise
// every part of the interface:
//   objective  carrying -> extract (hold only if a plug sits on the car)
//              otherwise bag A on odd houses, bag B on even houses, swapped
//              on every second attempt — so both labels are chosen and
//              followed, and a retry does not replay the same choice
//   posture    safe when carrying with a plug within 6; aggressive when no
//              plug is within 10 and the runner is empty-handed; else balanced
//   power      ARMS a power (the motor picks the instant): the first ready
//              power on house 2's opening request, scripted; otherwise phase
//              when a plug is within 6 or the runner was just hit, dash when
//              a plug is within 10, decoy when one is within 14; 'none'
//              (save) when nothing is close
// It answers only the questions it was asked, with only legal choices, and
// never anything that could be read as a direction.

export const MOCK_MODEL = 'mock-strategist-1';

function pick(criteria, prefer) {
  const legal = Object.keys(criteria || {});
  for (const p of prefer) if (legal.includes(p)) return p;
  return legal[0] ?? null;
}

export function mockAnswer({ state = {}, questions = {} } = {}) {
  const house = state.house ?? 1;
  const attempt = state.attempt ?? 1;
  const near = state.threat?.nearest;
  const carrying = !!state.runner?.carrying;
  const answers = {};

  if (questions.objective) {
    const crit = questions.objective.criteria;
    let objective;
    if (carrying) {
      const camped = state.extract?.plug != null && state.extract.plug <= 1 && state.event !== 'expired';
      objective = pick(crit, camped ? ['hold', 'extract'] : ['extract', 'hold']);
    } else {
      const flip = Math.floor((attempt - 1) / 2) % 2 === 1;
      const odd = house % 2 === 1;
      const first = (odd !== flip) ? 'target_a' : 'target_b';
      objective = pick(crit, [first, first === 'target_a' ? 'target_b' : 'target_a', 'hold']);
    }
    answers.objective = { type: 'choice', choice: objective, confidence: 0.9 };
  }

  if (questions.posture) {
    const posture = carrying && near != null && near <= 6 ? 'safe'
      : !carrying && (near == null || near > 10) ? 'aggressive' : 'balanced';
    answers.posture = { type: 'choice', choice: pick(questions.posture.criteria, [posture]), confidence: 0.8 };
  }

  if (questions.power) {
    const ready = Object.keys(questions.power.criteria).filter((k) => k !== 'none');
    let power = 'none';
    if (house === 2 && state.event === 'house_start' && ready.length) power = ready[0];
    else if ((state.event === 'damage' || (near != null && near <= 6)) && ready.includes('phase')) power = 'phase';
    else if (near != null && near <= 10 && ready.includes('dash')) power = 'dash';
    else if (near != null && near <= 14 && ready.includes('decoy')) power = 'decoy';
    answers.power = { type: 'choice', choice: pick(questions.power.criteria, [power, 'none']), confidence: 0.7 };
  }

  return { answers, model: MOCK_MODEL, usage: { input_tokens: 0 } };
}
