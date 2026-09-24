// Matchmaking: what the player's campaign says about them, what the bank's
// recordings actually measured, and how to pair the two. Pure: no imports.
//
// NOT "EASY / MEDIUM / HARD"
// A band here is a range of measured seconds-per-house, taken from the bank
// itself. If the bank changes, the bands move with it. Nothing is named after
// a feeling, and no recording is labelled hard because of the style it was
// driven with — a Sharp run that went badly sits with the slow ones.
//
// THE COMPARISON, AND ITS LIMIT
// A campaign house and a Rivals house are comparable only when the generator
// got the same inputs: same 16x35 grid, same cluster scale, one defender.
// Campaign house N uses scale [_,0.6,0.75,0.9,0.95][N] ?? 1 and Rivals slot
// houses use [0.6,0.75,0.9,0.95,1,1,1], so every Rivals house has a campaign
// counterpart. House 15's second defender has none and is excluded upstream.
// Race elapsed time is NOT used for this: it includes transitions and retries,
// which are not a measure of how fast someone clears a house.
export const RIVAL_SKILL_VERSION = 1;
export const RIVAL_UNLOCK_BLOCKS = 1;
export const RIVAL_UNLOCK_STASHES = 15;         // one complete 15-house block
export const RIVAL_MIN_OBSERVATIONS = 8;        // below this the estimate is provisional

