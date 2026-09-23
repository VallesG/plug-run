// Build plan-rivals.json: Block Rivals vs Jev. Jev shots come from the Jev
// recording sessions' own videos; ours from the calm-bot Rivals takes.
const fs = require('fs');
const SP = process.env.SP;
const pick = JSON.parse(fs.readFileSync(SP + '/trailer-out/jevvid2/pick.json', 'utf8'));
const REC = 'C:/dev/plug-run/client/tools/recordings/jev/';
const vol = { phase: 0.7, dash: 0.45, decoy: 0.4 };
const jev = (i, cx, cy, note, pre = 1300, dur = 2.3) => {
  const x = pick[i], ev = JSON.parse(fs.readFileSync(REC + x.mp4.replace('.mp4', '.events.json'), 'utf8')).events, sfx = [];
  for (const e of ev) { const rt = e.videoMs - (x.t - pre); if (rt < 0 || rt >= dur * 1000) continue;
    if (e.kind === 'jev-power-activated') sfx.push({ t: rt, key: e.name, vol: vol[e.name] || 0.5 });
    if (e.kind === 'pickup') { sfx.push({ t: rt, key: 'pickup', vol: 0.8 }); sfx.push({ t: rt, key: 'spickup', vol: 0.7 }); }
    if (e.kind === 'jev-damage') sfx.push({ t: rt, key: 'ouch', vol: 0.7 }); }
  return { video: REC + x.mp4, start: (x.t - pre) / 1000, dur, cx, cy, zoom: 1.35, sfx, note: 'Jev: ' + note + ' (' + x.mp4.split('/').pop() + ')' };
};
const segs = [
  jev(11, 0.52, 0.26, 'dash out from beside the Plug'),
  { src: 'v3-rivals-a', from: 30, to: 78, screen: true, note: 'Rivals district map' },
  { src: 'v3-rivals-a', from: 318, to: 390, screen: true, note: 'finding rival, Jev found' },
  { src: 'v3-rivals-a', from: 400, to: 470, screen: true, note: 'lobby: powers, READY' },
  { src: 'v3-rivals-a', from: 478, to: 553, screen: true, note: 'countdown into the race' },
  { src: 'v3-rivals-a', from: 590, to: 656, note: 'you: stash grab' },
  jev(1, 0.63, 0.36, 'phase at the stash, Plug above'),
  { src: 'v3-rivals-a', from: 775, to: 842, note: 'you: decoy' },
  jev(10, 0.33, 0.85, 'dash away from the Plug'),
  { src: 'v3-rivals-b', from: 562, to: 630, note: 'you: dash' },
  jev(21, 0.55, 0.33, 'dash onto a stash'),
  { src: 'v3-rivals-a', from: 1084, to: 1150, note: 'you: dash' },
  jev(7, 0.66, 0.5, 'dash past the Plug'),
  { src: 'v3-rivals-b', from: 3030, to: 3096, note: 'you: near miss 0.22 cells' },
  jev(22, 0.37, 0.6, 'dash, Plug on his heels'),
  { src: 'v3-rivals-a', from: 2598, to: 2643, note: 'JEV FINISHED 1:04.6 while you are still running' }
];
if (fs.existsSync(SP + '/trailer-out/v3-result.json')) segs.push({ src: 'v3-result', from: 12, to: 108, screen: true, note: 'race result: JEV WINS' });
segs.push({ image: SP + '/wt-trailer/promo/plug-run-poster-1080x1920.png', seconds: 3.0 });
fs.writeFileSync('plan-rivals.json', JSON.stringify({ music: SP + '/wt-trailer/client/public/audio/gameplay_beat6.wav', musicDb: -7, segments: segs }, null, 1));
const secs = segs.reduce((s, x) => s + (x.dur || x.seconds || (x.to - x.from) / 30), 0);
console.log(segs.length, 'segments,', secs.toFixed(1) + 's');
