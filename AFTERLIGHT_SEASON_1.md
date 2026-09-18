AFTERLIGHT_SEASON_1.md

Approved narrative specification awaiting implementation. Do not modify existing game files.

1. Season Premise and Character Voices
Season Premise: The Midnight Showcase

Duskport’s courier routes have collapsed into a lawless free-for-all, leaving unattended stashes scattered across ten city blocks. Afterlight sees this not just as an opening for loot, but as a city-wide stage. They are moving to sweep every porch, light up the avenues with signature murals, gather high-output staging gear, and throw an unforgettable street takeover that crowns them as the undisputed kings of Duskport style.  
MD
+ 4

All running takes place strictly on foot. The crew's narrative campaign tracks personal turf acquisition across 150 stashes (10 blocks × 15 houses). This personal campaign progression is completely separate from the server-wide Block Rivals competition; clearing Block 10 cements Afterlight’s personal claim over Duskport and opens the route across the water to Copper Bay (City 2), without claiming victory over the broader shared rival standings.  
MD
+ 3

Character Voices
Vee (Primary Contact)

Role & Silhouette: Mural artist, crew visionary, and aesthetic director. Sharp, stylish, ironic, and intensely observant. Wears an oversized violet artist jacket with paint-splattered cuffs and dark combat boots.  
MD
+ 2

Perspective: Speaks strictly in the first person. Views the street grid as a living canvas. Evaluates runs by silhouette, rhythm, visual framing, and whether the runner looks unflappable under pressure. Dislikes clunky footwork, boring routines, and aesthetic clutter.  
MD

Vocabulary & Tone: Artistic, critical, theatrical. Uses design and performance terms (composition, framing, negative space, silhouette, rhythm) to critique foot evasion. Never gives generic congratulations; marks progress factually.

Sol (Secondary / Jobs Contact)

Role & Silhouette: Tuning enthusiast, track scout, and hype coordinator. Loud, impulsive, competitive, and fueled by energy drinks. Wears an amber racing jacket with reflective chevrons and high-top sneakers.  
MD
+ 2

Perspective: Speaks in the first person ("I need you at house 9"; never refers to himself in the third person). Obsesses over sprint times, split seconds, and porch-to-curb velocity. Treats stash houses like an opportunity to liberate audio gear, strobes, and racing parts. Amused by Vee’s high-art lectures.  
MD
+ 2

Vocabulary & Tone: High-octane, punchy, excitable. References split times, decibels, strobes, RPMs, and curb sprints. Delivers mandatory House 9 briefings with relentless energy.  
MD

Auntie Ro (Neutral Anchor — The Window)

Role & Silhouette: Owner of The Window bodega. Neutral neighborhood elder who hosts crew onboarding, trades local news, and serves cold drinks.  
MD
+ 1

Perspective: Observant, maternal without softness, sardonic. Holds no loyalty to Afterlight over Crossline or Iron Row. Reminds runners that fluorescent paint doesn't make someone run any faster.  
MD
+ 1

2. Measurement Contract and Selection Rules
Measurement Scopes

One Completed Attempt: Measured strictly over the single successful run that extracted from the immediate prior house.

Previous House (Including Retries): Aggregates all failed attempts and the final clear on that specific house index.

Whole Block (Recorded Clears): Evaluated strictly across all recorded successful clears within the current 15-house block up to the current milestone check-in.

Whole Block (All Attempts): Evaluated across all attempts (clears and deaths) within the current 15-house block up to the current milestone check-in.

Category Predicates
Category Key	Required Condition	Measurement Scope	Truthful Boundary
ZERO_DEATHS	≥1 recorded clear in block; exactly 0 deaths recorded across current block so far.	Whole Block (All Attempts)	Runner has not died on this block. Does not imply zero retries, no bullet hits, or that all attempts succeeded.
FLAWLESS	≥1 recorded clear in block; exactly 0 deaths recorded across block; exactly 0 bullet-hit events across recorded clears in block so far.	Whole Block (Recorded Clears + All Attempts)	Runner has neither died nor taken bullet damage during successful extractions.
COMEBACK	≥3 deaths recorded anywhere in the current block so far.	Whole Block (All Attempts)	Runner has failed ≥3 times on this block. Dialogue reflects an open minimum rather than an exact count.
NO_POWERS	≥1 recorded clear in block; exactly 0 powers activated across recorded clears in current block so far.	Whole Block (Recorded Clears)	Runner activated zero powers on winning runs. Does not claim powers were saved, banked, or rewarded.
BUNK_BAGS	≥2 bunk bags touched across recorded clears in current block so far.	Whole Block (Recorded Clears)	Runner touched ≥2 bunk bags (which dissolve on contact). Does not imply bags were carried, weighed, or hauled.
POWER_PHASE	

Phase activated ≥2 times with a strict lead over Dash and Decoy across recorded clears in current block so far. 
MD

	Whole Block (Recorded Clears)	Validates activation lead only. Does not claim specific wall passages, floor positions, or AI reactions.
POWER_DASH	

Dash activated ≥2 times with a strict lead over Phase and Decoy across recorded clears in current block so far. 
MD

	Whole Block (Recorded Clears)	Validates activation lead only. Does not claim distance records, cornering angles, or speed tiers.
POWER_DECOY	

Decoy activated ≥2 times with a strict lead over Phase and Dash across recorded clears in current block so far. 
MD

	Whole Block (Recorded Clears)	Validates activation lead only. Does not claim defender behavior, AI distraction success, or clone durability.
Integration and Selection Rules

Slot Substitution Only: A reactive line replaces only the designated generic check-in sentence of an eligible milestone panel. It never replaces look-ahead teases, mandatory House 9 job briefings, or House 15 finish celebrations.  
MD

Frequency Cap: At most one reactive dialogue variant may be delivered per 15-house block. Once any reactive line is displayed, all subsequent check-ins in that block use fixed story dialogue or neutral fallbacks.

Deterministic Evaluation: When selecting an eligible reactive variant, evaluate categories in strict priority order:

FLAWLESS

COMEBACK

ZERO_DEATHS

NO_POWERS

BUNK_BAGS

POWER_PHASE

POWER_DASH

POWER_DECOY

Fallback Invariant: If telemetry is uninitialized, missing, corrupted, or evaluates false across all predicates, the engine must select the specified Neutral Fallback. Missing telemetry must never be coerced or defaulted to zero.

Story Independence: Retries after death reset attempt-local state, do not repeat shown pre-house consultation panels, and do not advance block story chapters. Stories advance strictly when House 15 is cleared with the stash extracted to the car.  
MD
+ 1

3. Chapters 1–10 Narrative Specification
Chapter 1: Opening Act (CH_AL_01)

Story Development: Afterlight hits the outer avenues of Duskport to establish their campaign presence and clock their initial sprint splits.  
MD
+ 1

House Schedule:

House 1: Active (AL_C01_H01)

House 4: Active (AL_C01_H04) — Tease Slot

House 7: Silent

House 9: Active (AL_C01_H09) — Mandatory Job Briefing  
MD

House 10: Active (AL_C01_H10) — Reactive Eligible

