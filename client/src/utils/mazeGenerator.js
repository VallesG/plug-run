import { steps as walkSteps, hardChokes, routeAlternative, shortestPath, stepsFrom } from '../logic/rivalCourseAnalysis.js';

const TILE_TYPES = { FLOOR: 0, WALL: 1 };

export const THEMES = [
  {
    key: 'house_wood',
    bg: 0x080a10,
    floorTint: 0xa8845f,
    wallFillTint: 0x160f0a,
    wallEdgeTint: 0xff7a1a,
    furnTint: 0xffd9a8,
    carTint: 0x00e5ff,
    floorSet: 'wood'
  },
  {
    key: 'loft_concrete',
    bg: 0x0b0f16,
    floorTint: 0xffffff,
    wallFillTint: 0x11151c,
    wallEdgeTint: 0x8f7dff,
    furnTint: 0xdde3ea,
    carTint: 0x7df9ff,
    floorSet: 'checker',
    checkerColors: [0x2a303c, 0x363e4d]
  },
  {
    key: 'green_villa',
    bg: 0x0a0d0a,
    floorTint: 0xffffff,
    wallFillTint: 0x0e1510,
    wallEdgeTint: 0x2bff8f,
    furnTint: 0xe8f5dc,
    carTint: 0x2fb3ff,
    floorSet: 'checker',
    checkerColors: [0x22352a, 0x2c4536]
  },
  {
    key: 'studio_white',
    bg: 0x0b0f16,
    floorTint: 0xffffff,
    wallFillTint: 0x12151f,
    wallEdgeTint: 0xff4fd8,
    furnTint: 0xf3f4f6,
    carTint: 0x93c5fd,
    floorSet: 'checker',
    checkerColors: [0x2b3040, 0x384054]
  },
  {
    key: 'sand_wood',
    bg: 0x0b0f12,
    floorTint: 0xb8956a,
    wallFillTint: 0x17140e,
    wallEdgeTint: 0xffc857,
    furnTint: 0xffe9c4,
    carTint: 0x60a5fa,
    floorSet: 'wood'
  },
  {
    key: 'cyan_tech',
    bg: 0x0a0e14,
    floorTint: 0xffffff,
    wallFillTint: 0x0e161d,
    wallEdgeTint: 0x2ee6ff,
    furnTint: 0xd1dce5,
    carTint: 0x67e8f9,
    floorSet: 'checker',
    checkerColors: [0x1f3340, 0x294252]
  },
  {
    key: 'purple_noir',
    bg: 0x0d0a12,
    floorTint: 0x9683ad,
    wallFillTint: 0x140f1c,
    wallEdgeTint: 0xb45cff,
    furnTint: 0xe8dcf5,
    carTint: 0xc084fc,
    floorSet: 'wood'
  },
  {
    key: 'sunset_coral',
    bg: 0x120a0d,
    floorTint: 0xb58275,
    wallFillTint: 0x1c1013,
    wallEdgeTint: 0xff5f7a,
    furnTint: 0xffd9cc,
    carTint: 0xfda4af,
    floorSet: 'wood'
  },
  {
    key: 'teal_modern',
    bg: 0x0a1214,
    floorTint: 0xffffff,
    wallFillTint: 0x0d1719,
    wallEdgeTint: 0x14e8cc,
    furnTint: 0xd9f2ef,
    carTint: 0x5eead4,
    floorSet: 'checker',
    checkerColors: [0x1f3538, 0x294648]
  },
  {
    key: 'amber_lounge',
    bg: 0x100e0a,
    floorTint: 0xab935e,
    wallFillTint: 0x191509,
    wallEdgeTint: 0xffc21e,
    furnTint: 0xffe9b8,
    carTint: 0xfcd34d,
    floorSet: 'wood'
  },
  {
    key: 'magenta_electric',
    bg: 0x140a12,
    floorTint: 0xffffff,
    wallFillTint: 0x180d1a,
    wallEdgeTint: 0xf85cff,
    furnTint: 0xf5d9ef,
    carTint: 0xf0abfc,
    floorSet: 'checker',
    checkerColors: [0x3a2440, 0x4a2f52]
  },
  {
    key: 'navy_industrial',
    bg: 0x080b12,
    floorTint: 0xffffff,
    wallFillTint: 0x0d1220,
    wallEdgeTint: 0x3f8cff,
    furnTint: 0xc8d4e8,
    carTint: 0x60a5fa,
    floorSet: 'checker',
    checkerColors: [0x25304a, 0x303e5e]
  }
];

export { TILE_TYPES as T };

const SHAPES = [
  [[0, 0]],
  [[0, 0], [1, 0]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [1, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[0, 0], [2, 0], [1, 0], [1, -1], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1]]
];

