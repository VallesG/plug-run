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
