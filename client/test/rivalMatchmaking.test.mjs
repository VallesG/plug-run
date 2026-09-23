// Finding a rival: the matchmaking moment, and the pool it picks from.
//
//   node client/test/rivalMatchmaking.test.mjs
//
// The search varies per match and never runs past ten seconds; the match
// walks its stages one legal step at a time; the lobby fits a phone. The
// match finds a rival FIRST, offers only the courses that rival has valid
// races on, and has the concrete record for each offered course chosen before
// READY. The ordinary pool is the style bots (rivals/v2) and normal Jev
// (rivals/jev-v1); each challenge bank is a pool of its own, never mixed in.

import { readFileSync } from 'node:fs';
import * as rules from '../src/logic/rivals.js';
import * as presets from '../src/logic/rivalPresets.js';
import * as skill from '../src/logic/rivalSkill.js';
import * as matchmaking from '../src/logic/rivalMatchmaking.js';
const {
  RIVAL_MATCH_STAGES, canAdvanceMatch, advanceMatch, planMatchSearch, matchSettleAt, MATCH_SEARCH_CAP_MS,
  MATCH_SEARCH_BANDS, MATCH_EMPTY_MIN_MS, matchQuality, matchClock, rivalMonogram, rivalShortName, rivalLobbyLayout
} = matchmaking;

let passed = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) passed++;
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}
const seeded = (seed) => () => { seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return seed / 4294967296; };

/* ---------------- how long the search looks ---------------- */

{
  const random = seeded(7);
  const plans = Array.from({ length: 4000 }, () => planMatchSearch({ random }));
  const ms = plans.map((p) => p.revealMs);
  check('a search never runs past the ten-second cap', ms.every((v) => v > 0 && v <= MATCH_SEARCH_CAP_MS - 400), Math.max(...ms));
  check('some rivals turn up almost at once', ms.some((v) => v < 1200));
  check('others take several seconds', ms.some((v) => v > 4000 && v < 7000));
  check('and a few come near the limit', ms.some((v) => v > 8500));
  const share = (band, list = plans) => list.filter((p) => p.band === band).length / list.length;
  check('most searches are quick or steady', share('quick') + share('steady') > 0.6);
  check('near-limit searches are rare', share('edge') > 0.01 && share('edge') < 0.15);
  check('no fixed delay: lengths spread across the range', new Set(ms.map((v) => Math.round(v / 250))).size > 25);
  // Each search draws its own tempo, so two matches do not share one fixed
  // distribution: a busy tempo leans quick, a quiet one leans slow.
  const rest = seeded(99);
  const tempo = (t) => { let first = true; return () => (first ? (first = false, t) : rest()); };
  const busy = Array.from({ length: 3000 }, (_, i) => planMatchSearch({ random: tempo(0.02) })).map((p) => p.band);
  const quiet = Array.from({ length: 3000 }, (_, i) => planMatchSearch({ random: tempo(0.98) })).map((p) => p.band);
  const count = (list, band) => list.filter((b) => b === band).length;
  check('the tempo moves weight between quick and slow', count(busy, 'quick') > count(quiet, 'quick') * 1.5 && count(quiet, 'slow') > count(busy, 'slow') * 1.5);
  const after = Array.from({ length: 2000 }, () => planMatchSearch({ random, recent: ['steady', 'edge'] }));
  check('never two near-limit waits in a row', after.every((p) => p.band !== 'edge'));
  const repeat = Array.from({ length: 3000 }, () => planMatchSearch({ random, recent: ['quick', 'quick'] }));
  check('a band that just repeated is damped', share('quick', repeat) < share('quick') * 0.6);
  check('the bands tile the range', MATCH_SEARCH_BANDS.every((b, i) => i === 0 || b.min === MATCH_SEARCH_BANDS[i - 1].max));
  check('a broken random source still gives a legal length', (() => { const p = planMatchSearch({ random: () => NaN }); return p.revealMs > 0 && p.revealMs <= MATCH_SEARCH_CAP_MS; })());

  // When the search lands.
  check('found: lands at the planned moment when the lookup was quicker',
    matchSettleAt({ startedAt: 1000, revealMs: 2500, loadedAt: 1200, found: true }) === 3500);
  check('found: never before the lookup has finished',
    matchSettleAt({ startedAt: 1000, revealMs: 800, loadedAt: 2600, found: true }) === 2600);
  check('found: never past the cap',
    matchSettleAt({ startedAt: 0, revealMs: 3000, loadedAt: 12000, found: true }) === MATCH_SEARCH_CAP_MS);
  check('nobody: still looks for a while before saying so',
    matchSettleAt({ startedAt: 0, revealMs: 700, loadedAt: 100, found: false }) === MATCH_EMPTY_MIN_MS);
  check('still loading: not settled', matchSettleAt({ startedAt: 0, revealMs: 700, loadedAt: null, found: false }) === null);
}

