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

// NO PHASER IMPORTS ON PURPOSE. Keeping this file clear of the Phaser
// dependency graph means the decision logic can be exercised under plain Node
// against a stub scene — which matters here, because browser binaries can't be
// downloaded in every environment this runs in. The prototype wrap that needs
// BaseGameScene lives in installBotDriver.js.

import { planDodge } from '../logic/evasion.js';
import { coverAwareStep, isExposedAt, phaseEscapeDir, exposedCells } from '../logic/cover.js';
import { orderCandidates, postureTactics, pathDistances, distTo, plannedRoute } from '../logic/jevStrategy.js';
import { phaseShortcut, phaseIntercept, phaseReachCells, phaseCanCross, dashPlan } from '../logic/phasePlan.js';

export const DEFAULTS = {
  // How often the bot re-decides, in ms. Human reaction floor is ~200ms and
  // deliberate route choices are slower still; re-planning every frame yields
  // inhumanly tight cornering.
  replanMs: 180,

  // Chance per replan of taking a deliberately wrong step. The single most
  // important knob for making the time distribution look human.
  wrongTurnChance: 0.08,

  // Chance per replan of simply not acting — the pause at a junction.
  hesitateChance: 0.04,

  // Runner evasion. A bot with no dodge walks straight down the plug's firing
  // lane and dies on repeat, which yields a dataset of nothing but deaths —
  // useless for the completion-time question this exists to answer. Humans
  // instinctively refuse to stand in a lane with a gun at the end of it.
  dangerCells: 7,      // how close the plug must be for its lane to matter
  laneToleranceCells: 0.6,  // how aligned counts as "in the lane"

  // Plug only: how aligned a shot must be before firing, in cells.
  fireAlignCells: 0.5,
  fireCooldownMs: 260,

  // Borrow the game's own tuned runner AI instead of the naive pathfinder
  // below, at this round's skill level. 0 falls back to the built-in logic.
  // The shipped AI already handles corridor commitment, stuck recovery and
  // power usage — all things the naive version does badly or not at all.
  aiLevel: 20,

  // How long a result modal stays up before the bot presses on. Long enough
  // to read while watching, short enough to not dominate an unattended run.
  modalDelayMs: 900,

  // Hard stop so a wedged bot can't hang a harness run forever. Measured
  // PER ROUND, not per session — see _onNewRound().
  maxRunMs: 180_000,

  // Consecutive losses on the same round before the bot takes the
  // "Continue & Swap Spawns" option instead of retrying the same spawn. Some
  // seeds put the runner in the plug's line of sight on frame one, and no
  // amount of skill beats that — a human reaches for the swap, so does this.
  swapAfterFails: 2,

  // COVER-AWARE ROUTING. The borrowed AI routes by path length alone, so a
  // corridor three cells shorter but fully in a plug's firing line wins every
  // time and the runner strolls down it. Across 227 runs the runs that cleared
  // spent a median 0.03 of their life in a clear lane; the runs that died
  // spent 0.23.
  //
  // coverPenalty is how many extra cells of walking to accept to stay behind
  // cover. 0 disables the whole thing and reproduces the old behaviour exactly,
  // which makes it a clean A/B.
  coverPenalty: 5,
  // Carrying the stash you are slower (carrySlow) and you have something to
  // lose, so cover is worth more. This multiplies coverPenalty after pickup —
  // the "grab it and dip" instinct, priced.
  coverCarryMul: 1.8,

  // Spend phase to break out of a firing lane when a plug is closing and there
  // is cover on the other side of a wall. The shipped AI only phases to shorten
  // a route or to escape at 2-6 cells; neither says "I am pinned in the open".
  phaseEscapeCells: 9,
  // Opening Decoy: fire a held Decoy shortly after a house becomes playable,
  // instead of waiting for a defender to close. Off by default — a recording
  // made with it on is a different driver behaviour, not a tuning tweak.
  openingDecoy: false,
  openingDecoyDelayMs: 900,
  // How many cells of wall the 600ms window can actually clear. At 7 cells/sec
  // (5.95 carrying) the ceiling is about four; three leaves margin. Phasing
  // into anything thicker strands the runner inside the geometry with the
  // power spent — which is exactly what it did before this was checked.
  phaseMaxWall: 3,

  // Evasion commitment. Dodging is re-decided on a timer, not every frame:
  // with two plugs, leaving one's lane walks into the other's, and a
  // per-frame decision oscillates until the round clock kills it. maxMs is
  // the giving-up point — a dodge still running then is not working, so rest
  // and let the pathfinder make progress instead of vibrating in place.
  dodgeCommitMs: 220,
  dodgeMaxMs: 1200,
  dodgeRestMs: 600,

  // Pin the round number and sample a fresh MAP each time instead of climbing
  // the ladder. 0 = off.
  //
  // The first batch off this harness was 61 runs in which round 16 alone
  // accounted for 29 — the bot hit one wall map and beat its head against it
  // until the session ended. Half the dataset described a single seed. That
  // says a great deal about that seed and almost nothing about round 16, and
  // "how long does a map at difficulty N take" is the question map sizing
  // actually needs answered.
  //
  // Locking the round holds difficulty still (every scaling curve reads
  // pveRound) and walks the seed instead, so the spread you measure is the
  // spread across MAPS at one difficulty — which is the spread a fixed
  // 8-map block will draw from.
  lockRound: 0,

  // Sweep a RANGE of rounds in one session instead of pinning one. The bot
  // dies around round 8-11, so a ladder run never reaches the high rounds at
  // all; covering 1-120 means locking each round in turn. Doing that by hand
  // costs a page reload per round, and a reload wipes the telemetry.
  //   ?bot=1&aiLevel=20&sweepFrom=1&sweepTo=120&mapsPerRound=5
  // 0 = off. sweepFrom overrides lockRound when set.
  sweepFrom: 0,
  sweepTo: 0,
  mapsPerRound: 5,

  // Attempts on each map before moving to the next, when lockRound is on.
  //   1  — one shot per map: first-try clear rate, and the time distribution
  //        of a single-attempt race format.
  //   n  — up to n shots: how many tries a map really costs, sampled across
  //        maps rather than down one.
  // A clear always advances to the next map; there is nothing left to learn
  // from a map you just beat.
  seedRepeats: 1,

  // Start a round straight from the menu instead of waiting for a tap, so an
  // unattended batch needs no human at all. 0 = off; see installAutoStart.
  autoStart: 0
};

