# Jev Profiles and Rival Bank Handoff

## Purpose

Plug Run can use the TypeSafe Jev API as a strategist for Block Rivals recording runs. Jev chooses an objective, posture, route style, and conditional power plan. It never supplies raw movement. `BotDriver` remains the motor and produces replayable player inputs.

This handoff preserves the current work so another LLM can record more opponents, assemble banks, tune a softer profile, or add future Block Rivals maps without rediscovering the architecture.

## Preserved profiles

### Jev Apex

- CLI: `--jevProfile apex`
- Bank ID: `jev-apex-v1`
- Bank directory: `client/public/rivals/jev-apex-v1/`
- Behavior: unrestricted current Jev driver, with immediate optimal opening movement.
- Purpose: optional top-tier challenge ghosts and future benchmark recordings.
- Matchmaking: deliberately excluded from ordinary random Block Rivals matchmaking.
- Current bank: one validated recording for each of the seven existing courses.

### Jev Rival Hard

- CLI: `--jevProfile rival-hard`
- Legacy CLI alias: `--jevProfile rival`
- Bank ID: `jev-rival-hard-v1`
- Bank directory: `client/public/rivals/jev-rival-hard-v1/`
- Behavior: the same routing, powers, dodging, and retry learning as Apex, but every attempt begins with a legal 400–650 ms reflex swipe that is deliberately not the already-perfect route. It then corrects toward its objective.
- Purpose: difficult but more human-looking challenge ghosts.
- Matchmaking: kept outside ordinary random matchmaking.
- Current bank: not assembled yet. The first seven-course batch was recorded locally by the user under `client/tools/recordings/jev/rival-v1/` and must be pushed before another machine or LLM can assemble it.

### Reserved normal Jev Rival

- Bank ID: `jev-v1`
- Bank directory: `client/public/rivals/jev-v1/`
- Purpose: a future softer profile suitable for ordinary matchmaking.
- Do not put Apex or Rival Hard captures into this bank.
- The directory currently contains older historical Jev races; it has not yet been rebuilt from a new softer profile.

## Important gameplay rules

- A stash assignment is random per Block Rivals session/map, but remains stable across retries within that session. A player who discovers the bunk can remember it until the next block/session.
- Jev may remember visible information from the current match, including the revealed stash pocket and where/along which route it died.
- Jev must never receive hidden real-versus-bunk identity before it is revealed.
- The strategist must never output movement directions. Raw movement is owned by `BotDriver` and validated by tests.
- A route remains committed inside one attempt to prevent oscillation.
- After the same route fails twice, the repeated route cells are penalized so a later retry selects another viable corridor. The corridor remains legal if it is unavoidable.

## Main implementation files

- `client/src/controllers/JevStrategist.js`
  - Event-driven Jev requests.
  - Match-local stash and death memory.
  - Profile opening delay.
  - Failed-route memory passed to the motor.
- `client/src/controllers/BotDriver.js`
  - Actual movement motor.
  - Committed cell-center routes, dodge behavior, phase/dash execution, opening reflex swipe, and repeated-route penalties.
- `client/src/controllers/makeJevStrategist.js`
  - Parses `jevProfile` and constructs Apex or Rival Hard.
- `client/tools/rivals-record.mjs`
  - Paid recorder, Node-side key relay, headed browser, MP4 diagnostics, and capture output.
- `client/tools/lib/jevBank.mjs`
  - Eligibility, replay validation, profile isolation, and provenance.
- `client/tools/rivals-assemble-jev.mjs`
  - Builds the selected profile bank without modifying the ordinary bot bank.
- `client/src/controllers/RivalReplayPlayer.js`
  - Plays recorded replay events. Power events already trigger the correct sound and a `DASH`/`PHASE` toast.

## Recording setup

From `C:\dev\plug-run\client`, start the live Vite server:

```powershell
npx vite --host 127.0.0.1 --port 4173
```

In a second PowerShell window, set `TYPESAFE_API_KEY` and record all seven Rival Hard courses:

