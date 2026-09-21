// BotDriver <-> JevDriver wiring, under plain Node.
//
//   node client/test/botDriverJev.test.mjs
//
// The point of the wiring is that Jev is an ADVISOR, not the driver: it
// answers "which way" and everything else — evasion, firing, the frame-by-
// frame steering — stays with the tuned code, with the pathfinder underneath
// as the fallback. These tests are mostly about that fallback holding when
// Jev is late, wrong, unsure or absent, because that is what decides whether
// a bad round of Jev costs a few steps or costs the run.
//
// A stub scene implements only what BotDriver touches. `jev` is usually a
// stub too, so latency is scripted rather than raced; one case drives a real
// JevDriver to check the two actually fit together.

import BotDriver from '../src/controllers/BotDriver.js';
import JevDriver from '../src/controllers/JevDriver.js';

let passed = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}
const flush = () => new Promise((r) => setImmediate(r));

/* ---------------- stub scene ---------------- */

const CELL = 24;

// 10x10, border walls, and a vertical block at x=5 so a direction can be
// legal in one place and into a wall in another.
function makeScene(over = {}) {
  const grid = Array.from({ length: 10 }, (_, y) =>
    Array.from({ length: 10 }, (_, x) => (x === 0 || y === 0 || x === 9 || y === 9) ? 1 : 0)
  );
  for (let y = 3; y <= 6; y++) grid[y][5] = 1;

  const driven = [];
  const scene = {
    role: 'runner',
    hasStash: false,
    roundOver: false,
    roundPausedForMenu: false,
    cell: CELL,
    pad: { x: 0, y: 0 },
    cols: 10,
    rows: 10,
    grid,
    simTick: 1,

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

    runnerPowersSelected: ['phase', 'dash'],
    runnerPowersConsumed: [false, false],
    activateRunnerPowerByIndex(i) {
      driven.push({ kind: 'power', i });
      this.runnerPowersConsumed[i] = true;
    },

    intent: {
      driveMove(x, y) {
        const len = Math.hypot(x, y);
        if (len < 1e-6) return false;
        driven.push({ kind: 'move', x: x / len, y: y / len });
        return true;
      },
      driveGun() { return true; },
      driveFire() {},
      recordPower(i) { driven.push({ kind: 'recordPower', i }); }
    },

    // Runner at (1,1). The bag it will steer for is at (2,1) — one step
    // right — so the pathfinder's own answer is unambiguous and any other
    // heading in `driven` came from Jev.
    attacker: { x: CELL * 1.5, y: CELL * 1.5, active: true, visible: true, hp: 3 },
    defender: { x: CELL * 8.5, y: CELL * 8.5, active: true, visible: true },
    stash: { x: CELL * 7.5, y: CELL * 7.5, active: true, visible: true },
    bunkStash: { x: CELL * 2.5, y: CELL * 1.5, active: true, visible: true },
    extract: { x: CELL * 8.5, y: CELL * 1.5, active: true, visible: true },

    ...over
  };
  scene._driven = driven;
  return scene;
}

// A Jev stand-in. `answer` is whatever tick() should hand back; `at` is held
// steady for a given answer so the once-per-answer power rule is exercised
// the way the real driver exercises it.
function stubJev(answer = null) {
  return {
    answer,
    ticks: 0,
    resets: 0,
    // Counters live on the driver, not on BotDriver: a BotDriver is rebuilt
    // on every scene restart, so kept there they would describe one house.
    drive: { steps: 0, illegal: 0, lowConfidence: 0, fallbacks: 0, powers: 0 },
    tick() { this.ticks++; return this.answer; },
    reset() { this.resets++; this.answer = null; },
    report() {
      const d = this.drive;
      const decisions = d.steps + d.illegal + d.lowConfidence + d.fallbacks;
      return { requests: 1, answers: 1, costUsd: 0.0001, ...d, decisions,
        steerShare: decisions ? +(d.steps / decisions).toFixed(3) : 0 };
    }
  };
}

