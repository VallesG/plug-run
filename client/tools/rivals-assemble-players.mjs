#!/usr/bin/env node
// Bank real players' shared Block Rivals races.
//
//   node tools/rivals-assemble-players.mjs --pull tools/recordings/players/pending
//        download every pending run from the site's Netlify Blobs store
//        (needs NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN; never printed)
//   node tools/rivals-assemble-players.mjs --in tools/recordings/players/pending --dry
//        re-check every downloaded run and report, writing nothing
//   node tools/rivals-assemble-players.mjs --in tools/recordings/players/pending
//        add the accepted runs to client/public/rivals/players-v1/
//   node tools/rivals-assemble-players.mjs --report
//        runs per course, and the total against the rotation threshold
//
// Review the downloads before banking; the bank is committed to the repo like
// the Jev banks. Each run is checked again here with the same rules the
// submission used (src/logic/rivalPlayerRuns.js). The bank keeps the newest
// three runs per player per course. It writes ONLY public/rivals/players-v1/
// and checks every other bank under public/rivals is unchanged afterwards.
//
// Nothing reads this bank in the game yet: players meet player runs only once
// it holds PLAYER_BANK_ROTATION_MIN of them and it is added to a pool.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { RIVAL_RULES_VERSION, RIVAL_COURSE_POOL } from '../src/logic/rivals.js';
import {
  PLAYER_BANK_ID, PLAYER_BANK_ROOT, PLAYER_BANK_ROTATION_MIN, PLAYER_RUN_SOURCE, playerRunErrors, keepNewestPlayerRuns
} from '../src/logic/rivalPlayerRuns.js';

const STORE_NAME = 'rivals-player-runs';
const arg = (name, fallback = null) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};

/** The runs already banked, as { record, bundle }. */
export function readPlayerBank(root = PLAYER_BANK_ROOT) {
  const out = [];
  for (const course of RIVAL_COURSE_POOL) {
    const file = join(root, 'courses', course.courseID, 'opponents.json');
    if (!existsSync(file)) continue;
    for (const e of JSON.parse(readFileSync(file, 'utf8')).opponents || []) {
      const replay = join(root, e.replay);
      if (existsSync(replay)) out.push({ record: e.record, bundle: JSON.parse(readFileSync(replay, 'utf8')) });
    }
  }
  return out;
}

/** A downloaded pending run is exactly what the submission stored: { record, bundle }. */
export function readPending(dir) {
  const out = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!name.endsWith('.json')) continue;
      try { out.push({ file: relative(dir, p).split(sep).join('/'), ...JSON.parse(readFileSync(p, 'utf8')) }); }
      catch { out.push({ file: relative(dir, p).split(sep).join('/'), record: null, bundle: null }); }
    }
  };
  walk(dir);
  return out;
}

/**
 * The bank after adding `candidates` to `existing`: every entry re-checked,
 * each recordingID once, the newest three per player per course.
 */
export function assemblePlayerBank(existing, candidates) {
  const rejected = [], byId = new Map();
  for (const e of existing) byId.set(e.record.recordingID, e);
  for (const c of candidates) {
    const why = c.record?.driverConfig?.driver !== 'player' || c.record?.driverConfig?.source !== PLAYER_RUN_SOURCE
      ? 'not a shared player run' : playerRunErrors(c.record, c.bundle)[0];
    if (why) { rejected.push({ file: c.file, reason: why }); continue; }
    if (!byId.has(c.record.recordingID)) byId.set(c.record.recordingID, { record: c.record, bundle: c.bundle });
  }
  const [kept, dropped] = keepNewestPlayerRuns([...byId.values()]);
  return { accepted: kept, rejected, dropped: dropped.map((d) => d.record.recordingID) };
}

function treeHash(dir) {
  const h = createHash('sha256');
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p); else h.update(relative(dir, p) + '\0').update(readFileSync(p));
    }
  };
  walk(dir);
  return h.digest('hex');
}
const otherBanks = () => readdirSync('public/rivals').filter((n) => n !== 'players-v1').map((n) => [n, treeHash(join('public/rivals', n))]);

