
CROSSLINE_SEASON_1.md

Approved narrative specification awaiting implementation. Do not modify existing game files.

1. Season Premise and Character Voices
Season Premise: The Network Grid

Duskport’s courier frequencies have gone dark, leaving abandoned drop points and unmonitored stashes across ten sequential city blocks. Crossline is moving to sweep every porch, link the blind spots into a closed communication web, and establish route ownership across the district.  
MD
+ 2

All running takes place strictly on foot. The crew's narrative campaign tracks personal turf acquisition across 150 stashes (10 blocks × 15 houses). This personal campaign progression is completely separate from the server-wide Block Rivals competition; clearing Block 10 locks down Crossline’s master network in Duskport and opens the route across the water to Copper Bay (City 2), without asserting victory over the shared rival standings.  
MD
+ 3

Character Voices
Switch (Primary Contact)

Role & Silhouette: Route architect and tactical coordinator. Sharp, focused, analytical, and hyper-vigilant. Wears an indigo work jacket with a gold hoodie and a cyan route-arrow pin.  
MD
+ 2

Perspective: Speaks strictly in the first person. Views the street grid like a live vector map. Cares about lane discipline, corner angles, clear exit paths, and getting the bag to the trunk without wasted motion. Dislikes hardware clutter, radio noise, and improvisation.  
MD
+ 1

Vocabulary & Tone: Crisp, spatial, disciplined. Uses navigation and signal terms (vectors, clean lines, drop windows, signal bleed) to describe foot momentum. Never gives generic congratulations; marks progress factually.

Mags (Secondary / Jobs Contact)

Role & Silhouette: Signal technician, wiretapper, and field scout. Scrappy, fast-talking, caffeinated, and irreverent. Wears a green utility coat covered in antenna clips, patch cables, and frequency dials.  
MD
+ 2

Perspective: Speaks in the first person ("I need you at house 9"; never refers to herself in the third person). Constantly monitors police bands, laughs at rival crew mistakes, and treats burglary houses like a surplus electronics bin. Amused by Switch’s obsession with order.  
MD

Vocabulary & Tone: Punchy, breathless, sarcastic. References transceivers, decibels, static, soldered joints, and scanner noise. Delivers mandatory House 9 briefings with tactical clarity.  
MD

Auntie Ro (Neutral Anchor — The Window)

Role & Silhouette: Owner of The Window bodega. Neighborhood elder who hosts crew onboarding, trades local news, and serves cold drinks.  
MD
+ 1

Perspective: Observant, maternal without softness, sardonic. Holds no allegiance to Crossline over Iron Row or Afterlight. Reminds runners that no antenna saves someone who trips over their own feet.  
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
Chapter 1: Signal Lock (CH_CL_01)

Story Development: Crossline maps the outer avenues of Duskport to synchronize courier frequencies and clear their opening territory.  
MD
+ 1

House Schedule:

House 1: Active (CL_C01_H01)

House 4: Active (CL_C01_H04) — Tease Slot

House 7: Silent

House 9: Active (CL_C01_H09) — Mandatory Job Briefing  
MD

House 10: Active (CL_C01_H10) — Reactive Eligible

House 13: Silent

House 15: Duo Celebration (CL_C01_H15)  
MD

Fixed Pre-House Dialogue

CL_C01_H01 (House 1)

Panel 1 | Switch: "First porch of the campaign. Find the stash, keep your corners clean, and make a straight line for the getaway car."  
MD
+ 1

Panel 2 | Mags: "I've got the radio tuned to the neighborhood band. Move fast and don't make me listen to dead air."

CL_C01_H04 (House 4)

Panel 1 | Switch: "Three houses cleared. Route timing is holding."

Panel 2 (Tease) | Switch: "Mags will need you at house 9. She’ll brief you before you take that entrance. For now, keep pulling bags."  
MD

CL_C01_H10 (House 10)

Panel 1 (Fixed Progress) | Switch: "Six houses remain on this avenue. Maintain your lane and finish the run."

Reactive Slot: Sentence 1 ("Six houses remain on this avenue.") may be replaced by an eligible Switch variant if triggered here.

Eligible Bank IDs: CL_SWT_ZDEATH_01–05, CL_SWT_UNTOUCH_01–06, CL_SWT_COMEBACK_01–05, CL_SWT_NOPOW_01–06, CL_SWT_BUNK_01–06, CL_SWT_PHASE_01–06, CL_SWT_DASH_01–05, CL_SWT_DECOY_01–06.

Neutral Fallback ID: CL_SWT_NEUT_01.

House 9 Special Job (CL_C01_H09)

Item in Violet Case: High-Gain Yagi Directional Antenna.  
MD

Network Reason: Mags needs a directional antenna to monitor harbor dispatch; Switch thinks it looks like scrap aluminum.

Panel 1 | Mags: "Door 9. Inside is a violet case holding a high-gain Yagi antenna. Carry both the case and the stash to the getaway car to clear the door."  
MD
+ 1

Panel 2 | Switch: "That aluminum frame looks like a collapsed drying rack. We're setting up a communications grid, Mags."

Panel 3 | Mags: "It pulls sixteen decibels of clean gain, Switch. Grab the case and the bag, runner—both come out."  
MD

Duo Celebration (CL_C01_H15)

Panel 1 | Switch: "Fifteen doors cleared. First block of Duskport is recorded in our route log. Clean vectors all the way."  
MD
+ 1

Panel 2 | Mags: "And the antenna is already bolted to the roof. Now we can hear what the precinct had for breakfast."

Chapter 2: The Wire Sweep (CH_CL_02)

Story Development: Crossline traces phone line conduits through an alleyway block to find clean relay junction points.  
MD

House Schedule:

House 1: Active (CL_C02_H01)

House 4: Silent

House 7: Active (CL_C02_H07) — Tease Slot

House 9: Active (CL_C02_H09) — Mandatory Job Briefing  
MD

House 10: Silent

House 13: Active (CL_C02_H13) — Reactive Eligible

House 15: Duo Celebration (CL_C02_H15)  
MD

Fixed Pre-House Dialogue

CL_C02_H01 (House 1)

Panel 1 | Mags: "Old telephone drops all along these fences. Watch the overhangs on your way out."

Panel 2 | Switch: "Ignore the wiring and focus on the exit threshold. Move the bags to the car."  
MD

CL_C02_H07 (House 7)

Panel 1 | Mags: "Six houses cleared. Signal is coming in loud and clear."

