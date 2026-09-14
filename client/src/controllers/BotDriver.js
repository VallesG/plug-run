// BotDriver — plays the game through the same input path a human uses.
//
// PURPOSE
// Collect run data at volume: how long does a map actually take, which seeds
// are degenerate, what does guessing the bunk stash cost. An LLM is the wrong
// tool for the controls here (a 20-second reflex game needs decisions in tens
// of milliseconds, not seconds), so the hands are a pathfinder and the
// intelligence goes into reading what comes out.
//
// ZERO PRODUCTION FOOTPRINT
// installBotDriver.js attaches this by wrapping BaseGameScene.prototype, so
// no game file gains bot hooks, and it is inert unless explicitly switched
// on. Enable with ?bot=1 in the URL, or window.__plugRunBot = { ... } before
// boot.
//
// IT DRIVES THROUGH InputIntent, NOT AROUND IT
// Every steer goes through intent.driveMove(), which mirrors the quick-swipe
// branch of endSwipe(). Two consequences worth the constraint:
//   - Bot runs record as intent traces in exactly the format human runs use,
//     so one replay/ghost code path serves both.
//   - A bot cannot do anything a player couldn't. If it could steer in ways
//     the input layer forbids, its timings would be evidence about a game
//     nobody is playing.
//
// ON PLAYING BADLY ON PURPOSE
// A pathfinder plays a maze better than any human will, and a bot that never
// errs produces a time distribution far too tight and fast to size maps
// against. The imperfection knobs below are the point, not a garnish. The
// existing tutorial AI already does this deliberately ("30% chance to pick a
// random valid neighbor... makes it wander") — same instinct.

// NO IMPORTS ON PURPOSE. Keeping this file free of the Phaser dependency
// graph means the decision logic can be exercised under plain Node against a
// stub scene — which matters here, because browser binaries can't be
// downloaded in every environment this runs in. The prototype wrap that needs
// BaseGameScene lives in installBotDriver.js.

export const DEFAULTS = {
  // How often the bot re-decides, in ms. Human reaction floor is ~200ms and
  // deliberate route choices are slower still; re-planning every frame yields
  // inhumanly tight cornering.
  replanMs: 180,

  // Chance per replan of taking a deliberately wrong step. The single most
  // important knob for making the time distribution look human.
  wrongTurnChance: 0.12,

  // Chance per replan of simply not acting — the pause at a junction.
  hesitateChance: 0.05,

  // Plug only: how aligned a shot must be before firing, in cells.
  fireAlignCells: 0.5,
  fireCooldownMs: 260,

  // Hard stop so a wedged bot can't hang a harness run forever.
  maxRunMs: 180_000
};