// Said once per session, not once per frame.
let strategistRefusedLogged = false;

export default class BotDriver {
  /**
   * @param scene    the live BaseGameScene
   * @param opts     DEFAULTS overrides
   * @param aiHooks  optional { applyRunnerProgression, updateRunnerBehavior,
   *                 considerRunnerPowerUse, makeController } — injected by
   *                 installBotDriver rather than imported, so this file stays
   *                 free of the Phaser dependency graph and testable in Node.
   */
  constructor(scene, opts = {}, aiHooks = null) {
    // `strategist` is an object, not a knob — keep it out of cfg so nothing
    // can set one from a query string.
    const { strategist = null, ...cfg } = opts;
    this.scene = scene;
    this.cfg = { ...DEFAULTS, ...cfg };
    this.aiHooks = aiHooks;
    // The Jev strategist (JevStrategist), or null. It only ever supplies an
    // objective, a posture and power decisions to the capable runner AI —
    // see driveBorrowedAI — and it needs that AI: with aiLevel 0 there is no
    // motor to direct, so it is refused rather than driving anything itself.
    this.strategist = strategist;
    this._plan = null;
    this._committedRoute = null;
    this._nextPlanAt = 0;
    this._nextFireAt = 0;
    this._startedAt = performance.now();
    this._path = null;
    this._pathIdx = 0;
    this._borrowed = null;   // lazily-built AIController for the borrowed AI
    this._progressionApplied = false;
    this._dodge = { dir: null, until: 0, since: 0, suppressUntil: 0 };
    this._nextCoverAt = 0;
    this._coverDir = null;
    this._nextPhaseAt = 0;
    this._phaseDrive = null;
    this._lastTick = 0;
  }

  /**
   * Reset per-round state.
   *
   * Phaser's scene.restart() reuses the SAME Scene instance, so the bot is
   * never reconstructed between rounds and anything scoped to a run has to be
   * cleared explicitly. Missing this made maxRunMs a session budget rather
   * than a per-round one: after ~3 minutes of cumulative play every new round
   * tripped the runaway guard on its first frame and killed itself, which
   * looked exactly like "the loop dies after round 5".
   *
   * The borrowed controller goes too — it caches references to attacker and
   * defender sprites that create() has just replaced with new objects.
   */
  _onNewRound() {
    this._recoveryRoute = null;
    this._phaseApproach = null;
    this._phasePlanAt = 0;
    this._phaseGoal = null;
    this._startedAt = performance.now();
    // The strategist notices the new house itself (houseKey in _jevView) and
    // discards the last one's plan; only this object's copy goes here.
    this._plan = null;
    this._roundSeq = (this._roundSeq || 0) + 1;
    this._committedRoute = null;
    this._progressionApplied = false;
    this._borrowed = null;
    this._lastDir = null;
    this._nextPlanAt = 0;
    this._nextFireAt = 0;
    this._nextPowerCheckAt = 0;
    // Re-armed per house: an opening Decoy is an OPENING, so a retry on the
    // same house gets its own one rather than inheriting the last attempt's.
    this._openingDecoyDone = false;
    // Evasion commitment state — cleared per round so a dodge can't carry
    // across a restart.
    this._dodge = { dir: null, until: 0, since: 0, suppressUntil: 0 };
    this._nextCoverAt = 0;
    this._coverDir = null;
    this._nextPhaseAt = 0;
    this._phaseDrive = null;
  }

  /** Should we be driving with the game's own runner AI? */
  get useBorrowedAI() {
    return !!(this.aiHooks && this.cfg.aiLevel > 0 && this.scene.role === 'runner');
  }

  /** Jev strategist above the runner AI. Both, or it is not the hybrid. */
  get hybrid() {
    return !!this.strategist && this.useBorrowedAI;
  }

