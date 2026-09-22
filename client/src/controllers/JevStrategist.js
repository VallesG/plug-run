// JevStrategist — Jev as the strategic brain above the game's runner AI.
//
// THE INTERFACE
// Jev is asked, on events only, for a Strategy:
//
//   { objective: 'target_a' | 'target_b' | 'extract' | 'hold',
//     posture:   'safe' | 'balanced' | 'aggressive',
//     powerPlan: a conditional phase/dash/decoy plan or 'none',
//     confidence: number | null }
//
// and tick() hands BotDriver a Plan:
//
//   { objective: { source: 'jev'|'fallback'|'recovery', objective, cell } | null,
//     posture, recovering, mode }
//
// `cell` is a PLACE. BotDriver gives it to the runner AI as its objective
// (RunnerAI objectiveProvider); the runner AI decides every step of getting
// there, and BotDriver's dodge layer still outranks it in a firing lane.
// Nothing here produces, stores or forwards a direction, and nothing here
// can reach InputIntent — there is a test that reads this file for it.
//
// WHEN IT ASKS
// Never on a timer. A request needs a trigger:
//   house_start, retry           a new house or a new attempt at one
//   stash_change                 a bag appeared, vanished or turned out bunk
//   extract_available            the runner picked up the stash
//   target_invalid               the chosen bag is gone or unreachable
//   damage                       the runner lost health
//   watchdog                     recovery ended after a stall (once per stall)
//   expired                      the active strategy outlived strategyTtlMs
// and then, whatever the trigger:
//   - at most one request in flight;
//   - at least minRequestGapMs between dispatches — errors, invalid answers
//     and timeouts do not reset or shorten it, because the gap is measured
//     from dispatch, not from the answer;
//   - triggers arriving during the gap are coalesced into ONE later request;
//   - nothing is asked while the watchdog has recovery control.
//
// WHAT IT REMEMBERS
// Where the runner died in this house, and on which posture. If a bunk visibly
// dissolves, the surviving pocket is remembered through retries of this house
// and cleared when the match advances to the next house. That is information
// a human player learned in the same match, never hidden scene identity.
//
// RECOVERY
// The motor receives the final objective, never a stale chain of waypoints.
// Repeated deaths permit varied local watchdog sidesteps, not random trips
// across the map. Live threat avoidance remains the motor's responsibility.
//
// WHAT IT TRUSTS
// An answer is adopted only if it arrives for the state it was asked about
// (house, stash and carrying unchanged — the "epoch"), names a legal
// objective, and does not flip A/B inside the commitment window. Anything
// else is counted and the plan carries on.
//
// POWERS: JEV DECIDES THE CONDITION, THE MOTOR DECIDES THE FRAME
// A power plan arms a named condition (intercept, escape, final run or plug
// pressure). Until that condition opens the power is hidden from the motor.
// The motor validates a phase crossing's actual travel budget, and a dash's
// actual wall-clipped landing. Both may shorten the approach before pickup.
// Decoy retains the runner AI's reflex rule. Only the armed power can fire;
// 'none' disarms: save them. Combat
// timing stays with the motor, which reacts in frames; the decision to spend
// stays with Jev, which is asked on events a second or more apart. An armed
// power the motor never finds a moment for expires unused after armMs, and
// is counted. Every activation goes through scene.activateRunnerPowerByIndex,
// the slot a player's tap reaches.

import { jevState } from '../logic/jevState.js';
import {
  pathDistances, distTo, resolveObjective, fallbackObjective, stillCandidate, recoveryCell
} from '../logic/jevStrategy.js';
import { createWatchdog, resetWatchdog, watchdogStep, isRecovering } from '../logic/jevWatchdog.js';
import { JEV_INPUT_USD_PER_MTOK } from '../logic/jevAnswer.js';

