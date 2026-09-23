// Trailer v3 edit, in the style of the first vertical cut: hard cuts of real
// play and character screens, the game's own SFX over a quiet music bed, the
// approved poster as the end card. No overlay text.
//
// node edit3.mjs <plan.json> <out.mp4> [--check]
// plan.json: { music, musicDb, segments: [
//   { src: 'v3-story-crossline', from, to, follow?: 'runner'|'jev', zoom?: 1.8, note },
//   { image: 'poster.png', seconds } ] }
//
// Every gameplay clip is screened for bot twitching before it is used: the
// runner (and, for Jev shots, Jev) may reverse direction at most MAX_FLIPS
// times in any half second, and the clip must be live play throughout unless
// it is a screen (dialogue, lobby, result) marked `screen: true`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { mixSfx } from './mixsfx.mjs';
const S = process.env.TRAILER_OUT, FF = process.env.FFMPEG;
const FPS = 30, W = 1080, H = 1920, MAX_FLIPS = 2, WIN = 15;
const [planPath, outPath, flag] = process.argv.slice(2);
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const takes = {};
const take = (src) => takes[src] ||= JSON.parse(readFileSync(`${S}/${src}.json`, 'utf8'));

/** Direction reversals within [start,end) of an (x,y) series, worst half-second window. */
function worstFlips(pts) {
  const rev = [];
  let prev = null;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (!a || !b) { prev = null; rev.push(0); continue; }
    const d = [b[0] - a[0], b[1] - a[1]];
    if (!d[0] && !d[1]) { rev.push(0); continue; }
    rev.push(prev && (prev[0] * d[0] + prev[1] * d[1]) < 0 ? 1 : 0);
    prev = d;
  }
  let worst = 0;
  for (let i = 0; i + WIN <= rev.length; i++) worst = Math.max(worst, rev.slice(i, i + WIN).reduce((s, v) => s + v, 0));
  return worst;
}
function screen(sg) {
  const rows = take(sg.src).rows.slice(sg.from, sg.to);
  const runner = rows.map(r => r.live && r.x != null && !r.paused ? [r.x, r.y] : null);
  const jev = rows.map(r => r.gx != null ? [r.gx, r.gy] : null);
  const out = { runnerFlips: worstFlips(runner), jevFlips: worstFlips(jev) };
  if (!sg.screen) {
    out.livePlay = rows.filter(r => r.live && !r.paused && !r.over).length / rows.length;
    // A death ends the round, so its clip is only mostly live play.
    if (out.livePlay < (sg.death ? 0.6 : 0.9)) out.fail = `only ${(out.livePlay * 100).toFixed(0)}% live play`;
    if (out.runnerFlips > MAX_FLIPS) out.fail = `runner reverses ${out.runnerFlips}x in half a second`;
  }
  if (sg.follow === 'jev') {
    if (jev.filter(Boolean).length < rows.length * 0.9) out.fail = 'Jev not on screen for the whole clip';
    if (out.jevFlips > MAX_FLIPS) out.fail = `Jev reverses ${out.jevFlips}x in half a second`;
  }
  return out;
}

/** A crop that follows a subject smoothly (0.5s moving average), as ffmpeg expressions. */
function follow(sg) {
  const rows = take(sg.src).rows.slice(sg.from, sg.to);
  const key = sg.follow === 'jev' ? ['gx', 'gy'] : ['x', 'y'];
  let last = null;
  const raw = rows.map(r => (r[key[0]] != null ? (last = [r[key[0]] * 2, r[key[1]] * 2]) : last));
  const first = raw.find(Boolean);
  const pts = raw.map(p => p || first);
  const sm = pts.map((_, i) => { const w = pts.slice(Math.max(0, i - 7), i + 8); return [w.reduce((s, p) => s + p[0], 0) / w.length, w.reduce((s, p) => s + p[1], 0) / w.length]; });
  const cw = Math.round(W / sg.zoom / 2) * 2, ch = Math.round(H / sg.zoom / 2) * 2;
  const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(v)));
  const keys = [];
  for (let i = 0; i < sm.length; i += 5) keys.push({ t: i / FPS, x: clamp(sm[i][0] - cw / 2, W - cw), y: clamp(sm[i][1] - ch / 2, H - ch) });
  // Piecewise-linear between keyframes every 5 frames.
  const expr = (k) => {
    let e = String(keys[keys.length - 1][k]);
    for (let i = keys.length - 2; i >= 0; i--) {
      const a = keys[i], b = keys[i + 1];
      e = `if(lt(t\\,${b.t.toFixed(3)})\\,${a[k]}+(${b[k] - a[k]})*(t-${a.t.toFixed(3)})/${(b.t - a.t).toFixed(3)}\\,${e})`;
    }
    return e;
  };
  return `crop=${cw}:${ch}:'${expr('x')}':'${expr('y')}',scale=${W}:${H}:flags=lanczos`;
}

