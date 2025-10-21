/**
 * PlugAI - Defender AI (Opponent in Runner Mode)
 *
 * Manages the AI plug/defender that opposes the player in runner mode.
 * Handles stats configuration, progressive difficulty scaling, and combat behavior.
 */

/**
 * Get base stats for the AI plug (Round 1 values)
 *
 * These are the STARTING values for Round 1 (very easy).
 * The progression system scales these up to human-level by Round 50.
 *
 * Design Philosophy:
 * - Rounds 1-10: Very forgiving (almost everyone makes it)
 * - Round 50: Basic human level
 * - Round 50+: Continues scaling infinitely
 */
export function getPlugBaseStats() {
  return {
    speed: 50,              // Movement speed in pixels/sec (very slow at start)
    shootEvery: 1.8,        // Fire rate in seconds (very slow shooting at start)
    maxRange: 250,          // Vision range in pixels (slightly reduced at start)
    inaccuracy: 1.0,        // Shot spread 0-1 (terrible aim at start)
    reactDelay: 800,        // Reaction time in ms (slow reactions at start)
    orientationDelay: 2.5   // Time in seconds before AI starts targeting (thinking delay)
  };
}

/**
 * Apply progressive difficulty scaling based on PvE round
 *
 * Linear scaling from Round 1 (very easy) → Round 50 (human level) → infinity
 *
 * Progression Milestones:
 * - Round 1: Tutorial difficulty (50 speed, 1.8s fire, 1.0 inaccuracy)
 * - Round 10: Still easy (59 speed, 1.6s fire, 0.88 inaccuracy)
 * - Round 27: Mobile challenge begins (76 speed, approaching mobile runner at 98)
 * - Round 50: Mobile human level (99 speed, 0.75s fire, 0.35 inaccuracy)
 * - Round 91: Desktop human level (140 speed)
 * - Round 100+: Expert level (149+ speed, continues scaling, some stats capped)
 *
 * Scaling Strategy:
 * - Speed & Vision: Scale infinitely (no cap)
 * - Fire Rate, Accuracy, Reaction: Hit minimum bounds for game balance
 */
export function applyPlugProgression(scene) {
  if (!scene.aiPlug) return;

  const round = scene.pveRound || 1;

  // SPEED: Linear scaling from 50 → 99 (round 50) → continues forever
  // Formula: 50 + (round - 1) * 1.0
  // Round 1: 50 | Round 10: 59 | Round 27: 76 | Round 50: 99 | Round 91: 140 | Round 100: 149
  // Mobile-friendly: AI catches mobile runner (98 px/s) around round 50
  // Desktop: AI catches desktop runner (140 px/s) around round 91
  scene.aiPlug.speed = 50 + (round - 1) * 1.0;

  // FIRE RATE: Linear scaling from 1.8s → 0.75s (round 50) → min 0.3s
  // Formula: 1.8 - (round - 1) * 0.0214
  // Round 1: 1.8s | Round 10: 1.6s | Round 50: 0.75s | Round 100: 0.3s (capped)
  scene.aiPlug.shootEvery = Math.max(0.3, 1.8 - (round - 1) * 0.0214);

  // ACCURACY: Linear scaling from 1.0 → 0.35 (round 50) → min 0.1
  // Formula: 1.0 - (round - 1) * 0.0133
  // Round 1: 1.0 | Round 10: 0.88 | Round 50: 0.35 | Round 100: 0.1 (capped)
  scene.aiPlug.inaccuracy = Math.max(0.1, 1.0 - (round - 1) * 0.0133);

  // REACTION TIME: Linear scaling from 800ms → 400ms (round 50) → min 100ms
  // Formula: 800 - (round - 1) * 8.16
  // Round 1: 800ms | Round 10: 726ms | Round 50: 400ms | Round 100: 100ms (capped)
  scene.aiPlug.reactDelay = Math.max(100, 800 - (round - 1) * 8.16);

  // VISION RANGE: Linear scaling from 250 → 350 (round 50) → continues forever
  // Formula: 250 + (round - 1) * 2.04
  // Round 1: 250 | Round 10: 268 | Round 50: 350 | Round 100: 452
  scene.aiPlug.maxRange = 250 + (round - 1) * 2.04;

  // ORIENTATION DELAY: Linear scaling from 2.5s → 0.3s (round 50) → min 0.1s
  // Formula: 2.5 - (round - 1) * 0.0449
  // Round 1: 2.5s | Round 10: 2.1s | Round 25: 1.4s | Round 50: 0.3s | Round 100: 0.1s (capped)
  // This simulates the AI "thinking" before it locks onto the player at round start
  scene.aiPlug.orientationDelay = Math.max(0.1, 2.5 - (round - 1) * 0.0449);
}

/**
 * Reset AI orientation timer (call this when starting a new round)
 */
export function resetPlugOrientation(scene) {
  scene._aiOrientationTimer = 0;
}

/**
 * Update AI plug behavior (movement and shooting)
 */
export function updatePlugBehavior(scene, dt) {
  const d = scene.defender;

  // Determine target (runner or decoy with scaling difficulty)
  let targetX = scene.attacker.x;
  let targetY = scene.attacker.y;

  // Decoy detection with round-based scaling (AI gets smarter over time)
  if (scene.decoySprite && scene.decoySprite.active) {
    const round = scene.pveRound || 1;
    // Early rounds: AI always falls for decoy
    // Round 50+: AI rarely falls for decoy
    // Formula: 95% chance at round 1 → 5% chance at round 50+
    const decoyChance = Math.max(0.05, 0.95 - (round - 1) * 0.0184);

    if (Math.random() < decoyChance) {
      targetX = scene.decoySprite.x;
      targetY = scene.decoySprite.y;
    }
  }

  const ax = targetX;
  const ay = targetY;
  const speed = scene.meleeEnabled ? scene.plugSpeedNoAmmo : scene.aiPlug.speed;

  // Track orientation delay timer (time since AI became active)
  if (!scene._aiOrientationTimer) scene._aiOrientationTimer = 0;
  scene._aiOrientationTimer += dt;

  // Check if AI is still in "thinking" phase
  const isOrienting = scene._aiOrientationTimer < scene.aiPlug.orientationDelay;

  // Calculate vector to target (used for movement, aim, and shooting)
  const vx = ax - d.x, vy = ay - d.y;
  const dist = Math.hypot(vx, vy);

  // During orientation delay: AI drifts passively, doesn't actively pursue
  // After delay: AI locks onto target and pursues
  if (!isOrienting) {
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
  }

  if (scene.totalRoundsLeft() === 0) {
    scene.meleeEnabled = true;
    return;
  }

  // Shooting logic (only after orientation delay)
  if (!isOrienting) {
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
          // Decrement ammo (fixes infinite ammo bug)
          scene.roundAmmo[weaponType] -= 1;
          scene.combatSystem.spawnWeaponBurst(d, { x: rx, y: ry }, weaponType, scene.bulletsD);
        }
      }
    }
  }
}
