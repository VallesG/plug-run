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
import { chromium } from './lib/browsers.mjs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

const JEV = Boolean(arg('jev', false));

const OPTIONS = {
  url: arg('url', 'http://127.0.0.1:5173'),
  out: arg('out', 'tools/recordings'),
  width: Number(arg('width', 390)),
  height: Number(arg('height', 844)),
  hardLimitMs: Number(arg('hardLimitMs', 12 * 60_000)),
  // Jev races run one at a time, always. Parallel pages share one rate limit
  // and one budget, so a ceiling would trip in whichever tab got there first
  // and the others would silently finish on the pathfinder -- a batch of
  // recordings that are partly Jev and do not say which parts.
  parallel: JEV ? 1 : Math.max(1, Number(arg('parallel', 1))),
  indexBase: Number(arg('opponentIndex', 1)),
  jev: JEV,
  jevMaxRequests: Number(arg('jevMaxRequests', 2500)),
  jevMaxInputTokens: Number(arg('jevMaxInputTokens', 2_000_000))
};

// The page is given this instead of a key. It exists only so makeJevDriver
// constructs a driver; the Node side replaces the Authorization header with
// the real one before the request leaves the machine. The real key is read
// from the environment here and never enters the browser, the URL, the page,
// or any file this tool writes.
const BROWSER_SENTINEL = 'browser-sentinel-not-a-key';
const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';

/**
 * Forward the page's Jev calls from Node, with the real key.
 *
 * The page posts to a SAME-ORIGIN path (?jevProxy=1 makes makeJevDriver use
 * location.origin + /v1/systemone). Same origin means no CORS preflight, and
 * a preflight is the one request Playwright's routing does not reliably see —
 * routing api.typesafe.ai directly works until the browser decides to send an
 * OPTIONS first, and then it fails in a way that looks like the API is down.
 *
 * Returns a counter object so the tool can report what it actually relayed,
 * independently of what the page claims.
 */