Panel 2 (Tease) | Mags: "I’ll need you at house 9 for a hardware pickup. I’ll explain the piece before you enter. Stay on the move."

CL_C02_H13 (House 13)

Panel 1 (Fixed Progress) | Switch: "Three houses remain. Commit to your line and finish this avenue."

Reactive Slot: Sentence 1 ("Three houses remain.") may be replaced by an eligible Switch variant if triggered here.

Eligible Bank IDs: CL_SWT_ZDEATH_01–06, CL_SWT_UNTOUCH_01–06, CL_SWT_COMEBACK_01–05, CL_SWT_NOPOW_01–06, CL_SWT_BUNK_01–06, CL_SWT_PHASE_01–06, CL_SWT_DASH_01–05, CL_SWT_DECOY_01–06.

Neutral Fallback ID: CL_SWT_NEUT_02.

House 9 Special Job (CL_C02_H09)

Item in Violet Case: Tuned Crystal Radio Receiver.  
MD

Network Reason: Mags needs an unpowered receiver that monitors dispatch frequencies without broadcasting a detectable local oscillator signal.

Panel 1 | Mags: "House 9. In the violet case is an analog crystal receiver. Bring that case and the stash out to the street—both pickups are mandatory."  
MD
+ 1

Panel 2 | Switch: "Zero RF leakage from a passive diode circuit. Smart pickup, Mags. Bring it home, runner."

Duo Celebration (CL_C02_H15)

Panel 1 | Switch: "Thirty total stashes logged for Crossline. Our route map is expanding across the southern grid."  
MD

Panel 2 | Mags: "That passive crystal set is pulling clear dispatch audio. Nobody even knows we're listening."

Chapter 3: High Impedance (CH_CL_03)

Story Development: Crossline works through a commercial strip to patch high-loss cable runs across the grid.  
MD

House Schedule:

House 1: Silent

House 4: Active (CL_C03_H04) — Tease Slot

House 7: Silent

House 9: Active (CL_C03_H09) — Mandatory Job Briefing  
MD

House 10: Active (CL_C03_H10) — Reactive Eligible

House 13: Active (CL_C03_H13)

House 15: Duo Celebration (CL_C03_H15)  
MD

Fixed Pre-House Dialogue

CL_C03_H04 (House 4)

Panel 1 | Switch: "Three houses cleared. Keep your transitions crisp."

Panel 2 (Tease) | Switch: "Mags will need a pickup at house 9. She’ll detail the item before that door. Keep moving."

CL_C03_H10 (House 10)

Panel 1 (Fixed Progress) | Mags: "Six houses remain. Stride it out and keep the rhythm steady."

Reactive Slot: Sentence 1 ("Six houses remain.") may be replaced by an eligible Mags variant.

Eligible Bank IDs: CL_MAG_ZDEATH_01–04, CL_MAG_UNTOUCH_01–05, CL_MAG_COMEBACK_01–05, CL_MAG_NOPOW_01–05, CL_MAG_BUNK_01–05, CL_MAG_PHASE_01–05, CL_MAG_DASH_01–06, CL_MAG_DECOY_01–05.

Neutral Fallback ID: CL_MAG_NEUT_01.

CL_C03_H13 (House 13)

Panel 1 | Switch: "Three houses left. Close this commercial line."

House 9 Special Job (CL_C03_H09)

Item in Violet Case: Shielded Coaxial Cable Spool.  
MD

Network Reason: Switch demands fifty-ohm double-shielded cable so ping times don't spike across relays; Mags complains about carrying it.

Panel 1 | Mags: "Target house. The violet case holds a heavy spool of double-shielded coax. Both the case and the stash must reach the car."  
MD
+ 1

Panel 2 | Switch: "Zero signal drop, pure copper braiding. Grab it so we stop losing data packets across the avenue."

Panel 3 | Mags: "It weighs twenty pounds, Switch! Runner, don't drop it on your toes on the way out."  
MD

Duo Celebration (CL_C03_H15)

Panel 1 | Switch: "Forty-five houses logged for Crossline. Our packet latency dropped by forty milliseconds across this block."  
MD

Panel 2 | Mags: "Great. Now Switch can be disappointed in our split times forty milliseconds faster."

Chapter 4: Hot Transistors (CH_CL_04)

Story Development: The crew pushes along a neon avenue where transmitter stations are overheating under heavy traffic.  
MD

House Schedule:

House 1: Active (CL_C04_H01)

House 4: Silent

House 7: Active (CL_C04_H07) — Tease Slot

House 9: Active (CL_C04_H09) — Mandatory Job Briefing  
MD

House 10: Silent

House 13: Active (CL_C04_H13) — Reactive Eligible

House 15: Duo Celebration (CL_C04_H15)  
MD

Fixed Pre-House Dialogue

CL_C04_H01 (House 1)

Panel 1 | Mags: "The air out here smells like hot circuit boards and ozone."

Panel 2 | Switch: "Because our repeaters are working double-time. Clear the porches and keep the route open."  
MD

CL_C04_H07 (House 7)

Panel 1 | Mags: "Six houses cleared. Data flow is holding."

Panel 2 (Tease) | Mags: "I’ll need you at house 9. The Map Room is cooking like an oven, so I found cooling hardware. I'll brief you before you go in."

CL_C04_H13 (House 13)

Panel 1 (Fixed Progress) | Switch: "Three houses remain. Don't lose your focus on the home stretch."

Reactive Slot: Sentence 1 ("Three houses remain.") may be replaced by an eligible Switch variant.

Eligible Bank IDs: CL_SWT_ZDEATH_01–06, CL_SWT_UNTOUCH_01–06, CL_SWT_COMEBACK_01–05, CL_SWT_NOPOW_01–06, CL_SWT_BUNK_01–06, CL_SWT_PHASE_01–06, CL_SWT_DASH_01–05, CL_SWT_DECOY_01–06.

Neutral Fallback ID: CL_SWT_NEUT_03.

House 9 Special Job (CL_C04_H09)

Item in Violet Case: Extruded Aluminum Heat-Sink Array.  
MD

Network Reason: The receiver bank in Switch’s Map Room is thermal-throttling; Mags claims Switch just runs too many CRT monitors.

Panel 1 | Mags: "Door 9. In the violet case is a finned aluminum heat-sink array. You need both the case and the stash in the trunk before the car pulls away."  
MD
+ 1

Panel 2 | Switch: "Passive heat dissipation. That keeps our main receiver from melting down during peak hours."

