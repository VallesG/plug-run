// Leaderboard management for daily challenges (local storage, easily portable to server)
// Tracks daily high scores for Plug and Runner modes

import { getCurrentRouteID } from './seededRandom.js';
import { getUserID, getUsername } from './userManager.js';

const STORAGE_KEY_PREFIX = 'pr_leaderboard_';
const STORAGE_KEY_ALLTIME = 'pr_alltime_';

// Leaderboard entry structure:
// {
//   userId: string,
//   username: string,
//   round: number,
//   stash: number,
//   rep: number,
//   timestamp: number
// }

// Submit score to leaderboard
export function submitScore(role, round, stash, rep = 0) {
  const routeID = getCurrentRouteID();
  const userId = getUserID();
  const username = getUsername();

  const entry = {
    userId,
    username,
    round,
    stash,
    rep,
    timestamp: Date.now()
  };

  // Get current leaderboard for this route and role
  const leaderboard = getLeaderboard(routeID, role);

  // Check if user already has a score
  const existingIndex = leaderboard.findIndex(e => e.userId === userId);

  if (existingIndex >= 0) {
    // Update if this score is better (higher round, or same round with more stash/rep)
    const existing = leaderboard[existingIndex];
    if (round > existing.round ||
        (round === existing.round && stash > existing.stash) ||
        (round === existing.round && stash === existing.stash && rep > (existing.rep || 0))) {
      leaderboard[existingIndex] = entry;
      console.log('[Leaderboard] Updated score for', username, '- Round', round);
    } else {
      console.log('[Leaderboard] Score not better than existing');
      return { updated: false, rank: existingIndex + 1 };
    }
  } else {
    // Add new entry
    leaderboard.push(entry);
    console.log('[Leaderboard] New score for', username, '- Round', round);
  }

  // Sort by round (desc), then stash (desc), then rep (desc)
  leaderboard.sort((a, b) => {
    if (b.round !== a.round) return b.round - a.round;
    if (b.stash !== a.stash) return b.stash - a.stash;
    return (b.rep || 0) - (a.rep || 0);
  });

  // Keep top 100 only
  const trimmed = leaderboard.slice(0, 100);

  // Save back to storage
  saveLeaderboard(routeID, role, trimmed);

  // Find user's rank
  const rank = trimmed.findIndex(e => e.userId === userId) + 1;

  return { updated: true, rank, total: trimmed.length };
}

// Get leaderboard for a route and role
export function getLeaderboard(routeID, role) {
  const key = `${STORAGE_KEY_PREFIX}${routeID}_${role}`;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];

    const data = JSON.parse(stored);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('[Leaderboard] Failed to load leaderboard:', e);
    return [];
  }
}

// Save leaderboard
function saveLeaderboard(routeID, role, entries) {
  const key = `${STORAGE_KEY_PREFIX}${routeID}_${role}`;

  try {
    localStorage.setItem(key, JSON.stringify(entries));
    return true;
  } catch (e) {
    console.warn('[Leaderboard] Failed to save leaderboard:', e);
    return false;
  }
}

// Get current daily leaderboards
export function getTodaysLeaderboards() {
  const routeID = getCurrentRouteID();
  return {
    routeID,
    plug: getLeaderboard(routeID, 'plug'),
    runner: getLeaderboard(routeID, 'runner')
  };
}

// Get user's rank on today's leaderboard
export function getUserRank(role) {
  const routeID = getCurrentRouteID();
  const userId = getUserID();
  const leaderboard = getLeaderboard(routeID, role);

  const rank = leaderboard.findIndex(e => e.userId === userId) + 1;
  return rank > 0 ? rank : null;
}

// Get user's score on today's leaderboard
export function getUserScore(role) {
  const routeID = getCurrentRouteID();
  const userId = getUserID();
  const leaderboard = getLeaderboard(routeID, role);

  return leaderboard.find(e => e.userId === userId) || null;
}

// Get top N entries
export function getTopScores(role, limit = 10) {
  const routeID = getCurrentRouteID();
  const leaderboard = getLeaderboard(routeID, role);
  return leaderboard.slice(0, limit);
}

// Get winners (top scorer for each role)
export function getTodaysWinners() {
  const routeID = getCurrentRouteID();
  const plugLeaderboard = getLeaderboard(routeID, 'plug');
  const runnerLeaderboard = getLeaderboard(routeID, 'runner');

  return {
    plugOfTheDay: plugLeaderboard[0] || null,
    runnerOfTheDay: runnerLeaderboard[0] || null
  };
}

// Check if user is today's winner
export function isWinner(role) {
  const userId = getUserID();
  const winners = getTodaysWinners();

  if (role === 'plug') {
    return winners.plugOfTheDay?.userId === userId;
  } else if (role === 'runner') {
    return winners.runnerOfTheDay?.userId === userId;
  }

  return false;
}

