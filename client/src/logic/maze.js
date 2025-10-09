// Generates an odd-sized maze grid: 0=wall, 1=floor

export function generateMaze(cols, rows, rng) {
  cols = cols % 2 ? cols : cols - 1;
  rows = rows % 2 ? rows : rows - 1;

  const W = cols, H = rows;
  const grid = Array.from({ length: H }, () => Array(W).fill(0));
  const carve = (x, y) => (grid[y][x] = 1);

  // start at random odd cell
  let sx = rng.int(1, W - 2); if (sx % 2 === 0) sx++;
  let sy = rng.int(1, H - 2); if (sy % 2 === 0) sy++;
  carve(sx, sy);

  const stack = [[sx, sy]];
  const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]];

  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const shuffled = dirs.slice().sort(() => rng() - 0.5);
    let moved = false;

    for (const [dx, dy] of shuffled) {
      const nx = cx + dx, ny = cy + dy;
      if (nx > 0 && nx < W - 1 && ny > 0 && ny < H - 1 && grid[ny][nx] === 0) {
        carve(cx + dx / 2, cy + dy / 2); // knock down wall between
        carve(nx, ny);
        stack.push([nx, ny]);
        moved = true;
        break;
      }
    }
    if (!moved) stack.pop();
  }
  return grid;
}
