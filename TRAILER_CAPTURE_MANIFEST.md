# Trailer capture manifest

Build commit: `12fdd9e`
Captured: 2026-09-19
Renderer: headless Chromium (Playwright), software GL (SwiftShader)
Capture window: 540x960 CSS px at deviceScaleFactor 2 -> 1080x1920 native

## How the runner was controlled

Every frame of gameplay was played by **BotDriver**, the repo's existing test
harness (`client/src/controllers/BotDriver.js`), enabled with `?bot=1`. It
steers through `InputIntent.driveMove()` - the same input path a player's
swipe goes through - so it cannot do anything a player could not. **No shot
shows a human player, and nothing here should be described as one.**

Menu, dialogue and crew buttons were dismissed with real mouse clicks at the
buttons' real screen positions, found by reading the live scene graph. No
handler was called directly to skip a screen.

## What was changed to make capture possible

1. `client/src/controllers/installBotDriver.js` - added `installSceneHandle()`,
   which stores `window.__plugRunGame` from `MenuScene.create`. Observation
   only; it drives nothing. Bot-gated, so production never reaches it. The
   existing `__plugRunLiveScene` only appears once a gameplay scene ticks, so
   a capture rig had no way to see the menu or The Window.
2. Training was marked complete in `localStorage` on the throwaway guest
   profile (`pr_tutorial_v1_<id>`), so PLAY opens the normal post-tutorial
   front door. This is local save state on a scratch browser profile - no
   balance, physics, outcome or public data was touched.

**No game balance, physics, speed, map or outcome was modified for any shot.**

Nothing was cropped or hidden either, with one thing worth stating: the
in-game HUD is absent from these frames because the current build disables it
on purpose (`hudHeight = 0` and `HUD disabled on purpose` in
`BaseGameScene.js`). What you see is the genuine current UI, not a stripped
one. The only thing deliberately kept out of frame is the guest account name
in the menu footer; neither cut uses a menu shot.

## Capture clock

Software GL renders this game at ~18fps, so real-time capture would have
produced stuttering 30fps footage. Instead the page's animation clock was
driven by the harness: each captured frame advances the game by exactly
1/30s (`window.requestAnimationFrame` and `performance.now` are pumped by the
capture script). The game is delta-driven, so a fixed 33.33ms delta is a value
it already handles - this changes the clock, not the game. It makes the
capture deterministic and reproducible. **Disclosed here rather than presented
as a real-time recording.**

## Source takes (uncut)

| take | frames | duration | contents |
|---|---|---|---|
| `take-window.mp4` | 780 | 26.00s | PLAY -> The Window (Auntie Ro), crew card, city map, first house |
| `take-play.mp4` | 4800 | 160.00s | continuous campaign play, houses back to back |

Both are uncut, single continuous captures. Paths are reported in the summary
rather than committed, per the size instruction.

## Vertical cut - 29s, 4.4MB

`promo/trailers/plug-run-vertical.mp4`
`codec_name=h264 width=1080 height=1920 r_frame_rate=30/1 nb_frames=870 codec_name=aac r_frame_rate=0/0 nb_frames=1250 duration=29.000000 size=4371241`

| # | shot | source | source timecode | len | note |
|---|---|---|---|---|---|
| 1 | cold-open-close-call | take-play.mp4 | 02:28.26–02:32.05 | 3.3s | bullet 0.4 cells, no hit |
| 2 | auntie-ro | take-window.mp4 | 00:02.00–00:03.24 | 1.8s | The Window: Auntie Ro |
| 3 | crew-choice | take-window.mp4 | 00:07.16–00:09.10 | 1.8s | The Window: crew card |
| 4 | stash | take-play.mp4 | 00:25.04–00:28.10 | 3.2s | real stash pickup |
| 5 | switch-brief | take-window.mp4 | 00:16.01–00:17.09 | 1.27s | Switch states the objective |
| 6 | close-call-2 | take-play.mp4 | 02:17.28–02:20.16 | 2.6s | second near miss |
| 7 | mags | take-window.mp4 | 00:17.25–00:19.19 | 1.8s | Mags on the radio |
| 8 | power | take-play.mp4 | 01:39.28–01:43.16 | 3.6s | power activation |
| 9 | escape | take-play.mp4 | 02:04.01–02:08.07 | 4.2s | carry into the car |
| 10 | clear | take-play.mp4 | 02:24.19–02:27.01 | 2.4s | house clear |
| 11 | end card | promo/plug-run-poster-1080x1920.png | - | 3.00s | approved art, ends on PLUGRUN.IO |

