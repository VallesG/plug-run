import { rivalCourse, rivalPathSteps, simulatedRivalTimes, newRivalRace } from '../logic/rivals.js';
import { generateSquareMaze } from './mazeGenerator.js';
import { createSeededRNG } from './seededRandom.js';
import { getUserID } from './userManager.js';

export function createRivalSession(seed = (Math.random() * 4294967296) >>> 0) {
  const course = rivalCourse(seed);
  const metrics = course.seeds.map((houseSeed,i) => {
    const arena = generateSquareMaze(course.cols,course.rows,{
      rng:createSeededRNG(houseSeed),role:'runner',clusterScale:course.scales[i]
    });
    const primary = arena.objectives.stash, secondary = arena.objectives.extract;
    // Match BaseGameScene's real/bunk assignment. Simulate searching the primary
    // pocket first; the pace includes a detour if that pocket is bunk.
    const realAtPrimary = createSeededRNG(houseSeed ^ 0xC0FFEE)() < 0.5;
    const real = realAtPrimary ? primary : secondary;
    const searchSteps = rivalPathSteps(arena.grid,arena.spawns.runner,primary) +
      (realAtPrimary ? 0 : rivalPathSteps(arena.grid,primary,secondary));
    return { searchSteps, carrySteps:rivalPathSteps(arena.grid,real,arena.egress.entry) };
  });
  return newRivalRace(course,simulatedRivalTimes(metrics,course.seed));
}

// Keep evidence locally for future ghost ingestion. No leaderboard/reward writes.
// This is not a public opponent pool, account sync or anti-cheat validation.
export function saveRivalResult(result, record) {
  try {
    const key = 'pr_rivals_results_v1_' + getUserID();
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    const history = Array.isArray(stored) ? stored : [];
    history.unshift({ savedAt:Date.now(), ...result, record });
    localStorage.setItem(key,JSON.stringify(history.slice(0,20)));
    return true;
  } catch (error) { console.warn('[Rivals] Result could not be saved',error); return false; }
}
