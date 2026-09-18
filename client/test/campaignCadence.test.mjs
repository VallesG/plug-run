import { campaignCadenceHouses, campaignCadencePages, CAMPAIGN_CADENCE_BANTER } from '../src/logic/campaignCadence.js';
import { campaignContactCue, campaignContactHouses } from '../src/logic/campaignContacts.js';
import { seasonChapter, seasonCue } from '../src/logic/crewSeason.js';
import { createContactProgress, markContactShown, contactShown } from '../src/logic/contactProgress.js';
import { readFileSync } from 'node:fs';
let passed=0;const check=(n,ok)=>{if(!ok)throw Error(n);passed++;};
const patterns=new Set();
for(const gangID of ['crossline','iron-row','afterlight'])for(let chapter=0;chapter<10;chapter++)for(let blockIndex=1;blockIndex<=20;blockIndex++){
 const options={chapter,blockIndex},story=seasonChapter(gangID,chapter),houses=campaignContactHouses(gangID,options);
 patterns.add(houses.join(','));
 check('starts at first door',houses[0]===1);
 check('preserves all story anchors',Object.keys(story.beats).every(h=>houses.includes(Number(h))));
 check('finish included in maximum gap',[...houses,16].every((h,i,a)=>!i||h-a[i-1]<=3));
 check('schedule repeatable',JSON.stringify(houses)===JSON.stringify(campaignContactHouses(gangID,options)));
 let record=createContactProgress();const text=new Set();
 for(const house of houses){
  const cue=campaignContactCue(gangID,{...options,house});
  check('every scheduled cue is live',!!cue&&cue.pages.length>0);
  const base=seasonCue(gangID,{...options,house});
  if(base)check('legacy claim identity retained',base.eventID===cue.eventID);
  else{
   check('short unmeasured filler',cue.pages.length<=2&&cue.pages.every(p=>p.text.length<130)&&cue.praiseKey===null);
   check('exact crew speaker',cue.pages.every(p=>gangID==='crossline'?['switch','mags'].includes(p.speaker):gangID==='iron-row'?['brick','rook'].includes(p.speaker):['vee','sol'].includes(p.speaker)));
   check('no duplicate filler in block',!text.has(cue.text));text.add(cue.text);
  }
  const claim=markContactShown(record,cue.eventID,blockIndex);record=claim.state;
  check('first cue claims',claim.applied);
  check('retry silent',!markContactShown(record,cue.eventID,blockIndex).applied);
  check('reload silent',contactShown(JSON.parse(JSON.stringify(record)),cue.eventID));
 }
 check('whole schedule survives capacity',houses.every(h=>contactShown(record,campaignContactCue(gangID,{...options,house:h}).eventID)));
 check('job byte identical',JSON.stringify(campaignContactCue(gangID,{...options,house:9}))===JSON.stringify(seasonCue(gangID,{...options,house:9})));
}
check('varied schedules',patterns.size>3);
check('unknown and postseason silent',campaignContactHouses('nope').length===0&&campaignContactHouses('crossline',{chapter:10}).length===0);
check('invalid bank keys silent',campaignCadencePages('toString',1,[1])===null);
check('sparse plan reaches finish',campaignCadenceHouses([9],0).at(-1)>=13);
check('invalid house ignored',!campaignCadenceHouses([0,17,NaN],0).includes(17));
// Exercise the actual pre-house method, not only the pure planner.
const raw=readFileSync(new URL('../src/controllers/ProgressionManager.js',import.meta.url),'utf8');
const method=raw.slice(raw.indexOf('  showContactCheckIn(next)'),raw.indexOf('\n  showBlockMap(',raw.indexOf('  showContactCheckIn(next)')));
let progress=createContactProgress(),shown=0,advanced=0;
const house=campaignContactHouses('crossline').find(h=>!seasonChapter('crossline',0).beats[h]);
const bindings={startBlockRunTracking(){},getContactProgress:()=>progress,getWindowState:()=>({gangID:'crossline'}),
 crewStoryProgress:()=>({chapter:0}),seasonChapter,getBlockRunStats:()=>({telemetryComplete:false,houses:0}),
 cityForBlock:()=>({name:'Duskport'}),praiseEarned:()=>[],praiseUsedInBlock:()=>[],
 seasonCue:campaignContactCue,contact:id=>({id}),gangContacts:()=>({primary:{id:'switch'},secondary:{id:'mags'}}),
 claimContact:(id,block)=>{const r=markContactShown(progress,id,block);progress=r.state;return r.applied;},
 showContactPanel:(scene,cue,next)=>{shown++;return {advance:next};},console};
const Manager=new Function(...Object.keys(bindings),'return class {constructor(scene){this.scene=scene;}'+method+'}')(...Object.values(bindings));
const scene={runKind:'journey',role:'runner',pveRound:house,blockIndex:1,blockGangID:'crossline'};
const m=new Manager(scene);let panel=m.showContactCheckIn(()=>advanced++);
check('actual seam displays new cue',shown===1&&advanced===0);
panel.advance();check('cue goes to entrance callback',advanced===1);
m.showContactCheckIn(()=>advanced++);check('actual retry does not reopen',shown===1&&advanced===2);
progress=JSON.parse(JSON.stringify(progress));m.showContactCheckIn(()=>advanced++);check('actual reload does not reopen',shown===1&&advanced===3);
for(const runKind of ['rivals','daily','tutorial'])new Manager({...scene,runKind}).showContactCheckIn(()=>advanced++);
new Manager({...scene,role:'plug'}).showContactCheckIn(()=>advanced++);
check('other modes untouched',shown===1&&advanced===7);

// The actual bug this session found and fixed: a naive modulo selection
// repeated cadence lines within a single account's real playthrough. Measured
// on the old formula: 29 of 119 lines shown across 9 blocks of one gang were
// exact duplicates. campaignCadencePages now groups blocks into shared
// shuffle epochs (BLOCKS_PER_EPOCH in campaignCadence.js) so that within one
// epoch, no two houses -- in the same block OR different blocks in that
// epoch -- can draw the same line. Assert that guarantee directly, across
// every gang and every authored chapter, rather than relying on it holding
// as an emergent property of other checks.
for(const gangID of ['crossline','iron-row','afterlight']){
 const seenInEpoch=new Map(); // text -> [block,house], reset at each epoch boundary
 let epochStart=1,lastEpoch=null;
 for(let block=1;block<=10;block++){ // the full authored season; seasonChapter is null beyond it
  const chapter=block-1,story=seasonChapter(gangID,chapter);
  const houses=campaignContactHouses(gangID,{chapter,blockIndex:block});
  const added=houses.filter(h=>!story.beats[h]);
  const variation=block+story.number;
  const epoch=Math.floor(Math.max(0,variation-2)/10); // mirrors campaignCadence.js's EPOCH_WIDTH
  if(lastEpoch!==null&&epoch!==lastEpoch)seenInEpoch.clear();
  lastEpoch=epoch;
  for(const house of added){
   const pages=campaignCadencePages(gangID,house,added,variation);
   if(!pages)continue;
   const text=pages[0].text;
   check('no cadence repeat within an epoch '+gangID+block+house,!seenInEpoch.has(text),
     seenInEpoch.has(text)?'also shown at '+seenInEpoch.get(text):'');
   seenInEpoch.set(text,[block,house]);
  }
 }
}
console.log('campaign cadence: '+passed+' assertions passed');
