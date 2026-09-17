# Claude: expand Plug Run's recorded rival drivers and bank

Continue on claude/input-intent-layer. Never touch master (live deployment).
Read HANDOFF_CODEX.md from the top, then RIVALS_CLAUDE_HANDOFF.md,
RIVALS_CITY_DESIGN.md and this document. Current shutdown/replay fixes supersede
older instructions about a top strip or locking player powers to opponent powers.

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

The older handoff mentions an assembler script, but none is maintained in the
current repository tree. Add a documented recorder/assembler CLI if needed;
do not invent a missing command or rely on one-off scripts only on your machine.
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
