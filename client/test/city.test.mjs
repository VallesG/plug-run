import {
  CITY_BLOCKS, CITY_HOUSES, cityForBlock, cityIdentity, createCityState,
  beginCityBlock, claimCityBlock, cityView, shouldShowCity, cityMapLayout
} from '../src/logic/city.js';
import { worldHouseSeed, advanceJourney, worldBlock } from '../src/logic/worldBlocks.js';
let passed = 0;
function check(name, ok) { if (!ok) throw new Error(name); passed++; }
const complete = (state, blockIndex, gangID = 'crossline') => claimCityBlock(state, {
  blockIndex, gangID, mode: 'pve', runKind: 'journey', role: 'runner', clearedHouses: 15, hasStash: true
});
check('finite city cap', CITY_BLOCKS === 10 && CITY_HOUSES === 15);
for (const [block, city] of [[1,1],[10,1],[11,2],[20,2],[21,3],[61,7],[1000,100]]) {
  const c = cityForBlock(block);
  check('city grouping '+block, c.number === city && block >= c.firstBlock && block <= c.lastBlock);
  check('identity permanent '+block, JSON.stringify(c) === JSON.stringify(cityIdentity(city)));
}
for (const bad of [null, {}, '10', NaN, Infinity, -1, 0, 1.5]) {
  check('invalid block is first city', cityForBlock(bad).number === 1);
  check('invalid state is safe', createCityState(bad).completedThrough === 0);
}
const legacy = createCityState({}, { blockIndex: 24, pveRound: 6 });
check('legacy frontier retained', legacy.completedThrough === 23);
check('legacy ownership is unknown', Object.keys(legacy.owners).length === 0);
check('migration never invents a gang', cityView(legacy, { blockIndex: 24, pveRound: 6 }, 1).blocks.every(b=>b.status==='cleared'&&b.owner===null));
check('legacy city and stash progress', cityView(legacy,{blockIndex:24,pveRound:6}).stashes===50);
check('future city clamps to unlocked', cityView(legacy,{blockIndex:24},999).city.number===3);
check('partial progress cannot open next city', cityView({}, {blockIndex:10,pveRound:15}).unlockedCity===1);
const original = createCityState();
const assigned = beginCityBlock(original, 1, 'iron-row');
check('crew frozen at block entry', assigned.gangID === 'iron-row');
check('changed selection cannot rewrite active crew', beginCityBlock(assigned.state,1,'afterlight').gangID==='iron-row');
check('entry does not claim', assigned.state.completedThrough === 0 && Object.keys(assigned.state.owners).length===0);
const won = complete(assigned.state,1,'afterlight');
check('claim uses frozen owner', won.applied&&won.state.owners[1]==='iron-row');
check('input never mutates', original.completedThrough===0&&Object.keys(original.owners).length===0);
check('duplicate claim cannot change owner', !complete(won.state,1,'crossline').applied&&complete(won.state,1,'crossline').state.owners[1]==='iron-row');
check('cannot skip block', !complete(original,10).applied);
for(const patch of [{mode:'pvp'},{runKind:'rivals'},{runKind:'daily'},{role:'plug'},{clearedHouses:14},{clearedHouses:1},{hasStash:false},{hasStash:undefined}]) {
 const result=claimCityBlock(original,{blockIndex:1,gangID:'crossline',mode:'pve',runKind:'journey',role:'runner',clearedHouses:15,hasStash:true,...patch});
 check('nonfinal/excluded claim refused '+JSON.stringify(patch),!result.applied&&result.state.completedThrough===0);
}
check('bad owners filtered',Object.keys(createCityState({completedThrough:2,owners:{1:'crossline',2:'fake',3:'afterlight',evil:'iron-row'}}).owners).length===1);
let state=createCityState(), checkpoint={blockIndex:1,pveRound:1};
const seeds=[];
for(let block=1;block<=250;block++){
 const id=['crossline','iron-row','afterlight'][(block-1)%3];
 const before=worldHouseSeed(block,9,'runner'); seeds.push(before);
 state=beginCityBlock(state,block,id,checkpoint).state;
 const result=complete(state,block,id);
 check('sequential claim '+block,result.applied);
 state=result.state;
 checkpoint=advanceJourney({blockIndex:block,pveRound:15});
 check('unchanged global checkpoint '+block,checkpoint.blockIndex===block+1&&checkpoint.pveRound===1);
 check('unchanged seed identity '+block,before===worldHouseSeed(block,9,'runner')&&worldBlock(block).number===block);
 const view=cityView(state,checkpoint,cityForBlock(block).number);
 check('claimed city stash count '+block,view.stashes===((block-1)%10+1)*15);
 check('unlock boundary '+block,view.unlockedCity===Math.floor(block/10)+1);
}
check('no 200-entry owner truncation',Object.keys(state.owners).length===250&&state.owners[1]==='crossline'&&state.owners[250]==='crossline');
check('JSON preserves all claims',JSON.stringify(createCityState(JSON.parse(JSON.stringify(state))))===JSON.stringify(state));
check('old completed claim remains duplicate',!complete(state,1,'afterlight').applied);
for(const dims of [[248,200],[248,150],[358,550],[1200,650],[0,0]]){
 const a=cityMapLayout({x:16,y:110,width:dims[0],height:dims[1]});
 check('ten connected nodes',a.nodes.length===10);
 check('finite layout '+dims,[a.x,a.y,a.scale,...a.nodes.flatMap(n=>[n.x,n.y,n.w,n.h])].every(Number.isFinite));
 check('map fits '+dims,a.width*a.scale<=dims[0]+1e-9&&a.height*a.scale<=dims[1]+1e-9);
 check('nodes within map',a.nodes.every(n=>n.x-n.w/2>=0&&n.x+n.w/2<=a.width&&n.y-n.h/2>=0&&n.y+n.h/2<=a.height));
}
check('menu entry shows city',shouldShowCity({mode:'pve',runKind:'journey',role:'runner',menuEntry:true}));
check('explicit resize/entry shows city',shouldShowCity({mode:'pve',runKind:'journey',role:'runner',requested:true}));
check('ordinary house does not show city',!shouldShowCity({mode:'pve',runKind:'journey',role:'runner'}));
for(const patch of [{mode:'pvp'},{runKind:'rivals'},{runKind:'daily'},{role:'plug'}])
 check('other modes never show city',!shouldShowCity({mode:'pve',runKind:'journey',role:'runner',menuEntry:true,...patch}));
console.log('city: '+passed+' assertions passed');
