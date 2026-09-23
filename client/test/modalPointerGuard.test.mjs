import { readFileSync } from 'node:fs';
import { consumeModalPointer, guardModalDismissal, guardSceneEntryFromHeldPointer } from '../src/utils/modalPointerGuard.js';
let passed=0;const check=(name,ok)=>{if(!ok)throw Error(name);passed++;};
function fixture(){
 const objects=[],timers=[],shutdown=new Set();let now=0;
 function object(x,y,w,h){return {x,y,width:w,height:h,active:true,handlers:{},depth:0,
 setScrollFactor(){return this;},setDepth(v){this.depth=v;return this;},setInteractive(){this.interactive=true;return this;},
 setStrokeStyle(){return this;},setOrigin(){return this;},setText(v){this.text=v;return this;},
 setColor(){return this;},setFillStyle(){return this;},on(name,fn){this.handlers[name]=fn;return this;},
 destroy(){this.active=false;}};}
 const pointer={isDown:false,event:{stopPropagation(){}}};
 const scene={scale:{width:390,height:844,gameSize:{width:390,height:844}},
 cameras:{main:{centerX:195,centerY:422}},input:{manager:{pointers:[pointer]}},
 events:{once(name,fn){shutdown.add(fn);},off(name,fn){shutdown.delete(fn);}},
 add:{rectangle(x,y,w,h){const o=object(x,y,w,h);objects.push(o);return o;},
 text(x,y,txt){const o=object(x,y,0,0);o.text=txt;objects.push(o);return o;}},
 time:{delayedCall(ms,fn){const t={at:now+ms,fn,active:true,remove(){this.active=false;}};timers.push(t);return t;}},
 toast(){},sound:{mute:false,sounds:[]}};
 function advance(ms){const end=now+ms;while(true){const t=timers.filter(t=>t.active&&t.at<=end).sort((a,b)=>a.at-b.at)[0];if(!t)break;now=t.at;t.active=false;t.fn();}now=end;}
 function hit(name,x,y){pointer.isDown=name==='pointerdown';let stopped=false;
 const candidates=objects.filter(o=>o.active&&o.interactive&&Math.abs(x-o.x)<=o.width/2&&Math.abs(y-o.y)<=o.height/2).sort((a,b)=>b.depth-a.depth);
 // Top-only normal Phaser hit testing; event propagation is separately tested.
 candidates[0]?.handlers[name]?.(pointer,0,0,{stopPropagation(){stopped=true;}});
 return stopped;
 }
 return {scene,objects,pointer,advance,hit,shutdown};
}
let phaserStops=0,domStops=0;
consumeModalPointer({event:{stopPropagation(){domStops++;}}},{stopPropagation(){phaserStops++;}});
check('consumes Phaser and DOM events',phaserStops===1&&domStops===1);
const source=readFileSync(new URL('../src/scenes/MenuScene.js',import.meta.url),'utf8');
const method=source.slice(source.indexOf('  openSettings(){'),source.indexOf('  // Pre-game tips modal'));
const open=new Function('PALETTE','AudioManager','localStorage','consumeModalPointer','guardModalDismissal',
 'return function'+method.slice(method.indexOf('(')))({panel:0,title:'#fff',sub:'#fff',stroke:0},
 {get:()=>({isMusicMuted:()=>false,setMusicMute(){},setMute(){}})},
 {getItem:()=>null,setItem(){}},consumeModalPointer,guardModalDismissal);
{
 const legacyMethod=method.replaceAll('guardModalDismissal(this,pointer,event);','');
 const legacyOpen=new Function('PALETTE','AudioManager','localStorage','consumeModalPointer',
 'return function'+legacyMethod.slice(legacyMethod.indexOf('(')))({panel:0,title:'#fff',sub:'#fff',stroke:0},
 {get:()=>({isMusicMuted:()=>false,setMusicMute(){},setMute(){}})},
 {getItem:()=>null,setItem(){}},consumeModalPointer);
 const f=fixture();let tutorials=0;f.scene.add.rectangle(195,485,200,50).setDepth(3).setInteractive().on('pointerup',()=>tutorials++);
 legacyOpen.call(f.scene);const close=f.objects.find(o=>o.width===92);
 f.hit('pointerdown',close.x,close.y);f.hit('pointerup',close.x,close.y);
 check('regression reproduces accidental tutorial without guard',tutorials===1);
}
for(const outside of [false,true]){
 const f=fixture();let tutorials=0;
 f.scene.add.rectangle(195,485,200,50).setDepth(3).setInteractive().on('pointerup',()=>tutorials++);
 open.call(f.scene);
 const close=f.objects.find(o=>o.width===92);
 const x=outside?10:close.x,y=outside?10:close.y;
 // Place the underlying title action exactly under the dismiss position.
 const underneath=f.objects[0];underneath.x=x;underneath.y=y;
 check('dismiss down consumed '+outside,f.hit('pointerdown',x,y));
 check('release swallowed '+outside,f.hit('pointerup',x,y));
 check('closing settings never launches tutorial '+outside,tutorials===0);
 f.advance(249);check('short safety interval persists '+outside,Boolean(f.scene._modalDismissGuard));
 f.advance(1);check('guard clears after release '+outside,!f.scene._modalDismissGuard);
 f.hit('pointerdown',x,y);f.hit('pointerup',x,y);
 check('next deliberate tap works '+outside,tutorials===1);
}
{
 const f=fixture();f.pointer.isDown=true;guardModalDismissal(f.scene,f.pointer);
 f.advance(1000);check('held tap outlasts nominal delay',Boolean(f.scene._modalDismissGuard));
 f.pointer.isDown=false;f.advance(50);check('held tap releases without permanent lock',!f.scene._modalDismissGuard);
}
{
 const f=fixture(),other={isDown:true};f.scene.input.manager.pointers.push(other);
 guardModalDismissal(f.scene,f.pointer);f.advance(300);
 check('second finger retains shield',Boolean(f.scene._modalDismissGuard));
 other.isDown=false;f.advance(50);check('all fingers lifted clears shield',!f.scene._modalDismissGuard);
}
{
 const f=fixture();const first=guardModalDismissal(f.scene,f.pointer),second=guardModalDismissal(f.scene,f.pointer);
 first.destroy();check('old cleanup cannot remove replacement',f.scene._modalDismissGuard===second);
 for(const fn of [...f.shutdown])fn();
 check('shutdown cleans guard',!f.scene._modalDismissGuard&&!f.objects.some(o=>o.active));
 f.advance(1000);check('pending timers harmless after shutdown',!f.scene._modalDismissGuard);
}
{
 const f=fixture();f.scene._touchSceneClosing=true;check('closing scene never creates shield',guardModalDismissal(f.scene,f.pointer)===null);
 f.scene._touchSceneClosing=false;f.scene.cameras.main=null;check('camera gone never creates shield',guardModalDismissal(f.scene,f.pointer)===null);
}
{
 const f=fixture();f.scene.input.enabled=true;f.pointer.isDown=true;
 check('held entry disables new menu input',guardSceneEntryFromHeldPointer(f.scene)&&!f.scene.input.enabled);
 f.advance(1000);check('held finger cannot activate landing controls',!f.scene.input.enabled);
 f.pointer.isDown=false;f.advance(129);
 check('release still has a short landing guard',!f.scene.input.enabled);
 f.advance(1);check('fresh tap works after release',f.scene.input.enabled);
}
{
 const f=fixture();f.scene.input.enabled=true;f.pointer.isDown=true;
 guardSceneEntryFromHeldPointer(f.scene);
 for(const stop of [...f.shutdown])stop();
 check('scene shutdown restores its input plugin',f.scene.input.enabled);
}
check('landing installs held gesture guard before controls',source.indexOf('guardSceneEntryFromHeldPointer(this);')
  < source.indexOf('this.drawStreetBackground();'));
