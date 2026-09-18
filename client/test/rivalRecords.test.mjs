// RivalRunRecord / RivalReplayBundle contracts. Headless, no Phaser.
import {
  RIVAL_RECORD_SCHEMA, RIVAL_BUNDLE_SCHEMA, RIVAL_RECORD_HOUSES, RIVAL_MAX_RECORD_BYTES,
  canonicalJSON, rivalPayloadHash, rivalBytes, rivalAttemptErrors, rivalClearTimesFromAttempts,
  buildRivalRunRecord, validateRivalRunRecord, rivalRecordMatchesCourse, rivalRecordMatchesPowers,
  buildRivalReplayBundle, validateRivalReplayBundle
} from '../src/logic/rivalRecords.js';
import { RIVAL_HOUSES, RIVAL_RULES_VERSION, rivalPoolCourse } from '../src/logic/rivals.js';

let passed = 0;
function check(name, value) { if (!value) throw new Error(name); passed++; }
const throws = fn => { try { fn(); return false; } catch { return true; } };
const bad = (record, mutate) => { const r = JSON.parse(JSON.stringify(record)); mutate(r); return validateRivalRunRecord(r); };

check('record houses agree with race rules', RIVAL_RECORD_HOUSES === RIVAL_HOUSES);
check('schema versions start at 1', RIVAL_RECORD_SCHEMA === 1 && RIVAL_BUNDLE_SCHEMA === 1);

// canonical JSON + hash
check('canonical sorts keys at every level', canonicalJSON({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: 0 } }) === '{"a":{"c":0,"d":[3,{"y":2,"z":1}]},"b":1}');
check('canonical drops undefined, keeps null', canonicalJSON({ a: undefined, b: null }) === '{"b":null}');
check('canonical keeps array order', canonicalJSON([2, 1]) === '[2,1]');
const h1 = rivalPayloadHash({ a: 1, b: 2 }), h2 = rivalPayloadHash({ b: 2, a: 1 });
check('hash ignores key order', h1 === h2 && /^[0-9a-f]{16}$/.test(h1));
check('hash ignores its own field and verified', rivalPayloadHash({ a: 1, b: 2, payloadHash: 'x', verified: true }) === h1);
check('hash notices a value change', rivalPayloadHash({ a: 1, b: 3 }) !== h1);
check('hash notices a one-millisecond change', rivalPayloadHash({ clearTimes: [10000] }) !== rivalPayloadHash({ clearTimes: [10001] }));

// a plausible race: house 1 clean, house 2 one death, house 3 one timeout, rest clean
const attempts = [
  { house: 1, attempt: 1, startedMs: 0, endedMs: 9000, outcome: 'extracted', clearMs: 9000 },
  { house: 2, attempt: 1, startedMs: 9180, endedMs: 14000, outcome: 'caught' },
  { house: 2, attempt: 2, startedMs: 14650, endedMs: 24000, outcome: 'extracted', clearMs: 24000 },
  { house: 3, attempt: 1, startedMs: 24180, endedMs: 114180, outcome: 'timeout' },
  { house: 3, attempt: 2, startedMs: 114830, endedMs: 126000, outcome: 'extracted', clearMs: 126000 },
  { house: 4, attempt: 1, startedMs: 126180, endedMs: 137000, outcome: 'extracted', clearMs: 137000 },
  { house: 5, attempt: 1, startedMs: 137180, endedMs: 148000, outcome: 'extracted', clearMs: 148000 },
  { house: 6, attempt: 1, startedMs: 148180, endedMs: 160000, outcome: 'extracted', clearMs: 160000 },
  { house: 7, attempt: 1, startedMs: 160180, endedMs: 175000, outcome: 'extracted', clearMs: 175000 }
];
check('valid attempts have no errors', rivalAttemptErrors(attempts).length === 0);
check('clear times derived from extractions', JSON.stringify(rivalClearTimesFromAttempts(attempts)) === '[9000,24000,126000,137000,148000,160000,175000]');
const mutateAttempts = fn => { const a = JSON.parse(JSON.stringify(attempts)); fn(a); return rivalAttemptErrors(a); };
check('empty attempts rejected', rivalAttemptErrors([]).length && rivalAttemptErrors(null).length);
check('skipped house rejected', mutateAttempts(a => { a[5].house = 5; a[6].house = 6; a[7].house = 7; a[8].house = 8; }).length > 0);
check('house without clear rejected', mutateAttempts(a => { a[2].outcome = 'caught'; delete a[2].clearMs; }).length > 0);
check('attempt after clear rejected', mutateAttempts(a => a.splice(1, 0, { house: 1, attempt: 2, startedMs: 9000, endedMs: 9100, outcome: 'caught' })).length > 0);
check('attempt numbering gap rejected', mutateAttempts(a => { a[2].attempt = 3; }).length > 0);
check('overlapping attempts rejected', mutateAttempts(a => { a[1].startedMs = 8000; }).length > 0);
check('clearMs on a death rejected', mutateAttempts(a => { a[1].clearMs = 14000; }).length > 0);
check('clearMs unequal to endedMs rejected', mutateAttempts(a => { a[0].clearMs = 8999; }).length > 0);
check('unknown outcome rejected', mutateAttempts(a => { a[1].outcome = 'quit'; }).length > 0);
check('negative time rejected', mutateAttempts(a => { a[0].startedMs = -1; }).length > 0);
check('non-increasing clear rejected', mutateAttempts(a => { a[0].endedMs = a[0].clearMs = 30000; a[1].startedMs = 30000; }).length > 0);
check('six houses rejected', rivalAttemptErrors(attempts.slice(0, 8)).length > 0);

