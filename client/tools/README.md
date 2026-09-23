# Rivals bot bank: recording and assembly

The Block Rivals bank is a set of **real recorded races**. Every entry was
produced by the in-game BotDriver harness driving the same scene a player
drives, through the same `InputIntent.driveMove` seam. No time is written by
hand, no frame is edited, no bot is given information a player would not have,
and no record is decorated after capture (the payload hash would break, and
`validateRivalRunRecord` would reject it — by design).

If you only read one thing: **a race that did not finish is not a race.** The
recorder discards it, the assembler rejects it, and the coverage report shows
the gap. A short bank is honest; a padded one is not.

## 1. Serve a build

Record against a **static build**, not the dev server. Vite's HMR restarts an
in-flight race whenever a source file changes, which silently costs hours.

```
npm run build
npx http-server dist -p 4173 --silent    # or any static server
```

## 2. Record

```
# one job
node tools/rivals-record.mjs --slot 1 --style rookie --powers phase,dash --runs 2 \
  --url http://127.0.0.1:4173 --out tools/recordings

# the full plan (56 jobs x 2 runs = 112 races)
node tools/rivals-record.mjs --plan tools/rivals-plan.json --parallel 3 \
  --url http://127.0.0.1:4173 --out tools/recordings
```

| flag | default | meaning |
| --- | --- | --- |
| `--slot` | – | pinned course slot, 1-21 (see `RIVALS_COURSES.md`) |
| `--style` | – | driver style from `RIVAL_DRIVER_STYLES` |
| `--powers` | – | ordered mix, e.g. `phase,dash`, `dash,dash`, `decoy,phase` |
| `--runs` | 1 | races per job |
| `--plan` | – | JSON job list; overrides the single-job flags |
| `--parallel` | 1 | concurrent browsers |
| `--url` | `http://127.0.0.1:5173` | served game |
| `--out` | `tools/recordings` | output directory |
| `--width` / `--height` | 390 / 844 | viewport — full-height phone layout |
| `--hardLimitMs` | per style | give-up point for one race |
| `--resume` | off | skip only complete, valid jobs already captured in `--out` |

A long batch may be interrupted. `--resume` reads `--out` and skips a job only
when a matching capture finished every planned race successfully with Jev still
active. Partial, aborted and malformed captures are retried. Recording a job
twice is harmless: the bank assembler deduplicates recordings.

**Renderer.** Chromium Canvas (`--disable-gpu`). WebGL through swiftshader ran
at 9-18fps in this container, which changes what the bot can do; Canvas holds
~55fps. Every output file records `environment.renderer`, `fpsMedian` and
`fpsSamples`, so a slow batch is visible afterwards instead of quietly
producing unrepresentative races.

**Chromium binary** is found via `PLUGRUN_CHROMIUM`, then
`PLAYWRIGHT_BROWSERS_PATH`, then the usual system paths.

**Cost.** Roughly 3-7 minutes per valid race at ~55fps, slower for the
mistake-prone styles (they retry more, which is the point). Budget accordingly
before starting a full plan.

## 3. Assemble

```
node tools/rivals-assemble.mjs --in tools/recordings --dry   # report only
node tools/rivals-assemble.mjs --in tools/recordings         # write the bank
```

Each candidate passes `validateRivalRunRecord`, `rivalRecordMatchesCourse`,
`validateRivalReplayBundle` and `validateReplaySegment` — the client's own
functions. Failures are **reported, not repaired**. Existing shipped entries
are kept unless a replacement validates, so a bad batch cannot shrink the pool.

Output: `public/rivals/v2/manifest.json`,
`public/rivals/v2/courses/<courseID>/opponents.json`,
`public/rivals/v2/replays/<recordingID>.json`.

The dry run prints coverage per course, per measured band and per power mix,
with the shortfall against the 20-per-course target. Report that number as it
comes out.

## Bands are measured, not named

A band is a range of **measured median seconds-per-house**, cut from the bank's
own spread into three equal-population groups. Nothing is labelled "hard"
because of the style it was driven with: a Sharp run that went badly sits with
the slow ones, where it belongs. Change the bank and the bands move with it.

## What lives where

