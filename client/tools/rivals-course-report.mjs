#!/usr/bin/env node
// Every Block Rivals course, house by house: what it is and how it plays.
//
//   node tools/rivals-course-report.mjs              # per-house table + course summary
//   node tools/rivals-course-report.mjs --slot 12    # one course
//   node tools/rivals-course-report.mjs --markdown   # the course table for RIVALS_COURSES.md
//
// Houses are built exactly as the game builds them (rivalHouseMazeOptions ->
// generateSquareMaze, the same seeded stream), then measured by
// logic/rivalCourseAnalysis: run length (spawn, nearer bag, car; and the
// worst case, bunk first), hard chokes (cells a plug can hold with no way
// round), legs with no separate corridor, the longest firing lane, long
// lanes (dash room), phase shortcuts (one-cell walls that save 6+ steps),
// dead ends, and how close the plug starts to the bags. Reads nothing but
// the course definitions; writes nothing.
import { pathToFileURL } from 'node:url';
import { RIVAL_COURSE_POOL, RIVAL_HOUSES, rivalPoolCourse, rivalHouseMazeOptions } from '../src/logic/rivals.js';
import { RIVAL_COURSE_DESIGNS } from '../src/logic/rivalCourseDesigns.js';
import { generateSquareMaze } from '../src/utils/mazeGenerator.js';
import { createSeededRNG } from '../src/utils/seededRandom.js';
import { analyzeHouse } from '../src/logic/rivalCourseAnalysis.js';

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};

export function buildHouse(course, i) {
  const o = rivalHouseMazeOptions(course, i);
  return generateSquareMaze(o.cols, o.rows, { rng: createSeededRNG(course.seeds[i]), role: 'runner', clusterScale: o.clusterScale, layout: o.layout });
}

/** Per-house analysis for one pool course. Console output from the generator is silenced. */
export function courseReport(slot) {
  const course = rivalPoolCourse(slot);
  const log = console.log, warn = console.warn;
  console.log = () => {}; console.warn = () => {};
  try {
    return {
      course,
      houses: Array.from({ length: RIVAL_HOUSES }, (_, i) => {
        const arena = buildHouse(course, i);
        return { house: i + 1, structure: course.layouts?.[i]?.structure?.kind ?? 'legacy', scale: course.scales[i], layout: course.layouts?.[i] ?? null, arena, a: analyzeHouse(arena) };
      })
    };
  } finally { console.log = log; console.warn = warn; }
}

const avg = (xs) => xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : null;

export function courseSummary(rep) {
  const hs = rep.houses.map((h) => h.a);
  const kinds = [...new Set(rep.houses.map((h) => h.structure))];
  return {
    slot: rep.course.slot, name: rep.course.name, board: `${rep.course.cols}x${rep.course.rows}`,
    structures: kinds.join('/'),
    density: avg(hs.map((a) => a.density * 100)),
    run: avg(hs.map((a) => a.bestRun)), worst: avg(hs.map((a) => a.worstRun)),
    chokes: hs.reduce((a, h) => a + h.chokes, 0), singleLegs: hs.reduce((a, h) => a + h.singleRouteLegs, 0),
    lane: Math.max(...hs.map((a) => a.lane)), lanes: avg(hs.map((a) => a.lanes)),
    phase: avg(hs.map((a) => a.phase)), deadEnds: avg(hs.map((a) => a.deadEnds)),
    plugToBag: avg(hs.map((a) => Math.min(a.plug.toA ?? 99, a.plug.toB ?? 99))),
    cars: [...new Set(hs.map((a) => a.carSide))].join('')
  };
}

function main() {
  const slot = arg('slot') ? Number(arg('slot')) : null;
  const slots = slot ? [slot] : RIVAL_COURSE_POOL.map((c) => c.slot);
  const reps = slots.map(courseReport);
  if (arg('markdown')) {
    console.log('| # | Course | Board | Districts | Walls % | Run | Worst | Chokes | No-alt legs | Long lanes | Phase | Plug→bag | Character |');
    console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of reps) {
      const s = courseSummary(r);
      const d = RIVAL_COURSE_DESIGNS[r.course.slug || ''] || RIVAL_COURSE_DESIGNS[RIVAL_COURSE_POOL.find((c) => c.slot === s.slot)?.slug];
      console.log(`| ${s.slot} | ${s.name} | ${s.board} | ${s.structures} | ${s.density} | ${s.run} | ${s.worst} | ${s.chokes} | ${s.singleLegs} | ${s.lanes} | ${s.phase} | ${s.plugToBag} | ${d?.summary ?? 'Original course: the legacy scatter generator at rising density.'} |`);
    }
    return;
  }
  for (const r of reps) {
    if (slot || arg('houses')) {
      console.log(`\n${r.course.slot} ${r.course.name} (${r.course.cols}x${r.course.rows})`);
      console.table(r.houses.map((h) => ({
        house: h.house, structure: h.structure, scale: h.scale, walls: h.a.density, run: h.a.bestRun, worst: h.a.worstRun,
        'toA/toB': `${h.a.legs.toA.steps}/${h.a.legs.toB.steps}`, 'A/B→car': `${h.a.legs.aToCar.steps}/${h.a.legs.bToCar.steps}`,
        chokes: h.a.chokes, noAlt: h.a.singleRouteLegs, lane: h.a.lane, lanes: h.a.lanes, phase: h.a.phase, dead: h.a.deadEnds,
        'plug→A/B': `${h.a.plug.toA}/${h.a.plug.toB}`, car: h.a.carSide, ok: h.a.reachable
      })));
    }
  }
  console.table(reps.map(courseSummary));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
