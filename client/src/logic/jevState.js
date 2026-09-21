// The payload Jev decides on: a strategic summary, never a steering problem.
//
// Pure and dependency-free so it can be exercised under plain Node against a
// stub view, like everything else in logic/.
//
// THREE RULES SHAPE THIS FILE.
//
// 1. IT MAY NOT LEAK WHAT A PLAYER CANNOT SEE. The scene stores the real bag
//    as `stash` and the decoy as `bunkStash`. The view this reads has already
//    dropped those names (BotDriver._jevView hands over bare cells), and the
//    two bags go out as target_a / target_b in row-then-column order. Every
//    number attached to a bag is computed the same way for both, so swapping
//    which one is real cannot change a single byte of the payload — and there
//    is a test that swaps them and compares.
//
// 2. IT ASKS FOR STRATEGY, NOT STEERING. No open-direction list, no local
//    grid, no coordinates to steer by. Jev is asked which objective, what
//    posture, and whether to spend a power; the runner AI does the walking.
//
// 3. EVERY FIELD COSTS MONEY. Short keys, integers, no prose in the state.
//    Requests are event-driven (JevStrategist), so this goes out tens of times
//    a race rather than several times a second, but it is still billed.

import { distTo, legalObjectives } from './jevStrategy.js';

// The game's own wording for each power, so the model is told what a player
// is told.
const POWER_HINT = {
  phase: 'Through walls & bullets',
  dash: 'Burst out of danger',
  decoy: 'Double draws their fire'
};

const OBJECTIVE_HINT = {
  target_a: 'Go for bag A',
  target_b: 'Go for bag B',
  extract: 'Carry it to the car',
  hold: 'Wait here briefly'
};

const POSTURE_HINT = {
  safe: 'Avoid open lanes, longer routes',
  balanced: 'Default routing',
  aggressive: 'Shortest route, accept exposure'
};

const round1 = (n) => Math.round(n * 10) / 10;

/** Nearest live plug's walking distance to a cell, or null. */
function plugNear(view, distFromPlugs, cell) {
  let best = null;
  for (const d of distFromPlugs) {
    const v = distTo(d, cell);
    if (v != null && (best == null || v < best)) best = v;
  }
  return best;
}

/**
 * @param view  BotDriver._jevView(): cells and flags, no bag identities
 * @param ctx   { dist, plugDists, trigger, plan: { objective, posture, ageMs,
 *                progress } } — `dist` is walking distance from the runner,
 *                `plugDists` one map per live plug
 * @returns {{state, questions}} ready for Jev's `input`
 */
export function jevState(view, ctx = {}) {
  if (!view || !view.runner) return null;
  const dist = ctx.dist || new Map();
  const plugDists = ctx.plugDists || [];
  const exposed = (c) => !!view.exposedAt?.(c);
  const plan = ctx.plan || {};

  const ready = [];
  const spent = [];
  (view.powers?.selected || []).forEach((p, i) => {
    if (!p) return;
    (view.powers.consumed?.[i] ? spent : ready).push(p);
  });

  const state = {
    house: view.house ?? 1,
    attempt: view.attempt ?? 1,
    runner: { hp: view.hp ?? 0, carrying: !!view.carrying, phasing: !!view.phasing },
    threat: {
      nearest: plugNear(view, plugDists, view.runner),
      count: plugDists.length,
      inLane: !!view.inLane
    },
    decoyOut: !!view.decoyActive,
    powers: { ready, spent },
    plan: {
      objective: plan.objective ?? 'none',
      posture: plan.posture ?? 'balanced',
      ageS: round1((plan.ageMs ?? 0) / 1000),
      progress: plan.progress ?? 'none'
    },
    event: ctx.trigger ?? 'house_start'
  };

  if (!view.carrying) {
    state.targets = view.candidates.map((c) => ({
      id: c.id,
      dist: distTo(dist, c.cell),
      plug: plugNear(view, plugDists, c.cell),
      exposed: exposed(c.cell)
    }));
  }
  if (view.extract) {
    state.extract = {
      available: !!view.carrying,
      dist: distTo(dist, view.extract),
      plug: plugNear(view, plugDists, view.extract),
      exposed: exposed(view.extract)
    };
  }

  // `choice` criteria is an OBJECT of key -> description. (Arrays are the
  // `score` primitive's shape; passing one here is silently the wrong type.)
  const objectives = legalObjectives(view);
  const questions = {
    objective: {
      type: 'choice',
      instructions: view.carrying
        ? 'The runner has the bag. Head for the car now, or wait briefly?'
        : 'Two identical bags; only one pays out. Which should the runner go for?',
      criteria: objectives.reduce((acc, k) => (acc[k] = OBJECTIVE_HINT[k], acc), {})
    },
    posture: {
      type: 'choice',
      instructions: 'How cautiously should the route treat exposure to the plugs?',
      criteria: { ...POSTURE_HINT }
    }
  };
  // Only ask about a power when one could actually be spent. A decoy while a
  // decoy is out does nothing, so it is not offered.
  const spendable = ready.filter((p, i, a) => a.indexOf(p) === i && !(p === 'decoy' && view.decoyActive));
  if (spendable.length) {
    questions.power = {
      type: 'choice',
      instructions: 'Spend a power now, or save it? Each is single use.',
      criteria: spendable.reduce((acc, p) => (acc[p] = POWER_HINT[p] || p, acc),
        { none: 'Save them for later' })
    };
  }

  return { state, questions };
}
