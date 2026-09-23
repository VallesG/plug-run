import { crewSigil } from '../logic/crewSigils.js';
import { trackScene } from '../utils/analytics.js';
import { rivalCityView, completeRivalDistrict, getRivalTerritory } from '../utils/rivalCityProgress.js';
import { drawCityMap } from './CityMap.js';
import { drawRivalDistrictMap } from './RivalDistrictMap.js';
import {
  RIVAL_HOUSES, RIVAL_COUNTDOWN_MS, RIVAL_TRANSITION_MS, RIVAL_RETRY_MS,
  rivalElapsed, rivalProgress, rivalFinalOutcome, rivalHasFinished, recordRivalClear, rivalTimeLabel, rivalRecord, nextRivalSlot, rivalHudLayout,
  rivalHouseFill, rivalPickupWindows, rivalCarryingAt, rivalFloorClock, rivalSettingsSpot, validRivalPowers
} from '../logic/rivals.js';
import { saveRivalResult, resolveRivalOpponent, loadRivalReplay, noteRivalOutcome, findRivalMatch, applyRivalOffer } from '../utils/rivalSession.js';
import { advanceMatch, planMatchSearch, matchSettleAt, MATCH_SEARCH_CAP_MS, rivalShortName } from '../logic/rivalMatchmaking.js';
import { RivalMatchScreen } from './RivalMatchScreen.js';
import { playRivalReplay } from './RivalReplayPlayer.js';
import { playExtraction } from './extractionAnimation.js';
import { showRunnerLoadout } from './RunnerLoadout.js';
import ReplaySystem from './ReplaySystem.js';
import { drawPowerIcon } from './PowerIcons.js';
import AudioManager from '../audio/AudioManager.js';
import { beginRaceCapture, beginAttemptCapture, tickAttemptCapture, endAttemptCapture, exportRaceCapture } from './RivalReplayCapture.js';

// This session only, never saved: the last few search lengths (so the next
// search does not repeat them) and the last mix taken into a race (the lobby
// starts on it).
const recentSearches = [];
let lastLobbyPowers = null;

