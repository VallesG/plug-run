# Drag steering: targeted release fix

Prepared on claude/input-intent-layer at f832bfcb8525b8c0599fac0c2ec9d58b48cd068e. Master is not changed by this patch.

## Cause and change

endSwipe cleared _dragMoveActive and then reinterpreted a committed drag through the cardinal flick path. This overwrote the last diagonal direction on release. A floating origin could also make a returning drag look like a tap.

Committed drags now cancel gesture bookkeeping and retain their last movement/aim direction instead of entering tap/flick classification. Runner drag steering also updates playerIntendedDir, matching its movement and power direction.

No speed, dead-zone, drag commit threshold, floating-origin radius, snap angle, collision or AI logic changed. Uncommitted cardinal flicks and genuine double taps are preserved. No stop-on-release behavior was introduced.

## Checks

Executed 154 assertions against the actual controller source in the JavaScript tool runtime, with only clock/corridor dependencies stubbed. Original source failed the diagonal-release regression; patched source passed.

Covers fast/slow drags, all diagonal quadrants, free-angle normalization, intended-vector consistency, unrelated/duplicate releases, floating-origin/dead-zone release, genuine double taps, cardinal flicks, menu cancellation, and diagonal-to-down turns while held.

Added client/test/dragSteering.test.mjs to the npm test chain. Node invocation, full suite, build, and real-device play were NOT run here because Carbon Black blocks the local command runner. The tool-runtime checks do not substitute for the complete verification workflow.

## Local test

After committing/stashing your own work as needed:

```powershell
git fetch origin
git switch claude/input-intent-layer
git pull --ff-only origin claude/input-intent-layer
cd client
node test/dragSteering.test.mjs
npm run verify
npm run dev
```

On mobile: drag diagonally then lift quickly and slowly; turn down mid-drag and lift; reverse direction; release near the drag origin; try repeated swipes and double-tap powers. Confirm cornering stays predictable and continued movement follows the last direction. Test in tutorial and later campaign houses. Merge to master only after local tests and feel checks pass.
