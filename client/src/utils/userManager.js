// User management system with Supabase integration
// Supports guest accounts (localStorage), claimed accounts (Supabase)
// Falls back to localStorage-only when offline

import {
  supabase,
  isOnline as supabaseIsOnline,
  getCurrentSupabaseUser,
  signUpWithEmail,
  createGuestSession,
  claimGuestAccount,
  isUsernameAvailable,
  getUserProfile,
  updateUserProfile
} from './supabaseClient.js';

// Re-export isOnline for other modules
export const isOnline = supabaseIsOnline;

const STORAGE_KEY_USER = 'pr_user';
const STORAGE_KEY_GUEST_ID = 'pr_guest_id';
const STORAGE_KEY_SYNCED = 'pr_synced'; // Track if user data is synced to Supabase

// User object structure
// {
//   id: string,           // unique user ID
//   username: string,     // display name
//   isGuest: boolean,     // true for guest accounts
//   createdAt: number,    // timestamp
//   stats: {
//     totalStash: number,
//     totalRep: number,
//     gamesPlayed: number,
//     bestPlugRound: number,
//     bestRunnerRound: number
//   }
// }

// Generate random guest ID (5 digits)
function generateGuestID() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// Get or create current user (hybrid: Supabase + localStorage)
export async function getCurrentUser() {
  try {
    // Check if there's a Supabase session first (prioritize server state)
    if (supabaseIsOnline()) {
      try {
        const supabaseUser = await getCurrentSupabaseUser();

        // If there's a valid Supabase session, load that user
        if (supabaseUser) {
          const stored = localStorage.getItem(STORAGE_KEY_USER);
          const localUser = stored ? JSON.parse(stored) : null;

          // If localStorage user doesn't match Supabase session, fetch from Supabase
          if (!localUser || localUser.supabaseId !== supabaseUser.id) {
            console.log('[UserManager] Supabase session found, loading user profile...');
            const { profile, error } = await getUserProfile(supabaseUser.id);

            if (profile && !error) {
              // Create user object from Supabase profile
              const user = {
                id: profile.id,
                supabaseId: profile.id,
                username: profile.username,
                isGuest: profile.is_guest,
                createdAt: new Date(profile.created_at).getTime(),
                stats: {
                  totalStash: profile.total_stash || 0,
                  totalRep: profile.total_rep || 0,
                  gamesPlayed: profile.games_played || 0,
                  bestPlugRound: profile.best_plug_round || 0,
                  bestRunnerRound: profile.best_runner_round || 0
                }
              };
              saveUser(user);
              console.log('[UserManager] Loaded user from Supabase:', user.username);
              return user;
            }
          } else {
            // IDs match, just sync latest data
            const { profile } = await getUserProfile(supabaseUser.id);
            if (profile) {
              localUser.username = profile.username;
              localUser.isGuest = profile.is_guest;
              localUser.stats.totalStash = profile.total_stash || 0;
              localUser.stats.totalRep = profile.total_rep || 0;
              localUser.stats.gamesPlayed = profile.games_played || 0;
              localUser.stats.bestPlugRound = profile.best_plug_round || 0;
              localUser.stats.bestRunnerRound = profile.best_runner_round || 0;
              saveUser(localUser);
              return localUser;
            }
          }
        }
      } catch (err) {
        // Session error means no user signed in - continue to localStorage check
        if (!err.message?.includes('Auth session missing')) {
          console.warn('[UserManager] Failed to check Supabase session:', err);
        }
      }
    }

    // No Supabase session or offline - check localStorage
    const stored = localStorage.getItem(STORAGE_KEY_USER);
    if (stored) {
      const user = JSON.parse(stored);

      // If guest user doesn't have Supabase ID yet, try to sync them
      if (user.isGuest && !user.supabaseId && supabaseIsOnline()) {
        console.log('[UserManager] Found guest without Supabase ID, syncing now...');
        syncGuestToSupabase(user).catch(err => {
          console.error('[UserManager] Failed to sync existing guest:', err);
        });
      }

      return user;
    }

    // No local user exists - create guest account
    return createGuestAccount();
  } catch (e) {
    console.warn('[UserManager] Failed to load user, creating new guest:', e);
    return createGuestAccount();
  }
}

