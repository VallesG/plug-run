# Jev as a strategist above the runner AI — what's built, and how to run it

Branch: `claude/jev-driver`.

## The question

Block Rivals opponents are recorded runs of the in-game bot. Today that bot is
the game's own tuned runner AI, borrowed. The question is whether TypeSafe's
Jev, making the *strategic* calls, produces opponents that are better, more
varied, or more interesting to race — and whether it costs little enough to be
worth it.

That is a measurement, not an opinion, so nothing here changes the shipped
game until the numbers are in.

## History, briefly

The first design had Jev choose one cardinal step per decision, with a naive
pathfinder underneath and the capable runner AI switched off (`aiLevel=0`).
Two paid runs showed it does not work: 0/7 houses at ~29% illegal moves, then
2/7 with 62 retries and a 720s forfeit. Jev answered fine; steering a
real-time runner cell by cell from a 70–500ms remote call is simply the wrong
job. That design is gone — there is no code path left by which Jev produces a
direction.

The third paid run used the strategist below (runner AI as the motor, 100
logical requests, $0.0030). It cleared houses 1–3 with the strategy in force,
then died 58 times on Low End Rush house 4, spent its request budget there
and forfeited at 5/7. Part of that was a fairness bug in the game, not in
Jev: every attempt at a house had the genuine bag in the same pocket, and
Jev chose the other one every time. Fixed; see *Nothing carries across
attempts* below.

## The architecture: three layers

| layer | file | decides |
|---|---|---|
| 1. **JevStrategist** | `src/controllers/JevStrategist.js` | objective, posture, power — on events only |
| 2. **Objective adapter** | `src/logic/jevStrategy.js` | turns the objective into a legal, reachable cell |
| 3. **The runner AI** | `src/controllers/RunnerAI.js` via `BotDriver.driveBorrowedAI` | every step: pathing, wall sliding, stuck recovery, phase steering; BotDriver's dodge/cover layer on top |

### The interface

Jev is asked for a **Strategy**:

```js
{ objective: 'target_a' | 'target_b' | 'extract' | 'hold',
  posture:   'safe' | 'balanced' | 'aggressive',
  power:     'phase' | 'dash' | 'decoy' | 'none',
  confidence: number }
```

`JevStrategist.tick(view)` hands BotDriver a **Plan**:

```js
{ objective: { source: 'jev' | 'fallback' | 'recovery', objective, cell },
  posture, recovering, mode, armedPower }
```

`cell` is a place. BotDriver gives it to the runner AI through a narrow seam
in `updateRunnerBehavior` — `aiController.objectiveProvider` — and the AI
walks there. The seam exists because the AI's own objective code heads for
`scene.stash`, **the real bag**, which a player cannot know; when a provider
is attached that code is never consulted. The one thing still allowed to
route *via* somewhere else is the AI's own random detour — route variety, a
waypoint chosen at random and dropped once reached — and only while the
posture is not `aggressive` and the watchdog is not steering a recovery
(`aiController.allowDetour`). The AI's power rules reason about the provided
objective too. Without a provider the AI is byte-for-byte what it was.

Why the detour stays: the first mock run disabled it, and the runner then
took an identical route on every retry of Low End Rush house 4 and died 32
times — the same loop `rivalPresets.js` documents for high-level AIs (made
worse, at the time, by every retry also having the same genuine bag; see
below). The detour carries no knowledge; it is the motor's variety.

Posture changes only how exposure is treated: the dodge range
(`dangerCells`) and the cover-routing weight (`coverPenalty`), via
`postureTactics`. It never changes where the runner goes.

**Powers: Jev decides whether, the motor decides when.** A power in a
strategy *arms* it for up to 6s; `none` disarms (save). While armed, the
runner AI's own reflex rules (`considerRunnerPowerUse`: phase when a plug is
within 5 cells or a thin wall cuts the route, dash for separation or to close
on the objective, decoy when a plug is in sight) pick the instant — and they
see *only* the armed slot; every other slot is masked, so "save it" holds by
construction. The spend goes through `scene.activateRunnerPowerByIndex`, the
slot a player's tap reaches. An arm is validated first (in the loadout, not
spent, no second decoy, not already phasing) and rejected with a reason
otherwise; an arm the motor never finds a moment for expires and is counted.

