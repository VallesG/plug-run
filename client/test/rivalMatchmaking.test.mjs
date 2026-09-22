// Finding a rival: the matchmaking moment, and the pool it picks from.
//
//   node client/test/rivalMatchmaking.test.mjs
//
// The pool is one per course, fed by BOTH banks — the style bots
// (rivals/v2) and Jev (rivals/jev-v1) — and the same skill matching picks
// from it. Jev appears by name, like a handle; each bank admits only its own
// kind; a course with no Jev race yet is normal. The search itself varies per
// match, cycles only real names, lands on the actual pick, and says only
// true things.

import { readFileSync } from 'node:fs';
import * as rules from '../src/logic/rivals.js';
import * as presets from '../src/logic/rivalPresets.js';
import * as skill from '../src/logic/rivalSkill.js';
import { matchSearchMs, matchSearchSteps, matchCarousel, matchLanding, matchQuality, matchClock } from '../src/logic/rivalMatchmaking.js';

let passed = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) passed++;
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

/* ---------------- the search, as data ---------------- */

{
  const lengths = Array.from({ length: 200 }, (_, i) => matchSearchMs('salt-' + i));
  check('search runs 2.4-4.2s', lengths.every((ms) => ms >= 2400 && ms < 4200));
  check('and varies from match to match', new Set(lengths).size > 50);
  check('same match, same length', matchSearchMs('x') === matchSearchMs('x'));

  const steps = matchSearchSteps('Freight Run');
  check('steps name the course, then pace, then the pick',
    steps.length === 3 && steps[0] === 'CHECKING FREIGHT RUN' && /PACE/.test(steps[1]) && /RIVAL/.test(steps[2]));

  const pool = ['RIVAL · Ace', 'Jev', 'RIVAL · Street', 'Jev', 'RIVAL · Ghost'];
  const c = matchCarousel(pool, 'm1');
  check('carousel holds each real name once', c.length === 4 && c.every((n) => pool.includes(n)) && new Set(c).size === 4);
  check('carousel order varies by match', JSON.stringify(c) !== JSON.stringify(matchCarousel(pool, 'm2')) ||
    JSON.stringify(c) !== JSON.stringify(matchCarousel(pool, 'm3')));
  check('an empty pool still shows something', matchCarousel([], 's').join() === 'RIVAL');

  for (const pick of c) {
    const tail = matchLanding(c, pick);
    check(`landing ends on the pick (${pick})`, tail.at(-1).name === pick);
    check(`landing slows down (${pick})`, tail.every((t, i) => i === 0 || t.ms > tail[i - 1].ms) && tail[0].ms <= 100 && tail.at(-1).ms >= 400);
    check(`landing only shows real names (${pick})`, tail.every((t) => c.includes(t.name)));
  }
  check('a pick outside the carousel still lands on it', matchLanding(['A', 'B'], 'Jev').at(-1).name === 'Jev');

  check('even match within 10%', matchQuality(100000, 105000) === 'EVEN MATCH');
  check('a faster rival is tough', matchQuality(100000, 80000) === 'TOUGH RIVAL');
  check('a slower rival gives the player the edge', matchQuality(100000, 130000) === 'YOU HAVE THE EDGE');
  check('unknown pace shows nothing, not a guess', matchQuality(null, 100000) === null && matchQuality(100000, undefined) === null);
  check('search clock', matchClock(0) === '0:00' && matchClock(3999) === '0:03' && matchClock(61000) === '1:01');

  // The same copy rules as the race screens: nothing about recordings, no
  // one claimed online or queued.
  const src = readFileSync(new URL('../src/logic/rivalMatchmaking.js', import.meta.url), 'utf8');
  const shown = (src.match(/'[^'\n]{3,60}'/g) || []).map((q) => q.slice(1, -1)).filter((q) => /[A-Z]{3}/.test(q));
  const bad = shown.filter((q) => /\brecord|\bbot\b|\bbank\b|\bonline\b|\blive\b|\bqueue\b|\bwaiting\b|\bmatchmaking\b|players/i.test(q));
  check('matchmaking copy says only true things', bad.length === 0, bad.join(' | '));
}

/* ---------------- one pool, both banks ---------------- */

// The real rivalSession source, evaluated with the network and storage
// stubbed — the same technique rivalsFlow.test uses.
const sessionSource = readFileSync(new URL('../src/utils/rivalSession.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\s*/gm, '').replace(/^export /gm, '');

const course = rules.rivalPoolCourse(3);
const attempts = Array.from({ length: 7 }, (_, i) => ({ house: i + 1, outcome: 'extracted', startedMs: i * 30000, endedMs: i * 30000 + 25000 }));
const rec = (id, jev, perHouse = 30000) => ({
  stashSeed: 42, stashRules: 'match-v1',
  recordingID: id, courseID: course.id, clearTimes: [1, 2, 3, 4, 5, 6, 7].map((n) => n * perHouse),
  retries: 2, elapsedMs: perHouse * 7, attempts, orderedPowers: ['phase', 'dash'],
  opponent: { kind: 'bot', displayName: 'BOT · Street', skillPreset: 'street', driverVersion: 'botdriver-v2' },
  driverConfig: jev ? { aiLevel: 5, driver: 'jev-strategist', jev: { driver: 'jev-strategist', budgetStopped: null } } : { aiLevel: 5, driver: 'bot' }
});
const banks = {
  '/rivals/v2/': [{ record: rec('rec-style-1', false), replay: 'replays/rec-style-1.json' },
    { record: rec('rec-stray-jev', true), replay: 'replays/rec-stray-jev.json' }],
  '/rivals/jev-v1/': [{ record: rec('rec-jev-1', true, 29000), replay: 'replays/rec-jev-1.json' },
    { record: rec('rec-stray-style', false), replay: 'replays/rec-stray-style.json' }]
};
const fetched = [];
const bindingsFor = (bankFiles) => ({
  ...rules, ...presets, ...skill, console, setTimeout, clearTimeout,
  getSkillSamples: () => ({ byScale: {}, houses: 0 }),
  getUserID: () => 'test-runner', localStorage: { getItem: () => '[]', setItem: () => {} },
  validateRivalRunRecord: () => ({ ok: true }), rivalRecordMatchesCourse: () => true,
  fetch: async (url) => {
    fetched.push(url);
    const root = Object.keys(bankFiles).find((r) => url.startsWith(r));
    if (!root || !bankFiles[root]) return { ok: false, status: 404 };
    return { ok: true, text: async () => JSON.stringify({ schemaVersion: 1, rulesVersion: rules.RIVAL_RULES_VERSION, opponents: bankFiles[root] }) };
  }
});
const load = (bankFiles) => new Function(...Object.keys(bindingsFor(bankFiles)),
  sessionSource + '\nreturn { loadRivalOpponents, resolveRivalOpponent, rivalOpponentName, isJevRecord, JEV_ASSET_ROOT };')(
  ...Object.values(bindingsFor(bankFiles)));

{
  const s = load(banks);
  const pool = await s.loadRivalOpponents(course);
  const ids = pool.map((e) => e.record.recordingID).sort();
  check('both banks feed the pool', fetched.some((u) => u.startsWith('/rivals/v2/')) && fetched.some((u) => u.startsWith('/rivals/jev-v1/')));
  check('the pool holds the style bot and Jev', JSON.stringify(ids) === JSON.stringify(['rec-jev-1', 'rec-style-1']), ids.join());
  check('a Jev race filed in the style bank is refused', !ids.includes('rec-stray-jev'));
  check('a style bot filed in the Jev bank is refused', !ids.includes('rec-stray-style'));
  check('Jev entries know their bank', pool.find((e) => e.record.recordingID === 'rec-jev-1').root === '/rivals/jev-v1/');
  check('Jev is called Jev', s.rivalOpponentName(rec('x', true)) === 'Jev' && s.rivalOpponentName(rec('y', false)) === 'BOT · Street');
  check('the Jev bank path is the one the assembler writes', s.JEV_ASSET_ROOT === '/rivals/jev-v1/');

  // Resolve against the Jev race by id: the race is set up with its record,
  // the name Jev, and the replay from the Jev bank.
  const race = { ...rules.newRivalRace(course, [1, 2, 3, 4, 5, 6, 7].map((n) => n * 40000), { stashSeed: 42 }), powers: ['dash', 'phase'], wantRecordingID: 'rec-jev-1' };
  check('the Jev race can be picked', await s.resolveRivalOpponent(race) === true);
  check('picked: name, replay path and record', race.opponent.displayName === 'Jev' &&
    race.opponent.replayURL === '/rivals/jev-v1/replays/rec-jev-1.json' && race.opponentRecord.recordingID === 'rec-jev-1');
  check('the search shows Jev among the candidates', race.searchNames.includes('Jev') && race.searchNames.includes('BOT · Street'));
  check('the pace comes from the Jev race', race.rivalTimes.join() === rec('rec-jev-1', true, 29000).clearTimes.join());
  let incompatibleSeed = 0;
  while (rules.rivalRecordMatchesStashes(rec('x', true), { course, stashSeed: incompatibleSeed })) incompatibleSeed++;
  // A match whose seed was chosen explicitly (a rematch) keeps it, so it can
  // only meet a rival recorded on the same seven answers.
  const fixed = { ...rules.newRivalRace(course, [1,2,3,4,5,6,7], { stashSeed: incompatibleSeed }), stashSeedFixed: true };
  check('an explicitly seeded match cannot meet a rival with different answers', await s.resolveRivalOpponent(fixed) === false && !fixed.opponentRecord);
  // Any other match adopts the chosen rival's seed before its first house
  // starts: the whole bank is eligible, and both race the same answers.
  const open = { ...rules.newRivalRace(course, [1,2,3,4,5,6,7], { stashSeed: incompatibleSeed }), powers: ['dash', 'phase'] };
  check('an open match meets a rival with different answers', await s.resolveRivalOpponent(open) === true && !!open.opponentRecord);
  check('and takes that rival\'s stash seed', open.stashSeed === open.opponentRecord.stashSeed &&
    rules.rivalRecordMatchesStashes(open.opponentRecord, open));

  // A course with no Jev race yet: the style pool, no noise.
  fetched.length = 0;
  const warns = [];
  const quiet = new Function(...Object.keys({ ...bindingsFor({ '/rivals/v2/': banks['/rivals/v2/'], '/rivals/jev-v1/': null }), console: { warn: (...a) => warns.push(a.join(' ')) } }),
    sessionSource + '\nreturn loadRivalOpponents;')(...Object.values({ ...bindingsFor({ '/rivals/v2/': banks['/rivals/v2/'], '/rivals/jev-v1/': null }), console: { warn: (...a) => warns.push(a.join(' ')) } }));
  const only = await quiet(rules.rivalPoolCourse(5));
  check('no Jev file for a course: the style bots still race', only.map((e) => e.record.recordingID).join() === 'rec-style-1');
  check('and a missing Jev file is not reported as a failure', warns.length === 0, warns[0]);
}

console.log('');
if (failures.length) {
  console.log(`rival matchmaking: ${passed} passed, ${failures.length} FAILED`);
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log(`rival matchmaking: ${passed} assertions passed`);
