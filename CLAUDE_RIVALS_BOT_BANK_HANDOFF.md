## Decoy-first recovery experiment and retry mixes — Codex (2026-09-17)

Phone/PC play found a promising human-discovered tactic: deliberately activate
Decoy immediately after GO, then run normally. This is an observed strategy,
NOT proof that the Plug is "panicked" or a request to alter its AI. Keep the
existing Decoy/defender interaction; do not nerf it in this pass.

Next BotDriver experiment (not implemented in the driver yet):
- Add an opt-in openingDecoy flag, surfaced through real driver config and
  persisted in driverConfig. Reset its once-only attempt flag on new house
  AND retry. Fire only with role runner, race racing, unpaused, alive runner,
  capture begun, slot 0 genuinely Decoy and unconsumed.
- Use the normal InputIntent.drivePower(0) seam, not DOM click leakage, direct
  consumption writes or invented replay events. Spend the actual selected
  power exactly once; let the normal capture observe it. Do not silently
  reorder a mix or activate outside the countdown.
- For a course/style that keeps failing, try NEW real jobs with decoy,phase;
  decoy,dash; and decoy,decoy plus openingDecoy enabled. Keep successful and
  failed attempts, cumulative clock, and honest give-up limits. Compare
  completion rate, attempts per house and measured seconds per house against
  the same style/course without the opener. Preserve weaker styles too.
- Do not replace all drivers with this strategy or filter the bank for wins.
  No claimed defender response, bullet immunity, stash knowledge, teleport,
  frame edits or fabricated times. Spectator replay shows the actual Decoy
  power event so players can discover the tactic themselves.

Human Rivals now offers RETRY HOUSE / SWITCH POWERS after two deaths/timeouts
on the SAME house. First death remains automatic; resize is not a strategy
death. Picking freezes the already-dead house, NOT the absolute race clock:
startedAt, clearTimes and selected opponent remain unchanged. A new mix
starts on the same house after retry; it stays selected for later houses.
The opponent can finish while the picker is open.

Existing recording:true jobs and explicit fixedPowers still auto-retry, with
no recovery UI. This is intentional so currently running unattended batches
cannot stall. Prefer the separate Decoy-first jobs above for now. If adding
adaptive recording drivers later, explicitly plumb a non-fixed retry policy
through the same between-attempt seam; don't use a fixed-mix harness while
secretly overriding its promised fixed powers. No adaptive driver is shipped
by this change.

Capture now snapshots initialPowers at GO and orderedPowers per attempt.
Record/bundle attempts optionally carry orderedPowers; new power events must
match that attempt's slot/mix. Old records without these optional fields keep
their exact bytes/hash and remain valid. Never relabel an old captured race.
Variable-mix records use the race-level orderedPowers as the INITIAL mix, not
a claim that every attempt used it. No rules version or course change.

Measured on the committed branch snapshot: 55 shipped records on seven
courses (local in-progress Claude captures are not reflected here).
The actual rivalBank test passed in an adapted V8/filesystem harness:
402 assertions, all 55 real bundles fetched and checked. All 55 legacy record
builders produced byte-identical output before/after the optional extension.
Native verify/build and real mouse/phone play remain unverified: execution
helper is blocked by sandbox ACL. Don't rebuild a worker's static dist mid-job.

# Claude: expand Plug Run's recorded rival drivers and bank

> **Resuming the bank recording?** Read `RIVALS_BANK_RECORDING_HANDOFF.md`
> first — it is standalone and has the exact commands, measured limits and the
> current per-course shortfall.

Continue on claude/input-intent-layer. Never touch master (live deployment).
Read HANDOFF_CODEX.md from the top, then RIVALS_CLAUDE_HANDOFF.md,
RIVALS_CITY_DESIGN.md and this document. Current shutdown/replay fixes supersede
older instructions about a top strip or locking player powers to opponent powers.

## Status (updated this session)

The recorder and assembler asked for below now EXIST and are maintained:
`client/tools/rivals-record.mjs`, `client/tools/rivals-assemble.mjs`,
`client/tools/rivals-plan.mjs` (plan generator) and `client/tools/README.md`
(the workflow, with every flag). Read `tools/README.md` first; the sections
further down that describe the harness are kept for background but the README
is the current, tested command surface.

