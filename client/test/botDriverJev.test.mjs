// The hybrid: Jev strategist above the REAL runner AI, under plain Node.
//
//   node client/test/botDriverJev.test.mjs
//
// The runner AI here is the shipped one (RunnerAI.updateRunnerBehavior),
// loaded with Phaser stubbed out, driving a stub board through BotDriver
// exactly as installBotDriver wires it. Jev is a real JevStrategist with a
// scripted decide(). So when a test says "the runner reached bag A", the
// runner AI walked it there, every step, around a wall Jev knows nothing
// about — Jev only named the bag.

import { clock, flush, makeScene, cellOf, scriptedDecide, strategy, AI_HOOKS, RunnerAI, reseed } from './_jevWorld.mjs';
import BotDriver from '../src/controllers/BotDriver.js';
import JevStrategist from '../src/controllers/JevStrategist.js';

let passed = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

// Street's knobs, with the deliberate-mistake knobs off so a wrong step can't
// be mistaken for anything else. aiLevel 8: the runner AI with wander and
// hesitation at zero (applyRunnerProgression), so a run is repeatable.
const CFG = { aiLevel: 8, dangerCells: 5, coverPenalty: 0, phaseEscapeCells: 0,
  wrongTurnChance: 0, hesitateChance: 0, openingDecoy: false };

function hybrid(scene, answers, cfg = {}, hooks = AI_HOOKS) {
  const decide = scriptedDecide(answers);
  const strategist = new JevStrategist(decide, { now: () => clock.t, rng: () => 0.5 });
  const bot = new BotDriver(scene, { ...CFG, ...cfg, strategist }, hooks);
  return { bot, strategist, decide };
}

async function frames(bot, n, each = null) {
  for (let i = 0; i < n; i++) {
    clock.t += 16.67;
    bot.update(16.67);
    if (each && each(i) === false) return i;
    if (i % 3 === 0) await flush();
  }
  return n;
}

const at = (scene, cell) => { const c = cellOf(scene, scene.attacker); return c.x === cell.x && c.y === cell.y; };
const moves = (s) => s._driven.filter((d) => d.kind === 'move');

console.log('\nBotDriver + JevStrategist + real RunnerAI\n');

// 0. The seam on its own. Without a provider the shipped AI heads for
//    scene.stash — the REAL bag, which a player cannot know. With one, the
//    provided cell wins and nothing replaces it.
{
  reseed(1); clock.t = 10_000;
  const probe = (scene, provider) => {
    const ctrl = {};
    if (provider) ctrl.objectiveProvider = provider;
    scene.role = 'plug'; scene.pveRound = 8;
    RunnerAI.applyRunnerProgression(scene);
    for (let i = 0; i < 8; i++) { clock.t += 20; RunnerAI.updateRunnerBehavior(scene, ctrl, 20); }
    scene.role = 'runner';
    return { x: Math.sign(ctrl._aiVX || 0), y: Math.sign(ctrl._aiVY || 0) };
  };
  const own = probe(makeScene({ realTop: false }));
  check('no provider: the shipped AI goes straight for the real bag (down)', own.x === 0 && own.y === 1, JSON.stringify(own));
  const told = probe(makeScene({ realTop: false }), () => ({ x: 6, y: 2 }));
  check('provider: the AI routes for the provided bag instead (sideways, round the wall)', told.y === 0 && told.x !== 0, JSON.stringify(told));
  const s3 = makeScene({ realTop: false });
  s3._aiDetourCell = { x: 11, y: 12 };
  const detoured = probe(s3, () => ({ x: 6, y: 2 }));
  check('a random detour cannot overrule a provided objective', detoured.y === 0 && detoured.x !== 0, JSON.stringify(detoured));
}

