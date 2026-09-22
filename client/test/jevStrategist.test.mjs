// JevStrategist — when it asks, what it adopts, and what it refuses.
//
//   node client/test/jevStrategist.test.mjs
//
// Against a synthetic view and a scripted decide(), on a fake clock, so every
// timing rule is exercised exactly: one request in flight, a 1,500ms floor
// between dispatches that nothing can shorten, coalesced triggers, stale and
// late answers discarded, A/B commitment, the progress watchdog and its
// recovery, power validation, ceilings, and a report with nothing secret in it.

import { clock, flush, scriptedDecide, strategy, keyPaths } from './_jevWorld.mjs';
import JevStrategist, { DEFAULTS } from '../src/controllers/JevStrategist.js';
import { typesafeJev } from '../src/controllers/jevTypesafe.js';
import { mapJevAnswer } from '../src/logic/jevAnswer.js';
import { orderCandidates, MOVEMENT_KEYS } from '../src/logic/jevStrategy.js';
import { readFileSync } from 'node:fs';

let passed = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

/* ---------------- a synthetic board ---------------- */

// 20 x 20 open floor with a border. Bags at (10,3) and (10,16); car at (18,10).
function makeView(over = {}) {
  const cols = 20, rows = 20;
  const walls = new Set(over.walls || []);
  const isWalkable = (x, y) => x > 0 && y > 0 && x < cols - 1 && y < rows - 1 && !walls.has(x + ',' + y);
  const bags = over.bags ?? [{ x: 10, y: 3 }, { x: 10, y: 16 }];
  return {
    cols, rows, isWalkable,
    runner: over.runner ?? { x: 10, y: 10 },
    house: over.house ?? 1, houseKey: over.houseKey ?? '1:0', live: over.live ?? true, isRunner: true,
    hp: over.hp ?? 3, carrying: !!over.carrying, phasing: !!over.phasing, decoyActive: !!over.decoyActive,
    candidates: over.carrying ? [] : orderCandidates(bags),
    extract: over.extract ?? { x: 18, y: 10 },
    plugs: over.plugs ?? [],
    inLane: false,
    exposedAt: () => false,
    powers: over.powers ?? { selected: ['phase', 'dash'], consumed: [false, false] }
  };
}

const make = (answers, opts = {}) => {
  const decide = scriptedDecide(answers);
  const s = new JevStrategist(decide, { now: () => clock.t, rng: () => 0.5, ...opts });
  return { s, decide };
};
// Advance the clock and tick once; `view` may be a function of the clock.
async function run(s, view, ms, step = 50, hooks = {}) {
  const plans = [];
  for (let t = 0; t < ms; t += step) {
    clock.t += step;
    plans.push(s.tick(typeof view === 'function' ? view(clock.t) : view, hooks));
    await flush();
  }
  return plans;
}

console.log('\nJevStrategist\n');

// 1. The first request is a house_start, the answer is adopted, and the plan
//    is a PLACE — the bag it chose — with no direction anywhere in it.
{
  clock.t = 10_000;
  const { s, decide } = make([strategy('target_b')]);
  const v = makeView();
  s.tick(v);
  check('asks on the first live frame', decide.calls.length === 1);
  check('triggered by the house starting', s.report().triggers.requested.house_start === 1);
  await flush();
  const plan = s.tick(v);
  check('adopts the answer', s.report().strategies.adopted === 1);
  check('plan objective is bag B, from Jev', plan.objective.source === 'jev' && plan.objective.objective === 'target_b');
  check('plan keeps bag B as the final objective while exposing a route waypoint',
    plan.objective.finalCell.x === 10 && plan.objective.finalCell.y === 16 && plan.objective.route === 'covered');
  const bad = keyPaths(plan).find((p) => MOVEMENT_KEYS.includes(p.key));
  check('plan carries no movement field', !bad, bad?.path);
}

