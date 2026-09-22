// The Jev opponent bank: what may enter it, and what every entry must say
// about itself. Imported by tools/rivals-assemble-jev.mjs and by
// test/rivalJevBank.test.mjs, so the rules the assembler applies are the
// rules the test checks.
//
// A SEPARATE BANK
// public/rivals/jev-v1/ holds only races driven by the Jev strategist above
// the runner AI, recorded against the paid TypeSafe API, that finished all
// seven houses with Jev still asking at the finish. Its files are never
// mixed into public/rivals/v2 (the ordinary bot bank); the game reads both
// and puts their opponents in one pool per course (utils/rivalSession.js).
//
// WHAT CAN NEVER GET IN
// A failed, forfeited, abandoned or incomplete race; a race finished after a
// Jev ceiling tripped (the fallback objective finished it, not Jev); a mock
// (tools/lib/jevMock.mjs) or anything whose tokens were not billed by the
// API; an ordinary bot or baseline capture; a duplicate; anything that fails
// a record, course, trace, stash-assignment or replay-bundle validator.
// Every rejection is reported with its reason, never repaired.

import {
  validateRivalRunRecord, validateRivalReplayBundle, rivalRecordMatchesCourse, rivalAttemptErrors, rivalBytes
} from '../../src/logic/rivalRecords.js';
import { validateReplaySegment } from '../../src/logic/rivalReplay.js';
import { RIVAL_RULES_VERSION, RIVAL_HOUSES, rivalPoolCourse, rivalGenuinePocket, rivalSessionPocket } from '../../src/logic/rivals.js';
import { rivalPreset, RIVAL_BOT_DRIVER_VERSION } from '../../src/logic/rivalPresets.js';

export const JEV_BANK_ID = 'jev-v1';
export const JEV_BANK_SCHEMA = 1;
export const JEV_BANK_ROOT = 'public/rivals/jev-v1';
export const ORDINARY_BANK_ROOT = 'public/rivals/v2';
const INTENT_KINDS = new Set(['m', 'g', 'p', 'f']);

/**
 * Intent traces against the record they belong to: one per attempt, in the
 * same house order, on the house's own seed and course, well-formed events
 * with non-decreasing ticks, and exactly as many power events as the
 * strategist says the motor fired.
 */
export function traceErrors(traces, record, course, poweredExpected = null) {
  const errors = [];
  if (!Array.isArray(traces)) return ['traces missing'];
  const attempts = record?.attempts || [];
  if (traces.length !== attempts.length) errors.push(`trace count ${traces.length} != attempts ${attempts.length}`);
  let powers = 0;
  traces.forEach((t, i) => {
    const at = `trace ${i + 1}: `;
    const a = attempts[i];
    if (!t || t.v !== 1) { errors.push(at + 'bad version'); return; }
    if (a && t.round !== a.house) errors.push(at + `round ${t.round} != attempt house ${a.house}`);
    if (course && t.seed !== course.seeds[t.round - 1]) errors.push(at + 'seed is not the house seed');
    if (t.routeID !== record.courseID) errors.push(at + 'routeID is not the course');
    if (t.role !== 'runner' || t.mode !== 'pve') errors.push(at + 'not a runner pve trace');
    if (course && (t.cols !== course.cols || t.rows !== course.rows)) errors.push(at + 'grid size differs from course');
    if (!Array.isArray(t.events)) { errors.push(at + 'events missing'); return; }
    let last = -1;
    for (const e of t.events) {
      if (!Array.isArray(e) || e.length !== 4 || !Number.isInteger(e[0]) || e[0] < last || !INTENT_KINDS.has(e[1]) ||
        !Number.isFinite(e[2]) || !Number.isFinite(e[3])) { errors.push(at + 'malformed event ' + JSON.stringify(e)); break; }
      last = e[0];
      if (e[1] === 'p') powers++;
    }
  });
  if (poweredExpected != null && powers !== poweredExpected) {
    errors.push(`trace power events ${powers} != strategist activations ${poweredExpected}`);
  }
  return errors;
}

