import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { boot, PROBE, S } from './lib.mjs';
import { clearGates } from './drive.mjs';
import { INSTALL_SAMPLER } from './sampler.mjs';
import { INSTALL_AUDIO_LOG } from './fixedstep.mjs';
import { captureTake } from './capture.mjs';

const GAMEPLAY_SECONDS = Number(process.env.GS || 160);
const {b,p}=await boot(chromium,{w:540,h:960,dsf:2});
const commit=process.env.COMMIT||'unknown';
console.log('build commit',commit);

// --- Front door, captured: Auntie Ro + crew selection (the character beat) ---
await p.mouse.click(270,384); await p.waitForTimeout(3000);
await p.evaluate(INSTALL_SAMPLER);
let lastClick=-999;
const windowTake=await captureTake(p,{seconds:26,out:S+'/take-window.mp4',w:1080,h:1920,label:'window',
  tick:async(i)=>{
    // Let each page of dialogue sit on screen long enough to read, then advance.
    if(i-lastClick<75) return;
    const st=await p.evaluate(()=>({live:!!window.__plugRunLiveScene,
      paused:!!(window.__plugRunLiveScene&&(window.__plugRunLiveScene.roundPausedForMenu||window.__plugRunLiveScene.pausedForModal))}));
    if(st.live&&!st.paused) return;
    const r=await p.evaluate(PROBE);
    if(!r.hits||!r.hits.length) return;
    const h=r.hits.find(x=>/LISTEN|CREWS|STREETS|VIEW|NEXT|>>/i.test(x.label))||r.hits[0];
    await p.mouse.click(h.x,h.y); lastClick=i;
  }});
console.log('window take done',windowTake.frames,'frames in',windowTake.wallSec+'s');

// --- Into the houses ---
await clearGates(p,{max:24});
console.log('audio wrap:',await p.evaluate(INSTALL_AUDIO_LOG));
lastClick=-999;
const playTake=await captureTake(p,{seconds:GAMEPLAY_SECONDS,out:S+'/take-play.mp4',w:1080,h:1920,label:'play',
  tick:async(i)=>{
    // Hold on a gate for ~1.5s so dialogue and the clear screen land on
    // camera, then advance so the next house starts.
    if(i-lastClick<45) return;
    const st=await p.evaluate(()=>{const s=window.__plugRunLiveScene;
      return {paused:!!(s&&(s.roundPausedForMenu||s.pausedForModal)),live:!!s};});
    if(st.live&&!st.paused) return;
    const r=await p.evaluate(PROBE);
    if(!r.hits||!r.hits.length) return;
    const h=r.hits.find(x=>/LISTEN|NEXT|>>|CONTINUE|VIEW|RUN|START|AGAIN/i.test(x.label))||r.hits[0];
    await p.mouse.click(h.x,h.y); lastClick=i;
  }});
console.log('play take done',playTake.frames,'frames in',playTake.wallSec+'s');
writeFileSync(S+'/takes.json',JSON.stringify({commit,
  window:{...windowTake,rows:windowTake.rows.length},
  play:playTake},null,0));
const live=playTake.rows.filter(r=>r.live);
console.log('live frames',live.length,'/',playTake.rows.length);
console.log('minBullet',Math.min(...live.filter(r=>r.bullet!=null).map(r=>r.bullet)));
console.log('minPlug',Math.min(...live.filter(r=>r.plug!=null).map(r=>r.plug)));
console.log('seeds',[...new Set(live.map(r=>r.seed))].length);
console.log('audio cues',playTake.audio.length);
await b.close();
