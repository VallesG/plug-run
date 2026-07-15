// ReplaySystem — records the last round and plays it back for viewing/sharing.
//
// RECORDING (15Hz): walks the display list INCLUDING container children
// (players/stash are containers), snapshotting each visual leaf with its
// WORLD transform. Supported leaves: Sprite, Image, Arc, Rectangle, Ellipse,
// Text. Containers that hold Graphics (the stash duffels, carry package) are
// baked to a texture once via RenderTexture and tracked as a single image.
// Top-level static Graphics (floor detail, wall trim) are baked into one
// maze-sized texture in the keyframe. First sample = full keyframe (includes
// the maze); later samples store diffs only. Only the last ~45s is kept.
//
// PLAYBACK: fully self-contained — opaque backdrop, ghost objects puppeted
// through the diffs with position/rotation interpolation, recorded camera
// scroll applied. Works even after the scene restarted into a new maze.
//
// SHARING: canvas captureStream + MediaRecorder during playback (MP4 where
// supported, WebM fallback) → navigator.share() (native share sheet with
// TikTok/IG/X on mobile) or a download on desktop.

import Phaser from 'phaser';

const SAMPLE_MS = 66;                                   // ~15Hz
const MAX_SAMPLES = Math.round(45_000 / SAMPLE_MS);     // keep last ~45s
const GHOST_DEPTH_BASE = 30_000;                        // above modals (Z=20k)
const HUD_DEPTH = 31_000;
const MIN_ALPHA = 0.02;                                 // skip invisible sensors

const TMP_M1 = new Phaser.GameObjects.Components.TransformMatrix();
const TMP_M2 = new Phaser.GameObjects.Components.TransformMatrix();

let rec = null;        // active recording
let lastReplay = null; // finalized { keyframe, keyCam, samples, meta, texKeys }
let epoch = 0;         // bumps per recording, keeps baked texture keys unique

// ---------------------------------------------------------------------------
// snapshot helpers
// ---------------------------------------------------------------------------

function worldXform(o) {
  if (o.parentContainer) {
    const m = o.getWorldTransformMatrix(TMP_M1, TMP_M2);
    return { x: m.getX(0, 0), y: m.getY(0, 0), r: m.rotation, sx: m.scaleX, sy: m.scaleY };
  }
  return { x: o.x, y: o.y, r: o.rotation, sx: o.scaleX, sy: o.scaleY };
}

function baseSnap(o, effAlpha, depthOverride) {
  const w = worldXform(o);
  return {
    x: Math.round(w.x * 10) / 10,
    y: Math.round(w.y * 10) / 10,
    r: Math.round(w.r * 1000) / 1000,
    sx: Math.round(w.sx * 100) / 100,
    sy: Math.round(w.sy * 100) / 100,
    a: Math.round(effAlpha * 100) / 100,
    d: depthOverride ?? o.depth,
    ox: o.originX ?? 0.5,
    oy: o.originY ?? 0.5,
    bm: (o.blendMode && o.blendMode !== Phaser.BlendModes.NORMAL) ? o.blendMode : 0
  };
}

function snapLeaf(o, effAlpha, depthOverride) {
  const type = o.type;
  if (type === 'Sprite' || type === 'Image') {
    return {
      ty: 'i', ...baseSnap(o, effAlpha, depthOverride),
      k: o.texture?.key ?? null,
      f: (o.frame && o.frame.name !== '__BASE') ? o.frame.name : null,
      fx: !!o.flipX, fy: !!o.flipY,
      t: o.isTinted ? o.tintTopLeft : null,
      tf: o.isTinted ? !!o.tintFill : false
    };
  }
  if (type === 'Arc') {
    return { ty: 'a', ...baseSnap(o, effAlpha, depthOverride), rad: o.radius, fc: o.fillColor, fa: o.fillAlpha,
             st: o.isStroked ? { c: o.strokeColor, w: o.lineWidth } : null };
  }
  if (type === 'Rectangle') {
    return { ty: 'r', ...baseSnap(o, effAlpha, depthOverride), w: o.width, h: o.height, fc: o.fillColor, fa: o.fillAlpha,
             st: o.isStroked ? { c: o.strokeColor, w: o.lineWidth } : null };
  }
  if (type === 'Ellipse') {
    return { ty: 'e', ...baseSnap(o, effAlpha, depthOverride), w: o.width, h: o.height, fc: o.fillColor, fa: o.fillAlpha };
  }
  if (type === 'Text') {
    return { ty: 't', ...baseSnap(o, effAlpha, depthOverride), txt: o.text,
             fs: o.style?.fontSize || '14px', col: o.style?.color || '#ffffff',
             fst: o.style?.fontStyle || '' };
  }
  return null;
}

