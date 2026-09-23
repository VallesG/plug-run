// Season 1, from "Plug Run - Season One Updated" (revised character + systems pass).
// Import-free story data: no RNG, storage, rewards, maze changes or Rivals claims.
// Chapter is crew-owned and zero-based; {city} is the block being played.
// Each beat is keyed by the house it plays before; house 15's script lines are
// the finish, after extraction. One beat per chapter is reactive: a line from
// the bank below, picked from what the block measured, opens it.
export const IRON_ROW_CHAPTERS = Object.freeze([
  {
    "number": 1,
    "title": "Asphalt Welcome",
    "jobName": "A ledger of every job the old crew never finished",
    "reason": "A ledger lists jobs the previous garage crew never finished. It ends mid-entry.",
    "short": "LEDGER",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "brick",
            "text": "First door. Bag to trunk. Keep the hallway boring."
          },
          {
            "speaker": "rook",
            "text": "Brick means “good luck,” in her special little way."
          },
          {
            "speaker": "brick",
            "text": "I did not."
          }
        ]
      },
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "brick",
            "text": "Three clear."
          },
          {
            "speaker": "rook",
            "text": "Look at us. Functional workplace. HR would be shaking. We do not have HR."
          }
        ]
      },
      "6": {
        "label": "BLOCK RIVALS TEASE",
        "pages": [
          {
            "speaker": "rook",
            "text": "Once we own all fifteen, Block Rivals opens. Seven-house race, head-to-head, powers picked before the start."
          },
          {
            "speaker": "brick",
            "text": "Earn the block first. Then race whoever wants it."
          }
        ],
        "rivalsTease": true
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "rook",
            "text": "Violet case has the old shop ledger. Half these jobs never got closed."
          },
          {
            "speaker": "brick",
            "text": "Last line?"
          },
          {
            "speaker": "rook",
            "text": "“Do not let Brick—” and then nothing."
          },
          {
            "speaker": "brick",
            "text": "Cute."
          },
          {
            "speaker": "rook",
            "text": "That is your scary voice. Runner, grab both."
          }
        ]
      },
      "10": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "rook",
            "text": "You know who wrote it?"
          },
          {
            "speaker": "brick",
            "text": "Six doors left."
          },
          {
            "speaker": "rook",
            "text": "Also a scary answer."
          }
        ],
        "reactive": true,
        "fallback": "IR_ROK_NEUT_01"
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "Fifteen."
      },
      {
        "speaker": "rook",
        "text": "Ledger has names I do not know."
      },
      {
        "speaker": "brick",
        "text": "Then we learn them."
      },
      {
        "speaker": "rook",
        "text": "See? “Good luck.” Brick by Brick, she is opening up."
      }
    ]
  },
  {
    "number": 2,
    "title": "Service Corridor",
    "jobName": "A work jacket, too small for her now, IRON ROW stitched on the back in an older font",
    "reason": "An old Iron Row work jacket, too small for Brick now, stitched in an older shop logo. It belonged to whoever ran the garage before her. Brick has never said who.",
    "short": "OLD JACKET",
    "tag": "personal",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "rook",
            "text": "New block, new me. I am choosing peace today."
          },
          {
            "speaker": "brick",
            "text": "Then choose it quietly."
          }
        ]
      },
      "7": {
        "label": "LOOK AHEAD",
        "pages": [
          {
            "speaker": "rook",
            "text": "Six clear. House nine is Brick business."
          },
          {
            "speaker": "brick",
            "text": "Do not call it that."
          },
          {
            "speaker": "rook",
            "text": "Brick-adjacent mystery?"
          },
          {
            "speaker": "brick",
            "text": "Worse."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "brick",
            "text": "Violet case. Old shop jacket. Small size. Old logo."
          },
          {
            "speaker": "rook",
            "text": "Hers?"
          },
          {
            "speaker": "brick",
            "text": "Do not."
          },
          {
            "speaker": "rook",
            "text": "Got it."
          },
          {
            "speaker": "brick",
            "text": "Runner, both come out. No folding it weird."
          }
        ]
      },
      "13": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "rook",
            "text": "I am not asking."
          },
          {
            "speaker": "brick",
            "text": "Good."
          },
          {
            "speaker": "rook",
            "text": "I am so not asking, it is basically a podcast."
          },
          {
            "speaker": "brick",
            "text": "You are somehow loud at silence."
          }
        ],
        "reactive": true,
        "fallback": "IR_ROK_NEUT_02"
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "Thirty total. Jacket is in my truck."
      },
      {
        "speaker": "rook",
        "text": "First thing you kept that was not a wrench, food, or evidence."
      },
      {
        "speaker": "brick",
        "text": "Go home, Rook."
      },
      {
        "speaker": "rook",
        "text": "See you tomorrow, boss."
      }
    ]
  },
  {
    "number": 3,
    "title": "Scrap Mile",
    "jobName": "A repair order, unsigned, for a car reported stolen two years ago",
    "reason": "An unsigned repair order belongs to a car reported stolen two years ago. Someone is running ghost plates through a real shop.",
    "short": "REPAIR ORDER",
    "beats": {
      "3": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "brick",
            "text": "Two clear."
          },
          {
            "speaker": "rook",
            "text": "House nine has paperwork for a car that legally does not exist."
          },
          {
            "speaker": "brick",
            "text": "My favorite kind of customer."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "rook",
            "text": "Repair order in the violet case. No signature. VIN comes back stolen two years ago."
          },
          {
            "speaker": "brick",
            "text": "Plate?"
          },
          {
            "speaker": "rook",
            "text": "Also fake."
          },
          {
            "speaker": "brick",
            "text": "So somebody taught them enough to be annoying."
          },
          {
            "speaker": "rook",
            "text": "Exactly. Grab both."
          }
        ]
      },
      "11": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "rook",
            "text": "You think old-shop work?"
          },
          {
            "speaker": "brick",
            "text": "I think guessing is how idiots become witnesses."
          }
        ],
        "reactive": true,
        "fallback": "IR_ROK_NEUT_03"
      },
      "13": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "brick",
            "text": "Three left."
          },
          {
            "speaker": "rook",
            "text": "Our runner is faster than my last tow truck."
          },
          {
            "speaker": "brick",
            "text": "Your last tow truck was on fire."
          },
          {
            "speaker": "rook",
            "text": "And it was still giving main character. Rest in pieces, Big Tow."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "Forty-five total."
      },
      {
        "speaker": "rook",
        "text": "Ghost-plate job was clean."
      },
      {
        "speaker": "brick",
        "text": "Too clean. Find who taught it."
      }
    ]
  },
  {
    "number": 4,
    "title": "Neon Strip",
    "jobName": "A stack of unpaid invoices, addressed to businesses that don't exist on this street anymore",
    "reason": "Unpaid invoices point to businesses that no longer exist. Someone is laundering money through dead addresses.",
    "short": "INVOICES",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "rook",
            "text": "This block is giving me a migraine."
          },
          {
            "speaker": "brick",
            "text": "You say that every time we leave the garage."
          },
          {
            "speaker": "rook",
            "text": "The garage gets me. The garage is my safe space."
          }
        ]
      },
      "7": {
        "label": "LOOK AHEAD",
        "pages": [
          {
            "speaker": "rook",
            "text": "Six clear. Paperwork at nine."
          },
          {
            "speaker": "brick",
            "text": "Real paperwork?"
          },
          {
            "speaker": "rook",
            "text": "Technically. Morally? Absolutely not."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "rook",
            "text": "Invoices in the violet case. Businesses closed years ago, money still moving through them."
          },
          {
            "speaker": "brick",
            "text": "Amounts?"
          },
          {
            "speaker": "rook",
            "text": "Enough that I suddenly feel underpaid."
          },
          {
            "speaker": "brick",
            "text": "You are underpaid."
          },
          {
            "speaker": "rook",
            "text": "Thank you."
          },
          {
            "speaker": "brick",
            "text": "Because you work for me."
          }
        ]
      },
      "13": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "brick",
            "text": "Three left."
          },
          {
            "speaker": "rook",
            "text": "I know two names on these invoices."
          },
          {
            "speaker": "brick",
            "text": "Ask quiet."
          }
        ],
        "reactive": true,
        "fallback": "IR_BRK_NEUT_01"
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "Sixty total."
      },
      {
        "speaker": "rook",
        "text": "This is not garage hustle. It is a system."
      },
      {
        "speaker": "brick",
        "text": "Then systems have owners."
      }
    ]
  },
  {
    "number": 5,
    "title": "Copper Terrace",
    "jobName": "A set of master keys, cut for buildings that changed locks a week ago",
    "reason": "Fresh master keys fit buildings whose locks changed only a week ago. Somebody is shadowing Iron Row’s schedule.",
    "short": "MASTER KEYS",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "brick",
            "text": "Bags only. Do not wander."
          },
          {
            "speaker": "rook",
            "text": "Translation: no sightseeing. {city} tourism board in shambles."
          }
        ]
      },
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "brick",
            "text": "Three clear."
          },
          {
            "speaker": "rook",
            "text": "House nine has fresh keys to fresh locks."
          },
          {
            "speaker": "brick",
            "text": "That sentence annoys me already."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "rook",
            "text": "Master keys. Cut this week. Fits places we already ran."
          },
          {
            "speaker": "brick",
            "text": "Followed or late?"
          },
          {
            "speaker": "rook",
            "text": "Either way, somebody knows our route."
          },
          {
            "speaker": "brick",
            "text": "Take the keys. Leave them the lock."
          }
        ]
      },
      "10": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "rook",
            "text": "That was cold."
          },
          {
            "speaker": "brick",
            "text": "That was practical."
          },
          {
            "speaker": "rook",
            "text": "Same car, different paint job."
          }
        ],
        "reactive": true,
        "fallback": "IR_ROK_NEUT_04"
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "Seventy-five total."
      },
      {
        "speaker": "rook",
        "text": "Whoever cut these knows our schedule."
      },
      {
        "speaker": "brick",
        "text": "Then tomorrow our schedule changes."
      },
      {
        "speaker": "rook",
        "text": "Love that. New route, who dis."
      }
    ]
  },
  {
    "number": 6,
    "title": "Boiler Line",
    "jobName": "A torn Crossline route map, left where Brick would find it on purpose",
    "reason": "A torn Crossline route map was left where Brick would find it. Whether it is a threat or bait is unclear.",
    "short": "ROUTE MAP",
    "tag": "rival",
    "beats": {
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "rook",
            "text": "Three clear. My ears are ringing."
          },
          {
            "speaker": "brick",
            "text": "You can survive noise."
          },
          {
            "speaker": "rook",
            "text": "Can I survive Crossline leaving arts and crafts on our floor?"
          }
        ]
      },
      "7": {
        "label": "LOOK AHEAD",
        "pages": [
          {
            "speaker": "brick",
            "text": "Six clear."
          },
          {
            "speaker": "rook",
            "text": "House nine has Switch’s route map. Torn. Dramatically."
          },
          {
            "speaker": "brick",
            "text": "He would hate the drama."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "rook",
            "text": "Violet case. Crossline map. Somebody ripped it in half and planted it here."
          },
          {
            "speaker": "brick",
            "text": "That is not Switch."
          },
          {
            "speaker": "rook",
            "text": "You sound sure."
          },
          {
            "speaker": "brick",
            "text": "He labels corners with a ruler. Man is physically incapable of a theatrical tear."
          },
          {
            "speaker": "rook",
            "text": "Fair. Grab it anyway."
          }
        ]
      },
      "13": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "brick",
            "text": "Three left."
          },
          {
            "speaker": "rook",
            "text": "So maybe somebody wants us mad at Crossline."
          },
          {
            "speaker": "brick",
            "text": "Then disappointing them costs nothing."
          }
        ],
        "reactive": true,
        "fallback": "IR_BRK_NEUT_02"
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "Ninety total."
      },
      {
        "speaker": "rook",
        "text": "I had a whole threatening note drafted."
      },
      {
        "speaker": "brick",
        "text": "Delete it."
      },
      {
        "speaker": "rook",
        "text": "It had a skull. The skull had a little wrench. It was torque of the town."
      },
      {
        "speaker": "brick",
        "text": "Especially delete it."
      }
    ]
  },
  {
    "number": 7,
    "title": "Rivet Flats",
    "jobName": "A payoff envelope, still sealed, addressed to nobody",
    "reason": "A sealed payoff envelope, heavy with cash and addressed to nobody, suggests somebody is being paid to look away.",
    "short": "ENVELOPE",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "brick",
            "text": "Hands on bags. Nothing else."
          },
          {
            "speaker": "rook",
            "text": "And if you find free money, legally it is ours."
          },
          {
            "speaker": "brick",
            "text": "That is not law."
          },
          {
            "speaker": "rook",
            "text": "It is case law. As in, it is in a case."
          },
          {
            "speaker": "brick",
            "text": "Walk."
          }
        ]
      },
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "rook",
            "text": "Three clear. House nine has an envelope that feels expensive."
          },
          {
            "speaker": "brick",
            "text": "Do not shake evidence."
          },
          {
            "speaker": "rook",
            "text": "I was appreciating density."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "rook",
            "text": "Sealed envelope. No name. Cash-heavy."
          },
          {
            "speaker": "brick",
            "text": "Open it?"
          },
          {
            "speaker": "rook",
            "text": "Not here."
          },
          {
            "speaker": "brick",
            "text": "Good answer."
          },
          {
            "speaker": "rook",
            "text": "Please note the growth."
          }
        ]
      },
      "11": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "brick",
            "text": "Five left."
          },
          {
            "speaker": "rook",
            "text": "You think somebody is paying inspectors?"
          },
          {
            "speaker": "brick",
            "text": "I think cash does not become innocent because it has stationery."
          }
        ],
        "reactive": true,
        "fallback": "IR_BRK_NEUT_03"
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "One-oh-five total."
      },
      {
        "speaker": "rook",
        "text": "Envelope is still sealed."
      },
      {
        "speaker": "brick",
        "text": "We open it together."
      },
      {
        "speaker": "rook",
        "text": "Aw."
      },
      {
        "speaker": "brick",
        "text": "Do not ruin it."
      }
    ]
  },
  {
    "number": 8,
    "title": "Canal Run",
    "jobName": "A wedding ring, found months ago, that he never turned in",
    "reason": "A wedding ring Rook found months ago on a job gone sideways. He kept it rather than sell it and still wants to return it.",
    "short": "THE RING",
    "tag": "personal",
    "beats": {
      "6": {
        "label": "LOOK AHEAD",
        "pages": [
          {
            "speaker": "brick",
            "text": "Five clear."
          },
          {
            "speaker": "rook",
            "text": "House nine is mine. Please be normal about it."
          },
          {
            "speaker": "brick",
            "text": "You asking that of me is offensive."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "rook",
            "text": "Violet case has a ring. Wedding band. Not mine."
          },
          {
            "speaker": "brick",
            "text": "The one from the old job?"
          },
          {
            "speaker": "rook",
            "text": "Yeah."
          },
          {
            "speaker": "brick",
            "text": "You still have it?"
          },
          {
            "speaker": "rook",
            "text": "I said please be normal."
          },
          {
            "speaker": "brick",
            "text": "Runner, both out."
          }
        ]
      },
      "10": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "brick",
            "text": "Months, Rook."
          },
          {
            "speaker": "rook",
            "text": "I know."
          },
          {
            "speaker": "brick",
            "text": "Why not sell it?"
          },
          {
            "speaker": "rook",
            "text": "Because somebody had a whole life attached to it. Feels cheap to turn that into gas money."
          }
        ],
        "reactive": true,
        "fallback": "IR_BRK_NEUT_04"
      },
      "13": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "rook",
            "text": "Three left."
          },
          {
            "speaker": "brick",
            "text": "Find the owner."
          },
          {
            "speaker": "rook",
            "text": "I will."
          },
          {
            "speaker": "brick",
            "text": "That was not a suggestion."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "rook",
        "text": "One-twenty total. Ring is back in my toolbox."
      },
      {
        "speaker": "brick",
        "text": "Temporary."
      },
      {
        "speaker": "rook",
        "text": "Temporary."
      }
    ]
  },
  {
    "number": 9,
    "title": "Granite Ridge",
    "jobName": "A city inspection notice, stamped, for a building that was never inspected",
    "reason": "A stamped city inspection notice is fake. Someone profits from keeping buildings condemned and empty.",
    "short": "INSPECTION",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "brick",
            "text": "Heads down. Bags out."
          },
          {
            "speaker": "rook",
            "text": "Motivational. Put that on a mug."
          },
          {
            "speaker": "brick",
            "text": "Then buy a mug."
          }
        ]
      },
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "rook",
            "text": "Three clear. I can see the garage from here."
          },
          {
            "speaker": "brick",
            "text": "Can the garage see you working?"
          },
          {
            "speaker": "rook",
            "text": "Crazy thing to say to a man mid-cardio."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "rook",
            "text": "Inspection notice. Official stamp. Building was never inspected."
          },
          {
            "speaker": "brick",
            "text": "Who benefits?"
          },
          {
            "speaker": "rook",
            "text": "Owner gets squeezed, property stays empty, somebody buys cheap."
          },
          {
            "speaker": "brick",
            "text": "There it is. Business wearing a city badge."
          }
        ]
      },
      "13": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "brick",
            "text": "Three left."
          },
          {
            "speaker": "rook",
            "text": "You hate fake paperwork more than actual crime."
          },
          {
            "speaker": "brick",
            "text": "Crime should at least have the courage to look like crime."
          }
        ],
        "reactive": true,
        "fallback": "IR_BRK_NEUT_05"
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "One-thirty-five total."
      },
      {
        "speaker": "rook",
        "text": "Whole ridge is being kept broken on purpose."
      },
      {
        "speaker": "brick",
        "text": "Then somebody made broken profitable."
      },
      {
        "speaker": "rook",
        "text": "There is a Copper Bay service rate buried in the packet. Almost double ours."
      },
      {
        "speaker": "brick",
        "text": "Because?"
      },
      {
        "speaker": "rook",
        "text": "Notes say “multi-Plug houses.” Bigger money, worse doors."
      },
      {
        "speaker": "brick",
        "text": "That is not a bonus. That is hazard pay."
      }
    ]
  },
  {
    "number": 10,
    "title": "Sovereign Center",
    "jobName": "A courier's business card, left by a customer who never gave a name",
    "reason": "A nameless courier pays cash and asks whether Iron Row is “ready for Copper Bay work.”",
    "short": "BUSINESS CARD",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "brick",
            "text": "Last {city} block."
          },
          {
            "speaker": "rook",
            "text": "Garage is stocked, van is alive, nobody has sued us."
          },
          {
            "speaker": "brick",
            "text": "Yet."
          }
        ]
      },
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "brick",
            "text": "Three clear."
          },
          {
            "speaker": "rook",
            "text": "I had a customer this morning who did not want a repair."
          },
          {
            "speaker": "brick",
            "text": "Then why was he in my shop?"
          },
          {
            "speaker": "rook",
            "text": "Exactly."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "rook",
            "text": "Business card in the violet case. No name, just a Copper Bay number."
          },
          {
            "speaker": "brick",
            "text": "What did he ask?"
          },
          {
            "speaker": "rook",
            "text": "If Iron Row was “ready for Copper Bay work.”"
          },
          {
            "speaker": "brick",
            "text": "What did you say?"
          },
          {
            "speaker": "rook",
            "text": "I asked his budget."
          },
          {
            "speaker": "brick",
            "text": "Of course you did."
          },
          {
            "speaker": "rook",
            "text": "Rook-ie mistake would have been not asking."
          }
        ]
      },
      "13": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "rook",
            "text": "Three left."
          },
          {
            "speaker": "brick",
            "text": "Finish the city before we cross anything."
          }
        ],
        "reactive": true,
        "fallback": "IR_ROK_NEUT_05"
      }
    },
    "finish": [
      {
        "speaker": "brick",
        "text": "One-fifty."
      },
      {
        "speaker": "rook",
        "text": "Word crossed the water before we did."
      },
      {
        "speaker": "brick",
        "text": "Heavier stashes?"
      },
      {
        "speaker": "rook",
        "text": "Yeah. Harder houses too. More than one Plug behind a door is normal over there."
      },
      {
        "speaker": "rook",
        "text": "Customer also used one name: the Connect."
      },
      {
        "speaker": "brick",
        "text": "Who."
      },
      {
        "speaker": "rook",
        "text": "Nobody seems to know. Whoever supplies the Plugs in Copper Bay. Every crew buys through them, far as the story goes."
      },
      {
        "speaker": "brick",
        "text": "Then we learn the streets before we learn the person."
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
    "text": "No wipeouts yet. Don’t give anyone an easy target."
  },
  {
    "id": "IR_BRK_ZDEATH_04",
    "category": "ZERO_DEATHS",
    "speaker": "brick",
    "minChapter": 1,
    "text": "You've stayed on your feet across this whole block. Keep that momentum going to the curb."
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
    "text": "Still in one piece this block. Keep running like that and we're home early."
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
    "text": "Haven't lost you once on this block. Keep this up and I'll laminate your name for the locker."
  },
  {
    "id": "IR_ROK_ZDEATH_06",
    "category": "ZERO_DEATHS",
    "speaker": "rook",
    "minChapter": 4,
    "text": "Still haven’t dropped once. Cleaner than those ghost plates, and those were professional."
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
    "text": "On your successful clears: you’re dodging clean and staying completely upright. Do that again on the next door."
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
    "text": "On your successful clears: untouched and still standing. Don’t linger. Don’t get cute."
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
    "text": "You've hit the pavement multiple times this block, but the bags keep coming. Finish hard."
  },
  {
    "id": "IR_BRK_COMEBACK_05",
    "category": "COMEBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Rough patch behind you. What matters is you’re still standing and ready for the next door."
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
    "text": "Took multiple spills on this block, but you bounced back. Iron bends before it breaks."
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
    "text": "Phase is your go-to this block. Ghosting around is fine, but you still have to sprint the curb."
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
    "text": "Leaning on Dash more than the rest. Fast acceleration. Stay in control."
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
    "text": "Using Dash more than anything else. Quick burst of speed helps, but keep your eyes on the bag."
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
    "text": "Dash has been your favorite power on this block. You hit that burst like you're running late for inspection."
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
    "text": "You favor that Dash burst on your clears. Keep your eyes on the car; the bag still needs a ride."
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
    "text": "Decoy leads your choices this block. Give them something else to look at. Works on Rook too."
  },
  {
    "id": "IR_BRK_DECOY_05",
    "category": "POWER_DECOY",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Popping Decoy more than the rest. Good distraction tool, as long as you keep the car in sight."
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
    "text": "Dropping Decoys like it’s a group project. The decoy is doing all the work."
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
    "text": "Head down. Bag to the car."
  },
  {
    "id": "IR_BRK_NEUT_02",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Next door. Stash, car, done."
  },
  {
    "id": "IR_BRK_NEUT_03",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Hands on the bag, not the furniture. Keep moving."
  },
  {
    "id": "IR_BRK_NEUT_04",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "One door at a time. That is how a garage gets built."
  },
  {
    "id": "IR_BRK_NEUT_05",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "In and out. No souvenirs."
  },
  {
    "id": "IR_BRK_NEUT_06",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "brick",
    "minChapter": 1,
    "text": "Count your bags. I will be counting them too."
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
    "text": "Another door, another haul. Keep pulling bags and we'll have this block locked down."
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
    "text": "Another house, another bag. Honestly, we are so back."
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
    "text": "Door, goods, pavement. Easiest recipe I know, and I burn toast."
  },
  {
    "id": "IR_ROK_NEUT_05",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Keep pulling bags. The sooner we finish, the sooner I get back to my snack drawer."
  },
  {
    "id": "IR_ROK_NEUT_06",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Grab the stash and go. Do not start a side quest in there."
  },
  {
    "id": "IR_ROK_NEUT_07",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Next door is ready. Bag out, car loaded, vibes immaculate."
  },
  {
    "id": "IR_ROK_NEUT_08",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "rook",
    "minChapter": 1,
    "text": "Keep the tally rolling. I told Brick we would. She did not react. That means she is proud."
  }
].map(line => Object.freeze(line)));
