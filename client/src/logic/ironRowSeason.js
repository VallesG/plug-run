// Iron Row Season 1: normalized from the final specification, not its earlier drafts.
// Import-free story data. No RNG, storage, rewards, maze changes or Rivals claims.
// Chapter is crew-owned and zero-based; world block/city labels are independent.
export const IRON_ROW_CHAPTERS = Object.freeze([
  {
    "number": 1,
    "title": "Asphalt Welcome",
    "jobName": "Industrial Burr Grinder",
    "reason": "Rook refuses to drink shop drip coffee that tastes like scorched hydraulic oil.",
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
        ],
        "reactive": false
      },
      "4": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "brick",
            "text": "Rook will need you at house 9. He’ll brief you before you step up to that entrance. For now, keep pulling bags."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Here's the play. Inside this house, there’s a violet case holding a steel burr coffee grinder. Grab that case and the stash before you make for the car. Both come with you."
          },
          {
            "speaker": "brick",
            "text": "A luxury bean mill? We're setting up a shop, Rook, not an espresso bar."
          },
          {
            "speaker": "rook",
            "text": "You want decent coffee before twelve-hour tear-downs or not? Don't leave without that case, runner."
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
        ]
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "Fifteen out of fifteen. First block of {city} is marked on our campaign map. That’s fifteen stashes accounted for."
      },
      {
        "speaker": "rook",
        "text": "And the grinder survived the ride. I'm setting it right next to the drill press."
      }
    ]
  },
  {
    "number": 2,
    "title": "Service Corridor",
    "jobName": "Pneumatic Impact Wrench",
    "reason": "Brick’s favorite half-inch impact wrench vanished two weeks ago; he suspects alley scrappers took it.",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Tight avenues out here. Watch your corners when you break out the front door."
          },
          {
            "speaker": "brick",
            "text": "Just run your line and get the bag to the trunk. We have work to do."
          }
        ],
        "reactive": false
      },
      "7": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Six houses cleared. Keep your boots moving."
          },
          {
            "speaker": "rook",
            "text": "I’ll need you at house 9 for a quick pickup. I’ll explain what to grab right before that door. Keep moving."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Target house. The violet case on the floor holds Brick’s heavy pneumatic impact wrench. You must carry both the case and the stash to the getaway car to clear the door."
          },
          {
            "speaker": "brick",
            "text": "Look at that—sitting right where those alley scrappers stashed it. Bring my iron home."
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
        ]
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "Thirty total stashes logged, and my favorite wrench is back in the rollaway."
      },
      {
        "speaker": "rook",
        "text": "Great. Now you can stop accusing me of borrowing it without asking."
      }
    ]
  },
  {
    "number": 3,
    "title": "Scrap Mile",
    "jobName": "Brass Ship Clock",
    "reason": "Brick hates high-pitch digital timers that trigger his headaches; wants a mechanical clock with a brass chime.",
    "beats": {
      "4": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses cleared. Keep moving down the street."
          },
          {
            "speaker": "brick",
            "text": "Rook will need a favor at house 9. He’ll give you the rundown before that porch. Keep moving."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Time for the pickup. There's an antique mechanical brass clock in the violet case on the floor. Remember: both the case and the stash must reach the car."
          },
          {
            "speaker": "brick",
            "text": "Real gears and a bell chime. Grab it so we finally have a clock that doesn't whine like an angry alternator."
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
        ]
      },
      "13": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses left. Close this block out."
          }
        ],
        "reactive": false
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "This block is in the bag. Forty-five total houses cleared for the Row."
      },
      {
        "speaker": "rook",
        "text": "And that brass clock is going on the wall right above your bench so you stop asking me when lunch starts."
      }
    ]
  },
  {
    "number": 4,
    "title": "Neon Strip",
    "jobName": "Portable Thermal Laminator",
    "reason": "Rook is tired of Brick dripping mustard and coffee onto their shop wiring diagrams.",
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
        ],
        "reactive": false
      },
      "7": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Six houses cleared. Keep the bags coming."
          },
          {
            "speaker": "rook",
            "text": "I’ll need you at house 9 for a special pickup. Brick’s going to call it unnecessary, so I’ll explain right before that door. Stay on it."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "House 9. The violet case has a portable thermal laminator inside. Grab that case along with the stash before heading for the car. Don't leave either behind."
          },
          {
            "speaker": "brick",
            "text": "An office laminator? We fix suspensions, Rook."
          },
          {
            "speaker": "rook",
            "text": "It's so your greasy lunch fingers stop ruining my brake line diagrams! Get both to the street, runner."
          }
        ]
      },
      "13": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses remain. Keep moving and finish this strip."
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
        ]
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "Block secured. Sixty doors down in {city}."
      },
      {
        "speaker": "rook",
        "text": "First thing getting laminated: the shop rules. Rule one is keep Brick’s pastrami away from the schematics."
      }
    ]
  },
  {
    "number": 5,
    "title": "Copper Terrace",
    "jobName": "Industrial Master Toggle Switch",
    "reason": "Brick wants a chunky manual switch for the shop bay door instead of twisting bare wires together.",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Wider porches on this avenue. Don't wander in the halls—find the stash and head straight back out the door."
          },
          {
            "speaker": "rook",
            "text": "Fast on your feet, runner."
          }
        ],
        "reactive": false
      },
      "4": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses cleared. Onto the next porch."
          },
          {
            "speaker": "brick",
            "text": "Rook will need a hand at house 9. He’ll tell you what’s in the case before you go in. Stick to the line."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Here we go. The violet case on the floor holds a heavy industrial toggle switch. You need that case and the stash in the trunk before the car rolls."
          },
          {
            "speaker": "brick",
            "text": "Solid bronze contacts. Rated for forty amps. Now we can open the main bay door without sparking the fuse panel."
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
        "text": "I'll wire that master toggle switch tomorrow. Assuming someone didn't misplace our insulated wire strippers."
      },
      {
        "speaker": "brick",
        "text": "Don't look at me. I haven't touched your toolbox all week."
      }
    ]
  },
  {
    "number": 6,
    "title": "Boiler Line",
    "jobName": "Cast-Iron Waffle Plates",
    "reason": "Brick is tired of cold protein bars and demands hot food to pair with Rook's burr-ground coffee.",
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
        ],
        "reactive": false
      },
      "7": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Six houses cleared. Keep on the line."
          },
          {
            "speaker": "rook",
            "text": "I’ll need you at house 9 for a hardware run. I’ll explain what to grab before that entrance. Keep pulling stashes."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "House 9. Inside the violet case is a set of heavy cast-iron waffle plates. Both the case and the stash have to reach the car to clear the door."
          },
          {
            "speaker": "brick",
            "text": "Heavy iron. Hot breakfast before dawn shifts. You got your fancy coffee grinder earlier; now we get real food."
          },
          {
            "speaker": "rook",
            "text": "Fair enough, but you're on cleanup duty. Don't leave without that case, runner."
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
        ]
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "Ninety houses down in our campaign ledger. Another block claimed."
      },
      {
        "speaker": "rook",
        "text": "Waffle plates are safely in the van. Tomorrow morning, we feast like civilized mechanics."
      }
    ]
  },
  {
    "number": 7,
    "title": "Rivet Flats",
    "jobName": "Handheld Metal Label Embosser",
    "reason": "Rook wants to stamp permanent metal tags on his tools because Brick constantly borrows and misplaces them.",
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
        ],
        "reactive": false
      },
      "4": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses cleared. Keep that van loaded."
          },
          {
            "speaker": "brick",
            "text": "Rook will need you at house 9. He’ll explain what he dug up before that door. Keep pulling bags."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Special job time. The violet case holds a mechanical label embosser that stamps metal tags. You need that case and the stash in the getaway car."
          },
          {
            "speaker": "brick",
            "text": "What are you going to label? The whole garage?"
          },
          {
            "speaker": "rook",
            "text": "Every single half-inch socket so they stop mysteriously walking over to your bench! Grab the case, runner."
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
        ]
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "One hundred and five doors in the win column. Flats are locked down."
      },
      {
        "speaker": "rook",
        "text": "Already stamped my first tag: 'ROOK'S WRENCH - DO NOT TOUCH, BRICK.'"
      }
    ]
  },
  {
    "number": 8,
    "title": "Canal Run",
    "jobName": "Heavy-Duty Hydraulic Stool Cylinder",
    "reason": "Brick threw his back out sitting on an overturned paint bucket; Rook found a replacement gas lift to fix their broken shop stool.",
    "beats": {
      "7": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Six houses cleared. Keep pulling bags."
          },
          {
            "speaker": "rook",
            "text": "I’ll need you at house 9. Brick’s back is giving him grief, so I found something useful. I’ll brief you before you enter."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "House 9. In the violet case is a heavy-duty pneumatic gas cylinder. Bring that case and the stash to the curb—both pickups are required to extract."
          },
          {
            "speaker": "brick",
            "text": "Wait, is that for the shop stool with the broken lift?"
          },
          {
            "speaker": "rook",
            "text": "Yes, so you can stop groaning like a rusty hinge every time you stand up from a paint bucket. Fetch it clean."
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
        ]
      },
      "13": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses remain. Finish the canal row and let's get back to the shop."
          }
        ],
        "reactive": false
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "One hundred and twenty houses cleared. The canal block is stamped for Iron Row."
      },
      {
        "speaker": "rook",
        "text": "And your back gets a cushioned hydraulic seat tomorrow. You're welcome."
      }
    ]
  },
  {
    "number": 9,
    "title": "Granite Ridge",
    "jobName": "High-CFM Blower Motor Core",
    "reason": "Between waffle smoke and summer heat, the shop air is foul; Rook wants to rebuild their exhaust fan.",
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
        ],
        "reactive": false
      },
      "4": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses cleared. Keep working up the incline."
          },
          {
            "speaker": "rook",
            "text": "Look down the slope—you can trace our entire route across {city} from here."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Door 9. The violet case holds an industrial blower motor core. You must bring that case along with the stash out to the car."
          },
          {
            "speaker": "brick",
            "text": "A blower motor? What happened to the shop fan?"
          },
          {
            "speaker": "rook",
            "text": "It choked on your waffle smoke and died two days ago. We need ventilation before we suffocate. Both items to the curb!"
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
        ]
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "One hundred and thirty-five stashes logged. Another block belongs to our crew."
      },
      {
        "speaker": "rook",
        "text": "The air up here is great. Soon as I wire that motor into the shop wall, the bay will smell like oxygen again."
      }
    ]
  },
  {
    "number": 10,
    "title": "Sovereign Center",
    "jobName": "Solid Brass Counter Bell",
    "reason": "Rook’s ultimate response to Brick constantly losing tools and asking where they are.",
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
        ],
        "reactive": false
      },
      "4": {
        "pages": [
          {
            "speaker": "brick",
            "text": "Three houses cleared. Keep moving to the next porch."
          },
          {
            "speaker": "brick",
            "text": "Rook will need you at house 9. He won't tell me what it is, but he’ll brief you before you step up to that door. Keep pulling bags."
          }
        ],
        "reactive": false
      },
      "9": {
        "pages": [
          {
            "speaker": "rook",
            "text": "This is it—door 9. Inside the violet case is a solid brass service counter bell. Grab the case, grab the stash, and sprint to the car. Both items mandatory."
          },
          {
            "speaker": "brick",
            "text": "A hotel service bell? Rook, what on earth do we need that for?"
          },
          {
            "speaker": "rook",
            "text": "For every time you ask where your wrench, your coffee, or your pastrami went! I’m dinging it right in your ear. Bring the case!"
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
        ]
      },
      "13": {
        "pages": [
          {
            "speaker": "rook",
            "text": "Three houses remain to lock down the city center. Stride it out all the way to the car."
          }
        ],
        "reactive": false
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "One hundred and fifty stashes for Iron Row. Ten whole blocks in our campaign ledger, and the garage is ready."
      },
      {
        "speaker": "rook",
        "text": "(Dings the brass bell) That’s the sound of clean books and a fully equipped garage."
      },
      {
        "speaker": "brick",
        "text": "Pack the getaway van, Rook. The shop's ready, but the next block won't run itself."
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
  return { id: 'keys', label: story.jobName.toUpperCase(), short: ['GRINDER','IMPACT WRENCH','BRASS CLOCK','LAMINATOR','MASTER SWITCH','WAFFLE PLATES','LABEL EMBOSSER','STOOL CYLINDER','BLOWER MOTOR','COUNTER BELL'][story.number - 1], name: story.jobName };
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