House 13: Silent

House 15: Duo Celebration (AL_C01_H15)  
MD

Fixed Pre-House Dialogue

AL_C01_H01 (House 1)

Panel 1 | Vee: "First threshold of the campaign. Grab the stash, keep your line clean, and make your exit look intentional."  
MD
+ 1

Panel 2 | Sol: "Don't just run—sprint! The getaway car is waiting and I'm timing your curb split from here."  
MD

AL_C01_H04 (House 4)

Panel 1 | Vee: "Three houses cleared. The framing on those exits is holding together."

Panel 2 (Tease) | Vee: "Sol will need you at house 9. He’ll brief you before you step up to that door. For now, keep pulling bags."  
MD

AL_C01_H10 (House 10)

Panel 1 (Fixed Progress) | Vee: "Six houses remain on this avenue. Keep your stride long and finish the set."

Reactive Slot: Sentence 1 ("Six houses remain on this avenue.") may be replaced by an eligible Vee variant if triggered here.

Eligible Bank IDs: AL_VEE_ZDEATH_01–05, AL_VEE_UNTOUCH_01–06, AL_VEE_COMEBACK_01–05, AL_VEE_NOPOW_01–06, AL_VEE_BUNK_01–06, AL_VEE_PHASE_01–06, AL_VEE_DASH_01–05, AL_VEE_DECOY_01–06.

Neutral Fallback ID: AL_VEE_NEUT_01.

House 9 Special Job (AL_C01_H09)

Item in Violet Case: Analog Split-Second Mechanical Stopwatch.  
MD

Event Reason: Sol refuses to use digital phone timers to track runner splits, claiming analog dials have real soul.

Panel 1 | Sol: "Door 9. In the violet case is a dual-dial mechanical stopwatch. Grab that case and the stash before you make for the car. Both pickups are required."  
MD
+ 2

Panel 2 | Vee: "An antique stopwatch? We're taking over a city, Sol, not coaching track and field."

Panel 3 | Sol: "That spring-wound timer tracks split seconds to the tenth, Vee! Scoop both items and sprint to the curb!"  
MD

Duo Celebration (AL_C01_H15)

Panel 1 | Vee: "Fifteen doors cleared. First block of Duskport is marked on our campaign map. The silhouette looks sharp."  
MD
+ 1

Panel 2 | Sol: "And the stopwatch is already ticking! That last porch-to-trunk sprint was pure heat."

Chapter 2: Neon Ink (CH_AL_02)

Story Development: Afterlight sweeps an alleyway corridor to tag drop houses with signature high-visibility murals.  
MD
+ 1

House Schedule:

House 1: Active (AL_C02_H01)

House 4: Silent

House 7: Active (AL_C02_H07) — Tease Slot

House 9: Active (AL_C02_H09) — Mandatory Job Briefing  
MD

House 10: Silent

House 13: Active (AL_C02_H13) — Reactive Eligible

House 15: Duo Celebration (AL_C02_H15)  
MD

Fixed Pre-House Dialogue

AL_C02_H01 (House 1)

Panel 1 | Sol: "Tight alley porches along this strip. Pop out the front door and hit top speed immediately."

Panel 2 | Vee: "Speed is fine, but don't scramble. Make every corner look deliberate."  
MD

AL_C02_H07 (House 7)

Panel 1 | Sol: "Six houses cleared. Stashes are piling up in the trunk."

Panel 2 (Tease) | Sol: "I’ll need you at house 9 for a quick pickup. I’ll explain what to grab before that entrance. Keep moving."

AL_C02_H13 (House 13)

Panel 1 (Fixed Progress) | Vee: "Three houses remain. Maintain your composure and close this avenue out."

Reactive Slot: Sentence 1 ("Three houses remain.") may be replaced by an eligible Vee variant if triggered here.

Eligible Bank IDs: AL_VEE_ZDEATH_01–06, AL_VEE_UNTOUCH_01–06, AL_VEE_COMEBACK_01–05, AL_VEE_NOPOW_01–06, AL_VEE_BUNK_01–06, AL_VEE_PHASE_01–06, AL_VEE_DASH_01–05, AL_VEE_DECOY_01–06.

Neutral Fallback ID: AL_VEE_NEUT_02.

House 9 Special Job (AL_C02_H09)

Item in Violet Case: High-Pressure Aerosol Spray Nozzle Kit.  
MD

Event Reason: Vee needs precision wide-fan spray nozzles to tag building-sized murals before sunrise.

Panel 1 | Sol: "Target door. The violet case holds an anodized spray nozzle kit. You must bring that case along with the stash to extract."  
MD
+ 1

Panel 2 | Vee: "Fat caps and calligraphy tips. That lets me lay down six-foot violet tags in four seconds flat."

Panel 3 | Sol: "Just don't spray my leather jacket this time! Both items to the curb, runner."  
MD

Duo Celebration (AL_C02_H15)

Panel 1 | Vee: "Thirty total stashes logged, and the entire alley is tagged in radiant violet."  
MD

Panel 2 | Sol: "Nobody can mistake whose block this is now. Let's roll to the next avenue."

Chapter 3: Amber Beacon (CH_AL_03)

Story Development: Afterlight clears an old commercial strip to locate high-intensity staging lights for their street takeover.  
MD

House Schedule:

House 1: Silent

House 4: Active (AL_C03_H04) — Tease Slot

House 7: Silent

House 9: Active (AL_C03_H09) — Mandatory Job Briefing  
MD

House 10: Active (AL_C03_H10) — Reactive Eligible

House 13: Active (AL_C03_H13)

House 15: Duo Celebration (AL_C03_H15)  
MD

Fixed Pre-House Dialogue

AL_C03_H04 (House 4)

Panel 1 | Vee: "Three houses cleared. Your exits are looking fluid."

Panel 2 (Tease) | Vee: "Sol will need a favor at house 9. He’ll lay out the pickup before you take that entrance. Keep moving."

AL_C03_H10 (House 10)

Panel 1 (Fixed Progress) | Sol: "Six houses remain. Stride it out and keep those porch splits fast."

Reactive Slot: Sentence 1 ("Six houses remain.") may be replaced by an eligible Sol variant.

Eligible Bank IDs: AL_SOL_ZDEATH_01–04, AL_SOL_UNTOUCH_01–05, AL_SOL_COMEBACK_01–05, AL_SOL_NOPOW_01–05, AL_SOL_BUNK_01–05, AL_SOL_PHASE_01–05, AL_SOL_DASH_01–06, AL_SOL_DECOY_01–05.

Neutral Fallback ID: AL_SOL_NEUT_01.

AL_C03_H13 (House 13)

Panel 1 | Vee: "Three houses left. Close this commercial strip with style."

House 9 Special Job (AL_C03_H09)

Item in Violet Case: High-Output Amber Strobe Beacon.  
MD

Event Reason: Sol wants an industrial-grade amber strobe to mark the finish line of their late-night street sprint.

Panel 1 | Sol: "Door 9. In the violet case is a heavy amber emergency strobe. Both the case and the stash must reach the car."  
MD
+ 1

