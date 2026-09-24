import { readFileSync } from 'node:fs';
// Iron Row's Season 1 through the shared crew cue, and legacy/incomplete-history boundaries.
import { IRON_ROW_CHAPTERS, IRON_ROW_DIALOGUE_BANK } from '../src/logic/ironRowSeason.js';
import { seasonChapter, seasonCue, seasonHouses, seasonJob, seasonFinish, SEASON_PRIORITY as IRON_ROW_PRIORITY } from '../src/logic/crewSeason.js';
import { beginBlockRun, createBlockRun, recordHouseClear, recordBlockDeath, recordMissionOutcome, blockRunStats } from '../src/logic/blockRun.js';
import { praiseEarned, contactCue, contactDialoguePages, contactPanelLayout } from '../src/logic/contacts.js';
import { missionPickupSound } from '../src/logic/missionItem.js';
let passed=0;
function check(name,ok){if(!ok)throw Error(name);passed++;}
const ironRowChapter=c=>seasonChapter('iron-row',c),ironRowJob=c=>seasonJob('iron-row',c);
const ironRowFinish=(c,city)=>seasonFinish('iron-row',c,city),ironRowCue=o=>seasonCue('iron-row',o);
const fixedSchedules=[[1,4,9,10],[1,7,9,13],[3,9,11,13],[1,7,9,13],[1,4,9,10],
  [4,7,9,13],[1,4,9,11],[6,9,10,13],[1,4,9,13],[1,4,9,13]];
check('legacy claimed beat identity survives upgrade',ironRowCue({chapter:0,house:9,blockIndex:5}).eventID===contactCue({gangID:'iron-row',house:9,blockIndex:5}).eventID);
check('ten authored chapters',IRON_ROW_CHAPTERS.length===10);
check('unique bank lines, no retired bunk category',new Set(IRON_ROW_DIALOGUE_BANK.map(line=>line.id)).size===IRON_ROW_DIALOGUE_BANK.length&&
  !IRON_ROW_DIALOGUE_BANK.some(line=>line.category==='BUNK_BAGS'));
