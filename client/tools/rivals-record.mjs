#!/usr/bin/env node
// Record real Block Rivals races with the in-game BotDriver harness.
//
//   node tools/rivals-record.mjs --slot 1 --style rookie --runs 3
//   node tools/rivals-record.mjs --plan tools/rivals-plan.json --parallel 3
//   node tools/rivals-record.mjs --plan tools/rivals-plan.json --parallel 3 --resume
//
// WHY A TOOL AND NOT A SCRIPT ON SOMEONE'S MACHINE
// The bank is only trustworthy if anyone can reproduce it. This drives the
// same `?rivalsRecord=1` page a human would open, exports exactly what the
// game exported, and never edits a time, a frame or a hash.
//
// RENDERER, DELIBERATELY
// Chromium's Canvas renderer (--disable-gpu). WebGL through swiftshader ran
// at 9-18fps in this container and changed what the bot could do; Canvas
// holds ~60fps. The measured fps is written into every output file, so a
// slow batch is visible afterwards instead of silently producing bad races.
//
// Requires: a served build or dev server (`npm run dev`, default :5173) and
// playwright-core plus a Chromium binary. Install with:
//   npm i -D playwright-core           (browser: PLAYWRIGHT_BROWSERS_PATH)
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CHROMIUM_CANDIDATES = [
  process.env.PLUGRUN_CHROMIUM,
  process.env.PLAYWRIGHT_BROWSERS_PATH && join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium-1194/chrome-linux/chrome'),
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'
].filter(Boolean);

function arg(name, fallback = null) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

const OPTIONS = {
  url: arg('url', 'http://127.0.0.1:5173'),
  out: arg('out', 'tools/recordings'),
  width: Number(arg('width', 390)),
  height: Number(arg('height', 844)),
  hardLimitMs: Number(arg('hardLimitMs', 12 * 60_000)),
  parallel: Math.max(1, Number(arg('parallel', 1))),
  indexBase: Number(arg('opponentIndex', 1))
};

async function chromium() {
  let pw;
  try { pw = await import('playwright-core'); }
  catch {
    console.error('playwright-core is not installed. Run: npm i -D playwright-core');
    process.exit(2);
  }
  const executablePath = CHROMIUM_CANDIDATES.find(p => existsSync(p));
  if (!executablePath) {
    console.error('No Chromium found. Set PLUGRUN_CHROMIUM to a Chromium binary.\nTried:\n  ' + CHROMIUM_CANDIDATES.join('\n  '));
    process.exit(2);
  }
  return { pw: pw.chromium, executablePath };
}

