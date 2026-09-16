# The Window — gangs, contacts and Cash design

Status: **initial onboarding/state slice implemented; rewards and commerce remain unimplemented**  
Written: 2026-09-15  
Target branch: `claude/input-intent-layer`

This document freezes the product direction agreed in the design conversation before implementation begins. Nothing described here should be treated as shipped until its implementation phase and acceptance checks are complete.

## Mandatory crew job at the house exit (2026-09-16)

The human confirmed the briefed object is vital: pickup of the violet case
AND the stash is required to leave that house. This supersedes the optional
object policy below. Completing the block therefore includes that job before
the chapter advances. Existing saved progress past the job house is retained.
No Cash or bonus REP is wired. Floor art remains a small violet case; pickup
adds a labeled pulse and synthesized item-specific foley. Dialogue says
stash/bag without the real qualifier. Duo completion gets bounded comic glints.

See HANDOFF_CODEX.md's current top note for exact gating and verification limits.


## Current crew-story slice (2026-09-16)

Run the Block now has independent local crew chapters, consulting BEFORE the
exterior house entrance. Crossline rebuilds its street network, Iron Row
revives the garage, and Afterlight prepares its own night event. Six authored
chapters per crew lead into numbered continuing runs. A chapter moves forward
only on a complete 15-real-stash block; the extra mission object is optional
for this storyline and awards nothing.

Finishing gets a code-native two-contact comic cover using the existing approved
WebP portraits, then the fully lit block summary. No new raster illustrations,
Cash, shop, shared standings or gang-switching were added. Chapter watermarks
live alongside contact beats in the existing account key and survive pruning.
Old records migrate empty; historical blocks are not retrospectively counted.

See HANDOFF_CODEX.md's top section for exact contracts and verification limits.
Runtime art is WebP and PNG originals live outside public/ in art-sources/;
older asset/compression notes below are historical.


## Currency naming clarification (2026-09-16)

The human renamed the proposed currency to **Cash**. No Cash earning/spending
is currently wired to gameplay. Existing runtime credit-named helpers/state
are unchanged by this documentation update; preserve/migrate saved data
deliberately when implementing Cash. Older handoffs using Store Credit refer
to the previous name, not a separate currency.

## Current implementation status

The initial phase-one/phase-two seam now exists on `claude/input-intent-layer`:

- pure gang, state, visit and idempotent credit-ledger logic
- account-scoped versioned persistence
- automatic first-contact introduction and one-time gang choice
- a code-drawn responsive Window shell with read-only section previews
- a permanent THE WINDOW main-menu entry after onboarding

The runtime deliberately does **not** grant Cash, advance missions,
sell/equip cosmetics, switch gangs or show shared standings yet. The approved
PNG art is now exposed through named production atlas frames, while dialogue
and controls remain live Phaser layers. Compression is still pending. Treat
every later economy/content phase below as unimplemented.


## Next requested gameplay-contact slice (2026-09-16)

Six location backdrops, a proposed six-object sheet and a composition review
page are prepared under client/public/art/the-window/contacts/. See that
folder’s README.md/manifest.json and /contact-art-preview.html. Runtime contact
missions remain unimplemented; existing characters should be composited over
these settings rather than re-created. Source PNG compression, alpha/occlusion
review and lazy loading remain required before production integration.

See CLAUDE_GAMEPLAY_CONTACTS_HANDOFF.md for implementation sequencing.
The human wants the selected gang's primary to check in every three houses
of Run the Block, tease a secondary-contact job around house 6, and have that
secondary brief a special-item-plus-real-stash objective before a coming house.
Successful mission-level extraction should earn bonus REP and +1 Cash.
This is a future slice, not active behavior; target house, bonus REP amount
and repeat/expiry policy are not finalized. Character locations, voice,
portrait settings and short Ro-style dialogue come first.
Do not add blocking contact panels or these rewards to Block Rivals.
These milestone missions are distinct from the unimplemented daily Jobs Board.

## Product goal

Plug Run needs faces and a lightweight reason to keep collecting stashes and REP, without turning the arcade game into a dialogue-heavy RPG. **The Window** is a neutral neighborhood bodega that anchors the world. It introduces the player to the streets, lets them choose a gang, delivers short daily updates and missions, and houses a cosmetic shop.

The simple long-term fiction is:

> Run blocks and win Block Rivals to bring your gang the most stash and REP.

The system should add identity and continuity while preserving the fast loop. It must not add gameplay advantages, territory simulation, crafting, gang combat, or long mandatory conversations.

## Main-menu placement

The proposed menu hierarchy is:

1. RUN THE BLOCK
2. BLOCK RIVALS
3. THE WINDOW
4. TUTORIAL
5. SETTINGS

