// RivalReplayPlayer — plays a portable RivalReplayBundle on top of the
// current scene: the rival's whole seven-house race, attempt by attempt.
//
// It is deliberately separate from ReplaySystem. That system puppets the
// recorded display list of THIS machine's last house; this one rebuilds each
// house from its seed (the same generator the game uses, proved deterministic
// in rivalCourses.test.mjs) and animates semantic state recorded in grid
// cells, so a race captured on a phone plays on a desktop and vice versa.
//
// Everything it creates carries _isReplayGhost so ReplaySystem never records
// it, lives above the modal layer, and is destroyed on exit. The result modal
// underneath is hidden, never destroyed: leaving the replay returns to it.
import Phaser from 'phaser';
import { T, THEMES, generateSquareMaze } from '../utils/mazeGenerator.js';
import { createSeededRNG } from '../utils/seededRandom.js';
import { makeRunnerSprite, makePlugSprite } from '../utils/spriteFactory.js';
import { PALETTE } from '../logic/palette.js';
import { RIVAL_HUD_HEIGHT, rivalTimeLabel } from '../logic/rivals.js';
import {
  raceReplayTimeline, timelineCursor, replayStateAt, replayEventsBetween, replayStashesAt, unpackFlags, replayCardLabel
} from '../logic/rivalReplay.js';

const DEPTH = 30_000;   // above GameUI modals (20k)
const HUD = 84;

/** Same theme choice as BaseGameScene for a Rivals house (no rotation there). */
function themeForSeed(seed) {
  const rng = createSeededRNG((seed ^ 0x9E3779B9) | 0);
  const idx = Math.floor(rng() * THEMES.length);
  const theme = THEMES[idx] || THEMES[0];
  const ck = ['check_11', 'check_12', 'check_13', 'check_14'];
  const floorKeySingle = theme?.floorSet === 'checker' ? ck[(rng() * ck.length) | 0] : null;
  return { theme, floorKeySingle };
}

