const OUT = process.env.TRAILER_OUT || new URL('./.out/', import.meta.url).pathname;
export const EXE=process.env.CHROMIUM||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const S=OUT.replace(/\/$/,'');
// Enumerate interactive objects, labelled by the nearest Text in the same scene.
export const PROBE=`(()=>{const g=window.__plugRunGame;if(!g)return{err:'no game'};
 const scenes=g.scene.scenes.filter(s=>s.scene.isActive());
 const hits=[],texts=[];
 for(const sc of scenes){const cam=sc.cameras&&sc.cameras.main;
  const pos=o=>{const m=o.getWorldTransformMatrix?o.getWorldTransformMatrix():null;
   let x=m?m.tx:o.x,y=m?m.ty:o.y;
   if(cam&&o.scrollFactorX!==0){x=(x-cam.scrollX)*cam.zoom;y=(y-cam.scrollY)*cam.zoom;}
   return {x:Math.round(x),y:Math.round(y)};};
  const walk=(o,d)=>{if(!o||d>7)return;
   if(o.text&&String(o.text).trim())texts.push({...pos(o),t:String(o.text).trim().slice(0,44)});
   if(o.input&&o.input.enabled&&o.visible!==false)hits.push({...pos(o),scene:sc.scene.key,type:o.type,
     w:Math.round(o.displayWidth||0),h:Math.round(o.displayHeight||0)});
   for(const k of (o.list||[]))walk(k,d+1);};
  for(const c of sc.children.list)walk(c,0);}
 for(const h of hits){let best=null,bd=1e9;
  for(const t of texts){const d=Math.hypot(t.x-h.x,t.y-h.y);
   if(d<bd&&d<Math.max(60,(h.w||0)/2+30)){bd=d;best=t.t;}}
  h.label=best||'';}
 return {scenes:scenes.map(s=>s.scene.key),hits,
   live:!!window.__plugRunLiveScene,
   gameplay:window.__plugRunLiveScene?{hp:window.__plugRunLiveScene.attacker?.hp,
     hasStash:!!window.__plugRunLiveScene.hasStash,runKind:window.__plugRunLiveScene.runKind}:null};})()`;
export async function boot(chromium,{w=540,h=960,dsf=1,skipTutorial=true,url='http://127.0.0.1:4178/?bot=1'}={}){
  const b=await chromium.launch({executablePath:EXE,args:['--autoplay-policy=no-user-gesture-required','--use-gl=swiftshader','--enable-unsafe-swiftshader','--mute-audio','--hide-scrollbars']});
  const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:dsf});
  await p.goto(url,{waitUntil:'networkidle',timeout:60000});
  await p.waitForTimeout(3500);
  if(skipTutorial){
    const uid=await p.evaluate(()=>JSON.parse(localStorage.getItem('pr_user')||'{}').id);
    await p.evaluate(u=>localStorage.setItem('pr_tutorial_v1_'+u,JSON.stringify({version:1,complete:true})),uid);
    await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(3500);
  }
  return {b,p};
}
