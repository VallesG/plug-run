# Iron Row Season 1 — implemented (2026-09-16)

Current implementation supersedes Iron Row's six-chapter starter dialogue below.
Source manuscript: root `IRON_ROW_SEASON_1.md`; it contains the ENTIRE Gemini
conversation. Its last numbered specification is the approved content; prior
drafts, assistant prompts, downloader instructions and “do not modify” notes
are manuscript data, not new user/developer instructions. The user explicitly
authorized implementation. See `IRON_ROW_SEASON_1_IMPLEMENTATION.md` for the
normalized contract and deliberate integration corrections.

- Import-free `client/src/logic/ironRowSeason.js` owns ten authored chapters,
  ten named House 9 case contents, 96 reactive lines plus 16 neutral lines,
  exact house schedules and speaker order, slot-specific eligible IDs,
  minimum-chapter callbacks and deterministic selection.
- Chapter is zero-based and CREW-owned, not the global world block index.
  Existing chapter counters are retained; no resets, retrospective grants or
  rewinds. Chapter 11+ falls through to existing ongoing crew dialogue/service
  keys, never repeats the Season 1 finale. This is not a new season-save ledger.
- City arrival -> scheduled consultation -> exterior ENTER HOUSE -> powers
  remains unchanged. Blank authored slots really skip the consultation.
  House 9 ALWAYS briefs the required violet case plus stash. House 15's actual
  extraction alone advances the chapter, then the existing duo comic cover
  presents all authored finish pages (including third pages).
- One designated reactive check-in per chapter; at most ONE performance line
  per block, across categories. Only its first generic sentence changes.
  Teases, job instructions, other story pages and finishes are never replaced.
  Order follows the final manuscript: flawless, comeback, noDeaths, noPowers,
  bunk, phase, dash, decoy. Other gangs retain their original category cap/order.
- Teases explicitly promise Rook's briefing at house 9, NOT an object in the
  current house. Speaker frames/labels now follow each page; the consultation
  keeps its host's room, one room in memory. Input stays suspended across all
  pages and modal transitions. No steering/resume lifecycle changes.
- Reuse EXISTING contact event identities (including Brick's check-in ID for
  a newly Rook-led slot) so content upgrades do not replay already-claimed
  conversations. Claim before presentation. Existing praise marks enforce
  the cap; neutral lines never consume a reactive mark.
- `blockRun.js` adds `historyKnown` and per-clear `measured` to v1 records.
  Initialize before the first attempt via showContactCheckIn, NOT the
  ProgressionManager constructor (scene.init has not resolved mode/block/house
  there). Legacy/incomplete/corrupt history stays neutral until a fresh block.
  Clears/progression survive. Contiguous measured coverage must match the
  immediate pre-house checkpoint; unknown hits/bunk/power arrays are NOT zero.
  Corrupted counters, duplicates, invalid houses and gaps invalidate praise.
- Fix the existing debrief bug: mission-win/miss dialogue no longer marks an
  unrelated earned praise as spoken. Successful-clear power/hit statements
  are explicitly scoped; deaths are block-wide. Bunk telemetry counts
  successful clears with a bunk pickup, a conservative lower bound on touches.
  Power habit is >=2 activations and a strict lead, ties earn neither.
- Pickups keep the same mechanical key-foley plan, seeded cell, violet box/ring
  and mandatory extraction guard. Job toast/reminder names match the chapter.
  There is NO new detailed item SVG or per-prop synthesized sound in this pass.
  Maze/collision/RNG, race bank/rules/timing, REP/Cash and shared standings stay
  unchanged. Chapter titles do not rename permanent procedural world blocks.
  Use actual city labels; never assume joining Iron Row occurs at world block 1
  or completing its chapter 10 unlocks a city. Finish celebrates the garage's
  150-stash crew ledger, not unearned city-wide ownership/ferry access.
- Dev-only `/contact-preview.html`: chapters 1–10, all milestone houses, eight
  performance conditions, silent slots, duo finishes, full 112-line bank and
  three viewport sizes; renders the real controller without persistence.
  Native moduleSyntax now includes its inline module. Root preview requires
  Vite dev, not a claim of inclusion in the production dist.

Verification boundary: Carbon Black restriction respected; NO local sandbox or
process attempts. Before edits, 40 existing suites passed adapted V8 execution;
after, those same 40 plus the new season suite passed. Separately ran the
unchanged rivalBank test against all 63 actual JSON files: 402 assertions / 55
recordings. Thus 41 existing adapted suites before, 42 adapted suites after.
Key final counts: 1,543 season, 465 actual manager/contact flow, 47 real panel,
30 blockRun, 993 contacts, 4,343 unchanged story, 568 unchanged mission placement,
62 real mission exit/pickup, 242 touch lifecycle. Binding-aware adapted parses
of changed runtime modules and preview passed. These are NOT native npm/ESM,
Vite or visual browser proof. contactArt binary-header validation and native
moduleSyntax require an allowed local environment. Native `npm run verify`
before/after, build, actual Phaser appearance/audio, Safari steering after later
consultations, long dialogue pages and final cover still require review.
Never claim the full native suite is green from this harness.

Next: run `npm run verify` in client where allowed; review contact-preview,
fresh Iron Row block and later Rook-led pages, mandatory chapter-specific case,
retry/resume and chapter-10 completion. Author Crossline/Afterlight Season 1
separately; do not copy their existing drafts into runtime by accident. Cash
and bonus REP remain blocked by Window ledger retention/migration work.
Work only on claude/input-intent-layer. Master deploys live and is untouched.


# Plug Run — handoff for a new agent

## Automatic GPS-style city arrival — Codex (2026-09-16)

This supersedes the user-controlled serpentine city overview below. The user
rejected its level-ladder look: city geography must look like the existing
overhead street and zoom automatically, not offer another navigation menu.

Fresh Journey block house 1 -> city overview -> neighborhood zoom -> actual
exterior block -> scheduled crew consultation -> entrance -> powers.
The approximately 2.75-second intro is autonomous: no CITY/VIEW/previous-city
buttons, parcel taps, panning or selectable districts. Normal resumes, retries,
partial legacy saves and scene resizes skip it. House 15 retains the duo
celebration, then the fully revealed block/result with replay and next-block
actions; starting that next block plays its own arrival. Ten blocks/150 stashes
per city, permanent global seeds, frozen crew ownership and progression stay
unchanged. Rival Turf/server accounting is still not implemented.

