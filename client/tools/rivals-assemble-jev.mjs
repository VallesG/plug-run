#!/usr/bin/env node
// Assemble the Jev opponent bank from paid Jev-strategist captures.
//
//   node tools/rivals-assemble-jev.mjs --in tools/recordings --dry
//   node tools/rivals-assemble-jev.mjs --in tools/recordings
//   node tools/rivals-assemble-jev.mjs --in tools/recordings/jev/v3 --fresh
//
// By default a pass keeps everything already in the bank and adds to it.
// --fresh builds the bank from the captures under --in alone, retiring the
// entries already there (listed in the report as retired; git has them).
//
// Writes ONLY public/rivals/jev-v1/ (manifest.json, courses/<courseID>/
// opponents.json, replays/<recordingID>.json). It never reads from, writes to
// or deletes anything under public/rivals/v2, refuses a --root there, and
// checks v2's bytes are unchanged after a write. The game reads both banks
// into one opponent pool per course (utils/rivalSession.js).
//
// What gets in, and what is refused, is decided in tools/lib/jevBank.mjs —
// the same module the bank test uses. Every capture found under --in is
// examined (recursively), so mocks, ordinary bots, baselines and failed runs
// are reported as rejected with a reason rather than silently skipped.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { RIVAL_RULES_VERSION, RIVAL_COURSE_POOL } from '../src/logic/rivals.js';
import { selectJevBank, JEV_BANK_ID, JEV_APEX_BANK_ID, JEV_RIVAL_HARD_BANK_ID, JEV_BANK_SCHEMA,
  JEV_BANK_ROOT, JEV_APEX_BANK_ROOT, JEV_RIVAL_HARD_BANK_ROOT, ORDINARY_BANK_ROOT } from './lib/jevBank.mjs';

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};

/** The existing Jev bank, so a later pass never drops what is already in it. */
export function readJevBank(root) {
  const out = [];
  if (!existsSync(join(root, 'manifest.json'))) return out;
  for (const course of RIVAL_COURSE_POOL) {
    const file = join(root, 'courses', course.courseID, 'opponents.json');
    if (!existsSync(file)) continue;
    for (const entry of JSON.parse(readFileSync(file, 'utf8')).opponents || []) {
      const replay = entry.replay ? join(root, entry.replay) : null;
      if (!replay || !existsSync(replay)) continue;
      out.push({ record: entry.record, bundle: JSON.parse(readFileSync(replay, 'utf8')), provenance: entry.provenance });
    }
  }
  return out;
}

/** Every recorder capture under a directory, recursively. Events files and videos are not captures. */
export function readCaptures(dir) {
  const out = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!name.endsWith('.json') || name.endsWith('.events.json')) continue;
      let payload;
      try { payload = JSON.parse(readFileSync(p, 'utf8')); } catch { continue; }
      if (typeof payload?.tool !== 'string' || !payload.tool.startsWith('rivals-record/') || !Array.isArray(payload.races)) continue;
      out.push({ file: relative(dir, p).split(sep).join('/'), payload });
    }
  };
  walk(dir);
  return out;
}

function treeHash(dir) {
  const h = createHash('sha256');
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else h.update(relative(dir, p) + '\0').update(readFileSync(p));
    }
  };
  walk(dir);
  return h.digest('hex').slice(0, 16);
}

export function writeJevBank(root, accepted, bankId = JEV_BANK_ID) {
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  mkdirSync(join(root, 'replays'), { recursive: true });
  const manifest = {
    schemaVersion: JEV_BANK_SCHEMA, bank: bankId, rulesVersion: RIVAL_RULES_VERSION,
    generatedAt: new Date().toISOString(),
    note: bankId === JEV_APEX_BANK_ID
      ? 'Jev Apex: unrestricted challenge ghosts, kept outside ordinary matchmaking.'
      : bankId === JEV_RIVAL_HARD_BANK_ID
        ? 'Jev Rival Hard: humanized high-skill challenge ghosts, kept outside ordinary matchmaking.'
        : 'Jev Rival: reserved for beatable opponents pooled into ordinary Block Rivals matchmaking.',
    courses: []
  };
  for (const course of RIVAL_COURSE_POOL) {
    const mine = accepted.filter((a) => a.record.courseID === course.courseID)
      .sort((a, b) => a.record.recordingID < b.record.recordingID ? -1 : 1);
    if (!mine.length) continue;
    const opponents = mine.map(({ record, bundle, provenance }) => {
      const path = 'replays/' + record.recordingID + '.json';
      writeFileSync(join(root, path), JSON.stringify(bundle));
      // Records go out byte-for-byte as recorded; provenance and the replay
      // path travel beside the record, never inside it (a decorated record
      // fails its hash).
      return { record, replay: path, provenance };
    });
    mkdirSync(join(root, 'courses', course.courseID), { recursive: true });
    writeFileSync(join(root, 'courses', course.courseID, 'opponents.json'), JSON.stringify({
      schemaVersion: JEV_BANK_SCHEMA, bank: bankId, rulesVersion: RIVAL_RULES_VERSION,
      courseID: course.courseID, courseSlot: course.slot, name: course.name, opponents
    }));
    manifest.courses.push({
      slot: course.slot, name: course.name, courseID: course.courseID, opponents: opponents.length,
      recordingIDs: opponents.map((o) => o.record.recordingID),
      elapsedMs: opponents.map((o) => o.record.elapsedMs),
      retries: opponents.map((o) => o.record.retries),
      costUsd: opponents.map((o) => o.provenance.costUsd)
    });
  }
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest, null, 1));
  return manifest;
}

