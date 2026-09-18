import { PALETTE } from '../logic/palette.js';
const T = { WALL: 1 };
// Shared visual-only depth pass. Geometry, collision and colours are unchanged.
export function drawArenaWallInk(){
    const { cell, cols, rows } = this;
    if (!this.grid) return;
    const ink = PALETTE.ink;
    const isWall = (x, y) => y >= 0 && y < rows && x >= 0 && x < cols && this.grid[y][x] === T.WALL;
    const left = (x) => this.toWorldX(x) - cell / 2;
    const top  = (y) => this.toWorldY(y) - cell / 2;

    // Floor grime: a slight, even darkening so outlined figures lift off it.
    const grime = this.add.graphics().setDepth(1.5).setAlpha(0.08);
    grime.fillStyle(ink, 1);
    grime.fillRect(left(0), top(0), cols * cell, rows * cell);

    // Hard drop shadow under every wall tile, offset down-right like the
    // characters' shadows so the light reads from one direction.
    const sx = Math.max(1, Math.round(cell * 0.10));
    const sy = Math.max(1, Math.round(cell * 0.14));
    const shadow = this.add.graphics().setDepth(2.5).setAlpha(0.38);
    shadow.fillStyle(ink, 1);

    // Ink rim: a strip along each wall side that faces open floor. Inset, so
    // the line lives on the wall's own edge and never bleeds onto the floor.
    // Only exposed sides get one, which outlines clusters rather than tiles.
    const px = Math.max(2, Math.round(cell * 0.09));
    const rim = this.add.graphics().setDepth(4.5).setAlpha(0.95);
    rim.fillStyle(ink, 1);

    for (let y = 0; y < rows; y++){
      for (let x = 0; x < cols; x++){
        const lx = left(x), ty = top(y);
        if (!isWall(x, y)) continue;
        shadow.fillRect(lx + sx, ty + sy, cell, cell);
        if (!isWall(x, y - 1)) rim.fillRect(lx, ty, cell, px);
        if (!isWall(x, y + 1)) rim.fillRect(lx, ty + cell - px, cell, px);
        if (!isWall(x - 1, y)) rim.fillRect(lx, ty, px, cell);
        if (!isWall(x + 1, y)) rim.fillRect(lx + cell - px, ty, px, cell);
      }
    }
  }
