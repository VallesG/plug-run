# Prompt for Codex — record Block Rivals bot races in parallel

Paste everything below the line into Codex.

---

You are adding recorded bot opponents to Plug Run's Block Rivals bank, working
**in parallel with another agent**. Branch: `claude/input-intent-layer`.
**Never touch `master` — it deploys the live game.**

## Check this first, before anything else

This job requires running Node and a headless Chromium natively, for hours. A
previous handoff recorded that native execution was blocked by Carbon Black in
your environment. **Verify you can actually execute before starting:**

```sh
cd client && node --version && npx http-server --version
```

If either is blocked, **stop and say so.** Do not simulate, hand-write or
approximate recordings — a fabricated race is worse than no race. Report that
you cannot execute and leave the bank alone.

## Your share of the work

The other agent is recording the fast styles. **You take three styles only:
`rookie`, `erratic`, `trickster`** — 21 jobs, 42 races, six per course across
all seven courses. Your plan is already generated and committed:

```
client/tools/rivals-plan-codex.json
```

It uses `indexBase` 1000+ so your recording IDs never collide with theirs.
**Do not record any other style.** Two machines recording the same style is
duplicated hours, not more coverage.

Your three styles are the slowest and least certain — Rookie in particular
wanders and hesitates by design and gets a 2400s limit because it reached only
house 3 of 7 in 785s under the old 780s limit. Expect long races and some
genuine failures. That is the data, not a malfunction.

## Run it

```sh
cd client
npm run build
npx http-server dist -p 4173 --silent &

# Confirm the served bundle actually contains the harness. Must print 1, not 0.
grep -c "RIVALS-REC" dist/assets/*.js

node tools/rivals-record.mjs --plan tools/rivals-plan-codex.json --parallel 3 \
  --url http://127.0.0.1:4173 --out tools/recordings --resume > /tmp/bank-codex.log 2>&1 &

tail -f /tmp/bank-codex.log | grep -E "saved |REJECTED|job failed"
```

`--resume` skips jobs already recorded, so you can restart after any
interruption without redoing finished work.

## Rules you must not break

- **Never manufacture a time, edit a recorded frame, re-hash a record, or
  promote a partial capture.** A race that did not finish is not a race. The
  recorder discards it, the assembler rejects it, and the gap gets reported.
- **Never decorate a record after capture.** The payload hash breaks and
  `validateRivalRunRecord` rejects it. That check is correct — do not work
  around it, and do not "fix" a rejected record.
- **Retries, bunk pickups and inefficient decisions stay exactly as recorded.**
  Slow, mistake-prone complete races are the point: they are what weak players
  get matched against. Do not tune a style to make it look better.
- **Bots get no immunity, teleport or stash knowledge.** They drive the same
  `InputIntent.driveMove` seam a player does.
- **Do not run `npm run build` while recording.** A concurrent build dropped the
  measured frame rate from ~54 to ~50fps, and renderer speed changes what the
  bot can do. Use `npm test` alone while a batch is live.
- **Do not record against `npm run dev`.** Vite HMR restarts in-flight races on
  every source edit; a whole batch was lost that way.
- **Do not edit shared source files** while the other agent is working — you are
  recording, not refactoring. If you believe a source change is needed, say so
  instead of making it.
- **Do not run the assembler or commit anything under
  `client/public/rivals/v2/`.** The other agent merges both machines' output in
  one pass. Duelling assemblers would fight over the same bank files.

## What to hand back

Commit **only** your raw captures from `client/tools/recordings/` (note: that
directory is git-ignored by default — use `git add -f`, and only for your own
output files), or make them available however you normally exchange artifacts.
Then report, from counted evidence rather than recollection:

- jobs saved, races complete, races rejected, and each rejection's reason
- completed-race durations: n, min, median, max
- retries per race: min, median, max
- renderer and measured fps (each output file carries its own
  `environment.renderer`, `fpsMedian` and `fpsSamples`)
- anything that failed, and anything you could not verify

If a style cannot complete a course at all, **report that gap.** Do not fill it.
A short bank reported honestly is a success; a padded one is a failure.

## Read if you need more

1. `RIVALS_BANK_RECORDING_HANDOFF.md` — standalone, has everything.
2. `client/tools/README.md` — every flag on both tools.
3. `CLAUDE_RIVALS_BOT_BANK_HANDOFF.md` — bank/course contract and driver styles.