function main() {
  const IN = arg('in', 'tools/recordings');
  const wanted = arg('profile', 'rival');
  const PROFILE = wanted === 'apex' ? 'apex' : ['hard', 'rival-hard'].includes(wanted) ? 'rival-hard'
    : ['normal', 'rival'].includes(wanted) ? 'normal' : null;
  if (!PROFILE) { console.error(`unknown Jev bank profile: ${wanted}`); process.exit(2); }
  const BANK_ID = PROFILE === 'apex' ? JEV_APEX_BANK_ID
    : PROFILE === 'rival-hard' ? JEV_RIVAL_HARD_BANK_ID : JEV_BANK_ID;
  const ROOT = arg('root', PROFILE === 'apex' ? JEV_APEX_BANK_ROOT
    : PROFILE === 'rival-hard' ? JEV_RIVAL_HARD_BANK_ROOT : JEV_BANK_ROOT);
  const DRY = !!arg('dry', false);
  const FRESH = !!arg('fresh', false);
  const REQUIRED = Number(arg('require', 0));
  const v2 = resolve(ORDINARY_BANK_ROOT);
  const root = resolve(ROOT);
  if (root === v2 || root.startsWith(v2 + sep) || v2.startsWith(root + sep)) {
    console.error(`refusing --root ${ROOT}: it overlaps ${ORDINARY_BANK_ROOT}, the ordinary bot bank`);
    process.exit(2);
  }

  const banked = readJevBank(ROOT);
  const existing = FRESH ? [] : banked;
  // Provenance names each capture relative to tools/recordings, whatever
  // --in was, so a bank built from a subfolder still points at its files.
  const captures = readCaptures(IN).map((c) => ({ ...c, file: relative('tools/recordings', join(IN, c.file)).split(sep).join('/') }));
  const { accepted, rejected, reimported } = selectJevBank(existing, captures, BANK_ID);
  if (REQUIRED && accepted.length < REQUIRED) {
    console.error(`refusing to write ${BANK_ID}: ${accepted.length}/${REQUIRED} required races accepted`);
    process.exitCode = 1;
    return;
  }
  const kept = new Set(accepted.map((a) => a.record.recordingID));
  const report = {
    bank: BANK_ID, profile: PROFILE, root: ROOT, dry: DRY, fresh: FRESH, capturesExamined: captures.length,
    existing: banked.length, accepted: accepted.length, reimported, rejected: rejected.length,
    retired: banked.map((e) => e.record.recordingID).filter((id) => !kept.has(id)),
    entries: accepted.map((a) => ({
      recordingID: a.record.recordingID, slot: a.record.courseSlot, elapsedMs: a.record.elapsedMs,
      retries: a.record.retries, costUsd: a.provenance.costUsd, logicalRequests: a.provenance.requests.logical,
      model: a.provenance.model.returned, source: a.provenance.source
    }))
  };

  if (!DRY) {
    const before = treeHash(v2);
    writeJevBank(ROOT, accepted, BANK_ID);
    const after = treeHash(v2);
    report.v2Unchanged = before === after;
    if (!report.v2Unchanged) { console.error('rivals/v2 changed during a Jev bank write — this must never happen'); process.exit(1); }
  }
  console.log(JSON.stringify(report, null, 1));
  if (rejected.length) console.log('rejected:', JSON.stringify(rejected, null, 1));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
