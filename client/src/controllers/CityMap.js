// Automatic city -> neighborhood -> actual block. No browsing or gameplay RNG.
import { cityMapLayout, cityZoomFrames } from '../logic/city.js';
import { blockNoise } from '../logic/blockMap.js';
import { worldBlock } from '../logic/worldBlocks.js';
import { windowGang } from '../logic/window.js';
import { drawBlockMap } from './BlockMap.js';
export function drawCityMap(scene, { view, checkpoint, onDone } = {}) {
  const width = scene.scale.gameSize.width, height = scene.scale.gameSize.height;
  const area = { x: 18, y: 94, width: Math.max(1,width-36), height: Math.max(1,height-156) };
  const a = cityMapLayout(area), target = a.nodes[checkpoint.blockIndex-view.city.firstBlock];
  let closed = false;
  const timers = [], objects = [];
  const own = o => { objects.push(o); return o; };
  let root=null, shutdownHook=null;
  const cleanup = () => {
    if(shutdownHook) scene.events?.off('shutdown',shutdownHook);
    timers.forEach(t=>t?.remove?.(false));
    objects.forEach(o=>scene.tweens?.killTweensOf(o));
    root?.destroy(true);
    objects.filter(o=>o!==root&&o.active!==false).forEach(o=>o.destroy());
  };
  try {
  own(scene.add.rectangle(width/2,height/2,width,height,0x07090b,1)
    .setScrollFactor(0).setDepth(21000).setInteractive());
  root=own(scene.add.container(a.x,a.y).setScale(a.scale).setScrollFactor(0).setDepth(21001));
  const g = scene.add.graphics(); root.add(g);
  const rect = (c,x,y,w,h,alpha=1) => { g.fillStyle(c,alpha).fillRect(x,y,w,h); };
  const road = (x1,y1,x2,y2) => {
    g.lineStyle(22,0x555b49,.65).lineBetween(x1,y1,x2,y2);
    g.lineStyle(16,0x293235,1).lineBetween(x1,y1,x2,y2);
    const length=Math.hypot(x2-x1,y2-y1);
    for(let d=8;d<length-4;d+=18) {
      const t=d/length;
      rect(0xaaa081,x1+(x2-x1)*t-1,y1+(y2-y1)*t-1,2,3,.5);
    }
  };
  for(let y=0;y<920;y+=8) for(let x=0;x<760;x+=8) {
    const n=blockNoise(x,y,view.city.number);
    rect(n>.7?0x1d2820:n>.3?0x18221d:0x141c19,x,y,8,8);
  }
  // Waterfront, parks and rail spine; roads form a network, never a level chain.
  rect(0x0b2027,0,0,54,920);
  for(let y=0;y<920;y+=28) rect(0x26413e,42,y,12+(y%84)/7,20,.55);
  rect(0x243526,72,734,184,154); rect(0x223425,504,750,188,138);
  for(const x of [258,502,710]) road(x,38,x,902);
  for(const y of [242,486,728]) road(56,y,728,y);
  road(58,52,258,242); road(502,728,710,898);
  g.lineStyle(2,0x525a4b,.65).lineBetween(740,0,740,920);
  g.lineStyle(2,0x525a4b,.65).lineBetween(748,0,748,920);
  for(let y=0;y<920;y+=14) rect(0x4e594a,736,y,16,3,.45);
  for(let y=35;y<900;y+=26) for(let x=70;x<710;x+=24) {
    if(a.nodes.some(n=>Math.abs(n.x-x)<n.w/2+12&&Math.abs(n.y-y)<n.h/2+12)) continue;
    if([258,502,710].some(rx=>Math.abs(x-rx)<20)||[242,486,728].some(ry=>Math.abs(y-ry)<20)) continue;
    const n=blockNoise(x,y,view.city.number^0x817);
    if(n>.67) {
      rect(0x070d0d,x+3,y+4,14,18,.7);
      rect(n>.85?0x4b5145:0x3a4640,x,y,14,18);
      rect(0x78806a,x,y,14,1,.5);
    } else if(n>.4) {
      rect(0x101d15,x+1,y+2,12,12); rect(0x2e422b,x,y,10,10);
    }
  }
  // Each local street opens onto the city's shared arterial network.
  for(const [i,node] of a.nodes.entries()) {
    const mirror=(worldBlock(view.blocks[i].blockIndex).seed & 1)!==0;
    const x=node.x-node.w/2+(mirror?168:32)*node.w/200;
    const y=node.y+node.h/2;
    const avenue=[242,486,728,914].find(ry=>ry>=y);
    const junction=[258,502,710].reduce((best,rx)=>Math.abs(rx-x)<Math.abs(best-x)?rx:best,258);
    road(x,y,x,avenue); road(x,avenue,junction,avenue);
    if(avenue===914) road(junction,902,junction,914);
  }
  for(const [i,node] of a.nodes.entries()) {
    const block=view.blocks[i], current=block.blockIndex===checkpoint.blockIndex;
    // Embed the SAME exterior renderer and seed domain used by the entrance.
    const facade = { worldBlock: worldBlock(block.blockIndex), currentRouteID: scene.currentRouteID,
      add: scene.add, tweens: scene.tweens };
    drawBlockMap(facade, {
      contentBounds: { x:node.x-node.w/2,y:node.y-node.h/2,width:node.w,height:node.h },
      registerExtra: object => root.add(object)
    }, { maps:15,cleared:block.status==='cleared'?15:current?checkpoint.pveRound-1:0,
      entering:current,animate:false,caption:false,labels:false,
      overview:!current,fog:current,marker:current });
    const shade=scene.add.graphics(); root.add(shade);
    if(!current && block.status!=='cleared') {
      shade.fillStyle(0x07090b,.75).fillRect(node.x-node.w/2,node.y-node.h/2,node.w,node.h);
    }
    const crew=windowGang(block.owner);
    if(crew) {
      shade.lineStyle(2,crew.color,.8).lineBetween(node.x-node.w/2,node.y+node.h/2,
        node.x+node.w/2,node.y+node.h/2);
    }
    if(current) {
      shade.lineStyle(1.2,0xf1d28a,.6).strokeCircle(node.x,node.y,12);
      // Keep the locator at overview scale only, never a frame around a parcel.
      own(shade);
    }
  }
  own(scene.add.text(width/2,34,view.city.name.toUpperCase(),{
    fontFamily:'Arial, sans-serif',fontSize:'23px',fontStyle:'bold',color:'#eee3c7'
  }).setOrigin(.5).setScrollFactor(0).setDepth(21002));
  const subtitle=own(scene.add.text(width/2,64,'CITY '+view.city.number+' · '+view.stashes+' / '+view.stashGoal+' STASHES',{
    fontFamily:'Arial, sans-serif',fontSize:'11px',color:'#8ca7aa'
  }).setOrigin(.5).setScrollFactor(0).setDepth(21002));
  own(scene.add.text(width/2,height-28,'FINDING YOUR BLOCK',{
    fontFamily:'Arial, sans-serif',fontSize:'10px',color:'#a6a48b'
  }).setOrigin(.5).setScrollFactor(0).setDepth(21002));
  const close = (complete=false) => {
    if(closed) return; closed=true;
    scene.events?.off('shutdown', shutdown);
    cleanup();
    if(complete) onDone?.();
  };
  const shutdown=()=>close(false);
  shutdownHook=shutdown;
  scene.events?.once('shutdown',shutdownHook);
  const delay=(ms,fn)=>timers.push(scene.time.delayedCall(ms,()=>{if(!closed)fn();}));
  const move=(frame,duration,next)=> {
    if(closed) return;
    scene.tweens.add({ targets:root,x:frame.x,y:frame.y,scaleX:frame.scale,scaleY:frame.scale,
      duration,ease:'Sine.easeInOut',onComplete:()=>{if(!closed)next();} });
  };
  if(!target) { close(true); return {destroy:()=>close(false)}; }
  const frames=cityZoomFrames(area,target);
  delay(800,()=> {
    subtitle.setText(worldBlock(checkpoint.blockIndex).name.toUpperCase());
    // The map stays opaque throughout; this is a camera move, not a fade.
    objects.filter(o=>o!==root&&o.parentContainer===root).forEach(o=>o.setVisible(false));
    move(frames.neighborhood,850,()=>move(frames.block,850,()=>delay(250,()=>close(true))));
  });
  return { destroy:()=>close(false) };
  } catch(error) { closed=true; cleanup(); throw error; }
}