// Synchronous version for places that can't use async (kept for backward compatibility)
export function getCurrentUserSync() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USER);
    if (stored) {
      const user = JSON.parse(stored);
      return user;
    }
    // If no stored user, create guest (but won't be synced to Supabase yet)
    return createGuestAccount();
  } catch (e) {
    console.warn('[UserManager] Failed to load user, creating new guest:', e);
    return createGuestAccount();
  }
}

// Create a new guest account (localStorage only initially)
export function createGuestAccount() {
  const guestID = generateGuestID();
  const user = {
    id: `guest_${guestID}_${Date.now()}`,
    username: `user${guestID}`,
    isGuest: true,
    createdAt: Date.now(),
    stats: {
      totalStash: 0,
      totalRep: 0,
      gamesPlayed: 0,
      bestPlugRound: 0,
      bestRunnerRound: 0
    }
  };

  saveUser(user);
  console.log('[UserManager] Created guest account:', user.username);

  // Optionally sync guest to Supabase for global leaderboards (non-blocking)
  if (supabaseIsOnline()) {
    console.log('[UserManager] Starting guest sync to Supabase...');
    syncGuestToSupabase(user).catch(err => {
      console.error('[UserManager] Failed to sync guest to Supabase:', err);
    });
  } else {
    console.log('[UserManager] Supabase offline, skipping guest sync');
  }

  return user;
}

// Sync guest account to Supabase for global leaderboard participation
async function syncGuestToSupabase(user) {
  if (!supabaseIsOnline() || !user.isGuest) {
    console.log('[UserManager] Skipping guest sync - offline or not a guest');
    return;
  }

  try {
    console.log(`[UserManager] Creating Supabase session for guest: ${user.username}`);

    // Create anonymous Supabase session for this guest
    const { user: supabaseUser, error } = await createGuestSession(user.username);

    if (error) {
      console.error('[UserManager] createGuestSession error:', error);
      throw new Error(error);
    }

    if (!supabaseUser) {
      console.error('[UserManager] No user returned from createGuestSession');
      return;
    }

    console.log('[UserManager] ✅ Guest synced to Supabase! ID:', supabaseUser.id);

    // Update local user with Supabase ID (for score submissions)
    user.supabaseId = supabaseUser.id;
    saveUser(user);

    console.log('[UserManager] Saved supabaseId to local user');
  } catch (error) {
    console.error('[UserManager] ❌ Failed to sync guest to Supabase:', error);
    console.error('[UserManager] Error details:', error.message, error.stack);
  }
}

// Save user to localStorage
export function saveUser(user) {
  try {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return true;
  } catch (e) {
    console.warn('[UserManager] Failed to save user:', e);
    return false;
  }
}

// Update user stats (sync to Supabase if online)
export async function updateUserStats(updates) {
  const user = getCurrentUserSync(); // Use sync version to avoid async issues
  user.stats = { ...user.stats, ...updates };
  saveUser(user);

  // Sync to Supabase if online
  if (supabaseIsOnline()) {
    syncStatsToSupabase(user, updates).catch(err => {
      console.warn('[UserManager] Failed to sync stats to Supabase:', err);
    });
  }

  return user;
}

// Sync stats to Supabase (non-blocking)
async function syncStatsToSupabase(user, updates) {
  if (!supabaseIsOnline()) return;

  // Only sync if user has a Supabase ID (i.e., already synced as guest or claimed)
  if (!user.supabaseId) {
    console.log('[UserManager] User not yet synced to Supabase, skipping stats sync');
    return;
  }

  try {
    // Map local stats to Supabase columns
    const supabaseUpdates = {};
    if (updates.totalStash !== undefined) supabaseUpdates.total_stash = updates.totalStash;
    if (updates.totalRep !== undefined) supabaseUpdates.total_rep = updates.totalRep;
    if (updates.gamesPlayed !== undefined) supabaseUpdates.games_played = updates.gamesPlayed;
    if (updates.bestPlugRound !== undefined) supabaseUpdates.best_plug_round = updates.bestPlugRound;
    if (updates.bestRunnerRound !== undefined) supabaseUpdates.best_runner_round = updates.bestRunnerRound;

    await updateUserProfile(user.supabaseId, supabaseUpdates);
    console.log('[UserManager] Stats synced to Supabase');
  } catch (error) {
    // Ignore auth session errors (user hasn't authenticated yet)
    if (!error.message?.includes('Auth session missing')) {
      console.warn('[UserManager] Failed to sync stats to Supabase:', error);
    }
  }
}

