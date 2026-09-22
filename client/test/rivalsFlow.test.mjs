// Exercise the scene adapter without loading Phaser or the browser dependency graph.
import { readFileSync } from 'node:fs';
import * as baseRules from '../src/logic/rivals.js';
const rules = { ...baseRules, newRivalRace: (course, times) => baseRules.newRivalRace(course, times, { stashSeed: 42 }) };
import * as presets from '../src/logic/rivalPresets.js';
import * as skill from '../src/logic/rivalSkill.js';
import * as capture from '../src/controllers/RivalReplayCapture.js';
import * as matchmaking from '../src/logic/rivalMatchmaking.js';
import { playExtraction } from '../src/controllers/extractionAnimation.js';
let passed=0;
function check(name,value) { if(!value) throw new Error(name); passed++; }
let now=1000, loadouts=0, saved=[], lastPicker, played=[], resolver=()=>null, replayLoader=async()=>null;
const source=readFileSync(new URL('../src/controllers/RivalsRace.js',import.meta.url),'utf8')
  .replace(/^import[\s\S]*?;\s*/gm,'').replace('export default class','class');
const bindings={
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
  // Real module: with no car in these stub scenes it fires its callback
  // immediately, so the flow assertions below stay synchronous.
  playExtraction
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
check('background catchup resolves opponent finish',state.status==='finished' && state.result==='loss');
check('finish stamps rival exact time not late frame',state.finishedMs===70000);
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
check('recorded rival finishing first is a loss at its recorded time',state.result==='loss' && state.finishedMs===63000);
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
// The search runs a varied minimum (2.4-4.2s) before landing, so the clock
// moves with each scheduled step here.
const shownDuringSearch=[];
for(let i=0;i<80&&entry.status!=='countdown';i++){
  const card=city.controller.searchCard;if(card?.text)shownDuringSearch.push(card.text);
  now+=city.events.at(-1).delay||100;city.events.at(-1).fn();
}
check('opponent reveal starts countdown automatically',entry.status==='countdown'&&loadouts===oldLoadouts+1&&entry.powers.join()==='dash,decoy');
check('the search ran its minimum before landing',now-1000>=2400);
check('the found card names the rival the race is against',
  shownDuringSearch.some(t=>t.startsWith(city.controller.rivalDisplayName(entry.opponent?.displayName||'PACE TRIAL'))||t.startsWith('PACE TRIAL')));
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
check('opponent can win while retry picker open',recoveryState.status==='finished'&&recoveryState.result==='loss');
lastPicker.done();
check('late picker cannot restart finished race',recovery.restarts.length===0&&recoveryState.powers.join()==='decoy,phase');

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
    add:{rectangle:node,text:node,graphics(){return {setDepth(){return this;},lineStyle(){return this;},lineBetween(){return this;}};}},
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
