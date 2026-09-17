// Phaser rendering of the exact geometry exported by crewSigilSVG.
import { crewSigil } from '../logic/crewSigils.js';
export function drawCrewSigil(g, gangID, {x=0,y=0,size=100,alpha=1}={}) {
  const mark=crewSigil(gangID);if(!mark || !g || size<=0)return false;
  const point=p=>({x:x+p[0]*size/100,y:y+p[1]*size/100});
  for(const circle of mark.circles){
    g.lineStyle(circle.width*size/100,mark.color,alpha);
    g.strokeCircle(x+circle.x*size/100,y+circle.y*size/100,circle.r*size/100);
  }
  for(const path of mark.paths){
    const points=path.points.map(point);
    if(path.fill){g.fillStyle(mark.color,alpha);g.fillPoints(points,true);}
    g.lineStyle(path.width*size/100,mark.color,alpha);
    for(let i=1;i<points.length;i++)g.lineBetween(points[i-1].x,points[i-1].y,points[i].x,points[i].y);
    if(path.closed)g.lineBetween(points.at(-1).x,points.at(-1).y,points[0].x,points[0].y);
  }
  return true;
}