Panel 2 | Vee: "An amber strobe? It's completely going to clash with our violet aesthetic, Sol."

Panel 3 | Sol: "It flashes at four hundred lumens! When runners hit the curb, they'll know exactly where the finish line is. Bring both!"  
MD

Duo Celebration (AL_C03_H15)

Panel 1 | Vee: "Forty-five houses logged for Afterlight. The commercial strip belongs to our campaign."  
MD

Panel 2 | Sol: "Strobe beacon is secured. That light is going to blind the whole street when we fire it up."

Chapter 4: Bass Drop (CH_AL_04)

Story Development: The crew pushes through a noisy retail avenue to salvage high-wattage sound hardware.  
MD

House Schedule:

House 1: Active (AL_C04_H01)

House 4: Silent

House 7: Active (AL_C04_H07) — Tease Slot

House 9: Active (AL_C04_H09) — Mandatory Job Briefing  
MD

House 10: Silent

House 13: Active (AL_C04_H13) — Reactive Eligible

House 15: Duo Celebration (AL_C04_H15)  
MD

Fixed Pre-House Dialogue

AL_C04_H01 (House 1)

Panel 1 | Sol: "Too many street advertisements humming out here. We need real music on this block."

Panel 2 | Vee: "Music comes after the run. Clear the porches and keep the getaway clean."  
MD

AL_C04_H07 (House 7)

Panel 1 | Sol: "Six houses cleared. Pace is on point."

Panel 2 (Tease) | Sol: "I’ll need you at house 9. Found something loud for the sound rig. I’ll brief you before you go in."

AL_C04_H13 (House 13)

Panel 1 (Fixed Progress) | Vee: "Three houses remain. Don't lose your focus on the final stretch."

Reactive Slot: Sentence 1 ("Three houses remain.") may be replaced by an eligible Vee variant.

Eligible Bank IDs: AL_VEE_ZDEATH_01–06, AL_VEE_UNTOUCH_01–06, AL_VEE_COMEBACK_01–05, AL_VEE_NOPOW_01–06, AL_VEE_BUNK_01–06, AL_VEE_PHASE_01–06, AL_VEE_DASH_01–05, AL_VEE_DECOY_01–06.

Neutral Fallback ID: AL_VEE_NEUT_03.

House 9 Special Job (AL_C04_H09)

Item in Violet Case: Parametric Sound Equalizer Rack.  
MD

Event Reason: Sol wants to balance the low-end subwoofers in the getaway van so the bass rattling doesn't blow out the speakers.

Panel 1 | Sol: "Door 9. In the violet case is a pro-grade parametric audio equalizer. Carry both the case and the stash to the getaway car."  
MD
+ 1

Panel 2 | Vee: "An audio processor? You really can't go five minutes without rattling windows, can you?"

Panel 3 | Sol: "You can't have a street showcase without chest-thumping bass, Vee! Bring both items to the trunk, runner!"  
MD

Duo Celebration (AL_C04_H15)

Panel 1 | Vee: "Sixty doors cleared in Duskport. Retail district is officially claimed under Afterlight."  
MD

Panel 2 | Sol: "Equalizer is wired in. The van’s audio hits so hard it shook the mirror right off the windshield."

Chapter 5: Signature Pattern (CH_AL_05)

Story Development: Afterlight works through a quiet residential terrace, recovering Vee's master mural templates.  
MD

House Schedule:

House 1: Active (AL_C05_H01)

House 4: Active (AL_C05_H04) — Tease Slot

House 7: Silent

House 9: Active (AL_C05_H09) — Mandatory Job Briefing  
MD

House 10: Active (AL_C05_H10) — Reactive Eligible

House 13: Silent

House 15: Duo Celebration (AL_C05_H15)  
MD

Fixed Pre-House Dialogue

AL_C05_H01 (House 1)

Panel 1 | Vee: "Wide manicured lawns out here. Keep your movements sharp and don't linger in the hallways."  
MD

Panel 2 | Sol: "Quick steps across the grass, grab the bag, and sprint for the street."  
MD

AL_C05_H04 (House 4)

Panel 1 | Vee: "Three houses cleared. Your approach line is clean."

Panel 2 (Tease) | Vee: "Sol will need a hand at house 9. He’ll explain what we're pulling before you take that entrance. Stay on task."  
MD

AL_C05_H10 (House 10)

Panel 1 (Fixed Progress) | Vee: "Six houses remain. Keep your stride measured all the way to the car."

Reactive Slot: Sentence 1 ("Six houses remain.") may be replaced by an eligible Vee variant.

Eligible Bank IDs: All Chapter 1–4 Vee IDs plus Chapter 5 additions: AL_VEE_ZDEATH_01–06, AL_VEE_UNTOUCH_01–06, AL_VEE_COMEBACK_01–05, AL_VEE_NOPOW_01–06, AL_VEE_BUNK_01–06, AL_VEE_PHASE_01–06, AL_VEE_DASH_01–05, AL_VEE_DECOY_01–06.

Neutral Fallback ID: AL_VEE_NEUT_04.

House 9 Special Job (AL_C05_H09)

Item in Violet Case: Laser-Cut Mylar Stencil Portfolio.  
MD

Event Reason: Vee's multi-layered crew logo stencils were left behind in an abandoned safe house.

Panel 1 | Sol: "House 9. Inside the violet case is Vee’s laser-cut Mylar stencil binder. Both the case and the stash must reach the car."  
MD
+ 1

Panel 2 | Vee: "My multi-layer logo masters. With those, we can drop forty clean crew insignias in under an hour."

Panel 3 | Sol: "Don't bend the plastic sheets, runner! Grab the case, grab the bag, and sprint!"  
MD

Duo Celebration (AL_C05_H15)

Panel 1 | Vee: "Halfway through Duskport. Seventy-five stashes logged on Afterlight's board."  
MD

Panel 2 | Sol: "And Vee’s stencils are back where they belong. The whole city is about to get painted."

Chapter 6: High Glow (CH_AL_06)

Story Development: The crew sweeps a utility sector to secure high-voltage transformers for their night event lighting.  
MD

House Schedule:

House 1: Silent

House 4: Active (AL_C06_H04)

House 7: Active (AL_C06_H07) — Tease Slot

House 9: Active (AL_C06_H09) — Mandatory Job Briefing  
MD

House 10: Silent

House 13: Active (AL_C06_H13) — Reactive Eligible

House 15: Duo Celebration (AL_C06_H15)  
MD

Fixed Pre-House Dialogue

AL_C06_H04 (House 4)

Panel 1 | Sol: "Dark industrial porches along this block. Keep your eyes up when you exit."

Panel 2 | Vee: "Darkness just means our neon stands out brighter. Clear the porches and keep running."  
MD

AL_C06_H07 (House 7)

Panel 1 | Vee: "Six houses cleared. Your stride is holding."

Panel 2 (Tease) | Sol: "I’ll need you at house 9 for a power unit. I’ll explain before that entrance. Keep pulling stashes."

AL_C06_H13 (House 13)

Panel 1 (Fixed Progress) | Vee: "Three houses remain. Push through the final stretch."