const course = rivalPoolCourse(2);
const opponent = { id: 'bot-street-1', displayName: 'BOT · Street 1', kind: 'bot', driverVersion: 'botdriver-1', skillPreset: 'street' };
const record = buildRivalRunRecord({ rulesVersion: RIVAL_RULES_VERSION, course, opponent, orderedPowers: ['phase', 'dash'], attempts, recordingID: 'rec-test-1', recordedAt: '2026-09-16T00:00:00Z', driverConfig: { aiLevel: 6 } });
check('built record validates', validateRivalRunRecord(record).ok);
check('record carries course identity', record.courseID === course.id && record.courseSlot === 2 && JSON.stringify(record.courseSeeds) === JSON.stringify(course.seeds));
check('record copies seeds', record.courseSeeds !== course.seeds);
check('elapsed is the seventh clear', record.elapsedMs === 175000 && record.clearTimes.length === 7);
check('retries counted from attempts', record.retries === 2);
check('record is unverified', record.verified === false);
check('record has hash', /^[0-9a-f]{16}$/.test(record.payloadHash));
check('record stays small', rivalBytes(record) < RIVAL_MAX_RECORD_BYTES / 8);
check('builder rejects bad attempts', throws(() => buildRivalRunRecord({ rulesVersion: RIVAL_RULES_VERSION, course, opponent, orderedPowers: ['phase', 'dash'], attempts: attempts.slice(0, 3), recordingID: 'x' })));
check('builder rejects bad powers', throws(() => buildRivalRunRecord({ rulesVersion: RIVAL_RULES_VERSION, course, opponent, orderedPowers: ['phase'], attempts, recordingID: 'x' })));

check('tampered clear time fails hash', !bad(record, r => { r.clearTimes[6] = 174000; r.attempts[8].endedMs = r.attempts[8].clearMs = 174000; r.elapsedMs = 174000; }).ok);
check('tampered clear time names the hash', bad(record, r => { r.clearTimes[6] = 174000; r.attempts[8].endedMs = r.attempts[8].clearMs = 174000; r.elapsedMs = 174000; }).errors.includes('payloadHash mismatch'));
check('clearTimes must match attempts', !bad(record, r => { r.clearTimes[0] = 8000; r.payloadHash = rivalPayloadHash(r); }).ok);
check('elapsed must be seventh clear', !bad(record, r => { r.elapsedMs = 1; r.payloadHash = rivalPayloadHash(r); }).ok);
check('retries must match attempts', !bad(record, r => { r.retries = 0; r.payloadHash = rivalPayloadHash(r); }).ok);
check('verified true is refused client-side', !bad(record, r => { r.verified = true; }).ok);
check('unknown schema refused', !bad(record, r => { r.schemaVersion = 2; r.payloadHash = rivalPayloadHash(r); }).ok);
check('missing opponent refused', !bad(record, r => { delete r.opponent; r.payloadHash = rivalPayloadHash(r); }).ok);
check('bot without preset refused', !bad(record, r => { delete r.opponent.skillPreset; r.payloadHash = rivalPayloadHash(r); }).ok);
check('human opponent needs no driver fields', bad(record, r => { r.opponent = { id: 'u1', displayName: 'Someone', kind: 'human' }; r.payloadHash = rivalPayloadHash(r); }).ok);
check('unknown opponent kind refused', !bad(record, r => { r.opponent.kind = 'live'; r.payloadHash = rivalPayloadHash(r); }).ok);
check('eight seeds refused', !bad(record, r => { r.courseSeeds.push(1); r.payloadHash = rivalPayloadHash(r); }).ok);
check('non-integer seed refused', !bad(record, r => { r.courseSeeds[0] = 1.5; r.payloadHash = rivalPayloadHash(r); }).ok);
check('missing recordingID refused', !bad(record, r => { r.recordingID = ''; r.payloadHash = rivalPayloadHash(r); }).ok);
check('garbage refused', !validateRivalRunRecord(null).ok && !validateRivalRunRecord('x').ok && !validateRivalRunRecord({}).ok);
check('oversized record refused', !bad(record, r => { r.driverConfig = { pad: 'x'.repeat(RIVAL_MAX_RECORD_BYTES) }; r.payloadHash = rivalPayloadHash(r); }).ok);

