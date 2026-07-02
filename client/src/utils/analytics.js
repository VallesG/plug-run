/**
 * Analytics utility for tracking game events via Google Analytics 4
 */

/**
 * Track a custom game event
 * @param {string} eventName - Name of the event
 * @param {object} params - Event parameters
 */
export function trackEvent(eventName, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

/**
 * Track when a game mode starts
 * @param {string} mode - 'pve' for runner/plug modes
 * @param {string} role - 'runner' or 'plug'
 * @param {number} round - Starting round number
 */
export function trackGameStart(mode, role, round = 1) {
  trackEvent('game_start', {
    game_mode: mode,
    player_role: role,
    starting_round: round
  });
}

/**
 * Track when a round is completed
 * @param {string} role - 'runner' or 'plug'
 * @param {number} round - Round number completed
 * @param {boolean} success - Whether the round was won
 */
export function trackRoundComplete(role, round, success) {
  trackEvent('round_complete', {
    player_role: role,
    round_number: round,
    success: success
  });
}

/**
 * Track when a game ends
 * @param {string} role - 'runner' or 'plug'
 * @param {number} finalRound - Final round reached
 * @param {number} stashCollected - Stash collected in session
 * @param {number} repEarned - REP earned in session
 */
export function trackGameOver(role, finalRound, stashCollected, repEarned) {
  trackEvent('game_over', {
    player_role: role,
    final_round: finalRound,
    stash_collected: stashCollected,
    rep_earned: repEarned
  });
}

/**
 * Track tutorial progress
 * @param {number} stage - Tutorial stage number (1-6)
 * @param {string} action - 'start' or 'complete'
 */
export function trackTutorial(stage, action) {
  trackEvent('tutorial_progress', {
    stage: stage,
    action: action
  });
}

/**
 * Track leaderboard views
 * @param {string} tab - 'daily', 'alltime', or 'pvp'
 * @param {string} role - 'runner' or 'plug'
 */
export function trackLeaderboardView(tab, role) {
  trackEvent('leaderboard_view', {
    leaderboard_tab: tab,
    player_role: role
  });
}

/**
 * Track menu navigation
 * @param {string} destination - Where the user is navigating to
 */
export function trackNavigation(destination) {
  trackEvent('navigation', {
    destination: destination
  });
}