check('no manuscript citation debris',!JSON.stringify(IRON_ROW_CHAPTERS).includes('MD'));
check('one chapter-specific item per chapter',new Set(IRON_ROW_CHAPTERS.map(c=>c.jobName)).size===10);
check('continuation does not replay the finale',ironRowChapter(10)===null&&ironRowJob(10)===null&&ironRowFinish(10)===null);
check('season priority matches the script\'s slots',IRON_ROW_PRIORITY.join(',')==='flawless,comeback,noDeaths,noPowers,phase,dash,decoy');
for(let chapter=0;chapter<10;chapter++){
  const story=ironRowChapter(chapter),spoken=[];
  for(let house=1;house<=15;house++){
    const cue=ironRowCue({chapter,house,blockIndex:chapter+1,cityName:'Copper Bay'});
    check('authored silence '+chapter+'/'+house,Boolean(cue)===fixedSchedules[chapter].includes(house)&&seasonHouses('iron-row',{chapter,blockIndex:chapter+1}).includes(house)===Boolean(cue));
    if(!cue)continue;
    check('speaker contract '+chapter+'/'+house,cue.pages.every(p=>['brick','rook'].includes(p.speaker)&&p.text));
    check('cue stable '+chapter+'/'+house,JSON.stringify(cue)===JSON.stringify(ironRowCue({chapter,house,blockIndex:chapter+1,cityName:'Copper Bay'})));
    check('neutral never marks praise '+chapter+'/'+house,cue.praiseKey===null);
    if(house<9)check('look-ahead is not a current pickup instruction '+chapter+'/'+house,cue.pages.every(p=>!/grab.*case|violet case/i.test(p.text)));
    spoken.push(...cue.pages.map(p=>p.text));
  }
  const job=ironRowJob(chapter);
  check('pickup agrees with job '+chapter,job.name===story.jobName&&typeof job.short==='string'&&job.short.length<=14);
  check('existing mechanical foley '+chapter,missionPickupSound(job.id)?.length>0);
  const finish=ironRowFinish(chapter,'Copper Bay');
  check('duo speaks in authored order '+chapter,finish.length===story.finish.length&&new Set(finish.map(p=>p.speaker)).size===2);
  check('no Duskport literal on another city '+chapter,!JSON.stringify([...finish,...spoken]).includes('Duskport'));
  check('no server-wide victory promise '+chapter,!JSON.stringify(finish).includes('rival crew swept'));
  const house=Number(Object.keys(story.beats).find(h=>story.beats[h].reactive));
  check('exactly one designated reactive slot '+chapter,Object.values(story.beats).filter(b=>b.reactive).length===1);
  for(const key of IRON_ROW_PRIORITY){
    const cue=ironRowCue({chapter,house,blockIndex:chapter+1,earnedPraise:[key],telemetryComplete:true});
    const line=IRON_ROW_DIALOGUE_BANK.find(l=>l.id===cue.lineID);
    check('eligible variant spoken '+chapter+'/'+key,cue.praiseKey===key&&line.minChapter<=chapter+1&&line.speaker===story.beats[house].pages[0].speaker&&cue.pages[0].text===line.text);
    check('authored exchange follows unchanged '+chapter+'/'+key,cue.pages.slice(1).map(p=>p.text).join('|')===story.beats[house].pages.map(p=>p.text.replaceAll('{city}','this city')).join('|'));
    const capped=ironRowCue({chapter,house,earnedPraise:[key],usedPraise:['flawless'],telemetryComplete:true});
    check('block cap preserves fixed dialogue '+chapter+'/'+key,capped.praiseKey===null&&capped.pages.length===story.beats[house].pages.length&&capped.pages[0].text===story.beats[house].pages[0].text.replaceAll('{city}','this city'));
    const absent=ironRowCue({chapter,house,earnedPraise:[key],telemetryComplete:false});
    check('missing telemetry is neutral '+chapter+'/'+key,absent.praiseKey===null&&absent.lineID===story.beats[house].fallback);
  }
  for(const house of [1,4,7,9]){
    if(!story.beats[house])continue;
    const a=ironRowCue({chapter,house}),b=ironRowCue({chapter,house,earnedPraise:IRON_ROW_PRIORITY,telemetryComplete:true});
    check('story tease and job unchanged '+chapter+'/'+house,JSON.stringify(a.pages)===JSON.stringify(b.pages)&&b.praiseKey===null);
  }
}
const clear=(state,house,extra={})=>recordHouseClear(state,1,{house,hits:0,bunk:false,powers:[],...extra}).state;
let fresh=beginBlockRun(null,1,1).state;
check('tracking begins before the first attempt',fresh.historyKnown);
check('mid-block cannot invent history',!beginBlockRun(null,1,9).state.historyKnown);
check('legacy cannot be promoted on reload',!beginBlockRun({version:1,blockIndex:1,cleared:[],deaths:0},1,1).state.historyKnown);
let clean=clear(clear(clear(fresh,1),2),3),stats=blockRunStats(clean,1);
check('fully measured zero categories',stats.telemetryComplete&&praiseEarned(stats).includes('flawless')&&praiseEarned(stats).includes('noPowers'));
check('empty record earns nothing',praiseEarned(blockRunStats(fresh,1)).length===0);
check('gap earns nothing',praiseEarned(blockRunStats(clear(clear(fresh,1),3),1)).length===0);
for(const extra of [{hits:undefined},{hits:-1},{hits:NaN},{powers:undefined},{powers:['laser']},{powers:['phase','dash','decoy']},{bunk:undefined}]){
  const bad=blockRunStats(clear(fresh,1,extra),1);
  check('incomplete metrics earn nothing '+JSON.stringify(extra),!bad.telemetryComplete&&praiseEarned(bad).length===0);
}
for(const deaths of [undefined,-1,'0',NaN]){
 const bad=blockRunStats({...clean,deaths},1);
 check('corrupt death history cannot be zero '+String(deaths),!bad.telemetryComplete&&praiseEarned(bad).length===0);
}
for(const cleared of [undefined,'bad',[...clean.cleared,clean.cleared[0]],[...clean.cleared,{house:99}]]){
 const bad=blockRunStats({...clean,cleared},1);
 check('corrupted clear history is neutral '+JSON.stringify(cleared),!bad.telemetryComplete&&praiseEarned(bad).length===0);
}
const legacy={version:1,blockIndex:1,cleared:[{house:1,hits:0,bunk:false,powers:[]}],deaths:0};
check('legacy positive-looking clears stay neutral',praiseEarned(blockRunStats(legacy,1)).length===0);
check('JSON roundtrip retains evidence',blockRunStats(JSON.parse(JSON.stringify(clean)),1).flawless);
let comeback=clean;for(let i=0;i<4;i++)comeback=recordBlockDeath(comeback,1).state;
check('open minimum comeback',praiseEarned(blockRunStats(comeback,1)).includes('comeback')&&!blockRunStats(comeback,1).noDeaths);
check('two bunk-bearing clears meet a conservative lower bound',blockRunStats(clear(clear(fresh,1,{bunk:true}),2,{bunk:true}),1).bunks===2);
for(const power of ['phase','dash','decoy']){
 const lead=clear(clear(fresh,1,{powers:[power]}),2,{powers:[power]});
 check('strict measured power lead '+power,blockRunStats(lead,1).topPower===power);
}
check('tied powers earn no preferred power',blockRunStats(clear(fresh,1,{powers:['phase','dash']}),1).topPower===null);
for(const outcome of ['win','miss']){
 const cue=contactCue({gangID:'crossline',house:10,missionOutcome:outcome,stats});
 check('mission debrief never consumes an unspoken praise '+outcome,cue.praiseKey===null);
}
for(const line of IRON_ROW_DIALOGUE_BANK){
 check('bank has no forbidden real-stash language '+line.id,!/real stash|charge|scraped fender/i.test(line.text));
 if(line.category==='NO_POWERS')check('powers explicitly scoped to clears '+line.id,/clear|successful|winning|extract/i.test(line.text));
}
const allCopy=[...IRON_ROW_DIALOGUE_BANK.map(l=>l.text),...IRON_ROW_CHAPTERS.flatMap(c=>[...Object.values(c.beats).flatMap(b=>b.pages.map(p=>p.text)),...c.finish.map(p=>p.text)])];
for(const [w,h] of [[280,480],[390,844],[900,640]])for(const copy of allCopy){
 for(const page of contactDialoguePages(copy,w,h)){
  const a=contactPanelLayout(w,h,{},page);
  const bottom=a.dialogue.y-a.dialogue.h/2+a.dialogue.copyTop+a.dialogue.lines*a.dialogue.lineHeight;
  check('paginated copy clears button '+w+'x'+h,bottom<=a.action.y-a.action.h/2);
 }
}

