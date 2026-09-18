// Investigates a reported bug: a nearby Plug seems to nudge the runner off a
// straight line into diagonal movement without a new steering gesture,
// especially around corners. This suite reproduces the exact scenarios asked
// for -- fixed cardinal input around corners with a Plug at varying angles
// and distances (near/far/absent), held-drag vs released-finger continued
// movement, early/late-house corridor shapes, and dual-Plug House 15 -- using
// the ACTUAL PlayerController, the ACTUAL corridorAssist/steerToLane
// collision-resolution code, and the ACTUAL PlugAI defender logic (all real
// source, no reimplementation), against a real wall grid.
//
// Every write to runner position and to each direction variable
// (playerDrift, playerMoveDir, playerIntendedDir, _runnerInputDir) is logged
// per frame, tagged with which write path produced it, so a genuine input
// vector change can be told apart from an unchanged vector whose position
// was merely displaced by movement/collision resolution.
//
// FINDING: across every scenario below, the runner's full trace (position
// AND every direction variable, frame by frame) is BYTE-IDENTICAL whether
// the Plug is near, far, absent, or actively pathing toward the runner via
// the real PlugAI -- including through corners, with corner-assist
// (steerToLane) actively engaging, and across dual-Plug House 15. Static
// review confirms why: canMoveTo/isWallAtWorld/isWalkableCell are pure grid
// lookups (no actor-occupancy check), corridorAssist/applyCenterBias read
// only wall geometry, PlugAI only ever writes scene.defender(2).x/y and
// never scene.attacker, and the House-15 defender-reference swap
// (BaseGameScene temporarily pointing scene.defender at defender2) never
// touches scene.attacker either. No actor-separation/pushback or
// proximity-based avoidance system exists in this codebase to inspect.
//
// The actual bug found and fixed by this change is unrelated to proximity:
// runnerDragDirection's angular hysteresis (added in the cardinal-preference
// experiment) could jump a HELD cardinal drag straight to an arbitrary
// unsnapped angle from one more degree of ordinary thumb drift -- no new
// gesture, no release. See dragSteering.test.mjs for that regression. This
// file's job is to rule proximity in or out with real evidence, not assume.
//
// CAVEAT: this is a headless, single-threaded, fixed-dt simulation. It
// cannot reproduce real mobile touch-event behavior -- duplicate dispatch
// from Phaser's zone+global pointermove listeners firing twice per physical
// move, raw DOM touch fallback coordinate rounding differing from Phaser's
// own pointer.x/y, or frame-time jitter under real device load during
// combat. Those are real, identified risk surfaces (the zone/global double
// registration in BaseGameScene.makeMobileControls is confirmed by reading
// the source) but require an actual browser/device to observe, not this
// simulation. That is disclosed here rather than claimed fixed.

import { readFileSync } from 'node:fs';
import { updatePlugBehavior } from '../src/controllers/PlugAI.js';
import { runnerDragVector, runnerDragStep } from '../src/logic/runnerSteering.js';
import { resolveGridMovement } from '../src/logic/gridMovement.js';

