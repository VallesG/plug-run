#!/usr/bin/env node
// Turn recorder output into the shipped bank, using the game's own validators.
//
//   node tools/rivals-assemble.mjs --in tools/recordings --dry
//   node tools/rivals-assemble.mjs --in tools/recordings
//
// WHAT IT WILL NOT DO
// Invent a race, edit a time, rewrite a frame, re-hash a record or promote a
// partial capture. Every candidate goes through validateRivalRunRecord,
// rivalRecordMatchesCourse, validateRivalReplayBundle and validateReplaySegment
// — the same functions the client uses — and anything that fails is reported,
// not repaired. Existing bank entries are kept unless a replacement is proved
// valid, so a bad batch can never shrink the shipped pool.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateRivalRunRecord, validateRivalReplayBundle, rivalRecordMatchesCourse, rivalBytes
} from '../src/logic/rivalRecords.js';
import { validateReplaySegment } from '../src/logic/rivalReplay.js';
import { RIVAL_RULES_VERSION, RIVAL_COURSE_POOL, rivalPoolCourse } from '../src/logic/rivals.js';
import { rivalPreset } from '../src/logic/rivalPresets.js';
import { recordBenchmark, measuredBands, bandOf } from '../src/logic/rivalSkill.js';

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};
const IN = arg('in', 'tools/recordings');
const ROOT = arg('root', 'public/rivals/v2');
const DRY = !!arg('dry', false);

/** Everything currently shipped, so nothing eligible is dropped by accident. */
function readExistingBank() {
  const out = [];
  if (!existsSync(join(ROOT, 'manifest.json'))) return out;
  for (const course of RIVAL_COURSE_POOL) {
    const file = join(ROOT, 'courses', course.courseID, 'opponents.json');
    if (!existsSync(file)) continue;
    for (const entry of JSON.parse(readFileSync(file, 'utf8')).opponents) {
      const replayFile = entry.replay ? join(ROOT, entry.replay) : null;
      if (!replayFile || !existsSync(replayFile)) continue;
      out.push({ record: entry.record, bundle: JSON.parse(readFileSync(replayFile, 'utf8')), source: 'existing' });
    }
  }
  return out;
}

function readNewRecordings() {
  const out = [];
  if (!existsSync(IN)) return out;
  for (const file of readdirSync(IN).filter(f => f.endsWith('.json')).sort()) {
    const payload = JSON.parse(readFileSync(join(IN, file), 'utf8'));
    for (const race of payload.races || []) {
      if (!race.ok || !race.record || !race.bundle) {
        out.push({ rejected: true, file, reason: race.reason || 'incomplete capture', result: race.result, houses: race.houses });
        continue;
      }
      out.push({ record: race.record, bundle: race.bundle, source: file, environment: payload.environment });
    }
  }
  return out;
}

const rejected = [];
function accept(candidate) {
  const { record, bundle } = candidate;
  const tag = record?.recordingID || candidate.file || 'unknown';
  const v = validateRivalRunRecord(record);
  if (!v.ok) { rejected.push({ tag, reason: 'record: ' + v.errors[0] }); return null; }
  const course = rivalPoolCourse(record.courseSlot);
  if (!course || !rivalRecordMatchesCourse(record, course, RIVAL_RULES_VERSION)) {
    rejected.push({ tag, reason: 'course/rules mismatch' }); return null;
  }
  if (record.opponent?.kind !== 'bot' || !rivalPreset(record.opponent.skillPreset)) {
    rejected.push({ tag, reason: 'unknown driver style: ' + record.opponent?.skillPreset }); return null;
  }
  const b = validateRivalReplayBundle(bundle, record, { validateSegment: validateReplaySegment });
  if (!b.ok) { rejected.push({ tag, reason: 'bundle: ' + b.errors[0] }); return null; }
  return { record, bundle, course };
}