/**
 * Every recorded pickup and bunk agrees with the per-attempt genuine pocket
 * (rivalGenuinePocket): the replay reproduces exactly the assignment that
 * attempt was played on. A capture made before the retry reroll fails here.
 */
export function assignmentErrors(bundle) {
  const errors = [];
  for (const s of bundle?.segments || []) {
    const seg = s.replay || s;
    const genuine = Number.isInteger(seg.stashSeed)
      ? rivalSessionPocket(seg.houseSeed, seg.stashSeed)
      : rivalGenuinePocket(seg.houseSeed, s.attempt ?? seg.attempt);
    for (const e of seg.events || []) {
      if (e.k === 'pickup' && e.i !== genuine) errors.push(`house ${s.house} attempt ${s.attempt}: pickup in pocket ${e.i}, genuine is ${genuine}`);
      if (e.k === 'bunk' && e.i !== 1 - genuine) errors.push(`house ${s.house} attempt ${s.attempt}: bunk in the genuine pocket`);
    }
  }
  return errors;
}

/** Why this race may not enter the Jev bank, or null if it may. */
export function jevEligibilityError(payload, race) {
  if (payload?.aborted || payload?.diagnosticOnly) return 'aborted or diagnostic-only recording';
  const jev = payload?.jev;
  const cfg = race?.record?.driverConfig;
  if (!jev) return 'not a Jev capture (ordinary bot or baseline)';
  if (jev.driver !== 'jev-strategist' || jev.motor !== 'runner-ai') return 'not the Jev strategist over the runner AI';
  if (jev.route === 'mock' || jev.relay?.mock || jev.relay?.statuses?.mock) return 'mocked strategist';
  if (jev.route !== 'typesafe-direct') return 'not the TypeSafe route: ' + jev.route;
  if (!race?.ok || !race.record || !race.bundle) return 'not a valid race: ' + (race?.reason || race?.result || 'incomplete');
  if (race.houses !== RIVAL_HOUSES) return `incomplete: ${race.houses}/7`;
  if (race.result === 'forfeit') return 'forfeited';
  if (cfg?.driver !== 'jev-strategist' || !cfg.jev) return 'record does not name the Jev strategist';
  const at = race.jev?.report, end = jev.report;
  if (!at || !end) return 'no Jev report';
  // Active through the finish: no ceiling tripped before the race ended, and
  // Jev was still being asked in the last house.
  if (at.budgetStopped || cfg.jev.budgetStopped) return 'Jev budget stopped before the finish (' + (at.budgetStopped || cfg.jev.budgetStopped) + ')';
  const last = (at.houses || []).filter((h) => h.house === RIVAL_HOUSES);
  if (!last.length || !last.some((h) => h.requests > 0)) return 'Jev was not asked in the last house';
  const houses = new Set((at.houses || []).filter((h) => h.requests > 0).map((h) => h.house));
  if (houses.size !== RIVAL_HOUSES) return 'Jev was not asked in every house';
  if (!(at.strategies?.adopted > 0)) return 'no strategy adopted';
  if (at.rawMovementActions !== 0) return 'raw movement actions recorded';
  if (at.powers?.unarmedActivations) return 'a power fired that Jev did not arm';
  // Paid, and billed: real usage from the API, not an estimate.
  if (typeof at.model !== 'string' || /^mock/i.test(at.model)) return 'no real Jev model answered';
  if (at.tokenSource !== 'api' || !(at.tokensBilled > 0) || !(at.costUsd > 0)) return 'tokens were not billed by the API';
  if (!(jev.relay?.requests > 0) || jev.relay.directBlocked) return 'relay did not carry the traffic';
  return null;
}

/**
 * The record and its replay bundle: the game's own validators (record,
 * course, attempts, bundle and every segment) plus the per-attempt stash
 * assignment. Used for new captures and to re-check what is already banked.
 */
