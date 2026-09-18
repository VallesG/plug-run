# Extraction, finale and completion-audio corrections

Extraction now checks the actual 2.8-cell extraction sensor dimensions, with the existing 24-pixel runner hitbox, rather than reducing both objects to 24-pixel squares. Both single/dual-carrier update branches and the ProgressionManager helper use the same pure carExtractionOverlap. Stash, mission-item, carrier, death and once-only completion gates are retained. No wall/path/grid changes.

House 15 is an explicit cadence anchor. campaignContactCue always supplies a serious two-Plug warning there, using crew voices, with no banter or measured praise. Earlier jokes and mandatory House 9 briefing remain. Warning has a distinct persisted claim ID, so retries do not repeat it.

Completion fades music for 250ms, then plays the shared completed.wav after 260ms. Beat stays suppressed through celebration/results, including mute/unmute attempts. A new gameplay context (next block/race/tutorial) releases the hold. Delayed victory checks the current scene/hold before firing; deduplication still prevents a second sound on results.

Regression checks cover full pad bounds, all car orientations/cell sizes, mission gates, every crew/chapter finale, dialogue cadence, timed victory order and next-context audio release. Phone/desktop interactive fast-dash pass remains desirable.
