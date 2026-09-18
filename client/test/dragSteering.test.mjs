// Execute actual touch controller without Phaser or browser dependencies.
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/controllers/PlayerController.js',import.meta.url),'utf8').replace(/^import[^\n]*\n/g,'').replace('export default class','class');
const assertions=(()=>{
let now = 1000, assertions = 0;
const check = (ok, name) => { if (!ok) throw Error(name); assertions++; };
const equalDir = (a,b) => Math.abs(a.x-b.x)<1e-9 && Math.abs(a.y-b.y)<1e-9;
const Player = new Function('performance','corridorAssist', source + '\nreturn PlayerController;')({now:()=>now},()=>{});
function make(role='runner') {
  let powers=0, shots=0;
  const scene={role,attacker:{},runnerPowersConsumed:[],intent:{recordMove(){},recordGun(){}},
    activateRunnerPowerByIndex(){powers++;},combatSystem:{tryMouseFire(){shots++;}}};
  return {pc:new Player(scene),scene,actions:()=>powers+shots,powers:()=>powers,shots:()=>shots};
}
for (const role of ['runner','plug']) {
 for (const duration of [100,500]) {
  for (const [dx,dy] of [[80,80],[-80,80],[80,-80],[-80,-80],[50,20]]) {
   const {pc,actions}=make(role);
   const p={id:1,x:100,y:100,isDown:true};
   pc.beginSwipe(p);now+=duration;pc.updateSwipe({...p,x:100+dx,y:100+dy});
   check(pc._dragMoveActive,'drag commits');
   const dir={...pc.playerDrift};
   check(Math.abs(Math.hypot(dir.x,dir.y)-1)<1e-9,'drag speed normalized');
   pc.endSwipe({...p,x:100+dx,y:100+dy,isDown:false});
   check(equalDir(pc.playerDrift,dir),'release keeps drag direction');
   check(equalDir(pc.playerIntendedDir,dir),'intended direction matches drag');
   check(pc._swipePid===null && !pc._dragMoveActive && !pc._aimDragActive,'release clears gesture');
   check(actions()===0,'drag release cannot activate power or fire');
   pc.endSwipe({...p,x:100+dx,y:100+dy,isDown:false});
   check(equalDir(pc.playerDrift,dir),'duplicate release is inert');
  }
 }
 const {pc,actions}=make(role),p={id:2,x:100,y:100,isDown:true};
 pc.beginSwipe(p);now+=100;pc.updateSwipe({...p,x:180,y:180});
 const dir={...pc.playerDrift};
 pc.endSwipe({...p,id:3,isDown:false});
 check(pc._swipePid===2,'unrelated release keeps active finger');
 // Finger returns onto the floating origin: release must not become a tap.
 const end={...p,x:pc._swipeStart.x,y:pc._swipeStart.y};
 pc.updateSwipe(end);pc.endSwipe({...end,isDown:false});
 check(equalDir(pc.playerDrift,dir) && actions()===0,'dead-zone release retains direction without tapping');
}
for (const [dx,dy] of [[24,0],[0,24],[-24,0],[0,-24]]) {
 const {pc}=make(),p={id:4,x:100,y:100,isDown:true};
 pc.beginSwipe(p);now+=50;pc.endSwipe({...p,x:100+dx,y:100+dy,isDown:false});
 check(equalDir(pc.playerDrift,{x:Math.sign(dx),y:Math.sign(dy)}),'uncommitted flick remains cardinal');
}
const tap=make(),p={id:5,x:100,y:100,isDown:true};
tap.pc.beginSwipe(p);now+=30;tap.pc.endSwipe({...p,isDown:false});
now+=100;tap.pc.beginSwipe(p);now+=30;tap.pc.endSwipe({...p,isDown:false});
check(tap.powers()===1,'genuine double tap still spends power');
const cancelled=make();
cancelled.pc.beginSwipe(p);now+=200;cancelled.pc.updateSwipe({...p,x:180,y:180});
const before={...cancelled.pc.playerDrift};cancelled.scene.roundPausedForMenu=true;
cancelled.pc.endSwipe({...p,isDown:false});
check(cancelled.pc._swipePid===null && equalDir(cancelled.pc.playerDrift,before),'modal cancellation preserves steering');

for (const role of ['runner','plug']) {
 const {pc}=make(role),p={id:6,x:100,y:100,isDown:true};
 pc.beginSwipe(p);now+=100;pc.updateSwipe({...p,x:180,y:180});
 const origin={...pc._swipeStart};
 pc.updateSwipe({...p,x:origin.x,y:origin.y+56});
 const turn={...pc.playerDrift};
 check(equalDir(turn,{x:0,y:1}),'held drag turns from diagonal to down');
 pc.endSwipe({...p,x:origin.x,y:origin.y+56,isDown:false});
 check(equalDir(pc.playerDrift,turn),'release retains last turn instead of original heading');
}


{
 const {pc}=make(),p={id:8,x:100,y:100,isDown:true};
 pc.beginSwipe(p);now+=200;
 const steer=degrees=>{
  const a=degrees*Math.PI/180,origin={...pc._swipeStart};
  const next={...p,x:origin.x+50*Math.cos(a),y:origin.y+50*Math.sin(a)};
  pc.updateSwipe(next);return next;
 };
 steer(20);check(equalDir(pc.playerDrift,{x:1,y:0}),'actual drag favors cardinal for angled flick');
 steer(26);check(equalDir(pc.playerDrift,{x:1,y:0}),'actual drag holds cardinal against jitter');
 steer(35);check(equalDir(pc.playerDrift,{x:Math.SQRT1_2,y:Math.SQRT1_2}),'actual deliberate diagonal escapes cardinal');
 const last=steer(29),dir={...pc.playerDrift};
 check(equalDir(dir,{x:Math.SQRT1_2,y:Math.SQRT1_2}),'actual diagonal holds against jitter');
 pc.endSwipe({...last,isDown:false});
 check(equalDir(pc.playerDrift,dir),'sticky diagonal survives release');
}

for (const axis of [0,90,180,-90]) {
 const {pc}=make();
 const vector = degrees => {const a=degrees*Math.PI/180;return pc.runnerDragDirection(56*Math.cos(a),56*Math.sin(a));};
 const expected={x:Math.round(Math.cos(axis*Math.PI/180)),y:Math.round(Math.sin(axis*Math.PI/180))};
 check(equalDir(vector(axis+20),expected),'near-axis drag gets cardinal preference');
 check(equalDir(vector(axis+26),expected),'cardinal holds through small angular jitter');
 const diagonal=vector(axis+35);
 check(!equalDir(diagonal,expected),'clear diagonal escapes cardinal preference');
 check(equalDir(vector(axis+29),diagonal),'diagonal resists small boundary jitter');
 check(equalDir(vector(axis+20),expected),'intentional return to cardinal works');
 pc.beginSwipe({id:9,x:100,y:100,isDown:true});
 check(pc._runnerDragSnap===null,'new gesture clears snap history');
 pc.runnerDragDirection(56,0);pc.resetTouchGestures();
 check(pc._runnerDragSnap===null,'modal reset clears snap history');
}
return assertions;
})();
console.log('drag steering: '+assertions+' assertions passed');