// Scene adapter. Race state survives house restarts; Phaser objects never do.
export default class RivalsRace {
  constructor(scene) {
    this.scene = scene;
    this.race = scene.rivalRace;
    this.objects = [];
    this.transitioning = false;
    this.disposed = false;
    scene.events.once('shutdown', () => this.dispose());
  }
  setRace(race) { this.race = race; this.scene.rivalRace = race; }
  prepare(startTimer) {
    this.startTimer = startTimer;
    this.drawHUD();
    this.preparePickupProgress();
    if (this.race.status === 'finished') { this.freeze(); this.showResult(); return; }
    if (this.race.status === 'racing') {
      if (this.race.retryMixHouse === this.scene.pveRound) this.openRetryMix();
      else if (this.race.retryChoiceHouse === this.scene.pveRound) this.showRetryChoice();
      else this.resumeHouse();
      return;
    }
    this.scene.roundPausedForMenu = true;
    this.scene.input.keyboard.enabled = false;
    if (this.race.status === 'countdown') return;
    this.scene.suspendTouchUI?.(true);
    if(this.race.rivalCityIndex){
      // A restart mid-match reopens the same stage; it never skips one.
      if(['searching','unavailable','found','selecting'].includes(this.race.entryStage)){this.resumeMatch();return;}
      this.race.entryStage='block';
      if(!this.race.cityIntroShown){
        this.race.cityIntroShown=true;
        try{this.cityIntro=drawCityMap(this.scene,{
          view:rivalCityView(this.race.rivalCityIndex),
          checkpoint:{blockIndex:this.race.rivalCityIndex,pveRound:1},
          onDone:()=>{this.cityIntro=null;if(!this.disposed)this.openDistrict();}
        });}catch(error){console.warn('[Rivals city] Intro unavailable',error);this.openDistrict();}
      }else this.openDistrict();
      return;
    }
    // Resolve the rival first so the picker can show their actual mix.
    // The player chooses independently; synchronous null needs no wait.
    const pending = resolveRivalOpponent(this.race);
    if (pending && typeof pending.then === 'function') {
      this.notice?.setText('FINDING RIVAL');
      pending.catch(() => false).then(() => { if (!this.disposed) { this.notice?.setText(''); this.openLoadout(); } });
      return;
    }
    this.openLoadout();
  }
  openDistrict(){
    if(this.disposed||this.race.status!=='ready')return;
    const modal=this.scene.gameUI.showModal({
      fullScreen:true,title:this.race.course.name.toUpperCase(),
      subtitle:'BLOCK RIVALS · SEVEN HOUSES · ONE RACE',
      lines:[],buttons:[
        {label:'LOOK FOR MATCH',variant:'primary',onClick:()=>this.startSearch()},
        {label:'MAIN MENU',variant:'secondary',onClick:()=>this.scene.scene.start('MENU')}
      ]
    });
    this.entryModal=modal;
    drawRivalDistrictMap(this.scene,modal,this.race);
  }
  // -------------------------------------------------------------------------
  // The match. race.entryStage walks block -> searching -> found -> selecting
  // -> ready -> countdown -> racing (logic/rivalMatchmaking.js), one legal step
  // at a time, and lives on the race: a restart (resize, rotation) reopens the
  // same stage, and a stale callback finds the stage moved on and does nothing.
  // Search, reveal and lobby are one opaque screen (RivalMatchScreen); the
  // house underneath is first seen when READY starts the countdown.
  //
  // What is shown is what is raced: the rival named in the lobby is the one
  // whose record READY applies, on the course picked, with that record's stash
  // seed, times and replay (utils/rivalSession.findRivalMatch/applyRivalOffer).
  // -------------------------------------------------------------------------
  matchScreen(){
    // The block screen's button resumes touch as it closes; the match screen
    // keeps the world frozen and the touch controls away until GO.
    this.scene.roundPausedForMenu=true;this.scene.input.keyboard.enabled=false;
    this.scene.suspendTouchUI?.(true);
    if(!this.screen||this.screen.destroyed)this.screen=new RivalMatchScreen(this.scene,{home:this.race.course,gangID:this.race.territoryGang,labels:{
      overline:'BLOCK RIVALS',you:'YOU',vs:'VS',rival:'RIVAL',ready:'READY',notReady:'NOT READY',
      finding:'FINDING RIVAL',found:'RIVAL FOUND',none:'NO RIVAL FOUND',cancel:'CANCEL',back:'BACK',retry:'SEARCH AGAIN',
      leave:'LEAVE',opens:'RIVAL OPENS',yours:'YOUR POWERS',empty:'EMPTY',pick:'PICK TWO POWERS'}});
    return this.screen;
  }
  closeMatchScreen(){this.screen?.destroy();this.screen=null;}
  startSearch(){
    const race=this.race;
    if(this.disposed||race.status!=='ready'||!advanceMatch(race,'searching'))return;
    this.entryModal?.destroy?.({resumeTouch:false});this.entryModal=null;
    const plan=planMatchSearch({recent:recentSearches});
    recentSearches.push(plan.band);recentSearches.splice(0,Math.max(0,recentSearches.length-4));
    const search={startedAt:performance.now(),revealMs:plan.revealMs,loadedAt:null,match:null};
    race.matchSearch=search;race.match=null;race.lobby=null;
    trackScene(this.scene,'rivals_matchmaking_started',{course_slot:race.course.slot});
    let task;try{task=findRivalMatch(race);}catch{task=null;}
    Promise.resolve(task).catch(()=>null).then(match=>{
      // A cancelled or superseded search never lands.
      if(race.matchSearch!==search)return;
      search.match=match||null;search.loadedAt=performance.now();
    });
    this.showSearch();
  }
  showSearch(){
    const search=this.race.matchSearch;
    this.matchScreen().showSearching({startedAt:search.startedAt,onCancel:()=>this.backToBlock()});
  }
  /** Called every frame while searching: lands the search when it is due. */
  pollSearch(now){
    const race=this.race,search=race.matchSearch;
    if(this.disposed||race.status!=='ready'||race.entryStage!=='searching'||!search)return;
    const settle=matchSettleAt({startedAt:search.startedAt,revealMs:search.revealMs,loadedAt:search.loadedAt,found:!!search.match});
    if(settle==null?now<search.startedAt+MATCH_SEARCH_CAP_MS:now<settle)return;
    race.matchSearch=null;
    if(search.match&&settle!=null){
      if(!advanceMatch(race,'found'))return;
      race.match=search.match;
      race.lobby={slot:search.match.offers[0].slot,powers:validRivalPowers(lastLobbyPowers)?lastLobbyPowers.slice():[]};
      trackScene(this.scene,'rivals_match_found',{course_slot:race.course.slot,courses:search.match.offers.length});
      this.showFound(true);
    }else if(advanceMatch(race,'unavailable')){
      // Nobody eligible by the cap: say so and offer the way on, never a
      // stand-in rival.
      trackScene(this.scene,'rivals_match_unavailable',{course_slot:race.course.slot});
      this.showUnavailable();
    }
  }
  showFound(animate){
    const race=this.race,match=race.match;
    this.matchScreen().showFound({name:this.rivalDisplayName(match.identity.displayName),
      quality:match.offers[0].quality,animate,onDone:()=>{
        if(this.disposed||race!==this.race||race.status!=='ready'||!advanceMatch(race,'selecting'))return;
        this.showLobby(animate);
      }});
  }
  showUnavailable(){
    this.matchScreen().showUnavailable({onRetry:()=>this.startSearch(),onBack:()=>this.backToBlock()});
  }
  resumeMatch(){
    const race=this.race,stage=race.entryStage;
    const reset=()=>{race.entryStage='block';race.matchSearch=null;race.match=null;race.lobby=null;this.openDistrict();};
    if(stage==='searching'){if(race.matchSearch)this.showSearch();else reset();return;}
    if(stage==='unavailable'){this.showUnavailable();return;}
    if(!race.match?.offers?.length){reset();return;}
    // The reveal already happened; a restart goes straight to the lobby.
    if(stage==='found')advanceMatch(race,'selecting');
    this.showLobby(false);
  }
  showLobby(animate){
    const race=this.race,match=race.match;
    const lobby=race.lobby||(race.lobby={slot:match.offers[0].slot,powers:[]});
    if(!match.offers.some(o=>o.slot===lobby.slot))lobby.slot=match.offers[0].slot;
    this.matchScreen().showLobby({animate,
      // A recorded rival is ready the moment it is found; a live one would
      // report here when it is.
      state:{name:this.rivalDisplayName(match.identity.displayName),offers:match.offers,slot:lobby.slot,
        powers:lobby.powers,rivalReady:true},
      onCourse:slot=>{
        if(this.disposed||race.entryStage!=='selecting'||!match.offers.some(o=>o.slot===slot))return;
        lobby.slot=slot;this.screen?.setCourse(slot);
      },
      onPowers:powers=>{if(race.entryStage==='selecting')lobby.powers=powers.slice();},
      onReady:powers=>this.lockIn(powers),
      onLeave:()=>this.backToBlock()
    });
  }
  backToBlock(){
    const race=this.race;
    if(this.disposed||race.status!=='ready')return;
    const from=race.entryStage;
    if(!advanceMatch(race,'block'))return;
    race.matchSearch=null;race.match=null;race.lobby=null;
    trackScene(this.scene,'rivals_match_left',{course_slot:race.course.slot,stage:from});
    this.closeMatchScreen();
    this.openDistrict();
  }
  /**
   * READY, once. Applies the offer's record (on its course, with its stash
   * seed) and starts the countdown at once: a recorded rival is never waited
   * for. A different course than the house already built restarts the scene
   * into that course's first house under the countdown.
   */
  lockIn(powers){
    const race=this.race,match=race.match,lobby=race.lobby;
    if(this.disposed||race.status!=='ready'||race.entryStage!=='selecting'||!validRivalPowers(powers))return;
    const offer=match?.offers?.find(o=>o.slot===lobby?.slot);
    const target=offer?applyRivalOffer(race,match,offer):null;
    if(!target)return;
    advanceMatch(race,'ready');
    if(target!==race)target.entryStage='ready';
    advanceMatch(target,'countdown');
    lastLobbyPowers=powers.slice();
    target.powers=powers.slice();
    this.scene.runnerPowersSelected=powers.slice();this.scene.runnerPowersConsumed=[false,false];
    trackScene(this.scene,'rivals_match_ready',{course_slot:offer.slot,power_1:powers[0],power_2:powers[1]});
    target.status='countdown';target.countdownEndsAt=performance.now()+RIVAL_COUNTDOWN_MS;
    this.closeMatchScreen();
    if(target!==race){
      this.setRace(target);
      this.scene.scene.restart({mode:'pve',role:'runner',runKind:'rivals',pveRound:1,rivalRace:target});
      return;
    }
    this.preparePickupProgress();
    this.scene.roundPausedForMenu=true;this.scene.input.keyboard.enabled=false;
    this.scene.suspendTouchUI?.(true);
  }
  armCountdown(){
    if(this.disposed||this.race.status!=='ready')return;
    this.race.status='countdown';
    this.race.countdownEndsAt=performance.now()+RIVAL_COUNTDOWN_MS;
    this.scene.roundPausedForMenu=true;this.scene.input.keyboard.enabled=false;
    this.scene.suspendTouchUI?.(true);
  }
  rivalDisplayName(name){return String(name).replace(/\bBOT\s*[·:—-]?\s*/gi,'RIVAL · ').replace(/\bAI\s+/gi,'');}
  /** RIVAL, or the recorded rival's own name when it is short and clean. */
  rivalLabel(){
    const name=this.race.opponentKind==='recorded-bot'?this.race.opponent?.displayName:null;
    return (name&&rivalShortName(this.rivalDisplayName(name)))||'RIVAL';
  }
  openLoadout() {
    if (this.race.status !== 'ready') return;
    this.preparePickupProgress();
    const armCountdown=()=>this.armCountdown();
    // Only explicit harness powers bypass selection. A bank recording never
    // supplies the player's loadout: competing mixes are part of the race.
    if (this.race.fixedPowers) {
      this.scene.runnerPowersSelected=this.race.fixedPowers.slice();
      this.race.powers=this.race.fixedPowers.slice();
      showRunnerLoadout(this.scene.gameUI,armCountdown,{
        title:'BLOCK RIVALS',subtitle:this.opponentSubtitle(),startLabel:'READY TO RACE',
        helpText:'Fixed mix. Refills each house.',
        fixedPowers:this.race.fixedPowers,allowReplay:false,showAccount:false
      });
      return;
    }
    showRunnerLoadout(this.scene.gameUI, () => {
      this.race.powers = this.scene.runnerPowersSelected.slice();
      armCountdown();
    }, {
      title:'BLOCK RIVALS', subtitle:this.opponentSubtitle(),
      startLabel:'READY TO RACE',
      helpText:this.race.opponent?.orderedPowers
        ? 'Rival starts: '+this.race.opponent.orderedPowers.map(id=>id.toUpperCase()).join(' → ')+'\nYour powers refill each house.'
        : 'Your powers refill each house and retry.',
      allowReplay:false, showAccount:false, compact:false
    });
  }
  showRetryChoice() {
    if (this.disposed || this.race.status !== 'racing') return;
    if (this.update()) { if (this.race.status === 'finished') return; }
    this.transitioning=true;
    this.freeze();
    this.race.retryChoiceHouse=this.scene.pveRound;
    this.retryModal?.destroy?.({resumeTouch:false});
    this.retryModal=this.scene.gameUI.showModal({
      title:'TRY A NEW ANGLE?',subtitle:'Race clock keeps running.',
      lines:['Retry your mix or switch powers for this house.'],
      buttons:[
        {label:'RETRY HOUSE',variant:'primary',onClick:()=>this.restartRetry()},
        {label:'SWITCH POWERS',variant:'secondary',onClick:()=>{
          if(this.disposed || this.race.status!=='racing')return;
          delete this.race.retryChoiceHouse;
          this.race.retryMixHouse=this.scene.pveRound;
          this.openRetryMix();
        }}
      ]
    });
  }
  openRetryMix() {
    if (this.disposed || this.race.status !== 'racing' || this.race.fixedPowers) return;
    this.transitioning=true;
    this.freeze();
    this.race.retryMixHouse=this.scene.pveRound;
    this.retryModal?.destroy?.({resumeTouch:false});
    this.retryModal=null;
    this.retryPicker=showRunnerLoadout(this.scene.gameUI,()=>{
      if(this.disposed || this.race.status!=='racing')return;
      const powers=this.scene.runnerPowersSelected;
      if(!validRivalPowers(powers))return;
      this.race.powers=powers.slice();
      this.retryPicker=null;
      this.restartRetry();
    },{
      title:'SWITCH POWERS',subtitle:'Race clock keeps running.',
      initialPowers:this.race.powers,startLabel:'RETRY HOUSE',
      helpText:'New mix. Same house. Clock keeps running.',
      compact:true,allowReplay:false,showAccount:false
    });
  }
  restartRetry() {
    if(this.disposed || this.race.status!=='racing')return;
    if(this.update() && this.race.status==='finished')return;
    delete this.race.retryChoiceHouse;
    delete this.race.retryMixHouse;
    this.retryModal?.destroy?.({resumeTouch:false});this.retryModal=null;
    this.retryPicker?.destroy?.({resumeTouch:false});this.retryPicker=null;
    this.freeze();
    this.transition(this.scene.pveRound,RIVAL_RETRY_MS,'RETRYING');
  }
  opponentSubtitle() {
    const course=this.race.course.name ? this.race.course.name+' · ' : '';
    return course+'7 houses · RIVAL';
  }
  opponentShort() { return 'RIVAL'; }
  resumeHouse() {
    if (this.update()) return;
    const scene = this.scene;
    // The match may have adopted its rival's stash seed after this house was
    // built; point `stash` at the right bag before the clock starts.
    scene.realignRivalStash?.();
    scene.runnerPowersSelected = this.race.powers.slice();
    scene.runnerPowersConsumed = [false,false];
    scene.roundOver = false;
    scene.roundPausedForMenu = false;
    scene.input.keyboard.enabled = true;
    scene.suspendTouchUI?.(false);
    scene._aiFirstSeenAt = performance.now();
    scene._aiSpawnAt = performance.now();
    this.startTimer();
    // GO creates the race capture; a race resumed straight into 'racing'
    // (tests, or a state carried across restarts) gets one lazily.
    if (!this.race.capture) beginRaceCapture(this.race);
    beginAttemptCapture(scene, this.race, performance.now());
  }
  drawHUD() {
    const scene=this.scene,width=scene.scale.gameSize.width,height=scene.scale.gameSize.height;
    const layout=rivalHudLayout(width,height);
    const add=o=>{this.objects.push(o);return o.setScrollFactor(0).setDepth(15000);};
    const text=(x,y,value,color='#adbdc5',size=10,origin=[.5,.5])=>add(scene.add.text(x,y,value,{
      fontFamily:'monospace',fontSize:size+'px',fontStyle:'bold',color,stroke:'#071018',strokeThickness:3
    }).setOrigin(origin[0],origin[1]));
    // This is world art: depth 1.7 sits above the floor/grime and below
    // walls (3), furniture and characters (10). It has no hit target.
    const clockSpot=rivalFloorClock(scene.grid);
    if(clockSpot) {
      const cell=scene.cell, pad=scene.pad;
      const x=pad.x+clockSpot.x*cell, y=pad.y+clockSpot.y*cell;
      const w=clockSpot.width*cell,h=clockSpot.height*cell;
      add(scene.add.rectangle(x,y,w,h,0x080e13,.22).setStrokeStyle(1,0x111923,.5)).setDepth(1.7);
      add(scene.add.rectangle(x,y+h/2,w-2,1,0xc6d1c5,.22)).setDepth(1.71);
      this.clock=add(scene.add.text(x,y,'0:00.0',{
        fontFamily:'monospace',fontSize:Math.max(8,Math.floor(cell*.65))+'px',fontStyle:'bold',
        color:'#bbc4b9',stroke:'#101820',strokeThickness:1
      }).setOrigin(.5).setAlpha(.65)).setDepth(1.72);
    }
    // Settings sits in the top-left corner, over the outer wall above your
    // rail: off the floor, clear of the driveway, the same on every layout.
    const spot=rivalSettingsSpot(layout,scene.pad,scene.cell);
    add(scene.add.circle(spot.x,spot.y,spot.r,0x0a121a,.62).setStrokeStyle(1,0x5b6b74,.85));
    add(drawPowerIcon(scene,spot.x,spot.y,'settings',spot.r*1.25,0xc9d3d8,15001)).setDepth(15001).setAlpha(.9);
    const gear=add(scene.add.rectangle(spot.hit.x+spot.hit.w/2,spot.hit.y+spot.hit.h/2,spot.hit.w,spot.hit.h,0x000000,.001))
      .setInteractive({useHandCursor:true});
    gear.on('pointerdown',(_p,_x,_y,event)=>{
      event?.stopPropagation();
      this.openSettings();
    });
    this.rows=[0,1].map(row=>{
      const x=row?layout.rightX:layout.leftX,color=row?0xc6ac70:0x86bad5;
      const label=text(row?width-7:7,layout.startY-20,row?'RIVAL 0/7':'YOU 0/7',
        row?'#dec386':'#9bcae5',9,row?[1,.5]:[0,.5]);
      const bars=layout.segmentYs.map(y=>add(scene.add.rectangle(x,y,layout.railW,layout.segmentH,0x17232c,.9).setStrokeStyle(1,0x42525c,.95)));
      const fills=layout.segmentYs.map(y=>add(scene.add.rectangle(x,y-layout.segmentH/2+1,
        Math.max(1,layout.railW-2),1,color,.92).setOrigin(.5,0).setVisible(false)));
      return {label,bars,fills,color,width:Math.max(1,layout.railW-2),height:layout.segmentH-2};
    });
    this.notice=add(scene.add.text(width/2,height/2,'',{fontFamily:'monospace',fontSize:'24px',fontStyle:'bold',
      color:'#f0d294',stroke:'#071018',strokeThickness:5,align:'center'}).setOrigin(.5));
  }
  paint(now) {
    const elapsed=this.race.status==='finished'?this.race.finishedMs:rivalElapsed(this.race,now);
    this.clock?.setText(rivalTimeLabel(elapsed));
    const counts=[this.race.clearTimes.length,rivalProgress(this.race.rivalTimes,elapsed)];
    const carrying=[
      this.race.status==='racing' && !this.transitioning && !this.scene.roundOver &&
        this.scene.pveRound===counts[0]+1 && !!this.scene.hasStash,
      rivalCarryingAt(this.race.pickupProgress?.windows,counts[1],elapsed)
    ];
    this.rows?.forEach((row,i)=>{
      row.label.setText((i?this.rivalLabel()+' ':'YOU ')+counts[i]+'/7');
      const levels=rivalHouseFill(counts[i],carrying[i]);
      row.bars.forEach((bar,j)=>{
        bar.setStrokeStyle(j===counts[i]?2:1,j===counts[i]?row.color:0x42525c,.98);
        row.fills[j].setVisible(levels[j]>0).setDisplaySize(row.width,Math.max(1,row.height*levels[j]));
      });
    });
  }
  preparePickupProgress() {
    if(this.race.opponentKind!=='recorded-bot' || this.race.pickupProgress) return;
    // Shared object, not a controller callback: a house can restart while the
    // download is pending, and recordRivalClear shallow-copies the race.
    const state={windows:[]};
    this.race.pickupProgress=state;
    const cached=this.race.opponentBundle || this.race.replayCache?.bundle;
    if(cached) { state.windows=rivalPickupWindows(cached); return; }
    loadRivalReplay(this.race).then(bundle=>{
      if(bundle) state.windows=rivalPickupWindows(bundle);
    }).catch(()=>{});
  }
  openSettings() {
    if(this.disposed || this.settingsOpen || this.transitioning || this.race.status!=='racing') return;
    this.settingsOpen=true;
    this.scene.roundPausedForMenu=true;
    this.scene._mouseDown=false;
    this.scene.input.keyboard.enabled=false;
    this.scene.suspendTouchUI?.(true);
    this.settingsAudio=AudioManager.get(this.scene);
    this.drawSettings();
  }
  drawSettings() {
    this.settingsModal?.destroy?.({resumeTouch:false});
    const audio=this.settingsAudio;
    const toggle=(music)=>{
      if(music) audio?.setMusicMute(!audio.isMusicMuted());
      else audio?.setMute(!audio.isMuted());
      this.drawSettings();
    };
    this.settingsModal=this.scene.gameUI.showModal({
      title:'SETTINGS',subtitle:'Race clock keeps running.',
      inputDelay:150,
      buttons:[
        {label:'MUSIC: '+(audio?.isMusicMuted()?'OFF':'ON'),variant:'secondary',keepOpen:true,onClick:()=>toggle(true)},
        {label:'SOUNDS: '+(audio?.isMuted()?'OFF':'ON'),variant:'secondary',keepOpen:true,onClick:()=>toggle(false)},
        {label:'BACK TO RACE',variant:'primary',onClick:()=>this.closeSettings()},
        {label:'QUIT RACE',variant:'danger',onClick:()=>{this.closeSettings(false);this.finish('forfeit',performance.now());}}
      ]
    });
  }
  closeSettings(resume=true) {
    this.settingsModal?.destroy?.();
    this.settingsModal=null;
    // Keep the closing tap out of movement/powers. The clock never pauses.
    this.settingsResume?.remove?.();
    if(resume) {
      this.scene.suspendTouchUI?.(true);
      this.settingsResume=this.scene.time.delayedCall(120,()=>{
        this.settingsOpen=false;
        if(this.disposed || this.race.status!=='racing') return;
        this.scene.roundPausedForMenu=false;
        this.scene.input.keyboard.enabled=true;
        this.scene.suspendTouchUI?.(false);
      });
    } else this.settingsOpen=false;
  }

