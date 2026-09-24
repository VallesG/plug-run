import { consumeModalPointer, guardModalDismissal, guardSceneEntryFromHeldPointer } from '../utils/modalPointerGuard.js';
import { getJourneyProgress } from '../utils/journeyProgress.js';
import { getCityProgress } from '../utils/cityProgress.js';
import { storySeasonComplete } from '../logic/city.js';
import { firstPlayDestination } from '../logic/firstPlay.js';
import { hasCompletedTutorial } from '../utils/tutorialProgress.js';
import { campaignStashes } from '../utils/rivalsUnlock.js';
import { hasWindowOnboarding } from '../utils/windowProgress.js';
// LANDING / MENUSCENE
// LANDING / MENUSCENE (rexUI)
import Phaser from 'phaser';
import { landingLayout, landingSession, titleBackdrop } from '../logic/landingLayout.js';
import { rivalsMenuState } from '../utils/rivalsUnlock.js';
import { drawPowerIcon } from '../controllers/PowerIcons.js';
import { PALETTE as INK } from '../logic/palette.js';
import { PVE_BLOCK_MAPS } from '../logic/blockFormat.js';
import AudioManager from '../audio/AudioManager.js';
import { getUsername, getCurrentUser, getCurrentUserSync, isGuestAccount, getUserID, ensureProvisionedIdentity, getRecoveryCode, hasProvisionedIdentity, restoreFromRecoveryCode } from '../utils/userManager.js';
import { getUserRank, getUserScore, getAllTimeRank, getAllTimeScore, getTopScores, getAllTimeTopScores, getLeaderboard, getAllTimeLeaderboard, formatNumber } from '../utils/leaderboardManager.js';
import { getSessionState, clearSessionState } from '../utils/routeProgress.js';
import { getCurrentRouteID } from '../utils/seededRandom.js';
import { trackNavigation, trackEvent } from '../utils/analytics.js';
import { takeLaunchChallenge, takeLaunchPrize, prizesHere, identityProof } from '../platform/index.js';
import { getChallenge, getPrizeStatus, claimPrize } from '../utils/api.js';
import { showPrizeClaim } from '../platform/prizeClaim.js';
import { setTodayPrize } from '../utils/prizeState.js';
import { dailyNumber, dailySlot, dailyRival, dailyNote } from '../logic/dailyRace.js';
import { getDailyState } from '../utils/dailyProgress.js';
import { enabledRivalCourses, rivalPoolCourse } from '../logic/rivals.js';
import { loadRivalOpponents, isJevRecord } from '../utils/rivalSession.js';
import { createPortraitOverlay } from '../utils/portraitMode.js';
import { isDesktop, areSidebarsActive, createSidebarContainer, createSocialFeed, createPersonalStats, cleanupSidebars, updateStats, updateLeaderboard, updateSocialFeed, setGlobalTimers, setCurrentMode, getCurrentMode, getExistingSidebars } from '../utils/desktopSidebars.js';
import { fetchRecentActivity } from '../utils/activityFeed.js';
// A LATER on a prize claim lasts the session: it does not reopen on every menu visit.
const prizeLater = new Set();

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
    // Keep the original vector as a load-failure fallback for the approved PNG.
    this.load.svg('plug_run_wordmark', '/brand/plug-run-wordmark.svg', { width: 1200, height: 384 });
    this.load.image('menu_city_bg', '/art/menu/menu-city-bg.png');
    this.load.image('menu_logo', '/art/menu/menu-logo.png');

    // Load character sprites for card visuals
    this.load.image('td_runner', '/sprites/td/runner.png');
    this.load.image('td_runner_step', '/sprites/td/runner_step.png');
    this.load.image('td_plug', '/sprites/td/plug.png');
    this.load.image('td_plug_step', '/sprites/td/plug_step.png');
    this.load.image('car_blue', '/sprites/car_blue.png');
    // Music (provide multiple formats for browser compatibility if available)
    try {
      // Prefer .ogg/.mp3 (current files) in that order
      AudioManager.preloadMoments(this);
      this.load.audio('bg_main',  ['/audio/main_beat.ogg',  '/audio/main_beat.mp3']);
      this.load.audio('bg_plug',  ['/audio/plug_beat2.ogg',  '/audio/plug_beat2.mp3']);
      this.load.audio('bg_learn', ['/audio/learn_beat.ogg', '/audio/learn_beat.mp3']);
      // bg_beat4-7 load after the first screen: AudioManager.loadExtraBeats.
      // Street ambience sounds for menu
      this.load.audio('street_ambience', ['/audio/street_ambience.ogg', '/audio/street_ambience.mp3']);
      this.load.audio('cars_pass', ['/audio/cars_pass.ogg', '/audio/cars_pass.mp3']);
    } catch {}
  }

  init(){
    this.cards = [];
    this._titleOptions = [];
    this._titlePrimary = null;
    this.selected = 0;
    try {
      const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('lastMode') : null;
      if (saved){ this.selected =  Math.max(0, Math.min(4, parseInt(saved, 10) || 0)); }
    } catch {}
  }

  create(){
    guardSceneEntryFromHeldPointer(this);
    AudioManager.loadExtraBeats(this);
    // Opened from a friend's challenge link: straight into that race.
    this.time.delayedCall(0, () => this.openLaunchChallenge());
    // Telegram: today's Daily Race prize, and a claim for a prize this player won.
    this.time.delayedCall(0, () => this.checkPrizes());
    // Always show Plug Run's landing page; guidance happens on Play.
    const W = this.scale.width, H = this.scale.height;
    // Approved night-city art sits behind real, interactive menu controls.
    this.drawStreetBackground();

    const brand = landingLayout(W, H);
    const logoKey = this.textures.exists('menu_logo') ? 'menu_logo' : 'plug_run_wordmark';
    this.textures.get(logoKey)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.logo = this.add.image(W / 2, brand.logoY, logoKey).setDepth(5);
    if (logoKey === 'menu_logo') this.treatMenuLogoBackground();
    this.positionMenuLogo(brand);

    // Plug mode is SHELVED, not removed: everything behind it still works, it
    // just isn't offered until runner mode is good and people ask for it.
    const SHOW_PLUG_MODE = false;
    const modes = [
      { key:'runner', title:'Run the Block', sub:'Grab the stash. Lose the Plug. Get out.', showTimer: false },
      ...(SHOW_PLUG_MODE ? [{ key:'plug', title:'Defend the Block', sub:'Stop the Runner before they get away.', showTimer: false }] : [])
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

    // Settings lives in the main vertical title menu
    this.settingsBtn = this.makeTitleOption('Settings', () => this.openSettings());

    // Leaderboard button (trophy icon). Boards are not live yet, so the
    // control is dimmed and answers a tap with a note rather than opening a
    // screen full of nothing.
    this.leaderboardBtn = this.makeIconButton('trophy',
      () => this.showComingSoonNote(this.leaderboardBtn, 'Leaderboards coming soon!'),
      { dimmed: true });

    // Help button — explains the premise/leaderboard/replays for newcomers
    this.helpBtn = this.makeIconButton('?', () => this.openHelp());

    // The Window is the neutral story/economy hub. Phase one only exposes
    // onboarding and read-only previews; rewards are not wired here.
    this.windowBtn = this.makeTitleOption('The Window', () => {
      trackNavigation('the_window');
      this.scene.start('WINDOW');
    });

    // Tutorial shares the quiet title-menu treatment
    // Past the tutorial, its row becomes the Daily Race (the tutorial stays
    // one tap away in the ? screen). New players keep the tutorial row.
    this.tutorialBtn = (hasCompletedTutorial() || campaignStashes() >= 1) ? this.makeDailyButton() : this.makeTutorialButton();

    // User profile chip (clickable to show user's leaderboard position)
    this.profileChip = this.makeUserProfileChip();

    // Countdown ticker chip (single shared timer under the title sign)
    this.tickerChip = this.makeTickerChip();

    // Bottom dock bar (sidewalk strip anchoring chip + icon buttons)
    this.dockBg = this.add.rectangle(0, 0, 10, 10, 0x1a1e28, 0).setDepth(5);
    this.dockEdge = this.add.rectangle(0, 0, 10, 2, 0x343a4a, 0).setDepth(5);

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

    // The title screen is intentionally free of dashboard sidebars.
    // Gameplay can recreate its own sidebars when it starts.
    cleanupSidebars();

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

  // Frame the live menu with the approved city illustration. Cover scaling
  // preserves its aspect ratio; the vignette keeps controls legible at any size.
  drawStreetBackground(){
    const W = this.scale.width, H = this.scale.height;
    if (this._streetBg) this._streetBg.destroy(true);
    const c = this.add.container(0, 0).setDepth(0);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x07111b, 1));
    if (this.textures.exists('menu_city_bg')) {
      const image = this.add.image(W / 2, H / 2, 'menu_city_bg');
      const source = image.texture.getSourceImage();
      const scale = Math.max(W / source.width, H / source.height);
      image.setDisplaySize(source.width * scale, source.height * scale);
      c.add(image);
      const centerShade = this.add.rectangle(W / 2, H * 0.53, Math.min(W * 0.78, 680), H * 0.69, 0x06111a, 0.13);
      c.add(centerShade);
    } else {
      // Safe fallback if the new asset fails to load.
      for (const p of titleBackdrop(W, H)) {
        const texture = p.role === 'plug' ? 'td_plug' : 'td_runner';
        if (!this.textures.exists(texture)) continue;
        const sprite = this.add.image(p.x, p.y, texture);
        sprite.setScale(p.size / Math.max(sprite.width, sprite.height))
          .setTint(p.role === 'plug' ? 0x704148 : 0x377080)
          .setAlpha(p.alpha).setAngle(p.angle);
        c.add(sprite);
      }
    }
    const shade = this.add.graphics();
    for (let i = 0; i < 6; i++) {
      const edge = (6 - i) * Math.min(W, H) * 0.018;
      shade.fillStyle(0x000000, 0.055);
      shade.fillRect(0, 0, edge, H);
      shade.fillRect(W - edge, 0, edge, H);
      shade.fillRect(0, 0, W, edge);
      shade.fillRect(0, H - edge, W, edge);
    }
    c.add(shade);
    this._streetBg = c;
  }

  // The supplied logo has broad canvas padding. Scale the visible artwork
  // (roughly 84% wide and 50% tall) to the layout's intended wordmark box.
  positionMenuLogo(brand){
    if (!this.logo) return;
    const W = this.scale.width;
    if (this.logo.texture.key !== 'menu_logo') {
      this.logo.setPosition(W / 2, brand.logoY).setDisplaySize(brand.logoW, brand.logoH);
      return;
    }
    const source = this.logo.texture.getSourceImage();
    const boxW = brand.logoW / 0.84;
    const boxH = boxW * source.height / source.width;
    this.logo.setPosition(W / 2, brand.logoY - boxH * 0.05).setDisplaySize(boxW, boxH);
  }

  // An opaque black export can still sit on the illustrated background:
  // SCREEN makes only black transparent without discarding the logo colors.
  treatMenuLogoBackground(){
    try {
      const source = this.logo.texture.getSourceImage();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(source, 0, 0, 1, 1, 0, 0, 1, 1);
      const [r, g, b, alpha] = ctx.getImageData(0, 0, 1, 1).data;
      if (alpha > 245 && r < 12 && g < 12 && b < 12) {
        this.logo.setBlendMode(Phaser.BlendModes.SCREEN);
      }
    } catch {}
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
      color: '#b6bbaa',
      letterSpacing: 1
    }).setOrigin(0.5);
    c.add([bg, t]);
    c._bg = bg;
    c._text = t;
    c._update = () => {
      if (!t.active) return;
      const progress = getJourneyProgress();
      t.setText(storySeasonComplete(progress, getCityProgress(progress))
        ? 'CITY 1 COMPLETE · SEASON 2 SOON'
        : `BLOCK ${progress.blockIndex} · HOUSE ${progress.pveRound} / 15`);
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
  makeTitleOption(label, onClick, locked = null, note = null){
    const a = landingLayout(this.scale.width, this.scale.height);
    const c = this.add.container(0, 0).setSize(a.menuW, a.rowH).setDepth(6);
    const shadow = this.rexUI.add.roundRectangle(0, 3, a.menuW, a.rowH, 8, 0x000000, 0.32);
    const bg = this.rexUI.add.roundRectangle(0, 0, a.menuW, a.rowH, 8,
      locked ? 0x101922 : 0x102133, locked ? 0.70 : 0.91)
      .setStrokeStyle(1.5, locked ? 0x536270 : 0x77b9ed, locked ? 0.42 : 0.75)
      .setInteractive({ cursor: locked ? 'default' : 'pointer' });
    const tx = this.add.text(0, locked || note ? -7 : 0, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: (a.rowH >= 56 ? 22 : 20) + 'px',
      fontStyle: 'bold',
      color: locked ? '#8e9aa5' : '#e4eef9'
    }).setOrigin(0.5);
    c.add([shadow, bg, tx]);
    if (locked) {
      c._locked = true;
      const note = this.add.text(0, a.rowH * 0.25, locked, {
        fontFamily: 'monospace', fontSize: '10px', color: '#9baaba', letterSpacing: 1
      }).setOrigin(0.5);
      c.add(note);
      c._note = note;
    } else {
      if (note) {
        const caption = this.add.text(0, a.rowH * 0.25, note, {
          fontFamily: 'monospace', fontSize: '10px', color: '#f2c14e', letterSpacing: 1
        }).setOrigin(0.5);
        c.add(caption);
        c._note = caption;
      }
      const chevron = this.add.text(a.menuW / 2 - 20, 0, '›', {
        fontFamily: 'Arial, sans-serif', fontSize: '30px', color: '#a7d8ff'
      }).setOrigin(0.5);
      c.add(chevron);
      c._chevron = chevron;
    }
    c._bg = bg;
    c._text = tx;
    c._setSelected = selected => {
      if (c._locked) return;
      bg.setFillStyle(selected ? 0x342e23 : 0x102133, selected ? 0.95 : 0.91);
      bg.setStrokeStyle(selected ? 2.5 : 1.5, selected ? 0xffd579 : 0x77b9ed, selected ? 1 : 0.75);
      tx.setColor(selected ? '#ffe0a0' : '#e4eef9');
      c._chevron?.setColor(selected ? '#ffe0a0' : '#a7d8ff');
    };
    if (!locked) {
      this._titleOptions.push(c);
      bg.on('pointerover', () => this.focusTitleOption(c));
      bg.on('pointerout', () => this.focusTitleOption(this._titlePrimary));
      bg.on('pointerup', onClick);
    }
    return c;
  }

  focusTitleOption(option){
    for (const item of this._titleOptions) {
      if (item.active) item._setSelected(item === option);
    }
  }

  makeRunnerTitleMenu(){
    const a = landingLayout(this.scale.width, this.scale.height);
    const cont = this.add.container(0,0).setSize(a.menuW,a.rowH+a.rowGap).setDepth(3);
    cont.modeKey = 'runner';
    cont.runKind = 'journey';
    // Keep the front door consistent; launchCard still applies onboarding policy.
    const start = this.makeTitleOption('PLAY', () => this.launchCard(cont));
    cont.add(start);
    cont._startBg = start._bg;
    cont._startText = start._text;
    this._titlePrimary = start;
    this.focusTitleOption(start);
    // Block Rivals is open from the start (rivalsUnlocked); the locked-row
    // path stays for a future gate.
    const unlock = rivalsMenuState();
    const rivals = this.makeTitleOption('Block Rivals',
      () => this.launchCard({ modeKey:'runner', runKind:'rivals' }),
      unlock.unlocked ? null : unlock.progressText)
      .setPosition(0,a.rowGap);
    cont.add(rivals);
    return cont;
  }

  makeCard(title, sub, modeKey, showTimer = false){
    if (modeKey === 'runner') return this.makeRunnerTitleMenu();
    const W = this.scale.width, H = this.scale.height;
    const { cardW: cw, cardH: ch } = landingLayout(W, H);

    // Create container first
    const cont = this.add.container(0, 0).setSize(cw, ch).setDepth(3);
    // Cards are not interactive - only buttons control navigation

    // Dark panel body with the in-game grammar: ink line, hard offset shadow.
    const bgShadow = this.add.rectangle(6, 7, cw, ch, INK.ink, 0.55);
    cont.add(bgShadow);
    const bg = this.add.rectangle(0, 0, cw, ch, 0x10131a, 0.96);
    bg.setStrokeStyle(3, INK.ink, 1);
    cont.add(bg);

    this.addCardVisuals(cont, modeKey, cw, ch);

    // Title at TOP (LA street sign font with blue background bar)
    const titleText = String(title).toUpperCase();
    const titleSize = Math.min(25, Math.max(20, Math.floor(cw * 0.058))); // Proportional to smaller card height

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
    const SIGN_COLORS = { runner: 0x17262d, plug: 0x382329 };
    const signColor = SIGN_COLORS[modeKey] ?? 0x0047AB;

    // Single-line bar: street name left, address right
    const titleBgHeight = Math.floor(titleSize * 1.7);
    const titleBg = this.add.rectangle(0, -ch * 0.5 + titleBgHeight/2, cw, titleBgHeight, signColor, 1)
      .setStrokeStyle(3, INK.ink)
      .setOrigin(0.5, 0.5);

    const titleObj = this.add.text(0, -ch * 0.5 + titleBgHeight/2, titleText, {
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fontSize: titleSize + 'px',
      stroke: INK.inkCss,
      strokeThickness: 1
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
        ['BEST MAP',     String(stats.daily?.round ?? stats.alltime?.round ?? '—'), '#f0f2f7'],
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
    const btnWidth = cw - 32;
    const btnHeight = 44;
    const btnY = (ch / 2) - (btnHeight / 2) - 14; // Position at bottom edge with small padding

    // Comic button: flat yellow, ink line, hard shadow underneath.
    const startShadow = this.rexUI.add.roundRectangle(4, btnY + 5, btnWidth, btnHeight, 6, INK.ink, 0.6);
    const startBg = this.rexUI.add.roundRectangle(0, btnY, btnWidth, btnHeight, 4, 0xf1ca82, 1)
      .setStrokeStyle(2, INK.ink)
      .setInteractive({ cursor: 'pointer' });

    // The button speaks in blocks and maps. A session past the end of the
    // block is a leftover from the endless ladder and reads as a fresh start.
    let buttonText = 'START';
    let resumable = false;
    if (modeKey === 'runner' || modeKey === 'plug') {
      let sess = null;
      try { sess = getSessionState(modeKey); } catch {}
      const n = sess?.pveRound ?? 1;
      resumable = n > 1 && n <= PVE_BLOCK_MAPS;
      buttonText = resumable ? `CONTINUE \u2014 MAP ${n} / ${PVE_BLOCK_MAPS}` : 'START BLOCK';
    }

    const startText = this.add.text(0, btnY, buttonText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: Math.max(16, Math.floor(btnHeight * 0.42)) + 'px',
      color: INK.inkCss,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    cont.add(startShadow);
    cont.add(startBg);
    cont.add(startText);

    // Mid-block? Offer a clean restart too. Clears the saved session and
    // launches through the same path, so the game falls back to map 1.
    if (resumable) {
      const over = this.add.text(0, btnY - btnHeight / 2 - 11, 'start over from map 1', {
        fontFamily: 'monospace', fontSize: '11px', color: '#aab3c8'
      }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
      over.on('pointerover', () => over.setColor('#ffffff'));
      over.on('pointerout',  () => over.setColor('#aab3c8'));
      over.on('pointerup', () => {
        try { clearSessionState(modeKey); } catch {}
        startText.setText('START BLOCK');
        over.destroy();
        this.launchCard(cont);
      });
      cont.add(over);
    }

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
    startBg.on('pointerover', () => startBg.setFillStyle(0xffdf9f));
    startBg.on('pointerout',  () => startBg.setFillStyle(0xf1ca82));

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

  makeIconButton(label, onClick, { dimmed = false } = {}){
    const H = this.scale.height;
    // Clamp: uncapped height-scaling made these balloon on desktop
    const r = Math.min(21, Math.max(18, Math.floor(H * 0.024)));
    const bg = this.rexUI.add.roundRectangle(0, 0, r*2, r*2, r, PALETTE.panel, dimmed ? 0.55 : 0.92)
      .setStrokeStyle(2, dimmed ? 0x232838 : PALETTE.stroke)
      .setInteractive({ cursor: dimmed ? 'default' : 'pointer' });
    let t;
    if (label === 'settings') {
      t = drawPowerIcon(this, 0, 0, 'settings', 21, 0xb7c7cc, 6);
    } else if (label === 'trophy') {
      t = this.add.graphics();
      t.lineStyle(2, dimmed ? 0x5b6472 : 0xf1ca82, 1);
      t.strokeRect(-5, -8, 10, 10);
      t.lineBetween(-8, -7, -8, -1); t.lineBetween(-8, -1, -5, 1);
      t.lineBetween(8, -7, 8, -1); t.lineBetween(8, -1, 5, 1);
      t.lineBetween(0, 2, 0, 7); t.lineBetween(-6, 8, 6, 8);
    } else {
      t = this.add.text(0, 0, label, { fontSize: '18px', color: dimmed ? '#5b6472' : '#b7c7cc' }).setOrigin(0.5);
    }
    const btn = this.add.container(0, 0, [bg, t]).setSize(r*2, r*2).setDepth(6);
    btn._radius = r;

    // Background handles interaction. A dimmed button still takes the tap —
    // that is how it gets to explain itself instead of doing nothing.
    bg.on('pointerup', onClick);

    // Hover effect. A dimmed control never lights up; it is not going anywhere.
    if (!dimmed) {
      bg.on('pointerover', () => {
        bg.setStrokeStyle(2, PALETTE.glow);
      });
      bg.on('pointerout', () => {
        bg.setStrokeStyle(2, PALETTE.stroke);
      });
    }

    return btn;
  }

  /** A small note pinned beside a disabled control, saying why it is disabled. */
  showComingSoonNote(anchor, message){
    try { this._comingSoonNote?.destroy(); } catch {}
    this._comingSoonNote = null;
    if (!anchor) { this.toast(message); return null; }
    const W = this.scale.width, H = this.scale.height;
    const size = Math.max(12, Math.min(15, Math.floor(H * 0.02)));
    const label = this.add.text(0, 0, message, { fontFamily: 'Arial, sans-serif',
      fontSize: size + 'px', color: PALETTE.title }).setOrigin(0.5);
    const padX = 12, padY = 7;
    const w = label.width + padX * 2, h = label.height + padY * 2;
    const bg = this.rexUI.add.roundRectangle(0, 0, w, h, 8, PALETTE.panel, 0.96)
      .setStrokeStyle(2, PALETTE.stroke);
    const note = this.add.container(0, 0, [bg, label]).setDepth(60).setAlpha(0);
    // Sit to the left of the anchor, since this control is the rightmost in
    // the footer; flip to the right only if the left would run off screen.
    const gap = (anchor._radius || 20) + 10;
    let x = anchor.x - gap - w / 2;
    if (x - w / 2 < 8) x = anchor.x + gap + w / 2;
    note.setPosition(clamp(x, w / 2 + 8, W - w / 2 - 8), clamp(anchor.y, h / 2 + 8, H - h / 2 - 8));
    this._comingSoonNote = note;
    this.tweens.add({ targets: note, alpha: 1, duration: 140 });
    this.time.delayedCall(1900, () => {
      if (this._comingSoonNote !== note) return;
      this.tweens.add({ targets: note, alpha: 0, duration: 200, onComplete: () => {
        try { note.destroy(); } catch {}
        if (this._comingSoonNote === note) this._comingSoonNote = null;
      } });
    });
    return note;
  }

  makeDailyButton(){
    const n = dailyNumber(Date.now());
    return this.makeTitleOption('Daily Race #' + n, () => this.launchDaily(n), null, dailyNote(getDailyState(), n));
  }

  /** Today's race: the same course and recorded rival for everyone (logic/dailyRace.js). */
  launchDaily(n){
    if (this._dailyLoading) return;
    this._dailyLoading = true;
    const slot = dailySlot(n, enabledRivalCourses().map(c => c.slot));
    const course = rivalPoolCourse(slot);
    if (!course) { this._dailyLoading = false; this.toast('Daily Race unavailable'); return; }
    trackEvent('daily_started', { course_slot: slot });
    loadRivalOpponents(course, 'ordinary').then(entries => {
      const pick = dailyRival(n, entries, isJevRecord);
      if (!this.sys.isActive()) return;
      if (!pick) { this.toast('Daily Race unavailable'); return; }
      this.launchCard({ modeKey: 'runner', runKind: 'rivals', data: {
        rivalSlot: slot, rivalStashSeed: pick.record.stashSeed, rivalOpponentID: pick.record.recordingID,
        rivalPool: 'ordinary', rivalDaily: n
      } });
    }).catch(() => { if (this.sys.isActive()) this.toast('Daily Race unavailable'); })
      .finally(() => { this._dailyLoading = false; });
  }

  startTutorialFromMenu(){
    this.fadeOutStreetSounds();
    try {
      const audio = AudioManager.get(this);
      audio.ensureUnlocked(this);
      audio.playGameplayMusic('tutorial', { volume: 0.3, loop: true, fade: 800 });
      audio.setMusicFilterCutoff(600, 0);
    } catch {}
    const cam = this.cameras.main;
    cam.fadeOut(250, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.transition({ target: 'TUTORIAL_MINI', duration: 250, moveBelow: true });
    });
  }

  makeTutorialButton(){
    const button = this.makeTitleOption('Tutorial', () => {
      // Fade out street sounds
      this.fadeOutStreetSounds();

      // Start tutorial music
      try {
        const audio = AudioManager.get(this);
        audio.ensureUnlocked(this);
        audio.playGameplayMusic('tutorial', { volume: 0.3, loop: true, fade: 800 });
        audio.setMusicFilterCutoff(600, 0); // Start muffled (adaptive music)
      } catch {}

      // Fade out and transition to tutorial
      const cam = this.cameras.main;
      cam.fadeOut(250, 0, 0, 0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.transition({ target: 'TUTORIAL_MINI', duration: 250, moveBelow: true });
      });
    });
    this._tutorialHintNeeded = !hasCompletedTutorial() && campaignStashes() < 1;
    this._tutorialHintArrow = null;
    if (this._tutorialHintNeeded) {
      const a = landingLayout(this.scale.width, this.scale.height);
      const arrow = this.add.graphics().fillStyle(0x9bcdfb, 1);
      arrow.fillTriangle(-7, -7, 3, 0, -7, 7);
      arrow.fillRect(-13, -2, 8, 4);
      arrow.setPosition(-a.menuW / 2 + 23, 0);
      button.add(arrow); // Decorative only: no interactive hit area.
      this._tutorialHintArrow = arrow;
      this._tutorialHintReducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    }
    return button;
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
    const w = landingLayout(this.scale.width, this.scale.height).profileW;
    const h = Math.min(36, Math.max(32, Math.floor(this.scale.height * 0.042)));
    c._w = w;

    // Attention mode: unclaimed recovery code → amber chip + trailing "!"
    const unseen = (() => { try { return localStorage.getItem('pr_recovery_unseen') === 'true'; } catch { return false; } })();
    const fillColor   = unseen ? 0x78500a : 0x1d303c;
    const strokeColor = unseen ? 0xfbbf24 : 0x54798e;
    const strokeHover = unseen ? 0xfde68a : 0x60a5fa;
    const textColor   = unseen ? '#fde68a' : '#cbd1ff';

    const bg = this.rexUI.add.roundRectangle(0, 0, w, h, h/2, fillColor, 0.85)
      .setStrokeStyle(2, strokeColor)
      .setInteractive({ cursor: 'pointer' });

    const icon = this.add.graphics({ x: -w/2 + h/2, y: 0 });
    icon.lineStyle(1.5, 0xb7c7cc, 1);
    icon.strokeCircle(0, -5, 4);
    icon.strokeRoundedRect(-7, 2, 14, 8, 3);

    // Username centered; if unseen, add a subtle "!" indicator to the right
    const nameOffset = unseen ? -6 : 0;
    const t = this.add.text(h/4 + nameOffset, 0, username, {
      color: textColor,
      fontSize: Math.max(12, Math.floor(h*0.5)) + 'px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    if (t.width > w - h - 18) t.setScale((w - h - 18) / t.width);
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

  /**
   * Where card i sits. Two cards stack from 34% down, as before. A lone card
   * is dropped toward the middle of the space between the ticker and the
   * dock — shelving plug mode must not leave the runner card hugging the
   * header over a hole.
   */
  cardCenterY(i, cardHeight){
    const H = this.scale.height;
    if ((this.cards?.length || 1) === 1) return landingLayout(this.scale.width, H).cardY;
    return H * 0.34 + i * (cardHeight + 8);
  }

  layoutCards(shift = 0, tweenBack = false){
    // New layout: Show both cards stacked vertically (no carousel)
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;

    // Calculate card spacing with intelligent sizing for desktop
    const baseHeight = H * 0.34;
    const maxHeight = H * 0.38;
    const cardHeight = landingLayout(W, H).cardH;
    const gap = 8; // Gap between cards
    const topOffset = H * 0.34; // Start lower to avoid overlap with PLUG RUN header

    this.cards.forEach((card, i)=>{
      // Stack cards vertically
      const x = cx;
      const y = this.cardCenterY(i, cardHeight);

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
        card._bg.setStrokeStyle(1, 0x435250, 1);
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
    const cardHeight = landingLayout(W, H).cardH;
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

  firstPlayDestination(){
    return firstPlayDestination({tutorialComplete:hasCompletedTutorial(),
      campaignStashes:campaignStashes(),joinedCrew:hasWindowOnboarding()});
  }

  launchCard(card){
    const cam = this.cameras.main;
    // Prevent multiple launches - check if camera is already fading
    if (cam.fadeEffect && cam.fadeEffect.isRunning) {
      return; // Already launching, ignore
    }

    let k = card.modeKey;
    if(k === 'runner' && card.runKind !== 'rivals') {
      const destination=this.firstPlayDestination();
      if(destination === 'WINDOW') {
        this.fadeOutStreetSounds();
        this.scene.start('WINDOW', {firstVisit:true});
        return;
      }
      if(destination === 'TUTORIAL_MINI') k='learn';
      if(k === 'runner' && (card.runKind || 'journey') === 'journey') {
        const progress=getJourneyProgress();
        if(storySeasonComplete(progress,getCityProgress(progress))) {
          this.fadeOutStreetSounds();
          this.scene.start('WINDOW', {seasonComplete:true});
          return;
        }
      }
    }

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
        trackNavigation(card.runKind==='rivals'?'block_rivals':'campaign');
        this.scene.transition({
          target: 'RUNNER',
          duration: 250,
          moveBelow: true,
          data: { mode: 'pve', role: 'runner', runKind: card.runKind || 'journey', ...(card.data || {}) }
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
      // Same gate as the footer trophy: the boards are not live, so the card
      // says so instead of opening the scene.
      this.toast('Leaderboards coming soon!');
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

  /**
   * Telegram only: the Daily row names today's prize, and a win waiting for a
   * wallet opens its claim (once a session after LATER, always from the
   * winner's prize link).
   */
  checkPrizes(){
    if (!prizesHere()) return;
    const linkDay = takeLaunchPrize();
    getPrizeStatus({ userId: getUserID() }).then(st => {
      if (!this.sys.isActive() || !st?.ok) return;
      setTodayPrize(st.today);
      const n = dailyNumber(Date.now());
      if (st.today?.day === n) this.tutorialBtn?._note?.setText?.(dailyNote(getDailyState(), n, st.today.usd));
      const wins = st.wins || [];
      const open = wins.find(w => w.status === 'won' && (linkDay == null ? !prizeLater.has(w.day) : w.day === linkDay));
      if (open) { this.openPrizeClaim(open); return; }
      const linked = linkDay != null && wins.find(w => w.day === linkDay);
      if (linked) this.toast(linked.status === 'paid' ? 'Prize sent to ' + (linked.wallet || 'your wallet')
        : linked.status === 'claimed' ? 'Prize claimed: it is on its way' : 'That prize has expired');
    }).catch(() => {});
  }

  openPrizeClaim(win){
    trackEvent('prize_claim_opened');
    // The claim and TON Connect's picker are page elements over the canvas:
    // the menu takes no taps or keys until the claim closes.
    const input = this.input;
    input.enabled = false;
    if (input.keyboard) input.keyboard.enabled = false;
    const ui = showPrizeClaim(win, {
      connect: async () => (await import('../platform/tonWallet.js')).connectTonWallet(),
      claim: (wallet) => claimPrize({ userId: getUserID(), day: win.day, wallet: wallet.address, chain: wallet.chain, initData: identityProof() }),
      onClose: (state) => {
        if (this.sys.isActive()) { input.enabled = true; if (input.keyboard) input.keyboard.enabled = true; }
        if (state === 'claimed') trackEvent('prize_claimed');
        else prizeLater.add(win.day);
      }
    });
    if (!ui) { input.enabled = true; if (input.keyboard) input.keyboard.enabled = true; return; }
    // Leaving the menu some other way takes the claim with it.
    this.events.once('shutdown', () => { if (ui.root.isConnected) ui.root.remove(); });
  }

  // MENUSCENE (rexUI): toast helper using rexUI
  /** A challenge link (t.me/<bot>/play?startapp=c_<id>): fetch the race and start it. */
  openLaunchChallenge(){
    const id = takeLaunchChallenge();
    if (!id) return;
    this.toast('Loading challenge…');
    getChallenge(id).then(ch => {
      if (!this.sys.isActive() || !ch?.ok) return;
      trackEvent('challenge_opened', { course_slot: ch.slot });
      this.launchCard({ modeKey: 'runner', runKind: 'rivals', data: {
        rivalSlot: ch.slot, rivalStashSeed: ch.stashSeed, rivalOpponentID: ch.recordingID, rivalPool: ch.pool,
        rivalChallenge: { id: ch.id, name: ch.name, ms: ch.ms, rivalName: ch.rivalName }
      } });
    }).catch(() => { if (this.sys.isActive()) this.toast('That challenge has expired'); });
  }

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
    const W=this.scale.width,H=this.scale.height;
    const cx=this.cameras.main.centerX,cy=this.cameras.main.centerY;
    const panelW=Math.min(430,W-24);
    const panelH=Math.min(520,H-24);
    const pad=Math.max(12,Math.min(20,panelW*0.045));
    const cream='#f1dfb0',muted='#a9b0aa',ink=0x090d0f,gold=0xe2b45f,teal=0x4e9b96;
    const sections=[
      {
        number:'01',title:'RUN THE BLOCK',
        copy:'Clear 15 houses. Find the real stash, lose the Plug, and reach the getaway car.'
      },
      {
        number:'02',title:'BLOCK RIVALS',
        copy:'Race the same seven houses and loadout. A half-lit rail means stash found; full means escaped.'
      },
      {
        number:'03',title:'STASH + REP',
        copy:'Stashes clear houses and unlock new blocks. REP is your leaderboard score.'
      },
      {
        number:'04',title:'THE WINDOW',
        copy:'Auntie Ro introduces the streets and your gang. Jobs and the cosmetic Shelf are coming next.'
      }
    ];

    const els=[];
    const veil=this.add.rectangle(cx,cy,W,H,0x000000,0.76).setDepth(50).setInteractive();
    const shadow=this.add.rectangle(cx+6,cy+7,panelW,panelH,ink,0.8).setDepth(51);
    const panel=this.add.rectangle(cx,cy,panelW,panelH,0x111719,0.985)
      .setDepth(52).setStrokeStyle(2,gold);
    els.push(veil,shadow,panel);

    const top=cy-panelH/2;
    const headerH=58;
    const header=this.add.rectangle(cx,top+headerH/2,panelW,headerH,0x182329,0.98)
      .setDepth(53).setStrokeStyle(1,0x705d37);
    const title=this.add.text(cx,top+20,'HOW THE STREET WORKS',{
      fontFamily:'Georgia, serif',fontSize:Math.max(17,Math.min(21,panelW*0.052))+'px',
      fontStyle:'bold',color:cream,letterSpacing:1,stroke:'#090d0f',strokeThickness:3
    }).setOrigin(0.5).setDepth(54);
    const sub=this.add.text(cx,top+43,'GET THE BAG · GET OUT · BUILD YOUR NAME',{
      fontFamily:'monospace',fontSize:'8px',color:'#c0a86e',letterSpacing:1
    }).setOrigin(0.5).setDepth(54);
    els.push(header,title,sub);

    const buttonH=40,gap=7;
    const contentTop=top+headerH+10;
    const contentBottom=cy+panelH/2-buttonH-22;
    const cardH=(contentBottom-contentTop-gap*(sections.length-1))/sections.length;
    const cardW=panelW-pad*2;

    sections.forEach((section,index)=>{
      const y=contentTop+cardH/2+index*(cardH+gap);
      const accent=index===1?0xc58a68:index===3?0x9b78d0:teal;
      const cardShadow=this.add.rectangle(cx+3,y+3,cardW,cardH,ink,0.55).setDepth(53);
      const card=this.add.rectangle(cx,y,cardW,cardH,0x0d1214,0.94)
        .setDepth(54).setStrokeStyle(1,accent,0.75);
      const badgeSize=Math.min(36,cardH-14);
      const badgeX=cx-cardW/2+badgeSize/2+7;
      const badge=this.add.rectangle(badgeX,y,badgeSize,badgeSize,accent,0.9)
        .setDepth(55).setStrokeStyle(2,ink);
      const number=this.add.text(badgeX,y,section.number,{
        fontFamily:'monospace',fontSize:'11px',fontStyle:'bold',color:'#091012'
      }).setOrigin(0.5).setDepth(56);
      const textX=cx-cardW/2+badgeSize+16;
      const heading=this.add.text(textX,y-cardH/2+9,section.title,{
        fontFamily:'monospace',fontSize:'10px',fontStyle:'bold',
        color:index===3?'#c9a7ef':'#e7c981',letterSpacing:1
      }).setOrigin(0,0).setDepth(56);
      const copy=this.add.text(textX,y-cardH/2+27,section.copy,{
        fontFamily:'monospace',fontSize:panelW<300?'8px':'9px',
        color:muted,lineSpacing:2,wordWrap:{width:cardW-badgeSize-28}
      }).setOrigin(0,0).setDepth(56);
      els.push(cardShadow,card,badge,number,heading,copy);
    });

    const actionW=Math.min(132,panelW-2*pad);
    const actionX=cx+panelW/2-pad-actionW/2;
    const actionY=cy+panelH/2-buttonH/2-8;
    const actionShadow=this.add.rectangle(actionX+3,actionY+4,actionW,buttonH,ink,0.7).setDepth(54);
    const action=this.add.rectangle(actionX,actionY,actionW,buttonH,0x172126,1)
      .setStrokeStyle(2,gold).setDepth(55).setInteractive({cursor:'pointer'});
    const actionText=this.add.text(actionX,actionY,'GOT IT  >>',{
      fontFamily:'monospace',fontSize:'11px',fontStyle:'bold',color:cream,letterSpacing:1
    }).setOrigin(0.5).setDepth(56);
    els.push(actionShadow,action,actionText);
    const tutW=Math.min(150,panelW-2*pad-actionW-10);
    const tutX=cx-panelW/2+pad+tutW/2;
    const tut=this.add.rectangle(tutX,actionY,tutW,buttonH,0x0d1214,1)
      .setStrokeStyle(1.5,teal).setDepth(55).setInteractive({cursor:'pointer'});
    const tutText=this.add.text(tutX,actionY,'REPLAY TUTORIAL',{
      fontFamily:'monospace',fontSize:'10px',fontStyle:'bold',color:'#bfe3df',letterSpacing:1
    }).setOrigin(0.5).setDepth(56);
    els.push(tut,tutText);

    const close=()=>els.forEach(object=>object?.destroy());
    tut.on('pointerup',(pointer,x,y,event)=>{guardModalDismissal(this,pointer,event);close();this.startTutorialFromMenu();});
    action.on('pointerover',()=>action.setFillStyle(gold,0.24));
    action.on('pointerout',()=>action.setFillStyle(0x172126,1));
    action.on('pointerup',(pointer,x,y,event)=>{guardModalDismissal(this,pointer,event);close();});
    veil.on('pointerup',(pointer,x,y,event)=>{guardModalDismissal(this,pointer,event);close();});
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
    };
    musicBg.on('pointerdown', (pointer,x,y,event)=>{consumeModalPointer(pointer,event);applyMusic(!musicOn);});

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
            sound.key !== 'bg_beat4' && sound.key !== 'bg_beat5' && sound.key !== 'bg_beat6' && sound.key !== 'bg_beat7' &&
            sound.key !== 'street_ambience' && sound.key !== 'cars_pass') {
          sound.setMute(!soundsOn);
        }
      });

      // Save preference
      try {
        localStorage.setItem('soundsMuted', String(!soundsOn));
      } catch {}

    };

    // Apply current setting on open
    applySounds(soundsOn);

    soundsBg.on('pointerdown', (pointer,x,y,event)=>{consumeModalPointer(pointer,event);applySounds(!soundsOn);});

    // Close button
    const closeBg = this.add.rectangle(cx, cy + panelH/2 - 22, 92, 28, 0x1a2038, 1).setStrokeStyle(1, PALETTE.stroke).setDepth(52).setInteractive({ useHandCursor:true });
    const closeTx = this.add.text(closeBg.x, closeBg.y, 'Close', { color:'#cbd1ff' }).setOrigin(0.5).setDepth(53);
    const destroyAll = ()=> { [veil, panel, title, titleRule, musicLabel, musicBg, musicTxt, soundsLabel, soundsBg, soundsTxt, closeBg, closeTx].forEach(o=>o?.destroy()); };
    closeBg.on('pointerdown', (pointer,x,y,event)=>{guardModalDismissal(this,pointer,event);destroyAll();});
    veil.on('pointerdown', (pointer,x,y,event)=>{guardModalDismissal(this,pointer,event);destroyAll();});
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
    veil.on('pointerdown', (pointer,x,y,event)=>{guardModalDismissal(this,pointer,event);destroyAll();});
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
    closeBg.on('pointerdown', (pointer,x,y,event)=>{guardModalDismissal(this,pointer,event);destroyAll();});
    veil.on('pointerdown', (pointer,x,y,event)=>{guardModalDismissal(this,pointer,event);destroyAll();});
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
    cancelBg.on('pointerup', (pointer,x,y,event)=>{guardModalDismissal(this,pointer,event);teardown();});
    veil.on('pointerdown', (pointer,x,y,event)=>{guardModalDismissal(this,pointer,event);teardown();});
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
    const arrow = this._tutorialHintArrow;
    if (!arrow?.active || !this._tutorialHintNeeded) return;
    // Menu overlays already use depths 50+. Keep the hint quiet behind them.
    const overlay = this.children.list.some(child => child.active && child.visible && child.depth >= 50);
    arrow.setVisible(!overlay);
    if (!overlay) {
      const pulse = this._tutorialHintReducedMotion ? 1 : 0.65 + 0.35 * Math.sin(this.time.now * Math.PI / 900);
      arrow.setAlpha(pulse);
    }
  }

  reposition(){
    const W = this.scale.width, H = this.scale.height;
    // Rebuild street background at new dimensions
    this.drawStreetBackground();
    const brand = landingLayout(W, H);
    this.positionMenuLogo(brand);
    this.tickerChip?.setPosition(W/2, brand.tickerY);

    // Bottom dock bar (sidewalk strip)
    const dockH = 56;
    this.dockBg?.setPosition(W/2, H - dockH/2);
    this.dockBg?.setSize(W, dockH);
    this.dockEdge?.setPosition(W/2, H - dockH);
    this.dockEdge?.setSize(W, 2);

    // Bottom elements
    const pad = Math.max(8, Math.floor(Math.min(W,H) * 0.02));

    const windowRow = 2;
    this.windowBtn?.setPosition(W/2, brand.menuY + windowRow * brand.rowGap);
    this.tutorialBtn?.setPosition(W/2, brand.menuY + (windowRow + 1) * brand.rowGap);
    this.settingsBtn?.setPosition(W/2, brand.menuY + (windowRow + 2) * brand.rowGap);

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
      this.helpBtn.setPosition(railR - pad - 24 - 56, widgetBottomY); // Left of trophy
      this.helpBtn.setAlpha(1);
    }
    if (this.leaderboardBtn) {
      this.leaderboardBtn.setPosition(railR - pad - 24, widgetBottomY); // Rightmost footer control
      this.leaderboardBtn.setAlpha(1);
    }

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
