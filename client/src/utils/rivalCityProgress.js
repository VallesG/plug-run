// Account-scoped personal map; deliberately separate from the capped results log.
import { rivalTerritory, rivalDistrict, claimRivalDistrict, rivalCityName } from '../logic/rivalCity.js';
import { rivalPoolCourse } from '../logic/rivals.js';
import { getUserID } from './userManager.js';
const key=()=> 'pr_rival_city_v1_'+getUserID();
const volatile=new Map();
export function getRivalTerritory(){
  let value=volatile.get(key());
  if(!value)try{value=JSON.parse(localStorage.getItem(key())||'null');}catch{}
  return rivalTerritory(value?.version===1?value:{});
}
export function rivalCityView(index=getRivalTerritory().completed+1){
  const state=getRivalTerritory(),d=rivalDistrict(index),first=(d.city-1)*7+1;
  return {mapVariant:'rivals',city:{number:d.city,name:rivalCityName(d.city),firstBlock:first},
    clearedBlocks:Math.max(0,Math.min(7,state.completed-first+1)),
    blocks:Array.from({length:7},(_,i)=>({blockIndex:first+i,local:i+1,
      course:rivalPoolCourse(rivalDistrict(first+i).slot),owner:state.owners[first+i]||null,
      status:first+i<=state.completed?'cleared':first+i===index?'current':'locked'}))};
}
export function completeRivalDistrict(race){
  if(!race?.territoryIndex||race.territoryUser!==getUserID())return {applied:false,state:getRivalTerritory(),saved:true};
  const result=claimRivalDistrict(getRivalTerritory(),{index:race.territoryIndex,
    courseSlot:race.territorySlot ?? race.course.slot,result:race.result,houses:race.clearTimes.length,
    gangID:race.territoryGang,recording:race.recording});
  result.saved=true;
  if(result.applied)try{localStorage.setItem(key(),JSON.stringify(result.state));volatile.delete(key());}
    catch(error){volatile.set(key(),result.state);result.saved=false;console.warn('[Rivals city] Save unavailable',error);}
  return result;
}
