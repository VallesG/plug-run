// Locate real moments in the v2 takes, and write 1-per-second contact sheets.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { findMoments } from './analyze.mjs';
const S = process.env.TRAILER_OUT, FF = process.env.FFMPEG;
mkdirSync(S + '/sheets', { recursive: true });
const report = {};
for (const take of ['story', 'deaths', 'rivals']) {
  const j = JSON.parse(readFileSync(`${S}/v2-${take}.json`, 'utf8'));
  const rows = j.rows, M = findMoments(rows);
  // A death: live HP falls to zero (the Plug got the runner).
  M.deaths = [];
  for (let i = 1; i < rows.length; i++) if (rows[i].live && rows[i - 1].live && rows[i - 1].hp > 0 && rows[i].hp <= 0) M.deaths.push({ frame: i });
  M.hits = [];
  for (let i = 1; i < rows.length; i++) if (rows[i].live && rows[i - 1].live && rows[i].hp < rows[i - 1].hp && rows[i].hp > 0) M.hits.push({ frame: i, hp: rows[i].hp });
  M.paused = []; let run = null;
  rows.forEach((r, i) => { const p = !r.live || r.paused; if (p && !run) run = { from: i }; if (!p && run) { run.to = i; M.paused.push(run); run = null; } });
  report[take] = { frames: rows.length, audio: j.audio.length,
    closeCalls: M.closeCalls.sort((a, b) => a.dist - b.dist).slice(0, 8), deaths: M.deaths, hits: M.hits.slice(0, 12), powers: M.powers,
    pickups: M.pickups.map(x => x.frame), extractions: M.extractions.map(x => x.frame), clears: M.clears.map(x => x.frame),
    gates: M.paused.filter(g => (g.to ?? rows.length) - g.from > 20).map(g => [g.from, g.to ?? rows.length]) };
  // 1 fps contact sheet, labelled by second.
  execFileSync(FF, ['-y', '-v', 'error', '-i', `${S}/v2-${take}.mp4`, '-vf',
    "fps=1,scale=180:320,drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':text='%{eif\\:n\\:d}':fontsize=28:fontcolor=yellow:x=6:y=6:borderw=2,tile=10x6",
    `${S}/sheets/${take}-%02d.png`]);
}
writeFileSync(S + '/moments2.json', JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) console.log(k, JSON.stringify({ ...v, gates: v.gates.slice(0, 30) }));
