# Plug Run — handoff for a new agent

Written 2026-09-15 at the end of a long Claude Code session. Branch:
`claude/input-intent-layer`. 38 commits ahead of `master`; `master` is
untouched and still deploys the old build.

Read this first, then `HANDOFF.md` for the measurement history and the PvP
plan. This file is onboarding; that one is the research log.

---

## Entrance flow and Keep Running — 2026-09-15

- Runner PvE now pauses on the exterior block map BEFORE startMatch/loadout,
  including first entry and resume. Cleared = current house minus one; visibleThrough
  includes the ready house. Enter House resumes setup; no extra post-clear map.
- Menu has four stable rows: Daily Block/Continue Daily, Keep Running, Tutorial,
  Settings. Restart Daily moved to the entrance map for resumed daily blocks.
- Keep Running uses mode=pve plus runKind=journey and blockIndex. House index
  resets to 1 after each 15-house finale; existing difficulty stays bounded.
- logic/worldBlocks.js has permanent versioned block/house seed domains, curated
  names in four districts, numbered identities, short arrival/departure copy and
  checkpoint transitions. Street names repeat, numbered block identities do not.
  World geography currently uses the established street route with seeded
  mirroring and seeded ground/fog; it is not a new arbitrary street generator.
- utils/journeyProgress.js stores a device-local, account-scoped checkpoint under
  pr_journey_v1_<userID>. No cloud sync. Clearing the browser's storage loses it.
  Next-house/next-block checkpoint saves immediately on clear. Retry and swap
  preserve journey identity; a new block resets its local stash/REP and streak.
- Journey never calls daily completion/session/leaderboard or accumulated user
  reward writes. Daily seed formula is unchanged. Journey rewards are local only.
  Existing analytics still track PvE events; do not treat them as daily-only data.
- 403 existing + 63 new behavioral assertions passed in the adapted V8 harness.
  Stub checks covered Base init/resume/entrance pause, journey storage isolation,
  extraction at houses 1/14/15, retry/swap isolation, and daily score submission.
  Another 120 generated 16x35 world maps repeated deterministically. Modal geometry
  stubs retained positive map space at 280x480, 390x844 and 1440x900 (not visual QA).
  Edited modules passed adapted binding-aware syntax compilation. Native npm test,
  .mjs syntax subprocess checks, Vite build and visual/touch/browser QA were NOT
  run: local process creation still fails with Windows error 267. Run npm run verify
  in client, then check menu -> house1 -> loadout, clear -> house2, resume, retries,
  and house15 -> next block on the user's machine before merging/deploying.

## Codex continuation — 2026-09-15

The block-map redirect below is implemented and the human approved its rendered
appearance. It is now a continuous exterior neighborhood with opaque stepped
fog, a winding street, exterior rooftops, warm window/street lights and an
animated reveal. No interior floor plans are shown on that map. The two block
interstitials use the viewport and GameUI's contentBounds. Use
`/block-map-preview.html` under Vite to inspect progress 0–15.

The interior/loadout art pass below has now also been visually approved by the human:
- `controllers/RunnerLoadout.js` replaces runner selection with drawn
  Phase/Dash/Decoy icons, descriptions and two ordered charge slots. Same
  repeatable-power selection behavior, now in import-free
  `logic/powerSelection.js`. The settings gear is also drawn in code.
- `controllers/InteriorDecor.js` uses import-free `logic/interior.js` to
  replace suitable solid wall components with overhead sofas, cabinets, tables,
  chairs and plants. No collision-grid edits, floor decoration obstacles, or
  gameplay RNG consumption. All original floor palettes, wall tints/shading,
  characters and real/bunk stash visuals are preserved.
- The old lazy furniture-texture loading/restart in BaseGameScene is removed.
  Legacy assets and the old exported decorator are retained for other callers.
- `/interior-style-preview.html` uses actual BaseGameScene drawing methods for
  a stationary art preview, with themes, sample seeds and viewport sizes.
