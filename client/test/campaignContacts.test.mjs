import { campaignContactCue, campaignContactFinish, campaignContactHouses } from '../src/logic/campaignContacts.js';
import { crewSeason, seasonCue, seasonFinish, seasonHouses } from '../src/logic/crewSeason.js';
let passed=0;const check=(name,ok)=>{if(!ok)throw Error(name);passed++;};
// The script plays as written; banter only fills its long silences; House 15 warns.
for(const gangID of ['crossline','iron-row','afterlight']){
 const arc=crewSeason(gangID);
 for(let chapter=0;chapter<10;chapter++)for(const blockIndex of [1,chapter+2]){
  const authored=seasonHouses(gangID,{chapter,blockIndex}),plan=campaignContactHouses(gangID,{chapter,blockIndex});
  check('every scripted door is in the plan '+gangID+chapter,authored.every(h=>plan.includes(h)));
  for(let house=1;house<=15;house++){
   const options={chapter,house,blockIndex,earnedPraise:['flawless'],telemetryComplete:true};
   const base=seasonCue(gangID,options),cue=campaignContactCue(gangID,options);
   check('scheduled slots '+gangID+chapter+house,Boolean(cue)===plan.includes(house));
   if(house===15){check('finale always warns of two Plugs',cue?.beat.kind==='warning'&&/two Plugs/i.test(cue.text));check('finale has no jokes or praise',!cue.banterID&&cue.praiseKey===null&&cue.lineID===null);continue;}
   if(base){check('the script plays exactly as authored '+gangID+chapter+house,JSON.stringify(cue)===JSON.stringify(base));continue;}
   if(cue){
    check('added banter is unmeasured',cue.beat.kind==='banter'&&cue.praiseKey===null&&cue.lineID===null&&cue.banterID);
    check('banter in crew voices',cue.pages.every(p=>[arc.primary,arc.secondary].includes(p.speaker)));
   }
  }
  const finish=campaignContactFinish(gangID,chapter,'Duskport'),baseFinish=seasonFinish(gangID,chapter,'Duskport');
  check('finish is the script\'s door 15',JSON.stringify(finish)===JSON.stringify(baseFinish));
 }
 // Block Rivals is open from the start: no chapter teases it, not even door 6 of block 1.
 check('no Block Rivals tease '+gangID,[1,4].every(b=>{const c=campaignContactCue(gangID,{chapter:0,house:6,blockIndex:b});return !c||!c.pages.some(p=>/Rivals/.test(p.text));}));
 check('postseason unchanged',campaignContactCue(gangID,{chapter:10,house:4})===null&&campaignContactFinish(gangID,10)===null);
}
check('unknown crew stays silent',campaignContactCue('unknown',{house:4})===null&&campaignContactFinish('unknown')===null);
console.log('campaign contacts: '+passed+' assertions passed');