Eight driver styles now exist beside the three presets: rookie, erratic,
cautious, ghost, dasher, trickster, balanced, sharp
(`logic/rivalPresets.js`, `RIVAL_DRIVER_STYLES`). Every one is aiLevel <= 5,
for the reason this document already gives.

Matchmaking, skill evidence and the unlock also landed this session — see
"Matchmaking and the unlock" at the end of this document.

### Measured hard limits (do not lower these blind)

A hard limit is a give-up point for one race. It is never written into a
record. Measured on the served build at 390x844, Chromium Canvas, ~54fps:

| style | limit | measured |
| --- | --- | --- |
| cautious | 540s | seven houses in 167s and 238s |
| ghost | 480s | seven houses in 293s |
| erratic | 900s | seven houses in 388s |
| rookie | 2400s | reached house 3 of 7 in 785s on the EASIEST course |

Rookie at 780s could never produce a complete race — it forfeited at 3/7 and
the capture was correctly rejected. Its limit was raised to match its measured
pace, and Rookie and Erratic run LAST in the plan so a batch that is cut short
loses the least certain jobs rather than the surest ones. Jobs also round-robin
across courses, neediest first, so partial completion still spreads coverage.

### Record against a static build, not the dev server

Vite HMR restarts an in-flight race whenever a source file changes. A batch was
lost this way: run 1 reloaded every ~122s, forever. Build, serve `dist`, record:

```
npm run build
npx http-server dist -p 4173 --silent
node tools/rivals-record.mjs --plan tools/rivals-plan.json --parallel 3 \
  --url http://127.0.0.1:4173 --out tools/recordings
node tools/rivals-assemble.mjs --in tools/recordings --dry
```

Confirm the served bundle actually contains your changes before a long batch
(`grep -c "RIVALS-REC" dist/assets/*.js`). An interrupted `npm run build`
leaves a stale `dist`, and a multi-hour batch will then record the old code.

### The recorder needs its own loadout entry

The harness entrance sits on the real loadout picker, which a modal
auto-clicker cannot drive; recordings sat at `status:'ready'` forever.
`installBotDriver.js` patches `RivalsRace.prototype.openLoadout` in RECORD MODE
ONLY, applying `race.fixedPowers` and arming the countdown. Do not remove that
patch, and do not let it run outside record mode.

## What to do next

Build multiple distinct BotDriver personalities for the existing seven-house
Rivals courses, record real complete races, validate/curate them, and expand the
shipped bank. Do not manufacture positions, clear times, wins or hashes. The user
chooses their own two ordered powers independently, and watches how the rival
used a different mix. Cosmetic search shows RIVAL labels, not AI/BOT; internal
opponent.kind='bot', driverVersion and tier metadata must remain honest and
hashed records must retain their original labels for integrity validation.

## Start with real verification

Execution is blocked by Carbon Black in Codex's current environment. Only run
native work in an explicitly permitted environment. There, run npm run verify
from client/ before and after edits. Keep every suite green, especially
test/rivalBank.test.mjs, test/rivalReplayView.test.mjs,
test/mobileInputLifecycle.test.mjs and test/rivalsFlow.test.mjs.
Do not imply native/browser verification if the machine still blocks it.

Before new recordings, phone-review the reported bug:
win first block -> ENTER NEXT BLOCK; repeat win/rematch/menu; open/close settings
and rival replay; resize during search. No camera-missing crash or lost steering.
Modal cleanup must never recreate touch during shutdown; do not remove
resumeTouch:false, idempotent destroy or closing/camera guards.

## Current recording/course contract

Seven pinned courses live in logic/rivals.js, slots 1–7. Never change root seeds,
ordered house seeds, scales or maze rules simply to improve artwork. The city's
roads and outside block map are decoration, not the raced house geometry.
Courses still use 16x35 grids. Every one of the existing bank's 1,646 attempts
stores those dimensions. Portable frames are grid-cell coordinates at 15Hz;
the old top strip was a VIEWER size/art problem, not seven new courses.