const candidates = [...readExistingBank(), ...readNewRecordings()];
const seen = new Set();
const accepted = [];
for (const candidate of candidates) {
  if (candidate.rejected) { rejected.push({ tag: candidate.file, reason: candidate.reason, result: candidate.result, houses: candidate.houses }); continue; }
  const ok = accept(candidate);
  if (!ok) continue;
  if (seen.has(ok.record.recordingID)) { rejected.push({ tag: ok.record.recordingID, reason: 'duplicate recordingID' }); continue; }
  seen.add(ok.record.recordingID);
  accepted.push(ok);
}

// Report the bank the way the product asks: by course, measured band and mix.
const benchmarks = accepted.map(a => recordBenchmark(a.record, a.course.scales)).filter(Boolean);
const bands = measuredBands(benchmarks);
const report = { total: accepted.length, rejected: rejected.length, bands, courses: [] };
for (const course of RIVAL_COURSE_POOL) {
  const mine = accepted.filter(a => a.record.courseID === course.courseID);
  const byBand = {}, byStyle = {}, byMix = {};
  const elapsed = [], retries = [];
  for (const a of mine) {
    const bench = recordBenchmark(a.record, a.course.scales);
    const band = bandOf(bands, bench?.clearMs);
    byBand[band ? band.label : 'unmeasured'] = (byBand[band ? band.label : 'unmeasured'] || 0) + 1;
    byStyle[a.record.opponent.skillPreset] = (byStyle[a.record.opponent.skillPreset] || 0) + 1;
    byMix[a.record.orderedPowers.join('+')] = (byMix[a.record.orderedPowers.join('+')] || 0) + 1;
    elapsed.push(a.record.elapsedMs); retries.push(a.record.retries);
  }
  elapsed.sort((x, y) => x - y); retries.sort((x, y) => x - y);
  report.courses.push({
    slot: course.slot, name: course.name, races: mine.length,
    shortfall: Math.max(0, 20 - mine.length),
    bands: byBand, styles: byStyle, mixes: byMix,
    elapsedMs: elapsed.length ? { min: elapsed[0], median: elapsed[elapsed.length >> 1], max: elapsed.at(-1) } : null,
    retries: retries.length ? { min: retries[0], median: retries[retries.length >> 1], max: retries.at(-1) } : null
  });
}

if (DRY) {
  console.log(JSON.stringify(report, null, 1));
  if (rejected.length) console.log('rejected:', JSON.stringify(rejected.slice(0, 40), null, 1));
  process.exit(0);
}

// Write. Records go out byte-for-byte as recorded; the replay path travels
// beside the record, never inside it, because a decorated record fails its hash.
if (existsSync(ROOT)) rmSync(ROOT, { recursive: true, force: true });
mkdirSync(join(ROOT, 'replays'), { recursive: true });
let bytes = 0;
const manifest = { schemaVersion: 1, rulesVersion: RIVAL_RULES_VERSION, generatedAt: new Date().toISOString(), courses: [] };
for (const course of RIVAL_COURSE_POOL) {
  const mine = accepted.filter(a => a.record.courseID === course.courseID);
  const opponents = mine.map(({ record, bundle }) => {
    const path = 'replays/' + record.recordingID + '.json';
    const json = JSON.stringify(bundle);
    writeFileSync(join(ROOT, path), json);
    bytes += json.length;
    return { record, replay: path };
  });
  mkdirSync(join(ROOT, 'courses', course.courseID), { recursive: true });
  writeFileSync(join(ROOT, 'courses', course.courseID, 'opponents.json'),
    JSON.stringify({ schemaVersion: 1, rulesVersion: RIVAL_RULES_VERSION, courseID: course.courseID, courseSlot: course.slot, name: course.name, opponents }));
  const entry = report.courses.find(c => c.slot === course.slot);
  manifest.courses.push({ slot: course.slot, name: course.name, courseID: course.courseID, opponents: opponents.length, bands: entry.bands, styles: entry.styles, elapsedMs: opponents.map(o => o.record.elapsedMs) });
}
writeFileSync(join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(JSON.stringify({ ...report, replayKB: Math.round(bytes / 1024), maxRecordBytes: Math.max(...accepted.map(a => rivalBytes(a.record))) }, null, 1));
if (rejected.length) console.log('rejected:', JSON.stringify(rejected.slice(0, 40), null, 1));
