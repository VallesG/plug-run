# Current GA4 tracking

Uses the existing G-M68K7J4ZZ2 property. No new tracking ID is required.

Events: tutorial_started, tutorial_progress (stage + action start/complete), tutorial_completed, window_visited, crew_selected, house_started, house_failed, round_complete, game_start, game_over, block_completed, rivals_unlock_milestone, rivals_matchmaking_started, rivals_match_started, rivals_match_completed, navigation, leaderboard_view.

Register each desired parameter separately in GA Admin > Custom definitions > Create custom dimension, with Event scope. Event parameter must match exactly: game_mode, player_role, crew, block_number, house_number, stage, action, destination, course_slot, result, reason, leaderboard_tab, power_1, power_2. Display names can be readable labels. Do not create custom events merely to receive these existing code-generated events.

Rivals completion includes elapsed_seconds and retries; these are numeric parameters, suitable for custom metrics rather than dimensions. rivals_unlock_milestone means completing campaign block three, not detecting an already-unlocked legacy save. game_start preserves the original first-house behavior; house_started also captures resumed campaign attempts. Resize failures are excluded in Rivals. Bot recording sessions are excluded.

No account IDs, handles, replay IDs or recovery codes are sent. Missing values are omitted. Local development is suppressed unless window.PLUG_RUN_ANALYTICS_DEBUG = true; this opt-in sends debug_mode for DebugView. Existing automatic page_view configuration remains unchanged. Confirm live events in Realtime/DebugView after deployment; dashboard delivery has not been independently verified. Custom definitions do not backfill old data.
