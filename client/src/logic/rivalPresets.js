// Bot opponent tiers and opponent selection. Pure: no imports.
//
// A preset is a named BotDriver configuration. The names are honest about
// what they are (a bot at a skill setting), and the record's opponent block
// carries the preset and driver version so a recording can be retired the
// day the driver changes. A tier is a pool to draw from; how fast a given
// recording actually was is on the record (elapsedMs, retries) and shown to
// the player. Nothing here claims a tier is faster.
//
// WHY ACE IS NOT "aiLevel 20"
// The first bank tried Ace as the sweep bot (aiLevel 20, full cover routing).
// It forfeited every race at 3/7: on Low End Rush house 4 it died 55-72 times
// in a row, ~5.4s each, identical tick counts. applyRunnerProgression zeroes
// wander/hesitation from level 6 up, so a high-level runner takes the same
// route every retry and walks into the same lane; level 5 keeps 6%/5%
// imperfection and breaks the loop. Measured on that house: level 20 with
// Street knobs 5/7 in 6 min, level 8 with Hustler knobs 3/7 (47 deaths),
// level 5 with Hustler knobs 7/7 in 3:34. So Ace is level 5 with the
// evasion layers on, and the level knob is a route-variety knob, not skill.
export const RIVAL_BOT_DRIVER_VERSION = 'botdriver-v2';
export const RIVAL_SKILL_PRESETS = Object.freeze({
  // Street: the shipped runner AI at a low level, no exposure awareness. It
  // routes by path length alone and walks down firing lanes, which is what a
  // first-week player does too.
  street:  Object.freeze({ key: 'street',  label: 'Street',  tier: 1, aiLevel: 5,  coverPenalty: 0, phaseEscapeCells: 0, dangerCells: 5 }),
  // Hustler: mid-level AI with cover routing and a phase escape. Deterministic
  // routing from level 6 up; it cleared 5 of its first 6 races.
  hustler: Object.freeze({ key: 'hustler', label: 'Hustler', tier: 2, aiLevel: 12, coverPenalty: 3, phaseEscapeCells: 7, dangerCells: 6 }),
  // Ace: route variety of level 5 plus the evasion layers (see above).
  ace:     Object.freeze({ key: 'ace',     label: 'Ace',     tier: 3, aiLevel: 5,  coverPenalty: 3, phaseEscapeCells: 7, dangerCells: 6 })
});