export const DEFAULTS = Object.freeze({
  // Global floor between paid logical requests, dispatch to dispatch.
  minRequestGapMs: 1500,
  // A strategic answer is not urgent; past this the request is abandoned and
  // any late answer is discarded.
  // Route + power-plan answers contain more context than the original
  // three-choice spike. Real Jev calls can legitimately take several seconds;
  // 2.5s discarded healthy answers and tripped the error ceiling in 11s.
  timeoutMs: 15000,
  // A bag choice stands at least this long before Jev may switch to the
  // other bag, unless the bag is gone or the plan stalled.
  commitMs: 4000,
  // And at most this many switches per attempt, however long it runs.
  maxSwitchesPerAttempt: 2,
  // Ask again after this long on one strategy...
  strategyTtlMs: 9000,
  // ...or this long with none (the last answer was rejected, or failed).
  noStrategyRetryMs: 3000,
  // A hold is a pause, not a plan.
  holdMaxMs: 2000,
  // At most one watchdog-caused request per this long.
  watchdogRequestGapMs: 5000,
  // How long an armed power stays available to the motor's reflexes.
  armMs: 15000,
  // A 2% answer should not override the safe ordering already computed from
  // the board. Below this, take the safest offered objective and route.
  minConfidence: 0.35,
  // A fresh attempt: the runner is still respawning, so no stall is counted.
  attemptGraceMs: 1500,
  // Deaths in one house before the plan turns exploratory (see the header).
  exploreAfterDeaths: 2,
  // Apex remains frame-perfect. The Rival profile overrides these with a
  // small per-attempt human reaction delay before the motor may move.
  openingDelayMinMs: 0,
  openingDelayMaxMs: 0,

  // SAFETY CEILINGS. Past either the strategist stops asking for the rest of
  // the session; the runner AI keeps playing on the fallback objective, so a
  // runaway costs a worse recording rather than a bill. Latched.
  maxRequests: 100,
  maxInputTokens: 500_000,
  // Three consecutive failures (HTTP error, timeout, invalid answer) and it
  // stops too: a request that fails the same way three times will fail the
  // same way a hundred times, and each one may be billed.
  maxConsecutiveErrors: 3
});

// Which trigger names the request when several are coalesced.
const PRIORITY = ['retry', 'house_start', 'extract_available', 'stash_change',
  'target_invalid', 'damage', 'watchdog', 'expired'];

const BAGS = ['target_a', 'target_b'];
const sameCell = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };

export default class JevStrategist {
  /**
   * @param decide  async ({state, questions}) => mapJevAnswer(...) result
   * @param opts    DEFAULTS overrides; `now`, `rng` and `watchdog` injectable
   */
  constructor(decide, opts = {}) {
    this.decide = decide;
    const { now, rng, watchdog, ...cfg } = opts;
    this.cfg = { ...DEFAULTS, ...cfg };
    this.now = now || (() => performance.now());
    this.rng = rng || Math.random;
    this.watchdog = createWatchdog(watchdog);

    this.model = null;
    this.budgetStopped = null;       // 'requests' | 'tokens' | 'errors'
    this.consecutiveErrors = 0;
    this.stats = { logicalRequests: 0, answers: 0, invalid: 0, errors: 0, timeouts: 0,
      obsolete: 0, late: 0, strayMovement: 0, tokensApprox: 0, tokensBilled: 0 };
    this.triggers = { requested: {}, merged: {}, coalesced: 0 };
    this.strategies = { adopted: 0, rejected: {}, objectiveHeld: 0, switches: 0,
      invalidated: 0, expired: 0 };
    this.powers = { requested: 0, accepted: 0, activated: 0, expiredUnused: 0, saved: 0, unarmedActivations: 0,
      rejected: {}, byName: {}, last: null };
    this.motor = { detours: 0, evadingMs: 0, exploringAttempts: 0 };
    this.recoveryStats = { invalidatedByStall: 0, watchdogRequests: 0, suppressed: 0 };
    this.time = { jevMs: 0, fallbackMs: 0, recoveryMs: 0, idleMs: 0 };
    this.houses = [];
    this.timeline = [];

    this.epoch = 0;
    this.pending = new Set();
    this.inFlight = null;
    this.lastDispatchAt = -Infinity;
    this.strategy = null;
    this.armed = null;               // { name, plan, until } while a power is armed
    this.recovery = null;
    this.watchdogOwed = false;
    this.lastWatchdogRequestAt = -Infinity;
    this.attemptSwitches = 0;
    this.houseKey = null;
    this.attempt = 1;
    this.snapshot = null;
    this.lastTickAt = null;
    this.startedAt = null;
    this.current = null;
    this._seq = 0;
    this._view = null;
    this._dist = null;
    this._distKey = null;
    this._attemptStartedAt = -Infinity;
    this._openingReadyAt = -Infinity;
    this._lastWaypoint = null;
    this.houseDeaths = [];
    this.failedRoutes = [];
    this.knownPocket = null;
    this._lastLive = null;
  }

  /** Walking distances from the runner, recomputed only when its cell changes. */
  _distances(view) {
    const key = view.houseKey + '|' + view.runner.x + ',' + view.runner.y;
    if (key !== this._distKey) {
      this._dist = pathDistances(view, view.runner);
      this._distKey = key;
    }
    return this._dist;
  }