Panel 3 | Mags: "Or you could turn off three of your six tactical monitors, Switch. Grab the case, runner!"  
MD

Duo Celebration (CL_C04_H15)

Panel 1 | Switch: "Sixty doors cleared in Duskport. The southern network hub is stable and running cool."  
MD

Panel 2 | Mags: "Heat sinks are mounted. The Map Room dropped ten degrees—now it only smells like lukewarm solder."

Chapter 5: Spectrum Map (CH_CL_05)

Story Development: Crossline sweeps a residential avenue to measure and isolate frequency interference across the core.  
MD

House Schedule:

House 1: Active (CL_C05_H01)

House 4: Active (CL_C05_H04) — Tease Slot

House 7: Silent

House 9: Active (CL_C05_H09) — Mandatory Job Briefing  
MD

House 10: Active (CL_C05_H10) — Reactive Eligible

House 13: Silent

House 15: Duo Celebration (CL_C05_H15)  
MD

Fixed Pre-House Dialogue

CL_C05_H01 (House 1)

Panel 1 | Switch: "Wide walkways along this residential stretch. Plan your approach, grab the stash, and head straight out."  
MD

Panel 2 | Mags: "Watch the gravel paths. Keep your steps light."

CL_C05_H04 (House 4)

Panel 1 | Switch: "Three houses cleared. Good lane control."

Panel 2 (Tease) | Switch: "Mags will need a hand at house 9. She’ll detail the diagnostic unit before that entrance. Stay on task."  
MD

CL_C05_H10 (House 10)

Panel 1 (Fixed Progress) | Switch: "Six houses remain. Keep your stride measured all the way to the car."

Reactive Slot: Sentence 1 ("Six houses remain.") may be replaced by an eligible Switch variant.

Eligible Bank IDs: All Chapter 1–4 Switch IDs plus Chapter 5 additions: CL_SWT_ZDEATH_01–06, CL_SWT_UNTOUCH_01–06, CL_SWT_COMEBACK_01–05, CL_SWT_NOPOW_01–06, CL_SWT_BUNK_01–06, CL_SWT_PHASE_01–06, CL_SWT_DASH_01–05, CL_SWT_DECOY_01–06.

Neutral Fallback ID: CL_SWT_NEUT_04.

House 9 Special Job (CL_C05_H09)

Item in Violet Case: Portable Spectrum Analyzer Module.  
MD

Network Reason: Switch needs to identify rogue frequency spikes distorting courier tracking across the central avenues.

Panel 1 | Mags: "House 9. Inside the violet case is a handheld spectrum analyzer. You must bring that case along with the stash to extract."  
MD
+ 1

Panel 2 | Switch: "That unit sweeps from ten megahertz to three gigahertz. We can finally pin down where the background interference is coming from."

Panel 3 | Mags: "Spoiler alert: it’s coming from Afterlight blasting subwoofers three blocks over. Grab the case!"  
MD

Duo Celebration (CL_C05_H15)

Panel 1 | Switch: "Halfway through Duskport. Seventy-five stashes logged on Crossline's board."  
MD

Panel 2 | Mags: "Spectrum sweep is complete. We've mapped every clean frequency from here to the harbor."

Chapter 6: Brownout Buffer (CH_CL_06)

Story Development: The crew sweeps a utility sector to secure backup power storage against sudden grid fluctuations.  
MD

House Schedule:

House 1: Silent

House 4: Active (CL_C06_H04)

House 7: Active (CL_C06_H07) — Tease Slot

House 9: Active (CL_C06_H09) — Mandatory Job Briefing  
MD

House 10: Silent

House 13: Active (CL_C06_H13) — Reactive Eligible

House 15: Duo Celebration (CL_C06_H15)  
MD

Fixed Pre-House Dialogue

CL_C06_H04 (House 4)

Panel 1 | Mags: "Streetlights are flickering along this line. Grid voltage is sagging."

Panel 2 | Switch: "Our runs don't depend on streetlights. Find the door, take the bag, and sprint out."  
MD

CL_C06_H07 (House 7)

Panel 1 | Switch: "Six houses cleared. Pacing is consistent."

Panel 2 (Tease) | Mags: "I’ll need you at house 9 for a power cell pickup. I’ll explain before that door. Keep pulling bags."

CL_C06_H13 (House 13)

Panel 1 (Fixed Progress) | Switch: "Three houses remain. Finish strong through the dark stretch."

Reactive Slot: Sentence 1 ("Three houses remain.") may be replaced by an eligible Switch variant.

Eligible Bank IDs: All Chapter 1–5 Switch IDs.

Neutral Fallback ID: CL_SWT_NEUT_05.

House 9 Special Job (CL_C06_H09)

Item in Violet Case: Ultracapacitor Backup Pack.  
MD

Network Reason: Prevents rooftop signal repeaters from rebooting during neighborhood power drops; Switch points out it barely powers a desk lamp.

Panel 1 | Mags: "Door 9. In the violet case is an ultracapacitor backup bank. Both the case and the stash must reach the car."  
MD
+ 1

Panel 2 | Switch: "Instant discharge, zero cycle degradation. If the city grid hiccups, our repeaters won't lose sync."

Panel 3 | Mags: "It holds about enough juice to run your coffee maker for four seconds, Switch. Bring it to the car, runner!"  
MD

Duo Celebration (CL_C06_H15)

Panel 1 | Switch: "Ninety houses down in our campaign ledger. Brownout corridor is locked into our network."  
MD

Panel 2 | Mags: "Capacitors are wired. Even if Duskport loses power completely, Crossline stays talking."

Chapter 7: Noise Baffle (CH_CL_07)

Story Development: Crossline navigates an industrial rail corridor to shield their transmission arrays from rogue interference.  
MD

House Schedule:

House 1: Active (CL_C07_H01)

House 4: Active (CL_C07_H04) — Tease Slot

House 7: Silent

House 9: Active (CL_C07_H09) — Mandatory Job Briefing  
MD

House 10: Active (CL_C07_H10) — Reactive Eligible

House 13: Silent

House 15: Duo Celebration (CL_C07_H15)  
MD

Fixed Pre-House Dialogue

CL_C07_H01 (House 1)

Panel 1 | Switch: "Gravel and track beds along this block. Watch your balance on the porch stairs and head straight for the curb."  
MD

Panel 2 | Mags: "Lots of stray radio chatter echoing off the rail cars. Stay sharp."

