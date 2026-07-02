// Offline stub — online backend removed.
// Keeps the same export surface as the old Supabase client so
// userManager / leaderboardManager / authUI / activityFeed work unchanged.
// All data lives in localStorage; every online path is a graceful no-op.

const OFFLINE_MSG = 'Online features are disabled in this build';

// Always null — consumers already guard with `if (!supabase)` / `isOnline()`
export const supabase = null;

export function isOnline() {
  return false;
}

export async function getCurrentSupabaseUser() {
  return null;
}

export async function signUpWithEmail() {
  return { error: OFFLINE_MSG };
}

export async function signInWithEmail() {
  return { error: OFFLINE_MSG };
}

export async function signOut() {
  return { error: null };
}

export async function createGuestSession() {
  return { error: OFFLINE_MSG };
}

export async function claimGuestAccount() {
  return { success: false, error: OFFLINE_MSG };
}

export async function isUsernameAvailable() {
  // Local-only: no global registry, so any name is fine
  return true;
}

export async function getUserProfile() {
  return null;
}

export async function updateUserProfile() {
  return { error: OFFLINE_MSG };
}

export function onAuthStateChange() {
  // Return unsubscribe no-op, matching original contract
  return () => {};
}

export default {
  supabase,
  isOnline,
  getCurrentSupabaseUser,
  signUpWithEmail,
  signInWithEmail,
  signOut,
  createGuestSession,
  claimGuestAccount,
  isUsernameAvailable,
  getUserProfile,
  updateUserProfile,
  onAuthStateChange
};