  /**
   * Drive using the shipped runner AI, at cfg.aiLevel's skill.
   *
   * THE SPOOFING, AND WHY
   * updateRunnerBehavior/considerRunnerPowerUse/applyRunnerProgression all
   * bail unless scene.role === 'plug' — they exist to drive the AI runner
   * when the *player* is the plug, which is the mirror of our situation. So
   * role is swapped for the duration of the call and restored in a finally.
   * Same for the power arrays: the AI reads aiRunnerPowersSelected, the
   * player's live on runnerPowersSelected, so they're aliased across.
   *
   * THE POSITION RESTORE, AND WHY
   * updateRunnerBehavior computes a velocity and then writes attacker.x/y
   * itself. Letting that stand would move the runner outside the input layer:
   * no intent recorded, traces that don't reproduce the run, and a bot doing
   * things no player could. We keep the velocity, undo the move, and steer
   * through driveMove() like every other input.
   *
   * THE SPEED RESTORE, AND WHY
   * applyRunnerProgression assigns scene.runnerSpeed an absolute value tuned
   * for the AI opponent (~151 at round 20), clobbering the player's real
   * runner speed (7.0 cells/sec). Left alone it would quietly slow the runner
   * and every duration we record would be measuring the wrong game.
   */
  driveBorrowedAI(me, delta, now) {
    const s = this.scene;
    const h = this.aiHooks;

    // A purchased wall crossing cannot be redirected by pathing or dodging.
    if (this._phaseDrive && now < this._phaseDrive.until && s.runnerIsPhasing?.()) {
      const p = this._phaseDrive;
      const target = p.landing && { x: s.toWorldX(p.landing.x), y: s.toWorldY(p.landing.y) };
      if (!target || Math.hypot(target.x - me.x, target.y - me.y) > s.cell * 0.15) {
        this._countDrive('phaseWindow');
        return this._driveOrCoast(me, target ? { x: target.x - me.x, y: target.y - me.y } : p.dir);
      }
    }
    this._phaseDrive = null;

    if (!this._borrowed) this._borrowed = h.makeController(s);

    // THE HYBRID. The strategist decides WHERE, selects a concrete path
    // profile and conditionally authorizes a power; the runner AI below still
    // decides every step between route waypoints and the exact firing frame.
    // Each waypoint reaches the AI through its objectiveProvider seam.
    const hybrid = this.hybrid;
    let armed = null;
    if (hybrid) {
      this._plan = this.strategist.tick(this._jevView(me), {
        // Recovery hands the AI a fresh waypoint; clear its direction
        // commitment so it can actually turn toward it.
        onRecovery: () => {
          this._committedRoute = null;
          this._recoveryRoute = null;
          this._phaseApproach = null;
          this._coverDir = null;
          this._dodge = { dir: null, until: 0, since: 0, suppressUntil: 0 };
          if (this._borrowed) { this._borrowed._aiFlipGuardUntil = 0; this._borrowed._aiPlanAt = 0; }
        }
      });
      // Never null in the hybrid: with no objective at all (a transient,
      // e.g. both bags mid-change) the AI holds where it is rather than
      // falling through to its own objective code, which targets the real bag.
      const cell = this._plan.objective?.cell ?? s.toCell(me.x, me.y);
      this._borrowed.objectiveProvider = () => cell;
      // Recovery must actually control movement, not merely change a target
      // that the dodge/juke layers immediately override. Follow fixed floor
      // centers for this short window, then give normal defenses control back.
      if (this._plan.recovering && this._driveRecovery(me, cell)) return true;
      if (!this._plan.recovering) this._recoveryRoute = null;
      // No random map-wide waypoint in the hybrid. Jev chooses the objective;
      // the motor takes the shortest path and only deviates for a live lane,
      // a wall or the watchdog's short recovery step.
      this._borrowed.allowDetour = false;
      armed = this._plan.armedPower || null;
      const goalKey = `${cell.x},${cell.y}`;
      if (armed === 'phase' && !s.runnerIsPhasing?.()) {
        if (now >= (this._phasePlanAt || 0) || this._phaseGoal !== goalKey) {
          this._phasePlanAt = now + 200;
          this._phaseGoal = goalKey;
          this._phaseApproach = phaseShortcut(this._world(), s.toCell(me.x, me.y), cell, this._phaseReach());
        }
        const crossing = this._phaseApproach;
        if (crossing) {
          this._borrowed.objectiveProvider = () => crossing.takeoff;
          const tx = s.toWorldX(crossing.takeoff.x), ty = s.toWorldY(crossing.takeoff.y);
          const from = s.toCell(me.x, me.y);
          if (from.x === crossing.takeoff.x && from.y === crossing.takeoff.y) {
            if (Math.hypot(tx - me.x, ty - me.y) > s.cell * 0.10)
              return this._driveOrCoast(me, { x: tx - me.x, y: ty - me.y });
            if (this._startPhaseCrossing(me, crossing, now)) {
              this._countDrive('phaseWindow');
              return this._driveOrCoast(me, crossing.dir);
            }
          }
        }
      } else this._phaseApproach = null;
      if (armed === 'dash' && this._tryDash(me, cell)) return true;
    } else if (this._borrowed.objectiveProvider) {
      this._borrowed.objectiveProvider = null;
      this._borrowed.allowDetour = false;
    }

    const saved = {
      role: s.role,
      round: s.pveRound,
      speed: s.runnerSpeed,
      sel: s.aiRunnerPowersSelected,
      used: s.aiRunnerPowersConsumed,
      x: s.attacker.x,
      y: s.attacker.y
    };

    // Snapshot power consumption so newly-spent slots can be recorded after.
    const before = [...(s.runnerPowersConsumed || [])];

    let motorMistakes = null;
    try {
      s.role = 'plug';
      s.pveRound = this.cfg.aiLevel;
      s.aiRunnerPowersSelected = s.runnerPowersSelected;
      s.aiRunnerPowersConsumed = s.runnerPowersConsumed;

      if (!this._progressionApplied) {
        h.applyRunnerProgression(s);
        this._progressionApplied = true;
      }

      if (hybrid && s.aiRunner) {
        motorMistakes = {
          wanderChance: s.aiRunner.wanderChance,
          hesitationChance: s.aiRunner.hesitationChance,
          overcommitChance: s.aiRunner.overcommitChance,
          jukeDist: s.aiRunner.jukeDist
        };
        s.aiRunner.wanderChance = 0;
        s.aiRunner.hesitationChance = 0;
        s.aiRunner.overcommitChance = 0;
        s.aiRunner.jukeDist = 0;
      }

      h.updateRunnerBehavior(s, this._borrowed, delta);

      // Throttled: considerRunnerPowerUse logs several lines per call and
      // enforces a 2s cooldown internally, so per-frame checking buys nothing
      // and buries the [RUN] telemetry under console spam.
      //
      // In the hybrid, spending or saving is Jev's decision and only the
      // armed power is visible to the AI's rules — every other slot is
      // masked out, so "save it" is honoured by construction. Its offensive
      // rules reason about the provided objective, not scene.stash.
      if ((!hybrid || (armed && armed !== 'phase' && armed !== 'dash')) && now >= (this._nextPowerCheckAt || 0)) {
        this._nextPowerCheckAt = now + 250;
        if (hybrid) s.aiRunnerPowersSelected = (s.runnerPowersSelected || []).map((p) => (p === armed ? p : null));
        h.considerRunnerPowerUse(s, this._borrowed, now);
        if (hybrid) s.aiRunnerPowersSelected = s.runnerPowersSelected;
      }
    } catch (e) {
      console.error('[BOT] borrowed AI failed, falling back:', e);
      this.aiHooks = null; // one failure is enough; use the simple bot
    } finally {
      if (motorMistakes && s.aiRunner) Object.assign(s.aiRunner, motorMistakes);
      s.attacker.x = saved.x;
      s.attacker.y = saved.y;
      s.role = saved.role;
      s.pveRound = saved.round;
      s.runnerSpeed = saved.speed;
      s.aiRunnerPowersSelected = saved.sel;
      s.aiRunnerPowersConsumed = saved.used;
    }

    // activateRunnerPowerByIndex skips the intent record when it thinks it's
    // driving the AI — which, mid-spoof, it does. Record what it spent so the
    // trace still reflects every power the runner actually used.
    const after = s.runnerPowersConsumed || [];
    for (let i = 0; i < after.length; i++) {
      if (after[i] && !before[i]) {
        s.intent?.recordPower(i);
        console.log('[BOT] used power slot', i, '->', s.runnerPowersSelected?.[i]);
        if (hybrid) this.strategist.onPowerActivated?.(s.runnerPowersSelected?.[i]);
      }
    }

    // A committed phase window outranks routing and reflexes: it is short, it
    // is already paid for, and spending it drifting toward the objective
    // instead of through the wall wastes it entirely.
    // Phase out of a lane before reaching for footwork: if the run is pinned
    // in the open, the wall is the way out. Throttled — activateRunnerPower
    // is a one-shot, so this only needs to be asked occasionally.
    // In the hybrid only when Jev armed phase, as with considerRunnerPowerUse.
    if ((!hybrid || armed === 'phase') && now >= (this._nextPhaseAt || 0)) {
      this._nextPhaseAt = now + 250;
      if (this._phaseEscape(me) && this._phaseDrive) {
        this._countDrive('phaseWindow');
        return this._driveOrCoast(me, this._phaseDrive.dir);
      }
    }

    // Evasion overrides the AI's chosen direction when it has walked us into
    // a firing lane. Layered on top rather than merged in, because the AI
    // cannot see defender2 at all (see firingLaneRisk) — from round 8 this
    // override is the only thing dodging the second plug.
    //
    // Committed, not per-frame: see planDodge. Two plugs make the naive
    // version oscillate until the round timer ends the run.
    const risk = this.firingLaneRisk(me);
    const candidate = risk
      ? this.dodge(me, risk, this.currentGoal() || { x: me.x, y: me.y })
      : null;
    const plan = planDodge(this._dodge, now, risk, candidate, {
      commitMs: this.cfg.dodgeCommitMs ?? DEFAULTS.dodgeCommitMs,
      maxMs: this.cfg.dodgeMaxMs ?? DEFAULTS.dodgeMaxMs,
      restMs: this.cfg.dodgeRestMs ?? DEFAULTS.dodgeRestMs,
      clearGraceMs: hybrid ? 600 : 0
    });
    this._dodge = plan.state;
    // Read by the watchdog: dodging still has to produce real progress.
    this._evading = !!plan.dir;
    if (plan.dir) { this._countDrive('dodge'); return this._driveOrCoast(me, plan.dir); }

    // Approach a planned crossing deliberately. The borrowed motor's long
    // direction commitment must not carry us past this short takeoff route.
    if (hybrid && this._phaseApproach) {
      const next = s.findNextStepTowards?.(s.toCell(me.x,me.y),this._phaseApproach.takeoff);
      if (next) {
        this._countDrive('motor');
        return this._driveOrCoast(me,{x:s.toWorldX(next.x)-me.x,y:s.toWorldY(next.y)-me.y});
      }
    }

    if (hybrid) {
      const goal = this.currentGoal();
      if (goal) {
        const dir = this._committedRouteDir(me, s.toCell(goal.x, goal.y), now);
        if (dir) { this._countDrive('committedRoute'); return this._driveOrCoast(me, dir); }
      }
    }

    // Routing: prefer a covered approach over a short exposed one. This runs
    // on the replan tick rather than every frame — it is a route decision, not
    // a reflex, and the dodge above is the reflex layer.
    const routed = this._coverStep(me, now);
    if (routed) { this._countDrive('cover'); return this._driveOrCoast(me, routed); }

    const vx = this._borrowed._aiVX || 0;
    const vy = this._borrowed._aiVY || 0;
    this._countDrive('motor');
    return this._driveOrCoast(me, { x: vx, y: vy });
  }

