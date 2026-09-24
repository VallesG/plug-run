// The Daily Race: same race for everyone each UTC day, streaks, official times,
// and the server's daily ranking.
import assert from 'node:assert/strict';
import {
  DAILY_EPOCH_MS, dailyNumber, dailySlot, dailyRival, recordDaily, liveStreak, dailyNote, EMPTY_DAILY, raceTimeLabel, finishMs, dailyDateLabel,
  claimDaily, dailyUnfinished, dailyBoardRows
} from '../src/logic/dailyRace.js';
import { createTelegramHandler } from '../netlify/functions/telegram.mjs';
import { enabledRivalCourses } from '../src/logic/rivals.js';

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const DAY = 86400000;

// Numbering: UTC days, #1 on the launch day.
eq(dailyNumber(DAILY_EPOCH_MS), 1, 'launch day is #1');
eq(dailyNumber(DAILY_EPOCH_MS + DAY - 1), 1, 'still #1 at 23:59:59 UTC');
eq(dailyNumber(DAILY_EPOCH_MS + DAY), 2, '#2 at midnight UTC');
eq(dailyNumber(DAILY_EPOCH_MS - 5 * DAY), 1, 'never below 1');

// The same race on every device: course and rival depend only on the day.
const slots = enabledRivalCourses().map((c) => c.slot);
ok(slots.length >= 7, 'there are courses to pick from');
eq(dailySlot(12, slots), dailySlot(12, [...slots].reverse()), 'course pick ignores list order');
const picks = new Set(Array.from({ length: 60 }, (_, i) => dailySlot(i + 1, slots)));
ok(picks.size >= Math.min(12, slots.length), 'two months of dailies visit many courses (' + picks.size + ')');
const T = (end) => [1, 2, 3, 4, 5, 6, end];
const entries = [
  { record: { recordingID: 'b-jev', stashSeed: 2, clearTimes: T(70000), retries: 0, driverConfig: { driver: 'jev' } } },
  { record: { recordingID: 'a-bot', stashSeed: 1, clearTimes: T(60000), retries: 0 } },
  { record: { recordingID: 'c-jev', stashSeed: 3, clearTimes: T(72000), retries: 1, driverConfig: { driver: 'jev' } } },
  { record: { recordingID: 'd-old', clearTimes: T(50000) } }
];
const isJev = (r) => r.driverConfig?.driver === 'jev';
const r1 = dailyRival(5, entries, isJev), r2 = dailyRival(5, [...entries].reverse(), isJev);
eq(r1.record.recordingID, r2.record.recordingID, 'rival pick ignores load order');
ok(isJev(r1.record), 'Jev is preferred when the course has him');
eq(dailyRival(5, [entries[1], entries[3]], isJev).record.recordingID, 'a-bot', 'otherwise any race with a stash layout');
eq(dailyRival(5, [entries[3]], isJev), null, 'no usable race: null');

// Official results and streaks.
let s = { ...EMPTY_DAILY, days: {} };
let out = recordDaily(s, 10, { ms: 64321, houses: 7, retries: 1 });
ok(out.official && out.state.streak === 1 && out.state.last === 10, 'first finish is official and starts a streak');
s = out.state;
out = recordDaily(s, 10, { ms: 50000, houses: 7 });
ok(!out.official && out.state.days[10].ms === 64321, 'a second run the same day is practice; the official time stands');
s = recordDaily(s, 11, { ms: 70000, houses: 7 }).state;
eq([s.streak, s.best], [2, 2], 'next day extends the streak');
eq(liveStreak(s, 12), 2, 'the streak is alive the day after');
eq(liveStreak(s, 13), 0, 'a missed day ends it');
s = recordDaily(s, 12, { ms: 90000, houses: 4 }).state;
eq([s.streak, s.last], [2, 11], 'an unfinished daily is recorded but does not extend the streak');
s = recordDaily(s, 14, { ms: 60000, houses: 7 }).state;
eq([s.streak, s.best], [1, 2], 'after a gap the streak restarts, best is kept');
s = recordDaily(s, 60, { ms: 60000, houses: 7 }).state;
ok(!s.days[10] && s.days[60], 'history keeps about a month');

