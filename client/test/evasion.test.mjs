// Evasion-commitment tests — plain Node, no framework, no browser.
//
//   node client/test/evasion.test.mjs
//
// The bug these lock down cost 15% of a round-8 batch: the bot vibrating in
// place between two plugs until the 90-second round clock ended the run.

import { planDodge } from '../src/logic/evasion.js';

let passed = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

const CFG = { commitMs: 220, maxMs: 1200, restMs: 600 };
const UP = { x: 0, y: -1 };
const RIGHT = { x: 1, y: 0 };
const fresh = () => ({ dir: null, until: 0, since: 0, suppressUntil: 0 });

console.log('\nEvasion commitment\n');

// 1. In a lane with somewhere to go: dodge.
{
  const { dir } = planDodge(fresh(), 1000, 'row', UP, CFG);
  check('dodges when exposed in a lane', dir === UP);
}

// 2. Clear of any lane: defer to normal steering.
{
  const { dir } = planDodge(fresh(), 1000, null, UP, CFG);
  check('does not dodge when no lane threatens', dir === null);
}

// 3. Nowhere legal to dodge to — a corridor with walls both sides.
{
  const { dir } = planDodge(fresh(), 1000, 'row', null, CFG);
  check('defers when there is no legal dodge', dir === null);
}

// 4. THE BUG. Two plugs, and the geometry flips which lane threatens on
//    alternating frames. Without commitment this reverses every frame and the
//    bot goes nowhere. With it, the first choice holds through the window.
{
  let st = fresh();
  const dirs = [];
  for (let t = 0; t < 200; t += 16) {
    // risk alternates row/col every frame; candidate flips with it
    const risk = (t / 16) % 2 === 0 ? 'row' : 'col';
    const cand = risk === 'row' ? UP : RIGHT;
    const out = planDodge(st, 1000 + t, risk, cand, CFG);
    st = out.state;
    if (out.dir) dirs.push(out.dir);
  }
  const flips = dirs.filter((d, i) => i && d !== dirs[i - 1]).length;
  check('holds one direction through the commit window', flips === 0,
    `${flips} reversals across ${dirs.length} frames`);
}

// 5. ...and reconsiders once the window expires, so commitment is not blindness.
{
  let st = planDodge(fresh(), 1000, 'row', UP, CFG).state;
  const out = planDodge(st, 1000 + CFG.commitMs + 1, 'col', RIGHT, CFG);
  check('re-decides after the commit window', out.dir === RIGHT);
}

// 6. Pinned. A dodge still running after maxMs is not working — stop, so the
//    pathfinder can make progress. Being shot at while advancing beats being
//    held in place until the clock runs out.
{
  let st = fresh();
  let t = 1000;
  let lastDir = null;
  for (; t < 1000 + CFG.maxMs + 100; t += 16) {
    const out = planDodge(st, t, 'row', UP, CFG);
    st = out.state;
    lastDir = out.dir;
  }
  check('gives up after being pinned for maxMs', lastDir === null);
  check('and schedules a rest period', st.suppressUntil > t - 16);
}

// 7. During the rest it ignores the lane entirely, then resumes.
{
  const resting = { dir: null, until: 0, since: 0, suppressUntil: 5000 };
  check('ignores the lane while resting',
    planDodge(resting, 4999, 'row', UP, CFG).dir === null);
  check('resumes dodging once rested',
    planDodge(resting, 5001, 'row', UP, CFG).dir === UP);
}

// 8. Leaving the lane clears the pin timer, so a later dodge gets a full
//    budget rather than inheriting an old one and giving up instantly.
{
  const midDodge = { dir: UP, until: 2000, since: 1000, suppressUntil: 0 };
  const cleared = planDodge(midDodge, 1500, null, null, CFG).state;
  check('clears the pin timer when the lane clears', cleared.since === 0);
  const out = planDodge(cleared, 1600, 'row', UP, CFG);
  check('and the next dodge starts a fresh budget', out.dir === UP);
}

// 9. The input state is never mutated — the caller assigns the result back,
//    and a hidden mutation would make the commit window unobservable.
{
  const st = fresh();
  planDodge(st, 1000, 'row', UP, CFG);
  check('does not mutate the state it is given',
    st.dir === null && st.until === 0 && st.since === 0);
}

{
  let st=fresh(),rested=false;
  for(let t=1000;t<2600;t+=50){
    const risk=t%100===0?'row':null;
    const out=planDodge(st,t,risk,UP,{...CFG,clearGraceMs:600});st=out.state;
    if(st.suppressUntil>t)rested=true;
  }
  check('brief lane gaps cannot reset the dodge budget forever',rested);
  let st2=planDodge(fresh(),1000,'row',UP,{...CFG,clearGraceMs:600}).state;
  st2=planDodge(st2,1100,null,null,{...CFG,clearGraceMs:600}).state;
  st2=planDodge(st2,1750,null,null,{...CFG,clearGraceMs:600}).state;
  check('sustained clear movement resets the hybrid dodge budget',st2.since===0);
}
console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