// DRIVER STYLES — how a bot plays, which is NOT how good it turns out to be.
//
// A style is a set of BotDriver knobs and a default ordered power mix. The
// band a recording lands in is measured afterwards from its actual elapsed
// time on that course (see rivalBands.js); nothing here claims a ranking.
// Every style drives through the same InputIntent path a player uses, sees
// only what a runner can see, and gets no immunity, teleport or stash
// knowledge. They differ in attention, caution and which power they lean on.
//
// WHY EVERY aiLevel IS 5 OR LOWER
// From level 6 up, applyRunnerProgression zeroes wander and hesitation, so the
// borrowed runner AI repeats an identical fatal route every retry and a race
// never finishes (measured: 55-72 identical deaths on one house). Weakness is
// therefore expressed with wander, hesitation and missing evasion layers, not
// by turning the level knob down from a high number that cannot finish.
export const RIVAL_DRIVER_STYLES = Object.freeze({
  rookie: Object.freeze({
    key: 'rookie', label: 'Rookie', tier: 1,
    note: 'First-week player: wanders, hesitates, walks down firing lanes.',
    aiLevel: 2, wrongTurnChance: 0.2, hesitateChance: 0.12,
    coverPenalty: 0, phaseEscapeCells: 0, dangerCells: 4,
    mixes: [['phase', 'dash'], ['dash', 'dash'], ['phase', 'phase']]
  }),
  erratic: Object.freeze({
    key: 'erratic', label: 'Erratic', tier: 1,
    note: 'Inconsistent: good stretches then a bad decision under pressure.',
    aiLevel: 3, wrongTurnChance: 0.26, hesitateChance: 0.16,
    coverPenalty: 2, phaseEscapeCells: 5, dangerCells: 5,
    mixes: [['dash', 'phase'], ['decoy', 'dash'], ['phase', 'dash']]
  }),
  cautious: Object.freeze({
    key: 'cautious', label: 'Cautious', tier: 2,
    note: 'Refuses open lanes, takes the long way, survives but loses time.',
    aiLevel: 5, wrongTurnChance: 0.05, hesitateChance: 0.06,
    coverPenalty: 9, coverCarryMul: 2.4, phaseEscapeCells: 9, dangerCells: 9,
    dodgeCommitMs: 300, dodgeRestMs: 420,
    mixes: [['phase', 'phase'], ['phase', 'decoy'], ['decoy', 'phase']]
  }),
  ghost: Object.freeze({
    key: 'ghost', label: 'Ghost', tier: 2,
    note: 'Phase specialist: spends walls to leave a lane instead of running it.',
    aiLevel: 5, wrongTurnChance: 0.06, hesitateChance: 0.04,
    coverPenalty: 4, phaseEscapeCells: 11, phaseMaxWall: 3, dangerCells: 8,
    mixes: [['phase', 'phase'], ['phase', 'dash']]
  }),
  dasher: Object.freeze({
    key: 'dasher', label: 'Dasher', tier: 2,
    note: 'Straight-line bursts, less patience for cover.',
    aiLevel: 5, wrongTurnChance: 0.07, hesitateChance: 0.03,
    coverPenalty: 1, phaseEscapeCells: 0, dangerCells: 6, dodgeCommitMs: 160,
    mixes: [['dash', 'dash'], ['dash', 'phase']]
  }),
  trickster: Object.freeze({
    key: 'trickster', label: 'Trickster', tier: 2,
    note: 'Leans on Decoy. Whether the double actually pulls fire is measured, not claimed.',
    aiLevel: 5, wrongTurnChance: 0.08, hesitateChance: 0.05,
    coverPenalty: 3, phaseEscapeCells: 6, dangerCells: 7,
    mixes: [['decoy', 'decoy'], ['decoy', 'dash'], ['decoy', 'phase']]
  }),
  balanced: Object.freeze({
    key: 'balanced', label: 'Balanced', tier: 2,
    note: 'Mixed powers, moderate caution. The middle of the pool.',
    aiLevel: 5, wrongTurnChance: 0.09, hesitateChance: 0.05,
    coverPenalty: 4, phaseEscapeCells: 7, dangerCells: 6,
    mixes: [['phase', 'dash'], ['dash', 'phase'], ['decoy', 'dash'], ['phase', 'decoy']]
  }),
  sharp: Object.freeze({
    key: 'sharp', label: 'Sharp', tier: 3,
    note: 'Low error rate with every evasion layer on. The strong end of the pool.',
    aiLevel: 5, wrongTurnChance: 0.03, hesitateChance: 0.02,
    coverPenalty: 6, coverCarryMul: 2, phaseEscapeCells: 9, dangerCells: 8,
    dodgeCommitMs: 200, dodgeMaxMs: 1100,
    mixes: [['phase', 'dash'], ['dash', 'dash'], ['phase', 'phase']]
  })
});

/** The BotDriver knobs for a style or a legacy preset. Null if unknown. */
export function rivalDriverKnobs(key) {
  const style = RIVAL_DRIVER_STYLES[String(key || '').toLowerCase()];
  if (style) {
    const { key: _k, label: _l, tier: _t, note: _n, mixes: _m, ...knobs } = style;
    return knobs;
  }
  const preset = rivalPreset(key);
  if (!preset) return null;
  return {
    aiLevel: preset.aiLevel, coverPenalty: preset.coverPenalty,
    phaseEscapeCells: preset.phaseEscapeCells, dangerCells: preset.dangerCells
  };
}
/** Ordered power mixes a style is recorded with, including duplicates. */
export function rivalStyleMixes(key) {
  const style = RIVAL_DRIVER_STYLES[String(key || '').toLowerCase()];
  return style ? style.mixes.map(m => m.slice()) : [];
}
export function rivalStyle(key) {
  return RIVAL_DRIVER_STYLES[String(key || '').toLowerCase()] ?? null;
}