| path | role |
| --- | --- |
| `tools/rivals-record.mjs` | drives the harness, writes raw captures |
| `tools/rivals-plan.json` | the job list: slots x styles x power mixes |
| `tools/rivals-variant-plan.mjs` | writes the variant plans in `tools/plans/` (many opponents per course, all 21 courses, any profile) |
| `tools/rivals-bank-report.mjs` | per course, per bank: matchable variants against target, distinct stash seeds and patterns, loadouts, time spread, duplicates |
| `tools/rivals-course-report.mjs` | every course, house by house: board, structure, run length, chokes, alternatives, lanes, phase shortcuts, plug pressure |
| `tools/rivals-assemble.mjs` | validates, reports coverage, writes the bank |
| `tools/recordings/` | raw captures (git-ignored, intermediate) |
| `public/rivals/v2/` | the shipped bank |

`test/rivalBank.test.mjs` validates whatever is shipped. It must stay green.

## Conservative deployment pruning

Run `node tools/rivals-prune.mjs` from client/ for a read-only coverage/bytes
report. Apply with `--write --archive-key <fresh-key> --source-commit <sha>`.
The tool retains at least 20 per course while preserving styles, ordered mixes,
opening-Decoy arms, measured-band coverage and timing/retry extremes. It validates
every source bundle before changing anything and archives removed bundles plus
original metadata in `client/rivals-bank-archive/`, never public/ or dist.
No captured payload is rewritten. Re-running on the curated bank is a no-op.
Assembly can re-import redundant raw captures: prune after assembly, then run
`npm run verify`. See RIVALS_BANK_RECORDING_HANDOFF.md for recovery instructions.
# Normal Jev calibration (raw captures, no bank write)

`node tools/rivals-normal-report.mjs --in tools/recordings/jev/normal-pilot`
prints valid races, median/range, retries and how many land in the 110-120s
target for each course. Run this after a small Normal-profile plan, before
assembling `jev-v1`. A single race cannot establish a course's difficulty.

## Full fresh Jev variant banks

The three plans in `tools/plans/` cover 128 stash-answer patterns on each of
21 courses, or 2,688 races per profile and 8,064 in total. Each eight-race job
gets its own planned stash seeds. A stash answer remains fixed on retry within
one race, while a new match can select a different answer pattern. Normal,
Apex and Rival Hard record into separate raw folders and banks.

After building and starting a server, run `tools/run-jev-variant-banks.ps1`
from PowerShell with `TYPESAFE_API_KEY` set. It records Normal, Apex and Rival
Hard sequentially, resumes only complete jobs, retries incomplete jobs up to
three passes, and assembles a bank only after all 2,688 planned races for that
profile are present and accepted. It does not record MP4s for every race; the
replay traces are the bank data. Raw captures and logs stay git-ignored under
`tools/recordings/jev/fresh-*`.

Check progress without touching the running recorder:

`node tools/rivals-variant-progress.mjs --plan tools/plans/jev-v1.json --out tools/recordings/jev/fresh-normal-v1`

If a batch stops, run the same launcher again; `--resume` retains completed
jobs. The existing ordinary `public/rivals/v2` bank is never modified.

## Players' shared races (players-v1)

A player can tick SHARE MY RUN in the Block Rivals lobby, per race. A
finished seven-house race is then sent to `netlify/functions/rivals-run.mjs`,
which checks it (`src/logic/rivalPlayerRuns.js`: the bank validators, the
course's own houses rebuilt from their seeds, the match's one stash seed,
genuine pickups, walking pace, dash-sized bursts only at a dash, no standing
in walls without phasing, powers once per slot) and holds it as pending in
the site's Netlify Blobs store under the player's display name. Nothing is
published by the submission.

    node tools/rivals-assemble-players.mjs --pull tools/recordings/players/pending
    node tools/rivals-assemble-players.mjs --in tools/recordings/players/pending --dry
    node tools/rivals-assemble-players.mjs --in tools/recordings/players/pending
    node tools/rivals-assemble-players.mjs --report

`--pull` needs `NETLIFY_SITE_ID` and `NETLIFY_AUTH_TOKEN`. Review the
downloads, then bank and commit `client/public/rivals/players-v1/`. The bank
keeps the newest three runs per player per course, writes nothing else, and
is in no matchmaking pool until it holds 500 runs.
