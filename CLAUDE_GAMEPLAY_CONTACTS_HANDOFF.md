# Claude handoff — gang faces in the running loop

Written 2026-09-16. Repository: VallesG/plug-run.
Work only on `claude/input-intent-layer`. **Never touch master: live deploy.**
Gameplay implementation checkpoint: `08e45597d89c0fc446e8076d7b427704fbca3fc7`.

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
