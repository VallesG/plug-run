// Race decisions only: no Phaser, storage, clocks or imports.
// Bump RULES_VERSION whenever geometry, powers or defender rules change.
export const RIVAL_RULES_VERSION = 'rivals-v1';
export const RIVAL_HOUSES = 7;
export const RIVAL_COUNTDOWN_MS = 3000;
export const RIVAL_TRANSITION_MS = 180;
export const RIVAL_RETRY_MS = 650;
// Rivals chrome overlays the perimeter so phones keep the full 16x35 arena.
export const RIVAL_HUD_HEIGHT = 0;
export function rivalHudLayout(width, height) {
  const w=Math.max(240,Number(width)||240), h=Math.max(360,Number(height)||360);
  const margin=Math.max(7,Math.min(12,Math.floor(w*.025)));
  const railW=Math.max(7,Math.min(11,Math.floor(w*.024)));
  const gap=Math.max(4,Math.min(7,Math.floor(h*.007)));
  const available=Math.max(168,h-128);
  const segmentH=Math.max(18,Math.min(52,Math.floor((available-gap*(RIVAL_HOUSES-1))/RIVAL_HOUSES)));
  const totalH=segmentH*RIVAL_HOUSES+gap*(RIVAL_HOUSES-1);
  const startY=Math.max(70,Math.floor((h-totalH)/2));
  const segmentYs=Array.from({length:RIVAL_HOUSES},(_,i)=>startY+segmentH/2+i*(segmentH+gap));
  return {leftX:margin+railW/2,rightX:w-margin-railW/2,railW,segmentH,gap,startY,totalH,segmentYs};
}
// Existing combat balance is authored at a 24px cell. Race distances must
// scale with the arena so a narrower viewport does not make bullets faster.
export function rivalPixels(value, cell) { return value * cell / 24; }

// LEGACY CAPTURE ASSIGNMENT, PER ATTEMPT.
//
// A retry replays the same house — same seed, same layout — but must NOT
// replay which bag is genuine: a player (or a bot, or Jev) that died once
// would otherwise know the answer on every retry, and a bot that never learns
// walks into the same bunk forever. It used to be one fixed draw per house
// seed, so on Low End Rush house 4 the same pocket was bunk on all 59
// attempts of a paid Jev run.
//
// Attempt k takes the k-th draw of the house's stash stream,
// mulberry32(houseSeed ^ 0xC0FFEE). Attempt 1 is therefore exactly the old
// single draw — the simulated pace, the course tests and the first attempt of
// every shipped recording are unchanged — and each retry rerolls
// independently. Deterministic and replayable from (houseSeed, attempt),
// both of which every replay segment already records. Genuinely random: two
// attempts in a row can land on the same pocket.
//
// @returns 0 = primary pocket (arena.objectives.stash), 1 = secondary
//          (arena.objectives.extract pocket)
export function rivalGenuinePocket(houseSeed, attempt = 1) {
  let t = ((houseSeed ^ 0xC0FFEE) | 0) >>> 0;
  let v = 0;
  const draws = Math.max(1, Math.floor(Number(attempt) || 1));
  for (let i = 0; i < draws; i++) {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    v = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  }
  return v < 0.5 ? 0 : 1;
}

// WHICH POCKET HOLDS THE GENUINE STASH IN A LIVE RIVALS MATCH.
//
// The course seed owns geometry. `stashSeed` owns this particular match's
// seven answers. A death reuses the same race object and therefore the same
// answer; starting a new Rivals match creates a fresh stashSeed, so seeing the
// same course later does not reveal its bags. This is the PvP rule: learnable
// inside one match, unknowable before the next one.
export function rivalSessionPocket(houseSeed, stashSeed) {
  return (rivalHash('stash/' + (stashSeed >>> 0) + '/' + (houseSeed >>> 0)) & 1) ? 1 : 0;
}

export function newRivalStashSeed(random = Math.random) {
  const n = Math.floor(Number(random()) * 0x100000000);
  return Number.isFinite(n) ? n >>> 0 : 1;
}

// Recordings can race only the same seven answers. Different session seeds
// may generate the same pattern; old per-retry recordings are ineligible.
export function rivalRecordMatchesStashes(record, race) {
  return record?.stashRules === 'match-v1' && Number.isInteger(record.stashSeed) &&
    race.course.seeds.every(seed => rivalSessionPocket(seed, record.stashSeed) === rivalSessionPocket(seed, race.stashSeed));
}