/** One job = one course slot, one style, one ordered power mix, N races. */
export async function recordJob(job, shared) {
  const { pw, executablePath } = shared;
  const browser = await pw.launch({
    executablePath, headless: true,
    // Canvas, not swiftshader WebGL. See the note at the top of this file.
    args: ['--no-sandbox', '--disable-gpu', '--disable-software-rasterizer', '--mute-audio',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows']
  });
  const page = await browser.newPage({ viewport: { width: OPTIONS.width, height: OPTIONS.height } });
  const started = Date.now();
  const tag = `slot${job.slot}-${job.style}-${job.powers.replace(/,/g, '')}`;
  const log = m => console.log(`${((Date.now() - started) / 1000).toFixed(0).padStart(5)}s [${tag}] ${m}`);
  const problems = [];
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('console', m => { if (/\[RIVALS-REC\]/.test(m.text())) log(m.text().replace('[RIVALS-REC] ', '')); });

  const query = new URLSearchParams({
    rivalsRecord: '1', courseSlot: String(job.slot), skillPreset: job.style,
    powers: job.powers, runs: String(job.runs),
    hardLimitMs: String(job.hardLimitMs ?? OPTIONS.hardLimitMs),
    opponentIndex: String(job.indexBase ?? OPTIONS.indexBase)
  });
  await page.goto(`${OPTIONS.url}/?${query}`, { waitUntil: 'load' });

  // Sample the live frame rate: a slow renderer changes what the bot can do,
  // so it belongs in the output next to the races it produced.
  const fps = [];
  const deadline = Date.now() + job.runs * (job.hardLimitMs ?? OPTIONS.hardLimitMs) + 180_000;
  let done = false, renderer = null;
  while (Date.now() < deadline) {
    await page.waitForTimeout(5000);
    const probe = await page.evaluate(() => {
      const s = window.__plugRunLiveScene;
      return {
        done: !!window.__plugRunRivals?.done,
        races: window.__plugRunRivals?.races?.length ?? -1,
        fps: s ? Math.round(s.game.loop.actualFps) : null,
        renderer: s ? (s.renderer?.type === 2 ? 'WEBGL' : 'CANVAS') : null
      };
    }).catch(() => null);
    if (!probe) { problems.push('page went away'); break; }
    if (probe.fps) fps.push(probe.fps);
    if (probe.renderer) renderer = probe.renderer;
    if (probe.done) { done = true; break; }
  }
  const store = await page.evaluate(() =>
    window.__plugRunRivals ? JSON.parse(JSON.stringify(window.__plugRunRivals)) : null).catch(() => null);
  await browser.close();

  if (!store) { log('no recorder output'); return { job, ok: 0, races: [] }; }
  const median = fps.length ? fps.slice().sort((a, b) => a - b)[fps.length >> 1] : null;
  const payload = {
    tool: 'rivals-record/1', recordedAt: new Date().toISOString(),
    job, done, problems,
    environment: { url: OPTIONS.url, viewport: { width: OPTIONS.width, height: OPTIONS.height }, renderer, fpsMedian: median, fpsSamples: fps.length },
    config: store.config, course: store.course, races: store.races
  };
  mkdirSync(OPTIONS.out, { recursive: true });
  const file = join(OPTIONS.out, `${tag}-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(payload));
  const ok = store.races.filter(r => r.ok).length;
  log(`saved ${file}: ${ok}/${store.races.length} valid, renderer ${renderer}, fps ~${median}`);
  for (const r of store.races) {
    log(`  ${r.ok ? 'OK ' : 'REJ'} ${r.result} ${r.houses}/7 ${Math.round((r.elapsedMs || 0) / 1000)}s retries=${r.retries}${r.reason ? ' ' + r.reason : ''}`);
  }
  return { job, ok, races: store.races, fps: median, renderer };
}

async function main() {
  const shared = await chromium();
  const plan = arg('plan');
  let jobs = plan
    ? JSON.parse(readFileSync(plan, 'utf8'))
    : [{ slot: Number(arg('slot', 1)), style: arg('style', arg('skillPreset', 'street')),
         powers: arg('powers', 'phase,dash'), runs: Number(arg('runs', 3)) }];
  // --resume: skip jobs whose output already exists, so a batch interrupted
  // after hours can be picked up without re-running what it already recorded.
  // Output files are named <slot>-<style>-<powers>-<timestamp>.json, so a job
  // counts as done when any file carries its tag. Recording the same job twice
  // is harmless (more races is more coverage) — this only saves the time.
  const jobTag = j => `slot${j.slot}-${j.style}-${String(j.powers).replace(/,/g, '')}`;
  const all = jobs.slice();
  if (arg('resume', false)) {
    const done = new Set();
    if (existsSync(OPTIONS.out)) {
      for (const name of readdirSync(OPTIONS.out)) {
        const m = name.match(/^(.*)-\d+\.json$/);
        if (m) done.add(m[1]);
      }
    }
    jobs = jobs.filter(j => !done.has(jobTag(j)));
    console.log(`resume: ${all.length - jobs.length} job(s) already recorded, ${jobs.length} left`);
  }
  console.log(`${jobs.length} job(s), ${OPTIONS.parallel} at a time, ${OPTIONS.width}x${OPTIONS.height}, out ${OPTIONS.out}`);
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      try { results.push(await recordJob(job, shared)); }
      catch (error) { console.error('job failed', JSON.stringify(job), error.message); results.push({ job, ok: 0, races: [], error: error.message }); }
    }
  };
  await Promise.all(Array.from({ length: OPTIONS.parallel }, worker));
  const valid = results.reduce((n, r) => n + r.ok, 0);
  const attempted = results.reduce((n, r) => n + (r.races?.length ?? 0), 0);
  console.log(`\ndone: ${valid} valid of ${attempted} attempted across ${results.length} jobs`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
