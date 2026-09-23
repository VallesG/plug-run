// Crew trailer plans. A beat take's dialogue pages each hold 70 frames: page 0
// shows from ~frame 8, page k (k>=1) from 75+70(k-1). pg() cuts inside a page.
const fs = require('fs');
const SP = process.env.SP;
const pg = (src, k, len, note) => { const from = (k === 0 ? 10 : 75 + 70 * (k - 1) + 2); return { src, from, to: from + (len || 64), screen: true, note }; };
const play = (src, from, to, note) => ({ src, from, to, note });
const scr = (src, from, to, note) => ({ src, from, to, screen: true, note });
const END = { image: SP + '/wt-trailer/promo/plug-run-poster-1080x1920.png', seconds: 3.0 };
const MUSIC = SP + '/wt-trailer/client/public/audio/gameplay_beat6.wav';
const plans = {};
plans.afterlight = [
  play('v5-al1-d4', 792, 866, 'cold open: dash'),
  scr('v3-story-afterlight', 215, 254, 'YOU RUN WITH AFTERLIGHT'),
  scr('v3-story-afterlight', 455, 489, 'Vee: clean line in, clean line out'),
  scr('v3-story-afterlight', 497, 545, 'Sol: timing curb splits'),
  scr('v3-story-afterlight', 637, 695, 'Sol: Sol-id'),
  play('v5-al1-d4', 364, 430, 'phase'),
  pg('v5-al1-d4', 1, 46, 'Sol: runner is cooking'),
  pg('v5-al1-d4', 2, 54, 'Vee: do not call people cooking on comms'),
  pg('v5-al1-d4', 3, 60, 'Sol: performing above thermal expectations'),
  play('v3-story-afterlight', 1100, 1172, 'escape to the car'),
  pg('v5-al6-d9', 0, 62, 'Sol: all glow, no weight'),
  pg('v5-al6-d9', 3, 60, 'Vee: making it a shirt'),
  pg('v5-al6-d9', 4, 42, 'Sol: diabolical'),
  play('v5-al10-d9', 806, 872, 'phase'),
  pg('v5-al10-d9', 5, 60, 'Sol: CONNECT APPROVED'),
  pg('v5-al10-d9', 7, 66, 'Sol: the Connect'),
  pg('v5-al10-d9', 10, 54, 'Vee: do not compliment the monopoly'),
  pg('v5-al10-d15', 0, 62, 'Vee: two Plugs behind this door'),
  play('v5-al10-d15', 203, 278, 'house 15, two Plugs'),
  END
];
plans.crossline = [
  play('v5-cl10-d15', 178, 246, 'cold open: phase in house 15, two Plugs'),
  scr('v3-story-crossline', 213, 254, 'YOU RUN WITH CROSSLINE'),
  scr('v3-story-crossline', 455, 489, 'Switch: bag, curb, car'),
  scr('v3-story-crossline', 495, 551, 'Mags: ghosts do not have this much aura'),
  play('v3-story-crossline', 1512, 1584, 'escape to the car'),
  pg('v5-cl1-d9', 0, 62, 'Mags: violet case, beat-up scanner'),
  pg('v5-cl1-d9', 1, 48, 'Switch: that channel has been dead for years'),
  pg('v5-cl1-d9', 2, 52, 'Mags: it just said our street name'),
  pg('v5-cl1-d9', 3, 40, 'Switch: bring it out. Now.'),
  play('v5-cl1-d9', 374, 440, 'phase'),
  pg('v5-cl3-d10', 3, 48, 'Mags: it has no battery'),
  pg('v5-cl3-d10', 4, 40, 'Switch: I know'),
  play('v3-story-crossline', 2158, 2224, 'dash'),
  scr('v3-story-crossline', 1652, 1706, 'Mags: the runner is lowkey eating'),
  pg('v5-cl10-d9', 0, 50, 'Mags: relay log, destination Copper Bay'),
  pg('v5-cl10-d9', 1, 40, 'Switch: they do not know us'),
  pg('v5-cl10-d9', 2, 52, 'Mags: page one says CROSSLINE'),
  pg('v5-cl10-d9', 3, 44, 'Switch: I withdraw the statement'),
  pg('v5-cl10-d15', 0, 62, 'Switch: house 15 has two Plugs'),
  play('v5-cl10-d15', 625, 695, 'decoy in house 15'),
  END
];
plans['iron-row'] = [
  play('v5-ir10-d15', 2090, 2160, 'cold open: bullet 0.18 cells, house 15'),
  scr('v3-story-ironrow', 213, 254, 'YOU RUN WITH IRON ROW'),
  scr('v3-story-ironrow', 455, 489, 'Brick: bag to trunk'),
  scr('v3-story-ironrow', 490, 544, 'Rook: good luck, in her special little way'),
  scr('v3-story-ironrow', 575, 611, 'Brick: I did not'),
  play('v3-story-ironrow', 1206, 1276, 'escape to the car'),
  pg('v5-ir1-d9', 2, 58, 'Rook: do not let Brick-'),
  pg('v5-ir1-d9', 3, 30, 'Brick: cute'),
  pg('v5-ir1-d9', 4, 58, 'Rook: that is your scary voice'),
  play('v5-ir4-d9', 523, 589, 'phase'),
  pg('v5-ir4-d9', 2, 52, 'Rook: suddenly feel underpaid'),
  pg('v5-ir4-d9', 3, 40, 'Brick: you are underpaid'),
  pg('v5-ir4-d9', 4, 30, 'Rook: thank you'),
  pg('v5-ir4-d9', 5, 46, 'Brick: because you work for me'),
  play('v5-ir9-d13', 680, 750, 'escape'),
  pg('v5-ir9-d13', 3, 62, 'Brick: crime should look like crime'),
  pg('v5-ir10-d9', 2, 58, 'Rook: ready for Copper Bay work'),
  pg('v5-ir10-d9', 4, 38, 'Rook: I asked his budget'),
  pg('v5-ir10-d9', 5, 38, 'Brick: of course you did'),
  pg('v5-ir10-d15', 0, 62, 'Brick: two Plugs in house 15'),
  play('v5-ir10-d15', 1858, 1930, 'escape from house 15'),
  END
];
for (const [crew, segments] of Object.entries(plans)) {
  fs.writeFileSync(`plan-${crew}.json`, JSON.stringify({ music: MUSIC, musicDb: -7, segments }, null, 1));
  const s = segments.reduce((t, x) => t + (x.seconds || (x.to - x.from) / 30), 0);
  console.log(crew, segments.length, 'segments', s.toFixed(1) + 's');
}
