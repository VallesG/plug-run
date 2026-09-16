import { ironRowJob } from '../src/logic/ironRowSeason.js';
import { crewStoryProgress, createContactProgress } from '../src/logic/contactProgress.js';
import { readFileSync } from 'node:fs';
import { missionExitAllowed, placeMissionItem, placeRequiredMissionItem, missionItemSeed, missionObject, MISSION_ITEM_COLOR } from '../src/logic/missionItem.js';
import { activeMissionContact, CONTACT_TARGET_HOUSE } from '../src/logic/contacts.js';
let passed = 0;
function check(name, ok) { if (!ok) throw Error(name); passed++; }

for (const tookItem of [false, true]) for (const hasStash of [false, true]) {
  check('job requires both pickups ' + tookItem + '/' + hasStash,
    missionExitAllowed({ mode: 'pve', runKind: 'journey', role: 'runner', required: true, tookItem, hasStash }) === (tookItem && hasStash));
}
for (const scope of [{runKind:'rivals'}, {runKind:'daily'}, {runKind:'tutorial'}, {role:'plug'}, {mode:'pvp'}, {required:false}]) {
  check('unrelated mode/house unchanged ' + JSON.stringify(scope), missionExitAllowed({
    mode:'pve',runKind:'journey',role:'runner',required:true,tookItem:false,hasStash:true,...scope }));
}
const closet = [[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,1,1,1]];
const options = { grid: closet, spawn: {x:1,y:1}, stash:{x:2,y:2}, seed:9 };
const before = JSON.stringify(closet);
check('normal placement says tiny room has no separated cell', placeMissionItem(options) === null);
const fallback = placeRequiredMissionItem(options);
check('required tiny-room placement uses valid reachable spawn', fallback.x===1 && fallback.y===1 && closet[fallback.y][fallback.x]===0);
check('fallback is read-only and deterministic', JSON.stringify(closet)===before && JSON.stringify(fallback)===JSON.stringify(placeRequiredMissionItem(options)));
check('invalid spawn never invents a cell', placeRequiredMissionItem({grid:closet,spawn:{x:0,y:0}})===null);
check('missing grid returns null', placeRequiredMissionItem()===null);

const progression = readFileSync(new URL('../src/controllers/ProgressionManager.js',import.meta.url),'utf8')
  .replace(/^import[\s\S]*?;\s*/gm,'').replace('export default class','class');
const stop = new Error('stop after first extraction mutation');
let finalized=0;
const Manager = new Function('missionExitAllowed','ReplaySystem',progression+'\nreturn ProgressionManager;')(
  missionExitAllowed,{finalize(){finalized++;throw stop;}});
for (const contactID of ['mags','rook','sol']) {
  let hints=0;
  const scene={mode:'pve',runKind:'journey',role:'runner',roundOver:false,
    requiresMissionItem:true,missionObject:missionObject(contactID),hasMissionItem:false,hasStash:true,
    pveRound:9,pveSessionStash:8,pveSessionRep:90,showMissionExitHint:()=>hints++};
  const manager=new Manager(scene), count=finalized;
  check('car denies stash-only ' + contactID, await manager.startExtractionSequence()===false);
  check('denial leaves round and checkpoint intact ' + contactID,
    !scene.roundOver && scene.pveRound===9 && scene.pveSessionStash===8 && scene.pveSessionRep===90 && finalized===count);
  check('denial tells player what is missing ' + contactID,hints===1);
  scene.hasMissionItem=true;scene.hasStash=false;
  check('item alone cannot leave ' + contactID,await manager.startExtractionSequence()===false && !scene.roundOver);
  scene.hasStash=true;
  let entered=false;
  try{await manager.startExtractionSequence();}catch(error){entered=error===stop;}
  check('both pickups enter the real extraction path ' + contactID,entered && scene.roundOver && finalized===count+1);
}
let rivalClears=0;
await new Manager({runKind:'rivals',requiresMissionItem:true,hasMissionItem:false,
  rivals:{clearHouse:()=>rivalClears++}}).startExtractionSequence();
check('Rivals delegates without new requirement',rivalClears===1);