const dirAnswer = (move, extra = {}) => ({
  move,
  dir: { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[move],
  power: null, confidence: 1, at: 1000, ...extra
});

// replanMs 0 so every update() is a decision, and the imperfection knobs off
// so a wrong turn can't be mistaken for Jev's answer.
const plain = (scene, jev, cfg = {}) =>
  new BotDriver(scene, { replanMs: 0, wrongTurnChance: 0, hesitateChance: 0,
    openingDecoy: false, jev, ...cfg });

const moves = (s) => s._driven.filter((d) => d.kind === 'move');
const lastMove = (s) => [...moves(s)].pop();

/* ---------------- tests ---------------- */

console.log('\nBotDriver + Jev wiring\n');

// 1. Jev's answer is what actually steers.
{
  const s = makeScene();
  const d = plain(s, stubJev(dirAnswer('down')));
  d.update();
  const m = lastMove(s);
  check('Jev answer steers the runner', m && m.x === 0 && m.y === 1,
    m ? `got ${m.x},${m.y}` : 'no move');
  check('counted as a Jev step', d.jev.drive.steps === 1);
}

// 2. Without Jev the bot is exactly what it was.
{
  const s = makeScene();
  const d = plain(s, null);
  d.update();
  const m = lastMove(s);
  // Pathfinder routes toward the near bag at (2,1): straight right.
  check('no Jev means the pathfinder still drives', m && m.x === 1 && m.y === 0);
  check('no Jev report to give', d.jevReport() === null);
  check('no driver to count against', d.jev === null);
}

// 3. No answer yet — fall through, and say so.
{
  const s = makeScene();
  const d = plain(s, stubJev(null));
  d.update();
  const m = lastMove(s);
  check('a missing answer falls back to the pathfinder', m && m.x === 1 && m.y === 0);
  check('fallback counted', d.jev.drive.fallbacks === 1);
  check('not counted as a Jev step', d.jev.drive.steps === 0);
}

// 4. A step into a wall is refused, however confident Jev was.
{
  // Runner at (4,4); the block at x=5 makes 'right' illegal from there.
  const s = makeScene({ attacker: { x: CELL * 4.5, y: CELL * 4.5, active: true, visible: true, hp: 3 } });
  check('the test board really does wall that step', s.isWalkableCell(5, 4) === false);
  const d = plain(s, stubJev(dirAnswer('right')));
  d.update();
  check('an illegal step is not driven', d.jev.drive.illegal === 1 && d.jev.drive.steps === 0);
  check('the pathfinder steered instead', !!lastMove(s));
}

// 5. Confidence gate — off by default, honoured when set.
{
  const s = makeScene();
  const open = plain(s, stubJev(dirAnswer('down', { confidence: 0.1 })));
  open.update();
  check('default takes every answer, unsure or not', open.jev.drive.steps === 1);

  const s2 = makeScene();
  const gated = plain(s2, stubJev(dirAnswer('down', { confidence: 0.1 })), { jevMinConfidence: 0.5 });
  gated.update();
  check('below threshold falls back', gated.jev.drive.lowConfidence === 1 && gated.jev.drive.steps === 0);

  const s3 = makeScene();
  const sure = plain(s3, stubJev(dirAnswer('down', { confidence: 0.9 })), { jevMinConfidence: 0.5 });
  sure.update();
  check('above threshold steers', sure.jev.drive.steps === 1);

  const s4 = makeScene();
  const none = plain(s4, stubJev(dirAnswer('down', { confidence: null })), { jevMinConfidence: 0.5 });
  none.update();
  check('a missing confidence cannot pass a threshold', none.jev.drive.lowConfidence === 1);
}

// 6. A power is spent once per ANSWER, not once per frame.
{
  const s = makeScene();
  const jev = stubJev(dirAnswer('down', { power: 'dash' }));
  const d = plain(s, jev);
  d.update(); d.update(); d.update();
  const powers = s._driven.filter((x) => x.kind === 'power');
  check('the dash is spent', powers.length === 1 && powers[0].i === 1);
  check('and only once across three frames', d.jev.drive.powers === 1);
  check('the spend is traced', s._driven.some((x) => x.kind === 'recordPower' && x.i === 1));

  // A new answer is a new decision.
  jev.answer = dirAnswer('down', { power: 'phase', at: 2000 });
  d.update();
  check('a later answer can spend a different power',
    s._driven.filter((x) => x.kind === 'power').length === 2);
}

// 7. A power Jev names but does not hold is ignored, not conjured.
{
  const s = makeScene({ runnerPowersSelected: ['phase'], runnerPowersConsumed: [false] });
  const d = plain(s, stubJev(dirAnswer('down', { power: 'decoy' })));
  d.update();
  check('an unheld power is ignored', s._driven.every((x) => x.kind !== 'power'));
  check('and not counted as spent', d.jev.drive.powers === 0);

  const spent = makeScene({ runnerPowersSelected: ['dash'], runnerPowersConsumed: [true] });
  const d2 = plain(spent, stubJev(dirAnswer('down', { power: 'dash' })));
  d2.update();
  check('an already-spent power is ignored', spent._driven.every((x) => x.kind !== 'power'));
}

// 8. Plug rounds never spend runner powers.
{
  const s = makeScene({ role: 'plug' });
  const d = plain(s, stubJev(dirAnswer('down', { power: 'dash' })));
  d.update();
  check('no runner power on a plug round', s._driven.every((x) => x.kind !== 'power'));
}

// 9. A new round drops the last house's answer.
{
  const s = makeScene();
  const jev = stubJev(dirAnswer('down', { power: 'dash' }));
  const d = plain(s, jev);
  d.update();
  s.simTick = 0;                  // beginRoundTimer() zeroes it
  d.update();
  check('the Jev driver was reset', jev.resets === 1);
  check('the held answer was dropped', d._jevIntent === null || jev.answer === null);
  check('the power gate reopened for the new house', d._jevPowerAt === null);
}

// 10. The driver object must not become a config knob.
{
  const jev = stubJev(null);
  const d = new BotDriver(makeScene(), { jev, replanMs: 5 });
  check('jev is held on the driver', d.jev === jev);
  check('and kept out of cfg, where a query string could reach it', d.cfg.jev === undefined);
  check('other options still land in cfg', d.cfg.replanMs === 5);
}

// 11. The borrowed AI arm is untouched by Jev — that is the whole point of
//     having three separable arms to compare.
{
  const s = makeScene();
  const jev = stubJev(dirAnswer('down'));
  // The shipped AI hooks, stubbed down to the calls driveBorrowedAI makes.
  const hooks = {
    makeController: () => ({}),
    applyRunnerProgression: () => {},
    updateRunnerBehavior: () => {},
    considerRunnerPowerUse: () => {}
  };
  const d = new BotDriver(s, { replanMs: 0, wrongTurnChance: 0, hesitateChance: 0,
    openingDecoy: false, aiLevel: 12, jev }, hooks);
  check('the borrowed arm really is the one running', d.useBorrowedAI === true);
  d.update();
  check('borrowed AI never consults Jev', jev.ticks === 0);
  check('and nothing is billed for it', d.jev.drive.steps + d.jev.drive.fallbacks === 0);
}

// 12. jevReport() reconciles what Jev cost with what it actually drove.
{
  const s = makeScene();
  const jev = stubJev(dirAnswer('down'));
  const d = plain(s, jev);
  d.update();
  jev.answer = null;
  d.update(); d.update();
  const rep = d.jevReport();
  check('decisions counts every replan, not just Jev\'s', rep.decisions === 3);
  check('steer share reported', rep.steerShare === +(1 / 3).toFixed(3));
  check('cost carried through from the driver', rep.costUsd === 0.0001);
}

// 13. Against the real JevDriver, end to end.
{
  const s = makeScene();
  let t = 1000;
  const pending = [];
  const jev = new JevDriver(
    (payload) => new Promise((res) => pending.push({ payload, res })),
    { now: () => t });
  const d = plain(s, jev);

  d.update();
  check('a real request went out on the first frame', jev.stats.requests === 1);
  check('the payload is the honest one (no real-vs-decoy label)',
    !('stash' in pending[0].payload.state) && Array.isArray(pending[0].payload.state.bags));
  check('nothing stalled waiting for it', moves(s).length === 1);

  pending[0].res({ move: 'down', usage: { input_tokens: 400 } });
  await flush();
  d.update();
  const m = lastMove(s);
  check('the answer steers once it lands', m.x === 0 && m.y === 1);

  // Let it go stale: the pathfinder must take over rather than the runner
  // carrying on down a corridor on a decision from a second ago.
  t = 1000 + 5000;
  d.update();
  check('a stale answer stops steering', d.jev.drive.fallbacks >= 1);
  const rep = d.jevReport();
  check('cost came from the API, not a character count', rep.tokenSource === 'api');
  check('billed tokens reported', rep.tokensBilled === 400);
}

/* ---------------- summary ---------------- */

console.log('');
if (failures.length) {
  console.log(`botDriverJev: ${passed} passed, ${failures.length} FAILED`);
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log(`botDriverJev: ${passed} assertions passed`);