  /**
   * Which layer produced this frame's steer. Session-level (kept on the
   * strategist, which outlives this object) and hybrid-only. There is no
   * 'jev' bucket because there is no code path by which Jev steers.
   */
  _countDrive(layer) {
    if (!this.hybrid) return;
    const d = (this.strategist.driveSources ||= { motor: 0, dodge: 0, cover: 0, phaseWindow: 0 });
    d[layer] = (d[layer] || 0) + 1;
  }

  /** The dodge range and cover weight in force: the preset's, shaded by posture. */
  _tactics() {
    const base = { dangerCells: this.cfg.dangerCells, coverPenalty: this.cfg.coverPenalty ?? DEFAULTS.coverPenalty };
    return this.hybrid && this._plan ? postureTactics(this._plan.posture, base) : base;
  }

  /**
   * What the strategist is allowed to know, as bare cells.
   *
   * THIS IS WHERE BAG IDENTITY IS DROPPED. scene.stash is the real bag and
   * scene.bunkStash the decoy; both become anonymous cells here, before
   * anything strategic sees them, and orderCandidates labels them by position
   * alone. A bag mid-fade (a bunk just picked up — the player sees it vanish)
   * is not a candidate.
   */
  _jevView(me) {
    const s = this.scene;
    const cellOf = (o) => (o && Number.isFinite(o.x) && Number.isFinite(o.y)) ? s.toCell(o.x, o.y) : null;
    const liveBag = (d) => d && d.active !== false && d.visible !== false && !d._fading;
    const bags = s.hasStash ? [] : [s.stash, s.bunkStash].filter(liveBag).map((d) => {
      const c = cellOf(d);
      return c ? { ...c, pocket: Number.isInteger(d._rivalPocket) ? d._rivalPocket : null } : null;
    }).filter(Boolean);
    const world = this._world();
    const race = s.rivalRace || s.rivals?.race;
    const house = race ? Math.min(7, (race.clearTimes?.length ?? 0) + 1) : 1;
    const retries = race ? (race.retries ?? 0) : (this._roundSeq || 0);
    return {
      cols: s.cols, rows: s.rows, isWalkable: world.isWalkable,
      runner: cellOf(me),
      house, houseKey: (race?.stashSeed ?? 'legacy') + ':' + house + ':' + retries,
      matchKey: race?.stashSeed ?? null,
      live: !s.roundOver && !s.roundPausedForMenu && (!race || race.status === 'racing'),
      isRunner: s.role === 'runner',
      hp: me?.hp ?? null,
      carrying: !!s.hasStash,
      phasing: !!s.runnerIsPhasing?.(),
      phaseReach: this._phaseReach(),
      phaseEscapeCells: this.cfg.phaseEscapeCells ?? DEFAULTS.phaseEscapeCells,
      phaseMaxWall: this.cfg.phaseMaxWall ?? DEFAULTS.phaseMaxWall,
      dashTiles: s.runnerPowerStats?.dash?.tiles ?? 3,
      decoyActive: !!(s.decoySprite && s.decoySprite.active !== false),
      candidates: orderCandidates(bags),
      revealedPocket: s.hasStash || (s.stash && (s.bunkStash?._fading || !s.bunkStash))
        ? (Number.isInteger(s.rivalRealPocket) ? s.rivalRealPocket : null) : null,
      extract: cellOf(s.extract),
      plugs: world.threats,
      inLane: !!this.firingLaneRisk(me),
      evading: !!this._evading,
      // The motor's own detour waypoint, when it is walking one: the
      // watchdog measures progress toward what the motor is actually doing.
      motorWaypoint: this._phaseApproach?.takeoff ?? ((!s.hasStash && this._borrowed?.allowDetour && s._aiDetourCell) ? { x: s._aiDetourCell.x, y: s._aiDetourCell.y } : null),
      exposedAt: (c) => isExposedAt(world, c),
      powers: { selected: [...(s.runnerPowersSelected || [])], consumed: [...(s.runnerPowersConsumed || [])] }
    };
  }

