# Runner direction changes near a Plug — investigation and fix

Branch-only: claude/input-intent-layer. Master is not changed by this patch.

## What was checked

Per the report ("a nearby Plug seems to nudge the runner off a straight line
into diagonal movement without a new steering gesture, especially around
corners"), every candidate the report named was inspected in the real source
and then tested empirically with the actual game code (PlayerController,
gameUtils' corridorAssist/applyCenterBias, and PlugAI's real defender logic),
not a reimplementation:

- `canMoveTo` / `isWallAtWorld` / `isWalkableCell` — pure grid lookups, no
  actor-occupancy check. A defender standing exactly where the runner is
  about to step does not block it.
- `corridorAssist` / `applyCenterBias` — take `(scene, sprite, dir, dt)`,
  structurally incapable of reading a Plug's position (verified by argument
  count, not just behavior).
- Smart cornering (`steerToLane` in `applyLegacyMovement`) — reads only
  `isWalkableCell`/wall geometry to decide when to nudge the runner onto a
  lane center so forward motion "catches" a corner. No opponent reference.
- Actor separation / pushback — no such system exists in this codebase to
  disable or adjust.
- Defender-reference swapping (`BaseGameScene`'s dual-AI Plug update, House
  15) — only ever reassigns `scene.defender`/`scene.defender2` and only
  before calling `updatePlugBehavior`. It never touches `scene.attacker`.
- `PlugAI.js` (including this session's earlier campaign-pursuit/navigation
  changes) — only ever writes `d.x`/`d.y` where `d = scene.defender`. Never
  reads or writes `scene.attacker`.
- Duplicate touch dispatch — `BaseGameScene.makeMobileControls` registers
  the same `moveHandler` on both the interactive zone and the global
  `this.input`, so a single real pointer move calls it twice. Confirmed by
  reading the source; this is real and pre-existing (not part of the three
  branch commits). It is **not implicated** in the reported symptom because
  a duplicate call with the identical pointer object is idempotent (same
  angle in, same hysteresis decision out) — verified in the new test.

New test `client/test/runnerPlugProximity.test.mjs` (400 assertions) runs
the actual `PlayerController` + `corridorAssist` + `PlugAI.updatePlugBehavior`
against a real wall grid with corners, for fixed cardinal input (both a held
key and a released touch flick), with a Plug near/far/absent from 8
approach angles and 3 distances, through two corridor shapes (an early-house
style single corner and a tighter late-house layout with a side pocket),
plus held-drag-then-release continuation, plus dual-Plug House 15 using
BaseGameScene's exact defender-swap pattern. **Result: the runner's full
trace — position and all four direction variables — is byte-identical in
every case regardless of the Plug.** Proximity is not the cause; it was a
coincidental correlation, exactly as suspected.

## The actual bug (found and fixed)

`runnerDragDirection` (added in the cardinal-preference/hysteresis
experiment) lets a committed cardinal survive drift up to 28° and a
committed diagonal survive drift up to 17°, before recomputing from scratch
using the *original*, much tighter fresh-gesture bands (22° / ~15°). Because
the hold band is wider than the fresh band, breaking a hold via smooth,
continuous thumb drift — no release, no flick, no new gesture at all — could
fail both fresh checks and fall through to the raw, unsnapped angle.

Reproduced headlessly: a 1-degree-per-step drag from 0° to 30° (one
continuous gesture) stays locked at cardinal `(1,0)` through 28°, then at 29°
jumps straight to `(0.875, 0.485)` — an arbitrary half-diagonal, not a clean
diagonal, for one more degree of ordinary drift. That is precisely "nudged
into diagonal movement without a new steering gesture."

Fix: when a hold has just broken, classify the release using the *same*
width as the hold band that just gave out (28° cardinal / 17° diagonal)
instead of the tighter fresh-gesture bands, so leaving one snap always lands
in the contiguous adjacent snap. A genuinely fresh gesture (no prior hold)
is unaffected and keeps its original tight bands and free-angle gap. Two
lines changed in `runnerDragDirection`; no speed, collision, diagonal
controls, or repeated-per-frame overwriting introduced.

## Traces (before / after)

Continuous drift 26°→31°, one committed cardinal drag, no release:

| deg | before fix | after fix |
|---|---|---|
| 28 | (1, 0) held | (1, 0) held |
| 29 | **(0.8746, 0.4848)** — arbitrary | **(0.7071, 0.7071)** — clean diagonal |
| 30 | (0.8660, 0.5000) — still arbitrary | (0.7071, 0.7071) — clean diagonal |
| 31 | (0.7071, 0.7071) — only now clean | (0.7071, 0.7071) — clean diagonal |

Fresh gesture (no prior hold) at 27°, unaffected either way: raw
`(0.891, 0.454)` — the documented free-angle zone for a first touch.

## Checks

- `node client/test/dragSteering.test.mjs` — new regression fails against
  the pre-fix source (confirmed: `leaving a cardinal hold via continuous
  drift lands on a snap, not a raw angle`) and passes against the fix.
  313 assertions total.
- `node client/test/runnerPlugProximity.test.mjs` — 400 assertions, all
  pass; added to the `npm test` chain.
- `npm run verify` (full suite, 66+ files, then production build) —
  exit 0.

## Still unverified

This is a headless, single-threaded, fixed-dt simulation. It cannot
reproduce actual mobile touch-event behavior: the confirmed
zone+global double dispatch under real browser event timing, raw DOM
touch-fallback coordinate rounding against Phaser's own `pointer.x/y`
under real `devicePixelRatio`/layout conditions, or frame-time variance
under real device load during combat. None of those were found to be
implicated by this investigation, but only real-device play can confirm
the fix actually resolves what the player experienced, and that no
device-only duplicate-event artifact remains. Recommended device check:
hold a diagonal-adjacent cardinal drag near a wall corner for several
seconds without releasing, near and far from a Plug, and confirm the
runner never snaps to an odd/off-axis angle mid-hold.
