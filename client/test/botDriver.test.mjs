// BotDriver logic tests — plain Node, no framework, no browser.
//
//   node client/test/botDriver.test.mjs
//
// These exist because browser binaries can't be downloaded in every
// environment this repo gets built in (a locked-down CI container will 403 on
// the Playwright CDN), and the bot's decision logic is the part most likely to
// be wrong. A stub scene implements only what BotDriver actually touches:
// grid queries, BFS pathing, and the intent surface.
//
// What this does NOT cover: Phaser integration, the prototype wrap, and
// whether movement feels right. Those need a real browser.

import BotDriver from '../src/controllers/BotDriver.js';

/* ---------------- tiny assert ---------------- */

let passed = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

/* ---------------- stub scene ---------------- */

const CELL = 24;

// 10x10. Border walls, plus an interior block so pathing has to route around
// something rather than always producing a straight line.
function makeGrid() {
  const g = Array.from({ length: 10 }, (_, y) =>
    Array.from({ length: 10 }, (_, x) => (x === 0 || y === 0 || x === 9 || y === 9) ? 1 : 0)
  );
  for (let y = 3; y <= 6; y++) g[y][5] = 1; // vertical wall segment
  return g;
}

function makeScene(over = {}) {
  const grid = makeGrid();
  const driven = [];

  const scene = {
    role: 'runner',
    hasStash: false,
    roundOver: false,
    roundPausedForMenu: false,
    cell: CELL,
    cols: 10,
    rows: 10,
    grid,
    finalizeCalls: [],

    toCell: (x, y) => ({ x: Math.floor(x / CELL), y: Math.floor(y / CELL) }),
    toWorldX: (cx) => cx * CELL + CELL / 2,
    toWorldY: (cy) => cy * CELL + CELL / 2,
    inBoundsCell: (cx, cy) => cx >= 0 && cy >= 0 && cx < 10 && cy < 10,
    isWalkableCell(cx, cy) {
      return this.inBoundsCell(cx, cy) && this.grid[cy][cx] !== 1;
    },
    neighbors4(c) {
      return [
        { x: c.x + 1, y: c.y }, { x: c.x - 1, y: c.y },
        { x: c.x, y: c.y + 1 }, { x: c.x, y: c.y - 1 }
      ].filter((n) => this.isWalkableCell(n.x, n.y));
    },
    // Real BFS, so the bot's pathing is genuinely exercised.
    findPath(sx, sy, gx, gy) {
      const s = this.toCell(sx, sy), g = this.toCell(gx, gy);
      if (!this.isWalkableCell(s.x, s.y) || !this.isWalkableCell(g.x, g.y)) return null;
      const key = (c) => `${c.x},${c.y}`;
      const q = [{ ...s, path: [] }];
      const seen = new Set([key(s)]);
      while (q.length) {
        const cur = q.shift();
        if (cur.x === g.x && cur.y === g.y) {
          return cur.path.map((c) => ({ x: this.toWorldX(c.x), y: this.toWorldY(c.y) }));
        }
        for (const n of this.neighbors4(cur)) {
          if (seen.has(key(n))) continue;
          seen.add(key(n));
          q.push({ ...n, path: [...cur.path, n] });
        }
      }
      return null;
    },

    finalizeRun(outcome) { this.finalizeCalls.push(outcome); },
    firePlug() { driven.push({ kind: 'fire' }); },
    activateRunnerPowerByIndex(i) { driven.push({ kind: 'power', i }); },

    intent: {
      driveMove(x, y) {
        const len = Math.hypot(x, y);
        if (len < 1e-6) return false;
        driven.push({ kind: 'move', x: x / len, y: y / len });
        return true;
      },
      driveGun(x, y) {
        const len = Math.hypot(x, y);
        if (len < 1e-6) return false;
        driven.push({ kind: 'gun', x: x / len, y: y / len });
        return true;
      },
      driveFire() { driven.push({ kind: 'fire' }); },
      drivePower(i) { driven.push({ kind: 'power', i }); }
    },

    // Player at top-left interior.
    attacker: { x: CELL * 1.5, y: CELL * 1.5, active: true, visible: true },
    defender: { x: CELL * 8.5, y: CELL * 8.5, active: true, visible: true },

    // bunkStash is NEARER than the real stash — the bot must go for the
    // near one, because a player can't tell them apart either.
    stash:     { x: CELL * 7.5, y: CELL * 7.5, active: true, visible: true },
    bunkStash: { x: CELL * 2.5, y: CELL * 1.5, active: true, visible: true },
    extract:   { x: CELL * 8.5, y: CELL * 1.5, active: true, visible: true },

    ...over
  };
  scene._driven = driven;
  return scene;
}

