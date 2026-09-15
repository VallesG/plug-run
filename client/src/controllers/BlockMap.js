// Draws the daily block as a top-down neighborhood of real maze floor plans.
//
// Cleared houses reveal the deterministic 16x35 layout the player just ran.
// The next plot is marked but stays under fog; later plots are blacked out.
// Everything belongs to the modal through registerExtra, so no map object can
// survive the transition back into play.

import { layoutBlock } from '../logic/blockMap.js';
import { PALETTE } from '../logic/palette.js';
import { T, generateSquareMaze } from '../utils/mazeGenerator.js';
import { createSeededRNG, getCurrentRouteID, getRouteSeed } from '../utils/seededRandom.js';

const MAZE_COLS = 16;
const MAZE_ROWS = 35;
const ROAD = 0x171c24;
const ROAD_LINE = 0x424957;
const CURB = 0x343b45;
const FOG = 0x05070b;
const FOG_EDGE = 0x171b23;
const LOT_DARK = 0x0b0f13;
const LOTS = [0x4f5d50, 0x655b4b, 0x4d5963, 0x625460, 0x626044];
const STASH = 0xf6d365;
const EXTRACT = 0x72c7e8;
const LABEL_Z = 20_002;

function mazeFor(routeID, mapIndex) {
  const seed = getRouteSeed(routeID, mapIndex, 'runner');
  const clusterScale = [0, 0.6, 0.75, 0.9, 0.95][mapIndex] ?? 1;
  return generateSquareMaze(MAZE_COLS, MAZE_ROWS, {
    rng: createSeededRNG(seed),
    role: 'runner',
    clusterScale
  });
}

function drawRoadMarkings(g, roads) {
  g.fillStyle(ROAD_LINE, 0.72);
  for (const road of roads) {
    if (road.orientation === 'vertical') {
      const x = road.x + road.w / 2 - 0.5;
      for (let y = road.y + 4; y < road.y + road.h - 3; y += 9) {
        g.fillRect(x, y, 1, 4);
      }
    } else {
      const y = road.y + road.h / 2 - 0.5;
      for (let x = road.x + 4; x < road.x + road.w - 3; x += 9) {
        g.fillRect(x, y, 4, 1);
      }
    }
  }
}

function drawMazeWalls(g, house, grid) {
  const left = house.x - house.w / 2;
  const top = house.y - house.h / 2;
  g.fillStyle(PALETTE.ink, 0.96);

  // Merge adjacent wall cells by row. At thumbnail scale this keeps the real
  // topology crisp and cuts thousands of Graphics calls down to wall runs.
  for (let y = 0; y < MAZE_ROWS; y++) {
    let runStart = -1;
    for (let x = 0; x <= MAZE_COLS; x++) {
      const wall = x < MAZE_COLS && grid[y][x] === T.WALL;
      if (wall && runStart < 0) runStart = x;
      if (!wall && runStart >= 0) {
        g.fillRect(
          left + runStart * house.cell,
          top + y * house.cell,
          (x - runStart) * house.cell + 0.2,
          house.cell + 0.2
        );
        runStart = -1;
      }
    }
  }
}

function drawObjective(g, house, point, color, round = false) {
  if (!point) return;
  const left = house.x - house.w / 2;
  const top = house.y - house.h / 2;
  const x = left + (point.x + 0.5) * house.cell;
  const y = top + (point.y + 0.5) * house.cell;
  const size = Math.max(1.8, house.cell * 1.7);
  g.fillStyle(PALETTE.ink, 1);
  if (round) g.fillCircle(x, y, size);
  else g.fillRect(x - size, y - size, size * 2, size * 2);
  g.fillStyle(color, 1);
  if (round) g.fillCircle(x, y, size * 0.58);
  else g.fillRect(x - size * 0.58, y - size * 0.58, size * 1.16, size * 1.16);
}