export function randomRivalSlot(random = Math.random) {
  const pool = enabledRivalCourses();
  return pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))]?.slot ?? null;
}

// The attempt a house is about to start: one more than the attempts the
// race's capture has already opened there. The same count
// RivalReplayCapture.beginAttemptCapture stamps on the segment, so the
// assignment made when the house is built is the one the replay records.
export function rivalUpcomingAttempt(race, house) {
  const done = race?.capture?.houseAttempts?.[house];
  return (Number.isInteger(done) && done > 0 ? done : 0) + 1;
}
const POWERS = ['phase', 'dash', 'decoy'];

export function rivalHash(value) {
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  return (h ^ (h >>> 15)) >>> 0;
}
export function rivalCourse(seed) {
  const id = Number.isFinite(seed) ? seed >>> 0 : 1;
  return {
    version: RIVAL_RULES_VERSION, id: RIVAL_RULES_VERSION + '-' + id, seed: id,
    cols: 16, rows: 35,
    seeds: Array.from({length:RIVAL_HOUSES}, (_,i) => rivalHash(RIVAL_RULES_VERSION + '/' + id + '/house/' + (i+1))),
    scales: [0.6, 0.75, 0.9, 0.95, 1, 1, 1]
  };
}
// FIXED COURSE POOL. One course is one complete seven-house race, never seven
// alternate seeds for a single house. Root seeds are rivalHash(DOMAIN + slug)
// and are pinned here as literals: if the hash, the domain or a name ever
// drifts, the test that recomputes them fails instead of every recorded
// opponent silently becoming ineligible. This is independent of the Daily
// route/seed arithmetic on purpose.
export const RIVAL_COURSE_POOL_DOMAIN = 'plug-run/rivals/course-pool/v1/';
export function rivalSlug(name) { return String(name).trim().toLowerCase().replace(/\s+/g, '-'); }
const POOL_V1 = [
  ['Low End Rush', 2722422571], ['Copper Climb', 2917822448], ['Freight Run', 1245351574],
  ['Afterglow Mile', 2476136539], ['Switchyard Seven', 2143714553], ['Lastlight Loop', 2077357177],
  ['Blacktop Crown', 2334749748]
];
export const RIVAL_COURSE_POOL = Object.freeze(POOL_V1.map(([name, seed], i) => Object.freeze({
  slot: i + 1, name, slug: rivalSlug(name), seed, courseID: RIVAL_RULES_VERSION + '-' + seed,
  rulesVersion: RIVAL_RULES_VERSION, enabled: true
})));
export function enabledRivalCourses(pool = RIVAL_COURSE_POOL) { return pool.filter(c => c.enabled); }
export function rivalPoolEntry(slot, pool = RIVAL_COURSE_POOL) {
  return pool.find(c => c.slot === slot && c.enabled) ?? null;
}
export function rivalPoolEntryBySeed(seed, pool = RIVAL_COURSE_POOL) {
  return pool.find(c => c.seed === (seed >>> 0) && c.enabled) ?? null;
}
// New Race policy: rotate to the next enabled slot after the one just raced,
// wrapping at the end. Unknown or missing history starts at the first enabled
// slot. Deterministic so a test can predict it and a player learns the order.
export function nextRivalSlot(afterSlot, pool = RIVAL_COURSE_POOL) {
  const enabled = enabledRivalCourses(pool);
  if (!enabled.length) return null;
  const idx = enabled.findIndex(c => c.slot === afterSlot);
  return enabled[idx < 0 ? 0 : (idx + 1) % enabled.length].slot;
}
// A course built from the pool carries its slot and display name; a course
// built from a bare seed (legacy rematch data) does not.
export function rivalPoolCourse(slot, pool = RIVAL_COURSE_POOL) {
  const entry = rivalPoolEntry(slot, pool);
  return entry ? { ...rivalCourse(entry.seed), slot: entry.slot, name: entry.name } : null;
}
export function validRivalPowers(powers) {
  return Array.isArray(powers) && powers.length === 2 && powers.every(p => POWERS.includes(p));
}
export function rivalElapsed(race, now) {
  return race.startedAt == null ? 0 : Math.max(0, now - race.startedAt);
}
export function rivalProgress(clearTimes, elapsed) {
  return clearTimes.filter(t => t <= Math.max(0, elapsed)).length;
}
export function rivalOutcome(playerTimes, rivalTimes, elapsed) {
  const player = playerTimes.length === RIVAL_HOUSES ? playerTimes[RIVAL_HOUSES-1] : Infinity;
  const rival = rivalTimes.length === RIVAL_HOUSES ? rivalTimes[RIVAL_HOUSES-1] : Infinity;
  if (Math.min(player, rival) > elapsed) return null;
  if (player === rival) return 'draw';
  return player < rival ? 'win' : 'loss';
}
export function recordRivalClear(race, house, elapsed) {
  if (race.status !== 'racing' || house !== race.clearTimes.length + 1 ||
      house > RIVAL_HOUSES || !Number.isFinite(elapsed) || elapsed <= 0 ||
      elapsed <= (race.clearTimes.at(-1) ?? 0)) return race;
  return { ...race, clearTimes: [...race.clearTimes, elapsed] };
}
export function rivalTimeLabel(ms) {
  const tenths = Math.floor(Math.max(0, Number.isFinite(ms) ? ms : 0) / 100);
  return Math.floor(tenths / 600) + ':' + String(Math.floor(tenths / 10) % 60).padStart(2, '0') + '.' + (tenths % 10);
}
// BFS measures the generated house, not an invented opponent finish time.
export function rivalPathSteps(grid, start, end) {
  const h = grid.length, w = grid[0]?.length ?? 0;
  const open = p => p && p.x >= 0 && p.y >= 0 && p.x < w && p.y < h && grid[p.y][p.x] !== 1;
  if (!open(start) || !open(end)) return Infinity;
  const queue = [{...start, d:0}], seen = new Set([start.y*w+start.x]);
  for (let i=0;i<queue.length;i++) {
    const p = queue[i];
    if (p.x===end.x && p.y===end.y) return p.d;
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const n = {x:p.x+dx,y:p.y+dy,d:p.d+1}, key=n.y*w+n.x;
      if (open(n) && !seen.has(key)) { seen.add(key); queue.push(n); }
    }
  }
  return Infinity;
}
// An explicitly simulated pace trial, NOT a recording of combat or a human.
// Precomputed once from course distances; never adjusts to player performance.
export function simulatedRivalTimes(metrics, seed) {
  if (!Array.isArray(metrics) || metrics.length !== RIVAL_HOUSES) throw new Error('Seven house metrics required');
  let elapsed = 0;
  return metrics.map((m,i) => {
    if (![m.searchSteps,m.carrySteps].every(n=>Number.isFinite(n) && n>=0)) throw new Error('Unreachable rival course');
    const hesitation = 2600 + rivalHash(seed + '/pace/' + i) % 3800;
    const walking = 1000 * (m.searchSteps/7 + m.carrySteps/(7*0.85));
    elapsed += Math.round(Math.max(8500, walking + hesitation)) + (i ? RIVAL_TRANSITION_MS : 0);
    return elapsed;
  });
}
export function newRivalRace(course, rivalTimes, { stashSeed = newRivalStashSeed() } = {}) {
  if (!Array.isArray(rivalTimes) || rivalTimes.length !== RIVAL_HOUSES ||
      rivalTimes.some((t,i)=>!Number.isFinite(t) || t <= (rivalTimes[i-1] ?? 0))) throw new Error('Invalid opponent splits');
  return { course, rivalTimes: rivalTimes.slice(), stashSeed: stashSeed >>> 0, opponentKind: 'simulated-ai',
    status:'ready', startedAt:null, countdownEndsAt:null, clearTimes:[],
    powers:[], retries:0, result:null };
}
// Structural compatibility only. Client records are untrusted, not server-verified.
export function compatibleRivalRecord(record, course, powers) {
  return !!record && record.version === RIVAL_RULES_VERSION &&
    record.courseID === course.id && JSON.stringify(record.seeds) === JSON.stringify(course.seeds) &&
    validRivalPowers(record.powers) && JSON.stringify(record.powers) === JSON.stringify(powers) &&
    Array.isArray(record.clearTimes) && record.clearTimes.length === RIVAL_HOUSES &&
    record.clearTimes.every((t,i)=>Number.isFinite(t) && t > (record.clearTimes[i-1] ?? 0)) &&
    record.elapsedMs === record.clearTimes[RIVAL_HOUSES-1];
}
export function rivalRecord(race) {
  if (race.clearTimes.length !== RIVAL_HOUSES || !validRivalPowers(race.powers)) return null;
  const initialPowers=race.capture?.initialPowers || race.powers;
  const mixed=race.capture?.attempts?.some(a=>a.orderedPowers && JSON.stringify(a.orderedPowers)!==JSON.stringify(initialPowers));
  return { version:RIVAL_RULES_VERSION, courseID:race.course.id,
    seeds:race.course.seeds.slice(), powers:initialPowers.slice(),
    ...(mixed ? {attemptPowers:race.capture.attempts.map(a=>({house:a.house,attempt:a.attempt,powers:a.orderedPowers?.slice() ?? null}))} : {}),
    clearTimes:race.clearTimes.slice(), elapsedMs:race.clearTimes[RIVAL_HOUSES-1],
    retries:race.retries, source:'local-player', verified:false };
}

