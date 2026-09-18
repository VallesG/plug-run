// Iron Row Season 1: normalized from the final specification, not its earlier drafts.
// Import-free story data. No RNG, storage, rewards, maze changes or Rivals claims.
// Chapter is crew-owned and zero-based; world block/city labels are independent.
export const IRON_ROW_CHAPTERS = Object.freeze([
  {
    "number": 1,
    "title": "Asphalt Welcome",
    "jobName": "A ledger of every job the old crew never finished",
    "reason": "Brick found it wedged behind a workbench nobody's used in years. Somebody quit on this shop mid-sentence.",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "brick",
            "text": "First door of the season. Grab the stash, clear the hallway, and make your sprint straight to the car."
          },
          {
            "speaker": "rook",
            "text": "Don't stand around admiring the wallpaper. Move your boots."
          }
        ]
      },
      "4": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "brick",
            "text": "Rook's got something at house 9. He'll tell you before that door."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Here's the play. There's a ledger in the violet case — half the jobs in it never got closed out. Grab the case and the stash."
          },
          {
            "speaker": "brick",
            "text": "Somebody walked off this shop mid-job."
          },
          {
            "speaker": "rook",
            "text": "Or got walked off it. Grab the case and the bag, runner. Both come with you."
          }
        ]
      },
      "10": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Six houses remain on this stretch. Keep your line and finish what you started."
          }
        ],
        "reactive": true,
        "fallback": "IR_BRK_NEUT_01",
        "eligibleIDs": [
          "IR_BRK_ZDEATH_01",
          "IR_BRK_ZDEATH_02",
          "IR_BRK_ZDEATH_03",
          "IR_BRK_ZDEATH_04",
          "IR_BRK_ZDEATH_05",
          "IR_BRK_UNTOUCH_01",
          "IR_BRK_UNTOUCH_02",
          "IR_BRK_UNTOUCH_03",
          "IR_BRK_UNTOUCH_04",
          "IR_BRK_UNTOUCH_05",
          "IR_BRK_UNTOUCH_06",
          "IR_BRK_COMEBACK_01",
          "IR_BRK_COMEBACK_02",
          "IR_BRK_COMEBACK_03",
          "IR_BRK_COMEBACK_04",
          "IR_BRK_COMEBACK_05",
          "IR_BRK_NOPOW_01",
          "IR_BRK_NOPOW_02",
          "IR_BRK_NOPOW_03",
          "IR_BRK_NOPOW_04",
          "IR_BRK_NOPOW_05",
          "IR_BRK_NOPOW_06",
          "IR_BRK_BUNK_01",
          "IR_BRK_BUNK_02",
          "IR_BRK_BUNK_03",
          "IR_BRK_BUNK_04",
          "IR_BRK_BUNK_05",
          "IR_BRK_BUNK_06",
          "IR_BRK_PHASE_01",
          "IR_BRK_PHASE_02",
          "IR_BRK_PHASE_03",
          "IR_BRK_PHASE_04",
          "IR_BRK_PHASE_05",
          "IR_BRK_PHASE_06",
          "IR_BRK_DASH_01",
          "IR_BRK_DASH_02",
          "IR_BRK_DASH_03",
          "IR_BRK_DASH_04",
          "IR_BRK_DASH_05",
          "IR_BRK_DECOY_01",
          "IR_BRK_DECOY_02",
          "IR_BRK_DECOY_03",
          "IR_BRK_DECOY_04",
          "IR_BRK_DECOY_05",
          "IR_BRK_DECOY_06"
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "Fifteen out of fifteen. First block's marked."
      },
      {
        "speaker": "rook",
        "text": "That ledger's got names in it I don't recognize. Somebody worked this shop before us and stopped answering for it."
      }
    ]
  },
  {
    "number": 2,
    "title": "Service Corridor",
    "jobName": "A work jacket, too small for him now, IRON ROW stitched on the back in an older font",
    "reason": "It belonged to whoever ran this garage before Brick did. He's never said who.",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Tight avenues out here. Watch your corners on the way out."
          },
          {
            "speaker": "brick",
            "text": "Just get the bag to the trunk. We've got work."
          }
        ]
      },
      "7": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Six houses cleared. Keep your boots moving."
          },
          {
            "speaker": "rook",
            "text": "House 9's Brick's business, not mine. He'll explain before that door."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Door 9. There's a jacket in the violet case. Smaller size than mine. Old stitching. Grab the case and the stash."
          },
          {
            "speaker": "rook",
            "text": "You gonna say whose it was?"
          },
          {
            "speaker": "brick",
            "text": "Grab it and the bag, runner. Both come out, and neither one gets asked about again."
          }
        ]
      },
      "13": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses remain. Stay focused on the door in front of you and sprint to the car."
          }
        ],
        "reactive": true,
        "fallback": "IR_BRK_NEUT_02",
        "eligibleIDs": [
          "IR_BRK_ZDEATH_01",
          "IR_BRK_ZDEATH_02",
          "IR_BRK_ZDEATH_03",
          "IR_BRK_ZDEATH_04",
          "IR_BRK_ZDEATH_05",
          "IR_BRK_ZDEATH_06",
          "IR_BRK_UNTOUCH_01",
          "IR_BRK_UNTOUCH_02",
          "IR_BRK_UNTOUCH_03",
          "IR_BRK_UNTOUCH_04",
          "IR_BRK_UNTOUCH_05",
          "IR_BRK_UNTOUCH_06",
          "IR_BRK_COMEBACK_01",
          "IR_BRK_COMEBACK_02",
          "IR_BRK_COMEBACK_03",
          "IR_BRK_COMEBACK_04",
          "IR_BRK_COMEBACK_05",
          "IR_BRK_NOPOW_01",
          "IR_BRK_NOPOW_02",
          "IR_BRK_NOPOW_03",
          "IR_BRK_NOPOW_04",
          "IR_BRK_NOPOW_05",
          "IR_BRK_NOPOW_06",
          "IR_BRK_BUNK_01",
          "IR_BRK_BUNK_02",
          "IR_BRK_BUNK_03",
          "IR_BRK_BUNK_04",
          "IR_BRK_BUNK_05",
          "IR_BRK_BUNK_06",
          "IR_BRK_PHASE_01",
          "IR_BRK_PHASE_02",
          "IR_BRK_PHASE_03",
          "IR_BRK_PHASE_04",
          "IR_BRK_PHASE_05",
          "IR_BRK_PHASE_06",
          "IR_BRK_DASH_01",
          "IR_BRK_DASH_02",
          "IR_BRK_DASH_03",
          "IR_BRK_DASH_04",
          "IR_BRK_DASH_05",
          "IR_BRK_DECOY_01",
          "IR_BRK_DECOY_02",
          "IR_BRK_DECOY_03",
          "IR_BRK_DECOY_04",
          "IR_BRK_DECOY_05",
          "IR_BRK_DECOY_06"
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "Thirty stashes. Jacket's in the truck."
      },
      {
        "speaker": "rook",
        "text": "First thing you've kept from a house that wasn't tools or food. I'm not gonna ask."
      },
      {
        "speaker": "brick",
        "text": "Good."
      }
    ]
  },
  {
    "number": 3,
    "title": "Scrap Mile",
    "jobName": "A repair order, unsigned, for a car reported stolen two years ago",
    "reason": "Somebody in this neighborhood has been running plates that don't exist. Rook wants to know who taught them that trick.",
    "beats": {
      "4": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses cleared. Keep moving down the street."
          },
          {
            "speaker": "brick",
            "text": "Rook's got a favor at house 9. He'll give you the rundown before that porch."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Time for the pickup. The violet case holds a repair order, no signature, for a car that's supposed to not exist anymore. Grab the case and the stash."
          },
          {
            "speaker": "brick",
            "text": "Somebody's running ghost plates through a real shop."
          },
          {
            "speaker": "rook",
            "text": "Not our shop. Not yet, anyway. Grab the case and the bag."
          }
        ]
      },
      "10": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Six houses remain. Stride it out and keep moving to the next door."
          }
        ],
        "reactive": true,
        "fallback": "IR_ROK_NEUT_01",
        "eligibleIDs": [
          "IR_ROK_ZDEATH_01",
          "IR_ROK_ZDEATH_02",
          "IR_ROK_ZDEATH_03",
          "IR_ROK_ZDEATH_04",
          "IR_ROK_UNTOUCH_01",
          "IR_ROK_UNTOUCH_02",
          "IR_ROK_UNTOUCH_03",
          "IR_ROK_UNTOUCH_04",
          "IR_ROK_UNTOUCH_05",
          "IR_ROK_COMEBACK_01",
          "IR_ROK_COMEBACK_02",
          "IR_ROK_COMEBACK_03",
          "IR_ROK_COMEBACK_04",
          "IR_ROK_COMEBACK_05",
          "IR_ROK_NOPOW_01",
          "IR_ROK_NOPOW_02",
          "IR_ROK_NOPOW_03",
          "IR_ROK_NOPOW_04",
          "IR_ROK_NOPOW_05",
          "IR_ROK_BUNK_01",
          "IR_ROK_BUNK_02",
          "IR_ROK_BUNK_03",
          "IR_ROK_BUNK_04",
          "IR_ROK_BUNK_05",
          "IR_ROK_PHASE_01",
          "IR_ROK_PHASE_02",
          "IR_ROK_PHASE_03",
          "IR_ROK_PHASE_04",
          "IR_ROK_PHASE_05",
          "IR_ROK_DASH_01",
          "IR_ROK_DASH_02",
          "IR_ROK_DASH_03",
          "IR_ROK_DASH_04",
          "IR_ROK_DASH_05",
          "IR_ROK_DASH_06",
          "IR_ROK_DECOY_01",
          "IR_ROK_DECOY_02",
          "IR_ROK_DECOY_03",
          "IR_ROK_DECOY_04",
          "IR_ROK_DECOY_05"
        ],
        "minChapter": 0
      },
      "13": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses left. Close this block out."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "This block's in the bag. Forty-five total houses cleared for the Row."
      },
      {
        "speaker": "rook",
        "text": "Whoever taught that trick knew what they were doing. I want to know if they're still teaching it."
      }
    ]
  },
  {
    "number": 4,
    "title": "Neon Strip",
    "jobName": "A stack of unpaid invoices, addressed to businesses that don't exist on this street anymore",
    "reason": "Brick's shop is legit on paper. Somebody's been laundering through paper that isn't.",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Too many billboard lights out here. Makes my eyes ache."
          },
          {
            "speaker": "brick",
            "text": "Don't stare at the signs; watch the porch steps. Get the stash and get out."
          }
        ]
      },
      "7": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Six houses cleared. Keep the bags coming."
          },
          {
            "speaker": "rook",
            "text": "House 9's got paperwork in it. I'll explain before that door."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "House 9. The violet case has invoices in it — for shops that don't exist. Somebody's running money through addresses on this street that aren't real anymore. Grab the case and the stash."
          },
          {
            "speaker": "brick",
            "text": "That's not scrap work. That's somebody's whole business."
          },
          {
            "speaker": "rook",
            "text": "Which is exactly why it's not staying in this house. Grab the case, grab the bag."
          }
        ]
      },
      "13": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses remain. Keep moving."
          }
        ],
        "reactive": true,
        "fallback": "IR_BRK_NEUT_03",
        "eligibleIDs": [
          "IR_BRK_ZDEATH_01",
          "IR_BRK_ZDEATH_02",
          "IR_BRK_ZDEATH_03",
          "IR_BRK_ZDEATH_04",
          "IR_BRK_ZDEATH_05",
          "IR_BRK_ZDEATH_06",
          "IR_BRK_UNTOUCH_01",
          "IR_BRK_UNTOUCH_02",
          "IR_BRK_UNTOUCH_03",
          "IR_BRK_UNTOUCH_04",
          "IR_BRK_UNTOUCH_05",
          "IR_BRK_UNTOUCH_06",
          "IR_BRK_COMEBACK_01",
          "IR_BRK_COMEBACK_02",
          "IR_BRK_COMEBACK_03",
          "IR_BRK_COMEBACK_04",
          "IR_BRK_COMEBACK_05",
          "IR_BRK_NOPOW_01",
          "IR_BRK_NOPOW_02",
          "IR_BRK_NOPOW_03",
          "IR_BRK_NOPOW_04",
          "IR_BRK_NOPOW_05",
          "IR_BRK_NOPOW_06",
          "IR_BRK_BUNK_01",
          "IR_BRK_BUNK_02",
          "IR_BRK_BUNK_03",
          "IR_BRK_BUNK_04",
          "IR_BRK_BUNK_05",
          "IR_BRK_BUNK_06",
          "IR_BRK_PHASE_01",
          "IR_BRK_PHASE_02",
          "IR_BRK_PHASE_03",
          "IR_BRK_PHASE_04",
          "IR_BRK_PHASE_05",
          "IR_BRK_PHASE_06",
          "IR_BRK_DASH_01",
          "IR_BRK_DASH_02",
          "IR_BRK_DASH_03",
          "IR_BRK_DASH_04",
          "IR_BRK_DASH_05",
          "IR_BRK_DECOY_01",
          "IR_BRK_DECOY_02",
          "IR_BRK_DECOY_03",
          "IR_BRK_DECOY_04",
          "IR_BRK_DECOY_05",
          "IR_BRK_DECOY_06"
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "Block secured. Sixty doors down in {city}."
      },
      {
        "speaker": "rook",
        "text": "I know three of those business names. I'm gonna ask around, quiet."
      }
    ]
  },
  {
    "number": 5,
    "title": "Copper Terrace",
    "jobName": "A set of master keys, cut for buildings that changed locks a week ago",
    "reason": "Somebody wanted back into houses Iron Row already cleared. Rook doesn't like being followed.",
    "beats": {
      "4": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses cleared. Onto the next porch."
          },
          {
            "speaker": "brick",
            "text": "Rook's got something at house 9 that's got him quiet all morning. He'll explain before that door."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Here we go. Master keys in the violet case — freshly cut, for locks that changed a week ago. Somebody wanted back into houses we already ran. Grab the case and the stash."
          },
          {
            "speaker": "brick",
            "text": "Followed, or just late?"
          },
          {
            "speaker": "rook",
            "text": "Don't know yet. Grab the case and the bag — we figure that out at the shop, not the curb."
          }
        ]
      },
      "10": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Six houses remain. Keep your stride all the way to the curb."
          }
        ],
        "reactive": true,
        "fallback": "IR_BRK_NEUT_04",
        "eligibleIDs": [
          "IR_BRK_ZDEATH_01",
          "IR_BRK_ZDEATH_02",
          "IR_BRK_ZDEATH_03",
          "IR_BRK_ZDEATH_04",
          "IR_BRK_ZDEATH_05",
          "IR_BRK_ZDEATH_06",
          "IR_BRK_UNTOUCH_01",
          "IR_BRK_UNTOUCH_02",
          "IR_BRK_UNTOUCH_03",
          "IR_BRK_UNTOUCH_04",
          "IR_BRK_UNTOUCH_05",
          "IR_BRK_UNTOUCH_06",
          "IR_BRK_COMEBACK_01",
          "IR_BRK_COMEBACK_02",
          "IR_BRK_COMEBACK_03",
          "IR_BRK_COMEBACK_04",
          "IR_BRK_COMEBACK_05",
          "IR_BRK_NOPOW_01",
          "IR_BRK_NOPOW_02",
          "IR_BRK_NOPOW_03",
          "IR_BRK_NOPOW_04",
          "IR_BRK_NOPOW_05",
          "IR_BRK_NOPOW_06",
          "IR_BRK_BUNK_01",
          "IR_BRK_BUNK_02",
          "IR_BRK_BUNK_03",
          "IR_BRK_BUNK_04",
          "IR_BRK_BUNK_05",
          "IR_BRK_BUNK_06",
          "IR_BRK_PHASE_01",
          "IR_BRK_PHASE_02",
          "IR_BRK_PHASE_03",
          "IR_BRK_PHASE_04",
          "IR_BRK_PHASE_05",
          "IR_BRK_PHASE_06",
          "IR_BRK_DASH_01",
          "IR_BRK_DASH_02",
          "IR_BRK_DASH_03",
          "IR_BRK_DASH_04",
          "IR_BRK_DASH_05",
          "IR_BRK_DECOY_01",
          "IR_BRK_DECOY_02",
          "IR_BRK_DECOY_03",
          "IR_BRK_DECOY_04",
          "IR_BRK_DECOY_05",
          "IR_BRK_DECOY_06"
        ],
        "minChapter": 0
      },
      "1": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Wider porches on this avenue. Don't wander in the halls — find the stash and head straight back out the door."
          },
          {
            "speaker": "rook",
            "text": "Fast on your feet, runner."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "Halfway through our shop setup. Seventy-five stashes logged for Iron Row."
      },
      {
        "speaker": "rook",
        "text": "Whoever cut those keys knows our schedule better than I'm comfortable with."
      }
    ]
  },
  {
    "number": 6,
    "title": "Boiler Line",
    "jobName": "A torn Crossline route map, left where Brick would find it on purpose",
    "reason": "Somebody wanted Iron Row to know they'd been walked in on. Brick doesn't do subtle back.",
    "beats": {
      "4": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Loud pipe hum around these foundations. Keep your eyes up when you navigate the halls."
          },
          {
            "speaker": "brick",
            "text": "Hallway navigation is simple: grab the bag and move. Keep running."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "House 9. There's a route map in the violet case — Crossline's, torn on purpose, left right where I'd trip over it. Grab the case and the stash."
          },
          {
            "speaker": "brick",
            "text": "That's not an accident. That's Switch's crew telling us they know our floor plan."
          },
          {
            "speaker": "rook",
            "text": "Or telling us they want us to think that. Either way, grab the case and the bag. We're not leaving a message back — not yet."
          }
        ]
      },
      "13": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses remain. Push through the finish."
          }
        ],
        "reactive": true,
        "fallback": "IR_BRK_NEUT_05",
        "eligibleIDs": [
          "IR_BRK_ZDEATH_01",
          "IR_BRK_ZDEATH_02",
          "IR_BRK_ZDEATH_03",
          "IR_BRK_ZDEATH_04",
          "IR_BRK_ZDEATH_05",
          "IR_BRK_ZDEATH_06",
          "IR_BRK_UNTOUCH_01",
          "IR_BRK_UNTOUCH_02",
          "IR_BRK_UNTOUCH_03",
          "IR_BRK_UNTOUCH_04",
          "IR_BRK_UNTOUCH_05",
          "IR_BRK_UNTOUCH_06",
          "IR_BRK_COMEBACK_01",
          "IR_BRK_COMEBACK_02",
          "IR_BRK_COMEBACK_03",
          "IR_BRK_COMEBACK_04",
          "IR_BRK_COMEBACK_05",
          "IR_BRK_NOPOW_01",
          "IR_BRK_NOPOW_02",
          "IR_BRK_NOPOW_03",
          "IR_BRK_NOPOW_04",
          "IR_BRK_NOPOW_05",
          "IR_BRK_NOPOW_06",
          "IR_BRK_BUNK_01",
          "IR_BRK_BUNK_02",
          "IR_BRK_BUNK_03",
          "IR_BRK_BUNK_04",
          "IR_BRK_BUNK_05",
          "IR_BRK_BUNK_06",
          "IR_BRK_PHASE_01",
          "IR_BRK_PHASE_02",
          "IR_BRK_PHASE_03",
          "IR_BRK_PHASE_04",
          "IR_BRK_PHASE_05",
          "IR_BRK_PHASE_06",
          "IR_BRK_DASH_01",
          "IR_BRK_DASH_02",
          "IR_BRK_DASH_03",
          "IR_BRK_DASH_04",
          "IR_BRK_DASH_05",
          "IR_BRK_DECOY_01",
          "IR_BRK_DECOY_02",
          "IR_BRK_DECOY_03",
          "IR_BRK_DECOY_04",
          "IR_BRK_DECOY_05",
          "IR_BRK_DECOY_06"
        ],
        "minChapter": 0
      },
      "7": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Six houses cleared. Keep pulling bags."
          },
          {
            "speaker": "rook",
            "text": "I'll need you at house 9. Found something that's got me looking twice. I'll explain before that door."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "Ninety houses down in our campaign ledger."
      },
      {
        "speaker": "rook",
        "text": "If Crossline wants to leave notes on our floor, next time I'm leaving one on theirs. In person."
      }
    ]
  },
  {
    "number": 7,
    "title": "Rivet Flats",
    "jobName": "A payoff envelope, still sealed, addressed to nobody",
    "reason": "Somebody's been paying somebody to look away from this block. Rook wants to know who's on the other end before he decides whether to open it.",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Rails and gravel along this block. Watch your footing on the steps and sprint straight to the car."
          },
          {
            "speaker": "rook",
            "text": "Let's keep this moving."
          }
        ]
      },
      "4": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses cleared. Keep that van loaded."
          },
          {
            "speaker": "brick",
            "text": "Rook's got something heavier than usual at house 9. He'll brief you before that door."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Special job time. Sealed envelope in the violet case, cash-heavy, no name on it. Grab the case and the stash."
          },
          {
            "speaker": "brick",
            "text": "Somebody's paying somebody."
          },
          {
            "speaker": "rook",
            "text": "And I want to know which somebody, before I decide if we're the ones who get to keep it. Grab the case, runner."
          }
        ]
      },
      "10": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Six houses remain. Run through the threshold every time."
          }
        ],
        "reactive": true,
        "fallback": "IR_BRK_NEUT_06",
        "eligibleIDs": [
          "IR_BRK_ZDEATH_01",
          "IR_BRK_ZDEATH_02",
          "IR_BRK_ZDEATH_03",
          "IR_BRK_ZDEATH_04",
          "IR_BRK_ZDEATH_05",
          "IR_BRK_ZDEATH_06",
          "IR_BRK_UNTOUCH_01",
          "IR_BRK_UNTOUCH_02",
          "IR_BRK_UNTOUCH_03",
          "IR_BRK_UNTOUCH_04",
          "IR_BRK_UNTOUCH_05",
          "IR_BRK_UNTOUCH_06",
          "IR_BRK_COMEBACK_01",
          "IR_BRK_COMEBACK_02",
          "IR_BRK_COMEBACK_03",
          "IR_BRK_COMEBACK_04",
          "IR_BRK_COMEBACK_05",
          "IR_BRK_NOPOW_01",
          "IR_BRK_NOPOW_02",
          "IR_BRK_NOPOW_03",
          "IR_BRK_NOPOW_04",
          "IR_BRK_NOPOW_05",
          "IR_BRK_NOPOW_06",
          "IR_BRK_BUNK_01",
          "IR_BRK_BUNK_02",
          "IR_BRK_BUNK_03",
          "IR_BRK_BUNK_04",
          "IR_BRK_BUNK_05",
          "IR_BRK_BUNK_06",
          "IR_BRK_PHASE_01",
          "IR_BRK_PHASE_02",
          "IR_BRK_PHASE_03",
          "IR_BRK_PHASE_04",
          "IR_BRK_PHASE_05",
          "IR_BRK_PHASE_06",
          "IR_BRK_DASH_01",
          "IR_BRK_DASH_02",
          "IR_BRK_DASH_03",
          "IR_BRK_DASH_04",
          "IR_BRK_DASH_05",
          "IR_BRK_DECOY_01",
          "IR_BRK_DECOY_02",
          "IR_BRK_DECOY_03",
          "IR_BRK_DECOY_04",
          "IR_BRK_DECOY_05",
          "IR_BRK_DECOY_06"
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "One hundred and five doors in the win column."
      },
      {
        "speaker": "rook",
        "text": "Envelope's still sealed. Some things you open together or not at all."
      }
    ]
  },
  {
    "number": 8,
    "title": "Canal Run",
    "jobName": "A wedding ring, found months ago, that he never turned in",
    "reason": "Rook's kept it in his toolbox since a job that went sideways. He still means to find whoever lost it.",
    "beats": {
      "7": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Six houses cleared. Keep pulling bags."
          },
          {
            "speaker": "rook",
            "text": "House 9 is mine to explain. Give me the room."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "House 9. It's a ring, in the violet case. Not mine. Found it on a job months back — never turned it in, never sold it either. Grab the case and the stash."
          },
          {
            "speaker": "brick",
            "text": "Rook."
          },
          {
            "speaker": "rook",
            "text": "I know how it looks. I keep meaning to find who it belongs to. Grab it and the bag, runner. Both come out."
          }
        ]
      },
      "10": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Six houses remain on this canal stretch. Keep moving."
          }
        ],
        "reactive": true,
        "fallback": "IR_ROK_NEUT_02",
        "eligibleIDs": [
          "IR_ROK_ZDEATH_01",
          "IR_ROK_ZDEATH_02",
          "IR_ROK_ZDEATH_03",
          "IR_ROK_ZDEATH_04",
          "IR_ROK_ZDEATH_05",
          "IR_ROK_ZDEATH_06",
          "IR_ROK_UNTOUCH_01",
          "IR_ROK_UNTOUCH_02",
          "IR_ROK_UNTOUCH_03",
          "IR_ROK_UNTOUCH_04",
          "IR_ROK_UNTOUCH_05",
          "IR_ROK_UNTOUCH_06",
          "IR_ROK_COMEBACK_01",
          "IR_ROK_COMEBACK_02",
          "IR_ROK_COMEBACK_03",
          "IR_ROK_COMEBACK_04",
          "IR_ROK_COMEBACK_05",
          "IR_ROK_COMEBACK_06",
          "IR_ROK_NOPOW_01",
          "IR_ROK_NOPOW_02",
          "IR_ROK_NOPOW_03",
          "IR_ROK_NOPOW_04",
          "IR_ROK_NOPOW_05",
          "IR_ROK_NOPOW_06",
          "IR_ROK_BUNK_01",
          "IR_ROK_BUNK_02",
          "IR_ROK_BUNK_03",
          "IR_ROK_BUNK_04",
          "IR_ROK_BUNK_05",
          "IR_ROK_PHASE_01",
          "IR_ROK_PHASE_02",
          "IR_ROK_PHASE_03",
          "IR_ROK_PHASE_04",
          "IR_ROK_PHASE_05",
          "IR_ROK_PHASE_06",
          "IR_ROK_DASH_01",
          "IR_ROK_DASH_02",
          "IR_ROK_DASH_03",
          "IR_ROK_DASH_04",
          "IR_ROK_DASH_05",
          "IR_ROK_DASH_06",
          "IR_ROK_DECOY_01",
          "IR_ROK_DECOY_02",
          "IR_ROK_DECOY_03",
          "IR_ROK_DECOY_04",
          "IR_ROK_DECOY_05",
          "IR_ROK_DECOY_06"
        ],
        "minChapter": 0
      },
      "13": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Three houses remain. Finish the canal row and let's get back to the shop."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "rook",
        "text": "One hundred and twenty houses cleared. Ring's still in my toolbox."
      },
      {
        "speaker": "brick",
        "text": "You've had months."
      },
      {
        "speaker": "rook",
        "text": "I know. I'll find them. I always finish what I start — you know that better than anybody."
      }
    ]
  },
  {
    "number": 9,
    "title": "Granite Ridge",
    "jobName": "A city inspection notice, stamped, for a building that was never inspected",
    "reason": "Somebody's been forging paperwork to keep buildings on this block condemned. Rook wants to know who profits from that.",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Steep avenue here. Keep your stride measured on the walkways and don't stall inside the doors."
          },
          {
            "speaker": "rook",
            "text": "We take the ridge, we see the whole water from up here. Let's work."
          }
        ]
      },
      "4": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses cleared. Keep working up the incline."
          },
          {
            "speaker": "rook",
            "text": "Look down the slope — you can trace our entire route across {city} from here."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Door 9. City inspection notice, in the violet case — stamped, official-looking, and completely fake. Grab the case and the stash."
          },
          {
            "speaker": "brick",
            "text": "Fake how?"
          },
          {
            "speaker": "rook",
            "text": "Building's never been inspected a day in its life. Somebody wants it condemned on paper. Grab the case and the bag — I want to know who benefits."
          }
        ]
      },
      "13": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses remain. Finish the ridge run and bring it home."
          }
        ],
        "reactive": true,
        "fallback": "IR_BRK_NEUT_07",
        "eligibleIDs": [
          "IR_BRK_ZDEATH_01",
          "IR_BRK_ZDEATH_02",
          "IR_BRK_ZDEATH_03",
          "IR_BRK_ZDEATH_04",
          "IR_BRK_ZDEATH_05",
          "IR_BRK_ZDEATH_06",
          "IR_BRK_UNTOUCH_01",
          "IR_BRK_UNTOUCH_02",
          "IR_BRK_UNTOUCH_03",
          "IR_BRK_UNTOUCH_04",
          "IR_BRK_UNTOUCH_05",
          "IR_BRK_UNTOUCH_06",
          "IR_BRK_COMEBACK_01",
          "IR_BRK_COMEBACK_02",
          "IR_BRK_COMEBACK_03",
          "IR_BRK_COMEBACK_04",
          "IR_BRK_COMEBACK_05",
          "IR_BRK_COMEBACK_06",
          "IR_BRK_NOPOW_01",
          "IR_BRK_NOPOW_02",
          "IR_BRK_NOPOW_03",
          "IR_BRK_NOPOW_04",
          "IR_BRK_NOPOW_05",
          "IR_BRK_NOPOW_06",
          "IR_BRK_BUNK_01",
          "IR_BRK_BUNK_02",
          "IR_BRK_BUNK_03",
          "IR_BRK_BUNK_04",
          "IR_BRK_BUNK_05",
          "IR_BRK_BUNK_06",
          "IR_BRK_PHASE_01",
          "IR_BRK_PHASE_02",
          "IR_BRK_PHASE_03",
          "IR_BRK_PHASE_04",
          "IR_BRK_PHASE_05",
          "IR_BRK_PHASE_06",
          "IR_BRK_DASH_01",
          "IR_BRK_DASH_02",
          "IR_BRK_DASH_03",
          "IR_BRK_DASH_04",
          "IR_BRK_DASH_05",
          "IR_BRK_DASH_06",
          "IR_BRK_DECOY_01",
          "IR_BRK_DECOY_02",
          "IR_BRK_DECOY_03",
          "IR_BRK_DECOY_04",
          "IR_BRK_DECOY_05",
          "IR_BRK_DECOY_06"
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "One hundred and thirty-five stashes logged."
      },
      {
        "speaker": "rook",
        "text": "Somebody's making money off empty buildings nobody's allowed to fix. That's not scrap work. That's a business."
      }
    ]
  },
  {
    "number": 10,
    "title": "Sovereign Center",
    "jobName": "A courier's business card, left by a customer who never gave a name",
    "reason": "He paid cash, said the Row's reputation reaches Copper Bay now, and left before Rook could ask what that meant.",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Final stretch of our shop setup in {city}. Fifteen houses to close this chapter of our campaign ledger."
          },
          {
            "speaker": "rook",
            "text": "Let's run these porches like we built them."
          }
        ]
      },
      "4": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses cleared. Keep moving to the next porch."
          },
          {
            "speaker": "brick",
            "text": "Rook had a customer today he didn't like the look of. He'll explain before house 9."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "This is it — door 9. Guy came in this morning, paid cash, didn't leave a name. Left this card in the violet case instead. Grab the case and the stash."
          },
          {
            "speaker": "brick",
            "text": "What'd he want?"
          },
          {
            "speaker": "rook",
            "text": "Didn't ask for a repair. Just wanted to know if the Row was 'ready for Copper Bay work.' Then he left. Grab the case and the bag, runner."
          }
        ]
      },
      "10": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Six houses remain on this block. Leave nothing on the table."
          }
        ],
        "reactive": true,
        "fallback": "IR_BRK_NEUT_08",
        "eligibleIDs": [
          "IR_BRK_ZDEATH_01",
          "IR_BRK_ZDEATH_02",
          "IR_BRK_ZDEATH_03",
          "IR_BRK_ZDEATH_04",
          "IR_BRK_ZDEATH_05",
          "IR_BRK_ZDEATH_06",
          "IR_BRK_UNTOUCH_01",
          "IR_BRK_UNTOUCH_02",
          "IR_BRK_UNTOUCH_03",
          "IR_BRK_UNTOUCH_04",
          "IR_BRK_UNTOUCH_05",
          "IR_BRK_UNTOUCH_06",
          "IR_BRK_COMEBACK_01",
          "IR_BRK_COMEBACK_02",
          "IR_BRK_COMEBACK_03",
          "IR_BRK_COMEBACK_04",
          "IR_BRK_COMEBACK_05",
          "IR_BRK_COMEBACK_06",
          "IR_BRK_NOPOW_01",
          "IR_BRK_NOPOW_02",
          "IR_BRK_NOPOW_03",
          "IR_BRK_NOPOW_04",
          "IR_BRK_NOPOW_05",
          "IR_BRK_NOPOW_06",
          "IR_BRK_BUNK_01",
          "IR_BRK_BUNK_02",
          "IR_BRK_BUNK_03",
          "IR_BRK_BUNK_04",
          "IR_BRK_BUNK_05",
          "IR_BRK_BUNK_06",
          "IR_BRK_PHASE_01",
          "IR_BRK_PHASE_02",
          "IR_BRK_PHASE_03",
          "IR_BRK_PHASE_04",
          "IR_BRK_PHASE_05",
          "IR_BRK_PHASE_06",
          "IR_BRK_DASH_01",
          "IR_BRK_DASH_02",
          "IR_BRK_DASH_03",
          "IR_BRK_DASH_04",
          "IR_BRK_DASH_05",
          "IR_BRK_DASH_06",
          "IR_BRK_DECOY_01",
          "IR_BRK_DECOY_02",
          "IR_BRK_DECOY_03",
          "IR_BRK_DECOY_04",
          "IR_BRK_DECOY_05",
          "IR_BRK_DECOY_06"
        ],
        "minChapter": 0
      },
      "13": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Three houses remain to lock down the city center. Stride it out all the way to the car."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "One hundred and fifty stashes for Iron Row. Ten whole blocks in our campaign ledger, and the garage is ready."
      },
      {
        "speaker": "rook",
        "text": "That customer wasn't wrong about one thing — word's already crossed the water about us."
      },
      {
        "speaker": "brick",
        "text": "Copper Bay work. What's that supposed to mean."
      },
      {
        "speaker": "rook",
        "text": "Heavier stashes, from what I hear. And more than one set of hands waiting behind every door over there."
      },
      {
        "speaker": "brick",
        "text": "Then we go in ready, not curious. Pack the van, Rook. Whoever's asking about us on the other side of that water is about to get an answer."
      }
    ]
  }
].map(chapter => Object.freeze(chapter)));
export const IRON_ROW_DIALOGUE_BANK = Object.freeze([
  {
    "id": "IR_BRK_ZDEATH_01",
    "category": "ZERO_DEATHS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Haven't had to scrape you off the asphalt once this block. Keep your feet under you."
  },
  {
    "id": "IR_BRK_ZDEATH_02",
    "category": "ZERO_DEATHS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "You're still breathing and the van's still rolling. Keep your head down through the next door."
  },
  {
    "id": "IR_BRK_ZDEATH_03",
    "category": "ZERO_DEATHS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "No wipeouts yet. Stay mindful on the threshold and don't give anyone an easy target."
  },
  {
    "id": "IR_BRK_ZDEATH_04",
    "category": "ZERO_DEATHS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "You've stayed on your feet across this whole stretch. Keep that momentum going to the curb."
  },
  {
    "id": "IR_BRK_ZDEATH_05",
    "category": "ZERO_DEATHS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Still standing without dropping once. Keep bringing those stashes out to the street."
  },
  {
    "id": "IR_BRK_ZDEATH_06",
    "category": "ZERO_DEATHS",
    "speaker": "brick",
    "minChapter": 2,
    "text": "Haven't had to drag you back to the van yet. Finish this block and I might let you try Rook's fancy coffee."
  },
  {
    "id": "IR_ROK_ZDEATH_01",
    "category": "ZERO_DEATHS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Haven't seen you drop once so far. Makes my job waiting at the curb a whole lot quieter."
  },
  {
    "id": "IR_ROK_ZDEATH_02",
    "category": "ZERO_DEATHS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Still in one piece on this stretch. Keep running like that and we're home early."
  },
  {
    "id": "IR_ROK_ZDEATH_03",
    "category": "ZERO_DEATHS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Zero drops so far. Don't get careless just because you haven't taken a bad spill yet."
  },
  {
    "id": "IR_ROK_ZDEATH_04",
    "category": "ZERO_DEATHS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "You're still upright and the bags keep coming. I like runs that don't need a stretcher."
  },
  {
    "id": "IR_ROK_ZDEATH_05",
    "category": "ZERO_DEATHS",
    "speaker": "rook",
    "minChapter": 5,
    "text": "Haven't lost you once on this street. Keep this up and I'll laminate your name for the locker."
  },
  {
    "id": "IR_ROK_ZDEATH_06",
    "category": "ZERO_DEATHS",
    "speaker": "rook",
    "minChapter": 4,
    "text": "Still haven't dropped once. Even Brick's old brass clock is ticking along without an interruption."
  },
  {
    "id": "IR_BRK_UNTOUCH_01",
    "category": "FLAWLESS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "No bullet hits on your successful clears, and no deaths this block. That's sharp running."
  },
  {
    "id": "IR_BRK_UNTOUCH_02",
    "category": "FLAWLESS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "On your successful clears: zero hits taken and you haven't dropped once. Keep giving them nothing to shoot at."
  },
  {
    "id": "IR_BRK_UNTOUCH_03",
    "category": "FLAWLESS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "On your successful clears: you're dodging clean and staying completely upright. Keep that spacing tight on the next door."
  },
  {
    "id": "IR_BRK_UNTOUCH_04",
    "category": "FLAWLESS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "On your successful clears: no stray lead on your jacket and zero drops. Keep moving like that all the way to the car."
  },
  {
    "id": "IR_BRK_UNTOUCH_05",
    "category": "FLAWLESS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "On your successful clears: untouched and still standing. Keep your exits sharp and don't linger in the hallways."
  },
  {
    "id": "IR_BRK_UNTOUCH_06",
    "category": "FLAWLESS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "On your successful clears: not a bullet on you and no drops. Keep this up and my shop sewing kit stays in the drawer."
  },
  {
    "id": "IR_ROK_UNTOUCH_01",
    "category": "FLAWLESS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "On your successful clears: not a single bullet touched you and you haven't hit the deck. My first-aid kit stays closed."
  },
  {
    "id": "IR_ROK_UNTOUCH_02",
    "category": "FLAWLESS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "On your successful clears: no lead caught and zero drops. You're slipping past them clean as fresh grease."
  },
  {
    "id": "IR_ROK_UNTOUCH_03",
    "category": "FLAWLESS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "On your successful clears: zero bullet hits on your clears, zero drops this block. Keep moving; the van's waiting."
  },
  {
    "id": "IR_ROK_UNTOUCH_04",
    "category": "FLAWLESS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "On your successful clears: you haven't caught a bullet or taken a fall yet. Let's see you finish the block that way."
  },
  {
    "id": "IR_ROK_UNTOUCH_05",
    "category": "FLAWLESS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "On your successful clears: untouched by gunfire and still on your feet. That makes waiting out here a breeze."
  },
  {
    "id": "IR_ROK_UNTOUCH_06",
    "category": "FLAWLESS",
    "speaker": "rook",
    "minChapter": 8,
    "text": "On your successful clears: zero hits, zero drops. I should stamp a metal tag that says 'HANDLE WITH CARE' on your collar."
  },
  {
    "id": "IR_BRK_COMEBACK_01",
    "category": "COMEBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "You've taken a few hard knocks on this block, but you're still getting up. Keep pushing forward."
  },
  {
    "id": "IR_BRK_COMEBACK_02",
    "category": "COMEBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Took some rough falls back there, but you're back on your feet. Shake it off and focus on the door."
  },
  {
    "id": "IR_BRK_COMEBACK_03",
    "category": "COMEBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Scraped up from earlier runs, but you haven't quit. That kind of grit keeps this crew moving."
  },
  {
    "id": "IR_BRK_COMEBACK_04",
    "category": "COMEBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "You've hit the pavement multiple times on this stretch, but the bags keep coming. Finish hard."
  },
  {
    "id": "IR_BRK_COMEBACK_05",
    "category": "COMEBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Rough patch behind you. What matters is you're still standing and ready for the next threshold."
  },
  {
    "id": "IR_BRK_COMEBACK_06",
    "category": "COMEBACK",
    "speaker": "brick",
    "minChapter": 9,
    "text": "You've taken some real bruises today. Once we're back at the bay, you can rest on my hydraulic stool."
  },
  {
    "id": "IR_ROK_COMEBACK_01",
    "category": "COMEBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Took multiple spills on this street, but you bounced back. Iron bends before it breaks."
  },
  {
    "id": "IR_ROK_COMEBACK_02",
    "category": "COMEBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "A few bad drops back there, but you're still hauling bags to the curb. Dust your knees off."
  },
  {
    "id": "IR_ROK_COMEBACK_03",
    "category": "COMEBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "You've taken some hits today, but you didn't pack it in. I can respect a stubborn runner."
  },
  {
    "id": "IR_ROK_COMEBACK_04",
    "category": "COMEBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Plenty of rough pavement behind you, but you're still running. Keep your eyes on the car."
  },
  {
    "id": "IR_ROK_COMEBACK_05",
    "category": "COMEBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Took more than a couple hard landings today. Grab the next bag and leave those spills behind."
  },
  {
    "id": "IR_ROK_COMEBACK_06",
    "category": "COMEBACK",
    "speaker": "rook",
    "minChapter": 7,
    "text": "Took some serious bruises and you're still walking. Finish this block and I might fire up Brick's waffle plates for you."
  },
  {
    "id": "IR_BRK_NOPOW_01",
    "category": "NO_POWERS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "You've cleared every door so far without a power. Straight footwork to the curb."
  },
  {
    "id": "IR_BRK_NOPOW_02",
    "category": "NO_POWERS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "No powers on your successful runs. Good to see you trust your own two legs."
  },
  {
    "id": "IR_BRK_NOPOW_03",
    "category": "NO_POWERS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Every clear so far was unassisted. Keep your boots moving into the next house."
  },
  {
    "id": "IR_BRK_NOPOW_04",
    "category": "NO_POWERS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Zero powers used on those clears. Just you bringing the bags back to the street."
  },
  {
    "id": "IR_BRK_NOPOW_05",
    "category": "NO_POWERS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Bringing stashes in without a power on those clears. Trust your line and keep moving."
  },
  {
    "id": "IR_BRK_NOPOW_06",
    "category": "NO_POWERS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Pure legs and lungs on your winning runs—no powers. Like turning bolts with an old manual wrench."
  },
  {
    "id": "IR_ROK_NOPOW_01",
    "category": "NO_POWERS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Not a single power on your successful runs. You really like doing things the manual way."
  },
  {
    "id": "IR_ROK_NOPOW_02",
    "category": "NO_POWERS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Zero powers on those extracts. Getting the job done analog-style. I don't mind it."
  },
  {
    "id": "IR_ROK_NOPOW_03",
    "category": "NO_POWERS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "You haven't tapped a power on any clear this block. Old-school hustle suits this crew."
  },
  {
    "id": "IR_ROK_NOPOW_04",
    "category": "NO_POWERS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "No powers on those clears. If you like the extra sweat, keep running."
  },
  {
    "id": "IR_ROK_NOPOW_05",
    "category": "NO_POWERS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Every successful run so far was unassisted. Works like an old hand-crank drill."
  },
  {
    "id": "IR_ROK_NOPOW_06",
    "category": "NO_POWERS",
    "speaker": "rook",
    "minChapter": 8,
    "text": "No powers on those clears. I ought to stamp an 'ALL-NATURAL' tag for your jacket."
  },
  {
    "id": "IR_BRK_BUNK_01",
    "category": "BUNK_BAGS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Triggered a few bunk bags on your way to the stash. At least you found the score in the end."
  },
  {
    "id": "IR_BRK_BUNK_02",
    "category": "BUNK_BAGS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Hit some decoy sacks in there before finding the right one. Keep your eyes sharp."
  },
  {
    "id": "IR_BRK_BUNK_03",
    "category": "BUNK_BAGS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Had a couple bunk bags vanish on you today. Stay patient and keep scanning the rooms."
  },
  {
    "id": "IR_BRK_BUNK_04",
    "category": "BUNK_BAGS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Popped multiple false bags on this block. Keep your focus until your hands hit the stash."
  },
  {
    "id": "IR_BRK_BUNK_05",
    "category": "BUNK_BAGS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Touched a couple empty bags along the way, but the stash made it to the car. That’s what matters."
  },
  {
    "id": "IR_BRK_BUNK_06",
    "category": "BUNK_BAGS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Touching bunk bags is like grabbing the wrong wrench from the tray. Take a beat and spot the stash."
  },
  {
    "id": "IR_ROK_BUNK_01",
    "category": "BUNK_BAGS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Dissolved a few bunk bags in those halls. If you want empty clutter, come clean Brick's locker instead."
  },
  {
    "id": "IR_ROK_BUNK_02",
    "category": "BUNK_BAGS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Hit multiple false bags on this block. Good thing you tracked down the stash before heading out."
  },
  {
    "id": "IR_ROK_BUNK_03",
    "category": "BUNK_BAGS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Had a couple fake bags pop on you today. Keep your eyes peeled so you find the stash faster."
  },
  {
    "id": "IR_ROK_BUNK_04",
    "category": "BUNK_BAGS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Triggered some empty bags earlier. Just keep moving until you locate the stash that counts."
  },
  {
    "id": "IR_ROK_BUNK_05",
    "category": "BUNK_BAGS",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Popped a few decoys today. Reminds me of Brick digging through my bench and grabbing the wrong tool."
  },
  {
    "id": "IR_ROK_BUNK_06",
    "category": "BUNK_BAGS",
    "speaker": "rook",
    "minChapter": 11,
    "text": "Hit multiple bunk bags on this stretch. If I had my counter bell out here, I’d ding you for each one."
  },
  {
    "id": "IR_BRK_PHASE_01",
    "category": "POWER_PHASE",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Phase has been your main tool on this block. Handy move, just make sure you keep your balance."
  },
  {
    "id": "IR_BRK_PHASE_02",
    "category": "POWER_PHASE",
    "speaker": "brick",
    "minChapter": 1,
    "text": "You've been triggering Phase more than anything else. Keep your footing ready the second it ends."
  },
  {
    "id": "IR_BRK_PHASE_03",
    "category": "POWER_PHASE",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Leaning on Phase today. It’s a good shortcut, as long as you keep your feet moving toward the door."
  },
  {
    "id": "IR_BRK_PHASE_04",
    "category": "POWER_PHASE",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Popping Phase quite a bit. Just remember to commit to the sprint the moment you're solid."
  },
  {
    "id": "IR_BRK_PHASE_05",
    "category": "POWER_PHASE",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Phase has been your favorite pick today. It gets you out of a bind, but stay alert."
  },
  {
    "id": "IR_BRK_PHASE_06",
    "category": "POWER_PHASE",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Relying on Phase like a shop torch cutting through stubborn bolts. Good habit, just don't get careless."
  },
  {
    "id": "IR_ROK_PHASE_01",
    "category": "POWER_PHASE",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Phase is leading your moves today. Neat trick, just don't forget to run once it drops."
  },
  {
    "id": "IR_ROK_PHASE_02",
    "category": "POWER_PHASE",
    "speaker": "rook",
    "minChapter": 1,
    "text": "You've leaned on Phase more than your other powers. Beats hunting around for an open doorknob."
  },
  {
    "id": "IR_ROK_PHASE_03",
    "category": "POWER_PHASE",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Lots of Phase triggers so far. If only I could phase Brick's loose junk right off my workbench."
  },
  {
    "id": "IR_ROK_PHASE_04",
    "category": "POWER_PHASE",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Phase is your go-to on this stretch. Ghosting around is fine, but you still have to sprint the curb."
  },
  {
    "id": "IR_ROK_PHASE_05",
    "category": "POWER_PHASE",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Triggering Phase more than anything else today. Handy trick, just watch where you're heading."
  },
  {
    "id": "IR_ROK_PHASE_06",
    "category": "POWER_PHASE",
    "speaker": "rook",
    "minChapter": 7,
    "text": "Leaning on Phase again. If I could Phase out of the shop, I wouldn't have to smell Brick's burnt waffles."
  },
  {
    "id": "IR_BRK_DASH_01",
    "category": "POWER_DASH",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Dash has been your main play this block. You like that burst of speed. Keep your shoulders square."
  },
  {
    "id": "IR_BRK_DASH_02",
    "category": "POWER_DASH",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Leaning on Dash more than the rest. Fast acceleration, just stay in control when you hit the exit."
  },
  {
    "id": "IR_BRK_DASH_03",
    "category": "POWER_DASH",
    "speaker": "brick",
    "minChapter": 1,
    "text": "You've been popping Dash quite a bit today. Good burst, like dumping the clutch on a tuned motor."
  },
  {
    "id": "IR_BRK_DASH_04",
    "category": "POWER_DASH",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Dash is leading your runs so far. Hitting that sudden burst works, as long as your boots don't slide."
  },
  {
    "id": "IR_BRK_DASH_05",
    "category": "POWER_DASH",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Using Dash more than anything else. Quick burst of speed helps, but keep your eyes on the threshold."
  },
  {
    "id": "IR_BRK_DASH_06",
    "category": "POWER_DASH",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Dash has been your top trick. Quick burst across the room, kind of like how I move when dinner's ready."
  },
  {
    "id": "IR_ROK_DASH_01",
    "category": "POWER_DASH",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Dash has been your favorite power on this street. You hit that burst like you're running late for inspection."
  },
  {
    "id": "IR_ROK_DASH_02",
    "category": "POWER_DASH",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Triggering Dash more than anything else. Fast lunge, just make sure you don't trip over your own laces."
  },
  {
    "id": "IR_ROK_DASH_03",
    "category": "POWER_DASH",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Leaning on Dash today. A quick punch of speed toward the stash works fine by me."
  },
  {
    "id": "IR_ROK_DASH_04",
    "category": "POWER_DASH",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Dash leads your choices so far. Rocketing forward is fun, just keep your hands ready for the bag."
  },
  {
    "id": "IR_ROK_DASH_05",
    "category": "POWER_DASH",
    "speaker": "rook",
    "minChapter": 1,
    "text": "You favor that Dash burst on your clears. Keep your eyes on the car; the bag still needs an exit."
  },
  {
    "id": "IR_ROK_DASH_06",
    "category": "POWER_DASH",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Dash leads the board today. Move that fast back at the garage and I’ll put you on tire duty."
  },
  {
    "id": "IR_BRK_DECOY_01",
    "category": "POWER_DECOY",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Decoy is your go-to move this block. Dropping a distraction buys you room, so keep moving."
  },
  {
    "id": "IR_BRK_DECOY_02",
    "category": "POWER_DECOY",
    "speaker": "brick",
    "minChapter": 1,
    "text": "You've been triggering Decoy more than your other powers. Smart trick, just keep your own sprint going."
  },
  {
    "id": "IR_BRK_DECOY_03",
    "category": "POWER_DECOY",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Leaning on Decoy today. Leaving a clone behind is fine, as long as you don't slow down."
  },
  {
    "id": "IR_BRK_DECOY_04",
    "category": "POWER_DECOY",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Decoy leads your choices on this stretch. Giving them something else to look at keeps your lane open."
  },
  {
    "id": "IR_BRK_DECOY_05",
    "category": "POWER_DECOY",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Popping Decoy more than the rest. Good distraction tool, as long as you keep your exit in sight."
  },
  {
    "id": "IR_BRK_DECOY_06",
    "category": "POWER_DECOY",
    "speaker": "brick",
    "minChapter": 1,
    "text": "You favor that Decoy power. Leaving a double behind to draw eyes is an old shop trick. Keep running."
  },
  {
    "id": "IR_ROK_DECOY_01",
    "category": "POWER_DECOY",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Decoy has been your favorite power today. Dropping a holographic twin never gets old. Keep your boots moving."
  },
  {
    "id": "IR_ROK_DECOY_02",
    "category": "POWER_DECOY",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Leaning on Decoy more than anything else. Like leaving an empty coat on a stool to dodge a shift."
  },
  {
    "id": "IR_ROK_DECOY_03",
    "category": "POWER_DECOY",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Lots of Decoy drops on this block. If I had a decoy back at the garage, I'd send it to talk to Brick."
  },
  {
    "id": "IR_ROK_DECOY_04",
    "category": "POWER_DECOY",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Decoy is leading your picks so far. Leaving a diversion behind while you grab the stash is pure efficiency."
  },
  {
    "id": "IR_ROK_DECOY_05",
    "category": "POWER_DECOY",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Dropping Decoys all over the hallway today. As long as you keep moving toward the car, I won't complain."
  },
  {
    "id": "IR_ROK_DECOY_06",
    "category": "POWER_DECOY",
    "speaker": "rook",
    "minChapter": 7,
    "text": "Decoy leads your style this block. I wish I could drop a decoy to eat Brick’s burnt waffle rations."
  },
  {
    "id": "IR_BRK_NEUT_01",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Keep your stride measured and your head down. Bring the next bag to the car."
  },
  {
    "id": "IR_BRK_NEUT_02",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Next porch is waiting. Find the stash, take your corner, and sprint to the curb."
  },
  {
    "id": "IR_BRK_NEUT_03",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Keep your weight centered and your boots moving. Don't linger once your hands touch the bag."
  },
  {
    "id": "IR_BRK_NEUT_04",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Focus on the door right in front of you. One clear at a time puts iron on the map."
  },
  {
    "id": "IR_BRK_NEUT_05",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Stay on the line and keep your eyes on the threshold. Get in and get out."
  },
  {
    "id": "IR_BRK_NEUT_06",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Check your footing before you cross that porch. Iron Row needs every bag accounted for."
  },
  {
    "id": "IR_BRK_NEUT_07",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Don't let up now. Grab the bag, make your turn, and haul it out to the van."
  },
  {
    "id": "IR_BRK_NEUT_08",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Another door, another haul. Keep pulling bags and we'll have this street locked down."
  },
  {
    "id": "IR_ROK_NEUT_01",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Keep your boots moving. The van's idling at the curb waiting for that stash."
  },
  {
    "id": "IR_ROK_NEUT_02",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Another house on the block. Grab the bag clean and don't trip over the doormat."
  },
  {
    "id": "IR_ROK_NEUT_03",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "The van's idling. Scoop the stash and bring it to the curb."
  },
  {
    "id": "IR_ROK_NEUT_04",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Step up to the door, find the goods, and hit the pavement. Let's keep moving."
  },
  {
    "id": "IR_ROK_NEUT_05",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Keep pulling bags. The sooner we clear these houses, the sooner I get back to my workbench."
  },
  {
    "id": "IR_ROK_NEUT_06",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Keep your line moving forward. Don't get tangled up inside; grab the stash and go."
  },
  {
    "id": "IR_ROK_NEUT_07",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Another porch ready to crack. Keep your hands ready and your sprint straight to the car."
  },
  {
    "id": "IR_ROK_NEUT_08",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Stay on task out there. Scoop the stash and let’s keep the tally rolling."
  }
].map(line => Object.freeze(line)));
export const IRON_ROW_PRIORITY = Object.freeze(['flawless', 'comeback', 'noDeaths', 'noPowers', 'bunk', 'phase', 'dash', 'decoy']);
const categories = { flawless:'FLAWLESS', comeback:'COMEBACK', noDeaths:'ZERO_DEATHS', noPowers:'NO_POWERS', bunk:'BUNK_BAGS', phase:'POWER_PHASE', dash:'POWER_DASH', decoy:'POWER_DECOY' };
const validChapter = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const safeBlock = value => Number.isSafeInteger(value) && value > 0 ? value : 1;
const render = (text, cityName) => String(text).replaceAll('{city}', cityName || 'this city');
export function ironRowChapter(chapter = 0) {
  return IRON_ROW_CHAPTERS[validChapter(chapter)] || null;
}
/** Name only: the existing mechanical pickup sound and violet case stay intact. */
export function ironRowJob(chapter = 0) {
  const story = ironRowChapter(chapter);
  if (!story) return null;
  return { id: 'keys', label: story.jobName.toUpperCase(), short: ['LEDGER','OLD JACKET','REPAIR ORDER','INVOICES','MASTER KEYS','ROUTE MAP','ENVELOPE','THE RING','INSPECTION','BUSINESS CARD'][story.number - 1], name: story.jobName };
}
/** One fixed consultation per authored slot; blank slots really stay silent. */
export function ironRowCue({chapter = 0, house, blockIndex = 1, cityName, earnedPraise = [], usedPraise = [], telemetryComplete = false} = {}) {
  const story = ironRowChapter(chapter);
  const beat = story?.beats[house];
  if (!beat) return null;
  const pages = beat.pages.map(page => ({ ...page, text: render(page.text, cityName) }));
  let praiseKey = null, lineID = null;
  if (beat.reactive) {
    // Season 1 reserves one reactive slot per chapter and caps all categories
    // together. Existing contacts outside this season keep their original cap.
    const key = telemetryComplete && usedPraise.length === 0
      ? IRON_ROW_PRIORITY.find(id => earnedPraise.includes(id)) : null;
    const speaker = pages[0].speaker;
    const candidates = IRON_ROW_DIALOGUE_BANK.filter(line => line.speaker === speaker
      && line.category === categories[key] && beat.eligibleIDs.includes(line.id)
      && line.minChapter <= story.number);
    let line = null;
    if (key && candidates.length) {
      line = candidates[(safeBlock(blockIndex) * 17 + house * 7 + story.number * 13) % candidates.length];
      praiseKey = key;
    } else if (usedPraise.length === 0) {
      line = IRON_ROW_DIALOGUE_BANK.find(entry => entry.id === beat.fallback);
    }
    if (line) {
      // Only sentence 1 changes: keep authored encouragement, tease and job.
      const tail = pages[0].text.slice(pages[0].text.indexOf('.') + 1).trim();
      pages[0].text = line.text + (tail ? ' ' + tail : '');
      lineID = line.id;
    }
  }
  return {
    // Preserve existing claim identities across the manuscript upgrade,
    // including a Rook-led check-in that previously displayed Brick.
    eventID: 'contact/v1/block-' + safeBlock(blockIndex) + '/'
      + ({1:'open',4:'checkin-1',7:'tease',9:'brief',10:'debrief',13:'checkin-2'})[house]
      + '/' + (house === 9 ? 'rook' : 'brick'),
    beat: {id:({1:'open',4:'checkin-1',7:'tease',9:'brief',10:'debrief',13:'checkin-2'})[house],
      house, kind:house === 9 ? 'brief' : 'story'},
    pages, text:pages[0].text, speaker:pages[0].speaker, praiseKey, lineID,
    chapterLabel:'CHAPTER ' + story.number + ' · ' + story.title.toUpperCase(),
    action:'VIEW THE BLOCK  >>'
  };
}
export function ironRowFinish(chapter = 0, cityName) {
  const story = ironRowChapter(chapter);
  return story ? story.finish.map(page => ({...page, text:render(page.text, cityName)})) : null;
}