export function writePlayerBank(root, entries) {
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  mkdirSync(join(root, 'replays'), { recursive: true });
  const manifest = { schemaVersion: 1, bank: PLAYER_BANK_ID, rulesVersion: RIVAL_RULES_VERSION, generatedAt: new Date().toISOString(),
    note: 'Real players’ shared Block Rivals races. Not in any matchmaking pool until the bank is large enough.', total: entries.length, courses: [] };
  for (const course of RIVAL_COURSE_POOL) {
    const mine = entries.filter((e) => e.record.courseID === course.courseID).sort((a, b) => (a.record.recordingID < b.record.recordingID ? -1 : 1));
    if (!mine.length) continue;
    const opponents = mine.map(({ record, bundle }) => {
      const path = 'replays/' + record.recordingID + '.json';
      writeFileSync(join(root, path), JSON.stringify(bundle));
      return { record, replay: path };
    });
    mkdirSync(join(root, 'courses', course.courseID), { recursive: true });
    writeFileSync(join(root, 'courses', course.courseID, 'opponents.json'), JSON.stringify({
      schemaVersion: 1, bank: PLAYER_BANK_ID, rulesVersion: RIVAL_RULES_VERSION,
      courseID: course.courseID, courseSlot: course.slot, name: course.name, opponents }));
    manifest.courses.push({ slot: course.slot, name: course.name, courseID: course.courseID, opponents: opponents.length,
      players: new Set(opponents.map((o) => o.record.opponent.id)).size, recordingIDs: opponents.map((o) => o.record.recordingID) });
  }
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest, null, 1));
  return manifest;
}

export function playerBankReport(entries) {
  const perCourse = RIVAL_COURSE_POOL.map((c) => {
    const mine = entries.filter((e) => e.record.courseID === c.courseID);
    return { slot: c.slot, course: c.name, runs: mine.length, players: new Set(mine.map((e) => e.record.opponent.id)).size };
  });
  return { total: entries.length, rotationAt: PLAYER_BANK_ROTATION_MIN, ready: entries.length >= PLAYER_BANK_ROTATION_MIN,
    players: new Set(entries.map((e) => e.record.opponent.id)).size, perCourse };
}

async function pull(dir) {
  const siteID = process.env.NETLIFY_SITE_ID, token = process.env.NETLIFY_AUTH_TOKEN;
  if (!siteID || !token) { console.error('set NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN to pull pending runs'); process.exit(2); }
  const { getStore } = await import('@netlify/blobs');
  const store = getStore({ name: STORE_NAME, siteID, token });
  const { blobs } = await store.list({ prefix: 'pending/' });
  let n = 0;
  for (const b of blobs) {
    const value = await store.get(b.key);
    if (!value) continue;
    const file = join(dir, b.key.replace(/^pending\//, '').split('/').join(sep));
    mkdirSync(resolve(file, '..'), { recursive: true });
    writeFileSync(file.endsWith('.json') ? file : file + '.json', value);
    n++;
  }
  console.log(`pulled ${n} pending run(s) into ${dir}`);
}

async function main() {
  const root = arg('root', PLAYER_BANK_ROOT);
  if (!resolve(root).split(sep).join('/').endsWith('/public/rivals/players-v1') && root !== PLAYER_BANK_ROOT) {
    console.error('refusing --root ' + root + ': the player bank lives at ' + PLAYER_BANK_ROOT); process.exit(2);
  }
  if (arg('pull')) return pull(arg('pull'));
  const banked = readPlayerBank(root);
  if (arg('report')) { console.log(JSON.stringify(playerBankReport(banked), null, 1)); return; }
  const IN = arg('in');
  if (!IN) { console.error('pass --pull <dir>, --in <dir> [--dry] or --report'); process.exit(2); }
  const { accepted, rejected, dropped } = assemblePlayerBank(banked, readPending(IN));
  const report = { bank: PLAYER_BANK_ID, dry: !!arg('dry'), existing: banked.length, accepted: accepted.length, rejected: rejected.length, dropped, ...playerBankReport(accepted) };
  if (!arg('dry')) {
    const before = otherBanks();
    writePlayerBank(root, accepted);
    report.otherBanksUnchanged = JSON.stringify(before) === JSON.stringify(otherBanks());
    if (!report.otherBanksUnchanged) { console.error('another bank changed during a player bank write; this must never happen'); process.exit(1); }
  }
  console.log(JSON.stringify(report, null, 1));
  if (rejected.length) console.log('rejected:', JSON.stringify(rejected, null, 1));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