// Cosmetic only: clears remain the sole authority for race outcomes.
export function rivalHouseFill(cleared, carrying = false) {
  const whole = Math.max(0, Math.min(RIVAL_HOUSES, Math.floor(cleared) || 0));
  return Array.from({length:RIVAL_HOUSES}, (_,i) => i < whole ? 1 : i === whole && carrying ? 0.5 : 0);
}

// Absolute race-clock windows, including failed attempts. Only actual pickup
// events count; death/timeout closes the window before the retry begins.
export function rivalPickupWindows(bundle) {
  const windows = [];
  for (const s of bundle?.segments || []) {
    if (!Number.isFinite(s.startedMs) || !Number.isFinite(s.durationMs) ||
        !Number.isInteger(s.house) || s.house < 1 || s.house > RIVAL_HOUSES) continue;
    const events = s.replay?.events || [];
    const pickup = events.find(e => e.k === 'pickup' && Number.isFinite(e.t) && e.t >= 0 && e.t <= s.durationMs);
    if (!pickup) continue;
    const end = events.filter(e => ['death','timeout','extract'].includes(e.k) && Number.isFinite(e.t) && e.t >= pickup.t)
      .reduce((t,e) => Math.min(t,e.t),s.durationMs);
    if (end > pickup.t) windows.push({house:s.house,start:s.startedMs+pickup.t,end:s.startedMs+end});
  }
  return windows;
}
export function rivalCarryingAt(windows, cleared, elapsed) {
  return cleared < RIVAL_HOUSES && (windows || []).some(w =>
    w.house === cleared+1 && elapsed >= w.start && elapsed < w.end);
}

