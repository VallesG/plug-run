// Real picker callbacks, with only the drawing/browser boundary stubbed.
import { readFileSync } from 'node:fs';
import * as selection from '../src/logic/powerSelection.js';
let passed=0;
function check(name,ok) { if(!ok)throw new Error(name);passed++; }
const source=readFileSync(new URL('../src/controllers/RunnerLoadout.js',import.meta.url),'utf8')
  .replace(/^import[\s\S]*?;\s*/gm,'').replace(/^export /gm,'');
let replayAvailable=false, replayOptions;
const bindings={...selection,drawPowerIcon:()=>node(),createBottomLeftButtons:()=>[],
  ReplaySystem:{hasReplay:()=>replayAvailable,play:(scene,options)=>{replayOptions=options;}}};
const show=new Function(...Object.keys(bindings),source+'\nreturn showRunnerLoadout;')(...Object.values(bindings));
function node(x=0,y=0,width=0,height=0) {
 return {x,y,width,height,visible:true,active:true,setOrigin(){return this;},setDepth(){return this;},
  setScrollFactor(){return this;},setStrokeStyle(){return this;},setInteractive(){this.interactive=true;return this;},
  on(event,fn){this.click=fn;return this;},setFillStyle(){return this;},setColor(){return this;},
  setText(t){this.text=t;return this;},setVisible(v){this.visible=v;return this;},
  destroy(){this.active=false;},press(){this.click?.();}};
}
function setup(width,height,house=1,options={}) {
 const rectangles=[],texts=[],extras=[],visible=[];
 let calls=0,modalOptions;
 const scene={role:'runner',mode:'pve',pveRound:house,roundPausedForMenu:false,input:{keyboard:{enabled:false}},
  add:{rectangle:(x,y,w,h)=>{const o=node(x,y,w,h);rectangles.push(o);return o;},
   text:(x,y,value)=>{const o=node(x,y);o.text=value;texts.push(o);return o;}},
  scene:{start:key=>{scene.destination=key;}}};
 const ui={scene,showModal:opts=>{
  modalOptions=opts;
  return {panel:{x:width/2,y:height/2,width:Math.min(520,width-40),height:Math.min(opts.compactLoadout?360:480,height-40)},
   registerExtra:(...objects)=>extras.push(...objects),destroy(){extras.forEach(o=>o.destroy());},
   setVisible:v=>visible.push(v)};
 }};
 show(ui,()=>calls++,options);
 const panelW=Math.min(520,width-40);
 const cards=rectangles.filter(o=>o.interactive && o.height>=80);
 const slots=rectangles.filter(o=>o.height===36);
 const start=rectangles.find(o=>o.height===44 && o.width===panelW-40);
 return {scene,cards,slots,start,texts,extras,visible,options:modalOptions,calls:()=>calls,rectangles};
}
for(const [w,h]of [[280,480],[390,844],[1440,900]]) {
 for(const house of [1,5]) {
  const r=setup(w,h,house,{allowReplay:false,showAccount:false});
  check('all three cards editable '+w+'/'+house,r.cards.length===3);
  check('compact selected only after opening houses',r.options.compactLoadout===(house>3));
  check('description teaching follows compact state',r.texts.some(t=>t.text==='Pass through\nwalls & bullets')===(house===1));
  check('later picker drops subtitle',house===1?r.options.subtitle.includes('powers'):r.options.subtitle===null);
  check('no charge wording',!r.texts.some(t=>/charge/i.test(t.text||'')));
  r.start.press();
  check('empty loadout cannot start',r.calls()===0);
  r.cards[0].press();r.cards[1].press();
  r.slots[0].press();r.cards[2].press();
  r.start.press();r.start.press();
  check('slot editing commits chosen order',r.scene.runnerPowersSelected.join()==='dash,decoy');
  check('start fires once',r.calls()===1);
  check('fresh powers and controls restored',r.scene.runnerPowersConsumed.join()==='false,false' && r.scene.input.keyboard.enabled && !r.scene.roundPausedForMenu);
  check('all registered drawing objects cleaned up',r.extras.every(o=>!o.active));
 }
}
for(let first=0;first<3;first++)for(let second=0;second<3;second++) {
 const trial=setup(390,844,1,{allowReplay:false,showAccount:false});
 trial.cards[first].press();trial.cards[second].press();trial.start.press();
 const ids=['phase','dash','decoy'];
 check('ordered mix '+first+'/'+second,trial.scene.runnerPowersSelected.join()===[ids[first],ids[second]].join());
}
let r=setup(390,844,1,{allowReplay:false,showAccount:false});
r.cards[2].press();r.cards[2].press();r.start.press();
check('duplicates remain valid',r.scene.runnerPowersSelected.join()==='decoy,decoy');
r=setup(390,844,1,{fixedPowers:['dash','phase'],allowReplay:false,showAccount:false});
check('only explicit harness loadouts lock cards',r.cards.length===0 && r.slots.every(o=>!o.interactive));
r.start.press();
check('harness pair remains exact',r.scene.runnerPowersSelected.join()==='dash,phase');
r=setup(390,844,1,{fixedPowers:['invalid'],allowReplay:false,showAccount:false});
check('invalid harness powers cannot trap picker',r.cards.length===3);
replayAvailable=true;
r=setup(390,844,5,{showAccount:false});
const replay=r.rectangles.find(o=>o.height===32 && o.x<195);
replay.press();
check('watch hides rather than destroys picker',r.visible.join()==='false' && r.extras.every(o=>o.active));
replayOptions.onDone();
check('replay returns to same picker',r.visible.join()==='false,true');
console.log(passed+' runner loadout assertions passed');
