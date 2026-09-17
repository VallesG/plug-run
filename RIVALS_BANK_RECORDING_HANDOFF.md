> New Decoy-first experiment and human retry power-switch details are at the
> top of CLAUDE_RIVALS_BOT_BANK_HANDOFF.md. Existing recording jobs still
> auto-retry with their fixed mix; do not change a running static build.
> New capture supports truthful optional per-attempt mixes, but no adaptive
> BotDriver retry policy has been implemented yet.

# Resuming the Block Rivals bank recording

Standalone. Written so a fresh agent or a human can pick this up cold, without
reading the session that started it. Branch: `claude/input-intent-layer`.
**Never touch `master` — it deploys the live game.**

Last verified state: commit `0efc537`, `npm run verify` green (52 suites, build
~19s, bundle 3.08 MB / gzip 768 kB). All CODE is committed and pushed. The BANK
is not — it is still being recorded and that is the only work left.

---

## 1. What this is

Block Rivals opponents are **real recorded races**, not simulated times. Each
one was produced by the in-game BotDriver harness driving the same scene a
player drives, through the same `InputIntent.driveMove` seam. The bank is short
and needs more races, spread across more courses, driver styles and power mixes.

**The target: at least 20 valid COMPLETE races per course, on all seven pinned
courses.** Report the real number. Never pad it.

### Non-negotiables

- Never manufacture a time, edit a recorded frame, re-hash a record, or promote
  a partial capture. A race that did not finish is not a race: the recorder
  discards it, the assembler rejects it, and the coverage report shows the gap.
- Never decorate a record after capture — the payload hash breaks and
  `validateRivalRunRecord` rejects it. That check is correct; do not work
  around it.
- Bots get no immunity, no teleport, no stash knowledge. Retries, bunk pickups
  and inefficient decisions stay exactly as recorded.
- A short bank reported honestly is a success. A padded bank is a failure.

---

## 2. Where the recording stands

**All seven courses are at the 20-record checkpoint.** Measured from
`tools/rivals-assemble.mjs --dry`, not from arithmetic:

| slot | course | records | styles | mixes |
| --- | --- | --- | --- | --- |
| 5 | Switchyard Seven | 27 | 11 | 7 |
| 3 | Freight Run | 25 | 11 | 6 |
| 6 | Lastlight Loop | 25 | 11 | 6 |
| 1 | Low End Rush | 24 | 11 | 5 |
| 2 | Copper Climb | 24 | 11 | 5 |
| 4 | Afterglow Mile | 24 | 11 | 5 |
| 7 | Blacktop Crown | 22 | 11 | 6 |

**171 accepted, 11 rejected, 116 re-imported.** All 11 rejections are genuine
forfeits. "Re-imported" means a byte-identical record was read from both the
bank and the raw capture that produced it — a no-op, not a failure. Do not read
it as loss: an earlier version of the assembler counted those as rejections and
reported 127 failures on a clean run.

Switchyard Seven went from worst-covered (16, four short) to best-covered, and
now carries every style: Ghost was absent there until it went 3/3 on
`decoy,phase` after 0/2 on `phase,dash`.

Raw captures live in `client/tools/recordings/` (git-ignored) and may not
survive the container. The shipped bank in `client/public/rivals/v2/` is the
durable artefact; if the captures are gone, nothing is lost but the ability to
re-assemble from source.
## 3. How to resume

```sh
cd client

# 1. Build and serve a STATIC build. Not `npm run dev` — see the warnings below.
npm run build
npx http-server dist -p 4173 --silent &

# 2. Confirm the served bundle actually has the harness in it.
grep -c "RIVALS-REC" dist/assets/*.js      # must be 1, not 0

# 3. Record. --resume skips jobs whose output already exists.
node tools/rivals-record.mjs --plan tools/rivals-plan.json --parallel 3 \
  --url http://127.0.0.1:4173 --out tools/recordings --resume > /tmp/bank.log 2>&1 &

# 4. Watch it. Do not poll in a tight loop; this takes hours.
tail -f /tmp/bank.log | grep -E "saved |REJECTED|job failed"
```

Full flag reference: `client/tools/README.md`.

### If a second machine is helping

Partition by **style**, never by course — every style covers all seven courses,
so neither machine leaves a course nobody recorded. Two machines recording the
same style is duplicated hours, not more coverage.

