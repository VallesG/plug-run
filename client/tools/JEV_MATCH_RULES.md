# Match-scoped Rivals stash rules

Each new match chooses an enabled course randomly (explicit recorder slots and
rematches still select a course). A new stash seed determines the genuine pocket
in each house. Death/retry does not change it. A new match draws a fresh seed;
randomness may legitimately repeat an assignment.

Jev remembers publicly revealed bag identity for the current house across retries.
It forgets that identity on a new house/match. Physical pocket tags follow bags
when anti-camp relocates them; tags do not reveal truth before a pickup.

The motor receives the final target directly. Random map-wide detours and its
intentional wandering/hesitation are disabled for the Jev hybrid. Live dodging,
lane avoidance and short watchdog recovery remain. Jev retains power authority.

New captures stamp stashSeed on records and segments with stashRules=match-v1.
Matchmaking only uses recordings with the same seven-house assignment pattern.
Legacy captures remain readable, but cannot race against these new assignments.
Until compatible races are recorded, the existing simulated-pace fallback applies.
Neither old bank has been rewritten. No performance improvement is claimed until
the new build has been recorded in a live Jev run.

## Landing-aware powers

Jev can now authorize phase shortcuts before pickup, or dash for a nearby bag,
car, or close-plug escape. Phase plans include a walkable takeoff and landing,
and crossing time uses actual speed (including carry slowdown), the actual
power duration and a 100 ms margin. The hybrid approaches the wall before
activation, then commits steering until it reaches the landing. It no longer
uses the borrowed AI's distance-only panic-phase rule.

Dash mirrors the game's fixed tile count and wall stopping. It aligns through
normal input before activation; the landing must approach the objective or
increase separation from a nearby plug. Neither phase duration nor dash range
is increased. These are hybrid-only changes; ordinary bot power rules remain.

## Breaking movement loops

Dodging no longer resets the progress watchdog. Repeated back-and-forth movement
without a new best distance triggers bounded recovery, even when every frame is
marked as evasion. Recovery follows a fixed path through floor centers and cannot
be overridden by dodge, cover routing or the borrowed AI's direction lock. It
ends early at its waypoint. Jev's borrowed motor also suppresses random close-plug
jukes; ordinary bot settings are restored after the call. Recovery is counted as
restored only after beating the previous best, not merely returning from a sidestep.
