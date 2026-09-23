# Block Rivals matchmaking presentation — handoff for Claude

## The job

Work on the **player-facing simulated PvP experience**, not on Jev. The Jev
strategist, motor, power use, profiles and recording pipeline are good enough
and an 8,064-race, three-profile capture is running in the background. Do not
redesign drivers, tune Jev, restart the capture, or rebuild `dist` while it is
recording. Normal Jev belongs in ordinary matchmaking; Apex and Rival Hard are
separate challenge banks. Later, runs recorded from real players should be
usable through the same opponent presentation.

The product goal is that Block Rivals *feels like a real PvP match* from the
first tap through the result. The opponent is selected from recorded runs for
now. Make the match flow convincing and polished in-game. Do not add
disclaimer/explanation screens or copy about simulated opponents, recordings,
or whether anyone is online; the developer will handle promotional disclosures
outside this flow. A rival visibly named Jev is intentional and part of the
appeal. The UI should also accommodate future real-player identities and
their recorded runs without needing a second presentation system.

## Use the completed Normal recordings now

The active batch records **Normal Jev first**, round-robin across 21 courses.
At the last check, 112 full seven-house Normal races were complete across 14
courses; Apex and Rival Hard had not started. These are valid playable replay
captures, not MP4s. They can already be used to test matchmaking and the new
lobby; the full 8,064-race batch is not a prerequisite.

Wait until the first 21 eight-race jobs finish (at least 168 Normal races,
eight variants on every course) before a partial *public* Normal bank. Check
with `node tools/rivals-variant-progress.mjs --plan tools/plans/jev-v1.json
--out tools/recordings/jev/fresh-normal-v1`. Dry-assemble from **only** that
fresh folder using `node tools/rivals-assemble-jev.mjs --profile normal --in
tools/recordings/jev/fresh-normal-v1 --fresh --dry`; verify accepted count,
zero rejected, and all 21 course slots. Then the same command without `--dry`
can replace `client/public/rivals/jev-v1/` with the partial bank. It does not
stop the recorder or change Apex/Hard or the ordinary bot bank. Repeating the
fresh assembly later incorporates more completed Normal variants. The
background launcher will assemble the complete Normal bank when its plan is
finished.

Raw captures under `client/tools/recordings/jev/fresh-normal-v1/` are
git-ignored; the assembled replay JSON under `client/public/rivals/jev-v1/`
is what the game loads and what a release must ship. The uncommitted 21-course
game code must ship with any 21-course bank. Do not rebuild the shared
`client/dist` or interfere with the active recorder; use a separate dev server
for UI work. This partial bank is ideal for exercising the new presentation,
but eight variants per course are an early release sample, not the eventual
128-pattern coverage.

## Current problem, demonstrated by the attached 2026-09-22 phone screenshot

The city/block presentation is liked and should stay. The sequence is wrong:
`LOOK FOR MATCH` currently leads to the map/power choice, and only **after**
those choices does the game show `FINDING RIVAL`. That reverses the emotional
logic of a match. The search screen itself feels like a placeholder: a huge
dark modal covering an already-loaded house, generic sonar rings, a spinning
`RIVAL` name tile, a prominent empty timer and status text repeating the
course name. The house and 0:00 HUD visible underneath make it feel as though
the race has already been staged before an opponent was found. The modal
hierarchy, spacing, typography and animation need a cohesive redesign, not
another line of status text.

## Required flow

1. `LOOK FOR MATCH` immediately begins search. Show a dedicated, attractive
   matchmaking state grounded in the city/block visual language. Do not show
   the power picker or a live house arena underneath it. Search is cancelable.
   Vary the search duration naturally: some rivals appear almost at once,
   others take several seconds, occasionally near the limit. Never exceed
   about 10 seconds of searching. Avoid an obvious fixed delay, fixed sequence
   of status phrases, or the same timing distribution every match. If no
   eligible record is available by the cap, give the player a clean retry or
   back path rather than announcing a rival who was not actually selected.
2. A rival is found. Reveal the rival's identity and a clear match-found
   transition. Keep that identity present through the following selections;
   it should feel like one continuous pre-match lobby, not unrelated modals.
3. **After** rival-found, show the course/map choice and the player's power
   selection. The player may inspect/change these before locking in. The
   course card should use the existing map/block art, which the developer
   likes. Do not force a new navigable city map.
4. The player presses **READY** once. Lock the chosen course and powers and
   transition to the race. For Jev recordings, start the countdown immediately
   after Ready; do not manufacture an opponent-wait delay. The lobby design may
   support an opponent-ready state for other opponents/future live PvP, but
   this must not slow the Jev path. No second `LOOK FOR MATCH` button here.
5. The seven-house race, progress HUD, result, and `WATCH RIVAL` continue to
   use the actual selected record and replay. No fake split times, fabricated
   performance, or changes to a banked run.

