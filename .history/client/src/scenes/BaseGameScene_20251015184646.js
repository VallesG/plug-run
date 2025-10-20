import Phaser from 'phaser';
import inv, { loadInv, saveInv } from '../state/inventory.js';
import {
  rectsOverlap,
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

    // Audio: load gunfire SFX so we don't fall back to oscillator blips
    this.load.audio('gun_fire', ['/audio/gun_fire.ogg', '/audio/gun_fire.mp3']);
    // Audio: ouch (runner hit voice)
    this.load.audio('ouch', ['/audio/ouch.ogg', '/audio/ouch.mp3']);
  }

  /* -- Centered modal helper ----------- */
  showModal({ title, lines = [], buttons = [] }){
    // block world input + hide touch controls
    this.input.keyboard.enabled = false;
    this.suspendTouchUI?.(true);

    const Z = 20_000; // above touch UI
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const W  = this.scale.gameSize.width;
    const H  = this.scale.gameSize.height;

    const veil = this.add.rectangle(cx, cy, W, H, 0x000000, 0.82)
      .setScrollFactor(0).setDepth(Z - 1).setInteractive();

    const panelW = Math.min(480, W - 40);
    const panelH = Math.min(220, H - 40);
    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x0a0d1a, 0.96)
      .setStrokeStyle(2, 0x2f3660).setScrollFactor(0).setDepth(Z);

    const titleTxt = this.add.text(cx, cy - panelH/2 + 28, title || '', {
        color:'#cbd1ff', fontSize:'22px', wordWrap: { width: panelW - 24 }
      }).setOrigin(0.5).setDepth(Z).setScrollFactor(0);

    const content = [];
    let y = titleTxt.y + 26;
    for (const s of lines){
      content.push(
        this.add.text(cx, y, s, { color:'#aab5ff', fontSize:'14px', wordWrap:{ width: panelW - 24 } })
          .setOrigin(0.5).setDepth(Z).setScrollFactor(0)
      );
      y += 18;
    }

    const btnObjs = [];
    const btnCenters = [];
    const gap = 12, btnW = Math.min(160, panelW/2 - gap), btnH = 30;
    const totalW = buttons.length * btnW + (buttons.length - 1) * gap;
    let bx = cx - totalW / 2 + btnW/2;
    const by = cy + panelH/2 - 24;

    for (const b of buttons){
      const bg = this.add.rectangle(bx, by, btnW, btnH, b.bg ?? 0x1a2038, 1)
        .setStrokeStyle(1, b.stroke ?? 0x2f3660).setScrollFactor(0).setDepth(Z)
        .setInteractive({ useHandCursor: true });
      const t  = this.add.text(bx, by, b.label, { color: b.color ?? '#cbd1ff' })
        .setOrigin(0.5).setDepth(Z).setScrollFactor(0);

      bg.on('pointerdown', ()=>{ destroy(); b.onClick && b.onClick(); });

      btnObjs.push(bg, t);
      btnCenters.push({ x: bx, y: by });
      bx += btnW + gap;
    }

    const extras = [];
    const registerExtra = (...objs)=> extras.push(...objs);

    const destroy = ()=>{
      [veil, panel, titleTxt, ...content, ...btnObjs, ...extras].forEach(o=>o?.destroy?.());
      this.suspendTouchUI?.(false);
      // inputs re-enabled by startMatch()
    };

    return { destroy, veil, panel, btnCenters, registerExtra };
  }

  init(data) {
    this.cell = 24;
    this.cols = Math.floor(this.scale.width / this.cell);
    this.rows = Math.floor(Math.max(1, this.scale.height) / this.cell);
    this.pad  = { x: 0, y: 0 };
    this.timerMs = 90_000;

    // scene.transition passes data via scene.settings.data, not init param
    const settings = this.scene.settings.data || {};
    const initData = data || settings;

    console.log('[BaseGameScene] init data:', data);
    console.log('[BaseGameScene] scene.settings.data:', settings);
    console.log('[BaseGameScene] resolved initData:', initData);

    this.role = (initData && 'role' in initData) ? initData.role : null;
    this.seed = initData?.seed ?? this.seed ?? ((Math.random() * 2**32) | 0);
    this.tutorialStage = initData?.tutorialStage ?? null;

    // Effects / options
    try {
      const hc = (typeof localStorage !== 'undefined') ? localStorage.getItem('pr_fx_highContrastBullets') : null;
      this.fxBulletHighContrast = hc === '1';
    } catch { this.fxBulletHighContrast = false; }

    // PvE session tracking
    this.mode = initData?.mode || 'pvp'; // 'pve' or 'pvp'
    console.log('[BaseGameScene] mode:', this.mode, 'role:', this.role);

    if (this.mode === 'pve') {
      // Continue session or start new
      this.pveRound = initData?.pveRound ?? 1;
      this.pveSessionStash = initData?.pveSessionStash ?? 0; // Total stash collected (leaderboard metric)
      this.pveSessionRep = initData?.pveSessionRep ?? 0; // Total rep collected
      this.pveBestRound = initData?.pveBestRound ?? 0;
      console.log('[BaseGameScene] PvE - Round:', this.pveRound, 'Stash:', this.pveSessionStash, 'Rep:', this.pveSessionRep);
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
    const r = (sprite?.hbRadius != null) ? sprite.hbRadius : (this.hitboxRadius || (this.cell * 0.28));
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
    const AI_PLUG_CPS      = 2.6; // slower base for AI plug at Round 1

    this.runnerSpeed     = RUNNER_CPS       * this.cell;
    this.plugSpeed       = PLUG_CPS         * this.cell;
    this.plugSpeedNoAmmo = PLUG_NO_AMMO_CPS * this.cell;
    if (this.aiPlugStats) this.aiPlugStats.speed = AI_PLUG_CPS * this.cell;
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
    // Audio manager
    this.audio = AudioManager.get(this);

    // One-time animations for sprites
    const mkOnce = (key, cfg) => { if (!this.anims.exists(key)) this.anims.create({ key, ...cfg }); };
    // Runner (Kenney Player) � simple 2-frame walk
    mkOnce('runner-idle', { frames: [{ key:'ken_player_idle' }], frameRate: 1, repeat: -1 });
    mkOnce('runner-run',  { frames: [{ key:'ken_player_walk1' }, { key:'ken_player_walk2' }], frameRate: 8, yoyo: true, repeat: -1 });
    // Plug (Kenney Soldier)
    mkOnce('plug-idle', { frames: [{ key:'ken_soldier_idle' }], frameRate: 1, repeat: -1 });
    mkOnce('plug-run',  { frames: [{ key:'ken_soldier_walk1' }, { key:'ken_soldier_walk2' }], frameRate: 8, yoyo: true, repeat: -1 });
    // Keep old 'plug-shot' anim for fallback if g1_shot exists
    mkOnce('plug-shot', { frames: this.textures.exists('g1_shot') ? this.anims.generateFrameNumbers('g1_shot', { start: 0, end: 3 }) : [{ key:'ken_soldier_idle' }], frameRate: 18, repeat: 0 });
    loadInv();
    this.roundOver = false;

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
    const arena = generateSquareMaze(this.cols, this.rows, { rng: makeRng(this.seed) });
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
    this.input.keyboard.addKeys('W,A,S,D,ONE,TWO,THREE,FOUR');

    // split aims (player vs AI) and separate gun aim for desktop
    this.playerAim    = { x:1, y:0 }; // movement aim (mobile + keyboard)
    this.playerGunAim = { x:1, y:0 }; // gun aim (desktop mouse)
    this.aiAim        = { x:1, y:0 };

    // desktop keyboard quick-aim (player) and persistent drift like "snake"
    const setDir = (x,y)=>{ this.playerAim = {x,y}; this.playerDrift = {x,y}; this.userTookOver = true; };
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
    ['pistol', 'doublebarrel', 'laser'].forEach((g) => {
      if (!owns[g]) owns[g] = true;
    });
    this.availableGuns = DEFAULT_GUNS.filter((g) => owns[g]);
    if (!this.availableGuns.length) this.availableGuns = ['pistol'];

    this.roundAmmo = Object.fromEntries(DEFAULT_GUNS.map((g) => [g, 0]));
    this.allowedGuns = [this.availableGuns[0]];
    this.weapon = this.allowedGuns[0] || null;
    this.refreshAmmoForLoadout();

    this.input.keyboard.on('keydown-ONE',   () => this.setWeapon('pistol'));
    this.input.keyboard.on('keydown-TWO',   () => this.setWeapon('doublebarrel'));
    this.input.keyboard.on('keydown-THREE', () => this.setWeapon('laser'));
    this.input.keyboard.on('keydown-FOUR',  () => this.setWeapon('rifle'));

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

    // AI knobs (base difficulty)
    this.aiPlugStats = { speed: 120, shootEvery: 0.90, maxRange: 300, inaccuracy: 0.45, reactDelay: 550 };

    // (moved: PvE difficulty applied after recomputeSpeedsFromCell below)

    // Defender AI anti-lockstep helpers
    this._aiPlugStrafeDir = { x: 0, y: 0 };
    this._aiPlugStrafeUntil = 0;
    this._aiPlugFirstSeenAt = performance.now();
    this.aiRunnerStats = { planEvery: 200, jukeDist: 0, sprintDist: 5, sprintMul: 1.05, centerBias: 14 };
    this._aiPlugTick = 0;
    this._aiRunnerPlanAt = 0;
    this._aiRunnerSpawnAt = performance.now();
    this._aiRunnerLastPos = { x:this.attacker.x, y:this.attacker.y };
    this._aiRunnerVX = 0; this._aiRunnerVY = 0;
    this._aiRunnerCruiseDir = { x:1, y:0 };
    this.aiRunnerStats.keepDirMs   = 300;
    this.aiRunnerStats.slideNudge  = 0.16;
    this._aiRunnerLastMoveDir = { x:0, y:0 };
    this._aiRunnerFlipGuardUntil = 0;

    // recompute speed scalars now that aiPlug exists
    this.recomputeSpeedsFromCell();
    if (this.mode === 'pve') {
      // Apply both AI difficulty passes AFTER recompute so base cps do not overwrite our scaled values
      this.applyPvEDifficulty();
      this.applyRunnerAIDifficulty();
      if (this.role === 'plug') {
        this._aiRunnerTargetsBunkFirst = Math.random() < 0.45;
      } else {
        this._aiRunnerTargetsBunkFirst = false;
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

  // Compute music volume by mode/round: start subtle and reach full by Round 3
  _computeModeMusicVolume(role, round){
    const full = (role === 'plug') ? 0.5 : 0.25; // target mix levels
    const r = Math.max(1, Math.min(3, (round|0) || 1));
    // Round 1: ~45% of full, Round 2: ~75%, Round 3+: 100%
    const factor = (r === 1) ? 0.45 : (r === 2 ? 0.75 : 1.0);
    return full * factor;
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
      this.applyRunnerAIDifficulty();
    }

    if (this.currentModal) { this.currentModal.destroy?.(); this.currentModal = null; }

    this.attacker.setVisible(true);
    this.defender.setVisible(true);

    // Reset AI reaction timer so it doesn't accumulate during menus/delays
    this._aiPlugFirstSeenAt = performance.now();

    this.input.keyboard.enabled = true;
    // Suppress stray tap/click firing right after starting the match
    this._suppressShootUntil = performance.now() + 320;

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
        if (this.role === 'plug') {
          this._mouseDown = true; this.tryMouseFire();
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
    this.input.on('pointerdown', (p)=>{ if (p.button===0 && this.role==='plug') this.tryMouseFire(); });
    } else {
      this.makeMobileControls();
    }

    this._spaceHandler = this._spaceHandler || (() => this.firePlug());
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
    if (this.isDesktop){
      this._initDrift = { x: 1, y: 0 };
    } else {
      this._initDrift = randomCardinal();
    }
    this.playerDrift = { x: this._initDrift.x, y: this._initDrift.y };
    // Set current aim to drift so movement begins immediately
    this.playerAim = { x: this.playerDrift.x, y: this.playerDrift.y };
    // Flag flips to true after first user-controlled aim so initial drift never applies again
    this.userTookOver = false;

    if (!this._runnerAbilityKeyHandler){
      this._runnerAbilityKeyHandler = () => this.activateRunnerPower(); // single-power fallback
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
      if (!this.availableRunnerPowers?.length) this.availableRunnerPowers = Object.keys(this.runnerPowerStats || {});
      if (!this.runnerPower || !this.availableRunnerPowers.includes(this.runnerPower)){
        const choices = this.availableRunnerPowers.length ? this.availableRunnerPowers : ['phase','decoy'];
        this.runnerPower = Phaser.Utils.Array.GetRandom(choices);
      }
      this.runnerPowerReadyAt = performance.now() + 2000;
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
  showCarBeacon(){
    if (!this.car) return;
    this.hideCarBeacon();
    const noseX = this.car.x + (this.carOutDir?.x||0) * (this.cell*0.8);
    const noseY = this.car.y + (this.carOutDir?.y||0) * (this.cell*0.8);
    const c = this.add.container(noseX, noseY).setDepth(1300);
    const w = this.cell * 1.8, h = this.cell * 1.2;
    const glow = this.add.ellipse(0, 0, w, h, 0x60a5fa, 0.55)
      .setBlendMode(Phaser.BlendModes.ADD);
    const inner = this.add.ellipse(0, 0, w*0.6, h*0.5, 0xffffff, 0.35)
      .setBlendMode(Phaser.BlendModes.ADD);
    c.add([glow, inner]);
    this.tweens.add({ targets: glow, alpha: 0.25, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: c, scaleX: 1.12, scaleY: 1.12, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.carBeacon = c;
    this._drawCarBeacon = () => {
      if (!this.car || !this.carBeacon) return;
      const nx = this.car.x + (this.carOutDir?.x||0) * (this.cell*0.8);
      const ny = this.car.y + (this.carOutDir?.y||0) * (this.cell*0.8);
      this.carBeacon.x = nx; this.carBeacon.y = ny;
    };
  }
  hideCarBeacon(){
    this._drawCarBeacon = null;
    if (this.carBeacon){ this.carBeacon.destroy(); this.carBeacon = null; }
  }

  startExtractionSequence(){
    if (this.roundOver) return;

    const cleanupArena = () => {
      this.destroyDecoySprite();
      const destroyGroup = (group) => {
        const children = group?.getChildren?.() || [];
        children.forEach((b) => b.destroy());
      };
      destroyGroup(this.bulletsA);
      destroyGroup(this.bulletsD);
      this.hideCarBeacon?.();
      this.removeCarryPackage?.();
      this.hasStash = false;
    };

    if (this.mode === 'pve' && this.role === 'plug') {
      this.roundOver = true;
      this.roundPausedForMenu = true;
      this.input.keyboard.enabled = false;
      this._mouseDown = false;
      cleanupArena();
      this.attacker?.setVisible(false);
      this.pveBestRound = Math.max(this.pveBestRound ?? 0, this.pveRound || 1);
      this.showPvEGameOver({ reason: 'runner_extracted' });
      return;
    }

    // PvE mode: update stats and show floating rewards, then continue with normal extraction
    if (this.mode === 'pve') {
      console.log('[PvE] Extraction! Round:', this.pveRound, 'Mode:', this.mode);
      // Update stats
      const stashEarned = this.calculateStashValue(this.pveRound);
      const repEarned = this.calculateRep(this.pveRound);
      this.pveSessionStash += stashEarned;
      this.pveSessionRep += repEarned;
      this.pveBestRound = Math.max(this.pveBestRound, this.pveRound);
      console.log('[PvE] Stats - Stash:', stashEarned, 'Rep:', repEarned, 'Total Stash:', this.pveSessionStash, 'Total Rep:', this.pveSessionRep);

      // Show floating numbers at extraction point (will stay visible during fade and next round's power modal)
      this.showFloatingRewards(stashEarned, repEarned);
      // Continue with normal extraction sequence (fade, restart, power modal will show automatically)
    }

    this.roundOver = true;
    this.input.keyboard.enabled = false; this._mouseDown = false;
    cleanupArena();
    const doFade = () => {
      const veil = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, this.scale.gameSize.width, this.scale.gameSize.height, 0x000000, 0)
        .setScrollFactor(0).setDepth(5000);
      this.tweens.add({ targets: veil, alpha: 1, duration: 500, ease:'Sine.easeIn', onComplete: ()=>{
        // If in tutorial mode, transition back to tutorial scene for next stage
        if (this.tutorialStage === 4) {
          // Completed runner tutorial, go to plug tutorial
          this.scene.start('TUTORIAL_MINI', { continueToStage: 5 });
        } else if (this.tutorialStage === 5) {
          // Completed plug tutorial, show completion
          this.scene.start('TUTORIAL_MINI', { continueToStage: 6 });
        } else {
          // Restart with new seed (preserve mode for PvE)
          const newSeed = (Math.random() * 2**32) | 0;
          this.scene.restart({
            mode: this.mode,
            role: this.role,
            seed: newSeed,
            pveRound: this.mode === 'pve' ? (this.pveRound || 1) + 1 : undefined,
            pveSessionStash: this.pveSessionStash,
            pveSessionRep: this.pveSessionRep,
            pveBestRound: this.pveBestRound
          });
        }
      }});
    };
    // Runner boards the car: move to the car nose and shrink/fade
    const boardThenDrive = () => {
      if (this.car){
        const dist = this.cell * 8;
        this.tweens.add({
          targets: this.car,
          x: this.car.x + (this.carOutDir?.x||0)*dist,
          y: this.car.y + (this.carOutDir?.y||0)*dist,
          duration: 1200,
          ease: 'Sine.easeIn',
          onComplete: doFade
        });
      } else {
        doFade();
      }
    };

    try { this.removeCarryPackage?.(); } catch {}
    if (this.attacker && this.car){
      const noseX = this.car.x + (this.carOutDir?.x||0) * (this.cell*0.8);
      const noseY = this.car.y + (this.carOutDir?.y||0) * (this.cell*0.8);
      this.tweens.add({ targets: this.attacker, x: noseX, y: noseY, scaleX: 0.6, scaleY: 0.6, alpha: 0.4, duration: 350, ease:'Sine.easeOut', onComplete: ()=>{
        this.attacker.setVisible(false);
        boardThenDrive();
      }});
    } else {
      boardThenDrive();
    }
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

    // Choose randomly which pocket is the real package (seeded for consistency)
    if (!this._randRealBunk) this._randRealBunk = makeRng((this.seed ^ 0xC0FFEE) | 0);
    const realAtPrimary = (this._randRealBunk() < 0.5);

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
    // Make extraction a small invisible sensor at driveway mouth; halo only
    // Extraction remains an invisible sensor only. We'll show an obvious CAR BEACON later after pickup.
    this.extract?.destroy?.();
    this.extract = this.add.rectangle(ex, ey, this.cell*0.8, this.cell*0.8, 0x000000, 0.0001).setDepth(1000);
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

  spawnWeaponBurst(origin, aim, weapon, group){
    const stats = this.getWeaponStats(weapon);
    const ax = aim?.x ?? 0;
    const ay = aim?.y ?? 0;
    const len = Math.hypot(ax, ay) || 1;
    const baseAngle = Math.atan2(ay / len, ax / len);
    const pellets = stats?.spreadAngles?.length ? stats.spreadAngles : [0];

    // Subtle muzzle flash: cyan ring + short directional streak (smaller, high-contrast)
    const flashColor = 0x60a5fa; // electric blue for contrast on wood/brown floors
    const flashR = Math.max(4, Math.floor(this.cell * 0.14));
    const deg = (baseAngle * 180) / Math.PI;
    // ring
    const flashRing = this.add.graphics().setDepth(11);
    flashRing.lineStyle(Math.max(1, Math.floor(this.cell * 0.07)), flashColor, 1);
    flashRing.strokeCircle(0, 0, Math.floor(flashR * 0.9));
    flashRing.setBlendMode(Phaser.BlendModes.ADD);
    flashRing.setPosition(origin.x, origin.y);
    this.tweens.add({ targets: flashRing, alpha: 0, scaleX: 1.35, scaleY: 1.35, duration: 80, ease: 'Cubic.easeOut', onComplete: () => flashRing.destroy() });
    // streak
    const streakLen = Math.max(6, Math.floor(this.cell * 0.40));
    const streakThk = Math.max(2, Math.floor(this.cell * 0.06));
    const streak = this.add.rectangle(origin.x + Math.cos(baseAngle) * flashR, origin.y + Math.sin(baseAngle) * flashR, streakLen, streakThk, flashColor, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(11)
      .setAngle(deg);
    this.tweens.add({ targets: streak, alpha: 0, scaleX: 1.5, duration: 80, ease: 'Cubic.easeOut', onComplete: () => streak.destroy() });
    this.audio?.play('gun_fire', { volume: 0.6, rateRand: 0.06 });

    // Pick high-contrast bullet palette based on floor appearance
    const isLightFloor = (() => {
      if (Array.isArray(this.theme?.checkerColors) && this.theme.checkerColors.length >= 2){
        const lum = (hex) => { const r=(hex>>16)&255,g=(hex>>8)&255,b=hex&255; return (0.2126*r+0.7152*g+0.0722*b)/255; };
        const avg = this.theme.checkerColors.reduce((s,c)=> s + lum(c), 0) / this.theme.checkerColors.length;
        return avg > 0.7;
      }
      if (this.theme?.floorSet === 'wood') return false;
      if (typeof this.theme?.floorTint === 'number'){
        const r=(this.theme.floorTint>>16)&255,g=(this.theme.floorTint>>8)&255,b=this.theme.floorTint&255;
        const L=(0.2126*r+0.7152*g+0.0722*b)/255; return L > 0.7;
      }
      return false;
    })();
    const palette = (() => {
      if (!this.fxBulletHighContrast){
        // default behavior: theme-aware but softer (lean on weapon tint/PvE red)
        const base = (this.mode === 'pve') ? 0xef4444 : (stats?.color ?? 0xffd166);
        const rim = isLightFloor ? 0xffffff : 0xef4444;
        return { fill: base, rim };
      }
      // High contrast: strong red on light floors, pure white on dark floors
      return isLightFloor ? { fill: 0xef4444, rim: 0xffffff } : { fill: 0xffffff, rim: 0xef4444 };
    })();

    pellets.forEach((offset) => {
      const ang = baseAngle + Phaser.Math.DegToRad(offset);
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      // Use high-contrast color based on floor theme
      const color = palette.fill;
      const radius = Math.max(3, Math.floor(this.cell * 0.13));
      const coreBlend = (isLightFloor && this.fxBulletHighContrast) ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD;
      const bullet = this.add.circle(origin.x, origin.y, radius, color, 1)
        .setDepth(10)
        .setBlendMode(coreBlend);
      group.add(bullet);
      bullet.vx = dx * (stats?.speed ?? 300);
      bullet.vy = dy * (stats?.speed ?? 300);
      bullet.life = 1200;
      bullet._color = color;
      bullet._radius = radius;
      bullet._trailAt = performance.now();
      // Soft glow that follows the projectile (skip on light floors to avoid washout)
      if (!(isLightFloor && this.fxBulletHighContrast)){
        bullet._glow = this.add.circle(origin.x, origin.y, Math.floor(radius * 1.7), color, 0.28)
          .setDepth(9)
          .setBlendMode(Phaser.BlendModes.ADD);
      }
      bullet._trailColor = color;
      bullet._trailBlend = (isLightFloor && this.fxBulletHighContrast) ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD;
      bullet._impactColor = color;
      bullet._impactBlend = (isLightFloor && this.fxBulletHighContrast) ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD;
      // high-contrast rim; on very light floors, use a darker NORMAL-blend outline so it doesn't wash out
      const rim = this.add.graphics().setDepth(10);
      const rimColor = (isLightFloor && this.fxBulletHighContrast) ? 0xb91c1c : palette.rim;
      const rimBlend = (isLightFloor && this.fxBulletHighContrast) ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD;
      const rimRadius = Math.floor(radius * (isLightFloor ? 1.06 : 1.12));
      // Stronger outline on light floors for maximum contrast (no shadow)
      const rimThk = Math.max(1, Math.floor(this.cell * (isLightFloor ? 0.08 : 0.04)));
      rim.lineStyle(rimThk, rimColor, 0.95);
      rim.strokeCircle(0, 0, rimRadius);
      rim.setBlendMode(rimBlend);
      rim.setPosition(origin.x, origin.y);
      bullet._rim = rim;
    });
  }

  beginRoundTimer(){
    this.endAt = performance.now() + this.timerMs;
    this.roundPausedForMenu = false;
  }

  promptPlugWeaponSelection(onDone){
    if (this.role !== 'plug') { onDone?.(); return; }
    // Ensure plug beat is playing as soon as selection modal appears
    try {
      this.audio?.ensureUnlocked(this);
      const vol = this._computeModeMusicVolume('plug', this.pveRound || 1);
      this.audio?.playMusic('bg_plug', { volume: vol, loop: true, fade: 200 });
    } catch {}
    const options = this.availableGuns || ['pistol'];
    if (options.length <= 1){
      this.selectLoadout(options[0]);
      onDone?.();
      return;
    }

    this.roundPausedForMenu = true;
    this.destroyAbilityButton();
    this.runnerAbilityText?.setVisible(false);
    const roundLabel = `ROUND ${this.pveRound || 1}`;
    const modal = this.showModal({
      title: roundLabel,
      lines: ['Select your weapon for this round.', ''],
      buttons: []
    });
    const { destroy, registerExtra, panel } = modal;
    const cx = panel?.x ?? this.cameras.main.centerX;
    const cy = panel?.y ?? this.cameras.main.centerY;
    const gap = 130;
    const panelW = (panel?.width ?? Math.min(this.scale.width - 40, 480));
    const vw = this.scale.gameSize.width;
    const isNarrow = vw < 480 || panelW < 420;
    // Layout: stack as 2x2 grid on narrow/mobile, single row otherwise
    const cols = isNarrow ? Math.min(2, options.length) : Math.min(options.length, 4);
    const rows = Math.ceil(options.length / cols);
    const gridGapX = Math.min(140, Math.max(96, panelW / Math.max(cols, 1) * 0.72));
    const totalW = (cols - 1) * gridGapX;
    const startX = cx - totalW / 2;
    const firstRowY = cy + (rows > 1 ? 0 : 20);
    const rowGapY = 58;

    const select = (weapon) => {
      this.selectLoadout(weapon);
      this.input.keyboard.enabled = true;
      destroy();
      this.roundPausedForMenu = false;
      // Guard against the selection tap triggering an immediate shot
      this._suppressShootUntil = performance.now() + 260;
      onDone?.();
    };

    const friendlyName = (name) => ({
      pistol: 'Pistol',
      doublebarrel: 'Double Barrel',
      laser: 'Laser',
      rifle: 'Rifle'
    })[name] || (name[0].toUpperCase() + name.slice(1));

    options.forEach((weapon, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      const x = startX + c * gridGapX;
      const y = firstRowY + r * rowGapY;
      const btn = this.add.rectangle(x, y, 130, 44, 0x1a2038, 1)
        .setStrokeStyle(1, 0x2f3660)
        .setDepth(20004)
        .setInteractive({ useHandCursor: true });
      const label = friendlyName(weapon);
      const txt = this.add.text(x, y, label, { color:'#cbd1ff', fontSize:'16px' })
        .setOrigin(0.5).setDepth(20005);
      btn.on('pointerdown', () => { this.audio?.play('ui_click', { volume: 0.5, rateRand: 0.02 }); select(weapon); });
      registerExtra(btn, txt);
    });
  }

  // --- Runner power selection (pick TWO, order matters) ---
  promptRunnerPowerSelection(onDone){
    if (this.role !== 'runner') { onDone?.(); return; }
    // Ensure runner beat is playing as soon as selection modal appears
    try {
      this.audio?.ensureUnlocked(this);
      const vol = this._computeModeMusicVolume('runner', this.pveRound || 1);
      this.audio?.playMusic('bg_main', { volume: vol, loop: true, fade: 200 });
    } catch {}

    // Power definitions with symbols and colors
    const powers = [
      { id: 'phase', name: 'PHASE', symbol: '👻', color: '#a78bfa' },  // purple ghost
      { id: 'dash', name: 'DASH', symbol: '⚡', color: '#fbbf24' },     // yellow lightning
      { id: 'decoy', name: 'DECOY', symbol: '🎭', color: '#60a5fa' }   // blue mask
    ];

    this.roundPausedForMenu = true;

    // Show round number if in PvE mode
    const titleText = this.mode === 'pve' ? `ROUND ${this.pveRound}` : 'Power Selection';

    const modal = this.showModal({
      title: titleText,
      lines: ['Pick 2 Power-Ups'],
      buttons: []
    });
    const { destroy, registerExtra, panel } = modal;
    const cx = panel?.x ?? this.cameras.main.centerX;
    const cy = panel?.y ?? this.cameras.main.centerY;
    const btnWidth = 110;
    const gap = 125;
    const startX = cx - gap * (powers.length - 1) / 2;
    const y = cy + 40;

    const chosen = [];
    const markers = new Map();
    const select = (power) => {
      const i = chosen.indexOf(power.id);
      if (i !== -1){
        chosen.splice(i,1);
        markers.get(power.id)?.setVisible(false);
        return;
      }
      if (chosen.length >= 2) return;
      chosen.push(power.id);
      const m = markers.get(power.id);
      if (m){ m.setText(String(chosen.length)).setVisible(true); }
      if (chosen.length === 2){
        this.runnerPowersSelected = chosen.slice();
        this.runnerPowersConsumed = [false, false];
        this.input.keyboard.enabled = true;
        destroy();
        this.roundPausedForMenu = false;
        onDone?.();
      }
    };

    powers.forEach((power, idx) => {
      const x = startX + gap * idx;

      // Button background with power color tint
      const btn = this.add.rectangle(x, y, btnWidth, 80, 0x14202f, 1)
        .setStrokeStyle(2, parseInt(power.color.replace('#', '0x')))
        .setDepth(20004)
        .setInteractive({ useHandCursor: true });

      // Symbol (emoji) above name
      const symbol = this.add.text(x, y - 15, power.symbol, {
        fontSize:'32px'
      }).setOrigin(0.5).setDepth(20005);

      // Power name below symbol
      const txt = this.add.text(x, y + 20, power.name, {
        color: power.color,
        fontSize:'16px',
        fontStyle:'bold'
      }).setOrigin(0.5).setDepth(20005);

      // Selection order badge (top-right corner of button)
      const badge = this.add.text(x + (btnWidth / 2) - 10, y - 35, '1', {
        color:'#ffffff',
        fontSize:'16px',
        fontStyle:'bold',
        backgroundColor:'#10b981',
        padding: { x: 6, y: 4 }
      }).setOrigin(0.5).setDepth(20006).setVisible(false);

      markers.set(power.id, badge);
      btn.on('pointerdown', () => select(power));
      registerExtra(btn, symbol, txt, badge);
    });
  }

  // ---- Runner power helpers (order-based execution) ----
  activateRunnerPowerByIndex(idx){
    const sel = this.runnerPowersSelected || [];
    const used = this.runnerPowersConsumed || [];
    if (idx < 0 || idx >= 2) return;
    if (!sel[idx]) return;
    if (used[idx]) return;

    const power = sel[idx];
    // perform power immediately (no per-power cooldown; consumable)
    this.performRunnerPower(power);
    used[idx] = true;
    this.runnerPowersConsumed = used;
  }

  performRunnerPower(power){
    const now = performance.now();
    const stats = this.runnerPowerStats?.[power];
    if (!stats) return;

    if (power === 'phase'){
      // No dash: only set intangibility window and visual fade
      this.attacker.setAlpha(stats.fadeAlpha ?? 0.45);
      this.phaseActiveUntil = now + (stats.duration || 600);
    } else if (power === 'dash'){
      // Jump forward a few tiles along last movement direction (not aim/tap), blocked by walls
      // In plug mode (AI runner), do NOT read playerAim; use AI move history instead.
      const mv = (this.role === 'runner')
        ? (this._runnerMoveDir || this._runnerLastAim || this.playerAim || { x: 1, y: 0 })
        : (this._aiRunnerLastMoveDir || this._aiRunnerCruiseDir || { x: 1, y: 0 });
      const dir = (Math.abs(mv.x) >= Math.abs(mv.y)) ? { x: Math.sign(mv.x) || 1, y: 0 } : { x: 0, y: Math.sign(mv.y) || 1 };
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
    // Prefer last movement direction. In plug mode (AI runner), do not use playerAim.
    let v = null;
    if (this.role === 'runner') {
      v = this._runnerMoveDir || this._runnerLastAim || this.playerAim;
    } else {
      v = this._aiRunnerLastMoveDir || this._aiRunnerCruiseDir || this._runnerLastAim;
    }
    const aim = v || { x: 1, y: 0 };
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

  considerAIRunnerPower(now){
    if (this.role === 'runner') return;
    // AI uses whichever power is set for it (single-power path)
    if (!this.runnerPower || now < (this.runnerPowerReadyAt || 0)) return;
    const dist = Math.hypot(this.defender.x - this.attacker.x, this.defender.y - this.attacker.y);
    if (this.runnerPower === 'phase'){
      if (dist <= this.cell * 3.6) this.activateRunnerPower(true);
    } else if (this.runnerPower === 'decoy'){
      if (!this.decoySprite && dist <= this.cell * 4.2) this.activateRunnerPower(true);
    }
  }

  firePlug(){
    if (this.role !== 'plug') return;
    const weapon = this.weapon;
    if (!weapon) return;
    if ((this.roundAmmo[weapon] || 0) <= 0) return;

    this.roundAmmo[weapon] -= 1;

    // Desktop mouse uses playerGunAim; mobile uses playerAim
    const aim = (this.isDesktop ? (this.playerGunAim || this.playerAim) : this.playerAim) || { x: 1, y: 0 };
    this.spawnWeaponBurst(this.defender, aim, weapon, this.bulletsD);

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
    if (now < (this._suppressShootUntil || 0)) return;
    if (now < (this._mouseCDAt || 0)) return;
    this._mouseCDAt = now + (this._mouseRateMs || 140);
    this.firePlug();
  }

  update(_, delta){
    // draw helper visuals each frame if enabled
    this._drawStashHalo?.();
    this._drawExtractHalo?.(); // kept for compatibility if re-enabled elsewhere
    this._drawCarBeacon?.();
    if (!this.attacker || !this.defender) return; // scene still initializing / lazy-load path
    if (!this.attacker.visible || this.roundOver) return;
    if (this.roundPausedForMenu) return;

    const now = performance.now();
    const dt = delta / 1000;

    if (this.role !== 'runner') this.considerAIRunnerPower(now);
    else this.updateRunnerAbilityUI();

    if (this.isDesktop && this._mouseDown) this.tryMouseFire();

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

    const moveHuman = (sprite, speed) => {
      let vx = 0;
      let vy = 0;
      const k = this.cursors;
      const wasd = this.wasdKeys || {};

      // Determine if any keyboard movement keys are pressed (arrow keys or WASD)
      const leftDown  = k.left?.isDown  || wasd.A?.isDown;
      const rightDown = k.right?.isDown || wasd.D?.isDown;
      const upDown    = k.up?.isDown    || wasd.W?.isDown;
      const downDown  = k.down?.isDown  || wasd.S?.isDown;
      const usingKeys = leftDown || rightDown || upDown || downDown;

      if (usingKeys){
        // Use keyboard for movement
        if (leftDown)  vx = -speed;
        else if (rightDown) vx = speed;
        if (upDown)    vy = -speed;
        else if (downDown) vy = speed;
      } else {
        // No keys: use player's aim or drift. After first user interaction, never fall back to initial drift.
        const drift = this.userTookOver ? (this.playerDrift || null) : (this.playerDrift || this._initDrift || null);
        const aim = this.playerAim || drift || { x: 1, y: 0 };
        const lenAim = Math.hypot(aim.x, aim.y);
        if (lenAim > 0.0001){
          vx = (aim.x / lenAim) * speed;
          vy = (aim.y / lenAim) * speed;
        }
      }

      // When not using keys (i.e., using aim), softly snap to corridor centers to assist movement
      if (!usingKeys){
        const dir = (Math.abs(vx) > Math.abs(vy))
          ? { x: Math.sign(vx), y: 0 }
          : (Math.abs(vy) > 0 ? { x: 0, y: Math.sign(vy) } : { x: 0, y: 0 });
        if (dir.x || dir.y) corridorAssist(this, sprite, dir, dt);
      }

      // Attempt to move in X and Y with sub-steps to prevent tunneling through thin walls
      const dxTot = vx * dt;
      const dyTot = vy * dt;
      const stepMax = this.cell * 0.28; // less than half a tile
      const moveAxis = (amount, axis) => {
        let remaining = amount;
        const dir = Math.sign(remaining) || 0;
        const step = stepMax * dir;
        let guard = 0;
        while (Math.abs(remaining) > 0.0001 && guard++ < 32){
          const d = (Math.abs(remaining) > stepMax) ? step : remaining;
          const nx = axis === 'x' ? sprite.x + d : sprite.x;
          const ny = axis === 'y' ? sprite.y + d : sprite.y;
          if (this.canMoveTo(sprite, nx, ny)){
            if (axis === 'x') sprite.x = nx; else sprite.y = ny;
            remaining -= d;
          } else {
            break; // blocked on this axis
          }
        }
      };
      const preX = sprite.x, preY = sprite.y;
      moveAxis(dxTot, 'x');
      moveAxis(dyTot, 'y');
      // If we barely moved (corner caught), softly nudge toward tile center to unstick
      if (Math.hypot(sprite.x - preX, sprite.y - preY) < 0.5 && (Math.abs(vx) + Math.abs(vy) > 0)){
        const c = this.toCell(sprite.x, sprite.y);
        const cx = this.toWorldX(c.x);
        const cy = this.toWorldY(c.y);
        const ux = cx - sprite.x, uy = cy - sprite.y;
        const ul = Math.hypot(ux, uy) || 1;
        const nudge = Math.min(this.cell * 0.20, ul);
        const nx = sprite.x + (ux/ul) * nudge;
        const ny = sprite.y + (uy/ul) * nudge;
        if (this.canMoveTo(sprite, nx, ny)) { sprite.x = nx; sprite.y = ny; }
      }

      // Cache facing direction for runner powers when moving
      const spdLen = Math.hypot(vx, vy);
      if (spdLen > 0.0001){
        const norm = { x: vx / spdLen, y: vy / spdLen };
        if (sprite === this.attacker){
          this._runnerMoveDir = norm;
          this._runnerLastAim = norm;
        }
      }
    };

    if (this.role==='runner'){
      moveHuman(this.attacker, moveSpeedRunner);
      this.updateDefenderAI(dt);
      // Add trail effects
      this.updateRunnerTrail(dt);
      this.updateDefenderTrail(dt);
    } else {
      moveHuman(this.defender, plugBaseSpeed);
      this.updateAIRunner(delta);
      // Add trail effects
      this.updateRunnerTrail(dt);
      this.updateDefenderTrail(dt);
    }

    this.updateBullets(delta);
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
        this._aiRunnerTargetsBunkFirst = false;
        // Hide both ground packages and clear any stash halo
        this.audio?.play('pickup', { volume: 0.6, rateRand: 0.04 });
        this.stash?.setVisible(false);
        this.bunkStash?.destroy?.();
        this.stashHalo?.clear?.();
        this.stashHalo?.setVisible(false);
        this._drawStashHalo = null;
        // Add carry sprite and light up the car instead of an off-center halo
        this.showCarBeacon?.();
        this.addCarryPackage();
      } else if (gotBunk){
        // Bunk pickup: fade the decoy and show a quick "BUNK!" toast
        const decoy = this.bunkStash;
        if (decoy && !decoy._fading){
          decoy._fading = true;
          this._aiRunnerTargetsBunkFirst = false;
          const bunkText = this.add.text(decoy.x, decoy.y - this.cell * 0.65, 'BUNK!', { fontSize: `${Math.max(16, Math.floor(this.cell*0.6))}px`, color:'#f87171', fontStyle:'bold' })
            .setOrigin(0.5)
            .setDepth(2000)
            .setAlpha(0.95);
          // REAL / BUNK STASH PATCH: extend toast visibility so "BUNK!" lingers longer
          this.tweens.add({ targets: bunkText, y: bunkText.y - this.cell * 0.55, alpha: 0, duration: 950, ease: 'Cubic.easeOut', onComplete: () => bunkText.destroy() });
          this.tweens.add({ targets: decoy, alpha: 0, scale: 0.82, duration: 680, ease: 'Cubic.easeIn', onComplete: () => {
            decoy.destroy();
            this.bunkStash = null;
          this._aiRunnerTargetsBunkFirst = false;
          } });
        }
      }
    }

    // extract win
    if (this.hasStash && rectsOverlap(this.attacker, this.extract)) return this.startExtractionSequence();

    // Unstuck runner if inside wall and not phasing
    if (!this.runnerIsPhasing?.() && this.isWallAtWorld?.(this.attacker.x, this.attacker.y)) this.ensureUnstuck(this.attacker);

    // hits
    this.checkHits();

    // melee tag (runner i-frames respected)
    if (this.meleeEnabled && !phasing && rectsOverlap(this.defender, this.attacker) && this.canDamage(this.attacker)) {
      this.hit(this.attacker);
    }
  }

  // --------- AI: Plug (defender) ----------
  updateDefenderAI(dt){
    const d = this.defender, ax = this.attacker.x, ay = this.attacker.y;
    const now = performance.now();
    const speed = this.meleeEnabled ? this.plugSpeedNoAmmo : this.aiPlugStats.speed;

    // Avoid "lockstep" mirroring when very close: strafe for a short burst
    const vx = ax - d.x, vy = ay - d.y;
    const dist = Math.hypot(vx, vy);
    const sepDist = this.cell * 0.9;

    let moved = false;
    if (now < (this._aiPlugStrafeUntil || 0)){
      const sx = this._aiPlugStrafeDir?.x || 0;
      const sy = this._aiPlugStrafeDir?.y || 0;
      const nx = d.x + sx * speed * dt, ny = d.y + sy * speed * dt;
      if (this.canMoveTo(d, nx, d.y)) d.x = nx;
      if (this.canMoveTo(d, d.x, ny)) d.y = ny;
      moved = true;
    } else if (dist < sepDist){
      // pick an orthogonal direction to break the alignment
      const ortho = (Math.abs(vx) > Math.abs(vy))
        ? [ {x:0,y:1}, {x:0,y:-1} ]
        : [ {x:1,y:0}, {x:-1,y:0} ];
      // prefer walkable
      let pick = ortho[ (Math.random() * ortho.length) | 0 ];
      const tryA = { x: d.x + pick.x * this.cell, y: d.y + pick.y * this.cell };
      const tryB = { x: d.x - pick.x * this.cell, y: d.y - pick.y * this.cell };
      if (!this.canMoveTo(d, tryA.x, tryA.y) && this.canMoveTo(d, tryB.x, tryB.y)) pick = { x: -pick.x, y: -pick.y };
      this._aiPlugStrafeDir = pick;
      this._aiPlugStrafeUntil = now + 260;
      const nx = d.x + pick.x * speed * dt, ny = d.y + pick.y * speed * dt;
      if (this.canMoveTo(d, nx, d.y)) d.x = nx;
      if (this.canMoveTo(d, d.x, ny)) d.y = ny;
      moved = true;
    }

    if (!moved){
      const dirX = Math.sign(vx), dirY = Math.sign(vy);
      const nx = d.x + dirX*speed*dt, ny = d.y + dirY*speed*dt;
      if (this.canMoveTo(d, nx, d.y)) d.x = nx;
      if (this.canMoveTo(d, d.x, ny)) d.y = ny;
    }

    if (this.totalRoundsLeft() === 0){ this.meleeEnabled = true; return; }

    const dist2 = Math.hypot(ax - d.x, ay - d.y);
    if (dist2 > this.aiPlugStats.maxRange) return;
    if (now - this._aiPlugFirstSeenAt < this.aiPlugStats.reactDelay) return;

    const aligned = (Math.abs(ax - d.x) < this.cell*0.4) || (Math.abs(ay - d.y) < this.cell*0.4);
    if (!aligned) return;

    const usable = this.allowedGuns.filter(g => (this.roundAmmo[g]||0) > 0);
    if (usable.length === 0) return;
    const weapon = usable[0];
    this.weapon = weapon;

    this._aiPlugTick += dt;
    if (this._aiPlugTick < this.aiPlugStats.shootEvery) return;
    this._aiPlugTick = 0;

    const adx = Math.abs(ax - d.x), ady = Math.abs(ay - d.y);
    this.aiAim = (Math.random() < this.aiPlugStats.inaccuracy)
      ? (adx > ady ? {x:0, y: Math.sign(ay - d.y)} : {x: Math.sign(ax - d.x), y:0})
      : (adx > ady ? {x: Math.sign(ax - d.x), y:0} : {x:0, y: Math.sign(ay - d.y)});

    if ((this.roundAmmo[weapon]||0) > 0){
      this.roundAmmo[weapon] -= 1;
      const aim = this.aiAim || { x: Math.sign(ax - d.x) || 1, y: Math.sign(ay - d.y) || 0 };
      this.spawnWeaponBurst(this.defender, aim, weapon, this.bulletsD);
      if (this.totalRoundsLeft() === 0) this.meleeEnabled = true;
    }
  }

  // --- Fallback cruise for AI Runner ---
  aiRunnerCruise(){
    const speedBase = this.runnerSpeed * (this.hasStash ? this.carrySlow : 1);
    const dir = this._aiRunnerCruiseDir || { x:1, y:0 };
    const c = this.toCell(this.attacker.x, this.attacker.y);
    const tryDirs = [ dir, { x: dir.y,  y: -dir.x }, { x: -dir.y, y: dir.x }, { x: -dir.x, y: -dir.y } ];
    for (const d of tryDirs){
      const n = { x: c.x + d.x, y: c.y + d.y };
      if (this.isWalkableCell(n.x, n.y)){
        this._aiRunnerCruiseDir = d;
        const speed = speedBase;
        this._aiRunnerVX = d.x * speed; this._aiRunnerVY = d.y * speed; return;
      }
    }
    this._aiRunnerVX = 0; this._aiRunnerVY = 0;
  }

  // --------- AI: Runner (attacker) ----------
  updateAIRunner(delta){
    const now = performance.now();
    const dt = delta / 1000;

    if (!this._aiRunnerPlanAt || now >= this._aiRunnerPlanAt){
      this._aiRunnerPlanAt = now + this.aiRunnerStats.planEvery;

      const attackerCell = this.toCell(this.attacker.x, this.attacker.y);
      const plugCell     = this.toCell(this.defender.x, this.defender.y);

      let targetCell;
      if (!this.hasStash) {
        if (this.role === 'plug' && this.mode === 'pve') {
          const bunkVisible = this.bunkStash && this.bunkStash.active && this.bunkStash.visible;
          if (this._aiRunnerTargetsBunkFirst && bunkVisible) {
            targetCell = this.toCell(this.bunkStash.x, this.bunkStash.y);
          } else {
            this._aiRunnerTargetsBunkFirst = false;
            targetCell = this.toCell(this.stash.x, this.stash.y);
          }
        } else {
          targetCell = this.toCell(this.stash.x, this.stash.y);
        }
      } else {
        targetCell = this.toCell(this.extract.x, this.extract.y);
      }

      let nextCell = this.findNextStepTowards(attackerCell, targetCell);
      if (nextCell.x === attackerCell.x && nextCell.y === attackerCell.y){
        const ns = this.neighbors4(attackerCell);
        if (ns.length) nextCell = ns[(Math.random()*ns.length)|0];
      }

      if (this.aiRunnerStats.jukeDist > 0 && toroDist(attackerCell, plugCell, this.cols, this.rows) <= this.aiRunnerStats.jukeDist && Math.random() < 0.5){
        const ns = this.neighbors4(attackerCell);
        ns.sort((m,n)=> toroDist(n,plugCell,this.cols,this.rows) - toroDist(m,plugCell,this.cols,this.rows));
        nextCell = ns[0] || nextCell;
      }

      let dir = { x: Math.sign(nextCell.x - attackerCell.x), y: Math.sign(nextCell.y - attackerCell.y) };
      const close = toroDist(attackerCell, plugCell, this.cols, this.rows) <= this.aiRunnerStats.sprintDist;
      const speed = this.runnerSpeed * (this.hasStash ? this.carrySlow : 1) * (close ? this.aiRunnerStats.sprintMul : 1);

      const opp = (a,b)=> (a.x === -b.x && a.y === -b.y);
      if (this._aiRunnerLastMoveDir && opp(dir, this._aiRunnerLastMoveDir) && performance.now() < this._aiRunnerFlipGuardUntil) {
        dir = this._aiRunnerLastMoveDir;
      }

      if (!isWalkableDirFrom(this, this.attacker, dir)) {
        this.aiRunnerCruise();
      } else {
        this._aiRunnerCruiseDir = dir;
        this._aiRunnerVX = dir.x * speed;
        this._aiRunnerVY = dir.y * speed;
        this._aiRunnerLastMoveDir = { x: Math.sign(dir.x), y: Math.sign(dir.y) };
        this._aiRunnerFlipGuardUntil = performance.now() + this.aiRunnerStats.keepDirMs;
      }

      this._aiRunnerLastPos = { x:this.attacker.x, y:this.attacker.y };
      this._aiRunnerStuckAt = now;
    }

    const vx = this._aiRunnerVX || 0, vy = this._aiRunnerVY || 0;
    const nx = this.attacker.x + vx * dt;
    const ny = this.attacker.y + vy * dt;

    const dirNow = (Math.abs(vx) > Math.abs(vy)) ? {x: Math.sign(vx), y:0} : {x:0, y: Math.sign(vy)};
    applyCenterBias(this, this.attacker, dirNow, dt);

    let movedX = false, movedY = false;
    if (this.canMoveTo(this.attacker, nx, this.attacker.y)) { this.attacker.x = nx; movedX = true; }
    if (this.canMoveTo(this.attacker, this.attacker.x, ny)) { this.attacker.y = ny; movedY = true; }

    if (!movedX && Math.abs(vx) > 0) {
      const dy = this.cell * this.aiRunnerStats.slideNudge;
      if (this.canMoveTo(this.attacker, this.attacker.x, this.attacker.y - dy)) this.attacker.y -= dy;
      else if (this.canMoveTo(this.attacker, this.attacker.x, this.attacker.y + dy)) this.attacker.y += dy;
    }
    if (!movedY && Math.abs(vy) > 0) {
      const dx = this.cell * this.aiRunnerStats.slideNudge;
      if (this.canMoveTo(this.attacker, this.attacker.x - dx, this.attacker.y)) this.attacker.x -= dx;
      else if (this.canMoveTo(this.attacker, this.attacker.x + dx, this.attacker.y)) this.attacker.x += dx;
    }

    if (!movedX && !movedY) {
      const nudge = this.cell * 0.18;
      if (Math.abs(vx) > Math.abs(vy)) {
        if (this.canMoveTo(this.attacker, this.attacker.x, this.attacker.y - nudge)) this.attacker.y -= nudge;
        else if (this.canMoveTo(this.attacker, this.attacker.x, this.attacker.y + nudge)) this.attacker.y += nudge;
      } else {
        if (this.canMoveTo(this.attacker, this.attacker.x - nudge, this.attacker.y)) this.attacker.x -= nudge;
        else if (this.canMoveTo(this.attacker, this.attacker.x + nudge, this.attacker.y)) this.attacker.x += nudge;
      }
    }

    const moved = Math.hypot(this.attacker.x - (this._aiRunnerLastPos?.x || 0), this.attacker.y - (this._aiRunnerLastPos?.y || 0));
    if (moved < 0.4 && (performance.now() - (this._aiRunnerStuckAt || 0)) > 350){
      this.aiRunnerCruise();
      this._aiRunnerLastPos = { x:this.attacker.x, y:this.attacker.y };
      this._aiRunnerStuckAt = performance.now();
    } else if (moved >= 0.4) {
      this._aiRunnerLastPos = { x:this.attacker.x, y:this.attacker.y };
      this._aiRunnerStuckAt = performance.now();
    }

    if (!this._aiRunnerVX && !this._aiRunnerVY) this.aiRunnerCruise();
  }

  updateBullets(delta){
    const dt = delta/1000;
    const now = performance.now();
    const spawnTrail = (x, y, color, blend)=>{
      const t = this.add.circle(x, y, Math.max(2, Math.floor(this.cell * 0.10)), color, 0.55)
        .setDepth(8)
        .setBlendMode(blend ?? Phaser.BlendModes.ADD);
      this.tweens.add({ targets: t, alpha: 0, scale: 0.6, duration: 220, ease: 'Cubic.easeOut', onComplete: ()=> t.destroy() });
    };
    const impact = (x, y, color, blend)=>{
      const useBlend = blend ?? Phaser.BlendModes.ADD;
      const f = this.add.circle(x, y, Math.max(5, Math.floor(this.cell * 0.20)), color, 0.95)
        .setDepth(12)
        .setBlendMode(useBlend);
      const ringColor = (useBlend === Phaser.BlendModes.NORMAL) ? color : 0xffffff;
      const ring = this.add.circle(x, y, Math.max(7, Math.floor(this.cell * 0.26)), ringColor, 0.25)
        .setDepth(12)
        .setBlendMode(useBlend);
      this.tweens.add({ targets: [f, ring], alpha: 0, scale: 1.4, duration: 160, ease: 'Cubic.easeOut', onComplete: ()=>{ f.destroy(); ring.destroy(); } });
      this.audio?.play('impact', { volume: 0.5, rateRand: 0.05 });
      // a couple quick sparkles
      for (let i=0;i<2;i++) spawnTrail(x + (Math.random()-0.5)*this.cell*0.2, y + (Math.random()-0.5)*this.cell*0.2, color, useBlend);
    };
    // expose impact helper for hit() to use when we destroy bullets in other paths
    this._spawnBulletImpact = impact;
    const step = (group)=>{
      group.getChildren().forEach(b=>{
        b.x += (b.vx||0) * dt;
        b.y += (b.vy||0) * dt;
        if (b._glow){ b._glow.x = b.x; b._glow.y = b.y; }
        if (!b._trailAt || (now - b._trailAt) > 45){ spawnTrail(b.x, b.y, b._trailColor || b._color || 0xffffff, b._trailBlend); b._trailAt = now; }
        b.life -= delta;
        if (this.isBulletBlockedAtWorld(b.x, b.y) || b.life<=0){ impact(b.x, b.y, b._impactColor || b._color || 0xffffff, b._impactBlend); b._glow?.destroy?.(); b._rim?.destroy?.(); b.destroy(); }
      });
    };
    step(this.bulletsA);
    step(this.bulletsD);
  }

  checkHits(){
    const phasing = this.runnerIsPhasing();
    this.bulletsD.getChildren().forEach(b=>{
      if (this.decoySprite && rectsOverlap(b, this.decoySprite)){
        this._spawnBulletImpact?.(b.x, b.y, b._impactColor || b._color || 0xffffff, b._impactBlend);
        b._glow?.destroy?.(); b._rim?.destroy?.(); b.destroy();
        this.destroyDecoySprite();
        return;
      }
      if (rectsOverlap(b, this.attacker)){
        if (phasing) return;
        this._spawnBulletImpact?.(b.x, b.y, b._impactColor || b._color || 0xffffff, b._impactBlend);
        b._glow?.destroy?.(); b._rim?.destroy?.(); b.destroy();
        if (this.canDamage(this.attacker)) this.hit(this.attacker);
      }
    });
    this.bulletsA.getChildren().forEach(b=>{
      if (rectsOverlap(b, this.defender)){
        this._spawnBulletImpact?.(b.x, b.y, b._impactColor || b._color || 0xffffff, b._impactBlend);
        b._glow?.destroy?.(); b.destroy();
        this.hit(this.defender);
      }
    });
  }

  hit(who){
    if (!this.canDamage(who)) return;

    // Play runner hurt SFX when runner takes damage (any mode)
    if (who === this.attacker) {
      try { this.audio?.play('ouch', { volume: 0.85 }); } catch {}
    }

    who.hp -= 1;
    who.iUntil = performance.now() + (this.iFrameMs || 900);

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
    const stashEarned = this.calculateStashValue(currentRound);
    const repEarned = this.calculateRep(currentRound);
    this.pveSessionStash += stashEarned;
    this.pveSessionRep += repEarned;
    this.pveBestRound = Math.max(this.pveBestRound ?? 0, currentRound);

    this.showFloatingRewards(stashEarned, repEarned, origin);

    const nextRound = currentRound + 1;
    this.pveRound = nextRound;

    const newSeed = (Math.random() * 2 ** 32) | 0;
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

    // Touch classification thresholds (favor taps over accidental swipes)
    const DRAG_ACTIVATE_PX = 20;  // movement needed to treat as drag/aim
    const SWIPE_DEAD_PX    = 20;  // movement considered meaningful for swipe
    const TAP_TIME_MS      = 240; // <= qualifies as tap
    const TAP_MOVE_PX      = 18;  // <= movement still treated as tap
    const DOUBLE_TAP_MAX_MS= 320; // window for double-tap power

    this._swipePid = null;
    this._swipeStart = null;
    this._dragActivated = false; // becomes true once movement exceeds DRAG_ACTIVATE_PX

    const beginSwipe = (p) => {
      // Track one touch ID at a time
      if (this._swipePid !== null) return;
      this._swipePid = p.id;
      this._swipeStart = { x: p.x, y: p.y, t: performance.now() };
      this._dragActivated = false;
      // Don't slow movement until a real drag is detected
      this._aimDragActive = false;

      // Note: Double-tap detection moved to pointer UP after confirming it's a tap
    };

    const updateSwipe = (p) => {
      if (p.id !== this._swipePid || !p.isDown) return;
      if (this.roundPausedForMenu) return;
      // Suppress aim update briefly after activating a runner power to avoid accidental drift
      if (this.role === 'runner' && performance.now() < (this._suppressAimUntil || 0)) return;
      // Only update aim after a meaningful drag distance to avoid taps steering movement.
      const who = (this.role === 'plug') ? this.defender : this.attacker;
      if (!who) return;
      const dx = p.x - this._swipeStart.x;
      const dy = p.y - this._swipeStart.y;
      const moved = Math.hypot(dx, dy);
      if (!this._dragActivated && moved >= DRAG_ACTIVATE_PX) { this._dragActivated = true; if (this.role === 'plug') this._aimDragActive = true; }
      if (!this._dragActivated) return;
      // Once dragging, aim relative to the controlled sprite position for intuitive steering
      const tx = p.x - who.x;
      const ty = p.y - who.y;
      const L = Math.hypot(tx, ty) || 1;
      const nx = tx / L, ny = ty / L;
      this.playerAim = { x: nx, y: ny };
      this.playerDrift = { x: nx, y: ny };
      this.userTookOver = true;
    };

    const endSwipe = (p) => {
      // Determine if the gesture qualifies as a tap (short duration and limited movement)
      const sx = this._swipeStart?.x ?? p.x;
      const sy = this._swipeStart?.y ?? p.y;
      const dt = performance.now() - (this._swipeStart?.t || 0);
      const moved = Math.hypot(p.x - sx, p.y - sy);
      if (dt <= TAP_TIME_MS && moved <= TAP_MOVE_PX){
        if (this.role === 'plug'){
          // Single tap on mobile plugs fires a shot (not while paused or immediately after menus)
          const now = performance.now();
          if (!this.roundPausedForMenu && now >= (this._suppressShootUntil || 0)) this.tryMouseFire();
        } else if (this.role === 'runner'){
          // Runner: only trigger power on a confirmed double-tap within a
          // strict window; simple taps update lastTapAt only.
          const now = performance.now();
          const diff = now - (this._lastTapAt || 0);
          if (diff > 0 && diff <= DOUBLE_TAP_MAX_MS){
            this._lastTapAt = 0;
            const used = this.runnerPowersConsumed || [];
            const idxPow = used[0] ? 1 : 0;
            this.activateRunnerPowerByIndex(idxPow);
            // brief aim suppression to prevent unintended movement toward tap location
            this._suppressAimUntil = performance.now() + 180;
          } else {
            this._lastTapAt = now;
          }
        }
      } else if (this._dragActivated && moved >= SWIPE_DEAD_PX) {
        // Treat as directional swipe: set aim to overall gesture vector
        const dx = p.x - sx, dy = p.y - sy; const L = Math.hypot(dx,dy) || 1;
        const nx = dx / L, ny = dy / L;
        this.playerAim = { x: nx, y: ny };
        this.playerDrift = { x: nx, y: ny };
        this.userTookOver = true;
      } // else: jittery micro-move — ignore to avoid unintended down-swipes
      this._swipePid = null;
      this._swipeStart = null;
      this._aimDragActive = false;
    };

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
  updateRunnerTrail(dt){
    if (!this.attacker || !this.attacker.visible) return;

    // Initialize trail tracking
    if (!this._runnerTrailTimer) this._runnerTrailTimer = 0;
    if (!this._runnerLastTrailPos) this._runnerLastTrailPos = { x: this.attacker.x, y: this.attacker.y };

    this._runnerTrailTimer += dt * 1000; // Convert to milliseconds

    // Calculate movement direction
    const dx = this.attacker.x - this._runnerLastTrailPos.x;
    const dy = this.attacker.y - this._runnerLastTrailPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1 && this._runnerTrailTimer >= 40) {
      this._runnerTrailTimer = 0;

      // Normalize direction to get unit vector
      const dirX = dx / distance;
      const dirY = dy / distance;

      // Place trail BEHIND the character (opposite of movement direction)
      const trailDistance = this.cell * 0.3;
      const baseX = this._runnerLastTrailPos.x;
      const baseY = this._runnerLastTrailPos.y;

      this._runnerLastTrailPos = { x: this.attacker.x, y: this.attacker.y };

      // Create 2 particles behind the character
      for (let i = 0; i < 2; i++) {
        // Small perpendicular offset for width
        const perpX = -dirY * (Math.random() - 0.5) * this.cell * 0.3;
        const perpY = dirX * (Math.random() - 0.5) * this.cell * 0.3;

        // Blue flame colors - brighter to darker
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

  updateDefenderTrail(dt){
    if (!this.defender || !this.defender.visible) return;

    // Initialize trail tracking
    if (!this._defenderTrailTimer) this._defenderTrailTimer = 0;
    if (!this._defenderLastTrailPos) this._defenderLastTrailPos = { x: this.defender.x, y: this.defender.y };

    this._defenderTrailTimer += dt * 1000; // Convert to milliseconds

    // Calculate movement direction
    const dx = this.defender.x - this._defenderLastTrailPos.x;
    const dy = this.defender.y - this._defenderLastTrailPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1 && this._defenderTrailTimer >= 40) {
      this._defenderTrailTimer = 0;

      // Normalize direction to get unit vector
      const dirX = dx / distance;
      const dirY = dy / distance;

      // Place trail BEHIND the character (opposite of movement direction)
      const trailDistance = this.cell * 0.3;
      const baseX = this._defenderLastTrailPos.x;
      const baseY = this._defenderLastTrailPos.y;

      this._defenderLastTrailPos = { x: this.defender.x, y: this.defender.y };

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

  /* ----------------- PvE Difficulty Scaling ----------------- */
  applyPvEDifficulty(){
    if (!this.pveRound || this.pveRound <= 1) return;

    const round = this.pveRound;

    // Speed scaling: More gradual ramp - +2% per round, caps at +50% (round 26)
    // Base is 3.0 cells/sec, scales up to 4.5 cells/sec at round 26
    const speedBoost = Math.min(0.50, (round - 1) * 0.02);
    const AI_PLUG_CPS = 3.0 * (1 + speedBoost);
    this.aiPlugStats.speed = AI_PLUG_CPS * this.cell;

    // Shoot cooldown: -2% per round, caps at -30% (round 15) = shoots 30% faster
    const cooldownReduction = Math.min(0.30, (round - 1) * 0.02);
    this.aiPlugStats.shootEvery = 0.90 * (1 - cooldownReduction);

    // Accuracy: reduce inaccuracy by 1.5% per round, caps at 50% reduction (round 34)
    const accuracyBoost = Math.min(0.50, (round - 1) * 0.015);
    this.aiPlugStats.inaccuracy = 0.45 * (1 - accuracyBoost);

    // Reaction time: -25ms per round, caps at -200ms (round 9) = reacts 200ms faster
    const reactionBoost = Math.min(200, (round - 1) * 25);
    this.aiPlugStats.reactDelay = Math.max(200, 550 - reactionBoost);

    // Vision range: +0.5 cells per round, caps at +8 cells (round 17)
    // Base is ~15 cells at 20px/cell, scales to ~23 cells
    const rangeBoost = Math.min(8, (round - 1) * 0.5);
    this.aiPlugStats.maxRange = (15 + rangeBoost) * this.cell;
  }

  applyRunnerAIDifficulty(){
    if (this.role !== 'plug') return;

    const round = Math.max(1, this.pveRound || 1);

    // Start the AI runner noticeably slower and ramp harder as rounds progress
    const baseRunnerCps = 4.6; // deliberate slow start (player moves at 7cps)
    const runnerSpeedBoost = Math.min(0.6, (round - 1) * 0.045); // softer growth over time
    this.runnerSpeed = baseRunnerCps * (1 + runnerSpeedBoost) * this.cell;

    // Keep dependent stats (e.g., decoy) in sync with new speed
    if (this.runnerPowerStats?.decoy) {
      this.runnerPowerStats.decoy.speed = this.runnerSpeed * 0.9;
    }
    if (this.runnerPowerStats?.phase) {
      this.runnerPowerStats.phase.dashDist = this.cell * 3.5;
    }

    if (!this.aiRunnerStats) return;
    this.aiRunnerStats.planEvery = Math.max(90, 240 - (round - 1) * 8);
    this.aiRunnerStats.sprintMul = 1.05 + Math.min(0.4, (round - 1) * 0.02);
    this.aiRunnerStats.sprintDist = 5 + Math.min(4, (round - 1) * 0.15);
    this.aiRunnerStats.centerBias = 12 + Math.min(14, (round - 1) * 0.5);
    this.aiRunnerStats.slideNudge = Math.min(0.4, 0.16 + (round - 1) * 0.012);
    this.aiRunnerStats.keepDirMs = Math.max(160, 300 - (round - 1) * 6);
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

  showFloatingRewards(stashEarned, repEarned, origin){
    // Use provided origin (e.g., runner death spot) or fall back to extraction/car location
    const originX = origin?.x ?? this.car?.x ?? this.attacker?.x ?? (this.scale.width / 2);
    const originY = origin?.y ?? this.car?.y ?? this.attacker?.y ?? (this.scale.height / 2);

    // Convert world position to screen position
    const cam = this.cameras.main;
    const screenX = (originX - cam.scrollX) * cam.zoom + cam.x;
    const screenY = (originY - cam.scrollY) * cam.zoom + cam.y;

    // Calculate direction towards screen center
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Vector from extraction point to center
    const dx = centerX - screenX;
    const dy = centerY - screenY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Normalize and scale to float distance (60% of the way to center)
    const floatDistance = Math.min(120, distance * 0.6);
    const normalizedDx = distance > 0 ? (dx / distance) * floatDistance : 0;
    const normalizedDy = distance > 0 ? (dy / distance) * floatDistance : -80; // fallback: float up if already at center

    // Add some perpendicular offset to space them out (perpendicular to the direction vector)
    const perpX = -normalizedDy; // perpendicular vector
    const perpY = normalizedDx;
    const perpScale = 0.3; // how much to offset perpendicular

    // Stash goes slightly to one side, Rep goes to the other
    const stashEndX = screenX + normalizedDx + perpX * perpScale;
    const stashEndY = screenY + normalizedDy + perpY * perpScale;
    const repEndX = screenX + normalizedDx - perpX * perpScale;
    const repEndY = screenY + normalizedDy - perpY * perpScale;

    // Create floating stash text
    const stashText = this.add.text(screenX, screenY, `+${stashEarned} STASH`, {
      color: '#86efac',
      fontSize: '28px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(20001).setScrollFactor(0);

    // Create floating rep text (at same start position)
    const repText = this.add.text(screenX, screenY, `+${repEarned} REP`, {
      color: '#ffd166',
      fontSize: '22px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(20001).setScrollFactor(0);

    // Animate stash: float towards center (with slight offset) and fade out
    stashText.setAlpha(0);
    this.tweens.add({
      targets: stashText,
      alpha: 1,
      x: stashEndX,
      y: stashEndY,
      duration: 2000,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: stashText,
          alpha: 0,
          duration: 500,
          onComplete: () => stashText.destroy()
        });
      }
    });

    // Animate rep: float towards center (with offset on opposite side) and fade out
    repText.setAlpha(0);
    this.tweens.add({
      targets: repText,
      alpha: 1,
      x: repEndX,
      y: repEndY,
      duration: 2000,
      delay: 100, // slight delay after stash
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: repText,
          alpha: 0,
          duration: 500,
          onComplete: () => repText.destroy()
        });
      }
    });
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

    this.currentModal = modal;
  }

  /* ----------------- Round End / UI ----------------- */
  endRound(winner){
    if (this.roundOver) return;
    this.roundOver = true;

    // clear bullets & effects
    this.bulletsA?.getChildren?.().forEach(b=>b.destroy());
    this.bulletsD?.getChildren?.().forEach(b=>b.destroy());
    this.destroyDecoySprite();

    const runnerWon = (winner === 'attacker');

    // freeze movement input
    this.input.keyboard.enabled = false;

    console.log('[endRound] Mode:', this.mode, 'Winner:', winner, 'Runner won:', runnerWon);

    // PvE mode: only show game over modal on death
    // (successful extraction handled by startExtractionSequence)
    if (this.mode === 'pve') {
      console.log('[endRound] PvE mode detected!');
      if (!runnerWon) {
        console.log('[endRound] Runner died, showing game over modal');
        this.showPvEGameOver();
      }
      return;
    }

    // PvP mode: original behavior
    const title = runnerWon ? 'Runner Extracted!' : 'Plug Defended!';
    const sub   = runnerWon ? 'Package delivered to the getaway.' : 'Runner was stopped (or time ran out).';

    const modal = this.showModal({
      title,
      lines: [sub],
      buttons: [
        { label: 'Rematch (same role)', bg: 0x1a2038, color:'#cbd1ff', onClick: ()=> this.scene.restart({ role: this.role, seed: (Math.random()*2**32)|0 }) },
        { label: 'Switch Role',         bg: 0x1a2038, color:'#cbd1ff', onClick: ()=> this.scene.restart({ role: (this.role==='runner'?'plug':'runner'), seed: (Math.random()*2**32)|0 }) },
      ]
    });

    this.currentModal = modal;
  }


  showPvEGameOver(context = {}){
    const roundNumber = this.pveRound || 1;
    const isPlug = this.role === 'plug';
    const reason = context.reason || (isPlug ? 'runner_eliminated' : 'runner_eliminated');
    const roundLabel = `ROUND ${roundNumber}`;

    let title;
    let descriptor;
    if (isPlug) {
      if (reason === 'runner_extracted') {
        title = `STASH STOLEN - ${roundLabel}`;
        descriptor = 'The AI runner escaped with the stash.';
      } else {
        title = `DEFENSE ENDED - ${roundLabel}`;
        descriptor = 'Defense concluded.';
      }
    } else {
      title = `ELIMINATED - ${roundLabel}`;
      descriptor = 'Run Ended';
    }

    this.pveBestRound = Math.max(this.pveBestRound ?? 0, roundNumber);

    const modal = this.showModal({
      title,
      lines: [
        descriptor,
        ``,
        `Total Stash Collected: ${this.pveSessionStash}`,
        `Total Rep Earned: ${this.pveSessionRep}`,
        `Best Round: ${this.pveBestRound}`
      ],
      buttons: [
        {
          label: isPlug ? 'Defend Again' : 'Run Again',
          bg: 0x1a2038,
          color:'#86efac',
          onClick: ()=> this.scene.restart({
            mode: 'pve',
            role: isPlug ? 'plug' : 'runner',
            pveRound: 1,
            pveSessionStash: 0,
            pveSessionRep: 0,
            pveBestRound: 0,
            seed: (Math.random()*2**32)|0
          })
        },
        {
          label: 'Exit',
          bg: 0x1a2038,
          color:'#cbd1ff',
          onClick: ()=> this.scene.start('MENU')
        },
      ]
    });

    this.currentModal = modal;
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
 * If you�d rather not monkey-patch, simply insert:
 *   this._drawStashHalo?.();
 *   this._drawExtractHalo?.();
 * near the top of your existing update() function (already done in your snippet).
 */
;
