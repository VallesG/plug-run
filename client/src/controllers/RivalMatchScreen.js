// Block Rivals: the match screen. Search, reveal and lobby are ONE opaque,
// full-screen surface in different states (logic/rivalMatchmaking.js
// rivalLobbyLayout): the you-vs-rival header and the block stay where they are
// from LOOK FOR MATCH until READY. The rival's empty slot fills when one is
// found; the zone under the block goes from the search status to the reveal to
// your powers. The rival's powers are never shown before the race. Nothing of the house built underneath
// shows through.
//
// Presentation only. RivalsRace owns the match stages, the words, the timing
// and every decision; this module draws what it is told and reports taps.
import { drawBlockMap } from './BlockMap.js';
import { layoutBlock } from '../logic/blockMap.js';
import { drawPowerIcon } from './PowerIcons.js';
import { RUNNER_POWERS } from './RunnerLoadout.js';
import { choosePower, removePowerAt } from '../logic/powerSelection.js';
import { rivalLobbyLayout, rivalMonogram } from '../logic/rivalMatchmaking.js';
import { consumeModalPointer, guardModalDismissal } from '../utils/modalPointerGuard.js';
import { drawCrewSigil } from './CrewSigil.js';

const Z = 21000;
const INK = 0x07090b;
const C = {
  line: 0x26323a, panel: 0x0d1419, card: 0x121b22, cardOn: 0x1c2831,
  cream: '#eee3c7', muted: '#8ca7aa', faint: '#62767c', teal: 0x7fd1c7,
  you: 0x86bad5, youCss: '#9bcae5', rival: 0xc6ac70, rivalCss: '#dec386',
  lamp: 0xffd78a, ready: 0xa8c9d7, readyLine: 0xd4e5e9, readyInk: '#10202b',
  button: 0x141c22, buttonLine: 0x3b4b58, buttonText: '#b9c7cf', off: 0x1a232b, offText: '#6f808b'
};
const FONT = 'Arial, sans-serif', MONO = 'monospace';
const GROUPS = ['header', 'rival', 'course', 'zone', 'footer'];

export class RivalMatchScreen {
  /** `home` is the block's own course: the art the block screen just showed. */
  constructor(scene, { home, gangID = null, labels = {}, now = null } = {}) {
    this.scene = scene;
    this.home = home;
    this.gangID = gangID;
    this.labels = labels;
    this.W = scene.scale.gameSize.width;
    this.H = scene.scale.gameSize.height;
    this.L = rivalLobbyLayout(this.W, this.H);
    this.groups = Object.fromEntries(GROUPS.map((g) => [g, []]));
    this.timers = [];
    this.destroyed = false;
    this.armedAt = now ?? performance.now();
    this.base = [];
    // Opaque and interactive: the house and HUD beneath are neither visible
    // nor reachable.
    // Corner-anchored with a margin: pixel-art rounding on an odd height must
    // not leave a row of the arena showing.
    const backdrop = scene.add.rectangle(-4, -4, this.W + 8, this.H + 8, INK, 1).setOrigin(0, 0)
      .setScrollFactor(0).setDepth(Z).setInteractive();
    backdrop.on('pointerdown', (p, x, y, e) => consumeModalPointer(p, e));
    this.base.push(backdrop);
    this.buildHeader();
  }

