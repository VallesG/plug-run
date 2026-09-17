// Device-local race territory only. No shared standings, clocks or randomness.
const CREWS=['crossline','iron-row','afterlight'];
export const RIVAL_CITY_BLOCKS=7;
export function rivalTerritory(value={}) {
  const completed=Number.isSafeInteger(value?.completed)&&value.completed>=0?value.completed:0;
  const owners={};
  for(const [key,owner] of Object.entries(value?.owners||{}))
    if(Number.isSafeInteger(+key)&&+key>0&&+key<=completed&&CREWS.includes(owner))owners[key]=owner;
  return {version:1,completed,owners};
}
export function rivalDistrict(index=1){
  const n=Number.isSafeInteger(index)&&index>0?index:1;
  return {index:n,city:Math.floor((n-1)/7)+1,slot:(n-1)%7+1};
}
export function claimRivalDistrict(value,event={}) {
  const state=rivalTerritory(value),d=rivalDistrict(event.index);
  if(event.recording||event.result!=='win'||event.houses!==7||event.index!==state.completed+1
    ||event.courseSlot!==d.slot)return {state,applied:false};
  const owner=CREWS.includes(event.gangID)?event.gangID:null;
  return {state:{version:1,completed:event.index,owners:owner?{...state.owners,[event.index]:owner}:state.owners},applied:true};
}
