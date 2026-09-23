import { getRivalTerritory } from './rivalCityProgress.js';
import { rivalDistrict } from '../logic/rivalCity.js';
import { getWindowState } from './windowProgress.js';
import { RIVAL_RULES_VERSION, rivalPathSteps, simulatedRivalTimes, newRivalRace, rivalPoolCourse, rivalPoolEntryBySeed, randomRivalSlot, validRivalPowers, rivalSessionPocket, newRivalStashSeed, rivalRecordMatchesStashes, rivalHouseMazeOptions, enabledRivalCourses } from '../logic/rivals.js';
import { matchQuality } from '../logic/rivalMatchmaking.js';
import { validateRivalRunRecord, rivalRecordMatchesCourse, validateRivalReplayBundle, RIVAL_MAX_BUNDLE_BYTES } from '../logic/rivalRecords.js';
import { validateReplaySegment } from '../logic/rivalReplay.js';
import { chooseRivalOpponent, rivalTierForHistory } from '../logic/rivalPresets.js';
import { recordBenchmark, playerSkill, chooseCalibratedOpponent, adaptSkill } from '../logic/rivalSkill.js';
import { getSkillSamples } from './skillEvidence.js';
import { generateSquareMaze } from './mazeGenerator.js';
import { createSeededRNG } from './seededRandom.js';
import { getUserID } from './userManager.js';