## Landscape cut - 49.67s, 5.1MB

`promo/trailers/plug-run-landscape.mp4`
`codec_name=h264 width=1920 height=1080 r_frame_rate=30/1 nb_frames=1490 codec_name=aac r_frame_rate=0/0 nb_frames=2329 duration=49.667000 size=5063669`

The game is portrait-only (a 16x35 grid). In a native landscape window it
renders the arena in the middle with ~65% of the frame as empty margin, which
is why the landscape cut places the real portrait footage on a field built
from the approved cover art (blurred and darkened) instead. The gameplay
pixels are untouched and unstretched.

| # | shot | source | source timecode | len | note |
|---|---|---|---|---|---|
| 1 | cold-open-close-call | take-play.mp4 | 02:28.17–02:32.17 | 4s | bullet 0.4 cells, no hit |
| 2 | auntie-ro | take-window.mp4 | 00:01.15–00:04.00 | 2.5s | The Window: Auntie Ro |
| 3 | crew-choice | take-window.mp4 | 00:07.19–00:09.16 | 1.9s | The Window: crew card |
| 4 | switch-brief | take-window.mp4 | 00:16.01–00:17.10 | 1.3s | Switch states the objective |
| 5 | block-screen | take-window.mp4 | 00:20.06–00:21.21 | 1.5s | Mercer Row, 0/15 cleared |
| 6 | stash | take-play.mp4 | 00:17.24–00:22.06 | 4.4s | real stash pickup |
| 7 | plug-pressure | take-play.mp4 | 00:47.28–00:51.13 | 3.5s | Plug closing |
| 8 | power | take-play.mp4 | 01:04.09–01:09.03 | 4.8s | power activation |
| 9 | close-call-2 | take-play.mp4 | 02:17.19–02:20.28 | 3.3s | second near miss |
| 10 | power-2 | take-play.mp4 | 01:45.09–01:49.21 | 4.4s | second power |
| 11 | close-call-3 | take-play.mp4 | 01:13.17–01:16.26 | 3.3s | third near miss |
| 12 | stash-2 | take-play.mp4 | 01:56.25–01:59.13 | 2.6s | second stash run |
| 13 | escape | take-play.mp4 | 02:03.07–02:08.25 | 5.6s | carry into the car |
| 14 | clear | take-play.mp4 | 02:24.19–02:28.07 | 3.6s | house clear |
| 15 | end card | promo/plug-run-cover-1200x630.png | - | 3.00s | approved art, ends on PLUGRUN.IO |

## Near misses are real

A near miss here means a Plug bullet passed within ~1 cell of the runner and
**no hit landed in the following second** - measured per frame from
`bulletsD`, the Plug's own bullet group. A bullet that connects is a hit, not
a near miss, and is excluded. Tightest passes captured:

- frame 4517 (02:30.17): **0.4 cells**, runner at 2 HP, survived
- frame 4180 (02:19.10): **0.44 cells**, runner at 1 HP, survived
- frame 2258 (01:15.08): **0.66 cells**, runner at 2 HP, survived
- frame 3398 (01:53.08): **0.75 cells**, runner at 1 HP, survived
- frame 1474 (00:49.04): **0.99 cells**, runner at 2 HP, survived

Moments found in the take: closeCalls 6, pickups 12, powers 21, extractions 12, clears 18, plugPressure 16.

## Twitch screening

The bot dodges by reversing direction, and when a Plug closes in it can
reverse fast enough to read as twitching rather than as someone playing.
The footage is real, but it does not look human, so candidate clips are
screened on heading reversals per second (`flipRate` in `analyze.mjs`).