// 2. Jev cannot inject a direction: a response that includes a movement
//    answer is mapped to a strategy with that answer dropped and counted.
{
  const mapped = mapJevAnswer({ answers: {
    move: { type: 'choice', choice: 'up', confidence: 1 },
    objective: { type: 'choice', choice: 'target_a', confidence: 0.8 },
    posture: { type: 'choice', choice: 'safe' } }, usage: { input_tokens: 10 } });
  check('mapper drops the move answer', !keyPaths(mapped).some((p) => MOVEMENT_KEYS.includes(p.key)));
  check('and flags that it happened', mapped.strayMovement === true);
  check('but the strategy itself survives', mapped.valid && mapped.objective === 'target_a' && mapped.posture === 'safe');
  const planned = mapJevAnswer({ answers: {
    objective: { choice: 'extract', confidence: 0.8 }, route: { choice: 'evasive', confidence: 0.7 },
    power: { choice: 'dash_escape', confidence: 0.9 } } });
  check('mapper preserves route and conditional power plan',
    planned.route === 'evasive' && planned.powerPlan === 'dash_escape' && planned.power === 'dash');
  const onlyMove = mapJevAnswer({ answers: { move: { type: 'choice', choice: 'left' } } });
  check('a move with no objective is not a strategy', onlyMove.valid === false && onlyMove.reason === 'no-objective');
  check('an unknown objective is rejected', mapJevAnswer({ answers: { objective: { choice: 'up' } } }).reason === 'bad-objective');

  clock.t = 20_000;
  const { s } = make([{ ...strategy('target_a'), strayMovement: true }]);
  await run(s, makeView(), 200);
  check('a stray movement answer is counted, not used', s.report().strayMovementDropped === 1);
  check('rawMovementActions is structurally zero', s.report().rawMovementActions === 0);
}

