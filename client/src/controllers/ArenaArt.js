// Shared arena presentation. BaseGameScene and the runner tutorial paint
// the same floors, wall edges, exterior margins and overhead furniture.
// Call with the owning scene as this; collision grids are never modified.
import Phaser from 'phaser';
import { drawInteriorDecor } from './InteriorDecor.js';
const T = { WALL: 1 };
export function neutralizeArenaTextures(){
    this._wallFillKey = 'wall_fill';
    this._wallEdgeKey = 'wall_edge';
    try {
      for (const [srcKey, outKey] of [['wall_fill', 'wall_fill_neon'], ['wall_edge', 'wall_edge_neon']]){
        if (!this.textures.exists(srcKey)) continue;
        if (!this.textures.exists(outKey)){
          const img = this.textures.get(srcKey).getSourceImage();
          const cv = document.createElement('canvas');
          cv.width = img.width; cv.height = img.height;
          const ctx = cv.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, cv.width, cv.height);
          const px = data.data;
          for (let i = 0; i < px.length; i += 4){
            const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
            const v = Math.min(255, lum * 2.6); // normalize toward white
            px[i] = px[i + 1] = px[i + 2] = v;
          }
          ctx.putImageData(data, 0, 0);
          this.textures.addCanvas(outKey, cv);
        }
        if (srcKey === 'wall_fill') this._wallFillKey = outKey;
        else this._wallEdgeKey = outKey;
      }
    } catch (e) {
      console.warn('[Textures] neutralize failed, using originals', e);
    }
  }