  /* ---------------- the per-frame entry point ---------------- */

  /**
   * @param view   BotDriver._jevView(): cells, flags, no bag identities
   * @param hooks  { onRecovery?(cell) } — the motor is told when recovery starts
   * @returns Plan (see the header)
   */
  tick(view, hooks = {}) {
    const now = this.now();
    if (this.startedAt == null) this.startedAt = now;
    // Capped: BotDriver does not tick through a death screen or a menu, and
    // that gap is not time any strategy was in force.
    const dt = this.lastTickAt == null ? 0 : Math.min(250, Math.max(0, now - this.lastTickAt));
    this.lastTickAt = now;

    if (this.inFlight && now - this.inFlight.startedAt > this.cfg.timeoutMs) {
      this.inFlight = null;
      this.stats.timeouts++;
      this._failure(now, 'timeout');
    }

    if (!view || !view.runner) { this.time.idleMs += dt; return this._plan(null, false, 'idle'); }
    if (view.houseKey !== this.houseKey) this._newHouse(view, now);
    if (!view.live) {
      // Countdown or a paused board: nothing is asked, but the runner AI is
      // still handed the fair fallback, never left to its own objective code.
      this.time.idleMs += dt;
      const fb = fallbackObjective(view, this._distances(view));
      return this._plan(fb ? { source: 'fallback', ...fb } : null, false, 'idle');
    }

    const dist = this._distances(view);
    this._view = view;
    this._lastLive = { cell: { ...view.runner }, carrying: !!view.carrying, posture: this.current?.posture ?? 'balanced' };
    this._detect(view, now);

    if (this.armed && now >= this.armed.until) {
      this.powers.expiredUnused++;
      this._log(now, 'power-expired', { name: this.armed.name, plan: this.armed.plan });
      this.armed = null;
    }
    if (view.motorWaypoint && !sameCell(view.motorWaypoint, this._lastWaypoint)) this.motor.detours++;
    this._lastWaypoint = view.motorWaypoint || null;
    if (view.evading) this.motor.evadingMs += dt;

    if (this.strategy) {
      const age = now - this.strategy.adoptedAt;
      if (this.strategy.objective === 'hold' && age >= this.cfg.holdMaxMs) {
        this._invalidate('hold-over', now, 'expired');
      } else if (age >= this.cfg.strategyTtlMs && !this.strategy.expiryQueued) {
        this.strategy.expiryQueued = true;
        this.strategies.expired++;
        this.pending.add('expired');
      }
    } else if (!this.pending.size && !this.inFlight && now - this.lastDispatchAt >= this.cfg.noStrategyRetryMs) {
      this.pending.add('expired');
    }

    let target = this._target(view, dist, now);

    // Progress is measured toward what the motor is actually walking to:
    // its own detour waypoint when it has one, the objective otherwise.
    // Evasion is NOT exempt: bouncing out of a lane and back must eventually
    // yield to recovery. Pauses/holds, active phase and spawn grace are exempt.
    const aim = this.recovery?.goal || view.motorWaypoint || target?.cell || null;
    const wd = watchdogStep(this.watchdog, {
      now,
      dist: aim ? distTo(dist, aim) : null,
      exempt: !target || target.objective === 'hold' || !!view.phasing ||
        now - this._attemptStartedAt < this.cfg.attemptGraceMs
    });
    if (wd.event === 'stall') {
      this._log(now, 'stall', { objective: target?.objective ?? null, source: target?.source ?? null, evading: !!view.evading });
      if (this.strategy && !this.strategy.stalled) {
        this.strategy.stalled = true;
        this.strategies.invalidated++;
        this.recoveryStats.invalidatedByStall++;
      }
      // Aimed at the objective, away from plugs and out of lanes: recovery
      // breaks the stall without throwing away the progress already made.
      // Once exploring, the random sidestep instead: the direct way has failed.
      const plugMaps = (view.plugs || []).map((p) => pathDistances(view, p, 3));
      const cell = recoveryCell(view, dist, {
        rng: this.rng,
        exposed: (c) => !!view.exposedAt?.(c),
        goal: aim && !this.exploring ? pathDistances(view, aim) : null,
        nearPlug: (c) => plugMaps.some((m) => distTo(m, c) != null)
      });
      this.recovery = { cell, goal: aim, startedAt: now };
      this.watchdogOwed = true;
      hooks.onRecovery?.(cell);
    } else if (wd.event === 'recovery-end') {
      this._log(now, 'recovery-end', {});
      this.recovery = null;
    } else if (wd.event === 'restored' || wd.event === 'not-restored') {
      this._log(now, wd.event, {});
    }
    const recovering = isRecovering(this.watchdog, now);

    if (!recovering && this.watchdogOwed) {
      this.watchdogOwed = false;
      if (now - this.lastWatchdogRequestAt >= this.cfg.watchdogRequestGapMs) this.pending.add('watchdog');
      else this.recoveryStats.suppressed++;
    }

    this._maybeDispatch(view, dist, now, recovering);

    if (recovering) {
      if (this.recovery?.cell) target = { source: 'recovery', objective: 'recover', cell: this.recovery.cell };
    } else if (!target || target.source !== 'jev') {
      target = this._target(view, dist, now);
    }
    const mode = recovering ? 'recovery' : ['jev', 'learned'].includes(target?.source) ? 'jev' : 'fallback';
    this.time[mode + 'Ms'] += dt;
    const h = this.houses[this.houses.length - 1];
    if (h) h[mode + 'Ms'] = (h[mode + 'Ms'] || 0) + dt;
    return this._plan(target, recovering, mode);
  }

