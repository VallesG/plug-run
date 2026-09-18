// Presentation only. Never writes ownership, score, rewards or checkpoints.
export function blockCompleteLayout(area={}) {
  const width=Math.max(0,Number(area.width)||0),height=Math.max(0,Number(area.height)||0);
  const x=Number(area.x)||0,y=Number(area.y)||0;
  const badgeH=Math.min(52,height*.22),gap=Math.min(10,width*.03),inset=Math.min(12,width*.03);
  const badgesW=Math.min(360,width-inset*2),badgeW=Math.max(0,(badgesW-gap)/2);
  const left=x+(width-badgesW)/2;
  const mapGap=Math.min(10,Math.max(0,height-badgeH));
  return {
    badges:[{x:left,y,w:badgeW,h:badgeH},{x:left+badgeW+gap,y,w:badgeW,h:badgeH}],
    map:{x,y:y+badgeH+mapGap,width,height:Math.max(0,height-badgeH-mapGap)}
  };
}
export function fullBlockReveal({cleared,maps,celebration=false}={}) {
  return celebration===true && Number.isInteger(maps) && maps>0 && cleared>=maps;
}
