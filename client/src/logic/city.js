// Personal city progression/cartography only. No imports, clock or gameplay RNG.
// City grouping is permanent v1: changing the cap later needs a version migration.
export const CITY_VERSION = 1;
export const CITY_BLOCKS = 10;
export const CITY_HOUSES = 15;
// City 1 is the released story. The Block 11 checkpoint is kept as proof
// of completion so each gang can resume when the next season opens.
export const STORY_FINAL_BLOCK = CITY_BLOCKS;
export function storySeasonComplete(checkpoint = {}, cityState = {}) {
  return (Number.isSafeInteger(checkpoint?.blockIndex) && checkpoint.blockIndex > STORY_FINAL_BLOCK)
    || (Number.isSafeInteger(cityState?.completedThrough) && cityState.completedThrough >= STORY_FINAL_BLOCK);
}
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
export function cityMapLayout(area = {}, variant = 'story') {
  const width = Math.max(0, Number.isFinite(area.width) ? area.width : 0);
  const height = Math.max(0, Number.isFinite(area.height) ? area.height : 0);
  const scale = Math.min(width / 760, height / 920);
  // Spatial order is deliberately unrelated to progression order.
  const centers = variant==='rivals'
    ? [[156,174],[329,334],[149,596],[359,754],[643,173],[637,463],[610,802]]
    : [[180,220],[615,695],[360,160],[180,620],[650,400],
      [110,420],[365,710],[650,140],[340,415],[585,850]];
  return { x: (Number.isFinite(area.x) ? area.x : 0) + (width - 760 * scale) / 2,
    y: (Number.isFinite(area.y) ? area.y : 0) + (height - 920 * scale) / 2,
    scale, width: 760, height: 920,
    nodes: centers.map(([x,y],i) => ({ local: i + 1, x,y,w:100,h:110 })) };
}
export function cityZoomFrames(area, node, variant='story') {
  const overview = cityMapLayout(area,variant);
  const scale = Math.min(area.width / node.w, area.height / node.h);
  const focus = factor => ({ scale: factor,
    x: area.x + area.width / 2 - node.x * factor,
    y: area.y + area.height / 2 - node.y * factor });
  return { overview, neighborhood: focus(Math.min(scale, overview.scale * 2.8)),
    block: focus(scale) };
}

// Each district has its own irregular street network. The river cuts through
// the middle of town; transverse boulevards become bridges at its banks.
export function cityStreets(variant='story') {
  if(variant==='rivals')return [
    [[40,250],[220,248],[255,220],[260,80],[430,60]],
    [[40,490],[244,490],[430,510],[713,540]],
    [[244,490],[248,659],[280,687],[443,669],[700,677]],
    [[280,687],[275,881],[446,892],[705,875]],
    [[220,248],[251,267],[256,410],[244,490]],
    [[430,60],[447,270],[430,510],[443,669],[446,892]],
    [[550,45],[560,266],[551,388],[550,600],[528,894]],
    [[560,266],[715,275],[713,540],[700,677],[705,875]],
    [[251,267],[447,270],[560,266],[715,275]]
  ];
  return [
    [[48,298],[102,300],[235,287],[282,279],[432,280],[568,290],[711,270]],
    [[282,279],[280,30]],
    [[48,530],[255,532],[432,548],[568,544],[715,538]],
    [[255,532],[264,788],[438,790],[545,775],[715,782]],
    [[264,788],[252,903],[438,904],[715,914]],
    [[48,298],[42,530],[74,784],[252,903]],
    [[255,532],[246,350],[282,279]],
    [[432,280],[428,30]],
    [[432,548],[438,790],[438,904]],
    [[568,290],[574,48],[720,38],[711,270],[715,538],[715,782],[715,914]]
  ];
}
export function cityShoreline(variant='story') {
  const line=variant==='rivals'
    ? [[490,0],[510,125],[490,290],[478,440],[510,595],[478,760],[487,920]]
    : [[499,0],[477,164],[511,323],[484,490],[524,641],[490,785],[480,920]];
  return [...line.map(([x,y])=>[x-28,y]),...line.slice().reverse().map(([x,y])=>[x+28,y])];
}
export function cityStreetDistance(x,y,variant='story') {
  let best=Infinity;
  for(const route of cityStreets(variant)) for(let i=1;i<route.length;i++){
    const [ax,ay]=route[i-1], [bx,by]=route[i];
    const t=Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2)));
    best=Math.min(best,Math.hypot(x-ax-t*(bx-ax),y-ay-t*(by-ay)));
  }
  return best;
}
export function cityBlockConnector(node,mirror=false,variant='story') {
  const x=node.x-node.w/2+(mirror?168:32)*node.w/200,y=node.y+node.h/2;
  let best=null,distance=Infinity;
  for(const route of cityStreets(variant))for(let i=1;i<route.length;i++){
    const [ax,ay]=route[i-1],[bx,by]=route[i];
    const t=Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2)));
    const px=ax+t*(bx-ax),py=ay+t*(by-ay),d=Math.hypot(px-x,py-y);
    if(d<distance){distance=d;best=[px,py];}
  }
  return [[x,y],best];
}
export function cityClearedOwner(block) {
  return block?.status==='cleared'?gang(block.owner):null;
}
