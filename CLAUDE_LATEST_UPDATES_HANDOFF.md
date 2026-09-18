# Claude handoff: Plug Run friends beta and latest shipped updates

Date: 2026-09-17 (Pacific).
Repository: VallesG/plug-run. Production site: https://plug-run.io.

## Production is no longer the old site

The user has launched the friends beta and friends are playing it. Treat this as a live game with real saves and feedback, not an isolated prototype.

The former feature branch was claude/input-intent-layer. Its work is already integrated into master:
- 10d5b22: Launch friends beta.
- 6495dc0: Ship refined mobile tutorial (merge of the later tutorial work).
- b292d0b0ba5c56e99dd0f16c7654ff53fc791133: Current tutorial, campaign, crew and Rivals analytics, pushed directly to master.

The remote master ref was verified at b292d0b when preparing this document. Pushing the production branch is verified; a hosting deployment status check and GA network delivery check were not independently performed. Do not mistake that distinction for the site still being on the old version.

## Sync before working

Fetch origin and inspect status and branch divergence first. Master contains newer work than an old local or feature checkout. If your branch has unique work, merge/rebase carefully; do not overwrite master with an older tree. Do not discard another agent's unstaged changes. Avoid force pushes. Coordinate source/build changes with active recording workers: never rebuild the static recording build underneath them.

Keep future development on a feature branch unless the user explicitly asks to ship. This document is context, not authorization to reset saves, delete leaderboard data, or push unrelated changes.

## Onboarding and landing page

- Plug Run's landing/menu is the front door, not The Window.
- PLAY remains the primary entry. First-time onboarding routes through tutorial, then The Window to meet Auntie Ro and select a crew.
- Existing progress/legacy players retain their exemption; do not send established players through onboarding again.
- Tutorial has a decorative branded blue attention arrow for new players. It hides behind overlays and respects reduced motion.
- Crew selection is more readable, with larger crew labels and portraits contained in their cards.
- Crew welcome introduces both contacts, facing away from each other.
- Modal dismissal/picker launch input must be consumed so the same gesture cannot trigger a menu action or instantly spend a power.

## Tutorial: preserve the latest interaction design

The user tested multiple mobile iterations; the latest version is the intended baseline.

- Crisp in-game wall rendering and a unified instruction presentation, not three boxes that look selectable.
- No large bottom instruction bar obscuring the arena.
- Floating coaching text and gesture illustrations, gated by actual player actions.
- First introduction zooms into roughly the runner's half of the map, points to the runner, waits about three seconds, then zooms out. The earlier heavy spotlight design was superseded.
- First movement text says swipe anywhere in any direction; the gesture demonstration nudges right, then the next direction-change demonstration nudges down.
- Lessons begin with swipe-to-move guidance. Lesson two introduces/zooms toward the bags first; power lesson begins with movement before the double-tap instruction.
- Tutorial practice geometry is fixed/controlled so the instructed downward turn is unobstructed. Do not restore arbitrary obstacles into that path.
- Blue arrows float over floor, point near targets without touching them, and pulse by growing/shrinking the whole arrow, not by extending/retracting the tail.
- Movement lesson shows one target arrow at a time.
- Bag lesson begins with both bags indicated; the first bag picked up is bunk. Keep the real-bag arrow after bunk dissolves, then switch to the car when the real stash is picked up.
- Say pick up, not touch, so users do not think they should tap a bag directly.
- Keep normal gameplay pickup/bunk feedback and audio.
- Power lesson uses floating text and a clearly instructional double-tap gesture, not a ring that looks like a collectible. Its guide must start correctly after the loadout picker.
- Car arrows have longer shafts and disappear immediately when car departure starts; never follow the departing car.
- Final Plug lesson remains comparatively hands-off after teaching basics.
- Completion title is You're ready! Copy only invites the next step: The Window, Auntie Ro, crew selection. Removed the repeated grab-stash/escape instruction.

Key files: client/src/scenes/TutorialMiniScene.js, client/src/logic/mobileTutorialGuide.js (check actual paths before editing), client/test/mobileTutorialGuide.test.mjs, client/test/firstPlay.test.mjs.

## Gameplay, story and presentation

- Fixed mobile drift caused by pursuing Plug interactions affecting runner steering; preserve independent touch steering.
- Exit guarding remains active but the Plug should not visually slide beneath the car.
- Edge-exit cars remain visible; departure removes the car silhouette rather than leaving a car-shaped black hole.
- Fast real-stash pickup followed immediately by dash/car contact uses the actual extraction sensor bounds (2.8-cell sensor), not an additional fixed 24-pixel square. Preserve stash, mission-item and carrier gates plus once-only reward behavior.
- Elimination screens show a crew character and gameplay tip, with retry, retry/swap and exit options. Replay viewing is reserved for successful results.
- Characters have optimized expression assets and moment-based selection. Praise should use impressed rather than an overly excited expression; inspect the current expression map before changing it.
- Campaign banter/canon work includes Meta-derived usable comedy and gap-filling contacts; preserve the cadence of no more than three houses without a contact.
- House 15 is an exception to casual jokes: always give the crew-specific serious two-Plug warning. Do not replace it with comedy or reactive praise.
- Third-block ending encourages representing the crew in Block Rivals.
- Conditional praise must describe measured facts only; do not invent clean movement, speed, wall traversal, defender reactions, or untracked successful tactics.
- Item swaps require matching tease, violet-case plus stash briefing, finish celebration and later callbacks. Optional romance/new backstory proposals are not automatically canon.