export function validateRecordAndBundle(record, bundle) {
  const v = validateRivalRunRecord(record);
  if (!v.ok) return 'record: ' + v.errors[0];
  const course = rivalPoolCourse(record.courseSlot);
  if (!course || !rivalRecordMatchesCourse(record, course, RIVAL_RULES_VERSION)) return 'course/rules mismatch';
  if (record.opponent?.kind !== 'bot' || !rivalPreset(record.opponent.skillPreset)) return 'not a bot with a known preset';
  const attempts = rivalAttemptErrors(record.attempts);
  if (attempts.length) return 'attempts: ' + attempts[0];
  const b = validateRivalReplayBundle(bundle, record, { validateSegment: validateReplaySegment });
  if (!b.ok) return 'bundle: ' + b.errors[0];
  const as = assignmentErrors(bundle);
  if (as.length) return 'stash assignment: ' + as[0];
  return null;
}

/** Full validation of a new capture: the above, plus its intent traces. */
export function validateJevRace(payload, race) {
  const err = validateRecordAndBundle(race.record, race.bundle);
  if (err) return err;
  const course = rivalPoolCourse(race.record.courseSlot);
  const tr = traceErrors(race.traces, race.record, course, race.jev?.report?.powers?.activated ?? null);
  if (tr.length) return 'traces: ' + tr[0];
  return null;
}

/**
 * What every bank entry says about how it was made. Counts, rates, labels,
 * versions and model strings only — nothing here can carry a credential.
 */
export function jevProvenance(payload, race, sourceFile = null) {
  const record = race.record, cfg = record.driverConfig, jev = payload.jev;
  const r = race.jev.report;               // snapshotted at the finish
  const final = jev.report;                 // the session's, after the finish
  return {
    kind: record.opponent.kind,
    driver: 'jev-strategist',
    motor: 'runner-ai',
    route: jev.route,
    preset: record.opponent.skillPreset,
    motorVersion: record.opponent.driverVersion,
    aiLevel: cfg.aiLevel ?? null,
    model: { requested: cfg.jev.modelRequested ?? null, returned: r.model ?? cfg.jev.modelReturned ?? null },
    requests: {
      logical: r.logicalRequests,
      byTrigger: { ...(r.triggers?.requested || {}) },
      coalesced: r.triggers?.coalesced ?? 0,
      httpAttempts: r.http?.attempts ?? null,
      httpRetries: r.http?.retries ?? null,
      httpStatuses: { ...(r.http?.statuses || {}) },
      relayForwarded: jev.relay?.requests ?? null,
      relayStatuses: { ...(jev.relay?.statuses || {}) },
      answers: r.answers, invalid: r.invalid, errors: r.errors, timeouts: r.timeouts, obsolete: r.obsolete
    },
    ceilings: { maxRequests: r.requestLimit, maxInputTokens: r.tokenLimit, budgetStopped: r.budgetStopped },
    tokens: { billed: r.tokensBilled, source: r.tokenSource },
    costUsd: r.costUsd,
    // The figures above are snapshotted at the finish line. The session's
    // totals can be a request or two higher (one in flight as the race
    // ended); both are kept so the cost is never understated.
    session: { logicalRequests: final?.logicalRequests ?? null, tokensBilled: final?.tokensBilled ?? null,
      costUsd: final?.costUsd ?? null, httpAttempts: final?.http?.attempts ?? null },
    strategy: {
      adopted: r.strategies?.adopted ?? 0,
      rejected: { ...(r.strategies?.rejected || {}) },
      heldByCommitment: r.strategies?.objectiveHeld ?? 0,
      switches: r.strategies?.switches ?? 0,
      invalidated: r.strategies?.invalidated ?? 0,
      activeShare: r.time?.strategyActiveShare ?? null,
      fallbackShare: r.time?.fallbackShare ?? null,
      perHouse: (r.houses || []).map((h) => ({ house: h.house, attempt: h.attempt, requests: h.requests,
        jevMs: h.jevMs, fallbackMs: h.fallbackMs, recoveryMs: h.recoveryMs }))
    },
    powers: {
      requested: r.powers?.requested ?? 0, accepted: r.powers?.accepted ?? 0,
      activated: r.powers?.activated ?? 0, expiredUnused: r.powers?.expiredUnused ?? 0,
      saved: r.powers?.saved ?? 0, rejected: { ...(r.powers?.rejected || {}) },
      byName: { ...(r.powers?.byName || {}) }
    },
    watchdog: {
      stalls: r.watchdog?.stalls ?? 0, recoveries: r.watchdog?.recoveries ?? 0,
      recoveryMs: r.watchdog?.recoveryMs ?? 0, restored: r.watchdog?.restored ?? 0,
      notRestored: r.watchdog?.notRestored ?? 0, requestsCaused: r.watchdog?.watchdogRequests ?? 0
    },
    driveSources: { ...(final?.driveSources || {}) },
    rawMovementActions: r.rawMovementActions,
    recordedAt: record.recordedAt,
    versions: {
      rules: record.rulesVersion,
      recordSchema: record.schemaVersion,
      replaySchema: race.bundle.schemaVersion,
      capture: payload.tool,
      motor: record.opponent.driverVersion,
      bank: JEV_BANK_ID
    },
    environment: { renderer: payload.environment?.renderer ?? null, fpsMedian: payload.environment?.fpsMedian ?? null,
      viewport: payload.environment?.viewport ?? null },
    source: sourceFile
  };
}

