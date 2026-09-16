// ContactPanel — one gang contact, one line, one page turn.
//
// The grammar is Auntie Ro's, which the human approved: a painted room, the
// character standing in it at readable size, optional foreground so they sit
// IN the scene rather than over it, and a quiet dialogue box along the bottom
// whose lower right corner advances with >>.
//
// LOADING, AND WHY IT MATTERS HERE
// The six backdrops are ~150KB each as WebP and 1024x1536 — about 6MB of GPU
// texture apiece once decoded. Only the contact who is speaking is ever
// loaded, and the backdrop texture is released on teardown, so a fifteen-house
// block never holds more than one room in memory. The portrait atlases are
// small and shared with The Window, so they are kept.
//
// FAILURE IS NOT A BLOCKER
// A missing or slow image falls back to a flat accent panel and the dialogue
// still reads. Nothing here can strand a player between houses.
import Phaser from 'phaser';
import { CONTACTS, contactPanelLayout, contactDialoguePages } from '../logic/contacts.js';

const DEPTH = 24_000;          // above GameUI modals (20k), below replay (30k)
const COLORS = { ink: 0x080b0d, cream: 0xf1dfb0, paper: 0xe9dfc7, dim: 0x92a0a2 };

/**
 * @param scene  the live Phaser scene
 * @param cue    a contactCue() result from logic/contacts.js
 * @param onDone called once, after the player advances (or on a forced close)
 * @returns { close } — close(false) tears down without calling onDone
 */
