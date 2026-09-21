# Jev on the bot driver — what's built, and how to run the spike

Branch: `claude/input-intent-layer` (work done on `claude/jev-driver`).

## The question

Block Rivals opponents are recorded runs of the in-game bot. Today that bot is
the game's own tuned runner AI, borrowed. The question is whether TypeSafe's
Jev, choosing the route, produces opponents that are better, more varied, or
more interesting to race — and whether it costs little enough to be worth it.

That is a measurement, not an opinion, so nothing here changes the shipped
game until the numbers are in.

## What Jev decides

Jev answers **which way to go** and **whether to spend a power**. One cardinal
step per decision. Everything else stays where it is:

| | owner |
|---|---|
| route intent | **Jev** |
| frame-by-frame steering | the existing pathfinder |
| evasion (firing lanes, cover, phase escapes) | the existing tuned code |
| firing | the existing tuned code |
| anything late, missing, illegal or unsure | the pathfinder, as fallback |

Jev answers in 70–500ms; the bot re-decides every 180ms at 60fps. Awaiting an
answer inside the update loop would freeze the picture for up to half a second
every tick, so `JevDriver` never blocks: a request goes out, the runner keeps
moving on the previous answer, the new one is adopted when it lands. A bad
round of Jev therefore costs steps, never the run.

## Two rules the code enforces

1. **A driver may not do what a player could not.** Every steer goes through
   `InputIntent.driveMove()` — the same call a swipe reaches. The state sent
   to Jev never says which duffel is real: the scene stores them as `stash`
   and `bunkStash`, and `jevState.js` sends both unlabelled in fixed spatial
   order. A driver told which bag is real would post times no player could
   beat, and the recordings would be a lie. There is a test for this.
2. **Every field is billed.** The payload is a local view and a handful of
   distances, not the 16×35 grid. Measured at ~136 tokens; TypeSafe's own
   examples bill 380–426, so budget against the API's counts, not ours —
   which is why the driver reports `tokenSource: 'api'` vs `'estimated'` and
   the spike prints it.

## Files

| file | what it is |
|---|---|
| `src/logic/jevState.js` | scene → Jev payload. Pure, dependency-free, tested |
| `src/logic/jevAnswer.js` | one response mapper for both routes |
| `src/controllers/JevDriver.js` | the non-blocking ask/adopt/timeout loop |
| `src/controllers/jevTypesafe.js` | TypeSafe direct (`{state, model, questions}`) |
| `src/controllers/jevCloudflare.js` | Workers AI (`{model, input:{...}}`) |
| `src/controllers/makeJevDriver.js` | builds one from the page, only on `?jev=1` |
| `src/controllers/BotDriver.js` | `_route()`, `_maybeJevPower()`, `jevReport()` |
| `tools/jev-spike.mjs` | three arms, same maps, one table |
| `tools/lib/browsers.mjs` | browser discovery, incl. Windows Chrome/Edge |
| `tools/rivals-record.mjs` | `--jev` records a Jev opponent into a raw capture |

Tests: `jevState`, `jevDriver`, `jevTypesafe`, `jevCloudflare`, `botDriverJev`,
`toolBrowsers` — all in `npm test`, all plain Node, no browser and no network.

## Running the spike

Needs a served build and a Chromium. **On your machine**, not in a Claude Code
cloud session: those run in an Anthropic-hosted VM whose egress allowlist does
not include `api.typesafe.ai`, so the request never leaves the box.

```sh
cd client
npm install
npm run build && npm run preview     # or: npm run dev

# in another shell
export TYPESAFE_API_KEY=...          # never paste this into a chat
node tools/jev-spike.mjs --maps 8 --round 12
```

Three arms on the same maps:

- `ai` — the borrowed runner AI at `aiLevel 20` (what the bank uses today)
- `path` — the naive pathfinder, no AI (the floor)
- `jev` — Jev on route, pathfinder underneath

It prints clear rate, median clear time over **clears only** (a death's
duration measures how long it took to die), real spend, and a per-seed
head-to-head. It writes a JSON file with everything; the key is never in it.

