# Iron Row Season 1 — normalized implementation

The raw Gemini conversation is preserved in `IRON_ROW_SEASON_1.md`.
Runtime consumes only the last approved ten-chapter specification, translated
into import-free `client/src/logic/ironRowSeason.js`. The earlier drafts are
not extra events, rewards or implementation instructions.

## Chapter schedules

All slots are pre-house consultations. A finish is AFTER extracting from house
15, not before entering it. An absent slot is silent. The crew's existing
fifteen-house completion gate advances chapters; deaths/retries do not.

| Chapter | Story title | Speaking before houses | Reactive slot | Mandatory house 9 case contents |
| --- | --- | --- | --- | --- |
| 1 | Asphalt Welcome | 1, 4, 9, 10 | 10 | Industrial Burr Grinder |
| 2 | Service Corridor | 1, 7, 9, 13 | 13 | Pneumatic Impact Wrench |
| 3 | Scrap Mile | 4, 9, 10, 13 | 10 | Brass Ship Clock |
| 4 | Neon Strip | 1, 7, 9, 13 | 13 | Portable Thermal Laminator |
| 5 | Copper Terrace | 1, 4, 9, 10 | 10 | Industrial Master Toggle Switch |
| 6 | Boiler Line | 4, 7, 9, 13 | 13 | Cast-Iron Waffle Plates |
| 7 | Rivet Flats | 1, 4, 9, 10 | 10 | Handheld Metal Label Embosser |
| 8 | Canal Run | 7, 9, 10, 13 | 10 | Heavy-Duty Hydraulic Stool Cylinder |
| 9 | Granite Ridge | 1, 4, 9, 13 | 13 | High-CFM Blower Motor Core |
| 10 | Sovereign Center | 1, 4, 9, 10, 13 | 10 | Solid Brass Counter Bell |

Each chapter retains its exact fixed panel order and Brick/Rook speakers,
look-ahead tease when authored, job briefing and duo finish. The shop callbacks
connect grinder -> waffles -> ventilation; missing wrench -> laminator -> metal
labels; the chapter-10 bell closes their running argument.

## Reactive contract

The bank contains 96 reactive lines (6 per speaker per category) and 16 neutral
lines. Slot eligible-ID lists AND minimum chapters apply. Selection is
deterministic from global block, house and chapter, not Math.random.
At most one reactive line is spoken per block. Category order:
FLAWLESS, COMEBACK, ZERO_DEATHS, NO_POWERS, BUNK_BAGS, POWER_PHASE,
POWER_DASH, POWER_DECOY. Replace only sentence one of the designated check-in;
preserve its remaining encouragement and all other authored text.

| Category | Condition, after >=1 recorded clear |
| --- | --- |
| ZERO_DEATHS | All block deaths = 0 |
| FLAWLESS | All block deaths = 0 and bullet-hit events on successful clears = 0 |
| COMEBACK | All block deaths >= 3 (never exactly three) |
| NO_POWERS | Activations on successful clears = 0 |
| BUNK_BAGS | At least 2 successful clears with a bunk touch; existing boolean telemetry is a conservative lower bound |
| POWER_PHASE / DASH / DECOY | Named activation count >= 2 and strictly greater than both other counts on successful clears |

All predicates require complete, trustworthy history. `historyKnown` begins
before a fresh house-1 attempt, not at extraction. Per-clear `measured` requires
explicit nonnegative integer hits, a boolean bunk field and a valid two-slot
activation array. Missing data is not zero. Legacy/corrupt histories retain
clears but cannot earn performance dialogue on that block. No fabricated
backfill. At a check-in, contiguous measured clears must cover exactly every
prior house. Account-scoped storage remains `pr_blockrun_v1_<user>`.

Neutral fallback replaces the same generic opening; it records no praise mark.
After the cap is spent, use fixed dialogue. Teases always specify Rook will
brief house 9 later, with no implied pickup in the teased house. Claims retain
existing event IDs, so upgraded content does not replay a seen consultation.
Mission debriefs outside this arc never consume praise that was not spoken.

## Deliberate content/compatibility edits

- Scope no-powers and bullet-hit praise to successful clears. Do not claim
  failed attempts were unassisted or unharmed. Remove the residual jacket
  “scratch” claim, unmeasured “street is clear,” and an implied bag-drop mechanic.
- Brass-bell banter requires chapter 11, AFTER acquiring it at chapter 10.
  It stays in the reusable bank but is not prematurely enabled in Season 1.
- Existing crew chapter counts remain authoritative; no account resets,
  migration grants or rewinds. This pass retrofits the same crew campaign,
  not a newly persisted season with its own unlock history. Chapter 11+ keeps
  the existing ongoing story and service-key job, not a repeated season finale.
- Use actual city labels, not a hard-coded Duskport for a player who joins
  Iron Row later. Crew chapters and permanent global block/city indices differ.
  Story titles are chapter titles, not replacements for generated block names.
- The final cover celebrates 150 stashes for Iron Row and the shop coming online.
  Do not promise city-wide crew ownership, Copper Bay/ferry access or global
  rival victory solely because the player finished ten Iron Row chapters.
  Existing city unlocks and personal map ownership still follow world progress.
- The floor object remains one violet code-drawn case. Change chapter contents
  labels and compact toast names only, retaining current key-foley. No new
  prop artwork/sounds, RNG domains, collision mutations or rewards.

## Runtime wiring and review

`ProgressionManager` selects the season for Iron Row's authored chapters only.
All other crews, Daily, Tutorial and Block Rivals keep their prior narrative
flow; Rivals never sees these contacts or mission requirements. Mandatory house
9 still requires BOTH case and stash before extraction; the final live clear
alone advances the story. The approved duo celebration and result remain.

`ContactPanel` follows each page's speaker for portrait/layout, keeping the
host's one loaded room. Keyboard/touch/world stay paused until the following
loadout starts the match; do not resume input between pages or modals.

Open `/contact-preview.html` on the Vite dev server for chapter/house/condition
review, full dialogue bank and 280x480, 390x844 and 900x640 sizes. No saves,
currency or unlock changes. This root preview is dev-only, not production
routing. Its inline module is included in native syntax tests.

Adapted V8 verification: 40 existing suites before/after, new season suite after
(1,543 assertions), and unchanged actual bank integrity (402 assertions, 55
recordings). Forty-two adapted suites pass after edits; contactArt binary
inspection and native moduleSyntax remain unexecuted. Source parses/import
checks are not native ESM/Vite proof. No local execution under Carbon Black.

Required before release: allowed `cd client; npm run verify`, phone/desktop
preview, later two-speaker consultations and steering, resize/reload/retry,
chapter-specific mandatory case/toast/audio and chapter-10 finish. No reward
work until Cash ledger retention is fixed. Master is the live deploy branch.
