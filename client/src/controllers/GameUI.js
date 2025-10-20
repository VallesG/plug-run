import { isPremiumUser, getCurrentRouteProgress } from '../utils/routeProgress.js';

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
  showModal({ title, lines = [], buttons = [] }) {
    // block world input + hide touch controls
    this.scene.input.keyboard.enabled = false;
    this.scene.suspendTouchUI?.(true);

    const Z = 20_000; // above touch UI
    const cx = this.scene.cameras.main.centerX;
    const cy = this.scene.cameras.main.centerY;
    const W = this.scene.scale.gameSize.width;
    const H = this.scene.scale.gameSize.height;

    const veil = this.scene.add.rectangle(cx, cy, W, H, 0x000000, 0.82)
      .setScrollFactor(0).setDepth(Z - 1).setInteractive();

    const panelW = Math.min(480, W - 40);
    // Increased panel height to accommodate vertically stacked buttons
    const baseH = 240; // Increased from 180 to fit continue button at bottom
    const btnH = 36;
    const btnGap = 10;
    const btnAreaH = buttons.length * btnH + (buttons.length - 1) * btnGap + 40;
    const panelH = Math.min(baseH + btnAreaH, H - 40);
    const panel = this.scene.add.rectangle(cx, cy, panelW, panelH, 0x0a0d1a, 0.96)
      .setStrokeStyle(2, 0x2f3660).setScrollFactor(0).setDepth(Z);

    const titleTxt = this.scene.add.text(cx, cy - panelH / 2 + 28, title || '', {
      color: '#cbd1ff', fontSize: '22px', wordWrap: { width: panelW - 24 }
    }).setOrigin(0.5).setDepth(Z).setScrollFactor(0);

    const content = [];
    let y = titleTxt.y + 26;
    for (const s of lines) {
      content.push(
        this.scene.add.text(cx, y, s, { color: '#aab5ff', fontSize: '14px', wordWrap: { width: panelW - 24 } })
          .setOrigin(0.5).setDepth(Z).setScrollFactor(0)
      );
      y += 18;
    }

    const btnObjs = [];
    const btnCenters = [];
    // Vertical stacking: wider buttons, stacked vertically
    const btnW = Math.min(280, panelW - 40);
    const totalH = buttons.length * btnH + (buttons.length - 1) * btnGap;
    const bx = cx;
    // Start buttons higher up (increased offset from bottom)
    let by = cy + panelH / 2 - totalH - 50;

    for (const b of buttons) {
      const bg = this.scene.add.rectangle(bx, by, btnW, btnH, b.bg ?? 0x1a2038, 1)
        .setStrokeStyle(1, b.stroke ?? 0x2f3660).setScrollFactor(0).setDepth(Z)
        .setInteractive({ useHandCursor: true });
      const t = this.scene.add.text(bx, by, b.label, { color: b.color ?? '#cbd1ff', fontSize: '14px' })
        .setOrigin(0.5).setDepth(Z).setScrollFactor(0);

      bg.on('pointerdown', () => { destroy(); b.onClick && b.onClick(); });

      btnObjs.push(bg, t);
      btnCenters.push({ x: bx, y: by });
      by += btnH + btnGap; // Stack vertically instead of horizontally
    }

    const extras = [];
    const registerExtra = (...objs) => extras.push(...objs);

    const destroy = () => {
      [veil, panel, titleTxt, ...content, ...btnObjs, ...extras].forEach(o => o?.destroy?.());
      this.scene.suspendTouchUI?.(false);
      // inputs re-enabled by startMatch()
    };

    this.currentModal = { destroy, veil, panel, btnCenters, registerExtra };
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
      lines: ['Select your weapon for this round.', ''],
      buttons: []
    });
    const { destroy, registerExtra, panel } = modal;
    const cx = panel?.x ?? this.scene.cameras.main.centerX;
    const cy = panel?.y ?? this.scene.cameras.main.centerY;
    const panelW = (panel?.width ?? Math.min(this.scene.scale.width - 40, 480));
    const vw = this.scene.scale.gameSize.width;
    const isNarrow = vw < 480 || panelW < 420;

    // Layout: stack as 2x2 grid on narrow/mobile, single row otherwise
    const cols = isNarrow ? Math.min(2, options.length) : Math.min(options.length, 4);
    const rows = Math.ceil(options.length / cols);

    // Smaller buttons positioned higher
    const gridGapX = Math.min(115, Math.max(80, panelW / Math.max(cols, 1) * 0.65));
    const totalW = (cols - 1) * gridGapX;
    const startX = cx - totalW / 2;
    const firstRowY = cy + (rows > 1 ? -10 : 0); // Moved up
    const rowGapY = 50; // Tighter spacing
    const weaponBtnW = 110; // Smaller width
    const weaponBtnH = 38; // Smaller height

    const select = (weapon) => {
      this.scene.selectLoadout(weapon);
      this.scene.input.keyboard.enabled = true;
      destroy();
      this.scene.roundPausedForMenu = false;
      onDone?.();
    };

    const friendlyName = (name) => ({
      pistol: 'Pistol',
      doublebarrel: 'Double Barrel',
      laser: 'Laser',
      rifle: 'Rifle'
    })[name] || (name[0].toUpperCase() + name.slice(1));

    let lastRowY = firstRowY;
    options.forEach((weapon, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      const x = startX + c * gridGapX;
      const y = firstRowY + r * rowGapY;
      lastRowY = y;

      const btn = this.scene.add.rectangle(x, y, weaponBtnW, weaponBtnH, 0x1a2038, 1)
        .setStrokeStyle(1, 0x2f3660)
        .setDepth(20004)
        .setInteractive({ useHandCursor: true });
      const label = friendlyName(weapon);
      const txt = this.scene.add.text(x, y, label, { color: '#cbd1ff', fontSize: '14px' })
        .setOrigin(0.5).setDepth(20005);
      btn.on('pointerdown', () => select(weapon));
      registerExtra(btn, txt);
    });

    // Add Continue button at bottom (session priority, then route progress for premium)
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
        const continueY = lastRowY + weaponBtnH / 2 + 45; // Below weapon buttons
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

        continueBg.on('pointerdown', () => {
          destroy();
          this.scene.scene.restart({
            mode: 'pve',
            role: this.scene.role,
            ...continueData
          });
        });

        registerExtra(continueBg, continueText);
      }
    }
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
      lines: ['Pick 2 Power-Ups'],
      buttons: []
    });
    const { destroy, registerExtra, panel } = modal;
    const cx = panel?.x ?? this.scene.cameras.main.centerX;
    const cy = panel?.y ?? this.scene.cameras.main.centerY;

    // Smaller buttons positioned higher
    const btnWidth = 90;
    const btnHeight = 70;
    const gap = 105;
    const startX = cx - gap * (powers.length - 1) / 2;
    const y = cy + 10; // Moved up from cy + 40

    const chosen = [];
    const badges = new Map(); // Map of powerId -> { badge1, badge2 }

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

      if (chosen.length === 2) {
        this.scene.runnerPowersSelected = chosen.slice();
        this.scene.runnerPowersConsumed = [false, false];
        // Add delay so user can see both badges before modal closes
        this.scene.time.delayedCall(600, () => {
          this.scene.input.keyboard.enabled = true;
          destroy();
          this.scene.roundPausedForMenu = false;
          onDone?.();
        });
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

    // Add Continue button at bottom (session priority, then route progress for premium)
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
        const continueY = y + btnHeight / 2 + 45; // Below power buttons
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

        continueBg.on('pointerdown', () => {
          destroy();
          this.scene.scene.restart({
            mode: 'pve',
            role: this.scene.role,
            ...continueData
          });
        });

        registerExtra(continueBg, continueText);
      }
    }
  }

  /**
   * Cleanup modal references
   */
  cleanup() {
    this.currentModal?.destroy?.();
    this.currentModal = null;
  }
}
