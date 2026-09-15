// One code-drawn icon family: no emoji fonts, image assets or platform variants.
export function drawPowerIcon(scene,x,y,id,size,color=0xd8e0db,depth=20005) {
  const g=scene.add.graphics().setPosition(x,y).setScale(size/32)
    .setDepth(depth).setScrollFactor(0);
  g.lineStyle(2,color,1);g.fillStyle(color,1);
  const line=(x1,y1,x2,y2)=>g.lineBetween(x1,y1,x2,y2);
  if(id==='settings'){
    g.lineStyle(2,color,1);g.strokeCircle(0,0,8);g.strokeCircle(0,0,3);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      line(Math.cos(a)*8,Math.sin(a)*8,Math.cos(a)*12,Math.sin(a)*12);
    }
  } else if(id==='phase'){
    // A broken wall with the movement path crossing through its opening.
    g.fillRect(-2,-13,4,7);g.fillRect(-2,6,4,7);
    g.lineStyle(1,color,0.38);line(-5,-13,-5,-6);line(5,6,5,13);
    g.lineStyle(2.5,color,1);line(-13,0,12,0);line(6,-6,12,0);line(6,6,12,0);
  } else if(id==='dash'){
    line(-14,-7,-5,-7);line(-14,0,-8,0);line(-14,7,-5,7);
    g.fillTriangle(-3,-11,13,0,-3,11);
    g.fillRect(-7,-3,7,6);
  } else if(id==='decoy'){
    // An offset hollow double distinguishes deception from movement.
    g.lineStyle(1.7,color,0.42);g.strokeCircle(7,-7,4);
    g.strokeRoundedRect(0,-1,14,12,5);
    g.lineStyle(2,color,1);g.fillCircle(-5,-8,4);
    g.strokeRoundedRect(-12,-2,14,14,5);
    line(-12,5,2,5);
  }
  return g;
}