// Force a deterministic Math.random for the probability knobs.
function withRandom(value, fn) {
  const orig = Math.random;
  Math.random = () => value;
  try { return fn(); } finally { Math.random = orig; }
}

const lastMove = (s) => [...s._driven].reverse().find((d) => d.kind === 'move');

/* ---------------- tests ---------------- */

console.log('\nBotDriver logic\n');

// 1. Goal selection: nearest duffel, not the real one.
{
  const s = makeScene();
  const bot = new BotDriver(s, { wrongTurnChance: 0, hesitateChance: 0 });
  const goal = bot.currentGoal();
  check('runner targets the NEAREST duffel, not the real one',
    goal.x === s.bunkStash.x && goal.y === s.bunkStash.y,
    `got ${JSON.stringify(goal)}`);
}

// 2. Carrying the stash switches the goal to extraction.
{
  const s = makeScene({ hasStash: true });
  const bot = new BotDriver(s, {});
  const goal = bot.currentGoal();
  check('carrying stash targets extract',
    goal.x === s.extract.x && goal.y === s.extract.y);
}

// 3. Plug chases the runner.
{
  const s = makeScene({ role: 'plug' });
  const bot = new BotDriver(s, {});
  const goal = bot.currentGoal();
  check('plug targets the attacker',
    goal.x === s.attacker.x && goal.y === s.attacker.y);
}

// 4. Steering actually points at the goal.
{
  const s = makeScene();
  const bot = new BotDriver(s, { wrongTurnChance: 0, hesitateChance: 0 });
  withRandom(0.99, () => bot.update());
  const mv = lastMove(s);
  check('steers toward the goal', !!mv && mv.x > 0.5 && Math.abs(mv.y) < 0.5,
    mv ? `dir=(${mv.x.toFixed(2)},${mv.y.toFixed(2)})` : 'no move emitted');
}

// 5. A wrong turn is still a LEGAL move — a mistake, not a malfunction.
//    This is the one most likely to be silently broken: steering into a wall
//    would wedge the bot and quietly corrupt every timing sample.
{
  let allLegal = true, samples = 0;
  for (let i = 0; i < 40; i++) {
    const s = makeScene();
    const bot = new BotDriver(s, { wrongTurnChance: 1, hesitateChance: 0 });
    withRandom(0.0, () => bot.update());
    const mv = lastMove(s);
    if (!mv) continue;
    samples++;
    const me = s.attacker;
    const target = { x: me.x + mv.x * CELL, y: me.y + mv.y * CELL };
    const c = s.toCell(target.x, target.y);
    if (!s.isWalkableCell(c.x, c.y)) allLegal = false;
  }
  check('wrong turns stay on walkable cells', allLegal && samples > 0,
    `${samples} samples`);
}

// 6. Hesitation means no input at all that tick.
{
  const s = makeScene();
  const bot = new BotDriver(s, { hesitateChance: 1 });
  withRandom(0.0, () => bot.update());
  check('hesitation emits no steering', !lastMove(s));
}

