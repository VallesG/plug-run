import { carParkCenter, carDepartureTargets, carSkidLines } from '../src/logic/getawayCar.js';
import { readFileSync } from 'node:fs';
let passed = 0;
function check(name, ok) { if (!ok) throw Error(name); passed++; }
const directions = [{x:0,y:-1},{x:0,y:1},{x:1,y:0},{x:-1,y:0}];
for (const cell of [8, 16, 24, 48]) for (const dir of directions) {
  const center = carParkCenter(200, 300, dir, cell);
  const projection = (center.x - 200) * dir.x + (center.y - 300) * dir.y;
  const outline = Math.max(2, Math.round(cell * 0.09));
  check('roof plus outline clears guarded pad', projection - cell * 0.7 - outline > cell * 0.5);
  check('same driveway centerline', (center.x-200)*dir.y-(center.y-300)*dir.x === 0);
}
// Actual edge exits: the former outward placement cut off N/S roofs.
for (const viewport of [{width:320,height:480},{width:390,height:844},{width:1280,height:720}])
for (const cell of [8,16,24]) for (const dir of directions) {
  const ink = Math.max(2,Math.round(cell*0.09));
  const halfX = cell*(dir.x?0.7:1.3)+ink;
  const halfY = cell*(dir.x?1.3:0.7)+ink;
  const x = dir.x<0 ? cell/2 : dir.x>0 ? viewport.width-cell/2 : viewport.width/2;
  const y = dir.y<0 ? cell/2 : dir.y>0 ? viewport.height-cell/2 : viewport.height/2;
  const parked=carParkCenter(x,y,dir,cell,viewport);
  check('whole car including ink fits horizontal viewport',parked.x-halfX>=0&&parked.x+halfX<=viewport.width);
  check('whole car including ink fits vertical viewport',parked.y-halfY>=0&&parked.y+halfY<=viewport.height);
}
const tiny=carParkCenter(0,0,{x:0,y:-1},24,{width:20,height:20});
check('tiny viewport centers instead of invalid clamp',tiny.x===10&&tiny.y===10);
const car = {x:100,y:200,_outline:[{x:101,y:200},{x:99,y:200},{x:100,y:201},{x:100,y:199}]};
const lights = {}, beacon = {};
const targets = carDepartureTargets({car,carLights:lights,vfx:{carBeacon:beacon}});
check('all four ink copies move', car._outline.every(o=>targets.includes(o)));
check('car lights and beacon move', targets.includes(car)&&targets.includes(lights)&&targets.includes(beacon));
check('seven distinct moving objects', targets.length===7);
check('absent extras supported', carDepartureTargets({car:{}}).length===1);
check('absent car supported', carDepartureTargets({}).length===0);
check('duplicate target removed', carDepartureTargets({car,carLights:car}).length===5);
let marked = 0, blank = 0;
for (let seed=0;seed<120;seed++) for (const dir of directions) {
  const lines = carSkidLines(seed,car,dir,24);
  check('stable choice and geometry', JSON.stringify(lines)===JSON.stringify(carSkidLines(seed,car,dir,24)));
  if (!lines.length) {blank++;continue;}
  marked++;
  check('two tire tracks', lines.length===2);
  for (const line of lines) check('parallel outward tracks', line.x2-line.x1===dir.x*30 && line.y2-line.y1===dir.y*30);
}
check('marks occasional not always', marked>0&&blank>0&&marked<blank);
check('missing car draws nothing',carSkidLines(0,null,{x:1,y:0},24).length===0);
const base = readFileSync(new URL('../src/scenes/BaseGameScene.js', import.meta.url),'utf8');
const progression = readFileSync(new URL('../src/controllers/ProgressionManager.js', import.meta.url),'utf8');
const ai = readFileSync(new URL('../src/controllers/PlugAI.js', import.meta.url),'utf8');
check('runtime parks using tested geometry',base.includes('carParkCenter(ex, ey, { x: dx, y: dy }, this.cell, this.scale.gameSize)'));
check('parked roof stays behind characters',base.includes('carKey).setDepth(9)')&&base.includes('.setDepth(8));'));
check('AI still guards exact extraction target',ai.includes('moveX = scene.extract.x;')&&!ai.includes('carGuardPoint'));
const start = progression.indexOf('  async startExtractionSequence() {');
const end = progression.indexOf('  endRound(winner)',start);
const body = progression.slice(start,end).replace(/\/\*\*[\s\S]*?\*\/\s*$/,'');
const extract = new Function('missionExitAllowed','ReplaySystem','carDepartureTargets','carSkidLines',
  'return {'+body+'}.startExtractionSequence;')(()=>true,{finalize(){}},carDepartureTargets,carSkidLines);
for (const dir of directions) {
  const tweens = [], strokes = [];
  const vehicle = {...car,_outline:car._outline.map(o=>({...o}))};
  let markedSeed=0;while(!carSkidLines(markedSeed,vehicle,dir,24).length)markedSeed++;
  const scene = { mode:'pvp',role:'runner',runKind:'daily',seed:markedSeed,cell:24,car:vehicle,carOutDir:dir,
    input:{keyboard:{}},tweens:{add(config){tweens.push(config);}},
    add:{graphics(){return {setDepth(depth){check('marks below actors above floor',depth===5);return this;},
      lineStyle(){return this;},lineBetween(...args){strokes.push(args);return this;}};}},
    vfx:{carBeacon:beacon},carLights:lights };
  await extract.call({scene});
  check('actual extraction invokes one departure tween',tweens.length===1);
  check('actual tween includes every ink outline',vehicle._outline.every(o=>tweens[0].targets.includes(o)));
  check('correct departure vector',tweens[0].x==='+='+dir.x*192&&tweens[0].y==='+='+dir.y*192);
  check('actual extraction draws two skid tracks',strokes.length===2);
  check('scene ends only once',scene.roundOver===true);
}
console.log('getaway car: '+passed+' assertions passed');
