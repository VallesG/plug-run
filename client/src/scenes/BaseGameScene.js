import Phaser from 'phaser';
import inv, { loadInv, saveInv } from '../state/inventory.js';
import {
  rectsOverlap,
  overlaps,
  stepCell,
  isWalkableDirFrom,
  applyCenterBias,
  corridorAssist,
  toroDist,
  randomCardinal
} from '../utils/gameUtils.js';
import { makeRunnerSprite, makePlugSprite, updateAvatarVisuals } from '../utils/spriteFactory.js';
import { T, THEMES, generateSquareMaze, decorateArenaFurniture } from '../utils/mazeGenerator.js';
import AudioManager from '../audio/AudioManager.js';
import { getCurrentRouteID, getRouteSeed, createSeededRNG } from '../utils/seededRandom.js';
import { updateRouteProgress, cleanupOldRoutes, isPremiumUser, recordRoundCompletion, saveSessionState, clearSessionState, getCurrentRouteProgress } from '../utils/routeProgress.js';
import { submitScore, submitAllTimeScore } from '../utils/leaderboardManager.js';
import { getCurrentUser, updateUserStats } from '../utils/userManager.js';
import RepTracker from '../utils/repTracker.js';
import { createPortraitOverlay } from '../utils/portraitMode.js';
import { createBottomLeftButtons } from '../utils/authUI.js';
import { applyStreetWarsAI, updateStreetWarsPlugAI, applyStreetWarsShootingBehavior, updateStreetWarsRunnerAI, considerStreetWarsPowerUse } from '../utils/streetWarsAI.js';
import PlayerController from '../controllers/PlayerController.js';
import AIController from '../controllers/AIController.js';
import CombatSystem from '../controllers/CombatSystem.js';
import VisualEffects from '../controllers/VisualEffects.js';
import GameUI from '../controllers/GameUI.js';
import { getPlugBaseStats, applyPlugProgression, resetPlugOrientation } from '../controllers/PlugAI.js';
import { getRunnerBaseStats, applyRunnerProgression, resetRunnerOrientation } from '../controllers/RunnerAI.js';
import ProgressionManager from '../controllers/ProgressionManager.js';

