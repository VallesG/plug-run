// New visual decisions stay pure. These checks protect routes, determinism,
// repeated charges and phone fit, rather than snapshotting drawing calls.
import { planInterior } from '../src/logic/interior.js';
import { choosePower, loadoutLayout } from '../src/logic/powerSelection.js';
let passed=0;const failures=[];
const check=(name,ok)=>{if(ok){passed++;console.log('  ok  '+name);}else{failures.push(name);console.log('  FAIL '+name);}};
const grid=(w,h,cells=[])=>{
  const g=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>(x===0||y===0||x===w-1||y===h-1)?1:0));
  for(const [x,y]of cells)g[y][x]=1;return g;
};
const g=grid(16,35,[
  [3,3],[4,3],[5,3],[6,3],
  [10,3],[11,3],[10,4],[11,4],
  [3,8],[4,8],
  [8,10],[11,10],
  [2,17],[3,17],[2,18]
]);
const snapshot=JSON.stringify(g),props=planInterior(g,456);
check('planning never edits the collision grid',JSON.stringify(g)===snapshot);
check('same grid and seed give the same props',JSON.stringify(props)===JSON.stringify(planInterior(g,456)));
check('sofa covers a four-cell straight component',props.some(p=>p.type==='sofa'&&p.w===4&&p.h===1));
check('table requires a filled rectangle',props.some(p=>p.type==='table'&&p.w===2&&p.h===2));
check('L shaped wall stays architecture',!props.some(p=>p.cells.some(([x,y])=>x===2&&y===17)));
check('every decorated coordinate is an existing wall',props.every(p=>p.cells.every(([x,y])=>g[y][x]===1)));
check('no decorated footprint contains a floor hole',props.every(p=>p.cells.length===p.w*p.h));
check('furniture does not overlap',new Set(props.flatMap(p=>p.cells.map(c=>c.join(',')))).size===props.reduce((n,p)=>n+p.cells.length,0));
check('props never use border cells',props.every(p=>p.cells.every(([x,y])=>x>0&&x<15&&y>0&&y<34)));
check('one of each prop keeps clutter bounded',props.length===5&&new Set(props.map(p=>p.type)).size===props.length);
check('variant is in the supported palette',props.every(p=>p.variant>=0&&p.variant<3));
check('vertical sofa retains its occupied footprint',planInterior(grid(10,12,[[3,3],[3,4],[3,5]]),1).some(p=>p.type==='sofa'&&p.w===1&&p.h===3));
check('wall connected to perimeter stays a wall',planInterior(grid(10,10,[[3,1],[3,2],[3,3]]),1).length===0);
check('empty floor gives no props',planInterior(grid(10,10),1).length===0);
check('empty grid is accepted',planInterior([],1).length===0);
let choice=[];
choice=choosePower(choice,'phase');
check('first tap chooses first charge',choice.join(',')==='phase');
choice=choosePower(choice,'phase');
check('same power may occupy both charges',choice.join(',')==='phase,phase');
choice=choosePower(choice,'phase');
check('third repeated tap removes last charge',choice.join(',')==='phase');
choice=choosePower(choice,'dash');
check('mixed powers retain tap order',choice.join(',')==='phase,dash');
check('full loadout refuses a third unselected power',choosePower(choice,'decoy').join(',')==='phase,dash');
check('tapping selected power removes it from a full mixed loadout',choosePower(choice,'phase').join(',')==='dash');
check('selection reducer does not mutate its input',choice.join(',')==='phase,dash');
check('unknown power is ignored',choosePower(choice,'invalid').join(',')==='phase,dash');
for(const [w,h]of [[280,480],[350,480],[520,480],[280,350]]){
 const l=loadoutLayout(w,h);
 check('cards and actions fit '+w+'x'+h,l.cards.every(r=>r.x>=0&&r.y>=0&&r.x+r.w<=w&&r.y+r.h<l.slotsY-18)
   && l.slotsY+18<l.startY-22 && l.startY+22<l.navY-16 && l.navY+16<h);
}
console.log(passed+' passed, '+failures.length+' failed');
if(failures.length)process.exit(1);
