// Season 1 normalized from CROSSLINE_SEASON_1.md. Manuscript prompts/citation/downloader debris are not runtime instructions.
// Import-free narrative data; no progression, rewards, maze mutations or RNG.
export const CROSSLINE_CHAPTERS = Object.freeze([
  {
    "number": 1,
    "title": "Signal Lock",
    "jobName": "A working scanner off the old harbor band",
    "reason": "Whoever's running that frequency knows things about this block Crossline doesn't. Mags wants to listen before somebody else starts talking first.",
    "short": "SCANNER",
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
        ]
      },
      "4": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "switch",
            "text": "Mags will need you at house 9. She'll brief you before you take that entrance. For now, keep pulling bags."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Door 9. There's a beat-up scanner in the violet case — still locked to the harbor channel nobody's supposed to use anymore. Grab the case and the stash, we're leaving together."
          },
          {
            "speaker": "switch",
            "text": "That channel's been dead since before we started. If it's still locked there, someone kept it that way on purpose."
          },
          {
            "speaker": "mags",
            "text": "Which is exactly why I want it in my hands and not somebody else's. Move, runner."
          }
        ]
      },
      "10": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Six houses remain on this avenue. Keep your stride long and finish the set."
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
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "Fifteen doors cleared. The block is quiet behind us."
      },
      {
        "speaker": "mags",
        "text": "The scanner works. It's tuned to a channel that's supposed to be dead. Somebody's still listening on the other end of it — I just don't know who yet."
      }
    ]
  },
  {
    "number": 2,
    "title": "The Wire Sweep",
    "jobName": "A logbook, taped shut, from the last crew that ran this frequency",
    "reason": "Mags wants to know who was on this channel before Crossline claimed it — and why they stopped writing in the middle of a page.",
    "short": "LOGBOOK",
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
        ]
      },
      "7": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Six houses cleared. Keep bringing them out."
          },
          {
            "speaker": "mags",
            "text": "I'll need you at house 9 for a hardware pickup. I'll explain the piece before you enter. Stay on the move."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "House 9. The violet case holds a log — taped shut, every frequency and date somebody didn't want found. Grab the case and the stash."
          },
          {
            "speaker": "switch",
            "text": "Whoever wrote it stopped mid-page."
          },
          {
            "speaker": "mags",
            "text": "Yeah. I noticed that too."
          }
        ]
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
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "mags",
        "text": "Thirty stashes in, and I read every page of that log twice. Whoever had this block before us didn't leave on their own terms."
      },
      {
        "speaker": "switch",
        "text": "Then we don't make their mistake. Keep moving."
      }
    ]
  },
  {
    "number": 3,
    "title": "High Impedance",
    "jobName": "An old handheld CB, dead battery, initials scratched into the casing",
    "reason": "It belonged to whoever taught Switch this street, before the frequency went dark on both of them. He's never said the name out loud.",
    "short": "OLD RADIO",
    "beats": {
      "4": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses cleared. Keep them coming."
          },
          {
            "speaker": "mags",
            "text": "House 9's got something in it. I already know what it is, but I'm not explaining it over the open channel."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Door 9. There's a CB radio in the violet case — old, dead battery, initials scratched into it. Grab the case and the stash."
          },
          {
            "speaker": "switch",
            "text": "(quiet) Whose initials."
          },
          {
            "speaker": "mags",
            "text": "Later. Both come out whole, runner."
          }
        ]
      },
      "10": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Six houses remain. Radio's on my lap. Don't ask."
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
        ],
        "minChapter": 0
      },
      "13": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses remain. Finish it clean."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "(closing the case himself, this time) Fifteen more in the log. Radio's staying in the Dispatch, not the field bag."
      },
      {
        "speaker": "mags",
        "text": "First thing you've asked to keep quiet about all year. Already told the crew nothing. You're welcome."
      }
    ]
  },
  {
    "number": 4,
    "title": "Hot Transistors",
    "jobName": "A stack of intercepted courier manifests, still warm",
    "reason": "Somebody's running product through routes Crossline thought were dead. Mags wants names before Switch wants apologies.",
    "short": "MANIFESTS",
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
        ]
      },
      "7": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Six houses cleared. Keep bringing them out."
          },
          {
            "speaker": "mags",
            "text": "I'll need you at house 9. The Map Room is cooking, and so is something else. I'll brief you before you go in."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Door 9. The violet case has manifests in it, still warm — somebody's using this route this week. Grab the case and the stash."
          },
          {
            "speaker": "switch",
            "text": "Then it's not dead. It's ours, and somebody forgot to tell them."
          },
          {
            "speaker": "mags",
            "text": "Or they know exactly whose it is and don't care yet. Grab the case, runner — we read these at the Dispatch, not the curb."
          }
        ]
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
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "Sixty doors cleared in {city}. The manifests confirm it — somebody's running our route without asking."
      },
      {
        "speaker": "mags",
        "text": "First thing I do tomorrow is find out who signs those pickups."
      }
    ]
  },
  {
    "number": 5,
    "title": "Spectrum Map",
    "jobName": "A jammer, still running, pulled off a rooftop two blocks over",
    "reason": "Somebody's been drowning Crossline's signal on purpose. Switch wants it off the air before he wants to know who built it.",
    "short": "JAMMER",
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
        ]
      },
      "4": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "switch",
            "text": "Mags will need a hand at house 9. She'll explain what she found before that entrance. Stay on task."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Door 9. There's a jammer in the violet case, still live, chewing our clean frequency to static. Grab the case and the stash."
          },
          {
            "speaker": "switch",
            "text": "Cut its power before you touch anything else."
          },
          {
            "speaker": "mags",
            "text": "Already unplugged it, Switch. Grab the case and the bag — I want this thing dead in our hands, not theirs."
          }
        ]
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
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "Seventy-five stashes. The static's gone."
      },
      {
        "speaker": "mags",
        "text": "Whoever built that jammer knew our frequency on purpose. That's not luck. That's somebody who's been listening back."
      }
    ]
  },
  {
    "number": 6,
    "title": "Brownout Buffer",
    "jobName": "A backup line, spliced straight into the block's old utility trunk",
    "reason": "If the grid drops for real, Crossline's the only ones who don't go dark. Switch calls it insurance. Mags calls it a bet.",
    "short": "SPLICE LINE",
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
        ]
      },
      "7": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Six houses cleared. Keep bringing them out."
          },
          {
            "speaker": "mags",
            "text": "I'll need you at house 9 for a power pickup. I'll explain before that door. Keep pulling bags."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Door 9. The violet case holds a splice line — somebody already ran it into the utility trunk here. Grab the case and the stash."
          },
          {
            "speaker": "switch",
            "text": "Somebody, or us? Be specific."
          },
          {
            "speaker": "mags",
            "text": "Fine. Future-us. Past-us was smarter than I give us credit for. Grab the case and the bag."
          }
        ]
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
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "Ninety houses down in our campaign ledger. If the grid drops tonight, we're the only ones still talking."
      },
      {
        "speaker": "mags",
        "text": "That's the whole plan. Let everyone else go quiet for a change."
      }
    ]
  },
  {
    "number": 7,
    "title": "Noise Baffle",
    "jobName": "A notch filter, tuned exactly to Iron Row's garage frequency",
    "reason": "Somebody in Iron Row has been running their radio over Crossline's clean channel. Switch doesn't call it a coincidence twice.",
    "short": "NOTCH FILTER",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Watch your footing on the rail beds, this block's uneven."
          },
          {
            "speaker": "mags",
            "text": "There's a lot of chatter bleeding onto our line from the east. Somebody's doing it on purpose now."
          }
        ]
      },
      "4": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "switch",
            "text": "Mags found the source of that bleed. House 9. She'll brief you there."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Door 9. This notch filter's in the violet case, already tuned — to Rook's garage frequency, exact channel. Grab the case and the stash."
          },
          {
            "speaker": "switch",
            "text": "Twice in one week is not an accident, Mags."
          },
          {
            "speaker": "mags",
            "text": "No. It's not. Grab the case and the bag — we're not leaving this in their hands to try a third time."
          }
        ]
      },
      "10": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Six houses remain. Don't slow down — I want this handled before the day's out."
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
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "One hundred and five doors cleared. The line's clean again."
      },
      {
        "speaker": "mags",
        "text": "For now. If Iron Row wants to keep testing our patience, I'll stop being polite about how I answer it."
      }
    ]
  },
  {
    "number": 8,
    "title": "Long Haul",
    "jobName": "A sealed waterproof drop case, pulled from under the old dock",
    "reason": "Someone's been using the canal route to move things Crossline doesn't control yet. Mags wants to know what, before Switch decides whether to stop it.",
    "short": "DROP CASE",
    "beats": {
      "7": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Six houses cleared. Keep bringing them out."
          },
          {
            "speaker": "mags",
            "text": "I'll need you at house 9. We found something already sealed shut down at the water. I'll explain before you step up."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Door 9. Sealed drop case, hidden under the floorboards like it's been used before. Grab the case and the stash."
          },
          {
            "speaker": "switch",
            "text": "Don't open it in the field."
          },
          {
            "speaker": "mags",
            "text": "Wasn't planning to. Grab the case and the bag, runner — we look at this at the Dispatch, together."
          }
        ]
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
        ],
        "minChapter": 0
      },
      "13": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses remain. Finish the canal line and bring the haul back."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "One hundred and twenty houses logged. The case is sealed."
      },
      {
        "speaker": "mags",
        "text": "Whatever's in there, it's not ours yet. Give me a night with it."
      }
    ]
  },
  {
    "number": 9,
    "title": "The Encryption Key",
    "jobName": "A radio contest ribbon, faded, folded inside a torn envelope",
    "reason": "It was Mags's, once — before the streets, before Switch, before any of this. She never talks about the years it's from.",
    "short": "CONTEST RIBBON",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Steep incline on this ridge. Measure your stride on the walkways and don't stall in the halls."
          },
          {
            "speaker": "mags",
            "text": "This neighborhood used to have a ham club two blocks over. Long gone now."
          }
        ]
      },
      "4": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "mags",
            "text": "House 9's mine. I mean that. I'll explain before we get there."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Door 9. It's — nothing, it's fine. Grab the case and the stash."
          },
          {
            "speaker": "switch",
            "text": "Mags."
          },
          {
            "speaker": "mags",
            "text": "It's a ribbon. First-place. I was twelve. We're not doing this here, runner — just get us both out."
          }
        ]
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
        ],
        "minChapter": 0
      }
    },
    "finish": [
      {
        "speaker": "mags",
        "text": "One hundred and thirty-five stashes. And yeah. I kept it this whole time."
      },
      {
        "speaker": "switch",
        "text": "Twelve years old and already better at this than half the crew I run now. Doesn't surprise me."
      },
      {
        "speaker": "mags",
        "text": "...Thanks, Switch."
      },
      {
        "speaker": "switch",
        "text": "Don't get used to it."
      }
    ]
  },
  {
    "number": 10,
    "title": "Master Carrier",
    "jobName": "A relay log, freshly intercepted, addressed across the water",
    "reason": "The very last frequency Crossline swept was already talking to Copper Bay. Someone over there already knows this block is spoken for.",
    "short": "RELAY LOG",
    "beats": {
      "1": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Fifteen more doors to finish our opening route ledger. Grab the stashes and bring them home."
          },
          {
            "speaker": "mags",
            "text": "Every repeater is synced and waiting. Let's finish the map."
          }
        ]
      },
      "4": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Three houses cleared. Keep bringing them out."
          },
          {
            "speaker": "switch",
            "text": "Mags picked up something at house 9 that isn't ours. She'll brief you there."
          }
        ]
      },
      "9": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Door 9. It's a relay log in the violet case — and it's not talking to anybody in {city}. It's addressed across the water, to Copper Bay. Grab the case and the stash."
          },
          {
            "speaker": "switch",
            "text": "Copper Bay doesn't know we exist."
          },
          {
            "speaker": "mags",
            "text": "Copper Bay's had ears on us for longer than we've had ears on them, Switch. Grab the case and the bag — we need to read every line of this before we go anywhere near that water."
          }
        ]
      },
      "10": {
        "pages": [
          {
            "speaker": "switch",
            "text": "Six houses remain in {city}. Finish clean — we've got harder listening to do after this."
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
        ],
        "minChapter": 0
      },
      "13": {
        "pages": [
          {
            "speaker": "mags",
            "text": "Three houses left. Run your line straight to the curb. Copper Bay can wait one more block."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "switch",
        "text": "One hundred and fifty stashes logged. Our network here is closed — clean, quiet, ours."
      },
      {
        "speaker": "mags",
        "text": "And Copper Bay already knows it. Word from over there is their stashes run heavier than ours ever did — and every house holds more than one Plug waiting behind the door."
      },
      {
        "speaker": "switch",
        "text": "Heavier stash, harder rooms. That's not a rumor, Mags, that's a warning."
      },
      {
        "speaker": "mags",
        "text": "Somebody's running that whole side of the water. Nobody says a name. Not yet."
      },
      {
        "speaker": "switch",
        "text": "Then we find out before we cross it. Pack the terminal — next block's not like the last ten."
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
