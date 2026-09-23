// Trailer v2 takes. TAKE=story|deaths|rivals node session2.mjs
// Same rules as session.mjs: BotDriver plays through the real input path,
// gates are real clicks, the fixed-step clock changes only the clock.
// deaths: the BOT is made worse (shorter dodge range, more wrong turns);
// the game, the Plug and every balance value are untouched.
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { PROBE, S } from './lib.mjs';
import { clearGates } from './drive.mjs';
import { INSTALL_SAMPLER } from './sampler.mjs';
import { INSTALL_AUDIO_LOG } from './fixedstep.mjs';
import { captureTake } from './capture.mjs';

const TAKE = process.env.TAKE || 'story';
const EXE = process.env.CHROMIUM;
const QUERY = { story: 'bot=1', deaths: 'bot=1&dangerCells=2&laneToleranceCells=0.25&wrongTurnChance=0.18', rivals: 'bot=1' }[TAKE];
const b = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--mute-audio', '--hide-scrollbars'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
await p.goto('http://127.0.0.1:4178/?' + QUERY, { waitUntil: 'load', timeout: 90000 });
await p.waitForFunction(() => window.__plugRunGame?.scene?.getScene('MENU')?.sys?.isActive(), null, { timeout: 90000 });
const uid = await p.evaluate(() => JSON.parse(localStorage.getItem('pr_user') || '{}').id);
await p.evaluate(u => localStorage.setItem('pr_tutorial_v1_' + u, JSON.stringify({ version: 1, complete: true })), uid);
await p.reload({ waitUntil: 'load' });
await p.waitForFunction(() => window.__plugRunGame?.scene?.getScene('MENU')?.sys?.isActive(), null, { timeout: 90000 });
await p.waitForTimeout(2500);
await p.evaluate(INSTALL_SAMPLER);
const probe = () => p.evaluate(PROBE);
const click = async (re) => { const r = await probe(); const h = (r.hits || []).find(x => re.test(x.label)); if (h) await p.mouse.click(h.x, h.y); return h?.label; };
const state = () => p.evaluate(() => { const s = window.__plugRunLiveScene;
  const rc = window.__plugRunGame.scene.getScene('RUNNER')?.rivals?.race;
  return { live: !!s, paused: !!(s && (s.roundPausedForMenu || s.pausedForModal)), stage: rc?.entryStage, status: rc?.status, result: rc?.result }; });

let last = -999, hold = 0;
// Hold each gate long enough to read (dialogue ~2.3s a page), then advance.
const gateTick = (holdFrames, re) => async (i) => {
  if (i - last < holdFrames) return;
  const st = await state();
  if (st.live && !st.paused) return;
  const r = await probe();
  if (!r.hits || !r.hits.length) return;
  const h = r.hits.find(x => re.test(x.label)) || r.hits[0];
  await p.mouse.click(h.x, h.y); last = i;
};
let take;
if (TAKE === 'story') {
  await click(/^PLAY$/); await p.waitForTimeout(2500);
  take = await captureTake(p, { seconds: Number(process.env.GS || 170), out: S + '/v2-story.mp4', w: 1080, h: 1920, label: 'story',
    tick: async (i) => { if (i === 60) await p.evaluate(INSTALL_AUDIO_LOG).catch(() => {}); return gateTick(70, /LISTEN|CREWS|STREETS|VIEW|NEXT|>>|CONTINUE|ENTER|RUN|START|AGAIN/i)(i); } });
} else if (TAKE === 'deaths') {
  await click(/^PLAY$/); await p.waitForTimeout(2500);
  await clearGates(p, { max: 30 });
  await p.evaluate(INSTALL_AUDIO_LOG).catch(() => {});
  take = await captureTake(p, { seconds: Number(process.env.GS || 120), out: S + '/v2-deaths.mp4', w: 1080, h: 1920, label: 'deaths',
    tick: gateTick(40, /RETRY|AGAIN|TRY|LISTEN|NEXT|>>|CONTINUE|VIEW|RUN|START|SWAP/i) });
} else {
  var pending = null; var queue = [/^DASH$/, /^DECOY$/, /READY/];
  take = await captureTake(p, { seconds: Number(process.env.GS || 130), out: S + '/v2-rivals.mp4', w: 1080, h: 1920, label: 'rivals',
    tick: async (i) => {
      // A fresh profile has not claimed a block, so the menu button is locked; enter
      // Rivals the way the button does once it opens.
      if (i === 20) { await p.evaluate(() => window.__plugRunGame.scene.getScene('MENU').scene.start('RUNNER', { mode: 'pve', role: 'runner', runKind: 'rivals' })); last = i; return; }
      if (!pending && (i - last < 30 || i < 30)) return;
      const st = await state();
      if (st.stage === 'block') { await click(/LOOK|FIND|RACE|SEARCH|START|BLOCK/i); last = i; }
      else if (st.stage === 'selecting') {
        // Under the fixed-step clock a press needs a game frame between down
        // and up, so each tap is split across two ticks.
        if (pending) { await p.mouse.up(); pending = null; last = i; return; }
        const have = await p.evaluate(() => window.__plugRunGame.scene.getScene('RUNNER')?.rivals?.race?.lobby?.powers || []);
        const want = have.length >= 2 ? /READY/ : !have.includes('dash') ? /^DASH$/ : /^DECOY$/;
        const r = await probe(); const h = (r.hits || []).find(x => want.test(x.label));
        if (!h) return;
        await p.mouse.move(h.x, h.y); await p.mouse.down(); pending = h;
      }
      if (i % 30 === 0) await p.evaluate(INSTALL_AUDIO_LOG).catch(() => {});
    } });
}
writeFileSync(S + '/v2-' + TAKE + '.json', JSON.stringify({ take: TAKE, query: QUERY, ...take }));
console.log('queue left', typeof queue === 'undefined' ? '-' : queue.length); console.log(TAKE, 'done', take.frames, 'frames', take.wallSec + 's', 'audio', take.audio.length, 'end', JSON.stringify(await state()));
await b.close();
