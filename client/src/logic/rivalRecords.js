// Rival recording contracts. Pure: no Phaser, storage, clocks or imports.
//
// Two artifacts, kept apart on purpose:
//   RivalRunRecord   — the authoritative comparison record. Seven cumulative
//                      clear timestamps drive the opponent bar and the race
//                      result. Small, always loaded.
//   RivalReplayBundle — optional spectator data, one portable segment per
//                      attempt. Fetched only when someone presses Watch. A
//                      missing or corrupt bundle must never cost a result.
//
// Validation here is corruption checking, not anti-cheat. A record that passes
// is well-formed, not genuine; `verified` stays false until a trusted build or
// server signs it.
export const RIVAL_RECORD_SCHEMA = 1;
export const RIVAL_BUNDLE_SCHEMA = 1;
export const RIVAL_RECORD_HOUSES = 7;
export const RIVAL_MAX_RECORD_BYTES = 64 * 1024;
export const RIVAL_MAX_BUNDLE_BYTES = 6 * 1024 * 1024;
export const RIVAL_MAX_ATTEMPT_MS = 12 * 60 * 1000;
export const RIVAL_ATTEMPT_OUTCOMES = Object.freeze(['extracted', 'caught', 'timeout']);
export const RIVAL_OPPONENT_KINDS = Object.freeze(['bot', 'human']);
const POWERS = ['phase', 'dash', 'decoy'];

// Stable serialization: object keys sorted at every level so the same payload
// hashes the same regardless of construction order. Arrays keep their order.
export function canonicalJSON(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
  const keys = Object.keys(value).filter(k => value[k] !== undefined).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJSON(value[k])).join(',') + '}';
}
function fnv(text, offset, prime) {
  let h = offset >>> 0;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), prime);
  return (h >>> 0).toString(16).padStart(8, '0');
}
// Two independent 32-bit FNV passes over the canonical text. Corruption
// detection for a static JSON file, not a cryptographic signature.
export function rivalPayloadHash(payload) {
  const { payloadHash, verified, ...rest } = payload || {};
  const text = canonicalJSON(rest);
  return fnv(text, 2166136261, 16777619) + fnv(text, 0x811c9dc5 ^ 0x5bd1e995, 0x01000193 ^ 0x9e3779b1 | 1);
}
export function rivalBytes(value) { return JSON.stringify(value).length; }

const isInt = n => Number.isInteger(n);
const isMs = n => Number.isFinite(n) && n >= 0;
const isUint32 = n => isInt(n) && n >= 0 && n <= 0xffffffff;
const nonEmpty = s => typeof s === 'string' && s.length > 0 && s.length <= 128;

/** Attempt-list rules shared by build and validate. Returns error strings. */
export function rivalAttemptErrors(attempts) {
  const errors = [];
  if (!Array.isArray(attempts) || !attempts.length) return ['attempts missing'];
  if (attempts.length > 400) return ['too many attempts'];
  let lastHouse = 0, lastAttempt = 0, lastEnd = 0, lastClear = 0;
  const cleared = new Set();
  attempts.forEach((a, i) => {
    const at = 'attempt[' + i + '] ';
    if (!a || typeof a !== 'object') { errors.push(at + 'not an object'); return; }
    if (!isInt(a.house) || a.house < 1 || a.house > RIVAL_RECORD_HOUSES) errors.push(at + 'bad house');
    if (!isInt(a.attempt) || a.attempt < 1) errors.push(at + 'bad attempt number');
    if (!isMs(a.startedMs) || !isMs(a.endedMs) || a.endedMs < a.startedMs) errors.push(at + 'bad timing');
    if (a.endedMs - a.startedMs > RIVAL_MAX_ATTEMPT_MS) errors.push(at + 'attempt too long');
    if (a.orderedPowers !== undefined && (!Array.isArray(a.orderedPowers) ||
      a.orderedPowers.length !== 2 || !a.orderedPowers.every(p=>POWERS.includes(p)))) errors.push(at + 'bad orderedPowers');
    if (!RIVAL_ATTEMPT_OUTCOMES.includes(a.outcome)) errors.push(at + 'bad outcome');
    if (a.outcome === 'extracted' ? a.clearMs !== a.endedMs : a.clearMs != null) errors.push(at + 'clearMs inconsistent with outcome');
    if (a.house === lastHouse) {
      if (a.attempt !== lastAttempt + 1) errors.push(at + 'attempt numbers not consecutive');
      if (cleared.has(a.house)) errors.push(at + 'attempt after the house was cleared');
    } else {
      if (a.house !== lastHouse + 1) errors.push(at + 'houses not consecutive');
      if (a.attempt !== 1) errors.push(at + 'house does not start at attempt 1');
      if (lastHouse && !cleared.has(lastHouse)) errors.push(at + 'previous house never cleared');
    }
    if (a.startedMs < lastEnd) errors.push(at + 'overlaps previous attempt');
    if (a.outcome === 'extracted') {
      if (a.clearMs <= lastClear) errors.push(at + 'clear not after previous clear');
      cleared.add(a.house); lastClear = a.clearMs;
    }
    lastHouse = a.house; lastAttempt = a.attempt; lastEnd = a.endedMs;
  });
  if (!errors.length && cleared.size !== RIVAL_RECORD_HOUSES) errors.push('not all seven houses cleared');
  return errors;
}
export function rivalClearTimesFromAttempts(attempts) {
  return attempts.filter(a => a.outcome === 'extracted').map(a => a.clearMs);
}