CityMap now renders a two-dimensional road network with waterfront, rail
corridor, parks and small exterior roofs, not ten cards connected in unlock
order. Every parcel embeds drawBlockMap with that global worldBlock's seed:
the camera zooms the SAME geometry through overview/neighborhood/block scales,
without fading the map away. Floors/interiors are never shown. Claimed blocks
carry personal crew colors; unexplored parcels are dark. Embedded rendering
opts out of labels/caption, uses cheaper ground for distant parcels, and never
changes normal block renderer defaults.

pr_city_v1_<user> gains monotonic introThrough. startCityIntro claims before
showing; duplicate calls do not write or replay. Existing partial checkpoint
house >1 infers that block already seen; historical completed blocks imply seen
but NEVER invent owners. Denied-storage fallback remains account-isolated and
session-only. No reset button or query changes real player progression.

Cinematic owns an opaque input blocker, containers, timers and tweens. Shutdown
cancels without invoking the next screen; normal completion cleans before
consultation. Keyboard/world/touch stay suspended across the handoff. Rendering
construction errors clean up and continue to consultation. Base init determines
eligibility only after adopting the real saved house/retry checkpoint; obsolete
showCityMap flags cannot force a replay. Resizing a completed Journey result
adopts the next checkpoint only with persisted completion proof; death at house
15 stays at that house.

city-map-preview.html is a no-save review surface: choose 280x480, 390x844 or
1440x900 and arrivals at blocks 1/7/11/24, then Review. It automatically zooms
and lands on the same exterior; its review controls do not exist in gameplay.

Validation: prior city suites passed 1,674 adapted assertions before edits.
After edits: 1,465 city, 271 storage, 77 actual renderer/GameUI/manager, 28 actual
Base init/resize, 30 unchanged block geometry, 71 contacts flow, 62 mission exit and
242 touch lifecycle = 2,246 targeted adapted V8 assertions. These prove callback
ordering, once-only persistence, actual embedded renderer execution, no fade,
shutdown/error cleanup, viewport fitting, account isolation, unchanged ownership
and mission/touch behavior. Native npm run verify, native ESM/.mjs, Vite and the
untouched 55-record rivalBank were NOT run: user prohibits sandbox/process use
under Carbon Black. Actual Phaser pixels, zoom smoothness/performance, text and
phone/desktop appearance require allowed local verification and visual review.
No master, rival recording, gameplay RNG, currency or reward edits.


## Personal city map above the block loop — Codex (2026-09-16)

Run the Block now groups permanent global block indices into ten-block cities:
10 blocks x 15 houses = 150 stashes. REP does not unlock cities. City grouping
is permanent v1 presentation/progression identity; do not change CITY_BLOCKS
in-place after shipping without migrating city identities. World block/house
seed formulas and the Journey checkpoint shape are untouched.

Flow: menu/resume -> city -> 380ms district focus -> scheduled crew consultation
-> existing exterior street -> ENTER HOUSE -> powers. Normal house/retry
restarts omit the city; the street has a CITY inspection action. House 15's
approved duo celebration -> city pull-back/new claim -> next block. Block 10
shows 150/150 and NEW CITY UNLOCKED, then the next city before block 11.
The latest completion city replaces Journey's old fully-lit street result.
WATCH LAST HOUSE still returns to the intact city; daily result is unchanged.
Older cities are viewable, not selectable for replaying old gameplay/checkpoints.

Import-free logic/city.js owns permanent city identity, ten-node connected
layout, stash progress, migration, entry eligibility and claims. CityMap.js
draws exterior neighborhoods/roads/lights/fog/crew flags in the existing night
grammar; no floor plans or raster downloads. Tiny labels use CL/IR/AL with a
legend. city-map-preview.html at the client root reviews actual GameUI + city
renderer at 280x480, 390x844 and 1440x900, including mixed claims and legacy
saves; dev-only, no saves. Native moduleSyntax checks this preview too.

Personal ownership writes only pr_city_v1_<user>, version 1:
completedThrough (monotonic), owners (nontruncated block -> gang), active
(frozen block crew). startCityBlock freezes the crew on entry; consultations,
mission selection, story finish and claim use that scene snapshot. Switching
gangs is still not enabled: any future switch must also use that snapshot for
cosmetics/UI. The final extraction save seam claims a block only for runner/
pve/Journey, house 15, carrying the stash, in order. Duplicate or skipped claims
cannot change ownership; taps, partial clears, deaths, Rivals and Tutorial do
not claim. No new currency, REP reward, leaderboard or shared gang total.

Legacy checkpoint block N proves prior N-1 clears, NOT their gang: migrated
territory is neutral/unknown. No invented retrospective ownership or story
grants. Account-isolated in-memory fallback preserves claims during denied
storage this session only; a reload cannot recover unsaved writes. The separate
Journey/City keys are not a cross-key transaction: checkpoint migration can
recover a clear without ownership if territory persistence is lost. Claims/
owners are personal device data, not trusted/server scoring. Ownership history
is not a 200-entry ledger and grows with completed blocks.

City modals keep world/keyboard/touch paused, retain GameUI's input grace, and
cancel the touch rebind on teardown before the next consultation/entrance.
City resize requests the same map; resizing the completed-city result adopts
the already-earned next checkpoint rather than replaying house 15. Zoom and
claim-flare tweens are bounded and killed on map teardown.

Measured in adapted V8: 1333 city, 267 real storage-adapter, 62 manager/GameUI/
renderer lifecycle, 12 actual Base init, 63 unchanged world, 993 contacts,
4343 story, 71 contact-flow, 42 panel, 242 mobile steering and 62 mission-exit
assertions: 7490 targeted assertions. 250 sequential claims retain the first
owner after the old 200-entry threshold, JSON/account/denial cases pass, seeded
global identity stays intact, and city entry/finish/boundary/watch/browse paths
pass. Negative controls reject pre-city manager and scene init.
Five adapted source import/binding parses plus preview parse pass.

UNVERIFIED: native npm run verify/.mjs/Vite, other suites including the untouched
55-record rivalBank, actual Phaser font/touch/cartography/zoom/occlusion and
phone/desktop visual review. No sandbox/process attempts under Carbon Black.
Run verify in an allowed environment, inspect the preview, then manually test
menu resume, CITY/back, normal house 2, later POC steering, complete block and
resize result, city-10 unlock and watch return. No master or bank edits.
Shared live Rival Turf is deliberately NOT built: it needs server win
accounting/duplicate protection, not fabricated client standings.


## Iron Row gameplay palette — industrial olive (2026-09-16)

Iron Row's rust/red starter colors competed with the red Plug. Its runner now
uses olive #67734c and safety-yellow #d2c66a; getaway paint is dark olive
#596744 with cream #eee3c5 stripes. Brick/crew UI uses the same yellow and
Rook uses pale olive #a7b58a. Existing UI/contact/celebration renderers consume
these definitions, so no per-screen tint patches are needed.

