// Actual city, block, GameUI and progression renderers against display-list stubs.
// Geometry/lifecycle proof only: this does not verify Phaser pixels or font metrics.
import { readFileSync } from 'node:fs';
import { CITY_BLOCKS, cityForBlock, cityView, cityMapLayout, cityZoomFrames, createCityState, claimCityBlock, claimCityIntro } from '../src/logic/city.js';
import { advanceJourney, worldBlock } from '../src/logic/worldBlocks.js';
import { windowGang } from '../src/logic/window.js';
import { layoutBlock, buildFog, blockNoise, distanceToStreet } from '../src/logic/blockMap.js';
import { PALETTE } from '../src/logic/palette.js';
let passed=0;
function check(name,ok){if(!ok)throw Error(name);passed++;}
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8').replace(/^import[\s\S]*?;\s*/gm,'');
const blockSource=source('../src/controllers/BlockMap.js').replace('export function','function');
const drawBlockMap=new Function('layoutBlock','buildFog','blockNoise','distanceToStreet','PALETTE','getCurrentRouteID',
 blockSource+'\nreturn drawBlockMap;')(layoutBlock,buildFog,blockNoise,distanceToStreet,PALETTE,()=>1);
const mapSource=source('../src/controllers/CityMap.js').replace('export function','function');
const drawCityMap=new Function('cityMapLayout','cityZoomFrames','blockNoise','worldBlock','windowGang','drawBlockMap',
 mapSource+'\nreturn drawCityMap;')(cityMapLayout,cityZoomFrames,blockNoise,worldBlock,windowGang,drawBlockMap);
const uiSource=source('../src/controllers/GameUI.js').replace('export default class','class');
const managerSource=source('../src/controllers/ProgressionManager.js').replace('export default class','class');
const UI=new Function(uiSource+'\nreturn GameUI;')();
let atlas=createCityState(),claims=0,saved=[],hasReplay=false,replayDone,introCalls=0;
const bindings={console, CITY_BLOCKS,cityForBlock,cityView,drawCityMap,advanceJourney,
 getCityProgress:checkpoint=>createCityState(atlas,checkpoint),
 startCityIntro:checkpoint=>{introCalls++;const r=claimCityIntro(atlas,checkpoint);atlas=r.state;return r.applied;},
 completeCityBlock:event=>{claims++;const result=claimCityBlock(atlas,event);atlas=result.state;return result;},
 saveJourneyProgress:value=>{saved.push(value);return true;},saveSessionState:()=>true,
 getWindowState:()=>({gangID:'afterlight'}),PVE_BLOCK_MAPS:15,
 drawBlockMap,ReplaySystem:{hasReplay:()=>hasReplay,play:(_,options)=>{replayDone=options.onDone;}}};
const Manager=new Function(...Object.keys(bindings),managerSource+'\nreturn ProgressionManager;')(...Object.values(bindings));
function scene(width=390,height=844,props={}){
 const objects=[],tweens=[],delays=[],configs=[],controls=[],restarts=[],events=[],listeners={};
 const object=(kind,x=0,y=0,value='',style={})=>{
  const o={kind,x,y,alpha:1,visible:true,active:true,children:[],handlers:{},scaleX:1,scaleY:1,
   height:kind==='text'?parseFloat(style.fontSize||14)*Math.ceil(Math.max(1,String(value).length)/(Math.max(10,style.wordWrap?.width||1000)/(parseFloat(style.fontSize||14)*.6))):0,
   setText(value){this.text=value;return this;},once(name,fn){this.handlers[name]=fn;return this;},setScale(n){this.scaleX=this.scaleY=n;return this;},setPosition(x,y){this.x=x;this.y=y;return this;},
   setScrollFactor(){return this;},setDepth(n){this.depth=n;return this;},setOrigin(){return this;},
   setStrokeStyle(){return this;},setInteractive(){this.interactive=true;return this;},setAlpha(n){this.alpha=n;return this;},
   setVisible(n){this.visible=n;return this;},setFillStyle(){return this;},on(name,fn){this.handlers[name]=fn;return this;},
   add(child){this.children.push(child);child.parentContainer=this;return this;},destroy(){if(!this.active)return;this.active=false;this.children.forEach(child=>child.destroy());},
   fillStyle(){return this;},fillRect(){return this;},lineStyle(){return this;},lineBetween(){return this;},
   fillTriangle(){return this;},strokeCircle(){return this;},fillCircle(){return this;},strokeRect(){return this;}};
  objects.push(o);return o;
 };
 const s={mode:'pve',runKind:'journey',role:'runner',blockIndex:1,pveRound:1,
  blockGangID:'iron-row',roundPausedForMenu:false,_showCityOnEntry:true,
  scale:{gameSize:{width,height}},cameras:{main:{centerX:width/2,centerY:height/2}},
  input:{keyboard:{enabled:true}},suspendTouchUI:value=>controls.push(value),
  add:{container:(x,y)=>object('container',x,y),graphics:()=>object('graphics'),
   rectangle:(x,y,w,h)=>{const o=object('rectangle',x,y);o.width=w;o.height=h;return o;},
   text:(x,y,value,style)=>object('text',x,y,value,style)},
  tweens:{add:config=>{tweens.push(config);return config;},killTweensOf:o=>{events.push('kill');}},
  events:{once:(key,fn)=>{listeners[key]=fn;},off:key=>{delete listeners[key];}},
  time:{delayedCall:(_,fn)=>{const timer={removed:false,remove(){this.removed=true;},fn};delays.push(timer);return timer;}},scene:{restart:data=>restarts.push(data),start:key=>events.push(key)},
  ...props};
 s.gameUI=new UI(s);
 const show=s.gameUI.showModal.bind(s.gameUI);
 s.gameUI.showModal=config=>{configs.push(config);return show(config);};
 return {s,objects,tweens,delays,configs,controls,restarts,events,listeners};
}

