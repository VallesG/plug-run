import Phaser from 'phaser';

export function makeRunnerSprite(scene, x, y, cell) {
  const sprite = scene.add.sprite(0, 0, 'td_runner');
  const scale = (cell / 128) * 3.0;
  sprite.setScale(scale).setOrigin(0.5, 0.5);

  const puddle = scene.add
    .ellipse(0, cell * 0.30, cell * 1.35, cell * 1.0, 0xffffff, 0.12);
  const puddleCore = scene.add
    .ellipse(0, cell * 0.30, cell * 0.85, cell * 0.62, 0xffffff, 0.10);
  const shadow = scene.add
    .ellipse(0, cell * 0.48, cell * 0.9, cell * 0.3, 0x000000, 0.34)
    .setScale(1, 0.8);

  const outline = [];
  const tint = 0xbda9ff;
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1]
  ];
  offsets.forEach(([ox, oy]) => {
    const o = scene.add.sprite(ox, oy, 'td_runner').setScale(scale).setOrigin(0.5);
    o.setTint(tint).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD);
    outline.push(o);
  });

  const container = scene.add.container(x, y, [puddle, puddleCore, shadow, ...outline, sprite]).setDepth(10);

  container.kind = 'runner';
  container.sprite = sprite;
  container.usesTD = true;
  container.hbRadius = cell * 0.44;
  container.outline = outline;

  return container;
}

export function makePlugSprite(scene, x, y, cell) {
  const sprite = scene.add.sprite(0, 0, 'td_plug');
  const scale = (cell / 128) * 3.0;
  sprite.setScale(scale).setOrigin(0.5, 0.5);
  sprite.setTint(0xff6b6b);

  const puddle = scene.add
    .ellipse(0, cell * 0.30, cell * 1.35, cell * 1.0, 0xffffff, 0.12);
  const puddleCore = scene.add
    .ellipse(0, cell * 0.30, cell * 0.85, cell * 0.62, 0xffffff, 0.10);
  const shadow = scene.add
    .ellipse(0, cell * 0.48, cell * 0.9, cell * 0.3, 0x000000, 0.34)
    .setScale(1, 0.8);

  const outline = [];
  const tint = 0xef4444;
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1]
  ];
  offsets.forEach(([ox, oy]) => {
    const o = scene.add.sprite(ox, oy, 'td_plug').setScale(scale).setOrigin(0.5);
    o.setTint(tint).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD);
    outline.push(o);
  });

  const container = scene.add.container(x, y, [puddle, puddleCore, shadow, ...outline, sprite]).setDepth(10);

  container.kind = 'plug';
  container.sprite = sprite;
  container.usesTD = true;
  container.hbRadius = cell * 0.44;
  container.outline = outline;

  return container;
}

export function updateAvatarVisuals(scene, dt) {
  const step = (who, prevKey) => {
    const prev = scene[prevKey] || { x: who.x, y: who.y };
    const speed = Math.hypot(who.x - prev.x, who.y - prev.y) / Math.max(dt, 0.0001);
    const moving = speed > 5;

    // Determine if this is the player-controlled sprite
    const isPlayer =
      (scene.role === 'plug' && who === scene.defender) ||
      (scene.role === 'runner' && who === scene.attacker);

    // Get the aim direction based on role and control type
    let aimDir = null;
    if (who.kind === 'plug') {
      if (isPlayer) {
        // For player-controlled plug, use gun aim (which is set by swipes)
        aimDir = scene.playerGunAim || scene.playerDrift || scene.playerMoveDir || { x: 1, y: 0 };
      } else {
        // For AI plug - use aiAim2 for second defender
        if (who === scene.defender2) {
          aimDir = scene.aiAim2 || { x: 1, y: 0 };
        } else {
          aimDir = scene.aiAim || { x: 1, y: 0 };
        }
      }
    } else {
      // For runner
      if (isPlayer) {
        aimDir = scene._runnerInputDir || scene._runnerLastAim || scene.playerMoveDir || { x: 1, y: 0 };
      } else {
        // For AI runner - use _aiLastMoveDir2 for second attacker
        if (who === scene.attacker2) {
          aimDir = scene._aiLastMoveDir2 || { x: 1, y: 0 };
        } else {
          aimDir = scene._aiLastMoveDir || { x: 1, y: 0 };
        }
      }
    }

    if (who.usesTD) {
      const keyBase = who.kind === 'plug' ? 'td_plug' : 'td_runner';
      const keyStep = who.kind === 'plug' ? 'td_plug_step' : 'td_runner_step';
      const rate = 0.14;
      who._stepT = (who._stepT || 0) + dt;

      if (moving) {
        const useStep = Math.floor(who._stepT / rate) % 2 === 1;
        const tex = useStep ? keyStep : keyBase;
        if (who.sprite.texture?.key !== tex) {
          who.sprite.setTexture(tex);
          if (who.outline) {
            for (const o of who.outline) o.setTexture(tex);
          }
        }
      } else {
        who._stepT = 0;
        if (who.sprite.texture?.key !== keyBase) {
          who.sprite.setTexture(keyBase);
          if (who.outline) {
            for (const o of who.outline) o.setTexture(keyBase);
          }
        }
      }

      // For TD sprites, use rotation to face the aim direction
      if (aimDir) {
        const ang = (Math.atan2(aimDir.y, aimDir.x) * 180) / Math.PI;
        who.sprite.setAngle(ang);
        if (who.outline) {
          for (const o of who.outline) o.setAngle(ang);
        }
      }
    } else if (who.sprite?.anims) {
      const animKey =
        who.kind === 'plug'
          ? moving
            ? 'plug-run'
            : 'plug-idle'
          : moving
            ? 'runner-run'
            : 'runner-idle';

      who.sprite.play(animKey, true);
      if (who.outline) {
        for (const o of who.outline) o.play(animKey, true);
      }

      // For animated sprites, also use aim direction for facing
      const flip = aimDir.x < 0;
      who.sprite.setFlipX(flip);
      if (who.outline) {
        for (const o of who.outline) o.setFlipX(flip);
      }
    }

    scene[prevKey] = { x: who.x, y: who.y };
  };

  if (scene.attacker) step(scene.attacker, '_prevAttPos');
  if (scene.defender) step(scene.defender, '_prevDefPos');
  // Dual AI: Update second AI visuals if they exist
  if (scene.attacker2) step(scene.attacker2, '_prevAtt2Pos');
  if (scene.defender2) step(scene.defender2, '_prevDef2Pos');
}