Iron Row generated texture keys are v2; other crews keep v1. Source pixel
selection, shading/alpha preservation, cyan runner ring and red defender stay
unchanged. Portrait/room WebPs are deliberately unchanged: Brick's painted
rust wardrobe is not the tiny gameplay silhouette. A future wardrobe art pass
must edit only the clothing, not tint skin or the whole shared cast atlas.
Do not put source PNGs back in public/.

Measured: 57 gang-skin, 61 Window and 993 contact assertions passed in adapted
V8 (1111 total), including UI/skin consistency, cache revision and shaded
olive/yellow/cream samples. Native npm run verify, ESM/Vite resolution, actual
source-pixel coverage and phone/desktop appearance are unverified. No sandbox
process attempts, simulation/RNG/storage/reward changes or Rivals bank edits.
Review with /gang-skins-preview.html and /?skin=iron-row (review override only).
Master is untouched.


## Crew job items are mandatory at the house exit — Codex (2026-09-16)

Latest user decision supersedes ALL optional-job/story wording below:
the briefed object must be picked up WITH the stash before that house can
finish. It is vital to the crew story, not an optional bonus pickup.

- Journey job house (currently 9) requires both pickups. The authoritative
  extraction guard runs before roundOver, replay finalization, stash/REP,
  checkpoints or story writes. Item-only, stash-only and bunk-only cannot
  clear the job house. No new reward or second stash is introduced.
- The scene also checks readiness at the car WITHOUT returning early when
  denied: combat/forensics/unstuck/melee later in the frame must still run.
  Never use an unconditional return from a rejected extraction check.
- A quiet violet-case reminder is throttled, not a blocking modal. The
  car beacon waits until the player has both pickups.
- `requiresMissionItem` and the object are set BEFORE placement so a missing
  render cannot waive the requirement. Normal seeded placement is unchanged.
  A valid tiny room falls back to its reachable spawn cell rather than
  becoming unwinnable; an invalid/non-floor spawn still returns null honestly.
- Death/retry resets the item; placement stays deterministic. Paused contact/
  entrance/loadout screens cannot collect an item.
- Keep the compact code-drawn violet case/ring on the floor, no detailed SVG
  prop. Pickup fades the case, pulses violet, names the collected item and
  plays stylized item foley: key rattle, marker cap click or tube tap.
  Sound is supplemental, never the only confirmation. Foley uses small
  deterministic oscillator plans, no downloaded samples or extra served
  raster assets. It respects SFX mute/master/SFX volume, cleans audio nodes,
  debounces and falls back to the existing pickup sound without WebAudio.
  These are synthesized approximations, not recorded real-item samples.
- Crew dialogue says stash/bag, never real stash/bag. Briefings require both
  pickups and no longer suggest leaving the job object behind.
- The duo finish cover gets five short deterministic comic glints per page.
  They are tracked/killed with the panel, not an unbounded particle effect.
- Existing checkpoints already past the job house are not rewound or invalidated.
  Historical missed-item records remain readable; fresh gated job clears
  cannot produce a missed-item outcome. Chapters still advance on the final
  house; new plays necessarily passed the mandatory job-house gate first.

Import-free `logic/missionItem.js` owns exit eligibility, required placement
fallback and item sound plans. Runtime wiring is in BaseGameScene,
ProgressionManager and AudioManager; celebration rendering is ContactPanel.
New `test/missionExit.test.mjs` and `test/missionFoley.test.mjs` are registered
in npm test. Placement, story-vocabulary and cover lifecycle tests extended.

### Proof and remaining verification

Adapted V8: 568 placement assertions (sixty seeded houses proved unchanged),
62 exit/real-pickup/frame assertions, 32 foley/settings assertions,
993 contacts, 4343 story, 71 flow, 42 panel, 242 steering and 16 storage:
6369 targeted assertions. Old extraction code fails by starting before the
item is collected; old update code fails the continued-frame check.
Seven adapted import/binding parses passed.

No sandbox/process attempts. Native npm run verify, .mjs resolution, Vite/
full regression, actual phone pickup/audio/locked-car combat and sparkles
remain UNVERIFIED. Run verify where allowed, including rivalBank.test.mjs.
Phone review: job house 9, each item pickup, wait at car without item, death/
retry, after-check-in steering, complete all fifteen houses and duo flare.
No maze/RNG/collision, race rules/timing, bank, Cash or bonus REP changes.
Master and the 55-record Rivals bank are untouched.

## Contact-to-house touch steering regression — fixed (2026-09-16)

The human reported a runner that could not steer after later contact/praise
panels. Reproduced with the actual PlayerController and scene touch lifecycle:
a gesture claimed finger 42, a modal removed listeners before release, then
rebind reset only the scene's legacy swipe fields. The controller still held
42, so new fingers were rejected and their releases could not clear it.
The display-list contact backstop also did not stop Safari's raw DOM fallback.

Fix on `claude/input-intent-layer`:
- `PlayerController.resetTouchGestures()` clears controller finger/origin,
  aim/drag flags and double-tap history, without changing movement/drift,
  spending powers, firing or touching progression.
- `BaseGameScene.destroyTouchUI()` calls that reset BEFORE its early return;
  `makeMobileControls()` already goes through destroy, so every rebind starts
  clean even if listeners have already vanished.
- begin/update ignore paused or ended rounds. End ignores unrelated pointer
  releases and cancels pointerless/paused gestures without gameplay effects.
  Phaser and raw DOM identifiers are not interchangeable.
- ContactPanel pauses the world, disables keyboard and suspends touch before
  displaying dialogue. Page turns stay suspended. Close does NOT resume
  controls: the entrance/loadout/startMatch chain owns resuming, avoiding
  new listeners being installed mid-release before the next modal opens.

`test/mobileInputLifecycle.test.mjs` uses the actual controller, actual scene
touch methods and actual contact renderer against a small display-list stub.
242 adapted assertions cover lost releases, no-handler reset, all three crews
and six beats, queued events, page turns, contact -> map -> loadout -> steering,
no listener accumulation, DOM fallback, mixed transport IDs, cancellation and
normal double taps. Registered in npm test.

Negative controls: the original lost-release fixture fails against old code;
keeping the old ContactPanel with the fixed touch lifecycle also fails its
input-suspension assertion. Both pass with all fixes.
Existing 993 contact, 4320 story, 71 flow, 39 panel and 16 storage assertions
still pass: 5681 targeted adapted assertions including the new suite.
Three adapted import/binding parses passed.
No sandbox/process attempts. Native `npm run verify`, native .mjs resolution,
Vite/full regression and a real phone run were NOT performed. Run verify in
an allowed environment and review mobile house 4/7/9/10/13 after dialogue.
No bank records, maze, race timing/rules, rewards or story progress changed;
master and the 55-record Rivals bank remain untouched.

