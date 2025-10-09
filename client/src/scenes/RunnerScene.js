import Phaser from 'phaser';
import { createTouchControls } from '../logic/controls.js';
import {
  makeParticleTextures,
  createParallaxCity,
  pulseTween,
  glowBehind
} from '../logic/visuals.js';
import inv, { addCoins, addProduct, addAmmo, unlockWeapon, saveInv } from '../state/inventory.js';


function rectsOverlap(a, b) {
  return Phaser.Geom.Intersects.RectangleToRectangle(a.getBounds(), b.getBounds());
}

export class RunnerScene extends Phaser.Scene {
  constructor(){ super('Runner'); }

  init(){
    // portrait size
    this.game.config.width  = 360;
    this.game.config.height = 640;

    // lanes
    this.lanes = [100, 180, 260];
    this.currLane = 1;

    // world speed & spawn pacing
    this.speed = 240;
    this.spawnEvery = 640;

    // spawn weights (runner is mostly coins; product steady; ammo & weapons rare)
    this.coinChance    = 0.58;
    this.productChance = 0.22;
    this.ammoChance    = 0.06;  // very sparse
    this.weaponChance  = 0.03;  // very rare

    // player state
    this.coins = 0;
    this.product = 0;
    this.hp = 3;

    // PvP inventory (used later in PvP mode)
    this.weapons = { pistol: false, shotgun: false, laser: false };
    this.ammo    = { pistol: 0,     shotgun: 0,     laser: 0     };

    this.elapsed = 0;
  }

