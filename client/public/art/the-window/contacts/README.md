# Contact locations — Plug Run art pack

Generated 2026-09-16 for branch claude/input-intent-layer.
**Art and preview only. No gameplay integration, mission or Cash reward is active.**

## Assets

| Contact | Setting | Background |
|---|---|---|
| Switch / Crossline primary | The Dispatch | locations/switch-dispatch.png |
| Mags / Crossline jobs | The Map Room | locations/mags-planning.png |
| Brick / Iron Row primary | The Garage | locations/brick-garage.png |
| Rook / Iron Row jobs | The Service Room | locations/rook-maintenance.png |
| Vee / Afterlight primary | The Paint Room | locations/vee-studio.png |
| Sol / Afterlight jobs | The Night Bay | locations/sol-race.png |

Each setting is 1024x1536 RGB PNG, composed for portrait dialogue.
All six characters already have production portrait art one directory above.
Do not replace them with newly invented faces: reuse Switch's expression atlas
and the named cast frames declared in WINDOW_ART.
Auntie Ro keeps her existing bodega; she is neutral, not a seventh gang contact.

mission-props.png is a 1536x1024 RGBA sheet with six proposed harmless job
objects in 512x512 cells, row-major: radio, document tube, ignition key,
service keys, paint marker, stopwatch. It has an alpha channel; actual edge
alpha and clean isolation still require review. The background visible in the
tool preview is not proof of an opaque PNG. These are inventory/briefing
illustrations, NOT tiny overhead floor sprites, reward currency or final jobs.
Simplify/redraw floor icons when the mission system is scoped.

## Review

With Vite running, open /contact-art-preview.html.
It composites existing portraits over the backgrounds and live HTML sample
dialogue, including lower-right >> treatment. KEEP MOVING is not functional;
this is intentionally not a simulated gameplay implementation.
The page loads the whole art pack for review only; do not copy that load pattern
into the game.

manifest.json records source dimensions/bytes, portrait frames, provisional
placement/foreground fractions and object crop cells. Those fractions are
starting points, NOT measured final Phaser positioning. The preview reuses a
matching foreground crop over Switch/Mags so their bodies sit behind desks.
A desk crop covering faces/hands must be adjusted after human review, not
treated as an authoritative screenshot measurement.

## Intended composition

Layer backdrop -> existing portrait -> optional matching foreground -> dialogue.
Keep upper title compact, middle portrait prominent, lower dialogue quiet.
No dialogue/labels/logos are baked into the settings.
Use the original 2:3 aspect ratio; portrait/desktop review frames should preserve
that ratio rather than stretching. A different production viewport needs a
tested cover crop with the same coordinates applied to foreground/background.

Graphics follow the Window's charcoal ink, weathered materials, cream highlights
and warm practical light. Each setting has a calm center with profession-
specific details on the edges. The six rooms establish a neighborhood, not
a deep story-heavy campaign or another playable game world.

## Cost and optimization

Total seven PNG sources: 18,370,368 bytes
(17.52 MiB). Uncompressed RGBA texture footprint would be
approximately 42 MiB for all seven, before mipmaps/overhead/character art.
One backdrop is approximately 6 MiB decoded. These are source-quality assets.

Before shipping gameplay use:
- generate tested WebP/optimized variants, keep PNG originals as source;
- lazy-load only the current contact setting; share/cache character atlases;
- measure real phone download/decode/GPU usage;
- preserve alpha for object/portrait assets;
- test portrait/foreground matching and fallback if a texture fails.

No shell image-editing or Python processing was used to alter artwork.
The local imagegen skill-file read and Node reader could not start under the
Windows process restriction; no further process attempts were made. Generated
image tool results were uploaded directly as binary Git blobs.

## What remains unverified

The generated images were visually inspected from the image tool output.
PNG signatures/headers/dimensions/byte counts were inspected in-memory.
80 art-contract assertions passed in an adapted metadata harness; this is not
a native file-read/npm run. The suite is registered in npm test. Composite browser
rendering, real portrait transparency, desk occlusion, prop crop/alpha quality,
small-icon legibility, loading performance, npm verify and Vite were NOT checked
on a device in this session. Do not claim this preview has been rendered.

See CLAUDE_GAMEPLAY_CONTACTS_HANDOFF.md for the next dialogue/mission stages.
Cash is the future currency name. Old credit-named runtime state is untouched.