## Audio

- Gameplay beats shuffle by block/race rather than remaining tutorial/runner/Plug themed. Tutorial audio key was fixed.
- Menu street ambience and existing gameplay sounds remain.
- contact_open.wav plays once when a between-house conversation begins, not once per panel or per speaker.
- completed.wav is the shared block/city completion and Rivals-win cue.
- pickup.wav covers crew violet cases; normal stash sounds remain distinct.
- Background beat fades fully before the completion cue and stays stopped through the completion/result view. Music resumes in the next gameplay context.
- Preserve mute/volume controls, cue deduplication and synthesis fallback for missing stock assets.
- Phone listening and mix tuning still deserve a pass.

## Rivals bank: old 192-record count is no longer the deployed count

Claude originally built 192 accepted recordings. Codex conservatively pruned deployment depth:
- Shipped bank: 140 unchanged recordings, exactly 20 per pinned course.
- 52 redundant bundles are recoverably archived at client/rivals-bank-archive/2026-09-17-c4af9127/, outside public and dist.
- Replay bytes: 48,120,103 to 30,157,500, saving 37.3%.
- Production dist measured at the pruning commit: 58,073,730 bytes; not a claim about today's exact deployment bytes or transfer size.
- Preserved per-course styles, ordered mixes, opening-Decoy arms, measured-band coverage and timing/retry/per-scale extremes.
- No frame, opponent time, payload hash or provenance was edited. Archived records are not rejected forfeits.
- Matchmaking bands recalibrate from retained data; never adjust opponents to create a win.
- Assembly can restore redundant depth. Prune after assembly and before verification/deploy; dry run is node tools/rivals-prune.mjs from client/.
- Never deploy the archive.

openingDecoy is real, opt-in, default off, uses the normal player power activation path, and records provenance. Its controlled experiment was 11/12 control versus 10/12 treatment: no demonstrated completion benefit. Possible time/retry effects remain an unproven hypothesis, not a reason to claim it is OP.

Human Rivals repeated-death power switching exists; race time keeps running. Fixed-mix unattended recording jobs retain their automatic retry behavior.

Read RIVALS_BANK_RECORDING_HANDOFF.md, CLAUDE_RIVALS_BOT_BANK_HANDOFF.md and client/tools/README.md before more recordings. Phone matchmaking/search/replay and widened off-grid replay visibility still need real-device checks.

## GA4 update pushed to master

Existing property remains G-M68K7J4ZZ2; no new ID is required. Read ANALYTICS.md.

Wiring added/updated:
- tutorial_started, tutorial_progress (stage + action start/complete), tutorial_completed
- window_visited, crew_selected
- house_started, house_failed, round_complete, game_start, game_over
- block_completed, rivals_unlock_milestone
- rivals_matchmaking_started, rivals_match_started, rivals_match_completed
- navigation destinations now distinguish campaign and block_rivals
- leaderboard_view preserved

Context parameters include game_mode, player_role, crew, block_number, house_number, stage, action, course_slot, result and reason. Rivals completion sends elapsed_seconds and retries; match start includes selected powers.

Important boundaries:
- rivals_unlock_milestone means completion of campaign block three, not discovery of an already-unlocked legacy save.
- game_start retains first-house semantics; house_started covers resumed campaign attempts.
- Rivals resize failures are excluded.
- Bot recording sessions are excluded from scene tracking.
- A whitelist omits account IDs, handles, recovery codes, replay IDs, objects, undefined and non-finite numbers.
- Local development events are suppressed unless window.PLUG_RUN_ANALYTICS_DEBUG = true; opt-in adds debug_mode.
- Analytics failure must never break gameplay.
- Automatic page_view setup remains unchanged.

Google Admin custom definitions still require manual setup, one exact event parameter per definition. Numeric elapsed_seconds/retries are metrics, not high-cardinality dimensions. Code tests prove calls, not actual GA delivery. Confirm deployed events in Realtime/DebugView. Definitions do not backfill historical data.

## Verification and outstanding checks

For b292d0b: full npm test passed, including the new analytics pretest and 63 existing suites. Production Vite build passed with the Windows isolated-checkout preserveSymlinks workaround. Do not report plain npm run verify as passing if its build hit EPERM.

Several tests strip imports to evaluate real classes/functions; their bindings were updated for analytics. Maintain those fixtures when adding imports, but also test the actual analytics helper behavior.

Recommended live smoke pass:
1. Fresh mobile visit -> PLAY -> tutorial -> Window -> crew -> campaign.
2. All four tutorial lessons, gestures, arrows and completion.
3. Modal/picker input cannot click through or spend a power immediately.
4. Fast stash/dash extraction at each car edge.
5. House 15 serious warning and silent-beat victory cue.
6. Three-block unlock, search, match, loss/retry/swap, win and replay.
7. GA Realtime receives crew/block/house context without personal identifiers.

Global leaderboard wipe was requested earlier but was NOT performed: it requires the appropriate backend/admin access. Do not tell the user the approximately 11 old entries were deleted. The Cash ledger truncation hazard remains an open item from the recording handoff.

The user reports excellent early friend feedback, especially crew personality and motivation to unlock Rivals. Prioritize regression safety and real-device friction over broad rewrites.
