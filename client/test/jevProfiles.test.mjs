import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import JevStrategist from '../src/controllers/JevStrategist.js';
import { JEV_APEX_BANK_ID, JEV_APEX_BANK_ROOT } from '../tools/lib/jevBank.mjs';

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
rival.profile = 'rival';
rival._newHouse(view, now);
assert.equal(rival._plan(null, false, 'fallback').openingWaiting, true,
  'Rival waits at the opening');
now = 1524;
assert.equal(rival._plan(null, false, 'fallback').openingWaiting, true,
  'Rival uses the configured randomized delay');
now = 1526;
assert.equal(rival._plan(null, false, 'fallback').openingWaiting, false,
  'Rival releases the unchanged motor after its opening delay');
assert.equal(rival.report().profile, 'rival');

const manifest = JSON.parse(readFileSync(`${JEV_APEX_BANK_ROOT}/manifest.json`, 'utf8'));
assert.equal(manifest.bank, JEV_APEX_BANK_ID);
assert.equal(manifest.courses.length, 7);
assert.ok(manifest.courses.every(c => c.opponents === 1), 'Apex has one challenge ghost on every course');

console.log('jev profiles: 8 assertions passed');
