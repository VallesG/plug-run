import { readFileSync } from 'node:fs';
import { firstPlayDestination } from '../src/logic/firstPlay.js';
let passed=0;
const check=(name,ok)=>{if(!ok)throw Error(name);passed++;};
check('fresh player learns before joining',firstPlayDestination()==='TUTORIAL_MINI');
check('crew selection is not tutorial completion',firstPlayDestination({joinedCrew:true})==='TUTORIAL_MINI');
check('training complete sends player to crew hub',firstPlayDestination({tutorialComplete:true})==='WINDOW');
check('trained crew member plays',firstPlayDestination({tutorialComplete:true,joinedCrew:true})==='RUNNER');
check('proven legacy clear avoids forced retraining',firstPlayDestination({campaignStashes:1,joinedCrew:true})==='RUNNER');
for(const amount of [undefined,NaN,Infinity,-1,0])check('invalid experience never skips training '+amount,firstPlayDestination({campaignStashes:amount})==='TUTORIAL_MINI');
const menu=readFileSync(new URL('../src/scenes/MenuScene.js',import.meta.url),'utf8');
const tutorial=readFileSync(new URL('../src/scenes/TutorialMiniScene.js',import.meta.url),'utf8');
check('landing create has no hub redirect',!menu.slice(menu.indexOf('  create(){'),menu.indexOf('    const W = this.scale.width',menu.indexOf('  create(){'))).includes("scene.start('WINDOW'"));
check('primary consistently says PLAY',menu.includes("this.makeTitleOption('PLAY',")&&!menu.includes("? 'Start Tutorial'"));
check('play entry consults onboarding policy',menu.includes("if(destination === 'TUTORIAL_MINI') k='learn'"));
check('completion marks genuine final lesson',tutorial.includes('markTutorialComplete(this._trainingUserID)')&&tutorial.indexOf('markTutorialComplete(this._trainingUserID)')>tutorial.indexOf('const next = nextTutorialStage'));
check('completion directs player to hub',tutorial.includes("target:'WINDOW'")&&tutorial.includes('join a crew'));
check('tutorial no obsolete real-stash wording',!tutorial.includes('find the real stash and escape'));
const utility=readFileSync(new URL('../src/utils/tutorialProgress.js',import.meta.url),'utf8');
let userID='a';const values=new Map();
const localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
const functions=new Function('getUserID','localStorage','console',utility.replace(/^import .*;$/gm,'').replace(/export /g,'')+';return {hasCompletedTutorial,markTutorialComplete};')(()=>userID,localStorage,console);
check('fresh completion absent',!functions.hasCompletedTutorial());
check('completion saves',functions.markTutorialComplete('a')&&functions.hasCompletedTutorial());
userID='b';check('account separation',!functions.hasCompletedTutorial());
check('switched account cannot claim another training',functions.markTutorialComplete('a')===false);
values.set('pr_tutorial_v1_b','broken');check('corrupt save absent',!functions.hasCompletedTutorial());
values.set('pr_tutorial_v1_b','{"version":1,"complete":false}');check('false completion absent',!functions.hasCompletedTutorial());
// Exercise actual scene methods, not only source-text presence.
const launchSource=menu.slice(menu.indexOf('  launchCard(card){'),menu.indexOf('  fadeOutStreetSounds(){'));
const launch=new Function('Phaser','trackNavigation','return function'+launchSource.slice(launchSource.indexOf('(')))({Cameras:{Scene2D:{Events:{FADE_OUT_COMPLETE:'done'}}}},()=>{});
for(const destination of ['TUTORIAL_MINI','WINDOW','RUNNER']){
 let reached=null;const scene={cameras:{main:{fadeEffect:{isRunning:false},fadeOut(){},once(event,fn){fn();}}},
 firstPlayDestination:()=>destination,fadeOutStreetSounds(){},scene:{start:key=>reached=key,transition:opts=>reached=opts.target}};
 launch.call(scene,{modeKey:'runner',runKind:'journey'});
 check('actual Play reaches '+destination,reached===destination);
}
let marked=null,completion=null;const goSource=tutorial.slice(tutorial.indexOf('  goNext(){'),tutorial.indexOf('  queueDash('));
const go=new Function('nextTutorialStage','markTutorialComplete','Phaser','return function'+goSource.slice(goSource.indexOf('(')))(()=>null,id=>marked=id,{});
const training={stageIdx:4,_trainingUserID:'a',clearTutorialStats(){},showModal:(title,copy,label,callback)=>completion=callback,scene:{transition:opts=>marked+=':'+opts.target}};
go.call(training);
check('actual final lesson records completion before navigation',marked==='a'&&typeof completion==='function');
completion();check('actual final action enters crew hub',marked==='a:WINDOW');
const hintBody=menu.match(/  update\(\)\{([\s\S]*?)\n  \}/)[1];
const updateHint=new Function(hintBody);
const arrow={active:true,setVisible(v){this.visible=v;return this;},setAlpha(v){this.alpha=v;return this;}};
const hintScene={_tutorialHintArrow:arrow,_tutorialHintNeeded:true,children:{list:[]},time:{now:0}};
updateHint.call(hintScene);const firstAlpha=arrow.alpha;
hintScene.time.now=450;updateHint.call(hintScene);
check('new player arrow gently pulses',arrow.visible&&arrow.alpha!==firstAlpha&&arrow.alpha>=0.3&&arrow.alpha<=1);
hintScene.children.list=[{active:true,visible:true,depth:50}];const pausedAlpha=arrow.alpha;
hintScene.time.now=900;updateHint.call(hintScene);
check('modal hides and stops hint animation',!arrow.visible&&arrow.alpha===pausedAlpha);
hintScene.children.list=[];hintScene._tutorialHintReducedMotion=true;updateHint.call(hintScene);
check('reduced motion keeps steady arrow',arrow.visible&&arrow.alpha===1);
const makeHintBody=menu.match(/  makeTutorialButton\(\)\{([\s\S]*?)\n  \}\n\n  makeChip/)[1];
let completed=false,stashes=0;
const makeHint=new Function('hasCompletedTutorial','campaignStashes','landingLayout',makeHintBody)
;
function buildHint(){
 const scene={scale:{width:360,height:780},makeTitleOption(){return {add(){}};},
   add:{graphics(){return {fillStyle(){return this;},fillTriangle(){return this;},fillRect(){return this;},setPosition(){return this;}};}}};
 makeHint.call(scene,()=>completed,()=>stashes,()=>({menuW:240}));
 return scene;
}
check('fresh visitor gets tutorial arrow',buildHint()._tutorialHintNeeded===true);
completed=true;check('completed training hides arrow',buildHint()._tutorialHintArrow===null);
completed=false;stashes=1;check('legacy player avoids first-time arrow',buildHint()._tutorialHintArrow===null);
console.log('first play: '+passed+' assertions passed');