// Find an open patch near the upper centre. No grid mutations or gameplay RNG.
// Everything painted inside this footprint is below walls, props and actors.
export function rivalFloorClock(grid) {
  const rows=grid?.length || 0, cols=grid?.[0]?.length || 0;
  for (const [w,h] of [[5,2],[4,2],[4,1],[3,1]]) {
    let best=null, score=Infinity;
    for(let y=1;y+h<rows;y++) for(let x=1;x+w<cols;x++) {
      let open=true;
      for(let dy=0;dy<h && open;dy++) for(let dx=0;dx<w;dx++) {
        if(grid[y+dy]?.[x+dx] !== 0) { open=false; break; }
      }
      if(!open) continue;
      const d=Math.abs(x+w/2-cols/2)+Math.abs(y+h/2-3.5)*1.5;
      if(d<score) { score=d; best={x:x+w/2,y:y+h/2,width:w-.35,height:Math.min(1.3,h-.2)}; }
    }
    if(best) return best;
  }
  return null;
}

// Shared live/replay framing. Presentation chrome NEVER subtracts arena height.
export function rivalArenaLayout(width,height,cols=16,rows=35){
  const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
  const cell=Math.max(8,Math.floor(Math.min(w/cols,h/rows)));
  return {cell,pad:{x:Math.max(0,Math.floor((w-cols*cell)/2)),y:Math.max(0,Math.floor((h-rows*cell)/2))}};
}
