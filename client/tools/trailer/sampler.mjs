// In-page sampler: exactly one row per animation frame. Under the fixed-step
// capture clock that means one row per captured VIDEO frame, so a moment
// found in telemetry maps straight to a frame index.
//
// Observation only -- it reads scene state and never writes to it.
export const INSTALL_SAMPLER=`(()=>{
 if(window.__capSampler)return 'already';
 const rows=window.__capRows=[];
 const tick=()=>{
  const s=window.__plugRunLiveScene;
  let row={t:performance.now()};
  if(s&&s.attacker&&s.scene&&s.scene.isActive()){
   const cell=s.cell||24,r=s.attacker;
   const grp=(s.bulletsD&&s.bulletsD.getChildren)?s.bulletsD.getChildren().filter(b=>b&&b.active):[];
   let bmin=Infinity; for(const b of grp){const d=Math.hypot(b.x-r.x,b.y-r.y)/cell; if(d<bmin)bmin=d;}
   let dmin=Infinity;
   for(const d of [s.defender,s.defender2]) if(d&&d.active!==false&&d.visible!==false){
     const q=Math.hypot(d.x-r.x,d.y-r.y)/cell; if(q<dmin)dmin=q;}
   row={...row,live:1,x:Math.round(r.x),y:Math.round(r.y),hp:r.hp,
    bullet:bmin<Infinity?+bmin.toFixed(2):null,
    plug:dmin<Infinity?+dmin.toFixed(2):null,
    nb:grp.length, stash:s.hasStash?1:0,
    ex:s.extract?+(Math.hypot(s.extract.x-r.x,s.extract.y-r.y)/cell).toFixed(2):null,
    paused:(s.roundPausedForMenu||s.pausedForModal)?1:0,
    over:s.roundOver?1:0, seed:s.seed, block:s.blockIndex,
    used:(s.runnerPowersConsumed||[]).map(v=>v?1:0).join('')};
   // WATCH RIVAL: the rival's recorded race drawn full screen. Where Jev, his
   // Plug, his bullets and his decoy are, so close-ups and near misses can be
   // found the same way as ours. Read-only.
   const gh=s.children?s.children.list.filter(o=>o._isReplayGhost&&o.visible):[];
   if(gh.length){
    const tex=o=>{if(o.texture&&o.texture.key&&o.texture.key!=='__DEFAULT')return o.texture.key;for(const c of (o.list||[])){const k=tex(c);if(k)return k;}return '';};
    const jr=gh.find(o=>o.type==='Container'&&/runner/.test(tex(o)));
    const jp=gh.find(o=>o.type==='Container'&&/plug/.test(tex(o)));
    const bl=gh.filter(o=>o.type==='Arc'&&o.fillColor===0xffd166);
    const dc=gh.find(o=>o.type==='Image'&&/td_runner/.test(o.texture.key)&&o.alpha<0.6);
    row.watch=1;
    if(jr){row.gx=Math.round(jr.x);row.gy=Math.round(jr.y);row.ga=+jr.alpha.toFixed(2);
     if(bl.length){let m=Infinity;for(const b of bl){const d=Math.hypot(b.x-jr.x,b.y-jr.y);if(d<m)m=d;}row.gb=Math.round(m);row.gbr=+(bl[0].radius||0).toFixed(1);}
     if(jp)row.gp=Math.round(Math.hypot(jp.x-jr.x,jp.y-jr.y));}
    if(dc){row.dx=Math.round(dc.x);row.dy=Math.round(dc.y);}
   }
  } else row.live=0;
  rows.push(row);
  requestAnimationFrame(tick);};
 requestAnimationFrame(tick);
 window.__capSampler=true;return 'ok';})()`;
