import Phaser from 'phaser';
import { PALETTE, CHAR_HEIGHT_CELLS, outlinePx } from '../logic/palette.js';

// Eight-direction offsets for the outline copies.
const OFFSETS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];

/**
 * A character: hard shadow, team ring, ink outline, sprite.
 *
 * WHAT CHANGED AND WHY
 * The outline used to be eight copies of the sprite tinted the TEAM colour at
 * 0.55 alpha with ADD blending. At 43px source art that does not draw a line,
 * it draws a haze — it softens the exact silhouette a small figure needs to
 * read. Same eight copies, but ink, opaque, NORMAL blend: a thick dark line.
 *
 * The three stacked white ellipses ("puddle") are gone in favour of one hard,
 * offset shadow and one accent ring. The ring is where the team colour lives
 * now, so the sprite is not flattened by a full tint to tell sides apart.
 *
 * Scale comes from the texture's real height. The old formula was
 * (cell / 128) * 3.0 — written for 128px sheets and still applied to 43px art,
 * landing near one cell tall only because the 3.0 happened to compensate. Swap
 * the art and that breaks; this does not.
 */
function makeCharacter(scene, x, y, cell, { key, kind, accent, tint = null }) {
  const sprite = scene.add.sprite(0, 0, key).setOrigin(0.5, 0.5);
  const frameH = sprite.height || 43;
  const scale = (cell * CHAR_HEIGHT_CELLS) / frameH;
  sprite.setScale(scale);
  if (tint != null) sprite.setTint(tint);

  // One hard shadow, pushed down-right a touch so it reads as cast, not glow.
  const shadow = scene.add
    .ellipse(cell * 0.06, cell * 0.42, cell * 0.95, cell * 0.34, PALETTE.ink, 0.5);

  // Team ring on the ground. Thin, saturated, the one place the accent lives.
  const ring = scene.add
    .ellipse(0, cell * 0.40, cell * 1.05, cell * 0.42, accent, 0)
    .setStrokeStyle(Math.max(1.5, cell * 0.07), accent, 0.9);

  const px = outlinePx(cell);
  const outline = OFFSETS.map(([ox, oy]) => {
    const o = scene.add.sprite(ox * px, oy * px, key).setScale(scale).setOrigin(0.5);
    o.setTint(PALETTE.ink);      // NORMAL blend, full alpha: a line, not a glow
    o._ox = ox * px;             // rest position, so bob can offset and restore
    o._oy = oy * px;
    return o;
  });

  const container = scene.add.container(x, y, [shadow, ring, ...outline, sprite]).setDepth(10);

  container.kind = kind;
  container.sprite = sprite;
  container.usesTD = true;
  container.hbRadius = cell * 0.44;
  container.outline = outline;         // CombatSystem tints these for hit flash / low HP
  container.figure = [sprite, ...outline];
  container.baseScale = scale;
  container.ring = ring;
  container.shadow = shadow;
  container.accent = accent;

  return container;
}

export function makeRunnerSprite(scene, x, y, cell) {
  return makeCharacter(scene, x, y, cell, { key: 'td_runner', kind: 'runner', accent: PALETTE.runner });
}

export function makePlugSprite(scene, x, y, cell) {
  return makeCharacter(scene, x, y, cell, {
    key: 'td_plug', kind: 'plug', accent: PALETTE.plug, tint: PALETTE.plugTint
  });
}

/** A short squash on a hard turn: the figure leans into the new direction. */
const SQUASH_S = 0.09;
const TURN_DEG = 70;

