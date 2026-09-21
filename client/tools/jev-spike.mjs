#!/usr/bin/env node
// Three drivers, the same maps, one table.
//
//   TYPESAFE_API_KEY=... node tools/jev-spike.mjs --maps 8
//   TYPESAFE_API_KEY=... node tools/jev-spike.mjs --arms path,jev --round 12
//
// WHAT THIS ANSWERS
// Whether Jev's strategy is worth paying for. That question only means
// something against the drivers already in the repo, on the same maps:
//
//   ai    the game's own tuned runner AI, borrowed (the bank's driver today)
//   path  the naive pathfinder with no AI (the floor)
//   jev   the SAME runner AI at the same level, with Jev above it choosing
//         the objective, posture and powers (JevStrategist). ai vs jev is
//         therefore a clean A/B: one thing differs, and it is Jev.
//
// It reports clear rate, median clear time, and — for jev only — real spend
// from the API's own token counts. A cheaper arm that never clears is not a
// better arm, so read the three columns together.
//
// HOW THE MAPS ARE HELD IDENTICAL
// ?lockRound pins the difficulty and walks routeID forward one day at a time
// from today's, so every arm draws the same ordered map list from the game's
// own seed derivation. It is the harness's existing mechanism, not a new one.
// The list therefore depends on the date: two spikes run on different days
// compare their own arms fine and each other's not at all, which is why the
// routeIDs go into the output file.
//
// THE KEY
// Read from TYPESAFE_API_KEY (or CLOUDFLARE_API_TOKEN with --route
// cloudflare) and pushed into the page's sessionStorage before it boots. It
// is never put in the URL, never logged, and never written to the output
// file — a spike report is something you paste into a PR.
//
// Requires: a served build or dev server (`npm run dev`, default :5173) and
// playwright-core plus a Chromium binary.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from './lib/browsers.mjs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

const OPTIONS = {
  url: arg('url', 'http://127.0.0.1:5173'),
  out: arg('out', 'tools/recordings'),
  arms: String(arg('arms', 'ai,path,jev')).split(',').map(s => s.trim()).filter(Boolean),
  round: Number(arg('round', 12)),        // difficulty, held still across arms
  maps: Number(arg('maps', 8)),           // how many maps each arm plays
  aiLevel: Number(arg('aiLevel', 20)),    // skill for the runner AI in the ai AND jev arms
  route: arg('route', 'typesafe'),
  model: arg('model', null),              // pin e.g. jev-1.13.0
  // Safety ceilings, same as the recorder's. JevStrategist has finite
  // defaults of its own, so a spike is never unbounded; these make the budget
  // explicit in the output file next to the spend it produced. Logical
  // strategic requests, not HTTP attempts.
  jevMaxRequests: Number(arg('jevMaxRequests', 100)),
  jevMaxInputTokens: Number(arg('jevMaxInputTokens', 500_000)),
  width: Number(arg('width', 390)),
  height: Number(arg('height', 844)),
  headed: arg('headed', false),
  // Generous: maxRunMs alone is 180s per round, and a map can be retried.
  armTimeoutMs: Number(arg('armTimeoutMs', 25 * 60_000))
};

// Each arm is the SAME harness with one thing changed. Keeping them one
// object makes that visible; a spike whose arms differ in two ways at once
// measures nothing.
const ARMS = {
  ai:   { label: 'borrowed AI', params: (o) => ({ aiLevel: o.aiLevel }) },
  path: { label: 'pathfinder',  params: () => ({ aiLevel: 0 }) },
  // Never aiLevel 0: the strategist directs the runner AI and refuses to
  // attach without it.
  jev:  { label: 'Jev strategist', params: (o) => ({ aiLevel: o.aiLevel, jev: 1,
            jevMaxRequests: o.jevMaxRequests, jevMaxInputTokens: o.jevMaxInputTokens,
            ...(o.route === 'cloudflare' ? { jevRoute: 'cloudflare' } : {}),
            ...(o.model ? { jevModel: o.model } : {}) }) }
};

