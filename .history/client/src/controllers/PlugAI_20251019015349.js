/**
 * PlugAI - Defender AI (Opponent in Runner Mode)
 *
 * Manages the AI plug/defender that opposes the player in runner mode.
 * Handles stats configuration, progressive difficulty scaling, and combat behavior.
 */

/**
 * Get base stats for the AI plug
 */
export function getPlugBaseStats() {
  return {
    speed: 80,
    shootEvery: 0.90,
    maxRange: 300,
    inaccuracy: 0.45,
    reactDelay: 550
  };
}

/**
 * Apply progressive difficulty scaling based on PvE round
 *
 * Scaling progression:
 * - Speed: +0.8% per round, caps at +80% (round 100)
 * - Fire rate: -0.5% cooldown per round, caps at -50% (round 100) = shoots 50% faster
 * - Accuracy: -0.5% inaccuracy per round, caps at -50% (round 100)
 * - Reaction: -5ms per round, caps at -350ms (round 70)
 * - Vision: +0.08 cells per round, caps at +8 cells (round 100)
 */
export function applyPlugProgression(scene) {
  if (!scene.pveRound || scene.pveRound <= 1) return;
  if (!scene.aiPlug) return;

  const round = scene.pveRound;

  // Speed scaling: Gentle ramp - +0.8% per round, caps at +80% (round 100)
  // Base is 3.0 cells/sec, scales up to 5.4 cells/sec at round 100
  const speedBoost = Math.min(0.80, (round - 1) * 0.008);
  const AI_PLUG_CPS = 3.0 * (1 + speedBoost);
  scene.aiPlug.speed = AI_PLUG_CPS * scene.cell;

  // Shoot cooldown: -0.5% per round, caps at -50% (round 100) = shoots 50% faster
  const cooldownReduction = Math.min(0.50, (round - 1) * 0.005);
  scene.aiPlug.shootEvery = 0.90 * (1 - cooldownReduction);

  // Accuracy: reduce inaccuracy by 0.5% per round, caps at 50% reduction (round 100)
  const accuracyBoost = Math.min(0.50, (round - 1) * 0.005);
  scene.aiPlug.inaccuracy = 0.45 * (1 - accuracyBoost);

  // Reaction time: -5ms per round, caps at -350ms (round 70) = reacts 350ms faster
  const reactionBoost = Math.min(350, (round - 1) * 5);
  scene.aiPlug.reactDelay = Math.max(200, 550 - reactionBoost);

  // Vision range: +0.08 cells per round, caps at +8 cells (round 100)
  // Base is ~15 cells at 20px/cell, scales to ~23 cells
  const rangeBoost = Math.min(8, (round - 1) * 0.08);
  scene.aiPlug.maxRange = (15 + rangeBoost) * scene.cell;
}

/**
 * Update AI plug behavior (movement and shooting)
 */
export function updatePlugBehavior(scene, dt) {
  const d = scene.defender;
  const ax = scene.attacker.x;
  const ay = scene.attacker.y;
  const speed = scene.meleeEnabled ? scene.plugSpeedNoAmmo : scene.aiPlug.speed;

  // Direct movement toward runner - no anti-lockstep strafe (allows running through same spot)
  const vx = ax - d.x, vy = ay - d.y;
  const dirX = Math.sign(vx), dirY = Math.sign(vy);
  const nx = d.x + dirX * speed * dt;
  const ny = d.y + dirY * speed * dt;
  if (scene.canMoveTo(d, nx, d.y)) d.x = nx;
  if (scene.canMoveTo(d, d.x, ny)) d.y = ny;

  if (scene.totalRoundsLeft() === 0) {
    scene.meleeEnabled = true;
    return;
  }

  // Shooting logic
  if (!scene._shootTicker) scene._shootTicker = 0;
  scene._shootTicker += dt;

  if (scene._shootTicker >= scene.aiPlug.shootEvery) {
    scene._shootTicker = 0;

    // Calculate distance to runner
    const dist = Math.hypot(vx, vy);

    // Shoot if within range
    if (dist <= scene.aiPlug.shootRadius) {
      const inaccuracy = scene.aiPlug.shootInaccuracy;
      const rx = vx / dist + (Math.random() - 0.5) * inaccuracy;
      const ry = vy / dist + (Math.random() - 0.5) * inaccuracy;
      const weaponType = scene.allowedGuns[(Math.random() * scene.allowedGuns.length) | 0];
      if (scene.roundAmmo[weaponType] && scene.roundAmmo[weaponType] > 0) {
        scene.spawnWeaponBurst(d, { x: rx, y: ry }, weaponType, scene.bulletsD);
      }
    }
  }
}