  // --- bookkeeping ----------------------------------------------------------
  put(group, o) { this.groups[group].push(o); return o.setScrollFactor ? o.setScrollFactor(0) : o; }
  drop(o) { if (!o) return; this.scene.tweens?.killTweensOf?.(o); o.destroy?.(); }
  // tick() animates the search status; once the zone is replaced it must not
  // touch the old objects again.
  forget(group) { if (group === 'zone') this.title = this.dot = this.clock = null; if (group === 'rival') this.rivalMark = null; }
  clear(group) { this.forget(group); this.groups[group].forEach((o) => this.drop(o)); this.groups[group] = []; }
  /** Fade a group out and forget it; its replacement can be drawn at once. */
  retire(group, ms = 180) {
    this.forget(group);
    const old = this.groups[group];
    this.groups[group] = [];
    if (!ms) { old.forEach((o) => this.drop(o)); return; }
    old.forEach((o) => { if (o.input) o.disableInteractive?.(); });
    this.scene.tweens.add({ targets: old, alpha: 0, duration: ms, onComplete: () => old.forEach((o) => this.drop(o)) });
  }
  fadeIn(objects, delay = 0, ms = 260) {
    const list = objects.filter((o) => o && o.alpha !== undefined);
    const to = list.map((o) => o.alpha);
    list.forEach((o) => o.setAlpha(0));
    this.scene.tweens.add({ targets: list, alpha: { from: 0, to: 1 }, delay, duration: ms, ease: 'Sine.easeOut',
      onComplete: () => list.forEach((o, i) => o.active && o.setAlpha(to[i])) });
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.timers.forEach((t) => t?.remove?.(false));
    GROUPS.forEach((g) => this.clear(g));
    this.base.forEach((o) => this.drop(o));
    this.cars = null;
  }
  later(ms, fn) {
    const t = this.scene.time.delayedCall(ms, () => { if (!this.destroyed) fn(); });
    this.timers.push(t);
    return t;
  }
  armed() { return !this.destroyed && performance.now() >= this.armedAt; }
  text(group, x, y, value, { size = 13, color = C.cream, font = FONT, bold = true, origin = [0.5, 0.5], spacing = 0, depth = Z + 6 } = {}) {
    return this.put(group, this.scene.add.text(x, y, value, {
      fontFamily: font, fontSize: size + 'px', fontStyle: bold ? 'bold' : 'normal', color, letterSpacing: spacing, align: 'center'
    }).setOrigin(origin[0], origin[1]).setDepth(depth));
  }
  rect(group, x, y, w, h, fill, alpha = 1, line = null, lineAlpha = 1, depth = Z + 4) {
    const r = this.put(group, this.scene.add.rectangle(x, y, w, h, fill, alpha).setDepth(depth));
    if (line != null) r.setStrokeStyle(1, line, lineAlpha);
    return r;
  }
  tap(target, fn, { dismiss = false } = {}) {
    target.setInteractive({ useHandCursor: true }).on('pointerdown', (p, x, y, e) => {
      consumeModalPointer(p, e);
      if (!this.armed()) return;
      if (dismiss) guardModalDismissal(this.scene, p, e);
      try { this.scene.audio?.play?.('ui_click', { volume: 0.3 }); } catch {}
      fn(p, e);
    });
    return target;
  }
  button(group, x, y, w, h, label, fn, { primary = false } = {}) {
    const bg = this.rect(group, x + w / 2, y + h / 2, w, h, primary ? C.ready : C.button, 1, primary ? C.readyLine : C.buttonLine);
    const t = this.text(group, x + w / 2, y + h / 2, label, { size: 15, color: primary ? C.readyInk : C.buttonText, spacing: 1 });
    this.tap(bg, fn, { dismiss: true });
    return { bg, text: t };
  }