// Bake a Graphics-bearing container (stash duffel, carry package) to a texture.
function snapContainerUnit(scene, c, effAlpha, inheritDepth) {
  const key = `__rply_c${c._rid}_e${epoch}`;
  if (!scene.textures.exists(key)) {
    try {
      const b = c.getBounds(); // world-space union of measurable children
      const cell = scene.cell || 24;
      const bw = Math.max(b.width, cell), bh = Math.max(b.height, cell);
      const pad = Math.ceil(Math.max(12, bw * 0.3, bh * 0.3));
      const w = Math.ceil(bw + pad * 2), h = Math.ceil(bh + pad * 2);
      const bx = (b.width > 0 ? b.x : c.x - bw / 2) - pad;
      const by = (b.height > 0 ? b.y : c.y - bh / 2) - pad;
      const rt = scene.make.renderTexture({ width: w, height: h }, false);
      rt.draw(c, c.x - bx, c.y - by);
      rt.saveTexture(key);
      rt.destroy();
      rec.texKeys.push(key);
      rec.texMeta.set(key, { nox: (c.x - bx) / w, noy: (c.y - by) / h });
    } catch { return null; }
  }
  const meta = rec.texMeta.get(key);
  if (!meta) return null;
  const s = { ty: 'i', ...baseSnap(c, effAlpha, inheritDepth), k: key, f: null, fx: false, fy: false, t: null, tf: false };
  if (c.isPackage) s.pkg = 1;
  s.ox = meta.nox; s.oy = meta.noy;
  return s;
}

// Bake all static top-level Graphics (floor marks, wall trim) into ONE
// maze-sized texture at keyframe time. Dynamic overlays (halos, beacons,
// aim lines) live at depth >= 900 in this codebase and are excluded.
function snapStaticGraphics(scene) {
  const gfx = scene.children.list.filter(o =>
    o.type === 'Graphics' && !o._isReplayGhost && o.visible && o.depth < 900
    && !(o.scrollFactorX === 0 && o.scrollFactorY === 0));
  if (!gfx.length) return null;
  const cb = scene.cameras.main.getBounds();
  if (!cb || cb.width <= 0 || cb.height <= 0) return null;
  const key = `__rply_gfx_e${epoch}`;
  try {
    if (!scene.textures.exists(key)) {
      const rt = scene.make.renderTexture({ width: Math.ceil(cb.width), height: Math.ceil(cb.height) }, false);
      for (const g of gfx) rt.draw(g, g.x - cb.x, g.y - cb.y);
      rt.saveTexture(key);
      rt.destroy();
      rec.texKeys.push(key);
    }
  } catch { return null; }
  return { ty: 'i', x: cb.x, y: cb.y, r: 0, sx: 1, sy: 1, a: 1, d: 0.5, ox: 0, oy: 0, bm: 0,
           k: key, f: null, fx: false, fy: false, t: null, tf: false };
}

