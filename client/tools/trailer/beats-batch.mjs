// Run the crew story-beat takes, a few at a time.
import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
const S = process.env.TRAILER_OUT;
const JOBS = [
  // name, gang, chapter, door, block, seconds
  ['cl10-d15', 'crossline', 10, 15, 10, 80], ['ir10-d15', 'iron-row', 10, 15, 10, 80], ['al10-d15', 'afterlight', 10, 15, 10, 80],
  ['cl8-d15', 'crossline', 8, 15, 8, 80],
  ['cl1-d9', 'crossline', 1, 9, 3, 36], ['ir1-d9', 'iron-row', 1, 9, 3, 36],
  ['al1-d4', 'afterlight', 1, 4, 3, 32], ['cl3-d10', 'crossline', 3, 10, 3, 32],
  ['ir4-d9', 'iron-row', 4, 9, 4, 38], ['ir9-d13', 'iron-row', 9, 13, 9, 30],
  ['al6-d9', 'afterlight', 6, 9, 6, 38], ['al10-d9', 'afterlight', 10, 9, 10, 44]
];
const MAX = Number(process.env.PAR || 6);
let next = 0, running = 0;
await new Promise((resolve) => {
  const launch = () => {
    while (running < MAX && next < JOBS.length) {
      const [name, gang, ch, door, block, gs] = JOBS[next++];
      running++;
      const log = openSync(`${S}/log5-${name}.txt`, 'w');
      const c = spawn(process.execPath, ['beat-take.mjs'], { env: { ...process.env, NAME: name, GANG: gang, CHAPTER: String(ch), DOOR: String(door), BLOCK: String(block), GS: String(gs) }, stdio: ['ignore', log, log] });
      c.on('exit', (code) => { console.log(name, 'exit', code); running--; if (next >= JOBS.length && running === 0) resolve(); else launch(); });
    }
  };
  launch();
});
console.log('all beats done');
