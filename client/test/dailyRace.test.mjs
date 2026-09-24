// The Daily Race: same race for everyone each UTC day, streaks, official times,
// and the server's daily ranking.
import assert from 'node:assert/strict';
import {
  DAILY_EPOCH_MS, dailyNumber, dailySlot, dailyRival, recordDaily, liveStreak, dailyNote, EMPTY_DAILY, raceTimeLabel, finishMs, dailyDateLabel
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

// The menu row's line.
eq(dailyNote({ ...EMPTY_DAILY, days: {} }, 3), 'NEW RACE TODAY', 'fresh player');
eq(dailyNote({ days: {}, streak: 4, last: 2 }, 3), 'NEW RACE TODAY  ·  🔥 4', 'waiting today with a live streak');
eq(dailyNote({ days: { 3: { ms: 64321, houses: 7, rank: 14 } }, streak: 5, last: 3 }, 3), '✓ 1:04.3  ·  #14  ·  🔥 5', 'done today, ranked');
eq(raceTimeLabel(64321), '1:04.3', 'time label');

// Server: first seven-house finish of the day ranks; only current dailies.
{
  const NOW = Math.floor((DAILY_EPOCH_MS + 9 * DAY + 3600000) / 1000); // during Daily #10
  const store = new Map();
  const z = (k) => store.get(k) || (store.set(k, new Map()), store.get(k));
  const redis = async ([cmd, key, ...a]) => {
    if (cmd === 'GET') return store.get(key) ?? null;
    if (cmd === 'SET') { store.set(key, a[0]); return 'OK'; }
    if (cmd === 'INCR') { const n = Number(store.get(key) || 0) + 1; store.set(key, String(n)); return n; }
    if (cmd === 'EXPIRE') return 1;
    if (cmd === 'HSET') { z(key).set(a[0], a[1]); return 1; }
    if (cmd === 'ZADD') { const nx = a[0] === 'NX'; const [score, member] = nx ? a.slice(1) : a; if (nx && z(key).has(member)) return 0; z(key).set(member, Number(score)); return 1; }
    if (cmd === 'ZCARD') return z(key).size;
    if (cmd === 'ZRANK') { const sorted = [...z(key).entries()].sort((x, y) => x[1] - y[1]).map(([m]) => m); const i = sorted.indexOf(a[0]); return i < 0 ? null : i; }
    throw new Error(cmd);
  };
  const h = createTelegramHandler({ token: () => 'x:y', redis, nowSec: () => NOW });
  const submit = async (body) => {
    const res = await h({ url: 'https://plugrun.io/.netlify/functions/telegram?action=daily-submit', method: 'POST', text: async () => JSON.stringify(body) });
    return { status: res.status, json: JSON.parse(await res.text()) };
  };
  for (const [id, name] of [['u_a', 'Ana'], ['u_b', 'Ben'], ['u_c', 'Cy']]) store.set('user:' + id, JSON.stringify({ username: name, token: 't_' + id }));
  eq((await submit({ userId: 'u_a', token: 'bad', day: 10, ms: 60000, houses: 7 })).status, 403, 'needs the player token');
  eq((await submit({ userId: 'u_a', token: 't_u_a', day: 8, ms: 60000, houses: 7 })).status, 400, 'an old daily is refused');
  eq((await submit({ userId: 'u_a', token: 't_u_a', day: 11, ms: 60000, houses: 7 })).status, 400, 'tomorrow is refused');
  const a = await submit({ userId: 'u_a', token: 't_u_a', day: 10, ms: 60000, houses: 7 });
  eq([a.json.rank, a.json.total], [1, 1], 'first finisher is #1 of 1');
  const b = await submit({ userId: 'u_b', token: 't_u_b', day: 10, ms: 55000, houses: 7 });
  eq([b.json.rank, b.json.total], [1, 2], 'a faster time ranks first');
  const again = await submit({ userId: 'u_a', token: 't_u_a', day: 10, ms: 40000, houses: 7 });
  eq(again.json.rank, 2, 'a second submission does not replace the official time');
  const short = await submit({ userId: 'u_c', token: 't_u_c', day: 10, ms: 30000, houses: 5 });
  eq([short.json.rank, short.json.total], [null, 2], 'an unfinished daily is counted as played, not ranked');
  eq(store.get('daily:10:plays'), '4', 'plays are counted');
  eq((await submit({ userId: 'u_c', token: 't_u_c', day: 9, ms: 65000, houses: 7 })).json.rank, 1, 'yesterday is still accepted (a race across midnight)');
}

// A good challenge: Jev's clean, fast runs only.
{
  const many = Array.from({ length: 40 }, (_, i) => ({ record: { recordingID: 'j' + String(i).padStart(2, '0'), stashSeed: i, clearTimes: T(60000 + i * 1000), retries: i % 5 === 0 ? 3 : 0, driverConfig: { driver: 'jev' } } }));
  many.push({ record: { recordingID: 'stuck', stashSeed: 99, clearTimes: T(467000), retries: 29, driverConfig: { driver: 'jev' } } });
  const chosen = new Set(Array.from({ length: 200 }, (_, i) => dailyRival(i + 1, many, isJev).record.recordingID));
  ok(!chosen.has('stuck'), 'a stuck 467 s run is never the daily rival');
  ok([...chosen].every((id) => many.find((e) => e.record.recordingID === id).record.retries <= 1), 'only runs with at most one retry');
  ok([...chosen].every((id) => finishMs(many.find((e) => e.record.recordingID === id).record) <= 60000 + 12 * 1000), 'only the fastest quarter of clean runs');
  ok(chosen.size >= 5, 'still varied day to day (' + chosen.size + ' different rivals)');
  const messy = [{ record: { recordingID: 'x', stashSeed: 1, clearTimes: T(90000), retries: 4, driverConfig: { driver: 'jev' } } }];
  eq(dailyRival(1, messy, isJev).record.recordingID, 'x', 'if every run is messy, still a race rather than none');
  eq(finishMs({ clearTimes: [1, 2, 3] }), null, 'an unfinished race has no finish time');
  eq(dailyDateLabel(1), 'THU · SEP 24', 'Daily #1 is Thursday, September 24');
  eq(dailyDateLabel(9), 'FRI · OCT 2', 'dates roll over months');
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
