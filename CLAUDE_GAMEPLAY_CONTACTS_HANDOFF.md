## Block-cleared crew sigils — implemented, 2026-09-16

The 15-house result now reveals the entire neighborhood, including formerly black courtyard parcels. This is an explicit completion-only presentation pass (`celebration: true` plus a complete block), not a change to exploration, city ownership, seeds, rewards, mission items or Rivals. Normal street screens and embedded city blocks retain their fog behavior.

Journey completion uses the frozen `scene.blockGangID` for a faded crew mural underneath streets and roofs, matching result badges and the primary action. Daily completion reveals the same neighborhood without inventing a crew claim. Crossline has crossed routes, Iron Row an olive/safety-yellow bolt and IR monogram, Afterlight a violet halo and rising spark. Canonical geometry lives in `client/src/logic/crewSigils.js`; portable SVGs live in `client/public/art/crews/`. No raster assets or fonts in the marks.

`BlockComplete.js` registers compact STASH/REP badges and the map with the existing modal lifecycle. ENTER NEXT BLOCK is the only bright Journey action; WATCH REPLAY and MAIN MENU share a quieter row. Replay hides/restores all extras; teardown leaves no veil. Completion styles in GameUI are opt-in and do not recolor ordinary modals.

Review: `/block-map-preview.html` on the Vite dev server, slider at 15, crew selector, including 280×480 and desktop presets. See `CREW_SIGILS_DESIGN.md`.

Measured: adapted in-memory V8 execution of 41 existing logic/flow suites before and after changes; new completion suite 36 assertions; expanded city-flow suite 115 assertions (baseline 77); unchanged Rivals bank 402 assertions across 55 recordings. The bot harness required a console stub, then passed both runs. Seven changed runtime modules and the preview script also parse in V8. Native `npm run verify`, filesystem/art and native ESM integration checks, Vite build, actual Phaser rendering/font metrics and phone appearance remain unverified: local execution is intentionally avoided at the user's Carbon Black request. Run native verify when an execution-safe environment is available.

# Claude handoff — Iron Row Season 1

## Iron Row Season 1 — implemented (2026-09-16)

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


# Claude handoff — gang faces in the running loop

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


Written 2026-09-16. Repository: VallesG/plug-run.
Work only on `claude/input-intent-layer`. **Never touch master: live deploy.**
Gameplay implementation checkpoint: `08e45597d89c0fc446e8076d7b427704fbca3fc7`.

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


## Status: stages 1-5 implemented (2026-09-16)

See the top section of HANDOFF_CODEX.md for what shipped, the rules that must
keep holding and how it was verified. Against this document's own staging:

- **1 art + reusable dialogue** — done. WebP runtime art, PNG sources out of
  `public/`, `logic/contacts.js`, `controllers/ContactPanel.js`.
- **2 milestone check-ins** — done, plus an opening beat at house 1 the human
  asked for: the primary requests the block and alludes to something bigger,
  without naming content that does not exist.
- **3 mission definition and state** — done as `logic/blockRun.js` mission
  field: offered at the brief, settled once at the briefed house's clear,
  never rewritten by a later house.
- **4 special-item pickup** — done. `logic/missionItem.js`, deterministic from
  a separate seed domain, reachable, same on retries, violet ring, additive to
  the real bag, no maze/collision/RNG edits. Sixty real houses proved.
- **5 completion seam** — partly done: success is item + real stash +
  extraction from the briefed house, recorded once, and it drives the debrief
  line. It grants nothing.
- **6 bonus REP and +1 Cash** — NOT done, and deliberately so.

The praise also became performance-aware at the human's request: each primary
reacts to a flawless run, a comeback after three deaths, spending no powers,
two wrong bags, or leaning on phase, dash or decoy. A power counts as a habit
at two uses with a clear lead, so one press is never called a style, and a
variant is spoken at most once per block.

The 200-entry ledger hazard this document flagged was inspected and confirmed
real — it drops balance AND duplicate protection together — and still blocks
stage 6.

Decisions taken, so they are not re-litigated:
- beats at houses 1, 4, 7, 9, 10, 13; house 15 keeps its block-complete finale
- one panel per house, never stacked; the clear-6 check-in carries the tease
- a beat is claimed before it is shown, so a reload during the panel costs
  the line rather than looping it
- milestone lines are indexed by beat; variant praise is earned and spent
- the mission ring is violet for every gang, never per-gang, never green
- Rook, Sol, Brick and Vee get no foreground crop; only The Dispatch and The
  Map Room have full-width furniture at body height

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

