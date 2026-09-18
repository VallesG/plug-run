// Actual portable replay renderer + live ArenaArt, without Phaser/native browser.
import {readFileSync} from 'node:fs';
import * as rules from '../src/logic/rivals.js';
import * as replay from '../src/logic/rivalReplay.js';
import {planInterior} from '../src/logic/interior.js';
import {PALETTE} from '../src/logic/palette.js';
let passed=0;const check=(n,ok)=>{if(!ok)throw Error(n);passed++;};
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8').replace(/^import[\s\S]*?;\s*/gm,'').replace(/\bexport /g,'');
const decor=new Function('planInterior','PALETTE',source('../src/controllers/InteriorDecor.js')+';return drawInteriorDecor;')(planInterior,PALETTE);
const art=new Function('Phaser','drawInteriorDecor',source('../src/controllers/ArenaArt.js')+';return {drawArenaArt,drawArenaPerimeter};')({},decor);
const arena=new Function('drawArenaArt','drawArenaPerimeter',source('../src/controllers/RivalReplayArena.js')+';return drawRivalReplayArena;')(art.drawArenaArt,art.drawArenaPerimeter);
const playerSource=source('../src/controllers/RivalReplayPlayer.js');
const base=source('../src/scenes/BaseGameScene.js');
const layoutCode=base.slice(base.indexOf('  computeLayoutFromViewport(){'),base.indexOf('  recomputeSpeedsFromCell(){'));
const Host=new Function('rivalArenaLayout','class Host{'+layoutCode+'};return Host;')(rules.rivalArenaLayout);
const grid=Array.from({length:35},(_,y)=>Array.from({length:16},(_,x)=>x===0||x===15||y===0||y===34?1:0));
grid[10][5]=grid[10][6]=grid[11][5]=grid[11][6]=1;
const egress={side:'E',width:3,entry:{x:15,y:20}};
const theme={bg:0x080a10,floorSet:'checker',checkerColors:[0x111111,0x222222],wallFillTint:0x333333,wallEdgeTint:0x777777};
function fixture(width,height){
 const nodes=[],handlers={};
 const node=(kind,args)=>{const o={kind,args,_isReplayGhost:false,active:true,visible:true,children:[],texture:{key:'td_runner'},height:43};
 const value=new Proxy(o,{get:(o,k)=>k in o?o[k]:(...a)=>{
  if(k==='setDepth')o.depth=a[0];if(k==='setPosition'){o.x=a[0];o.y=a[1];}
  if(k==='setText')o.text=a[0];if(k==='setVisible')o.visible=a[0];
  if(k==='add')o.children.push(...(Array.isArray(a[0])?a[0]:[a[0]]));
  if(k==='destroy'){o.active=false;o.children.forEach(c=>c.destroy?.());}
  return value;
 }});
 nodes.push(value);return value;};
 const scene={scale:{gameSize:{width,height}},textures:{exists:()=>true},
 add:new Proxy({}, {get:(_,k)=>(...args)=>node(k,args)}),
 tweens:{killTweensOf(){},isTweening:()=>false,add(){}},
 events:{once:(n,fn)=>{handlers[n]=fn;},on:(n,fn)=>{handlers[n]=fn;},off:n=>{delete handlers[n];}}};
 return {scene,nodes,handlers,node};
}
const sprite=(f,kind,x,y)=>{const o=f.node(kind,[]);o.x=x;o.y=y;o.kind=kind;o.sprite=f.node('sprite',[]);o.outline=[];o.add(o.sprite);return o;};
for(const [width,height] of [[280,480],[390,844],[1440,900]]){
 const f=fixture(width,height);
 const makeRunnerSprite=(_,x,y)=>sprite(f,'runner',x,y),makePlugSprite=(_,x,y)=>sprite(f,'plug',x,y);
 const bindings={...rules,...replay,drawRivalReplayArena:arena,Phaser:{},T:{WALL:1},THEMES:[theme],PALETTE,
 createSeededRNG:()=>()=>.2,generateSquareMaze:()=>({grid,egress}),makeRunnerSprite,makePlugSprite};
 const play=new Function(...Object.keys(bindings),playerSource+';return playRivalReplay;')(...Object.values(bindings));
 const rep=replay.newReplaySegment({house:1,attempt:1,houseSeed:123,cols:16,rows:35,scale:.6,
 stashes:[{x:3.5,y:4.5},{x:12.5,y:30.5}],car:{x:15.5,y:20.5,side:'E'},
 runnerSpawn:{x:2.5,y:20.5},plugSpawn:{x:13.5,y:10.5}});
 replay.pushReplayFrame(rep,0,{runner:{x:2.5,y:20.5,flags:0},plugs:[{x:13.5,y:10.5,flags:0},{x:10.5,y:11.5,flags:0}],bullets:[]});
 replay.pushReplayFrame(rep,1000,{runner:{x:3.5,y:20.5,flags:0},plugs:[{x:13.5,y:10.5,flags:0},{x:10.5,y:11.5,flags:0}],bullets:[]});
 rep.durationMs=1000;
 let done=0;const api=play(f.scene,{bundle:{segments:[{house:1,attempt:1,startedMs:0,durationMs:1000,outcome:'extracted',replay:rep}]},onDone:()=>done++});
 f.handlers.update(0,1);
 const live=new Host();live.runKind='rivals';live.cols=16;live.rows=35;live.scale={gameSize:{width,height}};live.computeLayoutFromViewport();
 const layout=rules.rivalArenaLayout(width,height);
 check('actual live layout shares replay framing '+width,live.cell===layout.cell&&JSON.stringify(live.pad)===JSON.stringify(layout.pad));
 const runner=f.nodes.find(n=>n.kind==='runner');
 check('replay spawn uses full live viewport '+width,runner.x===layout.pad.x+rep.spawn.r.x*layout.cell&&runner.y===layout.pad.y+rep.spawn.r.y*layout.cell);
 check('no top HUD reserves height '+width,!f.nodes.some(n=>n.kind==='rectangle'&&n.args[3]===84));
 check('shared arena objects marked ghosts '+width,f.nodes.filter(n=>n.depth>=30000&&n.depth<30010).every(n=>n._isReplayGhost));
 check('furniture uses shared live seed plan '+width,f.nodes.some(n=>n.kind==='graphics'&&n.depth===30005));
 f.handlers.update(0,1200);
 check('second defender from recorded frames is shown '+width,f.nodes.filter(n=>n.kind==='plug'&&n.active).length===2);
 const clock=f.nodes.find(n=>n.depth===30001.72);
 check('clock below actors like live '+width,!!clock);
 if(width===390){f.handlers.shutdown();check('shutdown does not restore dead result modal',done===0);}
 api.end();api.end();
 check('replay leaves no live display objects '+width,f.nodes.filter(n=>n._isReplayGhost).every(n=>!n.active));
 check('replay returns once '+width,done===(width===390?0:1)&&!f.handlers.update&&!f.handlers.shutdown);
}
console.log('Rival replay view: '+passed+' assertions passed');
