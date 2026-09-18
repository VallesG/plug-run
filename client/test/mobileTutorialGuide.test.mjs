import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { createMobileTutorialGuide } from '../src/controllers/MobileTutorialGuide.js';
let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
function fixture(){
 const texts=[],circles=[],rectangles=[];
 const item=()=>({setDepth(){return this;},setScrollFactor(){return this;},setOrigin(){return this;},setScale(){return this;},setPosition(x,y){this.x=x;this.y=y;return this;},add(){},destroy(){this.destroyed=true;},setText(t){texts.push(t);}});
 const graphics=()=>Object.assign(item(),{clear(){},lineStyle(){},strokeCircle(x,y){circles.push([x,y]);},fillStyle(){},fillCircle(){},fillRect(...r){rectangles.push(r);},lineBetween(){}});
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
for(let i=0;i<12;i++)g.tick(100);
eq(g.phase,'reveal');
for(let i=0;i<7;i++)g.tick(100);
eq(g.waitingSwipe,true);eq(s.playerDrift,null);eq(s.cameras.main.zoom,1);
eq(s.cameras.main.scrollX,0);eq(s.cameras.main.scrollY,0);
eq(s.cameras.main.useBounds,true);
g.tick(16);eq(s.texts.at(-1),'Swipe right to move.\nYou can swipe anywhere on the screen.');
for(let i=0;i<100;i++)g.tick(100);
eq(g.waitingSwipe,true);
eq(g.swipe({x:1,y:0},10),false);eq(g.swipe({x:9,y:9},80),false);
eq(g.swipe({x:0,y:-1},80),false);eq(g.swipe({x:1,y:0},80),true);eq(g.phase,'coast');
for(let i=0;i<7;i++)g.tick(100);
eq(g.waitingSwipe,true);g.tick(16);eq(s.texts.at(-1),'Now swipe down to turn.');
eq(g.swipe({x:-1,y:0},80),false);eq(g.swipe({x:0,y:1},80),true);eq(g.phase,'free');
eq(g.tick(16),false);eq(s.circles.at(-1),[100,200]);
g.destroy();g.destroy();eq(g.done,true);eq(s._lastPointerTapAt,0);eq(s.cameras.main.zoom,1);
const interrupted=fixture(),intro=createMobileTutorialGuide(interrupted,1);
intro.tick(100);intro.destroy();eq(interrupted.cameras.main.zoom,1);eq(interrupted.cameras.main.scrollX,0);
eq(interrupted.cameras.main.useBounds,true);
const bags=fixture(),b=createMobileTutorialGuide(bags,2);
eq(b.tick(16),true);eq(b.phase,'bagsIntro');
for(let i=0;i<14;i++)b.tick(100);
b.tick(16);eq(bags.circles.slice(-2),[[40,50],[60,70]]);
bags.bunkStash.active=false;b.tick(16);eq(bags.texts.at(-1),'Bunk bags disappear. Touch the other bag.');
bags.hasPackage=true;b.tick(16);eq(bags.circles.at(-1),[100,200]);b.destroy();
const powers=fixture(),p=createMobileTutorialGuide(powers,3);
p.tick(16);eq(powers.playerDrift,null);eq(powers.texts.at(-1).includes('Double-tap anywhere to use dash'),true);
p.tick(16);eq(powers.runnerPowersConsumed,[false,false]);
powers.runnerPowersConsumed[0]=true;p.tick(16);eq(powers.texts.at(-1).includes('Double-tap anywhere to use decoy'),true);
powers.runnerPowersConsumed[1]=true;powers.playerDrift={x:1,y:0};p.tick(16);
eq(powers.playerDrift,{x:1,y:0});eq(powers.texts.at(-1),'Both powers used. Find the real stash, then escape.');
powers._transitioning=true;p.tick(16);eq(powers.texts.at(-1),'');
p.destroy();
// Execute the actual stage-two pickup branch with both possible first contacts.
const sceneText=readFileSync(new URL('../src/scenes/TutorialMiniScene.js',import.meta.url),'utf8');
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
console.log('mobileTutorialGuide:',checks,'assertions passed');