  /** Stop the bounded recovery early once its floor waypoint is reached. */
  onRecoveryReached() {
    const now = this.now();
    if (isRecovering(this.watchdog, now)) this.watchdog.recoveringUntil = now;
  }

  /** The direct way has failed often enough in this house to try others. */
  get exploring() {
    return this.houseDeaths.length >= this.cfg.exploreAfterDeaths;
  }

  _plan(target, recovering, mode) {
    const s = this.strategy;
    const posture = (!recovering && s && !s.stalled) ? s.posture : 'balanced';
    this.current = {
      mode, recovering,
      objective: target?.objective ?? null,
      source: target?.source ?? null,
      posture,
      confidence: s?.confidence ?? null,
      ageMs: s ? Math.round(this.now() - s.adoptedAt) : null,
      stalled: !!s?.stalled,
      route: s?.route ?? null,
      armedPower: this._powerReady(this._view) ? this.armed?.name ?? null : null,
      powerPlan: this.armed?.plan ?? null
    };
    return { objective: target, posture, recovering, mode,
      armedPower: this._powerReady(this._view) ? this.armed?.name ?? null : null,
      powerPlan: this.armed?.plan ?? null,
      // Fair, match-local memory: where this runner was caught, never which
      // bag was genuine. The motor uses repeated points to stop brute-forcing
      // the same corridor on later attempts.
      deathCells: this.houseDeaths.map((d) => ({ cell: { ...d.cell }, carrying: !!d.carrying })),
      // Internal motor-only reference; do not clone whole routes every frame.
      failedRoutes: this.failedRoutes,
      openingWaiting: this.now() < this._openingReadyAt,
      explore: this.exploring && !recovering };
  }

  /* ---------------- events ---------------- */

  _newHouse(view, now) {
    const prev = this.houses[this.houses.length - 1];
    const retry = !!prev && prev.house === view.house && this.matchKey === view.matchKey;
    this.matchKey = view.matchKey;
    if (prev) prev.endedAt = now;
    if (!retry) { this.houseDeaths = []; this.failedRoutes = []; this.knownPocket = null; }
    else if (this._lastLive) this.houseDeaths.push(this._lastLive);
    this._lastLive = null;
    if (this.exploring) this.motor.exploringAttempts++;
    this.houseKey = view.houseKey;
    this.attempt = retry ? (prev.attempt || 1) + 1 : 1;
    this.epoch++;
    this.strategy = null;
    if (this.armed) {
      this.powers.expiredUnused++;
      this._log(now, 'power-discarded', { name: this.armed.name, plan: this.armed.plan, reason: retry ? 'retry' : 'house-change' });
      this.armed = null;
    }
    this.recovery = null;
    this.watchdogOwed = false;
    this.attemptSwitches = 0;
    this._attemptStartedAt = now;
    const lo = Math.max(0, Number(this.cfg.openingDelayMinMs) || 0);
    const hi = Math.max(lo, Number(this.cfg.openingDelayMaxMs) || lo);
    this._openingReadyAt = now + lo + this.rng() * (hi - lo);
    this._distKey = null;
    if (isRecovering(this.watchdog, now)) this.watchdog.stats.recoveryMs += now - this.watchdog.recoveryStartedAt;
    this.watchdog.recoveringUntil = 0;
    resetWatchdog(this.watchdog, now, { newHouse: true });
    this.snapshot = null;
    this.pending.clear();
    this.pending.add(retry ? 'retry' : 'house_start');
    this.houses.push({ house: view.house ?? null, attempt: this.attempt, startedAt: now,
      requests: 0, budgetStoppedAtStart: this.budgetStopped });
    this._log(now, retry ? 'retry' : 'house', { house: view.house ?? null, attempt: this.attempt });
  }

