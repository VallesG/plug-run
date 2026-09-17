#!/usr/bin/env node
// Generate the recording plan. Reproducible, so the plan can be re-derived
// when the bank's shortfall changes instead of being hand-edited.
//
//   node tools/rivals-plan.mjs > tools/rivals-plan.json
//
// ORDERING IS DELIBERATE
// Jobs round-robin across courses, neediest course first, so a batch that is
// cut short still leaves coverage spread across all seven rather than a
// finished slot 1 and nothing else.
//
// HARD LIMITS ARE MEASURED, NOT GUESSED
// The limit is a give-up point for one race, never a time that gets written
// into a record. It is set from what each style actually does: Cautious
// cleared seven houses in 167-238s, Ghost in 293s, Erratic in 388s. Rookie
// reached house 3 of 7 in 785s on the EASIEST course, so 780s could never
// produce a complete Rookie race — its limit is raised to match its measured
// pace (~260s/house early, denser houses later), and Rookie runs last so a
// batch that is cut short loses the least certain jobs rather than the
// surest ones.
import { RIVAL_DRIVER_STYLES } from '../src/logic/rivalPresets.js';

// Courses ordered by how far the shipped bank is from 20 races, neediest
// first. From `node tools/rivals-assemble.mjs --dry` on the current bank:
// slot5 5, slot7 7, slot2 8, slot4 8, slot3 9, slot6 9, slot1 11.
const SLOT_ORDER = [5, 7, 2, 4, 3, 6, 1];

// Seconds a style is given for one seven-house race.
const LIMIT_S = {
  cautious: 540, ghost: 480, dasher: 480, trickster: 540, balanced: 420,
  sharp: 420, erratic: 900, rookie: 2400
};
// Rookie and Erratic are the slowest and least certain; they go last.
const STYLE_ORDER = ['cautious', 'ghost', 'dasher', 'balanced', 'sharp', 'trickster', 'erratic', 'rookie'];

// Ordered mixes, including duplicates and Decoy. A style's own mixes rotate so
// the same style is not always recorded on the same pair.
const jobs = [];
let index = 200;
for (let round = 0; round < STYLE_ORDER.length; round++) {
  const style = STYLE_ORDER[round];
  const def = RIVAL_DRIVER_STYLES[style];
  if (!def) throw new Error('unknown style ' + style);
  const mixes = def.mixes;
  SLOT_ORDER.forEach((slot, i) => {
    jobs.push({
      slot, style,
      powers: mixes[(round + i) % mixes.length].join(','),
      runs: 2,
      indexBase: index += 3,
      hardLimitMs: LIMIT_S[style] * 1000
    });
  });
}
process.stdout.write(JSON.stringify(jobs, null, 1) + '\n');
