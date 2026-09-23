// Real players' shared Block Rivals races: what the submission accepts, what
// it refuses, what it stores, and the bank it feeds.
//
//   node client/test/rivalPlayerRuns.test.mjs
//
// The honesty baseline is the banked Jev races: every one, re-labelled as a
// player's race, must pass, so a real player playing the same game is never
// refused. Each kind of tampering must then fail.
import { readFileSync, readdirSync } from 'node:fs';
import {
  playerRunErrors, bankPlayerRun, submitPlayerRun, keepNewestPlayerRuns, attemptMotionErrors,
  PLAYER_RUNS_KEEP, PLAYER_RUNS_PER_DAY, PLAYER_RUN_MAX_BYTES, PLAYER_BANK_ROTATION_MIN, PLAYER_RUN_SOURCE
} from '../src/logic/rivalPlayerRuns.js';
import { buildRivalRunRecord, buildRivalReplayBundle } from '../src/logic/rivalRecords.js';
import { rivalPoolCourse, rivalSessionPocket } from '../src/logic/rivals.js';
import { assemblePlayerBank, playerBankReport } from '../tools/rivals-assemble-players.mjs';

let passed = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) passed++;
  else { failures.push(name + (detail ? ' — ' + detail : '')); console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const quiet = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('[MazeGen]')) quiet(...a); };

// A banked Jev race as the player's own export would have it: the same
// attempts and replay, the player's placeholder identity (the server
// replaces it).
function asPlayer(e, bank, overrides = {}) {
  const b = JSON.parse(readFileSync(new URL('../public/rivals/' + bank + '/' + e.replay, import.meta.url), 'utf8'));
  const attempts = overrides.attempts ?? e.record.attempts;
  const record = buildRivalRunRecord({
    rulesVersion: e.record.rulesVersion, course: rivalPoolCourse(e.record.courseSlot),
    opponent: overrides.opponent ?? { id: 'local-player', displayName: 'You', kind: 'human' },
    orderedPowers: e.record.orderedPowers, attempts, recordingID: overrides.recordingID ?? 'local-x',
    stashSeed: overrides.stashSeed ?? e.record.stashSeed
  });
  const segments = overrides.segments ?? b.segments.map((s) => s.replay);
  return { record, bundle: buildRivalReplayBundle(record, segments) };
}
const entries = [];
for (const bank of ['jev-v1', 'jev-apex-v1', 'jev-rival-hard-v1']) {
  const dir = new URL('../public/rivals/' + bank + '/courses/', import.meta.url);
  for (const c of readdirSync(dir)) for (const e of JSON.parse(readFileSync(new URL(c + '/opponents.json', dir), 'utf8')).opponents) entries.push({ e, bank });
}

/* ---------------- honest play passes ---------------- */
{
  const bad = [];
  for (const { e, bank } of entries) {
    const run = asPlayer(e, bank);
    const errs = playerRunErrors(run.record, run.bundle);
    if (errs.length) bad.push(e.record.recordingID + ': ' + errs[0]);
  }
  check(`every banked Jev race (${entries.length}) passes as a player's race`, bad.length === 0 && entries.length > 150, bad.slice(0, 3).join(' | '));
}

// One ordinary race to tamper with: the first Normal race with a dash in it.
const base = entries.find(({ e, bank }) => bank === 'jev-v1' && e.record.orderedPowers.includes('dash'));
const fresh = () => asPlayer(base.e, base.bank);
const segs = () => fresh().bundle.segments.map((s) => clone(s.replay));
const rebuilt = (segments, extra = {}) => asPlayer(base.e, base.bank, { segments, ...extra });
const errorsOf = (run) => playerRunErrors(run.record, run.bundle);
const has = (errs, re) => errs.some((m) => re.test(m));

