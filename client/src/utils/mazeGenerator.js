const TILE_TYPES = { FLOOR: 0, WALL: 1 };

const THEMES = [
  {
    key: 'house_wood',
    bg: 0x080a10,
    floorTint: 0xffffff,
    wallFillTint: 0xffffff,
    wallEdgeTint: 0xf97316,
    furnTint: 0xffffff,
    carTint: 0xffffff,
    floorSet: 'wood'
  },
  {
    key: 'loft_concrete',
    bg: 0x0b0f16,
    floorTint: 0xb8bec9,
    wallFillTint: 0x232a33,
    wallEdgeTint: 0x8a8f98,
    furnTint: 0xdde3ea,
    carTint: 0xcbd1ff,
    floorSet: 'checker',
    checkerColors: [0xe5e7eb, 0xf3f4f6]
  },
  {
    key: 'green_villa',
    bg: 0x0a0d0a,
    floorTint: 0xcdb697,
    wallFillTint: 0x1f241a,
    wallEdgeTint: 0x2faa66,
    furnTint: 0xf5eedc,
    carTint: 0x2fb3ff,
    floorSet: 'checker'
  },
  {
    key: 'studio_white',
    bg: 0x0b0f16,
    floorTint: 0xf3f4f6,
    wallFillTint: 0x1f2632,
    wallEdgeTint: 0x9aa6b2,
    furnTint: 0xffffff,
    carTint: 0x93c5fd,
    floorSet: 'checker',
    checkerColors: [0xf9fafb, 0xe5e7eb]
  },
  {
    key: 'sand_wood',
    bg: 0x0b0f12,
    floorTint: 0xe9d5b4,
    wallFillTint: 0x1f201e,
    wallEdgeTint: 0xc8a97e,
    furnTint: 0xfff4e0,
    carTint: 0x60a5fa,
    floorSet: 'wood'
  },
  {
    key: 'cyan_tech',
    bg: 0x0a0e14,
    floorTint: 0xa8b2c0,
    wallFillTint: 0x1a2129,
    wallEdgeTint: 0x22d3ee,
    furnTint: 0xd1dce5,
    carTint: 0x67e8f9,
    floorSet: 'checker',
    checkerColors: [0xd1d5db, 0xe5e7eb]
  },
  {
    key: 'purple_noir',
    bg: 0x0d0a12,
    floorTint: 0xb8a8c8,
    wallFillTint: 0x1f1a28,
    wallEdgeTint: 0xa855f7,
    furnTint: 0xe8dcf5,
    carTint: 0xc084fc,
    floorSet: 'wood'
  },
  {
    key: 'sunset_coral',
    bg: 0x120a0d,
    floorTint: 0xf5d5c8,
    wallFillTint: 0x2a1a1f,
    wallEdgeTint: 0xfb7185,
    furnTint: 0xffeee8,
    carTint: 0xfda4af,
    floorSet: 'wood'
  },
  {
    key: 'teal_modern',
    bg: 0x0a1214,
    floorTint: 0xd8e8e8,
    wallFillTint: 0x1a2528,
    wallEdgeTint: 0x14b8a6,
    furnTint: 0xeef8f8,
    carTint: 0x5eead4,
    floorSet: 'checker',
    checkerColors: [0xe0f2f1, 0xf3f8f8]
  },
  {
    key: 'amber_lounge',
    bg: 0x100e0a,
    floorTint: 0xf0d5a0,
    wallFillTint: 0x252218,
    wallEdgeTint: 0xfbbf24,
    furnTint: 0xfff5e0,
    carTint: 0xfcd34d,
    floorSet: 'wood'
  },
  {
    key: 'magenta_electric',
    bg: 0x140a12,
    floorTint: 0xe8c8e0,
    wallFillTint: 0x2d1a28,
    wallEdgeTint: 0xe879f9,
    furnTint: 0xfde8f8,
    carTint: 0xf0abfc,
    floorSet: 'checker',
    checkerColors: [0xf5d0fe, 0xfae8ff]
  },
  {
    key: 'navy_industrial',
    bg: 0x080b12,
    floorTint: 0x9aa8c0,
    wallFillTint: 0x1a1f2d,
    wallEdgeTint: 0x3b82f6,
    furnTint: 0xc8d4e8,
    carTint: 0x60a5fa,
    floorSet: 'checker',
    checkerColors: [0xbfdbfe, 0xdbeafe]
  }
];

export { TILE_TYPES as T, THEMES };

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

export function generateSquareMaze(cols, rows, { rng, role, clusterScale = 1 } = {}) {
  const rnd = typeof rng === 'function' ? rng : Math.random;

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

export function pickObjectives(grid, cols, rows, rnd = Math.random, clusterScale = 1) {
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

  const pickFar = (avoid, minD) => {
    for (let k = 0; k < 400; k++) {
      const c = spawnFloors[(rnd() * spawnFloors.length) | 0];
      if (avoid.every((pt) => manhattan(c, pt) >= minD)) return c;
    }
    let best = spawnFloors[0];
    let bestScore = -1;
    for (const c of spawnFloors) {
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

  const runner = pickFar([], Math.floor((cols + rows) / 6));
  const plug = pickFar([runner], Math.floor((cols + rows) / 4));

  const stashCandidates = allFloors.filter(
    (c) => safeForPocket(c) && manhattan(c, runner) + 3 < manhattan(c, plug)
  );
  const extractCandidates = allFloors.filter(
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

  const egress = pickDriveway(grid, cols, rows, rnd);
  ensureDrivewayReachable(stash, egress.entry);

  return {
    spawns: { runner, plug },
    objectives: { stash, extract },
    egress
  };
}

function pickDriveway(grid, cols, rows, rnd) {
  const sides = ['N', 'E', 'S', 'W'];
  const side = sides[(rnd() * sides.length) | 0];
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