# First play and crew banter — 2026-09-17

## Front door
Plug Run always renders MENU first. No first-visit redirect into The Window.
The primary landing action reads Start Tutorial for players with no completed
training and no proven campaign clear; Join a Crew after training if no crew
has been chosen; Run the Block otherwise. Play checks the same policy again.
Existing campaign players with at least one proven extraction are grandfathered;
a crew choice alone does not stand in for training.
Manual Tutorial and The Window menu entries remain available.

Training completion is marked only in the terminal goNext branch after lesson 4,
not on starting training or choosing a crew. Account-scoped key:
pr_tutorial_v1_<user>, version 1, complete true. Corrupt/absent saves stay incomplete.
The account captured at tutorial create must still be current to record completion.
A failed write preserves completion for this session only; no false durability claim.
The final panel introduces Auntie Ro and crew choice, with Go to The Window >>.

## Story-first contact presentation
logic/campaignContacts.js wraps the existing authored season functions.
One fixed two-voice joke/story exchange per chapter appears in the FIRST existing
non-opening, non-briefing slot. Ten exchanges per crew (30 total). This is a bounded
first writing pass, not a new random chatter scheduler.
Existing later tease pages survive verbatim: they state the upcoming house number
and that briefing happens before that door. No item hunt is implied now.
House 9 briefs, item requirements, remaining slots, chapter gates, claim identities
and retry/resize/reload suppression are unchanged. Banter never claims measured
performance, never consumes a praise key, and intentionally replaces praise when
it occupies a formerly reactive slot. Other reactive slots retain their contract.
No dialogue slots are added: silence and arcade pacing remain intact.

Chapter 3's duo finish keeps its existing story payoff and adds two short lines
inviting the player to represent their crew in Block Rivals, describing seven
houses and player-selected powers. This does not change the existing 45-stash
unlock, start a race, or claim live human opposition.
ProgressionManager and contact-preview.html use this SAME presentation layer.
The original crewSeason API remains the baseline authored/measurement contract.

## Validation
Execution helper remains blocked by Windows sandbox-directory ACL error.
No native npm run verify, Vite build, browser recording, or phone review performed.
Adapted in-memory V8 checks:
- firstPlay: 27 assertions, including actual Menu.launchCard and Tutorial.goNext.
- campaignContacts: 1,009 assertions across all three crews and ten chapters.
- tutorial: 34; crewSeason: 4,459; contactFlow: 1,900; landingLayout: 120; Window: 61.
Six changed runtime modules passed binding-aware parse.
Both new suites are registered in the explicit npm test chain.
This is NOT a claim that all native suites or build passed.
No recordings, manifests, bot source, or public/rivals/v2 files changed; no build
during Claude's batch; master untouched.

## Phone follow-up
Fresh account: landing -> Start Tutorial -> four lessons -> final invitation ->
The Window -> crew choice -> Run the Block.
Returning trained account without crew: Join a Crew.
Legacy campaign account: Run the Block without forced retraining.
Check replays/training replay, account switches, denied storage, narrow-phone
pagination, banter followed by retained tease, and third-chapter invitation.
Review all three crews at /contact-preview.html. Native verify before release.
