// Which map a locked run should be playing, and when to move on.
//
// Pure so it can be tested headlessly (see logic/threat.js for why). The
// sequencing decided here is what makes a locked batch valid data: advance too
// eagerly and every map looks like a first-try clear, too late and one map
// dominates the sample — which is the exact failure lockRound exists to fix.

/**
 * Advance the cursor for a round that is about to start.
 *
 * @param cursor        { routeID, attempts } — mutated copy returned, input untouched
 * @param arrivingRound the pveRound the scene arrived holding, before pinning.
 *                      A clear restarts at lockRound + 1; a death restarts at
 *                      lockRound. So this is the previous attempt's verdict,
 *                      with no second hook into the outcome needed.
 * @param lockRound     the round being held still
 * @param repeats       attempts each map gets before moving on
 */
export function advanceCursor(cursor, arrivingRound, lockRound, repeats) {
  const next = { routeID: cursor.routeID, attempts: cursor.attempts };

  // A map you just beat has nothing left to teach, so a clear always moves on
  // regardless of budget remaining.
  const cleared = (arrivingRound ?? 0) > lockRound;
  if (cleared || next.attempts >= repeats) {
    next.routeID += 1;
    next.attempts = 0;
  }
  next.attempts++;

  return next;
}

/**
 * Walk the round itself once a round has had its share of maps.
 *
 * A ladder run cannot reach round 120: the bot dies somewhere around 8-11 and
 * the climb stops there forever. Covering a range means locking each round in
 * turn, and doing that by hand is one URL edit and one page reload per round —
 * and a reload wipes the telemetry, so a 120-round sweep by hand is 120 files.
 *
 * This advances the locked round in place instead, keeping one session and one
 * dataset. Returns the same cursor shape plus the round to play.
 *
 * @param cursor { routeID, attempts, mapsDone, round }
 * @param sweep  { from, to, mapsPerRound, repeats }
 */
export function advanceSweep(cursor, arrivingRound, sweep) {
  const round = cursor.round ?? sweep.from;
  const next = advanceCursor(cursor, arrivingRound, round, sweep.repeats);

  // A map is finished when the next round starts a different one.
  const finishedMap = next.routeID !== cursor.routeID;
  const mapsDone = (cursor.mapsDone || 0) + (finishedMap ? 1 : 0);

  if (mapsDone >= sweep.mapsPerRound) {
    // Done with this round. Step up, or stop at the top of the range — the
    // caller keeps replaying the last round rather than running off the end,
    // which is harmless and obvious in the data.
    const stepped = Math.min(sweep.to, round + 1);
    return { routeID: next.routeID, attempts: next.attempts, mapsDone: 0, round: stepped };
  }

  return { routeID: next.routeID, attempts: next.attempts, mapsDone, round };
}
