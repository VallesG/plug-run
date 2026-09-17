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

Shipped bank before this batch: **57 records**, per course:

| slot | course | shipped | short of 20 |
| --- | --- | --- | --- |
| 5 | Switchyard Seven | 5 | 15 |
| 7 | Blacktop Crown | 7 | 13 |
| 2 | Copper Climb | 8 | 12 |
| 4 | (slot 4) | 8 | 12 |
| 3 | Freight Run | 9 | 11 |
| 6 | Lastlight Loop | 9 | 11 |
| 1 | Low End Rush | 11 | 9 |

The plan `client/tools/rivals-plan.json` is **56 jobs / 112 races** — 8 styles ×
14, 16 per course, across 8 ordered power mixes including duplicates and every
Decoy pairing. If they all complete, every course lands at 21–27.

**Progress when this was written: 4 jobs saved, 8 races complete, 1 rejected.**
Raw captures live in `client/tools/recordings/` (git-ignored). They may or may
not still be on disk — the container is ephemeral. **If that directory is empty,
the recording starts from scratch**; nothing is lost but time, and the shipped
57 records are untouched in `client/public/rivals/v2/`.

---

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

Chromium **Canvas** (`--disable-gpu`), 390×844, 3 parallel workers, ~50–54fps.
WebGL through swiftshader ran at 9–18fps and changed bot results — do not use
it. Every output file records its own `environment.renderer`, `fpsMedian` and
`fpsSamples`, so a slow batch is visible afterwards.

| style | limit | measured |
| --- | --- | --- |
| cautious | 1080s | seven houses in 167s, 214s, 220s, 238s, 240s |
| ghost | 960s | seven houses in 293s |
| erratic | 1200s | seven houses in 388s |
| rookie | 2400s | reached house 3 of 7 in 785s (easiest course) |
| dasher / balanced / sharp / trickster | 840–1080s | not yet individually measured |

**Limits were doubled after the first set proved too tight.** The first set was
derived from slot 1, the easiest course. Measured on harder ones: Cautious
forfeited at house 4 of 7 on Switchyard Seven at 545s against a 540s limit, and
Ghost at house 6 of 7 on Blacktop Crown at 485s against a 480s limit. In both
the bot was still progressing when the clock ran out, so the limit — not the
bot — was the binding constraint.

Doubling costs almost nothing. A limit only binds on a race that would otherwise
be REJECTED, and completed races have a median of 145s, so the change converts
near-misses into valid records rather than halving throughput.

Completed-race durations so far: n=8, min 81s, median 145s, max 240s.
Completion rate so far: **8 complete, 1 rejected (~89%)**. The rejection was
Cautious with `phase,phase` on Switchyard Seven, forfeited at 4/7 — a genuine
incomplete race, correctly discarded. One sample is not enough to justify
raising that style's limit; track the rate and decide on evidence.

### Switchyard Seven (slot 5) needs its own top-up run

Measured across the batch so far, rejections are **not** spread evenly:

| slot | complete | rejected |
| --- | --- | --- |
| 5 (Switchyard Seven) | 1 | 2 |
| every other course | 11 | 0 |

Both slot-5 forfeits stopped at **house 4 of 7, within seconds of their style's
clock limit** (Cautious 545s against a 540s limit, Ghost 485s against 480s).
That shape matters: the bots were still progressing when the clock ran out, not
stuck repeating one fatal route. They ran out of time, not out of ability.

This is a real coverage problem, because slot 5 is also the **neediest** course
— 5 shipped records, 15 short of the target. At the observed rate its 16
planned races would yield roughly 5, leaving it near 10 rather than 20.

**Update:** limits have since been doubled batch-wide (see above), which may
close this on its own — Ghost reached 6/7 and Cautious 4/7 purely on the clock.
Re-measure slot 5 from the assembler before deciding. If it is still short after
the main batch, run a targeted top-up:

```sh
node -e "const p=require('./tools/rivals-plan.json');
  require('fs').writeFileSync('tools/rivals-plan-slot5.json',
    JSON.stringify(p.filter(j=>j.slot===5).map(j=>({...j,
      hardLimitMs:Math.round(j.hardLimitMs*2), indexBase:j.indexBase+5000})),null,1));"
node tools/rivals-record.mjs --plan tools/rivals-plan-slot5.json --parallel 3 \
  --url http://127.0.0.1:4173 --out tools/recordings
```

Do this as a SEPARATE top-up rather than restarting the main batch — recordings
are additive, and a mid-flight restart throws away every race in progress.
Raising a limit is legitimate: the limit is a give-up point, never a number
written into a record. If slot 5 still falls short with doubled limits,
**report the gap**; do not close it by relaxing what counts as a complete race.

Rough cost: ~3–7 minutes per valid race, so the full 112-race plan is a
multi-hour job (worst case ~8h at 3 workers). Rookie and Erratic run LAST in the
plan and courses round-robin neediest-first, so **a batch cut short still leaves
coverage spread across all seven courses** rather than one finished course.

---

## 6. What to do when it finishes

1. `node tools/rivals-assemble.mjs --in tools/recordings --dry` and read it.
2. Assemble for real, then `npm run verify`. `rivalBank.test.mjs` must be green.
3. Check deployment size. `dist` was 37 MB (audio 20 MB, rivals 11 MB, assets
   3 MB) with 57 records; roughly 900 bytes per second of recorded race. A full
   batch adds tens of MB. If it grows uncomfortably, say so with the number —
   do not silently drop races to make it smaller.
4. Commit the bank on its own. The commit message must say **why**, **what was
   measured**, and **what remains unverified**. Report coverage by course,
   measured band and power mix; completion failures; elapsed-time and retry
   distributions; renderer and fps; deployment size.
5. Report the shortfall honestly if any course is still under 20.
6. Do not deploy. Do not touch `master`.

---

## 7. Still open beyond the bank

- **No phone pass yet** on the locked Block Rivals menu row or the calibrated
  search. Worth checking: win → ENTER NEXT BLOCK, search cancellation, resize
  during search, steering after a modal, settings, rival replay. Preserve the
  existing shutdown fixes — `resumeTouch:false`, idempotent destroy, the
  closing/camera guards — they fixed a real crash.
- **The Cash ledger hazard is unaddressed and the reward seam is still closed.**
  `createWindowState` does `ledger.slice(-200)` and derives BOTH the balance and
  the duplicate guard from the survivors, so a long ledger silently loses
  balance and duplicate protection. Fix that before wiring any reward.

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