// 1. Objective A: Jev names the top bag (the bunk, here); the runner AI walks
//    there, round the wall, and every steer comes out of BotDriver's motor
//    path. Jev never produces a move.
for (const [objective, realTop, cell] of [['target_a', false, { x: 6, y: 2 }], ['target_b', true, { x: 6, y: 12 }]]) {
  reseed(2); clock.t = 100_000;
  const scene = makeScene({ realTop });
  const { bot, strategist } = hybrid(scene, () => strategy(objective));
  const reached = await frames(bot, 900, () => !at(scene, cell));
  const r = bot.jevReport();
  check(`${objective}: Jev chose it and the runner AI reached it (${objective === 'target_a' ? 'the bunk' : 'the bunk'})`,
    reached < 900 && at(scene, cell), `frame ${reached}, at ${JSON.stringify(cellOf(scene, scene.attacker))}`);
  check(`${objective}: every steer came from the motor path (_driveOrCoast)`,
    moves(scene).length > 0 && moves(scene).every((m) => m.via.includes('_driveOrCoast') && !/JevStrategist|jevState|jevStrategy/.test(m.via)));
  check(`${objective}: drive sources are motor layers only`,
    r.driveSources.motor > 0 && Object.keys(r.driveSources).every((k) => ['motor', 'dodge', 'cover', 'phaseWindow'].includes(k)));
  check(`${objective}: strategy was active, not fallback`, r.time.strategyActiveShare > 0.9, `${r.time.strategyActiveShare}`);
  check(`${objective}: the runner AI's own power logic never ran`, !scene._driven.some((d) => d.kind === 'power'));
  void strategist;
}

// 2. Carrying: extraction is the only destination. Jev asks for a bag; it is
//    refused, and the runner AI takes the stash to the car.
{
  reseed(3); clock.t = 200_000;
  const scene = makeScene();
  scene.hasStash = true;
  const { bot } = hybrid(scene, () => strategy('target_a'));
  const car = { x: 11, y: 7 };
  const reached = await frames(bot, 900, () => !at(scene, car));
  const r = bot.jevReport();
  check('carrying: a bag answer is rejected', r.strategies.rejected.carrying >= 1);
  check('carrying: the runner AI reached the car', reached < 900 && at(scene, car), JSON.stringify(cellOf(scene, scene.attacker)));
}

// 3. Invalid objective: the runner still goes somewhere a player could
//    choose — the nearest bag — and not the real one.
{
  reseed(4); clock.t = 300_000;
  // Runner nearer the bottom bag; the real bag is the top one.
  const scene = makeScene({ realTop: true, runner: { x: 6, y: 10 } });
  const { bot } = hybrid(scene, () => ({ valid: false, reason: 'bad-objective', usage: { input_tokens: 10 } }));
  await frames(bot, 900, () => !at(scene, { x: 6, y: 12 }));
  check('invalid answers: fallback walks to the NEAREST bag (the bunk), not the real one',
    at(scene, { x: 6, y: 12 }), JSON.stringify(cellOf(scene, scene.attacker)));
}

// 4. Evasion outranks the objective, then the objective resumes.
{
  reseed(5); clock.t = 400_000;
  const scene = makeScene({ realTop: true, runner: { x: 6, y: 9 }, plug: { x: 6, y: 12 } });  // same column, 3 cells
  const { bot } = hybrid(scene, () => strategy('target_a'));
  await frames(bot, 6);
  const r1 = bot.jevReport();
  const firstDodge = moves(scene).find((m) => Math.abs(m.x) > 0.9);
  check('a plug in the lane: the dodge layer steers', r1.driveSources.dodge > 0);
  check('sideways, out of the column', !!firstDodge);
  scene.defender.active = false; scene.defender.visible = false;
  const before = r1.driveSources.motor || 0;
  const reached = await frames(bot, 900, () => !at(scene, { x: 6, y: 2 }));
  const r2 = bot.jevReport();
  check('lane clear: the motor steers again', (r2.driveSources.motor || 0) > before);
  check('and the runner AI completes the objective', reached < 900 && at(scene, { x: 6, y: 2 }));
}