const finite = v => Number.isFinite(v) ? v : null;
const med = list => {
  const s = list.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Per-house clear times a recording actually produced, by maze scale.
 *
 * Read from the record's own attempt list: the winning attempt on each house,
 * end minus start. Retries stay in the race clock where they belong, but they
 * are not how long that house took to clear.
 */
export function recordHouseTimes(record, scales) {
  if (!record?.attempts?.length) return {};
  const byScale = {};
  for (const attempt of record.attempts) {
    if (attempt.outcome !== 'extracted') continue;
    const scale = scales?.[attempt.house - 1];
    if (!Number.isFinite(scale)) continue;
    const ms = attempt.endedMs - attempt.startedMs;
    if (!Number.isFinite(ms) || ms <= 0) continue;
    (byScale[scale] ||= []).push(ms);
  }
  const out = {};
  for (const [scale, list] of Object.entries(byScale)) {
    out[scale] = { scale: Number(scale), houses: list.length, clearMs: med(list) };
  }
  return out;
}

/**
 * One comparable number for a recording: its median per-house clear time.
 *
 * Only scales the player also has evidence at are counted, so a player who has
 * only ever seen open early houses is not compared against dense late ones.
 */
export function recordBenchmark(record, scales, againstScales = null) {
  const byScale = recordHouseTimes(record, scales);
  const wanted = againstScales?.length
    ? againstScales.map(Number).filter(s => byScale[s])
    : Object.keys(byScale).map(Number);
  if (!wanted.length) return null;
  const houses = wanted.reduce((n, s) => n + byScale[s].houses, 0);
  return {
    clearMs: med(wanted.map(s => byScale[s].clearMs)),
    houses, scales: wanted.sort((a, b) => a - b), byScale
  };
}

/**
 * The player's own comparable number, plus how much it rests on.
 *
 * `provisional` is true when the evidence is thin — a legacy save that
 * finished blocks before any of this was recorded lands here, and says so,
 * rather than being handed a confident number built from nothing.
 */
export function playerSkill(samples, { minObservations = RIVAL_MIN_OBSERVATIONS } = {}) {
  const byScale = samples?.byScale ?? {};
  const scales = Object.keys(byScale).map(Number).filter(s => byScale[s]?.clearMs);
  const houses = finite(samples?.houses) ?? 0;
  if (!scales.length || !houses) {
    return { clearMs: null, scales: [], houses: 0, provisional: true, reason: 'no-timed-houses' };
  }
  const clearMs = med(scales.map(s => byScale[s].clearMs));
  const attempts = finite(samples?.attempts) ?? houses;
  return {
    clearMs,
    scales: scales.sort((a, b) => a - b),
    houses,
    // Retries per cleared house: a second axis the pairing can lean on when
    // two opponents are equally close on time.
    retryRate: houses ? Math.max(0, attempts - houses) / houses : 0,
    deathRate: houses ? (finite(samples?.deaths) ?? 0) / houses : 0,
    provisional: houses < minObservations,
    reason: houses < minObservations ? 'thin-evidence' : null
  };
}

/**
 * Bands cut from the bank's own spread, not from preset names.
 *
 * Three equal-population bands over the pool's benchmarks. With fewer than six
 * benchmarks the split is not meaningful and everything is one band, which is
 * honest about a thin bank instead of inventing tiers inside it.
 */
export function measuredBands(benchmarks) {
  const values = benchmarks.map(b => b?.clearMs).filter(Number.isFinite).sort((a, b) => a - b);
  if (values.length < 6) {
    return [{ index: 0, label: 'measured', minMs: values[0] ?? null, maxMs: values.at(-1) ?? null, count: values.length }];
  }
  const cut = i => values[Math.floor(values.length * i / 3)];
  const edges = [cut(1), cut(2)];
  const bounds = [[values[0], edges[0]], [edges[0], edges[1]], [edges[1], values.at(-1)]];
  return bounds.map(([minMs, maxMs], index) => ({
    index, label: ['fast', 'middle', 'steady'][index], minMs, maxMs,
    count: values.filter(v => index === 0 ? v < edges[0] : index === 1 ? v >= edges[0] && v < edges[1] : v >= edges[1]).length
  }));
}
export function bandOf(bands, clearMs) {
  if (!Number.isFinite(clearMs) || !bands.length) return null;
  return bands.find((b, i) => i === bands.length - 1 || clearMs < b.maxMs) ?? bands.at(-1);
}

function hash(value) {
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  return (h ^ (h >>> 15)) >>> 0;
}

/**
 * Choose an opponent close to the player, deterministically, with variety.
 *
 * `candidates` are { recordingID, benchmark } for records already proved
 * eligible (rules version, course identity, seeds) by the caller.
 *
 * Rules, in order:
 *   - a named recordingID wins, so a rematch is the same race;
 *   - anything raced recently is set aside unless that would leave nothing,
 *     so the pool rotates instead of serving one opponent forever;
 *   - the rest are ranked by distance from the player's own clear time, and
 *     one is taken from the closest few by a hash of who is racing and how
 *     many races they have run. Same inputs, same pick; a new race, a new one.
 *
 * Nothing here adjusts an opponent's pace, and nothing filters for a win.
 * A player faster than the whole bank simply gets the fastest recording.
 */
export function chooseCalibratedOpponent(candidates, {
  recordingID = null, targetMs = null, recent = [], salt = '', spread = 4
} = {}) {
  const pool = (candidates || []).filter(c => c?.recordingID);
  if (!pool.length) return null;
  if (recordingID) {
    const exact = pool.find(c => c.recordingID === recordingID);
    if (exact) return exact;
  }
  const recentSet = new Set(recent);
  const fresh = pool.filter(c => !recentSet.has(c.recordingID));
  const usable = fresh.length ? fresh : pool;
  const timed = usable.filter(c => Number.isFinite(c.benchmark?.clearMs));
  // No target, or no benchmarks: still deterministic, still varied.
  if (!Number.isFinite(targetMs) || !timed.length) {
    const ordered = usable.slice().sort((a, b) => a.recordingID < b.recordingID ? -1 : 1);
    return ordered[hash(salt) % ordered.length];
  }
  const ranked = timed
    .map(c => ({ c, distance: Math.abs(c.benchmark.clearMs - targetMs) }))
    .sort((a, b) => a.distance - b.distance || (a.c.recordingID < b.c.recordingID ? -1 : 1));
  const near = ranked.slice(0, Math.max(1, Math.min(spread, ranked.length)));
  return near[hash(salt) % near.length].c;
}

/**
 * Move the estimate with actual Rivals results.
 *
 * A win against a slower opponent says little; a win against a faster one says
 * more. The estimate steps a fraction of the way toward the opponent it just
 * raced, in the direction the result implies, and never moves more than a
 * quarter at once — so one lucky race cannot reclassify a player. Losses and
 * wins are symmetric; there is no hidden hand keeping anyone winning.
 */
export function adaptSkill(currentMs, { opponentMs, result, weight = 0.25 } = {}) {
  if (!Number.isFinite(currentMs) || !Number.isFinite(opponentMs)) return currentMs ?? null;
  if (result !== 'win' && result !== 'loss') return currentMs;
  const w = Math.min(0.25, Math.max(0, weight));
  // A win means the player was at least as fast as this opponent: pull the
  // estimate toward the opponent only when the opponent was the faster one.
  if (result === 'win' && opponentMs < currentMs) return Math.round(currentMs + (opponentMs - currentMs) * w);
  if (result === 'loss' && opponentMs > currentMs) return Math.round(currentMs + (opponentMs - currentMs) * w);
  return currentMs;
}

/** Block Rivals is open from the start (it used to wait for one complete campaign block). */
export function rivalsUnlocked() {
  return true;
}

/** One short line for the locked menu row. No explanation, no popup. */
export function rivalsUnlockProgress(coverage, { stashes = null } = {}) {
  const blocks = Math.max(
    Number.isSafeInteger(coverage?.blocksCompleted) ? coverage.blocksCompleted : 0,
    Number.isSafeInteger(stashes) ? Math.floor(stashes / 15) : 0
  );
  const done = Math.min(RIVAL_UNLOCK_BLOCKS, blocks);
  return { blocks: done, needed: RIVAL_UNLOCK_BLOCKS, text: done + ' of 1 block run' };
}