## Read first and do not confuse plans with shipped behavior

1. Read HANDOFF_CODEX.md end to end, including the six traps.
2. Read this handoff, THE_WINDOW_DESIGN.md and RIVALS_CLAUDE_HANDOFF.md.
3. Read current code and recent commit messages. Topmost dated notes supersede
   historical instructions below them.
4. Run `npm run verify` in client/ before and after implementation in an
   environment where execution is allowed. Do not bypass the user's security tools.

The human requested this documentation checkpoint before another large change.
**No gameplay contact check-ins, special items or mission rewards are implemented
by this handoff.** Six location settings now have prepared artwork (see above). Next work reviews
that pack, adds personality/expression choices and short dialogue like the
successful Auntie Ro flow, then a tested gameplay integration. This is not an instruction to wire all
economy features or expand PvP at once.

## What shipped during the Codex continuation

- Exterior overhead block map: winding street, rooftops, opaque stepped fog,
  warm house/street lights and progressive reveal. No interior floor plans.
  Entrance map appears BEFORE the house, including house 1 and resume.
- Comic-style interior furniture on suitable existing wall components, drawn
  power icons and loadout cards. Collision grid, floor themes and movement feel
  are preserved. Runner-only tutorial uses shared arena art and four lessons;
  the shelved player-Plug lesson is unreachable.
- Run the Block is the saved endless journey through named 15-house blocks.
  Fifteen unique successful house clears advance to the next block. REP does
  not unlock blocks. The earlier Daily UI is not the main mode; legacy code is
  retained. Journey stash/REP remains local, not newly wired to global rankings.
- Quiet title-screen menu instead of a busy landing card. PLUG RUN route/house
  logo retained, lettering updated to smooth athletic italic SVG with LINEAR
  filtering only for that texture. HOW THE STREET WORKS reflects current modes.
- Runner-only leaderboard cleanup: Today/All-Time, Stash/REP sorting, personal
  rank chip, responsive/paginated rows, explicit empty/offline states. Backend
  semantics remain unchanged; no gang standings were fabricated.
- Seven-house Block Rivals, separate from Journey/Daily rewards. Fixed seven-
  course pool and deterministic rotation; quick transitions/retries and one
  loadout. Claude's recorded-opponent pass supplied 55 complete bot recordings
  over all courses/tiers, hashed records, 15Hz portable captures and full-race
  WATCH RIVAL REPLAY returning to the intact result. Bank is under
  client/public/rivals/v2/. See the focused Rivals handoff for recording jobs.
- Rivals HUD: full-height arena, YOU left/RIVAL right side rails filling
  top-to-bottom; real stash pickup lights half a segment, extraction completes
  it, death clears the unfinished half. Rival half-progress comes from replay
  events. Clock is inset into actual walkable floor beneath actors. Bottom-left
  settings gear provides audio, Back to Race and Quit; race time keeps running.
- **User-facing label is RIVAL**, not AI RIVAL or BOT. Keep internal bot metadata
  honest and preserve records byte-for-byte; old label instructions are superseded.
- The Window: neutral bodega, Auntie Ro first-contact introduction, persisted
  one-time gang choice, permanent menu entry and read-only hub sections.
  Production PNG art/atlases replace placeholder shapes. Ro is occluded behind
  the mobile counter; dialogue advance sits bottom-right with >>.
- Free gang starter outfits and matching getaway-car paint/stripe from existing
  sprites. Skin/ink/glass/shading and cyan/red role rings preserved. Idle/step
  and live decoys use the outfit; rival replay retains default art because its
  records do not store gang identity. No Cash purchase is involved.
- Latest commit: normal Rivals players choose ANY ordered two-power mix once
  before the race, including duplicates. Rival keeps its own recorded mix,
  displayed under the slots. Rematch allows a new player mix. Never restore the
  matched-loadout lock or require identical player/opponent powers.
  Explicit recording/play harness powers remain fixed and are not overridden
  by opponent lookup.
- Vocabulary is **powers**, not charges. Run the Block houses 1–3 teach with
  descriptions; house 4 onward uses a compact 360px-max picker with icon/name
  cards and slots. Tap a slot to clear/replace its power.

## Current cast and art — reuse, do not rename

| Gang | Primary point of contact | Secondary/job contact |
|---|---|---|
| Crossline | Switch | Mags |
| Iron Row | Brick | Rook |
| Afterlight | Vee | Sol |

Auntie Ro belongs to no gang. She introduces the city/choice and hosts The Window.
Do not move her into one of the crews.

