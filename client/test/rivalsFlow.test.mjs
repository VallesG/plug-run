// Exercise the scene adapter without loading Phaser or the browser dependency graph.
import { readFileSync } from 'node:fs';
import * as baseRules from '../src/logic/rivals.js';
const rules = { ...baseRules, newRivalRace: (course, times) => baseRules.newRivalRace(course, times, { stashSeed: 42 }) };
import * as presets from '../src/logic/rivalPresets.js';
import * as skill from '../src/logic/rivalSkill.js';
import * as capture from '../src/controllers/RivalReplayCapture.js';
import * as matchmaking from '../src/logic/rivalMatchmaking.js';
import { playExtraction } from '../src/controllers/extractionAnimation.js';
import { nextRivalAnnouncement } from '../src/logic/rivalAnnouncer.js';
let passed=0;
function check(name,value) { if(!value) throw new Error(name); passed++; }
let now=1000, loadouts=0, saved=[], lastPicker, played=[], resolver=()=>null, replayLoader=async()=>null;
// The match screen is presentation only; the stub records what it was told
// to show and hands back the callbacks a player's taps would call.
const challenges={made:[],shared:[],reported:[]};let tutorialDone=true;const dailies=[];dailies.submitted=[];let shareOutcome='sent';
let matchResolver=()=>Promise.resolve(null), searchPlanMs=3000, realApply=null;
// Shared runs go here instead of the network.
const sharedRuns=[];let shareAnswer=()=>Promise.resolve({ok:true});
const screens=[];
class StubMatchScreen{
  constructor(scene,opts){this.scene=scene;this.opts=opts;this.calls=[];this.destroyed=false;screens.push(this);}
  note(kind,o){this.calls.push(kind);this.last=kind;this[kind]=o;}
  showSearching(o){this.note('searching',o);}
  showUnavailable(o){this.note('unavailable',o);}
  showFound(o){this.note('found',o);}
  showLobby(o){this.note('lobby',o);}
  setCourse(slot){this.calls.push('course:'+slot);}
  tick(){}
  destroy(){this.destroyed=true;}
}
const source=readFileSync(new URL('../src/controllers/RivalsRace.js',import.meta.url),'utf8')
  .replace(/^import[\s\S]*?;\s*/gm,'').replace('export default class','class');
