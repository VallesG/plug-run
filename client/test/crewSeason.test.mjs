// Season One (updated script) against the manuscript and the measured predicates.
import { readFileSync } from 'node:fs';
import { crewSeason, seasonChapter, seasonCue, seasonHouses, seasonJob, seasonFinish, SEASON_PRIORITY } from '../src/logic/crewSeason.js';
import { CAMPAIGN_CADENCE_BANTER } from '../src/logic/campaignCadence.js';
import { contactCue, contactDialoguePages, contactPanelLayout, praiseEarned } from '../src/logic/contacts.js';
import { beginBlockRun, recordHouseClear, recordBlockDeath, blockRunStats } from '../src/logic/blockRun.js';
import { missionPickupSound } from '../src/logic/missionItem.js';
let passed=0;
function check(name,ok){if(!ok)throw Error(name);passed++;}
const categories={flawless:'FLAWLESS',comeback:'COMEBACK',noDeaths:'ZERO_DEATHS',noPowers:'NO_POWERS',phase:'POWER_PHASE',dash:'POWER_DASH',decoy:'POWER_DECOY'};
const LEGACY=[1,4,7,9,10,13];
const fits=(text,name)=>{
 for(const [w,h] of [[280,480],[390,844],[900,640]])for(const part of contactDialoguePages(text,w,h)){
  const l=contactPanelLayout(w,h,{},part);
  check(name+' fits '+w,l.dialogue.y-l.dialogue.h/2+l.dialogue.copyTop+l.dialogue.lines*l.dialogue.lineHeight<=l.action.y-l.action.h/2);
 }
};
check('unknown crew never invents an arc',crewSeason(null)===null&&crewSeason('__proto__')===null&&seasonCue('unknown',{house:9})===null);
check('the script\'s seven measured slots, in priority order',SEASON_PRIORITY.join(',')==='flawless,comeback,noDeaths,noPowers,phase,dash,decoy');

// Every spoken line is the script's, word for word, and none is missing.
const manuscript=readFileSync(new URL('../../SEASON_ONE_UPDATED.md',import.meta.url),'utf8').replace(/\r/g,'');
const scripted=[...manuscript.matchAll(/^\*\*(SWITCH|MAGS|BRICK|ROOK|VEE|SOL)\*\* (.+)$/gm)].map(m=>m[1].toLowerCase()+': '+m[2]);
const played=[];
for(const gangID of ['crossline','iron-row','afterlight'])for(const story of crewSeason(gangID).chapters){
 for(const house of Object.keys(story.beats).map(Number).sort((a,b)=>a-b))for(const p of story.beats[house].pages)played.push(p.speaker+': '+p.text.replaceAll('{city}','Duskport'));
 for(const p of story.finish)played.push(p.speaker+': '+p.text.replaceAll('{city}','Duskport'));
}
check('every scripted line plays, in order',played.length===scripted.length&&played.every((line,i)=>line===scripted[i]));

