import { readFileSync } from 'node:fs';
import { missionPickupSound } from '../src/logic/missionItem.js';
let passed=0;
function check(name,ok){if(!ok)throw Error(name);passed++;}
const ids=['keys','marker','tube'];
check('three distinct sound signatures',new Set(ids.map(id=>JSON.stringify(missionPickupSound(id)))).size===3);
check('unknown sound is null',missionPickupSound('nope')===null && missionPickupSound('__proto__')===null && missionPickupSound()===null);
for(const id of ids){
  const notes=missionPickupSound(id);
  check('sound plan immutable '+id,Object.isFrozen(notes)&&notes.every(Object.isFrozen));
  check('sound plan short and finite '+id,notes.every(n=>n.hz>0&&n.endHz>0&&n.delay>=0&&n.duration>0&&n.delay+n.duration<0.3&&n.volume>0&&n.volume<=1));
}
const source=readFileSync(new URL('../src/audio/AudioManager.js',import.meta.url),'utf8')
  .replace(/^import[\s\S]*?;\s*/gm,'').replace(/export default AudioManager;/,'').replace(/export /g,'');
let now=1000;
const Audio=new Function('missionPickupSound','performance',source+'\nreturn AudioManager;')(missionPickupSound,{now:()=>now});
function manager(){
  const oscillators=[],gains=[],fallback=[];
  const ctx={currentTime:5,state:'running',destination:{},
    createOscillator(){
      const node={frequency:{values:[],setValueAtTime(value,time){this.values.push([value,time]);},
        exponentialRampToValueAtTime(value,time){this.values.push([value,time]);}},
        connect(){},disconnect(){this.disconnected=true;},
        start(time){this.startAt=time;},stop(time){this.stopAt=time;}};
      oscillators.push(node);return node;
    },
    createGain(){
      const node={gain:{peaks:[],setValueAtTime(){},linearRampToValueAtTime(value,time){this.peaks.push([value,time]);},exponentialRampToValueAtTime(){}},
        connect(){},disconnect(){this.disconnected=true;}};
      gains.push(node);return node;
    }
  };
  const audio=Object.assign(Object.create(Audio.prototype),{sound:{context:ctx},masterVolume:0.8,
    muted:false,_volSfx:0.5,lastPlay:new Map(),minInterval:{},play:key=>fallback.push(key)});
  return {audio,ctx,oscillators,gains,fallback};
}
for(const id of ids){
  const data=manager(),notes=missionPickupSound(id);
  check('item foley schedules '+id,data.audio.playMissionItemPickup(id)===true);
  check('right oscillator count '+id,data.oscillators.length===notes.length);
  check('right tone and delay '+id,data.oscillators.every((o,i)=>o.type===notes[i].type&&o.startAt===5+notes[i].delay&&o.frequency.values[0][0]===notes[i].hz));
  check('volume honours master and SFX '+id,data.gains.every((g,i)=>Math.abs(g.gain.peaks[0][0]-0.8*0.5*notes[i].volume*0.35)<1e-9));
  check('duplicate sound debounced '+id,data.audio.playMissionItemPickup(id)===false&&data.oscillators.length===notes.length);
  data.oscillators.forEach(o=>o.onended());
  check('finished nodes disconnect '+id,data.oscillators.every(o=>o.disconnected)&&data.gains.every(g=>g.disconnected));
}
for(const settings of [{muted:true},{masterVolume:0},{_volSfx:0}]){
  const data=manager();Object.assign(data.audio,settings);
  check('silent settings schedule nothing '+JSON.stringify(settings),!data.audio.playMissionItemPickup('keys')&&data.oscillators.length===0&&data.fallback.length===0);
}
const music=manager();music.audio.musicMuted=true;music.audio._volMusic=0;
check('music mute does not mute SFX',music.audio.playMissionItemPickup('marker'));
const fallback=manager();fallback.audio.sound.context=null;
check('no WebAudio uses generic cached fallback',fallback.audio.playMissionItemPickup('tube')===false&&fallback.fallback.join(',')==='pickup');
const unknown=manager();
check('unknown ID stays silent',!unknown.audio.playMissionItemPickup('nope')&&unknown.oscillators.length===0);
for(const id of ids){
  const stock=manager();
  stock.audio.scene={cache:{audio:{exists:key=>key==='mission_pickup'}}};
  check('stock violet case sound '+id,stock.audio.playMissionItemPickup(id)===true
    &&stock.fallback.join(',')==='mission_pickup'&&stock.oscillators.length===0);
}
const lockedStock=manager();
lockedStock.audio.scene={cache:{audio:{exists:()=>true}}};
lockedStock.audio.sound.locked=true;
check('locked stock cue does not queue',lockedStock.audio.playMissionItemPickup('keys')===false&&lockedStock.fallback.length===0);
console.log(passed+' mission foley assertions passed');