  /** Compare with the last frame and queue whatever changed. */
  _detect(view, now) {
    if (Number.isInteger(view.revealedPocket)) this.knownPocket = view.revealedPocket;
    const snap = {
      carrying: !!view.carrying,
      bags: view.candidates.map((c) => c.cell.x + ',' + c.cell.y).join('|'),
      hp: view.hp ?? null
    };
    const prev = this.snapshot;
    this.snapshot = snap;
    if (!prev) return;
    if (snap.carrying && !prev.carrying) {
      this.epoch++;
      this.pending.add('extract_available');
      this._log(now, 'pickup', {});
    } else if (!snap.carrying && snap.bags !== prev.bags) {
      this.epoch++;
      this.pending.add('stash_change');
      this._log(now, 'bags-changed', {});
    }
    if (snap.hp != null && prev.hp != null && snap.hp < prev.hp) {
      this.pending.add('damage');
      this._log(now, 'damage', { hp: snap.hp });
    }
  }

  /** The active strategy's target, re-validated; else the fair fallback. */
  _target(view, dist, now) {
    // Once this match has visibly revealed the bunk, retries of this house
    // keep the answer. The match-scoped stash seed guarantees that pocket is
    // still genuine; a new house or new match clears the knowledge.
    if (!view.carrying && Number.isInteger(this.knownPocket)) {
      const learned = view.candidates.find((c) => c.pocket === this.knownPocket);
      if (learned && distTo(dist, learned.cell) != null) {
        return { source: 'learned', objective: learned.id, cell: { ...learned.cell }, route: 'shortest-safe' };
      }
    }
    const s = this.strategy;
    if (s && !s.stalled) {
      let ok = false, cell = null, objective = s.objective;
      if (s.objective === 'hold') { ok = true; cell = { ...view.runner }; }
      else if (s.objective === 'extract') {
        ok = !!view.carrying && !!view.extract && distTo(dist, view.extract) != null;
        cell = view.extract;
      } else if (!view.carrying && stillCandidate(view, s.cell) && distTo(dist, s.cell) != null) {
        ok = true; cell = s.cell;
        // A bag keeps its cell; its label can change once the other bag goes.
        objective = view.candidates.find((c) => sameCell(c.cell, s.cell))?.id ?? s.objective;
      }
      if (ok) {
        return { source: 'jev', objective, cell: { ...cell }, finalCell: { ...cell }, route: 'shortest-safe' };
      }
      this._invalidate(view.carrying ? 'carrying' : 'target-gone', now, 'target_invalid');
    }
    const fb = fallbackObjective(view, dist);
    return fb ? { source: 'fallback', ...fb } : null;
  }

  _invalidate(reason, now, trigger) {
    if (!this.strategy) return;
    this.strategies.invalidated++;
    this._log(now, 'invalidated', { reason, objective: this.strategy.objective });
    this.strategy = null;
    if (trigger) this.pending.add(trigger);
  }

  /* ---------------- asking ---------------- */

  overBudget() {
    if (this.budgetStopped) return true;
    let why = null;
    if (this.stats.logicalRequests >= this.cfg.maxRequests) why = 'requests';
    else if ((this.stats.tokensBilled || this.stats.tokensApprox) >= this.cfg.maxInputTokens) why = 'tokens';
    else if (this.consecutiveErrors >= this.cfg.maxConsecutiveErrors) why = 'errors';
    if (!why) return false;
    this.budgetStopped = why;
    console.warn(`[JEV] ${why} ceiling reached — no further strategic requests this session;` +
      ' the runner AI continues on the fallback objective.');
    this._log(this.now(), 'budget-stopped', { why });
    return true;
  }

