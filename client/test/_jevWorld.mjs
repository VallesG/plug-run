// Shared fixture for the Jev strategist tests. Not a test itself.
//
// Gives the tests the REAL runner AI (RunnerAI.js, via installBotDriver's own
// hook shape) on a stub board, with a fake clock and seeded randomness so a
// run is the same run every time. RunnerAI imports gameUtils, which imports
// Phaser for two collision helpers the AI never calls; a module hook maps
// 'phaser' to an empty module so none of the game has to be stubbed out.

import { register } from 'node:module';

register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  if (spec === 'phaser') return { url: 'data:text/javascript,export default {}', shortCircuit: true };
  return next(spec, ctx);
}`));

/* ---------------- deterministic time and chance ---------------- */

export const clock = { t: 1000 };
Object.defineProperty(globalThis, 'performance', {
  value: { now: () => clock.t }, configurable: true, writable: true
});

let seed = 12345;
Math.random = () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export function reseed(n) { seed = n; }

export const flush = () => new Promise((r) => setImmediate(r));

/* ---------------- the real motor ---------------- */

const RunnerAI = await import('../src/controllers/RunnerAI.js');
export { RunnerAI };
export const AI_HOOKS = {
  applyRunnerProgression: RunnerAI.applyRunnerProgression,
  updateRunnerBehavior: RunnerAI.updateRunnerBehavior,
  considerRunnerPowerUse: RunnerAI.considerRunnerPowerUse,
  makeController: () => ({})
};

/* ---------------- stub board ---------------- */

export const CELL = 24;

/**
 * 13 x 15, border walls, open interior with one wall bar at row 7 (x 3..9)
 * so the two bags are on opposite sides of an obstacle:
 *   bag at (6, 2) — top    — "target_a" by spatial order
 *   bag at (6, 12) — bottom — "target_b"
 *   runner at (6, 9), extract at (11, 7)
 * Which bag is REAL is a parameter, so a test can swap it and show nothing
 * strategic changes.
 */
export function makeScene({ realTop = true, runner = { x: 6, y: 9 }, plug = null, over = {} } = {}) {
  const cols = 13, rows = 15;
  const grid = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) ? 1 : 0));
  for (let x = 3; x <= 9; x++) grid[7][x] = 1;

  const w = (c) => ({ x: c.x * CELL + CELL / 2, y: c.y * CELL + CELL / 2 });
  const top = { ...w({ x: 6, y: 2 }), active: true, visible: true };
  const bottom = { ...w({ x: 6, y: 12 }), active: true, visible: true };
  const driven = [];
  const scene = {
    role: 'runner', mode: 'pve', pveRound: 5, hasStash: false, roundOver: false, roundPausedForMenu: false,
    cell: CELL, cols, rows, grid, simTick: 1,
    runnerSpeed: CELL * 7, carrySlow: 0.85,
    aiRunner: RunnerAI.getRunnerBaseStats(),
    aiRunnerTargetsBunkFirst: false,
    _aiDetourCell: null,
    toCell: (x, y) => ({ x: Math.floor(x / CELL), y: Math.floor(y / CELL) }),
    toWorldX: (cx) => cx * CELL + CELL / 2,
    toWorldY: (cy) => cy * CELL + CELL / 2,
    inBoundsCell: (cx, cy) => cx >= 0 && cy >= 0 && cx < cols && cy < rows,
    isWalkableCell(cx, cy) { return this.inBoundsCell(cx, cy) && this.grid[cy][cx] !== 1; },
    neighbors4(c) {
      return [{ x: c.x + 1, y: c.y }, { x: c.x - 1, y: c.y }, { x: c.x, y: c.y + 1 }, { x: c.x, y: c.y - 1 }]
        .filter((n) => this.isWalkableCell(n.x, n.y));
    },
    findNextStepTowards(start, goal) {
      if (start.x === goal.x && start.y === goal.y) return start;
      const key = (c) => c.x + ',' + c.y;
      const q = [start], parent = new Map(), seen = new Set([key(start)]);
      while (q.length) {
        const cur = q.shift();
        for (const n of this.neighbors4(cur)) {
          const k = key(n); if (seen.has(k)) continue;
          seen.add(k); parent.set(k, cur);
          if (n.x === goal.x && n.y === goal.y) {
            let step = n, prev = parent.get(k);
            while (prev && !(prev.x === start.x && prev.y === start.y)) { step = prev; prev = parent.get(key(prev)); }
            return step;
          }
          q.push(n);
        }
      }
      return start;
    },
    findPath() { return null; },
    isWallAtWorld(x, y) { const c = this.toCell(x, y); return !this.isWalkableCell(c.x, c.y); },
    canMoveTo(sprite, nx, ny) {
      if (sprite === this.attacker && this.runnerIsPhasing()) return true;
      const r = CELL * 0.18;
      return [[-r, -r], [r, -r], [-r, r], [r, r]].every(([dx, dy]) => !this.isWallAtWorld(nx + dx, ny + dy));
    },
    phaseActiveUntil: 0,
    runnerIsPhasing() { return clock.t < this.phaseActiveUntil; },

    runnerPowersSelected: ['phase', 'dash'],
    runnerPowersConsumed: [false, false],
    decoySprite: null,
    // Mirrors BaseGameScene.activateRunnerPowerByIndex line for line: the
    // player's path. Under BotDriver's role spoof it reads the ai* arrays
    // (aliased to the player's) and skips its own intent record, exactly as
    // the real one does; BotDriver records the spend instead.
    activateRunnerPowerByIndex(idx) {
      const isAI = this.role === 'plug';
      const sel = isAI ? (this.aiRunnerPowersSelected || []) : (this.runnerPowersSelected || []);
      const used = isAI ? (this.aiRunnerPowersConsumed || []) : (this.runnerPowersConsumed || []);
      if (idx < 0 || idx >= 2 || !sel[idx] || used[idx]) return;
      const power = sel[idx];
      if (power === 'phase') this.phaseActiveUntil = clock.t + 600;
      if (power === 'decoy') this.decoySprite = { active: true };
      used[idx] = true;
      driven.push({ kind: 'power', idx, power, role: this.role });
      if (!isAI) this.intent.recordPower(idx);
    },

    intent: {
      driveMove(x, y) {
        const len = Math.hypot(x, y);
        if (len < 1e-6) return false;
        // Who called: the test asserts every steer comes from BotDriver's
        // motor output path, never from anything Jev-shaped.
        const stack = new Error().stack || '';
        driven.push({ kind: 'move', x: x / len, y: y / len, via: stack });
        // Stub physics: a fifth of a cell per frame along the requested axis.
        const a = scene.attacker, step = CELL * 0.2;
        const nx = a.x + (x / len) * step, ny = a.y + (y / len) * step;
        if (scene.canMoveTo(a, nx, a.y)) a.x = nx;
        if (scene.canMoveTo(a, a.x, ny)) a.y = ny;
        return true;
      },
      driveGun() { return true; },
      driveFire() {},
      recordPower(i) { driven.push({ kind: 'recordPower', i }); }
    },

    attacker: { ...w(runner), active: true, visible: true, hp: 3 },
    defender: plug ? { ...w(plug), active: true, visible: true } : { ...w({ x: 1, y: 1 }), active: false, visible: false },
    stash: realTop ? top : bottom,
    bunkStash: realTop ? bottom : top,
    extract: { ...w({ x: 11, y: 7 }), active: true, visible: true },
    ...over
  };
  scene._driven = driven;
  return scene;
}

export const cellOf = (scene, o) => scene.toCell(o.x, o.y);

/** A scripted decide(): answers from a queue (or a function), synchronously resolved. */
export function scriptedDecide(answers) {
  const calls = [];
  const decide = (payload) => {
    calls.push(payload);
    const a = typeof answers === 'function' ? answers(payload, calls.length) : answers.shift();
    if (a instanceof Error) return Promise.reject(a);
    return Promise.resolve(a);
  };
  decide.calls = calls;
  return decide;
}

/** The shape mapJevAnswer produces. */
export function strategy(objective, { posture = 'balanced', route = 'covered', power = 'none', powerPlan = power,
  confidence = 0.9, tokens = 400 } = {}) {
  return { objective, posture, route, power, powerPlan, confidence, confidences: { objective: confidence },
    model: 'jev-test', usage: { input_tokens: tokens }, valid: true, reason: null, strayMovement: false };
}

/** Deep scan: every key path in a value. */
export function keyPaths(v, path = '', out = []) {
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) { out.push({ path: path + '.' + k, key: k, value: x }); keyPaths(x, path + '.' + k, out); }
  }
  return out;
}