export function generateSquareMaze(cols, rows, { rng, role, clusterScale = 1, layout = null } = {}) {
  const rnd = typeof rng === 'function' ? rng : Math.random;
  // Designed Rivals courses (logic/rivalCourseDesigns.js) take their own
  // path. Without a layout nothing below changes, draw for draw: every
  // campaign, daily and original Rivals house is byte-identical.
  if (layout) return generateDesignedMaze(cols, rows, { rng: rnd, clusterScale, layout });

  // For plug mode, enforce minimum path length to reduce easy extractions
  // Allow 10% of maps to be fast (1-2 in every 10 rounds)
  const isPlugMode = role === 'plug';
  const allowFastMap = isPlugMode && rnd() < 0.10; // 10% chance for fast map
  const minTotalPathLength = allowFastMap ? 0 : 15; // Require decent path length for plug mode

  let attempts = 0;
  const maxAttempts = isPlugMode && !allowFastMap ? 20 : 1; // Try multiple times for plug mode

  while (attempts < maxAttempts) {
    attempts++;

    const grid = Array.from({ length: rows }, () => Array(cols).fill(TILE_TYPES.FLOOR));

    for (let x = 0; x < cols; x++) {
      grid[0][x] = TILE_TYPES.WALL;
      grid[rows - 1][x] = TILE_TYPES.WALL;
    }
    for (let y = 0; y < rows; y++) {
      grid[y][0] = TILE_TYPES.WALL;
      grid[y][cols - 1] = TILE_TYPES.WALL;
    }

    const occ = Array.from({ length: rows }, () => Array(cols).fill(0));
    const PAD_MIN = 0;
    const PAD_MAX = 2;
    const GAP = 1;

    const rotate = (cells, rot) => {
      let pts = cells.map(([x, y]) => ({ x, y }));
      for (let r = 0; r < rot; r++) pts = pts.map((p) => ({ x: -p.y, y: p.x }));
      const minx = Math.min(...pts.map((p) => p.x));
      const miny = Math.min(...pts.map((p) => p.y));
      return pts.map((p) => ({ x: p.x - minx, y: p.y - miny }));
    };

    const maybeFlipX = (cells, doFlip) => {
      if (!doFlip) return cells.map((p) => ({ x: p.x, y: p.y }));
      const maxx = Math.max(...cells.map((p) => p.x));
      return cells.map((p) => ({ x: maxx - p.x, y: p.y }));
    };

    const canPlace = (atX, atY, cells) => {
      const allowBorderTouch = rnd() < 0.4;
      const pad = allowBorderTouch ? PAD_MIN : PAD_MAX;

      for (const p of cells) {
        const x = atX + p.x;
        const y = atY + p.y;
        if (x <= 0 || y <= 0 || x >= cols - 1 || y >= rows - 1) return false;
        if (x < pad || y < pad || x > cols - 1 - pad || y > rows - 1 - pad) return false;
        if (grid[y][x] === TILE_TYPES.WALL || occ[y][x]) return false;

        for (let yy = y - GAP; yy <= y + GAP; yy++) {
          for (let xx = x - GAP; xx <= x + GAP; xx++) {
            if (yy >= 0 && yy < rows && xx >= 0 && xx < cols && occ[yy][xx]) return false;
          }
        }
      }
      return true;
    };

    const stamp = (atX, atY, cells) => {
      for (const p of cells) {
        const x = atX + p.x;
        const y = atY + p.y;
        grid[y][x] = TILE_TYPES.WALL;
        occ[y][x] = 1;
      }
    };

    // clusterScale < 1 = more open maze (early rounds, easier navigation)
    const target = Math.floor(((cols * rows) / 36) * Math.max(0.3, Math.min(1.5, clusterScale)));
    let placed = 0;
    let tries = 0;
    const maxTries = target * 40;

    while (placed < target && tries < maxTries) {
      tries++;
      const baseX = 1 + ((rnd() * (cols - 2)) | 0);
      const baseY = 1 + ((rnd() * (rows - 2)) | 0);
      let shape = SHAPES[(rnd() * SHAPES.length) | 0];
      shape = rotate(shape, (rnd() * 4) | 0);
      shape = maybeFlipX(shape, rnd() < 0.5);
      const offX = ((rnd() * 3) | 0) - 1;
      const offY = ((rnd() * 3) | 0) - 1;
      if (canPlace(baseX + offX, baseY + offY, shape)) {
        stamp(baseX + offX, baseY + offY, shape);
        placed++;
      }
    }

    const { spawns, objectives, egress } = pickObjectives(grid, cols, rows, rnd, clusterScale);

    // Validate path length for plug mode
    if (isPlugMode && !allowFastMap) {
      const runnerToStash = manhattan(spawns.runner, objectives.stash);
      const stashToExtract = manhattan(objectives.stash, objectives.extract);
      const totalPath = runnerToStash + stashToExtract;

      // If path is too short, retry (unless it's our last attempt)
      if (totalPath >= minTotalPathLength || attempts >= maxAttempts) {
        console.log(`[MazeGen] Plug mode - Attempt ${attempts}, Path: ${totalPath} tiles (runner→stash: ${runnerToStash}, stash→extract: ${stashToExtract})`);
        return { grid, spawns, objectives, egress };
      }
      // Path too short, loop will retry with a new map
      console.log(`[MazeGen] Plug mode - Rejected map (attempt ${attempts}), path too short: ${totalPath} tiles`);
    } else {
      // Runner mode or fast map allowed - accept immediately
      return { grid, spawns, objectives, egress };
    }
  }

  // Should never reach here, but return the last attempt just in case
  console.warn('[MazeGen] Max attempts reached for plug mode validation');
  const { spawns, objectives, egress } = pickObjectives(grid, cols, rows, rnd, clusterScale);
  return { grid, spawns, objectives, egress };
}

// ---------------------------------------------------------------------------
// DESIGNED RIVALS HOUSES
//
// The original seven Rivals courses are the legacy generator at seven cluster
// scales: every one is the same 16x35 scatter of wall pieces, told apart only
// by seed. A designed course (logic/rivalCourseDesigns.js) gives each house a
// layout: grid size (passed in as cols/rows), a stamped STRUCTURE (lanes,
// banded floors, a ring road, rooms, a street grid, pillars), which wall
// PIECES fill the rest and how tightly, and a BIAS for where the runner,
// plug, pockets and car go. Structures are one cell thick on purpose: every
// wall a structure draws is a phase shortcut somewhere.
//
// Candidates are generated from the house's own seeded stream and judged
// (routes, alternatives, hard chokes); the first that passes the layout's
// acceptance rules is the house, so it is as deterministic as the legacy
// path — same seed, same house, on every device and in every replay.
const PIECE_SETS = {
  mixed: SHAPES,
  bars: [[[0, 0], [1, 0], [2, 0]], [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]],
  blocks: [[[0, 0]], [[0, 0], [1, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]]],
  hooks: SHAPES.slice(4),
  dots: [[[0, 0]]]
};

function designedBlank(cols, rows) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(TILE_TYPES.FLOOR));
  for (let x = 0; x < cols; x++) { grid[0][x] = TILE_TYPES.WALL; grid[rows - 1][x] = TILE_TYPES.WALL; }
  for (let y = 0; y < rows; y++) { grid[y][0] = TILE_TYPES.WALL; grid[y][cols - 1] = TILE_TYPES.WALL; }
  return { grid, occ: Array.from({ length: rows }, () => Array(cols).fill(0)) };
}

