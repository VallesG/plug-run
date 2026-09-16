// How this block has actually gone. Pure: no imports, no storage, no clock.
//
// WHY THIS EXISTS
// The game measures plenty per house — hits taken, powers spent, bunk picks,
// deaths — and then throws it away at the next scene restart. A contact who
// says "not a scratch on you" has to be able to prove it, so the facts have
// to survive the restarts between houses. This is the smallest record that
// makes a check-in honest, and it is deliberately separate from journey
// progression: losing it must cost a nicer sentence, never a cleared house.
export const BLOCK_RUN_VERSION = 1;
export const POWER_IDS = Object.freeze(['phase', 'dash', 'decoy']);
const MAX_HOUSES = 15;

const count = (value) => Number.isSafeInteger(value) && value > 0 ? value : 0;
const houseNo = (value) => Number.isSafeInteger(value) && value >= 1 && value <= MAX_HOUSES ? value : 0;

export function createBlockRun(value = {}, blockIndex = 1) {
  const block = Number.isSafeInteger(blockIndex) && blockIndex > 0 ? blockIndex : 1;
  // A different block is a different run. No merging, no carry-over.
  if (!value || value.version !== BLOCK_RUN_VERSION || value.blockIndex !== block) {
    return { version: BLOCK_RUN_VERSION, blockIndex: block, cleared: [], deaths: 0, mission: null };
  }
  const seen = new Set();
  const cleared = (Array.isArray(value.cleared) ? value.cleared : [])
    .map(h => ({
      house: houseNo(h?.house),
      hits: count(h?.hits),
      deaths: count(h?.deaths),
      bunk: Boolean(h?.bunk),
      swapped: Boolean(h?.swapped),
      powers: Array.isArray(h?.powers) ? h.powers.filter(p => POWER_IDS.includes(p)).slice(0, 2) : []
    }))
    .filter(h => h.house && !seen.has(h.house) && seen.add(h.house))
    .sort((a, b) => a.house - b.house)
    .slice(0, MAX_HOUSES);
  const mission = value.mission === 'win' || value.mission === 'miss' ? value.mission : null;
  return { version: BLOCK_RUN_VERSION, blockIndex: block, cleared, deaths: count(value.deaths), mission };
}

/** A house came out clean. Recording the same house twice cannot inflate a run. */
export function recordHouseClear(value, blockIndex, house) {
  const state = createBlockRun(value, blockIndex);
  const entry = {
    house: houseNo(house?.house),
    hits: count(house?.hits),
    deaths: count(house?.deaths),
    bunk: Boolean(house?.bunk),
    swapped: Boolean(house?.swapped),
    powers: Array.isArray(house?.powers) ? house.powers.filter(p => POWER_IDS.includes(p)).slice(0, 2) : []
  };
  if (!entry.house) return { state, applied: false };
  if (state.cleared.some(h => h.house === entry.house)) return { state, applied: false };
  return {
    state: { ...state, cleared: [...state.cleared, entry].sort((a, b) => a.house - b.house) },
    applied: true
  };
}

/** A death anywhere in the block. Counted for the run, and for its house. */
export function recordBlockDeath(value, blockIndex) {
  const state = createBlockRun(value, blockIndex);
  return { state: { ...state, deaths: state.deaths + 1 }, applied: true };
}

/**
 * The mission house's outcome, recorded once.
 *
 * A win means the object AND the real bag came out of the briefed house. A
 * miss is a clear without the object. It is never overwritten, so a later
 * house cannot rewrite what happened, and it grants nothing: no REP, no Cash,
 * no stash — it only decides which sentence the debrief uses.
 */
export function recordMissionOutcome(value, blockIndex, outcome) {
  const state = createBlockRun(value, blockIndex);
  if (state.mission || (outcome !== 'win' && outcome !== 'miss')) return { state, applied: false };
  return { state: { ...state, mission: outcome }, applied: true };
}

/**
 * What a contact is allowed to say out loud.
 *
 * Every field here is something the game actually observed. `flawless` means
 * no death and no bullet landed across every cleared house — it is the one a
 * player will notice is wrong, so it is computed from the houses themselves
 * rather than from a running flag that a restart could drop.
 */
export function blockRunStats(value, blockIndex = 1) {
  const state = createBlockRun(value, blockIndex);
  const houses = state.cleared.length;
  const hits = state.cleared.reduce((sum, h) => sum + h.hits, 0);
  const deaths = state.deaths;
  const bunks = state.cleared.filter(h => h.bunk).length;
  const swaps = state.cleared.filter(h => h.swapped).length;
  const powers = {};
  for (const id of POWER_IDS) powers[id] = 0;
  let powersUsed = 0;
  for (const h of state.cleared) for (const p of h.powers) { powers[p]++; powersUsed++; }
  // The power they actually lean on: most used, and only when it is a habit
  // rather than a single press, and only when it is not a tie.
  let topPower = null;
  const ranked = POWER_IDS.map(id => ({ id, n: powers[id] })).sort((a, b) => b.n - a.n);
  if (ranked[0].n >= 2 && ranked[0].n > ranked[1].n) topPower = ranked[0].id;
  const firstTryHouses = state.cleared.filter(h => h.deaths === 0).length;
  return {
    blockIndex: state.blockIndex, houses, hits, deaths, bunks, swaps,
    powers, powersUsed, topPower, firstTryHouses,
    mission: state.mission,
    flawless: houses > 0 && deaths === 0 && hits === 0,
    noDeaths: houses > 0 && deaths === 0,
    cleanBags: houses > 0 && bunks === 0
  };
}
