import { campaignContactCue, campaignContactFinish } from '../src/logic/campaignContacts.js';
import { crewSeason, seasonCue, seasonFinish } from '../src/logic/crewSeason.js';
let passed=0;const check=(name,ok)=>{if(!ok)throw Error(name);passed++;};
for(const gangID of ['crossline','iron-row','afterlight']){
 const arc=crewSeason(gangID),ids=new Set();
 for(let chapter=0;chapter<10;chapter++){
  let exchanges=0;
  for(let house=1;house<=15;house++){
   const options={chapter,house,blockIndex:chapter+1,earnedPraise:['flawless'],telemetryComplete:true};
   const base=seasonCue(gangID,options),cue=campaignContactCue(gangID,options);
   check('no added slots '+gangID+chapter+house,Boolean(base)===Boolean(cue));
   if(!cue)continue;
   check('claim identity intact',base.eventID===cue.eventID);
   check('deterministic',JSON.stringify(cue)===JSON.stringify(campaignContactCue(gangID,options)));
   if(cue.banterID){
    exchanges++;ids.add(cue.banterID);
    check('banter is not measured praise',cue.praiseKey===null&&cue.lineID===null);
    check('both crew voices',cue.pages[0].speaker===arc.primary&&cue.pages[1].speaker===arc.secondary);
    check('tease preserved verbatim',JSON.stringify(cue.pages.slice(2))===JSON.stringify(base.pages.slice(1)));
   } else check('other authored slots unchanged',JSON.stringify(cue)===JSON.stringify(base));
   if(house===9)check('mandatory briefing unchanged',JSON.stringify(cue)===JSON.stringify(base));
  }
  check('one exchange per chapter',exchanges===1);
  const finish=campaignContactFinish(gangID,chapter,'Duskport'),baseFinish=seasonFinish(gangID,chapter,'Duskport');
  check('finish story retained',JSON.stringify(finish.slice(0,baseFinish.length))===JSON.stringify(baseFinish));
  check('only third finish adds invitation',finish.length===baseFinish.length+(chapter===2?2:0));
  if(chapter===2)check('both contacts invite to race',finish.at(-2).text.includes('Block Rivals')&&finish.at(-1).text.includes('Seven houses'));
 }
 check('ten distinct banter identities',ids.size===10);
 check('postseason unchanged',campaignContactCue(gangID,{chapter:10,house:4})===null&&campaignContactFinish(gangID,10)===null);
}
check('unknown crew stays silent',campaignContactCue('unknown',{house:4})===null&&campaignContactFinish('unknown')===null);
console.log('campaign contacts: '+passed+' assertions passed');
