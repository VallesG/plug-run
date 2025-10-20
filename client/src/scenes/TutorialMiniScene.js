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
  const c = scene.toCell(sprite.x, sprite.y);
  const cx = scene.toWorldX(c.x);
  const cy = scene.toWorldY(c.y);
  const bias = scene.cell * 6;
  if (dir.x !== 0){
    const dy = cy - sprite.y;
    sprite.y += Math.sign(dy) * Math.min(Math.abs(dy), bias * dt);
  } else if (dir.y !== 0){
    const dx = cx - sprite.x;
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
  const cont = scene.add.container(cx, cy).setDepth(12);
  const g = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const beamColor = 0x93c5fd;
  if (side === 'N' || side === 'S'){
    const s = (side === 'N') ? -1 : 1;
    g.fillStyle(beamColor, 0.25).fillTriangle(-scene.cell * 0.35, 0, scene.cell * 0.35, 0, 0, s * scene.cell * 0.9);
  } else {
    const s = (side === 'W') ? -1 : 1;
    g.fillStyle(beamColor, 0.25).fillTriangle(0, -scene.cell * 0.35, 0, scene.cell * 0.35, s * scene.cell * 1.2, 0);
  }
  cont.add(g);
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
      this.load.audio('learn_beat', ['/audio/learn_beat.ogg', '/audio/learn_beat.mp3']);
      this.load.audio('pickup', ['/audio/pickup.ogg', '/audio/pickup.mp3']);
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
          // Continuously update aim toward the current touch relative to the runner when
          // the swipe has moved far enough from its start.  Use a smaller threshold than
          // before (approx one third of a tile or 10px) to improve responsiveness and
          // align with PvP behaviour on mobile.
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
            // Treat as a directional swipe: set aim and drift based on the swipe vector
            const len = moved || 1;
            const nx = dx / len;
            const ny = dy / len;
            this.playerAim = { x: nx, y: ny };
            // In stage 5 (plug), only update aim, not drift (plug doesn't auto-move)
            if (this.stageIdx !== 5) {
              this.playerDrift = { x: nx, y: ny };
            }
            if (this.stageIdx !== 5) {
              this._runnerInputDir = { x: nx, y: ny };
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
    this.carLights.setVisible(false);

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

    // Test all 4 cardinal directions
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
        'Get the stash, then escape to the car.',
        'Fake stashes do not count.'
      ];
      // Apply a smaller scale so the dialog fits comfortably on narrow screens.  A
      // scale of around 0.65 trims the title and content sizes while retaining
      // readability.  Should further adjustments be needed, update this value.
      this.showModal('Stash & BUNK', stashLines, 'Go', () => this.resumeFromModal(), { scale: 0.65 });
    } else if (idx === 3){
      // In the power-up stage, introduce the available abilities.  List phase, dash, and decoy
      // with brief descriptions.  After closing the intro modal, present a choice modal.
      const desktop = this.sys.game.device.os.desktop;
      const introLines = [
        'PHASE: phase through walls',
        'DASH: quickly dash in a direction',
        'DECOY: send out a decoy runner',
        '',
        desktop ? '' : 'Tip: Double tap screen to activate'
      ].filter(line => line !== '');
      this.showModal('Power-ups', introLines, 'Go', () => {
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
    const dlg = this.rexUI.add.dialog({
      x: this.scale.width / 2,
      y: this.scale.height * 0.42,
      background: this.rexUI.add.roundRectangle(0, 0, 0, 0, 10, 0x0f172a, 0.96).setStrokeStyle(2, 0x2f3650),
      title: this.add.text(0, 0, title, { color: '#cbd1ff', fontSize: Math.max(22, Math.floor(this.scale.height * 0.036 * scaleFac)) + 'px', fontStyle: 'bold' }),
      content: this.add.text(0, 0, lines.join('\n'), { color: '#aab5ff', fontSize: Math.max(15, Math.floor(this.scale.height * 0.024 * scaleFac)) + 'px' }),
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
      space: { title: 12, content: 12, action: 10, left: 18, right: 18, top: 16, bottom: 16 }
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
      { key:'decoy', label:'DECOY', symbol:'🎭', color:'#60a5fa', disabled:true }
    ];
    const chosen = [];
    // Horizontal spacing
    const btnW = panelW / opts.length;
    const btnH = 80;
    // Keep a list of UI elements for cleanup later
    const elements = [];
    opts.forEach((opt, idx) => {
      const x = panel.x - panelW/2 + btnW * (idx + 0.5);
      const y = panel.y + panelH/2 - btnH/2 - 16;
      const rect = this.add.rectangle(x, y, btnW - 12, btnH, 0x14202f, 1)
        .setStrokeStyle(2, opt.disabled ? 0x374151 : parseInt(opt.color.replace('#', '0x')))
        .setDepth(20002)
        .setInteractive({ useHandCursor: !opt.disabled });

      // Symbol (emoji) above name
      const symbol = this.add.text(x, y - 15, opt.symbol, {
        fontSize: '32px'
      }).setOrigin(0.5).setDepth(20003).setAlpha(opt.disabled ? 0.4 : 1.0);

      // Power name below symbol
      const txt = this.add.text(x, y + 20, opt.label, {
        color: opt.disabled ? '#6b7280' : opt.color,
        fontSize: Math.max(16, Math.floor(height * 0.028)) + 'px',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(20003);

      // Selection marker (small number badge in top-right corner)
      const mark = this.add.text(x + (btnW*0.30), y - btnH*0.40, '', {
        color: '#ffffff', fontSize: Math.max(14, Math.floor(height * 0.026)) + 'px', fontStyle:'bold', backgroundColor:'#10b981',
        padding: { x: 6, y: 4 }
      }).setOrigin(0.5).setDepth(20004).setVisible(false);
      elements.push(rect, txt, symbol, mark);
      rect.on('pointerdown', () => {
        if (opt.disabled) return;
        // Toggle selection: allow deselect by tapping again
        const idxIn = chosen.indexOf(opt.key);
        if (idxIn !== -1){
          chosen.splice(idxIn,1);
          mark.setVisible(false);
        } else {
          if (chosen.length >= 2) return;
          chosen.push(opt.key);
          mark.setText(String(chosen.length)).setVisible(true);
          // When two powers are chosen, close modal
          if (chosen.length === 2){
            // Persist the chosen power order.  Players can use each once per run.
            this.runnerPowersSelected = chosen.slice();
            this.runnerPowersConsumed = [false, false];
            // Clean up modal elements and resume the game
            overlay.destroy();
            panel.destroy();
            title.destroy();
            subtitle.destroy();
            elements.forEach(el => el.destroy());
            this.pausedForModal = false;
          }
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
    if (this.carLights) this.carLights.setVisible(!!on);
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
    // Tween: move runner to the car nose, shrink and fade out
    this.tweens.add({
      targets: this.runner,
      x: noseX,
      y: noseY,
      scaleX: 0.6,
      scaleY: 0.6,
      alpha: 0.4,
      duration: 350,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.runner.setVisible(false);
        // Tween: drive car outward
        const dist = this.cell * 8;
        this.tweens.add({
          targets: this.car,
          x: this.car.x + dx * dist,
          y: this.car.y + dy * dist,
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
    const next = this.stageIdx + 1;
    if (next <= 5){
      const cam = this.cameras.main;
      cam.fadeOut(200, 0, 0, 0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
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
   * Execute the logic for a specific power.  Only dash and phase are
   * implemented here.  Phase grants temporary intangibility and fades
   * the runner.  Dash teleports forward a few tiles along the facing.
   * @param {string} power
   */
  performRunnerPower(power){
    const now = performance.now();
    if (!this.runner) return;
    if (power === 'phase'){
      // Phase: become intangible and semi-transparent for ~600ms
      this._phaseUntil = now + 600;
      this._didPhase = true;
      this._phaseActive = true;
      if (this.runner?.sprite) this.runner.sprite.setAlpha(0.35);
    } else if (power === 'dash'){
      // Dash: teleport forward up to 3 tiles
      this.queueDash();
    }
  }

  // ========== STAGE 4 & 5: AI AND BULLET HELPERS ==========

  // Create AI plug sprite for stage 4
  createAIPlug(){
    // Use the plug spawn cell from arena generation (arena.spawns.plug)
    const spawnCell = this.plugSpawnCell || { x: Math.floor(this.cols / 2), y: Math.floor(this.rows / 2) };
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
  }

  // Create AI runner sprite for stage 5
  // Spawn at plug spawn cell (opposite end from player) to avoid overlap
  createAIRunner(){
    const spawnCell = this.plugSpawnCell || this.spawnRunnerCell;
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
    const ax = this.runner.x;
    const ay = this.runner.y;
    const now = performance.now();
    // Tutorial AI plug speed: 3.0 cells/sec (same as PvE round 1, but shoots slower)
    const speed = this.cell * 3.0;

    // Chase the runner with improved pathfinding
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

    // Shoot if aligned and in range
    const maxRange = this.cell * 12;
    if (dist <= maxRange){
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
          this.spawnWeaponBurst(d, aim, this.bulletsPlug);
        }
      }
    }
  }

  // Update AI runner behavior (go to stash then extract) - Tutorial difficulty
  updateRunnerAI(delta){
    if (!this.aiRunner) return;

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
    const speed = this.cell * 7.0;
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
      if (leftDown) vx = -speed;
      else if (rightDown) vx = speed;
      if (upDown) vy = -speed;
      else if (downDown) vy = speed;

      const aim = { x: 0, y: 0 };
      if (vx !== 0) aim.x = Math.sign(vx);
      if (vy !== 0) aim.y = Math.sign(vy);
      if (aim.x !== 0 || aim.y !== 0){
        const len = Math.hypot(aim.x, aim.y) || 1;
        const norm = { x: aim.x / len, y: aim.y / len };
        this.playerDrift = norm;
        this.playerAim = norm;
        if (this.stageIdx !== 5) this._runnerInputDir = { x: norm.x, y: norm.y };
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
              this.toast('Defender wins!', 1500, '#86efac');
              this.time.delayedCall(1600, () => this.goNext());
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
        this.toast('Runner got the stash!', 1200, '#ffd166');
      }

      // Check if AI runner extracted (player loses)
      if (this.aiRunner.hasStash && this.overlapsPoint(this.aiRunner, this.extractPad.x, this.extractPad.y)){
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
      // In stage 1, extraction is always available - turn on car lights immediately
      this.setCarLights(true);
      // In stage 1, reaching the car triggers an extraction animation rather than an instant transition
      if (this.overlapsPoint(this.runner, this.extractPad.x, this.extractPad.y)) this.playCarDepartAndGoNext();
    } else if (this.stageIdx === 2){
      if (!this.hasPackage){
        if (this.stash && this.overlaps(this.runner, this.stash)){
          this.hasPackage = true;
          this.addCarry();
          this.stash?.setVisible(false);
          if (this.bunkStash){ this.bunkStash.destroy(); this.bunkStash = null; }
          // Clear stash halo graphics
          if (this._stashHaloG) { this._stashHaloG.clear(); this._stashHaloG = null; }
          this.toast('Nice. Get to the car.');
          this.showCarBeacon();
          // Turn on car lights once package is collected
          this.setCarLights(true);
        } else if (this.bunkStash && this.overlaps(this.runner, this.bunkStash)){
          this.toast('BUNK!', 1200, '#f87171');
          this.showBunkPopup(this.bunkStash.x, this.bunkStash.y);
          const decoy = this.bunkStash;
          this.bunkStash = null;
          this.tweens.add({ targets: decoy, alpha: 0, scale: 0.86, duration: 800, ease: 'Cubic.easeOut', onComplete: () => decoy.destroy() });
        }
      } else if (this.overlapsPoint(this.runner, this.extractPad.x, this.extractPad.y)){
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
          this.toast('Nice. Get to the car.');
          this.showCarBeacon();
        } else if (this.bunkStash && this.overlaps(this.runner, this.bunkStash)) {
          this.toast('BUNK!', 1200, '#f87171');
          this.showBunkPopup(this.bunkStash.x, this.bunkStash.y);
          const decoy = this.bunkStash;
          this.bunkStash = null;
          this.tweens.add({ targets: decoy, alpha: 0, scale: 0.86, duration: 800, ease: 'Cubic.easeOut', onComplete: () => decoy.destroy() });
        }
      }
      // Turn on car lights once both dash and phase have been used.  Boarding
      // the car is only allowed after demonstrating both powers; the player
      // can still collect the stash before using powers but cannot depart.
      if (this._didDash && this._didPhase) this.setCarLights(true);
      if ((this._didDash && this._didPhase) && this.overlapsPoint(this.runner, this.extractPad.x, this.extractPad.y)) {
        // Final stage: after demonstrating dash and phase, board the car and depart
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
          this.toast('Got the stash! Get to the car.');
          this.showCarBeacon();
          // Turn on car lights once package is collected
          this.setCarLights(true);
        } else if (this.bunkStash && this.overlaps(this.runner, this.bunkStash)){
          this.toast('BUNK!', 1200, '#f87171');
          this.showBunkPopup(this.bunkStash.x, this.bunkStash.y);
          const decoy = this.bunkStash;
          this.bunkStash = null;
          this.tweens.add({ targets: decoy, alpha: 0, scale: 0.86, duration: 800, ease: 'Cubic.easeOut', onComplete: () => decoy.destroy() });
        }
      } else if (this.overlapsPoint(this.runner, this.extractPad.x, this.extractPad.y)){
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
  overlapsPoint(a, x, y){
    const ra = new Phaser.Geom.Rectangle(a.x - 12, a.y - 12, 24, 24);
    return Phaser.Geom.Rectangle.Contains(ra, x, y);
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