The split in use: the second machine takes `rookie`, `erratic` and `trickster`
(`client/tools/rivals-plan-codex.json`, 21 jobs / 42 races, indexBase 1000+ so
recording IDs cannot collide). This machine then resumes with the other five:

```sh
node tools/rivals-plan.mjs --styles cautious,ghost,dasher,balanced,sharp \
  > tools/rivals-plan.json
node tools/rivals-record.mjs --plan tools/rivals-plan.json --parallel 3 \
  --url http://127.0.0.1:4173 --out tools/recordings --resume
```

**Only one machine runs the assembler**, over both machines' captures in a
single pass. Two assemblers would fight over the same bank files.

`CODEX_BANK_RECORDING_PROMPT.md` is the ready-made brief for the second agent.

### Then assemble and report

```sh
node tools/rivals-assemble.mjs --in tools/recordings --dry   # report, writes nothing
node tools/rivals-assemble.mjs --in tools/recordings         # writes the bank
npm run verify                                               # rivalBank.test.mjs must stay green
```

The dry run prints coverage per course, per measured band and per power mix
with the shortfall against 20. **Report those numbers verbatim.** Every
candidate is validated with the client's own functions
(`validateRivalRunRecord`, `rivalRecordMatchesCourse`,
`validateRivalReplayBundle`, `validateReplaySegment`); failures are reported,
not repaired. Existing entries are kept unless a replacement validates, so a bad
batch cannot shrink the shipped pool.

---

## 4. Five things that will cost you hours

**Record against a static build, not the dev server.** Vite HMR restarts an
in-flight race on every source edit. A whole batch was lost this way: run 1
reloaded every ~122s, forever.

**Check the served bundle before a long batch.** An interrupted `npm run build`
leaves a stale `dist`, and a multi-hour batch will happily record the old code.
`grep -c "RIVALS-REC" dist/assets/*.js` takes one second.

**Don't run `npm run build` while recording.** A concurrent build dropped the
measured frame rate from ~54 to ~50fps. Renderer speed changes what the bot can
do. Run `npm test` alone while a batch is live; save `verify` for after.

**The harness needs its own loadout entry.** The record entrance sits on the
real loadout picker, which the modal auto-clicker cannot drive — recordings sat
at `status:'ready'` forever. `installBotDriver.js` patches
`RivalsRace.prototype.openLoadout` in RECORD MODE ONLY. Do not remove it, and do
not let it run outside record mode.

**Hard limits must match measured pace.** A limit is a give-up point for one
race; it is never written into a record. Rookie reached house 3 of 7 in **785s
on the easiest course**, so its original 780s limit could never produce a
complete Rookie race — 14 guaranteed failures were queued behind it. Limits now
live in `tools/rivals-plan.mjs` and are derived from measurements.

---

## 5. Measured numbers (use these, don't re-guess)

Chromium **Canvas** (`--disable-gpu`), 390×844, 3 parallel workers, 47–59fps.
WebGL through swiftshader ran at 9–18fps and changed bot results — do not use
it. Every output file records its own `environment.renderer`, `fpsMedian` and
`fpsSamples`, so a slow batch is visible afterwards.

| style | limit | measured |
| --- | --- | --- |
| cautious | 1080s | seven houses in 167s, 214s, 220s, 238s, 240s |
| ghost | 960s | seven houses in 293s |
| erratic | 1200s | seven houses in 388s |
| rookie | 2400s | reached house 3 of 7 in 785s under the old 780s limit; now clears seven houses in 107-196s |
| dasher / balanced / sharp / trickster | 840–1080s | all complete reliably except Sharp on Switchyard Seven (1/5) |

Rookie is the clearest case that a limit is not a ceiling: it produced nothing
but forfeits at 780s and now finishes in under two minutes.

**Limits were doubled after the first set proved too tight.** The first set was
derived from slot 1, the easiest course. Measured on harder ones: Cautious
forfeited at house 4 of 7 on Switchyard Seven at 545s against a 540s limit, and
Ghost at house 6 of 7 on Blacktop Crown at 485s against a 480s limit. In both
the bot was still progressing when the clock ran out, so the limit — not the
bot — was the binding constraint.

