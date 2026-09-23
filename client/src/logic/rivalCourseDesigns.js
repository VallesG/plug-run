// The designed Block Rivals courses (slots 8-21). Pure data: no imports.
//
// The first seven courses are the legacy generator at seven cluster scales —
// the same 16x35 scatter of wall pieces told apart by seed. These fourteen are
// DESIGNED: each has its own board size and a layout per house, read by
// utils/mazeGenerator.generateDesignedMaze:
//
//   structure   what is stamped first, one cell thick (so every structure
//               wall is a phase shortcut somewhere):
//                 lanes    long walls down the board with a few crossings
//                 bands    floors across it; serpentine = a switchback
//                 ring     a ring road round a walled core
//                 rooms    a grid of rooms, a doorway in every wall segment
//                 streets  city blocks with streets, plazas and closures
//                 pillars  an open floor of pillars
//   pieces      the wall pieces scattered after it (mixed, bars, blocks,
//               hooks, dots), `fill` how many relative to the legacy count
//               at this house's scale, `gap` their spacing (0 lets them
//               touch: longer walls, dead ends)
//   objectives  where things go: y-bands (fractions of the height, or
//               { y, x }) for the runner, the plug and each pocket;
//               `contested` lets a pocket sit on the plug's side; `car`
//               fixes the border the driveway opens in
//   accept      what a house must pass (logic/rivalCourseAnalysis): run
//               length, hard chokes, legs with no separate corridor
//
// Changing anything here changes the houses and so retires every recording
// on that course (their seeds no longer describe what a player gets). The
// course test pins a fingerprint of every designed house for that reason.
// Add a course; do not edit one.

const lanes = (count, doors, margin = 3) => ({ kind: 'lanes', count, doors, margin });
const bands = (every, doors, start) => ({ kind: 'bands', every, doors, ...(start ? { start } : {}) });
const switchback = (every, extra) => ({ kind: 'bands', every, serpentine: true, extra });
const ring = (inset, doors) => ({ kind: 'ring', inset, doors });
const rooms = (w, h, extraDoor) => ({ kind: 'rooms', w, h, extraDoor });
const streets = (bw, bh, street, plazas, closures) => ({ kind: 'streets', bw, bh, street, plazas, closures });
const pillars = (every, size, skip) => ({ kind: 'pillars', every, size, skip });
const open = () => ({ kind: 'none' });
const house = (structure, { pieces = 'mixed', gap = 1, fill = 1, objectives = {}, accept = {} } = {}) =>
  Object.freeze({ structure, pieces, gap, fill, objectives, accept });

const N = [0, 0.18], S = [0.82, 1], MID = [0.35, 0.65], NORTH = [0.04, 0.45], SOUTH = [0.55, 0.96];

