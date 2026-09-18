// Furniture is drawn directly overhead in the same ink/shadow grammar as the
// board. It occupies existing solid cells only; collisions and routes are untouched.
import { planInterior } from '../logic/interior.js';
import { PALETTE } from '../logic/palette.js';

export function drawInteriorDecor(scene,{cell,cols,rows,pad,isWall,drawDefaultCell}) {
  const props=planInterior(scene.grid,scene.seed);
  const occupied=new Set(props.flatMap(p=>p.cells.map(([x,y])=>y*cols+x)));
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    if(isWall(x,y)&&!occupied.has(y*cols+x))drawDefaultCell(x,y);
  }
  const fabrics=[{base:0x657565,light:0x899780,dark:0x3c4e42},
    {base:0x637581,light:0x87959b,dark:0x3b4f59},
    {base:0x8b796a,light:0xafa18a,dark:0x63564b}];
  for(const prop of props){
    const vertical=prop.h>prop.w;
    const width=(vertical?prop.h:prop.w)*cell;
    const height=(vertical?prop.w:prop.h)*cell;
    const g=scene.add.graphics().setPosition(
      pad.x+(prop.x+prop.w/2)*cell,pad.y+(prop.y+prop.h/2)*cell)
      .setAngle(vertical?90:0).setDepth(5);
    scene.walls?.add(g);
    const x=-width/2,y=-height/2,stroke=Math.max(1.25,cell*0.065);
    const color=fabrics[prop.variant];
    const box=(bx,by,w,h,fill,r=0)=>{
      g.fillStyle(fill,1);g.lineStyle(stroke,PALETTE.ink,1);
      if(r){g.fillRoundedRect(bx,by,w,h,r);g.strokeRoundedRect(bx,by,w,h,r);}
      else {g.fillRect(bx,by,w,h);g.strokeRect(bx,by,w,h);}
    };
    const stripe=(bx,by,w,h,fill,alpha=1)=>{g.fillStyle(fill,alpha);g.fillRect(bx,by,w,h);};
    // The dark plinth fills precisely the collider's footprint. There is no
    // bright wall tile under a smaller mismatched sprite.
    stripe(x,y,width,height,PALETTE.ink);
    if(prop.type==='sofa'){
      box(x+1,y+1,width-2,height-2,color.dark,cell*0.13);
      box(x+cell*0.12,y+cell*0.1,width-cell*0.24,cell*0.25,color.light,cell*0.07);
      const seats=Math.round(width/cell);
      const innerW=width-cell*0.38,seatW=innerW/seats;
      for(let i=0;i<seats;i++){
        const sx=x+cell*0.19+i*seatW;
        box(sx,y+cell*0.37,seatW-cell*0.045,cell*0.46,color.base,cell*0.07);
        stripe(sx+cell*0.08,y+cell*0.42,seatW-cell*0.2,cell*0.035,color.light,0.75);
      }
      for(const ax of [x+cell*0.05,x+width-cell*0.2])
        box(ax,y+cell*0.22,cell*0.15,cell*0.63,color.light,cell*0.05);
    } else if(prop.type==='cabinet'){
      box(x+1,y+1,width-2,height-2,0x867156,cell*0.05);
      stripe(x+2,y+2,width-4,cell*0.13,0xb2a083);
      const count=Math.round(width/cell);
      for(let i=0;i<count;i++){
        box(x+cell*i+cell*0.12,y+cell*0.29,cell*0.76,cell*0.59,0x705e49,cell*0.035);
        stripe(x+cell*i+cell*0.37,y+cell*0.4,cell*0.23,cell*0.05,0xd0bfa0);
      }
      // A small book on the surface is an accent, never a gameplay pickup.
      box(x+cell*0.27,y+cell*0.11,cell*0.29,cell*0.38,0x536c68,cell*0.02);
      stripe(x+cell*0.3,y+cell*0.15,cell*0.025,cell*0.26,0xb0b09a);
    } else if(prop.type==='table'){
      // Four chairs and the table top form one coherent, solid assembly.
      stripe(x+1,y+1,width-2,height-2,0x414842);
      for(const dx of [-1,1])for(const dy of [-1,1]){
        box(dx*cell*0.58-cell*0.23,dy*cell*0.59-cell*0.25,cell*0.46,cell*0.5,color.base,cell*0.08);
      }
      box(-cell*0.69,-cell*0.48,cell*1.38,cell*0.96,0x9e8767,cell*0.13);
      stripe(-cell*0.58,-cell*0.37,cell*1.16,cell*0.045,0xcbba96,0.7);
      stripe(-cell*0.59,cell*0.25,cell*1.18,cell*0.04,0x5d5747,0.65);
      // Neutral ceramic centerpiece, visually unlike either stash.
      g.fillStyle(PALETTE.ink,1);g.fillCircle(0,0,cell*0.17);
      g.fillStyle(0xd0c6a9,1);g.fillCircle(-cell*0.025,-cell*0.025,cell*0.12);
    } else if(prop.type==='chair'){
      box(x+1,y+1,width-2,height-2,color.dark,cell*0.14);
      box(x+cell*0.08,y+cell*0.08,cell*0.84,cell*0.27,color.light,cell*0.07);
      box(x+cell*0.23,y+cell*0.37,cell*0.54,cell*0.5,color.base,cell*0.09);
      for(const ax of [x+cell*0.07,x+cell*0.78])
        box(ax,y+cell*0.31,cell*0.15,cell*0.55,color.light,cell*0.04);
    } else if(prop.type==='plant'){
      box(x+1,y+1,width-2,height-2,0x666454,cell*0.06);
      g.fillStyle(PALETTE.ink,1);g.fillCircle(0,0,cell*0.34);
      g.fillStyle(0x998065,1);g.fillCircle(0,0,cell*0.28);
      g.fillStyle(0x2d3b2f,1);g.fillCircle(0,0,cell*0.23);
      for(let i=0;i<5;i++){
        const a=i*Math.PI*2/5;
        const ex=Math.cos(a)*cell*0.3,ey=Math.sin(a)*cell*0.3;
        g.lineStyle(cell*0.13,i%2?0x72866a:0x526e54,1);
        g.lineBetween(0,0,ex,ey);
      }
      g.fillStyle(0x9aab7f,1);g.fillCircle(-cell*0.04,-cell*0.04,cell*0.07);
    }
  }
  return props;
}
