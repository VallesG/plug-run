// Supabase client initialization and helper functions
// Handles authentication and database connections

import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
// In Vite, env vars must be prefixed with VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing environment variables - running in offline mode');
  console.warn('[Supabase] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

// Create Supabase client (will be null if env vars missing)
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Check if Supabase is available (online mode)
export function isOnline() {
  return supabase !== null;
}

// ============================================
// AUTH HELPERS
// ============================================

/**
 * Get current authenticated user from Supabase
 */
export async function getCurrentSupabaseUser() {
  if (!supabase) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.warn('[Supabase] Failed to get current user:', error);
    return null;
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email, password, username) {
  if (!supabase) {
    return { error: 'Supabase not initialized - check environment variables' };
  }

  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username
        }
      }
    });

    if (authError) throw authError;

    // 2. Create user profile in public.users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        username: username,
        is_guest: false,
        claimed_at: new Date().toISOString()
      });

    if (profileError) throw profileError;

    return { user: authData.user, error: null };
  } catch (error) {
    console.error('[Supabase] Sign up failed:', error);
    return { user: null, error: error.message };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password) {
  if (!supabase) {
    return { error: 'Supabase not initialized - check environment variables' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    console.error('[Supabase] Sign in failed:', error);
    return { user: null, session: null, error: error.message };
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  if (!supabase) return { error: 'Supabase not initialized' };

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Clear local storage to ensure user is fully signed out
    localStorage.removeItem('pr_user');
    localStorage.removeItem('pr_guest_id');
    localStorage.removeItem('pr_synced');

    console.log('[Supabase] Sign out successful - cleared local storage');
    return { error: null };
  } catch (error) {
    console.error('[Supabase] Sign out failed:', error);
    return { error: error.message };
  }
}

/**
 * Create anonymous guest session
 */
export async function createGuestSession(guestUsername) {
  if (!supabase) {
    console.error('[Supabase] createGuestSession: Supabase not initialized');
    return { error: 'Supabase not initialized' };
  }

  try {
    console.log(`[Supabase] Creating guest session for: ${guestUsername}`);

    // Sign up anonymous user with auto-confirm (allows email updates later)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `${guestUsername}@guests.plugrunla.com`, // Use valid domain format
      password: Math.random().toString(36).substring(2, 15), // random password
      options: {
        data: {
          username: guestUsername,
          is_guest: true
        },
        emailRedirectTo: undefined // Don't send confirmation email
      }
    });

    if (authError) {
      console.error('[Supabase] Auth signup error:', authError);
      throw authError;
    }

    if (!authData || !authData.user) {
      console.error('[Supabase] No user data returned from signUp');
      throw new Error('No user data returned from signUp');
    }

    console.log('[Supabase] Auth user created:', authData.user.id);

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        username: guestUsername,
        is_guest: true
      });

    if (profileError) {
      console.error('[Supabase] Profile insert error:', profileError);
      throw profileError;
    }

    console.log('[Supabase] ✅ Guest profile created successfully');

    return { user: authData.user, error: null };
  } catch (error) {
    console.error('[Supabase] ❌ Failed to create guest session:', error);
    return { user: null, error: error.message };
  }
}

/**
 * Claim guest account (upgrade to permanent account)
 * Creates a new account with real credentials and migrates guest data
 */
