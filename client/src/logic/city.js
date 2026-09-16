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
  const introThrough = Math.max(nonnegative(v.introThrough), completedThrough,
    int(checkpoint?.pveRound) > 1 ? int(checkpoint?.blockIndex) : 0);
  return { version: CITY_VERSION, completedThrough, introThrough, owners,
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
  return { state: { ...state, completedThrough: block, introThrough: Math.max(state.introThrough, block),
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
export function shouldShowCity({ mode, runKind, role, pveRound, retryAfterDeath } = {}) {
  return mode === 'pve' && runKind === 'journey' && role === 'runner'
    && pveRound === 1 && !retryAfterDeath;
}
// Claim before presentation; a monotonic watermark survives arbitrarily many cities.
export function claimCityIntro(value, checkpoint = {}) {
  const state = createCityState(value, checkpoint);
  const block = int(checkpoint.blockIndex, 0);
  if (!block || checkpoint.pveRound !== 1 || block !== state.completedThrough + 1
    || block <= state.introThrough) return { state, applied: false };
  return { state: { ...state, introThrough: block }, applied: true };
}
export function cityMapLayout(area = {}) {
  const width = Math.max(0, Number.isFinite(area.width) ? area.width : 0);
  const height = Math.max(0, Number.isFinite(area.height) ? area.height : 0);
  const scale = Math.min(width / 760, height / 920);
  // Spatial order is deliberately unrelated to progression order.
  const centers = [[150,359],[616,642],[378,132],[136,603],[626,388],
    [136,126],[382,612],[616,156],[390,363],[374,826]];
  return { x: (Number.isFinite(area.x) ? area.x : 0) + (width - 760 * scale) / 2,
    y: (Number.isFinite(area.y) ? area.y : 0) + (height - 920 * scale) / 2,
    scale, width: 760, height: 920,
    nodes: centers.map(([x,y],i) => ({ local: i + 1, x,y,w:144,h:158.4 })) };
}
export function cityZoomFrames(area, node) {
  const overview = cityMapLayout(area);
  const scale = Math.min(area.width / node.w, area.height / node.h);
  const focus = factor => ({ scale: factor,
    x: area.x + area.width / 2 - node.x * factor,
    y: area.y + area.height / 2 - node.y * factor });
  return { overview, neighborhood: focus(Math.min(scale, overview.scale * 2.8)),
    block: focus(scale) };
}