  // --- header: you vs rival; present in every state -----------------------------
  buildHeader() {
    const h = this.L.header, lb = this.labels;
    const cy = h.y + h.h * 0.5 + 2, badge = Math.round(Math.min(54, h.h * 0.56));
    this.badge = badge; this.headerY = cy;
    const youX = h.x + badge / 2 + 2, rivalX = h.x + h.w - badge / 2 - 2;
    this.rivalX = rivalX;
    this.text('header', h.x + h.w / 2, h.y + 9, lb.overline || '', { size: 10, color: C.faint, font: MONO, spacing: 3 });
    // You: blue like your HUD rail, with your crew's mark when you have one.
    this.rect('header', youX, cy, badge, badge, 0x0f1a20, 1, C.you, 1, Z + 5);
    const g = this.put('header', this.scene.add.graphics().setDepth(Z + 6));
    if (!drawCrewSigil(g, this.gangID, { x: youX - badge * 0.34, y: cy - badge * 0.34, size: badge * 0.68, alpha: 0.95 })) {
      // A plain runner silhouette.
      g.fillStyle(C.you, 0.95).fillCircle(youX, cy - badge * 0.13, badge * 0.15);
      g.fillRoundedRect(youX - badge * 0.25, cy + badge * 0.07, badge * 0.5, badge * 0.26, { tl: badge * 0.2, tr: badge * 0.2, bl: 2, br: 2 });
    }
    this.text('header', youX + badge / 2 + 10, cy - 9, lb.you || 'YOU', { size: 17, color: C.youCss, origin: [0, 0.5] });
    this.youChip = this.chip('header', youX + badge / 2 + 10, cy + 12, lb.notReady || '', false, C.you, [0, 0.5]);
    this.youChip.t.setVisible(false); this.youChip.bg.setVisible(false);
    this.text('header', h.x + h.w / 2, cy, lb.vs || 'VS', { size: 13, color: C.faint, font: MONO, spacing: 2 });
    this.rule = this.rect('header', h.x + h.w / 2, h.y + h.h - 1, h.w, 1, C.line, 1, null, 1, Z + 4);
    this.emptyRival();
  }
  /** The rival's slot before anyone is found: an outline, pulsing while searching. */
  emptyRival() {
    this.clear('rival');
    const b = this.badge, x = this.rivalX, y = this.headerY;
    this.rivalBox = this.rect('rival', x, y, b, b, 0x0c1216, 1, 0x3a464d, 1, Z + 5);
    this.rivalMark = this.text('rival', x, y + 1, '?', { size: Math.round(b * 0.46), color: C.faint });
    this.text('rival', x - b / 2 - 10, y - 9, this.labels.rival || 'RIVAL', { size: 17, color: C.faint, origin: [1, 0.5] });
  }
  fillRival(name, { ready = true, animate = false } = {}) {
    this.clear('rival');
    const b = this.badge, x = this.rivalX, y = this.headerY, lb = this.labels;
    const box = this.rect('rival', x, y, b, b, 0x1d1a12, 1, C.rival, 1, Z + 5);
    const mark = this.text('rival', x, y + 1, rivalMonogram(name), { size: Math.round(b * 0.5), color: C.rivalCss });
    const label = this.text('rival', x - b / 2 - 10, y - 9, name, { size: 17, color: C.rivalCss, origin: [1, 0.5] });
    // A long handle shrinks rather than running into VS.
    const room = this.L.header.w / 2 - b - 30;
    if (label.width > room) label.setScale(room / label.width);
    const chip = this.chip('rival', x - b / 2 - 10, y + 12, ready ? lb.ready : lb.notReady, ready, C.rival, [1, 0.5]);
    this.rule.setFillStyle(C.rival, 0.9);
    if (!animate) return;
    this.scene.tweens.add({ targets: [box, mark], scaleX: { from: 0.55, to: 1 }, scaleY: { from: 0.55, to: 1 }, duration: 360, ease: 'Back.easeOut' });
    this.fadeIn([box, mark], 0, 200);
    this.fadeIn([label], 120, 260);
    this.scene.tweens.add({ targets: label, x: { from: label.x + 14, to: label.x }, delay: 120, duration: 260, ease: 'Sine.easeOut' });
    this.fadeIn([chip.t, chip.bg], 420, 220);
    this.scene.tweens.add({ targets: this.rule, scaleX: { from: 0, to: 1 }, duration: 420, ease: 'Cubic.easeOut' });
  }
  chip(group, x, y, label, on, color, origin) {
    const t = this.text(group, x, y, label, { size: 10, color: on ? '#0d1115' : C.faint, font: MONO, spacing: 1, origin, depth: Z + 7 });
    const w = t.width + 12, left = origin[0] === 0 ? x - 6 : x - w + 6;
    const bg = this.rect(group, left + w / 2, y, w, 17, on ? color : 0x10171c, 1, on ? color : C.line, 1, Z + 6);
    return { t, bg, set: (label2, on2) => {
      t.setText(label2).setColor(on2 ? '#0d1115' : C.faint);
      const w2 = t.width + 12, l2 = origin[0] === 0 ? x - 6 : x - w2 + 6;
      bg.setPosition(l2 + w2 / 2, y).setSize(w2, 17).setFillStyle(on2 ? color : 0x10171c, 1).setStrokeStyle(1, on2 ? color : C.line, 1);
    } };
  }

