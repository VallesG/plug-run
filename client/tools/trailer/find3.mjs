// Propose clip windows around real moments that pass edit3's twitch screen,
// and write 1 fps contact sheets. node find3.mjs <take> [<take>...]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { findMoments } from './analyze.mjs';
const S = process.env.TRAILER_OUT, FF = process.env.FFMPEG;
const FPS = 30, WIN = 15;
mkdirSync(S + '/sheets3', { recursive: true });
function worst(rows, a, b, kx, ky) {
  let prev = null, rev = [];
  for (let i = a + 1; i < b; i++) {
    const p = rows[i - 1], q = rows[i];
    const ok = p && q && p[kx] != null && q[kx] != null && (kx === 'gx' || (p.live && q.live && !p.paused && !q.paused));
    if (!ok) { prev = null; rev.push(0); continue; }
    const d = [q[kx] - p[kx], q[ky] - p[ky]];
    if (!d[0] && !d[1]) { rev.push(0); continue; }
    rev.push(prev && prev[0] * d[0] + prev[1] * d[1] < 0 ? 1 : 0); prev = d;
  }
  let w = 0; for (let i = 0; i + WIN <= rev.length; i++) w = Math.max(w, rev.slice(i, i + WIN).reduce((s, v) => s + v, 0));
  return w;
}
const live = (rows, a, b) => rows.slice(a, b).filter(r => r.live && !r.paused && !r.over).length / Math.max(1, b - a);
const out = {};
for (const name of process.argv.slice(2)) {
  const j = JSON.parse(readFileSync(`${S}/${name}.json`, 'utf8')), rows = j.rows;
  if (j.take === 'jev') {
    // Jev's recorded run in the replay viewer. Bullet radius is cell*0.13.
    const cand = [];
    const cellAt = (r) => r.gbr ? r.gbr / 0.13 : null;
    const ouch = j.audio.filter(a => a.key === 'ouch').map(a => Math.round(a.t / 1000 * FPS));
    const jevOK = (a, b) => rows.slice(a, b).filter(r => r.gx != null).length >= (b - a) * 0.9 && worst(rows, a, b, 'gx', 'gy') <= 2;
    const near = [];
    rows.forEach((r, i) => { const c = cellAt(r); if (c && r.gb != null && r.gb / c < 1.0 && !ouch.some(f => f >= i && f <= i + 30)) near.push({ i, d: +(r.gb / c).toFixed(2) }); });
    for (const n of near.sort((a, b) => a.d - b.d)) {
      if (cand.some(c => c.kind === 'jevnear' && Math.abs(c.cue - n.i) < 60)) continue;
      for (const [pre, post] of [[45, 30], [30, 45], [60, 25]]) { const a = Math.max(0, n.i - pre), b = Math.min(rows.length, n.i + post);
        if (jevOK(a, b)) { cand.push({ kind: 'jevnear', from: a, to: b, cue: n.i, dist: n.d, at: +(a / FPS).toFixed(1), sec: +((b - a) / FPS).toFixed(1) }); break; } }
    }
    for (const a of j.audio.filter(a => /^(phase|dash|decoy)$/.test(a.key))) {
      const f = Math.round(a.t / 1000 * FPS);
      for (const [pre, post] of [[25, 65], [35, 55], [20, 50]]) { const s = Math.max(0, f - pre), e = Math.min(rows.length, f + post);
        if (jevOK(s, e)) { cand.push({ kind: 'jevpower', power: a.key, from: s, to: e, cue: f, at: +(s / FPS).toFixed(1), sec: +((e - s) / FPS).toFixed(1) }); break; } }
    }
    const pickups = j.audio.filter(a => a.key === 'spickup').map(a => Math.round(a.t / 1000 * FPS));
    for (const f of pickups) { const s = Math.max(0, f - 45), e = Math.min(rows.length, f + 30); if (jevOK(s, e)) cand.push({ kind: 'jevstash', from: s, to: e, cue: f, at: +(s / FPS).toFixed(1), sec: 2.5 }); }
    out[name] = cand;
    const byKind = {}; for (const c of cand) (byKind[c.kind] ||= []).push(`${(c.cue / FPS).toFixed(1)}s${c.power ? '/' + c.power : ''}${c.dist != null ? '/' + c.dist : ''}`);
    console.log(name, 'frames', rows.length, 'audio', j.audio.length, JSON.stringify(byKind));
    execFileSync(FF, ['-y', '-v', 'error', '-i', `${S}/${name}.mp4`, '-vf',
      "fps=1,scale=180:320,drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':text='%{eif\\:n\\:d}':fontsize=28:fontcolor=yellow:x=6:y=6:borderw=2,tile=10x6",
      `${S}/sheets3/${name}-%02d.png`]);
    continue;
  }
  const M = findMoments(rows);
  M.deaths = []; for (let i = 1; i < rows.length; i++) if (rows[i].live && rows[i - 1].live && rows[i - 1].hp > 0 && rows[i].hp <= 0) M.deaths.push({ frame: i });
  const cand = [];
  const tryWin = (kind, a, b, extra = {}) => {
    a = Math.max(0, a); b = Math.min(rows.length, b);
    const rf = worst(rows, a, b, 'x', 'y'), lp = live(rows, a, b);
    const ok = kind === 'death' ? rf <= 2 && lp > 0.6 : rf <= 2 && lp >= 0.9;
    if (ok) cand.push({ kind, from: a, to: b, sec: +((b - a) / FPS).toFixed(1), at: +(a / FPS).toFixed(1), runnerFlips: rf, ...extra });
  };
  for (const c of M.closeCalls) for (const [pre, post] of [[45, 30], [30, 45], [60, 30]]) tryWin('nearmiss', c.frame - pre, c.frame + post, { dist: c.dist });
  for (const f of M.pickups.map(x => x.frame)) for (const [pre, post] of [[45, 30], [60, 15]]) tryWin('stash', f - pre, f + post);
  for (const f of M.extractions.map(x => x.frame)) for (const [pre, post] of [[75, 6], [90, 4], [60, 8]]) tryWin('escape', f - pre, f + post);
  for (const f of M.powers.map(x => x.frame)) for (const [pre, post] of [[20, 55], [30, 45]]) {
    const cue = j.audio.find(a => /^(phase|dash|decoy)$/.test(a.key) && Math.abs(a.t / 1000 * FPS - f) < 6);
    tryWin('power', f - pre, f + post, { power: cue?.key || '?' });
  }
  for (const d of M.deaths) for (const [pre, post] of [[60, 20], [45, 25]]) tryWin('death', d.frame - pre, d.frame + post);
  for (const p of M.plugPressure) tryWin('plug', p.frame - 45, p.frame + 30, { dist: p.dist });
  // Jev on screen and moving cleanly: close-up candidates.
  for (let a = 0; a + 75 <= rows.length; a += 15) {
    const seg = rows.slice(a, a + 75);
    if (seg.filter(r => r.gx != null).length < 72) continue;
    const jf = worst(rows, a, a + 75, 'gx', 'gy');
    const moved = Math.hypot(seg.at(-1).gx - seg[0].gx, seg.at(-1).gy - seg[0].gy);
    const rf = worst(rows, a, a + 75, 'x', 'y');
    if (jf <= 2 && rf <= 2 && moved > 40) cand.push({ kind: 'jev', from: a, to: a + 75, sec: 2.5, at: +(a / FPS).toFixed(1), jevFlips: jf, runnerFlips: rf, moved: Math.round(moved) });
  }
  // Jev's own powers: the replay plays them through the game's audio, so a
  // power cue with no power spent by OUR runner at that moment is Jev's.
  const ownPowerFrames = M.powers.map(x => x.frame);
  for (const a of j.audio.filter(a => /^(phase|dash|decoy)$/.test(a.key))) {
    const f = Math.round(a.t / 1000 * FPS);
    if (ownPowerFrames.some(p => Math.abs(p - f) <= 8)) continue;
    for (const [pre, post] of [[30, 50], [20, 60], [40, 40]]) {
      const s = Math.max(0, f - pre), e = Math.min(rows.length, f + post), seg = rows.slice(s, e);
      if (seg.filter(r => r.gx != null).length < (e - s) * 0.9) continue;
      const jf = worst(rows, s, e, 'gx', 'gy');
      if (jf <= 3) { cand.push({ kind: 'jevpower', power: a.key, from: s, to: e, sec: +((e - s) / FPS).toFixed(1), at: +(s / FPS).toFixed(1), cueAt: +(f / FPS).toFixed(1), jevFlips: jf }); break; }
    }
  }
  // One per kind per 2s: keep the first passing window at each moment.
  const seen = new Set();
  out[name] = cand.filter(c => { const k = c.kind + Math.round(c.from / 60); if (seen.has(k)) return false; seen.add(k); return true; });
  const byKind = {}; for (const c of out[name]) (byKind[c.kind] ||= []).push(`${c.at}s${c.power ? '/' + c.power : ''}${c.dist != null ? '/' + c.dist : ''}`);
  console.log(name, 'frames', rows.length, 'audio', j.audio.length, JSON.stringify(byKind));
  execFileSync(FF, ['-y', '-v', 'error', '-i', `${S}/${name}.mp4`, '-vf',
    "fps=1,scale=180:320,drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':text='%{eif\\:n\\:d}':fontsize=28:fontcolor=yellow:x=6:y=6:borderw=2,tile=10x6",
    `${S}/sheets3/${name}-%02d.png`]);
}
writeFileSync(S + '/find3.json', JSON.stringify(out, null, 1));
