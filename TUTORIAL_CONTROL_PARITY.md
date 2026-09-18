# Tutorial control parity + lesson 1 mid-stride stop

Branch-only: claude/input-intent-layer. Master is not changed by this patch.

## Why the tutorial felt different

The tutorial never used PlayerController. It carried a hand-copy of that
code, and the copy had drifted — in places its own comments still claimed
"MAIN-GAME PARITY" for behavior the real game had since changed. Found:

1. **No cardinal preference, no angular hysteresis.** The tutorial still ran
   the old stateless 8-way soft snap. The cardinal-preference and hysteresis
   work (and the hold-break fix on top of it) only ever landed in the real
   game, so drags steered measurably differently in the two places.
2. **Releases destroyed committed diagonals.** The tutorial cardinal-snapped
   every release, with a comment asserting the real game did the same. It
   stopped doing that in "Preserve committed drag direction on touch release";
   the tutorial was never updated.
3. **No cornering assist at all.** The tutorial had the sub-stepping and the
   corner unstick but not `steerToLane`, so corners caught in the tutorial in
   a way they never do in a real round.
4. **Corridor assist keyed off Plug proximity.** `handleMovement` switched
   lane centering off within 3 cells of the stage-4 Plug. Walking near a Plug
   visibly changed the runner's steering — the exact thing the real game
   forbids and asserts against in `mobileInputLifecycle.test.mjs`. Removed.
5. A fresh gesture did not clear the previous one's drag commit
   (`beginSwipe` does).

Fix: the steering maths and the grid movement resolution now live in
`src/logic/runnerSteering.js` and `src/logic/gridMovement.js`, and both
PlayerController and the tutorial call them. Neither keeps a private copy any
more, so they cannot silently diverge again. The main game's behavior is
unchanged by the extraction — `dragSteering`, `runnerPlugProximity` and
`mobileInputLifecycle` all report identical assertion counts and identical
movement traces before and after.

One bug was introduced and caught during this work: hoisting the
committed-drag branch matters, because the floating re-anchor drags the
gesture origin along with the finger, so a long committed drag can release
with a tiny `moved` and a short `dt`. Classified as a tap it would spend a
power the player never asked for. `PlayerController.endSwipe` checks the
commit first; the tutorial now does too, and a test drives the real handler
to prove it.

## Lesson 1 no longer stops the player

Stage 1 ran: swipe prompt → first swipe → 650ms coast ("Lift your finger.
You keep moving.") → second prompt ("Swipe again to change direction.", with
the downward hint). Entering that second prompt called `resetTouch()`, which
nulled `playerDrift`, and every tick of the prompt nulled it again while the
guide returned `true` to suppress the scene update. The runner stopped dead
mid-stride to be told to swipe low — directly contradicting the beat that had
just said "you keep moving".

Now the second prompt keeps the runner travelling: the coast hands off with
the drift intact, the prompt leaves it alone, and the guide returns `false`
so the scene's own update keeps driving movement *and* objective checks (so
coasting into the car during the prompt still completes the stage). The
"swipe low" hint and copy are unchanged. The first prompt still waits — the
runner has not moved yet and there is nothing to preserve.

## Checks

- `client/test/tutorialControlParity.test.mjs` — new, 414 assertions,
  drives the actual tutorial source and the actual PlayerController and
  compares them directly. Fails against the pre-change tutorial.
- `client/test/mobileTutorialGuide.test.mjs` — new lesson-1 assertions fail
  against the pre-change guide (it nulls the drift).
- `npm run verify` — full suite plus production build, exit 0.

## Still unverified

Headless only. The feel changes — cornering assist now active in the
tutorial, hysteresis on tutorial drags, and lesson 1 continuing to move
through the second prompt — need a real device pass. Worth checking
specifically: that lesson 1 reads as one continuous motion rather than a
lurch, that the downward hint still registers while moving, and that
coasting into the car mid-prompt completes the stage cleanly.
