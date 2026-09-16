# Run the Block — personal city map

## Personal city map above the block loop — Codex (2026-09-16)

Run the Block now groups permanent global block indices into ten-block cities:
10 blocks x 15 houses = 150 stashes. REP does not unlock cities. City grouping
is permanent v1 presentation/progression identity; do not change CITY_BLOCKS
in-place after shipping without migrating city identities. World block/house
seed formulas and the Journey checkpoint shape are untouched.

Flow: menu/resume -> city -> 380ms district focus -> scheduled crew consultation
-> existing exterior street -> ENTER HOUSE -> powers. Normal house/retry
restarts omit the city; the street has a CITY inspection action. House 15's
approved duo celebration -> city pull-back/new claim -> next block. Block 10
shows 150/150 and NEW CITY UNLOCKED, then the next city before block 11.
The latest completion city replaces Journey's old fully-lit street result.
WATCH LAST HOUSE still returns to the intact city; daily result is unchanged.
Older cities are viewable, not selectable for replaying old gameplay/checkpoints.

Import-free logic/city.js owns permanent city identity, ten-node connected
layout, stash progress, migration, entry eligibility and claims. CityMap.js
draws exterior neighborhoods/roads/lights/fog/crew flags in the existing night
grammar; no floor plans or raster downloads. Tiny labels use CL/IR/AL with a
legend. city-map-preview.html at the client root reviews actual GameUI + city
renderer at 280x480, 390x844 and 1440x900, including mixed claims and legacy
saves; dev-only, no saves. Native moduleSyntax checks this preview too.

Personal ownership writes only pr_city_v1_<user>, version 1:
completedThrough (monotonic), owners (nontruncated block -> gang), active
(frozen block crew). startCityBlock freezes the crew on entry; consultations,
mission selection, story finish and claim use that scene snapshot. Switching
gangs is still not enabled: any future switch must also use that snapshot for
cosmetics/UI. The final extraction save seam claims a block only for runner/
pve/Journey, house 15, carrying the stash, in order. Duplicate or skipped claims
cannot change ownership; taps, partial clears, deaths, Rivals and Tutorial do
not claim. No new currency, REP reward, leaderboard or shared gang total.

Legacy checkpoint block N proves prior N-1 clears, NOT their gang: migrated
territory is neutral/unknown. No invented retrospective ownership or story
grants. Account-isolated in-memory fallback preserves claims during denied
storage this session only; a reload cannot recover unsaved writes. The separate
Journey/City keys are not a cross-key transaction: checkpoint migration can
recover a clear without ownership if territory persistence is lost. Claims/
owners are personal device data, not trusted/server scoring. Ownership history
is not a 200-entry ledger and grows with completed blocks.

City modals keep world/keyboard/touch paused, retain GameUI's input grace, and
cancel the touch rebind on teardown before the next consultation/entrance.
City resize requests the same map; resizing the completed-city result adopts
the already-earned next checkpoint rather than replaying house 15. Zoom and
claim-flare tweens are bounded and killed on map teardown.

Measured in adapted V8: 1333 city, 267 real storage-adapter, 62 manager/GameUI/
renderer lifecycle, 12 actual Base init, 63 unchanged world, 993 contacts,
4343 story, 71 contact-flow, 42 panel, 242 mobile steering and 62 mission-exit
assertions: 7490 targeted assertions. 250 sequential claims retain the first
owner after the old 200-entry threshold, JSON/account/denial cases pass, seeded
global identity stays intact, and city entry/finish/boundary/watch/browse paths
pass. Negative controls reject pre-city manager and scene init.
Five adapted source import/binding parses plus preview parse pass.

UNVERIFIED: native npm run verify/.mjs/Vite, other suites including the untouched
55-record rivalBank, actual Phaser font/touch/cartography/zoom/occlusion and
phone/desktop visual review. No sandbox/process attempts under Carbon Black.
Run verify in an allowed environment, inspect the preview, then manually test
menu resume, CITY/back, normal house 2, later POC steering, complete block and
resize result, city-10 unlock and watch return. No master or bank edits.
Shared live Rival Turf is deliberately NOT built: it needs server win
accounting/duplicate protection, not fabricated client standings.


## City sequence

Duskport, Copper Bay, Railhaven, Neon Vale, Greybridge and Northwake, then the names cycle with unique city numbers/IDs. Streets retain their permanent world names/seeds. This is an extensible city sequence, not a hard end to progression.

## Next visual review

Ten neighborhoods are readable abstractions of blocks, not exact fifteen-house footprints. The current model is a shared serpentine arterial layout with a water edge/rail corridor. Future city-specific landmarks and silhouettes can vary in a separate cosmetic seed domain without changing playable house seeds. Review pacing for 150 stashes per city before adding more objectives; changing the cap after shipping requires a v2 grouping migration.
