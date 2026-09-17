## Organic cities and Rivals territory entrance — implemented 2026-09-16

The crooked grid was rejected. City cartography now has a winding central river,
bridge boulevards, scattered smaller playable districts, a denser mixed-size
downtown, parks and a rail edge. Palette remains dark. It is visual only:
story seeds, ten-block city grouping, exterior aspect and saved ownership remain
unchanged. A saved crew's existing sigil is softly backlit on cleared blocks.
CityMap accepts a separate 'rivals' mapVariant and overview-only preview mode.

Normal Block Rivals now has its own seven-district circuit map and fully lit
seven-house exterior based on the pool course's seed (not a story world block).
Flow: automatic city -> neighborhood -> full block; LOOK FOR MATCH opens an
editable power mix; confirming LOOK FOR MATCH runs the cosmetic rival carousel;
the selected recorded rival and their ordered powers appear; the existing
three-second countdown starts automatically. The search says Recorded opponent
pool, not a live queue. Visible names strip BOT/AI; hashed records remain intact.
Failures settle onto the existing pace-trial fallback. Shared opponentPending
prevents a resize during fetch from starting early or issuing duplicate requests.
Pickup replay progress is prefetched after selection, before countdown.

Personal win territory is new, account-scoped pr_rival_city_v1_<user>. It is not
server-wide crew standings or trusted scoring. Only a complete seven-house win
on the currently unlocked pool slot advances one district. Freeze the crew and
account at race creation. Loss/draw/forfeit, recordings, old-course rematches and
duplicate results do not advance or overwrite owners. Separate retention from
the twenty-result history; 280-claim tests preserve early owners. Failed storage
has an account-scoped volatile fallback and an honest temporary-progress notice.
No retroactive territory guessed from capped legacy results. All seven courses
remain pinned, reusing the bank; after seven wins, next circuit city starts at
slot one. Further bespoke geography per circuit is a future art pass, not new
course seeds. Explicit recording/fixed-power harnesses retain the old policy.

Result: a fully lit seven-house map; win displays crew mural, with claim notice
when progress actually applied. ENTER NEXT BLOCK on wins, TRY AGAIN otherwise;
REMATCH and replay still work. Result extras register with GameUI for replay
hide/restore and teardown. No Cash, REP, global territory, input feel, maze,
race timing, opponent hashes or recording bank edits.

Preview URLs under Vite (dev-only; not served in production dist):
- /city-map-preview.html — story and hold-overview toggle.
- /rival-city-preview.html — seven-district circuit, hold overview, local-only
  simulated win controls. It does not record races or write player storage.

Validation: all 44 adapted in-memory V8 suites pass, including 2,171 city logic,
129 actual city/UI flow, 113 Rivals adapter, 4,179 new territory/storage/selection,
242 mobile-input and 1,889 contact-flow assertions. Seven changed runtime modules
and both preview scripts compile under adapted V8 with imported-binding checks.
The unchanged bank passes 402 assertions across 55 recordings.
Native npm run verify, Vite/native ESM/art checks, real Phaser appearance,
touch/drag after the carousel, networking and phone/audio remain unverified:
no local execution attempted under the Carbon Black restriction. Run verify and
review the real menu -> city -> block -> mix -> search -> GO loop before deploy.
Master is untouched.

# Claude handoff: Block Rivals recorded opponents

## Player-selected mixes supersede matched loadouts (2026-09-16)

The human explicitly chose same-course competition with independent powers:
choose your own pair once before each race (including Rematch), then refill
that pair each house/retry. Do not restore the matched-loadout lock or require
the bank to cover all nine player mixes. Rival powers remain exactly as
recorded and are shown in the opening picker; WATCH still plays the original
bundle. Normal opponent resolution never writes `race.fixedPowers`.
Explicit recording/play harness powers remain fixed and are not overridden by
the selected opponent. Bank hashes, seeds, effects, timing, refill mechanics
and rules version are unchanged; this is a matching/UI-policy change only.

Selection/tutorial wording uses powers. Run the Block becomes compact after
house 3; Rivals keeps its single full opening picker. Slot taps clear a choice.
See the top of HANDOFF_CODEX.md for 546 targeted adapted-harness assertions and
the native/build/device checks still blocked by the Carbon Black restriction.
All older recommendations below for matching the player's ordered pair are
historical and superseded by this product decision.

## The Window / Store Credit boundary (2026-09-15)

