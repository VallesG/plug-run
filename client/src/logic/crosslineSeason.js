// Season 1, from "Plug Run - Season One Updated" (revised character + systems pass).
// Import-free story data: no RNG, storage, rewards, maze changes or Rivals claims.
// Chapter is crew-owned and zero-based; {city} is the block being played.
// Each beat is keyed by the house it plays before; house 15's script lines are
// the finish, after extraction. One beat per chapter is reactive: a line from
// the bank below, picked from what the block measured, opens it.
export const CROSSLINE_CHAPTERS = Object.freeze([
  {
    "number": 1,
    "title": "Signal Lock",
    "jobName": "A working scanner off the old harbor band",
    "reason": "A working scanner off the old harbor band. The channel was supposed to be dead. It is very much not dead.",
    "short": "SCANNER",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "switch",
            "text": "First block. Fifteen doors. No hero stuff. Bag, curb, car."
          },
          {
            "speaker": "mags",
            "text": "And if your earpiece chirps, that is me, not a ghost. Probably. Ghosts do not have this much aura."
          }
        ]
      },
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "mags",
            "text": "Three clean. Not to be dramatic, but the runner is lowkey eating."
          },
          {
            "speaker": "switch",
            "text": "Do not feed them. They will expect it every block."
          }
        ]
      },
      "6": {
        "label": "BLOCK RIVALS TEASE",
        "pages": [
          {
            "speaker": "mags",
            "text": "Once this entire block is ours, Block Rivals opens. Seven houses, you versus another runner, powers picked before the race."
          },
          {
            "speaker": "switch",
            "text": "Good. Something to do after you finish claiming this block."
          }
        ],
        "rivalsTease": true
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "mags",
            "text": "Violet case. Beat-up scanner, harbor band, already tuned. Bring the case and the stash."
          },
          {
            "speaker": "switch",
            "text": "That channel has been dead for years."
          },
          {
            "speaker": "mags",
            "text": "Cool. It just said our street name."
          },
          {
            "speaker": "switch",
            "text": "...Bring it out. Now."
          }
        ]
      },
      "11": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "mags",
            "text": "Scanner is still whispering. Mostly numbers."
          },
          {
            "speaker": "switch",
            "text": "Mute it."
          },
          {
            "speaker": "mags",
            "text": "You said that like it is your ex calling."
          },
          {
            "speaker": "switch",
            "text": "Five doors left, Mags."
          }
        ],
        "reactive": true,
        "fallback": "CL_MAG_NEUT_01"
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "Fifteen. Car is loaded."
      },
      {
        "speaker": "mags",
        "text": "And our dead channel has a pulse. Love that for us."
      },
      {
        "speaker": "switch",
        "text": "You do not love that."
      },
      {
        "speaker": "mags",
        "text": "Not even a little. It is giving haunted."
      }
    ]
  },
  {
    "number": 2,
    "title": "The Wire Sweep",
    "jobName": "A logbook, taped shut, from the last crew that ran this frequency",
    "reason": "A taped-shut logbook from the last crew on the frequency. The final entry stops mid-sentence.",
    "short": "LOGBOOK",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "mags",
            "text": "This whole block used to be phone-line heaven. Somebody loved copper wire and bad decisions."
          },
          {
            "speaker": "switch",
            "text": "Eyes forward. Nostalgia gets you caught."
          }
        ]
      },
      "6": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "switch",
            "text": "Five houses. Pace is good."
          },
          {
            "speaker": "mags",
            "text": "Sorry, was that a compliment? Screenshotting."
          },
          {
            "speaker": "switch",
            "text": "It was telemetry."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "mags",
            "text": "Violet case has a logbook. Tape is old. Pages are not."
          },
          {
            "speaker": "switch",
            "text": "Open it later."
          },
          {
            "speaker": "mags",
            "text": "Already peeked."
          },
          {
            "speaker": "switch",
            "text": "Of course you did."
          },
          {
            "speaker": "mags",
            "text": "Last sentence ends with: “If Switch comes back—”"
          },
          {
            "speaker": "switch",
            "text": "Case. Car. Now."
          }
        ]
      },
      "12": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "mags",
            "text": "You want me to pretend I did not read your name?"
          },
          {
            "speaker": "switch",
            "text": "I want four more houses cleared."
          },
          {
            "speaker": "mags",
            "text": "That is not a no."
          }
        ],
        "reactive": true,
        "fallback": "CL_MAG_NEUT_02"
      }
    },
    "finish": [
      {
        "speaker": "mags",
        "text": "Thirty stashes total. I read the whole log."
      },
      {
        "speaker": "switch",
        "text": "And?"
      },
      {
        "speaker": "mags",
        "text": "Whoever had this block before us did not quit."
      },
      {
        "speaker": "switch",
        "text": "Then we do not repeat their ending."
      }
    ]
  },
  {
    "number": 3,
    "title": "High Impedance",
    "jobName": "An old handheld CB, dead battery, initials scratched into the casing",
    "reason": "An old handheld CB with dead batteries and initials carved into the case. It belonged to the person who taught Switch the street.",
    "short": "OLD RADIO",
    "tag": "personal",
    "beats": {
      "3": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "switch",
            "text": "Two in. Keep your corners boring."
          },
          {
            "speaker": "mags",
            "text": "House nine has something you are going to hate."
          },
          {
            "speaker": "switch",
            "text": "That narrows it down to everything you enjoy."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "mags",
            "text": "Violet case. Old handheld CB. Dead battery. Initials scratched into the back."
          },
          {
            "speaker": "switch",
            "text": "Which initials?"
          },
          {
            "speaker": "mags",
            "text": "You know which."
          },
          {
            "speaker": "switch",
            "text": "Say them off-channel."
          },
          {
            "speaker": "mags",
            "text": "Copy. Runner, both items come out whole."
          }
        ]
      },
      "10": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "mags",
            "text": "Radio is on my lap."
          },
          {
            "speaker": "switch",
            "text": "Do not turn it on."
          },
          {
            "speaker": "mags",
            "text": "It has no battery."
          },
          {
            "speaker": "switch",
            "text": "I know."
          },
          {
            "speaker": "mags",
            "text": "...Okay."
          }
        ],
        "reactive": true,
        "fallback": "CL_MAG_NEUT_03"
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "Forty-five total. Radio stays at Dispatch."
      },
      {
        "speaker": "mags",
        "text": "I already told everybody it is junk."
      },
      {
        "speaker": "switch",
        "text": "Thanks."
      },
      {
        "speaker": "mags",
        "text": "You are welcome. Also, that was emotional damage. Very rude."
      }
    ]
  },
  {
    "number": 4,
    "title": "Hot Transistors",
    "jobName": "A stack of intercepted courier manifests, still warm",
    "reason": "Fresh courier manifests show product moving through routes Crossline thought were abandoned.",
    "short": "MANIFESTS",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "mags",
            "text": "Map Room is hot enough to cook an egg."
          },
          {
            "speaker": "switch",
            "text": "Do not cook an egg in the Map Room again."
          },
          {
            "speaker": "mags",
            "text": "One time."
          },
          {
            "speaker": "switch",
            "text": "There was cheese."
          },
          {
            "speaker": "mags",
            "text": "The Map Room was a whole mood. A melt-down, if you will."
          },
          {
            "speaker": "switch",
            "text": "I will not."
          }
        ]
      },
      "7": {
        "label": "LOOK AHEAD",
        "pages": [
          {
            "speaker": "mags",
            "text": "Six down. House nine paperwork is still warm."
          },
          {
            "speaker": "switch",
            "text": "How warm?"
          },
          {
            "speaker": "mags",
            "text": "“Somebody left five minutes ago” warm."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "mags",
            "text": "Manifests in the violet case. This route ran this morning."
          },
          {
            "speaker": "switch",
            "text": "Names?"
          },
          {
            "speaker": "mags",
            "text": "Codes. One repeats: CB-17."
          },
          {
            "speaker": "switch",
            "text": "Copper Bay?"
          },
          {
            "speaker": "mags",
            "text": "Or somebody wants us to think Copper Bay. Either way, yoink."
          }
        ]
      },
      "13": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "switch",
            "text": "Three left. No chasing ghosts."
          },
          {
            "speaker": "mags",
            "text": "I am not chasing. I am aggressively noticing."
          }
        ],
        "reactive": true,
        "fallback": "CL_SWT_NEUT_04"
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "Sixty total."
      },
      {
        "speaker": "mags",
        "text": "And somebody is moving through our “dead” lanes like they pay rent."
      },
      {
        "speaker": "switch",
        "text": "Tomorrow we find the landlord."
      }
    ]
  },
  {
    "number": 5,
    "title": "Spectrum Map",
    "jobName": "A jammer, still running, pulled off a rooftop two blocks over",
    "reason": "A live jammer is chewing Crossline’s clean frequency into static.",
    "short": "JAMMER",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "switch",
            "text": "Easy block. Do not invent difficulty."
          },
          {
            "speaker": "mags",
            "text": "Static spike at eleven o’clock. Somebody is absolutely inventing difficulty."
          }
        ]
      },
      "5": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "mags",
            "text": "Four houses in and the interference is getting stronger."
          },
          {
            "speaker": "switch",
            "text": "Source?"
          },
          {
            "speaker": "mags",
            "text": "House nine. Obviously. The plot is plotting."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "mags",
            "text": "Jammer in the violet case. Still live."
          },
          {
            "speaker": "switch",
            "text": "Kill power first."
          },
          {
            "speaker": "mags",
            "text": "Already did."
          },
          {
            "speaker": "switch",
            "text": "Then why can I still hear static?"
          },
          {
            "speaker": "mags",
            "text": "That is me chewing ice. Sorry."
          },
          {
            "speaker": "switch",
            "text": "Mute yourself."
          }
        ]
      },
      "12": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "switch",
            "text": "Signal is clean."
          },
          {
            "speaker": "mags",
            "text": "Almost. The jammer was tuned specifically to us."
          },
          {
            "speaker": "switch",
            "text": "So somebody has been listening long enough to learn us."
          }
        ],
        "reactive": true,
        "fallback": "CL_SWT_NEUT_05"
      }
    },
    "finish": [
      {
        "speaker": "mags",
        "text": "Seventy-five total. We are officially interesting to strangers."
      },
      {
        "speaker": "switch",
        "text": "Worst kind of interesting."
      },
      {
        "speaker": "mags",
        "text": "Main character energy, but make it surveillance."
      }
    ]
  },
  {
    "number": 6,
    "title": "Brownout Buffer",
    "jobName": "A backup line, spliced straight into the block's old utility trunk",
    "reason": "A backup line is spliced directly into the old utility trunk. Crossline can stay online if the grid drops.",
    "short": "SPLICE LINE",
    "beats": {
      "2": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "mags",
            "text": "Streetlights are flickering. Grid is sagging."
          },
          {
            "speaker": "switch",
            "text": "Good thing we planned for ugly."
          },
          {
            "speaker": "mags",
            "text": "You mean I planned. You called it “paranoid arts and crafts.”"
          }
        ]
      },
      "7": {
        "label": "LOOK AHEAD",
        "pages": [
          {
            "speaker": "switch",
            "text": "Six clear."
          },
          {
            "speaker": "mags",
            "text": "House nine has a splice line that looks suspiciously familiar."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "mags",
            "text": "Violet case. Backup splice, already tied into the trunk."
          },
          {
            "speaker": "switch",
            "text": "Ours?"
          },
          {
            "speaker": "mags",
            "text": "Future ours. I laid the route months ago and forgot I finished it."
          },
          {
            "speaker": "switch",
            "text": "That is not comforting."
          },
          {
            "speaker": "mags",
            "text": "It is to me. Past me cooked."
          }
        ]
      },
      "11": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "switch",
            "text": "Lights just dropped behind us."
          },
          {
            "speaker": "mags",
            "text": "Crossline did not."
          },
          {
            "speaker": "switch",
            "text": "Okay. You can say it."
          },
          {
            "speaker": "mags",
            "text": "I told you so."
          },
          {
            "speaker": "switch",
            "text": "Once."
          }
        ],
        "reactive": true,
        "fallback": "CL_SWT_NEUT_06"
      }
    },
    "finish": [
      {
        "speaker": "mags",
        "text": "Ninety total. Whole block is dark."
      },
      {
        "speaker": "switch",
        "text": "Dispatch is still talking."
      },
      {
        "speaker": "mags",
        "text": "Paranoid arts and crafts wins again."
      }
    ]
  },
  {
    "number": 7,
    "title": "Noise Baffle",
    "jobName": "A notch filter, tuned exactly to Iron Row's garage frequency",
    "reason": "A notch filter is tuned exactly to Iron Row’s garage frequency. Somebody is stepping on Crossline’s line.",
    "short": "NOTCH FILTER",
    "tag": "rival",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "mags",
            "text": "East side chatter is bleeding onto us."
          },
          {
            "speaker": "switch",
            "text": "Accidental?"
          },
          {
            "speaker": "mags",
            "text": "The filter literally says IRON ROW in grease pencil."
          },
          {
            "speaker": "switch",
            "text": "Subtle."
          }
        ]
      },
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "switch",
            "text": "Three clear."
          },
          {
            "speaker": "mags",
            "text": "Rook is on their channel arguing with a vending machine."
          },
          {
            "speaker": "switch",
            "text": "Do not engage."
          },
          {
            "speaker": "mags",
            "text": "I did not. The vending machine is ratioing him."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "mags",
            "text": "Notch filter in the violet case. Exact garage frequency."
          },
          {
            "speaker": "switch",
            "text": "Take it."
          },
          {
            "speaker": "mags",
            "text": "Want me to leave a note?"
          },
          {
            "speaker": "switch",
            "text": "No."
          },
          {
            "speaker": "mags",
            "text": "A tasteful note?"
          },
          {
            "speaker": "switch",
            "text": "Mags."
          },
          {
            "speaker": "mags",
            "text": "Fine. Emotionally repressed theft only."
          }
        ]
      },
      "13": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "switch",
            "text": "Three left. Finish before they notice."
          },
          {
            "speaker": "mags",
            "text": "Too late. Rook just said, “Who stole my little metal guy?”"
          }
        ],
        "reactive": true,
        "fallback": "CL_SWT_NEUT_07"
      }
    },
    "finish": [
      {
        "speaker": "mags",
        "text": "One-oh-five total. Line is clean."
      },
      {
        "speaker": "switch",
        "text": "Good."
      },
      {
        "speaker": "mags",
        "text": "I did not leave a note."
      },
      {
        "speaker": "switch",
        "text": "Why did you say that like a confession?"
      },
      {
        "speaker": "mags",
        "text": "No reason. It was a sticky note. It said “skill issue.”"
      }
    ]
  },
  {
    "number": 8,
    "title": "Long Haul",
    "jobName": "A sealed waterproof drop case, pulled from under the old dock",
    "reason": "A sealed waterproof drop case is hidden under the old dock. Someone is using the canal route quietly.",
    "short": "DROP CASE",
    "beats": {
      "6": {
        "label": "LOOK AHEAD",
        "pages": [
          {
            "speaker": "switch",
            "text": "Five clear. Stay dry."
          },
          {
            "speaker": "mags",
            "text": "Also there is a waterproof case under house nine that definitely did not swim there by itself."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "mags",
            "text": "Sealed drop case in the violet case. Yes, case inside case. Very premium."
          },
          {
            "speaker": "switch",
            "text": "Do not open it here."
          },
          {
            "speaker": "mags",
            "text": "Was not going to."
          },
          {
            "speaker": "switch",
            "text": "You were thinking about it."
          },
          {
            "speaker": "mags",
            "text": "I was not thinking. I was manifesting."
          }
        ]
      },
      "10": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "mags",
            "text": "It is heavier than it should be."
          },
          {
            "speaker": "switch",
            "text": "That sentence has never improved my evening."
          }
        ],
        "reactive": true,
        "fallback": "CL_MAG_NEUT_08"
      },
      "13": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "switch",
            "text": "Three left. Bring it home."
          },
          {
            "speaker": "mags",
            "text": "Drop case is not ticking, by the way."
          },
          {
            "speaker": "switch",
            "text": "Why would you say that?"
          },
          {
            "speaker": "mags",
            "text": "Vibes-based bomb check. It passed. Mostly."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "mags",
        "text": "One-twenty total. Case is still sealed."
      },
      {
        "speaker": "switch",
        "text": "Good."
      },
      {
        "speaker": "mags",
        "text": "I deserve a medal."
      },
      {
        "speaker": "switch",
        "text": "You get dinner."
      },
      {
        "speaker": "mags",
        "text": "Honestly better."
      },
      {
        "speaker": "mags",
        "text": "One weird thing on the seal: “C.B. - CONNECT HANDOFF.”"
      },
      {
        "speaker": "switch",
        "text": "Connect is a person?"
      },
      {
        "speaker": "mags",
        "text": "Looks like a title. Whoever it is, people over there write it like everybody should already know."
      }
    ]
  },
  {
    "number": 9,
    "title": "The Encryption Key",
    "jobName": "A radio contest ribbon, faded, folded inside a torn envelope",
    "reason": "A faded first-place radio contest ribbon. Mags won it at twelve and never threw it away.",
    "short": "CONTEST RIBBON",
    "tag": "personal",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "switch",
            "text": "Quiet block. Keep it that way."
          },
          {
            "speaker": "mags",
            "text": "There used to be a ham club here."
          },
          {
            "speaker": "switch",
            "text": "You know that very quickly."
          },
          {
            "speaker": "mags",
            "text": "I know things. It is literally my brand."
          }
        ]
      },
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "switch",
            "text": "Three clear."
          },
          {
            "speaker": "mags",
            "text": "House nine is mine. No commentary."
          },
          {
            "speaker": "switch",
            "text": "That request guarantees commentary."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "mags",
            "text": "Violet case has a ribbon. First place."
          },
          {
            "speaker": "switch",
            "text": "For?"
          },
          {
            "speaker": "mags",
            "text": "Regional radio contest. I was twelve. We are moving on."
          },
          {
            "speaker": "switch",
            "text": "You kept it."
          },
          {
            "speaker": "mags",
            "text": "Runner. Case. Bag. Save me."
          }
        ]
      },
      "12": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "switch",
            "text": "You were twelve and building radios?"
          },
          {
            "speaker": "mags",
            "text": "Please discover shame. Or at least mute."
          },
          {
            "speaker": "switch",
            "text": "I am impressed."
          },
          {
            "speaker": "mags",
            "text": "That is somehow worse."
          }
        ],
        "reactive": true,
        "fallback": "CL_SWT_NEUT_01"
      }
    },
    "finish": [
      {
        "speaker": "mags",
        "text": "One-thirty-five total. Ribbon is staying with me."
      },
      {
        "speaker": "switch",
        "text": "Good."
      },
      {
        "speaker": "mags",
        "text": "Do not get sincere now."
      },
      {
        "speaker": "switch",
        "text": "Would not dream of it, champ."
      },
      {
        "speaker": "mags",
        "text": "I hate you."
      }
    ]
  },
  {
    "number": 10,
    "title": "Master Carrier",
    "jobName": "A relay log, freshly intercepted, addressed across the water",
    "reason": "A relay log is addressed across the water. Copper Bay has known Crossline’s name longer than expected.",
    "short": "RELAY LOG",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "switch",
            "text": "Last {city} block."
          },
          {
            "speaker": "mags",
            "text": "Every repeater is synced. Weirdly emotional about it."
          },
          {
            "speaker": "switch",
            "text": "Do not cry on the equipment."
          },
          {
            "speaker": "mags",
            "text": "There he is. Mr. Stay On Frequency."
          }
        ]
      },
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "switch",
            "text": "Three clear."
          },
          {
            "speaker": "mags",
            "text": "House nine has traffic addressed outside {city}."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "mags",
            "text": "Relay log. Destination: Copper Bay."
          },
          {
            "speaker": "switch",
            "text": "They do not know us."
          },
          {
            "speaker": "mags",
            "text": "Page one says CROSSLINE in all caps."
          },
          {
            "speaker": "switch",
            "text": "I withdraw the statement."
          },
          {
            "speaker": "mags",
            "text": "Smart. Grab everything."
          }
        ]
      },
      "13": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "mags",
            "text": "Three doors left."
          },
          {
            "speaker": "switch",
            "text": "Finish {city} before we start worrying about water."
          }
        ],
        "reactive": true,
        "fallback": "CL_MAG_NEUT_02"
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "One-fifty. Network closed."
      },
      {
        "speaker": "mags",
        "text": "Copper Bay says their stashes run heavier and their houses run crowded."
      },
      {
        "speaker": "switch",
        "text": "Bigger bags, harder rooms."
      },
      {
        "speaker": "mags",
        "text": "And one name sits on every supply entry: the Connect."
      },
      {
        "speaker": "switch",
        "text": "Supplier?"
      },
      {
        "speaker": "mags",
        "text": "If the relay log is real, every Plug in the Bay traces back to them. No real name. No address."
      },
      {
        "speaker": "switch",
        "text": "Then we learn the houses first. The Connect comes later."
      }
    ]
  }
].map(chapter => Object.freeze(chapter)));
export const CROSSLINE_DIALOGUE_BANK = Object.freeze([
  {
    "id": "CL_SWT_ZDEATH_01",
    "category": "ZERO_DEATHS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Zero deaths this block. Keep it moving, one door at a time."
  },
  {
    "id": "CL_SWT_ZDEATH_02",
    "category": "ZERO_DEATHS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Haven’t lost you once this block. Keep that discipline through the next door."
  },
  {
    "id": "CL_SWT_ZDEATH_03",
    "category": "ZERO_DEATHS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "No deaths logged this block. Stay sharp. Do not give them a reason."
  },
  {
    "id": "CL_SWT_ZDEATH_04",
    "category": "ZERO_DEATHS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "You’ve stayed upright this whole block. Keep doing exactly that."
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
    "minChapter": 2,
    "text": "Still running without a wipeout. Finish this clean and Mags might let you listen to the scanner."
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
    "text": "Still in one piece across this whole block. Keep moving like that and we wrap early."
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
    "minChapter": 7,
    "text": "Zero drops logged. Cleaner than my splice job, and my splice job is beautiful."
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
    "text": "On your successful clears, untouched by gunfire and completely upright. Do not change a thing."
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
    "text": "On your successful clears, zero hits taken and no wipeouts. Don’t linger. Don’t get cute."
  },
  {
    "id": "CL_SWT_UNTOUCH_06",
    "category": "FLAWLESS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your successful clears, not a bullet hit and zero drops. That’s textbook. I would know. I wrote the textbook."
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
    "text": "On your successful clears, zero hits, zero drops. Tighter than the seal on that drop case."
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
    "text": "Multiple drops this block, but you found your way back. Execute cleanly on this next door."
  },
  {
    "id": "CL_SWT_COMEBACK_05",
    "category": "COMEBACK",
    "speaker": "switch",
    "minChapter": 1,
    "text": "You’ve had to reset several times this block. What matters is you’re moving again."
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
    "text": "Took multiple spills on this block, but you bounced right back. Circuit stayed closed."
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
    "text": "Took some rough attempts and you’re still walking. More stubborn than my backup splice, and that thing survived a blackout."
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
    "text": "On your successful clears, no power usage on those extractions. Pure fundamentals. Old-school."
  },
  {
    "id": "CL_SWT_NOPOW_05",
    "category": "NO_POWERS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your successful clears, bringing stashes in without activating powers. Trust your instincts and keep running."
  },
  {
    "id": "CL_SWT_NOPOW_06",
    "category": "NO_POWERS",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your successful clears, zero powers used. Crisp, unassisted legwork. Respect."
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
    "text": "On your successful clears, haven't touched a power once this block. Doing it the hard way keeps your senses sharp."
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
    "text": "On your successful clears, running completely unassisted. No batteries, no powers, all aura."
  },
  {
    "id": "CL_MAG_NOPOW_06",
    "category": "NO_POWERS",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your successful clears, no powers burned across those clears. Pure raw hustle from the porch to the trunk."
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
    "text": "On your clears, you’ve been activating Phase more than your other powers. Keep your momentum ready when it ends."
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
    "text": "On your clears, triggering Phase frequently. Commit the second you’re solid."
  },
  {
    "id": "CL_SWT_PHASE_05",
    "category": "POWER_PHASE",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, phase has been your dominant choice. It solves problems. Do not let it become the plan."
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
    "text": "On your clears, you’ve leaned on Phase more than anything else. Walls are just a suggestion now, I guess."
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
    "text": "On your clears, phase is your go-to this block. Slipping out of sight is neat, but you still have to sprint the curb."
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
    "text": "On your clears, dash has been your dominant power this block. That burst closes distance fast. Stay in control."
  },
  {
    "id": "CL_SWT_DASH_02",
    "category": "POWER_DASH",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, leaning on Dash more than the rest. Rapid acceleration. Just stay in control."
  },
  {
    "id": "CL_SWT_DASH_03",
    "category": "POWER_DASH",
    "speaker": "switch",
    "minChapter": 1,
    "text": "On your clears, you’ve been triggering Dash quite a bit. Good burst. Just don’t overrun the bag."
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
    "text": "On your clears, using Dash more than anything else. Rapid pace helps. Keep your focus on the bag."
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
    "text": "On your clears, dash has been your most-used power on this block. You hit that burst like your shoes caught fire."
  },
  {
    "id": "CL_MAG_DASH_02",
    "category": "POWER_DASH",
    "speaker": "mags",
    "minChapter": 1,
    "text": "On your clears, triggering Dash more than anything else. Speedrun energy. Love that for you."
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
    "text": "On your clears, you favor that Dash burst on your clears. Keep your eyes on the car; the stash still needs a ride."
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
    "text": "On your clears, decoy is your go-to move this block. Splitting attention buys you time. Spend it well."
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
    "text": "On your clears, decoy leads your activations this block. Keep the car in mind."
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
    "text": "On your clears, dropping Decoys everywhere this block. Your clone has more screen time than you."
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
    "text": "Next door is waiting. Find the stash and get to the car."
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
    "text": "Stay focused. Get in and get out."
  },
  {
    "id": "CL_SWT_NEUT_06",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "switch",
    "minChapter": 1,
    "text": "Check yourself before the next door. Crossline needs every bag accounted for."
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
    "text": "Another door, another haul. Keep pulling bags and we’ll have this block locked down."
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
