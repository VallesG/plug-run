import {
  RIVAL_HOUSES, RIVAL_COUNTDOWN_MS, RIVAL_TRANSITION_MS, RIVAL_RETRY_MS,
  rivalElapsed, rivalProgress, rivalOutcome, recordRivalClear, rivalTimeLabel, rivalRecord, nextRivalSlot
} from '../logic/rivals.js';
import { rivalOpponentLabel } from '../logic/rivalPresets.js';
import { saveRivalResult, resolveRivalOpponent, loadRivalReplay } from '../utils/rivalSession.js';
import { playRivalReplay } from './RivalReplayPlayer.js';
import { showRunnerLoadout } from './RunnerLoadout.js';
import ReplaySystem from './ReplaySystem.js';
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
    if (this.race.status === 'finished') { this.freeze(); this.showResult(); return; }
    if (this.race.status === 'racing') { this.resumeHouse(); return; }
    this.scene.roundPausedForMenu = true;
    this.scene.input.keyboard.enabled = false;
    if (this.race.status === 'countdown') return;
    // A recorded opponent is looked up before the loadout is shown, because
    // the loadout depends on it. Synchronous null means nothing to wait for.
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
    const armCountdown = () => {
      this.race.status = 'countdown';
      this.race.countdownEndsAt = performance.now() + RIVAL_COUNTDOWN_MS;
      this.scene.roundPausedForMenu = true;
      this.scene.input.keyboard.enabled = false;
      this.scene.suspendTouchUI?.(true);
    };
    // A recorded rival ran one fixed ordered loadout; the player gets the same
    // two charges so the comparison is like for like. Only the generated pace
    // fallback (no loadout of its own) still opens the picker.
    if (this.race.fixedPowers) {
      this.scene.runnerPowersSelected = this.race.fixedPowers.slice();
      this.race.powers = this.race.fixedPowers.slice();
      this.scene.gameUI.showModal({
        title:'BLOCK RIVALS', subtitle:this.opponentSubtitle(),
        lines:[
          'Loadout: ' + this.race.powers.map(p => p.toUpperCase()).join(' \u2192 '),
          'Same two charges as your rival. They refill each house and retry.'
        ],
        buttons:[
          {label:'READY TO RACE',variant:'primary',onClick:armCountdown},
          {label:'MAIN MENU',variant:'secondary',onClick:()=>this.scene.scene.start('MENU')}
        ]
      });
      return;
    }
    showRunnerLoadout(this.scene.gameUI, () => {
      this.race.powers = this.scene.runnerPowersSelected.slice();
      armCountdown();
    }, {
      title:'BLOCK RIVALS', subtitle:this.opponentSubtitle(),
      startLabel:'READY TO RACE', helpText:'Two charges refill each house and retry.',
      allowReplay:false, showAccount:false
    });
  }
  /** Who the player is racing, stated honestly: a recording of a bot, or a generated pace. */
  opponentSubtitle() {
    const course = this.race.course.name ? this.race.course.name + ' \u00b7 ' : '';
    if (this.race.opponentKind === 'recorded-bot') return course + '7 houses \u00b7 vs ' + (this.race.opponent?.displayName || 'BOT') + ' (recorded)';
    return course + '7 houses \u00b7 Simulated AI pace trial';
  }
  opponentShort() { return this.race.opponentKind === 'recorded-bot' ? rivalOpponentLabel(this.race.opponent) : 'AI PACE'; }
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
    const scene = this.scene, width = scene.scale.gameSize.width;
    const w = Math.min(width,480), left = (width-w)/2;
    const add = o => { this.objects.push(o); return o.setScrollFactor(0).setDepth(15000); };
    add(scene.add.rectangle(width/2,42,width,84,0x0a1118,0.98));
    const text = (x,y,value,color='#adbdc5',size=11) => add(scene.add.text(x,y,value,{
      fontFamily:'monospace',fontSize:size+'px',color
    }).setOrigin(0,0.5));
    text(left+12,16,this.race.course.name ? this.race.course.name.toUpperCase() : 'BLOCK RIVALS','#e5dec8',12);
    this.clock = text(left+w-124,16,'0:00.0','#e5dec8',12);
    const quit = add(scene.add.rectangle(left+w-28,18,48,32,0x141e28,1)).setInteractive({useHandCursor:true});
    text(left+w-45,18,'QUIT','#aeb9c1',10);
    quit.on('pointerdown', () => this.finish('forfeit',performance.now()));
    this.rows = [0,1].map(row => {
      const y = 44+row*22;
      const label = text(left+12,y,row?this.opponentShort()+' 0/7':'YOU 0/7',row?'#dec386':'#9bcae5',10);
      const gap=4, start=left+90, usable=w-102, seg=(usable-gap*6)/7;
      const bars = Array.from({length:7},(_,i) => add(
        scene.add.rectangle(start+i*(seg+gap)+seg/2,y,seg,10,0x23313a)
          .setStrokeStyle(1,0x3a4c58)));
      return {label,bars};
    });
    this.notice = add(scene.add.text(width/2,scene.scale.gameSize.height/2,'',{
      fontFamily:'monospace',fontSize:'24px',fontStyle:'bold',
      color:'#f0d294',stroke:'#071018',strokeThickness:5,align:'center'
    }).setOrigin(0.5));
  }
  paint(now) {
    const elapsed = this.race.status === 'finished' ? this.race.finishedMs : rivalElapsed(this.race,now);
    this.clock?.setText(rivalTimeLabel(elapsed));
    const counts = [this.race.clearTimes.length,rivalProgress(this.race.rivalTimes,elapsed)];
    this.rows?.forEach((row,i) => {
      row.label.setText((i?this.opponentShort()+' ':'YOU ')+counts[i]+'/7');
      row.bars.forEach((bar,j) => bar.setFillStyle(j<counts[i] ? (i?0xc6ac70:0x86bad5) : 0x23313a)
        .setStrokeStyle(1,j===counts[i] ? (i?0xc6ac70:0x86bad5) : 0x3a4c58));
    });
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
      else if (!this.transitioning && !this.scene.roundOver) tickAttemptCapture(this.scene,this.race,now);
    }
    this.paint(now);
    return this.race.status !== 'racing' || this.transitioning;
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
    const who = recorded ? (this.race.opponent?.displayName || 'BOT') : 'AI PACE';
    this.scene.gameUI.showModal({
      title:({win:'YOU WIN',loss:who.toUpperCase()+' WINS',draw:'PHOTO FINISH',forfeit:'RACE ENDED'})[this.race.result] || 'RACE ENDED',
      subtitle:recorded ? 'Recorded bot run \u00b7 not a live player' : 'Simulated AI pace \u00b7 not a live player',
      lines:[
        ...(this.race.course.name ? ['Course: '+this.race.course.name] : []),
        'You: '+this.race.clearTimes.length+'/7 houses \u00b7 '+this.race.retries+' retries',
        'Race time: '+rivalTimeLabel(this.race.finishedMs),
        (recorded ? who+': ' : 'AI target: ')+rivalTimeLabel(this.race.rivalTimes[RIVAL_HOUSES-1])
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
        bundle, record:this.race.opponentRecord, opponentName:this.race.opponent?.displayName || 'BOT',
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
    this.pending?.remove?.();
    this.objects.forEach(o=>o.destroy?.());
    clearTimeout(this.scene._resizeTimer);
  }
}
