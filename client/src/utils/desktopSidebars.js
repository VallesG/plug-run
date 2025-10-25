// Desktop Sidebar System using DOM elements
// Provides live leaderboard and social feed for desktop players

export function isDesktop() {
  return window.innerWidth >= 768;
}

// Clean up any existing sidebars
export function cleanupSidebars() {
  const existing = document.querySelectorAll('.desktop-sidebar');
  if (existing.length > 0) {
    console.log(`[Sidebar] Cleaning up ${existing.length} existing sidebar(s)`);
    console.trace('[Sidebar] Cleanup called from:');
  }
  existing.forEach(el => el.remove());
}

// Create a DOM sidebar container
export function createSidebarContainer(side) {
  if (!isDesktop()) return null;

  const gameWidth = 500; // Fixed game viewport width
  const gameHeight = Math.min(938, window.innerHeight); // Match game canvas height
  const sidebarWidth = 500; // Match game viewport width

  // Calculate game canvas position (centered horizontally)
  const gameCanvasLeft = (window.innerWidth - gameWidth) / 2;
  const gameCanvasRight = gameCanvasLeft + gameWidth;

  // Position sidebars next to game canvas with small gap
  const gap = 15;
  let leftPosition;

  if (side === 'left') {
    leftPosition = gameCanvasLeft - gap - sidebarWidth;
  } else {
    leftPosition = gameCanvasRight + gap;
  }

  // Align with main PLUG RUN sign (starts at 36px from top of game canvas)
  const gameCanvasTopOffset = (window.innerHeight - gameHeight) / 2;
  const mainSignOffset = 36; // logoY from MenuScene
  const topOffset = gameCanvasTopOffset + mainSignOffset;

  const sidebar = document.createElement('div');
  sidebar.className = 'desktop-sidebar';
  sidebar.style.cssText = `
    position: fixed;
    top: ${topOffset}px;
    left: ${leftPosition}px;
    width: ${sidebarWidth}px;
    height: ${gameHeight}px;
    background: rgba(10, 15, 26, 0.95);
    border: 2px solid #2f3650;
    border-radius: 4px;
    overflow-y: auto;
    z-index: 9999;
    font-family: "Highway Gothic", "Arial Narrow", sans-serif;
    pointer-events: auto;
  `;

  document.body.appendChild(sidebar);
  console.log(`[Sidebar] Created ${side} sidebar at position ${leftPosition}px`);
  return sidebar;
}

// Create social feed sidebar (fire station style - white with red)
export function createSocialFeed(container) {
  if (!container) return;

  // Match main sign dimensions
  const signHeight = 100; // Match main PLUG RUN sign height
  const logoSize = 26; // Match main logo font size

  container.innerHTML = `
    <div style="
      background: #FFFFFF;
      border: 4px solid #C8102E;
      border-radius: 8px;
      padding: 0;
      text-align: center;
      margin: 0 0 20px 0;
      height: ${signHeight}px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    ">
      <div style="
        font-size: ${logoSize}px;
        color: #C8102E;
        font-weight: bold;
        font-family: 'Highway Gothic', 'Arial Narrow', sans-serif;
        margin-bottom: 5px;
      ">STREET SCANNER</div>
      <div style="
        font-size: ${Math.floor(logoSize * 0.65)}px;
        color: #C8102E;
        font-weight: bold;
        font-family: 'Highway Gothic', 'Arial Narrow', sans-serif;
        letter-spacing: 2px;
      ">LIVE ACTIVITY</div>
    </div>
    <div id="feed-entries" style="padding: 0 15px;"></div>
  `;

  const feedContainer = container.querySelector('#feed-entries');

  // Placeholder entry
  const entry = document.createElement('div');
  entry.style.cssText = `
    display: flex;
    padding: 15px 0;
    border-bottom: 1px solid #2f3650;
  `;

  entry.innerHTML = `
    <span style="font-size: 20px; margin-right: 10px;">👤</span>
    <div style="flex: 1;">
      <div style="color: #cbd1ff; font-size: 12px; margin-bottom: 5px;">Waiting for activity...</div>
      <div style="color: #64748b; font-size: 10px;">just now</div>
    </div>
  `;

  feedContainer.appendChild(entry);

  return container;
}

