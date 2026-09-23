// Offline asset preparation. Usage: node tools/prepare-rivals-announcer.mjs <source-folder> <ffmpeg-path> [clip-key]
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const [source, ffmpeg = 'ffmpeg', only] = process.argv.slice(2);
if (!source) throw new Error('Provide the folder containing the original voice clips.');
const output = fileURLToPath(new URL('../public/audio/rivals-announcer/', import.meta.url));
const clips = {
  br_countdown_3: 'THREE.mp3', br_countdown_2: 'two.mp3',
  br_countdown_1: 'ONE.mp3', br_go: 'go.mp3',
  br_opponent_house_1_1: 'OPP_clears_house_1.mp3',
  br_opponent_house_1_2: 'First house down for your opponent..mp3',
  br_opponent_house_1_3: 'Hm...Your opponent’s off to a tidy start..mp3',
  br_opponent_house_2_1: 'Opponent clears house two..mp3',
  br_opponent_house_2_2: 'Two houses down for your opponent..mp3',
  br_opponent_house_2_3: "Your opponent's making it look easy. Maybe it is...  for them..mp3",
  br_opponent_house_3_1: 'Opponent clears house three.mp3',
  br_opponent_house_3_2: 'Three down for your opponent.mp3',
  br_opponent_house_3_3: 'House three. Your opponent’s keeping busy.mp3',
  br_opponent_house_4_1: 'Your opp has cleared house four.mp3',
  br_opponent_house_4_2: 'Your opponent’s through four. Three to go..mp3',
  br_opponent_house_4_3: 'Four down. Your rival is more than halfway done..mp3',
  br_opponent_house_5_1: '“Opponent clears house five.”.mp3',
  br_opponent_house_5_2: 'Your opponent has two houses left..mp3',
  br_opponent_house_5_3: "Five down for your opponent. Oooh it's getting interesting..mp3",
  br_opponent_house_6_1: 'Rival clears house six..mp3',
  br_opponent_house_6_2: '“Your opponent’s on the final house.”.mp3',
  br_opponent_house_7_1: '“Your opponent has finished.”.mp3',
  br_opponent_house_7_2: '“Your opponent’s home. The clock is still yours.”.mp3',
  br_opponent_house_7_3: 'Your opponent is done. Bring it home.”3.mp3'
};
mkdirSync(output, { recursive: true });
for (const [key, name] of Object.entries(clips)) {
  if (only && only !== key) continue;
  const target = resolve(output, key + '.mp3');
  let filter = 'silenceremove=start_periods=1:start_duration=0.01:start_threshold=-45dB:start_silence=0.015,areverse,silenceremove=start_periods=1:start_duration=0.01:start_threshold=-45dB:start_silence=0.06,areverse,loudnorm=I=-18:TP=-1.5:LRA=7';
  // Preserve the opening T, shorten the quiet gap before its vowel, and tame
  // this take's stronger swell. Apply gain AFTER normalization so it sticks.
  filter += key === 'br_countdown_2'
    ? ',asplit=2[head][body];[head]atrim=end=0.035,asetpts=PTS-STARTPTS[h];[body]atrim=start=0.070,asetpts=PTS-STARTPTS[b];[h][b]acrossfade=d=0.004:c1=tri:c2=tri,atempo=1.08,volume=-4dB[out]'
    : '[out]';
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y',
    '-i', resolve(source, name), '-filter_complex', filter, '-map', '[out]',
    '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k', '-map_metadata', '-1', target], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message);
  const probe = spawnSync(ffmpeg, ['-hide_banner', '-i', target], { encoding: 'utf8' });
  console.log(key, probe.stderr.match(/Duration: ([\d:.]+)/)?.[1]);
}
