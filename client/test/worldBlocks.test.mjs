import { worldBlock, worldHouseSeed, journeyCheckpoint, advanceJourney } from '../src/logic/worldBlocks.js';
import { layoutBlock } from '../src/logic/blockMap.js';
let passed = 0;
function check(name, value) { if (!value) throw new Error(name); passed++; }
for (const index of [1, 4, 5, 9, 13, 16, 17, 1000, 1000000]) {
  const b = worldBlock(index);
  check('permanent identity ' + index, JSON.stringify(b) === JSON.stringify(worldBlock(index)));
  check('named numbered district ' + index, b.number === index && b.name && b.district && b.label.includes(String(index)));
  const seeds = Array.from({length:15}, (_,i) => worldHouseSeed(index,i+1));
  check('distinct house seeds ' + index, new Set(seeds).size === 15);
  check('role separation ' + index, seeds[0] !== worldHouseSeed(index,1,'plug'));
}
check('district chapters', new Set([1,5,9,13].map(i=>worldBlock(i).district)).size===4);
check('numbers disambiguate repeated names',worldBlock(1).label!==worldBlock(17).label);
check('invalid checkpoint safe',journeyCheckpoint(null).pveRound===1 && journeyCheckpoint({blockIndex:NaN}).blockIndex===1);
check('checkpoint caps houses',journeyCheckpoint({pveRound:20}).pveRound===15);
const saved=journeyCheckpoint({blockIndex:7,pveRound:8,pveSessionRep:200,runId:'test',swapSpawnCycle:2,retryAfterDeath:true});
check('resume retains run and spawn',saved.runId==='test' && saved.swapSpawnCycle===2 && saved.retryAfterDeath);
const next=advanceJourney(saved);
check('clear advances only house',next.blockIndex===7 && next.pveRound===9 && next.pveSessionRep===200);
check('clear resets retry and swap',next.swapSpawnCycle===0 && !next.retryAfterDeath);
const completed=advanceJourney({...saved,pveRound:15});
check('finale advances block',completed.blockIndex===8 && completed.pveRound===1);
check('new block resets difficulty and rewards',completed.pveSessionRep===0 && completed.pveCleanStreak===0 && completed.runId===undefined);
for (const cleared of [0,1,7,14,15]) {
  const b=layoutBlock({width:390,height:600,cleared,entering:true});
  check('entrance reveals ready house '+cleared,b.visibleThrough===Math.min(15,cleared+1));
  check('ready is not cleared '+cleared,b.cleared===cleared && b.houses.filter(h=>h.state.endsWith('revealed')).length===cleared);
  check('marker points to entrance '+cleared,b.marker===b.houses[b.visibleThrough-1].road);
}
const normal=layoutBlock({width:390,height:600,cleared:3});
const mirrored=layoutBlock({width:390,height:600,cleared:3,layoutSeed:1});
check('daily geography unchanged',normal.houses[0].road.x===32 && normal.visibleThrough===3);
check('world mirror changes geography',mirrored.houses[0].road.x===168 && mirrored.houses[0].side===1);
check('mirrored roads connected',mirrored.streets.every((s,i)=>!i || s.a===mirrored.streets[i-1].b));
console.log(passed + ' world/entrance assertions passed');
