// Exercise the scene adapter without loading Phaser or the browser dependency graph.
import { readFileSync } from 'node:fs';
import * as rules from '../src/logic/rivals.js';
import * as presets from '../src/logic/rivalPresets.js';
import * as capture from '../src/controllers/RivalReplayCapture.js';
let passed=0;
function check(name,value) { if(!value) throw new Error(name); passed++; }
let now=1000, loadouts=0, saved=[], lastPicker, played=[], resolver=()=>null;
const source=readFileSync(new URL('../src/controllers/RivalsRace.js',import.meta.url),'utf8')
  .replace(/^import[\s\S]*?;\s*/gm,'').replace('export default class','class');
const bindings={
  ...rules, ...presets, ...capture, performance:{now:()=>now}, clearTimeout:()=>{},
  saveRivalResult:(result,record,runRecord)=>{saved.push({result,record,runRecord});return true;},
  resolveRivalOpponent:(race)=>resolver(race), loadRivalReplay:async()=>null, playRivalReplay:(scene,opts)=>{played.push(opts);return {end(){}};},
  showRunnerLoadout:(ui,done,options)=>{loadouts++;lastPicker={ui,done,options};},
  ReplaySystem:{finalize(){}}
};
const Race=new Function(...Object.keys(bindings),source+'\nreturn RivalsRace;')(...Object.values(bindings));
function node(){
  return {active:true,setScrollFactor(){return this;},setDepth(){return this;},setOrigin(){return this;},
    setInteractive(){return this;},on(){return this;},setStrokeStyle(){return this;},
    setFillStyle(){return this;},setText(t){this.text=t;return this;},destroy(){this.active=false;}};
}
function setup(state,house=1){
  const events=[],restarts=[],modals=[];
  const scene={rivalRace:state,pveRound:house,scale:{gameSize:{width:390,height:844}},
    input:{keyboard:{enabled:true}},events:{once(){}},
    add:{rectangle:node,text:node},scene:{restart:d=>restarts.push(d),start(){}},
    gameUI:{showModal:o=>modals.push(o)},roundOver:false,
    time:{delayedCall:(delay,fn)=>{const e={delay,fn,removed:false,remove(){this.removed=true;}};events.push(e);return e;}}
  };
  scene.gameUI.scene=scene;
  const controller=new Race(scene);
  let starts=0;
  controller.prepare(()=>{starts++;});
  return {scene,controller,events,restarts,modals,starts:()=>starts};
}
const course=rules.rivalCourse(77),splits=[10000,20000,30000,40000,50000,60000,70000];
let state=rules.newRivalRace(course,splits), run=setup(state);
check('single opening picker',loadouts===1);
check('AI identity visible',lastPicker.options.subtitle.includes('Simulated AI'));
check('no replay/account detours',lastPicker.options.allowReplay===false && lastPicker.options.showAccount===false);
check('opening freezes gameplay',run.scene.roundPausedForMenu && !run.scene.input.keyboard.enabled);
run.scene.runnerPowersSelected=['phase','dash'];lastPicker.done();
check('ready starts countdown not race',state.status==='countdown' && state.startedAt===null);
check('timer not armed while choosing',run.starts()===0);
now=3999;run.controller.update();
check('countdown lasts full three seconds',state.status==='countdown');
now=4000;run.controller.update();
check('GO starts race once',state.status==='racing' && state.startedAt===4000 && run.starts()===1);
check('GO enables controls',run.scene.input.keyboard.enabled && !run.scene.roundPausedForMenu);
check('charges fresh at GO',JSON.stringify(run.scene.runnerPowersConsumed)==='[false,false]');
now=9000;run.controller.clearHouse();
state=run.scene.rivalRace;
check('first escape timestamp exact',state.clearTimes[0]===5000);
check('escape pauses world but not race',run.scene.roundOver && state.status==='racing');
check('quick transition scheduled',run.events[0].delay===rules.RIVAL_TRANSITION_MS);
run.controller.clearHouse();
check('duplicate escape does not advance',state.clearTimes.length===1);
run.events[0].fn();
let data=run.restarts[0];
check('next scene preserves entire race',data.rivalRace===state && data.pveRound===2 && data.runKind==='rivals');
now=9180;run=setup(data.rivalRace,data.pveRound);
check('no between-house picker',loadouts===1 && run.starts()===1);
check('clock includes transition',rules.rivalElapsed(state,now)===5180);
check('powers carry into next house',JSON.stringify(run.scene.runnerPowersSelected)==='["phase","dash"]');
now=12000;run.scene.attacker={hp:0};run.controller.retryHouse();
check('death does not erase clears',state.clearTimes.length===1 && state.retries===1);
check('retry delay bounded',run.events[0].delay===rules.RIVAL_RETRY_MS);
run.events[0].fn();data=run.restarts[0];
check('death retries same house',data.pveRound===2 && data.rivalRace.startedAt===4000);
now=12650;run=setup(data.rivalRace,data.pveRound);
check('retry does not reopen loadout',loadouts===1 && run.starts()===1);
check('clock includes death penalty time',rules.rivalElapsed(state,now)===8650);
run.controller.resize();
check('active resize counts as retry, no free reset',state.retries===2 && run.events.length===1);
now=74010;run.controller.update();
check('background catchup resolves opponent finish',state.status==='finished' && state.result==='loss');
check('finish stamps rival exact time not late frame',state.finishedMs===70000);
check('pending retry cancelled at finish',run.events[0].removed);
check('result saved exactly once',saved.length===1);
run.controller.update();run.controller.finish('win',now);
check('late callbacks cannot change result',saved.length===1 && state.result==='loss');
check('partial race not offered as ghost',saved[0].record===null);
check('partial race has no exported run record',saved[0].runRecord===null);
check('death attempt captured as caught, resize as abandoned',state.capture.attempts.map(a=>a.outcome).join()==='extracted,caught,abandoned');
check('results expose simulated opponent',run.modals.at(-1).subtitle.includes('not a live player'));