async function installJevProxy(page, apiKey) {
  const relay = { requests: 0, ok: 0, failed: 0, statuses: {} };
  await page.route('**/v1/systemone', async (route) => {
    relay.requests++;
    try {
      const res = await fetch(TYPESAFE_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: route.request().postData() || '{}'
      });
      const body = await res.text();
      relay.statuses[res.status] = (relay.statuses[res.status] || 0) + 1;
      if (res.ok) relay.ok++; else relay.failed++;
      await route.fulfill({ status: res.status, contentType: 'application/json', body });
    } catch (e) {
      relay.failed++;
      relay.statuses.network = (relay.statuses.network || 0) + 1;
      // 503 rather than abort: the adapter turns a status into a countable
      // failure, where an aborted fetch is an opaque throw.
      await route.fulfill({ status: 503, contentType: 'application/json',
        body: JSON.stringify({ error: 'relay failed' }) });
    }
  });
  return relay;
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
  // openingDecoy is part of a job's IDENTITY, not a detail: an A/B pair shares
  // slot, style and powers, so without it both arms collapse to one tag and
  // --resume would skip the treatment arm as already recorded.
  const tag = `slot${job.slot}-${job.style}-${job.powers.replace(/,/g, '')}` +
    (job.openingDecoy ? '-odecoy' : '') +
    // In the filename, because a directory of raw captures is the one place
    // someone will look without opening anything.
    (OPTIONS.jev ? '-jev' : '');
  const log = m => console.log(`${((Date.now() - started) / 1000).toFixed(0).padStart(5)}s [${tag}] ${m}`);
  let openingDecoyFires = 0;
  const problems = [];
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  // [RIVALS-REC] is the harness's own narration. The opening-Decoy line is let
  // through too: it is one line per house, and without it an openingDecoy run
  // is indistinguishable from a control run until the batch is over.
  page.on('console', m => {
    const t = m.text();
    if (/\[RIVALS-REC\]/.test(t)) log(t.replace('[RIVALS-REC] ', ''));
    else if (/\[BOT\] opening decoy/.test(t)) openingDecoyFires++;
    // A ceiling being reached is the one thing that silently changes what is
    // being recorded, so it is never filtered out.
    else if (/\[JEV\]/.test(t)) log(t);
  });

  let relay = null;
  if (OPTIONS.jev) {
    relay = await installJevProxy(page, process.env.TYPESAFE_API_KEY);
    // Before any script runs, so the driver exists by the time the game boots.
    await page.addInitScript((sentinel) => {
      try { sessionStorage.setItem('jevKey', sentinel); } catch {}
    }, BROWSER_SENTINEL);
  }

  const query = new URLSearchParams({
    rivalsRecord: '1', courseSlot: String(job.slot), skillPreset: job.style,
    powers: job.powers, runs: String(job.runs),
    hardLimitMs: String(job.hardLimitMs ?? OPTIONS.hardLimitMs),
    opponentIndex: String(job.indexBase ?? OPTIONS.indexBase),
    // Opt-in driver behaviour. Recorded into driverConfig by the harness, so
    // an opening-Decoy race is identifiable in the bank forever after.
    ...(job.openingDecoy ? { openingDecoy: '1' } : {}),
    // bot=1 is what makes botConfig() read the URL at all, and its result is
    // merged LAST over the preset's knobs -- which is the only reason
    // aiLevel=0 sticks. Without aiLevel=0 the borrowed AI runs and update()
    // returns before Jev is ever consulted, so the race would look Jev-driven
    // (a driver is built, requests go out) while Jev steered nothing.
    ...(OPTIONS.jev ? {
      jev: '1', bot: '1', aiLevel: '0', jevProxy: '1',
      jevMaxRequests: String(OPTIONS.jevMaxRequests),
      jevMaxInputTokens: String(OPTIONS.jevMaxInputTokens)
    } : {})
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
  const jevReport = OPTIONS.jev
    ? await page.evaluate(() => window.__plugRunJev?.() ?? null).catch(() => null)
    : null;
  await browser.close();

  if (!store) { log('no recorder output'); return { job, ok: 0, races: [] }; }
  const median = fps.length ? fps.slice().sort((a, b) => a - b)[fps.length >> 1] : null;
  const payload = {
    tool: 'rivals-record/1', recordedAt: new Date().toISOString(),
    job, done, problems,
    environment: { url: OPTIONS.url, viewport: { width: OPTIONS.width, height: OPTIONS.height }, renderer, fpsMedian: median, fpsSamples: fps.length },
    config: store.config, course: store.course, races: store.races,
    // Two independent accounts of the same traffic: `relay` is what Node
    // actually sent, `report` is what the page believes happened. They should
    // agree, and a disagreement is worth knowing about.
    jev: OPTIONS.jev ? {
      driver: 'jev', route: 'typesafe-direct',
      ceilings: { maxRequests: OPTIONS.jevMaxRequests, maxInputTokens: OPTIONS.jevMaxInputTokens },
      relay, report: jevReport
    } : null
  };
  mkdirSync(OPTIONS.out, { recursive: true });
  const file = join(OPTIONS.out, `${tag}-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(payload));
  const ok = store.races.filter(r => r.ok).length;
  log(`saved ${file}: ${ok}/${store.races.length} valid, renderer ${renderer}, fps ~${median}`);
  for (const r of store.races) {
    log(`  ${r.ok ? 'OK ' : 'REJ'} ${r.result} ${r.houses}/7 ${Math.round((r.elapsedMs || 0) / 1000)}s retries=${r.retries}${r.reason ? ' ' + r.reason : ''}`);
  }
  if (job.openingDecoy) log(`opening decoy fired ${openingDecoyFires} time(s)`);
  if (OPTIONS.jev) {
    const r = jevReport || {};
    log(`jev: ${r.requests ?? 0} req, ${r.answers ?? 0} answers ` +
      `(${Math.round((r.answerRate ?? 0) * 100)}%), steered ${Math.round((r.steerShare ?? 0) * 100)}% ` +
      `of ${r.decisions ?? 0} decisions, ${r.failureRate ? Math.round(r.failureRate * 100) + '% failures, ' : ''}` +
      `${r.tokensBilled ?? 0} billed tokens (${r.tokenSource ?? '?'}) = $${(r.costUsd ?? 0).toFixed(4)}` +
      (r.budgetStopped ? `  [STOPPED ON ${r.budgetStopped.toUpperCase()} CEILING]` : '') +
      `, model ${r.model || '?'}`);
    log(`jev relay: ${relay.requests} forwarded, ${relay.ok} ok, ${relay.failed} failed` +
      `, statuses ${JSON.stringify(relay.statuses)}`);
    if (!r.requests) log('jev: NO REQUESTS WERE MADE — this is not a Jev recording.');
    else if (!r.steerShare) log('jev: steerShare is 0 — Jev drove nothing. Check aiLevel=0.');
  }
  return { job, ok, races: store.races, fps: median, renderer, openingDecoyFires, jev: jevReport, relay };
}

async function main() {
  if (OPTIONS.jev) {
    // Existence only. Never printed, never length-checked into a log, never
    // written anywhere.
    if (!process.env.TYPESAFE_API_KEY) {
      console.error('--jev needs TYPESAFE_API_KEY in this shell.\n' +
        '  PowerShell:  $env:TYPESAFE_API_KEY = Read-Host -Prompt "key"\n' +
        '  bash/zsh:    read -rs TYPESAFE_API_KEY && export TYPESAFE_API_KEY\n' +
        'Both read it as input, so it does not land in shell history.');
      process.exit(2);
    }
    console.log(`jev: ON — sequential, ceilings ${OPTIONS.jevMaxRequests} requests / ` +
      `${OPTIONS.jevMaxInputTokens.toLocaleString('en-US')} input tokens ` +
      `(~$${(OPTIONS.jevMaxInputTokens / 1e6 * 0.042).toFixed(2)} worst case). ` +
      'The key stays in Node; the page gets a sentinel.');
  }
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
  const jobTag = j => `slot${j.slot}-${j.style}-${String(j.powers).replace(/,/g, '')}` +
    (j.openingDecoy ? '-odecoy' : '') + (OPTIONS.jev ? '-jev' : '');
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
