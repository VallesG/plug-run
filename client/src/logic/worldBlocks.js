// Permanent v1 world identity. No clock, mutable RNG, storage or imports.
export const WORLD_VERSION = 1;
export const WORLD_HOUSES = 15;
const DISTRICTS = [
  { name: 'The Low End', streets: ['Mercer Row', 'Ash Lane', 'Hollow Court', 'Lantern Street'], arrival: 'The lights are out. Someone is still home.', departure: 'A few more windows glow behind you.' },
  { name: 'Copper Heights', streets: ['Copper Rise', 'Alder Terrace', 'Crown Avenue', 'Lookout Row'], arrival: 'Higher fences. Same way out.', departure: 'The hill disappears in the rearview.' },
  { name: 'Freight Ward', streets: ['Switchyard Row', 'Foundry Lane', 'Railhead Court', 'Iron Street'], arrival: 'The freight runs all night. So do you.', departure: 'Another train covers your exit.' },
  { name: 'Afterglow', streets: ['Neon Court', 'Lastlight Lane', 'Signal Avenue', 'Dawn Row'], arrival: 'Past the neon, the city keeps going.', departure: 'Not sunrise yet. There is another block.' }
];
const positive = (n, fallback = 1) => Number.isSafeInteger(n) && n > 0 ? n : fallback;
export function worldHash(value) {
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}
export function worldBlock(index = 1) {
  const number = positive(index);
  const district = DISTRICTS[Math.floor((number - 1) / 4) % DISTRICTS.length];
  const seed = worldHash('plug-run/world/v1/block/' + number);
  return { number, id: 'world-v1-' + number, seed,
    name: district.streets[(number - 1) % 4],
    district: district.name, arrival: district.arrival, departure: district.departure,
    label: district.streets[(number - 1) % 4] + ' · #' + String(number).padStart(3, '0') };
}
export function worldHouseSeed(blockIndex, houseIndex, role = 'runner') {
  return worldHash(worldBlock(blockIndex).id + '/house/' +
    Math.min(WORLD_HOUSES, positive(houseIndex)) + '/' + role);
}
export function journeyCheckpoint(value = {}) {
  const v = value && typeof value === 'object' ? value : {};
  const amount = n => Number.isFinite(n) && n >= 0 ? n : 0;
  return { version: WORLD_VERSION, blockIndex: positive(v.blockIndex),
    pveRound: Math.min(WORLD_HOUSES, positive(v.pveRound)),
    pveSessionStash: amount(v.pveSessionStash), pveSessionRep: amount(v.pveSessionRep),
    pveCleanStreak: Math.floor(amount(v.pveCleanStreak)),
    pveBestRound: Math.min(WORLD_HOUSES, Math.floor(amount(v.pveBestRound))),
    retryAfterDeath: v.retryAfterDeath === true,
    swapSpawnCycle: Math.floor(amount(v.swapSpawnCycle)),
    runId: typeof v.runId === 'string' ? v.runId : undefined };
}
export function advanceJourney(value) {
  const v = journeyCheckpoint(value);
  if (v.pveRound < WORLD_HOUSES) return { ...v, pveRound: v.pveRound + 1, retryAfterDeath: false, swapSpawnCycle: 0 };
  return journeyCheckpoint({ blockIndex: v.blockIndex + 1 });
}
