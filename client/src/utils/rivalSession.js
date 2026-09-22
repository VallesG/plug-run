import { getRivalTerritory } from './rivalCityProgress.js';
import { rivalDistrict } from '../logic/rivalCity.js';
import { getWindowState } from './windowProgress.js';
import { RIVAL_RULES_VERSION, rivalPathSteps, simulatedRivalTimes, newRivalRace, rivalPoolCourse, rivalPoolEntryBySeed, randomRivalSlot, validRivalPowers, rivalSessionPocket, newRivalStashSeed, rivalRecordMatchesStashes } from '../logic/rivals.js';
import { validateRivalRunRecord, rivalRecordMatchesCourse, validateRivalReplayBundle, RIVAL_MAX_BUNDLE_BYTES } from '../logic/rivalRecords.js';
import { validateReplaySegment } from '../logic/rivalReplay.js';
import { chooseRivalOpponent, rivalTierForHistory } from '../logic/rivalPresets.js';
import { recordBenchmark, playerSkill, chooseCalibratedOpponent, adaptSkill } from '../logic/rivalSkill.js';
import { getSkillSamples } from './skillEvidence.js';
import { generateSquareMaze } from './mazeGenerator.js';
import { createSeededRNG } from './seededRandom.js';
import { getUserID } from './userManager.js';

// Course selection is the fixed pool only. A random seed here would race the
// player on a course no opponent was ever recorded on. Rematch passes the seed
// it just raced (kept if it is a pool course). Ordinary New Race/menu starts
// choose randomly from the enabled pool, independently of territory progress.
export function selectRivalCourse({ seed, slot } = {}) {
  const bySeed = Number.isFinite(seed) ? rivalPoolEntryBySeed(seed) : null;
  if (bySeed) return rivalPoolCourse(bySeed.slot);
  const wanted = rivalPoolCourse(slot);
  if (wanted) return wanted;
  return rivalPoolCourse(randomRivalSlot());
}
export function lastRivalSlot() {
  try {
    const history = JSON.parse(localStorage.getItem(historyKey()) || '[]');
    return Array.isArray(history) ? history.find(r => Number.isFinite(r?.courseSlot))?.courseSlot ?? null : null;
  } catch { return null; }
}
const historyKey = () => 'pr_rivals_results_v1_' + getUserID();

