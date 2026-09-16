import { RIVAL_RULES_VERSION, rivalPathSteps, simulatedRivalTimes, newRivalRace, rivalPoolCourse, rivalPoolEntryBySeed, nextRivalSlot, validRivalPowers } from '../logic/rivals.js';
import { validateRivalRunRecord, rivalRecordMatchesCourse, validateRivalReplayBundle, RIVAL_MAX_BUNDLE_BYTES } from '../logic/rivalRecords.js';
import { validateReplaySegment } from '../logic/rivalReplay.js';
import { chooseRivalOpponent, rivalTierForHistory } from '../logic/rivalPresets.js';
import { generateSquareMaze } from './mazeGenerator.js';
import { createSeededRNG } from './seededRandom.js';
import { getUserID } from './userManager.js';

// Course selection is the fixed pool only. A random seed here would race the
// player on a course no opponent was ever recorded on. Rematch passes the seed
// it just raced (kept if it is a pool course); New Race passes the next slot;
// the menu passes nothing and the rotation continues from the last local result.
export function selectRivalCourse({ seed, slot } = {}) {
  const bySeed = Number.isFinite(seed) ? rivalPoolEntryBySeed(seed) : null;
  if (bySeed) return rivalPoolCourse(bySeed.slot);
  const wanted = rivalPoolCourse(slot);
  if (wanted) return wanted;
  return rivalPoolCourse(nextRivalSlot(lastRivalSlot()));
}
export function lastRivalSlot() {
  try {
    const history = JSON.parse(localStorage.getItem(historyKey()) || '[]');
    return Array.isArray(history) ? history.find(r => Number.isFinite(r?.courseSlot))?.courseSlot ?? null : null;
  } catch { return null; }
}
const historyKey = () => 'pr_rivals_results_v1_' + getUserID();

export function createRivalSession(selection = {}) {
  const course = selectRivalCourse(selection);
  if (!course) throw new Error('No enabled Rival course');
  const metrics = course.seeds.map((houseSeed,i) => {
    const arena = generateSquareMaze(course.cols,course.rows,{
      rng:createSeededRNG(houseSeed),role:'runner',clusterScale:course.scales[i]
    });
    const primary = arena.objectives.stash, secondary = arena.objectives.extract;
    // Match BaseGameScene's real/bunk assignment. Simulate searching the primary
    // pocket first; the pace includes a detour if that pocket is bunk.
    const realAtPrimary = createSeededRNG(houseSeed ^ 0xC0FFEE)() < 0.5;
    const real = realAtPrimary ? primary : secondary;
    const searchSteps = rivalPathSteps(arena.grid,arena.spawns.runner,primary) +
      (realAtPrimary ? 0 : rivalPathSteps(arena.grid,primary,secondary));
    return { searchSteps, carrySteps:rivalPathSteps(arena.grid,real,arena.egress.entry) };
  });
  const hardLimitMs = Number.isFinite(selection.hardLimitMs) && selection.hardLimitMs > 0 ? selection.hardLimitMs : 0;
  // Recording mode: the bot must not be able to lose to an opponent, so the
  // placeholder opponent finishes only after the hard limit would have ended
  // the race. Nothing about it is shown as a rival.
  const times = selection.recording
    ? Array.from({ length: 7 }, (_, i) => (hardLimitMs || 3_600_000) + 1000 * (i + 1))
    : simulatedRivalTimes(metrics,course.seed);
  const race = newRivalRace(course,times);
  // Explicit harness options only. fixedPowers replaces the picker with
  // the given ordered pair; hardLimitMs ends a race that will never finish.
  race.fixedPowers = validRivalPowers(selection.powers) ? selection.powers.slice() : null;
  race.hardLimitMs = hardLimitMs;
  race.recording = !!selection.recording;
  race.wantRecordingID = typeof selection.recordingID === 'string' ? selection.recordingID : null;
  race.opponentResolved = race.recording;
  return race;
}