The whole take sits at **1.92 reversals/s**. One clip in the first
vertical cut hit **10.33/s** -- five times baseline -- and was visible
immediately on screen; it has been cut. Any beat above three times baseline
is now reported at build time so it gets a second look before shipping.

Still above that line in the landscape cut, left in for now and worth your
eyes: `power` at 5.83/s and `close-call-3` at 6.06/s.

## Audio

**Vertical cut: music + gameplay SFX.** The bed is `plug_beat2.mp3` (the
"glideraide" beat). Rights basis: the repo owner states it was written by his
cousin in GarageBand and that they have permission to use it. That is his
statement, recorded here as the basis -- I did not independently verify it,
and there is still no licence or credit file in the repo for it.

It masters hot: -10.4 LUFS integrated, peaking +1.3 dBFS, i.e. already clipped
at source. It is therefore laid in at -9 dB, started at 2.0s to skip its
one-second fade-in so the cut opens on the established beat, faded out under
the end card, and the sum is limited at 0.94. Final mix: -18.6 LUFS integrated, -2.3 dBFS peak.

**Landscape cut: gameplay SFX only.** No music was requested for it. If you
want the same bed on it, it is one flag -- `MUSIC=<file> node build.mjs`.

**The SFX bed is not a recording of the browser.** Headless Chromium exposes no
audio track, so every cue the game fired was logged at capture time from
`AudioManager.play()` -- the game's own call, with the game's own computed
volume -- and rebuilt from the game's own asset files at those exact offsets.
Cues used: {"phase":2,"gun_fire":6,"ouch":3,"dash":2,"pickup":2,"spickup":2,"engine_start":4,"decoy":2}.

One cue is missing: `impact` (the bullet-hit thud). The game synthesises it as a
Web Audio earcon rather than playing an asset file, so there is no file to
rebuild it from. Every other cue the game fired is present.

**Still open, and it affects the game, not just the trailer.** The other audio
assets have no licence, credit or attribution anywhere in the repo and carry no
metadata. The drum roll in particular was uploaded as
`28758__teleport8__sdroll.wav` -- Freesound.org's `<id>__<user>__<name>`
convention, which suggests a third-party sample. Freesound licences run from
CC0 to CC-BY-NC, and CC-BY-NC would not permit promotional use. I could not
check it from here. `contact_open.wav` and `pickup.wav` have the same
undocumented provenance. Worth confirming before this goes out.

## Verification notes worth knowing

`freezedetect` flags the static UI beats (the Auntie Ro portrait and the crew
card) because those screens genuinely do not animate. It also flagged the
landscape opening, which is a false positive: the blurred background fills
most of the frame, so the average frame delta falls under the threshold even
though the gameplay is moving. Re-running it cropped to the gameplay region
(`crop=608:1080:656:0`) shows no freeze over the opening. Both cuts are clean
of true black frames.

One SFX is missing from the bed: `impact` (the bullet-hit thud). The game
synthesises it as a Web Audio earcon rather than playing an asset file, so
there is no file to rebuild it from. Every other cue the game fired is present.

The crew that came up in this session was **Crossline**, not Afterlight. The
repo brief favours Afterlight; the front door assigns the crew, and I did not
override it to avoid manufacturing a path the player would not get.

## What I could not verify

- **I cannot watch or listen to these files.** I verified codec, resolution,
  frame rate, duration and file size with ffprobe, checked for black frames,
  and inspected extracted frames as images. That is not the same as watching
  the cut with audio on a phone, which the brief asks for and which still
  needs a human.
- Headless software-GL rendering is not a phone. Colours, timing feel and
  text legibility should be checked on a real device.
- The audio bed is reconstructed from logged cues, so it is exact in content
  and offset but has never been heard.

## Vertical cut v2 - 44.7s (`promo/trailers/plug-run-vertical-v2.mp4`)

Captured 2026-09-22 from master `fe24bbc` (dev server, same code) with `session2.mjs`, cut with `edit2.mjs` and `plan-v2.json`.

