import { carParkCenter, carDepartureTargets, carSkidLines, carExtractionOverlap } from '../src/logic/getawayCar.js';
import { playExtraction } from '../src/controllers/extractionAnimation.js';
import { drawParkedCar, playerCarPaint, carPaintColor, DEFAULT_CAR_PAINT, CAR_WIDTH_CELLS, CAR_LENGTH_CELLS } from '../src/controllers/CarArt.js';
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
// The departure animation now lives in extractionAnimation.js, shared with
// Block Rivals. Inject the real one so this still exercises the code that ships.
const extract = new Function('missionExitAllowed','ReplaySystem','playExtraction',
  'return {'+body+'}.startExtractionSequence;')(()=>true,{finalize(){}},playExtraction);
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
for(const cell of [16,24,48]) {
 const pad={x:100,y:100,width:cell*2.8,height:cell*2.8};
 for(const dir of directions) {
  const runner={x:100+dir.x*cell,y:100+dir.y*cell};
  check('fast arrival anywhere under car triggers '+cell+JSON.stringify(dir),carExtractionOverlap(runner,pad));
  check('outside pad stays outside',!carExtractionOverlap({x:100+dir.x*(cell*1.4+13),y:100+dir.y*(cell*1.4+13)},pad));
 }
 check('center triggers in same pickup frame',carExtractionOverlap({x:100,y:100},pad));
}
check('missing runner and invalid coordinates stay false',!carExtractionOverlap(null,{})&&!carExtractionOverlap({x:NaN,y:0},{x:0,y:0}));
// The new car: true proportions, nose to the street, whole on screen.
{
 const made=[];const obj=(kind,args)=>{const o={kind,args,x:args[0],y:args[1]};for(const m of ['setDisplaySize','setAngle','setTint','setDepth'])o[m]=(...v)=>{o[m]=v;return o;};made.push(o);return o;};
 const scene={textures:{exists:()=>true},scale:{gameSize:{width:390,height:844}},add:{image:(...a)=>obj('image',a),ellipse:(...a)=>obj('ellipse',a)}};
 const cell=24;
 for(const [out,angle] of [[{x:0,y:-1},0],[{x:1,y:0},90],[{x:0,y:1},180],[{x:-1,y:0},270]]){
  made.length=0;
  const car=drawParkedCar(scene,100,200,out,cell);
  check('faces the street '+JSON.stringify(out),car._heading.x===out.x&&car._heading.y===out.y);
  check('rotated to its heading '+JSON.stringify(out),Math.round(car.setAngle[0])===angle);
  check('true proportions, not squashed '+JSON.stringify(out),car.setDisplaySize[0]===cell*CAR_WIDTH_CELLS&&car.setDisplaySize[1]===cell*CAR_LENGTH_CELLS);
  const sh=car._shadow;
  check('shadow is long toward the street '+JSON.stringify(out),Math.abs(sh.args[out.x?2:3]-cell*2*(out.x?1.02:0.98))<1e-9&&Math.abs(sh.args[out.x?3:2]-cell*1.08*(out.x?0.98:1.02))<1e-9);
  check('four ink copies behind it '+JSON.stringify(out),car._outline.length===4&&car._outline.every(o=>o.setDepth[0]<car.setDepth[0]));
  check('shadow and outline drive off with it',carDepartureTargets({car}).includes(sh)&&car._outline.every(o=>carDepartureTargets({car}).includes(o)));
 }
 // At a screen edge the car is pulled in so its nose stays in view.
 for(const [x,y,out] of [[380,400,{x:1,y:0}],[10,400,{x:-1,y:0}],[200,5,{x:0,y:-1}],[200,840,{x:0,y:1}]]){
  const car=drawParkedCar(scene,x,y,out,cell),half=cell*1+3;
  check('nose stays on screen '+JSON.stringify(out),car.x-(out.x?half:0)>=0&&car.x+(out.x?half:0)<=390&&car.y-(out.y?half:0)>=0&&car.y+(out.y?half:0)<=844);
 }
 check('crew paint on the player car',playerCarPaint('afterlight').paint===carPaintColor(0x68508c)&&playerCarPaint('iron-row').stripe===0xeee3c5);
 check('no crew and Jev drive blue',playerCarPaint(null)===DEFAULT_CAR_PAINT&&DEFAULT_CAR_PAINT.paint===0x2f6fb7);
 check('no canvas keeps the old sprite',drawParkedCar({textures:{exists:()=>false,createCanvas:()=>{throw Error('no canvas');},remove(){}},add:scene.add},0,0,{x:0,y:-1},cell)===null);
}
console.log('getaway car: '+passed+' assertions passed');