export default class BotDriver {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.cfg = { ...DEFAULTS, ...opts };
    this._nextPlanAt = 0;
    this._nextFireAt = 0;
    this._startedAt = performance.now();
    this._path = null;
    this._pathIdx = 0;
  }

  /* ---------------- target selection ---------------- */

  /**
   * What the bot is heading for right now.
   *
   * Note the stash choice: it goes for whichever duffel is NEAREST, never for
   * whichever is real. A player can't tell them apart either — the two are
   * drawn identically until pickup. Letting the bot cheat here would erase
   * the bunk-guess cost from the data, which is one of the numbers we most
   * want out of this.
   */
  currentGoal() {
    const s = this.scene;

    if (s.role === 'plug') {
      const t = s.attacker;
      return (t && t.active) ? { x: t.x, y: t.y } : null;
    }

    if (s.hasStash) {
      return s.extract ? { x: s.extract.x, y: s.extract.y } : null;
    }

    const live = [s.stash, s.bunkStash].filter(
      (d) => d && d.active !== false && d.visible !== false
    );
    if (!live.length) return null;

    const me = s.attacker;
    if (!me) return null;
    let best = live[0];
    let bestD = Infinity;
    for (const d of live) {
      const dist = Math.hypot(d.x - me.x, d.y - me.y);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    return { x: best.x, y: best.y };
  }

  /* ---------------- steering ---------------- */

  plan(me, goal) {
    const s = this.scene;

    // Deliberate mistake: a legal but unhelpful step. Uses a real neighbour
    // so the bot never walks into a wall — it takes a wrong turn, it doesn't
    // malfunction.
    if (Math.random() < this.cfg.wrongTurnChance) {
      const cell = s.toCell(me.x, me.y);
      const ns = s.neighbors4?.(cell) || [];
      if (ns.length) {
        const n = ns[(Math.random() * ns.length) | 0];
        return { x: s.toWorldX(n.x) - me.x, y: s.toWorldY(n.y) - me.y };
      }
    }

    const path = s.findPath?.(me.x, me.y, goal.x, goal.y);
    if (path && path.length) {
      // Aim at the second waypoint when there is one: the first is often the
      // cell already occupied, and steering at it produces a visible stutter.
      const wp = path[Math.min(1, path.length - 1)];
      return { x: wp.x - me.x, y: wp.y - me.y };
    }

    // No path (blocked, or goal inside geometry) — fall back to straight-line
    // steering so the bot keeps pressing rather than freezing.
    return { x: goal.x - me.x, y: goal.y - me.y };
  }

  /* ---------------- main tick ---------------- */

  update() {
    const s = this.scene;
    if (!s.intent) return;
    if (s.roundOver || s.roundPausedForMenu) return;

    const me = (s.role === 'plug') ? s.defender : s.attacker;
    if (!me || !me.active || !me.visible) return;

    const now = performance.now();

    if (now - this._startedAt > this.cfg.maxRunMs) {
      console.warn('[BOT] maxRunMs exceeded — abandoning run');
      s.finalizeRun?.('bot_timeout');
      s.roundOver = true;
      return;
    }

    if (now < this._nextPlanAt) {
      this._maybeFire(me, now);
      return;
    }
    this._nextPlanAt = now + this.cfg.replanMs;

    if (Math.random() < this.cfg.hesitateChance) return;

    const goal = this.currentGoal();
    if (!goal) return;

    const dir = this.plan(me, goal);
    s.intent.driveMove(dir.x, dir.y);

    this._maybeFire(me, now);
  }

  _maybeFire(me, now) {
    const s = this.scene;
    if (s.role !== 'plug') return;
    const t = s.attacker;
    if (!t || !t.active) return;
    if (now < this._nextFireAt) return;

    const dx = t.x - me.x;
    const dy = t.y - me.y;
    const tol = s.cell * this.cfg.fireAlignCells;

    // Only shoot down a lane. Spraying at arbitrary angles burns the clip on
    // walls and makes accuracy numbers meaningless.
    if (Math.abs(dx) < tol || Math.abs(dy) < tol) {
      s.intent.driveGun(dx, dy);
      s.intent.driveFire();
      this._nextFireAt = now + this.cfg.fireCooldownMs;
    }
  }
}

/* ---------------- configuration ---------------- */

/**
 * Read bot config from the URL or a global. Returns null when the bot is off,
 * which is the only path normal players ever take.
 */
export function botConfig() {
  try {
    if (typeof window === 'undefined') return null;
    if (window.__plugRunBot) return window.__plugRunBot;
    const p = new URLSearchParams(window.location.search);
    if (p.get('bot') !== '1') return null;

    const cfg = {};
    // Every knob is URL-overridable so a harness can sweep skill levels
    // without a rebuild: ?bot=1&wrongTurnChance=0.3&replanMs=250
    for (const k of Object.keys(DEFAULTS)) {
      const v = p.get(k);
      if (v !== null && v !== '' && !Number.isNaN(Number(v))) cfg[k] = Number(v);
    }
    return cfg;
  } catch {
    return null;
  }
}
