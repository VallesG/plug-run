// InputIntent — the single place player intent is expressed.
//
// WHY THIS EXISTS
// Player direction currently gets written in ~9 scattered places across
// BaseGameScene and PlayerController, through five parallel variables
// (playerMoveDir / playerDrift / playerAim / playerGunAim / _runnerInputDir).
// Nothing can observe "what did the player actually ask for" without
// re-deriving it from sprite positions after the fact.
//
// That blocks three things we want:
//   1. Input-trace replays  — seed + intent stream re-simulates a whole run
//                             in a few hundred bytes (vs ReplaySystem's
//                             scene-graph dump, which records the OUTPUT).
//   2. Bot-driven playtesting — a bot needs somewhere to push inputs in.
//   3. Server-side verification — replay a trace, confirm the finish time.
//
// THIS PASS IS DELIBERATELY OBSERVE-ONLY.
// record() is called alongside the existing assignments; not one of them is
// removed, reordered, or rewritten. Movement feel is tuned to a degree that
// can only be verified by playing (drag-commit timings, 8-way soft snap,
// floating re-anchor, cornering assist), so this layer cannot change it —
// it has no write path into movement at all. Inverting it so intent becomes
// the source of truth is a separate change, made once traces exist to prove
// the inversion is faithful.
//
// TIMEBASE
// Events are stamped with scene.simTick — a frame counter — never
// performance.now(). Wall-clock stamps make a trace unreplayable: playback
// on a different machine hits different frame boundaries and drifts. The
// counter is also the first piece of the fixed-timestep work; once update()
// steps at a fixed dt, tick becomes an exact time coordinate.

// Event kinds, kept to one character — a block is 8 maps and these add up.
export const K = {
  MOVE: 'm',   // desired movement direction (unit vector)
  GUN:  'g',   // desired gun aim (plug only; runner's facing tracks move)
  POWER:'p',   // runner power activated, x = slot index
  FIRE: 'f'    // plug fired
};

// Direction components are unit-vector parts, so 3 decimals is well past
// what the movement code can distinguish.
const Q = 1000;
const quant = (n) => Math.round(n * Q) / Q;

// Below this, two directions are the same input as far as a trace is
// concerned. Matters because the keyboard path reassigns direction EVERY
// FRAME while a key is held, and desktop mouse aim rewrites gun aim every
// frame. Without this an idle 20s run records ~1200 events; with it, ~10.
const SAME_DIR_EPS = 0.002;

export default class InputIntent {
  constructor(scene) {
    this.scene = scene;

    // Last value seen per kind, for dedup. Not game state — purely a filter.
    this._last = new Map();

    this._recording = false;
    this._events = [];
    this._meta = null;
  }

  /* ---------------- recording ---------------- */

  /**
   * Begin a trace. Called at round start, once the seed and layout are known
   * — everything here is needed to reconstruct the identical world later.
   */
  start(meta = {}) {
    this._recording = true;
    this._events = [];
    this._last.clear();
    this._meta = {
      v: 1,
      seed: this.scene.seed ?? null,
      routeID: this.scene.currentRouteID ?? null,
      round: this.scene.pveRound ?? null,
      role: this.scene.role ?? null,
      mode: this.scene.mode ?? null,
      cols: this.scene.cols ?? null,
      rows: this.scene.rows ?? null,
      ...meta
    };
  }

  /**
   * Close the trace and hand it back. Returns null if nothing was recording,
   * so callers can fire this unconditionally at round end.
   */
  stop() {
    if (!this._recording) return null;
    this._recording = false;
    const trace = { ...this._meta, events: this._events };
    this._events = [];
    return trace;
  }

  get isRecording() { return this._recording; }

  /** Event count so far — handy for asserting dedup is doing its job. */
  get length() { return this._events.length; }

  /**
   * Record one unit of player intent.
   *
   * Safe to call on a hot path: dedup'd, and a no-op when not recording.
   * Deliberately returns nothing — no caller should ever branch on this.
   *
   * @param {string} kind  one of K.*
   * @param {number} x     direction x, or slot index for K.POWER
   * @param {number} y     direction y (0 for non-directional kinds)
   */
  record(kind, x = 0, y = 0) {
    if (!this._recording) return;

    // Directional kinds dedup on near-equality. Discrete ones (POWER, FIRE)
    // are events, not states — every occurrence is meaningful, so they skip
    // the filter entirely.
    if (kind === K.MOVE || kind === K.GUN) {
      const prev = this._last.get(kind);
      if (prev && Math.abs(prev.x - x) < SAME_DIR_EPS && Math.abs(prev.y - y) < SAME_DIR_EPS) {
        return;
      }
      this._last.set(kind, { x, y });
    }

    this._events.push([this.scene.simTick | 0, kind, quant(x), quant(y)]);
  }

  /** Convenience wrappers — same dedup, clearer at the call site. */
  recordMove(x, y) { this.record(K.MOVE, x, y); }
  recordGun(x, y)  { this.record(K.GUN, x, y); }
  recordPower(idx) { this.record(K.POWER, idx, 0); }
  recordFire()     { this.record(K.FIRE, 0, 0); }

  /* ---------------- programmatic drive (bots / replay) ---------------- */

  // WHY THESE WRITE WHERE THEY DO
  // PlayerController keeps its OWN copies of the direction vars and mirrors
  // them onto the scene at the end of every handlePlayerMovement() call. So
  // writing scene.playerDrift directly gets silently clobbered a frame later.
  // The controller's copy is the real one; that's what we set.
  //
  // These intentionally mirror the quick-swipe branch of endSwipe() rather
  // than inventing a new movement path — a bot should be indistinguishable
  // from a player flicking the screen, or the runs it produces aren't valid
  // evidence about how the game plays.

  /**
   * Steer. `x`/`y` need not be normalized.
   * Returns false if there's no controller to drive yet (scene still booting).
   */
  driveMove(x, y) {
    const pc = this.scene.playerController;
    if (!pc) return false;

    const len = Math.hypot(x, y);
    if (len < 1e-6) return false;
    const nx = x / len, ny = y / len;

    pc.playerMoveDir = { x: nx, y: ny };
    pc.playerDrift = { x: nx, y: ny };
    pc.playerIntendedDir = { x: nx, y: ny };
    if (this.scene.role === 'runner') {
      pc._runnerInputDir = { x: nx, y: ny };
      pc.playerGunAim = { x: nx, y: ny }; // runner facing tracks movement
    }
    this.scene.userTookOver = true;

    this.recordMove(nx, ny);
    return true;
  }

  /** Aim without steering (plug only — runner facing follows movement). */
  driveGun(x, y) {
    const pc = this.scene.playerController;
    if (!pc) return false;
    const len = Math.hypot(x, y);
    if (len < 1e-6) return false;
    const nx = x / len, ny = y / len;
    pc.playerGunAim = { x: nx, y: ny };
    this.scene.playerGunAim = { x: nx, y: ny };
    this.recordGun(nx, ny);
    return true;
  }

  /** Fire. Goes through firePlug(), so ammo and weapon guards still apply. */
  driveFire() {
    this.scene.firePlug?.();
  }

  /** Activate a runner power by slot (0 or 1). */
  drivePower(idx) {
    this.scene.activateRunnerPowerByIndex?.(idx);
  }

  /* ---------------- serialization ---------------- */

  /**
   * Rough encoded size in bytes. Used to sanity-check the claim that a trace
   * is small enough to ship as a live PvP payload.
   */
  static size(trace) {
    return trace ? JSON.stringify(trace).length : 0;
  }
}
