// Run forensics — the shape of a run, not just its result.
//
// WHY
// Telemetry recorded outcome, duration and seed. Those say a round was lost;
// they never say what lost it. Every finding drawn from them so far needed a
// person to read the rows and infer the cause — "71% of deaths never reached
// the stash" was recoverable only because `gotStash` happened to be there.
//
// A playtester's insight is not a smarter opinion, it is attribution: where
// they died, at what stage, to whom, and what they had spent by then. This
// records exactly that, so the reading stops being guesswork.
//
// Imports nothing (see logic/threat.js). It reads a scene-shaped object, so
// the headless tests drive it with the same stub the BotDriver tests use.

const LEG_APPROACH = 'approach'; // spawn -> stash in hand
const LEG_CARRY = 'carry';       // stash in hand -> extraction

export default class RunForensics {
  constructor() {
    this.reset();
  }

  reset() {
    this.started = false;
    this.spawn = null;
    this.optimalCells = null;
    this.pickupTick = null;
    this.pickupKind = null;   // 'real' | 'bunk'
    this.bunkTick = null;     // when the decoy was taken, if it was
    this.end = null;
    this.powers = [];
    this._distPx = 0;
    this._laneTicks = 0;
    this._ticks = 0;
    this._last = null;
  }

  /* ---------------- recording ---------------- */

  /**
   * Round start. Captures the geometry a player judges a spawn by: how close
   * the nearest gun is, and whether it already has a clear line on you.
   *
   * "Some seeds drop the runner inside the plug's opening line of fire" is the
   * premise the spawn-swap button was built on, and it has never been measured.
   * Now every run says whether it was one of those.
   */
  begin(scene) {
    this.reset();
    const me = scene.attacker;
    if (!me) return;

    this.started = true;
    this._last = { x: me.x, y: me.y };

    const plugs = livePlugs(scene);
    const nearest = nearestBy(plugs, me);

    this.spawn = {
      cell: cellOf(scene, me),
      plugDistCells: nearest ? round1(dist(nearest, me) / scene.cell) : null,
      // A lane at t=0 with nothing between you and the muzzle is the unfair
      // spawn in its pure form.
      inLaneAtStart: plugs.some((p) => sharesLane(scene, p, me) && clearLine(scene, p, me))
    };

    // Optimal route, for comparing against the one actually walked. Two BFS at
    // round start only — never per frame.
    this.optimalCells = optimalRoute(scene, me);
  }

  /** Per frame. Must stay O(1): this runs for every player, not just the bot. */
  tick(scene) {
    if (!this.started || this.end) return;
    const me = scene.attacker;
    if (!me) return;

    this._ticks++;

    if (this._last) this._distPx += dist(this._last, me);
    this._last = { x: me.x, y: me.y };

    // Exposure: standing in a live plug's row or column with no wall between.
    // The fraction of a run spent here is the difference between a map that
    // gives you cover and one that marches you down a shooting gallery.
    if (livePlugs(scene).some((p) => sharesLane(scene, p, me) && clearLine(scene, p, me))) {
      this._laneTicks++;
    }
  }

  /** @param kind 'real' | 'bunk' */
  pickup(scene, kind) {
    if (!this.started) return;
    if (kind === 'bunk') {
      if (this.bunkTick == null) this.bunkTick = scene.simTick | 0;
      return;
    }
    if (this.pickupTick == null) {
      this.pickupTick = scene.simTick | 0;
      this.pickupKind = 'real';
    }
  }

  power(scene, slot, name) {
    if (!this.started) return;
    this.powers.push({ slot, name: name ?? null, tick: scene.simTick | 0 });
  }

  /**
   * @param killer 'defender' | 'defender2' | null
   * @param method 'bullet' | 'melee' | 'clock'
   */
  death(scene, killer, method) {
    if (!this.started || this.end) return;
    const me = scene.attacker;
    this.end = {
      kind: 'death',
      tick: scene.simTick | 0,
      cell: me ? cellOf(scene, me) : null,
      killer: killer ?? null,
      method: method ?? null,
      // Distance to whatever it was heading for, which separates "cut down on
      // the doorstep" from "never got near it".
      toObjectiveCells: me ? round1(objectiveDist(scene, me) / scene.cell) : null
    };
  }