check('record matches its course', rivalRecordMatchesCourse(record, course, RIVAL_RULES_VERSION));
check('other course rejected', !rivalRecordMatchesCourse(record, rivalPoolCourse(3), RIVAL_RULES_VERSION));
check('rules bump retires record', !rivalRecordMatchesCourse(record, course, 'rivals-v2') && !rivalRecordMatchesCourse({ ...record, rulesVersion: 'rivals-v0' }, course, RIVAL_RULES_VERSION));
check('seed drift rejected', !rivalRecordMatchesCourse({ ...record, courseSeeds: [...record.courseSeeds.slice(0, 6), 1] }, course, RIVAL_RULES_VERSION));
check('powers compared in order', rivalRecordMatchesPowers(record, ['phase', 'dash']) && !rivalRecordMatchesPowers(record, ['dash', 'phase']));

// bundle
const segments = attempts.map(() => ({ v: 1, frames: [[0, 1, 1, 0, [], [], 0], [66, 1, 1, 0, [], [], 0]], durationMs: 100 }));
const bundle = buildRivalReplayBundle(record, segments);
check('bundle mirrors attempts', bundle.segments.length === 9 && bundle.segments[2].house === 2 && bundle.segments[2].attempt === 2 && bundle.segments[2].outcome === 'extracted');
check('bundle durations from attempts', bundle.segments[3].durationMs === 90000);
check('bundle validates against its record', validateRivalReplayBundle(bundle, record).ok);
const badBundle = (mutate) => { const b = JSON.parse(JSON.stringify(bundle)); mutate(b); return validateRivalReplayBundle(b, record); };
check('other recording refused', !badBundle(b => { b.recordingID = 'rec-other'; }).ok);
check('rules mismatch refused', !badBundle(b => { b.rulesVersion = 'rivals-v0'; }).ok);
check('course mismatch refused', !badBundle(b => { b.courseID = 'rivals-v1-1'; }).ok);
check('missing segment refused', !badBundle(b => { b.segments.pop(); }).ok);
check('reordered segment refused', !badBundle(b => { [b.segments[1], b.segments[2]] = [b.segments[2], b.segments[1]]; }).ok);
check('null replay refused', !badBundle(b => { b.segments[0].replay = null; }).ok);
check('duration drift beyond tolerance refused', !badBundle(b => { b.segments[0].durationMs = 12000; }).ok);
check('duration within tolerance accepted', badBundle(b => { b.segments[0].durationMs = 9800; }).ok);
check('segment validator consulted', !validateRivalReplayBundle(bundle, record, { validateSegment: () => ({ ok: false, errors: ['nope'] }) }).ok);
check('segment validator errors surfaced', validateRivalReplayBundle(bundle, record, { validateSegment: () => ({ ok: false, errors: ['nope'] }) }).errors[0].includes('nope'));
check('garbage bundle refused', !validateRivalReplayBundle(null, record).ok && !validateRivalReplayBundle({}, record).ok && !validateRivalReplayBundle(bundle, null).ok);
console.log(passed + ' rival record assertions passed');

check('legacy record retains no optional attempt powers',record.attempts.every(a=>!Object.hasOwn(a,'orderedPowers')));
const mixedAttempts=attempts.map((a,i)=>({...a,orderedPowers:i<2?['phase','dash']:['decoy','phase']}));
const mixedRecord=buildRivalRunRecord({rulesVersion:RIVAL_RULES_VERSION,course,opponent,orderedPowers:['phase','dash'],attempts:mixedAttempts,recordingID:'mixed-record'});
check('optional per-attempt mixes validate',validateRivalRunRecord(mixedRecord).ok);
check('optional mixes survive builder copy',mixedRecord.attempts[2].orderedPowers.join()==='decoy,phase');
check('invalid per-attempt mix rejected',mutateAttempts(a=>{a[1].orderedPowers=['fake','dash'];}).length>0);
check('partial per-attempt mix rejected',mutateAttempts(a=>{a[1].orderedPowers=['phase'];}).length>0);
const modifiedMix=JSON.parse(JSON.stringify(mixedRecord));modifiedMix.attempts[2].orderedPowers=['phase','phase'];
check('changing a recorded mix invalidates hash',!validateRivalRunRecord(modifiedMix).ok);
console.log('attempt power contract: '+passed+' total assertions passed');
