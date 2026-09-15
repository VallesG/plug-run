// Pure neighborhood geometry and reveal tests. Run through npm test.
import { layoutBlock, houseState, blockNoise, distanceToStreet, revealAt, buildFog } from '../src/logic/blockMap.js';
let passed=0;
const failures=[];
function check(name, condition) {
  if(condition) { passed++; console.log('  ok  '+name); }
  else { failures.push(name); console.log('  FAIL '+name); }
}
const block=layoutBlock({width:360,height:600,cleared:7});
check('exactly one property per daily map',block.houses.length===15);
check('cleared count drives seven illuminated properties',block.houses.filter(h=>h.state.endsWith('revealed')).length===7);
check('only the next destination is marked next',block.houses.filter(h=>h.state.endsWith('next')).map(h=>h.index).join(',')==='8');
check('future houses stay fogged',houseState(9,7,15)==='fogged');
check('finale retains the fog state',houseState(15,7,15)==='finale-fogged');
check('finale is next after fourteen clears',houseState(15,14,15)==='finale-next');
check('finished block has no next house',layoutBlock({width:300,height:500,cleared:15}).houses.every(h=>h.state.endsWith('revealed')));
check('negative progress clamps before choosing next',houseState(1,-9,15)==='next');
check('excess progress clamps to completion',layoutBlock({width:300,height:500,cleared:99}).cleared===15);
check('short blocks end at the correct finale',layoutBlock({maps:7,width:300,height:500,cleared:6}).houses[6].state==='finale-next');
check('streets form one unbroken route',block.streets.every((s,i)=>i===0 || (s.a.x===block.streets[i-1].b.x && s.a.y===block.streets[i-1].b.y)));
check('streets are orthogonal',block.streets.every(s=>s.a.x===s.b.x || s.a.y===s.b.y));
check('street distance projects to the segment',distanceToStreet(5,3,{x:0,y:0},{x:10,y:0})===3);
check('street distance clamps outside segment',distanceToStreet(13,4,{x:0,y:0},{x:10,y:0})===5);
check('zero length street has finite distance',distanceToStreet(3,4,{x:0,y:0},{x:0,y:0})===5);
check('marker sits at the end of cleared street',block.marker.x===block.houses[6].road.x && block.marker.y===block.houses[6].road.y);
check('fresh marker sits at the entrance',layoutBlock({width:360,height:600}).marker.y===214);
check('coordinate noise is stable',blockNoise(19,8,123)===blockNoise(19,8,123));
check('coordinate noise stays in range',Array.from({length:100},(_,i)=>blockNoise(i,i*7,42)).every(n=>n>=0&&n<1));
const fog=buildFog(block,20260915);
check('fog covers every world tile once',fog.length===11000 && new Set(fog.map(t=>t.x+','+t.y)).size===11000);
check('fresh block is entirely black',fog.every(t=>t.unlock>0));
check('untouched parcels stay black after completion',fog.some(t=>t.unlock===Infinity));
check('first clear reveals only a small patch',fog.filter(t=>t.unlock<=1).length<11000*0.12);
check('new clears add geography every time',Array.from({length:15},(_,i)=>fog.some(t=>t.unlock===i+1)).every(Boolean));
check('house roofs are visible by their own clear',block.houses.every(h=>[
  [h.x-h.w/2,h.y-h.h/2],[h.x+h.w/2,h.y-h.h/2],
  [h.x-h.w/2,h.y+h.h/2],[h.x+h.w/2,h.y+h.h/2]
].every(([x,y])=>revealAt(x,y,block,20260915)<=h.index)));
check('all cleared street centerlines are visible',block.streets.every(s=>
  Array.from({length:25},(_,i)=>i/24).every(t=>revealAt(
    s.a.x+(s.b.x-s.a.x)*t,s.a.y+(s.b.y-s.a.y)*t,block,20260915)<=s.index)));
const small=layoutBlock({width:272,height:320,cleared:7,x0:13,y0:29});
const large=layoutBlock({width:900,height:600,cleared:7});
check('resizing preserves every house and street',JSON.stringify(small.houses)===JSON.stringify(large.houses) && JSON.stringify(small.streets)===JSON.stringify(large.streets));
check('fit keeps uniform scale and stays within viewport',small.x>=13 && small.y>=29 && small.x+small.w<=285.00001 && small.y+small.h<=349.00001 && Math.abs(small.w/small.h-200/220)<1e-9);
check('zero space gives zero drawing scale',layoutBlock({width:0,height:0}).scale===0);
// Four-connected flood fill proves that the reveal masks have no disconnected
// islands, including where bends meet property-sized pools of light.
let connected=true;
for(let progress=1;progress<=15;progress++) {
  const open=new Set(fog.map((t,i)=>t.unlock<=progress?i:-1).filter(i=>i>=0));
  const first=open.values().next().value, queue=[first], seen=new Set(queue);
  for(let cursor=0;cursor<queue.length;cursor++) {
    const p=queue[cursor], x=p%100, y=Math.floor(p/100);
    for(const q of [x>0?p-1:-1,x<99?p+1:-1,y>0?p-100:-1,y<109?p+100:-1]) {
      if(open.has(q)&&!seen.has(q)) { seen.add(q);queue.push(q); }
    }
  }
  if(seen.size!==open.size) connected=false;
}
check('every progress state reveals one connected neighborhood',connected);
console.log(passed+' passed, '+failures.length+' failed');
if(failures.length) process.exit(1);
