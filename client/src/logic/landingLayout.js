// Presentation-only geometry and save labels. No imports or world RNG.
export function landingLayout(width, height) {
  const w = Math.max(280, Number.isFinite(width) ? width : 390);
  const h = Math.max(480, Number.isFinite(height) ? height : 844);
  const railW = Math.min(600, Math.floor(w * 0.96));
  const dockPad = Math.max(8, Math.floor(Math.min(w, h) * 0.02));
  const profileW = Math.min(220, Math.max(76, railW - dockPad * 2 - 176));
  // The approved PNG includes generous transparent margins. Geometry below
  // describes its visible wordmark, not its full source rectangle.
  const logoW = Math.min(600, w - 36, h * 0.62);
  const logoH = logoW * 0.40;
  const logoY = Math.max(logoH / 2 + 8, h * (h < 600 && w > h ? 0.15 : 0.215));
  const tickerY = logoY + logoH / 2 + 22;
  const rowH = Math.min(60, Math.max(44, Math.floor(h * 0.072)));
  const menuY = Math.max(tickerY + rowH / 2 + 24, h * 0.42);
  // Reserve the footer even on the minimum 280x480 viewport.
  const availableGap = Math.max(rowH, (h - 56 - menuY - rowH / 2) / 4);
  const rowGap = Math.min(availableGap, Math.max(rowH + 6, Math.min(70, h * 0.08)));
  return {
    logoW, logoH, logoY, tickerY, menuY, rowGap,
    menuW: Math.min(440, w - 64, Math.max(260, w * 0.58)), rowH,
    railW, dockPad, profileW, dockY: h - 28,
    // Retain geometry for the shelved non-runner card path.
    cardW: Math.min(480, w - 32), cardH: 250, cardY: menuY
  };
}

export function landingSession(round, mapCount = 15) {
  const resumable = Number.isInteger(round) && round > 1 && round <= mapCount;
  return {
    resumable,
    cleared: resumable ? round - 1 : 0,
    label: resumable ? 'Continue' : 'Start Block'
  };
}

// Fixed framing, not a generated game world. Keep silhouettes clear of both
// the title lockup and the worst-case five-row menu, including their margins.
export function titleBackdrop(width, height) {
  const w = Math.max(280, Number.isFinite(width) ? width : 390);
  const h = Math.max(480, Number.isFinite(height) ? height : 844);
  const a = landingLayout(w, h);
  const points = [
    [.08,.12], [.27,.045], [.73,.06], [.92,.15],
    [.04,.34], [.96,.36], [.04,.57], [.96,.60],
    [.12,.77], [.88,.79], [.32,.86], [.69,.87]
  ];
  const clear = [
    {x:w/2-a.logoW/2-12,y:a.logoY-a.logoH/2-12,w:a.logoW+24,h:a.logoH+64},
    {x:w/2-a.menuW/2-12,y:a.menuY-36,w:a.menuW+24,h:a.rowGap*4+72}
  ];
  return points.map(([nx,ny],i) => ({
    x:w*nx,y:h*ny,
    size:Math.min(88, Math.max(38,w*0.075)),
    angle: [22,-18,14,-26,28,-24,12,-16,25,-23,10,-15][i],
    role: i%3===0 ? 'plug' : 'runner',
    alpha: i%3===0 ? 0.16 : 0.21
  })).filter(p => clear.every(r =>
    p.x+p.size*0.72<r.x || p.x-p.size*0.72>r.x+r.w ||
    p.y+p.size*0.72<r.y || p.y-p.size*0.72>r.y+r.h
  ));
}