Reactive Slot: Sentence 1 ("Three houses remain.") may be replaced by an eligible Vee variant.

Eligible Bank IDs: All Chapter 1–5 Vee IDs.

Neutral Fallback ID: AL_VEE_NEUT_05.

House 9 Special Job (AL_C06_H09)

Item in Violet Case: High-Voltage Solid-State Neon Transformer.  
MD

Event Reason: Vee needs a dedicated 12kV solid-state transformer to power the glowing violet logo display at the event stage.

Panel 1 | Sol: "Door 9. In the violet case is a solid-state neon transformer. You must bring that case along with the stash to extract."  
MD
+ 1

Panel 2 | Vee: "Twelve thousand volts of pure cold illumination. That will light our stage from four blocks away."

Panel 3 | Sol: "Just don't touch the secondary terminals unless you want your hair permanently spiked! Both to the car, runner."  
MD

Duo Celebration (AL_C06_H15)

Panel 1 | Vee: "Ninety houses down in our campaign ledger. The industrial block belongs to Afterlight."  
MD

Panel 2 | Sol: "Transformer is mounted. When we flip that switch, Duskport will see our glow from space."

Chapter 7: The Split Timer (CH_AL_07)

Story Development: Afterlight navigates an old rail corridor to test race-timing sensors across open asphalt.  
MD

House Schedule:

House 1: Active (AL_C07_H01)

House 4: Active (AL_C07_H04) — Tease Slot

House 7: Silent

House 9: Active (AL_C07_H09) — Mandatory Job Briefing  
MD

House 10: Active (AL_C07_H10) — Reactive Eligible

House 13: Silent

House 15: Duo Celebration (AL_C07_H15)  
MD

Fixed Pre-House Dialogue

AL_C07_H01 (House 1)

Panel 1 | Vee: "Rivet yards and rail ties along this avenue. Mind your footing on the stairs and head straight for the curb."  
MD

Panel 2 | Sol: "Long open straightaways out here! Let's see some serious foot speed."

AL_C07_H04 (House 4)

Panel 1 | Vee: "Three houses cleared. Pacing is consistent."

Panel 2 (Tease) | Vee: "Sol will need you at house 9. He found a precision telemetry unit. He’ll brief you before you enter."  
MD

AL_C07_H10 (House 10)

Panel 1 (Fixed Progress) | Vee: "Six houses remain. Don't lose your composure on the threshold."

Reactive Slot: Sentence 1 ("Six houses remain.") may be replaced by an eligible Vee variant.

Eligible Bank IDs: All Chapter 1–6 Vee IDs.

Neutral Fallback ID: AL_VEE_NEUT_06.

House 9 Special Job (AL_C07_H09)

Item in Violet Case: Optical Beam Gate Telemetry Sensor.  
MD

Event Reason: Sol wants professional infrared timing gates to clock foot-sprint records across their finish line.

Panel 1 | Sol: "House 9. In the violet case is an optical beam-break timing gate. Both pickups—case and stash—are mandatory."  
MD
+ 1

Panel 2 | Vee: "Laser timing gates? Sol, you're turning our street showcase into a drag strip."

Panel 3 | Sol: "Because speed matters, Vee! When runners sprint to the car, I want the exact numbers on display. Grab both items!"  
MD

Duo Celebration (AL_C07_H15)

Panel 1 | Vee: "One hundred and five doors cleared. Rail corridor is secure and the lines look flawless."  
MD

Panel 2 | Sol: "Timing gates are calibrated! Next runner who hits the curb gets their split time beamed to the big screen."

Chapter 8: The Sound Horn (CH_AL_08)

Story Development: Sweeping canal-side avenues to acquire long-range audio projection horns.  
MD

House Schedule:

House 1: Silent

House 4: Silent

House 7: Active (AL_C08_H07) — Tease Slot

House 9: Active (AL_C08_H09) — Mandatory Job Briefing  
MD

House 10: Active (AL_C08_H10) — Reactive Eligible

House 13: Active (AL_C08_H13)

House 15: Duo Celebration (AL_C08_H15)  
MD

Fixed Pre-House Dialogue

AL_C08_H07 (House 7)

Panel 1 | Vee: "Six houses cleared. Rhythm is holding."

Panel 2 (Tease) | Sol: "I’ll need you at house 9. I found something loud to wake up the whole canal. I'll brief you before you enter."

AL_C08_H10 (House 10)

Panel 1 (Fixed Progress) | Sol: "Six houses remain on this canal line. Keep moving."

Reactive Slot: Sentence 1 ("Six houses remain on this canal line.") may be replaced by an eligible Sol variant.

Eligible Bank IDs: All Sol IDs eligible through Chapter 8: AL_SOL_ZDEATH_01–06, AL_SOL_UNTOUCH_01–06, AL_SOL_COMEBACK_01–06, AL_SOL_NOPOW_01–06, AL_SOL_BUNK_01–05, AL_SOL_PHASE_01–06, AL_SOL_DASH_01–06, AL_SOL_DECOY_01–06.

Neutral Fallback ID: AL_SOL_NEUT_02.

AL_C08_H13 (House 13)

Panel 1 | Vee: "Three houses remain. Finish the canal line and bring the haul back."

House 9 Special Job (AL_C08_H09)

Item in Violet Case: Cast-Aluminum Public Address Horn.  
MD

Event Reason: Sol wants a weatherproof cast-metal megaphone horn to blast track callouts across the harbor.

Panel 1 | Sol: "House 9. In the violet case is a cast-aluminum megaphone horn. Carry both the case and the stash out to the car."  
MD
+ 1

Panel 2 | Vee: "A megaphone horn? As if your normal speaking voice wasn't already audible across three precincts."

Panel 3 | Sol: "This baby throws sound across half a mile of open water! Grab the case, grab the bag, and haul it to the street!"  
MD

Duo Celebration (AL_C08_H15)

Panel 1 | Vee: "One hundred and twenty houses logged. Canal sector is secured under Afterlight's colors."  
MD

Panel 2 | Sol: "(Speaks through the megaphone) TESTING ONE TWO! The entire harbor can hear us now!"

Chapter 9: The Chrome Grip (CH_AL_09)

Story Development: Pushing up the steep ridge overlooking Duskport to secure custom getaway styling before the grand finale.  
MD

House Schedule:

House 1: Active (AL_C09_H01)

House 4: Active (AL_C09_H04)

House 7: Silent

House 9: Active (AL_C09_H09) — Mandatory Job Briefing  
MD

House 10: Silent

House 13: Active (AL_C09_H13) — Reactive Eligible

House 15: Duo Celebration (AL_C09_H15)  
MD

Fixed Pre-House Dialogue

AL_C09_H01 (House 1)

Panel 1 | Vee: "Steep incline on this ridge. Keep your stride measured on the walkways and don't stall in the halls."

Panel 2 | Sol: "From up here, our violet tags look like a neon constellation across the lower avenues."

AL_C09_H04 (House 4)

Panel 1 | Vee: "Three houses cleared. Your exits are composed."

Panel 2 | Sol: "Look at that vista! Duskport is practically primed for our finale."