// The official run is claimed at GO: finished or not, it is the day's one.
{
  let st = { ...EMPTY_DAILY, days: {} };
  const c = claimDaily(st, 20);
  ok(c.official && dailyUnfinished(c.state.days[20]), 'GO on the first race claims the day');
  ok(!claimDaily(c.state, 20).official, 'a later race cannot claim it again');
  const unclaimed = recordDaily(c.state, 20, { ms: 61000, houses: 7 });
  ok(!unclaimed.official, 'a race that did not claim the day cannot fill the claim in');
  const done = recordDaily(c.state, 20, { ms: 61000, houses: 7, claimed: true });
  ok(done.official && done.state.days[20].ms === 61000 && !dailyUnfinished(done.state.days[20]) && done.state.streak === 1, 'the claiming run finishes as the official one');
  ok(!recordDaily(done.state, 20, { ms: 50000, houses: 7, claimed: true }).official, 'and nothing replaces it');
  eq(dailyNote(c.state, 20), 'DID NOT FINISH', 'a claimed run that never finished says so on the menu');
  ok(recordDaily(st, 21, { ms: 61000, houses: 7 }).official, 'a day nobody claimed still takes its first finish');
}

// The leaderboard's rows.
{
  const board = { total: 31, top: [{ rank: 1, name: 'Ana', ms: 61000 }, { rank: 2, name: 'a very long telegram name', ms: 62540 }], you: { rank: 14, ms: 70100 } };
  const rows = dailyBoardRows(board);
  eq(rows.map((r) => r.rank), [1, 2, 14], 'top rows, then yours under them');
  eq(rows[0], { rank: 1, name: 'ANA', time: '1:01.0', you: false }, 'a row: rank, name, time');
  eq(rows[1].name.length, 16, 'long names are cut to fit');
  ok(rows[2].you && rows[2].below, 'your own row sits below the top ten');
  const inTop = dailyBoardRows({ total: 2, top: [{ rank: 1, name: 'Ana', ms: 61000, you: true }], you: { rank: 1, ms: 61000 } });
  ok(inTop.length === 1 && inTop[0].you, 'already in the top ten: no second row');
  eq(dailyBoardRows(null), [], 'nothing to show without an answer');
  eq(dailyBoardRows({ top: Array.from({ length: 14 }, (_, i) => ({ rank: i + 1, name: 'R' + i, ms: 60000 + i })) }).length, 10, 'ten at most');
}

// The menu row's line.
eq(dailyNote({ ...EMPTY_DAILY, days: {} }, 3), 'NEW RACE TODAY', 'fresh player');
eq(dailyNote({ days: {}, streak: 4, last: 2 }, 3), 'NEW RACE TODAY  ·  🔥 4', 'waiting today with a live streak');
eq(dailyNote({ days: { 3: { ms: 64321, houses: 7, rank: 14 } }, streak: 5, last: 3 }, 3), '✓ 1:04.3  ·  #14  ·  🔥 5', 'done today, ranked');
eq(raceTimeLabel(64321), '1:04.3', 'time label');

