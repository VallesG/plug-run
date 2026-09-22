// Evasion commitment — deciding how long to keep dodging.
//
// Pure, so the oscillation this fixes can be reproduced in a headless test
// (see logic/threat.js for why that constraint exists).

/**
 * Decide this frame's dodge, given the last one.
 *
 * WHY THIS ISN'T JUST "DODGE WHEN IN A LANE"
 * That is what it was, re-decided every frame, and with two plugs it
 * deadlocks: leaving plug A's row puts you in plug B's column, leaving
 * B's column puts you back in A's row, forever. Measured in a round-8
 * batch, 15% of runs ran the full 90-second clock at 0.96 direction
 * changes per frame — the bot vibrating in place until the round timer
 * ended it. Round 7, with one plug, stalled on 3.7%.
 *
 * Two rules fix it:
 *   commitMs  hold a chosen dodge for a beat before reconsidering, so a
 *             single frame's geometry can't reverse it. Humans commit too;
 *             re-deciding every 16ms is not evasion, it is a tremor.
 *   maxMs     a dodge that has run this long is not working. Stop, rest for
 *             restMs, and let the pathfinder make progress — being shot at
 *             while advancing beats being pinned until the clock runs out.
 *
 * @param state     { dir, until, since, suppressUntil } from the last call
 * @param now       ms clock
 * @param risk      'row' | 'col' | null — the lane we are exposed in
 * @param candidate the direction a fresh dodge would take, or null
 * @param cfg       { commitMs, maxMs, restMs }
 * @returns { dir, state } — dir is null to defer to normal steering
 */
export function planDodge(state, now, risk, candidate, cfg) {
  const rest = { dir: null, until: 0, since: 0, suppressUntil: state.suppressUntil || 0 };

  // Resting after being pinned: ignore the lane and get on with it.
  if (now < (state.suppressUntil || 0)) return { dir: null, state: rest };

  // Clear of any lane — forget the dodge so the next one starts fresh.
  if (!risk) {
    const clearSince = state.clearSince ?? now;
    if (cfg.clearGraceMs && state.since && now-clearSince < cfg.clearGraceMs)
      return {dir:null,state:{...rest,since:state.since,clearSince}};
    return { dir: null, state: { ...rest, suppressUntil: 0 } };
  }

  const since = state.since || now;

  // Pinned too long between threats. Rest.
  if (now - since >= cfg.maxMs) {
    return { dir: null, state: { ...rest, suppressUntil: now + cfg.restMs } };
  }

  // Mid-commitment: hold the direction already chosen.
  if (state.dir && now < (state.until || 0)) {
    return { dir: state.dir, state: { ...state, since, clearSince:null } };
  }

  // Free to choose.
  if (!candidate) return { dir: null, state: { ...state, dir: null, until: 0, since, clearSince:null } };

  return {
    dir: candidate,
    state: { dir: candidate, until: now + cfg.commitMs, since, suppressUntil: 0 }
  };
}
