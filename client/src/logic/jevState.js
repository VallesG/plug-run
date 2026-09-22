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
//
// WHAT JEV REMEMBERS
// Only fair tactical history, and only for the house it is on: where it died
// and on which posture (ctx.deaths). Never which bag paid out or turned out
// bunk — the real bag rerolls every attempt, so that would be worthless as
// well as unfair — and the death record holds a cell and a posture, nothing
// about bags. What reaches the payload is counted per route: "3 deaths on the
// way to this bag", computed from positions the same way for both bags.
//
// WHAT JEV IS TOLD PER CHOICE
// The facts that decide a route — how far, how far on from there to the car,
// how close the plug sits to it, whether it is in a firing lane, how many
// deaths it has cost this house — are written into each choice's
// description, and the choices are listed safest-first by a risk score built
// from those same facts. The ordering and
// the wording are position-only, so the swap test still holds. The model
// still decides; it no longer has to cross-reference a bare "bag A" against
// a table to do it.

import { distTo, legalObjectives, pathDistances, routeFacts } from './jevStrategy.js';

const POSTURE_HINT = {
  safe: 'Keep out of firing lanes, longer routes',
  balanced: 'Default routing',
  aggressive: 'Shortest route, accept exposure'
};
const POSTURES = ['safe', 'balanced', 'aggressive'];
const ROUTE_HINT = {
  direct: 'Shortest route; accepts exposure',
  covered: 'Small detour to reduce firing-lane exposure',
  evasive: 'Widest escape route; strongly avoids the plug and firing lanes'
};

// A plug is offered as a reason to wait only this close (walking steps).
export const HOLD_PLUG_STEPS = 6;
// A posture that has died this many more times in the house than the
// least-died posture is not offered until the others catch up. In the first
// runs the model answered "balanced" on every attempt of a 20-death house
// however the list was ordered or described; this makes it try another.
export const POSTURE_ROTATE_DEATHS = 3;
// A death counts against a route when it lies on it: no more than this many
// steps longer than the direct walk, or this close to the destination.
const ROUTE_SLACK = 3;
const NEAR_STEPS = 3;

const round1 = (n) => Math.round(n * 10) / 10;
const plural = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** Deaths this house that lay on the way from the runner to `cell`. */
function deathsOnRoute(view, dist, cell, deaths, from = null) {
  if (!deaths.length || !cell) return 0;
  const toCell = distTo(dist, cell);
  from = from || pathDistances(view, cell);
  let n = 0;
  for (const d of deaths) {
    const back = distTo(from, d.cell);
    if (back == null) continue;
    const there = distTo(dist, d.cell);
    if (back <= NEAR_STEPS || (there != null && toCell != null && there + back <= toCell + ROUTE_SLACK)) n++;
  }
  return n;
}

/**
 * Lower is better: short, away from the plug, out of lanes, not where Jev
 * died. Half the walk on to the car counts too — whichever bag turns out to
 * pay, the bag that is on the way out is the cheaper one to have gone to.
 */
export function routeRisk(t) {
  const plug = t.plug == null ? 0 : t.plug <= 2 ? 14 : t.plug <= 4 ? 8 : t.plug <= 6 ? 3 : 0;
  return (t.dist ?? 99) + (t.car ?? 0) / 2 + plug + (t.exposed ? 3 : 0) + 10 * (t.died || 0);
}

function routeLine(what, t) {
  const parts = [`${what}, ${t.dist == null ? '? steps' : plural(t.dist, 'step')}`];
  if (t.car != null) parts.push(`then ${plural(t.car, 'step')} to the car`);
  if (t.plug != null) parts.push(`plug ${plural(t.plug, 'step')} from it`);
  if (t.exposed) parts.push('in a firing lane');
  if (t.died) parts.push(`${plural(t.died, 'death')} on this route this house`);
  return parts.join('; ');
}

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
 * @param ctx   { dist, plugDists, trigger, plan: { objective, posture, route, ageMs,
 *                progress }, deaths } — `dist` is walking distance from the
 *                runner, `plugDists` one map per live plug, `deaths` this
 *                house's earlier deaths as [{ cell, carrying, posture }]
 * @returns {{state, questions}} ready for Jev's `input`
 */
