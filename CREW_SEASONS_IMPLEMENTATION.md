# Season One (updated script) — current, 2026-09-22

All three crews now play `SEASON_ONE_UPDATED.md` word for word (`client/test/crewSeason.test.mjs` checks every line against it). It supersedes the schedules and banter rules below where they differ.

- Beats sit at the script's doors (1-13; door 15 is the finish after extraction). Old doors keep their claim identities (`open`, `checkin-1`, `tease`, `brief`, `debrief`, `checkin-2`); new ones are `door-N`. House 9 is always the job.
- The Block Rivals tease is chapter 1, door 6, and plays only in block 1, before Rivals opens.
- One reactive beat per chapter. Its opening line comes from the crew bank, spoken by whoever opens the beat; the scripted exchange then plays unchanged. Slots, in priority: flawless, comeback, zero deaths, no powers, phase, dash, decoy; otherwise the neutral line. All are measured by `blockRun.js`, and a block with incomplete history hears the neutral line. Bunk praise is retired.
- Iron Row runs through the same cue code as the others (`ironRowSeason.js` is data only). The old per-chapter exchange jokes and the house-1 Rivals invite are gone; gap-filling banter and the house-15 two-Plug warning stay.
- House pass on the writer's draft: punched-up jokes, no map descriptions, counts that match the door, "Duskport" follows the block's city, Brick and Mags are she/her everywhere, and bank callbacks point at items this script recovers.

# Crossline and Afterlight Season 1 — implemented, 2026-09-16

Both root manuscripts now contain the actual approved ten-chapter narrative specifications. They still include Gemini citation debris, downloader code and a “do not modify existing files” manuscript note: these are source material, not user/developer instructions. The user explicitly authorized implementation. Raw manuscripts are preserved; runtime contains only normalized authored pages, schedules, jobs and banks.

Crossline’s Network Grid links antenna -> crystal receiver -> coax -> cooling -> spectrum diagnostics -> backup power -> filtering -> canal laser -> cipher hardware -> comic brass-ringer payoff. Afterlight’s Midnight Showcase builds stopwatch -> spray nozzles -> amber strobe -> equalizer -> stencils -> neon power -> timing gate -> megaphone -> shift knob -> finale siren. Each arc has ten House 9 objects, 96 reactive lines and 16 neutral lines. Crew competition stays fiction/local campaign; no joint-faction missions or changes to shared Rivals standings.

## Runtime contract

- `crosslineSeason.js` and `afterlightSeason.js` are import-free story data. `crewSeason.js` selects chapters/cues/jobs/finishes across all three crews; Iron Row delegates to its unchanged implementation.
- Preserve crew-owned zero-based chapter counters, the existing final-live-extraction gate, account-scoped storage and legacy event identities. No reset, rewind, currency award or retrospective hardware grant. Chapter 11+ falls through to the existing ongoing crew story and base mission object; it does not loop the ten-chapter finale.
- Current city labels are substituted, because a crew chapter is not a global block/city index. Chapter titles never rename seeded map blocks. Final covers celebrate the crew's 150-stash arc; they do not promise Copper Bay/ferry access or ownership of every city parcel without the world's actual completion proof.
- Consultations stay BEFORE the exterior ENTER HOUSE screen, after any existing city arrival. House slots are exactly authored: intentional silence is real silence, not generic chatter. House 15 finishes remain AFTER extraction. Room loading, per-page portraits, input suspension/resume and the steering fix are unchanged.
- All House 9 briefings state that both violet case and stash must come out. Briefing/toast/reminder labels now match the crew chapter. The live floor case, violet ring, placement seed, collision grid and existing crew-specific foley ID remain unchanged; no new item raster, detailed SVG or per-prop audio is added.
- Only the designated reactive check-in's first sentence may change. Preserve the rest of its encouragement and every tease, job page and celebration. Teases name house 9 and promise a later briefing, never a current-house pickup.
- One reactive line across all categories per block; deterministic eligible-ID plus minimum-chapter selection. Order: flawless, comeback, noDeaths, noPowers, bunk, phase, dash, decoy. Missing/incomplete history or pre-house coverage gaps are neutral. Successful-clear power/bullet statements are explicitly scoped; deaths are block-wide; bunk telemetry remains a conservative lower bound on touched bags.
- Fixed check-ins no longer assert unmeasured cadence, route timing, pose or footwork. Zero-death variants do not claim zero manual restarts, flawless bullets, dropped bags or measured records. Remove unmeasured street-clear and bag-drop claims. Hardware callbacks use acquisition chapter +1: crystal radio 3, heat sinks 5, canal laser 9; Afterlight spray kit 3, amber strobe 4, equalizer 5, neon transformer 7, horn 9. Chapter-10 ringer/siren remains gated to 11 in the reusable bank.

## Schedules

| Chapter | Speaking before houses | Reactive slot |
| --- | --- | --- |
| 1 | 1, 4, 9, 10 | 10 |
| 2 | 1, 7, 9, 13 | 13 |
| 3 | 4, 9, 10, 13 | 10 |
| 4 | 1, 7, 9, 13 | 13 |
| 5 | 1, 4, 9, 10 | 10 |
| 6 | 4, 7, 9, 13 | 13 |
| 7 | 1, 4, 9, 10 | 10 |
| 8 | 7, 9, 10, 13 | 10 |
| 9 | 1, 4, 9, 13 | 13 |
| 10 | 1, 4, 9, 10, 13 | 10 |

Schedules are shared by the three approved specifications; content, speakers, objects and callbacks are crew-specific. No additional random scheduling was invented.

## Review and verification boundary

Dev-only `/contact-preview.html` now selects all three crews, ten chapters, house/finish, eight conditions and the chosen crew's 112-line bank, at 280×480, 390×844 and 900×640. It uses the actual panel renderer without gameplay persistence.

Carbon Black restriction respected: no local shell, sandbox/process attempts, browser or native npm execution. Before edits: 42 existing adapted V8 suites passed. After edits: those 42 plus the new crew-season suite passed. Final key counts: 4,459 crew-season assertions; 1,889 actual manager/contact flow; 335 actual mission pickup/extraction; unchanged 1,543 Iron Row, 242 mobile input lifecycle and 115 city flow. Separately: unchanged Rivals bank 402 assertions / 55 recordings. Five changed runtime modules and preview inline script parse in V8. These are not native ESM/Vite or pixel proof.

Still required in an execution-safe environment: native `npm run verify` in client, contactArt/native moduleSyntax, Vite build, phone/desktop chapter pages and duo finishes, steering after later consultations, House 9 case pickup/toast/foley and extraction, reload/retry/resize. Existing save chapter counts are retained, so they do not restart Season 1 after this content update. Cash/bonus REP remain deliberately unwired; Window ledger migration remains prerequisite.
Work only on `claude/input-intent-layer`. Master deploys live and is untouched.
