#!/usr/bin/env node
// Build a local page for watching the Jev bank's runs.
//
//   node tools/jev-preview.mjs                     # writes tools/recordings/jev/preview/index.html
//   npx vite --root tools/recordings/jev --port 4180   # then open /preview/
//
// One entry per run in public/rivals/jev-v1: the race footage recorded with
// it (tools/recordings/jev/bank/video), a replay render if one exists
// (tools/rivals-replay-video.mjs), the run's numbers from the bank's own
// provenance, per-house splits and deaths from the record, and a clickable
// timeline from the footage's .events.json. Everything is read from files
// already on disk; nothing is fetched and nothing is written outside the
// git-ignored tools/recordings.
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { bankEntries } from './rivals-replay-video.mjs';

const ROOT = 'tools/recordings/jev';
const OUT = join(ROOT, 'preview');

function captureFor(source) {
  const p = source ? join('tools/recordings', source) : null;
  return p && existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
}

function timelineFrom(eventsPath) {
  if (!eventsPath || !existsSync(eventsPath)) return [];
  const ev = JSON.parse(readFileSync(eventsPath, 'utf8')).events || [];
  const out = [];
  let lastObjective = null;
  for (const e of [...ev].sort((a, b) => a.videoMs - b.videoMs)) {
    const t = e.videoMs / 1000, race = e.raceMs;
    const push = (kind, text) => out.push({ t: +t.toFixed(1), race, kind, text });
    if (e.kind === 'status' && e.status === 'racing') push('start', 'Race starts');
    else if (e.kind === 'status' && e.status === 'finished') push('finish', 'Finished · ' + (e.result || ''));
    else if (e.kind === 'house-clear') push('clear', `House ${e.house} cleared`);
    else if (e.kind === 'retry') push('death', `Caught · house ${e.house}`);
    else if (e.kind === 'jev-pickup') push('pickup', 'Picked up the stash');
    else if (e.kind === 'jev-bags-changed') push('bunk', 'Bunk bag — the other one is real');
    else if (e.kind === 'jev-adopted') {
      const key = e.objective + '/' + e.posture;
      if (key !== lastObjective) push('jev', `Jev → ${e.objective.replace('_', ' ')} · ${e.posture}${e.confidence != null ? ' · ' + Math.round(e.confidence * 100) + '%' : ''}`);
      lastObjective = key;
    } else if (e.kind === 'jev-house' || e.kind === 'jev-retry') lastObjective = null;
    else if (e.kind === 'jev-power-armed') push('power', `Jev arms ${e.name}`);
    else if (e.kind === 'jev-power-activated') push('power', `${e.name[0].toUpperCase() + e.name.slice(1)} fired`);
    else if (e.kind === 'jev-stall') push('stall', 'Stalled — recovery takes over');
    else if (e.kind === 'jev-restored') push('stall', 'Progress restored');
  }
  return out;
}

function houseRows(record) {
  const rows = [];
  let prev = 0;
  for (let h = 1; h <= 7; h++) {
    const attempts = record.attempts.filter((a) => a.house === h);
    const clear = record.clearTimes[h - 1];
    rows.push({ house: h, split: +((clear - prev) / 1000).toFixed(1), at: +(clear / 1000).toFixed(1), deaths: attempts.filter((a) => a.outcome !== 'extracted').length });
    prev = clear;
  }
  return rows;
}

