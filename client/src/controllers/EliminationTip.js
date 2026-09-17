import { contact } from '../logic/contacts.js';
import { eliminationTipLayout } from '../logic/eliminationTips.js';

// One cached portrait, no room download and no wait before retry is usable.
const RO={id:'ro',name:'Auntie Ro',accent:0xe2b45f,css:'#e2b45f',
  portraitKey:'window_ro',portraitSource:'/art/the-window/auntie-ro.webp',
  frame:{width:724,height:724,x:0},expressions:3};
export function drawEliminationTip(scene,modal,cue) {
  if(!modal?.contentBounds || !modal.registerExtra)return null;
  const c=contact(cue.contactID)||RO,a=eliminationTipLayout(modal.contentBounds);
  const objects=[];let closed=false;
  const lifecycle={active:true,visible:true,
    destroy(){if(closed)return;closed=true;this.active=false;
      scene.load?.off?.('complete',settle);scene.events?.off?.('shutdown',close);
      objects.forEach(o=>o.destroy?.());},
    setVisible(v){this.visible=v;objects.forEach(o=>{if(o.active!==false)o.setVisible?.(v);});return this;}
  };
  const close=()=>lifecycle.destroy();
  const add=o=>{objects.push(o);o.setScrollFactor(0).setDepth(20010);return o;};
  modal.registerExtra(lifecycle);
  add(scene.add.text(a.textX,a.textY,c.name.toUpperCase(),{
    fontFamily:'Arial, sans-serif',fontSize:'11px',fontStyle:'bold',color:c.css,letterSpacing:1
  }).setOrigin(0,0));
  add(scene.add.text(a.textX,a.textY+23,cue.text,{
    fontFamily:'Arial, sans-serif',fontSize:a.fontSize+'px',color:'#eee6d2',
    wordWrap:{width:a.textW},lineSpacing:4
  }).setOrigin(0,0));
  const size=Math.min(a.portraitW,a.portraitH);
  const placeholder=add(scene.add.circle(a.portraitX,a.portraitBottom-size/2,size*0.32,c.accent,0.2));
  const initial=add(scene.add.text(a.portraitX,a.portraitBottom-size/2,c.name[0],{
    fontFamily:'Arial, sans-serif',fontSize:Math.max(16,size*0.35)+'px',color:c.css,fontStyle:'bold'
  }).setOrigin(0.5));
  let portrait=null;
  const settle=()=>{
    if(closed || scene._touchSceneClosing || portrait || !scene.textures?.exists(c.portraitKey))return;
    const texture=scene.textures.get(c.portraitKey);
    const frame=c.expressions>1?0:c.id;
    if(c.expressions===1&&!texture.has(frame))texture.add(frame,0,c.frame.x,0,c.frame.width,c.frame.height);
    portrait=add(scene.add.image(a.portraitX,a.portraitBottom,c.portraitKey,frame).setOrigin(0.5,1));
    portrait.setScale(Math.min(a.portraitW/c.frame.width,a.portraitH/c.frame.height));
    portrait.setVisible?.(lifecycle.visible);
    placeholder.destroy();initial.destroy();
  };
  scene.events?.once?.('shutdown',close);
  settle();
  if(!portrait && scene.load && !scene.textures?.exists(c.portraitKey)){
    scene.load.once('complete',settle);
    if(c.expressions>1)scene.load.spritesheet(c.portraitKey,c.portraitSource,{frameWidth:c.frame.width,frameHeight:c.frame.height});
    else scene.load.image(c.portraitKey,c.portraitSource);
    if(!scene.load.isLoading?.())scene.load.start();
  }
  return lifecycle;
}
