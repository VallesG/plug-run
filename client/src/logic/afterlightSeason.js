// Season 1 normalized from AFTERLIGHT_SEASON_1.md. Manuscript prompts/citation/downloader debris are not runtime instructions.
// Import-free narrative data; no progression, rewards, maze mutations or RNG.
export const AFTERLIGHT_CHAPTERS = Object.freeze([
  {
    "number": 1,
    "title": "Opening Act",
    "jobName": "A guestlist, half-burned, for a showcase that already happened somewhere else",
    "reason": "Sol found it in the ash. Somebody already tried this exact idea before Afterlight did — and it didn't end well.",
    "short": "GUESTLIST",
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
        ]
      },
      "4": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "vee",
            "text": "Sol will need you at house 9. He'll brief you before you step up to that door. For now, keep pulling bags."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Door 9. In the violet case is a guestlist — half-burned, handwritten, for a party I've never heard of. Grab the case and the stash."
          },
          {
            "speaker": "vee",
            "text": "Someone already tried our idea?"
          },
          {
            "speaker": "sol",
            "text": "And stopped mid-list. Grab both items and sprint to the curb — we're finishing what they didn't."
          }
        ]
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
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Fifteen doors cleared. Our opening act is in the books."
      },
      {
        "speaker": "sol",
        "text": "And that guestlist's got names on it I want to ask around about. Quietly, for once."
      }
    ]
  },
  {
    "number": 2,
    "title": "Neon Ink",
    "jobName": "A rival mural, painted over in one night, still wet under the new coat",
    "reason": "Somebody erased somebody else's work fast and sloppy. Vee wants to know whose signature got buried.",
    "short": "BURIED MURAL",
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
        ]
      },
      "7": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Six houses cleared. Keep bringing them out."
          },
          {
            "speaker": "sol",
            "text": "I'll need you at house 9. Found something under fresh paint. I'll explain before that entrance."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Target door. The violet case holds somebody else's mural, photographed — buried under fresh paint, still wet. Grab the case and the stash."
          },
          {
            "speaker": "vee",
            "text": "Buried in one night? That's a rush job, not a redo."
          },
          {
            "speaker": "sol",
            "text": "Somebody wanted it gone fast. Grab both items — Vee's gonna want to see this before it fully dries."
          }
        ]
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
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Thirty stashes logged, and I know that signature style. Somebody's work got erased on purpose."
      },
      {
        "speaker": "sol",
        "text": "Not ours to fix tonight. But Vee's not gonna forget it."
      }
    ]
  },
  {
    "number": 3,
    "title": "Amber Beacon",
    "jobName": "A flyer for a showcase that never happened, dated last year",
    "reason": "Someone promised this block a night like the one Afterlight's building — and never showed up. Sol hates being compared to a no-show.",
    "short": "OLD FLYER",
    "beats": {
      "4": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "vee",
            "text": "Sol's got a favor at house 9. He'll lay out the pickup before you take that entrance."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Door 9. Flyer in the violet case, for a showcase — dated over a year ago. Never happened, near as I can tell. Grab the case and the stash."
          },
          {
            "speaker": "vee",
            "text": "Someone promised this block a night and never showed up."
          },
          {
            "speaker": "sol",
            "text": "Which means we're the first ones who actually will. Grab both items, runner — I want that flyer next to ours for comparison."
          }
        ]
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
        ],
        "minChapter": 0
      },
      "13": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses left. Close this commercial strip with style."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Forty-five houses logged for Afterlight. The commercial strip belongs to our campaign."
      },
      {
        "speaker": "sol",
        "text": "Whoever flaked on that old showcase, I hope they're watching this one."
      }
    ]
  },
  {
    "number": 4,
    "title": "Bass Drop",
    "jobName": "A rolled-up portfolio, edges soft from being carried too long",
    "reason": "It's Vee's. From an art program that rejected her application twice. She still has the letter folded inside it.",
    "short": "PORTFOLIO",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Wide sidewalks on this block. Keep it clean, keep it quick."
          },
          {
            "speaker": "sol",
            "text": "Copy. I'll hang back on the jokes tonight."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Door 9. It's — my old portfolio, in the violet case. Sketches from before any of this. Grab the case and the stash."
          },
          {
            "speaker": "sol",
            "text": "The one from the program?"
          },
          {
            "speaker": "vee",
            "text": "The one that said no twice. Grab it and the bag, runner. Both come out — I've carried worse without dropping it, I can carry this."
          }
        ]
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
        ],
        "minChapter": 0
      },
      "7": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "vee",
            "text": "House 9's mine this time, Sol. I'll explain before that door."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Sixty doors cleared. Portfolio's home."
      },
      {
        "speaker": "sol",
        "text": "For what it's worth — every wall you've tagged since is better than anything in a program that said no to you twice."
      },
      {
        "speaker": "vee",
        "text": "...Don't make this weird, Sol."
      },
      {
        "speaker": "sol",
        "text": "Too late. Already weird. Moving on."
      }
    ]
  },
  {
    "number": 5,
    "title": "Signature Pattern",
    "jobName": "A photograph of a mural that's since been torn down, a face scratched out of it",
    "reason": "Somebody didn't want to be remembered standing in front of that wall. Vee wants to know why.",
    "short": "OLD PHOTO",
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
        ]
      },
      "4": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "vee",
            "text": "Sol will need a hand at house 9. He'll explain what we're pulling before you take that entrance."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "House 9. The violet case holds a photograph of a mural that's gone now. Somebody scratched a face out of the picture. Grab the case and the stash."
          },
          {
            "speaker": "vee",
            "text": "On purpose?"
          },
          {
            "speaker": "sol",
            "text": "Deep enough to tear the paper. Grab the case, grab the bag, and sprint — I want Vee's eyes on this before we lose the light."
          }
        ]
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
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Halfway through {city}. Seventy-five stashes logged on Afterlight's board."
      },
      {
        "speaker": "sol",
        "text": "Whoever's in that photo didn't want to be found. Somebody found them anyway."
      }
    ]
  },
  {
    "number": 6,
    "title": "High Glow",
    "jobName": "A recording, cued up, of somebody badmouthing Afterlight's showcase to a paying crowd",
    "reason": "Somebody from Iron Row's been telling people the showcase is a cover for something smaller. Sol wants it played back loud enough for them to hear their own voice.",
    "short": "RECORDING",
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
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Door 9. The violet case holds a recording — a Row guy, telling a whole bar our showcase is smaller than it looks. Grab the case and the stash."
          },
          {
            "speaker": "vee",
            "text": "Small? Iron Row can barely fill a garage bay."
          },
          {
            "speaker": "sol",
            "text": "Grab the case and the bag, runner. I want this cued up loud enough that whoever said it hears it come back around."
          }
        ]
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
        ],
        "minChapter": 0
      },
      "7": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Six houses cleared. Keep bringing them out."
          },
          {
            "speaker": "vee",
            "text": "Sol will need you at house 9. He found something that's got him uneasy. He'll brief you there."
          }
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
        "text": "Let Iron Row talk about us in a garage. We'll be the ones lighting up the block they can't stop looking at."
      }
    ]
  },
  {
    "number": 7,
    "title": "The Split Timer",
    "jobName": "A stopwatch, professional grade, still running from whoever dropped it last",
    "reason": "Somebody was timing something on this block before Sol ever showed up. He wants to know what.",
    "short": "STOPWATCH",
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
        ]
      },
      "4": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "vee",
            "text": "Sol found a timing rig. He'll brief you at house 9."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "House 9. Stopwatch in the violet case, still running. Somebody was clocking something here before we ever showed up. Grab the case and the stash."
          },
          {
            "speaker": "vee",
            "text": "Clocking what, exactly?"
          },
          {
            "speaker": "sol",
            "text": "Don't know yet. But it's been running for hours — whatever they were timing, they never came back to stop it. Grab both items!"
          }
        ]
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
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "One hundred and five stashes logged for Afterlight."
      },
      {
        "speaker": "sol",
        "text": "Still running when we got it in the van. I finally stopped it myself. Felt weird doing that."
      }
    ]
  },
  {
    "number": 8,
    "title": "The Sound Horn",
    "jobName": "A megaphone, already rigged, playing someone else's message on a loop",
    "reason": "It was a warning, not an invitation, when they found it running. Sol wants to know who it was meant for.",
    "short": "MEGAPHONE LOOP",
    "beats": {
      "7": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Six houses cleared. Keep bringing them out."
          },
          {
            "speaker": "sol",
            "text": "I'll need you at house 9. Found something loud, already running. I'll brief you before you enter."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "House 9. The violet case holds a megaphone, already rigged, playing a message on a loop when I got there. Grab the case and the stash."
          },
          {
            "speaker": "vee",
            "text": "What's it say?"
          },
          {
            "speaker": "sol",
            "text": "Something about staying off a corner that isn't marked as anybody's. Grab the case, grab the bag, and haul it out — I want to hear the rest of this in the van."
          }
        ]
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
        ],
        "minChapter": 0
      },
      "13": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses remain. Finish the canal line and bring the haul back."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "One hundred and twenty houses logged."
      },
      {
        "speaker": "sol",
        "text": "Message looped forty more times before I finally cut the power. Whoever recorded it really wanted it heard."
      }
    ]
  },
  {
    "number": 9,
    "title": "The Chrome Grip",
    "jobName": "A regional track medal, scratched, in a box that hasn't been opened in years",
    "reason": "Sol's. From before whatever happened stopped him running for real. He's never told Vee the rest of it.",
    "short": "TRACK MEDAL",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Steep incline on this ridge. Keep your stride measured on the walkways and don't stall in the halls."
          },
          {
            "speaker": "sol",
            "text": "(quieter than usual) Yeah. Copy that."
          }
        ]
      },
      "4": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "sol",
            "text": "House 9's mine. I'll explain before that door. Don't make it a thing, Vee."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Door 9. It's a medal, in the violet case. Regional. Grab the case and the stash."
          },
          {
            "speaker": "vee",
            "text": "From when, Sol?"
          },
          {
            "speaker": "sol",
            "text": "Before whatever. Both come out, runner. That's the whole story you're getting tonight."
          }
        ]
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
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "sol",
        "text": "One hundred and thirty-five stashes cleared."
      },
      {
        "speaker": "vee",
        "text": "You've never once mentioned you actually ran track."
      },
      {
        "speaker": "sol",
        "text": "Because I don't. Not anymore. I just time other people doing it instead."
      },
      {
        "speaker": "vee",
        "text": "...Okay. I'm not gonna push."
      },
      {
        "speaker": "sol",
        "text": "Appreciate that. Ask me again in a year."
      }
    ]
  },
  {
    "number": 10,
    "title": "Midnight Klaxon",
    "jobName": "A hand-delivered invitation to a showcase across the water that Afterlight didn't organize",
    "reason": "Somebody in Copper Bay already knows Afterlight's name — and wants them to know the water doesn't stop them.",
    "short": "INVITATION",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Fifteen more doors to finish our opening campaign. Bring every stash home, then we raise the curtain."
          },
          {
            "speaker": "sol",
            "text": "Every light, every speaker, every strobe is wired and waiting. Let's close this out!"
          }
        ]
      },
      "4": {
        "pages": [
          {
            "speaker": "vee",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "vee",
            "text": "Sol got handed something weird tonight. He'll explain before house 9."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Door 9. In the violet case is an invite, hand-written, to a showcase in Copper Bay. We didn't send it, and we're not the ones running it. Grab the case and the stash."
          },
          {
            "speaker": "vee",
            "text": "Then who is?"
          },
          {
            "speaker": "sol",
            "text": "Didn't say. Just said our name, like they already know it. Grab the case and the bag."
          }
        ]
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
        ],
        "minChapter": 0
      },
      "13": {
        "pages": [
          {
            "speaker": "sol",
            "text": "Three houses remain on the city grid. Run your line straight to the curb!"
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "One hundred and fifty stashes logged for Afterlight. The opening campaign is complete."
      },
      {
        "speaker": "sol",
        "text": "And Copper Bay already knows our name before we've set foot over there."
      },
      {
        "speaker": "vee",
        "text": "The invite says the stashes run bigger on that side. Bigger stash, more security behind every door — more than one Plug, easy."
      },
      {
        "speaker": "sol",
        "text": "Somebody's throwing that whole showcase. Nobody signed the invitation."
      },
      {
        "speaker": "vee",
        "text": "Then we find out who before we walk into their room. Pack the sound truck, Sol. Copper Bay's about to meet us on our terms, not theirs."
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