// ---------------------------------------------------------------------------
// Recorded opponents: static JSON under /rivals/v2/, served by Vite/Netlify.
// One small per-course file is fetched at race creation; a replay bundle is
// prefetched for pickup progress, then reused by Watch Rival Replay. Every payload is validated
// as corruption checking; a failure leaves the race on the labeled simulated
// pace rather than presenting anything as a recording.
// ---------------------------------------------------------------------------
export const RIVALS_ASSET_ROOT = '/rivals/v2/';
const FETCH_TIMEOUT_MS = 3500;
const opponentCache = new Map();
async function fetchJSON(url, { timeoutMs = FETCH_TIMEOUT_MS, maxBytes = 512 * 1024 } = {}) {
  if (typeof fetch !== 'function') throw new Error('fetch unavailable');
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl?.signal, cache: 'default' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    if (text.length > maxBytes) throw new Error('payload too large');
    return JSON.parse(text);
  } finally { clearTimeout(timer); }
}
/** Valid, course-matching records for a course. Empty on any failure. */
export async function loadRivalOpponents(course) {
  if (!course?.id) return [];
  if (opponentCache.has(course.id)) return opponentCache.get(course.id);
  const task = (async () => {
    try {
      const data = await fetchJSON(RIVALS_ASSET_ROOT + 'courses/' + encodeURIComponent(course.id) + '/opponents.json');
      if (data?.schemaVersion !== 1 || data.rulesVersion !== RIVAL_RULES_VERSION || !Array.isArray(data.opponents)) return [];
      // Each entry is { record, replay }: the record is hashed as recorded and
      // must not be decorated, so the replay path travels beside it.
      return data.opponents
        .filter(e => e && validateRivalRunRecord(e.record).ok && rivalRecordMatchesCourse(e.record, course, RIVAL_RULES_VERSION)
          && e.record.opponent?.kind === 'bot' && (e.replay == null || typeof e.replay === 'string'))
        .map(e => ({ record: e.record, replay: e.replay ?? null }));
    } catch (e) {
      console.warn('[Rivals] opponents unavailable for', course.id, e?.message || e);
      return [];
    }
  })();
  opponentCache.set(course.id, task);
  return task;
}
function rivalHistory() {
  try { const h = JSON.parse(localStorage.getItem(historyKey()) || '[]'); return Array.isArray(h) ? h : []; } catch { return []; }
}
/**
 * Replace the simulated pace with a recorded bot when one is eligible. Returns
 * null synchronously when there is nothing to do (already resolved, or a
 * recording run), otherwise a promise that settles once the race is final.
 * The race object is mutated in place before the countdown can start.
 */
export function resolveRivalOpponent(race) {
  if (!race || race.opponentResolved || race.status !== 'ready') return null;
  race.opponentResolved = true;
  return loadRivalOpponents(race.course).then(entries => {
    if (!entries.length || race.status !== 'ready') return false;
    const history = rivalHistory();
    const played = history.filter(r => r?.courseID === race.course.id).length;
    const pick = chooseRivalOpponent(entries.map(e => e.record), {
      recordingID: race.wantRecordingID,
      tier: rivalTierForHistory(history, race.course.id),
      salt: getUserID() + '/' + race.course.id + '/' + played
    });
    if (!pick) return false;
    const replay = entries.find(e => e.record === pick)?.replay ?? null;
    race.rivalTimes = pick.clearTimes.slice();
    race.opponentKind = 'recorded-bot';
    race.opponentRecord = pick;
    race.opponent = {
      recordingID: pick.recordingID, kind: pick.opponent.kind, displayName: pick.opponent.displayName,
      skillPreset: pick.opponent.skillPreset, retries: pick.retries, elapsedMs: pick.elapsedMs,
      orderedPowers: pick.orderedPowers.slice(), replayURL: replay ? RIVALS_ASSET_ROOT + replay : null
    };
    // Keep their ordered powers on opponent metadata only. The live runner
    // chooses a separate mix; never mutate hashed bank records to match it.
    return true;
  }).catch(e => { console.warn('[Rivals] opponent resolution failed', e); return false; });
}
/** Validate once per race. Cache state survives the shallow copy on a clear. */
export async function loadRivalReplay(race) {
  const url=race?.opponent?.replayURL, record=race?.opponentRecord;
  if (!url || !record) return null;
  const cache=race.replayCache || (race.replayCache={bundle:null,pending:null});
  if (cache.bundle) return cache.bundle;
  if (cache.pending) return cache.pending;
  cache.pending=(async()=>{
    try {
      const bundle=await fetchJSON(url,{timeoutMs:12000,maxBytes:RIVAL_MAX_BUNDLE_BYTES});
      const check=validateRivalReplayBundle(bundle,record,{validateSegment:validateReplaySegment});
      if(!check.ok) { console.warn('[Rivals] replay rejected:',check.errors[0]); return null; }
      cache.bundle=bundle;
      return bundle;
    } catch(e) {
      console.warn('[Rivals] replay unavailable',e?.message || e);
      return null;
    } finally { cache.pending=null; }
  })();
  return cache.pending;
}

// Keep evidence locally for future ghost ingestion. No leaderboard/reward writes.
// This is not a public opponent pool, account sync or anti-cheat validation.
export function saveRivalResult(result, record, runRecord = null) {
  try {
    const key = historyKey();
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    const history = Array.isArray(stored) ? stored : [];
    history.unshift({ savedAt:Date.now(), ...result, record, runRecord });
    localStorage.setItem(key,JSON.stringify(history.slice(0,20)));
    return true;
  } catch (error) { console.warn('[Rivals] Result could not be saved',error); return false; }
}