AL_C09_H13 (House 13)

Panel 1 (Fixed Progress) | Vee: "Three houses remain. Finish the ridge run and bring it home."

Reactive Slot: Sentence 1 ("Three houses remain.") may be replaced by an eligible Vee variant.

Eligible Bank IDs: All Chapter 1–8 Vee IDs.

Neutral Fallback ID: AL_VEE_NEUT_07.

House 9 Special Job (AL_C09_H09)

Item in Violet Case: Custom Anodized Billet Shift Knob.  
MD

Event Reason: Sol wants the weighted violet shift knob from an old street racer to complete the getaway car's cockpit.

Panel 1 | Sol: "Door 9. In the violet case is a weighted violet anodized shift knob. Both the case and the stash must reach the car."  
MD
+ 1

Panel 2 | Vee: "A shift knob? You made our runner search a burglary house for cockpit jewelry?"

Panel 3 | Sol: "It's four hundred grams of billet aluminum and it matches our crew violet, Vee! Both items to the curb!"  
MD

Duo Celebration (AL_C09_H15)

Panel 1 | Vee: "One hundred and thirty-five stashes cleared. Granite Ridge is secure and our palette dominates the skyline."  
MD

Panel 2 | Sol: "Shift knob is screwed onto the stick! The getaway car feels like a proper rocket now."

Chapter 10: Midnight Klaxon (CH_AL_10)

Story Development: Afterlight clears the central plaza, securing complete campaign control over Duskport before launching their city-wide street takeover.  
MD

House Schedule:

House 1: Active (AL_C10_H01)

House 4: Active (AL_C10_H04) — Tease Slot

House 7: Silent

House 9: Active (AL_C10_H09) — Mandatory Job Briefing  
MD

House 10: Active (AL_C10_H10) — Reactive Eligible

House 13: Active (AL_C10_H13)

House 15: Duo Celebration (AL_C10_H15)  
MD

Fixed Pre-House Dialogue

AL_C10_H01 (House 1)

Panel 1 | Vee: "Central plaza. Fifteen doors between us and locking down the complete Duskport campaign."  
MD

Panel 2 | Sol: "Every light, every speaker, every strobe is wired and waiting. Let’s close this out!"

AL_C10_H04 (House 4)

Panel 1 | Vee: "Three houses cleared. Frame every exit cleanly."

Panel 2 (Tease) | Vee: "Sol will need you at house 9. He won't tell me what it is, but he’ll brief you before you go in."  
MD

AL_C10_H10 (House 10)

Panel 1 (Fixed Progress) | Vee: "Six houses remain in Duskport. Leave nothing on the table."

Reactive Slot: Sentence 1 ("Six houses remain in Duskport.") may be replaced by an eligible Vee variant.

Eligible Bank IDs: All Chapter 1–9 Vee IDs.

Neutral Fallback ID: AL_VEE_NEUT_08.

AL_C10_H13 (House 13)

Panel 1 | Sol: "Three houses remain on the city grid. Run your line straight to the curb!"

House 9 Special Job (AL_C10_H09)

Item in Violet Case: Antique Dual-Rotor Motorized Air-Raid Siren.  
MD

Event Reason: Sol wants an overwhelming mechanical siren to trigger the grand opening of their midnight street takeover.

Panel 1 | Sol: "Door 9. In the violet case is a motorized dual-rotor air-raid siren. Grab that case and the stash—both pickups are mandatory."  
MD
+ 1

Panel 2 | Vee: "An air-raid siren? Sol, that will wake up the entire eastern seaboard!"

Panel 3 | Sol: "Exactly! When we claim Duskport, I want the whole harbor shaking! Bring the case to the car!"  
MD

Duo Celebration (AL_C10_H15)

Panel 1 | Vee: "One hundred and fifty houses logged. Duskport’s campaign line is fully secured under Afterlight’s banner."  
MD
+ 1

Panel 2 | Sol: "(Wails the siren) AWOOO-GA! That is the sound of absolute victory!"

Panel 3 | Vee: "Pack the sound truck, Sol. Auntie Ro says the ferry across the water is boarding. Next stop: Copper Bay."  
MD
+ 1

4. Complete Reactive Dialogue Bank (96 Lines)
Category: ZERO_DEATHS
Vee

AL_VEE_ZDEATH_01 | ZERO_DEATHS | Vee | Min Chapter: 1

"Zero dropped runs on this stretch. Your movements have been completely unbroken."

AL_VEE_ZDEATH_02 | ZERO_DEATHS | Vee | Min Chapter: 1

"Haven't lost you once on this block. Keep that fluid line going through the next door."

AL_VEE_ZDEATH_03 | ZERO_DEATHS | Vee | Min Chapter: 1

"No failed attempts logged. Stay sharp on your exits; don't give them an easy angle."

AL_VEE_ZDEATH_04 | ZERO_DEATHS | Vee | Min Chapter: 1

"You've stayed upright across this whole avenue. Keep that exact silhouette to the curb."

AL_VEE_ZDEATH_05 | ZERO_DEATHS | Vee | Min Chapter: 1

"Zero wipeouts so far. That level of poise is what Afterlight looks for in a runner."

AL_VEE_ZDEATH_06 | ZERO_DEATHS | Vee | Min Chapter: 3

"Still running without a fall. If you finish this clean, Sol might flash the amber strobe for you."

Sol

AL_SOL_ZDEATH_01 | ZERO_DEATHS | Sol | Min Chapter: 1

"Not a single dropped bag on the board! The clock is running and you're flying."

AL_SOL_ZDEATH_02 | ZERO_DEATHS | Sol | Min Chapter: 1

"Still in one piece across this whole street! Keep sprinting like that and we shatter the record."

AL_SOL_ZDEATH_03 | ZERO_DEATHS | Sol | Min Chapter: 1

"Zero wipeouts so far! Don't let up now just because your splits are looking hot."

AL_SOL_ZDEATH_04 | ZERO_DEATHS | Sol | Min Chapter: 1

"You haven't hit the pavement once today! That keeps my adrenaline at redline."

AL_SOL_ZDEATH_05 | ZERO_DEATHS | Sol | Min Chapter: 2

"Zero drops logged. Even Vee’s neon spray tips couldn't paint a cleaner line."

AL_SOL_ZDEATH_06 | ZERO_DEATHS | Sol | Min Chapter: 1

"Still standing without a reset! That’s pure high-velocity hustle right there."

Category: FLAWLESS
Vee

AL_VEE_UNTOUCH_01 | FLAWLESS | Vee | Min Chapter: 1

"Zero bullet hits and zero drops. Your navigation through those halls has been artful."

AL_VEE_UNTOUCH_02 | FLAWLESS | Vee | Min Chapter: 1

"Not a scratch on your jacket and no missed extractions. Keep maintaining that clean space."

AL_VEE_UNTOUCH_03 | FLAWLESS | Vee | Min Chapter: 1

"Untouched by gunfire and completely upright. Maintain that effortless composure."

AL_VEE_UNTOUCH_04 | FLAWLESS | Vee | Min Chapter: 1