// 7. Paused / finished rounds are untouched.
{
  const sOver = makeScene({ roundOver: true });
  new BotDriver(sOver, {}).update();
  const sPaused = makeScene({ roundPausedForMenu: true });
  new BotDriver(sPaused, {}).update();
  check('inert while roundOver', sOver._driven.length === 0);
  check('inert while a modal is open', sPaused._driven.length === 0);
}

// 8. Both duffels gone and no stash: no goal, no crash.
{
  const s = makeScene({ stash: null, bunkStash: null });
  const bot = new BotDriver(s, {});
  let threw = false;
  try { bot.update(); } catch { threw = true; }
  check('survives both duffels being gone', !threw && bot.currentGoal() === null);
}

// 9. Runaway guard fires and reports itself.
{
  const s = makeScene();
  const bot = new BotDriver(s, { maxRunMs: -1 });
  bot.update();
  check('maxRunMs abandons the run', s.finalizeCalls.includes('bot_timeout') && s.roundOver === true);
}

// 9b. ...and then leaves by the same door a death leaves by. Ending the run
//     without starting another one strands an unattended batch on a dead
//     board: the bot returns early from every later tick and nothing ever
//     restarts it.
{
  let gameOverCalls = 0;
  const s = makeScene({ progressionManager: { showPvEGameOver() { gameOverCalls++; } } });
  const bot = new BotDriver(s, { maxRunMs: -1 });
  bot.update();
  check('maxRunMs hands off to the restart path', gameOverCalls === 1);
}

// 9c. A scene without a progression manager must not take the bot down with
//     it — the guard's whole job is to be the thing that still works.
{
  const s = makeScene();
  let threw = false;
  try { new BotDriver(s, { maxRunMs: -1 }).update(); } catch { threw = true; }
  check('maxRunMs survives a scene with no progression manager', !threw);
}

// 10. Plug fires only along a lane, never at arbitrary angles.
{
  const aligned = makeScene({
    role: 'plug',
    defender: { x: CELL * 1.5, y: CELL * 1.5, active: true, visible: true },
    attacker: { x: CELL * 1.5, y: CELL * 7.5, active: true, visible: true }
  });
  new BotDriver(aligned, { hesitateChance: 0, wrongTurnChance: 0 }).update();

  const offAxis = makeScene({
    role: 'plug',
    defender: { x: CELL * 1.5, y: CELL * 1.5, active: true, visible: true },
    attacker: { x: CELL * 6.5, y: CELL * 7.5, active: true, visible: true }
  });
  new BotDriver(offAxis, { hesitateChance: 0, wrongTurnChance: 0 }).update();

  check('plug fires when aligned', aligned._driven.some((d) => d.kind === 'fire'));
  check('plug holds fire off-axis', !offAxis._driven.some((d) => d.kind === 'fire'));
}

// 11. A duffel mid-pickup is not a target. Regression: BaseGameScene sets
//     _fading on bunk pickup and waits ~680ms before nulling the reference.
//     Targeting it during that window put the bot on top of its own goal, the
//     steering vector collapsed to zero, and it stopped dead — observed live
//     as "gets a stash and just stands there".
{
  const s = makeScene();
  s.bunkStash._fading = true;
  const goal = new BotDriver(s, {}).currentGoal();
  check('ignores a duffel that is mid-pickup',
    goal && goal.x === s.stash.x && goal.y === s.stash.y,
    `got ${JSON.stringify(goal)}`);
}

// 12. Nor is a duffel we're already standing on.
{
  const s = makeScene();
  s.attacker.x = s.bunkStash.x;
  s.attacker.y = s.bunkStash.y;
  const goal = new BotDriver(s, {}).currentGoal();
  check('ignores a duffel it is standing on',
    goal && goal.x === s.stash.x && goal.y === s.stash.y);
}