Runtime art is raster PNG, **not SVG**, under client/public/art/the-window/:
bodega-night.png, auntie-ro.png, switch.png, cast.png.
The concepts/ subfolder is the archived generated source art.
WINDOW_ART in client/src/logic/window.js is the tested atlas/crop authority:
Ro and Switch have three 724x724 expression frames; cast has named Brick, Vee,
Sol, Mags and Rook frames. WindowScene currently displays the primary portraits;
secondary frames exist but gameplay dialogue presentation does not.

Keep typography, names, dialogue and controls as live layers, not baked in art.
Portrait phones are the priority, but test desktop without stretching/cropping
characters arbitrarily. Large source PNGs still need compression/load-time work.

## The human's next requested direction

Put gang faces prominently in the Run the Block loop, without making the arcade
game into a dialogue-heavy RPG:

- Every three houses, the player's primary contact checks in: good job,
  encouragement, crew update, keep collecting stash.
- Around house 6, the primary teases that the secondary has a special item to
  collect in an upcoming house.
- Before that target house, the secondary appears, names/shows the object and
  tells the player to collect BOTH it and the real stash.
- Successfully finishing that special house should earn bonus REP and
  **+1 Cash for that mission level**, in addition to ordinary progress.
- Develop each contact's setting/backdrop, voice, portrait treatment and
  dialogue with the same readable comic-panel grammar as Auntie Ro.

These are approved direction, not completed systems. Exact target house, item
catalog, bonus REP amount, repeat/expiry policy and notification frequency are
not yet final. Do not quietly invent economic values or claim global crew totals.

### Suggested pacing prototype, not a frozen schedule

After clears 3, 6, 9 and 12, use the next house's existing entrance seam:
a short check-in before entering houses 4, 7, 10 and 13.
The clear-6 check-in can include the tease. Example target: house 9 (only an
example); the secondary briefing happens before entering that house.
Merge events that coincide instead of stacking several mandatory modals.
House 15/full-block celebration can replace a redundant fifth check-in.

Keep panels one or two sentences, dismissible, and use bottom-right advance
with >>. Do not put a blocking portrait over live movement. Return to the
correct entrance/loadout, not main menu; suppress tap-through into gameplay.
Do not pause the clock or inject story interstitials into Block Rivals.
Start with Run the Block/Journey only; Tutorial, replay, recording harness and
Rivals remain unaffected unless separately scoped by the human.

### Character settings and dialogue first

Create data-driven contact dossiers: stable ID, gang, role, voice, location,
portrait/frame, accent, and short welcome/praise/tease/briefing/debrief lines.
Primary voices: Switch reads/coordinates the street; Brick is direct/protective;
Vee is stylish/competitive. Secondaries Mags, Rook and Sol bring the jobs,
consistent with THE_WINDOW_DESIGN.md. No new factions or story-heavy campaign.

Prototype one complete primary-to-secondary pair before multiplying content.
Use existing portraits if adequate; any new backdrop/art generation needs
its own asset review and instruction workflow. Do not assume the old cast sheet
already supplies expression variants for every secondary.

## Safe staged implementation

1. Character content/layout prototype and reusable portrait-dialogue controller.
   Import-free content/state/layout decisions belong in src/logic/ with headless
   tests. Browser/Phaser rendering belongs in scenes/controllers.
2. Hook check-ins into the existing PRE-house entrance flow. Persist shown-event
   IDs scoped to account + journey block + milestone, not a surviving scene flag.
   Reload/resize/retry must not replay praise or accidentally start two rounds.
   Decide deliberate revisit/skip behavior before persisting "shown".
3. Mission definition and state contract, still no rewards: offered, accepted
   (or explicitly automatic), active, item collected, completed, rewarded.
   Scope stable IDs to block identity + mission definition/version. Do not let a
   later gang switch reroll or double-claim an existing mission.
4. Special-item pickup: deterministic reachable floor placement from the existing
   house seed and a separate seed domain, no collision/maze/RNG-stream edits.
   Distinct clear icon; no confusion with real/bunk stash, no extra stash count.
   It is an additional objective, not a replacement for the real bag.
   Same target/placement on retries. Keep new runtime objects compatible with
   ordinary replay capture and avoid visual effects fighting recorded positions.
5. Completion/reward seam: recommended success = special item + real stash +
   extraction from the designated house. Pickup alone, bunk, death, abandoned
   run, Watch/Replay and duplicate callbacks must not reward. Exactly one house
   clear still advances normal progression; bonus item is not a second stash.
