// Season 1 normalized from AFTERLIGHT_SEASON_1.md. Manuscript prompts/citation/downloader debris are not runtime instructions.
// Import-free narrative data; no progression, rewards, maze mutations or RNG.
export const AFTERLIGHT_CHAPTERS = Object.freeze([
  {
    "number": 1,
    "title": "Opening Act",
    "jobName": "Analog Split-Second Mechanical Stopwatch",
    "reason": "Sol refuses to use digital phone timers to track runner splits, claiming analog dials have real soul.",
    "short": "STOPWATCH",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "vee",
            "text": "First threshold of the campaign. Grab the stash, keep your line clean, and make your exit look intentional."
          },
          {
            "speaker": "sol",
            "text": "Don't just run—sprint! The getaway car is waiting and I'm timing your curb split from here."
          }
        ],
        "reactive": false
      },
      "4": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "vee",
            "text": "Sol will need you at house 9. He’ll brief you before you step up to that door. For now, keep pulling bags."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Door 9. In the violet case is a dual-dial mechanical stopwatch. Grab that case and the stash before you make for the car. Both pickups are required."
          },
          {
            "speaker": "vee",
            "text": "An antique stopwatch? We're taking over a city, Sol, not coaching track and field."
          },
          {
            "speaker": "sol",
            "text": "That spring-wound timer tracks split seconds to the tenth, Vee! Scoop both items and sprint to the curb!"
          }
        ],
        "reactive": false
      },
      "10": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Six houses remain on this avenue. Keep your stride long and finish the set."
          }
        ],
        "reactive": true,
        "fallback": "AL_VEE_NEUT_01",
        "eligibleIDs": [
          "AL_VEE_ZDEATH_01",
          "AL_VEE_ZDEATH_02",
          "AL_VEE_ZDEATH_03",
          "AL_VEE_ZDEATH_04",
          "AL_VEE_ZDEATH_05",
          "AL_VEE_UNTOUCH_01",
          "AL_VEE_UNTOUCH_02",
          "AL_VEE_UNTOUCH_03",
          "AL_VEE_UNTOUCH_04",
          "AL_VEE_UNTOUCH_05",
          "AL_VEE_UNTOUCH_06",
          "AL_VEE_COMEBACK_01",
          "AL_VEE_COMEBACK_02",
          "AL_VEE_COMEBACK_03",
          "AL_VEE_COMEBACK_04",
          "AL_VEE_COMEBACK_05",
          "AL_VEE_NOPOW_01",
          "AL_VEE_NOPOW_02",
          "AL_VEE_NOPOW_03",
          "AL_VEE_NOPOW_04",
          "AL_VEE_NOPOW_05",
          "AL_VEE_NOPOW_06",
          "AL_VEE_BUNK_01",
          "AL_VEE_BUNK_02",
          "AL_VEE_BUNK_03",
          "AL_VEE_BUNK_04",
          "AL_VEE_BUNK_05",
          "AL_VEE_BUNK_06",
          "AL_VEE_PHASE_01",
          "AL_VEE_PHASE_02",
          "AL_VEE_PHASE_03",
          "AL_VEE_PHASE_04",
          "AL_VEE_PHASE_05",
          "AL_VEE_PHASE_06",
          "AL_VEE_DASH_01",
          "AL_VEE_DASH_02",
          "AL_VEE_DASH_03",
          "AL_VEE_DASH_04",
          "AL_VEE_DASH_05",
          "AL_VEE_DECOY_01",
          "AL_VEE_DECOY_02",
          "AL_VEE_DECOY_03",
          "AL_VEE_DECOY_04",
          "AL_VEE_DECOY_05",
          "AL_VEE_DECOY_06"
        ]
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Fifteen doors cleared. The first fifteen stashes are logged for Afterlight. Our opening act is in the books."
      },
      {
        "speaker": "sol",
        "text": "And the stopwatch came home! One piece of the showcase down—plenty more noise to make."
      }
    ]
  },
  {
    "number": 2,
    "title": "Neon Ink",
    "jobName": "High-Pressure Aerosol Spray Nozzle Kit",
    "reason": "Vee needs precision wide-fan spray nozzles to tag building-sized murals before sunrise.",
    "short": "SPRAY NOZZLES",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Tight alley porches along this strip. Pop out the front door and hit top speed immediately."
          },
          {
            "speaker": "vee",
            "text": "Speed is fine, but don't scramble. Make every corner look deliberate."
          }
        ],
        "reactive": false
      },
      "7": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Six houses cleared. Keep bringing them out."
          },
          {
            "speaker": "sol",
            "text": "I’ll need you at house 9 for a quick pickup. I’ll explain what to grab before that entrance. Keep moving."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Target door. The violet case holds an anodized spray nozzle kit. You must bring that case along with the stash to extract."
          },
          {
            "speaker": "vee",
            "text": "Fat caps and calligraphy tips. That lets me lay down six-foot violet tags in four seconds flat."
          },
          {
            "speaker": "sol",
            "text": "Just don't spray my leather jacket this time! Both items to the curb, runner."
          }
        ],
        "reactive": false
      },
      "13": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses remain. Maintain your composure and close this avenue out."
          }
        ],
        "reactive": true,
        "fallback": "AL_VEE_NEUT_02",
        "eligibleIDs": [
          "AL_VEE_ZDEATH_01",
          "AL_VEE_ZDEATH_02",
          "AL_VEE_ZDEATH_03",
          "AL_VEE_ZDEATH_04",
          "AL_VEE_ZDEATH_05",
          "AL_VEE_ZDEATH_06",
          "AL_VEE_UNTOUCH_01",
          "AL_VEE_UNTOUCH_02",
          "AL_VEE_UNTOUCH_03",
          "AL_VEE_UNTOUCH_04",
          "AL_VEE_UNTOUCH_05",
          "AL_VEE_UNTOUCH_06",
          "AL_VEE_COMEBACK_01",
          "AL_VEE_COMEBACK_02",
          "AL_VEE_COMEBACK_03",
          "AL_VEE_COMEBACK_04",
          "AL_VEE_COMEBACK_05",
          "AL_VEE_NOPOW_01",
          "AL_VEE_NOPOW_02",
          "AL_VEE_NOPOW_03",
          "AL_VEE_NOPOW_04",
          "AL_VEE_NOPOW_05",
          "AL_VEE_NOPOW_06",
          "AL_VEE_BUNK_01",
          "AL_VEE_BUNK_02",
          "AL_VEE_BUNK_03",
          "AL_VEE_BUNK_04",
          "AL_VEE_BUNK_05",
          "AL_VEE_BUNK_06",
          "AL_VEE_PHASE_01",
          "AL_VEE_PHASE_02",
          "AL_VEE_PHASE_03",
          "AL_VEE_PHASE_04",
          "AL_VEE_PHASE_05",
          "AL_VEE_PHASE_06",
          "AL_VEE_DASH_01",
          "AL_VEE_DASH_02",
          "AL_VEE_DASH_03",
          "AL_VEE_DASH_04",
          "AL_VEE_DASH_05",
          "AL_VEE_DECOY_01",
          "AL_VEE_DECOY_02",
          "AL_VEE_DECOY_03",
          "AL_VEE_DECOY_04",
          "AL_VEE_DECOY_05",
          "AL_VEE_DECOY_06"
        ]
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Thirty total stashes logged, and the entire alley is tagged in radiant violet."
      },
      {
        "speaker": "sol",
        "text": "Nobody can mistake whose block this is now. Let's roll to the next avenue."
      }
    ]
  },
  {
    "number": 3,
    "title": "Amber Beacon",
    "jobName": "High-Output Amber Strobe Beacon",
    "reason": "Sol wants an industrial-grade amber strobe to mark the finish line of their late-night street sprint.",
    "short": "AMBER STROBE",
    "beats": {
      "4": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "vee",
            "text": "Sol will need a favor at house 9. He’ll lay out the pickup before you take that entrance. Keep moving."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Door 9. In the violet case is a heavy amber emergency strobe. Both the case and the stash must reach the car."
          },
          {
            "speaker": "vee",
            "text": "An amber strobe? It's completely going to clash with our violet aesthetic, Sol."
          },
          {
            "speaker": "sol",
            "text": "It flashes at four hundred lumens! When runners hit the curb, they'll know exactly where the finish line is. Bring both!"
          }
        ],
        "reactive": false
      },
      "10": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Six houses remain. Stride it out and keep those porch splits fast."
          }
        ],
        "reactive": true,
        "fallback": "AL_SOL_NEUT_01",
        "eligibleIDs": [
          "AL_SOL_ZDEATH_01",
          "AL_SOL_ZDEATH_02",
          "AL_SOL_ZDEATH_03",
          "AL_SOL_ZDEATH_04",
          "AL_SOL_UNTOUCH_01",
          "AL_SOL_UNTOUCH_02",
          "AL_SOL_UNTOUCH_03",
          "AL_SOL_UNTOUCH_04",
          "AL_SOL_UNTOUCH_05",
          "AL_SOL_COMEBACK_01",
          "AL_SOL_COMEBACK_02",
          "AL_SOL_COMEBACK_03",
          "AL_SOL_COMEBACK_04",
          "AL_SOL_COMEBACK_05",
          "AL_SOL_NOPOW_01",
          "AL_SOL_NOPOW_02",
          "AL_SOL_NOPOW_03",
          "AL_SOL_NOPOW_04",
          "AL_SOL_NOPOW_05",
          "AL_SOL_BUNK_01",
          "AL_SOL_BUNK_02",
          "AL_SOL_BUNK_03",
          "AL_SOL_BUNK_04",
          "AL_SOL_BUNK_05",
          "AL_SOL_PHASE_01",
          "AL_SOL_PHASE_02",
          "AL_SOL_PHASE_03",
          "AL_SOL_PHASE_04",
          "AL_SOL_PHASE_05",
          "AL_SOL_DASH_01",
          "AL_SOL_DASH_02",
          "AL_SOL_DASH_03",
          "AL_SOL_DASH_04",
          "AL_SOL_DASH_05",
          "AL_SOL_DASH_06",
          "AL_SOL_DECOY_01",
          "AL_SOL_DECOY_02",
          "AL_SOL_DECOY_03",
          "AL_SOL_DECOY_04",
          "AL_SOL_DECOY_05"
        ]
      },
      "13": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses left. Close this commercial strip with style."
          }
        ],
        "reactive": false
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Forty-five houses logged for Afterlight. The commercial strip belongs to our campaign."
      },
      {
        "speaker": "sol",
        "text": "Strobe beacon is secured. That light is going to blind the whole street when we fire it up."
      }
    ]
  },
  {
    "number": 4,
    "title": "Bass Drop",
    "jobName": "Parametric Sound Equalizer Rack",
    "reason": "Sol wants to balance the low-end subwoofers in the getaway van so the bass rattling doesn't blow out the speakers.",
    "short": "EQUALIZER",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Too many street advertisements humming out here. We need real music on this block."
          },
          {
            "speaker": "vee",
            "text": "Music comes after the run. Clear the porches and keep the getaway clean."
          }
        ],
        "reactive": false
      },
      "7": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Six houses cleared. Keep bringing them out."
          },
          {
            "speaker": "sol",
            "text": "I’ll need you at house 9. Found something loud for the sound rig. I’ll brief you before you go in."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Door 9. In the violet case is a pro-grade parametric audio equalizer. Carry both the case and the stash to the getaway car."
          },
          {
            "speaker": "vee",
            "text": "An audio processor? You really can't go five minutes without rattling windows, can you?"
          },
          {
            "speaker": "sol",
            "text": "You can't have a street showcase without chest-thumping bass, Vee! Bring both items to the trunk, runner!"
          }
        ],
        "reactive": false
      },
      "13": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses remain. Don't lose your focus on the final stretch."
          }
        ],
        "reactive": true,
        "fallback": "AL_VEE_NEUT_03",
        "eligibleIDs": [
          "AL_VEE_ZDEATH_01",
          "AL_VEE_ZDEATH_02",
          "AL_VEE_ZDEATH_03",
          "AL_VEE_ZDEATH_04",
          "AL_VEE_ZDEATH_05",
          "AL_VEE_ZDEATH_06",
          "AL_VEE_UNTOUCH_01",
          "AL_VEE_UNTOUCH_02",
          "AL_VEE_UNTOUCH_03",
          "AL_VEE_UNTOUCH_04",
          "AL_VEE_UNTOUCH_05",
          "AL_VEE_UNTOUCH_06",
          "AL_VEE_COMEBACK_01",
          "AL_VEE_COMEBACK_02",
          "AL_VEE_COMEBACK_03",
          "AL_VEE_COMEBACK_04",
          "AL_VEE_COMEBACK_05",
          "AL_VEE_NOPOW_01",
          "AL_VEE_NOPOW_02",
          "AL_VEE_NOPOW_03",
          "AL_VEE_NOPOW_04",
          "AL_VEE_NOPOW_05",
          "AL_VEE_NOPOW_06",
          "AL_VEE_BUNK_01",
          "AL_VEE_BUNK_02",
          "AL_VEE_BUNK_03",
          "AL_VEE_BUNK_04",
          "AL_VEE_BUNK_05",
          "AL_VEE_BUNK_06",
          "AL_VEE_PHASE_01",
          "AL_VEE_PHASE_02",
          "AL_VEE_PHASE_03",
          "AL_VEE_PHASE_04",
          "AL_VEE_PHASE_05",
          "AL_VEE_PHASE_06",
          "AL_VEE_DASH_01",
          "AL_VEE_DASH_02",
          "AL_VEE_DASH_03",
          "AL_VEE_DASH_04",
          "AL_VEE_DASH_05",
          "AL_VEE_DECOY_01",
          "AL_VEE_DECOY_02",
          "AL_VEE_DECOY_03",
          "AL_VEE_DECOY_04",
          "AL_VEE_DECOY_05",
          "AL_VEE_DECOY_06"
        ]
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Sixty doors cleared in {city}. Retail district is officially claimed under Afterlight."
      },
      {
        "speaker": "sol",
        "text": "Equalizer is wired in. The van’s audio hits so hard it shook the mirror right off the windshield."
      }
    ]
  },
  {
    "number": 5,
    "title": "Signature Pattern",
    "jobName": "Laser-Cut Mylar Stencil Portfolio",
    "reason": "Vee's multi-layered crew logo stencils were left behind in an abandoned safe house.",
    "short": "STENCIL BINDER",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Wide manicured lawns out here. Keep your movements sharp and don't linger in the hallways."
          },
          {
            "speaker": "sol",
            "text": "Quick steps across the grass, grab the bag, and sprint for the street."
          }
        ],
        "reactive": false
      },
      "4": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "vee",
            "text": "Sol will need a hand at house 9. He’ll explain what we're pulling before you take that entrance. Stay on task."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "House 9. Inside the violet case is Vee’s laser-cut Mylar stencil binder. Both the case and the stash must reach the car."
          },
          {
            "speaker": "vee",
            "text": "My multi-layer logo masters. With those, we can drop forty clean crew insignias in under an hour."
          },
          {
            "speaker": "sol",
            "text": "Don't bend the plastic sheets, runner! Grab the case, grab the bag, and sprint!"
          }
        ],
        "reactive": false
      },
      "10": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Six houses remain. Keep your stride measured all the way to the car."
          }
        ],
        "reactive": true,
        "fallback": "AL_VEE_NEUT_04",
        "eligibleIDs": [
          "AL_VEE_ZDEATH_01",
          "AL_VEE_ZDEATH_02",
          "AL_VEE_ZDEATH_03",
          "AL_VEE_ZDEATH_04",
          "AL_VEE_ZDEATH_05",
          "AL_VEE_ZDEATH_06",
          "AL_VEE_UNTOUCH_01",
          "AL_VEE_UNTOUCH_02",
          "AL_VEE_UNTOUCH_03",
          "AL_VEE_UNTOUCH_04",
          "AL_VEE_UNTOUCH_05",
          "AL_VEE_UNTOUCH_06",
          "AL_VEE_COMEBACK_01",
          "AL_VEE_COMEBACK_02",
          "AL_VEE_COMEBACK_03",
          "AL_VEE_COMEBACK_04",
          "AL_VEE_COMEBACK_05",
          "AL_VEE_NOPOW_01",
          "AL_VEE_NOPOW_02",
          "AL_VEE_NOPOW_03",
          "AL_VEE_NOPOW_04",
          "AL_VEE_NOPOW_05",
          "AL_VEE_NOPOW_06",
          "AL_VEE_BUNK_01",
          "AL_VEE_BUNK_02",
          "AL_VEE_BUNK_03",
          "AL_VEE_BUNK_04",
          "AL_VEE_BUNK_05",
          "AL_VEE_BUNK_06",
          "AL_VEE_PHASE_01",
          "AL_VEE_PHASE_02",
          "AL_VEE_PHASE_03",
          "AL_VEE_PHASE_04",
          "AL_VEE_PHASE_05",
          "AL_VEE_PHASE_06",
          "AL_VEE_DASH_01",
          "AL_VEE_DASH_02",
          "AL_VEE_DASH_03",
          "AL_VEE_DASH_04",
          "AL_VEE_DASH_05",
          "AL_VEE_DECOY_01",
          "AL_VEE_DECOY_02",
          "AL_VEE_DECOY_03",
          "AL_VEE_DECOY_04",
          "AL_VEE_DECOY_05",
          "AL_VEE_DECOY_06"
        ]
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Halfway through {city}. Seventy-five stashes logged on Afterlight's board."
      },
      {
        "speaker": "sol",
        "text": "And Vee’s stencils are back where they belong. The whole city is about to get painted."
      }
    ]
  },
  {
    "number": 6,
    "title": "High Glow",
    "jobName": "High-Voltage Solid-State Neon Transformer",
    "reason": "Vee needs a dedicated 12kV solid-state transformer to power the glowing violet logo display at the event stage.",
    "short": "NEON UNIT",
    "beats": {
      "4": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Dark industrial porches along this block. Keep your eyes up when you exit."
          },
          {
            "speaker": "vee",
            "text": "Darkness just means our neon stands out brighter. Clear the porches and keep running."
          }
        ],
        "reactive": false
      },
      "7": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Six houses cleared. Keep bringing them out."
          },
          {
            "speaker": "sol",
            "text": "I’ll need you at house 9 for a power unit. I’ll explain before that entrance. Keep pulling stashes."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Door 9. In the violet case is a solid-state neon transformer. You must bring that case along with the stash to extract."
          },
          {
            "speaker": "vee",
            "text": "Twelve thousand volts of pure cold illumination. That will light our stage from four blocks away."
          },
          {
            "speaker": "sol",
            "text": "Just don't touch the secondary terminals unless you want your hair permanently spiked! Both to the car, runner."
          }
        ],
        "reactive": false
      },
      "13": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses remain. Push through the final stretch."
          }
        ],
        "reactive": true,
        "fallback": "AL_VEE_NEUT_05",
        "eligibleIDs": [
          "AL_VEE_ZDEATH_01",
          "AL_VEE_ZDEATH_02",
          "AL_VEE_ZDEATH_03",
          "AL_VEE_ZDEATH_04",
          "AL_VEE_ZDEATH_05",
          "AL_VEE_ZDEATH_06",
          "AL_VEE_UNTOUCH_01",
          "AL_VEE_UNTOUCH_02",
          "AL_VEE_UNTOUCH_03",
          "AL_VEE_UNTOUCH_04",
          "AL_VEE_UNTOUCH_05",
          "AL_VEE_UNTOUCH_06",
          "AL_VEE_COMEBACK_01",
          "AL_VEE_COMEBACK_02",
          "AL_VEE_COMEBACK_03",
          "AL_VEE_COMEBACK_04",
          "AL_VEE_COMEBACK_05",
          "AL_VEE_NOPOW_01",
          "AL_VEE_NOPOW_02",
          "AL_VEE_NOPOW_03",
          "AL_VEE_NOPOW_04",
          "AL_VEE_NOPOW_05",
          "AL_VEE_NOPOW_06",
          "AL_VEE_BUNK_01",
          "AL_VEE_BUNK_02",
          "AL_VEE_BUNK_03",
          "AL_VEE_BUNK_04",
          "AL_VEE_BUNK_05",
          "AL_VEE_BUNK_06",
          "AL_VEE_PHASE_01",
          "AL_VEE_PHASE_02",
          "AL_VEE_PHASE_03",
          "AL_VEE_PHASE_04",
          "AL_VEE_PHASE_05",
          "AL_VEE_PHASE_06",
          "AL_VEE_DASH_01",
          "AL_VEE_DASH_02",
          "AL_VEE_DASH_03",
          "AL_VEE_DASH_04",
          "AL_VEE_DASH_05",
          "AL_VEE_DECOY_01",
          "AL_VEE_DECOY_02",
          "AL_VEE_DECOY_03",
          "AL_VEE_DECOY_04",
          "AL_VEE_DECOY_05",
          "AL_VEE_DECOY_06"
        ]
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Ninety houses down in our campaign ledger. The industrial block belongs to Afterlight."
      },
      {
        "speaker": "sol",
        "text": "Transformer is mounted. When we flip that switch, {city} will see our glow from space."
      }
    ]
  },
  {
    "number": 7,
    "title": "The Split Timer",
    "jobName": "Optical Beam Gate Telemetry Sensor",
    "reason": "Sol wants professional infrared timing gates to clock foot-sprint records across their finish line.",
    "short": "TIMING GATE",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Rivet yards and rail ties along this avenue. Mind your footing on the stairs and head straight for the curb."
          },
          {
            "speaker": "sol",
            "text": "Long open straightaways out here! Let's see some serious foot speed."
          }
        ],
        "reactive": false
      },
      "4": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "vee",
            "text": "Sol will need you at house 9. He found a precision telemetry unit. He’ll brief you before you enter."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "House 9. In the violet case is an optical beam-break timing gate. Both pickups—case and stash—are mandatory."
          },
          {
            "speaker": "vee",
            "text": "Laser timing gates? Sol, you're turning our street showcase into a drag strip."
          },
          {
            "speaker": "sol",
            "text": "Because speed matters, Vee! When runners sprint to the car, I want the exact numbers on display. Grab both items!"
          }
        ],
        "reactive": false
      },
      "10": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Six houses remain. Don't lose your composure on the threshold."
          }
        ],
        "reactive": true,
        "fallback": "AL_VEE_NEUT_06",
        "eligibleIDs": [
          "AL_VEE_ZDEATH_01",
          "AL_VEE_ZDEATH_02",
          "AL_VEE_ZDEATH_03",
          "AL_VEE_ZDEATH_04",
          "AL_VEE_ZDEATH_05",
          "AL_VEE_ZDEATH_06",
          "AL_VEE_UNTOUCH_01",
          "AL_VEE_UNTOUCH_02",
          "AL_VEE_UNTOUCH_03",
          "AL_VEE_UNTOUCH_04",
          "AL_VEE_UNTOUCH_05",
          "AL_VEE_UNTOUCH_06",
          "AL_VEE_COMEBACK_01",
          "AL_VEE_COMEBACK_02",
          "AL_VEE_COMEBACK_03",
          "AL_VEE_COMEBACK_04",
          "AL_VEE_COMEBACK_05",
          "AL_VEE_NOPOW_01",
          "AL_VEE_NOPOW_02",
          "AL_VEE_NOPOW_03",
          "AL_VEE_NOPOW_04",
          "AL_VEE_NOPOW_05",
          "AL_VEE_NOPOW_06",
          "AL_VEE_BUNK_01",
          "AL_VEE_BUNK_02",
          "AL_VEE_BUNK_03",
          "AL_VEE_BUNK_04",
          "AL_VEE_BUNK_05",
          "AL_VEE_BUNK_06",
          "AL_VEE_PHASE_01",
          "AL_VEE_PHASE_02",
          "AL_VEE_PHASE_03",
          "AL_VEE_PHASE_04",
          "AL_VEE_PHASE_05",
          "AL_VEE_PHASE_06",
          "AL_VEE_DASH_01",
          "AL_VEE_DASH_02",
          "AL_VEE_DASH_03",
          "AL_VEE_DASH_04",
          "AL_VEE_DASH_05",
          "AL_VEE_DECOY_01",
          "AL_VEE_DECOY_02",
          "AL_VEE_DECOY_03",
          "AL_VEE_DECOY_04",
          "AL_VEE_DECOY_05",
          "AL_VEE_DECOY_06"
        ]
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "One hundred and five stashes logged for Afterlight. The timing gates are home and ready for the showcase."
      },
      {
        "speaker": "sol",
        "text": "Timing gates are calibrated! Next runner who hits the curb gets their split time beamed to the big screen."
      }
    ]
  },
  {
    "number": 8,
    "title": "The Sound Horn",
    "jobName": "Cast-Aluminum Public Address Horn",
    "reason": "Sol wants a weatherproof cast-metal megaphone horn to blast track callouts across the harbor.",
    "short": "PA HORN",
    "beats": {
      "7": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Six houses cleared. Keep bringing them out."
          },
          {
            "speaker": "sol",
            "text": "I’ll need you at house 9. I found something loud to wake up the whole canal. I'll brief you before you enter."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "House 9. In the violet case is a cast-aluminum megaphone horn. Carry both the case and the stash out to the car."
          },
          {
            "speaker": "vee",
            "text": "A megaphone horn? As if your normal speaking voice wasn't already audible across three precincts."
          },
          {
            "speaker": "sol",
            "text": "This baby throws sound across half a mile of open water! Grab the case, grab the bag, and haul it to the street!"
          }
        ],
        "reactive": false
      },
      "10": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Six houses remain on this canal line. Keep moving."
          }
        ],
        "reactive": true,
        "fallback": "AL_SOL_NEUT_02",
        "eligibleIDs": [
          "AL_SOL_ZDEATH_01",
          "AL_SOL_ZDEATH_02",
          "AL_SOL_ZDEATH_03",
          "AL_SOL_ZDEATH_04",
          "AL_SOL_ZDEATH_05",
          "AL_SOL_ZDEATH_06",
          "AL_SOL_UNTOUCH_01",
          "AL_SOL_UNTOUCH_02",
          "AL_SOL_UNTOUCH_03",
          "AL_SOL_UNTOUCH_04",
          "AL_SOL_UNTOUCH_05",
          "AL_SOL_UNTOUCH_06",
          "AL_SOL_COMEBACK_01",
          "AL_SOL_COMEBACK_02",
          "AL_SOL_COMEBACK_03",
          "AL_SOL_COMEBACK_04",
          "AL_SOL_COMEBACK_05",
          "AL_SOL_COMEBACK_06",
          "AL_SOL_NOPOW_01",
          "AL_SOL_NOPOW_02",
          "AL_SOL_NOPOW_03",
          "AL_SOL_NOPOW_04",
          "AL_SOL_NOPOW_05",
          "AL_SOL_NOPOW_06",
          "AL_SOL_BUNK_01",
          "AL_SOL_BUNK_02",
          "AL_SOL_BUNK_03",
          "AL_SOL_BUNK_04",
          "AL_SOL_BUNK_05",
          "AL_SOL_PHASE_01",
          "AL_SOL_PHASE_02",
          "AL_SOL_PHASE_03",
          "AL_SOL_PHASE_04",
          "AL_SOL_PHASE_05",
          "AL_SOL_PHASE_06",
          "AL_SOL_DASH_01",
          "AL_SOL_DASH_02",
          "AL_SOL_DASH_03",
          "AL_SOL_DASH_04",
          "AL_SOL_DASH_05",
          "AL_SOL_DASH_06",
          "AL_SOL_DECOY_01",
          "AL_SOL_DECOY_02",
          "AL_SOL_DECOY_03",
          "AL_SOL_DECOY_04",
          "AL_SOL_DECOY_05",
          "AL_SOL_DECOY_06"
        ]
      },
      "13": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses remain. Finish the canal line and bring the haul back."
          }
        ],
        "reactive": false
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "One hundred and twenty houses logged. Canal sector is secured under Afterlight's colors."
      },
      {
        "speaker": "sol",
        "text": "(Speaks through the megaphone) TESTING ONE TWO! The entire harbor can hear us now!"
      }
    ]
  },
  {
    "number": 9,
    "title": "The Chrome Grip",
    "jobName": "Custom Anodized Billet Shift Knob",
    "reason": "Sol wants the weighted violet shift knob from an old street racer to complete the getaway car's cockpit.",
    "short": "SHIFT KNOB",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Steep incline on this ridge. Keep your stride measured on the walkways and don't stall in the halls."
          },
          {
            "speaker": "sol",
            "text": "From up here, our violet tags look like a neon constellation across the lower avenues."
          }
        ],
        "reactive": false
      },
      "4": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "sol",
            "text": "Look at that vista! {city} is practically primed for our finale."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Door 9. In the violet case is a weighted violet anodized shift knob. Both the case and the stash must reach the car."
          },
          {
            "speaker": "vee",
            "text": "A shift knob? You made our runner search a burglary house for cockpit jewelry?"
          },
          {
            "speaker": "sol",
            "text": "It's four hundred grams of billet aluminum and it matches our crew violet, Vee! Both items to the curb!"
          }
        ],
        "reactive": false
      },
      "13": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses remain. Finish the ridge run and bring it home."
          }
        ],
        "reactive": true,
        "fallback": "AL_VEE_NEUT_07",
        "eligibleIDs": [
          "AL_VEE_ZDEATH_01",
          "AL_VEE_ZDEATH_02",
          "AL_VEE_ZDEATH_03",
          "AL_VEE_ZDEATH_04",
          "AL_VEE_ZDEATH_05",
          "AL_VEE_ZDEATH_06",
          "AL_VEE_UNTOUCH_01",
          "AL_VEE_UNTOUCH_02",
          "AL_VEE_UNTOUCH_03",
          "AL_VEE_UNTOUCH_04",
          "AL_VEE_UNTOUCH_05",
          "AL_VEE_UNTOUCH_06",
          "AL_VEE_COMEBACK_01",
          "AL_VEE_COMEBACK_02",
          "AL_VEE_COMEBACK_03",
          "AL_VEE_COMEBACK_04",
          "AL_VEE_COMEBACK_05",
          "AL_VEE_NOPOW_01",
          "AL_VEE_NOPOW_02",
          "AL_VEE_NOPOW_03",
          "AL_VEE_NOPOW_04",
          "AL_VEE_NOPOW_05",
          "AL_VEE_NOPOW_06",
          "AL_VEE_BUNK_01",
          "AL_VEE_BUNK_02",
          "AL_VEE_BUNK_03",
          "AL_VEE_BUNK_04",
          "AL_VEE_BUNK_05",
          "AL_VEE_BUNK_06",
          "AL_VEE_PHASE_01",
          "AL_VEE_PHASE_02",
          "AL_VEE_PHASE_03",
          "AL_VEE_PHASE_04",
          "AL_VEE_PHASE_05",
          "AL_VEE_PHASE_06",
          "AL_VEE_DASH_01",
          "AL_VEE_DASH_02",
          "AL_VEE_DASH_03",
          "AL_VEE_DASH_04",
          "AL_VEE_DASH_05",
          "AL_VEE_DECOY_01",
          "AL_VEE_DECOY_02",
          "AL_VEE_DECOY_03",
          "AL_VEE_DECOY_04",
          "AL_VEE_DECOY_05",
          "AL_VEE_DECOY_06"
        ]
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "One hundred and thirty-five stashes cleared. Granite Ridge is secure and our palette dominates the skyline."
      },
      {
        "speaker": "sol",
        "text": "Shift knob is screwed onto the stick! The getaway car feels like a proper rocket now."
      }
    ]
  },
  {
    "number": 10,
    "title": "Midnight Klaxon",
    "jobName": "Antique Dual-Rotor Motorized Air-Raid Siren",
    "reason": "Sol wants an overwhelming mechanical siren to trigger the grand opening of their midnight street takeover.",
    "short": "AIR-RAID SIREN",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Fifteen more doors to finish our opening campaign. Bring every stash home, then we raise the curtain."
          },
          {
            "speaker": "sol",
            "text": "Every light, every speaker, every strobe is wired and waiting. Let’s close this out!"
          }
        ],
        "reactive": false
      },
      "4": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "vee",
            "text": "Sol will need you at house 9. He won't tell me what it is, but he’ll brief you before you go in."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Door 9. In the violet case is a motorized dual-rotor air-raid siren. Grab that case and the stash—both pickups are mandatory."
          },
          {
            "speaker": "vee",
            "text": "An air-raid siren? Sol, that will wake up the entire eastern seaboard!"
          },
          {
            "speaker": "sol",
            "text": "Exactly! When we claim {city}, I want the whole harbor shaking! Bring the case to the car!"
          }
        ],
        "reactive": false
      },
      "10": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Six houses remain in {city}. Leave nothing on the table."
          }
        ],
        "reactive": true,
        "fallback": "AL_VEE_NEUT_08",
        "eligibleIDs": [
          "AL_VEE_ZDEATH_01",
          "AL_VEE_ZDEATH_02",
          "AL_VEE_ZDEATH_03",
          "AL_VEE_ZDEATH_04",
          "AL_VEE_ZDEATH_05",
          "AL_VEE_ZDEATH_06",
          "AL_VEE_UNTOUCH_01",
          "AL_VEE_UNTOUCH_02",
          "AL_VEE_UNTOUCH_03",
          "AL_VEE_UNTOUCH_04",
          "AL_VEE_UNTOUCH_05",
          "AL_VEE_UNTOUCH_06",
          "AL_VEE_COMEBACK_01",
          "AL_VEE_COMEBACK_02",
          "AL_VEE_COMEBACK_03",
          "AL_VEE_COMEBACK_04",
          "AL_VEE_COMEBACK_05",
          "AL_VEE_NOPOW_01",
          "AL_VEE_NOPOW_02",
          "AL_VEE_NOPOW_03",
          "AL_VEE_NOPOW_04",
          "AL_VEE_NOPOW_05",
          "AL_VEE_NOPOW_06",
          "AL_VEE_BUNK_01",
          "AL_VEE_BUNK_02",
          "AL_VEE_BUNK_03",
          "AL_VEE_BUNK_04",
          "AL_VEE_BUNK_05",
          "AL_VEE_BUNK_06",
          "AL_VEE_PHASE_01",
          "AL_VEE_PHASE_02",
          "AL_VEE_PHASE_03",
          "AL_VEE_PHASE_04",
          "AL_VEE_PHASE_05",
          "AL_VEE_PHASE_06",
          "AL_VEE_DASH_01",
          "AL_VEE_DASH_02",
          "AL_VEE_DASH_03",
          "AL_VEE_DASH_04",
          "AL_VEE_DASH_05",
          "AL_VEE_DECOY_01",
          "AL_VEE_DECOY_02",
          "AL_VEE_DECOY_03",
          "AL_VEE_DECOY_04",
          "AL_VEE_DECOY_05",
          "AL_VEE_DECOY_06"
        ]
      },
      "13": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Three houses remain on the city grid. Run your line straight to the curb!"
          }
        ],
        "reactive": false
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "One hundred and fifty stashes logged for Afterlight. The opening campaign is complete. Every piece of the midnight showcase is home."
      },
      {
        "speaker": "sol",
        "text": "(Wails the siren) AWOOO-GA! That is the sound of absolute victory!"
      },
      {
        "speaker": "vee",
        "text": "Pack the sound truck, Sol. Our next set starts wherever the next block takes us."
      }
    ]
  }
]);
export const AFTERLIGHT_DIALOGUE_BANK = Object.freeze([
  {
    "id": "AL_VEE_ZDEATH_01",
    "category": "ZERO_DEATHS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Zero deaths on this stretch. Keep moving toward the next door."
  },
  {
    "id": "AL_VEE_ZDEATH_02",
    "category": "ZERO_DEATHS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Haven't lost you once on this block. Keep that fluid line going through the next door."
  },
  {
    "id": "AL_VEE_ZDEATH_03",
    "category": "ZERO_DEATHS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "No deaths logged. Stay sharp on your exits; don't give them an easy angle."
  },
  {
    "id": "AL_VEE_ZDEATH_04",
    "category": "ZERO_DEATHS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "You've stayed upright across this whole avenue. Keep that exact silhouette to the curb."
  },
  {
    "id": "AL_VEE_ZDEATH_05",
    "category": "ZERO_DEATHS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Zero wipeouts so far. That level of poise is what Afterlight looks for in a runner."
  },
  {
    "id": "AL_VEE_ZDEATH_06",
    "category": "ZERO_DEATHS",
    "speaker": "vee",
    "minChapter": 4,
    "text": "Still running without a fall. If you finish this clean, Sol might flash the amber strobe for you."
  },
  {
    "id": "AL_SOL_ZDEATH_01",
    "category": "ZERO_DEATHS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Not a single death on the board! Keep those feet moving toward the car."
  },
  {
    "id": "AL_SOL_ZDEATH_02",
    "category": "ZERO_DEATHS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Still alive across this whole stretch! Keep bringing the stashes out."
  },
  {
    "id": "AL_SOL_ZDEATH_03",
    "category": "ZERO_DEATHS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Zero wipeouts so far! Give the next door everything you've got."
  },
  {
    "id": "AL_SOL_ZDEATH_04",
    "category": "ZERO_DEATHS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "You haven't hit the pavement once this block! That keeps my adrenaline at redline."
  },
  {
    "id": "AL_SOL_ZDEATH_05",
    "category": "ZERO_DEATHS",
    "speaker": "sol",
    "minChapter": 3,
    "text": "Zero drops logged. Even Vee’s neon spray tips couldn't paint a cleaner line."
  },
  {
    "id": "AL_SOL_ZDEATH_06",
    "category": "ZERO_DEATHS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Still standing without a death! That’s pure high-velocity hustle right there."
  },
  {
    "id": "AL_VEE_UNTOUCH_01",
    "category": "FLAWLESS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your successful clears, zero bullet hits and zero drops. Your navigation through those halls has been artful."
  },
  {
    "id": "AL_VEE_UNTOUCH_02",
    "category": "FLAWLESS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your successful clears, zero bullet hits on your clears and no deaths this block. Keep maintaining that clean space."
  },
  {
    "id": "AL_VEE_UNTOUCH_03",
    "category": "FLAWLESS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your successful clears, untouched by gunfire and completely upright. Maintain that effortless composure."
  },
  {
    "id": "AL_VEE_UNTOUCH_04",
    "category": "FLAWLESS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your successful clears, flawless evasion on every clear so far. You're giving the defender nothing to frame."
  },
  {
    "id": "AL_VEE_UNTOUCH_05",
    "category": "FLAWLESS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your successful clears, zero hits taken and no wipeouts. Keep your transitions sharp and don't linger inside."
  },
  {
    "id": "AL_VEE_UNTOUCH_06",
    "category": "FLAWLESS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your successful clears, not a bullet hit on your clears and zero drops. That’s pure visual poetry in motion."
  },
  {
    "id": "AL_SOL_UNTOUCH_01",
    "category": "FLAWLESS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your successful clears, not a single bullet touched you and you haven't hit the deck! You're pure lightning out there."
  },
  {
    "id": "AL_SOL_UNTOUCH_02",
    "category": "FLAWLESS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your successful clears, zero lead caught and zero drops! You're dodging shots like you've got radar in your shoes."
  },
  {
    "id": "AL_SOL_UNTOUCH_03",
    "category": "FLAWLESS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your successful clears, zero bullet hits on your clears, zero wipeouts! Keep sprinting toward the car."
  },
  {
    "id": "AL_SOL_UNTOUCH_04",
    "category": "FLAWLESS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your successful clears, you haven't caught a bullet or taken a fall yet! Let's see you close out the block that way."
  },
  {
    "id": "AL_SOL_UNTOUCH_05",
    "category": "FLAWLESS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your successful clears, untouched by gunfire and still on your feet! That makes timing your splits a thrill."
  },
  {
    "id": "AL_SOL_UNTOUCH_06",
    "category": "FLAWLESS",
    "speaker": "sol",
    "minChapter": 9,
    "text": "On your successful clears, zero hits, zero drops! I ought to blast that megaphone horn just to celebrate your footwork."
  },
  {
    "id": "AL_VEE_COMEBACK_01",
    "category": "COMEBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "You took multiple failed runs earlier, but you regained your form. Keep your composure."
  },
  {
    "id": "AL_VEE_COMEBACK_02",
    "category": "COMEBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Several rough attempts behind you, but you recovered your line. Stay centered."
  },
  {
    "id": "AL_VEE_COMEBACK_03",
    "category": "COMEBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Rough attempts back there, but you brought the run back into focus. Keep moving to the car."
  },
  {
    "id": "AL_VEE_COMEBACK_04",
    "category": "COMEBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Multiple drops on this block, but you found the exit lane. Execute with grace on this next door."
  },
  {
    "id": "AL_VEE_COMEBACK_05",
    "category": "COMEBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Several deaths behind you this block. What matters is you're ready for the next door."
  },
  {
    "id": "AL_VEE_COMEBACK_06",
    "category": "COMEBACK",
    "speaker": "vee",
    "minChapter": 5,
    "text": "Took some failed runs on earlier doors. Take a breath—even our bass monitors need retuning sometimes."
  },
  {
    "id": "AL_SOL_COMEBACK_01",
    "category": "COMEBACK",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Took multiple spills on this street, but you bounced right back! That’s real racing spirit."
  },
  {
    "id": "AL_SOL_COMEBACK_02",
    "category": "COMEBACK",
    "speaker": "sol",
    "minChapter": 1,
    "text": "A few rough attempts back there, but you pulled through! Shake the dust off and floor it."
  },
  {
    "id": "AL_SOL_COMEBACK_03",
    "category": "COMEBACK",
    "speaker": "sol",
    "minChapter": 1,
    "text": "You took some failed runs this block, but you didn't quit! I love a runner with serious fight."
  },
  {
    "id": "AL_SOL_COMEBACK_04",
    "category": "COMEBACK",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Plenty of dropped runs behind you, but you're still sprinting! Eyes on the finish line, runner."
  },
  {
    "id": "AL_SOL_COMEBACK_05",
    "category": "COMEBACK",
    "speaker": "sol",
    "minChapter": 1,
    "text": "More than a couple bad landings this block. Grab the next bag and leave those wiped attempts in the dust."
  },
  {
    "id": "AL_SOL_COMEBACK_06",
    "category": "COMEBACK",
    "speaker": "sol",
    "minChapter": 7,
    "text": "Took some rough attempts and you're still running! You've got more drive than a tuned V8."
  },
  {
    "id": "AL_VEE_NOPOW_01",
    "category": "NO_POWERS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your successful clears, zero powers activated on your clears. You're navigating purely on poise and natural pace."
  },
  {
    "id": "AL_VEE_NOPOW_02",
    "category": "NO_POWERS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your successful clears, running unassisted without tapping any powers. Clean, minimalist execution in those rooms."
  },
  {
    "id": "AL_VEE_NOPOW_03",
    "category": "NO_POWERS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your successful clears, haven't leaned on a single power so far. Keep that natural silhouette moving straight to the car."
  },
  {
    "id": "AL_VEE_NOPOW_04",
    "category": "NO_POWERS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your successful clears, no power usage on those extractions. Pure unadorned footwork to the threshold."
  },
  {
    "id": "AL_VEE_NOPOW_05",
    "category": "NO_POWERS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your successful clears, bringing stashes in without activating powers. Trust your body's rhythm and keep running."
  },
  {
    "id": "AL_VEE_NOPOW_06",
    "category": "NO_POWERS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your successful clears, zero powers used on those clears. Crisp, classic style across every hallway."
  },
  {
    "id": "AL_SOL_NOPOW_01",
    "category": "NO_POWERS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your successful clears, haven't popped a single power so far! Pure leg power. You really like running all-natural."
  },
  {
    "id": "AL_SOL_NOPOW_02",
    "category": "NO_POWERS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your successful clears, zero powers triggered so far! Just raw sprinting hustle. I can definitely respect that."
  },
  {
    "id": "AL_SOL_NOPOW_03",
    "category": "NO_POWERS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your successful clears, haven't touched a power once on this avenue! Doing it the hard way keeps your reflexes twitchy."
  },
  {
    "id": "AL_SOL_NOPOW_04",
    "category": "NO_POWERS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your successful clears, hauling bags out without leaning on powers! If you like burning extra rubber, keep at it."
  },
  {
    "id": "AL_SOL_NOPOW_05",
    "category": "NO_POWERS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your successful clears, running completely unassisted! Just like driving a stick shift with zero power steering."
  },
  {
    "id": "AL_SOL_NOPOW_06",
    "category": "NO_POWERS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your successful clears, no powers burned across those clears! Pure raw throttle from the porch to the trunk."
  },
  {
    "id": "AL_VEE_BUNK_01",
    "category": "BUNK_BAGS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "You triggered multiple bunk bags before securing the stash. Focus your gaze before you commit."
  },
  {
    "id": "AL_VEE_BUNK_02",
    "category": "BUNK_BAGS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Touched a few false bags in those rooms. Don't let empty decoys ruin your composition."
  },
  {
    "id": "AL_VEE_BUNK_03",
    "category": "BUNK_BAGS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Had a couple bunk bags dissolve on you. Stay deliberate and spot the true haul."
  },
  {
    "id": "AL_VEE_BUNK_04",
    "category": "BUNK_BAGS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Popped multiple decoy bags on this stretch. Stay observant until your hands hit the stash."
  },
  {
    "id": "AL_VEE_BUNK_05",
    "category": "BUNK_BAGS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "A few empty bags touched along the way, but the stash reached the car. Refine your eye."
  },
  {
    "id": "AL_VEE_BUNK_06",
    "category": "BUNK_BAGS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Touching bunk bags is like painting with muddy brushes. Filter out the clutter and grab the score."
  },
  {
    "id": "AL_SOL_BUNK_01",
    "category": "BUNK_BAGS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Dissolved a few bunk bags in there! If you want useless junk, come dig through Vee’s paint rags."
  },
  {
    "id": "AL_SOL_BUNK_02",
    "category": "BUNK_BAGS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Hit multiple false bags on this block! Good thing you tracked down the stash before leaving."
  },
  {
    "id": "AL_SOL_BUNK_03",
    "category": "BUNK_BAGS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Had a couple fake bags pop on you this block! Keep your eyes peeled so you clock a faster split."
  },
  {
    "id": "AL_SOL_BUNK_04",
    "category": "BUNK_BAGS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Triggered some empty bags earlier! Just keep sprinting until you touch the stash that counts."
  },
  {
    "id": "AL_SOL_BUNK_05",
    "category": "BUNK_BAGS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Popped a few decoys this block! Reminds me of taking a bad turn on an unmapped back alley."
  },
  {
    "id": "AL_SOL_BUNK_06",
    "category": "BUNK_BAGS",
    "speaker": "sol",
    "minChapter": 11,
    "text": "Hit multiple bunk bags on this run! If I had that air-raid siren out here, I’d blast it for each one."
  },
  {
    "id": "AL_VEE_PHASE_01",
    "category": "POWER_PHASE",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, phase has been your primary tool this block. Ghosting through the room creates a striking silhouette."
  },
  {
    "id": "AL_VEE_PHASE_02",
    "category": "POWER_PHASE",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, you've been activating Phase more than your other powers. Keep your composure ready when you exit."
  },
  {
    "id": "AL_VEE_PHASE_03",
    "category": "POWER_PHASE",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, leaning heavily on Phase this block. It’s an elegant escape, as long as you keep moving forward."
  },
  {
    "id": "AL_VEE_PHASE_04",
    "category": "POWER_PHASE",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, triggering Phase frequently. Remember to commit to the sprint the second you solidify."
  },
  {
    "id": "AL_VEE_PHASE_05",
    "category": "POWER_PHASE",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, phase has been your dominant choice. It solves tight corners with flair, but keep your focus."
  },
  {
    "id": "AL_VEE_PHASE_06",
    "category": "POWER_PHASE",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, using Phase like negative space in a canvas. Dramatic, just make sure you don't get sloppy."
  },
  {
    "id": "AL_SOL_PHASE_01",
    "category": "POWER_PHASE",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, phase is leading your moves this block! Ghosting through walls looks wild, just keep your feet pumping."
  },
  {
    "id": "AL_SOL_PHASE_02",
    "category": "POWER_PHASE",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, you've leaned on Phase more than anything else! Beats hunting for an open door when the heat's on."
  },
  {
    "id": "AL_SOL_PHASE_03",
    "category": "POWER_PHASE",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, lots of Phase activations logged! If only I could phase past city traffic on Friday nights."
  },
  {
    "id": "AL_SOL_PHASE_04",
    "category": "POWER_PHASE",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, phase is your go-to on this stretch! Slipping out of sight is slick, but you still gotta sprint to the car."
  },
  {
    "id": "AL_SOL_PHASE_05",
    "category": "POWER_PHASE",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, triggering Phase more than anything else this block! Killer move, just keep your eyes on the curb."
  },
  {
    "id": "AL_SOL_PHASE_06",
    "category": "POWER_PHASE",
    "speaker": "sol",
    "minChapter": 7,
    "text": "On your clears, leaning on Phase again! That purple shimmer looks almost as bright as our neon transformer."
  },
  {
    "id": "AL_VEE_DASH_01",
    "category": "POWER_DASH",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, dash has been your dominant power this block. That sudden lunge cuts a sharp, aggressive line."
  },
  {
    "id": "AL_VEE_DASH_02",
    "category": "POWER_DASH",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, leaning on Dash more than the rest. Rapid acceleration, just keep your exit framed properly."
  },
  {
    "id": "AL_VEE_DASH_03",
    "category": "POWER_DASH",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, you've been triggering Dash quite a bit. Dynamic velocity, just don't overshoot your threshold."
  },
  {
    "id": "AL_VEE_DASH_04",
    "category": "POWER_DASH",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, dash is leading your runs so far. Hitting that burst works, provided your landing stays poised."
  },
  {
    "id": "AL_VEE_DASH_05",
    "category": "POWER_DASH",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, using Dash more than anything else. Dramatic burst of pace, but keep your eyes on the doorway."
  },
  {
    "id": "AL_VEE_DASH_06",
    "category": "POWER_DASH",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, dash has been your top tool this block. High-impact movement that commands attention in every hall."
  },
  {
    "id": "AL_SOL_DASH_01",
    "category": "POWER_DASH",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, dash has been your most-used power on this street! You hit that burst like you just dumped the nitrous."
  },
  {
    "id": "AL_SOL_DASH_02",
    "category": "POWER_DASH",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, triggering Dash more than anything else! Instant acceleration—now that is what I call velocity."
  },
  {
    "id": "AL_SOL_DASH_03",
    "category": "POWER_DASH",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, leaning on Dash this block! Rocketing straight toward the stash puts a massive smile on my face."
  },
  {
    "id": "AL_SOL_DASH_04",
    "category": "POWER_DASH",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, dash leads your choices so far! High-speed lunges are great, just keep your hands glued to the bag."
  },
  {
    "id": "AL_SOL_DASH_05",
    "category": "POWER_DASH",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, you favor that Dash burst this block! Fast legs cut down split times, so keep hitting that pedal."
  },
  {
    "id": "AL_SOL_DASH_06",
    "category": "POWER_DASH",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, dash leads the board this block! Move that fast at our street showcase and everyone’s jaw will hit the floor."
  },
  {
    "id": "AL_VEE_DECOY_01",
    "category": "POWER_DECOY",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, decoy is your go-to move this block. The double creates theatrical misdirection; keep your exit open."
  },
  {
    "id": "AL_VEE_DECOY_02",
    "category": "POWER_DECOY",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, you've been triggering Decoy more than your other powers. Keep your own part of the scene moving."
  },
  {
    "id": "AL_VEE_DECOY_03",
    "category": "POWER_DECOY",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, leaning on Decoy this block. Leaving a holographic clone behind is pure drama, provided you keep running."
  },
  {
    "id": "AL_VEE_DECOY_04",
    "category": "POWER_DECOY",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, decoy leads your activations on this stretch. Keep your line toward the curb in mind."
  },
  {
    "id": "AL_VEE_DECOY_05",
    "category": "POWER_DECOY",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, popping Decoy more than the rest. Excellent misdirection, as long as you don't hesitate at the door."
  },
  {
    "id": "AL_VEE_DECOY_06",
    "category": "POWER_DECOY",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, you favor Decoy on your clears. Leave the double its spotlight and keep running."
  },
  {
    "id": "AL_SOL_DECOY_01",
    "category": "POWER_DECOY",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, decoy has been your most-used power this block! Dropping a clone never gets old—pure chaos."
  },
  {
    "id": "AL_SOL_DECOY_02",
    "category": "POWER_DECOY",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, leaning on Decoy more than anything else! Like throwing a smoke grenade at a drag race."
  },
  {
    "id": "AL_SOL_DECOY_03",
    "category": "POWER_DECOY",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, lots of Decoy drops on this block! If I had a decoy at the shop, I'd send it to sit through Vee’s lectures."
  },
  {
    "id": "AL_SOL_DECOY_04",
    "category": "POWER_DECOY",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, decoy is leading your picks so far! Leaving a dummy behind while you haul the bag is pure hustle."
  },
  {
    "id": "AL_SOL_DECOY_05",
    "category": "POWER_DECOY",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, dropping Decoys all over the hallway this block! As long as you make for the getaway car, keep popping them."
  },
  {
    "id": "AL_SOL_DECOY_06",
    "category": "POWER_DECOY",
    "speaker": "sol",
    "minChapter": 4,
    "text": "On your clears, decoy leads your style this block! Almost as flashy as that amber strobe we recovered."
  },
  {
    "id": "AL_VEE_NEUT_01",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Keep your stride measured and your head up. Bring the next bag to the car."
  },
  {
    "id": "AL_VEE_NEUT_02",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Next porch is waiting. Find the stash, frame your exit, and sprint to the curb."
  },
  {
    "id": "AL_VEE_NEUT_03",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Keep your weight centered and your boots moving. Don't linger once your hands touch the bag."
  },
  {
    "id": "AL_VEE_NEUT_04",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Focus on the door right in front of you. One clear at a time puts Afterlight on the map."
  },
  {
    "id": "AL_VEE_NEUT_05",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Stay on the line and keep your eyes on the threshold. Get in and get out."
  },
  {
    "id": "AL_VEE_NEUT_06",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Check your footing before you cross that porch. Afterlight needs every bag accounted for."
  },
  {
    "id": "AL_VEE_NEUT_07",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Don't lose your rhythm now. Grab the bag, make your turn, and haul it out to the car."
  },
  {
    "id": "AL_VEE_NEUT_08",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Another door, another statement. Keep pulling bags and we'll have this avenue claimed."
  },
  {
    "id": "AL_SOL_NEUT_01",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Keep your boots moving! The getaway car is idling at the curb waiting for that stash."
  },
  {
    "id": "AL_SOL_NEUT_02",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Another house on the block! Grab the bag clean and hit top speed on the walkway."
  },
  {
    "id": "AL_SOL_NEUT_03",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "sol",
    "minChapter": 1,
    "text": "The car is running and the next porch is waiting! Scoop the stash and bring it to the curb."
  },
  {
    "id": "AL_SOL_NEUT_04",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Step up to the door, find the goods, and hit the pavement! Let's keep moving."
  },
  {
    "id": "AL_SOL_NEUT_05",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Keep pulling bags! The faster we clear these houses, the sooner we fire up the sound truck."
  },
  {
    "id": "AL_SOL_NEUT_06",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Keep your momentum moving forward! Don't get tangled up inside; grab the stash and go."
  },
  {
    "id": "AL_SOL_NEUT_07",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Another porch ready to breach! Keep your hands ready and your sprint straight to the car."
  },
  {
    "id": "AL_SOL_NEUT_08",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Stay locked in out there! Scoop the stash and let’s keep the scoreboard climbing."
  }
].map(line => Object.freeze(line)));
