# Block Rivals courses and variant banks

Block Rivals has **21 fixed courses** of seven houses each. Slots 1–7 are
the original courses and are byte-identical to what every existing recording
raced. Slots 8–21 are **designed** courses: each has its own board size and a
layout per house, so they differ in structure and tactics, not just in seed.

## The 21 courses

Measured by `node tools/rivals-course-report.mjs --markdown` on the real
generator (every column is a per-house average unless it is a count):

- **Walls %**: interior wall density.
- **Run**: the shortest full run in walking steps (spawn, the nearer bag, car).
- **Worst**: the run when the first bag is bunk (spawn, one bag, the other, car).
- **Chokes**: hard chokes over the whole course, meaning single cells a plug can
  hold with no way round.
- **No-alt legs**: legs (spawn→bag, bag→car) with no fully separate corridor.
- **Long lanes**: straight floor runs of 8+ cells (dash room, and firing lanes).
- **Phase**: one-cell walls where phasing saves 6+ steps.
- **Plug→bag**: how close the plug starts to the nearer bag.

| # | Course | Board | Districts | Walls % | Run | Worst | Chokes | No-alt legs | Long lanes | Phase | Plug→bag | Character |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Low End Rush | 16x35 | legacy | 14.6 | 33.7 | 79.4 | 0 | 0 | 36.1 | 9 | 10.3 | Original course: the legacy scatter generator at rising density. |
| 2 | Copper Climb | 16x35 | legacy | 14.1 | 32.9 | 68.3 | 0 | 0 | 39.3 | 10.9 | 10.1 | Original course. |
| 3 | Freight Run | 16x35 | legacy | 13.9 | 27.1 | 64.3 | 0 | 0 | 36.4 | 11 | 8.9 | Original course. |
| 4 | Afterglow Mile | 16x35 | legacy | 14.5 | 26 | 61.1 | 0 | 0 | 38.6 | 9 | 9.3 | Original course. |
| 5 | Switchyard Seven | 16x35 | legacy | 13.8 | 24 | 60.6 | 2 | 2 | 39.9 | 11.4 | 10.1 | Original course. |
| 6 | Lastlight Loop | 16x35 | legacy | 13.3 | 27.7 | 64.3 | 0 | 1 | 38.6 | 10.4 | 11.1 | Original course. |
| 7 | Blacktop Crown | 16x35 | legacy | 14.3 | 26.6 | 68.6 | 0 | 3 | 39.1 | 11.1 | 10.7 | Original course. |
| 8 | Canal Street | 16x35 | lanes | 15.2 | 35.3 | 77.3 | 0 | 1 | 26 | 17.9 | 14.3 | Twin lanes either side of a canal wall; commit to a side, cross where the wall opens. |
| 9 | Rooftop Relay | 16x39 | bands | 15.3 | 34.4 | 81.3 | 0 | 6 | 43 | 22.1 | 13.4 | Banded rooftops on a tall board: switchbacks with shortcut doorways; phase skips a floor. |
| 10 | Market Square | 18x33 | pillars | 14.1 | 31.1 | 58 | 0 | 0 | 39.3 | 7.9 | 11.1 | Wide open plaza of pillars: cover against long sightlines, bags in the middle with the plug. |
| 11 | Tunnel Nine | 14x37 | none (dense) | 23.2 | 40.7 | 89.6 | 4 | 6 | 20.6 | 21 | 11.7 | Narrow, dense warren of thin walls: tight tunnels where phase shortcuts pay most. |
| 12 | Crosstown Loop | 16x35 | ring | 18.7 | 38.4 | 80.7 | 0 | 1 | 29.7 | 47.3 | 16.1 | Ring road round a walled core: always two ways round, one bag inside, one out on the ring. |
| 13 | Dockside Drop | 16x37 | bands | 14.9 | 37.7 | 74.9 | 0 | 3 | 42.6 | 13.7 | 14.3 | Out and back: bags at the far end of the dock, car by the start — a long carry home past the plug. |
| 14 | Brickyard Courts | 18x35 | rooms | 17.6 | 39 | 71.3 | 0 | 1 | 32.4 | 13.1 | 12.9 | Courtyards and doorways: the plug holds a room, you choose another door. |
| 15 | Grid Iron | 18x37 | streets | 23 | 38.9 | 75.1 | 0 | 0 | 33.9 | 7.4 | 13.7 | Street grid of city blocks: long lanes both ways, a parallel street for every street, closures later. |
| 16 | Ember Alley | 14x39 | lanes | 20.2 | 40.4 | 84.7 | 0 | 0 | 21 | 36.4 | 13.4 | Three long alleys on a narrow tall board with few crossings: pick one, or phase through the wall. |
| 17 | Neon Terrace | 16x35 | pillars → ring → bands | 17.2 | 32.4 | 64.1 | 0 | 2 | 32.3 | 18.3 | 11.6 | Escalation: an open terrace that closes in house by house, a new district type each time. |
| 18 | Undercroft | 16x33 | none (dense) | 19.7 | 38.3 | 66.3 | 0 | 0 | 30.4 | 15.7 | 7.4 | Low, dense and crowded: a short board where the bags always sit under the plug's nose. |
| 19 | Harbor Lights | 20x33 | bands | 15.2 | 38 | 68.3 | 0 | 1 | 38.6 | 22.9 | 12.7 | Wide waterfront: long lanes across the board, bags at opposite ends of it. |
| 20 | Switchback Stairs | 16x37 | bands (serpentine) | 14.8 | 66.9 | 108.9 | 2 | 18 | 41.3 | 32.9 | 18 | A true switchback: shortcut doorways early, then one walking route where phase is the fast way. |
| 21 | Last Call Heights | 18x39 | rooms → streets → ring → lanes → bands → pillars | 20.8 | 50.1 | 75.6 | 0 | 3 | 34 | 28.4 | 11.4 | Finale on the biggest board: every district type once, at full pressure. |