/* ---------------- the stages ---------------- */

{
  const legal = [['block', 'searching'], ['searching', 'found'], ['searching', 'unavailable'], ['searching', 'block'],
    ['unavailable', 'searching'], ['unavailable', 'block'], ['found', 'selecting'], ['found', 'block'],
    ['selecting', 'ready'], ['selecting', 'block'], ['ready', 'countdown'], ['countdown', 'racing']];
  for (const [a, b] of legal) check(`${a} -> ${b} is a step`, canAdvanceMatch(a, b));
  const stages = Object.keys(RIVAL_MATCH_STAGES);
  let skips = 0;
  for (const a of stages) for (const b of stages) if (!legal.some(([x, y]) => x === a && y === b)) { skips++; check(`${a} -> ${b} is not`, !canAdvanceMatch(a, b)); }
  check('every other pair is refused', skips === stages.length ** 2 - legal.length);
  check('ready can only go forward: no leaving after READY', !canAdvanceMatch('ready', 'block') && !canAdvanceMatch('ready', 'selecting'));
  check('the powers and map come after a rival is found', !canAdvanceMatch('block', 'selecting') && !canAdvanceMatch('searching', 'selecting'));
  const holder = { entryStage: 'block' };
  check('advance moves one legal step', advanceMatch(holder, 'searching') && holder.entryStage === 'searching');
  check('and refuses a skip without changing anything', !advanceMatch(holder, 'ready') && holder.entryStage === 'searching');
  check('a second identical step is refused (no double start)', advanceMatch(holder, 'found') && !advanceMatch(holder, 'found') && holder.entryStage === 'found');
}

/* ---------------- identity and words ---------------- */

{
  check('monogram', rivalMonogram('Jev') === 'J' && rivalMonogram('RIVAL · Street') === 'S' && rivalMonogram('') === 'R' && rivalMonogram('7even') === '7');
  check('short HUD names', rivalShortName('Jev') === 'JEV' && rivalShortName('RIVAL · Street') === null && rivalShortName('A very long handle') === null && rivalShortName('') === null);
  check('even match within 10%', matchQuality(100000, 105000) === 'EVEN MATCH');
  check('a faster rival is tough', matchQuality(100000, 80000) === 'TOUGH RIVAL');
  check('a slower rival gives the player the edge', matchQuality(100000, 130000) === 'YOU HAVE THE EDGE');
  check('unknown pace shows nothing, not a guess', matchQuality(null, 100000) === null && matchQuality(100000, undefined) === null);
  check('search clock', matchClock(0) === '0:00' && matchClock(3999) === '0:03' && matchClock(61000) === '1:01');
  // Nothing about recordings, and no one claimed online or queued.
  const src = ['../src/logic/rivalMatchmaking.js', '../src/controllers/RivalMatchScreen.js']
    .map((p) => readFileSync(new URL(p, import.meta.url), 'utf8')).join('\n');
  const shown = (src.match(/'[^'\n]{3,60}'/g) || []).map((q) => q.slice(1, -1)).filter((q) => /[A-Z]{3}/.test(q));
  const bad = shown.filter((q) => /\brecord|\bbot\b|\bbank\b|\bonline\b|\blive\b|\bqueue\b|\bwaiting\b|\bmatchmaking\b|players/i.test(q));
  check('matchmaking copy says only true things', bad.length === 0, bad.join(' | '));
}

/* ---------------- the lobby fits ---------------- */

{
  const sizes = [[320, 568], [360, 640], [375, 667], [390, 844], [414, 896], [430, 932], [768, 1024],
    [568, 320], [667, 375], [844, 390], [932, 430], [1024, 768], [1280, 720], [1920, 1080]];
  const keys = ['header', 'art', 'name', 'opens', 'powers', 'footer'];
  for (const [W, H] of sizes) {
    const L = rivalLobbyLayout(W, H);
    const out = keys.filter((k) => { const r = L[k]; return r.w <= 0 || r.h <= 0 || r.x < 0 || r.y < 0 || r.x + r.w > W + 0.01 || r.y + r.h > H + 0.01; });
    check(`${W}x${H}: every part is on screen`, out.length === 0, out.join());
    const hit = [];
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
      const a = L[keys[i]], b = L[keys[j]];
      if (a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01) hit.push(keys[i] + '/' + keys[j]);
    }
    check(`${W}x${H}: nothing overlaps`, hit.length === 0, hit.join());
    check(`${W}x${H}: buttons are thumb-sized`, L.footer.h >= 44 && L.powers.h >= 100 && L.name.h >= 30);
    check(`${W}x${H}: the block is big enough to read`, Math.min(L.art.w, L.art.h * 200 / 220) >= 190, `${L.art.w}x${L.art.h}`);
    check(`${W}x${H}: the status zone is the pickers' own space`, L.zone.y === L.opens.y && L.zone.y + L.zone.h === L.powers.y + L.powers.h);
  }
  check('phones stack; landscape splits', !rivalLobbyLayout(390, 844).wide && rivalLobbyLayout(844, 390).wide);
}

