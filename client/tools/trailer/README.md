# Trailer capture tooling

Captures real gameplay from the current build and cuts it into the two promo
trailers. Everything here is harness code: it drives the game through the same
input path a player uses and never alters balance, physics or outcomes.

## Requirements

```sh
npm install --no-save ffmpeg-static ffprobe-static   # not repo deps on purpose
export FFMPEG=$(node -e "console.log(require('ffmpeg-static'))")
export FFPROBE=$(node -e "console.log(require('ffprobe-static').path)")
export CHROMIUM=/path/to/chromium            # defaults to the CI image's copy
export TRAILER_OUT=/abs/path/for/output      # defaults to ./.out
```

## Run

```sh
npm run build && npx vite preview --port 4178 --host 127.0.0.1 &
COMMIT=$(git rev-parse --short HEAD) GS=160 node session.mjs   # capture (~20 min)
node build.mjs        # find real moments, cut, mix SFX, write both trailers
node shots.mjs        # extract promo screenshots from the captured frames
node shot-rivals.mjs  # Block Rivals screenshot via the harness rivals path
node manifest.mjs     # write TRAILER_CAPTURE_MANIFEST.md from the build data
node verify.mjs <file>  # codec/res/fps + black, freeze and loudness checks
```

## How it works, and the two things it changes

`session.mjs` plays the game with `BotDriver` (`?bot=1`), which steers through
`InputIntent.driveMove()`. Menu and dialogue gates are cleared with real mouse
clicks at the buttons' real positions, read from the live scene graph.

1. **Fixed-step clock** (`fixedstep.mjs`). Software GL renders at ~18fps, so
   `requestAnimationFrame` and `performance.now` are pumped by the harness and
   every captured frame advances the game exactly 1/30s. The game is
   delta-driven, so this changes the clock, not the game -- but it means the
   footage is a deterministic capture, not a real-time recording. Say so.
2. **Scene handle** (`installSceneHandle` in `installBotDriver.js`). Stores
   `window.__plugRunGame` so the harness can see non-gameplay scenes.
   Observation only, bot-gated.

`sampler.mjs` records one telemetry row per frame, so a moment found in the
data maps straight to a video frame. `analyze.mjs` only *locates* moments the
bot actually produced -- a near miss requires a Plug bullet within ~1 cell and
no hit in the following second. A beat with no real frame behind it is
dropped, never substituted.

`mixsfx.mjs` rebuilds the SFX bed from cues logged off `AudioManager.play()`
and the game's own asset files. Headless Chromium has no audio track, so the
bed is reconstructed, not recorded. No music: see the manifest.
