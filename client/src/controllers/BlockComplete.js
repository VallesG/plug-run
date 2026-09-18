// The completion modal's custom content, registered for replay hide/restore.
import { blockCompleteLayout } from '../logic/blockComplete.js';
import { crewSigil } from '../logic/crewSigils.js';
import { drawBlockMap } from './BlockMap.js';
export function drawBlockComplete(scene,modal,{gangID=null,stash=0,rep=0,maps=15,animate=true}={}) {
  if(!modal?.contentBounds||!modal.registerExtra)return null;
  const layout=blockCompleteLayout(modal.contentBounds),mark=crewSigil(gangID);
  const accent=mark?.color??0x4db2ff;
  const values=[['STASH',stash],['REP',rep]];
  for(let i=0;i<2;i++){
    const a=layout.badges[i];if(!a.w||!a.h)continue;
    const bg=scene.add.rectangle(a.x+a.w/2,a.y+a.h/2,a.w,a.h,0x141e20,1)
      .setStrokeStyle(1,accent,0.45).setDepth(20004).setScrollFactor(0);
    const label=scene.add.text(a.x+12,a.y+a.h*.28,values[i][0],{
      fontFamily:'Arial, sans-serif',fontSize:'10px',fontStyle:'bold',color:'#9aaba8'
    }).setOrigin(0,.5).setDepth(20005).setScrollFactor(0);
    const value=scene.add.text(a.x+a.w-12,a.y+a.h*.62,
      String(Number.isFinite(values[i][1])?Math.max(0,Math.round(values[i][1])):0),{
      fontFamily:'Arial, sans-serif',fontSize:a.w<115?'19px':'24px',fontStyle:'bold',color:mark?.css??'#d9e4e0'
    }).setOrigin(1,.5).setDepth(20005).setScrollFactor(0);
    modal.registerExtra(bg,label,value);
  }
  // Pass a bounds-only adapter; NEVER mutate the modal's replay/lifecycle API.
  return drawBlockMap(scene,{
    contentBounds:layout.map,registerExtra:(...objects)=>modal.registerExtra(...objects)
  },{cleared:maps,maps,animate,celebration:true,gangID,marker:false});
}