Live BaseGameScene and RivalReplayPlayer now use rivalArenaLayout, full viewport
(no top height subtraction). RivalReplayArena delegates to current live
ArenaArt/InteriorDecor/perimeter; it does not repaint a different maze.
Record new races on the current checkout at a fixed 390x844 viewport as the
primary phone baseline. Also playback on 280x480 and desktop, verifying the
same seed, stash cells, door/car, furniture and second defender where present.
Do not transform old grid frames into pixels or edit recorded times.
If actual gameplay/collision/combat rules change, bump rules eligibility and
re-record affected opponents through a migration; do not silently relabel them.

## Proposed bounded driver work

Keep the sweep/measurement bot stable; add opt-in rival personality knobs or
separate drivers, sharing the real InputIntent path. Examples worth measuring:
- Dasher: favors safe straight bursts, with restraint near corners.
- Ghost: intentional Phase escapes, rather than wasted activations.
- Trickster: deliberate Decoy usage; confirm real distraction behavior in play
  before writing boasts about it.
- Balanced: varied two-power mixes and conservative escape choices.

These are proposed styles, not shipped abilities or guaranteed tier rankings.
No teleporting, grid edits, hidden stash-identity access or immunity. Bots may
only use information and actions the runner can legitimately observe/use.
Use the actual two-slot ordered-power system, including duplicate powers and
phase/dash/decoy combinations. Don't pin every personality to the same mix.
Reuse real capture functions and full attempt history; retries remain part of
race-clock timestamps. A personality/style is distinct from a measured tier.

Existing preset keys: street, hustler, ace (logic/rivalPresets.js).
Ace intentionally uses aiLevel 5 with evasion, not level 20. From level 6 up
RunnerAI can deterministically repeat a fatal route every retry. Don't assume
higher aiLevel means better. Measure completion, retries, elapsed time and
power events on every course before assigning tiers. Changing actual driver
behavior requires a driverVersion bump; don't mutate old records to that version.

## Real recording harness

Start Vite with npm run dev in client/ (default 5173), then use:

http://127.0.0.1:5173/?rivalsRecord=1&courseSlot=1&skillPreset=street&powers=phase,dash&runs=3

The exact port must match the running dev server; 4173 in older examples was
a separate host configuration, not a required recording port.
Repeat for all seven course slots and chosen presets/styles/mixes. Add new
personality query/config parsing in a tested opt-in way if needed.
Play validation mode: ?rivalsPlay=1&courseSlot=1&skillPreset=street.
Recording/fixed-power harnesses intentionally bypass city/search/territory;
normal players never do. Do not let recording wins claim local territory.

Use Chromium Canvas (--disable-gpu), not swiftshader WebGL: prior WebGL runs
were 9–18fps and changed bot results; Canvas held near 60fps. Keep the page
foreground and do not background/throttle its wall-clock race. Measure/report
actual FPS, renderer, viewport, version and run failures rather than guessing.

window.__plugRunRivals holds config, course, races and done.
window.__plugRunRivalsDownload() downloads output. Each accepted race contains
ok, record, bundle and traces. exportRaceCapture refuses partial/abandoned
captures. Preserve those refusal checks. Never include failed/partial races as
complete opponents or insert simulated times into a replay bundle.

## Reproducible bank assembly

`client/tools/rivals-assemble.mjs` is that assembler and is maintained.
`node tools/rivals-assemble.mjs --in tools/recordings --dry` reports coverage
per course, per measured band and per power mix with the shortfall against 20,
and writes nothing. Drop `--dry` to write the bank.
The assembler must use the game's build/validation/hash functions:
validateRivalRunRecord, rivalRecordMatchesCourse,
validateRivalReplayBundle and validateReplaySegment.

Write accepted immutable payloads under client/public/rivals/v2/:
manifest.json, courses/<courseID>/opponents.json and replays/<recordingID>.json.
Preserve existing eligible records until replacements prove better coverage.
Use unique recording IDs, no orphan bundles, consistent manifest/course metadata
and payload-size bounds. npm test validates the entire bank on every run.

Aim first for at least three valid COMPLETE races per new style on each course
where that style is actually playable. Log missing coverage and failures; never
fill them with fictional wins. Avoid a huge nine-mix expansion before measuring
whether a style clears reliably. Keep harder/faster assignments evidence-based.
Don't change independent player selection or require matching powers.

## Done criteria and handoff

