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
// --renderer gpu (default on Windows and macOS): hardware WebGL, what players
// actually see. --renderer canvas (default on Linux): Chromium's Canvas
// renderer (--disable-gpu), for GPU-less containers, where WebGL through
// swiftshader ran at 9-18fps and changed what the bot could do.
// Canvas cannot tint, so characters there render as bare coloured blobs —
// fine for the data (records and replays store positions, and the game draws
// them with the player's own renderer), wrong for a video anyone watches.
// The renderer and measured fps are written into every output file, so a
// slow or mis-rendered batch is visible afterwards.
//
// Requires: a served build or dev server (`npm run dev`, default :5173) and
// playwright-core plus a Chromium binary. Install with:
//   npm i -D playwright-core           (browser: PLAYWRIGHT_BROWSERS_PATH)
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from './lib/browsers.mjs';
import { installVideo, probeMp4 } from './lib/video.mjs';
import { mockAnswer } from './lib/jevMock.mjs';
import { jevHealth } from './lib/jevHealth.mjs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

// --jev: Jev as the STRATEGIST above the preset's runner AI, paid, through
// the Node relay below. --jevMock: the same page and code path answered by a
// deterministic local script (tools/lib/jevMock.mjs) — free, offline, and
// marked as a mock in every file it produces.
//
// Jev's motor defaults to the Ace preset (level 5 with the exposure-aware
// routing and dodge range on). Over Street, which routes by length alone,
// the first Jev bank died within 3 cells of a plug in 101 of 118 deaths.
// --style still overrides it.
const JEV_MOCK = Boolean(arg('jevMock', false));
const JEV = Boolean(arg('jev', false)) || JEV_MOCK;

const OPTIONS = {
  url: arg('url', 'http://127.0.0.1:5173'),
  out: arg('out', 'tools/recordings'),
  width: Number(arg('width', 390)),
  height: Number(arg('height', 844)),
  hardLimitMs: Number(arg('hardLimitMs', 12 * 60_000)),
  // Jev races run one at a time, always. Parallel pages share one rate limit
  // and one budget, so a ceiling would trip in whichever tab got there first
  // and the others would silently finish on the fallback objective -- a batch
  // of recordings that are partly Jev and do not say which parts.
  parallel: JEV ? 1 : Math.max(1, Number(arg('parallel', 1))),
  indexBase: Number(arg('opponentIndex', 1)),
  jev: JEV,
  jevMock: JEV_MOCK,
  // Logical strategic requests, not HTTP attempts. A seven-house race should
  // need tens of these; see JevStrategist for what triggers one.
  jevMaxRequests: Number(arg('jevMaxRequests', 100)),
  jevMaxInputTokens: Number(arg('jevMaxInputTokens', 500_000)),
  // Real multi-question strategy calls are allowed time to finish. This is
  // passed explicitly into the page so a recording states its decision SLA.
  jevTimeoutMs: Number(arg('jevTimeoutMs', 15_000)),
  // apex preserves the unrestricted driver; rival-hard adds human opening latency.
  // `rival` remains an alias so the first completed Hard batch keeps working.
  jevProfile: arg('jevProfile', 'apex') === 'normal' ? 'normal'
    : ['rival', 'rival-hard'].includes(arg('jevProfile', 'apex')) ? 'rival-hard' : 'apex',
  jevProfileAsked: arg('jevProfile', 'apex'),
  // --video: an MP4 of each job, start to finish, with a diagnostic strip
  // under the gameplay. See tools/lib/video.mjs. Lands under tools/recordings,
  // which is git-ignored — keep --videoDir there.
  video: Boolean(arg('video', false)),
  videoDir: arg('videoDir', 'tools/recordings/jev/video'),
  // The diagnostic strip under the board is off unless asked for: a clean
  // video is the board alone. The same telemetry is always in .events.json.
  videoStats: Boolean(arg('videoStats', false)),
  // Open a real visible Chrome window so the attempt can be watched live.
  // Video capture remains the same clean board-only file unless --videoStats.
  headed: Boolean(arg('headed', false)),
  renderer: String(arg('renderer', process.platform === 'linux' ? 'canvas' : 'gpu'))
};

