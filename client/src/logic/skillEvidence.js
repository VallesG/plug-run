// What the campaign actually observed about this player. Pure: no imports.
//
// WHY THIS EXISTS
// Matchmaking needs evidence, and before this module the game kept none: the
// journey checkpoint stores where you are, blockRun stores hits and deaths for
// a sentence, and per-run durations only ever reached an in-memory harness
// array. Nothing persisted how long a house took. So this is a new record, and
// it starts empty for everyone — including saves that have already finished
// blocks. An absent observation is absent, never a zero.
//
// WHAT COUNTS AS TIME
// `activeMs` is time inside a playable house with the world running. It
// excludes the entrance map, contact dialogue, city zooms, the loadout picker,
// settings and any paused frame, because those are measured outside the
// scene's own play clock. `totalActiveMs` adds the failed attempts on the same
// house; `attempts` says how many it took. A house cleared first try has
// totalActiveMs === activeMs.
//
// THE CALIBRATION BRIDGE
// Every observation carries the maze `scale` it was generated at. Campaign
// house N uses [_,0.6,0.75,0.9,0.95][N] ?? 1 and a Rivals course uses
// [0.6,0.75,0.9,0.95,1,1,1]; identical inputs to the same generator. So a
// campaign house and a Rivals house at the same scale are comparable, and
// houses at different scales are not. House 15 is excluded from comparison
// entirely: it is the only one with a second defender.
export const SKILL_EVIDENCE_VERSION = 1;
export const SKILL_MAX_OBSERVATIONS = 120;      // eight blocks of history
export const DUAL_DEFENDER_HOUSE = 15;
export const CAMPAIGN_HOUSES = 15;

/** The maze density a campaign house is generated at. Mirrors BaseGameScene. */
export function campaignHouseScale(house) {
  return [0, 0.6, 0.75, 0.9, 0.95][house] ?? 1;
}
/** Comparable across modes only when the generator inputs match. */
export function comparableScale(scale) {
  const known = [0.6, 0.75, 0.9, 0.95, 1];
  return known.find(s => Math.abs(s - scale) < 1e-9) ?? null;
}

const posInt = v => Number.isSafeInteger(v) && v > 0 ? v : 0;
const nonNeg = v => Number.isSafeInteger(v) && v >= 0 ? v : 0;
const ms = v => Number.isFinite(v) && v >= 0 && v < 3_600_000 ? Math.round(v) : null;

function cleanObservation(value) {
  const house = posInt(value?.house);
  const block = posInt(value?.block);
  const activeMs = ms(value?.activeMs);
  if (!house || house > CAMPAIGN_HOUSES || !block || activeMs === null || activeMs < 250) return null;
  const totalActiveMs = ms(value?.totalActiveMs);
  const scale = Number.isFinite(value?.scale) ? value.scale : campaignHouseScale(house);
  return {
    block, house, scale,
    activeMs,
    // A total below the winning attempt is incoherent; trust the winning one.
    totalActiveMs: totalActiveMs === null ? activeMs : Math.max(totalActiveMs, activeMs),
    attempts: Math.max(1, posInt(value?.attempts) || 1),
    deaths: nonNeg(value?.deaths),
    hits: nonNeg(value?.hits),
    bunk: Boolean(value?.bunk),
    at: nonNeg(value?.at)
  };
}

export function createSkillEvidence(value = {}) {
  const list = Array.isArray(value?.observations) ? value.observations : [];
  const seen = new Set();
  const observations = list
    .map(cleanObservation)
    .filter(Boolean)
    .filter(o => { const id = o.block + ':' + o.house; return !seen.has(id) && seen.add(id); })
    .sort((a, b) => a.block - b.block || a.house - b.house)
    .slice(-SKILL_MAX_OBSERVATIONS);
  return { version: SKILL_EVIDENCE_VERSION, observations };
}

/**
 * Record one cleared house. A house already recorded for that block is kept as
 * it was: the first clear is the observation, and a later replay of the same
 * house cannot overwrite it with a faster or slower number.
 */
export function recordHouseObservation(value, observation) {
  const state = createSkillEvidence(value);
  const entry = cleanObservation(observation);
  if (!entry) return { state, applied: false, reason: 'invalid' };
  if (state.observations.some(o => o.block === entry.block && o.house === entry.house)) {
    return { state, applied: false, reason: 'already-observed' };
  }
  return { state: createSkillEvidence({ observations: [...state.observations, entry] }), applied: true, reason: null };
}

/**
 * How much evidence there is, said plainly.
 *
 * `blocksCompleted` counts blocks with all fifteen houses observed — the unit
 * the unlock is written in. `expected` is what three full blocks would give.
 * Nothing here fills a gap: a save that cleared blocks before this record
 * existed reports its real, smaller numbers.
 */
export function skillCoverage(value) {
  const { observations } = createSkillEvidence(value);
  const byBlock = new Map();
  for (const o of observations) {
    if (!byBlock.has(o.block)) byBlock.set(o.block, new Set());
    byBlock.get(o.block).add(o.house);
  }
  const blocksCompleted = [...byBlock.values()].filter(houses => houses.size === CAMPAIGN_HOUSES).length;
  const comparable = observations.filter(o => o.house !== DUAL_DEFENDER_HOUSE && comparableScale(o.scale) !== null);
  return {
    observations: observations.length,
    blocksSeen: byBlock.size,
    blocksCompleted,
    comparable: comparable.length,
    expected: CAMPAIGN_HOUSES * 3,
    blocks: [...byBlock.entries()].map(([block, houses]) => ({ block, houses: houses.size })).sort((a, b) => a.block - b.block)
  };
}

/** Median without mutating the caller's array. Null for an empty list. */
export function median(values) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * The player's measured play, grouped by the scale it was measured at, so a
 * caller can compare each group against bot houses generated the same way.
 * House 15 never appears: a second defender is a different game.
 */
export function skillSamples(value) {
  const { observations } = createSkillEvidence(value);
  const groups = new Map();
  for (const o of observations) {
    if (o.house === DUAL_DEFENDER_HOUSE) continue;
    const scale = comparableScale(o.scale);
    if (scale === null) continue;
    if (!groups.has(scale)) groups.set(scale, []);
    groups.get(scale).push(o);
  }
  const byScale = {};
  for (const [scale, list] of groups) {
    byScale[scale] = {
      scale, houses: list.length,
      clearMs: median(list.map(o => o.activeMs)),
      totalMs: median(list.map(o => o.totalActiveMs)),
      attempts: list.reduce((n, o) => n + o.attempts, 0),
      deaths: list.reduce((n, o) => n + o.deaths, 0),
      hits: list.reduce((n, o) => n + o.hits, 0)
    };
  }
  const all = observations.filter(o => o.house !== DUAL_DEFENDER_HOUSE);
  return {
    byScale,
    houses: all.length,
    clearMs: median(all.map(o => o.activeMs)),
    totalMs: median(all.map(o => o.totalActiveMs)),
    deaths: all.reduce((n, o) => n + o.deaths, 0),
    attempts: all.reduce((n, o) => n + o.attempts, 0),
    firstTry: all.filter(o => o.attempts === 1).length
  };
}
