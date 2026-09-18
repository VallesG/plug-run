# Tutorial presentation polish — 2026-09-17

Follow-up: instruction cards and section labels removed at the player's request.
Copy is now one reading area with paragraph spacing, not selectable-looking boxes.
Measured sizing, progress and actions remain; tutorial tests now 182 assertions.

Status: implemented and tested in the isolated checkout, then committed through
GitHub on claude/input-intent-layer. Pull the branch to receive the changes;
do not also apply the local review patch. Shared C:/dev/plug-run writes remained
denied even after the filesystem permission grant. Master is untouched.

ArenaWallInk.js extracts the existing campaign drawWallInk body without changing
its numbers, depths, ink colour or geometry. BaseGameScene delegates to it;
TutorialMiniScene now calls the same read-only pass after drawArenaArt.
This adds the missing exposed-edge ink, hard shadows and even floor grime.
Tutorial palette, grid generation, sprites, hitboxes and objectives are unchanged.

TutorialInstructions.js renders measured-height instruction cards with labels,
left-aligned readable copy and a four-step progress strip. It uses actual Phaser
text heights, reducing font size only as needed (16 through 12px). GameUI accepts
training-only panel height and action spacing; all existing modal defaults and
pointer dismissal/grace-period guards stay intact. Card objects register with
the shared modal so close/shutdown destroys them. Start training / Run this lesson /
Choose powers describe the primary action. Completion still routes to The Window.

Verification: native npm run verify before/after passed all 61 test suites but
plain Vite build hit the known isolated Windows realpath EPERM. Equivalent
production build passed with invocation-only preserveSymlinks in 16.93s.
Tutorial test now 150 assertions (116 new): four lessons x four viewport sizes,
instruction preservation, readable sizing, panel/action bounds, progress, cleanup
and read-only wall depth grammar. Bank remains 997 assertions / 140 recordings.
Syntax: 123 modules, zero failures. Unresolved calls: 118 modules, zero failures.

Real tutorial headless Chrome QA: all four lessons at 280x480 and 390x844 mobile,
588x971 desktop, plus actual start-click/resume = 15 checks, no page exceptions.
Existing audio-key/disabled-online console warnings are not fixed by this visual
pass. No physical-phone GPU/portrait-landscape test or complete four-lesson
playthrough. Minimum reviewed viewport 280x480. Browser QA script and screenshots
are local review artifacts, not runtime/served files or persistent-player tests.
