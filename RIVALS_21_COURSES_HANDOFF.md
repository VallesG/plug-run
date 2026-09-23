# Handoff: 21 Block Rivals courses and full-coverage Jev banks

Written 2026-09-22 mid-task, to be picked up by another session. Read this
first, then `RIVALS_COURSES.md` (course table, how designed courses work,
city circuit, matchmaking, banks, plans) and `JEV_PROFILES_HANDOFF.md`.

For the current player-facing matchmaking redesign, read
`RIVALS_MATCH_PRESENTATION_HANDOFF.md`. That work is about the simulated PvP
presentation, not Jev drivers or bank recording.

## Release update (2026-09-22)

Everything below that says "uncommitted" is now committed on
`claude/rivals-21-courses` and pushed to origin; **not merged to master**.
On top of the three commits listed below:

- the Normal Jev profile;
- the 21 courses, the rival-first match lobby
  (`RIVALS_MATCH_PRESENTATION_HANDOFF.md`), planned stash seeds, variant plans
  and bank tools;
- a fix treating the site's HTML fallback (a missing bank file) as missing;
- the first Normal bank: `client/public/rivals/jev-v1/` holds 168 races, 8 on
  each of the 21 courses (the first 21 sealed jobs of `tools/plans/jev-v1.json`,
  assembled with `--fresh`, zero rejections, `v2` unchanged).

Ordinary players now meet Jev on every course. The Normal recorder keeps
running toward 128 per course; re-assemble `jev-v1` with `--fresh` from
`tools/recordings/jev/fresh-normal-v1` and commit the bank again.

## Where things stood before the release

Branch `claude/rivals-21-courses`, cut from `master` at `f62b67a`.

### Committed (3 commits)

1. `3ad6ac6` **Rival Hard bank.**
   - `client/public/rivals/jev-rival-hard-v1/` holds 7 races, one per
     original course (466.8s racing, 16 retries, 183 requests, $0.0075).
   - Bank provenance records the Jev profile; `jev-v1` refuses Apex and
     Rival Hard captures.
   - `rivalJevBank.test` covers all three Jev banks.
2. `9bcc221` **Replay power cues.** Replays play the live settings (phase
   0.7, dash 0.2 at 2.5×, decoy 0.4) and show a burst on dash and phase.
3. `646cd80` **Matchmaking and no rematch.**
   - A match without an explicit seed adopts its chosen rival's stash seed
     before house 1 starts (`rivalSession.resolveRivalOpponent` and
     `BaseGameScene.realignRivalStash`).
   - REMATCH is removed from the Rivals result screens.
   - The recording harness now presses New Race, which keeps the course in
     recording mode and draws a fresh stash seed.

### Uncommitted, all on disk and working

Run `git status` in the repo to see them.

**The 14 designed courses (slots 8–21):**
- `client/src/logic/rivalCourseDesigns.js` (data);
- `client/src/logic/rivalCourseAnalysis.js` (routes, chokes, alternatives,
  lanes, phase shortcuts);
- `generateDesignedMaze` plus the objective `bias` in
  `client/src/utils/mazeGenerator.js`;
- pool wiring in `client/src/logic/rivals.js` (`rivalHouseMazeOptions`,
  `rivalHouseDesign`);
- per-course board size and layout in `BaseGameScene.init` and
  `generateObjects`;
- layout lookup in `RivalReplayPlayer`, `rivalSession` (simulated pace) and
  `tools/jev-report.mjs`.

The legacy generator is byte-identical: the original 49 houses and 600 other
seeds hash the same as before.

**City circuit.** `rivalCity.js` and `rivalCityProgress.js`: city 1 is courses
1–7, city 2 is 8–14, city 3 is 15–21, then it wraps. Circuit names are in
`RIVAL_CITY_NAMES`.

**Planned stash seeds** (needed for full coverage):
- `installBotDriver.js` reads `stashSeeds=`, and race N of a page gets seed N.
  Both the menu start and New Race (`harnessRestartData` wrap) carry it.
- `BaseGameScene` passes `stashSeed: initData?.rivalStashSeed`.
- `tools/rivals-record.mjs` passes `job.stashSeeds`, tags planned jobs with
  `-i<indexBase>` so `--resume` works, and refuses any `--jevProfile` other
  than apex, rival or rival-hard.

**Tools:**
- `tools/rivals-course-report.mjs` (the course table: `--markdown`, `--slot N`);
- `tools/rivals-bank-report.mjs` (per-bank, per-course variant counts against
  a target of 128);
- `tools/rivals-variant-plan.mjs`, the full-coverage Jev plans.
- `tools/rivals-plan.mjs` is the ORIGINAL older bot-plan tool. I overwrote it
  by mistake and restored it from git; it must stay unchanged.

**Plans in `client/tools/plans/`.** Each plan has one race per seven-house
stash pattern (128) per course, over 21 courses, with 5 loadouts rotating and
8 races per job:

| Plan | Races | Bank |
|---|---|---|
| `jev-apex-v1.json` | 2,688 | `jev-apex-v1` |
| `jev-rival-hard-v1.json` | 2,688 | `jev-rival-hard-v1` |
| `jev-v1.json` | 2,688 | `jev-v1` |

The `jev-v1` plan uses profile `normal`, which **is not built yet**, and the
recorder refuses it until it is. Seeds differ per profile, and opponent index
blocks are apex 100000, hard 200000, normal 300000, plus 1000 per slot.

**Tests updated or added:**
- `rivalCourses` (21 courses; pins the original 49 houses AND the 98
  designed houses: current designed pin `a14e8f42…`);
- `rivalCity`, `rivalStashReroll`, `rivalMatchmaking`, `rivalsFlow`, `cityFlow`;
- `cityEntry` (harness binding), `rivalBank`, `rivalBankPrune` (only the
  courses they hold);