function walk(scene, list, out, parentVisible, parentAlpha, inheritDepth) {
  for (const o of list) {
    if (o._isReplayGhost) continue;
    if (!parentVisible || !o.visible) continue;
    if (!o.parentContainer && o.scrollFactorX === 0 && o.scrollFactorY === 0) continue; // UI

    if (o.type === 'Container') {
      const effA = parentAlpha * o.alpha;
      if (effA < MIN_ALPHA) continue;
      const hasGfx = o.list?.some?.(ch => ch.type === 'Graphics');
      if (o._rid === undefined) o._rid = rec.nextId++;
      if (hasGfx) {
        const s = snapContainerUnit(scene, o, effA, inheritDepth);
        if (s) out.push({ id: o._rid, s });
      } else {
        // Children render at the ROOT container's depth in Phaser, not
        // their own depth property — carry it down.
        walk(scene, o.list, out, true, effA, inheritDepth ?? o.depth);
      }
      continue;
    }

    const effA = parentAlpha * o.alpha;
    if (effA < MIN_ALPHA) continue;
    const s = snapLeaf(o, effA, inheritDepth);
    if (!s) continue;
    if (o._rid === undefined) o._rid = rec.nextId++;
    out.push({ id: o._rid, s });
  }
}

function sig(s) { return JSON.stringify(s); } // small objects; simple + correct

function takeSample(scene, isKeyframe) {
  const found = [];
  walk(scene, scene.children.list, found, true, 1, null);
  if (isKeyframe) {
    const floorGfx = snapStaticGraphics(scene);
    if (floorGfx) found.unshift({ id: rec.nextId++, s: floorGfx });
  }

  const seen = new Set();
  const born = [], moved = [];
  for (const { id, s } of found) {
    seen.add(id);
    const prevSig = rec.lastSig.get(id);
    const newSig = sig(s);
    if (prevSig === undefined) born.push({ id, s });
    else if (prevSig !== newSig) moved.push({ id, s });
    rec.lastSig.set(id, newSig);
  }
  const dead = [];
  for (const id of rec.lastSig.keys()) {
    if (!seen.has(id)) { dead.push(id); rec.lastSig.delete(id); }
  }
  const cam = scene.cameras.main;
  return { born, moved, dead, cam: { sx: Math.round(cam.scrollX), sy: Math.round(cam.scrollY) } };
}

function foldOldest() {
  const s = rec.samples.shift();
  if (!s) return;
  for (const b of s.born) rec.keyframe.set(b.id, b.s);
  for (const m of s.moved) rec.keyframe.set(m.id, m.s);
  for (const id of s.dead) rec.keyframe.delete(id);
  rec.keyCam = s.cam;
}

// ---------------------------------------------------------------------------

