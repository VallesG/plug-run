## Organic cities and Rivals territory entrance — implemented 2026-09-16

The crooked grid was rejected. City cartography now has a winding central river,
bridge boulevards, scattered smaller playable districts, a denser mixed-size
downtown, parks and a rail edge. Palette remains dark. It is visual only:
story seeds, ten-block city grouping, exterior aspect and saved ownership remain
unchanged. A saved crew's existing sigil is softly backlit on cleared blocks.
CityMap accepts a separate 'rivals' mapVariant and overview-only preview mode.

Normal Block Rivals now has its own seven-district circuit map and fully lit
seven-house exterior based on the pool course's seed (not a story world block).
Flow: automatic city -> neighborhood -> full block; LOOK FOR MATCH opens an
editable power mix; confirming LOOK FOR MATCH runs the cosmetic rival carousel;
the selected recorded rival and their ordered powers appear; the existing
three-second countdown starts automatically. The search says Recorded opponent
pool, not a live queue. Visible names strip BOT/AI; hashed records remain intact.
Failures settle onto the existing pace-trial fallback. Shared opponentPending
prevents a resize during fetch from starting early or issuing duplicate requests.
Pickup replay progress is prefetched after selection, before countdown.

Personal win territory is new, account-scoped pr_rival_city_v1_<user>. It is not
server-wide crew standings or trusted scoring. Only a complete seven-house win
on the currently unlocked pool slot advances one district. Freeze the crew and
account at race creation. Loss/draw/forfeit, recordings, old-course rematches and
duplicate results do not advance or overwrite owners. Separate retention from
the twenty-result history; 280-claim tests preserve early owners. Failed storage
has an account-scoped volatile fallback and an honest temporary-progress notice.
No retroactive territory guessed from capped legacy results. All seven courses
remain pinned, reusing the bank; after seven wins, next circuit city starts at
slot one. Further bespoke geography per circuit is a future art pass, not new
course seeds. Explicit recording/fixed-power harnesses retain the old policy.

Result: a fully lit seven-house map; win displays crew mural, with claim notice
when progress actually applied. ENTER NEXT BLOCK on wins, TRY AGAIN otherwise;
REMATCH and replay still work. Result extras register with GameUI for replay
hide/restore and teardown. No Cash, REP, global territory, input feel, maze,
race timing, opponent hashes or recording bank edits.

Preview URLs under Vite (dev-only; not served in production dist):
- /city-map-preview.html — story and hold-overview toggle.
- /rival-city-preview.html — seven-district circuit, hold overview, local-only
  simulated win controls. It does not record races or write player storage.

Validation: all 44 adapted in-memory V8 suites pass, including 2,171 city logic,
129 actual city/UI flow, 113 Rivals adapter, 4,179 new territory/storage/selection,
242 mobile-input and 1,889 contact-flow assertions. Seven changed runtime modules
and both preview scripts compile under adapted V8 with imported-binding checks.
The unchanged bank passes 402 assertions across 55 recordings.
Native npm run verify, Vite/native ESM/art checks, real Phaser appearance,
touch/drag after the carousel, networking and phone/audio remain unverified:
no local execution attempted under the Carbon Black restriction. Run verify and
review the real menu -> city -> block -> mix -> search -> GO loop before deploy.
Master is untouched.