CL_C07_H04 (House 4)

Panel 1 | Switch: "Three houses cleared. Vector control is holding."

Panel 2 (Tease) | Switch: "Mags will need you at house 9. She has a countermeasure unit scoped out. She’ll brief you before you enter."  
MD

CL_C07_H10 (House 10)

Panel 1 (Fixed Progress) | Switch: "Six houses remain. Don't slow down at the door."

Reactive Slot: Sentence 1 ("Six houses remain.") may be replaced by an eligible Switch variant.

Eligible Bank IDs: All Chapter 1–6 Switch IDs.

Neutral Fallback ID: CL_SWT_NEUT_06.

House 9 Special Job (CL_C07_H09)

Item in Violet Case: Microwave Cavity Notch Filter.  
MD

Network Reason: Mags wants a sharp filter notch to mute noise from Iron Row's garage welders and Afterlight's transmitters; Switch says they don't sabotage, they isolate.

Panel 1 | Mags: "House 9. In the violet case is a silver cavity notch filter. Both pickups—case and stash—are required to leave."  
MD
+ 1

Panel 2 | Switch: "A fifty-decibel attenuation notch. We drop it right over the local interference frequency."

Panel 3 | Mags: "Which means Rook’s noisy garage radio gets completely scrubbed out of our comms. Get both items to the street!"  
MD

Duo Celebration (CL_C07_H15)

Panel 1 | Switch: "One hundred and five doors cleared. Rail corridor is secure and noise levels are zero."  
MD

Panel 2 | Mags: "Filter's installed. Pure, clean silence on the channel. It’s almost spooky."

Chapter 8: Long Haul (CH_CL_08)

Story Development: Sweeping canal-side avenues to link isolated neighborhood repeaters back to the core hub.  
MD

House Schedule:

House 1: Silent

House 4: Silent

House 7: Active (CL_C08_H07) — Tease Slot

House 9: Active (CL_C08_H09) — Mandatory Job Briefing  
MD

House 10: Active (CL_C08_H10) — Reactive Eligible

House 13: Active (CL_C08_H13)

House 15: Duo Celebration (CL_C08_H15)  
MD

Fixed Pre-House Dialogue

CL_C08_H07 (House 7)

Panel 1 | Switch: "Six houses cleared. Rhythm is steady."

Panel 2 (Tease) | Mags: "I’ll need you at house 9. We need long-range glass to bridge the canal gap. I’ll explain before you step up."

CL_C08_H10 (House 10)

Panel 1 (Fixed Progress) | Mags: "Six houses remain on this canal line. Keep moving."

Reactive Slot: Sentence 1 ("Six houses remain on this canal line.") may be replaced by an eligible Mags variant.

Eligible Bank IDs: All Mags IDs eligible through Chapter 8: CL_MAG_ZDEATH_01–06, CL_MAG_UNTOUCH_01–06, CL_MAG_COMEBACK_01–06, CL_MAG_NOPOW_01–06, CL_MAG_BUNK_01–05, CL_MAG_PHASE_01–06, CL_MAG_DASH_01–06, CL_MAG_DECOY_01–06.

Neutral Fallback ID: CL_MAG_NEUT_02.

CL_C08_H13 (House 13)

Panel 1 | Switch: "Three houses remain. Finish the canal line and bring the haul back."

House 9 Special Job (CL_C08_H09)

Item in Violet Case: Directional Laser Transceiver Head.  
MD

Network Reason: An optical line-of-sight laser transmitter to bridge communication across the water without using congested radio bands.

Panel 1 | Mags: "House 9. In the violet case is an infrared laser transceiver. You need that case and the stash in the trunk before the car rolls."  
MD
+ 1

Panel 2 | Switch: "Optical transmission across the canal basin. Unjammable, zero latency, point-to-point."

Panel 3 | Mags: "Just don't point it at my eyes while I'm aligning the mirror! Both to the car, runner."  
MD

Duo Celebration (CL_C08_H15)

Panel 1 | Switch: "One hundred and twenty houses logged. Canal sector is bridged and our network latency is flat."  
MD

Panel 2 | Mags: "Laser is locked onto the Map Room mast. Clean green beam right across the water."

Chapter 9: The Encryption Key (CH_CL_09)

Story Development: Pushing up the steep ridge overlooking the city to secure the master cipher hardware before closing the district.  
MD

House Schedule:

House 1: Active (CL_C09_H01)

House 4: Active (CL_C09_H04)

House 7: Silent

House 9: Active (CL_C09_H09) — Mandatory Job Briefing  
MD

House 10: Silent

House 13: Active (CL_C09_H13) — Reactive Eligible

House 15: Duo Celebration (CL_C09_H15)  
MD

Fixed Pre-House Dialogue

CL_C09_H01 (House 1)

Panel 1 | Switch: "Steep incline on this ridge. Measure your stride on the walkways and don't stall in the halls."

Panel 2 | Mags: "From up here, our repeaters look like a constellation across the roofs."

CL_C09_H04 (House 4)

Panel 1 | Switch: "Three houses cleared. Footing is solid."

Panel 2 | Mags: "Every signal across Duskport is routing through our grid now."

CL_C09_H13 (House 13)

Panel 1 (Fixed Progress) | Switch: "Three houses remain. Finish the ridge run and bring it home."

Reactive Slot: Sentence 1 ("Three houses remain.") may be replaced by an eligible Switch variant.

Eligible Bank IDs: All Chapter 1–8 Switch IDs.

Neutral Fallback ID: CL_SWT_NEUT_07.

House 9 Special Job (CL_C09_H09)

Item in Violet Case: Hardware Security Cryptographic Module.  
MD

Network Reason: Switch needs a dedicated hardware cipher chip to lock Crossline’s master network with military-grade rolling encryption.

Panel 1 | Mags: "Door 9. In the violet case is a tamper-proof cryptographic module. Carry both the case and the stash to the getaway car."  
MD
+ 1

Panel 2 | Switch: "Hardware-level AES-256 encryption. Once that module is seated in our primary server, nobody intercepts our courier lines."

Panel 3 | Mags: "Not even the city dispatchers with their expensive monitors. Bring it home clean, runner!"  
MD

Duo Celebration (CL_C09_H15)

Panel 1 | Switch: "One hundred and thirty-five stashes cleared. Granite Ridge is secure and our entire grid is encrypted."  
MD

Panel 2 | Mags: "The line is completely dark to outsiders. Only Crossline talks on these streets now."

