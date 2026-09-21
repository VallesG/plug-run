import { crewSigil } from '../logic/crewSigils.js';
import { trackScene } from '../utils/analytics.js';
import { rivalCityView, completeRivalDistrict, getRivalTerritory } from '../utils/rivalCityProgress.js';
import { drawCityMap } from './CityMap.js';
import { drawRivalDistrictMap } from './RivalDistrictMap.js';
import {
  RIVAL_HOUSES, RIVAL_COUNTDOWN_MS, RIVAL_TRANSITION_MS, RIVAL_RETRY_MS,
  rivalElapsed, rivalProgress, rivalOutcome, recordRivalClear, rivalTimeLabel, rivalRecord, nextRivalSlot, rivalHudLayout,
  rivalHouseFill, rivalPickupWindows, rivalCarryingAt, rivalFloorClock, validRivalPowers
} from '../logic/rivals.js';
import { saveRivalResult, resolveRivalOpponent, loadRivalReplay, noteRivalOutcome } from '../utils/rivalSession.js';
import { matchSearchMs, matchSearchSteps, matchCarousel, matchLanding, matchQuality, matchClock } from '../logic/rivalMatchmaking.js';
import { playRivalReplay } from './RivalReplayPlayer.js';
import { playExtraction } from './extractionAnimation.js';
import { showRunnerLoadout } from './RunnerLoadout.js';
import ReplaySystem from './ReplaySystem.js';
import { drawPowerIcon } from './PowerIcons.js';
import AudioManager from '../audio/AudioManager.js';
import { beginRaceCapture, beginAttemptCapture, tickAttemptCapture, endAttemptCapture, exportRaceCapture } from './RivalReplayCapture.js';

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
      if(this.race.entryStage==='search'){this.findMatch();return;}
      if(this.race.entryStage==='loadout'){this.openLoadout();return;}
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
        {label:'LOOK FOR MATCH',variant:'primary',onClick:()=>{this.race.entryStage='loadout';this.openLoadout();}},
        {label:'MAIN MENU',variant:'secondary',onClick:()=>this.scene.scene.start('MENU')}
      ]
    });
    this.entryModal=modal;
    drawRivalDistrictMap(this.scene,modal,this.race);
  }
  findMatch(){
    if(this.disposed||this.searching||this.race.status!=='ready')return;
    this.searching=true;this.race.entryStage='search';
    trackScene(this.scene,'rivals_matchmaking_started',{course_slot:this.race.course.slot});
    this.entryModal?.destroy?.({resumeTouch:false});
    this.entryModal=this.scene.gameUI.showModal({
      // No claim is made about anyone being online, in a queue or playing now,
      // and no recording vocabulary reaches the player. Everything shown is
      // true: the course, that the pick is matched to the player's measured
      // pace, the names actually in this course's pool, and how the chosen
      // rival's measured pace compares (logic/rivalMatchmaking.js).
      title:'FINDING RIVAL',subtitle:this.race.course.name?this.race.course.name.toUpperCase():'BLOCK RIVALS',
      lines:['SEVEN HOUSES · ONE RACE'],
      buttons:[{label:'CANCEL',variant:'secondary',onClick:()=>this.scene.scene.start('MENU')}]
    });
    const scene=this.scene,w=scene.scale.gameSize.width,h=scene.scale.gameSize.height;
    const cx=w/2,cy=h*.47,D=22000;
    const add=o=>{this.objects.push(o);return o.setScrollFactor(0);};
    // Sonar: three rings pulsing out from behind the name card.
    const rings=[0,1,2].map(i=>{
      const ring=add(scene.add.circle(cx,cy,34,0x000000,0).setStrokeStyle(2,0x7fd1c7,0.85).setDepth(D-1));
      scene.tweens.add({targets:ring,scale:{from:1,to:4.4},alpha:{from:0.85,to:0},duration:1800,delay:i*600,repeat:-1,ease:'Sine.easeOut'});
      return ring;
    });
    this.searchCard=add(scene.add.text(cx,cy,'RIVAL',{
      fontFamily:'Arial, sans-serif',fontSize:'22px',fontStyle:'bold',color:'#eee3c7',wordWrap:{width:w-70},
      backgroundColor:'#111c23',padding:{x:20,y:12},align:'center'
    }).setOrigin(.5).setDepth(D));
    const status=add(scene.add.text(cx,cy+58,'',{fontFamily:'Arial, sans-serif',fontSize:'13px',fontStyle:'bold',color:'#7fd1c7',align:'center'}).setOrigin(.5).setDepth(D));
    const clock=add(scene.add.text(cx,cy-60,'0:00',{fontFamily:'Arial, sans-serif',fontSize:'13px',color:'#9aa7ad',align:'center'}).setOrigin(.5).setDepth(D));

    const started=performance.now();
    const salt=(this.race.territoryUser||'')+'/'+this.race.course.id+'/'+Math.round(started);
    const minMs=matchSearchMs(salt), steps=matchSearchSteps(this.race.course.name);
    const tick=()=>{
      const el=performance.now()-started;
      clock.setText(matchClock(el));
      status.setText(steps[Math.min(steps.length-1,Math.floor(el/(minMs/steps.length)))]);
    };
    let settled=false,i=0;
    let task;try{task=resolveRivalOpponent(this.race);}catch{task=null;}
    Promise.resolve(task).catch(()=>false).then(()=>{settled=true;});
    const names=()=>matchCarousel((this.race.searchNames?.length?this.race.searchNames:['RIVAL']).map(n=>this.rivalDisplayName(n)),salt);

    // Candidates cycle until the pick is known AND the search has run its
    // course; then the wheel slows and lands on the actual pick.
    const spin=()=>{
      if(this.disposed||this.race.status!=='ready')return;
      tick();
      const pool=names();
      if(settled&&performance.now()-started>=minMs){land(pool);return;}
      this.searchCard.setText(pool[i++%pool.length]);
      this.searchTimer=scene.time.delayedCall(110,spin);
    };
    const land=pool=>{
      if(!this.race.opponent){found();return;}
      const tail=matchLanding(pool,this.rivalDisplayName(this.race.opponent.displayName));
      let k=0;
      const step=()=>{
        if(this.disposed||this.race.status!=='ready')return;
        tick();
        this.searchCard.setText(tail[k].name);
        const ms=tail[k++].ms;
        this.searchTimer=scene.time.delayedCall(ms,k<tail.length?step:found);
      };
      step();
    };
    const found=()=>{
      if(this.disposed||this.race.status!=='ready')return;
      rings.forEach(r=>{scene.tweens.killTweensOf(r);r.setVisible(false);});
      const o=this.race.opponent;
      if(o){
        const quality=matchQuality(this.race.playerSkill?.estimateMs,o.benchmarkMs);
        status.setText('RIVAL FOUND');
        this.searchCard.setText(this.rivalDisplayName(o.displayName||'RIVAL')+(quality?'\n'+quality:'')
          +(o.orderedPowers?'\n'+o.orderedPowers.map(p=>p.toUpperCase()).join(' → '):''));
      }else{
        status.setText('PACE TRIAL');
        this.searchCard.setText('PACE TRIAL\nBeat the clock');
      }
      scene.tweens.add({targets:this.searchCard,scale:{from:1.18,to:1},duration:260,ease:'Back.easeOut'});
      this.searchTimer=scene.time.delayedCall(1600,()=>{
        if(this.disposed)return;
        [this.searchCard,status,clock,...rings].forEach(x=>x?.destroy?.());this.entryModal?.destroy?.();
        this.searching=false;this.race.entryStage='matched';this.preparePickupProgress();this.armCountdown();
      });
    };
    spin();
  }
  armCountdown(){
    if(this.disposed||this.race.status!=='ready')return;
    this.race.status='countdown';
    this.race.countdownEndsAt=performance.now()+RIVAL_COUNTDOWN_MS;
    this.scene.roundPausedForMenu=true;this.scene.input.keyboard.enabled=false;
    this.scene.suspendTouchUI?.(true);
  }
  rivalDisplayName(name){return String(name).replace(/\bBOT\s*[·:—-]?\s*/gi,'RIVAL · ').replace(/\bAI\s+/gi,'');}
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
      if(this.race.rivalCityIndex)this.findMatch();else armCountdown();
    }, {
      title:'BLOCK RIVALS', subtitle:this.opponentSubtitle(),
      startLabel:this.race.rivalCityIndex?'LOOK FOR MATCH':'READY TO RACE',
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
    const gear=add(scene.add.rectangle(27,height-29,44,44,0x0a121a,.7)
      .setStrokeStyle(1,0x42525c,.7)).setInteractive({useHandCursor:true});
    add(drawPowerIcon(scene,27,height-29,'settings',25,0xb7c6cf,15001)).setDepth(15001);
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
      row.label.setText((i?'RIVAL ':'YOU ')+counts[i]+'/7');
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
    if (this.race.status === 'countdown') {
      const left = this.race.countdownEndsAt-now;
      this.notice?.setText(String(Math.max(1,Math.ceil(left/1000))));
      if (left<=0) {
        // Use the scheduled GO, not a late frame: backgrounding never pauses a race.
        this.race.startedAt=this.race.countdownEndsAt;
        this.race.status='racing';
        trackScene(this.scene,'rivals_match_started',{course_slot:this.race.course.slot,power_1:this.race.powers?.[0],power_2:this.race.powers?.[1]});
        this.notice?.setText('');
        beginRaceCapture(this.race);
        this.resumeHouse();
      }
    }
    if (this.race.status === 'racing') {
      const elapsed = rivalElapsed(this.race,now);
      const outcome = rivalOutcome(this.race.clearTimes,this.race.rivalTimes,elapsed);
      if (outcome) this.finish(outcome,now);
      // Recording harness only: a race that will never end is not a race.
      else if (this.race.hardLimitMs && elapsed >= this.race.hardLimitMs) this.finish('forfeit',now);
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
  // Same pull-in as the campaign so the beat reads identically; a shorter
  // drive-off because this is a race and it happens seven times.
  static BOARD_MS = 400;
  static DRIVE_MS = 600;

  clearHouse() {
    if (this.scene.roundOver || this.race.status!=='racing') return;
    const now=performance.now(), elapsed=rivalElapsed(this.race,now);
    const next=recordRivalClear(this.race,this.scene.pveRound,elapsed);
    if (next===this.race) return;
    // If the rival already finished, the late player clear cannot change the result.
    if (elapsed > this.race.rivalTimes[RIVAL_HOUSES-1]) {
      this.finish('loss',now); return;
    }
    this.setRace(next);
    trackScene(this.scene,'round_complete',{course_slot:this.race.course.slot,success:true,round_number:this.scene.pveRound});
    endAttemptCapture(this.scene,next,'extracted',now);
    this.scene.forensics?.extract(this.scene);
    this.scene.finalizeRun?.('rivals_extracted');
    ReplaySystem.finalize();
    this.freeze();
    const outcome=rivalOutcome(next.clearTimes,next.rivalTimes,elapsed);
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
    if (rivalOutcome(this.race.clearTimes,this.race.rivalTimes,rivalElapsed(this.race,now))) {
      this.finish('loss',now); return;
    }
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
    this.race.status='finished';
    this.race.result=result;
    this.race.finishedMs=result==='loss' ? this.race.rivalTimes[RIVAL_HOUSES-1] : rivalElapsed(this.race,now);
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
    const who = 'RIVAL';
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
        ...(this.race.territoryClaim?.applied?['BLOCK CLAIMED · NEXT BLOCK OPEN']:[]),
        ...(this.race.territoryClaim?.saved===false?['Map progress is temporary; local save failed.']:[])
      ],
      buttons:[
        ...(recorded && (this.race.opponent?.replayURL || this.race.opponentBundle) ? [{
          label:'\u25B6 WATCH RIVAL',variant:'secondary',keepOpen:true,onClick:(m)=>this.watchRival(m)
        }] : []),
        {label:'REMATCH',variant:'primary',onClick:()=>this.scene.scene.restart({
          mode:'pve',role:'runner',runKind:'rivals',rivalSeed:this.race.course.seed,
          rivalOpponentID:this.race.opponent?.recordingID ?? undefined,...this.harnessRestartData()
        })},
        {label:this.race.rivalCityIndex?(this.race.result==='win'?'ENTER NEXT BLOCK':'TRY AGAIN'):'NEW RACE',variant:'secondary',onClick:()=>this.scene.scene.restart({
          mode:'pve',role:'runner',runKind:'rivals',...(this.race.rivalCityIndex?{}:{rivalSlot:nextRivalSlot(this.race.course.slot)}),...this.harnessRestartData()
        })},
        {label:'MAIN MENU',variant:'secondary',onClick:()=>this.scene.scene.start('MENU')}
      ]
    };
    if(this.race.rivalCityIndex){
      config.completion=true;config.accent=crewSigil(this.race.territoryGang)?.color;
      config.lines=[
        'YOU '+this.race.clearTimes.length+'/7 · '+rivalTimeLabel(this.race.finishedMs)+' / RIVAL '+rivalTimeLabel(this.race.rivalTimes[6]),
        ...(this.race.territoryClaim?.applied?['BLOCK CLAIMED · NEXT BLOCK OPEN']:[]),
        ...(this.saved===false||this.race.territoryClaim?.saved===false?['Local save unavailable. Map progress may be temporary.']:[])
      ];
      const rematch=config.buttons.find(b=>b.label==='REMATCH'),menu=config.buttons.find(b=>b.label==='MAIN MENU');
      const next=config.buttons.find(b=>['ENTER NEXT BLOCK','TRY AGAIN'].includes(b.label));
      rematch.variant='secondary';next.variant='primary';
      const watch=config.buttons.find(b=>b.label.includes('WATCH RIVAL'));
      config.buttons=[next,...(watch?[watch]:[]),{pair:[rematch,menu]}];
    }
    const modal=this.scene.gameUI.showModal(config);
    if(this.race.rivalCityIndex)drawRivalDistrictMap(this.scene,modal,this.race,{won:this.race.result==='win'});
  }
  /** Recording-mode options survive Rematch/New Race; a normal race carries none. */
  harnessRestartData() {
    if (!this.race.recording) return {};
    return { rivalRecording:true, rivalPowers:this.race.fixedPowers ?? undefined, rivalHardLimitMs:this.race.hardLimitMs || undefined };
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
        bundle, record:this.race.opponentRecord, opponentName:'RIVAL',
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
    this.searchTimer?.remove?.();
    this.cityIntro?.destroy?.();
    this.entryModal?.destroy?.();
    this.objects.forEach(o=>o.destroy?.());
    clearTimeout(this.scene._resizeTimer);
  }
}
