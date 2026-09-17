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
  const centers = [[154,350],[613,610],[385,112],[157,598],[610,377],
    [159,115],[388,580],[609,124],[389,369],[365,817]];
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

// Cartographic geometry only: offset avenues, a diagonal boulevard and uneven
// shoreline. Coordinates deliberately leave each actual exterior parcel intact.
export function cityStreets() {
  return [
    [[252,20],[254,208],[270,450],[263,684],[241,908]],
    [[494,18],[492,205],[497,467],[490,704],[478,910]],
    [[712,24],[713,225],[704,476],[720,715],[698,909]],
    [[58,224],[254,208],[492,205],[713,225]],
    [[64,470],[270,450],[497,467],[704,476]],
    [[76,716],[263,684],[490,704],[720,715]],
    [[241,908],[478,910],[698,909]],
    [[72,28],[79,223],[64,470],[76,716],[91,900]]
  ];
}
export function cityShoreline() {
  return [[0,0],[72,0],[67,112],[43,218],[58,330],[35,466],
    [63,602],[45,730],[69,847],[55,920],[0,920]];
}
export function cityStreetDistance(x,y) {
  let best=Infinity;
  for(const route of cityStreets()) for(let i=1;i<route.length;i++){
    const [ax,ay]=route[i-1], [bx,by]=route[i];
    const t=Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2)));
    best=Math.min(best,Math.hypot(x-ax-t*(bx-ax),y-ay-t*(by-ay)));
  }
  return best;
}
// Local exits join their district avenue instead of a single level-chain road.
export function cityBlockConnector(node,mirror=false) {
  const x=node.x-node.w/2+(mirror?168:32)*node.w/200,y=node.y+node.h/2;
  const route=cityStreets()[node.y<240?3:node.y<480?4:node.y<740?5:6];
  let best=null,distance=Infinity;
  for(let i=1;i<route.length;i++){
    const [ax,ay]=route[i-1],[bx,by]=route[i];
    const t=Math.max(0,Math.min(1,(x-ax)/(bx-ax)));
    const px=ax+t*(bx-ax),py=ay+t*(by-ay),d=Math.hypot(px-x,py-y);
    if(d<distance){distance=d;best=[px,py];}
  }
  return [[x,y],best];
}
export function cityClearedOwner(block) {
  return block?.status==='cleared'?gang(block.owner):null;
}