// 13. Never freeze. With no goal at all the bot must still be moving —
//     a stationary racer is not a thing a player would ever be, and the pause
//     silently inflates every round time it touches.
{
  const s = makeScene({ stash: null, bunkStash: null });
  const bot = new BotDriver(s, { hesitateChance: 0, wrongTurnChance: 0 });
  bot._lastDir = { x: 1, y: 0 };
  bot.update();
  check('keeps moving when there is no goal', !!lastMove(s));
}

// 14. Firing-lane detection: same row, close, means exposed.
{
  const s = makeScene({
    attacker: { x: CELL * 1.5, y: CELL * 1.5, active: true, visible: true },
    defender: { x: CELL * 5.5, y: CELL * 1.5, active: true, visible: true }
  });
  const bot = new BotDriver(s, {});
  check('detects a shared row as a firing lane', bot.firingLaneRisk(s.attacker) === 'row');

  // Distance threshold. The stub grid is only 10 wide, so an aligned plug
  // can never be more than 7 cells off — tighten dangerCells instead to put
  // the same geometry outside the danger radius.
  const far = makeScene({
    attacker: { x: CELL * 1.5, y: CELL * 1.5, active: true, visible: true },
    defender: { x: CELL * 1.5, y: CELL * 8.5, active: true, visible: true }
  });
  check('ignores a plug beyond dangerCells',
    new BotDriver(far, { dangerCells: 3 }).firingLaneRisk(far.attacker) === null);
  check('still reacts to that plug at default range',
    new BotDriver(far, {}).firingLaneRisk(far.attacker) === 'col');
}

// 15. Dodging leaves the lane perpendicularly, and onto a walkable cell.
{
  const s = makeScene({
    attacker: { x: CELL * 1.5, y: CELL * 1.5, active: true, visible: true },
    defender: { x: CELL * 5.5, y: CELL * 1.5, active: true, visible: true }
  });
  const bot = new BotDriver(s, { hesitateChance: 0, wrongTurnChance: 0 });
  withRandom(0.99, () => bot.update());
  const mv = lastMove(s);
  // Exposed along a row means bullets fly horizontally, so we must move in y.
  check('dodges perpendicular to the firing lane',
    !!mv && Math.abs(mv.y) > 0.9 && Math.abs(mv.x) < 0.1,
    mv ? `dir=(${mv.x.toFixed(2)},${mv.y.toFixed(2)})` : 'no move');

  const cell = s.toCell(s.attacker.x + (mv?.x || 0) * CELL, s.attacker.y + (mv?.y || 0) * CELL);
  check('dodges onto a walkable cell', s.isWalkableCell(cell.x, cell.y));
}

// 20. The SECOND plug counts too. From round 8 the game spawns defender2,
//     and RunnerAI.js contains no reference to it — so with the borrowed AI
//     driving, this override is the only thing watching that threat. A bot
//     blind to it walks into the other one while dodging the first.
{
  const s = makeScene({
    attacker: { x: CELL * 1.5, y: CELL * 1.5, active: true, visible: true },
    // defender is far and off-axis; defender2 is the one lined up on us.
    defender: { x: CELL * 7.5, y: CELL * 6.5, active: true, visible: true },
    defender2: { x: CELL * 5.5, y: CELL * 1.5, active: true, visible: true }
  });
  check('sees a firing lane from the second plug',
    new BotDriver(s, {}).firingLaneRisk(s.attacker) === 'row');
}

// 21. An inactive second plug is not a threat (it dies before the round does).
{
  const s = makeScene({
    attacker: { x: CELL * 1.5, y: CELL * 1.5, active: true, visible: true },
    defender: { x: CELL * 7.5, y: CELL * 6.5, active: true, visible: true },
    defender2: { x: CELL * 5.5, y: CELL * 1.5, active: false, visible: true }
  });
  check('ignores a dead second plug',
    new BotDriver(s, {}).firingLaneRisk(s.attacker) === null);
}

