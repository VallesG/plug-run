// The getaway car, drawn once per paint job into a canvas texture.
//
// Top-down, nose up (angle 0 faces north), in the car's true proportions:
// 1.4 cells wide by 2.6 long. Cosmetic only: where the car parks, the
// extraction pad and every recorded replay stay exactly as they were; this
// is how the car is drawn, never where it is.
import { gangSkin } from '../logic/gangSkins.js';
import { selectedGangSkin } from './GangSkinTextures.js';

export const CAR_WIDTH_CELLS = 1.4;
export const CAR_LENGTH_CELLS = 2.6;
/** Jev, and anyone who has not picked a crew, drive the classic blue. */
export const DEFAULT_CAR_PAINT = Object.freeze({ paint: 0x2f6fb7, stripe: 0xf1f5f9 });

/** A crew colour made car-paint glossy: a little more saturated and bright. */
export function carPaintColor(c) {
  let [r, g, b] = [(c >> 16) & 255, (c >> 8) & 255, c & 255].map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, sat = 0;
  if (max !== min) {
    const d = max - min; sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
  }
  sat = Math.min(1, sat * 1.3); const L = Math.min(0.62, l * 1.12);
  const q = L < 0.5 ? L * (1 + sat) : L + sat - L * sat, p = 2 * L - q;
  const hue = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].reduce((acc, v) => (acc << 8) | Math.round(v * 255), 0);
}

/** The paint job for the player's car: their crew's colours, else blue. */
export function playerCarPaint(id = selectedGangSkin()) {
  const skin = gangSkin(id);
  return skin ? { paint: carPaintColor(skin.car), stripe: skin.stripe } : DEFAULT_CAR_PAINT;
}

