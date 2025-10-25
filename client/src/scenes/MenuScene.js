// LANDING / MENUSCENE
// LANDING / MENUSCENE (rexUI)
import Phaser from 'phaser';
import AudioManager from '../audio/AudioManager.js';
import { getUsername, getCurrentUser, getCurrentUserSync, isGuestAccount } from '../utils/userManager.js';
import { getUserRank, getUserScore, getAllTimeRank, getAllTimeScore, getTopScores } from '../utils/leaderboardManager.js';
import { getCurrentRouteID } from '../utils/seededRandom.js';
import { trackNavigation } from '../utils/analytics.js';
import { showClaimAccountModal, showSignOutModal } from '../utils/authUI.js';
import { createPortraitOverlay } from '../utils/portraitMode.js';
import { isDesktop, areSidebarsActive, createSidebarContainer, createSocialFeed, createPersonalStats, cleanupSidebars, updateStats, updateLeaderboard, updateSocialFeed, setGlobalTimers, setCurrentMode, getCurrentMode, getExistingSidebars } from '../utils/desktopSidebars.js';
import { fetchRecentActivity } from '../utils/activityFeed.js';

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
    // Load emblem logo
    this.load.image('emblem', '/emblem.png');

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
      this.load.audio('bg_plug',  ['/audio/plug_beat2.ogg',  '/audio/plug_beat2.mp3']);
      this.load.audio('bg_learn', ['/audio/learn_beat.ogg', '/audio/learn_beat.mp3']);
      // Street ambience sounds for menu
      this.load.audio('street_ambience', ['/audio/street_ambience.ogg', '/audio/street_ambience.mp3']);
      this.load.audio('cars_pass', ['/audio/cars_pass.ogg', '/audio/cars_pass.mp3']);
    } catch {}
  }

  init(){
    this.cards = [];
    this.selected = 0;
    try {
      const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('lastMode') : null;
      if (saved){ this.selected =  Math.max(0, Math.min(4, parseInt(saved, 10) || 0)); }
    } catch {}
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

    // Emblem - circular logo on the left side of the sign
    const emblemSize = signH * 0.85; // Slightly smaller than sign height
    this.emblem = this.add.image(
      W/2 - signW/2 + emblemSize/2 + 8, // Left side with small padding
      logoY + signH/2,
      'emblem'
    )
      .setDisplaySize(emblemSize, emblemSize)
      .setDepth(5);

    // Static street number for main sign (888 WAY - memorable and consistent)
    const mainStreetNum = 888;
    const mainSuffix = 'WAY';

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
      { key:'runner', title:'Run the Block',      sub:'Play as the runner. Evade the plug.', showTimer: true },
      { key:'plug',   title:'Defend the Block',   sub:'Play as the plug. Stop the runner.', showTimer: true },
      { key:'leaderboard', title:'Leaderboard',   sub:'Top players on today\'s block.' },
      { key:'pvp',    title:'Street Wars',        sub:'1v1 PVP. Coming soon.' }
    ];

    // Carousel root container to keep z-order tidy
    this.carousel = this.add.container(0, 0).setDepth(3);

    // Store start buttons separately (outside cards)
    this.startButtons = [];

    modes.forEach((m, idx)=>{
      const card = this.makeCard(m.title, m.sub, m.key, m.showTimer); // rexUI-based card
      card.modeKey = m.key;
      card.index = idx;
      this.carousel.add(card);
      this.cards.push(card);

      // Create start button for this card (outside the card container)
      const startBtn = this.makeStartButton(card, idx);
      this.startButtons.push(startBtn);
    });

    // Create navigation arrows (positioned next to START button)
    this.leftArrow = this.makeArrowButton('left');
    this.rightArrow = this.makeArrowButton('right');

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,ENTER,SPACE,ESC');

    // Bottom-right settings button
    this.settingsBtn = this.makeIconButton('⚙', () => this.openSettings());

    // User profile chip (clickable to show user's leaderboard position)
    this.profileChip = this.makeUserProfileChip();

    // Daily bonus button (styled like REP reward, hidden if already claimed today)
    this.dailyBonusBtn = this.makeDailyBonusButton();

    this.reposition();
    this.scale.on('resize', () => this.reposition());

    // Initialize user data from Supabase (async)
    this.initializeUserData();

    // Initial layout to selected index
    this.layoutCards(0, false);

    // Initialize desktop sidebars (only on desktop)
    if (isDesktop()) {
      this.initDesktopSidebars();
    }

    // Keep menu silent; stop any residual gameplay music when returning
    try {
      const audio = AudioManager.get(this);
      audio.ensureUnlocked(this);
      audio.stopMusic(200);
    } catch {}

    // Street ambience: play looping ambient sound
    try {
      const audio = AudioManager.get(this);
      const isMuted = audio.isMusicMuted();
      if (this.sound.get('street_ambience')) {
        this.sound.get('street_ambience').stop();
      }
      if (this.sound.get('cars_pass')) {
        this.sound.get('cars_pass').stop();
      }
      this.streetAmbience = this.sound.add('street_ambience', { loop: true, volume: isMuted ? 0 : 0.15 });
      this.streetAmbience.play();

      // Cars passing: play as looping sound (it's one long file with multiple passes)
      this.carsPass = this.sound.add('cars_pass', { loop: true, volume: isMuted ? 0 : 0.25 });
      this.carsPass.play();
    } catch {}

    // Proactively unlock audio on first interaction so gameplay music starts immediately in modes
    try {
      const audio = AudioManager.get(this);
      this.input.once('pointerdown', () => { audio.ensureUnlocked(this); try { this.sound.unlock(); } catch {} });
    } catch {}

    // Cleanup street sounds and animations when leaving scene
    this.events.once('shutdown', () => {
      try {
        if (this.streetAmbience) {
          this.streetAmbience.stop();
          this.streetAmbience.destroy();
        }
        if (this.carsPass) {
          this.carsPass.stop();
          this.carsPass.destroy();
        }
        // Stop all card animations
        if (this.cards) {
          this.cards.forEach(card => {
            if (card._animationCleanup && card._animationActive) {
              card._animationCleanup();
            }
          });
        }

        // Note: Don't cleanup sidebars - they persist between Menu ↔ Game transitions
        // Only cleaned up when truly exiting to a non-game scene
      } catch {}
    });

    // Portrait mode enforcement overlay for mobile landscape
    createPortraitOverlay(this);

    // Update card timers every second
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.cards) {
          this.cards.forEach(card => {
            if (card._timerUpdate) {
              card._timerUpdate();
            }
          });
        }
      }
    });
  }

  // Calculate time until next block reset (1:00 AM UTC)
  getTimeUntilReset(){
    const now = new Date();
    const nextReset = new Date();

    // Set to 1:00 AM UTC
    nextReset.setUTCHours(1, 0, 0, 0);

    // If we're past 1am UTC today, add a day
    if (now >= nextReset) {
      nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    }

    const diff = nextReset - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  }

  // MENU: UI helpers -------------------------------------------------
  // Simple card with background and text overlay
  makeCard(title, sub, modeKey, showTimer = false){
    const W = this.scale.width, H = this.scale.height;
    const cw = Math.min(520, Math.floor(W * 0.82));
    const ch = Math.min(320, Math.floor(H * 0.45));

    // Create container first
    const cont = this.add.container(0, 0).setSize(cw, ch).setDepth(3);
    // Cards are not interactive - only buttons control navigation

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
      'learn': { num: 217, suffix: 'PL' },
      'runner': { num: 1179, suffix: 'ST' },
      'plug': { num: 42, suffix: 'ST' },
      'pvp': { num: 636, suffix: 'CT' },
      'leaderboard': { num: 1440, suffix: 'DR' }
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

    // Timer (if enabled) - positioned right below title bar in black space
    let timerTxt = null;
    if (showTimer) {
      const timerSize = Math.max(9, Math.floor(ch * 0.055)); // Smaller font
      const timerY = -ch * 0.5 + titleBgHeight + 18; // Just below title bar
      timerTxt = this.add.text(0, timerY, '', {
        color: '#86efac', // STASH green color
        fontSize: timerSize + 'px',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 1.5,
        align: 'center'
      }).setOrigin(0.5, 0.5);
      cont.add(timerTxt);

      // Update timer text
      const updateTimer = () => {
        if (timerTxt && timerTxt.active) {
          timerTxt.setText(`Next Block Reset: ${this.getTimeUntilReset()}`);
        }
      };
      updateTimer(); // Initial update

      // Store timer updater on card
      cont._timerUpdate = updateTimer;
    }

    // Subtitle at BOTTOM (moved lower if timer is shown)
    const subSize = Math.max(10, Math.floor(ch * 0.07)); // Smaller to avoid border overlap
    const subY = ch * 0.35; // Raised slightly to make room for button below
    const subTxt = this.add.text(0, subY, sub, {
      color: '#cbd5e1',
      fontSize: subSize + 'px',
      align: 'center',
      wordWrap: { width: Math.floor(cw * 0.85) }
    }).setOrigin(0.5, 0.5);
    cont.add(subTxt);

    // Cards are not clickable - only START button launches modes
    cont._bg = bg; cont._sub = subTxt;
    return cont;
  }

  makeStartButton(card, cardIndex) {
    const W = this.scale.width, H = this.scale.height;
    const btnWidth = Math.min(200, Math.floor(W * 0.4));
    const btnHeight = 40;

    const container = this.add.container(0, 0).setDepth(10);

    // Store which card this button belongs to
    container.cardIndex = cardIndex;

    // Create background rectangle and make IT interactive (not the container)
    const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, 0xfbbf24, 1)
      .setStrokeStyle(3, 0xfde047)
      .setInteractive({ cursor: 'pointer' });

    const text = this.add.text(0, 0, 'START', {
      fontSize: '16px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Add a subtle hint text below button to guide users
    const isTouchDevice = this.sys.game.device.input.touch;
    const hintMessage = isTouchDevice ? 'Tap to play' : 'Click to play';
    const hintText = this.add.text(0, btnHeight / 2 + 20, hintMessage, {
      fontSize: '12px',
      color: '#94a3b8',
      fontStyle: 'italic'
    }).setOrigin(0.5).setAlpha(0.8);

    container.add([bg, text, hintText]);
    container._bg = bg; // Store reference for hover effect
    container._hintText = hintText; // Store hint reference

    // Background rectangle handles the interaction
    bg.on('pointerdown', (pointer, localX, localY, event) => {
      // Stop event propagation
      if (event) event.stopPropagation();
      if (pointer.event) pointer.event.stopPropagation();

      // Prevent rapid-fire clicks (cooldown on mobile for reliability)
      const now = Date.now();
      if (this._lastStartClick && now - this._lastStartClick < 300) return;
      this._lastStartClick = now;

      // Get the card this button belongs to
      const targetCard = this.cards[container.cardIndex];
      this.tweens.killTweensOf(targetCard);

      // Select and launch the specific card
      if (container.cardIndex !== this.selected) {
        this.setSelected(container.cardIndex);
      }

      this.launchCard(targetCard);
    });

    // Hover effect (lighter gold)
    bg.on('pointerover', () => {
      bg.setFillStyle(0xfde047, 1); // Lighter gold on hover
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0xfbbf24, 1); // Back to gold
    });

    return container;
  }

  makeArrowButton(direction) {
    // direction: 'left' or 'right'
    const isMobile = this.scale.width < 768;
    const btnHeight = 40; // Match START button height
    const btnWidth = isMobile ? 60 : 80; // Shorter on mobile
    const container = this.add.container(0, 0).setDepth(10);

    // Create background rectangle and make IT interactive (not the container)
    const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, 0xfbbf24, 1)
      .setStrokeStyle(3, 0xfde047)
      .setInteractive({ cursor: 'pointer' });

    container.add(bg);
    container._bg = bg; // Store reference for hover effect

    // Draw arrow using graphics (centered in button)
    const arrow = this.add.graphics();
    arrow.fillStyle(0x000000, 1);

    if (direction === 'left') {
      // Left-pointing arrow (triangle + rectangle)
      arrow.beginPath();
      arrow.moveTo(-12, 0);  // Arrow point
      arrow.lineTo(-2, -8);   // Top of triangle
      arrow.lineTo(-2, 8);    // Bottom of triangle
      arrow.closePath();
      arrow.fillPath();
      // Rectangle part
      arrow.fillRect(-2, -4, 14, 8);
    } else {
      // Right-pointing arrow
      arrow.beginPath();
      arrow.moveTo(12, 0);   // Arrow point
      arrow.lineTo(2, -8);    // Top of triangle
      arrow.lineTo(2, 8);     // Bottom of triangle
      arrow.closePath();
      arrow.fillPath();
      // Rectangle part
      arrow.fillRect(-12, -4, 14, 8);
    }

    container.add(arrow);

    // Add label under arrow button (match hint text styling)
    const labelText = direction === 'left' ? 'Prev' : 'Next';
    const label = this.add.text(0, btnHeight / 2 + 20, labelText, {
      fontSize: '12px',
      color: '#94a3b8',
      fontStyle: 'italic'
    }).setOrigin(0.5).setAlpha(0.8);

    container.add(label);

    // Background rectangle handles the interaction
    bg.on('pointerdown', (pointer, localX, localY, event) => {
      if (event) event.stopPropagation();
      if (pointer.event) pointer.event.stopPropagation();

      // Prevent rapid-fire clicks (cooldown for reliability)
      const now = Date.now();
      if (this._lastArrowClick && now - this._lastArrowClick < 300) return;
      this._lastArrowClick = now;

      if (direction === 'left') {
        this.selectPrev();
      } else {
        this.selectNext();
      }
    });

    // Hover effect (lighter gold)
    bg.on('pointerover', () => {
      bg.setFillStyle(0xfde047, 1);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0xfbbf24, 1);
    });

    return container;
  }

  addCardVisuals(cont, modeKey, cw, ch){
    if (!modeKey) return;

    // Store animation state on container
    cont._animationActive = false;
    cont._animationCleanup = null;

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
      // Store cleanup function
      cont._animationCleanup = () => {
        this.tweens.killTweensOf(runner);
      };

      // Start animation function (don't auto-start, let layoutCards control it)
      cont._startAnimation = wander;

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
      // Store cleanup function
      cont._animationCleanup = () => {
        this.tweens.killTweensOf([runner, car]);
      };

      // Start animation function (don't auto-start, let layoutCards control it)
      cont._startAnimation = runSequence;

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
      // Store cleanup function
      cont._animationCleanup = () => {
        this.tweens.killTweensOf(plug);
      };

      // Start animation function (don't auto-start, let layoutCards control it)
      cont._startAnimation = patrol;

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

      // Store cleanup function
      cont._animationCleanup = () => {
        this.tweens.killTweensOf([runner, plug]);
      };

      // Start animation function (don't auto-start, let layoutCards control it)
      cont._startAnimation = chase;

    } else if (modeKey === 'leaderboard'){
      // LEADERBOARD: Scrolling leaderboard with rankings
      const fontSize = Math.max(10, Math.floor(ch * 0.06));
      const lineHeight = fontSize * 1.6;
      const startY = -ch * 0.2; // Start position for leaderboard entries

      // Sample leaderboard data (20 entries for continuous scroll)
      const names = ['GHOST', 'VIPER', 'SHADOW', 'ACE', 'BLAZE', 'NEON', 'FLASH', 'STORM', 'FROST', 'VOLT', 'CIPHER', 'ROGUE', 'JINX', 'TITAN', 'HAWK', 'NOVA', 'ZERO', 'ECHO', 'PHNTM', 'REAPER'];
      const leaderboardData = names.map((name, idx) => ({
        rank: idx + 1,
        name: name,
        stash: Math.floor(2900 - (idx * 120) - Math.random() * 50),
        rep: parseFloat((58 - idx * 2.5 - Math.random() * 1.5).toFixed(2))
      }));

      // Create leaderboard entries
      const entries = [];
      leaderboardData.forEach((data, idx) => {
        const entryY = startY + (idx * lineHeight);

        // Rank color based on position
        let rankColor = '#cbd1ff'; // default
        if (data.rank === 1) rankColor = '#fbbf24'; // gold
        else if (data.rank === 2) rankColor = '#d1d5db'; // silver
        else if (data.rank === 3) rankColor = '#f59e0b'; // bronze

        // Rank number
        const rankText = this.add.text(-cw * 0.35, entryY, `#${data.rank}`, {
          color: rankColor,
          fontSize: fontSize + 'px',
          fontStyle: 'bold'
        }).setOrigin(0, 0.5).setAlpha(alpha);

        // Player name
        const nameText = this.add.text(-cw * 0.24, entryY, data.name, {
          color: '#cbd1ff',
          fontSize: fontSize + 'px',
          fontFamily: 'monospace'
        }).setOrigin(0, 0.5).setAlpha(alpha);

        // Stash: S prefix in green (shifted left to prevent overlap)
        const stashLabel = this.add.text(cw * -0.02, entryY, 'S', {
          color: '#86efac',
          fontSize: fontSize + 'px',
          fontFamily: 'monospace',
          fontStyle: 'bold'
        }).setOrigin(0, 0.5).setAlpha(alpha);

        const stashValue = this.add.text(cw * 0.03, entryY, data.stash.toString(), {
          color: '#86efac',
          fontSize: fontSize + 'px',
          fontFamily: 'monospace'
        }).setOrigin(0, 0.5).setAlpha(alpha);

        // Rep: R prefix in yellow/gold
        const repLabel = this.add.text(cw * 0.18, entryY, 'R', {
          color: '#ffd166',
          fontSize: fontSize + 'px',
          fontFamily: 'monospace',
          fontStyle: 'bold'
        }).setOrigin(0, 0.5).setAlpha(alpha);

        const repValue = this.add.text(cw * 0.23, entryY, data.rep.toString(), {
          color: '#ffd166',
          fontSize: fontSize + 'px',
          fontFamily: 'monospace'
        }).setOrigin(0, 0.5).setAlpha(alpha);

        cont.add([rankText, nameText, stashLabel, stashValue, repLabel, repValue]);
        entries.push({
          rank: rankText,
          name: nameText,
          stashLabel: stashLabel,
          stashValue: stashValue,
          repLabel: repLabel,
          repValue: repValue,
          initialY: entryY
        });
      });

      // Scrolling animation - continuous upward scroll
      const scrollSpeed = 50; // pixels per second
      const totalHeight = leaderboardData.length * lineHeight;
      const scrollDuration = (totalHeight / scrollSpeed) * 1000; // Convert to milliseconds

      // Store active timer to allow cleanup
      let activeScrollTimer = null;

      const scrollLeaderboard = () => {
        // Clear any existing timer
        if (activeScrollTimer) {
          activeScrollTimer.remove();
          activeScrollTimer = null;
        }

        // Define visible bounds (top and bottom of card content area)
        const visibleTop = -ch * 0.28; // Tighter bound at top to prevent overflow
        const visibleBottom = ch * 0.3;
        const fadeRange = lineHeight * 2; // Shorter fade range for quicker clipping

        entries.forEach((entry) => {
          // Reset to starting position
          entry.rank.y = entry.initialY;
          entry.name.y = entry.initialY;
          entry.stashLabel.y = entry.initialY;
          entry.stashValue.y = entry.initialY;
          entry.repLabel.y = entry.initialY;
          entry.repValue.y = entry.initialY;

          const allTargets = [entry.rank, entry.name, entry.stashLabel, entry.stashValue, entry.repLabel, entry.repValue];

          // Animate upward scroll with visibility culling
          this.tweens.add({
            targets: allTargets,
            y: entry.initialY - totalHeight - lineHeight * 2,
            duration: scrollDuration,
            ease: 'Linear',
            onUpdate: () => {
              // Only update alpha based on position (much cheaper than before)
              const currentY = entry.rank.y;
              let fadeAlpha = alpha;

              // Hide entries completely when outside visible bounds
              if (currentY < visibleTop - fadeRange || currentY > visibleBottom + fadeRange) {
                fadeAlpha = 0;
              } else if (currentY < visibleTop) {
                // Fade in from top
                const distFromTop = visibleTop - currentY;
                fadeAlpha = alpha * Math.max(0, 1 - (distFromTop / fadeRange));
              } else if (currentY > visibleBottom) {
                // Fade out at bottom
                const distFromBottom = currentY - visibleBottom;
                fadeAlpha = alpha * Math.max(0, 1 - (distFromBottom / fadeRange));
              }

              allTargets.forEach(target => target.setAlpha(fadeAlpha));
            },
            onComplete: () => {
              // Loop: restart the scroll after a brief pause (only set timer on last entry)
              if (entry === entries[entries.length - 1]) {
                activeScrollTimer = this.time.delayedCall(100, scrollLeaderboard);
              }
            }
          });
        });
      };

      // Store cleanup function
      cont._animationCleanup = () => {
        // Cancel the scroll timer to prevent it from restarting
        if (activeScrollTimer) {
          activeScrollTimer.remove();
          activeScrollTimer = null;
        }

        // Kill all entry tweens
        entries.forEach(entry => {
          this.tweens.killTweensOf([entry.rank, entry.name, entry.stashLabel, entry.stashValue, entry.repLabel, entry.repValue]);
        });

        // Kill glow tweens and update events
        glows.forEach(glow => {
          this.tweens.killTweensOf(glow);
          if (glow._updateEvent) {
            glow._updateEvent.remove();
          }
        });
      };

      // Start animation function (don't auto-start, let layoutCards control it)
      cont._startAnimation = scrollLeaderboard;

      // Store references for cleanup
      const glows = [];

      // Add subtle glow effect to highlight top 3
      const createGlow = (y, color) => {
        const glow = this.add.rectangle(0, y, cw * 0.7, lineHeight * 0.8, color, 0.08)
          .setAlpha(0);
        cont.add(glow);

        // Pulse effect
        this.tweens.add({
          targets: glow,
          alpha: 0.12,
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });

        return glow;
      };

      // Add glows for top 3 positions (they'll move with the scroll)
      [0, 1, 2].forEach(idx => {
        const glowColor = idx === 0 ? 0xfbbf24 : idx === 1 ? 0xd1d5db : 0xf59e0b;
        const glow = createGlow(startY + (idx * lineHeight), glowColor);
        glows.push(glow);

        // Make glows follow their entries
        glow._updateEvent = this.time.addEvent({
          loop: true,
          delay: 16,
          callback: () => {
            if (entries[idx]) {
              glow.y = entries[idx].rank.y;
            }
          }
        });
      });
    }
  }

  makeIconButton(label, onClick){
    const r = Math.max(22, Math.floor(this.scale.height * 0.034));
    const bg = this.rexUI.add.roundRectangle(0, 0, r*2, r*2, r, PALETTE.panel, 0.92)
      .setStrokeStyle(2, PALETTE.stroke)
      .setInteractive({ cursor: 'pointer' });
    const t = this.add.text(0, 0, label, { fontSize: Math.max(14, Math.floor(r*1.1)) + 'px', color: PALETTE.title }).setOrigin(0.5);
    const btn = this.add.container(0, 0, [bg, t]).setSize(r*2, r*2).setDepth(6);

    // Background handles interaction
    bg.on('pointerup', onClick);

    // Hover effect
    bg.on('pointerover', () => {
      bg.setStrokeStyle(2, PALETTE.glow);
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(2, PALETTE.stroke);
    });

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

  makeUserProfileChip(){
    const username = getUsername();
    const c = this.add.container(0, 0).setDepth(6);
    const w = Math.max(160, Math.floor(this.scale.width * 0.35));
    const h = Math.max(32, Math.floor(this.scale.height * 0.042));

    // Background with subtle blue tint - make IT interactive
    const bg = this.rexUI.add.roundRectangle(0, 0, w, h, h/2, 0x1e3a8a, 0.85)
      .setStrokeStyle(2, 0x3b82f6)
      .setInteractive({ cursor: 'pointer' });

    // User icon
    const icon = this.add.text(-w/2 + h/2, 0, '👤', { fontSize: Math.floor(h * 0.6) + 'px' }).setOrigin(0.5);

    // Username text
    const t = this.add.text(h/4, 0, username, {
      color:'#cbd1ff',
      fontSize: Math.max(12, Math.floor(h*0.5)) + 'px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    c.add([bg, icon, t]);

    // Background handles interaction
    bg.on('pointerup', () => this.openProfileModal());

    // Add visual feedback on hover
    bg.on('pointerover', () => {
      bg.setStrokeStyle(2, 0x60a5fa);
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(2, 0x3b82f6);
    });

    return c;
  }

  async initializeUserData() {
    // Get the username before Supabase check
    const cachedUsername = getUsername();

    // Wait for user data to load from Supabase (checks session and updates localStorage)
    await getCurrentUser();

    // Get username after Supabase check
    const currentUsername = getUsername();

    // If username changed, update the profile chip
    if (cachedUsername !== currentUsername) {
      this.updateProfileChipSync();
    }
  }

  initDesktopSidebars() {
    // Only create sidebars once - they persist across menu ↔ game transitions
    if (areSidebarsActive()) {
      console.log('[MenuScene] Sidebars already active, skipping initialization');
      // Just refresh the data
      this.refreshSidebarStats();
      this.updateSidebarLeaderboard();
      return;
    }

    console.log('[MenuScene] Creating sidebars for the first time');

    // Clean up any stale sidebars
    cleanupSidebars();

    // Left sidebar: Social feed
    this.leftSidebar = createSidebarContainer('left');
    createSocialFeed(this.leftSidebar);

    // Right sidebar: Personal stats with random daily leaderboard (runner or plug)
    const randomMode = Math.random() < 0.5 ? 'runner' : 'plug';
    setCurrentMode(randomMode); // Store globally for updates
    this.rightSidebar = createSidebarContainer('right');
    createPersonalStats(this.rightSidebar, randomMode);

    // Initialize sidebar with current stats
    this.refreshSidebarStats();

    // Fetch and update live leaderboard
    this.updateSidebarLeaderboard();

    // Fetch and update activity feed
    this.updateSidebarActivity();

    // Set up periodic updates (only once) - use global callbacks
    const leaderboardCallback = async () => {
      const sidebars = getExistingSidebars();
      if (!sidebars.right) return;

      try {
        // Use the globally stored current mode
        const currentMode = getCurrentMode();
        const topScores = await getTopScores(currentMode, 10);
        const leaderboardData = topScores.map(entry => ({
          name: entry.username,
          score: entry.stash || 0
        }));
        updateLeaderboard(sidebars.right, leaderboardData);
      } catch (err) {
        console.warn('[Sidebar] Failed to update leaderboard:', err);
      }
    };

    const activityCallback = async () => {
      const sidebars = getExistingSidebars();
      if (!sidebars.left) return;

      try {
        const activities = await fetchRecentActivity(15);
        updateSocialFeed(sidebars.left, activities);
      } catch (err) {
        console.warn('[Sidebar] Failed to update activity:', err);
      }
    };

    // Store global timers that persist across scenes
    setGlobalTimers(leaderboardCallback, activityCallback);
  }

  async updateSidebarActivity() {
    const sidebars = getExistingSidebars();
    if (!sidebars.left) return;

    try {
      const activities = await fetchRecentActivity(15);
      updateSocialFeed(sidebars.left, activities);
    } catch (err) {
      console.warn('[MenuScene] Failed to update activity feed:', err);
    }
  }

  async updateSidebarLeaderboard() {
    const sidebars = getExistingSidebars();
    if (!sidebars.right) return;

    try {
      // Fetch top 10 scores for the current mode (daily leaderboard)
      const currentMode = getCurrentMode();
      const topScores = await getTopScores(currentMode, 10);

      // Transform data to match updateLeaderboard format
      const leaderboardData = topScores.map(entry => ({
        name: entry.username,
        score: entry.stash || 0
      }));

      updateLeaderboard(sidebars.right, leaderboardData);
    } catch (err) {
      console.warn('[MenuScene] Failed to update sidebar leaderboard:', err);
    }
  }

  refreshSidebarStats() {
    // Update sidebar with current user stats
    const user = getCurrentUserSync();
    const stats = user.stats || {};

    updateStats({
      totalRounds: stats.totalRounds || 0,
      totalStash: stats.totalStash || 0,
      repEarned: stats.totalRep || 0,
      bestRunner: stats.bestRunnerRound || 0,
      bestPlug: stats.bestPlugRound || 0
    });
  }

  updateProfileChipSync() {
    // Destroy old chip
    if (this.profileChip) {
      this.profileChip.destroy();
    }

    // Create new chip with updated username
    this.profileChip = this.makeUserProfileChip();

    // Reposition it
    this.reposition();
  }

  async updateProfileChip() {
    // Wait for user data to be loaded from Supabase
    await getCurrentUser();

    // Update the chip
    this.updateProfileChipSync();
  }

  makeDailyBonusButton(){
    // Check if already claimed for today's route (PST-based, synced with daily routes)
    try {
      const currentRouteID = getCurrentRouteID();
      const lastClaimedRouteID = localStorage.getItem('dailyBonusClaimedRouteID');

      if (lastClaimedRouteID && parseInt(lastClaimedRouteID) === currentRouteID) {
        return null; // Already claimed for today's route
      }
    } catch {}

    // Small text button styled like REP reward popup
    const fontSize = Math.max(16, Math.floor(this.scale.height * 0.026));
    const text = this.add.text(0, 0, '+10 REP', {
      color: '#ffd166',
      fontSize: fontSize + 'px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(6);

    // Make it interactive with hover effect
    text.setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        text.setScale(1.1);
        this.tweens.add({
          targets: text,
          alpha: 0.7,
          duration: 100,
          yoyo: true,
          repeat: -1
        });
      })
      .on('pointerout', () => {
        text.setScale(1.0);
        text.alpha = 1.0;
        this.tweens.killTweensOf(text);
      })
      .on('pointerdown', () => this.claimDailyBonus(text));

    return text;
  }

  claimDailyBonus(button){
    // Award 10 REP
    try {
      const user = getCurrentUser();
      if (user) {
        user.rep = (user.rep || 0) + 10;
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
    } catch {}

    // Mark as claimed for today's route (PST-based, synced with daily routes)
    try {
      const currentRouteID = getCurrentRouteID();
      localStorage.setItem('dailyBonusClaimedRouteID', String(currentRouteID));
    } catch {}

    // Button position (starting point for floater)
    const startX = button.x;
    const startY = button.y;

    // Immediately destroy button
    button.destroy();
    this.dailyBonusBtn = null;

    // Calculate direction towards screen center (matching game mode floater behavior)
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Vector from button to center
    const dx = centerX - startX;
    const dy = centerY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Normalize and scale to float distance (60% of the way to center)
    const floatDistance = Math.min(120, distance * 0.6);
    const normalizedDx = distance > 0 ? (dx / distance) * floatDistance : 0;
    const normalizedDy = distance > 0 ? (dy / distance) * floatDistance : -80; // fallback: float up if already at center

    const endX = startX + normalizedDx;
    const endY = startY + normalizedDy;

    // Create floating "+10 REP" text at button position
    const floaterText = this.add.text(startX, startY, '+10 REP', {
      color: '#ffd166',
      fontSize: '22px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(20001).setScrollFactor(0);

    // Animate floater: fade in while floating towards center, then fade out
    floaterText.setAlpha(0);
    this.tweens.add({
      targets: floaterText,
      alpha: 1,
      x: endX,
      y: endY,
      duration: 2000,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: floaterText,
          alpha: 0,
          duration: 500,
          onComplete: () => floaterText.destroy()
        });
      }
    });
  }

  cardSpacing(){ return Math.min(520, Math.floor(this.scale.width * 0.82)) + Math.max(28, Math.floor(this.scale.width * 0.06)); }

  layoutCards(shift = 0, tweenBack = false){
    // Simple layout: only show selected card, hide others
    const cx = this.scale.width / 2;
    const cy = this.scale.height * 0.54;

    const focusIdx = this.selected + shift;
    this.cards.forEach((card, i)=>{
      const isSelected = (i === Math.round(focusIdx));

      // All cards at same center position
      const x = cx;
      const y = cy;

      if (tweenBack){
        // Smooth transition when changing cards (slower for better visibility)
        this.tweens.add({
          targets: card,
          x,
          y,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          alpha: isSelected ? 1 : 0,
          duration: 400,
          ease: 'Cubic.easeOut'
        });
      } else {
        // Check if this is first layout (card hasn't been positioned yet)
        const isFirstLayout = !card._positioned;

        if (isFirstLayout) {
          // First layout: set immediately
          card.setPosition(x, y).setScale(1).setAngle(0).setAlpha(isSelected ? 1 : 0);
          card._positioned = true;
        } else {
          // Just update alpha for show/hide
          card.setPosition(x, y).setScale(1).setAngle(0);
          card.alpha = isSelected ? 1 : 0;
        }
      }

      // Update border for selected card
      if (card._bg) {
        card._bg.setStrokeStyle(isSelected ? 3 : 2, isSelected ? 0x60a5fa : 0x2f3650, 1);
      }

      // Performance optimization: Only run animations on selected card
      const shouldAnimate = (i === Math.round(focusIdx));
      if (shouldAnimate && !card._animationActive && card._startAnimation) {
        card._animationActive = true;
        card._startAnimation();
      } else if (!shouldAnimate && card._animationActive && card._animationCleanup) {
        card._animationActive = false;
        card._animationCleanup();
      }

      // Only show the START button for the selected card
      if (this.startButtons && this.startButtons[i]) {
        const btn = this.startButtons[i];
        const isSelected = (i === Math.round(focusIdx));

        // Show/hide and enable/disable interactivity based on selection
        if (isSelected) {
          btn.setAlpha(1);
          if (btn._bg) btn._bg.setInteractive({ cursor: 'pointer' }); // Enable interaction on bg

          // Add pulsing animation to hint text only (button stays stationary)
          if (!btn._hintPulse && btn._hintText) {
            btn._hintPulse = this.tweens.add({
              targets: btn._hintText,
              scaleX: 1.15,
              scaleY: 1.15,
              duration: 1200,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
          }
        } else {
          btn.setAlpha(0);
          if (btn._bg) btn._bg.disableInteractive(); // Disable interaction on bg

          // Stop hint pulse animation when not selected
          if (btn._hintPulse) {
            btn._hintPulse.remove();
            btn._hintPulse = null;
            if (btn._hintText) btn._hintText.setScale(1, 1); // Reset to default scale
          }
        }
      }
    });

    // Update static button positions and visibility
    this.updateStaticButtons();
  }

  updateStaticButtons() {
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2;
    const isMobile = W < 768;

    // Fixed position - more gap from cards
    const cardHeight = Math.min(320, Math.floor(H * 0.45));
    const cardsY = H * 0.54;
    const btnY = cardsY + cardHeight / 2 + 45; // Increased gap for better spacing

    const btnWidth = Math.min(200, Math.floor(W * 0.4));
    const arrowWidth = isMobile ? 60 : 80; // Match arrow button width
    const arrowGap = 15;

    // Position all START buttons (selected at center, others off-screen)
    if (this.startButtons) {
      this.startButtons.forEach((btn, i) => {
        if (i === this.selected) {
          btn.setPosition(cx, btnY);
        } else {
          btn.setPosition(-10000, -10000); // Move off-screen
        }
      });
    }

    // Position and show/hide arrow buttons based on selection
    const isFirstCard = (this.selected === 0);
    const isLastCard = (this.selected === this.cards.length - 1);

    // Left arrow
    if (this.leftArrow) {
      const leftX = cx - btnWidth/2 - arrowWidth/2 - arrowGap;
      this.leftArrow.setPosition(leftX, btnY);

      if (isFirstCard) {
        this.leftArrow.setAlpha(0);
        if (this.leftArrow._bg) this.leftArrow._bg.disableInteractive();
      } else {
        this.leftArrow.setAlpha(1);
        if (this.leftArrow._bg) this.leftArrow._bg.setInteractive({ cursor: 'pointer' });
      }
    }

    // Right arrow
    if (this.rightArrow) {
      const rightX = cx + btnWidth/2 + arrowWidth/2 + arrowGap;
      this.rightArrow.setPosition(rightX, btnY);

      if (isLastCard) {
        this.rightArrow.setAlpha(0);
        if (this.rightArrow._bg) this.rightArrow._bg.disableInteractive();
      } else {
        this.rightArrow.setAlpha(1);
        if (this.rightArrow._bg) this.rightArrow._bg.setInteractive({ cursor: 'pointer' });
      }
    }
  }

  setSelected(idx){
    this.selected = clamp(idx, 0, this.cards.length - 1);
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('lastMode', String(this.selected)); } catch {}
    this.layoutCards(0, true);
  }
  selectNext(){ this.setSelected(this.selected + 1); }
  selectPrev(){ this.setSelected(this.selected - 1); }

  launchCard(card){
    const cam = this.cameras.main;
    // Prevent multiple launches - check if camera is already fading
    if (cam.fadeEffect && cam.fadeEffect.isRunning) {
      return; // Already launching, ignore
    }

    const k = card.modeKey;

    if (k === 'learn'){
      // Fade out street sounds
      this.fadeOutStreetSounds();
      // Launch tutorial - start music immediately
      try {
        const audio = AudioManager.get(this);
        audio.ensureUnlocked(this);
        audio.playMusic('bg_learn', { volume: 0.3, loop: true, fade: 0 });
        audio.setMusicFilterCutoff(600, 0); // Start muffled (adaptive music)
      } catch {}
      cam.fadeOut(250, 0,0,0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, ()=>{
        trackNavigation('tutorial');
        this.scene.transition({ target: 'TUTORIAL_MINI', duration: 250, moveBelow: true });
      });
    } else if (k === 'runner'){
      // Fade out street sounds
      this.fadeOutStreetSounds();
      // Run the Block - start music immediately
      try {
        const audio = AudioManager.get(this);
        audio.ensureUnlocked(this);
        audio.playMusic('bg_main', { volume: 0.2, loop: true, fade: 0 });
        audio.setMusicFilterCutoff(600, 0); // Start muffled (adaptive music)
      } catch {}
      cam.fadeOut(250, 0,0,0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, ()=>{
        trackNavigation('runner_mode');
        this.scene.transition({
          target: 'RUNNER',
          duration: 250,
          moveBelow: true,
          data: { mode: 'pve' }
        });
      });
    } else if (k === 'plug'){
      // Fade out street sounds
      this.fadeOutStreetSounds();
      // Defend the Stash - start music immediately
      try {
        const audio = AudioManager.get(this);
        audio.ensureUnlocked(this);
        audio.playMusic('bg_plug', { volume: 0.28, loop: true, fade: 0 });
        audio.setMusicFilterCutoff(600, 0); // Start muffled (adaptive music)
      } catch {}
      cam.fadeOut(250, 0,0,0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, ()=>{
        trackNavigation('plug_mode');
        this.scene.transition({
          target: 'PLUG',
          duration: 250,
          moveBelow: true,
          data: { mode: 'pve' }
        });
      });
    } else if (k === 'leaderboard'){
      // Launch leaderboard - keep street ambience playing (no music in leaderboard)
      // Street sounds continue playing for atmosphere
      cam.fadeOut(250, 0,0,0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, ()=>{
        trackNavigation('leaderboard');
        this.scene.transition({ target: 'LEADERBOARD', duration: 250, moveBelow: true });
      });
    } else if (k === 'pvp') {
      // Coming soon - keep street sounds playing
      console.info('[Menu] Coming soon:', k);
      this.toast('Coming soon');
    } else {
      // Coming soon (daily, etc.)
      console.info('[Menu] Coming soon:', k);
      this.toast('Coming soon');
    }
  }

  fadeOutStreetSounds(){
    // Immediately stop both street sounds (more reliable than fade during scene transition)
    if (this.streetAmbience) {
      try {
        this.streetAmbience.stop();
        this.streetAmbience.destroy();
        this.streetAmbience = null;
      } catch {}
    }
    if (this.carsPass) {
      try {
        this.carsPass.stop();
        this.carsPass.destroy();
        this.carsPass = null;
      } catch {}
    }
  }

  // MENUSCENE (rexUI): toast helper using rexUI
  toast(msg){
    // Destroy any existing toast to prevent stacking
    if (this._activeToast) {
      try {
        this._activeToast.destroy();
      } catch {}
    }

    const toast = this.rexUI.add.toast({
      x: this.scale.width/2,
      y: this.scale.height*0.88,
      background: this.rexUI.add.roundRectangle(0,0,0,0,8, PALETTE.panel, 0.92).setStrokeStyle(2, PALETTE.stroke),
      text: this.add.text(0,0,msg,{ color: PALETTE.title, fontSize: Math.max(14, Math.floor(this.scale.height*0.028))+'px' }),
      space: { left: 12, right: 12, top: 8, bottom: 8 },
      duration: { in: 200, hold: 1600, out: 200 } // Total ~2 seconds
    });

    this._activeToast = toast;
    toast.show();

    // Auto-cleanup after animation completes
    this.time.delayedCall(2000, () => {
      if (this._activeToast === toast) {
        this._activeToast = null;
      }
    });
  }

  showDesktopNotice(){
    // Only show for desktop users (non-touch devices)
    const isMobile = this.sys.game.device.input.touch;
    if (isMobile) return;

    // Check if user has already seen the notice
    try {
      const hasSeenNotice = localStorage.getItem('pr_desktop_notice_seen');
      if (hasSeenNotice) return;
    } catch {}

    // Show notice after a short delay so it doesn't interfere with menu load
    this.time.delayedCall(1500, () => {
      // Create a more prominent notice banner at the bottom
      const W = this.scale.width;
      const H = this.scale.height;
      const bannerHeight = 50;

      const banner = this.add.container(W/2, H - bannerHeight/2).setDepth(100);

      // Background
      const bg = this.add.rectangle(0, 0, W, bannerHeight, 0x1a2038, 0.95)
        .setStrokeStyle(2, 0x2f3650, 1, 0);

      // Icon
      const icon = this.add.text(-W/2 + 20, 0, '📱', { fontSize: '24px' }).setOrigin(0, 0.5);

      // Message
      const message = this.add.text(-W/2 + 60, 0,
        'Plug Run is optimized for mobile. For the best experience, play on your phone!',
        {
          color: '#cbd1ff',
          fontSize: '14px',
          wordWrap: { width: W - 180 }
        }
      ).setOrigin(0, 0.5);

      // Dismiss button
      const dismissBtn = this.add.rectangle(W/2 - 50, 0, 80, 32, 0x2a1a38, 1)
        .setStrokeStyle(1, 0xfbbf24)
        .setInteractive({ useHandCursor: true });

      const dismissText = this.add.text(W/2 - 50, 0, 'Got it', {
        color: '#fbbf24',
        fontSize: '14px'
      }).setOrigin(0.5);

      banner.add([bg, icon, message, dismissBtn, dismissText]);

      // Slide in from bottom
      banner.y = H + bannerHeight;
      this.tweens.add({
        targets: banner,
        y: H - bannerHeight/2,
        duration: 400,
        ease: 'Cubic.easeOut'
      });

      // Dismiss functionality
      const dismiss = () => {
        // Mark as seen
        try {
          localStorage.setItem('pr_desktop_notice_seen', 'true');
        } catch {}

        // Slide out
        this.tweens.add({
          targets: banner,
          y: H + bannerHeight,
          duration: 300,
          ease: 'Cubic.easeIn',
          onComplete: () => banner.destroy()
        });
      };

      dismissBtn.on('pointerdown', dismiss);

      // Auto-dismiss after 8 seconds
      this.time.delayedCall(8000, dismiss);
    });
  }

  openSettings(){
    const W = this.scale.width, H = this.scale.height;
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const panelW = Math.min(360, W - 40);
    const panelH = 170; // Taller to fit both toggles

    const veil = this.add.rectangle(cx, cy, W, H, 0x000000, 0.65).setDepth(50).setInteractive();
    const panel = this.add.rectangle(cx, cy, panelW, panelH, PALETTE.panel, 0.96).setDepth(51).setStrokeStyle(2, PALETTE.stroke);
    const title = this.add.text(cx, cy - panelH/2 + 22, 'Settings', { color: PALETTE.title, fontSize: '18px' }).setOrigin(0.5).setDepth(52);

    const btnW = 84, btnH = 28;

    // Music toggle (background music only)
    const musicLabel = this.add.text(cx - panelW/2 + 16, cy - 10, 'Music', { color: PALETTE.sub, fontSize:'14px' }).setOrigin(0,0.5).setDepth(52);
    const musicBg = this.add.rectangle(cx + panelW/2 - btnW/2 - 16, cy - 10, btnW, btnH, 0x1a2038, 1)
      .setStrokeStyle(1, PALETTE.stroke)
      .setDepth(52)
      .setInteractive({ useHandCursor: true });
    const audio = AudioManager.get(this);
    let musicOn = !audio.isMusicMuted();
    const musicTxt = this.add.text(musicBg.x, musicBg.y, musicOn ? 'ON' : 'OFF', { color: musicOn ? '#86efac' : '#cbd1ff', fontSize:'14px' }).setOrigin(0.5).setDepth(53);
    const applyMusic = (next) => {
      musicOn = next; musicTxt.setText(musicOn ? 'ON' : 'OFF').setColor(musicOn ? '#86efac' : '#cbd1ff');
      audio.setMusicMute(!musicOn);
      // Control street ambience and cars volume based on music setting
      if (this.streetAmbience) {
        this.streetAmbience.setVolume(musicOn ? 0.15 : 0);
      }
      if (this.carsPass) {
        this.carsPass.setVolume(musicOn ? 0.25 : 0);
      }
      this.toast('Music ' + (musicOn ? 'ON' : 'OFF'));
    };
    musicBg.on('pointerdown', ()=> applyMusic(!musicOn));

    // Sounds toggle (game sound effects)
    const soundsLabel = this.add.text(cx - panelW/2 + 16, cy + 30, 'Sounds', { color: PALETTE.sub, fontSize:'14px' }).setOrigin(0,0.5).setDepth(52);
    const soundsBg = this.add.rectangle(cx + panelW/2 - btnW/2 - 16, cy + 30, btnW, btnH, 0x1a2038, 1)
      .setStrokeStyle(1, PALETTE.stroke)
      .setDepth(52)
      .setInteractive({ useHandCursor: true });

    // Check localStorage for saved preference
    let soundsOn = true;
    try {
      const saved = localStorage.getItem('soundsMuted');
      if (saved !== null) {
        soundsOn = saved === 'false';
      }
    } catch {}

    const soundsTxt = this.add.text(soundsBg.x, soundsBg.y, soundsOn ? 'ON' : 'OFF', { color: soundsOn ? '#86efac' : '#cbd1ff', fontSize:'14px' }).setOrigin(0.5).setDepth(53);
    const applySounds = (next) => {
      soundsOn = next;
      soundsTxt.setText(soundsOn ? 'ON' : 'OFF').setColor(soundsOn ? '#86efac' : '#cbd1ff');

      // Mute/unmute all game sounds (not music)
      this.sound.sounds.forEach(sound => {
        // Only mute SFX, not music
        if (sound.key !== 'bg_main' && sound.key !== 'bg_plug' && sound.key !== 'bg_learn' &&
            sound.key !== 'street_ambience' && sound.key !== 'cars_pass') {
          sound.setMute(!soundsOn);
        }
      });

      // Save preference
      try {
        localStorage.setItem('soundsMuted', String(!soundsOn));
      } catch {}

      this.toast('Sounds ' + (soundsOn ? 'ON' : 'OFF'));
    };

    // Apply current setting on open
    applySounds(soundsOn);

    soundsBg.on('pointerdown', ()=> applySounds(!soundsOn));

    // Close button
    const closeBg = this.add.rectangle(cx, cy + panelH/2 - 22, 92, 28, 0x1a2038, 1).setStrokeStyle(1, PALETTE.stroke).setDepth(52).setInteractive({ useHandCursor:true });
    const closeTx = this.add.text(closeBg.x, closeBg.y, 'Close', { color:'#cbd1ff' }).setOrigin(0.5).setDepth(53);
    const destroyAll = ()=> { [veil, panel, title, musicLabel, musicBg, musicTxt, soundsLabel, soundsBg, soundsTxt, closeBg, closeTx].forEach(o=>o?.destroy()); };
    closeBg.on('pointerdown', destroyAll);
    veil.on('pointerdown', destroyAll);
  }

  // Pre-game tips modal (disabled for now - may re-enable with different UX later)
  /*
  showPreGameModal(modeKey, onStart) {
    const W = this.scale.width, H = this.scale.height;
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const panelW = Math.min(380, W - 40);
    const panelH = Math.min(280, H - 80);

    // Tips for each mode
    const tips = {
      runner: [
        'Use corners to break line of sight and lose the plug',
        'Power-ups spawn randomly - grab them before time runs out',
        'Speed boost is great for quick escapes in tight spots',
        'The AI gets smarter each round - stay sharp',
        'Collect all 5 STASH to complete the round',
        'Shield protects you from one hit - use it wisely',
        'Movement is key - keep moving to avoid getting cornered'
      ],
      plug: [
        'Predict runner movement - cut them off at corners',
        'Don\'t chase blindly - use strategy and positioning',
        'The AI runner gets faster each round',
        'Watch for power-up pickups - they change the game',
        'Corner the runner by controlling key pathways',
        'One shot is all you need - aim carefully',
        'Use walls to funnel the runner into your line of fire'
      ]
    };

    // Select random tip
    const modeTips = tips[modeKey] || [];
    const randomTip = modeTips[Math.floor(Math.random() * modeTips.length)];

    const veil = this.add.rectangle(cx, cy, W, H, 0x000000, 0.7).setDepth(60).setInteractive();
    const panel = this.add.rectangle(cx, cy, panelW, panelH, PALETTE.panel, 0.98).setDepth(61).setStrokeStyle(3, PALETTE.stroke);

    // Title
    const modeNames = {
      runner: 'RUN THE BLOCK',
      plug: 'DEFEND THE BLOCK'
    };
    const title = this.add.text(cx, cy - panelH/2 + 30, modeNames[modeKey], {
      fontFamily: '"Highway Gothic", "Arial Narrow", sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(62);

    // Tip icon
    const tipIcon = this.add.text(cx, cy - 50, '💡', {
      fontSize: '32px'
    }).setOrigin(0.5).setDepth(62);

    // Tip label
    const tipLabel = this.add.text(cx, cy - 10, 'PRO TIP', {
      fontSize: '12px',
      color: '#fbbf24',
      fontStyle: 'bold',
      letterSpacing: 1
    }).setOrigin(0.5).setDepth(62);

    // Tip text
    const tipText = this.add.text(cx, cy + 20, randomTip, {
      fontSize: '14px',
      color: '#cbd1ff',
      align: 'center',
      wordWrap: { width: panelW - 60 }
    }).setOrigin(0.5).setDepth(62);

    // START ROUND button
    const btnW = 180, btnH = 44;
    const startBg = this.add.rectangle(cx, cy + panelH/2 - 35, btnW, btnH, 0xfbbf24, 1)
      .setStrokeStyle(3, 0xfde047)
      .setDepth(62)
      .setInteractive({ cursor: 'pointer' });

    const startText = this.add.text(cx, cy + panelH/2 - 35, 'START ROUND', {
      fontSize: '16px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(63);

    // Hover effect
    startBg.on('pointerover', () => {
      startBg.setFillStyle(0xfde047, 1);
    });
    startBg.on('pointerout', () => {
      startBg.setFillStyle(0xfbbf24, 1);
    });

    // Start button action
    const destroyAll = () => {
      [veil, panel, title, tipIcon, tipLabel, tipText, startBg, startText].forEach(o => o?.destroy());
    };

    startBg.on('pointerdown', () => {
      destroyAll();
      if (onStart) onStart();
    });

    // Allow clicking outside to cancel
    veil.on('pointerdown', destroyAll);
  }
  */

  async openProfileModal(){
    const W = this.scale.width, H = this.scale.height;
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const panelW = Math.min(380, W - 40);
    const panelH = Math.min(340, H - 80);

    const veil = this.add.rectangle(cx, cy, W, H, 0x000000, 0.65).setDepth(50).setInteractive();
    const panel = this.add.rectangle(cx, cy, panelW, panelH, PALETTE.panel, 0.96).setDepth(51).setStrokeStyle(2, PALETTE.stroke);

    // Wait for user data to load from Supabase
    await getCurrentUser();
    const username = getUsername();
    const isGuest = isGuestAccount();

    // Title with username
    const title = this.add.text(cx, cy - panelH/2 + 25, username, {
      color: PALETTE.title,
      fontSize: '22px',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(52);

    const baseElements = [veil, panel, title];

    // Guest badge (if guest user)
    if (isGuest) {
      const badge = this.add.rectangle(cx + 100, cy - panelH/2 + 25, 55, 20, 0x6b7280, 0.3)
        .setStrokeStyle(1, 0x9ca3af)
        .setDepth(52);
      const badgeText = this.add.text(cx + 100, cy - panelH/2 + 25, 'GUEST', {
        color: '#9ca3af',
        fontSize: '10px',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(53);
      baseElements.push(badge, badgeText);
    }
    let selectedRole = 'runner'; // Default to runner
    let statsElements = [];

    // Role toggle buttons
    const roleY = cy - panelH/2 + 60;
    const roleW = 90;
    const roleH = 32;
    const gap = 10;

    const runnerBtn = this.add.rectangle(cx - roleW/2 - gap/2, roleY, roleW, roleH, 0x2a1a38, 1)
      .setStrokeStyle(2, 0x60a5fa)
      .setDepth(52)
      .setInteractive({ useHandCursor: true });

    const runnerText = this.add.text(cx - roleW/2 - gap/2, roleY, 'Runner', {
      color: '#93c5fd',
      fontSize: '14px',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(53);

    const plugBtn = this.add.rectangle(cx + roleW/2 + gap/2, roleY, roleW, roleH, 0x1a2038, 1)
      .setStrokeStyle(2, 0x2f3660)
      .setDepth(52)
      .setInteractive({ useHandCursor: true });

    const plugText = this.add.text(cx + roleW/2 + gap/2, roleY, 'Plug', {
      color: '#aab5ff',
      fontSize: '14px'
    }).setOrigin(0.5).setDepth(53);

    baseElements.push(runnerBtn, runnerText, plugBtn, plugText);

    // Function to update stats display
    const updateStats = async (role) => {
      selectedRole = role;

      // Update button visuals
      if (role === 'runner') {
        runnerBtn.setFillStyle(0x2a1a38).setStrokeStyle(2, 0x60a5fa);
        runnerText.setColor('#93c5fd').setFontStyle('bold');
        plugBtn.setFillStyle(0x1a2038).setStrokeStyle(2, 0x2f3660);
        plugText.setColor('#aab5ff').setFontStyle('');
      } else {
        plugBtn.setFillStyle(0x2a1a38).setStrokeStyle(2, 0x60a5fa);
        plugText.setColor('#93c5fd').setFontStyle('bold');
        runnerBtn.setFillStyle(0x1a2038).setStrokeStyle(2, 0x2f3660);
        runnerText.setColor('#aab5ff').setFontStyle('');
      }

      // Clear old stats
      statsElements.forEach(el => el?.destroy());
      statsElements = [];

      // Get stats for selected role (await since these are now async)
      const dailyRank = await getUserRank(role);
      const dailyScore = await getUserScore(role);
      const allTimeRank = await getAllTimeRank(role);
      const allTimeScore = await getAllTimeScore(role);

      let y = cy - panelH/2 + 110;

      // Daily Stats
      const dailyLabel = this.add.text(cx - panelW/2 + 30, y, 'Daily:', {
        color: '#cbd1ff',
        fontSize: '16px',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5).setDepth(52);
      statsElements.push(dailyLabel);

      y += 30;
      if (dailyScore) {
        const stashText = this.add.text(cx - panelW/2 + 40, y, `S: ${dailyScore.stash || 0}`, {
          color: '#86efac',
          fontSize: '15px',
          fontFamily: 'monospace'
        }).setOrigin(0, 0.5).setDepth(52);

        const repValue = dailyScore.rep || 0;
        const repFormatted = repValue % 1 === 0 ? repValue.toString() : repValue.toFixed(2);
        const repText = this.add.text(cx - panelW/2 + 140, y, `REP: ${repFormatted}`, {
          color: '#ffd166',
          fontSize: '15px',
          fontFamily: 'monospace'
        }).setOrigin(0, 0.5).setDepth(52);

        statsElements.push(stashText, repText);

        if (dailyRank) {
          const rankText = this.add.text(cx + panelW/2 - 30, y, `#${dailyRank}`, {
            color: dailyRank <= 3 ? '#fbbf24' : '#cbd1ff',
            fontSize: '15px',
            fontStyle: 'bold'
          }).setOrigin(1, 0.5).setDepth(52);
          statsElements.push(rankText);
        }
      } else {
        const noScore = this.add.text(cx - panelW/2 + 40, y, 'No score yet', {
          color: '#6b7280',
          fontSize: '14px',
          fontStyle: 'italic'
        }).setOrigin(0, 0.5).setDepth(52);
        statsElements.push(noScore);
      }

      y += 50;

      // All-time Stats
      const allTimeLabel = this.add.text(cx - panelW/2 + 30, y, 'All-Time:', {
        color: '#cbd1ff',
        fontSize: '16px',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5).setDepth(52);
      statsElements.push(allTimeLabel);

      y += 30;
      if (allTimeScore) {
        // Format large numbers with K suffix
        const formatLarge = (num) => {
          if (num >= 1000) {
            return (num / 1000).toFixed(2) + 'K';
          }
          return num.toString();
        };

        const stashFormatted = formatLarge(allTimeScore.stash || 0);
        const stashText = this.add.text(cx - panelW/2 + 40, y, `S: ${stashFormatted}`, {
          color: '#86efac',
          fontSize: '15px',
          fontFamily: 'monospace'
        }).setOrigin(0, 0.5).setDepth(52);

        const repValue = allTimeScore.rep || 0;
        const repFormatted = formatLarge(repValue);
        const repText = this.add.text(cx - panelW/2 + 140, y, `REP: ${repFormatted}`, {
          color: '#ffd166',
          fontSize: '15px',
          fontFamily: 'monospace'
        }).setOrigin(0, 0.5).setDepth(52);

        statsElements.push(stashText, repText);

        if (allTimeRank) {
          const rankText = this.add.text(cx + panelW/2 - 30, y, `#${allTimeRank}`, {
            color: allTimeRank <= 3 ? '#fbbf24' : '#cbd1ff',
            fontSize: '15px',
            fontStyle: 'bold'
          }).setOrigin(1, 0.5).setDepth(52);
          statsElements.push(rankText);
        }
      } else {
        const noScore = this.add.text(cx - panelW/2 + 40, y, 'No score yet', {
          color: '#6b7280',
          fontSize: '14px',
          fontStyle: 'italic'
        }).setOrigin(0, 0.5).setDepth(52);
        statsElements.push(noScore);
      }
    };

    // Button handlers
    runnerBtn.on('pointerdown', () => updateStats('runner'));
    plugBtn.on('pointerdown', () => updateStats('plug'));

    // Initialize with runner stats
    updateStats('runner');

    // Auth button (Claim Account or Sign Out)
    const authY = cy + panelH/2 - 70;
    if (isGuest) {
      // Claim Account button
      const claimBg = this.add.rectangle(cx, authY, 150, 34, 0xfbbf24, 1)
        .setStrokeStyle(2, 0xffd700)
        .setDepth(52)
        .setInteractive({ useHandCursor: true });
      const claimTx = this.add.text(cx, authY, 'Claim Account', {
        color: '#000000',
        fontSize: '14px',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(53);
      baseElements.push(claimBg, claimTx);

      claimBg.on('pointerdown', () => {
        destroyAll();
        showClaimAccountModal(this, async () => {
          // On success, update profile chip and reopen modal
          await this.updateProfileChip();
          this.openProfileModal();
        }, () => {
          // On cancel, reopen profile modal
          this.openProfileModal();
        });
      });
    } else {
      // Sign Out button
      const signOutBg = this.add.rectangle(cx, authY, 110, 32, 0xef4444, 0.9)
        .setStrokeStyle(2, 0xfca5a5)
        .setDepth(52)
        .setInteractive({ useHandCursor: true });
      const signOutTx = this.add.text(cx, authY, 'Sign Out', {
        color: '#ffffff',
        fontSize: '14px',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(53);
      baseElements.push(signOutBg, signOutTx);

      signOutBg.on('pointerdown', () => {
        destroyAll();
        showSignOutModal(this, async () => {
          // On confirm, update profile chip to show new guest
          await this.updateProfileChip();
          this.openProfileModal();
        }, () => {
          // On cancel, reopen profile modal
          this.openProfileModal();
        });
      });
    }

    // Close button
    const closeBg = this.add.rectangle(cx, cy + panelH/2 - 30, 92, 28, 0x1a2038, 1)
      .setStrokeStyle(1, PALETTE.stroke)
      .setDepth(52)
      .setInteractive({ useHandCursor:true });
    const closeTx = this.add.text(closeBg.x, closeBg.y, 'Close', { color:'#cbd1ff' }).setOrigin(0.5).setDepth(53);
    baseElements.push(closeBg, closeTx);

    const destroyAll = ()=> {
      baseElements.forEach(o=>o?.destroy());
      statsElements.forEach(o=>o?.destroy());
    };
    closeBg.on('pointerdown', destroyAll);
    veil.on('pointerdown', destroyAll);
  }

  createStatSection(cx, y, label, rank, score, panelW){
    const elements = [];

    // Section label
    const labelText = this.add.text(cx, y, label, {
      color: PALETTE.sub,
      fontSize: '14px',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(52);
    elements.push(labelText);

    // Stats row
    const statY = y + 25;
    if (rank && score) {
      // Rank
      const rankText = this.add.text(cx - 140, statY, `#${rank}`, {
        color: rank <= 3 ? '#fbbf24' : '#cbd1ff',
        fontSize: '15px',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5).setDepth(52);

      // Stash: S prefix
      const stashLabel = this.add.text(cx - 60, statY, 'S', {
        color: '#86efac',
        fontSize: '15px',
        fontStyle: 'bold',
        fontFamily: 'monospace'
      }).setOrigin(0, 0.5).setDepth(52);

      const stashValue = this.add.text(cx - 45, statY, (score.stash || 0).toString(), {
        color: '#86efac',
        fontSize: '15px',
        fontFamily: 'monospace'
      }).setOrigin(0, 0.5).setDepth(52);

      // Rep: R prefix
      const repValue = score.rep || 0;
      const repFormatted = repValue % 1 === 0 ? repValue.toString() : repValue.toFixed(2);

      const repLabel = this.add.text(cx + 40, statY, 'R', {
        color: '#ffd166',
        fontSize: '15px',
        fontStyle: 'bold',
        fontFamily: 'monospace'
      }).setOrigin(0, 0.5).setDepth(52);

      const repText = this.add.text(cx + 55, statY, repFormatted, {
        color: '#ffd166',
        fontSize: '15px',
        fontFamily: 'monospace'
      }).setOrigin(0, 0.5).setDepth(52);

      elements.push(rankText, stashLabel, stashValue, repLabel, repText);
    } else {
      // No score yet
      const noScore = this.add.text(cx, statY, 'No score yet', {
        color: '#6b7280',
        fontSize: '14px',
        fontStyle: 'italic'
      }).setOrigin(0.5).setDepth(52);
      elements.push(noScore);
    }

    return elements;
  }

  update(){
    // Keyboard navigation
    const leftPressed = Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.keys.A);
    const rightPressed = Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.keys.D);
    const actionPressed = Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE);

    if (leftPressed) { this.selectPrev(); }
    if (rightPressed) { this.selectNext(); }
    if (actionPressed) {
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

    // Reposition emblem
    const cardWidth = Math.min(520, Math.floor(W * 0.82));
    const signW = cardWidth;
    const emblemSize = signH * 0.85;
    this.emblem?.setPosition(W/2 - signW/2 + emblemSize/2 + 8, logoY + signH/2);
    this.emblem?.setDisplaySize(emblemSize, emblemSize);

    this.logo?.setPosition(W/2, logoY + signH/2 - logoSize * 0.35);
    this.logoAddress?.setPosition(W/2, logoY + signH/2 + logoSize * 0.45);

    // Bottom elements
    const pad = Math.max(8, Math.floor(Math.min(W,H) * 0.02));

    // Settings button in bottom-right (moved away from corner for easier clicking)
    this.settingsBtn?.setPosition(W - pad - 50, H - pad - 24);

    // Profile chip in bottom-center
    this.profileChip?.setPosition(W / 2, H - pad - 24);

    // Daily bonus button in bottom-left (only if not claimed)
    if (this.dailyBonusBtn) {
      this.dailyBonusBtn.setPosition(pad + 50, H - pad - 24);
    }

    // Refresh layout
    this.layoutCards(0, false);
  }
}
