// The Jev opponent bank (public/rivals/jev-v1), under plain Node.
//
//   node client/test/rivalJevBank.test.mjs
//
// Two halves. The bank on disk: every entry is a 7/7 race that passes every
// record, course, replay-bundle and stash-assignment validator, carries
// complete, honest provenance (paid TypeSafe route, real model, billed tokens,
// Jev active to the finish), and nothing in it touches or overlaps the
// ordinary bot bank. And the admission rules: built from those same entries,
// a mock, an ordinary bot, a failed race, a budget-stopped race, bad traces
// and duplicates are all refused by the assembler's own selection code.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  selectJevBank, validateRecordAndBundle, traceErrors, assignmentErrors, jevEligibilityError, jevRaceReport,
  JEV_BANK_ID, JEV_BANK_ROOT, ORDINARY_BANK_ROOT, JEV_APEX_BANK_ID, JEV_APEX_BANK_ROOT, JEV_RIVAL_HARD_BANK_ID, JEV_RIVAL_HARD_BANK_ROOT
} from '../tools/lib/jevBank.mjs';
import { readJevBank } from '../tools/rivals-assemble-jev.mjs';
import { validateRivalRunRecord, validateRivalReplayBundle, rivalRecordMatchesCourse } from '../src/logic/rivalRecords.js';
import { validateReplaySegment } from '../src/logic/rivalReplay.js';
import { RIVAL_RULES_VERSION, RIVAL_HOUSES, rivalPoolCourse, RIVAL_COURSE_POOL } from '../src/logic/rivals.js';

let passed = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) passed++;
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

const ROOT = new URL('../' + JEV_BANK_ROOT + '/', import.meta.url);
const V2 = new URL('../' + ORDINARY_BANK_ROOT + '/', import.meta.url);
const rootPath = decodeURIComponent(ROOT.pathname).replace(/^\/([A-Za-z]:)/, '$1');
const v2Path = decodeURIComponent(V2.pathname).replace(/^\/([A-Za-z]:)/, '$1');

/* ---------------- the bank on disk ---------------- */

check('the jev-v1 bank exists', existsSync(join(rootPath, 'manifest.json')));
const manifest = JSON.parse(readFileSync(join(rootPath, 'manifest.json'), 'utf8'));
check('manifest names the bank and rules', manifest.bank === JEV_BANK_ID && manifest.schemaVersion === 1 &&
  manifest.rulesVersion === RIVAL_RULES_VERSION);

const entries = readJevBank(rootPath);
check('at least two opponents', entries.length >= 2, String(entries.length));
check('on at least two different course slots', new Set(entries.map((e) => e.record.courseSlot)).size >= 2);

const listed = manifest.courses.flatMap((c) => c.recordingIDs);
check('the manifest lists exactly the banked recordings',
  JSON.stringify([...listed].sort()) === JSON.stringify(entries.map((e) => e.record.recordingID).sort()));
for (const c of manifest.courses) {
  const file = JSON.parse(readFileSync(join(rootPath, 'courses', c.courseID, 'opponents.json'), 'utf8'));
  check(`course ${c.slot}: file matches the manifest`, file.bank === JEV_BANK_ID && file.courseID === c.courseID &&
    file.courseSlot === c.slot && file.opponents.length === c.opponents);
  check(`course ${c.slot}: is a pool course`, rivalPoolCourse(c.slot)?.id === c.courseID &&
    RIVAL_COURSE_POOL.some((k) => k.slot === c.slot && k.courseID === c.courseID));
}

