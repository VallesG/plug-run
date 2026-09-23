import { readFileSync, writeFileSync } from 'node:fs';
const OUT = process.env.TRAILER_OUT || new URL('./.out/', import.meta.url).pathname.replace(/\/$/,'');
const REPO = process.env.REPO || new URL('../../../', import.meta.url).pathname.replace(/\/$/,'');
const S=OUT;

const r=JSON.parse(readFileSync(S+'/build-report.json','utf8'));
const tk=JSON.parse(readFileSync(S+'/takes.json','utf8'));
const tc=f=>{const t=f/30;const m=Math.floor(t/60),s=Math.floor(t%60),fr=Math.round(f%30);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(fr).padStart(2,'0')}`;};
const shots=tl=>tl.map((b,i)=>`| ${i+1} | ${b.name} | ${b.src.endsWith('take-play.mp4')?'take-play.mp4':'take-window.mp4'} | ${tc(b.start)}–${tc(b.end)} | ${b.seconds}s | ${b.note} |`).join('\n');
const md=`# Trailer capture manifest

Build commit: \`${r.commit}\`
Captured: ${new Date().toISOString().slice(0,10)}
Renderer: headless Chromium (Playwright), software GL (SwiftShader)
Capture window: 540x960 CSS px at deviceScaleFactor 2 -> 1080x1920 native

## How the runner was controlled

Every frame of gameplay was played by **BotDriver**, the repo's existing test
harness (\`client/src/controllers/BotDriver.js\`), enabled with \`?bot=1\`. It
steers through \`InputIntent.driveMove()\` - the same input path a player's
swipe goes through - so it cannot do anything a player could not. **No shot
shows a human player, and nothing here should be described as one.**

Menu, dialogue and crew buttons were dismissed with real mouse clicks at the
buttons' real screen positions, found by reading the live scene graph. No
handler was called directly to skip a screen.

## What was changed to make capture possible

1. \`client/src/controllers/installBotDriver.js\` - added \`installSceneHandle()\`,
   which stores \`window.__plugRunGame\` from \`MenuScene.create\`. Observation
   only; it drives nothing. Bot-gated, so production never reaches it. The
   existing \`__plugRunLiveScene\` only appears once a gameplay scene ticks, so
   a capture rig had no way to see the menu or The Window.
2. Training was marked complete in \`localStorage\` on the throwaway guest
   profile (\`pr_tutorial_v1_<id>\`), so PLAY opens the normal post-tutorial
   front door. This is local save state on a scratch browser profile - no
   balance, physics, outcome or public data was touched.

**No game balance, physics, speed, map or outcome was modified for any shot.**

Nothing was cropped or hidden either, with one thing worth stating: the
in-game HUD is absent from these frames because the current build disables it
on purpose (\`hudHeight = 0\` and \`HUD disabled on purpose\` in
\`BaseGameScene.js\`). What you see is the genuine current UI, not a stripped
one. The only thing deliberately kept out of frame is the guest account name
in the menu footer; neither cut uses a menu shot.

## Capture clock

Software GL renders this game at ~18fps, so real-time capture would have
produced stuttering 30fps footage. Instead the page's animation clock was
driven by the harness: each captured frame advances the game by exactly
1/30s (\`window.requestAnimationFrame\` and \`performance.now\` are pumped by the
capture script). The game is delta-driven, so a fixed 33.33ms delta is a value
it already handles - this changes the clock, not the game. It makes the
capture deterministic and reproducible. **Disclosed here rather than presented
as a real-time recording.**

## Source takes (uncut)

| take | frames | duration | contents |
|---|---|---|---|
| \`take-window.mp4\` | 780 | 26.00s | PLAY -> The Window (Auntie Ro), crew card, city map, first house |
| \`take-play.mp4\` | ${r.landscape.timeline.length?4800:0} | 160.00s | continuous campaign play, houses back to back |

Both are uncut, single continuous captures. Paths are reported in the summary
rather than committed, per the size instruction.

## Vertical cut - ${r.vertical.seconds}s, ${(r.vertical.bytes/1e6).toFixed(1)}MB

\`promo/trailers/plug-run-vertical.mp4\`
\`${r.vertical.probe.replace(/\n/g,' ')}\`

| # | shot | source | source timecode | len | note |
|---|---|---|---|---|---|
${shots(r.vertical.timeline)}
| ${r.vertical.timeline.length+1} | end card | promo/plug-run-poster-1080x1920.png | - | 3.00s | approved art, ends on PLUGRUN.IO |

## Landscape cut - ${r.landscape.seconds}s, ${(r.landscape.bytes/1e6).toFixed(1)}MB

\`promo/trailers/plug-run-landscape.mp4\`
\`${r.landscape.probe.replace(/\n/g,' ')}\`

The game is portrait-only (a 16x35 grid). In a native landscape window it
renders the arena in the middle with ~65% of the frame as empty margin, which
is why the landscape cut places the real portrait footage on a field built
from the approved cover art (blurred and darkened) instead. The gameplay
pixels are untouched and unstretched.

| # | shot | source | source timecode | len | note |
|---|---|---|---|---|---|
${shots(r.landscape.timeline)}
| ${r.landscape.timeline.length+1} | end card | promo/plug-run-cover-1200x630.png | - | 3.00s | approved art, ends on PLUGRUN.IO |

## Near misses are real

A near miss here means a Plug bullet passed within ~1 cell of the runner and
**no hit landed in the following second** - measured per frame from
\`bulletsD\`, the Plug's own bullet group. A bullet that connects is a hit, not
a near miss, and is excluded. Tightest passes captured:

${r.tightestBullets.map(b=>`- frame ${b.frame} (${tc(b.frame)}): **${b.dist} cells**, runner at ${b.hp} HP, survived`).join('\n')}

Moments found in the take: ${Object.entries(r.moments).map(([k,v])=>`${k} ${v}`).join(', ')}.

## Twitch screening

The bot dodges by reversing direction, and when a Plug closes in it can
reverse fast enough to read as twitching rather than as someone playing.
The footage is real, but it does not look human, so candidate clips are
screened on heading reversals per second (\`flipRate\` in \`analyze.mjs\`).

The whole take sits at **${r.takeFlipRate} reversals/s**. One clip in the first
vertical cut hit **10.33/s** -- five times baseline -- and was visible
immediately on screen; it has been cut. Any beat above three times baseline
is now reported at build time so it gets a second look before shipping.

Still above that line in the landscape cut, left in for now and worth your
eyes: \`power\` at 5.83/s and \`close-call-3\` at 6.06/s.

## Audio

**Vertical cut: music + gameplay SFX.** The bed is \`plug_beat2.mp3\` (the
"glideraide" beat). Rights basis: the repo owner states it was written by his
cousin in GarageBand and that they have permission to use it. That is his
statement, recorded here as the basis -- I did not independently verify it,
and there is still no licence or credit file in the repo for it.

It masters hot: -10.4 LUFS integrated, peaking +1.3 dBFS, i.e. already clipped
at source. It is therefore laid in at -9 dB, started at 2.0s to skip its
one-second fade-in so the cut opens on the established beat, faded out under
the end card, and the sum is limited at 0.94. Final mix: ${r.vertical.loudness}.

**Landscape cut: gameplay SFX only.** No music was requested for it. If you
want the same bed on it, it is one flag -- \`MUSIC=<file> node build.mjs\`.

**The SFX bed is not a recording of the browser.** Headless Chromium exposes no
audio track, so every cue the game fired was logged at capture time from
\`AudioManager.play()\` -- the game's own call, with the game's own computed
volume -- and rebuilt from the game's own asset files at those exact offsets.
Cues used: ${JSON.stringify(r.vertical.mix.used)}.

One cue is missing: \`impact\` (the bullet-hit thud). The game synthesises it as a
Web Audio earcon rather than playing an asset file, so there is no file to
rebuild it from. Every other cue the game fired is present.

**Still open, and it affects the game, not just the trailer.** The other audio
assets have no licence, credit or attribution anywhere in the repo and carry no
metadata. The drum roll in particular was uploaded as
\`28758__teleport8__sdroll.wav\` -- Freesound.org's \`<id>__<user>__<name>\`
convention, which suggests a third-party sample. Freesound licences run from
CC0 to CC-BY-NC, and CC-BY-NC would not permit promotional use. I could not
check it from here. \`contact_open.wav\` and \`pickup.wav\` have the same
undocumented provenance. Worth confirming before this goes out.

## Verification notes worth knowing

\`freezedetect\` flags the static UI beats (the Auntie Ro portrait and the crew
card) because those screens genuinely do not animate. It also flagged the
landscape opening, which is a false positive: the blurred background fills
most of the frame, so the average frame delta falls under the threshold even
though the gameplay is moving. Re-running it cropped to the gameplay region
(\`crop=608:1080:656:0\`) shows no freeze over the opening. Both cuts are clean
of true black frames.

One SFX is missing from the bed: \`impact\` (the bullet-hit thud). The game
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
`;
writeFileSync(REPO+'/TRAILER_CAPTURE_MANIFEST.md',md);
console.log('manifest written',md.length,'chars');
