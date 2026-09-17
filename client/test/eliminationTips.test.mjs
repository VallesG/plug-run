import { RUNNER_TIPS, PLUG_TIPS, eliminationTip, eliminationTipLayout } from '../src/logic/eliminationTips.js';
import { contact } from '../src/logic/contacts.js';
import { drawEliminationTip } from '../src/controllers/EliminationTip.js';
import { readFileSync } from 'node:fs';
let passed=0;
function check(name,ok){if(!ok)throw Error(name);passed++;}
check('brief readable advice', [...RUNNER_TIPS,...PLUG_TIPS].every(t=>t.length<=100));
for(const [gang,ids] of Object.entries({crossline:['switch','mags'],'iron-row':['brick','rook'],afterlight:['vee','sol']})){
  for(let turn=0;turn<20;turn++){
    const cue=eliminationTip({gangID:gang,seed:123,house:3,turn});
    check('correct rotating contact',cue.contactID===ids[turn%2]&&contact(cue.contactID).gangID===gang);
    check('tips deterministic',JSON.stringify(cue)===JSON.stringify(eliminationTip({gangID:gang,seed:123,house:3,turn})));
    check('consecutive retries change advice',cue.text!==eliminationTip({gangID:gang,seed:123,house:3,turn:turn+1}).text);
  }
}
check('unchosen crew uses Ro',eliminationTip({gangID:null}).contactID==='ro');
check('plug receives defense advice',PLUG_TIPS.includes(eliminationTip({role:'plug'}).text));
function fixture(cached=true){
  const nodes=[],listeners={},extras=[],queued=[];
  let shut;
  const node=(kind,x,y,width=0,height=0)=>{const o={kind,x,y,width,height,active:true,visible:true,
    setOrigin(){return this;},setDepth(d){this.depth=d;return this;},setScrollFactor(){return this;},
    setScale(scale){this.displayWidth=this.width*scale;this.displayHeight=this.height*scale;return this;},
    setVisible(v){this.visible=v;return this;},destroy(){this.active=false;}};
    nodes.push(o);return o;};
  const scene={textures:{exists:()=>cached,get:()=>({has:()=>true})},
    add:{text:(x,y,text,style)=>{const o=node('text',x,y);o.text=text;o.style=style;return o;},
      circle:(x,y,r)=>node('circle',x,y,r*2,r*2),
      image:(x,y,key,frame)=>{const c=key==='window_ro'?{frame:{width:724,height:724}}:key==='contact_switch'?contact('switch'):contact(frame);const o=node('image',x,y,c.frame.width,c.frame.height);o.key=key;return o;}},
    load:{once(k,fn){listeners[k]=fn;},off(k,fn){if(listeners[k]===fn)delete listeners[k];},
      image(...args){queued.push(args);},spritesheet(...args){queued.push(args);},start(){},isLoading:()=>false},
    events:{once(k,fn){shut=fn;},off(){shut=null;}}};
  const modal={contentBounds:{x:20,y:120,width:208,height:110},registerExtra:o=>extras.push(o)};
  return {scene,modal,nodes,extras,listeners,queued,shutdown:()=>shut?.(),cache:()=>{cached=true;}};
}
for(const bounds of [{x:20,y:100,width:208,height:110},{x:20,y:100,width:308,height:220},{x:20,y:100,width:448,height:220}]){
  const a=eliminationTipLayout(bounds);
  check('portrait and text horizontal fit',a.textX+a.textW<=bounds.x+bounds.width+1e-9&&a.portraitX-a.portraitW/2>=bounds.x-1e-9);
  check('portrait fits vertical area',a.portraitH<=bounds.height&&a.portraitBottom-a.portraitH>=bounds.y);
}
let f=fixture();let life=drawEliminationTip(f.scene,f.modal,{contactID:'switch',text:RUNNER_TIPS[0]});
check('cached portrait appears immediately',f.nodes.some(o=>o.kind==='image'&&o.active));
check('cached portrait fits reserved width and height',f.nodes.filter(o=>o.kind==='image').every(o=>o.displayWidth<=62.4&&o.displayHeight<=102));
check('no cached download',f.queued.length===0);
life.destroy();check('modal destroys tip objects',f.nodes.every(o=>!o.active));
f=fixture(false);life=drawEliminationTip(f.scene,f.modal,{contactID:'brick',text:RUNNER_TIPS[1]});
check('missing portrait never delays text/actions',f.nodes.some(o=>o.text===RUNNER_TIPS[1])&&f.nodes.some(o=>o.kind==='circle'));
check('only portrait queued not room',f.queued.length===1&&f.queued[0][1].endsWith('/cast.webp'));
const late=f.listeners.complete;life.destroy();f.cache();late();
check('late download cannot resurrect dismissed screen',!f.nodes.some(o=>o.kind==='image')&&!f.listeners.complete);
f=fixture(false);life=drawEliminationTip(f.scene,f.modal,{contactID:'switch',text:RUNNER_TIPS[2]});
check('Switch uses framed spritesheet',f.queued[0][2].frameWidth===724);
f.shutdown();check('shutdown tears down pending tip',!life.active&&!f.listeners.complete);
const source=readFileSync(new URL('../src/controllers/ProgressionManager.js',import.meta.url),'utf8');
const begin=source.indexOf('  async showPvEGameOver('),end=source.indexOf('  checkExtractionProgress(',begin);
const raw=source.slice(begin,end).replace(/\/\*\*[\s\S]*?\*\/\s*$/,'');
let options,restarts=[],menu,save,deathCount=0,draws=0;
const show=new Function('eliminationTip','drawEliminationTip','contact','getWindowState','trackGameOver','updateRouteProgress',
 'getCurrentRouteID','getRouteSeed','hasUsedSpawnSwap','SESSION_RULES','submitScore','submitAllTimeScore',
 'return {'+raw+'}.showPvEGameOver;')(
 eliminationTip,()=>{draws++;},contact,()=>({gangID:'afterlight'}),()=>{},()=>{},()=> 'route',()=> 123,()=>false,
 {SWAP_PENALTY:3},async()=>{},async()=>{});
