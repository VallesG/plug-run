# Runner drag cardinal preference — experiment only

Branch: claude/input-intent-layer. Parent: 643761bdb56a47010a18f0b8bdc9d595e323b629. Master remains untouched.

Runner drags now favor exact cardinals within 22 degrees of an axis (previous soft-snap zone was about 15 degrees). Once selected, a cardinal holds up to 28 degrees; a snapped diagonal holds up to 17 degrees from its diagonal axis. Outside these regions the prior soft-snap/free-angle behavior remains. This is a small hysteresis buffer against thumb jitter, not collision-dependent steering.

Bias is gesture-local and clears on begin/cancel/release. Committed drag release preservation remains. Plug aiming, speed, dead zone, floating anchor radius, commit thresholds, keyboard, and cardinal quick-flick release behavior are unchanged.

Executed 187 focused assertions against actual controller source in the JavaScript tool runtime. Prior controller fails the new actual-drag cardinal-preference regression. Full Node suite, production build and phone play are NOT run here because Carbon Black blocks the local command runner.

From client, run node test/dragSteering.test.mjs then npm run verify and npm run dev. Test near-cardinal flicks in tight corners, deliberate diagonal drags, diagonal-to-cardinal turns, jitter near boundaries, release continuation, and a fresh opposite-direction gesture. User's movement feel decides whether to retain this experiment.

This commit only changes PlayerController.js, its existing dragSteering test, and this note. To remove this tuning while retaining the prior release fix, revert this tuning commit on the feature branch (after coordinating other changes); do not reset the branch or force-push. Nothing is merged to production.