## Crew story chapters and completion curtain call — Codex (2026-09-16)

This section supersedes the older sequencing/content notes below. Work is on
`claude/input-intent-layer` only; master and the 55-record Rivals bank are untouched.

- The contact now speaks BEFORE the exterior entrance map, including house 1:
  consultation -> street view -> ENTER HOUSE -> existing loadout.
- Three separate six-chapter arcs: Crossline rebuilds a street network; Iron Row
  gets the garage working; Afterlight puts a night event together. Further
  blocks get numbered continuation dialogue, not a reset to chapter one.
- Every chapter requires a complete 15-real-stash Journey block. Only the
  successful final-house extraction calls `finishCrewStory`; panel taps, pickup
  alone, deaths, partial blocks, Rivals, Tutorial and replay never advance it.
  Ordered Journey checkpoints prove the previous houses, so legacy resumes
  do not depend on optional per-house contact statistics being present.
- Chapters are independent per gang, local/account-scoped, and stored inside
  the existing `pr_contacts_v1_<user>` record as `stories[gangID]` with
  `{chapter,lastBlock}`. Old v1 records migrate to no story completions.
  Monotonic block watermarks survive two-block dialogue-history pruning;
  never turn them into a truncated event ledger. No retrospective chapter
  grants for historical blocks. Future gang switching must freeze block crew
  ownership before it is enabled.
- Opening consultations have context + goal; secondaries have chapter-specific
  briefings. Measured praise and the mission instruction remain intact.
  Optional object failure never blocks a chapter: all fifteen real bags do.
- A crew-specific paired comic cover appears on block finish, with both approved
  portraits, live chapter text, a lit roofline, comic spotlight rays and 15/15.
  Both contacts speak, then the existing fully lit block/result and next-block/
  replay/menu actions appear. This is code-native cover composition using the
  existing WebP portraits, NOT three newly generated raster illustrations.
  Switch uses the impressed expression. No source PNGs returned to public/.
- Dialogue is paginated to viewport before rendering; type is never shrunk to
  squeeze prose in. Page turns keep the one loaded room and release it only
  on final teardown. Lower-right >> and delayed input arming are preserved.
- Storage denial keeps a per-account in-memory fallback for this session;
  a reload cannot recover an unsaved write. No Cash or bonus REP is granted.
  The old Cash ledger retention hazard is still unfixed.

### Verification for THIS change, not inherited from Claude

Carbon Black restriction honored: no sandbox/process attempts. Native
`npm run verify`, .mjs checks, Vite and actual browser rendering were NOT run.
Adapted in-memory V8 baseline: 993 contact + 53 flow assertions.
After changes: 993 contact + 4320 story + 71 flow + 39 panel-lifecycle +
16 storage assertions (5439 total); six adapted import/binding checks.
These are not native ESM resolution or a full regression.
New suites are registered in `client/package.json` and must run in the next
execution-enabled environment, including unchanged `test/rivalBank.test.mjs`.

Phone review still required: two-character proportions, chapter heading wrap,
comic cover, pagination/font estimates, and finish -> result -> next-block flow.
Carry the special object out manually as well; this task did not prove that.
New story progress is device-local, not trusted/server/shared crew accounting.

## Gang contacts in Run the Block — implemented (2026-09-16)

Four slices on `claude/input-intent-layer`, pushed, ending at `7eee8fc`.
`npm run verify` is green **natively** — this container allows execution, so
these are real npm/Vite runs, not adapted-harness claims. Last run: 30
block-run, 508 mission-item, 993 contact, 53 contact-flow, 136 contact-art
assertions, every prior suite, an 89-file ES-module check and the Vite build.
The 55-record Rivals bank is untouched at 402.

### What a block feels like now

House 1 the primary asks for the job and points past it. Houses 4, 10 and 13
they react to how the run has actually gone. House 7 they tease the job
contact; house 9 that contact briefs an object, and the object is on the floor
of that house under a violet ring. House 10's debrief reports whether it came
out. Everything else is silent, and Rivals, Tutorial, the legacy daily route,
the bot harness and the shelved plug role fall straight through — asserted.

### Art is shippable; do not undo this

Runtime art is WebP; PNG originals live in `client/art-sources/the-window/`,
outside the served tree. Six backdrops 15.4MB -> 892KB, props 2.2MB -> 249KB,
the four Window rasters 8.6MB -> 1.15MB at identical dimensions with alpha
intact. `dist` went 69MB -> 37MB, because everything under `public/` —
including the archived concept sheets — was being deployed to players.
**Never put source rasters back under `public/`.**

### The modules

| file | role |
|---|---|
| `logic/contacts.js` | six dossiers, the six beats, praise selection, panel geometry. Import-free. |
| `logic/contactProgress.js` | which beats and which compliments a block has already used |
| `logic/blockRun.js` | how the current block has gone: hits, deaths, powers, bunk bags, swaps, mission outcome |
| `logic/missionItem.js` | where the job object goes, its colour, and what counts as success |
| `controllers/ContactPanel.js` | renders one cue in Auntie Ro's grammar; loads one room at a time |
| `utils/contactProgress.js` / `utils/blockRunProgress.js` | their own storage keys, separate from journey |
| `contact-preview.html` | client root, dev only: every gang, every beat, three viewports |

### Rules that must keep holding

- **A contact may only say true things.** Praise variants are chosen from what
  `blockRun` measured. Nothing fires on absent data: a block with no cleared
  houses earns no compliment, and `flawless` is computed from the houses
  themselves rather than a flag a restart could drop.
- **No randomness anywhere in the dialogue.** Milestone lines are indexed by
  the beat; a hash made house 13 congratulate the player for three houses.
- **A variant is spoken once per block.** The spoken key is persisted beside
  the beat under a `praise:` prefix in the same record, so a reload cannot
  repeat it. Written the obvious way, a clean run got the identical sentence
  at houses 4, 10 and 13.
- **A beat is claimed before it is shown.** Retry, resize restart, reload and
  duplicate callbacks all enter the house in silence.
- **The mission item never touches the maze.** Placement is a read-only pass
  over the finished grid from its own seed domain, so a house plays
  identically with or without a mission live. It never touches `hasStash`,
  the carried bag or the stash count — it is an extra objective, not a
  replacement. Proved on all sixty houses of four real blocks.