"Flawless evasion on every clear so far. You're giving the defender nothing to frame."

AL_VEE_UNTOUCH_05 | FLAWLESS | Vee | Min Chapter: 1

"Zero hits taken and no wipeouts. Keep your transitions sharp and don't linger inside."

AL_VEE_UNTOUCH_06 | FLAWLESS | Vee | Min Chapter: 1

"Not a bullet near you and zero drops. That’s pure visual poetry in motion."

Sol

AL_SOL_UNTOUCH_01 | FLAWLESS | Sol | Min Chapter: 1

"Not a single bullet touched you and you haven't hit the deck! You're pure lightning out there."

AL_SOL_UNTOUCH_02 | FLAWLESS | Sol | Min Chapter: 1

"Zero lead caught and zero drops! You're dodging shots like you've got radar in your shoes."

AL_SOL_UNTOUCH_03 | FLAWLESS | Sol | Min Chapter: 1

"Clean jacket, zero wipeouts! Keep sprinting like that and the car won't even need to brake."

AL_SOL_UNTOUCH_04 | FLAWLESS | Sol | Min Chapter: 1

"You haven't caught a bullet or taken a fall yet! Let's see you close out the block that way."

AL_SOL_UNTOUCH_05 | FLAWLESS | Sol | Min Chapter: 1

"Untouched by gunfire and still on your feet! That makes timing your splits a thrill."

AL_SOL_UNTOUCH_06 | FLAWLESS | Sol | Min Chapter: 8

"Zero hits, zero drops! I ought to blast that megaphone horn just to celebrate your footwork."

Category: COMEBACK
Vee

AL_VEE_COMEBACK_01 | COMEBACK | Vee | Min Chapter: 1

"You took multiple hits earlier, but you regained your form. Keep your composure."

AL_VEE_COMEBACK_02 | COMEBACK | Vee | Min Chapter: 1

"Several rough attempts behind you, but you recovered your line. Stay centered."

AL_VEE_COMEBACK_03 | COMEBACK | Vee | Min Chapter: 1

"Rough angles back there, but you brought the run back into focus. Keep moving to the car."

AL_VEE_COMEBACK_04 | COMEBACK | Vee | Min Chapter: 1

"Multiple drops on this block, but you found the exit lane. Execute with grace on this next door."

AL_VEE_COMEBACK_05 | COMEBACK | Vee | Min Chapter: 1

"You’ve had to reset your approach several times today. What matters is the elegance returned."

AL_VEE_COMEBACK_06 | COMEBACK | Vee | Min Chapter: 4

"Took some hard hits on earlier doors. Take a breath—even our bass monitors need retuning sometimes."

Sol

AL_SOL_COMEBACK_01 | COMEBACK | Sol | Min Chapter: 1

"Took multiple spills on this street, but you bounced right back! That’s real racing spirit."

AL_SOL_COMEBACK_02 | COMEBACK | Sol | Min Chapter: 1

"A few rough attempts back there, but you pulled through! Shake the dust off and floor it."

AL_SOL_COMEBACK_03 | COMEBACK | Sol | Min Chapter: 1

"You took some hits today, but you didn't quit! I love a runner with serious fight."

AL_SOL_COMEBACK_04 | COMEBACK | Sol | Min Chapter: 1

"Plenty of dropped runs behind you, but you're still sprinting! Eyes on the finish line, runner."

AL_SOL_COMEBACK_05 | COMEBACK | Sol | Min Chapter: 1

"More than a couple bad landings today. Grab the next bag and leave those wiped attempts in the dust."

AL_SOL_COMEBACK_06 | COMEBACK | Sol | Min Chapter: 7

"Took some serious bruises and you're still running! You've got more drive than a tuned V8."

Category: NO_POWERS
Vee

AL_VEE_NOPOW_01 | NO_POWERS | Vee | Min Chapter: 1

"Zero powers activated on your clears. You're navigating purely on poise and natural pace."

AL_VEE_NOPOW_02 | NO_POWERS | Vee | Min Chapter: 1

"Running unassisted without tapping any powers. Clean, minimalist execution in those rooms."

AL_VEE_NOPOW_03 | NO_POWERS | Vee | Min Chapter: 1

"Haven't leaned on a single power yet. Keep that natural silhouette moving straight to the car."

AL_VEE_NOPOW_04 | NO_POWERS | Vee | Min Chapter: 1

"No power usage on those extractions. Pure unadorned footwork to the threshold."

AL_VEE_NOPOW_05 | NO_POWERS | Vee | Min Chapter: 1

"Bringing stashes in without activating powers. Trust your body's rhythm and keep running."

AL_VEE_NOPOW_06 | NO_POWERS | Vee | Min Chapter: 1

"Zero powers used on those clears. Crisp, classic style across every hallway."

Sol

AL_SOL_NOPOW_01 | NO_POWERS | Sol | Min Chapter: 1

"Haven't popped a single power yet! Pure leg power. You really like running all-natural."

AL_SOL_NOPOW_02 | NO_POWERS | Sol | Min Chapter: 1

"Zero powers triggered so far! Just raw sprinting hustle. I can definitely respect that."

AL_SOL_NOPOW_03 | NO_POWERS | Sol | Min Chapter: 1

"Haven't touched a power once on this avenue! Doing it the hard way keeps your reflexes twitchy."

AL_SOL_NOPOW_04 | NO_POWERS | Sol | Min Chapter: 1

"Hauling bags out without leaning on powers! If you like burning extra rubber, keep at it."

AL_SOL_NOPOW_05 | NO_POWERS | Sol | Min Chapter: 1

"Running completely unassisted! Just like driving a stick shift with zero power steering."

AL_SOL_NOPOW_06 | NO_POWERS | Sol | Min Chapter: 1

"No powers burned across those clears! Pure raw throttle from the porch to the trunk."

Category: BUNK_BAGS
Vee

AL_VEE_BUNK_01 | BUNK_BAGS | Vee | Min Chapter: 1

"You triggered multiple bunk bags before securing the stash. Focus your gaze before you commit."

AL_VEE_BUNK_02 | BUNK_BAGS | Vee | Min Chapter: 1

"Touched a few false bags in those rooms. Don't let empty decoys ruin your composition."

AL_VEE_BUNK_03 | BUNK_BAGS | Vee | Min Chapter: 1

"Had a couple bunk bags dissolve on you. Stay deliberate and spot the true haul."

AL_VEE_BUNK_04 | BUNK_BAGS | Vee | Min Chapter: 1

"Popped multiple decoy bags on this stretch. Stay observant until your hands hit the actual stash."

AL_VEE_BUNK_05 | BUNK_BAGS | Vee | Min Chapter: 1

"A few empty bags touched along the way, but the stash reached the car. Refine your eye."

AL_VEE_BUNK_06 | BUNK_BAGS | Vee | Min Chapter: 1

"Touching bunk bags is like painting with muddy brushes. Filter out the clutter and grab the score."

Sol

AL_SOL_BUNK_01 | BUNK_BAGS | Sol | Min Chapter: 1

"Dissolved a few bunk bags in there! If you want useless junk, come dig through Vee’s paint rags."