A future social wrapper is specified in `THE_WINDOW_DESIGN.md`; it is
documentation and concept art only. The proposed economy gives a qualifying
Block Rivals win +2 Store Credit, with a recommended first-three-wins-per-route-
day cap. Do not add that award to the current Rivals result pipeline until the
dedicated idempotent ledger and tests exist. Replay, rematch, watch and fallback
opponent paths must never become reward events. Preserve all existing mode and
recording isolation.

Written 2026-09-15 after Codex commit `de35c373eeb005995c9a6d5a8079fdad64954d65`.
Work only on `claude/input-intent-layer`. Do not touch `master`.

Read `HANDOFF_CODEX.md` end to end before changing code. It contains the
architecture, test history and six build traps. This file is the focused next
assignment for Block Rivals.

## Status after the recorded-opponents pass (2026-09-16)

Done on `claude/input-intent-layer`, all verified natively with `npm run verify`
(tests + Vite build) in a Linux container, plus headless Chromium runs of the
bot recorder. Nothing has been seen on a phone or touched by a human yet.

| piece | where | proof |
|---|---|---|
| Fixed seven-course pool, rotation policy | `logic/rivals.js` (`RIVAL_COURSE_POOL`, `nextRivalSlot`, `rivalPoolCourse`) | `test/rivalCourses.test.mjs`: 668 assertions on the real generator: 49 houses reachable, deterministic, seeds derive from slug hash, weapons/real-bunk stable |
| RivalRunRecord / RivalReplayBundle contracts | `logic/rivalRecords.js` | `test/rivalRecords.test.mjs` (68) |
| Portable replay segment format | `logic/rivalReplay.js` | `test/rivalReplay.test.mjs` (69) |
| Bot presets, opponent choice, ladder tier, bank loadouts | `logic/rivalPresets.js` | `test/rivalPresets.test.mjs` (24) |
| Live-scene capture (Phaser-free) | `controllers/RivalReplayCapture.js` | `test/rivalCapture.test.mjs` (42, stub scene) |
| Race adapter: capture hooks, fixed loadout, opponent lookup, WATCH RIVAL REPLAY | `controllers/RivalsRace.js` | `test/rivalsFlow.test.mjs` (67) |
| Seven-house playback overlay | `controllers/RivalReplayPlayer.js` | headless screenshots only (see below); no unit test, it is all Phaser |
| Static bank loading + validation | `utils/rivalSession.js` (`loadRivalOpponents`, `resolveRivalOpponent`, `loadRivalReplay`) | exercised by the play-mode harness run |
| Recording / play harness | `controllers/installBotDriver.js` (`?rivalsRecord=1`, `?rivalsPlay=1`) | headless runs, output in `client/public/rivals/v2/` |

### How the pieces fit

- A race object (`scene.rivalRace`) now carries `opponentKind` (`simulated-ai` |
  `recorded-bot`), `opponent` (recordingID, displayName, replayURL...),
  `opponentRecord`, `fixedPowers`, `hardLimitMs`, `recording`, `capture`.
- `RivalsRace.prepare()` calls `resolveRivalOpponent(race)` before the loadout.
  It returns `null` synchronously when there is nothing to do and a promise
  otherwise; the HUD shows FINDING RIVAL meanwhile. On success the seven
  recorded clear timestamps replace the simulated ones and the player gets the
  recording's ordered loadout (fixed-loadout confirm instead of the picker).
  On any failure the race stays the labeled simulated pace.
- Capture: `beginRaceCapture` at GO, `beginAttemptCapture` when each house
  clock starts, `tickAttemptCapture` every racing frame (15Hz samples, events
  on transitions), `endAttemptCapture` on extract / caught / timeout /
  abandoned. A resize retry or a forfeit is `abandoned`, which makes that race
  unexportable on purpose.
- `exportRaceCapture(race, {opponent, recordingID})` refuses anything short of
  seven clears whose timestamps equal the race clock, then builds both
  artifacts. The player's own race is exported the same way (kind `human`,
  id `local-player`) into the local result history as `runRecord`.
- Static assets: `client/public/rivals/v2/manifest.json` (summary),
  `courses/<courseID>/opponents.json` (records + `replay` path, fetched at race
  creation, 3.5s timeout), `replays/<recordingID>.json` (bundle, fetched only
  on WATCH, 12s timeout, 6MB cap). Built by the assembler script described in
  the recording section below; not hand-edited.

