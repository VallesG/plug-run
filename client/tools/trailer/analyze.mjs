// Find real moments in a take's per-frame telemetry. Nothing here creates a
// moment -- it only locates ones the bot actually produced, by frame index.
export const FPS = 30;

export function findMoments(rows) {
  const live = rows.map((r, i) => ({ ...r, i })).filter(r => r.live);
  const out = { closeCalls: [], pickups: [], powers: [], extractions: [], clears: [], plugPressure: [] };
  if (!live.length) return out;

  // A close call is a Plug bullet passing near the runner WITHOUT a hit in the
  // next second. A bullet that connects is a hit, not a near-miss, and the
  // brief is explicit that every near-miss must be genuine.
  for (const r of live) {
    if (r.bullet == null || r.bullet > 1.2) continue;
    // A runner already at 0 HP is dying, not dodging. Counting that as a
    // survived near miss would be a lie told with real footage.
    if (!(r.hp >= 1)) continue;
    const later = live.filter(q => q.i > r.i && q.i <= r.i + FPS);
    const gotHit = later.some(q => q.hp < r.hp);
    if (gotHit) continue;
    out.closeCalls.push({ frame: r.i, dist: r.bullet, hp: r.hp, seed: r.seed });
  }
  // Keep the single tightest pass per 2s cluster.
  out.closeCalls = dedupe(out.closeCalls, FPS * 2, (a, b) => a.dist - b.dist);

  for (let k = 1; k < live.length; k++) {
    const a = live[k - 1], b = live[k];
    if (!a.stash && b.stash) out.pickups.push({ frame: b.i, seed: b.seed });
    if (a.used !== b.used && (b.used.match(/1/g) || []).length > (a.used.match(/1/g) || []).length)
      out.powers.push({ frame: b.i, used: b.used, seed: b.seed });
    // Carrying the stash, then the round ends: that is an extraction.
    if (a.stash && !b.stash && (b.over || b.paused)) out.extractions.push({ frame: b.i, seed: b.seed });
    if (!a.over && b.over) out.clears.push({ frame: b.i, seed: b.seed });
  }
  for (const r of live) if (r.plug != null && r.plug <= 2.2)
    out.plugPressure.push({ frame: r.i, dist: r.plug, hp: r.hp });
  out.plugPressure = dedupe(out.plugPressure, FPS * 2, (a, b) => a.dist - b.dist);
  return out;
}

function dedupe(list, window, better) {
  const sorted = [...list].sort((a, b) => a.frame - b.frame);
  const keep = [];
  for (const item of sorted) {
    const last = keep[keep.length - 1];
    if (last && item.frame - last.frame < window) {
      if (better(item, last) < 0) keep[keep.length - 1] = item;
    } else keep.push(item);
  }
  return keep;
}

/** A clip window around a frame, clamped to the take and to live footage. */
export function clipAround(rows, frame, beforeS, afterS) {
  const start = Math.max(0, frame - Math.round(beforeS * FPS));
  const end = Math.min(rows.length - 1, frame + Math.round(afterS * FPS));
  return { start, end, seconds: +((end - start) / FPS).toFixed(2) };
}
