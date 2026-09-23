// Record one of Jev's shipped runs in the game's own rival replay viewer (the
// same playRivalReplay that WATCH RIVAL opens), on the fixed-step clock.
// BANK=jev-v1 REC=rec-... COURSE=rivals-v1-... NAME=jev-x node jev-take.mjs
// Nothing is driven: the run is Jev's recorded race, played back.
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { S } from './lib.mjs';
import { captureTake } from './capture.mjs';
const { BANK, REC, COURSE, NAME } = process.env;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM, headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--mute-audio', '--hide-scrollbars'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
await p.goto('http://127.0.0.1:4178/', { waitUntil: 'load', timeout: 90000 });
await p.waitForFunction(() => window.__plugRunGame?.scene?.getScene('MENU')?.sys?.isActive(), null, { timeout: 90000 });
await p.waitForTimeout(2000);
// The viewer draws each house with the game's wall and floor textures, which
// the race scene loads. Load it once (as WATCH RIVAL always has it loaded),
// then return to the quiet menu to play the replay on.
await p.evaluate(() => window.__plugRunGame.scene.getScene('MENU').scene.start('RUNNER', { mode: 'pve', role: 'runner', runKind: 'journey' }));
await p.waitForFunction(() => window.__plugRunGame.scene.getScene('RUNNER')?.sys?.isActive(), null, { timeout: 60000 });
await p.waitForTimeout(3000);
await p.evaluate(() => window.__plugRunGame.scene.getScene('RUNNER').scene.start('MENU'));
await p.waitForFunction(() => window.__plugRunGame.scene.getScene('MENU')?.sys?.isActive(), null, { timeout: 60000 });
await p.waitForTimeout(1500);
const info = await p.evaluate(async ({ bank, rec, course }) => {
  const opp = await (await fetch(`/rivals/${bank}/courses/${course}/opponents.json`)).json();
  const list = Array.isArray(opp) ? opp : (opp.opponents || []);
  const entry = list.find(o => (o.record || o).recordingID === rec);
  if (!entry) return { err: 'record not found', keys: Object.keys(opp) };
  const record = entry.record || entry;
  const url = entry.replayURL || record.replayURL || `/rivals/${bank}/replays/${rec}.json`;
  const bundle = await (await fetch(url)).json();
  window.__jev = { record, bundle };
  // The viewer plays Jev's cues through scene.audio; give the menu scene the
  // game's AudioManager and log each cue on the page clock, like the takes.
  const { default: AudioManager } = await import('/src/audio/AudioManager.js');
  const scene = window.__plugRunGame.scene.getScene('MENU');
  scene.audio = AudioManager.get(scene);
  const log = window.__audioLog = [];
  const orig = scene.audio.play.bind(scene.audio);
  scene.audio.play = (key, opts) => { log.push({ t: performance.now(), key: String(key), vol: +((opts?.volume ?? 1)).toFixed(3) }); try { return orig(key, opts); } catch { return null; } };
  return { url, segments: bundle.segments.length, name: record.opponent?.displayName, powers: record.orderedPowers };
}, { bank: BANK, rec: REC, course: COURSE });
console.log('loaded', JSON.stringify(info));
if (info.err) process.exit(1);
// Per-frame: where Jev, his Plug, his bullets and his decoy are (read-only).
await p.evaluate(() => {
  const rows = window.__capRows = [];
  const tick = () => {
    const s = window.__plugRunGame.scene.getScene('MENU');
    const gh = s.children.list.filter(o => o._isReplayGhost && o.visible);
    const tex = o => { if (o.texture && o.texture.key && o.texture.key !== '__DEFAULT') return o.texture.key; for (const c of (o.list || [])) { const k = tex(c); if (k) return k; } return ''; };
    const row = { t: performance.now(), live: gh.length ? 1 : 0 };
    const jr = gh.find(o => o.type === 'Container' && /runner/.test(tex(o)));
    const jp = gh.find(o => o.type === 'Container' && /plug/.test(tex(o)));
    const bl = gh.filter(o => o.type === 'Arc' && o.fillColor === 0xffd166);
    const dc = gh.find(o => o.type === 'Image' && /td_runner/.test(o.texture.key) && o.alpha < 0.6);
    if (jr) { row.gx = Math.round(jr.x); row.gy = Math.round(jr.y); row.ga = +jr.alpha.toFixed(2);
      if (bl.length) { let m = Infinity; for (const q of bl) m = Math.min(m, Math.hypot(q.x - jr.x, q.y - jr.y)); row.gb = Math.round(m); row.gbr = +(bl[0].radius || 0).toFixed(1); }
      if (jp) { row.gpx = Math.round(jp.x); row.gpy = Math.round(jp.y); row.gp = Math.round(Math.hypot(jp.x - jr.x, jp.y - jr.y)); } }
    if (dc) { row.dx = Math.round(dc.x); row.dy = Math.round(dc.y); }
    rows.push(row); requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
let started = false, done = false;
const seconds = Number(process.env.GS || 100);
const take = await captureTake(p, { seconds, out: S + '/v3-' + NAME + '.mp4', w: 1080, h: 1920, label: NAME,
  tick: async (i) => {
    if (i === 3 && !started) {
      started = true;
      await p.evaluate(() => { const { record, bundle } = window.__jev; const s = window.__plugRunGame.scene.getScene('MENU');
        import('/src/controllers/RivalReplayPlayer.js').then(m => m.playRivalReplay(s, { bundle, record, opponentName: 'Jev', playerTimes: [], onDone: () => { window.__jevDone = true; } })); });
    }
    if (!done && i % 30 === 0) done = await p.evaluate(() => !!window.__jevDone);
  } });
writeFileSync(S + '/v3-' + NAME + '.json', JSON.stringify({ take: 'jev', bank: BANK, rec: REC, course: COURSE, ...take }));
console.log(NAME, 'done', take.frames, 'frames', take.wallSec + 's', 'audio', take.audio.length, 'replay finished', done);
await b.close();