On a player's first launch, the game opens The Window automatically for the short introduction and gang choice. Later visits are voluntary from the menu. A small warm indicator or **NEW** tag may advertise fresh daily news; do not force the full conversation on every login.

## First contact: Auntie Ro

Auntie Ro owns The Window and belongs to no gang. She is the player's first contact and the trusted neutral voice who explains how the city works.

Visual direction:

- Black/Puerto Rican woman in her early 50s
- silver-streaked braids, glasses chain and a visible shop key
- teal shirt, charcoal apron, practical bodega-owner silhouette
- warm, observant and funny; never presented as a tutorial mascot
- neutral palette so she does not visually belong to any gang

Ro's responsibilities:

- introduce the three gangs and host the initial choice
- explain new systems once, in very short panels
- provide citywide announcements and standings updates
- host The Window and its cosmetic Shelf
- explain Cash rewards
- remain neutral; she does **not** issue ordinary gang missions

Opening tone examples:

> “First time running? Then listen before somebody gets you embarrassed.”

> “New face, huh? Around here, nobody runs alone for long.”

> “Three crews move the stash. Same streets. Different way of carrying themselves.”

> “Listen to their pitch. Pick who you want at your back. You can worry about making them proud afterward.”

Dialogue should be one or two sentences per panel, always skippable after the first required choice.

## The three gangs

Gang choice changes identity, contacts, dialogue, color accents and future standings. It must not alter player speed, powers, map generation, weapons, rewards or race rules.

### Crossline

Street-reading, coordination and communication.

- **Switch — primary contact.** Indigo work jacket, gold hoodie and cyan route-arrow pin. Greets the player, summarizes the gang's position, introduces blocks and keeps attention on stash. Expression set: welcoming, concerned and impressed.
- **Mags — job contact.** South Asian woman in a green utility/map coat. Issues stash-, block- and correct-bag-streak missions.

Example Switch introduction:

> “Name’s Switch. Crossline keeps the streets talking—and tonight, they’re talking about you.”

### Iron Row

Discipline, survival and finishing the job cleanly.

- **Brick — primary contact.** Black woman mechanic in rust red; direct, protective and grounded.
- **Rook — job contact.** Mixed white/Middle Eastern man in a steel-blue maintenance jacket with keys. Issues clean-escape, survival and REP missions.

### Afterlight

Style, speed and competitive reputation.

- **Vee — primary contact.** East Asian nonbinary mural artist in violet. Delivers city and rival updates.
- **Sol — job contact.** Mexican American man in an amber racing jacket. Issues Block Rivals wins, target-time, win-streak and retry missions.

Example daily exchange:

> **Vee:** “Morning. Afterlight slipped to second overnight. We need bags.”

> **Sol:** “Three stashes before the block turns over. Extra REP if you do it without a retry.”

## Gang selection and switching

The player chooses one gang during first-contact onboarding. The choice is account-scoped and must survive reloads. A selected gang's primary contact becomes the everyday face of the game; its job contact supplies optional missions.

Gang switching lives inside **Your Gang** at The Window. Switching should use a clear cooldown or happen only at a weekly contest boundary so identity has meaning and standings cannot be gamed. The exact interval is still a product choice and must be confirmed before implementation.

## The Window sections

### Counter

Auntie Ro's greeting, city news, one-time system explanations and important updates.

### Jobs Board

Short optional daily missions calculated from authoritative events the game already measures:

- stashes collected
- houses and full blocks cleared
- REP earned
- Block Rivals wins
- completion time
- retries or deaths
- power use
- correct-stash streaks

Do not invent a parallel interpretation of a run. Mission progress should consume the same outcomes already used by progression and Rivals.

### Your Gang

Primary and job contacts, gang identity, personal contribution, future standings, and controlled gang switching.

Shared gang totals and weekly cross-player competition require trusted server accounting. Phase one must not display fabricated global standings.

### The Shelf

A Cash shop for cosmetics only:

- character and car colorways
- trails and extraction effects
- profile frames and gang banners
- outfits
- comic-book entrance treatments

Nothing sold here may change movement speed, weapons, powers, vision, map rules, opponent selection, rewards or completion time.

## Cash economy

Cash is a new account-scoped currency. It is separate from:

- **stash**, which advances block progression
- **REP**, which remains competitive/leaderboard score

Proposed earning rules:

| action | Cash |
|---|---:|
| daily visit and claim at The Window | +1 |
| finish one complete 15-house Run the Block block | +1 |
| win Block Rivals | +2 |

To prevent farming the same recorded opponent, the current recommendation is to award the Rival credit on the first **three wins per route day**. Later wins still award their normal REP and gang contribution. This cap is a proposed safeguard, not implemented behavior, and needs final confirmation before code.

There should be no login streak and no escalating penalty for missing a day.

Suggested initial price bands:

