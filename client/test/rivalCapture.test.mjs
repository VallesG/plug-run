// RivalReplayCapture against a stub scene: no Phaser, no browser.
import { beginRaceCapture, beginAttemptCapture, tickAttemptCapture, endAttemptCapture, exportRaceCapture } from '../src/controllers/RivalReplayCapture.js';
import { validateReplaySegment, replayStashesAt, unpackFlags, FRAME } from '../src/logic/rivalReplay.js';
import { validateRivalRunRecord, validateRivalReplayBundle } from '../src/logic/rivalRecords.js';
import { rivalPoolCourse, newRivalRace } from '../src/logic/rivals.js';

let passed = 0;
function check(name, value) { if (!value) throw new Error(name); passed++; }
let now = 0;
globalThis.performance = { now: () => now };

const CELL = 20, PAD = { x: 10, y: 84 };
const world = c => ({ x: PAD.x + c.x * CELL + CELL / 2, y: PAD.y + c.y * CELL + CELL / 2 });
function group(items) { return { getChildren: () => items }; }
function makeScene(house) {
  const r = world({ x: 2, y: 20 }), p = world({ x: 12, y: 8 });
  const stashA = world({ x: 4, y: 4 }), stashB = world({ x: 11, y: 30 });
  return {
    pveRound: house, seed: 1000 + house, cols: 16, rows: 35, cell: CELL, pad: PAD,
    stashCell: { x: 4, y: 4 }, extractCell: { x: 11, y: 30 }, egress: { side: 'N', entry: { x: 8, y: 0 } },
    car: { x: world({ x: 8, y: 0 }).x, y: world({ x: 8, y: 0 }).y - CELL * 0.6 },
    attacker: { x: r.x, y: r.y, active: true, visible: true, hp: 2, _faceAng: 90 },
    defender: { x: p.x, y: p.y, active: true, visible: true, hp: 3 },
    aiAim: { x: -1, y: 0 },
    stash: { x: stashB.x, y: stashB.y }, bunkStash: { x: stashA.x, y: stashA.y, _fading: false },
    bulletsD: group([]), bulletsA: group([]),
    hasStash: false, runnerPowersSelected: ['phase', 'dash'], runnerPowersConsumed: [false, false],
    allowedGuns: ['rifle'], runnerIsPhasing: () => false, decoySprite: null
  };
}
const course = rivalPoolCourse(1);
const race = { ...newRivalRace(course, [10, 20, 30, 40, 50, 60, 70].map(t => t * 1000)), status: 'racing', startedAt: 1000, powers: ['phase', 'dash'] };
beginRaceCapture(race, { recordingID: 'rec-test' });
check('capture attached to race', race.capture && race.capture.attempts.length === 0);

// --- house 1: a death, then a clear ---
now = 1000;
let scene = makeScene(1);
let cur = beginAttemptCapture(scene, race, now);
check('attempt numbered from one', cur.attempt === 1 && cur.house === 1 && cur.startedMs === 0);
check('segment carries the house identity', cur.seg.houseSeed === 1001 && cur.seg.cols === 16 && cur.seg.scale === course.scales[0]);
check('pockets recorded in generation order, real unknown', cur.seg.stashes[0].x === 4.5 && cur.seg.stashes[1].x === 11.5 && !('real' in cur.seg));
check('car side recorded', cur.seg.car.side === 'N');
check('second begin while open is ignored', beginAttemptCapture(scene, race, now) === null);
check('first tick samples immediately', tickAttemptCapture(scene, race, now) === true);
now += 16; check('sub-step tick does not sample', tickAttemptCapture(scene, race, now) === false);
now += 60; check('next step samples', tickAttemptCapture(scene, race, now) === true);
// a shot with three pellets in one frame -> one shot event
const pellets = [1, 2, 3].map(() => ({ x: scene.defender.x, y: scene.defender.y, active: true, visible: true }));
scene.bulletsD = group(pellets);
now += 67; tickAttemptCapture(scene, race, now);
check('burst is one shot event', cur.seg.events.filter(e => e.k === 'shot').length === 1 && cur.seg.events[0].who === 'p');
check('bullets sampled in cells', cur.seg.frames.at(-1)[FRAME.BULLETS].length === 6 && cur.seg.frames.at(-1)[FRAME.BULLETS][0] === 12.5);
now += 67; tickAttemptCapture(scene, race, now);
check('same bullets not re-counted', cur.seg.events.filter(e => e.k === 'shot').length === 1);
scene.attacker.hp = 1; scene.attacker.iUntil = now + 900;
now += 67; tickAttemptCapture(scene, race, now);
check('hp drop is a hit event', cur.seg.events.at(-1).k === 'hit' && cur.seg.events.at(-1).hp === 1);
check('hit flag sampled', unpackFlags(cur.seg.frames.at(-1)[FRAME.RF]).hit === true);
check('runner facing sampled from the sprite', unpackFlags(cur.seg.frames.at(-1)[FRAME.RF]).angle === 90);
check('plug facing from its aim', unpackFlags(cur.seg.frames.at(-1)[FRAME.PLUGS][0][2]).angle === 180);
scene.attacker.hp = 0;
now += 67; tickAttemptCapture(scene, race, now);
check('hp zero is a death event', cur.seg.events.at(-1).k === 'death');
now += 10;
let attempt = endAttemptCapture(scene, race, 'caught', now);
check('caught attempt closed', attempt.outcome === 'caught' && attempt.house === 1 && attempt.attempt === 1 && attempt.clearMs === undefined);
check('death not duplicated on close', race.capture.segments[0].events.filter(e => e.k === 'death').length === 1);
check('segment sealed and valid', race.capture.segments[0].sealed && validateReplaySegment(race.capture.segments[0]).ok);
check('tick after close is a no-op', tickAttemptCapture(scene, race, now) === false);

