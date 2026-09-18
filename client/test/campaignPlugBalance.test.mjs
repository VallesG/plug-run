// Actual campaign Plug logic and car reach without Phaser.
import {readFileSync} from 'node:fs';
const plugSource=readFileSync(new URL('../src/controllers/PlugAI.js',import.meta.url),'utf8').replace(/export /g,'');
const carSource=readFileSync(new URL('../src/logic/getawayCar.js',import.meta.url),'utf8').replace(/export /g,'');
const assertions=(()=>{
let assertions=0;
const check=(ok,message)=>{if(!ok)throw Error(message);assertions++;};
const api=new Function('performance',plugSource+';return {campaignPlugStats,campaignPlugWeapon,applyPlugProgression,updatePlugBehavior};')({now:()=>1000});
const car=new Function(carSource+';return carExtractionOverlap;')();
for(let h=1;h<=15;h++){
 const s=api.campaignPlugStats(h);
 check(s.speed>=62&&s.speed<=103,'campaign speed bounded');
 check(s.shootEvery>=0.94&&s.shootEvery<=1.85,'campaign fire interval bounded');
 if(h>1){const p=api.campaignPlugStats(h-1);check(s.speed>=p.speed&&s.shootEvery<=p.shootEvery,'difficulty increases within block');}
 const scene={runKind:'journey',role:'runner',pveRound:h,aiPlug:{}};
 api.applyPlugProgression(scene);check(scene.aiPlug.speed===s.speed,'profile hooked to progression');
}
for(let h=5;h<=8;h++){
 const s=api.campaignPlugStats(h),p=api.campaignPlugStats(h-1);
 check(Math.abs(s.speed-p.speed-4)<1e-9,'middle ramp linear');
}
check(api.campaignPlugWeapon(1,0.2)==='pistol','easy opening favors pistol');
check(api.campaignPlugWeapon(4,0.4)==='doublebarrel','middle favors shotgun');
check(api.campaignPlugWeapon(8,0.5)==='doublebarrel','shotgun emphasis rises');
const legacy={runKind:'rivals',role:'runner',pveRound:7,aiPlug:{}};
api.applyPlugProgression(legacy);check(legacy.aiPlug.speed===90,'Rivals stats unchanged');
function make(hp=2,iUntil=0){
 const paths=[];
 const scene={runKind:'journey',role:'runner',pveRound:8,cell:24,hasStash:true,
  attacker:{x:100,y:0,hp,iUntil},defender:{x:0,y:0,_plugRole:'guard'},extract:{x:10,y:0},
  aiPlug:{speed:80,orientationDelay:0,shootEvery:999,maxRange:300},
  toCell:(x,y)=>({x:Math.floor(x/24),y:Math.floor(y/24)}),isWalkableCell:()=>true,
  findPath:(x,y,gx,gy)=>{paths.push({gx,gy});return [{x,y},{x:gx,y:gy}];},
  canMoveTo:()=>true,totalRoundsLeft:()=>10,hasLineOfSight:()=>true,
  allowedGuns:['pistol'],roundAmmo:{pistol:10},time:{now:1000}};
 return {scene,paths};
}
{
 const {scene,paths}=make();api.updatePlugBehavior(scene,0.1);
 check(paths[0].gx===100,'uninjured runner is pursued instead of camped');
 check(scene.defender.x>0,'start waypoint consumed without losing frame');
 check(scene.defender._campaignBrain._aiPathIndex===1,'brain stores waypoint progress');
}
{
 const {scene,paths}=make(1,2000);api.updatePlugBehavior(scene,0.1);
 check(paths[0].gx===100,'injury cooldown favors pursuit and positioning');
}
{
 const {scene,paths}=make(1);api.updatePlugBehavior(scene,0.1);
 check(paths[0].gx===10,'vulnerable nearby runner permits exit contest');
}
{
 const {scene,paths}=make(1);scene.hasLineOfSight=()=>false;api.updatePlugBehavior(scene,0.1);
 check(paths[0].gx===100,'blocked firing lane cannot justify exit camping');
}
{
 const {scene}=make();const first=scene.defender;
 api.updatePlugBehavior(scene,0.1);
 const firstPath=first._campaignBrain._aiPath;
 scene.defender={x:0,y:100,_plugRole:'pursuer'};
 api.updatePlugBehavior(scene,0.1);
 check(scene.defender._campaignBrain!==first._campaignBrain,'dual defenders have distinct state');
 check(scene.defender._campaignBrain._aiPath!==firstPath,'dual defenders have distinct paths');
 check(first._campaignBrain._aiPath===firstPath,'second brain cannot clobber first');
}
{
 const {scene}=make();scene.canMoveTo=()=>false;
 for(let n=0;n<12;n++)api.updatePlugBehavior(scene,0.1);
 check(scene.defender._campaignNav.recover>0,'blocked defender triggers replanning');
 check(scene.defender.x===0&&scene.defender.y===0,'recovery never teleports');
 check(scene.aiPlug.speed===80,'recovery never boosts speed');
}
for(const cell of [16,24,48]){
 const pad={x:100,y:100,width:cell*2.8,height:cell*2.8};
 for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1]]){
  check(car({x:100+x*cell,y:100+y*cell},pad,true),'near arrival still extracts from every edge');
  const far={x:100+x*cell*1.6,y:100+y*cell*1.6};
  check(!car(far,pad,true),'campaign far arrival no longer vacuums');
  check(car(far,pad),'legacy arrival preserved for Rivals');
 }
}
check(!car({x:NaN,y:0},{x:0,y:0},true),'invalid car coordinates rejected');
return assertions;
})();
console.log('campaign Plug balance: '+assertions+' assertions passed');