- **The ring is violet** (`MISSION_ITEM_COLOR`), deliberately not stash green
  and not car-beacon blue, and it is one colour for every gang so players
  learn it rather than decode it.
- **The mission outcome grants nothing.** It is recorded once when the briefed
  house clears and cannot be rewritten; it only chooses the debrief sentence.
  No REP, no Cash, no stash.
- Contacts write only `pr_contacts_v1_<user>` and `pr_blockrun_v1_<user>`.
  Losing either costs a nicer sentence, never a cleared house.

### Two bugs worth not repeating

`makeMissionItem()` was first called before the runner sprite existed, so
placement measured from cell (0,0), found nothing reachable and silently
placed no item at all — with every test still green. It now runs after the
spawn is settled and measures from `runnerSpawnCell`. Driving the real game
found it; the tests could not.

The dialogue box was first a fixed height range, which put the advance button
on top of the last line at 280x480. It is now sized from its own copy, and the
suite checks every line every contact can speak, at six viewports.

### Verified in a real browser

Crossline block 1 house 4: Switch at The Dispatch, behind the desk, advance
bottom right. A genuine reload goes straight to the loadout, no repeat. Iron
Row block 1 house 9: Rook briefs the service keys and the violet-ringed case
is on the floor beside the two green stash rings.

### Not built, and what blocks it

No REP and no Cash for the mission — that seam stays closed until the ledger
below is fixed. Nobody has carried the object out in play, so the win debrief
is proved in tests only. `CONTACT_TARGET_HOUSE` is 9 and still provisional.
The two desk-occlusion fractions (The Dispatch, The Map Room) are Codex's
starting values and want a phone review. The pickup toast and the case art
have not been judged at gameplay size on a phone.

### The Cash ledger hazard, still unfixed

`createWindowState` does `ledger.slice(-200)` and derives **both** the balance
and the duplicate guard from the survivors. Past 200 entries, old grants stop
counting and the balance silently drops, and a dropped event ID can be granted
a second time. Fix this before wiring +1 Cash — a retention/migration test
first, not a reward on top of the existing seam.

## Contact location artwork prepared (2026-09-16)

Codex has now created six portrait 1024x1536 contact backdrops and a six-object
1536x1024 RGBA job-prop sheet. They live under
client/public/art/the-window/contacts/; manifest.json and README.md explain
atlas reuse, provisional placement, foreground occlusion and optimization.
Open /contact-art-preview.html under Vite to review existing portraits over
their new locations and short sample dialogue. This review page is not gameplay.

The settings/art preparation step is now available: Claude should review,
compress/lazy-load and integrate it rather than regenerate the six rooms.
Character dossiers, full dialogue variants, final portrait positioning and
gameplay contact/mission logic remain next work. Job objects are proposed
briefing/inventory illustrations, not ready-to-use floor sprites or final jobs.

Seven source images total 18,370,368 bytes (17.52 MiB), approximately 42 MiB
decoded as RGBA together before overhead. Do not preload all of them in gameplay.
Use one contact setting at a time and optimize before production loading.
The art-contract suite adds 80 adapted metadata assertions and is registered
in npm test. Actual composite rendering, alpha edges, occlusion, asset
performance, native npm/Vite and other suites remain unverified. No gameplay
source, race bank or reward rules changed in this art pass.

## Next Claude assignment — gameplay gang contacts and Cash (2026-09-16)

Read CLAUDE_GAMEPLAY_CONTACTS_HANDOFF.md for the consolidated shipped-state
summary and the human's next direction: primary-contact check-ins every three
Run the Block houses, a secondary-job tease around house 6, then a pre-house
special-item briefing and proposed bonus REP/+1 Cash on mission success.
**Cash supersedes the name Store Credit.** It is not earned/used in gameplay yet;
existing credit-named state/helpers remain unchanged by this docs-only pass.
No contact/mission/reward code is added here. Start with character settings,
backdrops, voice and reusable short dialogue; keep Rivals free of blocking
story panels and reward changes. Exact mission target, bonus REP and repeat
policy still need decisions. Inspect the 200-entry ledger retention before
connecting recurring rewards.

## Independent Rivals powers and compact block picker (2026-09-16)

**Explicit product decision: both runners choose their own mix.** This
supersedes all fixed/matched-player-loadout recommendations below. A normal
Block Rivals match opens an editable, empty two-power picker once, before GO.
The opponent still resolves first; its real ordered mix is shown beneath the
player's slots. Those choices refill each house/retry, with no between-house
picker. Rematch keeps the recording but allows a new player mix.

`resolveRivalOpponent` no longer writes `race.fixedPowers`. Opponent powers
stay on `race.opponent.orderedPowers` and the untouched hashed bank record.
Only explicit recording/play harness powers use the fixed confirm path;
a found opponent no longer overrides that harness pair. The fairness policy is
now same course, seeds and gameplay rules, not identical power choice.
No record is altered or passed through a legacy exact-power matcher.
The bank's rules version is retained because two ordered powers, duplicates,
power effects, refill behavior, combat, seeds and race timing are unchanged:
this removes the UI/matchmaking restriction, not simulation compatibility.

Player-facing selection and tutorial vocabulary is now **powers**, not charges.
Run the Block houses 1–3 retain teaching copy; house 4 onward uses a 360px-max
compact panel with icons/names, two slots and actions, no description/subtitle
or help paragraphs. Both pickers let a user tap a slot to clear it and replace
the power. Invalid harness input falls back to an editable picker.

Measured in adapted in-memory V8: 99 race-flow/loader assertions, 75 real picker
callback assertions (all nine ordered mixes, three viewports, slot edits,
cleanup and replay return), 38 interior/layout assertions, plus 94 race rules,
68 records, 70 replay, 42 capture, 26 presets and 34 tutorial: **546 total**.
Eight edited sources pass adapted import-binding parsing. The original 89
race-flow assertions passed before edits. No bank payload or recording changed.

Native `npm run verify`, .mjs subprocess checks, Vite, all other suites and
live phone/desktop rendering were **not run**: the user's Carbon Black
process restriction still applies. Run verify locally and review the compact
picker, independent Rivals choice, retry/refill and WATCH return before deploy.

## Gang starter cosmetics (2026-09-16)

Saved gang identity now selects three runner clothing palettes and matching car
paint/center stripes. Crossline uses indigo/gold, Iron Row charcoal/rust/cream,
Afterlight violet/pale/amber. Import-free `logic/gangSkins.js` remaps only
chromatic blue fabric/paint pixels and preserves alpha, skin, ink, neutral glass
and shading. `GangSkinTextures` generates cached Canvas textures from the
existing sources; no extra download or collision/silhouette changes. Texture
cache is owned by Phaser's texture manager, not a surviving scene flag.