export function createRivalSession(selection = {}) {
  const district=rivalDistrict(getRivalTerritory().completed+1);
  const territoryMode=!selection.recording && !selection.powers;
  const course = selectRivalCourse(selection);
  if (!course) throw new Error('No enabled Rival course');
  const stashSeed = Number.isInteger(selection.stashSeed)
    ? selection.stashSeed >>> 0 : newRivalStashSeed();
  const metrics = course.seeds.map((houseSeed,i) => {
    const arena = generateSquareMaze(course.cols,course.rows,{
      rng:createSeededRNG(houseSeed),role:'runner',clusterScale:course.scales[i]
    });
    const primary = arena.objectives.stash, secondary = arena.objectives.extract;
    // Match BaseGameScene's real/bunk assignment for a first attempt (a
    // simulated pace never retries). Simulate searching the primary pocket
    // first; the pace includes a detour if that pocket is bunk.
    const realAtPrimary = rivalSessionPocket(houseSeed, stashSeed) === 0;
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
  const race = newRivalRace(course,times,{ stashSeed });
  // Explicit harness options only. fixedPowers replaces the picker with
  // the given ordered pair; hardLimitMs ends a race that will never finish.
  race.fixedPowers = validRivalPowers(selection.powers) ? selection.powers.slice() : null;
  race.hardLimitMs = hardLimitMs;
  race.recording = !!selection.recording;
  race.wantRecordingID = typeof selection.recordingID === 'string' ? selection.recordingID : null;
  race.opponentResolved = race.recording;
  if(territoryMode){race.rivalCityIndex=district.index;race.territoryIndex=selection.seed==null&&selection.slot==null?district.index:null;
    race.territorySlot=district.slot;
    race.territoryGang=getWindowState().gangID||null;race.territoryUser=getUserID();}
  return race;
}

// ---------------------------------------------------------------------------
// Recorded opponents: static JSON under /rivals/v2/ (the style bots) and
// /rivals/jev-v1/ (races driven by the Jev strategist), served by
// Vite/Netlify. Both banks feed ONE pool per course, and the same skill
// matching picks from it, so a player meets Jev or a style bot the way they
// would meet anyone. One small per-course file per bank is fetched at race
// creation; a replay bundle is prefetched for pickup progress, then reused by
// Watch Rival Replay. Every payload is validated as corruption checking; a
// failure leaves the race on the labeled simulated pace rather than
// presenting anything as a recording.
// ---------------------------------------------------------------------------
export const RIVALS_ASSET_ROOT = '/rivals/v2/';
export const JEV_ASSET_ROOT = '/rivals/jev-v1/';
const OPPONENT_BANKS = [
  { root: RIVALS_ASSET_ROOT, jev: false },
  { root: JEV_ASSET_ROOT, jev: true }
];
/** A Jev-strategist race, by what its own record says drove it. */
export function isJevRecord(record) {
  return record?.driverConfig?.driver === 'jev-strategist' && !!record.driverConfig.jev;
}
// The name a player sees. Jev races by its own name, like a handle; the
// style bots keep their style names (the HUD strips any BOT/AI prefix).
export const JEV_DISPLAY_NAME = 'Jev';
export function rivalOpponentName(record) {
  return isJevRecord(record) ? JEV_DISPLAY_NAME : (record?.opponent?.displayName ?? 'RIVAL');
}
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
/** One bank's valid, course-matching entries for a course. Empty on any failure. */
async function loadBankOpponents(course, bank) {
  try {
    const data = await fetchJSON(bank.root + 'courses/' + encodeURIComponent(course.id) + '/opponents.json');
    if (data?.schemaVersion !== 1 || data.rulesVersion !== RIVAL_RULES_VERSION || !Array.isArray(data.opponents)) return [];
    // Each entry is { record, replay }: the record is hashed as recorded and
    // must not be decorated, so the replay path travels beside it.
    return data.opponents
      .filter(e => e && validateRivalRunRecord(e.record).ok && rivalRecordMatchesCourse(e.record, course, RIVAL_RULES_VERSION)
        && e.record.opponent?.kind === 'bot' && (e.replay == null || typeof e.replay === 'string')
        // Each bank holds only its own kind: a Jev race in the style bank, or
        // a style bot in the Jev bank, is a mis-assembled file, not an opponent.
        && isJevRecord(e.record) === bank.jev)
      .map(e => ({ record: e.record, replay: e.replay ?? null, root: bank.root }));
  } catch (e) {
    // A course with no Jev race yet has no file there; that is normal.
    if (!bank.jev) console.warn('[Rivals] opponents unavailable for', course.id, e?.message || e);
    return [];
  }
}
/** Valid, course-matching records for a course, from every bank. */
export async function loadRivalOpponents(course) {
  if (!course?.id) return [];
  if (opponentCache.has(course.id)) return opponentCache.get(course.id);
  const task = Promise.all(OPPONENT_BANKS.map(bank => loadBankOpponents(course, bank)))
    .then(lists => {
      // One recordingID, one opponent, whichever bank it came from first.
      const seen = new Set();
      return lists.flat().filter(e => !seen.has(e.record.recordingID) && seen.add(e.record.recordingID));
    });
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
// The working estimate, per course. Seeded from campaign evidence and then
// moved by actual Rivals outcomes — never by what would make the next race
// easier. Its own account-scoped key; losing it falls back to the campaign.
const estimateKey = () => 'pr_rival_skill_v1_' + getUserID();
function readEstimates() {
  try { const v = JSON.parse(localStorage.getItem(estimateKey()) || 'null'); return v && typeof v === 'object' ? v : {}; }
  catch { return {}; }
}
export function rivalEstimate(courseID, campaignMs) {
  const stored = readEstimates()[courseID];
  if (Number.isFinite(stored)) return stored;
  return Number.isFinite(campaignMs) ? campaignMs : null;
}
export function noteRivalOutcome(race, result) {
  try {
    const courseID = race?.course?.id, opponentMs = race?.opponent?.benchmarkMs;
    if (!courseID || !Number.isFinite(opponentMs)) return false;
    const estimates = readEstimates();
    const current = Number.isFinite(estimates[courseID])
      ? estimates[courseID]
      : (Number.isFinite(race?.playerSkill?.estimateMs) ? race.playerSkill.estimateMs : null);
    const next = adaptSkill(current, { opponentMs, result });
    if (!Number.isFinite(next)) return false;
    estimates[courseID] = next;
    localStorage.setItem(estimateKey(), JSON.stringify(estimates));
    return true;
  } catch (error) { console.warn('[Rivals] estimate not updated', error); return false; }
}

export function resolveRivalOpponent(race) {
  if(race?.opponentPending)return race.opponentPending;
  if (!race || race.opponentResolved || race.status !== 'ready') return null;
  race.opponentResolved = true;
  const pending=loadRivalOpponents(race.course).then(allEntries => {
    const entries = Number.isInteger(race.stashSeed)
      ? allEntries.filter(e => rivalRecordMatchesStashes(e.record, race)) : allEntries;
    if (!entries.length || race.status !== 'ready') return false;
    race.searchNames=[...new Set(entries.map(e=>rivalOpponentName(e.record)))];
    const history = rivalHistory();
    const played = history.filter(r => r?.courseID === race.course.id).length;

    // Pair on measured seconds per house, not on a preset's name. The player's
    // number comes from campaign houses generated at the same maze scales as
    // this course's houses; each candidate's number comes from its own recorded
    // attempts. Falls back to the old tier ladder only if nothing is measurable.
    let pick = null, estimate = null;
    try {
      const samples = getSkillSamples();
      const skill = playerSkill(samples);
      estimate = rivalEstimate(race.course.id, skill.clearMs);
      const candidates = entries.map(e => ({
        recordingID: e.record.recordingID, record: e.record,
        benchmark: recordBenchmark(e.record, race.course.scales, skill.scales)
      }));
      pick = chooseCalibratedOpponent(candidates, {
        recordingID: race.wantRecordingID,
        targetMs: estimate,
        recent: history.filter(r => r?.courseID === race.course.id).slice(0, 4).map(r => r?.recordingID).filter(Boolean),
        salt: getUserID() + '/' + race.course.id + '/' + played
      })?.record ?? null;
      race.playerSkill = { clearMs: skill.clearMs, estimateMs: estimate, provisional: skill.provisional, houses: skill.houses };
    } catch (error) {
      console.warn('[Rivals] calibration unavailable', error);
    }
    if (!pick) {
      pick = chooseRivalOpponent(entries.map(e => e.record), {
        recordingID: race.wantRecordingID,
        tier: rivalTierForHistory(history, race.course.id),
        salt: getUserID() + '/' + race.course.id + '/' + played
      });
    }
    if (!pick) return false;
    const chosen = entries.find(e => e.record === pick);
    const replay = chosen?.replay ?? null;
    race.rivalTimes = pick.clearTimes.slice();
    race.opponentKind = 'recorded-bot';
    race.opponentRecord = pick;
    race.opponent = {
      recordingID: pick.recordingID, kind: pick.opponent.kind, displayName: rivalOpponentName(pick),
      skillPreset: pick.opponent.skillPreset, retries: pick.retries, elapsedMs: pick.elapsedMs,
      orderedPowers: pick.orderedPowers.slice(),
      replayURL: replay ? (chosen?.root || RIVALS_ASSET_ROOT) + replay : null,
      // Kept for adaptation after the race. Not shown to the player.
      benchmarkMs: recordBenchmark(pick, race.course.scales)?.clearMs ?? null
    };
    // Keep their ordered powers on opponent metadata only. The live runner
    // chooses a separate mix; never mutate hashed bank records to match it.
    return true;
  }).catch(e => { console.warn('[Rivals] opponent resolution failed', e); return false; });
  race.opponentPending=pending;
  pending.then(()=>{if(race.opponentPending===pending)race.opponentPending=null;});
  return pending;
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
