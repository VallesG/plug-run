#!/usr/bin/env node
// How deep and how varied is each opponent bank, course by course?
//
//   node tools/rivals-bank-report.mjs                    # every bank
//   node tools/rivals-bank-report.mjs --bank jev-rival-hard-v1
//   node tools/rivals-bank-report.mjs --json             # machine-readable
//   node tools/rivals-bank-report.mjs --strict           # exit 1 if any course is under target
//
// One recording per course is learnable: a player who meets it twice knows
// its route, its stash answers, its first bag and its retries. So for every
// course this counts the variants a player could actually be matched with
// and how different they are:
//
//   eligible    records with match stash rules (stashRules 'match-v1' and a
//               stashSeed). Anything else cannot be matched today.
//   stashSeeds  distinct match stash seeds; patterns = distinct seven-house
//               answer patterns (which pocket is real in each house)
//   firstBags   distinct per-house first-bag choices, summed over houses
//   loadouts    distinct opening power pairs
//   time        fastest / median / slowest finish; retries min-max
//   dupes       repeated recordingIDs, opponent IDs or stash seeds
//
// Target (per course, every Jev bank): 128 matchable variants — one for each
// seven-house stash pattern (tools/rivals-variant-plan.mjs plans exactly
// that). Override with --target. The ordinary style-bot bank
// (v2) is no longer recorded; --bank v2 still reports it.
// Reads the banks under public/rivals; writes nothing.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RIVAL_COURSE_POOL, RIVAL_HOUSES, rivalPoolCourse, rivalSessionPocket } from '../src/logic/rivals.js';

export const BANK_TARGETS = Object.freeze({ 'jev-apex-v1': 128, 'jev-rival-hard-v1': 128, 'jev-v1': 128 });
const BANK_NOTES = {
  'jev-apex-v1': 'Jev Apex — challenge only, outside ordinary matchmaking',
  'jev-rival-hard-v1': 'Jev Rival Hard — challenge only, outside ordinary matchmaking',
  'jev-v1': 'normal Jev — ordinary matchmaking (reserved for the softer profile)',
  v2: 'ordinary style bots (legacy, no longer recorded) — ordinary matchmaking'
};

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

function readCourseFile(root, course) {
  const file = join(root, 'courses', course.courseID, 'opponents.json');
  if (!existsSync(file)) return [];
  try { return JSON.parse(readFileSync(file, 'utf8')).opponents || []; } catch { return []; }
}

/** The first bag reached on each house's first attempt, as a pocket index (from the replay), or null. */
function firstBags(root, entry) {
  if (!entry.replay || !existsSync(join(root, entry.replay))) return null;
  try {
    const bundle = JSON.parse(readFileSync(join(root, entry.replay), 'utf8'));
    return Array.from({ length: RIVAL_HOUSES }, (_, i) => {
      const seg = bundle.segments.find((s) => s.house === i + 1 && s.attempt === 1) || bundle.segments.find((s) => s.house === i + 1);
      const e = seg?.replay?.events?.find((x) => x.k === 'pickup' || x.k === 'bunk');
      return e ? e.i : null;
    });
  } catch { return null; }
}