  update() {
    if (this.disposed) return true;
    const now = performance.now();
    if (this.race.status === 'ready' && this.screen) {
      this.pollSearch(now);
      this.screen?.tick(now);
    }
    if (this.race.status === 'countdown') {
      const left = this.race.countdownEndsAt-now;
      this.notice?.setText(String(Math.max(1,Math.ceil(left/1000))));
      if (left<=0) {
        // Use the scheduled GO, not a late frame: backgrounding never pauses a race.
        this.race.startedAt=this.race.countdownEndsAt;
        this.race.status='racing';
        if(this.race.entryStage==='countdown')advanceMatch(this.race,'racing');
        trackScene(this.scene,'rivals_match_started',{course_slot:this.race.course.slot,power_1:this.race.powers?.[0],power_2:this.race.powers?.[1]});
        this.notice?.setText('');
        beginRaceCapture(this.race);
        this.resumeHouse();
      }
    }
    if (this.race.status === 'racing') {
      const elapsed = rivalElapsed(this.race,now);
      // A rival crossing the line first decides the result but does not end
      // the race: the player plays it out (or quits from settings).
      if (!this.race.rivalFinishSeen && rivalHasFinished(this.race.rivalTimes,elapsed)) this.announceRivalFinish();
      // Recording harness only: a race that will never end is not a race.
      if (this.race.hardLimitMs && elapsed >= this.race.hardLimitMs) this.finish('forfeit',now);
      else if (!this.transitioning && !this.scene.roundOver && !this.settingsOpen) tickAttemptCapture(this.scene,this.race,now);
    }
    this.paint(now);
    return this.race.status !== 'racing' || this.transitioning || !!this.settingsOpen;
  }
  freeze() {
    const s=this.scene;
    s.roundOver=true; s.roundPausedForMenu=true; s.input.keyboard.enabled=false; s._mouseDown=false;
    s.destroyDecoySprite?.();
    for (const group of [s.bulletsA,s.bulletsD]) group?.getChildren?.().forEach(b=>b.destroy());
    s.vfx?.hideCarBeacon?.();
    try { s.audio?.stopEngineLoop?.(); } catch {}
    s.suspendTouchUI?.(true);
  }
  transition(house,delay,message) {
    this.transitioning=true;
    this.notice?.setText(message);
    this.pending=this.scene.time.delayedCall(delay,()=>{
      if (this.disposed || this.race.status==='finished') return;
      this.scene.scene.restart({
        mode:'pve',role:'runner',runKind:'rivals',pveRound:house,rivalRace:this.race
      });
    });
  }
  /** The rival crossed the line: say so briefly, keep racing. */
  announceRivalFinish(){
    this.race.rivalFinishSeen=true;
    const label=this.rivalLabel()+' FINISHED';
    this.notice?.setText(label+'\n'+rivalTimeLabel(this.race.rivalTimes[RIVAL_HOUSES-1]));
    this.rivalFinishTimer?.remove?.();
    this.rivalFinishTimer=this.scene.time?.delayedCall?.(1800,()=>{
      if(this.notice?.text?.startsWith(label))this.notice.setText('');
    });
  }
  // Same pull-in as the campaign so the beat reads identically; a shorter
  // drive-off because this is a race and it happens seven times.
  static BOARD_MS = 400;
  static DRIVE_MS = 600;