// occ: 1 = structure wall, 2 = structure doorway. Both keep random pieces a
// GAP away, so pieces never seal a doorway or thicken a structure wall.
function stampStructure(grid, occ, cols, rows, rnd, s) {
  if (!s || s.kind === 'none') return;
  const inside = (x, y) => x > 0 && y > 0 && x < cols - 1 && y < rows - 1;
  const wall = (x, y) => { if (inside(x, y)) { grid[y][x] = TILE_TYPES.WALL; occ[y][x] = 1; } };
  const door = (x, y) => { if (inside(x, y)) { grid[y][x] = TILE_TYPES.FLOOR; occ[y][x] = 2; } };
  // n doorway starts spread over [lo, hi], one per equal segment.
  const spread = (lo, hi, n, width) => {
    const out = [];
    const span = hi - lo + 1;
    for (let k = 0; k < n; k++) {
      const a = lo + Math.floor(k * span / n);
      const b = Math.max(a, lo + Math.floor((k + 1) * span / n) - width);
      out.push(a + ((rnd() * (b - a + 1)) | 0));
    }
    return out;
  };
  const vDoor = (x, y, lo, hi) => { door(x, y); if (y + 1 <= hi) door(x, y + 1); };
  const hDoor = (x, y, lo, hi) => { door(x, y); if (x + 1 <= hi) door(x + 1, y); };

  if (s.kind === 'lanes') {
    // Long walls down the board with a few crossings: parallel lanes, each a
    // firing lane, and a choice of which one to commit to.
    const n = s.count ?? 1, m = s.margin ?? 3;
    const y0 = m, y1 = rows - 1 - m;
    for (let k = 0; k < n; k++) {
      const x = Math.round((k + 1) * (cols - 1) / (n + 1));
      for (let y = y0; y <= y1; y++) wall(x, y);
      for (const d of spread(y0 + 1, y1 - 1, s.doors ?? 3, 2)) vDoor(x, d, y0, y1);
    }
  } else if (s.kind === 'bands') {
    // Floors across the board. Serpentine puts one doorway at alternating
    // ends (a switchback) plus `extra` shortcut doorways in the middle — the
    // whole part always, the fraction as a chance (0.5 = half the bands get
    // one); otherwise `doors` doorways spread across each band.
    const every = s.every ?? 6;
    let side = rnd() < 0.5 ? 0 : 1;
    for (let y = s.start ?? every; y < rows - 3; y += every) {
      for (let x = 1; x < cols - 1; x++) wall(x, y);
      if (s.serpentine) {
        const x = side ? cols - 3 : 1;
        hDoor(x, y, 1, cols - 2);
        side ^= 1;
        const extra = s.extra ?? 0;
        const n = Math.floor(extra) + (rnd() < extra - Math.floor(extra) ? 1 : 0);
        if (n) for (const d of spread(4, cols - 6, n, 2)) hDoor(d, y, 1, cols - 2);
      } else {
        for (const d of spread(1, cols - 3, s.doors ?? 2, 2)) hDoor(d, y, 1, cols - 2);
      }
    }
  } else if (s.kind === 'ring') {
    // A ring road round a walled core: two ways round, doorways in and out.
    const ins = s.inset ?? 3;
    const x0 = ins, x1 = cols - 1 - ins, y0 = ins + 1, y1 = rows - 2 - ins;
    for (let x = x0; x <= x1; x++) { wall(x, y0); wall(x, y1); }
    for (let y = y0; y <= y1; y++) { wall(x0, y); wall(x1, y); }
    const n = s.doors ?? 4;
    for (let k = 0; k < n; k++) {
      const side = ['N', 'S', 'W', 'E'][k % 4];
      if (side === 'N' || side === 'S') hDoor(spread(x0 + 2, x1 - 3, 1, 2)[0], side === 'N' ? y0 : y1, x0, x1);
      else vDoor(side === 'W' ? x0 : x1, spread(y0 + 2, y1 - 3, 1, 2)[0], y0, y1);
    }
  } else if (s.kind === 'rooms') {
    // A grid of rooms; every wall segment between rooms has a doorway, some
    // two. Which door, and which room the plug is standing in, is the game.
    const w = s.w ?? 5, h = s.h ?? 7;
    const xs = [], ys = [];
    for (let x = w; x < cols - 2; x += w) xs.push(x);
    for (let y = h; y < rows - 2; y += h) ys.push(y);
    for (const x of xs) for (let y = 1; y < rows - 1; y++) wall(x, y);
    for (const y of ys) for (let x = 1; x < cols - 1; x++) wall(x, y);
    const bx = [0, ...xs, cols - 1], by = [0, ...ys, rows - 1];
    for (const x of xs) {
      for (let k = 0; k < by.length - 1; k++) {
        const lo = by[k] + 1, hi = by[k + 1] - 1;
        if (hi - lo < 1) continue;
        const n = rnd() < (s.extraDoor ?? 0.3) ? 2 : 1;
        for (const d of spread(lo, hi - 1, n, 2)) vDoor(x, d, lo, hi);
      }
    }
    for (const y of ys) {
      for (let k = 0; k < bx.length - 1; k++) {
        const lo = bx[k] + 1, hi = bx[k + 1] - 1;
        if (hi - lo < 1) continue;
        const n = rnd() < (s.extraDoor ?? 0.3) ? 2 : 1;
        for (const d of spread(lo, hi - 1, n, 2)) hDoor(d, y, lo, hi);
      }
    }
  } else if (s.kind === 'streets') {
    // City blocks with streets between: long straight lanes both ways, a
    // parallel street for every street, plazas where a block is missing and
    // a few closures that make one street a dead end.
    const bw = s.bw ?? 3, bh = s.bh ?? 4, st = s.street ?? 2;
    for (let y0 = 1 + st; y0 + bh <= rows - 1 - st; y0 += bh + st) {
      for (let x0 = 1 + st; x0 + bw <= cols - 1 - st; x0 += bw + st) {
        if (rnd() < (s.plazas ?? 0.12)) continue;
        for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) wall(x, y);
        if (rnd() < (s.closures ?? 0) && x0 + bw + st < cols - 1) {
          const cy = y0 + ((rnd() * bh) | 0);
          for (let k = 0; k < st; k++) wall(x0 + bw + k, cy);
        }
      }
    }
  } else if (s.kind === 'pillars') {
    // An open floor broken only by pillars: cover everywhere, lanes everywhere.
    const every = s.every ?? 3, size = s.size ?? 1;
    for (let y = 2; y < rows - 2; y += every) {
      for (let x = 2; x < cols - 2; x += every) {
        if (rnd() < (s.skip ?? 0.2)) continue;
        for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) wall(x + dx, y + dy);
      }
    }
  }
}