const rgb = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
/** Lighten (f > 0) or darken (f < 0) a colour, as a CSS string. */
function shade(c, f, a = 1) {
  const [r, g, b] = rgb(c);
  const m = (v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
  return `rgba(${m(r)},${m(g)},${m(b)},${a})`;
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function poly(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }

/** Draw the car into a W x H canvas context, nose up. */
export function drawCar(ctx, W, H, paint, stripe) {
  const bx = 16, by = 6, bw = W - 32, bh = H - 12, mid = W / 2;
  ctx.clearRect(0, 0, W, H);
  // Wheels, peeking out from under the body.
  ctx.fillStyle = '#121518';
  for (const wy of [by + 42, by + bh - 42 - 58]) for (const wx of [bx - 10, bx + bw - 14]) { rr(ctx, wx, wy, 24, 58, 8); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  for (const wy of [by + 42, by + bh - 42 - 58]) for (const wx of [bx - 10, bx + bw - 14]) { rr(ctx, wx + 5, wy + 6, 6, 46, 3); ctx.fill(); }
  // Body: rounded, lit from the left so it reads as a curved shell.
  const body = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  body.addColorStop(0, shade(paint, -0.45)); body.addColorStop(0.18, shade(paint, 0.05));
  body.addColorStop(0.42, shade(paint, 0.28)); body.addColorStop(0.62, shade(paint, 0.10));
  body.addColorStop(1, shade(paint, -0.50));
  rr(ctx, bx, by, bw, bh, 40); ctx.fillStyle = body; ctx.fill();
  // Racing stripes, nose to tail (the glass is drawn over them).
  ctx.fillStyle = shade(stripe, 0, 0.95);
  for (const sx of [mid - 17, mid + 5]) { ctx.fillRect(sx, by + 4, 12, bh - 8); }
  // Hood creases and a specular sheen.
  ctx.strokeStyle = shade(paint, -0.30, 0.55); ctx.lineWidth = 2.5;
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(mid + sx * 34, by + 30); ctx.quadraticCurveTo(mid + sx * 40, by + 64, mid + sx * 38, by + 94); ctx.stroke(); }
  const sheen = ctx.createRadialGradient(bx + bw * 0.34, by + 58, 4, bx + bw * 0.34, by + 58, 70);
  sheen.addColorStop(0, 'rgba(255,255,255,0.30)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
  rr(ctx, bx, by, bw, bh, 40); ctx.fillStyle = sheen; ctx.fill();
  // Headlights and grille.
  ctx.save(); ctx.shadowColor = 'rgba(255,240,190,0.9)'; ctx.shadowBlur = 10; ctx.fillStyle = '#fff4cf';
  rr(ctx, bx + 12, by + 8, 30, 13, 6); ctx.fill(); rr(ctx, bx + bw - 42, by + 8, 30, 13, 6); ctx.fill(); ctx.restore();
  ctx.fillStyle = 'rgba(12,16,20,0.75)'; rr(ctx, mid - 22, by + 10, 44, 7, 3); ctx.fill();
  // Mirrors.
  ctx.fillStyle = shade(paint, -0.25);
  rr(ctx, bx - 9, by + 104, 14, 11, 4); ctx.fill(); rr(ctx, bx + bw - 5, by + 104, 14, 11, 4); ctx.fill();
  // Glass: windshield, rear window, side windows. Dark, with a sky streak.
  const glass = (y0, y1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#26394a'); g.addColorStop(1, '#0c141c'); return g; };
  poly(ctx, [[bx + 14, by + 98], [bx + bw - 14, by + 98], [bx + bw - 26, by + 140], [bx + 26, by + 140]]);
  ctx.fillStyle = glass(by + 98, by + 140); ctx.fill();
  poly(ctx, [[bx + 26, by + bh - 76], [bx + bw - 26, by + bh - 76], [bx + bw - 16, by + bh - 48], [bx + 16, by + bh - 48]]);
  ctx.fillStyle = glass(by + bh - 48, by + bh - 76); ctx.fill();
  ctx.fillStyle = '#101a24';
  rr(ctx, bx + 8, by + 146, 10, bh - 230, 4); ctx.fill(); rr(ctx, bx + bw - 18, by + 146, 10, bh - 230, 4); ctx.fill();
  ctx.fillStyle = 'rgba(210,235,255,0.30)';
  poly(ctx, [[bx + 34, by + 101], [bx + 52, by + 101], [bx + 40, by + 137], [bx + 30, by + 137]]); ctx.fill();
  // Roof: the stripes run over it; a soft edge sells the curve.
  const roof = ctx.createLinearGradient(bx + 24, 0, bx + bw - 24, 0);
  roof.addColorStop(0, 'rgba(0,0,0,0.22)'); roof.addColorStop(0.4, 'rgba(255,255,255,0.10)'); roof.addColorStop(1, 'rgba(0,0,0,0.28)');
  rr(ctx, bx + 22, by + 142, bw - 44, bh - 220, 16); ctx.fillStyle = roof; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.stroke();
  // Taillights.
  ctx.save(); ctx.shadowColor = 'rgba(255,60,60,0.9)'; ctx.shadowBlur = 8; ctx.fillStyle = '#ff4a4a';
  rr(ctx, bx + 12, by + bh - 18, 28, 11, 5); ctx.fill(); rr(ctx, bx + bw - 40, by + bh - 18, 28, 11, 5); ctx.fill(); ctx.restore();
  // Rim light and a crisp edge.
  rr(ctx, bx + 2, by + 2, bw - 4, bh - 4, 38); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 3; ctx.stroke();
  rr(ctx, bx, by, bw, bh, 40); ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke();
}

/**
 * The texture key for a paint job, drawing it the first time it is needed.
 * Returns null when a canvas texture cannot be made; callers keep the old
 * sprite in that case.
 */
export function ensureCarTexture(scene, { paint, stripe } = DEFAULT_CAR_PAINT) {
  const key = 'getaway_car_v1_' + paint.toString(16) + '_' + stripe.toString(16);
  if (scene.textures.exists(key)) return key;
  let texture = null;
  try {
    texture = scene.textures.createCanvas(key, 168, 312);
    drawCar(texture.context, 168, 312, paint, stripe);
    texture.refresh();
    return key;
  } catch (error) {
    if (texture) scene.textures.remove(key);
    console.warn('[Car] Kept the original car art', error);
    return null;
  }
}

/**
 * Park a car, broadside across the driveway, facing along the curb so it can
 * peel away down the street. `out` is the direction of the street. Draws the
 * shadow, the ink outline and the car; returns the car image, with
 * `_outline` and `_shadow` for the departure tween and `_heading` for the
 * direction it drives off in.
 */
export function drawParkedCar(scene, x, y, out, cell, { paint = DEFAULT_CAR_PAINT, depth = 9, ink = 0x0b0f12, register = (o) => o } = {}) {
  const key = ensureCarTexture(scene, paint);
  if (!key) return null;
  // Facing along the curb: the street direction turned a quarter clockwise.
  const heading = { x: -out.y, y: out.x };
  const angle = Math.atan2(heading.y, heading.x) * 180 / Math.PI + 90;
  const w = cell * CAR_WIDTH_CELLS, len = cell * CAR_LENGTH_CELLS;
  // Footprint on screen: long along the curb, 1.4 cells deep toward the street.
  const fw = out.x ? w : len, fh = out.x ? len : w;
  const shadow = register(scene.add.ellipse(x + cell * 0.10, y + cell * 0.16, fw * 1.02, fh * 0.98, 0x000000, 0.34).setDepth(depth - 1.5));
  const opx = Math.max(2, Math.round(cell * 0.09));
  const outline = [[opx, 0], [-opx, 0], [0, opx], [0, -opx]].map(([ox, oy]) =>
    register(scene.add.image(x + ox, y + oy, key).setDisplaySize(w, len).setAngle(angle).setTint(ink).setDepth(depth - 1)));
  const car = register(scene.add.image(x, y, key).setDisplaySize(w, len).setAngle(angle).setDepth(depth));
  car._outline = outline;
  car._shadow = shadow;
  car._heading = heading;
  return car;
}