for(const gangID of ['iron-row','crossline','afterlight']){
 const arc=crewSeason(gangID);
 check('ten chapters '+gangID,arc.chapters.length===10);
 check('unique bank ids '+gangID,new Set(arc.bank.map(l=>l.id)).size===arc.bank.length);
 check('every reactive category has lines for both voices '+gangID,Object.values(categories).every(c=>[arc.primary,arc.secondary].every(s=>arc.bank.some(l=>l.category===c&&l.speaker===s&&l.minChapter<=1))));
 check('no retired bunk lines '+gangID,!arc.bank.some(l=>l.category==='BUNK_BAGS'));
 check('ten distinct jobs '+gangID,new Set(arc.chapters.map(c=>c.jobName)).size===10);
 check('continuation falls through '+gangID,seasonChapter(gangID,10)===null&&seasonJob(gangID,10)===null&&seasonFinish(gangID,10)===null);
 for(const line of arc.bank)fits(line.text,'bank '+line.id);
 for(let chapter=0;chapter<10;chapter++){
  const story=seasonChapter(gangID,chapter),job=seasonJob(gangID,chapter);
  check('job label matches chapter '+gangID+chapter,job.name===story.jobName&&job.label===story.jobName.toUpperCase()&&job.short===story.short&&job.short.length<=14);
  check('pickup preserves existing sound '+gangID+chapter,missionPickupSound(job.id)?.length>0);
  check('exactly one reactive slot '+gangID+chapter,Object.values(story.beats).filter(b=>b.reactive).length===1);
  check('house 9 is always the job '+gangID+chapter,!!story.beats[9]);
  check('the Rivals tease is chapter one only, at door 6 '+gangID+chapter,
   Object.entries(story.beats).filter(([,b])=>b.rivalsTease).map(([h])=>h).join()===(chapter===0?'6':''));
  for(const blockIndex of [1,71+chapter]){
   const houses=seasonHouses(gangID,{chapter,blockIndex});
   if(story.beats[6]?.rivalsTease)check('tease only before Rivals opens '+gangID+chapter+'/'+blockIndex,houses.includes(6)===(blockIndex===1));
   const ids=new Set();
   for(let house=1;house<=15;house++){
    const cue=seasonCue(gangID,{chapter,house,blockIndex,cityName:'Railhaven'});
    check('exact schedule '+gangID+chapter+'/'+house,Boolean(cue)===houses.includes(house));
    if(!cue)continue;
    ids.add(cue.eventID);
    if(LEGACY.includes(house))check('legacy identity preserved '+gangID+chapter+'/'+house,cue.eventID===contactCue({gangID,house,blockIndex}).eventID);
    else check('new door has its own identity '+gangID+chapter+'/'+house,cue.eventID.endsWith('/door-'+house+'/'+arc.primary));
    check('pages use crew speakers '+gangID+chapter+'/'+house,cue.pages.every(p=>[arc.primary,arc.secondary].includes(p.speaker)));
    check('the block\'s city, not a hardcoded one '+gangID+chapter+'/'+house,!JSON.stringify(cue.pages).includes('Duskport'));
    for(const p of cue.pages)fits(p.text,'story '+gangID+chapter+'/'+house);
    if(!story.beats[house].reactive){
     const praised=seasonCue(gangID,{chapter,house,blockIndex,cityName:'Railhaven',earnedPraise:[...SEASON_PRIORITY],telemetryComplete:true});
     check('story beats never take praise '+gangID+chapter+'/'+house,JSON.stringify(cue)===JSON.stringify(praised)&&praised.praiseKey===null&&praised.lineID===null);
    }
   }
   check('one claim per door '+gangID+chapter,ids.size===houses.length);
  }
  const house=Number(Object.keys(story.beats).find(h=>story.beats[h].reactive)),beat=story.beats[house];
  const authored=beat.pages.map(p=>({speaker:p.speaker,text:p.text.replaceAll('{city}','this city')}));
  for(const key of SEASON_PRIORITY){
   const cue=seasonCue(gangID,{chapter,house,blockIndex:chapter+1,earnedPraise:[key],telemetryComplete:true});
   const line=arc.bank.find(l=>l.id===cue.lineID);
   check('the opening slot says what was measured '+gangID+chapter+key,cue.praiseKey===key&&line.category===categories[key]&&line.speaker===beat.pages[0].speaker&&line.minChapter<=chapter+1);
   check('spoken by whoever opens the beat '+gangID+chapter+key,cue.pages[0].speaker===beat.pages[0].speaker&&cue.pages[0].text===line.text);
   check('the scripted exchange follows unchanged '+gangID+chapter+key,JSON.stringify(cue.pages.slice(1))===JSON.stringify(authored));
   check('selection is deterministic '+gangID+chapter+key,JSON.stringify(cue)===JSON.stringify(seasonCue(gangID,{chapter,house,blockIndex:chapter+1,earnedPraise:[key],telemetryComplete:true})));
   const missing=seasonCue(gangID,{chapter,house,earnedPraise:[key],telemetryComplete:false});
   check('missing history hears the neutral line '+gangID+chapter+key,missing.praiseKey===null&&missing.lineID===beat.fallback&&
    arc.bank.find(l=>l.id===beat.fallback).category==='NEUTRAL_FALLBACK'&&JSON.stringify(missing.pages.slice(1))===JSON.stringify(authored));
   const capped=seasonCue(gangID,{chapter,house,earnedPraise:[key],usedPraise:['phase'],telemetryComplete:true});
   check('one praise per block '+gangID+chapter+key,capped.praiseKey===null&&capped.lineID===null&&JSON.stringify(capped.pages)===JSON.stringify(authored));
  }
  check('bunk alone is not a slot '+gangID+chapter,seasonCue(gangID,{chapter,house,earnedPraise:['bunk'],telemetryComplete:true}).lineID===beat.fallback);
  const priority=seasonCue(gangID,{chapter,house,earnedPraise:[...SEASON_PRIORITY],telemetryComplete:true});
  check('several earned: priority wins '+gangID+chapter,priority.praiseKey==='flawless');
  const finish=seasonFinish(gangID,chapter,'Railhaven');
  check('finish is the script\'s door 15 '+gangID+chapter,finish.length===story.finish.length&&finish.every((p,i)=>p.speaker===story.finish[i].speaker)&&new Set(finish.map(p=>p.speaker)).size===2);
  for(const p of finish)fits(p.text,'finish '+gangID+chapter);
 }
}

