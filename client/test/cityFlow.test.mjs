// Actual manager, GameUI and city renderer against a small display-list stub.
// This proves callbacks/lifecycle/geometry, not Phaser rendering or font metrics.
import { readFileSync } from 'node:fs';
import { CITY_BLOCKS, cityForBlock, cityView, cityMapLayout, createCityState, claimCityBlock } from '../src/logic/city.js';
import { advanceJourney } from '../src/logic/worldBlocks.js';
import { windowGang } from '../src/logic/window.js';
let passed=0;
function check(name,ok){if(!ok)throw Error(name);passed++;}
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8').replace(/^import[\s\S]*?;\s*/gm,'');
const mapSource=source('../src/controllers/CityMap.js').replace('export function','function');
const uiSource=source('../src/controllers/GameUI.js').replace('export default class','class');
const managerSource=source('../src/controllers/ProgressionManager.js').replace('export default class','class');
const drawCityMap=new Function('cityMapLayout','windowGang',mapSource+'\nreturn drawCityMap;')(cityMapLayout,windowGang);
const UI=new Function(uiSource+'\nreturn GameUI;')();
let atlas=createCityState(),claims=0,saved=[],hasReplay=false,replayDone;
const bindings={CITY_BLOCKS,cityForBlock,cityView,drawCityMap,advanceJourney,
 getCityProgress:checkpoint=>createCityState(atlas,checkpoint),
 completeCityBlock:event=>{claims++;const result=claimCityBlock(atlas,event);atlas=result.state;return result;},
 saveJourneyProgress:value=>{saved.push(value);return true;},saveSessionState:()=>true,
 getWindowState:()=>({gangID:'afterlight'}),PVE_BLOCK_MAPS:15,
 drawBlockMap:()=>{},ReplaySystem:{hasReplay:()=>hasReplay,play:(_,options)=>{replayDone=options.onDone;}}};
