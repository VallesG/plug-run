// Full seven-house exterior, with its own pool-course seed; never a story map.
import { drawBlockMap } from './BlockMap.js';
export function drawRivalDistrictMap(scene,modal,race,{won=false}={}){
  const facade={worldBlock:race.course,currentRouteID:race.course.id,
    add:scene.add,tweens:scene.tweens};
  return drawBlockMap(facade,modal,{maps:7,cleared:7,entering:false,
    animate:false,caption:false,labels:true,fog:false,marker:false,
    celebration:true,gangID:won?race.territoryGang:null});
}