- **Takes:** `story` (The Window, crew pick, the new Season One dialogue, houses), `deaths` (the BOT made worse with `dangerCells=2&laneToleranceCells=0.25&wrongTurnChance=0.18`; game, Plug and balance untouched), and `rivals` (real Block Rivals flow against the shipped Jev bank). A fresh profile has not claimed a block, so Rivals was entered with the same scene start the menu button uses once it opens.
- **Moments:** every near miss, death and power comes from per-frame telemetry. Near misses are 0.54-0.88 cells with no hit in the next second. Power names come from the game's own sound cue at that frame. Punch-ins crop around the runner's median recorded position; nothing is staged.
- **"Race the latest AI":** the Block Rivals opponent Jev is recorded runs planned by the Jev AI strategist (requested model `jev-latest`, served as Jev 1.13.0), driven by BotDriver. On screen: "Jev · AI-driven rival runs". The final Rivals shot is a real race where Jev finished (0:59.4) while the bot was still on house 5.
- **Audio:** the game's own `main_beat` with game SFX from logged cues. Only the deaths and rivals takes logged cues; the story take did not, so those clips carry music only.
- **Fixed-step clock** as in v1: every frame advances the game exactly 1/30s. It's a deterministic capture, not a real-time recording.

## Vertical cut v3 - 47.0s (`plug-run-vertical-v3-beat5.mp4`, `plug-run-vertical-v3-beat6.mp4`)

Replaces v2 (its overlay text is gone). Same style as the first vertical cut: hard cuts, game SFX from logged cues, a game music track looped underneath (`gameplay_beat5` or `gameplay_beat6`, otherwise identical), the approved poster as the end card. Built with `edit3.mjs` from `plan-v3.json` / `plan-v3-beat5.json`.

- **Calmer bot for gameplay takes:** `replanMs=260&wrongTurnChance=0.02&hesitateChance=0.01&dodgeCommitMs=450&dodgeRestMs=900`. Bot settings only; the game is untouched.
- **Twitch screen:** `edit3.mjs` refuses any gameplay clip where the runner (or Jev) reverses direction more than twice in any half second. Every clip in v3 passes (worst: 2).
- **Characters:** in-game Window and crew consultations from three takes, one per crew (`CREW=` taps that crew's card): Auntie Ro, the crew picker, Switch, Mags, Sol, Rook and Brick.
- **Block Rivals:** the real entrance on a fresh profile (entered with the scene start the menu button uses once it unlocks): finding rival, Jev found, lobby picks and READY, countdown.
- **Jev:** three of Jev's shipped runs played in the game's own rival replay viewer (`playRivalReplay`, what WATCH RIVAL opens), recorded with `jev-take.mjs`: `jev-v1/rec-undercroft-balanced-318015-xmh3zn` (decoy), `jev-v1/rec-switchback-stairs-balanced-320004-jztafe` (decoy and phase), `jev-rival-hard-v1/rec-low-end-rush-ace-9701-153bicc` (dash and phase). The DECOY / DASH / PHASE / BUNK! callouts are the viewer's own. Close-ups follow Jev's recorded position at 1.7x; the cold open and the catch follow the runner at 1.4x.
- **Near misses:** runner 0.21 and 0.93 cells, Jev 0.83 cells, each with no hit in the next second.

## Vertical cut v4 - 47.1s (`promo/trailers/plug-run-vertical-v4.mp4`) - current

v3 with the Jev section replaced and one music bed (`gameplay_beat6`); built from `plan-v4.json`.

- The four v3 Jev shots came from the replay viewer played on the menu scene, which never loads the wall and floor art, so walls drew as Phaser's missing-texture boxes. They are gone.
- In their place: four moments from the Jev recording sessions' own videos of Jev playing the game as the runner (`client/tools/recordings/jev/rival-v1/video/`, git-ignored; the Rival Hard bank's sessions). Chosen at `jev-power-activated` events with no damage in the following 1.5s; each framed on the action at 1.35x and scaled up from 390x844. Their SFX are rebuilt from the same session's event log (power, pickup, damage). These clips have no per-frame telemetry, so the twitch screen does not apply to them.
- `jev-take.mjs` now loads the race scene before playing a replay, so any future replay-viewer footage draws the real walls.
