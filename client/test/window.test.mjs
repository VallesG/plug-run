import { readFileSync } from 'node:fs';
import {
  WINDOW_GANGS, WINDOW_INTRO, WINDOW_ART, createWindowState, chooseWindowGang,
  windowGang, markWindowVisit, grantStoreCredit, spendStoreCredit, windowLayout
} from '../src/logic/window.js';

let passed = 0;
function check(name, ok) { if (!ok) throw new Error(name); passed++; }

check('three gangs', WINDOW_GANGS.length === 3);
check('gang ids unique', new Set(WINDOW_GANGS.map(g => g.id)).size === 3);
check('every gang has two distinct contacts', WINDOW_GANGS.every(g => g.primary && g.jobs && g.primary !== g.jobs));
check('intro is deliberately short', WINDOW_INTRO.length === 3 && WINDOW_INTRO.every(line => line.length < 100));

const castFrames=Object.values(WINDOW_ART.cast.frames);
check('cast atlas has all five contacts', castFrames.length === 5);
check('cast frames stay inside the source', castFrames.every(f => f.x >= 0 && f.x+f.width <= WINDOW_ART.cast.width));
check('cast frames cover the atlas once', castFrames.reduce((sum,f)=>sum+f.width,0) === WINDOW_ART.cast.width);
check('expression sheets divide evenly', WINDOW_ART.ro.frameWidth*WINDOW_ART.ro.frames === 2172 && WINDOW_ART.switch.frameWidth*WINDOW_ART.switch.frames === 2172);
check('portrait crop stays inside bodega', WINDOW_ART.bodega.portrait.x+WINDOW_ART.bodega.portrait.width <= WINDOW_ART.bodega.width);
check('counter foreground completes portrait crop', WINDOW_ART.bodega.foreground.y+WINDOW_ART.bodega.foreground.height === WINDOW_ART.bodega.portrait.height);
check('counter foreground spans portrait width', WINDOW_ART.bodega.foreground.width === WINDOW_ART.bodega.portrait.width);
check('known gang resolves', windowGang('crossline')?.primary === 'Switch');
check('unknown gang rejected', windowGang('not-real') === null);

const fresh = createWindowState();
check('fresh state is unchosen', fresh.gangID === null && !fresh.onboardingComplete);
check('fresh credits zero', fresh.credits === 0 && fresh.ledger.length === 0);
const picked = chooseWindowGang(fresh, 'afterlight', 1234);
check('valid choice applies', picked.applied && picked.state.gangID === 'afterlight');
check('choice completes onboarding', picked.state.onboardingComplete && picked.state.chosenAt === 1234);
check('choice cannot be overwritten', !chooseWindowGang(picked.state, 'iron-row', 9999).applied);
check('bad choice is inert', !chooseWindowGang(fresh, 'fake').applied && fresh.gangID === null);

const visit = markWindowVisit(picked.state, '2026-09-15');
check('new route visit applies', visit.applied && visit.state.lastVisitRouteID === '2026-09-15');
check('same route visit is idempotent', !markWindowVisit(visit.state, '2026-09-15').applied);
check('empty route visit is ignored', !markWindowVisit(visit.state, '').applied);

const grant = grantStoreCredit(visit.state, {
  id: 'daily:2026-09-15', amount: 1, source: 'daily-visit', routeID: '2026-09-15', at: 10
});
check('grant applies', grant.applied && grant.state.credits === 1);
check('grant records source', grant.state.ledger[0].source === 'daily-visit');
const dupe = grantStoreCredit(grant.state, { id: 'daily:2026-09-15', amount: 99 });
check('duplicate grant rejected', !dupe.applied && dupe.state.credits === 1);
check('invalid grant rejected', !grantStoreCredit(grant.state, { id: '', amount: 2 }).applied);
const rich = grantStoreCredit(grant.state, { id: 'block:4', amount: 5, source: 'block-complete' }).state;
check('credits derive from ledger', rich.credits === 6);
const bought = spendStoreCredit(rich, { id: 'buy:blue-jacket', amount: 5, source: 'shelf' });
check('purchase applies', bought.applied && bought.state.credits === 1);
check('purchase is recorded as spend', bought.state.ledger.at(-1).kind === 'spend');
check('duplicate purchase rejected', !spendStoreCredit(bought.state, { id: 'buy:blue-jacket', amount: 1 }).applied);
check('overspend rejected', !spendStoreCredit(bought.state, { id: 'buy:expensive', amount: 2 }).applied);
check('invalid purchase rejected', !spendStoreCredit(bought.state, { id: '', amount: 1 }).applied);

const repaired = createWindowState({
  gangID: 'fake', onboardingComplete: true, credits: 999,
  ledger: [
    { id: 'a', kind: 'grant', amount: 2 },
    { id: 'a', kind: 'grant', amount: 200 },
    { id: 'b', kind: 'spend', amount: 1 }
  ],
  ownedCosmetics: ['one', 'one', '', 'two']
});
check('unknown stored gang is cleared', repaired.gangID === null && !repaired.onboardingComplete);
check('stored balance is not trusted', repaired.credits === 1);
check('duplicate ledger ids collapse', repaired.ledger.length === 2);
check('owned cosmetics deduplicate', repaired.ownedCosmetics.join(',') === 'one,two');

