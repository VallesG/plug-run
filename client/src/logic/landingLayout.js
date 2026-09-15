// Presentation only. No imports and no gameplay state or random consumption.
export function landingLayout(width, height) {
  const w = Math.max(280, Number.isFinite(width) ? width : 390);
  const h = Math.max(480, Number.isFinite(height) ? height : 844);
  const railW = Math.min(600, Math.floor(w * 0.96));
  const dockPad = Math.max(8, Math.floor(Math.min(w, h) * 0.02));
  const profileW = Math.min(220, Math.max(76, railW - dockPad * 2 - 176));
  const cardW = Math.min(480, w - 32);
  const logoW = Math.min(480, w - 36, Math.max(140, (h - 416) / 0.32));
  const logoH = logoW * 0.32;
  const cardH = Math.max(250, Math.min(320, h * 0.37));
  const total = logoH + 42 + cardH + 54;
  const top = Math.max(12, Math.min(48, (h - 64 - total) / 2));
  const cardTop = top + logoH + 42;
  return {
    cardW, cardH, logoW, logoH, railW, dockPad, profileW,
    logoY: top + logoH / 2,
    tickerY: top + logoH + 14,
    cardY: cardTop + cardH / 2,
    tutorialY: cardTop + cardH + 28,
    dockY: h - 28
  };
}

