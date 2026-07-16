import { isPremiumUser, getCurrentRouteProgress } from '../utils/routeProgress.js';
import ReplaySystem from './ReplaySystem.js';
import { createBottomLeftButtons } from '../utils/authUI.js';

/**
 * GameUI - Handles all UI modals and user interactions
 *
 * Manages weapon selection, power selection, modals, and continue button logic.
 */
export default class GameUI {
  constructor(scene) {
    this.scene = scene;
    this.currentModal = null;
  }

  /**
   * Show a centered modal with title, lines, and buttons
   * Returns { destroy, veil, panel, btnCenters, registerExtra }
   */
  // ---------------------------------------------------------------------
  // Shared modal styling — one consistent look for plug and runner.
  // Role accent: plug = red, runner = blue. Button `variant` picks from a
  // fixed palette so every modal uses the same hierarchy:
  //   primary   — solid accent fill (the "do this" action)
  //   secondary — dark panel with accent stroke
  //   tertiary  — neutral dark gray
  //   danger    — deep red (Exit / destructive)
  //   ghost     — near-invisible, for low-priority actions
  // Explicit b.bg / b.stroke / b.color still override for special cases.
  // ---------------------------------------------------------------------
  theme() {
    const isPlug = this.scene.role === 'plug';
    return {
      isPlug,
      accent:     isPlug ? 0xe14b4b : 0x2f8fe0,
      accentHi:   isPlug ? 0xff6b6b : 0x4db2ff,
      accentTxt:  isPlug ? '#ff9c9c' : '#8fcbff',
      panelBg:    0x0a0d1a,
      panelLine:  0x232a44,
      title:      '#e7ebff',
      body:       '#9aa4cf',
      variants: {
        primary:   { bg: isPlug ? 0xb83a3a : 0x1f6fb8, stroke: isPlug ? 0xff6b6b : 0x4db2ff, color: '#ffffff' },
        secondary: { bg: 0x141a30, stroke: isPlug ? 0x8f4040 : 0x2f6ba0, color: isPlug ? '#ffb4b4' : '#9ad1ff' },
        tertiary:  { bg: 0x161a26, stroke: 0x2b3350, color: '#aab3d6' },
        danger:    { bg: 0x3a1414, stroke: 0x8f2f2f, color: '#ff9c9c' },
        ghost:     { bg: 0x0d101c, stroke: 0x1d2338, color: '#7d86ad' }
      }
    };
  }

  showModal({ title, subtitle = null, lines = [], buttons = [], inputDelay = 700 }) {
    // block world input + hide touch controls
    this.scene.input.keyboard.enabled = false;
    this.scene.suspendTouchUI?.(true);

    const T = this.theme();
    const Z = 20_000; // above touch UI
    const cx = this.scene.cameras.main.centerX;
    const cy = this.scene.cameras.main.centerY;
    const W = this.scene.scale.gameSize.width;
    const H = this.scene.scale.gameSize.height;

    const veil = this.scene.add.rectangle(cx, cy, W, H, 0x000000, 0.82)
      .setScrollFactor(0).setDepth(Z - 1).setInteractive();

    const panelW = Math.min(480, W - 40);
    const baseH = 340;
    const btnH = 38;
    const btnGap = 10;
    const rowCount = buttons.length; // pairs count as one row
    const btnAreaH = rowCount * btnH + Math.max(0, rowCount - 1) * btnGap + 40;
    const panelH = Math.min(baseH + btnAreaH, H - 40);
    const panel = this.scene.add.rectangle(cx, cy, panelW, panelH, T.panelBg, 0.97)
      .setStrokeStyle(2, T.accent, 0.9).setScrollFactor(0).setDepth(Z);

    // header: title, accent underline, optional subtitle
    const titleTxt = this.scene.add.text(cx, cy - panelH / 2 + 30, (title || '').toUpperCase(), {
      color: T.title, fontSize: '21px', fontStyle: 'bold',
      letterSpacing: 2, wordWrap: { width: panelW - 24 }, align: 'center'
    }).setOrigin(0.5).setDepth(Z).setScrollFactor(0);

    const rule = this.scene.add.rectangle(cx, titleTxt.y + 18, Math.min(120, panelW - 80), 2, T.accentHi, 0.9)
      .setScrollFactor(0).setDepth(Z);

    const content = [rule];
    let y = titleTxt.y + 34;
    if (subtitle) {
      content.push(this.scene.add.text(cx, y, subtitle, {
        color: T.accentTxt, fontSize: '13px', wordWrap: { width: panelW - 32 }, align: 'center'
      }).setOrigin(0.5).setDepth(Z).setScrollFactor(0));
      y += 22;
    }
    for (const s of lines) {
      content.push(
        this.scene.add.text(cx, y, s, { color: T.body, fontSize: '14px', wordWrap: { width: panelW - 32 }, align: 'center' })
          .setOrigin(0.5).setDepth(Z).setScrollFactor(0)
      );
      y += 19;
    }

    const btnObjs = [];
    const btnCenters = [];
    const btnW = Math.min(280, panelW - 40);
    const totalH = rowCount * btnH + Math.max(0, rowCount - 1) * btnGap;
    let by = cy + panelH / 2 - totalH - 50;

    const makeButton = (b, x, w, yPos) => {
      const v = (b.variant && T.variants[b.variant]) || null;
      const fill = b.bg ?? v?.bg ?? 0x161a26;
      const strk = b.stroke ?? v?.stroke ?? 0x2b3350;
      const col  = b.color ?? v?.color ?? '#aab3d6';

      const bg = this.scene.add.rectangle(x, yPos, w, btnH, fill, 1)
        .setStrokeStyle(1.5, strk).setScrollFactor(0).setDepth(Z);

      if (!b.disabled) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => bg.setStrokeStyle(2, strk).setFillStyle(fill, 0.85));
        bg.on('pointerout',  () => bg.setStrokeStyle(1.5, strk).setFillStyle(fill, 1));
        bg.on('pointerdown', () => {
          if (b.keepOpen) { b.onClick && b.onClick(this.currentModal); return; }
          destroy(); b.onClick && b.onClick();
        });
      } else {
        bg.setAlpha(0.45);
      }