Chapter 10: Master Carrier (CH_CL_10)

Story Development: Crossline sweeps the city center plaza, sealing their campaign claim over Duskport before setting up operations for the regional transit line.  
MD

House Schedule:

House 1: Active (CL_C10_H01)

House 4: Active (CL_C10_H04) — Tease Slot

House 7: Silent

House 9: Active (CL_C10_H09) — Mandatory Job Briefing  
MD

House 10: Active (CL_C10_H10) — Reactive Eligible

House 13: Active (CL_C10_H13)

House 15: Duo Celebration (CL_C10_H15)  
MD

Fixed Pre-House Dialogue

CL_C10_H01 (House 1)

Panel 1 | Switch: "Central plaza. Fifteen doors between us and locking down the complete Duskport courier network."  
MD

Panel 2 | Mags: "Every repeater is synced and waiting. Let’s finish the map."

CL_C10_H04 (House 4)

Panel 1 | Switch: "Three houses cleared. Lane discipline is holding."

Panel 2 (Tease) | Switch: "Mags will need you at house 9. She won't explain it over the open channel, but she’ll brief you before you go in."  
MD

CL_C10_H10 (House 10)

Panel 1 (Fixed Progress) | Switch: "Six houses remain in Duskport. Leave nothing on the table."

Reactive Slot: Sentence 1 ("Six houses remain in Duskport.") may be replaced by an eligible Switch variant.

Eligible Bank IDs: All Chapter 1–9 Switch IDs.

Neutral Fallback ID: CL_SWT_NEUT_08.

CL_C10_H13 (House 13)

Panel 1 | Mags: "Three houses remain on the city grid. Run your line straight to the curb."

House 9 Special Job (CL_C10_H09)

Item in Violet Case: Antique Dual-Gong Telephone Ringer.  
MD

Network Reason: Mags wants a loud physical brass bell that violently rings in the Map Room every time Switch gives an overly analytical route brief.

Panel 1 | Mags: "Door 9. In the violet case is a heavy brass telephone ringer. Grab that case and the stash—both pickups are mandatory."  
MD
+ 1

Panel 2 | Switch: "An analog telephone ringer? Mags, we run a digital fiber and microwave grid."

Panel 3 | Mags: "Yeah, and I'm wiring it directly to your desk so it clangs in your ear every time you spend ten minutes analyzing five seconds of running! Bring the case!"  
MD

Duo Celebration (CL_C10_H15)

Panel 1 | Switch: "One hundred and fifty houses logged. The Duskport campaign grid is completely owned and secured under Crossline."  
MD
+ 1

Panel 2 | Mags: "(Clangs the brass ringer) That’s the sound of a closed circuit and zero dropped packets."

Panel 3 | Switch: "Pack the mobile terminal. Auntie Ro confirmed the transit line across the water is live. Next stop: Copper Bay."  
MD
+ 1

4. Complete Reactive Dialogue Bank (96 Lines)
Category: ZERO_DEATHS
Switch

CL_SWT_ZDEATH_01 | ZERO_DEATHS | Switch | Min Chapter: 1

"Zero dropped runs on this stretch. Your route execution has been completely continuous."

CL_SWT_ZDEATH_02 | ZERO_DEATHS | Switch | Min Chapter: 1

"Haven't lost you once on this block. Keep your lane discipline steady through the next door."

CL_SWT_ZDEATH_03 | ZERO_DEATHS | Switch | Min Chapter: 1

"No failed attempts logged. Stay sharp on your entry angles; don't give them a seam."

CL_SWT_ZDEATH_04 | ZERO_DEATHS | Switch | Min Chapter: 1

"You've stayed upright across this whole avenue. Keep that exact trajectory to the curb."

CL_SWT_ZDEATH_05 | ZERO_DEATHS | Switch | Min Chapter: 1

"Zero extractions missed so far. That’s the kind of route efficiency Crossline relies on."

CL_SWT_ZDEATH_06 | ZERO_DEATHS | Switch | Min Chapter: 2

"Still running without a wipeout. If you finish this clean, Mags might let you hear the crystal radio."

Mags

CL_MAG_ZDEATH_01 | ZERO_DEATHS | Mags | Min Chapter: 1

"Not a single dropped bag on the board. The precinct radio is quiet and my screen is clean."

CL_MAG_ZDEATH_02 | ZERO_DEATHS | Mags | Min Chapter: 1

"Still in one piece across this whole street. Keep moving like that and we wrap early."

CL_MAG_ZDEATH_03 | ZERO_DEATHS | Mags | Min Chapter: 1

"Zero wipeouts so far. Don't get careless just because nobody's clipped your heels yet."

CL_MAG_ZDEATH_04 | ZERO_DEATHS | Mags | Min Chapter: 1

"You haven't hit the pavement once today. That keeps my pulse under two hundred, thanks."

CL_MAG_ZDEATH_05 | ZERO_DEATHS | Mags | Min Chapter: 4

"Zero drops logged. Even Switch’s finned heat sinks haven't broken a sweat tracking you."

CL_MAG_ZDEATH_06 | ZERO_DEATHS | Mags | Min Chapter: 2

"Still standing without a reset. That’s pure high-gain performance out there."

Category: FLAWLESS
Switch

CL_SWT_UNTOUCH_01 | FLAWLESS | Switch | Min Chapter: 1

"Zero bullet hits and zero drops. Your vector planning through those halls has been surgical."

CL_SWT_UNTOUCH_02 | FLAWLESS | Switch | Min Chapter: 1

"Not a scratch on your jacket and no missed extractions. Keep maintaining that buffer zone."

CL_SWT_UNTOUCH_03 | FLAWLESS | Switch | Min Chapter: 1

"Untouched by gunfire and completely upright. Maintain those exact exit trajectories."

CL_SWT_UNTOUCH_04 | FLAWLESS | Switch | Min Chapter: 1

"Clean movement on every clear so far. You're giving the defender zero firing angles."

CL_SWT_UNTOUCH_05 | FLAWLESS | Switch | Min Chapter: 1

"Zero hits taken and no wipeouts. Keep your transitions tight and don't linger at the threshold."

CL_SWT_UNTOUCH_06 | FLAWLESS | Switch | Min Chapter: 1

"Not a bullet near you and zero drops. That’s textbook route discipline."

Mags

CL_MAG_UNTOUCH_01 | FLAWLESS | Mags | Min Chapter: 1