Difficulty rises within each designed course: density goes up, doorways and
crossings thin out, and from the middle houses the bags may sit on the plug's
side (`contested`). House 6 and 7 of **Switchback Stairs** are the pool's
only deliberate single-route houses. Every band is a one-cell wall, so the
counterplay is phase, or timing that can be learned on a retry. Everywhere
else a house must pass its design's acceptance rules. There are no hard chokes
except a few on the dense warrens, where the walls are thin enough to phase.

`node tools/rivals-course-report.mjs --slot N` prints any course house by
house.

## How a designed course works

`src/logic/rivalCourseDesigns.js` holds the designs as data. Each house has:

- **structure**: stamped first, one cell thick. The kinds are `lanes`, `bands`
  (with `serpentine` for switchbacks), `ring`, `rooms`, `streets`, `pillars`
  and `none`.
- **pieces / fill / gap**: which wall pieces fill the rest, how many, and how
  close together they may sit.
- **objectives**: zones for the runner, the plug and each pocket, whether a
  pocket may sit on the plug's side, and which border the car's driveway opens
  in.
- **accept**: the acceptance rules. These cover run length, hard chokes, legs
  with no separate corridor, the gap between the pockets, and how far the plug
  starts from the runner. Also: a leg with no separate corridor must not have
  the plug starting within 4 steps of it. The first smoke bots looped 70–80
  times on exactly those houses: the only way through, with the plug
  standing on it.

`utils/mazeGenerator.generateDesignedMaze` draws candidates from the house's
own seeded stream and keeps the first one that passes its rules
(`logic/rivalCourseAnalysis.js` measures them). That makes it as
deterministic as the legacy generator: the same house on every device and in
every replay. A designed pocket must reach the car from either bag, and a
designed house never uses the legacy centre-cross fallback.

Every system that rebuilds a house goes through `rivalHouseMazeOptions`
(course and house) or `rivalHouseDesign` (house seed only, which is what a
replay segment knows). That covers the live scene (board size included), the
replay player, the simulated pace, the tests and the tools. No replay field
was added.

**Do not edit a shipped design.** It changes the houses and retires every
recording on that course. `test/rivalCourses.test.mjs` pins two fingerprints:
the original 49 houses, which must never change, and the 98 designed houses,
whose pin changes only on purpose. Add a course instead.

