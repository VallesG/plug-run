// The Daily Race: same race for everyone each UTC day, streaks, official times,
// and the server's daily ranking.
import assert from 'node:assert/strict';
import {
  DAILY_EPOCH_MS, dailyNumber, dailySlot, dailyRival, recordDaily, liveStreak, dailyNote, EMPTY_DAILY, raceTimeLabel
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
const entries = [
  { record: { recordingID: 'b-jev', stashSeed: 2, driverConfig: { driver: 'jev' } } },
  { record: { recordingID: 'a-bot', stashSeed: 1 } },
  { record: { recordingID: 'c-jev', stashSeed: 3, driverConfig: { driver: 'jev' } } },
  { record: { recordingID: 'd-old' } }
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

console.log('dailyRace: ' + checks + ' assertions passed');
