#!/usr/bin/env node
// How well did Jev's runs go? Deaths, where they happened, bag choice and
// route length, from the recorded replays.
//
//   node tools/jev-report.mjs                               # every run in public/rivals/jev-v1
//   node tools/jev-report.mjs --in tools/recordings/jev/v2  # captures, each beside the bank run on its course
//
// Per run:
//   deaths            failed attempts (caught or timed out)
//   near plug         of those, how many ended within 3 cells of a plug
//   nearer bag first  attempts whose first bag reached was the nearer one by walking distance
//   walked/shortest   median, over clears that went straight to the real bag, of the distance
//                     walked over the shortest spawn -> bag -> car walk (evasion included)
//   stalls, recovery  the progress watchdog's stalls and the time it steered
//   detours           the runner AI's own random detours (0 since they were switched off under Jev)
//
// Reads replays and captures only; writes nothing.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { bankEntries } from './rivals-replay-video.mjs';
import { FRAME } from '../src/logic/rivalReplay.js';
import { generateSquareMaze } from '../src/utils/mazeGenerator.js';
import { createSeededRNG } from '../src/utils/seededRandom.js';

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const cellOf = (p) => ({ x: Math.floor(p.x), y: Math.floor(p.y) });

function bfs(grid, from) {
  const R = grid.length, C = grid[0].length;
  const d = Array.from({ length: R }, () => Array(C).fill(-1));
  const q = [[from.x, from.y]];
  d[from.y][from.x] = 0;
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= C || ny >= R || grid[ny][nx] !== 0 || d[ny][nx] >= 0) continue;
      d[ny][nx] = d[y][x] + 1;
      q.push([nx, ny]);
    }
  }
  return d;
}

/** Numbers for one race, from its replay bundle and (if any) the strategist report. */
export function runMetrics(bundle, report = null) {
  let deaths = 0, nearPlug = 0, nearer = 0, reached = 0;
  const ratios = [];
  for (const seg of bundle.segments) {
    const r = seg.replay;
    if (seg.outcome !== 'extracted') {
      deaths++;
      const last = r.frames[r.frames.length - 1];
      const plugs = last[FRAME.PLUGS];
      if (plugs.length && Math.min(...plugs.map((p) => Math.hypot(p[0] - last[FRAME.RX], p[1] - last[FRAME.RY]))) <= 3) nearPlug++;
    }
    const first = r.events.find((e) => e.k === 'pickup' || e.k === 'bunk');
    if (!first) continue;
    const arena = generateSquareMaze(r.cols, r.rows, { rng: createSeededRNG(r.houseSeed), role: 'runner', clusterScale: r.scale });
    const fromSpawn = bfs(arena.grid, cellOf(r.spawn.r));
    const dist = r.stashes.map((p) => fromSpawn[cellOf(p).y][cellOf(p).x]);
    // Which bag was reached first: the one nearest the runner at that moment.
    const f = r.frames.reduce((b, fr) => Math.abs(fr[FRAME.T] - first.t) < Math.abs(b[FRAME.T] - first.t) ? fr : b);
    const gap = (i) => Math.hypot(r.stashes[i].x - f[FRAME.RX], r.stashes[i].y - f[FRAME.RY]);
    const bag = gap(0) <= gap(1) ? 0 : 1;
    reached++;
    if (dist[bag] <= dist[1 - bag]) nearer++;
    if (seg.outcome === 'extracted' && first.k === 'pickup') {
      let walked = 0;
      for (let i = 1; i < r.frames.length; i++) {
        walked += Math.hypot(r.frames[i][FRAME.RX] - r.frames[i - 1][FRAME.RX], r.frames[i][FRAME.RY] - r.frames[i - 1][FRAME.RY]);
      }
      const exit = arena.egress.entry;
      const shortest = dist[bag] + bfs(arena.grid, cellOf(r.stashes[bag]))[exit.y][exit.x];
      if (shortest > 0) ratios.push(walked / shortest);
    }
  }
  const w = report?.watchdog || {};
  const ratio = median(ratios);
  return {
    deaths,
    'near plug': `${nearPlug}/${deaths}`,
    'nearer bag first': `${nearer}/${reached}`,
    'walked/shortest': ratio == null ? '—' : Math.round(ratio * 100) / 100,
    stalls: w.stalls ?? '—',
    'recovery s': w.recoveryMs != null ? Math.round(w.recoveryMs / 1000) : '—',
    detours: report?.motorDetail?.detours ?? '—',
    requests: report?.logicalRequests ?? '—',
    'cost $': report?.costUsd ?? '—'
  };
}

function bankRows() {
  const rows = [];
  for (const { course, entry } of bankEntries('jev-v1')) {
    const bundle = JSON.parse(readFileSync(join('public/rivals/jev-v1', entry.replay), 'utf8'));
    const src = entry.provenance?.source ? join('tools/recordings', entry.provenance.source) : null;
    const report = src && existsSync(src) ? JSON.parse(readFileSync(src, 'utf8')).jev?.report : null;
    rows.push({ slot: course.slot, run: 'bank · ' + (entry.record.opponent.skillPreset || '?'), result: 'win',
      'race s': Math.round(entry.record.elapsedMs / 1000), ...runMetrics(bundle, report) });
  }
  return rows;
}

function captureRows(dir) {
  const bank = new Map(bankRows().map((r) => [r.slot, r]));
  const rows = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!name.endsWith('.json') || name.endsWith('.events.json')) continue;
      let cap;
      try { cap = JSON.parse(readFileSync(p, 'utf8')); } catch { continue; }
      if (!Array.isArray(cap?.races)) continue;
      for (const race of cap.races) {
        if (!race.bundle) continue;
        const slot = cap.job?.slot;
        if (bank.has(slot)) rows.push(bank.get(slot));
        rows.push({ slot, run: 'new · ' + (cap.job?.style ?? '?'), result: (race.result ?? '?') + (race.ok ? '' : ' ✗'),
          'race s': Math.round(race.elapsedMs / 1000), ...runMetrics(race.bundle, race.jev?.report ?? cap.jev?.report) });
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return rows.sort((a, b) => a.slot - b.slot);
}

function main() {
  const dir = arg('in');
  const rows = dir ? captureRows(dir) : bankRows();
  if (!rows.length) { console.error('no runs found'); process.exit(2); }
  console.table(rows);
  const total = (k, rs) => rs.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  for (const kind of ['bank', 'new']) {
    const rs = rows.filter((r) => r.run.startsWith(kind)).filter((r, i, a) => a.findIndex((x) => x.slot === r.slot && x.run === r.run) === i);
    if (rs.length) console.log(`${kind}: ${rs.length} runs, ${total('race s', rs)}s racing, ${total('deaths', rs)} deaths`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
