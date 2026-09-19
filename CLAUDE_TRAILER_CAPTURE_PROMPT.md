# Claude: capture a real-gameplay Plug Run trailer

Work on a review branch, not `master`. Read `PROMO_KIT.md` and `PROMO_COPY.md` first, then inspect the current game, capture tooling, controls, audio licenses, and map/replay code. Do not modify live game balance, physics, outcomes, public saves, or production data just to make a shot. Do not push final promo media to `master` until I review it.

## Core rule

The trailer must clearly present Plug Run as a 2D browser game and show rendered pixels from actual gameplay in the current build. Drive the runner through normal game input or a test harness that calls the normal input path; do not teleport, synthesize a near-miss, hide a failed attempt with a misleading cut, or composite an old-bank replay onto a new course. A deterministic local test run is fine if its provenance is disclosed in your handoff. The game can be recorded locally; do not claim a simulated or bank opponent is a live human.

## Capture plan

Record at least 8–12 seconds of usable clean footage for each:

1. Start/crew selection, showing all three crews briefly.
2. House entry, visible runner, stash, Plug and getaway car.
3. A genuine close dodge or corner break with the Plug firing or closing distance.
4. A real power activation and its visible effect.
5. A tense last stretch into a successful car extraction.
6. A contact/story beat and the block-cleared celebration with sigil.

If House 15's two-Plug encounter is good on camera, capture it as an optional extra. Favor Afterlight for a coherent story thread, but avoid spoiling a major reveal. Don't use a recording from the obsolete cropped map. Keep a safe area for captions and ensure the action is legible on a phone.

## Deliverables

- `promo/screenshots/01-choose-your-crew.png` through `05-block-rivals.png`, matching `PROMO_KIT.md`. These must be real current-build captures, not generated images.
- `promo/trailers/plug-run-vertical.mp4`: 1080×1920, H.264, 30 fps, 20–30 seconds.
- `promo/trailers/plug-run-landscape.mp4`: 1920×1080, H.264, 30 fps, 45–60 seconds.
- Uncut source clips and an editable project or reproducible commands.
- A short capture manifest: build commit, browser/window resolution, source clip/timecodes for every trailer shot, how the runner was controlled, audio sources/licensing status, and any edits. Name any simulated drivers honestly in the manifest.

Story rhythm: establish the 2D game immediately with a real gameplay shot, then logo/crew choice → stash objective → rising chase → narrow escape → block-cleared hit → `plugrun.io`. Use the actual success cue only when a block genuinely clears. For music, verify promotional rights to friends' beats and any stock sounds; if rights are unclear, export a gameplay-SFX-only version and flag the music choice for us. No fake “LIVE PVP,” no invented player names, and no personal account data.

## Verification

Watch both complete exports with audio, including a phone-sized preview. Check crop, captions, loudness, exact game UI, no black frames, and that every near-miss is genuinely visible. Run relevant repo checks for any code or capture-tool changes. Commit to the review branch and report the files plus any honest capture limitations.
