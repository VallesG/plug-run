// Tutorial-only measured copy layout. Shared GameUI owns dismissal/input guards.
import { TUTORIAL_STAGE_COUNT } from '../logic/tutorial.js';
export function drawTutorialInstructions(scene,ui,{title,subtitle,lines,buttons,complete=false}) {
 const W=scene.scale.gameSize.width,H=scene.scale.gameSize.height;
 const panelW=Math.min(520,W-40),bodyWidth=panelW-60;
 let copy=[],heights=[],panelHeight=0,font=16;
 for(;font>=12;font--){
  copy.forEach((t)=>t.destroy());
  copy=lines.map((line)=>scene.add.text(0,0,line,{
   fontFamily:'Arial, sans-serif',fontSize:font+'px',color:'#d1dcdf',
   lineSpacing:3,wordWrap:{width:bodyWidth}
  }).setOrigin(0,0).setScrollFactor(0).setDepth(20001));
  heights=copy.map((t)=>t.height);
  panelHeight=204+heights.reduce((sum,h)=>sum+h,0)+Math.max(0,lines.length-1)*18;
  if(panelHeight<=H-32)break;
 }
 const modal=ui.showModal({loadout:true,training:true,panelHeight,title,subtitle,buttons});
 const area=modal.contentBounds,extras=[];
 // Four steps make the onboarding length visible without an extra sentence.
 const progressY=area.y-3,progressW=(area.width-18)/TUTORIAL_STAGE_COUNT;
 for(let i=0;i<TUTORIAL_STAGE_COUNT;i++){
  extras.push(scene.add.rectangle(area.x+i*(progressW+6),progressY,progressW,3,
   complete||i<scene.stageIdx?0x8fcbff:0x283841,1)
   .setOrigin(0,0).setScrollFactor(0).setDepth(20001));
 }
 let y=area.y+12;
 copy.forEach((text,i)=>{
  const h=heights[i];
  // Paragraphs belong to one reading area, not selectable-looking cards.
  text.x=area.x+14;text.y=y;
  extras.push(text);y+=h+18;
 });
 modal.registerExtra(...extras);
 return modal;
}
