// Tutorial scene built on PvP movement and controls
import Phaser from 'phaser';
import AudioManager from '../audio/AudioManager.js';

const STAGE_SEEDS = {
  S1_MOVEMENT: 0x71C1A5E1,
  S2_STASHES: 0xA3B17C22,
  S3_POWERUPS: 0xF00DFACE,  // Changed seed for better extraction accessibility
  S4_RUNNER_PVP: 0xDEADBEEF,
  S5_PLUG_PVP: 0xCAFEBABE
};

const T = { FLOOR: 0, WALL: 1 };

function makeRng(seed){
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
    return ((r ^ r >>> 14) >>> 0) / 0x100000000;
  };
}

function manhattan(a, b){
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function randomCardinal(){
  const dirs = [ { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 } ];
  return dirs[(Math.random() * dirs.length) | 0];
}

function asPoint(p){ return Array.isArray(p) ? { x: p[0], y: p[1] } : { x: p.x, y: p.y };
}

function corridorAssist(scene, sprite, dir, dt){
  const cell = scene.toCell(sprite.x, sprite.y);
  const centerX = scene.toWorldX(cell.x);
  const centerY = scene.toWorldY(cell.y);

  // Check how tight the space is (walls on sides)
  let wallsOnSides = 0;
  if (dir.x !== 0) {
    // Moving horizontally - check for walls above and below
    const northWall = scene.isWallAtWorld(sprite.x, sprite.y - scene.cell);
    const southWall = scene.isWallAtWorld(sprite.x, sprite.y + scene.cell);
    if (northWall) wallsOnSides++;
    if (southWall) wallsOnSides++;
  } else if (dir.y !== 0) {
    // Moving vertically - check for walls left and right
    const westWall = scene.isWallAtWorld(sprite.x - scene.cell, sprite.y);
    const eastWall = scene.isWallAtWorld(sprite.x + scene.cell, sprite.y);
    if (westWall) wallsOnSides++;
    if (eastWall) wallsOnSides++;
  }

  // Determine assist strength based on how tight the corridor is
  let baseStrength = 0.2; // Open areas
  if (wallsOnSides === 1) baseStrength = 0.4;  // One wall nearby
  if (wallsOnSides === 2) baseStrength = 0.7;  // True 1x1 corridor

  const bias = scene.cell * baseStrength;

  if (dir.x !== 0) {
    const dy = centerY - sprite.y;
    sprite.y += Math.sign(dy) * Math.min(Math.abs(dy), bias * dt);
  } else if (dir.y !== 0) {
    const dx = centerX - sprite.x;
    sprite.x += Math.sign(dx) * Math.min(Math.abs(dx), bias * dt);
  }
}

function generateArenaMap(cols, rows, seed){
  const rnd = makeRng(seed);
  const grid = Array.from({ length: rows }, () => Array(cols).fill(T.FLOOR));
  for (let x = 0; x < cols; x++){ grid[0][x] = T.WALL; grid[rows - 1][x] = T.WALL; }
  for (let y = 0; y < rows; y++){ grid[y][0] = T.WALL; grid[y][cols - 1] = T.WALL; }
  const SHAPES = [
    [[0,0]],
    [[0,0],[1,0]],
    [[0,0],[1,0],[2,0],[3,0]],
    [[0,0],[0,1],[1,0],[1,1]],
    [[0,0],[1,0],[0,1],[0,2]],
    [[0,0],[1,0],[2,0],[1,1]],
    [[0,0],[1,0],[1,1],[2,1]],
    [[0,0],[2,0],[1,0],[1,-1],[1,1]],
    [[0,0],[0,1],[0,2],[1,2]],
    [[0,0],[1,0],[2,0],[2,1]]
  ];
  const rot = (cells, r) => {
    let pts = cells.map(asPoint);
    for (let i = 0; i < r; i++) pts = pts.map(p => ({ x: -p.y, y: p.x }));
    const mx = Math.min(...pts.map(p => p.x));
    const my = Math.min(...pts.map(p => p.y));
    return pts.map(p => ({ x: p.x - mx, y: p.y - my }));
  };
  const flip = (cells, f) => {
    const pts = cells.map(asPoint);
    if (!f) return pts;
    const mx = Math.max(...pts.map(p => p.x));
    return pts.map(p => ({ x: mx - p.x, y: p.y }));
  };
  const occ = Array.from({ length: rows }, () => Array(cols).fill(0));
  const PAD_MIN = 0;
  const PAD_MAX = 2;
  const GAP = 1;
  const canPlace = (ax, ay, cells) => {
    const pad = (rnd() < 0.4) ? PAD_MIN : PAD_MAX;
    for (const p of cells){
      const x = ax + p.x;
      const y = ay + p.y;
      if (x <= 0 || y <= 0 || x >= cols - 1 || y >= rows - 1) return false;
      if (x < pad || y < pad || x > cols - 1 - pad || y > rows - 1 - pad) return false;
      if (grid[y][x] === T.WALL || occ[y][x]) return false;
      for (let yy = y - GAP; yy <= y + GAP; yy++)
        for (let xx = x - GAP; xx <= x + GAP; xx++)
          if (yy >= 0 && yy < rows && xx >= 0 && xx < cols && occ[yy][xx]) return false;
    }
    return true;
  };
  const stamp = (ax, ay, cells) => {
    for (const p of cells){
      const x = ax + p.x;
      const y = ay + p.y;
      grid[y][x] = T.WALL;
      occ[y][x] = 1;
    }
  };
  const target = Math.floor((cols * rows) / 36);
  let placed = 0;
  let tries = 0;
  while (placed < target && tries < target * 40){
    tries++;
    const bx = 1 + (rnd() * (cols - 2) | 0);
    const by = 1 + (rnd() * (rows - 2) | 0);
    let shape = SHAPES[(rnd() * SHAPES.length) | 0];
    shape = rot(shape, (rnd() * 4) | 0);
    shape = flip(shape, rnd() < 0.5);
    const ox = (rnd() * 3 | 0) - 1;
    const oy = (rnd() * 3 | 0) - 1;
    if (canPlace(bx + ox, by + oy, shape)){
      stamp(bx + ox, by + oy, shape);
      placed++;
    }
  }
  const floors = [];
  for (let y = 1; y < rows - 1; y++)
    for (let x = 1; x < cols - 1; x++)
      if (grid[y][x] === T.FLOOR) floors.push({ x, y });
  const pickFar = (avoid, minD) => {
    for (let k = 0; k < 400; k++){
      const c = floors[(rnd() * floors.length) | 0];
      if (avoid.every(pt => manhattan(c, pt) >= minD)) return c;
    }
    let best = floors[0];
    let bestScore = -1;
    for (const c of floors){
      const d = Math.min(...avoid.map(pt => manhattan(c, pt)));
      if (d > bestScore){
        bestScore = d;
        best = c;
      }
    }
    return best;
  };
  const POCKET_R = 2;
  const safe = c => c.x > POCKET_R && c.y > POCKET_R && c.x < cols - 1 - POCKET_R && c.y < rows - 1 - POCKET_R;
  function addPocket(cx, cy){
    for (let dy = -(POCKET_R - 1); dy <= POCKET_R - 1; dy++)
      for (let dx = -(POCKET_R - 1); dx <= POCKET_R - 1; dx++){
        const x = cx + dx;
        const y = cy + dy;
        if (y >= 0 && y < rows && x >= 0 && x < cols) grid[y][x] = T.FLOOR;
      }
    for (let dy = -POCKET_R; dy <= POCKET_R; dy++)
      for (let dx = -POCKET_R; dx <= POCKET_R; dx++){
        const x = cx + dx;
        const y = cy + dy;
        if (x <= 0 || y <= 0 || x >= cols - 1 || y >= rows - 1) continue;
        if (Math.max(Math.abs(dx), Math.abs(dy)) === POCKET_R) grid[y][x] = T.WALL;
      }
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    const portals = (rnd() < 0.7)
      ? [[0,1],[2,3]][(rnd()*2)|0]
      : [[0,2],[0,3],[1,2],[1,3]][(rnd()*4)|0];
    for (const index of portals){
      const [dx, dy] = dirs[index];
      const x = cx + dx * POCKET_R;
      const y = cy + dy * POCKET_R;
      grid[y][x] = T.FLOOR;
      const ox = cx + dx * (POCKET_R + 1);
      const oy = cy + dy * (POCKET_R + 1);
      if (ox > 0 && ox < cols - 1 && oy > 0 && oy < rows - 1)
        grid[oy][ox] = T.FLOOR;
    }
    grid[cy][cx] = T.FLOOR;
  }
  const runner = pickFar([], Math.floor((cols + rows) / 6));
  const plug = pickFar([runner], Math.floor((cols + rows) / 4));
  const stashCandidates = floors.filter(c => safe(c) && (manhattan(c, runner) + 3 < manhattan(c, plug)));
  const extractCandidates = floors.filter(c => safe(c) && (manhattan(c, plug) + 3 < manhattan(c, runner)));
  const pickFrom = (arr, avoid, minD) => {
    const filtered = arr.length ? arr.filter(c => avoid.every(pt => manhattan(c, pt) >= minD)) : [];
    if (filtered.length) return filtered[(Math.random() * filtered.length) | 0];
    return pickFar(avoid, minD);
  };
  let stash = pickFrom(stashCandidates, [runner, plug], Math.floor((cols + rows) / 10));
  let extract = pickFrom(extractCandidates, [runner, plug, stash], Math.floor((cols + rows) / 9));
  if (!safe(stash)){
    const s = floors.filter(safe);
    if (s.length) stash = s[(rnd() * s.length) | 0];
  }
  if (!safe(extract)){
    const s = floors.filter(safe);
    if (s.length) extract = s[(rnd() * s.length) | 0];
  }
  addPocket(stash.x, stash.y);
  addPocket(extract.x, extract.y);
  grid[runner.y][runner.x] = T.FLOOR;
  grid[plug.y][plug.x] = T.FLOOR;
  grid[stash.y][stash.x] = T.FLOOR;
  grid[extract.y][extract.x] = T.FLOOR;
  const sides = ['N','E','S','W'];
  const side = sides[(rnd() * 4) | 0];
  const gapW = Math.max(3, Math.floor(cols / 10));
  let entry = { x: 1, y: 1 };
  if (side === 'N'){
    const mid = 1 + (rnd() * (cols - 2) | 0);
    const x0 = Math.max(1, mid - Math.floor(gapW / 2));
    for (let x = x0; x < x0 + gapW && x < cols - 1; x++){
      grid[0][x] = T.FLOOR;
      if (rows > 1) grid[1][x] = T.FLOOR;
    }
    entry = { x: Math.min(cols - 2, Math.max(1, mid)), y: 1 };
  } else if (side === 'S'){
    const mid = 1 + (rnd() * (cols - 2) | 0);
    const x0 = Math.max(1, mid - Math.floor(gapW / 2));
    for (let x = x0; x < x0 + gapW && x < cols - 1; x++){
      grid[rows - 1][x] = T.FLOOR;
      if (rows > 1) grid[rows - 2][x] = T.FLOOR;
    }
    entry = { x: Math.min(cols - 2, Math.max(1, mid)), y: rows - 2 };
  } else if (side === 'E'){
    const mid = 1 + (rnd() * (rows - 2) | 0);
    const y0 = Math.max(1, mid - Math.floor(gapW / 2));
    for (let y = y0; y < y0 + gapW && y < rows - 1; y++){
      grid[y][cols - 1] = T.FLOOR;
      if (cols > 1) grid[y][cols - 2] = T.FLOOR;
    }
    entry = { x: cols - 2, y: Math.min(rows - 2, Math.max(1, mid)) };
  } else {
    const mid = 1 + (rnd() * (rows - 2) | 0);
    const y0 = Math.max(1, mid - Math.floor(gapW / 2));
    for (let y = y0; y < y0 + gapW && y < rows - 1; y++){
      grid[y][0] = T.FLOOR;
      if (cols > 1) grid[y][1] = T.FLOOR;
    }
    entry = { x: 1, y: Math.min(rows - 2, Math.max(1, mid)) };
  }
  return { grid, spawns: { runner, plug }, objectives: { stash, extract }, egress: { side, entry, width: gapW } };
}

function makeDuffel(scene, x, y, w, h){
  const cont = scene.add.container(x, y).setDepth(12);
  const sensor = scene.add.rectangle(0, 0, w, h, 0x000000, 0.0001);
  const g = scene.add.graphics();
  const tan = 0xC8A97E;
  const tanDark = 0xA9885F;
  const tape = 0x8B7355;
  const gloss = 0xE7D3B5;
  const rad = Math.max(4, Math.floor(scene.cell * 0.14));
  g.fillStyle(tan, 1).lineStyle(Math.max(2, Math.floor(scene.cell * 0.05)), tanDark, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, rad);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, rad);
  g.fillStyle(tape, 1).fillRect(-w / 2 + 4, -h * 0.28, w - 8, h * 0.56);
  g.fillStyle(gloss, 0.12).fillRoundedRect(-w / 2 + 6, -h / 2 + 6, w * 0.35, h * 0.3, rad * 0.6);
  cont.add([sensor, g]);
  return cont;
}

function makeCarLights(scene, cx, cy, side){
  const cont = scene.add.container(cx, cy).setDepth(1210);

  // Create multiple layers of light beams for depth
  const outerBeam = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const midBeam = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const innerBeam = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);

  // Colors for layered effect
  const outerColor = 0x60a5fa;  // Bright blue
  const midColor = 0x93c5fd;    // Light blue
  const innerColor = 0xdbeafe;  // Very light blue

  if (side === 'N' || side === 'S'){
    const s = (side === 'N') ? -1 : 1;
    const reach = scene.cell * 1.4;
    const width = scene.cell * 0.5;

    // Outer beam (widest, faintest)
    outerBeam.fillStyle(outerColor, 0.15);
    outerBeam.fillTriangle(-width, 0, width, 0, 0, s * reach);

    // Mid beam
    midBeam.fillStyle(midColor, 0.25);
    midBeam.fillTriangle(-width * 0.7, 0, width * 0.7, 0, 0, s * reach * 0.8);

    // Inner beam (brightest, narrowest)
    innerBeam.fillStyle(innerColor, 0.35);
    innerBeam.fillTriangle(-width * 0.4, 0, width * 0.4, 0, 0, s * reach * 0.6);
  } else {
    const s = (side === 'W') ? -1 : 1;
    const reach = scene.cell * 1.6;
    const width = scene.cell * 0.5;

    // Outer beam (widest, faintest)
    outerBeam.fillStyle(outerColor, 0.15);
    outerBeam.fillTriangle(0, -width, 0, width, s * reach, 0);

    // Mid beam
    midBeam.fillStyle(midColor, 0.25);
    midBeam.fillTriangle(0, -width * 0.7, 0, width * 0.7, s * reach * 0.8, 0);

    // Inner beam (brightest, narrowest)
    innerBeam.fillStyle(innerColor, 0.35);
    innerBeam.fillTriangle(0, -width * 0.4, 0, width * 0.4, s * reach * 0.6, 0);
  }

  cont.add([outerBeam, midBeam, innerBeam]);

  // Store beam references for animation control
  cont.beams = [outerBeam, midBeam, innerBeam];

  // Set beams to invisible initially (will be shown when lights turn on)
  outerBeam.setAlpha(0);
  midBeam.setAlpha(0);
  innerBeam.setAlpha(0);

  return cont;
}