- `rivalReplayView` (power cues);
- `rivalVariantPlan` (new, in the `package.json` chain).

**Docs:** `RIVALS_COURSES.md` (new), `JEV_PROFILES_HANDOFF.md` (updated),
`client/tools/README.md` (tool list).

**Direction from the user: Jev only.** Ordinary style bots are no longer
recorded. The legacy `v2` bank stays in place but has no match stash rules,
so it can never be matched.

## Verified

- All Rivals tests pass, and `npm run build` succeeds.
  - The full chain was run test by test in an LF worktree. The only failure
    is `cityEntry`'s "real resize guard seam found", which fails identically
    on clean `master` `f62b67a`.
  - Since then the course pin, Rooftop Relay and the plans changed, so run
    the full check again before committing.
- Jev on designed courses:
  - Rival Hard, Crosstown Loop: 7/7, 48s, 0 retries.
  - Apex, Ember Alley: 7/7, 69s, 0 retries.
  - Rival Hard, Rooftop Relay, from the plan with planned seeds: two races,
    7/7 in 51s and 60s, 0 retries. Each captured record's `stashSeed` equals
    its planned seed.
- Bot smoke runs (now abandoned by choice) exposed loop houses. The fix was a
  new acceptance rule (`minPlugGapNoAlt`: no plug within 4 steps of a leg that
  has no separate corridor) plus a Rooftop Relay retune. After the fix, 13 of
  14 bot races won; the one forfeit was Rooftop with the weak Balanced bot,
  retuned since and then cleared by Jev.

## Next steps, in order

1. **Re-verify.** From `client/`: `node test/rivalCourses.test.mjs`,
   `node test/rivalVariantPlan.test.mjs`, the other Rivals tests, and
   `npx vite build`. For the full chain, use an LF worktree:
   `git -c core.autocrlf=false worktree add …`, junction `node_modules`,
   run each test in the `package.json` chain individually. `cityEntry` fails
   pre-existing.
2. **Commit in focused commits.** Suggested:
   - designed generator + analysis + designs + pool wiring + scene/replay/
     session layout + course tests + course report;
   - city circuit;
   - planned stash seeds (harness, scene, recorder) + variant plan tool +
     plans + plan test + bank report;
   - docs.

   **Line endings:** the committed blobs mix CRLF and LF, and edits rewrote
   whole files, so plain `git add` produces large whitespace-only diffs. I
   staged with a helper that keeps each untouched line's original ending and
   can pick hunks. It is recreated below. After the last commit,
   `git diff --ignore-cr-at-eol` should be empty; then
   `git checkout -- .` clears the line-ending-only noise.
3. **Push and merge.** Push `claude/rivals-21-courses`, then merge into
   `master` and push.
4. **Record the banks,** sequential, from a fixed build (`npm run build`,
   `npx vite preview --host 127.0.0.1 --port 4174 --strictPort`), with
   `TYPESAFE_API_KEY` set. Never print it.
   ```
   node tools/rivals-record.mjs --plan tools/plans/jev-rival-hard-v1.json --jev --jevProfile rival-hard --jevMaxRequests 2000 --jevMaxInputTokens 4000000 --jevTimeoutMs 15000 --url http://127.0.0.1:4174 --out tools/recordings/jev/rival-hard-v1 --resume
   node tools/rivals-record.mjs --plan tools/plans/jev-apex-v1.json --jev --jevProfile apex --jevMaxRequests 2000 --jevMaxInputTokens 4000000 --jevTimeoutMs 15000 --url http://127.0.0.1:4174 --out tools/recordings/jev/apex-v1 --resume
   ```
   - Measured cost is about $0.0007–0.0025 a race, so roughly $4–5 per
     2,688-race plan.
   - Time is about 1–2 minutes a race, so a plan takes days of wall clock.
     Jobs round-robin across courses, so a partial run is still useful.
   - Assemble with `node tools/rivals-assemble-jev.mjs --profile <apex|rival-hard> --in <dir> --dry`
     (then without `--dry`). Check `node tools/rivals-bank-report.mjs`.
   - The two planned test races are in `tools/recordings/jev/plan-e2e/`
     (git-ignored). They can be assembled into Rival Hard.
5. **Normal Jev** (`jev-v1`) needs its softer profile designed and built first
   (see `JEV_PROFILES_HANDOFF.md`). Then allow `normal` in the recorder's
   profile check and in `makeJevStrategist`, and record `tools/plans/jev-v1.json`.
6. **Open decisions for the user:**
   - Ordinary matchmaking reads only `v2` and `jev-v1`. Both have zero
     matchable recordings, so players get a simulated pace until `jev-v1` is
     recorded.
   - Apex and Rival Hard are intentionally outside ordinary matchmaking, and
     still need a UI entry point.

## Rules that still apply

- Never print or commit `TYPESAFE_API_KEY`.
- Never hand-edit recordings, hashes, times or replay events.
- Don't alter Apex or Rival Hard behaviour.
- Don't mix profile banks.
- Never change the original seven courses; the test pins them.
- Changing a designed course retires its recordings, so update the designed
  pin only on purpose.
- Jev never outputs movement, and only remembers what it saw in the current
  match.

## Staging helper (keeps original line endings)

A copy is at `stage-min.cjs` in the repo root (untracked; do not commit it). Run it from the repo root:
`node stage-min.cjs <path> [--only "marker1|marker2"]`.
It stages the file's real content changes, or only hunks containing a
marker. It diffs line by line on CR-stripped text, keeps HEAD's bytes for
unchanged lines, and writes the blob with
`git hash-object -w --no-filters` + `git update-index --cacheinfo`. The
If it is missing, a plain
`git add` is acceptable; the diffs are just noisier.
