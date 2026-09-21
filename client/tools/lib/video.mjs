// Video of a recorded race, with a diagnostic strip under the gameplay.
//
// WHY NOT PLAYWRIGHT'S recordVideo
// recordVideo encodes through Playwright's own ffmpeg build, which
// playwright-core does not ship and would have to download. Chrome itself
// already carries an H.264 encoder behind MediaRecorder, so the page records
// its own canvas: a broadly playable MP4 with no download and no system
// ffmpeg. WebM (VP9/VP8) is the fallback only when a browser cannot do H.264.
//
// WHAT IS IN THE PICTURE
// The game canvas, untouched, at the run's viewport size — nothing else by
// default. With stats on (--videoStats) a diagnostic strip is appended BELOW
// the board, so it can never cover gameplay; it is redrawn twice a second
// from counters the page already has and shows counts, labels and money,
// never a key, header, request body or environment value. The timeline in
// the adjacent .events.json is recorded either way.
//
// TIMING
// The page runs at real speed; nothing here touches the simulation clock.
// Frames are composited at <=30fps on requestAnimationFrame, off the game's
// own loop, and the composite rate actually achieved is reported with the
// file, so a video that could not keep up says so.

import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export const STRIP_PX = 112;

/** Runs in the page, before any game script. Everything it needs is passed in. */
function pageSide({ strip, fps }) {
  const TYPES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1',
    'video/webm;codecs=vp9', 'video/webm;codecs=vp8'];
  const mime = TYPES.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || null;
  // Video time zero is the first recorded frame, not page init: the game canvas
  // appears a second or two after boot, and stamping from init put every
  // event that much late against the file.
  let t0 = performance.now();
  const state = { mime, frames: 0, started: false, stopped: false, events: [] };
  window.__plugRunVideo = state;

  // --- timeline: the moments worth scrubbing to, in video time and race time
  const ev = (kind, detail = {}) => {
    const race = window.__plugRunLiveScene?.rivals?.race;
    const raceMs = race?.startedAt != null ? Math.max(0, performance.now() - race.startedAt) : null;
    const e = { kind, videoMs: Math.round(performance.now() - t0), raceMs: raceMs == null ? null : Math.round(raceMs), ...detail };
    state.events.push(e);
    window.__plugRunVideoEvent?.(e);
  };

  // --- what the strip shows. Race state from the scene, strategy state from
  // the strategist's own report and timeline; nothing is inferred here.
  let last = { clears: 0, retries: 0, status: null, carrying: false, tl: 0 };
  let text = ['waiting for the race…'];

  function sample() {
    const s = window.__plugRunLiveScene;
    const race = s?.rivals?.race;
    const jev = window.__plugRunJevStrategist;
    const now = performance.now();
    if (!s || !race) { text = ['waiting for the race…']; return; }

    const clears = race.clearTimes?.length ?? 0;
    const retries = race.retries ?? 0;
    if (race.status !== last.status) ev('status', { status: race.status, result: race.result ?? null });
    if (clears > last.clears) ev('house-clear', { house: clears, strategistActive: !!jev && !jev.budgetStopped });
    if (retries > last.retries) ev('retry', { retries, house: clears + 1 });
    const carrying = !!s.hasStash;
    if (carrying && !last.carrying) ev('pickup', { house: clears + 1 });
    if (!carrying && last.carrying && clears > last.clears) ev('extract', { house: clears });

    // The strategist's own timeline, re-stamped into video time. Its t is ms
    // since its first tick, so absolute = startedAt + t.
    if (jev?.timeline) {
      const tl = jev.timeline;
      for (const e of tl) {
        if (e.seq <= (jev._tlSeen ?? 0)) continue;
        const at = (jev.startedAt ?? now) + e.t;
        const { t, kind, seq, ...rest } = e;
        const raceMs = race.startedAt != null ? Math.round(Math.max(0, at - race.startedAt)) : null;
        const out = { kind: 'jev-' + kind, videoMs: Math.round(at - t0), raceMs, ...rest };
        state.events.push(out);
        window.__plugRunVideoEvent?.(out);
      }
      jev._tlSeen = tl.length ? tl[tl.length - 1].seq : (jev._tlSeen ?? 0);
    }

    const sel = s.runnerPowersSelected || [];
    const used = s.runnerPowersConsumed || [];
    const left = sel.filter((_, i) => !used[i]);
    const secs = race.startedAt == null ? 0 : ((race.status === 'finished' ? race.finishedMs : now - race.startedAt) / 1000);
    const mm = Math.floor(secs / 60), ss = (secs % 60).toFixed(1).padStart(4, '0');
    const head = `HOUSE ${Math.min(7, clears + 1)}/7  cleared ${clears}  ${mm}:${ss}  retries ${retries}  ${race.status}`;

    if (!jev) {
      text = [head, 'no strategist — runner AI on its own objective', `powers left ${left.length ? left.join(',') : 'none'}`];
    } else {
      const r = jev.report();
      const c = jev.current || {};
      const st = r.strategies || {};
      const rej = Object.values(st.rejected || {}).reduce((a, b) => a + b, 0);
      const w = r.watchdog || {};
      const pw = r.powers || {};
      const lp = pw.last ? `${pw.last.name}:${pw.last.result.replace('rejected:', 'rej ')}` : '—';
      const share = Math.round((r.time?.strategyActiveShare ?? 0) * 100);
      text = [
        head,
        `OBJ ${c.objective ?? '—'} [${c.source ?? '—'}]  ${c.posture ?? '—'}  conf ${c.confidence != null ? c.confidence.toFixed(2) : '—'}  age ${c.ageMs != null ? (c.ageMs / 1000).toFixed(1) + 's' : '—'}`,
        `jev req ${r.logicalRequests}/${r.requestLimit}  adopted ${st.adopted ?? 0}  rejected ${rej}  held ${st.objectiveHeld ?? 0}  active ${share}%`,
        `MOTOR runner-ai  ${c.recovering ? 'RECOVERY ACTIVE' : 'recovery off'}  stalls ${w.stalls ?? 0}  recov ${w.recoveries ?? 0} (ok ${w.restored ?? 0})`,
        `powers left ${left.length ? left.join(',') : 'none'}  armed ${c.armedPower ?? '—'}  req ${pw.requested ?? 0} act ${pw.activated ?? 0}  last ${lp}`,
        `tokens ${(r.tokensBilled || r.tokensApprox || 0).toLocaleString('en-US')} (${r.tokenSource})  ~$${(r.costUsd ?? 0).toFixed(4)}  ` +
          (r.budgetStopped ? `BUDGET STOPPED:${r.budgetStopped}` : 'budget ok') + (r.route === 'mock' ? '  [MOCK]' : '')
      ];
    }
    last = { clears, retries, status: race.status, carrying };
  }

  // The frame is the viewport, not the canvas's backing store: the game is
  // drawn where the player would see it, so the video is the run's viewport
  // plus the strip. Even dimensions, because H.264 wants them.
  function start(game) {
    if (state.started || !mime) return;
    state.started = true;
    t0 = performance.now();
    state.startedAt = t0;
    const W = innerWidth & ~1, H = innerHeight & ~1;
    const out = document.createElement('canvas');
    out.width = W; out.height = H + strip;
    const g = out.getContext('2d');
    const rec = new MediaRecorder(out.captureStream(fps), { mimeType: mime, videoBitsPerSecond: 2_500_000 });
    // Chunks leave the page as they are made, so a crash loses seconds, not
    // the run. Chained, not parallel: the file is only valid in order.
    let pending = Promise.resolve();
    rec.ondataavailable = (e) => {
      if (!e.data?.size) return;
      const blob = e.data;
      pending = pending.then(() => blob.arrayBuffer()).then((buf) => {
        let bin = ''; const u = new Uint8Array(buf);
        for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
        return window.__plugRunVideoChunk(btoa(bin), mime);
      });
    };
    const stopped = new Promise((res) => { rec.onstop = res; });
    rec.start(1000);
    ev('video-start', { width: W, height: H + strip, mime });
    const sampler = setInterval(sample, 500);

    let nextAt = 0;
    const frame = (t) => {
      if (state.stopped) return;
      requestAnimationFrame(frame);
      if (t < nextAt) return;
      nextAt = t + 1000 / fps - 2;
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H + strip);
      const r = game.getBoundingClientRect();
      g.drawImage(game, r.left, r.top, r.width, r.height);
      if (strip > 0) {
        g.fillStyle = '#0b0f14'; g.fillRect(0, H, W, strip);
        g.fillStyle = '#9fe870'; g.font = '11px ui-monospace, Consolas, monospace';
        text.forEach((line, i) => g.fillText(line, 6, H + 16 + i * 16));
      }
      state.frames++;
    };
    requestAnimationFrame(frame);

    window.__plugRunVideoStop = async () => {
      if (state.stopped) return state;
      sample();
      ev('video-stop');
      state.stopped = true;
      clearInterval(sampler);
      rec.stop();
      await stopped;
      await pending;
      state.durationMs = Math.round(performance.now() - state.startedAt);
      return { mime: state.mime, frames: state.frames, durationMs: state.durationMs, events: state.events };
    };
  }

  // Recording starts as soon as the game canvas exists, so the countdown and
  // race start are in the file.
  const boot = setInterval(() => {
    const c = document.querySelector('canvas');
    if (!c) return;
    clearInterval(boot);
    start(c);
  }, 50);
}