export async function claimGuestAccount(email, password, newUsername = null) {
  if (!supabase) return { error: 'Supabase not initialized' };

  try {
    const currentUser = await getCurrentSupabaseUser();
    if (!currentUser) throw new Error('No user logged in');

    const guestId = currentUser.id;
    const finalUsername = newUsername || currentUser.user_metadata.username;

    console.log('[Supabase] Starting claim process for guest:', guestId);

    // 1. Get current guest's profile data to migrate
    const { data: guestProfile, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', guestId)
      .single();

    if (fetchError) {
      console.error('[Supabase] Failed to fetch guest profile:', fetchError);
      throw fetchError;
    }

    console.log('[Supabase] Guest profile retrieved, migrating data...');

    // 2. Create new auth user with real credentials
    const { data: newAuthData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: finalUsername,
          is_guest: false
        }
      }
    });

    if (signUpError) {
      console.error('[Supabase] Failed to create new account:', signUpError);
      throw signUpError;
    }

    if (!newAuthData || !newAuthData.user) {
      throw new Error('No user data returned from signUp');
    }

    const newUserId = newAuthData.user.id;
    console.log('[Supabase] New auth user created:', newUserId);

    // 3. Create new user profile with migrated data
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: newUserId,
        username: finalUsername,
        is_guest: false,
        claimed_at: new Date().toISOString(),
        created_at: guestProfile.created_at, // Preserve original creation time
        // Migrate any other relevant fields from guest profile
        // Add other fields here as needed
      });

    if (insertError) {
      console.error('[Supabase] Failed to create new profile:', insertError);
      // Note: Auth user is created but profile failed. This leaves an orphaned auth user,
      // but they won't be able to sign in without a profile. Would need server-side
      // cleanup to handle this edge case properly.
      throw insertError;
    }

    console.log('[Supabase] New profile created, migrating stats...');

    // 4. Migrate game stats from guest to new account
    // Update all game_stats records to point to new user
    const { error: statsError } = await supabase
      .from('game_stats')
      .update({ user_id: newUserId })
      .eq('user_id', guestId);

    if (statsError) {
      console.warn('[Supabase] Warning: Failed to migrate game stats:', statsError);
      // Don't throw - we can continue even if stats migration fails
    }

    // 5. Migrate all-time leaderboard scores
    const { error: alltimeError } = await supabase
      .from('alltime_scores')
      .update({ user_id: newUserId })
      .eq('user_id', guestId);

    if (alltimeError) {
      console.warn('[Supabase] Warning: Failed to migrate all-time scores:', alltimeError);
      // Don't throw - we can continue even if migration fails
    }

    // 6. Migrate daily leaderboard scores
    const { error: dailyError } = await supabase
      .from('daily_scores')
      .update({ user_id: newUserId })
      .eq('user_id', guestId);

    if (dailyError) {
      console.warn('[Supabase] Warning: Failed to migrate daily scores:', dailyError);
      // Don't throw - we can continue even if migration fails
    }

    // 7. Delete old guest profile (this will cascade delete related records if configured)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', guestId);

    if (deleteError) {
      console.warn('[Supabase] Warning: Failed to delete guest profile:', deleteError);
      // Don't throw - account is already claimed
    }

    console.log('[Supabase] ✅ Account claimed successfully!');
    console.log('[Supabase] Old guest ID:', guestId);
    console.log('[Supabase] New user ID:', newUserId);

    // Note: User is now signed in with the new account automatically
    return { success: true, user: newAuthData.user, error: null };
  } catch (error) {
    console.error('[Supabase] ❌ Failed to claim account:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username) {
  if (!supabase) return { available: false, error: 'Supabase not initialized' };

  try {
    const { data, error } = await supabase
      .rpc('is_username_available', { username_to_check: username });

    if (error) throw error;
    return { available: data, error: null };
  } catch (error) {
    console.error('[Supabase] Failed to check username:', error);
    return { available: false, error: error.message };
  }
}

/**
 * Get user profile from database
 */
export async function getUserProfile(userId) {
  if (!supabase) return { profile: null, error: 'Supabase not initialized' };

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { profile: data, error: null };
  } catch (error) {
    console.error('[Supabase] Failed to get user profile:', error);
    return { profile: null, error: error.message };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId, updates) {
  if (!supabase) return { error: 'Supabase not initialized' };

  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { profile: data, error: null };
  } catch (error) {
    console.error('[Supabase] Failed to update profile:', error);
    return { profile: null, error: error.message };
  }
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(callback) {
  if (!supabase) {
    console.warn('[Supabase] Cannot listen for auth changes - Supabase not initialized');
    return () => {};
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Supabase] Auth state changed:', event);
    callback(event, session);
  });

  // Return unsubscribe function
  return () => {
    subscription?.unsubscribe();
  };
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
