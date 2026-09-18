// Pure Season 1 adapter. Chapters remain crew-owned, zero-based and persistence-gated.
import { IRON_ROW_CHAPTERS, IRON_ROW_DIALOGUE_BANK, ironRowCue, ironRowFinish, ironRowJob } from './ironRowSeason.js';
import { CROSSLINE_CHAPTERS, CROSSLINE_DIALOGUE_BANK } from './crosslineSeason.js';
import { AFTERLIGHT_CHAPTERS, AFTERLIGHT_DIALOGUE_BANK } from './afterlightSeason.js';
export const SEASON_PRIORITY = Object.freeze(['flawless','comeback','noDeaths','noPowers','bunk','phase','dash','decoy']);
const categories={flawless:'FLAWLESS',comeback:'COMEBACK',noDeaths:'ZERO_DEATHS',noPowers:'NO_POWERS',bunk:'BUNK_BAGS',phase:'POWER_PHASE',dash:'POWER_DASH',decoy:'POWER_DECOY'};
const arcs = {
  crossline:{chapters:CROSSLINE_CHAPTERS,bank:CROSSLINE_DIALOGUE_BANK,primary:'switch',secondary:'mags',foley:'tube'},
  'iron-row':{chapters:IRON_ROW_CHAPTERS,bank:IRON_ROW_DIALOGUE_BANK,primary:'brick',secondary:'rook',foley:'keys'},
  afterlight:{chapters:AFTERLIGHT_CHAPTERS,bank:AFTERLIGHT_DIALOGUE_BANK,primary:'vee',secondary:'sol',foley:'marker'}
};
const safeChapter=v=>Number.isSafeInteger(v)&&v>=0?v:0;
const safeBlock=v=>Number.isSafeInteger(v)&&v>0?v:1;
const render=(text,cityName)=>String(text).replaceAll('{city}',cityName||'this city');
export function crewSeason(gangID){return Object.prototype.hasOwnProperty.call(arcs,gangID)?arcs[gangID]:null;}
export function seasonChapter(gangID,chapter=0){return crewSeason(gangID)?.chapters[safeChapter(chapter)]||null;}
export function seasonJob(gangID,chapter=0){
  if(gangID==='iron-row')return ironRowJob(chapter);
  const arc=crewSeason(gangID),story=seasonChapter(gangID,chapter);
  return story?{id:arc.foley,label:story.jobName.toUpperCase(),short:story.short,name:story.jobName}:null;
}
export function seasonFinish(gangID,chapter=0,cityName){
  if(gangID==='iron-row')return ironRowFinish(chapter,cityName);
  const story=seasonChapter(gangID,chapter);
  return story?story.finish.map(p=>({...p,text:render(p.text,cityName)})):null;
}
export function seasonCue(gangID,{chapter=0,house,blockIndex=1,cityName,earnedPraise=[],usedPraise=[],telemetryComplete=false}={}){
  if(gangID==='iron-row')return ironRowCue({chapter,house,blockIndex,cityName,earnedPraise,usedPraise,telemetryComplete});
  const arc=crewSeason(gangID),story=seasonChapter(gangID,chapter),beat=story?.beats[house];
  if(!arc||!beat)return null;
  const pages=beat.pages.map(p=>({...p,text:render(p.text,cityName)}));
  let praiseKey=null,lineID=null;
  if(beat.reactive){
    const key=telemetryComplete===true&&usedPraise.length===0
      ?SEASON_PRIORITY.find(k=>earnedPraise.includes(k)):null;
    const candidates=arc.bank.filter(l=>l.speaker===pages[0].speaker&&l.category===categories[key]
      &&beat.eligibleIDs.includes(l.id)&&l.minChapter<=story.number);
    let line=null;
    if(key&&candidates.length){
      line=candidates[(safeBlock(blockIndex)*17+house*7+story.number*13)%candidates.length];
      praiseKey=key;
    }else if(usedPraise.length===0)line=arc.bank.find(l=>l.id===beat.fallback);
    if(line){
      const tail=pages[0].text.slice(pages[0].text.indexOf('.')+1).trim();
      pages[0].text=line.text+(tail?' '+tail:'');lineID=line.id;
    }
  }
  const beatID=({1:'open',4:'checkin-1',7:'tease',9:'brief',10:'debrief',13:'checkin-2'})[house];
  // Legacy identities are host-based, not page-speaker-based. Keep seen beats seen.
  return {
    eventID:'contact/v1/block-'+safeBlock(blockIndex)+'/'+beatID+'/'+(house===9?arc.secondary:arc.primary),
    beat:{id:beatID,house,kind:house===1?'open':house===9?'brief':house===7?'tease':'story'},
    pages,text:pages[0].text,speaker:pages[0].speaker,praiseKey,lineID,
    chapterLabel:'CHAPTER '+story.number+' · '+story.title.toUpperCase(),
    action:'VIEW THE BLOCK  >>'
  };
}