| item | price |
|---|---:|
| colorway | 5–8 |
| trail or extraction effect | 10 |
| profile frame or gang banner | 12 |
| premium outfit | 15–20 |
| comic entrance | 25 |

Auntie Ro can explain it as:

> “Whole block gets you a credit. Rival win gets you two. Don’t ask me why—I like winners.”

## Persistence and authority

Phase one should use the game's existing account/local persistence conventions but introduce dedicated versioned records. Do not overload Journey, Daily or Rivals result history.

At minimum, persistence needs:

- selected gang and selection timestamp
- onboarding-complete flag
- last daily greeting/claim date key
- Cash balance and an append-only or idempotent reward ledger
- owned/equipped cosmetics
- mission definitions, progress and claimed state
- gang-switch eligibility

The same Pacific route-day convention already used by the daily game should key daily greetings, claims and caps. Every grant needs a stable event ID so reloads, replays, rematches, duplicate callbacks and storage retries cannot double-award currency.

A real shared gang contest will need a backend and trusted accounting. Local state is sufficient for identity, dialogue, personal missions, cosmetics and prototyping; it is not proof of global standings.

## Visual direction and source assets

The archived source art lives under `client/public/art/the-window/concepts/`.
The approved runtime aliases live one directory higher:

- `bodega-night.png`
- `auntie-ro.png`
- `switch.png`
- `cast.png`

These are **generated raster PNGs**, not SVGs. The runtime treats the character
files as deterministic atlases and declares every source dimension/frame bound
in `logic/window.js`. Portrait view uses a deliberate bodega crop; dialogue,
names and controls remain live Phaser layers. The files still need a later
WebP/atlas compression and load-time measurement pass for mobile.

The faction lineup was created while character roles were still moving. The role assignments in this document supersede any older captions or implied faction grouping inside the artwork.

The bodega should feel lived-in at night: counter, stocked shelves, coffee, convex security mirror, rainy city light and enough empty composition space for dialogue. It is a neutral hub, not a gang clubhouse.

## First-session flow

1. First launch routes to The Window.
2. Ro gives the short first-contact introduction.
3. The player sees the three gang pitches and chooses one.
4. The choice is persisted before leaving the screen.
5. The chosen primary contact appears for a one-line welcome.
6. The player returns to the main menu with Run the Block and Block Rivals unchanged.

Subsequent days:

1. The Window may show a NEW indicator.
2. Entering shows a dismissible Ro or gang-contact greeting.
3. The player may check jobs, the gang page or the Shelf.
4. No long conversation blocks normal play.

## Implementation phases

### Phase 0 — design and art preparation

Approve this spec, split and optimize the concept sheets, decide the gang-switch interval, and confirm the Rival win daily cap.

### Phase 1 — pure state and data

Add faction/roster definitions, onboarding state, route-day helpers, missions and an idempotent Cash ledger as pure modules with headless tests.

### Phase 2 — The Window shell

Add the main-menu entry, scene/controller, Ro onboarding, gang choice and account persistence. Provide image-loading fallbacks and keep the existing 280×480 portrait contract.

### Phase 3 — daily greeting and Jobs Board

Connect missions only to authoritative completion events. Add claim handling, progress UI and compact contact dialogue.

### Phase 4 — the Shelf

Add cosmetic inventory, purchase/equip flows and visual treatments. Keep every item noncompetitive.

### Phase 5 — trusted gang competition

Only after a backend exists: aggregate personal contributions, weekly standings, season boundaries and gang switching at safe boundaries.

### Phase 6 — content expansion

More dialogue, missions, outfits, entrances and event art after the core loop has retention data.

## Acceptance and regression checks

Before declaring any phase complete:

- first launch enters Ro's introduction and persists exactly one gang choice
- reload does not repeat completed onboarding
- The Window remains reachable from the menu
- daily greeting and daily credit claim occur once per Pacific route day
- a completed 15-house block grants once, including after reload/re-entry
- a qualifying Rival win grants once; replay, rematch, forfeit and duplicate result callbacks cannot duplicate it
- any daily Rival reward cap resets on the same route-day boundary as the game
- switching respects the chosen cooldown/boundary and cannot rewrite past contribution
- missions read authoritative game events and cannot progress from replay/watch modes
- Run the Block, Block Rivals and Tutorial storage/mode isolation remains intact
- missing or slow artwork has a clean text/color fallback
- portraits and panels are reviewed at 280×480 and on a real phone
- `npm run verify` stays green after every implementation slice

## Explicit non-goals

- no gang gameplay buffs or penalties
- no pay-to-win items
- no territory map or gang combat simulation
- no fake global gang totals
- no mandatory long daily modal
- no replacement of stash or REP with Cash
- no ad-hoc runtime crop numbers outside the tested WINDOW_ART atlas contract
