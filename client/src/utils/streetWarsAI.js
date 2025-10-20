// Street Wars AI - Level 50 AI tuned to feel like a skilled human player
// This AI is used when mode === 'streetwars' to provide a challenging PvP-like experience

// Configuration for human-like AI behavior
export const STREET_WARS_CONFIG = {
  // Movement settings
  speed: 140, // Fast but not superhuman (equivalent to ~level 50 PvE)
  imperfectPathing: true, // Sometimes takes suboptimal routes

  // Shooting settings
  shootEvery: 0.75, // Base shoot interval in seconds
  shootDelayVariance: 0.3, // ±0.3s randomness (makes timing unpredictable)
  inaccuracy: 0.25, // Better aim than early AI but not perfect
  panicInaccuracy: 0.50, // When low health, aim gets worse

  // Reaction times
  reactDelay: 300, // Quick but not instant (ms)
  reactionVariance: 200, // Sometimes 300ms, sometimes 500ms

  // Vision/awareness
  maxRange: 350, // Slightly better vision than base AI

  // Human-like behavioral chances
  fakeoutChance: 0.15, // 15% chance to juke/strafe when close
  missEasyShot: 0.08, // 8% chance to whiff an easy aligned shot
  takeBadAngle: 0.12, // 12% chance to shoot from suboptimal position
  hesitateChance: 0.05, // 5% chance to pause briefly (looks human)
  overcommitChance: 0.10, // 10% chance to chase too aggressively
  wanderChance: 0.05, // 5% chance per frame to take random move

  // Adaptive behavior
  retreatWhenLow: true, // Falls back when HP < 40%
  retreatDistance: 5, // cells to maintain when retreating
  aggressiveWhenAhead: true, // Pushes harder when runner has low HP

  // Power usage (for AI runner in street wars)
  powerUseDelay: 2000, // Cooldown between power uses (ms)
  panicPowerChance: 0.7, // 70% chance to use defensive power when low HP
  strategicPowerChance: 0.4, // 40% chance to use power strategically
};

// Apply Street Wars AI configuration to a scene
export function applyStreetWarsAI(scene) {
  const config = STREET_WARS_CONFIG;

  // Configure AI Plug (defender) for Street Wars
  scene.aiPlug = {
    speed: config.speed * scene.cell,
    shootEvery: config.shootEvery,
    maxRange: config.maxRange,
    inaccuracy: config.inaccuracy,
    reactDelay: config.reactDelay
  };

  // Configure AI Runner (attacker) for Street Wars if needed
  if (scene.aiRunner) {
    scene.aiRunner.speed = config.speed * scene.cell;
    // Keep other AI runner settings from existing config
  }

  // Store Street Wars specific flags
  scene.streetWarsMode = true;
  scene.streetWarsConfig = config;

  // Initialize human-like behavior state
  scene._swHesitateUntil = 0;
  scene._swWanderDir = null;
  scene._swLastPowerUse = 0;

  console.log('[StreetWars] AI configured for human-like level 50 opponent');
}

// Update AI Plug with human-like behaviors (call from updateDefenderAI)
export function updateStreetWarsPlugAI(scene, dt) {
  if (!scene.streetWarsMode) return false; // Not in street wars mode

  const config = scene.streetWarsConfig;
  const d = scene.defender;
  const a = scene.attacker;
  const now = performance.now();

  // Calculate health percentage
  const healthPercent = d.hp / (d.maxHP || 3);
  const isLowHealth = healthPercent < 0.4;

  // Hesitation behavior - sometimes pause briefly
  if (now < scene._swHesitateUntil) {
    return true; // Skip movement this frame (looks like thinking/hesitation)
  }
  if (Math.random() < config.hesitateChance * dt) {
    scene._swHesitateUntil = now + (100 + Math.random() * 200); // Pause 100-300ms
  }

  // Retreat behavior when low health
  if (config.retreatWhenLow && isLowHealth) {
    const dist = Math.hypot(a.x - d.x, a.y - d.y);
    const retreatDist = config.retreatDistance * scene.cell;

    if (dist < retreatDist) {
      // Move away from runner instead of toward
      const vx = d.x - a.x;
      const vy = d.y - a.y;
      const len = Math.hypot(vx, vy) || 1;
      const dirX = Math.sign(vx / len);
      const dirY = Math.sign(vy / len);

      const speed = scene.aiPlug.speed;
      const nx = d.x + dirX * speed * dt;
      const ny = d.y + dirY * speed * dt;

      if (scene.canMoveTo(d, nx, d.y)) d.x = nx;
      if (scene.canMoveTo(d, d.x, ny)) d.y = ny;

      return true; // Handled movement
    }
  }

  // Wandering - occasionally take suboptimal move
  if (config.imperfectPathing && Math.random() < config.wanderChance * dt) {
    const randomDirs = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 }
    ];
    scene._swWanderDir = randomDirs[Math.floor(Math.random() * randomDirs.length)];

    // Apply wander direction for a short time
    const speed = scene.aiPlug.speed;
    const nx = d.x + scene._swWanderDir.x * speed * dt;
    const ny = d.y + scene._swWanderDir.y * speed * dt;

    if (scene.canMoveTo(d, nx, d.y)) d.x = nx;
    if (scene.canMoveTo(d, d.x, ny)) d.y = ny;

    // Clear wander after brief moment
    setTimeout(() => { scene._swWanderDir = null; }, 300);
    return true;
  }

  return false; // Use default AI movement
}

