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

export function generateSquareMaze(cols, rows, { rng, role } = {}) {
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

    const target = Math.floor((cols * rows) / 36);
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

    const { spawns, objectives, egress } = pickObjectives(grid, cols, rows, rnd);

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
  const { spawns, objectives, egress } = pickObjectives(grid, cols, rows, rnd);
  return { grid, spawns, objectives, egress };
}

export function pickObjectives(grid, cols, rows, rnd = Math.random) {
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
    }
    grid[cy][cx] = TILE_TYPES.FLOOR;
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

  const egress = pickDriveway(grid, cols, rows, rnd);

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
        const cx0 = Math.floor((minx + maxx) / 2);
        const cy0 = Math.floor((miny + maxy) / 2);
        const wx0 = pad.x + cx0 * cell + cell / 2;
        const wy0 = pad.y + cy0 * cell + cell / 2;
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
          const tx = cx0 + dx;
          const ty = cy0 + dy;
          if (tx >= minx && tx <= maxx && ty >= miny && ty <= maxy) {
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
