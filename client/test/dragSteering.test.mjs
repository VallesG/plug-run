// Execute actual touch controller without Phaser or browser dependencies.
import {readFileSync} from 'node:fs';
import {runnerDragVector,runnerDragStep} from '../src/logic/runnerSteering.js';
import {resolveGridMovement} from '../src/logic/gridMovement.js';
const source=readFileSync(new URL('../src/controllers/PlayerController.js',import.meta.url),'utf8').replace(/^import[\s\S]*?;\s*/gm,'').replace('export default class','class');
const assertions=(()=>{
let now = 1000, assertions = 0;
const check = (ok, name) => { if (!ok) throw Error(name); assertions++; };
const equalDir = (a,b) => Math.abs(a.x-b.x)<1e-9 && Math.abs(a.y-b.y)<1e-9;
const Player = new Function('performance','corridorAssist','runnerDragVector','runnerDragStep','resolveGridMovement', source + '\nreturn PlayerController;')({now:()=>now},()=>{},runnerDragVector,runnerDragStep,resolveGridMovement);
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

// Actual bug: turning a corner sent the runner diagonal instead of turning.
// The floating anchor trails MOVE_MAX_PX behind along the OLD heading, so
// after a square turn the anchor sits 56px off to the side and the
// anchor->finger vector stays diagonal until the new direction finally
// outweighs it. Measured on the pre-fix controller: 81px of sideways travel
// before it read as a clean cardinal, 50px of it steering diagonally.
for (const [name,turn] of [['square',(i)=>[200+i,480]],
  ['sloppy',(i)=>[200+i*Math.cos(-20*Math.PI/180),480+i*Math.sin(-20*Math.PI/180)]]]) {
 const {pc}=make(),p={id:20,x:200,y:600,isDown:true};
 pc.beginSwipe(p);now+=200; // past DRAG_COMMIT_MS, so the drag is committed
 const move=(x,y)=>{now+=16;pc.updateSwipe({...p,x,y});};
 for (let i=3;i<=120;i+=3) move(200,600-i); // run up the corridor
 check(equalDir(pc.playerDrift,{x:0,y:-1}),'corner fixture is running up before the '+name+' turn');
 let sideways=null; const diagonals=[];
 for (let i=3;i<=150;i+=3){
  move(...turn(i));
  const v=pc.playerDrift;
  if (Math.abs(Math.abs(v.x)-Math.SQRT1_2)<1e-9 && Math.abs(Math.abs(v.y)-Math.SQRT1_2)<1e-9) diagonals.push(i);
  if (v.x===1 && v.y===0 && sideways===null) sideways=i;
 }
 check(sideways!==null && sideways<=30,'a '+name+' corner turn registers within 30px of sideways travel');
 check(diagonals.length===0,'a '+name+' corner turn never detours through a diagonal');
}
// Easing the finger back toward the anchor is "let off", not "reverse": a
// returning thumb must keep the direction rather than flip to the opposite.
{
 const {pc}=make(),p={id:21,x:200,y:600,isDown:true};
 pc.beginSwipe(p);now+=200;
 const move=(x,y)=>{now+=16;pc.updateSwipe({...p,x,y});};
 for (let i=3;i<=120;i+=3) move(200+i,600);
 check(equalDir(pc.playerDrift,{x:1,y:0}),'ease-off fixture is running right');
 for (let i=3;i<=50;i+=3) move(320-i,600);
 check(equalDir(pc.playerDrift,{x:1,y:0}),'easing back toward the anchor keeps the heading');
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

// Actual bug: a held cardinal survives jitter up to 28 degrees (hold band),
// but escaping that hold used to fall through to the much tighter FRESH
// bands (22 / ~15 degrees). A smooth, continuous 1-degree-per-step drag with
// no new gesture at all -- no release, no direction flick, just ordinary
// thumb drift -- crossed straight from 28 degrees (held cardinal) to 29
// degrees and reported an arbitrary half-diagonal (0.875, 0.485) that is
// neither the cardinal nor a clean diagonal: exactly "nudges the runner into
// diagonal movement without a new steering gesture." Escaping a hold must
// land in the CONTIGUOUS adjacent snap, never the gap between the fresh
// bands (that gap is legitimate and stays intact for a brand-new gesture,
// checked separately below).
for (const axis of [0,90,180,-90]) {
 const {pc}=make();
 const vector = degrees => {const a=(axis+degrees)*Math.PI/180;return pc.runnerDragDirection(56*Math.cos(a),56*Math.sin(a));};
 const isCardinalOrDiagonal = v => {
  const onCardinal = (Math.abs(v.x)===1 && v.y===0) || (v.x===0 && Math.abs(v.y)===1);
  const onDiagonal = Math.abs(Math.abs(v.x)-Math.SQRT1_2)<1e-9 && Math.abs(Math.abs(v.y)-Math.SQRT1_2)<1e-9;
  return onCardinal || onDiagonal;
 };
 for (let deg=0; deg<=28; deg++) check(equalDir(vector(deg),{x:Math.round(Math.cos(axis*Math.PI/180)),y:Math.round(Math.sin(axis*Math.PI/180))}),
   'continuous drift holds cardinal through '+deg+' degrees at axis '+axis);
 // The hold just broke by a single extra degree of ordinary drift -- no
 // release and no new gesture -- so the result must still be a clean
 // snapped direction, never an arbitrary unsnapped angle.
 const justBroke = vector(29);
 check(isCardinalOrDiagonal(justBroke), 'leaving a cardinal hold via continuous drift lands on a snap, not a raw angle, at axis '+axis);
 check(!equalDir(justBroke,{x:Math.round(Math.cos(axis*Math.PI/180)),y:Math.round(Math.sin(axis*Math.PI/180))}),
   'the broken hold genuinely left cardinal at axis '+axis);
}
// A brand-new gesture (no prior hold to preserve) keeps its documented free
// angle in the same 22-30 degree gap -- only the "coming from a hold"
// transition changed.
{
 const {pc}=make();
 const a=27*Math.PI/180;
 const fresh=pc.runnerDragDirection(56*Math.cos(a),56*Math.sin(a));
 const onCardinal=(Math.abs(fresh.x)===1&&fresh.y===0)||(fresh.x===0&&Math.abs(fresh.y)===1);
 const onDiagonal=Math.abs(Math.abs(fresh.x)-Math.SQRT1_2)<1e-9&&Math.abs(Math.abs(fresh.y)-Math.SQRT1_2)<1e-9;
 check(!onCardinal && !onDiagonal, 'fresh gesture free-angle gap is unchanged');
 check(equalDir(fresh,{x:Math.cos(a),y:Math.sin(a)}), 'fresh gesture in the gap still tracks the raw angle exactly');
}
return assertions;
})();
console.log('drag steering: '+assertions+' assertions passed');