### Recording the bank

```
# from client/: npm run build, serve dist on a port, then per job:
http://127.0.0.1:4173/?rivalsRecord=1&courseSlot=3&skillPreset=hustler&runs=3
# optional: &powers=phase,dash (defaults to rivalBankLoadout(slot, preset))
#           &hardLimitMs=720000 (race forfeits at 12 min) &opponentIndex=4
```

The page auto-launches the race, the auto-clicker presses READY / REMATCH, and
`window.__plugRunRivals` fills with `{ok, reason, record, bundle, traces}` per
race; `__plugRunRivalsDownload()` saves it. Incomplete races are listed with a
reason, never exported. The bank in the repo was produced by driving that page
with Playwright and Chromium (swiftshader WebGL) and assembling the outputs
with a script that re-validates every record and bundle with the game's own
logic modules before writing files. `?rivalsPlay=1&courseSlot=N` races the bot
against the shipped bank the way a player would (opponent lookup, fixed
loadout, WATCH button) and exports nothing.

### Bank as shipped (2026-09-16)

`client/public/rivals/v2/` holds 55 complete bot races (9.9MB of replay
bundles, 57KB-525KB each), assembled from the headless recorder and
re-checked by `test/rivalBank.test.mjs` (402 assertions). Per course:
Low End Rush 9, Copper Climb 8, Freight Run 9, Afterglow Mile 8, Switchyard
Seven 5, Lastlight Loop 9, Blacktop Crown 7. Eight races forfeited at the
12-minute limit and were rejected, never shipped.
Race times run 1:14 to 11:39 with 2 to 108 retries; Switchyard Seven is the
hard course. Where a tier has no recording on a course, selection falls to
the nearest tier that has one (`chooseRivalOpponent`).

The Ace preset had to be redefined during recording: see the comment in
`logic/rivalPresets.js` and commit a9d76d9 (aiLevel 20 runs the same route
every retry and dies in the same lane; level 5 with the evasion layers on
completes). Any change to the driver or presets means a new
`RIVAL_BOT_DRIVER_VERSION` and a re-recorded bank.

Frame-rate matters for recording: WebGL via swiftshader ran at 9-18fps and
crippled the bot; Chromium's Canvas renderer (`--disable-gpu`) held 60fps with
three browsers in parallel. Record with Canvas.

### Not done / not verified

- Missing from the 63-race minimum (all forfeits at the 12-minute limit):
  two Ace on Switchyard Seven, two Hustler on Blacktop Crown, one Hustler
  each on Copper Climb / Afterglow Mile, one Street on Switchyard Seven.
  Re-run those jobs (or raise hardLimitMs) to fill in.
- Nothing has been seen rendered by a human. Headless screenshots verified:
  race HUD with AI RIVAL row, fixed-loadout confirm, result modal with WATCH
  RIVAL REPLAY, the replay overlay (arena, duffels, sprites, clock, house
  strip, EXIT/NEXT) and the intact result after exit.
- Play-mode bot race against the bank: win in 2:33 with 11 retries vs the
  4:59 Street recording; replay opened and closed with the result unchanged.
- Not run: the handoff's device checks (background return, 280x480 layout,
  Run the Block resume, Rematch/New Race by hand, storage isolation review).
  Rivals code writes only `pr_rivals_results_v1_<user>` and reads it.
- Not built, by instruction: uploads, human recordings, a Rivals leaderboard.

## Product decision

The title menu is now:

1. Run the Block
2. Block Rivals
3. Tutorial
4. Settings

Run the Block is the persistent city game. Fifteen first-time stash clears
finish a named block and unlock the next block. REP is competitive scoring,
not the city unlock currency.

Block Rivals is a short asynchronous race:

- one opening two-charge loadout;
- seven deterministic houses;
- the same seven houses and rules for player and opponent;
- race clock continues through fast transitions and retries;
- two segmented progress bars; no synchronized opponent sprite during play;
- first seven-house finish wins;
- after the race, the player can watch the opponent's recorded run, especially
  to understand how they were beaten.

The first opponent population should be honest bot-driver recordings. Do not
label them as live players or silently fabricate human identities. Later, the
same record format can accept compatible real-player runs.

## What exists now

Commit `de35c37` contains a playable prototype:

- `logic/rivals.js`: pure seven-house course/timing/outcome/record rules.
- `utils/rivalSession.js`: creates a random course and a fixed simulated pace
  from generated-maze path distances; saves a bounded local result history.
