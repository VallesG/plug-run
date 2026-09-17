// Story-first presentation layer. Fixed chapter banter is not performance praise.
// Gap-filling banter adds stable claim IDs; existing authored identities stay intact.
import { crewSeason, seasonChapter, seasonCue, seasonFinish } from './crewSeason.js';
import { campaignCadenceHouses, campaignCadencePages } from './campaignCadence.js';
export function campaignContactHouses(gangID,{chapter=0,blockIndex=1}={}) {
 const story=seasonChapter(gangID,chapter);
 if(!story)return [];
 const block=Number.isSafeInteger(blockIndex)&&blockIndex>0?blockIndex:1;
 return campaignCadenceHouses(Object.keys(story.beats).map(Number),block+story.number);
}
const exchanges={
  "afterlight": [
    [
      "Ro said our showcase needs a permit. Sol brought her a playlist.",
      "It has a track called Permit. I thought that covered it."
    ],
    [
      "The spray caps are for walls, Sol. Not every object needs our signature.",
      "The toaster looked unfinished. You're welcome."
    ],
    [
      "An amber light in a violet showcase. This is why I keep mood boards.",
      "My mood is visible from three streets away."
    ],
    [
      "Sol calls it a sound check. The neighbors call it evidence.",
      "Same audience. Different reviews."
    ],
    [
      "I left the stencil binder somewhere safe. Unfortunately, I was being artistic about safe.",
      "After this pickup, we're labeling the shelf SAFE."
    ],
    [
      "Ro says a velvet rope won't make us respectable.",
      "It will make the line disrespect us in an orderly fashion."
    ],
    [
      "Sol tested the fog rig indoors. We lost the couch.",
      "We found it. Eventually. By sound."
    ],
    [
      "The showcase banner needs a dramatic entrance.",
      "I can run in holding it. That counts as wind."
    ],
    [
      "Nobody touches the trophy before opening night.",
      "I wasn't touching it. I was practicing my acceptance speech at it."
    ],
    [
      "One city, one showcase, and Sol still hasn't written a guest list.",
      "The list says everybody. Very efficient."
    ]
  ],
  "crossline": [
    [
      "Mags named the radio channels after snacks. Nothing about this is operational.",
      "Channel Pretzel is clear. See? Works."
    ],
    [
      "A clean route needs clear labels. Not arrows drawn on old receipts.",
      "That receipt got us home. Respect the stationery."
    ],
    [
      "Mags, your radio is picking up a cooking show.",
      "They said keep moving the pan. Sound advice for the runner."
    ],
    [
      "Ro asked why our route board includes her coffee break.",
      "Critical infrastructure. Nobody argues with the coffee break."
    ],
    [
      "No more shortcuts named after people you've annoyed.",
      "Fine. Long Way Around Switch it is."
    ],
    [
      "The ledger needs fewer doodles and more addresses.",
      "The angry pigeon is a landmark. Ask anyone."
    ],
    [
      "Mags borrowed my wirecutters and left a thank-you note.",
      "That's called a paper trail. Thought you'd appreciate it."
    ],
    [
      "The antenna does not need a crew flag.",
      "How else will the signal know who it works for?"
    ],
    [
      "We are testing the network. Not naming every blinking light.",
      "Too late. That's Gerald. He's doing his best."
    ],
    [
      "Ten blocks of routes, and the desk is still a mess.",
      "Organized mess. Don't move Gerald."
    ]
  ],
  "iron-row": [
    [
      "Rook has a coffee plan. That worries me more than the doors.",
      "The old brew stripped paint. This is workplace safety."
    ],
    [
      "My wrench went missing. Rook says check the last place I saw it.",
      "I also said stop accusing the drawer."
    ],
    [
      "A brass clock won't make lunch come sooner.",
      "No, but now you'll ask me with historical accuracy."
    ],
    [
      "The laminator is not a license to cover the shop in rules.",
      "Then quit giving me material."
    ],
    [
      "We need a switch for the bay door, not a ceremony.",
      "You get one dramatic lever. Let me have this."
    ],
    [
      "Rook says breakfast improves morale.",
      "Mostly mine. You can have the waffles that survive inspection."
    ],
    [
      "He wants to put his name on every tool.",
      "Only the ones you call ours when you lose yours."
    ],
    [
      "My back's fine. The bucket was poorly engineered.",
      "Sure. We'll put the bucket on light duty."
    ],
    [
      "If that blower works, we might finally smell fresh air.",
      "Imagine a shop where the air doesn't have a service history."
    ],
    [
      "Rook found a bell. I already dislike the direction this is going.",
      "Customer satisfaction starts with a loud, clear answer."
    ]
  ]
};
const invitations={
  "afterlight": [
    "Three blocks behind you. Take Afterlight into Block Rivals and put our name in front of another runner.",
    "Seven houses in a race. Pick your powers, rep the crew, and come back with something I can brag about."
  ],
  "crossline": [
    "Three blocks done. Time to represent Crossline in Block Rivals.",
    "Seven houses, another runner, your choice of powers. Let's see what your route looks like under race pressure."
  ],
  "iron-row": [
    "Three blocks cleared. Go represent Iron Row in Block Rivals.",
    "Seven houses to race. Choose your powers and bring the Row a win. I'll handle the bragging."
  ]
};
export function campaignContactCue(gangID, options={}) {
  const cue=seasonCue(gangID,options);
  const story=seasonChapter(gangID,options.chapter);
  const arc=crewSeason(gangID);
  if(!story||!arc)return cue;
  if(!cue){
    const block=Number.isSafeInteger(options.blockIndex)&&options.blockIndex>0?options.blockIndex:1;
    const houses=campaignContactHouses(gangID,options);
    const added=houses.filter(h=>!story.beats[h]);
    const pages=campaignCadencePages(gangID,options.house,added,block+story.number);
    if(!pages)return null;
    const id='cadence-house-'+options.house;
    return {
      eventID:'contact/v1/block-'+block+'/'+id+'/'+arc.primary,
      beat:{id,house:options.house,kind:'banter'},
      pages,text:pages[0].text,speaker:pages[0].speaker,praiseKey:null,lineID:null,
      banterID:gangID+'/chapter-'+story.number+'/'+id,
      chapterLabel:'CHAPTER '+story.number+' · '+story.title.toUpperCase(),
      action:'VIEW THE BLOCK  >>'
    };
  }
  // One short exchange per chapter, at its first existing non-opening check-in.
  // Tease pages remain after the exchange; House 9 always keeps its full briefing.
  const slot=Object.keys(story.beats).map(Number).sort((a,b)=>a-b).find(h=>h!==1&&h!==9);
  const banter=exchanges[gangID]?.[story.number-1];
  if(options.house!==slot||!banter)return cue;
  const pages=[
    {speaker:arc.primary,text:banter[0]},
    {speaker:arc.secondary,text:banter[1]},
    ...cue.pages.slice(1)
  ];
  return {...cue,pages,text:pages[0].text,speaker:pages[0].speaker,
    praiseKey:null,lineID:null,banterID:gangID+'/chapter-'+story.number};
}
export function campaignContactFinish(gangID,chapter=0,cityName) {
  const pages=seasonFinish(gangID,chapter,cityName);
  const arc=crewSeason(gangID),invite=invitations[gangID];
  if(!pages||chapter!==2||!arc||!invite)return pages;
  // Invitation, not an unlock mutation: actual 45-stash gate stays authoritative.
  return [...pages,{speaker:arc.primary,text:invite[0]},{speaker:arc.secondary,text:invite[1]}];
}