"Not a single bullet touched you and you haven't hit the deck. Clean as a fresh copper trace."

CL_MAG_UNTOUCH_02 | FLAWLESS | Mags | Min Chapter: 1

"Zero lead caught and zero drops. You're slipping past them like radio waves through glass."

CL_MAG_UNTOUCH_03 | FLAWLESS | Mags | Min Chapter: 1

"Clean jacket, zero wipeouts. Keep running like that and I won't have to patch your comm wire."

CL_MAG_UNTOUCH_04 | FLAWLESS | Mags | Min Chapter: 1

"You haven't caught a bullet or taken a fall yet. Let's see you close out the block that way."

CL_MAG_UNTOUCH_05 | FLAWLESS | Mags | Min Chapter: 1

"Untouched by gunfire and still on your feet. That makes my job on the headset easy."

CL_MAG_UNTOUCH_06 | FLAWLESS | Mags | Min Chapter: 8

"Zero hits, zero drops. You're cutting through corridors as clean as our canal laser."

Category: COMEBACK
Switch

CL_SWT_COMEBACK_01 | COMEBACK | Switch | Min Chapter: 1

"You took multiple hits earlier, but you adjusted your vectors. Keep your spatial focus."

CL_SWT_COMEBACK_02 | COMEBACK | Switch | Min Chapter: 1

"Several failed attempts behind you, but you re-established the line. Stay locked in."

CL_SWT_COMEBACK_03 | COMEBACK | Switch | Min Chapter: 1

"Rough approach angles back there, but you recovered the route. Keep moving to the car."

CL_SWT_COMEBACK_04 | COMEBACK | Switch | Min Chapter: 1

"Multiple drops on this block, but you found the exit lane. Execute cleanly on this next door."

CL_SWT_COMEBACK_05 | COMEBACK | Switch | Min Chapter: 1

"You’ve had to reset your route several times today. What matters is the line is moving again."

CL_SWT_COMEBACK_06 | COMEBACK | Switch | Min Chapter: 4

"Took some hard hits on earlier doors. Take a breath—even our Map Room terminal needed cooling."

Mags

CL_MAG_COMEBACK_01 | COMEBACK | Mags | Min Chapter: 1

"Took multiple spills on this street, but you bounced right back. Circuit stayed closed."

CL_MAG_COMEBACK_02 | COMEBACK | Mags | Min Chapter: 1

"A few rough attempts back there, but you pulled through. Shake the dust off your knees."

CL_MAG_COMEBACK_03 | COMEBACK | Mags | Min Chapter: 1

"You took some hits today, but you didn't drop the line. I like a runner who doesn't panic."

CL_MAG_COMEBACK_04 | COMEBACK | Mags | Min Chapter: 1

"Plenty of dropped runs behind you, but you're still sprinting. Eyes on the prize, runner."

CL_MAG_COMEBACK_05 | COMEBACK | Mags | Min Chapter: 1

"More than a couple bad landings today. Grab the next bag and leave those wiped attempts behind."

CL_MAG_COMEBACK_06 | COMEBACK | Mags | Min Chapter: 7

"Took some serious bruises and you're still walking. You've got more resilience than our backup power bank."

Category: NO_POWERS
Switch

CL_SWT_NOPOW_01 | NO_POWERS | Switch | Min Chapter: 1

"Zero powers activated on your clears. You're navigating purely on positioning and pace."

CL_SWT_NOPOW_02 | NO_POWERS | Switch | Min Chapter: 1

"Running unassisted without tapping any powers. Good spatial discipline in those rooms."

CL_SWT_NOPOW_03 | NO_POWERS | Switch | Min Chapter: 1

"Haven't leaned on a single power yet. Keep that natural line moving straight to the car."

CL_SWT_NOPOW_04 | NO_POWERS | Switch | Min Chapter: 1

"No power usage on those extractions. Pure geometry and clean movement to the threshold."

CL_SWT_NOPOW_05 | NO_POWERS | Switch | Min Chapter: 1

"Bringing stashes in without activating powers. Trust your angles and keep running."

CL_SWT_NOPOW_06 | NO_POWERS | Switch | Min Chapter: 1

"Zero powers used on those clears. Crisp, unassisted legwork across every hallway."

Mags

CL_MAG_NOPOW_01 | NO_POWERS | Mags | Min Chapter: 1

"Haven't popped a single power yet. Pure legwork. You really like running analog."

CL_MAG_NOPOW_02 | NO_POWERS | Mags | Min Chapter: 1

"Zero powers triggered so far. Just old-school sprinting. I can appreciate the hustle."

CL_MAG_NOPOW_03 | NO_POWERS | Mags | Min Chapter: 1

"Haven't touched a power once on this avenue. Doing it the hard way keeps your senses sharp."

CL_MAG_NOPOW_04 | NO_POWERS | Mags | Min Chapter: 1

"Hauling bags out without leaning on powers. If you like the extra sweat, keep at it."

CL_MAG_NOPOW_05 | NO_POWERS | Mags | Min Chapter: 1

"Running completely unassisted. Works like a passive crystal radio—no extra power required."

CL_MAG_NOPOW_06 | NO_POWERS | Mags | Min Chapter: 1

"No powers burned across those clears. Pure raw hustle from the porch to the trunk."

Category: BUNK_BAGS
Switch

CL_SWT_BUNK_01 | BUNK_BAGS | Switch | Min Chapter: 1

"You triggered multiple bunk bags before securing the stash. Verify your target before committing."

CL_SWT_BUNK_02 | BUNK_BAGS | Switch | Min Chapter: 1

"Touched a few false bags in those rooms. Keep your scanning deliberate and locate the true score."

CL_SWT_BUNK_03 | BUNK_BAGS | Switch | Min Chapter: 1

"Had a couple bunk bags dissolve on you. Don't let decoy targets pull you off your vector."

CL_SWT_BUNK_04 | BUNK_BAGS | Switch | Min Chapter: 1

"Popped multiple decoy bags on this stretch. Stay focused until your hands hit the actual stash."

CL_SWT_BUNK_05 | BUNK_BAGS | Switch | Min Chapter: 1

"A few empty bags touched along the way, but the stash reached the car. Tighten up your search."

CL_SWT_BUNK_06 | BUNK_BAGS | Switch | Min Chapter: 1

"Touching bunk bags is like chasing false signal reflections. Filter out the noise and grab the score."

Mags

CL_MAG_BUNK_01 | BUNK_BAGS | Mags | Min Chapter: 1