// The legacy piece scatter, with the piece set and spacing as parameters.
function placeDesignedPieces(grid, occ, cols, rows, rnd, { target, set, gap }) {
  const rotate = (cells, rot) => {
    let pts = cells.map(([x, y]) => ({ x, y }));
    for (let r = 0; r < rot; r++) pts = pts.map((p) => ({ x: -p.y, y: p.x }));
    const minx = Math.min(...pts.map((p) => p.x)), miny = Math.min(...pts.map((p) => p.y));
    return pts.map((p) => ({ x: p.x - minx, y: p.y - miny }));
  };
  const flip = (cells, doFlip) => {
    if (!doFlip) return cells;
    const maxx = Math.max(...cells.map((p) => p.x));
    return cells.map((p) => ({ x: maxx - p.x, y: p.y }));
  };
  const canPlace = (atX, atY, cells) => {
    const pad = rnd() < 0.4 ? 0 : 2;
    for (const p of cells) {
      const x = atX + p.x, y = atY + p.y;
      if (x <= 0 || y <= 0 || x >= cols - 1 || y >= rows - 1) return false;
      if (x < pad || y < pad || x > cols - 1 - pad || y > rows - 1 - pad) return false;
      if (grid[y][x] === TILE_TYPES.WALL || occ[y][x]) return false;
      for (let yy = y - gap; yy <= y + gap; yy++) {
        for (let xx = x - gap; xx <= x + gap; xx++) {
          if (yy >= 0 && yy < rows && xx >= 0 && xx < cols && occ[yy][xx]) return false;
        }
      }
    }
    return true;
  };
  let placed = 0, tries = 0;
  while (placed < target && tries < target * 40) {
    tries++;
    const baseX = 1 + ((rnd() * (cols - 2)) | 0), baseY = 1 + ((rnd() * (rows - 2)) | 0);
    const shape = flip(rotate(set[(rnd() * set.length) | 0], (rnd() * 4) | 0), rnd() < 0.5);
    const offX = ((rnd() * 3) | 0) - 1, offY = ((rnd() * 3) | 0) - 1;
    if (canPlace(baseX + offX, baseY + offY, shape)) {
      for (const p of shape) { grid[baseY + offY + p.y][baseX + offX + p.x] = TILE_TYPES.WALL; occ[baseY + offY + p.y][baseX + offX + p.x] = 1; }
      placed++;
    }
  }
}

/**
 * How a designed house is judged. Returns { ok, score } — lower score is
 * better, used to keep the least-bad candidate if none passes.
 *   minRun / maxRun   the shortest full run (spawn, a bag, the car), in steps
 *   maxChokes         hard chokes over all four legs (a cell a plug can hold
 *                     with no way round it)
 *   maxSingleLegs     legs with no alternative route at all
 *   minPocketGap      walking steps between the two bags
 */
export function judgeDesignedHouse(arena, accept = {}) {
  if (arena.failed) return { ok: false, score: 1e9, analysis: null };
  const a = analyzeRoutes(arena);
  if (!a.reachable) return { ok: false, score: 1e9, analysis: a };
  // minPlugGapNoAlt: a leg with no separate corridor must not have the plug
  // starting on it. The smoke bots looped 70-80 times on exactly such houses
  // (the only way through, with the plug standing on it). A deliberate
  // single-route house is exempt; its counterplay is phase.
  const rules = { minRun: 18, maxRun: 150, maxChokes: 2, maxSingleLegs: 1, minPocketGap: 8, minPlugGap: 8,
    minPlugGapNoAlt: accept.intentionalSingleRoute ? 0 : 4, ...accept };
  let score = 0;
  if (a.plugToBareLeg < rules.minPlugGapNoAlt) score += 30 + (rules.minPlugGapNoAlt - a.plugToBareLeg) * 10;
  if (a.bestRun < rules.minRun) score += 100 + (rules.minRun - a.bestRun) * 10;
  if (a.bestRun > rules.maxRun) score += 100 + (a.bestRun - rules.maxRun) * 10;
  if (a.chokes > rules.maxChokes) score += 50 * (a.chokes - rules.maxChokes);
  if (a.singleRouteLegs > rules.maxSingleLegs) score += 40 * (a.singleRouteLegs - rules.maxSingleLegs);
  if (a.pocketGap < rules.minPocketGap) score += 30 + (rules.minPocketGap - a.pocketGap) * 5;
  if (a.plugGap < rules.minPlugGap) score += 30 + (rules.minPlugGap - a.plugGap) * 5;
  return { ok: score === 0, score, analysis: a };
}

// The route part of rivalCourseAnalysis.analyzeHouse, kept cheap: it runs
// for every candidate while a house loads.
function analyzeRoutes(arena) {
  const { grid, spawns, objectives, egress } = arena;
  const car = egress.entry;
  const legs = [[spawns.runner, objectives.stash], [spawns.runner, objectives.extract],
    [objectives.stash, car], [objectives.extract, car]];
  const out = { reachable: true, chokes: 0, singleRouteLegs: 0, steps: [], plugToBareLeg: 99 };
  const cols = grid[0].length;
  let fromPlug = null;
  for (const [from, to] of legs) {
    const alt = routeAlternative(grid, from, to);
    if (alt.steps == null) { out.reachable = false; return out; }
    out.steps.push(alt.steps);
    if (alt.alternative == null) {
      out.singleRouteLegs++;
      fromPlug = fromPlug || stepsFrom(grid, spawns.plug);
      for (const c of shortestPath(grid, from, to) || []) {
        const d = fromPlug[c.y * cols + c.x];
        if (d >= 0) out.plugToBareLeg = Math.min(out.plugToBareLeg, d);
      }
    }
    out.chokes += hardChokes(grid, from, to).length;
  }
  if (walkSteps(grid, spawns.plug, objectives.stash) == null || walkSteps(grid, spawns.plug, objectives.extract) == null) {
    out.reachable = false; return out;
  }
  out.bestRun = Math.min(out.steps[0] + out.steps[2], out.steps[1] + out.steps[3]);
  out.pocketGap = walkSteps(grid, objectives.stash, objectives.extract) ?? 0;
  out.plugGap = walkSteps(grid, spawns.plug, spawns.runner) ?? 0;
  return out;
}