/**
 * Arm video capture on a page. Call before page.goto().
 * Returns { stop() } — stop() finalizes the file and returns what was made.
 */
export async function installVideo(page, { dir, tag, fps = 30, stats = false }) {
  mkdirSync(dir, { recursive: true });
  const base = join(dir, `${tag}-${Date.now()}`);
  let stream = null, path = null, bytes = 0;
  const events = [];
  await page.exposeFunction('__plugRunVideoChunk', (b64, mime) => {
    if (!stream) {
      mime = mime || '';
      path = base + (mime.includes('mp4') ? '.mp4' : '.webm');
      stream = createWriteStream(path);
    }
    const buf = Buffer.from(b64, 'base64');
    bytes += buf.length;
    return new Promise((res) => stream.write(buf, res));
  });
  await page.exposeFunction('__plugRunVideoEvent', (e) => {
    events.push(e);
  });
  await page.addInitScript(pageSide, { strip: stats ? STRIP_PX : 0, fps });

  return {
    events,
    async stop() {
      const res = await page.evaluate(() => window.__plugRunVideoStop?.() ?? window.__plugRunVideo ?? null)
        .catch((e) => ({ error: e.message }));
      if (stream) await new Promise((r) => stream.end(r));
      if (!path) return { ok: false, reason: res?.mime === null ? 'no MediaRecorder codec' : 'no video data', ...res };
      const out = { ok: true, path, bytes: statSync(path).size, mime: res?.mime ?? null,
        frames: res?.frames ?? null, durationMs: res?.durationMs ?? null,
        compositeFps: res?.frames && res?.durationMs ? +(res.frames / (res.durationMs / 1000)).toFixed(1) : null };
      // WebM only when H.264 was not available; transcode it if ffmpeg is here.
      if (path.endsWith('.webm') && ffmpegAvailable()) {
        const mp4 = base + '.mp4';
        const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path, '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
        if (r.status === 0 && existsSync(mp4)) {
          out.webm = path; out.path = mp4; out.bytes = statSync(mp4).size; out.mime = 'video/mp4;codecs=avc1';
          if (!process.argv.includes('--keepWebm')) { unlinkSync(path); delete out.webm; }
        }
      }
      return out;
    }
  };
}