// 5. Posture changes tactics, never the destination. A plug six cells down
//    the column is outside Street's 5-cell danger range, inside safe's 7.
{
  for (const posture of ['balanced', 'safe']) {
    reseed(6); clock.t = 500_000 + (posture === 'safe' ? 50_000 : 0);
    const scene = makeScene({ realTop: true, runner: { x: 6, y: 5 }, plug: { x: 6, y: 11 } });
    const { bot } = hybrid(scene, () => strategy('target_a', { posture }));
    await frames(bot, 20);
    const r = bot.jevReport();
    if (posture === 'balanced') check('balanced: a plug at 6 cells is not a lane threat', !r.driveSources.dodge);
    else check('safe: the same plug is dodged', r.driveSources.dodge > 0);
    check(`${posture}: the objective is still bag A`, bot._plan.objective.objective === 'target_a');
  }
}

// 6. The watchdog takes control. The runner is wedged (moves are swallowed):
//    after ~2s the strategy is marked stalled and the runner AI is handed a
//    recovery waypoint, not Jev's bag, with its direction lock cleared.
{
  reseed(7); clock.t = 600_000;
  const scene = makeScene({ realTop: true });
  const real = scene.intent.driveMove;
  let wedged = true;
  scene.intent.driveMove = (x, y) => (wedged ? true : real(x, y));
  const { bot } = hybrid(scene, () => strategy('target_a'));
  await frames(bot, 250);           // ~4.2s: attempt grace, then 2s without progress
  const r = bot.jevReport();
  const provided = bot._borrowed.objectiveProvider();
  check('stall detected on a wedged runner', r.watchdog.stalls === 1);
  check('the plan is in recovery', bot._plan.recovering === true && bot._plan.objective.source === 'recovery');
  check('the runner AI is steering for the recovery waypoint', provided && !(provided.x === 6 && provided.y === 2));
  check('its direction lock was cleared', bot._borrowed._aiFlipGuardUntil === 0 || bot._borrowed._aiFlipGuardUntil < clock.t + 400);
  wedged = false;
  await frames(bot, 400);
  const r2 = bot.jevReport();
  check('recovery ends and progress is restored', r2.watchdog.restored >= 1, JSON.stringify(r2.watchdog));
  check('no request storm: requests stay single digits', r2.logicalRequests <= 6, `${r2.logicalRequests}`);
}

// 7. Legal powers activate through the real path: Jev ARMS one, the shipped
//    runner AI's own reflex rule (considerRunnerPowerUse) picks the moment,
//    and activateRunnerPowerByIndex spends it — recorded exactly once — for
//    phase, dash and decoy alike. A plug 4 cells up the column satisfies the
//    defensive rule for each of them.
for (const name of ['phase', 'dash', 'decoy']) {
  reseed(8); clock.t = 700_000;
  const scene = makeScene({ plug: { x: 6, y: 5 },
    over: { runnerPowersSelected: [name, name === 'dash' ? 'phase' : 'dash'], runnerPowersConsumed: [false, false] } });
  const { bot } = hybrid(scene, [strategy('target_a', { power: name })]);
  await frames(bot, 40);
  const spent = scene._driven.filter((d) => d.kind === 'power');
  const recorded = scene._driven.filter((d) => d.kind === 'recordPower');
  check(`${name}: armed by Jev, fired by the runner AI's own rule through activateRunnerPowerByIndex`,
    spent.length === 1 && spent[0].power === name, JSON.stringify(spent.map((x) => x.power)));
  check(`${name}: intent recorded exactly once`, recorded.length === 1);
  check(`${name}: credited to the arm`, bot.jevReport().powers.activated === 1 && bot.jevReport().powers.unarmedActivations === 0);
}

// 7b. Save means save: the same threat, nothing armed, nothing spent — even
//     though the runner AI's rules would have fired.
{
  reseed(8); clock.t = 750_000;
  const scene = makeScene({ plug: { x: 6, y: 5 } });
  const { bot } = hybrid(scene, () => strategy('target_a', { power: 'none' }));
  await frames(bot, 120);
  check('nothing armed: no power spent under the same threat', !scene._driven.some((d) => d.kind === 'power'));
  const plain = makeScene({ plug: { x: 6, y: 5 } });
  const alone = new BotDriver(plain, { ...CFG }, AI_HOOKS);
  await frames(alone, 40);
  check('(whereas the runner AI on its own does spend one there)', plain._driven.some((d) => d.kind === 'power'));
}

