// Leaderboard management with Supabase integration
// Supports local leaderboards (localStorage) and global leaderboards (Supabase)

import { getCurrentRouteID } from './seededRandom.js';
import { getUserID, getUsername, isOnline } from './userManager.js';
import { supabase } from './supabaseClient.js';

const STORAGE_KEY_PREFIX = 'pr_leaderboard_';
const STORAGE_KEY_ALLTIME = 'pr_alltime_';

// ============================================
// NUMBER FORMATTING
// ============================================

/**
 * Format large numbers for display (10.2k, 1.5M)
 * @param {number} value - The number to format
 * @returns {string} Formatted string
 */
export function formatNumber(value) {
  if (value >= 1000000) {
    // Format as millions (1.5M)
    return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (value >= 10000) {
    // Format as thousands (10.2k)
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  // Return as-is for smaller numbers
  return value.toString();
}

// Leaderboard entry structure:
// {
//   userId: string,
//   username: string,
//   round: number,
//   stash: number,
//   rep: number,
//   timestamp: number
// }

// Submit score to leaderboard (local + global)
export async function submitScore(role, round, stash, rep = 0) {
  const routeID = getCurrentRouteID();
  const userId = getUserID();
  const username = getUsername();

  console.log('[Leaderboard] Submitting score for', username, '- Round', round, 'Stash', stash);

  // Submit to global leaderboard (Supabase only - no local storage)
  // IMPORTANT: Await to ensure submission completes before continuing
  if (isOnline()) {
    try {
      await submitScoreToSupabase(role, routeID, round, stash, rep);
      console.log('[Leaderboard] Score submitted successfully');
    } catch (err) {
      console.warn('[Leaderboard] Failed to submit to global leaderboard:', err);
    }
  }

  return { updated: true, rank: 0, total: 0, local: false };
}

// Submit score to Supabase global leaderboard (non-blocking)
async function submitScoreToSupabase(role, routeID, round, stash, rep) {
  if (!supabase) return;

  try {
    const userId = getUserID();
    const username = getUsername();

    // Only submit if userId is a Supabase UUID (not a local guest ID)
    // Guest sync happens asynchronously, so we wait until they have a Supabase ID
    if (userId.startsWith('guest_')) {
      console.log('[Leaderboard] User not yet synced to Supabase, score will be submitted after sync');
      return;
    }

    // Fetch existing score to check if new score is better
    const { data: existing } = await supabase
      .from('daily_scores')
      .select('stash, rep, round')
      .eq('user_id', userId)
      .eq('route_id', routeID)
      .eq('role', role)
      .single();

    // Only update if new score is better (higher stash, or same stash with higher rep)
    const shouldUpdate = !existing ||
                        stash > existing.stash ||
                        (stash === existing.stash && rep > existing.rep);

    if (!shouldUpdate) {
      console.log('[Leaderboard] New score not better than existing, skipping update');
      return;
    }

    // Upsert to daily_scores (only called if score is better)
    const { error } = await supabase
      .from('daily_scores')
      .upsert({
        user_id: userId,
        route_id: routeID,
        role: role,
        round: round,
        stash: stash,
        rep: rep || 0,
        timestamp: new Date().toISOString()
      }, {
        onConflict: 'user_id,route_id,role'
      });

    if (error) throw error;
    console.log('[Leaderboard] Submitted to global daily leaderboard - NEW BEST!');
  } catch (error) {
    console.error('[Leaderboard] Failed to submit to Supabase:', error);
  }
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

// Get current daily leaderboards (GLOBAL by default, local fallback if offline)
export async function getTodaysLeaderboards() {
  const routeID = getCurrentRouteID();

  // Try to fetch global leaderboards if online
  if (isOnline()) {
    try {
      const [plugGlobal, runnerGlobal] = await Promise.all([
        getGlobalDailyLeaderboard('plug', routeID),
        getGlobalDailyLeaderboard('runner', routeID)
      ]);

      console.log(`[Leaderboard] Loaded GLOBAL leaderboards - Plug: ${plugGlobal.length} entries, Runner: ${runnerGlobal.length} entries`);
      return {
        routeID,
        plug: plugGlobal,
        runner: runnerGlobal,
        source: 'global'
      };
    } catch (error) {
      console.warn('[Leaderboard] Failed to fetch global leaderboards, using local:', error);
    }
  }

  // Fallback to local leaderboards if offline or error
  return {
    routeID,
    plug: getLeaderboard(routeID, 'plug'),
    runner: getLeaderboard(routeID, 'runner'),
    source: 'local'
  };
}

// Get user's rank on today's leaderboard (uses Supabase only)
export async function getUserRank(role) {
  return await getGlobalDailyRank(role);
}

// Get user's score on today's leaderboard (uses Supabase only)
export async function getUserScore(role) {
  if (!isOnline()) return null;

  try {
    const routeID = getCurrentRouteID();
    const userId = getUserID();

    const { data, error } = await supabase
      .from('daily_scores')
      .select('round, stash, rep, timestamp')
      .eq('route_id', routeID)
      .eq('role', role)
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return data ? {
      userId,
      round: data.round,
      stash: data.stash,
      rep: data.rep,
      timestamp: new Date(data.timestamp).getTime()
    } : null;
  } catch (error) {
    console.warn('[Leaderboard] Failed to get user score:', error);
    return null;
  }
}

// Get top N entries (GLOBAL by default, local fallback if offline)
export async function getTopScores(role, limit = 10) {
  const routeID = getCurrentRouteID();

  // Fetch from Supabase only (no local fallback)
  if (isOnline()) {
    try {
      const globalScores = await getGlobalDailyLeaderboard(role, routeID, limit);
      return globalScores;
    } catch (error) {
      console.warn('[Leaderboard] Failed to fetch global top scores:', error);
      return [];
    }
  }

  // Offline - return empty
  return [];
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

// Submit all-time score (tracks best ever performance) - local + global
export async function submitAllTimeScore(role, round, stash, rep = 0) {
  const userId = getUserID();
  const username = getUsername();

  console.log('[AllTime] Submitting all-time score for', username, '- Round', round, 'Stash', stash);

  // Submit to global all-time leaderboard (Supabase only - no local storage)
  // IMPORTANT: Await to ensure submission completes before continuing
  if (isOnline()) {
    try {
      await submitAllTimeScoreToSupabase(role, stash, rep, round);
      console.log('[AllTime] All-time score submitted successfully');
    } catch (err) {
      console.warn('[AllTime] Failed to submit to global leaderboard:', err);
    }
  }

  return { updated: true, rank: 0, total: 0, local: false };
}

// Submit all-time score to Supabase (non-blocking)
// Now accumulates totals instead of tracking best ever
async function submitAllTimeScoreToSupabase(role, stash, rep, bestRound) {
  if (!supabase) return;

  try {
    const userId = getUserID();

    // Only submit if userId is a Supabase UUID (not a local guest ID)
    if (userId.startsWith('guest_')) {
      console.log('[AllTime] User not yet synced to Supabase, score will be submitted after sync');
      return;
    }

    // Fetch current all-time record
    const { data: existing } = await supabase
      .from('alltime_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('role', role)
      .single();

    // Calculate new accumulated totals
    const newTotalStash = (existing?.total_stash || 0) + stash;
    const newTotalRep = (existing?.total_rep || 0) + rep;
    const newGamesPlayed = (existing?.games_played || 0) + 1;
    const newBestRound = Math.max(existing?.best_round || 0, bestRound);

    // Upsert accumulated totals
    const { error } = await supabase
      .from('alltime_scores')
      .upsert({
        user_id: userId,
        role: role,
        total_stash: newTotalStash,
        total_rep: newTotalRep,
        games_played: newGamesPlayed,
        best_round: newBestRound,
        timestamp: new Date().toISOString()
      }, {
        onConflict: 'user_id,role'
      });

    if (error) throw error;
    console.log(`[AllTime] Updated all-time stats - Total Stash: ${newTotalStash}, Total Rep: ${newTotalRep}, Games: ${newGamesPlayed}`);
  } catch (error) {
    console.error('[AllTime] Failed to submit all-time score to Supabase:', error);
  }
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
export async function getAllTimeRank(role) {
  return await getGlobalAllTimeRank(role);
}

// Get user's all-time score (uses Supabase only)
export async function getAllTimeScore(role) {
  if (!isOnline()) return null;

  try {
    const userId = getUserID();

    const { data, error } = await supabase
      .from('alltime_scores')
      .select('total_stash, total_rep, games_played, best_round, timestamp')
      .eq('role', role)
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return data ? {
      userId,
      stash: data.total_stash,
      rep: data.total_rep,
      round: data.best_round,
      gamesPlayed: data.games_played,
      timestamp: new Date(data.timestamp).getTime()
    } : null;
  } catch (error) {
    console.warn('[AllTime] Failed to get user all-time score:', error);
    return null;
  }
}

// Get top N all-time entries (GLOBAL by default, local fallback if offline)
export async function getAllTimeTopScores(role, limit = 10) {
  // Fetch from Supabase only (no local fallback)
  if (isOnline()) {
    try {
      const globalScores = await getGlobalAllTimeLeaderboard(role, limit);
      return globalScores;
    } catch (error) {
      console.warn('[Leaderboard] Failed to fetch global all-time scores:', error);
      return [];
    }
  }

  // Offline - return empty
  return [];
}

// ============ GLOBAL LEADERBOARDS (SUPABASE) ============

/**
 * Fetch global daily leaderboard from Supabase
 * @param {string} role - 'runner' or 'plug'
 * @param {number} routeID - Route ID (date in YYYYMMDD format)
 * @param {number} limit - Number of entries to fetch (default 100)
 * @returns {Promise<Array>} Leaderboard entries with usernames
 */
export async function getGlobalDailyLeaderboard(role, routeID = null, limit = 100) {
  if (!isOnline() || !supabase) {
    console.warn('[Leaderboard] Cannot fetch global leaderboard - offline or Supabase not initialized');
    return [];
  }

  try {
    const targetRouteID = routeID || getCurrentRouteID();

    const { data, error } = await supabase
      .from('daily_scores')
      .select(`
        round,
        stash,
        rep,
        timestamp,
        users!inner(id, username)
      `)
      .eq('route_id', targetRouteID)
      .eq('role', role)
      .order('stash', { ascending: false })  // Sort by stash first (highest wins)
      .order('rep', { ascending: false })    // Then by rep (tiebreaker)
      .order('round', { ascending: false })  // Then by round (secondary tiebreaker)
      .limit(limit);

    if (error) throw error;

    // Transform to match local leaderboard format
    const leaderboard = data.map(entry => ({
      userId: entry.users.id,
      username: entry.users.username,
      round: entry.round,
      stash: entry.stash,
      rep: entry.rep,
      timestamp: new Date(entry.timestamp).getTime()
    }));

    console.log(`[Leaderboard] Fetched ${leaderboard.length} global daily scores for ${role}`);
    return leaderboard;
  } catch (error) {
    console.error('[Leaderboard] Failed to fetch global daily leaderboard:', error);
    return [];
  }
}

/**
 * Fetch global all-time leaderboard from Supabase
 * Now shows accumulated totals instead of best ever
 * @param {string} role - 'runner' or 'plug'
 * @param {number} limit - Number of entries to fetch (default 100)
 * @returns {Promise<Array>} Leaderboard entries with usernames
 */
export async function getGlobalAllTimeLeaderboard(role, limit = 100) {
  if (!isOnline() || !supabase) {
    console.warn('[Leaderboard] Cannot fetch global all-time leaderboard - offline or Supabase not initialized');
    return [];
  }

  try {
    const { data, error} = await supabase
      .from('alltime_scores')
      .select(`
        total_stash,
        total_rep,
        games_played,
        best_round,
        timestamp,
        users!inner(id, username)
      `)
      .eq('role', role)
      .order('total_stash', { ascending: false })  // Sort by total stash first
      .order('total_rep', { ascending: false })    // Then by total rep (tiebreaker)
      .limit(limit);

    if (error) throw error;

    // Transform to match local leaderboard format
    const leaderboard = data.map(entry => ({
      userId: entry.users.id,
      username: entry.users.username,
      stash: entry.total_stash,        // Total accumulated stash
      rep: entry.total_rep,              // Total accumulated rep
      round: entry.best_round,           // Highest round reached (for display)
      gamesPlayed: entry.games_played,   // Number of games played
      timestamp: new Date(entry.timestamp).getTime()
    }));

    console.log(`[Leaderboard] Fetched ${leaderboard.length} global all-time scores for ${role}`);
    return leaderboard;
  } catch (error) {
    console.error('[Leaderboard] Failed to fetch global all-time leaderboard:', error);
    return [];
  }
}

/**
 * Get user's global rank for today's route
 */
export async function getGlobalDailyRank(role) {
  if (!isOnline()) return null;

  try {
    const routeID = getCurrentRouteID();
    const userId = getUserID();

    // Get all scores better than user's
    const { count, error } = await supabase
      .from('daily_scores')
      .select('*', { count: 'exact', head: true })
      .eq('route_id', routeID)
      .eq('role', role)
      .or(`round.gt.${userId},and(round.eq.${userId},stash.gt.${userId})`);

    if (error) throw error;
    return (count || 0) + 1; // rank is count + 1
  } catch (error) {
    console.error('[Leaderboard] Failed to get global daily rank:', error);
    return null;
  }
}

/**
 * Get user's global all-time rank
 */
export async function getGlobalAllTimeRank(role) {
  if (!isOnline()) return null;

  try {
    const userId = getUserID();

    const { count, error } = await supabase
      .from('alltime_scores')
      .select('*', { count: 'exact', head: true })
      .eq('role', role)
      .or(`round.gt.${userId},and(round.eq.${userId},stash.gt.${userId})`);

    if (error) throw error;
    return (count || 0) + 1;
  } catch (error) {
    console.error('[Leaderboard] Failed to get global all-time rank:', error);
    return null;
  }
}

export default {
  // Local leaderboards
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
  importLeaderboardData,
  submitAllTimeScore,
  getAllTimeLeaderboard,
  getAllTimeRank,
  getAllTimeScore,
  getAllTimeTopScores,
  // Global leaderboards (Supabase)
  getGlobalDailyLeaderboard,
  getGlobalAllTimeLeaderboard,
  getGlobalDailyRank,
  getGlobalAllTimeRank
};
