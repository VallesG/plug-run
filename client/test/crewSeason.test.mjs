// All authored arcs and reactive banks against existing measured predicates.
import { crewSeason, seasonChapter, seasonCue, seasonJob, seasonFinish, SEASON_PRIORITY } from '../src/logic/crewSeason.js';
import { ironRowChapter, ironRowCue, ironRowJob, ironRowFinish } from '../src/logic/ironRowSeason.js';
import { contactCue, contactDialoguePages, contactPanelLayout, praiseEarned } from '../src/logic/contacts.js';
import { beginBlockRun, recordHouseClear, recordBlockDeath, blockRunStats } from '../src/logic/blockRun.js';
import { missionPickupSound } from '../src/logic/missionItem.js';
let passed=0;
function check(name,ok){if(!ok)throw Error(name);passed++;}
const schedules=[[1,4,9,10],[1,7,9,13],[4,9,10,13],[1,7,9,13],[1,4,9,10],[4,7,9,13],[1,4,9,10],[7,9,10,13],[1,4,9,13],[1,4,9,10,13]];
check('unknown crew never invents an arc',crewSeason(null)===null&&crewSeason('__proto__')===null&&seasonCue('unknown',{house:9})===null);
check('eight category priority contract',SEASON_PRIORITY.join(',')==='flawless,comeback,noDeaths,noPowers,bunk,phase,dash,decoy');
for(const gangID of ['iron-row','crossline','afterlight']){
 const arc=crewSeason(gangID);
 check('ten chapters '+gangID,arc.chapters.length===10);
 check('112 unique lines '+gangID,arc.bank.length===112&&new Set(arc.bank.map(l=>l.id)).size===112);
 check('ten distinct jobs '+gangID,new Set(arc.chapters.map(c=>c.jobName)).size===10);
 check('continuation falls through '+gangID,seasonChapter(gangID,10)===null&&seasonJob(gangID,10)===null&&seasonFinish(gangID,10)===null);
 for(let chapter=0;chapter<10;chapter++){
  const story=seasonChapter(gangID,chapter),job=seasonJob(gangID,chapter);
  check('job label matches chapter '+gangID+chapter,job.name===story.jobName&&job.label===story.jobName.toUpperCase()&&job.short.length<=14);
  check('pickup preserves existing sound '+gangID+chapter,missionPickupSound(job.id)?.length>0);
  check('exactly one reactive slot '+gangID+chapter,Object.values(story.beats).filter(b=>b.reactive).length===1);
  for(let house=1;house<=15;house++){
   const cue=seasonCue(gangID,{chapter,house,blockIndex:71+chapter,cityName:'Copper Bay'});
   check('exact schedule '+gangID+chapter+'/'+house,Boolean(cue)===schedules[chapter].includes(house));
   if(!cue)continue;
   check('legacy identity preserved '+gangID+chapter+'/'+house,cue.eventID===contactCue({gangID,house,blockIndex:71+chapter}).eventID);
   check('pages use crew speakers '+gangID+chapter+'/'+house,cue.pages.every(p=>[arc.primary,arc.secondary].includes(p.speaker)));
   check('no hardcoded world city '+gangID+chapter+'/'+house,!JSON.stringify(cue.pages).includes('Duskport'));
   check('no manuscript debris '+gangID+chapter+'/'+house,!/DevTools|MD\n|querySelector/.test(JSON.stringify(cue.pages)));
   for(const page of cue.pages.filter(p=>house<9&&/house 9/i.test(p.text))){
    check('look-ahead tells you briefing is later '+gangID+chapter+'/'+house,/brief|explain|detail|before/i.test(page.text));
    check('look-ahead never orders current case pickup '+gangID+chapter+'/'+house,!/grab.*case|violet case/i.test(page.text));
   }
   for(const page of cue.pages)for(const [w,h] of [[280,480],[390,844],[900,640]]){
    for(const part of contactDialoguePages(page.text,w,h)){
     const l=contactPanelLayout(w,h,{},part);
     check('story page clears advance '+gangID+chapter+house+w,l.dialogue.y-l.dialogue.h/2+l.dialogue.copyTop+l.dialogue.lines*l.dialogue.lineHeight<=l.action.y-l.action.h/2);
    }
   }
   if(house===9)check('mandatory job briefs both pickups '+gangID+chapter,/case/.test(cue.pages[0].text)&&/stash/.test(cue.pages[0].text));
   if(!story.beats[house].reactive){
    const praised=seasonCue(gangID,{chapter,house,earnedPraise:[...SEASON_PRIORITY],telemetryComplete:true,cityName:'Copper Bay'});
    check('story and briefing never replaced '+gangID+chapter+'/'+house,JSON.stringify(cue.pages)===JSON.stringify(praised.pages)&&praised.praiseKey===null);
   }
  }
  const house=Number(Object.keys(story.beats).find(h=>story.beats[h].reactive)),beat=story.beats[house];
  for(const key of SEASON_PRIORITY){
   const cue=seasonCue(gangID,{chapter,house,blockIndex:chapter+1,earnedPraise:[key],telemetryComplete:true});
   const line=arc.bank.find(l=>l.id===cue.lineID);
   check('predicate chooses eligible speaker line '+gangID+chapter+key,cue.praiseKey===key&&line.speaker===beat.pages[0].speaker&&line.minChapter<=chapter+1&&beat.eligibleIDs.includes(line.id));
   check('selection is deterministic '+gangID+chapter+key,JSON.stringify(cue)===JSON.stringify(seasonCue(gangID,{chapter,house,blockIndex:chapter+1,earnedPraise:[key],telemetryComplete:true})));
   const tail=beat.pages[0].text.slice(beat.pages[0].text.indexOf('.')+1).trim();
   check('authored encouragement survives '+gangID+chapter+key,cue.pages[0].text.endsWith(tail.replaceAll('{city}','this city')));
   const missing=seasonCue(gangID,{chapter,house,earnedPraise:[key],telemetryComplete:false});
   check('missing data falls back '+gangID+chapter+key,missing.praiseKey===null&&missing.lineID===beat.fallback);
   const capped=seasonCue(gangID,{chapter,house,earnedPraise:[key],usedPraise:['phase'],telemetryComplete:true});
   check('any category spends whole block slot '+gangID+chapter+key,capped.praiseKey===null&&capped.lineID===null);
  }
  const priority=seasonCue(gangID,{chapter,house,earnedPraise:[...SEASON_PRIORITY],telemetryComplete:true});
  check('multiple earned predicates follow priority '+gangID+chapter,priority.praiseKey==='flawless');
  const finish=seasonFinish(gangID,chapter,'Copper Bay');
  check('finish retains every authored speaker '+gangID+chapter,finish.length===story.finish.length&&new Set(finish.map(p=>p.speaker)).size===2);
  check('finish does not promise unrelated city unlock '+gangID+chapter,!/Next stop: Copper Bay|ferry.*boarding|transit line.*live/.test(JSON.stringify(finish)));
  if(gangID==='iron-row'){
   check('Iron Row unchanged '+chapter,JSON.stringify(seasonChapter(gangID,chapter))===JSON.stringify(ironRowChapter(chapter))&&JSON.stringify(seasonJob(gangID,chapter))===JSON.stringify(ironRowJob(chapter))&&JSON.stringify(finish)===JSON.stringify(ironRowFinish(chapter,'Copper Bay')));
   check('Iron Row cue delegates unchanged '+chapter,JSON.stringify(seasonCue(gangID,{chapter,house}))===JSON.stringify(ironRowCue({chapter,house})));
  }
 }
 // Each bank line fits the existing page budget, including narrow phones.
 for(const line of arc.bank){
  for(const [w,h] of [[280,480],[390,844],[900,640]]){
   for(const page of contactDialoguePages(line.text,w,h)){
    const l=contactPanelLayout(w,h,{},page);
    check('bank page clears advance '+line.id+w,l.dialogue.y-l.dialogue.h/2+l.dialogue.copyTop+l.dialogue.lines*l.dialogue.lineHeight<=l.action.y-l.action.h/2);
   }
  }
 }
}
// Exact measured boundaries; missing history must not become zeros.
const init=()=>beginBlockRun(null,1,1).state;
const clear=(s,h,extra={})=>recordHouseClear(s,1,{house:h,hits:0,bunk:false,powers:[],...extra}).state;
check('no recorded clears earns nothing',praiseEarned(blockRunStats(init(),1)).length===0);
const clean=clear(clear(init(),1),2);
check('complete zero evidence earns flawless',praiseEarned(blockRunStats(clean,1)).includes('flawless'));
for(const power of ['phase','dash','decoy']){
 const one=clear(init(),1,{powers:[power]});
 check('one activation is not a habit '+power,!praiseEarned(blockRunStats(one,1)).includes(power));
 const two=clear(one,2,{powers:[power]});
 check('two with strict lead qualifies '+power,praiseEarned(blockRunStats(two,1)).includes(power));
}
const tie=clear(clear(init(),1,{powers:['phase','dash']}),2,{powers:['phase','dash']});
check('tie earns no preferred power',blockRunStats(tie,1).topPower===null);
let deaths=clean;for(let n=0;n<3;n++)deaths=recordBlockDeath(deaths,1).state;
check('three deaths earns comeback not zero deaths',praiseEarned(blockRunStats(deaths,1)).includes('comeback')&&!praiseEarned(blockRunStats(deaths,1)).includes('noDeaths'));
for(const gangID of ['crossline','afterlight']){
 const bank=crewSeason(gangID).bank;
 check('finale bell/siren unavailable before completion '+gangID,bank.find(l=>l.id.endsWith('_BUNK_06')&&l.speaker===crewSeason(gangID).secondary).minChapter===11);
}
const gates={
crossline:{CL_SWT_ZDEATH_06:3,CL_MAG_ZDEATH_05:5,CL_SWT_COMEBACK_06:5,CL_MAG_UNTOUCH_06:9,CL_MAG_BUNK_06:11},
afterlight:{AL_VEE_ZDEATH_06:4,AL_SOL_ZDEATH_05:3,AL_SOL_UNTOUCH_06:9,AL_VEE_COMEBACK_06:5,AL_SOL_PHASE_06:7,AL_SOL_DECOY_06:4,AL_SOL_BUNK_06:11}
};
for(const [crew,entries] of Object.entries(gates))for(const [id,min] of Object.entries(entries))
 check('callback only after acquisition '+id,crewSeason(crew).bank.find(l=>l.id===id).minChapter===min);
console.log(passed+' crew season assertions passed');