export function showContactPanel(scene, cue, onDone) {
  const objects = [];
  let finished = false;
  let bgKey = null;
  let pageIndex = 0;
  const cast = cue.contacts || [cue.contact];
  const pages = (cue.pages?.length ? cue.pages : [cue.text]).flatMap(value => {
    const entry = typeof value === 'string' ? { text: value, contact: cue.contact } : value;
    return contactDialoguePages(entry.text, scene.scale.gameSize.width, scene.scale.gameSize.height)
      .map(text => ({ ...entry, text }));
  });
  const page = () => pages[pageIndex];
  let a;
  const track = (o) => { objects.push(o); return o; };

  const clearObjects = () => {
    for (const o of objects) { try { scene.tweens?.killTweensOf(o); o.destroy(); } catch {} }
    objects.length = 0;
  };
  const teardown = () => {
    clearObjects();
    // Release the room. Portrait atlases stay: they are small and The Window
    // uses them too, so removing them would only cause a reload.
    if (bgKey) { try { scene.textures.remove(bgKey); } catch {} bgKey = null; }
  };
  const close = (advance = true) => {
    if (finished) return;
    finished = true;
    teardown();
    if (advance) onDone?.();
  };

  const measure = () => {
    a = contactPanelLayout(scene.scale.gameSize.width, scene.scale.gameSize.height,
      cue.celebration ? { heightFraction: 0.55, baseFraction: 0.72 } : cue.contact, page().text);
  };
  measure();

  // Everything below the panel is unreachable while it is up: one opaque,
  // interactive backstop that swallows every pointer event.
  const drawBackstop = () => track(scene.add.rectangle(a.w / 2, a.h / 2, a.w + 4, a.h + 4, COLORS.ink, 1)
    .setScrollFactor(0).setDepth(DEPTH - 1).setInteractive());
  drawBackstop();

  const backdropFallback = () => track(scene.add.rectangle(a.cx, a.cy, a.panelW, a.panelH, cue.contact.accent, 0.22)
    .setScrollFactor(0).setDepth(DEPTH));

  const drawRoom = (key) => {
    const image = track(scene.add.image(a.cx, a.cy, key)
      .setScrollFactor(0).setDepth(DEPTH).setDisplaySize(a.coverW, a.coverH));
    // Crop the cover overflow to the panel so the painted room never bleeds
    // past the frame on a wide screen.
    const mask = scene.make.graphics({ add: false });
    mask.fillStyle(0xffffff).fillRect(a.cx - a.panelW / 2, a.panelTop, a.panelW, a.panelH);
    const geometry = mask.createGeometryMask();
    image.setMask(geometry);
    track({ destroy: () => { try { geometry.destroy(); mask.destroy(); } catch {} } });
    // Sit the light down a little so cream text reads over any room.
    track(scene.add.rectangle(a.cx, a.cy, a.panelW, a.panelH, 0x061014, 0.3)
      .setScrollFactor(0).setDepth(DEPTH + 0.1));
    return image;
  };

  const drawPortrait = (c = cue.contact, x = a.cx, duo = false) => {
    const portraitH = duo
      ? Math.min(a.portraitH, a.panelW * 0.5 * c.frame.height / c.frame.width)
      : a.portraitH;
    const portraitY = a.portraitBaseY - portraitH / 2;
    const key = c.portraitKey;
    if (!scene.textures.exists(key)) {
      const circle = track(scene.add.circle(x, portraitY, portraitH * 0.26, c.accent, 0.9)
        .setScrollFactor(0).setDepth(DEPTH + 1));
      track(scene.add.text(x, portraitY, c.name[0], {
        fontFamily: 'Georgia, serif', fontSize: Math.round(portraitH * 0.24) + 'px',
        fontStyle: 'bold', color: '#0b1012'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2));
      return circle;
    }
    track(scene.add.ellipse(x + 5, a.portraitBaseY - portraitH * 0.02,
      portraitH * 0.42, portraitH * 0.09, COLORS.ink, 0.55)
      .setScrollFactor(0).setDepth(DEPTH + 0.9));
    const frameName = c.expressions > 1 ? (duo ? 2 : 0) : c.id;
    const sprite = track(scene.add.image(x, portraitY, key, frameName)
      .setScrollFactor(0).setDepth(DEPTH + 1));
    sprite.setScale(portraitH / c.frame.height);
    return sprite;
  };

  // The foreground crop is the bottom slice of the same room drawn again over
  // the character, so a desk or counter passes in front of their body. Its
  // start fraction is a reviewed value per contact, not a universal guess.
  const drawForeground = (key) => {
    if (!a.foreground || !scene.textures.exists(key)) return;
    const source = scene.textures.get(key).getSourceImage();
    const srcH = source?.height || 1536, srcW = source?.width || 1024;
    const cropTop = Math.floor(srcH * a.foreground.startFraction);
    const frameKey = '__contact_fg';
    const texture = scene.textures.get(key);
    if (!texture.has(frameKey)) texture.add(frameKey, 0, 0, cropTop, srcW, srcH - cropTop);
    const drawnH = a.coverH * (1 - a.foreground.startFraction);
    const top = a.cy - a.coverH / 2 + a.coverH * a.foreground.startFraction;
    const image = track(scene.add.image(a.cx, top + drawnH / 2, key, frameKey)
      .setScrollFactor(0).setDepth(DEPTH + 1.5).setDisplaySize(a.coverW, drawnH));
    const mask = scene.make.graphics({ add: false });
    mask.fillStyle(0xffffff).fillRect(a.cx - a.panelW / 2, a.panelTop, a.panelW, a.panelH);
    const geometry = mask.createGeometryMask();
    image.setMask(geometry);
    track({ destroy: () => { try { geometry.destroy(); mask.destroy(); } catch {} } });
  };

  const drawFrame = () => {
    const g = track(scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2.5));
    g.lineStyle(3, COLORS.ink, 1);
    g.strokeRect(a.cx - a.panelW / 2, a.panelTop, a.panelW, a.panelH);
    g.lineStyle(1, cue.contact.accent, 0.4);
    g.strokeRect(a.cx - a.panelW / 2 + 6, a.panelTop + 6, a.panelW - 12, a.panelH - 12);
    // Where we are, small and out of the way.
    track(scene.add.text(a.cx, a.panelTop + 18, cue.chapterLabel || cue.contact.setting.toUpperCase(), {
      fontFamily: 'monospace', fontSize: '10px', color: '#c9bfa6', letterSpacing: 2,
      stroke: '#080b0d', strokeThickness: 3, align: 'center', wordWrap: { width: a.panelW - 32 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 3));
  };

  const drawDialogue = () => {
    const d = a.dialogue;
    track(scene.add.rectangle(d.x + 5, d.y + 6, d.w, d.h, COLORS.ink, 0.72)
      .setScrollFactor(0).setDepth(DEPTH + 3));
    track(scene.add.rectangle(d.x, d.y, d.w, d.h, 0x0d1417, 0.97)
      .setStrokeStyle(2, cue.contact.accent).setScrollFactor(0).setDepth(DEPTH + 4));
    track(scene.add.text(d.x - d.w / 2 + 18, d.y - d.h / 2 + 16, page().contact.name.toUpperCase(), {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold',
      color: page().contact.css, letterSpacing: 2
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 5));
    track(scene.add.text(d.x - d.w / 2 + 18, d.y - d.h / 2 + d.copyTop, page().text, {
      fontFamily: 'Georgia, serif', fontSize: a.bodyFontPx + 'px',
      color: '#e9dfc7', lineSpacing: 5, wordWrap: { width: d.w - 36 }
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH + 5));

    const b = a.action;
    track(scene.add.rectangle(b.x + 4, b.y + 5, b.w, b.h, COLORS.ink, 0.75)
      .setScrollFactor(0).setDepth(DEPTH + 5));
    const button = track(scene.add.rectangle(b.x, b.y, b.w, b.h, 0x172126, 1)
      .setStrokeStyle(2, cue.contact.accent).setScrollFactor(0).setDepth(DEPTH + 6));
    const label = track(scene.add.text(b.x, b.y, pageIndex < pages.length - 1 ? 'KEEP LISTENING  >>' : cue.action, {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold',
      color: '#f4ecd7', letterSpacing: 1
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 7));

    // Arm late. The tap that cleared the entrance map must not also advance
    // this panel, and a player mashing the screen must not skip a first read.
    scene.time?.delayedCall?.(360, () => {
      if (finished || !button.active) return;
      button.setInteractive({ cursor: 'pointer' });
      button.on('pointerover', () => button.setFillStyle(cue.contact.accent, 0.3));
      button.on('pointerout', () => button.setFillStyle(0x172126, 1));
      button.on('pointerup', () => {
        if (pageIndex >= pages.length - 1) { close(true); return; }
        pageIndex++;
        clearObjects();
        measure();
        drawBackstop();
        compose(bgKey);
      });
      label.setAlpha(1);
    });
    label.setAlpha(0.55);
  };

  // Original code-native cover art: approved pair, roofline and comic spotlight.
  // No extra raster download, no invented character designs, no served source PNGs.
  const drawCelebration = () => {
    const g = track(scene.add.graphics().setScrollFactor(0).setDepth(DEPTH));
    const left = a.cx - a.panelW / 2;
    g.fillStyle(0x111b20, 1).fillRect(left, a.panelTop, a.panelW, a.panelH);
    const centerY = a.panelTop + a.panelH * 0.4;
    for (let i = 0; i < 14; i++) {
      const x = left + a.panelW * i / 14;
      g.fillStyle(cue.contact.accent, i % 2 ? 0.04 : 0.1);
      g.fillTriangle(a.cx, centerY, x, a.panelTop + 6, x + a.panelW / 28, a.panelTop + 6);
    }
    for (let i = 0; i < 8; i++) {
      const roofW = a.panelW / 8, roofH = a.panelH * (0.09 + (i % 3) * 0.015);
      const y = a.portraitBaseY - roofH;
      g.fillStyle(0x080e12, 1).fillRect(left + i * roofW, y, roofW - 3, roofH + 10);
      g.lineStyle(1, cue.contact.accent, 0.35).lineBetween(left + i * roofW, y, left + (i + 1) * roofW - 3, y);
      g.fillStyle(0xe8c67a, 0.7).fillRect(left + i * roofW + 9, y + 12, 4, 6);
    }
    track(scene.add.text(a.cx, a.panelTop + a.panelH * 0.13, '15 / 15', {
      fontFamily: 'Arial, sans-serif', fontSize: Math.round(a.panelW * 0.095) + 'px',
      fontStyle: 'bold', color: '#f1dfb0', stroke: '#080b0d', strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 0.5));
    track(scene.add.text(a.cx, a.panelTop + a.panelH * 0.19, 'ALL STASHES HOME', {
      fontFamily: 'monospace', fontSize: '11px', color: cue.contact.css, letterSpacing: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 0.5));
    drawPortrait(cast[1], a.cx + a.panelW * 0.19, true);
    drawPortrait(cast[0], a.cx - a.panelW * 0.19, true);
  };

  const compose = (key) => {
    if (finished) return;
    if (cue.celebration) drawCelebration();
    else {
      if (key && scene.textures.exists(key)) drawRoom(key); else backdropFallback();
      drawPortrait();
      if (key) drawForeground(key);
    }
    drawFrame();
    drawDialogue();
  };

  // The portrait atlas is shared with The Window but a gameplay scene has not
  // loaded it, so both it and the room are fetched here on demand.
  const key = 'contact_bg_' + cue.contact.id;
  const needRoom = !cue.celebration && !scene.textures.exists(key);
  const missingPortraits = cast.filter((c, i) => cast.findIndex(other => other.portraitKey === c.portraitKey) === i &&
    !scene.textures.exists(c.portraitKey));
  const needPortrait = missingPortraits.length > 0;

  // Named crops on the shared cast sheet. Registered once per texture; the
  // frame bounds come from the tested contact contract, never from guesses.
  const registerFrames = () => {
    for (const c of CONTACTS) {
      if (c.expressions > 1 || !scene.textures.exists(c.portraitKey)) continue;
      const texture = scene.textures.get(c.portraitKey);
      if (!texture.has(c.id)) texture.add(c.id, 0, c.frame.x, 0, c.frame.width, c.frame.height);
    }
  };

  if (!needRoom && !needPortrait) { bgKey = cue.celebration ? null : key; registerFrames(); compose(bgKey); }
  else {
    let settled = false;
    const settle = () => {
      if (settled || finished) return;
      settled = true;
      const room = !cue.celebration && scene.textures.exists(key);
      if (room) bgKey = key;
      registerFrames();
      compose(room ? key : null);
    };
    // A slow or failed network cannot hold the player between houses.
    const guard = scene.time?.delayedCall?.(2500, settle);
    if (needRoom) scene.load.image(key, cue.contact.background);
    for (const c of missingPortraits) {
      if (c.expressions > 1) {
        scene.load.spritesheet(c.portraitKey, c.portraitSource,
          { frameWidth: c.frame.width, frameHeight: c.frame.height });
      } else scene.load.image(c.portraitKey, c.portraitSource);
    }
    scene.load.once('complete', () => { guard?.remove?.(); settle(); });
    scene.load.once('loaderror', () => { guard?.remove?.(); settle(); });
    scene.load.start();
  }

  scene.events.once('shutdown', () => close(false));
  return { close };
}

export default showContactPanel;