export function generateDesignedMaze(cols, rows, { rng, clusterScale = 1, layout }) {
  const rnd = typeof rng === 'function' ? rng : Math.random;
  const set = PIECE_SETS[layout.pieces] || PIECE_SETS.mixed;
  const gap = Number.isInteger(layout.gap) ? layout.gap : 1;
  const target = Math.floor(((cols * rows) / 36) * Math.max(0.2, Math.min(1.8, clusterScale)) * (layout.fill ?? 1));
  let best = null, bestScore = Infinity;
  const candidate = (structure, fill) => {
    const { grid, occ } = designedBlank(cols, rows);
    stampStructure(grid, occ, cols, rows, rnd, structure);
    placeDesignedPieces(grid, occ, cols, rows, rnd, { target: Math.floor(target * fill), set, gap });
    return { grid, ...pickObjectives(grid, cols, rows, rnd, clusterScale, layout.objectives || {}) };
  };
  for (let attempt = 0; attempt < (layout.tries ?? 40); attempt++) {
    const arena = candidate(layout.structure, 1);
    const verdict = judgeDesignedHouse(arena, layout.accept);
    if (verdict.ok) { delete arena.failed; return arena; }
    if (verdict.score < bestScore) { best = arena; bestScore = verdict.score; }
  }
  // Nothing passed. Keep the least-bad candidate if it is at least whole;
  // otherwise, a lighter open floor with the same objective zones — always
  // winnable, never the legacy centre cross.
  if (best && !best.failed) return best;
  for (let attempt = 0; attempt < 40; attempt++) {
    const arena = candidate({ kind: 'none' }, 0.6);
    if (!arena.failed) return arena;
  }
  return candidate({ kind: 'none' }, 0);
}