Live idle/step swaps use per-avatar keys, including decoys. Cyan/red ground
rings and defender art remain unchanged. Recorded rival replay actors explicitly
retain the original default appearance because bank records have no gang
identity. No bank, seed, timing, powers or recording contracts changed.

`/gang-skins-preview.html` shows all starters at 24px gameplay size and enlarged.
Review-only `?skin=crossline|iron-row|afterlight` selects a palette without
saving or switching gangs. The new headless suite passes 30 assertions in the
adapted harness; modified sources parse there. Native `npm run verify`, actual
source-pixel coverage, Canvas texture upload, low-resolution visual readability
and car stripe orientation remain unverified under Carbon Black. This is free
starter identity, not a Store Credit purchase.

## The Board runner-only cleanup (2026-09-16)

The leaderboard still exposed the shelved Plug role, used hard-coded desktop
columns and let top-20 rows fall below short phone screens. It is now a focused
runner board with TODAY / ALL-TIME tabs, STASH / REP sorting, a personal-rank
chip, responsive columns, alternating/highlighted rows, explicit offline and
empty states, and screen-sized pagination. The blue utility styling is replaced
with the Window-era ink, cream, gold and teal grammar. Desktop social/stat
sidebars were removed from this scene so the board owns one hierarchy.

`logic/leaderboard.js` keeps viewport geometry and paging import-free. Its new
headless test has 53 assertions across six viewports, including proof that the
maximum row count fits and the next row does not. The rewritten scene parses in
the adapted harness. Native `npm run verify`, real API population, page taps
and phone/desktop rendering remain unverified under the Carbon Black process
restriction. Leaderboard storage/query semantics were not changed; the scene
still asks the existing global APIs for at most 20 runner entries.

## Landing wordmark and current-rules help (2026-09-15)

The human reported that the PLUG RUN lettering looked pixelated and that HOW IT
WORKS was both visually stale and factually about the shelved two-role game.
The wordmark keeps its route/house lockup and colors but replaces the
rectangular constructed glyphs with a smooth italic athletic SVG text face.
MenuScene explicitly sets only that texture to LINEAR filtering; global
pixel-art rendering remains unchanged for gameplay sprites.

HOW IT WORKS is now HOW THE STREET WORKS: four ink/gold cards explain the
current Run the Block, seven-house Block Rivals, stash/REP distinction and The
Window. It no longer advertises player Plug mode, role-specific daily routes or
a replay after every ordinary run. Its measured card height is 76.25px at
280×480 and 92.25px at larger checked viewports; the 40px GOT IT action remains
inside the lower-right inset. The edited scene parses in the adapted harness.
The exact SVG fallback font and rendered antialiasing still need iPhone/desktop
review, and native verify remains blocked by Carbon Black.

## Auntie Ro mobile counter occlusion (2026-09-15)

The human approved the mobile art direction but Ro still read as floating over
the room. Portrait layouts now position her from the bodega's measured counter
line and redraw the matching lower counter crop above her body. Ro is therefore
actually sandwiched between the room and counter art; dialogue/buttons remain
above both. Desktop keeps its prior composition. The foreground crop is part of
the pure `WINDOW_ART` contract, and two new assertions prove it spans the
portrait width and completes the source height. The Window adapted harness now
passes 61 assertions. Exact hand/torso occlusion still needs a phone visual
check; native verify remains unavailable under the Carbon Black restriction.

## The Window production-art pass (2026-09-15)

The human verified that the first-contact flow works but correctly rejected the
code-drawn placeholder look. The approved bodega, Auntie Ro, Switch and cast
art are now promoted under `client/public/art/the-window/` and loaded by
`WindowScene`. Portrait phones use a deliberate counter/shelves crop instead
of squeezing the 16:9 room; wider screens use the full bodega. Auntie Ro's
three atlas frames follow the introduction mood, and gang selection uses named
Switch, Brick and Vee frames. Dialogue, buttons and labels remain live Phaser
layers, never baked into the illustrations. Missing textures fall back to the
old simple shapes instead of blocking onboarding.

The source PNGs are still large. They share Git blobs with the archived concept
sources, so the repository is not duplicated, but network transfer is roughly
the four original rasters until a later WebP/atlas compression pass. Exact
atlas dimensions and frame bounds live in import-free `WINDOW_ART` and have
five headless invariants. The Window suite now has 59 adapted-harness
assertions. Native `npm run verify`, load-time measurement, GPU texture-memory
measurement and real-phone cropping remain unverified under the Carbon Black
process restriction.

## The Window initial implementation — onboarding and state only (2026-09-15)

The first safe vertical slice from `THE_WINDOW_DESIGN.md` is now implemented.
`logic/window.js` owns import-free gang definitions, state normalization,
one-time gang choice, visit tracking and an idempotent Store Credit
grant/spend ledger. `utils/windowProgress.js` persists that state under an
account-scoped versioned key. `WindowScene.js` supplies a code-drawn bodega
fallback, the three-panel Auntie Ro introduction, gang selection, a read-only
hub and compact previews for Counter, Jobs, Your Gang and Shelf. First-time
accounts enter the Window before the menu; after choosing, THE WINDOW is the
third main-menu row.

**No Store Credit source, mission progress, purchase, gang switch or shared
standing is connected to gameplay.** Opening the Window only records the
route-day visit; it does not claim currency. The unsliced PNG concepts remain
unreferenced. Run the Block and Block Rivals result paths were not changed.

The new pure test has 54 assertions; the adapted five-row landing test has 120
viewport assertions and keeps all five 44px rows above the footer at 280×480.
Both passed in the available in-memory JavaScript harness, and all edited
sources parsed as modules after import/export adaptation. Carbon Black still
prevents the requested native sandbox process, so `npm run verify`, Vite
resolution, real Phaser rendering and phone touch/crop review remain unverified.

## The Window design checkpoint — documentation and concept art only (2026-09-15)

The human approved the direction for a neutral bodega hub, Auntie Ro onboarding,
three two-contact gangs, cosmetic Store Credit and short daily gang updates.
The authoritative product spec is `THE_WINDOW_DESIGN.md`. Four generated PNG
concept sheets are stored under `client/public/art/the-window/concepts/`.

**Nothing in that spec is implemented yet.** The assets are raster PNG concepts,
not SVGs or production sprites; they still need slicing, cleanup, optimization
and mobile review. Do not award Store Credit, persist a gang, show shared gang
standings or alter Run the Block / Block Rivals until implementing the staged
plan with tests. In particular, the proposed +2 Store Credit for a Rival win
(first three wins per route day) is a future safeguard requiring final product
confirmation, not current race behavior.

