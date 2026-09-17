import { TUTORIAL_STAGE_COUNT, tutorialStage, nextTutorialStage, tutorialLesson } from '../src/logic/tutorial.js';
let passed=0;
function check(name,ok){if(!ok)throw new Error(name);passed++;}
check('four runner lessons',TUTORIAL_STAGE_COUNT===4);
for(let i=1;i<=4;i++){
  const phone=tutorialLesson(i),desktop=tutorialLesson(i,true);
  check('stage identity '+i,phone.stage===i && desktop.stage===i);
  check('nonempty lesson '+i,phone.title.length>0 && phone.lines.length===3);
  check('no player plug instructions '+i,!/you are now the plug|click to shoot|defend against/i.test(phone.lines.join(' ')+desktop.lines.join(' ')));
  check('power selection only in later lessons '+i,phone.choosePowers===(i>=3));
  check('next stage is runner or completion '+i,nextTutorialStage(i)===(i===4?null:i+1));
  check('repeatable copy '+i,JSON.stringify(phone)===JSON.stringify(tutorialLesson(i)));
}
check('stage five cannot be entered',tutorialStage(5)===4);
check('completion cannot advance into plug lesson',nextTutorialStage(4)===null && nextTutorialStage(5)===null);
check('Previous cannot leave lower boundary',tutorialStage(0)===1 && tutorialStage(-1)===1);
check('invalid stage falls back',[undefined,NaN,Infinity,1.5].every(v=>tutorialStage(v)===1));
check('desktop movement copy',tutorialLesson(1,true).lines[0].includes('WASD'));
check('phone movement copy',tutorialLesson(1,false).lines[0].includes('Swipe'));
check('desktop power activation copy',tutorialLesson(3,true).lines[1].startsWith('Click'));
check('phone power activation copy',tutorialLesson(3,false).lines[1].startsWith('Double-tap'));
const lesson=tutorialLesson(2);lesson.lines[0]='changed';
check('callers cannot mutate future lesson copy',tutorialLesson(2).lines[0]!=='changed');
console.log('tutorial: '+passed+' assertions passed');

import {readFileSync} from 'node:fs';
import {drawArenaWallInk} from '../src/controllers/ArenaWallInk.js';
import {drawTutorialInstructions} from '../src/controllers/TutorialInstructions.js';
const uiSource=readFileSync(new URL('../src/controllers/GameUI.js',import.meta.url),'utf8')
 .replace(/^import[\s\S]*?;\s*/gm,'').replace('export default class','class');
const UI=new Function('consumeModalPointer','guardModalDismissal',uiSource+';return GameUI;')(()=>{},()=>{});
function trainingFixture(width,height){
 const nodes=[];
 const node=(x,y,w,h)=>({x,y,width:w,height:h,active:true,alpha:1,visible:true,
  setOrigin(){return this;},setScrollFactor(){return this;},setDepth(d){this.depth=d;return this;},
  setStrokeStyle(){return this;},setInteractive(){return this;},setAlpha(a){this.alpha=a;return this;},
  on(){return this;},destroy(){this.active=false;}});
 const scene={stageIdx:1,role:'runner',scale:{gameSize:{width,height}},
  cameras:{main:{centerX:width/2,centerY:height/2}},input:{keyboard:{enabled:true}},
  time:{delayedCall(){return {};}},
  add:{rectangle(x,y,w,h){const n=node(x,y,w,h);nodes.push(n);return n;},
   text(x,y,text,style){
    const font=parseFloat(style.fontSize),wrap=style.wordWrap?.width||width;
    const lines=Math.max(1,Math.ceil(text.length*font*.54/wrap));
    const n=node(x,y,wrap,lines*(font+(style.lineSpacing||0)));n.text=text;n.style=style;nodes.push(n);return n;
   }}};
 return {scene,nodes,ui:new UI(scene)};
}
for(const [w,h] of [[280,480],[390,844],[588,971],[1280,900]])for(let stage=1;stage<=4;stage++){
 const f=trainingFixture(w,h);f.scene.stageIdx=stage;
 const lesson=tutorialLesson(stage,w>=768);
 const modal=drawTutorialInstructions(f.scene,f.ui,{title:lesson.title,subtitle:'RUNNER TRAINING',
  lines:lesson.lines,buttons:[{label:'START LESSON',variant:'primary'}]});
 const text=f.nodes.filter((n)=>n.active&&n.text&&n.depth===20001&&n.style?.fontSize!=='10px');
 check('training copy preserved '+w+'/'+stage,text.map((n)=>n.text).join('|')===lesson.lines.join('|'));
 const bottom=modal.btnCenters[0].y-19;
 check('copy fits above action '+w+'/'+stage,text.every((n)=>n.y+n.height<bottom));
 check('copy fits inside card '+w+'/'+stage,text.every((n)=>n.y>=modal.contentBounds.y&&n.y+n.height<=modal.contentBounds.y+modal.contentBounds.height));
 check('training panel stays onscreen '+w+'/'+stage,modal.panel.y-modal.panel.height/2>=16&&modal.panel.y+modal.panel.height/2<=h-16);
 check('readable text '+w+'/'+stage,text.every((n)=>parseFloat(n.style.fontSize)>=12));
 const rectangles=f.nodes.filter((n)=>n.active&&n.depth===20001&&!n.text);
 check('four progress ticks '+w+'/'+stage,rectangles.length===4);
 check('instruction copy has no card backgrounds '+w+'/'+stage,f.nodes.filter((n)=>n.active&&!n.text&&n.depth===20000&&n.height>38).length===1);
 check('instruction copy has no section labels '+w+'/'+stage,!f.nodes.some((n)=>n.active&&n.text&&n.style?.fontSize==='10px'));
 modal.destroy();check('all training extras cleaned up '+w+'/'+stage,f.nodes.every((n)=>!n.active));
}
const layers=[];
const inkScene={cell:20,cols:3,rows:3,grid:[[1,1,1],[1,0,1],[1,1,1]],
 toWorldX:(x)=>x*20+10,toWorldY:(y)=>y*20+10,
 add:{graphics(){const n={rects:[],setDepth(d){this.depth=d;return this;},setAlpha(a){this.alpha=a;return this;},
 fillStyle(){return this;},fillRect(...r){this.rects.push(r);return this;}};layers.push(n);return n;}}};
const gridSnapshot=JSON.stringify(inkScene.grid);
drawArenaWallInk.call(inkScene);
check('wall ink is read-only',JSON.stringify(inkScene.grid)===gridSnapshot);
check('main game depth grammar retained',layers.map((n)=>n.depth).join(',')==='1.5,2.5,4.5');
check('hard shadow for eight wall tiles',layers[1].rects.length===8);
check('ink follows exposed cluster sides',layers[2].rects.length===16);
console.log('tutorial presentation: '+passed+' total assertions passed');
