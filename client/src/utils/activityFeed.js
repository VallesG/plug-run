// Activity Feed System
// Submits and fetches game events for live Street Scanner display

import { supabase, isOnline } from './supabaseClient.js';
import { getCurrentUserSync } from './userManager.js';

/**
 * Submit an activity event to the feed
 * @param {string} eventType - Type of event (runner_extract, plug_stop, etc.)
 * @param {object} metadata - Event-specific data
 */
export async function submitActivityEvent(eventType, metadata = {}) {
  console.log(`[ActivityFeed] Attempting to submit ${eventType}:`, metadata);

  if (!isOnline()) {
    console.warn('[ActivityFeed] Offline, skipping event submission');
    return;
  }

  try {
    const user = getCurrentUserSync();
    console.log('[ActivityFeed] Current user:', {
      username: user?.username,
      hasSupabaseId: !!user?.supabaseId,
      isGuest: user?.isGuest
    });

    if (!user || !user.supabaseId) {
      console.warn('[ActivityFeed] User not synced to Supabase yet. User:', user);
      console.warn('[ActivityFeed] Events will be tracked once user syncs to Supabase (happens automatically for guests)');
      return;
    }

    // Call the helper function in Supabase
    console.log('[ActivityFeed] Calling log_activity RPC with:', {
      user_id: user.supabaseId,
      username: user.username,
      event_type: eventType
    });

    const { data, error } = await supabase.rpc('log_activity', {
      p_user_id: user.supabaseId,
      p_username: user.username,
      p_event_type: eventType,
      p_metadata: metadata
    });

    if (error) {
      console.error('[ActivityFeed] RPC error:', error);
      return;
    }

    console.log(`[ActivityFeed] ✅ Successfully submitted ${eventType}`, data);
  } catch (err) {
    console.warn('[ActivityFeed] Error submitting activity:', err);
  }
}

/**
 * Fetch recent activity events (last 15 events in past hour)
 * @param {number} limit - Number of events to fetch (default 15)
 * @returns {Array} Array of activity events
 */
export async function fetchRecentActivity(limit = 15) {
  if (!isOnline()) {
    console.log('[ActivityFeed] Offline, skipping fetch');
    return [];
  }

  try {
    console.log('[ActivityFeed] Fetching recent activity (limit:', limit, ')');
    const { data, error } = await supabase
      .from('activity_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ActivityFeed] Failed to fetch activity:', error);
      return [];
    }

    console.log(`[ActivityFeed] ✅ Fetched ${data?.length || 0} activities`);
    return data || [];
  } catch (err) {
    console.error('[ActivityFeed] Error fetching activity:', err);
    return [];
  }
}

/**
 * Helper to submit runner extraction event
 */
export function logRunnerExtract(round, hadStash = true) {
  submitActivityEvent('runner_extract', {
    stash: hadStash ? 1 : 0,
    round: round,
    mode: 'runner'
  });
}

/**
 * Helper to submit plug stop event
 */
export function logPlugStop(round) {
  submitActivityEvent('plug_stop', {
    round: round,
    mode: 'plug'
  });
}

/**
 * Helper to submit runner eliminated event
 */
export function logRunnerEliminated(round, hadStash = false) {
  submitActivityEvent('runner_eliminated', {
    round: round,
    had_stash: hadStash
  });
}

/**
 * Helper to submit personal best event
 */
export function logPersonalBest(round, mode, previousBest) {
  submitActivityEvent('personal_best', {
    round: round,
    mode: mode,
    previous: previousBest
  });
}

/**
 * Helper to submit bunk pickup event
 */
export function logBunkPickup(round) {
  submitActivityEvent('bunk_pickup', {
    round: round
  });
}

/**
 * Helper to submit account claimed event
 */
export function logAccountClaimed(newUsername, oldUsername) {
  submitActivityEvent('account_claimed', {
    new_username: newUsername,
    old_username: oldUsername
  });
}

/**
 * Helper to submit win streak event
 */
export function logWinStreak(streak, mode) {
  // Only log streaks of 3+ to avoid spam
  if (streak >= 3) {
    submitActivityEvent('win_streak', {
      streak: streak,
      mode: mode
    });
  }
}
