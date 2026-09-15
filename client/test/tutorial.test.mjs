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
