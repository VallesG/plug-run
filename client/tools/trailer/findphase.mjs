import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const OUT = process.env.TRAILER_OUT || new URL('./.out/', import.meta.url).pathname.replace(/\/$/,'');
const REPO = process.env.REPO || new URL('../../../', import.meta.url).pathname.replace(/\/$/,'');
const S=OUT;
const FF=S+'/bin/ffmpeg', W=1080, H=1920;
const tk=JSON.parse(readFileSync(S+'/takes.json','utf8'));
const rows=tk.play.rows, audio=tk.play.audio;

function frameRGB(n){
  execFileSync(FF,['-y','-loglevel','error','-i',S+'/take-play.mp4',
    '-vf',`select=eq(n\\,${n})`,'-vframes','1','-f','rawvideo','-pix_fmt','rgb24',S+'/probe.raw']);
  return readFileSync(S+'/probe.raw');
}
const at=(buf,x,y)=>{const i=((Math.min(H-1,Math.max(0,y|0))*W)+Math.min(W-1,Math.max(0,x|0)))*3;
  return buf[i]+buf[i+1]+buf[i+2];};

// Walls render far brighter than the dark checkerboard floor. Calibrate on the
// frame itself rather than hard-coding a colour: floor dominates the interior.
const cues=audio.filter(a=>a.key==='phase').map(a=>Math.round(a.t/1000*30));
const out=[];
for(const f0 of cues){
  const pre=Math.max(0,f0-8);
  let buf; try{ buf=frameRGB(pre); }catch{ continue; }
  const seg=[];
  for(let f=f0-4;f<f0+46;f+=2){ const r=rows[f]; if(r&&r.live) seg.push(r); }
  if(seg.length<8) continue;
  let wall=0, total=0;
  for(const r of seg){ const v=at(buf,r.x*2,r.y*2); total++; if(v>260) wall++; }
  const net=Math.hypot(seg.at(-1).x-seg[0].x, seg.at(-1).y-seg[0].y);
  out.push({frame:f0,wallPx:wall,samples:total,wallFrac:+(wall/total).toFixed(2),
    net:Math.round(net),hp0:seg[0].hp,hp1:seg.at(-1).hp});
}
out.sort((a,b)=>b.wallFrac-a.wallFrac);
for(const o of out) console.log(`frame ${String(o.frame).padStart(5)}  wall ${o.wallPx}/${o.samples} (${o.wallFrac})  net ${o.net}px  hp ${o.hp0}->${o.hp1}`);
