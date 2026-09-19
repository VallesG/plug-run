import { chromium } from 'playwright-core';
import { boot, PROBE, S } from './lib.mjs';
// Block Rivals is gated behind 3 completed blocks, so the normal menu route is
// locked on a fresh profile. rivalsPlay=1 is the harness's PLAYER-FACING path:
// real opponent lookup from the shipped bank, real Rivals UI. The opponent is
// a recorded bank rival, never a human -- said plainly in the manifest.
const OUT = process.env.TRAILER_OUT || new URL('./.out/', import.meta.url).pathname.replace(/\/$/,'');
const REPO = process.env.REPO || new URL('../../../', import.meta.url).pathname.replace(/\/$/,'');
const {b,p}=await boot(chromium,{w:540,h:960,dsf:2,skipTutorial:true,
  url:'http://127.0.0.1:4178/?bot=1&rivalsPlay=1&courseSlot=1&runs=1'});
await p.waitForTimeout(9000);
for(let i=0;i<10;i++){
  const st=await p.evaluate(()=>({live:!!window.__plugRunLiveScene,
    kind:window.__plugRunLiveScene&&window.__plugRunLiveScene.runKind}));
  if(st.live&&st.kind==='rivals'){console.log('in rivals at attempt',i);break;}
  const r=await p.evaluate(PROBE);
  if(r.hits&&r.hits.length){const h=r.hits.find(x=>/START|RACE|GO|READY|>>/i.test(x.label))||r.hits[0];
    await p.mouse.click(h.x,h.y);}
  await p.waitForTimeout(2500);
}
await p.waitForTimeout(6000);
await p.screenshot({path:S+'/shot-05-raw.png'});
console.log('state',JSON.stringify(await p.evaluate(()=>{const s=window.__plugRunLiveScene;
  return s?{kind:s.runKind,role:s.role,hp:s.attacker&&s.attacker.hp}:{live:false};})));
await b.close();