/** Assemble a record from the race facts. Throws on malformed input. */
export function buildRivalRunRecord({ rulesVersion, course, opponent, orderedPowers, attempts, recordingID, recordedAt = null, driverConfig = null, stashSeed = null }) {
  const errors = rivalAttemptErrors(attempts);
  if (errors.length) throw new Error('Rival attempts invalid: ' + errors[0]);
  const clearTimes = rivalClearTimesFromAttempts(attempts);
  const record = {
    schemaVersion: RIVAL_RECORD_SCHEMA,
    rulesVersion,
    courseID: course.id, courseSlot: course.slot ?? null, courseSeeds: course.seeds.slice(),
    ...(Number.isInteger(stashSeed) ? { stashSeed: stashSeed >>> 0, stashRules: 'match-v1' } : {}),
    opponent: { ...opponent },
    orderedPowers: orderedPowers.slice(),
    attempts: attempts.map(a => ({ house: a.house, attempt: a.attempt, startedMs: a.startedMs, endedMs: a.endedMs,
      outcome: a.outcome, clearMs: a.outcome === 'extracted' ? a.clearMs : null,
      ...(a.orderedPowers === undefined ? {} : {orderedPowers:a.orderedPowers.slice()}) })),
    clearTimes,
    elapsedMs: clearTimes[RIVAL_RECORD_HOUSES - 1],
    retries: attempts.length - RIVAL_RECORD_HOUSES,
    recordingID,
    recordedAt,
    driverConfig,
    verified: false
  };
  record.payloadHash = rivalPayloadHash(record);
  const check = validateRivalRunRecord(record);
  if (!check.ok) throw new Error('Rival record invalid: ' + check.errors[0]);
  return record;
}

export function validateRivalRunRecord(record) {
  const errors = [];
  if (!record || typeof record !== 'object') return { ok: false, errors: ['record missing'] };
  if (record.schemaVersion !== RIVAL_RECORD_SCHEMA) errors.push('unsupported schemaVersion');
  if (!nonEmpty(record.rulesVersion)) errors.push('rulesVersion missing');
  if (!nonEmpty(record.courseID)) errors.push('courseID missing');
  if (('stashSeed' in record || 'stashRules' in record) && (!isUint32(record.stashSeed) || record.stashRules !== 'match-v1')) errors.push('bad match stash rules');
  if (!(record.courseSlot === null || (isInt(record.courseSlot) && record.courseSlot >= 1))) errors.push('bad courseSlot');
  if (!Array.isArray(record.courseSeeds) || record.courseSeeds.length !== RIVAL_RECORD_HOUSES || !record.courseSeeds.every(isUint32)) errors.push('courseSeeds must be seven uint32');
  const o = record.opponent;
  if (!o || typeof o !== 'object') errors.push('opponent missing');
  else {
    if (!RIVAL_OPPONENT_KINDS.includes(o.kind)) errors.push('bad opponent kind');
    if (!nonEmpty(o.id) || !nonEmpty(o.displayName)) errors.push('opponent id/displayName missing');
    if (o.kind === 'bot' && (!nonEmpty(o.driverVersion) || !nonEmpty(o.skillPreset))) errors.push('bot opponent needs driverVersion and skillPreset');
  }
  if (!Array.isArray(record.orderedPowers) || record.orderedPowers.length !== 2 || !record.orderedPowers.every(p => POWERS.includes(p))) errors.push('orderedPowers must be two known powers');
  errors.push(...rivalAttemptErrors(record.attempts));
  if (!errors.length) {
    const derived = rivalClearTimesFromAttempts(record.attempts);
    if (JSON.stringify(record.clearTimes) !== JSON.stringify(derived)) errors.push('clearTimes do not match attempts');
    if (record.elapsedMs !== derived[RIVAL_RECORD_HOUSES - 1]) errors.push('elapsedMs is not the seventh clear');
    if (record.retries !== record.attempts.length - RIVAL_RECORD_HOUSES) errors.push('retries do not match attempts');
  }
  if (!nonEmpty(record.recordingID)) errors.push('recordingID missing');
  if (record.verified !== false) errors.push('client records cannot claim verification');
  if (typeof record.payloadHash !== 'string' || record.payloadHash !== rivalPayloadHash(record)) errors.push('payloadHash mismatch');
  if (rivalBytes(record) > RIVAL_MAX_RECORD_BYTES) errors.push('record too large');
  return { ok: !errors.length, errors };
}

