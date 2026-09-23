import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { createMobileTutorialGuide } from '../src/controllers/MobileTutorialGuide.js';
let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
function fixture(){
 const texts=[],circles=[],rectangles=[];
 const item=()=>({setDepth(){return this;},setScrollFactor(){return this;},setOrigin(){return this;},setScale(){return this;},setVisible(v){this.visible=v;return this;},setPosition(x,y){this.x=x;this.y=y;return this;},add(){},destroy(){this.destroyed=true;},setText(t){texts.push(t);}});
 const graphics=()=>Object.assign(item(),{clear(){},lineStyle(){},strokeCircle(x,y){circles.push([x,y]);},fillStyle(){},fillCircle(){},fillRect(...r){rectangles.push(r);},fillRoundedRect(...r){rectangles.push(r);},strokeRoundedRect(){},lineBetween(){}});
 const camera={zoom:1,scrollX:0,scrollY:0,useBounds:true,setZoom(z){this.zoom=z;},setScroll(x,y){this.scrollX=x;this.scrollY=y;}};
 return {texts,circles,rectangles,cameras:{main:camera},scale:{width:390,height:844},cell:24,add:{container:item,graphics,rectangle(){throw Error('No blocking instruction panels allowed');},text:item},
 handleMovement(){this.moves=(this.moves||0)+1;},runner:{x:24,y:24},car:{x:100,y:200},
 stash:{x:40,y:50},bunkStash:{x:60,y:70,active:true},
 runnerPowersSelected:['dash','decoy'],runnerPowersConsumed:[false,false]};
}
const s=fixture(),g=createMobileTutorialGuide(s,1);
eq(s.cameras.main.useBounds,false);
eq(g.blocksGestures,true);eq(g.tick(100),true);eq(s.moves,undefined);
eq(s.cameras.main.zoom,1.65);eq(s.rectangles.length,0);
for(let i=0;i<29;i++)g.tick(100);
eq(g.phase,'reveal');
for(let i=0;i<7;i++)g.tick(100);
eq(g.waitingSwipe,true);eq(s.playerDrift,null);eq(s.cameras.main.zoom,1);
eq(s.cameras.main.scrollX,0);eq(s.cameras.main.scrollY,0);
eq(s.cameras.main.useBounds,true);
g.tick(16);eq(s.texts.at(-1),'Swipe anywhere, in any direction.');
for(let i=0;i<100;i++)g.tick(100);
eq(g.waitingSwipe,true);
eq(g.swipe({x:1,y:0},10),false);eq(g.swipe({x:9,y:9},80),false);
// The first swipe hands straight to the second prompt. There is no timed
// beat in between: the old one flashed "Lift your finger. You keep moving."
// for 650ms, which nobody could finish reading.
s.playerDrift={x:0,y:-1};
eq(g.swipe({x:0,y:-1},80),true);eq(g.phase,'swipe');
eq(s.playerDrift,{x:0,y:-1});    // handoff keeps the runner travelling
eq(s.texts.includes('Lift your finger. You keep moving.'),false);
g.tick(16);eq(s.texts.at(-1),'Swipe again to change direction.');
eq(s.playerDrift,{x:0,y:-1});    // drift survives every tick of the prompt
eq(g.tick(16),false);            // false = scene keeps updating (movement + objectives)
// The prompt waits on the player, not a clock: it is still up many seconds on.
for(let i=0;i<60;i++)g.tick(100);
eq(g.phase,'swipe');g.tick(16);eq(s.texts.at(-1),'Swipe again to change direction.');
eq(g.swipe({x:-1,y:0},80),true);eq(g.phase,'free');
eq(g.tick(16),false);eq(s.circles.at(-1),[100,200]);
g.destroy();g.destroy();eq(g.done,true);eq(s._lastPointerTapAt,0);eq(s.cameras.main.zoom,1);
const interrupted=fixture(),intro=createMobileTutorialGuide(interrupted,1);
intro.tick(100);intro.destroy();eq(interrupted.cameras.main.zoom,1);eq(interrupted.cameras.main.scrollX,0);
eq(interrupted.cameras.main.useBounds,true);
const bags=fixture(),b=createMobileTutorialGuide(bags,2);
eq(b.tick(16),true);eq(b.phase,'bagsIntro');
// "These are the bags. One is real; one is bunk." is ten words. It used to be
// pulled after 1800ms; nobody reads ten words that fast, so the reveal now
// waits on the copy's own reading time and is still up well past that point.
for(let i=0;i<18;i++)b.tick(100);
eq(b.phase,'bagsIntro');
eq(bags.texts.at(-1),'These are the bags. One is real; one is bunk.');
for(let i=0;i<26;i++)b.tick(100);
eq(b.phase,'bagsReveal');eq(bags.cameras.main.zoom>1,true);
for(let i=0;i<7;i++)b.tick(100);
eq(b.waitingSwipe,true);eq(bags.cameras.main.zoom,1);eq(bags.cameras.main.useBounds,true);
eq(b.swipe({x:1,y:0},80),true);eq(b.phase,'stash');
b.tick(16);eq(bags.circles.slice(-2),[[40,50],[60,70]]);
bags.bunkStash=null;const ringsBefore=bags.circles.length;b.tick(16);
eq(bags.texts.at(-1),'Bunk bags disappear. Pick up the other bag.');eq(bags.circles.length,ringsBefore+1);eq(bags.circles.at(-1),[40,50]);
bags.hasPackage=true;b.tick(16);eq(bags.circles.at(-1),[100,200]);
bags._carDeparting=true;const beforeDeparture=bags.circles.length;eq(b.tick(16),false);eq(bags.circles.length,beforeDeparture);eq(bags.texts.at(-1),'');b.destroy();
const powers=fixture(),p=createMobileTutorialGuide(powers,3);
eq(p.waitingSwipe,true);p.tick(16);eq(powers.runnerPowersConsumed,[false,false]);
eq(p.swipe({x:0,y:1},80),true);eq(p.phase,'power');
p.tick(16);eq(powers.playerDrift,null);
eq(powers.texts.includes('Lift your finger. You keep moving.'),false);
eq(powers.texts.some(t=>t.includes('Double-tap anywhere to use dash')),true);eq(powers.texts.at(-1),'TAP · TAP');
// Same rule as the swipe prompt: it asks for an action, so it leaves when the
// player acts and not before, however long they take to get there.
for(let i=0;i<80;i++)p.tick(100);
eq(p.phase,'power');eq(powers.runnerPowersConsumed,[false,false]);
p.tick(16);eq(powers.texts.some(t=>t.includes('Double-tap anywhere to use dash')),true);
powers.runnerPowersConsumed[0]=true;p.tick(16);eq(powers.texts.some(t=>t.includes('Double-tap anywhere to use decoy')),true);
powers.runnerPowersConsumed[1]=true;powers.playerDrift={x:1,y:0};p.tick(16);
eq(powers.playerDrift,{x:1,y:0});eq(powers.texts.at(-1),'Both powers used. Find the real stash, then escape.');
powers._transitioning=true;p.tick(16);eq(powers.texts.at(-1),'');
p.destroy();
const finalScene=fixture(),finalGuide=createMobileTutorialGuide(finalScene,4);
eq(finalGuide.tick(16),true);eq(finalGuide.waitingSwipe,true);
eq(finalGuide.swipe({x:1,y:0},80),true);eq(finalGuide.tick(16),false);eq(finalScene.texts.at(-1),'');finalGuide.destroy();
const desktop=fixture(),keys=createMobileTutorialGuide(desktop,1,{desktop:true});
eq(keys.blocksKeys,true);
for(let i=0;i<36;i++)keys.tick(100);
eq(keys.waitingSwipe,true);eq(keys.blocksKeys,false);eq(keys.blocksGestures,true);
keys.tick(16);eq(desktop.texts.at(-1),'Use the arrow keys or WASD to move.');
eq(desktop.rectangles.length>=4,true);
eq(keys.key({x:1,y:0}),true);eq(keys.phase,'swipe');
keys.tick(16);eq(desktop.texts.at(-1),'Press a different arrow key to turn.');
eq(keys.key({x:1,y:0}),false);eq(keys.phase,'swipe');
eq(keys.key({x:0,y:-1}),true);eq(keys.phase,'free');keys.destroy();
const desktopBags=fixture(),bagKeys=createMobileTutorialGuide(desktopBags,2,{desktop:true});
for(let i=0;i<52;i++)bagKeys.tick(100);
eq(bagKeys.waitingSwipe,true);eq(bagKeys.key({x:0,y:1}),true);eq(bagKeys.phase,'stash');bagKeys.destroy();
const desktopPowers=fixture(),powerKeys=createMobileTutorialGuide(desktopPowers,3,{desktop:true});
powerKeys.tick(16);eq(powerKeys.key({x:1,y:0}),true);powerKeys.tick(16);
eq(desktopPowers.texts.some(t=>t.includes('Click to use dash')),true);powerKeys.destroy();
// Execute the actual stage-two pickup branch with both possible first contacts.
const sceneText=readFileSync(new URL('../src/scenes/TutorialMiniScene.js',import.meta.url),'utf8');
const clearBody=sceneText.split('    if (idx === 1) {')[1].split('    this.grid = arena.grid;')[0];
const arena={grid:Array.from({length:8},()=>Array(6).fill(1))};
new Function('arena','T',clearBody.slice(0,clearBody.lastIndexOf('}'))).call({cols:6,rows:8},arena,{FLOOR:0});
eq(arena.grid.slice(1,-1).every(row=>row.slice(1,-1).every(tile=>tile===0)),true);
eq(arena.grid[0].every(tile=>tile===1),true);
eq(sceneText.includes('filtered[(rnd() * filtered.length) | 0]'),true);
const branch=sceneText.split("} else if (this.stageIdx === 2){")[1].split("} else if (this.stageIdx === 3)")[0];
const pickup=new Function(branch);
function pickupFixture(first){
 const bag=id=>({id,x:1,y:2,setVisible(){},destroy(){this.active=false;}});
 const state={stash:bag('A'),bunkStash:bag('B'),hasPackage:false,sounds:[],bunks:0,
  runner:{},overlaps(_r,t){return t===this.touch;},addCarry(){},audio:{},
  toast(){},showBunkPopup(){this.bunks++;},tweens:{add(){}},
  showCarBeacon(){},setCarLights(){}};
 state.audio.play=k=>state.sounds.push(k);state.touch=first==='real'?state.stash:state.bunkStash;
 pickup.call(state);
 eq(state.hasPackage,false);eq(state.bunkStash,null);eq(state.sounds,['bpickup']);eq(state.bunks,1);
 state.touch=state.stash;pickup.call(state);
 eq(state.hasPackage,true);eq(state.sounds,['bpickup','pickup','spickup']);
}
pickupFixture('real');pickupFixture('bunk');
// Exercise the real loadout callback, not the generic modal callback.
const pickerBody=sceneText.split('  showPowerSelectionModal(){')[1].split('// Shelved plug-mode UI')[0].trim().replace(/}$/, '');
let finish;
const openPicker=new Function('showRunnerLoadout','GameUI',pickerBody);
for(const desktop of [false,true]){
 const state={gameUI:{},sys:{game:{device:{os:{desktop}}}},stageIdx:3,startMobileGuide(n){this.started=n;}};
 openPicker.call(state,(_ui,onDone)=>{finish=onDone;return {};},class {});
 eq(state.pausedForModal,true);finish();eq(state.pausedForModal,false);
 eq(state.started,3);eq(state._ignoreNextPowerClick,true);
}
eq(sceneText.includes('Grab the stash. Lose the Plug. Make it to the car.'),false);
eq(sceneText.includes('Next stop: The Window. Meet Auntie Ro, join a crew'),true);
console.log('mobileTutorialGuide:',checks,'assertions passed');
