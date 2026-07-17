// LANDING / MENUSCENE
// LANDING / MENUSCENE (rexUI)
import Phaser from 'phaser';
import AudioManager from '../audio/AudioManager.js';
import { getUsername, getCurrentUser, getCurrentUserSync, isGuestAccount, getUserID, ensureProvisionedIdentity, getRecoveryCode, hasProvisionedIdentity, restoreFromRecoveryCode } from '../utils/userManager.js';
import { getUserRank, getUserScore, getAllTimeRank, getAllTimeScore, getTopScores, getAllTimeTopScores, getLeaderboard, getAllTimeLeaderboard, formatNumber } from '../utils/leaderboardManager.js';
import { getSessionState } from '../utils/routeProgress.js';
import { getCurrentRouteID } from '../utils/seededRandom.js';
import { trackNavigation } from '../utils/analytics.js';
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
    const W = this.scale.width, H = this.scale.height;
    // Night street background: asphalt road, curbs, scrolling lane dashes
    this.drawStreetBackground();

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


    // Main title
    this.logo = this.add.text(W/2, logoY + signH/2, 'PLUG RUN', {
      fontFamily: '"Highway Gothic", "Arial Narrow", "Helvetica Narrow", sans-serif',
      fontSize: logoSize + 'px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5).setDepth(5);


    this.signBg = signBg;
    this.signShadow = signShadow;

    // Cards data - only show the two main game modes
    const modes = [
      { key:'runner', title:'Run the Block',      sub:'Grab the stash, escape before the Plug catches you.', showTimer: false },
      { key:'plug',   title:'Defend the Block',   sub:'Stop the Runner before they get away.', showTimer: false }
    ];

    // Carousel root container to keep z-order tidy
    this.carousel = this.add.container(0, 0).setDepth(3);

    modes.forEach((m, idx)=>{
      const card = this.makeCard(m.title, m.sub, m.key, m.showTimer); // rexUI-based card with START button inside
      card.modeKey = m.key;
      card.index = idx;
      this.carousel.add(card);
      this.cards.push(card);
    });

    // Create navigation arrows (hidden in new layout)
    this.leftArrow = this.makeArrowButton('left');
    this.rightArrow = this.makeArrowButton('right');

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,ENTER,SPACE,ESC');

    // Bottom-right settings button
    this.settingsBtn = this.makeIconButton('⚙', () => this.openSettings());

    // Leaderboard button for mobile (trophy icon - only visible on mobile)
    this.leaderboardBtn = this.makeIconButton('🏆', () => this.scene.start('LEADERBOARD'));

    // Help button — explains the premise/leaderboard/replays for newcomers
    this.helpBtn = this.makeIconButton('?', () => this.openHelp());

    // Tutorial button (large yellow button like in mockup)
    this.tutorialBtn = this.makeTutorialButton();

    // User profile chip (clickable to show user's leaderboard position)
    this.profileChip = this.makeUserProfileChip();

    // Countdown ticker chip (single shared timer under the title sign)
    this.tickerChip = this.makeTickerChip();

    // Bottom dock bar (sidewalk strip anchoring chip + icon buttons)
    this.dockBg = this.add.rectangle(0, 0, 10, 10, 0x1a1e28, 0.95).setDepth(5);
    this.dockEdge = this.add.rectangle(0, 0, 10, 2, 0x343a4a, 1).setDepth(5);

    // Daily bonus button (styled like REP reward, hidden if already claimed today)
    this.dailyBonusBtn = this.makeDailyBonusButton();

    this.reposition();
    // Rebuild the whole menu on real viewport changes (desktop zoom,
    // window drags, rotation). reposition() alone only MOVES elements —
    // their sizes were computed at create() and go stale under zoom.
    // Managed handler: off-before-on + shutdown cleanup so restarts
    // don't stack listeners on the global scale manager.
    if (this._onResizeCb) this.scale.off('resize', this._onResizeCb);
    this._lastW = this.scale.gameSize.width;
    this._lastH = this.scale.gameSize.height;
    this._onResizeCb = (gameSize) => {
      if (Math.abs(gameSize.width - this._lastW) < 40 && Math.abs(gameSize.height - this._lastH) < 40) {
        this.reposition(); // minor jitter: cheap move-only pass
        return;
      }
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this.scene.restart(), 250);
    };
    this.scale.on('resize', this._onResizeCb);
    this.events.once('shutdown', () => {
      clearTimeout(this._resizeTimer);
      if (this._onResizeCb) this.scale.off('resize', this._onResizeCb);
      this._onResizeCb = null;
    });

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

    // Update countdown ticker every second
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.tickerChip?._update?.();
      }
    });
  }

  // Night street background: full-canvas asphalt with curbs, center
  // dashes, and speckle noise. Rebuilt on resize.
  drawStreetBackground(){
    const W = this.scale.width, H = this.scale.height;
    if (this._streetBg) { this._streetBg.destroy(true); this._streetBg = null; }
    const c = this.add.container(0, 0).setDepth(0);

    // Off-road base + asphalt strip
    c.add(this.add.rectangle(W/2, H/2, W, H, 0x0d1016, 1));
    const roadW = Math.min(600, Math.floor(W * 0.96));
    c.add(this.add.rectangle(W/2, H/2, roadW, H, 0x191c22, 1));

    // Curbs
    const curbX = roadW/2 - 2;
    c.add(this.add.rectangle(W/2 - curbX, H/2, 3, H, 0x262a33, 1));
    c.add(this.add.rectangle(W/2 + curbX, H/2, 3, H, 0x262a33, 1));

    // Asphalt speckle noise
    const speck = this.add.graphics();
    speck.fillStyle(0x0d0f13, 0.55);
    for (let i = 0; i < 70; i++){
      const sx = W/2 - roadW/2 + 6 + Math.random() * (roadW - 12);
      const sy = Math.random() * H;
      speck.fillRect(sx, sy, 2, 2);
    }
    c.add(speck);

    this._streetBg = c;
  }

  // LED-style countdown ticker chip under the title sign
  makeTickerChip(){
    const c = this.add.container(0, 0).setDepth(6);
    const h = 24;
    const bg = this.rexUI.add.roundRectangle(0, 0, 210, h, h/2, 0x0d0f13, 1)
      .setStrokeStyle(1, 0x2e3442);
    const t = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#7ee0a3',
      letterSpacing: 1
    }).setOrigin(0.5);
    c.add([bg, t]);
    c._bg = bg;
    c._text = t;
    c._update = () => {
      if (!t.active) return;
      t.setText(`NEW BLOCK IN ${this.getTimeUntilReset()}`);
      const w = Math.max(190, t.width + 28);
      bg.setSize(w, h);
    };
    c._update();
    return c;
  }

  // Read the current user's local scores (works offline via localStorage)
  getLocalStats(role){
    try {
      const uid = getUserID();
      const daily = getLeaderboard(getCurrentRouteID(), role).find(e => e.userId === uid) || null;
      const alltime = getAllTimeLeaderboard(role).find(e => e.userId === uid) || null;
      return { daily, alltime };
    } catch {
      return { daily: null, alltime: null };
    }
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
    const cw = Math.min(480, Math.floor(W * 0.82));

    // Intelligently scale cards based on available vertical space
    // Mobile/smaller screens: 34% | Desktop/larger screens: up to 38%
    const baseHeight = H * 0.34;
    const maxHeight = H * 0.38;
    const ch = H > 900 ? Math.min(300, maxHeight) : Math.min(265, baseHeight);

    // Create container first
    const cont = this.add.container(0, 0).setSize(cw, ch).setDepth(3);
    // Cards are not interactive - only buttons control navigation

    // Dark panel body
    const bg = this.add.rectangle(0, 0, cw, ch, 0x10131a, 0.92);
    bg.setStrokeStyle(1, 0x2e3442, 1);
    cont.add(bg);

    // Add animated sprite visuals (single line of sprites)
    this.addCardVisuals(cont, modeKey, cw, ch);

    // Title at TOP (LA street sign font with blue background bar)
    const titleText = String(title).toUpperCase();
    const titleSize = Math.max(12, Math.floor(ch * 0.12)); // Proportional to smaller card height

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

    // Mode-colored street sign header (green = runner, red = plug)
    const SIGN_COLORS = { runner: 0x1a7a3c, plug: 0xa32d2d };
    const signColor = SIGN_COLORS[modeKey] ?? 0x0047AB;

    // Single-line bar: street name left, address right
    const titleBgHeight = Math.floor(titleSize * 1.7);
    const titleBg = this.add.rectangle(0, -ch * 0.5 + titleBgHeight/2, cw, titleBgHeight, signColor, 1)
      .setStrokeStyle(3, 0xffffff)
      .setOrigin(0.5, 0.5);

    const titleObj = this.add.text(0, -ch * 0.5 + titleBgHeight/2, titleText, {
      color: '#ffffff',
      fontFamily: '"Highway Gothic", "Arial Narrow", "Helvetica Narrow", sans-serif',
      fontStyle: 'bold',
      fontSize: titleSize + 'px',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5);


    cont.add(titleBg);
    cont.add(titleObj);
    
    // SCORE TICKER: horizontal strip under the street sign, ESPN
    // bottom-line style — three stat columns with dividers. ALWAYS shown
    // (placeholders when empty); the old stats-or-tagline branch keyed on
    // device-local save data, so different phones showed different menus.
    let timerTxt = null;
    {
      const stats = this.getLocalStats(modeKey);
      const tickerH = 30;
      const tickerY = -ch * 0.5 + titleBgHeight + tickerH / 2 + 2;

      const backing = this.add.rectangle(0, tickerY, cw, tickerH, 0x0a0d13, 0.8);
      backing.setStrokeStyle(1, 0x2e3442);
      cont.add(backing);

      const cols = [
        ["TODAY'S BEST", stats.daily ? formatNumber(stats.daily.stash ?? 0) : '—', '#f0f2f7'],
        ['BEST ROUND',   String(stats.daily?.round ?? stats.alltime?.round ?? '—'), '#f0f2f7'],
        ['YOUR RANK',    '—', '#8a93a8']
      ];
      const colW = cw / cols.length;
      cols.forEach(([label, value, valColor], i) => {
        const cx2 = -cw / 2 + colW * (i + 0.5);
        cont.add(this.add.text(cx2, tickerY - 7, label, {
          fontFamily: 'monospace', fontSize: '9px', color: '#8a93a8', letterSpacing: 1
        }).setOrigin(0.5));
        cont.add(this.add.text(cx2, tickerY + 7, value, {
          fontFamily: 'monospace', fontSize: '13px', color: valColor, fontStyle: 'bold'
        }).setOrigin(0.5));
        if (i > 0) {
          cont.add(this.add.rectangle(-cw / 2 + colW * i, tickerY, 1, tickerH - 10, 0x2e3442, 1));
        }
      });
    }

    // One-line tagline just under the stats strip — tells a first-time
    // visitor what this mode actually is before they commit a tap.
    if (sub) {
      const tagY = -ch * 0.5 + titleBgHeight + 38;
      cont.add(this.add.text(0, tagY, sub, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#aab3c8',
        align: 'center',
        wordWrap: { width: cw - 28 }
      }).setOrigin(0.5, 0));
    }

    // START button at BOTTOM (near full width like the mockup)
    const btnWidth = Math.min(400, Math.floor(cw * 0.88));
    const btnHeight = Math.max(38, Math.floor(ch * 0.18));
    const btnY = (ch / 2) - (btnHeight / 2) - 8; // Position at bottom edge with small padding

    const startBg = this.rexUI.add.roundRectangle(0, btnY, btnWidth, btnHeight, 6, 0xfbbf24, 1)
      .setStrokeStyle(3, 0xf59e0b)
      .setInteractive({ cursor: 'pointer' });

    // Set button text based on mode
    let buttonText = 'START';
    if (modeKey === 'runner' || modeKey === 'plug') {
      const base = modeKey === 'runner' ? 'PLAY AS RUNNER' : 'PLAY AS PLUG';
      let sess = null;
      try { sess = getSessionState(modeKey); } catch {}
      buttonText = sess && sess.pveRound > 1 ? `${base} \u2014 ROUND ${sess.pveRound}` : base;
    }

    const startText = this.add.text(0, btnY, buttonText, {
      fontFamily: '"Highway Gothic", "Arial Narrow", sans-serif',
      fontSize: Math.max(16, Math.floor(btnHeight * 0.42)) + 'px',
      color: '#1e293b',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    cont.add(startBg);
    cont.add(startText);

    // Store references
    cont._bg = bg;
    cont._startBg = startBg;
    cont._startText = startText;
    cont.modeKey = modeKey; // Store mode key for click handling

    // Handle START button click
    startBg.on('pointerup', () => {
      this.launchCard(cont);
    });

    // Hover effects
    startBg.on('pointerover', () => {
      startBg.setFillStyle(0xfcd34d); // Lighter yellow
      startBg.setStrokeStyle(3, 0xfbbf24);
    });
    startBg.on('pointerout', () => {
      startBg.setFillStyle(0xfbbf24); // Original yellow
      startBg.setStrokeStyle(3, 0xf59e0b);
    });

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
      const runner = this.add.sprite(-cw * 0.42, ch * 0.05, 'td_runner')
        .setScale(scale)
        .setAlpha(alpha);

      // Getaway car sprite - flipped to face left (spread out more to the right)
      const car = this.add.sprite(cw * 0.38, ch * 0.05, 'car_blue')
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
        // 1. Runner runs to car (adjust target to match new car position)
        this.tweens.add({
          targets: runner,
          x: cw * 0.32,
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
                    runner.setPosition(-cw * 0.42, ch * 0.05).setAlpha(alpha).setVisible(true);
                    car.setPosition(cw * 0.38, ch * 0.05).setAlpha(alpha);
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
    const H = this.scale.height;
    // Clamp: uncapped height-scaling made these balloon on desktop
    const r = Math.min(21, Math.max(18, Math.floor(H * 0.024)));
    const bg = this.rexUI.add.roundRectangle(0, 0, r*2, r*2, r, PALETTE.panel, 0.92)
      .setStrokeStyle(2, PALETTE.stroke)
      .setInteractive({ cursor: 'pointer' });
    const t = this.add.text(0, 0, label, { fontSize: Math.max(12, Math.floor(r*0.95)) + 'px', color: PALETTE.title }).setOrigin(0.5);
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

  makeTutorialButton(){
    // Ghost/secondary style — the two PLAY buttons are the stars
    const W = this.scale.width;
    const btnWidth = 170;
    const btnHeight = Math.max(32, Math.floor(this.scale.height * 0.04));

    const bg = this.rexUI.add.roundRectangle(0, 0, btnWidth, btnHeight, 6, 0x10131a, 0.6)
      .setStrokeStyle(1, 0x3a4155)
      .setInteractive({ cursor: 'pointer' });

    const t = this.add.text(0, 0, 'PLAY TUTORIAL', {
      fontFamily: 'monospace',
      fontSize: Math.max(12, Math.floor(btnHeight * 0.38)) + 'px',
      color: '#aab3c8',
      letterSpacing: 1
    }).setOrigin(0.5);

    const btn = this.add.container(0, 0, [bg, t]).setSize(btnWidth, btnHeight).setDepth(6);

    // Store references for hover effects
    btn._bg = bg;
    btn._text = t;

    // Launch tutorial on click
    bg.on('pointerup', () => {
      // Fade out street sounds
      this.fadeOutStreetSounds();

      // Start tutorial music
      try {
        const audio = AudioManager.get(this);
        audio.ensureUnlocked(this);
        audio.playMusic('bg_learn', { volume: 0.3, loop: true, fade: 0 });
        audio.setMusicFilterCutoff(600, 0); // Start muffled (adaptive music)
      } catch {}

      // Fade out and transition to tutorial
      const cam = this.cameras.main;
      cam.fadeOut(250, 0, 0, 0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.transition({ target: 'TUTORIAL_MINI', duration: 250, moveBelow: true });
      });
    });

    // Hover effects
    bg.on('pointerover', () => {
      bg.setStrokeStyle(1, 0x60a5fa);
      t.setColor('#dce6fb');
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(1, 0x3a4155);
      t.setColor('#aab3c8');
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
    const w = Math.min(220, Math.max(160, Math.floor(this.scale.width * 0.35)));
    const h = Math.min(36, Math.max(32, Math.floor(this.scale.height * 0.042)));
    c._w = w;

    // Attention mode: unclaimed recovery code → amber chip + trailing "!"
    const unseen = (() => { try { return localStorage.getItem('pr_recovery_unseen') === 'true'; } catch { return false; } })();
    const fillColor   = unseen ? 0x78500a : 0x1e3a8a;
    const strokeColor = unseen ? 0xfbbf24 : 0x3b82f6;
    const strokeHover = unseen ? 0xfde68a : 0x60a5fa;
    const textColor   = unseen ? '#fde68a' : '#cbd1ff';

    const bg = this.rexUI.add.roundRectangle(0, 0, w, h, h/2, fillColor, 0.85)
      .setStrokeStyle(2, strokeColor)
      .setInteractive({ cursor: 'pointer' });

    const icon = this.add.text(-w/2 + h/2, 0, '👤', { fontSize: Math.floor(h * 0.6) + 'px' }).setOrigin(0.5);

    // Username centered; if unseen, add a subtle "!" indicator to the right
    const nameOffset = unseen ? -6 : 0;
    const t = this.add.text(h/4 + nameOffset, 0, username, {
      color: textColor,
      fontSize: Math.max(12, Math.floor(h*0.5)) + 'px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    c.add([bg, icon, t]);

    if (unseen) {
      const bang = this.add.text(w/2 - h/2 + 2, 0, '!', {
        color: '#fbbf24',
        fontSize: Math.max(14, Math.floor(h*0.65)) + 'px',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      c.add(bang);

      // Gentle pulse on the "!" so it reads as "hey, look at this"
      this.tweens.add({
        targets: bang,
        alpha: { from: 1, to: 0.35 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inout'
      });
    }

    bg.on('pointerup', () => this.openProfileModal());
    bg.on('pointerover', () => bg.setStrokeStyle(2, strokeHover));
    bg.on('pointerout',  () => bg.setStrokeStyle(2, strokeColor));

    return c;
  }

  async initializeUserData() {
    const cachedUsername = getUsername();
    await getCurrentUser();

    // Provision server-issued identity if we haven't yet (idempotent —
    // short-circuits when already done). New CamelCase username lands here.
    const result = await ensureProvisionedIdentity();
    const currentUsername = getUsername();

    if (cachedUsername !== currentUsername) {
      this.updateProfileChipSync();
      // First-time provisioning: gentle bottom banner nudging the user
      // to save the recovery code. Dismissible, not blocking.
      if (result && !result.existed) {
        try { localStorage.setItem('pr_recovery_unseen', 'true'); } catch {}
        this.updateProfileChipSync();
      }
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
    // Alternate between daily and all-time leaderboards
    let showingDaily = false;
    const leaderboardCallback = async () => {
      const sidebars = getExistingSidebars();
      if (!sidebars.right) return;

      try {
        // Use the globally stored current mode
        const currentMode = getCurrentMode();

        // Alternate between daily and all-time every 15 seconds
        const topScores = showingDaily
          ? await getTopScores(currentMode, 10)
          : await getAllTimeTopScores(currentMode, 10);

        const leaderboardData = topScores.map(entry => ({
          userId: entry.userId,
          name: entry.username,
          score: entry.stash || 0
        }));

        // Get current user ID for highlighting
        const currentUser = getCurrentUserSync();
        const currentUserId = currentUser?.id;

        updateLeaderboard(sidebars.right, leaderboardData, showingDaily ? 'daily' : 'alltime', currentUserId);

        // Toggle for next update
        showingDaily = !showingDaily;
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
      // Fetch top 10 scores for the current mode (start with all-time)
      const currentMode = getCurrentMode();
      const topScores = await getAllTimeTopScores(currentMode, 10);

      // Transform data to match updateLeaderboard format
      const leaderboardData = topScores.map(entry => ({
        userId: entry.userId,
        name: entry.username,
        score: entry.stash || 0
      }));

      // Get current user ID for highlighting
      const currentUser = getCurrentUserSync();
      const currentUserId = currentUser?.id;

      updateLeaderboard(sidebars.right, leaderboardData, 'alltime', currentUserId);
    } catch (err) {
      console.warn('[MenuScene] Failed to update sidebar leaderboard:', err);
    }
  }

  async refreshSidebarStats() {
    // Update sidebar with TODAY's stats (from current route)
    try {
      // Fetch daily scores for both roles
      const [runnerScore, plugScore] = await Promise.all([
        getUserScore('runner'),
        getUserScore('plug')
      ]);

      // Calculate today's totals
      const bestRunner = runnerScore?.round || 0;
      const bestPlug = plugScore?.round || 0;

      // Rounds Today = total rounds played across both modes
      const dailyRounds = bestRunner + bestPlug;

      // STASH Today = highest runner round (you earn 1 stash per runner round)
      const dailyStash = bestRunner;

      // REP Today = total rep from both modes
      const dailyRep = (runnerScore?.rep || 0) + (plugScore?.rep || 0);

      updateStats({
        totalRounds: dailyRounds,
        totalStash: dailyStash,
        repEarned: Math.round(dailyRep), // Round to nearest integer for display
        bestRunner,
        bestPlug
      });
    } catch (err) {
      console.warn('[MenuScene] Failed to refresh sidebar stats:', err);
      // Fallback to zeros if fetch fails
      updateStats({
        totalRounds: 0,
        totalStash: 0,
        repEarned: 0,
        bestRunner: 0,
        bestPlug: 0
      });
    }
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
    // New layout: Show both cards stacked vertically (no carousel)
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;

    // Calculate card spacing with intelligent sizing for desktop
    const baseHeight = H * 0.34;
    const maxHeight = H * 0.38;
    const cardHeight = H > 900 ? Math.min(300, maxHeight) : Math.min(265, baseHeight);
    const gap = 8; // Gap between cards
    const topOffset = H * 0.34; // Start lower to avoid overlap with PLUG RUN header

    this.cards.forEach((card, i)=>{
      // Stack cards vertically
      const x = cx;
      const y = topOffset + (i * (cardHeight + gap));

      if (tweenBack){
        this.tweens.add({
          targets: card,
          x,
          y,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          alpha: 1, // Always visible
          duration: 400,
          ease: 'Cubic.easeOut'
        });
      } else {
        const isFirstLayout = !card._positioned;
        if (isFirstLayout) {
          card.setPosition(x, y).setScale(1).setAngle(0).setAlpha(1);
          card._positioned = true;
        } else {
          card.setPosition(x, y).setScale(1).setAngle(0).setAlpha(1);
        }
      }

      // All cards have same border style (no selection highlighting)
      if (card._bg) {
        card._bg.setStrokeStyle(2, 0x2f3650, 1);
      }

      // Run animations on all cards
      if (!card._animationActive && card._startAnimation) {
        card._animationActive = true;
        card._startAnimation();
      }
    });

    // Update static button positions (tutorial, leaderboard, etc.)
    this.updateStaticButtons();
  }

  updateStaticButtons() {
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2;

    // Calculate card positions (same as layoutCards) with intelligent sizing
    const baseHeight = H * 0.34;
    const maxHeight = H * 0.38;
    const cardHeight = H > 900 ? Math.min(300, maxHeight) : Math.min(265, baseHeight);
    const gap = 8;
    const topOffset = H * 0.34; // Start lower to avoid overlap with PLUG RUN header

    // Hide arrow buttons (no longer needed without carousel)
    if (this.leftArrow) {
      this.leftArrow.setAlpha(0);
      if (this.leftArrow._bg) this.leftArrow._bg.disableInteractive();
    }

    if (this.rightArrow) {
      this.rightArrow.setAlpha(0);
      if (this.rightArrow._bg) this.rightArrow._bg.disableInteractive();
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
      // Music will be started in TutorialMiniScene (sounds must be created in the scene that uses them)
      cam.fadeOut(250, 0,0,0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, ()=>{
        trackNavigation('tutorial');
        this.scene.transition({ target: 'TUTORIAL_MINI', duration: 250, moveBelow: true });
      });
    } else if (k === 'runner'){
      // Fade out street sounds
      this.fadeOutStreetSounds();
      // Music will be started in BaseGameScene (sounds must be created in the scene that uses them)
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
      // Music will be started in BaseGameScene (sounds must be created in the scene that uses them)
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

  openHelp(){
    const W = this.scale.width, H = this.scale.height;
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const panelW = Math.min(400, W - 32);
    const wrapW = panelW - 44;

    // Sections: each line is an array of segments so role names can carry
    // their own color/weight inline (Phaser text objects are single-style).
    const ROLE_BLUE = '#4db2ff', ROLE_RED = '#ff6b6b';
    const sections = [
      { head: 'THE PREMISE', lines: [
        [{ t: 'A daily arcade chase with two roles.' }],
        [{ t: 'RUNNER: ', c: ROLE_BLUE, b: true }, { t: 'Grab the stash and reach the getaway car.' }],
        [{ t: 'PLUG: ', c: ROLE_RED, b: true }, { t: 'Stop the Runner before they escape.' }],
        [{ t: 'Each round gets harder.' }],
      ]},
      { head: 'THE DAILY BLOCK', lines: [
        [{ t: 'A new route drops for each role every day. Everyone playing that role gets the same route.' }],
      ]},
      { head: 'LEADERBOARDS', lines: [
        [{ t: 'Each role has daily and all-time rankings. Survive more rounds to climb higher.' }],
      ]},
      { head: 'REPLAYS', lines: [
        [{ t: 'After every run, watch the replay and download the clip to share.' }],
      ]},
      { head: 'REP', lines: [
        [{ t: 'Every run starts with the same amount of Rep. What you do in the round decides how much you walk away with.' }],
      ]},
    ];

    const els = [];
    const veil = this.add.rectangle(cx, cy, W, H, 0x000000, 0.65).setDepth(50).setInteractive();
    els.push(veil);

    // Measure pass: build all texts at local (xOff, yCursor); position later.
    const mkStyle = (seg, availW) => ({
      fontFamily: 'monospace', fontSize: '12px',
      color: seg.c || '#aab3c8',
      fontStyle: seg.b ? 'bold' : 'normal',
      align: 'left', lineSpacing: 3,
      wordWrap: availW ? { width: availW } : undefined
    });
    let y = 0;
    const content = []; // { obj, xOff, yOff }
    for (const sec of sections) {
      const h = this.add.text(0, 0, sec.head, {
        fontFamily: 'monospace', fontSize: '12px', color: '#86efac',
        fontStyle: 'bold', letterSpacing: 1
      }).setOrigin(0, 0).setDepth(52);
      content.push({ obj: h, xOff: 0, yOff: y });
      y += h.height + 4;
      for (const line of sec.lines) {
        let x = 0, lineH = 0;
        line.forEach((seg, i) => {
          const last = i === line.length - 1;
          const obj = this.add.text(0, 0, seg.t, mkStyle(seg, last ? wrapW - x : null))
            .setOrigin(0, 0).setDepth(52);
          content.push({ obj, xOff: x, yOff: y });
          x += obj.width;
          lineH = Math.max(lineH, obj.height);
        });
        y += lineH + 3;
      }
      y += 11; // section gap
    }
    const contentH = y;
    const titleH = 34, btnH = 40;
    const panelH = Math.min(H - 60, contentH + titleH + btnH + 30);

    const panel = this.add.rectangle(cx, cy, panelW, panelH, PALETTE.panel, 0.97)
      .setDepth(51).setStrokeStyle(2, 0x2f8fe0);
    els.push(panel);
    const title = this.add.text(cx, cy - panelH/2 + 20, 'HOW IT WORKS', {
      color: PALETTE.title, fontSize: '16px', fontFamily: 'monospace', letterSpacing: 2, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(52);
    els.push(title);
    const titleRule = this.add.rectangle(cx, cy - panelH/2 + 36, 130, 2, 0x2f8fe0, 1).setDepth(52);
    els.push(titleRule);

    const contentX = cx - panelW/2 + 22;
    const contentY = cy - panelH/2 + titleH + 6;
    for (const { obj, xOff, yOff } of content) {
      obj.setPosition(contentX + xOff, contentY + yOff);
      els.push(obj);
    }

    const gotBg = this.add.rectangle(cx, cy + panelH/2 - btnH/2 - 10, Math.min(220, panelW - 60), btnH - 8, 0xfbbf24, 1)
      .setStrokeStyle(2, 0xf59e0b).setDepth(52).setInteractive({ cursor: 'pointer' });
    const gotTxt = this.add.text(gotBg.x, gotBg.y, 'GOT IT', {
      fontFamily: 'monospace', fontSize: '14px', color: '#1e293b', fontStyle: 'bold', letterSpacing: 1
    }).setOrigin(0.5).setDepth(53);
    els.push(gotBg, gotTxt);

    const close = () => els.forEach(e => e.destroy());
    gotBg.on('pointerup', close);
    veil.on('pointerup', close);
  }

  openSettings(){
    const W = this.scale.width, H = this.scale.height;
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const panelW = Math.min(360, W - 40);
    const panelH = 170; // Taller to fit both toggles

    const veil = this.add.rectangle(cx, cy, W, H, 0x000000, 0.65).setDepth(50).setInteractive();
    const panel = this.add.rectangle(cx, cy, panelW, panelH, PALETTE.panel, 0.96).setDepth(51).setStrokeStyle(2, 0x2f8fe0);
    const title = this.add.text(cx, cy - panelH/2 + 22, 'SETTINGS', { color: PALETTE.title, fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold', letterSpacing: 2 }).setOrigin(0.5).setDepth(52);
    const titleRule = this.add.rectangle(cx, cy - panelH/2 + 38, 110, 2, 0x2f8fe0, 1).setDepth(52);

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
    const destroyAll = ()=> { [veil, panel, title, titleRule, musicLabel, musicBg, musicTxt, soundsLabel, soundsBg, soundsTxt, closeBg, closeTx].forEach(o=>o?.destroy()); };
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
    // Opening the modal counts as "seen" the recovery code — clear the
    // attention flag and refresh the chip so it drops back to normal blue.
    try {
      if (localStorage.getItem('pr_recovery_unseen') === 'true') {
        localStorage.removeItem('pr_recovery_unseen');
        this.updateProfileChipSync();
      }
    } catch {}

    const W = this.scale.width, H = this.scale.height;
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const panelW = Math.min(380, W - 40);
    const panelH = Math.min(280, H - 100);

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

    // Identity-only modal: stats live in the menu ticker + on the leaderboard
    // screen. This modal exists for one thing — your recovery code.
    const subtitle = this.add.text(cx, cy - panelH/2 + 55, 'YOUR IDENTITY', {
      color: '#8a93a8', fontFamily: 'monospace', fontSize: '10px', letterSpacing: 2
    }).setOrigin(0.5).setDepth(52);
    baseElements.push(subtitle);

    // Recovery code — hero element of the modal.
    const recovery = getRecoveryCode();
    const codeY = cy - 20;

    const recHint = this.add.text(cx, codeY - 50, 'RECOVERY CODE', {
      color: '#fbbf24', fontFamily: 'monospace', fontSize: '11px',
      fontStyle: 'bold', letterSpacing: 3
    }).setOrigin(0.5).setDepth(52);
    const recSub = this.add.text(cx, codeY - 32, 'Save this to play on any device', {
      color: '#8a93a8', fontFamily: 'monospace', fontSize: '10px'
    }).setOrigin(0.5).setDepth(52);
    baseElements.push(recHint, recSub);

    if (recovery) {
      const codeBg = this.add.rectangle(cx, codeY, panelW - 60, 46, 0x0a0d13, 0.95)
        .setStrokeStyle(2, 0xfbbf24).setDepth(52);
      const codeTx = this.add.text(cx, codeY, recovery, {
        color: '#fbbf24', fontFamily: 'monospace', fontSize: '20px',
        fontStyle: 'bold', letterSpacing: 2
      }).setOrigin(0.5).setDepth(53);
      const tapHint = this.add.text(cx, codeY + 32, 'tap to copy', {
        color: '#8a93a8', fontFamily: 'monospace', fontSize: '9px', fontStyle: 'italic'
      }).setOrigin(0.5).setDepth(53);

      codeBg.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        try {
          navigator.clipboard.writeText(recovery);
          codeTx.setText('COPIED');
          codeTx.setColor('#22c55e');
          this.time.delayedCall(1400, () => {
            if (codeTx?.active) { codeTx.setText(recovery); codeTx.setColor('#fbbf24'); }
          });
        } catch {}
      });
      baseElements.push(codeBg, codeTx, tapHint);

      // Prominent restore button
      const restoreY = cy + 60;
      const restoreBg = this.rexUI.add.roundRectangle(cx, restoreY, panelW - 60, 42, 6, 0x1e3a8a, 1)
        .setStrokeStyle(2, 0x3b82f6).setDepth(52);
      const restoreTx = this.add.text(cx, restoreY, 'Restore on new device', {
        color: '#cbd1ff', fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(53);
      restoreBg.setInteractive({ useHandCursor: true })
        .on('pointerup', () => this.openRestoreModal())
        .on('pointerover', () => restoreBg.setStrokeStyle(2, 0x60a5fa))
        .on('pointerout',  () => restoreBg.setStrokeStyle(2, 0x3b82f6));
      baseElements.push(restoreBg, restoreTx);
    } else {
      const noCodeTx = this.add.text(cx, codeY, 'Not yet provisioned', {
        color: '#8a93a8', fontFamily: 'monospace', fontSize: '14px', fontStyle: 'italic'
      }).setOrigin(0.5).setDepth(52);
      const noCodeSub = this.add.text(cx, codeY + 22, 'Play a round while online to activate', {
        color: '#8a93a8', fontFamily: 'monospace', fontSize: '11px'
      }).setOrigin(0.5).setDepth(52);
      baseElements.push(noCodeTx, noCodeSub);
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
    };
    closeBg.on('pointerdown', destroyAll);
    veil.on('pointerdown', destroyAll);
  }

  openRestoreModal(){
    const W = this.scale.width, H = this.scale.height;
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const panelW = Math.min(340, W - 40);
    const panelH = 200;

    const veil = this.add.rectangle(cx, cy, W, H, 0x000000, 0.75).setDepth(60).setInteractive();
    const panel = this.add.rectangle(cx, cy, panelW, panelH, PALETTE.panel, 0.98).setDepth(61)
      .setStrokeStyle(2, 0xfbbf24);
    const title = this.add.text(cx, cy - panelH/2 + 22, 'Restore Identity', {
      color: '#fbbf24', fontSize: '18px', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(62);
    const hint = this.add.text(cx, cy - 30, 'Paste your recovery code:', {
      color: '#cbd1ff', fontFamily: 'monospace', fontSize: '11px'
    }).setOrigin(0.5).setDepth(62);

    // DOM input overlay for text entry (Phaser doesn't do text input natively)
    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.placeholder = 'XXXX-XXXX-XXXX';
    inputEl.autocapitalize = 'characters';
    inputEl.style.cssText = `
      position: fixed; left: 50%; top: 50%; transform: translate(-50%, 5px);
      width: 220px; padding: 8px; text-align: center;
      font-family: monospace; font-size: 14px; letter-spacing: 2px;
      background: #0a0d13; color: #fbbf24; border: 1px solid #fbbf24; border-radius: 4px;
      z-index: 999999; text-transform: uppercase; outline: none;
    `;
    document.body.appendChild(inputEl);
    setTimeout(() => inputEl.focus(), 50);

    const status = this.add.text(cx, cy + 40, '', {
      color: '#f87171', fontFamily: 'monospace', fontSize: '11px'
    }).setOrigin(0.5).setDepth(62);

    const okBg = this.add.rectangle(cx - 55, cy + panelH/2 - 26, 90, 26, 0xfbbf24, 1)
      .setStrokeStyle(1, 0xf59e0b).setDepth(62).setInteractive({ useHandCursor: true });
    const okTx = this.add.text(okBg.x, okBg.y, 'Restore', {
      color: '#1a1a1a', fontStyle: 'bold', fontSize: '13px'
    }).setOrigin(0.5).setDepth(63);

    const cancelBg = this.add.rectangle(cx + 55, cy + panelH/2 - 26, 90, 26, 0x1a2038, 1)
      .setStrokeStyle(1, PALETTE.stroke).setDepth(62).setInteractive({ useHandCursor: true });
    const cancelTx = this.add.text(cancelBg.x, cancelBg.y, 'Cancel', {
      color: '#cbd1ff', fontSize: '13px'
    }).setOrigin(0.5).setDepth(63);

    const elements = [veil, panel, title, hint, status, okBg, okTx, cancelBg, cancelTx];
    const teardown = () => {
      elements.forEach(o => o?.destroy());
      inputEl.remove();
    };

    okBg.on('pointerup', async () => {
      const code = inputEl.value.trim().toUpperCase();
      status.setText('Restoring...');
      status.setColor('#cbd1ff');
      const res = await restoreFromRecoveryCode(code);
      if (res.success) {
        status.setText('Restored: ' + res.username);
        status.setColor('#22c55e');
        setTimeout(() => { teardown(); this.scene.restart(); }, 900);
      } else {
        status.setText(res.error || 'Restore failed');
        status.setColor('#f87171');
      }
    });
    cancelBg.on('pointerup', teardown);
    veil.on('pointerdown', teardown);
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
    // Slow lane-dash scroll for ambient motion
  }

  reposition(){
    const W = this.scale.width, H = this.scale.height;
    // Rebuild street background at new dimensions
    this.drawStreetBackground();
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

    this.logo?.setPosition(W/2, logoY + signH/2);

    // Ticker chip: midway between the sign and the first card, clamped so
    // it never overlaps either (tall desktop windows compressed this gap)
    {
      const cardH0 = H > 900 ? Math.min(300, H * 0.38) : Math.min(265, H * 0.34);
      const firstCardTop = H * 0.34 - cardH0 / 2;
      const signBottom = logoY + signH;
      this.tickerChip?.setPosition(W/2, Math.min(signBottom + 18, (signBottom + firstCardTop) / 2));
    }

    // Bottom dock bar (sidewalk strip)
    const dockH = 56;
    this.dockBg?.setPosition(W/2, H - dockH/2);
    this.dockBg?.setSize(W, dockH);
    this.dockEdge?.setPosition(W/2, H - dockH);
    this.dockEdge?.setSize(W, 2);

    // Bottom elements
    const pad = Math.max(8, Math.floor(Math.min(W,H) * 0.02));

    // Tutorial button positioned with gaps from both card above and widgets below
    const baseHeight = H * 0.34;
    const maxHeight = H * 0.38;
    const cardHeight = H > 900 ? Math.min(300, maxHeight) : Math.min(265, baseHeight);
    const gap = 8;
    const topOffset = H * 0.34;
    const bottomCardY = topOffset + (1 * (cardHeight + gap)); // Second card position
    const bottomOfCard = bottomCardY + cardHeight/2; // Bottom edge of second card

    const tutorialBtnHeight = Math.max(36, Math.floor(H * 0.045));
    const widgetY = H - pad - 18; // Widget center position (lowered to create more space)
    const widgetHeight = 48; // Approximate widget height
    const topOfWidgets = widgetY - widgetHeight/2; // Top edge of widgets

    const minGapFromCard = 8; // Minimum gap from card above
    const minGapFromWidgets = 8; // Minimum gap from widgets below

    // Calculate available space and center the button if there's room
    const availableSpace = topOfWidgets - bottomOfCard;
    const minNeededSpace = minGapFromCard + tutorialBtnHeight + minGapFromWidgets;

    let tutorialY;
    if (availableSpace > minNeededSpace + 20) {
      // Plenty of space (desktop) - center the button in available space
      tutorialY = bottomOfCard + availableSpace / 2;
    } else {
      // Tight space (mobile) - maintain minimum gaps, prioritize card gap
      tutorialY = bottomOfCard + minGapFromCard + tutorialBtnHeight/2;
    }
    this.tutorialBtn?.setPosition(W / 2, tutorialY);

    // Bottom widgets — anchored to the ROAD STRIP, not the screen edges,
    // so on wide desktop monitors the chip and buttons stay together
    // instead of drifting to opposite corners. On mobile the road is
    // ~full width, so this matches the old layout.
    const widgetBottomY = H - pad - 18;
    const rail = Math.min(600, Math.floor(W * 0.96)); // matches road width
    const railL = W/2 - rail/2, railR = W/2 + rail/2;

    // Leaderboard button (trophy icon) — all platforms now that the
    // desktop sidebar leaderboard is removed
    if (this.helpBtn) {
      this.helpBtn.setPosition(railR - pad - 24 - 112, widgetBottomY); // Left of trophy
      this.helpBtn.setAlpha(1);
    }
    if (this.leaderboardBtn) {
      this.leaderboardBtn.setPosition(railR - pad - 24 - 56, widgetBottomY); // Left of settings
      this.leaderboardBtn.setAlpha(1);
    }

    // Settings button at the road's right edge
    this.settingsBtn?.setPosition(railR - pad - 24, widgetBottomY);

    // Profile chip at the road's left edge
    const chipW = this.profileChip?._w || 160;
    this.profileChip?.setPosition(railL + pad + chipW/2, widgetBottomY);

    // Daily bonus button hidden (removed from menu)
    if (this.dailyBonusBtn) {
      this.dailyBonusBtn.setAlpha(0);
      this.dailyBonusBtn.setPosition(-1000, -1000); // Move off-screen
    }

    // Refresh layout
    this.layoutCards(0, false);
  }
}