const REQUIRED = [
  ['kind', (p) => p.kind === 'bot'],
  ['driver', (p) => p.driver === 'jev-strategist'],
  ['motor', (p) => p.motor === 'runner-ai'],
  ['TypeSafe route', (p) => p.route === 'typesafe-direct'],
  ['requested model', (p) => typeof p.model?.requested === 'string' && p.model.requested.length > 0],
  ['returned model', (p) => typeof p.model?.returned === 'string' && /^jev/.test(p.model.returned)],
  ['logical requests', (p) => Number.isInteger(p.requests?.logical) && p.requests.logical > 0],
  ['HTTP attempts', (p) => Number.isInteger(p.requests?.httpAttempts) && p.requests.httpAttempts >= p.requests.logical],
  ['billed tokens', (p) => p.tokens?.source === 'api' && p.tokens.billed > 0],
  ['measured cost', (p) => p.costUsd > 0],
  ['strategy metrics', (p) => p.strategy?.adopted > 0 && typeof p.strategy.activeShare === 'number' && Array.isArray(p.strategy.perHouse)],
  ['power decisions and activations', (p) => Number.isInteger(p.powers?.requested) && Number.isInteger(p.powers?.activated) && p.powers.activated <= p.powers.requested],
  ['watchdog recoveries', (p) => Number.isInteger(p.watchdog?.recoveries)],
  ['motor/preset version', (p) => typeof p.motorVersion === 'string' && typeof p.preset === 'string'],
  ['recording timestamp', (p) => !Number.isNaN(Date.parse(p.recordedAt))],
  ['capture and rules versions', (p) => /^rivals-record\//.test(p.versions?.capture) && p.versions.rules === RIVAL_RULES_VERSION],
  ['Jev active to the finish', (p) => p.ceilings?.budgetStopped === null && p.ceilings.maxRequests >= 500 && p.ceilings.maxInputTokens >= 2_000_000],
  ['no raw movement', (p) => p.rawMovementActions === 0]
];

function checkEntries(entries) {
for (const e of entries) {
  const id = e.record.recordingID, p = e.provenance || {};
  const course = rivalPoolCourse(e.record.courseSlot);
  check(`${id}: record validates`, validateRivalRunRecord(e.record).ok);
  check(`${id}: record matches its course and rules`, rivalRecordMatchesCourse(e.record, course, RIVAL_RULES_VERSION));
  check(`${id}: all seven houses cleared`, e.record.clearTimes.length === RIVAL_HOUSES && e.record.elapsedMs === e.record.clearTimes[RIVAL_HOUSES - 1]);
  check(`${id}: no abandoned attempt`, e.record.attempts.every((a) => a.outcome !== 'abandoned'));
  check(`${id}: replay bundle validates, every segment included`,
    validateRivalReplayBundle(e.bundle, e.record, { validateSegment: validateReplaySegment }).ok);
  check(`${id}: every pickup/bunk matches the per-attempt assignment`, assignmentErrors(e.bundle).length === 0,
    assignmentErrors(e.bundle)[0]);
  check(`${id}: passes the assembler's full record+bundle check`, validateRecordAndBundle(e.record, e.bundle) === null,
    validateRecordAndBundle(e.record, e.bundle));
  check(`${id}: the record itself says Jev drove it`, e.record.driverConfig?.driver === 'jev-strategist' &&
    e.record.driverConfig.jev?.budgetStopped === null && e.record.driverConfig.jev?.route === 'typesafe-direct');
  check(`${id}: provenance agrees with the record`, p.model?.returned === e.record.driverConfig.jev.modelReturned &&
    p.recordedAt === e.record.recordedAt && p.preset === e.record.opponent.skillPreset);
  for (const [name, ok] of REQUIRED) check(`${id}: provenance has ${name}`, ok(p), JSON.stringify(p).slice(0, 80));
  const blob = JSON.stringify(e);
  check(`${id}: no credential-shaped value`, !/Bearer|authorization|api[_-]?key|jevKey|sk-[A-Za-z0-9]/i.test(blob));
}
}
checkEntries(entries);

// Separate from the ordinary bank, and not wired into the game.
{
  const v2Ids = new Set();
  for (const c of RIVAL_COURSE_POOL) {
    const f = join(v2Path, 'courses', c.courseID, 'opponents.json');
    if (!existsSync(f)) continue;
    for (const o of JSON.parse(readFileSync(f, 'utf8')).opponents) {
      v2Ids.add(o.record.recordingID);
      check(`v2 entry ${o.record.recordingID} is not a Jev race`, o.record.driverConfig?.driver !== 'jev-strategist' && !o.record.driverConfig?.jev);
    }
  }
  check('no recordingID is in both banks', entries.every((e) => !v2Ids.has(e.record.recordingID)));
  check('no v2 replay file is a Jev replay', readdirSync(join(v2Path, 'replays')).every((f) => !entries.some((e) => f === e.record.recordingID + '.json')));
  const srcHits = [];
  const walk = (d) => { for (const n of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, n.name);
    if (n.isDirectory()) walk(p); else if (/\.(js|mjs)$/.test(n.name) && readFileSync(p, 'utf8').includes('jev-v1')) srcHits.push(p);
  } };
  walk(decodeURIComponent(new URL('../src/', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'));
  // The game reads it through ONE place — rivalSession's opponent pool — and
  // from the path the assembler writes, which public/ serves as-is.
  const session = readFileSync(new URL('../src/utils/rivalSession.js', import.meta.url), 'utf8');
  check('the game reads the Jev bank only through the opponent pool',
    srcHits.length === 1 && /utils[\\/]rivalSession\.js$/.test(srcHits[0]) && session.includes("'/rivals/jev-v1/'"), srcHits.join(', '));
}

/* ---------------- the challenge banks: Apex and Rival Hard ---------------- */

// Same record, replay and provenance rules as jev-v1, one profile per bank,
// no recording shared with any other bank, and never read by the game: the
// challenge ghosts stay outside ordinary matchmaking.
const pathOf = (rel) => decodeURIComponent(new URL('../' + rel + '/', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const challenge = {};
for (const [bankId, rel, profiles] of [[JEV_APEX_BANK_ID, JEV_APEX_BANK_ROOT, [null, 'apex']], [JEV_RIVAL_HARD_BANK_ID, JEV_RIVAL_HARD_BANK_ROOT, ['rival', 'rival-hard']]]) {
  const dir = pathOf(rel);
  check(`the ${bankId} bank exists`, existsSync(join(dir, 'manifest.json')));
  const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  check(`${bankId}: manifest names its bank`, m.bank === bankId && m.rulesVersion === RIVAL_RULES_VERSION);
  const es = readJevBank(dir);
  challenge[bankId] = es;
  check(`${bankId}: every original course has an opponent`, [1, 2, 3, 4, 5, 6, 7].every((slot) => es.some((e) => e.record.courseSlot === slot)));
  check(`${bankId}: the manifest lists exactly the banked recordings`,
    JSON.stringify(m.courses.flatMap((c) => c.recordingIDs).sort()) === JSON.stringify(es.map((e) => e.record.recordingID).sort()));
  checkEntries(es);
  for (const e of es) {
    const profile = e.record.driverConfig?.jev?.profile ?? null;
    check(`${bankId} ${e.record.recordingID}: recorded with this bank's profile`, profiles.includes(profile), String(profile));
    check(`${bankId} ${e.record.recordingID}: match stash rules, so it can be raced`, e.record.stashRules === 'match-v1' && Number.isInteger(e.record.stashSeed));
  }
  check(`${bankId}: recording IDs unique`, new Set(es.map((e) => e.record.recordingID)).size === es.length);
}
{
  const ids = (es) => new Set(es.map((e) => e.record.recordingID));
  const a = ids(challenge[JEV_APEX_BANK_ID]), h = ids(challenge[JEV_RIVAL_HARD_BANK_ID]), n = ids(entries);
  check('no recording is in two Jev banks', [...a].every((x) => !h.has(x) && !n.has(x)) && [...h].every((x) => !n.has(x)));
  const hits = [];
  const walk = (d) => { for (const f of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, f.name);
    if (f.isDirectory()) walk(p); else if (/\.(js|mjs)$/.test(f.name) && /jev-apex-v1|jev-rival-hard-v1/.test(readFileSync(p, 'utf8'))) hits.push(p);
  } };
  walk(pathOf('src'));
  // A challenge bank is its own pool: named in one place, selectable only by
  // that name, and never part of ordinary matchmaking.
  check('challenge banks are named only in the opponent pool table',
    hits.length === 1 && /utils[\\/]rivalSession\.js$/.test(hits[0]), hits.join(', '));
  const { RIVAL_OPPONENT_POOLS, rivalPoolName } = await import('../src/utils/rivalSession.js');
  const roots = (name) => RIVAL_OPPONENT_POOLS[name].map((b) => b.root).join();
  check('ordinary matchmaking never reads a challenge bank (outside ordinary matchmaking)',
    !/jev-apex-v1|jev-rival-hard-v1/.test(roots('ordinary')), roots('ordinary'));
  check('each challenge bank is a pool of its own',
    roots('apex') === '/rivals/jev-apex-v1/' && roots('rival-hard') === '/rivals/jev-rival-hard-v1/');
  check('only an exact pool name selects a challenge bank',
    rivalPoolName(undefined) === 'ordinary' && rivalPoolName('Apex') === 'ordinary' && rivalPoolName('constructor') === 'ordinary' && rivalPoolName('apex') === 'apex');
}

/* ---------------- admission rules, on the banked races ---------------- */

{
  const first = { jev: { report: { logicalRequests: 10, answers: 10, tokensBilled: 1000, costUsd: 0.01,
    powers: { activated: 2 }, http: { attempts: 10, statuses: { 200: 10 } },
    houses: [{ house: 1 }, { house: 7 }], strategies: { adopted: 10 }, time: { jevMs: 5000 } } } };
  const second = { jev: { report: { logicalRequests: 17, answers: 17, tokensBilled: 1700, costUsd: 0.017,
    powers: { activated: 5 }, http: { attempts: 17, statuses: { 200: 17 } },
    houses: [...first.jev.report.houses, { house: 1 }, { house: 7 }],
    strategies: { adopted: 17 }, time: { jevMs: 8500 } } } };
  const delta = jevRaceReport({ races: [first, second] }, second);
  check('planned job race two uses only its own API, power and house counts',
    delta.logicalRequests === 7 && delta.tokensBilled === 700 && delta.powers.activated === 3 &&
    delta.http.statuses[200] === 7 && delta.houses.length === 2 && delta.strategies.adopted === 7);
}

// A raw capture reconstructed from a banked entry: the shape the recorder
// writes, with intent traces that match the record.
function captureOf(e, over = {}, raceOver = {}) {
  const course = rivalPoolCourse(e.record.courseSlot);
  const activated = e.provenance.powers.activated;
  let left = activated;
  const traces = e.record.attempts.map((a) => ({
    v: 1, seed: course.seeds[a.house - 1], routeID: e.record.courseID, round: a.house, role: 'runner', mode: 'pve',
    cols: course.cols, rows: course.rows, startedAt: 0,
    events: [[1, 'm', 1, 0], ...(left-- > 0 ? [[5, 'p', 0, 0]] : [])]
  }));
  while (left > 0) { traces[traces.length - 1].events.push([9, 'p', 1, 0]); left--; }
  const report = {
    logicalRequests: e.provenance.requests.logical, answers: e.provenance.requests.answers,
    model: e.provenance.model.returned, tokenSource: 'api', tokensBilled: e.provenance.tokens.billed,
    costUsd: e.provenance.costUsd, budgetStopped: null, rawMovementActions: 0,
    strategies: { adopted: e.provenance.strategy.adopted, rejected: {} },
    powers: { ...e.provenance.powers, unarmedActivations: 0 },
    houses: e.provenance.strategy.perHouse, http: { attempts: e.provenance.requests.httpAttempts },
    watchdog: {}, time: {}, triggers: {}, requestLimit: 500, tokenLimit: 2_000_000
  };
  return {
    file: 'synthetic/' + e.record.recordingID + '.json',
    payload: {
      tool: 'rivals-record/1',
      jev: { driver: 'jev-strategist', motor: 'runner-ai', route: 'typesafe-direct',
        relay: { requests: e.provenance.requests.logical, ok: e.provenance.requests.logical, statuses: { 200: 1 }, directBlocked: 0 },
        report: { ...report }, ...over.jev },
      environment: {},
      races: [{ ok: true, result: 'win', houses: 7, record: e.record, bundle: e.bundle, traces,
        jev: { report: { ...report, ...(raceOver.report || {}) } }, ...raceOver.race }]
    }
  };
}

if (entries.length) {
  const e = entries[0];
  const good = captureOf(e);
  const fresh = selectJevBank([], [good]);
  check('a reconstructed paid capture of a banked race is accepted', fresh.accepted.length === 1 && fresh.rejected.length === 0,
    JSON.stringify(fresh.rejected[0]));
  const again = selectJevBank(entries, [good]);
  check('re-reading a banked race is a no-op, not a second entry', again.accepted.length === entries.length && again.reimported === 1);

  const cases = [
    ['a mock', captureOf(e, { jev: { route: 'mock' } }), /mock/],
    ['a mock relay', captureOf(e, { jev: { relay: { mock: true, requests: 5 } } }), /mock/],
    ['an ordinary bot', { file: 'bot.json', payload: { ...good.payload, jev: null } }, /not a Jev capture/],
    ['a failed race', captureOf(e, {}, { race: { ok: false, reason: 'race has an abandoned attempt' } }), /not a valid race/],
    ['an incomplete race', captureOf(e, {}, { race: { houses: 5 } }), /incomplete/],
    ['a forfeit', captureOf(e, {}, { race: { result: 'forfeit' } }), /forfeit/],
    ['a budget-stopped race', captureOf(e, {}, { report: { budgetStopped: 'requests' } }), /budget stopped/],
    ['estimated (unbilled) tokens', captureOf(e, {}, { report: { tokenSource: 'estimated' } }), /billed/],
    ['a mock model', captureOf(e, {}, { report: { model: 'mock-strategist-1' } }), /model/],
    ['Jev silent in the last house', captureOf(e, {}, { report: { houses: e.provenance.strategy.perHouse.map((h) => h.house === 7 ? { ...h, requests: 0 } : h) } }), /last house/],
    ['a power Jev did not arm', captureOf(e, {}, { report: { powers: { ...e.provenance.powers, unarmedActivations: 1 } } }), /did not arm/]
  ];
  for (const [label, cap, reason] of cases) {
    const r = selectJevBank([], [cap]);
    check(`refused: ${label}`, r.accepted.length === 0 && reason.test(r.rejected[0]?.reason || ''), r.rejected[0]?.reason);
  }

  // Traces must belong to the record.
  const badSeed = captureOf(e); badSeed.payload.races[0].traces[0].seed ^= 1;
  check('refused: a trace on the wrong seed', /traces: .*seed/.test(selectJevBank([], [badSeed]).rejected[0]?.reason || ''));
  const short = captureOf(e); short.payload.races[0].traces.pop();
  check('refused: a missing trace', /traces: trace count/.test(selectJevBank([], [short]).rejected[0]?.reason || ''));
  const extraPower = captureOf(e); extraPower.payload.races[0].traces[0].events.push([99, 'p', 0, 0]);
  check('refused: trace power events that disagree with the strategist',
    /power events/.test(selectJevBank([], [extraPower]).rejected[0]?.reason || ''));
  // Profiles never cross banks.
  const hard = challenge[JEV_RIVAL_HARD_BANK_ID][0];
  if (hard) {
    const cap = captureOf(hard);
    check('refused: a Rival Hard race offered to the normal Jev bank', /never enters the normal Jev bank/.test(selectJevBank([], [cap], JEV_BANK_ID).rejected[0]?.reason || ''));
    check('refused: a Rival Hard race offered to the Apex bank', /not a Jev Apex capture/.test(selectJevBank([], [cap], JEV_APEX_BANK_ID).rejected[0]?.reason || ''));
    const apexCap = captureOf(hard);
    apexCap.payload.races[0].record = { ...hard.record, driverConfig: { ...hard.record.driverConfig, jev: { ...hard.record.driverConfig.jev, profile: 'apex' } } };
    check('refused: an Apex race offered to the Rival Hard bank', /not a Jev Rival Hard capture/.test(selectJevBank([], [apexCap], JEV_RIVAL_HARD_BANK_ID).rejected[0]?.reason || ''));
    check('refused: an Apex race offered to the normal Jev bank', /never enters the normal Jev bank/.test(selectJevBank([], [apexCap], JEV_BANK_ID).rejected[0]?.reason || ''));
  }
  check('traceErrors is quiet on a matching set', traceErrors(good.payload.races[0].traces, e.record, rivalPoolCourse(e.record.courseSlot), e.provenance.powers.activated).length === 0);

  // Duplicates: the same race under a second file is refused.
  const dup = selectJevBank([], [good, { ...captureOf(e), file: 'copy.json' }]);
  check('refused: the same race twice', dup.accepted.length === 1 && dup.reimported === 1);
  const tampered = captureOf(e);
  tampered.payload.races[0].record = { ...e.record, retries: e.record.retries + 1 };
  const clash = selectJevBank(entries, [tampered]);
  check('refused: a different payload under a banked recordingID', clash.rejected.some((r) => /record|duplicate/.test(r.reason)));

  // And a stash assignment that does not match the attempt fails.
  const flipped = JSON.parse(JSON.stringify(e.bundle));
  const seg = flipped.segments.find((s) => s.replay.events.some((ev) => ev.k === 'pickup'));
  seg.replay.events.find((ev) => ev.k === 'pickup').i ^= 1;
  check('refused: a pickup in the non-genuine pocket', assignmentErrors(flipped).length > 0);

  check('eligibility on the good capture is clean', jevEligibilityError(good.payload, good.payload.races[0]) === null);
}

console.log('');
if (failures.length) {
  console.log(`rival jev bank: ${passed} passed, ${failures.length} FAILED`);
  failures.slice(0, 30).forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log(`rival jev bank: ${passed} assertions passed across ${entries.length} opponents`);