  _maybeDispatch(view, dist, now, recovering) {
    if (!this.pending.size || this.inFlight || recovering) return;
    if (this.overBudget()) { this.pending.clear(); return; }
    if (now - this.lastDispatchAt < this.cfg.minRequestGapMs) return;   // coalesce

    const triggers = [...this.pending];
    const primary = PRIORITY.find((t) => this.pending.has(t)) || triggers[0];
    this.pending.clear();

    const s = this.strategy;
    const payload = jevState({ ...view, attempt: this.attempt, knownPocket: this.knownPocket }, {
      dist,
      plugDists: (view.plugs || []).map((p) => pathDistances(view, p, 60)),
      trigger: primary,
      deaths: this.houseDeaths,
      plan: s ? {
        objective: s.objective, posture: s.posture, route: 'shortest-safe', ageMs: now - s.adoptedAt,
        progress: s.stalled ? 'stalled' : 'advancing'
      } : { objective: 'none', posture: 'balanced', route: 'shortest-safe', ageMs: 0, progress: 'none' }
    });
    if (!payload) return;

    this.stats.logicalRequests++;
    bump(this.triggers.requested, primary);
    for (const t of triggers) bump(this.triggers.merged, t);
    this.triggers.coalesced += triggers.length - 1;
    if (triggers.includes('watchdog')) {
      this.recoveryStats.watchdogRequests++;
      this.lastWatchdogRequestAt = now;
    }
    const h = this.houses[this.houses.length - 1];
    if (h) h.requests++;
    this.lastDispatchAt = now;
    this.stats.tokensApprox += Math.ceil(JSON.stringify(payload).length / 4);

    const token = { id: ++this._seq, epoch: this.epoch, startedAt: now, trigger: primary,
      objectives: Object.keys(payload.questions.objective?.criteria || {}),
      postures: Object.keys(payload.questions.posture?.criteria || {}) };
    this.inFlight = token;
    this._log(now, 'request', { trigger: primary, merged: triggers.length });

    let promise;
    try { promise = this.decide(payload); }
    catch (e) { this._onError(token, e); return; }
    Promise.resolve(promise).then((a) => this._onAnswer(token, a), (e) => this._onError(token, e));
  }

  _count(answer) {
    // Billed whether or not it is used: an obsolete answer still cost money.
    if (Number.isFinite(answer?.usage?.input_tokens)) this.stats.tokensBilled += answer.usage.input_tokens;
    if (typeof answer?.model === 'string') this.model = answer.model;
  }

  _failure(now, why) {
    this.stats.errors += why === 'timeout' ? 0 : 1;
    this.consecutiveErrors++;
    console.warn(`[JEV] strategic request failed (${this.consecutiveErrors}/${this.cfg.maxConsecutiveErrors}): ${why}`);
    this._log(now, 'failure', { why });
  }

  /** Remember a route that ended in a catch; visible match-local experience. */
  rememberFailedRoute(cells, carrying) {
    if (!Array.isArray(cells) || cells.length < 2) return;
    this.failedRoutes.push({ carrying: !!carrying, cells: cells.map(c => ({ x: c.x, y: c.y })) });
    if (this.failedRoutes.length > 24) this.failedRoutes.shift();
  }

  _onError(token, err) {
    if (this.inFlight !== token) { this.stats.late++; return; }
    this.inFlight = null;
    this._failure(this.now(), String(err?.message || err).slice(0, 80));
  }

  _onAnswer(token, answer) {
    this._count(answer);
    const now = this.now();
    if (this.inFlight !== token) { this.stats.late++; return; }
    this.inFlight = null;
    if (token.epoch !== this.epoch) {
      this.stats.obsolete++;
      this._log(now, 'obsolete', { trigger: token.trigger });
      return;
    }
    if (!answer || !answer.valid) {
      this.stats.invalid++;
      bump(this.strategies.rejected, answer?.reason || 'invalid');
      this._failure(now, 'invalid');
      return;
    }
    this.consecutiveErrors = 0;
    this.stats.answers++;
    if (answer.strayMovement) this.stats.strayMovement++;
    this._adopt(answer, token, now);
  }