// Clean up old leaderboards (keep last 7 days)
export function cleanupOldLeaderboards() {
  try {
    const currentRouteID = getCurrentRouteID();
    const keysToDelete = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        // Extract route ID from key
        const parts = key.replace(STORAGE_KEY_PREFIX, '').split('_');
        const routeID = parseInt(parts[0], 10);

        // Delete if more than 7 days old
        if (routeID < currentRouteID - 7) {
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach(key => localStorage.removeItem(key));
    console.log('[Leaderboard] Cleaned up', keysToDelete.length, 'old leaderboard(s)');
  } catch (e) {
    console.warn('[Leaderboard] Failed to cleanup:', e);
  }
}

// Export leaderboard data (for server sync)
export function exportLeaderboardData(routeID) {
  return {
    routeID,
    plug: getLeaderboard(routeID, 'plug'),
    runner: getLeaderboard(routeID, 'runner'),
    exportedAt: Date.now()
  };
}

// Import leaderboard data (from server)
export function importLeaderboardData(data) {
  try {
    if (data.plug) saveLeaderboard(data.routeID, 'plug', data.plug);
    if (data.runner) saveLeaderboard(data.routeID, 'runner', data.runner);
    console.log('[Leaderboard] Imported leaderboard for route', data.routeID);
    return { success: true };
  } catch (e) {
    console.warn('[Leaderboard] Failed to import:', e);
    return { success: false, error: e.message };
  }
}

// ============ ALL-TIME LEADERBOARDS ============

// Submit all-time score (tracks best ever performance)
export function submitAllTimeScore(role, round, stash, rep = 0) {
  const userId = getUserID();
  const username = getUsername();

  const entry = {
    userId,
    username,
    round,
    stash,
    rep,
    timestamp: Date.now()
  };

  const leaderboard = getAllTimeLeaderboard(role);
  const existingIndex = leaderboard.findIndex(e => e.userId === userId);

  if (existingIndex >= 0) {
    const existing = leaderboard[existingIndex];
    if (round > existing.round ||
        (round === existing.round && stash > existing.stash) ||
        (round === existing.round && stash === existing.stash && rep > (existing.rep || 0))) {
      leaderboard[existingIndex] = entry;
      console.log('[AllTime] Updated all-time score for', username, '- Round', round);
    } else {
      return { updated: false, rank: existingIndex + 1 };
    }
  } else {
    leaderboard.push(entry);
    console.log('[AllTime] New all-time score for', username, '- Round', round);
  }

  leaderboard.sort((a, b) => {
    if (b.round !== a.round) return b.round - a.round;
    if (b.stash !== a.stash) return b.stash - a.stash;
    return (b.rep || 0) - (a.rep || 0);
  });

  const trimmed = leaderboard.slice(0, 100);
  saveAllTimeLeaderboard(role, trimmed);

  const rank = trimmed.findIndex(e => e.userId === userId) + 1;
  return { updated: true, rank, total: trimmed.length };
}

// Get all-time leaderboard
export function getAllTimeLeaderboard(role) {
  const key = `${STORAGE_KEY_ALLTIME}${role}`;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];

    const data = JSON.parse(stored);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('[AllTime] Failed to load all-time leaderboard:', e);
    return [];
  }
}

// Save all-time leaderboard
function saveAllTimeLeaderboard(role, entries) {
  const key = `${STORAGE_KEY_ALLTIME}${role}`;

  try {
    localStorage.setItem(key, JSON.stringify(entries));
    return true;
  } catch (e) {
    console.warn('[AllTime] Failed to save all-time leaderboard:', e);
    return false;
  }
}

// Get user's all-time rank
export function getAllTimeRank(role) {
  const userId = getUserID();
  const leaderboard = getAllTimeLeaderboard(role);

  const rank = leaderboard.findIndex(e => e.userId === userId) + 1;
  return rank > 0 ? rank : null;
}

// Get user's all-time score
export function getAllTimeScore(role) {
  const userId = getUserID();
  const leaderboard = getAllTimeLeaderboard(role);

  return leaderboard.find(e => e.userId === userId) || null;
}

// Get top N all-time entries
export function getAllTimeTopScores(role, limit = 10) {
  const leaderboard = getAllTimeLeaderboard(role);
  return leaderboard.slice(0, limit);
}

export default {
  submitScore,
  getLeaderboard,
  getTodaysLeaderboards,
  getUserRank,
  getUserScore,
  getTopScores,
  getTodaysWinners,
  isWinner,
  cleanupOldLeaderboards,
  exportLeaderboardData,
  importLeaderboardData
};