function finish(f) {
 f.delays[0].fn();
 check('automatic neighborhood move',f.tweens.length===1);
 f.tweens[0].onComplete();
 check('automatic nested block move',f.tweens.length===2);
 f.tweens[1].onComplete();
 f.delays[1].fn();
}
for(const [width,height] of [[280,480],[390,844],[1440,900]]) {
 atlas=createCityState();
 const f=scene(width,height),m=new Manager(f.s),order=[];
 let consultation;
 m.showContactCheckIn=next=>{order.push('contact');consultation=next;return {};};
 m.showBlockMap(()=>order.push('powers'));
 check('city first without modal/buttons '+width,f.configs.length===0&&order.length===0&&f.s._cityMapOpen);
 check('intro claimed before showing '+width,atlas.introThrough===1);
 check('input stays suspended '+width,f.s.roundPausedForMenu&&!f.s.input.keyboard.enabled&&f.controls.every(Boolean));
 check('only opaque non-clickable blocker '+width,f.objects.filter(o=>o.interactive).length===1
  &&f.objects.find(o=>o.interactive).depth===21000&&!Object.keys(f.objects.find(o=>o.interactive).handlers).length);
 check('all ten actual exterior blocks embedded '+width,f.objects.filter(o=>o.kind==='graphics'&&o.depth===20001).length===10);
 check('no city labels or cards',!f.objects.some(o=>o.kind==='text'&&o.depth===20004));
 finish(f);
 check('zoom then consultation '+width,order.join(',')==='contact'&&!f.s._cityMapOpen);
 check('root and blocker removed before consultation '+width,f.objects.every(o=>!o.active));
 check('never touch rebind between screens '+width,f.controls.every(Boolean));
 check('zoom never fades map',f.tweens.every(t=>t.alpha===undefined));
 check('shutdown listener removed',!f.listeners.shutdown);
 consultation();
 check('consultation then street '+width,f.configs.length===1&&f.configs[0].buttons[0].label==='ENTER HOUSE 1');
 check('no city browsing control',!JSON.stringify(f.configs).includes('"CITY"'));
 f.configs[0].buttons[0].onClick();
 check('street then powers '+width,order.join(',')==='contact,powers');
 const resume=scene(width,height),rm=new Manager(resume.s);
 let resumed=0;rm.showContactCheckIn=()=>{resumed++;};
 rm.showBlockMap(()=>{});
 check('new scene same block skips persisted intro',resumed===1&&!resume.objects.length);
}
atlas=createCityState();
const interrupted=scene(),im=new Manager(interrupted.s);let continued=0;
im.showContactCheckIn=()=>continued++;
im.showBlockMap(()=>{});
interrupted.listeners.shutdown();
interrupted.delays[0].fn();
check('shutdown removes all artwork',interrupted.objects.every(o=>!o.active));
check('shutdown cancels timers',interrupted.delays.every(t=>t.removed));
check('stale timer cannot zoom',interrupted.tweens.length===0);
check('shutdown never advances dead scene',continued===0);
const afterResize=scene(),arm=new Manager(afterResize.s);arm.showContactCheckIn=()=>continued++;
arm.showBlockMap(()=>{});
check('resize/reload skips already claimed intro',continued===1&&!afterResize.objects.length);
for(const runKind of ['rivals','daily','tutorial']) {
 const f=scene(390,844,{runKind}),m=new Manager(f.s);let entered=0;const calls=introCalls;
 m.showContactCheckIn=()=>entered++;m.showBlockMap(()=>{});
 check('excluded mode no writes '+runKind,entered===1&&!f.objects.length&&introCalls===calls);
}
atlas=createCityState();
const f=scene(390,844,{hasStash:true,pveRound:14}),m=new Manager(f.s);
m.saveProgress({},true);
check('fourteen houses cannot claim',claims===0&&atlas.completedThrough===0);
f.s.pveRound=15;m.saveProgress({},true);
check('final seam keeps frozen owner',atlas.completedThrough===1&&atlas.owners[1]==='iron-row');
check('next checkpoint unchanged',saved.at(-1).blockIndex===2&&saved.at(-1).pveRound===1);
m.saveProgress({},true);
check('duplicate completion keeps owner',atlas.owners[1]==='iron-row');
hasReplay=true;m.showBlockCompleteResult();
check('finish retains revealed block',f.configs.at(-1).title==='BLOCK CLEARED'&&!f.s._cityMapOpen);
const replay=f.configs.at(-1).buttons.find(b=>b.label.includes('Watch Replay'));
check('finish retains last-house replay',Boolean(replay));
replay.onClick(f.s.gameUI.currentModal);replayDone();
f.configs.at(-1).buttons[0].onClick();
check('next block enters same seeded flow',f.restarts.at(-1).blockIndex===2&&f.restarts.at(-1).pveRound===1);
const next=scene(390,844,{blockIndex:2}),nm=new Manager(next.s);let arrived=0;
nm.showContactCheckIn=()=>arrived++;nm.showBlockMap(()=>{});finish(next);
check('new block automatically has intro',arrived===1&&atlas.introThrough===2);
for(const kind of ['rectangle','container','graphics','text']) {
 atlas=createCityState();
 const broken=scene();broken.s.add[kind]=()=>{throw Error('renderer unavailable');};
 const bm=new Manager(broken.s);let fallback=0;bm.showContactCheckIn=()=>fallback++;
 bm.showBlockMap(()=>{});
 check('construction error continues safely '+kind,fallback===1&&!broken.s._cityMapOpen);
 check('construction error leaves no veil '+kind,broken.objects.every(o=>!o.active));
}
console.log('city flow: '+passed+' assertions passed');
