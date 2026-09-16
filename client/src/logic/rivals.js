// Race decisions only: no Phaser, storage, clocks or imports.
// Bump RULES_VERSION whenever geometry, powers or defender rules change.
export const RIVAL_RULES_VERSION = 'rivals-v1';
export const RIVAL_HOUSES = 7;
export const RIVAL_COUNTDOWN_MS = 3000;
export const RIVAL_TRANSITION_MS = 180;
export const RIVAL_RETRY_MS = 650;
export const RIVAL_HUD_HEIGHT = 84;
// Existing combat balance is authored at a 24px cell. Race distances must
// scale with the arena so a narrower viewport does not make bullets faster.
export function rivalPixels(value, cell) { return value * cell / 24; }
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
export function newRivalRace(course, rivalTimes) {
  if (!Array.isArray(rivalTimes) || rivalTimes.length !== RIVAL_HOUSES ||
      rivalTimes.some((t,i)=>!Number.isFinite(t) || t <= (rivalTimes[i-1] ?? 0))) throw new Error('Invalid opponent splits');
  return { course, rivalTimes: rivalTimes.slice(), opponentKind: 'simulated-ai',
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
  return { version:RIVAL_RULES_VERSION, courseID:race.course.id,
    seeds:race.course.seeds.slice(), powers:race.powers.slice(),
    clearTimes:race.clearTimes.slice(), elapsedMs:race.clearTimes[RIVAL_HOUSES-1],
    retries:race.retries, source:'local-player', verified:false };
}
