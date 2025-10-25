// Route progress tracking for daily challenges (resets at 12am PST)
// Stores highest round reached per role during current route

import { getCurrentRouteID } from './seededRandom.js';

const STORAGE_KEY_PREFIX = 'pr_route_';

// Get progress for current route
export function getCurrentRouteProgress() {
  const routeID = getCurrentRouteID();
  const key = STORAGE_KEY_PREFIX + routeID;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return {
        routeID,
        plugHighestRound: 0,
        runnerHighestRound: 0,
        completedRounds: {
          runner: [], // rounds where stash was earned today
          plug: []
        },
        completionCounts: {
          runner: {}, // { 1: 3, 2: 1 } = round 1 completed 3 times, round 2 once
          plug: {}
        },
        spawnSwapUsed: {
          runner: false, // one spawn swap per route per role
          plug: false
        },
        timestamp: Date.now()
      };
    }

    const data = JSON.parse(stored);
    return {
      routeID: data.routeID || routeID,
      plugHighestRound: data.plugHighestRound || 0,
      runnerHighestRound: data.runnerHighestRound || 0,
      completedRounds: data.completedRounds || { runner: [], plug: [] },
      completionCounts: data.completionCounts || { runner: {}, plug: {} },
      spawnSwapUsed: data.spawnSwapUsed || { runner: false, plug: false },
      timestamp: data.timestamp || Date.now()
    };
  } catch (e) {
    console.warn('[RouteProgress] Failed to load progress:', e);
    return {
      routeID,
      plugHighestRound: 0,
      runnerHighestRound: 0,
      completedRounds: { runner: [], plug: [] },
      completionCounts: { runner: {}, plug: {} },
      spawnSwapUsed: { runner: false, plug: false },
      timestamp: Date.now()
    };
  }
}

// Update progress for current route
export function updateRouteProgress(role, roundReached) {
  const routeID = getCurrentRouteID();
  const key = STORAGE_KEY_PREFIX + routeID;

  try {
    const current = getCurrentRouteProgress();

    // Update highest round for this role
    if (role === 'plug') {
      current.plugHighestRound = Math.max(current.plugHighestRound, roundReached);
    } else if (role === 'runner') {
      current.runnerHighestRound = Math.max(current.runnerHighestRound, roundReached);
    }

    current.timestamp = Date.now();

    localStorage.setItem(key, JSON.stringify(current));
    return current;
  } catch (e) {
    console.warn('[RouteProgress] Failed to save progress:', e);
    return null;
  }
}

// Clean up old route data (keep only last 5 routes to save space)
export function cleanupOldRoutes() {
  try {
    const currentRouteID = getCurrentRouteID();
    const allKeys = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        allKeys.push(key);
      }
    }

    // Sort by route ID (newer = higher number)
    allKeys.sort((a, b) => {
      const idA = parseInt(a.replace(STORAGE_KEY_PREFIX, ''), 10);
      const idB = parseInt(b.replace(STORAGE_KEY_PREFIX, ''), 10);
      return idB - idA; // descending
    });

    // Keep current route + 4 most recent
    const toKeep = allKeys.slice(0, 5);
    const toDelete = allKeys.filter(k => !toKeep.includes(k));

    for (const key of toDelete) {
      localStorage.removeItem(key);
    }

    console.log('[RouteProgress] Cleaned up', toDelete.length, 'old route(s)');
  } catch (e) {
    console.warn('[RouteProgress] Failed to cleanup:', e);
  }
}

// Check if user has unlocked Street Wars mode (requires round 50 in any PvE mode)
export function hasUnlockedStreetWars() {
  try {
    const progress = getCurrentRouteProgress();
    const highestRound = Math.max(
      progress.plugHighestRound || 0,
      progress.runnerHighestRound || 0
    );
    return highestRound >= 50;
  } catch {
    return false;
  }
}

// Check if user has premium/paid status
// TODO: LOCK THIS BEFORE LAUNCH - Currently all users get premium features for testing
export function isPremiumUser() {
  try {
    // FEATURE FLAG: Set to true to unlock for all users during development
    const UNLOCK_PREMIUM_FOR_TESTING = true;
    if (UNLOCK_PREMIUM_FOR_TESTING) return true;

    // Production check (enable this at launch)
    const premium = localStorage.getItem('pr_premium');
    return premium === '1' || premium === 'true';
  } catch {
    return false;
  }
}

// Set premium status (for testing or purchase flow)
export function setPremiumUser(isPremium) {
  try {
    localStorage.setItem('pr_premium', isPremium ? '1' : '0');
  } catch (e) {
    console.warn('[RouteProgress] Failed to set premium status:', e);
  }
}

// Get display info for current route
export function getRouteDisplayInfo() {
  const routeID = getCurrentRouteID();
  const progress = getCurrentRouteProgress();

  // Parse route ID to human-readable format
  // Format: YYYYMMDD (daily reset at midnight PST)
  const str = String(routeID);
  const year = parseInt(str.substring(0, 4), 10);
  const month = parseInt(str.substring(4, 6), 10);
  const day = parseInt(str.substring(6, 8), 10);

  const dateStr = `${month}/${day}/${year}`;

  return {
    routeID,
    dateStr,
    plugHighestRound: progress.plugHighestRound,
    runnerHighestRound: progress.runnerHighestRound
  };
}

// ============ STASH & REP TRACKING ============

// Check if user has already earned stash for this round today
export function hasEarnedStashForRound(role, round) {
  const progress = getCurrentRouteProgress();
  return progress.completedRounds[role]?.includes(round) || false;
}