6. Only after amount/repeat policy is settled: idempotent bonus REP and +1 Store
   Credit, explicit reward recap, persistence/reload tests. Do not enable unrelated
   login/block/Rival Cash rules merely because the ledger already exists.

## Currency naming decision (latest user clarification)

The currency is **Cash**, not Store Credit. The game does not currently award
or use Cash in gameplay. Use Cash in new dialogue, mission rewards and UI.
Existing internal fields/helpers still say credits, grantStoreCredit and
spendStoreCredit; this docs-only pass does not rename schemas or runtime code.
Decide migration/backward compatibility before changing those identifiers.
Historical handoffs using Store Credit describe the old name, not another
currency. REP, stash and Cash remain distinct.

## Economy and persistence hazards before rewards

The Window has pure grant/spend ledger helpers and account-scoped persistence,
but **no gameplay Cash sources, active missions, purchases, gang switching
or shared standings** are wired. Existing planned login/full-block/Rival credits
remain proposals. This mission +1 Cash must use a separate stable event ID.

Inspect createWindowState before treating it as an unlimited reward ledger:
it truncates to the last 200 entries and derives balance/deduplication from that
retained slice. Long-term reward implementation must preserve historical balance
and claimed-event protection; otherwise old grants/spends or duplicate guards
can disappear. Add migration/retention tests rather than wiring repeated awards
onto that seam blindly.

Coordinate mission completion, ordinary journey checkpoint and reward persistence
so a crash/reload cannot lose or duplicate a reward. Retry after item pickup
must reset attempt-local pickup state, not completed claim state. Specify recovery
if storage fails. Local reward state is not trusted server accounting and must
never be advertised as verified global REP or gang standings.
Journey REP currently is local; inspect its authoritative accumulation path
before adding bonuses and do not accidentally submit them to the legacy Daily API.

## Code seams worth inspecting

- controllers/ProgressionManager.js: entrance/clear/finale flow and mode isolation.
- controllers/BlockMap.js + logic/blockMap.js: exterior entrance presentation.
- scenes/BaseGameScene.js: startMatch/init/restart, objectives and replay objects.
- scenes/WindowScene.js: Ro composition, portrait frames, dialogue and lifecycle.
- logic/window.js + utils/windowProgress.js: gang, atlas, state and Cash ledger.
- logic/worldBlocks.js + utils/journeyProgress.js: block identity/checkpoints.
- controllers/RunnerLoadout.js + logic/powerSelection.js: compact/editable picker.
- controllers/RivalsRace.js + utils/rivalSession.js: keep out of story/reward changes.
- controllers/ReplaySystem.js: ordinary display-list replay implications.
- THE_WINDOW_DESIGN.md: authoritative roster and broader future system boundaries.

## Verification and delivery

The latest implementation ran 546 targeted assertions in an adapted in-memory
V8 harness: 99 flow/actual-loader, 75 picker callbacks (all nine mixes), 38
interior/layout, 94 race rules, 68 records, 70 replay, 42 capture, 26 presets,
34 tutorial. Eight edited sources passed adapted import-binding parsing.
**This is NOT native npm test, native ESM resolution or a Vite build.**
The 55-record bank was unchanged by the latest work; it was not freshly tested
natively by Codex. Claude's earlier bank pass had native verify/headless results;
do not extend that old claim to these commits.

User has reported the game works/looks good in multiple phone and desktop
screenshots, with mobile the priority. Exact new compact-picker spacing,
starter skin color coverage, asset load/memory cost and full regression still
need real-device review. Future contact/mission work has no visual or test proof yet.

The user prohibited sandbox/process attempts after Carbon Black blocked them.
Codex honored that and edited remotely through GitHub. Do not keep retrying
blocked execution or disable/bypass protection. Claude may run verify in an
allowed environment; otherwise report the restriction explicitly.

Minimum new tests: all three gang pairs; check-in boundary/resume/retry/resize;
dialogue cleanup/no tap-through; unchanged normal start; target placement
reachable/deterministic; item+bunk/death gives no reward; item+real+extract gives
one Cash/defined bonus REP; duplicate/reload cannot re-grant; ledger retention;
one normal stash/house increment; no rewards from Rivals/replays/harness/tutorial.
Keep all suites green, especially test/rivalBank.test.mjs, and run Vite build.
Use .mjs syntax checks (no package type:module; node --check .js is insufficient).

Commit messages explain WHY, what was measured and what remains unverified.
Leave master untouched. Deliver each small verified slice with clear next steps.