export function drawArenaArt({ maskWalls = true } = {}){
    const { cell, cols, rows, pad } = this;
    const W = cols*cell + pad.x*2, H = rows*cell + pad.y*2;

    // Full-screen background per theme
    const BG = this.theme?.bg ?? 0x080A10;
    this.add.rectangle(W/2, H/2, W, H, BG, 1);

    const NEON = [0x00E5FF, 0xA78BFA, 0xFF6AD5, 0x00FFA3, 0xFFC857, 0xFF7A00];
    const COVER_FILL = 0x0B0F16;

    this.walls = this.add.group();

    // Build a geometry mask that hides ONLY wall tiles. We invert the mask so
    // sprites remain visible everywhere except inside walls, avoiding the
    // "cage" look from floor-only masks.
    if (maskWalls) {
    const maskG = this.make.graphics({ x: 0, y: 0, add: false });
    maskG.fillStyle(0xffffff, 1);
    // Inset the wall mask so we only clip when the sprite truly overlaps inside
    // the wall tile, not when passing right beside it. This avoids the player
    // appearing "behind" walls at edges while still preventing visual overlap.
    const wallInset = Math.max(1, Math.floor(cell * 0.16));
    for (let y=0; y<rows; y++){
      for (let x=0; x<cols; x++){
        if (this.grid[y][x] !== T.WALL) continue;
        const wx = pad.x + x*cell + wallInset;
        const wy = pad.y + y*cell + wallInset;
        maskG.fillRect(wx, wy, cell - wallInset*2, cell - wallInset*2);
      }
    }
    this.wallMask = new Phaser.Display.Masks.GeometryMask(this, maskG);
    this.wallMask.invertAlpha = true;

    }

    // Full floor fill (wood planks pattern using tiles 96..101)
    this.floors = this.add.group();
    const WOOD = ['wood_96','wood_97','wood_98','wood_99','wood_100','wood_101'];
    const CHECK = ['check_11','check_12','check_13','check_14'];
    const useChecker = (this.theme?.floorSet === 'checker');
    const checkerColors = (Array.isArray(this.theme?.checkerColors) && this.theme.checkerColors.length >= 2)
      ? this.theme.checkerColors
      : null;
    // Fill floor one tile beyond the map to avoid empty black margin
    for (let y=-1; y<=rows; y++){
      for (let x=-1; x<=cols; x++){
        const cx = pad.x + x*cell + cell/2;
        const cy = pad.y + y*cell + cell/2;
        if (useChecker && checkerColors){
          // THEME PATCH: draw crisp two-tone checker without texture, for bright white/gray tiles
          const color = (((x + y) & 1) === 0) ? checkerColors[0] : checkerColors[1];
          const r = this.add.rectangle(cx, cy, cell, cell, color, 1).setDepth(1);
          this.floors.add(r);
        } else {
          let key;
          if (useChecker){
            // Use a single checker tile per match (no alternating checkerboard)
            key = this.floorKeySingle || CHECK[0];
          } else {
            const idx = ((((x%3)+3)%3) + 3 * ((((y%2)+2)%2))) % WOOD.length; // 3x2 plank
            key = WOOD[idx];
          }
          const f = this.add.image(cx, cy, key).setDepth(1).setTint(this.theme?.floorTint ?? 0xffffff);
          f.setDisplaySize(cell, cell);
          this.floors.add(f);
        }
      }
    }

    // Walls (auto‑tiled edges) + furniture lines; border remains black boxes
    const isWall = (cx,cy)=> (cy>=0 && cy<rows && cx>=0 && cx<cols && this.grid[cy][cx] === T.WALL);
    const isBorder = (cx,cy)=> (cx===0||cy===0||cx===cols-1||cy===rows-1);
    const drawDefaultCell = (cx,cy)=>{
      const wx = pad.x + cx*cell + cell/2;
      const wy = pad.y + cy*cell + cell/2;
        const base = this.add.image(wx, wy, this._wallFillKey || 'wall_fill').setDepth(3).setTint(this.theme?.wallFillTint ?? 0xffffff);
        base.setDisplaySize(cell, cell);
        this.walls.add(base);
      const n = isWall(cx, cy-1), e = isWall(cx+1,cy), s = isWall(cx,cy+1), w = isWall(cx-1,cy);
      const addEdge = (angle)=>{
        // Brightened edge accent — the playable area should carry the color
        // pop, not the frame around it.
        const _et = this.theme?.wallEdgeTint ?? 0xffffff;
        const _eb = ((((_et >> 16) & 255) + (255 - ((_et >> 16) & 255)) * 0.22) << 16
                   | (((_et >> 8) & 255) + (255 - ((_et >> 8) & 255)) * 0.22) << 8
                   | ((_et & 255) + (255 - (_et & 255)) * 0.22)) >>> 0;
        const edge = this.add.image(wx, wy, this._wallEdgeKey || 'wall_edge').setDepth(4).setTint(_eb);
        edge.setDisplaySize(cell, cell).setAngle(angle);
        this.walls.add(edge);
      };
      if (!n) addEdge(0);
      if (!e) addEdge(90);
      if (!s) addEdge(180);
      if (!w) addEdge(270);
    };

    drawInteriorDecor(this, { cell, cols, rows, pad, isWall, drawDefaultCell });

    // Fill ALL margin space around the maze with border brick, so the
    // fixed 16x35 grid never leaves visible empty space on any screen.
    // The driveway gap stays open through every ring so the street runs
    // to the screen edge.
    const gapSide = this.egress?.side;
    const gapW = this.egress?.width || 0;
    const gapCenter = this.egress?.entry?.x ?? 0;
    const gapCenterY = this.egress?.entry?.y ?? 0;
    const gapLoX = Math.max(0, gapCenter  - Math.floor(gapW/2));
    const gapHiX = Math.min(cols-1, gapCenter  + Math.floor(gapW/2));
    const gapLoY = Math.max(0, gapCenterY - Math.floor(gapW/2));
    const gapHiY = Math.min(rows-1, gapCenterY + Math.floor(gapW/2));
    const ringsX = Math.ceil(pad.x / cell) + 1; // +1: cover sub-cell remainder
    const ringsY = Math.ceil(pad.y / cell) + 1;
    const inDrivewayCorridor = (x, y) => {
      if (gapSide === 'N') return y < 0     && x >= gapLoX && x <= gapHiX;
      if (gapSide === 'S') return y >= rows && x >= gapLoX && x <= gapHiX;
      if (gapSide === 'W') return x < 0     && y >= gapLoY && y <= gapHiY;
      if (gapSide === 'E') return x >= cols && y >= gapLoY && y <= gapHiY;
      return false;
    };
    // Theme-independent "street reflector" dashes over the margin fill.
    // (Some themes' wall tint happens to reveal texture flecks that look
    // like this — this makes the effect deliberate and visible on ALL
    // themes, including dark/black ones.)
    const marks = this.add.graphics().setDepth(4);
    marks.fillStyle(0x8d9489, 0.18);
    const mw = Math.max(3, Math.floor(cell * 0.16));
    const mh = Math.max(2, Math.floor(cell * 0.08));
    for (let y = -ringsY; y < rows + ringsY; y++){
      for (let x = -ringsX; x < cols + ringsX; x++){
        if (x >= 0 && x < cols && y >= 0 && y < rows) continue;
        if (inDrivewayCorridor(x, y)) continue;
        const wx = pad.x + x*cell + cell/2;
        const wy = pad.y + y*cell + cell/2;
        const base = this.add.image(wx, wy, this._wallFillKey || 'wall_fill').setDepth(3).setTint(this.theme?.wallFillTint ?? 0xffffff);
        base.setDisplaySize(cell, cell); this.walls.add(base);
        // one dash per tile, offset toward top-left like a reflector stud
        if (((x + y) & 3) === 0) marks.fillRect(wx - cell*0.28, wy - cell*0.22, mw, mh);
      }
    }
    this.walls.add(marks);
    this.drawNeonPerimeter();
  }