// The page is given this instead of a key. It exists only so
// makeJevStrategist constructs a strategist; the Node side replaces the Authorization header with
// the real one before the request leaves the machine. The real key is read
// from the environment here and never enters the browser, the URL, the page,
// or any file this tool writes.
const BROWSER_SENTINEL = 'browser-sentinel-not-a-key';
const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
// Every entry is a high-level decision. Movement/direction questions stay
// forbidden here so stale code cannot turn Jev back into the motor. Keep this
// list in sync with makeJevPayload; route is the path style, not a raw move.
export const JEV_STRATEGIC_QUESTIONS = Object.freeze([
  'objective', 'posture', 'route', 'power'
]);

/**
 * Forward the page's Jev calls from Node, with the real key.
 *
 * The page posts to a SAME-ORIGIN path (?jevProxy=1 makes makeJevStrategist use
 * location.origin + /v1/systemone). Same origin means no CORS preflight, and
 * a preflight is the one request Playwright's routing does not reliably see —
 * routing api.typesafe.ai directly works until the browser decides to send an
 * OPTIONS first, and then it fails in a way that looks like the API is down.
 *
 * Returns a counter object so the tool can report what it actually relayed,
 * independently of what the page claims.
 */
export async function installJevProxy(page, apiKey, { mock = false, fetchImpl = fetch } = {}) {
  const relay = { requests: 0, ok: 0, failed: 0, statuses: {}, blocked: 0, mock, directBlocked: 0,
    endpoint: TYPESAFE_URL, lastAnswerAt: null, inputTokens: 0, receipts: [] };
  // Belt and braces: the page has no reason to reach TypeSafe directly (it
  // posts same-origin), so anything that tries is stopped and counted. In a
  // mock run this is what proves nothing left the machine.
  await page.route('https://api.typesafe.ai/**', (route) => { relay.directBlocked++; return route.abort(); });
  await page.route('**/v1/systemone', async (route) => {
    relay.requests++;
    // Only strategic questions are ever paid for. A body asking anything
    // else — a movement question from stale code, say — is refused here,
    // before it can be forwarded or billed.
    let parsed = null;
    try { parsed = JSON.parse(route.request().postData() || '{}'); } catch {}
    const asked = Object.keys(parsed?.questions || {});
    if (!asked.length || asked.some((q) => !JEV_STRATEGIC_QUESTIONS.includes(q))) {
      relay.blocked++;
      relay.statuses.blocked = (relay.statuses.blocked || 0) + 1;
      return route.fulfill({ status: 422, contentType: 'application/json',
        body: JSON.stringify({ error: 'non-strategic question refused by the recorder' }) });
    }
    if (mock) {
      relay.ok++;
      relay.statuses.mock = (relay.statuses.mock || 0) + 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAnswer(parsed)) });
    }
    try {
      const res = await fetchImpl(TYPESAFE_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: route.request().postData() || '{}',
        signal: AbortSignal.timeout(OPTIONS.jevTimeoutMs)
      });
      const body = await res.text();
      relay.statuses[res.status] = (relay.statuses[res.status] || 0) + 1;
      if (res.ok) relay.ok++; else relay.failed++;
      if (res.ok) {
        let answer;
        try { answer = JSON.parse(body); } catch {}
        const out = answer?.result || answer;
        const tokens = out?.usage?.input_tokens;
        if (out?.answers && typeof out.answers === 'object') {
          relay.lastAnswerAt = Date.now();
          if (Number.isFinite(tokens)) relay.inputTokens += tokens;
          relay.receipts.push({ at: new Date().toISOString(), status: res.status,
            model: typeof out.model === 'string' ? out.model : null,
            inputTokens: Number.isFinite(tokens) ? tokens : null,
            requestId: res.headers.get('x-request-id') || res.headers.get('request-id') || null });
        }
      }
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
    executablePath, headless: !OPTIONS.headed,
    // See RENDERER at the top of this file.
    args: ['--no-sandbox', '--mute-audio',
      ...(OPTIONS.renderer === 'canvas'
        ? ['--disable-gpu', '--disable-software-rasterizer']
        : ['--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : [])]),
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
    // A variant-plan job (planned stash seeds) shares its course and loadout
    // with other jobs; its index block tells them apart.
    (Array.isArray(job.stashSeeds) && job.stashSeeds.length ? '-i' + job.indexBase : '') +
    // In the filename, because a directory of raw captures is the one place
    // someone will look without opening anything.
    (OPTIONS.jev ? (OPTIONS.jevMock ? '-jevmock' : '-jev') : '');
  const log = m => console.log(`${((Date.now() - started) / 1000).toFixed(0).padStart(5)}s [${tag}] ${m}`);
  let openingDecoyFires = 0;
  // Deduplicated: headless Chrome has no audio output, and every sound the
  // game loads fails with "Unable to decode audio data" — hundreds of copies
  // of one line that would bury anything else. First occurrence kept, with
  // when it first happened and how many times. Audio failing never fails a run.
  const problemCounts = new Map();
  const problem = (msg) => {
    const seen = problemCounts.get(msg);
    if (seen) seen.count++;
    else problemCounts.set(msg, { message: msg, count: 1, firstAtS: Math.round((Date.now() - started) / 1000) });
  };
  page.on('pageerror', e => problem('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') problem('console: ' + m.text().slice(0, 300)); });
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
    relay = await installJevProxy(page, OPTIONS.jevMock ? null : process.env.TYPESAFE_API_KEY,
      { mock: OPTIONS.jevMock });
    // Before any script runs, so the driver exists by the time the game boots.
    await page.addInitScript((sentinel) => {
      try { sessionStorage.setItem('jevKey', sentinel); } catch {}
    }, BROWSER_SENTINEL);
  }

  // Armed before goto so the file starts at boot and the countdown is in it.
  const video = OPTIONS.video ? await installVideo(page, { dir: OPTIONS.videoDir, tag, stats: OPTIONS.videoStats }) : null;

  const query = new URLSearchParams({
    rivalsRecord: '1', courseSlot: String(job.slot), skillPreset: job.style,
    powers: job.powers, runs: String(job.runs),
    hardLimitMs: String(job.hardLimitMs ?? OPTIONS.hardLimitMs),
    opponentIndex: String(job.indexBase ?? OPTIONS.indexBase),
    // Opt-in driver behaviour. Recorded into driverConfig by the harness, so
    // an opening-Decoy race is identifiable in the bank forever after.
    ...(job.openingDecoy ? { openingDecoy: '1' } : {}),
    // One planned stash seed per race (tools/rivals-variant-plan.mjs), so a
    // batch covers every seven-house answer pattern instead of a random draw.
    ...(Array.isArray(job.stashSeeds) && job.stashSeeds.length ? { stashSeeds: job.stashSeeds.join(',') } : {}),
    // No bot=1 and no aiLevel: the preset's own knobs stand, so the capable
    // runner AI is the motor and Jev sits above it as the strategist. (The
    // old aiLevel=0 override switched that AI off; the strategist now refuses
    // to attach without it.)
    ...(OPTIONS.jev ? {
      jev: '1', jevProxy: '1',
      ...(OPTIONS.jevMock ? { jevMock: '1' } : {}),
      jevMaxRequests: String(OPTIONS.jevMaxRequests),
      jevMaxInputTokens: String(OPTIONS.jevMaxInputTokens),
      jevTimeoutMs: String(OPTIONS.jevTimeoutMs),
      jevProfile: OPTIONS.jevProfile
    } : {})
  });
  await page.goto(`${OPTIONS.url}/?${query}`, { waitUntil: 'load' });

  // Sample the live frame rate: a slow renderer changes what the bot can do,
  // so it belongs in the output next to the races it produced.
  const fps = [];
  const deadline = Date.now() + job.runs * (job.hardLimitMs ?? OPTIONS.hardLimitMs) + 180_000;
  let done = false, renderer = null, lastStore = null, lastReport = null, aborted = null;
  while (Date.now() < deadline) {
    try { await page.waitForTimeout(5000); }
    catch { aborted = 'browser closed'; break; }
    const probe = await page.evaluate(() => {
      const s = window.__plugRunLiveScene;
      return {
        done: !!window.__plugRunRivals?.done,
        races: window.__plugRunRivals?.races?.length ?? -1,
        fps: s ? Math.round(s.game.loop.actualFps) : null,
        renderer: s ? (s.renderer?.type === 2 ? 'WEBGL' : 'CANVAS') : null,
        report: window.__plugRunJevStrategist?.report?.() ?? null,
        capture: window.__plugRunRivals ? JSON.parse(JSON.stringify(window.__plugRunRivals)) : null
      };
    }).catch(() => null);
    if (!probe) { aborted = 'page went away'; problem(aborted); break; }
    lastStore = probe.capture || lastStore;
    lastReport = probe.report || lastReport;
    if (OPTIONS.jev) {
      const health = jevHealth(relay, lastReport, Date.now(), started);
      log(`[JEV LIVE] ${health.label}; adopted=${lastReport?.strategies?.adopted ?? 0}; fallback=${Math.round((lastReport?.time?.fallbackShare ?? 0)*100)}%`);
      await page.evaluate(label => { document.title = label; }, health.label).catch(() => {});
      mkdirSync(OPTIONS.out, { recursive: true });
      writeFileSync(join(OPTIONS.out, `${tag}-${started}.live.json`), JSON.stringify({
        diagnosticOnly: true, bankable: false, recordedAt: new Date().toISOString(), health,
        relay, report: lastReport, capture: lastStore
      }));
      if (health.fatal) { aborted = health.fatal; break; }
    }
    if (probe.fps) fps.push(probe.fps);
    if (probe.renderer) renderer = probe.renderer;
    if (probe.done) { done = true; break; }
  }
  const store = await page.evaluate(() =>
    window.__plugRunRivals ? JSON.parse(JSON.stringify(window.__plugRunRivals)) : null).catch(() => null) || lastStore || { races: [] };
  const jevReport = OPTIONS.jev
    ? await page.evaluate(() => window.__plugRunJev?.() ?? null).catch(() => null) || lastReport
    : null;
  let videoOut = null;
  if (video) {
    // A few seconds of the result screen, then finalize BEFORE closing: an
    // unstopped MediaRecorder leaves a truncated file behind.
    if (done) await page.waitForTimeout(3000);
    videoOut = await video.stop().catch(() => ({ok:false,reason:'browser closed before video finalization'}));
    videoOut.events = video.events;
    if (videoOut.ok && videoOut.path.endsWith('.mp4')) {
      try { videoOut.container = probeMp4(videoOut.path); } catch (e) { videoOut.container = { error: e.message }; }
    }
    if (videoOut.ok) {
      writeFileSync(videoOut.path.replace(/\.(mp4|webm)$/, '.events.json'), JSON.stringify(videoOut, null, 1));
      log(`video ${videoOut.path}: ${(videoOut.bytes / 1e6).toFixed(1)} MB, ${videoOut.mime}, ` +
        `${Math.round((videoOut.durationMs || 0) / 1000)}s, ~${videoOut.compositeFps} fps composited` +
        (videoOut.container?.codec ? `; file: ${videoOut.container.codec} ${videoOut.container.width}x${videoOut.container.height}, ` +
          `${videoOut.container.durationS}s, ${videoOut.container.frames} frames, ${videoOut.container.fps} fps` : ''));
    } else log(`video FAILED: ${videoOut.reason}`);
  }
  await page.context().close().catch(() => {});
  await browser.close().catch(() => {});
  if (aborted) { problem('ABORTED: ' + aborted); log(`ABORTED: ${aborted}. This is not a completed Jev recording.`); }
  const problems = [...problemCounts.values()];
  for (const p of problems) log(`problem x${p.count} (first at ${p.firstAtS}s): ${p.message.slice(0, 160)}`);

  if (!store) { log('no recorder output'); return { job, ok: 0, races: [] }; }
  const median = fps.length ? fps.slice().sort((a, b) => a - b)[fps.length >> 1] : null;
  const payload = {
    tool: 'rivals-record/1', recordedAt: new Date().toISOString(),
    job, done, aborted, problems,
    environment: { url: OPTIONS.url, viewport: { width: OPTIONS.width, height: OPTIONS.height }, renderer, fpsMedian: median, fpsSamples: fps.length },
    config: store.config, course: store.course, races: store.races,
    video: videoOut ? { path: videoOut.path ?? null, mime: videoOut.mime ?? null, bytes: videoOut.bytes ?? null,
      durationMs: videoOut.durationMs ?? null, compositeFps: videoOut.compositeFps ?? null,
      container: videoOut.container ?? null } : null,
    // Two independent accounts of the same traffic: `relay` is what Node
    // actually sent, `report` is what the page believes happened. They should
    // agree, and a disagreement is worth knowing about.
    jev: OPTIONS.jev ? {
      driver: 'jev-strategist', motor: 'runner-ai',
      route: OPTIONS.jevMock ? 'mock' : 'typesafe-direct',
      ceilings: { maxRequests: OPTIONS.jevMaxRequests, maxInputTokens: OPTIONS.jevMaxInputTokens,
        timeoutMs: OPTIONS.jevTimeoutMs },
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
    const t = r.time || {}, w = r.watchdog || {}, st = r.strategies || {}, pw = r.powers || {};
    log(`jev${OPTIONS.jevMock ? ' [MOCK]' : ''}: ${r.logicalRequests ?? 0} logical requests ` +
      `(${JSON.stringify(r.triggers?.requested || {})}, ${r.triggers?.coalesced ?? 0} coalesced), ` +
      `${r.answers ?? 0} answers, ${r.invalid ?? 0} invalid, ${r.errors ?? 0} errors, ${r.timeouts ?? 0} timeouts, ` +
      `${r.obsolete ?? 0} obsolete`);
    log(`jev strategies: ${st.adopted ?? 0} adopted, rejected ${JSON.stringify(st.rejected || {})}, ` +
      `${st.objectiveHeld ?? 0} held by commitment, ${st.switches ?? 0} switches, ${st.invalidated ?? 0} invalidated; ` +
      `strategy active ${Math.round((t.strategyActiveShare ?? 0) * 100)}% of live time, ` +
      `fallback ${Math.round((t.fallbackShare ?? 0) * 100)}%, recovery ${Math.round((w.recoveryShare ?? 0) * 100)}%`);
    log(`jev watchdog: ${w.stalls ?? 0} stalls, ${w.recoveries ?? 0} recoveries (${w.recoveryMs ?? 0} ms), ` +
      `${w.watchdogRequests ?? 0} requests caused, ${w.restored ?? 0} restored / ${w.notRestored ?? 0} not`);
    log(`jev powers: ${pw.requested ?? 0} requested, ${pw.accepted ?? 0} accepted, ${pw.activated ?? 0} activated, ` +
      `rejected ${JSON.stringify(pw.rejected || {})}`);
    log(`jev motor: ${r.motor ?? '?'}, raw Jev movement actions ${r.rawMovementActions ?? '?'}, ` +
      `drive sources ${JSON.stringify(r.driveSources || {})}, stray movement answers dropped ${r.strayMovementDropped ?? 0}`);
    log(`jev cost: ${r.tokensBilled ?? 0} billed tokens (${r.tokenSource ?? '?'}) = $${(r.costUsd ?? 0).toFixed(4)}` +
      (r.budgetStopped ? `  [STOPPED ON ${r.budgetStopped.toUpperCase()} CEILING]` : '') +
      `, model ${r.model || '?'}, http ${JSON.stringify(r.http || {})}`);
    log(`jev relay: ${relay.requests} received, ${relay.ok} ok, ${relay.failed} failed, ${relay.blocked} blocked` +
      `, ${relay.directBlocked} direct-to-TypeSafe blocked, statuses ${JSON.stringify(relay.statuses)}`);
    if (!r.logicalRequests) log('jev: NO REQUESTS WERE MADE — this is not a Jev recording.');
    else if (!st.adopted) log('jev: NO STRATEGY WAS ADOPTED — Jev decided nothing.');
  }
  return { job, ok, races: store.races, fps: median, renderer, openingDecoyFires, jev: jevReport, relay };
}

async function main() {
  // An unknown profile must never silently record Apex into another bank.
  if (OPTIONS.jev && !['apex', 'rival', 'rival-hard', 'normal'].includes(OPTIONS.jevProfileAsked)) {
    console.error(`--jevProfile ${OPTIONS.jevProfileAsked}: not a built Jev profile (apex, rival-hard, normal).`);
    process.exit(2);
  }
  if (OPTIONS.jev && !OPTIONS.jevMock) {
    // Existence only. Never printed, never length-checked into a log, never
    // written anywhere.
    if (!process.env.TYPESAFE_API_KEY) {
      console.error('--jev needs TYPESAFE_API_KEY in this shell.\n' +
        '  PowerShell:  $env:TYPESAFE_API_KEY = Read-Host -Prompt "key"\n' +
        '  bash/zsh:    read -rs TYPESAFE_API_KEY && export TYPESAFE_API_KEY\n' +
        'Both read it as input, so it does not land in shell history.');
      process.exit(2);
    }
    console.log(`jev: ON — strategist above the runner AI, sequential, ceilings ${OPTIONS.jevMaxRequests} ` +
      `logical requests / ${OPTIONS.jevMaxInputTokens.toLocaleString('en-US')} input tokens ` +
      `(~$${(OPTIONS.jevMaxInputTokens / 1e6 * 0.042).toFixed(2)} worst case), ` +
      `${OPTIONS.jevTimeoutMs}ms answer timeout, ${OPTIONS.jevProfile} profile, browser ${OPTIONS.headed ? 'visible' : 'headless'}. ` +
      'The key stays in Node; the page gets a sentinel.');
  } else if (OPTIONS.jevMock) {
    console.log('jev: MOCK strategist (tools/lib/jevMock.mjs) above the runner AI — offline, nothing billed, ' +
      'direct TypeSafe traffic blocked.');
  }
  const shared = await chromium();
  const plan = arg('plan');
  let jobs = plan
    ? JSON.parse(readFileSync(plan, 'utf8'))
    : [{ slot: Number(arg('slot', 1)), style: arg('style', arg('skillPreset', JEV ? 'ace' : 'street')),
         powers: arg('powers', 'phase,dash'), runs: Number(arg('runs', 3)) }];
  // --resume: skip jobs whose output already exists, so a batch interrupted
  // after hours can be picked up without re-running what it already recorded.
  // Output files are named <slot>-<style>-<powers>-<timestamp>.json, so a job
  // counts as done when any file carries its tag. Recording the same job twice
  // is harmless (more races is more coverage) — this only saves the time.
  const jobTag = j => `slot${j.slot}-${j.style}-${String(j.powers).replace(/,/g, '')}` +
    (j.openingDecoy ? '-odecoy' : '') + (Array.isArray(j.stashSeeds) && j.stashSeeds.length ? '-i' + j.indexBase : '') +
    (OPTIONS.jev ? (OPTIONS.jevMock ? '-jevmock' : '-jev') : '');
  const all = jobs.slice();
  if (arg('resume', false)) {
    const done = new Set();
    const byTag = new Map(all.map(j => [jobTag(j), j]));
    if (existsSync(OPTIONS.out)) {
      for (const name of readdirSync(OPTIONS.out)) {
        const m = name.match(/^(.*)-\d+\.json$/);
        const job = m && byTag.get(m[1]);
        if (!job || done.has(m[1])) continue;
        try {
          const capture = JSON.parse(readFileSync(join(OPTIONS.out, name), 'utf8'));
          const races = capture.races;
          if (capture.tool === 'rivals-record/1' && capture.done === true && !capture.aborted &&
            capture.job?.slot === job.slot && capture.job?.indexBase === job.indexBase &&
            Array.isArray(races) && races.length === job.runs && races.every(r => r.ok === true) &&
            (!OPTIONS.jev || (capture.jev?.route === (OPTIONS.jevMock ? 'mock' : 'typesafe-direct') &&
              capture.jev?.report?.budgetStopped == null && capture.jev?.relay?.ok > 0))) {
            done.add(m[1]);
          }
        } catch { /* malformed capture is retried, never trusted */ }
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

// pathToFileURL, not `file://${argv[1]}`: on Windows argv[1] is `C:\...`, the
// template never matches, and the tool exits 0 having done nothing.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