export function updateAvatarVisuals(scene, dt) {
  const cell = scene.cell || 24;

  const step = (who, prevKey) => {
    const prev = scene[prevKey] || { x: who.x, y: who.y };
    const speed = Math.hypot(who.x - prev.x, who.y - prev.y) / Math.max(dt, 0.0001);
    const moving = speed > 5;

    const isPlayer =
      (scene.role === 'plug' && who === scene.defender) ||
      (scene.role === 'runner' && who === scene.attacker);

    let aimDir = null;
    if (who.kind === 'plug') {
      if (isPlayer) {
        aimDir = scene.playerGunAim || scene.playerDrift || scene.playerMoveDir || { x: 1, y: 0 };
      } else {
        aimDir = (who === scene.defender2 ? scene.aiAim2 : scene.aiAim) || { x: 1, y: 0 };
      }
    } else if (isPlayer) {
      aimDir = scene._runnerInputDir || scene._runnerLastAim || scene.playerMoveDir || { x: 1, y: 0 };
    } else {
      aimDir = (who === scene.attacker2 ? scene._aiLastMoveDir2 : scene._aiLastMoveDir) || { x: 1, y: 0 };
    }

    if (who.usesTD) {
      const keyBase = who.kind === 'plug' ? 'td_plug' : 'td_runner';
      const keyStep = who.kind === 'plug' ? 'td_plug_step' : 'td_runner_step';
      const rate = 0.14;
      who._stepT = (who._stepT || 0) + dt;

      const setTex = (tex) => {
        if (who.sprite.texture?.key !== tex) {
          who.sprite.setTexture(tex);
          for (const o of who.outline || []) o.setTexture(tex);
        }
      };

      if (moving) {
        setTex(Math.floor(who._stepT / rate) % 2 === 1 ? keyStep : keyBase);
      } else {
        who._stepT = 0;
        setTex(keyBase);
      }

      // Facing.
      if (aimDir) {
        const ang = (Math.atan2(aimDir.y, aimDir.x) * 180) / Math.PI;
        // A hard turn earns a squash: lean into the new direction for a beat.
        if (who._faceAng != null) {
          const d = Math.abs(Phaser.Math.Angle.ShortestBetween(who._faceAng, ang));
          if (d > TURN_DEG) who._squashT = SQUASH_S;
        }
        who._faceAng = ang;
        who.sprite.setAngle(ang);
        for (const o of who.outline || []) o.setAngle(ang);
      }

      // JUICE: step bob while moving, squash on turns. Applied to the figure
      // (sprite + outline) together so the line stays glued to the body; the
      // shadow and ring stay on the ground, which is what sells the bob.
      const fig = who.figure || [who.sprite, ...(who.outline || [])];
      const base = who.baseScale ?? who.sprite.scaleX;

      const bob = moving ? Math.abs(Math.sin((who._stepT / rate) * Math.PI)) * cell * 0.06 : 0;

      // Recoil is a decaying offset set by CombatSystem on fire, applied here
      // rather than tweened so it cannot fight the bob for the same property.
      let rx = 0, ry = 0;
      const rc = who._recoil;
      if (rc && rc.t > 0) {
        rc.t = Math.max(0, rc.t - dt);
        const f = rc.t / rc.dur;
        rx = rc.x * f;
        ry = rc.y * f;
      }

      who.sprite.x = rx;
      who.sprite.y = -bob + ry;
      for (const o of who.outline || []) {
        o.x = (o._ox ?? 0) + rx;
        o.y = (o._oy ?? 0) - bob + ry;
      }

      if (who._squashT > 0) {
        who._squashT = Math.max(0, who._squashT - dt);
        const t = who._squashT / SQUASH_S;
        const sx = 1 + 0.18 * t;
        const sy = 1 - 0.14 * t;
        for (const f of fig) f.setScale(base * sx, base * sy);
      } else if (who.sprite.scaleX !== base || who.sprite.scaleY !== base) {
        for (const f of fig) f.setScale(base, base);
      }
    } else if (who.sprite?.anims) {
      // Sheet-animated characters (none ship today; kept so a future sheet
      // works without touching the callers).
      const animKey = who.kind === 'plug'
        ? (moving ? 'plug-run' : 'plug-idle')
        : (moving ? 'runner-run' : 'runner-idle');
      if (scene.anims.exists(animKey)) {
        who.sprite.play(animKey, true);
        for (const o of who.outline || []) o.play(animKey, true);
      }
      const flip = aimDir.x < 0;
      who.sprite.setFlipX(flip);
      for (const o of who.outline || []) o.setFlipX(flip);
    }

    scene[prevKey] = { x: who.x, y: who.y };
  };

  if (scene.attacker) step(scene.attacker, '_prevAttPos');
  if (scene.defender) step(scene.defender, '_prevDefPos');
  if (scene.attacker2) step(scene.attacker2, '_prevAtt2Pos');
  if (scene.defender2) step(scene.defender2, '_prevDef2Pos');
}