  // --- the block: the liked block-map art, with traffic while searching -----------
  drawBlock(course) {
    const scene = this.scene, a = this.L.art;
    const container = this.put('course', scene.add.container(0, 0).setDepth(Z + 2));
    const facade = { worldBlock: course, currentRouteID: course.id, add: scene.add, tweens: scene.tweens };
    drawBlockMap(facade, {
      contentBounds: { x: a.x, y: a.y, width: a.w, height: a.h },
      registerExtra: (o) => container.add(o)
    }, { maps: 7, cleared: 7, entering: false, animate: false, caption: false, labels: true, fog: false, marker: false, celebration: true });
    const block = layoutBlock({ maps: 7, cleared: 7, entering: false, layoutSeed: course.seed,
      width: a.w, height: a.h, x0: a.x, y0: a.y });
    const edge = scene.add.rectangle(block.x + block.w / 2, block.y + block.h / 2, block.w + 2, block.h + 2)
      .setStrokeStyle(1, C.line, 1).setScrollFactor(0);
    const shade = scene.add.rectangle(block.x + block.w / 2, block.y + block.h / 2, block.w, block.h, INK, 1)
      .setAlpha(0).setScrollFactor(0);
    const traffic = scene.add.graphics().setScrollFactor(0);
    container.add([edge, shade, traffic]);
    this.block = { container, block, shade, traffic, course };
    return this.block;
  }
  /** The course card: a block and its name row. Reuses the block on screen when it is the same course. */
  showCourse(course, { dim = 0, name = null, arrows = null, dots = null } = {}) {
    const keep = this.block && this.block.course.id === course.id ? this.block.container : null;
    for (const o of this.groups.course) if (o !== keep) this.drop(o);
    this.groups.course = keep ? [keep] : [];
    if (!keep) this.drawBlock(course);
    this.scene.tweens.add({ targets: this.block.shade, alpha: dim, duration: 220 });
    const n = this.L.name, cx = n.x + n.w / 2, cy = n.y + n.h / 2 + 1;
    const label = this.text('course', cx, cy - (dots ? 4 : 0), String(name ?? course.name ?? '').toUpperCase(), { size: 16, spacing: 1 });
    const room = n.w - (arrows ? 110 : 16);
    if (label.width > room) label.setScale(room / label.width);
    if (dots) {
      const step = 12, x0 = cx - (dots.count - 1) * step / 2;
      for (let i = 0; i < dots.count; i++) this.rect('course', x0 + i * step, cy + 12, i === dots.index ? 9 : 4, 3, i === dots.index ? 0xeee3c7 : 0x4a585e, 1, null, 1, Z + 6);
    }
    if (arrows) for (const [dir, x] of [[-1, n.x + 22], [1, n.x + n.w - 22]]) {
      this.rect('course', x, cy, 32, 26, C.button, 1, C.buttonLine, 1, Z + 6);
      this.text('course', x, cy - 1, dir < 0 ? '‹' : '›', { size: 22, depth: Z + 7 });
      this.tap(this.rect('course', x, cy, 48, n.h + 4, 0x000000, 0.001, null, 1, Z + 8), () => arrows(dir));
    }
    return this.groups.course.filter((o) => o !== keep);
  }
  startTraffic(now) {
    const b = this.block.block, s = b.scale;
    const pts = [b.streets[0].a, ...b.streets.map((st) => st.b)].map((p) => ({ x: b.x + p.x * s, y: b.y + p.y * s }));
    const lengths = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
    const total = lengths.reduce((a, v) => a + v, 0);
    // Each car turns in at the street mouth, drives the block and is gone.
    // Speeds, gaps and phases differ, so the traffic never falls into step.
    const cars = Array.from({ length: 5 }, (_, i) => {
      const speed = s * (20 + Math.random() * 24);
      const period = total / speed + 0.6 + Math.random() * 2.4;
      return { speed, period, phase: (i / 5) * period + Math.random() * 0.8 };
    });
    this.cars = { pts, lengths, total, cars, t0: now, s, g: this.block.traffic };
    this.block.traffic.setAlpha(1);
  }
  paintTraffic(now) {
    const c = this.cars;
    if (!c || !c.g.active) return;
    const g = c.g, s = c.s;
    g.clear();
    const t = (now - c.t0) / 1000;
    const at = (x, y, dx, dy, f, n) => ({ x: x + dx * f * s + -dy * n * s, y: y + dy * f * s + dx * n * s });
    for (const car of c.cars) {
      const d = ((t + car.phase) % car.period) * car.speed;
      if (d > c.total) continue;
      let rest = d, i = 0;
      while (i < c.lengths.length - 1 && rest > c.lengths[i]) { rest -= c.lengths[i]; i++; }
      const a = c.pts[i], b = c.pts[i + 1], len = c.lengths[i] || 1;
      const dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
      const x = a.x + dx * rest, y = a.y + dy * rest;
      const fade = Math.max(0, Math.min(1, d / (10 * s), (c.total - d) / (10 * s)));
      // Headlight beams on the asphalt, then the car, lights and tail.
      g.fillStyle(C.lamp, 0.16 * fade).fillPoints([at(x, y, dx, dy, 2, 0.9), at(x, y, dx, dy, 11, 3.6), at(x, y, dx, dy, 11, -3.6), at(x, y, dx, dy, 2, -0.9)], true);
      g.fillStyle(C.lamp, 0.1 * fade).fillCircle(at(x, y, dx, dy, 7, 0).x, at(x, y, dx, dy, 7, 0).y, 3.2 * s);
      g.fillStyle(0x10161a, fade).fillPoints([at(x, y, dx, dy, 2.3, 1.3), at(x, y, dx, dy, 2.3, -1.3), at(x, y, dx, dy, -2.3, -1.3), at(x, y, dx, dy, -2.3, 1.3)], true);
      g.fillStyle(0x7c8a8e, fade).fillPoints([at(x, y, dx, dy, 1.1, 0.9), at(x, y, dx, dy, 1.1, -0.9), at(x, y, dx, dy, -1.2, -0.9), at(x, y, dx, dy, -1.2, 0.9)], true);
      g.fillStyle(0xfff0c2, fade);
      for (const n of [0.75, -0.75]) { const p = at(x, y, dx, dy, 2.3, n); g.fillCircle(p.x, p.y, Math.max(0.9, 0.42 * s)); }
      g.fillStyle(0xff4a3a, 0.85 * fade);
      for (const n of [0.75, -0.75]) { const p = at(x, y, dx, dy, -2.3, n); g.fillCircle(p.x, p.y, Math.max(0.7, 0.3 * s)); }
    }
  }