// `bias` (designed Rivals courses only; see generateDesignedMaze) steers WHERE
// things go without changing how they are carved: y-bands (fractions of the
// height) for the runner, the plug and each pocket, whether a pocket may sit
// on the plug's side, and which border the car's driveway opens in. With no
// bias every statement below runs exactly as it always has, draw for draw.
export function pickObjectives(grid, cols, rows, rnd = Math.random, clusterScale = 1, bias = null) {
  // Helper: Check if two points are reachable via flood-fill
  const canReach = (from, to) => {
    if (!from || !to) return false;
    const visited = new Set();
    const queue = [`${from.x},${from.y}`];
    visited.add(queue[0]);

    while (queue.length > 0) {
      const [cx, cy] = queue.shift().split(',').map(Number);

      // Found the target
      if (cx === to.x && cy === to.y) return true;

      // Explore neighbors
      const neighbors = [
        [cx, cy - 1], // up
        [cx, cy + 1], // down
        [cx - 1, cy], // left
        [cx + 1, cy]  // right
      ];

      for (const [nx, ny] of neighbors) {
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        if (nx <= 0 || ny <= 0 || nx >= cols - 1 || ny >= rows - 1) continue;
        if (grid[ny][nx] !== TILE_TYPES.FLOOR) continue;

        visited.add(key);
        queue.push(key);
      }
    }
    return false;
  };

  // Helper: Check if a cell is accessible (has at least 2 walkable neighbors to avoid enclosed spawns)
  const isAccessible = (x, y) => {
    if (x <= 0 || y <= 0 || x >= cols - 1 || y >= rows - 1) return false;
    const neighbors = [
      grid[y - 1]?.[x],     // up
      grid[y + 1]?.[x],     // down
      grid[y]?.[x - 1],     // left
      grid[y]?.[x + 1]      // right
    ];
    const walkableCount = neighbors.filter(t => t === TILE_TYPES.FLOOR).length;
    return walkableCount >= 2; // Need at least 2 exits to not be enclosed
  };

  const allFloors = [];
  const accessibleFloors = []; // Spawns should only use accessible floors
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (grid[y][x] === TILE_TYPES.FLOOR) {
        allFloors.push({ x, y });
        if (isAccessible(x, y)) {
          accessibleFloors.push({ x, y });
        }
      }
    }
  }

  if (!allFloors.length) {
    const fallback = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
    return {
      spawns: { runner: fallback, plug: fallback },
      objectives: { stash: fallback, extract: fallback },
      egress: { side: 'N', entry: fallback, width: 3 }
    };
  }

  // Use accessible floors for spawns, fall back to all floors if needed
  const spawnFloors = accessibleFloors.length >= 2 ? accessibleFloors : allFloors;

  const pickFar = (avoid, minD, pool = spawnFloors) => {
    for (let k = 0; k < 400; k++) {
      const c = pool[(rnd() * pool.length) | 0];
      if (avoid.every((pt) => manhattan(c, pt) >= minD)) return c;
    }
    let best = pool[0];
    let bestScore = -1;
    for (const c of pool) {
      const d = avoid.length ? Math.min(...avoid.map((pt) => manhattan(c, pt))) : Infinity;
      if (d > bestScore) {
        bestScore = d;
        best = c;
      }
    }
    return best;
  };

  const POCKET_R = 2;
  const safeForPocket = (c) =>
    c.x > POCKET_R && c.y > POCKET_R && c.x < cols - 1 - POCKET_R && c.y < rows - 1 - POCKET_R;

  const carvePocket = (cx, cy) => {
    for (let dy = -(POCKET_R - 1); dy <= POCKET_R - 1; dy++) {
      for (let dx = -(POCKET_R - 1); dx <= POCKET_R - 1; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (y >= 0 && y < rows && x >= 0 && x < cols) grid[y][x] = TILE_TYPES.FLOOR;
      }
    }

    for (let dy = -POCKET_R; dy <= POCKET_R; dy++) {
      for (let dx = -POCKET_R; dx <= POCKET_R; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x <= 0 || y <= 0 || x >= cols - 1 || y >= rows - 1) continue;
        if (Math.max(Math.abs(dx), Math.abs(dy)) === POCKET_R) grid[y][x] = TILE_TYPES.WALL;
      }
    }

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    let picks;
    if (rnd() < 0.7) picks = [[0, 1], [2, 3]][(rnd() * 2) | 0];
    else picks = [[0, 2], [0, 3], [1, 2], [1, 3]][(rnd() * 4) | 0];

    for (const i of picks) {
      const [dx, dy] = dirs[i];
      const x = cx + dx * POCKET_R;
      const y = cy + dy * POCKET_R;
      if (inBounds(x, y, cols, rows)) grid[y][x] = TILE_TYPES.FLOOR;
      const ox = cx + dx * (POCKET_R + 1);
      const oy = cy + dy * (POCKET_R + 1);
      if (inBounds(ox, oy, cols, rows)) grid[oy][ox] = TILE_TYPES.FLOOR;
      // Early rounds (open mazes): widen the mouth to 2 cells so new
      // players aren't threading 1-wide gaps while chased. Uses no rnd
      // draws — full-density rounds stay byte-identical.
      if (clusterScale < 1) {
        const px = dy, py = dx; // perpendicular
        const wx = cx + dx * POCKET_R + px;
        const wy = cy + dy * POCKET_R + py;
        if (wx > 0 && wy > 0 && wx < cols - 1 && wy < rows - 1) grid[wy][wx] = TILE_TYPES.FLOOR;
        const wox = cx + dx * (POCKET_R + 1) + px;
        const woy = cy + dy * (POCKET_R + 1) + py;
        if (wox > 0 && woy > 0 && wox < cols - 1 && woy < rows - 1) grid[woy][wox] = TILE_TYPES.FLOOR;
      }
    }
    grid[cy][cx] = TILE_TYPES.FLOOR;
  };

  // GUARANTEE: the driveway mouth must be reachable from the stash.
  // The extraction sensor sits at egress.entry (see BaseGameScene
  // makeObjectives), NOT at the extract pocket — so canReach(stash,
  // extract) alone does not make the round winnable. pickDriveway
  // carves the border at a random spot and can open into a sealed
  // pocket. When that happens, carve the shortest corridor from the
  // entry to the nearest stash-reachable floor cell. Deterministic
  // (fixed neighbor order, no rng) so all devices generate the same maze.
  const ensureDrivewayReachable = (from, entry) => {
    if (!from || !entry) return;
    if (canReach(from, entry)) return;

    // Flood-fill the floor region reachable from `from`
    const reach = new Set([`${from.x},${from.y}`]);
    const fq = [from];
    while (fq.length) {
      const c = fq.shift();
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = c.x + dx, ny = c.y + dy, key = `${nx},${ny}`;
        if (reach.has(key)) continue;
        if (nx <= 0 || ny <= 0 || nx >= cols - 1 || ny >= rows - 1) continue;
        if (grid[ny][nx] !== TILE_TYPES.FLOOR) continue;
        reach.add(key);
        fq.push({ x: nx, y: ny });
      }
    }

    // BFS from the driveway entry THROUGH walls to the nearest reachable cell
    const prev = new Map();
    const seen = new Set([`${entry.x},${entry.y}`]);
    const bq = [entry];
    let hit = null;
    while (bq.length && !hit) {
      const c = bq.shift();
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = c.x + dx, ny = c.y + dy, key = `${nx},${ny}`;
        if (seen.has(key)) continue;
        if (nx <= 0 || ny <= 0 || nx >= cols - 1 || ny >= rows - 1) continue;
        seen.add(key);
        prev.set(key, c);
        if (reach.has(key)) { hit = { x: nx, y: ny }; break; }
        bq.push({ x: nx, y: ny });
      }
    }
    if (!hit) return; // pathological — leave as generated

    // Carve floor along the found corridor back to the entry
    let cur = hit;
    while (cur && !(cur.x === entry.x && cur.y === entry.y)) {
      grid[cur.y][cur.x] = TILE_TYPES.FLOOR;
      cur = prev.get(`${cur.x},${cur.y}`);
    }
    grid[entry.y][entry.x] = TILE_TYPES.FLOOR;
    console.log('[MazeGen] Driveway was sealed — carved corridor to connect it');
  };

  // A band as fractions of the board: [y0, y1] (e.g. [0, 0.3] = the top 30%)
  // or { y: [y0, y1], x: [x0, x1] }. An empty band falls back to the whole
  // board rather than failing.
  const inBand = (band) => {
    const yb = Array.isArray(band) ? band : band.y, xb = Array.isArray(band) ? null : band.x;
    return (c) => (!yb || (c.y >= yb[0] * (rows - 1) && c.y <= yb[1] * (rows - 1))) &&
      (!xb || (c.x >= xb[0] * (cols - 1) && c.x <= xb[1] * (cols - 1)));
  };
  const banded = (pool, band) => {
    if (!band) return pool;
    const kept = pool.filter(inBand(band));
    return kept.length ? kept : pool;
  };

  const runner = bias
    ? pickFar([], Math.floor((cols + rows) / 6), banded(spawnFloors, bias.runner))
    : pickFar([], Math.floor((cols + rows) / 6));
  const plug = bias
    ? pickFar([runner], Math.floor((cols + rows) / 4), banded(spawnFloors, bias.plug))
    : pickFar([runner], Math.floor((cols + rows) / 4));

  // Legacy: the primary pocket sits on the runner's side and the secondary on
  // the plug's. `contested` drops the side rule for a pocket so it may sit
  // under the plug's nose.
  const stashCandidates = bias
    ? banded(allFloors.filter((c) => safeForPocket(c) &&
        (bias.contested === 'both' || bias.contested === 'primary' || manhattan(c, runner) + 3 < manhattan(c, plug))), bias.primary)
    : allFloors.filter(
      (c) => safeForPocket(c) && manhattan(c, runner) + 3 < manhattan(c, plug)
    );
  const extractCandidates = bias
    ? banded(allFloors.filter((c) => safeForPocket(c) &&
        (bias.contested === 'both' || bias.contested === 'secondary' || manhattan(c, plug) + 3 < manhattan(c, runner))), bias.secondary)
    : allFloors.filter(
      (c) => safeForPocket(c) && manhattan(c, plug) + 3 < manhattan(c, runner)
    );

  const pickFrom = (arr, avoid, minD) => {
    const src = arr.length ? arr.filter((c) => avoid.every((pt) => manhattan(c, pt) >= minD)) : [];
    if (src.length) return src[(rnd() * src.length) | 0];
    return pickFar(avoid, minD);
  };

  let stash = pickFrom(stashCandidates, [runner, plug], Math.floor((cols + rows) / 10));
  let extract = pickFrom(extractCandidates, [runner, plug, stash], Math.floor((cols + rows) / 9));

  if (!safeForPocket(stash)) {
    const safe = allFloors.filter(safeForPocket);
    if (safe.length) stash = safe[(rnd() * safe.length) | 0];
  }
  if (!safeForPocket(extract)) {
    const safe = allFloors.filter(safeForPocket);
    if (safe.length) extract = safe[(rnd() * safe.length) | 0];
  }

  carvePocket(stash.x, stash.y);
  carvePocket(extract.x, extract.y);

  grid[runner.y][runner.x] = TILE_TYPES.FLOOR;
  grid[plug.y][plug.x] = TILE_TYPES.FLOOR;
  grid[stash.y][stash.x] = TILE_TYPES.FLOOR;
  grid[extract.y][extract.x] = TILE_TYPES.FLOOR;

  // CRITICAL: Validate that spawns can actually reach objectives
  // This prevents enclosed spawn bugs where characters spawn in isolated pockets
  const runnerCanReachStash = canReach(runner, stash);
  const stashCanReachExtract = canReach(stash, extract);
  const plugCanReachStash = canReach(plug, stash);

  if (!runnerCanReachStash || !stashCanReachExtract || !plugCanReachStash) {
    // A designed house never takes the centre-cross fallback below: it says
    // it failed, and generateDesignedMaze draws another candidate.
    if (bias) return { failed: true, spawns: { runner, plug }, objectives: { stash, extract }, egress: { side: 'N', entry: { x: 1, y: 1 }, width: 3 } };
    // Spawns are in isolated areas! Force simple fallback layout
    const centerX = Math.floor(cols / 2);
    const centerY = Math.floor(rows / 2);

    // Clear a path in the center to ensure connectivity
    for (let y = 1; y < rows - 1; y++) {
      grid[y][centerX] = TILE_TYPES.FLOOR;
    }
    for (let x = 1; x < cols - 1; x++) {
      grid[centerY][x] = TILE_TYPES.FLOOR;
    }

    // Place spawns/objectives along the cleared paths
    const fbStash = { x: centerX, y: centerY - 3 };
    const fbEgress = pickDriveway(grid, cols, rows, rnd);
    ensureDrivewayReachable(fbStash, fbEgress.entry);
    return {
      spawns: {
        runner: { x: centerX - 3, y: centerY },
        plug: { x: centerX + 3, y: centerY }
      },
      objectives: {
        stash: fbStash,
        extract: { x: centerX, y: centerY + 3 }
      },
      egress: fbEgress
    };
  }

  const egress = pickDriveway(grid, cols, rows, rnd, bias?.car ?? null);
  ensureDrivewayReachable(stash, egress.entry);
  // A designed course promises the car is reachable from EITHER pocket, not
  // just the primary one (the legacy guarantee).
  if (bias) ensureDrivewayReachable(extract, egress.entry);

  return {
    spawns: { runner, plug },
    objectives: { stash, extract },
    egress
  };
}

