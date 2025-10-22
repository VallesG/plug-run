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

    // Sign up anonymous user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `${guestUsername}@guest.plugrunla.local`,
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
 */
export async function claimGuestAccount(email, password, newUsername = null) {
  if (!supabase) return { error: 'Supabase not initialized' };

  try {
    const currentUser = await getCurrentSupabaseUser();
    if (!currentUser) throw new Error('No user logged in');

    // 1. Update auth user email
    const { error: updateError } = await supabase.auth.updateUser({
      email: email,
      password: password,
      data: {
        username: newUsername || currentUser.user_metadata.username
      }
    });

    if (updateError) throw updateError;

    // 2. Update user profile
    const { error: profileError } = await supabase
      .from('users')
      .update({
        username: newUsername || currentUser.user_metadata.username,
        is_guest: false,
        claimed_at: new Date().toISOString()
      })
      .eq('id', currentUser.id);

    if (profileError) throw profileError;

    return { success: true, error: null };
  } catch (error) {
    console.error('[Supabase] Failed to claim account:', error);
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