// Test the actual update seam: a denied exit must not return before combat/
// forensics checks later in the frame, otherwise standing at the car is safe.
const source = readFileSync(new URL('../src/scenes/BaseGameScene.js',import.meta.url),'utf8');
const begin=source.indexOf('    // extract win '),end=source.indexOf('    this.forensics?.tick(this);',begin);
const extraction = new Function('overlaps',source.slice(begin,end)+'\nthis.afterExitCheck=true;');
for (const dual of [false,true]) {
  let starts=0,hints=0;
  const scene={roundOver:false,hasStash:true,attacker:{},extract:{},
    ...(dual?{attacker2:{},stashCarrier:{active:true,hp:100}}:{}),
    canLeaveMissionHouse:()=>false,startExtractionSequence:()=>starts++,showMissionExitHint:()=>hints++};
  extraction.call(scene,()=>true);
  check('blocked car continues the frame ' + dual,scene.afterExitCheck && starts===0 && hints===1);
  scene.canLeaveMissionHouse=()=>true;scene.afterExitCheck=false;
  extraction.call(scene,()=>true);
  check('ready car starts extraction normally ' + dual,starts===1 && !scene.afterExitCheck);
}

// Actual placement/pickup methods, not a separate simulated mission model.
const start=source.indexOf('  makeMissionItem(){'),finish=source.indexOf('  addCarryPackage(){',start);
let gangID='crossline', overlap=true;
const inputs={ironRowJob, crewStoryProgress, getContactProgress:()=>createContactProgress(), placeRequiredMissionItem,missionItemSeed,missionObject,MISSION_ITEM_COLOR,
  activeMissionContact,getWindowState:()=>({gangID}),PALETTE:{ink:0x080b0d},
  rectsOverlap:()=>overlap,performance:{now:()=>1000},console:{warn(){}}};
const Host = new Function(...Object.keys(inputs),'class Host {\n'+source.slice(start,finish)+'\n}\nreturn Host;')(...Object.values(inputs));
for (const gang of ['crossline','iron-row','afterlight']) {
  gangID=gang;
  const host=new Host(),nodes=[],sounds=[],tweens=[];
  const make=(kind,args)=>{
    const target={kind,args,x:args[0]||0,y:args[1]||0,active:true,visible:true,alpha:1,
      destroy(){this.active=false;}};
    const proxy=new Proxy(target,{get:(o,k)=>k in o?o[k]:()=>proxy});
    nodes.push(proxy);return proxy;
  };
  Object.assign(host,{mode:'pve',runKind:'journey',role:'runner',pveRound:CONTACT_TARGET_HOUSE,
    blockIndex:1,seed:7,cell:20,grid:closet,runnerSpawnCell:{x:1,y:1},
    stashCell:{x:2,y:2},extractCell:{x:2,y:1},egress:{entry:{x:2,y:1}},
    toWorldX:x=>x*20,toWorldY:y=>y*20,attacker:{active:true,visible:true},
    hasStash:false,pveSessionStash:8,roundOver:false,roundPausedForMenu:true,
    add:new Proxy({},{get:(_,kind)=>(...args)=>make(kind,args)}),
    tweens:{add:config=>tweens.push(config)},audio:{playMissionItemPickup:id=>sounds.push(id)},
    scale:{gameSize:{width:390,height:844}},cameras:{main:{centerX:195,centerY:422}},
    time:{now:1000},showCarBeacon(){}});
  host.makeMissionItem();
  const cell=JSON.stringify(host.missionCell),object=host.missionObject;
  check('required item exists even in tight room ' + gang,host.requiresMissionItem && host.missionItem);
  host.checkMissionItemPickup();
  check('menu cannot collect job item ' + gang,!host.hasMissionItem && sounds.length===0);
  host.roundPausedForMenu=false;overlap=false;host.checkMissionItemPickup();
  check('distance alone never collects item ' + gang,!host.hasMissionItem);
  overlap=true;host.checkMissionItemPickup();host.checkMissionItemPickup();
  check('pickup is once-only with item-specific sound ' + gang,host.hasMissionItem && sounds.join(',')===object.id);
  check('pickup never creates stash ' + gang,!host.hasStash && host.pveSessionStash===8);
  check('pickup shows confirmation and violet pulse ' + gang,
    nodes.some(n=>n.kind==='text'&&n.args[2]===object.short+' COLLECTED') && nodes.some(n=>n.kind==='circle'));
  for(const tween of tweens.splice(0))tween.onComplete?.();
  check('collected floor case disappears ' + gang,host.missionItem===null);
  host.makeMissionItem();
  check('retry resets pickup and preserves placement ' + gang,!host.hasMissionItem && JSON.stringify(host.missionCell)===cell);
  host.showMissionExitHint();host.showMissionExitHint();
  check('car reminder is throttled ' + gang,nodes.filter(n=>n.kind==='text'&&String(n.args[2]).includes('REQUIRED')).length===1);
}
console.log(passed+' mission exit assertions passed');