function makeRng(seed){
  let t = seed >>> 0;
  return function(){
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ----------------- scene ----------------- */
export class BaseGameScene extends Phaser.Scene {
  constructor(sceneKey){
    super(sceneKey);
    this.sceneKey = sceneKey;
  }

  preload(){
    // Legacy gangster sheets (leave for fallback)
    this.load.spritesheet('g1_idle', '/sprites/g1/idle.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('g1_run',  '/sprites/g1/run.png',  { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('g1_shot', '/sprites/g1/shot.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('g2_idle', '/sprites/g2/idle.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('g2_run',  '/sprites/g2/run.png',  { frameWidth: 128, frameHeight: 128 });

    // Kenney replacements (smaller compact sprites): Runner=Player, Plug=Soldier
    this.load.image('ken_player_idle',   '/sprites/kenney/player/idle.png');
    this.load.image('ken_player_walk1',  '/sprites/kenney/player/walk1.png');
    this.load.image('ken_player_walk2',  '/sprites/kenney/player/walk2.png');
    this.load.image('ken_soldier_idle',  '/sprites/kenney/soldier/idle.png');
    this.load.image('ken_soldier_walk1', '/sprites/kenney/soldier/walk1.png');
    this.load.image('ken_soldier_walk2', '/sprites/kenney/soldier/walk2.png');

    // Direct top-down shooter sprites (final picks)
    this.load.image('td_runner', '/sprites/td/runner.png');
    this.load.image('td_runner_step', '/sprites/td/runner_step.png');
    this.load.image('td_plug',   '/sprites/td/plug.png');
    this.load.image('td_plug_step',   '/sprites/td/plug_step.png');

    // Tile images (walls + wood floor set)
    this.load.image('ken_wall',  '/tiles/kenney/wall.png'); // legacy single-tile wall (fallback)
    // New composed wall parts from your folder
    this.load.image('wall_fill', '/tiles/kenney/walls/fill.png');
    this.load.image('wall_edge', '/tiles/kenney/walls/edge.png');
    ['wood_96','wood_97','wood_98','wood_99','wood_100','wood_101'].forEach(k=> this.load.image(k, `/tiles/kenney/${k}.png`));
    ['check_11','check_12','check_13','check_14'].forEach(k=> this.load.image(k, `/tiles/checker/${k}.png`));
    // Car sprite
    this.load.image('car_blue', '/cars/blue.png');

    // Audio SFX (use real files when present; falls back otherwise)
    try {
      this.load.audio('gun_fire',     ['/audio/gun_fire.ogg',     '/audio/gun_fire.mp3']);
      this.load.audio('impact',       ['/audio/impact.ogg',       '/audio/impact.mp3']);
      this.load.audio('pickup',       ['/audio/pickup.ogg',       '/audio/pickup.mp3']);
      this.load.audio('spickup',      ['/audio/spickup.ogg',      '/audio/spickup.mp3']); // real stash pickup
      this.load.audio('bpickup',      ['/audio/bpickup.ogg',      '/audio/bpickup.mp3']); // bunk stash pickup
      this.load.audio('ui_click',     ['/audio/ui_click.ogg',     '/audio/ui_click.mp3']);
      this.load.audio('engine_start', ['/audio/engine_start.ogg', '/audio/engine_start.mp3']);
      this.load.audio('engine_idle',  ['/audio/engine_idle.ogg',  '/audio/engine_idle.mp3']);
      this.load.audio('ouch',         ['/audio/ouch.ogg',         '/audio/ouch.mp3']);

      // Power-up sounds
      this.load.audio('dash',         ['/audio/dash.ogg',         '/audio/dash.mp3']);
      this.load.audio('decoy',        ['/audio/decoy.ogg',        '/audio/decoy.mp3']);
      this.load.audio('phase',        ['/audio/phase.ogg',        '/audio/phase.mp3']);

      // Background music
      this.load.audio('main_beat',    ['/audio/main_beat.ogg',    '/audio/main_beat.mp3']);
      this.load.audio('learn_beat',   ['/audio/learn_beat.ogg',   '/audio/learn_beat.mp3']);
      this.load.audio('plug_beat',    ['/audio/plug_beat.ogg',    '/audio/plug_beat.mp3']);
      this.load.audio('plug_beat2',   ['/audio/plug_beat2.ogg',   '/audio/plug_beat2.mp3']);
    } catch {}
  }

  /* -- Centered modal helper (delegated to GameUI controller) ----------- */
  showModal({ title, lines = [], buttons = [] }){
    return this.gameUI.showModal({ title, lines, buttons });
  }

  init(data) {
    this.cell = 24;
    this.cols = Math.floor(this.scale.width / this.cell);
    this.rows = Math.floor(Math.max(1, this.scale.height) / this.cell);
    this.pad  = { x: 0, y: 0 };
    this.timerMs = 90_000;

    // Corridor assist configuration (0 = off, 1 = normal, 2 = strong)
    // Reduced from old value of ~3.3x to 1.0 for better player control
    // Load user preference from localStorage if available
    try {
      const savedAssist = localStorage.getItem('pr_corridor_assist');
      this.corridorAssistStrength = savedAssist !== null ? parseFloat(savedAssist) : 1.0;
    } catch {
      this.corridorAssistStrength = 1.0;
    }

    // scene.transition passes data via scene.settings.data, not init param
    const settings = this.scene.settings.data || {};
    const initData = data || settings;

    console.log('[BaseGameScene] init data:', data);
    console.log('[BaseGameScene] scene.settings.data:', settings);
    console.log('[BaseGameScene] resolved initData:', initData);

    this.role = (initData && 'role' in initData) ? initData.role : null;
    this.tutorialStage = initData?.tutorialStage ?? null;

    // Initialize all controllers
    this.playerController = new PlayerController(this);
    this.aiController = new AIController(this);
    this.combatSystem = new CombatSystem(this);
    this.vfx = new VisualEffects(this);
    this.gameUI = new GameUI(this);
    this.progressionManager = new ProgressionManager(this);

    // Effects / options
    // Force high-contrast bullets ON for all players
    this.fxBulletHighContrast = true;

    // PvE session tracking
    this.mode = initData?.mode || 'pvp'; // 'pve' or 'pvp'
    console.log('[BaseGameScene] mode:', this.mode, 'role:', this.role);

    // Initialize user (creates guest account if needed)
    const user = getCurrentUser();
    console.log('[BaseGameScene] User:', user.username, user.isGuest ? '(guest)' : '(claimed)');

    if (this.mode === 'pve') {
      // Store saved session if provided (will show modal after map loads)
      this.savedSession = initData?.savedSession ?? null;

      // Continue session or start new
      this.pveRound = initData?.pveRound ?? initData?.savedSession?.pveRound ?? 1;
      this.pveSessionStash = initData?.pveSessionStash ?? initData?.savedSession?.pveSessionStash ?? 0;
      this.pveSessionRep = initData?.pveSessionRep ?? initData?.savedSession?.pveSessionRep ?? 0;
      this.pveBestRound = initData?.pveBestRound ?? initData?.savedSession?.pveBestRound ?? 0;
      console.log('[BaseGameScene] PvE - Round:', this.pveRound, 'Stash:', this.pveSessionStash, 'Rep:', this.pveSessionRep);

      // Use deterministic route seed for PvE (same daily route for all players globally, resets 12am PST)
      // Runner and plug modes get different seeds for balanced gameplay
      const routeID = getCurrentRouteID();
      this.currentRouteID = routeID;
      this.seed = getRouteSeed(routeID, this.pveRound, this.role);
      console.log('[BaseGameScene] PvE Route ID:', routeID, 'Round:', this.pveRound, 'Role:', this.role, 'Seed:', this.seed);

      // Create seeded RNG for gameplay elements (AI targeting, etc.)
      this.gameplayRNG = createSeededRNG(this.seed ^ 0xABCDEF01); // XOR to create different sequence from maze gen

      // Cleanup old route data periodically (every new route start)
      if (this.pveRound === 1) {
        cleanupOldRoutes();
      }
    } else {
      // PvP uses random seed
      this.seed = initData?.seed ?? this.seed ?? ((Math.random() * 2**32) | 0);
      this.gameplayRNG = Math.random; // Use standard random for PvP
    }
  }

  // world/grid helpers
  toWorldX(cx){ return this.pad.x + cx*this.cell + this.cell/2; }
  toWorldY(cy){ return this.pad.y + cy*this.cell + this.cell/2; }
  toCell(x,y){ return { x: Math.floor((x - this.pad.x)/this.cell), y: Math.floor((y - this.pad.y)/this.cell) }; }

  // hard barrier rules
  inBoundsCell(cx,cy){ return cx>=0 && cy>=0 && cx<this.cols && cy<this.rows; }
  isWalkableCell(cx,cy){
    if (!this.inBoundsCell(cx,cy)) return false;
    return this.grid[cy][cx] !== T.WALL;
  }
  isWallAtWorld(wx, wy){
    const c = this.toCell(wx, wy);
    if (!this.inBoundsCell(c.x,c.y)) return true;
    return this.grid[c.y][c.x] === T.WALL;
  }
  isBulletBlockedAtWorld(wx, wy){
    const c = this.toCell(wx, wy);
    if (!this.inBoundsCell(c.x,c.y)) return true;
    return this.grid[c.y][c.x] === T.WALL;
  }

  // BFS pathing
  neighbors4(c){
    return [
      {x:c.x+1, y:c.y}, {x:c.x-1, y:c.y}, {x:c.x, y:c.y+1}, {x:c.x, y:c.y-1}
    ].filter(n=>this.isWalkableCell(n.x,n.y));
  }
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

  // AABB collision for a container sprite (uses per-sprite hitbox radius when present)
  canMoveTo(sprite, nx, ny){
    // Allow the runner to pass through walls while phasing
    if (sprite === this.attacker && this.runnerIsPhasing && this.runnerIsPhasing()) return true;
    // Smaller hitbox for better navigation in tight spaces, especially corridors
    const r = (sprite?.hbRadius != null) ? sprite.hbRadius : (this.hitboxRadius || (this.cell * 0.18));
    const pts = [
      {x:nx - r, y:ny - r},
      {x:nx + r, y:ny - r},
      {x:nx - r, y:ny + r},
      {x:nx + r, y:ny + r},
    ];
    for (const p of pts){
      if (this.isWallAtWorld(p.x, p.y)) return false;
    }
    return true;
  }


  canDamage(who){
    return performance.now() >= (who.iUntil || 0);
  }

  // If a sprite ends up inside a wall tile (e.g., after phase ends), snap it to the nearest free tile center.
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

  /* ------------- responsive layout ------------- */
  computeLayoutFromViewport(){
    const { cols, rows } = this;
    const { width, height } = this.scale.gameSize;
    const MARGIN = 0;
    const usableW = Math.max(1, width  - MARGIN*2);
    const usableH = Math.max(1, height - MARGIN*2);
    const cellFit = Math.floor(Math.min(usableW / cols, usableH / rows));
    const MIN_CELL = 14;
    const cell = Math.max(MIN_CELL, cellFit);
    this.cell = cell;
    this.pad  = { x: 0, y: 0 };
  }

  recomputeSpeedsFromCell(){
    // Speeds in CELLS per second
    const RUNNER_CPS       = 7.0;
    const PLUG_CPS         = 4.8;
    const PLUG_NO_AMMO_CPS = 5.4;
    const AI_PLUG_CPS      = 3.0; // Reduced from 4.0 for easier early rounds

    this.runnerSpeed     = RUNNER_CPS       * this.cell;
    this.plugSpeed       = PLUG_CPS         * this.cell;
    this.plugSpeedNoAmmo = PLUG_NO_AMMO_CPS * this.cell;
    if (this.aiPlug) this.aiPlug.speed = AI_PLUG_CPS * this.cell;
    if (this.runnerPowerStats?.decoy) this.runnerPowerStats.decoy.speed = this.runnerSpeed * 0.9;
    if (this.runnerPowerStats?.phase) this.runnerPowerStats.phase.dashDist = this.cell * 3.5;
  }

  create(){
    // Ensure furniture textures are available (load once lazily)
    const furnIds = [132,133,134,447,448,449,450,451,474,475,476,477,478,501,502,503,505,528,537];
    const furn2Ids = [506,507,508,509,510,529,530,531,532,533];
    const furnKeys = furnIds.map(id=> 'furn_'+id).concat(furn2Ids.map(id=>'f2_'+id));
    const missing = furnKeys.filter(k => !this.textures.exists(k));
    if (missing.length){
      // load both directories based on prefix
      furnIds.forEach(id=> this.load.image('furn_'+id, `/tiles/furn/tile_${id}.png`));
      furn2Ids.forEach(id=> this.load.image('f2_'+id, `/tiles/furn2/tile_${id}.png`));
      this.load.once('complete', ()=> this.scene.restart({
        mode: this.mode,
        role: this.role,
        seed: this.seed,
        pveRound: this.pveRound,
        pveSessionStash: this.pveSessionStash,
        pveSessionRep: this.pveSessionRep,
        pveBestRound: this.pveBestRound
      }));
      this.load.start();
      return;
    }
    // One-time animations for sprites
    const mkOnce = (key, cfg) => { if (!this.anims.exists(key)) this.anims.create({ key, ...cfg }); };
    // Runner (Kenney Player)   simple 2-frame walk
    mkOnce('runner-idle', { frames: [{ key:'ken_player_idle' }], frameRate: 1, repeat: -1 });
    mkOnce('runner-run',  { frames: [{ key:'ken_player_walk1' }, { key:'ken_player_walk2' }], frameRate: 8, yoyo: true, repeat: -1 });
    // Plug (Kenney Soldier)
    mkOnce('plug-idle', { frames: [{ key:'ken_soldier_idle' }], frameRate: 1, repeat: -1 });
    mkOnce('plug-run',  { frames: [{ key:'ken_soldier_walk1' }, { key:'ken_soldier_walk2' }], frameRate: 8, yoyo: true, repeat: -1 });
    // Keep old 'plug-shot' anim for fallback if g1_shot exists
    mkOnce('plug-shot', { frames: this.textures.exists('g1_shot') ? this.anims.generateFrameNumbers('g1_shot', { start: 0, end: 3 }) : [{ key:'ken_soldier_idle' }], frameRate: 18, repeat: 0 });
    loadInv();
    this.roundOver = false;

    // Audio manager init (restores SFX/music hooks)
    try {
      this.audio = AudioManager.get(this);
      this.audio.ensureUnlocked(this);
      // Music already started in MenuScene when card was clicked
    } catch {}

    // Portrait mode enforcement overlay for mobile landscape
    createPortraitOverlay(this);

    this.roundPausedForMenu = false;
    this.carrySprite = null;

    // Choose visual theme deterministically per seed, but guarantee change from last match
    const themeRng = makeRng((this.seed ^ 0x9E3779B9) | 0);
    const baseIdx = (((themeRng()*1000000)|0) % THEMES.length);
    const prevIdx = parseInt((typeof localStorage!== 'undefined' ? localStorage.getItem('pr_lastThemeIdx') : '-1') || '-1', 10);
    let idx = baseIdx;
    if (THEMES.length > 1 && idx === prevIdx){
      // rotate by at least 1, with a little RNG so it doesn't just flip-flop
      const shift = 1 + (((themeRng()*100)|0) % (THEMES.length - 1));
      idx = (idx + shift) % THEMES.length;
    }
    this.theme = THEMES[idx] || THEMES[0];
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('pr_lastThemeIdx', String(idx)); } catch {}

    // Choose a single checker tile variant when using checker floors, so the map uses one tile color per match
    if (this.theme?.floorSet === 'checker'){
      const ck = ['check_11','check_12','check_13','check_14'];
      this.floorKeySingle = ck[(themeRng()*ck.length)|0];
    } else {
      this.floorKeySingle = null;
    }

    // layout
    this.computeLayoutFromViewport();
    this.scale.off('resize', this._onResizeCb);
    this._onResizeCb = () => this.scene.restart({
      mode: this.mode,
      role: this.role,
      seed: this.seed,
      pveRound: this.pveRound,
      pveSessionStash: this.pveSessionStash,
      pveSessionRep: this.pveSessionRep,
      pveBestRound: this.pveBestRound
    });
    this.scale.on('resize', this._onResizeCb);

    // arena
    const arena = generateSquareMaze(this.cols, this.rows, { rng: makeRng(this.seed), role: this.role });
    this.grid = arena.grid;
    this.stashCell   = arena.objectives.stash;
    this.extractCell = arena.objectives.extract;
    this.egress      = arena.egress;
    this.notchCells  = null; // disable notch visual bay entirely
    this.drawNeonArena();
    this.makeObjectives(this.stashCell, this.extractCell);
    this.placeGetawayCar();

    // players (start hidden until match starts)
    const a = arena.spawns.runner, d = arena.spawns.plug;
    this.runnerSpawnCell = { ...a };
    this.plugSpawnCell = { ...d };
    this.attacker = makeRunnerSprite(this, this.toWorldX(a.x), this.toWorldY(a.y), this.cell).setVisible(false);
    this.defender = makePlugSprite(this,   this.toWorldX(d.x), this.toWorldY(d.y), this.cell).setVisible(false);
    // Apply floor mask so avatars never render over wall cells
    if (this.wallMask){ this.attacker.setMask(this.wallMask); this.defender.setMask(this.wallMask); }
    this.attacker.hp = 2; this.defender.hp = 3;
    this.iFrameMs = 900;

    // bullets
    this.bulletsA = this.add.group();
    this.bulletsD = this.add.group();

    // controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D,ONE,TWO,THREE,FOUR');

    // Debug: Press 'C' to cycle corridor assist strength (0 = off, 1 = normal, 2 = strong)
    this.input.keyboard.on('keydown-C', () => {
      this.corridorAssistStrength = (this.corridorAssistStrength + 1) % 3;
      const labels = ['OFF', 'NORMAL', 'STRONG'];
      console.log(`Corridor assist: ${labels[this.corridorAssistStrength]} (${this.corridorAssistStrength})`);

      // Save preference
      try {
        localStorage.setItem('pr_corridor_assist', this.corridorAssistStrength.toString());
      } catch {}

      // Show temporary on-screen feedback
      const text = this.add.text(this.cameras.main.centerX, 100,
        `Corridor Assist: ${labels[this.corridorAssistStrength]}`,
        { fontSize: '20px', color: '#ffff00' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(10000);
      this.tweens.add({
        targets: text, alpha: 0, duration: 2000,
        onComplete: () => text.destroy()
      });
    });

    // Debug: Press 'V' to toggle movement debug visualization
    this.debugMovement = false;
    this.input.keyboard.on('keydown-V', () => {
      this.debugMovement = !this.debugMovement;
      console.log(`Movement debug: ${this.debugMovement ? 'ON' : 'OFF'}`);

      if (this.debugMovement) {
        // Create debug graphics
        this.debugGraphics = this.add.graphics();
        this.debugGraphics.setDepth(9999);
      } else if (this.debugGraphics) {
        this.debugGraphics.destroy();
        this.debugGraphics = null;
      }

      const text = this.add.text(this.cameras.main.centerX, 140,
        `Movement Debug: ${this.debugMovement ? 'ON' : 'OFF'}`,
        { fontSize: '20px', color: '#00ff00' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(10000);
      this.tweens.add({
        targets: text, alpha: 0, duration: 2000,
        onComplete: () => text.destroy()
      });
    });

    // split aims (player vs AI) and separate gun aim for desktop
    this.playerAim    = { x:1, y:0 }; // movement aim (mobile + keyboard)
    this.playerGunAim = { x:1, y:0 }; // gun aim (desktop mouse)
    this.playerMoveDir = { x:1, y:0 }; // Actual movement direction (straight line)
    this.playerIntendedDir = { x:1, y:0 }; // Direction player swiped/chose (never forced to change)
    this.aiAim        = { x:1, y:0 };

    // desktop keyboard quick-aim (player) and persistent drift like "snake"
    const setDir = (x, y) => {
      const len = Math.hypot(x, y) || 1;
      const nx = x / len;
      const ny = y / len;
      this.playerAim = { x: nx, y: ny };
      this.playerDrift = { x: nx, y: ny };
      this.playerMoveDir = { x: nx, y: ny }; // Set straight-line movement direction
      this.playerIntendedDir = { x: nx, y: ny }; // Track what player intended
      // Also update gun aim when using keyboard (keeps consistency)
      this.playerGunAim = { x: nx, y: ny };
      this._runnerInputDir = { x: nx, y: ny };
      this.userTookOver = true;
    };
    // WASD
    this.input.keyboard.on('keydown-W', ()=> setDir(0,-1));
    this.input.keyboard.on('keydown-S', ()=> setDir(0, 1));
    this.input.keyboard.on('keydown-A', ()=> setDir(-1,0));
    this.input.keyboard.on('keydown-D', ()=> setDir( 1,0));
    // Arrow keys
    this.input.keyboard.on('keydown-UP',    ()=> setDir(0,-1));
    this.input.keyboard.on('keydown-DOWN',  ()=> setDir(0, 1));
    this.input.keyboard.on('keydown-LEFT',  ()=> setDir(-1,0));
    this.input.keyboard.on('keydown-RIGHT', ()=> setDir( 1,0));

    // mouse aim (desktop) + click fire
    this.input.mouse?.disableContextMenu();
    this.input.addPointer(4); // left button + 3 more fingers
    // Treat as desktop only when reported desktop AND no touch support
    this.isDesktop = !!(this.sys.game?.device?.os?.desktop) && !!(this.sys.game?.device?.input?.touch === false);
    this.cross = this.add.rectangle(0, 0, 10, 10, 0xffffff, 1)
      .setStrokeStyle(1, 0xffffff)
      .setVisible(this.isDesktop)
      .setDepth(998);

    // guns
    this.weaponStats = {
      pistol:       { clip: 12, speed: 320, color: 0xffd166, spreadAngles: [0] },
      doublebarrel: { clip: 10, speed: 280, color: 0xff5a7a, spreadAngles: [-12, 0, 12] },
      laser:        { clip: 5,  speed: 460, color: 0x86e3ff, spreadAngles: [0] },
      rifle:        { clip: 16, speed: 360, color: 0xb4f0ff, spreadAngles: [0] }
    };
    const DEFAULT_GUNS = Object.keys(this.weaponStats);
    const owns = {
      pistol:       !!(inv.weapons?.pistol),
      doublebarrel: !!((inv.weapons?.doublebarrel) ?? inv.weapons?.shotgun),
      laser:        !!(inv.weapons?.laser),
      rifle:        !!(inv.weapons?.rifle)
    };
    if (!Object.values(owns).some(Boolean)) {
      DEFAULT_GUNS.forEach((g) => { owns[g] = true; });
    }
    // Ensure basic weapons are always available (removed laser - it's useless)
    ['pistol', 'doublebarrel'].forEach((g) => {
      if (!owns[g]) owns[g] = true;
    });
    // Filter out laser from available guns
    this.availableGuns = DEFAULT_GUNS.filter((g) => owns[g] && g !== 'laser');
    if (!this.availableGuns.length) this.availableGuns = ['pistol'];

    this.roundAmmo = Object.fromEntries(DEFAULT_GUNS.map((g) => [g, 0]));

    // PvE runner mode: AI plug gets random weapon (no laser)
    if (this.mode === 'pve' && this.role === 'runner') {
      const aiWeapons = ['pistol', 'doublebarrel', 'rifle'];
      const randomWeapon = aiWeapons[Math.floor(Math.random() * aiWeapons.length)];
      this.allowedGuns = [randomWeapon];
    } else {
      this.allowedGuns = [this.availableGuns[0]];
    }

    this.weapon = this.allowedGuns[0] || null;
    this.refreshAmmoForLoadout();

    this.input.keyboard.on('keydown-ONE',   () => { if (!this.roundPausedForMenu) this.setWeapon('pistol'); });
    this.input.keyboard.on('keydown-TWO',   () => { if (!this.roundPausedForMenu) this.setWeapon('doublebarrel'); });
    this.input.keyboard.on('keydown-THREE', () => { if (!this.roundPausedForMenu) this.setWeapon('rifle'); });

    // Runner power stats
    this.runnerPowerStats = {
      // Phase: become intangible and pass through walls for a short duration. No dash/teleport.
      phase: { label: 'Phase', description: 'Pass through walls briefly without dashing.', cooldown: 7000, duration: 600, fadeAlpha: 0.35 },
      // Dash: instant jump a few tiles in the current facing direction (blocked by walls).
      dash:  { label: 'Dash',  description: 'Jump forward a few tiles along your direction.', cooldown: 6000, tiles: 3 },
      // Decoy: spawn a duplicate-looking runner that moves forward and draws attention.
      decoy: { label: 'Decoy', description: 'Spawn a duplicate decoy to draw attention.', cooldown: 9000, life: 5500, speed: this.runnerSpeed * 0.9 }
    };
    this.availableRunnerPowers = Object.keys(this.runnerPowerStats);
    this.runnerPower = null;
    this.runnerPowerReadyAt = 0;
    this.phaseActiveUntil = 0;
    this.decoySprite = null;
    this.decoyExpiresAt = 0;
    this.decoyVelocity = { x: 0, y: 0 };
    this.runnerAbilityText = null;
    this.abilityButton = null;

    // round params / balance
    this.endAt = performance.now();
    this.hasStash = false;
    this.carrySlow   = 0.85;

    this.unlockDelayMs = 1200;
    this.stashUnlockAt = performance.now() + this.unlockDelayMs;

    this.antiCampRadius    = this.cell * 2.2;
    this.antiCampTime      = 0;
    this.antiCampThreshold = 4000;

    this.stake = inv.product > 0 ? 1 : 0;
    if (this.stake > 0) { inv.product -= 1; saveInv(); this.pot = 2; } else { this.pot = 0; }

    this.meleeEnabled = false;

    // AI knobs (base difficulty) - Loaded from separate AI modules
    this.aiPlug = getPlugBaseStats();
    this.aiRunner = getRunnerBaseStats();

    // Apply progressive difficulty in PvE mode
    if (this.mode === 'pve') {
      applyPlugProgression(this);
      applyRunnerProgression(this);
      this.applyMusicRamp();
    }

    // Apply Street Wars AI (level 50 human-like opponent)
    if (this.mode === 'streetwars') {
      applyStreetWarsAI(this);
    }

    // Defender AI anti-lockstep helpers
    this._aiPlugStrafeDir = { x: 0, y: 0 };
    this._aiPlugStrafeUntil = 0;
    this._aiFirstSeenAt = performance.now();
    this.aiTick = 0;
    this._aiPlanAt = 0;
    this._aiSpawnAt = performance.now();
    this._aiLastPos = { x:this.attacker.x, y:this.attacker.y };
    this._aiVX = 0; this._aiVY = 0;
    this._aiCruiseDir = { x:1, y:0 };
    this._aiLastMoveDir = { x:0, y:0 };
    this._aiFlipGuardUntil = 0;

    // recompute speed scalars now that aiPlug exists
    this.recomputeSpeedsFromCell();
    if (this.mode === 'pve') {
      if (this.role === 'plug') {
        // Use seeded RNG for AI targeting decision (deterministic in PvE routes)
        const rng = this.gameplayRNG || Math.random;
        this.aiRunnerTargetsBunkFirst = rng() < 0.45;
      } else {
        this.aiRunnerTargetsBunkFirst = false;
      }
    }

    // PRE-GAME: role picker (now skipped if role passed from menu)
    this.roleChosen = !!this.role;

    // Role is now passed from menu - start match immediately
    if (this.roleChosen) {
      this.startMatch(this.role);
    } else {
      // Fallback: show role picker if no role specified (shouldn't happen with new flow)
      const openRolePicker = ()=>{
        const modal = this.showModal({
          title: 'Choose Your Role',
          lines: [],
          buttons: [
            { label:'Play as Runner', color:'#9ad1ff', bg:0x1a2038, onClick: ()=> this.startMatch('runner') },
            { label:'Play as Plug',   color:'#ffb4b4', bg:0x2a1a1a, onClick: ()=> this.startMatch('plug')   },
          ]
        });

        // place sprites above the two buttons
        const cellMini = Math.max(18, this.cell * 0.9);
        const yOffset  = Math.max(42, this.cell * 1.6);

        if (modal.btnCenters?.length >= 2){
          const rC = modal.btnCenters[0];
          const pC = modal.btnCenters[1];

          const runnerMini = makeRunnerSprite(this, rC.x, rC.y - yOffset, cellMini)
            .setScrollFactor(0).setDepth(20010);
          const plugMini   = makePlugSprite(this,   pC.x, pC.y - yOffset, cellMini)
            .setScrollFactor(0).setDepth(20010);

          this.tweens.add({ targets: runnerMini, y: runnerMini.y - 3, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
          this.tweens.add({ targets: plugMini,   y: plugMini.y   - 3, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });

          modal.registerExtra(runnerMini, plugMini);
        }

        this.currentModal = modal;
      };
      openRolePicker();
    }
  }

  startMatch(role){
    this.role = role;
    this.roundOver = false;
    this.roundPausedForMenu = false;
    this.removeCarryPackage();
    this.destroyRunnerAbilityUI();
    this.destroyDecoySprite();
    this.phaseActiveUntil = 0;
    this.attacker?.setAlpha?.(1);
    if (this.mode === 'pve') {
      applyPlugProgression(this);
      applyRunnerProgression(this);
      this.applyMusicRamp();
    }

    if (this.currentModal) { this.currentModal.destroy?.(); this.currentModal = null; }

    this.attacker.setVisible(true);
    this.defender.setVisible(true);

    // Reset AI reaction timer so it doesn't accumulate during menus/delays
    this._aiFirstSeenAt = performance.now();

    this.input.keyboard.enabled = true;

    if (this._pointerMoveHandler){ this.input.off('pointermove', this._pointerMoveHandler); }
    if (this._pointerDownHandler){ this.input.off('pointerdown', this._pointerDownHandler); }
    if (this._pointerUpHandler){ this.input.off('pointerup', this._pointerUpHandler); }
    // make sure touch UI is fully reset between matches
    this.destroyTouchUI?.();

    if (this.isDesktop) {
      this.cross.setVisible(true);
      this._pointerMoveHandler = (p) => {
        this.cross.setPosition(p.x, p.y);
        const who = (this.role==='plug') ? this.defender : this.attacker;
        const dx = p.x - who.x, dy = p.y - who.y;
        const L = Math.hypot(dx,dy) || 1;
        // Desktop: mouse controls gun aim only, not movement direction
        this.playerGunAim = { x: dx/L, y: dy/L };
      };
      this.input.on('pointermove', this._pointerMoveHandler);
      this._mouseDown = false;
      this._mouseCDAt = 0;
      this._mouseRateMs = 140;
      this._pointerDownHandler = (p) => {
        if (p.button !== 0) return;
        // Ignore clicks while modal is open
        if (this.roundPausedForMenu) return;
        if (this.role === 'plug') {
          this._mouseDown = true; this.combatSystem.tryMouseFire();
        } else if (this.role === 'runner') {
          // Desktop: left click activates next selected runner power (in order)
          const used = this.runnerPowersConsumed || [];
          const idx = used[0] ? 1 : 0;
          this.activateRunnerPowerByIndex(idx);
        }
      };
      this._pointerUpHandler = (p) => { if (p.button === 0) this._mouseDown = false; };
    this.input.on('pointerdown', this._pointerDownHandler);
    this.input.on('pointerup', this._pointerUpHandler);
    // Fallback: ensure left click fires even if desktop detection flips
    this.input.on('pointerdown', (p)=>{ if (p.button===0 && this.role==='plug' && !this.roundPausedForMenu) this.combatSystem.tryMouseFire(); });
    } else {
      this.makeMobileControls();
    }

    this._spaceHandler = this._spaceHandler || (() => this.combatSystem.firePlug());
    this._spaceBound = false;
    this.bindSpaceForPlug = () => {
      if (this._spaceBound) return;
      if (this.role === 'plug') { this.input.keyboard.on('keydown-SPACE', this._spaceHandler); this._spaceBound = true; }
    };
    this.unbindSpace = () => {
      if (!this._spaceBound) return;
      this.input.keyboard.off('keydown-SPACE', this._spaceHandler);
      this._spaceBound = false;
    };
    this.events.once('shutdown', this.unbindSpace);
    this.events.once('destroy', this.unbindSpace);
    this.bindSpaceForPlug();

    // Initialize human auto-drift: desktop drifts right initially; mobile random.
    // Find a direction that doesn't immediately hit a wall
    const findSafeStartDir = () => {
      const who = (this.role === 'plug') ? this.defender : this.attacker;
      if (!who) return { x: 1, y: 0 };

      const dirs = [
        { x: 1, y: 0 }, { x: -1, y: 0 },
        { x: 0, y: 1 }, { x: 0, y: -1 }
      ];

      // Check each direction for walls
      for (const dir of dirs) {
        const testX = who.x + dir.x * this.cell;
        const testY = who.y + dir.y * this.cell;
        if (this.canMoveTo(who, testX, testY)) {
          return dir;
        }
      }
      return dirs[0]; // Fallback if all blocked
    };

    this._initDrift = this.isDesktop ? { x: 1, y: 0 } : findSafeStartDir();
    this.playerDrift = { x: this._initDrift.x, y: this._initDrift.y };
    // Set movement direction for straight-line movement
    this.playerMoveDir = { x: this._initDrift.x, y: this._initDrift.y };
    this.playerIntendedDir = { x: this._initDrift.x, y: this._initDrift.y }; // Track initial direction
    this.playerAim = { x: this.playerDrift.x, y: this.playerDrift.y };
    this.playerGunAim = { x: this.playerDrift.x, y: this.playerDrift.y };
    if (this.role === 'runner') this._runnerInputDir = { x: this.playerDrift.x, y: this.playerDrift.y };
    // Flag flips to true after first user-controlled aim so initial drift never applies again
    this.userTookOver = false;

    if (!this._runnerAbilityKeyHandler){
      this._runnerAbilityKeyHandler = () => {
        // Ignore key presses while modal is open
        if (this.roundPausedForMenu) return;
        this.activateRunnerPower(); // single-power fallback
      };
    }
    const abilityKeyEvents = ['keydown-Q','keydown-E','keydown-SHIFT'];
    abilityKeyEvents.forEach(evt => this.input.keyboard.off(evt, this._runnerAbilityKeyHandler));
    if (this.role === 'runner'){
      abilityKeyEvents.forEach(evt => this.input.keyboard.on(evt, this._runnerAbilityKeyHandler));
    }
    this.events.once('destroy', () => abilityKeyEvents.forEach(evt => this.input.keyboard.off(evt, this._runnerAbilityKeyHandler)));

    const startTimer = () => {
      this.beginRoundTimer();
      if (this.role === 'runner'){
        this.destroyAbilityButton();
        this.updateRunnerAbilityUI();
      } else {
        this.destroyRunnerAbilityUI();
      }
    };

    if (this.role === 'plug') {
      // AI runner gets 2 random powers (consumable, used once each)
      if (!this.availableRunnerPowers?.length) this.availableRunnerPowers = Object.keys(this.runnerPowerStats || {});
      const choices = this.availableRunnerPowers.length ? this.availableRunnerPowers : ['phase','decoy'];
      const shuffled = Phaser.Utils.Array.Shuffle([...choices]);
      this.aiRunnerPowersSelected = shuffled.slice(0, 2);
      this.aiRunnerPowersConsumed = [false, false];
      this.promptPlugWeaponSelection(startTimer);
    } else {
      // Runner: enforce select-two menu for power order
      this.promptRunnerPowerSelection(() => {
        this.destroyAbilityButton();
        this.updateRunnerAbilityUI();
        startTimer();
      });
    }
  }

  /* -- VISUALS: Neon arena ------------------------------------------ */
  drawNeonArena(){
    const { cell, cols, rows, pad } = this;
    const W = cols*cell + pad.x*2, H = rows*cell + pad.y*2;

    // Full-screen background per theme
    const BG = this.theme?.bg ?? 0x080A10;
    this.add.rectangle(W/2, H/2, W, H, BG, 1);

    const NEON = [0x00E5FF, 0xA78BFA, 0xFF6AD5, 0x00FFA3, 0xFFC857, 0xFF7A00];
    const COVER_FILL = 0x0B0F16;

    this.walls = this.add.group();

    // Build a geometry mask that hides ONLY wall tiles. We invert the mask so
    // sprites remain visible everywhere except inside walls, avoiding the
    // "cage" look from floor-only masks.
    const maskG = this.make.graphics({ x: 0, y: 0, add: false });
    maskG.fillStyle(0xffffff, 1);
    // Inset the wall mask so we only clip when the sprite truly overlaps inside
    // the wall tile, not when passing right beside it. This avoids the player
    // appearing "behind" walls at edges while still preventing visual overlap.
    const wallInset = Math.max(1, Math.floor(cell * 0.16));
    for (let y=0; y<rows; y++){
      for (let x=0; x<cols; x++){
        if (this.grid[y][x] !== T.WALL) continue;
        const wx = pad.x + x*cell + wallInset;
        const wy = pad.y + y*cell + wallInset;
        maskG.fillRect(wx, wy, cell - wallInset*2, cell - wallInset*2);
      }
    }
    this.wallMask = new Phaser.Display.Masks.GeometryMask(this, maskG);
    this.wallMask.invertAlpha = true;

    // Full floor fill (wood planks pattern using tiles 96..101)
    this.floors = this.add.group();
    const WOOD = ['wood_96','wood_97','wood_98','wood_99','wood_100','wood_101'];
    const CHECK = ['check_11','check_12','check_13','check_14'];
    const useChecker = (this.theme?.floorSet === 'checker');
    const checkerColors = (Array.isArray(this.theme?.checkerColors) && this.theme.checkerColors.length >= 2)
      ? this.theme.checkerColors
      : null;
    // Fill floor one tile beyond the map to avoid empty black margin
    for (let y=-1; y<=rows; y++){
      for (let x=-1; x<=cols; x++){
        const cx = pad.x + x*cell + cell/2;
        const cy = pad.y + y*cell + cell/2;
        if (useChecker && checkerColors){
          // THEME PATCH: draw crisp two-tone checker without texture, for bright white/gray tiles
          const color = (((x + y) & 1) === 0) ? checkerColors[0] : checkerColors[1];
          const r = this.add.rectangle(cx, cy, cell, cell, color, 1).setDepth(1);
          this.floors.add(r);
        } else {
          let key;
          if (useChecker){
            // Use a single checker tile per match (no alternating checkerboard)
            key = this.floorKeySingle || CHECK[0];
          } else {
            const idx = ((((x%3)+3)%3) + 3 * ((((y%2)+2)%2))) % WOOD.length; // 3x2 plank
            key = WOOD[idx];
          }
          const f = this.add.image(cx, cy, key).setDepth(1).setTint(this.theme?.floorTint ?? 0xffffff);
          f.setDisplaySize(cell, cell);
          this.floors.add(f);
        }
      }
    }

    // Walls (auto‑tiled edges) + furniture lines; border remains black boxes
    const isWall = (cx,cy)=> (cy>=0 && cy<rows && cx>=0 && cx<cols && this.grid[cy][cx] === T.WALL);
    const isBorder = (cx,cy)=> (cx===0||cy===0||cx===cols-1||cy===rows-1);
    const drawDefaultCell = (cx,cy)=>{
      const wx = pad.x + cx*cell + cell/2;
      const wy = pad.y + cy*cell + cell/2;
        const base = this.add.image(wx, wy, 'wall_fill').setDepth(3).setTint(this.theme?.wallFillTint ?? 0xffffff);
        base.setDisplaySize(cell, cell);
        this.walls.add(base);
      const n = isWall(cx, cy-1), e = isWall(cx+1,cy), s = isWall(cx,cy+1), w = isWall(cx-1,cy);
      const addEdge = (angle)=>{
        const edge = this.add.image(wx, wy, 'wall_edge').setDepth(4).setTint(this.theme?.wallEdgeTint ?? 0xffffff);
        edge.setDisplaySize(cell, cell).setAngle(angle);
        this.walls.add(edge);
      };
      if (!n) addEdge(0);
      if (!e) addEdge(90);
      if (!s) addEdge(180);
      if (!w) addEdge(270);
    };

    decorateArenaFurniture(this, { cell, cols, rows, pad, isWall, isBorder, drawDefaultCell });

    // Extend border walls to screen edge by drawing an extra outer ring (skip the driveway gap)
    const gapSide = this.egress?.side;
    const gapW = this.egress?.width || 0;
    const gapCenter = this.egress?.entry?.x ?? 0;
    const gapCenterY = this.egress?.entry?.y ?? 0;
    // Top outer row y = -1
    for (let x=0; x<cols; x++){
      const skip = (gapSide==='N' && x>=Math.max(0, gapCenter - Math.floor(gapW/2)) && x<=Math.min(cols-1, gapCenter + Math.floor(gapW/2)));
      if (skip) continue;
      const wx = pad.x + x*cell + cell/2;
      const wy = pad.y - cell/2;
      const base = this.add.image(wx, wy, 'wall_fill').setDepth(3).setTint(this.theme?.wallFillTint ?? 0xffffff);
      base.setDisplaySize(cell, cell); this.walls.add(base);
    }
    // Bottom outer row y = rows
    for (let x=0; x<cols; x++){
      const skip = (gapSide==='S' && x>=Math.max(0, gapCenter - Math.floor(gapW/2)) && x<=Math.min(cols-1, gapCenter + Math.floor(gapW/2)));
      if (skip) continue;
      const wx = pad.x + x*cell + cell/2;
      const wy = pad.y + rows*cell + cell/2;
      const base = this.add.image(wx, wy, 'wall_fill').setDepth(3).setTint(this.theme?.wallFillTint ?? 0xffffff);
      base.setDisplaySize(cell, cell); this.walls.add(base);
    }
    // Left outer column x = -1
    for (let y=0; y<rows; y++){
      const skip = (gapSide==='W' && y>=Math.max(0, gapCenterY - Math.floor(gapW/2)) && y<=Math.min(rows-1, gapCenterY + Math.floor(gapW/2)));
      if (skip) continue;
      const wx = pad.x - cell/2;
      const wy = pad.y + y*cell + cell/2;
      const base = this.add.image(wx, wy, 'wall_fill').setDepth(3).setTint(this.theme?.wallFillTint ?? 0xffffff);
      base.setDisplaySize(cell, cell); this.walls.add(base);
    }
    // Right outer column x = cols
    for (let y=0; y<rows; y++){
      const skip = (gapSide==='E' && y>=Math.max(0, gapCenterY - Math.floor(gapW/2)) && y<=Math.min(rows-1, gapCenterY + Math.floor(gapW/2)));
      if (skip) continue;
      const wx = pad.x + cols*cell + cell/2;
      const wy = pad.y + y*cell + cell/2;
      const base = this.add.image(wx, wy, 'wall_fill').setDepth(3).setTint(this.theme?.wallFillTint ?? 0xffffff);
      base.setDisplaySize(cell, cell); this.walls.add(base);
    }
  }

  placeGetawayCar(){
    if (!this.egress) return;
    const side = this.egress.side;
    const ex = this.toWorldX(this.egress.entry.x);
    const ey = this.toWorldY(this.egress.entry.y);
    // Determine outward direction (toward the street) and place car just INSIDE the house at the driveway mouth
    let cx = ex, cy = ey, ang = 0, dx=0, dy=0;
    // Car art faces upward (headlights at top). Map angles accordingly so headlights point toward street.
    if (side==='N'){ ang = 0; dx=0; dy=-1; }
    else if (side==='S'){ ang = 180; dx=0; dy=1; }
    else if (side==='E'){ ang = 90; dx=1; dy=0; }
    else { ang = -90; dx=-1; dy=0; }
    // Place car so its front is in the gap, centered at the driveway mouth with a small interior nudge
    // Position center slightly toward the street so the nose sits in the gap
    const forward = this.cell * 0.6;
    cx = ex + dx * forward;
    cy = ey + dy * forward;

    // Use blue car sprite
    const carLen = this.cell*2.6; // larger silhouette
    const car = this.add.image(cx, cy, 'car_blue').setDepth(1200);
    car.setDisplaySize(carLen, this.cell*1.4).setTint(this.theme?.carTint ?? 0xffffff);
    car.setAngle(ang);
    this.car = car;
    this.carOutDir = { x:dx, y:dy };
    // REAL / BUNK STASH PATCH: ensure car beacon starts off
    this.hideCarBeacon?.();
  }

  // REAL / BUNK STASH PATCH: car beacon to guide extraction after pickup
  // REAL / BUNK STASH PATCH: car beacon to guide extraction after pickup (delegated to VFX controller)
  showCarBeacon(){
    this.vfx.showCarBeacon();
  }
  hideCarBeacon(){
    this.vfx.hideCarBeacon();
  }

  startExtractionSequence(){
    return this.progressionManager.startExtractionSequence();
  }


  // stash & extract
  makeObjectives(stashCell, extractCell){
    // REAL / BUNK STASH PATCH: helper to create duffel/package visual
    const makeDuffel = (x, y, baseScale = 1) => {
      // REAL / BUNK STASH PATCH: bump ground duffel size a little
      const w = this.cell * 0.82 * baseScale;
      const h = this.cell * 0.52 * baseScale;
      const container = this.add.container(x, y).setDepth(1000);
      // Invisible sensor for consistent overlap bounds
      const sensor = this.add.rectangle(0, 0, w, h, 0x000000, 0.0001);
      // Graphics-based rounded rectangle + tape stripe
      const g = this.add.graphics();
      const tan = 0xC8A97E;    // duffel/package color
      const tanDark = 0xA9885F; // border color
      const tape = 0x8B7355;   // darker tape stripe
      const gloss = 0xE7D3B5;  // soft highlight
      // Draw duffel body
      g.fillStyle(tan, 1);
      g.lineStyle(Math.max(2, Math.floor(this.cell * 0.05)), tanDark, 1);
      const rad = Math.max(4, Math.floor(this.cell * 0.14 * baseScale));
      g.fillRoundedRect(-w/2, -h/2, w, h, rad);
      g.strokeRoundedRect(-w/2, -h/2, w, h, rad);
      // Tape stripe (horizontal band)
      const stripeH = Math.max(4, Math.floor(h * 0.28));
      g.fillStyle(tape, 1);
      g.fillRect(-w/2 + 4, -stripeH/2, w - 8, stripeH);
      // Subtle top-left gloss highlight
      g.fillStyle(gloss, 0.10);
      g.fillRoundedRect(-w/2 + 6, -h/2 + 6, w * 0.35, h * 0.30, rad * 0.6);
      // Faint marking
      const mark = this.add.text(-w*0.18, -h*0.06, '$', { fontSize: `${Math.max(10, Math.floor(this.cell*0.30*baseScale))}px`, color: '#2b2b2b' })
        .setAlpha(0.25)
        .setOrigin(0.5);
      container.add([sensor, g, mark]);
      // Mark so our logic can identify the object type
      container.isPackage = true;
      container.sensor = sensor;
      container.drawGfx = g;
      return container;
    };
    const sx = this.toWorldX(stashCell.x);
    const sy = this.toWorldY(stashCell.y);
    // NOTE: extract sensor sits at driveway entry; the second prefab pocket is at extractCell
    const ex = this.egress ? this.toWorldX(this.egress.entry.x) : this.toWorldX(extractCell.x);
    const ey = this.egress ? this.toWorldY(this.egress.entry.y) : this.toWorldY(extractCell.y);
    const px2 = this.toWorldX(extractCell.x);
    const py2 = this.toWorldY(extractCell.y);

    // REAL / BUNK STASH PATCH: destroy any prior package objects
    this.stash?.destroy?.();
    this.bunkStash?.destroy?.();

    // Choose randomly which pocket is the real package (deterministic based on seed)
    // Always create fresh RNG from seed to ensure same round = same real/bunk assignment
    const bunkRng = makeRng((this.seed ^ 0xC0FFEE) | 0);
    const realAtPrimary = (bunkRng() < 0.5);

    // Spawn visually identical packages at both pockets
    const pkgA = makeDuffel(sx, sy, 1);
    const pkgB = makeDuffel(px2, py2, 1);
    pkgA.setVisible(true);
    pkgB.setVisible(true);

    // Assign references: this.stash is always the REAL one; this.bunkStash is the decoy
    if (realAtPrimary){
      this.stash = pkgA;     // real
      this.bunkStash = pkgB; // decoy
    } else {
      this.stash = pkgB;     // real
      this.bunkStash = pkgA; // decoy
    }

    // Add a shared halo drawer that renders around BOTH packages so they're obvious
    // Both look identical (real/bunk) before pickup
    this.stashHalo?.destroy?.();
    this.stashHalo = this.add.graphics().setDepth(999).setVisible(true);
    this._drawStashHalo = () => {
      if (!this.stashHalo) return;
      this.stashHalo.clear();
      const t = (performance.now() % 1200) / 1200;
      const r = this.cell * (0.65 + 0.15 * Math.sin(t * 2 * Math.PI));
      const drawAt = (obj) => {
        if (!obj || !obj.active || obj.visible === false) return;
        const a = Math.max(0.0, Math.min(1.0, obj.alpha ?? 1));
        this.stashHalo.lineStyle(3, 0x86efac, 0.9 * a);
        this.stashHalo.strokeCircle(obj.x, obj.y, r);
        this.stashHalo.lineStyle(1, 0x86efac, 0.4 * a);
        this.stashHalo.strokeCircle(obj.x, obj.y, r + 6);
      };
      drawAt(this.stash);
      drawAt(this.bunkStash);
    };

    const carW = this.cell * 1.6;
    const carH = this.cell * 1.0;
    // Make extraction pad larger for fair, precise detection (matching tutorial mechanics)
    // Tutorial uses 2.8 cells for mobile-friendly extraction without vacuum effect
    this.extract?.destroy?.();
    this.extract = this.add.rectangle(ex, ey, this.cell*2.8, this.cell*2.8, 0x000000, 0.0001).setDepth(1000);
    this.extractHalo?.destroy?.();
    this.extractHalo = null;
    this._drawExtractHalo = null;
  }

  addCarryPackage(){
    if (!this.attacker) return;
    this.removeCarryPackage();
    this.destroyRunnerAbilityUI();
    // REAL / BUNK STASH PATCH: reuse the duffel visual at a smaller scale, add a faint glow
    const makeCarryDuffel = () => {
      const w = this.cell * 0.45;
      const h = this.cell * 0.30;
      const c = this.add.container(0, -this.cell * 0.25);
      const sensor = this.add.rectangle(0, 0, w, h, 0x000000, 0.0001);
      const g = this.add.graphics();
      const tan = 0xC8A97E, tanDark = 0xA9885F, tape = 0x8B7355, gloss = 0xE7D3B5;
      const rad = Math.max(3, Math.floor(this.cell * 0.10));
      g.fillStyle(tan, 1);
      g.lineStyle(Math.max(2, Math.floor(this.cell * 0.05)), tanDark, 1);
      g.fillRoundedRect(-w/2, -h/2, w, h, rad);
      g.strokeRoundedRect(-w/2, -h/2, w, h, rad);
      g.fillStyle(tape, 1);
      const stripeH = Math.max(3, Math.floor(h * 0.40));
      g.fillRect(-w/2 + 3, -stripeH/2, w - 6, stripeH);
      g.fillStyle(gloss, 0.12);
      g.fillRoundedRect(-w/2 + 4, -h/2 + 4, w * 0.36, h * 0.34, rad * 0.6);
      const aura = this.add.ellipse(0, 0, w * 1.4, h * 1.8, 0x86efac, 0.28)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.20);
      c.add([aura, sensor, g]);
      // subtle pulsing glow on carry only
      this.tweens.add({ targets: aura, alpha: 0.45, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return c;
    };
    const pkg = makeCarryDuffel();
    this.attacker.add(pkg);
    this.carrySprite = pkg;
  }

  removeCarryPackage(){
    if (!this.carrySprite) return;
    this.attacker.remove(this.carrySprite, true);
    this.carrySprite = null;
  }

  refreshAmmoForLoadout(){
    if (!this.roundAmmo) return;
    for (const key of Object.keys(this.roundAmmo)) this.roundAmmo[key] = 0;
    const armed = this.allowedGuns?.[0];
    if (!armed) {
      this.weapon = null;
      return;
    }
    const stats = this.weaponStats?.[armed] || this.weaponStats?.pistol;
    if (stats) {
      this.roundAmmo[armed] = stats.clip;
    }
    this.weapon = armed;
  }

  selectLoadout(weapon){
    if (!this.availableGuns?.includes?.(weapon)) return false;
    this.allowedGuns = [weapon];
    this.refreshAmmoForLoadout();
    return true;
  }

  setWeapon(w){
    if (!w) { this.weapon = null; return; }
    if (!this.allowedGuns.includes(w)) return;
    this.weapon = w;
  }

  getWeaponStats(weapon){
    return this.weaponStats?.[weapon] || this.weaponStats?.pistol;
  }


  beginRoundTimer(){
    this.endAt = performance.now() + this.timerMs;
    this.roundPausedForMenu = false;

    // Initialize RepTracker for this round via ProgressionManager
    if (this.progressionManager) {
      this.progressionManager.startRound(this.pveRound || 1);
    }

    // Reset AI orientation timers for new round
    resetPlugOrientation(this);
    resetRunnerOrientation(this);
  }

  // Weapon selection prompt (delegated to GameUI controller)
  promptPlugWeaponSelection(onDone){
    return this.gameUI.promptPlugWeaponSelection(onDone);
  }

  // --- Runner power selection (pick TWO, order matters) (delegated to GameUI controller) ---
  promptRunnerPowerSelection(onDone){
    return this.gameUI.promptRunnerPowerSelection(onDone);
  }

  // ---- Runner power helpers (order-based execution) ----
  activateRunnerPowerByIndex(idx){
    // Handle both player runner and AI runner powers
    const isAI = this.role === 'plug'; // When player is plug, the AI is the runner
    const sel = isAI ? (this.aiRunnerPowersSelected || []) : (this.runnerPowersSelected || []);
    const used = isAI ? (this.aiRunnerPowersConsumed || []) : (this.runnerPowersConsumed || []);

    if (idx < 0 || idx >= 2) return;
    if (!sel[idx]) return;
    if (used[idx]) return;

    const power = sel[idx];
    // perform power immediately (no per-power cooldown; consumable)
    this.performRunnerPower(power);
    used[idx] = true;

    // Update the correct property based on who's using it
    if (isAI) {
      this.aiRunnerPowersConsumed = used;
    } else {
      this.runnerPowersConsumed = used;
    }
  }

  performRunnerPower(power){
    const now = performance.now();
    const stats = this.runnerPowerStats?.[power];
    if (!stats) return;

    // Track power usage for REP system
    if (this.progressionManager?.repTracker && this.role === 'runner') {
      this.progressionManager.repTracker.onPowerUsed(power);
    }

    if (power === 'phase'){
      // Play phase sound effect (louder)
      try {
        this.sound.play('phase', { volume: 0.7 });
      } catch {}
      // No dash: only set intangibility window and visual fade
      this.attacker.setAlpha(stats.fadeAlpha ?? 0.45);
      this.phaseActiveUntil = now + (stats.duration || 600);
    } else if (power === 'dash'){
      // Play dash sound effect (quieter and much faster to match instant teleport)
      try {
        this.sound.play('dash', { volume: 0.2, rate: 2.5 });
      } catch {}
      // Jump forward a few tiles along current facing, blocked by walls
      const moveDir = this._runnerInputDir || this._runnerMoveDir || this._runnerLastAim || null;
      const aim = moveDir || this.getRunnerFacing();
      const dir = (Math.abs(aim.x) >= Math.abs(aim.y)) ? { x: Math.sign(aim.x) || 1, y: 0 } : { x: 0, y: Math.sign(aim.y) || 1 };
      const steps = Math.max(1, stats.tiles || 3);
      const start = this.toCell(this.attacker.x, this.attacker.y);
      let cx = start.x, cy = start.y;
      for (let i=0; i<steps; i++){
        const nx = cx + dir.x, ny = cy + dir.y;
        if (!this.inBoundsCell(nx, ny) || !this.isWalkableCell(nx, ny)) break;
        cx = nx; cy = ny;
      }
      this.attacker.x = this.toWorldX(cx);
      this.attacker.y = this.toWorldY(cy);
    } else if (power === 'decoy'){
      // Play decoy sound effect
      try {
        this.sound.play('decoy', { volume: 0.4 });
      } catch {}
      this.destroyDecoySprite();
      const decoy = makeRunnerSprite(this, this.attacker.x, this.attacker.y, this.cell)
        .setDepth(this.attacker.depth - 0.5)
        .setAlpha(1.0);
      if (this.wallMask) decoy.setMask(this.wallMask);
      // match runner look exactly (no tint)
      decoy.list?.forEach?.(child => child.clearTint?.());
      this.decoySprite = decoy;
      this.decoyExpiresAt = now + (stats.life || 5000);
      const dir = this.getRunnerFacing();
      const speed = stats.speed || (this.runnerSpeed * 0.9);
      this.decoyVelocity = { x: dir.x * speed, y: dir.y * speed };
    }
  }

  // Legacy single-power path (kept for keyboard Q/E/SHIFT fallback)
  selectRunnerPower(power){
    if (!this.availableRunnerPowers?.includes?.(power)) return false;
    this.runnerPower = power;
    this.runnerPowerReadyAt = performance.now();
    this.refreshAbilityButtonLabel();
    this.updateRunnerAbilityUI();
    return true;
  }

  getRunnerPowerLabel(power){
    const stats = this.runnerPowerStats?.[power];
    return stats?.label || (power ? power[0].toUpperCase() + power.slice(1) : '');
  }

  updateRunnerAbilityUI(){ return; /* HUD disabled on purpose */ }

  refreshAbilityButtonLabel(){
    if (!this.abilityButton) return;
    const stats = this.runnerPowerStats?.[this.runnerPower];
    const label = stats?.label || this.runnerPower || 'PWR';
    const short = (label.match(/[A-Z]/g)?.join('') || label.slice(0,3) || 'PWR').toUpperCase();
    this.abilityButton.icon?.setText(short);
  }

  updateAbilityButtonVisual(/*ready*/){ return; /* HUD disabled */ }

  ensureRunnerAbilityButton(){ this.destroyAbilityButton(); return; /* HUD disabled */ }

  destroyAbilityButton(){
    if (!this.abilityButton) return;
    this.abilityButton.btn?.destroy?.();
    this.abilityButton.icon?.destroy?.();
    this.abilityButton = null;
  }

  destroyRunnerAbilityUI(){ this.runnerAbilityText?.destroy?.(); this.runnerAbilityText=null; this.destroyAbilityButton(); return; /* HUD disabled */ }

  getRunnerFacing(){
    const aim = this._runnerInputDir || this._runnerLastAim || this.playerAim || this._aiLastMoveDir || { x: 1, y: 0 };
    const len = Math.hypot(aim.x, aim.y) || 1;
    return { x: aim.x / len, y: aim.y / len };
  }

  runnerIsPhasing(){
    return performance.now() < (this.phaseActiveUntil || 0);
  }

  destroyDecoySprite(){
    if (!this.decoySprite) return;
    this.decoySprite.destroy();
    this.decoySprite = null;
    this.decoyExpiresAt = 0;
    this.decoyVelocity = { x: 0, y: 0 };
  }

  // Legacy: generic activation for single-power mode
  activateRunnerPower(force=false){
    const controlledByPlayer = this.role === 'runner';
    if (!force && !controlledByPlayer) return;
    if (!this.runnerPowerStats || !this.runnerPower) return;
    const now = performance.now();
    if (now < (this.runnerPowerReadyAt || 0)) return;

    const stats = this.runnerPowerStats[this.runnerPower];
    if (!stats) return;

    this.performRunnerPower(this.runnerPower);

    this.runnerPowerReadyAt = now + (stats.cooldown || 7000);
    if (controlledByPlayer) {
      this.updateRunnerAbilityUI();
    }
  }


  firePlug(){
    if (this.role !== 'plug') return;
    const weapon = this.weapon;
    if (!weapon) return;
    if ((this.roundAmmo[weapon] || 0) <= 0) return;

    this.roundAmmo[weapon] -= 1;

    // Use playerGunAim for both desktop AND mobile when available (fixes drag-aim on mobile)
    const aim = (this.playerController?.playerGunAim || this.playerAim) || { x: 1, y: 0 };
    this.combatSystem.spawnWeaponBurst(this.defender, aim, weapon, this.bulletsD);

    // Play a quick shooting animation if available
    if (this.defender?.sprite?.anims && !this.defender?.usesTD){
      this.defender.sprite.play('plug-shot', true);
      if (this.defender.outline){ for (const o of this.defender.outline) o.play('plug-shot', true); }
      this.defender.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        // resume appropriate loop based on motion handled in updateAvatarVisuals
      });
    }

    if (this.totalRoundsLeft() === 0) this.meleeEnabled = true;
  }
  totalRoundsLeft(){ let sum=0; for (const g of this.allowedGuns) sum += (this.roundAmmo[g]||0); return sum; }

  tryMouseFire(){
    if (this.role !== 'plug') return;
    const now = performance.now();
    if (now < (this._mouseCDAt || 0)) return;
    this._mouseCDAt = now + (this._mouseRateMs || 140);
    this.firePlug();
  }

  update(_, delta){
    // Update visual effects (delegated to VFX controller)
    this.vfx.update(delta / 1000);

    // Draw helper visuals each frame if enabled
    this._drawStashHalo?.();
    this._drawExtractHalo?.(); // kept for compatibility if re-enabled elsewhere
    this._drawCarBeacon?.();

    if (!this.attacker || !this.defender) return; // scene still initializing / lazy-load path
    if (!this.attacker.visible || this.roundOver) return;
    if (this.roundPausedForMenu) return;

    const now = performance.now();
    const dt = delta / 1000;

    if (this.role !== 'runner') {
      this.aiController.considerAIRunnerPower(now);
      // Street Wars: Apply human-like power usage
      considerStreetWarsPowerUse(this);
    } else {
      this.updateRunnerAbilityUI();
    }

    if (this.isDesktop && this._mouseDown) this.combatSystem.tryMouseFire();

    const phasing = this.runnerIsPhasing();
    if (phasing){
      const stats = this.runnerPowerStats?.[this.runnerPower];
      const fade = stats?.fadeAlpha ?? 0.45;
      if (this.attacker.alpha !== fade) this.attacker.setAlpha(fade);
    } else if (this.attacker.alpha !== 1){
      this.attacker.setAlpha(1);
    }

    if (this.decoySprite){
      if (now >= (this.decoyExpiresAt || 0)){
        this.destroyDecoySprite();
      } else {
        this.decoySprite.x += (this.decoyVelocity?.x || 0) * dt;
        this.decoySprite.y += (this.decoyVelocity?.y || 0) * dt;
      }
    }

    const left = Math.max(0, this.endAt - now);
    if (left <= 0) return this.endRound('defender');

    const moveSpeedRunner = this.runnerSpeed * (this.hasStash ? this.carrySlow : 1);
    let plugBaseSpeed = (this.meleeEnabled ? this.plugSpeedNoAmmo : this.plugSpeed);
    // Slight aim-assisted slowdown for player-controlled plug to make drag-aiming easier
    if (this.role === 'plug'){
      const aimSlow = (this._aimDragActive || (this.isDesktop && this._mouseDown)) ? (this.aimDragFactorPlug || 0.85) : 1;
      plugBaseSpeed *= aimSlow;
    }


    // Update player-controlled movement via PlayerController
    this.playerController.update(dt);

    // Update AI based on role
    if (this.role==='runner'){
      this.aiController.updatePlug(dt);
    } else {
      this.aiController.updateRunner(delta);
    }

    // Update combat system (bullets and hit detection)
    this.combatSystem.update(delta);
    // Exit immediately if round ended during combat update (prevents race conditions)
    if (this.roundOver) return;

    updateAvatarVisuals(this, dt);

    // anti-camp (REAL / BUNK STASH PATCH: only consider the REAL stash)
    {
      const dx = this.defender.x - this.stash.x;
      const dy = this.defender.y - this.stash.y;
      const near = Math.hypot(dx, dy) < this.antiCampRadius;
      this.antiCampTime = near ? (this.antiCampTime + delta) : 0;
      if (!this.hasStash && this.antiCampTime > this.antiCampThreshold) {
        this.antiCampTime = 0;
        const newCell = this.randomFloorCellFarFrom(this.toCell(this.attacker.x, this.attacker.y), 8);
        this.stash.x = this.toWorldX(newCell.x);
        this.stash.y = this.toWorldY(newCell.y);
        this.stash.setVisible(true);
        // No label/halo styling here to keep visuals identical
        this.stashUnlockAt = performance.now() + 800;
      }
    }

    // REAL / BUNK STASH PATCH: handle pickups for both packages
    if (!this.hasStash && now >= this.stashUnlockAt){
      const gotReal = rectsOverlap(this.attacker, this.stash);
      const gotBunk = this.bunkStash && rectsOverlap(this.attacker, this.bunkStash);
      if (gotReal){
        this.hasStash = true;
        this.aiRunnerTargetsBunkFirst = false;
        // Track real stash pickup for REP (runner got it right)
        if (this.progressionManager?.repTracker && this.role === 'runner') {
          this.progressionManager.repTracker.onStashPickup(false); // false = not bunk
        } else if (this.progressionManager?.repTracker && this.role === 'plug') {
          this.progressionManager.repTracker.onStashPickup(false); // Plug sees runner got real stash
        }

        // PvE mode: Stash is awarded on extraction, not pickup
        // (This prevents double-counting with extraction rewards in ProgressionManager)

        // Play pickup sounds (generic pickup + real stash pickup)
        try { this.audio?.play('pickup', { volume: 0.9, rateRand: 0.04 }); } catch {}
        try { this.audio?.play('spickup', { volume: 0.85, rateRand: 0.03 }); } catch {}
        // Hide both ground packages and clear any stash halo
        this.stash?.setVisible(false);
        this.bunkStash?.destroy?.();
        this.stashHalo?.clear?.();
        this.stashHalo?.setVisible(false);
        this._drawStashHalo = null;
        // Add carry sprite and light up the car instead of an off-center halo
        this.showCarBeacon?.();
        // Start engine sounds (start plays once, idle loops until extraction)
        try { this.audio?.startEngineLoop(); } catch {}
        this.addCarryPackage();
      } else if (gotBunk){
        // Bunk pickup: fade the decoy and show a quick "BUNK!" toast
        const decoy = this.bunkStash;
        if (decoy && !decoy._fading){
          decoy._fading = true;
          this.aiRunnerTargetsBunkFirst = false;
          // Track bunk stash pickup for REP (runner got fooled)
          if (this.progressionManager?.repTracker && this.role === 'runner') {
            this.progressionManager.repTracker.onStashPickup(true); // true = bunk
          }
          // Play pickup sounds (generic pickup + bunk stash pickup)
          try { this.audio?.play('pickup', { volume: 0.9, rateRand: 0.04 }); } catch {}
          try { this.audio?.play('bpickup', { volume: 0.85, rateRand: 0.03 }); } catch {}
          const bunkText = this.add.text(decoy.x, decoy.y - this.cell * 0.65, 'BUNK!', { fontSize: `${Math.max(16, Math.floor(this.cell*0.6))}px`, color:'#f87171', fontStyle:'bold' })
            .setOrigin(0.5)
            .setDepth(2000)
            .setAlpha(0.95);
          // REAL / BUNK STASH PATCH: extend toast visibility so "BUNK!" lingers longer
          this.tweens.add({ targets: bunkText, y: bunkText.y - this.cell * 0.55, alpha: 0, duration: 950, ease: 'Cubic.easeOut', onComplete: () => bunkText.destroy() });
          this.tweens.add({ targets: decoy, alpha: 0, scale: 0.82, duration: 680, ease: 'Cubic.easeIn', onComplete: () => {
            decoy.destroy();
            this.bunkStash = null;
          this.aiRunnerTargetsBunkFirst = false;
          } });
        }
      }
    }

    // extract win (using precise overlaps instead of rectsOverlap for fairer extraction)
    if (!this.roundOver && this.hasStash && overlaps(this.attacker, this.extract)) return this.startExtractionSequence();

    // Unstuck runner if inside wall and not phasing
    if (!this.runnerIsPhasing?.() && this.isWallAtWorld?.(this.attacker.x, this.attacker.y)) this.ensureUnstuck(this.attacker);

    // melee tag (runner i-frames respected)
    if (this.meleeEnabled && !phasing && rectsOverlap(this.defender, this.attacker) && this.canDamage(this.attacker)) {
      this.combatSystem.hit(this.attacker);
    }
  }




  updateBullets(delta){
    const dt = delta/1000;
    const now = performance.now();
    const spawnTrail = (x, y, color)=>{
      const t = this.add.circle(x, y, Math.max(2, Math.floor(this.cell * 0.10)), color, 0.55)
        .setDepth(8)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: t, alpha: 0, scale: 0.6, duration: 220, ease: 'Cubic.easeOut', onComplete: ()=> t.destroy() });
    };
    const impact = (x, y, color, playSound = false)=>{
      const f = this.add.circle(x, y, Math.max(5, Math.floor(this.cell * 0.20)), color, 0.95)
        .setDepth(12)
        .setBlendMode(Phaser.BlendModes.ADD);
      const ring = this.add.circle(x, y, Math.max(7, Math.floor(this.cell * 0.26)), 0xffffff, 0.25)
        .setDepth(12)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: [f, ring], alpha: 0, scale: 1.4, duration: 160, ease: 'Cubic.easeOut', onComplete: ()=>{ f.destroy(); ring.destroy(); } });
      // a couple quick sparkles
      for (let i=0;i<2;i++) spawnTrail(x + (Math.random()-0.5)*this.cell*0.2, y + (Math.random()-0.5)*this.cell*0.2, color);
      // Impact SFX only when hitting players (not walls)
      if (playSound) {
        try { this.audio?.play('impact', { volume: 0.85, rateRand: 0.05 }); } catch {}
      }
    };
    // expose impact helper for hit() to use when we destroy bullets in other paths
    this._spawnBulletImpact = (x, y, color) => impact(x, y, color, true); // player hits play sound
    const step = (group)=>{
      group.getChildren().forEach(b=>{
        b.x += (b.vx||0) * dt;
        b.y += (b.vy||0) * dt;
        if (b._glow){ b._glow.x = b.x; b._glow.y = b.y; }
        if (!b._trailAt || (now - b._trailAt) > 45){ spawnTrail(b.x, b.y, b._color || 0xffffff); b._trailAt = now; }
        b.life -= delta;
        if (this.isBulletBlockedAtWorld(b.x, b.y) || b.life<=0){
          // Track bullet miss for REP (if it expires/hits wall without hitting target)
          if (this.progressionManager?.repTracker && this.role === 'plug' && group === this.bulletsD && !b._repTracked) {
            this.progressionManager.repTracker.onBulletFired(false); // Missed shot
            b._repTracked = true;
          }
          impact(b.x, b.y, b._color || 0xffffff);
          b._glow?.destroy?.();
          b._rim?.destroy?.();
          b.destroy();
        }
      });
    };
    step(this.bulletsA);
    step(this.bulletsD);
  }

  checkHits(){
    const phasing = this.runnerIsPhasing();
    this.bulletsD.getChildren().forEach(b=>{
      if (this.decoySprite && rectsOverlap(b, this.decoySprite)){
        this._spawnBulletImpact?.(b.x, b.y, b._color || 0xffffff);
        // Track bullet hit decoy (counts as hit for plug)
        if (this.progressionManager?.repTracker && this.role === 'plug' && !b._repTracked) {
          this.progressionManager.repTracker.onBulletFired(true);
          b._repTracked = true;
        }
        b._glow?.destroy?.(); b._rim?.destroy?.(); b.destroy();
        this.destroyDecoySprite();
        return;
      }
      if (rectsOverlap(b, this.attacker)){
        if (phasing) return;
        this._spawnBulletImpact?.(b.x, b.y, b._color || 0xffffff);
        // Track bullet hit runner (counts as hit for plug)
        if (this.progressionManager?.repTracker && this.role === 'plug' && !b._repTracked) {
          this.progressionManager.repTracker.onBulletFired(true);
          b._repTracked = true;
        }
        b._glow?.destroy?.(); b._rim?.destroy?.(); b.destroy();
        if (this.canDamage(this.attacker)) this.hit(this.attacker);
      }
    });
    this.bulletsA.getChildren().forEach(b=>{
      if (rectsOverlap(b, this.defender)){
        this._spawnBulletImpact?.(b.x, b.y, b._color || 0xffffff);
        b._glow?.destroy?.(); b.destroy();
        this.hit(this.defender);
      }
    });
  }

  hit(who){
    if (!this.canDamage(who)) return;

    who.hp -= 1;
    who.iUntil = performance.now() + (this.iFrameMs || 900);

    // Track damage for REP system
    if (this.progressionManager?.repTracker && who === this.attacker && this.role === 'runner') {
      this.progressionManager.repTracker.onBulletHitPlayer();
    }

    // Play a quick 'ouch' hit SFX
    try { this.audio?.play('ouch', { volume: 0.7, rateRand: 0.03 }); } catch {}

    this.cameras.main.shake(80, 0.006);
    this.tweens.add({
      targets: who,
      alpha: 0.2,
      duration: 70,
      yoyo: true,
      repeat: Math.max(1, Math.floor((this.iFrameMs || 900) / (70*2)) - 1),
      onComplete: ()=> who.setAlpha(1)
    });

    if (who.hp <= 0){
      if (who === this.attacker){
        if (this.mode === 'pve' && this.role === 'plug'){
          this.handlePlugRunnerDefeated({ x: who.x, y: who.y });
        } else {
          this.endRound('defender');
        }
      } else {
        this.endRound('attacker');
      }
    }
  }

  handlePlugRunnerDefeated(origin){
    if (this.roundOver) return;

    this.roundOver = true;
    this.roundPausedForMenu = true;

    // Clean up active effects so the modal/restart feels calm
    this.destroyDecoySprite();
    const destroyGroup = (group) => {
      const children = group?.getChildren?.() || [];
      children.forEach((b) => b.destroy());
    };
    destroyGroup(this.bulletsA);
    destroyGroup(this.bulletsD);
    this.hideCarBeacon?.();
    this.removeCarryPackage?.();
    // Stop engine sounds if runner was carrying stash when killed
    try { this.audio?.stopEngineLoop(); } catch {}
    this.hasStash = false;

    this.input.keyboard.enabled = false;
    this._mouseDown = false;

    // Fade the attacker sprite out so it feels like a takedown
    if (this.attacker){
      this.tweens.add({
        targets: this.attacker,
        alpha: 0,
        duration: 220,
        ease: 'Sine.easeOut',
        onComplete: () => this.attacker.setVisible(false)
      });
    }

    const currentRound = this.pveRound || 1;

    // Track runner elimination for REP calculation
    if (this.progressionManager?.repTracker) {
      this.progressionManager.repTracker.onRunnerEliminated();
    }

    // Calculate rewards using new tracking system
    const roundCompletion = recordRoundCompletion(this.role, currentRound);
    const stashEarned = roundCompletion.earnedStash ? 1 : 0;

    // Calculate REP using RepTracker
    let repEarned = 0;
    if (this.progressionManager?.repTracker) {
      const repResult = this.progressionManager.repTracker.calculateFinalRep(roundCompletion.repMultiplier);
      repEarned = repResult.finalRep;
      console.log('[Plug] REP Breakdown:', repResult.breakdown);
    }

    this.pveSessionStash += stashEarned;
    this.pveSessionRep = Math.round((this.pveSessionRep || 0) + repEarned);
    this.pveBestRound = Math.max(this.pveBestRound ?? 0, currentRound);
    console.log('[Plug] Round', currentRound, '- Stash earned:', stashEarned, '(first completion:', roundCompletion.isFirstCompletion, ')');
    console.log('[Plug] Session totals - Stash:', this.pveSessionStash, 'Rep:', this.pveSessionRep);
    console.log('[Plug] Submitting to leaderboard - Round:', currentRound, 'Stash:', this.pveSessionStash, 'Rep:', this.pveSessionRep);

    // Update user's total accumulated stash and REP
    const user = getCurrentUser();
    updateUserStats({
      totalStash: (user.stats?.totalStash || 0) + stashEarned,
      totalRep: Math.round((user.stats?.totalRep || 0) + repEarned)
    });

    // Track route progress for leaderboard
    updateRouteProgress(this.role, currentRound);

    // Submit score to daily leaderboard
    submitScore(this.role, currentRound, this.pveSessionStash, this.pveSessionRep);

    this.showFloatingRewards(stashEarned, repEarned, origin);

    const nextRound = currentRound + 1;
    this.pveRound = nextRound;

    // Save session state (for continue feature) - save with next round since we're advancing
    saveSessionState(this.role, {
      pveRound: nextRound,
      pveSessionStash: this.pveSessionStash,
      pveSessionRep: this.pveSessionRep,
      pveBestRound: this.pveBestRound
    });

    // Use route seed for next round (deterministic based on route + round + role)
    const routeID = this.currentRouteID ?? getCurrentRouteID();
    const newSeed = getRouteSeed(routeID, nextRound, this.role);
    this.seed = newSeed;

    this.time.delayedCall(1600, () => {
      this.scene.restart({
        mode: 'pve',
        role: 'plug',
        seed: newSeed,
        pveRound: nextRound,
        pveSessionStash: this.pveSessionStash,
        pveSessionRep: this.pveSessionRep,
        pveBestRound: this.pveBestRound
      });
    });
  }

  randomFloorCellFarFrom(ref, minDist=10){
    const md = (a,b)=> Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
    for (let tries=0; tries<200; tries++){
      const x = 1 + Math.floor(Math.random()*(this.cols-2));
      const y = 1 + Math.floor(Math.random()*(this.rows-2));
      if (this.isWalkableCell(x,y) && (!ref || md({x,y}, ref) >= minDist)) return {x,y};
    }
    return { x: Math.floor(this.cols/2), y: Math.floor(this.rows/2) };
  }

  /* ------------- Mobile Controls: swipe + tap ------------- */
  makeMobileControls(){
    this.destroyTouchUI?.();

    // Thresholds adapted from 9/17 build that worked well on devices
    const SWIPE_DEAD_PX = 10;   // minimum movement to count as a swipe
    const TAP_TIME_MS = 220;    // maximum duration to count as a tap
    const TAP_MOVE_PX = 8;      // maximum movement to still count as a tap (stricter to avoid accidental swipes)
    const DOUBLE_TAP_MAX_MS = 250; // stricter window for double-tap power

    this._swipePid = null;
    this._swipeStart = null;

    // Delegate touch input to PlayerController
    const beginSwipe = (p) => this.playerController.beginSwipe(p);

    const updateSwipe = (p) => this.playerController.updateSwipe(p);

    const endSwipe = (p) => this.playerController.endSwipe(p);

    // Create a full-screen interactive zone to guarantee pointer delivery on mobile browsers.
    const vw = this.scale.gameSize.width;
    const vh = this.scale.gameSize.height;
    const zone = this.add.zone(this.cameras.main.centerX, this.cameras.main.centerY, vw, vh)
      .setScrollFactor(0).setDepth(1).setInteractive();

    // Expose base functions for rebinds after modals
    this._touchBaseFns = { beginSwipe, updateSwipe, endSwipe };

    // Choose handler functions (optionally wrapped with debug overlay)
    let downHandler = beginSwipe;
    let moveHandler = updateSwipe;
    let upHandler   = endSwipe;

    // Touch debug disabled - clean UI

    // Bind to both the zone and the global input to be extra robust across platforms
    zone.on('pointerdown', downHandler);
    zone.on('pointermove', moveHandler);
    zone.on('pointerup',   upHandler);
    this.input.on('pointerdown', downHandler);
    this.input.on('pointermove', moveHandler);
    this.input.on('pointerup',   upHandler);
    this.input.on('pointerupoutside', upHandler);
    this.input.on('gameout', upHandler);

    // iOS/Safari fallback: also listen to raw DOM touch events and translate to our handlers
    const canvas = this.sys.game?.canvas || this.game?.canvas;
    const normXY = (clientX, clientY) => {
      const r = canvas.getBoundingClientRect();
      const x = (clientX - r.left) * (canvas.width / (r.width || 1));
      const y = (clientY - r.top)  * (canvas.height/ (r.height|| 1));
      return { x, y };
    };
    const onTouchStart = (e) => {
      if (!e.changedTouches || !e.changedTouches.length) return;
      const t = e.changedTouches[0];
      const { x, y } = normXY(t.clientX, t.clientY);
      downHandler({ id: t.identifier ?? 0, x, y, isDown: true });
      e.preventDefault();
    };
    const onTouchMove = (e) => {
      if (!e.changedTouches || !e.changedTouches.length) return;
      for (let i=0;i<e.changedTouches.length;i++){
        const t = e.changedTouches[i];
        if (this._swipePid !== null && t.identifier !== this._swipePid) continue;
        const { x, y } = normXY(t.clientX, t.clientY);
        moveHandler({ id: t.identifier ?? 0, x, y, isDown: true });
      }
      e.preventDefault();
    };
    const onTouchEnd = (e) => {
      if (!e.changedTouches || !e.changedTouches.length) return;
      for (let i=0;i<e.changedTouches.length;i++){
        const t = e.changedTouches[i];
        const { x, y } = normXY(t.clientX, t.clientY);
        upHandler({ id: t.identifier ?? 0, x, y, isDown: false });
      }
      e.preventDefault();
    };
    canvas?.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas?.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas?.addEventListener('touchend',   onTouchEnd,   { passive: false });
    canvas?.addEventListener('touchcancel',onTouchEnd,   { passive: false });

    // keep refs for cleanup
    this._touchHandlers = { downHandler, moveHandler, upHandler, zone };
    this._domTouchHandlers = { onTouchStart, onTouchMove, onTouchEnd };
  }

  destroyTouchUI(){
    if (!this._touchHandlers) return;
    const { downHandler, moveHandler, upHandler, zone } = this._touchHandlers;
    try {
      zone?.off?.('pointerdown', downHandler);
      zone?.off?.('pointermove', moveHandler);
      zone?.off?.('pointerup', upHandler);
      zone?.destroy?.();
    } catch {}
    this.input.off('pointerdown', downHandler);
    this.input.off('pointermove', moveHandler);
    this.input.off('pointerup', upHandler);
    this.input.off('pointerupoutside', upHandler);
    this.input.off('gameout', upHandler);
    // remove DOM touch fallback
    const canvas = this.sys.game?.canvas || this.game?.canvas;
    if (this._domTouchHandlers){
      const { onTouchStart, onTouchMove, onTouchEnd } = this._domTouchHandlers;
      try {
        canvas?.removeEventListener('touchstart', onTouchStart);
        canvas?.removeEventListener('touchmove',  onTouchMove);
        canvas?.removeEventListener('touchend',   onTouchEnd);
        canvas?.removeEventListener('touchcancel',onTouchEnd);
      } catch {}
    }
    this._touchHandlers = null;
    this._domTouchHandlers = null;
    // remove debug UI
    try { this._touchDbg?.dot?.destroy?.(); this._touchDbg?.label?.destroy?.(); } catch {}
    this._touchDbg = null;
    this._aimDragActive = false;
  }

  suspendTouchUI(suspended){
    // Temporarily disable touch during modals
    if (suspended){
      this.destroyTouchUI();
    } else {
      this.makeMobileControls();
    }
  }

  /* ----------------- Movement Trails (Flame-like) ----------------- */
  // Trail effects (delegated to VFX controller - handled in vfx.update())

  /* ----------------- PvE Difficulty Scaling ----------------- */
  // Difficulty scaling has been moved to separate AI modules:
  // - PlugAI.js: applyPlugProgression() for Runner mode opponent
  // - RunnerAI.js: applyRunnerProgression() for Plug mode opponent

  applyMusicRamp(){
    if (!this.pveRound) return;
    if (!this.audio?.music?.sound) return;

    const round = this.pveRound;
    const musicKey = this.audio.music.key;

    // Define base/max volumes per track (matches MenuScene initial volumes)
    let baseVol = 0.20;  // starting volume (round 1)
    let maxVol = 0.50;   // max volume at high rounds

    if (musicKey === 'bg_plug') {
      baseVol = 0.28;  // matches MenuScene.js:1354
      maxVol = 0.50;
    } else if (musicKey === 'bg_main') {
      baseVol = 0.20;  // matches MenuScene.js:1336
      maxVol = 0.45;
    } else if (musicKey === 'bg_learn') {
      baseVol = 0.30;  // matches MenuScene.js:1323
      maxVol = 0.40;
    }

    // VOLUME RAMP: Gradual increase from round 1 → round 30
    // Round 1: baseVol, Round 30+: maxVol
    const rampEnd = 30;
    const volumeBoost = Math.min(1.0, (round - 1) / (rampEnd - 1));
    const targetVolume = baseVol + (maxVol - baseVol) * volumeBoost;

    // FILTER SWEEP: Low-pass filter opens up from muffled → clear
    // Round 1: 600 Hz (muffled/distant), Round 30+: 20000 Hz (full clarity)
    const minCutoff = 600;   // very muffled at start
    const maxCutoff = 20000; // full frequency range (no filtering)
    const targetCutoff = minCutoff + (maxCutoff - minCutoff) * volumeBoost;

    // Apply volume and filter changes with smooth transitions
    try {
      this.audio.playMusic(musicKey, { volume: targetVolume, loop: true, fade: 800 });
      this.audio.setMusicFilterCutoff(targetCutoff, 800);
    } catch {}
  }

  calculateStashValue(roundNum){
    // Each successful round = 1 stash collected
    // Stash is the currency/score that goes on leaderboards
    return 1;
  }

  calculateRep(roundNum){
    // Rep calculation - later can factor in: speed, power-ups used, damage taken, etc.
    // For now: base 100 + (round * 50) for scaling
    // Round 1: 150, Round 5: 350, Round 10: 600
    return 100 + (roundNum * 50);
  }

  // Floating rewards display (delegated to VFX controller)
  showFloatingRewards(stashEarned, repEarned, origin){
    return this.vfx.showFloatingRewards(stashEarned, repEarned, origin);
  }


  showPowerSelectionForNextRound(){
    // Freeze input
    this.input.keyboard.enabled = false;

    // Show power selection modal (will be ad spot later)
    const modal = this.showModal({
      title: `ROUND ${this.pveRound + 1}`,
      lines: ['Select your powers for the next round'],
      buttons: [
        {
          label: 'Continue',
          bg: 0x1a2038,
          color:'#86efac',
          onClick: ()=> {
            this.scene.restart({
              mode: 'pve',
              role: 'runner',
              pveRound: this.pveRound + 1,
              pveSessionStash: this.pveSessionStash,
              pveBestRound: this.pveBestRound,
              seed: (Math.random()*2**32)|0
            });
          }
        }
      ]
    });

    // Add Claim/Settings buttons inside panel at bottom-left (NOT round 1, since Continue button is there)
    if (this.pveRound > 1) {
      const cx = this.cameras.main.centerX;
      const cy = this.cameras.main.centerY;
      const panelW = Math.min(480, this.scale.width - 40);
      const estimatedPanelH = 280; // Generous estimate for this simple modal

      const bottomButtons = createBottomLeftButtons(this, cx, cy, panelW, estimatedPanelH, 20005);
      modal.registerExtra(...bottomButtons);
    }

    this.currentModal = modal;
  }

  /* ----------------- Round End / UI (delegated to ProgressionManager) ----------------- */
  endRound(winner){
    return this.progressionManager.endRound(winner);
  }

  showPvEGameOver(context = {}){
    return this.progressionManager.showPvEGameOver(context);
  }

  /* -------------- Scene lifecycle cleanup -------------- */
  shutdown(){
    this.destroyTouchUI?.();
    this.unbindSpace?.();
    this.input.off('pointermove', this._pointerMoveHandler);
    this.input.off('pointerdown', this._pointerDownHandler);
    this.input.off('pointerup', this._pointerUpHandler);
    this._pointerMoveHandler = this._pointerDownHandler = this._pointerUpHandler = null;
    this.scale.off('resize', this._onResizeCb);
  }

  destroy(){
    this.shutdown();
  }

  /* -------------- Minor frame visuals -------------- */
  preUpdate(time, delta){
    // no-op, Phaser will call update()
  }

  /* Removed legacy update wrapper. The main update logic is defined earlier. */
}

/* 
 * If you want the call above to chain to the big update body automatically,
 * add this right after the large `update(_, delta){ ... }` you pasted earlier:
 *
 *   PvpScene.prototype.update_core = PvpScene.prototype.update;
 *   PvpScene.prototype.update = function(_, delta){ 
 *     // halos first
 *     this._drawStashHalo?.(); 
 *     this._drawExtractHalo?.(); 
 *     this.update_core(_, delta);
 *   };
 *
 * If you d rather not monkey-patch, simply insert:
 *   this._drawStashHalo?.();
 *   this._drawExtractHalo?.();
 * near the top of your existing update() function (already done in your snippet).
 */
;
   

