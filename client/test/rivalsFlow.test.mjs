// Exercise the scene adapter without loading Phaser or the browser dependency graph.
import { readFileSync } from 'node:fs';
import * as rules from '../src/logic/rivals.js';
import * as presets from '../src/logic/rivalPresets.js';
import * as capture from '../src/controllers/RivalReplayCapture.js';
let passed=0;
function check(name,value) { if(!value) throw new Error(name); passed++; }
let now=1000, loadouts=0, saved=[], lastPicker, played=[], resolver=()=>null, replayLoader=async()=>null;
const source=readFileSync(new URL('../src/controllers/RivalsRace.js',import.meta.url),'utf8')
  .replace(/^import[\s\S]*?;\s*/gm,'').replace('export default class','class');
const bindings={
  ...rules, ...presets, ...capture,
  crewSigil:()=>null,completeRivalDistrict:()=>({applied:false}),
  rivalCityView:index=>({index}),drawCityMap:(s,o)=>{s.cityOptions=o;return {destroy(){s.cityDestroyed=true;}};},
  drawRivalDistrictMap:(s,m,r,o)=>{s.districtDraws=(s.districtDraws||0)+1;}, performance:{now:()=>now}, clearTimeout:()=>{},
  saveRivalResult:(result,record,runRecord)=>{saved.push({result,record,runRecord});return true;},
  resolveRivalOpponent:(race)=>resolver(race), loadRivalReplay:(race)=>replayLoader(race), playRivalReplay:(scene,opts)=>{played.push(opts);return {end(){}};},
  showRunnerLoadout:(ui,done,options)=>{loadouts++;lastPicker={ui,done,options};},
  drawPowerIcon:()=>node(), AudioManager:{get:()=>({isMusicMuted:()=>false,isMuted:()=>false,setMusicMute(){},setMute(){}})},
  ReplaySystem:{finalize(){}}
};
const Race=new Function(...Object.keys(bindings),source+'\nreturn RivalsRace;')(...Object.values(bindings));
function node(x=0,y=0,width=0,height=0){
  return {active:true,x,y,width,height,visible:true,setScrollFactor(){return this;},setDepth(d){this.depth=d;return this;},setOrigin(){return this;},
    setInteractive(){return this;},on(){return this;},setStrokeStyle(){return this;},setAlpha(){return this;},
    setVisible(v){this.visible=v;return this;},setDisplaySize(w,h){this.displayWidth=w;this.displayHeight=h;return this;},
    setFillStyle(){return this;},setText(t){this.text=t;return this;},destroy(){this.active=false;}};
}
function setup(state,house=1){
  const events=[],restarts=[],modals=[];
  const scene={rivalRace:state,pveRound:house,cell:24,pad:{x:3,y:2},grid:Array.from({length:35},()=>Array(16).fill(0)),scale:{gameSize:{width:390,height:844}},
    input:{keyboard:{enabled:true}},events:{once(){}},
    add:{rectangle:node,text:node},scene:{restart:d=>restarts.push(d),start(){}},
    gameUI:{showModal:o=>{const modal={...o,destroy(){this.destroyed=true;}};modals.push(modal);return modal;}},roundOver:false,
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
check('rival identity visible without implementation labels',lastPicker.options.subtitle.includes('RIVAL') && !/AI|BOT/i.test(lastPicker.options.subtitle));
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
check('powers fresh at GO',JSON.stringify(run.scene.runnerPowersConsumed)==='[false,false]');
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
check('results expose only the rival label',run.modals.at(-1).subtitle==='Rival pace trial');

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
check('result names the rival',run.modals.at(-1).title==='YOU WIN' && run.modals.at(-1).lines.some(l=>l.startsWith('Rival:')));
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
check('fixed loadout uses the illustrated loadout screen',loadouts===beforeLoadouts+1 && JSON.stringify(lastPicker.options.fixedPowers)==='["dash","decoy"]');
check('fixed loadout already on the scene',JSON.stringify(run.scene.runnerPowersSelected)==='["dash","decoy"]' && JSON.stringify(state.powers)==='["dash","decoy"]');
lastPicker.done();
check('ready arms the countdown',state.status==='countdown' && state.countdownEndsAt===rules.RIVAL_COUNTDOWN_MS);
now=rules.RIVAL_COUNTDOWN_MS;run.controller.update();
check('GO with fixed loadout starts capture',state.status==='racing' && state.capture && state.capture.current && state.capture.current.house===1);
state={...rules.newRivalRace(course,splits),status:'racing',startedAt:0,powers:['phase','dash'],hardLimitMs:5000};run=setup(state);
now=5001;run.controller.update();
check('hard limit forfeits an endless race',state.status==='finished' && state.result==='forfeit');

// --- recorded opponent: async lookup, independent loadout, replay, watch button ---
const opponentRecord={recordingID:'rec-x',clearTimes:[9000,18000,27000,36000,45000,54000,63000],retries:1,elapsedMs:63000,
  opponent:{kind:'bot',displayName:'BOT \u00b7 Street',skillPreset:'street'},orderedPowers:['dash','phase']};
resolver=(race)=>Promise.resolve().then(()=>{
  race.rivalTimes=opponentRecord.clearTimes.slice();race.opponentKind='recorded-bot';race.opponentRecord=opponentRecord;
  race.opponent={recordingID:'rec-x',kind:'bot',displayName:'BOT \u00b7 Street',retries:1,orderedPowers:opponentRecord.orderedPowers.slice(),replayURL:'/rivals/v2/replays/rec-x.json'};
  race.opponentResolved=true;return true;
});
now=0;state=rules.newRivalRace(course,splits);
const modalsBefore=(run=setup(state)).modals.length;
check('loadout waits for the opponent lookup',run.modals.length===modalsBefore && run.controller.notice.text==='FINDING RIVAL');
await new Promise(r=>setTimeout(r,0));
check('recorded opponent opens an editable picker',lastPicker.options.fixedPowers===undefined && lastPicker.options.subtitle.includes('RIVAL') && !/AI|BOT/i.test(lastPicker.options.subtitle));
check('picker shows the rival mix without copying it',lastPicker.options.helpText.includes('DASH → PHASE') && state.powers.length===0 && state.fixedPowers==null);
run.scene.runnerPowersSelected=['decoy','decoy'];
check('opponent timeline replaced the simulated pace',JSON.stringify(state.rivalTimes)===JSON.stringify(opponentRecord.clearTimes));
lastPicker.done();now=rules.RIVAL_COUNTDOWN_MS;run.controller.update();
check('chosen powers survive GO independently',state.powers.join()==='decoy,decoy' && run.scene.runnerPowersSelected.join()==='decoy,decoy' && opponentRecord.orderedPowers.join()==='dash,phase');
check('HUD names the opponent only as RIVAL',run.controller.rows[1].label.text.startsWith('RIVAL'));
resolver=()=>null;
now=8000;run.controller.clearHouse();state=run.scene.rivalRace;
run.events[0].fn();data=run.restarts[0];now=8180;run=setup(data.rivalRace,2);
check('recorded match preserves player mix on next house',run.scene.runnerPowersSelected.join()==='decoy,decoy' && state.fixedPowers==null);
now=9000;run.controller.retryHouse();run.events[0].fn();data=run.restarts[0];now=9650;run=setup(data.rivalRace,2);
check('recorded match refills player mix on retry',run.scene.runnerPowersSelected.join()==='decoy,decoy' && run.scene.runnerPowersConsumed.join()==='false,false');
now=70000;run.controller.update();
check('recorded rival finishing first is a loss at its recorded time',state.result==='loss' && state.finishedMs===63000);
const result=run.modals.at(-1);
check('result uses only the rival label',result.title==='RIVAL WINS' && result.subtitle.includes('Recorded rival run') && result.lines.some(l=>l.startsWith('Rival: 1:03.0')));
check('watch button offered and keeps the modal',result.buttons[0].label.includes('WATCH RIVAL REPLAY') && result.buttons[0].keepOpen===true);
check('saved result records the opponent',saved.at(-1).result.opponentKind==='recorded-bot' && saved.at(-1).result.recordingID==='rec-x');
const vis=[];const fakeModal={setVisible:v=>vis.push(v)};
state.opponentBundle={segments:[{house:1,attempt:1,startedMs:0,durationMs:1000,outcome:'extracted',replay:{durationMs:1000}}]};
result.buttons[0].onClick(fakeModal);
check('watch hides the modal and plays the bundle',vis.join()==='false' && played.length===1 && played[0].bundle===state.opponentBundle && played[0].opponentName==='RIVAL');
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

now=1000;
state={...rules.newRivalRace(course,splits),status:'racing',startedAt:0,powers:['dash','phase']};
run=setup(state);
check('clock is in the floor beneath actors',run.controller.clock.depth>1.5 && run.controller.clock.depth<3);
run.scene.hasStash=true;run.controller.paint(now);
check('real pickup lights half the live house',run.controller.rows[0].fills[0].displayHeight===run.controller.rows[0].height/2);
run.scene.hasStash=false;run.controller.paint(now);
check('no stash leaves live segment empty',!run.controller.rows[0].fills[0].visible);
state.pickupProgress={windows:[{house:1,start:500,end:2000}]};
run.controller.paint(now);
check('recorded pickup lights half the rival house',run.controller.rows[1].fills[0].displayHeight===run.controller.rows[1].height/2);
now=2000;run.controller.paint(now);
check('recorded death clears half segment',!run.controller.rows[1].fills[0].visible);
run.controller.openSettings();
check('settings stops controls but keeps race running',run.scene.roundPausedForMenu && !run.scene.input.keyboard.enabled && state.status==='racing');
check('settings provides audio back and quit',run.modals.at(-1).buttons.map(b=>b.label).join('|')==='MUSIC: ON|SOUNDS: ON|BACK TO RACE|QUIT RACE');
now=5000;run.controller.update();
check('settings time counts toward the race',rules.rivalElapsed(state,now)===5000);
run.modals.at(-1).buttons[2].onClick();
check('back prevents tap-through before resuming',run.controller.settingsOpen && run.scene.roundPausedForMenu);
run.events.at(-1).fn();
check('back resumes without resetting powers or clock',!run.controller.settingsOpen && run.scene.input.keyboard.enabled && state.startedAt===0 && state.powers.join()==='dash,phase' && run.starts()===1);
run.controller.openSettings();
const settings=run.modals.at(-1);
now=70001;run.controller.update();
check('rival can finish while settings is open',state.result==='loss' && settings.destroyed && !run.controller.settingsOpen);
check('settings cannot reopen over result',(run.controller.openSettings(),run.modals.at(-1).title==='RIVAL WINS'));
now=1000;
state={...rules.newRivalRace(course,splits),status:'racing',startedAt:0,powers:['dash','phase']};
run=setup(state);run.controller.openSettings();
run.modals.at(-1).buttons[3].onClick();
check('settings quit forfeits once',state.result==='forfeit' && state.finishedMs===1000);

let replayCalls=0, resolveBundle;
replayLoader=()=>{replayCalls++;return new Promise(resolve=>{resolveBundle=resolve;});};
now=0;
state={...rules.newRivalRace(course,splits),opponentKind:'recorded-bot',fixedPowers:['dash','phase']};
run=setup(state);
check('pickup prefetch does not block the loadout',replayCalls===1 && lastPicker.options.fixedPowers.join()==='dash,phase');
const carried={...state};
setup(carried);
check('restarts share pending pickup progress',carried.pickupProgress===state.pickupProgress && replayCalls===1);
resolveBundle({segments:[{house:1,startedMs:0,durationMs:3000,replay:{events:[{t:1000,k:'pickup'}]}}]});
await new Promise(r=>setTimeout(r,0));
check('late replay populates the restarted race',rules.rivalCarryingAt(carried.pickupProgress.windows,0,1500));
replayLoader=async()=>{throw new Error('offline');};
state={...rules.newRivalRace(course,splits),opponentKind:'recorded-bot',fixedPowers:['dash','phase']};
run=setup(state);
await new Promise(r=>setTimeout(r,0));
check('failed pickup prefetch keeps the race playable',state.status==='ready' && state.pickupProgress.windows.length===0);

// The actual loader shares one validated download across copied race objects;
// a failure is not cached forever, so WATCH can retry after a network outage.
const sessionSource=readFileSync(new URL('../src/utils/rivalSession.js',import.meta.url),'utf8')
  .replace(/^import[\s\S]*?;\s*/gm,'').replace(/^export /gm,'');
let downloads=0, finishDownload;
const sessionBindings={
  RIVAL_MAX_BUNDLE_BYTES:6000000,validateRivalReplayBundle:()=>({ok:true}),
  validateReplaySegment:()=>({ok:true}),setTimeout,clearTimeout,console,
  fetch:()=>{downloads++;return new Promise(resolve=>{finishDownload=resolve;});}
};
const fetchReplay=new Function(...Object.keys(sessionBindings),sessionSource+'\nreturn loadRivalReplay;')(...Object.values(sessionBindings));
const original={opponent:{replayURL:'/record.json'},opponentRecord:{}};
const first=fetchReplay(original), copy={...original}, second=fetchReplay(copy);
check('parallel replay consumers share one request',downloads===1);
finishDownload({ok:true,text:async()=>JSON.stringify({segments:[]})});
const loaded=await first;
check('both consumers receive the validated cache',await second===loaded && copy.replayCache.bundle===loaded);
await fetchReplay(copy);
check('watch reuses prefetched replay without a second download',downloads===1);
const failed={opponent:{replayURL:'/offline.json'},opponentRecord:{}};
const attempt=fetchReplay(failed);
finishDownload({ok:false,status:503});
check('failed download stays retryable',await attempt===null && failed.replayCache.pending===null);
const retry=fetchReplay(failed);
finishDownload({ok:true,text:async()=>JSON.stringify({segments:[]})});
check('a later watch can recover from offline',!!(await retry) && downloads===3);

// Use the actual opponent loader, not just the adapter's resolver stub: picking
// a record must never populate fixedPowers or alter either runner's pair.
const bankSnapshot=JSON.stringify(opponentRecord);
const chooseBindings={...rules,...presets,console,setTimeout,clearTimeout,
  getUserID:()=> 'test-runner',localStorage:{getItem:()=> '[]'},
  validateRivalRunRecord:()=>({ok:true}),rivalRecordMatchesCourse:()=>true,
  fetch:async()=>({ok:true,text:async()=>JSON.stringify({schemaVersion:1,rulesVersion:rules.RIVAL_RULES_VERSION,
    opponents:[{record:opponentRecord,replay:'replays/rec-x.json'}]})})};
const chooseOpponent=new Function(...Object.keys(chooseBindings),sessionSource+'\nreturn resolveRivalOpponent;')(...Object.values(chooseBindings));
const independent={...rules.newRivalRace(course,splits),powers:['decoy','decoy'],fixedPowers:null,wantRecordingID:'rec-x'};
check('actual loader selects recording',await chooseOpponent(independent)===true);
check('actual loader never locks human powers',independent.fixedPowers===null && independent.powers.join()==='decoy,decoy');
check('rival metadata retains original pair',independent.opponent.orderedPowers.join()==='dash,phase' && independent.opponentRecord.orderedPowers.join()==='dash,phase');
check('record eligibility still preserves seeds and timestamps',independent.rivalTimes.join()===opponentRecord.clearTimes.join() && independent.opponent.recordingID==='rec-x');
check('bank input is not decorated',JSON.stringify(opponentRecord)===bankSnapshot);
const explicit={...rules.newRivalRace(course,splits),fixedPowers:['phase','phase']};
await chooseOpponent(explicit);
check('actual loader preserves explicit harness pair',explicit.fixedPowers.join()==='phase,phase' && explicit.opponent.orderedPowers.join()==='dash,phase');
console.log(passed+' total rival flow assertions passed');

now=1000;
const entry={...rules.newRivalRace(rules.rivalPoolCourse(1),splits),rivalCityIndex:1,territoryIndex:1};
const oldLoadouts=loadouts, city=setup(entry);
check('normal rivalry opens city before picker',city.scene.cityOptions.view.index===1&&loadouts===oldLoadouts);
check('city presentation claimed on race before resize',entry.cityIntroShown&&entry.entryStage==='block');
city.scene.cityOptions.onDone();
check('city lands on seven-house district',city.scene.districtDraws===1&&city.modals.at(-1).buttons[0].label==='LOOK FOR MATCH');
check('no opponent selection until look-for-match',loadouts===oldLoadouts);
city.modals.at(-1).buttons[0].onClick();
check('mix chosen before the opponent carousel',loadouts===oldLoadouts+1&&lastPicker.options.startLabel==='LOOK FOR MATCH');
city.scene.runnerPowersSelected=['dash','decoy'];lastPicker.done();
await Promise.resolve();await Promise.resolve();
check('search does not start race clock',entry.status==='ready'&&entry.startedAt===null&&entry.entryStage==='search');
for(let i=0;i<20&&entry.status!=='countdown';i++)city.events.at(-1).fn();
check('opponent reveal starts countdown automatically',entry.status==='countdown'&&loadouts===oldLoadouts+1&&entry.powers.join()==='dash,decoy');
check('search keeps movement frozen',city.scene.roundPausedForMenu&&!city.scene.input.keyboard.enabled);
city.controller.dispose();
check('search timer removed on shutdown',city.events.at(-1).removed);
const canceled=setup({...rules.newRivalRace(rules.rivalPoolCourse(2),splits),rivalCityIndex:2});
const callbacks=canceled.scene.cityOptions;
canceled.controller.dispose();callbacks.onDone();
check('canceled city callback cannot open block',!canceled.scene.districtDraws&&canceled.scene.cityDestroyed);
const resumed=setup({...rules.newRivalRace(rules.rivalPoolCourse(1),splits),rivalCityIndex:1,cityIntroShown:true,entryStage:'block'});
check('resized block entrance skips city and keeps match button',!resumed.scene.cityOptions&&resumed.modals.at(-1).buttons[0].label==='LOOK FOR MATCH');
resumed.controller.dispose();
console.log('Rivals district entry: '+passed+' total assertions passed');

let finishOpponents,requests=0;
const delayedBindings={...chooseBindings,fetch:()=>{requests++;return new Promise(r=>{finishOpponents=r;});}};
const delayedResolve=new Function(...Object.keys(delayedBindings),sessionSource+';return resolveRivalOpponent;')(...Object.values(delayedBindings));
const shared=rules.newRivalRace(rules.rivalPoolCourse(1),splits);
const lookup=delayedResolve(shared),afterResize=delayedResolve(shared);
check('resize shares pending opponent lookup',lookup===afterResize&&requests===1);
finishOpponents({ok:true,text:async()=>JSON.stringify({schemaVersion:1,rulesVersion:rules.RIVAL_RULES_VERSION,opponents:[{record:opponentRecord,replay:null}]})});
await lookup;
check('shared lookup settles and clears pending',shared.opponentPending===null&&shared.opponentKind==='recorded-bot');
check('carousel display does not expose implementation labels',city.controller.rivalDisplayName('BOT · Street')==='RIVAL · Street');
console.log('Rivals async continuity: '+passed+' total assertions passed');
