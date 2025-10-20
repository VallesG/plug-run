// Local user management system (easily portable to server auth later)
// Supports guest accounts and claimed accounts

const STORAGE_KEY_USER = 'pr_user';
const STORAGE_KEY_GUEST_ID = 'pr_guest_id';

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

// Get or create current user
export function getCurrentUser() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USER);
    if (stored) {
      const user = JSON.parse(stored);
      return user;
    }

    // No user exists - create guest account
    return createGuestAccount();
  } catch (e) {
    console.warn('[UserManager] Failed to load user, creating new guest:', e);
    return createGuestAccount();
  }
}

// Create a new guest account
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
  return user;
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

// Update user stats
export function updateUserStats(updates) {
  const user = getCurrentUser();
  user.stats = { ...user.stats, ...updates };
  saveUser(user);
  return user;
}

// Claim guest account - upgrade to permanent account
// This is where you'd integrate server auth later
export function claimAccount(username, email = null, password = null) {
  const user = getCurrentUser();

  if (!user.isGuest) {
    return { success: false, error: 'Account already claimed' };
  }

  // Validate username
  if (!username || username.length < 3 || username.length > 20) {
    return { success: false, error: 'Username must be 3-20 characters' };
  }

  // Check if username is taken (local check - would be server check later)
  if (isUsernameTaken(username)) {
    return { success: false, error: 'Username already taken' };
  }

  // Upgrade account
  user.username = username;
  user.isGuest = false;
  user.claimedAt = Date.now();

  // Would send to server here:
  // await fetch('/api/claim-account', { method: 'POST', body: { user, email, password } })

  saveUser(user);
  console.log('[UserManager] Account claimed:', username);
  return { success: true, user };
}

// Check if username is already taken (local only for now)
function isUsernameTaken(username) {
  // For local-only, just check if it matches current user
  const user = getCurrentUser();
  return user.username.toLowerCase() === username.toLowerCase();

  // Server version would be:
  // const response = await fetch(`/api/check-username?username=${username}`)
  // return response.json().taken
}

// Get username for display
export function getUsername() {
  const user = getCurrentUser();
  return user.username;
}

// Check if user is guest
export function isGuestAccount() {
  const user = getCurrentUser();
  return user.isGuest;
}

// Get user ID for leaderboard submissions
export function getUserID() {
  const user = getCurrentUser();
  return user.id;
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
  createGuestAccount,
  saveUser,
  updateUserStats,
  claimAccount,
  getUsername,
  isGuestAccount,
  getUserID,
  resetUser,
  exportUserData,
  importUserData
};