// 3. No Jev file can reach the input layer. Read the sources.
{
  const files = ['src/controllers/JevStrategist.js', 'src/controllers/makeJevStrategist.js',
    'src/controllers/jevTypesafe.js', 'src/controllers/jevCloudflare.js',
    'src/logic/jevState.js', 'src/logic/jevAnswer.js', 'src/logic/jevStrategy.js', 'src/logic/jevWatchdog.js'];
  const hits = files.filter((f) => /driveMove|InputIntent|\.intent\b/.test(readFileSync(new URL('../' + f, import.meta.url), 'utf8')
    .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')));
  check('no Jev source file calls driveMove or touches the intent layer', hits.length === 0, hits.join(', '));
}

// 4. Carrying makes extraction the only destination.
{
  clock.t = 30_000;
  // The synthetic runner stands still; this case is not about the watchdog.
  const { s } = make([strategy('target_a'), strategy('extract')], { watchdog: { stallMs: 1e9 } });
  const plans = await run(s, makeView({ carrying: true }), 3600);
  const r = s.report();
  check('a bag objective while carrying is rejected as "carrying"', r.strategies.rejected.carrying === 1);
  check('the fallback while carrying is the extract', plans[1].objective.objective === 'extract' && plans[1].objective.source === 'fallback');
  check('an extract answer is adopted',
    r.strategies.adopted === 1 && plans.some((p) => p.objective?.source === 'jev' && p.objective.objective === 'extract'));
}

// 5. Invalid objectives fall back safely: absent bag, extract before pickup,
//    unreachable bag. The fallback is the NEAREST bag, never the real one.
{
  clock.t = 40_000;
  const { s } = make([strategy('extract'), strategy('target_b')], { watchdog: { stallMs: 1e9 } });
  // Runner near the top bag; bag B walled in completely.
  const walls = ['9,16', '11,16', '10,15', '10,17'];
  const v = makeView({ runner: { x: 10, y: 5 }, walls });
  // Long enough for the no-strategy re-ask (noStrategyRetryMs) after the first rejection.
  const plans = await run(s, v, 3600);
  const r = s.report();
  check('extract before pickup is rejected', r.strategies.rejected['not-carrying'] === 1);
  check('an unreachable bag is rejected', r.strategies.rejected.unreachable === 1);
  check('the runner still has a place to go: the nearest reachable bag',
    plans.at(-1).objective.source === 'fallback' && plans.at(-1).objective.objective === 'target_a');
  const one = make([strategy('target_b')]).s;
  await run(one, makeView({ bags: [{ x: 10, y: 3 }] }), 200);
  check('a bag that does not exist is rejected as absent', one.report().strategies.rejected.absent === 1);
}

// 6. THE COOLDOWN. A storm of triggers — the bag list changing every frame —
//    cannot produce more than one request per 1,500ms.
{
  clock.t = 50_000;
  const { s, decide } = make(() => strategy('target_a'));
  let flip = false;
  const storm = () => { flip = !flip; return makeView({ bags: flip ? [{ x: 10, y: 3 }, { x: 10, y: 16 }] : [{ x: 10, y: 3 }, { x: 11, y: 16 }] }); };
  await run(s, storm, 10_000, 16);
  const n = decide.calls.length;
  check('10s of per-frame stash changes: at most 7 requests', n <= 7 && n >= 6, `${n}`);
  check('the rest were coalesced, not dropped', s.report().triggers.coalesced > 0 || s.report().triggers.merged.stash_change > 1);
}

// 7. Errors, invalid answers and timeouts do not bypass the cooldown.
{
  clock.t = 70_000;
  const { s, decide } = make(() => new Error('jev http 503'), { maxConsecutiveErrors: 99 });
  // Every frame raises a trigger (hp drops each frame).
  let hp = 1000;
  await run(s, () => makeView({ hp: hp-- }), 6000, 16);
  check('errors every time: still no faster than the floor', decide.calls.length <= 5, `${decide.calls.length}`);

  const inv = make(() => ({ valid: false, reason: 'no-objective', usage: { input_tokens: 50 } }), { maxConsecutiveErrors: 99 });
  hp = 1000;
  await run(inv.s, () => makeView({ hp: hp-- }), 6000, 16);
  check('invalid answers: same floor', inv.decide.calls.length <= 5, `${inv.decide.calls.length}`);
  check('and invalid answers still count their tokens', inv.s.report().tokensBilled === 50 * inv.decide.calls.length);

  const slow = new JevStrategist(() => new Promise(() => {}), { now: () => clock.t, timeoutMs: 500, maxConsecutiveErrors: 99 });
  let calls = 0; const orig = slow.decide; slow.decide = (p) => { calls++; return orig(p); };
  hp = 1000;
  await run(slow, () => makeView({ hp: hp-- }), 6000, 16);
  check('timeouts: same floor', calls <= 5, `${calls}`);
  check('timeouts are counted', slow.report().timeouts >= 3);
}

// 8. One in flight, and triggers during it are coalesced into ONE follow-up.
{
  clock.t = 90_000;
  let release;
  const decide = scriptedDecide(() => new Promise((r) => { release = r; }));
  const s = new JevStrategist(decide, { now: () => clock.t });
  s.tick(makeView());
  check('first request out', decide.calls.length === 1);
  // Three different triggers while it is in flight.
  clock.t += 100; s.tick(makeView({ hp: 2 }));                               // damage
  clock.t += 100; s.tick(makeView({ hp: 2, bags: [{ x: 10, y: 3 }] }));      // stash_change
  clock.t += 100; s.tick(makeView({ hp: 1, bags: [{ x: 10, y: 3 }] }));      // damage again
  check('nothing else leaves while one is in flight', decide.calls.length === 1);
  release(strategy('target_a')); await flush();
  await run(s, makeView({ hp: 1, bags: [{ x: 10, y: 3 }] }), 3000);
  const r = s.report();
  check('exactly one follow-up request for all of them', decide.calls.length === 2, `${decide.calls.length}`);
  check('named for the highest-priority trigger', r.triggers.requested.stash_change === 1);
  check('the merged triggers are all counted', r.triggers.merged.damage === 1 && r.triggers.merged.stash_change === 1);
}

// 9. A late answer for obsolete state is discarded.
{
  clock.t = 110_000;
  let release;
  const decide = scriptedDecide(() => new Promise((r) => { release = r; }));
  const s = new JevStrategist(decide, { now: () => clock.t });
  s.tick(makeView());
  clock.t += 200;
  s.tick(makeView({ bags: [{ x: 10, y: 16 }] }));   // a bag vanished mid-flight
  release(strategy('target_a')); await flush();
  const plan = s.tick(makeView({ bags: [{ x: 10, y: 16 }] }));
  const r = s.report();
  check('the answer is counted obsolete', r.obsolete === 1);
  check('and not adopted', r.strategies.adopted === 0 && plan.objective.source === 'fallback');
  check('its tokens are still counted', r.tokensBilled === 400);

  // And an answer that lands after the timeout is late, not adopted.
  clock.t = 120_000;
  let rel2;
  const d2 = scriptedDecide(() => new Promise((r) => { rel2 = r; }));
  const s2 = new JevStrategist(d2, { now: () => clock.t, timeoutMs: 1000 });
  s2.tick(makeView());
  clock.t += 1500; s2.tick(makeView());
  rel2(strategy('target_b')); await flush();
  s2.tick(makeView());
  check('an answer after the timeout is late and discarded', s2.report().late === 1 && s2.report().strategies.adopted === 0);
}

// 10. Commitment: no A/B flip inside the window, and a cap on switches.
{
  clock.t = 130_000;
  // Every answer asks for the other bag than last time.
  let n = 0;
  const { s } = make(() => strategy(n++ % 2 ? 'target_b' : 'target_a'), { strategyTtlMs: 1600 });
  const plans = await run(s, makeView(), 30_000, 50);
  const r = s.report();
  let flips = 0;
  for (let i = 1; i < plans.length; i++) {
    const a = plans[i - 1].objective, b = plans[i].objective;
    if (a?.source === 'jev' && b?.source === 'jev' && a.objective !== b.objective) flips++;
  }
  check('requests kept coming (expiry), but the target barely moved', r.logicalRequests >= 10);
  check('at most maxSwitchesPerAttempt flips in 30s', flips <= DEFAULTS.maxSwitchesPerAttempt, `${flips}`);
  check('the rest were held by commitment', r.strategies.objectiveHeld >= 5, `${r.strategies.objectiveHeld}`);
}

// 11. THE WATCHDOG. No progress for ~2s (after the attempt's respawn grace)
//     -> stall, strategy invalidated, the runner AI gets a recovery waypoint,
//     nothing is asked during recovery, and one watchdog request afterwards.
{
  clock.t = 200_000;
  const { s, decide } = make(() => strategy('target_a'));
  const stuck = makeView({ runner: { x: 10, y: 10 } });   // never moves
  const hooks = { recoveries: 0, onRecovery() { this.recoveries++; } };
  const grace = await run(s, stuck, 3000, 50, hooks);
  check('no stall inside grace + 2s', s.report().watchdog.stalls === 0 && !grace.at(-1).recovering);
  const plans = await run(s, stuck, 1000, 50, hooks);
  let r = s.report();
  check('stall detected after ~2s without progress', r.watchdog.stalls === 1);
  check('the strategy was invalidated by it', r.watchdog.strategiesInvalidated === 1);
  check('the motor was told (flip guard cleared)', hooks.recoveries === 1);
  const last = plans.at(-1);
  check('recovery mode is active', last.recovering === true && last.mode === 'recovery');
  check('with a recovery waypoint, not Jev\'s bag', last.objective.source === 'recovery' &&
    !(last.objective.cell.x === 10 && last.objective.cell.y === 3));
  const wp = last.objective.cell;
  const toBag = Math.abs(wp.x - 10) + Math.abs(wp.y - 3), fromRunner = Math.abs(wp.x - 10) + Math.abs(wp.y - 10);
  check('the waypoint makes progress toward the bag but stops short of it', toBag >= 3 && toBag < 7 && fromRunner >= 3,
    JSON.stringify(wp));
  const during = decide.calls.length;
  await run(s, stuck, 1000, 50, hooks);
  check('no request during recovery', decide.calls.length === during && s.current.recovering);
  await run(s, stuck, 1500, 50, hooks);
  r = s.report();
  check('one watchdog request once recovery ends', r.watchdog.watchdogRequests === 1);

  // Progress restored after recovery is recorded.
  clock.t = 250_000;
  const s2 = make(() => strategy('target_a')).s;
  let y = 10, moving = false;
  const view2 = () => makeView({ runner: { x: 10, y: moving ? Math.max(4, y--) : 10 } });
  await run(s2, view2, 3700);          // grace + stall
  await run(s2, view2, 1900);          // recovery window
  moving = true;
  await run(s2, view2, 1500);
  check('recovery that restores progress is counted as restored', s2.report().watchdog.restored === 1);
}

// 12. Recovery cannot create a request storm. Wedged for a full minute.
{
  clock.t = 300_000;
  const { s, decide } = make(() => strategy('target_a'));
  await run(s, makeView(), 60_000, 50);
  const r = s.report();
  check('stalls are spaced by recovery + stall window (<= 16 in 60s)', r.watchdog.stalls <= 16 && r.watchdog.stalls >= 10, `${r.watchdog.stalls}`);
  check('watchdog requests <= one per 5s', r.watchdog.watchdogRequests <= 12, `${r.watchdog.watchdogRequests}`);
  check('total requests stay in the tens', decide.calls.length <= 40, `${decide.calls.length}`);
  check('suppressed watchdog requests are counted', r.watchdog.watchdogRequestsSuppressed >= 1);
  check('recovery time and share reported', r.watchdog.recoveryMs > 10_000 && r.watchdog.recoveryShare > 0.2);
}

// 13. Powers: Jev decides WHETHER (arm / save), the motor decides WHEN.
//     A legal power is armed and handed to the plan; an illegal one is
//     refused with a reason and never armed; the motor's activation is
//     credited to the arm; 'none' disarms; an unused arm expires.
{
  const cases = [
    ['phase', {}, 'armed'],
    ['dash', {}, 'armed'],
    ['decoy', { powers: { selected: ['decoy', 'dash'], consumed: [false, false] } }, 'armed'],
    ['decoy', {}, 'not-in-loadout'],
    ['dash', { powers: { selected: ['phase', 'dash'], consumed: [false, true] } }, 'consumed'],
    ['decoy', { decoyActive: true, powers: { selected: ['decoy'], consumed: [false] } }, 'decoy-exists'],
    ['phase', { phasing: true }, 'already-phasing']
  ];
  for (const [name, over, expect] of cases) {
    clock.t += 50_000;
    const { s } = make([strategy('target_a', { power: name })], { watchdog: { stallMs: 1e9 } });
    const plans = await run(s, makeView(over), 300);
    const p = s.report().powers;
    if (expect === 'armed') {
      check(`${name}: requested, accepted and armed for the motor`,
        p.requested === 1 && p.accepted === 1 && plans.at(-1).armedPower === name);
      s.onPowerActivated(name);
      const q = s.report().powers;
      check(`${name}: the motor's activation is credited, and disarms`,
        q.activated === 1 && q.unarmedActivations === 0 && s.tick(makeView(over)).armedPower === null);
    } else {
      check(`${name}: rejected as ${expect}, never armed`,
        p.rejected[expect] === 1 && plans.at(-1).armedPower === null, JSON.stringify(p.rejected));
    }
  }

  clock.t += 50_000;
  const saver = make([strategy('target_a', { power: 'phase' }), strategy('target_a', { power: 'none' })],
    { watchdog: { stallMs: 1e9 }, strategyTtlMs: 1600 });
  const sp = await run(saver.s, makeView(), 2500);
  check('"none" after an arm is a save: disarmed and counted',
    saver.s.report().powers.saved === 1 && sp.at(-1).armedPower === null);

  clock.t += 50_000;
  const lapse = make([strategy('target_a', { power: 'dash' })], { watchdog: { stallMs: 1e9 }, armMs: 1000 });
  const lp = await run(lapse.s, makeView(), 1500);
  check('an arm the motor never uses expires and is counted',
    lapse.s.report().powers.expiredUnused === 1 && lp.at(-1).armedPower === null);

  clock.t += 50_000;
  const rogue = make([strategy('target_a')], { watchdog: { stallMs: 1e9 } });
  await run(rogue.s, makeView(), 200);
  rogue.s.onPowerActivated('dash');
  check('an activation nothing armed is counted as unarmed (should never happen)',
    rogue.s.report().powers.unarmedActivations === 1 && rogue.s.report().powers.activated === 0);

  // A conditional dash may be selected on pickup, but the motor cannot see
  // it before the runner is carrying. This blocks the observed pre-bunk burn.
  clock.t += 50_000;
  const conditional = make([strategy('target_a', { power: 'dash', powerPlan: 'dash_escape' })],
    { watchdog: { stallMs: 1e9 } });
  const beforePickup = await run(conditional.s, makeView(), 200);
  check('escape dash stays hidden before the real stash is known', beforePickup.at(-1).armedPower === null);
  check('the same dash becomes available once carrying',
    conditional.s.tick(makeView({ carrying: true })).armedPower === 'dash');
}

// 14. Ceilings stop further calls: requests, tokens, and repeated failures.
{
  clock.t = 1_000_000;
  const r1 = make(() => strategy('target_a'), { maxRequests: 3, strategyTtlMs: 1600 });
  await run(r1.s, makeView(), 30_000);
  check('request ceiling: exactly maxRequests calls', r1.decide.calls.length === 3 && r1.s.report().budgetStopped === 'requests');

  const r2 = make(() => strategy('target_a', { tokens: 3000 }), { maxInputTokens: 7000, strategyTtlMs: 1600 });
  await run(r2.s, makeView(), 30_000);
  check('token ceiling stops calls once billed tokens pass it',
    r2.decide.calls.length === 3 && r2.s.report().budgetStopped === 'tokens', `${r2.decide.calls.length}`);

  const r3 = make(() => new Error('jev http 400'), { strategyTtlMs: 1600 });
  await run(r3.s, makeView(), 30_000);
  check('three consecutive failures stop it (no repeated 400s)',
    r3.decide.calls.length === 3 && r3.s.report().budgetStopped === 'errors', `${r3.decide.calls.length}`);
}

// 15. HTTP attempts are counted apart from logical decisions; 429 retries,
//     400 does not; and the report carries nothing secret.
{
  clock.t = 2_000_000;
  const SECRET = 'sk-test-SECRET-do-not-leak-123';
  const statuses = [429, 200];
  const ok = { answers: { objective: { type: 'choice', choice: 'target_a', confidence: 0.7 },
    posture: { type: 'choice', choice: 'balanced' } }, model: 'jev-1.13.0', usage: { input_tokens: 380 } };
  const fetchImpl = async () => {
    const st = statuses.shift() ?? 200;
    return { ok: st === 200, status: st, headers: { get: () => null }, json: async () => ok };
  };
  const decide = typesafeJev({ apiKey: SECRET, fetchImpl, sleep: async () => {} });
  const s = new JevStrategist(decide, { now: () => clock.t });
  await run(s, makeView(), 500);
  const r = s.report();
  check('one logical request', r.logicalRequests === 1);
  check('two HTTP attempts, one retry, counted separately', r.http.attempts === 2 && r.http.retries === 1 && r.http.statuses['429'] === 1);
  check('the answer from the retried call is adopted', r.strategies.adopted === 1);

  const bad = typesafeJev({ apiKey: SECRET, fetchImpl: async () => ({ ok: false, status: 400, headers: { get: () => null } }), sleep: async () => {} });
  let threw = null;
  try { await bad({ state: {}, questions: {} }); } catch (e) { threw = e; }
  check('a 400 is not retried', bad.http.attempts === 1 && /400/.test(threw?.message || ''));

  const blob = JSON.stringify(r) + JSON.stringify(s.timeline) + JSON.stringify(bad.http);
  check('report, timeline and http stats carry no key', !blob.includes(SECRET) && !/Bearer|authorization/i.test(blob));
  check('model and real usage recorded', r.model === 'jev-1.13.0' && r.tokenSource === 'api' && r.tokensBilled === 380);
  check('report names the motor and strategist', r.driver === 'jev-strategist' && r.motor === 'runner-ai');
}

// 15b. NO HISTORICAL LABEL. The genuine bag rerolls on every attempt, so
//      which bag turned out bunk last attempt says nothing about this one —
//      and must not reach Jev. Two races identical except for which bag was
//      revealed bunk on attempt 1 must send byte-identical payloads on every
//      request of attempt 2.
{
  const retryPayloads = async (bunkOnFirstAttempt) => {
    clock.t = 4_000_000;
    const { s, decide } = make(() => strategy('target_a'), { watchdog: { stallMs: 1e9 } });
    const both = [{ x: 10, y: 3 }, { x: 10, y: 16 }];
    const survivor = bunkOnFirstAttempt === 'target_a' ? [{ x: 10, y: 16 }] : [{ x: 10, y: 3 }];
    // Attempt 1: both bags, then one fades as bunk, then the runner dies.
    await run(s, makeView({ houseKey: '4:0', house: 4 }), 1600);
    await run(s, makeView({ houseKey: '4:0', house: 4, bags: survivor }), 1600);
    const before = decide.calls.length;
    // Attempt 2 (retry): the same two bags again, fresh.
    await run(s, makeView({ houseKey: '4:1', house: 4, runner: { x: 10, y: 11 } }), 6000);
    return decide.calls.slice(before).map((p) => JSON.stringify(p));
  };
  const afterA = await retryPayloads('target_a');
  const afterB = await retryPayloads('target_b');
  check('the retry asked at least once', afterA.length >= 1 && afterA[0].includes('"event":"retry"'));
  check('which bag was bunk last attempt changes nothing Jev is sent on the retry',
    afterA.length === afterB.length && afterA.every((p, i) => p === afterB[i]));
  check('the retry payload restarts the plan from nothing',
    JSON.parse(afterA[0]).state.plan.objective === 'none' && JSON.parse(afterA[0]).state.attempt === 2);
  check('both bags are offered again on the retry',
    Object.keys(JSON.parse(afterA[0]).questions.objective.criteria).sort().join() === 'target_a,target_b');
}

// 15b. Fair tactical memory: a death is remembered as a cell and a posture for
//      the rest of that house, reaches the payload as route counts, and is
//      forgotten when the house changes.
{
  clock.t = 4_500_000;
  const { s, decide } = make(() => strategy('target_b'), { watchdog: { stallMs: 1e9 } });
  // Attempt 1: dies beside the bottom bag while going for it.
  await run(s, makeView({ houseKey: '5:0', house: 5, runner: { x: 10, y: 15 } }), 1600);
  const before = decide.calls.length;
  await run(s, makeView({ houseKey: '5:1', house: 5 }), 1600);
  const retry = decide.calls.slice(before).map((p) => p.state).find((st) => st.event === 'retry');
  check('the retry payload remembers the death', retry?.deaths.here === 1 && retry.deaths.carrying === 0,
    JSON.stringify(retry?.deaths));
  const bottom = retry?.targets.find((t) => t.died > 0);
  check('against the route it lay on, found by position', bottom && retry.targets.filter((t) => t.died > 0).length === 1,
    JSON.stringify(retry?.targets));
  check('with the posture in force', retry?.deaths.balanced === 1 || retry?.deaths.safe === 1 || retry?.deaths.aggressive === 1);
  const mark = decide.calls.length;
  await run(s, makeView({ houseKey: '6:0', house: 6 }), 1600);
  const next = decide.calls.slice(mark).map((p) => p.state).find((st) => st.event === 'house_start');
  check('a new house starts with no deaths remembered', next?.deaths.here === 0 && next.targets.every((t) => t.died === 0));
}

// 15b-2. Exploit, then explore: direct routes until a house has cost two
//        deaths, then the plan lets the motor take the long way round.
{
  clock.t = 4_600_000;
  const { s } = make(() => strategy('target_b'), { watchdog: { stallMs: 1e9 } });
  const first = await run(s, makeView({ houseKey: '8:0', house: 8 }), 1600);
  check('a fresh house plans direct routes', first.at(-1).explore === false);
  await run(s, makeView({ houseKey: '8:1', house: 8 }), 1600);
  const oneDeath = s.tick(makeView({ houseKey: '8:1', house: 8 }));
  check('still direct after one death', oneDeath.explore === false);
  const two = await run(s, makeView({ houseKey: '8:2', house: 8 }), 1600);
  check('exploratory after two deaths in the house', two.at(-1).explore === true);
  const next = await run(s, makeView({ houseKey: '9:0', house: 9 }), 1600);
  check('and direct again in the next house', next.at(-1).explore === false);
  check('exploring attempts are counted', s.report().motorDetail.exploringAttempts === 1, JSON.stringify(s.report().motorDetail));
}

// 15c. A rested posture cannot come back through the answer. After three
//      deaths on balanced it is not offered; an answer that says balanced
//      anyway (the mapper's default for a missing posture) gets the first
//      posture that was offered.
{
  clock.t = 4_700_000;
  const { s, decide } = make(() => strategy('target_b', { posture: 'balanced' }), { watchdog: { stallMs: 1e9 } });
  for (let k = 0; k < 4; k++) await run(s, makeView({ houseKey: '7:' + k, house: 7 }), 1600);
  const offered = Object.keys(decide.calls.at(-1).questions.posture.criteria);
  check('balanced is rested after three deaths on it', !offered.includes('balanced') && offered.length === 2, offered.join());
  const plans = await run(s, makeView({ houseKey: '7:3', house: 7 }), 200);
  check('an answer naming it is adopted with the first offered posture instead',
    plans.at(-1).posture === offered[0] && s.current.posture === offered[0], `${plans.at(-1).posture}`);
}

// 16. Not live (countdown): nothing is asked, and the fair fallback is still
//     handed over so the runner AI never runs on its own objective code.
{
  clock.t = 3_000_000;
  const { s, decide } = make(() => strategy('target_a'));
  const plans = await run(s, makeView({ live: false }), 2000);
  check('no request before the race is live', decide.calls.length === 0);
  check('fallback objective supplied anyway', plans.at(-1).objective?.source === 'fallback');
}

console.log('');
if (failures.length) {
  console.log(`jevStrategist: ${passed} passed, ${failures.length} FAILED`);
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log(`jevStrategist: ${passed} assertions passed`);
