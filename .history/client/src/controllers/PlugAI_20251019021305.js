/**
 * PlugAI - Defender AI (Opponent in Runner Mode)
 *
 * Manages the AI plug/defender that opposes the player in runner mode.
 * Handles stats configuration, progressive difficulty scaling, and combat behavior.
 */

/**
 * Get base stats for the AI plug
 *
 * TWEAK THESE to change Round 1 difficulty!
 * Speed is in pixels per second (like the old system)
 */
export function getPlugBaseStats() {
  return {
    speed: 12,          // Movement speed in pixels/sec (120 = base, try 80 for slower, 160 for faster)
    shootEvery: 0.90,    // Fire rate in seconds (0.90 = base, higher = slower shooting)
    maxRange: 300,       // Vision range in pixels (300 = base, lower = shorter range)
    inaccuracy: 0.45,    // Shot spread 0-1 (0.45 = base, higher = less accurate)
    reactDelay: 550      // Reaction time in ms (550 = base, higher = slower reactions)
  };
}

/**
 * Apply progressive difficulty scaling based on PvE round
 *
 * This scales the BASE STATS from getPlugBaseStats() as rounds progress.
 *
 * Scaling progression:
 * - Speed: +0.8% per round, caps at +80% at round 100
 * - Fire rate: -0.5% cooldown per round, caps at -50% at round 100 (shoots 50% faster)
 * - Accuracy: -0.5% inaccuracy per round, caps at -50% at round 100
 * - Reaction: -5ms per round, caps at -350ms at round 70
 * - Vision: +0.8% per round, caps at +80% at round 100
 */
export function applyPlugProgression(scene) {
  if (!scene.aiPlug) return;

  const round = scene.pveRound || 1;
  const baseStats = getPlugBaseStats();

  // Speed scaling: +0.8% per round, caps at +80% (round 100)
  // Base 120 pixels/sec scales to 216 pixels/sec at round 100
  const speedBoost = Math.min(0.80, (round - 1) * 0.008);
  scene.aiPlug.speed = baseStats.speed * (1 + speedBoost);

  // Shoot cooldown: -0.5% per round, caps at -50% (round 100) = shoots 50% faster
  const cooldownReduction = Math.min(0.50, (round - 1) * 0.005);
  scene.aiPlug.shootEvery = baseStats.shootEvery * (1 - cooldownReduction);

  // Accuracy: reduce inaccuracy by 0.5% per round, caps at 50% reduction (round 100)
  const accuracyBoost = Math.min(0.50, (round - 1) * 0.005);
  scene.aiPlug.inaccuracy = baseStats.inaccuracy * (1 - accuracyBoost);

  // Reaction time: -5ms per round, caps at -350ms (round 70)
  const reactionBoost = Math.min(350, (round - 1) * 5);
  scene.aiPlug.reactDelay = Math.max(200, baseStats.reactDelay - reactionBoost);

  // Vision range: +0.8% per round, caps at +80% (round 100)
  // Base 300 pixels scales to 540 pixels at round 100
  const rangeBoost = Math.min(0.80, (round - 1) * 0.008);
  scene.aiPlug.maxRange = baseStats.maxRange * (1 + rangeBoost);
}

/**
 * Update AI plug behavior (movement and shooting)
 */
export function updatePlugBehavior(scene, dt) {
  const d = scene.defender;
  const ax = scene.attacker.x;
  const ay = scene.attacker.y;
  const speed = scene.meleeEnabled ? scene.plugSpeedNoAmmo : scene.aiPlug.speed;

  // Calculate vector to runner (used for movement, aim, and shooting)
  const vx = ax - d.x, vy = ay - d.y;
  const dist = Math.hypot(vx, vy);

  // Direct movement toward runner
  const dirX = Math.sign(vx), dirY = Math.sign(vy);
  const nx = d.x + dirX * speed * dt;
  const ny = d.y + dirY * speed * dt;
  if (scene.canMoveTo(d, nx, d.y)) d.x = nx;
  if (scene.canMoveTo(d, d.x, ny)) d.y = ny;

  // Update AI aim direction for sprite orientation (normalized vector toward runner)
  if (dist > 0) {
    scene.aiAim = { x: vx / dist, y: vy / dist };
  }

  if (scene.totalRoundsLeft() === 0) {
    scene.meleeEnabled = true;
    return;
  }

  // Shooting logic
  if (!scene._shootTicker) scene._shootTicker = 0;
  scene._shootTicker += dt;

  if (scene._shootTicker >= scene.aiPlug.shootEvery) {
    scene._shootTicker = 0;

    // Shoot if within range
    if (dist <= scene.aiPlug.maxRange && dist > 0) {
      const inaccuracy = scene.aiPlug.inaccuracy;
      const rx = vx / dist + (Math.random() - 0.5) * inaccuracy;
      const ry = vy / dist + (Math.random() - 0.5) * inaccuracy;
      const weaponType = scene.allowedGuns[(Math.random() * scene.allowedGuns.length) | 0];
      if (scene.roundAmmo[weaponType] && scene.roundAmmo[weaponType] > 0) {
        scene.combatSystem.spawnWeaponBurst(d, { x: rx, y: ry }, weaponType, scene.bulletsD);
      }
    }
  }
}
