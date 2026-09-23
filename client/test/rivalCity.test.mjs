import {readFileSync} from 'node:fs';
import {rivalTerritory,rivalDistrict,claimRivalDistrict,rivalCityName,RIVAL_CITY_NAMES} from '../src/logic/rivalCity.js';
import * as rules from '../src/logic/rivals.js';
import {rivalPoolCourse} from '../src/logic/rivals.js';
import {cityMapLayout,cityStreetDistance,cityBlockConnector} from '../src/logic/city.js';
let passed=0;const check=(n,ok)=>{if(!ok)throw Error(n);passed++;};
let state=rivalTerritory();
for(let index=1;index<=280;index++){
 const d=rivalDistrict(index),gangID=['crossline','iron-row','afterlight'][index%3];
 const event={index,courseSlot:d.slot,houses:7,result:'win',gangID};
 const before=JSON.stringify(state);
 for(const patch of [{result:'loss'},{result:'draw'},{result:'forfeit'},{houses:6},{recording:true},{index:index+1},{courseSlot:d.slot%7+1}]){
  const refused=claimRivalDistrict(state,{...event,...patch});
  check('invalid claim refused '+index,!refused.applied&&JSON.stringify(refused.state)===before);
 }
 const won=claimRivalDistrict(state,event);
 check('only full winning race advances '+index,won.applied&&won.state.completed===index);
 check('frozen crew owner '+index,won.state.owners[index]===gangID);
 check('source is immutable '+index,JSON.stringify(state)===before);
 state=won.state;
 check('duplicate never overwrites '+index,!claimRivalDistrict(state,{...event,gangID:'afterlight'}).applied);
 check('fixed pool course '+index,!!rivalPoolCourse(d.slot));
}
check('ownership survives beyond capped history',Object.keys(state.owners).length===280);
check('city boundary: city 2 races the next seven courses',rivalDistrict(8).city===2&&rivalDistrict(8).slot===8&&rivalDistrict(14).slot===14);
check('city 3 races courses 15-21',rivalDistrict(15).city===3&&rivalDistrict(15).slot===15&&rivalDistrict(21).slot===21);
check('the circuit wraps to course 1 after the last course',rivalDistrict(22).city===4&&rivalDistrict(22).slot===1);
check('every one of the 21 courses is some district',new Set(Array.from({length:rules.RIVAL_COURSE_POOL.length},(_,i)=>rivalDistrict(i+1).slot)).size===rules.RIVAL_COURSE_POOL.length);
check('each circuit city is named',rivalCityName(1)==='Riverside Circuit'&&rivalCityName(2)===RIVAL_CITY_NAMES[1]&&rivalCityName(3)===RIVAL_CITY_NAMES[2]&&rivalCityName(4)==='Riverside Circuit 2');
check('invalid state defaults',rivalTerritory({completed:-1}).completed===0);
check('bad crew never invented',!claimRivalDistrict({}, {index:1,courseSlot:1,houses:7,result:'win',gangID:'bogus'}).state.owners[1]);
const layout=cityMapLayout({width:760,height:920},'rivals');
check('seven distinct rival districts',layout.nodes.length===7);
check('rival geography is not story geography',JSON.stringify(layout.nodes)!==JSON.stringify(cityMapLayout({width:760,height:920}).nodes.slice(0,7)));
for(const node of layout.nodes)for(const mirror of [false,true]){
 const link=cityBlockConnector(node,mirror,'rivals');
 check('rival exit joins network',cityStreetDistance(...link[1],'rivals')<1e-8);
 for(let x=node.x-node.w/2+12;x<node.x+node.w/2-12;x+=12)
  for(let y=node.y-node.h/2+12;y<node.y+node.h/2-12;y+=12)
   check('rival streets do not cross playable parcels',cityStreetDistance(x,y,'rivals')>11);
}
const code=readFileSync(new URL('../src/utils/rivalCityProgress.js',import.meta.url),'utf8').replace(/^import[\s\S]*?;\s*/gm,'').replace(/\bexport /g,'');
let user='one',fail=false;const memory=new Map();
const api=new Function('rivalTerritory','rivalDistrict','claimRivalDistrict','rivalCityName','rivalPoolCourse','getUserID','localStorage','console',
 code+';return {getRivalTerritory,rivalCityView,completeRivalDistrict};')(
 rivalTerritory,rivalDistrict,claimRivalDistrict,rivalCityName,rivalPoolCourse,()=>user,
 {getItem:k=>memory.get(k)||null,setItem:(k,v)=>{if(fail)throw Error('quota');memory.set(k,v);}}, {warn(){}});