const THEMES = [
  {
    key: 'loft_concrete',
    bg: 0x0b0f16,
    floorTint: 0xb8bec9,
    wallFillTint: 0x232a33,
    wallEdgeTint: 0x8a8f98,
    floorSet: 'checker',
    checkerColors: [0xE5E7EB, 0xF3F4F6]
  },
  {
    key: 'sand_wood',
    bg: 0x0b0f12,
    floorTint: 0xE9D5B4,
    wallFillTint: 0x1f201e,
    wallEdgeTint: 0xC8A97E,
    floorSet: 'wood'
  },
  {
    key: 'studio_white',
    bg: 0x0b0f16,
    floorTint: 0xF3F4F6,
    wallFillTint: 0x1f2632,
    wallEdgeTint: 0x9AA6B2,
    floorSet: 'checker',
    checkerColors: [0xF9FAFB, 0xE5E7EB]
  }
];

export class TutorialMiniScene extends Phaser.Scene {
  constructor(){
    super('TUTORIAL_MINI');
  }
  preload(){
    this.load.image('wall_fill', '/tiles/kenney/walls/fill.png');
    this.load.image('wall_edge', '/tiles/kenney/walls/edge.png');
    ['wood_96','wood_97','wood_98','wood_99','wood_100','wood_101'].forEach(k => this.load.image(k, `/tiles/kenney/${k}.png`));
    ['check_11','check_12','check_13','check_14'].forEach(k => this.load.image(k, `/tiles/checker/${k}.png`));
    this.load.image('td_runner', '/sprites/td/runner.png');
    this.load.image('td_runner_step', '/sprites/td/runner_step.png');
    this.load.image('td_plug', '/sprites/td/plug.png');
    this.load.image('td_plug_step', '/sprites/td/plug_step.png');
    this.load.image('car_blue', '/cars/blue.png');

    // Audio
    try {
      // Background music
      this.load.audio('learn_beat',   ['/audio/learn_beat.ogg',   '/audio/learn_beat.mp3']);

      // Sound effects
      this.load.audio('gun_fire',     ['/audio/gun_fire.ogg',     '/audio/gun_fire.mp3']);
      this.load.audio('ouch',         ['/audio/ouch.ogg',         '/audio/ouch.mp3']);
      this.load.audio('pickup',       ['/audio/pickup.ogg',       '/audio/pickup.mp3']);
      this.load.audio('spickup',      ['/audio/spickup.ogg',      '/audio/spickup.mp3']);
      this.load.audio('bpickup',      ['/audio/bpickup.ogg',      '/audio/bpickup.mp3']);
      this.load.audio('engine_start', ['/audio/engine_start.ogg', '/audio/engine_start.mp3']);
      this.load.audio('engine_idle',  ['/audio/engine_idle.ogg',  '/audio/engine_idle.mp3']);

      // Power-up sounds
      this.load.audio('dash',         ['/audio/dash.ogg',         '/audio/dash.mp3']);
      this.load.audio('decoy',        ['/audio/decoy.ogg',        '/audio/decoy.mp3']);
      this.load.audio('phase',        ['/audio/phase.ogg',        '/audio/phase.mp3']);
    } catch {}
  }
  init(data){
    // Match PvpScene: calculate cols/rows dynamically from screen size
    this.cell = 24;
    this.cols = Math.floor(this.scale.width / this.cell);
    this.rows = Math.floor(Math.max(1, this.scale.height) / this.cell);
    this.pad = { x: 0, y: 0 };
    // Start at stage 1 by default
    this.stageIdx = 1;
    this.tipObj = null;
    this.tipTween = null;
    this.pointer = null;
    this._activePointerId = null;
    this._dashUntil = 0;
    this._phaseUntil = 0;
    this._phaseActive = false;
    this.autoDrift = true;
    this._runnerInputDir = { x: 1, y: 0 };

    // Weapon stats for stage 5 (matching PvpScene)
    this.weaponStats = {
      pistol:   { clip: 12, speed: 320, color: 0xff4444, spreadAngles: [0] },
      shotgun:  { clip: 8,  speed: 280, color: 0xff4444, spreadAngles: [-12, 0, 12] },
      rifle:    { clip: 10, speed: 360, color: 0xff4444, spreadAngles: [0] }
    };
  }

