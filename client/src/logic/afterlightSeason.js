// Season 1, from "Plug Run - Season One Updated" (revised character + systems pass).
// Import-free story data: no RNG, storage, rewards, maze changes or Rivals claims.
// Chapter is crew-owned and zero-based; {city} is the block being played.
// Each beat is keyed by the house it plays before; house 15's script lines are
// the finish, after extraction. One beat per chapter is reactive: a line from
// the bank below, picked from what the block measured, opens it.
export const AFTERLIGHT_CHAPTERS = Object.freeze([
  {
    "number": 1,
    "title": "Opening Act",
    "jobName": "A guestlist, half-burned, for a showcase that already happened somewhere else",
    "reason": "A half-burned guestlist from a showcase that already happened somewhere else. Somebody tried Afterlight’s idea before them and failed.",
    "short": "GUESTLIST",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "vee",
            "text": "First door. Clean line in, clean line out. Do not make ugly footage."
          },
          {
            "speaker": "sol",
            "text": "I am timing curb splits."
          },
          {
            "speaker": "vee",
            "text": "Of course you are."
          },
          {
            "speaker": "sol",
            "text": "Data is beautiful. Solid data. Sol-id."
          }
        ]
      },
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "vee",
            "text": "Three clear."
          },
          {
            "speaker": "sol",
            "text": "Runner is cooking."
          },
          {
            "speaker": "vee",
            "text": "Do not call people “cooking” on comms."
          },
          {
            "speaker": "sol",
            "text": "Runner is... performing above thermal expectations."
          }
        ]
      },
      "6": {
        "label": "BLOCK RIVALS TEASE",
        "pages": [
          {
            "speaker": "sol",
            "text": "When this whole block is ours, Block Rivals goes live: seven houses, another runner beside you, powers locked before the race."
          },
          {
            "speaker": "vee",
            "text": "Cute. Finish claiming the block, then you can make it personal."
          }
        ],
        "rivalsTease": true
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "sol",
            "text": "Violet case has a half-burned guestlist for a showcase I have never heard of."
          },
          {
            "speaker": "vee",
            "text": "Our concept?"
          },
          {
            "speaker": "sol",
            "text": "Same bones. Different names. Whoever threw it stopped halfway through the list."
          },
          {
            "speaker": "vee",
            "text": "Bring it out. I want every name."
          }
        ]
      },
      "10": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "sol",
            "text": "This is either creepy or flattering."
          },
          {
            "speaker": "vee",
            "text": "Those are not mutually exclusive."
          }
        ],
        "reactive": true,
        "fallback": "AL_SOL_NEUT_01"
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Fifteen."
      },
      {
        "speaker": "sol",
        "text": "Guestlist has people I recognize from the scene."
      },
      {
        "speaker": "vee",
        "text": "Ask quietly."
      },
      {
        "speaker": "sol",
        "text": "I can do quiet."
      },
      {
        "speaker": "vee",
        "text": "No, you can do lower volume."
      }
    ]
  },
  {
    "number": 2,
    "title": "Neon Ink",
    "jobName": "A rival mural, painted over in one night, still wet under the new coat",
    "reason": "A mural was painted over overnight, still wet beneath the new coat. Somebody wanted the original gone fast.",
    "short": "BURIED MURAL",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "sol",
            "text": "Let’s move fast tonight."
          },
          {
            "speaker": "vee",
            "text": "Fast, not frantic. There is a difference."
          },
          {
            "speaker": "sol",
            "text": "One has better posture?"
          },
          {
            "speaker": "vee",
            "text": "Exactly."
          }
        ]
      },
      "7": {
        "label": "LOOK AHEAD",
        "pages": [
          {
            "speaker": "sol",
            "text": "Six clear. House nine has fresh paint over old work."
          },
          {
            "speaker": "vee",
            "text": "How fresh?"
          },
          {
            "speaker": "sol",
            "text": "My sleeve is now blue."
          },
          {
            "speaker": "vee",
            "text": "Congratulations. You are in your blue period."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "sol",
            "text": "Photo in the violet case: mural underneath the cover-up. Signature is half visible."
          },
          {
            "speaker": "vee",
            "text": "I know that hand."
          },
          {
            "speaker": "sol",
            "text": "Whose?"
          },
          {
            "speaker": "vee",
            "text": "Not over open comms. Grab both."
          }
        ]
      },
      "13": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "vee",
            "text": "Three left."
          },
          {
            "speaker": "sol",
            "text": "You have been staring at the photo for six minutes."
          },
          {
            "speaker": "vee",
            "text": "You have been timing me staring at the photo?"
          },
          {
            "speaker": "sol",
            "text": "I contain multitudes. And a stopwatch."
          }
        ],
        "reactive": true,
        "fallback": "AL_VEE_NEUT_01"
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Thirty total."
      },
      {
        "speaker": "sol",
        "text": "Whoever erased it was in a hurry."
      },
      {
        "speaker": "vee",
        "text": "People rush when they are scared the wall will speak first."
      }
    ]
  },
  {
    "number": 3,
    "title": "Amber Beacon",
    "jobName": "A flyer for a showcase that never happened, dated last year",
    "reason": "A flyer advertises a showcase that never happened. Sol hates no-shows more than he admits.",
    "short": "OLD FLYER",
    "beats": {
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "vee",
            "text": "Three clear."
          },
          {
            "speaker": "sol",
            "text": "House nine has an old flyer for a show that never happened."
          },
          {
            "speaker": "vee",
            "text": "Do not take that personally."
          },
          {
            "speaker": "sol",
            "text": "Too late. I already have beef with a piece of paper."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "sol",
            "text": "Flyer in the violet case. Date was last year. Same block, same promise: lights, sound, crowd."
          },
          {
            "speaker": "vee",
            "text": "And nobody showed?"
          },
          {
            "speaker": "sol",
            "text": "Organizer vanished."
          },
          {
            "speaker": "vee",
            "text": "Then we do not vanish. Grab it."
          }
        ]
      },
      "10": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "sol",
            "text": "I hate people who make everybody get ready and then disappear."
          },
          {
            "speaker": "vee",
            "text": "That sounded specific."
          },
          {
            "speaker": "sol",
            "text": "Six houses remain! Look at that, gameplay information."
          }
        ],
        "reactive": true,
        "fallback": "AL_SOL_NEUT_02"
      },
      "13": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "vee",
            "text": "Three left. Finish with style."
          },
          {
            "speaker": "sol",
            "text": "And attendance."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Forty-five total."
      },
      {
        "speaker": "sol",
        "text": "Old flyer is going next to ours."
      },
      {
        "speaker": "vee",
        "text": "As a warning?"
      },
      {
        "speaker": "sol",
        "text": "As motivation. And maybe spite. Spite-ivation."
      }
    ]
  },
  {
    "number": 4,
    "title": "Bass Drop",
    "jobName": "A rolled-up portfolio, edges soft from being carried too long",
    "reason": "Vee’s old portfolio from the art program that rejected her twice. The rejection letter is still folded inside.",
    "short": "PORTFOLIO",
    "tag": "personal",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "vee",
            "text": "Keep it quick."
          },
          {
            "speaker": "sol",
            "text": "Copy. Also I am preemptively not making a joke."
          },
          {
            "speaker": "vee",
            "text": "That is somehow more suspicious."
          }
        ]
      },
      "7": {
        "label": "LOOK AHEAD",
        "pages": [
          {
            "speaker": "vee",
            "text": "House nine is mine."
          },
          {
            "speaker": "sol",
            "text": "The portfolio?"
          },
          {
            "speaker": "vee",
            "text": "You already knew?"
          },
          {
            "speaker": "sol",
            "text": "You only use that voice for art and parking tickets."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "vee",
            "text": "Violet case has my old portfolio. Sketches, applications, the whole embarrassing museum."
          },
          {
            "speaker": "sol",
            "text": "The one they rejected?"
          },
          {
            "speaker": "vee",
            "text": "Twice."
          },
          {
            "speaker": "sol",
            "text": "Their loss."
          },
          {
            "speaker": "vee",
            "text": "Do not make it a movie. Runner, both out."
          }
        ]
      },
      "13": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "sol",
            "text": "For the record, the program was wrong."
          },
          {
            "speaker": "vee",
            "text": "You did not see the application."
          },
          {
            "speaker": "sol",
            "text": "I have seen what happened after it. Better evidence."
          }
        ],
        "reactive": true,
        "fallback": "AL_SOL_NEUT_03"
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Sixty total. Portfolio is home."
      },
      {
        "speaker": "sol",
        "text": "You keeping the rejection letter?"
      },
      {
        "speaker": "vee",
        "text": "Absolutely."
      },
      {
        "speaker": "sol",
        "text": "Petty."
      },
      {
        "speaker": "vee",
        "text": "Archival."
      }
    ]
  },
  {
    "number": 5,
    "title": "Signature Pattern",
    "jobName": "A photograph of a mural that's since been torn down, a face scratched out of it",
    "reason": "A photo shows a demolished mural with one person’s face scratched out hard enough to tear the paper.",
    "short": "OLD PHOTO",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "vee",
            "text": "Try not to look like a burglary tutorial."
          },
          {
            "speaker": "sol",
            "text": "We are literally sprinting bags to a car."
          },
          {
            "speaker": "vee",
            "text": "Presentation matters. It is called Vee-sual identity."
          }
        ]
      },
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "sol",
            "text": "Three clear. House nine photo is nasty."
          },
          {
            "speaker": "vee",
            "text": "Nasty how?"
          },
          {
            "speaker": "sol",
            "text": "Somebody removed a face with violence and a ballpoint pen."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "sol",
            "text": "Photo in the violet case. Old mural, now demolished. One face scratched completely out."
          },
          {
            "speaker": "vee",
            "text": "I know the wall."
          },
          {
            "speaker": "sol",
            "text": "Know the person?"
          },
          {
            "speaker": "vee",
            "text": "Maybe. Bring it out before I answer that."
          }
        ]
      },
      "10": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "sol",
            "text": "That “maybe” had a lot of syllables."
          },
          {
            "speaker": "vee",
            "text": "It had two."
          },
          {
            "speaker": "sol",
            "text": "Emotionally, like nine."
          }
        ],
        "reactive": true,
        "fallback": "AL_SOL_NEUT_04"
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Seventy-five total."
      },
      {
        "speaker": "sol",
        "text": "Whoever got scratched out did not want to be remembered."
      },
      {
        "speaker": "vee",
        "text": "Or somebody else did not want them remembered. Different problem."
      }
    ]
  },
  {
    "number": 6,
    "title": "High Glow",
    "jobName": "A recording, cued up, of somebody badmouthing Afterlight's showcase to a paying crowd",
    "reason": "A recording catches someone from Iron Row mocking Afterlight to a paying crowd.",
    "short": "RECORDING",
    "tag": "rival",
    "beats": {
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "sol",
            "text": "Three clear. Vibes are dark tonight."
          },
          {
            "speaker": "vee",
            "text": "Good. Neon looks expensive in the dark."
          },
          {
            "speaker": "sol",
            "text": "Also house nine has somebody talking trash about us."
          },
          {
            "speaker": "vee",
            "text": "Even better."
          }
        ]
      },
      "7": {
        "label": "LOOK AHEAD",
        "pages": [
          {
            "speaker": "vee",
            "text": "Six clear."
          },
          {
            "speaker": "sol",
            "text": "Recording is from a bar. Row voice, I think."
          },
          {
            "speaker": "vee",
            "text": "Do not start a crew war because a man had a microphone."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "sol",
            "text": "Violet case has the recording. Guy says our showcase is “all glow, no weight.”"
          },
          {
            "speaker": "vee",
            "text": "That is almost a good line."
          },
          {
            "speaker": "sol",
            "text": "You are not mad?"
          },
          {
            "speaker": "vee",
            "text": "I am stealing the phrase and making it a shirt."
          },
          {
            "speaker": "sol",
            "text": "Diabolical. Grab both."
          }
        ]
      },
      "13": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "vee",
            "text": "Three left."
          },
          {
            "speaker": "sol",
            "text": "So no revenge?"
          },
          {
            "speaker": "vee",
            "text": "Selling their insult back to them is revenge with margins."
          }
        ],
        "reactive": true,
        "fallback": "AL_VEE_NEUT_02"
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "Ninety total."
      },
      {
        "speaker": "sol",
        "text": "“All Glow, No Weight” merch mockup is already in the group chat."
      },
      {
        "speaker": "vee",
        "text": "See? Community."
      },
      {
        "speaker": "sol",
        "text": "Merch drop so hard it has a bass line."
      }
    ]
  },
  {
    "number": 7,
    "title": "The Split Timer",
    "jobName": "A stopwatch, professional grade, still running from whoever dropped it last",
    "reason": "A professional stopwatch was left running. Somebody was timing this block before Afterlight arrived.",
    "short": "STOPWATCH",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "vee",
            "text": "Clean hands. Clean lines."
          },
          {
            "speaker": "sol",
            "text": "Clean jokes? Never heard of her."
          }
        ]
      },
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "sol",
            "text": "Three clear. House nine has a stopwatch still running."
          },
          {
            "speaker": "vee",
            "text": "How long?"
          },
          {
            "speaker": "sol",
            "text": "Seven hours, forty-two minutes, and I am offended by the lap discipline."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "sol",
            "text": "Stopwatch in the violet case. Professional grade. Still running."
          },
          {
            "speaker": "vee",
            "text": "Timing what?"
          },
          {
            "speaker": "sol",
            "text": "No idea. Last lap was exactly forty-seven seconds."
          },
          {
            "speaker": "vee",
            "text": "Our runner did that stretch in forty-six."
          },
          {
            "speaker": "sol",
            "text": "Do not tell them. Their ego is already insured. Their aura is uninsurable."
          }
        ]
      },
      "10": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "sol",
            "text": "I stopped the watch."
          },
          {
            "speaker": "vee",
            "text": "You look sad about it."
          },
          {
            "speaker": "sol",
            "text": "Some timers feel like promises. Weird, I know."
          }
        ],
        "reactive": true,
        "fallback": "AL_SOL_NEUT_05"
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "One-oh-five total."
      },
      {
        "speaker": "sol",
        "text": "Watch is in my pocket."
      },
      {
        "speaker": "vee",
        "text": "Evidence bag."
      },
      {
        "speaker": "sol",
        "text": "My pocket is an evidence bag with branding."
      }
    ]
  },
  {
    "number": 8,
    "title": "The Sound Horn",
    "jobName": "A megaphone, already rigged, playing someone else's message on a loop",
    "reason": "A rigged megaphone loops a warning telling someone to stay off an unmarked corner.",
    "short": "MEGAPHONE LOOP",
    "beats": {
      "6": {
        "label": "LOOK AHEAD",
        "pages": [
          {
            "speaker": "vee",
            "text": "Five clear."
          },
          {
            "speaker": "sol",
            "text": "House nine is yelling at us before we even get there."
          },
          {
            "speaker": "vee",
            "text": "Finally, a property with customer service."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "sol",
            "text": "Megaphone in the violet case. Loop says: “Stay off the blue corner. Last warning.”"
          },
          {
            "speaker": "vee",
            "text": "There is no blue corner."
          },
          {
            "speaker": "sol",
            "text": "Exactly. Either code or extremely bad wayfinding."
          },
          {
            "speaker": "vee",
            "text": "Bring it."
          }
        ]
      },
      "10": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "sol",
            "text": "Loop has a second layer under the voice."
          },
          {
            "speaker": "vee",
            "text": "Music?"
          },
          {
            "speaker": "sol",
            "text": "Numbers. Very faint."
          },
          {
            "speaker": "vee",
            "text": "Okay. That just became Crossline-shaped."
          }
        ],
        "reactive": true,
        "fallback": "AL_SOL_NEUT_06"
      },
      "13": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "vee",
            "text": "Three left."
          },
          {
            "speaker": "sol",
            "text": "Megaphone is off."
          },
          {
            "speaker": "vee",
            "text": "Thank you."
          },
          {
            "speaker": "sol",
            "text": "I miss him already. He was loud. He was honest. He was a king."
          }
        ]
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "One-twenty total."
      },
      {
        "speaker": "sol",
        "text": "Numbers repeat every thirty seconds. I mapped them."
      },
      {
        "speaker": "vee",
        "text": "And?"
      },
      {
        "speaker": "sol",
        "text": "Copper Bay payout values. Bigger than ours. The other numbers look like Plug counts - two, sometimes three per address."
      },
      {
        "speaker": "vee",
        "text": "So bigger stash, uglier room."
      },
      {
        "speaker": "sol",
        "text": "Exactly. Sending the whole thing to Mags."
      },
      {
        "speaker": "vee",
        "text": "Do not tell her I said she was useful."
      },
      {
        "speaker": "sol",
        "text": "Already titled the file “VEE ADMITS MAGS IS USEFUL.”"
      }
    ]
  },
  {
    "number": 9,
    "title": "The Chrome Grip",
    "jobName": "A regional track medal, scratched, in a box that hasn't been opened in years",
    "reason": "Sol’s scratched regional track medal from before he stopped running competitively.",
    "short": "TRACK MEDAL",
    "tag": "personal",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "vee",
            "text": "Measure your stride."
          },
          {
            "speaker": "sol",
            "text": "...Yeah. Copy."
          }
        ]
      },
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "vee",
            "text": "Three clear."
          },
          {
            "speaker": "sol",
            "text": "House nine is mine. Please do not do the Vee stare."
          },
          {
            "speaker": "vee",
            "text": "I have several."
          },
          {
            "speaker": "sol",
            "text": "The one that makes people confess taxes. The Vee-rdict."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "sol",
            "text": "Violet case has a medal. Regional. Mine."
          },
          {
            "speaker": "vee",
            "text": "You ran track?"
          },
          {
            "speaker": "sol",
            "text": "Past tense doing cardio today."
          },
          {
            "speaker": "vee",
            "text": "What happened?"
          },
          {
            "speaker": "sol",
            "text": "Not here. Both items out, please."
          }
        ]
      },
      "13": {
        "label": "DEBRIEF",
        "pages": [
          {
            "speaker": "vee",
            "text": "I am not pushing."
          },
          {
            "speaker": "sol",
            "text": "Thank you."
          },
          {
            "speaker": "vee",
            "text": "But I am remembering."
          },
          {
            "speaker": "sol",
            "text": "That is somehow more threatening."
          }
        ],
        "reactive": true,
        "fallback": "AL_VEE_NEUT_03"
      }
    },
    "finish": [
      {
        "speaker": "sol",
        "text": "One-thirty-five total."
      },
      {
        "speaker": "vee",
        "text": "You time everybody because you miss it."
      },
      {
        "speaker": "sol",
        "text": "Partly."
      },
      {
        "speaker": "vee",
        "text": "Okay."
      },
      {
        "speaker": "sol",
        "text": "Ask me again in a year."
      },
      {
        "speaker": "vee",
        "text": "I will."
      }
    ]
  },
  {
    "number": 10,
    "title": "Midnight Klaxon",
    "jobName": "A hand-delivered invitation to a showcase across the water that Afterlight didn't organize",
    "reason": "An unsigned invitation summons Afterlight to a showcase in Copper Bay. Somebody there already knows their name.",
    "short": "INVITATION",
    "beats": {
      "1": {
        "label": "BLOCK OPENS",
        "pages": [
          {
            "speaker": "vee",
            "text": "Last {city} block. Make it look intentional."
          },
          {
            "speaker": "sol",
            "text": "Lights, speakers, strobes: all green. I am emotionally at unsafe voltage."
          }
        ]
      },
      "4": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "vee",
            "text": "Three clear."
          },
          {
            "speaker": "sol",
            "text": "Somebody hand-delivered an invitation with our name on it."
          },
          {
            "speaker": "vee",
            "text": "To what?"
          },
          {
            "speaker": "sol",
            "text": "That is the fun bad part."
          }
        ]
      },
      "9": {
        "label": "THE JOB",
        "pages": [
          {
            "speaker": "sol",
            "text": "Invite in the violet case. Showcase in Copper Bay. We did not organize it."
          },
          {
            "speaker": "vee",
            "text": "Who did?"
          },
          {
            "speaker": "sol",
            "text": "No signature. Just “Come see what your name buys across the water.”"
          },
          {
            "speaker": "vee",
            "text": "That is either a threat or excellent copy."
          },
          {
            "speaker": "sol",
            "text": "I knew you would respect the copy."
          },
          {
            "speaker": "sol",
            "text": "Tiny stamp on the back too: “CONNECT APPROVED.”"
          },
          {
            "speaker": "vee",
            "text": "Venue?"
          },
          {
            "speaker": "sol",
            "text": "Person, apparently. The Connect. Rumor says every Plug in Copper Bay gets supplied through them."
          },
          {
            "speaker": "vee",
            "text": "That is an aggressively mysterious job title."
          },
          {
            "speaker": "sol",
            "text": "Kind of goes hard."
          },
          {
            "speaker": "vee",
            "text": "Do not compliment the monopoly."
          }
        ]
      },
      "13": {
        "label": "CHECK-IN",
        "pages": [
          {
            "speaker": "sol",
            "text": "Three left."
          },
          {
            "speaker": "vee",
            "text": "Finish {city}. Then we decide whether we RSVP."
          },
          {
            "speaker": "sol",
            "text": "RSVP: Respectfully, Sol is Very Pumped."
          }
        ],
        "reactive": true,
        "fallback": "AL_SOL_NEUT_07"
      }
    },
    "finish": [
      {
        "speaker": "vee",
        "text": "One-fifty. Opening campaign complete."
      },
      {
        "speaker": "sol",
        "text": "Copper Bay already knows us."
      },
      {
        "speaker": "vee",
        "text": "Bigger stashes, harder houses, more security, crowded rooms."
      },
      {
        "speaker": "sol",
        "text": "And the Connect somewhere behind all of it."
      },
      {
        "speaker": "vee",
        "text": "Fine. We go. But if they are using our name, they are going to learn how protective I get about typography."
      },
      {
        "speaker": "sol",
        "text": "That is the scariest thing you have said all season."
      }
    ]
  }
].map(chapter => Object.freeze(chapter)));
export const AFTERLIGHT_DIALOGUE_BANK = Object.freeze([
  {
    "id": "AL_VEE_ZDEATH_01",
    "category": "ZERO_DEATHS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Zero deaths this block. Keep moving toward the next door."
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
    "text": "No deaths logged. Stay sharp. Don’t give them a good angle for the photo."
  },
  {
    "id": "AL_VEE_ZDEATH_04",
    "category": "ZERO_DEATHS",
    "speaker": "vee",
    "minChapter": 1,
    "text": "You’ve stayed upright this whole block. Keep that exact silhouette."
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
    "text": "Still running without a fall. Finish this clean and Sol will want it on a flyer."
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
    "text": "Still alive across this whole block! Keep bringing the stashes out."
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
    "text": "Zero drops logged. Cleaner than that paint job over the mural."
  },
  {
    "id": "AL_SOL_ZDEATH_06",
    "category": "ZERO_DEATHS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Still standing without a death! That’s pure high-velocity hustle right there."
  },
  {
    "id": "AL_SOL_ZDEATH_07",
    "category": "ZERO_DEATHS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Zero deaths this block! Your respawn button is collecting dust."
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
    "id": "AL_SOL_UNTOUCH_07",
    "category": "FLAWLESS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your successful clears, zero hits, zero drops! You are not even sweating. Are you real? Blink twice."
  },
  {
    "id": "AL_SOL_UNTOUCH_06",
    "category": "FLAWLESS",
    "speaker": "sol",
    "minChapter": 9,
    "text": "On your successful clears, zero hits, zero drops! I ought to switch that megaphone back on just to celebrate your footwork."
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
    "text": "Multiple drops this block, but you found your way back. Execute with grace on this next door."
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
    "text": "Took multiple spills on this block, but you bounced right back! That’s real racing spirit."
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
    "id": "AL_SOL_COMEBACK_07",
    "category": "COMEBACK",
    "speaker": "sol",
    "minChapter": 1,
    "text": "Some rough attempts back there, but the comeback arc is SO real. Put that in the trailer."
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
    "text": "On your successful clears, no power usage on those extractions. Pure unadorned footwork. Minimalism."
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
    "text": "On your successful clears, zero powers used. Crisp, classic style. Timeless."
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
    "text": "On your successful clears, haven't touched a power once this block! Doing it the hard way keeps your reflexes twitchy."
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
    "id": "AL_SOL_NOPOW_07",
    "category": "NO_POWERS",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your successful clears, no powers! Raw talent, no filter. Straight to the timeline."
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
    "text": "On your clears, you’ve been activating Phase more than your other powers. Keep your composure ready when it ends."
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
    "text": "On your clears, phase has been your dominant choice. It solves problems with flair. Keep your focus."
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
    "text": "On your clears, phase is your go-to this block! Slipping out of sight is slick, but you still gotta sprint to the car."
  },
  {
    "id": "AL_SOL_PHASE_05",
    "category": "POWER_PHASE",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, triggering Phase more than anything else this block! Killer move, just keep your eyes on the curb."
  },
  {
    "id": "AL_SOL_PHASE_07",
    "category": "POWER_PHASE",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, Phase again! You are more ghost than runner at this point. Ghost-runner. Ghostie."
  },
  {
    "id": "AL_SOL_PHASE_06",
    "category": "POWER_PHASE",
    "speaker": "sol",
    "minChapter": 7,
    "text": "On your clears, leaning on Phase again! That purple shimmer is going on the next shirt."
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
    "text": "On your clears, leaning on Dash more than the rest. Rapid acceleration, just keep it framed properly."
  },
  {
    "id": "AL_VEE_DASH_03",
    "category": "POWER_DASH",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, you’ve been triggering Dash quite a bit. Dynamic velocity, just don’t overshoot the bag."
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
    "text": "On your clears, dash has been your most-used power on this block! You hit that burst like you just dumped the nitrous."
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
    "id": "AL_SOL_DASH_07",
    "category": "POWER_DASH",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, Dash again! You are speedrunning the whole block and I am living for it."
  },
  {
    "id": "AL_VEE_DECOY_01",
    "category": "POWER_DECOY",
    "speaker": "vee",
    "minChapter": 1,
    "text": "On your clears, decoy is your go-to move this block. The double creates theatrical misdirection. Very performance art."
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
    "text": "On your clears, decoy leads your activations this block. Keep your line toward the curb in mind."
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
    "text": "On your clears, dropping Decoys everywhere this block! Your clone is getting more screen time than you!"
  },
  {
    "id": "AL_SOL_DECOY_07",
    "category": "POWER_DECOY",
    "speaker": "sol",
    "minChapter": 1,
    "text": "On your clears, Decoy again! Two of you, zero chill. Double the drip."
  },
  {
    "id": "AL_SOL_DECOY_06",
    "category": "POWER_DECOY",
    "speaker": "sol",
    "minChapter": 4,
    "text": "On your clears, decoy leads your style this block! Flashier than that flyer, and it promised lights."
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
    "text": "Next door is waiting. Find the stash, make it look good, get to the car."
  },
  {
    "id": "AL_VEE_NEUT_03",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Composure first. Grab the bag and do not pose on the way out."
  },
  {
    "id": "AL_VEE_NEUT_04",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Focus on the door in front of you. One clear at a time puts Afterlight in the gallery."
  },
  {
    "id": "AL_VEE_NEUT_05",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "In, out, iconic. That is the whole brief."
  },
  {
    "id": "AL_VEE_NEUT_06",
    "category": "NEUTRAL_FALLBACK",
    "speaker": "vee",
    "minChapter": 1,
    "text": "Every bag accounted for. Details are the difference between art and a mess."
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
    "text": "Another door, another statement. Keep pulling bags and we’ll have this block claimed."
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
    "text": "Another house on the block! Grab the bag clean and hit top speed to the car!"
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