// Run the real account-scoped persistence adapter, not a separate model.
const storageSource=readFileSync(new URL('../src/utils/blockRunProgress.js',import.meta.url),'utf8')
  .replace(/^import[\s\S]*?;\s*/gm,'').replace(/\bexport /g,'');
const saved=new Map();let account='a';
const bindings={createBlockRun,beginBlockRun,recordHouseClear,recordBlockDeath,recordMissionOutcome,blockRunStats,
  getUserID:()=>account,localStorage:{getItem:key=>saved.has(key)?saved.get(key):null,
    setItem:(key,value)=>saved.set(key,value)},console:{warn(){}}};
const storage=new Function(...Object.keys(bindings),storageSource+'\nreturn {startBlockRunTracking,noteHouseClear,noteBlockDeath,getBlockRunStats};')(...Object.values(bindings));
check('real adapter starts first-house history',storage.startBlockRunTracking(1,1));
check('reload does not reset the history',!storage.startBlockRunTracking(1,1));
storage.noteBlockDeath(1);
storage.noteHouseClear(1,{house:1,hits:0,bunk:false,powers:[]});
check('death survives account storage and scene replacement',storage.getBlockRunStats(1).deaths===1&&storage.getBlockRunStats(1).telemetryComplete);
account='b';
check('another account sees no manufactured clean history',!storage.getBlockRunStats(1).telemetryComplete);
check('mid-block legacy resume stays unknown',!storage.startBlockRunTracking(1,9));
storage.noteHouseClear(1,{house:9,hits:0,bunk:false,powers:[]});
check('partial recorded clear stays neutral',!storage.getBlockRunStats(1).telemetryComplete);
check('next block starts independently',storage.startBlockRunTracking(2,1));
account='corrupt';
saved.set('pr_blockrun_v1_corrupt','not json');
check('corrupt JSON is not a fresh zero-history run',!storage.startBlockRunTracking(1,1));
saved.set('pr_blockrun_v1_corrupt','null');
check('stored null is not a fresh zero-history run',!storage.startBlockRunTracking(1,1));
account='legacy';
saved.set('pr_blockrun_v1_legacy',JSON.stringify(legacy));
check('legacy migration preserves clears but suppresses praise',storage.getBlockRunStats(1).houses===1&&!storage.getBlockRunStats(1).telemetryComplete);
check('tracking refuses to bless legacy history at house one',!storage.startBlockRunTracking(1,1));
check('storage uses only the existing block-run namespace',[...saved.keys()].every(key=>key.startsWith('pr_blockrun_v1_')));

console.log(passed+' Iron Row season assertions passed');