- The in-game runner ability HUD is deliberately disabled in BaseGameScene.
  Do not accidentally re-enable it while changing selection icons.

Validation: 249 assertions in 12 suites passed in the available V8 runtime
with import bindings adapted and a performance clock shim; this was NOT a
native npm test run. Stubbed Phaser checks covered selection, duplicate powers,
disabled start, replay visibility, cleanup and finite prop geometry. Real/bunk
construction, maze generation and maze RNG were compared unchanged.

The local shell and browser automation could not start (Windows process
creation errors 267 / 5). Native build, native module loading and the new
interior/loadout appearance remain unverified here.

`npm run verify` now runs tests and the production build. `npm test` also
includes `test/moduleSyntax.test.mjs`: it copies every source module and both
preview inline modules into a temporary .mjs file and invokes native
`node --check`. This guards against trap 1 below. It does not resolve imports;
Vite still needs to pass. The new native syntax checker itself remains unrun in
this restricted session.

Landing/title-screen continuation:
- The human approved the Plug Run wordmark but rejected the busy landing card,
  then supplied a Nearly Dead title-screen reference. That supersedes the
  earlier card and the uncommitted simplified gold-button draft.
- MenuScene now presents Start Block / Continue, conditional Restart, Tutorial
  and Settings as quiet vertical text options. Gold marks the selected option,
  not a large filled button. The countdown remains beneath the unchanged SVG
  wordmark. No title card, stats strip, street illustration or menu sidebars.
- The background uses existing runner/plug sprites, faint blue/red tints and a
  fixed vignette. Import-free titleBackdrop plans bounded edge positions and
  excludes the logo and worst-case four-row menu. No RNG or gameplay changes.
- Profile/recovery, help and leaderboard remain accessible in the footer.
  Stats data is not removed; the leaderboard remains its destination.
  launchCard is unchanged. Restart retains clear-and-launch, with a fade guard.
- logic/landingLayout.js owns geometry, save labels and backdrop positions.
  Its test suite now has 120 assertions, replacing the old 44 card-fit checks.
  All 249 other assertions also passed under adapted V8 (369 total). Stubbed
  Phaser checks covered 20 viewport/session scenarios, 10 restarts, hover
  selection, tutorial transitions, settings callbacks and actual positioning.
- This is NOT a native npm test or Vite build claim. Windows process creation
  still fails with error 267. Actual sprite brightness, font metrics, taps,
  native ESM imports and final composition need local review with npm run verify
  and /brand-preview.html (which embeds the actual game, not a fake menu).
- SVG logo/favicon assets are unchanged. The old night-block.svg is retained
  as reusable art but is no longer loaded or shown on the title screen.

Runner tutorial continuation:
- The human approved the title screen, then requested removal of the final plug
  lesson and tutorial visuals matching the runner game.
- Tutorial flow is four lessons: movement, real/bunk stash, powers, escape the
  AI defender. logic/tutorial.js owns the bounds, next-stage decision and copy.
  Completion follows stage four; direct attempts to enter stage five clamp to
  four. Shelved plug implementation remains unreachable, not removed from game.
- Shared controllers/ArenaArt.js now owns the existing BaseGameScene arena
  painting, brightened texture conversion and perimeter. Base methods delegate
  to it. Tutorial uses the same renderer with no unnecessary wall geometry mask,
  the existing loft_concrete checker theme, and existing overhead furniture.
  Scene restart destroys tutorial-owned drawing groups and display objects.
- Tutorial runner/AI defender use spriteFactory outlines, team rings and shadows.
  Its original movement/step timing remains; outline copies follow the same
  angle and texture. Trails and car beacon are quieter, stash outlines use ink.
- Lesson/completion dialogs use GameUI. Tutorial loadout uses RunnerLoadout with
  tutorial title/start copy, no saved replay and no account controls. The main
  game defaults of that picker are unchanged. Keyboard/pause and click-through
  suppression are restored when dismissing/starting.
