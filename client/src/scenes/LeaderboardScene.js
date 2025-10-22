import Phaser from 'phaser';
import {
  getTopScores, getUserRank, getUserScore,
  getAllTimeTopScores, getAllTimeRank, getAllTimeScore,
  formatNumber
} from '../utils/leaderboardManager.js';
import { getCurrentRouteID } from '../utils/seededRandom.js';
import { getUsername, getUserID, getCurrentUser } from '../utils/userManager.js';
import { trackLeaderboardView } from '../utils/analytics.js';
import { createPortraitOverlay } from '../utils/portraitMode.js';

export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LEADERBOARD' });
  }

  create() {
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
    this.currentRole = 'runner'; // Track selected role (runner/plug)
    this.createTabButtons(cx, 125);
    this.createRoleButtons(cx, 175);

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

  async refreshContent() {
    // Clear existing content
    this.contentContainer?.removeAll(true);

    const cx = this.scale.width / 2;
    const W = this.scale.width;
    let y = 230;

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

    // Get data (now async - fetches from global leaderboards)
    const topScores = this.currentTab === 'daily'
      ? await getTopScores(this.currentRole, 20)
      : await getAllTimeTopScores(this.currentRole, 20);

    const userId = getUserID();
    const userRank = this.currentTab === 'daily'
      ? getUserRank(this.currentRole)
      : getAllTimeRank(this.currentRole);
    const userScore = this.currentTab === 'daily'
      ? getUserScore(this.currentRole)
      : getAllTimeScore(this.currentRole);

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
      color: '#6b7280'
    }).setOrigin(0.5, 0.5);
    const repHeader = this.add.text(cx + 155, y, 'REP', {
      fontSize: '12px',
      color: '#6b7280'
    }).setOrigin(1, 0.5);

    this.contentContainer.add([titleText, headerBg, rankHeader, nameHeader, stashHeader, repHeader]);
    y += 45;

    // Entries
    const entries = [];
    const userInTop20 = userRank && userRank <= 20;

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

        // Stash (formatted for large numbers)
        const stashValue = entry.stash || 0;
        const stashFormatted = formatNumber(stashValue);
        const stashText = this.add.text(cx + 80, y, stashFormatted, {
          fontSize: '14px',
          color: '#86efac'
        }).setOrigin(0.5, 0.5);

        // Rep (formatted to 2 decimals, or k/M for large numbers)
        const repValue = entry.rep || 0;
        const repFormatted = repValue >= 10000
          ? formatNumber(repValue)
          : (repValue % 1 === 0 ? repValue.toString() : repValue.toFixed(2));
        const repText = this.add.text(cx + 155, y, repFormatted, {
          fontSize: '14px',
          color: '#ffd166'
        }).setOrigin(1, 0.5);

        entries.push(rowBg, rankText, nameText, stashText, repText);
        y += 35;
      });
    }

    this.contentContainer.add(entries);

    // User's rank at bottom (if not in top 20)
    if (userRank && !userInTop20 && userScore) {
      y = Math.max(y + 20, this.scale.height - 100);

      const userBg = this.add.rectangle(cx, y, Math.min(400, W - 40), 50, 0x1a2a3a, 0.9)
        .setStrokeStyle(2, 0xfbbf24);

      const yourRankText = this.add.text(cx - 180, y, `Your Rank: #${userRank}`, {
        fontSize: '16px',
        color: '#fbbf24',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      const stashValue = userScore.stash || 0;
      const stashFormatted = formatNumber(stashValue);

      const repValue = userScore.rep || 0;
      const repFormatted = repValue >= 10000
        ? formatNumber(repValue)
        : (repValue % 1 === 0 ? repValue.toString() : repValue.toFixed(2));

      const yourStashText = this.add.text(cx + 50, y, `Stash: ${stashFormatted}`, {
        fontSize: '14px',
        color: '#86efac'
      }).setOrigin(0, 0.5);

      const yourRepText = this.add.text(cx + 155, y, `Rep: ${repFormatted}`, {
        fontSize: '14px',
        color: '#ffd166'
      }).setOrigin(1, 0.5);

      this.contentContainer.add([userBg, yourRankText, yourStashText, yourRepText]);
    }
  }

}