// Create personal stats sidebar (green street sign style)
export function createPersonalStats(container, mode = null) {
  if (!container) return;

  // Match main sign dimensions
  const signHeight = 100; // Match main PLUG RUN sign height
  const logoSize = 26; // Match main logo font size

  // Determine leaderboard title based on mode
  let leaderboardTitle = 'LIVE TOP 10';
  if (mode === 'runner') {
    leaderboardTitle = 'TOP 10 - RUN THE BLOCK';
  } else if (mode === 'plug') {
    leaderboardTitle = 'TOP 10 - DEFEND THE BLOCK';
  }

  // Build leaderboard section HTML (only if mode is specified)
  let leaderboardSection = '';
  if (mode !== null) {
    leaderboardSection = `
      <div style="
        text-align: center;
        margin: 30px 0 20px 0;
        font-size: 14px;
        color: #ffffff;
        font-weight: bold;
        text-shadow: 1.5px 1.5px #000000;
      ">${leaderboardTitle}</div>

      <div id="live-leaderboard-entries"></div>
    `;
  }

  container.innerHTML = `
    <div style="
      background: #006747;
      border: 4px solid #ffffff;
      padding: 0;
      text-align: center;
      margin: 0 0 20px 0;
      height: ${signHeight}px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    ">
      <div style="
        font-size: ${logoSize}px;
        color: #ffffff;
        font-weight: bold;
        font-family: 'Highway Gothic', 'Arial Narrow', sans-serif;
        text-shadow: 2px 2px #000000;
        margin-bottom: 5px;
      ">YOUR STATS</div>
      <div style="
        font-size: ${Math.floor(logoSize * 0.65)}px;
        color: #ffffff;
        font-weight: bold;
        font-family: 'Highway Gothic', 'Arial Narrow', sans-serif;
        text-shadow: 1.5px 1.5px #000000;
        letter-spacing: 2px;
      ">PROGRESS TRACKER</div>
    </div>
    <div style="padding: 0 15px;">
      ${createStatRow('Total Rounds', '0', '#fbbf24', 'stat-total-rounds')}
      ${createStatRow('Total STASH', '0', '#86efac', 'stat-total-stash')}
      ${createStatRow('REP Earned', '0', '#ffd166', 'stat-rep-earned')}
      ${createStatRow('Best Runner', '0', '#60a5fa', 'stat-best-runner')}
      ${createStatRow('Best Plug', '0', '#f87171', 'stat-best-plug')}

      ${leaderboardSection}
    </div>
  `;

  // Create 10 placeholder leaderboard entries (only if mode is specified)
  if (mode !== null) {
    const entriesContainer = container.querySelector('#live-leaderboard-entries');
    for (let i = 0; i < 10; i++) {
      const entry = document.createElement('div');
      entry.style.cssText = `
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #2f3650;
      `;

      const rankColor = i < 3 ? '#fbbf24' : '#cbd1ff';

      entry.innerHTML = `
        <span style="color: ${rankColor}; font-weight: bold; font-size: 13px; min-width: 30px;">#${i + 1}</span>
        <span style="color: #cbd1ff; font-size: 12px; flex: 1; margin: 0 10px;">---</span>
        <span style="color: #86efac; font-size: 12px; font-weight: bold;">---</span>
      `;

      entriesContainer.appendChild(entry);
    }
  }

  return container;
}

function createStatRow(label, value, color, id) {
  return `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #2f3650;
    ">
      <span style="color: #cbd1ff; font-size: 12px;">${label}</span>
      <span id="${id}" style="color: ${color}; font-size: 14px; font-weight: bold;">${value}</span>
    </div>
  `;
}

export function updateLeaderboard(container, leaderboardData) {
  if (!container) return;

  const entries = container.querySelectorAll('#live-leaderboard-entries > div');
  leaderboardData.forEach((entry, i) => {
    if (i >= entries.length) return;

    const spans = entries[i].querySelectorAll('span');
    if (spans.length >= 3) {
      spans[1].textContent = entry.name || '---';
      spans[2].textContent = entry.score !== undefined ? entry.score.toString() : '---';
    }
  });
}

export function updateStats(stats) {
  // Update stats in the sidebar if they exist
  const totalRounds = document.getElementById('stat-total-rounds');
  const totalStash = document.getElementById('stat-total-stash');
  const repEarned = document.getElementById('stat-rep-earned');
  const bestRunner = document.getElementById('stat-best-runner');
  const bestPlug = document.getElementById('stat-best-plug');

  console.log('[Sidebar] updateStats called with:', stats);
  console.log('[Sidebar] DOM elements found:', {
    totalRounds: !!totalRounds,
    totalStash: !!totalStash,
    repEarned: !!repEarned,
    bestRunner: !!bestRunner,
    bestPlug: !!bestPlug
  });

  if (totalRounds && stats.totalRounds !== undefined) {
    totalRounds.textContent = stats.totalRounds.toString();
  }
  if (totalStash && stats.totalStash !== undefined) {
    totalStash.textContent = stats.totalStash.toString();
  }
  if (repEarned && stats.repEarned !== undefined) {
    repEarned.textContent = stats.repEarned.toString();
  }
  if (bestRunner && stats.bestRunner !== undefined) {
    bestRunner.textContent = stats.bestRunner.toString();
  }
  if (bestPlug && stats.bestPlug !== undefined) {
    bestPlug.textContent = stats.bestPlug.toString();
  }
}

export function addSocialFeedEvent(container, event) {
  if (!container) return;

  // TODO: Implement scrolling feed
}
