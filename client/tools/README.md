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
| `--slot` | – | pinned course slot, 1-7 |
| `--style` | – | driver style from `RIVAL_DRIVER_STYLES` |
| `--powers` | – | ordered mix, e.g. `phase,dash`, `dash,dash`, `decoy,phase` |
| `--runs` | 1 | races per job |
| `--plan` | – | JSON job list; overrides the single-job flags |
| `--parallel` | 1 | concurrent browsers |
| `--url` | `http://127.0.0.1:5173` | served game |
| `--out` | `tools/recordings` | output directory |
| `--width` / `--height` | 390 / 844 | viewport — full-height phone layout |
| `--hardLimitMs` | per style | give-up point for one race |

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
| `tools/rivals-assemble.mjs` | validates, reports coverage, writes the bank |
| `tools/recordings/` | raw captures (git-ignored, intermediate) |
| `public/rivals/v2/` | the shipped bank |

`test/rivalBank.test.mjs` validates whatever is shipped. It must stay green.