Doubling costs almost nothing. A limit only binds on a race that would otherwise
be REJECTED, and completed races have a median of 145s, so the change converts
near-misses into valid records rather than halving throughput.

**Pace spread, cut from the bank's own benchmarks** (median per-house clear):

| band | range | records |
| --- | --- | --- |
| fast | 5.4-7.9s | 57 |
| middle | 7.9-9.6s | 57 |
| steady | 9.6-15.6s | 57 |

The steady ceiling was 12.0s before this work and is now 15.6s: slow,
mistake-prone opponents are in the bank, not only quick ones. That is the whole
point of the spread — it is who a weak player gets matched against.

**Diversity.** Eleven driver identities on every course (street, hustler, ace
plus the eight styles), five to seven ordered power mixes per course including
duplicates (`dash,dash`, `phase,phase`, `decoy,decoy`) and every Decoy pairing.

**Per-course elapsed and retries** (min/median/max), from the assembler:
Freight Run 72/128/633s and 1/9/76 retries at the quick end; Switchyard Seven
150/441/862s and 8/50/114 retries at the punishing end. One Switchyard Seven
forfeit logged 136 retries before running out of clock.

**Completion rate.** The main 112-race plan returned 92 valid of 98 attempted
across 49 jobs. The Switchyard Seven top-up returned 11 of 15. Renderer was
Chromium Canvas throughout at 47-59fps across 3 workers; every output file
carries its own renderer and fps.

### Switchyard Seven: what actually fixed it

Slot 5 was four short and is now the best-covered course. What worked, and what
did not, measured rather than assumed.

**Raising the time limit did not work.** The same job was re-run under both
limits and produced the identical result:

```
slot5-ghost-phasedash   485s -> forfeit 4/7   (480s limit)
slot5-ghost-phasedash   965s -> forfeit 4/7   (960s limit)
```

Twice the clock bought zero extra houses. Reading the stop point as the
obstacle was the mistake: attempt counts on races that DID finish show houses
2 and 5 absorbing 17-64 attempts while every other house takes 1-3. A race
that forfeits "at 4/7" burned its clock on **house 2** and ran out later.

**Changing the power mix did work.** On Switchyard Seven, across every capture:

| mix | completed |
| --- | --- |
| contains decoy | 13/13 (100%) |
| no decoy | 9/18 (50%) |

Style is controlled in three of those comparisons — each style against itself,
same course, same limit, only the mix differing:

| style | with decoy | without decoy |
| --- | --- | --- |
| Ghost | 3/3 | 2/5 |
| Cautious | 3/3 | 1/2 |
| Erratic | 3/3 | 1/2 |

Erratic and Cautious are among the weaker, mistake-prone styles, so this is not
an artefact of strong drivers happening to carry Decoy. Sharp on `dash,dash`
went 1/5 there.

**What this is NOT.** Swapping Decoy in also swaps a Phase or Dash out, so part
of the effect may be the absence of the other power rather than the presence of
Decoy. Samples are small and nothing was randomised. Treat it as a strong
working rule for filling a hard course, not as an established mechanism.

**So: to fill a stubborn course, vary the MIX and add RUNS. Do not reach for a
longer limit — it is measured not to help.**

### Opening Decoy (openingDecoy)

`openingDecoy` did NOT exist before this session; it was one sentence in
`CLAUDE_RIVALS_BOT_BANK_HANDOFF.md`. Adaptive power switching still does not
exist. Check before building on any proposal in these documents.

What the game does on its own: `RunnerAI.considerRunnerPowerUse` fires Decoy
purely REACTIVELY — a defender within 18 cells and no decoy live. Nothing fires
it at the start of a house.

`BotDriver.openingDecoy` (default OFF) fires one held Decoy per house through
`scene.activateRunnerPowerByIndex`, the same call a player's tap reaches. It
never touches the loadout picker, and `update()` has already returned on
`roundOver` and `roundPausedForMenu` before it can run, so it cannot fire
before play is live. It spends a real power, so the race has one fewer Decoy
later — that is the trade being measured, not a bonus. Enable per job with
`"openingDecoy": true`, or by hand with `?openingDecoy=1`. It is written into
`driverConfig`, so a bank entry always says whether it was driven with one, and
it is part of the job tag so an A/B pair does not collapse to one tag under
`--resume`.