export function drawArenaPerimeter(){
    const { cols, rows, cell, pad } = this;
    const lighten = (c, t) => {
      const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
      return ((r + (255 - r) * t) << 16 | (g + (255 - g) * t) << 8 | (b + (255 - b) * t)) >>> 0;
    };
    const darken = (c, t) => {
      const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
      return ((r * (1 - t)) << 16 | (g * (1 - t)) << 8 | (b * (1 - t))) >>> 0;
    };
    const isGrayish = (c) => {
      const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
      return Math.max(r, g, b) - Math.min(r, g, b) < 40;
    };
    // Terrace colors are MIXED toward the theme's ambient bg so the
    // platform reads as lit structure in the same scene lighting — the
    // frame must never outshine the playable area.
    const bg = this.theme?.bg ?? 0x080a10;
    const mix = (c1, c2, t) => {
      const r = ((c1 >> 16) & 255) * (1 - t) + ((c2 >> 16) & 255) * t;
      const gg = ((c1 >> 8) & 255) * (1 - t) + ((c2 >> 8) & 255) * t;
      const b = (c1 & 255) * (1 - t) + (c2 & 255) * t;
      return (r << 16 | gg << 8 | b) >>> 0;
    };
    const cA = mix(this.theme?.wallEdgeTint ?? 0x00e5ff, bg, 0.45); // top terrace: muted accent
    const rawB = this.theme?.carTint ?? 0xff4fd8;
    const cB = mix(isGrayish(rawB) ? 0xff4fd8 : rawB, bg, 0.55);    // mid terrace: muted contrast
    const cC = 0x333a48;                                            // base terrace: dark concrete (muted gold read as mustard)

    const x0 = pad.x, y0 = pad.y;
    const x1 = pad.x + cols * cell, y1 = pad.y + rows * cell;

    // Driveway gap span (world coords along the gap side, slightly padded)
    const side = this.egress?.side;
    const gw = this.egress?.width || 0;
    const gPad = cell * 0.4;
    let gapLo = 0, gapHi = 0;
    if (side === 'N' || side === 'S') {
      const c0 = (this.egress?.entry?.x ?? 0) - Math.floor(gw / 2);
      gapLo = pad.x + c0 * cell - gPad;
      gapHi = pad.x + (c0 + gw) * cell + gPad;
    } else if (side === 'W' || side === 'E') {
      const c0 = (this.egress?.entry?.y ?? 0) - Math.floor(gw / 2);
      gapLo = pad.y + c0 * cell - gPad;
      gapHi = pad.y + (c0 + gw) * cell + gPad;
    }

    const g = this.add.graphics().setDepth(5);

    // Fill one ring band spanning offsets [a, b] outside the map bounds,
    // as 4 side rects (corners overlap harmlessly), split at the gap.
    const band = (a, b, color, alpha = 1) => {
      g.fillStyle(color, alpha);
      const spans = (lo, hi, isGapSide) => {
        if (!isGapSide) return [[lo, hi]];
        const out = [];
        if (gapLo > lo) out.push([lo, Math.min(gapLo, hi)]);
        if (gapHi < hi) out.push([Math.max(gapHi, lo), hi]);
        return out;
      };
      // top / bottom (full width incl. corners)
      for (const [s, e] of spans(x0 - b, x1 + b, side === 'N')) g.fillRect(s, y0 - b, e - s, b - a);
      for (const [s, e] of spans(x0 - b, x1 + b, side === 'S')) g.fillRect(s, y1 + a, e - s, b - a);
      // left / right
      for (const [s, e] of spans(y0 - b, y1 + b, side === 'W')) g.fillRect(x0 - b, s, b - a, e - s);
      for (const [s, e] of spans(y0 - b, y1 + b, side === 'E')) g.fillRect(x1 + a, s, b - a, e - s);
    };

    const t = Math.max(8, Math.round(cell * 0.42)); // terrace thickness scales with cell

    band(0, 3, lighten(cA, 0.28));                   // lip at the playable edge (subtle)
    band(3, 3 + t, cA);                              // terrace 1 (accent)
    band(3 + t, 3 + t * 2, darken(cB, 0.08));        // terrace 2 (a step lower)
    band(3 + t * 2, 3 + t * 3, cC);                  // terrace 3 (concrete base)
    // thin dark seams between terraces read as the ledge edges
    band(3 + t - 1, 3 + t + 1, 0x000000, 0.35);
    band(3 + t * 2 - 1, 3 + t * 2 + 1, 0x000000, 0.35);
    // drop shadow onto the street — the depth-seller
    band(3 + t * 3, 3 + t * 3 + 7, 0x000000, 0.30);
    band(3 + t * 3 + 7, 3 + t * 3 + 14, 0x000000, 0.14);

    this._neonPerimeter = g;
  }