const ReplaySystem = {
  /** Call from startMatch(). Resets the active recording; does NOT touch
   *  lastReplay, so the previous round stays watchable from pre-round menus. */
  begin(scene) {
    epoch++;
    rec = {
      keyframe: new Map(), keyCam: null, samples: [],
      accum: 0, started: false, nextId: 1,
      lastSig: new Map(), texKeys: [], texMeta: new Map(),
      textures: scene.textures,
      meta: { role: scene.role, round: scene.pveRound || 1, cell: scene.cell || 24 }
    };
  },

  /** Call once at the top of the scene's update(). */
  tick(scene, delta) {
    if (!rec) return;
    if (scene.roundOver) { this._finalize(); return; }
    if (scene.roundPausedForMenu) return;

    rec.accum += delta;
    if (rec.accum < SAMPLE_MS && rec.started) return;
    rec.accum = 0;

    if (!rec.started) {
      rec.started = true;
      rec.meta.role = scene.role;
      rec.meta.round = scene.pveRound || 1;
      const first = takeSample(scene, true);
      for (const b of first.born) rec.keyframe.set(b.id, b.s);
      rec.keyCam = first.cam;
      return;
    }
    rec.samples.push(takeSample(scene, false));
    while (rec.samples.length > MAX_SAMPLES) foldOldest();
  },

  /** Explicitly finalize the active recording. Round-end code calls this
   *  synchronously BEFORE building end-of-round modals, so hasReplay() is
   *  accurate in the same frame the round ends. Safe to call repeatedly. */
  finalize() { this._finalize(); },

  _finalize() {
    if (!rec || !rec.started || rec.samples.length < 8) { rec = null; return; }
    // free baked textures from the replay we're replacing
    if (lastReplay?.texKeys?.length && lastReplay.textures) {
      for (const k of lastReplay.texKeys) { try { lastReplay.textures.remove(k); } catch {} }
    }
    lastReplay = {
      keyframe: rec.keyframe, keyCam: rec.keyCam, samples: rec.samples,
      meta: rec.meta, texKeys: rec.texKeys, textures: rec.textures
    };
    rec = null;
  },

  /** Pass a role to only match replays recorded in that role. */
  hasReplay(role) {
    return !!lastReplay && (!role || lastReplay.meta.role === role);
  },
  getMeta() { return lastReplay?.meta ?? null; },
  getLastClip() { return this._clip ?? null; },

  // -------------------------------------------------------------------------
  // playback
  // -------------------------------------------------------------------------

  play(scene, opts = {}) {
    if (!lastReplay || this._playing) { opts.onDone?.(); return; }
    this._playing = true;
    const { record = true, autoShare = false, onDone } = opts;
    const data = lastReplay;
    const meta = data.meta;
    const durationMs = data.samples.length * SAMPLE_MS;

    const W = scene.scale.gameSize.width;
    const H = scene.scale.gameSize.height;
    const cx = scene.cameras.main.centerX;
    const cy = scene.cameras.main.centerY;

    const all = [];
    const mk = (o) => { o._isReplayGhost = true; o.setScrollFactor(0); all.push(o); return o; };

    mk(scene.add.rectangle(cx, cy, W + 4, H + 4, 0x05070d, 1)
      .setDepth(GHOST_DEPTH_BASE - 1).setInteractive());

    const ghosts = new Map();
    let camFrom = { ...(data.keyCam || { sx: 0, sy: 0 }) };
    let camTo = { ...camFrom };
    let seq = 0;

    const ghostDepth = (d) => GHOST_DEPTH_BASE + Math.max(-100, Math.min(d, 5000)) * 1e-3 + (seq++) * 1e-7;

    const applyMut = (g, s) => {
      // step-applied (non-lerped) attributes
      g.setAlpha(s.a);
      g.setDepth(g._gd ?? (g._gd = ghostDepth(s.d)));
      if (s.ty === 'i') {
        if (s.k && (g.texture?.key !== s.k || g._f !== s.f)) {
          try { g.setTexture(s.k, s.f ?? undefined); g._f = s.f; } catch {}
        }
        g.setFlip(s.fx, s.fy);
        if (s.t === null) g.clearTint();
        else if (s.tf) g.setTintFill(s.t); else g.setTint(s.t);
      } else if (s.ty === 't') {
        if (g.text !== s.txt) g.setText(s.txt);
        g.setColor(s.col);
      } else if (s.ty === 'a' || s.ty === 'r' || s.ty === 'e') {
        g.setFillStyle(s.fc, s.fa);
        if (s.st) g.setStrokeStyle(s.st.w, s.st.c);
      }
      g.setOrigin(s.ox, s.oy);
      g.setScale(s.sx, s.sy);
      if (s.bm) g.setBlendMode(s.bm);
    };

    const spawnGhost = (id, s) => {
      let g = null;
      try {
        if (s.ty === 'i') g = scene.add.image(0, 0, s.k, s.f ?? undefined);
        else if (s.ty === 'a') g = scene.add.circle(0, 0, s.rad, s.fc, s.fa);
        else if (s.ty === 'r') g = scene.add.rectangle(0, 0, s.w, s.h, s.fc, s.fa);
        else if (s.ty === 'e') g = scene.add.ellipse(0, 0, s.w, s.h, s.fc, s.fa);
        else if (s.ty === 't') g = scene.add.text(0, 0, s.txt, { fontSize: s.fs, color: s.col, fontStyle: s.fst });
      } catch { g = null; }
      if (!g) return;
      mk(g);
      g._f = s.f;
      g._fx2 = s.x; g._fy2 = s.y; g._tx = s.x; g._ty = s.y;
      g._fr = s.r; g._tr = s.r;
      g._wx = s.x; g._wy = s.y;
      applyMut(g, s);
      if (s.pkg) {
        const rd = g._gd ?? 0;
        const r1 = mk(scene.add.circle(0, 0, 16, 0x000000, 0)
          .setStrokeStyle(3, 0x86efac, 0.9).setDepth(rd + 5e-4));
        const r2 = mk(scene.add.circle(0, 0, 22, 0x000000, 0)
          .setStrokeStyle(1, 0x86efac, 0.4).setDepth(rd + 5e-4));
        g._rings = [r1, r2];
      }
      ghosts.set(id, g);
    };

    for (const [id, s] of data.keyframe) spawnGhost(id, s);

    // --- HUD (baked into the shared clip = free branding) ---
    const accent = meta.role === 'plug' ? '#ff6b6b' : '#4db2ff';
    const roleName = meta.role === 'plug' ? 'PLUG' : 'RUNNER';
    mk(scene.add.text(cx, 18, 'PLUGRUN.IO', {
      color: '#e7ebff', fontSize: '15px', fontStyle: 'bold'
    }).setOrigin(0.5, 0).setDepth(HUD_DEPTH).setAlpha(0.9));
    mk(scene.add.text(cx, 38, `ROUND ${meta.round} \u2022 ${roleName}`, {
      color: accent, fontSize: '11px', fontStyle: 'bold'
    }).setOrigin(0.5, 0).setDepth(HUD_DEPTH).setAlpha(0.9));
    const replayChip = mk(scene.add.text(14, 16, '\u25CF REPLAY', {
      color: '#ff5b5b', fontSize: '11px', fontStyle: 'bold'
    }).setOrigin(0, 0).setDepth(HUD_DEPTH));
    scene.tweens.add({ targets: replayChip, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });

    const barW = Math.min(W - 28, 460);
    mk(scene.add.rectangle(cx, H - 16, barW, 4, 0xffffff, 0.14).setDepth(HUD_DEPTH));
    const barFill = mk(scene.add.rectangle(cx - barW / 2, H - 16, 1, 4, 0xffffff, 0.75)
      .setOrigin(0, 0.5).setDepth(HUD_DEPTH));
    const skip = mk(scene.add.text(W - 14, 14, '\u2715', {
      color: '#8a92b8', fontSize: '16px'
    }).setOrigin(1, 0).setDepth(HUD_DEPTH).setInteractive({ useHandCursor: true }));

    // --- video capture ---
    let recorder = null, chunks = [], mime = '';
    if (record && typeof MediaRecorder !== 'undefined' && scene.game.canvas?.captureStream) {
      const mimes = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
      mime = mimes.find(m => MediaRecorder.isTypeSupported(m)) || '';
      try {
        recorder = new MediaRecorder(scene.game.canvas.captureStream(30),
          mime ? { mimeType: mime, videoBitsPerSecond: 4_000_000 } : undefined);
        recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
        recorder.start(500);
      } catch { recorder = null; }
    }

    // --- playback loop ---
    let elapsed = 0, segment = -1, finished = false;

    const applySample = (s) => {
      for (const b of s.born) spawnGhost(b.id, b.s);
      for (const m of s.moved) {
        const g = ghosts.get(m.id);
        if (!g) continue;
        g._fx2 = g._wx; g._fy2 = g._wy; g._fr = g._tr;
        g._tx = m.s.x; g._ty = m.s.y; g._tr = m.s.r;
        applyMut(g, m.s);
      }
      for (const id of s.dead) {
        const g = ghosts.get(id);
        if (g) { g._rings?.forEach(r => r.destroy()); g.destroy(); }
        ghosts.delete(id);
      }
      camFrom = { ...camTo };
      camTo = { ...s.cam };
    };

    const lerpAngle = (a, b, p) => {
      let d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return a + d * p;
    };

    const step = (_, delta) => {
      if (finished) return;
      elapsed += delta;
      const idx = Math.min(Math.floor(elapsed / SAMPLE_MS), data.samples.length - 1);
      while (segment < idx) { segment++; applySample(data.samples[segment]); }
      const p = Math.min((elapsed - segment * SAMPLE_MS) / SAMPLE_MS, 1);

      const csx = camFrom.sx + (camTo.sx - camFrom.sx) * p;
      const csy = camFrom.sy + (camTo.sy - camFrom.sy) * p;
      const haloT = (elapsed % 1200) / 1200;
      const haloR = (meta.cell || 24) * (0.65 + 0.15 * Math.sin(haloT * 2 * Math.PI));
      for (const g of ghosts.values()) {
        g._wx = g._fx2 + (g._tx - g._fx2) * p;
        g._wy = g._fy2 + (g._ty - g._fy2) * p;
        g.setPosition(g._wx - csx, g._wy - csy);
        if (g._fr !== g._tr) g.setRotation(lerpAngle(g._fr, g._tr, p));
        if (g._rings) {
          g._rings[0].setPosition(g.x, g.y).setRadius(haloR).setAlpha(g.alpha);
          g._rings[1].setPosition(g.x, g.y).setRadius(haloR + 6).setAlpha(g.alpha);
        }
      }
      barFill.width = Math.max(1, barW * Math.min(elapsed / durationMs, 1));
      if (elapsed >= durationMs) endPlayback(false);
    };
    scene.events.on('update', step);

    const teardownAll = () => {
      scene.events.off('update', step);
      all.forEach(o => o?.destroy?.());
      ghosts.clear();
      this._playing = false;
    };

    const stopRecorder = () => new Promise((res) => {
      if (!recorder || recorder.state === 'inactive') return res();
      recorder.onstop = () => res();
      try { recorder.stop(); } catch { res(); }
    });

    const endPlayback = async (skipped) => {
      if (finished) return;
      finished = true;
      await stopRecorder();
      if (!skipped && chunks.length) {
        this._clip = { blob: new Blob(chunks, { type: mime || 'video/webm' }), meta };
      }
      if (skipped) { teardownAll(); onDone?.(); return; }
      if (autoShare && this._clip) {
        await this.shareClip();
        teardownAll(); onDone?.(); return;
      }
      const mkBtn = (y, label, fill, txtColor, cb) => {
        const bw = Math.min(240, W - 60);
        const bg = mk(scene.add.rectangle(cx, y, bw, 38, fill, 1)
          .setStrokeStyle(1, 0xffffff, 0.15).setDepth(HUD_DEPTH + 1)
          .setInteractive({ useHandCursor: true }));
        mk(scene.add.text(cx, y, label, { color: txtColor, fontSize: '14px', fontStyle: 'bold' })
          .setOrigin(0.5).setDepth(HUD_DEPTH + 2));
        bg.on('pointerdown', cb);
      };
      mk(scene.add.rectangle(cx, cy, W + 4, H + 4, 0x05070d, 0.55).setDepth(HUD_DEPTH).setInteractive());
      let by = cy - 20;
      if (this._clip) {
        mkBtn(by, '\u2934 Share Clip', 0x1f6feb, '#ffffff', async () => { await this.shareClip(); });
        by += 50;
      }
      mkBtn(by, '\u25B6 Watch Again', 0x1a2038, '#cbd1ff', () => {
        teardownAll();
        this.play(scene, opts);
      });
      mkBtn(by + 50, 'Back', 0x11141d, '#8a92b8', () => { teardownAll(); onDone?.(); });
    };

    skip.on('pointerdown', () => endPlayback(true));
  },

  async shareClip() {
    const clip = this._clip;
    if (!clip) return false;
    const ext = (clip.blob.type || '').includes('mp4') ? 'mp4' : 'webm';
    const file = new File([clip.blob], `plugrun-round${clip.meta.round}-${clip.meta.role}.${ext}`, { type: clip.blob.type });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Plug Run',
          text: `Round ${clip.meta.round} as ${clip.meta.role} \u2014 play at plugrun.io`
        });
        return true;
      }
    } catch (e) {
      if (e?.name === 'AbortError') return false;
    }
    const url = URL.createObjectURL(clip.blob);
    const a = document.createElement('a');
    a.href = url; a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  }
};

export default ReplaySystem;