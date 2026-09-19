import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { findMoments, clipAround, flipRate, FPS } from './analyze.mjs';
import { cut, concat, toLandscape, mux, probe } from './assemble.mjs';
import { mixSfx } from './mixsfx.mjs';
const OUT = process.env.TRAILER_OUT || new URL('./.out/', import.meta.url).pathname;
const S=OUT.replace(/\/$/,'');
const REPO='/home/user/plug-run';
mkdirSync(S+'/clips',{recursive:true}); mkdirSync(S+'/out',{recursive:true});

const takes=JSON.parse(readFileSync(S+'/takes.json','utf8'));
const rows=takes.play.rows, audioLog=takes.play.audio;
const M=findMoments(rows);
writeFileSync(S+'/moments.json',JSON.stringify(M,null,1));
console.log('MOMENTS', JSON.stringify(Object.fromEntries(
  Object.entries(M).map(([k,v])=>[k,v.length]))));

const byTight=[...M.closeCalls].sort((a,b)=>a.dist-b.dist);
const pick=(arr,i=0)=>arr.length?arr[Math.min(i,arr.length-1)]:null;
if(!byTight.length) throw new Error('no genuine close call captured - refusing to fake one');

// Beat list. Every entry points at a frame the bot actually produced; nothing
// is staged. `src` is the uncut take the frames come from.
const PLAY=S+'/take-play.mp4', WIN=S+'/take-window.mp4';
function beat(name,src,frame,before,after,note){
  // A beat with no real frame behind it is dropped, never substituted. Using
  // a close-call frame as the "escape" shot would be exactly the kind of
  // misleading cut the brief forbids.
  if(frame==null||!Number.isFinite(frame)) return {name,missing:true,note};
  const total=src===PLAY?rows.length:takes.window.rows;
  const start=Math.max(0,frame-Math.round(before*FPS));
  const end=Math.min(total-1,frame+Math.round(after*FPS));
  return {name,src,frame,start,end,seconds:+((end-start)/FPS).toFixed(2),note};
}
const at=(arr,i=0)=>{const m=pick(arr,i);return m?m.frame:null;};
// Spread beats across the whole take. Taking arr[0] every time pulled five of
// seven shots out of the same opening ten seconds, so the cut repeated itself.
const near=(arr,frac)=>{if(!arr.length)return null;
  const target=frac*rows.length;
  return [...arr].sort((a,b)=>Math.abs(a.frame-target)-Math.abs(b.frame-target))[0].frame;};
const plan={
  vertical:[
    beat('cold-open-close-call',PLAY,byTight[0].frame,1.7,1.6,`bullet ${byTight[0].dist} cells, no hit`),
    beat('crew-choice',WIN,262,2.4,1.1,'The Window: crew card'),
    beat('stash',PLAY,at(M.pickups),1.6,1.6,'real stash pickup'),
    beat('power',PLAY,at(M.powers),1.6,2.0,'power activation'),
    beat('escape',PLAY,at(M.extractions),3.2,1.2,'carry into the car'),
  ],
  landscape:[
    beat('cold-open-close-call',PLAY,byTight[0].frame,2.0,2.0,`bullet ${byTight[0].dist} cells, no hit`),
    beat('auntie-ro',WIN,96,2.6,1.2,'The Window: Auntie Ro'),
    beat('crew-choice',WIN,262,2.6,1.4,'The Window: crew card'),
    beat('stash',PLAY,near(M.pickups,0.12),2.2,2.2,'real stash pickup'),
    beat('plug-pressure',PLAY,at(M.plugPressure),2.4,2.6,'Plug closing'),
    beat('power',PLAY,near(M.powers,0.40),2.2,2.6,'power activation'),
    beat('close-call-2',PLAY,(byTight[1]||{}).frame??null,2.0,2.0,'second near miss'),
    beat('power-2',PLAY,near(M.powers,0.66),2.0,2.4,'second power'),
    beat('escape',PLAY,at(M.extractions),3.6,1.6,'carry into the car'),
    beat('clear',PLAY,at(M.clears),1.0,3.2,'house clear'),
  ]
};
const omitted={vertical:plan.vertical.filter(b=>b.missing).map(b=>b.name),
               landscape:plan.landscape.filter(b=>b.missing).map(b=>b.name)};