// Course selection is the fixed pool only. A random seed here would race the
// player on a course no opponent was ever recorded on. An explicit seed or slot
// (tools, tests) is kept if it is a pool course; otherwise a random one. A
// territory match starts on its block's course (createRivalSession).
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
  // A territory match starts on its block's own course; the lobby then offers
  // the maps the found rival has actually raced (findRivalMatch), and a win on
  // any of them claims this block (territorySlot below).
  const course = territoryMode && selection.seed == null && selection.slot == null
    ? rivalPoolCourse(district.slot) ?? selectRivalCourse(selection)
    : selectRivalCourse(selection);
  if (!course) throw new Error('No enabled Rival course');
  const stashSeed = Number.isInteger(selection.stashSeed)
    ? selection.stashSeed >>> 0 : newRivalStashSeed();
  const metrics = course.seeds.map((houseSeed,i) => {
    const o = rivalHouseMazeOptions(course,i);
    const arena = generateSquareMaze(o.cols,o.rows,{
      rng:createSeededRNG(houseSeed),role:'runner',clusterScale:o.clusterScale,layout:o.layout
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
  // An explicit stash seed (a test or a harness) is kept; otherwise the
  // match takes its rival's seed once one is chosen (resolveRivalOpponent).
  race.stashSeedFixed = Number.isInteger(selection.stashSeed);
  race.wantRecordingID = typeof selection.recordingID === 'string' ? selection.recordingID : null;
  race.opponentResolved = race.recording;
  // Which opponents this match may meet. Ordinary matchmaking unless a
  // challenge pool is named explicitly; never both.
  race.pool = rivalPoolName(selection.pool);
  if(territoryMode){race.rivalCityIndex=district.index;race.territoryIndex=selection.seed==null&&selection.slot==null?district.index:null;
    race.territorySlot=district.slot;
    race.territoryGang=getWindowState().gangID||null;race.territoryUser=getUserID();}
  return race;
}

// ---------------------------------------------------------------------------
// Recorded opponents: static JSON per bank and course, served by
// Vite/Netlify. A POOL is the set of banks one kind of match may draw from:
//   ordinary    /rivals/v2/ (the style bots) and /rivals/jev-v1/ (normal Jev)
//   rival-hard  /rivals/jev-rival-hard-v1/   (challenge; named explicitly)
//   apex        /rivals/jev-apex-v1/         (challenge; named explicitly)
// Pools never mix. A real player's races would be one more bank with
// `human: true`, met through the same match flow.
//
// LOOK FOR MATCH finds a rival first (findRivalMatch): it loads a few
// candidate courses, picks one rival identity by measured pace, and offers
// only the courses that rival has valid races on, each with its concrete
// record already chosen. READY applies that record (applyRivalOffer). The
// recording harness and tools still use resolveRivalOpponent, which picks
// one record for the race's own course.
//
// A replay bundle is prefetched for pickup progress, then reused by Watch
// Rival. Every payload is validated as corruption checking; a failure never
// presents anything as a recording.
// ---------------------------------------------------------------------------
export const RIVALS_ASSET_ROOT = '/rivals/v2/';
export const JEV_ASSET_ROOT = '/rivals/jev-v1/';
export const RIVAL_OPPONENT_POOLS = Object.freeze({
  ordinary: Object.freeze([
    Object.freeze({ root: RIVALS_ASSET_ROOT, jev: false }),
    Object.freeze({ root: JEV_ASSET_ROOT, jev: true })
  ]),
  'rival-hard': Object.freeze([Object.freeze({ root: '/rivals/jev-rival-hard-v1/', jev: true })]),
  apex: Object.freeze([Object.freeze({ root: '/rivals/jev-apex-v1/', jev: true })])
});
export function rivalPoolName(name) {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(RIVAL_OPPONENT_POOLS, name) ? name : 'ordinary';
}
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
/**
 * Who a record belongs to, as the player would meet them. Every Jev race in a
 * bank is one rival (that bank's Jev); a player is their account id; a style
 * bot is its style name.
 */
export function rivalIdentity(entry) {
  const record = entry?.record, name = rivalOpponentName(record);
  if (isJevRecord(record)) return { key: 'jev@' + (entry?.root || ''), displayName: name, kind: 'jev' };
  if (record?.opponent?.kind === 'human') return { key: 'player:' + (record.opponent.id || name), displayName: name, kind: 'player' };
  return { key: 'style:' + name, displayName: name, kind: 'style' };
}
const FETCH_TIMEOUT_MS = 3500;
// A full course file holds one record per stash pattern (128 for a Jev bank).
const OPPONENTS_MAX_BYTES = 3 * 1024 * 1024;
const opponentCache = new Map();
async function fetchJSON(url, { timeoutMs = FETCH_TIMEOUT_MS, maxBytes = 512 * 1024 } = {}) {
  if (typeof fetch !== 'function') throw new Error('fetch unavailable');
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl?.signal, cache: 'default' });
    if (!res.ok) { const e = new Error('HTTP ' + res.status); e.status = res.status; throw e; }
    const text = await res.text();
    // The site's SPA fallback (netlify.toml, and Vite in development) answers
    // a missing file with index.html and a 200. That is a missing file.
    if (/text\/html/i.test(res.headers?.get?.('content-type') || '') || /^\s*</.test(text)) {
      const e = new Error('not found (HTML fallback)'); e.status = 404; throw e;
    }
    if (text.length > maxBytes) throw new Error('payload too large');
    return JSON.parse(text);
  } finally { clearTimeout(timer); }
}
/**
 * One bank's valid, course-matching entries for a course. A missing file is
 * an empty list; any other failure is reported so it is not cached.
 */