const bindings={
  nextRivalAnnouncement,
  trackScene:()=>{},
  ...rules, ...presets, ...capture, ...matchmaking,
  crewSigil:()=>null,completeRivalDistrict:()=>({applied:false}),
  rivalCityView:index=>({index}),drawCityMap:(s,o)=>{s.cityOptions=o;return {destroy(){s.cityDestroyed=true;}};},
  drawRivalDistrictMap:(s,m,r,o)=>{s.districtDraws=(s.districtDraws||0)+1;}, performance:{now:()=>now}, clearTimeout:()=>{},
  saveRivalResult:(result,record,runRecord)=>{saved.push({result,record,runRecord});return true;},
  resolveRivalOpponent:(race)=>resolver(race), noteRivalOutcome:()=>true, loadRivalReplay:(race)=>replayLoader(race), playRivalReplay:(scene,opts)=>{played.push(opts);return {end(){}};},
  showRunnerLoadout:(ui,done,options)=>{loadouts++;lastPicker={ui,done,options};},
  drawPowerIcon:()=>node(), AudioManager:{get:()=>({isMusicMuted:()=>false,isMuted:()=>false,setMusicMute(){},setMute(){}})},
  ReplaySystem:{finalize(){}},
  RivalMatchScreen:StubMatchScreen, findRivalMatch:(race,opts)=>{challenges.lastFind=opts;return matchResolver(race);}, applyRivalOffer:(...a)=>realApply(...a),
  planMatchSearch:()=>({band:'steady',revealMs:searchPlanMs}),
  // Real module: with no car in these stub scenes it fires its callback
  // immediately, so the flow assertions below stay synchronous.
  playExtraction,
  submitRivalRun:(p)=>{sharedRuns.push(p);return shareAnswer(p);}, getUserID:()=>'user-1', getCurrentUserSync:()=>({id:'local-1'}),
  createChallenge:(p)=>{challenges.made.push(p);return Promise.resolve({ok:true,id:'Ab3xY9kLmN',link:'https://t.me/PlugRunBot/play?startapp=c_Ab3xY9kLmN',text:'t',preparedId:'prep-1'});},
  shareChallenge:(c)=>{challenges.shared.push(c);return Promise.resolve(shareOutcome);},
  reportChallengeResult:(p)=>{challenges.reported.push(p);return Promise.resolve({ok:true});}, identityProof:()=>'init-data', hasCompletedTutorial:()=>tutorialDone,
  saveDailyResult:(n,r)=>{dailies.push({n,...r});const official=dailies.filter(d=>d.n===n).length===1;return {official,state:{streak:official?3:3,last:n,days:{}}};},
  saveDailyRank:(n,rank)=>{dailies.rank=rank;}, liveStreak:(st)=>st.streak, submitDaily:(b)=>{dailies.submitted.push(b);return Promise.resolve({ok:true,rank:7,total:90});}
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
    add:{rectangle:node,text:node,circle:node},scene:{restart:d=>restarts.push(d),start(){}},
    gameUI:{showModal:o=>{const modal={...o,destroy(){this.destroyed=true;}};modals.push(modal);return modal;}},roundOver:false,
    tweens:{add(config){return config;},killTweensOf(){}},
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
check('the rival finishing first does not end the race',state.status==='racing' && !state.result);
check('the rival finish is announced once',state.rivalFinishSeen===true && /FINISHED/.test(run.controller.notice.text));
check('the rival rail shows seven',run.controller.rows[1].label.text==='RIVAL 7/7');
// The player plays on, then quits from settings: a loss on their own clock.
run.controller.finish('forfeit',now);
check('quitting after the rival finished is a loss',state.status==='finished' && state.result==='loss');
check('finish stamps the player clock at the quit',state.finishedMs===70010&&state.finishedMs===rules.rivalElapsed(state,now));
check('pending retry cancelled at finish',run.events[0].removed);
check('result saved exactly once',saved.length===1);
run.controller.update();run.controller.finish('win',now);
check('late callbacks cannot change result',saved.length===1 && state.result==='loss');
check('partial race not offered as ghost',saved[0].record===null);
check('partial race has no exported run record',saved[0].runRecord===null);
check('death attempt captured as caught, resize as abandoned',state.capture.attempts.map(a=>a.outcome).join()==='extracted,caught,abandoned');
check('a generated pace is never dressed up as a rival who ran it',run.modals.at(-1).subtitle==='PACE TRIAL · NO RIVAL FOUND');

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
check('no rematch is offered',!run.modals.at(-1).buttons.some(b=>/rematch/i.test(b.label||'')));
run.modals.at(-1).buttons[0].onClick();
check('new race is the primary choice and drops the old clock',run.modals.at(-1).buttons[0].label==='NEW RACE' && !run.restarts.at(-1).rivalRace);
check('new race has no pinned seed',run.restarts.at(-1).rivalSeed===undefined);
check('new race lets matchmaking choose a random course',run.restarts.at(-1).rivalSlot===undefined);

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
const opponentRecord={stashSeed:42,stashRules:'match-v1',recordingID:'rec-x',clearTimes:[9000,18000,27000,36000,45000,54000,63000],retries:1,elapsedMs:63000,
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
check('a recorded rival finishing first leaves the race running',state.status==='racing' && state.rivalFinishSeen===true);
run.controller.finish('forfeit',now);
check('stopping after it is a loss on the player clock',state.result==='loss' && state.finishedMs===rules.rivalElapsed(state,now) && state.finishedMs>63000);
const result=run.modals.at(-1);
check('result uses only the rival label',result.title==='RIVAL WINS' && result.subtitle==='RIVAL · SEVEN HOUSES' && result.lines.some(l=>l.startsWith('Rival: 1:03.0')));
check('the result says nothing technical',!/recorded|bank|driver|bot/i.test(result.subtitle+' '+result.title));
check('watch button offered and keeps the modal',result.buttons[0].label.includes('WATCH RIVAL') && result.buttons[0].keepOpen===true);
check('saved result records the opponent',saved.at(-1).result.opponentKind==='recorded-bot' && saved.at(-1).result.recordingID==='rec-x');
const vis=[];const fakeModal={setVisible:v=>vis.push(v)};
state.opponentBundle={segments:[{house:1,attempt:1,startedMs:0,durationMs:1000,outcome:'extracted',replay:{durationMs:1000}}]};
result.buttons[0].onClick(fakeModal);
check('watch hides the modal and plays the bundle',vis.join()==='false' && played.length===1 && played[0].bundle===state.opponentBundle && played[0].opponentName==='RIVAL');
result.buttons[0].onClick(fakeModal);
check('second tap while watching ignored',played.length===1);
played[0].onDone();
check('leaving the replay restores the modal and the result',vis.join()==='false,true' && state.result==='loss' && state.status==='finished');
check('no rematch next to the replay either',!result.buttons.some(b=>/rematch/i.test(b.label||'')));
check('new race drops the opponent id',(result.buttons[1].onClick(),run.restarts.at(-1).rivalOpponentID===undefined && run.restarts.at(-1).rivalRecording===undefined));
// A recording batch stays on its course but starts every race as a new
// match: no stash seed is carried, so each variant draws its own answers.
state.recording=true;state.fixedPowers=['phase','dash'];state.hardLimitMs=60000;
const again=run.controller.harnessRestartData();
check('a recording restart keeps its course and options',again.rivalRecording===true&&again.rivalSeed===state.course.seed&&again.rivalPowers.join()==='phase,dash');
check('and carries no stash seed or rival id',!('stashSeed' in again)&&!('rivalStashSeed' in again)&&again.rivalOpponentID===undefined);
state.recording=false;
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
check('the rival finishing leaves settings open and the race on',state.status==='racing' && !settings.destroyed && run.controller.settingsOpen);
settings.buttons[3].onClick();
check('QUIT RACE after the rival finished is a loss',state.result==='loss' && state.finishedMs===70001 && !run.controller.settingsOpen);
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
const chooseBindings={...rules,...presets,...skill,console,setTimeout,clearTimeout,
  getSkillSamples:()=>({byScale:{},houses:0}),
  getUserID:()=> 'test-runner',localStorage:{getItem:()=> '[]',setItem:()=>{}},
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

// CALIBRATED SELECTION, END TO END
// The stub above hands the loader no skill samples, so it exercises only the
// legacy fallback. Here the player has real measured houses and the bank holds
// several eligible records, which is the path a real save takes.
const attemptsFor = perHouseMs => Array.from({ length: 7 }, (_, i) => ({
  house: i + 1, outcome: 'extracted', startedMs: i * 100000, endedMs: i * 100000 + perHouseMs
}));
const bankRecord = (id, perHouseMs) => ({
  stashSeed: 42, stashRules: 'match-v1',
  recordingID: id, clearTimes: [1, 2, 3, 4, 5, 6, 7].map(n => n * perHouseMs),
  retries: 1, elapsedMs: perHouseMs * 7, attempts: attemptsFor(perHouseMs),
  opponent: { kind: 'bot', displayName: 'BOT · ' + id, skillPreset: 'street' },
  orderedPowers: ['dash', 'phase']
});
// 5s through 12s per house; the player below sits at 8s.
const bank = [5000, 6000, 7000, 8000, 9000, 10000, 12000].map((ms, i) => ({
  record: bankRecord('rec-' + ms, ms), replay: 'replays/rec-' + ms + '.json'
}));
const playerSamples = { houses: 40, attempts: 46, deaths: 6, clearMs: 8000,
  byScale: Object.fromEntries(course.scales.map(sc => [sc, { scale: sc, houses: 6, clearMs: 8000 }])) };

let stored = {};
const calibratedBindings = { ...rules, ...presets, ...skill, console, setTimeout, clearTimeout,
  getSkillSamples: () => playerSamples,
  getUserID: () => 'calibrated-runner',
  localStorage: { getItem: k => stored[k] ?? null, setItem: (k, v) => { stored[k] = v; } },
  validateRivalRunRecord: () => ({ ok: true }), rivalRecordMatchesCourse: () => true,
  fetch: async () => ({ ok: true, text: async () => JSON.stringify({
    schemaVersion: 1, rulesVersion: rules.RIVAL_RULES_VERSION, opponents: bank }) }) };
const calibrated = new Function(...Object.keys(calibratedBindings),
  sessionSource + '\nreturn resolveRivalOpponent;')(...Object.values(calibratedBindings));

const bankSnapshot2 = JSON.stringify(bank);
let history = [];
calibratedBindings.localStorage.getItem = k => k.startsWith('pr_rivals_results')
  ? JSON.stringify(history) : (stored[k] ?? null);

const paired = { ...rules.newRivalRace(course, splits) };
check('calibrated loader resolves an opponent', await calibrated(paired) === true);
check('pairing lands near the player, not at the extremes',
  Math.abs(Number(paired.opponent.recordingID.split('-')[1]) - 8000) <= 2000);
check('the opponent carries a measured benchmark', Number.isFinite(paired.opponent.benchmarkMs));
check('the player estimate is reported, not the opponent pace',
  paired.playerSkill.clearMs === 8000 && paired.playerSkill.provisional === false);
check('calibration does not decorate the bank', JSON.stringify(bank) === bankSnapshot2);
check('calibration never locks the human pair', paired.fixedPowers == null);

// A named recording (tools and tests; players have no rematch) is the same race, every time.
const named = { ...rules.newRivalRace(course, splits), wantRecordingID: paired.opponent.recordingID };
await calibrated(named);
check('a named recording is returned', named.opponent.recordingID === paired.opponent.recordingID);
check('with its recorded times', named.rivalTimes.join() === paired.rivalTimes.join());

// Repeated searches rotate rather than serving one opponent forever.
const seen = new Set();
for (let i = 0; i < 6; i++) {
  history = [...seen].map(id => ({ courseID: course.id, recordingID: id }));
  const race = { ...rules.newRivalRace(course, splits) };
  await calibrated(race);
  seen.add(race.opponent.recordingID);
}
check('repeated searches do not serve one opponent forever', seen.size >= 3);

// Ineligible records never reach the pairing at all.
const ineligibleBindings = { ...calibratedBindings,
  validateRivalRunRecord: r => ({ ok: r.recordingID === 'rec-8000' }) };
const strict = new Function(...Object.keys(ineligibleBindings),
  sessionSource + '\nreturn resolveRivalOpponent;')(...Object.values(ineligibleBindings));
const onlyValid = { ...rules.newRivalRace(course, splits) };
await strict(onlyValid);
check('an invalid record is never paired', onlyValid.opponent.recordingID === 'rec-8000');

const noneBindings = { ...calibratedBindings, validateRivalRunRecord: () => ({ ok: false }) };
const empty = new Function(...Object.keys(noneBindings),
  sessionSource + '\nreturn resolveRivalOpponent;')(...Object.values(noneBindings));
const nothing = { ...rules.newRivalRace(course, splits) };
check('an empty eligible pool resolves to no rival', await empty(nothing) === false);
// It keeps its simulated splits and says so: that is the PACE TRIAL the result
// screen reports, never a recorded rival the player did not actually race.
check('no rival means no opponent is invented',
  !nothing.opponent && !nothing.opponentRecord && nothing.opponentKind === 'simulated-ai');

console.log(passed+' total rival flow assertions passed');

// ---------------------------------------------------------------------------
// Block Rivals match flow: block -> searching -> found -> selecting -> ready
// -> countdown -> racing. The rival comes first; the map and powers after;
// READY starts the countdown at once and races exactly what was shown.
// ---------------------------------------------------------------------------
{
  const sb={...chooseBindings,matchQuality:matchmaking.matchQuality};
  realApply=new Function(...Object.keys(sb),sessionSource+'\nreturn applyRivalOffer;')(...Object.values(sb));
}
const courseOne=rules.rivalPoolCourse(1),courseTwo=rules.rivalPoolCourse(2);
const lobbyRecord=(course,id,seed,powers)=>({stashSeed:seed,stashRules:'match-v1',recordingID:id,courseID:course.id,
  clearTimes:[9000,18000,27000,36000,45000,54000,63000],retries:0,elapsedMs:63000,orderedPowers:powers,
  attempts:Array.from({length:7},(_,i)=>({house:i+1,outcome:'extracted',startedMs:i*9000,endedMs:i*9000+8000})),
  opponent:{kind:'bot',displayName:'BOT · Ace',skillPreset:'ace',driverVersion:'botdriver-v2'},driverConfig:{driver:'jev-strategist',jev:{}}});
const makeMatch=()=>({id:'m1',pool:'ordinary',identity:{key:'jev@/rivals/jev-v1/',displayName:'Jev',kind:'jev'},playerSkill:null,offers:[
  {slot:1,courseID:courseOne.id,name:courseOne.name,course:courseOne,entry:{record:lobbyRecord(courseOne,'rec-one',111,['phase','dash']),replay:'replays/rec-one.json',root:'/rivals/jev-v1/'},orderedPowers:['phase','dash'],quality:null},
  {slot:2,courseID:courseTwo.id,name:courseTwo.name,course:courseTwo,entry:{record:lobbyRecord(courseTwo,'rec-two',222,['decoy','phase']),replay:'replays/rec-two.json',root:'/rivals/jev-v1/'},orderedPowers:['decoy','phase'],quality:null}]});
const cityRace=(extra={})=>({...rules.newRivalRace(courseOne,splits),rivalCityIndex:1,territoryIndex:1,territorySlot:1,pool:'ordinary',...extra});
let lookups=0,settle=null;
const pendingLookup=()=>{lookups++;return new Promise(r=>{settle=r;});};
const tick=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};

now=1000;
const entry=cityRace();
const oldLoadouts=loadouts, city=setup(entry);
check('normal rivalry opens the city first',city.scene.cityOptions.view.index===1&&loadouts===oldLoadouts);
check('city presentation claimed on race before resize',entry.cityIntroShown&&entry.entryStage==='block');
city.scene.cityOptions.onDone();
check('city lands on the seven-house block',city.scene.districtDraws===1&&city.modals.at(-1).buttons[0].label==='LOOK FOR MATCH');
check('nothing chosen and no search before LOOK FOR MATCH',loadouts===oldLoadouts&&!entry.matchSearch&&screens.length===0);
matchResolver=pendingLookup;searchPlanMs=3000;
const blockModal=city.modals.at(-1);
blockModal.buttons[0].onClick();
check('LOOK FOR MATCH starts searching at once',entry.entryStage==='searching'&&screens.length===1&&screens[0].last==='searching'&&lookups===1);
check('no map or power picker before a rival is found',loadouts===oldLoadouts&&!screens[0].lobby&&!screens[0].found);
check('the block screen closes behind the search',blockModal.destroyed===true);
check('search does not start the race clock',entry.status==='ready'&&entry.startedAt===null);
check('search keeps movement frozen',city.scene.roundPausedForMenu&&!city.scene.input.keyboard.enabled);
city.controller.startSearch();blockModal.buttons[0].onClick();
check('a second tap cannot start a second search',lookups===1&&screens.length===1&&screens[0].calls.filter(c=>c==='searching').length===1);
settle(makeMatch());await tick();
now=1000+2999;city.controller.update();
check('a rival found early still waits for the planned moment',entry.entryStage==='searching');
now=1000+3000;city.controller.update();
check('the rival is revealed at the planned moment',entry.entryStage==='found'&&screens[0].found?.name==='Jev');
check('nothing is raced yet',entry.status==='ready'&&!entry.opponentRecord&&entry.opponentKind==='simulated-ai');
city.controller.update();
check('the reveal happens once',screens[0].calls.filter(c=>c==='found').length===1);
screens[0].found.onDone();
check('then one lobby: the rival, their courses and your powers',entry.entryStage==='selecting'&&screens[0].lobby.state.name==='Jev'&&
  screens[0].lobby.state.offers.map(o=>o.slot).join()==='1,2'&&screens[0].lobby.state.rivalReady===true&&screens.length===1);
screens[0].found.onDone();
check('a late second reveal callback cannot reopen the lobby',screens[0].calls.filter(c=>c==='lobby').length===1);
screens[0].lobby.onReady(['phase']);
check('READY needs two powers',entry.status==='ready'&&entry.entryStage==='selecting');
screens[0].lobby.onCourse(99);
check('a course the rival never raced cannot be chosen',entry.lobby.slot===1);
screens[0].lobby.onCourse(2);screens[0].lobby.onPowers(['dash','decoy']);
check('choices are kept on the race',entry.lobby.slot===2&&entry.lobby.powers.join()==='dash,decoy'&&screens[0].calls.includes('course:2'));
// A phone rotating mid-lobby: the same lobby, no new search, no second reveal.
city.controller.resize();
const lobbyRestart=city.restarts.at(-1);
check('resize in the lobby restarts with the same race',lobbyRestart.rivalRace===entry&&entry.status==='ready');
city.controller.dispose();
check('the old screen is closed on shutdown',screens[0].destroyed);
check('sharing the run starts on in every lobby',screens[0].lobby.state.share===true&&entry.lobby.share===true);
screens[0].lobby.onShare(false);
check('the player can opt out for this race',entry.lobby.share===false);
const reopened=setup(lobbyRestart.rivalRace);
check('the choice survives a restart',screens[1].lobby.state.share===false);
check('the lobby reopens where it was',lookups===1&&screens.length===2&&screens[1].last==='lobby'&&screens[1].lobby.animate===false&&
  screens[1].lobby.state.slot===2&&screens[1].lobby.state.powers.join()==='dash,decoy'&&!screens[1].found);
now=20000;
screens[1].lobby.onReady(['dash','decoy']);
const raced=reopened.restarts.at(-1)?.rivalRace;
check('READY on another course builds that course',!!raced&&raced.course.id===courseTwo.id&&reopened.restarts.at(-1).pveRound===1&&reopened.restarts.at(-1).runKind==='rivals');
check('the countdown starts at once: no waiting for the rival',raced.status==='countdown'&&raced.countdownEndsAt===20000+rules.RIVAL_COUNTDOWN_MS);
check('the race runs exactly the offered record',raced.opponentRecord.recordingID==='rec-two'&&raced.rivalTimes.join()===raced.opponentRecord.clearTimes.join());
check('with its stash seed and its replay',raced.stashSeed===222&&raced.opponent.replayURL==='/rivals/jev-v1/replays/rec-two.json');
check('under the name the lobby showed',raced.opponent.displayName==='Jev'&&raced.opponent.identityKey==='jev@/rivals/jev-v1/');
check('with the chosen powers',raced.powers.join()==='dash,decoy'&&reopened.scene.runnerPowersSelected.join()==='dash,decoy');
check('and this block still the one being claimed',raced.territoryIndex===1&&raced.rivalCityIndex===1&&raced.territorySlot===1);
check('the stages walked in order',raced.entryStage==='countdown');
check('the opt-out rides READY into the race',raced.shareRun===false);
check('the lobby closed',screens[1].destroyed);
screens[1].lobby.onReady(['dash','decoy']);
check('a second READY does nothing',reopened.restarts.length===1);
const go=setup(raced);
check('the countdown survives the restart with no screen over it',screens.length===2&&raced.status==='countdown');
now=20000+rules.RIVAL_COUNTDOWN_MS;go.controller.update();
check('GO: racing',raced.status==='racing'&&raced.entryStage==='racing'&&go.starts()===1);
check('the HUD names the rival',go.controller.rows[1].label.text.startsWith('JEV '));
go.controller.dispose();

// The same course: the countdown starts in place, on the rival's stash seed.
now=30000;
{
  const race=cityRace({cityIntroShown:true,entryStage:'block'}),run=setup(race);
  const seedBefore=race.stashSeed;
  run.modals.at(-1).buttons[0].onClick();settle(makeMatch());await tick();
  now=33000;run.controller.update();screens.at(-1).found.onDone();
  now=34000;screens.at(-1).lobby.onReady(['phase','phase']);
  check('same course: no restart',run.restarts.length===0&&run.scene.rivalRace===race);
  check('same course: countdown now',race.status==='countdown'&&race.countdownEndsAt===34000+rules.RIVAL_COUNTDOWN_MS);
  check('same course: the offered record and its stash seed',race.opponentRecord.recordingID==='rec-one'&&race.stashSeed===111&&seedBefore!==111);
  check('same course: screen closed, world still frozen for the countdown',screens.at(-1).destroyed&&run.scene.roundPausedForMenu&&!run.scene.input.keyboard.enabled);
  run.controller.dispose();
}

// CANCEL mid-search: back to the block, and a late answer never lands.
{
  now=40000;const race=cityRace({cityIntroShown:true,entryStage:'block'}),run=setup(race);
  run.modals.at(-1).buttons[0].onClick();const screen=screens.at(-1);
  screen.searching.onCancel();
  check('cancel returns to the block',race.entryStage==='block'&&!race.matchSearch&&screen.destroyed&&run.modals.at(-1).buttons[0].label==='LOOK FOR MATCH');
  settle(makeMatch());await tick();now=60000;run.controller.update();
  check('a late answer after cancel does nothing',race.entryStage==='block'&&!race.match&&race.status==='ready');
  const before=lookups;run.modals.at(-1).buttons[0].onClick();
  check('and searching reopened is a new search',race.entryStage==='searching'&&lookups===before+1);
  run.controller.dispose();
}

// A resize mid-search keeps the same search: same start, one lookup.
{
  now=70000;const race=cityRace({cityIntroShown:true,entryStage:'block'}),run=setup(race);
  run.modals.at(-1).buttons[0].onClick();const before=lookups,started=race.matchSearch.startedAt;
  now=71000;run.controller.resize();run.controller.dispose();
  const back=setup(race);
  check('resize mid-search resumes the same search',race.entryStage==='searching'&&screens.at(-1).last==='searching'&&screens.at(-1).searching.startedAt===started&&lookups===before);
  settle(makeMatch());await tick();now=73000;back.controller.update();
  check('and it lands on schedule after the restart',race.entryStage==='found');
  back.controller.resize();back.controller.dispose();
  const mid=setup(race);
  check('a restart during the reveal goes straight to the lobby',race.entryStage==='selecting'&&screens.at(-1).last==='lobby'&&!screens.at(-1).found);
  mid.controller.dispose();
}

// Nobody eligible: a clean way on, never a stand-in rival.
{
  now=80000;const race=cityRace({cityIntroShown:true,entryStage:'block'}),run=setup(race);
  searchPlanMs=700;run.modals.at(-1).buttons[0].onClick();settle(null);await tick();
  now=80000+matchmaking.MATCH_EMPTY_MIN_MS-1;run.controller.update();
  check('an empty search still looks for a while',race.entryStage==='searching');
  now=80000+matchmaking.MATCH_EMPTY_MIN_MS;run.controller.update();
  check('then says nobody was found',race.entryStage==='unavailable'&&screens.at(-1).last==='unavailable'&&!race.opponentRecord&&race.status==='ready');
  const before=lookups;screens.at(-1).unavailable.onRetry();
  check('SEARCH AGAIN searches reopened',race.entryStage==='searching'&&lookups===before+1);
  settle(null);await tick();now+=10000;run.controller.update();screens.at(-1).unavailable.onBack();
  check('BACK returns to the block',race.entryStage==='block'&&run.modals.at(-1).buttons[0].label==='LOOK FOR MATCH');
  // A lookup that never answers ends at the cap; a late answer is ignored.
  searchPlanMs=3000;now=100000;run.modals.at(-1).buttons[0].onClick();
  now=100000+matchmaking.MATCH_SEARCH_CAP_MS-1;run.controller.update();
  check('a hung lookup keeps searching up to the cap',race.entryStage==='searching');
  now=100000+matchmaking.MATCH_SEARCH_CAP_MS;run.controller.update();
  check('and gives up at ten seconds',race.entryStage==='unavailable');
  settle(makeMatch());await tick();now+=5000;run.controller.update();
  check('an answer after the cap is ignored',race.entryStage==='unavailable'&&!race.match);
  run.controller.dispose();
}

// LEAVE from the lobby lets the rival go.
{
  now=120000;searchPlanMs=1000;const race=cityRace({cityIntroShown:true,entryStage:'block'}),run=setup(race);
  run.modals.at(-1).buttons[0].onClick();settle(makeMatch());await tick();now=121000;run.controller.update();screens.at(-1).found.onDone();
  screens.at(-1).lobby.onLeave();
  check('LEAVE returns to the block and drops the match',race.entryStage==='block'&&!race.match&&!race.lobby&&screens.at(-1).destroyed&&race.status==='ready');
  screens.at(-1).lobby.onReady(['phase','dash']);
  check('a READY after leaving does nothing',race.status==='ready'&&!race.opponentRecord);
}
console.log('Rivals match flow: '+passed+' total assertions passed');

// One request per bank (the style bots and Jev); both must settle.
const pendingFetches=[];let requests=0;
const finishOpponents=(res)=>pendingFetches.splice(0).forEach(r=>r(res));
const delayedBindings={...chooseBindings,fetch:()=>{requests++;return new Promise(r=>{pendingFetches.push(r);});}};
const delayedResolve=new Function(...Object.keys(delayedBindings),sessionSource+';return resolveRivalOpponent;')(...Object.values(delayedBindings));
const shared=rules.newRivalRace(rules.rivalPoolCourse(1),splits);
const lookup=delayedResolve(shared),afterResize=delayedResolve(shared);
check('resize shares pending opponent lookup',lookup===afterResize&&requests===2);
finishOpponents({ok:true,text:async()=>JSON.stringify({schemaVersion:1,rulesVersion:rules.RIVAL_RULES_VERSION,opponents:[{record:opponentRecord,replay:null}]})});
await lookup;
check('shared lookup settles and clears pending',shared.opponentPending===null&&shared.opponentKind==='recorded-bot');
check('carousel display does not expose implementation labels',city.controller.rivalDisplayName('BOT · Street')==='RIVAL · Street');
console.log('Rivals async continuity: '+passed+' total assertions passed');

// --- death recovery: choose a different mix, never pause/reset the race ---
now=1000;let recoveryState={...rules.newRivalRace(course,splits),status:'racing',startedAt:0,powers:['phase','dash']};
let recovery=setup(recoveryState,1);
recovery.scene.attacker={hp:0};
recovery.controller.retryHouse();recovery.events.at(-1).fn();
let recoveredData=recovery.restarts.at(-1);now=1700;recovery=setup(recoveredData.rivalRace,1);
recovery.scene.attacker={hp:0};recovery.controller.retryHouse();
check('second death offers retry or switch',recovery.modals.at(-1).buttons.map(b=>b.label).join()==='RETRY HOUSE,SWITCH POWERS');
check('choice keeps clock origin and racing status',recoveryState.startedAt===0&&recoveryState.status==='racing'&&recoveryState.retries===2);
check('choice freezes dead house without pending auto-retry',recovery.scene.roundOver&&recovery.controller.transitioning&&recovery.events.length===0);
now=3000;recovery.controller.update();
check('time keeps increasing while choice open',rules.rivalElapsed(recoveryState,now)===3000);
recovery.modals.at(-1).buttons[1].onClick();
check('retry picker is editable and prefilled',!lastPicker.options.fixedPowers&&lastPicker.options.initialPowers.join()==='phase,dash');
check('retry picker warns clock keeps running',lastPicker.options.subtitle==='Race clock keeps running.');
now=4000;recovery.scene.runnerPowersSelected=['decoy','phase'];lastPicker.done();
check('switch commits new ordered mix',recoveryState.powers.join()==='decoy,phase');
check('switch retains origin and existing death count',recoveryState.startedAt===0&&recoveryState.retries===2);
check('switch clears persistent modal markers',!recoveryState.retryChoiceHouse&&!recoveryState.retryMixHouse);
recovery.events.at(-1).fn();recoveredData=recovery.restarts.at(-1);now=4700;
recovery=setup(recoveredData.rivalRace,1);
check('switch retries identical house and course',recoveredData.pveRound===1&&recoveredData.rivalRace.course===course);
check('new attempt uses new mix with fresh slots',recovery.scene.runnerPowersSelected.join()==='decoy,phase'&&recovery.scene.runnerPowersConsumed.join()==='false,false');
check('capture remembers initial mix plus current attempt mix',recoveryState.capture.initialPowers.join()==='phase,dash'&&recoveryState.capture.current.orderedPowers.join()==='decoy,phase');
check('mix selection time is charged to retry',recoveryState.capture.current.startedMs===4700);
now=5000;recovery.scene.attacker={hp:0};recovery.controller.retryHouse();
const choiceState=recoveryState;
recovery.controller.resize();
check('resize preserves pending retry choice without another death',choiceState.retries===3&&recovery.restarts.at(-1).rivalRace.retryChoiceHouse===1);
now=5200;recovery=setup(choiceState,1);
check('reload restores recovery instead of starting attempt',recoveryState.capture.current===null&&recovery.modals.at(-1).buttons[1].label==='SWITCH POWERS');
recovery.modals.at(-1).buttons[1].onClick();now=70001;recovery.controller.update();
check('the rival finishing leaves the retry picker up and the race on',recoveryState.status==='racing'&&recoveryState.rivalFinishSeen===true);
recovery.scene.runnerPowersSelected=['phase','decoy'];lastPicker.done();
check('the player can still retry after the rival finished',recoveryState.powers.join()==='phase,decoy'&&recovery.events.some(e=>e.delay===rules.RIVAL_RETRY_MS&&!e.removed));
recovery.controller.finish('forfeit',now);
check('quitting then is a loss and cancels the retry',recoveryState.result==='loss'&&recovery.events.every(e=>e.delay!==rules.RIVAL_RETRY_MS||e.removed));
lastPicker.done();
check('late picker cannot restart finished race',recovery.restarts.length===0&&recoveryState.status==='finished');

now=1000;const automated={...rules.newRivalRace(course,splits),status:'racing',startedAt:0,powers:['decoy','dash'],recording:true,houseRetries:{1:10}};
const automatedRun=setup(automated,1);automatedRun.scene.attacker={hp:0};automatedRun.controller.retryHouse();
check('existing recording jobs never stall on recovery UI',automatedRun.events.length===1&&!automated.retryChoiceHouse);
console.log('Rivals power recovery: '+passed+' total assertions passed');

const mixedSummary=rules.rivalRecord({...rules.newRivalRace(course,splits),powers:['decoy','phase'],clearTimes:splits,
  capture:{initialPowers:['phase','dash'],attempts:[{house:1,attempt:1,orderedPowers:['phase','dash']},{house:1,attempt:2,orderedPowers:['decoy','phase']}]}});
check('local race summary also retains initial mix',mixedSummary.powers.join()==='phase,dash');
check('local summary exposes actual changed attempt mix',mixedSummary.attemptPowers[1].powers.join()==='decoy,phase');
console.log('Rivals mixed summary: '+passed+' total assertions passed');

// ---------------------------------------------------------------------------
// Block Rivals plays the getaway instead of cutting to the card.
//
// Rivals used to call freeze() + removeCarryPackage() and jump straight to
// "NEXT HOUSE" the moment the extraction sensor tripped, so the run appeared
// to break off mid-escape. It now runs the same animation the campaign does.
// The race clock is raw wall time, so the time the animation costs is credited
// back -- the recorded opponents only ever paid RIVAL_TRANSITION_MS between
// houses (rivals.js), and watching the getaway must not lose you the race.
{
  const tweens=[],events=[],restarts=[];
  const raceState=rules.newRivalRace(rules.rivalCourse(91),[10000,20000,30000,40000,50000,60000,70000]);
  const car={x:200,y:300,_outline:[]};
  const scene={rivalRace:raceState,pveRound:1,cell:24,seed:5,pad:{x:0,y:0},
    grid:Array.from({length:35},()=>Array(16).fill(0)),scale:{gameSize:{width:390,height:844}},
    input:{keyboard:{enabled:true}},events:{once(){}},roundOver:false,
    car,carOutDir:{x:1,y:0},carLights:null,
    attacker:{active:true,x:180,y:300,setVisible(){this.hidden=true;return this;}},
    removeCarryPackage(){this.packageRemoved=true;},
    finalizeRun(){},forensics:null,
    add:{rectangle:node,text:node,circle:node,graphics(){return {setDepth(){return this;},lineStyle(){return this;},lineBetween(){return this;}};}},
    scene:{restart:d=>restarts.push(d),start(){}},
    gameUI:{showModal:o=>({...o,destroy(){}})},
    tweens:{add(config){tweens.push(config);return config;}},
    time:{delayedCall:(delay,fn)=>{const e={delay,fn,remove(){}};events.push(e);return e;}}
  };
  scene.gameUI.scene=scene;
  const controller=new Race(scene);
  controller.prepare(()=>{});
  scene.runnerPowersSelected=['phase','dash'];
  lastPicker.done();
  now=4000;controller.update();
  check('rivals getaway: race running',scene.rivalRace.status==='racing');

  now=9000;controller.clearHouse();
  check('clear time recorded before the animation',scene.rivalRace.clearTimes[0]===5000);
  check('getaway animates rather than cutting away',tweens.length===1);
  check('no house transition until the getaway finishes',events.length===0);

  // Runner is pulled into the car.
  now=9400;tweens[0].onComplete();
  check('runner boards the car',scene.attacker.hidden===true && scene.packageRemoved===true);
  check('car departure follows the boarding',tweens.length===2);
  check('still no transition mid-getaway',events.length===0);

  // Car leaves frame.
  now=10000;tweens[1].onComplete();
  check('transition scheduled once the car is gone',events.length===1 && events[0].delay===rules.RIVAL_TRANSITION_MS);
  const credited=scene.rivalRace;
  check('animation time credited back to the clock',credited.startedAt===4000+1000);
  check('recorded clear time untouched by the credit',credited.clearTimes[0]===5000);
  check('watching the getaway costs no race time',rules.rivalElapsed(credited,10000)===5000);
}
console.log('rivals getaway animation: assertions passed');

// The result scoreboard: you and the rival in your HUD colours, the margin on
// a win, the block claim, and the block map keeps the rest of the space.
{
  const board=(extra)=>{
    const texts=[];
    const state={...rules.newRivalRace(course,splits),status:'finished',rivalCityIndex:1,opponentKind:'recorded-bot',
      opponent:{displayName:'Jev',retries:2},retries:1,...extra};
    const run=setup(state);
    run.scene.add.text=(x,y,v,style)=>{const o=node(x,y);o.text=v;o.style=style;texts.push(o);return o;};
    const area={x:16,y:100,width:358,height:540};
    run.controller.drawResultTimes({contentBounds:area,registerExtra:()=>{}});
    const find=v=>texts.find(t=>t.text===v);
    return {texts,find,area};
  };
  const won=board({result:'win',clearTimes:[8000,16000,24000,32000,40000,48000,58000],finishedMs:58000,territoryClaim:{applied:true}});
  check('scoreboard: your time in your blue',won.find('YOU')?.style.color==='#9bcae5'&&won.find('0:58.0')?.style.color==='#9bcae5');
  check('scoreboard: the rival\'s time in its gold',won.find('JEV')?.style.color==='#dec386'&&won.find('1:10.0')?.style.color==='#dec386');
  check('scoreboard: both times are large',won.find('0:58.0').style.fontSize===won.find('1:10.0').style.fontSize&&parseInt(won.find('0:58.0').style.fontSize)>=26);
  check('scoreboard: retries under each time',!!won.find('7/7 · 1 RETRY')&&!!won.find('7/7 · 2 RETRIES'));
  check('scoreboard: the winning margin',!!won.find('YOU BY 12.0s'));
  check('scoreboard: the block claim, and no promise of a next block',!!won.find('BLOCK CLAIMED')&&!won.texts.some(t=>/NEXT/.test(t.text)));
  check('scoreboard: the map keeps the rest',won.area.y>100&&won.area.y+won.area.height===640&&won.area.height>300);
  const lost=board({result:'loss',clearTimes:[8000,16000,24000,32000,40000],finishedMs:70000});
  check('scoreboard: a loss shows your houses against the rival time',!!lost.find('5/7')&&!!lost.find('HOUSES')&&!!lost.find('1:10.0'));
  check('scoreboard: no margin and no claim after an unfinished loss',!lost.texts.some(t=>/ BY |CLAIMED/.test(t.text)));
  const playedOut=board({result:'loss',clearTimes:[9000,19000,29000,39000,49000,59000,82000],finishedMs:82000});
  check('scoreboard: a played-out loss shows your time and the rival margin in its gold',!!playedOut.find('1:22.0')&&playedOut.find('JEV BY 12.0s')?.style.color==='#dec386');
}
console.log('rival result scoreboard: '+passed+' total assertions passed');

// Sharing a finished race: only when opted in, only a complete race.
{
  const race7=(share,{resizeAt=0}={})=>{
    now=1000;let st={...rules.newRivalRace(course,splits),status:'racing',startedAt:0,powers:['dash','dash'],shareRun:share,rivalCityIndex:1};
    let r=setup(st);
    for(let house=1;house<=7;house++){
      if(house===resizeAt){
        now=house*9000-4000;r.controller.resize();r.events[0].fn();const d=r.restarts[0];now+=700;r=setup(d.rivalRace,d.pveRound);
      }
      now=house*9000;r.controller.clearHouse();st=r.scene.rivalRace;
      if(house<7){r.events[0].fn();const d=r.restarts[0];now+=180;r=setup(d.rivalRace,d.pveRound);}
    }
    return {st,r};
  };
  sharedRuns.length=0;
  const shared=race7(true);
  check('a finished race the player opted to share is sent once',sharedRuns.length===1&&shared.st.result==='win');
  check('with its seven clears and full replay',sharedRuns[0].record.clearTimes.length===7&&sharedRuns[0].bundle.segments.length===7&&sharedRuns[0].userIds.join()==='local-1,user-1'&&sharedRuns[0].localId==='local-1');
  check('the result says it is being shared',shared.st.shareStatus==='sending');
  await Promise.resolve();await Promise.resolve();await Promise.resolve();
  check('then that it was',shared.st.shareStatus==='shared');
  sharedRuns.length=0;
  race7(false);
  check('a race the player did not opt in for is never sent',sharedRuns.length===0);
  sharedRuns.length=0;
  now=1000;const quit={...rules.newRivalRace(course,splits),status:'racing',startedAt:0,powers:['dash','dash'],shareRun:true,rivalCityIndex:1};
  const q=setup(quit);q.controller.finish('forfeit',5000);
  check('an unfinished race is not sent, and the result says so',sharedRuns.length===0&&quit.shareStatus==='unfinished');
  check('an unfinished race reads UNFINISHED',q.controller.shareLabel()==='RUN NOT SHARED · UNFINISHED');
  sharedRuns.length=0;
  const resized=race7(true,{resizeAt:3});
  check('a resize mid-house still lets the race finish all seven',resized.st.clearTimes.length===7&&resized.st.retries===1);
  check('a finished race with a resize reset is not sent',sharedRuns.length===0&&resized.st.shareStatus==='resized');
  check('and the result says it was the resize, not an unfinished race',resized.r.controller.shareLabel()==='RUN NOT SHARED · RESIZED MID-RACE');
  shareAnswer=()=>Promise.resolve({ok:false,error:'identity not recognised'});
  const refused=race7(true);
  await Promise.resolve();await Promise.resolve();await Promise.resolve();
  check('a refused share is reported as not shared, with why',refused.st.shareStatus==='failed'&&refused.st.shareWhy==='NO PLAYER ID');
  shareAnswer=()=>Promise.resolve({ok:true});
}
console.log('rival run sharing: '+passed+' total assertions passed');

// Challenges: a finished race against a recorded rival can be sent to a friend;
// a challenge race matches only its own course and reads the friend's time.
{
  const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
  const finished=(extra)=>{
    now=1000;let st={...rules.newRivalRace(course,splits),status:'racing',startedAt:0,powers:['dash','dash'],opponentKind:'recorded-bot',
      opponent:{displayName:'Jev',recordingID:'rec-jev-1',retries:0},stashSeed:4242,...extra};
    let r=setup(st);
    for(let house=1;house<=7;house++){now=house*9000;r.controller.clearHouse();st=r.scene.rivalRace;
      if(house<7){r.events[0].fn();const d=r.restarts[0];now+=180;r=setup(d.rivalRace,d.pveRound);}}
    return {st,r,modal:r.modals.at(-1)};
  };
  const a=finished({});
  const btn=a.modal.buttons[0];
  check('a finished race offers CHALLENGE A FRIEND first',btn.label==='CHALLENGE A FRIEND'&&btn.variant==='primary'&&btn.keepOpen===true);
  check('and NEW RACE steps back to secondary',a.modal.buttons.find(b=>b.label==='NEW RACE')?.variant==='secondary');
  const label={text:'',setText(t){this.text=t;return this;}};btn.bindText(label);
  btn.onClick(a.modal);btn.onClick(a.modal);
  check('the button says it is working',label.text==='PREPARING…');
  await flush();
  const spec=challenges.made[0]?.challenge;
  check('one challenge created per tap, with this race',challenges.made.length===1&&spec.slot===course.slot&&spec.stashSeed===4242&&spec.recordingID==='rec-jev-1'&&spec.ms===Math.round(a.st.finishedMs));
  check('it carries Telegram proof for the share card',challenges.made[0].initData==='init-data'&&challenges.made[0].userId==='user-1');
  check('then opens the share dialog with the prepared card',challenges.shared[0]?.preparedId==='prep-1');
  check('and says it went',label.text==='CHALLENGE SENT');
  const unfinished=setup({...rules.newRivalRace(course,splits),status:'racing',startedAt:0,powers:['dash','dash'],opponentKind:'recorded-bot',opponent:{displayName:'Jev',recordingID:'r'}});
  unfinished.controller.finish('forfeit',5000);
  check('an unfinished race cannot be sent as a challenge',!unfinished.modals.at(-1).buttons.some(b=>b.label==='CHALLENGE A FRIEND'));
  const pace=finished({opponentKind:'generated',opponent:null});
  check('a pace trial (no real rival) cannot be sent',!pace.modal.buttons.some(b=>b.label==='CHALLENGE A FRIEND'));
  // The friend's side.
  const ch={id:'Ab3xY9kLmN',name:'Sam',ms:70000,rivalName:'JEV'};
  const b=finished({challenge:ch});await flush();
  check('a challenge race reports its result once',challenges.reported.length===1&&challenges.reported[0].id==='Ab3xY9kLmN'&&challenges.reported[0].houses===7);
  check('and reads against the friend',b.modal.lines[0]==='YOU BEAT SAM BY '+((70000-b.st.finishedMs)/1000).toFixed(1)+'s');
  const slow=finished({challenge:{...ch,ms:30000}});
  check('or says the friend still leads',/^SAM STILL LEADS BY /.test(slow.modal.lines[0]));
  // Matching: a challenge only searches its own course.
  const m=setup({...rules.newRivalRace(course,splits),challenge:ch});
  m.scene.rivalRace.entryStage='block';m.controller.startSearch();
  check('a challenge searches only its course',challenges.lastFind?.courses?.length===1&&challenges.lastFind.courses[0]===course);
  const n=setup({...rules.newRivalRace(course,splits)});n.scene.rivalRace.entryStage='block';n.controller.startSearch();
  check('an ordinary race searches as before',challenges.lastFind===undefined);
}
console.log('rival challenges: '+passed+' total assertions passed');

// Quick start: a player who never did the tutorial is told how to run, once.
{
  tutorialDone=false;const before=loadouts;
  const q=setup({...rules.newRivalRace(course,splits)});
  const card=q.modals.at(-1);
  check('a newcomer gets HOW TO RUN before the race',card?.title==='HOW TO RUN'&&card.lines.length===5&&loadouts===before);
  check('with touch controls on a phone',/Swipe/.test(card.lines[0])&&/Double-tap/.test(card.lines[3]));
  card.buttons[0].onClick();
  check('GOT IT carries on into the race',loadouts===before+1);
  const again=setup(q.scene.rivalRace);
  check('never twice in one race',again.modals.every(m=>m.title!=='HOW TO RUN'));
  tutorialDone=true;
  const vet=setup({...rules.newRivalRace(course,splits)});
  check('a player who did the tutorial goes straight in',vet.modals.every(m=>m.title!=='HOW TO RUN'));
}
console.log('rivals quick start: '+passed+' total assertions passed');

// Daily Race: the first finish of the day is official, submitted, and says so.
{
  const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
  const run=(extra)=>{
    now=1000;let st={...rules.newRivalRace(course,splits),status:'racing',startedAt:0,powers:['dash','dash'],opponentKind:'recorded-bot',opponent:{displayName:'Jev',recordingID:'rec-d'},daily:12,...extra};
    let r=setup(st);
    for(let house=1;house<=7;house++){now=house*9000;r.controller.clearHouse();st=r.scene.rivalRace;
      if(house<7){r.events[0].fn();const d=r.restarts[0];now+=180;r=setup(d.rivalRace,d.pveRound);}}
    return {st,modal:r.modals.at(-1)};
  };
  const first=run({});await flush();
  check('the first daily finish is official and says the streak',first.modal.lines[0]==='DAILY #12 · OFFICIAL · 🔥 3 DAYS');
  check('it is submitted once for a rank',dailies.submitted.length===1&&dailies.submitted[0].day===12&&dailies.submitted[0].houses===7&&dailies.rank===7);
  check('and can still be sent as a challenge, marked daily',first.modal.buttons[0].label==='CHALLENGE A FRIEND');
  const second=run({});await flush();
  check('a second run the same day is a practice run and is not submitted',second.modal.lines[0]==='DAILY #12 · PRACTICE RUN'&&dailies.submitted.length===1);
}
console.log('rivals daily race: '+passed+' total assertions passed');