plan.vertical=plan.vertical.filter(b=>!b.missing);
plan.landscape=plan.landscape.filter(b=>!b.missing);
console.log('OMITTED (no real frame captured):',JSON.stringify(omitted));

function renderCut(kind){
  const beats=plan[kind];
  const clips=[],timeline=[];
  let tMs=0;
  for(const [i,bt] of beats.entries()){
    const f=`${S}/clips/${kind}-${String(i).padStart(2,'0')}-${bt.name}.mp4`;
    cut(bt.src,bt.start,bt.end,f);
    clips.push(f);
    timeline.push({...bt,atMs:tMs});
    tMs+=(bt.end-bt.start)/FPS*1000;
  }
  const body=concat(clips,`${S}/out/${kind}-body.mp4`);
  // SFX bed: only cues the game actually fired inside the chosen windows,
  // rebased onto the cut timeline.
  const events=[];
  for(const t of timeline){
    if(t.src!==PLAY) continue;                       // window take has no audio log
    const a=t.start/FPS*1000, b=t.end/FPS*1000;
    for(const e of audioLog) if(e.t>=a&&e.t<b) events.push({key:e.key,vol:e.vol,t:t.atMs+(e.t-a)});
  }
  return {body,timeline,events,bodyMs:tMs};
}

const takeFlip=flipRate(rows,0,rows.length);
for(const kind of ['vertical','landscape'])
  for(const bt of plan[kind]){
    if(!String(bt.src||'').endsWith('take-play.mp4')) continue;
    bt.flipRate=flipRate(rows,bt.start,bt.end);
    if(bt.flipRate>takeFlip*3)
      console.log(`WARNING ${kind}/${bt.name}: ${bt.flipRate} reversals/s vs take baseline ${takeFlip} - reads as twitching, not play`);
  }
console.log('take baseline reversals/s',takeFlip);

const V=renderCut('vertical');
const L=renderCut('landscape');
const endV=S+'/cards/end-vertical.mp4', endL=S+'/cards/end-landscape.mp4';

// Vertical: portrait body + portrait end card.
const vFull=concat([V.body,endV],S+'/out/vertical-noaudio.mp4');
// Landscape: convert the portrait body once, then the landscape card.
const lBody=toLandscape(L.body,REPO+'/promo/plug-run-cover-1200x630.png',S+'/out/landscape-wide.mp4');
const lFull=concat([lBody,endL],S+'/out/landscape-noaudio.mp4');

const dur=f=>Number(execFileSync(S+'/bin/ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',f]).toString().trim());
const vSec=dur(vFull), lSec=dur(lFull);
const vWav=S+'/out/vertical.wav', lWav=S+'/out/landscape.wav';
const vMix=mixSfx(V.events,vSec*1000,vWav);
const lMix=mixSfx(L.events,lSec*1000,lWav);
mkdirSync(REPO+'/promo/trailers',{recursive:true});
const vOut=REPO+'/promo/trailers/plug-run-vertical.mp4';
const lOut=REPO+'/promo/trailers/plug-run-landscape.mp4';
mux(vFull,vWav,vOut,{fadeOutFrom:Math.max(0,vSec-1.2)});
mux(lFull,lWav,lOut,{fadeOutFrom:Math.max(0,lSec-1.2)});

const report={commit:takes.commit,
  vertical:{seconds:+vSec.toFixed(2),bytes:statSync(vOut).size,probe:probe(vOut),mix:vMix,timeline:V.timeline},
  landscape:{seconds:+lSec.toFixed(2),bytes:statSync(lOut).size,probe:probe(lOut),mix:lMix,timeline:L.timeline},
  omitted, takeFlipRate:takeFlip,
  moments:Object.fromEntries(Object.entries(M).map(([k,v])=>[k,v.length])),
  tightestBullets:byTight.slice(0,5)};
writeFileSync(S+'/build-report.json',JSON.stringify(report,null,1));
console.log('VERTICAL',vSec.toFixed(2),'s',(statSync(vOut).size/1e6).toFixed(1),'MB');
console.log('LANDSCAPE',lSec.toFixed(2),'s',(statSync(lOut).size/1e6).toFixed(1),'MB');
console.log('sfx vertical',JSON.stringify(vMix));
console.log('sfx landscape',JSON.stringify(lMix));
