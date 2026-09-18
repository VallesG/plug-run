// Preserve the existing two-power selection rules, including repeated powers.
// Return a fresh list so rendering and ordered slots never share mutable state.
export function choosePower(chosen, id) {
  const next=chosen.slice();
  if(!['phase','dash','decoy'].includes(id))return next;
  const count=next.filter(value=>value===id).length;
  if(count===0){if(next.length<2)next.push(id);}
  else if(count===1){
    if(next.length>=2)next.splice(next.indexOf(id),1);
    else next.push(id);
  } else next.splice(next.lastIndexOf(id),1);
  return next;
}
// The first three houses teach the powers; later block pickers stay terse.
export function compactLoadout(mode,house) {
  return mode==='pve' && Number(house)>3;
}
export function removePowerAt(chosen,index) {
  return chosen.filter((_,i)=>i!==index);
}
export function loadoutLayout(width,height,compact=false) {
  const gap=10, inset=20;
  const cardW=(width-inset*2-gap*2)/3;
  const cardH=Math.max(80,Math.min(compact?88:132,height-322));
  const cardTop=compact?78:94;
  return {
    cards:[0,1,2].map(i=>({x:inset+i*(cardW+gap),y:cardTop,w:cardW,h:cardH})),
    slotsY:cardTop+cardH+29, startY:height-92, navY:height-42,
    buttonW:width-40, showHelp:!compact && height>=370
  };
}
