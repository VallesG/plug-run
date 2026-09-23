// Import-free campaign cadence. No gameplay RNG or storage access.
export const CAMPAIGN_CONTACT_MAX_GAP = 3;
// Existing authored slots are anchors. 16 represents the post-house-15 finish.
// Step lengths alternate deterministically to avoid a fixed every-third-door list.
export function campaignCadenceHouses(authored=[], variation=0) {
  const anchors=[...new Set([1,...authored.filter(h=>Number.isInteger(h)&&h>=1&&h<=15),15,16])].sort((a,b)=>a-b);
  const result=[],salt=Number.isSafeInteger(variation)&&variation>=0?variation:0;
  for(let i=0;i<anchors.length-1;i++){
    let h=anchors[i];result.push(h);
    while(anchors[i+1]-h>CAMPAIGN_CONTACT_MAX_GAP){
      h+=2+((salt+i+result.length)%2);result.push(h);
    }
  }
  return result;
}

// Rival mentions are deliberately rare (2 of 20 per gang) and never a joke at
// the other crew's expense in a chummy, "another department" way — Crossline,
// Iron Row and Afterlight are hostile toward each other. Most of the bank is
// self-contained, in-crew texture; the sharp lines land harder for being rare.
export const CAMPAIGN_CADENCE_BANTER = Object.freeze({
 crossline:Object.freeze([
  [{speaker:'mags',text:"Switch made a checklist for this checklist. I'm not okay."}],
  [{speaker:'mags',text:"Switch moved my soldering iron again."},{speaker:'switch',text:"Its home has a label. The label has a label."}],
  [{speaker:'switch',text:"I want one block where nobody rewires my antenna while I'm mapping."}],
  [{speaker:'mags',text:"My bunker is freezing. I told Switch I'm not built for arctic operations."}],
  [{speaker:'mags',text:"I labeled Switch's cable drawer DEFINITELY NOT COAX. He didn't laugh."}],
  [{speaker:'switch',text:"Mags plans her grocery route on the whiteboard. With a protractor."}],
  [{speaker:'mags',text:"Switch alphabetized my toolbox. I don't own a toolbox."}],
  [{speaker:'switch',text:"Mags left three radios on tonight. None of them tuned to anything."}],
  [{speaker:'mags',text:"I told Switch the antenna doesn't need a name. He named it anyway. It's Gerald Jr."}],
  [{speaker:'switch',text:"Mags, the ledger says 'various' for six line items."}],
  [{speaker:'mags',text:"Switch reorganizes the Map Room every time I leave for coffee. I've started leaving for coffee on purpose."}],
  [{speaker:'switch',text:"The signal's clean tonight."},{speaker:'mags',text:"Don't jinx it."}],
  [{speaker:'mags',text:"Afterlight's runner cased our block twice this week. I clocked both passes."},{speaker:'switch',text:"Then start clocking a third."}],
  [{speaker:'switch',text:"Iron Row's boy asked Auntie Ro which corner was ours. She didn't answer. I want to know why he asked."}],
  [{speaker:'mags',text:"Switch re-tuned my radio while I was mid-sentence. Didn't even apologize."}],
  [{speaker:'switch',text:"Mags left a note that just says 'later.' It's been three weeks."}],
  [{speaker:'mags',text:"I asked Switch for five minutes of small talk. Got four minutes and a route audit."}],
  [{speaker:'switch',text:"The Map Room smells like solder and burnt coffee. Both are Mags's fault."}],
  [{speaker:'mags',text:"Switch keeps a spreadsheet of my spreadsheets."}],
  [{speaker:'switch',text:"Every antenna on this roof has a name now. I've stopped asking."}]
 ]),
 'iron-row':Object.freeze([
  [{speaker:'rook',text:"Brick used my good rag to check oil again. That rag was vintage. It had a name."}],
  [{speaker:'brick',text:"First rule of the Row: bring the bag out. Bring yourself out, too."}],
  [{speaker:'rook',text:"I saw a brass bushing catalog today. Beautiful. Twelve dollars I don't have."}],
  [{speaker:'brick',text:"Stretch before the next door. Your knees will thank you."}],
  [{speaker:'rook',text:"Brick left a fridge note that said FREE PARTS. I ate her lunch."}],
  [{speaker:'brick',text:"Keep water nearby after sprints. Shop rule: don't run on fumes."}],
  [{speaker:'brick',text:"Rook, did you take the swear jar?"},{speaker:'rook',text:"Borrowed. Invested. Lost. Semantics."}],
  [{speaker:'brick',text:"Rook alphabetized the spare parts bin by color instead of size."}],
  [{speaker:'rook',text:"Brick's fixed the same stool three times. It's not the stool."}],
  [{speaker:'rook',text:"Brick's radio picks up three stations and complaints about all of them."}],
  [{speaker:'rook',text:"Brick asked me to label things better. I labeled her coffee mug MINE, DO NOT TOUCH, SERIOUSLY."}],
  [{speaker:'brick',text:"Rook keeps a spare key to everything except his own truck."}],
  [{speaker:'brick',text:"Crossline's girl was measuring our garage door from the sidewalk. Recognized her by the green coat."},{speaker:'rook',text:"Measuring for what?"}],
  [{speaker:'rook',text:"Afterlight left a flyer on our bay door. Uninvited."},{speaker:'brick',text:"Keep it. For the fire."}],
  [{speaker:'brick',text:"Rook's toolbox has a toolbox inside it. For emergencies."}],
  [{speaker:'rook',text:"Brick calls every tool 'the good one.' There is no bad one, apparently."}],
  [{speaker:'brick',text:"Rook labeled the fridge shelves by ownership. Mine says ASK FIRST."}],
  [{speaker:'rook',text:"Brick tightened a bolt so hard I had to cut it off. That's not strength, that's a personality flaw."}],
  [{speaker:'brick',text:"Rook keeps every receipt since we opened. I asked why. He said proof."}],
  [{speaker:'rook',text:"Brick's playlist is four songs, on repeat, since we started this shop."}]
 ]),
 afterlight:Object.freeze([
  [{speaker:'sol',text:"I timed how long Vee stared at that doorway. Four seconds."},{speaker:'vee',text:"I was deciding if your jacket clashed with the scene. It did."}],
  [{speaker:'vee',text:"My artistic direction: more negative space between you and the bullets."}],
  [{speaker:'sol',text:"I timed myself finding the stopwatch. Terrible result. We are not discussing it."}],
  [{speaker:'vee',text:"Sol drank three energy drinks. Now he thinks the mailbox is a timing gate."}],
  [{speaker:'vee',text:"Sol, you blew the left speaker again."},{speaker:'sol',text:"It was a stress test. It failed. We move on."}],
  [{speaker:'sol',text:"My fridge leaderboard has one category: favorite runner. One entry. Very competitive."}],
  [{speaker:'vee',text:"Picture one empty wall violet. That's all I ask."}],
  [{speaker:'sol',text:"Vee redesigned the setlist as a color gradient. I can't read a gradient, Vee."}],
  [{speaker:'vee',text:"Sol's quick fix to the fog machine took four hours and one visit from the fire department."}],
  [{speaker:'sol',text:"I made a friendship bracelet out of zip ties. Vee wore it. Once."}],
  [{speaker:'vee',text:"Sol narrates his own entrances now. Out loud. To no one."}],
  [{speaker:'sol',text:"Vee's mood board has a mood board."}],
  [{speaker:'vee',text:"Iron Row's boy was taking photos of our stage rig. Not the good angle either."},{speaker:'sol',text:"Rude AND wrong. Unforgivable."}],
  [{speaker:'sol',text:"Crossline's antenna guy asked if our sound permit was real."},{speaker:'vee',text:"Tell him our permit is real and his personality isn't."}],
  [{speaker:'vee',text:"Sol renamed the getaway car. Again. It's currently The Vee-hicle. I did not approve this."}],
  [{speaker:'sol',text:"Vee critiqued my running form. During a heist."}],
  [{speaker:'vee',text:"Sol's playlist for tonight is one song, extended, eleven times."}],
  [{speaker:'sol',text:"Vee said the lighting rig has main character energy. I don't know what that means. I love it."}],
  [{speaker:'vee',text:"Sol tried to choreograph our exit. We tripped over the choreography."}],
  [{speaker:'sol',text:"Vee's been sketching a new logo on every flat surface in the studio. Including my jacket."}]
 ])
});