## City circuit

Each circuit city is seven blocks, one course each:

| City | Courses |
|---|---|
| Riverside Circuit | 1–7 |
| Harborline Circuit | 8–14 |
| Skyline Circuit | 15–21 |

After Skyline the circuit starts again ("Riverside Circuit 2", …), from
course 1. A New Race outside the city picks any of the 21 at random.

## Matching a rival, and why variants matter

A recorded rival races the same seven stash answers as the player.
Previously a match drew a random stash seed and could only meet a recording
with exactly the same seven-house pattern, 1 in 128. That left almost every
bank recording unused, and the ordinary bank had none recorded under match
rules at all.

Now a match that did not ask for a particular seed **adopts its chosen
rival's stash seed** before the first house starts. See
`utils/rivalSession.applyRivalOffer` (players) and `resolveRivalOpponent`
(tools and the recording harness), and
`BaseGameScene.realignRivalStash`: the two bags are identical sprites, so
re-pointing which one is real is invisible. Every match-rules recording in a
course's pool is eligible, and which bag is real changes from match to match
because each variant carries its own seed. It stays stable across retries
inside a match, and is never shown. Records without match stash rules never
qualify.

There is **no rematch**. Racing the same recorded rival again would replay
its route and its answers. The result screen offers New Race or Next Block,
and each meets a freshly chosen rival. Selection already avoids the last few
rivals raced on a course.

So a course needs many independent variants, each with its own stash seed,
opening, first bag, power timing, retries and time.

### The match, as the player sees it

`LOOK FOR MATCH` on the block screen starts searching at once. Search, reveal
and lobby are one opaque screen (`controllers/RivalMatchScreen.js`) with a
you-vs-rival header that stays put; the house built underneath is first seen
when READY starts the countdown. The stages are explicit
(`logic/rivalMatchmaking.js`: block → searching → found → selecting → ready →
countdown → racing) and live on the race, so cancel, back, resize and a late
network answer cannot skip one or start anything twice.

1. **Search.** `findRivalMatch` loads the block's own course and three random
   others from the match's pool, picks ONE rival identity by measured pace
   (all Jev races in a bank are one rival; a future player bank would be one
   rival per account), and keeps only the courses that rival has valid
   match-rules races on, each with its concrete record already chosen. The
   race is not touched. The search length is drawn per match
   (`planMatchSearch`: mostly a few seconds, sometimes almost instant, rarely
   near the cap) and never passes 10 seconds; nobody eligible by then gives
   NO RIVAL FOUND with SEARCH AGAIN and BACK, never a stand-in.
2. **Found.** The rival's empty slot fills with their name.
3. **Lobby.** The course card is the existing block art with arrows when the
   rival has more than one course; under it, the rival's real opening powers
   on that course, then the player's powers. LEAVE goes back to the block.
4. **READY**, once. `applyRivalOffer` applies the offered record (its times,
   stash seed and replay) and the countdown starts at once. Another course
   than the one already built restarts the scene into that course's first
   house under the countdown. A win on any offered course claims the block.

Pools never mix: `ordinary` is `v2` + `jev-v1`; `rival-hard` and `apex` are
separate pools, used only when a race names one (`rivalPool` in the scene
data; on the dev server, `?rivalPool=rival-hard`).

## Banks and targets

Opponents are **Jev only** from here on. The ordinary style bots are no
longer recorded; their legacy `v2` bank stays in place but cannot be
matched (below).

| Bank | Path | Who meets it | Target per course |
|---|---|---|---|
| ordinary style bots (legacy, no longer recorded) | `client/public/rivals/v2/` | ordinary matchmaking | — |
| Normal Jev | `client/public/rivals/jev-v1/` | ordinary matchmaking | 128 |
| Jev Apex | `client/public/rivals/jev-apex-v1/` | challenge only — not in ordinary matchmaking | 128 |
| Jev Rival Hard | `client/public/rivals/jev-rival-hard-v1/` | challenge only — not in ordinary matchmaking | 128 |

`node tools/rivals-bank-report.mjs` reports each bank course by course. For
each course it shows:

