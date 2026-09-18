// The tutorial must steer and move EXACTLY like a real round. It used to
// carry a hand-copy of PlayerController's input and movement maths, which had
// silently drifted: no cardinal preference or angular hysteresis on drags,
// releases that overwrote a committed diagonal with a cardinal, no cornering
// assist at all, and -- worst -- corridor assist that switched itself off
// within 3 cells of the stage-4 Plug, so walking near a Plug visibly changed
// the runner's steering. Both now run the same shared logic modules; these
// assertions drive the ACTUAL tutorial source and the ACTUAL PlayerController
// and compare them directly, so they cannot drift apart again unnoticed.

import { readFileSync } from 'node:fs';
import { runnerDragVector, runnerDragStep, releaseCardinal } from '../src/logic/runnerSteering.js';
import { resolveGridMovement } from '../src/logic/gridMovement.js';

let passed = 0;
const check = (name, ok) => { if (!ok) throw Error(name); passed++; };
const sameDir = (a, b) => Math.abs(a.x - b.x) < 1e-12 && Math.abs(a.y - b.y) < 1e-12;

const sceneSource = readFileSync(new URL('../src/scenes/TutorialMiniScene.js', import.meta.url), 'utf8');
const playerSource = readFileSync(new URL('../src/controllers/PlayerController.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\s*/gm, '').replace('export default class', 'class');

let now = 1000;
const Player = new Function('corridorAssist', 'performance', 'runnerDragVector', 'runnerDragStep', 'resolveGridMovement',
  playerSource + ';return PlayerController;')(() => {}, { now: () => now }, runnerDragVector, runnerDragStep, resolveGridMovement);

// ---------------------------------------------------------------------------
// Both sides must call the shared modules — not a local copy of the maths.
// ---------------------------------------------------------------------------
check('tutorial imports the shared steering module',
  /import\s*\{[^}]*runnerDragStep[^}]*\}\s*from\s*'\.\.\/logic\/runnerSteering\.js'/.test(sceneSource));
check('tutorial imports the shared movement module',
  /import\s*\{[^}]*resolveGridMovement[^}]*\}\s*from\s*'\.\.\/logic\/gridMovement\.js'/.test(sceneSource));
check('tutorial drag steering calls the shared step', sceneSource.includes('runnerDragStep(this._swipeStart, p.x, p.y, this._runnerDragSnap)'));
check('tutorial movement calls the shared resolver', sceneSource.includes('resolveGridMovement(this, this.runner, vx, vy, dt)'));
check('tutorial no longer hand-rolls an 8-way snap', !sceneSource.includes('const SNAP_RAD = 0.26'));
check('tutorial no longer hand-rolls the floating anchor', !sceneSource.includes('const MOVE_MAX_PX = 56'));
check('tutorial no longer hand-rolls sub-stepped movement', !sceneSource.includes('const stepMax = this.cell * 0.28'));

