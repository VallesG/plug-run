# Season 1 campaign Plug / car experiment

Branch-only trial based on ffc7f2210ef427f19d8d4e426a840672d53e4ee7; do not merge to master until local verify and phone play pass.

## Curve
Each campaign block resets: houses 1–3 forgiving (speed 62–68, fire interval 1.85–1.65s), houses 4–8 linear ramp (72–88, 1.55–1.25s), houses 9–15 challenging but bounded (91–103, 1.18–0.94s). Accuracy/vision/orientation ramp too. reactDelay is retained in the profile but the existing Plug behavior does not consume that knob; do not claim a new reaction-delay implementation.

Campaign AI loadouts favor pistol in opening houses (75% pistol, 10% shotgun, 15% rifle). Houses 4–8 use 45–55% doublebarrel; late houses use a mixed 40% shotgun, 25% pistol, 35% rifle. Existing range/line-of-sight firing gates and ammo remain. House 15's existing two-Plug spawning and dialogue warning are unchanged.

## Tactics/navigation
Uninjured runner or active injury cooldown: pursue instead of camping the car. Guarding/interception is permitted when the runner is at 1 HP, cooldown expired, near enough to contest, and there is a clear shot. Decoys keep their existing behavior.

Campaign defenders now own separate path, orientation and shooting clocks instead of sharing scene state across defender swaps. Already-reached path waypoints are consumed immediately, tighter waypoint reach and capped steps reduce overshoot, and a second of blocked movement invalidates the path and briefly replans toward the runner. No teleport, speed boost, or collision bypass.

## Car range
Campaign overlap uses 36% of sensor dimensions plus at most 6px of body allowance, rather than half the full 2.8-cell sensor plus a fixed 12px. Actual near arrivals from all four sides still trigger. Mission-item/stash gates and once-only reward behavior remain.

Rivals, old replay geometry, noncampaign difficulty, Street Wars, and tutorial forgiving arrival retain legacy behavior. This intentional campaign-only scope avoids silently changing the course behind existing Rivals recordings.

## Verification
116 focused assertions executed on actual Plug/car source in the JavaScript tool runtime, including curve/profile, middle linearity, weapon selection, pursuit during injury cooldown, guarded exit conditions, two-defender state isolation, blocked-movement recovery, and near/far car arrivals at three cell sizes. Modified scene/manager syntax parsed. Legacy Rivals movement/path/clock state matched original over 30 updates.

Full npm test/build and real-device play were NOT run: Carbon Black blocks this environment's command runner. Added campaignPlugBalance.test.mjs to npm test chain. Local npm run verify remains required; mocks/source fixtures might need adjustment for the new import.

## Local acceptance pass
Pull claude/input-intent-layer, run npm run verify from client, then npm run dev.
Play opening/middle/late houses across two campaign blocks, try wounded/uninjured exit approaches, wall corners and both Plugs at House 15. Confirm easy openings, no obvious stalls, shotgun pressure is avoidable, and faster AI does not turn late houses into a grind. Test stash pickup plus immediate Dash arrival at all car edges and a violet-case house. Check a Rivals match/replay too, despite intentionally unchanged rules.

Season 2 and pitbulls are not implemented. This tuning and the prior steering experiments remain separate, revertible feature commits.
