// Season 1 normalized from CROSSLINE_SEASON_1.md. Manuscript prompts/citation/downloader debris are not runtime instructions.
// Import-free narrative data; no progression, rewards, maze mutations or RNG.
export const CROSSLINE_CHAPTERS = Object.freeze([
  {
    "number": 1,
    "title": "Signal Lock",
    "jobName": "High-Gain Yagi Directional Antenna",
    "reason": "Mags needs a directional antenna to monitor harbor dispatch; Switch thinks it looks like scrap aluminum.",
    "short": "YAGI ANTENNA",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "switch",
            "text": "First porch of the campaign. Find the stash, keep your corners clean, and make a straight line for the getaway car."
          },
          {
            "speaker": "mags",
            "text": "I've got the radio tuned to the neighborhood band. Move fast and don't make me listen to dead air."
          }
        ],
        "reactive": false
      },
      "4": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "switch",
            "text": "Mags will need you at house 9. She’ll brief you before you take that entrance. For now, keep pulling bags."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Door 9. Inside is a violet case holding a high-gain Yagi antenna. Carry both the case and the stash to the getaway car to clear the door."
          },
          {
            "speaker": "switch",
            "text": "That aluminum frame looks like a collapsed drying rack. We're setting up a communications grid, Mags."
          },
          {
            "speaker": "mags",
            "text": "It pulls sixteen decibels of clean gain, Switch. Grab the case and the bag, runner—both come out."
          }
        ],
        "reactive": false
      },
      "10": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Six houses remain on this avenue. Maintain your lane and finish the run."
          }
        ],
        "reactive": true,
        "fallback": "CL_SWT_NEUT_01",
        "eligibleIDs": [
          "CL_SWT_ZDEATH_01",
          "CL_SWT_ZDEATH_02",
          "CL_SWT_ZDEATH_03",
          "CL_SWT_ZDEATH_04",
          "CL_SWT_ZDEATH_05",
          "CL_SWT_UNTOUCH_01",
          "CL_SWT_UNTOUCH_02",
          "CL_SWT_UNTOUCH_03",
          "CL_SWT_UNTOUCH_04",
          "CL_SWT_UNTOUCH_05",
          "CL_SWT_UNTOUCH_06",
          "CL_SWT_COMEBACK_01",
          "CL_SWT_COMEBACK_02",
          "CL_SWT_COMEBACK_03",
          "CL_SWT_COMEBACK_04",
          "CL_SWT_COMEBACK_05",
          "CL_SWT_NOPOW_01",
          "CL_SWT_NOPOW_02",
          "CL_SWT_NOPOW_03",
          "CL_SWT_NOPOW_04",
          "CL_SWT_NOPOW_05",
          "CL_SWT_NOPOW_06",
          "CL_SWT_BUNK_01",
          "CL_SWT_BUNK_02",
          "CL_SWT_BUNK_03",
          "CL_SWT_BUNK_04",
          "CL_SWT_BUNK_05",
          "CL_SWT_BUNK_06",
          "CL_SWT_PHASE_01",
          "CL_SWT_PHASE_02",
          "CL_SWT_PHASE_03",
          "CL_SWT_PHASE_04",
          "CL_SWT_PHASE_05",
          "CL_SWT_PHASE_06",
          "CL_SWT_DASH_01",
          "CL_SWT_DASH_02",
          "CL_SWT_DASH_03",
          "CL_SWT_DASH_04",
          "CL_SWT_DASH_05",
          "CL_SWT_DECOY_01",
          "CL_SWT_DECOY_02",
          "CL_SWT_DECOY_03",
          "CL_SWT_DECOY_04",
          "CL_SWT_DECOY_05",
          "CL_SWT_DECOY_06"
        ]
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "Fifteen doors cleared. The first fifteen stashes are recorded in Crossline's route log."
      },
      {
        "speaker": "mags",
        "text": "And the antenna is already bolted to the roof. Now we can hear what the precinct had for breakfast."
      }
    ]
  },
  {
    "number": 2,
    "title": "The Wire Sweep",
    "jobName": "Tuned Crystal Radio Receiver",
    "reason": "Mags needs an unpowered receiver that monitors dispatch frequencies without broadcasting a detectable local oscillator signal.",
    "short": "CRYSTAL RADIO",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Old telephone drops all along these fences. Watch the overhangs on your way out."
          },
          {
            "speaker": "switch",
            "text": "Ignore the wiring and focus on the exit threshold. Move the bags to the car."
          }
        ],
        "reactive": false
      },
      "7": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Six houses cleared. Keep bringing them out."
          },
          {
            "speaker": "mags",
            "text": "I’ll need you at house 9 for a hardware pickup. I’ll explain the piece before you enter. Stay on the move."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "House 9. In the violet case is an analog crystal receiver. Bring that case and the stash out to the street—both pickups are mandatory."
          },
          {
            "speaker": "switch",
            "text": "Zero RF leakage from a passive diode circuit. Smart pickup, Mags. Bring it home, runner."
          }
        ],
        "reactive": false
      },
      "13": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses remain. Commit to your line and finish this avenue."
          }
        ],
        "reactive": true,
        "fallback": "CL_SWT_NEUT_02",
        "eligibleIDs": [
          "CL_SWT_ZDEATH_01",
          "CL_SWT_ZDEATH_02",
          "CL_SWT_ZDEATH_03",
          "CL_SWT_ZDEATH_04",
          "CL_SWT_ZDEATH_05",
          "CL_SWT_ZDEATH_06",
          "CL_SWT_UNTOUCH_01",
          "CL_SWT_UNTOUCH_02",
          "CL_SWT_UNTOUCH_03",
          "CL_SWT_UNTOUCH_04",
          "CL_SWT_UNTOUCH_05",
          "CL_SWT_UNTOUCH_06",
          "CL_SWT_COMEBACK_01",
          "CL_SWT_COMEBACK_02",
          "CL_SWT_COMEBACK_03",
          "CL_SWT_COMEBACK_04",
          "CL_SWT_COMEBACK_05",
          "CL_SWT_NOPOW_01",
          "CL_SWT_NOPOW_02",
          "CL_SWT_NOPOW_03",
          "CL_SWT_NOPOW_04",
          "CL_SWT_NOPOW_05",
          "CL_SWT_NOPOW_06",
          "CL_SWT_BUNK_01",
          "CL_SWT_BUNK_02",
          "CL_SWT_BUNK_03",
          "CL_SWT_BUNK_04",
          "CL_SWT_BUNK_05",
          "CL_SWT_BUNK_06",
          "CL_SWT_PHASE_01",
          "CL_SWT_PHASE_02",
          "CL_SWT_PHASE_03",
          "CL_SWT_PHASE_04",
          "CL_SWT_PHASE_05",
          "CL_SWT_PHASE_06",
          "CL_SWT_DASH_01",
          "CL_SWT_DASH_02",
          "CL_SWT_DASH_03",
          "CL_SWT_DASH_04",
          "CL_SWT_DASH_05",
          "CL_SWT_DECOY_01",
          "CL_SWT_DECOY_02",
          "CL_SWT_DECOY_03",
          "CL_SWT_DECOY_04",
          "CL_SWT_DECOY_05",
          "CL_SWT_DECOY_06"
        ]
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "Thirty total stashes logged for Crossline. Our route map is expanding across the southern grid."
      },
      {
        "speaker": "mags",
        "text": "That passive crystal set is pulling clear dispatch audio. Nobody even knows we're listening."
      }
    ]
  },
  {
    "number": 3,
    "title": "High Impedance",
    "jobName": "Shielded Coaxial Cable Spool",
    "reason": "Switch demands fifty-ohm double-shielded cable so ping times don't spike across relays; Mags complains about carrying it.",
    "short": "COAX SPOOL",
    "beats": {
      "4": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "switch",
            "text": "Mags will need a pickup at house 9. She’ll detail the item before that door. Keep moving."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Target house. The violet case holds a heavy spool of double-shielded coax. Both the case and the stash must reach the car."
          },
          {
            "speaker": "switch",
            "text": "Zero signal drop, pure copper braiding. Grab it so we stop losing data packets across the avenue."
          },
          {
            "speaker": "mags",
            "text": "It weighs twenty pounds, Switch! Runner, don't drop it on your toes on the way out."
          }
        ],
        "reactive": false
      },
      "10": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Six houses remain. Stride it out and keep the rhythm steady."
          }
        ],
        "reactive": true,
        "fallback": "CL_MAG_NEUT_01",
        "eligibleIDs": [
          "CL_MAG_ZDEATH_01",
          "CL_MAG_ZDEATH_02",
          "CL_MAG_ZDEATH_03",
          "CL_MAG_ZDEATH_04",
          "CL_MAG_UNTOUCH_01",
          "CL_MAG_UNTOUCH_02",
          "CL_MAG_UNTOUCH_03",
          "CL_MAG_UNTOUCH_04",
          "CL_MAG_UNTOUCH_05",
          "CL_MAG_COMEBACK_01",
          "CL_MAG_COMEBACK_02",
          "CL_MAG_COMEBACK_03",
          "CL_MAG_COMEBACK_04",
          "CL_MAG_COMEBACK_05",
          "CL_MAG_NOPOW_01",
          "CL_MAG_NOPOW_02",
          "CL_MAG_NOPOW_03",
          "CL_MAG_NOPOW_04",
          "CL_MAG_NOPOW_05",
          "CL_MAG_BUNK_01",
          "CL_MAG_BUNK_02",
          "CL_MAG_BUNK_03",
          "CL_MAG_BUNK_04",
          "CL_MAG_BUNK_05",
          "CL_MAG_PHASE_01",
          "CL_MAG_PHASE_02",
          "CL_MAG_PHASE_03",
          "CL_MAG_PHASE_04",
          "CL_MAG_PHASE_05",
          "CL_MAG_DASH_01",
          "CL_MAG_DASH_02",
          "CL_MAG_DASH_03",
          "CL_MAG_DASH_04",
          "CL_MAG_DASH_05",
          "CL_MAG_DASH_06",
          "CL_MAG_DECOY_01",
          "CL_MAG_DECOY_02",
          "CL_MAG_DECOY_03",
          "CL_MAG_DECOY_04",
          "CL_MAG_DECOY_05"
        ]
      },
      "13": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses left. Close this commercial line."
          }
        ],
        "reactive": false
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "Forty-five houses logged for Crossline. Our packet latency dropped by forty milliseconds across this block."
      },
      {
        "speaker": "mags",
        "text": "Great. Now Switch can be disappointed in our split times forty milliseconds faster."
      }
    ]
  },
  {
    "number": 4,
    "title": "Hot Transistors",
    "jobName": "Extruded Aluminum Heat-Sink Array",
    "reason": "The receiver bank in Switch’s Map Room is thermal-throttling; Mags claims Switch just runs too many CRT monitors.",
    "short": "HEAT SINKS",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "mags",
            "text": "The air out here smells like hot circuit boards and ozone."
          },
          {
            "speaker": "switch",
            "text": "Because our repeaters are working double-time. Clear the porches and keep the route open."
          }
        ],
        "reactive": false
      },
      "7": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Six houses cleared. Keep bringing them out."
          },
          {
            "speaker": "mags",
            "text": "I’ll need you at house 9. The Map Room is cooking like an oven, so I found cooling hardware. I'll brief you before you go in."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Door 9. In the violet case is a finned aluminum heat-sink array. You need both the case and the stash in the trunk before the car pulls away."
          },
          {
            "speaker": "switch",
            "text": "Passive heat dissipation. That keeps our main receiver from melting down during peak hours."
          },
          {
            "speaker": "mags",
            "text": "Or you could turn off three of your six tactical monitors, Switch. Grab the case, runner!"
          }
        ],
        "reactive": false
      },
      "13": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses remain. Don't lose your focus on the home stretch."
          }
        ],
        "reactive": true,
        "fallback": "CL_SWT_NEUT_03",
        "eligibleIDs": [
          "CL_SWT_ZDEATH_01",
          "CL_SWT_ZDEATH_02",
          "CL_SWT_ZDEATH_03",
          "CL_SWT_ZDEATH_04",
          "CL_SWT_ZDEATH_05",
          "CL_SWT_ZDEATH_06",
          "CL_SWT_UNTOUCH_01",
          "CL_SWT_UNTOUCH_02",
          "CL_SWT_UNTOUCH_03",
          "CL_SWT_UNTOUCH_04",
          "CL_SWT_UNTOUCH_05",
          "CL_SWT_UNTOUCH_06",
          "CL_SWT_COMEBACK_01",
          "CL_SWT_COMEBACK_02",
          "CL_SWT_COMEBACK_03",
          "CL_SWT_COMEBACK_04",
          "CL_SWT_COMEBACK_05",
          "CL_SWT_NOPOW_01",
          "CL_SWT_NOPOW_02",
          "CL_SWT_NOPOW_03",
          "CL_SWT_NOPOW_04",
          "CL_SWT_NOPOW_05",
          "CL_SWT_NOPOW_06",
          "CL_SWT_BUNK_01",
          "CL_SWT_BUNK_02",
          "CL_SWT_BUNK_03",
          "CL_SWT_BUNK_04",
          "CL_SWT_BUNK_05",
          "CL_SWT_BUNK_06",
          "CL_SWT_PHASE_01",
          "CL_SWT_PHASE_02",
          "CL_SWT_PHASE_03",
          "CL_SWT_PHASE_04",
          "CL_SWT_PHASE_05",
          "CL_SWT_PHASE_06",
          "CL_SWT_DASH_01",
          "CL_SWT_DASH_02",
          "CL_SWT_DASH_03",
          "CL_SWT_DASH_04",
          "CL_SWT_DASH_05",
          "CL_SWT_DECOY_01",
          "CL_SWT_DECOY_02",
          "CL_SWT_DECOY_03",
          "CL_SWT_DECOY_04",
          "CL_SWT_DECOY_05",
          "CL_SWT_DECOY_06"
        ]
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "Sixty doors cleared in {city}. The southern network hub is stable and running cool."
      },
      {
        "speaker": "mags",
        "text": "Heat sinks are mounted. The Map Room dropped ten degrees—now it only smells like lukewarm solder."
      }
    ]
  },
  {
    "number": 5,
    "title": "Spectrum Map",
    "jobName": "Portable Spectrum Analyzer Module",
    "reason": "Switch needs to identify rogue frequency spikes distorting courier tracking across the central avenues.",
    "short": "SPECTRUM UNIT",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Wide walkways along this residential stretch. Plan your approach, grab the stash, and head straight out."
          },
          {
            "speaker": "mags",
            "text": "Watch the gravel paths. Keep your steps light."
          }
        ],
        "reactive": false
      },
      "4": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "switch",
            "text": "Mags will need a hand at house 9. She’ll detail the diagnostic unit before that entrance. Stay on task."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "House 9. Inside the violet case is a handheld spectrum analyzer. You must bring that case along with the stash to extract."
          },
          {
            "speaker": "switch",
            "text": "That unit sweeps from ten megahertz to three gigahertz. We can finally pin down where the background interference is coming from."
          },
          {
            "speaker": "mags",
            "text": "Spoiler alert: it’s coming from Afterlight blasting subwoofers three blocks over. Grab the case!"
          }
        ],
        "reactive": false
      },
      "10": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Six houses remain. Keep your stride measured all the way to the car."
          }
        ],
        "reactive": true,
        "fallback": "CL_SWT_NEUT_04",
        "eligibleIDs": [
          "CL_SWT_ZDEATH_01",
          "CL_SWT_ZDEATH_02",
          "CL_SWT_ZDEATH_03",
          "CL_SWT_ZDEATH_04",
          "CL_SWT_ZDEATH_05",
          "CL_SWT_ZDEATH_06",
          "CL_SWT_UNTOUCH_01",
          "CL_SWT_UNTOUCH_02",
          "CL_SWT_UNTOUCH_03",
          "CL_SWT_UNTOUCH_04",
          "CL_SWT_UNTOUCH_05",
          "CL_SWT_UNTOUCH_06",
          "CL_SWT_COMEBACK_01",
          "CL_SWT_COMEBACK_02",
          "CL_SWT_COMEBACK_03",
          "CL_SWT_COMEBACK_04",
          "CL_SWT_COMEBACK_05",
          "CL_SWT_NOPOW_01",
          "CL_SWT_NOPOW_02",
          "CL_SWT_NOPOW_03",
          "CL_SWT_NOPOW_04",
          "CL_SWT_NOPOW_05",
          "CL_SWT_NOPOW_06",
          "CL_SWT_BUNK_01",
          "CL_SWT_BUNK_02",
          "CL_SWT_BUNK_03",
          "CL_SWT_BUNK_04",
          "CL_SWT_BUNK_05",
          "CL_SWT_BUNK_06",
          "CL_SWT_PHASE_01",
          "CL_SWT_PHASE_02",
          "CL_SWT_PHASE_03",
          "CL_SWT_PHASE_04",
          "CL_SWT_PHASE_05",
          "CL_SWT_PHASE_06",
          "CL_SWT_DASH_01",
          "CL_SWT_DASH_02",
          "CL_SWT_DASH_03",
          "CL_SWT_DASH_04",
          "CL_SWT_DASH_05",
          "CL_SWT_DECOY_01",
          "CL_SWT_DECOY_02",
          "CL_SWT_DECOY_03",
          "CL_SWT_DECOY_04",
          "CL_SWT_DECOY_05",
          "CL_SWT_DECOY_06"
        ]
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "Halfway through {city}. Seventy-five stashes logged on Crossline's board."
      },
      {
        "speaker": "mags",
        "text": "Spectrum sweep is complete. We've mapped every clean frequency from here to the harbor."
      }
    ]
  },
  {
    "number": 6,
    "title": "Brownout Buffer",
    "jobName": "Ultracapacitor Backup Pack",
    "reason": "Prevents rooftop signal repeaters from rebooting during neighborhood power drops; Switch points out it barely powers a desk lamp.",
    "short": "BACKUP PACK",
    "beats": {
      "4": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Streetlights are flickering along this line. Grid voltage is sagging."
          },
          {
            "speaker": "switch",
            "text": "Our runs don't depend on streetlights. Find the door, take the bag, and sprint out."
          }
        ],
        "reactive": false
      },
      "7": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Six houses cleared. Keep bringing them out."
          },
          {
            "speaker": "mags",
            "text": "I’ll need you at house 9 for a power cell pickup. I’ll explain before that door. Keep pulling bags."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Door 9. In the violet case is an ultracapacitor backup bank. Both the case and the stash must reach the car."
          },
          {
            "speaker": "switch",
            "text": "Instant discharge, zero cycle degradation. If the city grid hiccups, our repeaters won't lose sync."
          },
          {
            "speaker": "mags",
            "text": "It holds about enough juice to run your coffee maker for four seconds, Switch. Bring it to the car, runner!"
          }
        ],
        "reactive": false
      },
      "13": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses remain. Finish strong through the dark stretch."
          }
        ],
        "reactive": true,
        "fallback": "CL_SWT_NEUT_05",
        "eligibleIDs": [
          "CL_SWT_ZDEATH_01",
          "CL_SWT_ZDEATH_02",
          "CL_SWT_ZDEATH_03",
          "CL_SWT_ZDEATH_04",
          "CL_SWT_ZDEATH_05",
          "CL_SWT_ZDEATH_06",
          "CL_SWT_UNTOUCH_01",
          "CL_SWT_UNTOUCH_02",
          "CL_SWT_UNTOUCH_03",
          "CL_SWT_UNTOUCH_04",
          "CL_SWT_UNTOUCH_05",
          "CL_SWT_UNTOUCH_06",
          "CL_SWT_COMEBACK_01",
          "CL_SWT_COMEBACK_02",
          "CL_SWT_COMEBACK_03",
          "CL_SWT_COMEBACK_04",
          "CL_SWT_COMEBACK_05",
          "CL_SWT_NOPOW_01",
          "CL_SWT_NOPOW_02",
          "CL_SWT_NOPOW_03",
          "CL_SWT_NOPOW_04",
          "CL_SWT_NOPOW_05",
          "CL_SWT_NOPOW_06",
          "CL_SWT_BUNK_01",
          "CL_SWT_BUNK_02",
          "CL_SWT_BUNK_03",
          "CL_SWT_BUNK_04",
          "CL_SWT_BUNK_05",
          "CL_SWT_BUNK_06",
          "CL_SWT_PHASE_01",
          "CL_SWT_PHASE_02",
          "CL_SWT_PHASE_03",
          "CL_SWT_PHASE_04",
          "CL_SWT_PHASE_05",
          "CL_SWT_PHASE_06",
          "CL_SWT_DASH_01",
          "CL_SWT_DASH_02",
          "CL_SWT_DASH_03",
          "CL_SWT_DASH_04",
          "CL_SWT_DASH_05",
          "CL_SWT_DECOY_01",
          "CL_SWT_DECOY_02",
          "CL_SWT_DECOY_03",
          "CL_SWT_DECOY_04",
          "CL_SWT_DECOY_05",
          "CL_SWT_DECOY_06"
        ]
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "Ninety houses down in our campaign ledger. Brownout corridor is locked into our network."
      },
      {
        "speaker": "mags",
        "text": "Capacitors are wired. Even if {city} loses power completely, Crossline stays talking."
      }
    ]
  },
  {
    "number": 7,
    "title": "Noise Baffle",
    "jobName": "Microwave Cavity Notch Filter",
    "reason": "Mags wants a sharp filter notch to mute noise from Iron Row's garage welders and Afterlight's transmitters; Switch says they don't sabotage, they isolate.",
    "short": "NOTCH FILTER",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Gravel and track beds along this block. Watch your balance on the porch stairs and head straight for the curb."
          },
          {
            "speaker": "mags",
            "text": "Lots of stray radio chatter echoing off the rail cars. Stay sharp."
          }
        ],
        "reactive": false
      },
      "4": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "switch",
            "text": "Mags will need you at house 9. She has a countermeasure unit scoped out. She’ll brief you before you enter."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "House 9. In the violet case is a silver cavity notch filter. Both pickups—case and stash—are required to leave."
          },
          {
            "speaker": "switch",
            "text": "A fifty-decibel attenuation notch. We drop it right over the local interference frequency."
          },
          {
            "speaker": "mags",
            "text": "Which means Rook’s noisy garage radio gets completely scrubbed out of our comms. Get both items to the street!"
          }
        ],
        "reactive": false
      },
      "10": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Six houses remain. Don't slow down at the door."
          }
        ],
        "reactive": true,
        "fallback": "CL_SWT_NEUT_06",
        "eligibleIDs": [
          "CL_SWT_ZDEATH_01",
          "CL_SWT_ZDEATH_02",
          "CL_SWT_ZDEATH_03",
          "CL_SWT_ZDEATH_04",
          "CL_SWT_ZDEATH_05",
          "CL_SWT_ZDEATH_06",
          "CL_SWT_UNTOUCH_01",
          "CL_SWT_UNTOUCH_02",
          "CL_SWT_UNTOUCH_03",
          "CL_SWT_UNTOUCH_04",
          "CL_SWT_UNTOUCH_05",
          "CL_SWT_UNTOUCH_06",
          "CL_SWT_COMEBACK_01",
          "CL_SWT_COMEBACK_02",
          "CL_SWT_COMEBACK_03",
          "CL_SWT_COMEBACK_04",
          "CL_SWT_COMEBACK_05",
          "CL_SWT_NOPOW_01",
          "CL_SWT_NOPOW_02",
          "CL_SWT_NOPOW_03",
          "CL_SWT_NOPOW_04",
          "CL_SWT_NOPOW_05",
          "CL_SWT_NOPOW_06",
          "CL_SWT_BUNK_01",
          "CL_SWT_BUNK_02",
          "CL_SWT_BUNK_03",
          "CL_SWT_BUNK_04",
          "CL_SWT_BUNK_05",
          "CL_SWT_BUNK_06",
          "CL_SWT_PHASE_01",
          "CL_SWT_PHASE_02",
          "CL_SWT_PHASE_03",
          "CL_SWT_PHASE_04",
          "CL_SWT_PHASE_05",
          "CL_SWT_PHASE_06",
          "CL_SWT_DASH_01",
          "CL_SWT_DASH_02",
          "CL_SWT_DASH_03",
          "CL_SWT_DASH_04",
          "CL_SWT_DASH_05",
          "CL_SWT_DECOY_01",
          "CL_SWT_DECOY_02",
          "CL_SWT_DECOY_03",
          "CL_SWT_DECOY_04",
          "CL_SWT_DECOY_05",
          "CL_SWT_DECOY_06"
        ]
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "One hundred and five doors cleared. Rail corridor is secure and noise levels are zero."
      },
      {
        "speaker": "mags",
        "text": "Filter's installed. Pure, clean silence on the channel. It’s almost spooky."
      }
    ]
  },
  {
    "number": 8,
    "title": "Long Haul",
    "jobName": "Directional Laser Transceiver Head",
    "reason": "An optical line-of-sight laser transmitter to bridge communication across the water without using congested radio bands.",
    "short": "LASER HEAD",
    "beats": {
      "7": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Six houses cleared. Keep bringing them out."
          },
          {
            "speaker": "mags",
            "text": "I’ll need you at house 9. We need long-range glass to bridge the canal gap. I’ll explain before you step up."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "House 9. In the violet case is an infrared laser transceiver. You need that case and the stash in the trunk before the car rolls."
          },
          {
            "speaker": "switch",
            "text": "Optical transmission across the canal basin. Unjammable, zero latency, point-to-point."
          },
          {
            "speaker": "mags",
            "text": "Just don't point it at my eyes while I'm aligning the mirror! Both to the car, runner."
          }
        ],
        "reactive": false
      },
      "10": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Six houses remain on this canal line. Keep moving."
          }
        ],
        "reactive": true,
        "fallback": "CL_MAG_NEUT_02",
        "eligibleIDs": [
          "CL_MAG_ZDEATH_01",
          "CL_MAG_ZDEATH_02",
          "CL_MAG_ZDEATH_03",
          "CL_MAG_ZDEATH_04",
          "CL_MAG_ZDEATH_05",
          "CL_MAG_ZDEATH_06",
          "CL_MAG_UNTOUCH_01",
          "CL_MAG_UNTOUCH_02",
          "CL_MAG_UNTOUCH_03",
          "CL_MAG_UNTOUCH_04",
          "CL_MAG_UNTOUCH_05",
          "CL_MAG_UNTOUCH_06",
          "CL_MAG_COMEBACK_01",
          "CL_MAG_COMEBACK_02",
          "CL_MAG_COMEBACK_03",
          "CL_MAG_COMEBACK_04",
          "CL_MAG_COMEBACK_05",
          "CL_MAG_COMEBACK_06",
          "CL_MAG_NOPOW_01",
          "CL_MAG_NOPOW_02",
          "CL_MAG_NOPOW_03",
          "CL_MAG_NOPOW_04",
          "CL_MAG_NOPOW_05",
          "CL_MAG_NOPOW_06",
          "CL_MAG_BUNK_01",
          "CL_MAG_BUNK_02",
          "CL_MAG_BUNK_03",
          "CL_MAG_BUNK_04",
          "CL_MAG_BUNK_05",
          "CL_MAG_PHASE_01",
          "CL_MAG_PHASE_02",
          "CL_MAG_PHASE_03",
          "CL_MAG_PHASE_04",
          "CL_MAG_PHASE_05",
          "CL_MAG_PHASE_06",
          "CL_MAG_DASH_01",
          "CL_MAG_DASH_02",
          "CL_MAG_DASH_03",
          "CL_MAG_DASH_04",
          "CL_MAG_DASH_05",
          "CL_MAG_DASH_06",
          "CL_MAG_DECOY_01",
          "CL_MAG_DECOY_02",
          "CL_MAG_DECOY_03",
          "CL_MAG_DECOY_04",
          "CL_MAG_DECOY_05",
          "CL_MAG_DECOY_06"
        ]
      },
      "13": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses remain. Finish the canal line and bring the haul back."
          }
        ],
        "reactive": false
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "One hundred and twenty houses logged. Canal sector is bridged and our network latency is flat."
      },
      {
        "speaker": "mags",
        "text": "Laser is locked onto the Map Room mast. Clean green beam right across the water."
      }
    ]
  },
  {
    "number": 9,
    "title": "The Encryption Key",
    "jobName": "Hardware Security Cryptographic Module",
    "reason": "Switch needs a dedicated hardware cipher chip to lock Crossline’s master network with military-grade rolling encryption.",
    "short": "CIPHER MODULE",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Steep incline on this ridge. Measure your stride on the walkways and don't stall in the halls."
          },
          {
            "speaker": "mags",
            "text": "From up here, our repeaters look like a constellation across the roofs."
          }
        ],
        "reactive": false
      },
      "4": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "mags",
            "text": "Every signal across {city} is routing through our grid now."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Door 9. In the violet case is a tamper-proof cryptographic module. Carry both the case and the stash to the getaway car."
          },
          {
            "speaker": "switch",
            "text": "Hardware-level AES-256 encryption. Once that module is seated in our primary server, nobody intercepts our courier lines."
          },
          {
            "speaker": "mags",
            "text": "Not even the city dispatchers with their expensive monitors. Bring it home clean, runner!"
          }
        ],
        "reactive": false
      },
      "13": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses remain. Finish the ridge run and bring it home."
          }
        ],
        "reactive": true,
        "fallback": "CL_SWT_NEUT_07",
        "eligibleIDs": [
          "CL_SWT_ZDEATH_01",
          "CL_SWT_ZDEATH_02",
          "CL_SWT_ZDEATH_03",
          "CL_SWT_ZDEATH_04",
          "CL_SWT_ZDEATH_05",
          "CL_SWT_ZDEATH_06",
          "CL_SWT_UNTOUCH_01",
          "CL_SWT_UNTOUCH_02",
          "CL_SWT_UNTOUCH_03",
          "CL_SWT_UNTOUCH_04",
          "CL_SWT_UNTOUCH_05",
          "CL_SWT_UNTOUCH_06",
          "CL_SWT_COMEBACK_01",
          "CL_SWT_COMEBACK_02",
          "CL_SWT_COMEBACK_03",
          "CL_SWT_COMEBACK_04",
          "CL_SWT_COMEBACK_05",
          "CL_SWT_NOPOW_01",
          "CL_SWT_NOPOW_02",
          "CL_SWT_NOPOW_03",
          "CL_SWT_NOPOW_04",
          "CL_SWT_NOPOW_05",
          "CL_SWT_NOPOW_06",
          "CL_SWT_BUNK_01",
          "CL_SWT_BUNK_02",
          "CL_SWT_BUNK_03",
          "CL_SWT_BUNK_04",
          "CL_SWT_BUNK_05",
          "CL_SWT_BUNK_06",
          "CL_SWT_PHASE_01",
          "CL_SWT_PHASE_02",
          "CL_SWT_PHASE_03",
          "CL_SWT_PHASE_04",
          "CL_SWT_PHASE_05",
          "CL_SWT_PHASE_06",
          "CL_SWT_DASH_01",
          "CL_SWT_DASH_02",
          "CL_SWT_DASH_03",
          "CL_SWT_DASH_04",
          "CL_SWT_DASH_05",
          "CL_SWT_DECOY_01",
          "CL_SWT_DECOY_02",
          "CL_SWT_DECOY_03",
          "CL_SWT_DECOY_04",
          "CL_SWT_DECOY_05",
          "CL_SWT_DECOY_06"
        ]
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "One hundred and thirty-five stashes logged for Crossline. The cipher module is ready for our grid."
      },
      {
        "speaker": "mags",
        "text": "The line is completely dark to outsiders. Only Crossline talks on these streets now."
      }
    ]
  },
  {
    "number": 10,
    "title": "Master Carrier",
    "jobName": "Antique Dual-Gong Telephone Ringer",
    "reason": "Mags wants a loud physical brass bell that violently rings in the Map Room every time Switch gives an overly analytical route brief.",
    "short": "BRASS RINGER",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Fifteen more doors to finish our opening route ledger. Grab the stashes and bring them home."
          },
          {
            "speaker": "mags",
            "text": "Every repeater is synced and waiting. Let’s finish the map."
          }
        ],
        "reactive": false
      },
      "4": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "switch",
            "text": "Mags will need you at house 9. She won't explain it over the open channel, but she’ll brief you before you go in."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Door 9. In the violet case is a heavy brass telephone ringer. Grab that case and the stash—both pickups are mandatory."
          },
          {
            "speaker": "switch",
            "text": "An analog telephone ringer? Mags, we run a digital fiber and microwave grid."
          },
          {
            "speaker": "mags",
            "text": "Yeah, and I'm wiring it directly to your desk so it clangs in your ear every time you spend ten minutes analyzing five seconds of running! Bring the case!"
          }
        ],
        "reactive": false
      },
      "10": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Six houses remain in {city}. Leave nothing on the table."
          }
        ],
        "reactive": true,
        "fallback": "CL_SWT_NEUT_08",
        "eligibleIDs": [
          "CL_SWT_ZDEATH_01",
          "CL_SWT_ZDEATH_02",
          "CL_SWT_ZDEATH_03",
          "CL_SWT_ZDEATH_04",
          "CL_SWT_ZDEATH_05",
          "CL_SWT_ZDEATH_06",
          "CL_SWT_UNTOUCH_01",
          "CL_SWT_UNTOUCH_02",
          "CL_SWT_UNTOUCH_03",
          "CL_SWT_UNTOUCH_04",
          "CL_SWT_UNTOUCH_05",
          "CL_SWT_UNTOUCH_06",
          "CL_SWT_COMEBACK_01",
          "CL_SWT_COMEBACK_02",
          "CL_SWT_COMEBACK_03",
          "CL_SWT_COMEBACK_04",
          "CL_SWT_COMEBACK_05",
          "CL_SWT_NOPOW_01",
          "CL_SWT_NOPOW_02",
          "CL_SWT_NOPOW_03",
          "CL_SWT_NOPOW_04",
          "CL_SWT_NOPOW_05",
          "CL_SWT_NOPOW_06",
          "CL_SWT_BUNK_01",
          "CL_SWT_BUNK_02",
          "CL_SWT_BUNK_03",
          "CL_SWT_BUNK_04",
          "CL_SWT_BUNK_05",
          "CL_SWT_BUNK_06",
          "CL_SWT_PHASE_01",
          "CL_SWT_PHASE_02",
          "CL_SWT_PHASE_03",
          "CL_SWT_PHASE_04",
          "CL_SWT_PHASE_05",
          "CL_SWT_PHASE_06",
          "CL_SWT_DASH_01",
          "CL_SWT_DASH_02",
          "CL_SWT_DASH_03",
          "CL_SWT_DASH_04",
          "CL_SWT_DASH_05",
          "CL_SWT_DECOY_01",
          "CL_SWT_DECOY_02",
          "CL_SWT_DECOY_03",
          "CL_SWT_DECOY_04",
          "CL_SWT_DECOY_05",
          "CL_SWT_DECOY_06"
        ]
      },
      "13": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Three houses remain on the city grid. Run your line straight to the curb."
          }
        ],
        "reactive": false
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "One hundred and fifty stashes logged for Crossline. Our opening campaign ledger is complete, and the master network is ready."
      },
      {
        "speaker": "mags",
        "text": "(Clangs the brass ringer) That’s the sound of a closed circuit and zero dropped packets."
      },
      {
        "speaker": "switch",
        "text": "Pack the mobile terminal. We've got another route waiting wherever the next block takes us."
      }
    ]
  }
]);
export const CROSSLINE_DIALOGUE_BANK = Object.freeze([
  {
    "id": "CL_SWT_ZDEATH_01",
    "category": "ZERO_DEATHS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Zero deaths on this stretch. Keep the route moving, one door at a time."
  },
  {
    "id": "CL_SWT_ZDEATH_02",
    "category": "ZERO_DEATHS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Haven't lost you once on this block. Keep your lane discipline steady through the next door."
  },
  {
    "id": "CL_SWT_ZDEATH_03",
    "category": "ZERO_DEATHS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "No deaths logged this block. Stay sharp on your entry angles; don't give them a seam."
  },
  {
    "id": "CL_SWT_ZDEATH_04",
    "category": "ZERO_DEATHS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "You've stayed upright across this whole avenue. Keep that exact trajectory to the curb."
  },
  {
    "id": "CL_SWT_ZDEATH_05",
    "category": "ZERO_DEATHS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Zero deaths so far. Keep bringing the stashes to the car."
  },
  {
    "id": "CL_SWT_ZDEATH_06",
    "category": "ZERO_DEATHS",
    "speaker": "switch",
    "minChapter": 3,
    "text": "Still running without a wipeout. If you finish this clean, Mags might let you hear the crystal radio."
  },
  {
    "id": "CL_MAG_ZDEATH_01",
    "category": "ZERO_DEATHS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Zero deaths on the board. I like a shift where I don't lose the runner on the channel."
  },
  {
    "id": "CL_MAG_ZDEATH_02",
    "category": "ZERO_DEATHS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Still in one piece across this whole street. Keep moving like that and we wrap early."
  },
  {
    "id": "CL_MAG_ZDEATH_03",
    "category": "ZERO_DEATHS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Zero wipeouts so far. Don't get careless just because nobody's clipped your heels yet."
  },
  {
    "id": "CL_MAG_ZDEATH_04",
    "category": "ZERO_DEATHS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "You haven't hit the pavement once this block. That keeps my pulse under two hundred, thanks."
  },
  {
    "id": "CL_MAG_ZDEATH_05",
    "category": "ZERO_DEATHS",
    "speaker": "mags",
    "minChapter": 5,
    "text": "Zero drops logged. Even Switch’s finned heat sinks haven't broken a sweat tracking you."
  },
  {
    "id": "CL_MAG_ZDEATH_06",
    "category": "ZERO_DEATHS",
    "speaker": "mags",
    "minChapter": 2,
    "text": "Still standing without a death. That’s pure high-gain performance out there."
  },
  {
    "id": "CL_SWT_UNTOUCH_01",
    "category": "FLAWLESS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your successful clears, zero bullet hits and zero drops. Your vector planning through those halls has been surgical."
  },
  {
    "id": "CL_SWT_UNTOUCH_02",
    "category": "FLAWLESS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your successful clears, zero bullet hits on your clears and no deaths this block. Keep maintaining that buffer zone."
  },
  {
    "id": "CL_SWT_UNTOUCH_03",
    "category": "FLAWLESS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your successful clears, untouched by gunfire and completely upright. Maintain those exact exit trajectories."
  },
  {
    "id": "CL_SWT_UNTOUCH_04",
    "category": "FLAWLESS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your successful clears, zero hits on your clears, zero deaths this block. Keep giving the next door your full attention."
  },
  {
    "id": "CL_SWT_UNTOUCH_05",
    "category": "FLAWLESS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your successful clears, zero hits taken and no wipeouts. Keep your transitions tight and don't linger at the threshold."
  },
  {
    "id": "CL_SWT_UNTOUCH_06",
    "category": "FLAWLESS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your successful clears, not a bullet hit on your clears and zero drops. That’s textbook route discipline."
  },
  {
    "id": "CL_MAG_UNTOUCH_01",
    "category": "FLAWLESS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your successful clears, not a single bullet touched you and you haven't hit the deck. Clean as a fresh copper trace."
  },
  {
    "id": "CL_MAG_UNTOUCH_02",
    "category": "FLAWLESS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your successful clears, zero lead caught and zero drops. You're slipping past them like radio waves through glass."
  },
  {
    "id": "CL_MAG_UNTOUCH_03",
    "category": "FLAWLESS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your successful clears, clean jacket, zero wipeouts. Keep running like that and I won't have to patch your comm wire."
  },
  {
    "id": "CL_MAG_UNTOUCH_04",
    "category": "FLAWLESS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your successful clears, you haven't caught a bullet or taken a fall yet. Let's see you close out the block that way."
  },
  {
    "id": "CL_MAG_UNTOUCH_05",
    "category": "FLAWLESS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your successful clears, untouched by gunfire and still on your feet. That makes my job on the headset easy."
  },
  {
    "id": "CL_MAG_UNTOUCH_06",
    "category": "FLAWLESS",
    "speaker": "mags",
    "minChapter": 9,
    "text": "On your successful clears, zero hits, zero drops. You're cutting through corridors as clean as our canal laser."
  },
  {
    "id": "CL_SWT_COMEBACK_01",
    "category": "COMEBACK",
    "speaker": "switch",
    "minChapter": 1,
    "text": "You took multiple failed runs earlier, but you adjusted your vectors. Keep your spatial focus."
  },
  {
    "id": "CL_SWT_COMEBACK_02",
    "category": "COMEBACK",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Several failed attempts behind you, but you re-established the line. Stay locked in."
  },
  {
    "id": "CL_SWT_COMEBACK_03",
    "category": "COMEBACK",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Rough attempts back there, but you recovered the run. Keep moving to the car."
  },
  {
    "id": "CL_SWT_COMEBACK_04",
    "category": "COMEBACK",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Multiple drops on this block, but you found the exit lane. Execute cleanly on this next door."
  },
  {
    "id": "CL_SWT_COMEBACK_05",
    "category": "COMEBACK",
    "speaker": "switch",
    "minChapter": 1,
    "text": "You’ve had to reset your route several times this block. What matters is the line is moving again."
  },
  {
    "id": "CL_SWT_COMEBACK_06",
    "category": "COMEBACK",
    "speaker": "switch",
    "minChapter": 5,
    "text": "Took some failed runs on earlier doors. Take a breath—even our Map Room terminal needed cooling."
  },
  {
    "id": "CL_MAG_COMEBACK_01",
    "category": "COMEBACK",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Took multiple spills on this street, but you bounced right back. Circuit stayed closed."
  },
  {
    "id": "CL_MAG_COMEBACK_02",
    "category": "COMEBACK",
    "speaker": "mags",
    "minChapter": 1,
    "text": "A few rough attempts back there, but you pulled through. Shake the dust off your knees."
  },
  {
    "id": "CL_MAG_COMEBACK_03",
    "category": "COMEBACK",
    "speaker": "mags",
    "minChapter": 1,
    "text": "You took some failed runs this block, but you didn't drop the line. I like a runner who doesn't panic."
  },
  {
    "id": "CL_MAG_COMEBACK_04",
    "category": "COMEBACK",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Plenty of dropped runs behind you, but you're still sprinting. Eyes on the prize, runner."
  },
  {
    "id": "CL_MAG_COMEBACK_05",
    "category": "COMEBACK",
    "speaker": "mags",
    "minChapter": 1,
    "text": "More than a couple bad landings this block. Grab the next bag and leave those wiped attempts behind."
  },
  {
    "id": "CL_MAG_COMEBACK_06",
    "category": "COMEBACK",
    "speaker": "mags",
    "minChapter": 7,
    "text": "Took some rough attempts and you're still walking. You've got more resilience than our backup power bank."
  },
  {
    "id": "CL_SWT_NOPOW_01",
    "category": "NO_POWERS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your successful clears, zero powers activated on your clears. You're navigating purely on positioning and pace."
  },
  {
    "id": "CL_SWT_NOPOW_02",
    "category": "NO_POWERS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your successful clears, running unassisted without tapping any powers. Good spatial discipline in those rooms."
  },
  {
    "id": "CL_SWT_NOPOW_03",
    "category": "NO_POWERS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your successful clears, haven't leaned on a single power so far. Keep that natural line moving straight to the car."
  },
  {
    "id": "CL_SWT_NOPOW_04",
    "category": "NO_POWERS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your successful clears, no power usage on those extractions. Pure geometry and clean movement to the threshold."
  },
  {
    "id": "CL_SWT_NOPOW_05",
    "category": "NO_POWERS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your successful clears, bringing stashes in without activating powers. Trust your angles and keep running."
  },
  {
    "id": "CL_SWT_NOPOW_06",
    "category": "NO_POWERS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your successful clears, zero powers used on those clears. Crisp, unassisted legwork across every hallway."
  },
  {
    "id": "CL_MAG_NOPOW_01",
    "category": "NO_POWERS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your successful clears, haven't popped a single power so far. Pure legwork. You really like running analog."
  },
  {
    "id": "CL_MAG_NOPOW_02",
    "category": "NO_POWERS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your successful clears, zero powers triggered so far. Just old-school sprinting. I can appreciate the hustle."
  },
  {
    "id": "CL_MAG_NOPOW_03",
    "category": "NO_POWERS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your successful clears, haven't touched a power once on this avenue. Doing it the hard way keeps your senses sharp."
  },
  {
    "id": "CL_MAG_NOPOW_04",
    "category": "NO_POWERS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your successful clears, hauling bags out without leaning on powers. If you like the extra sweat, keep at it."
  },
  {
    "id": "CL_MAG_NOPOW_05",
    "category": "NO_POWERS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your successful clears, running completely unassisted. Works like a passive crystal radio—no extra power required."
  },
  {
    "id": "CL_MAG_NOPOW_06",
    "category": "NO_POWERS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your successful clears, no powers burned across those clears. Pure raw hustle from the porch to the trunk."
  },
  {
    "id": "CL_SWT_BUNK_01",
    "category": "BUNK_BAGS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "You triggered multiple bunk bags before securing the stash. Verify your target before committing."
  },
  {
    "id": "CL_SWT_BUNK_02",
    "category": "BUNK_BAGS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Touched a few false bags in those rooms. Keep your scanning deliberate and locate the stash."
  },
  {
    "id": "CL_SWT_BUNK_03",
    "category": "BUNK_BAGS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Had a couple bunk bags dissolve on you. Don't let decoy targets pull you off your vector."
  },
  {
    "id": "CL_SWT_BUNK_04",
    "category": "BUNK_BAGS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Popped multiple decoy bags on this stretch. Stay focused until your hands hit the stash."
  },
  {
    "id": "CL_SWT_BUNK_05",
    "category": "BUNK_BAGS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "A few empty bags touched along the way, but the stash reached the car. Tighten up your search."
  },
  {
    "id": "CL_SWT_BUNK_06",
    "category": "BUNK_BAGS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Touching bunk bags is like chasing false signal reflections. Filter out the noise and grab the score."
  },
  {
    "id": "CL_MAG_BUNK_01",
    "category": "BUNK_BAGS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Dissolved a few bunk bags in there. If you want useless decoys, come sift through Switch’s cable drawer."
  },
  {
    "id": "CL_MAG_BUNK_02",
    "category": "BUNK_BAGS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Hit multiple false bags on this block. Good thing you tracked down the stash before leaving."
  },
  {
    "id": "CL_MAG_BUNK_03",
    "category": "BUNK_BAGS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Had a couple fake bags pop on you this block. Keep your eyes peeled so you find the stash faster."
  },
  {
    "id": "CL_MAG_BUNK_04",
    "category": "BUNK_BAGS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Triggered some empty bags earlier. Just keep moving until you touch the stash that counts."
  },
  {
    "id": "CL_MAG_BUNK_05",
    "category": "BUNK_BAGS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Popped a few decoys this block. Reminds me of tuning into ghost stations on a bad antenna."
  },
  {
    "id": "CL_MAG_BUNK_06",
    "category": "BUNK_BAGS",
    "speaker": "mags",
    "minChapter": 11,
    "text": "Hit multiple bunk bags on this run. If I had my brass ringer here, I’d clang it for each one."
  },
  {
    "id": "CL_SWT_PHASE_01",
    "category": "POWER_PHASE",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, phase has been your main power on the clears this block. Keep your heading in mind."
  },
  {
    "id": "CL_SWT_PHASE_02",
    "category": "POWER_PHASE",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, you've been activating Phase more than your other powers. Keep your momentum ready when you exit."
  },
  {
    "id": "CL_SWT_PHASE_03",
    "category": "POWER_PHASE",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, leaning heavily on Phase this block. It’s an efficient shortcut, as long as you keep moving forward."
  },
  {
    "id": "CL_SWT_PHASE_04",
    "category": "POWER_PHASE",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, triggering Phase frequently. Remember to commit to the sprint lane the second you're solid."
  },
  {
    "id": "CL_SWT_PHASE_05",
    "category": "POWER_PHASE",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, phase has been your dominant choice. It solves tight corners, but keep your eyes on the threshold."
  },
  {
    "id": "CL_SWT_PHASE_06",
    "category": "POWER_PHASE",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, using Phase like a direct conduit through the floor plan. Efficient, just don't get sloppy."
  },
  {
    "id": "CL_MAG_PHASE_01",
    "category": "POWER_PHASE",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, phase is leading your moves this block. Ghosting through rooms looks fun, just keep your feet moving."
  },
  {
    "id": "CL_MAG_PHASE_02",
    "category": "POWER_PHASE",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, you've leaned on Phase more than anything else. Beats looking for an open hallway, I admit."
  },
  {
    "id": "CL_MAG_PHASE_03",
    "category": "POWER_PHASE",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, lots of Phase activations logged. If only I could phase Switch’s extra monitors out the window."
  },
  {
    "id": "CL_MAG_PHASE_04",
    "category": "POWER_PHASE",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, phase is your go-to on this stretch. Slipping out of sight is neat, but you still have to sprint the curb."
  },
  {
    "id": "CL_MAG_PHASE_05",
    "category": "POWER_PHASE",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, triggering Phase more than anything else this block. Handy trick, just watch where you're landing."
  },
  {
    "id": "CL_MAG_PHASE_06",
    "category": "POWER_PHASE",
    "speaker": "mags",
    "minChapter": 4,
    "text": "On your clears, leaning on Phase again. If I could Phase through walls, I'd dodge Switch’s ten-minute route lectures."
  },
  {
    "id": "CL_SWT_DASH_01",
    "category": "POWER_DASH",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, dash has been your dominant power this block. That burst closes distance fast; keep your lane square."
  },
  {
    "id": "CL_SWT_DASH_02",
    "category": "POWER_DASH",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, leaning on Dash more than the rest. Rapid linear acceleration, just stay in control at the exit."
  },
  {
    "id": "CL_SWT_DASH_03",
    "category": "POWER_DASH",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, you've been triggering Dash quite a bit. Good burst velocity, just don't overrun your exit angle."
  },
  {
    "id": "CL_SWT_DASH_04",
    "category": "POWER_DASH",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, dash is leading your runs so far. Hitting that burst works, as long as your footing stays true."
  },
  {
    "id": "CL_SWT_DASH_05",
    "category": "POWER_DASH",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, using Dash more than anything else. Rapid pace helps, but keep your focus on the threshold."
  },
  {
    "id": "CL_SWT_DASH_06",
    "category": "POWER_DASH",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, dash has been your top tool this block. Sudden acceleration works when you have an open line."
  },
  {
    "id": "CL_MAG_DASH_01",
    "category": "POWER_DASH",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, dash has been your most-used power on this street. You hit that burst like your shoes caught fire."
  },
  {
    "id": "CL_MAG_DASH_02",
    "category": "POWER_DASH",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, triggering Dash more than anything else. Fast lunge, just make sure you don't trip on the threshold."
  },
  {
    "id": "CL_MAG_DASH_03",
    "category": "POWER_DASH",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, leaning on Dash this block. A quick punch of speed straight toward the stash works fine by me."
  },
  {
    "id": "CL_MAG_DASH_04",
    "category": "POWER_DASH",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, dash leads your choices so far. Rocketing forward is great, just keep both hands ready for the bag."
  },
  {
    "id": "CL_MAG_DASH_05",
    "category": "POWER_DASH",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, you favor that Dash burst on your clears. Keep your eyes on the car; the stash still needs an exit."
  },
  {
    "id": "CL_MAG_DASH_06",
    "category": "POWER_DASH",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, dash leads the board this block. Move that fast in the Map Room and you’ll trip over Switch’s cables."
  },
  {
    "id": "CL_SWT_DECOY_01",
    "category": "POWER_DECOY",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, decoy is your go-to move this block. Splitting attention buys you time; keep your exit path open."
  },
  {
    "id": "CL_SWT_DECOY_02",
    "category": "POWER_DECOY",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, you've been triggering Decoy more than your other powers. Keep your own line moving."
  },
  {
    "id": "CL_SWT_DECOY_03",
    "category": "POWER_DECOY",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, leaning on Decoy this block. Leaving a false signature behind works, as long as you maintain your sprint."
  },
  {
    "id": "CL_SWT_DECOY_04",
    "category": "POWER_DECOY",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, decoy leads your activations on this stretch. Keep your route to the curb in mind."
  },
  {
    "id": "CL_SWT_DECOY_05",
    "category": "POWER_DECOY",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, popping Decoy more than the rest. Sound diversion, provided you don't hesitate at the doorway."
  },
  {
    "id": "CL_SWT_DECOY_06",
    "category": "POWER_DECOY",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, you favor Decoy on your clears. Keep moving after you drop the double."
  },
  {
    "id": "CL_MAG_DECOY_01",
    "category": "POWER_DECOY",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, decoy has been your most-used power this block. Dropping a holographic twin never gets old. Keep moving."
  },
  {
    "id": "CL_MAG_DECOY_02",
    "category": "POWER_DECOY",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, leaning on Decoy more than anything else. Like leaving a dummy radio broadcast to throw off the law."
  },
  {
    "id": "CL_MAG_DECOY_03",
    "category": "POWER_DECOY",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, lots of Decoy drops on this block. If I had a decoy back at the hub, I'd send it to listen to Switch."
  },
  {
    "id": "CL_MAG_DECOY_04",
    "category": "POWER_DECOY",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, decoy is leading your picks so far. Leaving a diversion behind while you grab the stash is pure hustle."
  },
  {
    "id": "CL_MAG_DECOY_05",
    "category": "POWER_DECOY",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, dropping Decoys all over the hallway this block. As long as you make for the car, I won't complain."
  },
  {
    "id": "CL_MAG_DECOY_06",
    "category": "POWER_DECOY",
    "speaker": "mags",
    "minChapter": 7,
    "text": "On your clears, decoy leads your style this block. I wish I could drop a decoy to filter out Switch’s frequency charts."
  },
  {
    "id": "CL_SWT_NEUT_01",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Keep your stride measured and your head down. Bring the next bag to the car."
  },
  {
    "id": "CL_SWT_NEUT_02",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Next porch is waiting. Find the stash, take your corner, and sprint to the curb."
  },
  {
    "id": "CL_SWT_NEUT_03",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Keep your weight centered and your boots moving. Don't linger once your hands touch the bag."
  },
  {
    "id": "CL_SWT_NEUT_04",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Focus on the door right in front of you. One clear at a time puts Crossline on the map."
  },
  {
    "id": "CL_SWT_NEUT_05",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Stay on the line and keep your eyes on the threshold. Get in and get out."
  },
  {
    "id": "CL_SWT_NEUT_06",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Check your footing before you cross that porch. Crossline needs every bag accounted for."
  },
  {
    "id": "CL_SWT_NEUT_07",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Don't let up now. Grab the bag, make your turn, and haul it out to the getaway car."
  },
  {
    "id": "CL_SWT_NEUT_08",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Another door, another haul. Keep pulling bags and we'll have this avenue locked down."
  },
  {
    "id": "CL_MAG_NEUT_01",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Keep your boots moving. The getaway car is idling at the curb waiting for that stash."
  },
  {
    "id": "CL_MAG_NEUT_02",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Another house on the block. Grab the bag clean and don't trip over the doormat."
  },
  {
    "id": "CL_MAG_NEUT_03",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "mags",
    "minChapter": 1,
    "text": "The car is idling and the next porch is waiting. Scoop the stash and bring it to the curb."
  },
  {
    "id": "CL_MAG_NEUT_04",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Step up to the door, find the goods, and hit the pavement. Let's keep moving."
  },
  {
    "id": "CL_MAG_NEUT_05",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Keep pulling bags. The sooner we clear these houses, the sooner I get back to my workbench."
  },
  {
    "id": "CL_MAG_NEUT_06",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Keep your line moving forward. Don't get tangled up inside; grab the stash and go."
  },
  {
    "id": "CL_MAG_NEUT_07",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Another porch ready to crack. Keep your hands ready and your sprint straight to the car."
  },
  {
    "id": "CL_MAG_NEUT_08",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "mags",
    "minChapter": 1,
    "text": "Stay on task out there. Scoop the stash and let’s keep the tally rolling."
  }
].map(line => Object.freeze(line)));
