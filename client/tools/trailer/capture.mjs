import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { INSTALL_CLOCK } from './fixedstep.mjs';
const OUT = process.env.TRAILER_OUT || new URL('./.out/', import.meta.url).pathname.replace(/\/$/,'');
const REPO = process.env.REPO || new URL('../../../', import.meta.url).pathname.replace(/\/$/,'');
const FFMPEG = (process.env.FFMPEG||'ffmpeg');
export const FPS = 30, STEP_MS = 1000 / FPS;

/**
 * Drive the page on the fixed-step clock and stream every frame straight into
 * ffmpeg. Nothing is kept as loose images, so a long take costs one mp4.
 *
 * `tick(i, state)` runs each frame and may click -- that is how dialogue and
 * result gates get cleared mid-take, so rounds keep flowing on camera.
 */
export async function captureTake(p, { seconds, out, w, h, tick, label = '' }) {
  const frames = Math.round(seconds * FPS);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', 'pipe:0',
    '-vf', `scale=${w}:${h}:flags=lanczos,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', out]);
  ff.stderr.on('data', d => { const s = String(d).trim(); if (s) console.error('[ff]', s.slice(0, 200)); });

  await p.evaluate(INSTALL_CLOCK);
  const rowBase = await p.evaluate(() => (window.__capRows || []).length);
  const audioBase = await p.evaluate(() => (window.__audioLog || []).length);
  const vt0 = await p.evaluate(() => performance.now());
  const t0 = Date.now();

  for (let i = 0; i < frames; i++) {
    await p.evaluate(ms => window.__fixedStep.step(ms), STEP_MS);
    const buf = await p.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
    if (tick) await tick(i, frames);
    if (i && i % 300 === 0) {
      const pct = ((i / frames) * 100).toFixed(0);
      const eta = ((Date.now() - t0) / i * (frames - i) / 1000 / 60).toFixed(1);
      console.log(`[${label}] ${pct}% frame ${i}/${frames} eta ${eta}min`);
    }
  }
  ff.stdin.end();
  const [code] = await once(ff, 'close');
  if (code !== 0) throw new Error('ffmpeg exited ' + code);
  const rows = await p.evaluate(b => (window.__capRows || []).slice(b), rowBase);
  const audio = await p.evaluate(b => (window.__audioLog || []).slice(b), audioBase);
  return { frames, vt0, out,
    rows,                                  // one per frame (same pumped clock)
    audio: audio.map(a => ({ ...a, t: a.t - vt0 })),   // ms from take start
    wallSec: +((Date.now() - t0) / 1000).toFixed(0) };
}
