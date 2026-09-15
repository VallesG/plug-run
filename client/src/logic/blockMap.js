// The block map — fifteen real floor plans arranged as a neighborhood seen
// from above. Pure layout and state; maze generation and drawing stay in
// controllers/BlockMap.js.
//
// WHY
// A one-dimensional street made the daily look like a level ladder. The block
// is a place: plots, cross streets and a route that folds back through them.
// Five columns by three rows leaves enough height for every 16x35 maze cell to
// remain visible even in the completed-run modal, while a snaking order makes
// progress readable without spending the map's scarce pixels on arrows.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const MAZE_COLS = 16;
const MAZE_ROWS = 35;

export function houseState(i, cleared, maps) {
  const c = clamp(cleared | 0, 0, maps);
  const base = i <= c ? 'revealed' : (i === c + 1 ? 'next' : 'fogged');
  return i === maps ? `finale-${base}` : base;
}

export function layoutBlock({
  maps = 15,
  cleared = 0,
  width,
  height = 200,
  x0 = 0,
  y0 = 0,
  columns
}) {
  const total = Math.max(1, maps | 0);
  const c = clamp(cleared | 0, 0, total);
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  const requestedColumns = columns | 0;
  const defaultColumns = total > 8 ? 5 : Math.min(4, total);
  const columnCount = clamp(requestedColumns || defaultColumns, 1, total);
  const rowCount = Math.ceil(total / columnCount);
  const street = clamp(Math.min(w * 0.026, h * 0.065), 6, 12);
  const lotW = (w - street * (columnCount - 1)) / columnCount;
  const lotH = (h - street * (rowCount - 1)) / rowCount;

  const roads = [];
  for (let col = 1; col < columnCount; col++) {
    roads.push({
      orientation: 'vertical',
      x: x0 + col * lotW + (col - 1) * street,
      y: y0,
      w: street,
      h
    });
  }
  for (let row = 1; row < rowCount; row++) {
    roads.push({
      orientation: 'horizontal',
      x: x0,
      y: y0 + row * lotH + (row - 1) * street,
      w,
      h: street
    });
  }

  const houses = [];
  for (let i = 1; i <= total; i++) {
    const routeSlot = i - 1;
    const row = Math.floor(routeSlot / columnCount);
    const offset = routeSlot % columnCount;
    const col = row % 2 === 0 ? offset : columnCount - 1 - offset;
    const lotX = x0 + col * (lotW + street);
    const lotY = y0 + row * (lotH + street);
    const cell = Math.max(0, Math.min((lotW * 0.58) / MAZE_COLS, (lotH - 6) / MAZE_ROWS));
    const footprintW = cell * MAZE_COLS;
    const footprintH = cell * MAZE_ROWS;

    houses.push({
      index: i,
      state: houseState(i, c, total),
      finale: i === total,
      row,
      col,
      lotX,
      lotY,
      lotW,
      lotH,
      x: lotX + lotW / 2,
      y: lotY + lotH / 2 + 1,
      w: footprintW,
      h: footprintH,
      cell
    });
  }

  return {
    houses,
    roads,
    columns: columnCount,
    rows: rowCount,
    street,
    cleared: c,
    maps: total,
    bounds: { x: x0, y: y0, w, h }
  };
}