/* ---------------- tampering fails ---------------- */
{
  let s = segs(); const f = s[0].frames, i = Math.floor(f.length / 2);
  f[i][1] += 5; // five cells in one sample
  let errs = errorsOf(rebuilt(s));
  check('a teleport is refused', has(errs, /runner moved|inside a wall/), errs[0]);

  // Sped-up clock: every time in the race shrunk to 80%.
  const k = 0.8, sc = (t) => Math.round(t * k * 10) / 10;
  const attempts = base.e.record.attempts.map((a) => ({ ...a, startedMs: sc(a.startedMs), endedMs: sc(a.endedMs), clearMs: a.clearMs == null ? null : sc(a.clearMs) }));
  s = segs().map((seg) => ({ ...seg, durationMs: sc(seg.durationMs),
    frames: seg.frames.map((fr) => [sc(fr[0]), ...fr.slice(1)]), events: seg.events.map((ev) => ({ ...ev, t: sc(ev.t) })) }));
  errs = errorsOf(rebuilt(s, { attempts }));
  check('a sped-up clock is refused', has(errs, /pace|runner moved/), errs[0]);

  s = segs();
  const withPickup = s.findIndex((seg) => seg.events.some((ev) => ev.k === 'pickup'));
  s[withPickup].events.find((ev) => ev.k === 'pickup').i ^= 1;
  errs = errorsOf(rebuilt(s));
  check('taking the bunk bag as the real one is refused', has(errs, /bunk bag/), errs[0]);

  s = segs();
  const withPower = s.findIndex((seg) => seg.events.some((ev) => ev.k === 'power'));
  if (withPower >= 0) {
    const pe = s[withPower].events.find((ev) => ev.k === 'power');
    s[withPower].events.push({ ...pe, t: pe.t + 500 });
    s[withPower].events.sort((a, b) => a.t - b.t);
    errs = errorsOf(rebuilt(s));
    check('a power used twice in one attempt is refused', has(errs, /used twice/), errs[0]);
  }

  s = segs(); s[0].houseSeed = (s[0].houseSeed + 1) >>> 0;
  errs = errorsOf(rebuilt(s));
  check('a house that is not the course house is refused', has(errs, /course house/), errs[0]);

  s = segs(); s[0].stashes = [s[0].stashes[1], s[0].stashes[0]];
  errs = errorsOf(rebuilt(s));
  check('swapped bag pockets are refused', has(errs, /pockets/), errs[0]);

  let other = base.e.record.stashSeed;
  do other = (other + 7919) >>> 0; while (base.e.record.courseSeeds.every((h) => rivalSessionPocket(h, other) === rivalSessionPocket(h, base.e.record.stashSeed)));
  errs = errorsOf(rebuilt(segs(), { stashSeed: other }));
  check('a different stash seed than the replay is refused', errs.length > 0, errs[0]);

  s = segs(); s[0].frames.splice(5, 40);
  errs = errorsOf(rebuilt(s));
  check('a hole in the samples is refused', has(errs, /hole|runner moved/), errs[0]);

  const bot = asPlayer(base.e, base.bank, { opponent: { id: 'b', displayName: 'B', kind: 'bot', driverVersion: 'x', skillPreset: 'ace' } });
  check('a bot race is not a player race', has(errorsOf(bot), /not a player race/));

  const edited = fresh(); edited.record.clearTimes[6] -= 1000;
  check('an edited clear time is refused', errorsOf(edited).length > 0);

  // The motion check alone on an untouched attempt.
  check('an untouched attempt moves legally', attemptMotionErrors(segs()[0], base.e.record.orderedPowers).length === 0);
}