/**
 * What is actually in an MP4, read from its boxes — no ffprobe needed.
 *
 * Chrome's MediaRecorder writes FRAGMENTED MP4: moov carries no duration and
 * the samples live in moof/traf/trun boxes. So duration and frame count are
 * summed from the fragments, which is also the honest number — it is what a
 * player will play, not what a header claims.
 */
export function probeMp4(path) {
  const buf = readFileSync(path);
  const out = { codec: null, width: null, height: null, timescale: null, frames: 0, ticks: 0 };
  let defaultDur = 0;
  const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'moof', 'traf', 'mvex']);
  const walk = (start, end) => {
    for (let p = start; p + 8 <= end;) {
      let size = buf.readUInt32BE(p);
      const type = buf.toString('latin1', p + 4, p + 8);
      let hdr = 8;
      if (size === 1) { size = Number(buf.readBigUInt64BE(p + 8)); hdr = 16; }
      else if (size === 0) size = end - p;
      if (size < hdr) break;
      const body = p + hdr;
      if (CONTAINERS.has(type)) walk(body, p + size);
      else if (type === 'tkhd' && out.width == null) {
        const v = buf[body];
        const off = body + (v === 1 ? 88 : 76);
        out.width = buf.readUInt32BE(off) / 65536; out.height = buf.readUInt32BE(off + 4) / 65536;
      } else if (type === 'mdhd' && out.timescale == null) {
        out.timescale = buf.readUInt32BE(body + (buf[body] === 1 ? 20 : 12));
      } else if (type === 'stsd' && !out.codec) {
        out.codec = buf.toString('latin1', body + 12, body + 16);
      } else if (type === 'trex') {
        defaultDur = buf.readUInt32BE(body + 12);
      } else if (type === 'tfhd') {
        const flags = buf.readUInt32BE(body) & 0xffffff;
        let o = body + 8;
        if (flags & 0x1) o += 8; if (flags & 0x2) o += 4;
        if (flags & 0x8) defaultDur = buf.readUInt32BE(o);
      } else if (type === 'trun') {
        const flags = buf.readUInt32BE(body) & 0xffffff;
        const n = buf.readUInt32BE(body + 4);
        let o = body + 8;
        if (flags & 0x1) o += 4; if (flags & 0x4) o += 4;
        const per = ((flags & 0x100) ? 4 : 0) + ((flags & 0x200) ? 4 : 0) + ((flags & 0x400) ? 4 : 0) + ((flags & 0x800) ? 4 : 0);
        for (let i = 0; i < n; i++, o += per) out.ticks += (flags & 0x100) ? buf.readUInt32BE(o) : defaultDur;
        out.frames += n;
      }
      p += size;
    }
  };
  walk(0, buf.length);
  const seconds = out.timescale ? out.ticks / out.timescale : null;
  return { codec: out.codec, width: out.width, height: out.height, frames: out.frames,
    durationS: seconds == null ? null : +seconds.toFixed(2),
    fps: seconds ? +(out.frames / seconds).toFixed(2) : null, bytes: buf.length };
}

function ffmpegAvailable() {
  try { return spawnSync('ffmpeg', ['-version']).status === 0; } catch { return false; }
}
