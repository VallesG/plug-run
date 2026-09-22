import { pathDistances, distTo } from './jevStrategy.js';

// Phase is intangibility, NOT a dash. Reserve time to leave the wall fully.
export function phaseReachCells(speed, cell, duration = 600) {
  return speed > 0 && cell > 0 ? speed / cell * Math.max(0, duration - 100) / 1000 : 0;
}

// Compare walking against a single straight wall crossing, including the walk
// to its takeoff and from its landing. Never infer which bag is genuine.
export function phaseShortcut(world, from, goal, reach, maxApproach = 8) {
  if (!from || !goal || reach < 2) return null;
  const before = pathDistances(world, from), after = pathDistances(world, goal);
  const walking = distTo(before, goal);
  if (walking == null) return null;
  let best = null;
  for (let y = 0; y < world.rows; y++) for (let x = 0; x < world.cols; x++) {
    const takeoff = { x, y }, approach = distTo(before, takeoff);
    if (approach == null || approach > maxApproach) continue;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      if (world.isWalkable(x + dx, y + dy)) continue;
      for (let n = 2; n <= Math.floor(reach); n++) {
        const landing = { x: x + dx * n, y: y + dy * n };
        if (landing.x <= 0 || landing.y <= 0 || landing.x >= world.cols - 1 || landing.y >= world.rows - 1) break;
        if (!world.isWalkable(landing.x, landing.y)) continue;
        if ((world.threats || world.plugs || []).some(p => Math.hypot(p.x-landing.x,p.y-landing.y)<2)) break;
        const remaining = distTo(after, landing);
        const total = approach + n + (remaining ?? Infinity), saved = walking - total;
        if (saved >= 3 && (!best || total < best.total || (total === best.total && approach < best.approach))) {
          best = { takeoff, landing, dir: { x: dx, y: dy }, approach, crossing: n, total, saved };
        }
        break; // first floor is the landing; never spend through a second wall
      }
    }
  }
  return best;
}

export function phaseCanCross(from, landing, speed, cell, duration) {
  return Math.hypot(landing.x - from.x, landing.y - from.y) <= phaseReachCells(speed, cell, duration) * cell;
}

// Mirror the real dash: cardinal, fixed tile count, stopping at the first wall.
export function dashPlan(world, from, goal, tiles = 3) {
  if (!from || !goal) return null;
  const distance = pathDistances(world, goal), start = distTo(distance, from);
  if (start == null) return null;
  const threats = world.threats || [];
  const gap = c => Math.min(Infinity, ...threats.map(p => Math.hypot(p.x-c.x, p.y-c.y)));
  const initialGap = gap(from);
  let best = null;
  for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    let landing = { ...from }, traveled = 0;
    for (let i=0; i<tiles; i++) {
      const next = { x: landing.x+dx, y: landing.y+dy };
      if (!world.isWalkable(next.x,next.y)) break;
      landing=next; traveled++;
    }
    const left = distTo(distance, landing), landingGap=gap(landing);
    if (traveled < 2 || left == null) continue;
    const objective = left <= 1 && start-left >= 2;
    const escape = initialGap <= 6 && landingGap >= initialGap+1 && left <= start+3;
    if ((!objective && !escape) || landingGap < Math.min(2,initialGap)) continue;
    const score = (objective ? 20 : 0) + (escape ? landingGap-initialGap : 0) + start-left;
    if (!best || score > best.score) best={dir:{x:dx,y:dy},landing,score,reason:objective?'objective':'escape'};
  }
  return best;
}