const scene={runKind:'journey',role:'runner',seed:123,pveRound:3,pveSessionStash:2,pveSessionRep:20,
 gameUI:{showModal:o=>{options=o;return {};}},scene:{restart:d=>restarts.push(d),start:key=>menu=key}};
const manager={scene,noteDeathForContacts(){deathCount++;},saveProgress:d=>save=d};
await show.call(manager);
check('elimination contains three actions only',options.buttons.length===3);
check('failed replay removed',options.buttons.every(b=>!/replay/i.test(b.label)));
check('stats retained in compact line',options.lines[0].includes('2 STASH')&&options.lines[0].includes('20 REP'));
check('tip renderer called and death recorded',draws===1&&deathCount===1);
options.buttons[0].onClick();
check('retry same house and seed',restarts[0].pveRound===3&&restarts[0].seed===123);
check('retry rotates tip and suppresses failed replay',restarts[0].eliminationTipTurn===1&&restarts[0].retryAfterElimination);
check('retry preserves tough spawn contract',restarts[0].retryAfterDeath===true);
options.buttons[1].onClick();
check('swap penalty preserved and visibly priced',scene.pveSessionRep===17&&options.buttons[1].label.includes('−3 REP'));
check('swap increments spawn cycle and rotates tip',restarts[1].swapSpawnCycle===1&&restarts[1].eliminationTipTurn===1&&restarts[1].retryAfterElimination);
check('swap saves tough bonus forfeiture',save.retryAfterDeath===false&&save.pveCleanStreak===0);
options.buttons[2].onClick();check('menu exit retained',menu==='MENU');
await show.call(manager);check('either crew contact can give next tip',scene.eliminationTipTurn===2);
const success=source.slice(source.indexOf('  showBlockComplete('),begin);
check('success replay retained',success.includes("label: 'WATCH REPLAY'"));
console.log('elimination tips: '+passed+' assertions passed');

f=fixture();const frameAdds=[];
f.scene.textures.get=()=>({has:()=>false,add:(...args)=>frameAdds.push(args)});
life=drawEliminationTip(f.scene,f.modal,{contactID:'rook',text:RUNNER_TIPS[0]});
check('shared cast atlas adds exact Rook crop',frameAdds[0].join()==='rook,0,1587,0,396,793');
f=fixture(false);life=drawEliminationTip(f.scene,f.modal,{contactID:'switch',text:RUNNER_TIPS[0]});
life.setVisible(false);f.cache();f.listeners.complete();
check('late loaded portrait respects hidden modal',f.nodes.some(o=>o.kind==='image'&&o.visible===false));
life.setVisible(true);
check('show restores only live tip content',f.nodes.filter(o=>o.active).every(o=>o.visible));
f=fixture(false);life=drawEliminationTip(f.scene,f.modal,{contactID:'brick',text:RUNNER_TIPS[0]});f.listeners.complete();
check('failed portrait remains readable fallback',f.nodes.some(o=>o.kind==='circle'&&o.active)&&f.nodes.some(o=>o.text===RUNNER_TIPS[0]&&o.active));
f=fixture();life=drawEliminationTip(f.scene,f.modal,{contactID:'ro',text:RUNNER_TIPS[0]});
check('no chosen crew uses shared Auntie Ro art',f.nodes.some(o=>o.kind==='image'&&o.key==='window_ro'));
console.log('elimination art lifecycle: '+passed+' total assertions passed');

const replaySource=readFileSync(new URL('../src/controllers/ReplaySystem.js',import.meta.url),'utf8');
const fStart=replaySource.indexOf('  finalize('),fEnd=replaySource.indexOf('  _finalize()',fStart);
const hStart=replaySource.indexOf('  hasReplay('),hEnd=replaySource.indexOf('  getMeta()',hStart);
const replayMethods=new Function('rec','lastReplay','GRACE_MS','return {'+replaySource.slice(fStart,fEnd)+replaySource.slice(hStart,hEnd)+'};');
const active={started:true,samples:Array(8),elapsed:100,meta:{role:'runner'}};
let realReplay=replayMethods(active,null,400);
realReplay.finalize({successful:false});
check('failed replay remains available for internal debugging',realReplay.hasReplay('runner'));
check('failed replay not eligible for success picker',!realReplay.hasReplay('runner',{successfulOnly:true}));
realReplay.finalize({successful:true});
check('successful in-flight replay is eligible',realReplay.hasReplay('runner',{successfulOnly:true}));
realReplay=replayMethods(null,{meta:{role:'runner',successful:true}},400);
check('sealed successful replay is eligible',realReplay.hasReplay('runner',{successfulOnly:true}));
realReplay=replayMethods(null,{meta:{role:'runner',successful:false}},400);
check('sealed failed replay is ineligible',!realReplay.hasReplay('runner',{successfulOnly:true}));
realReplay=replayMethods(null,{meta:{role:'runner'}},400);
check('missing outcome cannot count as success',!realReplay.hasReplay('runner',{successfulOnly:true}));
console.log('success replay eligibility: '+passed+' total assertions passed');