"Dissolved a few bunk bags in there. If you want useless decoys, come sift through Switch’s cable drawer."

CL_MAG_BUNK_02 | BUNK_BAGS | Mags | Min Chapter: 1

"Hit multiple false bags on this block. Good thing you tracked down the stash before leaving."

CL_MAG_BUNK_03 | BUNK_BAGS | Mags | Min Chapter: 1

"Had a couple fake bags pop on you today. Keep your eyes peeled so you find the real haul faster."

CL_MAG_BUNK_04 | BUNK_BAGS | Mags | Min Chapter: 1

"Triggered some empty bags earlier. Just keep moving until you touch the stash that counts."

CL_MAG_BUNK_05 | BUNK_BAGS | Mags | Min Chapter: 1

"Popped a few decoys today. Reminds me of tuning into ghost stations on a bad antenna."

CL_MAG_BUNK_06 | BUNK_BAGS | Mags | Min Chapter: 11

"Hit multiple bunk bags on this run. If I had my brass ringer here, I’d clang it for each one."

Category: POWER_PHASE
Switch

CL_SWT_PHASE_01 | POWER_PHASE | Switch | Min Chapter: 1

"Phase has been your primary tool this block. It cuts linear distance, just maintain your heading."

CL_SWT_PHASE_02 | POWER_PHASE | Switch | Min Chapter: 1

"You've been activating Phase more than your other powers. Keep your momentum ready when you exit."

CL_SWT_PHASE_03 | POWER_PHASE | Switch | Min Chapter: 1

"Leaning heavily on Phase today. It’s an efficient shortcut, as long as you keep moving forward."

CL_SWT_PHASE_04 | POWER_PHASE | Switch | Min Chapter: 1

"Triggering Phase frequently. Remember to commit to the sprint lane the second you're solid."

CL_SWT_PHASE_05 | POWER_PHASE | Switch | Min Chapter: 1

"Phase has been your dominant choice. It solves tight corners, but keep your eyes on the threshold."

CL_SWT_PHASE_06 | POWER_PHASE | Switch | Min Chapter: 1

"Using Phase like a direct conduit through the floor plan. Efficient, just don't get sloppy."

Mags

CL_MAG_PHASE_01 | POWER_PHASE | Mags | Min Chapter: 1

"Phase is leading your moves today. Ghosting through rooms looks fun, just keep your feet moving."

CL_MAG_PHASE_02 | POWER_PHASE | Mags | Min Chapter: 1

"You've leaned on Phase more than anything else. Beats looking for an open hallway, I admit."

CL_MAG_PHASE_03 | POWER_PHASE | Mags | Min Chapter: 1

"Lots of Phase activations logged. If only I could phase Switch’s extra monitors out the window."

CL_MAG_PHASE_04 | POWER_PHASE | Mags | Min Chapter: 1

"Phase is your go-to on this stretch. Slipping out of sight is neat, but you still have to sprint the curb."

CL_MAG_PHASE_05 | POWER_PHASE | Mags | Min Chapter: 1

"Triggering Phase more than anything else today. Handy trick, just watch where you're landing."

CL_MAG_PHASE_06 | POWER_PHASE | Mags | Min Chapter: 4

"Leaning on Phase again. If I could Phase through walls, I'd dodge Switch’s ten-minute route lectures."

Category: POWER_DASH
Switch

CL_SWT_DASH_01 | POWER_DASH | Switch | Min Chapter: 1

"Dash has been your dominant power this block. That burst closes distance fast; keep your lane square."

CL_SWT_DASH_02 | POWER_DASH | Switch | Min Chapter: 1

"Leaning on Dash more than the rest. Rapid linear acceleration, just stay in control at the exit."

CL_SWT_DASH_03 | POWER_DASH | Switch | Min Chapter: 1

"You've been triggering Dash quite a bit. Good burst velocity, just don't overrun your exit angle."

CL_SWT_DASH_04 | POWER_DASH | Switch | Min Chapter: 1

"Dash is leading your runs so far. Hitting that burst works, as long as your footing stays true."

CL_SWT_DASH_05 | POWER_DASH | Switch | Min Chapter: 1

"Using Dash more than anything else. Rapid pace helps, but keep your focus on the threshold."

CL_SWT_DASH_06 | POWER_DASH | Switch | Min Chapter: 1

"Dash has been your top tool today. Sudden acceleration works when you have an open line."

Mags

CL_MAG_DASH_01 | POWER_DASH | Mags | Min Chapter: 1

"Dash has been your favorite power on this street. You hit that burst like your shoes caught fire."

CL_MAG_DASH_02 | POWER_DASH | Mags | Min Chapter: 1

"Triggering Dash more than anything else. Fast lunge, just make sure you don't trip on the threshold."

CL_MAG_DASH_03 | POWER_DASH | Mags | Min Chapter: 1

"Leaning on Dash today. A quick punch of speed straight toward the stash works fine by me."

CL_MAG_DASH_04 | POWER_DASH | Mags | Min Chapter: 1

"Dash leads your choices so far. Rocketing forward is great, just keep both hands ready for the bag."

CL_MAG_DASH_05 | POWER_DASH | Mags | Min Chapter: 1

"You favor that Dash burst today. Fast legs don't mean much if you drop the stash, so hold on tight."

CL_MAG_DASH_06 | POWER_DASH | Mags | Min Chapter: 1

"Dash leads the board today. Move that fast in the Map Room and you’ll trip over Switch’s cables."

Category: POWER_DECOY
Switch

CL_SWT_DECOY_01 | POWER_DECOY | Switch | Min Chapter: 1

"Decoy is your go-to move this block. Splitting attention buys you time; keep your exit path open."

CL_SWT_DECOY_02 | POWER_DECOY | Switch | Min Chapter: 1

"You've been triggering Decoy more than your other powers. Tactical misdirection keeps your line clear."

CL_SWT_DECOY_03 | POWER_DECOY | Switch | Min Chapter: 1

"Leaning on Decoy today. Leaving a false signature behind works, as long as you maintain your sprint."

CL_SWT_DECOY_04 | POWER_DECOY | Switch | Min Chapter: 1

"Decoy leads your choices on this stretch. Giving them a secondary vector keeps your route clean."

CL_SWT_DECOY_05 | POWER_DECOY | Switch | Min Chapter: 1

"Popping Decoy more than the rest. Sound diversion, provided you don't hesitate at the doorway."

