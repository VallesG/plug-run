import {
  RIVAL_HOUSES, RIVAL_RULES_VERSION, RIVAL_HUD_HEIGHT, rivalHudLayout, rivalHouseFill, rivalPickupWindows, rivalCarryingAt, rivalFloorClock, rivalCourse, validRivalPowers,
  rivalPixels, rivalElapsed, rivalProgress, rivalOutcome, recordRivalClear, rivalTimeLabel,
  rivalPathSteps, simulatedRivalTimes, newRivalRace, compatibleRivalRecord, rivalRecord
} from '../src/logic/rivals.js';

let passed=0;
function check(name,value) { if(!value) throw new Error(name); passed++; }
const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const course=rivalCourse(12345), splits=[10000,21000,32000,43000,54000,65000,76000];
check('seven-house sprint',RIVAL_HOUSES===7 && course.seeds.length===7);
check('course identity versioned',course.id.startsWith(RIVAL_RULES_VERSION));
check('identical course on rematch',same(course,rivalCourse(12345)));
check('different race has different maps',!same(course.seeds,rivalCourse(12346).seeds));
check('house seeds unique in sample',new Set(course.seeds).size===7);
check('same fixed grid as gameplay',course.cols===16 && course.rows===35);
check('early difficulty curve explicit',same(course.scales,[0.6,0.75,0.9,0.95,1,1,1]));
check('HUD overlays instead of shrinking the arena',RIVAL_HUD_HEIGHT===0);
for (const [w,h] of [[280,480],[390,844],[1024,768]]) {
  const hud=rivalHudLayout(w,h);
  check('HUD has seven vertical steps at '+w,hud.segmentYs.length===7 && hud.segmentYs.every(Number.isFinite));
  check('HUD rails stay on opposite edges at '+w,hud.leftX<30 && hud.rightX>w-30);
  check('HUD steps stay on screen at '+w,Math.min(...hud.segmentYs)-hud.segmentH/2>=0 && Math.max(...hud.segmentYs)+hud.segmentH/2<=h);
}
check('duplicate powers valid',validRivalPowers(['phase','phase']));
check('unknown power invalid',!validRivalPowers(['phase','teleport']));
check('exactly two powers',!validRivalPowers(['dash']) && !validRivalPowers([]));

let race=newRivalRace(course,splits);
check('clears copied',race.rivalTimes!==splits && same(race.rivalTimes,splits));
check('opponent explicitly simulated',race.opponentKind==='simulated-ai');
check('clock stopped before GO',rivalElapsed(race,90000)===0);
check('no pre-race clears',recordRivalClear(race,1,1000)===race);
race={...race,status:'racing',startedAt:3000,powers:['phase','dash']};
check('clock starts at GO',rivalElapsed(race,5000)===2000);
check('clock never negative',rivalElapsed(race,1000)===0);
check('wall time includes background',rivalElapsed(race,93000)===90000);
check('no progress before first clear',rivalProgress(splits,9999)===0);
check('progress at exact clear timestamp',rivalProgress(splits,10000)===1);
check('skipped frames catch up',rivalProgress(splits,54001)===5);
check('opponent ends at seven',rivalProgress(splits,999999)===7);
check('no premature result',rivalOutcome([],splits,75999)===null);
check('opponent finish resolves loss',rivalOutcome([],splits,76000)==='loss');
check('player wins earlier',rivalOutcome([1,2,3,4,5,6,75000],splits,75000)==='win');
check('exact finish tie',rivalOutcome(splits,splits,76000)==='draw');
check('late player cannot win',rivalOutcome([1,2,3,4,5,6,77000],splits,77000)==='loss');
check('unfinished equal counts are not a draw',rivalOutcome(splits.slice(0,6),splits.slice(0,6),999999)===null);
check('no skipped house',recordRivalClear(race,2,5000)===race);
check('invalid times rejected',[NaN,Infinity,-1,0].every(t=>recordRivalClear(race,1,t)===race));
const first=recordRivalClear(race,1,8000);
check('clear immutable',race.clearTimes.length===0 && first.clearTimes.length===1);
check('duplicate clear ignored',recordRivalClear(first,1,9000)===first);
check('out-of-order time ignored',recordRivalClear(first,2,7000)===first);
check('no record for partial race',rivalRecord(first)===null);
for(let house=1;house<=7;house++) race=recordRivalClear(race,house,house*9000);
check('seven timestamps saved',race.clearTimes.length===7);
check('no eighth house',recordRivalClear(race,8,80000)===race);
const record=rivalRecord(race);
check('record includes actual finish',record.elapsedMs===63000);
check('client record not claimed verified',record.source==='local-player' && record.verified===false);
check('same course and powers compatible',compatibleRivalRecord(record,course,['phase','dash']));
check('wrong powers rejected',!compatibleRivalRecord(record,course,['dash','phase']));
check('wrong course rejected',!compatibleRivalRecord(record,rivalCourse(456),race.powers));
check('old rules rejected',!compatibleRivalRecord({...record,version:'old'},course,race.powers));
check('changed seed rejected',!compatibleRivalRecord({...record,seeds:[1,2,3,4,5,6,7]},course,race.powers));
check('malformed splits rejected',!compatibleRivalRecord({...record,clearTimes:[1,2,3,4,5,5,7]},course,race.powers));
check('wrong total rejected',!compatibleRivalRecord({...record,elapsedMs:63001},course,race.powers));
check('record arrays copied',record.clearTimes!==race.clearTimes && record.powers!==race.powers);
check('readable elapsed clock',rivalTimeLabel(91450)==='1:31.4');
check('zero clock safe',rivalTimeLabel(NaN)==='0:00.0');