- 369 existing behavior assertions plus 34 tutorial assertions passed under
  adapted V8 (403 total), not native npm. Eight renderer trace comparisons
  matched the old Base renderer exactly; grids were unchanged. Tutorial map
  generation, movement and power execution were compared unchanged.
- Stub checks covered 12 lesson dialogs across viewport sizes, four transitions,
  completion after four, duplicate-charge selection, single-fire Start and
  unchanged normal-game picker defaults. Native ESM/build, actual text wrapping,
  live movement/extraction and rendered tutorial still need human/local review.
  Windows process launch remains unavailable; run npm run verify in client/.

The remaining sections preserve the earlier handoff and research context.

---

## What the game is

Top-down arcade maze game, Phaser 3 + Vite, deployed on Netlify. You are a
**runner**: grab the stash from a house, reach the getaway car before the
**plug** shoots you. Maps are generated from a daily seed, so every player
gets the same maps on the same day.

The conversion in progress: from an endless PvE ladder to a **daily block of
15 maps** with a real ending, and later async PvP.

```
npm install          # in client/
npm run dev          # vite, port 5173, --host is already set
npm test             # 209 assertions, 11 suites, plain node, no browser
```

---

## Ground truth, measured

A bot harness (`?bot=1`) played ~600 rounds and produced numbers that drove
most of the design decisions here. Full detail in `HANDOFF.md`; the load-bearing
facts:

| finding | number |
|---|---|
| Per-map clear rate, rounds 1–7 (one plug) | **50%** |
| Rounds 8–14 (two plugs) | **17%** |
| Rounds 25+ | **0%** — last clear anywhere was round 23 |
| Deaths in a clear firing lane (`laneFrac`), cleared vs died runs | **0.03 vs 0.23** |
| Runs starting within 6 cells of a plug that were ever survived | **0 of 47** |

Three things follow, and they're already implemented:

1. **The round-8 collapse was the second plug**, not the difficulty curve —
   `defender2` took 56–76% of kills once it existed. It now appears **only on
   map 15**, as the finale.
2. **The ladder ends at 15.** It used to run forever, which was fiction.
3. **Spawn distance was near-deterministic.** `findAlternateSpawn` never
   considered the player, so the second plug could spawn adjacent. Fixed.

---

## Architecture

```
client/src/
  scenes/       BaseGameScene.js   3.3k lines. The game. Everything inherits it.
                RunnerScene / PlugScene / PvpScene   thin subclasses
                MenuScene.js       2.8k lines. Landing page.
                TutorialMiniScene.js  self-contained, shares almost no code
  controllers/  ProgressionManager  rounds, REP, modals, block flow
                CombatSystem        bullets, hits, death
                PlayerController    input → movement
                RunnerAI / PlugAI / AIController   opponent brains
                BotDriver + installBotDriver   the test harness (see below)
                GameUI, VisualEffects, ReplaySystem, BlockMap
  logic/        PURE modules, no imports, headless-testable  ← put logic here
  utils/        mazeGenerator, seededRandom, repTracker, routeProgress, api…
```

**The `logic/` convention matters.** `utils/gameUtils.js` imports Phaser, which
drags a browser into anything touching it. Every module in `logic/` imports
nothing, so it can be tested with plain `node`. 15 modules, all tested. When you
write decision logic, put it there and test it.

### The bot harness

`?bot=1&aiLevel=20&sweepFrom=1&sweepTo=15&mapsPerRound=5`

Plays the game through the real input path (`InputIntent.driveMove`), so it
can't do anything a player couldn't. Attached by prototype-wrapping
`BaseGameScene` in `installBotDriver.js` — zero production footprint when off.
Every run records forensics (where it died, to whom, which leg, exposure,
stalls, spawn fairness). `__plugRunSummary()` / `__plugRunDownload(false)` in
the console.