export function drawBlockMap(scene, modal, { cleared, maps }) {
  const panel = modal?.panel;
  if (!panel || !modal.registerExtra) return null;

  const Z = 20_001;
  const complete = cleared >= maps;
  const panelTop = panel.y - panel.height / 2;
  const firstButtonY = Math.min(...(modal.btnCenters || []).map((p) => p.y));
  const mapTop = panelTop + (complete ? 155 : 96);
  const mapBottom = Number.isFinite(firstButtonY)
    ? firstButtonY - 28
    : panel.y + panel.height / 2 - 24;
  const mapHeight = Math.max(80, mapBottom - mapTop);
  const mapWidth = panel.width - 32;
  const mapLeft = panel.x - mapWidth / 2;
  const { houses, roads, bounds } = layoutBlock({
    maps,
    cleared,
    width: mapWidth,
    height: mapHeight,
    x0: mapLeft,
    y0: mapTop
  });

  const routeID = scene.currentRouteID ?? getCurrentRouteID();
  const arenas = houses.map((house) => (
    house.state.endsWith('revealed') ? mazeFor(routeID, house.index) : null
  ));

  const g = scene.add.graphics().setScrollFactor(0).setDepth(Z);
  modal.registerExtra(g);

  g.fillStyle(PALETTE.ink, 0.72);
  g.fillRoundedRect(bounds.x + 3, bounds.y + 3, bounds.w, bounds.h, 7);
  g.fillStyle(ROAD, 1);
  g.fillRoundedRect(bounds.x, bounds.y, bounds.w, bounds.h, 7);
  drawRoadMarkings(g, roads);

  // Fog blooms across lot edges instead of stopping at fifteen tidy boxes.
  // Cleared lots are drawn afterward and cut their own sharp revealed holes.
  g.fillStyle(FOG, 0.46);
  for (const house of houses) {
    if (house.state.endsWith('revealed')) continue;
    g.fillCircle(house.x, house.y, Math.max(house.lotW, house.lotH) * 0.62);
  }

  for (let n = 0; n < houses.length; n++) {
    const house = houses[n];
    const revealed = house.state.endsWith('revealed');
    const next = house.state.endsWith('next');
    const left = house.x - house.w / 2;
    const top = house.y - house.h / 2;

    g.fillStyle(revealed ? LOTS[(house.index - 1) % LOTS.length] : LOT_DARK, 1);
    g.fillRoundedRect(house.lotX + 1, house.lotY + 1, house.lotW - 2, house.lotH - 2, 4);
    g.lineStyle(next ? 2 : 1, next ? PALETTE.runner : CURB, next ? 1 : 0.72);
    g.strokeRoundedRect(house.lotX + 1, house.lotY + 1, house.lotW - 2, house.lotH - 2, 4);

    // The same hard shadow and ink silhouette used by the game board.
    g.fillStyle(PALETTE.ink, 0.66);
    g.fillRect(left + 2, top + 2, house.w, house.h);
    g.fillStyle(revealed ? LOTS[(house.index + 1) % LOTS.length] : FOG, 1);
    g.fillRect(left, top, house.w, house.h);
    g.lineStyle(house.finale ? 2 : 1, house.finale ? PALETTE.plug : FOG_EDGE, 1);
    g.strokeRect(left, top, house.w, house.h);

    const arena = arenas[n];
    if (arena) {
      drawMazeWalls(g, house, arena.grid);
      drawObjective(g, house, arena.objectives?.stash, STASH, false);
      drawObjective(g, house, arena.objectives?.extract, EXTRACT, true);
    }

    if (next) {
      // A map-pin read without text: ink rim, runner center, pointed tail.
      g.fillStyle(PALETTE.ink, 1);
      g.fillCircle(house.x, house.y - 1, 5.5);
      g.fillTriangle(house.x - 4, house.y + 1, house.x + 4, house.y + 1, house.x, house.y + 8);
      g.fillStyle(PALETTE.runner, 1);
      g.fillCircle(house.x, house.y - 1, 3.2);
    }

    if (house.finale) {
      const plugY = house.lotY + 7;
      for (const plugX of [house.lotX + house.lotW - 14, house.lotX + house.lotW - 8]) {
        g.fillStyle(PALETTE.ink, 1);
        g.fillCircle(plugX, plugY, 3);
        g.fillStyle(PALETTE.plug, revealed || next ? 1 : 0.48);
        g.fillCircle(plugX, plugY, 1.8);
      }
    }

    const labelColor = house.finale
      ? '#ff8f8f'
      : revealed ? '#e0ddd0' : next ? '#9ad1ff' : '#59616d';
    const label = scene.add.text(house.lotX + 5, house.lotY + 4, String(house.index), {
      color: labelColor,
      fontSize: '9px',
      fontStyle: revealed || next ? 'bold' : 'normal'
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(LABEL_Z);
    modal.registerExtra(label);
  }

  return g;
}