Useful flags: `--arms path,jev`, `--round 12`, `--maps 8`, `--model
jev-1.13.0` (pin a version so an alias can't move the answers),
`--minConfidence 0.6`, `--route cloudflare`, `--headed`.

Cloudflare route instead: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
and `CLOUDFLARE_GATEWAY_ID`. The gateway id is **required to spend prepaid
credits** — without it the same call bills Workers Paid neurons instead of the
balance you topped up, and the gateway's Workers AI Billing setting must be
"Unified billing". Going direct to TypeSafe avoids Cloudflare's 5% credit fee;
against that, TypeSafe's purchased credits expire 12 months after purchase and
are non-refundable, so buy small and often.

## Recording a Jev opponent

```sh
export TYPESAFE_API_KEY=...          # or: $env:TYPESAFE_API_KEY = Read-Host
node tools/rivals-record.mjs --slot 1 --style street --powers phase,dash \
  --runs 1 --opponentIndex 9001 --jev \
  --jevMaxRequests 2500 --jevMaxInputTokens 2000000 \
  --url http://127.0.0.1:4173 --out tools/recordings/jev
```

`--jev` forces sequential recording: parallel pages share one rate limit and
one budget, so a ceiling would trip in whichever tab reached it first and the
others would quietly finish on the pathfinder — a batch of captures that are
partly Jev and do not say which parts.

**The key never enters the browser.** The page posts to a same-origin path
(`?jevProxy=1` makes the driver use `location.origin + /v1/systemone`), the
recorder intercepts that path with `page.route`, and Node forwards the body to
TypeSafe with the real key. The page is handed a sentinel string that exists
only so the driver constructs. Same-origin also means there is no CORS
preflight — and a preflight is the one request Playwright's routing does not
reliably see, so intercepting `api.typesafe.ai` directly works right up until
the browser sends an `OPTIONS` first and it fails looking like an outage.

**`aiLevel=0` is not optional.** The borrowed runner AI returns from
`update()` before Jev is ever consulted, so with it enabled a race would look
Jev-driven — a driver is built, requests go out — while Jev steered nothing.
The recorder always passes `bot=1&aiLevel=0` alongside `jev=1`, and
`botConfig()` is merged last over the preset's knobs, which is what makes it
stick. Check `steerShare > 0` in the output before believing any capture.

## Playing it by hand

```
?bot=1&lockRound=12&aiLevel=0&jev=1
```
with `sessionStorage.jevKey` set before the page boots. Then `__plugRunJev()`
in the console for answer rate, steer share, failure rate and cost.

The key is read at runtime from `sessionStorage` (or `window.__JEV_KEY`),
never from a `VITE_*` env var — Vite inlines those into the bundle at build
time, and a key put there would ride into whatever `dist/` got deployed.

## Budget

**Corrected.** An earlier version of this file said $0.08/min. That did not
follow from its own assumptions and was wrong by about 16x. The arithmetic:

```
400 input tokens x 5 decisions/sec x 60 sec  =  120,000 tokens/min
120,000 / 1,000,000 x $0.042                 =  $0.00504 /min
```

So roughly **half a cent a minute**, and a $5 balance is on the order of
sixteen hours of Jev at the wheel rather than one.

Treat that as an order of magnitude, not a quote. It rests on two guesses —
400 tokens per request and 5 requests per second — and only one of them is
ours to control. **The API's own `usage.input_tokens` is the authoritative
number**, which is why `JevDriver` reports `tokenSource: 'api'` vs
`'estimated'` and every tool prints it. A cost figure marked `estimated` means
nothing was billed and nothing was measured; do not quote it as spend.

Even at the corrected rate, recording is still the right shape: pay once per
opponent, replay it for free forever.

## Safety ceilings

`JevDriver` takes `maxRequests` and `maxInputTokens`. Past either one it stops
making paid requests for the rest of the session and the pathfinder underneath
keeps playing, so a runaway loop costs a worse recording rather than a bill.
`report()` carries `requestLimit`, `tokenLimit` and `budgetStopped`.

Two ceilings because neither is sufficient alone. The token ceiling tracks
actual spend but can only count what came back — if every request fails,
nothing is ever billed to count and it never trips. The request ceiling cannot
be fooled that way, so it is the backstop.

The recorder defaults to 2,500 requests / 2,000,000 input tokens (~$0.08
worst case) per job.

## Retries

The TypeSafe adapter retries **429 and 529 only**, at most twice, with
exponential backoff (150ms, 300ms) and `Retry-After` honoured when the server
sends a delta-seconds value. `signalMs` is a **total** budget across every
attempt and the waits between them, not per attempt: a retrying adapter given
the full deadline three times over would outlive the decision it answers, and
the driver would have timed out and moved on long before the last attempt
left. Nothing else is retried — a 401 or a 422 fails the same way twice.

## What is not decided yet

- Whether Jev replaces the route arm or gets its own skill preset alongside
  the existing ones. The spike's per-seed table is what should decide it.
- `jevMinConfidence` defaults to 0 (take every answer). A threshold should be
  picked from measured confidences, not guessed in advance.
- Whether Jev-driven recordings go in the bank under their own display name.
  If they do, they must be labelled as a bot like every other bank entry.

## Known, unrelated, unfixed

`BotDriver.driveBorrowedAI` restores `scene.runnerSpeed` after
`applyRunnerProgression` clobbers it, but not
`scene.runnerPowerStats.decoy.speed`. Harness-only — production never takes
that path — but it means a borrowed-AI run has a slower decoy than a player's.
