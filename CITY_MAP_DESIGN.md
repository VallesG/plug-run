# Run the Block — automatic city arrival

## Automatic GPS-style city arrival — Codex (2026-09-16)

This supersedes the user-controlled serpentine city overview below. The user
rejected its level-ladder look: city geography must look like the existing
overhead street and zoom automatically, not offer another navigation menu.

Fresh Journey block house 1 -> city overview -> neighborhood zoom -> actual
exterior block -> scheduled crew consultation -> entrance -> powers.
The approximately 2.75-second intro is autonomous: no CITY/VIEW/previous-city
buttons, parcel taps, panning or selectable districts. Normal resumes, retries,
partial legacy saves and scene resizes skip it. House 15 retains the duo
celebration, then the fully revealed block/result with replay and next-block
actions; starting that next block plays its own arrival. Ten blocks/150 stashes
per city, permanent global seeds, frozen crew ownership and progression stay
unchanged. Rival Turf/server accounting is still not implemented.

CityMap now renders a two-dimensional road network with waterfront, rail
corridor, parks and small exterior roofs, not ten cards connected in unlock
order. Every parcel embeds drawBlockMap with that global worldBlock's seed:
the camera zooms the SAME geometry through overview/neighborhood/block scales,
without fading the map away. Floors/interiors are never shown. Claimed blocks
carry personal crew colors; unexplored parcels are dark. Embedded rendering
opts out of labels/caption, uses cheaper ground for distant parcels, and never
changes normal block renderer defaults.

pr_city_v1_<user> gains monotonic introThrough. startCityIntro claims before
showing; duplicate calls do not write or replay. Existing partial checkpoint
house >1 infers that block already seen; historical completed blocks imply seen
but NEVER invent owners. Denied-storage fallback remains account-isolated and
session-only. No reset button or query changes real player progression.

Cinematic owns an opaque input blocker, containers, timers and tweens. Shutdown
cancels without invoking the next screen; normal completion cleans before
consultation. Keyboard/world/touch stay suspended across the handoff. Rendering
construction errors clean up and continue to consultation. Base init determines
eligibility only after adopting the real saved house/retry checkpoint; obsolete
showCityMap flags cannot force a replay. Resizing a completed Journey result
adopts the next checkpoint only with persisted completion proof; death at house
15 stays at that house.

city-map-preview.html is a no-save review surface: choose 280x480, 390x844 or
1440x900 and arrivals at blocks 1/7/11/24, then Review. It automatically zooms
and lands on the same exterior; its review controls do not exist in gameplay.

Validation: prior city suites passed 1,674 adapted assertions before edits.
After edits: 1,465 city, 271 storage, 77 actual renderer/GameUI/manager, 28 actual
Base init/resize, 30 unchanged block geometry, 71 contacts flow, 62 mission exit and
242 touch lifecycle = 2,246 targeted adapted V8 assertions. These prove callback
ordering, once-only persistence, actual embedded renderer execution, no fade,
shutdown/error cleanup, viewport fitting, account isolation, unchanged ownership
and mission/touch behavior. Native npm run verify, native ESM/.mjs, Vite and the
untouched 55-record rivalBank were NOT run: user prohibits sandbox/process use
under Carbon Black. Actual Phaser pixels, zoom smoothness/performance, text and
phone/desktop appearance require allowed local verification and visual review.
No master, rival recording, gameplay RNG, currency or reward edits.

## Stable city sequence

Duskport, Copper Bay, Railhaven, Neon Vale, Greybridge and Northwake cycle with
unique city numbers/IDs. Ten blocks remain one city. City visual layout is
presentation only; changing grouping requires a version migration.

## Phone review

Check the 800ms initial hold, two 850ms camera moves and 250ms landing hold.
Confirm the first-house light remains readable, unknown parcels are sufficiently
dark, the city reads as geography rather than cards, and performance is adequate.
Do not reset saves to review: use the no-save preview. A player already partway
through a block correctly waits until their next new block to see this intro.