const runs = [];
for (const { course, entry } of bankEntries('jev-v1')) {
  const r = entry.record, p = entry.provenance;
  const cap = captureFor(p.source);
  const footage = cap?.video?.path ? cap.video.path.split('\\').join('/') : null;
  const footageRel = footage && existsSync(footage) ? relative(OUT, footage).split('\\').join('/') : null;
  const replayFile = existsSync(OUT) ? readdirSync(OUT).find((f) => f.startsWith('replay-' + r.recordingID) && f.endsWith('.mp4')) : null;
  runs.push({
    id: r.recordingID, slot: course.slot, course: course.name,
    elapsed: +(r.elapsedMs / 1000).toFixed(1), retries: r.retries, attempts: r.attempts.length,
    powersMix: r.orderedPowers, recordedAt: r.recordedAt,
    model: p.model.returned, requests: p.requests.logical, cost: p.session?.costUsd ?? p.costUsd,
    tokens: p.session?.tokensBilled ?? p.tokens.billed, active: p.strategy.activeShare,
    armed: p.powers.accepted, fired: p.powers.activated, recoveries: p.watchdog.recoveries, restored: p.watchdog.restored,
    footage: footageRel, footageRenderer: cap?.environment?.renderer ?? null,
    replay: replayFile || null,
    houses: houseRows(r),
    timeline: timelineFrom(footage ? footage.replace(/\.mp4$/, '.events.json') : null)
  });
}
runs.sort((a, b) => a.slot - b.slot);
mkdirSync(OUT, { recursive: true });

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Jev Runs</title>
<style>
  :root { --bg:#0b0f14; --panel:#111a21; --line:#233039; --ink:#e8e2d0; --muted:#8b9aa3; --teal:#7fd1c7; --gold:#dec386; --red:#f07b6b; --blue:#86bad5; }
  * { box-sizing: border-box; }
  html, body { margin:0; height:100%; background:var(--bg); color:var(--ink); font:14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
  .app { display:grid; grid-template-columns: 250px minmax(0,1fr) 340px; height:100vh; }
  aside, section { overflow:auto; }
  .list { border-right:1px solid var(--line); padding:14px 10px; }
  h1 { font-size:15px; letter-spacing:.14em; margin:2px 6px 4px; color:var(--gold); }
  .sub { color:var(--muted); font-size:12px; margin:0 6px 14px; }
  .run { display:block; width:100%; text-align:left; background:transparent; color:inherit; border:1px solid transparent; border-radius:8px; padding:9px 10px; margin-bottom:4px; cursor:pointer; font:inherit; }
  .run:hover { background:#141f27; }
  .run[aria-current="true"] { background:#16242d; border-color:var(--teal); }
  .run .name { font-weight:600; }
  .run .meta { color:var(--muted); font-size:12px; font-variant-numeric:tabular-nums; }
  .stage { display:flex; flex-direction:column; align-items:center; padding:14px; gap:10px; }
  video { height:calc(100vh - 110px); max-width:100%; aspect-ratio:390/844; background:#000; border-radius:10px; border:1px solid var(--line); }
  .bar { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; align-items:center; }
  .seg { display:inline-flex; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
  .seg button { background:transparent; color:var(--muted); border:0; padding:6px 11px; font:inherit; font-size:12px; cursor:pointer; }
  .seg button[aria-pressed="true"] { background:#1b2a33; color:var(--ink); }
  .seg button:disabled { opacity:.35; cursor:not-allowed; }
  .note { color:var(--muted); font-size:12px; max-width:560px; text-align:center; }
  .side { border-left:1px solid var(--line); padding:14px; }
  .title { font-size:18px; font-weight:700; margin:0; }
  .id { color:var(--muted); font:12px ui-monospace, Consolas, monospace; margin:2px 0 12px; word-break:break-all; }
  .stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px; }
  .stat { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:8px 10px; }
  .stat b { display:block; font-size:17px; font-variant-numeric:tabular-nums; }
  .stat span { color:var(--muted); font-size:11px; letter-spacing:.06em; text-transform:uppercase; }
  h2 { font-size:12px; letter-spacing:.12em; color:var(--gold); margin:16px 0 8px; text-transform:uppercase; }
  table { width:100%; border-collapse:collapse; font-variant-numeric:tabular-nums; font-size:13px; }
  td, th { padding:4px 6px; text-align:right; border-bottom:1px solid #1a252d; }
  th { color:var(--muted); font-weight:500; font-size:11px; }
  td:first-child, th:first-child { text-align:left; }
  .deaths { color:var(--red); }
  .tl { list-style:none; margin:0; padding:0; }
  .tl li { display:grid; grid-template-columns:52px 1fr; gap:8px; padding:5px 6px; border-radius:6px; cursor:pointer; font-size:13px; }
  .tl li:hover { background:#141f27; }
  .tl li.now { background:#17262e; outline:1px solid #2c4450; }
  .tl .t { color:var(--muted); font:12px ui-monospace, Consolas, monospace; }
  .k-clear .x { color:var(--gold); } .k-death .x { color:var(--red); } .k-pickup .x, .k-bunk .x { color:var(--blue); }
  .k-jev .x { color:var(--teal); } .k-power .x { color:#c9a6f0; } .k-stall .x { color:var(--muted); font-style:italic; }
  .k-start .x, .k-finish .x { color:var(--ink); font-weight:600; }
  .filters { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
  .filters label { font-size:12px; color:var(--muted); display:flex; gap:4px; align-items:center; }
  kbd { font:11px ui-monospace, Consolas, monospace; border:1px solid var(--line); border-radius:4px; padding:0 4px; color:var(--muted); }
  @media (max-width: 1000px) {
    .app { grid-template-columns: 1fr; height:auto; }
    .list, .side { border:0; }
    video { height:70vh; }
  }
</style>
</head>
<body>
<div class="app">
  <aside class="list">
    <h1>JEV RUNS</h1>
    <p class="sub">${runs.length} races · one per course · $${runs.reduce((a, r) => a + (r.cost || 0), 0).toFixed(4)} total</p>
    <nav id="runs"></nav>
    <p class="sub" style="margin-top:14px"><kbd>↑</kbd><kbd>↓</kbd> run · <kbd>space</kbd> play · <kbd>←</kbd><kbd>→</kbd> 5s · <kbd>1</kbd><kbd>2</kbd><kbd>4</kbd> speed</p>
  </aside>
  <section class="stage">
    <video id="video" controls playsinline preload="metadata"></video>
    <div class="bar">
      <div class="seg" id="source">
        <button data-src="footage">Race footage</button><button data-src="replay">Replay</button>
      </div>
      <div class="seg" id="speed">
        <button data-rate="1">1×</button><button data-rate="2">2×</button><button data-rate="4">4×</button><button data-rate="8">8×</button>
      </div>
    </div>
    <p class="note" id="note"></p>
  </section>
  <aside class="side">
    <p class="title" id="title"></p>
    <p class="id" id="rid"></p>
    <div class="stats" id="stats"></div>
    <h2>Houses</h2>
    <table><thead><tr><th>House</th><th>Split</th><th>At</th><th>Deaths</th></tr></thead><tbody id="houses"></tbody></table>
    <h2>Timeline</h2>
    <div class="filters" id="filters"></div>
    <ul class="tl" id="timeline"></ul>
  </aside>
</div>
<script>
const RUNS = ${JSON.stringify(runs)};
const $ = (id) => document.getElementById(id);
const video = $('video');
const fmt = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60); return m + ':' + (s % 60).toFixed(1).padStart(4, '0'); };
const KINDS = { clear: 'Clears', death: 'Deaths', pickup: 'Pickups', bunk: 'Bunks', jev: 'Jev calls', power: 'Powers', stall: 'Recoveries', start: 'Start', finish: 'Finish' };
let shown = new Set(Object.keys(KINDS));
let cur = 0, source = 'footage', rate = 1;
try { const saved = JSON.parse(localStorage.getItem('jevPreview') || '{}'); if (Number.isInteger(saved.run)) cur = saved.run; if (saved.rate) rate = saved.rate; } catch {}

function renderList() {
  $('runs').innerHTML = RUNS.map((r, i) =>
    '<button class="run" data-i="' + i + '" aria-current="' + (i === cur) + '"><div class="name">' + r.slot + ' · ' + r.course + '</div>' +
    '<div class="meta">' + fmt(r.elapsed) + ' · ' + r.retries + ' retries · $' + (r.cost || 0).toFixed(4) + '</div></button>').join('');
  $('runs').querySelectorAll('.run').forEach((b) => b.onclick = () => select(+b.dataset.i));
}
function renderFilters() {
  $('filters').innerHTML = Object.entries(KINDS).map(([k, label]) =>
    '<label><input type="checkbox" data-k="' + k + '"' + (shown.has(k) ? ' checked' : '') + '> ' + label + '</label>').join('');
  $('filters').querySelectorAll('input').forEach((c) => c.onchange = () => { c.checked ? shown.add(c.dataset.k) : shown.delete(c.dataset.k); renderTimeline(); });
}
function renderTimeline() {
  const r = RUNS[cur];
  const usable = source === 'footage' && r.footage;
  if (!usable) { $('timeline').innerHTML = '<li style="cursor:default"><span></span><span class="t">' + (r.footage ? 'The timeline follows the race footage.' : 'No footage timeline for this run.') + '</span></li>'; return; }
  $('timeline').innerHTML = r.timeline.filter((e) => shown.has(e.kind)).map((e) =>
    '<li class="k-' + e.kind + '" data-t="' + e.t + '"><span class="t">' + fmt(e.race != null ? e.race / 1000 : e.t) + '</span><span class="x">' + e.text + '</span></li>').join('');
  $('timeline').querySelectorAll('li[data-t]').forEach((li) => li.onclick = () => { video.currentTime = +li.dataset.t; video.play(); });
}
function select(i) {
  cur = (i + RUNS.length) % RUNS.length;
  const r = RUNS[cur];
  // Canvas-rendered footage shows the characters as blobs; prefer the replay then.
  source = r.footage && !(r.footageRenderer === 'CANVAS' && r.replay) ? 'footage' : (r.replay ? 'replay' : 'footage');
  try { localStorage.setItem('jevPreview', JSON.stringify({ run: cur, rate })); } catch {}
  renderList();
  $('title').textContent = 'Slot ' + r.slot + ' · ' + r.course;
  $('rid').textContent = r.id;
  const stat = (v, k) => '<div class="stat"><b>' + v + '</b><span>' + k + '</span></div>';
  $('stats').innerHTML = stat(fmt(r.elapsed), 'Race time') + stat(r.retries, 'Retries') +
    stat(Math.round((r.active || 0) * 100) + '%', 'Jev in charge') + stat(r.requests, 'Jev decisions') +
    stat(r.fired + ' / ' + r.armed, 'Powers fired / armed') + stat(r.recoveries + (r.recoveries ? ' (' + r.restored + ' ok)' : ''), 'Recoveries') +
    stat('$' + (r.cost || 0).toFixed(4), 'Cost') + stat((r.tokens || 0).toLocaleString(), 'Tokens');
  $('houses').innerHTML = r.houses.map((h) => '<tr><td>' + h.house + '</td><td>' + h.split.toFixed(1) + 's</td><td>' + fmt(h.at) + '</td><td class="' + (h.deaths ? 'deaths' : '') + '">' + h.deaths + '</td></tr>').join('');
  load();
}
function load() {
  const r = RUNS[cur];
  const src = source === 'replay' ? r.replay : r.footage;
  $('source').querySelectorAll('button').forEach((b) => {
    const has = b.dataset.src === 'replay' ? !!r.replay : !!r.footage;
    b.disabled = !has; b.setAttribute('aria-pressed', String(b.dataset.src === source));
  });
  $('note').textContent = source === 'replay'
    ? "Replay: the banked run played back by the game's own replay player (what WATCH RIVAL shows)."
    : (r.footageRenderer === 'CANVAS' ? 'Race footage recorded with the Canvas renderer, so the characters show as blobs. Switch to Replay for the proper sprites.'
      : 'Race footage: the live race exactly as it was recorded, on the GPU renderer.');
  video.src = src || '';
  video.playbackRate = rate;
  video.onloadedmetadata = () => { video.playbackRate = rate; };
  renderTimeline();
}
$('source').querySelectorAll('button').forEach((b) => b.onclick = () => { if (!b.disabled) { source = b.dataset.src; load(); } });
function setRate(x) { rate = x; video.playbackRate = x; $('speed').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.rate === x))); try { localStorage.setItem('jevPreview', JSON.stringify({ run: cur, rate })); } catch {} }
$('speed').querySelectorAll('button').forEach((b) => b.onclick = () => setRate(+b.dataset.rate));
video.ontimeupdate = () => {
  const t = video.currentTime; let last = null;
  $('timeline').querySelectorAll('li[data-t]').forEach((li) => { li.classList.remove('now'); if (+li.dataset.t <= t) last = li; });
  if (last) { last.classList.add('now'); }
};
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowDown') { e.preventDefault(); select(cur + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); select(cur - 1); }
  else if (e.key === ' ') { e.preventDefault(); video.paused ? video.play() : video.pause(); }
  else if (e.key === 'ArrowRight') video.currentTime += 5;
  else if (e.key === 'ArrowLeft') video.currentTime -= 5;
  else if (['1', '2', '4', '8'].includes(e.key)) setRate(+e.key);
});
renderFilters(); setRate(rate); select(cur);
</script>
</body>
</html>`;
writeFileSync(join(OUT, 'index.html'), html);
console.log(`wrote ${join(OUT, 'index.html')}: ${runs.length} runs; footage ${runs.filter((r) => r.footage).length}, replay renders ${runs.filter((r) => r.replay).length}`);
for (const r of runs) console.log(`  slot ${r.slot} ${r.course}: footage ${r.footage ? basename(r.footage) + ' (' + r.footageRenderer + ')' : '—'}, replay ${r.replay || '—'}, ${r.timeline.length} timeline events`);