The first design spent the power the instant Jev's answer landed. On the
mock run that meant: hit, request, dash, dead 1.4s later, on every attempt.
An event-driven strategist asked at most every 1.5s cannot time a dodge; the
motor, which reacts in frames, can.

`aiLevel=0` is refused outright: with no capable motor there is nothing for a
strategy to direct, and the strategist will not fall back to steering.

### Fairness: the bags stay unlabelled

`BotDriver._jevView` is where identity is dropped: `scene.stash` and
`scene.bunkStash` become two bare cells, `orderCandidates` labels them
`target_a` / `target_b` by row then column, and every number attached to a
bag is computed the same way for both. `test/jevState.test.mjs` swaps which
bag is real and asserts the payload is byte-identical, and scans payload and
view recursively for any key, string or object reference that names or holds
either bag. The fallback objective (no strategy, rejected answer, budget
stopped) is the **nearest** bag by walking distance — a choice a player can
make — never the real one.

**Nothing carries across attempts either.** Which bag is genuine rerolls on
every Rivals attempt (`rivalGenuinePocket(houseSeed, attempt)` in
`logic/rivals.js`: attempt *k* takes the *k*-th draw of the house's stash
stream, so attempt 1 is the old single draw and each retry is an independent,
replayable reroll). A and B are positions only; neither label implies
authenticity, and a retry's A may be genuine where the last attempt's A was
bunk. Jev is sent no previous bunk or genuine outcome — the payload is an
allow-listed set of fields, and a test runs two races that differ only in
which bag was bunk on attempt 1 and asserts the retry's payloads are
byte-identical. Fair tactical history (death cause, posture, power policy,
progress, repeated failure) may be added later; bag outcomes may not.

Before this fix the assignment was one draw per house seed, so every
attempt at a house had the genuine bag in the same pocket. That is why the
third paid run chose the bunk on all 21 answered attempts at Low End Rush
house 4 — it was not bad luck — and why the plain bot, which reads
`scene.stash`, never paid for it. Every shipped bank recording predates the
reroll: its retries used its first attempt's assignment. Their replays are
unaffected — a replay plays the recorded pickup and bunk events — and their
first attempts match the new derivation exactly.

### When Jev is asked

Never on a timer. A request needs a trigger — `house_start`, `retry`,
`stash_change`, `extract_available`, `target_invalid`, `damage`, `watchdog`,
or `expired` (a strategy older than 9s, or no strategy for 3s) — and then:

- at most one request in flight;
- at least **1,500ms between dispatches**, measured from dispatch, so errors,
  invalid answers and timeouts cannot shorten it;
- triggers arriving during the gap are **coalesced** into one later request,
  named for the highest-priority trigger (all are counted);
- nothing is asked while the watchdog has recovery control.

An answer is adopted only if it arrives for the state it was asked about
(the *epoch*: house, bag set and carrying unchanged), names a legal objective
(carrying: `extract` or `hold` only), and does not switch bags inside the
4s commitment window (and at most twice per attempt). Late, obsolete and
invalid answers are counted and dropped; their tokens are still counted,
because they were still billed.

### The progress watchdog

`src/logic/jevWatchdog.js`. It measures walking distance to what the motor is
actually walking to — its detour waypoint when it has one, the objective
otherwise; progress is a new best by at least a cell. The clock is held while
holding, phasing, while BotDriver's dodge layer is steering (evasion is
working, not stuck) and for the first 1.5s of an attempt (respawning). After
**2s** without progress it declares a stall, and it *acts*:

1. marks the current strategy stalled (invalidated);
2. hands the runner AI a recovery waypoint 4–10 cells away, preferring cover,
   for 1.8s, and clears the AI's direction lock so it can turn;
3. asks Jev nothing during recovery;
4. afterwards queues at most one `watchdog` request, and no more than one per
   5s, subject to the global gap;
5. watches the next 3s and records whether progress was restored.

A wedged runner therefore stalls at most once per ~3.8s and costs at most one
request per 5s. `test/jevStrategist.test.mjs` wedges one for a full minute.

### What is reported