// 22. With two plugs lined up, the nearer one sets the dodge axis — it
//     shoots first, so its lane is the urgent one.
{
  const s = makeScene({
    attacker: { x: CELL * 3.5, y: CELL * 2.5, active: true, visible: true },
    defender:  { x: CELL * 3.5, y: CELL * 7.5, active: true, visible: true }, // col, 5 away
    defender2: { x: CELL * 1.5, y: CELL * 2.5, active: true, visible: true }  // row, 2 away
  });
  check('nearest threat decides the axis',
    new BotDriver(s, {}).firingLaneRisk(s.attacker) === 'row');
}

/* ---------------- borrowed AI ---------------- */

// Stubs that misbehave the way the real ones do: updateRunnerBehavior writes
// the sprite position itself, and applyRunnerProgression clobbers
// scene.runnerSpeed with a value tuned for the AI opponent. Both must be
// undone, or the runner moves outside the input layer and every recorded
// duration measures a differently-paced game.
function makeHooks(over = {}) {
  return {
    applyRunnerProgression(s) { s.runnerSpeed = 151.5; },
    updateRunnerBehavior(s, ai) {
      ai._aiVX = 100; ai._aiVY = 0;
      s.attacker.x += 999;      // the position write we must discard
      s.attacker.y += 999;
    },
    considerRunnerPowerUse(s) {
      if (s.aiRunnerPowersConsumed) s.aiRunnerPowersConsumed[0] = true;
    },
    makeController: () => ({ _aiVX: 0, _aiVY: 0 }),
    ...over
  };
}

function borrowScene() {
  const s = makeScene();
  s.role = 'runner';
  s.pveRound = 3;
  s.runnerSpeed = 182;
  s.runnerPowersSelected = ['dash', 'phase'];
  s.runnerPowersConsumed = [false, false];
  s.intent.recordPower = function (i) { s._driven.push({ kind: 'power', i }); };
  return s;
}

// 16. Everything the spoof touches is put back.
{
  const s = borrowScene();
  const bot = new BotDriver(s, { aiLevel: 20 }, makeHooks());
  const x0 = s.attacker.x, y0 = s.attacker.y;
  bot.update(16.67);

  check('restores role after borrowing', s.role === 'runner', `got ${s.role}`);
  check('restores pveRound', s.pveRound === 3, `got ${s.pveRound}`);
  check('restores runnerSpeed', s.runnerSpeed === 182, `got ${s.runnerSpeed}`);
  check('discards the AI position write', s.attacker.x === x0 && s.attacker.y === y0);
  check('steers from the AI velocity', !!lastMove(s) && lastMove(s).x > 0.9);
}

// 17. Restoration survives a throwing hook. Without the finally, a crash mid
//     call would strand role='plug' and the game would be driving the wrong
//     character from then on.
{
  const s = borrowScene();
  const bot = new BotDriver(s, { aiLevel: 20 }, makeHooks({
    updateRunnerBehavior() { throw new Error('boom'); }
  }));
  bot.update(16.67);
  check('restores role even when the AI throws', s.role === 'runner', `got ${s.role}`);
  check('disables borrowed AI after a failure', bot.aiHooks === null);
}

// 18. Powers spent during the spoof still reach the trace. The scene skips
//     its own record when it believes it is driving the AI, which mid-spoof
//     it does — so the bot has to notice and record them itself.
{
  const s = borrowScene();
  const bot = new BotDriver(s, { aiLevel: 20 }, makeHooks());
  bot.update(16.67);
  check('records powers the borrowed AI spent',
    s._driven.some((d) => d.kind === 'power' && d.i === 0));
}

// 19. aiLevel 0 opts back out to the built-in pathfinder.
{
  const s = borrowScene();
  const bot = new BotDriver(s, { aiLevel: 0 }, makeHooks());
  check('aiLevel 0 disables borrowing', bot.useBorrowedAI === false);
}

/* ---------------- report ---------------- */

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