      const t = this.scene.add.text(x, yPos, b.label, {
        color: col, fontSize: '14px', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(Z).setScrollFactor(0);
      if (b.disabled) t.setAlpha(0.45);

      btnObjs.push(bg, t);
      btnCenters.push({ x, y: yPos });
    };

    for (const b of buttons) {
      if (b.pair) {
        // two half-width buttons on one row
        const halfW = (btnW - 10) / 2;
        makeButton(b.pair[0], cx - halfW / 2 - 5, halfW, by);
        makeButton(b.pair[1], cx + halfW / 2 + 5, halfW, by);
      } else {
        makeButton(b, cx, btnW, by);
      }
      by += btnH + btnGap;
    }

    const extras = [];
    const registerExtra = (...objs) => extras.push(...objs);

    // Input grace period: players tap rapidly during a round, and if the
    // round ends mid-tap the next tap can land on a button (e.g. Exit)
    // before they even see the modal. An invisible full-screen blocker
    // above ALL modal content (including custom buttons added later via
    // registerExtra) swallows every pointer event for `inputDelay` ms,
    // then arms the modal. Standard buttons render dimmed until armed.
    let blocker = null;
    if (inputDelay > 0) {
      blocker = this.scene.add.rectangle(cx, cy, W, H, 0x000000, 0.001)
        .setScrollFactor(0).setDepth(Z + 500).setInteractive();
      btnObjs.forEach(o => { o._baseAlpha = o.alpha; o.setAlpha(o.alpha * 0.55); });
      this.scene.time.delayedCall(inputDelay, () => {
        if (blocker?.active) blocker.destroy();
        blocker = null;
        btnObjs.forEach(o => { if (o?.active) o.setAlpha(o._baseAlpha ?? 1); });
      });
    }

    const allObjs = () => [veil, panel, titleTxt, ...content, ...btnObjs, ...extras];

    const destroy = () => {
      allObjs().forEach(o => o?.destroy?.());
      if (blocker?.active) blocker.destroy();
      this.scene.suspendTouchUI?.(false);
      // inputs re-enabled by startMatch()
    };

    // Hide/show the whole modal without destroying it — used while a replay
    // plays on top, then restored when the viewer comes back. On hide we
    // remember each object's visibility and restore exactly that on show,
    // so intentionally-hidden pieces (e.g. power-up count badges) don't
    // suddenly appear.
    let visMemo = null;
    const setVisible = (v) => {
      const objs = [...allObjs(), blocker].filter(o => o?.active);
      if (!v) {
        visMemo = new Map(objs.map(o => [o, o.visible]));
        objs.forEach(o => o.setVisible(false));
      } else {
        objs.forEach(o => o.setVisible(visMemo?.has(o) ? visMemo.get(o) : true));
        visMemo = null;
      }
    };

    this.currentModal = { destroy, veil, panel, btnCenters, registerExtra, setVisible };
    return this.currentModal;
  }