// Eligibility, separate from well-formedness: same rules, same course, same
// seven house seeds. A mismatch makes the opponent ineligible, never "close".
export function rivalRecordMatchesCourse(record, course, rulesVersion) {
  return !!record && !!course && record.rulesVersion === rulesVersion && course.version === rulesVersion &&
    record.courseID === course.id && JSON.stringify(record.courseSeeds) === JSON.stringify(course.seeds);
}
export function rivalRecordMatchesPowers(record, powers) {
  return !!record && JSON.stringify(record.orderedPowers) === JSON.stringify(powers);
}

export function buildRivalReplayBundle(record, segments) {
  return {
    schemaVersion: RIVAL_BUNDLE_SCHEMA,
    recordingID: record.recordingID,
    rulesVersion: record.rulesVersion,
    courseID: record.courseID,
    segments: record.attempts.map((a, i) => ({
      house: a.house, attempt: a.attempt, startedMs: a.startedMs,
      durationMs: a.endedMs - a.startedMs, outcome: a.outcome, replay: segments[i] ?? null,
      ...(a.orderedPowers === undefined ? {} : {orderedPowers:a.orderedPowers.slice()})
    }))
  };
}

/** A bundle is only valid against the record it claims to illustrate. */
export function validateRivalReplayBundle(bundle, record, { validateSegment = null } = {}) {
  const errors = [];
  if (!bundle || typeof bundle !== 'object') return { ok: false, errors: ['bundle missing'] };
  if (!record) return { ok: false, errors: ['record missing'] };
  if (bundle.schemaVersion !== RIVAL_BUNDLE_SCHEMA) errors.push('unsupported bundle schemaVersion');
  if (bundle.recordingID !== record.recordingID) errors.push('bundle recordingID mismatch');
  if (bundle.rulesVersion !== record.rulesVersion) errors.push('bundle rulesVersion mismatch');
  if (bundle.courseID !== record.courseID) errors.push('bundle courseID mismatch');
  if (!Array.isArray(bundle.segments)) errors.push('segments missing');
  else if (bundle.segments.length !== record.attempts.length) errors.push('segment count differs from attempts');
  else bundle.segments.forEach((s, i) => {
    const a = record.attempts[i], at = 'segment[' + i + '] ';
    if (!s || typeof s !== 'object') { errors.push(at + 'not an object'); return; }
    if (s.house !== a.house || s.attempt !== a.attempt) errors.push(at + 'house/attempt differ from record');
    if (record.stashRules === 'match-v1' && s.replay?.stashSeed !== record.stashSeed) errors.push(at + 'stash seed differs from match');
    if (s.startedMs !== a.startedMs || s.outcome !== a.outcome) errors.push(at + 'timing/outcome differ from record');
    if (!isMs(s.durationMs) || Math.abs(s.durationMs - (a.endedMs - a.startedMs)) > 1500) errors.push(at + 'duration differs from record');
    if (a.orderedPowers !== undefined && JSON.stringify(s.orderedPowers) !== JSON.stringify(a.orderedPowers))
      errors.push(at + 'power mix differs from attempt');
    if (a.orderedPowers !== undefined) for (const e of s.replay?.events || []) {
      if (e.k==='power' && (e.slot!==0 && e.slot!==1 || e.power!==a.orderedPowers[e.slot]))
        errors.push(at + 'power event differs from attempt mix');
    }
    if (!s.replay || typeof s.replay !== 'object') errors.push(at + 'replay missing');
    else if (validateSegment) {
      const r = validateSegment(s.replay, a);
      if (r && r.ok === false) errors.push(at + (r.errors?.[0] ?? 'replay invalid'));
    }
  });
  if (rivalBytes(bundle) > RIVAL_MAX_BUNDLE_BYTES) errors.push('bundle too large');
  return { ok: !errors.length, errors };
}
