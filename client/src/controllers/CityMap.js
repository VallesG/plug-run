// Automatic city -> neighborhood -> actual block. No browsing or gameplay RNG.
import { cityMapLayout, cityZoomFrames, cityStreets, cityShoreline, cityStreetDistance, cityBlockConnector, cityClearedOwner } from '../logic/city.js';
import { blockNoise } from '../logic/blockMap.js';
import { worldBlock } from '../logic/worldBlocks.js';
import { windowGang } from '../logic/window.js';
import { drawCrewSigil } from './CrewSigil.js';
import { drawBlockMap } from './BlockMap.js';
export function drawCityMap(scene, { view, checkpoint, onDone, autoZoom=true } = {}) {
  const width = scene.scale.gameSize.width, height = scene.scale.gameSize.height;
  const area = { x: 18, y: 94, width: Math.max(1,width-36), height: Math.max(1,height-156) };
  const variant=view.mapVariant||'story';
  const a = cityMapLayout(area,variant), target = a.nodes[checkpoint.blockIndex-view.city.firstBlock];
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
  g.fillStyle(0x0b2027,1).fillPoints(cityShoreline(variant).map(([x,y])=>({x,y})),true);
  const shore=cityShoreline().slice(1,-1);
  for(let i=1;i<shore.length;i++)g.lineStyle(5,0x26413e,.65).lineBetween(...shore[i-1],...shore[i]);
  // Park, rail yard and dense downtown are scenery, not additional missions.
  g.fillStyle(0x203222,.8).fillPoints([{x:70,y:35},{x:240,y:24},{x:246,y:110},{x:72,y:90}],true);
  g.lineStyle(4,0x48503c,.45).lineBetween(85,60,228,75);
  for(const route of cityStreets(variant)) for(let i=1;i<route.length;i++)road(...route[i-1],...route[i]);
  // Bridge parapets pick out the river crossings without changing street paths.
  for(const y of variant==='rivals'?[270,510,669,892]:[280,548,790,904]){
    g.lineStyle(2,0x8b8568,.65).lineBetween(453,y-12,555,y-12);
    g.lineStyle(2,0x8b8568,.65).lineBetween(453,y+12,555,y+12);
  }
  g.lineStyle(2,0x525a4b,.65).lineBetween(19,70,30,894);
  g.lineStyle(2,0x525a4b,.65).lineBetween(27,70,38,894);
  for(let y=70;y<894;y+=14)rect(0x4e594a,17+(y-70)*11/824,y,24,3,.45);
  const water=cityShoreline(variant);
  const inWater=(x,y)=>{
    let inside=false;
    for(let i=0,j=water.length-1;i<water.length;j=i++){
      const [ax,ay]=water[i],[bx,by]=water[j];
      if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
    }return inside;
  };
  // Jittered buildings of mixed sizes; no repeated neighborhood-sized boxes.
  for(let gy=20;gy<902;gy+=15)for(let gx=52;gx<728;gx+=17){
    const n=blockNoise(gx,gy,view.city.number^0x817);
    const x=gx+(n-.5)*10,y=gy+(blockNoise(gy,gx,91)-.5)*9;
    const w=6+Math.floor(blockNoise(gx,gy,27)*13),h=7+Math.floor(blockNoise(gy,gx,49)*19);
    if(inWater(x,y)||inWater(x+w,y+h)||cityStreetDistance(x,y,variant)<25)continue;
    if(a.nodes.some(p=>Math.abs(p.x-(x+w/2))<p.w/2+w/2+8&&Math.abs(p.y-(y+h/2))<p.h/2+h/2+8))continue;
    const downtown=x>285&&x<435&&y<570;
    if(n>(downtown?.20:.48)){
      rect(0x070d0d,x+3,y+4,w,h,.75);
      rect(downtown?0x445052:n>.8?0x4b5145:0x35433d,x,y,w,h,.85);
      rect(0x81836b,x+1,y,w-2,1,.4);
      if(downtown&&w>10)rect(0x1d2e31,x+3,y+3,w-6,h-6,.7);
      if(n>.78)rect(0xffd78a,x+2,y+h-2,2,1,.55);
    }else if(n>.3){rect(0x102217,x,y,6,7);rect(0x29442c,x-1,y-1,5,5,.75);}
  }
  // Each local street opens onto the city's shared arterial network.
  for(const [i,node] of a.nodes.entries()) {
    const block=view.blocks[i];
    const mapIdentity=block.course||worldBlock(block.blockIndex);
    const mirror=(mapIdentity.seed & 1)!==0;
    const connector=cityBlockConnector(node,mirror,variant);
    road(...connector[0],...connector[1]);
  }
  for(const [i,node] of a.nodes.entries()) {
    const block=view.blocks[i], current=block.blockIndex===checkpoint.blockIndex;
    // Embed the SAME exterior renderer and seed domain used by the entrance.
    const facade = { worldBlock: block.course||worldBlock(block.blockIndex), currentRouteID: scene.currentRouteID,
      add: scene.add, tweens: scene.tweens };
    drawBlockMap(facade, {
      contentBounds: { x:node.x-node.w/2,y:node.y-node.h/2,width:node.w,height:node.h },
      registerExtra: object => root.add(object)
    }, { maps:variant==='rivals'?7:15,cleared:variant==='rivals'?7:block.status==='cleared'?15:current?checkpoint.pveRound-1:0,
      entering:current,animate:false,caption:false,labels:false,
      overview:!current,fog:variant!=='rivals'&&current,marker:variant!=='rivals'&&current,
      celebration:variant==='rivals' });
    const shade=scene.add.graphics(); root.add(shade);
    if(!current && block.status!=='cleared') {
      shade.fillStyle(0x07090b,.75).fillRect(node.x-node.w/2,node.y-node.h/2,node.w,node.h);
    }
    const owner=cityClearedOwner(block), crew=windowGang(owner);
    if(crew) {
      // Soft backlight and a crisp vector stamp, never an inferred legacy owner.
      const size=Math.min(node.w,node.h)*.66;
      shade.fillStyle(crew.color,.07).fillCircle(node.x,node.y,size*.65);
      shade.fillStyle(crew.color,.10).fillCircle(node.x,node.y,size*.48);
      drawCrewSigil(shade,owner,{x:node.x-size/2,y:node.y-size/2,size,alpha:.72});
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
  const subtitle=own(scene.add.text(width/2,64,variant==='rivals'?'RIVALS DISTRICT · '+view.clearedBlocks+' / 7 BLOCKS':'CITY '+view.city.number+' · '+view.stashes+' / '+view.stashGoal+' STASHES',{
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
  const frames=cityZoomFrames(area,target,variant);
  if(autoZoom)delay(1100,()=> {
    subtitle.setText((view.blocks.find(b=>b.blockIndex===checkpoint.blockIndex)?.course||worldBlock(checkpoint.blockIndex)).name.toUpperCase());
    // The map stays opaque throughout; this is a camera move, not a fade.
    objects.filter(o=>o!==root&&o.parentContainer===root).forEach(o=>o.setVisible(false));
    move(frames.neighborhood,850,()=>move(frames.block,850,()=>delay(250,()=>close(true))));
  });
  return { destroy:()=>close(false) };
  } catch(error) { closed=true; cleanup(); throw error; }
}
