# Uploaded stock sound wiring

contact_open.wav: one cue at the start of each between-house conversation, never on page/speaker changes. Not used on completion celebrations.

completed.wav: shared block-clear, city-clear and Rivals-win sound. Existing completion deduplication prevents repeating it on results.

pickup.wav: shared violet-case sound for Rook, Mags and Sol. Loaded under mission_pickup; normal pickup.mp3/ogg stays unchanged.

Preloaded in MenuScene, BaseGameScene and TutorialMiniScene. Existing SFX mute/master/group settings apply. Locked/suspended cues skip rather than queue. Synthesized cues remain a missing-asset fallback. Starting sound levels: contact 0.24, completion 0.55, violet case 0.5 (before master/SFX multipliers).

Targeted audio/contact/missing-call checks and preserveSymlinks production build pass. Phone listening/mix tuning remains. User-provided WAVs are untouched.