AL_SOL_BUNK_02 | BUNK_BAGS | Sol | Min Chapter: 1

"Hit multiple false bags on this block! Good thing you tracked down the stash before leaving."

AL_SOL_BUNK_03 | BUNK_BAGS | Sol | Min Chapter: 1

"Had a couple fake bags pop on you today! Keep your eyes peeled so you clock a faster split."

AL_SOL_BUNK_04 | BUNK_BAGS | Sol | Min Chapter: 1

"Triggered some empty bags earlier! Just keep sprinting until you touch the stash that counts."

AL_SOL_BUNK_05 | BUNK_BAGS | Sol | Min Chapter: 1

"Popped a few decoys today! Reminds me of taking a bad turn on an unmapped back alley."

AL_SOL_BUNK_06 | BUNK_BAGS | Sol | Min Chapter: 11

"Hit multiple bunk bags on this run! If I had that air-raid siren out here, I’d blast it for each one."

Category: POWER_PHASE
Vee

AL_VEE_PHASE_01 | POWER_PHASE | Vee | Min Chapter: 1

"Phase has been your primary tool this block. Ghosting through the room creates a striking silhouette."

AL_VEE_PHASE_02 | POWER_PHASE | Vee | Min Chapter: 1

"You've been activating Phase more than your other powers. Keep your composure ready when you exit."

AL_VEE_PHASE_03 | POWER_PHASE | Vee | Min Chapter: 1

"Leaning heavily on Phase today. It’s an elegant escape, as long as you keep moving forward."

AL_VEE_PHASE_04 | POWER_PHASE | Vee | Min Chapter: 1

"Triggering Phase frequently. Remember to commit to the sprint the second you solidify."

AL_VEE_PHASE_05 | POWER_PHASE | Vee | Min Chapter: 1

"Phase has been your dominant choice. It solves tight corners with flair, but keep your focus."

AL_VEE_PHASE_06 | POWER_PHASE | Vee | Min Chapter: 1

"Using Phase like negative space in a canvas. Dramatic, just make sure you don't get sloppy."

Sol

AL_SOL_PHASE_01 | POWER_PHASE | Sol | Min Chapter: 1

"Phase is leading your moves today! Ghosting through walls looks wild, just keep your feet pumping."

AL_SOL_PHASE_02 | POWER_PHASE | Sol | Min Chapter: 1

"You've leaned on Phase more than anything else! Beats hunting for an open door when the heat's on."

AL_SOL_PHASE_03 | POWER_PHASE | Sol | Min Chapter: 1

"Lots of Phase activations logged! If only I could phase past city traffic on Friday nights."

AL_SOL_PHASE_04 | POWER_PHASE | Sol | Min Chapter: 1

"Phase is your go-to on this stretch! Slipping out of sight is slick, but you still gotta sprint to the car."

AL_SOL_PHASE_05 | POWER_PHASE | Sol | Min Chapter: 1

"Triggering Phase more than anything else today! Killer move, just keep your eyes on the curb."

AL_SOL_PHASE_06 | POWER_PHASE | Sol | Min Chapter: 6

"Leaning on Phase again! That purple shimmer looks almost as bright as our neon transformer."

Category: POWER_DASH
Vee

AL_VEE_DASH_01 | POWER_DASH | Vee | Min Chapter: 1

"Dash has been your dominant power this block. That sudden lunge cuts a sharp, aggressive line."

AL_VEE_DASH_02 | POWER_DASH | Vee | Min Chapter: 1

"Leaning on Dash more than the rest. Rapid acceleration, just keep your exit framed properly."

AL_VEE_DASH_03 | POWER_DASH | Vee | Min Chapter: 1

"You've been triggering Dash quite a bit. Dynamic velocity, just don't overshoot your threshold."

AL_VEE_DASH_04 | POWER_DASH | Vee | Min Chapter: 1

"Dash is leading your runs so far. Hitting that burst works, provided your landing stays poised."

AL_VEE_DASH_05 | POWER_DASH | Vee | Min Chapter: 1

"Using Dash more than anything else. Dramatic burst of pace, but keep your eyes on the doorway."

AL_VEE_DASH_06 | POWER_DASH | Vee | Min Chapter: 1

"Dash has been your top tool today. High-impact movement that commands attention in every hall."

Sol

AL_SOL_DASH_01 | POWER_DASH | Sol | Min Chapter: 1

"Dash has been your favorite power on this street! You hit that burst like you just dumped the nitrous."

AL_SOL_DASH_02 | POWER_DASH | Sol | Min Chapter: 1

"Triggering Dash more than anything else! Instant acceleration—now that is what I call velocity."

AL_SOL_DASH_03 | POWER_DASH | Sol | Min Chapter: 1

"Leaning on Dash today! Rocketing straight toward the stash puts a massive smile on my face."

AL_SOL_DASH_04 | POWER_DASH | Sol | Min Chapter: 1

"Dash leads your choices so far! High-speed lunges are great, just keep your hands glued to the bag."

AL_SOL_DASH_05 | POWER_DASH | Sol | Min Chapter: 1

"You favor that Dash burst today! Fast legs cut down split times, so keep hitting that pedal."

AL_SOL_DASH_06 | POWER_DASH | Sol | Min Chapter: 1

"Dash leads the board today! Move that fast at our street showcase and everyone’s jaw will hit the floor."

Category: POWER_DECOY
Vee

AL_VEE_DECOY_01 | POWER_DECOY | Vee | Min Chapter: 1

"Decoy is your go-to move this block. The double creates theatrical misdirection; keep your exit open."

AL_VEE_DECOY_02 | POWER_DECOY | Vee | Min Chapter: 1

"You've been triggering Decoy more than your other powers. Splitting the scene buys you beautiful space."

AL_VEE_DECOY_03 | POWER_DECOY | Vee | Min Chapter: 1

"Leaning on Decoy today. Leaving a holographic clone behind is pure drama, provided you keep running."

AL_VEE_DECOY_04 | POWER_DECOY | Vee | Min Chapter: 1

"Decoy leads your choices on this stretch. Giving them a phantom target keeps your line pristine."

AL_VEE_DECOY_05 | POWER_DECOY | Vee | Min Chapter: 1

"Popping Decoy more than the rest. Excellent misdirection, as long as you don't hesitate at the door."

AL_VEE_DECOY_06 | POWER_DECOY | Vee | Min Chapter: 1

"You favor that Decoy power. Leaving a double to hold the spotlight gives you an open lane to the car."

Sol

AL_SOL_DECOY_01 | POWER_DECOY | Sol | Min Chapter: 1

"Decoy has been your favorite power today! Dropping a clone never gets old—pure chaos."

AL_SOL_DECOY_02 | POWER_DECOY | Sol | Min Chapter: 1

"Leaning on Decoy more than anything else! Like throwing a smoke grenade at a drag race."

AL_SOL_DECOY_03 | POWER_DECOY | Sol | Min Chapter: 1

"Lots of Decoy drops on this block! If I had a decoy at the shop, I'd send it to sit through Vee’s lectures."

