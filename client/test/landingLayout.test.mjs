import { landingLayout } from '../src/logic/landingLayout.js';
let passed=0;
function check(name, ok) { if(!ok) throw new Error(name); passed++; }
for (const [w,h] of [[280,480],[320,568],[390,844],[430,932],[768,1024],[1440,900]]) {
  const a=landingLayout(w,h);
  check('profile clears dock controls '+w, a.dockPad+a.profileW+8 <= a.railW-a.dockPad-136-21);
  check('finite geometry '+w, Object.values(a).every(Number.isFinite));
  check('logo fits '+w, a.logoW<=w-32 && a.logoY-a.logoH/2>=0);
  check('card fits '+w, a.cardW<=w-32 && a.cardH>=250);
  check('timer between logo and card '+w, a.tickerY-12>=a.logoY+a.logoH/2 && a.tickerY+12<a.cardY-a.cardH/2);
  check('tutorial clears card '+w, a.tutorialY-18>=a.cardY+a.cardH/2+8);
  check('tutorial above dock '+w, a.tutorialY+18<=h-56);
}
check('invalid size has finite fallback',Object.values(landingLayout(NaN,undefined)).every(Number.isFinite));
check('layout is deterministic',JSON.stringify(landingLayout(390,844))===JSON.stringify(landingLayout(390,844)));
console.log('landing layout: '+passed+' assertions passed');

