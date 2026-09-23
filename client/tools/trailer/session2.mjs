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
// CALM: the same bot, deciding less often and committing to dodges longer, so
// it moves like a person rather than dithering. Bot settings only.
const CALM = 'bot=1&replanMs=260&wrongTurnChance=0.02&hesitateChance=0.01&dodgeCommitMs=450&dodgeRestMs=900';
const QUERY = { story: CALM, deaths: 'bot=1&dangerCells=2&laneToleranceCells=0.25&wrongTurnChance=0.18', rivals: CALM, watch: CALM, result: CALM + '&modalDelayMs=4000' }[TAKE];
const NAME = process.env.NAME || TAKE;
const CREW = process.env.CREW ? new RegExp(process.env.CREW, 'i') : null;
const COURSE_SHIFT = Number(process.env.COURSE_SHIFT || 0);
const b = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--mute-audio', '--hide-scrollbars'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
// POOL: meet a challenge bank (dev-server rivalPool switch, same as ?rivalPool=).
const POOL = process.env.POOL ? '&rivalPool=' + process.env.POOL : '';
await p.goto('http://127.0.0.1:4178/?' + QUERY + POOL, { waitUntil: 'load', timeout: 90000 });
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

let last = -999, hold = 0, crewPicked = false;
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
  take = await captureTake(p, { seconds: Number(process.env.GS || 170), out: S + '/v3-' + NAME + '.mp4', w: 1080, h: 1920, label: 'story',
    tick: async (i) => { if (i % 30 === 0) await p.evaluate(INSTALL_AUDIO_LOG).catch(() => {});
      if (CREW && !crewPicked && i - last >= 70) {
        // The crew cards' buttons are labelled by their tagline; tap the card where its name is.
        const c = await p.evaluate((src) => { const re = new RegExp(src, 'i'); const g = window.__plugRunGame;
          for (const sc of g.scene.scenes.filter(s => s.scene.isActive())) { const walk = (o) => { if (!o) return null;
            if (typeof o.text === 'string' && re.test(o.text.trim()) && o.text.trim().length < 14 && o.visible !== false) { const m = o.getWorldTransformMatrix(); return { x: m.tx, y: m.ty }; }
            for (const k of (o.list || [])) { const r = walk(k); if (r) return r; } return null; };
            for (const ch of sc.children.list) { const r = walk(ch); if (r) return r; } } return null; }, process.env.CREW);
        if (c) { await p.mouse.click(c.x, c.y); last = i; crewPicked = true; console.log('crew tapped', JSON.stringify(c), 'frame', i); return; } }
      return gateTick(70, /LISTEN|CREWS|STREETS|VIEW|NEXT|>>|CONTINUE|ENTER|RUN|START|AGAIN/i)(i); } });
} else if (TAKE === 'deaths') {
  await click(/^PLAY$/); await p.waitForTimeout(2500);
  await clearGates(p, { max: 30 });
  await p.evaluate(INSTALL_AUDIO_LOG).catch(() => {});
  take = await captureTake(p, { seconds: Number(process.env.GS || 120), out: S + '/v2-deaths.mp4', w: 1080, h: 1920, label: 'deaths',
    tick: gateTick(40, /RETRY|AGAIN|TRY|LISTEN|NEXT|>>|CONTINUE|VIEW|RUN|START|SWAP/i) });
} else if (TAKE === 'watch' || TAKE === 'result') {
  // Race in real time, off camera; film the result and Jev's WATCH RIVAL replay.
  await p.evaluate(() => window.__plugRunGame.scene.getScene('MENU').scene.start('RUNNER', { mode: 'pve', role: 'runner', runKind: 'rivals' }));
  let shifts = 0, polls = 0;
  for (;;) {
    await p.waitForTimeout(TAKE === 'result' ? 250 : 1200);
    const st = await state();
    if (st.result) break;
    if (st.stage === 'block') await click(/LOOK|FIND|RACE|SEARCH|START|BLOCK/i);
    if (st.stage === 'selecting') {
      if (shifts < COURSE_SHIFT) { await click(/^›$/); shifts++; continue; }
      // The result take films the scoreboard; a scratch profile has no player
      // identity, so untick SHARE MY RUN (a player's choice) rather than show a failed share.
      if (TAKE === 'result' && await p.evaluate(() => window.__plugRunGame.scene.getScene('RUNNER')?.rivals?.race?.lobby?.share === true)) { await click(/SHARE MY RUN|✓/); continue; }
      const have = await p.evaluate(() => window.__plugRunGame.scene.getScene('RUNNER')?.rivals?.race?.lobby?.powers || []);
      await click(have.length >= 2 ? /READY/ : !have.includes('dash') ? /^DASH$/ : /^DECOY$/);
    }
    if (++polls % 25 === 0) console.log('racing', JSON.stringify(st));
    // A bot wedged on one house can race forever. After ~3 minutes, do what a
    // player would: settings gear, QUIT RACE. Once the rival has finished that
    // is scored as a loss and the normal result, with WATCH RIVAL, appears.
    if (st.status === 'racing' && polls >= (TAKE === 'result' ? 720 : 150) && polls % 10 === 0) {
      const r = await probe();
      const q = (r.hits || []).find(x => /QUIT RACE/.test(x.label));
      if (q) { await p.mouse.click(q.x, q.y); console.log('quit race'); continue; }
      const gear = (r.hits || []).find(x => x.x < 70 && x.y < 70);
      if (gear) { await p.mouse.click(gear.x, gear.y); await p.waitForTimeout(600); const r2 = await probe(); const q2 = (r2.hits || []).find(x => /QUIT RACE/.test(x.label)); if (q2) { await p.mouse.click(q2.x, q2.y); console.log('quit race via gear'); } }
    }
    if (polls > (TAKE === 'result' ? 2400 : 600)) throw new Error('race never finished');
  }
  console.log('race over', JSON.stringify(await state()));
  if (TAKE !== 'result') await p.waitForTimeout(1500);
  let pressed = TAKE === 'result' ? true : null;
  take = await captureTake(p, { seconds: Number(process.env.GS || 110), out: S + '/v3-' + NAME + '.mp4', w: 1080, h: 1920, label: 'watch',
    tick: async (i) => {
      if (i % 30 === 0) await p.evaluate(INSTALL_AUDIO_LOG).catch(() => {});
      // Hold the scoreboard ~2.5s, then a real tap on WATCH RIVAL (down and
      // up on separate frames, as the fixed-step clock needs).
      if (i === 75 && !pressed) { const r = await probe(); const h = (r.hits || []).find(x => /WATCH RIVAL/.test(x.label)); if (h) { await p.mouse.move(h.x, h.y); await p.mouse.down(); pressed = h; } }
      else if (pressed && pressed !== true) { await p.mouse.up(); pressed = true; console.log('watch pressed at frame', i); }
    } });
} else {
  var pending = null, shifted = 0; var queue = [/^DASH$/, /^DECOY$/, /READY/];
  take = await captureTake(p, { seconds: Number(process.env.GS || 130), out: S + '/v3-' + NAME + '.mp4', w: 1080, h: 1920, label: 'rivals',
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
        if (shifted < COURSE_SHIFT) { const r = await probe(); const n = (r.hits || []).find(x => x.label === '›'); if (n) { await p.mouse.move(n.x, n.y); await p.mouse.down(); pending = n; shifted++; } return; }
        const want = have.length >= 2 ? /READY/ : !have.includes('dash') ? /^DASH$/ : /^DECOY$/;
        const r = await probe(); const h = (r.hits || []).find(x => want.test(x.label));
        if (!h) return;
        await p.mouse.move(h.x, h.y); await p.mouse.down(); pending = h;
      }
      if (i % 30 === 0) await p.evaluate(INSTALL_AUDIO_LOG).catch(() => {});
    } });
}
writeFileSync(S + '/v3-' + NAME + '.json', JSON.stringify({ take: TAKE, query: QUERY, ...take }));
console.log('queue left', typeof queue === 'undefined' ? '-' : queue.length); console.log(TAKE, 'done', take.frames, 'frames', take.wallSec + 's', 'audio', take.audio.length, 'end', JSON.stringify(await state()));
await b.close();
