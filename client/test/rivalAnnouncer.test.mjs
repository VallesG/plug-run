import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { nextRivalAnnouncement, RIVAL_ANNOUNCER_KEYS } from '../src/logic/rivalAnnouncer.js';

const race = { status: 'countdown', countdownEndsAt: 3000, startedAt: 3000,
  rivalTimes: [1000, 2000, 3000, 4000, 5000, 6000, 7000] };
assert.equal(nextRivalAnnouncement(race, 0), 'br_countdown_3');
assert.equal(nextRivalAnnouncement(race, 16), null);
assert.equal(nextRivalAnnouncement(race, 1000), 'br_countdown_2');
assert.equal(nextRivalAnnouncement(race, 2000), 'br_countdown_1');
assert.equal(nextRivalAnnouncement(race, 3000), 'br_go');
assert.equal(nextRivalAnnouncement(race, 3100), null);
race.status = 'racing';
assert.equal(nextRivalAnnouncement(race, 3500), null);
assert.match(nextRivalAnnouncement(race, 4000), /^br_opponent_house_1_[123]$/);
assert.equal(nextRivalAnnouncement({ ...race }, 4100), null, 'house restarts do not replay an announcement');
assert.match(nextRivalAnnouncement(race, 8000), /^br_opponent_house_5_[123]$/, 'skip stale intermediate clears');
assert.equal(nextRivalAnnouncement(race, 7900), null, 'clock credit never replays a clear');
assert.match(nextRivalAnnouncement(race, 9000), /^br_opponent_house_6_[12]$/);
assert.match(nextRivalAnnouncement(race, 10000), /^br_opponent_house_7_[123]$/);
assert.equal(nextRivalAnnouncement(race, 11000), null);
race.status = 'finished';
assert.equal(nextRivalAnnouncement(race, 12000), null);
const fresh = () => ({ ...race, status: 'racing', announcerState: undefined });
assert.notEqual(nextRivalAnnouncement(fresh(), 4000, () => 0), nextRivalAnnouncement(fresh(), 4000, () => 0), 'avoid previous race variant');
const late = { ...fresh(), status: 'countdown', countdownEndsAt: 3000 };
assert.equal(nextRivalAnnouncement(late, 2500), 'br_countdown_1', 'late load skips missed countdown numbers');
for (const key of RIVAL_ANNOUNCER_KEYS) {
  assert.ok(existsSync(new URL(`../public/audio/rivals-announcer/${key}.mp3`, import.meta.url)), key);
}

// Exercise the actual shared sound channel with a minimal sound manager.
const source = readFileSync(new URL('../src/audio/AudioManager.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace('export default AudioManager;', '').replace(/^export /gm, '');
const AudioManager = new Function('RIVAL_ANNOUNCER_KEYS', source + '\nreturn AudioManager;')(RIVAL_ANNOUNCER_KEYS);
const voices = [];
const audio = Object.assign(Object.create(AudioManager.prototype), {
  muted: false, masterVolume: 0.8, _volSfx: 1,
  scene: { cache: { audio: { exists: () => true } } },
  _applyMusicVolume() { this.appliedMix = this._rivalVoiceMix; },
  sound: { add(key) {
    const voice = { key, destroyed: false, once(event, fn) { this.complete = fn; },
      play() { return true; }, destroy() { this.destroyed = true; } };
    voices.push(voice); return voice;
  } }
});
audio.playRivalAnnouncement('br_go');
assert.equal(audio.appliedMix, 0.45);
audio.playRivalAnnouncement('br_opponent_house_1_1');
assert.ok(voices[0].destroyed, 'new cue cannot overlap old cue');
voices[0].complete();
assert.equal(audio._rivalVoice, voices[1], 'old completion cannot stop new speech');
voices[1].complete();
assert.equal(audio._rivalVoice, null);
assert.equal(audio.appliedMix, 1, 'restore music after speech');
audio.playRivalAnnouncement('br_go');
audio.setMute(true);
assert.ok(voices[2].destroyed, 'mute immediately stops active speech');
audio.playRivalAnnouncement('br_go');
assert.equal(voices.length, 3, 'muted cues never play');
audio.setMute(false);
audio.sound.add = () => ({ once() {}, play: () => false, destroy() {} });
audio.playRivalAnnouncement('br_go');
assert.equal(audio._rivalVoice, null);
assert.equal(audio.appliedMix, 1, 'failed playback cannot leave music ducked');
console.log('Rival announcer: sequencing, asset coverage, variety, mute and sound lifecycle passed.');
