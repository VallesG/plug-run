import Phaser from 'phaser';

// Axis-aligned bounding box collision for display objects
export function rectsOverlap(a, b) {
  return Phaser.Geom.Intersects.RectangleToRectangle(a.getBounds(), b.getBounds());
}

// More precise collision using fixed hitbox size (better for extraction)
// Uses 24x24 pixel hitbox instead of sprite bounds for fairer detection
export function overlaps(a, b) {
  if (!a || !b) return false;
  const ra = new Phaser.Geom.Rectangle(a.x - 12, a.y - 12, 24, 24);
  const rb = new Phaser.Geom.Rectangle(b.x - 12, b.y - 12, 24, 24);
  return Phaser.Geom.Intersects.RectangleToRectangle(ra, rb);
}

// Advance a grid cell in a cardinal direction with toroidal wrapping
export function stepCell(cell, dir, cols, rows) {
  return {
    x: (cell.x + dir.x + cols) % cols,
    y: (cell.y + dir.y + rows) % rows
  };
}

// Check if the sprite can move in the direction without hitting a wall
export function isWalkableDirFrom(scene, sprite, dir) {
  const current = scene.toCell(sprite.x, sprite.y);
  const next = stepCell(current, dir, scene.cols, scene.rows);
  return scene.isWalkableCell(next.x, next.y);
}

// Pull AI toward the centerline of the current corridor to avoid snagging
export function applyCenterBias(scene, sprite, dir, dt) {
  const cell = scene.toCell(sprite.x, sprite.y);
  const centerX = scene.toWorldX(cell.x);
  const centerY = scene.toWorldY(cell.y);
  // Support renamed runner AI stats; fall back for backward-compat
  const bias = (scene.aiRunnerStats?.centerBias ?? scene.aiRunner?.centerBias ?? 0);

  if (dir.x !== 0) {
    const dy = centerY - sprite.y;
    sprite.y += Math.sign(dy) * Math.min(Math.abs(dy), bias * dt);
  } else if (dir.y !== 0) {
    const dx = centerX - sprite.x;
    sprite.x += Math.sign(dx) * Math.min(Math.abs(dx), bias * dt);
  }
}

// Gentle assist that nudges the sprite toward corridor centers (touch controls)
export function corridorAssist(scene, sprite, dir, dt) {
  // Check if corridor assist is disabled
  if (scene.corridorAssistStrength === 0) return;

  const cell = scene.toCell(sprite.x, sprite.y);
  const centerX = scene.toWorldX(cell.x);
  const centerY = scene.toWorldY(cell.y);

  // Check how tight the space is (walls on sides)
  let wallsOnSides = 0;
  if (dir.x !== 0) {
    // Moving horizontally - check for walls above and below
    const northWall = scene.isWallAtWorld(sprite.x, sprite.y - scene.cell);
    const southWall = scene.isWallAtWorld(sprite.x, sprite.y + scene.cell);
    if (northWall) wallsOnSides++;
    if (southWall) wallsOnSides++;
  } else if (dir.y !== 0) {
    // Moving vertically - check for walls left and right
    const westWall = scene.isWallAtWorld(sprite.x - scene.cell, sprite.y);
    const eastWall = scene.isWallAtWorld(sprite.x + scene.cell, sprite.y);
    if (westWall) wallsOnSides++;
    if (eastWall) wallsOnSides++;
  }

  // Determine assist strength based on how tight the corridor is
  const multiplier = scene.corridorAssistStrength ?? 1;
  let baseStrength = 0.2; // Open areas (reduced from 0.3)
  if (wallsOnSides === 1) baseStrength = 0.4;  // One wall nearby (reduced from 0.6)
  if (wallsOnSides === 2) baseStrength = 0.7;  // True 1x1 corridor (reduced from 1.2 to prevent twitching)

  const bias = scene.cell * baseStrength * multiplier;

  if (dir.x !== 0) {
    const dy = centerY - sprite.y;
    sprite.y += Math.sign(dy) * Math.min(Math.abs(dy), bias * dt);
  } else if (dir.y !== 0) {
    const dx = centerX - sprite.x;
    sprite.x += Math.sign(dx) * Math.min(Math.abs(dx), bias * dt);
  }
}

// Manhattan distance with toroidal wraparound
export function toroDist(a, b, cols, rows) {
  const dx = Math.min(Math.abs(a.x - b.x), cols - Math.abs(a.x - b.x));
  const dy = Math.min(Math.abs(a.y - b.y), rows - Math.abs(a.y - b.y));
  return dx + dy;
}

// Randomly picks a cardinal direction unit vector
export function randomCardinal() {
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ];
  return dirs[(Math.random() * dirs.length) | 0];
}
