# Current GA4 tracking

Uses the existing G-M68K7J4ZZ2 property. No new tracking ID is required.

Events: tutorial_started, tutorial_progress (stage + action start/complete), tutorial_completed, window_visited, crew_selected, house_started, house_failed, round_complete, game_start, game_over, block_completed, rivals_unlock_milestone, rivals_matchmaking_started, rivals_match_started, rivals_match_completed, navigation, leaderboard_view.

Register each desired parameter separately in GA Admin > Custom definitions > Create custom dimension, with Event scope. Event parameter must match exactly: game_mode, player_role, crew, block_number, house_number, stage, action, destination, course_slot, result, reason, leaderboard_tab, power_1, power_2. Display names can be readable labels. Do not create custom events merely to receive these existing code-generated events.

Rivals completion includes elapsed_seconds and retries; these are numeric parameters, suitable for custom metrics rather than dimensions. rivals_unlock_milestone means completing campaign block three, not detecting an already-unlocked legacy save. game_start preserves the original first-house behavior; house_started also captures resumed campaign attempts. Resize failures are excluded in Rivals. Bot recording sessions are excluded.

No account IDs, handles, replay IDs or recovery codes are sent. Missing values are omitted. Local development is suppressed unless window.PLUG_RUN_ANALYTICS_DEBUG = true; this opt-in sends debug_mode for DebugView. Existing automatic page_view configuration remains unchanged. Confirm live events in Realtime/DebugView after deployment; dashboard delivery has not been independently verified. Custom definitions do not backfill old data.

# New-player funnel (the three numbers)

Each of these fires once per player (per device; in Telegram the record is backed up to CloudStorage, so a new phone does not count as a new player):

- `m_first_visit`: first time the game loads.
- `m_first_house_started`: first house of any mode (tutorial houses excluded from the cleared step).
- `m_first_house_cleared`: first real house extracted (campaign, daily or Block Rivals). **Number 1.**
- `m_first_seven_houses`: first full seven-house session: a Block Rivals race with all seven houses, or campaign house 7. **Number 2.**
- `m_returned_day` / `m_returned_week`: came back on a later UTC day / a week or more after the first visit (`days_since_first`). **Number 3, with:**
- `m_first_challenge_shared` (sent or copied), `m_first_challenge_opened`, `m_first_daily`.

Every event also carries `platform` (`web` / `telegram`), `client`, and in Telegram `tg_platform` and `player_status` (new / returning, from Telegram sign-in).

To read it: GA4 > Explore > Funnel exploration. Steps: `m_first_visit` > `m_first_house_cleared` > `m_first_seven_houses` > `m_returned_day`. Breakdown: `platform` (register `platform`, `client`, `tg_platform`, `start_kind`, `player_status`, `milestone`, `houses`, `days_since_first` under Admin > Custom definitions first; event scope). A second funnel for the social loop: `m_first_seven_houses` > `m_first_challenge_shared`, and `challenge_opened` counts per day. The server also counts, per challenge, opens, plays and beats (Upstash `ch:<id>:opens|plays|beaten`) and daily plays (`daily:<n>:plays`).

Other new events: `daily_started`, `daily_completed`, `challenge_created`, `challenge_shared` (result sent/declined/opened/copied/failed), `challenge_opened`, `challenge_completed`, `app_launch`-style `page_view` on /tg, `tutorial_progress` with stage `rivals_quick_start`.
