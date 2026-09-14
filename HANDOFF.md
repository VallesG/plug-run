# Plug Run — PvP conversion, session handoff

Written 2026-09-14. Branch: `claude/input-intent-layer`, based on `origin/master`.

---

## The goal

Convert Plug Run from an endless PvE ladder into Golf-Rival-style async PvP:

- A **block** is 8 maps, ~20s each, played in sequence.
- Both players start together and see a **progress bar** of the opponent's position.
- The opponent can be a recording — async ghost racing is indistinguishable from
  live play to the player, and it removes the matchmaking-liquidity and
  disconnect problems entirely. Seed the pool with bot runs.
- **Replays afterward.**

The map is already generated from a seed (`getRouteSeed(routeID, round, role)` →
`generateSquareMaze`), so both clients build an identical world with zero map
data crossing the wire. That's the property the whole plan rests on.

---

## What was built

Eight commits, all additive. No existing game file was modified except
`main.js` (6 lines) — everything else is new files or prototype wraps.

### `InputIntent.js` — one place player intent is expressed

Direction was previously written in ~9 places across `BaseGameScene` and
`PlayerController` through five parallel variables (`playerMoveDir` /
`playerDrift` / `playerAim` / `playerGunAim` / `_runnerInputDir`). Nothing could
observe what the player *asked for* without re-deriving it from sprite
positions.

`InputIntent` records that intent as a compact trace: `seed + input stream`.
Events are stamped with `scene.simTick`, never `performance.now()` — wall-clock
stamps make a trace unreplayable across machines.

**This pass is observe-only.** `record()` calls sit beside the existing
assignments; not one was removed or reordered. Movement feel (drag-commit
timing, 8-way soft snap, floating re-anchor, cornering assist) can only be
verified by playing, so this layer has no write path into movement at all.

### `BotDriver.js` + `installBotDriver.js` — the test harness

Plays the game through `InputIntent.driveMove()` so the bot cannot do anything
a player couldn't, and its runs record as traces in the same format human runs
use. Drives with the game's own tuned `updateRunnerBehavior()` at a
configurable skill level.

Enable with `?bot=1`. Every knob is URL-overridable:

```
?bot=1&aiLevel=20&wrongTurnChance=0.03&swapAfterFails=1&dangerCells=10
```

Console helpers: `__plugRunSummary()`, `__plugRunDownload()`, `__plugRunReset()`.

### `client/test/botDriver.test.mjs` — 32 assertions, no framework, no browser

```
node client/test/botDriver.test.mjs
```

Exists in this form because browser binaries can't be downloaded in a
locked-down container (the Playwright CDN 403s). Covers targeting, BFS pathing,
mistake legality, evasion, dual-plug awareness, and — most importantly — that
the borrowed-AI spoof restores `role`/`pveRound`/`runnerSpeed`/position even
when the AI throws mid-call.

**Not covered:** Phaser integration, the prototype wraps, and whether movement
feels right. Those need a real browser and a human.

---

## What the data said (61 bot runs, 16×35 grid, level 20)

### Difficulty is seed-dominated, not round-dominated

Attempts to clear each round: r8 → 1, r14 → 9, r15 → 1, **r16 → 29 and still
unbeaten**. Nearly half the dataset is one map.

**This is the most important finding for the race format.** An 8-map block where
one map is a 29-attempt wall isn't a race, it's a coin flip on who gets past it.
Race mode needs the difficulty curve flattened and bounded, with variance coming
from layout rather than an escalating AI. The endless ramp is right for PvE and
wrong for a fixed block.

### 60% of deaths happen carrying the stash

| died | n | median |
|---|---|---|
| holding the real stash | 30 | 7.6s |
| without it | 20 | 4.6s |

The extraction leg is the dangerous half, partly because `carrySlow` 0.85 makes
you slower. Good drama for a race — the lead can flip late. Preserve it
deliberately rather than balancing it away.

### Trace size: question closed

Median **436 bytes**, p90 1074, max 3172. An 8-map block is **3.4 KB** at the
median. Intent traces are comprehensively small enough to ship as a live PvP
payload and to store by the hundred thousand. (The existing `ReplaySystem`
records rendered *output* — scene-graph snapshots, 45s cap — and is orders of
magnitude larger. The two coexist: that one for highlights and sharing, traces
for ghosts and verification.)

### On the 20-second target

Bot median win is ~6.5s, but that's a near-optimal router — treat it as a
**floor**, not the answer. With retries, effective time per map is
attempts × ~7s, which at a typical 3 attempts lands near 20s by accident.

So it depends on a design decision not yet made: **is a race map one attempt, or
until you clear it?** If retries are allowed, 16×35 is about right and the grid
shouldn't be touched. If one attempt only, you want ~2–3× the path length.

---

## Bugs found in existing code (not yet fixed)

1. **`showPvEGameOver` awaits leaderboard submission before building its
   buttons.** `await Promise.all([submitScore, submitAllTimeScore])` runs before
   any UI exists. With no backend reachable those hang or reject, and `endRound`
   calls it with no `.catch()` — so the death modal never renders at all. The bot
   works around this by replacing the method; **real players hit this too.**
   Move the submission after the modal, or `.catch()` it.

2. **`playerAim` is dead code.** `setDir()` (`BaseGameScene.js:832`) sets it,
   then `PlayerController.js:216` overwrites it every frame with its own copy,
   which is initialised `null` at `:42` and never assigned. The fallback at
   `:137` always falls through to `drift`. Movement runs entirely on
   `playerDrift`.

3. **`endRound(winner)` is called with `'defender'`/`'attacker'`** (`hit()`,
   `BaseGameScene.js:2735`) but tests `winner === 'plug'` / `'runner'`. So
   `playerLost` is false on every runner death and the death REP penalty never
   applies.

4. **`RunnerAI.js` has no concept of `defender2`.** Fine in its original context
   (it drives the runner when the player is the plug, where the round-8 dual
   spawn makes a second *runner*), but it means the AI is blind to the second
   plug whenever a runner faces one.

---

## Next steps, in order

1. **Get the human number.** Play 10 rounds with the bot off — the telemetry
   records any player. That brackets the bot's 6.5s floor and takes five minutes.
2. **Add a `lockRound` option** so the bot samples many different seeds at one
   fixed difficulty, instead of 29 samples of round 16. That's what turns this
   into a proper map-sizing dataset.
3. **Decide: one attempt per map, or retry until cleared?** Everything about
   grid sizing depends on it.
4. **Fixed timestep.** `update(_, delta)` runs on variable delta and every `dt`
   consumer is downstream. Replay the same inputs at different frame timings and
   you drift. This is the one genuinely invasive change in the plan, and ghosts,
   server-side verification, and running the harness at 100× all depend on it.
   The 8-map split caps the blast radius: each map starts from a clean seeded
   state, so drift can't accumulate across a block.
5. **Then** the progress bar and the matchmaking/relay backend.

---

## Working notes

**Pushing from a cloud session was impossible this session.** `git fetch` works
(transparent read-only proxy) but `git push` gets no credential, and the GitHub
API returns `403 Resource not accessible by integration` on writes — the App has
Contents: Read only. Reconnecting the connector mid-session does not help; a
session mints credentials at start. **Start a fresh session to get working
push access.** Until then, work travels as `git format-patch` files applied with
`git am`.

**Telemetry lives on `window`** — it survives `scene.restart()` but not a page
reload. `__plugRunDownload()` before refreshing.