now += 650; scene = makeScene(1);
cur = beginAttemptCapture(scene, race, now);
check('retry increments attempt', cur.attempt === 2 && cur.startedMs === now - 1000);
tickAttemptCapture(scene, race, now);
scene.bunkStash._fading = true;
now += 67; tickAttemptCapture(scene, race, now);
check('bunk event names the pocket', cur.seg.events.at(-1).k === 'bunk' && cur.seg.events.at(-1).i === 0);
now += 67; tickAttemptCapture(scene, race, now);
check('bunk event once', cur.seg.events.filter(e => e.k === 'bunk').length === 1);
scene.runnerPowersConsumed = [true, false];
now += 67; tickAttemptCapture(scene, race, now);
check('power event with slot and power', cur.seg.events.at(-1).k === 'power' && cur.seg.events.at(-1).slot === 0 && cur.seg.events.at(-1).power === 'phase');
scene.hasStash = true;
now += 67; tickAttemptCapture(scene, race, now);
check('pickup event reveals the real pocket', cur.seg.events.at(-1).k === 'pickup' && cur.seg.events.at(-1).i === 1);
check('carry flag sampled', unpackFlags(cur.seg.frames.at(-1)[FRAME.RF]).carry === true);
check('stash visibility follows events', replayStashesAt(cur.seg, now - cur.t0).every(s => !s.visible));
now += 3000;
attempt = endAttemptCapture(scene, race, 'extracted', now);
check('clear attempt stamps race clock', attempt.outcome === 'extracted' && attempt.clearMs === now - 1000 && attempt.endedMs === attempt.clearMs);
check('extract event appended', race.capture.segments[1].events.at(-1).k === 'extract');
race.clearTimes.push(attempt.clearMs);

// export refuses an incomplete race
const opponent = { id: 'bot-street-1', displayName: 'BOT · Street', kind: 'bot', driverVersion: 'botdriver-v2', skillPreset: 'street' };
check('incomplete race not exported', exportRaceCapture(race, { opponent }).ok === false);

// --- houses 2..7 clean ---
for (let house = 2; house <= 7; house++) {
  now += 180; scene = makeScene(house);
  beginAttemptCapture(scene, race, now);
  for (let k = 0; k < 5; k++) { tickAttemptCapture(scene, race, now); now += 67; }
  scene.hasStash = true; tickAttemptCapture(scene, race, now); now += 2000;
  const a = endAttemptCapture(scene, race, 'extracted', now);
  race.clearTimes.push(a.clearMs);
}
check('seven clears captured', race.capture.attempts.filter(a => a.outcome === 'extracted').length === 7 && race.capture.attempts.length === 8);
const out = exportRaceCapture(race, { opponent, recordedAt: '2026-09-16T00:00:00Z', driverConfig: { aiLevel: 5 } });
check('complete race exported', out.ok === true);
check('exported record validates', validateRivalRunRecord(out.record).ok);
check('record clears equal race clock', JSON.stringify(out.record.clearTimes) === JSON.stringify(race.clearTimes) && out.record.retries === 1);
check('record labels the bot', out.record.opponent.kind === 'bot' && out.record.opponent.displayName.startsWith('BOT'));
check('bundle validates against record with segment check', validateRivalReplayBundle(out.bundle, out.record, { validateSegment: validateReplaySegment }).ok);
check('bundle keeps the failed attempt', out.bundle.segments[0].outcome === 'caught' && out.bundle.segments.length === 8);
check('recording id from capture', out.record.recordingID === 'rec-test');
check('portable: no functions or Phaser objects', JSON.parse(JSON.stringify(out.bundle)).segments.length === 8 && !/Phaser|function/.test(JSON.stringify(out.bundle)));

// clock disagreement is refused
const tampered = { ...race, clearTimes: race.clearTimes.map(t => t + 1) };
check('clock disagreement refused', exportRaceCapture(tampered, { opponent }).ok === false);
// an abandoned attempt poisons export
const abandoned = { ...race, capture: { ...race.capture, attempts: [...race.capture.attempts, { house: 7, attempt: 2, startedMs: 1, endedMs: 2, outcome: 'abandoned' }] } };
check('abandoned attempt refused', exportRaceCapture(abandoned, { opponent }).reason.includes('abandoned'));
console.log(passed + ' rival capture assertions passed');