- recorded variants and matchable variants (those with match stash rules);
- distinct stash seeds and seven-house answer patterns;
- houses where both first-bag choices occur;
- distinct opening loadouts;
- fastest, median and slowest times, and the retry range;
- duplicate IDs.

It warns on every course under target. `--strict` exits non-zero if any
course is short, and `--json` gives machine-readable output.

Current state:

- `jev-v1` (Normal) holds the first 41 sealed jobs of the fresh Normal
  recording (`tools/plans/jev-v1.json`): 328 races, 16 on each of courses
  1-20 and 8 on course 21, all with match stash rules and a distinct
  seven-house pattern per race on each course. It replaced the 7 historical races (no match rules), which
  git still has. Ordinary players now meet Jev on every course. Re-assemble
  with `--fresh` as the recording continues; the plan's target is 128 per
  course.
- Apex 7 and Rival Hard 7 (one per original course, all matchable).
- The legacy `v2` bank has 140 recordings, none with match stash rules, so
  none can be matched.

## Recording plans

`tools/rivals-variant-plan.mjs` writes reproducible plans for
`tools/rivals-record.mjs --plan`:

| Plan | Races | Per course | Variety |
|---|---|---|---|
| `tools/plans/jev-v1.json` (Normal) | 2,688 | 128 | every stash pattern; 5 single-mobility loadouts |
| `tools/plans/jev-apex-v1.json` | 2,688 | 128 | every stash pattern; 5 opening loadouts |
| `tools/plans/jev-rival-hard-v1.json` | 2,688 | 128 | every stash pattern; 5 opening loadouts |

- Each job records 8 races in one page, each on its own planned stash seed,
  so a course's 128 races cover all 128 seven-house answer patterns. Jobs
  round-robin across courses, so a partial batch covers every course.
- Each job owns a block of opponent indices that never overlaps: Apex from
  100000, Rival Hard from 200000, Normal from 300000, plus 1000 per slot.
- Recording IDs also hash the clear times, so they are unique.
- Regenerate a plan for a subset with `--slots 8-21` or change the size with
  `--per-course N`.

Jev (sequential; the recorder forces it). Record from a fixed build rather
than the live dev server, because an edit mid-batch reloads the page:

```powershell
cd C:\dev\plug-run\client
npm run build
npx vite preview --host 127.0.0.1 --port 4174 --strictPort
# second window, TYPESAFE_API_KEY set:
node tools/rivals-record.mjs --plan tools/plans/jev-rival-hard-v1.json --jev --jevProfile rival-hard `
  --jevMaxRequests 2000 --jevMaxInputTokens 4000000 --jevTimeoutMs 15000 --headed --video `
  --videoDir tools/recordings/jev/rival-hard-v1/video --url http://127.0.0.1:4174 `
  --out tools/recordings/jev/rival-hard-v1 --resume
```

Use `--jevProfile apex`, `tools/plans/jev-apex-v1.json` and
`tools/recordings/jev/apex-v1` for Apex. `--resume` skips jobs already
recorded, so an interrupted batch picks up where it stopped.

Then assemble (always dry-run first) and report:

```powershell
node tools/rivals-assemble-jev.mjs --profile rival-hard --in tools/recordings/jev/rival-hard-v1 --dry
node tools/rivals-assemble-jev.mjs --profile rival-hard --in tools/recordings/jev/rival-hard-v1
node tools/rivals-bank-report.mjs
```

Banks hold many opponents per course. Each replay is kept as its own file,
and a pass adds to the bank rather than replacing it (Jev: `--fresh` rebuilds
from `--in` alone). The Jev assembler refuses any capture from the wrong
profile: Apex and Rival Hard never cross, and neither enters `jev-v1`. It
also refuses mocked, unbilled, budget-stopped, forfeited, incomplete or
duplicate races, and it checks that `v2` is untouched after every write.

## Replays

A replay's power events play the live game's own cues at the live settings
(dash is the quick, high-pitched cue). The power is named where the rival used
it, and dash and phase show a burst. While phasing the rival is translucent.
No audio is stored in bank JSON; the event is enough. The recorder's MP4s are
diagnostics only.