**Caveat when running it:** the round timer is wall-clock, so a backgrounded
tab clocks out and the sweep stalls. Keep the tab in front.

---

## Conventions this codebase follows

- **Commit messages explain WHY, at length.** Look at `git log` — they read as
  prose and record what was measured, what was rejected, and what's unverified.
  Please keep this up; it's the project's memory.
- **Pure logic in `logic/`, tested headlessly.** No exceptions so far.
- **Don't change movement feel blind.** Drag-commit timing, 8-way snap,
  corridor assist and cornering are tuned by hand and can only be judged by
  playing. Several deliberate non-changes are documented for this reason.
- **The bot is a measuring instrument, not a player to optimise.** Making it
  strong invalidates every number it produced. Making it *less wrong* (it had a
  blind spot no human has — no concept of exposure) is legitimate; making it
  superhuman is not.
- **Determinism is load-bearing.** Both clients must build an identical world
  from the seed alone — that's what makes async PvP possible without shipping
  map data. No `Math.random()` in anything world-generating.

---

## Where things stand

**Done and pushed** (not yet on `master`, not yet seen by any player):

- 15-map block, second plug only on map 15, `BLOCK CLEARED` ending
- Spawn-distance fix, cover-aware bot routing, phase-escape, dodge commitment
- Run forensics + round sweeping in the harness
- **Polish pass**: ink outlines on characters/objects/walls, hard shadows,
  team rings, step bob, squash, recoil, dust, death burst, camera vignette.
  Three art styles culled down to one (`td_*` sprites).
- Menu restyled to match; **plug mode shelved** behind `SHOW_PLUG_MODE = false`
  in `MenuScene.create()` — everything behind it still works
- Block-map interstitial between maps

**Unverified — no browser in the container where this was built.** None of the
visual work has been seen rendered by the agent that wrote it. The human has
eyeballed it and approved the character/wall treatment.

---

## YOUR NEXT TASK: make the block map a real top-down map

This is a redirect. I built the interstitial as a **side view** — a street of
houses in elevation, lighting up as you clear them. The human wants what
**Nearly Dead** does instead: a **top-down map view** with fog, revealed
progressively.

Reference: https://monosw2000.itch.io/nearly-dead — irregular organic regions
in muted colour, unexplored areas black, a marker for where you are.

### Why this is very achievable here

**The maps are deterministic and regenerable without playing them.** This is
the key fact:

```js
routeID = getCurrentRouteID()                       // utils/seededRandom.js
seed    = getRouteSeed(routeID, mapIndex, 'runner')
arena   = generateSquareMaze(cols, rows, {          // utils/mazeGenerator.js
            rng: makeRng(seed), role: 'runner',
            clusterScale: [0,0.6,0.75,0.9,0.95][mapIndex] ?? 1
          })
// → { grid, spawns, objectives, egress }
```

Grid is 16×35, `T.WALL` / floor. So you can draw the **actual floor plan of
every house in tonight's block**, cleared or not, without the player having
played it. A cleared house shows its real layout; an unplayed one is a dark
silhouette of its own footprint. That's genuinely Nearly Dead, and it costs no
art.

### What to build

Replace the elevation view in `controllers/BlockMap.js` (rendering) and
`logic/blockMap.js` (layout/state) with a top-down one:

- 15 house footprints arranged as a **city block seen from above** — plots
  either side of a street, or a grid of properties. Their real maze layout
  drawn small inside each.
- **Fog**: cleared houses rendered in the board's palette; the next one
  outlined/marked; unplayed ones dark.
- **The finale (house 15)** visually distinct — it's the two-plug map.
- Same comic grammar as the board: flat fill, ink line (`logic/palette.js`),
  hard shadow.
- Keep `logic/` pure and tested; `blockMap.test.mjs` has 17 assertions on the
  current model — rewrite them for the new one, don't delete them.

Where it's called: `ProgressionManager.showBlockMap(goNext)` (between maps)
and `showBlockComplete()` (whole block revealed, the shareable image).