/* ---------------- one match flow, separate pools ---------------- */

// The real rivalSession source, evaluated with the network and storage
// stubbed — the same technique rivalsFlow.test uses.
const sessionSource = readFileSync(new URL('../src/utils/rivalSession.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\s*/gm, '').replace(/^export /gm, '');

const courseA = rules.rivalPoolCourse(3), courseB = rules.rivalPoolCourse(9), courseC = rules.rivalPoolCourse(15);
const attempts = Array.from({ length: 7 }, (_, i) => ({ house: i + 1, outcome: 'extracted', startedMs: i * 30000, endedMs: i * 30000 + 25000 }));
let seedNo = 1000;
const rec = (id, jev, { perHouse = 30000, course = courseA, stashRules = 'match-v1', stashSeed = seedNo++, human = null, powers = ['phase', 'dash'] } = {}) => ({
  stashSeed, stashRules,
  recordingID: id, courseID: course.id, clearTimes: [1, 2, 3, 4, 5, 6, 7].map((n) => n * perHouse),
  retries: 2, elapsedMs: perHouse * 7, attempts, orderedPowers: powers,
  opponent: human ? { kind: 'human', id: human, displayName: human } : { kind: 'bot', displayName: 'BOT · Street', skillPreset: 'street', driverVersion: 'botdriver-v2' },
  driverConfig: jev ? { aiLevel: 5, driver: 'jev-strategist', jev: { driver: 'jev-strategist', budgetStopped: null } } : { aiLevel: 5, driver: 'bot' }
});
const fetched = [];
// files: { '<root>': { '<courseID>': entries | 'fail' } }
const bindingsFor = (files, extra = {}) => ({
  ...rules, ...presets, ...skill, ...matchmaking, console, setTimeout, clearTimeout,
  getSkillSamples: () => ({ byScale: {}, houses: 0 }),
  getUserID: () => 'test-runner', localStorage: { getItem: () => '[]', setItem: () => {} },
  validateRivalRunRecord: () => ({ ok: true }), rivalRecordMatchesCourse: (r, c) => r.courseID === c.id,
  fetch: async (url) => {
    fetched.push(url);
    const root = Object.keys(files).find((r) => url.startsWith(r));
    const courseID = url.split('/courses/')[1]?.split('/')[0];
    const list = root ? files[root]?.[decodeURIComponent(courseID)] : null;
    if (list === 'fail') throw new Error('offline');
    if (!list) return { ok: false, status: 404 };
    return { ok: true, text: async () => JSON.stringify({ schemaVersion: 1, rulesVersion: rules.RIVAL_RULES_VERSION, opponents: list }) };
  },
  ...extra
});
const load = (files, extra) => { const b = bindingsFor(files, extra); return new Function(...Object.keys(b),
  sessionSource + '\nreturn { loadRivalOpponents, resolveRivalOpponent, rivalOpponentName, isJevRecord, JEV_ASSET_ROOT, findRivalMatch, applyRivalOffer, rivalIdentity, rivalMatchCourses, eligibleRivalEntries, RIVAL_OPPONENT_POOLS, rivalPoolName };')(...Object.values(b)); };
const E = (record, replay = 'replays/' + record.recordingID + '.json') => ({ record, replay });

{
  // The original two-bank pool behaviour, unchanged.
  const banks = {
    '/rivals/v2/': { [courseA.id]: [E(rec('rec-style-1', false)), E(rec('rec-stray-jev', true))] },
    '/rivals/jev-v1/': { [courseA.id]: [E(rec('rec-jev-1', true, { perHouse: 29000 })), E(rec('rec-stray-style', false))] }
  };
  const s = load(banks);
  const pool = await s.loadRivalOpponents(courseA);
  const ids = pool.map((e) => e.record.recordingID).sort();
  check('both ordinary banks feed the pool', fetched.some((u) => u.startsWith('/rivals/v2/')) && fetched.some((u) => u.startsWith('/rivals/jev-v1/')));
  check('the pool holds the style bot and Jev', JSON.stringify(ids) === JSON.stringify(['rec-jev-1', 'rec-style-1']), ids.join());
  check('a Jev race filed in the style bank is refused', !ids.includes('rec-stray-jev'));
  check('a style bot filed in the Jev bank is refused', !ids.includes('rec-stray-style'));
  check('Jev entries know their bank', pool.find((e) => e.record.recordingID === 'rec-jev-1').root === '/rivals/jev-v1/');
  check('Jev is called Jev', s.rivalOpponentName(rec('x', true)) === 'Jev' && s.rivalOpponentName(rec('y', false)) === 'BOT · Street');
  check('the Jev bank path is the one the assembler writes', s.JEV_ASSET_ROOT === '/rivals/jev-v1/');

  const race = { ...rules.newRivalRace(courseA, [1, 2, 3, 4, 5, 6, 7].map((n) => n * 40000), { stashSeed: 42 }), powers: ['dash', 'phase'], wantRecordingID: 'rec-jev-1' };
  check('the Jev race can be picked', await s.resolveRivalOpponent(race) === true);
  check('picked: name, replay path and record', race.opponent.displayName === 'Jev' &&
    race.opponent.replayURL === '/rivals/jev-v1/replays/rec-jev-1.json' && race.opponentRecord.recordingID === 'rec-jev-1');
  check('the pace comes from the Jev race', race.rivalTimes.join() === race.opponentRecord.clearTimes.join());
  const jevRecord = pool.find((e) => e.record.recordingID === 'rec-jev-1').record;
  let incompatibleSeed = 0;
  while (rules.rivalRecordMatchesStashes(jevRecord, { course: courseA, stashSeed: incompatibleSeed })) incompatibleSeed++;
  const fixed = { ...rules.newRivalRace(courseA, [1,2,3,4,5,6,7], { stashSeed: incompatibleSeed }), stashSeedFixed: true, wantRecordingID: 'rec-jev-1' };
  check('an explicitly seeded match only meets rivals with the same answers', await s.resolveRivalOpponent(fixed) === true ? fixed.opponentRecord.recordingID !== 'rec-jev-1' : !fixed.opponentRecord);
  const open = { ...rules.newRivalRace(courseA, [1,2,3,4,5,6,7], { stashSeed: incompatibleSeed }), powers: ['dash', 'phase'], wantRecordingID: 'rec-jev-1' };
  check('an open match meets a rival with different answers', await s.resolveRivalOpponent(open) === true && open.opponentRecord.recordingID === 'rec-jev-1');
  check('and takes that rival\'s stash seed', open.stashSeed === open.opponentRecord.stashSeed &&
    rules.rivalRecordMatchesStashes(open.opponentRecord, open));

  // A course with no Jev race yet: the style pool, no noise.
  fetched.length = 0;
  const warns = [];
  const quiet = load({ '/rivals/v2/': { [courseA.id]: banks['/rivals/v2/'][courseA.id] } }, { console: { warn: (...a) => warns.push(a.join(' ')) } });
  const only = await quiet.loadRivalOpponents(courseA);
  check('no Jev file for a course: the style bots still race', only.map((e) => e.record.recordingID).join() === 'rec-style-1');
  check('and a missing Jev file is not reported as a failure', warns.length === 0, warns[0]);
}

/* ---------------- LOOK FOR MATCH: a rival first, then their courses ---------------- */

{
  fetched.length = 0;
  const jevA = [E(rec('jev-a1', true, { perHouse: 30000 })), E(rec('jev-a2', true, { perHouse: 31000 }))];
  const jevB = [E(rec('jev-b1', true, { course: courseB, powers: ['decoy', 'phase'] }))];
  const styleC = [E(rec('style-c1', false, { course: courseC }))];
  const legacyC = [E(rec('jev-c-legacy', true, { course: courseC, stashRules: null, stashSeed: null }))];
  const s = load({
    '/rivals/v2/': { [courseA.id]: [], [courseC.id]: styleC },
    '/rivals/jev-v1/': { [courseA.id]: jevA, [courseB.id]: jevB, [courseC.id]: legacyC }
  });
  const race = { ...rules.newRivalRace(courseA, [1, 2, 3, 4, 5, 6, 7].map((n) => n * 40000), { stashSeed: 7 }), pool: 'ordinary' };
  const before = JSON.stringify({ ...race, course: race.course.id });
  const match = await s.findRivalMatch(race, { courses: [courseA, courseB, courseC], random: seeded(3) });
  check('a rival is found', !!match && match.identity.displayName === 'Jev' && match.identity.key === 'jev@/rivals/jev-v1/');
  check('searching does not touch the race', JSON.stringify({ ...race, course: race.course.id }) === before && !race.opponentRecord);
  check('only courses this rival has raced are offered', match.offers.map((o) => o.slot).join() === [courseA.slot, courseB.slot].join(), match.offers.map((o) => o.slot + ':' + o.entry.record.recordingID).join());
  check('another rival\'s course is not offered as this one\'s', !match.offers.some((o) => o.slot === courseC.slot));
  check('every offer carries its own concrete record, on its own course', match.offers.every((o) => o.entry.record.courseID === o.courseID && s.rivalIdentity(o.entry).key === match.identity.key));
  check('the lobby shows the rival\'s real opening for each course', match.offers[1].orderedPowers.join() === 'decoy,phase');
  check('the match\'s own course comes first', match.offers[0].slot === courseA.slot);

  // READY on the course already built: same race, that record.
  const same = s.applyRivalOffer(race, match, match.offers[0]);
  check('ready on the same course keeps the race', same === race);
  check('the race runs the offered record', race.opponentRecord === match.offers[0].entry.record && race.rivalTimes.join() === race.opponentRecord.clearTimes.join());
  check('with that record\'s stash seed', race.stashSeed === race.opponentRecord.stashSeed && rules.rivalRecordMatchesStashes(race.opponentRecord, race));
  check('its replay and the rival\'s name', race.opponent.replayURL === '/rivals/jev-v1/' + match.offers[0].entry.replay && race.opponent.displayName === 'Jev' && race.opponent.identityKey === match.identity.key);

  // READY on another course: a fresh race there, keeping the match's city and pool.
  const home = { ...rules.newRivalRace(courseA, [1, 2, 3, 4, 5, 6, 7].map((n) => n * 40000), { stashSeed: 7 }), pool: 'ordinary',
    rivalCityIndex: 4, territoryIndex: 4, territorySlot: 4, territoryGang: 'crossline', territoryUser: 'u', cityIntroShown: true, entryStage: 'selecting', match, lobby: { slot: courseB.slot } };
  const moved = s.applyRivalOffer(home, match, match.offers[1]);
  check('ready on another course races that course', moved !== home && moved.course.id === courseB.id && moved.status === 'ready' && moved.clearTimes.length === 0);
  check('with that course\'s record, seed, times and replay', moved.opponentRecord.recordingID === 'jev-b1' && moved.stashSeed === moved.opponentRecord.stashSeed &&
    moved.rivalTimes.join() === moved.opponentRecord.clearTimes.join() && moved.opponent.replayURL === '/rivals/jev-v1/replays/jev-b1.json');
  check('the city and territory come along', moved.rivalCityIndex === 4 && moved.territoryIndex === 4 && moved.territorySlot === 4 && moved.territoryGang === 'crossline' && moved.pool === 'ordinary');
  check('and nothing from a harness does', moved.fixedPowers === null && moved.recording === false && moved.hardLimitMs === 0 && moved.stashSeedFixed === false);
  check('an offer from another match is refused', s.applyRivalOffer({ ...home }, { offers: [] }, match.offers[1]) === null);
  check('a race already underway is refused', s.applyRivalOffer({ ...home, status: 'countdown' }, match, match.offers[1]) === null);

  // Nobody at all, and records that cannot be raced.
  const none = await load({ '/rivals/jev-v1/': { [courseC.id]: legacyC } }).findRivalMatch(
    { ...rules.newRivalRace(courseC, [1, 2, 3, 4, 5, 6, 7], { stashSeed: 3 }) }, { courses: [courseC], random: seeded(1) });
  check('records without match stash rules never make a match', none === null);
  const empty = await load({}).findRivalMatch({ ...rules.newRivalRace(courseA, [1, 2, 3, 4, 5, 6, 7], { stashSeed: 3 }) }, { courses: [courseA, courseB], random: seeded(1) });
  check('an empty pool finds nobody, rather than a stand-in', empty === null);

  // A different search can meet a different record (and so stash pattern).
  const many = Array.from({ length: 12 }, (_, i) => E(rec('jev-m' + i, true, { perHouse: 30000 + i * 100 })));
  const big = load({ '/rivals/jev-v1/': { [courseA.id]: many } });
  const seen = new Set();
  for (let i = 0; i < 30; i++) {
    const m = await big.findRivalMatch({ ...rules.newRivalRace(courseA, [1, 2, 3, 4, 5, 6, 7], { stashSeed: 5 }) }, { courses: [courseA], random: seeded(100 + i) });
    seen.add(m.offers[0].entry.record.stashSeed);
  }
  check('later matches can meet different stash patterns', seen.size >= 3, String(seen.size));
  // The pick does not look at this match's provisional stash seed.
  const picks = new Set();
  for (const stashSeed of [1, 2, 3, 4, 5]) {
    const m = await big.findRivalMatch({ ...rules.newRivalRace(courseA, [1, 2, 3, 4, 5, 6, 7], { stashSeed }) }, { courses: [courseA], random: seeded(42) });
    picks.add(m.offers[0].entry.record.recordingID);
  }
  check('the pick never depends on the stash answers', picks.size === 1);
}

{
  // Identities: all of one bank's Jev races are one rival; a player is their account.
  const s = load({});
  check('one Jev per bank', s.rivalIdentity(E(rec('a', true)), '').key === s.rivalIdentity(E(rec('b', true, { course: courseB }))).key);
  check('Jev in another bank is another rival', s.rivalIdentity({ ...E(rec('a', true)), root: '/rivals/jev-apex-v1/' }).key !== s.rivalIdentity({ ...E(rec('a', true)), root: '/rivals/jev-v1/' }).key);
  check('a player is their account id', s.rivalIdentity(E(rec('p1', false, { human: 'mara' }))).key === 'player:mara' && s.rivalIdentity(E(rec('p1', false, { human: 'mara' }))).displayName === 'mara');

  // The courses a search looks at: its own first, then distinct others.
  const race = { ...rules.newRivalRace(courseB, [1, 2, 3, 4, 5, 6, 7], { stashSeed: 1 }) };
  const list = s.rivalMatchCourses(race, { random: seeded(5) });
  check('four courses, its own first, no repeats', list.length === 4 && list[0] === courseB && new Set(list.map((c) => c.slot)).size === 4);
  const other = s.rivalMatchCourses(race, { random: seeded(6) });
  check('the other courses vary per search', list.slice(1).map((c) => c.slot).join() !== other.slice(1).map((c) => c.slot).join());
}

{
  // Pools never mix: a challenge race reads only its own bank, ordinary never reads a challenge bank.
  fetched.length = 0;
  const hard = [E(rec('hard-1', true))];
  const s = load({ '/rivals/jev-rival-hard-v1/': { [courseA.id]: hard }, '/rivals/jev-v1/': { [courseA.id]: [E(rec('normal-1', true))] } });
  const m = await s.findRivalMatch({ ...rules.newRivalRace(courseA, [1, 2, 3, 4, 5, 6, 7], { stashSeed: 1 }), pool: 'rival-hard' }, { courses: [courseA], random: seeded(2) });
  check('a challenge match reads only its own bank', fetched.length > 0 && fetched.every((u) => u.startsWith('/rivals/jev-rival-hard-v1/')), fetched.join());
  check('and meets that bank\'s Jev', m.identity.key === 'jev@/rivals/jev-rival-hard-v1/' && m.offers[0].entry.record.recordingID === 'hard-1');
  fetched.length = 0;
  const o = await s.findRivalMatch({ ...rules.newRivalRace(courseA, [1, 2, 3, 4, 5, 6, 7], { stashSeed: 1 }) }, { courses: [courseA], random: seeded(2) });
  check('ordinary matchmaking never reads a challenge bank', fetched.every((u) => !/jev-rival-hard|jev-apex/.test(u)) && o.offers[0].entry.record.recordingID === 'normal-1');
  check('an unknown pool name is ordinary', s.rivalPoolName('Rival-Hard') === 'ordinary' && s.rivalPoolName('__proto__') === 'ordinary');

  // The site's SPA fallback answers a missing bank file with index.html and a
  // 200 (netlify.toml, and Vite in development). That is a missing file: no
  // warning, no stand-in, and it is not asked again every search.
  {
    let htmlCalls = 0;
    const warned = [];
    const spa = load({}, { console: { warn: (...a) => warned.push(a.join(' ')) }, fetch: async (url) => {
      htmlCalls++;
      if (url.startsWith('/rivals/jev-v1/')) return { ok: true, headers: { get: () => 'application/json' },
        text: async () => JSON.stringify({ schemaVersion: 1, rulesVersion: rules.RIVAL_RULES_VERSION, opponents: [E(rec('spa-1', true))] }) };
      return { ok: true, status: 200, headers: { get: () => 'text/html; charset=utf-8' }, text: async () => '<!doctype html><html></html>' };
    } });
    const entries = await spa.loadRivalOpponents(courseA);
    const again = await spa.loadRivalOpponents(courseA);
    check('an HTML fallback for a missing bank file counts as no file', entries.map((e) => e.record.recordingID).join() === 'spa-1' && warned.length === 0, warned[0]);
    check('and the answer is kept for the session', again === entries || (again.length === 1 && htmlCalls === 2));
  }

  // A network failure is not cached: the next search asks again.
  let fail = true, calls = 0;
  const flaky = load({}, { fetch: async (url) => { calls++; if (fail) throw new Error('offline');
    return { ok: true, text: async () => JSON.stringify({ schemaVersion: 1, rulesVersion: rules.RIVAL_RULES_VERSION, opponents: url.includes('jev-v1') ? [E(rec('back-1', true))] : [] }) }; } });
  const r1 = await flaky.findRivalMatch({ ...rules.newRivalRace(courseA, [1, 2, 3, 4, 5, 6, 7], { stashSeed: 1 }) }, { courses: [courseA], random: seeded(2) });
  fail = false;
  const r2 = await flaky.findRivalMatch({ ...rules.newRivalRace(courseA, [1, 2, 3, 4, 5, 6, 7], { stashSeed: 1 }) }, { courses: [courseA], random: seeded(2) });
  check('offline finds nobody', r1 === null);
  check('and search again works once the network is back', r2?.offers?.[0]?.entry?.record?.recordingID === 'back-1' && calls >= 4);
}

console.log('');
if (failures.length) {
  console.log(`rival matchmaking: ${passed} passed, ${failures.length} FAILED`);
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log(`rival matchmaking: ${passed} assertions passed`);
