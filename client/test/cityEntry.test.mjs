// Exercise actual BaseGameScene.init without importing Phaser.
import { readFileSync } from 'node:fs';
import { shouldShowCity, storySeasonComplete, createCityState, beginCityBlock } from '../src/logic/city.js';
import { worldBlock, worldHouseSeed, advanceJourney } from '../src/logic/worldBlocks.js';
let passed=0;
function check(name,ok){if(!ok)throw Error(name);passed++;}
const source=readFileSync(new URL('../src/scenes/BaseGameScene.js',import.meta.url),'utf8');
const start=source.indexOf('  init(data) {'),end=source.indexOf('  // world/grid helpers',start);
check('real init seam found',start>=0&&end>start);
let stored={blockIndex:4,pveRound:6,pveSessionStash:5,pveSessionRep:20},owner='iron-row',atlas=createCityState(),starts=0;
const stub=class{};
const bindings={BaseGameScene:{GRID_COLS:16,GRID_ROWS:35},
 PlayerController:stub,AIController:stub,CombatSystem:stub,VisualEffects:stub,GameUI:stub,ProgressionManager:stub,InputIntent:stub,
 localStorage:{getItem:()=>null},console:{log(){}},shouldShowCity,storySeasonComplete,worldBlock,worldHouseSeed,advanceJourney,
 getCityProgress:()=>atlas,
 getJourneyProgress:()=>stored,getSessionState:()=>null,getCurrentUser:()=>({username:'test',isGuest:true}),
 getWindowState:()=>({gangID:owner}),startCityBlock:(checkpoint,id)=>{starts++;const result=beginCityBlock(atlas,checkpoint.blockIndex,id,checkpoint);atlas=result.state;return result.gangID;},
 getCurrentRouteID:()=>1,getRouteSeed:()=>123,createSeededRNG:()=>()=>.5,cleanupOldRoutes:()=>{},
 createRivalSession:()=>({clearTimes:[],course:{id:'test',seeds:[999],scales:[.6],cols:16,rows:35}}),
 rivalHouseMazeOptions:(course,i)=>({cols:course.cols,rows:course.rows,clusterScale:course.scales[i],layout:course.layouts?.[i]??null})};
const Host=new Function(...Object.keys(bindings),'class Host { '+source.slice(start,end)+' } return Host;')(...Object.values(bindings));
function init(data){const host=new Host();host.scene={settings:{data:{}},key:'RUNNER'};host.init(data);return host;}
const entry=init({mode:'pve',role:'runner',runKind:'journey'});
check('menu resume adopts old checkpoint',entry.blockIndex===4&&entry.pveRound===6&&entry.pveSessionStash===5);
check('partial menu resume skips city',!entry._showCityOnEntry);
check('menu resume retains exact house seed',entry.seed===worldHouseSeed(4,6,'runner'));
check('entry freezes crew',entry.blockGangID==='iron-row'&&atlas.active.gangID==='iron-row');
owner='afterlight';
const retry=init({mode:'pve',role:'runner',runKind:'journey',blockIndex:4,pveRound:6,retryAfterDeath:true});
check('retry keeps frozen crew',retry.blockGangID==='iron-row');
check('retry no extra city',!retry._showCityOnEntry&&retry.retryAfterDeath);
const resized=init({mode:'pve',role:'runner',runKind:'journey',blockIndex:4,pveRound:6,showCityMap:true});
check('obsolete show flag cannot force replay',!resized._showCityOnEntry&&resized.seed===entry.seed);
const count=starts;
const rivals=init({mode:'pve',role:'runner',runKind:'rivals'});
check('rivals no city/crew writes',!rivals._showCityOnEntry&&starts===count&&rivals.seed===999);
const daily=init({mode:'pve',role:'runner',runKind:'daily'});
check('daily no city/crew writes',!daily._showCityOnEntry&&starts===count);
const plug=init({mode:'pve',role:'plug',runKind:'journey'});
check('shelved plug does not claim crew entry',!plug._showCityOnEntry&&starts===count);
const fresh=init({mode:'pve',role:'runner',runKind:'journey',blockIndex:5,pveRound:1});
check('next fresh block eligible without menu flag',fresh._showCityOnEntry&&fresh.seed===worldHouseSeed(5,1,'runner'));
const firstRetry=init({mode:'pve',role:'runner',runKind:'journey',blockIndex:5,pveRound:1,retryAfterDeath:true});
check('first house retry skips intro',!firstRetry._showCityOnEntry);
const beforeFinale=starts;
const future=init({mode:'pve',role:'runner',runKind:'journey',blockIndex:11,pveRound:1});
check('city 2 cannot create a story block',future._storyUnavailable&&!future._showCityOnEntry&&starts===beforeFinale);
const legacy=init({mode:'pve',role:'runner',runKind:'journey',blockIndex:24,pveRound:6});
check('legacy later-city checkpoint cannot start story',legacy._storyUnavailable&&starts===beforeFinale);
const createStart=source.indexOf('  create(){'),createEnd=source.indexOf('    this._touchSceneClosing=false;',createStart);
check('real creation guard seam found',createStart>=0&&createEnd>createStart);
const createGuard=new Function(source.slice(createStart+'  create(){'.length,createEnd)+'this.entered=true;');
let redirected=null;
createGuard.call({_storyUnavailable:true,scene:{start:(key,data)=>redirected={key,data}}});
check('direct city 2 scene redirects before gameplay',redirected?.key==='WINDOW'&&redirected.data.seasonComplete);
check('no resize presentation flag',!source.includes("this._cityMapOpen && this.roundOver"));
check('completed resize guard proves earned finale',source.includes("getCityProgress().completedThrough >= this.blockIndex"));
const resizeStart=source.indexOf('        // A completed result may resize;');
const resizeEnd=source.search(/        this\.scene\.restart\(\{\r?\n        mode:/);
check('real resize guard seam found',resizeStart>=0&&resizeEnd>resizeStart);
const resize=new Function('getCityProgress','advanceJourney','PVE_BLOCK_MAPS',
 source.slice(resizeStart,resizeEnd)+'\nthis.normalRestart=true;');
for(const fixture of [
 {runKind:'journey',role:'runner',roundOver:true,pveRound:15,completed:2,next:true},
 {runKind:'journey',role:'runner',roundOver:true,pveRound:15,completed:1,next:false},
 {runKind:'journey',role:'runner',roundOver:false,pveRound:15,completed:2,next:false},
 {runKind:'journey',role:'runner',roundOver:true,pveRound:14,completed:2,next:false},
 {runKind:'daily',role:'runner',roundOver:true,pveRound:15,completed:2,next:false},
 {runKind:'journey',role:'plug',roundOver:true,pveRound:15,completed:2,next:false}
]) {
 const restarts=[],host={...fixture,blockIndex:2,scene:{restart:data=>restarts.push(data)}};
 resize.call(host,()=>({completedThrough:fixture.completed}),advanceJourney,15);
 check('resize only advances proven completion '+JSON.stringify(fixture),Boolean(restarts.length)===fixture.next);
 check('resize checkpoint/normal path '+JSON.stringify(fixture),fixture.next
  ?restarts[0].blockIndex===3&&restarts[0].pveRound===1:host.normalRestart);
}
console.log('city entry: '+passed+' assertions passed');