- `controllers/RivalsRace.js`: one loadout, countdown, HUD, race clock,
  quick next-house/retry restart, result modal and rematch.
- `BaseGameScene`: `runKind === 'rivals'`, seeded house generation,
  top-HUD arena reservation, seeded defender decisions and Rivals-only
  pixel-to-cell balance scaling.
- `ProgressionManager`: Rivals exits before Daily/Journey rewards, saves,
  activity feed and leaderboards.
- Tests: 466 pre-existing assertions + 67 Rival rules + 41 adapter-flow
  assertions = 574 in the adapted V8 harness.

The current opponent is deliberately labeled **Simulated AI pace**. It is not a
combat-bot replay. The fixed progress timestamps are based on path length and
hesitation and do not rubber-band. In a 100-course sample the target finishes
were 1:09–1:44, mean 1:21. Those are generated targets, not human measurements.

## The next assignment

Replace the temporary generated pace opponent with a curated bank of actual
BotDriver seven-house race recordings, and add **Watch Rival Replay** to the
result screen.

Do this in phases so a bad recording cannot break the playable race.

### Phase 1: freeze a seven-course pool

A “course” means one complete race containing seven houses. It does not mean
seven alternate seeds for one house.

Add an import-free manifest in `logic/` and tests. Recommended fixed v1 pool:

| slot | name | root seed | current course ID |
|---:|---|---:|---|
| 1 | Low End Rush | 2722422571 | rivals-v1-2722422571 |
| 2 | Copper Climb | 2917822448 | rivals-v1-2917822448 |
| 3 | Freight Run | 1245351574 | rivals-v1-1245351574 |
| 4 | Afterglow Mile | 2476136539 | rivals-v1-2476136539 |
| 5 | Switchyard Seven | 2143714553 | rivals-v1-2143714553 |
| 6 | Lastlight Loop | 2077357177 | rivals-v1-2077357177 |
| 7 | Blacktop Crown | 2334749748 | rivals-v1-2334749748 |

These seeds were derived from
`rivalHash('plug-run/rivals/course-pool/v1/' + slug)`; put that derivation in
a test so the numbers cannot drift silently.

Each manifest entry should contain at least:

```js
{
  slot, name, seed, courseID,
  rulesVersion: RIVAL_RULES_VERSION,
  enabled: true
}
```

Use the manifest for New Race/course selection instead of
`Math.random()`. Rematch keeps the same slot. Decide explicitly whether New
Race rotates to the next slot or offers a course picker; either is acceptable,
but it must be deterministic and tested. Do not reuse Daily seed arithmetic.

Before recording, run all seven courses through map generation and assert:

- exactly seven 16x35 houses per course;
- every house is reachable runner -> both stash pockets -> driveway;
- identical root seed reproduces identical grids, spawns, objectives, egress,
  real/bunk choice and defender weapon;
- no duplicate house seed inside the pool;
- no rules/version mismatch.

Bump `RIVAL_RULES_VERSION` whenever maze generation, combat balance, loadout,
stash assignment, transitions or race timing changes. A version mismatch must
make an old opponent ineligible rather than “close enough.”

### Phase 2: define the recording contract before running bots

Keep two artifacts separate.

#### A. RivalRunRecord — authoritative race comparison

This is small and determines the progress bar and winner:

```js
{
  schemaVersion: 1,
  rulesVersion: 'rivals-v2',        // whatever the recording build uses
  courseID,
  courseSlot,
  courseSeeds: [/* exactly 7 */],
  opponent: {
    id, displayName, kind: 'bot',
    driverVersion, skillPreset
  },
  orderedPowers: ['phase', 'dash'],
  attempts: [
    // every success and retry in chronological order
    { house: 1, attempt: 1, startedMs, endedMs, outcome, clearMs: null },
    { house: 1, attempt: 2, startedMs, endedMs, outcome: 'extracted', clearMs },
    // ...
  ],
  clearTimes: [/* 7 strictly increasing race-clock timestamps */],
  elapsedMs: clearTimes[6],
  retries,
  recordingID,
  payloadHash
}
```

The seven clear timestamps—not replay frame duration—drive opponent progress
and race outcome. Validate all fields. Client-side validation is corruption
checking, not anti-cheat; keep `verified: false` until a trusted build/server
signs records.

#### B. RivalReplayBundle — portable spectator data

This exists only for “Watch Rival Replay”:

