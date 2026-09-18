import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GAMEPLAY_BEATS, selectBeat, momentNotes } from '../src/logic/musicPlaylist.js';
let state = null, last = null;
for (let cycle = 0; cycle < 10; cycle++) {
  const seen = new Set();
  for (let i = 0; i < 3; i++) {
    state = selectBeat(state, `${cycle}/${i}`, GAMEPLAY_BEATS, () => 0.3);
    assert.notEqual(state.key, last);
    seen.add(state.key); last = state.key;
    assert.equal(selectBeat(state, state.context, GAMEPLAY_BEATS), state);
  }
  assert.equal(seen.size, 3);
}
assert.equal(selectBeat(state, 'missing', []), state);
assert.equal(selectBeat(null, 'empty', []), null);
assert.equal(selectBeat(null, 'one', ['bg_learn', 'bg_learn']).key, 'bg_learn');
const race = {};
const first = selectBeat(null, race, GAMEPLAY_BEATS, () => 0.1);
assert.equal(selectBeat(first, race, GAMEPLAY_BEATS), first);
assert.notEqual(selectBeat(first, {}, GAMEPLAY_BEATS).key, first.key);
const course = {};
const originalRace = { course, clearTimes: [] }, nextHouseRace = { ...originalRace, clearTimes: [8000] };
const raceBeat = selectBeat(null, originalRace.course, GAMEPLAY_BEATS);
assert.equal(selectBeat(raceBeat, nextHouseRace.course, GAMEPLAY_BEATS), raceBeat);
for (const kind of ['contact', 'block', 'city']) {
  assert(momentNotes(kind).every(n => n.hz > 0 && n.duration > 0 && n.volume < 0.2 && n.delay + n.duration < 1.1));
}
const source = readFileSync(new URL('../src/audio/AudioManager.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\s*/gm, '').replace(/export default AudioManager;/, '').replace(/export /g, '');
const Audio = new Function('GAMEPLAY_BEATS', 'selectBeat', 'momentNotes', source + '\nreturn AudioManager;')
  (GAMEPLAY_BEATS, selectBeat, momentNotes);
const sound = { volume: 0, setVolume(value) { this.volume = value; } }; // Actual Phaser sounds have no .game.
const audio = Object.assign(Object.create(Audio.prototype), { music: { sound }, _musicVolState: { base: 0.6 },
  _duck: { mult: 0.8 }, scene: { runKind: 'journey', role: 'runner', blockIndex: 1 }, playMoment: () => true });
audio._applyMusicVolume(); assert.equal(sound.volume, 0.48);
const release = audio.beginContactMoment(); assert.equal(sound.volume, 0.24);
const release2 = audio.beginContactMoment(); release(); assert.equal(sound.volume, 0.24);
release2(); release2(); assert.equal(sound.volume, 0.48);
audio.muted = true; audio._applyMusicVolume(); assert.equal(sound.volume, 0);
audio.muted = false;
assert.equal(audio.playBlockClear(), true); assert.equal(audio.playBlockClear(), false);
audio.scene.blockIndex++; assert.equal(audio.playBlockClear(), true);
let added = [], removed = 0;
audio.scene.tweens = { add(config) { added.push(config); return { remove() { removed++; } }; } };
audio._hasWebAudio = true; audio._duck = { mult: 1, token: 0, priority: -1 };
audio.duckMusic(); assert.equal(added.length, 1);
added[0].onComplete(); assert.equal(added.length, 2);
added[1].onComplete(); assert.equal(added.length, 3);
added[2].onComplete(); assert.equal(audio._duck.mult, 1); assert.equal(audio._duck.timeline, null);
audio.duckMusic({ priority: 4 }); audio.duckMusic({ priority: 1 }); assert.equal(added.length, 4);
audio._duck.timeline.destroy(); assert.equal(removed, 1);
const samples = [];
const sampled = Object.assign(Object.create(Audio.prototype), { masterVolume: 0.8, muted: false, _volSfx: 1,
  sound: { context: { state: 'running', createOscillator() { throw Error('stock must bypass synthesis'); } } },
  scene: { cache: { audio: { exists: () => true } } }, play(key, options) { samples.push({ key, options }); } });
assert.equal(sampled.playMoment('contact'), true);
assert.equal(sampled.playMoment('block'), true);
assert.equal(sampled.playMoment('city'), true);
assert.deepEqual(samples.map(s => s.key), ['contact_open', 'completion_cue', 'completion_cue']);
assert.equal(samples[0].options.volume, 0.24);
sampled.muted = true; assert.equal(sampled.playMoment('contact'), false); assert.equal(samples.length, 3);
sampled.muted = false; sampled.sound.locked = true; assert.equal(sampled.playMoment('contact'), false);
sampled.sound.locked = false; sampled.sound.context.state = 'suspended';
assert.equal(sampled.playMoment('block'), false); assert.equal(samples.length, 3);
const loads = []; Audio.preloadMoments({ load: { audio(key, url) { loads.push([key, url]); } } });
assert.deepEqual(loads, [['contact_open', '/audio/contact_open.wav'],
  ['completion_cue', '/audio/completed.wav'], ['mission_pickup', '/audio/pickup.wav']]);
const victoryTimers=[], victoryEvents=[];
const victory=Object.assign(Object.create(Audio.prototype),{
 scene:{runKind:'journey',role:'runner',blockIndex:1,time:{delayedCall(ms,fn){victoryTimers.push({ms,fn});}},
   cache:{audio:{exists:()=>true}}}, sound:{},
 _playlist:{context:'block1',key:'bg_main',bag:['bg_plug','bg_learn']},
 stopMusic(ms){victoryEvents.push('fade-'+ms);this.music=null;},
 playMoment(kind){victoryEvents.push(kind);return true;}
});
checkVictory();
function checkVictory(){
 assert.equal(victory.playBlockClear(),true);
 assert.deepEqual(victoryEvents,['fade-250']);assert.equal(victoryTimers[0].ms,260);
 assert.equal(victory.playBlockClear(),false);assert.equal(victoryTimers.length,1);
 victoryTimers[0].fn();assert.deepEqual(victoryEvents,['fade-250','block']);
 victory.playMusic('bg_main');assert.equal(victory.music,null);
 victory.selectGameplayMusic('block2');assert.equal(victory._completionMusicHold,false);
 victoryTimers[0].fn();assert.equal(victoryEvents.length,2);
}
const tutorial = readFileSync(new URL('../src/scenes/TutorialMiniScene.js', import.meta.url), 'utf8');
const transitionTweens = [], created = [];
const music = Object.assign(Object.create(Audio.prototype), { masterVolume: 0.8, _volMusic: 1,
  _musicVolState: { base: 0.4 }, _duck: { mult: 1 }, _setupMusicFilter() {},
  scene: { cache: { audio: { exists: () => true } }, tweens: { killTweensOf() {}, add(config) {
    transitionTweens.push(config); return { remove() {} };
  } } }, sound: { add(key, options) {
    const s = { key, volume: options.volume, play() { this.isPlaying = true; },
      setVolume(v) { this.volume = v; }, stop() { this.stopped = true; }, destroy() { this.pendingRemove = true; } };
    created.push(s); return s;
  } } });
music.playMusic('bg_main', { volume: 0.5, fade: 0 });
music.playMusic('bg_plug', { volume: 0.5, fade: 800 });
assert.equal(created[1].volume, 0); assert.equal(created[0].volume, 0.4);
const incoming = transitionTweens[0], outgoing = transitionTweens[1];
incoming.targets.base = 0.4; incoming.onUpdate(); assert.equal(created[1].volume, 0.4);
outgoing.targets.vol = 0.1; outgoing.onUpdate(); assert.equal(created[0].volume, 0.1);
outgoing.onComplete(); assert.equal(created[0].pendingRemove, true);
music.playMusic('bg_plug', { volume: 0.5, fade: 0 }); assert.equal(created.length, 2);
music.sound.add = () => { throw Error('decode failed'); };
music.playMusic('bg_main'); assert.equal(music.music.sound, created[1]); assert(!created[1].pendingRemove);
assert(tutorial.includes("this.load.audio('bg_learn'"));
assert(!tutorial.includes("this.load.audio('learn_beat'"));
console.log('musicPlaylist: shuffle, scope, contact mix, mute, completion dedupe, Phaser duck queue and tutorial cache pass');