Implement the state transitions explicitly (`searching → found → selecting →
ready → countdown → racing`) so cancellation, back navigation, scene restart,
mobile resize and asynchronous opponent loading cannot skip a step, open two
modals, or start the countdown before the player's Ready. The search visual
should communicate activity without a canned roulette or an obviously fake
fixed delay. Use the found rival's real display name and available record data
in the presentation. If no eligible opponent is available, handle it as a
recoverable flow rather than quietly substituting an unrelated run.

## Important matchmaking constraint

Today `resolveRivalOpponent(race)` loads **per-course** banks and chooses a
specific recording before the course selection UI. That architecture does not
support a genuine post-search map choice as-is. Refactor the selection boundary:
find an opponent identity/profile (or eligible cohort) first, offer only
courses for which that opponent has valid recordings, then select the concrete
record for the chosen course before Ready. Do not show a selectable map and
silently swap to another rival when it is chosen. If the UX chooses an assigned
map instead of a free choice, make that clearly the matched map in the found
lobby; do not present a fake choice.

Keep stash fairness: each match uses the chosen recording's seven-house stash
pattern, which remains stable through retries; a later match can choose a
different pattern. Never reveal the genuine stash or choose a recording using
hidden information from the player's current attempt. Normal Jev, ordinary
bank opponents, and future real-player recordings should pass through one
match-flow abstraction, while challenge-only profiles remain separately
selectable.

## Code map

- `client/src/controllers/RivalsRace.js`: `prepare`, `openDistrict`,
  `findMatch`, `openLoadout`, `armCountdown` currently create the reversed
  sequence and the screenshot's search UI.
- `client/src/utils/rivalSession.js`: `loadRivalOpponents`,
  `resolveRivalOpponent`, stash-seed alignment and replay URL selection.
- `client/src/logic/rivalMatchmaking.js`: current search timing, candidate
  carousel, landing and skill comparison.
- `client/src/controllers/RunnerLoadout.js`, `CityMap.js`,
  `RivalDistrictMap.js`: existing picker and map presentation to reuse.
- `client/test/rivalsFlow.test.mjs` and
  `client/test/rivalMatchmaking.test.mjs`: extend these for the new order,
  cancel/back, Ready gating, Jev immediate start and valid course/record
  pairing. Add visual/mobile checks for the phone-sized layout.

## Done means

On a phone, tapping `LOOK FOR MATCH` visibly starts a naturally variable,
at-most-10-second search **before** course and powers. Finding a rival leads to a coherent lobby with map and
power selection; Ready starts a Jev race without an artificial wait. There is
no exposed house gameplay behind a search modal, no generic roulette/sonar
placeholder, no double-search step, and no mismatch between the shown rival,
selected course, stash pattern, race pace and replay. Test the actual browser
flow and inspect screenshots, including small mobile viewports. Preserve the
running recording job and unrelated dirty worktree changes.

## Status (2026-09-22): implemented and committed

Committed on branch `claude/rivals-21-courses` (not merged). Nothing was
rebuilt into `client/dist`; the recording was left running.

- Flow and stages: `client/src/controllers/RivalsRace.js` (`startSearch`,
  `pollSearch`, `showFound`, `showLobby`, `lockIn`, `backToBlock`,
  `resumeMatch`). The harness path (`openLoadout`, `armCountdown`) is
  unchanged.
- Screen: `client/src/controllers/RivalMatchScreen.js` (one opaque surface:
  header you-vs-rival, block art with traffic while searching, course arrows,
  rival opening, power cards, LEAVE/READY).
- Pure logic: `client/src/logic/rivalMatchmaking.js` (stage table, search
  timing, settle rule, layout, monogram/short name).
- Matchmaking: `client/src/utils/rivalSession.js` (`RIVAL_OPPONENT_POOLS`,
  `rivalIdentity`, `findRivalMatch`, `applyRivalOffer`,
  `eligibleRivalEntries`); a territory race now starts on its block's course.
- HUD, result and Watch Rival use the rival's short name (JEV) when it fits.
- Tests: `rivalMatchmaking`, `rivalsFlow` (new city section), `rivalsCopy`
  (also scans the screen), `rivalJevBank` (challenge banks: named only in the
  pool table, never in the ordinary pool).
- Browser checks (headless Chrome against a separate dev server on 4190):
  320x568, 360x640, 375x667, 390x844, 844x390; found, no-rival, cancel,
  rotate mid-lobby, double-tapped READY, restart mid-lobby.

`jev-v1` now holds 328 Normal match-rules races (at least 8 on every one of
the 21 courses), so an ordinary search finds Jev. Verified in the browser as an
ordinary player on the dev server and on a production build: menu → Block
Rivals → LOOK FOR MATCH → Jev → map and powers → READY → race (every house's
real bag equals the bag Jev picked up in its recording) → WATCH RIVAL. On the
dev server, `?rivalPool=rival-hard` still shows a challenge pool.