function credentials(route) {
  if (route === 'cloudflare') {
    return {
      jevKey: process.env.CLOUDFLARE_API_TOKEN || '',
      jevAccount: process.env.CLOUDFLARE_ACCOUNT_ID || '',
      jevGateway: process.env.CLOUDFLARE_GATEWAY_ID || ''
    };
  }
  return { jevKey: process.env.TYPESAFE_API_KEY || '' };
}

/** Run one arm to `maps` completed rounds and bring back its telemetry. */
async function runArm(name, shared, o) {
  const arm = ARMS[name];
  const params = new URLSearchParams({
    bot: '1',
    lockRound: String(o.round),
    seedRepeats: '1',
    modalDelayMs: '200',
    autoStart: '1',
    ...Object.fromEntries(Object.entries(arm.params(o)).map(([k, v]) => [k, String(v)]))
  });

  const browser = await shared.pw.launch({
    executablePath: shared.executablePath,
    headless: !o.headed,
    // Canvas, not swiftshader WebGL: WebGL runs at 9-18fps in a container and
    // changes what any driver can do, which would land on the arms unevenly.
    args: ['--no-sandbox', '--disable-gpu', '--disable-software-rasterizer', '--mute-audio']
  });
  const ctx = await browser.newContext({ viewport: { width: o.width, height: o.height } });

  // Credentials go in before any script runs, so the game reads them at boot.
  // sessionStorage rather than the URL: a URL ends up in logs and history.
  if (name === 'jev') {
    const creds = credentials(o.route);
    await ctx.addInitScript((c) => {
      try { for (const [k, v] of Object.entries(c)) if (v) sessionStorage.setItem(k, v); } catch {}
    }, creds);
  }

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    const t = m.text();
    // Keep the run watchable without drowning in per-frame noise.
    if (/^\[(RUN|JEV)\]/.test(t) || /^\[BOT\] (died|round locked|auto-start|sweep)/.test(t)) {
      console.log(`  [${name}] ${t}`);
    }
  });

  const started = Date.now();
  let telemetry = [], jev = null, timedOut = false;
  try {
    await page.goto(`${o.url}/?${params}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction(
      (n) => (window.__plugRunTelemetry || []).length >= n, o.maps,
      { timeout: o.armTimeoutMs, polling: 1000 }
    ).catch(() => { timedOut = true; });
    if (timedOut) console.log(`  [${name}] timed out after ${Math.round(o.armTimeoutMs / 1000)}s`);

    telemetry = await page.evaluate(() => window.__plugRunTelemetry || []);
    jev = await page.evaluate(() => window.__plugRunJev?.() ?? null);
  } finally {
    await browser.close();
  }

  return {
    arm: name, label: arm.label, params: params.toString(),
    timedOut, wallMs: Date.now() - started,
    errors: errors.slice(0, 5),
    runs: telemetry, jev
  };
}

/* ---------------- reporting ---------------- */

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function summarise(result) {
  const runs = result.runs;
  const cleared = runs.filter(r => r.outcome === 'extracted');
  return {
    arm: result.arm,
    label: result.label,
    runs: runs.length,
    cleared: cleared.length,
    clearRate: runs.length ? +(cleared.length / runs.length).toFixed(3) : 0,
    // Median over CLEARS only. A death's duration measures how long it took
    // to die, and mixing the two produces a "time" that is fast because the
    // driver kept losing early.
    medianClearS: cleared.length ? +(median(cleared.map(r => r.durationMs)) / 1000).toFixed(1) : null,
    deaths: runs.filter(r => r.outcome !== 'extracted').length,
    timedOut: result.timedOut,
    costUsd: result.jev?.costUsd ?? 0,
    budgetStopped: result.jev?.budgetStopped ?? null,
    tokenSource: result.jev?.tokenSource ?? null,
    logicalRequests: result.jev?.logicalRequests ?? null,
    strategiesAdopted: result.jev?.strategies?.adopted ?? null,
    strategyActiveShare: result.jev?.time?.strategyActiveShare ?? null,
    watchdogRecoveries: result.jev?.watchdog?.recoveries ?? null
  };
}

/**
 * Per-seed, not just per-arm. Two arms can post the same clear rate on
 * different maps, and then the aggregate says they are equivalent when what
 * actually happened is that they are good at different things.
 */
function headToHead(results) {
  const seeds = new Map();
  for (const r of results) {
    for (const run of r.runs) {
      const key = String(run.seed);
      if (!seeds.has(key)) seeds.set(key, { seed: run.seed, routeID: run.routeID });
      // First attempt on a map is the comparable one: later attempts on the
      // same seed are retries after a death, which the arms do not share.
      const row = seeds.get(key);
      if (!(r.arm in row)) row[r.arm] = { outcome: run.outcome, s: +(run.durationMs / 1000).toFixed(1) };
    }
  }
  // Only maps every arm actually reached are comparable.
  return [...seeds.values()].filter(row => results.every(r => r.arm in row));
}

/* ---------------- main ---------------- */

(async () => {
  const o = OPTIONS;
  const unknown = o.arms.filter(a => !ARMS[a]);
  if (unknown.length) { console.error('unknown arm(s): ' + unknown.join(', ') + ' — pick from ' + Object.keys(ARMS).join(', ')); process.exit(2); }

  if (o.arms.includes('jev')) {
    const creds = credentials(o.route);
    if (!creds.jevKey) {
      console.error(o.route === 'cloudflare'
        ? 'Set CLOUDFLARE_API_TOKEN (and CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_GATEWAY_ID).'
        : 'Set TYPESAFE_API_KEY.');
      process.exit(2);
    }
    if (o.route === 'cloudflare' && !creds.jevAccount) {
      console.error('Set CLOUDFLARE_ACCOUNT_ID for the cloudflare route.');
      process.exit(2);
    }
    if (o.route === 'cloudflare' && !creds.jevGateway) {
      console.warn('No CLOUDFLARE_GATEWAY_ID: this will bill neurons rather than your prepaid credits.');
    }
  }

  const shared = await chromium();
  console.log(`jev-spike: round ${o.round}, ${o.maps} maps per arm, arms ${o.arms.join(', ')}\n`);

  const results = [];
  for (const name of o.arms) {
    console.log(`-- ${name} (${ARMS[name].label})`);
    const r = await runArm(name, shared, o);
    results.push(r);
    const s = summarise(r);
    console.log(`   ${s.cleared}/${s.runs} cleared, median ${s.medianClearS ?? '-'}s` +
      (s.costUsd ? `, $${s.costUsd} (${s.tokenSource})` : '') +
      (r.timedOut ? '  [TIMED OUT — partial]' : '') +
      (r.errors.length ? `  [${r.errors.length} page errors]` : '') + '\n');
  }

  const summary = results.map(summarise);
  console.table(summary);

  const h2h = headToHead(results);
  if (h2h.length) {
    console.log(`\nSame maps, ${h2h.length} shared:`);
    console.table(h2h.map(row => {
      const out = { seed: row.seed };
      for (const r of results) out[r.arm] = `${row[r.arm].outcome} ${row[r.arm].s}s`;
      return out;
    }));
  } else {
    console.log('\nNo map was reached by every arm — nothing to compare head to head.');
  }

  mkdirSync(o.out, { recursive: true });
  const file = join(o.out, `jev-spike-r${o.round}-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify({
    ranAt: new Date().toISOString(),
    // Credentials deliberately absent — see the note at the top of this file.
    options: { ...o, route: o.route },
    summary, headToHead: h2h, results
  }, null, 2));
  console.log('\nwrote ' + file);

  const jev = summary.find(s => s.arm === 'jev');
  if (jev) {
    const perMap = jev.runs ? jev.costUsd / jev.runs : 0;
    console.log(`Jev: $${jev.costUsd.toFixed(4)} over ${jev.runs} maps = $${perMap.toFixed(4)}/map` +
      `, ${jev.logicalRequests} strategic requests, ${jev.strategiesAdopted} adopted, ` +
      `strategy in force ${((jev.strategyActiveShare ?? 0) * 100).toFixed(0)}% of live time.`);
    if (jev.tokenSource !== 'api') console.log('  NOTE: that figure is an estimate — no answer carried usage, so nothing was actually billed.');
  }
})().catch((e) => { console.error(e); process.exit(1); });