// Record round completion and return rewards info
export function recordRoundCompletion(role, round) {
  const routeID = getCurrentRouteID();
  const key = STORAGE_KEY_PREFIX + routeID;
  const progress = getCurrentRouteProgress();

  // Check if this is first completion today (for stash)
  const isFirstCompletion = !progress.completedRounds[role].includes(round);

  // Add to completed rounds if first time
  if (isFirstCompletion) {
    progress.completedRounds[role].push(round);
  }

  // Increment completion count (for REP multiplier)
  if (!progress.completionCounts[role][round]) {
    progress.completionCounts[role][round] = 0;
  }
  progress.completionCounts[role][round]++;

  // Update highest round
  if (role === 'plug') {
    progress.plugHighestRound = Math.max(progress.plugHighestRound, round);
  } else if (role === 'runner') {
    progress.runnerHighestRound = Math.max(progress.runnerHighestRound, round);
  }

  progress.timestamp = Date.now();

  try {
    localStorage.setItem(key, JSON.stringify(progress));
  } catch (e) {
    console.warn('[RouteProgress] Failed to save completion:', e);
  }

  // Calculate REP multiplier based on completion count
  const completionCount = progress.completionCounts[role][round];
  const repMultiplier = getRepMultiplier(completionCount);

  return {
    earnedStash: isFirstCompletion, // true = get +1 stash, false = no stash
    completionCount, // how many times they've done this round today
    repMultiplier, // 1.0, 0.75, 0.5, 0.25, 0.1
    isFirstCompletion
  };
}

// Calculate REP multiplier based on how many times round was completed today
export function getRepMultiplier(completionCount) {
  if (completionCount === 1) return 1.0;   // 100% - first time
  if (completionCount === 2) return 0.75;  // 75% - second time
  if (completionCount === 3) return 0.5;   // 50% - third time
  if (completionCount === 4) return 0.25;  // 25% - fourth time
  return 0.1;                               // 10% - fifth+ time (farming penalty)
}

// Get completion info for a specific round (for display)
export function getRoundCompletionInfo(role, round) {
  const progress = getCurrentRouteProgress();
  const hasCompleted = progress.completedRounds[role]?.includes(round) || false;
  const completionCount = progress.completionCounts[role]?.[round] || 0;
  const repMultiplier = completionCount > 0 ? getRepMultiplier(completionCount + 1) : 1.0;

  return {
    hasCompleted,
    completionCount,
    nextRepMultiplier: repMultiplier, // what they'll get next time
    canEarnStash: !hasCompleted
  };
}

// ============ SESSION STATE TRACKING (Continue Feature) ============

const SESSION_KEY_PREFIX = 'pr_session_';

// Save session state for a role (for continue feature)
export function saveSessionState(role, sessionData) {
  const routeID = getCurrentRouteID();
  const key = `${SESSION_KEY_PREFIX}${routeID}_${role}`;

  try {
    const stateToSave = {
      routeID,
      role,
      pveRound: sessionData.pveRound,
      pveSessionStash: sessionData.pveSessionStash || 0,
      pveSessionRep: sessionData.pveSessionRep || 0,
      pveBestRound: sessionData.pveBestRound || 0,
      timestamp: Date.now()
    };

    localStorage.setItem(key, JSON.stringify(stateToSave));
    console.log(`[RouteProgress] Saved session for ${role} at round ${sessionData.pveRound}`);
    return true;
  } catch (e) {
    console.warn('[RouteProgress] Failed to save session state:', e);
    return false;
  }
}

// Get saved session state for a role
export function getSessionState(role) {
  const routeID = getCurrentRouteID();
  const key = `${SESSION_KEY_PREFIX}${routeID}_${role}`;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return null;
    }

    const data = JSON.parse(stored);

    // Verify it's for the current route
    if (data.routeID !== routeID) {
      console.log(`[RouteProgress] Session expired (old route), clearing`);
      clearSessionState(role);
      return null;
    }

    return {
      pveRound: data.pveRound || 1,
      pveSessionStash: data.pveSessionStash || 0,
      pveSessionRep: data.pveSessionRep || 0,
      pveBestRound: data.pveBestRound || 0,
      timestamp: data.timestamp
    };
  } catch (e) {
    console.warn('[RouteProgress] Failed to load session state:', e);
    return null;
  }
}

// Clear session state for a role (when starting fresh)
export function clearSessionState(role) {
  const routeID = getCurrentRouteID();
  const key = `${SESSION_KEY_PREFIX}${routeID}_${role}`;

  try {
    localStorage.removeItem(key);
    console.log(`[RouteProgress] Cleared session for ${role}`);
    return true;
  } catch (e) {
    console.warn('[RouteProgress] Failed to clear session state:', e);
    return false;
  }
}

// ============ SPAWN SWAP TRACKING (One per route per role) ============

// Check if user has already used their spawn swap for this route
export function hasUsedSpawnSwap(role) {
  const progress = getCurrentRouteProgress();
  return progress.spawnSwapUsed?.[role] || false;
}

// Mark spawn swap as used for current route and role
export function markSpawnSwapUsed(role) {
  const routeID = getCurrentRouteID();
  const key = STORAGE_KEY_PREFIX + routeID;
  const progress = getCurrentRouteProgress();

  if (!progress.spawnSwapUsed) {
    progress.spawnSwapUsed = { runner: false, plug: false };
  }

  progress.spawnSwapUsed[role] = true;
  progress.timestamp = Date.now();

  try {
    localStorage.setItem(key, JSON.stringify(progress));
    console.log(`[RouteProgress] Marked spawn swap as used for ${role}`);
    return true;
  } catch (e) {
    console.warn('[RouteProgress] Failed to mark spawn swap:', e);
    return false;
  }
}
