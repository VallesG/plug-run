# Mobile steering drift fix — 2026-09-17

## Cause and fix

PlayerController reduced corridorAssistStrength when the opponent moved within
four cells in open/one-wall spaces. The strength fell as low as 30% of the
player's setting. With identical touch intent, defender motion therefore
changed perpendicular lane-centering corrections. Faster later-house defenders
can cross that threshold more frequently; this was not a physical shove.

Removed only the opponent-dependent multiplier and temporary scene-setting
mutation. corridorAssist still reads local wall geometry and the saved assist
setting. Autorun, swipe direction, keyboard movement, cornering/unstick assist,
runner speed, defender pursuit, powers, collision grids and RNG are unchanged.
This applies to the shared player-controller touch path in campaign and Rivals.

## Measured and verified

Before: a real-controller/real-assist open-area fixture with cell=20, speed=60,
60 updates at 1/60s and identical rightward intent moved x by 60px. Its
perpendicular correction was 4px with the Plug 200px away versus 1.2px at 10px.
The new test failed on unmodified code at the near-defender comparison.
After: full position traces match for near, far and repeatedly crossing Plugs.

The existing npm test chain already includes mobileInputLifecycle.test.mjs.
It now reports 331 total assertions (80 new), using the real corridorAssist
instead of the lifecycle fixture's stub. Coverage includes horizontal/vertical,
speeds 60/180, zero/one/two adjacent walls, disabled assist, keyboard, stationary
no-intent state, retained drift direction and preserved lane-centering/autorun.

Native npm run verify attempted before and after. Baseline reached the syntax
suite but cleanup of its default-temp probe was denied (EPERM). After relocating
TEMP/TMP for invocation only, all 61 suites passed, including bank 997 assertions
across 140 unchanged recordings, 121 syntax modules and 116 unresolved-call
modules. Plain Vite build still has this isolated checkout's existing Windows
realpath EPERM. Equivalent production build uses invocation-only
resolve.preserveSymlinks; no production config is changed.

## Replay/bot compatibility

No bank payload, course seed, validator, recorded frame or opponent time changed.
Existing ghosts remain historical captured positions, not a rerun through this
controller. Future controller-driven bot captures will use the corrected assist;
do not claim historical races were recorded on the new movement build. No new
recording batch or pace recalibration was performed.

## Impressed expression proposal

The seven-character source draft is saved at
client/art-sources/the-window/expressions/impressed-proposal.png.
It is intentionally NOT in public or dist and NOT mapped to praise yet.
The draft is too close to neutral in several faces; refine raised brows and
readable approving smiles, then crop/pad/encode WebP and add a distinct slot
without shifting existing five frame indices. Keep hyped for celebrations.
No extra runtime art bytes are introduced by archiving this proposal.

## Still unverified

No physical-phone playthrough of houses 10–15 or live Rivals race after this fix.
The regression isolates the confirmed opponent/assist coupling, not every
possible mobile input symptom. Review that ordinary lane-centering still feels
comfortable and that close pursuit no longer changes steering response.