  _adopt(answer, token, now) {
    const view = this._view, dist = this._dist;
    if (!view || !dist) { bump(this.strategies.rejected, 'no-view'); return; }
    const lowConfidence = Number.isFinite(answer.confidence) && answer.confidence < this.cfg.minConfidence;
    const learned = !view.carrying && Number.isInteger(this.knownPocket)
      ? view.candidates.find(c => c.pocket === this.knownPocket) : null;
    const chosenObjective = learned?.id ?? (lowConfidence ? token.objectives?.[0] : answer.objective);
    if (lowConfidence) this._log(now, 'low-confidence-fallback', {
      wanted: answer.objective, confidence: answer.confidence, chosen: chosenObjective
    });
    const res = resolveObjective(chosenObjective, view, dist);
    if (!res.ok) {
      bump(this.strategies.rejected, res.reason);
      this._log(now, 'rejected', { objective: chosenObjective, reason: res.reason });
      if (answer.power !== 'none') { this.powers.requested++; bump(this.powers.byName, answer.power); bump(this.powers.rejected, 'strategy-rejected'); }
      return;
    }

    let { objective, cell } = res;
    const cur = this.strategy && !this.strategy.stalled ? this.strategy : null;
    let targetSince = now;
    const switching = cur && BAGS.includes(cur.objective) && BAGS.includes(objective) && !sameCell(cur.cell, cell);
    if (switching) {
      const young = now - cur.targetSince < this.cfg.commitMs;
      const capped = this.attemptSwitches >= this.cfg.maxSwitchesPerAttempt;
      if (!learned && (young || capped) && stillCandidate(view, cur.cell)) {
        this.strategies.objectiveHeld++;
        this._log(now, 'held', { wanted: objective, kept: cur.objective, why: young ? 'commitment' : 'switch-cap' });
        objective = cur.objective; cell = cur.cell; targetSince = cur.targetSince;
      } else {
        this.attemptSwitches++;
        this.strategies.switches++;
      }
    } else if (cur && sameCell(cur.cell, cell)) {
      targetSince = cur.targetSince;
    }
    if (!cur || !sameCell(cur.cell, cell)) resetWatchdog(this.watchdog, now);

    // Only a posture that was on offer: the answer mapper turns a missing one
    // into 'balanced', which may be the one being rested.
    const posture = !token.postures?.length || token.postures.includes(answer.posture) ? answer.posture : token.postures[0];
    const power = answer.power;
    const powerPlan = answer.powerPlan || answer.power;
    this.strategy = {
      objective, posture, route: 'shortest-safe', power, powerPlan,
      confidence: answer.confidence, cell: { ...cell },
      adoptedAt: now, targetSince, stalled: false, trigger: token.trigger
    };
    this.strategies.adopted++;
    this._log(now, 'adopted', { objective, posture, route: 'shortest-safe', power,
      confidence: answer.confidence, trigger: token.trigger });

    this._armPower(power, powerPlan, view, now);
  }

  /* ---------------- powers ---------------- */

  /**
   * Arm (or, for 'none', disarm) a power. Validated against the live board;
   * an invalid one is rejected with a reason and never reaches the motor.
   */
  _armPower(name, plan, view, now) {
    if (name === 'none') {
      if (this.armed) {
        this.powers.saved++;
        this._log(now, 'power-saved', { name: this.armed.name });
        this.armed = null;
      }
      return;
    }
    this.powers.requested++;
    bump(this.powers.byName, name);
    const sel = view.powers?.selected || [];
    const used = view.powers?.consumed || [];
    let reason = null;
    if (!view.isRunner) reason = 'not-runner';
    else if (!sel.includes(name)) reason = 'not-in-loadout';
    else if (!sel.some((p, i) => p === name && !used[i])) reason = 'consumed';
    else if (name === 'decoy' && view.decoyActive) reason = 'decoy-exists';
    else if (name === 'phase' && view.phasing) reason = 'already-phasing';
    if (reason) {
      bump(this.powers.rejected, reason);
      this.powers.last = { name, result: 'rejected:' + reason, at: now };
      this._log(now, 'power-rejected', { name, reason });
      return;
    }
    this.powers.accepted++;
    if (this.armed) this._log(now, 'power-replaced', {
      name: this.armed.name, plan: this.armed.plan, nextName: name, nextPlan: plan
    });
    this.armed = { name, plan, until: now + this.cfg.armMs };
    this.powers.last = { name, result: 'armed', at: now };
    this._log(now, 'power-armed', { name, plan });
  }

  /** A plan is armed immediately but only exposed to the motor in its window. */
  _powerReady(view) {
    if (!this.armed || !view?.runner) return false;
    const plan = this.armed.plan || this.armed.name;
    if (plan === this.armed.name) return true; // legacy answer
    if (plan === 'phase_shortcut') return true; // motor approaches first, then validates travel time
    let nearest = Infinity;
    for (const p of view.plugs || []) nearest = Math.min(nearest, Math.abs(p.x - view.runner.x) + Math.abs(p.y - view.runner.y));
    if (plan === 'dash_escape' || plan === 'dash_finish' || plan === 'dash_objective') return true; // motor validates proximity and landing
    if (plan === 'phase_intercept') return !!view.inLane || nearest <= 7;
    if (plan === 'decoy_pressure') return nearest <= 18;
    return false;
  }