**Result: not yet known.** `tools/rivals-plan-decoy-ab.json` is four matched
pairs, 24 races, identical style/mix/course/limit on both sides with only the
flag differing — which is what the observational split above cannot give you.
It is run WITHOUT `--resume`, so both arms are captured on one build. If it is
unfinished, re-run it whole rather than resuming half of it against an older
build.

## 6. Remaining jobs and exact resume commands

The 20-per-course checkpoint is MET. What is left is the opening-Decoy
experiment and any further diversity work.

```sh
cd client
# Serve the build the workers will use. Do NOT rebuild once workers are live.
npm run build
npx http-server dist -p 4173 --silent &
grep -c "RIVALS-REC" dist/assets/*.js     # must be 1
grep -c "opening decoy" dist/assets/*.js  # must be 1 for the A/B

# The matched opening-Decoy A/B. Run it WHOLE, no --resume: both arms must
# share one build, and the control tags collide with existing captures.
node tools/rivals-record.mjs --plan tools/rivals-plan-decoy-ab.json \
  --parallel 3 --url http://127.0.0.1:4173 --out tools/recordings

# Top up any course, by mix and runs rather than by a longer limit.
node tools/rivals-plan.mjs --slots 5 --styles ghost,cautious --runs 3 \
  --indexBase 4000 > tools/rivals-plan-topup.json
node tools/rivals-record.mjs --plan tools/rivals-plan-topup.json \
  --parallel 3 --url http://127.0.0.1:4173 --out tools/recordings --resume

# Assemble and report. --dry writes nothing.
node tools/rivals-assemble.mjs --in tools/recordings --dry
node tools/rivals-assemble.mjs --in tools/recordings
npm run verify        # rivalBank.test.mjs must stay green
```

Reading the A/B afterwards: each record carries `driverConfig.openingDecoy`,
and treatment files are tagged `-odecoy`. Compare completion rate, elapsed and
retries between the arms of each pair, not across pairs.

## 7. Outstanding checks and open risks

**Build consistency.** Every capture in the bank so far was recorded against a
single build per batch, and `dist` was never rebuilt under live workers. Keep
it that way: run `npm test` alone while a batch is live and save
`npm run verify` (which builds) for when workers are idle.

**openingDecoy is unproven in a browser.** The flag has unit coverage (13
assertions in `botDriver.test.mjs`) and the URL and config chain were read
end to end, but at the time of writing no completed opening-Decoy race had been
inspected. Verify from the data before trusting it: a treatment record must
show `driverConfig.openingDecoy === true`, and the per-job log line reports how
many times it fired. Note the counter only prints when a JOB finishes, so
mid-job silence means nothing.

**Deployment size is the live risk.** `dist` is now 67 MB, of which the bank is
41 MB, essentially all replays (171 files). This is past the ~69 MB that caused
trouble before. Replays are fetched per opponent, so runtime is unaffected, but
the deploy is not. No races were dropped to make this smaller — it needs a
decision, and the options are pruning per-course depth, compressing replays, or
hosting them off the deploy.

**No phone or browser pass has been done** on: the locked Block Rivals menu row,
the calibrated search, rival replay playback, or whether a runner drawn 2-3
cells outside the arena is visible (the replay off-grid margin is now 3 cells,
raised from 1 after it was discarding 28% of valid races).

**Unrelated but still open:** the Cash ledger truncation hazard.
`createWindowState` does `ledger.slice(-200)` and derives BOTH the balance and
the duplicate guard from the survivors, so a long ledger silently loses balance
and duplicate protection. The reward seam stays closed until that is fixed.

## 8. Further reading, in order

1. `client/tools/README.md` — the command surface, every flag.
2. `CLAUDE_RIVALS_BOT_BANK_HANDOFF.md` — bank/course contract, driver styles,
   and the matchmaking + unlock rules.
3. `RIVALS_CLAUDE_HANDOFF.md` — what landed and why, newest entry first.
4. `HANDOFF_CODEX.md` — the running project log, newest entry first.

Two rules from those docs that bite newcomers: **a new test suite is not run
until it is added to the explicit `&&` chain in `package.json`**, and
**`node --check` cannot catch a call to an unimported function** — that bug
shipped once and `test/unresolvedCalls.test.mjs` now guards it.
