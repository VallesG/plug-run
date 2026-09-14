// Run statistics — reading the harness output.
//
// Imports nothing, for the same reason logic/threat.js does: the conclusions
// drawn here decide map sizing and the race format, and a summary function
// that can only run inside a browser is a summary function nobody checks.

/**
 * Per-MAP rather than per-run, which is the unit a race format cares about.
 *
 * A completion rate pooled over runs hides the shape that matters. 61 runs at
 * 44% could be every map costing a couple of tries, or most maps falling first
 * time and one of them being a 29-attempt wall. The first is a race; the second
 * is a coin flip on who draws the wall, and the difference between them is
 * invisible until you group by seed.
 *
 * That is not hypothetical — it is what the first batch off this harness
 * actually was, and the reason lockRound exists.
 *
 * Rows arrive in play order, so position within a seed's group is the attempt
 * number. Returns null unless more than one map was sampled: without lockRound
 * a session is a ladder, every round is its own map, and grouping by seed just
 * restates the round numbers.
 *
 * @param rows telemetry records from finalizeRun(), oldest first
 */
export function mapStats(rows) {
  const bySeed = new Map();
  for (const r of rows || []) {
    if (r?.seed == null) continue;
    if (!bySeed.has(r.seed)) bySeed.set(r.seed, []);
    bySeed.get(r.seed).push(r);
  }
  if (bySeed.size < 2) return null;

  const attemptsToClear = [];
  let firstTry = 0;
  let uncleared = 0;

  for (const attempts of bySeed.values()) {
    const idx = attempts.findIndex((r) => r.outcome === 'extracted');
    if (idx < 0) { uncleared++; continue; }
    attemptsToClear.push(idx + 1);
    if (idx === 0) firstTry++;
  }

  const sorted = [...attemptsToClear].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return {
    mapsSampled: bySeed.size,
    // toFixed without a unary + in front of it: `+'90.0'` is the number 90,
    // which prints as "90%" beside a "33.3%" and reads like a different
    // precision rather than the same one landing round.
    clearedFirstTry: ((firstTry / bySeed.size) * 100).toFixed(1) + '%',
    neverCleared: uncleared,
    // The tail is the finding. A median of 1 with a max of 29 is not a
    // difficulty curve, it is a lottery, and no amount of tuning the mean
    // fixes it — a map like that has to be excluded by construction.
    attemptsToClear: sorted.length ? {
      median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
      min: sorted[0],
      max: sorted[sorted.length - 1]
    } : null
  };
}