## Current HUD follow-up — floor clock and pickup progress

This section supersedes the older HUD and player-facing opponent-label notes below.
The human approved the full-height arena and side rails, then requested:
- A clock inset into actual walkable floor, at depth 1.7–1.72 (floor/grime below,
  walls/furniture/actors above). Pure rivalFloorClock chooses an open footprint;
  it changes neither the maze nor collision. No course-name badge during play.
- A drawn settings gear bottom left. Settings exposes existing audio toggles,
  Back to Race and Quit Race. World controls stop while open; the race deadline
  keeps running. Back preserves powers/timers, blocks the closing tap briefly,
  and a rival finish closes settings before showing the result.
- Rails fill top to bottom. Each house lights halfway on real stash pickup and
  fully on extraction. Bunk does nothing; death/retry removes unfinished half.
  Completed-house timestamps remain the sole authority for winning.
- Rival halves follow actual pickup/death events in a validated replay bundle.
  A nonblocking prefetch begins at the loadout; shared cache/progress objects
  survive shallow race copies and scene restarts. WATCH reuses that download.
  Fetch failure leaves ordinary clear-based progress playable and WATCH can retry.
- Player-facing opponent name is RIVAL (explicit user decision); historical
  instructions below requiring BOT/AI RIVAL labels are superseded. Internal
  metadata and all bank JSON remain untouched.

Verification in the available adapted in-memory JavaScript harness: 94 rival
rules, 89 flow/cache/settings, 42 capture, 68 record, 70 replay and 402 bank
assertions (765 total). All 55 bank bundles validate; 1,040 actual pickup
windows were derived. Clock footprints were checked against the regenerated
floor grid of all 49 pool houses. The prior flow test still expecting
"AI target" was corrected to the already-shipped "Rival:" result label.
Native npm run verify, .mjs subprocess checks and Vite were not run: the user
has prohibited sandbox/process attempts pending Carbon Black whitelisting.
Adapted syntax/binding checks are not native ESM resolution. Actual floor-clock
contrast, settings touch behavior, and final mobile composition remain unverified.

---

> **Start here (2026-09-16).** The section below, "Block Rivals recorded
> opponents", is the current state of the branch. `RIVALS_CLAUDE_HANDOFF.md`
> has the same material in more depth (status table, asset layout, recording
> procedure, what is unverified). Everything under it is older context.

## Block Rivals recorded opponents — handoff to Codex, 2026-09-16

Branch `claude/input-intent-layer`, 12 commits since Codex's `0e7114e`, all
pushed. `master` untouched. `npm run verify` (tests + Vite build) passes
natively; the last run: 21 suites, ES-module check on 75 files, 402 bank
assertions over 55 recordings.

### What changed, in one paragraph

Block Rivals no longer races a generated pace by default. Seven fixed courses
(`RIVAL_COURSE_POOL` in `logic/rivals.js`) each have a bank of complete
seven-house races recorded from the game's own BotDriver under the real race
rules; a race picks one (tier from local wins on that course, deterministic by
user/course/races played, rematch by recordingID), the player gets the
recording's ordered loadout through a confirm screen instead of the picker,
the opponent bar runs off the recording's seven clear timestamps, and the
result modal offers WATCH RIVAL REPLAY, which plays the rival's whole race
(every attempt, deaths included) on top of the intact result. When no
recording is eligible or the fetch fails, the race is the old labeled
"Simulated AI pace" and nothing generated is ever shown as a recording.

### Files to know

| file | role |
|---|---|
| `logic/rivals.js` | course pool, rotation (`nextRivalSlot`), race rules (unchanged core) |
| `logic/rivalRecords.js` | `RivalRunRecord` / `RivalReplayBundle` build + validate; payload hash; course/rules eligibility |
| `logic/rivalReplay.js` | portable 15Hz segment format (grid cells, frame arrays, events), seeking, timeline |
| `logic/rivalPresets.js` | Street / Hustler / Ace bot presets, tier ladder, opponent choice, bank loadouts |
| `controllers/RivalReplayCapture.js` | Phaser-free live capture into segments; `exportRaceCapture` |
| `controllers/RivalReplayPlayer.js` | full-race playback overlay (regenerates each house from its seed) |
| `controllers/RivalsRace.js` | race adapter: opponent lookup before loadout, capture hooks, WATCH button, honest labels |
| `utils/rivalSession.js` | course selection, `loadRivalOpponents`, `resolveRivalOpponent`, `loadRivalReplay`, local history |
| `controllers/installBotDriver.js` | `?rivalsRecord=1` recording mode, `?rivalsPlay=1` play mode, `window.__plugRunLiveScene` |
| `client/public/rivals/v2/` | the bank: `manifest.json`, `courses/<courseID>/opponents.json` (`{record, replay}` entries), `replays/<recordingID>.json` |
| `test/rival*.test.mjs` | courses (668), records (68), replay (70), presets (26), capture (42), flow (67), bank (402) |

### Rules that must keep holding

- Rivals writes only `pr_rivals_results_v1_<user>`. No Daily/Journey, REP,
  stash, activity feed, inventory stake or leaderboard writes. Unchanged.
- A bank record is stored byte-for-byte as recorded (`{record, replay}`);
  decorating it breaks its payload hash and the loader drops it silently.
  This bit us once.
- Bump `RIVAL_RULES_VERSION` when maze generation, combat balance, loadout
  rules, stash assignment, transitions or race timing change, and re-record;
  old recordings become ineligible by design. Bump
  `RIVAL_BOT_DRIVER_VERSION` when the bot or presets change.
- Replays are spectator data. Validation is corruption checking, not
  anti-cheat; `verified` stays false on every client record.
- Bot opponents are labeled BOT / AI RIVAL everywhere. Keep it that way.

### How to record more (or re-record)

```
cd client && npm run build && npx http-server dist -p 4173 -s
# one job = one course x one preset x N complete races:
http://127.0.0.1:4173/?rivalsRecord=1&courseSlot=5&skillPreset=ace&runs=3
# then in the console: __plugRunRivalsDownload()   (or read window.__plugRunRivals)
```

Use Chromium's Canvas renderer for headless capture (`--disable-gpu`): WebGL
through swiftshader ran at 9-18fps and crippled the bot. Assemble with a
script that re-validates every record and bundle with the logic modules
(mine lived outside the repo; `test/rivalBank.test.mjs` is the contract it
must satisfy). Missing from the 63-race target, all 12-minute forfeits: two
Ace on Switchyard Seven, two Hustler on Blacktop Crown, one Hustler each on
Copper Climb and Afterglow Mile, one Street on Switchyard Seven.

