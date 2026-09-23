import { campaignContactCue, campaignContactFinish, campaignContactHouses } from '../src/logic/campaignContacts.js';
import { crewSeason, seasonCue, seasonFinish } from '../src/logic/crewSeason.js';
let passed=0;const check=(name,ok)=>{if(!ok)throw Error(name);passed++;};
for(const gangID of ['crossline','iron-row','afterlight']){
 const arc=crewSeason(gangID),ids=new Set();
 for(let chapter=0;chapter<10;chapter++){
  let exchanges=0;
  for(let house=1;house<=15;house++){
   const options={chapter,house,blockIndex:chapter+1,earnedPraise:['flawless'],telemetryComplete:true};
   const base=seasonCue(gangID,options),cue=campaignContactCue(gangID,options);
   check('scheduled slots '+gangID+chapter+house,Boolean(cue)===campaignContactHouses(gangID,options).includes(house));
   if(house===15){check('finale always warns of two Plugs',cue?.beat.kind==='warning'&&cue.text.includes('two Plugs')||cue?.text.includes('Two Plugs'));check('finale has no jokes or praise',!cue.banterID&&cue.praiseKey===null&&cue.lineID===null);continue;}
   if(cue&&!base){check('added banter is unmeasured',cue.beat.kind==='banter'&&cue.praiseKey===null&&cue.lineID===null);continue;}
   if(!cue)continue;
   check('claim identity intact',base.eventID===cue.eventID);
   check('deterministic',JSON.stringify(cue)===JSON.stringify(campaignContactCue(gangID,options)));
   if(cue.banterID){
    exchanges++;ids.add(cue.banterID);
    check('banter is not measured praise',cue.praiseKey===null&&cue.lineID===null);
    check('both crew voices',cue.pages[0].speaker===arc.primary&&cue.pages[1].speaker===arc.secondary);
    check('tease preserved verbatim',JSON.stringify(cue.pages.slice(2))===JSON.stringify(base.pages.slice(1)));
   } else if(chapter===0&&house===1){
    check('first block opening keeps authored pages and adds the invitation',
      JSON.stringify(cue.pages.slice(0,base.pages.length))===JSON.stringify(base.pages)&&cue.pages.length===base.pages.length+2);
    check('both contacts explain the first-block unlock before the claim',
      cue.pages.at(-2).text.includes('Block Rivals')&&cue.pages.at(-2).text.includes('this block')&&
      cue.pages.at(-1).text.includes('Seven houses')&&cue.pages.at(-2).speaker===arc.primary&&cue.pages.at(-1).speaker===arc.secondary);
   } else check('other authored slots unchanged',JSON.stringify(cue)===JSON.stringify(base));
   if(house===9)check('mandatory briefing unchanged',JSON.stringify(cue)===JSON.stringify(base));
  }
  check('one exchange per chapter',exchanges===1);
  const finish=campaignContactFinish(gangID,chapter,'Duskport'),baseFinish=seasonFinish(gangID,chapter,'Duskport');
  check('finish story retained',JSON.stringify(finish.slice(0,baseFinish.length))===JSON.stringify(baseFinish));
  check('no late invitation at the third finish',JSON.stringify(finish)===JSON.stringify(baseFinish));
 }
 check('ten distinct banter identities',ids.size===10);
 check('postseason unchanged',campaignContactCue(gangID,{chapter:10,house:4})===null&&campaignContactFinish(gangID,10)===null);
}
check('unknown crew stays silent',campaignContactCue('unknown',{house:4})===null&&campaignContactFinish('unknown')===null);
console.log('campaign contacts: '+passed+' assertions passed');
