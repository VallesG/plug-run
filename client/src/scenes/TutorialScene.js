// TUTORIAL SCENE
// Self-contained onboarding scene using rexUI for prompts/toasts and a fixed geometry seed.
import Phaser from 'phaser';

// TUTORIAL SEED (V1)
const TUT_SEED_V1 = 0xA11CE5ED; // fixed layout; cosmetics use a different rng

const T = { FLOOR: 0, WALL: 1 };

function makeRng(seed){
  let t = seed >>> 0;
  return function(){
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}

export class TutorialScene extends Phaser.Scene {
  constructor(){ super('TUTORIAL'); }

  init(){
    this.cell  = 28; // slightly larger than normal
    this.cols  = 20; this.rows = 14; // compact tutorial map
    this.pad   = { x: 0, y: 0 };
    this.rng   = makeRng(((Date.now() * 2654435761) | 0) ^ 0xBEEF1234);

    this.state = 'INTRO';
    this.timeInState = 0;
    this.completedPowers = { dash:false, phase:false };
    this.hints = {};
  }

  // ---- Layout (fixed geometry) ------------------------------------
  generateFixedMap(){
    // TUTORIAL SEED (V1): deterministic grid and anchor cells
    const cols = this.cols, rows = this.rows;
    const g = Array.from({ length: rows }, () => Array(cols).fill(T.FLOOR));
    // Border walls
    for (let x=0;x<cols;x++){ g[0][x]=T.WALL; g[rows-1][x]=T.WALL; }
    for (let y=0;y<rows;y++){ g[y][0]=T.WALL; g[y][cols-1]=T.WALL; }
    // Internal lanes: a simple S-shaped corridor with two pockets
    const stampH = (x0,y0,w,h)=>{ for(let y=y0;y<y0+h;y++) for(let x=x0;x<x0+w;x++) g[y][x]=T.WALL; };
    stampH(4, 3, 12, 1); // north shelf
    stampH(4, 6, 12, 1); // mid shelf
    stampH(2, 9, 16, 1); // south shelf
    // Pocket squares (clearings)
    const clear = (x0,y0,w,h)=>{ for(let y=y0;y<y0+h;y++) for(let x=x0;x<x0+w;x++) g[y][x]=T.FLOOR; };
    clear(5,2,3,3); // pocket A
    clear(12,5,3,3); // pocket B
    clear(8,8,4,3); // defend zone area

    const anchors = {
      runner: { x: 3, y: 11 },
      stashReal: { x: 6, y: 3 },
      stashBunk: { x: 13, y: 6 },
      gun: { x: 10, y: 10 },
      defend: { x: 10, y: 9 },
      plugEntry: { x: cols-2, y: 2 }
    };
    return { grid: g, anchors };
  }

  // ---- Coords helpers ---------------------------------------------
  toWorldX(cx){ return this.pad.x + cx*this.cell + this.cell/2; }
  toWorldY(cy){ return this.pad.y + cy*this.cell + this.cell/2; }
  toCell(x,y){ return { x: Math.floor((x - this.pad.x)/this.cell), y: Math.floor((y - this.pad.y)/this.cell) }; }
  inBoundsCell(cx,cy){ return cx>=0 && cy>=0 && cx<this.cols && cy<this.rows; }
  isWallAtWorld(wx, wy){ const c = this.toCell(wx,wy); if (!this.inBoundsCell(c.x,c.y)) return true; return this.grid[c.y][c.x]===T.WALL; }

  // ---- Visual helpers ---------------------------------------------
  drawFloor(){
    const { cell, cols, rows, pad } = this;
    const W = cols*cell, H = rows*cell;
    this.add.rectangle(W/2, H/2, W, H, 0x0b0f16, 1).setDepth(0);
    // Light checker cosmetic; color from rng but bright
    const cA = 0x1E293B, cB = 0x111827;
    for (let y=0;y<rows;y++){
      for (let x=0;x<cols;x++){
        const cx = pad.x + x*cell + cell/2;
        const cy = pad.y + y*cell + cell/2;
        const color = (((x+y)&1)===0) ? cA : cB;
        const r = this.add.rectangle(cx, cy, cell, cell, color, 1).setDepth(1);
        r.setStrokeStyle(0,0);
      }
    }
  }
  drawWalls(){
    const { cell, cols, rows, pad } = this;
    for (let y=0;y<rows;y++){
      for (let x=0;x<cols;x++){
        if (this.grid[y][x]!==T.WALL) continue;
        const cx = pad.x + x*cell + cell/2;
        const cy = pad.y + y*cell + cell/2;
        this.add.rectangle(cx, cy, cell, cell, 0x0f172a, 1).setDepth(3).setStrokeStyle(2, 0x334155);
      }
    }
  }

  // Reuse duffel visual similar to PvpScene
  makeDuffel(x, y, w, h){
    const c = this.add.container(x, y).setDepth(10);
    const sensor = this.add.rectangle(0, 0, w, h, 0x000000, 0.0001);
    const g = this.add.graphics();
    const tan = 0xC8A97E, tanDark = 0xA9885F, tape = 0x8B7355, gloss = 0xE7D3B5;
    const rad = Math.max(4, Math.floor(this.cell * 0.14));
    g.fillStyle(tan, 1); g.lineStyle(Math.max(2, Math.floor(this.cell*0.05)), tanDark, 1);
    g.fillRoundedRect(-w/2, -h/2, w, h, rad); g.strokeRoundedRect(-w/2, -h/2, w, h, rad);
    const stripeH = Math.max(4, Math.floor(h * 0.28)); g.fillStyle(tape,1);
    g.fillRect(-w/2 + 4, -stripeH/2, w - 8, stripeH);
    g.fillStyle(gloss, 0.10); g.fillRoundedRect(-w/2 + 6, -h/2 + 6, w * 0.35, h * 0.30, rad * 0.6);
    const mark = this.add.text(-w*0.18, -h*0.06, '$', { fontSize: `${Math.max(10, Math.floor(this.cell*0.30))}px`, color: '#2b2b2b' }).setAlpha(0.25).setOrigin(0.5);
    c.add([sensor, g, mark]); c.sensor=sensor; c.drawGfx=g; c.isPackage=true; return c;
  }

  addCarryPackage(){
    if (!this.runner) return;
    this.removeCarry();
    const w = this.cell * 0.45, h = this.cell * 0.30;
    const c = this.add.container(0, -this.cell*0.25);
    const sensor = this.add.rectangle(0,0,w,h,0x000,0.0001);
    const g = this.add.graphics();
    const tan=0xC8A97E, tanDark=0xA9885F, tape=0x8B7355, gloss=0xE7D3B5, rad=Math.max(3, Math.floor(this.cell*0.10));
    g.fillStyle(tan,1).lineStyle(Math.max(2, Math.floor(this.cell*0.05)), tanDark,1);
    g.fillRoundedRect(-w/2,-h/2,w,h,rad); g.strokeRoundedRect(-w/2,-h/2,w,h,rad);
    g.fillStyle(tape,1); const stripeH=Math.max(3,Math.floor(h*0.40)); g.fillRect(-w/2+3,-stripeH/2,w-6,stripeH);
    g.fillStyle(gloss,0.12); g.fillRoundedRect(-w/2+4,-h/2+4,w*0.36,h*0.34,rad*0.6);
    const aura = this.add.ellipse(0,0,w*1.4,h*1.8,0x86efac,0.28).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.20);
    c.add([aura,sensor,g]); this.tweens.add({ targets:aura, alpha:0.45, duration:850, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    this.runner.add(c); this.carrySprite = c;
  }
  removeCarry(){ if (this.carrySprite){ this.runner.remove(this.carrySprite, true); this.carrySprite = null; } }

  // ---- rexUI helpers -----------------------------------------------
  showIntro(){
    const dlg = this.rexUI.add.dialog({
      x: this.scale.width/2, y: this.scale.height*0.38,
      background: this.rexUI.add.roundRectangle(0,0,0,0,8,0x101522,0.96).setStrokeStyle(2,0x2f3650),
      title: this.add.text(0,0,'Learn the Streets',{ color:'#cbd1ff', fontSize: Math.max(20, Math.floor(this.scale.height*0.032))+'px', fontStyle:'bold' }),
      content: this.add.text(0,0,'Short, stress-free onboarding. You can skip anytime.',{ color:'#aab5ff', fontSize: Math.max(14, Math.floor(this.scale.height*0.022))+'px' }),
      actions: [
        this.add.text(0,0,'Skip',{ color:'#94a3b8' }),
        this.add.text(0,0,'Start',{ color:'#cbd1ff' })
      ],
      space: { title: 10, content: 10, action: 8, left: 14, right: 14, top: 12, bottom: 12 }
    }).layout().popUp(200);
    dlg.on('button.click', (button, idx)=>{
      dlg.scaleDownDestroy(150);
      if (idx===0) return this.exitToMenu();
      this.goto('MOVE');
    });
  }
  toast(msg){
    const toast = this.rexUI.add.toast({
      x: this.scale.width/2,
      y: this.scale.height*0.90,
      background: this.rexUI.add.roundRectangle(0,0,0,0,8,0x101522,0.92).setStrokeStyle(2,0x2f3650),
      text: this.add.text(0,0,msg,{ color:'#cbd1ff', fontSize: Math.max(14, Math.floor(this.scale.height*0.026))+'px' }),
      space: { left:12,right:12,top:8,bottom:8 }, duration: { in:180, hold:1200, out:220 }
    }); toast.show();
  }

  // ---- Scene lifecycle ---------------------------------------------
  create(){
    // World sizing and camera zoom (closer than normal)
    const usableW = this.scale.width, usableH = this.scale.height;
    const fitCell = Math.floor(Math.min(usableW / this.cols, usableH / this.rows));
    this.cell = Math.max(20, Math.min(36, Math.floor(fitCell*0.90))); // closer zoom
    this.pad = { x: 0, y: 0 };

    const { grid, anchors } = this.generateFixedMap();
    this.grid = grid; this.anchors = anchors;
    this.drawFloor(); this.drawWalls();

    // Runner
    this.runner = this.add.container(this.toWorldX(anchors.runner.x), this.toWorldY(anchors.runner.y)).setDepth(8);
    const rShadow = this.add.ellipse(0, this.cell*0.48, this.cell*0.90, this.cell*0.30, 0x000000, 0.34).setScale(1,0.8);
    const rBody = this.add.circle(0, 0, Math.floor(this.cell*0.36), 0x10b981, 1);
    this.runner.add([rShadow, rBody]);

    // MOVE helper arrows
    this.moveHints = this.add.container(0,0).setDepth(12);
    const mkArrow = (ang)=>{
      const g = this.add.graphics();
      g.fillStyle(0x60a5fa, 0.85);
      const s = this.cell*0.18; g.fillTriangle(-s, s, s, s, 0, -s*1.2);
      const c = this.add.container(0,0,[g]); c.setAngle(ang); return c;
    };
    const arUp = mkArrow(0), arRight = mkArrow(90), arDown = mkArrow(180), arLeft = mkArrow(270);
    const hintR = this.cell*0.95; arUp.y = -hintR; arDown.y = hintR; arLeft.x = -hintR; arRight.x = hintR;
    this.moveHints.add([arUp, arRight, arDown, arLeft]);
    this.tweens.add({ targets: this.moveHints, alpha: 0.4, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.addKeys('W,A,S,D,SHIFT,SPACE');
    this.pointer = null; this.input.on('pointerdown', p=>this.pointer=p); this.input.on('pointerup', ()=>this.pointer=null); this.input.on('pointerupoutside', ()=>this.pointer=null);

    // Objectives and pickups
    const w = this.cell * 0.82, h = this.cell * 0.52;
    this.realStash = this.makeDuffel(this.toWorldX(anchors.stashReal.x), this.toWorldY(anchors.stashReal.y), w, h);
    this.bunkStash = this.makeDuffel(this.toWorldX(anchors.stashBunk.x), this.toWorldY(anchors.stashBunk.y), w, h);
    this.gunPickup = this.add.rectangle(this.toWorldX(anchors.gun.x), this.toWorldY(anchors.gun.y), this.cell*0.5, this.cell*0.24, 0xf59e0b, 1).setStrokeStyle(2, 0x78350f).setDepth(10);

    // Defend zone visual
    const dzx = this.toWorldX(anchors.defend.x), dzy = this.toWorldY(anchors.defend.y);
    this.defendZone = this.add.circle(dzx, dzy, this.cell*1.1, 0x22c55e, 0.06).setStrokeStyle(2, 0x22c55e).setDepth(2);

    // Beacons graphics
    this.beacon = this.add.graphics().setDepth(9);

    // Skip button (always visible)
    const btnR = Math.max(22, Math.floor(this.scale.height*0.035));
    const skipBg = this.rexUI.add.roundRectangle(0,0, btnR*3, btnR*1.8, 8, 0x101522, 0.92).setStrokeStyle(2, 0x2f3650);
    const skipTxt = this.add.text(0,0,'Skip',{ color:'#cbd1ff', fontSize: Math.max(14, Math.floor(btnR*0.8))+'px' }).setOrigin(0.5);
    this.skipBtn = this.add.container(this.scale.width - 16 - btnR*1.5, this.scale.height - 14 - btnR*0.9, [skipBg, skipTxt]).setDepth(50).setSize(btnR*3, btnR*1.8);
    this.skipBtn.setInteractive(new Phaser.Geom.Rectangle(-btnR*1.5,-btnR*0.9,btnR*3,btnR*1.8), Phaser.Geom.Rectangle.Contains).on('pointerup', ()=> this.exitToMenu());

    // Intro dialog
    this.showIntro();

    // Per-step timers
    this.timeInState = 0; this.lastMovePos = { x: this.runner.x, y: this.runner.y };

    this.events.on(Phaser.Scenes.Events.RESUME, ()=> this.relayout());
    this.scale.on('resize', ()=> this.relayout());
  }

  relayout(){
    // Maintain UI positions on resize
    this.skipBtn?.setPosition(this.scale.width - 16 - this.skipBtn.width/2, this.scale.height - 14 - this.skipBtn.height/2);
    if (this.progress) this.progress.setPosition(this.scale.width/2, 28);
  }

  goto(step){ this.state = step; this.timeInState = 0; }
  exitToMenu(){ this.scene.transition({ target:'MENU', duration: 250, moveBelow:true }); }

  // ---- Update loop -------------------------------------------------
  update(_, delta){
    const dt = delta/1000; this.timeInState += delta;
    this.handleMovement(dt);
    this.updateBeacons();

    switch(this.state){
      case 'MOVE': {
        if (!this.hints.move){ this.toast('Move with your stick or WASD.'); this.hints.move=true; }
        this.moveHints.setPosition(this.runner.x, this.runner.y).setVisible(true);
        const dist = Math.hypot(this.runner.x - this.lastMovePos.x, this.runner.y - this.lastMovePos.y);
        if (dist > this.cell*2){ this.goto('STASH_REAL'); }
        break;
      }
      case 'STASH_REAL': {
        this.moveHints.setVisible(false);
        if (!this.hints.real){ this.toast('Grab the package.'); this.hints.real=true; }
        if (this.overlaps(this.runner, this.realStash)){
          this.realStash.setVisible(false); this.addCarryPackage();
          this.toast('Nice! You\'re carrying it.');
          // brief direction cue
          this.time.delayedCall(1200, ()=> this.goto('STASH_BUNK'));
        }
        break;
      }
      case 'STASH_BUNK': {
        if (!this.hints.bunk){ this.toast('Some stashes are Bunk.'); this.hints.bunk=true; }
        if (this.overlaps(this.runner, this.bunkStash)){
          // fade decoy and toast
          const decoy = this.bunkStash; this.toast('BUNK!');
          this.tweens.add({ targets: decoy, alpha:0, scale:0.86, duration:800, ease:'Cubic.easeOut', onComplete:()=>{ decoy.destroy(); this.bunkStash=null; this.goto('POWERUPS'); }});
        }
        break;
      }
      case 'POWERUPS': {
        // Teach dash then phase
        if (!this.completedPowers.dash){
          if (!this.hints.dash){ this.toast('Double-tap a direction or hold Shift to Dash'); this.hints.dash=true; }
          // gating handled in handleMovement (dash flag)
          if (this._didDash) { this._didDash=false; this.completedPowers.dash=true; this.toast('Dash!'); }
        } else if (!this.completedPowers.phase){
          if (!this.hints.phase){ this.toast('Hold Space to Phase through walls'); this.hints.phase=true; }
          if (this._didPhase){ this._didPhase=false; this.completedPowers.phase=true; this.toast('Phased!'); this.time.delayedCall(600, ()=> this.goto('DEFEND_SETUP')); }
        }
        break;
      }
      case 'DEFEND_SETUP': {
        if (!this.hints.gun){ this.toast('Pick up the piece.'); this.hints.gun=true; }
        this.defendZone.setAlpha(0.08);
        if (this.overlapsPoint(this.runner, this.gunPickup.x, this.gunPickup.y)){
          this.gunPickup.setVisible(false); this.hasGun=true; this.toast('Defend the stash for 10s');
          this.beginDefend(); this.goto('DEFEND_PLAY');
        }
        break;
      }
      case 'DEFEND_PLAY': {
        this.updatePlug(dt);
        this.updateBullets(dt);
        if (this.defendWin){ this.goto('SUMMARY'); this.showSummary(); }
        break;
      }
      case 'SUMMARY': default: break;
    }

    this.lastMovePos = { x: this.runner.x, y: this.runner.y };
  }

  // ---- Movement & abilities ---------------------------------------
  handleMovement(dt){
    if (!this.runner) return;
    const speed = this.cell * 7.0;

    // keyboard
    let ax=0, ay=0;
    const k = this.input.keyboard;
    if (k.addKey('A').isDown || this.cursors.left.isDown) ax -= 1;
    if (k.addKey('D').isDown || this.cursors.right.isDown) ax += 1;
    if (k.addKey('W').isDown || this.cursors.up.isDown) ay -= 1;
    if (k.addKey('S').isDown || this.cursors.down.isDown) ay += 1;

    // touch drag towards pointer
    if (this.pointer){
      const dx = this.pointer.x - this.runner.x;
      const dy = this.pointer.y - this.runner.y;
      const L = Math.hypot(dx,dy)||1; const nx=dx/L, ny=dy/L;
      ax += nx; ay += ny;
    }

    const len = Math.hypot(ax, ay); if (len>1e-3){ ax/=len; ay/=len; }

    // dash detection (double tap or Shift)
    const now = performance.now();
    const tapDir = (ax!==0||ay!==0) ? {x:Math.sign(ax),y:Math.sign(ay)} : null;
    if (tapDir){
      if (!this._lastTap || now - this._lastTap.t > 340 || this._lastTap.dir.x!==tapDir.x || this._lastTap.dir.y!==tapDir.y){
        this._lastTap = { t: now, dir: tapDir };
      } else {
        this._dashUntil = now + 220; this._didDash = true; this._lastTap = null;
      }
    }
    if (k.addKey('SHIFT').isDown){ this._dashUntil = now + 220; this._didDash = true; }

    // phase (Space)
    const phasing = k.addKey('SPACE').isDown; if (phasing){ this._didPhase = true; }

    const dashMul = (now < (this._dashUntil||0)) ? 2.2 : 1.0;
    let nx = this.runner.x + ax * speed * dashMul * dt;
    let ny = this.runner.y + ay * speed * dashMul * dt;

    // collisions (ignore while phasing)
    if (!phasing){
      // AABB corners of a circle approx
      const r = this.cell*0.36;
      const pts = [ {x:nx-r,y:ny-r}, {x:nx+r,y:ny-r}, {x:nx-r,y:ny+r}, {x:nx+r,y:ny+r} ];
      if (pts.some(p=>this.isWallAtWorld(p.x,p.y))) { nx = this.runner.x; ny = this.runner.y; }
    }

    this.runner.x = nx; this.runner.y = ny;
  }

  // ---- Utility overlap --------------------------------------------
  overlaps(a, b){ if (!a||!b) return false; const ra = new Phaser.Geom.Rectangle(a.x-12,a.y-12,24,24); const rb = new Phaser.Geom.Rectangle(b.x-12,b.y-12,24,24); return Phaser.Geom.Intersects.RectangleToRectangle(ra, rb); }
  overlapsPoint(a, px, py){ const ra = new Phaser.Geom.Rectangle(a.x-12,a.y-12,24,24); return Phaser.Geom.Rectangle.Contains(ra, px, py); }

  // ---- Beacons -----------------------------------------------------
  updateBeacons(){
    this.beacon.clear();
    const t = (performance.now()%1200)/1200; const r = this.cell * (0.70 + 0.15*Math.sin(t*2*Math.PI));
    const draw = (x,y,color)=>{ this.beacon.lineStyle(3, color, 0.9); this.beacon.strokeCircle(x,y,r); this.beacon.lineStyle(1,color,0.45); this.beacon.strokeCircle(x,y,r+6); };
    if (this.state==='STASH_REAL' && this.realStash?.visible) draw(this.realStash.x, this.realStash.y, 0x86efac);
    if (this.state==='DEFEND_SETUP' && this.gunPickup?.visible) draw(this.gunPickup.x, this.gunPickup.y, 0x60a5fa);
    if (this.state==='DEFEND_PLAY') draw(this.defendZone.x, this.defendZone.y, 0x22c55e);
  }

  // ---- Defend mini-mode -------------------------------------------
  beginDefend(){
    this.defendProgress = 0; this.defendGoal = 10; this.plugHits = 0; this.defendWin = false;
    // Progress bar
    const w = Math.min(320, Math.floor(this.scale.width*0.6));
    const bg = this.rexUI.add.roundRectangle(0,0,w,12,6,0x0f172a,0.8).setStrokeStyle(1,0x334155);
    const bar= this.rexUI.add.roundRectangle(0,0,2,8,4,0x22c55e,1);
    this.progress = this.add.container(this.scale.width/2, 28, [bg, bar]).setDepth(40); this.progress.bg=bg; this.progress.bar=bar; this.updateProgressBar();
    // Plug enemy
    this.plug = this.add.container(this.toWorldX(this.anchors.plugEntry.x), this.toWorldY(this.anchors.plugEntry.y)).setDepth(8);
    const sh = this.add.ellipse(0, this.cell*0.44, this.cell*0.86, this.cell*0.28, 0x000,0.3).setScale(1,0.8);
    const body = this.add.circle(0,0, Math.floor(this.cell*0.34), 0xbf1f2f, 1);
    this.plug.add([sh, body]); this.plugHP = 3;
    this.hasGun = true; this.bullets = [];
    // fire input (space / click)
    this.input.on('pointerdown', ()=> this.tryFire());
    this.input.keyboard.addKey('SPACE');
  }
  updateProgressBar(){ if (!this.progress) return; const w = this.progress.bg.width - 8; const frac = Phaser.Math.Clamp(this.defendProgress/this.defendGoal,0,1); this.progress.bar.width = Math.max(2, w*frac); this.progress.bar.x = -w/2 + this.progress.bar.width/2; }
  updatePlug(dt){
    if (!this.plug) return;
    // gentle move toward stash/runner
    const target = { x: this.defendZone.x, y: this.defendZone.y };
    const dx = target.x - this.plug.x, dy = target.y - this.plug.y; const L = Math.hypot(dx,dy)||1; const nx=dx/L, ny=dy/L;
    const speed = this.cell * 2.5; this.plug.x += nx*speed*dt; this.plug.y += ny*speed*dt;
    // Defend progress = time near zone while player also nearby
    const nearRunner = Math.hypot(this.runner.x - this.defendZone.x, this.runner.y - this.defendZone.y) < this.cell*2.2;
    if (nearRunner) { this.defendProgress += dt; this.updateProgressBar(); if (this.defendProgress >= this.defendGoal) { this.defendWin = true; } }
  }
  tryFire(){ if (!this.hasGun) return; const aim = this.pointer ? {x:this.pointer.x - this.runner.x, y:this.pointer.y - this.runner.y} : { x:1, y:0 }; const L=Math.hypot(aim.x,aim.y)||1; const vx=(aim.x/L)*this.cell*10, vy=(aim.y/L)*this.cell*10; const b=this.add.circle(this.runner.x, this.runner.y, Math.max(3,Math.floor(this.cell*0.12)), 0xffd166, 1).setDepth(9); b.vx=vx; b.vy=vy; b.life=1.6; this.bullets.push(b); }
  updateBullets(dt){
    if (!this.bullets) return;
    for (let i=this.bullets.length-1;i>=0;i--){ const b=this.bullets[i]; b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt; if (b.life<=0){ b.destroy(); this.bullets.splice(i,1); continue; } if (this.plug && Phaser.Math.Distance.Between(b.x,b.y,this.plug.x,this.plug.y) < this.cell*0.5){ b.destroy(); this.bullets.splice(i,1); this.plugHP--; this.toast(`${3-this.plugHP}/3 hits`); if (this.plugHP<=0){ this.defendWin=true; } } }
  }
  showSummary(){
    try { if (!localStorage.getItem('tutDone')) localStorage.setItem('tutDone','1'); localStorage.setItem('tutVersion','V1'); } catch {}
    const dlg = this.rexUI.add.dialog({
      x: this.scale.width/2, y: this.scale.height*0.42,
      background: this.rexUI.add.roundRectangle(0,0,0,0,8,0x101522,0.96).setStrokeStyle(2,0x2f3650),
      title: this.add.text(0,0,'You\'re ready',{ color:'#cbd1ff', fontSize: Math.max(20, Math.floor(this.scale.height*0.032))+'px', fontStyle:'bold' }),
      content: this.add.text(0,0,'Rewards: +20 Creds, +1 Dash, +10 ammo',{ color:'#aab5ff', fontSize: Math.max(14, Math.floor(this.scale.height*0.022))+'px' }),
      actions: [ this.add.text(0,0,'Back to Menu',{ color:'#94a3b8' }), this.add.text(0,0,'Play Full Game',{ color:'#cbd1ff' }) ],
      space: { title:10, content:10, action:8, left:14, right:14, top:12, bottom:12 }
    }).layout().popUp(200);
    dlg.on('button.click', (button, idx)=>{
      dlg.scaleDownDestroy(150);
      if (idx===0) this.exitToMenu();
      else this.scene.transition({ target:'PVP', duration: 250, moveBelow:true, data:{ mode:'pve' } });
    });
  }
}