now=1000;state={...rules.newRivalRace(course,splits),status:'racing',startedAt:0,powers:['dash','dash']};
run=setup(state);
for(let house=1;house<=7;house++){
  now=house*9000;run.controller.clearHouse();state=run.scene.rivalRace;
  if(house<7){run.events[0].fn();data=run.restarts[0];now+=180;run=setup(data.rivalRace,data.pveRound);}
}
check('seven clears win',state.status==='finished' && state.result==='win');
check('no eighth-house transition',run.events.length===0);
check('actual clear splits recorded',saved.at(-1).record.clearTimes.length===7 && saved.at(-1).record.elapsedMs===63000);
check('race controls stay frozen on result',run.scene.roundOver && !run.scene.input.keyboard.enabled);
check('record not treated as server verified',saved.at(-1).record.verified===false);
check('own race exported in the shared record format',saved.at(-1).runRecord && saved.at(-1).runRecord.opponent.kind==='human' && saved.at(-1).runRecord.clearTimes.length===7);
check('own record clears equal race clock',JSON.stringify(saved.at(-1).runRecord.clearTimes)===JSON.stringify(state.clearTimes) && saved.at(-1).runRecord.retries===0);
check('capture holds one segment per attempt',state.capture.segments.length===7 && state.capture.attempts.every(a=>a.outcome==='extracted'));
check('result names the simulated opponent honestly',run.modals.at(-1).title==='YOU WIN' && run.modals.at(-1).lines.some(l=>l.startsWith('AI target')));
run.modals.at(-1).buttons[0].onClick();
check('rematch keeps seed, drops old clock',run.restarts.at(-1).rivalSeed===77 && !run.restarts.at(-1).rivalRace);
run.modals.at(-1).buttons[1].onClick();
check('new race has no pinned seed',run.restarts.at(-1).rivalSeed===undefined);
check('new race asks for the next pool slot',run.restarts.at(-1).rivalSlot===rules.nextRivalSlot(course.slot));

now=1000;state={...rules.newRivalRace(course,splits),status:'racing',startedAt:0,powers:['phase','phase'],clearTimes:[1,2,3,4,5,6]};
run=setup(state,7);now=70000;run.controller.clearHouse();
check('same-millisecond direct finish is a draw',run.scene.rivalRace.result==='draw');

now=0;state={...rules.newRivalRace(course,splits),fixedPowers:['dash','decoy']};
const beforeLoadouts=loadouts;run=setup(state);
check('fixed loadout skips the picker',loadouts===beforeLoadouts && run.modals.at(-1).lines[0]==='Loadout: DASH \u2192 DECOY');
check('fixed loadout already on the scene',JSON.stringify(run.scene.runnerPowersSelected)==='["dash","decoy"]' && JSON.stringify(state.powers)==='["dash","decoy"]');
run.modals.at(-1).buttons[0].onClick();
check('ready arms the countdown',state.status==='countdown' && state.countdownEndsAt===rules.RIVAL_COUNTDOWN_MS);
now=rules.RIVAL_COUNTDOWN_MS;run.controller.update();
check('GO with fixed loadout starts capture',state.status==='racing' && state.capture && state.capture.current && state.capture.current.house===1);
state={...rules.newRivalRace(course,splits),status:'racing',startedAt:0,powers:['phase','dash'],hardLimitMs:5000};run=setup(state);
now=5001;run.controller.update();
check('hard limit forfeits an endless race',state.status==='finished' && state.result==='forfeit');

