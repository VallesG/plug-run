// Progress watchdog for the strategic objective. Pure: time and distance in,
// a decision out.
//
// WHAT IT MEASURES
// Walking distance to the active objective, in cells (jevStrategy
// pathDistances). "Progress" is a new best: the runner is at least
// `minGainCells` closer than it has been since the objective was set. Dodging
// out of a lane and back is not progress; circling is not progress; standing
// still certainly is not.
//
// WHAT IT DOES ABOUT IT — IT CONTROLS, IT DOES NOT JUST COUNT
// After `stallMs` without a new best it declares a stall. The caller then
//   1. marks the current strategy stalled (it is no longer trusted),
//   2. hands the runner AI a recovery waypoint for `recoveryMs`, with the
//      plan taken away,
//   3. does NOT ask Jev anything during recovery,
//   4. may ask afterwards — once, subject to the global cooldown.
// It then watches `verifyMs` after recovery for a new best, and records
// whether recovery actually restored progress.
//
// NO STORMS
// A stall cannot fire while recovering, and after recovery it needs a full
// fresh `stallMs` of no progress to fire again. So even a runner wedged for a
// minute stalls at most once per (recoveryMs + stallMs), and each stall can
// cause at most one request.

export const WATCHDOG_DEFAULTS = Object.freeze({
  stallMs: 2000,
  minGainCells: 1,
  recoveryMs: 1800,
  verifyMs: 3000
});

export function createWatchdog(opts = {}) {
  return {
    cfg: { ...WATCHDOG_DEFAULTS, ...opts },
    best: null, bestAt: null,
    recoveringUntil: 0, recoveryStartedAt: 0,
    verify: null,
    stats: { stalls: 0, recoveries: 0, recoveryMs: 0, restored: 0, notRestored: 0 }
  };
}

/**
 * Forget progress history: a new objective or a new house starts clean.
 * A recovery still being verified keeps being verified, re-baselined against
 * the new objective on the next observation — a fresh strategy adopted right
 * after recovery is the normal case, not a failure of the recovery.
 */
export function resetWatchdog(w, now, { newHouse = false } = {}) {
  w.best = null; w.bestAt = now;
  if (w.verify) {
    if (newHouse) { w.stats.notRestored++; w.verify = null; }
    else w.verify.from = null;
  }
}

export const isRecovering = (w, now) => now < w.recoveringUntil;

/**
 * One observation.
 * @param dist    walking distance to the objective, or null if there is none
 * @param exempt  true when not making progress is correct (holding, no live
 *                race, no objective): the clock is held, not advanced
 * @returns { event: null|'stall'|'recovery-end'|'restored'|'not-restored', recovering }
 */
export function watchdogStep(w, { now, dist, exempt = false }) {
  const cfg = w.cfg;

  if (w.recoveringUntil && now >= w.recoveringUntil) {
    w.stats.recoveryMs += w.recoveringUntil - w.recoveryStartedAt;
    w.recoveringUntil = 0;
    w.best = dist; w.bestAt = now;
    w.verify = { from: dist, until: now + cfg.verifyMs };
    return { event: 'recovery-end', recovering: false };
  }
  if (isRecovering(w, now)) return { event: null, recovering: true };

  if (w.verify) {
    if (w.verify.from == null) w.verify.from = dist;
    else if (dist != null && dist <= w.verify.from - cfg.minGainCells) {
      w.stats.restored++; w.verify = null;
      w.best = dist; w.bestAt = now;
      return { event: 'restored', recovering: false };
    }
    if (now >= w.verify.until) {
      w.stats.notRestored++; w.verify = null;
      // fall through: the stall clock below keeps running from bestAt
    }
  }

  if (exempt) { w.best = dist; w.bestAt = now; return { event: null, recovering: false }; }

  if (w.best == null || w.bestAt == null) { w.best = dist; w.bestAt = now; return { event: null, recovering: false }; }
  if (dist != null && dist <= w.best - cfg.minGainCells) {
    w.best = dist; w.bestAt = now;
    return { event: null, recovering: false };
  }
  if (now - w.bestAt >= cfg.stallMs) {
    w.stats.stalls++; w.stats.recoveries++;
    w.recoveryStartedAt = now;
    w.recoveringUntil = now + cfg.recoveryMs;
    if (w.verify) { w.stats.notRestored++; w.verify = null; }
    return { event: 'stall', recovering: true };
  }
  return { event: null, recovering: false };
}
