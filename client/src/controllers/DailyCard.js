// The Daily Race's own look: a race ticket, not the Block Rivals district map.
// Drawn into a modal's free content area (modal.contentBounds), like the
// district map is, and registered with the modal so it closes with it.
//
//   intro:  today's number and date, the seven-house route, the course, the
//           time to beat, the streak, and whether this run is the official one
//   result: the same ticket, houses filled as cleared, stamped OFFICIAL or
//           PRACTICE
import { raceTimeLabel } from '../logic/dailyRace.js';

export const DAILY_AMBER = 0xf2a33a;
const AMBER = '#f2a33a', CREAM = '#f3e6c8', MUTED = '#9c927c', INK = 0x0b0a07;
const Z = 20002;

export function drawDailyCard(scene, modal, info = {}) {
  const area = modal?.contentBounds;
  const keep = modal?.registerExtra;
  if (!area || !keep || !scene?.add?.text || area.height < 120) return null;
  const { n = 1, dateLabel = '', courseName = '', rivalName = 'RIVAL', targetMs = null, streak = 0,
    official = null, mode = 'intro', cleared = 0, finishedMs = null } = info;
  const w = Math.min(area.width - 8, 360);
  const h = Math.min(area.height - 8, mode === 'result' ? 250 : 330);
  const cx = area.x + area.width / 2;
  const top = area.y + Math.max(4, (area.height - h) / 2);
  const compact = h < 250;
  const add = (o) => { o.setDepth?.(Z); o.setScrollFactor?.(0); keep(o); return o; };
  const text = (x, y, value, { size = 12, color = CREAM, font = 'monospace', bold = true, spacing = 1, origin = [0.5, 0] } = {}) =>
    add(scene.add.text(x, y, value, { fontFamily: font, fontSize: size + 'px', fontStyle: bold ? 'bold' : 'normal', color, letterSpacing: spacing })
      .setOrigin(origin[0], origin[1]));

  // The ticket: warm dark card, amber edge, a punched stub line near the top.
  const g = add(scene.add.graphics());
  g.fillStyle(INK, 0.55).fillRoundedRect(cx - w / 2 + 5, top + 6, w, h, 12);
  g.fillStyle(0x17130c, 0.98).fillRoundedRect(cx - w / 2, top, w, h, 12);
  g.lineStyle(2, DAILY_AMBER, 0.95).strokeRoundedRect(cx - w / 2, top, w, h, 12);
  const stubY = top + (compact ? 30 : 36);
  g.fillStyle(0x3a2e18, 1);
  for (let x = cx - w / 2 + 14; x < cx + w / 2 - 10; x += 12) g.fillCircle(x, stubY, 1.6);
  g.fillStyle(0x0b0b12, 1).fillCircle(cx - w / 2, stubY, 7).fillCircle(cx + w / 2, stubY, 7);

  text(cx - w / 2 + 16, top + (compact ? 9 : 12), 'DAILY RACE', { size: 11, color: AMBER, spacing: 3, origin: [0, 0] });
  text(cx + w / 2 - 16, top + (compact ? 9 : 12), dateLabel, { size: 11, color: MUTED, spacing: 2, origin: [1, 0] });

  // The number, big.
  let y = stubY + (compact ? 6 : 12);
  const big = compact ? 44 : 60;
  text(cx, y, '#' + n, { size: big, color: AMBER, font: 'Arial, sans-serif', spacing: 2 }).setStroke('#0b0a07', 6);
  y += big + (compact ? 4 : 10);

  // Seven houses on one road.
  const span = w - 64, step = span / 6, hx0 = cx - span / 2, hy = y + 10;
  g.lineStyle(3, 0x4a3b20, 1).lineBetween(hx0, hy, hx0 + span, hy);
  for (let i = 0; i < 7; i++) {
    const x = hx0 + i * step, done = mode === 'result' && i < cleared;
    g.fillStyle(done ? DAILY_AMBER : 0x17130c, 1).fillRect(x - 8, hy - 6, 16, 12);
    g.lineStyle(2, done ? 0xffd79a : 0x8a6b35, 1).strokeRect(x - 8, hy - 6, 16, 12);
    g.fillStyle(done ? 0xffd79a : 0x8a6b35, 1).fillTriangle(x - 10, hy - 6, x + 10, hy - 6, x, hy - 14);
  }
  y = hy + (compact ? 16 : 22);

  // What today is.
  const row = (label, value, color = CREAM) => {
    text(cx - w / 2 + 22, y, label, { size: 10, color: MUTED, spacing: 2, origin: [0, 0] });
    text(cx + w / 2 - 22, y, value, { size: 12, color, spacing: 1, origin: [1, 0] });
    y += compact ? 17 : 21;
  };
  if (courseName) row('COURSE', courseName.toUpperCase());
  if (mode === 'result' && Number.isFinite(finishedMs) && cleared === 7) row('YOUR TIME', raceTimeLabel(finishedMs), AMBER);
  if (Number.isFinite(targetMs)) row('TO BEAT', String(rivalName).toUpperCase() + ' ' + raceTimeLabel(targetMs));
  row('STREAK', streak > 0 ? streak + (streak === 1 ? ' DAY' : ' DAYS') : 'START ONE TODAY', streak > 0 ? AMBER : CREAM);

  // The stamp.
  if (official !== null && y + 26 < top + h) {
    const label = official ? 'OFFICIAL RUN' : 'PRACTICE RUN';
    const note = mode === 'intro'
      ? (official ? 'Your first finish today counts.' : 'Today\'s official run is done.')
      : (official ? 'Counted for today\'s board.' : 'Not counted. Come back tomorrow.');
    text(cx, y + 2, label, { size: 13, color: official ? AMBER : MUTED, spacing: 4 });
    if (y + 40 < top + h) text(cx, y + 22, note, { size: 10, color: MUTED, bold: false, spacing: 0 });
  }
  return { top, height: h };
}
