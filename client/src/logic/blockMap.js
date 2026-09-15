// A continuous overhead neighborhood. Unvisited geography is hidden, including
// its roads: progress uncovers a connected patch of land, not a grid of cards.
// Coordinates are stable world units; fitting never changes daily geography.
export const BLOCK_WORLD = { width: 200, height: 220, tile: 2 };
const ROUTE = [
  [32,194,-1],[32,155,-1],[65,155,1],[65,113,1],[30,113,-1],
  [30,68,-1],[30,25,-1],[76,25,1],[119,25,1],[119,68,-1],
  [164,68,1],[164,113,1],[164,157,1],[119,157,-1],[119,198,1]
];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function houseState(i, cleared, maps) {
  const c = clamp(cleared | 0, 0, maps);
  const base = i <= c ? 'revealed' : i === c + 1 ? 'next' : 'fogged';
  return i === maps ? 'finale-' + base : base;
}

// A coordinate hash, never a mutable RNG. Decoration and fog stay identical
// through every clear, replay hide/show, and viewport resize.
export function blockNoise(x, y, seed = 0) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ (seed | 0);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export function distanceToStreet(x, y, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((x-a.x)*dx + (y-a.y)*dy) / (dx*dx + dy*dy || 1), 0, 1);
  return Math.hypot(x - a.x - t*dx, y - a.y - t*dy);
}

export function layoutBlock({ maps = 15, cleared = 0, width, height, x0 = 0, y0 = 0 }) {
  const count = clamp(maps | 0, 1, ROUTE.length);
  const progress = clamp(cleared | 0, 0, count);
  const scale = Math.max(0, Math.min((Number(width)||0)/200, (Number(height)||0)/220));
  const houses = ROUTE.slice(0, count).map(([x,y,side], i) => ({
    index: i+1, state: houseState(i+1, progress, count), finale: i+1 === count,
    road: { x,y }, lamp: { x:x+side*5, y:y+5 },
    x:x+side*13, y:y-1, w:11+(i%3), h:18+(i%4), side
  }));
  const entrance = { x:32, y:214 };
  const streets = houses.map((house,i) => ({
    index:i+1, a:i ? houses[i-1].road : entrance, b:house.road
  }));
  return {
    houses, streets, maps:count, cleared:progress, scale,
    x:x0 + ((Number(width)||0)-200*scale)/2,
    y:y0 + ((Number(height)||0)-220*scale)/2,
    w:200*scale, h:220*scale,
    marker: progress ? houses[progress-1].road : entrance
  };
}

// Each tile belongs to its FIRST visit. This makes reveal strictly cumulative:
// changing progress can only remove fog, never redraw the neighborhood.
export function revealAt(x, y, block, seed = 0) {
  const rough = blockNoise(Math.floor(x/4), Math.floor(y/4), seed);
  for (const house of block.houses) {
    const street = block.streets[house.index-1];
    const roadDistance = distanceToStreet(x,y,street.a,street.b);
    const yardDistance = Math.hypot((x-house.x)*1.05, (y-house.y)*0.9);
    if (roadDistance <= 10 + rough*2 || yardDistance <= 16 + rough*1.5) return house.index;
  }
  return Infinity;
}

export function buildFog(block, seed = 0) {
  const tiles = [];
  for (let y=0; y<BLOCK_WORLD.height; y+=BLOCK_WORLD.tile) {
    for (let x=0; x<BLOCK_WORLD.width; x+=BLOCK_WORLD.tile) {
      tiles.push({ x,y, unlock:revealAt(x+1,y+1,block,seed) });
    }
  }
  return tiles;
}
