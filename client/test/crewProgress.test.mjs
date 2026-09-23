import { readFileSync } from 'node:fs';
import { windowGang } from '../src/logic/window.js';

let checks=0;
const check=(name,ok)=>{if(!ok)throw Error(name);checks++;};
const source=readFileSync(new URL('../src/utils/crewProgress.js',import.meta.url),'utf8')
  .replace(/^import[\s\S]*?;\s*/gm,'').replace(/^export /gm,'');
const values=new Map();
let deny=false,failKey=null,window={gangID:'crossline',onboardingComplete:true,credits:8,ledger:[{id:'earned'}]};
const user='crew-test';
const keys={journey:'pr_journey_v1_'+user,city:'pr_city_v1_'+user,
  contacts:'pr_contacts_v1_'+user,skill:'pr_skill_v1_'+user,blockrun:'pr_blockrun_v1_'+user};
const storage={
  getItem:k=>values.get(k)??null,
  setItem(k,v){if(deny)throw Error('denied');if(k===failKey){failKey=null;throw Error('one failed write');}values.set(k,v);},
  removeItem(k){if(deny)throw Error('denied');values.delete(k);}
};
const put=(field,value)=>storage.setItem(keys[field],JSON.stringify(value));
const read=field=>JSON.parse(storage.getItem(keys[field])||'null');
put('journey',{version:1,blockIndex:4,pveRound:7});
put('city',{version:1,completedThrough:3,owners:{1:'crossline',2:'crossline',3:'crossline'}});
put('contacts',{version:1,blocks:{3:['met-switch']},stories:{crossline:{chapter:3,lastBlock:3}}});
put('skill',{version:1,observations:[{block:3}]});
put('blockrun',{version:1,blockIndex:4,deaths:2});
const api=new Function('getUserID','getWindowState','saveWindowState','getJourneyProgress',
  'getCityProgress','clearCityProgressCache','getContactProgress','clearContactProgressCache',
  'getSkillEvidence','windowGang','localStorage','console',
  source+'\nreturn {switchCrewStory};')(
  ()=>user,()=>window,v=>(window=v,true),()=>read('journey'),()=>read('city'),()=>{},
  ()=>read('contacts'),()=>{},()=>read('skill'),windowGang,storage,{warn(){}}
);
check('cannot choose the same gang',!api.switchCrewStory('crossline').applied);
check('cannot choose an unknown gang',!api.switchCrewStory('fake').applied);
let result=api.switchCrewStory('afterlight');
check('new gang begins fresh',result.applied&&!result.restored&&window.gangID==='afterlight'&&
  Object.values(keys).every(k=>storage.getItem(k)===null));
check('global credits stay put',window.credits===8&&window.ledger.length===1);
put('journey',{version:1,blockIndex:2,pveRound:3});
put('city',{version:1,completedThrough:1,owners:{1:'afterlight'}});
result=api.switchCrewStory('crossline');
check('returning restores prior block and contacts',result.applied&&result.restored&&
  read('journey').blockIndex===4&&read('journey').pveRound===7&&
  read('contacts').stories.crossline.chapter===3&&read('city').owners[3]==='crossline');
check('other progress also returns',read('blockrun').deaths===2&&read('skill').observations[0].block===3);
result=api.switchCrewStory('afterlight');
check('switching back restores the new gang too',result.applied&&result.restored&&
  read('journey').blockIndex===2&&read('city').owners[1]==='afterlight');
const before=read('journey');
deny=true;result=api.switchCrewStory('iron-row');deny=false;
check('storage failure leaves gang and story unchanged',!result.applied&&window.gangID==='afterlight'&&
  JSON.stringify(read('journey'))===JSON.stringify(before));
failKey=keys.city;result=api.switchCrewStory('crossline');
check('partial write rolls back the active story',!result.applied&&window.gangID==='afterlight'&&
  JSON.stringify(read('journey'))===JSON.stringify(before)&&read('city').owners[1]==='afterlight');
values.set('pr_crew_saves_v1_'+user,'{broken');
result=api.switchCrewStory('iron-row');
check('unreadable archive never wipes progress',!result.applied&&window.gangID==='afterlight'&&read('journey').blockIndex===2);
console.log('crew progress: '+checks+' assertions passed');
