import {
  RIVAL_HOUSES, RIVAL_COUNTDOWN_MS, RIVAL_TRANSITION_MS, RIVAL_RETRY_MS,
  rivalElapsed, rivalProgress, rivalOutcome, recordRivalClear, rivalTimeLabel, rivalRecord, nextRivalSlot
} from '../logic/rivals.js';
import { saveRivalResult } from '../utils/rivalSession.js';
import { showRunnerLoadout } from './RunnerLoadout.js';
import ReplaySystem from './ReplaySystem.js';

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
    showRunnerLoadout(this.scene.gameUI, () => {
      this.race.powers = this.scene.runnerPowersSelected.slice();
      this.race.status = 'countdown';
      this.race.countdownEndsAt = performance.now() + RIVAL_COUNTDOWN_MS;
      this.scene.roundPausedForMenu = true;
      this.scene.input.keyboard.enabled = false;
      this.scene.suspendTouchUI?.(true);
    }, {
      title:'BLOCK RIVALS', subtitle:'7 houses · Simulated AI pace trial',
      startLabel:'READY TO RACE', helpText:'Two charges refill each house and retry.',
      allowReplay:false, showAccount:false
    });
  }
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
      const label = text(left+12,y,row?'AI 0/7':'YOU 0/7',row?'#dec386':'#9bcae5',10);
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
      row.label.setText((i?'AI ':'YOU ')+counts[i]+'/7');
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
        this.resumeHouse();
      }
    }
    if (this.race.status === 'racing') {
      const outcome = rivalOutcome(this.race.clearTimes,this.race.rivalTimes,rivalElapsed(this.race,now));
      if (outcome) this.finish(outcome,now);
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
    this.scene.forensics?.extract(this.scene);
    this.scene.finalizeRun?.('rivals_extracted');
    ReplaySystem.finalize();
    this.freeze();
    this.scene.removeCarryPackage?.();
    const outcome=rivalOutcome(next.clearTimes,next.rivalTimes,elapsed);
    if (outcome) this.finish(outcome,now);
    else this.transition(this.scene.pveRound+1,RIVAL_TRANSITION_MS,'NEXT HOUSE');
  }
  retryHouse() {
    if (this.scene.roundOver || this.race.status!=='racing') return;
    const now=performance.now();
    if (rivalOutcome(this.race.clearTimes,this.race.rivalTimes,rivalElapsed(this.race,now))) {
      this.finish('loss',now); return;
    }
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
    this.freeze();
    this.pending?.remove?.();
    this.scene.finalizeRun?.('rivals_'+result);
    ReplaySystem.finalize();
    this.notice?.setText('');
    this.paint(now);
    const record=rivalRecord(this.race);
    this.saved=saveRivalResult({
      courseID:this.race.course.id,courseSlot:this.race.course.slot ?? null,result,elapsedMs:this.race.finishedMs,
      houses:this.race.clearTimes.length,retries:this.race.retries,opponentKind:'simulated-ai'
    },record);
    this.showResult();
  }
  showResult() {
    this.scene.gameUI.showModal({
      title:({win:'YOU WIN',loss:'AI PACE WINS',draw:'PHOTO FINISH',forfeit:'RACE ENDED'})[this.race.result] || 'RACE ENDED',
      subtitle:'Simulated AI pace · not a live player',
      lines:[
        ...(this.race.course.name ? ['Course: '+this.race.course.name] : []),
        'You: '+this.race.clearTimes.length+'/7 houses · '+this.race.retries+' retries',
        'Race time: '+rivalTimeLabel(this.race.finishedMs),
        'AI target: '+rivalTimeLabel(this.race.rivalTimes[RIVAL_HOUSES-1]),
        ...(this.saved===false ? ['Local result could not be saved.'] : [])
      ],
      buttons:[
        {label:'REMATCH',variant:'primary',onClick:()=>this.scene.scene.restart({
          mode:'pve',role:'runner',runKind:'rivals',rivalSeed:this.race.course.seed
        })},
        {label:'NEW RACE',variant:'secondary',onClick:()=>this.scene.scene.restart({
          mode:'pve',role:'runner',runKind:'rivals',rivalSlot:nextRivalSlot(this.race.course.slot)
        })},
        {label:'MAIN MENU',variant:'secondary',onClick:()=>this.scene.scene.start('MENU')}
      ]
    });
  }
  resize() {
    if (this.transitioning) return; // pending restart already adopts the new viewport
    if (this.race.status==='racing') { this.retryHouse(); return; }
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