  /* ---------------- cover-aware routing ---------------- */

  /** Live plugs, as cells. Both of them — defender2 exists from round 8. */
  _threatCells() {
    const s = this.scene;
    return [s.defender, s.defender2]
      .filter((p) => p && p.active && p.visible)
      .map((p) => s.toCell(p.x, p.y));
  }

  _world() {
    const s = this.scene;
    return {
      cols: s.cols,
      rows: s.rows,
      isWalkable: (x, y) => !!s.isWalkableCell?.(x, y),
      threats: this._threatCells()
    };
  }

  /**
   * A step toward the objective that weighs exposure, or null to leave the
   * borrowed AI's choice alone.
   *
   * Only overrides while actually standing in a firing lane. Away from one the
   * shipped AI's routing is well tuned and has corridor commitment and stuck
   * recovery this does not; replacing it wholesale would trade a known-good
   * router for a freshly written one.
   */
  _coverStep(me, now) {
    const penalty = this._tactics().coverPenalty;
    if (!(penalty > 0)) return null;

    const s = this.scene;
    const goal = this.currentGoal();
    if (!goal || typeof s.isWalkableCell !== 'function') return null;

    if (now < (this._nextCoverAt || 0)) return this._coverDir || null;
    this._nextCoverAt = now + (this.cfg.replanMs ?? DEFAULTS.replanMs);

    const world = this._world();
    if (!world.threats.length) { this._coverDir = null; return null; }

    const from = s.toCell(me.x, me.y);
    if (!isExposedAt(world, from)) { this._coverDir = null; return null; }

    const step = coverAwareStep({
      ...world,
      from,
      goal: s.toCell(goal.x, goal.y),
      penalty: s.hasStash
        ? penalty * (this.cfg.coverCarryMul ?? DEFAULTS.coverCarryMul)
        : penalty
    });
    if (!step) { this._coverDir = null; return null; }

    this._coverDir = { x: step.x - from.x, y: step.y - from.y };
    return this._coverDir;
  }

  /**
   * Phase out of a firing lane.
   *
   * The shipped AI phases to shorten a route or to escape a plug at 2-6 cells.
   * Neither of those is "I am pinned in the open with a gun lined up on me",
   * which is the situation that actually kills runs. Burning the power to end
   * up behind a wall is worth more than saving it for a shortcut.
   */
  _phaseReach() {
    const s = this.scene;
    return phaseReachCells(s.runnerSpeed * (s.hasStash ? (s.carrySlow ?? 1) : 1), s.cell, s.runnerPowerStats?.phase?.duration ?? 600);
  }

  _driveRecovery(me, goal) {
    const s = this.scene, from = s.toCell(me.x, me.y), key = `${goal.x},${goal.y}`;
    if (!this._recoveryRoute || this._recoveryRoute.key !== key) {
      const distance = pathDistances(this._world(), goal);
      let c = from, d = distTo(distance, from);
      const cells = [{ ...from }];
      while (d != null && d > 0) {
        const next = [{ x:c.x+1,y:c.y },{ x:c.x-1,y:c.y },{ x:c.x,y:c.y+1 },{ x:c.x,y:c.y-1 }]
          .find(n => distTo(distance, n) === d-1);
        if (!next) break;
        cells.push(next); c=next; d--;
      }
      if (d !== 0) return false;
      this._recoveryRoute = { key, cells, index: 0 };
    }
    const route = this._recoveryRoute;
    let point = route.cells[route.index];
    while (point && Math.hypot(s.toWorldX(point.x)-me.x,s.toWorldY(point.y)-me.y) <= s.cell*0.15) {
      point = route.cells[++route.index];
    }
    this._evading = false;
    if (!point) {
      this.strategist.onRecoveryReached?.();
      this._recoveryRoute = null;
      return false;
    }
    this._countDrive('recoveryRoute');
    return this._driveOrCoast(me,{x:s.toWorldX(point.x)-me.x,y:s.toWorldY(point.y)-me.y});
  }