// Modify AI shooting with human-like inaccuracy (call before shooting)
export function applyStreetWarsShootingBehavior(scene) {
  if (!scene.streetWarsMode) return;

  const config = scene.streetWarsConfig;
  const d = scene.defender;
  const a = scene.attacker;

  const healthPercent = d.hp / (d.maxHP || 3);
  const isLowHealth = healthPercent < 0.4;

  // Apply worse inaccuracy when panicking (low health)
  if (isLowHealth) {
    scene.aiPlug.inaccuracy = config.panicInaccuracy;
  } else {
    scene.aiPlug.inaccuracy = config.inaccuracy;
  }

  // Add randomized shoot delay variance
  const baseDelay = config.shootEvery;
  const variance = (Math.random() - 0.5) * config.shootDelayVariance;
  scene.aiPlug.shootEvery = Math.max(0.3, baseDelay + variance);

  // Occasionally miss easy shots
  const aligned = (Math.abs(a.x - d.x) < scene.cell * 0.4) || (Math.abs(a.y - d.y) < scene.cell * 0.4);
  if (aligned && Math.random() < config.missEasyShot) {
    // Flip aim direction to intentionally miss
    if (scene.aiAim) {
      scene.aiAim = { x: -scene.aiAim.x || 0, y: -scene.aiAim.y || 0 };
    }
  }

  // Occasionally shoot from bad angle
  if (Math.random() < config.takeBadAngle) {
    // Slightly randomize aim direction
    const adx = Math.abs(a.x - d.x);
    const ady = Math.abs(a.y - d.y);

    if (Math.random() < 0.5) {
      // Shoot in less optimal direction
      scene.aiAim = (adx > ady)
        ? { x: 0, y: Math.sign(a.y - d.y) }
        : { x: Math.sign(a.x - d.x), y: 0 };
    }
  }
}

// Update AI Runner with human-like behaviors for Street Wars
export function updateStreetWarsRunnerAI(scene, delta) {
  if (!scene.streetWarsMode) return false;

  const config = scene.streetWarsConfig;
  const now = performance.now();

  // Add slight randomness to AI runner pathfinding
  if (config.imperfectPathing && Math.random() < config.wanderChance) {
    // Occasionally take a suboptimal path
    const randomOffset = (Math.random() - 0.5) * 2; // -1 to 1
    if (scene._aiVX) scene._aiVX *= (1 + randomOffset * 0.1);
    if (scene._aiVY) scene._aiVY *= (1 + randomOffset * 0.1);
  }

  // Overcommit behavior - sometimes chase too aggressively
  if (Math.random() < config.overcommitChance * (delta / 1000)) {
    const plugCell = scene.toCell(scene.defender.x, scene.defender.y);
    const attackerCell = scene.toCell(scene.attacker.x, scene.attacker.y);
    const dist = Math.hypot(plugCell.x - attackerCell.x, plugCell.y - attackerCell.y);

    if (dist < 3 && !scene.hasStash) {
      // Push aggressively toward plug even if risky
      const dir = {
        x: Math.sign(plugCell.x - attackerCell.x),
        y: Math.sign(plugCell.y - attackerCell.y)
      };

      const speed = scene.aiRunner?.speed || scene.runnerSpeed;
      scene._aiVX = dir.x * speed * 1.3; // 30% speed boost when overcommitting
      scene._aiVY = dir.y * speed * 1.3;
    }
  }

  return false; // Use default AI runner logic
}

// Human-like power usage for AI Runner in Street Wars
export function considerStreetWarsPowerUse(scene) {
  if (!scene.streetWarsMode || scene.role !== 'plug') return;
  if (!scene.runnerPowersSelected || scene.runnerPowersSelected.length === 0) return;

  const config = scene.streetWarsConfig;
  const now = performance.now();

  // Cooldown between power uses
  if (now - scene._swLastPowerUse < config.powerUseDelay) return;

  const dist = Math.hypot(scene.defender.x - scene.attacker.x, scene.defender.y - scene.attacker.y);
  const isClose = dist < scene.cell * 3;
  const runnerHP = scene.attacker.hp || 2;
  const isLowHP = runnerHP <= 1;

  // Check available powers
  const used = scene.runnerPowersConsumed || [false, false];
  const powers = scene.runnerPowersSelected;

  // Panic use when low HP and close to plug
  if (isLowHP && isClose && Math.random() < config.panicPowerChance) {
    // Prefer defensive powers (phase) when panicking
    for (let i = 0; i < powers.length; i++) {
      if (!used[i] && powers[i] === 'phase') {
        scene.activateRunnerPowerByIndex(i);
        scene._swLastPowerUse = now;
        return;
      }
    }

    // Use any available power if no phase
    for (let i = 0; i < powers.length; i++) {
      if (!used[i]) {
        scene.activateRunnerPowerByIndex(i);
        scene._swLastPowerUse = now;
        return;
      }
    }
  }

  // Strategic power use
  if (Math.random() < config.strategicPowerChance) {
    // Use dash to close distance when runner has stash
    if (scene.hasStash && dist > scene.cell * 5) {
      for (let i = 0; i < powers.length; i++) {
        if (!used[i] && powers[i] === 'dash') {
          scene.activateRunnerPowerByIndex(i);
          scene._swLastPowerUse = now;
          return;
        }
      }
    }

    // Use decoy when plug is chasing and close
    if (!scene.hasStash && isClose) {
      for (let i = 0; i < powers.length; i++) {
        if (!used[i] && powers[i] === 'decoy') {
          scene.activateRunnerPowerByIndex(i);
          scene._swLastPowerUse = now;
          return;
        }
      }
    }
  }
}