// 8. Unavailable and consumed powers are refused and never activate.
{
  reseed(9); clock.t = 800_000;
  const scene = makeScene({ over: { runnerPowersSelected: ['phase', 'dash'], runnerPowersConsumed: [false, true] } });
  const { bot } = hybrid(scene, [strategy('target_a', { power: 'dash' }), strategy('target_a', { power: 'decoy' })], { });
  await frames(bot, 10);
  bot.strategist.pending.add('expired');
  await frames(bot, 120);
  const p = bot.jevReport().powers;
  check('a consumed dash is refused', p.rejected.consumed === 1);
  check('a decoy not in the loadout is refused', p.rejected['not-in-loadout'] === 1);
  check('nothing was activated', !scene._driven.some((d) => d.kind === 'power'));
}

// 9. With nothing armed the runner AI's power rules are not even consulted,
//    and the phase escape never fires; with a power armed they see only it.
{
  reseed(10); clock.t = 900_000;
  const scene = makeScene({ plug: { x: 6, y: 12 } });
  let consulted = 0, visible = [];
  const hooks = { ...AI_HOOKS, considerRunnerPowerUse: (sc, ...a) => { consulted++; visible = [...(sc.aiRunnerPowersSelected || [])]; return AI_HOOKS.considerRunnerPowerUse(sc, ...a); } };
  const { bot } = hybrid(scene, () => strategy('target_a'), { phaseEscapeCells: 9 }, hooks);
  await frames(bot, 200);
  check('nothing armed: considerRunnerPowerUse is never consulted', consulted === 0);
  check('and the phase escape never fires', !scene._driven.some((d) => d.kind === 'power'));

  reseed(10); clock.t = 950_000;
  const s2 = makeScene({ plug: { x: 1, y: 13 } });   // far: nothing should fire
  const h2 = { ...AI_HOOKS, considerRunnerPowerUse: (sc, ...a) => { visible = [...(sc.aiRunnerPowersSelected || [])]; return AI_HOOKS.considerRunnerPowerUse(sc, ...a); } };
  const { bot: b2 } = hybrid(s2, () => strategy('target_a', { power: 'dash' }), {}, h2);
  await frames(b2, 30);
  check('dash armed: the AI\'s rules see only the dash slot', JSON.stringify(visible) === JSON.stringify([null, 'dash']), JSON.stringify(visible));
  check('the player\'s own selection is never touched, and the spoof is undone',
    JSON.stringify(s2.runnerPowersSelected) === JSON.stringify(['phase', 'dash']) && s2.aiRunnerPowersSelected === undefined);
}

// 10. No capable motor, no strategist. aiLevel 0 is refused outright.
{
  reseed(11); clock.t = 1_000_000;
  const scene = makeScene();
  let ticks = 0;
  const fake = { tick() { ticks++; return {}; }, report() { return {}; } };
  const errors = [];
  const orig = console.error; console.error = (...a) => errors.push(a.join(' '));
  const bot = new BotDriver(scene, { ...CFG, aiLevel: 0, strategist: fake }, AI_HOOKS);
  await frames(bot, 20);
  console.error = orig;
  check('aiLevel 0: the strategist is never ticked', ticks === 0);
  check('and the refusal is loud', errors.some((e) => /strategist needs the capable runner AI/.test(e)));
}

// 11. Without a strategist the bot is exactly what it was: the runner AI on
//     its own objective (which is why the seam exists).
{
  reseed(12); clock.t = 1_100_000;
  const scene = makeScene({ realTop: false, runner: { x: 6, y: 9 } });
  const bot = new BotDriver(scene, { ...CFG }, AI_HOOKS);
  await frames(bot, 900, () => !at(scene, { x: 6, y: 12 }));
  check('no strategist: the runner AI walks to scene.stash as before', at(scene, { x: 6, y: 12 }));
  check('no strategist: nothing to report', bot.jevReport() === null);
}

console.log('');
if (failures.length) {
  console.log(`botDriverJev: ${passed} passed, ${failures.length} FAILED`);
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log(`botDriverJev: ${passed} assertions passed`);
