// Film one crew story beat as the game plays it: a scratch profile that runs
// with GANG, is on CHAPTER of that crew's Season 1, and walks up to DOOR of a
// block. The contact beat, the house after it, and for DOOR=15 the chapter
// finale all play from the game's own flow; gates are real taps.
// GANG=crossline CHAPTER=3 DOOR=10 BLOCK=3 NAME=cl3-d10 GS=40 node beat-take.mjs
// Only local save state on the scratch profile is set (crew choice, chapter
// counter, tutorial done) - the same records the game writes itself.
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { PROBE, S } from './lib.mjs';
import { INSTALL_SAMPLER } from './sampler.mjs';
import { INSTALL_AUDIO_LOG } from './fixedstep.mjs';
import { captureTake } from './capture.mjs';
const { GANG, NAME } = process.env;
const CHAPTER = Number(process.env.CHAPTER || 1), DOOR = Number(process.env.DOOR || 1), BLOCK = Number(process.env.BLOCK || 3);
const CALM = 'bot=1&replanMs=260&wrongTurnChance=0.02&hesitateChance=0.01&dodgeCommitMs=450&dodgeRestMs=900';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM, headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--mute-audio', '--hide-scrollbars'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
const menu = () => p.waitForFunction(() => window.__plugRunGame?.scene?.getScene('MENU')?.sys?.isActive(), null, { timeout: 90000 });
await p.goto('http://127.0.0.1:4178/?' + CALM, { waitUntil: 'load', timeout: 90000 });
await menu();
const setup = await p.evaluate(async ({ gang, chapter }) => {
  const uid = JSON.parse(localStorage.getItem('pr_user') || '{}').id;
  localStorage.setItem('pr_tutorial_v1_' + uid, JSON.stringify({ version: 1, complete: true }));
  const { chooseWindowGang } = await import('/src/logic/window.js');
  const { getWindowState, saveWindowState } = await import('/src/utils/windowProgress.js');
  const chosen = chooseWindowGang(getWindowState(), gang);
  saveWindowState(chosen.state);
  localStorage.setItem('pr_contacts_v1_' + uid, JSON.stringify({ version: 1, blocks: {}, stories: { [gang]: { chapter: chapter - 1, lastBlock: 0 } } }));
  return { uid, gang: chosen.state.gangID, applied: chosen.applied };
}, { gang: GANG, chapter: CHAPTER });
console.log('profile', JSON.stringify(setup));
await p.reload({ waitUntil: 'load' });
await menu();
await p.waitForTimeout(2000);
await p.evaluate(INSTALL_SAMPLER);
let last = -999, started = false;
const take = await captureTake(p, { seconds: Number(process.env.GS || 40), out: S + '/v5-' + NAME + '.mp4', w: 1080, h: 1920, label: NAME,
  tick: async (i) => {
    if (i === 4 && !started) {
      started = true; last = i;
      await p.evaluate(({ door, block }) => window.__plugRunGame.scene.getScene('MENU').scene.start('RUNNER',
        { mode: 'pve', role: 'runner', runKind: 'journey', pveRound: door, blockIndex: block }), { door: DOOR, block: BLOCK });
      return;
    }
    if (i % 30 === 0) await p.evaluate(INSTALL_AUDIO_LOG).catch(() => {});
    // Each dialogue page holds ~2.3s so it can be read, then a real tap.
    if (i - last < 70) return;
    const st = await p.evaluate(() => { const s = window.__plugRunLiveScene; return { live: !!s, paused: !!(s && (s.roundPausedForMenu || s.pausedForModal)) }; });
    if (st.live && !st.paused) return;
    const r = await p.evaluate(PROBE);
    if (!r.hits || !r.hits.length) return;
    const h = r.hits.find(x => /LISTEN|VIEW|NEXT|>>|CONTINUE|ENTER|RUN|START|AGAIN|SEE THE/i.test(x.label)) || r.hits[0];
    await p.mouse.click(h.x, h.y); last = i;
  } });
writeFileSync(S + '/v5-' + NAME + '.json', JSON.stringify({ take: 'beat', gang: GANG, chapter: CHAPTER, door: DOOR, block: BLOCK, ...take }));
console.log(NAME, 'done', take.frames, 'frames', take.wallSec + 's', 'audio', take.audio.length);
await b.close();