```js
{
  schemaVersion: 1,
  recordingID,
  rulesVersion,
  courseID,
  segments: [
    // one segment for every attempt, including deaths/timeouts
    { house, attempt, startedMs, durationMs, outcome, replay: /* portable */ }
  ]
}
```

The result screen should still work if this bundle is missing or corrupt.
A timing record can be eligible without replay only as an explicit fallback;
prefer selecting an opponent with both artifacts.

### Critical replay warning

`controllers/ReplaySystem.js` cannot simply be JSON-stringified and shipped:

- it stores only one `lastReplay`, so each new house replaces the previous;
- it caps a segment around 45 seconds;
- keyframes use `Map` objects;
- baked graphics use runtime texture keys and a live Phaser texture manager;
- `getMeta()` only exposes role/round/cell;
- there is no export/import API for a portable seven-house bundle.

Do not pretend the existing “Watch Replay” button solves this. Extend it
deliberately.

Recommended first implementation:

1. Add a portable per-attempt export immediately after `ReplaySystem.finalize()`
   and before the next restart.
2. Store seven-house attempts in the race recorder, not the global single
   `lastReplay` slot.
3. Regenerate the static arena from the course/house seed during playback.
4. Record only portable dynamic state at ~15Hz: runner and defender transforms,
   active stash/carry state, bullets, power/decoy events, car/extraction state,
   sounds and attempt outcome. Use semantic object kinds/IDs, not live Phaser
   object references or baked texture keys.
5. Playback concatenates attempt segments with short HOUSE N / RETRY cards.
6. Add `ReplaySystem.playPortableRace(scene,bundle,{onDone})` or a dedicated
   `RivalReplayPlayer`; do not overload `play()` with ambiguous object shapes.
7. Test missing assets, malformed frames, old rules versions, retries,
   segments longer than 45 seconds, and cleanup when the player exits midway.

An intent-trace-only replay is attractive but risky today. BotDriver records
human-path input events, yet game combat is still frame-stepped and not
deterministic lockstep across machines. Seeded Rivals decisions help, but input
resimulation can still diverge. Use intent traces as audit/debug data, not the
only player-facing replay, unless a cross-frame-rate reproduction test proves
the final clear times and outcomes match.

Pre-rendered video is a possible temporary fallback, but it is much larger,
harder to generate reliably in browsers and less reusable for future human
ghosts. Prefer portable dynamic-state segments.

### Phase 3: make BotDriver record real seven-house races

Existing harness entry:

```
?bot=1&aiLevel=20&sweepFrom=1&sweepTo=15&mapsPerRound=5
```

Existing helpers:

```js
__plugRunSummary()
__plugRunDownload()       // includes intent traces by default
__plugRunDownload(false)
__plugRunReset()
```

The current installer is written for Daily/sweep rounds. Its modal auto-clicker
takes the first actionable button and explicitly skips replay buttons. Do not
point it at Rivals and assume the export is valid. Add a dedicated recording
mode, for example:

```
?rivalsRecord=1&courseSlot=1&skillPreset=bronze&powers=phase,dash&runs=10
```

Recording mode should:

- enter `runKind: 'rivals'` directly;
- select the requested fixed course and ordered power pair;
- use the same Rivals timing, quick transitions and retry rules as a player;
- preserve one race ID across all seven houses;
- collect every failed attempt and successful clear;
- stop only after seven clears or a hard race timeout;
- export RivalRunRecord + RivalReplayBundle + intent traces + config;
- never auto-click Watch Replay during batch capture;
- clearly report incomplete/invalid races rather than including them.

Do not let BotDriver cheat on the real/bunk choice. Its current objective logic
deliberately cannot inspect which visually identical stash is real before
pickup; preserve that.

For the first bank, record multiple opponents per course and pace tier. Avoid
one magically perfect bot. Suggested initial minimum:

- 7 fixed courses;
- 3 honest skill presets (e.g. Street, Hustler, Ace);
- 3 valid complete recordings per course/preset;
- total minimum: 63 full races.

Power fairness needs an explicit decision:

- **Recommended for first shipping bank:** each course/preset declares one
  fixed ordered loadout and the player receives that same loadout. This keeps
  the first bank small and the comparison legible.
- If player-selected powers remain, record compatible opponents for all nine
  ordered two-power combinations (duplicates included). That is 7 courses x
  9 loadouts x 3 tiers x at least 3 recordings = 567 full races.