function pickDriveway(grid, cols, rows, rnd, forcedSide = null) {
  const sides = ['N', 'E', 'S', 'W'];
  const drawn = sides[(rnd() * sides.length) | 0];
  const side = forcedSide && sides.includes(forcedSide) ? forcedSide : drawn;
  const gapW = Math.max(3, Math.floor(cols / 10));
  let entry = { x: 1, y: 1 };

  if (side === 'N') {
    const mid = 1 + ((rnd() * (cols - 2)) | 0);
    const x0 = Math.max(1, mid - Math.floor(gapW / 2));
    for (let x = x0; x < x0 + gapW && x < cols - 1; x++) {
      grid[0][x] = TILE_TYPES.FLOOR;
      if (rows > 1) grid[1][x] = TILE_TYPES.FLOOR;
    }
    entry = { x: Math.min(cols - 2, Math.max(1, mid)), y: 1 };
  } else if (side === 'S') {
    const mid = 1 + ((rnd() * (cols - 2)) | 0);
    const x0 = Math.max(1, mid - Math.floor(gapW / 2));
    for (let x = x0; x < x0 + gapW && x < cols - 1; x++) {
      grid[rows - 1][x] = TILE_TYPES.FLOOR;
      if (rows > 1) grid[rows - 2][x] = TILE_TYPES.FLOOR;
    }
    entry = { x: Math.min(cols - 2, Math.max(1, mid)), y: rows - 2 };
  } else if (side === 'E') {
    const mid = 1 + ((rnd() * (rows - 2)) | 0);
    const y0 = Math.max(1, mid - Math.floor(gapW / 2));
    for (let y = y0; y < y0 + gapW && y < rows - 1; y++) {
      grid[y][cols - 1] = TILE_TYPES.FLOOR;
      if (cols > 1) grid[y][cols - 2] = TILE_TYPES.FLOOR;
    }
    entry = { x: cols - 2, y: Math.min(rows - 2, Math.max(1, mid)) };
  } else {
    const mid = 1 + ((rnd() * (rows - 2)) | 0);
    const y0 = Math.max(1, mid - Math.floor(gapW / 2));
    for (let y = y0; y < y0 + gapW && y < rows - 1; y++) {
      grid[y][0] = TILE_TYPES.FLOOR;
      if (cols > 1) grid[y][1] = TILE_TYPES.FLOOR;
    }
    entry = { x: 1, y: Math.min(rows - 2, Math.max(1, mid)) };
  }

  return { side, entry, width: gapW };
}