// A steady playstyle never hears the same reactive line twice in a season,
// and no crew borrows another crew's line word for word.
for(const gangID of ['crossline','iron-row','afterlight'])for(const key of [...SEASON_PRIORITY,'neutral'])for(const start of [1,5]){
 const ids=crewSeason(gangID).chapters.map((st,ch)=>{const house=Number(Object.keys(st.beats).find(h=>st.beats[h].reactive));
  return seasonCue(gangID,{chapter:ch,house,blockIndex:ch*2+start,earnedPraise:key==='neutral'?[]:[key],telemetryComplete:key!=='neutral'}).lineID;});
 check('no repeated reactive line in a season '+gangID+key,new Set(ids).size===ids.length);
}
const texts=['crossline','iron-row','afterlight'].flatMap(g=>crewSeason(g).bank.map(l=>l.text.replace(/Crossline|Iron Row|Afterlight/g,'X')));
check('no bank line shared across crews',new Set(texts).size===texts.length);
// Brick is a woman; Mags too. Nothing the crews say may say otherwise.
const allText=[...['crossline','iron-row','afterlight'].flatMap(g=>[...crewSeason(g).bank.map(l=>l.text),
  ...crewSeason(g).chapters.flatMap(c=>[c.jobName,c.reason,...Object.values(c.beats).flatMap(b=>b.pages.map(p=>p.text)),...c.finish.map(p=>p.text)])]),
 ...Object.values(CAMPAIGN_CADENCE_BANTER).flat(2).map(p=>p.text)];
check('no he/him for Brick or Mags',!allText.some(t=>/(Brick|Mags)\b[^.?!]*\b(he|him|his|himself)\b/i.test(t)));
check('Brick\'s jacket is too small for her',seasonJob('iron-row',1).name.includes('too small for her'));
// Callbacks point at things this script recovers, and only after it does.
check('no hardware the script dropped',!allText.some(t=>/crystal radio|heat sink|canal laser|brass ringer|amber strobe|neon transformer|spray tips|air-raid siren|brass clock|counter bell/i.test(t)));
const gates={CL_SWT_ZDEATH_06:2,CL_MAG_ZDEATH_05:7,CL_MAG_UNTOUCH_06:9,CL_MAG_COMEBACK_06:7,IR_ROK_ZDEATH_06:4,
 AL_VEE_ZDEATH_06:4,AL_SOL_ZDEATH_05:3,AL_SOL_UNTOUCH_06:9,AL_SOL_PHASE_06:7,AL_SOL_DECOY_06:4};
for(const [id,min] of Object.entries(gates)){
 const crew={CL:'crossline',IR:'iron-row',AL:'afterlight'}[id.slice(0,2)];
 check('callback only after the item is recovered '+id,crewSeason(crew).bank.find(l=>l.id===id).minChapter===min);
}

// Exact measured boundaries; missing history must not become zeros.
const init=()=>beginBlockRun(null,1,1).state;
const clear=(s,h,extra={})=>recordHouseClear(s,1,{house:h,hits:0,bunk:false,powers:[],...extra}).state;
check('no recorded clears earns nothing',praiseEarned(blockRunStats(init(),1)).length===0);
const clean=clear(clear(init(),1),2);
check('complete zero evidence earns flawless',praiseEarned(blockRunStats(clean,1)).includes('flawless'));
check('a hit costs flawless, not zero deaths',!praiseEarned(blockRunStats(clear(init(),1,{hits:1}),1)).includes('flawless')&&praiseEarned(blockRunStats(clear(init(),1,{hits:1}),1)).includes('noDeaths'));
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
console.log(passed+' crew season assertions passed');