// --- recorded opponent: async lookup, fixed loadout, honest labels, watch button ---
const opponentRecord={recordingID:'rec-x',clearTimes:[9000,18000,27000,36000,45000,54000,63000],retries:1,elapsedMs:63000,
  opponent:{kind:'bot',displayName:'BOT \u00b7 Street',skillPreset:'street'},orderedPowers:['dash','phase']};
resolver=(race)=>Promise.resolve().then(()=>{
  race.rivalTimes=opponentRecord.clearTimes.slice();race.opponentKind='recorded-bot';race.opponentRecord=opponentRecord;
  race.opponent={recordingID:'rec-x',kind:'bot',displayName:'BOT \u00b7 Street',retries:1,replayURL:'/rivals/v2/replays/rec-x.json'};
  race.fixedPowers=['dash','phase'];race.opponentResolved=true;return true;
});
now=0;state=rules.newRivalRace(course,splits);
const modalsBefore=(run=setup(state)).modals.length;
check('loadout waits for the opponent lookup',run.modals.length===modalsBefore && run.controller.notice.text==='FINDING RIVAL');
await new Promise(r=>setTimeout(r,0));
check('recorded opponent gets the fixed loadout screen',run.modals.at(-1).lines[0]==='Loadout: DASH \u2192 PHASE' && run.modals.at(-1).subtitle.includes('BOT \u00b7 Street') && run.modals.at(-1).subtitle.includes('recorded'));
check('opponent timeline replaced the simulated pace',JSON.stringify(state.rivalTimes)===JSON.stringify(opponentRecord.clearTimes));
run.modals.at(-1).buttons[0].onClick();now=rules.RIVAL_COUNTDOWN_MS;run.controller.update();
check('HUD names the rival as AI RIVAL',run.controller.rows[1].label.text.startsWith('AI RIVAL'));
resolver=()=>null;
now=70000;run.controller.update();
check('recorded rival finishing first is a loss at its recorded time',state.result==='loss' && state.finishedMs===63000);
const result=run.modals.at(-1);
check('result names the recorded bot honestly',result.title==='BOT \u00b7 STREET WINS' && result.subtitle.includes('Recorded bot run') && result.lines.some(l=>l.startsWith('BOT \u00b7 Street: 1:03.0')));
check('watch button offered and keeps the modal',result.buttons[0].label.includes('WATCH RIVAL REPLAY') && result.buttons[0].keepOpen===true);
check('saved result records the opponent',saved.at(-1).result.opponentKind==='recorded-bot' && saved.at(-1).result.recordingID==='rec-x');
const vis=[];const fakeModal={setVisible:v=>vis.push(v)};
state.opponentBundle={segments:[{house:1,attempt:1,startedMs:0,durationMs:1000,outcome:'extracted',replay:{durationMs:1000}}]};
result.buttons[0].onClick(fakeModal);
check('watch hides the modal and plays the bundle',vis.join()==='false' && played.length===1 && played[0].bundle===state.opponentBundle && played[0].opponentName==='BOT \u00b7 Street');
result.buttons[0].onClick(fakeModal);
check('second tap while watching ignored',played.length===1);
played[0].onDone();
check('leaving the replay restores the modal and the result',vis.join()==='false,true' && state.result==='loss' && state.status==='finished');
check('rematch carries the opponent id',(result.buttons[1].onClick(),run.restarts.at(-1).rivalOpponentID==='rec-x' && run.restarts.at(-1).rivalSeed===77));
check('new race drops the opponent id',(result.buttons[2].onClick(),run.restarts.at(-1).rivalOpponentID===undefined && run.restarts.at(-1).rivalRecording===undefined));
// resize while the lookup is pending does not double-open
state=rules.newRivalRace(course,splits);state.opponentResolved=true;run=setup(state);
check('already-resolved race opens the picker at once',loadouts>0 && run.modals.length===0);

now=0;state=rules.newRivalRace(course,splits);run=setup(state);
run.controller.finish('forfeit',now);
check('quit before start is safe',state.result==='forfeit' && state.finishedMs===0);
run.controller.dispose();
check('disposed scene stops updating',run.controller.update()===true);
console.log(passed+' rival flow assertions passed');
