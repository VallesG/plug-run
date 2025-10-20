import Phaser from 'phaser';
import {
  getTopScores, getUserRank, getUserScore,
  getAllTimeTopScores, getAllTimeRank, getAllTimeScore
} from '../utils/leaderboardManager.js';
import { getCurrentRouteID } from '../utils/seededRandom.js';
import { getUsername, getUserID, getCurrentUser } from '../utils/userManager.js';

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

    // User stats (stash and REP)
    const user = getCurrentUser();
    const statsBg = this.add.rectangle(cx, 105, Math.min(300, W - 80), 22, 0x1a2038, 0.7)
      .setOrigin(0.5);

    const stashText = this.add.text(cx - 65, 105, `💰 ${user.stats?.totalStash || 0}`, {
      fontSize: '13px',
      color: '#fbbf24',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const separatorText = this.add.text(cx, 105, '|', {
      fontSize: '13px',
      color: '#6b7280'
    }).setOrigin(0.5);

    const repText = this.add.text(cx + 65, 105, `⭐ ${user.stats?.totalRep || 0}`, {
      fontSize: '13px',
      color: '#86efac',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Tab buttons
    this.currentTab = 'daily';
    this.createTabButtons(cx, 140);

    // Scrollable content container
    this.contentContainer = this.add.container(0, 0);
    this.currentDetailView = null; // Track if we're in detailed view

    this.refreshContent();

    // Back button
    const backBtn = this.add.rectangle(60, H - 40, 100, 40, 0x1a2038, 1)
      .setStrokeStyle(2, 0x2f3660)
      .setInteractive({ useHandCursor: true });

    const backText = this.add.text(60, H - 40, 'Back', {
      fontSize: '16px',
      color: '#cbd1ff'
    }).setOrigin(0.5);

    backBtn.on('pointerdown', () => {
      if (this.currentDetailView) {
        // Exit detailed view, return to summary
        this.currentDetailView = null;
        this.refreshContent();
      } else {
        // Exit to menu
        this.scene.start('MENU');
      }
    });

    // Update back button text based on view
    this.backBtn = backBtn;
    this.backText = backText;
  }

  createTabButtons(cx, y) {
    const tabW = 100;
    const tabH = 40;
    const gap = 10;

    const tabs = [
      { key: 'daily', label: '🏆 Daily', x: cx - tabW - gap },
      { key: 'alltime', label: '📅 All-Time', x: cx },
      { key: 'pvp', label: '⚔️ PvP', x: cx + tabW + gap }
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

  switchTab(tab) {
    this.currentTab = tab;
    this.currentDetailView = null; // Reset detail view when switching tabs

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

    this.refreshContent();
  }

  refreshContent() {
    // Clear existing content
    this.contentContainer?.removeAll(true);

    // Update back button text
    if (this.currentDetailView) {
      this.backText?.setText('← Back');
    } else {
      this.backText?.setText('Menu');
    }

    if (this.currentDetailView) {
      this.showDetailedView(this.currentDetailView.type, this.currentDetailView.role);
    } else {
      this.showSummaryView();
    }
  }

  showSummaryView() {
    const cx = this.scale.width / 2;
    let y = 205;

    if (this.currentTab === 'daily') {
      // Daily tab: Top Runners and Top Plugs
      y = this.createSummaryBlock('🏃 Top Runners (Today)', 'runner', 'daily', cx, y);
      y += 20;
      y = this.createSummaryBlock('🚨 Top Plugs (Today)', 'plug', 'daily', cx, y);
    } else if (this.currentTab === 'alltime') {
      // All-time tab
      y = this.createSummaryBlock('🏃 Top Runners (All-Time)', 'runner', 'alltime', cx, y);
      y += 20;
      y = this.createSummaryBlock('🚨 Top Plugs (All-Time)', 'plug', 'alltime', cx, y);
    } else {
      // PvP tab - coming soon
      const comingSoon = this.add.text(cx, y + 80, 'PvP Leaderboards\nComing Soon', {
        fontSize: '18px',
        color: '#aab5ff',
        align: 'center'
      }).setOrigin(0.5);
      this.contentContainer.add(comingSoon);
    }
  }

  createSummaryBlock(title, role, type, cx, y) {
    const blockW = Math.min(400, this.scale.width - 40);
    const entryLimit = this.scale.height > 600 ? 5 : 3;

    // Get data
    const topScores = type === 'daily'
      ? getTopScores(role, entryLimit)
      : getAllTimeTopScores(role, entryLimit);

    // Block background
    const blockH = 60 + topScores.length * 35;
    const blockBg = this.add.rectangle(cx, y + blockH / 2, blockW, blockH, 0x0a0d1a, 0.6)
      .setStrokeStyle(2, 0x2f3660)
      .setInteractive({ useHandCursor: true });

    // Make entire block clickable to expand
    blockBg.on('pointerdown', () => {
      this.currentDetailView = { type, role };
      this.refreshContent();
    });

    // Title
    const titleText = this.add.text(cx, y + 20, title, {
      fontSize: '16px',
      color: '#cbd1ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Top entries
    let entryY = y + 50;
    const entries = [];

    if (topScores.length === 0) {
      const emptyText = this.add.text(cx, entryY, 'No scores yet', {
        fontSize: '14px',
        color: '#6b7280',
        fontStyle: 'italic'
      }).setOrigin(0.5);
      entries.push(emptyText);
    } else {
      topScores.forEach((score, index) => {
        const rank = index + 1;
        let rankColor = '#aab5ff';
        if (rank === 1) rankColor = '#fbbf24';
        else if (rank === 2) rankColor = '#cbd5e1';
        else if (rank === 3) rankColor = '#d97706';

        const rankText = this.add.text(cx - blockW / 2 + 30, entryY, `#${rank}`, {
          fontSize: '14px',
          color: rankColor,
          fontStyle: rank === 1 ? 'bold' : ''
        }).setOrigin(0, 0.5);

        const nameText = this.add.text(cx - blockW / 2 + 70, entryY, score.username, {
          fontSize: '14px',
          color: '#cbd1ff'
        }).setOrigin(0, 0.5);

        const statText = this.add.text(cx + blockW / 2 - 30, entryY, `R${score.round}`, {
          fontSize: '14px',
          color: '#86efac'
        }).setOrigin(1, 0.5);

        entries.push(rankText, nameText, statText);
        entryY += 35;
      });
    }

    // Tap to expand hint
    const hintText = this.add.text(cx, entryY + 10, '(Tap to view full list)', {
      fontSize: '12px',
      color: '#6b7280',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    this.contentContainer.add([blockBg, titleText, ...entries, hintText]);

    return entryY + 30;
  }

  showDetailedView(type, role) {
    const cx = this.scale.width / 2;
    const W = this.scale.width;
    let y = 205;

    // Title
    const roleLabel = role === 'runner' ? '🏃 Runners' : '🚨 Plugs';
    const typeLabel = type === 'daily' ? 'Today' : 'All-Time';
    const title = `${roleLabel} - ${typeLabel}`;

    const titleText = this.add.text(cx, y, title, {
      fontSize: '20px',
      color: '#cbd1ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    y += 40;

    // Get data
    const topScores = type === 'daily'
      ? getTopScores(role, 20)
      : getAllTimeTopScores(role, 20);

    const userId = getUserID();
    const userRank = type === 'daily'
      ? getUserRank(role)
      : getAllTimeRank(role);
    const userScore = type === 'daily'
      ? getUserScore(role)
      : getAllTimeScore(role);

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
    const roundHeader = this.add.text(cx + 140, y, 'ROUND', {
      fontSize: '12px',
      color: '#6b7280'
    }).setOrigin(1, 0.5);

    this.contentContainer.add([titleText, headerBg, rankHeader, nameHeader, roundHeader]);
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

        // Round
        const roundText = this.add.text(cx + 140, y, entry.round, {
          fontSize: '14px',
          color: '#86efac'
        }).setOrigin(1, 0.5);

        // Winner crown
        if (rank === 1) {
          const crown = this.add.text(cx - 160, y, '👑', {
            fontSize: '16px'
          }).setOrigin(0.5, 0.5);
          entries.push(crown);
        }

        entries.push(rowBg, rankText, nameText, roundText);
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

      const yourScoreText = this.add.text(cx + 140, y, `Round ${userScore.round}`, {
        fontSize: '14px',
        color: '#86efac'
      }).setOrigin(1, 0.5);

      this.contentContainer.add([userBg, yourRankText, yourScoreText]);
    }
  }
}