  /**
   * BotDriver reports every slot the motor consumed. An activation of the
   * armed power is the strategy carried out; any other would mean the motor
   * spent something Jev did not arm, which the hybrid never allows — it is
   * counted so a regression shows up as a non-zero number, not a hunch.
   */
  onPowerActivated(name) {
    const now = this.now();
    if (this.armed && this.armed.name === name) {
      this.powers.activated++;
      this.powers.last = { name, result: 'activated', at: now };
      this._log(now, 'power-activated', { name, plan: this.armed.plan });
      this.armed = null;
    } else {
      this.powers.unarmedActivations++;
      this._log(now, 'power-unarmed', { name });
    }
  }

  /* ---------------- reporting ---------------- */

  _log(now, kind, detail) {
    if (this.timeline.length >= 2000) this.timeline.shift();
    this._tlSeq = (this._tlSeq || 0) + 1;
    this.timeline.push({ seq: this._tlSeq, t: Math.round(now - (this.startedAt ?? now)), kind, ...detail });
  }

  /** Forget the current plan without touching the measurements. */
  reset() {
    this.strategy = null;
    this.armed = null;
    this.inFlight = null;
    this.pending.clear();
  }

  /**
   * Everything the spike needs to judge the run. Counts, rates, labels and
   * model strings only — nothing here can carry a credential.
   */
  report() {
    const s = this.stats;
    const tokens = s.tokensBilled || s.tokensApprox;
    const t = this.time;
    const live = t.jevMs + t.fallbackMs + t.recoveryMs;
    const share = (ms) => (live ? +(ms / live).toFixed(3) : 0);
    const w = this.watchdog.stats;
    const http = this.decide?.http ? { ...this.decide.http, statuses: { ...this.decide.http.statuses } } : null;
    return {
      driver: 'jev-strategist',
      profile: this.profile ?? 'apex',
      route: this.route ?? null,
      motor: 'runner-ai',
      rawMovementActions: 0,
      model: this.model,
      logicalRequests: s.logicalRequests,
      answers: s.answers,
      invalid: s.invalid,
      errors: s.errors,
      timeouts: s.timeouts,
      obsolete: s.obsolete,
      late: s.late,
      strayMovementDropped: s.strayMovement,
      http,
      triggers: { requested: { ...this.triggers.requested }, merged: { ...this.triggers.merged },
        coalesced: this.triggers.coalesced },
      strategies: { ...this.strategies, rejected: { ...this.strategies.rejected } },
      watchdog: {
        stalls: w.stalls, recoveries: w.recoveries,
        recoveryMs: Math.round(w.recoveryMs), recoveryShare: share(t.recoveryMs),
        strategiesInvalidated: this.recoveryStats.invalidatedByStall,
        watchdogRequests: this.recoveryStats.watchdogRequests,
        watchdogRequestsSuppressed: this.recoveryStats.suppressed,
        restored: w.restored, notRestored: w.notRestored
      },
      powers: { requested: this.powers.requested, accepted: this.powers.accepted,
        activated: this.powers.activated, expiredUnused: this.powers.expiredUnused,
        saved: this.powers.saved, unarmedActivations: this.powers.unarmedActivations,
        rejected: { ...this.powers.rejected }, byName: { ...this.powers.byName }, last: this.powers.last },
      motorDetail: { detours: this.motor.detours, evadingMs: Math.round(this.motor.evadingMs),
        exploringAttempts: this.motor.exploringAttempts },
      time: {
        jevMs: Math.round(t.jevMs), fallbackMs: Math.round(t.fallbackMs),
        recoveryMs: Math.round(t.recoveryMs), idleMs: Math.round(t.idleMs),
        strategyActiveShare: share(t.jevMs), fallbackShare: share(t.fallbackMs)
      },
      houses: this.houses.map((h) => ({ house: h.house, attempt: h.attempt, requests: h.requests,
        jevMs: Math.round(h.jevMs || 0), fallbackMs: Math.round(h.fallbackMs || 0),
        recoveryMs: Math.round(h.recoveryMs || 0), budgetStoppedAtStart: h.budgetStoppedAtStart })),
      tokensApprox: s.tokensApprox,
      tokensBilled: s.tokensBilled,
      tokenSource: s.tokensBilled ? 'api' : 'estimated',
      requestLimit: this.cfg.maxRequests,
      tokenLimit: this.cfg.maxInputTokens,
      budgetStopped: this.budgetStopped,
      costUsd: +(tokens / 1e6 * JEV_INPUT_USD_PER_MTOK).toFixed(4)
    };
  }
}