function inBounds(x, y, cols, rows) {
  return x >= 0 && y >= 0 && x < cols && y < rows;
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function decorateArenaFurniture(scene, { cell, cols, rows, pad, isWall, isBorder, drawDefaultCell }) {
  const SofaG = { left: 'furn_447', mid: 'furn_448', right: 'furn_449' };
  const SofaB = { left: 'furn_474', mid: 'furn_475', right: 'furn_476' };
  const RoundTable = 'f2_506';
  const Chair = ['furn_505', 'furn_528', 'f2_529', 'f2_530', 'f2_531'];
  const availableTextures = [
    'furn_132',
    'furn_133',
    'furn_134',
    'furn_447',
    'furn_448',
    'furn_449',
    'furn_474',
    'furn_475',
    'furn_476',
    'furn_501',
    'furn_502',
    'furn_503',
    'furn_505',
    'furn_528',
    'f2_506',
    'f2_507',
    'f2_508',
    'f2_509',
    'f2_510',
    'f2_529',
    'f2_530',
    'f2_531',
    'f2_532',
    'f2_533'
  ].filter((key) => scene.textures.exists(key));

  if (!availableTextures.length) {
    return;
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (isWall(x, y) && isBorder(x, y)) drawDefaultCell(x, y);
    }
  }

  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  const placed = { couch: false, table: false, lazy: false, lamp: false, tv: false };

  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (!isWall(x, y) || seen[y][x]) continue;

      const component = [];
      const queue = [[x, y]];
      seen[y][x] = true;

      while (queue.length) {
        const [cx, cy] = queue.shift();
        component.push([cx, cy]);
        const neighbors = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ];
        for (const [dx, dy] of neighbors) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx <= 0 || ny <= 0 || nx >= cols - 1 || ny >= rows - 1) continue;
          if (!seen[ny][nx] && isWall(nx, ny)) {
            seen[ny][nx] = true;
            queue.push([nx, ny]);
          }
        }
      }

      const xs = component.map((c) => c[0]);
      const ys = component.map((c) => c[1]);
      const minx = Math.min(...xs);
      const maxx = Math.max(...xs);
      const miny = Math.min(...ys);
      const maxy = Math.max(...ys);
      const w = maxx - minx + 1;
      const h = maxy - miny + 1;

      const straightH = h === 1 && w >= 2 && component.length === w;
      const straightV = w === 1 && h >= 2 && component.length === h;

      for (const [cx, cy] of component) drawDefaultCell(cx, cy);

      if (!placed.couch && (straightH || straightV) && (w >= 3 || h >= 3)) {
        const setPick = Math.random();
        const set = setPick < 0.5 ? SofaG : SofaB;
        if (straightH) {
          for (let i = 0; i < w; i++) {
            const cx = minx + i;
            const cy = miny;
            const wx = pad.x + cx * cell + cell / 2;
            const wy = pad.y + cy * cell + cell / 2;
            const key = i === 0 ? set.left : i === w - 1 ? set.right : set.mid;
            scene
              .add.image(wx, wy, key)
              .setDepth(5)
              .setDisplaySize(cell, cell)
              .setTint(scene.theme?.furnTint ?? 0xffffff);
          }
        } else {
          for (let i = 0; i < h; i++) {
            const cx = minx;
            const cy = miny + i;
            const wx = pad.x + cx * cell + cell / 2;
            const wy = pad.y + cy * cell + cell / 2;
            const key = i === 0 ? set.left : i === h - 1 ? set.right : set.mid;
            scene
              .add.image(wx, wy, key)
              .setDepth(5)
              .setAngle(90)
              .setDisplaySize(cell, cell)
              .setTint(scene.theme?.furnTint ?? 0xffffff);
          }
        }
        placed.couch = true;
        continue;
      }

      if (!placed.table && ((w === 2 && h === 2) || (w === 3 && h === 2) || (w === 2 && h === 3))) {
        // Find the center position
        const cx0 = Math.floor((minx + maxx) / 2);
        const cy0 = Math.floor((miny + maxy) / 2);

        // Check if center is actually part of the component
        const centerIsOnBlock = component.some(([bx, by]) => bx === cx0 && by === cy0);

        // If center isn't on a block, pick the first component cell instead
        const [tableCx, tableCy] = centerIsOnBlock ? [cx0, cy0] : component[0];

        const wx0 = pad.x + tableCx * cell + cell / 2;
        const wy0 = pad.y + tableCy * cell + cell / 2;
        scene
          .add.image(wx0, wy0, RoundTable)
          .setDepth(5)
          .setDisplaySize(cell, cell)
          .setTint(scene.theme?.furnTint ?? 0xffffff);
        const around = [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0]
        ];
        for (const [dx, dy] of around) {
          const tx = tableCx + dx;
          const ty = tableCy + dy;
          // Only place chair if the position is actually part of this block component
          const isOnBlock = component.some(([bx, by]) => bx === tx && by === ty);
          if (isOnBlock) {
            const key = Chair[(Math.random() * Chair.length) | 0];
            scene
              .add.image(pad.x + tx * cell + cell / 2, pad.y + ty * cell + cell / 2, key)
              .setDepth(5)
              .setDisplaySize(cell, cell)
              .setTint(scene.theme?.furnTint ?? 0xffffff);
          }
        }
        placed.table = true;
        continue;
      }

      if (!placed.tv && straightH && w === 2) {
        for (let i = 0; i < 2; i++) {
          const key = i === 0 ? 'f2_532' : 'f2_533';
          const cx = minx + i;
          const cy = miny;
          const wx = pad.x + cx * cell + cell / 2;
          const wy = pad.y + cy * cell + cell / 2;
          scene.add.image(wx, wy, key).setDepth(5).setDisplaySize(cell, cell);
        }
        placed.tv = true;
        continue;
      }

      if (!placed.lazy && component.length === 1) {
        const [cx, cy] = component[0];
        const wx = pad.x + cx * cell + cell / 2;
        const wy = pad.y + cy * cell + cell / 2;
        const key = Math.random() < 0.5 ? 'furn_505' : 'furn_528';
        scene
          .add.image(wx, wy, key)
          .setDepth(5)
          .setDisplaySize(cell, cell)
          .setTint(scene.theme?.furnTint ?? 0xffffff);
        placed.lazy = true;
        continue;
      }

      if (!placed.lamp && component.length === 1) {
        const [cx, cy] = component[0];
        const wx = pad.x + cx * cell + cell / 2;
        const wy = pad.y + cy * cell + cell / 2;
        const key = Math.random() < 0.5 ? 'furn_132' : 'furn_133';
        scene
          .add.image(wx, wy, key)
          .setDepth(5)
          .setDisplaySize(cell, cell)
          .setTint(scene.theme?.furnTint ?? 0xffffff);
        placed.lamp = true;
        continue;
      }
    }
  }
}