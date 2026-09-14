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
