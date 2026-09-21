#!/usr/bin/env node
// Render a banked Rivals run to video through the game's own replay player.
//
//   node tools/rivals-replay-video.mjs --bank jev-v1 --ids rec-a,rec-b \
//     --url http://127.0.0.1:4173 --out tools/recordings/jev/preview
//
// This is what a player sees behind WATCH RIVAL: the recorded race replayed
// by RivalReplayPlayer — real character sprites, the course regenerated from
// its seed, the recorded pickups, bunks, shots and deaths — at real speed,
// captured as H.264 MP4 with hardware WebGL. Useful when a run's original
// footage is missing or was recorded with the Canvas renderer.
//
// It reads the bank from disk (public/rivals/<bank>/) to know each run's
// course, then drives a served build: start a Rivals race on that course,
// hand it the banked record and replay, and press WATCH. Nothing is written
// anywhere except the output videos, which live under the git-ignored
// tools/recordings.
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from './lib/browsers.mjs';
import { installVideo, probeMp4 } from './lib/video.mjs';
import { RIVAL_COURSE_POOL } from '../src/logic/rivals.js';

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};

export function bankEntries(bank) {
  const root = join('public/rivals', bank);
  const out = [];
  for (const course of RIVAL_COURSE_POOL) {
    const file = join(root, 'courses', course.courseID, 'opponents.json');
    if (!existsSync(file)) continue;
    for (const e of JSON.parse(readFileSync(file, 'utf8')).opponents) out.push({ course, entry: e });
  }
  return out;
}

async function renderOne(pw, executablePath, url, bank, { course, entry }, outDir) {
  const b = await pw.launch({ executablePath, headless: true,
    args: ['--no-sandbox', '--mute-audio', '--enable-gpu', '--ignore-gpu-blocklist',
      ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []),
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const page = await b.newPage({ viewport: { width: 390, height: 844 } });
  const id = entry.record.recordingID;
  const video = await installVideo(page, { dir: outDir, tag: 'replay-' + id, manual: true });
  // The bot harness exposes the live scene; its modal auto-clicker is pushed
  // out so it never presses anything while the replay plays.
  await page.goto(url + '/?bot=1&aiLevel=5&autoStart=1&modalDelayMs=3600000', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__plugRunLiveScene, null, { timeout: 30000 });
  await page.evaluate((seed) => window.__plugRunLiveScene.scene.start('RUNNER', { mode: 'pve', role: 'runner', runKind: 'rivals', rivalSeed: seed }), course.seed);
  await page.waitForFunction((cid) => window.__plugRunLiveScene?.rivals?.race?.course?.id === cid, course.courseID, { timeout: 30000 });
  await page.waitForTimeout(1200);
  const started = await page.evaluate(({ record, replayURL }) => {
    const c = window.__plugRunLiveScene.rivals;
    c.cityIntro?.destroy?.(); c.cityIntro = null;
    c.entryModal?.destroy?.();
    c.race.opponentRecord = record;
    c.race.opponent = { recordingID: record.recordingID, kind: record.opponent.kind, displayName: 'Jev',
      replayURL, orderedPowers: record.orderedPowers.slice() };
    window.__plugRunVideoBegin();
    c.watchRival(null);
    return true;
  }, { record: entry.record, replayURL: '/rivals/' + bank + '/' + entry.replay });
  if (!started) throw new Error('could not start the replay');
  // Wait for the player to finish (it ends itself), with a generous cap.
  const capMs = entry.record.elapsedMs + 90_000;
  const t0 = Date.now();
  await page.waitForTimeout(3000);
  await page.waitForFunction(() => window.__plugRunLiveScene?.rivals?.watching === false, null, { timeout: capMs, polling: 1000 });
  const out = await video.stop();
  await page.context().close();
  await b.close();
  if (out.ok && out.path.endsWith('.mp4')) out.container = probeMp4(out.path);
  if (out.ok) writeFileSync(out.path.replace(/\.mp4$/, '.json'), JSON.stringify({ recordingID: id, bank, course: course.name,
    slot: course.slot, kind: 'replay-render', renderedAt: new Date().toISOString(), container: out.container ?? null }, null, 1));
  console.log(`${id}: ${out.ok ? out.path : 'FAILED ' + out.reason} (${Math.round((Date.now() - t0) / 1000)}s)` +
    (out.container ? ` ${out.container.codec} ${out.container.width}x${out.container.height} ${out.container.durationS}s` : ''));
  return out;
}

async function main() {
  const bank = arg('bank', 'jev-v1');
  const url = arg('url', 'http://127.0.0.1:4173');
  const outDir = arg('out', 'tools/recordings/jev/preview');
  const ids = String(arg('ids', '')).split(',').filter(Boolean);
  mkdirSync(outDir, { recursive: true });
  const all = bankEntries(bank);
  const pick = ids.length ? all.filter((x) => ids.includes(x.entry.record.recordingID)) : all;
  if (!pick.length) { console.error('no matching recordings in ' + bank); process.exit(2); }
  const { pw, executablePath } = await chromium();
  for (const x of pick) {
    try { await renderOne(pw, executablePath, url, bank, x, outDir); }
    catch (e) { console.error(x.entry.record.recordingID + ': ' + e.message); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
