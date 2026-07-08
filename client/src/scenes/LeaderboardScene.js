import Phaser from 'phaser';
import {
  getTopScores, getUserRank, getUserScore,
  getAllTimeTopScores, getAllTimeRank, getAllTimeScore,
  getGlobalDailyLeaderboard, getGlobalAllTimeLeaderboard,
  getGlobalDailyRank, getGlobalAllTimeRank,
  formatNumber
} from '../utils/leaderboardManager.js';
import { getCurrentRouteID } from '../utils/seededRandom.js';
import { getUsername, getUserID, getCurrentUser, getCurrentUserSync } from '../utils/userManager.js';
import { trackLeaderboardView } from '../utils/analytics.js';
import { createPortraitOverlay } from '../utils/portraitMode.js';
import { isDesktop, createSidebarContainer, createSocialFeed, createPersonalStats, cleanupSidebars, updateStats } from '../utils/desktopSidebars.js';

export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LEADERBOARD' });
  }

  create() {
    console.log('[Leaderboard] create() called, window.innerWidth:', window.innerWidth, 'isDesktop:', isDesktop());

    // Rebuild on real viewport changes (desktop zoom / window drags) —
    // same self-healing pattern as MenuScene/BaseGameScene.
    if (this._onResizeCb) this.scale.off('resize', this._onResizeCb);
    this._lastW = this.scale.gameSize.width;
    this._lastH = this.scale.gameSize.height;
    this._onResizeCb = (gameSize) => {
      if (Math.abs(gameSize.width - this._lastW) < 40 && Math.abs(gameSize.height - this._lastH) < 40) return;
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this.scene.restart(), 250);
    };
    this.scale.on('resize', this._onResizeCb);
    this.events.once('shutdown', () => {
      clearTimeout(this._resizeTimer);
      if (this._onResizeCb) this.scale.off('resize', this._onResizeCb);
      this._onResizeCb = null;
    });
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;

    // Background
    this.add.rectangle(cx, H / 2, W, H, 0x080a10, 1);

    // Portrait mode enforcement overlay for mobile landscape
    createPortraitOverlay(this);

    // Title
    this.add.text(cx, 50, 'THE BOARD', {
      fontSize: '32px',
      color: '#cbd1ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(cx, 85, 'Plug. Run. Climb. Streets watching.', {
      fontSize: '14px',
      color: '#aab5ff',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Tab buttons (closer to title, no stats bar)
    this.currentTab = 'daily';
    this.currentRole = 'runner';
    this.currentSort = 'stash';
    this.createTabButtons(cx, 125);
    this.createRoleButtons(cx, 175);
    this.createSortButtons(cx, 218);

    // Scrollable content container
    this.contentContainer = this.add.container(0, 0);

    this.refreshContent();

    // Back button
    const backBtn = this.add.rectangle(60, H - 40, 100, 40, 0x1a2038, 1)
      .setStrokeStyle(2, 0x2f3660)
      .setInteractive({ useHandCursor: true });

    const backText = this.add.text(60, H - 40, 'Menu', {
      fontSize: '16px',
      color: '#cbd1ff'
    }).setOrigin(0.5);

    backBtn.on('pointerdown', () => {
      this.scene.start('MENU');
    });

    this.backBtn = backBtn;
    this.backText = backText;

    // Initialize desktop sidebars
    console.log('[Leaderboard] About to check isDesktop():', isDesktop());
    if (isDesktop()) {
      console.log('[Leaderboard] isDesktop() returned true, calling initDesktopSidebars()');
      this.initDesktopSidebars();
    } else {
      console.log('[Leaderboard] isDesktop() returned false, skipping sidebars');
    }

    // Cleanup sidebars when leaving scene
    this.events.once('shutdown', () => {
      // Note: Don't cleanup sidebars here - the next scene will clean them up
      // when it creates its own sidebars (cleanupSidebars() is called at start of initDesktopSidebars())
    });
  }

  initDesktopSidebars() {
    console.log('[Leaderboard] Initializing desktop sidebars');
    // Clean up any existing sidebars first
    cleanupSidebars();

    // Left sidebar: Social feed
    this.leftSidebar = createSidebarContainer('left');
    createSocialFeed(this.leftSidebar);

    // Right sidebar: Personal stats only (no leaderboard section since main scene shows full leaderboard)
    this.rightSidebar = createSidebarContainer('right');
    createPersonalStats(this.rightSidebar, null);
    console.log('[Leaderboard] Sidebars initialized:', this.leftSidebar, this.rightSidebar);

    // Initialize sidebar with current stats
    this.refreshSidebarStats();
  }

  async refreshSidebarStats() {
    // Update sidebar with TODAY's stats (from current route)
    try {
      // Import getUserScore dynamically
      const { getUserScore } = await import('../utils/leaderboardManager.js');

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
        repEarned: Math.round(dailyRep),
        bestRunner,
        bestPlug
      });
    } catch (err) {
      console.warn('[LeaderboardScene] Failed to refresh sidebar stats:', err);
      updateStats({
        totalRounds: 0,
        totalStash: 0,
        repEarned: 0,
        bestRunner: 0,
        bestPlug: 0
      });
    }
  }

  createTabButtons(cx, y) {
    const tabW = 100;
    const tabH = 40;
    const gap = 10;

    const tabs = [
      { key: 'daily', label: 'Daily', x: cx - tabW - gap },
      { key: 'alltime', label: 'All-Time', x: cx },
      { key: 'pvp', label: 'PvP', x: cx + tabW + gap }
    ];

    this.tabButtons = {};
    this.tabTexts = {};

    tabs.forEach(tab => {
      const isActive = tab.key === this.currentTab;
      const bg = this.add.rectangle(tab.x, y, tabW, tabH, isActive ? 0x2a1a38 : 0x1a2038, 1)
        .setStrokeStyle(2, isActive ? 0x60a5fa : 0x2f3660)
        .setInteractive({ useHandCursor: true });

      const text = this.add.text(tab.x, y, tab.label, {
        fontSize: '14px',
        color: isActive ? '#93c5fd' : '#aab5ff',
        fontStyle: isActive ? 'bold' : ''
      }).setOrigin(0.5);

      bg.on('pointerdown', () => {
        this.switchTab(tab.key);
      });

      this.tabButtons[tab.key] = bg;
      this.tabTexts[tab.key] = text;
    });
  }

  createRoleButtons(cx, y) {
    const roleW = 90;
    const roleH = 36;
    const gap = 10;

    const roles = [
      { key: 'runner', label: 'Runner', x: cx - roleW/2 - gap/2 },
      { key: 'plug', label: 'Plug', x: cx + roleW/2 + gap/2 }
    ];

    this.roleButtons = {};
    this.roleTexts = {};

    roles.forEach(role => {
      const isActive = role.key === this.currentRole;
      const bg = this.add.rectangle(role.x, y, roleW, roleH, isActive ? 0x2a1a38 : 0x1a2038, 1)
        .setStrokeStyle(2, isActive ? 0x60a5fa : 0x2f3660)
        .setInteractive({ useHandCursor: true });

      const text = this.add.text(role.x, y, role.label, {
        fontSize: '13px',
        color: isActive ? '#93c5fd' : '#aab5ff',
        fontStyle: isActive ? 'bold' : ''
      }).setOrigin(0.5);

      bg.on('pointerdown', () => {
        this.switchRole(role.key);
      });

      this.roleButtons[role.key] = bg;
      this.roleTexts[role.key] = text;
    });
  }

  switchTab(tab) {
    this.currentTab = tab;

    // Update tab visuals
    Object.keys(this.tabButtons).forEach(key => {
      const isActive = key === tab;
      this.tabButtons[key]
        .setFillStyle(isActive ? 0x2a1a38 : 0x1a2038)
        .setStrokeStyle(2, isActive ? 0x60a5fa : 0x2f3660);

      this.tabTexts[key]
        .setColor(isActive ? '#93c5fd' : '#aab5ff')
        .setFontStyle(isActive ? 'bold' : '');
    });

    trackLeaderboardView(tab, this.currentRole);
    this.refreshContent();
  }

  switchRole(role) {
    this.currentRole = role;

    // Update role button visuals
    Object.keys(this.roleButtons).forEach(key => {
      const isActive = key === role;
      this.roleButtons[key]
        .setFillStyle(isActive ? 0x2a1a38 : 0x1a2038)
        .setStrokeStyle(2, isActive ? 0x60a5fa : 0x2f3660);

      this.roleTexts[key]
        .setColor(isActive ? '#93c5fd' : '#aab5ff')
        .setFontStyle(isActive ? 'bold' : '');
    });

    trackLeaderboardView(this.currentTab, role);
    this.refreshContent();
  }

  createSortButtons(cx, y) {
    this.sortButtons = {};
    this.sortTexts = {};
    this.sortLabel = this.add.text(cx - 100, y, 'Rank by:', {
      fontSize: '11px', color: '#6b7280', fontStyle: 'italic'
    }).setOrigin(0.5, 0.5);
    const modes = [{ key: 'stash', label: 'Stash' }, { key: 'rep', label: 'Rep' }];
    const btnW = 62, btnH = 24, gap = 6;
    const startX = cx - ((btnW * modes.length + gap * (modes.length - 1)) / 2) + 45;
    modes.forEach((m, i) => {
      const x = startX + i * (btnW + gap);
      const active = m.key === this.currentSort;
      const bg = this.add.rectangle(x, y, btnW, btnH,
        active ? 0x2a1a38 : 0x1a2038, 1)
        .setStrokeStyle(1, active ? 0xfbbf24 : 0x2f3660)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(x, y, m.label, {
        fontSize: '12px', color: active ? '#fbbf24' : '#aab5ff',
        fontStyle: active ? 'bold' : ''
      }).setOrigin(0.5);
      bg.on('pointerdown', () => this.switchSort(m.key));
      this.sortButtons[m.key] = bg;
      this.sortTexts[m.key] = txt;
    });
  }

  switchSort(sort) {
    if (this.currentSort === sort) return;
    this.currentSort = sort;
    Object.keys(this.sortButtons).forEach(key => {
      const isActive = key === sort;
      this.sortButtons[key]
        .setFillStyle(isActive ? 0x2a1a38 : 0x1a2038)
        .setStrokeStyle(1, isActive ? 0xfbbf24 : 0x2f3660);
      this.sortTexts[key]
        .setColor(isActive ? '#fbbf24' : '#aab5ff')
        .setFontStyle(isActive ? 'bold' : '');
    });
    this.refreshContent();
  }

  async refreshContent() {
    // Clear existing content
    this.contentContainer?.removeAll(true);

    const cx = this.scale.width / 2;
    const W = this.scale.width;
    let y = 260;

    if (this.currentTab === 'pvp') {
      // PvP tab - coming soon
      const comingSoon = this.add.text(cx, y + 80, 'PvP Leaderboards\nComing Soon', {
        fontSize: '18px',
        color: '#aab5ff',
        align: 'center'
      }).setOrigin(0.5);
      this.contentContainer.add(comingSoon);
      return;
    }

    // Show single leaderboard for selected role and tab
    const roleLabel = this.currentRole === 'runner' ? 'Runners' : 'Plugs';
    const typeLabel = this.currentTab === 'daily' ? 'Today' : 'All-Time';
    const title = `${roleLabel} - ${typeLabel}`;

    const titleText = this.add.text(cx, y, title, {
      fontSize: '20px',
      color: '#cbd1ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    y += 40;

    // Sort-aware fetch: STASH-ranked (default) or REP-ranked.
    const sort = this.currentSort;
    const topPayload = this.currentTab === 'daily'
      ? await getGlobalDailyLeaderboard(this.currentRole, null, 20, sort)
      : await getGlobalAllTimeLeaderboard(this.currentRole, 20, sort);
    const topScores = topPayload?.entries || [];
    const myRank = this.currentTab === 'daily'
      ? await getGlobalDailyRank(this.currentRole, sort)
      : await getGlobalAllTimeRank(this.currentRole, sort);

    // YOU: #N badge — visible when player is on the board but past top-20
    if (myRank && myRank > 20) {
      const badge = this.add.text(cx, y - 10, `YOU: #${myRank}`, {
        fontSize: '13px', color: '#fbbf24', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.contentContainer.add(badge);
    }

    const userId = getUserID();

    // Table header
    const headerBg = this.add.rectangle(cx, y, Math.min(400, W - 40), 35, 0x1a2038, 0.5);
    const rankHeader = this.add.text(cx - 180, y, 'RANK', {
      fontSize: '12px',
      color: '#6b7280'
    }).setOrigin(0, 0.5);
    const nameHeader = this.add.text(cx - 100, y, 'PLAYER', {
      fontSize: '12px',
      color: '#6b7280'
    }).setOrigin(0, 0.5);
    const stashHeader = this.add.text(cx + 80, y, 'STASH', {
      fontSize: '12px',
      color: sort === 'stash' ? '#86efac' : '#6b7280',
      fontStyle: sort === 'stash' ? 'bold' : ''
    }).setOrigin(0.5, 0.5);
    const repHeader = this.add.text(cx + 155, y, 'REP', {
      fontSize: '12px',
      color: sort === 'rep' ? '#ffd166' : '#6b7280',
      fontStyle: sort === 'rep' ? 'bold' : ''
    }).setOrigin(1, 0.5);

    this.contentContainer.add([titleText, headerBg, rankHeader, nameHeader, stashHeader, repHeader]);
    y += 45;

    // Entries
    const entries = [];

    if (topScores.length === 0) {
      const emptyText = this.add.text(cx, y, 'No scores yet.\nBe the first!', {
        fontSize: '16px',
        color: '#aab5ff',
        align: 'center'
      }).setOrigin(0.5);
      entries.push(emptyText);
    } else {
      topScores.forEach((entry, index) => {
        const rank = index + 1;
        const isUser = entry.userId === userId;

        // Row background
        const bgColor = isUser ? 0x1a2a3a : 0x0a0d1a;
        const bgAlpha = isUser ? 0.7 : 0.3;
        const rowBg = this.add.rectangle(cx, y, Math.min(400, W - 40), 32, bgColor, bgAlpha);

        // Rank
        let rankColor = '#aab5ff';
        if (rank === 1) rankColor = '#fbbf24';
        else if (rank === 2) rankColor = '#cbd5e1';
        else if (rank === 3) rankColor = '#d97706';

        const rankText = this.add.text(cx - 180, y, `#${rank}`, {
          fontSize: '14px',
          color: rankColor,
          fontStyle: rank === 1 ? 'bold' : ''
        }).setOrigin(0, 0.5);

        // Username
        const maxLen = 15;
        const displayName = entry.username.length > maxLen
          ? entry.username.substring(0, maxLen) + '...'
          : entry.username;

        const nameText = this.add.text(cx - 100, y, displayName, {
          fontSize: '14px',
          color: isUser ? '#fbbf24' : '#cbd1ff',
          fontStyle: isUser ? 'bold' : ''
        }).setOrigin(0, 0.5);

        // Ranked column: bold + full color; the other muted.
        const stashValue = entry.stash;
        const repValue = entry.rep;
        const stashFormatted = stashValue != null ? formatNumber(stashValue) : '—';
        const repFormatted = repValue != null
          ? (Math.abs(repValue) >= 10000 ? formatNumber(repValue)
             : (repValue % 1 === 0 ? String(repValue) : repValue.toFixed(2)))
          : '—';
        const stashActive = sort === 'stash';
        const repActive   = sort === 'rep';
        const stashText = this.add.text(cx + 80, y, stashFormatted, {
          fontSize: '14px',
          color: stashActive ? '#86efac' : '#4b5563',
          fontStyle: stashActive ? 'bold' : ''
        }).setOrigin(0.5, 0.5);
        const repText = this.add.text(cx + 155, y, repFormatted, {
          fontSize: '14px',
          color: repActive ? '#ffd166' : '#4b5563',
          fontStyle: repActive ? 'bold' : ''
        }).setOrigin(1, 0.5);

        entries.push(rowBg, rankText, nameText, stashText, repText);
        y += 35;
      });
    }

    this.contentContainer.add(entries);
  }

}