async function loadBankOpponents(course, bank) {
  try {
    const data = await fetchJSON(bank.root + 'courses/' + encodeURIComponent(course.id) + '/opponents.json', { maxBytes: OPPONENTS_MAX_BYTES });
    if (data?.schemaVersion !== 1 || data.rulesVersion !== RIVAL_RULES_VERSION || !Array.isArray(data.opponents)) return { entries: [], failed: false };
    // Each entry is { record, replay }: the record is hashed as recorded and
    // must not be decorated, so the replay path travels beside it.
    const entries = data.opponents
      .filter(e => e && validateRivalRunRecord(e.record).ok && rivalRecordMatchesCourse(e.record, course, RIVAL_RULES_VERSION)
        && e.record.opponent?.kind === (bank.human ? 'human' : 'bot') && (e.replay == null || typeof e.replay === 'string')
        // Each bank holds only its own kind: a Jev race in the style bank, or
        // a style bot in the Jev bank, is a mis-assembled file, not an opponent.
        && isJevRecord(e.record) === !!bank.jev)
      .map(e => ({ record: e.record, replay: e.replay ?? null, root: bank.root }));
    return { entries, failed: false };
  } catch (e) {
    // A course a bank has no races for has no file there; that is normal.
    if (e?.status !== 404) console.warn('[Rivals] opponents unavailable for', course.id, e?.message || e);
    return { entries: [], failed: e?.status !== 404 };
  }
}
/** Valid, course-matching records for a course, from every bank in the pool. */
export async function loadRivalOpponents(course, pool = 'ordinary') {
  if (!course?.id) return [];
  const name = rivalPoolName(pool), key = name + '|' + course.id;
  if (opponentCache.has(key)) return opponentCache.get(key);
  const task = Promise.all(RIVAL_OPPONENT_POOLS[name].map(bank => loadBankOpponents(course, bank)))
    .then(lists => {
      // A network failure is not the answer for the rest of the session: the
      // next search asks again.
      if (lists.some(l => l.failed)) opponentCache.delete(key);
      // One recordingID, one opponent, whichever bank it came from first.
      const seen = new Set();
      return lists.flatMap(l => l.entries).filter(e => !seen.has(e.record.recordingID) && seen.add(e.record.recordingID));
    });
  opponentCache.set(key, task);
  return task;
}
function rivalHistory() {
  try { const h = JSON.parse(localStorage.getItem(historyKey()) || '[]'); return Array.isArray(h) ? h : []; } catch { return []; }
}
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

/**
 * The records a match may meet on `course`. A recorded rival races the same
 * seven answers as the player. A match whose seed was chosen explicitly can
 * only meet rivals recorded on those answers; any other match adopts the
 * chosen rival's seed before its first house starts
 * (BaseGameScene.realignRivalStash), so the whole bank is eligible and which
 * bag is real still changes from match to match. Legacy records without
 * match stash rules never qualify.
 */
export function eligibleRivalEntries(entries, { course, stashSeed, stashSeedFixed = false } = {}) {
  const all = Array.isArray(entries) ? entries : [];
  if (!Number.isInteger(stashSeed)) return all;
  const matchRecords = all.filter(e => e.record?.stashRules === 'match-v1' && Number.isInteger(e.record.stashSeed));
  return stashSeedFixed ? matchRecords.filter(e => rivalRecordMatchesStashes(e.record, { course, stashSeed })) : matchRecords;
}

// Pair on measured seconds per house, not on a preset's name. The player's
// number comes from campaign houses generated at the same maze scales as the
// course's houses; each candidate's number comes from its own recorded
// attempts. Falls back to the old tier ladder only if nothing is measurable.
function measuredSkill() {
  try { return playerSkill(getSkillSamples()); } catch (error) { console.warn('[Rivals] calibration unavailable', error); return null; }
}
function pickRivalEntry(course, entries, { wantRecordingID = null, history = [], skill = null, salt = '' } = {}) {
  const played = history.filter(r => r?.courseID === course.id).length;
  const seed = getUserID() + '/' + course.id + '/' + played + (salt ? '/' + salt : '');
  let pick = null, estimate = null;
  if (skill) {
    try {
      estimate = rivalEstimate(course.id, skill.clearMs);
      const candidates = entries.map(e => ({
        recordingID: e.record.recordingID, record: e.record,
        benchmark: recordBenchmark(e.record, course.scales, skill.scales)
      }));
      pick = chooseCalibratedOpponent(candidates, {
        recordingID: wantRecordingID, targetMs: estimate,
        recent: history.filter(r => r?.courseID === course.id).slice(0, 4).map(r => r?.recordingID).filter(Boolean),
        salt: seed
      })?.record ?? null;
    } catch (error) { console.warn('[Rivals] calibration unavailable', error); }
  }
  if (!pick) pick = chooseRivalOpponent(entries.map(e => e.record), {
    recordingID: wantRecordingID, tier: rivalTierForHistory(history, course.id), salt: seed
  });
  const entry = pick ? entries.find(e => e.record === pick) : null;
  return entry ? { entry, estimate } : null;
}