// Claim guest account - upgrade to permanent account (Supabase integrated)
export async function claimAccount(username, email, password) {
  const user = getCurrentUserSync();

  if (!user.isGuest) {
    return { success: false, error: 'Account already claimed' };
  }

  // Validate username
  if (!username || username.length < 3 || username.length > 20) {
    return { success: false, error: 'Username must be 3-20 characters' };
  }

  // Validate alphanumeric + underscore
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { success: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  // Check if email and password provided
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  // Validate password length
  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  // Online mode: Use Supabase
  if (supabaseIsOnline()) {
    try {
      // Check if username is available
      const { available, error: availError } = await isUsernameAvailable(username);
      if (availError) throw new Error(availError);
      if (!available) {
        return { success: false, error: 'Username already taken' };
      }

      // If user already has Supabase session (guest), claim it
      const supabaseUser = await getCurrentSupabaseUser();
      if (supabaseUser) {
        // Upgrade existing guest session
        const { success, error } = await claimGuestAccount(email, password, username);
        if (error) throw new Error(error);
      } else {
        // Create new account
        const { user: newUser, error } = await signUpWithEmail(email, password, username);
        if (error) throw new Error(error);

        // Migrate local stats to Supabase
        await updateUserProfile(newUser.id, {
          total_stash: user.stats.totalStash || 0,
          total_rep: user.stats.totalRep || 0,
          games_played: user.stats.gamesPlayed || 0,
          best_plug_round: user.stats.bestPlugRound || 0,
          best_runner_round: user.stats.bestRunnerRound || 0
        });
      }

      // Update local user
      user.username = username;
      user.isGuest = false;
      user.claimedAt = Date.now();
      saveUser(user);

      console.log('[UserManager] Account claimed via Supabase:', username);
      return { success: true, user };
    } catch (error) {
      console.error('[UserManager] Failed to claim account:', error);
      return { success: false, error: error.message || 'Failed to claim account' };
    }
  }

  // Offline mode: Local-only claim (will sync when online)
  user.username = username;
  user.isGuest = false;
  user.claimedAt = Date.now();
  user.pendingClaim = { email, password }; // Store for later sync
  saveUser(user);

  console.log('[UserManager] Account claimed locally (offline):', username);
  return { success: true, user, offline: true };
}

// Get username for display
export function getUsername() {
  const user = getCurrentUserSync();
  return user.username;
}

// Check if user is guest
export function isGuestAccount() {
  const user = getCurrentUserSync();
  return user.isGuest;
}

// Get user ID for leaderboard submissions (use Supabase ID if available)
export function getUserID() {
  const user = getCurrentUserSync();
  return user.supabaseId || user.id;
}

// Reset user (for testing)
export function resetUser() {
  try {
    localStorage.removeItem(STORAGE_KEY_USER);
    return createGuestAccount();
  } catch (e) {
    console.warn('[UserManager] Failed to reset user:', e);
    return null;
  }
}

// Export user data (for server sync later)
export function exportUserData() {
  const user = getCurrentUser();
  return {
    ...user,
    exportedAt: Date.now()
  };
}

// Import user data (from server)
export function importUserData(userData) {
  try {
    saveUser(userData);
    console.log('[UserManager] User data imported:', userData.username);
    return { success: true };
  } catch (e) {
    console.warn('[UserManager] Failed to import user data:', e);
    return { success: false, error: e.message };
  }
}

export default {
  getCurrentUser,
  getCurrentUserSync,
  createGuestAccount,
  saveUser,
  updateUserStats,
  claimAccount,
  getUsername,
  isGuestAccount,
  getUserID,
  resetUser,
  exportUserData,
  importUserData,
  isOnline
};
