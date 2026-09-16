import {
  RIVAL_HOUSES, RIVAL_COUNTDOWN_MS, RIVAL_TRANSITION_MS, RIVAL_RETRY_MS,
  rivalElapsed, rivalProgress, rivalOutcome, recordRivalClear, rivalTimeLabel, rivalRecord, nextRivalSlot, rivalHudLayout,
  rivalHouseFill, rivalPickupWindows, rivalCarryingAt, rivalFloorClock
} from '../logic/rivals.js';
import { saveRivalResult, resolveRivalOpponent, loadRivalReplay } from '../utils/rivalSession.js';
import { playRivalReplay } from './RivalReplayPlayer.js';
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
    if (this.race.status === 'racing') { this.resumeHouse(); return; }
    this.scene.roundPausedForMenu = true;
    this.scene.input.keyboard.enabled = false;
    if (this.race.status === 'countdown') return;
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
  openLoadout() {
    if (this.race.status !== 'ready') return;
    this.preparePickupProgress();
    const armCountdown = () => {
      this.race.status = 'countdown';
      this.race.countdownEndsAt = performance.now() + RIVAL_COUNTDOWN_MS;
      this.scene.roundPausedForMenu = true;
      this.scene.input.keyboard.enabled = false;
      this.scene.suspendTouchUI?.(true);
    };
    // Only explicit harness powers bypass selection. A bank recording never
    // supplies the player's loadout: competing mixes are part of the race.
    if (this.race.fixedPowers) {
      this.scene.runnerPowersSelected=this.race.fixedPowers.slice();
      this.race.powers=this.race.fixedPowers.slice();
      showRunnerLoadout(this.scene.gameUI,armCountdown,{
        title:'BLOCK RIVALS',subtitle:this.opponentSubtitle(),startLabel:'READY TO RACE',
        helpText:'Harness loadout. Refills each house.',
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
        ? 'Rival: '+this.race.opponent.orderedPowers.map(id=>id.toUpperCase()).join(' → ')+'\nYour powers refill each house.'
        : 'Your powers refill each house and retry.',
      allowReplay:false, showAccount:false, compact:false
    });
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
    this.settingsModal?.destroy?.();
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
    endAttemptCapture(this.scene,next,'extracted',now);
    this.scene.forensics?.extract(this.scene);
    this.scene.finalizeRun?.('rivals_extracted');
    ReplaySystem.finalize();
    this.freeze();
    this.scene.removeCarryPackage?.();
    const outcome=rivalOutcome(next.clearTimes,next.rivalTimes,elapsed);
    if (outcome) this.finish(outcome,now);
    else this.transition(this.scene.pveRound+1,RIVAL_TRANSITION_MS,'NEXT HOUSE');
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
    this.scene.finalizeRun?.('rivals_caught');
    ReplaySystem.finalize();
    this.freeze();
    this.transition(this.scene.pveRound,RIVAL_RETRY_MS,'CAUGHT\nRETRYING');
  }
  finish(result,now) {
    if (this.race.status==='finished') return;
    this.closeSettings(false);
    this.race.status='finished';
    this.race.result=result;
    this.race.finishedMs=result==='loss' ? this.race.rivalTimes[RIVAL_HOUSES-1] : rivalElapsed(this.race,now);
    endAttemptCapture(this.scene,this.race,'abandoned',now);
    this.freeze();
    this.pending?.remove?.();
    this.scene.finalizeRun?.('rivals_'+result);
    ReplaySystem.finalize();
    this.notice?.setText('');
    this.paint(now);
    const record=rivalRecord(this.race);
    // The player's own race in the shared record format (kind 'human', local,
    // unverified). Only a complete race with no abandoned attempt exports.
    const own = exportRaceCapture(this.race,{
      opponent:{ id:'local-player', displayName:'You', kind:'human' },
      recordingID:'local-'+this.race.course.id+'-'+Math.round(this.race.finishedMs)
    });
    this.saved=saveRivalResult({
      courseID:this.race.course.id,courseSlot:this.race.course.slot ?? null,result,elapsedMs:this.race.finishedMs,
      houses:this.race.clearTimes.length,retries:this.race.retries,
      opponentKind:this.race.opponentKind,recordingID:this.race.opponent?.recordingID ?? null
    },record,own.ok ? own.record : null);
    this.showResult();
  }
  showResult() {
    const recorded = this.race.opponentKind === 'recorded-bot';
    const who = 'RIVAL';
    this.scene.gameUI.showModal({
      title:({win:'YOU WIN',loss:who.toUpperCase()+' WINS',draw:'PHOTO FINISH',forfeit:'RACE ENDED'})[this.race.result] || 'RACE ENDED',
      subtitle:recorded ? 'Recorded rival run · not live' : 'Rival pace trial',
      lines:[
        ...(this.race.course.name ? ['Course: '+this.race.course.name] : []),
        'You: '+this.race.clearTimes.length+'/7 houses \u00b7 '+this.race.retries+' retries',
        'Race time: '+rivalTimeLabel(this.race.finishedMs),
        'Rival: '+rivalTimeLabel(this.race.rivalTimes[RIVAL_HOUSES-1])
          +(recorded && Number.isFinite(this.race.opponent?.retries) ? ' \u00b7 '+this.race.opponent.retries+' retries' : ''),
        ...(this.saved===false ? ['Local result could not be saved.'] : [])
      ],
      buttons:[
        ...(recorded && (this.race.opponent?.replayURL || this.race.opponentBundle) ? [{
          label:'\u25B6 WATCH RIVAL REPLAY',variant:'secondary',keepOpen:true,onClick:(m)=>this.watchRival(m)
        }] : []),
        {label:'REMATCH',variant:'primary',onClick:()=>this.scene.scene.restart({
          mode:'pve',role:'runner',runKind:'rivals',rivalSeed:this.race.course.seed,
          rivalOpponentID:this.race.opponent?.recordingID ?? undefined,...this.harnessRestartData()
        })},
        {label:'NEW RACE',variant:'secondary',onClick:()=>this.scene.scene.restart({
          mode:'pve',role:'runner',runKind:'rivals',rivalSlot:nextRivalSlot(this.race.course.slot),...this.harnessRestartData()
        })},
        {label:'MAIN MENU',variant:'secondary',onClick:()=>this.scene.scene.start('MENU')}
      ]
    });
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
    if (this.transitioning) return; // pending restart already adopts the new viewport
    if (this.race.status==='racing') { this.retryHouse('resize'); return; }
    this.scene.scene.restart({
      mode:'pve',role:'runner',runKind:'rivals',pveRound:this.scene.pveRound,rivalRace:this.race
    });
  }
  dispose() {
    this.disposed=true;
    this.closeSettings(false);
    this.pending?.remove?.();
    this.objects.forEach(o=>o.destroy?.());
    clearTimeout(this.scene._resizeTimer);
  }
}