/**
 * Race `race` against one recorded entry: its times, its replay and, unless
 * the match's seed was fixed, its stash seed. The bank record is kept as
 * recorded; its ordered powers stay on opponent metadata and never become
 * the player's.
 */
function adoptRivalEntry(race, entry, displayName = rivalOpponentName(entry.record)) {
  const pick = entry.record;
  if (!race.stashSeedFixed && Number.isInteger(race.stashSeed) && Number.isInteger(pick.stashSeed) &&
      pick.stashRules === 'match-v1' && race.status === 'ready') {
    race.stashSeed = pick.stashSeed >>> 0;
  }
  race.rivalTimes = pick.clearTimes.slice();
  // Any recorded run, whoever ran it: the HUD, pickup progress and Watch
  // Rival all key on this.
  race.opponentKind = 'recorded-bot';
  race.opponentRecord = pick;
  race.opponent = {
    recordingID: pick.recordingID, kind: pick.opponent.kind, displayName,
    skillPreset: pick.opponent.skillPreset, retries: pick.retries, elapsedMs: pick.elapsedMs,
    orderedPowers: pick.orderedPowers.slice(),
    replayURL: entry.replay ? (entry.root || RIVALS_ASSET_ROOT) + entry.replay : null,
    // Kept for adaptation after the race. Not shown to the player.
    benchmarkMs: recordBenchmark(pick, race.course.scales)?.clearMs ?? null
  };
  race.opponentResolved = true;
}

/**
 * Tools and the recording harness: replace the simulated pace with a
 * recorded opponent on the race's own course when one is eligible. Returns
 * null synchronously when there is nothing to do (already resolved, or a
 * recording run), otherwise a promise that settles once the race is final.
 */
export function resolveRivalOpponent(race) {
  if(race?.opponentPending)return race.opponentPending;
  if (!race || race.opponentResolved || race.status !== 'ready') return null;
  race.opponentResolved = true;
  const pending=loadRivalOpponents(race.course, race.pool).then(allEntries => {
    const entries = eligibleRivalEntries(allEntries, race);
    if (!entries.length || race.status !== 'ready') return false;
    const skill = measuredSkill();
    const chosen = pickRivalEntry(race.course, entries, { wantRecordingID: race.wantRecordingID, history: rivalHistory(), skill });
    if (!chosen) return false;
    if (skill) race.playerSkill = { clearMs: skill.clearMs, estimateMs: chosen.estimate, provisional: skill.provisional, houses: skill.houses };
    adoptRivalEntry(race, chosen.entry);
    return true;
  }).catch(e => { console.warn('[Rivals] opponent resolution failed', e); return false; });
  race.opponentPending=pending;
  pending.then(()=>{if(race.opponentPending===pending)race.opponentPending=null;});
  return pending;
}

// How many maps a match offers: the block's own course and a few others.
export const RIVAL_MATCH_COURSES = 4;
/** The courses a search looks at: this race's course first, then random others. */
export function rivalMatchCourses(race, { random = Math.random, count = RIVAL_MATCH_COURSES } = {}) {
  const out = [race.course];
  const rest = enabledRivalCourses().map(c => c.slot).filter(slot => slot !== race.course.slot);
  while (out.length < count && rest.length) {
    const slot = rest.splice(Math.min(rest.length - 1, Math.floor(random() * rest.length)), 1)[0];
    const course = rivalPoolCourse(slot);
    if (course) out.push(course);
  }
  return out;
}