Native verify passes before/after; real Canvas recordings export and validate;
bank test remains green; actual phone and desktop playback show current arena
framing/art, correct second defender and correct complete race timing. Watch
returns to intact result. Run a normal win -> claimed sigil -> next district.

Report course/style/mix coverage, valid vs failed races, renderer/FPS/viewport,
times/retries distributions, bank size and what remains unverified. Commit why,
what was measured and unverified gaps, matching git log. Update both main handoffs
and this document with actual commands and new driver/version information.
No master deployment, server/global territory, new reward ledger or story edits.

## Matchmaking and the unlock (added this session)

### The comparison, and why it is legitimate

Campaign house N generates at scale `[_,0.6,0.75,0.9,0.95][N] ?? 1`. A Rivals
course's seven houses use `[0.6,0.75,0.9,0.95,1,1,1]`. Identical inputs to the
same generator on the same 16x35 grid with one defender — which is the ONLY
reason the two modes can be compared at all. So comparison is per-scale, on
median per-house clear time. Campaign house 15 is excluded everywhere: it is
the only house with a second defender.

Never compare raw race elapsed time to a campaign house time. Race elapsed
includes transitions and every retry; it is not a measure of how fast someone
clears a house. `recordHouseTimes` reads the winning attempt per house out of
the record's own attempt list instead.

### Bands are measured, never named

`measuredBands` cuts the bank's own benchmark spread into three
equal-population groups. Nothing is "easy/medium/hard", and no recording is
ranked by the style it was driven with — a Sharp run that went badly sits with
the slow ones. Change the bank and the bands move. Under six benchmarks it
returns ONE band called `measured`, which is honest about a thin bank rather
than inventing tiers inside it.

Measured on the 57 records shipped before this batch: 5.4-7.7s / 7.7-9.0s /
9.0-12.0s median per-house clear, 19 records each.

### Selection rules (logic/rivalSkill.js)

1. A named `recordingID` always wins, so a rematch is the same race.
2. Recently raced opponents are set aside unless that would empty the pool.
3. The rest are ranked by distance from the player's own clear time; one is
   taken from the closest few by a hash of who is racing and how many races
   they have run. Same inputs, same pick; a new race, a new pick.

No opponent's pace is ever adjusted. Nothing filters for a win. A player faster
than the whole bank simply races the fastest recording. `adaptSkill` moves the
estimate at most a quarter of the way toward a raced opponent, symmetrically
for wins and losses. Fixed course seeds, immutable bank payloads and
independent player power selection are untouched.

### Skill evidence (logic/skillEvidence.js, utils/skillEvidence.js)

Per-house observations recorded beside the campaign clear, account-scoped under
`pr_skill_v1_<userID>`, separate from progression so losing it cannot touch
stash, REP, territory or story.

`activeMs` is the scene's own play clock and EXCLUDES the entrance map, contact
dialogue, city zooms, the loadout picker, settings and every paused frame. A
retried house reports its winning attempt as `activeMs` and every attempt in
`totalActiveMs`.

This record starts EMPTY for every existing save. Nothing backfills it. An
absent observation is absent, never zero, and `playerSkill` reports
`provisional` with a reason rather than a confident number built from nothing.

Watch this seam: `ProgressionManager` once called `noteHouseObservation`
without importing it, and the try/catch around it swallowed the ReferenceError
— evidence would never have been recorded in the live game, with every test
green. `test/contactFlow.test.mjs` now asserts the observation is recorded,
with its timing exclusions and retry totals.

### Unlock (utils/rivalsUnlock.js, MenuScene)

Three COMPLETE campaign blocks — 45 extracted stashes. Not reaching house 3,
not opening three blocks. Two sources are consulted: the new evidence, and the
campaign's own long-standing stash count, so a save that finished blocks before
any of this existed still qualifies. Never the reverse: a stash count alone
cannot stand in for blocks it did not complete. The menu row stays VISIBLE when
locked, with one short progress line and no popup.

### Copy

FINDING RIVAL / RIVAL FOUND / WATCH RIVAL. No recording vocabulary in routine
menu, search or result copy. No claim that anyone is online, no invented player
counts, no "live queue". A run with no match reads PACE TRIAL · NO RIVAL FOUND.
Provenance, hashes, driver versions and validation metadata stay intact
internally. `test/rivalsCopy.test.mjs` enforces this.