```powershell
1..7 | ForEach-Object {
  node tools/rivals-record.mjs `
    --slot $_ `
    --powers phase,dash `
    --runs 1 `
    --opponentIndex (9700 + $_) `
    --jev `
    --jevProfile rival-hard `
    --jevMaxRequests 2000 `
    --jevMaxInputTokens 4000000 `
    --jevTimeoutMs 15000 `
    --headed `
    --video `
    --videoDir tools/recordings/jev/rival-hard-v1/video `
    --url http://127.0.0.1:4173 `
    --out tools/recordings/jev/rival-hard-v1
}
```

Replace `rival-hard` with `apex` and use a separate output directory to record Apex.

Successful real API output must show:

- `profile: "rival-hard"` or `profile: "apex"`;
- model `jev-1.13.0` (or the real returned successor);
- HTTP status 200 responses;
- `tokenSource: "api"` and positive billed tokens/cost;
- zero raw Jev movement actions;
- no budget stop;
- a valid 7/7 race capture.

## Assembling banks

Always dry-run first.

Rival Hard:

```powershell
node tools/rivals-assemble-jev.mjs --profile rival-hard --in tools/recordings/jev/rival-hard-v1 --fresh --dry
node tools/rivals-assemble-jev.mjs --profile rival-hard --in tools/recordings/jev/rival-hard-v1 --fresh
```

Apex:

```powershell
node tools/rivals-assemble-jev.mjs --profile apex --in tools/recordings/jev/apex-v1 --fresh --dry
node tools/rivals-assemble-jev.mjs --profile apex --in tools/recordings/jev/apex-v1 --fresh
```

The assembler must reject incomplete, fallback-finished, mocked, unbilled, invalid, duplicated, or wrong-profile captures. It also verifies that `public/rivals/v2` is byte-for-byte unchanged.

## Why many variants are required

One ghost per course is not enough for production. Players would learn the ghost's route and stash outcome. Record many independent sessions per course with different `opponentIndex` values and freshly generated match stash seeds. Keep every completed race as a separate replay; do not edit replay events or hashes.

A future batch should include multiple runs per course and ideally multiple allowed power loadouts. Continue recording sequentially—never parallelize paid Jev pages because they would share limits and make provenance ambiguous.

## Replay sound

Player-facing replays do not require audio embedded in the stored capture. Replay traces contain power events, and `RivalReplayPlayer` already plays the corresponding effect and shows a power toast. A dash/phase that looks like teleportation should therefore be accompanied by its in-game replay sound.

The recorder's MP4 files are diagnostic media only. Current Chromium runs can print audio decoding errors and may produce silent MP4s; those errors do not remove power events or sounds from the in-game replay.

If replay sound is missing in the game, debug `RivalReplayPlayer` and the source sound assets. Do not add audio blobs to bank replay JSON.

## Validation

Relevant fast checks:

```powershell
node test/jevProfiles.test.mjs
node test/jevState.test.mjs
node test/jevStrategist.test.mjs
node test/botDriverJev.test.mjs
node test/rivalJevBank.test.mjs
node test/rivalMatchmaking.test.mjs
npm run build
```

`npm test` has a known Windows checkout/line-ending failure in some city tests even on otherwise clean trees. Run the full suite from an LF checkout when certifying a release.

## Latest verified behavior

- Apex recorded several 35–50 second seven-house clears and is intentionally near-unbeatable.
- Rival Hard is more beatable and human-looking but remains a strong opponent.
- One observed Rival Hard Switchyard Seven run cleared in 120 seconds with 13 retries.
- Lastlight Loop cleared in 62 seconds with one retry.
- Blacktop Crown cleared in 67 seconds with two retries.
- The API relay was healthy, all calls returned 200, and the runs used real billed Jev tokens.

## Next work

1. Push the user's completed `tools/recordings/jev/rival-v1/` captures.
2. Dry-run them into `jev-rival-hard-v1`. The assembler accepts the legacy recorded profile name `rival` as Rival Hard.
3. Review the seven summaries and assemble the initial Hard bank.
4. Record many additional variants per course before production exposure.
5. Design a softer normal `Jev Rival` profile separately. Prefer small response latency after objective changes over random bad routes; retain the good routing, power timing, and retry learning.
6. Add a deliberate UI entry point for Apex/Hard challenge banks before exposing them. They are intentionally not part of ordinary matchmaking today.

## Safety and provenance

- The API key stays in the Node recorder process. The page receives only a sentinel.
- Never commit `.env` files, keys, relay headers, or raw secrets.
- Never hand-edit a race to make it bankable.
- Preserve profile, returned model, HTTP status counts, billed token counts, cost, renderer, FPS, source capture path, and driver versions.
- Keep Apex immutable. Balance changes belong in a new versioned profile.