/**
 * LOOK FOR MATCH. Finds one rival and the courses they can race, without
 * touching the race: resolves to a match, or null when nobody eligible was
 * found. A match is
 *   { id, pool, identity: { key, displayName, kind }, offers: [offer...] }
 * and each offer is one course with its concrete record already chosen:
 *   { slot, courseID, name, course, entry, orderedPowers, benchmarkMs, quality }
 * The rival is chosen by measured pace on the first course that has anyone,
 * normally the race's own; only that rival's courses are offered. Nothing
 * here looks at the stash answers beyond eligibility, and nothing about the
 * player's current attempt exists yet.
 */
export async function findRivalMatch(race, { courses = null, random = Math.random } = {}) {
  if (!race?.course) return null;
  const pool = rivalPoolName(race.pool);
  const list = courses || rivalMatchCourses(race, { random });
  const loaded = await Promise.all(list.map(course => loadRivalOpponents(course, pool)
    .catch(() => [])
    .then(all => ({ course, entries: eligibleRivalEntries(all, {
      course, stashSeed: race.stashSeed,
      // An explicit seed binds only the course it was chosen for.
      stashSeedFixed: !!race.stashSeedFixed && course.id === race.course.id
    }) }))));
  const history = rivalHistory(), skill = measuredSkill();
  const salt = String(Math.floor(random() * 0x7fffffff));
  const lead = loaded.find(l => l.entries.length);
  if (!lead) return null;
  const first = pickRivalEntry(lead.course, lead.entries, { wantRecordingID: race.wantRecordingID, history, skill, salt });
  if (!first) return null;
  const identity = rivalIdentity(first.entry);
  const offers = [];
  for (const { course, entries } of loaded) {
    const theirs = entries.filter(e => rivalIdentity(e).key === identity.key);
    if (!theirs.length) continue;
    const chosen = course === lead.course ? first : pickRivalEntry(course, theirs, { history, skill, salt });
    if (!chosen) continue;
    const benchmarkMs = recordBenchmark(chosen.entry.record, course.scales)?.clearMs ?? null;
    offers.push({
      slot: course.slot, courseID: course.id, name: course.name, course, entry: chosen.entry,
      orderedPowers: chosen.entry.record.orderedPowers.slice(), benchmarkMs, estimateMs: chosen.estimate,
      // Measured numbers only; null rather than a guess.
      quality: matchQuality(chosen.estimate, benchmarkMs)
    });
  }
  if (!offers.length) return null;
  return {
    id: pool + '/' + identity.key + '/' + salt, pool, identity, offers,
    playerSkill: skill ? { clearMs: skill.clearMs, provisional: skill.provisional, houses: skill.houses } : null
  };
}

/**
 * READY. The race the match will run on `offer`: the same race when the
 * course is the one already built, otherwise a fresh race on that course that
 * keeps the match's city, territory and pool. Then the offer's record is
 * applied. Returns null if the offer does not belong to the match.
 */
export function applyRivalOffer(race, match, offer) {
  if (!race || race.status !== 'ready' || !match?.offers?.includes(offer)) return null;
  const record = offer.entry?.record;
  if (!record || record.courseID !== offer.course.id || !Array.isArray(record.clearTimes)) return null;
  let target = race;
  if (offer.course.id !== race.course.id) {
    target = newRivalRace(offer.course, record.clearTimes, { stashSeed: race.stashSeed });
    for (const key of ['pool', 'rivalCityIndex', 'territoryIndex', 'territorySlot', 'territoryGang', 'territoryUser',
      'cityIntroShown', 'entryStage', 'match', 'lobby']) if (key in race) target[key] = race[key];
    Object.assign(target, { fixedPowers: null, hardLimitMs: 0, recording: false, stashSeedFixed: false, wantRecordingID: null });
  }
  adoptRivalEntry(target, offer.entry, match.identity.displayName);
  target.opponent.identityKey = match.identity.key;
  target.playerSkill = { ...(match.playerSkill || {}), estimateMs: offer.estimateMs ?? null };
  return target;
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