### What was measured, and what it means for the game

- Bot race times across the bank: 1:14 to 11:58, 2 to 108 retries.
  Switchyard Seven is the hard course; Freight Run the easy one.
- The level-20 sweep bot cannot be the Ace: from level 6 the runner AI has
  zero wander/hesitation, takes the identical route every retry and dies in
  the identical lane (55-72 deaths on Low End Rush house 4). Level 5 keeps
  6%/5% imperfection and completes. Ace is level 5 with cover routing and
  phase escape on. Details in the `rivalPresets.js` comment and commit
  `a9d76d9`.
- Low End Rush house 4 spawn-kills a straight-line runner from the first
  second. Worth a look as a level-design fact, not only a bot fact.
- Two samples in one millisecond produced duplicate replay timestamps in
  five of the first six recordings; fixed in `pushReplayFrame`. Existing
  bundles were deduped (16 frames total).

### Verified and not

Verified headless (screenshots and state reads): opponent lookup picks a
recorded bot, HUD row "AI RIVAL", fixed-loadout confirm, result copy
"Recorded bot run · not a live player", WATCH creates the overlay (arena,
duffels, sprites, clock, house strip, EXIT/NEXT), EXIT destroys it and the
result is unchanged; a bot playing against the bank won in 2:33.

Not verified by anyone on a real device: how any of it looks and feels,
280x480 layout with the replay HUD, background/return during a race,
Rematch/New Race by hand across all seven courses, Run the Block resume
after a Rivals session. The replay player draws walls as flat fills with
ink rim and shadow (no wall texture) — judge it on screen.

### Suggested next work

1. Play it. Then fill the eight missing recordings and decide whether the
   12-minute forfeit should be longer for Ace.
2. "Jump to decisive house" in the replay (`decisiveHouse()` in
   `logic/rivalReplay.js` already computes it).
3. Watch-my-race: the player's own race is already captured and exported as
   `runRecord` in the local history; the bundle is in memory as
   `race.capture` but is not persisted (100KB+ per race).
4. Only after all of that: uploads and human ghosts (Phase 5 in
   `RIVALS_CLAUDE_HANDOFF.md`). Not before a server can validate.

---

Written 2026-09-15 at the end of a long Claude Code session. Branch:
`claude/input-intent-layer`. 38 commits ahead of `master`; `master` is
untouched and still deploys the old build.

Read this first, then `HANDOFF.md` for the measurement history and the PvP
plan. This file is onboarding; that one is the research log.

---

## Block Rivals prototype and main-menu consolidation — 2026-09-15

Current menu: Run the Block / Block Rivals / Tutorial / Settings. Run the Block
launches the existing saved journey (15 unique house clears per block, then the
next named block). The old Daily entry/countdown is no longer on the main menu;
its code, stored data and leaderboard backend remain untouched. Journey REP is
still local under the previous implementation, not newly wired to the legacy
daily leaderboard by this change.

Block Rivals is a separate seven-house sprint, mode=pve / runKind=rivals:
- One opening loadout, a three-second countdown, then seven seeded houses with
  no overhead maps or repeated selection modals. The chosen two charges refill
  on each house and retry. Single defender throughout; no house-15 finale.
- Two segmented HUD bars show completed houses, not invented continuous movement.
  A top 84px strip is reserved outside the arena. The race clock uses monotonic
  performance time from scheduled GO; transitions, retries and background time
  count. Winning requires all seven before the opponent deadline.
- Escapes advance after 180ms. Death/round timeout retries the same house after
  650ms with the same seed/spawn/weapon. An active resize counts as a retry,
  avoiding a free ammo/health reset. Countdown resize preserves its original GO.
- RivalsRace owns the scene adapter and lifecycle. State crosses restarts in
  rivalRace; display objects/timers never do. Results support Rematch (same course),
  New Race and Menu. Reload abandons an active race; no mid-race cloud resume.
- No daily/journey stash, REP, session, activity-success or leaderboard writes.
  Legacy inventory stakes are disabled for Rivals. Partial/complete results are
  kept in an account-scoped local history capped at 20 entries.

IMPORTANT: the initial opponent is explicitly a SIMULATED AI PACE TARGET, not
a recording of the existing combat bot and not a human. rivalSession generates
the same seven mazes, measures floor paths (including a primary-pocket search),
and computes fixed timestamps from movement/carry speeds plus hesitation.
It does not simulate combat, deaths or powers. No rubber-banding. 100 sampled
courses (700 houses), generated twice, gave repeatable targets of 1:09–1:44
(mean 1:21). These are target times, NOT measured human completion times.

logic/rivals.js has import-free course identity, timing, progress, outcome,
path metrics and recording compatibility. Completed player runs save actual
seven-house clear timestamps, course seeds, rules version and ordered loadout.
These are explicitly unverified local records. No remote matchmaking, public
ghost pool, recorded-AI dataset, anti-cheat verification or ranking is shipped.
The compatibility predicate is structural validation, NOT proof a run is genuine.
Use trusted recordings and server validation before public competitive scoring.

Rivals-only initial conditions use seeded defender weapons/random decisions,
the same real/bunk assignment and maze generator. Defender speed/range and
bullet speed/radius scale from 24px reference cells so resizing the display does
not change their grid-relative values. Other modes retain their old balance.
The simulation is still frame-stepped, NOT deterministic lockstep combat.
Bump rivals-v1 when gameplay/maze/loadout rules change before consuming old ghosts.

Validation:
- 466 existing + 67 race-rule + 41 scene-adapter assertions passed in the adapted
  in-memory V8 harness (574 total). The two new suites are in npm test.
- Adapter tests cover countdown/GO, clear ordering, single loadout, auto-retry,
  powers, transition-inclusive clock, background catch-up, pending retry
  cancellation, no eighth house, results, rematch, quit and disposal.
- Additional stubs exercised Base init, race restarts, daily/journey isolation,
  ProgressionManager's early Rivals dispatch without reward/network calls,
  bounded account-scoped result storage and menu routing.
- Layout probes reserved arena room at 280x480, 390x844 and 1440x900. Adapted
  binding-aware compilation passed edited sources; it is not native ESM/Vite.
- User reported Carbon Black blocking the sandbox and asked us not to use it.
  No further local/sandbox calls were made after that request. Native npm test,
  temporary-.mjs syntax subprocess checks, Vite build, live controls, rendering,
  background behavior and race feel still need local verification once allowed.
  Run npm run verify in client, then try a complete race, repeated deaths,
  rematch, resize, background return and main journey resume before deployment.

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
