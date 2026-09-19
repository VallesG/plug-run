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

## Vertical cut - 24.3s, 3.2MB

`promo/trailers/plug-run-vertical.mp4`
`codec_name=h264 width=1080 height=1920 r_frame_rate=30/1 nb_frames=729 codec_name=aac r_frame_rate=0/0 nb_frames=1141 duration=24.300000 size=3165050`

| # | shot | source | source timecode | len | note |
|---|---|---|---|---|---|
| 1 | cold-open-close-call | take-play.mp4 | 02:28.26–02:32.05 | 3.3s | bullet 0.4 cells, no hit |
| 2 | crew-choice | take-window.mp4 | 00:07.16–00:09.10 | 1.8s | The Window: crew card |
| 3 | switch-brief | take-window.mp4 | 00:15.19–00:17.13 | 1.8s | Switch states the objective |
| 4 | stash | take-play.mp4 | 00:25.04–00:28.10 | 3.2s | real stash pickup |
| 5 | plug-pressure | take-play.mp4 | 01:07.18–01:10.18 | 3s | Plug closing |
| 6 | power | take-play.mp4 | 01:39.28–01:43.16 | 3.6s | power activation |
| 7 | escape | take-play.mp4 | 02:03.25–02:08.13 | 4.6s | carry into the car |
| 8 | end card | promo/plug-run-poster-1080x1920.png | - | 3.00s | approved art, ends on PLUGRUN.IO |

## Landscape cut - 50.97s, 5.2MB

`promo/trailers/plug-run-landscape.mp4`
`codec_name=h264 width=1920 height=1080 r_frame_rate=30/1 nb_frames=1529 codec_name=aac r_frame_rate=0/0 nb_frames=2390 duration=50.967000 size=5230087`

The game is portrait-only (a 16x35 grid). In a native landscape window it
renders the arena in the middle with ~65% of the frame as empty margin, which
is why the landscape cut places the real portrait footage on a field built
from the approved cover art (blurred and darkened) instead. The gameplay
pixels are untouched and unstretched.

| # | shot | source | source timecode | len | note |
|---|---|---|---|---|---|
| 1 | cold-open-close-call | take-play.mp4 | 02:28.17–02:32.17 | 4s | bullet 0.4 cells, no hit |
| 2 | auntie-ro | take-window.mp4 | 00:01.15–00:04.00 | 2.5s | The Window: Auntie Ro |
| 3 | crew-choice | take-window.mp4 | 00:07.10–00:09.13 | 2.1s | The Window: crew card |
| 4 | switch-brief | take-window.mp4 | 00:15.13–00:17.16 | 2.1s | Switch states the objective |
| 5 | block-screen | take-window.mp4 | 00:19.24–00:21.18 | 1.8s | Mercer Row, 0/15 cleared |
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

## Audio - SFX only, and why

**The music is not in these trailers.** No licence, credit or attribution file
exists anywhere in the repo for any audio asset, and none of the files carry
metadata tags. `MUSIC_PRODUCTION_BRIEF.md` asks producers to confirm samples
are cleared *for game use*, which is not the same as promotional use -
`PROMO_KIT.md` says so itself. Per the brief's rule (uncertain rights -> ship
SFX only), these exports carry gameplay SFX and no music.

The SFX bed is not a recording of the browser. Headless Chromium gives no
audio track, so every cue the game fired was logged at capture time from
`AudioManager.play()` - the game's own call, with the game's own computed
volume - and the bed was rebuilt from the game's own asset files at those
exact offsets. Cues used: {"phase":1,"gun_fire":5,"ouch":2,"dash":2,"pickup":3,"spickup":3,"engine_start":6,"decoy":2}.

**Open question for you, and it affects the game, not just the trailer:** the
current drum roll was uploaded as `28758__teleport8__sdroll.wav`. That is
Freesound.org's `<id>__<user>__<name>` naming convention, which suggests a
third-party sample. Freesound licences range from CC0 to CC-BY-NC, and CC-BY-NC
would not permit promotional use. I could not check it from here. The other
"uploaded stock sound" assets (`contact_open.wav`, `pickup.wav`) have the same
undocumented provenance. Worth confirming before any of this goes out.

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