// The proximity exception is gone: movement must never read the Plug.
check('tutorial corridor assist no longer keys off Plug distance', !sceneSource.includes('nearAIPlug'));
check('tutorial corridor assist is gated on input mode only',
  /if \(!usingKeys\) \{/.test(sceneSource.slice(Math.max(0, sceneSource.indexOf('corridorAssist(this, this.runner') - 700))));

// ---------------------------------------------------------------------------
// Drag steering: identical vectors for identical gestures, including the
// cardinal preference, the hysteresis hold, and the hold-break landing.
// ---------------------------------------------------------------------------
{
  const pc = new Player({ role: 'runner', attacker: {}, runnerPowersConsumed: [],
    intent: { recordMove() {}, recordGun() {} }, activateRunnerPowerByIndex() {}, combatSystem: { tryMouseFire() {} } });
  // The tutorial keeps its snap on the scene as _runnerDragSnap; mirror that.
  const tutorialState = { _runnerDragSnap: null };
  const tutorialDrag = (dx, dy) => {
    const r = runnerDragVector(dx, dy, tutorialState._runnerDragSnap);
    tutorialState._runnerDragSnap = r.snap;
    return r.vector;
  };
  for (let deg = 0; deg <= 360; deg += 1) {
    const a = deg * Math.PI / 180;
    const dx = 56 * Math.cos(a), dy = 56 * Math.sin(a);
    check('tutorial and game agree on drag direction at ' + deg + ' degrees',
      sameDir(tutorialDrag(dx, dy), pc.runnerDragDirection(dx, dy)));
  }
}

// Corner turns: the tutorial drives the same shared step, so a square turn
// there must also turn rather than detour through a diagonal.
{
  const anchor = { x: 200, y: 600 };
  let snap = null, dir = null;
  const step = (px, py) => { const r = runnerDragStep(anchor, px, py, snap); if (r) { snap = r.snap; dir = r.vector; } return dir; };
  for (let i = 0; i <= 120; i += 3) step(200, 600 - i);
  check('tutorial corner fixture is running up', sameDir(dir, { x: 0, y: -1 }));
  let sideways = null; const diagonals = [];
  for (let i = 3; i <= 150; i += 3) {
    const v = step(200 + i, 480);
    if (Math.abs(Math.abs(v.x) - Math.SQRT1_2) < 1e-9 && Math.abs(Math.abs(v.y) - Math.SQRT1_2) < 1e-9) diagonals.push(i);
    if (v.x === 1 && v.y === 0 && sideways === null) sideways = i;
  }
  check('tutorial corner turn registers within 30px too', sideways !== null && sideways <= 30);
  check('tutorial corner turn never detours through a diagonal', diagonals.length === 0);
}

// A held cardinal drifting past the hold band must land on a snap in the
// tutorial too, never an arbitrary half-diagonal.
{
  const state = { _runnerDragSnap: null };
  const drag = deg => {
    const a = deg * Math.PI / 180;
    const r = runnerDragVector(56 * Math.cos(a), 56 * Math.sin(a), state._runnerDragSnap);
    state._runnerDragSnap = r.snap;
    return r.vector;
  };
  for (let deg = 0; deg <= 28; deg++) check('tutorial holds cardinal at ' + deg, sameDir(drag(deg), { x: 1, y: 0 }));
  const broke = drag(29);
  const onDiagonal = Math.abs(Math.abs(broke.x) - Math.SQRT1_2) < 1e-9 && Math.abs(Math.abs(broke.y) - Math.SQRT1_2) < 1e-9;
  check('tutorial hold-break lands on a clean diagonal, not a raw angle', onDiagonal);
}

// ---------------------------------------------------------------------------
// Release: a committed drag keeps its direction in the tutorial, exactly as
// PlayerController.endSwipe does. The tutorial used to cardinal-snap it.
// ---------------------------------------------------------------------------
{
  const upHandler = sceneSource.slice(sceneSource.indexOf('this._pointerUpHandler = (p) => {'));
  check('tutorial release no longer claims every release is cardinal-snapped',
    !sceneSource.includes('cardinal-snaps\n            // EVERY runner release'));
  check('tutorial quick swipe uses the shared cardinal classifier', upHandler.includes('releaseCardinal(dx, dy)'));
  for (const [dx, dy, want] of [[40, 5, { x: 1, y: 0 }], [-40, 5, { x: -1, y: 0 }], [5, 40, { x: 0, y: 1 }], [5, -40, { x: 0, y: -1 }]]) {
    check('shared release cardinal matches the game classification', sameDir(releaseCardinal(dx, dy), want));
  }
  // The committed-drag branch must come BEFORE tap classification, exactly as
  // PlayerController.endSwipe does. The floating re-anchor drags the gesture
  // origin along with the finger, so a long committed drag can release with a
  // tiny `moved` and a short `dt`; classified as a tap it would spend a power
  // the player never asked for, and overwrite the diagonal they were steering.
  const dragBranch = upHandler.indexOf('if (wasDragMove)');
  const tapBranch = upHandler.indexOf('dt <= TAP_TIME && moved <= TAP_DIST');
  check('tutorial checks the committed drag before tap classification',
    dragBranch >= 0 && tapBranch >= 0 && dragBranch < tapBranch);

  // Drive the real handler: a committed drag released on top of its own
  // floating origin must keep steering and must not fire a power.
  const handlerSrc = upHandler.slice(upHandler.indexOf('=> {') + 4, upHandler.indexOf('\n      };'));
  const runRelease = new Function('getPid', 'performance', 'releaseCardinal',
    'return function(p){' + handlerSrc + '}')(e => e.id, { now: () => 5000 }, releaseCardinal);
  const scene = {
    _activePointerId: 7, _dragMoveActive: true, _runnerDragSnap: { cardinal: false },
    _swipeStart: { x: 100, y: 100, t: 4900 }, stageIdx: 3, runnerPowersSelected: ['dash', 'decoy'],
    playerDrift: { x: Math.SQRT1_2, y: Math.SQRT1_2 }, playerAim: null, playerGunAim: null,
    _runnerInputDir: null, powersFired: 0, activateNextRunnerPower() { this.powersFired++; },
    _mobileGuide: null, pointer: {}, userTookOver: true
  };
  runRelease.call(scene, { id: 7, x: 100, y: 100 }); // released right on the re-anchored origin
  check('committed drag release keeps the diagonal it was steering',
    sameDir(scene.playerDrift, { x: Math.SQRT1_2, y: Math.SQRT1_2 }));
  check('committed drag release never spends a power', scene.powersFired === 0);
  check('committed drag release clears the gesture', scene._activePointerId === null);
}

// ---------------------------------------------------------------------------
// Movement: identical resolution through a corner, and never opponent-dependent.
// ---------------------------------------------------------------------------
{
  const CELL = 24;
  const grid = Array.from({ length: 10 }, () => Array(14).fill(1));
  for (let x = 0; x < 14; x++) grid[2][x] = 0;   // horizontal corridor
  for (let y = 0; y < 10; y++) grid[y][8] = 0;   // vertical corridor -> a corner at (8,2)
  const host = {
    cell: CELL,
    toCell: (x, y) => ({ x: Math.floor(x / CELL), y: Math.floor(y / CELL) }),
    toWorldX: cx => cx * CELL + CELL / 2,
    toWorldY: cy => cy * CELL + CELL / 2,
    isWalkableCell: (cx, cy) => cx >= 0 && cy >= 0 && cx < 14 && cy < 10 && grid[cy][cx] !== 1,
    isWallAtWorld(wx, wy) { const c = this.toCell(wx, wy); return !this.isWalkableCell(c.x, c.y); },
    canMoveTo(sprite, nx, ny) {
      const r = CELL * 0.18;
      return [[nx - r, ny - r], [nx + r, ny - r], [nx - r, ny + r], [nx + r, ny + r]]
        .every(([px, py]) => !this.isWallAtWorld(px, py));
    }
  };
  // Same start, same input, run through the shared resolver twice; the second
  // run has an "opponent" sitting on the runner. Movement cannot see it.
  const run = opponent => {
    const sprite = { x: CELL * 1.5, y: CELL * 2.9 };
    const path = [];
    for (let f = 0; f < 120; f++) {
      if (opponent) { opponent.x = sprite.x; opponent.y = sprite.y; }
      resolveGridMovement(host, sprite, 120, 0, 1 / 60);
      path.push([sprite.x, sprite.y]);
    }
    return JSON.stringify(path);
  };
  const plain = run(null);
  check('shared movement ignores an opponent standing on the runner', run({ x: 0, y: 0 }) === plain);
  // Prove the cornering assist genuinely fires here, or the comparison above
  // proves nothing. The runner starts misaligned at y = 69.6 in a lane centred
  // on 60, far enough off that its hitbox clips the wall row and pure
  // rightward motion is blocked outright. steerToLane converts that blocked
  // motion into just enough lane alignment to let the turn catch — it unsticks,
  // it does not centre (centring is corridorAssist's separate job).
  const startY = CELL * 2.9;
  check('runner starts blocked at its own starting position',
    host.canMoveTo(null, CELL * 1.5 + 2, startY) === false);
  const path = JSON.parse(plain);
  check('cornering assist nudged the runner toward the lane centre', path[0][1] < startY);
  check('cornering assist unstuck it the same frame', path[0][0] > CELL * 1.5);
  check('and it kept running down the corridor it could not otherwise enter',
    path.at(-1)[0] > CELL * 8);
}

console.log('tutorial control parity: ' + passed + ' assertions passed');