const grid=[
  [1,1,1,1,1],
  [1,0,1,0,1],
  [1,0,0,0,1],
  [1,0,1,0,1],
  [1,1,1,1,1]
];
check('path respects wall detour',rivalPathSteps(grid,{x:1,y:1},{x:3,y:1})===4);
check('same cell zero steps',rivalPathSteps(grid,{x:1,y:1},{x:1,y:1})===0);
check('blocked goal unreachable',rivalPathSteps(grid,{x:1,y:1},{x:2,y:1})===Infinity);
check('out of bounds rejected',rivalPathSteps(grid,{x:-1,y:1},{x:3,y:1})===Infinity);
const metrics=Array.from({length:7},()=>({searchSteps:30,carrySteps:20}));
const pace=simulatedRivalTimes(metrics,12345);
check('pace fixed before player races',same(pace,simulatedRivalTimes(metrics,12345)));
check('pace strictly cumulative',pace.every((t,i)=>t>(pace[i-1]??0)));
check('pace responds to course distances',simulatedRivalTimes(metrics.map(m=>({...m,searchSteps:100})),12345).at(-1)>pace.at(-1));
let threw=false;try{simulatedRivalTimes([{searchSteps:Infinity,carrySteps:1}],1);}catch{threw=true;}
check('invalid metrics rejected',threw);
for(const bad of [[],[1,2,3,4,5,6,NaN],[1,2,3,4,5,6,6]]){
  threw=false;try{newRivalRace(course,bad);}catch{threw=true;}
  check('invalid opponent timeline rejected '+String(bad),threw);
}
for(const cell of [11,21,24,36]){
  check('speed cell-invariant '+cell,Math.abs(rivalPixels(300,cell)/cell-300/24)<1e-10);
  check('range cell-invariant '+cell,Math.abs(rivalPixels(280,cell)/cell-280/24)<1e-10);
}

for (const [w,h] of [[280,480],[390,844],[1024,768]]) {
  const ys=rivalHudLayout(w,h).segmentYs;
  check('progress advances downward at '+w,ys.every((y,i)=>i===0 || y>ys[i-1]));
}
check('stash is half of the current house',same(rivalHouseFill(2,true),[1,1,.5,0,0,0,0]));
check('bunk or death earns no half step',same(rivalHouseFill(2,false),[1,1,0,0,0,0,0]));
check('all clears cap the bar',same(rivalHouseFill(7,true),[1,1,1,1,1,1,1]));
const windows=rivalPickupWindows({segments:[
  {house:1,startedMs:0,durationMs:3000,replay:{events:[{t:200,k:'bunk'},{t:1000,k:'pickup'},{t:2500,k:'death'}]}},
  {house:1,startedMs:3650,durationMs:4000,replay:{events:[{t:2000,k:'pickup'},{t:4000,k:'extract'}]}},
  {house:2,startedMs:7830,durationMs:1000,replay:{events:[{t:200,k:'bunk'}]}}
]});
check('pickup windows follow real events and end at death',same(windows,[{house:1,start:1000,end:2500},{house:1,start:5650,end:7650}]));
check('no progress before pickup',!rivalCarryingAt(windows,0,999));
check('half step begins at pickup',rivalCarryingAt(windows,0,1000));
check('half step ends at death',!rivalCarryingAt(windows,0,2500));
check('retry gap has no half step',!rivalCarryingAt(windows,0,4000));
check('second pickup lights half again',rivalCarryingAt(windows,0,5650));
check('past-house pickup cannot light next house',!rivalCarryingAt(windows,1,6000));
check('missing replay never invents a pickup',!rivalCarryingAt(null,0,5000) && rivalPickupWindows(null).length===0);

const floor=Array.from({length:12},()=>Array(16).fill(1));
for(let y=5;y<7;y++) for(let x=3;x<8;x++) floor[y][x]=0;
const before=JSON.stringify(floor), clock=rivalFloorClock(floor);
check('floor clock occupies the actual open patch',clock?.x===5.5 && clock?.y===6);
check('clock placement never mutates collision grid',JSON.stringify(floor)===before);
check('solid grid has no clock footprint',rivalFloorClock([[1,1,1],[1,1,1],[1,1,1]])===null);
check('missing grid is safe',rivalFloorClock(null)===null);
// The rival finishing first decides nothing on its own: the player plays it
// out, and the result settles with their seventh clear.
{
  const r = await import('../src/logic/rivals.js');
  check('no result while the player has houses left',r.rivalFinalOutcome([1,2,3,4,5,6],splits)===null);
  check('a seventh clear before the rival wins',r.rivalFinalOutcome([1,2,3,4,5,6,75000],splits)==='win');
  check('a seventh clear after the rival is a loss',r.rivalFinalOutcome([1,2,3,4,5,6,90000],splits)==='loss');
  check('the same millisecond is a draw',r.rivalFinalOutcome(splits,splits)==='draw');
  check('the rival is home at its last clear',!r.rivalHasFinished(splits,75999)&&r.rivalHasFinished(splits,76000));
  // Settings sits above the player rail, never over floor a runner can use.
  for (const [W,H] of [[320,568],[360,640],[390,844],[414,896],[430,932],[768,1024],[844,390],[1280,720]]) {
    const hud=r.rivalHudLayout(W,H), a=r.rivalArenaLayout(W,H,16,35), g=r.rivalSettingsSpot(hud,a.pad,a.cell);
    check('settings off the floor '+W+'x'+H,g.x+g.r<=a.pad.x+a.cell&&g.x-g.r>=0&&g.y-g.r>=0);
    check('settings above the rail label '+W+'x'+H,g.y+g.r<hud.startY-30);
    check('settings has a thumb-sized target '+W+'x'+H,g.hit.w>=28&&g.hit.h>=38);
  }
}
console.log(passed+' rivals assertions passed');