const race={territoryIndex:1,territoryUser:user,territoryGang:'iron-row',course:rivalPoolCourse(1),result:'win',clearTimes:Array(7).fill(1)};
check('local first win saved',api.completeRivalDistrict(race).applied);
check('local owner persisted',api.getRivalTerritory().owners[1]==='iron-row');
check('no capped results key writes',[...memory.keys()].join()==='pr_rival_city_v1_one');
check('next block unlocked only',api.rivalCityView().blocks.filter(b=>b.status==='current')[0].local===2);
check('recordings and course seeds untouched',api.rivalCityView().blocks.every((b,i)=>b.course.id===rivalPoolCourse(i+1).id));
check('city 2 shows its own seven courses',api.rivalCityView(9).city.number===2&&api.rivalCityView(9).city.name===rivalCityName(2)&&
  api.rivalCityView(9).blocks.map(b=>b.course.slot).join()==='8,9,10,11,12,13,14');
user='two';
check('accounts isolated',api.getRivalTerritory().completed===0);
check('old account race cannot write new account',!api.completeRivalDistrict(race).applied);
fail=true;
const temp=api.completeRivalDistrict({...race,territoryUser:user});
check('failed save is honest',temp.applied&&temp.saved===false&&api.getRivalTerritory().completed===1);
check('failed save cannot double claim',!api.completeRivalDistrict({...race,territoryUser:user}).applied);
console.log('Rivals city: '+passed+' assertions passed');

const session=readFileSync(new URL('../src/utils/rivalSession.js',import.meta.url),'utf8').replace(/^import[\s\S]*?;\s*/gm,'').replace(/^export /gm,'');

let territory={completed:3};
const args={...rules,rivalDistrict,getRivalTerritory:()=>territory,getWindowState:()=>({gangID:'crossline'}),
 getUserID:()=> 'runner',localStorage:{getItem:()=> '[]'},
 generateSquareMaze:()=>({grid:Array.from({length:35},()=>Array(16).fill(0)),
 spawns:{runner:{x:1,y:1}},objectives:{stash:{x:3,y:3},extract:{x:5,y:5}},egress:{entry:{x:1,y:1}}}),
 createSeededRNG:()=>()=>.25};
const create=new Function(...Object.keys(args),session+';return createRivalSession;')(...Object.values(args));
const normal=create();
check('random arena advances the current unlocked district',normal.course.slot>=1&&normal.course.slot<=rules.RIVAL_COURSE_POOL.length&&normal.territoryIndex===4&&normal.rivalCityIndex===4&&normal.territorySlot===4);
check('gang and account frozen at race creation',normal.territoryGang==='crossline'&&normal.territoryUser==='runner');
const rematch=create({seed:rules.rivalPoolCourse(3).seed});
check('explicit course rematch cannot advance current district',rematch.course.slot===3&&rematch.territoryIndex===null);
check('recording harness skips map and territory',create({recording:true}).rivalCityIndex===undefined);
check('fixed-power harness retains old course policy',create({powers:['phase','dash']}).rivalCityIndex===undefined);
territory={completed:7};
check('seven wins open next circuit city, on its own courses',create().territoryIndex===8&&create().territorySlot===8);
console.log('Rivals selection: '+passed+' total assertions passed');