const Manager=new Function(...Object.keys(bindings),managerSource+'\nreturn ProgressionManager;')(...Object.values(bindings));
function scene(width=390,height=844,props={}){
 const objects=[],tweens=[],delays=[],configs=[],controls=[],restarts=[],events=[];
 const object=(kind,x=0,y=0,value='',style={})=>{
  const o={kind,x,y,alpha:1,visible:true,active:true,children:[],handlers:{},scaleX:1,scaleY:1,
   height:kind==='text'?parseFloat(style.fontSize||14)*Math.ceil(Math.max(1,String(value).length)/(Math.max(10,style.wordWrap?.width||1000)/(parseFloat(style.fontSize||14)*.6))):0,
   setScale(n){this.scaleX=this.scaleY=n;return this;},setPosition(x,y){this.x=x;this.y=y;return this;},
   setScrollFactor(){return this;},setDepth(n){this.depth=n;return this;},setOrigin(){return this;},
   setStrokeStyle(){return this;},setInteractive(){this.interactive=true;return this;},setAlpha(n){this.alpha=n;return this;},
   setVisible(n){this.visible=n;return this;},setFillStyle(){return this;},on(name,fn){this.handlers[name]=fn;return this;},
   add(child){this.children.push(child);return this;},destroy(){if(!this.active)return;this.active=false;this.children.forEach(child=>child.destroy());},
   fillStyle(){return this;},fillRect(){return this;},lineStyle(){return this;},lineBetween(){return this;},
   fillCircle(){return this;},strokeRect(){return this;}};
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
  time:{delayedCall:(_,fn)=>{delays.push(fn);}},scene:{restart:data=>restarts.push(data),start:key=>events.push(key)},
  ...props};
 s.gameUI=new UI(s);
 const show=s.gameUI.showModal.bind(s.gameUI);
 s.gameUI.showModal=config=>{configs.push(config);return show(config);};
 return {s,objects,tweens,delays,configs,controls,restarts,events};
}
for(const [width,height] of [[280,480],[390,844],[1440,900]]){
 atlas=createCityState();hasReplay=false;
 const f=scene(width,height),m=new Manager(f.s),order=[];
 let consultation;
 m.showContactCheckIn=next=>{order.push('contact');consultation=next;return {};};
 m.showBlockMap(()=>order.push('powers'));
 check('city first '+width,f.configs.length===1&&order.length===0&&f.s._cityMapOpen);
 check('city pauses all input '+width,f.s.roundPausedForMenu&&!f.s.input.keyboard.enabled&&f.controls.every(Boolean));
 check('grace blocker above custom map '+width,f.objects.some(o=>o.interactive&&o.depth===20500));
 const area=f.s.gameUI.currentModal.contentBounds;
 check('positive prototype area '+width,area.width>0&&area.height>100);
 const layout=cityMapLayout(area);
 check('ten blocks fit modal '+width,layout.height*layout.scale<=area.height+1e-8);
 check('single current tile touch target '+width,f.objects.filter(o=>o.interactive&&!o.depth).some(o=>o.height*layout.scale>=44));
 f.configs[0].buttons[0].onClick();
 f.configs[0].buttons[0].onClick();
 check('double entry has one zoom '+width,f.tweens.length===1&&order.length===0);
 f.tweens[0].onComplete();
 check('zoom then consultation '+width,order.join(',')==='contact'&&!f.s._cityMapOpen);
 check('handoff touch rebind immediately canceled '+width,f.controls.slice(-2).join(',')==='false,true');
 consultation();
 check('consultation then street '+width,f.configs.length===2&&f.configs[1].buttons[0].label==='ENTER HOUSE 1');
 f.configs[1].buttons[0].onClick();
 check('street then powers '+width,order.join(',')==='contact,powers');
 const count=f.configs.length;
 m.showBlockMap(()=>{});
 check('same scene does not auto-show city again '+width,f.configs.length===count&&order.at(-1)==='contact');
 // Destroy all display-list extras and ensure no live city root remains.
 check('city root torn down '+width,f.objects.filter(o=>o.kind==='container').every(o=>!o.active));
 check('zoom tween canceled on teardown '+width,f.events.includes('kill'));
}
for(const runKind of ['rivals','daily','tutorial']){
 const f=scene(390,844,{runKind}),m=new Manager(f.s);
 let entered=0;m.showContactCheckIn=next=>{entered++;next();};m.showBlockEntranceMap=()=>{};
 m.showBlockMap(()=>{});
 check('excluded mode no city '+runKind,f.configs.length===0&&entered===1);
}
atlas=createCityState();
const f=scene(390,844,{hasStash:true,pveRound:14}),m=new Manager(f.s);
m.saveProgress({},true);
check('fourteen houses cannot claim',claims===0&&atlas.completedThrough===0);
f.s.pveRound=15;m.saveProgress({},true);
check('real final seam claims frozen crew',atlas.completedThrough===1&&atlas.owners[1]==='iron-row');
check('checkpoint remains next global block',saved.at(-1).blockIndex===2&&saved.at(-1).pveRound===1);
m.saveProgress({},true);
check('duplicate final preserves ownership',atlas.completedThrough===1&&atlas.owners[1]==='iron-row');
const claimCalls=claims;
new Manager(scene(390,844,{runKind:'rivals',pveRound:15,hasStash:true}).s).saveProgress({},true);
check('Rivals no territory write',claims===claimCalls);
hasReplay=true;
m.showBlockCompleteResult();
check('finish pulls back to city',f.configs.at(-1).title==='Duskport'&&f.s._cityMapOpen);
check('finish retains watch',f.configs.at(-1).buttons.some(b=>b.label==='WATCH LAST HOUSE'));
const cityModal=f.s.gameUI.currentModal;
f.configs.at(-1).buttons.find(b=>b.label==='WATCH LAST HOUSE').onClick();
check('watch hides city root',f.objects.filter(o=>o.kind==='container'&&o.active).every(o=>!o.visible));
replayDone();
check('watch restores intact city',f.objects.filter(o=>o.kind==='container'&&o.active).every(o=>o.visible));
f.configs.at(-1).buttons[0].onClick();f.tweens.at(-1).onComplete();
check('finish enters next existing block',f.restarts.at(-1).blockIndex===2&&f.restarts.at(-1).pveRound===1&&!f.restarts.at(-1).showCityMap);
atlas=createCityState({completedThrough:10,owners:Object.fromEntries(Array.from({length:10},(_,i)=>[i+1,'crossline']))});
const boundary=scene(280,480,{blockIndex:10,pveRound:15,roundOver:true}),bm=new Manager(boundary.s);
bm.showBlockCompleteResult();
check('city complete shows 150',boundary.configs.at(-1).subtitle.includes('150 / 150'));
check('city boundary explicitly unlocks',boundary.configs.at(-1).buttons[0].label==='NEW CITY UNLOCKED  >>');
boundary.configs.at(-1).buttons[0].onClick();
check('new city map precedes next block',boundary.configs.at(-1).title==='Copper Bay'&&boundary.restarts.length===0);
boundary.configs.at(-1).buttons[0].onClick();boundary.tweens.at(-1).onComplete();
check('new city continues block eleven seeds',boundary.restarts.at(-1).blockIndex===11);
const browse=scene(390,844,{blockIndex:11,pveRound:4}),browseManager=new Manager(browse.s);
let returned=0;browseManager.showCityOverview(()=>returned++);
browse.configs.at(-1).buttons.at(-1).pair[0].onClick();
check('previous city is viewable',browse.configs.at(-1).title==='Duskport');
check('previous claims do not launch old gameplay',browse.configs.at(-1).buttons[0].label==='RETURN TO CURRENT CITY'&&returned===0);
browse.configs.at(-1).buttons[0].onClick();
check('return keeps current house',browse.configs.at(-1).title==='Copper Bay'&&browse.s.pveRound===4);
console.log('city flow: '+passed+' assertions passed');
