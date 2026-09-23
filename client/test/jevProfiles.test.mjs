import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import JevStrategist from '../src/controllers/JevStrategist.js';
import { JEV_APEX_BANK_ID, JEV_APEX_BANK_ROOT, JEV_RIVAL_HARD_BANK_ID, JEV_RIVAL_HARD_BANK_ROOT } from '../tools/lib/jevBank.mjs';

let now = 1000;
const view = { house: 1, houseKey: '1:0', matchKey: 'match' };

const apex = new JevStrategist(async () => null, { now: () => now, rng: () => 0.5 });
apex.profile = 'apex';
apex._newHouse(view, now);
assert.equal(apex._plan(null, false, 'fallback').openingWaiting, false,
  'Apex must preserve the unrestricted zero-delay driver');

const rival = new JevStrategist(async () => null, {
  now: () => now, rng: () => 0.5, openingDelayMinMs: 400, openingDelayMaxMs: 650
});
rival.profile = 'rival-hard';
rival._newHouse(view, now);
assert.equal(rival._plan(null, false, 'fallback').openingWaiting, true,
  'Rival waits at the opening');
now = 1524;
assert.equal(rival._plan(null, false, 'fallback').openingWaiting, true,
  'Rival uses the configured randomized delay');
now = 1526;
assert.equal(rival._plan(null, false, 'fallback').openingWaiting, false,
  'Rival releases the unchanged motor after its opening delay');
assert.equal(rival.report().profile, 'rival-hard');
assert.equal(JEV_RIVAL_HARD_BANK_ID, 'jev-rival-hard-v1');
assert.equal(JEV_RIVAL_HARD_BANK_ROOT, 'public/rivals/jev-rival-hard-v1');

now = 2000;
const normal = new JevStrategist(async () => null, {
  now: () => now, rng: () => 0.5,
  openingDelayMinMs: 850, openingDelayMaxMs: 1200,
  correctionDelayMinMs: 500, correctionDelayMaxMs: 750
});
normal.profile = 'normal';
normal._newHouse({ ...view, house: 2, houseKey: '2:0' }, now);
assert.equal(normal._plan(null, false, 'fallback').openingWaiting, true);
now = 3026;
assert.equal(normal._plan(null, false, 'fallback').openingWaiting, false);
normal._lastObjectiveKey = '1,1';
now = 3000;
normal._correctionReadyAt = now + 500 + normal.rng() * 250;
assert.equal(normal._plan(null, false, 'jev').correctionWaiting, true);
now = 3652;
assert.equal(normal._plan(null, false, 'jev').correctionWaiting, false);
assert.equal(normal.report().profile, 'normal');

const manifest = JSON.parse(readFileSync(new URL('../public/rivals/jev-apex-v1/manifest.json', import.meta.url), 'utf8'));
assert.equal(manifest.bank, JEV_APEX_BANK_ID);
assert.equal(manifest.courses.length, 7);
assert.ok(manifest.courses.every(c => c.opponents === 1), 'Apex has one challenge ghost on every course');

console.log('jev profiles: 15 assertions passed');