/* ---------------- the submission ---------------- */
function world({ meta = { username: 'NeonFox', token: 'tok-1' }, count = 1 } = {}) {
  const kv = new Map();
  return { kv, deps: {
    userMeta: async (id) => (id === 'user-1' ? meta : null),
    countToday: async () => count,
    playerKey: async (id) => 'player-' + id.length + 'abc',
    store: { get: async (k) => kv.get(k) ?? null, set: async (k, v) => { kv.set(k, v); }, list: async (p) => [...kv.keys()].filter((k) => k.startsWith(p)), delete: async (k) => { kv.delete(k); } },
    now: (() => { let t = Date.parse('2026-09-23T12:00:00Z'); return () => (t += 1000); })()
  } };
}
const body = (run, extra = {}) => JSON.stringify({ userId: 'user-1', token: 'tok-1', consent: true, ...run, ...extra });
{
  const run = fresh();
  let w = world();
  let r = await submitPlayerRun(body(run, { consent: false }), w.deps);
  check('no consent, nothing stored', r.status === 400 && w.kv.size === 0);
  r = await submitPlayerRun(body(run, { token: 'wrong' }), w.deps);
  check('a wrong token is refused', r.status === 403 && w.kv.size === 0);
  r = await submitPlayerRun(body(run, { userId: 'someone-else' }), w.deps);
  check('an unknown player is refused', r.status === 403);
  r = await submitPlayerRun('x'.repeat(PLAYER_RUN_MAX_BYTES + 1), w.deps);
  check('an oversized body is refused', r.status === 413);
  const broken = fresh(); broken.bundle.segments[0].replay.frames[3][1] += 6;
  r = await submitPlayerRun(body(broken), w.deps);
  check('a tampered run is refused and not stored', r.status === 422 && w.kv.size === 0, r.body.error);

  // A browser can carry an old account id first and the id its identity was
  // provisioned under second; the token decides which one is the player.
  r = await submitPlayerRun(body(run, { userId: 'old-account-id', userIds: ['old-account-id', 'user-1'] }), world().deps);
  check('the id the token belongs to is used when a browser has two', r.status === 200 && r.body.ok, JSON.stringify(r.body));
  r = await submitPlayerRun(body(run, { userId: 'old-account-id', userIds: ['old-account-id', 'nobody'] }), world().deps);
  check('a token for neither id is still refused', r.status === 403);

  r = await submitPlayerRun(body(run), w.deps);
  check('an honest run is accepted', r.status === 200 && r.body.ok && /^player-/.test(r.body.recordingID), JSON.stringify(r.body));
  const keys = [...w.kv.keys()];
  const pending = keys.filter((k) => k.startsWith('pending/'));
  check('it waits as pending, under its course and an opaque player key', pending.length === 1 && pending[0].startsWith('pending/' + run.record.courseSlot + '/player-'));
  const stored = JSON.parse(w.kv.get(pending[0]));
  check('stored under the player\'s server display name, not the client\'s', stored.record.opponent.displayName === 'NeonFox' && stored.record.opponent.kind === 'human');
  check('no account id or token is stored', !/user-1|tok-1/.test(w.kv.get(pending[0])));
  check('the stored run is a valid, unverified player run', playerRunErrors(stored.record, stored.bundle).length === 0 && stored.record.verified === false &&
    stored.record.driverConfig.driver === 'player' && stored.record.driverConfig.source === PLAYER_RUN_SOURCE);
  check('with the race\'s stash seed and times intact', stored.record.stashSeed === run.record.stashSeed && stored.record.clearTimes.join() === run.record.clearTimes.join());

  r = await submitPlayerRun(body(run), w.deps);
  check('the same run twice is stored once', r.status === 200 && r.body.duplicate === true && [...w.kv.keys()].filter((k) => k.startsWith('pending/')).length === 1);

  const busy = world({ count: PLAYER_RUNS_PER_DAY + 1 });
  r = await submitPlayerRun(body(run), busy.deps);
  check('the daily limit holds', r.status === 429 && ![...busy.kv.keys()].some((k) => k.startsWith('pending/')));

  // Four different runs on one course: only the newest three wait.
  const cap = world();
  for (let n = 0; n < PLAYER_RUNS_KEEP + 1; n++) {
    const variant = asPlayer(base.e, base.bank, { recordingID: 'local-' + n });
    await submitPlayerRun(body(variant), cap.deps);
  }
  const waiting = [...cap.kv.keys()].filter((k) => k.startsWith('pending/')).sort();
  check(`only the newest ${PLAYER_RUNS_KEEP} per player per course are kept`, waiting.length === PLAYER_RUNS_KEEP);
}

/* ---------------- the bank ---------------- */
{
  const w = world();
  const banked = [];
  for (let n = 0; n < 5; n++) {
    const variant = asPlayer(base.e, base.bank, { recordingID: 'local-b' + n });
    await submitPlayerRun(body(variant), w.deps);
  }
  for (const [k, v] of w.kv) if (k.startsWith('pending/')) banked.push({ file: k, ...JSON.parse(v) });
  const raw = { file: 'raw.json', ...fresh() };
  const { accepted, rejected } = assemblePlayerBank([], [...banked, raw]);
  check('the bank takes server-checked runs', accepted.length === banked.length && banked.length === PLAYER_RUNS_KEEP);
  check('and refuses anything that did not come through the submission', rejected.length === 1 && rejected[0].file === 'raw.json');
  const again = assemblePlayerBank(accepted, banked);
  check('re-running the bank adds nothing twice', again.accepted.length === accepted.length);
  const [kept] = keepNewestPlayerRuns(accepted.concat(accepted.map((a) => ({ ...a, record: { ...a.record, recordingID: a.record.recordingID + 'x', recordedAt: '2020-01-01T00:00:00Z' } }))));
  check('older runs of the same player and course give way', kept.length === PLAYER_RUNS_KEEP && kept.every((k) => !k.record.recordingID.endsWith('x')));
  const report = playerBankReport(accepted);
  check('the report counts toward the rotation threshold', report.total === accepted.length && report.rotationAt === PLAYER_BANK_ROTATION_MIN && report.ready === false && report.perCourse.length === 21);
}

/* ---------------- nobody meets a player's run yet ---------------- */
{
  const session = readFileSync(new URL('../src/utils/rivalSession.js', import.meta.url), 'utf8');
  check('no matchmaking pool reads the player bank', !/players-v1/.test(session));
  const fn = readFileSync(new URL('../netlify/functions/rivals-run.mjs', import.meta.url), 'utf8');
  check('the submission only ever stores pending runs, never files', fn.includes('submitPlayerRun') && !/node:fs|writeFile/.test(fn));
}

console.log = quiet;
console.log('');
if (failures.length) { console.log(`rival player runs: ${passed} passed, ${failures.length} FAILED`); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
console.log(`rival player runs: ${passed} assertions passed`);
