// Telegram CloudStorage progress backup: what is copied, how it comes back.
import assert from 'node:assert/strict';
import { isBackedUp, encodeEntry, decodeEntries, restorePlan, createCloudBackup } from '../src/platform/cloudBackup.js';

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };

// Which keys: progress yes; identity secrets, replay history and caches no.
for (const k of ['pr_journey_v1_u_abc', 'pr_city_v1_u_abc', 'pr_crew_saves_v1_x', 'pr_rival_city_v1_x', 'pr_tutorial_v1_x', 'prla_inv_v1', 'pr_sfx_volume', 'pr_user']) ok(isBackedUp(k), 'backed up: ' + k);
for (const k of ['pr_lb_token', 'pr_recovery_code', 'pr_provisioned', 'pr_rivals_results_v1_x', 'pr_leaderboard_x', 'pr_alltime_x', 'lastMode', 'other', 'pr_journey_v1_' + 'x'.repeat(100), 'pr_journey_v1_bad key']) ok(!isBackedUp(k), 'not backed up: ' + k);

// Encoding round trip, including a value too big for one CloudStorage item.
const big = 'x'.repeat(9500);
const enc = { ...encodeEntry('pr_city_v1_a', '{"n":1}'), ...encodeEntry('pr_journey_v1_a', big) };
ok(Object.values(enc).every((v) => v.length <= 4096) && Object.keys(enc).every((k) => k.length <= 128 && /^[A-Za-z0-9_-]+$/.test(k)), 'every item fits CloudStorage limits');
eq(decodeEntries(enc), { 'pr_city_v1_a': '{"n":1}', 'pr_journey_v1_a': big }, 'round trip, chunked value rejoined');
const missing = { ...enc }; delete missing['b_pr_journey_v1_a__1'];
eq(decodeEntries(missing), { 'pr_city_v1_a': '{"n":1}' }, 'a value with a lost chunk is dropped, not corrupted');
eq(encodeEntry('pr_city_v1_a', 'y'.repeat(4000 * 17)), null, 'absurdly large values are not sent');

// Restore only fills gaps; STASH stats only onto a device with none.
const local = { 'pr_city_v1_a': 'LOCAL', 'pr_user': JSON.stringify({ id: 'u_1', username: 'Sam', stats: { totalStash: 0, gamesPlayed: 0 } }) };
const plan = restorePlan({ 'pr_city_v1_a': 'CLOUD', 'pr_journey_v1_a': 'J', 'pr_user': JSON.stringify({ id: 'old', username: 'Old', stats: { totalStash: 900, gamesPlayed: 12 } }) }, (k) => local[k] ?? null);
eq(Object.keys(plan).sort(), ['pr_journey_v1_a', 'pr_user'], 'the device keeps its own city; the missing journey is filled');
eq(JSON.parse(plan.pr_user), { id: 'u_1', username: 'Sam', stats: { totalStash: 900, gamesPlayed: 12 } }, 'stats come back; identity stays from sign-in');
local.pr_user = JSON.stringify({ id: 'u_1', stats: { totalStash: 5 } });
ok(!('pr_user' in restorePlan({ 'pr_user': JSON.stringify({ stats: { totalStash: 900 } }) }, (k) => local[k] ?? null)), 'a device with its own STASH keeps it');

// End to end: device A uploads, device B (fresh) restores, A's later change uploads again.
function fakeCloud() {
  const data = {};
  return { data,
    setItem: (k, v, cb) => { if (k.length > 128 || v.length > 4096) return cb(new Error('limit')); data[k] = v; cb(null, true); },
    getKeys: (cb) => cb(null, Object.keys(data)),
    getItems: (keys, cb) => cb(null, Object.fromEntries(keys.map((k) => [k, data[k] ?? '']))) };
}
function fakeStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}
const cloud = fakeCloud();
const deviceA = fakeStorage({ 'pr_journey_v1_u_1': '{"blockIndex":3}', 'pr_city_v1_u_1': big, 'pr_lb_token': 'SECRET', 'pr_rivals_results_v1_u_1': '[huge]' });
const a = createCloudBackup(cloud, deviceA);
eq(await a.flush(), 2, 'device A uploads its two progress keys');
ok(!JSON.stringify(cloud.data).includes('SECRET') && !JSON.stringify(cloud.data).includes('huge'), 'no token or replay history in the cloud');
eq(await a.flush(), 0, 'nothing changed: nothing re-sent');
const deviceB = fakeStorage();
const b = createCloudBackup(cloud, deviceB);
eq((await b.restore()).sort(), ['pr_city_v1_u_1', 'pr_journey_v1_u_1'], 'device B gets the progress back');
eq(deviceB.getItem('pr_city_v1_u_1'), big, 'including the chunked value, intact');
eq(await b.flush(), 0, 'restored values are not uploaded straight back');
deviceA.setItem('pr_journey_v1_u_1', '{"blockIndex":4}');
eq(await a.flush(), 1, 'a new change on A goes up');
const broken = createCloudBackup({ ...cloud, setItem: (k, v, cb) => cb(new Error('down')) }, fakeStorage({ 'pr_city_v1_z': '1' }));
eq(await broken.flush(), 0, 'a failing CloudStorage pauses uploads without throwing');

console.log('cloudBackup: ' + checks + ' assertions passed');