AL_SOL_DECOY_04 | POWER_DECOY | Sol | Min Chapter: 1

"Decoy is leading your picks so far! Leaving a dummy behind while you haul the bag is pure hustle."

AL_SOL_DECOY_05 | POWER_DECOY | Sol | Min Chapter: 1

"Dropping Decoys all over the hallway today! As long as you make for the getaway car, keep popping them."

AL_SOL_DECOY_06 | POWER_DECOY | Sol | Min Chapter: 3

"Decoy leads your style this block! Almost as flashy as that amber strobe we recovered."

5. Neutral Fallback Bank (16 Lines)

Universal lines for Vee and Sol that contain no hard-coded house counts, no assumptions of flawless runs, and function at any scheduled check-in slot.

Vee Fallbacks

AL_VEE_NEUT_01 | NEUTRAL_FALLBACK | Vee | Min Chapter: 1

"Keep your stride measured and your head up. Bring the next bag to the car."

AL_VEE_NEUT_02 | NEUTRAL_FALLBACK | Vee | Min Chapter: 1

"Next porch is waiting. Find the stash, frame your exit, and sprint to the curb."

AL_VEE_NEUT_03 | NEUTRAL_FALLBACK | Vee | Min Chapter: 1

"Keep your weight centered and your boots moving. Don't linger once your hands touch the bag."

AL_VEE_NEUT_04 | NEUTRAL_FALLBACK | Vee | Min Chapter: 1

"Focus on the door right in front of you. One clear at a time puts Afterlight on the map."

AL_VEE_NEUT_05 | NEUTRAL_FALLBACK | Vee | Min Chapter: 1

"Stay on the line and keep your eyes on the threshold. Get in and get out."

AL_VEE_NEUT_06 | NEUTRAL_FALLBACK | Vee | Min Chapter: 1

"Check your footing before you cross that porch. Afterlight needs every bag accounted for."

AL_VEE_NEUT_07 | NEUTRAL_FALLBACK | Vee | Min Chapter: 1

"Don't lose your rhythm now. Grab the bag, make your turn, and haul it out to the car."

AL_VEE_NEUT_08 | NEUTRAL_FALLBACK | Vee | Min Chapter: 1

"Another door, another statement. Keep pulling bags and we'll have this avenue claimed."

Sol Fallbacks

AL_SOL_NEUT_01 | NEUTRAL_FALLBACK | Sol | Min Chapter: 1

"Keep your boots moving! The getaway car is idling at the curb waiting for that stash."

AL_SOL_NEUT_02 | NEUTRAL_FALLBACK | Sol | Min Chapter: 1

"Another house on the block! Grab the bag clean and hit top speed on the walkway."

AL_SOL_NEUT_03 | NEUTRAL_FALLBACK | Sol | Min Chapter: 1

"The car is running and the street is clear! Scoop the stash and bring it to the curb."

AL_SOL_NEUT_04 | NEUTRAL_FALLBACK | Sol | Min Chapter: 1

"Step up to the door, find the goods, and hit the pavement! Let's keep moving."

AL_SOL_NEUT_05 | NEUTRAL_FALLBACK | Sol | Min Chapter: 1

"Keep pulling bags! The faster we clear these houses, the sooner we fire up the sound truck."

AL_SOL_NEUT_06 | NEUTRAL_FALLBACK | Sol | Min Chapter: 1

"Keep your momentum moving forward! Don't get tangled up inside; grab the stash and go."

AL_SOL_NEUT_07 | NEUTRAL_FALLBACK | Sol | Min Chapter: 1

"Another porch ready to breach! Keep your hands ready and your sprint straight to the car."

AL_SOL_NEUT_08 | NEUTRAL_FALLBACK | Sol | Min Chapter: 1

"Stay locked in out there! Scoop the stash and let’s keep the scoreboard climbing."

6. Continuity Restrictions and Implementation Requirements
1-Based Chapter Continuity Gates

Narrative callbacks must strictly respect story progression flags. A line referencing a secured event item may only trigger if the block awarding that item has been fully cleared:  
MD

minChapter: 2: Split-Second Stopwatch secured in Chapter 1.  
MD

minChapter: 3: High-Pressure Aerosol Kit secured in Chapter 2.  
MD

minChapter: 4: Amber Strobe Beacon secured in Chapter 3.  
MD

minChapter: 5: Audio Equalizer Rack secured in Chapter 4.  
MD

minChapter: 6: Mylar Stencil Portfolio secured in Chapter 5.  
MD

minChapter: 7: Solid-State Neon Transformer secured in Chapter 6.  
MD

minChapter: 8: Telemetry Beam Gates secured in Chapter 7.  
MD

minChapter: 9: PA Megaphone Horn secured in Chapter 8.  
MD

minChapter: 10: Billet Shift Knob secured in Chapter 9.  
MD

minChapter: 11: Motorized Air-Raid Siren secured in Chapter 10 (valid only in continuation runs or City 2).  
MD

Implementation Rules & Engine Boundaries

Strict Lifecycle Isolation:

Consultations execute strictly before the exterior block entrance screen.  
MD

Gameplay inside the house is never interrupted by contact dialogue panels.  
MD

On-screen input must be suspended while dialogue panels are mounted to prevent tap-through or stuck gestures.  
MD

House 9 Mandatory Pickup:

The special job item renders on the floor in a compact violet case.  
MD

Authoritative extraction requires carrying both the stash and the violet case to the getaway car.  
MD

Attempting to extract with only the stash or only the special item denies exit at the car beacon without advancing the round.  
MD

Persistence & Deduplication:

Shown consultation IDs and story completion states must be written to account-scoped persistence (pr_contacts_v1_<user>).  
MD

Story chapters advance via finishCrewStory only upon successful extraction at House 15.  
MD

Retries and deaths reload the seeded house attempt, bypass already-viewed pre-house consultation panels, and cannot grant retrospective story advancement.  
MD

Mode Segregation:

Afterlight campaign story chapters apply exclusively to Run the Block (Journey mode).  
MD

Block Rivals, Daily Challenge, and Tutorial runs remain isolated from crew story states and must never trigger contact consultation panels or special item drops.  
MD
+ 1

DevTools Console Downloader: AFTERLIGHT_SEASON_1.md

Paste this snippet into your browser console (F12 → Console) to download this exact file directly without copying text:

JavaScript
(() => {
  const header = '# AFTERLIGHT_SEASON_1.md';
  const candidateElements = Array.from(document.querySelectorAll('div, article, section, pre'));
  const matching = candidateElements
    .map(el => el.innerText || '')
    .filter(text => text.includes(header));

  if (!matching.length) {
    console.error('[Error] Could not find content for AFTERLIGHT_SEASON_1.md in this tab.');
    return;
  }

  const rawContent = matching.reduce((a, b) => (a.length > b.length ? a : b));
  const cleanContent = rawContent.substring(rawContent.indexOf(header));

  const blob = new Blob([cleanContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'AFTERLIGHT_SEASON_1.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log('[Success] AFTERLIGHT_SEASON_1.md downloaded successfully.');
})();





Flash
Extended

Gemini is AI and can make mistakes.