`__plugRunJev()` in the page, the recorder's output lines, and the `jev`
block of every capture carry: logical requests by trigger and coalesced
count; HTTP attempts, retries and statuses (separately — one decision can
cost up to three attempts); answers, invalid, errors, timeouts, obsolete,
late; strategies adopted, rejected by reason, held by commitment, switches,
invalidated; watchdog stalls, recoveries, recovery time and share, requests
it caused, restored / not restored; powers requested, accepted (armed),
rejected by reason, activated by the motor, expired unused, saved, and
unarmed activations (must be 0); motor detours and evading time; time with a
Jev strategy in force vs fallback vs recovery;
per-house breakdown; drive sources (`motor`, `dodge`, `cover`,
`phaseWindow` — there is no `jev` bucket because there is no path by which
Jev steers); billed tokens, token source and cost; `budgetStopped`.

## Files

| file | what it is |
|---|---|
| `src/controllers/JevStrategist.js` | event-driven strategist: triggers, cooldown, commitment, watchdog, powers, metrics |
| `src/logic/jevStrategy.js` | vocabulary, path distances, the objective adapter, posture tactics, recovery waypoint |
| `src/logic/jevWatchdog.js` | the progress watchdog |
| `src/logic/jevState.js` | view → strategic payload. Pure, tested |
| `src/logic/jevAnswer.js` | one response mapper for both routes; drops any movement answer |
| `src/controllers/jevTypesafe.js` | TypeSafe direct (`{state, model, questions}`), counts HTTP attempts |
| `src/controllers/jevCloudflare.js` | Workers AI (`{model, input:{...}}`) |
| `src/controllers/makeJevStrategist.js` | builds one from the page, only on `?jev=1` |
| `src/controllers/BotDriver.js` | `driveBorrowedAI` hybrid, `_jevView`, `_spendPower`, `_tactics`, `jevReport()` |
| `src/controllers/RunnerAI.js` | the `objectiveProvider` seam |
| `tools/rivals-record.mjs` | `--jev` / `--jevMock` / `--video` |
| `tools/lib/jevMock.mjs` | deterministic local strategist for free integration runs |
| `tools/lib/video.mjs` | H.264 video with a diagnostic strip below the board |
| `tools/jev-spike.mjs` | arms `ai`, `path`, `jev` on the same maps |

Tests: `jevState`, `jevStrategist`, `jevTypesafe`, `jevCloudflare`,
`botDriverJev` — all in `npm test`, all plain Node, no browser and no
network. `botDriverJev` drives the **real** `RunnerAI` (Phaser stubbed by a
module hook in `test/_jevWorld.mjs`) on a stub board.

## Running it

Needs a served build and a Chromium, **on your machine**: Claude Code cloud
sessions run in a VM whose egress allowlist does not include
`api.typesafe.ai`.

```sh
cd client
npm install
npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

### Free first: the mock strategist

```sh
node tools/rivals-record.mjs --slot 1 --style street --powers phase,dash \
  --runs 1 --opponentIndex 9160 --jevMock --video \
  --videoDir tools/recordings/jev/mock/video --url http://127.0.0.1:4173 \
  --out tools/recordings/jev/mock
```

The recorder answers the page's `/v1/systemone` from `tools/lib/jevMock.mjs`
(same body in, same response shape out), blocks and counts anything aimed at
`api.typesafe.ai`, and needs no key. Usage reports zero tokens, so
`tokenSource` stays `estimated` and nothing from a mock run reads as spend.
Captures are tagged `-jevmock` and their provenance says `route: 'mock'`.

### Paid

```sh
$env:TYPESAFE_API_KEY = Read-Host -Prompt "key"     # PowerShell; never paste it into a chat
node tools/rivals-record.mjs --slot 1 --style street --powers phase,dash \
  --runs 1 --opponentIndex 9201 --jev --jevMaxRequests 100 --jevMaxInputTokens 500000 \
  --video --videoDir tools/recordings/jev/video --url http://127.0.0.1:4173 \
  --out tools/recordings/jev