const ALIASES = { bronze: 'street', silver: 'hustler', gold: 'ace', easy: 'street', medium: 'hustler', hard: 'ace' };
export function rivalPreset(name) {
  const key = String(name || '').toLowerCase();
  // Styles resolve here too: a recording's skillPreset is the style it was
  // driven with, and the bank contract validates that field.
  return RIVAL_SKILL_PRESETS[ALIASES[key] ?? key] ?? RIVAL_DRIVER_STYLES[key] ?? null;
}
export function rivalPresetByTier(tier) {
  return Object.values(RIVAL_SKILL_PRESETS).find(p => p.tier === tier) ?? null;
}
/**
 * How a style bot is labelled. Never a person's name: the style is the name.
 * Jev is the one opponent shown by a name, because Jev IS its name — see
 * rivalOpponentName in utils/rivalSession.js.
 */
export function rivalBotDisplayName(presetKey) {
  const p = rivalPreset(presetKey);
  return 'BOT · ' + (p ? p.label : 'Unknown');
}
export function rivalOpponentLabel(opponent) {
  if (!opponent) return 'AI PACE';
  if (opponent.kind === 'bot') return 'AI RIVAL';
  return 'RIVAL';
}
/** Ladder: the tier a player faces on a course, from local wins there. */
export function rivalTierForHistory(history, courseID) {
  const onCourse = (history || []).filter(r => r && r.courseID === courseID && r.opponentKind === 'recorded-bot');
  const wins = onCourse.filter(r => r.result === 'win').length;
  const losses = onCourse.filter(r => r.result === 'loss').length;
  return Math.max(1, Math.min(3, 1 + wins - Math.floor(losses / 3)));
}
// The first bank records one fixed ordered loadout per course and preset, and
// players choose their own mix independently. Phase and dash
// only: the shipped runner AI spends those well; decoy is left for a later
// bank once its use by the bot has been watched.
const BANK_LOADOUTS = [['phase', 'dash'], ['dash', 'phase'], ['phase', 'phase'], ['dash', 'dash']];
export function rivalBankLoadout(courseSlot, presetKey) {
  const tier = rivalPreset(presetKey)?.tier ?? 1;
  return BANK_LOADOUTS[((courseSlot | 0) - 1 + (tier - 1) * 2 + BANK_LOADOUTS.length * 4) % BANK_LOADOUTS.length].slice();
}
function hash(value) {
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  return (h ^ (h >>> 15)) >>> 0;
}
export function rivalRecordingID(courseSlug, presetKey, index, clearTimes) {
  return 'rec-' + courseSlug + '-' + presetKey + '-' + index + '-' + hash(clearTimes.join(',')).toString(36);
}
/**
 * Pick an opponent from eligible records. Deterministic: a rematch names the
 * recordingID and gets it back; a new race on the same course picks by a hash
 * of who is racing and how many races they have run there, so the pick is
 * stable for the same inputs and rotates as they play. Requested tier first,
 * then the nearest tier that has recordings, so a thin bank still races.
 */
export function chooseRivalOpponent(records, { recordingID = null, tier = 1, salt = '' } = {}) {
  const list = (records || []).filter(Boolean);
  if (!list.length) return null;
  if (recordingID) {
    const exact = list.find(r => r.recordingID === recordingID);
    if (exact) return exact;
  }
  const tierOf = r => rivalPreset(r.opponent?.skillPreset)?.tier ?? 0;
  const byDistance = [...new Set(list.map(tierOf))].sort((a, b) => Math.abs(a - tier) - Math.abs(b - tier) || a - b);
  const pool = list.filter(r => tierOf(r) === byDistance[0]).sort((a, b) => a.recordingID < b.recordingID ? -1 : 1);
  return pool[hash(salt) % pool.length];
}