  // Keep each turn's center until reached. Recomputing a cardinal direction
  // after crossing a cell boundary can reverse before reaching its center.
  _committedRouteDir(me, goal, now) {
    const s = this.scene, from = s.toCell(me.x, me.y), key = `${goal.x},${goal.y}`;
    const same = (a,b) => a && b && a.x===b.x && a.y===b.y;
    let r = this._committedRoute;
    const next = r?.cells[r.index], previous = r?.cells[r.index-1];
    const offRoute = r && !same(from,next) && !same(from,previous);
    const world = this._world();
    const blockedByPlug = next && world.threats.some(p=>same(p,next));
    if (!r || r.key!==key || offRoute || (next && !world.isWalkable(next.x,next.y)) ||
        (blockedByPlug && now-r.plannedAt>1000)) {
      const exposed = exposedCells(world);
      const cells = plannedRoute({...world,exposedAt:c=>exposed.has(`${c.x},${c.y}`)},from,goal,
        this._plan?.posture==='aggressive'?'direct':'covered', world.threats.map(p=>pathDistances(world,p)));
      if (!cells.length) { this._committedRoute=null; return null; }
      r = this._committedRoute = {key,cells,index:0,plannedAt:now};
    }
    let point=r.cells[r.index];
    while(point && Math.hypot(s.toWorldX(point.x)-me.x,s.toWorldY(point.y)-me.y)<=s.cell*.15)
      point=r.cells[++r.index];
    if(!point) return {x:0,y:0};
    return {x:s.toWorldX(point.x)-me.x,y:s.toWorldY(point.y)-me.y};
  }

  _tryDash(me, goal) {
    const s=this.scene;
    const slot=(s.runnerPowersSelected||[]).findIndex((p,i)=>p==='dash'&&!s.runnerPowersConsumed?.[i]);
    if (slot<0 || s.runnerIsPhasing?.()) return false;
    const plan=dashPlan(this._world(),s.toCell(me.x,me.y),goal,s.runnerPowerStats?.dash?.tiles??3);
    if (!plan) return false;
    // Use the human input path to face the selected corridor before activation.
    if (!s.intent.driveMove(plan.dir.x,plan.dir.y)) return false;
    const facing=s._runnerInputDir || s.playerController?._runnerInputDir;
    if (!facing || Math.sign(facing.x)!==plan.dir.x || Math.sign(facing.y)!==plan.dir.y) return false;
    s.activateRunnerPowerByIndex?.(slot);
    if (!s.runnerPowersConsumed?.[slot]) return false;
    this.strategist.onPowerActivated?.('dash');
    this._lastDir=plan.dir;
    return true;
  }

  _startPhaseCrossing(me, crossing, now) {
    const s = this.scene;
    if (s.runnerIsPhasing?.()) return false;
    const used = s.runnerPowersConsumed || [];
    const slot = (s.runnerPowersSelected || []).findIndex((p, i) => p === 'phase' && !used[i]);
    const landing = { x: s.toWorldX(crossing.landing.x), y: s.toWorldY(crossing.landing.y) };
    const ms = s.runnerPowerStats?.phase?.duration ?? 600;
    const speed = s.runnerSpeed * (s.hasStash ? (s.carrySlow ?? 1) : 1);
    if (slot < 0 || !phaseCanCross(me, landing, speed, s.cell, ms)) return false;
    s.activateRunnerPowerByIndex?.(slot);
    if (!s.runnerPowersConsumed?.[slot] || !s.runnerIsPhasing?.()) return false;
    if (this.hybrid) this.strategist.onPowerActivated?.('phase');
    this._phaseDrive = { dir: crossing.dir, landing: crossing.landing, until: now + ms };
    this._phaseApproach = null;
    return true;
  }

