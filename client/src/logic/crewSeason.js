// Pure Season 1 adapter. Chapters remain crew-owned, zero-based and persistence-gated.
import { IRON_ROW_CHAPTERS, IRON_ROW_DIALOGUE_BANK } from './ironRowSeason.js';
import { CROSSLINE_CHAPTERS, CROSSLINE_DIALOGUE_BANK } from './crosslineSeason.js';
import { AFTERLIGHT_CHAPTERS, AFTERLIGHT_DIALOGUE_BANK } from './afterlightSeason.js';
// The script's reactive slots, in the order one wins when several are earned.
// Every key is measured by blockRun.js; a block without complete history
// earns none of them and hears the neutral line instead.
export const SEASON_PRIORITY = Object.freeze(['flawless','comeback','noDeaths','noPowers','phase','dash','decoy']);
const categories={flawless:'FLAWLESS',comeback:'COMEBACK',noDeaths:'ZERO_DEATHS',noPowers:'NO_POWERS',phase:'POWER_PHASE',dash:'POWER_DASH',decoy:'POWER_DECOY'};
const arcs = {
  crossline:{chapters:CROSSLINE_CHAPTERS,bank:CROSSLINE_DIALOGUE_BANK,primary:'switch',secondary:'mags',foley:'tube'},
  'iron-row':{chapters:IRON_ROW_CHAPTERS,bank:IRON_ROW_DIALOGUE_BANK,primary:'brick',secondary:'rook',foley:'keys'},
  afterlight:{chapters:AFTERLIGHT_CHAPTERS,bank:AFTERLIGHT_DIALOGUE_BANK,primary:'vee',secondary:'sol',foley:'marker'}
};
// Claim identities from before the rewrite, so a beat already seen in a block
// stays seen. Doors the old schedule never used get their own.
const LEGACY_BEATS={1:'open',4:'checkin-1',7:'tease',9:'brief',10:'debrief',13:'checkin-2'};
const safeChapter=v=>Number.isSafeInteger(v)&&v>=0?v:0;
const safeBlock=v=>Number.isSafeInteger(v)&&v>0?v:1;
const render=(text,cityName)=>String(text).replaceAll('{city}',cityName||'this city');
/** How many earlier chapters this speaker opened the reactive beat of. */
const speakerTurn=(arc,number,speaker)=>arc.chapters.slice(0,number-1)
  .filter(c=>Object.values(c.beats).some(b=>b.reactive&&b.pages[0].speaker===speaker)).length;
export function crewSeason(gangID){return Object.prototype.hasOwnProperty.call(arcs,gangID)?arcs[gangID]:null;}
export function seasonChapter(gangID,chapter=0){return crewSeason(gangID)?.chapters[safeChapter(chapter)]||null;}
/** Does this beat play in this block? The Block Rivals tease only before Rivals opens. */
const beatPlays=(beat,blockIndex)=>Boolean(beat)&&!(beat.rivalsTease&&safeBlock(blockIndex)!==1);
/** The houses a chapter speaks before, in this block. */
export function seasonHouses(gangID,{chapter=0,blockIndex=1}={}){
  const story=seasonChapter(gangID,chapter);
  if(!story)return [];
  return Object.keys(story.beats).map(Number).filter(h=>beatPlays(story.beats[h],blockIndex)).sort((a,b)=>a-b);
}
export function seasonJob(gangID,chapter=0){
  const arc=crewSeason(gangID),story=seasonChapter(gangID,chapter);
  return story?{id:arc.foley,label:story.jobName.toUpperCase(),short:story.short,name:story.jobName}:null;
}
export function seasonFinish(gangID,chapter=0,cityName){
  const story=seasonChapter(gangID,chapter);
  return story?story.finish.map(p=>({...p,text:render(p.text,cityName)})):null;
}
export function seasonCue(gangID,{chapter=0,house,blockIndex=1,cityName,earnedPraise=[],usedPraise=[],telemetryComplete=false}={}){
  const arc=crewSeason(gangID),story=seasonChapter(gangID,chapter),beat=story?.beats[house];
  if(!arc||!beatPlays(beat,blockIndex))return null;
  let pages=beat.pages.map(p=>({speaker:p.speaker,text:render(p.text,cityName)}));
  let praiseKey=null,lineID=null;
  if(beat.reactive){
    // The opening slot: whoever opens the beat says what they saw, then the
    // scripted exchange plays unchanged.
    const speaker=pages[0].speaker;
    const key=telemetryComplete===true&&usedPraise.length===0
      ?SEASON_PRIORITY.find(k=>earnedPraise.includes(k)):null;
    const candidates=key?arc.bank.filter(l=>l.speaker===speaker&&l.category===categories[key]&&l.minChapter<=story.number):[];
    let line=null;
    if(candidates.length){
      // Rotate: each chapter this speaker opens gets the next line, so a steady
      // playstyle does not hear the same compliment twice in a season.
      line=candidates[speakerTurn(arc,story.number,speaker)%candidates.length];
      praiseKey=key;
    }else if(usedPraise.length===0)line=arc.bank.find(l=>l.id===beat.fallback);
    if(line){pages=[{speaker,text:line.text},...pages];lineID=line.id;}
  }
  const beatID=LEGACY_BEATS[house]||'door-'+house;
  return {
    eventID:'contact/v1/block-'+safeBlock(blockIndex)+'/'+beatID+'/'+(house===9?arc.secondary:arc.primary),
    beat:{id:beatID,house,kind:house===1?'open':house===9?'brief':beat.rivalsTease||house===7?'tease':'story'},
    pages,text:pages[0].text,speaker:pages[0].speaker,praiseKey,lineID,
    chapterLabel:'CHAPTER '+story.number+' · '+story.title.toUpperCase(),
    action:'VIEW THE BLOCK  >>'
  };
}