  clearHouse() {
    if (this.scene.roundOver || this.race.status!=='racing') return;
    const now=performance.now(), elapsed=rivalElapsed(this.race,now);
    const next=recordRivalClear(this.race,this.scene.pveRound,elapsed);
    if (next===this.race) return;
    this.setRace(next);
    trackScene(this.scene,'round_complete',{course_slot:this.race.course.slot,success:true,round_number:this.scene.pveRound});
    endAttemptCapture(this.scene,next,'extracted',now);
    this.scene.forensics?.extract(this.scene);
    this.scene.finalizeRun?.('rivals_extracted');
    ReplaySystem.finalize();
    this.freeze();
    // Settled by the seventh clear only; after the rival has finished it is a loss.
    const outcome=rivalFinalOutcome(next.clearTimes,next.rivalTimes);
    // Show the getaway rather than cutting straight to the card, and credit
    // back the time it actually takes, measured rather than
    // assumed: the clear time is already recorded, but the race clock is raw
    // wall time and the recorded opponents only ever paid
    // RIVAL_TRANSITION_MS between houses (see rivals.js). Measuring also
    // keeps the no-car path honest, where playExtraction calls back
    // immediately and nothing should be credited.
    const animStart=performance.now();
    playExtraction(this.scene,{
      boardMs:RivalsRace.BOARD_MS, driveMs:RivalsRace.DRIVE_MS,
      onComplete:()=>{
        if (this.disposed || this.race.status==='finished') return;
        if (outcome) { this.finish(outcome,now); return; }
        const spent=Math.max(0,performance.now()-animStart);
        if (spent>0 && this.race.startedAt!=null) this.setRace({...this.race,startedAt:this.race.startedAt+spent});
        this.transition(this.scene.pveRound+1,RIVAL_TRANSITION_MS,'NEXT HOUSE');
      }});
  }
  retryHouse(reason='ended') {
    if (this.scene.roundOver || this.race.status!=='racing') return;
    const now=performance.now();
    // A death is 'caught', the round clock running out is 'timeout'; a resize
    // retry is neither and is marked so the race cannot be exported as a record.
    const outcome = reason==='resize' ? 'abandoned' : ((this.scene.attacker?.hp ?? 1) <= 0 ? 'caught' : 'timeout');
    endAttemptCapture(this.scene,this.race,outcome,now);
    this.race.retries++;
    if(reason!=='resize') trackScene(this.scene,'house_failed',{course_slot:this.race.course.slot,reason:outcome});
    if(reason!=='resize') {
      this.race.houseRetries ??= {};
      this.race.houseRetries[this.scene.pveRound]=(this.race.houseRetries[this.scene.pveRound]||0)+1;
    }
    this.scene.finalizeRun?.('rivals_caught');
    ReplaySystem.finalize();
    this.freeze();
    // Keep existing unattended fixed-mix recording jobs automatic.
    if(reason!=='resize' && !this.race.recording && !this.race.fixedPowers &&
      this.race.houseRetries?.[this.scene.pveRound]>=2) this.showRetryChoice();
    else this.transition(this.scene.pveRound,RIVAL_RETRY_MS,'CAUGHT\nRETRYING');
  }
  finish(result,now) {
    if (this.race.status==='finished') return;
    this.closeSettings(false);
    this.retryModal?.destroy?.({resumeTouch:false});this.retryModal=null;
    this.retryPicker?.destroy?.({resumeTouch:false});this.retryPicker=null;
    delete this.race.retryChoiceHouse;delete this.race.retryMixHouse;
    // Quitting once the rival is home is a loss, not an abandoned race.
    if(result==='forfeit'&&!this.race.recording&&rivalHasFinished(this.race.rivalTimes,rivalElapsed(this.race,now)))result='loss';
    this.race.status='finished';
    this.race.result=result;
    // The player's own clock: the seventh clear, or when they stopped.
    this.race.finishedMs=rivalElapsed(this.race,now);
    trackScene(this.scene,'rivals_match_completed',{course_slot:this.race.course.slot,result,elapsed_seconds:Math.round(this.race.finishedMs)/1000,retries:this.race.retries});
    endAttemptCapture(this.scene,this.race,'abandoned',now);
    this.freeze();
    this.pending?.remove?.();
    this.scene.finalizeRun?.('rivals_'+result);
    ReplaySystem.finalize();
    this.notice?.setText('');
    this.paint(now);
    // Adapt on what actually happened. Never during a race, never on a
    // recording, and never in a direction that would make winning easier.
    if(!this.race.recording)noteRivalOutcome(this.race,result);
    const record=rivalRecord(this.race);
    // The player's own race in the shared record format (kind 'human', local,
    // unverified). Only a complete race with no abandoned attempt exports.
    const own = exportRaceCapture(this.race,{
      opponent:{ id:'local-player', displayName:'You', kind:'human' },
      recordingID:'local-'+this.race.course.id+'-'+Math.round(this.race.finishedMs)
    });
    this.territory=completeRivalDistrict(this.race);
    this.race.territoryClaim=this.territory;
    this.saved=saveRivalResult({
      courseID:this.race.course.id,courseSlot:this.race.course.slot ?? null,result,elapsedMs:this.race.finishedMs,
      houses:this.race.clearTimes.length,retries:this.race.retries,
      opponentKind:this.race.opponentKind,recordingID:this.race.opponent?.recordingID ?? null
    },record,own.ok ? own.record : null);
    this.showResult();
  }
  showResult() {
    if (this.race.result === 'win') {
      try { this.scene.audio?.playBlockClear?.(); } catch {}
    }
    const recorded = this.race.opponentKind === 'recorded-bot';
    const who = this.rivalLabel();
    const config={
      fullScreen:!!this.race.rivalCityIndex,
      title:({win:'YOU WIN',loss:who.toUpperCase()+' WINS',draw:'PHOTO FINISH',forfeit:'RACE ENDED'})[this.race.result] || 'RACE ENDED',
      // A real opponent gets the plain word. The generated fallback is still
      // never dressed up as one: it says pace trial.
      subtitle:recorded ? 'RIVAL · SEVEN HOUSES' : 'PACE TRIAL · NO RIVAL FOUND',
      lines:[
        ...(this.race.course.name ? ['Course: '+this.race.course.name] : []),
        'You: '+this.race.clearTimes.length+'/7 houses \u00b7 '+this.race.retries+' retries',
        'Race time: '+rivalTimeLabel(this.race.finishedMs),
        'Rival: '+rivalTimeLabel(this.race.rivalTimes[RIVAL_HOUSES-1])
          +(recorded && Number.isFinite(this.race.opponent?.retries) ? ' \u00b7 '+this.race.opponent.retries+' retries' : ''),
        ...(this.saved===false ? ['Local result could not be saved.'] : []),
        ...(this.race.territoryClaim?.applied?['BLOCK CLAIMED']:[]),
        ...(this.race.territoryClaim?.saved===false?['Map progress is temporary; local save failed.']:[])
      ],
      buttons:[
        ...(recorded && (this.race.opponent?.replayURL || this.race.opponentBundle) ? [{
          label:'\u25B6 WATCH RIVAL',variant:'secondary',keepOpen:true,onClick:(m)=>this.watchRival(m)
        }] : []),
        // No rematch: racing the same recorded rival again would replay its
        // route and stash answers, which a player could learn. Every new race
        // meets a freshly chosen rival on a fresh match.
        {label:this.race.rivalCityIndex&&this.race.result!=='win'?'TRY AGAIN':'NEW RACE',variant:'primary',onClick:()=>this.scene.scene.restart({
          mode:'pve',role:'runner',runKind:'rivals',...this.harnessRestartData(),
          ...(this.race.pool&&this.race.pool!=='ordinary'?{rivalPool:this.race.pool}:{})
        })},
        {label:'MAIN MENU',variant:'secondary',onClick:()=>this.scene.scene.start('MENU')}
      ]
    };
    if(this.race.rivalCityIndex){
      config.completion=true;config.accent=crewSigil(this.race.territoryGang)?.color;
      // The times and the block claim are drawn as a scoreboard above the
      // block (drawResultTimes); only a save problem stays a plain line.
      config.lines=[
        ...(this.saved===false||this.race.territoryClaim?.saved===false?['Local save unavailable. Map progress may be temporary.']:[])
      ];
      const menu=config.buttons.find(b=>b.label==='MAIN MENU');
      const next=config.buttons.find(b=>['NEW RACE','TRY AGAIN'].includes(b.label));
      const watch=config.buttons.find(b=>b.label.includes('WATCH RIVAL'));
      config.buttons=[next,...(watch?[watch]:[]),menu];
    }
    const modal=this.scene.gameUI.showModal(config);
    if(this.race.rivalCityIndex){
      this.drawResultTimes(modal);
      drawRivalDistrictMap(this.scene,modal,this.race,{won:this.race.result==='win'});
    }
  }
  /**
   * The result's scoreboard: you and the rival side by side, each in the
   * colour of their HUD rail (blue, gold), the margin under a win, then the
   * block claim. It takes the top of the modal's free area; the block map
   * gets the rest.
   */
  drawResultTimes(modal){
    const area=modal?.contentBounds;
    const keep=modal?.registerExtra;
    if(!area||!keep||!this.scene.add?.text)return;
    const s=this.scene,r=this.race,Z=20002;
    const compact=area.height<380;
    const text=(x,y,value,{size=12,color='#8ca7aa',font='monospace',spacing=2}={})=>{
      const o=s.add.text(x,y,value,{fontFamily:font,fontSize:size+'px',fontStyle:'bold',color,letterSpacing:spacing})
        .setOrigin(.5,0).setDepth(Z).setScrollFactor(0);
      keep(o);return o;
    };
    const retries=n=>Number.isFinite(n)?n+(n===1?' RETRY':' RETRIES'):'';
    const done=r.clearTimes.length,rivalMs=r.rivalTimes[RIVAL_HOUSES-1];
    const sides=[
      {x:area.x+area.width*.27,label:'YOU',color:'#9bcae5',
        value:done===RIVAL_HOUSES?rivalTimeLabel(r.finishedMs):done+'/7',
        detail:done===RIVAL_HOUSES?'7/7 · '+retries(r.retries):'HOUSES'},
      {x:area.x+area.width*.73,label:this.rivalLabel(),color:'#dec386',
        value:rivalTimeLabel(rivalMs),detail:'7/7'+(Number.isFinite(r.opponent?.retries)?' · '+retries(r.opponent.retries):'')}
    ];
    const big=compact?26:32;
    let y=area.y+2;
    for(const side of sides){
      text(side.x,y,side.label,{size:12,color:side.color,spacing:3});
      text(side.x,y+17,side.value,{size:big,color:side.color,font:'Arial, sans-serif',spacing:1});
      if(!compact)text(side.x,y+19+big+4,side.detail,{size:10,color:'#8ca7aa',spacing:1});
    }
    const divider=s.add.rectangle(area.x+area.width/2,y+(compact?24:30),1,compact?40:52,0x3b4b58,1).setDepth(Z).setScrollFactor(0);
    keep(divider);
    y+=17+big+(compact?8:26);
    // How far apart, measured on the two clocks: only a finished race has one.
    const margin=done===RIVAL_HOUSES?(rivalMs-r.finishedMs)/1000:null;
    if(margin!=null){
      const label=margin>0?'YOU BY '+margin.toFixed(1)+'s':margin<0?sides[1].label+' BY '+(-margin).toFixed(1)+'s':'DEAD HEAT';
      text(area.x+area.width/2,y,label,{size:13,color:margin>0?'#9bcae5':margin<0?'#dec386':'#eee3c7'});
      y+=22;
    }
    if(r.territoryClaim?.applied){
      text(area.x+area.width/2,y,'BLOCK CLAIMED',{size:12,color:'#eee3c7'});
      y+=22;
    }
    const used=y+6-area.y;
    area.y+=used;area.height=Math.max(0,area.height-used);
  }
  /**
   * Recording-mode options survive New Race; a normal race carries none. A
   * recording batch stays on its course (its seed), but each race is a new
   * match with a fresh stash seed, so every recorded variant has its own
   * answers.
   */
  harnessRestartData() {
    if (!this.race.recording) return {};
    return { rivalRecording:true, rivalSeed:this.race.course.seed, rivalPowers:this.race.fixedPowers ?? undefined, rivalHardLimitMs:this.race.hardLimitMs || undefined };
  }
  /** Watch the rival's whole race on top of the intact result modal. */
  watchRival(modal) {
    if (this.watching) return;
    this.watching = true;
    modal?.setVisible?.(false);
    const back = (message) => {
      this.watching = false;
      modal?.setVisible?.(true);
      if (message) { this.notice?.setText(message); this.scene.time?.delayedCall?.(2200,()=>this.notice?.setText('')); }
    };
    const start = (bundle) => {
      if (this.disposed) return;
      if (!bundle) { back('REPLAY UNAVAILABLE'); return; }
      playRivalReplay(this.scene,{
        bundle, record:this.race.opponentRecord, opponentName:this.rivalLabel(),
        playerTimes:this.race.clearTimes, onDone:()=>back('')
      });
    };
    const bundle = this.race.opponentBundle ?? null;
    if (bundle) { start(bundle); return; }
    this.notice?.setText('LOADING REPLAY');
    loadRivalReplay(this.race).then(b => { this.notice?.setText(''); start(b); }).catch(() => start(null));
  }
  resize() {
    if (this.transitioning) {
      if(this.race.retryChoiceHouse || this.race.retryMixHouse) this.scene.scene.restart({
        mode:'pve',role:'runner',runKind:'rivals',pveRound:this.scene.pveRound,rivalRace:this.race
      });
      return; // a pending restart already adopts the new viewport
    }
    if (this.race.status==='racing') { this.retryHouse('resize'); return; }
    this.scene.scene.restart({
      mode:'pve',role:'runner',runKind:'rivals',pveRound:this.scene.pveRound,rivalRace:this.race
    });
  }
  dispose() {
    if(this.disposed)return;
    this.disposed=true;this.scene._touchSceneClosing=true;
    this.closeSettings(false);
    this.retryModal?.destroy?.({resumeTouch:false});this.retryPicker?.destroy?.({resumeTouch:false});
    this.pending?.remove?.();
    this.closeMatchScreen();
    this.cityIntro?.destroy?.();
    this.entryModal?.destroy?.();
    this.objects.forEach(o=>o.destroy?.());
    clearTimeout(this.scene._resizeTimer);
  }
}