  _phaseEscape(me) {
    const s = this.scene;
    if (s.role !== 'runner' || s.runnerIsPhasing?.()) return false;

    const sel = s.runnerPowersSelected || [];
    const used = s.runnerPowersConsumed || [];
    const slot = sel.findIndex((p, i) => p === 'phase' && !used[i]);
    if (slot < 0) return false;

    const world = this._world();
    if (!world.threats.length) return false;

    const from = s.toCell(me.x, me.y);
    if (!isExposedAt(world, from)) return false;

    // Only when something is close enough for the lane to be a real threat.
    const range = s.cell * (this.cfg.phaseEscapeCells ?? DEFAULTS.phaseEscapeCells);
    const closing = [s.defender, s.defender2].some(
      (p) => p && p.active && p.visible && Math.hypot(p.x - me.x, p.y - me.y) <= range
    );
    if (!closing) return false;

    // There must be a wall thin enough to cross AND floor worth landing on
    // beyond it. Checking only "is a wall next to me" is what stranded the
    // runner inside thick geometry with the power already spent.
    const goal = this.currentGoal();
    const exit = this.hybrid ? phaseIntercept(world, from, goal ? s.toCell(goal.x, goal.y) : null,
      this._phaseReach(), this.cfg.phaseEscapeCells ?? DEFAULTS.phaseEscapeCells,
      this.cfg.phaseMaxWall ?? DEFAULTS.phaseMaxWall) : phaseEscapeDir({
      ...world,
      from,
      goal: goal ? s.toCell(goal.x, goal.y) : null,
      maxWall: this.cfg.phaseMaxWall ?? DEFAULTS.phaseMaxWall
    });
    if (!exit) return false;

    if (this.hybrid) {
      const aligned = exit.dir.x ? Math.abs(me.y - s.toWorldY(from.y)) : Math.abs(me.x - s.toWorldX(from.x));
      if (aligned > s.cell * 0.10) return false;
      return this._startPhaseCrossing(me, exit, this._now || 0);
    }

    console.log('[BOT] phasing out of a lane through', exit.dir, '-> landing', exit.landing);
    s.activateRunnerPowerByIndex?.(slot);
    // This spend happens outside the borrowed-AI spoof, so the after-loop in
    // driveBorrowedAI never sees it: tell the strategist here, or its
    // activation count comes up one short of the trace (and the armed phase
    // is later counted as expired unused).
    if (this.hybrid && used[slot]) this.strategist.onPowerActivated?.('phase');

    // Commit the window to the direction we picked. Without this the borrowed
    // AI's phase steering aims at the distant objective instead, which is
    // rarely the way through the wall we just paid for.
    const ms = s.runnerPowerStats?.phase?.duration ?? 600;
    this._phaseDrive = { dir: exit.dir, until: (this._now || 0) + ms };
    return true;
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

    // In the hybrid the goal is the strategist's objective, so dodges and
    // cover steps break ties toward the place Jev chose.
    const planned = this.hybrid ? (this._phaseApproach?.takeoff ?? this._plan?.objective?.cell) : null;
    if (planned) return { x: s.toWorldX(planned.x), y: s.toWorldY(planned.y) };

    if (s.role === 'plug') {
      const t = s.attacker;
      return (t && t.active) ? { x: t.x, y: t.y } : null;
    }

    if (s.hasStash) {
      return s.extract ? { x: s.extract.x, y: s.extract.y } : null;
    }

    const me = s.attacker;
    if (!me) return null;

    const live = [s.stash, s.bunkStash].filter((d) => {
      if (!d || d.active === false || d.visible === false) return false;

      // Skip a duffel that's mid-pickup. On bunk pickup BaseGameScene sets
      // _fading and runs a ~680ms fade before nulling the reference, so for
      // that whole window the bot is standing ON a target it still thinks it
      // needs to reach. Goal distance goes to ~0, the steering vector goes to
      // zero, driveMove() rejects it, and the bot just stops dead. Reads as
      // hesitation; it's a stall.
      if (d._fading) return false;

      // Same guard for the real stash, and for any case where we're already
      // on top of a target: there is nothing left to steer toward.
      if (Math.hypot(d.x - me.x, d.y - me.y) < s.cell * 0.5) return false;

      return true;
    });
    if (!live.length) return null;

    let best = live[0];
    let bestD = Infinity;
    for (const d of live) {
      const dist = Math.hypot(d.x - me.x, d.y - me.y);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    return { x: best.x, y: best.y };
  }

  /**
   * Is the plug lined up to shoot us right now?
   *
   * The plug fires down rows and columns (see its aim logic — it only shoots
   * when roughly axis-aligned), so "danger" is specifically: sharing a lane,
   * close enough to matter. Returns the axis we're exposed on, or null.
   */
  firingLaneRisk(me) {
    const s = this.scene;
    if (s.role !== 'runner') return null;

    // BOTH plugs. From round 8 the game spawns defender2, and the shipped
    // runner AI contains no reference to it at all — reasonably, since that
    // AI drives the runner when the PLAYER is the plug, and in that mode the
    // dual spawn produces a second runner, never a second plug. So from round
    // 8 onward the borrowed AI is blind to half the threats on screen, and
    // this override is the only thing watching the other one.
    const plugs = [s.defender, s.defender2].filter((p) => p && p.active && p.visible);
    if (!plugs.length) return null;

    const tol = s.cell * this.cfg.laneToleranceCells;
    const range = s.cell * this._tactics().dangerCells;

    // Nearest threat wins — it shoots first and its lane is the urgent one.
    let best = null;
    let bestDist = Infinity;
    for (const plug of plugs) {
      const dx = plug.x - me.x;
      const dy = plug.y - me.y;
      const dist = Math.hypot(dx, dy);
      if (dist > range || dist >= bestDist) continue;

      const axis = (Math.abs(dy) < tol) ? 'row' : (Math.abs(dx) < tol) ? 'col' : null;
      if (!axis) continue;
      // A plug aligned behind a wall is not an immediate shooting lane.
      if (this.hybrid) {
        const a=s.toCell(me.x,me.y), b=s.toCell(plug.x,plug.y);
        let blocked=false;
        const dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y);
        const steps=axis==='row'?Math.abs(b.x-a.x):Math.abs(b.y-a.y);
        for(let i=1;i<steps;i++) if(!s.isWalkableCell(axis==='row'?a.x+dx*i:a.x,axis==='col'?a.y+dy*i:a.y)){blocked=true;break;}
        if(blocked) continue;
      }
      best = axis;
      bestDist = dist;
    }
    return best;
  }

  /**
   * Step out of the firing lane. Prefers whichever perpendicular direction
   * also makes progress toward the goal, so dodging doesn't throw away the
   * run — that's the difference between evading and just flailing.
   */
  dodge(me, axis, goal) {
    const s = this.scene;
    const cell = s.toCell(me.x, me.y);

    // Exposed along a row means bullets travel horizontally, so we move
    // vertically to leave it, and vice versa.
    const options = (axis === 'row')
      ? [{ x: 0, y: 1 }, { x: 0, y: -1 }]
      : [{ x: 1, y: 0 }, { x: -1, y: 0 }];

    const legal = options.filter((d) => s.isWalkableCell?.(cell.x + d.x, cell.y + d.y));
    if (!legal.length) return null;

    if (this.hybrid) {
      const distances=pathDistances(this._world(),s.toCell(goal.x,goal.y));
      legal.sort((a,b)=>(distTo(distances,{x:cell.x+a.x,y:cell.y+a.y})??Infinity)-
        (distTo(distances,{x:cell.x+b.x,y:cell.y+b.y})??Infinity));
      return legal[0];
    }

    // Break the tie toward the goal rather than at random.
    legal.sort((a, b) => {
      const da = Math.hypot(goal.x - (me.x + a.x * s.cell), goal.y - (me.y + a.y * s.cell));
      const db = Math.hypot(goal.x - (me.x + b.x * s.cell), goal.y - (me.y + b.y * s.cell));
      return da - db;
    });
    return legal[0];
  }

  /* ---------------- steering ---------------- */

