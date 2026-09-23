// Device-local race territory only. No shared standings, clocks or randomness.
import { RIVAL_COURSE_POOL } from './rivals.js';
const CREWS=['crossline','iron-row','afterlight'];
export const RIVAL_CITY_BLOCKS=7;
// Each circuit city is seven blocks, and each block is one course: city 1
// races courses 1-7, city 2 courses 8-14, city 3 courses 15-21, then the
// circuit starts again from course 1.
export const RIVAL_CITY_NAMES=['Riverside Circuit','Harborline Circuit','Skyline Circuit'];
export function rivalCityName(city=1){
  const n=Number.isSafeInteger(city)&&city>0?city:1;
  const lap=Math.floor((n-1)/RIVAL_CITY_NAMES.length);
  return RIVAL_CITY_NAMES[(n-1)%RIVAL_CITY_NAMES.length]+(lap?' '+(lap+1):'');
}
export function rivalTerritory(value={}) {
  const completed=Number.isSafeInteger(value?.completed)&&value.completed>=0?value.completed:0;
  const owners={};
  for(const [key,owner] of Object.entries(value?.owners||{}))
    if(Number.isSafeInteger(+key)&&+key>0&&+key<=completed&&CREWS.includes(owner))owners[key]=owner;
  return {version:1,completed,owners};
}
export function rivalDistrict(index=1){
  const n=Number.isSafeInteger(index)&&index>0?index:1;
  return {index:n,city:Math.floor((n-1)/RIVAL_CITY_BLOCKS)+1,slot:(n-1)%RIVAL_COURSE_POOL.length+1};
}
export function claimRivalDistrict(value,event={}) {
  const state=rivalTerritory(value),d=rivalDistrict(event.index);
  if(event.recording||event.result!=='win'||event.houses!==7||event.index!==state.completed+1
    ||event.courseSlot!==d.slot)return {state,applied:false};
  const owner=CREWS.includes(event.gangID)?event.gangID:null;
  return {state:{version:1,completed:event.index,owners:owner?{...state.owners,[event.index]:owner}:state.owners},applied:true};
}
