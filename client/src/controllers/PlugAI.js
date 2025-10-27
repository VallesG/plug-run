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
 * The progression system scales these up to human-level by Round 20.
 *
 * Design Philosophy:
 * - Rounds 1-10: Very forgiving (almost everyone makes it)
 * - Round 20: Basic human level
 * - Round 20+: Continues scaling infinitely
 */
export function getPlugBaseStats() {
  return {
    speed: 60,              // Movement speed in pixels/sec (faster at start - was 50)
    shootEvery: 1.5,        // Fire rate in seconds (faster shooting at start - was 1.8)
    maxRange: 280,          // Vision range in pixels (better vision at start - was 250)
    inaccuracy: 0.85,       // Shot spread 0-1 (better aim at start - was 1.0)
    reactDelay: 500,        // Reaction time in ms (faster reactions at start - was 800)
    orientationDelay: 1.5   // Time in seconds before AI starts targeting (faster thinking - was 2.5)
  };
}

/**
 * Apply progressive difficulty scaling based on PvE round
 *
 * Linear scaling from Round 1 (very easy) → Round 20 (human level) → infinity
 *
 * Progression Milestones:
 * - Round 1: Tutorial difficulty (50 speed, 1.8s fire, 1.0 inaccuracy)
 * - Round 10: Getting tougher (72 speed, 1.3s fire, 0.71 inaccuracy)
 * - Round 11: Mobile challenge begins (76 speed, approaching mobile runner at 98)
 * - Round 20: Mobile human level (98 speed, 0.75s fire, 0.38 inaccuracy)
 * - Round 37: Desktop human level (140 speed)
 * - Round 40+: Expert level (continues scaling, some stats capped)
 *
 * Scaling Strategy:
 * - Speed & Vision: Scale infinitely (no cap)
 * - Fire Rate, Accuracy, Reaction: Hit minimum bounds for game balance
 */
export function applyPlugProgression(scene) {
  if (!scene.aiPlug) return;

  const round = scene.pveRound || 1;

  // SPEED: Reduced progression (starts higher, scales slower)
  // Formula: 60 + (round - 1) * 2.0 (was 50 + 2.5)
  // Round 1: 60 | Round 10: 78 | Round 20: 98 | Round 40: 138
  scene.aiPlug.speed = 60 + (round - 1) * 2.0;

  // FIRE RATE: Reduced progression (starts faster, scales slower)
  // Formula: 1.5 - (round - 1) * 0.04 (was 1.8 - 0.0535)
  // Round 1: 1.5s | Round 10: 1.14s | Round 20: 0.74s | Round 40: 0.3s (capped)
  scene.aiPlug.shootEvery = Math.max(0.3, 1.5 - (round - 1) * 0.04);

  // ACCURACY: Reduced progression (starts better, scales slower)
  // Formula: 0.85 - (round - 1) * 0.025 (was 1.0 - 0.0326)
  // Round 1: 0.85 | Round 10: 0.63 | Round 20: 0.38 | Round 40: 0.1 (capped)
  scene.aiPlug.inaccuracy = Math.max(0.1, 0.85 - (round - 1) * 0.025);

  // REACTION TIME: Reduced progression (starts faster, scales slower)
  // Formula: 500 - (round - 1) * 15 (was 800 - 20.4)
  // Round 1: 500ms | Round 10: 365ms | Round 20: 215ms | Round 40: 100ms (capped)
  scene.aiPlug.reactDelay = Math.max(100, 500 - (round - 1) * 15);

  // VISION RANGE: Reduced progression (starts better, scales slower)
  // Formula: 280 + (round - 1) * 4.0 (was 250 + 5.1)
  // Round 1: 280 | Round 10: 316 | Round 20: 356 | Round 40: 436
  scene.aiPlug.maxRange = 280 + (round - 1) * 4.0;

  // ORIENTATION DELAY: Reduced progression (starts faster, scales slower)
  // Formula: 1.5 - (round - 1) * 0.07 (was 2.5 - 0.1123)
  // Round 1: 1.5s | Round 10: 0.87s | Round 20: 0.17s | Round 40: 0.1s (capped)
  scene.aiPlug.orientationDelay = Math.max(0.1, 1.5 - (round - 1) * 0.07);
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
    // Round 20+: AI rarely falls for decoy
    // Formula: 95% chance at round 1 → 5% chance at round 20+
    const decoyChance = Math.max(0.05, 0.95 - (round - 1) * 0.0474);

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
    // Direct movement toward runner - normalize to prevent faster diagonal movement
    const dirX = Math.sign(vx), dirY = Math.sign(vy);
    const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
    const normalizedDirX = magnitude > 0 ? dirX / magnitude : dirX;
    const normalizedDirY = magnitude > 0 ? dirY / magnitude : dirY;

    const nx = d.x + normalizedDirX * speed * dt;
    const ny = d.y + normalizedDirY * speed * dt;
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
