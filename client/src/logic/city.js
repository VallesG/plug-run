// Personal city progression/cartography only. No imports, clock or gameplay RNG.
// City grouping is permanent v1: changing the cap later needs a version migration.
export const CITY_VERSION = 1;
export const CITY_BLOCKS = 10;
export const CITY_HOUSES = 15;
const GANGS = ['crossline', 'iron-row', 'afterlight'];
const NAMES = ['Duskport', 'Copper Bay', 'Railhaven', 'Neon Vale', 'Greybridge', 'Northwake'];
const int = (value, fallback = 1) => Number.isSafeInteger(value) && value > 0 ? value : fallback;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const gang = value => GANGS.includes(value) ? value : null;

export function cityForBlock(blockIndex = 1) {
  const block = int(blockIndex);
  const number = Math.floor((block - 1) / CITY_BLOCKS) + 1;
  return cityIdentity(number);
}
export function cityIdentity(index = 1) {
  const number = int(index);
  const firstBlock = (number - 1) * CITY_BLOCKS + 1;
  return {
    number, id: 'city-v1-' + number,
    name: NAMES[(number - 1) % NAMES.length],
    label: NAMES[(number - 1) % NAMES.length] + ' · CITY ' + number,
    firstBlock, lastBlock: firstBlock + CITY_BLOCKS - 1
  };
}
export function createCityState(value = {}, checkpoint = {}) {
  const v = value && typeof value === 'object' ? value : {};
  // An ordered legacy checkpoint proves completion, never historical ownership.
  const completedThrough = Math.max(nonnegative(v.completedThrough), int(checkpoint?.blockIndex) - 1);
  const owners = {};
  if (v.owners && typeof v.owners === 'object' && !Array.isArray(v.owners)) {
    for (const [key, owner] of Object.entries(v.owners)) {
      const block = Number(key);
      if (int(block, 0) && block <= completedThrough && gang(owner)) owners[block] = owner;
    }
  }
  const active = v.active && int(v.active.blockIndex, 0) && gang(v.active.gangID)
    ? { blockIndex: v.active.blockIndex, gangID: v.active.gangID } : null;
  return { version: CITY_VERSION, completedThrough, owners,
    active: active && active.blockIndex > completedThrough ? active : null };
}
export function beginCityBlock(value, blockIndex, gangID, checkpoint = {}) {
  const state = createCityState(value, checkpoint);
  const block = int(blockIndex);
  if (state.active?.blockIndex === block) return { state, gangID: state.active.gangID };
  const owner = gang(gangID);
  if (!owner || block !== state.completedThrough + 1) return { state, gangID: owner };
  return { state: { ...state, active: { blockIndex: block, gangID: owner } }, gangID: owner };
}
export function claimCityBlock(value, event = {}) {
  const state = createCityState(value);
  const block = int(event.blockIndex, 0);
  if (event.mode !== 'pve' || event.runKind !== 'journey' || event.role !== 'runner'
    || event.clearedHouses !== CITY_HOUSES || event.hasStash !== true
    || !block || block !== state.completedThrough + 1) return { state, applied: false };
  const owner = state.active?.blockIndex === block ? state.active.gangID : gang(event.gangID);
  return { state: { ...state, completedThrough: block,
    owners: owner ? { ...state.owners, [block]: owner } : state.owners, active: null }, applied: true };
}
export function cityView(value, checkpoint = {}, cityIndex) {
  const state = createCityState(value, checkpoint);
  const currentBlock = int(checkpoint?.blockIndex);
  const unlockedCity = cityForBlock(Math.max(currentBlock, state.completedThrough + 1)).number;
  const city = cityIdentity(Math.min(unlockedCity, int(cityIndex, cityForBlock(currentBlock).number)));
  const clearedBlocks = Math.max(0, Math.min(CITY_BLOCKS, state.completedThrough - city.firstBlock + 1));
  const houses = Math.max(0, Math.min(CITY_HOUSES - 1, int(checkpoint?.pveRound) - 1));
  const stashes = clearedBlocks * CITY_HOUSES
    + (currentBlock >= city.firstBlock && currentBlock <= city.lastBlock
      && currentBlock > state.completedThrough ? houses : 0);
  return { city, unlockedCity, clearedBlocks, stashes, stashGoal: CITY_BLOCKS * CITY_HOUSES,
    currentBlock, blocks: Array.from({ length: CITY_BLOCKS }, (_, i) => {
      const blockIndex = city.firstBlock + i;
      const complete = blockIndex <= state.completedThrough;
      return { blockIndex, local: i + 1, owner: state.owners[blockIndex] || null,
        status: complete ? 'cleared' : blockIndex === currentBlock ? 'current' : 'locked' };
    }) };
}
export function shouldShowCity({ mode, runKind, role, menuEntry, requested } = {}) {
  return mode === 'pve' && runKind === 'journey' && role === 'runner' && Boolean(menuEntry || requested);
}
export function cityMapLayout(area = {}) {
  const width = Math.max(0, Number.isFinite(area.width) ? area.width : 0);
  const height = Math.max(0, Number.isFinite(area.height) ? area.height : 0);
  const scale = Math.min(width / 320, height / 390);
  const x = (Number.isFinite(area.x) ? area.x : 0) + (width - 320 * scale) / 2;
  const y = (Number.isFinite(area.y) ? area.y : 0) + (height - 390 * scale) / 2;
  const nodes = Array.from({ length: CITY_BLOCKS }, (_, i) => {
    const row = Math.floor(i / 2);
    // A snaking arterial road, not ten unrelated menu cards.
    return { local: i + 1, x: (row % 2 ? 1 - i % 2 : i % 2) ? 237 : 83,
      y: 42 + row * 76, w: 116, h: 58 };
  });
  return { x, y, scale, width: 320, height: 390, nodes };
}