export function playRivalReplay(scene, { bundle, record = null, opponentName = 'RIVAL', playerTimes = [], onDone } = {}) {
  if (!bundle?.segments?.length) { onDone?.(); return null; }
  const W = scene.scale.gameSize.width, H = scene.scale.gameSize.height;
  const timeline = raceReplayTimeline(bundle);
  const all = [];
  const mk = (o) => { o._isReplayGhost = true; o.setScrollFactor?.(0); all.push(o); return o; };
  const gone = () => { all.forEach(o => { try { scene.tweens.killTweensOf(o); o.destroy(); } catch {} }); all.length = 0; };

  // --- static chrome -------------------------------------------------------
  mk(scene.add.rectangle(W / 2, H / 2, W + 4, H + 4, 0x05070d, 1).setDepth(DEPTH - 1).setInteractive());
  mk(scene.add.rectangle(W / 2, HUD / 2, W, HUD, 0x0a1118, 0.98).setDepth(DEPTH + 900));
  const hudText = (x, y, value, color = '#adbdc5', size = 11, origin = [0, 0.5]) => mk(scene.add.text(x, y, value, {
    fontFamily: 'monospace', fontSize: size + 'px', color
  }).setOrigin(origin[0], origin[1]).setDepth(DEPTH + 901));
  const w = Math.min(W, 480), left = (W - w) / 2;
  hudText(left + 12, 16, '● RIVAL REPLAY', '#ff5b5b', 11);
  hudText(left + 12, 34, 'RIVAL  ·  recorded run', '#e5dec8', 11);
  // EXIT / NEXT occupy the right 70px of the strip; everything else stops short.
  const BTN_W = 70;
  const clock = hudText(left + w - BTN_W - 10, 16, '0:00.0', '#e5dec8', 12, [1, 0.5]);
  const label = hudText(left + w - BTN_W - 10, 34, '', '#dec386', 10, [1, 0.5]);
  // seven-house strip: filled as the rival's clears arrive in the replay
  const stripW = w - 24 - BTN_W;
  const seg = (stripW - 6 * 4) / 7;
  const houseBars = Array.from({ length: 7 }, (_, i) => mk(scene.add.rectangle(left + 12 + i * (seg + 4) + seg / 2, 58, seg, 8, 0x23313a).setStrokeStyle(1, 0x3a4c58).setDepth(DEPTH + 901)));
  const barW = w - 24;
  mk(scene.add.rectangle(W / 2, HUD - 8, barW, 3, 0xffffff, 0.14).setDepth(DEPTH + 901));
  const barFill = mk(scene.add.rectangle(W / 2 - barW / 2, HUD - 8, 1, 3, 0xffffff, 0.75).setOrigin(0, 0.5).setDepth(DEPTH + 901));
  const button = (x, y, bw, text, cb) => {
    const bg = mk(scene.add.rectangle(x, y, bw, 30, 0x141e28, 1).setStrokeStyle(1, 0x3a4c58).setDepth(DEPTH + 902).setInteractive({ useHandCursor: true }));
    mk(scene.add.text(x, y, text, { fontFamily: 'monospace', fontSize: '11px', color: '#c9d3d8' }).setOrigin(0.5).setDepth(DEPTH + 903));
    bg.on('pointerdown', cb);
    return bg;
  };
  const card = mk(scene.add.text(W / 2, H / 2, '', {
    fontFamily: 'monospace', fontSize: '22px', fontStyle: 'bold', color: '#f0d294', stroke: '#071018', strokeThickness: 5, align: 'center'
  }).setOrigin(0.5).setDepth(DEPTH + 950));

  // --- per-house arena ----------------------------------------------------
  let house = null;   // { objects:[], cell, pad, seg, runner, plug, bullets:[], decoy, duffels:[], carry, beacon }
  const arenaHeight = Math.max(1, H - HUD);
  const buildHouse = (segment) => {
    destroyHouse();
    const rep = segment.replay;
    if (!rep) return;
    const cols = rep.cols, rows = rep.rows;
    const cell = Math.max(6, Math.floor(Math.min(W / cols, arenaHeight / rows)));
    const pad = { x: Math.max(0, Math.floor((W - cols * cell) / 2)), y: HUD + Math.max(0, Math.floor((arenaHeight - rows * cell) / 2)) };
    const objs = [];
    const add = (o, d = 0) => { mk(o); o.setDepth(DEPTH + d); objs.push(o); return o; };
    const wx = (cx) => pad.x + cx * cell, wy = (cy) => pad.y + cy * cell;   // cell coords -> screen
    const { theme, floorKeySingle } = themeForSeed(rep.houseSeed);
    let grid = null;
    try {
      grid = generateSquareMaze(cols, rows, { rng: createSeededRNG(rep.houseSeed), role: 'runner', clusterScale: rep.scale }).grid;
    } catch { grid = null; }
    // floor
    add(scene.add.rectangle(W / 2, HUD + arenaHeight / 2, W, arenaHeight, theme.bg ?? 0x080a10, 1), 0);
    const WOOD = ['wood_96', 'wood_97', 'wood_98', 'wood_99', 'wood_100', 'wood_101'];
    const useChecker = theme.floorSet === 'checker';
    const floorG = add(scene.add.graphics(), 1);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (useChecker && theme.checkerColors) {
        floorG.fillStyle(((x + y) & 1) === 0 ? theme.checkerColors[0] : theme.checkerColors[1], 1);
        floorG.fillRect(wx(x), wy(y), cell, cell);
      } else {
        const key = useChecker ? (floorKeySingle || 'check_11') : WOOD[((x % 3) + 3 * (y % 2)) % WOOD.length];
        if (scene.textures.exists(key)) add(scene.add.image(wx(x) + cell / 2, wy(y) + cell / 2, key).setDisplaySize(cell, cell).setTint(theme.floorTint ?? 0xffffff), 1);
        else { floorG.fillStyle(theme.floorTint ?? 0x777777, 1); floorG.fillRect(wx(x), wy(y), cell, cell); }
      }
    }
    // walls: fill tile, hard shadow, ink rim on exposed sides (drawWallInk's grammar)
    if (grid) {
      const isWall = (x, y) => y >= 0 && y < rows && x >= 0 && x < cols && grid[y][x] === T.WALL;
      const grime = add(scene.add.graphics().setAlpha(0.08), 1.5); grime.fillStyle(PALETTE.ink, 1); grime.fillRect(wx(0), wy(0), cols * cell, rows * cell);
      const shadow = add(scene.add.graphics().setAlpha(0.38), 2.5); shadow.fillStyle(PALETTE.ink, 1);
      const fill = add(scene.add.graphics(), 3); fill.fillStyle(theme.wallFillTint ?? 0x11151c, 1);
      const rim = add(scene.add.graphics().setAlpha(0.95), 4.5); rim.fillStyle(PALETTE.ink, 1);
      const sx = Math.max(1, Math.round(cell * 0.10)), sy = Math.max(1, Math.round(cell * 0.14)), px = Math.max(2, Math.round(cell * 0.09));
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (!isWall(x, y)) continue;
        const lx = wx(x), ty = wy(y);
        shadow.fillRect(lx + sx, ty + sy, cell, cell);
        fill.fillRect(lx, ty, cell, cell);
        if (!isWall(x, y - 1)) rim.fillRect(lx, ty, cell, px);
        if (!isWall(x, y + 1)) rim.fillRect(lx, ty + cell - px, cell, px);
        if (!isWall(x - 1, y)) rim.fillRect(lx, ty, px, cell);
        if (!isWall(x + 1, y)) rim.fillRect(lx + cell - px, ty, px, cell);
      }
    }
    // car at the driveway
    const carAng = { N: 0, S: 180, E: 90, W: -90 }[rep.car?.side] ?? 0;
    if (scene.textures.exists('car_blue')) {
      const cx = wx(rep.car.x), cy = wy(rep.car.y);
      const opx = Math.max(2, Math.round(cell * 0.09));
      for (const [ox, oy] of [[opx, 0], [-opx, 0], [0, opx], [0, -opx]]) add(scene.add.image(cx + ox, cy + oy, 'car_blue').setDisplaySize(cell * 2.6, cell * 1.4).setTint(PALETTE.ink).setAngle(carAng), 6);
      add(scene.add.image(cx, cy, 'car_blue').setDisplaySize(cell * 2.6, cell * 1.4).setTint(theme.carTint ?? 0xffffff).setAngle(carAng), 6.1);
    }
    // the two duffels, identical until the pickup event says otherwise
    const duffels = rep.stashes.map((s) => {
      const c = scene.add.container(wx(s.x), wy(s.y));
      const dw = cell * 0.82, dh = cell * 0.52;
      const g = scene.add.graphics();
      g.fillStyle(0xC8A97E, 1); g.lineStyle(Math.max(2, Math.floor(cell * 0.09)), PALETTE.ink, 1);
      const rad = Math.max(4, Math.floor(cell * 0.14));
      g.fillRoundedRect(-dw / 2, -dh / 2, dw, dh, rad); g.strokeRoundedRect(-dw / 2, -dh / 2, dw, dh, rad);
      g.fillStyle(0x8B7355, 1); g.fillRect(-dw / 2 + 4, -Math.max(4, Math.floor(dh * 0.28)) / 2, dw - 8, Math.max(4, Math.floor(dh * 0.28)));
      const shadow = scene.add.ellipse(cell * 0.05, dh * 0.55, dw * 1.05, dh * 0.5, PALETTE.ink, 0.45);
      const halo = scene.add.circle(0, 0, cell * 0.7, 0x000000, 0).setStrokeStyle(3, 0x86efac, 0.9);
      c.add([shadow, g, halo]);
      c.halo = halo;
      return add(c, 7);
    });
    const runner = add(makeRunnerSprite(scene, wx(rep.spawn.r.x), wy(rep.spawn.r.y), cell, { gangID: null }), 10);
    const plug = add(makePlugSprite(scene, wx(rep.spawn.p.x), wy(rep.spawn.p.y), cell), 10);
    const carry = scene.add.rectangle(0, -cell * 0.25, cell * 0.45, cell * 0.30, 0xC8A97E, 1).setStrokeStyle(2, PALETTE.ink).setVisible(false);
    runner.add(carry);
    const decoy = add(scene.add.image(0, 0, 'td_runner').setAlpha(0.55).setVisible(false), 9);
    const dh = decoy.height || 43; decoy.setScale((cell * 0.9) / dh);
    house = { objects: objs, cell, pad, seg: segment, rep, runner, plug, bullets: [], decoy, duffels, carry, wx, wy, stepT: 0, lastR: null, lastP: null, hidden: false, lastEventT: -1 };
  };
  const destroyHouse = () => {
    if (!house) return;
    for (const b of house.bullets) { try { b.destroy(); } catch {} }
    house.objects.forEach(o => { try { scene.tweens.killTweensOf(o); o.destroy(); } catch {} });
    house = null;
  };

  // --- animation ----------------------------------------------------------
  const face = (who, deg, moving, dt) => {
    who.sprite.setAngle(deg); for (const o of who.outline || []) o.setAngle(deg);
    who._stepT = moving ? (who._stepT || 0) + dt : 0;
    const base = who.kind === 'plug' ? 'td_plug' : 'td_runner', stepKey = base + '_step';
    const tex = moving && Math.floor(who._stepT / 0.14) % 2 === 1 ? stepKey : base;
    if (who.sprite.texture?.key !== tex && scene.textures.exists(tex)) { who.sprite.setTexture(tex); for (const o of who.outline || []) o.setTexture(tex); }
    const bob = moving ? Math.abs(Math.sin((who._stepT / 0.14) * Math.PI)) * house.cell * 0.06 : 0;
    who.sprite.y = -bob; for (const o of who.outline || []) o.y = (o._oy ?? 0) - bob;
  };
  const puff = (x, y, color = PALETTE.dust, n = 8) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = house.cell * (0.35 + Math.random() * 0.5);
      const c = mk(scene.add.circle(x, y, house.cell * 0.08, color, 0.8).setDepth(DEPTH + 12));
      scene.tweens.add({ targets: c, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, alpha: 0, scale: 0.3, duration: 260, onComplete: () => c.destroy() });
    }
  };
  const ring = (x, y, color) => {
    const r = mk(scene.add.circle(x, y, house.cell * 0.5, color, 0).setStrokeStyle(Math.max(2, house.cell * 0.1), color, 0.95).setDepth(DEPTH + 12));
    scene.tweens.add({ targets: r, scale: 2.6, alpha: 0, duration: 320, onComplete: () => r.destroy() });
  };
  const toast = (x, y, text, color) => {
    const t = mk(scene.add.text(x, y - house.cell * 0.65, text, { fontSize: Math.max(14, Math.floor(house.cell * 0.6)) + 'px', color, fontStyle: 'bold' }).setOrigin(0.5).setDepth(DEPTH + 13));
    scene.tweens.add({ targets: t, y: t.y - house.cell * 0.55, alpha: 0, duration: 950, onComplete: () => t.destroy() });
  };
  const sfx = (key, volume = 0.7) => { try { scene.audio?.play?.(key, { volume }); } catch {} };
  const applyEvent = (e) => {
    const { rep, wx, wy } = house;
    if (e.k === 'shot') sfx('gun_fire', 0.6);
    else if (e.k === 'hit') { sfx('ouch', 0.6); }
    else if (e.k === 'death') { sfx('ouch', 0.7); puff(house.runner.x, house.runner.y, PALETTE.dust, 10); ring(house.runner.x, house.runner.y, PALETTE.runner); house.hidden = true; }
    else if (e.k === 'pickup') { sfx('pickup', 0.8); sfx('spickup', 0.7); house.carry.setVisible(true); }
    else if (e.k === 'bunk') { sfx('pickup', 0.8); sfx('bpickup', 0.7); const d = house.duffels[e.i]; if (d) { toast(d.x, d.y, 'BUNK!', '#f87171'); scene.tweens.add({ targets: d, alpha: 0, scale: 0.82, duration: 680 }); } }
    else if (e.k === 'power') { sfx(e.power || 'phase', 0.5); if (e.power) toast(house.runner.x, house.runner.y, e.power.toUpperCase(), '#9ad1ff'); }
    else if (e.k === 'extract') { ring(wx(rep.car.x), wy(rep.car.y), 0x86efac); }
  };
  const drawSegment = (local, dt) => {
    const { rep, wx, wy, cell } = house;
    const st = replayStateAt(rep, local);
    if (!st) return;
    // events since last frame (a scrub backwards replays nothing: forward only)
    if (local > house.lastEventT) { for (const e of replayEventsBetween(rep, house.lastEventT, local)) applyEvent(e); house.lastEventT = local; }
    const rf = unpackFlags(st.runner.flags);
    const rx = wx(st.runner.x), ry = wy(st.runner.y);
    const movingR = house.lastR ? Math.hypot(rx - house.lastR.x, ry - house.lastR.y) / Math.max(dt, 1e-4) > 5 : false;
    house.runner.setPosition(rx, ry).setVisible(!rf.hidden && !house.hidden).setAlpha(rf.phase ? 0.35 : 1);
    face(house.runner, rf.angle, movingR, dt);
    house.carry.setVisible(rf.carry);
    for (const o of house.runner.outline || []) o.setTint(rf.hit ? 0xff5b5b : PALETTE.ink);
    house.lastR = { x: rx, y: ry };
    const p0 = st.plugs[0];
    if (p0) {
      const pf = unpackFlags(p0.flags), px = wx(p0.x), py = wy(p0.y);
      const movingP = house.lastP ? Math.hypot(px - house.lastP.x, py - house.lastP.y) / Math.max(dt, 1e-4) > 5 : false;
      house.plug.setPosition(px, py).setVisible(!pf.hidden);
      face(house.plug, pf.angle, movingP, dt);
      house.lastP = { x: px, y: py };
    } else house.plug.setVisible(false);
    // bullets: pooled circles
    while (house.bullets.length < st.bullets.length) house.bullets.push(mk(scene.add.circle(0, 0, Math.max(2, cell * 0.13), 0xffd166, 1).setDepth(DEPTH + 10.5)));
    house.bullets.forEach((b, i) => { const s = st.bullets[i]; if (s) b.setPosition(wx(s.x), wy(s.y)).setVisible(true); else b.setVisible(false); });
    if (st.decoy) house.decoy.setPosition(wx(st.decoy.x), wy(st.decoy.y)).setVisible(true); else house.decoy.setVisible(false);
    const vis = replayStashesAt(rep, local);
    const pulse = 0.65 + 0.15 * Math.sin(((local % 1200) / 1200) * 2 * Math.PI);
    house.duffels.forEach((d, i) => { if (!vis[i].visible && !d._gone) { d._gone = true; if (!scene.tweens.isTweening(d)) d.setVisible(false); } d.halo.setRadius(cell * pulse); });
  };

  // --- playback loop ------------------------------------------------------
  let elapsed = 0, finished = false, current = null;
  const clearsSoFar = () => bundle.segments.filter((s, i) => s.outcome === 'extracted' && (current == null || i <= current.index)).length;
  const step = (_, deltaMs) => {
    if (finished) return;
    try {
      elapsed += deltaMs;
      const cur = timelineCursor(timeline, elapsed);
      if (!cur) { end(); return; }
      if (cur.done) { end(); return; }
      if (!current || current.item !== cur.item) {
        current = cur;
        const segment = bundle.segments[cur.item.index];
        if (cur.item.kind === 'card') {
          buildHouse(segment);
          card.setText(replayCardLabel(segment) + (segment.outcome !== 'extracted' ? '\n' + (segment.outcome === 'caught' ? 'caught' : segment.outcome) : '')).setVisible(true);
          label.setText('HOUSE ' + segment.house + '/7');
        } else {
          if (!house || house.seg !== segment) buildHouse(segment);
          card.setVisible(false);
        }
      }
      const segment = bundle.segments[cur.item.index];
      const local = cur.item.kind === 'segment' ? Math.min(cur.local, segment.replay?.durationMs ?? 0) : 0;
      if (cur.item.kind === 'segment' && house) drawSegment(local, deltaMs / 1000);
      // Race clock: the recording's race time, not playback time.
      clock.setText(rivalTimeLabel((segment.startedMs || 0) + local));
      const done = bundle.segments.filter((s, i) => s.outcome === 'extracted' && (i < cur.item.index || (i === cur.item.index && cur.item.kind === 'segment' && local >= (s.replay?.durationMs ?? 0)))).length;
      houseBars.forEach((b, j) => b.setFillStyle(j < done ? 0xc6ac70 : 0x23313a));
      barFill.width = Math.max(1, barW * Math.min(elapsed / timeline.total, 1));
    } catch (e) {
      if (++stepErrors > 30) { console.warn('[RivalReplay] playback aborted:', e); end(); }
    }
  };
  let stepErrors = 0;
  const end = () => {
    if (finished) return;
    finished = true;
    scene.events.off('update', step);
    destroyHouse();
    gone();
    onDone?.();
  };
  button(left + w - 4 - BTN_W / 2, 20, BTN_W - 8, '✕ EXIT', end);
  button(left + w - 4 - BTN_W / 2, 54, BTN_W - 8, 'NEXT ▶', () => {
    const cur = timelineCursor(timeline, elapsed);
    const next = timeline.items.find(it => it.kind === 'card' && it.start > (cur?.item.start ?? -1));
    elapsed = next ? next.start : timeline.total;
  });
  scene.events.on('update', step);
  return { end };
}
