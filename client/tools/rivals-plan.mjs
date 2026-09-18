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
const SLOT_ORDER_ALL = [5, 7, 2, 4, 3, 6, 1];

// Seconds a style is given for one seven-house race.
//
// THESE ARE DELIBERATELY GENEROUS, AND THAT COSTS ALMOST NOTHING
// A limit only binds on a race that would otherwise be REJECTED. Completed
// races have a median of 145s, so doubling a 480s limit does not halve
// throughput — it converts near-misses into valid records.
//
// The first set was derived from slot 1, the easiest course, and was too tight
// everywhere else. Measured: Cautious forfeited at house 4 of 7 on Switchyard
// Seven at 545s against a 540s limit; Ghost forfeited at house 6 of 7 on
// Blacktop Crown at 485s against a 480s limit. In both the bot was still
// progressing when the clock ran out — the limit was the binding constraint,
// not the bot. Raising a limit is legitimate: it is a give-up point, never a
// number written into a record.
const LIMIT_S = {
  cautious: 1080, ghost: 960, dasher: 960, trickster: 1080, balanced: 840,
  sharp: 840, erratic: 1200, rookie: 2400
};
// Rookie and Erratic are the slowest and least certain; they go last.
const STYLE_ORDER = ['cautious', 'ghost', 'dasher', 'balanced', 'sharp', 'trickster', 'erratic', 'rookie'];

// SPLITTING THE WORK ACROSS TWO MACHINES
//   --styles rookie,erratic,trickster   only those styles
//   --indexBase 1000                    keep recording IDs from two machines apart
// Partition by STYLE, not by course: every style still covers all seven
// courses, so neither machine ends up with a course nobody recorded. Two
// machines must never record the same style — that is duplicated hours, not
// more coverage.
const argOf = (name, fallback = null) => {
  const i = process.argv.indexOf('--' + name);
  return i < 0 ? fallback : (process.argv[i + 1] ?? fallback);
};
const ONLY = (argOf('styles') || '').split(',').map(s => s.trim()).filter(Boolean);
const INDEX_BASE = Number(argOf('indexBase', 200));
// --slots 5        top up one course instead of all seven
// --runs 3         races per job; a top-up wants RUNS, not a longer limit
const ONLY_SLOTS = (argOf('slots') || '').split(',').map(s => Number(s.trim())).filter(Boolean);
const RUNS = Number(argOf('runs', 2));

// Ordered mixes, including duplicates and Decoy. A style's own mixes rotate so
// the same style is not always recorded on the same pair.
const jobs = [];
let index = INDEX_BASE;
const styles = ONLY.length ? STYLE_ORDER.filter(s => ONLY.includes(s)) : STYLE_ORDER;
if (ONLY.length && styles.length !== ONLY.length) {
  throw new Error('unknown style in --styles: ' + ONLY.filter(s => !STYLE_ORDER.includes(s)).join(','));
}
for (let round = 0; round < styles.length; round++) {
  const style = styles[round];
  const def = RIVAL_DRIVER_STYLES[style];
  if (!def) throw new Error('unknown style ' + style);
  const mixes = def.mixes;
  const SLOT_ORDER = ONLY_SLOTS.length ? ONLY_SLOTS : SLOT_ORDER_ALL;
  SLOT_ORDER.forEach((slot, i) => {
    jobs.push({
      slot, style,
      powers: mixes[(round + i) % mixes.length].join(','),
      runs: RUNS,
      indexBase: index += 3,
      hardLimitMs: LIMIT_S[style] * 1000
    });
  });
}
process.stdout.write(JSON.stringify(jobs, null, 1) + '\n');
