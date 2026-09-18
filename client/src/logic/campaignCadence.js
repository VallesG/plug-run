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
export const CAMPAIGN_CADENCE_BANTER = Object.freeze({
 crossline:Object.freeze([
  [{speaker:'mags',text:"Switch made a checklist for this checklist. I'm not okay."}],
  [{speaker:'mags',text:"Switch moved my soldering iron again."},{speaker:'switch',text:"Its home has a label. The label has a label."}],
  [{speaker:'mags',text:"I heard Afterlight yelling about split times at 2am. My scanners couldn't filter it."}],
  [{speaker:'switch',text:"I want one block where nobody rewires my antenna while I'm mapping."}],
  [{speaker:'mags',text:"My bunker is freezing. I told Switch I'm not built for arctic operations."}],
  [{speaker:'mags',text:"I labeled Switch's cable drawer DEFINITELY NOT COAX. He didn't laugh."}],
  [{speaker:'mags',text:"Switch plans his grocery route on the whiteboard. With a protractor."}],
  [{speaker:'switch',text:"Afterlight's megaphone is too loud."},{speaker:'mags',text:"I want to borrow it for one announcement: Switch, eat lunch."}]
 ]),
 'iron-row':Object.freeze([
  [{speaker:'rook',text:"Brick used my good rag to check oil again. That rag was vintage. It had a name."}],
  [{speaker:'brick',text:"First rule of the Row: bring the bag out. Bring yourself out, too."}],
  [{speaker:'rook',text:"I saw a brass bushing catalog today. Beautiful. Twelve dollars I don't have."}],
  [{speaker:'brick',text:"Keep your footing light at thresholds. Your knees will thank you."}],
  [{speaker:'rook',text:"Brick left a fridge note that said FREE PARTS. I ate his lunch."}],
  [{speaker:'brick',text:"Keep water nearby after sprints. Shop rule: don't run on fumes."}],
  [{speaker:'brick',text:"Rook, did you take the swear jar?"},{speaker:'rook',text:"Borrowed. Invested. Lost. Semantics."}],
  [{speaker:'brick',text:"Afterlight's party is too loud."},{speaker:'rook',text:"Still better than hearing Crossline argue about cable types."}]
 ]),
 afterlight:Object.freeze([
  [{speaker:'sol',text:"I timed how long Vee stared at that doorway. Four seconds."},{speaker:'vee',text:"I was deciding if your jacket clashed with the scene. It did."}],
  [{speaker:'vee',text:"My artistic direction: more negative space between you and the bullets."}],
  [{speaker:'sol',text:"I timed myself finding the stopwatch. Terrible result. We are not discussing it."}],
  [{speaker:'vee',text:"Sol drank three energy drinks. Now he thinks the mailbox is a timing gate."}],
  [{speaker:'vee',text:"Crossline painted their repeater box beige. Beige. I could fix it."}],
  [{speaker:'vee',text:"Sol, you blew the left speaker again."},{speaker:'sol',text:"It was a stress test. It failed. We move on."}],
  [{speaker:'sol',text:"My fridge leaderboard has one category: favorite runner. One entry. Very competitive."}],
  [{speaker:'vee',text:"Picture one empty wall violet. That's all I ask."}]
 ])
});
export function campaignCadencePages(gangID, house, addedHouses=[], variation=0) {
 const bank=Object.prototype.hasOwnProperty.call(CAMPAIGN_CADENCE_BANTER,gangID)?CAMPAIGN_CADENCE_BANTER[gangID]:null,index=addedHouses.indexOf(house);
 if(!bank||index<0)return null;
 const salt=Number.isSafeInteger(variation)&&variation>=0?variation:0;
 return bank[(salt*3+index)%bank.length].map(p=>({...p}));
}