export function courseStats(bank, course, root = join('public/rivals', bank)) {
  const entries = readCourseFile(root, course);
  const recs = entries.map((e) => e.record).filter(Boolean);
  const eligible = entries.filter((e) => e.record?.stashRules === 'match-v1' && Number.isInteger(e.record.stashSeed));
  const pc = rivalPoolCourse(course.slot);
  const pattern = (seed) => pc.seeds.map((s) => rivalSessionPocket(s, seed)).join('');
  const seeds = eligible.map((e) => e.record.stashSeed >>> 0);
  const bags = eligible.map((e) => firstBags(root, e)).filter(Boolean);
  const perHouseChoices = Array.from({ length: RIVAL_HOUSES }, (_, h) => new Set(bags.map((b) => b[h]).filter((v) => v != null)).size);
  const count = (xs) => xs.length - new Set(xs).size;
  const times = eligible.map((e) => e.record.elapsedMs).filter(Number.isFinite);
  const retries = eligible.map((e) => e.record.retries).filter(Number.isFinite);
  return {
    slot: course.slot, name: course.name, total: recs.length, eligible: eligible.length,
    stashSeeds: new Set(seeds).size, patterns: new Set(seeds.map(pattern)).size,
    firstBags: perHouseChoices.reduce((a, b) => a + b, 0), housesWithBothFirstBags: perHouseChoices.filter((n) => n === 2).length,
    loadouts: new Set(eligible.map((e) => (e.record.orderedPowers || []).join('+'))).size,
    fastest: times.length ? Math.round(Math.min(...times) / 1000) : null,
    median: times.length ? Math.round(median(times) / 1000) : null,
    slowest: times.length ? Math.round(Math.max(...times) / 1000) : null,
    retries: retries.length ? `${Math.min(...retries)}-${Math.max(...retries)}` : null,
    dupes: count(recs.map((r) => r.recordingID)) + count(recs.map((r) => r.opponent?.id).filter(Boolean)) + count(seeds)
  };
}

export function bankReport(bank, target = BANK_TARGETS[bank] ?? 10) {
  const courses = RIVAL_COURSE_POOL.map((c) => courseStats(bank, c));
  const warnings = [];
  for (const c of courses) {
    if (c.eligible < target) warnings.push(`${bank} slot ${c.slot} ${c.name}: ${c.eligible}/${target} matchable variants` + (c.total > c.eligible ? ` (${c.total - c.eligible} recorded without match stash rules)` : ''));
    if (c.dupes) warnings.push(`${bank} slot ${c.slot} ${c.name}: ${c.dupes} duplicate id(s) or stash seed(s)`);
    if (c.eligible && c.patterns < Math.min(128, target)) warnings.push(`${bank} slot ${c.slot} ${c.name}: ${c.patterns}/128 stash patterns covered`);
    if (c.eligible >= 4 && c.loadouts < 2) warnings.push(`${bank} slot ${c.slot} ${c.name}: every variant opens with the same powers`);
  }
  return { bank, target, note: BANK_NOTES[bank] ?? '', courses, warnings,
    totals: { recorded: courses.reduce((a, c) => a + c.total, 0), eligible: courses.reduce((a, c) => a + c.eligible, 0),
      coursesAtTarget: courses.filter((c) => c.eligible >= target).length } };
}

function main() {
  const banks = arg('bank') ? [arg('bank')] : Object.keys(BANK_TARGETS);
  const reps = banks.map((b) => bankReport(b, arg('target') ? Number(arg('target')) : (BANK_TARGETS[b] ?? 20)));
  if (arg('json')) { console.log(JSON.stringify(reps, null, 1)); }
  else {
    for (const r of reps) {
      console.log(`\n${r.bank} — ${r.note}; target ${r.target} matchable variants per course`);
      console.table(r.courses.map((c) => ({ slot: c.slot, course: c.name, recorded: c.total, matchable: c.eligible, stashSeeds: c.stashSeeds, patterns: c.patterns,
        firstBagHouses: c.housesWithBothFirstBags, loadouts: c.loadouts, 's fast/med/slow': c.eligible ? `${c.fastest}/${c.median}/${c.slowest}` : '—', retries: c.retries ?? '—', dupes: c.dupes })));
      console.log(`${r.bank}: ${r.totals.eligible} matchable of ${r.totals.recorded} recorded; ${r.totals.coursesAtTarget}/${RIVAL_COURSE_POOL.length} courses at target`);
      for (const w of r.warnings.slice(0, 60)) console.log('  WARN ' + w);
      if (r.warnings.length > 60) console.log(`  … and ${r.warnings.length - 60} more`);
    }
  }
  if (arg('strict') && reps.some((r) => r.totals.coursesAtTarget < RIVAL_COURSE_POOL.length)) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
