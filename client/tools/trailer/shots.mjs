import { readFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { findMoments } from './analyze.mjs';
const OUT = process.env.TRAILER_OUT || new URL('./.out/', import.meta.url).pathname;
const S=OUT.replace(/\/$/,'');
const REPO='/home/user/plug-run', FF=S+'/bin/ffmpeg', FPS=30;
mkdirSync(REPO+'/promo/screenshots',{recursive:true});
const grab=(src,frame,out)=>{execFileSync(FF,['-y','-loglevel','error','-ss',(frame/FPS).toFixed(4),
  '-i',src,'-frames:v','1',out]);return {out:out.split('/').pop(),src:src.split('/').pop(),frame};};

const takes=JSON.parse(readFileSync(S+'/takes.json','utf8'));
const rows=takes.play.rows;
const M=findMoments(rows);
const PLAY=S+'/take-play.mp4', WIN=S+'/take-window.mp4';
const tight=[...M.closeCalls].sort((a,b)=>a.dist-b.dist);

// 02 wants runner + real stash + Plug + car all on screen at once. Pick the
// frame where that is actually true, rather than hoping.
// Mid-house, not at the door: the Plug in frame at a readable distance, the
// car still some way off, and the stash not yet picked up.
const wide=rows.map((r,i)=>({...r,i})).filter(r=>r.live&&!r.paused&&!r.stash
  &&r.plug!=null&&r.plug>=3&&r.plug<=7
  &&r.ex!=null&&r.ex>=5&&r.ex<=11)
  .sort((a,b)=>Math.abs(a.plug-5)-Math.abs(b.plug-5))[0];

const shots=[
  grab(WIN,262,REPO+'/promo/screenshots/01-choose-your-crew.png'),
  grab(PLAY,wide?wide.i:(M.pickups[0]||{frame:600}).frame,REPO+'/promo/screenshots/02-stash-and-plug.png'),
  grab(PLAY,tight[0].frame,REPO+'/promo/screenshots/03-narrow-exit.png'),
  grab(WIN,96,REPO+'/promo/screenshots/04-character-moment.png'),
];
console.log(JSON.stringify({shots,
  nearMissCells:tight[0].dist, nearMissFrame:tight[0].frame,
  wideFrame:wide?{frame:wide.i,plugCells:wide.plug,carCells:wide.ex}:null},null,1));