  create(){
    makeParticleTextures(this);

    // background + parallax city + road
    this.add.rectangle(180, 320, 360, 640, 0x0b0b12);
    this.city = createParallaxCity(this);
    this.road = this.add.rectangle(180, 320, 260, 640, 0x111526);

    // dashed center line
    this.lines = this.add.group();
    for (let y=0; y<=640; y+=80) this.lines.add(this.add.rectangle(180, y, 6, 40, 0x3a3f70));

    // player block
    this.player = this.add.rectangle(this.lanes[this.currLane], 540, 32, 32, 0x7c4dff);

    // groups (no Arcade bodies—manual move + overlap)
    this.pickups   = this.add.group(); // coins, product, ammo, weapons
    this.obstacles = this.add.group(); // cars/cones

    // particles (Phaser 3.90 compatible)
    this.particles = this.add.particles(0, 0, 'px-circle', {
      lifespan: 400,
      speed: { min: 40, max: 140 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      on: false
    });

    // touch: swipe to move/jump/slide; NO tap-to-shoot in runner
    createTouchControls(this);
    this.events.on('swipe-left',  ()=> this.shiftLane(-1));
    this.events.on('swipe-right', ()=> this.shiftLane(1));
    this.events.on('swipe-up',    ()=> this.jump());
    this.events.on('swipe-down',  ()=> this.slide());

    // desktop fallback
    this.cursors = this.input.keyboard.createCursorKeys();

    // HUD (compact, mobile-safe)
    this.hudTop = this.add.text(10, 10, '', { color:'#cbd1ff', fontSize:'14px' }).setScrollFactor(0);
    this.hudInv = this.add.text(10, 30, '', { color:'#9ad1ff', fontSize:'12px' }).setScrollFactor(0);
      // === Quick PvP entry (dev/testing) ===
const uiX = 10, uiY = 56; // under your HUD

const mkBtn = (label, y, color, bg, cb) => {
  const b = this.add.text(uiX, y, label, { color, backgroundColor: bg, fontSize: '12px' })
    .setPadding(6,4).setInteractive({ useHandCursor: true }).setScrollFactor(0);
  b.on('pointerdown', cb);
  return b;
};

// 1) Role picker (shows the in-scene menu)
mkBtn('[ Enter PvP (Pick Role) ]', uiY, '#b4ffb4', '#142a1b', () => {
  this.scene.start('PVP', { role: null, dev: true });
});

// 2) Direct as Runner
mkBtn('[ PvP as Runner ]', uiY + 22, '#9ad1ff', '#1a2038', () => {
  this.scene.start('PVP', { role: 'runner', dev: true });
});

// 3) Direct as Plug
mkBtn('[ PvP as Plug ]', uiY + 44, '#ffb4b4', '#2a1a1a', () => {
  this.scene.start('PVP', { role: 'plug', dev: true });
});

// 4) Test loadout (G): unlock all guns, give ammo/coins/PRD
this.input.keyboard.on('keydown-G', () => {
  inv.weapons.pistol  = true;
  inv.weapons.shotgun = true;
  inv.weapons.laser   = true;
  inv.ammo.pistol     = Math.max(inv.ammo.pistol  || 0, 50);
  inv.ammo.shotgun    = Math.max(inv.ammo.shotgun || 0, 30);
  inv.ammo.laser      = Math.max(inv.ammo.laser   || 0, 20);
  inv.coins           = Math.max(inv.coins        || 0, 9999);
  inv.product         = Math.max(inv.product      || 0, 10);
  saveInv();
  const msg = this.add.text(uiX, uiY + 68, 'Test loadout granted (Guns+Ammo+Coins+PRD)', { color:'#cbd1ff', fontSize:'12px' })
    .setScrollFactor(0);
  this.time.delayedCall(1500, () => msg.destroy());
});

// 5) Quick hotkeys to jump without clicking
this.input.keyboard.on('keydown-R', () => this.scene.start('PVP', { role: null,    dev: true })); // role picker
this.input.keyboard.on('keydown-U', () => this.scene.start('PVP', { role: 'runner', dev: true }));
this.input.keyboard.on('keydown-P', () => this.scene.start('PVP', { role: 'plug',   dev: true }));

this.add.text(uiX, uiY + 90, 'Hotkeys: R=PvP Picker  U=PvP Runner  P=PvP Plug  G=Grant Loadout', { color:'#9aa7ff', fontSize:'11px' })
  .setScrollFactor(0);

    // spawner
    this.spawnTimer = this.time.addEvent({
      delay: this.spawnEvery,
      loop: true,
      callback: () => this.spawnRow()
    });
    this.spawnRow(); // show items immediately
  }

  // ----- controls -----
  shiftLane(dir){
    const next = Phaser.Math.Clamp(this.currLane + dir, 0, this.lanes.length-1);
    if (next === this.currLane) return;
    this.currLane = next;
    this.tweens.add({ targets:this.player, x:this.lanes[this.currLane], duration:120, ease:'Sine.easeOut' });
  }

  jump(){
    if (this.player.jumping || this.player.sliding) return;
    this.player.jumping = true;
    this.tweens.add({
      targets: this.player, y: 460, duration:160, yoyo:true, ease:'Quad.easeOut',
      onComplete: ()=> this.player.jumping = false
    });
  }

  slide(){
    if (this.player.jumping || this.player.sliding) return;
    this.player.sliding = true;
    const origH = this.player.height;
    this.tweens.add({
      targets: this.player, height: 18, duration:80, yoyo:true, hold:160, ease:'Sine.easeInOut',
      onComplete: ()=> { this.player.height = origH; this.player.sliding = false; }
    });
  }

  // ----- spawns -----
  spawnRow(){
    const lanes = Phaser.Utils.Array.Shuffle([0,1,2]).slice(0, Phaser.Math.Between(1,2));
    lanes.forEach((lane)=>{
      const x = this.lanes[lane], y = -40;
      const r = Math.random();

      if (r < this.productChance) {
        // PRODUCT (magenta diamond)
        const glow = glowBehind(this, x, y, 16, 0xff66aa, 0.25);
        const prod = this.add.rectangle(x, y, 14, 14, 0xff66aa).setAngle(45).setData('kind','product');
        this.pickups.add(prod); pulseTween(this, prod); prod.on('destroy', ()=>glow.destroy());

      } else if (r < this.productChance + this.coinChance) {
        // COIN (gold circle)
        const glow = glowBehind(this, x, y, 12, 0xffd166, 0.28);
        const coin = this.add.circle(x, y, 8, 0xffd166).setData('kind','coin');
        this.pickups.add(coin); pulseTween(this, coin); coin.on('destroy', ()=>glow.destroy());

      } else if (r < this.productChance + this.coinChance + this.ammoChance) {
        // AMMO (type-specific, +1)
        const type = Phaser.Utils.Array.GetRandom(['pistol','shotgun','laser']);
        const color = type === 'pistol' ? 0x86e3ff : type === 'shotgun' ? 0xffe38d : 0xaaffcc;
        const ammo = this.add.rectangle(x, y, 14, 10, color).setStrokeStyle(2, 0xffffff)
          .setData('kind','ammo').setData('type', type);
        this.pickups.add(ammo); pulseTween(this, ammo);

      } else if (r < this.productChance + this.coinChance + this.ammoChance + this.weaponChance) {
        // WEAPON (unlock for PvP)
        const type = Phaser.Utils.Array.GetRandom(['pistol','shotgun','laser']);
        const color = type === 'pistol' ? 0x9ad1ff : type === 'shotgun' ? 0xff9a66 : 0x9affb0;
        const glow = glowBehind(this, x, y, 18, color, 0.28);
        const w = this.add.rectangle(x, y, 16, 16, color).setAngle(45)
          .setData('kind','weapon').setData('type', type);
        this.pickups.add(w); pulseTween(this, w); w.on('destroy', ()=>glow.destroy());

      } else {
        // OBSTACLE (red car)
        const car = this.add.rectangle(x, y, 44, 26, 0xff5a7a).setStrokeStyle(2, 0xff9aaa);
        this.obstacles.add(car);
      }
    });
  }

  // ----- events -----
collect(obj){
  const kind = obj.getData('kind');
  if (kind === 'coin') {
    this.coins += 1; addCoins(1); this.emitSparks(obj.x, obj.y, 0xffd166);
  } else if (kind === 'product') {
    this.product += 1; addProduct(1); this.emitSparks(obj.x, obj.y, 0xff66aa, 14);
  } else if (kind === 'ammo') {
    const t = obj.getData('type');
    this.ammo[t] = (this.ammo[t]||0) + 1;
    addAmmo(t, 1);
    this.emitSparks(obj.x, obj.y, 0x86e3ff);
  } else if (kind === 'weapon') {
    const t = obj.getData('type');
    this.weapons[t] = true; unlockWeapon(t);
    this.emitSparks(obj.x, obj.y, 0xffffff, 16);
  }
  obj.destroy();
}


  emitSparks(x, y, tint=0xffffff, count=10){
    this.particles.setParticleTint(tint);
    this.particles.emitParticleAt(x, y, count);
  }

  hitObstacle(){
    if (this.invuln) return;
    this.hp -= 1; this.invuln = true;
    this.cameras.main.shake(120, 0.01);
    this.tweens.add({
      targets:this.player, alpha:0.2, duration:80, yoyo:true, repeat:10,
      onComplete:()=>{ this.player.alpha=1; this.invuln=false; }
    });
    if (this.hp <= 0) this.gameOver();
  }

  gameOver(){
    this.spawnTimer.paused = true;

    const box = this.add.rectangle(180, 320, 320, 240, 0x0a0d1a, 0.95).setStrokeStyle(2,0x2f3660);
    this.add.text(120, 245, 'BUSTED!', { color:'#ffd1d1', fontSize:'24px' });
    this.add.text(110, 280, `Coins: ${this.coins}`,   { color:'#cbd1ff' });
    this.add.text(110, 305, `Product: ${this.product}`, { color:'#cbd1ff' });
    // inventory summary
    const own = (k)=> this.weapons[k] ? '✓' : '—';
    this.add.text(110, 330, `Weapons: Pst ${own('pistol')}  Sgn ${own('shotgun')}  Lsr ${own('laser')}`, { color:'#9ad1ff', fontSize:'12px' });
    this.add.text(110, 350, `Ammo: P ${this.ammo.pistol}  S ${this.ammo.shotgun}  L ${this.ammo.laser}`, { color:'#9ad1ff', fontSize:'12px' });

    const btn = this.add.text(140, 380, '[ Run Again ]', { color:'#9ad1ff', backgroundColor:'#1a2038' })
      .setPadding(6,4).setInteractive({useHandCursor:true});
    btn.on('pointerdown', ()=> this.scene.restart());

    saveInv();

const btnPvp = this.add.text(138, 405, '[ PvP Test ]', { color:'#b4ffb4', backgroundColor:'#142a1b' })
  .setPadding(6,4).setInteractive({useHandCursor:true});
btnPvp.on('pointerdown', ()=> this.scene.start('PVP'));

  }

  // ----- loop -----
  update(_, delta){
    // keyboard fallback
    if (this.cursors.left?.isDown) this.shiftLane(-1);
    else if (this.cursors.right?.isDown) this.shiftLane(1);
    if (this.cursors.up?.isDown) this.jump();
    else if (this.cursors.down?.isDown) this.slide();

    // parallax + road
    this.city.update(delta);
    const dy = (this.speed * delta) / 1000;
    this.lines.getChildren().forEach(seg => { seg.y += dy; if (seg.y > 660) seg.y -= 640; });

    // move & collect pickups
    this.pickups.getChildren().forEach(o => {
      o.y += dy;
      if (rectsOverlap(this.player, o)) this.collect(o);
      if (o.y > 700) o.destroy();
    });

    // move & collide obstacles
    this.obstacles.getChildren().forEach(o => {
      o.y += dy;
      if (rectsOverlap(this.player, o)) this.hitObstacle();
      if (o.y > 700) o.destroy();
    });

    // ramp difficulty a little over time
    this.elapsed += delta;
    if (this.elapsed > 3400) {
      this.elapsed = 0;
      this.speed = Math.min(this.speed + 8, 440);
      this.spawnTimer.delay = Math.max(this.spawnTimer.delay - 8, 420);
    }

    // compact HUD
    const own = (k)=> this.weapons[k] ? '✓' : '—';
    this.hudTop.setText(`HP: ${this.hp}   Coins: ${this.coins}   Product: ${this.product}`);
    this.hudInv.setText(`Pst ${own('pistol')}:${this.ammo.pistol}  Sgn ${own('shotgun')}:${this.ammo.shotgun}  Lsr ${own('laser')}:${this.ammo.laser}`);
  }
}
