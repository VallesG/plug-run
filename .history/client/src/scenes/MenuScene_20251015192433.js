// LANDING / MENUSCENE
// LANDING / MENUSCENE (rexUI)
import Phaser from 'phaser';
import AudioManager from '../audio/AudioManager.js';

// Palette constants so we can theme later
const PALETTE = {
  bg: 0x0b0f16,
  panel: 0x101522,
  stroke: 0x2f3650,
  glow: 0x60a5fa,
  title: '#cbd1ff',
  sub: '#8aa0ff',
  chip: 0x2563eb
};

// Simple helper
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class MenuScene extends Phaser.Scene {
  constructor(){ super('MENU'); }

  preload(){
    // Load character sprites for card visuals
    this.load.image('td_runner', '/sprites/td/runner.png');
    this.load.image('td_runner_step', '/sprites/td/runner_step.png');
    this.load.image('td_plug', '/sprites/td/plug.png');
    this.load.image('td_plug_step', '/sprites/td/plug_step.png');
    this.load.image('car_blue', '/sprites/car_blue.png');
    // Music (provide multiple formats for browser compatibility if available)
    try {
      // Prefer .ogg/.mp3 (current files) in that order
      this.load.audio('bg_main',  ['/audio/main_beat.ogg',  '/audio/main_beat.mp3']);
      this.load.audio('bg_plug',  ['/audio/plug_beat.ogg',  '/audio/plug_beat.mp3']);
      this.load.audio('bg_learn', ['/audio/learn_beat.ogg', '/audio/learn_beat.mp3']);
    } catch {}
  }

  init(){
    this.cards = [];
    this.selected = 0;
    try {
      const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('lastMode') : null;
      if (saved){ this.selected =  Math.max(0, Math.min(4, parseInt(saved, 10) || 0)); }
    } catch {}

    this.dragging = false;
    this.dragStartX = 0;
    this.dragLastX = 0;
    this.dragPixels = 0; // total dx during a swipe
  }

  create(){
    // Background: subtle moving parallax bands
    const W = this.scale.width, H = this.scale.height;
    const bg = this.add.rectangle(W/2, H/2, W, H, PALETTE.bg, 1).setDepth(0);
    // moving bands
    const bands = this.add.group();
    const makeBand = (y, w, alpha)=>{
      const g = this.add.graphics().setDepth(0);
      g.fillStyle(0x0e1624, alpha).fillRect(0, 0, w, 18);
      const c = this.add.container(-w/2, y, [g]);
      c.w = w; return c;
    };
    for (let i=0;i<6;i++){
      const y = (H/6) * (i + 0.5);
      const w = W * (1.2 + 0.6 * Math.random());
      const a = 0.08 + 0.06 * Math.random();
      bands.add(makeBand(y, w, a));
    }
    this.time.addEvent({ loop:true, delay: 16, callback:()=>{
      bands.getChildren().forEach((b, idx)=>{
        b.x += (0.25 + 0.15*idx);
        if (b.x > W + b.w/2) b.x = -b.w/2;
      });
    }});

    // Top logo text - styled like a street sign
    const logoY = 36;
    const logoSize = Math.max(26, Math.floor(H * 0.05));

    // Street sign background (blue rectangle with white border - LA street sign style)
    // Match card width proportions
    const cardWidth = Math.min(520, Math.floor(W * 0.82));
    const signW = cardWidth; // Same width as cards
    const signH = logoSize * 2.2; // Taller for two lines
    const signBg = this.add.rectangle(W/2, logoY + signH/2, signW, signH, 0x0047AB, 1)
      .setStrokeStyle(4, 0xffffff)
      .setDepth(4);

    // Add subtle shadow for depth
    const signShadow = this.add.rectangle(W/2 + 2, logoY + signH/2 + 2, signW, signH, 0x000000, 0.3)
      .setDepth(3);

    // Static street number for main sign (8666 ST - memorable and consistent)
    const mainStreetNum = 8666;
    const mainSuffix = 'ST';

    // Main title
    this.logo = this.add.text(W/2, logoY + signH/2 - logoSize * 0.35, 'PLUG RUN', {
      fontFamily: '"Highway Gothic", "Arial Narrow", "Helvetica Narrow", sans-serif',
      fontSize: logoSize + 'px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5).setDepth(5);

    // Address number below
    const mainAddressSize = Math.max(12, Math.floor(logoSize * 0.65));
    this.logoAddress = this.add.text(W/2, logoY + signH/2 + logoSize * 0.45, `${mainStreetNum} ${mainSuffix}`, {
      fontFamily: '"Highway Gothic", "Arial Narrow", "Helvetica Narrow", sans-serif',
      fontSize: mainAddressSize + 'px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 1.5,
      letterSpacing: 2
    }).setOrigin(0.5, 0.5).setDepth(5);

    this.signBg = signBg;
    this.signShadow = signShadow;

    // Cards data
    const modes = [
      { key:'learn',  title:'Learn the Streets',  sub:'Quick tutorial. Zero pressure.' },
      { key:'runner', title:'Run the Block',      sub:'Escape endless stash houses. Build your chain.' },
      { key:'plug',   title:'Defend the Stash',   sub:'Play as the plug. Stop the runner.' },
      { key:'pvp',    title:'Street Wars',        sub:'1v1 PVP. Coming soon.' }
    ];

    // Carousel root container to keep z-order tidy
    this.carousel = this.add.container(0, 0).setDepth(3);

    modes.forEach((m, idx)=>{
      const card = this.makeCard(m.title, m.sub, m.key); // rexUI-based card
      card.modeKey = m.key;
      card.index = idx;
      this.carousel.add(card);
      this.cards.push(card);
    });

    // Controls: swipe + arrows/A-D + Enter/Space
    this.input.on('pointerdown', (p)=>{
      this.dragging = true; this.dragStartX = p.x; this.dragLastX = p.x; this.dragPixels = 0;
      this._tapCandidate = null;
    });
    this.input.on('pointermove', (p)=>{
      if (!this.dragging) return;
      const dx = p.x - this.dragLastX; this.dragLastX = p.x; this.dragPixels += dx;
      // translate into fractional shift for tactile drag
      const spacing = this.cardSpacing();
      const shift = -(this.dragPixels / spacing);
      this.layoutCards(shift);
    });
    const endDrag = ()=>{
      if (!this.dragging) return;
      const total = this.dragLastX - this.dragStartX;
      this.dragging = false;
      if (this._tapDirectUsed){ this._tapDirectUsed = false; return; }
      if (total > 48) { this.selectPrev(); return; }
      if (total < -48) { this.selectNext(); return; }
      // Treat as a tap: launch tapped card if any; otherwise launch selected
      const tapped = this._tapCandidate;
      if (tapped){
        const idx = this.cards.indexOf(tapped);
        if (idx !== -1){
          // Single-tap launches the tapped card directly (also selects it)
          if (idx !== this.selected) this.setSelected(idx);
          this.launchCard(tapped);
          return;
        }
      }
      // No tap target? just snap back to layout
      this.layoutCards(0, true);
    };
    this.input.on('pointerup', endDrag);
    this.input.on('pointerupoutside', endDrag);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,ENTER,SPACE,ESC');

    // Bottom-right settings/profile
    this.settingsBtn = this.makeIconButton('⚙', () => this.openSettings());
    this.profileBtn  = this.makeIconButton('👤', () => console.info('[Menu] Profile (stub)'));
    // Bottom-left daily chip
    this.dailyChip = this.makeChip('Daily bonus +25', 0x16a34a);

    this.reposition();
    this.scale.on('resize', () => this.reposition());

    // Initial layout to selected index
    this.layoutCards(0, false);

    // Keep menu silent; stop any residual gameplay music when returning
    try {
      const audio = AudioManager.get(this);
      audio.ensureUnlocked(this);
      audio.stopMusic(200);
    } catch {}

    // Proactively unlock audio on first interaction so gameplay music starts immediately in modes
    try {
      const audio = AudioManager.get(this);
      this.input.once('pointerdown', () => { audio.ensureUnlocked(this); try { this.sound.unlock(); } catch {} });
    } catch {}
  }

  // MENU: UI helpers -------------------------------------------------
  // Simple card with background and text overlay
  makeCard(title, sub, modeKey){
    const W = this.scale.width, H = this.scale.height;
    const cw = Math.min(520, Math.floor(W * 0.82));
    const ch = Math.min(320, Math.floor(H * 0.45));

    // Create container first
    const cont = this.add.container(0, 0).setSize(cw, ch).setDepth(3);
    cont.setInteractive(new Phaser.Geom.Rectangle(-cw/2, -ch/2, cw, ch), Phaser.Geom.Rectangle.Contains);

    // Dark background
    const bg = this.add.rectangle(0, 0, cw, ch, 0x0a0f1a, 0.85);
    bg.setStrokeStyle(2, PALETTE.stroke, 1);
    cont.add(bg);

    // Add animated sprite visuals
    this.addCardVisuals(cont, modeKey, cw, ch);

    // Title at TOP (LA street sign font with blue background bar)
    const titleText = String(title).toUpperCase();
    const titleSize = Math.max(14, Math.floor(ch * 0.085)); // Smaller for street number/suffix

    // Static street numbers for each mode (consistent each time)
    const streetAddresses = {
      'learn': { num: 1337, suffix: 'WAY' },
      'runner': { num: 2049, suffix: 'BLVD' },
      'plug': { num: 5558, suffix: 'PL' },
      'pvp': { num: 7700, suffix: 'AVE' }
    };
    const address = streetAddresses[modeKey] || { num: 1000, suffix: 'ST' };
    const streetNum = address.num;
    const suffix = address.suffix;

    // Add blue background bar that fills full card width at top edge
    const titleBgHeight = titleSize * 2.2; // Slightly taller for two lines
    const titleBg = this.add.rectangle(0, -ch * 0.5 + titleBgHeight/2, cw, titleBgHeight, 0x0047AB, 1)
      .setStrokeStyle(3, 0xffffff)
      .setOrigin(0.5, 0.5);

    // Main title text (street name)
    const titleObj = this.add.text(0, -ch * 0.5 + titleBgHeight/2 - titleSize * 0.35, titleText, {
      color: '#ffffff',
      fontFamily: '"Highway Gothic", "Arial Narrow", "Helvetica Narrow", sans-serif',
      fontStyle: 'bold',
      fontSize: titleSize + 'px',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5);

    // Street number and suffix (smaller, below main title - matching PLUG RUN spacing)
    const addressSize = Math.max(10, Math.floor(titleSize * 0.65));
    const addressObj = this.add.text(0, -ch * 0.5 + titleBgHeight/2 + titleSize * 0.45, `${streetNum} ${suffix}`, {
      color: '#ffffff',
      fontFamily: '"Highway Gothic", "Arial Narrow", "Helvetica Narrow", sans-serif',
      fontStyle: 'bold',
      fontSize: addressSize + 'px',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 1.5,
      letterSpacing: 2
    }).setOrigin(0.5, 0.5);

    cont.add(titleBg);
    cont.add(titleObj);
    cont.add(addressObj);

    // Subtitle at BOTTOM
    const subSize = Math.max(11, Math.floor(ch * 0.08));
    const subTxt = this.add.text(0, ch * 0.35, sub, {
      color: '#cbd5e1',
      fontSize: subSize + 'px',
      align: 'center',
      wordWrap: { width: Math.floor(cw * 0.85) }
    }).setOrigin(0.5, 0.5);
    cont.add(subTxt);

    // Tap candidate: mark on pointerdown; also handle direct tap/click on release
    cont.on('pointerdown', ()=>{ this._tapCandidate = cont; });
    const directTap = ()=>{
      const moved = Math.abs((this.dragLastX||0) - (this.dragStartX||0));
      if (moved < 12){
        const idx = this.cards.indexOf(cont);
        if (idx !== -1){
          if (idx !== this.selected) this.setSelected(idx);
          this._tapDirectUsed = true;
          this.launchCard(cont);
        }
      }
    };
    cont.on('pointerup', directTap);

    cont._bg = bg; cont._sub = subTxt;
    return cont;
  }

  addCardVisuals(cont, modeKey, cw, ch){
    if (!modeKey) return;

    // ANIMATED MINI-SCENES - Show actual gameplay loops!
    const scale = 0.75; // Small, subtle animations
    const alpha = 0.6; // Faint so it's not confusing

    if (modeKey === 'learn'){
      // TUTORIAL: Runner wandering naturally with flame trail effect
      const runner = this.add.sprite(0, 0, 'td_runner')
        .setScale(scale)
        .setAlpha(alpha);

      cont.add([runner]);

      // Trail tracking
      let lastTrailPos = { x: runner.x, y: runner.y };
      let trailTimer = 0;

      // Random wandering with natural movement
      const wander = () => {
        // Pick a random point to walk to
        const targetX = (Math.random() - 0.5) * cw * 0.5;
        const targetY = (Math.random() - 0.5) * ch * 0.3;
        const distance = Math.hypot(targetX - runner.x, targetY - runner.y);
        const duration = distance * 15; // Natural walking speed

        // Face the direction we're moving
        runner.setFlipX(targetX < runner.x);

        this.tweens.add({
          targets: runner,
          x: targetX,
          y: targetY,
          duration: duration,
          ease: 'Sine.easeInOut',
          onUpdate: (tween) => {
            runner.setTexture(Math.floor(tween.progress * (duration / 150)) % 2 === 0 ? 'td_runner' : 'td_runner_step');

            // Flame trail effect
            const dx = runner.x - lastTrailPos.x;
            const dy = runner.y - lastTrailPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 2 && trailTimer >= 40) {
              trailTimer = 0;
              const dirX = dx / dist;
              const dirY = dy / dist;
              const perpX = -dirY * (Math.random() - 0.5) * scale * 20;
              const perpY = dirX * (Math.random() - 0.5) * scale * 20;

              lastTrailPos = { x: runner.x, y: runner.y };

              // Create 2 flame particles behind and spread out
              for (let i = 0; i < 2; i++) {
                const colors = [0x60a5fa, 0x3b82f6, 0x2563eb];
                const color = colors[Math.floor(Math.random() * colors.length)];

                const trail = this.add.circle(
                  runner.x - dirX * scale * 25 + perpX * (i === 0 ? 0.5 : -0.5),
                  runner.y - dirY * scale * 25 + perpY * (i === 0 ? 0.5 : -0.5),
                  scale * 10,
                  color,
                  0.7
                );
                cont.add(trail);

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
            trailTimer += 16; // Approximate frame time
          },
          onComplete: () => {
            this.time.delayedCall(Phaser.Math.Between(200, 800), wander);
          }
        });
      };
      wander();

    } else if (modeKey === 'runner'){
      // RUN THE BLOCK: Runner runs to car, car drives off!
      const runner = this.add.sprite(-cw * 0.4, ch * 0.15, 'td_runner')
        .setScale(scale)
        .setAlpha(alpha);

      // Getaway car sprite - flipped to face left
      const car = this.add.sprite(cw * 0.3, ch * 0.15, 'car_blue')
        .setScale(scale * 1.2)
        .setAlpha(alpha)
        .setAngle(90); // Facing left

      cont.add([car, runner]);

      // Trail tracking
      let runnerLastTrailPos = { x: runner.x, y: runner.y };
      let runnerTrailTimer = 0;
      let carLastTrailPos = { x: car.x, y: car.y };
      let carTrailTimer = 0;

      // Animation sequence using chained tweens
      const runSequence = () => {
        // 1. Runner runs to car
        this.tweens.add({
          targets: runner,
          x: cw * 0.25,
          duration: 2000,
          ease: 'Linear',
          onUpdate: (tween) => {
            const progress = tween.progress;
            runner.setTexture(Math.floor(progress * 20) % 2 === 0 ? 'td_runner' : 'td_runner_step');

            // Blue flame trail for runner
            const dx = runner.x - runnerLastTrailPos.x;
            const dy = runner.y - runnerLastTrailPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 2 && runnerTrailTimer >= 40) {
              runnerTrailTimer = 0;
              const dirX = dx / dist;
              const dirY = dy / dist;
              const perpX = -dirY * (Math.random() - 0.5) * scale * 20;
              const perpY = dirX * (Math.random() - 0.5) * scale * 20;

              runnerLastTrailPos = { x: runner.x, y: runner.y };

              for (let i = 0; i < 2; i++) {
                const colors = [0x60a5fa, 0x3b82f6, 0x2563eb];
                const color = colors[Math.floor(Math.random() * colors.length)];

                const trail = this.add.circle(
                  runner.x - dirX * scale * 25 + perpX * (i === 0 ? 1 : -1),
                  runner.y - dirY * scale * 25 + perpY * (i === 0 ? 1 : -1),
                  scale * 10,
                  color,
                  0.7
                );
                cont.add(trail);

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
            runnerTrailTimer += 16;
          },
          onComplete: () => {
            // 2. Pause (getting in car)
            this.tweens.add({
              targets: runner,
              alpha: 0,
              duration: 300,
              onComplete: () => {
                runner.setVisible(false);
                // 3. Car drives off with trail
                carLastTrailPos = { x: car.x, y: car.y };
                carTrailTimer = 0;
                this.tweens.add({
                  targets: car,
                  x: cw * 0.7,
                  alpha: 0,
                  duration: 1200,
                  ease: 'Cubic.easeIn',
                  onUpdate: () => {
                    // Blue flame trail for car
                    const dx = car.x - carLastTrailPos.x;
                    const dy = car.y - carLastTrailPos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 2 && carTrailTimer >= 40) {
                      carTrailTimer = 0;
                      const dirX = dx / dist;
                      const dirY = dy / dist;
                      const perpX = -dirY * (Math.random() - 0.5) * scale * 20;
                      const perpY = dirX * (Math.random() - 0.5) * scale * 20;

                      carLastTrailPos = { x: car.x, y: car.y };

                      for (let i = 0; i < 2; i++) {
                        const colors = [0x60a5fa, 0x3b82f6, 0x2563eb];
                        const color = colors[Math.floor(Math.random() * colors.length)];

                        const trail = this.add.circle(
                          car.x - dirX * scale * 60 + perpX * (i === 0 ? 1 : -1),
                          car.y - dirY * scale * 60 + perpY * (i === 0 ? 1 : -1),
                          scale * 10,
                          color,
                          0.7
                        );
                        cont.add(trail);

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
                    carTrailTimer += 16;
                  },
                  onComplete: () => {
                    // 4. Reset and loop
                    runner.setPosition(-cw * 0.4, ch * 0.15).setAlpha(alpha).setVisible(true);
                    car.setPosition(cw * 0.3, ch * 0.15).setAlpha(alpha);
                    runnerLastTrailPos = { x: runner.x, y: runner.y };
                    runnerTrailTimer = 0;
                    this.time.delayedCall(500, runSequence);
                  }
                });
              }
            });
          }
        });
      };
      runSequence();

    } else if (modeKey === 'plug'){
      // DEFEND THE STASH: Plug patrolling with shooting and flame trail
      const plug = this.add.sprite(0, 0, 'td_plug')
        .setScale(scale)
        .setAlpha(alpha)
        .setTint(0xff6b6b);

      // Muzzle flash for shooting animation
      const muzzleFlash = this.add.rectangle(0, 0, scale * 6, scale * 6, 0xffff00, 0)
        .setDepth(10);

      // Bullet projectiles pool
      const bullets = [];
      for (let i = 0; i < 5; i++) {
        const bullet = this.add.circle(0, 0, scale * 4, 0xff0000, 0)
          .setDepth(5);
        bullets.push(bullet);
        cont.add(bullet);
      }

      cont.add([plug, muzzleFlash]);

      // Trail tracking
      let lastTrailPos = { x: plug.x, y: plug.y };
      let trailTimer = 0;

      // Patrol with random shooting
      const patrol = () => {
        // Pick a random patrol point
        const targetX = (Math.random() - 0.5) * cw * 0.5;
        const targetY = (Math.random() - 0.5) * ch * 0.3;
        const distance = Math.hypot(targetX - plug.x, targetY - plug.y);
        const duration = distance * 12; // Slightly faster patrol

        // Face the direction we're moving
        plug.setFlipX(targetX < plug.x);

        this.tweens.add({
          targets: plug,
          x: targetX,
          y: targetY,
          duration: duration,
          ease: 'Sine.easeInOut',
          onUpdate: (tween) => {
            plug.setTexture(Math.floor(tween.progress * (duration / 150)) % 2 === 0 ? 'td_plug' : 'td_plug_step');

            // Flame trail effect (red for plug)
            const dx = plug.x - lastTrailPos.x;
            const dy = plug.y - lastTrailPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 2 && trailTimer >= 40) {
              trailTimer = 0;
              const dirX = dx / dist;
              const dirY = dy / dist;
              const perpX = -dirY * (Math.random() - 0.5) * scale * 20;
              const perpY = dirX * (Math.random() - 0.5) * scale * 20;

              lastTrailPos = { x: plug.x, y: plug.y };

              // Create 2 red flame particles behind and spread out
              for (let i = 0; i < 2; i++) {
                const colors = [0xef4444, 0xdc2626, 0xb91c1c];
                const color = colors[Math.floor(Math.random() * colors.length)];

                const trail = this.add.circle(
                  plug.x - dirX * scale * 25 + perpX * (i === 0 ? 1 : -1),
                  plug.y - dirY * scale * 25 + perpY * (i === 0 ? 1 : -1),
                  scale * 10,
                  color,
                  0.7
                );
                cont.add(trail);

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
            trailTimer += 16; // Approximate frame time
          },
          onComplete: () => {
            // Random chance to shoot
            if (Math.random() < 0.6) {
              const bulletDir = plug.flipX ? -1 : 1;
              const startX = plug.x + (bulletDir * scale * 8);
              const startY = plug.y;

              // Muzzle flash
              muzzleFlash.setPosition(startX, startY);
              this.tweens.add({
                targets: muzzleFlash,
                alpha: 0.9,
                duration: 80,
                yoyo: true,
                repeat: 1
              });

              // Fire bullet
              const bullet = bullets.find(b => b.alpha === 0) || bullets[0];
              bullet.setPosition(startX, startY).setAlpha(1);

              this.tweens.add({
                targets: bullet,
                x: startX + (bulletDir * cw * 0.5),
                duration: 600,
                ease: 'Linear',
                onComplete: () => {
                  bullet.setAlpha(0); // Return to pool
                  this.time.delayedCall(Phaser.Math.Between(300, 600), patrol);
                }
              });
            } else {
              this.time.delayedCall(Phaser.Math.Between(200, 500), patrol);
            }
          }
        });
      };
      patrol();

    } else if (modeKey === 'pvp'){
      // STREET WARS: Chase scene - plug chasing runner!
      const runner = this.add.sprite(-cw * 0.3, 0, 'td_runner')
        .setScale(scale)
        .setAlpha(alpha);

      const plug = this.add.sprite(-cw * 0.4, 0, 'td_plug')
        .setScale(scale)
        .setAlpha(alpha)
        .setTint(0xff6b6b);

      cont.add([runner, plug]);

      // Trail tracking for both characters
      let runnerLastTrailPos = { x: runner.x, y: runner.y };
      let runnerTrailTimer = 0;
      let plugLastTrailPos = { x: plug.x, y: plug.y };
      let plugTrailTimer = 0;

      // CHASE: Runner runs, plug chases behind
      const chase = () => {
        // Runner runs to a new spot
        const runnerTargetX = (Math.random() - 0.3) * cw * 0.6;
        const runnerTargetY = (Math.random() - 0.5) * ch * 0.25;
        const runnerDist = Math.hypot(runnerTargetX - runner.x, runnerTargetY - runner.y);
        const runnerDuration = runnerDist * 8;

        runner.setFlipX(runnerTargetX < runner.x);

        this.tweens.add({
          targets: runner,
          x: runnerTargetX,
          y: runnerTargetY,
          duration: runnerDuration,
          ease: 'Sine.easeInOut',
          onUpdate: (tween) => {
            runner.setTexture(Math.floor(tween.progress * (runnerDuration / 100)) % 2 === 0 ? 'td_runner' : 'td_runner_step');

            // Blue flame trail for runner
            const dx = runner.x - runnerLastTrailPos.x;
            const dy = runner.y - runnerLastTrailPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 2 && runnerTrailTimer >= 40) {
              runnerTrailTimer = 0;
              const dirX = dx / dist;
              const dirY = dy / dist;
              const perpX = -dirY * (Math.random() - 0.5) * scale * 20;
              const perpY = dirX * (Math.random() - 0.5) * scale * 20;

              runnerLastTrailPos = { x: runner.x, y: runner.y };

              for (let i = 0; i < 2; i++) {
                const colors = [0x60a5fa, 0x3b82f6, 0x2563eb];
                const color = colors[Math.floor(Math.random() * colors.length)];

                const trail = this.add.circle(
                  runner.x - dirX * scale * 25 + perpX * (i === 0 ? 1 : -1),
                  runner.y - dirY * scale * 25 + perpY * (i === 0 ? 1 : -1),
                  scale * 10,
                  color,
                  0.7
                );
                cont.add(trail);

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
            runnerTrailTimer += 16;
          }
        });

        // Plug chases the runner (always moves towards runner's current position)
        this.time.delayedCall(200, () => {
          const plugTargetX = runner.x - (cw * 0.1 * (runner.flipX ? -1 : 1));
          const plugTargetY = runner.y;
          const plugDist = Math.hypot(plugTargetX - plug.x, plugTargetY - plug.y);
          const plugDuration = plugDist * 9; // Slightly slower than runner

          plug.setFlipX(plugTargetX < plug.x);

          this.tweens.add({
            targets: plug,
            x: plugTargetX,
            y: plugTargetY,
            duration: plugDuration,
            ease: 'Sine.easeInOut',
            onUpdate: (tween) => {
              plug.setTexture(Math.floor(tween.progress * (plugDuration / 100)) % 2 === 0 ? 'td_plug' : 'td_plug_step');

              // Red flame trail for plug
              const dx = plug.x - plugLastTrailPos.x;
              const dy = plug.y - plugLastTrailPos.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist > 2 && plugTrailTimer >= 40) {
                plugTrailTimer = 0;
                const dirX = dx / dist;
                const dirY = dy / dist;
                const perpX = -dirY * (Math.random() - 0.5) * scale * 20;
                const perpY = dirX * (Math.random() - 0.5) * scale * 20;

                plugLastTrailPos = { x: plug.x, y: plug.y };

                for (let i = 0; i < 2; i++) {
                  const colors = [0xef4444, 0xdc2626, 0xb91c1c];
                  const color = colors[Math.floor(Math.random() * colors.length)];

                  const trail = this.add.circle(
                    plug.x - dirX * scale * 25 + perpX * (i === 0 ? 1 : -1),
                    plug.y - dirY * scale * 25 + perpY * (i === 0 ? 1 : -1),
                    scale * 10,
                    color,
                    0.7
                  );
                  cont.add(trail);

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
              plugTrailTimer += 16;
            },
            onComplete: () => {
              this.time.delayedCall(Phaser.Math.Between(200, 500), chase);
            }
          });
        });
      };

      chase();
    }
  }

  makeIconButton(label, onClick){
    const r = Math.max(22, Math.floor(this.scale.height * 0.034));
    const bg = this.rexUI.add.roundRectangle(0, 0, r*2, r*2, r, PALETTE.panel, 0.92)
      .setStrokeStyle(2, PALETTE.stroke);
    const t = this.add.text(0, 0, label, { fontSize: Math.max(14, Math.floor(r*1.1)) + 'px', color: PALETTE.title }).setOrigin(0.5);
    const btn = this.add.container(0, 0, [bg, t]).setSize(r*2, r*2).setDepth(6);
    btn.setInteractive(new Phaser.Geom.Rectangle(-r, -r, r*2, r*2), Phaser.Geom.Rectangle.Contains)
      .on('pointerup', onClick);
    return btn;
  }

  makeChip(text, color){
    const c = this.add.container(0, 0).setDepth(6);
    const w = Math.max(120, Math.floor(this.scale.width * 0.28));
    const h = Math.max(26, Math.floor(this.scale.height * 0.036));
    const bg = this.add.rectangle(0, 0, w, h, color || 0x2563eb, 0.18).setStrokeStyle(1, color || 0x2563eb);
    const t  = this.add.text(0, 0, text, { color:'#cbd1ff', fontSize: Math.max(12, Math.floor(h*0.55)) + 'px' }).setOrigin(0.5);
    c.add([bg, t]);
    return c;
  }

  cardSpacing(){ return Math.min(520, Math.floor(this.scale.width * 0.82)) + Math.max(28, Math.floor(this.scale.width * 0.06)); }

  layoutCards(shift = 0, tweenBack = false){
    // shift: fractional movement towards next (+) / prev (-)
    const cx = this.scale.width / 2; const cy = this.scale.height * 0.54;
    const spacing = this.cardSpacing();

    const focusIdx = this.selected + shift;
    this.cards.forEach((card, i)=>{
      const x = cx + (i - focusIdx) * spacing;
      const y = cy;
      const d  = Math.abs(i - focusIdx);
      const scl = clamp(1.06 - 0.12 * d, 0.86, 1.08);
      const ang = clamp((i - focusIdx) * -6, -10, 10);
      const alpha = clamp(1.0 - 0.18 * Math.max(0, d - 0.2), 0.62, 1.0);

      if (tweenBack){
        this.tweens.add({ targets: card, x, y, scaleX: scl, scaleY: scl, angle: ang, alpha, duration: 240, ease: 'Cubic.easeOut' });
      } else {
        card.setPosition(x, y).setScale(scl).setAngle(ang).setAlpha(alpha);
      }

      const focused = (Math.round(focusIdx) === i && d < 0.6);
      if (card._bg) {
        card._bg.setStrokeStyle(focused ? 3 : 2, focused ? 0x60a5fa : 0x2f3650, 1);
      }
    });
  }

  setSelected(idx){
    this.selected = clamp(idx, 0, this.cards.length - 1);
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('lastMode', String(this.selected)); } catch {}
    this.layoutCards(0, true);
  }
  selectNext(){ this.setSelected(this.selected + 1); }
  selectPrev(){ this.setSelected(this.selected - 1); }

  launchCard(card){
    const k = card.modeKey;
    const cam = this.cameras.main;

    if (k === 'learn'){
      // Launch tutorial (play learn beat before transitioning so it crossfades smoothly)
      try {
        const audio = AudioManager.get(this);
        audio.ensureUnlocked(this);
        audio.playMusic('bg_learn', { volume: 0.3, loop: true, fade: 0 });
      } catch {}
      cam.fadeOut(250, 0,0,0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, ()=>{
        this.scene.transition({ target: 'TUTORIAL_MINI', duration: 250, moveBelow: true });
      });
    } else if (k === 'runner'){
      // Run the Block - play as runner
      try {
        const audio = AudioManager.get(this);
        audio.ensureUnlocked(this);
        audio.playMusic('bg_main', { volume: 0.2, loop: true, fade: 0 });
      } catch {}
      cam.fadeOut(250, 0,0,0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, ()=>{
        this.scene.transition({
          target: 'RUNNER',
          duration: 250,
          moveBelow: true,
          data: { mode: 'pve' }
        });
      });
    } else if (k === 'plug'){
      // Defend the Stash - play as plug
      try {
        const audio = AudioManager.get(this);
        audio.ensureUnlocked(this);
        audio.playMusic('bg_plug', { volume: 0.28, loop: true, fade: 0 });
      } catch {}
      cam.fadeOut(250, 0,0,0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, ()=>{
        this.scene.transition({
          target: 'PLUG',
          duration: 250,
          moveBelow: true,
          data: { mode: 'pve' }
        });
      });
    } else {
      // Coming soon (pvp, daily, etc.)
      console.info('[Menu] Coming soon:', k);
      this.toast('Coming soon');
    }
  }

  // MENUSCENE (rexUI): toast helper using rexUI
  toast(msg){
    const toast = this.rexUI.add.toast({
      x: this.scale.width/2,
      y: this.scale.height*0.88,
      background: this.rexUI.add.roundRectangle(0,0,0,0,8, PALETTE.panel, 0.92).setStrokeStyle(2, PALETTE.stroke),
      text: this.add.text(0,0,msg,{ color: PALETTE.title, fontSize: Math.max(14, Math.floor(this.scale.height*0.028))+'px' }),
      space: { left: 12, right: 12, top: 8, bottom: 8 },
      duration: { in: 180, hold: 900, out: 200 }
    });
    toast.show();
  }

  openSettings(){
    const W = this.scale.width, H = this.scale.height;
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const panelW = Math.min(360, W - 40);
    const panelH = 120;

    const veil = this.add.rectangle(cx, cy, W, H, 0x000000, 0.65).setDepth(50).setInteractive();
    const panel = this.add.rectangle(cx, cy, panelW, panelH, PALETTE.panel, 0.96).setDepth(51).setStrokeStyle(2, PALETTE.stroke);
    const title = this.add.text(cx, cy - panelH/2 + 22, 'Settings', { color: PALETTE.title, fontSize: '18px' }).setOrigin(0.5).setDepth(52);

    const btnW = 84, btnH = 28;

    // Music toggle (background music only)
    const musicLabel = this.add.text(cx - panelW/2 + 16, cy + 8, 'Music', { color: PALETTE.sub, fontSize:'14px' }).setOrigin(0,0.5).setDepth(52);
    const musicBg = this.add.rectangle(cx + panelW/2 - btnW/2 - 16, cy + 8, btnW, btnH, 0x1a2038, 1)
      .setStrokeStyle(1, PALETTE.stroke)
      .setDepth(52)
      .setInteractive({ useHandCursor: true });
    const audio = AudioManager.get(this);
    let musicOn = !audio.isMusicMuted();
    const musicTxt = this.add.text(musicBg.x, musicBg.y, musicOn ? 'ON' : 'OFF', { color: musicOn ? '#86efac' : '#cbd1ff', fontSize:'14px' }).setOrigin(0.5).setDepth(53);
    const applyMusic = (next) => {
      musicOn = next; musicTxt.setText(musicOn ? 'ON' : 'OFF').setColor(musicOn ? '#86efac' : '#cbd1ff');
      audio.setMusicMute(!musicOn);
      this.toast('Music ' + (musicOn ? 'ON' : 'OFF'));
    };
    musicBg.on('pointerdown', ()=> applyMusic(!musicOn));

    // Close button
    const closeBg = this.add.rectangle(cx, cy + panelH/2 - 22, 92, 28, 0x1a2038, 1).setStrokeStyle(1, PALETTE.stroke).setDepth(52).setInteractive({ useHandCursor:true });
    const closeTx = this.add.text(closeBg.x, closeBg.y, 'Close', { color:'#cbd1ff' }).setOrigin(0.5).setDepth(53);
    const destroyAll = ()=> { [veil, panel, title, musicLabel, musicBg, musicTxt, closeBg, closeTx].forEach(o=>o?.destroy()); };
    closeBg.on('pointerdown', destroyAll);
    veil.on('pointerdown', destroyAll);
  }

  update(){
    // keyboard navigation
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.keys.A)){ this.selectPrev(); }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.keys.D)){ this.selectNext(); }
    if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)){
      this.launchCard(this.cards[this.selected]);
    }
  }

  reposition(){
    const W = this.scale.width, H = this.scale.height;
    const logoY = Math.max(16, Math.floor(H*0.04));
    const logoSize = Math.max(26, Math.floor(H * 0.05));
    const signH = logoSize * 2.2; // Updated for two-line sign

    // Reposition street sign elements
    this.signShadow?.setPosition(W/2 + 2, logoY + signH/2 + 2);
    this.signBg?.setPosition(W/2, logoY + signH/2);
    this.logo?.setPosition(W/2, logoY + signH/2 - logoSize * 0.35);
    this.logoAddress?.setPosition(W/2, logoY + signH/2 + logoSize * 0.45);

    // Bottom corners
    const pad = Math.max(8, Math.floor(Math.min(W,H) * 0.02));
    this.settingsBtn?.setPosition(W - pad - 24, H - pad - 24);
    this.profileBtn?.setPosition(W - pad - 24 - 48, H - pad - 24);
    this.dailyChip?.setPosition(pad + 80, H - pad - 24);
    // Refresh layout
    this.layoutCards(0, false);
  }
}
