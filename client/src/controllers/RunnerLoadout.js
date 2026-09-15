// Runner selection panel. The existing ordered, repeatable two-charge rules
// are kept in pure logic; this module owns only presentation and callbacks.
import { choosePower, loadoutLayout } from '../logic/powerSelection.js';
import { drawPowerIcon } from './PowerIcons.js';
import ReplaySystem from './ReplaySystem.js';
import { createBottomLeftButtons } from '../utils/authUI.js';

const POWERS = [
  {id:'phase',name:'PHASE',description:'Pass through\nwalls & bullets',color:0xb7a3d9,css:'#c7b5e5'},
  {id:'dash',name:'DASH',description:'Burst forward\nout of danger',color:0xddbd72,css:'#ead194'},
  {id:'decoy',name:'DECOY',description:'Send a double\nto draw fire',color:0x81adbf,css:'#9bc4d4'}
];

export function showRunnerLoadout(ui,onDone,options = {}) {
  const scene=ui.scene;
  if(scene.role!=='runner'){onDone?.();return;}
  scene.roundPausedForMenu=true;
  const modal=ui.showModal({
    loadout:true,title:options.title ?? (scene.mode==='pve'?'HOUSE '+String(scene.pveRound||1).padStart(2,'0')+' / LOADOUT':'RUNNER / LOADOUT'),
    subtitle:'Choose two charges. Use them in order.',buttons:[]
  });
  const {panel,registerExtra}=modal;
  const left=panel.x-panel.width/2,top=panel.y-panel.height/2;
  const layout=loadoutLayout(panel.width,panel.height);
  const objects=[];
  const add=o=>{registerExtra(o);objects.push(o);return o;};
  const text=(x,y,value,size=12,color='#c3cccf',bold=false)=>add(
    scene.add.text(x,y,value,{
      fontFamily:'Arial, sans-serif',fontSize:size+'px',fontStyle:bold?'bold':'normal',
      color,align:'center'
    }).setOrigin(0.5).setDepth(20005).setScrollFactor(0));
  const rectangle=(x,y,w,h,fill,line=0x39434c)=>add(
    scene.add.rectangle(x,y,w,h,fill,1).setStrokeStyle(1,line)
      .setDepth(20004).setScrollFactor(0));
  const button=(x,y,w,h,label,callback)=>{
    const bg=rectangle(x,y,w,h,0x19222b);
    const labelObject=text(x,y,label,12,'#b9c7cf',true);
    bg.setInteractive({useHandCursor:true}).on('pointerdown',callback);
    return {bg,text:labelObject};
  };
  let chosen=[];
  let started=false;
  const cards=[];
  const slots=[];
  const refresh=()=>{
    for(const card of cards){
      const indexes=chosen.map((id,i)=>id===card.power.id?i+1:null).filter(Boolean);
      card.bg.setFillStyle(indexes.length?0x222f38:0x151e26)
        .setStrokeStyle(indexes.length?2:1,indexes.length?card.power.color:0x3b4650);
      card.badge.setText(indexes.join(' / ')).setVisible(indexes.length>0);
    }
    slots.forEach((slot,i)=>{
      const power=POWERS.find(p=>p.id===chosen[i]);
      slot.label.setText(power?power.name:'EMPTY');
      slot.label.setColor(power?power.css:'#6f808b');
      slot.bg.setStrokeStyle(1,power?power.color:0x35434d);
    });
    const ready=chosen.length===2;
    start.bg.setFillStyle(ready?0xa8c9d7:0x202b34)
      .setStrokeStyle(1,ready?0xd4e5e9:0x3b4b58);
    start.text.setColor(ready?'#10202b':'#82939e')
      .setText(ready?(options.startLabel || 'ENTER HOUSE'):'CHOOSE TWO CHARGES');
    help.setText(ready?'Ready. Tap a selected card to adjust.':'You can take the same power twice.');
  };
  POWERS.forEach((power,i)=>{
    const r=layout.cards[i],x=left+r.x+r.w/2,y=top+r.y;
    // A small hard shadow gives cards the same cut-paper weight as the board.
    rectangle(x+2,y+r.h/2+3,r.w,r.h,0x080d13,0x080d13);
    const bg=rectangle(x,y+r.h/2,r.w,r.h,0x151e26);
    add(drawPowerIcon(scene,x,y+r.h*0.32,power.id,Math.min(36,r.w*0.5),power.color));
    text(x,y+r.h*0.63,power.name,r.w<80?11:13,power.css,true);
    text(x,y+r.h*0.84,power.description,r.w<80?9:11,'#98a7ac');
    const badge=text(x+r.w/2-14,y+11,'',9,power.css,true).setVisible(false);
    cards.push({power,bg,badge});
    bg.setInteractive({useHandCursor:true}).on('pointerdown',()=>{
      chosen=choosePower(chosen,power.id);refresh();
    });
  });
  const slotW=(panel.width-50)/2;
  for(let i=0;i<2;i++){
    const x=left+20+slotW/2+i*(slotW+10),y=top+layout.slotsY;
    const bg=rectangle(x,y,slotW,36,0x101922);
    text(x-slotW/2+15,y,String(i+1).padStart(2,'0'),10,'#7c8f9a',true);
    const label=text(x+8,y,'EMPTY',11,'#6f808b',true);
    slots.push({bg,label});
  }
  const help=text(panel.x,top+layout.slotsY+37,'',11,'#879a9f').setVisible(layout.showHelp);
  const start=button(panel.x,top+layout.startY,layout.buttonW,44,'CHOOSE TWO CHARGES',()=>{
    if(started||chosen.length!==2)return;
    started=true;
    scene.runnerPowersSelected=chosen.slice();
    scene.runnerPowersConsumed=[false,false];
    modal.destroy();
    scene.input.keyboard.enabled=true;
    scene.roundPausedForMenu=false;
    onDone?.();
  });
  const hasReplay=options.allowReplay!==false && ReplaySystem.hasReplay(scene.role);
  const navW=hasReplay?(layout.buttonW-10)/2:layout.buttonW;
  if(hasReplay){
    button(panel.x-(navW+10)/2,top+layout.navY,navW,32,'WATCH REPLAY',()=>{
      modal.setVisible(false);
      ReplaySystem.play(scene,{onDone:()=>modal.setVisible(true)});
    });
  }
  button(panel.x+(hasReplay?(navW+10)/2:0),top+layout.navY,navW,32,'MAIN MENU',()=>{
    modal.destroy();scene.scene.start('MENU');
  });
  // Keep account/settings access and register it with the same modal lifecycle.
  if(options.showAccount!==false) registerExtra(...createBottomLeftButtons(scene,panel.x,panel.y,panel.width,panel.height,20005));
  refresh();
  return modal;
}