for (const [w,h] of [[280,480],[320,568],[390,844],[430,932],[768,1024],[1440,900]]) {
  const a = windowLayout(w,h);
  check('layout finite '+w, Object.values(a).every(Number.isFinite));
  check('panel fits '+w, a.panelW <= a.w-a.pad*2 && a.panelH <= a.h-a.pad*2);
  check('touch target '+w, a.actionH >= 44);
  check('content positive '+w, a.contentW > 180 && a.portrait >= 104);
}
check('invalid viewport falls back', Object.values(windowLayout(NaN, undefined)).every(Number.isFinite));

console.log('the window: '+passed+' assertions passed');

// Real selection/welcome rendering with only Phaser drawing stubbed.

const {expressionArt,expressionIndex}=await import('../src/logic/contactExpressions.js');
const sceneSource=readFileSync(new URL('../src/scenes/WindowScene.js',import.meta.url),'utf8').replace(/^import[\s\S]*?;\s*/gm,'').replace(/export /g,'');
const Scene=new Function('Phaser','WINDOW_GANGS','WINDOW_INTRO','WINDOW_ART','windowGang','windowLayout','selectWindowGang','expressionArt','expressionIndex',
  'const trackEvent=()=>{};'+sceneSource+';return WindowScene;')({Scene:class{}},WINDOW_GANGS,WINDOW_INTRO,WINDOW_ART,windowGang,windowLayout,
  gangID=>({applied:true,state:createWindowState({gangID})}),expressionArt,expressionIndex);
function reviewScene(width,height){
  const objects=[];
  const node=(kind,x,y,w=0,h=0)=>{const o={kind,x,y,width:w,height:h,active:true,
    setOrigin(x,y=x){this.originX=x;this.originY=y;return this;},setDepth(d){this.depth=d;return this;},
    setScale(scale){this.displayWidth=this.width*scale;this.displayHeight=this.height*scale;return this;},
    setFlipX(v){this.flipX=v;return this;},setStrokeStyle(){return this;},setInteractive(){return this;},
    setFillStyle(){return this;},on(){return this;},destroy(){this.active=false;}};
    objects.push(o);return o;};
  const scene=new Scene();scene._view=[];scene.scale={width,height};
  scene.textures={exists:()=>true};
  scene.add={
    rectangle:(x,y,w,h)=>node('rectangle',x,y,w,h),
    circle:(x,y,r)=>node('circle',x,y,r*2,r*2),
    image:(x,y,key,frame)=>{
      const w=key.startsWith('expression_')?320:key==='window_switch'?WINDOW_ART.switch.frameWidth:WINDOW_ART.cast.frames[frame].width;
      const h=key.startsWith('expression_')?400:key==='window_switch'?WINDOW_ART.switch.frameHeight:WINDOW_ART.cast.height;
      const image=node('image',x,y,w,h);image.key=key;image.frameID=frame;image.frame={width:w,height:h};return image;
    },
    text:(x,y,text,style)=>{const o=node('text',x,y);o.text=text;o.style=style;return o;}
  };
  return {scene,objects};
}
for(const [width,height] of [[280,480],[390,844],[671,838],[1440,900]]){
  const view=reviewScene(width,height);view.scene.showGangChoice();
  const layout=windowLayout(width,height);
  const active=view.objects.filter(o=>o.active);
  const portraits=active.filter(o=>o.kind==='image');
  check('three selection portraits '+width,portraits.length===3);
  check('no identity subtitle '+width,!active.some(o=>/Identity and dialogue/.test(o.text||'')));
  check('clear sans serif heading '+width,active.some(o=>o.text==='WHO HAS YOUR BACK?'&&o.style.fontFamily==='Arial, sans-serif'));
  check('larger crew names '+width,WINDOW_GANGS.every(g=>active.some(o=>o.text===g.name.toUpperCase()&&o.style.fontSize==='17px')));
  for(const portrait of portraits){
    check('portrait inside selection horizontal bounds '+width,portrait.x-portrait.displayWidth/2>=layout.cx-layout.contentW/2&&portrait.x+portrait.displayWidth/2<=layout.cx+layout.contentW/2);
    const hit=active.filter(o=>o.kind==='rectangle'&&o.depth===12).find(o=>portrait.y<=o.y+o.height/2&&portrait.y>o.y-o.height/2);
    check('portrait inside its own card top and bottom '+width,hit&&portrait.y-portrait.displayHeight>=hit.y-hit.height/2&&portrait.y<=hit.y+hit.height/2);
  }
  for(const gang of WINDOW_GANGS){
    view.scene.confirmGang(gang.id);
    const visible=view.objects.filter(o=>o.active),pair=visible.filter(o=>o.kind==='image');
    check('welcome shows both contacts '+width+'/'+gang.id,pair.length===2);
    check('welcome celebrates with hyped portraits '+width+'/'+gang.id,pair.every(p=>p.frameID===2&&p.key.startsWith('expression_')));
    check('welcome mirrors partners outward '+width+'/'+gang.id,pair[0].flipX===true&&pair[1].flipX===false&&pair[0].x<pair[1].x);
    check('welcome shares baseline '+width+'/'+gang.id,pair[0].y===pair[1].y);
    check('welcome preserves main/job roles '+width+'/'+gang.id,visible.some(o=>o.text===gang.primary+' is your main contact.\n'+gang.jobs+' will bring the jobs.'));
    check('welcome pair fits panel '+width+'/'+gang.id,pair.every(o=>o.x-o.displayWidth/2>=layout.cx-layout.contentW/2&&o.x+o.displayWidth/2<=layout.cx+layout.contentW/2));
    check('welcome retains enter streets '+width+'/'+gang.id,visible.some(o=>o.text==='ENTER THE STREETS'));
  }
}
console.log('Window crew presentation: '+passed+' total assertions passed');
