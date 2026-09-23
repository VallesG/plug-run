import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { findMoments, clipAround, flipRate, FPS } from './analyze.mjs';
import { cut, concat, toLandscape, mux, probe, mixMusicBed } from './assemble.mjs';
import { mixSfx } from './mixsfx.mjs';
import { verifyExport } from './verify.mjs';
const OUT = process.env.TRAILER_OUT || new URL('./.out/', import.meta.url).pathname.replace(/\/$/,'');
const REPO = process.env.REPO || new URL('../../../', import.meta.url).pathname.replace(/\/$/,'');
const S=OUT;

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
// One entry per SCREEN in the window take, measured off it. The UI hard-cuts
// between screens, so a clip spanning two of them reads as a bad edit, and the
// city map holds a "FINDING YOUR BLOCK" state with a black placeholder panel
// (roughly frames 420-479) that looks outright broken. That shipped once.
// Deliberately omitted, so no clip can land in it: the map loading window.
const CLEAN_WIN=[
  [40,149],   // Auntie Ro
  [150,224],  // crew list - all three crews
  [225,419],  // "YOU RUN WITH CROSSLINE" card
  [480,522],  // Switch
  [528,604],  // Mags
  [605,660],  // Mercer Row block screen
];
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
    // Dialogue and gameplay alternate: four talking beats in a row up front
    // read as a visual novel, and the brief wants the 2D game carrying it.
    beat('cold-open-close-call',PLAY,byTight[0].frame,1.7,1.6,`bullet ${byTight[0].dist} cells, no hit`),
    beat('auntie-ro',WIN,96,1.2,0.6,'The Window: Auntie Ro'),
    beat('crew-choice',WIN,262,1.2,0.6,'The Window: crew card'),
    beat('stash',PLAY,near(M.pickups,0.18),1.6,1.6,'real stash pickup'),
    beat('switch-brief',WIN,500,0.63,0.63,'Switch states the objective'),
    beat('close-call-2',PLAY,(byTight[1]||{}).frame??null,1.4,1.2,'second near miss'),
    beat('mags',WIN,562,0.9,0.9,'Mags on the radio'),
    beat('power',PLAY,near(M.powers,0.60),1.6,2.0,'power activation'),
    beat('escape',PLAY,near(M.extractions,0.80),3.0,1.2,'carry into the car'),
    beat('clear',PLAY,near(M.clears,0.92),1.0,1.4,'house clear'),
  ],
  landscape:[
    beat('cold-open-close-call',PLAY,byTight[0].frame,2.0,2.0,`bullet ${byTight[0].dist} cells, no hit`),
    beat('auntie-ro',WIN,96,1.7,0.8,'The Window: Auntie Ro'),
    beat('crew-choice',WIN,262,1.1,0.8,'The Window: crew card'),
    beat('switch-brief',WIN,500,0.63,0.67,'Switch states the objective'),
    beat('block-screen',WIN,627,0.7,0.8,'Mercer Row, 0/15 cleared'),
    beat('stash',PLAY,near(M.pickups,0.12),2.2,2.2,'real stash pickup'),
    beat('plug-pressure',PLAY,near(M.plugPressure,0.30),1.8,1.7,'Plug closing'),
    beat('power',PLAY,near(M.powers,0.40),2.2,2.6,'power activation'),
    beat('close-call-2',PLAY,(byTight[1]||{}).frame??null,1.7,1.6,'second near miss'),
    beat('power-2',PLAY,near(M.powers,0.66),2.0,2.4,'second power'),
    beat('close-call-3',PLAY,(byTight[2]||{}).frame??null,1.7,1.6,'third near miss'),
    beat('stash-2',PLAY,near(M.pickups,0.72),1.3,1.3,'second stash run'),
    beat('escape',PLAY,near(M.extractions,0.86),3.8,1.8,'carry into the car'),
    beat('clear',PLAY,near(M.clears,0.92),1.0,2.6,'house clear'),
  ]
};
// A window-take clip that strays outside a clean range opens on a cross-fade
// or on the map's black loading panel. That shipped once; it fails loudly now.
for(const kind of ['vertical','landscape'])
  for(const bt of plan[kind]){
    if(bt.missing||bt.src!==WIN) continue;
    if(!CLEAN_WIN.some(([a,b])=>bt.start>=a&&bt.end<=b))
      throw new Error(`${kind}/${bt.name}: frames ${bt.start}-${bt.end} cross a transition or the map loading state`);
  }
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
const MUSIC=process.env.MUSIC||REPO+'/client/public/audio/plug_beat2.mp3';
const vBed=MUSIC?mixMusicBed(vWav,MUSIC,S+'/out/vertical-mixed.wav',{seconds:vSec}):vWav;
mux(vFull,vBed,vOut,{fadeOutFrom:Math.max(0,vSec-1.2)});
mux(lFull,lWav,lOut,{fadeOutFrom:Math.max(0,lSec-1.2)});

const vv=verifyExport(vOut), lv=verifyExport(lOut);
const report={commit:takes.commit,
  vertical:{seconds:+vSec.toFixed(2),bytes:statSync(vOut).size,probe:probe(vOut),mix:vMix,timeline:V.timeline,
    loudness:`${vv.integratedLUFS} LUFS integrated, ${vv.truePeakDB} dBFS peak`},
  landscape:{seconds:+lSec.toFixed(2),bytes:statSync(lOut).size,probe:probe(lOut),mix:lMix,timeline:L.timeline,
    loudness:`${lv.integratedLUFS} LUFS integrated, ${lv.truePeakDB} dBFS peak`},
  omitted, takeFlipRate:takeFlip, music:MUSIC||null,
  moments:Object.fromEntries(Object.entries(M).map(([k,v])=>[k,v.length])),
  tightestBullets:byTight.slice(0,5)};
writeFileSync(S+'/build-report.json',JSON.stringify(report,null,1));
console.log('VERTICAL',vSec.toFixed(2),'s',(statSync(vOut).size/1e6).toFixed(1),'MB');
console.log('LANDSCAPE',lSec.toFixed(2),'s',(statSync(lOut).size/1e6).toFixed(1),'MB');
console.log('sfx vertical',JSON.stringify(vMix));
console.log('sfx landscape',JSON.stringify(lMix));
