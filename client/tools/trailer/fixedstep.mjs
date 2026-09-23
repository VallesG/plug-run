// Fixed-step capture clock.
//
// Software GL renders this game at ~18fps, so capturing in real time would
// produce visibly stuttering 30fps footage. Instead the page's animation
// clock is driven by the harness: every captured frame advances the game by
// exactly 1/30s, however long the render actually takes.
//
// This changes the CLOCK, not the game. The game is delta-driven, so a fixed
// 33.33ms delta is a value it already has to handle; no physics, balance,
// speed or AI constant is touched. It makes capture deterministic and
// reproducible, and it is disclosed in the manifest.
export const INSTALL_CLOCK = `(()=>{
 if(window.__fixedStep)return 'already';
 const q=[]; let vnow=performance.now(); const realNow=performance.now.bind(performance);
 const origRAF=window.requestAnimationFrame.bind(window);
 window.requestAnimationFrame=cb=>{q.push(cb);return q.length;};
 window.cancelAnimationFrame=()=>{};
 performance.now=()=>vnow;
 const OrigDateNow=Date.now; const dateBase=OrigDateNow();
 Date.now=()=>dateBase+(vnow-0);
 window.__fixedStep={
  step(dtMs){ vnow+=dtMs;
   const batch=q.splice(0,q.length);
   for(const cb of batch){ try{cb(vnow);}catch(e){console.error('[CAP] rAF',e&&e.message);} }
   return {pending:q.length,vnow};
  },
  now:()=>vnow, real:realNow, origRAF
 };
 return 'ok';})()`;

// Log every SFX cue the game fires, on the same virtual clock as the frames,
// so the rebuilt audio bed lines up exactly with the captured video.
//
// The AudioManager instance carries its OWN play(), shadowing the prototype,
// so the wrap has to go on the instance. playCompletionSequence is wrapped
// too: it starts the drum roll through sound.add(), which play() never sees.
export const INSTALL_AUDIO_LOG = `(()=>{
 const s=window.__plugRunLiveScene, a=s&&s.audio;
 if(!a)return 'no-audiomanager';
 if(a.__capWrapped)return 'already';
 const log=window.__audioLog=window.__audioLog||[];
 const gain=(o)=>((o&&o.volume!=null?o.volume:1)*(a.masterVolume==null?1:a.masterVolume)
   *(a.muted?0:1)*(a._volSfx==null?1:a._volSfx));
 const origPlay=a.play.bind(a);
 a.play=function(key,opts){
  try{ if(!a.isMuted||!a.isMuted()) log.push({t:performance.now(),key:String(key),vol:+gain(opts).toFixed(4)}); }catch(e){}
  return origPlay(key,opts);
 };
 if(typeof a.playCompletionSequence==='function'){
  const origSeq=a.playCompletionSequence.bind(a);
  a.playCompletionSequence=function(kind){
   try{ if(!a.isMuted||!a.isMuted()) log.push({t:performance.now(),key:'success1',vol:+(0.55*(a.masterVolume==null?1:a.masterVolume)*(a._volSfx==null?1:a._volSfx)).toFixed(4)}); }catch(e){}
   return origSeq(kind);
  };
 }
 a.__capWrapped=true;
 return 'ok';})()`;
