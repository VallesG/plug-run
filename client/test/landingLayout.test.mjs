import { landingLayout, landingSession, titleBackdrop } from '../src/logic/landingLayout.js';
let passed = 0;
function check(name, ok) { if (!ok) throw new Error(name); passed++; }
for (const [w,h] of [[280,480],[320,568],[390,844],[430,932],[768,1024],[1200,480],[1440,900],[1920,1080]]) {
  const a = landingLayout(w,h);
  check('finite geometry '+w, Object.values(a).every(Number.isFinite));
  check('logo fits '+w, a.logoW<=w-32 && a.logoY-a.logoH/2>=0);
  check('logo aspect ratio stays intact '+w, a.logoH===a.logoW*0.32);
  check('timer clears logo '+w, a.tickerY-12>=a.logoY+a.logoH/2+8);
  check('menu clears timer '+w, a.menuY-a.rowH/2>=a.tickerY+24);
  check('menu fits horizontally '+w, a.menuW>=168 && a.menuW<=w-64);
  check('touch targets are at least 44px '+w, a.rowH>=44);
  check('rows have separate hit targets '+w, a.rowGap>=a.rowH);
  check('five rows stay above footer '+w, a.menuY+4*a.rowGap+a.rowH/2<=h-56);
  check('profile clears footer controls '+w, a.dockPad+a.profileW+8<=a.railW-a.dockPad-80-21);
  const figures=titleBackdrop(w,h);
  check('framing is present but bounded '+w, figures.length>=2 && figures.length<=12);
  check('backdrop deterministic '+w, JSON.stringify(figures)===JSON.stringify(titleBackdrop(w,h)));
  check('figures have finite valid treatment '+w, figures.every(p =>
    [p.x,p.y,p.size,p.angle,p.alpha].every(Number.isFinite) &&
    p.size>0 && p.size<=88 && p.alpha>0 && p.alpha<=0.21 &&
    ['plug','runner'].includes(p.role)));
  // Conservative rotated-square bounds protect the center, independent of art.
  const zones=[
    [w/2-a.logoW/2-12,a.logoY-a.logoH/2-12,a.logoW+24,a.logoH+64],
    [w/2-a.menuW/2-12,a.menuY-36,a.menuW+24,a.rowGap*4+72]
  ];
  check('figures never cross logo or menu '+w, figures.every(p =>
    zones.every(([x,y,zw,zh]) => p.x+p.size*0.72<x || p.x-p.size*0.72>x+zw ||
      p.y+p.size*0.72<y || p.y-p.size*0.72>y+zh)));
}
check('invalid viewport falls back safely',Object.values(landingLayout(NaN,undefined)).every(Number.isFinite));
check('missing save starts fresh',landingSession(undefined).label==='Start Block');
check('map one starts fresh',!landingSession(1).resumable && landingSession(1).cleared===0);
check('map six resumes after five clears',landingSession(6).label==='Continue' && landingSession(6).cleared===5);
check('finale can resume',landingSession(15).resumable && landingSession(15).cleared===14);
check('legacy ladder save starts fresh',!landingSession(25).resumable && landingSession(25).label==='Start Block');
check('invalid saves cannot resume',[NaN,-1,0,3.5,'6',Infinity].every(n=>!landingSession(n).resumable));
check('daily session state is deterministic',JSON.stringify(landingSession(6))===JSON.stringify(landingSession(6)));
console.log('landing title screen: '+passed+' assertions passed');
