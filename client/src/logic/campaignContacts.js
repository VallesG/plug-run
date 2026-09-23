// Story-first presentation layer. Fixed chapter banter is not performance praise.
// Gap-filling banter adds stable claim IDs; existing authored identities stay intact.
import { crewSeason, seasonChapter, seasonCue, seasonFinish, seasonHouses } from './crewSeason.js';
import { campaignCadenceHouses, campaignCadencePages } from './campaignCadence.js';
export function campaignContactHouses(gangID,{chapter=0,blockIndex=1}={}) {
 const story=seasonChapter(gangID,chapter);
 if(!story)return [];
 const block=Number.isSafeInteger(blockIndex)&&blockIndex>0?blockIndex:1;
 return campaignCadenceHouses(seasonHouses(gangID,{chapter,blockIndex:block}),block+story.number);
}
export function campaignContactCue(gangID, options={}) {
  const cue=seasonCue(gangID,options);
  const story=seasonChapter(gangID,options.chapter);
  const arc=crewSeason(gangID);
  if(!story||!arc)return cue;
  const block=Number.isSafeInteger(options.blockIndex)&&options.blockIndex>0?options.blockIndex:1;
  if(options.house===15){
    const warnings={
      'iron-row':"Two Plugs in House 15. Watch both firing lines, grab the stash, and make the curb.",
      crossline:"House 15 has two Plugs. Track both lanes and keep your route to the car in sight.",
      afterlight:"Two Plugs behind this next door. Stay precise, find the stash, and commit to your exit."
    };
    const pages=[{speaker:arc.primary,text:warnings[gangID]},
      {speaker:arc.secondary,text:"Finish this last house. We'll be waiting at the car."}];
    return {eventID:'contact/v1/block-'+block+'/finale-warning/'+arc.primary,
      beat:{id:'finale-warning',house:15,kind:'warning'},pages,text:pages[0].text,
      speaker:arc.primary,praiseKey:null,lineID:null,
      chapterLabel:'HOUSE 15 · TWO PLUGS',action:'VIEW THE BLOCK  >>'};
  }
  if(cue)return cue;
  // Short crew banter where the script leaves a long silence.
  const authored=seasonHouses(gangID,{chapter:options.chapter,blockIndex:block});
  const added=campaignContactHouses(gangID,options).filter(h=>!authored.includes(h));
  const pages=campaignCadencePages(gangID,options.house,added,block+story.number);
  if(!pages)return null;
  const id='cadence-house-'+options.house;
  return {
    eventID:'contact/v1/block-'+block+'/'+id+'/'+arc.primary,
    beat:{id,house:options.house,kind:'banter'},
    pages,text:pages[0].text,speaker:pages[0].speaker,praiseKey:null,lineID:null,
    banterID:gangID+'/chapter-'+story.number+'/'+id,
    chapterLabel:'CHAPTER '+story.number+' · '+story.title.toUpperCase(),
    action:'VIEW THE BLOCK  >>'
  };
}
export function campaignContactFinish(gangID,chapter=0,cityName) {
  return seasonFinish(gangID,chapter,cityName);
}