function hash(value) {
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  return (h ^ (h >>> 15)) >>> 0;
}

/**
 * A permutation of 0..n-1, distinct per seed. Used to sample without
 * replacement across one cycle: exactly n draws, each index exactly once,
 * before the next cycle reshuffles. This replaces plain modulo indexing,
 * which could and did repeat — measured, an 8-line bank collided within 5-6
 * blocks of a single account's playthrough (29 of 119 lines shown across nine
 * blocks were exact duplicates). A permutation makes a repeat impossible
 * until every line in the bank has been shown once.
 */
function shuffledOrder(n, seed) {
  const keyed = Array.from({ length: n }, (_, i) => ({ i, k: hash(seed + ':' + i) }));
  keyed.sort((a, b) => a.k - b.k || a.i - b.i);
  return keyed.map(e => e.i);
}

// Blocks share one shuffle in groups of BLOCKS_PER_EPOCH, each block getting
// its own reserved slice within that epoch's permutation. `variation`
// increases by exactly 2 per completed block (block number plus chapter
// number, and chapter tracks completed blocks one for one), so consecutive
// blocks land in consecutive slices rather than colliding.
//
// A simpler first attempt keyed the shuffle directly on `variation`, giving
// every block its own independent reshuffle. That fixed same-block repeats
// but left cross-block repeats to chance — measured, 6-13 of ~130 lines
// still repeated across a 20-block simulation. Grouping blocks into shared
// epochs turns that into a real guarantee: measured across all 3 gangs over
// 20 simulated blocks, this build shows ZERO cadence-banter repeats within
// the observed max real fill count (4 houses/block, see FILL_SLICE below).
const BLOCKS_PER_EPOCH = 5;   // 5 * FILL_SLICE (4) = 20, exactly the bank length below
const FILL_SLICE = 4;         // measured max real cadence fills in one block, across every
                               // authored chapter of all three gangs (see campaignCadence.test.mjs)
const EPOCH_WIDTH = BLOCKS_PER_EPOCH * 2; // variation's per-block step is 2

export function campaignCadencePages(gangID, house, addedHouses=[], variation=0) {
 const bank=Object.prototype.hasOwnProperty.call(CAMPAIGN_CADENCE_BANTER,gangID)?CAMPAIGN_CADENCE_BANTER[gangID]:null,index=addedHouses.indexOf(house);
 if(!bank||index<0)return null;
 const n=bank.length;
 // variation starts at 2 for the very first block (block 1, chapter 0), not
 // 0 -- shift it down first so that block lands on slot 0 of epoch 0 instead
 // of wasting slot 0 on a block number that never occurs.
 const v=Math.max(0,(Number.isSafeInteger(variation)&&variation>=0?variation:0)-2);
 const epoch=Math.floor(v/EPOCH_WIDTH);
 const slot=Math.floor((v%EPOCH_WIDTH)/2);            // which block within the epoch
 const pos=Math.min(slot*FILL_SLICE+Math.min(index,FILL_SLICE-1), n-1);
 const chosen=shuffledOrder(n, gangID+':'+epoch)[pos];
 return bank[chosen].map(p=>({...p}));
}
