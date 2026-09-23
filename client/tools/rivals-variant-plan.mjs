#!/usr/bin/env node
// Write a reproducible Jev VARIANT plan: every course, every stash answer.
//
//   node tools/rivals-variant-plan.mjs --profile apex       --out tools/plans/jev-apex-v1.json
//   node tools/rivals-variant-plan.mjs --profile rival-hard --out tools/plans/jev-rival-hard-v1.json
//   node tools/rivals-variant-plan.mjs --profile normal     --out tools/plans/jev-v1.json
//   ... --slots 8-21            a range or a list (default: all 21 courses)
//   ... --per-course N          races per course (default 128: every pattern once;
//                               more than 128 starts a second pass with new seeds)
//   ... --runs-per-job 8        races per recorder page
//
// Opponents are Jev only. Three profiles, three banks, never mixed:
//   apex        -> jev-apex-v1        (challenge; outside ordinary matchmaking)
//   rival-hard  -> jev-rival-hard-v1  (challenge; outside ordinary matchmaking)
//   normal      -> jev-v1             (the softer Jev for ordinary matchmaking)
//
// EVERY STASH VARIANT. A course has seven houses and each has two pockets, so
// there are 128 possible seven-house answer patterns. For every course the
// plan picks one stash seed per pattern (rivalSessionPocket decides the
// pattern a seed produces) and gives every race its own seed: 128 races per
// course cover every answer a match can have. The recorder passes the seeds
// to the page (stashSeeds=...), and race N of a job is a match on seed N.
// The order within a course is the order the deterministic search finds the
// patterns in, which is effectively random, so a batch cut short still
// covers a spread of answers in every house.
//
// UNIQUE IDENTITIES. Every job gets its own opponentIndex block and races
// take indexBase, indexBase+1, ... Blocks never overlap between profiles or
// with tools/rivals-plan.mjs (which starts at 200): apex 100000 + slot*1000,
// rival-hard 200000 + slot*1000, normal 300000 + slot*1000. Recording IDs
// also hash each race's clear times, and every seed is unique in a course.
//
// VARIETY BEYOND THE STASH. Jobs rotate five opening loadouts.
//
// ORDER. Jobs round-robin across courses (every course's first job, then
// every course's second, ...), so coverage grows on all 21 at once.
//
// Run with --jev --jevProfile <profile>; Jev races run one at a time.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RIVAL_COURSE_POOL, RIVAL_HOUSES, rivalPoolCourse, rivalSessionPocket, rivalHash } from '../src/logic/rivals.js';

const JEV_LOADOUTS = ['phase,dash', 'dash,phase', 'phase,decoy', 'dash,decoy', 'decoy,phase'];
// Normal has the same movement rules as players, but never stacks both
// mobility powers. This lowers its pace without scripted mistakes or deaths.
const NORMAL_LOADOUTS = ['phase,decoy', 'decoy,phase', 'dash,decoy', 'decoy,dash', 'decoy,decoy'];
export const PATTERNS = 2 ** RIVAL_HOUSES;

export const PLAN_PROFILES = Object.freeze({
  apex: { base: 100000, bank: 'jev-apex-v1' },
  'rival-hard': { base: 200000, bank: 'jev-rival-hard-v1' },
  normal: { base: 300000, bank: 'jev-v1' }
});

/** Which pocket is real in each house for a stash seed, as a string of 0/1. */
export function stashPattern(course, seed) {
  return course.seeds.map((s) => rivalSessionPocket(s, seed)).join('');
}

/**
 * `count` stash seeds for a course: the first 128 cover every pattern once,
 * each further 128 covers them all again with different seeds. Deterministic.
 */
export function coveringSeeds(course, count = PATTERNS, profile = '') {
  const seeds = [];
  const used = new Set();
  for (let pass = 0; seeds.length < count; pass++) {
    const seen = new Set();
    for (let k = 0; seen.size < PATTERNS && seeds.length < count; k++) {
      // The profile is in the key, so the three banks never share a seed.
      const seed = rivalHash('plan/stash/' + profile + '/' + course.id + '/' + pass + '/' + k);
      if (used.has(seed)) continue;
      const p = stashPattern(course, seed);
      if (seen.has(p)) continue;
      seen.add(p); used.add(seed); seeds.push(seed);
    }
  }
  return seeds;
}

export function parseSlots(spec) {
  if (!spec || spec === true) return RIVAL_COURSE_POOL.map((c) => c.slot);
  const out = new Set();
  for (const part of String(spec).split(',')) {
    const [a, b] = part.split('-').map(Number);
    for (let s = a; s <= (Number.isFinite(b) ? b : a); s++) if (RIVAL_COURSE_POOL.some((c) => c.slot === s)) out.add(s);
  }
  return [...out].sort((x, y) => x - y);
}

/** Jobs for one profile: per course, `perCourse` races with one planned stash seed each. */
export function buildPlan(profile, { perCourse = PATTERNS, slots = parseSlots(), runsPerJob = 8 } = {}) {
  const p = PLAN_PROFILES[profile];
  if (!p) throw new Error('unknown profile ' + profile + ' (apex, rival-hard, normal)');
  const byCourse = slots.map((slot) => {
    const course = rivalPoolCourse(slot);
    const seeds = coveringSeeds(course, perCourse, profile);
    const jobs = [];
    for (let at = 0, k = 0; at < seeds.length; at += runsPerJob, k++) {
      const chunk = seeds.slice(at, at + runsPerJob);
      const loadouts = profile === 'normal' ? NORMAL_LOADOUTS : JEV_LOADOUTS;
      jobs.push({ profile, bank: p.bank, slot, style: profile === 'normal' ? 'balanced' : 'ace', powers: loadouts[(k + slot) % loadouts.length],
        runs: chunk.length, indexBase: p.base + slot * 1000 + at, stashSeeds: chunk });
    }
    return jobs;
  });
  const jobs = [];
  for (let k = 0; k < Math.max(...byCourse.map((c) => c.length)); k++) for (const c of byCourse) if (c[k]) jobs.push(c[k]);
  return jobs;
}

function main() {
  const arg = (name, fallback = null) => {
    const i = process.argv.indexOf('--' + name);
    if (i < 0) return fallback;
    const next = process.argv[i + 1];
    return next && !next.startsWith('--') ? next : true;
  };
  const profile = arg('profile');
  const jobs = buildPlan(profile, {
    perCourse: Number(arg('per-course', PATTERNS)), slots: parseSlots(arg('slots')), runsPerJob: Number(arg('runs-per-job', 8))
  });
  const out = arg('out');
  const text = JSON.stringify(jobs, null, 1) + '\n';
  if (out) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, text); }
  else process.stdout.write(text);
  const races = jobs.reduce((a, j) => a + j.runs, 0);
  console.error(`${profile}: ${jobs.length} jobs, ${races} races over ${new Set(jobs.map((j) => j.slot)).size} courses` + (out ? ' -> ' + out : ''));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