// Server: only a checked run ranks. A real race (the day's own Jev run, sent as
// a player's) is accepted; every way of faking one is refused.
{
  const { readFileSync, readdirSync } = await import('node:fs');
  const { buildRivalRunRecord, buildRivalReplayBundle } = await import('../src/logic/rivalRecords.js');
  const { rivalPoolCourse } = await import('../src/logic/rivals.js');
  const bankRoot = new URL('../public/rivals/jev-v1/', import.meta.url);
  const byCourse = new Map();
  for (const c of readdirSync(new URL('courses/', bankRoot))) byCourse.set(c, JSON.parse(readFileSync(new URL('courses/' + c + '/opponents.json', bankRoot), 'utf8')));
  const realJev = (r) => r?.driverConfig?.driver === 'jev-strategist' && !!r.driverConfig.jev;
  const asPlayer = (e) => {
    const b = JSON.parse(readFileSync(new URL(e.replay, bankRoot), 'utf8'));
    const record = buildRivalRunRecord({ rulesVersion: e.record.rulesVersion, course: rivalPoolCourse(e.record.courseSlot),
      opponent: { id: 'local-player', displayName: 'You', kind: 'human' }, orderedPowers: e.record.orderedPowers,
      attempts: e.record.attempts, recordingID: 'local-x', stashSeed: e.record.stashSeed });
    return { record, bundle: buildRivalReplayBundle(record, b.segments.map((x) => x.replay)) };
  };
  const n = 10;
  const slot = dailySlot(n, enabledRivalCourses().map((c) => c.slot));
  const course = rivalPoolCourse(slot);
  const bank = byCourse.get(course.id);
  const pick = dailyRival(n, bank.opponents, realJev);
  const other = bank.opponents.find((e) => realJev(e.record) && e.record.stashSeed !== pick.record.stashSeed && e.record.retries <= 1);
  const good = asPlayer(pick), wrongSeed = asPlayer(other);
  const raceS = Math.ceil(finishMs(pick.record) / 1000);

  let clock = Math.floor((DAILY_EPOCH_MS + (n - 1) * DAY) / 1000) + 3600;
  const store = new Map(), blobs = new Map();
  const z = (k) => store.get(k) || (store.set(k, new Map()), store.get(k));
  const redis = async ([cmd, key, ...a]) => {
    if (cmd === 'GET') { const v = store.get(key); return v instanceof Map ? null : v ?? null; }
    if (cmd === 'SET') { if (a.includes('NX') && store.has(key)) return null; store.set(key, a[0]); return 'OK'; }
    if (cmd === 'INCR') { const v = Number(store.get(key) || 0) + 1; store.set(key, String(v)); return v; }
    if (cmd === 'EXPIRE') return 1;
    if (cmd === 'HSET') { z(key).set(a[0], a[1]); return 1; }
    if (cmd === 'ZADD') { const nx = a[0] === 'NX'; const [score, member] = nx ? a.slice(1) : a; if (nx && z(key).has(member)) return 0; z(key).set(member, Number(score)); return 1; }
    if (cmd === 'ZSCORE') { const v = z(key).get(a[0]); return v === undefined ? null : String(v); }
    if (cmd === 'ZCARD') return z(key).size;
    // Redis orders equal scores by member.
    const sorted = () => [...z(key).entries()].sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : 1));
    if (cmd === 'ZRANK') { const i = sorted().map(([m]) => m).indexOf(a[0]); return i < 0 ? null : i; }
    if (cmd === 'ZRANGE') return sorted().slice(Number(a[0]), Number(a[1]) + 1).flatMap(([m, sc]) => [m, String(sc)]);
    if (cmd === 'HMGET') return a.map((f) => z(key).get(f) ?? null);
    throw new Error(cmd);
  };
  let fetches = 0;
  const fetchImpl = async (url) => {
    fetches++;
    const m = String(url).match(/\/rivals\/jev-v1\/courses\/([^/]+)\/opponents\.json$/);
    if (!m) throw new Error('unexpected fetch ' + url);
    return { json: async () => byCourse.get(decodeURIComponent(m[1])) };
  };
  const h = createTelegramHandler({ token: () => 'x:y', redis, fetchImpl, nowSec: () => clock,
    dailyRuns: async () => ({ set: async (k, v) => { blobs.set(k, JSON.parse(v)); } }) });
  const post = async (action, body) => {
    const res = await h({ url: 'https://plugrun.io/.netlify/functions/telegram?action=' + action, method: 'POST', text: async () => JSON.stringify(body) });
    return { status: res.status, json: JSON.parse(await res.text()) };
  };
  const users = [['u_a', 'Ana', '111'], ['u_b', 'Ben', null], ['u_c', 'Cy', null], ['u_d', 'Dee', null], ['u_e', 'Eli', null], ['u_f', 'Fay', null],
    ['u_g', 'Gus', null], ['u_h', 'Hal', null], ['u_i', 'Ivy', null]];
  for (const [id, name, tg] of users) store.set('user:' + id, JSON.stringify({ username: name, token: 't_' + id, ...(tg ? { telegramId: tg } : {}) }));
  const auth = (id) => ({ userId: id, token: 't_' + id, day: n });

  eq((await post('daily-start', { ...auth('u_a'), day: n + 1 })).status, 400, 'no ticket for another day');
  eq((await post('daily-start', { userId: 'u_a', token: 'bad', day: n })).status, 403, 'a ticket needs the player token');
  eq((await post('daily-submit', { ...auth('u_b'), houses: 7, ...good })).json.reason, 'no start ticket', 'no start ticket: not ranked');

  // A fair official run: ticket, race, send.
  const t1 = await post('daily-start', auth('u_a'));
  ok(t1.json.first === true, 'first start takes the ticket');
  ok((await post('daily-start', auth('u_a'))).json.first === false, 'a second start does not reset it');
  clock += raceS + 25;
  const fair = await post('daily-submit', { ...auth('u_a'), houses: 7, ...good });
  ok(fair.json.verified === true && fair.json.rank === 1 && fair.json.total === 1, 'a checked run ranks #1 of 1');
  eq(fair.json.ms, Math.round(finishMs(pick.record)), 'the ranked time is the recording\'s own clock');
  const kept = blobs.get(n + '/u_a');
  ok(kept && kept.name === 'Ana' && kept.telegram === true && kept.record && kept.bundle, 'the run is kept for the prize review, marked Telegram');
  eq(z('daily:' + n + ':telegram').get('u_a'), '111', 'prize eligibility follows the Telegram account');
  ok((await post('daily-submit', { ...auth('u_a'), houses: 7, ...good })).json.duplicate === true, 'a second run never replaces the official one');
  eq(fetches, 1, 'the day\'s race is worked out once and cached');

  // Every way of faking one.
  await post('daily-start', auth('u_c')); clock += raceS + 10;
  eq((await post('daily-submit', { ...auth('u_c'), houses: 7, ...wrongSeed })).json.reason, 'not today\'s stash layout', 'another stash layout: refused');
  await post('daily-start', auth('u_d')); clock += raceS + 10;
  const edited = JSON.parse(JSON.stringify(good)); edited.record.clearTimes = edited.record.clearTimes.map((t) => t / 2);
  ok((await post('daily-submit', { ...auth('u_d'), houses: 7, ...edited })).json.verified === false, 'an edited clock fails the record checks');
  eq((await post('daily-submit', { ...auth('u_d'), houses: 7 })).json.reason, 'no recording', 'no recording: not ranked');
  await post('daily-start', auth('u_e')); clock += 10;
  eq((await post('daily-submit', { ...auth('u_e'), houses: 7, ...good })).json.reason, 'finished faster than the clock allows', 'faster than the time since its start: refused');
  await post('daily-start', auth('u_f')); clock += raceS + 60 * 30;
  eq((await post('daily-submit', { ...auth('u_f'), houses: 7, ...good })).json.reason, 'sent too long after the start', 'held back and sent later: refused');
  const short = await post('daily-submit', { ...auth('u_b'), houses: 4 });
  ok(short.json.rank === null && short.json.verified === false, 'an unfinished daily is counted as played, not ranked');
  // The ticket is sent at GO: one that lands a few seconds late (slow network,
  // cold function) must not refuse a fair run.
  await post('daily-start', auth('u_g')); clock += raceS - 12;
  ok((await post('daily-submit', { ...auth('u_g'), houses: 7, ...good })).json.verified === true, 'a ticket that landed late still ranks a fair run');
  eq(z('daily:' + n).size, 2, 'only the checked runs are on the board');

  // Midnight: a race that reaches GO just after it started from yesterday's screen.
  const saved = clock, midnight = (DAILY_EPOCH_MS + n * DAY) / 1000;
  clock = midnight + 120;
  ok((await post('daily-start', auth('u_h'))).json.first === true, 'GO two minutes past midnight still takes yesterday\'s ticket');
  clock = midnight + 900;
  eq((await post('daily-start', auth('u_i'))).status, 400, 'fifteen minutes past, yesterday is closed');
  clock = saved;

  // The leaderboard: public, names and times only.
  const get = async (q) => {
    const res = await h({ url: 'https://plugrun.io/.netlify/functions/telegram?action=daily-board&' + q, method: 'GET' });
    return { status: res.status, text: await res.text() };
  };
  const b1 = await get('day=' + n + '&userId=u_g');
  const board = JSON.parse(b1.text);
  eq(board.total, 2, 'the board counts the ranked runs');
  eq(board.top.map((e) => [e.rank, e.name, e.ms]), [[1, 'Ana', Math.round(finishMs(pick.record))], [2, 'Gus', Math.round(finishMs(pick.record))]], 'top rows: rank, name, time (ties by account)');
  ok(board.top[1].you === true && !board.top[0].you && board.you.rank === 2, 'the asking player is marked');
  ok(!/u_[a-i]/.test(b1.text) && !/111/.test(b1.text), 'no account ids or Telegram ids leave the server');
  eq(JSON.parse((await get('day=' + n + '&userId=u_b')).text).you, null, 'an unranked player has no row');
  eq((await get('day=' + (n + 5))).status, 400, 'no board for a future day');
  ok(Number(store.get('daily:' + n + ':refused')) >= 5, 'refusals are counted');
}