  /**
   * Prompt plug player to select a weapon (pistol, doublebarrel, laser, rifle)
   */
  promptPlugWeaponSelection(onDone) {
    if (this.scene.role !== 'plug') {
      onDone?.();
      return;
    }

    const options = this.scene.availableGuns || ['pistol'];
    if (options.length <= 1) {
      this.scene.selectLoadout(options[0]);
      onDone?.();
      return;
    }

    this.scene.roundPausedForMenu = true;
    this.scene.destroyAbilityButton?.();
    this.scene.runnerAbilityText?.setVisible(false);
    const roundLabel = `ROUND ${this.scene.pveRound || 1}`;

    const modal = this.showModal({
      title: roundLabel,
      subtitle: 'Select your weapon for this round.',
      buttons: []
    });
    const { destroy, registerExtra, panel } = modal;
    const T = this.theme();
    const cx = panel?.x ?? this.scene.cameras.main.centerX;
    const cy = panel?.y ?? this.scene.cameras.main.centerY;
    const panelW = (panel?.width ?? Math.min(this.scene.scale.width - 40, 480));
    const vw = this.scene.scale.gameSize.width;
    const isNarrow = vw < 480 || panelW < 420;

    // Layout: stack as 2x2 grid on narrow/mobile, single row otherwise
    const cols = isNarrow ? Math.min(2, options.length) : Math.min(options.length, 4);
    const rows = Math.ceil(options.length / cols);

    // Match powerup button spacing for consistency
    const weaponBtnW = 110; // Smaller width
    const weaponBtnH = 38; // Smaller height
    const gridGapX = 130; // Gap between button centers (weapon width + spacing)
    const totalW = (cols - 1) * gridGapX;
    const startX = cx - totalW / 2;
    // Move up for rounds 2+ to use empty space (round 1 has Continue button in that space)
    const firstRowY = (this.scene.pveRound && this.scene.pveRound > 1) ? cy - 50 : cy + (rows > 1 ? -10 : 0);
    const rowGapY = 50; // Tighter spacing

    let selectedWeapon = null;

    const select = (weapon) => {
      selectedWeapon = weapon;
      this.scene.selectLoadout(weapon);

      // Update all weapon button styles to show selection
      weaponButtons.forEach((btnData) => {
        if (btnData.weapon === weapon) {
          // Highlight selected weapon
          btnData.bg.setFillStyle(0x1d2542);
          btnData.bg.setStrokeStyle(2, T.accentHi); // role accent
        } else {
          // Dim unselected weapons
          btnData.bg.setFillStyle(0x1a2038);
          btnData.bg.setStrokeStyle(1, 0x2f3660);
        }
      });

      // Enable Start Round button (weapon selection always allows starting)
      if (startRoundButton) {
        startRoundButton.bg.setFillStyle(T.variants.primary.bg); // role accent when ready
        startRoundButton.bg.setStrokeStyle(2, T.accentHi);
        startRoundButton.text.setColor('#ffffff');
      }
    };

    const friendlyName = (name) => ({
      pistol: 'Pistol',
      doublebarrel: 'Triple Barrel',
      laser: 'Laser',
      rifle: 'Rifle'
    })[name] || (name[0].toUpperCase() + name.slice(1));

    const weaponButtons = []; // Track weapon buttons for selection styling
    let startRoundButton = null; // Reference to Start Round button

    // Add Continue button ABOVE weapons (Round 1 only)
    let firstRowY_adjusted = firstRowY;
    if (this.scene.pveRound === 1) {
      let continueData = null;
      let continueLabel = null;

      // Check for active session first (highest priority)
      if (this.scene.savedSession && this.scene.savedSession.pveRound > 1) {
        continueData = this.scene.savedSession;
        continueLabel = `Continue from Round ${this.scene.savedSession.pveRound}`;
      }
      // Otherwise check for route progress (if premium user)
      else if (isPremiumUser()) {
        const routeProgress = getCurrentRouteProgress();
        const highestRound = this.scene.role === 'runner' ? routeProgress.runnerHighestRound : routeProgress.plugHighestRound;
        if (highestRound > 1) {
          continueData = {
            pveRound: highestRound,
            pveSessionStash: 0,
            pveSessionRep: 0,
            pveBestRound: highestRound
          };
          continueLabel = `Continue from Round ${highestRound}`;
        }
      }

      if (continueData && continueLabel) {
        const continueY = cy - 50; // Above weapon buttons
        const continueW = Math.min(280, panelW - 80);
        const continueH = 36;

        const continueBg = this.scene.add.rectangle(cx, continueY, continueW, continueH, 0x16a34a, 1)
          .setStrokeStyle(2, 0x22c55e)
          .setDepth(20004)
          .setInteractive({ useHandCursor: true });

        const continueText = this.scene.add.text(cx, continueY, continueLabel, {
          color: '#ffffff',
          fontSize: '14px',
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(20005);

        continueBg.on('pointerdown', (pointer, localX, localY, event) => {
          if (event) event.stopPropagation();
          destroy();
          this.scene.scene.restart({
            mode: 'pve',
            role: this.scene.role,
            ...continueData
          });
        });

        registerExtra(continueBg, continueText);
        firstRowY_adjusted = firstRowY + 10; // Push weapon buttons down slightly
      }
    }

    let lastRowY = firstRowY_adjusted;
    options.forEach((weapon, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;

      // Center third button (rifle) horizontally if there are 3 weapons in 2x2 grid
      let x;
      if (options.length === 3 && cols === 2 && idx === 2) {
        // Center the third button between the first two
        x = cx; // Center of panel
      } else {
        x = startX + c * gridGapX;
      }

      const y = firstRowY_adjusted + r * rowGapY;
      lastRowY = y;

      const locked = this.scene.isGunLocked?.(weapon);
      const label = friendlyName(weapon);

      if (locked) {
        // Visible-but-locked: grayed with the unlock round, so players see
        // what they're working toward (an invisible weapon is just a
        // missing button). Not selectable.
        const unlockAt = this.scene.gunUnlockRound?.[weapon];
        const btn = this.scene.add.rectangle(x, y, weaponBtnW, weaponBtnH, 0x11141d, 1)
          .setStrokeStyle(1, 0x232a3c)
          .setDepth(20004);
        const txt = this.scene.add.text(x, y - 7, label, { color: '#565f75', fontSize: '13px' })
          .setOrigin(0.5).setDepth(20005);
        const sub = this.scene.add.text(x, y + 9, `\u{1F512} Round ${unlockAt}`, { color: '#565f75', fontSize: '10px' })
          .setOrigin(0.5).setDepth(20005);
        registerExtra(btn, txt, sub);
        return; // no selection handler, not tracked for restyle
      }

      const btn = this.scene.add.rectangle(x, y, weaponBtnW, weaponBtnH, 0x1a2038, 1)
        .setStrokeStyle(1, 0x2f3660)
        .setDepth(20004)
        .setInteractive({ useHandCursor: true });
      const txt = this.scene.add.text(x, y, label, { color: '#cbd1ff', fontSize: '14px' })
        .setOrigin(0.5).setDepth(20005);

      weaponButtons.push({ weapon, bg: btn, text: txt });
      btn.on('pointerdown', () => select(weapon));
      registerExtra(btn, txt);
    });

    // Add Start Round button at bottom (always shown)
    const startY = lastRowY + weaponBtnH / 2 + 50; // Below weapon buttons
    const startW = Math.min(280, panelW - 80);
    const startH = 40;

    // Start disabled (gray) until weapon selected
    const startBg = this.scene.add.rectangle(cx, startY, startW, startH, 0x374151, 1)
      .setStrokeStyle(2, 0x4b5563)
      .setDepth(20004)
      .setInteractive({ useHandCursor: true });

    const startText = this.scene.add.text(cx, startY, 'START ROUND', {
      color: '#9ca3af',
      fontSize: '16px',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(20005);

    startRoundButton = { bg: startBg, text: startText };

    startBg.on('pointerdown', (pointer, localX, localY, event) => {
      if (event) event.stopPropagation();
      // Only start if weapon selected
      if (!selectedWeapon) return;

      this.scene.input.keyboard.enabled = true;
      destroy();
      this.scene.roundPausedForMenu = false;
      onDone?.();
    });

    registerExtra(startBg, startText);

    // Add Main Menu button below Start Round button
    const menuBtnW = startW;
    const menuBtnH = 32;
    const menuBtnY = startY + startH / 2 + menuBtnH / 2 + 12; // Below Start Round with gap

    // Watch Last Round (when a replay exists) sits beside Main Menu
    // Only offer replays recorded in the role we're about to play
    const hasReplay = ReplaySystem.hasReplay(this.scene.role);
    const halfW = (menuBtnW - 10) / 2;
    if (hasReplay) {
      const repX = cx - halfW / 2 - 5;
      const repBg = this.scene.add.rectangle(repX, menuBtnY, halfW, menuBtnH, 0x141a30, 0.95)
        .setStrokeStyle(1, T.accentHi, 0.8)
        .setDepth(20004)
        .setInteractive({ useHandCursor: true });
      const repText = this.scene.add.text(repX, menuBtnY, '\u25B6 Watch Replay', {
        color: T.accentTxt,
        fontSize: '13px',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(20005);
      repBg.on('pointerdown', (pointer, localX, localY, event) => {
        if (event) event.stopPropagation();
        modal.setVisible(false);
        ReplaySystem.play(this.scene, { onDone: () => modal.setVisible(true) });
      });
      registerExtra(repBg, repText);
    }

    const menuX = hasReplay ? cx + halfW / 2 + 5 : cx;
    const menuBg = this.scene.add.rectangle(menuX, menuBtnY, hasReplay ? halfW : menuBtnW, menuBtnH, 0x11141d, 0.95)
      .setStrokeStyle(1, 0x2b3350)
      .setDepth(20004)
      .setInteractive({ useHandCursor: true });

    const menuText = this.scene.add.text(menuX, menuBtnY, 'Main Menu', {
      color: '#aab3d6',
      fontSize: '13px',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(20005);

    menuBg.on('pointerdown', (pointer, localX, localY, event) => {
      if (event) event.stopPropagation();
      destroy();
      this.scene.scene.start('MENU');
    });

    registerExtra(menuBg, menuText);

    // Add game tip below Main Menu button (rounds 2+)
    if (this.scene.pveRound && this.scene.pveRound > 1) {
      const tips = [
        "💡 PRO TIP: Two AI runners appear starting after round 12",
        "💡 PRO TIP: Pistol is balanced with less range but more ammo",
        "💡 PRO TIP: Triple Barrel spreads wide",
        "💡 PRO TIP: Rifle shoots far but has less ammo",
        "💡 PRO TIP: Corner the runner to limit their escape routes",
        "💡 PRO TIP: Predict movement patterns instead of just chasing",
        "💡 PRO TIP: AI runners get 2 pixels/second faster each round",
        "💡 PRO TIP: AI reaction time improves by 15ms per round",
        "💡 PRO TIP: AI vision range extends by 4 pixels each round",
        "💡 PRO TIP: Your best round unlocks as a Continue option",
        "💡 PRO TIP: Each missed shot decreases REP score by 0.03",
        "💡 PRO TIP: Quick kills under 20 seconds earn +2.0 bonus REP",
        "💡 PRO TIP: 80%+ accuracy earns +1.5 bonus REP",
        "💡 PRO TIP: Eliminating runner before stash pickup earns +1.0 REP",
        "💡 PRO TIP: Stash is only awarded on first-time round completions",
        "💡 PRO TIP: AI learns to avoid your shooting patterns over time",
        "💡 PRO TIP: Lead your shots - aim where they're going, not where they are",
        "💡 PRO TIP: Get closer to shoot",
        "💡 PRO TIP: Out of ammo? Ram into the runner for a melee attack"
      ];

      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      const tipY = menuBtnY + menuBtnH / 2 + 20; // Below Main Menu button
      const maxWidth = panelW - 40; // Use full panel width with padding

      // Pro tip text in gold with word wrapping
      const tipText = this.scene.add.text(cx, tipY, randomTip, {
        color: '#fbbf24',
        fontSize: '12px',
        align: 'center',
        wordWrap: { width: maxWidth }
      }).setOrigin(0.5, 0).setDepth(20005);

      registerExtra(tipText);
    }

    // Add Claim/Settings buttons inside panel at top-left (all rounds)
    const actualPanelW = panel?.width ?? panelW;
    const actualPanelH = panel?.height ?? panelW; // Use actual panel height from modal
    const bottomButtons = createBottomLeftButtons(this.scene, cx, cy, actualPanelW, actualPanelH, 20005);
    registerExtra(...bottomButtons);
  }

  /**
   * Prompt runner player to select TWO powers (order matters)
   */
  promptRunnerPowerSelection(onDone) {
    if (this.scene.role !== 'runner') {
      onDone?.();
      return;
    }

    // Power definitions with symbols and colors
    const powers = [
      { id: 'phase', name: 'PHASE', symbol: '👻', color: '#a78bfa' },  // purple ghost
      { id: 'dash', name: 'DASH', symbol: '⚡', color: '#fbbf24' },     // yellow lightning
      { id: 'decoy', name: 'DECOY', symbol: '🎭', color: '#60a5fa' }   // blue mask
    ];

    this.scene.roundPausedForMenu = true;

    // Show round number if in PvE mode
    const titleText = this.scene.mode === 'pve' ? `ROUND ${this.scene.pveRound}` : 'Power Selection';

    const modal = this.showModal({
      title: titleText,
      subtitle: 'Pick 2 Power-Ups',
      buttons: []
    });
    const { destroy, registerExtra, panel } = modal;
    const T = this.theme();
    const cx = panel?.x ?? this.scene.cameras.main.centerX;
    const cy = panel?.y ?? this.scene.cameras.main.centerY;

    // Smaller buttons positioned higher
    const btnWidth = 90;
    const btnHeight = 70;
    const gap = 105;
    const startX = cx - gap * (powers.length - 1) / 2;
    // Move up for rounds 2+ to use empty space (round 1 has Continue button in that space)
    let y = (this.scene.pveRound && this.scene.pveRound > 1) ? cy - 50 : cy + 10;

    // Add Continue button ABOVE powers (Round 1 only)
    if (this.scene.pveRound === 1) {
      let continueData = null;
      let continueLabel = null;

      // Check for active session first (highest priority)
      if (this.scene.savedSession && this.scene.savedSession.pveRound > 1) {
        continueData = this.scene.savedSession;
        continueLabel = `Continue from Round ${this.scene.savedSession.pveRound}`;
      }
      // Otherwise check for route progress (if premium user)
      else if (isPremiumUser()) {
        const routeProgress = getCurrentRouteProgress();
        const highestRound = this.scene.role === 'runner' ? routeProgress.runnerHighestRound : routeProgress.plugHighestRound;
        if (highestRound > 1) {
          continueData = {
            pveRound: highestRound,
            pveSessionStash: 0,
            pveSessionRep: 0,
            pveBestRound: highestRound
          };
          continueLabel = `Continue from Round ${highestRound}`;
        }
      }

      if (continueData && continueLabel) {
        const continueY = cy - 90; // Above power buttons
        const continueW = Math.min(280, panel?.width - 80 || 200);
        const continueH = 36;

        const continueBg = this.scene.add.rectangle(cx, continueY, continueW, continueH, 0x16a34a, 1)
          .setStrokeStyle(2, 0x22c55e)
          .setDepth(20004)
          .setInteractive({ useHandCursor: true });

        const continueText = this.scene.add.text(cx, continueY, continueLabel, {
          color: '#ffffff',
          fontSize: '14px',
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(20005);

        continueBg.on('pointerdown', (pointer, localX, localY, event) => {
          if (event) event.stopPropagation();
          destroy();
          this.scene.scene.restart({
            mode: 'pve',
            role: this.scene.role,
            ...continueData
          });
        });

        registerExtra(continueBg, continueText);
        y = cy - 30; // Push power buttons down slightly if Continue button is shown
      }
    }

    const chosen = [];
    const badges = new Map(); // Map of powerId -> { badge1, badge2 }
    let startRoundButton = null; // Reference to Start Round button for enabling/disabling

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

    const select = (power) => {
      // Count how many times this power is currently selected
      const count = chosen.filter(id => id === power.id).length;

      if (count === 0) {
        // Not selected yet - add first instance if we have room
        if (chosen.length >= 2) return;
        chosen.push(power.id);
      } else if (count === 1) {
        // Selected once - toggle to either 2 selections or 0
        if (chosen.length >= 2) {
          // Already at max, cycle back to 0 (deselect completely)
          const idx = chosen.indexOf(power.id);
          chosen.splice(idx, 1);
        } else {
          // Can add second instance
          chosen.push(power.id);
        }
      } else if (count === 2) {
        // Selected twice - click removes last instance
        const idx = chosen.lastIndexOf(power.id);
        chosen.splice(idx, 1);
      }

      updateAllBadges();

      // Update Start Round button state
      if (startRoundButton) {
        if (chosen.length === 2) {
          startRoundButton.bg.setFillStyle(T.variants.primary.bg); // role accent when ready
          startRoundButton.bg.setStrokeStyle(2, T.accentHi);
          startRoundButton.text.setColor('#ffffff');
        } else {
          startRoundButton.bg.setFillStyle(0x374151); // Gray when disabled
          startRoundButton.bg.setStrokeStyle(2, 0x4b5563);
          startRoundButton.text.setColor('#9ca3af');
        }
      }
    };

    powers.forEach((power, idx) => {
      const x = startX + gap * idx;

      // Button background with power color tint (using smaller height)
      const btn = this.scene.add.rectangle(x, y, btnWidth, btnHeight, 0x14202f, 1)
        .setStrokeStyle(2, parseInt(power.color.replace('#', '0x')))
        .setDepth(20004)
        .setInteractive({ useHandCursor: true });

      // Symbol (emoji) above name - smaller
      const symbol = this.scene.add.text(x, y - 12, power.symbol, {
        fontSize: '28px'
      }).setOrigin(0.5).setDepth(20005);

      // Power name below symbol - smaller
      const txt = this.scene.add.text(x, y + 18, power.name, {
        color: power.color,
        fontSize: '14px',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(20005);

      // Badge 1 - Green background (first selection, positioned on LEFT)
      const badge1 = this.scene.add.text(x + (btnWidth / 2) - 24, y - 30, '1', {
        color: '#ffffff',
        fontSize: '14px',
        fontStyle: 'bold',
        backgroundColor: '#10b981',
        padding: { x: 5, y: 3 }
      }).setOrigin(0.5).setDepth(20006).setVisible(false);

      // Badge 2 - Orange background (second selection, positioned on RIGHT)
      const badge2 = this.scene.add.text(x + (btnWidth / 2) - 8, y - 30, '2', {
        color: '#ffffff',
        fontSize: '14px',
        fontStyle: 'bold',
        backgroundColor: '#f97316', // Orange color for second selection
        padding: { x: 5, y: 3 }
      }).setOrigin(0.5).setDepth(20006).setVisible(false);

      badges.set(power.id, { badge1, badge2 });
      btn.on('pointerdown', () => select(power));
      registerExtra(btn, symbol, txt, badge1, badge2);
    });

    // Add Start Round button at bottom (always shown)
    const startY = y + btnHeight / 2 + 50; // Below power buttons
    const startW = Math.min(280, panel?.width - 80 || 200);
    const startH = 40;

    // Start disabled (gray) until 2 powers selected
    const startBg = this.scene.add.rectangle(cx, startY, startW, startH, 0x374151, 1)
      .setStrokeStyle(2, 0x4b5563)
      .setDepth(20004)
      .setInteractive({ useHandCursor: true });

    const startText = this.scene.add.text(cx, startY, 'START ROUND', {
      color: '#9ca3af',
      fontSize: '16px',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(20005);

    startRoundButton = { bg: startBg, text: startText };

    startBg.on('pointerdown', (pointer, localX, localY, event) => {
      if (event) event.stopPropagation();
      // Only start if 2 powers selected
      if (chosen.length !== 2) return;

      this.scene.runnerPowersSelected = chosen.slice();
      this.scene.runnerPowersConsumed = [false, false];
      this.scene.input.keyboard.enabled = true;
      destroy();
      this.scene.roundPausedForMenu = false;
      onDone?.();
    });

    registerExtra(startBg, startText);

    // Add Main Menu button below Start Round button
    const menuBtnW = startW;
    const menuBtnH = 32;
    const menuBtnY = startY + startH / 2 + menuBtnH / 2 + 12; // Below Start Round with gap

    // Watch Last Round (when a replay exists) sits beside Main Menu
    // Only offer replays recorded in the role we're about to play
    const hasReplay = ReplaySystem.hasReplay(this.scene.role);
    const halfW = (menuBtnW - 10) / 2;
    if (hasReplay) {
      const repX = cx - halfW / 2 - 5;
      const repBg = this.scene.add.rectangle(repX, menuBtnY, halfW, menuBtnH, 0x141a30, 0.95)
        .setStrokeStyle(1, T.accentHi, 0.8)
        .setDepth(20004)
        .setInteractive({ useHandCursor: true });
      const repText = this.scene.add.text(repX, menuBtnY, '\u25B6 Watch Replay', {
        color: T.accentTxt,
        fontSize: '13px',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(20005);
      repBg.on('pointerdown', (pointer, localX, localY, event) => {
        if (event) event.stopPropagation();
        modal.setVisible(false);
        ReplaySystem.play(this.scene, { onDone: () => modal.setVisible(true) });
      });
      registerExtra(repBg, repText);
    }

    const menuX = hasReplay ? cx + halfW / 2 + 5 : cx;
    const menuBg = this.scene.add.rectangle(menuX, menuBtnY, hasReplay ? halfW : menuBtnW, menuBtnH, 0x11141d, 0.95)
      .setStrokeStyle(1, 0x2b3350)
      .setDepth(20004)
      .setInteractive({ useHandCursor: true });

    const menuText = this.scene.add.text(menuX, menuBtnY, 'Main Menu', {
      color: '#aab3d6',
      fontSize: '13px',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(20005);

    menuBg.on('pointerdown', (pointer, localX, localY, event) => {
      if (event) event.stopPropagation();
      destroy();
      this.scene.scene.start('MENU');
    });

    registerExtra(menuBg, menuText);

    // Add game tip below Main Menu button (rounds 2+)
    if (this.scene.pveRound && this.scene.pveRound > 1) {
      const tips = [
        "💡 PRO TIP: Two AI opponents appear starting after round 12",
        "💡 PRO TIP: Phase makes you intangible, pass through walls. Make bullets miss",
        "💡 PRO TIP: Dash teleports you quickly a few steps in the direction you were going",
        "💡 PRO TIP: Decoy creates a fake runner to confuse and distract the plug",
        "💡 PRO TIP: AI plug gets 2 pixels/second faster each round",
        "💡 PRO TIP: AI plug shoots 0.04 seconds faster each round",
        "💡 PRO TIP: AI plug accuracy improves by 2.5% per round",
        "💡 PRO TIP: AI plug vision range extends by 4 pixels each round",
        "💡 PRO TIP: Your best round unlocks as a Continue option for quick restarts",
        "💡 PRO TIP: Grab the stash and reach the extraction car to win the round",
        "💡 PRO TIP: Round ends when runner extracts or gets eliminated",
        "💡 PRO TIP: REP multiplier decreases when replaying rounds you've already beaten",
        "💡 PRO TIP: Stash is only awarded on first-time round completions",
        "💡 PRO TIP: You can use the same power up twice in one round",
        "💡 PRO TIP: The plug learns your patterns - stay unpredictable to survive",
        "💡 PRO TIP: Corner camping makes you an easy target for the plug",
        "💡 PRO TIP: Moving targets are much harder to hit than stationary ones"
      ];

      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      const tipY = menuBtnY + menuBtnH / 2 + 20; // Below Main Menu button
      const maxWidth = Math.min(440, this.scene.scale.width - 80); // Use full width with padding

      // Pro tip text in gold with word wrapping
      const tipText = this.scene.add.text(cx, tipY, randomTip, {
        color: '#fbbf24',
        fontSize: '12px',
        align: 'center',
        wordWrap: { width: maxWidth }
      }).setOrigin(0.5, 0).setDepth(20005);

      registerExtra(tipText);
    }

    // Add Claim/Settings buttons inside panel at top-left (all rounds)
    const actualPanelW = panel?.width ?? Math.min(480, this.scene.scale.width - 40);
    const actualPanelH = panel?.height ?? 420; // Use actual panel height from modal
    const bottomButtons = createBottomLeftButtons(this.scene, cx, cy, actualPanelW, actualPanelH, 20005);
    registerExtra(...bottomButtons);
  }

  /**
   * Cleanup modal references
   */
  cleanup() {
    this.currentModal?.destroy?.();
    this.currentModal = null;
  }
}