```

`--jev` forces sequential recording: parallel pages share one rate limit and
one budget. It passes `jev=1&jevProxy=1` and the ceilings — **no** `bot=1`,
**no** `aiLevel` — so the preset's own runner AI is the motor.

**The key never enters the browser.** The page posts to a same-origin path,
the recorder intercepts it with `page.route`, and Node forwards the body to
TypeSafe with the real key; the page holds a sentinel. The relay also refuses
(422, unforwarded, unbilled) any body asking a question other than
`objective`, `posture` or `power`.

`--video` (optional `--videoDir`, git-ignored under `tools/recordings/`)
records the whole attempt, countdown to result screen, as H.264 MP4 through
Chrome's own MediaRecorder — no ffmpeg or Playwright download. The strip
*below* the board shows house, clock, retries, the active objective and its
source, posture, confidence and age, logical requests, strategies adopted /
rejected / held, strategy-active share, motor and recovery state, stalls and
recoveries, powers left and the last power call, billed tokens, cost and
budget status. A `.events.json` next to it has every strategist event
(request, adopted, rejected, held, stall, recovery-end, restored,
power-activated/rejected, budget-stopped) in video time and race time.

### Playing it by hand

```
?rivalsRecord=1&courseSlot=1&skillPreset=street&powers=phase,dash&jev=1
```
with `sessionStorage.jevKey` set before boot, then `__plugRunJev()`.

The key is read at runtime from `sessionStorage` (or `window.__JEV_KEY`),
never from a `VITE_*` env var — Vite inlines those into the bundle.

## Budget

Event-driven requests change the arithmetic entirely. The old design asked
~2.7 times a second (1,968 requests in 12 minutes). A seven-house race now
needs **tens** of requests: one or two per house start, one per pickup, one
per death, the odd expiry or watchdog. At the ~600 billed tokens per request
the old payload measured, 50 requests is ~30,000 tokens, about **$0.0013**.

**The API's own `usage.input_tokens` is the authoritative number**; the
strategist reports `tokenSource: 'api'` vs `'estimated'` and every tool
prints it. An `estimated` figure means nothing was billed.

## Safety ceilings

`JevStrategist` takes `maxRequests` (logical requests; default 100) and
`maxInputTokens` (default 500,000, ~$0.02), and stops after
`maxConsecutiveErrors` (3) failures in a row — HTTP errors, timeouts or
invalid answers — so a request that fails the same way cannot repeat. All
three latch; past any of them the runner AI plays on with the fair fallback
objective, and the report says `budgetStopped` and how much of the race the
strategy was actually in force. A clear achieved mostly after a ceiling
tripped is not a Jev result.

## Retries

The TypeSafe adapter retries **429 and 529 only**, at most twice, with
exponential backoff (150ms, 300ms) and `Retry-After` honoured when the server
sends a delta-seconds value. `signalMs` is a **total** budget across every
attempt and wait. Nothing else is retried — a 400, 401 or 422 fails once.
Attempts are counted in `decide.http` and reported separately from logical
requests; the recorder's relay counts them independently in Node.

## Fixed on the way

`cover.coverAwareStep` indexed its bucket queue by path cost, and BotDriver
passes `coverPenalty x coverCarryMul` while carrying (3 x 1.8 = 5.4 for the
shipped Hustler/Ace presets): a fractional cost indexed a bucket that did not
exist and threw inside the bot's try/catch, silently dropping that frame's
steering exactly while carrying through an exposed lane. The penalty is now
rounded; `test/cover.test.mjs` covers it.

## Known, unrelated

- On a Windows checkout with `core.autocrlf=true`, `blockComplete`,
  `firstPlay` and `cityEntry` fail: they compare committed LF text (SVGs,
  source regexes) byte-for-byte against CRLF working files. They fail
  identically on a clean `origin/master` checkout and pass on an LF checkout
  (`git -c core.autocrlf=false worktree add ...`). Nothing Jev-related.
- `BotDriver.driveBorrowedAI` restores `scene.runnerSpeed` after
  `applyRunnerProgression` clobbers it, but not
  `scene.runnerPowerStats.decoy.speed`. Harness-only.
- The runner AI's own objective code targets `scene.stash` (the real bag).
  Every existing borrowed-AI bank recording was driven that way. The hybrid
  cannot, because of the objective seam; the plain bot still does.
