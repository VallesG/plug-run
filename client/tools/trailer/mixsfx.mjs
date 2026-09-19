// Rebuild the gameplay SFX bed from the game's OWN logged cues and OWN asset
// files. Each event is a real AudioManager.play() the game fired during the
// captured run, with the volume the game computed. Nothing is invented: if a
// cue is not in the log, it is not in the bed.
import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
const OUT = process.env.TRAILER_OUT || new URL('./.out/', import.meta.url).pathname;
const FFMPEG = (process.env.FFMPEG||'ffmpeg');
const SR = 48000, CH = 2;
const AUDIO_DIR = '/home/user/plug-run/client/public/audio';

const decodeCache = new Map();
function decode(key) {
  if (decodeCache.has(key)) return decodeCache.get(key);
  const src = ['wav', 'mp3', 'ogg'].map(e => `${AUDIO_DIR}/${key}.${e}`).find(existsSync);
  if (!src) { decodeCache.set(key, null); return null; }
  const raw = execFileSync(FFMPEG, ['-v', 'error', '-i', src, '-f', 'f32le',
    '-ar', String(SR), '-ac', String(CH), '-'], { maxBuffer: 1 << 28 });
  const pcm = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  decodeCache.set(key, pcm);
  return pcm;
}

export function mixSfx(events, durationMs, outPath) {
  const n = Math.ceil((durationMs / 1000) * SR) * CH;
  const bus = new Float32Array(n);
  const used = new Map(), missing = new Set();
  for (const ev of events) {
    const pcm = decode(ev.key);
    if (!pcm) { missing.add(ev.key); continue; }
    used.set(ev.key, (used.get(ev.key) || 0) + 1);
    const start = Math.max(0, Math.round((ev.t / 1000) * SR)) * CH;
    const g = Math.max(0, Math.min(1.5, ev.vol ?? 1));
    const len = Math.min(pcm.length, n - start);
    for (let i = 0; i < len; i++) bus[start + i] += pcm[i] * g;
  }
  // Peak-normalise only if we actually clipped; otherwise leave the game's
  // own relative levels alone.
  let peak = 0;
  for (let i = 0; i < n; i++) { const a = Math.abs(bus[i]); if (a > peak) peak = a; }
  const scale = peak > 0.99 ? 0.99 / peak : 1;
  const out = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) out.writeInt16LE(Math.max(-32768, Math.min(32767,
    Math.round(bus[i] * scale * 32767))), i * 2);
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + out.length, 4); hdr.write('WAVE', 8);
  hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20);
  hdr.writeUInt16LE(CH, 22); hdr.writeUInt32LE(SR, 24);
  hdr.writeUInt32LE(SR * CH * 2, 28); hdr.writeUInt16LE(CH * 2, 32); hdr.writeUInt16LE(16, 34);
  hdr.write('data', 36); hdr.writeUInt32LE(out.length, 40);
  writeFileSync(outPath, Buffer.concat([hdr, out]));
  return { cues: events.length, used: Object.fromEntries(used), missing: [...missing],
    peak: +peak.toFixed(3), normalised: scale !== 1 };
}
