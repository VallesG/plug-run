# Plug Run — PvP conversion, session handoff

Written 2026-09-14, updated after the second session. Branch:
`claude/input-intent-layer`, based on `origin/master`.

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

Thirteen commits. The first eight were additive scaffolding — no existing game
file touched except `main.js` (6 lines). The five since then fix four real bugs
in shipped code and extend the harness; those do modify game files, and the
first four are listed under **Bugs fixed** below.

### `InputIntent.js` — one place player intent is expressed

Direction was previously written in ~9 places across `BaseGameScene` and
`PlayerController` through five parallel variables (`playerMoveDir` /
`playerDrift` / `playerAim` / `playerGunAim` / `_runnerInputDir`). Nothing could
observe what the player *asked for* without re-deriving it from sprite
positions. One of the five, `playerAim`, turned out to be null on every read —
it is gone now, so there are four.

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

**`lockRound` — sampling maps instead of climbing.** Pins `pveRound` so
difficulty holds still, and advances the map instead by walking `routeID`
forward one per map (the game's own seed derivation, asked for "this round, on
a different day"). `seedRepeats` sets how many attempts each map gets before
the next one; a clear always advances.

```
?bot=1&lockRound=16                  one shot per map
?bot=1&lockRound=16&seedRepeats=5    up to five, across many maps
```

`__plugRunSummary()` then reports a `perMap` block — maps sampled, first-try
clear rate, and the attempts-to-clear spread. That grouping is the whole point:
a pooled 26% completion rate reads as a hard round, while nine maps cleared
first try and one costing 29 reads as a lottery, and only the second tells you
a fixed 8-map block is the wrong container.

### Tests — 64 assertions, no framework, no browser

```
cd client && npm test
```

Three suites, all plain Node:

| file | covers |
|---|---|
| `test/botDriver.test.mjs` | targeting, BFS pathing, mistake legality, evasion, dual-plug awareness, and that the borrowed-AI spoof restores `role`/`pveRound`/`runnerSpeed`/position even when the AI throws mid-call |
| `test/threat.test.mjs` | which plug a runner is afraid of, including the second one |
| `test/runStats.test.mjs` | the per-map summary the sizing decision gets read off |

They exist in this form because browser binaries can't be downloaded in a
locked-down container (the Playwright CDN 403s). Anything they need to reach
has to import nothing — `utils/gameUtils.js` pulls in Phaser, so logic that
wants a test lives in `src/logic/` instead.

**Not covered:** Phaser integration, the prototype wraps, and whether movement
feels right. Those need a real browser and a human. `lockRound` in particular
is reasoned-through but unrun — see below.

---

## What the first batch said (61 bot runs, 16×35 grid, level 20)

Superseded in part by the measured curve above — kept because the trace-size
and carry-death findings still stand, and because the r16 wall is the finding
that motivated `lockRound`.

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

## The difficulty curve, measured (98 bot runs, aiLevel 20, 16x35)

Three locked batches. Only rounds 4 and 11 have enough maps to trust; the rest
are 1-7 maps and included for direction only.

| round | maps | per-map clear | first-try | extract median | plugs |
|---|---|---|---|---|---|
| **4** | **23** | **60.9%** | **43.5%** | 5.8s | 1 |
| 8 | 2 | 50% | 0% | 3.7s | 2 |
| 10 | 3 | 33% | 33% | 9.1s | 2 |
| **11** | **20** | **15.0%** | **5.0%** | 6.9s | 2 |
| 12 | 4 | 0% | 0% | - | 2 |

### The cliff is probably the second plug, not the scaling

Rounds 1-7 spawn one plug; from round 8 `BaseGameScene` spawns `defender2`.
Every round on the bad side of the collapse is a two-plug round, and the
character of the deaths changes exactly there:

- **Round 4** - 52% of deaths happen *carrying* the stash. The extraction leg
  is the dangerous half, which is the drama worth keeping: a lead can flip late.
- **Round 11** - only 29% die carrying; **71% never reach the stash**. Two
  plugs intercept on the approach. That is a gate, not tension.

**The test that separates the two hypotheses needs no code:** run `lockRound=7`
against `lockRound=8`. Same scaling either side, one structural change between.
A cliff means the fix is a spawn rule; a smooth slope means flatten the curve.
This is the next thing to run.

### Read retry counts with care

The bot's attempts are independent - it never learns a map, where a human's
second run at a layout is much better than their first. So `attemptsToClear`
**overstates** what retries cost a person, and **first-try clear rate is the
transferable number**. For a one-attempt-per-map race, round 4's 43.5% is the
realistic starting point, not 60.9%.

### Two questions these batches close

- **Map size is fine.** Round 4 extractions: median 5.8s, p75 8.0s, max 11.6s.
  With retries that lands near 20s without touching the 16x35 grid.
- **Trace payload stays tiny** on these busier runs - median 1874 bytes, so an
  8-map block is ~15 KB.

---

## The full sweep (227 runs, rounds 1-47, aiLevel 20, forensics on)

One unattended session, `sweepFrom=1&sweepTo=120&mapsPerRound=5`. It reached
round 47 before being stopped. One run discarded as a backgrounded tab.

| rounds | runs | clear% | died carrying | by defender2 | laneFrac | spawn in lane |
|---|---|---|---|---|---|---|
| 1-7 (one plug) | 34 | **50%** | 41% | 0% | 0.07 | 6% |
| 8-14 | 35 | 17% | 24% | 76% | 0.20 | 11% |
| 15-24 | 47 | 4% | 24% | 56% | 0.26 | 9% |
| 25-34 | 50 | **0%** | 18% | 68% | 0.22 | 2% |
| 35-47 | 60 | **0%** | 20% | 63% | 0.26 | 17% |

### The ladder ends at round 23

Last clear anywhere in the sweep: **round 23**. The 115 runs after it produced
zero. The README advertises "expert-level (Round 50+)"; for a fixed-skill
runner that content does not exist. Rounds 24+ are not hard, they are closed.

Caveat worth keeping straight: aiLevel pins the bot's own skill at round-20
stats while the opposition keeps scaling. A human's mechanical skill does not
scale with round either, so this is a fair proxy — but a human learns a map
between attempts and the bot never does.

### Spawn distance is very nearly deterministic

| spawn distance to nearest plug | runs | cleared |
|---|---|---|
| <= 6 cells | 47 | **0%** |
| 6-12 cells | 110 | 10% |
| > 12 cells | 69 | 20% |

**Not one of 47 runs starting within 6 cells of a plug was ever survived.** That
is 21% of all runs beginning in a position with no recorded escape. Spawning
already inside a clear firing lane clears 5% against 12% with cover.

This closes the question the spawn-swap button was priced on: it is buying
something real. The stronger conclusion is that spawn placement wants a
minimum-distance constraint, so the purchase is rarely necessary.

### Exposure is the mechanism behind the whole curve

Cleared runs spend a median **0.03** of their time in a clear firing lane.
Runs that died spend **0.23** — nearly eight times more. And laneFrac climbs
with the rounds (0.07 at 1-7, 0.26 at 15-24) in step with the clear rate
falling. The difficulty curve is an exposure curve: later rounds win by
denying cover, not by out-shooting.

That makes lane exposure the design lever, and a better one than difficulty
numbers: it is a property of maps and plug placement, both of which are
generated.

### Snagging: real, but not what costs runs

Watching the sweep suggested the runner was getting stuck on corners. It does,
and it is now measured — and it is immaterial. Median stalledFrac is 0.01,
only 1% of runs contain a snag of a second or longer, and cleared and died
runs are identical at 0.01. The eye was right that it happens and wrong that
it matters. The three-way asymmetry in movement aids is still real and still
worth fixing for feel (see the commit), just not for outcomes.

### The dodge-commitment fix is confirmed

**Zero** runs hit the 90-second round clock, across all 227. In the round-8
batch before that fix, 15% did.

---

## Bugs fixed this session

All four bugs the harness surfaced last session are fixed, one commit each.

1. **`showPvEGameOver` awaited leaderboard submission before building its
   buttons.** With no backend reachable those hang or reject, and `endRound`
   called it with no `.catch()`, so the death modal never rendered at all — a
   frozen board with no Retry and no Exit, recoverable only by reloading and
   losing the session. The bot had been replacing the method to work around it;
   real players hit it too. The modal is now built first and the submission
   follows it, wrapped.

2. **`playerAim` was dead code** — `PlayerController` overwrote it with null
   every frame, and every read of it sat behind a fallback that is never null.
   Deleted. Movement runs on `playerDrift`, as it always has. (`TutorialMiniScene`
   has its own live `playerAim` on a scene that shares no code with this path;
   untouched.)

3. **`endRound(winner)` is called with `'defender'`/`'attacker'`** but compared
   against `'plug'`/`'runner'`, so `playerLost` was false on every death and the
   death REP penalty had never once applied. Both vocabularies now resolve
   through one named `runnerWon`. **Note this switches a real penalty on for the
   first time: dying costs 5 REP.** That is what the constant, the modal's
   "Loss penalty" line and the comment all intended — it had simply never
   happened, which also means the 12-REP swap-spawns price has until now been
   quoted against a free alternative.

4. **`RunnerAI.js` had no concept of `defender2`.** Correct in its original
   context, wrong the moment it is borrowed to drive a player-side runner, where
   from round 8 it was blind to half the guns on screen. `nearestPlug()`
   (`src/logic/threat.js`) answers "which plug matters now", measured
   toroidally. With no live `defender2` it returns `scene.defender` unchanged,
   so shipped plug-mode behaviour is bit-for-bit what it was.

A fifth, found while adding `lockRound`: the `maxRunMs` guard ended a run
without starting another, so an unattended batch died on its first wedge.

---

## Next steps, in order

Everything left at the top of this list needs a human at a keyboard. The code
side of the queue is done up to the point where a design decision blocks it.

1. **Run a locked batch.** `?bot=1&lockRound=16&seedRepeats=5`, leave it going,
   then `__plugRunSummary()` and read the `perMap` block. This is the
   map-sizing dataset, and it is now one URL away. Worth running at two or
   three rounds (say 8, 16, 24) to see whether the wall rate rises with
   difficulty or is flat and seed-driven, which is the question the whole race
   format hangs on.

   `lockRound` is reasoned-through but has never been run — no browser in this
   container. First thing to check is the `[BOT] round locked at N — map M`
   line, which prints on every restart and should show M advancing.

2. **Get the human number.** Play 10 rounds with the bot off — the telemetry
   records any player. That brackets the bot's 6.5s floor and takes five
   minutes. Still the cheapest unknown on the list.

3. **Decide: one attempt per map, or retry until cleared?** Everything about
   grid sizing depends on it, and step 1 now produces the evidence for it
   directly: `seedRepeats=1` measures the first, `seedRepeats=5` the second.

4. **Fixed timestep.** `update(_, delta)` runs on variable delta and every `dt`
   consumer is downstream. Replay the same inputs at different frame timings and
   you drift. This is the one genuinely invasive change in the plan, and ghosts,
   server-side verification, and running the harness at 100× all depend on it.
   The 8-map split caps the blast radius: each map starts from a clean seeded
   state, so drift can't accumulate across a block.

   Deliberately not started. It rewrites the movement loop, its correctness
   shows up only as feel, and nothing in this container can play the game. It
   wants a session with a browser and someone watching.

5. **Then** the progress bar and the matchmaking/relay backend.

---

## Working notes

**Pushing works now.** It was broken for two sessions — `git push` returned 403,
"Claude doesn't have GitHub access to VallesG/plug-run for your organization"
— and neither starting a fresh session nor re-attaching the repo with push
access helped. The cause was account-side, not per-session: the Claude GitHub
App did not have write access to this repo. Reconnecting the App fixed it
immediately, mid-session, with no restart needed.

So if push 403s again, it is the App installation, and reconnecting it from
claude.ai settings clears it on the spot. No need to re-derive that, and no
need to fall back to `git format-patch` first.

**Telemetry lives on `window`** — it survives `scene.restart()` but not a page
reload. `__plugRunDownload()` before refreshing.
