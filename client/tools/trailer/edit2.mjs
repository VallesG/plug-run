// Trailer v2 edit: real captured frames, trailer-style text that sweeps across
// the screen, black title cards, the game's own music with its own SFX on top.
// node edit2.mjs <plan.json> <out.mp4>
//
// plan.json: { music, musicStart, segments: [
//   { src: 'v2-story', from: frame, to: frame, text?: [lines], tone?: 'white'|'blue'|'gold', sfx?: true },
//   { card: true, seconds, text: [lines], small?: 'line' },
//   { image: 'path.png', seconds, text?: [...] } ] }
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { mixSfx } from './mixsfx.mjs';
const S = process.env.TRAILER_OUT;
const FF = process.env.FFMPEG;
const FPS = 30, W = 1080, H = 1920;
const FONT = 'C\\:/Windows/Fonts/impact.ttf', FONT2 = 'C\\:/Windows/Fonts/bahnschrift.ttf';
const TONE = { white: '0xFFFFFF', blue: '0x9BCAE5', gold: '0xDEC386', red: '0xFF5A4E' };
const [planPath, outPath] = process.argv.slice(2);
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
mkdirSync(S + '/seg', { recursive: true });
const esc = (t) => String(t).replace(/\\/g, '\\\\').replace(/'/g, '\u2019').replace(/:/g, '\\:').replace(/%/g, '\\%').replace(/,/g, '\\,');

// A line enters fast from the right, drifts left while it holds, then whips
// off to the left: the trailer "sweep". Each line is offset slightly so a
// two-line title arrives as a stagger rather than a block.
function sweep(lines, D, { tone = 'white', size = 150, y0 = 0.40, gap = 1.28, small } = {}) {
  const out = [];
  lines.forEach((line, k) => {
    const d = 0.08 * k, fs = k === 0 ? size : Math.round(size * 0.82);
    const x = `(w-text_w)/2 + w*pow(max(0\\,1-(t-${d})/0.32)\\,3) - 70*(t-${d}) - w*pow(max(0\\,(t-${(D - 0.28).toFixed(2)})/0.28)\\,2)`;
    const y = `h*${y0}+${Math.round(k * size * gap)}`;
    out.push(`drawtext=fontfile='${FONT}':text='${esc(line)}':fontsize=${fs}:fontcolor=${TONE[k === 0 ? tone : 'white']}:` +
      `shadowcolor=0x000000@0.85:shadowx=6:shadowy=6:borderw=3:bordercolor=0x000000@0.6:x=${x}:y=${y}:enable='gte(t\\,${d})'`);
  });
  if (small) out.push(`drawtext=fontfile='${FONT2}':text='${esc(small)}':fontsize=46:fontcolor=0xFFFFFF@0.85:` +
    `x=(w-text_w)/2:y=h*${y0}+${Math.round(lines.length * size * gap + 20)}:alpha='min(1\\,max(0\\,(t-0.35)/0.25))'`);
  return out;
}

const segs = [], sfxEvents = [];
let clock = 0;
plan.segments.forEach((sg, i) => {
  const file = `${S}/seg/${String(i).padStart(2, '0')}.mp4`;
  let D, input, pre = [];
  if (sg.card) { D = sg.seconds; input = ['-f', 'lavfi', '-i', `color=c=0x05080A:s=${W}x${H}:r=${FPS}:d=${D}`]; }
  else if (sg.image) { D = sg.seconds; input = ['-loop', '1', '-t', String(D), '-i', sg.image];
    pre = [`scale=${W}:${H}:force_original_aspect_ratio=increase`, `crop=${W}:${H}`, `zoompan=z='1+0.0006*on':d=1:s=${W}x${H}:fps=${FPS}`]; }
  else { D = (sg.to - sg.from) / FPS; input = ['-ss', (sg.from / FPS).toFixed(3), '-t', D.toFixed(3), '-i', `${S}/${sg.src}.mp4`];
    // Game sound for this stretch, from the cues the game really fired.
    if (sg.sfx !== false) {
      const take = JSON.parse(readFileSync(`${S}/${sg.src}.json`, 'utf8'));
      for (const a of take.audio) { const t = a.t - sg.from * 1000 / FPS; if (t >= 0 && t < D * 1000) sfxEvents.push({ ...a, t: t + clock * 1000 }); }
    } }
  const vf = [...pre];
  // Punch in on the runner: centred on where the runner really is over the
  // clip (median of the recorded positions), same pixels, just closer.
  if (sg.zoom && sg.src) {
    const rows = JSON.parse(readFileSync(`${S}/${sg.src}.json`, 'utf8')).rows.slice(sg.from, sg.to).filter(r => r.live && r.x != null);
    const med = (a) => a.sort((m, n) => m - n)[Math.floor(a.length / 2)];
    const cx = med(rows.map(r => r.x)) * 2, cy = med(rows.map(r => r.y)) * 2;
    const cw = Math.round(W / sg.zoom / 2) * 2, ch = Math.round(H / sg.zoom / 2) * 2;
    const x = Math.max(0, Math.min(W - cw, Math.round(cx - cw / 2))), y = Math.max(0, Math.min(H - ch, Math.round(cy - ch / 2)));
    vf.push(`crop=${cw}:${ch}:${x}:${y}`, `scale=${W}:${H}:flags=lanczos`);
  }
  if (sg.card && !sg.text) {}
  if (sg.dim) vf.push(`drawbox=x=0:y=0:w=iw:h=ih:color=black@${sg.dim}:t=fill`);
  if (sg.text) vf.push(...sweep(sg.text, D, { tone: sg.tone, size: sg.size || (sg.card ? 170 : 140), y0: sg.y ?? (sg.card ? 0.42 : 0.12), small: sg.small }));
  vf.push(`fade=t=in:st=0:d=${sg.card ? 0.12 : 0.06}`, `fade=t=out:st=${(D - 0.08).toFixed(3)}:d=0.08`, 'format=yuv420p');
  execFileSync(FF, ['-y', '-v', 'error', ...input, '-vf', vf.join(','), '-r', String(FPS), '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', file]);
  segs.push({ file, D, kind: sg.card ? 'card' : sg.image ? 'image' : sg.src, from: sg.from, to: sg.to, text: sg.text });
  clock += D;
});
writeFileSync(S + '/seg/list.txt', segs.map(s => `file '${s.file.replace(/\\/g, '/')}'`).join('\n'));
const silent = S + '/seg/video.mp4';
execFileSync(FF, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', S + '/seg/list.txt', '-c', 'copy', silent]);

// Music: the game's own track, faded in and out, under the game's own SFX.
const sfxWav = S + '/seg/sfx.wav';
const sfx = mixSfx(sfxEvents, clock * 1000 + 500, sfxWav);
const music = plan.music;
execFileSync(FF, ['-y', '-v', 'error', '-i', silent, '-ss', String(plan.musicStart || 0), '-stream_loop', '-1', '-i', music, '-i', sfxWav,
  '-filter_complex', `[1:a]atrim=0:${clock.toFixed(2)},afade=t=in:d=0.6,afade=t=out:st=${(clock - 1.6).toFixed(2)}:d=1.6,volume=${plan.musicVol || 0.55}[m];` +
  `[2:a]atrim=0:${clock.toFixed(2)},volume=${plan.sfxVol || 1.0}[s];[m][s]amix=inputs=2:normalize=0,alimiter=limit=0.95,loudnorm=I=-15:TP=-1.5:LRA=11[a]`,
  '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outPath]);
writeFileSync(outPath.replace(/\.mp4$/, '.edl.json'), JSON.stringify({ seconds: +clock.toFixed(2), segs, sfx }, null, 1));
console.log('wrote', outPath, clock.toFixed(2) + 's', segs.length, 'segments; sfx cues', sfx.cues);