// Against the real bank: for two months of dailies, every pick is a strong, clean Jev run.
{
  const { readdirSync, readFileSync } = await import('node:fs');
  const dir = new URL('../public/rivals/jev-v1/courses/', import.meta.url);
  const bySlot = new Map();
  for (const c of readdirSync(dir)) { const o = JSON.parse(readFileSync(new URL(c + '/opponents.json', dir), 'utf8')); bySlot.set(o.courseSlot, o.opponents); }
  const realJev = (r) => r?.driverConfig?.driver === 'jev-strategist' && !!r.driverConfig.jev;
  let worst = 0;
  for (let n = 1; n <= 60; n++) {
    const slot = dailySlot(n, [...bySlot.keys()]);
    const list = bySlot.get(slot);
    const pick = dailyRival(n, list, realJev);
    const times = list.map((e) => finishMs(e.record)).filter((t) => t !== null).sort((a, b) => a - b);
    const median = times[times.length >> 1];
    ok(pick && pick.record.retries <= 1, 'daily #' + n + ' rival is clean');
    ok(finishMs(pick.record) <= median, 'daily #' + n + ' rival is faster than the course median');
    worst = Math.max(worst, finishMs(pick.record));
  }
  ok(worst < 150000, 'the slowest daily rival in two months finishes in ' + Math.round(worst / 1000) + ' s');
}

console.log('dailyRace: ' + checks + ' assertions passed');