export const RIVAL_COURSE_DESIGNS = Object.freeze({
  // 8 — two lanes either side of a canal wall; bags up the far end, car
  // alternating ends. Crossings thin out house by house.
  'canal-street': {
    cols: 16, rows: 35, scales: [0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 1.05],
    summary: 'Twin lanes either side of a canal wall; commit to a side, cross where the wall opens.',
    houses: [
      house(lanes(1, 4), { pieces: 'bars', fill: 0.5, objectives: { runner: S, primary: NORTH, secondary: NORTH, car: 'S' } }),
      house(lanes(1, 4), { pieces: 'bars', fill: 0.55, objectives: { runner: S, primary: NORTH, secondary: MID, car: 'N' } }),
      house(lanes(1, 3), { pieces: 'bars', fill: 0.6, objectives: { runner: N, primary: SOUTH, secondary: SOUTH, car: 'N' } }),
      house(lanes(1, 3), { pieces: 'bars', fill: 0.65, objectives: { runner: S, primary: NORTH, secondary: NORTH, car: 'E', contested: 'secondary' } }),
      house(lanes(1, 3), { pieces: 'bars', fill: 0.7, objectives: { runner: N, primary: SOUTH, secondary: MID, car: 'S', contested: 'secondary' } }),
      house(lanes(1, 2), { pieces: 'bars', fill: 0.75, objectives: { runner: S, primary: NORTH, secondary: NORTH, car: 'S', contested: 'both' } }),
      house(lanes(1, 2), { pieces: 'bars', fill: 0.8, objectives: { runner: N, primary: SOUTH, secondary: SOUTH, car: 'N', contested: 'both' } })
    ]
  },
  // 9 — a tall board of banded floors: a switchback with shortcut doorways
  // that get rarer. Every band is one cell thick; phase is a floor skipped.
  'rooftop-relay': {
    cols: 16, rows: 39, scales: [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8],
    summary: 'Banded rooftops on a tall board: switchbacks with shortcut doorways; phase skips a floor.',
    // Two shortcut doorways per floor early, never fewer than one and a half:
    // with one, the weaker smoke bot met the plug at every door and ran out
    // of time. House 7 keeps both bags down by the car.
    houses: [
      house(switchback(7, 2.0), { pieces: 'hooks', fill: 0.3, objectives: { runner: N, primary: [0.4, 0.7], secondary: [0.72, 0.95], car: 'S' }, accept: { maxChokes: 3 } }),
      house(switchback(7, 2.0), { pieces: 'hooks', fill: 0.3, objectives: { runner: S, primary: [0.3, 0.6], secondary: [0.05, 0.28], car: 'N' }, accept: { maxChokes: 3 } }),
      house(switchback(7, 1.8), { pieces: 'hooks', fill: 0.35, objectives: { runner: N, primary: [0.45, 0.7], secondary: [0.72, 0.95], car: 'W' }, accept: { maxChokes: 3 } }),
      house(switchback(7, 1.7), { pieces: 'hooks', fill: 0.35, objectives: { runner: S, primary: [0.05, 0.3], secondary: [0.3, 0.55], car: 'S' }, accept: { maxChokes: 4, maxSingleLegs: 2 } }),
      house(switchback(6, 1.6), { pieces: 'hooks', fill: 0.4, objectives: { runner: N, primary: [0.6, 0.95], secondary: [0.35, 0.6], car: 'N' }, accept: { maxChokes: 4, maxSingleLegs: 2 } }),
      house(switchback(6, 1.5), { pieces: 'hooks', fill: 0.4, objectives: { runner: S, primary: [0.05, 0.3], secondary: [0.05, 0.3], car: 'E', contested: 'secondary' }, accept: { maxChokes: 4, maxSingleLegs: 2 } }),
      house(switchback(6, 1.5), { pieces: 'hooks', fill: 0.45, objectives: { runner: N, plug: [0.3, 0.5], primary: [0.7, 0.96], secondary: [0.7, 0.96], car: 'S', contested: 'both' }, accept: { maxChokes: 5, maxSingleLegs: 4 } })
    ]
  },
  'market-square': {
    cols: 18, rows: 33, scales: [0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65],
    summary: 'Wide open plaza of pillars: cover against long sightlines, bags in the middle with the plug.',
    houses: [
      house(pillars(4, 1, 0.3), { pieces: 'blocks', fill: 0.3, objectives: { runner: S, plug: [0.1, 0.35], primary: MID, secondary: MID, car: 'E' } }),
      house(pillars(4, 1, 0.25), { pieces: 'blocks', fill: 0.3, objectives: { runner: N, plug: [0.65, 0.9], primary: MID, secondary: MID, car: 'W' } }),
      house(pillars(3, 1, 0.3), { pieces: 'blocks', fill: 0.35, objectives: { runner: S, plug: MID, primary: MID, secondary: [0.2, 0.45], car: 'N', contested: 'both' } }),
      house(pillars(4, 2, 0.3), { pieces: 'blocks', fill: 0.35, objectives: { runner: N, plug: MID, primary: MID, secondary: [0.55, 0.8], car: 'E', contested: 'both' } }),
      house(pillars(3, 1, 0.2), { pieces: 'blocks', fill: 0.4, objectives: { runner: S, plug: MID, primary: MID, secondary: MID, car: 'W', contested: 'both' } }),
      house(pillars(4, 2, 0.2), { pieces: 'blocks', fill: 0.45, objectives: { runner: N, plug: MID, primary: MID, secondary: MID, car: 'S', contested: 'both' } }),
      house(pillars(3, 1, 0.12), { pieces: 'blocks', fill: 0.5, objectives: { runner: S, plug: MID, primary: MID, secondary: MID, car: 'N', contested: 'both' } })
    ]
  },
  // 11 — a narrow, dense warren. Pieces touch, so walls run long and thin:
  // the course where phase pays most, and where a plug in a tunnel hurts.
  'tunnel-nine': {
    cols: 14, rows: 37, scales: [0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5],
    summary: 'Narrow, dense warren of thin walls: tight tunnels where phase shortcuts pay most.',
    houses: [
      house(open(), { pieces: 'hooks', gap: 0, fill: 1.0, objectives: { runner: N, primary: [0.4, 0.75], secondary: [0.7, 0.95], car: 'S' }, accept: { maxChokes: 3, minRun: 22 } }),
      house(open(), { pieces: 'hooks', gap: 0, fill: 1.05, objectives: { runner: S, primary: [0.25, 0.6], secondary: [0.05, 0.3], car: 'N' }, accept: { maxChokes: 3, minRun: 22 } }),
      house(open(), { pieces: 'hooks', gap: 0, fill: 1.1, objectives: { runner: N, primary: [0.5, 0.8], secondary: [0.5, 0.8], car: 'E' }, accept: { maxChokes: 3, minRun: 22 } }),
      house(open(), { pieces: 'hooks', gap: 0, fill: 1.15, objectives: { runner: S, primary: [0.1, 0.4], secondary: [0.35, 0.6], car: 'S' }, accept: { maxChokes: 4, maxSingleLegs: 2, minRun: 22 } }),
      house(open(), { pieces: 'hooks', gap: 0, fill: 1.2, objectives: { runner: N, primary: [0.6, 0.95], secondary: [0.3, 0.6], car: 'W', contested: 'secondary' }, accept: { maxChokes: 4, maxSingleLegs: 2, minRun: 22 } }),
      house(open(), { pieces: 'hooks', gap: 0, fill: 1.25, objectives: { runner: S, primary: [0.05, 0.35], secondary: [0.05, 0.35], car: 'N', contested: 'secondary' }, accept: { maxChokes: 4, maxSingleLegs: 2, minRun: 22 } }),
      house(open(), { pieces: 'hooks', gap: 0, fill: 1.3, objectives: { runner: N, primary: [0.65, 0.95], secondary: [0.65, 0.95], car: 'N', contested: 'both' }, accept: { maxChokes: 5, maxSingleLegs: 2, minRun: 22 } })
    ]
  },
  // 12 — a ring road round a walled core: there are always two ways round.
  // One bag inside the core, one out on the ring's far side.
  'crosstown-loop': {
    cols: 16, rows: 35, scales: [0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7],
    summary: 'Ring road round a walled core: always two ways round, one bag inside, one out on the ring.',
    houses: [
      house(ring(3, 4), { fill: 0.35, objectives: { runner: S, primary: { y: MID, x: [0.3, 0.7] }, secondary: [0.05, 0.2], car: 'N' } }),
      house(ring(3, 4), { fill: 0.4, objectives: { runner: N, primary: { y: MID, x: [0.3, 0.7] }, secondary: [0.8, 0.95], car: 'S' } }),
      house(ring(4, 4), { fill: 0.4, objectives: { runner: S, primary: { y: MID, x: [0.3, 0.7] }, secondary: [0.05, 0.2], car: 'E' } }),
      house(ring(3, 3), { fill: 0.45, objectives: { runner: N, primary: { y: MID, x: [0.3, 0.7] }, secondary: [0.8, 0.95], car: 'W', contested: 'secondary' } }),
      house(ring(4, 3), { fill: 0.5, objectives: { runner: S, primary: { y: MID, x: [0.3, 0.7] }, secondary: [0.05, 0.2], car: 'S', contested: 'secondary' } }),
      house(ring(3, 3), { fill: 0.55, objectives: { runner: N, plug: MID, primary: { y: MID, x: [0.3, 0.7] }, secondary: [0.8, 0.95], car: 'N', contested: 'both' } }),
      house(ring(3, 2), { fill: 0.6, objectives: { runner: S, plug: MID, primary: { y: MID, x: [0.3, 0.7] }, secondary: [0.05, 0.2], car: 'S', contested: 'both' }, accept: { maxChokes: 3 } })
    ]
  },
  // 13 — out and back: bags at the far end of the dock, the car beside the
  // start, so every clear is a long carry home past the plug.
  'dockside-drop': {
    cols: 16, rows: 37, scales: [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8],
    summary: 'Out and back: bags at the far end of the dock, car by the start — a long carry home past the plug.',
    houses: [
      house(bands(9, 3), { pieces: 'bars', fill: 0.5, objectives: { runner: S, plug: MID, primary: [0.03, 0.28], secondary: [0.03, 0.28], car: 'S' }, accept: { minRun: 30, maxSingleLegs: 2 } }),
      house(bands(9, 3), { pieces: 'bars', fill: 0.55, objectives: { runner: N, plug: MID, primary: [0.72, 0.97], secondary: [0.72, 0.97], car: 'N' }, accept: { minRun: 30, maxSingleLegs: 2 } }),
      house(bands(8, 3), { pieces: 'bars', fill: 0.6, objectives: { runner: S, plug: MID, primary: [0.03, 0.28], secondary: [0.03, 0.28], car: 'S' }, accept: { minRun: 30, maxSingleLegs: 2 } }),
      house(bands(8, 3), { pieces: 'bars', fill: 0.62, objectives: { runner: N, plug: [0.5, 0.8], primary: [0.72, 0.97], secondary: [0.72, 0.97], car: 'N', contested: 'secondary' }, accept: { minRun: 30, maxSingleLegs: 2 } }),
      house(bands(8, 2), { pieces: 'bars', fill: 0.65, objectives: { runner: S, plug: [0.2, 0.5], primary: [0.03, 0.28], secondary: [0.03, 0.28], car: 'S', contested: 'secondary' }, accept: { minRun: 30, maxChokes: 3, maxSingleLegs: 2 } }),
      house(bands(7, 2), { pieces: 'bars', fill: 0.7, objectives: { runner: N, plug: MID, primary: [0.72, 0.97], secondary: [0.72, 0.97], car: 'W', contested: 'both' }, accept: { minRun: 30, maxChokes: 3, maxSingleLegs: 2 } }),
      house(bands(7, 2), { pieces: 'bars', fill: 0.75, objectives: { runner: S, plug: MID, primary: [0.03, 0.28], secondary: [0.03, 0.28], car: 'E', contested: 'both' }, accept: { minRun: 30, maxChokes: 3, maxSingleLegs: 2 } })
    ]
  },
  // 14 — a block of rooms with a doorway in every wall; the plug holds a
  // room and you choose another door. Fewer second doors as it goes.
  'brickyard-courts': {
    cols: 18, rows: 35, scales: [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8],
    summary: 'Courtyards and doorways: the plug holds a room, you choose another door.',
    houses: [
      house(rooms(6, 7, 0.55), { pieces: 'blocks', fill: 0.2, objectives: { runner: S, primary: [0.05, 0.35], secondary: [0.4, 0.7], car: 'N' }, accept: { maxChokes: 3 } }),
      house(rooms(6, 7, 0.5), { pieces: 'blocks', fill: 0.22, objectives: { runner: N, primary: [0.65, 0.95], secondary: [0.3, 0.6], car: 'S' }, accept: { maxChokes: 3 } }),
      house(rooms(6, 6, 0.45), { pieces: 'blocks', fill: 0.25, objectives: { runner: S, primary: [0.05, 0.35], secondary: [0.05, 0.35], car: 'E' }, accept: { maxChokes: 3 } }),
      house(rooms(5, 7, 0.4), { pieces: 'blocks', fill: 0.27, objectives: { runner: N, primary: [0.6, 0.95], secondary: [0.35, 0.6], car: 'W', contested: 'secondary' }, accept: { maxChokes: 4, maxSingleLegs: 2 } }),
      house(rooms(6, 6, 0.35), { pieces: 'blocks', fill: 0.3, objectives: { runner: S, primary: [0.05, 0.4], secondary: [0.4, 0.7], car: 'S', contested: 'secondary' }, accept: { maxChokes: 4, maxSingleLegs: 2 } }),
      house(rooms(5, 6, 0.3), { pieces: 'blocks', fill: 0.32, objectives: { runner: N, plug: MID, primary: [0.6, 0.95], secondary: [0.6, 0.95], car: 'N', contested: 'both' }, accept: { maxChokes: 4, maxSingleLegs: 2 } }),
      house(rooms(5, 6, 0.25), { pieces: 'blocks', fill: 0.35, objectives: { runner: S, plug: MID, primary: [0.05, 0.4], secondary: [0.05, 0.4], car: 'E', contested: 'both' }, accept: { maxChokes: 5, maxSingleLegs: 2 } })
    ]
  },
  // 15 — a street grid: long straight lanes both ways (dash room, and a gun
  // down every one), a parallel street for every street, closures later.
  'grid-iron': {
    cols: 18, rows: 37, scales: [0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7],
    summary: 'Street grid of city blocks: long lanes both ways, a parallel street for every street, closures later.',
    houses: [
      house(streets(3, 4, 2, 0.15, 0.05), { pieces: 'dots', fill: 0.15, objectives: { runner: { y: S, x: [0, 0.4] }, primary: { y: [0.05, 0.3], x: [0.6, 1] }, secondary: { y: MID, x: [0, 0.5] }, car: 'N' } }),
      house(streets(3, 4, 2, 0.14, 0.08), { pieces: 'dots', fill: 0.15, objectives: { runner: { y: N, x: [0.6, 1] }, primary: { y: [0.7, 0.95], x: [0, 0.4] }, secondary: MID, car: 'S' } }),
      house(streets(4, 4, 2, 0.12, 0.12), { pieces: 'dots', fill: 0.18, objectives: { runner: { y: S, x: [0.6, 1] }, primary: { y: [0.05, 0.3], x: [0, 0.4] }, secondary: { y: [0.05, 0.3], x: [0.6, 1] }, car: 'W' } }),
      house(streets(3, 5, 2, 0.12, 0.15), { pieces: 'dots', fill: 0.18, objectives: { runner: { y: N, x: [0, 0.4] }, primary: { y: [0.7, 0.95], x: [0.6, 1] }, secondary: MID, car: 'E', contested: 'secondary' } }),
      house(streets(4, 4, 2, 0.1, 0.2), { pieces: 'dots', fill: 0.2, objectives: { runner: { y: S, x: [0, 0.4] }, primary: { y: [0.05, 0.3], x: [0.6, 1] }, secondary: { y: [0.05, 0.3], x: [0, 0.4] }, car: 'S', contested: 'secondary' }, accept: { maxChokes: 3 } }),
      house(streets(3, 4, 2, 0.08, 0.25), { pieces: 'dots', fill: 0.22, objectives: { runner: { y: N, x: [0.6, 1] }, plug: MID, primary: { y: [0.7, 0.95], x: [0, 0.4] }, secondary: MID, car: 'N', contested: 'both' }, accept: { maxChokes: 3 } }),
      house(streets(4, 5, 2, 0.08, 0.3), { pieces: 'dots', fill: 0.25, objectives: { runner: { y: S, x: [0.6, 1] }, plug: MID, primary: { y: [0.05, 0.3], x: [0, 0.4] }, secondary: MID, car: 'E', contested: 'both' }, accept: { maxChokes: 4, maxSingleLegs: 2 } })
    ]
  },
  // 16 — three long alleys on a narrow tall board with few crossings: pick
  // an alley and live with it, or phase through the alley wall.
  'ember-alley': {
    cols: 14, rows: 39, scales: [0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85],
    summary: 'Three long alleys on a narrow tall board with few crossings: pick one, or phase through the wall.',
    houses: [
      house(lanes(2, 3, 2), { pieces: 'bars', fill: 0.4, objectives: { runner: S, primary: [0.05, 0.4], secondary: [0.05, 0.4], car: 'N' } }),
      house(lanes(2, 3, 2), { pieces: 'bars', fill: 0.42, objectives: { runner: N, primary: [0.6, 0.95], secondary: [0.35, 0.65], car: 'S' } }),
      house(lanes(2, 3, 2), { pieces: 'bars', fill: 0.45, objectives: { runner: S, primary: [0.05, 0.35], secondary: [0.35, 0.6], car: 'N', contested: 'secondary' } }),
      house(lanes(2, 3, 3), { pieces: 'bars', fill: 0.5, objectives: { runner: N, primary: [0.65, 0.95], secondary: [0.65, 0.95], car: 'S', contested: 'secondary' } }),
      house(lanes(2, 2, 2), { pieces: 'bars', fill: 0.52, objectives: { runner: S, primary: [0.05, 0.35], secondary: [0.05, 0.35], car: 'E', contested: 'secondary' }, accept: { maxChokes: 3 } }),
      house(lanes(2, 2, 3), { pieces: 'bars', fill: 0.55, objectives: { runner: N, plug: MID, primary: [0.65, 0.95], secondary: [0.65, 0.95], car: 'N', contested: 'both' }, accept: { maxChokes: 3 } }),
      house(lanes(2, 2, 2), { pieces: 'bars', fill: 0.6, objectives: { runner: S, plug: MID, primary: [0.05, 0.35], secondary: [0.05, 0.35], car: 'S', contested: 'both' }, accept: { maxChokes: 4, maxSingleLegs: 2 } })
    ]
  },
  // 17 — escalation: an open terrace that closes in house by house, a
  // different district type each time, density rising from sparse to packed.
  'neon-terrace': {
    cols: 16, rows: 35, scales: [0.35, 0.5, 0.75, 0.95, 1.1, 1.25, 1.4],
    summary: 'Escalation: an open terrace that closes in house by house, a new district type each time.',
    houses: [
      house(pillars(4, 1, 0.3), { pieces: 'blocks', fill: 0.3, objectives: { runner: S, primary: NORTH, secondary: MID, car: 'N' } }),
      house(pillars(3, 1, 0.25), { pieces: 'blocks', fill: 0.4, objectives: { runner: N, primary: SOUTH, secondary: MID, car: 'S' } }),
      house(open(), { pieces: 'mixed', fill: 0.9, objectives: { runner: S, primary: NORTH, secondary: MID, car: 'E' } }),
      house(bands(7, 3), { pieces: 'mixed', fill: 0.6, objectives: { runner: N, primary: SOUTH, secondary: SOUTH, car: 'S', contested: 'secondary' } }),
      house(lanes(1, 3), { pieces: 'hooks', fill: 0.7, objectives: { runner: S, primary: NORTH, secondary: NORTH, car: 'W', contested: 'secondary' }, accept: { maxChokes: 3 } }),
      house(ring(3, 3), { pieces: 'hooks', fill: 0.6, objectives: { runner: N, plug: MID, primary: { y: MID, x: [0.3, 0.7] }, secondary: SOUTH, car: 'N', contested: 'both' }, accept: { maxChokes: 3 } }),
      house(bands(6, 2), { pieces: 'hooks', gap: 0, fill: 0.8, objectives: { runner: S, plug: MID, primary: NORTH, secondary: NORTH, car: 'S', contested: 'both' }, accept: { maxChokes: 4, maxSingleLegs: 2 } })
    ]
  },
  // 18 — low and crowded: a short, dense board where the bags always sit
  // under the plug's nose. Pressure from the first step.
  'undercroft': {
    cols: 16, rows: 33, scales: [1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3],
    summary: 'Low, dense and crowded: a short board where the bags always sit under the plug\'s nose.',
    houses: [
      house(open(), { pieces: 'hooks', gap: 0, fill: 1.0, objectives: { runner: N, plug: MID, primary: MID, secondary: [0.55, 0.9], car: 'S', contested: 'both' }, accept: { maxChokes: 3, minPlugGap: 7 } }),
      house(open(), { pieces: 'hooks', gap: 0, fill: 1.0, objectives: { runner: S, plug: MID, primary: MID, secondary: [0.1, 0.45], car: 'N', contested: 'both' }, accept: { maxChokes: 3, minPlugGap: 7 } }),
      house(open(), { pieces: 'hooks', gap: 0, fill: 1.05, objectives: { runner: N, plug: MID, primary: MID, secondary: MID, car: 'W', contested: 'both' }, accept: { maxChokes: 3, minPlugGap: 7 } }),
      house(open(), { pieces: 'hooks', gap: 0, fill: 1.05, objectives: { runner: S, plug: MID, primary: MID, secondary: MID, car: 'E', contested: 'both' }, accept: { maxChokes: 4, maxSingleLegs: 2, minPlugGap: 7 } }),
      house(open(), { pieces: 'mixed', gap: 0, fill: 1.1, objectives: { runner: N, plug: MID, primary: MID, secondary: [0.55, 0.9], car: 'S', contested: 'both' }, accept: { maxChokes: 4, maxSingleLegs: 2, minPlugGap: 7 } }),
      house(open(), { pieces: 'mixed', gap: 0, fill: 1.1, objectives: { runner: S, plug: MID, primary: MID, secondary: [0.1, 0.45], car: 'N', contested: 'both' }, accept: { maxChokes: 4, maxSingleLegs: 2, minPlugGap: 7 } }),
      house(open(), { pieces: 'hooks', gap: 0, fill: 1.15, objectives: { runner: N, plug: MID, primary: MID, secondary: MID, car: 'S', contested: 'both' }, accept: { maxChokes: 5, maxSingleLegs: 2, minPlugGap: 7 } })
    ]
  },
  // 19 — a wide waterfront: long lanes across the board, bags at opposite
  // ends of it, so the second bag is always a long run sideways.
  'harbor-lights': {
    cols: 20, rows: 33, scales: [0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75],
    summary: 'Wide waterfront: long lanes across the board, bags at opposite ends of it.',
    houses: [
      house(bands(8, 3), { pieces: 'bars', fill: 0.45, objectives: { runner: { y: S, x: [0.35, 0.65] }, primary: { y: NORTH, x: [0, 0.3] }, secondary: { y: NORTH, x: [0.7, 1] }, car: 'N' } }),
      house(bands(8, 3), { pieces: 'bars', fill: 0.5, objectives: { runner: { y: N, x: [0.35, 0.65] }, primary: { y: SOUTH, x: [0, 0.3] }, secondary: { y: SOUTH, x: [0.7, 1] }, car: 'S' } }),
      house(bands(7, 3), { pieces: 'bars', fill: 0.55, objectives: { runner: { y: MID, x: [0, 0.25] }, primary: { y: MID, x: [0.75, 1] }, secondary: { y: NORTH, x: [0.35, 0.65] }, car: 'W' } }),
      house(bands(7, 3), { pieces: 'bars', fill: 0.58, objectives: { runner: { y: MID, x: [0.75, 1] }, primary: { y: MID, x: [0, 0.25] }, secondary: { y: SOUTH, x: [0.35, 0.65] }, car: 'E', contested: 'secondary' } }),
      house(bands(7, 2), { pieces: 'bars', fill: 0.6, objectives: { runner: { y: S, x: [0.35, 0.65] }, primary: { y: NORTH, x: [0, 0.3] }, secondary: { y: NORTH, x: [0.7, 1] }, car: 'S', contested: 'secondary' }, accept: { maxChokes: 3 } }),
      house(bands(6, 2), { pieces: 'bars', fill: 0.65, objectives: { runner: { y: N, x: [0.35, 0.65] }, plug: MID, primary: { y: SOUTH, x: [0, 0.3] }, secondary: { y: SOUTH, x: [0.7, 1] }, car: 'N', contested: 'both' }, accept: { maxChokes: 3 } }),
      house(bands(6, 2), { pieces: 'bars', fill: 0.7, objectives: { runner: { y: MID, x: [0, 0.25] }, plug: MID, primary: { y: MID, x: [0.75, 1] }, secondary: { y: SOUTH, x: [0.7, 1] }, car: 'W', contested: 'both' }, accept: { maxChokes: 4, maxSingleLegs: 2 } })
    ]
  },
  // 20 — a real switchback. Early houses keep shortcut doorways; the last
  // two are the intentional rare challenge: one walking route, every band a
  // one-cell wall, so the fast way is phase and the learnable way is timing.
  'switchback-stairs': {
    cols: 16, rows: 37, scales: [0.3, 0.32, 0.34, 0.36, 0.38, 0.4, 0.42],
    summary: 'A true switchback: shortcut doorways early, then one walking route where phase is the fast way.',
    houses: [
      house(switchback(7, 1.5), { pieces: 'blocks', fill: 0.15, objectives: { runner: N, primary: [0.55, 0.8], secondary: [0.8, 0.97], car: 'S' }, accept: { maxChokes: 4, maxSingleLegs: 2 } }),
      house(switchback(7, 1.3), { pieces: 'blocks', fill: 0.15, objectives: { runner: S, primary: [0.2, 0.45], secondary: [0.03, 0.2], car: 'N' }, accept: { maxChokes: 4, maxSingleLegs: 2 } }),
      house(switchback(6, 1.0), { pieces: 'blocks', fill: 0.18, objectives: { runner: N, primary: [0.6, 0.97], secondary: [0.4, 0.6], car: 'S' }, accept: { maxChokes: 4, maxSingleLegs: 2 } }),
      house(switchback(6, 0.8), { pieces: 'blocks', fill: 0.18, objectives: { runner: S, primary: [0.03, 0.4], secondary: [0.4, 0.6], car: 'N', contested: 'secondary' }, accept: { maxChokes: 5, maxSingleLegs: 3 } }),
      house(switchback(6, 0.6), { pieces: 'blocks', fill: 0.2, objectives: { runner: N, primary: [0.6, 0.97], secondary: [0.6, 0.97], car: 'E', contested: 'secondary' }, accept: { maxChokes: 5, maxSingleLegs: 3 } }),
      house(switchback(5, 0), { pieces: 'blocks', fill: 0.2, objectives: { runner: S, primary: [0.03, 0.35], secondary: [0.03, 0.35], car: 'S', contested: 'both' }, accept: { maxChokes: 99, maxSingleLegs: 4, intentionalSingleRoute: true } }),
      house(switchback(5, 0), { pieces: 'blocks', fill: 0.22, objectives: { runner: N, primary: [0.65, 0.97], secondary: [0.65, 0.97], car: 'N', contested: 'both' }, accept: { maxChokes: 99, maxSingleLegs: 4, intentionalSingleRoute: true } })
    ]
  },
  // 21 — the finale: every district type once, at full pressure, on the
  // biggest board in the pool.
  'last-call-heights': {
    cols: 18, rows: 39, scales: [0.8, 0.9, 1.0, 1.05, 1.1, 1.2, 1.3],
    summary: 'Finale on the biggest board: every district type once, at full pressure.',
    houses: [
      house(rooms(6, 7, 0.4), { pieces: 'blocks', fill: 0.25, objectives: { runner: S, primary: NORTH, secondary: MID, car: 'N', contested: 'secondary' }, accept: { maxChokes: 3 } }),
      house(streets(3, 4, 2, 0.1, 0.2), { pieces: 'dots', fill: 0.2, objectives: { runner: N, primary: SOUTH, secondary: MID, car: 'S', contested: 'secondary' }, accept: { maxChokes: 3 } }),
      house(ring(3, 3), { pieces: 'hooks', fill: 0.55, objectives: { runner: S, plug: MID, primary: { y: MID, x: [0.3, 0.7] }, secondary: NORTH, car: 'E', contested: 'both' }, accept: { maxChokes: 3 } }),
      house(lanes(2, 2, 2), { pieces: 'bars', fill: 0.6, objectives: { runner: N, primary: SOUTH, secondary: SOUTH, car: 'W', contested: 'both' }, accept: { maxChokes: 4, maxSingleLegs: 2 } }),
      house(bands(6, 2), { pieces: 'hooks', fill: 0.55, objectives: { runner: S, plug: MID, primary: NORTH, secondary: NORTH, car: 'S', contested: 'both' }, accept: { maxChokes: 4, maxSingleLegs: 2 } }),
      house(pillars(3, 1, 0.15), { pieces: 'hooks', fill: 0.5, objectives: { runner: N, plug: MID, primary: MID, secondary: SOUTH, car: 'N', contested: 'both' }, accept: { maxChokes: 4, maxSingleLegs: 2 } }),
      house(switchback(6, 1.0), { pieces: 'hooks', gap: 0, fill: 0.6, objectives: { runner: S, plug: MID, primary: NORTH, secondary: NORTH, car: 'N', contested: 'both' }, accept: { maxChokes: 5, maxSingleLegs: 3 } })
    ]
  }
});