mkdirSync(S + '/seg3', { recursive: true });
const report = [];
let bad = 0;
for (const sg of plan.segments) if (sg.src && !sg.video) {
  const r = screen(sg);
  report.push({ note: sg.note, src: sg.src, from: sg.from, to: sg.to, seconds: +((sg.to - sg.from) / FPS).toFixed(2), ...r });
  if (r.fail) { bad++; console.log('REJECT', sg.note, '-', r.fail); }
}
console.log(report.map(r => `${r.fail ? 'x' : 'ok'} ${r.note} ${r.seconds}s runner ${r.runnerFlips} jev ${r.jevFlips}`).join('\n'));
if (flag === '--check') process.exit(bad ? 1 : 0);
if (bad) throw new Error(bad + ' clip(s) failed the twitch screen');

const segs = [], sfxEvents = [];
let clock = 0;
plan.segments.forEach((sg, i) => {
  const file = `${S}/seg3/${String(i).padStart(2, '0')}.mp4`;
  let D, input, vf = [];
  if (sg.video) {
    // A Jev recording session's own video of Jev playing the game as the
    // runner (phone-size, variable frame rate). Framed on the action and
    // scaled up; its SFX are rebuilt from that session's event log.
    D = sg.dur; input = ['-ss', sg.start.toFixed(3), '-t', D.toFixed(3), '-i', sg.video];
    const vw = sg.vw || 390, vh = sg.vh || 844, z = sg.zoom || 1;
    const cw = Math.round(vw / z / 2) * 2, ch = Math.round(cw * H / W / 2) * 2;
    const x = Math.max(0, Math.min(vw - cw, Math.round(sg.cx * vw - cw / 2))), y = Math.max(0, Math.min(vh - ch, Math.round(sg.cy * vh - ch / 2)));
    vf.push('fps=' + FPS, `crop=${cw}:${ch}:${x}:${y}`, `scale=${W}:${H}:flags=lanczos`);
    for (const a of sg.sfx || []) if (a.t >= 0 && a.t < D * 1000) sfxEvents.push({ key: a.key, vol: a.vol, t: a.t + clock * 1000 });
  } else if (sg.image) {
    D = sg.seconds; input = ['-loop', '1', '-framerate', String(FPS), '-t', String(D), '-i', sg.image];
    vf.push(`scale=${W}:${H}:force_original_aspect_ratio=increase`, `crop=${W}:${H}`, 'fade=t=in:st=0:d=0.35');
  } else {
    D = (sg.to - sg.from) / FPS;
    input = ['-ss', (sg.from / FPS).toFixed(4), '-t', D.toFixed(4), '-i', `${S}/${sg.src}.mp4`];
    if (sg.follow) vf.push(follow(sg));
    // Only cues the game actually fired inside this window, rebased onto the cut.
    for (const a of take(sg.src).audio) { const t = a.t - sg.from * 1000 / FPS; if (t >= 0 && t < D * 1000) sfxEvents.push({ key: a.key, vol: a.vol, t: t + clock * 1000 }); }
  }
  vf.push('format=yuv420p');
  execFileSync(FF, ['-y', '-v', 'error', ...input, '-vf', vf.join(','), '-r', String(FPS), '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', file]);
  segs.push({ file, D, note: sg.note || (sg.image ? 'end card' : ''), src: sg.src, from: sg.from, to: sg.to, follow: sg.follow || null });
  clock += D;
});
writeFileSync(S + '/seg3/list.txt', segs.map(s => `file '${s.file.replace(/\\/g, '/')}'`).join('\n'));
const silent = S + '/seg3/video.mp4';
execFileSync(FF, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', S + '/seg3/list.txt', '-c', 'copy', silent]);
const sfxWav = S + '/seg3/sfx.wav';
const sfx = mixSfx(sfxEvents, clock * 1000 + 500, sfxWav);
// The bed: a game track looped under the SFX, fading out over the end card.
const db = plan.musicDb ?? -7, start = plan.musicStart ?? 0, fadeFrom = Math.max(0, clock - 1.8);
execFileSync(FF, ['-y', '-v', 'error', '-i', silent, '-i', sfxWav, '-stream_loop', '-1', '-i', plan.music, '-filter_complex',
  `[2:a]atrim=start=${start},asetpts=PTS-STARTPTS,volume=${db}dB,afade=t=in:st=0:d=0.4,afade=t=out:st=${fadeFrom.toFixed(2)}:d=1.8[m];` +
  `[1:a][m]amix=inputs=2:normalize=0:duration=first,atrim=0:${clock.toFixed(2)},alimiter=limit=0.94:level=disabled,loudnorm=I=-15:TP=-1.5:LRA=11[a]`,
  '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outPath]);
writeFileSync(outPath.replace(/\.mp4$/, '.edl.json'), JSON.stringify({ seconds: +clock.toFixed(2), segments: segs, screen: report, sfx }, null, 1));
console.log('wrote', outPath, clock.toFixed(2) + 's', segs.length, 'segments; sfx cues', sfx.cues, JSON.stringify(sfx.used));