  /**
   * The Jev strategist's measurements. Null when none is attached. The
   * numbers are the strategist's own, so they cover the whole session rather
   * than the scene this object happens to belong to.
   */
  jevReport() {
    if (!this.strategist) return null;
    const r = this.strategist.report();
    return { ...r, driveSources: { ...(this.strategist.driveSources || {}) } };
  }

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

/**
   * Fire a held Decoy at the start of a house, if this driver opts in.
   *
   * WHY IT IS NOT THE SHIPPED BEHAVIOUR
   * RunnerAI.considerRunnerPowerUse only reaches for Decoy REACTIVELY: when a
   * defender is already within 18 cells and no decoy exists. That is a sound
   * panic button and a poor opening. This fires once per house, early, to pull
   * the defender off its patrol before the runner commits to a route.
   *
   * HOW IT ACTIVATES
   * Through scene.activateRunnerPowerByIndex — the same call a player's tap
   * reaches, and the same one RunnerAI uses. It does NOT touch the loadout
   * picker, and it cannot run before play is live: update() has already
   * returned on roundOver and roundPausedForMenu, and the delay keeps it off
   * the first frames while the house settles.
   *
   * It spends a real power from a real slot, so a race driven with it has one
   * fewer Decoy in hand later. That is the trade being measured, not a bonus.
   */
  _maybeOpeningDecoy(now) {
    if (!this.cfg.openingDecoy || this._openingDecoyDone) return false;
    const s = this.scene;
    if (s.role !== 'runner') return false;
    if (now - this._startedAt < (this.cfg.openingDecoyDelayMs ?? 900)) return false;

    const sel = s.runnerPowersSelected || [];
    const used = s.runnerPowersConsumed || [];
    const slot = sel.findIndex((p, i) => p === 'decoy' && !used[i]);
    // No decoy in hand is not a failure and must not be retried every frame.
    if (slot < 0) { this._openingDecoyDone = true; return false; }
    if (s.decoySprite) return false;

    this._openingDecoyDone = true;
    console.log('[BOT] opening decoy from slot', slot);
    // Snapshot BEFORE activating: `used` is the scene's own array, which
    // activateRunnerPowerByIndex mutates in place, so reading it afterwards
    // reports the post-activation value and the spend never gets traced.
    // driveBorrowedAI copies for the same reason.
    const wasUsed = used[slot] === true;
    s.activateRunnerPowerByIndex?.(slot);
    // Mid-spoof the scene skips its own intent record, exactly as it does for
    // the borrowed AI, so log it here for the trace.
    if (s.runnerPowersConsumed?.[slot] && !wasUsed) s.intent?.recordPower?.(slot);
    return true;
  }

  update(delta = 16.67) {
    const s = this.scene;
    if (!s.intent) return;
    if (s.roundOver || s.roundPausedForMenu) return;

    const me = (s.role === 'plug') ? s.defender : s.attacker;
    if (!me || !me.active || !me.visible) return;

    // beginRoundTimer() zeroes simTick, so a tick that went backwards means
    // a fresh round started under us on the same Scene instance.
    const tick = s.simTick | 0;
    if (tick < this._lastTick) this._onNewRound();
    this._lastTick = tick;

    const now = performance.now();
    this._now = now;

    this._maybeOpeningDecoy(now);

    if (now - this._startedAt > this.cfg.maxRunMs) {
      console.warn('[BOT] maxRunMs exceeded — abandoning run');
      s.finalizeRun?.('bot_timeout');
      s.roundOver = true;
      // Record it as a timeout, then leave by the same door a death leaves
      // by. Setting roundOver alone ends the run but starts nothing: the bot
      // returns early from every subsequent tick and the session sits on a
      // dead board until someone notices. That is survivable when you are
      // watching it; an overnight batch loses everything after the first
      // wedge, which is exactly the batch lockRound exists to collect.
      s.progressionManager?.showPvEGameOver?.();
      return;
    }

    // The shipped AI keeps its own planning cadence (planEvery, keepDirMs)
    // and its own stuck recovery, so it runs every frame and skips the
    // replan timer and imperfection knobs below — those exist to make the
    // naive pathfinder look human, and this one already is tuned.
    if (this.useBorrowedAI) {
      this.driveBorrowedAI(me, delta, now);
      return;
    }

    // A strategist with no capable motor under it is refused, loudly: it has
    // nothing to direct, and it must never fall back to steering itself.
    if (this.strategist && !strategistRefusedLogged) {
      strategistRefusedLogged = true;
      console.error('[JEV] strategist needs the capable runner AI (aiLevel > 0, runner role);' +
        ' not attached — this session is the plain pathfinder, not a Jev run.');
    }

    if (now < this._nextPlanAt) {
      this._maybeFire(me, now);
      return;
    }
    this._nextPlanAt = now + this.cfg.replanMs;

    if (Math.random() < this.cfg.hesitateChance) return;

    const goal = this.currentGoal();
    if (!goal) {
      // No target to steer toward (mid-pickup, or everything collected).
      // Keep the last heading rather than emitting nothing — a bot that
      // freezes here reads as deliberate caution and quietly corrupts the
      // timing data with pauses that no player would take.
      this._driveOrCoast(me, null);
      return;
    }

    // Evasion outranks pathing. Being on the optimal route is worthless from
    // inside a firing lane, and dying resets the whole map.
    const risk = this.firingLaneRisk(me);
    if (risk) {
      const out = this.dodge(me, risk, goal);
      if (out) {
        s.intent.driveMove(out.x, out.y);
        this._lastDir = out;
        this._maybeFire(me, now);
        return;
      }
    }

    this._driveOrCoast(me, this.plan(me, goal));
    this._maybeFire(me, now);
  }

  /**
   * Steer, with a guaranteed fallback.
   *
   * driveMove() rejects zero-length vectors, so any moment the desired
   * direction collapses to ~0 would otherwise leave the bot stationary. Reuse
   * the last good heading, and failing that pick any legal neighbour — the
   * bot should always be doing something, because "stopped" is never a state
   * a racing player would choose and it shows up as inflated round times.
   */
  _driveOrCoast(me, dir) {
    const s = this.scene;

    if (dir && s.intent.driveMove(dir.x, dir.y)) {
      const len = Math.hypot(dir.x, dir.y);
      this._lastDir = { x: dir.x / len, y: dir.y / len };
      return true;
    }

    if (this._lastDir && s.intent.driveMove(this._lastDir.x, this._lastDir.y)) return true;

    const cell = s.toCell(me.x, me.y);
    const ns = s.neighbors4?.(cell) || [];
    if (!ns.length) return false;
    const n = ns[(Math.random() * ns.length) | 0];
    return s.intent.driveMove(s.toWorldX(n.x) - me.x, s.toWorldY(n.y) - me.y);
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