  // --- states ---------------------------------------------------------------------
  zoneStatus(title, { color = C.cream, dot = null } = {}) {
    this.clear('zone');
    const z = this.L.zone, cx = z.x + z.w / 2, cy = z.y + z.h * 0.42;
    this.title = this.text('zone', cx, cy, title, { size: this.W < 360 ? 21 : 24, spacing: 2, color });
    this.dot = this.clock = null;
    if (dot) {
      this.dot = this.put('zone', this.scene.add.circle(cx - 22, cy + 34, 3.5, dot, 1).setDepth(Z + 6));
      this.clock = this.text('zone', cx - 12, cy + 34, '0:00', { size: 12, color: C.muted, font: MONO, origin: [0, 0.5] });
    }
  }
  showSearching({ startedAt, onCancel, now = null } = {}) {
    now = now ?? performance.now();
    this.searchStartedAt = startedAt;
    this.emptyRival();
    this.rule.setFillStyle(C.line, 1);
    this.showCourse(this.home, { dim: 0.12 });
    this.startTraffic(now);
    this.zoneStatus(this.labels.finding, { dot: C.teal });
    this.clear('footer');
    const f = this.L.footer, w = Math.min(f.w, 260);
    this.button('footer', f.x + (f.w - w) / 2, f.y, w, f.h, this.labels.cancel, onCancel);
    this.armedAt = now + 250;
  }
  showUnavailable({ onRetry, onBack, now = null } = {}) {
    now = now ?? performance.now();
    this.cars = null;
    this.emptyRival();
    this.rule.setFillStyle(C.line, 1);
    this.showCourse(this.home, { dim: 0.5 });
    this.block.traffic.clear();
    this.zoneStatus(this.labels.none, { color: C.muted });
    this.clear('footer');
    const f = this.L.footer, gap = 10, back = Math.round((f.w - gap) * 0.36);
    this.button('footer', f.x, f.y, back, f.h, this.labels.back, onBack);
    this.button('footer', f.x + back + gap, f.y, f.w - back - gap, f.h, this.labels.retry, onRetry, { primary: true });
    this.armedAt = now + 350;
  }
  /** The reveal: the empty slot fills and the zone announces the rival. */
  showFound({ name, quality, animate = true, onDone }) {
    this.armedAt = Infinity;
    if (!this.block) this.showCourse(this.home, { dim: 0.12 });
    if (this.cars) {
      const g = this.cars.g;
      this.scene.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => { if (this.cars?.g === g) this.cars = null; } });
    }
    this.fillRival(name, { ready: true, animate });
    this.clear('zone');
    const z = this.L.zone, cx = z.x + z.w / 2, cy = z.y + z.h * 0.42;
    const over = this.text('zone', cx, cy - 26, this.labels.found, { size: 12, color: C.rivalCss, font: MONO, spacing: 3 });
    const big = this.text('zone', cx, cy + 6, name, { size: 34 });
    const q = quality ? this.text('zone', cx, cy + 36, quality, { size: 11, color: C.muted, font: MONO, spacing: 1 }) : null;
    this.groups.footer.forEach((o) => o.disableInteractive?.());
    if (animate) {
      this.fadeIn([over], 60, 200);
      this.fadeIn([big], 160, 240);
      this.scene.tweens.add({ targets: big, scaleX: { from: 1.25, to: 1 }, scaleY: { from: 1.25, to: 1 }, delay: 160, duration: 320, ease: 'Back.easeOut' });
      if (q) this.fadeIn([q], 380, 220);
      this.scene.tweens.add({ targets: this.groups.footer, alpha: 0.35, duration: 200 });
      try { this.scene.audio?.playMoment?.('rival'); } catch {}
    }
    this.later(animate ? 1250 : 0, () => onDone?.());
  }
  /**
   * The lobby. `state` is { name, offers, slot, powers, rivalReady } and the
   * handlers report every choice back to RivalsRace, which keeps it on the
   * race so a restart reopens the same lobby.
   */
  showLobby({ state, onCourse, onPowers, onReady, onLeave, onShare = null, animate = false, now = null } = {}) {
    now = now ?? performance.now();
    this.cars = null;
    if (this.block) this.block.traffic.clear();
    this.state = state;
    this.handlers = { onCourse, onPowers, onReady, onLeave, onShare };
    if (!this.groups.rival.some((o) => o.text === state.name)) this.fillRival(state.name, { ready: !!state.rivalReady });
    this.youChip.set(this.labels.notReady, false);
    this.youChip.t.setVisible(true); this.youChip.bg.setVisible(true);
    const fresh = [];
    this.retire('zone', animate ? 180 : 0);
    this.retire('footer', animate ? 160 : 0);
    fresh.push(...this.drawCourse());
    fresh.push(...this.drawPowers(state.powers));
    fresh.push(...this.drawFooter());
    if (animate) this.fadeIn(fresh, 160, 300);
    this.armedAt = now + (animate ? 560 : 300);
  }
  offer() {
    const offers = this.state.offers;
    const index = Math.max(0, offers.findIndex((o) => o.slot === this.state.slot));
    return { offer: offers[index], index, count: offers.length };
  }
  drawCourse() {
    const { offer, index, count } = this.offer();
    const offers = this.state.offers;
    return this.showCourse(offer.course, {
      name: offer.name,
      dots: count > 1 ? { count, index } : null,
      arrows: count > 1 ? (dir) => this.handlers.onCourse?.(offers[(index + dir + count) % count].slot) : null
    });
  }
  drawPowers(initial) {
    const p = this.L.powers, lb = this.labels;
    this.chosen = Array.isArray(initial) ? initial.slice(0, 2) : [];
    const made = [];
    const T = (...a) => { const t = this.text('zone', ...a); made.push(t); return t; };
    const R = (...a) => { const r = this.rect('zone', ...a); made.push(r); return r; };
    T(p.x, p.y + 6, lb.yours, { size: 10, color: C.faint, font: MONO, spacing: 2, origin: [0, 0.5] });
    // Opt in, per race, to sharing this run. Off until tapped.
    if (this.handlers?.onShare && lb.share) {
      const label = T(p.x + p.w, p.y + 6, lb.share, { size: 10, color: C.muted, font: MONO, spacing: 1, origin: [1, 0.5] });
      const box = R(p.x + p.w - label.width - 12, p.y + 6, 11, 11, 0x0e161c, 1, 0x5b6b74, 1, Z + 5);
      const tick = T(box.x, p.y + 6, '✓', { size: 11, color: C.youCss, origin: [0.5, 0.5] });
      const hit = R(p.x + p.w - (label.width + 24) / 2, p.y + 6, label.width + 36, 28, 0x000000, 0.001, null, 1, Z + 8);
      const paint = () => {
        const on = !!this.state?.share;
        tick.setVisible(on);
        box.setStrokeStyle(1, on ? C.you : 0x5b6b74, 1);
        label.setColor(on ? C.youCss : C.muted);
      };
      this.tap(hit, () => { if (!this.state) return; this.state.share = !this.state.share; paint(); this.handlers.onShare(this.state.share); });
      paint();
    }
    const gap = 8, slotH = 32, cardY = p.y + 18, cardH = Math.max(44, p.h - 18 - gap - slotH);
    const cardW = (p.w - gap * 2) / 3;
    this.cards = RUNNER_POWERS.map((power, i) => {
      const x = p.x + i * (cardW + gap) + cardW / 2, y = cardY + cardH / 2;
      const bg = R(x, y, cardW, cardH, C.card, 1, 0x3b4650, 1, Z + 4);
      const tall = cardH >= 70;
      made.push(this.put('zone', drawPowerIcon(this.scene, x, y - (tall ? 10 : 7), power.id, Math.min(30, cardH * 0.42), power.color, Z + 6)));
      T(x, y + (tall ? 18 : 13), power.name, { size: cardW < 90 ? 12 : 14, color: power.css });
      const badge = T(x + cardW / 2 - 8, cardY + 9, '', { size: 10, color: power.css, origin: [1, 0.5] });
      this.tap(bg, () => { this.chosen = choosePower(this.chosen, power.id); this.refreshPowers(); });
      return { power, bg, badge };
    });
    const slotW = (p.w - gap) / 2, slotY = p.y + p.h - slotH / 2;
    this.slots = [0, 1].map((i) => {
      const x = p.x + i * (slotW + gap) + slotW / 2;
      const bg = R(x, slotY, slotW, slotH, 0x0e161c, 1, 0x35434d, 1, Z + 4);
      T(x - slotW / 2 + 16, slotY, String(i + 1).padStart(2, '0'), { size: 11, color: '#8fa2ad', font: MONO });
      const label = T(x + 8, slotY, lb.empty, { size: 13, color: C.offText });
      this.tap(bg, () => { this.chosen = removePowerAt(this.chosen, i); this.refreshPowers(); });
      return { bg, label };
    });
    return made;
  }
  refreshPowers(report = true) {
    for (const card of this.cards || []) {
      const idx = this.chosen.map((id, i) => (id === card.power.id ? i + 1 : null)).filter(Boolean);
      card.bg.setFillStyle(idx.length ? C.cardOn : C.card, 1).setStrokeStyle(idx.length ? 2 : 1, idx.length ? card.power.color : 0x3b4650, 1);
      card.badge.setText(idx.join(' / '));
    }
    (this.slots || []).forEach((slot, i) => {
      const power = RUNNER_POWERS.find((q) => q.id === this.chosen[i]);
      slot.label.setText(power ? power.name : this.labels.empty).setColor(power ? power.css : C.offText);
      slot.bg.setStrokeStyle(1, power ? power.color : 0x35434d, 1);
    });
    const ready = this.chosen.length === 2;
    if (this.readyButton) {
      this.readyButton.bg.setFillStyle(ready ? C.ready : C.off, 1).setStrokeStyle(1, ready ? C.readyLine : C.buttonLine, 1);
      this.readyButton.text.setText(ready ? this.labels.ready : this.labels.pick).setColor(ready ? C.readyInk : '#82939e');
    }
    if (report) this.handlers?.onPowers?.(this.chosen.slice());
  }
  drawFooter() {
    const f = this.L.footer, gap = 10, leave = Math.round((f.w - gap) * 0.32), lb = this.labels;
    const a = this.button('footer', f.x, f.y, leave, f.h, lb.leave, () => this.handlers.onLeave?.());
    this.readyButton = this.button('footer', f.x + leave + gap, f.y, f.w - leave - gap, f.h, lb.ready, () => {
      if (this.chosen.length !== 2) return;
      this.youChip?.set(lb.ready, true);
      this.handlers.onReady?.(this.chosen.slice());
    }, { primary: true });
    this.refreshPowers(false);
    return [a.bg, a.text, this.readyButton.bg, this.readyButton.text];
  }
  /** The course changed: redraw the card only. */
  setCourse(slot) {
    if (!this.state || this.destroyed) return;
    this.state.slot = slot;
    this.drawCourse();
  }

  tick(now) {
    if (this.destroyed) return;
    if (this.clock && this.searchStartedAt != null) {
      const s = Math.max(0, Math.floor((now - this.searchStartedAt) / 1000));
      this.clock.setText(Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'));
    }
    if (this.dot) this.dot.setAlpha(0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now / 260)));
    if (this.rivalMark && this.rivalMark.active && this.clock) this.rivalMark.setAlpha(0.45 + 0.35 * Math.sin(now / 420));
    this.paintTraffic(now);
  }
}
