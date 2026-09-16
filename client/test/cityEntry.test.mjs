// Exercise actual BaseGameScene.init without importing Phaser.
import { readFileSync } from 'node:fs';
import { shouldShowCity, createCityState, beginCityBlock } from '../src/logic/city.js';
import { worldBlock, worldHouseSeed, advanceJourney } from '../src/logic/worldBlocks.js';
let passed=0;
function check(name,ok){if(!ok)throw Error(name);passed++;}
const source=readFileSync(new URL('../src/scenes/BaseGameScene.js',import.meta.url),'utf8');
const start=source.indexOf('  init(data) {'),end=source.indexOf('  // world/grid helpers',start);
check('real init seam found',start>=0&&end>start);
let stored={blockIndex:24,pveRound:6,pveSessionStash:5,pveSessionRep:20},owner='iron-row',atlas=createCityState(),starts=0;
const stub=class{};
const bindings={BaseGameScene:{GRID_COLS:16,GRID_ROWS:35},
 PlayerController:stub,AIController:stub,CombatSystem:stub,VisualEffects:stub,GameUI:stub,ProgressionManager:stub,InputIntent:stub,
 localStorage:{getItem:()=>null},console:{log(){}},shouldShowCity,worldBlock,worldHouseSeed,advanceJourney,
 getJourneyProgress:()=>stored,getSessionState:()=>null,getCurrentUser:()=>({username:'test',isGuest:true}),
 getWindowState:()=>({gangID:owner}),startCityBlock:(checkpoint,id)=>{starts++;const result=beginCityBlock(atlas,checkpoint.blockIndex,id,checkpoint);atlas=result.state;return result.gangID;},
 getCurrentRouteID:()=>1,getRouteSeed:()=>123,createSeededRNG:()=>()=>.5,cleanupOldRoutes:()=>{},
 createRivalSession:()=>({clearTimes:[],course:{id:'test',seeds:[999],scales:[.6]}})};
const Host=new Function(...Object.keys(bindings),'class Host { '+source.slice(start,end)+' } return Host;')(...Object.values(bindings));
function init(data){const host=new Host();host.scene={settings:{data:{}},key:'RUNNER'};host.init(data);return host;}
const entry=init({mode:'pve',role:'runner',runKind:'journey'});
check('menu resume adopts old checkpoint',entry.blockIndex===24&&entry.pveRound===6&&entry.pveSessionStash===5);
check('menu resume shows city first',entry._showCityOnEntry);
check('menu resume retains exact house seed',entry.seed===worldHouseSeed(24,6,'runner'));
check('entry freezes crew',entry.blockGangID==='iron-row'&&atlas.active.gangID==='iron-row');
owner='afterlight';
const retry=init({mode:'pve',role:'runner',runKind:'journey',blockIndex:24,pveRound:6,retryAfterDeath:true});
check('retry keeps frozen crew',retry.blockGangID==='iron-row');
check('retry no extra city',!retry._showCityOnEntry&&retry.retryAfterDeath);
const resized=init({mode:'pve',role:'runner',runKind:'journey',blockIndex:24,pveRound:6,showCityMap:true});
check('city resize preserves entry presentation',resized._showCityOnEntry&&resized.seed===entry.seed);
const count=starts;
const rivals=init({mode:'pve',role:'runner',runKind:'rivals'});
check('rivals no city/crew writes',!rivals._showCityOnEntry&&starts===count&&rivals.seed===999);
const daily=init({mode:'pve',role:'runner',runKind:'daily'});
check('daily no city/crew writes',!daily._showCityOnEntry&&starts===count);
const plug=init({mode:'pve',role:'plug',runKind:'journey'});
check('shelved plug does not claim crew entry',!plug._showCityOnEntry&&starts===count);
check('city completion resize has next-checkpoint branch',source.includes("this._cityMapOpen && this.roundOver && this.pveRound === PVE_BLOCK_MAPS")&&source.includes("...advanceJourney({ blockIndex: this.blockIndex, pveRound: PVE_BLOCK_MAPS }), showCityMap: true"));
console.log('city entry: '+passed+' assertions passed');