  extract(scene) {
    if (!this.started || this.end) return;
    this.end = { kind: 'extract', tick: scene.simTick | 0 };
  }

  /* ---------------- reading ---------------- */

  /** Merged into the telemetry row by finalizeRun. */
  summary(scene) {
    if (!this.started) return null;

    const endTick = this.end ? this.end.tick : (scene?.simTick | 0);
    const gotReal = this.pickupTick != null;

    // Which leg the run ended on is the single most useful fact in here: the
    // approach and the extraction are different games with different failures.
    const leg = gotReal ? LEG_CARRY : LEG_APPROACH;

    const walkedCells = scene?.cell ? round1(this._distPx / scene.cell) : null;

    return {
      leg,
      approachTicks: gotReal ? this.pickupTick : endTick,
      carryTicks: gotReal ? Math.max(0, endTick - this.pickupTick) : 0,

      // The bunk-guess cost, in the only unit that matters: ticks spent on the
      // wrong duffel before reaching the right one.
      tookBunkFirst: this.bunkTick != null && (!gotReal || this.bunkTick < this.pickupTick),
      bunkCostTicks: (this.bunkTick != null && gotReal && this.bunkTick < this.pickupTick)
        ? this.pickupTick - this.bunkTick
        : null,

      death: this.end && this.end.kind === 'death'
        ? { cell: this.end.cell, killer: this.end.killer, method: this.end.method,
            toObjectiveCells: this.end.toObjectiveCells }
        : null,

      spawn: this.spawn,
      laneFrac: this._ticks ? round2(this._laneTicks / this._ticks) : null,
      walkedCells,
      optimalCells: this.optimalCells,
      // >1 means the maze forced detours; near 1 means a straight shot, which
      // for a race map is a different kind of problem.
      routeRatio: (walkedCells != null && this.optimalCells) ? round2(walkedCells / this.optimalCells) : null,
      powers: this.powers
    };
  }
}

/* ---------------- geometry helpers ---------------- */

function cellOf(scene, s) { return scene.toCell(s.x, s.y); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }

function livePlugs(scene) {
  return [scene.defender, scene.defender2].filter((p) => p && p.active && p.visible);
}

function nearestBy(list, to) {
  let best = null;
  let bd = Infinity;
  for (const p of list) {
    const d = dist(p, to);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

/** Same row or column, within half a cell — the alignment a shot needs. */
function sharesLane(scene, a, b) {
  const tol = scene.cell * 0.5;
  return Math.abs(a.x - b.x) < tol || Math.abs(a.y - b.y) < tol;
}

/**
 * Walk the cells between two sprites along their shared axis. A lane with a
 * wall in it is cover, not exposure, and counting it as exposure would make
 * every map look like a shooting gallery.
 */
function clearLine(scene, a, b) {
  const ca = cellOf(scene, a);
  const cb = cellOf(scene, b);
  const dx = Math.sign(cb.x - ca.x);
  const dy = Math.sign(cb.y - ca.y);
  if (dx !== 0 && dy !== 0) return false;
  if (dx === 0 && dy === 0) return true;

  let x = ca.x + dx;
  let y = ca.y + dy;
  let guard = 0;
  while ((x !== cb.x || y !== cb.y) && guard++ < 200) {
    if (!scene.isWalkableCell?.(x, y)) return false;
    x += dx; y += dy;
  }
  return true;
}

function objectiveTarget(scene) {
  return scene.hasStash ? scene.extract : scene.stash;
}

function objectiveDist(scene, me) {
  const t = objectiveTarget(scene);
  return t ? dist(t, me) : 0;
}

/**
 * Shortest legal route for the whole job: spawn to stash, stash to extraction.
 * Uses the scene's own pathfinder so it measures the same walls the player does.
 */
function optimalRoute(scene, me) {
  if (typeof scene.findPath !== 'function' || !scene.stash || !scene.extract) return null;
  try {
    const toStash = scene.findPath(me.x, me.y, scene.stash.x, scene.stash.y);
    const toExit = scene.findPath(scene.stash.x, scene.stash.y, scene.extract.x, scene.extract.y);
    if (!toStash || !toExit) return null;
    return toStash.length + toExit.length;
  } catch {
    return null;
  }
}