**Hard part, be honest about it:** 15 mini-mazes at 16×35 in one modal is a lot
of pixels. Options: draw simplified footprints rather than full mazes, or make
the map a full screen rather than a modal, or show a zoomed region around the
current house. Worth prototyping before committing to a layout.

### Also wanted: "polishing the site to make it look great"

The visual pass so far has been *treatment* — line weight, shadow, juice.
Still open, and deliberately left for someone with the game on screen:

- **The wall palette.** `THEMES` in `utils/mazeGenerator.js` uses saturated
  neon edge colours (orange, purple, green, pink) that compete with the
  characters. The reference look wants walls dark and chunky with saturation
  reserved for people, bullets and the stash. This is a taste retune — do it
  live, one theme at a time.
- **The plug's flat red tint** (`PALETTE.plugTint`). Kept because its art has
  never been seen untinted. The ground ring now carries team identity, so
  dropping the tint may look much better. Try `plugTint: null`.
- **Outline weight** (`outlinePx`, currently `cell * 0.07` ≈ 2px) and **bob
  amplitude** (`cell * 0.06`) — both single numbers, both unjudged by anyone
  who wrote them.

---

## Traps I hit, so you don't

1. **`node --check` does NOT catch ES module errors here.** There's no
   `"type": "module"` in `client/package.json`, so it parses files as CommonJS
   where `import` doesn't bind names. I shipped a duplicate-identifier crash
   that took the whole site down. To check properly: copy to `.mjs` and
   `node --check` that.
2. **`MenuScene.js` declares its own local `const PALETTE`** for street-sign
   colours. Import the shared one aliased (`PALETTE as INK`) or you'll collide.
3. **Test worlds need their geometry verified.** Three separate times I wrote a
   test whose stub world didn't actually create the situation under test (wall
   in the lane instead of perpendicular to it, a row the wall column blocked,
   an open alternate route). The code was right; my test was wrong. Check the
   grid before trusting a red test.
4. **Arrays compare as strings in JS.** `[10,0] < [9,0]` is `true`. Bit me in
   spawn selection on a 16-wide grid.
5. **Scene instances survive `restart()`, cameras don't.** Flag camera-level
   setup on the camera, not the scene, or it runs once and never again.
6. **Don't darken every floor cell adjacent to a wall.** A one-cell corridor
   touches walls along its whole length, so corridors go dark and the floor
   reads as two surfaces. I did this and had to revert it.

---

## Open questions nobody has answered

- **Single-plug rounds 8–14 have never been measured.** The 17% was with
  `defender2` present. Removing it should land between 17% and 50%, but that's
  a prediction. One sweep answers it:
  `?bot=1&aiLevel=20&sweepFrom=8&sweepTo=15&mapsPerRound=5`. The 15-map block's
  back half depends on this.
- **No human baseline exists.** Every number is bot-derived. Ten hand-played
  rounds would bracket it; the telemetry records any player, not just the bot.
- **Scoring for the daily isn't built.** Design discussed: time as the score,
  with penalties added to it (death, damage taken, spawn swap). Inputs are
  mostly instrumented already in `logic/runForensics.js`; damage taken isn't.
- **iOS port** is viable via Capacitor. Four known blockers: the relative API
  path in `utils/api.js` (breaks under `capacitor://`), no in-app account
  deletion (hard App Store gate), missing `viewport-fit=cover`, and
  localStorage durability. Not started.

---

## Don't break these

- `master` is the live site. This branch has never been deployed.
- The daily seed derivation. `getRouteSeed` has only ~1000 round slots per day
  before colliding with the next day — fine for a 15-map daily, **not** fine
  for unlimited PvP matches, which will need their own `getBlockSeed`.
- The replay system records the display list. If you add visual objects to
  characters, they get recorded; per-frame offsets are fine, tweens fighting
  for the same property are not.