const auth=readFileSync(new URL('../src/utils/authUI.js',import.meta.url),'utf8');
check('in-game settings shares dismissal guard',auth.includes('guardModalDismissal(scene,pointer,event);destroyAll();'));
const ui=readFileSync(new URL('../src/controllers/GameUI.js',import.meta.url),'utf8');
check('shared modal buttons consume press before action',ui.includes('consumeModalPointer(pointer,event);'));
check('shared modal buttons protect eventual release',ui.includes('guardModalDismissal(this.scene,pointer,event);'));
check('shared destroyed modal cannot act twice',ui.includes('if(destroyed)return;'));
{
 const raw=ui.replace(/^import .*;$/gm,'').replace('export default class','class');
 const UI=new Function('consumeModalPointer','guardModalDismissal',raw+';return GameUI;')(consumeModalPointer,guardModalDismissal);
 const f=fixture();f.scene.input.keyboard={enabled:true};let actions=0;
 const modal=new UI(f.scene).showModal({title:'Settings',inputDelay:0,buttons:[{label:'OK',onClick:()=>actions++}]});
 const button=f.objects.find(o=>o.interactive&&o.depth===20000);
 check('actual shared button consumes down',f.hit('pointerdown',button.x,button.y));
 check('actual shared modal action runs once',actions===1);
 button.handlers.pointerdown(f.pointer,0,0,{stopPropagation(){}});
 check('destroyed shared button cannot repeat action',actions===1);
 check('shared modal owns release',f.hit('pointerup',button.x,button.y));
 f.advance(250);check('shared modal guard clears',!f.scene._modalDismissGuard);
 modal.destroy();
}
console.log('modal pointer guard: '+passed+' assertions passed');