Do not use the current `compatibleRivalRecord()` exact-power check and then
silently fall back to an incompatible recording. Either supply a matching bank
or deliberately change and document the fairness rule.

Store curated assets initially as static versioned JSON under something like:

```
client/public/rivals/v2/manifest.json
client/public/rivals/v2/courses/<courseID>/opponents.json
client/public/rivals/v2/replays/<recordingID>.json
```

Keep one small manifest loaded up front; fetch the selected replay bundle only
when Watch Rival Replay is pressed. Validate sizes and reject oversized or
malformed payloads. Vite/Netlify will serve these without a new backend.

### Phase 4: opponent selection and results UX

At race creation:

1. choose one enabled course from the fixed pool;
2. filter records by rules version, course ID, course seeds and fairness rule;
3. filter by requested pace tier;
4. choose deterministically enough that Rematch keeps the same opponent;
5. write the selected `recordingID` into race state;
6. drive the opponent bar from that record's seven clear timestamps.

During the race retain the current low-sync presentation:

- YOU and opponent-name segmented bars;
- exact race clock;
- optional status words such as SEARCHING / STASH / ESCAPED only if they come
  from recorded events, never inferred to look dramatic;
- no opponent character in the player's live house.

Result modal:

- WIN/LOSS/DRAW, player time, rival time, retries;
- **WATCH RIVAL REPLAY** when the bundle exists;
- replay opens without destroying the result state;
- replay can be exited and returns to the result modal;
- label bot opponents as BOT or AI RIVAL;
- Rematch preserves course + opponent; New Race chooses through pool policy.

“Watch how I got beat” should play the rival's entire race by default, with a
simple house timeline. A useful second pass can add “Jump to decisive house”
(the first house where the opponent moved ahead), but do not make that required
for v1.

### Phase 5: real-player recordings later

The bot and human record schemas should be the same except opponent metadata.
A completed local player race already saves seven clear times in
`rivalRecord()`, but this is not enough for public matching.

Before accepting real players:

- server-side authenticated upload and immutable recording IDs;
- game/rules build hash and course manifest version;
- bounds validation on timestamps, attempts, positions and power use;
- replay payload size/rate limits;
- quarantine instead of accepting records with impossible events;
- privacy-safe display names;
- moderation/removal path;
- never call an asynchronous replay race “live PvP.”

## Current isolation requirements

Rivals must continue to avoid:

- Daily route/session writes;
- Journey block/stash progression;
- Daily and all-time leaderboard submissions until a Rivals leaderboard is
  intentionally designed;
- activity feed success events;
- accumulated user stash/REP mutation;
- inventory stakes.

A missing opponent manifest or replay fetch must produce a playable, honest
fallback: either the current **Simulated AI pace** label or an unavailable
message. Never disguise simulation as a recorded rival.

## Verification required

Pure logic belongs in `client/src/logic/` with no imports and headless tests.
Keep every existing assertion green.

Run from `client/`:

```powershell
npm run verify
```

Then manually verify:

1. all seven fixed courses start and reproduce on Rematch;
2. bot recorder completes and exports a race with retries;
3. record timestamps equal the live opponent progress transitions;
4. result appears if replay fetch fails;
5. Watch Rival Replay plays all attempts/houses and returns to results;
6. opponent replay never mutates the live player's result;
7. backgrounding does not pause the race clock;
8. mobile 280x480-ish layout retains HUD and playable arena;
9. Run the Block resume is unchanged;
10. no Daily/Journey/leaderboard/storage leakage.

The prior Codex environment could not launch Windows processes because Carbon
Black blocked the sandbox. The user explicitly requested no sandbox attempts
until whitelisting is available. The 574-assertion claim was from an adapted
in-memory V8 harness, not native npm/Vite/browser execution. Do not overstate it.

## Suggested commit sequence

1. Freeze fixed seven-course manifest + reachability/determinism tests.
2. Define/validate RivalRunRecord and RivalReplayBundle schemas.
3. Add portable single-attempt ReplaySystem export/import.
4. Aggregate race attempts and build full-race playback.
5. Add dedicated Rivals BotDriver recording/export mode.
6. Record, inspect and curate the first opponent bank.
7. Replace simulated opponent selection and add Watch Rival Replay.
8. Only then consider uploads and real-player ghosts.

Each commit message should explain why, what was measured, and what remains
unverified. Match the prose style in `git log`.
