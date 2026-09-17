import { drawRivalReplayArena } from './RivalReplayArena.js';
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
import { rivalTimeLabel, rivalArenaLayout, rivalHudLayout, rivalFloorClock } from '../logic/rivals.js';
import {
  raceReplayTimeline, timelineCursor, replayStateAt, replayEventsBetween, replayStashesAt, unpackFlags, replayCardLabel
} from '../logic/rivalReplay.js';

const DEPTH = 30_000;   // above GameUI modals (20k)
const HUD = 0; // Chrome overlays the perimeter, exactly like the live race.

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
  const hudText=(x,y,value,color='#adbdc5',size=10,origin=[.5,.5])=>mk(scene.add.text(x,y,value,{
    fontFamily:'monospace',fontSize:size+'px',color,stroke:'#071018',strokeThickness:2
  }).setOrigin(...origin).setDepth(DEPTH+901));
  const rail=rivalHudLayout(W,H);
  const clock=hudText(W/2,34,'0:00.0','#bbc4b9',12);
  const label=hudText(W/2,H-57,'RIVAL REPLAY','#dec386',10);
  const rivalLabel=hudText(W-7,rail.startY-20,'RIVAL 0/7','#dec386',9,[1,.5]);
  const houseBars=rail.segmentYs.map(y=>mk(scene.add.rectangle(rail.rightX,y,rail.railW,rail.segmentH,0x23313a)
    .setStrokeStyle(1,0x3a4c58).setDepth(DEPTH+901)));
  const playerLabel=hudText(7,rail.startY-20,'YOU 0/7','#9bcae5',9,[0,.5]);
  const playerBars=rail.segmentYs.map(y=>mk(scene.add.rectangle(rail.leftX,y,rail.railW,rail.segmentH,0x23313a)
    .setStrokeStyle(1,0x3a4c58).setDepth(DEPTH+901)));
  const barW=Math.min(120,W-24);
  const barFill=mk(scene.add.rectangle(W/2-barW/2,H-7,1,2,0xffffff,.55).setOrigin(0,.5).setDepth(DEPTH+901));
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
    const {cell,pad}=rivalArenaLayout(W,H,cols,rows);
    const objs = [];
    const add = (o, d = 0) => { mk(o); o.setDepth(DEPTH + d); objs.push(o); return o; };
    const wx = (cx) => pad.x + cx * cell, wy = (cy) => pad.y + cy * cell;   // cell coords -> screen
    const { theme, floorKeySingle } = themeForSeed(rep.houseSeed);
    let grid = null, egress=null;
    try {
      const arena=generateSquareMaze(cols, rows, { rng: createSeededRNG(rep.houseSeed), role: 'runner', clusterScale: rep.scale });
      grid=arena.grid;egress=arena.egress;
    } catch { grid = null; }
    if(!grid)throw Error('Replay course regeneration failed');
    drawRivalReplayArena(scene,{cell,pad,cols,rows,grid,seed:rep.houseSeed,theme,floorKeySingle,egress,depth:DEPTH,
      register:o=>{mk(o);objs.push(o);}});
    const spot=rivalFloorClock(grid);
    if(spot){
      clock.setPosition(wx(spot.x),wy(spot.y)).setDepth(DEPTH+1.72).setAlpha(.65);
      clock.setFontSize(Math.max(8,Math.floor(cell*.65)));
      add(scene.add.rectangle(wx(spot.x),wy(spot.y),spot.width*cell,spot.height*cell,0x080e13,.22),1.7);
    }
    // walls: fill tile, hard shadow, ink rim on exposed sides (drawWallInk's grammar)
    if (grid) {
      const isWall = (x, y) => y >= 0 && y < rows && x >= 0 && x < cols && grid[y][x] === T.WALL;
      const grime = add(scene.add.graphics().setAlpha(0.08), 1.5); grime.fillStyle(PALETTE.ink, 1); grime.fillRect(wx(0), wy(0), cols * cell, rows * cell);
      const shadow = add(scene.add.graphics().setAlpha(0.38), 2.5); shadow.fillStyle(PALETTE.ink, 1);
      
      const rim = add(scene.add.graphics().setAlpha(0.95), 4.5); rim.fillStyle(PALETTE.ink, 1);
      const sx = Math.max(1, Math.round(cell * 0.10)), sy = Math.max(1, Math.round(cell * 0.14)), px = Math.max(2, Math.round(cell * 0.09));
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (!isWall(x, y)) continue;
        const lx = wx(x), ty = wy(y);
        shadow.fillRect(lx + sx, ty + sy, cell, cell);
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
    house = { objects: objs, cell, pad, seg: segment, rep, runner, plug, extraPlugs:[], bullets: [], decoy, duffels, carry, wx, wy, stepT: 0, lastR: null, lastP: null, hidden: false, lastEventT: -1 };
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
    // The seven-house finale can have a second defender; it is in the frames,
    // not the primary-spawn metadata, and must not disappear in playback.
    const extra=st.plugs.slice(1);
    while(house.extraPlugs.length<extra.length){
      const o=mk(makePlugSprite(scene,0,0,cell).setDepth(DEPTH+10));
      house.extraPlugs.push(o);house.objects.push(o);
    }
    house.extraPlugs.forEach((o,i)=>{
      const p=extra[i];if(!p){o.setVisible(false);return;}
      const flags=unpackFlags(p.flags),x=wx(p.x),y=wy(p.y);
      const moving=o._lastReplayPosition?Math.hypot(x-o._lastReplayPosition.x,y-o._lastReplayPosition.y)/Math.max(dt,1e-4)>5:false;
      o.setPosition(x,y).setVisible(!flags.hidden);face(o,flags.angle,moving,dt);
      o._lastReplayPosition={x,y};
    });
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
      rivalLabel.setText('RIVAL '+done+'/7');
      const playerDone=playerTimes.filter(t=>t<=(segment.startedMs||0)+local).length;
      playerLabel.setText('YOU '+playerDone+'/7');
      playerBars.forEach((b,j)=>b.setFillStyle(j<playerDone?0x86bad5:0x23313a));
      barFill.width = Math.max(1, barW * Math.min(elapsed / timeline.total, 1));
    } catch (e) {
      if (++stepErrors > 30) { console.warn('[RivalReplay] playback aborted:', e); end(); }
    }
  };
  let stepErrors = 0;
  const end = ({notify=true}={}) => {
    if (finished) return;
    finished = true;
    scene.events.off('update', step);
    scene.events.off('shutdown',shutdown);
    destroyHouse();
    gone();
    if(notify)onDone?.();
  };
  const shutdown=()=>end({notify:false});
  scene.events.once('shutdown',shutdown);
  button(W-40,H-57,68,'✕ EXIT',end);
  button(W-40,H-23,68,'NEXT ▶', () => {
    const cur = timelineCursor(timeline, elapsed);
    const next = timeline.items.find(it => it.kind === 'card' && it.start > (cur?.item.start ?? -1));
    elapsed = next ? next.start : timeline.total;
  });
  scene.events.on('update', step);
  return { end };
}