  create(){
    // Reset modal pause state on scene create/restart
    this.pausedForModal = false;
    this.userTookOver = false;

    // Initialize audio (music already started in MenuScene)
    try {
      this.audio = AudioManager.get(this);
      this.audio.ensureUnlocked(this);
    } catch {}

    this.ensureResizeListener();
    this.startStage(this.stageIdx);
  }
  ensureResizeListener(){
    if (this._onResizeCb) return;
    this._onResizeCb = () => {
      const next = this.stageIdx || 1;
      this.startStage(next);
    };
    this.scale.on('resize', this._onResizeCb);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this._onResizeCb){
        this.scale.off('resize', this._onResizeCb);
        this._onResizeCb = null;
      }
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      if (this._onResizeCb){
        this.scale.off('resize', this._onResizeCb);
        this._onResizeCb = null;
      }
    });
  }
  computeLayout(){
    const usableW = Math.max(1, this.scale.gameSize.width);
    const usableH = Math.max(1, this.scale.gameSize.height);
    const MIN_CELL = 14;
    const cellFit = Math.floor(Math.min(usableW / this.cols, usableH / this.rows));
    const cell = Math.max(MIN_CELL, cellFit);
    this.cell = cell;
    this.worldWidth = this.cols * cell;
    this.worldHeight = this.rows * cell;
    // Match PvpScene: no padding, fill screen
    this.pad = { x: 0, y: 0 };
    // Match PvP runner size: give the runner a larger hitbox so it hugs corridor
    // walls and centers properly. Use 0.44 of a tile side, similar to the PvP scene.
    this.hitboxRadius = this.cell * 0.44;
  }

  startStage(idx){
    this.tweens.killAll();
    this.time.removeAllEvents();
    if (this.tipTween){
      this.tweens.remove(this.tipTween);
      this.tipTween = null;
    }
    if (this.tipObj){
      this.tipObj.destroy();
      this.tipObj = null;
    }
    this.children.removeAll();
    this.stageIdx = idx;

    // Stop any running engine from previous stage
    try { this.audio?.stopEngineLoop(); } catch {}

    // Reset extraction state so the car depart animation can run in each stage
    this._carDeparting = false;

    // Recompute layout using current cols/rows (set in init)
    this.computeLayout();

    this.stash = null;
    this.bunkStash = null;
    this._stashHaloG = null;
    this.hasPackage = false;

    // Reset per-stage runner power selections.  In the power-up scene (stage 3)
    // the player will choose two abilities; until then nothing is selected.
    this.runnerPowersSelected = null;
    this.runnerPowersConsumed = null;

    // Clean up decoy from previous stages
    if (this.decoySprite) {
      this.decoySprite.destroy();
      this.decoySprite = null;
    }
    this.decoyExpiresAt = 0;
    this.decoyVelocity = { x: 0, y: 0 };

    // Clean up AI sprites from previous stages
    if (this.aiPlug){
      this.aiPlug.destroy();
      this.aiPlug = null;
    }
    if (this.aiRunner){
      this.aiRunner.destroy();
      this.aiRunner = null;
    }

    // Clean up bullet arrays
    if (this.bulletsPlug){
      this.bulletsPlug.forEach(b => b.destroy?.());
      this.bulletsPlug = null;
    }
    if (this.bulletsPlayer){
      this.bulletsPlayer.forEach(b => b.destroy?.());
      this.bulletsPlayer = null;
    }

    // Initialize bullet arrays for stages 4 & 5
    if (idx === 4){
      this.bulletsPlug = [];
      this._aiPlugTick = 0;
      this._playerHits = 0; // track how many times player was hit
      this._playerHP = 2; // player has 2 HP in stage 4
    } else if (idx === 5){
      this.bulletsPlayer = [];
      this._playerShootCooldown = 0;
      this._mobileShootRequested = false;
    }

    // Clean up HP display from previous stages
    if (this._hpDisplay){
      this._hpDisplay.destroy();
      this._hpDisplay = null;
    }

    const seeds = {
      1: STAGE_SEEDS.S1_MOVEMENT,
      2: STAGE_SEEDS.S2_STASHES,
      3: STAGE_SEEDS.S3_POWERUPS,
      4: STAGE_SEEDS.S4_RUNNER_PVP,
      5: STAGE_SEEDS.S5_PLUG_PVP
    };
    const seed = seeds[idx] || STAGE_SEEDS.S1_MOVEMENT;

    const arena = generateArenaMap(this.cols, this.rows, seed);
    this.grid = arena.grid;
    this.egress = arena.egress;
    this.spawnRunnerCell = arena.spawns.runner;
    this.plugSpawnCell = arena.spawns.plug; // Save plug spawn for stage 4
    this.stashCell = arena.objectives.stash;
    this.extractCell = arena.objectives.extract;

    // Adjust runner spawn location depending on stage requirements
    if (idx === 1){
      // For the first tutorial scene, spawn the player near the top-left corner so
      // they have to traverse the map to reach the car.  Find the first walkable
      // floor cell scanning from (1,1) to the middle of the map.
      outer: for (let y = 1; y < this.rows - 1; y++){
        for (let x = 1; x < this.cols - 1; x++){
          if (this.isWalkableCell?.(x, y)){
            this.spawnRunnerCell = { x, y };
            break outer;
          }
        }
      }
    }
    // In previous versions we sealed the stash and extract pockets in stage 3 to force
    // players to use Phase to reach them.  The user requested that the power-up scene
    // spawn stashes normally without closing off any pockets.  Therefore we no longer
    // modify the map for stage 3 here.  Stashes and extract pads spawn as in the
    // stash scene, and players can reach them through the generated map naturally.
    if (idx === 3) {
      /* no-op: do not seal pockets */
    }

    const themeRng = makeRng(((seed ^ 0x9E3779B9) >>> 0));
    this.theme = THEMES[(themeRng() * THEMES.length) | 0];
    this.floorKeySingle = (this.theme.floorSet === 'checker')
      ? ['check_11','check_12','check_13','check_14'][(themeRng()*4)|0]
      : null;

    this.drawArena();

    this.runner = this.add.container(this.toWorldX(this.spawnRunnerCell.x), this.toWorldY(this.spawnRunnerCell.y)).setDepth(8);
    const sh = this.add.ellipse(0, this.cell * 0.48, this.cell * 0.90, this.cell * 0.30, 0x000000, 0.34).setScale(1, 0.8);
    const rs = this.add.sprite(0, 0, 'td_runner').setOrigin(0.5);
    rs.setScale((this.cell / 128) * 3.0);
    this.runner.add([sh, rs]);
    this.runner.sprite = rs;
    this.runner.hbRadius = this.hitboxRadius;

    this._dashUntil = 0;
    this._phaseUntil = 0;
    this._phaseActive = false;

    this.setupInput();
    this.configureCamera();
    this.placeObjectives(idx);
    this.resetState();
    this.showStageModal(idx);
  }

  drawArena(){
    const { cell, cols, rows } = this;
    const width = Math.max(1, this.scale.gameSize.width);
    const height = Math.max(1, this.scale.gameSize.height);
    const padX = this.pad.x;
    const padY = this.pad.y;
    const theme = this.theme ?? {};
    this.cameras.main.setBackgroundColor(theme.bg ?? 0x080a10);

    const bg = this.add.rectangle(width / 2, height / 2, width, height, theme.bg ?? 0x080a10, 1);
    bg.setDepth(0).setScrollFactor(0);

    const wood = ['wood_96','wood_97','wood_98','wood_99','wood_100','wood_101'];
    const checkerKeys = ['check_11','check_12','check_13','check_14'];
    const checkerColors = (Array.isArray(theme.checkerColors) && theme.checkerColors.length >= 2)
      ? theme.checkerColors
      : null;
    const useChecker = theme.floorSet === 'checker';

    for (let y = 0; y < rows; y++){
      for (let x = 0; x < cols; x++){
        const wx = padX + x * cell + cell / 2;
        const wy = padY + y * cell + cell / 2;
        if (this.grid[y][x] === T.WALL){
          this.add.image(wx, wy, 'wall_fill')
            .setDisplaySize(cell, cell)
            .setDepth(5)
            .setTint(theme.wallFillTint ?? 0xffffff);
          const addEdge = (angle) => {
            this.add.image(wx, wy, 'wall_edge')
              .setDisplaySize(cell, cell)
              .setDepth(6)
              .setAngle(angle)
              .setTint(theme.wallEdgeTint ?? 0xffffff);
          };
          if (!this.isWallCell(x, y - 1)) addEdge(0);
          if (!this.isWallCell(x + 1, y)) addEdge(90);
          if (!this.isWallCell(x, y + 1)) addEdge(180);
          if (!this.isWallCell(x - 1, y)) addEdge(270);
        } else {
          if (useChecker && checkerColors){
            const color = ((x + y) & 1) === 0 ? checkerColors[0] : checkerColors[1];
            this.add.rectangle(wx, wy, cell + 1, cell + 1, color, 1).setDepth(1);
          } else {
            let key;
            if (useChecker){
              key = this.floorKeySingle || checkerKeys[((x + y) & 1) % checkerKeys.length];
            } else {
              const idx = ((x % wood.length) + wood.length) % wood.length;
              key = wood[idx];
            }
            this.add.image(wx, wy, key)
              .setDisplaySize(cell, cell)
              .setDepth(1)
              .setTint(theme.floorTint ?? 0xffffff);
          }
        }
      }
    }
  }
  setupInput(){
    if (!this.cursors) this.cursors = this.input.keyboard.createCursorKeys();
    if (!this.wasdKeys) this.wasdKeys = this.input.keyboard.addKeys({ W: 'W', A: 'A', S: 'S', D: 'D' });
    if (!this._quickAimBound){
      const setDir = (x, y) => {
        const len = Math.hypot(x, y) || 1;
        const nx = x / len;
        const ny = y / len;
        this.playerAim = { x: nx, y: ny };
        this.playerDrift = { x: nx, y: ny };
        this._runnerInputDir = { x: nx, y: ny };
        this.userTookOver = true;
      };
      this.input.keyboard.on('keydown-W', () => setDir(0, -1));
      this.input.keyboard.on('keydown-S', () => setDir(0, 1));
      this.input.keyboard.on('keydown-A', () => setDir(-1, 0));
      this.input.keyboard.on('keydown-D', () => setDir(1, 0));
      this.input.keyboard.on('keydown-UP', () => setDir(0, -1));
      this.input.keyboard.on('keydown-DOWN', () => setDir(0, 1));
      this.input.keyboard.on('keydown-LEFT', () => setDir(-1, 0));
      this.input.keyboard.on('keydown-RIGHT', () => setDir(1, 0));
      this._quickAimBound = true;
    }
    if (!this._initDrift){
      this._initDrift = this.sys.game.device.os.desktop ? { x: 1, y: 0 } : randomCardinal();
    }
    this.playerDrift = { x: this._initDrift.x, y: this._initDrift.y };
    this.playerAim = { x: this._initDrift.x, y: this._initDrift.y };
    this._runnerInputDir = { x: this.playerAim.x, y: this.playerAim.y };
    this.userTookOver = false;
    this.autoDrift = true;
    const getPid = (evt) => (evt?.id ?? evt?.pointerId ?? 0);
    if (!this._pointerDownHandler){
      // On mobile, treat touch input like PvP: only swipes update aim; taps trigger powers
      this._swipeStart = null;
      this._lastPointerTapAt = 0;
      this._pointerDownHandler = (p) => {
        // Ignore if already tracking a pointer
        if (this._activePointerId !== null) return;
        const pid = getPid(p);
        this._activePointerId = pid;
        this.pointer = p;
        this._swipeStart = { x: p.x, y: p.y, t: performance.now() };
      };
      this._pointerMoveHandler = (p) => {
        const pid = getPid(p);
        if (pid === this._activePointerId && p?.isDown){
          this.pointer = p;
          // Stage 5 (plug mode): continuously update aim during drag for gun aiming
          // Stages 1-4 (runner mode): ignore drag, only process swipes on pointerup
          if (this.stageIdx === 5){
            const sx = this._swipeStart?.x ?? p.x;
            const sy = this._swipeStart?.y ?? p.y;
            const dx = p.x - sx;
            const dy = p.y - sy;
            const moved = Math.hypot(dx, dy);
            const thresh = Math.max(10, this.cell * 0.4);
            if (moved >= thresh){
              this.updateAimFromPointer(p);
              this.userTookOver = true;
            }
          }
        }
      };
      this._pointerUpHandler = (p) => {
        const pid = getPid(p);
        if (pid === this._activePointerId){
          const now = performance.now();
          const sx = this._swipeStart?.x ?? p.x;
          const sy = this._swipeStart?.y ?? p.y;
          const dt = now - (this._swipeStart?.t || 0);
          const dx = p.x - sx;
          const dy = p.y - sy;
          const moved = Math.hypot(dx, dy);
          // Define thresholds similar to PvP for taps and swipes
          const TAP_TIME = 260;
          const TAP_DIST = Math.max(10, this.cell * 0.4);
          if (dt <= TAP_TIME && moved <= TAP_DIST){
            // Stage 5: tap to shoot
            if (this.stageIdx === 5){
              this._mobileShootRequested = true;
            }
            // Handle double tap to trigger the next power (dash/phase) if selected
            else if (this.stageIdx >= 3 && this.runnerPowersSelected){
              const diff = now - (this._lastPointerTapAt || 0);
              if (diff > 0 && diff <= 280){
                this._lastPointerTapAt = 0;
                this.activateNextRunnerPower();
              } else {
                this._lastPointerTapAt = now;
              }
            }
          } else if (moved >= TAP_DIST) {
            // Treat as a directional swipe: convert to cardinal direction (matches main game)
            let cardinalDir = { x: 0, y: 0 };
            if (Math.abs(dx) > Math.abs(dy)) {
              // Horizontal swipe
              cardinalDir.x = dx > 0 ? 1 : -1;
              cardinalDir.y = 0;
            } else {
              // Vertical swipe
              cardinalDir.x = 0;
              cardinalDir.y = dy > 0 ? 1 : -1;
            }

            this.playerAim = cardinalDir;
            // In stage 5 (plug), only update aim, not drift (plug doesn't auto-move)
            if (this.stageIdx !== 5) {
              this.playerDrift = cardinalDir;
            }
            if (this.stageIdx !== 5) {
              this._runnerInputDir = cardinalDir;
            }
            this.userTookOver = true;
          }
          this._activePointerId = null;
          this.pointer = null;
          this._swipeStart = null;
        }
      };
      this.input.on('pointerdown', this._pointerDownHandler);
      this.input.on('pointermove', this._pointerMoveHandler);
      this.input.on('pointerup', this._pointerUpHandler);
      this.input.on('pointerupoutside', this._pointerUpHandler);
      this.input.on('gameout', this._pointerUpHandler);
    }
    this.dashKey = this.dashKey || this.input.keyboard.addKey('SHIFT');
    this.phaseKey = this.phaseKey || this.input.keyboard.addKey('SPACE');
  }
  configureCamera(){
    const cam = this.cameras.main;
    cam.stopFollow?.();
    cam.setRoundPixels(true);
    cam.setZoom(1);
    cam.setScroll(0, 0);
    cam.setBounds(0, 0, this.scale.gameSize.width, this.scale.gameSize.height);
  }
  toWorldX(cx){
    return this.pad.x + cx * this.cell + this.cell / 2;
  }

  toWorldY(cy){
    return this.pad.y + cy * this.cell + this.cell / 2;
  }

  toCell(x, y){
    return {
      x: Math.floor((x - this.pad.x) / this.cell),
      y: Math.floor((y - this.pad.y) / this.cell)
    };
  }

  inBoundsCell(cx, cy){
    return cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows;
  }

  isWalkableCell(cx, cy){
    return this.inBoundsCell(cx, cy) && this.grid[cy][cx] !== T.WALL;
  }

  isWallCell(cx, cy){
    if (!this.inBoundsCell(cx, cy)) return true;
    return this.grid[cy][cx] === T.WALL;
  }

  isWallAtWorld(wx, wy){
    const c = this.toCell(wx, wy);
    return !this.isWalkableCell(c.x, c.y);
  }

  canMoveTo(sprite, nx, ny){
    if (this._phaseActive) return true;
    const r = sprite?.hbRadius ?? this.hitboxRadius ?? (this.cell * 0.28);
    const pts = [
      { x: nx - r, y: ny - r },
      { x: nx + r, y: ny - r },
      { x: nx - r, y: ny + r },
      { x: nx + r, y: ny + r }
    ];
    for (const p of pts){
      if (this.isWallAtWorld(p.x, p.y)) return false;
    }
    return true;
  }

  // If a sprite ends up inside a wall tile (e.g., after phase ends), snap it to the nearest free tile center
  ensureUnstuck(sprite){
    if (!this.isWallAtWorld?.(sprite.x, sprite.y)) return;
    const start = this.toCell(sprite.x, sprite.y);
    const maxR = 4; // search radius in tiles
    for (let r=1; r<=maxR; r++){
      for (let dy=-r; dy<=r; dy++){
        for (let dx=-r; dx<=r; dx++){
          const cx = start.x + dx, cy = start.y + dy;
          if (!this.isWalkableCell?.(cx, cy)) continue;
          sprite.x = this.toWorldX(cx);
          sprite.y = this.toWorldY(cy);
          return;
        }
      }
    }
  }
  placeObjectives(idx){
    const side = this.egress.side;
    const ex = this.toWorldX(this.egress.entry.x);
    const ey = this.toWorldY(this.egress.entry.y);

    // Match PvpScene car placement: position with forward offset
    let dx = 0, dy = 0, ang = 0;
    if (side === 'N'){ ang = 0; dx = 0; dy = -1; }
    else if (side === 'S'){ ang = 180; dx = 0; dy = 1; }
    else if (side === 'E'){ ang = 90; dx = 1; dy = 0; }
    else { ang = -90; dx = -1; dy = 0; }

    // Use same car placement for ALL stages (same as stage 1)
    const forward = this.cell * 0.6;
    const cx = ex + dx * forward;
    const cy = ey + dy * forward;

    // Car sprite - match PvpScene size exactly
    const carLen = this.cell * 2.6;
    this.car = this.add.image(cx, cy, 'car_blue').setDepth(1200);
    this.car.setDisplaySize(carLen, this.cell * 1.4).setAngle(ang);
    this.carOutDir = { x: dx, y: dy };

    // Car lights - created but initially hidden until extraction is available
    this.carLights = makeCarLights(this, cx, cy, side);
    // Explicitly turn off lights (sets beam alphas to 0)
    this.setCarLights(false);

    // Car beacon matching PvpScene - positioned at car nose
    this.showCarBeacon = () => {
      if (!this.car) return;
      this.hideCarBeacon();
      const noseX = this.car.x + dx * (this.cell * 0.8);
      const noseY = this.car.y + dy * (this.cell * 0.8);
      const c = this.add.container(noseX, noseY).setDepth(1300);
      const w = this.cell * 1.8, h = this.cell * 1.2;
      const glow = this.add.ellipse(0, 0, w, h, 0x60a5fa, 0.55).setBlendMode(Phaser.BlendModes.ADD);
      const inner = this.add.ellipse(0, 0, w*0.6, h*0.5, 0xffffff, 0.35).setBlendMode(Phaser.BlendModes.ADD);
      c.add([glow, inner]);
      this.tweens.add({ targets: glow, alpha: 0.25, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: c, scaleX: 1.12, scaleY: 1.12, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.carBeacon = c;
    };
    this.hideCarBeacon = () => {
      if (this.carBeacon){ this.carBeacon.destroy(); this.carBeacon = null; }
    };

    // Show beacon in all stages for visibility
    this.showCarBeacon();

    // Extract pad for collision - slightly larger than PvP for mobile-friendly extraction
    this.extractPad = this.add.rectangle(cx, cy, this.cell*2.8, this.cell*2.8, 0x0ea5e9, 0)
      .setDepth(3);

    // Stages 2 and 3: spawn stashes (real + bunk)
    if (idx === 2 || idx === 3){
      const w = this.cell*0.82, h = this.cell*0.52;
      const stashPos = { x: this.toWorldX(this.stashCell.x), y: this.toWorldY(this.stashCell.y) };
      const extractPos = { x: this.toWorldX(this.extractCell.x), y: this.toWorldY(this.extractCell.y) };
      const pkgA = makeDuffel(this, stashPos.x, stashPos.y, w, h);
      const pkgB = makeDuffel(this, extractPos.x, extractPos.y, w, h);
      const runnerPos = { x: this.toWorldX(this.spawnRunnerCell.x), y: this.toWorldY(this.spawnRunnerCell.y) };
      const dA = Math.hypot(pkgA.x - runnerPos.x, pkgA.y - runnerPos.y);
      const dB = Math.hypot(pkgB.x - runnerPos.x, pkgB.y - runnerPos.y);
      if (dA <= dB){ this.bunkStash = pkgA; this.stash = pkgB; }
      else { this.bunkStash = pkgB; this.stash = pkgA; }
      this._stashHaloG = this.add.graphics().setDepth(12);
    }

    // Stage 4: spawn AI plug and real + bunk stash (like PvP)
    if (idx === 4){
      this.createAIPlug();
      // Spawn 2 stashes: 1 real, 1 bunk (same logic as stages 2 & 3)
      const w = this.cell*0.82, h = this.cell*0.52;
      const stashPos = { x: this.toWorldX(this.stashCell.x), y: this.toWorldY(this.stashCell.y) };
      const extractPos = { x: this.toWorldX(this.extractCell.x), y: this.toWorldY(this.extractCell.y) };
      const pkgA = makeDuffel(this, stashPos.x, stashPos.y, w, h);
      const pkgB = makeDuffel(this, extractPos.x, extractPos.y, w, h);
      const runnerPos = { x: this.toWorldX(this.spawnRunnerCell.x), y: this.toWorldY(this.spawnRunnerCell.y) };
      const dA = Math.hypot(pkgA.x - runnerPos.x, pkgA.y - runnerPos.y);
      const dB = Math.hypot(pkgB.x - runnerPos.x, pkgB.y - runnerPos.y);
      if (dA <= dB){ this.bunkStash = pkgA; this.stash = pkgB; }
      else { this.bunkStash = pkgB; this.stash = pkgA; }
      this._stashHaloG = this.add.graphics().setDepth(12);
    }

    // Stage 5: spawn AI runner and real + bunk stash, convert player runner to plug
    if (idx === 5){
      this.createAIRunner();
      const w = this.cell*0.82, h = this.cell*0.52;
      const stashPos = { x: this.toWorldX(this.stashCell.x), y: this.toWorldY(this.stashCell.y) };
      const extractPos = { x: this.toWorldX(this.extractCell.x), y: this.toWorldY(this.extractCell.y) };

      // Spawn both real and bunk stash (like stages 2-4)
      const pkgA = makeDuffel(this, stashPos.x, stashPos.y, w, h);
      const pkgB = makeDuffel(this, extractPos.x, extractPos.y, w, h);

      // Real stash is farther from extraction point (harder for AI to get)
      const dA = Math.hypot(stashPos.x - extractPos.x, stashPos.y - extractPos.y);
      const dB = Math.hypot(extractPos.x - extractPos.x, extractPos.y - extractPos.y);
      if (dA <= dB){ this.bunkStash = pkgA; this.stash = pkgB; }
      else { this.bunkStash = pkgB; this.stash = pkgA; }

      this._stashHaloG = this.add.graphics().setDepth(12);

      // Convert player sprite to plug
      if (this.runner?.sprite){
        this.runner.sprite.setTexture('td_plug');
      }
    }
  }
  resetState(){
    this._activePointerId = null;
    this.pointer = null;
    this._lastPointerTap = null;
    this._swipeStart = null;
    this._lastPointerTapAt = 0;
    this._dashUntil = 0;
    this._phaseUntil = 0;
    this._phaseActive = false;
    this._didDash = false;
    this._didPhase = false;
    if (this.runner?.sprite) this.runner.sprite.setAlpha(1);
    this.carry = null;
    this.bullets = [];
    this.lastPos = { x: this.runner.x, y: this.runner.y };
    this.userTookOver = false;
    this._lastTap = null;

    // Pick a safe initial drift direction that doesn't lead into walls
    const safeDrift = this.pickSafeInitialDirection();
    this.playerDrift = safeDrift;
    this.playerAim = safeDrift;
    this._runnerInputDir = { x: safeDrift.x, y: safeDrift.y };
  }

  // Pick an initial movement direction that doesn't immediately hit a wall
  pickSafeInitialDirection(){
    if (!this.runner) return { x: 1, y: 0 };

    // Stage 2: Auto-drift toward bunk stash for smooth tutorial experience
    if (this.stageIdx === 2 && this.bunkStash) {
      const dx = this.bunkStash.x - this.runner.x;
      const dy = this.bunkStash.y - this.runner.y;

      // Convert to cardinal direction (prioritize larger delta)
      if (Math.abs(dx) > Math.abs(dy)) {
        const dir = { x: Math.sign(dx), y: 0 };
        // Verify it's safe before using it
        const testX = this.runner.x + dir.x * this.cell * 1.5;
        const testY = this.runner.y;
        if (this.canMoveTo(this.runner, testX, testY)) {
          return dir;
        }
      } else {
        const dir = { x: 0, y: Math.sign(dy) };
        // Verify it's safe before using it
        const testX = this.runner.x;
        const testY = this.runner.y + dir.y * this.cell * 1.5;
        if (this.canMoveTo(this.runner, testX, testY)) {
          return dir;
        }
      }
    }

    // Test all 4 cardinal directions (fallback for other stages or if bunk path blocked)
    const directions = [
      { x: 1, y: 0 },   // Right
      { x: 0, y: 1 },   // Down
      { x: -1, y: 0 },  // Left
      { x: 0, y: -1 }   // Up
    ];

    // Test each direction to see if we can move in it
    for (const dir of directions) {
      const testDist = this.cell * 1.5; // Look ahead 1.5 cells
      const testX = this.runner.x + dir.x * testDist;
      const testY = this.runner.y + dir.y * testDist;

      // If we can move to this position, it's a safe direction
      if (this.canMoveTo(this.runner, testX, testY)) {
        return dir;
      }
    }

    // Fallback to right if no safe direction found (shouldn't happen)
    return { x: 1, y: 0 };
  }

  updateAimFromPointer(p){
    if (!p || !this.runner) return null;
    const cam = this.cameras?.main;
    let px = p.worldX;
    let py = p.worldY;
    if ((px === undefined || py === undefined) && cam?.getWorldPoint){
      const pt = cam.getWorldPoint(p.x, p.y);
      px = pt.x;
      py = pt.y;
    }
    if (px === undefined || py === undefined) return null;
    const dx = px - this.runner.x;
    const dy = py - this.runner.y;
    const L = Math.hypot(dx, dy);
    if (L < 0.0001) return { x: px, y: py };
    const aim = { x: dx / L, y: dy / L };
    this.playerAim = aim;
    if (this.autoDrift !== false){
      this.playerDrift = { x: aim.x, y: aim.y };
    }
    if (this.stageIdx !== 5) this._runnerInputDir = { x: aim.x, y: aim.y };
    this.userTookOver = true;
    return { x: px, y: py };
  }

  showStageModal(idx){
    const desktop = this.sys.game.device.os.desktop;
    if (idx === 1){
      const mobileLines = [
        'You move automatically',
        'Swipe to change direction',
        'Reach the Getaway Car',
        '',
        'Tip: No need to hold the screen',
        '',
        'You are the RUNNER'
      ];
      const desktopLines = [
        'Use arrow keys / WASD to move',
        'Reach the Getaway Car',
        '',
        'You are the RUNNER'
      ];
      this.showModal('Learn movement', desktop ? desktopLines : mobileLines, 'Start', () => this.resumeFromModal());
      // Add runner character preview with blue trail inline with text
      this.time.delayedCall(250, () => this.showCharacterPreview('runner'));
    } else if (idx === 2) {
      // Stash tutorial: further shorten and wrap text for mobile devices.  The original
      // copy wrapped off screen on some phones, so trim the wording and apply a
      // smaller scale factor for compact layouts.  The message introduces the stash
      // objective and warns about fakes.
      const stashLines = [
        'Get the stash and get to the getaway car.',
        '',
        'Tip: Bunk stashes wont start the getaway car'
      ];
      // Apply a smaller scale so the dialog fits comfortably on narrow screens.  A
      // scale of around 0.65 trims the title and content sizes while retaining
      // readability.  Should further adjustments be needed, update this value.
      this.showModal('Stash & Bunk Stash', stashLines, 'Go', () => this.resumeFromModal(), { scale: 0.65 });
    } else if (idx === 3){
      // In the power-up stage, introduce the available abilities.  List phase, dash, and decoy
      // with brief descriptions.  After closing the intro modal, present a choice modal.
      const desktop = this.sys.game.device.os.desktop;
      const introLines = [
        'Double Tap screen to activate',
        '',
        '',
        '👻 PHASE: phase through walls',
        '',
        '⚡ DASH: quick dash in a direction',
        '',
        '🎭 DECOY: send out a decoy runner',
        '',
        '',
        '*Tutorial: Use both powers to start getaway car',
        '       (Optional in full game)'
      ];
      this.showModal('Runner Power-ups', introLines, 'Go', () => {
        this.resumeFromModal();
        this.showPowerSelectionModal();
      });
    } else if (idx === 4) {
      // Stage 4: Runner PvP tutorial - show runner power selection first, then intro modal
      const runnerLines = [
        'Now that you know the basics, try and take',
        'the stash from the plug while dodging',
        'his bullets. Go to the getaway car.',
        '',
        'Tip: Don\'t get hit more than once!'
      ];
      this.showModal('Run from the Plug', runnerLines, 'Go', () => {
        this.resumeFromModal();
        this.showPowerSelectionModal();
      }, { scale: 0.70 });
    } else if (idx === 5) {
      // Stage 5: Plug PvP tutorial - show gun selection first, then start
      const plugLines = [
        'Great! Now you have the stashes.',
        'Defend against runners.',
        desktop ? 'Click to shoot, move mouse to aim.' : 'Tap screen to shoot, drag to aim.',
        '',
        'You are now the PLUG'
      ];
      this.showModal('Defend the Block', plugLines, 'Go', () => {
        this.resumeFromModal();
        this.showGunSelectionModal();
      }, { scale: 0.65 });
      // Add plug character preview with red trail inline with text
      this.time.delayedCall(250, () => this.showCharacterPreview('plug'));
    }
  }
  showCharacterPreview(role){
    // Create character preview inline with text at bottom of modal
    const width = this.scale.width;
    const height = this.scale.height;

    // Position to align perfectly with "You are the RUNNER/PLUG" text line (same vertical position as text)
    const previewY = height * 0.475;  // Adjusted down to align with text line after modal content changes
    const previewSize = Math.min(width, height) * 0.045;  // Smaller size (was 0.06) to fit inline

    // Container for character preview - positioned to the right of "You are the RUNNER/PLUG" text
    const container = this.add.container(width / 2 + 80, previewY).setDepth(10001).setScrollFactor(0);

    // Character sprite
    const texture = (role === 'runner') ? 'td_runner' : 'td_plug';
    const sprite = this.add.sprite(0, 0, texture).setDisplaySize(previewSize, previewSize);

    // Flame trail particles behind character (smaller and fewer)
    const trailColors = (role === 'runner')
      ? [0x60a5fa, 0x3b82f6, 0x2563eb]  // Blue for runner
      : [0xef4444, 0xdc2626, 0xb91c1c]; // Red for plug

    // Create 2 small trail circles behind the character
    const trails = [];
    for (let i = 0; i < 2; i++) {
      const offsetX = -previewSize * 0.6 - (i * previewSize * 0.5);
      const offsetY = (Math.random() - 0.5) * previewSize * 0.25;
      const size = previewSize * (0.3 - i * 0.08);
      const color = trailColors[i % trailColors.length];
      const alpha = 0.7 - (i * 0.2);

      const trail = this.add.circle(offsetX, offsetY, size, color, alpha);
      trails.push(trail);
      container.add(trail);
    }

    container.add(sprite);

    // Animate trails pulsing
    trails.forEach((trail, i) => {
      this.tweens.add({
        targets: trail,
        alpha: trail.alpha * 0.4,
        scale: 0.8,
        duration: 600,
        delay: i * 100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // Store reference for cleanup
    if (!this._modalExtras) this._modalExtras = [];
    this._modalExtras.push(container);
  }

  resumeFromModal(){
    // Clean up any modal extras (character previews)
    if (this._modalExtras) {
      this._modalExtras.forEach(extra => extra.destroy());
      this._modalExtras = [];
    }
    const cam = this.cameras.main;
    cam.setZoom(1);
    this.pointer = null;

    // Stage 1: extraction is available from start, so start engine and lights when stage begins
    if (this.stageIdx === 1) {
      try { this.audio?.startEngineLoop(); } catch {}
      this.setCarLights(true);
    }
  }
  showModal(title, lines, btn = 'Start', onStart, opts = {}){
    this.pausedForModal = true;
    const veil = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.72
    ).setScrollFactor(0).setDepth(9998).setInteractive();
    // Determine font scale: allow a custom scale factor via opts.scale; otherwise,
    // use 0.85 when opts.small is true, or 1.0 by default.
    let scaleFac;
    if (typeof opts.scale === 'number'){
      scaleFac = opts.scale;
    } else {
      scaleFac = opts.small ? 0.85 : 1.0;
    }
    // Calculate max width to keep modal narrower and taller (prevents edge-to-edge borders)
    const maxContentWidth = Math.floor(Math.min(this.scale.width * 0.75, 420));

    const dlg = this.rexUI.add.dialog({
      x: this.scale.width / 2,
      y: this.scale.height * 0.42,
      background: this.rexUI.add.roundRectangle(0, 0, 0, 0, 10, 0x0f172a, 0.96).setStrokeStyle(2, 0x2f3650),
      title: this.add.text(0, 0, title, {
        color: '#cbd1ff',
        fontSize: Math.max(22, Math.floor(this.scale.height * 0.036 * scaleFac)) + 'px',
        fontStyle: 'bold',
        wordWrap: { width: maxContentWidth }
      }),
      content: this.add.text(0, 0, lines.join('\n'), {
        color: '#aab5ff',
        fontSize: Math.max(15, Math.floor(this.scale.height * 0.024 * scaleFac)) + 'px',
        wordWrap: { width: maxContentWidth },
        lineSpacing: 4
      }),
      actions: [
        this.rexUI.add.label({
          background: this.rexUI.add.roundRectangle(0, 0, 2, 2, 8, 0xfbbf24).setStrokeStyle(4, 0xfde047),
          text: this.add.text(0, 0, btn, {
            color: '#000000',
            fontSize: Math.max(18, Math.floor(this.scale.height * 0.032 * scaleFac)) + 'px',
            fontStyle: 'bold'
          }),
          space: { left: 28, right: 28, top: 14, bottom: 14 }
        })
      ],
      space: { title: 12, content: 16, action: 12, left: 20, right: 20, top: 18, bottom: 18 }
    }).layout().setDepth(9999).popUp(200);
    dlg.on('button.click', () => {
      dlg.scaleDownDestroy(140);
      veil.destroy();
      this.pausedForModal = false;
      onStart && onStart();
    });
  }
  toast(msg, hold = 1000, color = '#cbd1ff'){
    if (this.tipTween){
      this.tweens.remove(this.tipTween);
      this.tipTween = null;
    }
    if (!this.tipObj){
      this.tipObj = this.add.text(
        this.scale.width / 2,
        18,
        msg,
        { color, fontSize: Math.max(14, Math.floor(this.scale.height * 0.026)) + 'px' }
      ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10000);
    } else {
      this.tipObj.setText(msg);
    }
    this.tipObj.setColor(color);
    this.tipObj.setAlpha(0);
    this.tipTween = this.tweens.add({
      targets: this.tipObj,
      alpha: 1,
      duration: 160,
      onComplete: () => {
        this.time.delayedCall(hold, () => this.tweens.add({ targets: this.tipObj, alpha: 0, duration: 200 }));
      }
    });
  }
  showBunkPopup(x, y){
    const txt = this.add.text(
      x,
      y - this.cell * 0.5,
      'BUNK!',
      { color: '#f87171', fontSize: `${Math.max(16, Math.floor(this.cell*0.45))}px`, fontStyle: 'bold' }
    ).setOrigin(0.5).setDepth(25);
    txt.setStroke('#7f1d1d', Math.max(2, Math.floor(this.cell*0.05)));
    this.tweens.add({
      targets: txt,
      alpha: 0,
      y: txt.y - this.cell * 0.35,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy()
    });
  }

  /**
   * Display a second modal in the power-up stage prompting the player to choose which power-up
   * to equip. Only Dash and Phase are selectable; Decoy is shown but disabled.
   */
  showPowerSelectionModal(){
    // Custom modal that mimics the PvP power selection layout.  Players must pick two
    // abilities; decoy is shown but disabled.  Once two picks are made, the modal
    // disappears and the tutorial resumes.
    this.pausedForModal = true;
    const width = this.scale.width;
    const height = this.scale.height;
    // Dark overlay to block game interactions
    const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.72)
      .setDepth(20000)
      .setScrollFactor(0)
      .setInteractive();
    // Panel sizing
    const panelW = Math.min(width * 0.80, 480);
    const panelH = 240;
    const panel = this.add.rectangle(width/2, height*0.40, panelW, panelH, 0x0f172a, 0.96)
      .setStrokeStyle(2, 0x274060)
      .setDepth(20001);
    // Main title (matching PvE style)
    const title = this.add.text(panel.x, panel.y - panelH/2 + 24,
      'TUTORIAL',
      { color: '#cbd1ff', fontSize: Math.max(22, Math.floor(height * 0.040)) + 'px', fontStyle:'bold' }
    ).setOrigin(0.5).setDepth(20002);
    // Subtitle
    const subtitle = this.add.text(panel.x, panel.y - panelH/2 + 52,
      'Pick 2 Power-Ups',
      { color: '#94a3b8', fontSize: Math.max(16, Math.floor(height * 0.026)) + 'px', fontStyle:'normal' }
    ).setOrigin(0.5).setDepth(20002);
    // Options definition with emoji symbols and colors (matching PvE mode)
    const opts = [
      { key:'phase', label:'PHASE', symbol:'👻', color:'#a78bfa', disabled:false },
      { key:'dash', label:'DASH', symbol:'⚡', color:'#fbbf24', disabled:false },
      { key:'decoy', label:'DECOY', symbol:'🎭', color:'#60a5fa', disabled:false }
    ];
    const chosen = [];
    const badges = new Map(); // Map of powerId -> { badge1, badge2 }

    // Function to update all badges based on selection order
    const updateAllBadges = () => {
      // Hide all badges first
      badges.forEach(badgeObjs => {
        badgeObjs.badge1.setVisible(false);
        badgeObjs.badge2.setVisible(false);
      });

      // Show badges based on selection order
      chosen.forEach((powerId, index) => {
        const badgeObjs = badges.get(powerId);
        if (!badgeObjs) return;

        if (index === 0) {
          // First selection - show badge "1"
          badgeObjs.badge1.setVisible(true);
        } else if (index === 1) {
          // Second selection - show badge "2"
          badgeObjs.badge2.setVisible(true);
        }
      });
    };

    // Horizontal spacing
    const btnW = panelW / opts.length;
    const btnH = 80;
    // Keep a list of UI elements for cleanup later
    const elements = [];
    opts.forEach((opt, idx) => {
      const x = panel.x - panelW/2 + btnW * (idx + 0.5);
      const y = panel.y + panelH/2 - btnH/2 - 16;
      const rect = this.add.rectangle(x, y, btnW - 12, btnH, 0x14202f, 1)
        .setStrokeStyle(2, parseInt(opt.color.replace('#', '0x')))
        .setDepth(20002)
        .setInteractive({ useHandCursor: true });

      // Symbol (emoji) above name
      const symbol = this.add.text(x, y - 15, opt.symbol, {
        fontSize: '32px'
      }).setOrigin(0.5).setDepth(20003);

      // Power name below symbol
      const txt = this.add.text(x, y + 20, opt.label, {
        color: opt.color,
        fontSize: Math.max(16, Math.floor(height * 0.028)) + 'px',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(20003);

      // Badge 1 - Green background (first selection, positioned on LEFT)
      const badge1 = this.add.text(x + (btnW / 2) - 24, y - btnH*0.40, '1', {
        color: '#ffffff',
        fontSize: Math.max(14, Math.floor(height * 0.026)) + 'px',
        fontStyle: 'bold',
        backgroundColor: '#10b981',
        padding: { x: 5, y: 3 }
      }).setOrigin(0.5).setDepth(20004).setVisible(false);

      // Badge 2 - Orange background (second selection, positioned on RIGHT)
      const badge2 = this.add.text(x + (btnW / 2) - 8, y - btnH*0.40, '2', {
        color: '#ffffff',
        fontSize: Math.max(14, Math.floor(height * 0.026)) + 'px',
        fontStyle: 'bold',
        backgroundColor: '#f97316', // Orange color for second selection
        padding: { x: 5, y: 3 }
      }).setOrigin(0.5).setDepth(20004).setVisible(false);

      badges.set(opt.key, { badge1, badge2 });
      elements.push(rect, txt, symbol, badge1, badge2);

      rect.on('pointerdown', () => {
        // Count how many times this power is currently selected
        const count = chosen.filter(id => id === opt.key).length;

        if (count === 0) {
          // Not selected yet - add first instance if we have room
          if (chosen.length >= 2) return;
          chosen.push(opt.key);
        } else if (count === 1) {
          // Selected once - toggle to either 2 selections or 0
          if (chosen.length >= 2) {
            // Already at max, cycle back to 0 (deselect completely)
            const idx = chosen.indexOf(opt.key);
            chosen.splice(idx, 1);
          } else {
            // Can add second instance
            chosen.push(opt.key);
          }
        } else if (count === 2) {
          // Selected twice - click removes last instance
          const idx = chosen.lastIndexOf(opt.key);
          chosen.splice(idx, 1);
        }

        updateAllBadges();

        // When two powers are chosen, close modal after delay
        if (chosen.length === 2){
          // Persist the chosen power order. Players can use each once per run.
          this.runnerPowersSelected = chosen.slice();
          this.runnerPowersConsumed = [false, false];
          // Add delay so user can see both badges before modal closes
          this.time.delayedCall(600, () => {
            // Clean up modal elements and resume the game
            overlay.destroy();
            panel.destroy();
            title.destroy();
            subtitle.destroy();
            elements.forEach(el => el.destroy());
            this.pausedForModal = false;
          });
        }
      });
    });
  }

  /**
   * Display gun selection modal for stage 5 (plug tutorial)
   * Player must choose one weapon before starting
   */
  showGunSelectionModal(){
    this.pausedForModal = true;
    const width = this.scale.width;
    const height = this.scale.height;
    // Dark overlay
    const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.72)
      .setDepth(20000)
      .setScrollFactor(0)
      .setInteractive();
    // Panel sizing
    const panelW = Math.min(width * 0.85, 500);
    const panelH = 240;
    const panel = this.add.rectangle(width/2, height*0.40, panelW, panelH, 0x0f172a, 0.96)
      .setStrokeStyle(2, 0x274060)
      .setDepth(20001);
    // Title
    const title = this.add.text(panel.x, panel.y - panelH/2 + 28,
      'Choose Your Weapon',
      { color: '#cbd1ff', fontSize: Math.max(20, Math.floor(height * 0.034)) + 'px', fontStyle:'bold' }
    ).setOrigin(0.5).setDepth(20002);
    // Gun options
    const guns = [
      { key:'pistol', label:'PISTOL', ammo: 12 },
      { key:'shotgun', label:'SHOTGUN', ammo: 8 },
      { key:'rifle', label:'RIFLE', ammo: 10 }
    ];
    const btnW = (panelW - 40) / guns.length;
    const btnH = 70;
    const elements = [];

    guns.forEach((gun, idx) => {
      const x = panel.x - panelW/2 + 20 + btnW * (idx + 0.5);
      const y = panel.y + panelH/2 - btnH/2 - 20;
      const rect = this.add.rectangle(x, y, btnW - 12, btnH, 0x14202f, 1)
        .setStrokeStyle(2, 0x274060)
        .setDepth(20002)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(x, y - 8, gun.label, {
        color: '#cbd1ff',
        fontSize: Math.max(16, Math.floor(height * 0.028)) + 'px',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(20003);
      const ammoTxt = this.add.text(x, y + 14, `${gun.ammo} rounds`, {
        color: '#9AA6B2',
        fontSize: Math.max(12, Math.floor(height * 0.020)) + 'px'
      }).setOrigin(0.5).setDepth(20003);
      elements.push(rect, txt, ammoTxt);

      rect.on('pointerdown', () => {
        // Set weapon and ammo for stage 5
        this.selectedWeapon = gun.key;
        this.weaponAmmo = gun.ammo;
        // Clean up modal
        overlay.destroy();
        panel.destroy();
        title.destroy();
        elements.forEach(el => el.destroy());
        this.pausedForModal = false;
      });
    });
  }

  addCarry(){
    if (this.carry){
      this.runner.remove(this.carry, true);
      this.carry = null;
    }
    const w = this.cell * 0.60;
    const h = this.cell * 0.36;
    const cont = this.add.container(0, -this.cell * 0.30).setDepth(2);
    const aura = this.add.ellipse(0, 0, w * 1.2, h * 1.2, 0x86efac, 0.16).setBlendMode(Phaser.BlendModes.ADD);
    const g = this.add.graphics();
    const tan = 0xC8A97E;
    const tanDark = 0xA9885F;
    const tape = 0x8B7355;
    const gloss = 0xE7D3B5;
    const rad = Math.max(3, Math.floor(this.cell * 0.10));
    g.fillStyle(tan, 1).lineStyle(Math.max(2, Math.floor(this.cell * 0.04)), tanDark, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, rad);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, rad);
    g.fillStyle(tape, 1);
    g.fillRect(-w / 2 + 3, -h * 0.42, w - 6, h * 0.84);
    g.fillStyle(gloss, 0.14);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w * 0.36, h * 0.32, rad * 0.5);
    cont.add([aura, g]);
    this.runner.add(cont);
    this.carry = cont;
  }
  setCarLights(on){
    if (!this.carLights) return;

    // Start pulsing animation when lights turn on
    if (on && this.carLights.beams) {
      // Kill any existing light tweens
      if (this._carLightTween) {
        this.tweens.remove(this._carLightTween);
        this._carLightTween = null;
      }

      // Set beams to visible first
      this.carLights.beams.forEach(beam => beam.setAlpha(1));

      // Create new pulsing tween
      this._carLightTween = this.tweens.add({
        targets: this.carLights.beams,
        alpha: 0.7,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else {
      // Stop animation and hide beams when lights turn off
      if (this._carLightTween) {
        this.tweens.remove(this._carLightTween);
        this._carLightTween = null;
      }
      if (this.carLights.beams) {
        this.carLights.beams.forEach(beam => beam.setAlpha(0));
      }
    }
  }

  /**
   * Animate the runner boarding the getaway car and the car driving off.
   * After the car departs, proceed to the next tutorial stage or finish.
   */
  playCarDepartAndGoNext(){
    // Prevent multiple triggers
    if (this._carDeparting) return;
    this._carDeparting = true;
    // Compute outward direction based on the egress side
    let dx = 0, dy = 0;
    const side = this.egress?.side;
    if (side === 'N'){ dx = 0; dy = -1; }
    else if (side === 'S'){ dx = 0; dy = 1; }
    else if (side === 'E'){ dx = 1; dy = 0; }
    else if (side === 'W'){ dx = -1; dy = 0; }
    // If car or runner missing, just go next immediately
    if (!this.runner || !this.car){
      this.goNext();
      return;
    }
    // Determine the car nose position (front bumper) where the runner boards
    const noseX = this.car.x + dx * (this.cell * 0.8);
    const noseY = this.car.y + dy * (this.cell * 0.8);
    // Tween: move runner to the car nose, shrink and fade out ("sucked into vehicle" effect)
    this.tweens.add({
      targets: this.runner,
      x: noseX,
      y: noseY,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: 400,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.runner.setVisible(false);
        // Tween: drive car outward (along with lights and beacon)
        const dist = this.cell * 8;
        const targets = [this.car];
        if (this.carLights) targets.push(this.carLights);
        if (this.carBeacon) targets.push(this.carBeacon);

        this.tweens.add({
          targets: targets,
          x: `+=${dx * dist}`,
          y: `+=${dy * dist}`,
          duration: 1200,
          ease: 'Sine.easeIn',
          onComplete: () => {
            // After the car departs, proceed to the next stage
            this.goNext();
          }
        });
      }
    });
  }
  goNext(){
    // Prevent duplicate calls
    if (this._transitioning) return;
    this._transitioning = true;

    // Stop engine loop when transitioning to next stage
    try { this.audio?.stopEngineLoop(); } catch {}

    const next = this.stageIdx + 1;
    if (next <= 5){
      const cam = this.cameras.main;
      cam.fadeOut(200, 0, 0, 0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this._transitioning = false;
        this.startStage(next);
        cam.fadeIn(200, 0, 0, 0);
      });
    } else {
      // Tutorial complete - pause game and show completion modal
      this.pausedForModal = true;

      // Stop AI movement and bullets
      if (this.aiRunner) {
        this.aiRunner.destroy();
        this.aiRunner = null;
      }
      if (this.aiPlug) {
        this.aiPlug.destroy();
        this.aiPlug = null;
      }
      if (this.bulletsPlayer) {
        this.bulletsPlayer.forEach(b => b.destroy());
        this.bulletsPlayer = [];
      }
      if (this.bulletsPlug) {
        this.bulletsPlug.forEach(b => b.destroy());
        this.bulletsPlug = [];
      }

      const veil = this.add.rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        this.scale.width,
        this.scale.height,
        0x000000,
        0.72
      ).setScrollFactor(0).setDepth(9998).setInteractive();

      const dlg = this.rexUI.add.dialog({
        x: this.scale.width / 2,
        y: this.scale.height * 0.35,
        background: this.rexUI.add.roundRectangle(0, 0, 0, 0, 8, 0x101522, 0.96).setStrokeStyle(2, 0x2f3650),
        title: this.add.text(0, 0, "You're ready!", { color: '#cbd1ff', fontSize: Math.max(20, Math.floor(this.scale.height * 0.032)) + 'px', fontStyle: 'bold' }),
        content: this.add.text(0, 0, 'Tutorial complete!\n\nTime to run the streets and defend the block.', { color: '#aab5ff', fontSize: Math.max(14, Math.floor(this.scale.height * 0.022)) + 'px', align: 'center' }),
        actions: [ this.add.text(0, 0, 'Exit', { color: '#cbd1ff' }) ],
        space: { title: 10, content: 10, action: 8, left: 14, right: 14, top: 12, bottom: 12 }
      }).layout().setDepth(9999).popUp(160);

      dlg.on('button.click', () => {
        dlg.scaleDownDestroy(140);
        veil.destroy();
        this.scene.transition({ target: 'MENU', duration: 200, moveBelow: true });
      });
    }
  }
  queueDash(duration = 220){
    // Teleport dash similar to PvP: instantly leap forward along the current facing.
    // Ignore duration since it's instantaneous.
    if (!this.runner) return;
    // Determine facing from last movement or aim
    const aim = this._runnerInputDir || this._runnerMoveDir || this.playerAim || { x: 1, y: 0 };
    const dir = (Math.abs(aim.x) >= Math.abs(aim.y))
      ? { x: Math.sign(aim.x) || 1, y: 0 }
      : { x: 0, y: Math.sign(aim.y) || 1 };
    const steps = 3;
    const start = this.toCell(this.runner.x, this.runner.y);
    let cx = start.x;
    let cy = start.y;
    for (let i = 0; i < steps; i++){
      const nx = cx + dir.x;
      const ny = cy + dir.y;
      if (!this.inBoundsCell?.(nx, ny) || !this.isWalkableCell?.(nx, ny)) break;
      cx = nx;
      cy = ny;
    }
    this.runner.x = this.toWorldX(cx);
    this.runner.y = this.toWorldY(cy);
    this._didDash = true;
    // In stage 3, start engine if both power slots consumed AND stash picked up
    if (this.stageIdx === 3 && this.runnerPowersConsumed && this.runnerPowersConsumed[0] && this.runnerPowersConsumed[1] && this.hasPackage) {
      try { this.audio?.startEngineLoop(); } catch {}
    }
  }

  // --- Runner power helpers (order-based execution) ---

  /**
   * Activate the runner power at the given selection index, if not already
   * consumed.  Consumed powers cannot be used again in the same stage.
   * This mirrors the PvP power system but is simplified for tutorial use.
   * @param {number} idx
   */
  activateRunnerPowerByIndex(idx){
    if (!this.runnerPowersSelected || !this.runnerPowersConsumed) return;
    if (idx < 0 || idx >= this.runnerPowersSelected.length) return;
    if (this.runnerPowersConsumed[idx]) return;
    const power = this.runnerPowersSelected[idx];
    this.performRunnerPower(power);
    this.runnerPowersConsumed[idx] = true;
    // In stage 3, start engine if both power slots now consumed AND stash picked up
    if (this.stageIdx === 3 && this.runnerPowersConsumed[0] && this.runnerPowersConsumed[1] && this.hasPackage) {
      try { this.audio?.startEngineLoop(); } catch {}
    }
  }

  /**
   * Activate the next available runner power in selection order.
   */
  activateNextRunnerPower(){
    if (!this.runnerPowersSelected || !this.runnerPowersConsumed) return;
    for (let i = 0; i < this.runnerPowersSelected.length; i++){
      if (!this.runnerPowersConsumed[i]){
        this.activateRunnerPowerByIndex(i);
        break;
      }
    }
  }

  /**
   * Activate a specific power by name (dash or phase) if it was selected and is
   * not yet consumed.  Useful for keyboard shortcuts (SHIFT or SPACE).
   * @param {string} name
   */
  activateRunnerPowerByName(name){
    if (!this.runnerPowersSelected || !this.runnerPowersConsumed) return;
    const idx = this.runnerPowersSelected.indexOf(name);
    if (idx !== -1 && !this.runnerPowersConsumed[idx]){
      this.activateRunnerPowerByIndex(idx);
    }
  }

  /**
   * Execute the logic for a specific power. Phase, dash, and decoy are
   * implemented here. Phase grants temporary intangibility and fades
   * the runner. Dash teleports forward a few tiles along the facing.
   * Decoy spawns a duplicate runner that runs in the current direction.
   * @param {string} power
   */
  performRunnerPower(power){
    const now = performance.now();
    if (!this.runner) return;
    if (power === 'phase'){
      // Play phase sound effect (louder)
      try {
        this.sound.play('phase', { volume: 0.7 });
      } catch {}
      // Phase: become intangible and semi-transparent for ~600ms
      this._phaseUntil = now + 600;
      this._didPhase = true;
      this._phaseActive = true;
      if (this.runner?.sprite) this.runner.sprite.setAlpha(0.35);
      // In stage 3, start engine if both power slots consumed AND stash picked up
      if (this.stageIdx === 3 && this.runnerPowersConsumed && this.runnerPowersConsumed[0] && this.runnerPowersConsumed[1] && this.hasPackage) {
        try { this.audio?.startEngineLoop(); } catch {}
      }
    } else if (power === 'dash'){
      // Play dash sound effect (quieter and much faster to match instant teleport)
      try {
        this.sound.play('dash', { volume: 0.2, rate: 2.5 });
      } catch {}
      // Dash: teleport forward up to 3 tiles
      this.queueDash();
    } else if (power === 'decoy'){
      // Play decoy sound effect
      try {
        this.sound.play('decoy', { volume: 0.4 });
      } catch {}
      // Decoy: spawn a duplicate runner sprite that runs in the current direction
      const dir = this._runnerInputDir || this._runnerMoveDir || this.playerAim || { x: 1, y: 0 };
      const decoy = this.add.container(this.runner.x, this.runner.y).setDepth(8);
      const sh = this.add.ellipse(0, this.cell * 0.48, this.cell * 0.90, this.cell * 0.30, 0x000000, 0.34).setScale(1, 0.8);
      const ds = this.add.sprite(0, 0, 'td_runner').setOrigin(0.5);
      ds.setScale((this.cell / 128) * 3.0);
      ds.setTint(0x60a5fa); // Blue tint to distinguish from real runner
      decoy.add([sh, ds]);
      this.decoySprite = decoy;
      this.decoyExpiresAt = now + 5500; // 5.5 seconds
      const speed = this.cell * 7.0 * 0.9; // Slightly slower than runner
      this.decoyVelocity = { x: dir.x * speed, y: dir.y * speed };
      // In stage 3, start engine if both power slots consumed AND stash picked up
      if (this.stageIdx === 3 && this.runnerPowersConsumed && this.runnerPowersConsumed[0] && this.runnerPowersConsumed[1] && this.hasPackage) {
        try { this.audio?.startEngineLoop(); } catch {}
      }
    }
  }

  // ========== STAGE 4 & 5: AI AND BULLET HELPERS ==========

  // Create AI plug sprite for stage 4
  createAIPlug(){
    // Use the plug spawn cell from arena generation (arena.spawns.plug)
    let spawnCell = this.plugSpawnCell || { x: Math.floor(this.cols / 2), y: Math.floor(this.rows / 2) };

    // Prevent enclosed spawns (trapped in walls with no exits)
    if (this.isEnclosed(spawnCell)) {
      console.warn('[Tutorial] AI Plug spawn is enclosed, finding safe spawn...');
      spawnCell = this.findSafeSpawn(spawnCell) || spawnCell;
    }

    const wx = this.toWorldX(spawnCell.x);
    const wy = this.toWorldY(spawnCell.y);

    this.aiPlug = this.add.container(wx, wy).setDepth(8);
    const shadow = this.add.ellipse(0, this.cell * 0.48, this.cell * 0.90, this.cell * 0.30, 0x000000, 0.34).setScale(1, 0.8);
    const sprite = this.add.sprite(0, 0, 'td_plug').setOrigin(0.5);
    sprite.setScale((this.cell / 128) * 3.0);
    this.aiPlug.add([shadow, sprite]);
    this.aiPlug.sprite = sprite;
    this.aiPlug.hbRadius = this.hitboxRadius;
    this.aiPlug.hp = 3;

    // Select random weapon for AI (no laser)
    const aiWeapons = ['pistol', 'shotgun', 'rifle'];
    this.aiPlugWeapon = aiWeapons[Math.floor(Math.random() * aiWeapons.length)];
    this.aiPlugAmmo = this.weaponStats[this.aiPlugWeapon].clip;
  }

  // Create AI runner sprite for stage 5
  // Spawn at plug spawn cell (opposite end from player) to avoid overlap
  createAIRunner(){
    let spawnCell = this.plugSpawnCell || this.spawnRunnerCell;

    // Prevent enclosed spawns (trapped in walls with no exits)
    if (this.isEnclosed(spawnCell)) {
      console.warn('[Tutorial] AI Runner spawn is enclosed, finding safe spawn...');
      spawnCell = this.findSafeSpawn(spawnCell) || spawnCell;
    }

    const wx = this.toWorldX(spawnCell.x);
    const wy = this.toWorldY(spawnCell.y);

    this.aiRunner = this.add.container(wx, wy).setDepth(8);
    const shadow = this.add.ellipse(0, this.cell * 0.48, this.cell * 0.90, this.cell * 0.30, 0x000000, 0.34).setScale(1, 0.8);
    const sprite = this.add.sprite(0, 0, 'td_runner').setOrigin(0.5);
    sprite.setScale((this.cell / 128) * 3.0);
    this.aiRunner.add([shadow, sprite]);
    this.aiRunner.sprite = sprite;
    this.aiRunner.hbRadius = this.hitboxRadius;
    this.aiRunner.hp = 2; // 2 hits to eliminate
    this.aiRunner.iUntil = 0; // Initialize i-frames to 0
    this.aiRunner.hasStash = false;
    this.aiRunner.carry = null;
  }

  // Add carry package to AI runner
  addAIRunnerCarry(){
    if (!this.aiRunner) return;
    if (this.aiRunner.carry){
      this.aiRunner.remove(this.aiRunner.carry, true);
      this.aiRunner.carry = null;
    }
    const w = this.cell * 0.60;
    const h = this.cell * 0.36;
    const cont = this.add.container(0, -this.cell * 0.30).setDepth(2);
    const aura = this.add.ellipse(0, 0, w * 1.2, h * 1.2, 0x86efac, 0.16).setBlendMode(Phaser.BlendModes.ADD);
    const g = this.add.graphics();
    const tan = 0xC8A97E;
    const tanDark = 0xA9885F;
    const tape = 0x8B7355;
    const gloss = 0xE7D3B5;
    const rad = Math.max(3, Math.floor(this.cell * 0.10));
    g.fillStyle(tan, 1).lineStyle(Math.max(2, Math.floor(this.cell * 0.04)), tanDark, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, rad);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, rad);
    g.fillStyle(tape, 1);
    g.fillRect(-w / 2 + 3, -h * 0.42, w - 6, h * 0.84);
    g.fillStyle(gloss, 0.14);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w * 0.36, h * 0.32, rad * 0.5);
    cont.add([aura, g]);
    this.aiRunner.add(cont);
    this.aiRunner.carry = cont;
  }

  // Pathfinding: get walkable neighbors
  neighbors4(c){
    return [
      {x:c.x+1, y:c.y}, {x:c.x-1, y:c.y}, {x:c.x, y:c.y+1}, {x:c.x, y:c.y-1}
    ].filter(n=>this.isWalkableCell(n.x,n.y));
  }

  // Check if a cell is enclosed (trapped with no exits)
  isEnclosed(cell) {
    if (!this.isWalkableCell(cell.x, cell.y)) return true;
    const neighbors = this.neighbors4(cell);
    return neighbors.length === 0;
  }

  // Find a safe (non-enclosed) spawn near the given cell
  findSafeSpawn(startCell) {
    // BFS to find nearest non-enclosed walkable cell
    const visited = new Set();
    const queue = [startCell];
    const key = (c) => `${c.x},${c.y}`;
    visited.add(key(startCell));

    while (queue.length > 0) {
      const cell = queue.shift();

      // Check if this cell is safe (walkable and not enclosed)
      if (this.isWalkableCell(cell.x, cell.y) && !this.isEnclosed(cell)) {
        return cell;
      }

      // Check all 4 neighbors
      const neighbors = [
        {x: cell.x + 1, y: cell.y},
        {x: cell.x - 1, y: cell.y},
        {x: cell.x, y: cell.y + 1},
        {x: cell.x, y: cell.y - 1}
      ];

      for (const n of neighbors) {
        const k = key(n);
        if (!visited.has(k) && this.inBoundsCell(n.x, n.y)) {
          visited.add(k);
          queue.push(n);
        }
      }
    }

    // Fallback: return any walkable cell
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        if (this.isWalkableCell(x, y) && !this.isEnclosed({x, y})) {
          return {x, y};
        }
      }
    }

    return null;
  }

  // BFS pathfinding to find next step towards goal
  findNextStepTowards(startCell, goalCell){
    if (startCell.x===goalCell.x && startCell.y===goalCell.y) return startCell;
    const key = (c)=>`${c.x},${c.y}`;
    const q=[startCell]; const seen=new Set([key(startCell)]); const parent = new Map();
    while(q.length){
      const cur = q.shift();
      for (const n of this.neighbors4(cur)){
        const k = key(n); if (seen.has(k)) continue;
        seen.add(k); parent.set(k, cur);
        if (n.x===goalCell.x && n.y===goalCell.y){
          let step=n, prev=parent.get(k);
          while (prev && !(prev.x===startCell.x && prev.y===startCell.y)){
            const pk = key(prev); step = prev; prev = parent.get(pk);
          }
          return step || n;
        }
        q.push(n);
      }
    }
    return startCell;
  }

  // Update AI plug behavior (chase and shoot) - Tutorial level difficulty (easier than PvE round 1)
  updatePlugAI(dt){
    if (!this.aiPlug || !this.runner) return;

    const d = this.aiPlug;

    // Determine target (runner or decoy - tutorial AI falls for decoy 80% of the time)
    let targetX = this.runner.x;
    let targetY = this.runner.y;

    if (this.decoySprite && this.decoySprite.active) {
      // Tutorial AI is naive - falls for decoy 80% of the time
      if (Math.random() < 0.8) {
        targetX = this.decoySprite.x;
        targetY = this.decoySprite.y;
      }
    }

    const ax = targetX;
    const ay = targetY;
    const now = performance.now();
    // Tutorial AI plug speed: 3.0 cells/sec (same as PvE round 1, but shoots slower)
    const speed = this.cell * 3.0;

    // Chase the target with improved pathfinding
    const vx = ax - d.x;
    const vy = ay - d.y;
    const dist = Math.hypot(vx, vy);

    // Use pathfinding to navigate around walls better
    const plugCell = this.toCell(d.x, d.y);
    const runnerCell = this.toCell(ax, ay);
    const nextCell = this.findNextStepTowards(plugCell, runnerCell);

    if (nextCell) {
      const targetX = this.toWorldX(nextCell.x);
      const targetY = this.toWorldY(nextCell.y);
      const dx = targetX - d.x;
      const dy = targetY - d.y;
      const moveLen = Math.hypot(dx, dy);

      if (moveLen > 0.1) {
        const normX = dx / moveLen;
        const normY = dy / moveLen;
        const nx = d.x + normX * speed * dt;
        const ny = d.y + normY * speed * dt;

        if (this.canMoveTo(d, nx, d.y)) d.x = nx;
        if (this.canMoveTo(d, d.x, ny)) d.y = ny;
      }
    }

    // Shoot if aligned and in range (check ammo first)
    const maxRange = this.cell * 12;
    if (dist <= maxRange && this.aiPlugAmmo > 0){
      const aligned = (Math.abs(ax - d.x) < this.cell*0.4) || (Math.abs(ay - d.y) < this.cell*0.4);
      if (aligned){
        this._aiPlugTick = (this._aiPlugTick || 0) + dt;
        // Tutorial shoots slower: every 0.9s (vs 0.6s in PvE)
        if (this._aiPlugTick >= 0.9){
          this._aiPlugTick = 0;
          const adx = Math.abs(ax - d.x);
          const ady = Math.abs(ay - d.y);
          const aim = (adx > ady)
            ? {x: Math.sign(ax - d.x), y: 0}
            : {x: 0, y: Math.sign(ay - d.y)};
          // Decrement ammo (fixes infinite ammo bug)
          this.aiPlugAmmo -= 1;
          this.spawnWeaponBurst(d, aim, this.bulletsPlug, this.aiPlugWeapon);
        }
      }
    }
  }

  // Update AI runner behavior (go to stash then extract) - Tutorial difficulty
  updateRunnerAI(delta){
    if (!this.aiRunner) return;
    // Don't update if AI runner is dead
    if (this.aiRunner.hp <= 0) return;

    const now = performance.now();
    const dt = delta / 1000;

    // Replan every 600ms (slower replanning for less optimal pathing)
    if (!this._aiRunnerPlanAt || now >= this._aiRunnerPlanAt){
      this._aiRunnerPlanAt = now + 600;

      const runnerCell = this.toCell(this.aiRunner.x, this.aiRunner.y);
      const targetCell = (!this.aiRunner.hasStash)
        ? this.toCell(this.stash.x, this.stash.y)
        : this.toCell(this.extractPad.x, this.extractPad.y);

      // Add some randomness to make AI take suboptimal routes (easier to intercept)
      let nextCell = this.findNextStepTowards(runnerCell, targetCell);

      // 30% chance to pick a random valid neighbor instead of optimal path (makes it wander)
      if (Math.random() < 0.3) {
        const ns = this.neighbors4(runnerCell);
        if (ns.length) nextCell = ns[(Math.random() * ns.length) | 0];
      }

      if (nextCell.x === runnerCell.x && nextCell.y === runnerCell.y){
        const ns = this.neighbors4(runnerCell);
        if (ns.length) nextCell = ns[(Math.random()*ns.length)|0];
      }

      const dir = { x: Math.sign(nextCell.x - runnerCell.x), y: Math.sign(nextCell.y - runnerCell.y) };
      // Tutorial AI runner speed: 3.0 cells/sec (same as plug, slower than normal 5.0)
      const speed = this.cell * 3.0 * (this.aiRunner.hasStash ? 0.75 : 1);

      this._aiRunnerVX = dir.x * speed;
      this._aiRunnerVY = dir.y * speed;
    }

    // Move AI runner
    const vx = this._aiRunnerVX || 0;
    const vy = this._aiRunnerVY || 0;
    const nx = this.aiRunner.x + vx * dt;
    const ny = this.aiRunner.y + vy * dt;

    if (this.canMoveTo(this.aiRunner, nx, this.aiRunner.y)) this.aiRunner.x = nx;
    if (this.canMoveTo(this.aiRunner, this.aiRunner.x, ny)) this.aiRunner.y = ny;
  }

  // Spawn weapon burst (bullets) - supports spread for shotgun
  spawnWeaponBurst(origin, aim, group, weapon = 'pistol'){
    // Play gun fire sound
    try { this.audio?.play('gun_fire', { volume: 0.7, rateRand: 0.08 }); } catch {}

    const stats = this.weaponStats?.[weapon] || this.weaponStats?.pistol;
    const ax = aim?.x ?? 0;
    const ay = aim?.y ?? 0;
    const len = Math.hypot(ax, ay) || 1;
    const baseAngle = Math.atan2(ay / len, ax / len);
    const pellets = stats?.spreadAngles?.length ? stats.spreadAngles : [0];

    // High-contrast bullets: choose palette + blend based on floor brightness
    const isLightFloor = (() => {
      if (Array.isArray(this.theme?.checkerColors) && this.theme.checkerColors.length >= 2){
        const lum = (hex) => { const r=(hex>>16)&255,g=(hex>>8)&255,b=hex&255; return (0.2126*r+0.7152*g+0.0722*b)/255; };
        const avg = this.theme.checkerColors.reduce((s,c)=> s + lum(c), 0) / this.theme.checkerColors.length;
        return avg > 0.7;
      }
      if (typeof this.theme?.floorTint === 'number'){
        const r=(this.theme.floorTint>>16)&255,g=(this.theme.floorTint>>8)&255,b=this.theme.floorTint&255;
        const L=(0.2126*r+0.7152*g+0.0722*b)/255; return L > 0.7;
      }
      return false;
    })();
    const fillColor = isLightFloor ? 0xef4444 : 0xffffff;
    const useNormalBlend = isLightFloor; // avoid washout on white floors

    pellets.forEach((offset) => {
      const ang = baseAngle + Phaser.Math.DegToRad(offset);
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const speed = stats?.speed ?? 300;

      const bullet = this.add.circle(origin.x, origin.y, Math.max(3, Math.floor(this.cell*0.12)), fillColor, 1)
        .setDepth(9)
        .setBlendMode(useNormalBlend ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);

      bullet.vx = dx * speed;
      bullet.vy = dy * speed;
      bullet.life = 1200;

      group.push(bullet);
    });
  }

  // Update all bullets
  updateBullets(delta){
    const dt = delta / 1000;

    // Update plug bullets (stage 4)
    if (this.bulletsPlug){
      for (let i = this.bulletsPlug.length - 1; i >= 0; i--){
        const b = this.bulletsPlug[i];
        b.x += (b.vx || 0) * dt;
        b.y += (b.vy || 0) * dt;
        b.life -= delta;

        const blocked = this.isWallAtWorld(b.x, b.y);
        if (blocked || b.life <= 0){
          b.destroy();
          this.bulletsPlug.splice(i, 1);
        }
      }
    }

    // Update player bullets (stage 5)
    if (this.bulletsPlayer){
      for (let i = this.bulletsPlayer.length - 1; i >= 0; i--){
        const b = this.bulletsPlayer[i];
        b.x += (b.vx || 0) * dt;
        b.y += (b.vy || 0) * dt;
        b.life -= delta;

        const blocked = this.isWallAtWorld(b.x, b.y);
        if (blocked || b.life <= 0){
          b.destroy();
          this.bulletsPlayer.splice(i, 1);
        }
      }
    }
  }

  // Handle player shooting for stage 5
  handlePlayerShooting(){
    if (!this.runner) return;

    const now = performance.now();

    // Desktop: click to shoot
    if (this.sys.game.device.os.desktop){
      if (this.input.activePointer.isDown){
        if (now >= (this._playerShootCooldown || 0)){
          this._playerShootCooldown = now + 250; // 250ms cooldown

          // Aim from mouse position
          const pointer = this.input.activePointer;
          const dx = pointer.worldX - this.runner.x;
          const dy = pointer.worldY - this.runner.y;
          const len = Math.hypot(dx, dy) || 1;
          const aim = { x: dx / len, y: dy / len };

          this.spawnWeaponBurst(this.runner, aim, this.bulletsPlayer, this.selectedWeapon);
        }
      }
    } else {
      // Mobile: tap to shoot in current aim direction
      if (this._mobileShootRequested){
        this._mobileShootRequested = false;
        if (now >= (this._playerShootCooldown || 0)){
          this._playerShootCooldown = now + 250;
          const aim = this.playerAim || { x: 1, y: 0 };
          this.spawnWeaponBurst(this.runner, aim, this.bulletsPlayer, this.selectedWeapon);
        }
      }
    }
  }

  // Check if two sprites overlap (simple AABB collision)
  spritesOverlap(a, b){
    if (!a || !b) return false;
    const r1 = (a.hbRadius || this.cell * 0.4);
    const r2 = (b.hbRadius || this.cell * 0.4);
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    return dist < (r1 + r2);
  }

  // Can damage target (check i-frames)
  canDamage(who){
    return performance.now() >= (who.iUntil || 0);
  }

  // Hit target with bullet
  hitTarget(who){
    if (!this.canDamage(who)) return;

    who.hp = (who.hp || 0) - 1;
    who.iUntil = performance.now() + 600; // 600ms i-frames

    // Play impact and damage sounds
    try { this.audio?.play('impact', { volume: 0.85, rateRand: 0.05 }); } catch {}
    try { this.audio?.play('ouch', { volume: 0.7, rateRand: 0.03 }); } catch {}

    // Flash effect
    const originalAlpha = who.alpha;
    this.tweens.add({
      targets: who,
      alpha: 0.3,
      duration: 60,
      yoyo: true,
      repeat: 3,
      onComplete: () => who.setAlpha(originalAlpha)
    });

    this.cameras.main.shake(60, 0.004);
  }

  handleMovement(dt){
    // Stage 5 is plug mode, stages 1-4 are runner mode
    // Runner: 7.0 cells/sec, Plug: 4.8 cells/sec (matches main game)
    const isPlugMode = this.stageIdx === 5;
    let baseSpeed = isPlugMode ? (this.cell * 4.8) : (this.cell * 7.0);

    // Apply carry slow: 15% slower when carrying package (stages 2-4)
    if (!isPlugMode && this.hasPackage) {
      baseSpeed *= 0.85;
    }

    const speed = baseSpeed;
    let vx = 0;
    let vy = 0;
    const k = this.cursors;
    const wasd = this.wasdKeys || {};
    const leftDown = k.left?.isDown || wasd.A?.isDown;
    const rightDown = k.right?.isDown || wasd.D?.isDown;
    const upDown = k.up?.isDown || wasd.W?.isDown;
    const downDown = k.down?.isDown || wasd.S?.isDown;
    const usingKeys = leftDown || rightDown || upDown || downDown;

    if (usingKeys){
      // Cardinal movement only (matches main game - no diagonals)
      // Prioritize horizontal over vertical when both pressed
      let dir = { x: 0, y: 0 };
      if (leftDown) dir.x = -1;
      else if (rightDown) dir.x = 1;

      // Only allow vertical if no horizontal input
      if (dir.x === 0) {
        if (upDown) dir.y = -1;
        else if (downDown) dir.y = 1;
      }

      if (dir.x !== 0 || dir.y !== 0){
        vx = dir.x * speed;
        vy = dir.y * speed;
        this.playerDrift = dir;
        this.playerAim = dir;
        if (this.stageIdx !== 5) this._runnerInputDir = { x: dir.x, y: dir.y };
        this.userTookOver = true;
      }
    } else {
      const allowDrift = this.autoDrift !== false;
      const fallback = { x: 1, y: 0 };
      const drift = allowDrift ? (this.playerDrift || this._initDrift || fallback) : { x: 0, y: 0 };
      const aim = allowDrift ? (this.playerAim || drift) : drift;
      const lenAim = Math.hypot(aim.x, aim.y);
      if (lenAim > 0.0001){
        vx = (aim.x / lenAim) * speed;
        vy = (aim.y / lenAim) * speed;
        if (this.stageIdx !== 5) this._runnerInputDir = { x: aim.x / lenAim, y: aim.y / lenAim };
      }
    }

    // Softly pull toward corridor centerlines for smoother navigation in narrow passages.
    // Apply this assist whether moving via keys or via aim/drift (no keys).  This matches the PvP
    // feel, where the runner gently snaps to corridor centers even when manually steered.
    // Only apply corridor-assist when not using keyboard input.  In PvP, the
    // runner snaps toward corridor centers only when moving via aim/drift (no keys),
    // allowing smooth diagonal movement when two keys are pressed.  Applying the
    // assist unconditionally caused a clunky, step-like motion when pressing
    // multiple keys (e.g., down+right) in the tutorial.  Restricting the
    // assist to non-keyboard movement resolves this and matches PvP.
    // In stage 4, disable corridor assist when near AI plug to prevent runner from following plug movement
    const nearAIPlug = this.stageIdx === 4 && this.aiPlug && Math.hypot(this.runner.x - this.aiPlug.x, this.runner.y - this.aiPlug.y) < this.cell * 3;
    if (!usingKeys && !nearAIPlug) {
      const dirAssist = (Math.abs(vx) > Math.abs(vy))
        ? { x: Math.sign(vx), y: 0 }
        : (Math.abs(vy) > 0 ? { x: 0, y: Math.sign(vy) } : { x: 0, y: 0 });
      if (dirAssist.x || dirAssist.y) corridorAssist(this, this.runner, dirAssist, dt);
    }

    const now = performance.now();

    // Determine whether runner powers are available.  Powers are only enabled in stage 3
    // and after the player has chosen their abilities.  In earlier stages double-tap
    // behaviour is ignored.
    const powersActive = (this.stageIdx >= 3);
    const tapDir = (Math.abs(vx) + Math.abs(vy) > 0.0001)
      ? { x: Math.sign(vx), y: Math.sign(vy) }
      : null;
    if (!usingKeys){
      this._lastTap = null;
    } else if (tapDir){
      if (!this._lastTap || now - this._lastTap.t > 340 || this._lastTap.dir.x !== tapDir.x || this._lastTap.dir.y !== tapDir.y){
        this._lastTap = { t: now, dir: tapDir };
      } else {
        this._lastTap = null;
        // On double-tap, execute the next selected power if available
        if (powersActive && this.runnerPowersSelected){
          this.activateNextRunnerPower();
        }
      }
    }

    // Keyboard shortcuts for powers: SHIFT triggers dash, SPACE triggers phase
    if (powersActive && this.dashKey?.isDown){
      this.activateRunnerPowerByName('dash');
    }
    if (powersActive && this.phaseKey?.isDown){
      this.activateRunnerPowerByName('phase');
    }

    // Phase state: become intangible while _phaseUntil is in the future
    this._phaseActive = (now < (this._phaseUntil || 0));
    if (this.runner?.sprite){
      this.runner.sprite.setAlpha(this._phaseActive ? 0.35 : 1);
    }

    // Unstuck runner if inside wall and not phasing (prevents getting stuck after phase ends)
    if (!this._phaseActive && this.isWallAtWorld?.(this.runner.x, this.runner.y)){
      this.ensureUnstuck(this.runner);
    }

    // We no longer apply a speed multiplier for dash because dash teleports instead.

    const dxTot = vx * dt;
    const dyTot = vy * dt;
    const stepMax = this.cell * 0.28;
    const moveAxis = (amt, axis) => {
      let rem = amt;
      const dir = Math.sign(rem) || 0;
      const step = stepMax * dir;
      let guard = 0;
      while (Math.abs(rem) > 0.0001 && guard++ < 32){
        const d = (Math.abs(rem) > stepMax) ? step : rem;
        const nx = axis === 'x' ? this.runner.x + d : this.runner.x;
        const ny = axis === 'y' ? this.runner.y + d : this.runner.y;
        if (this.canMoveTo(this.runner, nx, ny)){
          if (axis === 'x') this.runner.x = nx;
          else this.runner.y = ny;
          rem -= d;
        } else {
          break;
        }
      }
    };

    const preX = this.runner.x;
    const preY = this.runner.y;
    moveAxis(dxTot, 'x');
    moveAxis(dyTot, 'y');

    if (Math.hypot(this.runner.x - preX, this.runner.y - preY) < 0.5 && (Math.abs(vx) + Math.abs(vy) > 0)){
      const c = this.toCell(this.runner.x, this.runner.y);
      const cx = this.toWorldX(c.x);
      const cy = this.toWorldY(c.y);
      const ux = cx - this.runner.x;
      const uy = cy - this.runner.y;
      const ul = Math.hypot(ux, uy) || 1;
      const nudge = Math.min(this.cell * 0.20, ul);
      const nx = this.runner.x + (ux / ul) * nudge;
      const ny = this.runner.y + (uy / ul) * nudge;
      if (this.canMoveTo(this.runner, nx, ny)){
        this.runner.x = nx;
        this.runner.y = ny;
      }
    }

    const spdLen = Math.hypot(vx, vy);
    if (spdLen > 0.0001){
      const norm = { x: vx / spdLen, y: vy / spdLen };
      this._runnerMoveDir = norm;
      if (usingKeys || this.userTookOver) this._runnerLastAim = norm;
    }
  }

  update(_, delta){
    if (!this.runner) return;
    const dt = delta / 1000;
    if (this.pausedForModal) return;

    // Handle movement for all stages (player controls runner in 1-4, plug in 5)
    this.handleMovement(dt);

    // Stage 4: Update AI plug and bullets
    if (this.stageIdx === 4){
      this.updatePlugAI(dt);
      this.updateBullets(delta);

      // Check if plug bullets hit the runner
      if (this.bulletsPlug){
        for (let i = this.bulletsPlug.length - 1; i >= 0; i--){
          const b = this.bulletsPlug[i];
          if (this.spritesOverlap(b, this.runner)){
            b.destroy();
            this.bulletsPlug.splice(i, 1);
            this.hitTarget(this.runner);
            this._playerHP = (this._playerHP || 2) - 1;

            // Player loses after HP reaches 0
            if (this._playerHP <= 0){
              this.toast('You were eliminated!', 1500, '#f87171');
              this.time.delayedCall(1600, () => this.startStage(4));
              return;
            }
          }
        }
      }
    }

    // Stage 5: Update AI runner, player shooting, and bullets
    if (this.stageIdx === 5){
      this.updateRunnerAI(delta);
      this.handlePlayerShooting();
      this.updateBullets(delta);

      // Check if player bullets hit the AI runner
      if (this.bulletsPlayer && this.aiRunner){
        for (let i = this.bulletsPlayer.length - 1; i >= 0; i--){
          const b = this.bulletsPlayer[i];
          if (this.spritesOverlap(b, this.aiRunner)){
            b.destroy();
            this.bulletsPlayer.splice(i, 1);
            this.hitTarget(this.aiRunner);

            // Player wins if AI runner is eliminated
            if (this.aiRunner.hp <= 0){
              // Immediately stop AI runner and hide it
              this.aiRunner.setVisible(false);
              // Stop AI update by clearing velocity
              this._aiRunnerVX = 0;
              this._aiRunnerVY = 0;

              this.toast('Defender wins!', 800, '#86efac');
              // Short delay for toast to be visible, then immediately show modal
              this.time.delayedCall(300, () => this.goNext());
              return;
            }
          }
        }
      }

      // Check if AI runner picked up the stash
      if (!this.aiRunner.hasStash && this.stash && this.overlaps(this.aiRunner, this.stash)){
        this.aiRunner.hasStash = true;
        this.addAIRunnerCarry();
        this.stash?.setVisible(false);
        if (this._stashHaloG) { this._stashHaloG.clear(); this._stashHaloG = null; }
        // Start engine sounds when AI runner gets stash
        try { this.audio?.startEngineLoop(); } catch {}
        this.toast('Runner got the stash!', 1200, '#ffd166');
      }

      // Check if AI runner extracted (player loses)
      if (this.aiRunner.hasStash && this.overlaps(this.aiRunner, this.extractPad)){
        this.toast('Runner extracted! You lose.', 1500, '#f87171');
        this.time.delayedCall(1600, () => this.startStage(5));
        return;
      }
    }

    // Draw stash halo for stages 2, 3, 4, 5
    if ((this.stageIdx === 2 || this.stageIdx === 3 || this.stageIdx === 4 || this.stageIdx === 5) && this._stashHaloG) {
      const g = this._stashHaloG;
      g.clear();
      const t = (performance.now() % 1200) / 1200;
      const r = this.cell * (0.65 + 0.15 * Math.sin(t * Math.PI * 2));
      const draw = (obj) => {
        if (!obj) return;
        g.lineStyle(3, 0x86efac, 0.9);
        g.strokeCircle(obj.x, obj.y, r);
        g.lineStyle(1, 0x86efac, 0.45);
        g.strokeCircle(obj.x, obj.y, r + 6);
      };
      draw(this.stash);
      draw(this.bunkStash);
    }

    // Update decoy sprite (if active)
    if (this.decoySprite) {
      const now = performance.now();
      if (now >= this.decoyExpiresAt) {
        // Decoy expired - fade out and destroy
        this.tweens.add({
          targets: this.decoySprite,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            this.decoySprite?.destroy();
            this.decoySprite = null;
          }
        });
      } else {
        // Move decoy in its direction
        const vx = this.decoyVelocity.x * dt;
        const vy = this.decoyVelocity.y * dt;
        const newX = this.decoySprite.x + vx;
        const newY = this.decoySprite.y + vy;
        // Check if new position is walkable
        if (!this.isWallAtWorld(newX, newY)) {
          this.decoySprite.x = newX;
          this.decoySprite.y = newY;
        } else {
          // Hit a wall - stop the decoy
          this.decoyVelocity = { x: 0, y: 0 };
        }
      }
    }

    // Update player sprite animation and rotation
    if (this.runner?.sprite){
      const dx = this.runner.x - (this.lastPos?.x ?? this.runner.x);
      const dy = this.runner.y - (this.lastPos?.y ?? this.runner.y);
      const spd = Math.hypot(dx, dy);
      if (spd > 0.001){
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        this.runner.sprite.setAngle(ang);
      }
      this._stepElapsed = (this._stepElapsed || 0) + dt;
      if (spd > 0.5){
        if (this._stepElapsed >= 0.10){
          this._stepElapsed = 0;
          this._stepToggle = !this._stepToggle;
          const baseTexture = (this.stageIdx === 5) ? 'td_plug' : 'td_runner';
          const stepTexture = (this.stageIdx === 5) ? 'td_plug_step' : 'td_runner_step';
          this.runner.sprite.setTexture(this._stepToggle ? stepTexture : baseTexture);
        }
      } else {
        const baseTexture = (this.stageIdx === 5) ? 'td_plug' : 'td_runner';
        if (this.runner.sprite.texture?.key !== baseTexture){
          this.runner.sprite.setTexture(baseTexture);
        }
      }
    }

    // Update AI plug sprite animation (stage 4)
    if (this.stageIdx === 4 && this.aiPlug?.sprite){
      const lastPlugPos = this._lastPlugPos || { x: this.aiPlug.x, y: this.aiPlug.y };
      const dx = this.aiPlug.x - lastPlugPos.x;
      const dy = this.aiPlug.y - lastPlugPos.y;
      const spd = Math.hypot(dx, dy);
      if (spd > 0.001){
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        this.aiPlug.sprite.setAngle(ang);
      }
      this._plugStepElapsed = (this._plugStepElapsed || 0) + dt;
      if (spd > 0.5){
        if (this._plugStepElapsed >= 0.10){
          this._plugStepElapsed = 0;
          this._plugStepToggle = !this._plugStepToggle;
          this.aiPlug.sprite.setTexture(this._plugStepToggle ? 'td_plug_step' : 'td_plug');
        }
      } else if (this.aiPlug.sprite.texture?.key !== 'td_plug'){
        this.aiPlug.sprite.setTexture('td_plug');
      }
      this._lastPlugPos = { x: this.aiPlug.x, y: this.aiPlug.y };
    }

    // Update AI runner sprite animation (stage 5)
    if (this.stageIdx === 5 && this.aiRunner?.sprite){
      const lastRunnerPos = this._lastAIRunnerPos || { x: this.aiRunner.x, y: this.aiRunner.y };
      const dx = this.aiRunner.x - lastRunnerPos.x;
      const dy = this.aiRunner.y - lastRunnerPos.y;
      const spd = Math.hypot(dx, dy);
      if (spd > 0.001){
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        this.aiRunner.sprite.setAngle(ang);
      }
      this._runnerStepElapsed = (this._runnerStepElapsed || 0) + dt;
      if (spd > 0.5){
        if (this._runnerStepElapsed >= 0.10){
          this._runnerStepElapsed = 0;
          this._runnerStepToggle = !this._runnerStepToggle;
          this.aiRunner.sprite.setTexture(this._runnerStepToggle ? 'td_runner_step' : 'td_runner');
        }
      } else if (this.aiRunner.sprite.texture?.key !== 'td_runner'){
        this.aiRunner.sprite.setTexture('td_runner');
      }
      this._lastAIRunnerPos = { x: this.aiRunner.x, y: this.aiRunner.y };
    }
    if (this.stageIdx === 1){
      // In stage 1, reaching the car triggers an extraction animation rather than an instant transition
      if (this.overlaps(this.runner, this.extractPad)) this.playCarDepartAndGoNext();
    } else if (this.stageIdx === 2){
      if (!this.hasPackage){
        if (this.stash && this.overlaps(this.runner, this.stash)){
          this.hasPackage = true;
          this.addCarry();
          this.stash?.setVisible(false);
          if (this.bunkStash){ this.bunkStash.destroy(); this.bunkStash = null; }
          // Clear stash halo graphics
          if (this._stashHaloG) { this._stashHaloG.clear(); this._stashHaloG = null; }
          // Play pickup sounds and start engine
          try { this.audio?.play('pickup', { volume: 0.9, rateRand: 0.04 }); } catch {}
          try { this.audio?.play('spickup', { volume: 0.85, rateRand: 0.03 }); } catch {}
          try { this.audio?.startEngineLoop(); } catch {}
          this.toast('Nice. Get to the car.');
          this.showCarBeacon();
          // Turn on car lights once package is collected
          this.setCarLights(true);
        } else if (this.bunkStash && this.overlaps(this.runner, this.bunkStash)){
          // Play bunk pickup sound
          try { this.audio?.play('bpickup', { volume: 0.85, rateRand: 0.03 }); } catch {}
          this.toast('BUNK!', 1200, '#f87171');
          this.showBunkPopup(this.bunkStash.x, this.bunkStash.y);
          const decoy = this.bunkStash;
          this.bunkStash = null;
          this.tweens.add({ targets: decoy, alpha: 0, scale: 0.86, duration: 800, ease: 'Cubic.easeOut', onComplete: () => decoy.destroy() });
        }
      } else if (this.overlaps(this.runner, this.extractPad)){
        // After picking up the package, reaching the car triggers the departure animation
        this.playCarDepartAndGoNext();
      }
    } else if (this.stageIdx === 3) {
      // In the power-up stage, spawn stashes normally and allow players to pick
      // them up.  Collecting the real stash awards the package, just like in
      // stage 2, but extraction is only allowed after both dash and phase have
      // been demonstrated.  Fake stashes still show a BUNK message.
      if (!this.hasPackage) {
        if (this.stash && this.overlaps(this.runner, this.stash)) {
          this.hasPackage = true;
          this.addCarry();
          this.stash?.setVisible(false);
          if (this.bunkStash) { this.bunkStash.destroy(); this.bunkStash = null; }
          // Clear stash halo graphics
          if (this._stashHaloG) { this._stashHaloG.clear(); this._stashHaloG = null; }
          // Play pickup sounds
          try { this.audio?.play('pickup', { volume: 0.9, rateRand: 0.04 }); } catch {}
          try { this.audio?.play('spickup', { volume: 0.85, rateRand: 0.03 }); } catch {}
          // Only start engine if both power slots have been consumed
          if (this.runnerPowersConsumed && this.runnerPowersConsumed[0] && this.runnerPowersConsumed[1]) {
            try { this.audio?.startEngineLoop(); } catch {}
          }
          this.toast('Nice. Get to the car.');
          this.showCarBeacon();
        } else if (this.bunkStash && this.overlaps(this.runner, this.bunkStash)) {
          // Play bunk pickup sound
          try { this.audio?.play('bpickup', { volume: 0.85, rateRand: 0.03 }); } catch {}
          this.toast('BUNK!', 1200, '#f87171');
          this.showBunkPopup(this.bunkStash.x, this.bunkStash.y);
          const decoy = this.bunkStash;
          this.bunkStash = null;
          this.tweens.add({ targets: decoy, alpha: 0, scale: 0.86, duration: 800, ease: 'Cubic.easeOut', onComplete: () => decoy.destroy() });
        }
      }
      // Turn on car lights once both power slots have been consumed. Boarding
      // the car is only allowed after using both powers; the player
      // can still collect the stash before using powers but cannot depart.
      const bothPowersUsed = this.runnerPowersConsumed && this.runnerPowersConsumed[0] && this.runnerPowersConsumed[1];
      if (bothPowersUsed) this.setCarLights(true);
      if (bothPowersUsed && this.overlaps(this.runner, this.extractPad)) {
        // Final stage: after using both powers, board the car and depart
        this.playCarDepartAndGoNext();
      }
    } else if (this.stageIdx === 4){
      // Stage 4: Player as runner vs AI plug - same stash logic as stages 2 & 3
      if (!this.hasPackage){
        if (this.stash && this.overlaps(this.runner, this.stash)){
          this.hasPackage = true;
          this.addCarry();
          this.stash?.setVisible(false);
          if (this.bunkStash){ this.bunkStash.destroy(); this.bunkStash = null; }
          if (this._stashHaloG) { this._stashHaloG.clear(); this._stashHaloG = null; }
          // Play pickup sounds and start engine
          try { this.audio?.play('pickup', { volume: 0.9, rateRand: 0.04 }); } catch {}
          try { this.audio?.play('spickup', { volume: 0.85, rateRand: 0.03 }); } catch {}
          try { this.audio?.startEngineLoop(); } catch {}
          this.toast('Got the stash! Get to the car.');
          this.showCarBeacon();
          // Turn on car lights once package is collected
          this.setCarLights(true);
        } else if (this.bunkStash && this.overlaps(this.runner, this.bunkStash)){
          // Play bunk pickup sound
          try { this.audio?.play('bpickup', { volume: 0.85, rateRand: 0.03 }); } catch {}
          this.toast('BUNK!', 1200, '#f87171');
          this.showBunkPopup(this.bunkStash.x, this.bunkStash.y);
          const decoy = this.bunkStash;
          this.bunkStash = null;
          this.tweens.add({ targets: decoy, alpha: 0, scale: 0.86, duration: 800, ease: 'Cubic.easeOut', onComplete: () => decoy.destroy() });
        }
      } else if (this.overlaps(this.runner, this.extractPad)){
        // Player successfully extracted with stash
        this.playCarDepartAndGoNext();
      }
    }
    // Note: Stage 5 logic is handled earlier in the update method

    // Update flame trails for runner and AI characters
    this.updateRunnerTrail(dt);
    if (this.aiPlug) this.updatePlugTrail(dt);
    if (this.aiRunner) this.updateAIRunnerTrail(dt);

    this.lastPos = { x: this.runner.x, y: this.runner.y };
  }
  overlaps(a, b){
    if (!a || !b) return false;
    const ra = new Phaser.Geom.Rectangle(a.x - 12, a.y - 12, 24, 24);
    const rb = new Phaser.Geom.Rectangle(b.x - 12, b.y - 12, 24, 24);
    return Phaser.Geom.Intersects.RectangleToRectangle(ra, rb);
  }

  /* ----------------- Movement Trails (Flame-like) ----------------- */
  updateRunnerTrail(dt){
    if (!this.runner || !this.runner.visible) return;

    // Initialize trail tracking
    if (!this._runnerTrailTimer) this._runnerTrailTimer = 0;
    if (!this._runnerLastTrailPos) this._runnerLastTrailPos = { x: this.runner.x, y: this.runner.y };

    this._runnerTrailTimer += dt * 1000; // Convert to milliseconds

    // Emit trail particles every 50ms when moving
    if (this._runnerTrailTimer >= 50) {
      this._runnerTrailTimer = 0;

      const dx = this.runner.x - this._runnerLastTrailPos.x;
      const dy = this.runner.y - this._runnerLastTrailPos.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 1) {
        // Normalize direction to get unit vector
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Place trail BEHIND the character (opposite of movement direction)
        const baseX = this._runnerLastTrailPos.x;
        const baseY = this._runnerLastTrailPos.y;

        this._runnerLastTrailPos = { x: this.runner.x, y: this.runner.y };

        // Create 2 particles behind the character
        for (let i = 0; i < 2; i++) {
          // Small perpendicular offset for width
          const perpX = -dirY * (Math.random() - 0.5) * this.cell * 0.3;
          const perpY = dirX * (Math.random() - 0.5) * this.cell * 0.3;

          // In stage 5, player is plug (red trail), otherwise runner (blue trail)
          const colors = (this.stageIdx === 5)
            ? [0xef4444, 0xdc2626, 0xb91c1c]  // Red for plug
            : [0x60a5fa, 0x3b82f6, 0x2563eb]; // Blue for runner
          const color = colors[Math.floor(Math.random() * colors.length)];

          const trail = this.add.circle(
            baseX + perpX,
            baseY + perpY,
            this.cell * 0.35,
            color,
            0.7
          ).setDepth(1);

          // Fade and shrink
          this.tweens.add({
            targets: trail,
            alpha: 0,
            scale: 0.2,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => trail.destroy()
          });
        }
      }
    }
  }

  updatePlugTrail(dt){
    if (!this.aiPlug || !this.aiPlug.sprite || !this.aiPlug.sprite.visible) return;

    // Initialize trail tracking
    if (!this._plugTrailTimer) this._plugTrailTimer = 0;
    if (!this._plugLastTrailPos) this._plugLastTrailPos = { x: this.aiPlug.x, y: this.aiPlug.y };

    this._plugTrailTimer += dt * 1000; // Convert to milliseconds

    // Emit trail particles every 50ms when moving
    if (this._plugTrailTimer >= 50) {
      this._plugTrailTimer = 0;

      const dx = this.aiPlug.x - this._plugLastTrailPos.x;
      const dy = this.aiPlug.y - this._plugLastTrailPos.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 1) {
        // Normalize direction to get unit vector
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Place trail BEHIND the character (opposite of movement direction)
        const baseX = this._plugLastTrailPos.x;
        const baseY = this._plugLastTrailPos.y;

        this._plugLastTrailPos = { x: this.aiPlug.x, y: this.aiPlug.y };

        // Create 2 particles behind the character
        for (let i = 0; i < 2; i++) {
          // Small perpendicular offset for width
          const perpX = -dirY * (Math.random() - 0.5) * this.cell * 0.3;
          const perpY = dirX * (Math.random() - 0.5) * this.cell * 0.3;

          // Red flame colors - brighter to darker
          const colors = [0xef4444, 0xdc2626, 0xb91c1c];
          const color = colors[Math.floor(Math.random() * colors.length)];

          const trail = this.add.circle(
            baseX + perpX,
            baseY + perpY,
            this.cell * 0.35,
            color,
            0.7
          ).setDepth(1);

          // Fade and shrink
          this.tweens.add({
            targets: trail,
            alpha: 0,
            scale: 0.2,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => trail.destroy()
          });
        }
      }
    }
  }

  updateAIRunnerTrail(dt){
    if (!this.aiRunner || !this.aiRunner.sprite || !this.aiRunner.sprite.visible) return;

    // Initialize trail tracking
    if (!this._aiRunnerTrailTimer) this._aiRunnerTrailTimer = 0;
    if (!this._aiRunnerLastTrailPos) this._aiRunnerLastTrailPos = { x: this.aiRunner.x, y: this.aiRunner.y };

    this._aiRunnerTrailTimer += dt * 1000; // Convert to milliseconds

    // Emit trail particles every 50ms when moving
    if (this._aiRunnerTrailTimer >= 50) {
      this._aiRunnerTrailTimer = 0;

      const dx = this.aiRunner.x - this._aiRunnerLastTrailPos.x;
      const dy = this.aiRunner.y - this._aiRunnerLastTrailPos.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 1) {
        // Normalize direction to get unit vector
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Place trail BEHIND the character (opposite of movement direction)
        const baseX = this._aiRunnerLastTrailPos.x;
        const baseY = this._aiRunnerLastTrailPos.y;

        this._aiRunnerLastTrailPos = { x: this.aiRunner.x, y: this.aiRunner.y };

        // Create 2 particles behind the character
        for (let i = 0; i < 2; i++) {
          // Small perpendicular offset for width
          const perpX = -dirY * (Math.random() - 0.5) * this.cell * 0.3;
          const perpY = dirX * (Math.random() - 0.5) * this.cell * 0.3;

          // AI runner always has blue trail (they're always a runner)
          const colors = [0x60a5fa, 0x3b82f6, 0x2563eb];
          const color = colors[Math.floor(Math.random() * colors.length)];

          const trail = this.add.circle(
            baseX + perpX,
            baseY + perpY,
            this.cell * 0.35,
            color,
            0.7
          ).setDepth(1);

          // Fade and shrink
          this.tweens.add({
            targets: trail,
            alpha: 0,
            scale: 0.2,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => trail.destroy()
          });
        }
      }
    }
  }
}

export default TutorialMiniScene;