CL_SWT_DECOY_06 | POWER_DECOY | Switch | Min Chapter: 1

"You favor that Decoy power. Splitting the defender's focus gives you an open lane to the curb."

Mags

CL_MAG_DECOY_01 | POWER_DECOY | Mags | Min Chapter: 1

"Decoy has been your favorite power today. Dropping a holographic twin never gets old. Keep moving."

CL_MAG_DECOY_02 | POWER_DECOY | Mags | Min Chapter: 1

"Leaning on Decoy more than anything else. Like leaving a dummy radio broadcast to throw off the law."

CL_MAG_DECOY_03 | POWER_DECOY | Mags | Min Chapter: 1

"Lots of Decoy drops on this block. If I had a decoy back at the hub, I'd send it to listen to Switch."

CL_MAG_DECOY_04 | POWER_DECOY | Mags | Min Chapter: 1

"Decoy is leading your picks so far. Leaving a diversion behind while you grab the stash is pure hustle."

CL_MAG_DECOY_05 | POWER_DECOY | Mags | Min Chapter: 1

"Dropping Decoys all over the hallway today. As long as you make for the car, I won't complain."

CL_MAG_DECOY_06 | POWER_DECOY | Mags | Min Chapter: 7

"Decoy leads your style this block. I wish I could drop a decoy to filter out Switch’s frequency charts."

5. Neutral Fallback Bank (16 Lines)

Universal lines for Switch and Mags that contain no hard-coded house counts, no assumptions of flawless runs, and function at any scheduled check-in slot.

Switch Fallbacks

CL_SWT_NEUT_01 | NEUTRAL_FALLBACK | Switch | Min Chapter: 1

"Keep your stride measured and your head down. Bring the next bag to the car."

CL_SWT_NEUT_02 | NEUTRAL_FALLBACK | Switch | Min Chapter: 1

"Next porch is waiting. Find the stash, take your corner, and sprint to the curb."

CL_SWT_NEUT_03 | NEUTRAL_FALLBACK | Switch | Min Chapter: 1

"Keep your weight centered and your boots moving. Don't linger once your hands touch the bag."

CL_SWT_NEUT_04 | NEUTRAL_FALLBACK | Switch | Min Chapter: 1

"Focus on the door right in front of you. One clear at a time puts Crossline on the map."

CL_SWT_NEUT_05 | NEUTRAL_FALLBACK | Switch | Min Chapter: 1

"Stay on the line and keep your eyes on the threshold. Get in and get out."

CL_SWT_NEUT_06 | NEUTRAL_FALLBACK | Switch | Min Chapter: 1

"Check your footing before you cross that porch. Crossline needs every bag accounted for."

CL_SWT_NEUT_07 | NEUTRAL_FALLBACK | Switch | Min Chapter: 1

"Don't let up now. Grab the bag, make your turn, and haul it out to the getaway car."

CL_SWT_NEUT_08 | NEUTRAL_FALLBACK | Switch | Min Chapter: 1

"Another door, another haul. Keep pulling bags and we'll have this avenue locked down."

Mags Fallbacks

CL_MAG_NEUT_01 | NEUTRAL_FALLBACK | Mags | Min Chapter: 1

"Keep your boots moving. The getaway car is idling at the curb waiting for that stash."

CL_MAG_NEUT_02 | NEUTRAL_FALLBACK | Mags | Min Chapter: 1

"Another house on the block. Grab the bag clean and don't trip over the doormat."

CL_MAG_NEUT_03 | NEUTRAL_FALLBACK | Mags | Min Chapter: 1

"The car is idling and the street is clear. Scoop the stash and bring it to the curb."

CL_MAG_NEUT_04 | NEUTRAL_FALLBACK | Mags | Min Chapter: 1

"Step up to the door, find the goods, and hit the pavement. Let's keep moving."

CL_MAG_NEUT_05 | NEUTRAL_FALLBACK | Mags | Min Chapter: 1

"Keep pulling bags. The sooner we clear these houses, the sooner I get back to my workbench."

CL_MAG_NEUT_06 | NEUTRAL_FALLBACK | Mags | Min Chapter: 1

"Keep your line moving forward. Don't get tangled up inside; grab the stash and go."

CL_MAG_NEUT_07 | NEUTRAL_FALLBACK | Mags | Min Chapter: 1

"Another porch ready to crack. Keep your hands ready and your sprint straight to the car."

CL_MAG_NEUT_08 | NEUTRAL_FALLBACK | Mags | Min Chapter: 1

"Stay on task out there. Scoop the stash and let’s keep the tally rolling."

6. Continuity Restrictions and Implementation Requirements
1-Based Chapter Continuity Gates

Narrative callbacks must strictly respect story progression flags. A line referencing a secured hardware item may only trigger if the block awarding that item has been fully cleared:  
MD

minChapter: 2: Crystal Radio Receiver secured in Chapter 2.  
MD

minChapter: 4: Aluminum Heat-Sink Array secured in Chapter 4.  
MD

minChapter: 7: Microwave Cavity Notch Filter secured in Chapter 7.  
MD

minChapter: 8: Canal Directional Laser secured in Chapter 8.  
MD

minChapter: 11: Antique Brass Telephone Ringer secured in Chapter 10 (valid only in continuation runs or City 2).  
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

Crossline campaign story chapters apply exclusively to Run the Block (Journey mode).  
MD

Block Rivals, Daily Challenge, and Tutorial runs remain isolated from crew story states and must never trigger contact consultation panels or special item drops.  
MD
+ 1

DevTools Console Downloader: CROSSLINE_SEASON_1.md

Paste this snippet into your browser console (F12 → Console) to download this exact file directly without copying text:

JavaScript
(() => {
  const header = '# CROSSLINE_SEASON_1.md';
  const candidateElements = Array.from(document.querySelectorAll('div, article, section, pre'));
  const matching = candidateElements
    .map(el => el.innerText || '')
    .filter(text => text.includes(header));

  if (!matching.length) {
    console.error('[Error] Could not find content for CROSSLINE_SEASON_1.md in this tab.');
    return;
  }

  const rawContent = matching.reduce((a, b) => (a.length > b.length ? a : b));
  const cleanContent = rawContent.substring(rawContent.indexOf(header));

  const blob = new Blob([cleanContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'CROSSLINE_SEASON_1.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log('[Success] CROSSLINE_SEASON_1.md downloaded successfully.');
})();





Flash
Extended

Gemini is AI and can make mistakes.