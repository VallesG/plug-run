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

/* ---------------- report ---------------- */

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
