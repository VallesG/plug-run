import { PROBE } from './lib.mjs';
// Clear whatever is gating the round: contact dialogue panels, pickers,
// result modals. Every dismissal is a real click at the button's real
// position -- the same thing a player's thumb does.
export async function clearGates(p,{max=14,settle=900}={}){
  const seen=[];
  for(let i=0;i<max;i++){
    const st=await p.evaluate(()=>{const s=window.__plugRunLiveScene;
      return {paused:!!(s&&(s.roundPausedForMenu||s.pausedForModal)),live:!!s};});
    const r=await p.evaluate(PROBE);
    if(r.err)return seen;
    if(st.live&&!st.paused)return seen;
    if(!r.hits.length){await p.waitForTimeout(settle);continue;}
    const h=r.hits.find(x=>/LISTEN|NEXT|>>|CONTINUE|ENTER|CREWS|START|RUN IT|GO/i.test(x.label))||r.hits[0];
    seen.push(h.label||h.type);
    await p.mouse.click(h.x,h.y);
    await p.waitForTimeout(settle);
  }
  return seen;
}