export function jevState(view, ctx = {}) {
  if (!view || !view.runner) return null;
  const dist = ctx.dist || new Map();
  const plugDists = ctx.plugDists || [];
  const exposed = (c) => !!view.exposedAt?.(c);
  const plan = ctx.plan || {};
  const deaths = (ctx.deaths || []).filter((d) => d && d.cell);

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
      route: plan.route ?? 'covered',
      ageS: round1((plan.ageMs ?? 0) / 1000),
      progress: plan.progress ?? 'none'
    },
    event: ctx.trigger ?? 'house_start',
    deaths: {
      here: deaths.length,
      carrying: deaths.filter((d) => d.carrying).length,
      ...POSTURES.reduce((acc, p) => (acc[p] = deaths.filter((d) => d.posture === p).length, acc), {})
    }
  };

  const toBag = deaths.filter((d) => !d.carrying);
  const toCar = deaths.filter((d) => d.carrying);
  if (!view.carrying) {
    state.targets = view.candidates.map((c) => {
      const from = pathDistances(view, c.cell);
      return {
        id: c.id,
        dist: distTo(dist, c.cell),
        car: view.extract ? distTo(from, view.extract) : null,
        plug: plugNear(view, plugDists, c.cell),
        exposed: exposed(c.cell),
        died: deathsOnRoute(view, dist, c.cell, toBag, from)
      };
    });
  }
  if (view.extract) {
    state.extract = {
      available: !!view.carrying,
      dist: distTo(dist, view.extract),
      plug: plugNear(view, plugDists, view.extract),
      exposed: exposed(view.extract),
      died: view.carrying ? deathsOnRoute(view, dist, view.extract, toCar) : 0
    };
  }

  // Aggregate route facts, never directions or coordinates. Jev selects a
  // route profile; jevStrategy deterministically creates the actual path.
  state.routes = {};
  const destinations = view.carrying
    ? (view.extract ? [{ id: 'extract', cell: view.extract }] : [])
    : view.candidates;
  for (const destination of destinations) {
    state.routes[destination.id] = {};
    for (const style of ['direct', 'covered', 'evasive']) {
      state.routes[destination.id][style] = routeFacts(view, view.runner, destination.cell, style, plugDists);
    }
  }

  // `choice` criteria is an OBJECT of key -> description. (Arrays are the
  // `score` primitive's shape; passing one here is silently the wrong type.)
  // Destinations, safest first; the stable sort keeps A before B on a tie.
  const routes = view.carrying
    ? (state.extract ? [{ id: 'extract', what: 'Car', ...state.extract }] : [])
    : state.targets.map((t) => ({ ...t, what: 'Bag' }));
  routes.sort((a, b) => routeRisk(a) - routeRisk(b));
  const legal = legalObjectives(view);
  const criteria = {};
  for (const r of routes) if (legal.includes(r.id)) criteria[r.id] = routeLine(r.what, r);
  // Waiting only makes sense with a plug close enough to wait out.
  const near = state.threat.nearest;
  if (legal.includes('hold') && near != null && near <= HOLD_PLUG_STEPS) {
    criteria.hold = `Wait briefly for the plug ${plural(near, 'step')} away to move off`;
  }
  // Postures least tried-and-died first, and one that keeps dying is rested.
  const fewest = Math.min(...POSTURES.map((p) => state.deaths[p]));
  const postures = POSTURES.filter((p) => state.deaths[p] - fewest < POSTURE_ROTATE_DEATHS)
    .sort((a, b) => state.deaths[a] - state.deaths[b]);
  const questions = {
    objective: {
      type: 'choice',
      instructions: view.carrying
        ? 'The runner has the bag. Head for the car now, or wait for the plug?'
        : 'Two identical bags; only one pays out, chosen at random each attempt. ' +
          'Short routes away from the plug survive. Which bag first?',
      criteria
    },
    posture: {
      type: 'choice',
      instructions: 'How cautiously should the route treat exposure to the plugs?',
      criteria: postures.reduce((acc, p) => (acc[p] = POSTURE_HINT[p] +
        (state.deaths[p] ? `; ${plural(state.deaths[p], 'death')} with it this house` : ''), acc), {})
    },
    route: {
      type: 'choice',
      instructions: 'Choose the path profile for the objective you selected. Compare its exact facts in state.routes.',
      criteria: Object.fromEntries(Object.entries(ROUTE_HINT))
    }
  };
  // Only ask about a power when one could actually be spent. A decoy while a
  // decoy is out does nothing, so it is not offered.
  const spendable = ready.filter((p, i, a) => a.indexOf(p) === i && !(p === 'decoy' && view.decoyActive));
  if (spendable.length) {
    const powerCriteria = {};
    if (!view.carrying) {
      if (spendable.includes('phase') && (state.threat.inLane || (state.threat.nearest ?? 99) <= 6)) {
        powerCriteria.phase_intercept = 'Arm phase only if the plug traps the approach; fire on the intercept';
      }
      if (spendable.includes('decoy') && (state.threat.nearest ?? 99) <= 18) {
        powerCriteria.decoy_pressure = 'Deploy when the plug is in sight to pull fire off the approach';
      }
      powerCriteria.none = 'Preserve dash and other escape powers until a pickup succeeds';
    } else {
      if (spendable.includes('phase')) powerCriteria.phase_intercept = 'Phase on a predicted intercept or exposed crossing while carrying';
      if (spendable.includes('dash')) {
        powerCriteria.dash_escape = 'Dash when the plug closes on the escape route';
        powerCriteria.dash_finish = 'Dash on the final clear run to the car';
      }
      if (spendable.includes('decoy')) powerCriteria.decoy_pressure = 'Deploy when the plug can pressure the escape route';
      const risky = state.threat.inLane || (state.threat.nearest ?? 99) <= 10 ||
        state.deaths.carrying > 0 || state.extract?.exposed || (state.extract?.plug ?? 99) <= 6;
      if (!risky) powerCriteria.none = 'Save only because this escape is presently low risk';
    }
    // Do not spend a question merely to make Jev answer "none". In
    // particular, dash is never offered before the bag proves real.
    if (Object.keys(powerCriteria).some((k) => k !== 'none')) {
      questions.power = {
        type: 'choice',
        instructions: view.carrying
          ? 'Choose a conditional power plan for the escape. Getting caught with powers unused is worse than spending one.'
          : 'Choose a conditional approach power. Do not spend dash before a pickup succeeds.',
        criteria: powerCriteria
      };
    }
  }

  return { state, questions };
}
