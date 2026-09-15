// Draws the block map (see logic/blockMap.js) into an open GameUI modal.
//
// Uses the modal's registerExtra so everything here is destroyed with it, and
// draws with one Graphics object in the same comic grammar as the board: flat
// fills, ink lines, warm light where a house is lit.

import { layoutBlock } from '../logic/blockMap.js';
import { PALETTE } from '../logic/palette.js';

const ROAD = 0x1a1e2a;
const WALK = 0x2a3040;
const DARK_HOUSE = 0x151a26;
const LIT_HOUSE = 0x3a3324;
const WINDOW = 0xf6d365;
const LAMP = 0xffe08a;

/**
 * @param modal   object returned by GameUI.showModal (needs .panel, .registerExtra)
 * @param opts    { cleared, maps }
 */
export function drawBlockStreet(scene, modal, { cleared, maps }) {
  const panel = modal?.panel;
  if (!panel || !modal.registerExtra) return null;

  const Z = 20_001;
  const pw = panel.width;
  const cx = panel.x;
  const cy = panel.y;
  const inset = 22;
  const baseY = cy + 22;               // sidewalk line the houses stand on

  const { houses } = layoutBlock({ maps, cleared, width: pw - inset * 2, x0: cx - pw / 2 + inset, baseY });

  const g = scene.add.graphics().setScrollFactor(0).setDepth(Z);
  modal.registerExtra(g);

  // Street: sidewalk strip, road, dashed centre line.
  g.fillStyle(WALK, 1);
  g.fillRect(cx - pw / 2 + 8, baseY, pw - 16, 4);
  g.fillStyle(ROAD, 1);
  g.fillRect(cx - pw / 2 + 8, baseY + 4, pw - 16, 26);
  g.fillStyle(0x3b4256, 1);
  for (let x = cx - pw / 2 + 14; x < cx + pw / 2 - 14; x += 14) g.fillRect(x, baseY + 16, 7, 2);

  // Lamp glows first so the houses draw over them.
  for (const h of houses) {
    if (!h.state.endsWith('lit')) continue;
    const lx = h.x + h.w * 0.62;
    const ly = baseY - h.h - 10;
    g.fillStyle(LAMP, 0.10); g.fillCircle(lx, ly, 16);
    g.fillStyle(LAMP, 0.18); g.fillCircle(lx, ly, 9);
  }

  for (const h of houses) {
    const lit = h.state.endsWith('lit');
    const next = h.state.endsWith('next');
    const left = h.x - h.w / 2;
    const top = baseY - h.h;

    // Body + roof, ink outlined.
    g.fillStyle(lit ? LIT_HOUSE : DARK_HOUSE, 1);
    g.lineStyle(2, PALETTE.ink, 1);
    g.fillRect(left, top, h.w, h.h);
    g.strokeRect(left, top, h.w, h.h);
    g.fillTriangle(left - 2, top, h.x, top - (h.finale ? 12 : 8), left + h.w + 2, top);
    g.strokeTriangle(left - 2, top, h.x, top - (h.finale ? 12 : 8), left + h.w + 2, top);

    // Windows: warm when lit, black when not.
    const ww = Math.max(3, h.w * 0.22);
    g.fillStyle(lit ? WINDOW : 0x05070c, 1);
    g.fillRect(h.x - ww * 1.4, top + 5, ww, ww);
    g.fillRect(h.x + ww * 0.4, top + 5, ww, ww);

    // Street lamp beside each lit house.
    if (lit) {
      const lx = h.x + h.w * 0.62;
      g.fillStyle(PALETTE.ink, 1);
      g.fillRect(lx - 1, baseY - h.h - 6, 2, h.h + 6);
      g.fillStyle(LAMP, 1);
      g.fillCircle(lx, baseY - h.h - 8, 3);
    }

    // The finale's tell: two cars out front, one plug each.
    if (h.finale) {
      g.fillStyle(PALETTE.plug, 1);
      g.lineStyle(1.5, PALETTE.ink, 1);
      for (const dx of [-h.w * 0.28, h.w * 0.10]) {
        g.fillRect(h.x + dx, baseY + 9, h.w * 0.3, 9);
        g.strokeRect(h.x + dx, baseY + 9, h.w * 0.3, 9);
      }
    }

    // Marker over the house about to be played.
    if (next) {
      const my = top - (h.finale ? 24 : 20);
      g.fillStyle(PALETTE.runner, 1);
      g.lineStyle(1.5, PALETTE.ink, 1);
      g.fillTriangle(h.x - 6, my - 8, h.x + 6, my - 8, h.x, my);
      g.strokeTriangle(h.x - 6, my - 8, h.x + 6, my - 8, h.x, my);
    }
  }

  return g;
}