/**
 * Choose the bank from existing entries plus new captures. Pure: returns
 * { accepted, rejected, reimported } and writes nothing.
 * @param existing  [{ record, bundle, provenance }] already in the bank
 * @param captures  [{ file, payload }] raw recorder output
 */
export function selectJevBank(existing, captures) {
  const accepted = [], rejected = [];
  const byId = new Map(), byHash = new Map();
  let reimported = 0;
  const admit = (entry, tag) => {
    const id = entry.record.recordingID;
    const hash = entry.record.payloadHash || rivalBytes(entry.record);
    if (byId.has(id)) {
      if (rivalBytes(byId.get(id).record) === rivalBytes(entry.record)) { reimported++; return; }
      rejected.push({ tag, reason: 'duplicate recordingID with different payload' }); return;
    }
    if (byHash.has(hash)) { rejected.push({ tag, reason: 'duplicate race (same payload as ' + byHash.get(hash) + ')' }); return; }
    byId.set(id, entry); byHash.set(hash, id);
    accepted.push(entry);
  };

  for (const e of existing) {
    // Banked entries carry no traces (those were checked on admission);
    // everything else is re-checked on every pass.
    const recErr = validateRecordAndBundle(e.record, e.bundle);
    if (recErr) { rejected.push({ tag: e.record?.recordingID, reason: 'existing entry no longer valid: ' + recErr }); continue; }
    if (e.provenance?.driver !== 'jev-strategist' || e.provenance?.ceilings?.budgetStopped ||
        e.record?.driverConfig?.driver !== 'jev-strategist') {
      rejected.push({ tag: e.record?.recordingID, reason: 'existing entry lacks Jev provenance' }); continue;
    }
    admit(e, e.record.recordingID);
  }

  for (const { file, payload } of captures) {
    for (const race of payload?.races || []) {
      const tag = race?.record?.recordingID || file;
      const why = jevEligibilityError(payload, race) || validateJevRace(payload, race);
      if (why) { rejected.push({ tag, file, reason: why }); continue; }
      admit({ record: race.record, bundle: race.bundle, provenance: jevProvenance(payload, race, file) }, tag);
    }
  }
  return { accepted, rejected, reimported };
}

export { RIVAL_BOT_DRIVER_VERSION };
