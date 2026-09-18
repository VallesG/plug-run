import assert from 'node:assert/strict';
import { createMobileTutorialGuide } from '../src/controllers/MobileTutorialGuide.js';
let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
function fixture(){
 const texts=[];const circles=[];
 const item=()=>({setDepth(){return this;},setScrollFactor(){return this;},setOrigin(){return this;},add(){},destroy(){this.destroyed=true;},setText(t){texts.push(t);}});
 const graphics=()=>Object.assign(item(),{clear(){},lineStyle(){},strokeCircle(x,y){circles.push([x,y]);},fillStyle(){},fillCircle(){},lineBetween(){}});
 return {texts,circles,scale:{width:390,height:844},cell:24,add:{container:item,graphics,rectangle:item,text:item},
 pickSafeInitialDirection:()=>({x:1,y:0}),canMoveTo:()=>true,handleMovement(){this.moves=(this.moves||0)+1;},
 runner:{x:24,y:24},car:{x:100,y:200},stash:{x:40,y:50},bunkStash:{x:60,y:70,active:true},
 runnerPowersSelected:['dash','decoy'],runnerPowersConsumed:[false,false]};
}
const s=fixture(),g=createMobileTutorialGuide(s,1);
eq(g.blocksGestures,true);eq(g.tick(100),true);
for(let i=0;i<7;i++)g.tick(100);
eq(g.waitingSwipe,true);eq(s.playerDrift,null);
eq(g.swipe(g.direction,10),false);
eq(g.swipe({x:9,y:9},80),false);
eq(g.swipe(g.direction,80),true);eq(g.phase,'coast');
for(let i=0;i<5;i++)g.tick(100);
eq(g.waitingSwipe,true);eq(g.swipe(g.direction,80),true);eq(g.phase,'free');
eq(g.tick(16),false);eq(s.circles.at(-1),[100,200]);
g.destroy();g.destroy();eq(g.done,true);eq(s._lastPointerTapAt,0);
const bags=fixture(),b=createMobileTutorialGuide(bags,2);
b.tick(16);eq(bags.circles.slice(-2),[[40,50],[60,70]]);
bags.bunkStash.active=false;b.tick(16);eq(bags.texts.at(-1),'Bunk disappears. Find the other bag.');
bags.hasPackage=true;b.tick(16);eq(bags.circles.at(-1),[100,200]);b.destroy();
const powers=fixture(),p=createMobileTutorialGuide(powers,3);
p.tick(16);eq(powers.playerDrift,null);eq(powers.texts.at(-1).includes('Try: dash'),true);
p.tick(16);eq(powers.runnerPowersConsumed,[false,false]);
powers.runnerPowersConsumed[0]=true;p.tick(16);eq(powers.texts.at(-1).includes('One more: decoy'),true);
powers.runnerPowersConsumed[1]=true;powers.playerDrift={x:1,y:0};p.tick(16);
eq(powers.playerDrift,{x:1,y:0});eq(powers.texts.at(-1),'Both used! Find the real stash, then escape.');
p.destroy();
console.log('mobileTutorialGuide:',checks,'assertions passed');
