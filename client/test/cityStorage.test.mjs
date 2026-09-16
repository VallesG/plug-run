// Real storage adapter, account isolation, retention and denied-storage fallback.
import { readFileSync } from 'node:fs';
import { createCityState, beginCityBlock, claimCityBlock } from '../src/logic/city.js';
let passed=0;
function check(name,ok){if(!ok)throw Error(name);passed++;}
const source=readFileSync(new URL('../src/utils/cityProgress.js',import.meta.url),'utf8')
 .replace(/^import[\s\S]*?;\s*/gm,'').replace(/export /g,'');
let user='a',deny=false;
const storage=new Map(),writes=[];
const localStorage={getItem:key=>{if(deny)throw Error('denied');return storage.get(key)||null;},
 setItem:(key,value)=>{if(deny)throw Error('denied');storage.set(key,value);writes.push(key);}};
const api=new Function('createCityState','beginCityBlock','claimCityBlock','getUserID','localStorage','console',
 source+'\nreturn {getCityProgress,startCityBlock,completeCityBlock};')(
 createCityState,beginCityBlock,claimCityBlock,()=>user,localStorage,{warn(){}});
const event=blockIndex=>({blockIndex,gangID:'afterlight',mode:'pve',runKind:'journey',role:'runner',clearedHouses:15,hasStash:true});
check('empty user starts empty',api.getCityProgress().completedThrough===0);
check('legacy migrates without owner',api.getCityProgress({blockIndex:8}).completedThrough===7&&Object.keys(api.getCityProgress({blockIndex:8}).owners).length===0);
check('start freezes crew',api.startCityBlock({blockIndex:1},'iron-row')==='iron-row');
check('restart keeps crew',api.startCityBlock({blockIndex:1},'crossline')==='iron-row');
check('complete retains actual crew',api.completeCityBlock(event(1)).state.owners[1]==='iron-row');
const count=writes.length;
check('duplicate does not write',!api.completeCityBlock(event(1)).applied&&writes.length===count);
check('only own key',writes.every(key=>key==='pr_city_v1_a'));
user='b';
check('account isolation',api.getCityProgress().completedThrough===0);
deny=true;
api.startCityBlock({blockIndex:1},'afterlight');
check('denied storage remembers crew this session',api.startCityBlock({blockIndex:1},'crossline')==='afterlight');
check('denied storage clear still applied',api.completeCityBlock(event(1)).applied);
check('denied storage duplicate blocked',!api.completeCityBlock(event(1)).applied);
user='a';
check('volatile account isolation',api.getCityProgress().completedThrough===0);
deny=false;
check('persisted first user retained',api.getCityProgress().owners[1]==='iron-row');
user='b';
check('volatile survives permission recovery',api.getCityProgress().owners[1]==='afterlight');
for(let block=2;block<=250;block++){api.startCityBlock({blockIndex:block},'crossline');check('retained clear '+block,api.completeCityBlock(event(block)).applied);}
const restored=JSON.parse(storage.get('pr_city_v1_b'));
check('no history/balance-style truncation',Object.keys(restored.owners).length===250&&restored.owners[1]==='afterlight');
check('round trip',api.getCityProgress().completedThrough===250);
storage.set('pr_city_v1_b','{garbage');
check('corruption safe',api.getCityProgress().completedThrough===0);
storage.set('pr_city_v1_b',JSON.stringify({version:999,completedThrough:100}));
check('unsupported version safe',api.getCityProgress().completedThrough===0);
console.log('city storage: '+passed+' assertions passed');