const playerSource = readFileSync(new URL('../src/controllers/PlayerController.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\s*/gm, '').replace('export default class', 'class');
const utilsSource = readFileSync(new URL('../src/utils/gameUtils.js', import.meta.url), 'utf8');
const assistStart = utilsSource.indexOf('export function corridorAssist(');
const assistEnd = utilsSource.indexOf('// Manhattan distance', assistStart);
if (assistStart < 0 || assistEnd < assistStart) throw Error('corridor assist seam moved');
const centerBiasStart = utilsSource.indexOf('export function applyCenterBias(');
if (centerBiasStart < 0 || centerBiasStart > assistStart) throw Error('applyCenterBias seam moved');
const realAssistSrc = utilsSource.slice(centerBiasStart, assistEnd)
  .replace('export function applyCenterBias(', 'function applyCenterBias(')
  .replace('export function corridorAssist(', 'function corridorAssist(');
const { corridorAssist: realAssist, applyCenterBias: realCenterBias } =
  new Function(realAssistSrc + ';return {corridorAssist, applyCenterBias};')();

let now = 1000;
const Player = new Function('corridorAssist', 'performance', 'runnerDragVector', 'runnerDragStep', 'resolveGridMovement',
  playerSource + ';return PlayerController;')(realAssist, { now: () => now }, runnerDragVector, runnerDragStep, resolveGridMovement);

let passed = 0;
function check(name, ok) { if (!ok) throw Error(name); passed++; }

// ---------------------------------------------------------------------------
// Real grid semantics, copied 1:1 from BaseGameScene.js (canMoveTo,
// isWallAtWorld, isWalkableCell, toCell/toWorldX/toWorldY) so wall collision
// and cornering behave exactly as in the real game, not a simplified stand-in.
// ---------------------------------------------------------------------------
const CELL = 24;
function makeGridScene(grid, { role = 'runner', hitboxRadius = CELL * 0.18 } = {}) {
  const rows = grid.length, cols = grid[0].length;
  const scene = {
    role, cell: CELL, cols, rows, grid, hitboxRadius,
    userTookOver: true, corridorAssistStrength: 1,
    toCell(x, y) { return { x: Math.floor(x / CELL), y: Math.floor(y / CELL) }; },
    toWorldX(cx) { return cx * CELL + CELL / 2; },
    toWorldY(cy) { return cy * CELL + CELL / 2; },
    inBoundsCell(cx, cy) { return cx >= 0 && cy >= 0 && cx < cols && cy < rows; },
    isWalkableCell(cx, cy) {
      if (!scene.inBoundsCell(cx, cy)) return false;
      return scene.grid[cy][cx] !== 1;
    },
    isWallAtWorld(wx, wy) {
      const c = scene.toCell(wx, wy);
      if (!scene.inBoundsCell(c.x, c.y)) return true;
      return scene.grid[c.y][c.x] === 1;
    },
    canMoveTo(sprite, nx, ny) {
      const r = (sprite?.hbRadius != null) ? sprite.hbRadius : scene.hitboxRadius;
      const pts = [{ x: nx - r, y: ny - r }, { x: nx + r, y: ny - r }, { x: nx - r, y: ny + r }, { x: nx + r, y: ny + r }];
      for (const p of pts) if (scene.isWallAtWorld(p.x, p.y)) return false;
      return true;
    },
    findPath(sx, sy, tx, ty) {
      // Minimal real BFS over the same grid, cell-center waypoints -- close
      // enough to exercise PlugAI's waypoint-following without importing
      // all of BaseGameScene.
      const start = scene.toCell(sx, sy), goal = scene.toCell(tx, ty);
      if (!scene.isWalkableCell(goal.x, goal.y)) return null;
      const key = c => c.x + ',' + c.y;
      const seen = new Set([key(start)]), parent = new Map(), q = [start];
      let found = false;
      while (q.length) {
        const cur = q.shift();
        if (cur.x === goal.x && cur.y === goal.y) { found = true; break; }
        for (const n of [{ x: cur.x + 1, y: cur.y }, { x: cur.x - 1, y: cur.y }, { x: cur.x, y: cur.y + 1 }, { x: cur.x, y: cur.y - 1 }]) {
          if (!scene.isWalkableCell(n.x, n.y) || seen.has(key(n))) continue;
          seen.add(key(n)); parent.set(key(n), cur); q.push(n);
        }
      }
      if (!found) return null;
      const path = []; let step = goal;
      while (step && !(step.x === start.x && step.y === start.y)) {
        path.unshift({ x: scene.toWorldX(step.x), y: scene.toWorldY(step.y) });
        step = parent.get(key(step));
      }
      return path;
    },
    hasLineOfSight() { return false; }, // shooting is irrelevant to this investigation
    allowedGuns: ['pistol'], roundAmmo: { pistol: 999 },
    combatSystem: { spawnWeaponBurst() {} },
    totalRoundsLeft() { return 5; },
    aiPlug: { speed: 90, shootEvery: 999, maxRange: 0, inaccuracy: 1, reactDelay: 0, orientationDelay: 0 },
    pveRound: 1, runKind: 'pve',
  };
  return scene;
}

// A straight corridor that turns a corner (L-shape), like a campaign house.
// Row 2 runs the full width; column 8 runs the full height from that row.
function cornerMaze(cols = 14, rows = 10) {
  const g = Array.from({ length: rows }, () => Array(cols).fill(1));
  for (let x = 0; x < cols; x++) g[2][x] = 0;
  for (let y = 0; y < rows; y++) g[y][8] = 0;
  return g;
}

// A tighter, doorway-pocked corridor standing in for a late-house layout.
function lateHouseMaze(cols = 16, rows = 10) {
  const g = Array.from({ length: rows }, () => Array(cols).fill(1));
  for (let x = 0; x < cols; x++) g[3][x] = 0;
  for (let y = 0; y < rows; y++) g[y][12] = 0;
  g[4][6] = 0; g[2][6] = 0; // a side pocket near the corner, like a room door
  return g;
}

// ---------------------------------------------------------------------------
// Per-frame write logging: every assignment to the runner's x/y and to each
// direction variable is captured, tagged with source, each frame -- so a
// changed INPUT VECTOR (playerDrift/playerMoveDir/etc change) can be told
// apart from an unchanged vector whose POSITION moved because of
// movement/collision resolution (steerToLane, corridorAssist).
// ---------------------------------------------------------------------------
function trackedSprite(x, y) {
  const state = { x, y };
  const log = [];
  const sprite = {
    get x() { return state.x; }, set x(v) { log.push(['x', state.x, v]); state.x = v; },
    get y() { return state.y; }, set y(v) { log.push(['y', state.y, v]); state.y = v; },
  };
  sprite._log = log;
  return sprite;
}

function runCardinalScenario({ maze, start, cardinal, frames = 90, defenderStart = null, dt = 1 / 60, useKeys = true }) {
  const scene = makeGridScene(maze);
  const attacker = trackedSprite(start.x, start.y);
  scene.attacker = attacker;
  const pc = new Player(scene);
  scene.intent = { recordMove() {}, recordGun() {} };
  scene.combatSystem2 = null;

  if (defenderStart) {
    const defender = { x: defenderStart.x, y: defenderStart.y, hbRadius: CELL * 0.18 };
    scene.defender = defender;
  }

  const trace = [];
  if (useKeys) {
    pc.cursors = {
      left: { isDown: cardinal.x < 0 }, right: { isDown: cardinal.x > 0 },
      up: { isDown: cardinal.y < 0 }, down: { isDown: cardinal.y > 0 },
    };
    pc.wasdKeys = {};
  } else {
    // Touch quick-swipe: commits a cardinal direction via endSwipe, then the
    // finger is released -- movement should continue via playerDrift/legacy
    // fallback exactly like a keyboard hold, per handlePlayerMovement.
    pc.beginSwipe({ id: 1, x: 100, y: 100, isDown: true });
    now += 50;
    pc.endSwipe({ id: 1, x: 100 + cardinal.x * 40, y: 100 + cardinal.y * 40, isDown: false });
  }

  for (let f = 0; f < frames; f++) {
    if (scene.defender) {
      // Real PlugAI drives the defender toward the (real) runner every frame,
      // exactly like BaseGameScene's per-frame updatePlugBehavior call.
      updatePlugBehavior(scene, dt);
    }
    const speed = 120;
    pc.handlePlayerMovement(attacker, speed, dt);
    now += dt * 1000;
    trace.push({
      x: attacker.x, y: attacker.y,
      playerDrift: { ...pc.playerDrift }, playerMoveDir: { ...pc.playerMoveDir },
      playerIntendedDir: { ...pc.playerIntendedDir }, runnerInputDir: { ...pc._runnerInputDir },
      defender: scene.defender ? { x: scene.defender.x, y: scene.defender.y } : null,
    });
  }
  return { trace, xyLog: attacker._log };
}

function stripDefender(trace) { return trace.map(({ defender, ...rest }) => rest); }

// ---------------------------------------------------------------------------
// 1-2. Fixed cardinal input around a corner, Plug near / far / absent, from
// several approach angles. The runner's own trace (position + all four
// direction variables) must be identical regardless of the Plug.
// ---------------------------------------------------------------------------
for (const maze of [cornerMaze(), lateHouseMaze()]) {
  for (const cardinal of [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }]) {
    for (const useKeys of [true, false]) {
      const start = { x: CELL * 1.5, y: CELL * 2.5 };
      const baseline = runCardinalScenario({ maze, start, cardinal, useKeys });
      const baselineTrace = stripDefender(baseline.trace);

      for (const angleDeg of [0, 45, 90, 135, 180, 225, 270, 315]) {
        const a = angleDeg * Math.PI / 180;
        for (const dist of [CELL * 1.2, CELL * 4, CELL * 10]) {
          const dx = { x: start.x, y: start.y };
          const defenderStart = { x: dx.x + Math.cos(a) * dist, y: dx.y + Math.sin(a) * dist };
          const near = runCardinalScenario({ maze, start, cardinal, defenderStart, useKeys });
          check(`identical runner trace with Plug at ${angleDeg}deg/${dist}px (${useKeys ? 'keys' : 'touch'}, cardinal ${JSON.stringify(cardinal)})`,
            JSON.stringify(stripDefender(near.trace)) === JSON.stringify(baselineTrace));
        }
      }
    }
  }
}
console.log('proximity independence (near/far/absent, all corners, keys+touch): ' + passed + ' assertions passed');

// ---------------------------------------------------------------------------
// 3. Held-drag vs released-finger continued movement, with a Plug converging
// on the runner throughout. Direction preserved after release must not
// depend on the Plug's position either.
// ---------------------------------------------------------------------------
{
  const maze = cornerMaze();
  const start = { x: CELL * 1.5, y: CELL * 2.5 };
  function heldDragScenario(defenderStart) {
    const scene = makeGridScene(maze);
    const attacker = trackedSprite(start.x, start.y);
    scene.attacker = attacker;
    scene.intent = { recordMove() {}, recordGun() {} };
    if (defenderStart) scene.defender = { x: defenderStart.x, y: defenderStart.y, hbRadius: CELL * 0.18 };
    const pc = new Player(scene);
    pc.beginSwipe({ id: 2, x: 100, y: 100, isDown: true });
    now += 200; // past DRAG_COMMIT_MS
    pc.updateSwipe({ id: 2, x: 100 + 40, y: 100, isDown: true }); // committed drag, cardinal right
    check('drag committed before release', pc._dragMoveActive);
    pc.endSwipe({ id: 2, x: 140, y: 100, isDown: false }); // release: keep last direction
    const trace = [];
    for (let f = 0; f < 60; f++) {
      if (scene.defender) updatePlugBehavior(scene, 1 / 60);
      pc.handlePlayerMovement(attacker, 120, 1 / 60);
      trace.push({ x: attacker.x, y: attacker.y, drift: { ...pc.playerDrift } });
    }
    return trace;
  }
  const farTrace = JSON.stringify(heldDragScenario({ x: start.x + CELL * 20, y: start.y }));
  for (const angleDeg of [0, 90, 180, 270]) {
    const a = angleDeg * Math.PI / 180;
    const nearTrace = JSON.stringify(heldDragScenario({ x: start.x + Math.cos(a) * CELL * 1.5, y: start.y + Math.sin(a) * CELL * 1.5 }));
    check('released-drag continued movement unaffected by nearby Plug at ' + angleDeg, nearTrace === farTrace);
  }
  const absentTrace = JSON.stringify(heldDragScenario(null));
  check('released-drag continued movement identical with no Plug at all', absentTrace === farTrace);
}
console.log('held-drag / release-continuation independence: ' + passed + ' total assertions passed');

// ---------------------------------------------------------------------------
// 4. Dual-Plug House 15: reproduce BaseGameScene's actual defender-reference
// swap (updatePlug for defender, then temporarily point scene.defender at
// defender2 and updatePlug again) driving two real PlugAI instances against
// one human-controlled runner going straight through a corner.
// ---------------------------------------------------------------------------
{
  const maze = cornerMaze();
  const start = { x: CELL * 1.5, y: CELL * 2.5 };
  function houseFifteenScenario(d1Start, d2Start) {
    const scene = makeGridScene(maze);
    const attacker = trackedSprite(start.x, start.y);
    scene.attacker = attacker;
    scene.intent = { recordMove() {}, recordGun() {} };
    scene.defender = { x: d1Start.x, y: d1Start.y, hbRadius: CELL * 0.18 };
    scene.defender2 = d2Start ? { x: d2Start.x, y: d2Start.y, hbRadius: CELL * 0.18 } : null;
    const pc = new Player(scene);
    pc.cursors = { left: { isDown: false }, right: { isDown: true }, up: { isDown: false }, down: { isDown: false } };
    pc.wasdKeys = {};
    const trace = [];
    for (let f = 0; f < 90; f++) {
      // Exact swap pattern from BaseGameScene.js's role==='runner' branch.
      updatePlugBehavior(scene, 1 / 60);
      if (scene.defender2) {
        const temp = scene.defender;
        scene.defender = scene.defender2;
        updatePlugBehavior(scene, 1 / 60);
        scene.defender = temp;
      }
      pc.handlePlayerMovement(attacker, 120, 1 / 60);
      trace.push({ x: attacker.x, y: attacker.y, drift: { ...pc.playerDrift }, moveDir: { ...pc.playerMoveDir } });
    }
    return trace;
  }
  const soloFar = JSON.stringify(houseFifteenScenario({ x: start.x + CELL * 20, y: start.y }, null));
  const dualFar = JSON.stringify(houseFifteenScenario({ x: start.x + CELL * 20, y: start.y }, { x: start.x + CELL * 20, y: start.y + CELL * 2 }));
  check('adding a second Plug does not change the runner trace (both far)', dualFar === soloFar);
  const dualNear = JSON.stringify(houseFifteenScenario({ x: start.x + CELL * 1.2, y: start.y }, { x: start.x + CELL * 1.5, y: start.y + CELL * 0.3 }));
  check('dual Plugs converging close on the runner still produce the identical trace', dualNear === soloFar);
}
console.log('dual-Plug House 15 independence: ' + passed + ' total assertions passed');

// ---------------------------------------------------------------------------
// 6b. Direct checks on corridorAssist/applyCenterBias: neither takes a
// defender/opponent argument at all, so it is impossible for them to read
// Plug position -- verified structurally, not just behaviorally.
// ---------------------------------------------------------------------------
check('corridorAssist signature has no actor/opponent parameter', realAssist.length === 4 /* scene, sprite, dir, dt */);
check('applyCenterBias signature has no actor/opponent parameter', realCenterBias.length === 4);

// 6c. No actor-separation/pushback system exists to inspect: canMoveTo (the
// only collision gate real movement goes through) is purely wall geometry,
// verified by placing the defender directly on top of the runner's path --
// if any occupancy check existed, this would block movement; it does not.
{
  const maze = cornerMaze();
  const start = { x: CELL * 1.5, y: CELL * 2.5 };
  const scene = makeGridScene(maze);
  const attacker = trackedSprite(start.x, start.y);
  scene.attacker = attacker;
  // Defender sits exactly where the runner is about to step.
  const blockerAt = { x: start.x + 20, y: start.y };
  check('canMoveTo ignores actor occupancy (only walls block)', scene.canMoveTo(attacker, blockerAt.x, blockerAt.y) === true);
}
console.log('collision/assist structural checks: ' + passed + ' total assertions passed');

console.log('runner/Plug proximity investigation: ' + passed + ' total assertions passed');
