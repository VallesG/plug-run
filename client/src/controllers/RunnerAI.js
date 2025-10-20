import {
  isWalkableDirFrom,
  applyCenterBias,
  toroDist
} from '../utils/gameUtils.js';

/**
 * RunnerAI - Attacker AI (Opponent in Plug Mode)
 *
 * Manages the AI runner/attacker that opposes the player in plug mode.
 * Handles stats configuration, progressive difficulty scaling, and pathfinding behavior.
 */

/**
 * Get base stats for the AI runner (Round 1 values)
 *
 * These are the STARTING values for Round 1 (very easy).
 * The progression system scales these up to human-level by Round 50.
 */
export function getRunnerBaseStats() {
  return {
    // Movement & pathfinding (existing)
    planEvery: 200,
    jukeDist: 0,
    sprintDist: 5,
    sprintMul: 1.05,
    centerBias: 14,
    keepDirMs: 300,
    slideNudge: 0.11,         // Wall-sliding (fixed at 0.11 - smooth navigation without exploits)

    // Human-like behavior (new)
    orientationDelay: 2.5,    // Seconds before AI starts moving to objective
    wanderChance: 0.4,        // Probability of taking suboptimal path
    hesitationChance: 0.3,    // Probability of unnecessary replanning
    overcommitChance: 0.5,    // Probability of chasing plug instead of objective
    panicThreshold: 6,        // Distance in cells where AI starts panicking
    panicMultiplier: 5.0,     // How much mistakes increase when panicking
    powerSkill: 0.2           // Probability of using power optimally (Round 4+)
  };
}

/**
 * Apply progressive difficulty scaling based on PvE round
 * Only applies when player is in plug mode
 *
 * Scaling progression (Human-like by Round 50):
 * - Speed: 60 px/s → 98 px/s (round 50) → 136 px/s (round 100)
 * - Planning: Starts at 240-340ms, improves to 90ms at round 100
 * - Sprint multiplier: 1.05x to 1.45x at round 100
 * - Sprint distance: 5 cells to 9 cells at round 100
 * - Orientation delay: 2.5s → 0.3s (round 50) → 0.1s (round 100)
 * - Wander chance: 40% → 5% (round 50) → 1% (round 100)
 * - Panic threshold: 6 cells → 4 cells (round 50) → 2 cells (round 100)
 * - Power skill: 20% → 95% (round 50+)
 */
export function applyRunnerProgression(scene) {
  if (scene.role !== 'plug') return; // Only scale when player is defender

  const round = Math.max(1, scene.pveRound || 1);

  // SPEED: Linear scaling from 60 → 98 (round 50) → continues forever
  // Formula: 60 + (round - 1) * 0.77
  // Round 1: 60 | Round 10: 67 | Round 25: 78 | Round 50: 98 | Round 100: 136
  // Mobile-friendly: AI catches mobile runner (98 px/s) around round 50
  // Desktop: AI catches desktop runner (140 px/s) around round 104
  scene.runnerSpeed = 60 + (round - 1) * 0.77;

  // Keep dependent stats (e.g., decoy) in sync with new speed
  if (scene.runnerPowerStats?.decoy) {
    scene.runnerPowerStats.decoy.speed = scene.runnerSpeed * 0.9;
  }
  if (scene.runnerPowerStats?.phase) {
    scene.runnerPowerStats.phase.dashDist = scene.cell * 3.5;
  }

  if (!scene.aiRunner) return;

  // Worse decision-making in early rounds
  const planningPenalty = round <= 3 ? 100 : 0; // +100ms slower planning for rounds 1-3
  scene.aiRunner.planEvery = Math.max(90, 240 + planningPenalty - (round - 1) * 1.5); // planning improves slower: -150ms max at round 100
  scene.aiRunner.sprintMul = 1.05 + Math.min(0.40, (round - 1) * 0.004); // sprint multiplier: +40% max at round 100
  scene.aiRunner.sprintDist = 5 + Math.min(4, (round - 1) * 0.04); // sprint distance: +4 cells max at round 100
  scene.aiRunner.centerBias = 12 + Math.min(14, (round - 1) * 0.14); // centering: +14 max at round 100

  // SLIDE NUDGE: Fixed at 0.11 (doesn't scale - it's a physics constant, not skill)
  // This provides smooth corridor navigation without exploitative wall-hugging
  // No progression needed - works the same at all speeds

  scene.aiRunner.keepDirMs = Math.max(160, 300 - (round - 1) * 1.4); // direction persistence: -140ms max at round 100

  // ORIENTATION DELAY: Linear scaling from 2.5s → 0.3s (round 50) → min 0.1s
  // Formula: 2.5 - (round - 1) * 0.0449
  // Round 1: 2.5s | Round 10: 2.1s | Round 25: 1.4s | Round 50: 0.3s | Round 100: 0.1s (capped)
  // Runner pauses before heading to objective (simulates human assessment time)
  scene.aiRunner.orientationDelay = Math.max(0.1, 2.5 - (round - 1) * 0.0449);

  // WANDER CHANCE: Steep early drop, then minimal at high rounds
  // Formula: 0.4 - (round - 1) * 0.02
  // Round 1: 0.40 (40%) | Round 10: 0.22 (22%) | Round 20: 0.02 (2%) | Round 50+: 0.01 (1%)
  // Probability of taking a suboptimal path (routing mistakes)
  scene.aiRunner.wanderChance = Math.max(0.01, 0.4 - (round - 1) * 0.02);

  // HESITATION CHANCE: Steep early drop, eliminates by round 20
  // Formula: 0.3 - (round - 1) * 0.015
  // Round 1: 0.30 (30%) | Round 10: 0.17 (17%) | Round 20: 0.02 (2%) | Round 50+: 0.0 (0%)
  // Probability of unnecessary replanning (indecision)
  scene.aiRunner.hesitationChance = Math.max(0.0, 0.3 - (round - 1) * 0.015);

  // OVERCOMMIT CHANCE: Steep early drop, stays minimal at high rounds
  // Formula: 0.5 - (round - 1) * 0.024
  // Round 1: 0.50 (50%) | Round 10: 0.28 (28%) | Round 20: 0.04 (4%) | Round 50+: 0.02 (2%)
  // Probability of chasing plug instead of going to objective (poor prioritization)
  scene.aiRunner.overcommitChance = Math.max(0.02, 0.5 - (round - 1) * 0.024);

  // PANIC THRESHOLD: Linear scaling from 6 → 4 (round 50) → min 2
  // Formula: 6 - (round - 1) * 0.0408
  // Round 1: 6 cells | Round 10: 5.6 | Round 50: 4.0 | Round 100: 2.0 (capped)
  // Distance (in cells) at which AI starts panicking when plug is close
  scene.aiRunner.panicThreshold = Math.max(2, 6 - (round - 1) * 0.0408);

  // PANIC MULTIPLIER: Linear scaling from 5.0x → 3.0x (round 50) → min 1.5x
  // Formula: 5.0 - (round - 1) * 0.0408
  // Round 1: 5.0x | Round 10: 4.6x | Round 50: 3.0x | Round 100: 1.5x (capped)
  // How much all mistake chances are multiplied when AI is panicking
  scene.aiRunner.panicMultiplier = Math.max(1.5, 5.0 - (round - 1) * 0.0408);

  // POWER SKILL: Steep improvement, reaches 95% by round 30
  // Formula: 0.2 + (round - 1) * 0.025
  // Round 4: 0.28 (28%) | Round 10: 0.43 (43%) | Round 20: 0.68 (68%) | Round 30: 0.93 (93%) | Round 50+: 0.95 (capped)
  // Probability of using power optimally (vs random/panic usage)
  scene.aiRunner.powerSkill = Math.min(0.95, 0.2 + (round - 1) * 0.025);
}

/**
 * Reset AI runner orientation timer (call this when starting a new round)
 */
export function resetRunnerOrientation(scene) {
  scene._aiRunnerOrientationTimer = 0;
}

/**
 * Update AI runner behavior (pathfinding and movement)
 */
export function updateRunnerBehavior(scene, aiController, delta) {
  const now = performance.now();
  const dt = delta / 1000;

  // Track orientation delay timer (time since round started)
  if (!scene._aiRunnerOrientationTimer) scene._aiRunnerOrientationTimer = 0;
  scene._aiRunnerOrientationTimer += dt;

  // Check if AI is still in "thinking" phase (assessing map before moving)
  const isOrienting = scene._aiRunnerOrientationTimer < scene.aiRunner.orientationDelay;

  // Skip all pathfinding and decision-making during orientation delay
  if (!isOrienting && (!aiController._aiPlanAt || now >= aiController._aiPlanAt)) {
    // Detect panic state (plug is close)
    const attackerCell = scene.toCell(scene.attacker.x, scene.attacker.y);
    const plugCell = scene.toCell(scene.defender.x, scene.defender.y);
    const distToPlug = toroDist(attackerCell, plugCell, scene.cols, scene.rows);
    const isPanicking = distToPlug <= scene.aiRunner.panicThreshold;

    // Apply panic multiplier to all mistake chances
    const panicMul = isPanicking ? scene.aiRunner.panicMultiplier : 1.0;
    const wanderChance = Math.min(0.95, scene.aiRunner.wanderChance * panicMul);
    const hesitationChance = Math.min(0.95, scene.aiRunner.hesitationChance * panicMul);
    const overcommitChance = Math.min(0.95, scene.aiRunner.overcommitChance * panicMul);

    // Hesitation: Sometimes replan unnecessarily (human indecision)
    const shouldHesitate = Math.random() < hesitationChance;
    const planInterval = shouldHesitate ? scene.aiRunner.planEvery * 0.5 : scene.aiRunner.planEvery;
    aiController._aiPlanAt = now + planInterval;

    // Determine objective target
    let objectiveTarget;
    if (!scene.hasStash) {
      if (scene.role === 'plug' && scene.mode === 'pve') {
        const bunkVisible = scene.bunkStash && scene.bunkStash.active && scene.bunkStash.visible;
        if (scene.aiRunnerTargetsBunkFirst && bunkVisible) {
          objectiveTarget = scene.toCell(scene.bunkStash.x, scene.bunkStash.y);
        } else {
          scene.aiRunnerTargetsBunkFirst = false;
          objectiveTarget = scene.toCell(scene.stash.x, scene.stash.y);
        }
      } else {
        objectiveTarget = scene.toCell(scene.stash.x, scene.stash.y);
      }
    } else {
      objectiveTarget = scene.toCell(scene.extract.x, scene.extract.y);
    }

    // Overcommit: Sometimes chase plug instead of going to objective (poor prioritization)
    const shouldOvercommit = Math.random() < overcommitChance;
    let targetCell = shouldOvercommit ? plugCell : objectiveTarget;

    let nextCell = scene.findNextStepTowards(attackerCell, targetCell);
    if (nextCell.x === attackerCell.x && nextCell.y === attackerCell.y) {
      const ns = scene.neighbors4(attackerCell);
      if (ns.length) nextCell = ns[(Math.random() * ns.length) | 0];
    }

    // Wander: Sometimes take a suboptimal/random path (routing mistakes)
    const shouldWander = Math.random() < wanderChance;
    if (shouldWander) {
      const ns = scene.neighbors4(attackerCell);
      if (ns.length) {
        // Pick a random walkable neighbor (may not be toward target)
        nextCell = ns[(Math.random() * ns.length) | 0];
      }
    }

    if (scene.aiRunner.jukeDist > 0 && toroDist(attackerCell, plugCell, scene.cols, scene.rows) <= scene.aiRunner.jukeDist && Math.random() < 0.5) {
      const ns = scene.neighbors4(attackerCell);
      ns.sort((m, n) => toroDist(n, plugCell, scene.cols, scene.rows) - toroDist(m, plugCell, scene.cols, scene.rows));
      nextCell = ns[0] || nextCell;
    }

    let dir = { x: Math.sign(nextCell.x - attackerCell.x), y: Math.sign(nextCell.y - attackerCell.y) };
    const close = toroDist(attackerCell, plugCell, scene.cols, scene.rows) <= scene.aiRunner.sprintDist;
    const speed = scene.runnerSpeed * (scene.hasStash ? scene.carrySlow : 1) * (close ? scene.aiRunner.sprintMul : 1);

    const opp = (a, b) => (a.x === -b.x && a.y === -b.y);
    if (aiController._aiLastMoveDir && opp(dir, aiController._aiLastMoveDir) && performance.now() < aiController._aiFlipGuardUntil) {
      dir = aiController._aiLastMoveDir;
    }

    if (!isWalkableDirFrom(scene, scene.attacker, dir)) {
      aiRunnerCruise(scene, aiController);
    } else {
      aiController._aiCruiseDir = dir;
      aiController._aiVX = dir.x * speed;
      aiController._aiVY = dir.y * speed;
      aiController._aiLastMoveDir = { x: Math.sign(dir.x), y: Math.sign(dir.y) };
      aiController._aiFlipGuardUntil = performance.now() + scene.aiRunner.keepDirMs;
    }

    aiController._aiLastPos = { x: scene.attacker.x, y: scene.attacker.y };
    aiController._aiStuckAt = now;
  }

  // During orientation delay, set velocity to 0 (runner stands still/drifts)
  if (isOrienting) {
    aiController._aiVX = 0;
    aiController._aiVY = 0;
  }

  const vx = aiController._aiVX || 0, vy = aiController._aiVY || 0;
  const nx = scene.attacker.x + vx * dt;
  const ny = scene.attacker.y + vy * dt;

  const dirNow = (Math.abs(vx) > Math.abs(vy)) ? { x: Math.sign(vx), y: 0 } : { x: 0, y: Math.sign(vy) };
  applyCenterBias(scene, scene.attacker, dirNow, dt);

  let movedX = false, movedY = false;
  if (scene.canMoveTo(scene.attacker, nx, scene.attacker.y)) {
    scene.attacker.x = nx;
    movedX = true;
  }
  if (scene.canMoveTo(scene.attacker, scene.attacker.x, ny)) {
    scene.attacker.y = ny;
    movedY = true;
  }

  // Wall-sliding skill: Scales with rounds (low = gets stuck, high = smooth movement)
  // Low rounds get stuck and look clumsy, high rounds navigate smoothly
  if (!movedX && Math.abs(vx) > 0) {
    const dy = scene.cell * scene.aiRunner.slideNudge;
    if (scene.canMoveTo(scene.attacker, scene.attacker.x, scene.attacker.y - dy)) {
      scene.attacker.y -= dy;
    } else if (scene.canMoveTo(scene.attacker, scene.attacker.x, scene.attacker.y + dy)) {
      scene.attacker.y += dy;
    }
  }
  if (!movedY && Math.abs(vy) > 0) {
    const dx = scene.cell * scene.aiRunner.slideNudge;
    if (scene.canMoveTo(scene.attacker, scene.attacker.x - dx, scene.attacker.y)) {
      scene.attacker.x -= dx;
    } else if (scene.canMoveTo(scene.attacker, scene.attacker.x + dx, scene.attacker.y)) {
      scene.attacker.x += dx;
    }
  }

  // Final stuck-prevention nudge (only when completely blocked)
  if (!movedX && !movedY) {
    const nudge = scene.cell * 0.08;
    if (Math.abs(vx) > Math.abs(vy)) {
      if (scene.canMoveTo(scene.attacker, scene.attacker.x, scene.attacker.y - nudge)) {
        scene.attacker.y -= nudge;
      } else if (scene.canMoveTo(scene.attacker, scene.attacker.x, scene.attacker.y + nudge)) {
        scene.attacker.y += nudge;
      }
    } else {
      if (scene.canMoveTo(scene.attacker, scene.attacker.x - nudge, scene.attacker.y)) {
        scene.attacker.x -= nudge;
      } else if (scene.canMoveTo(scene.attacker, scene.attacker.x + nudge, scene.attacker.y)) {
        scene.attacker.x += nudge;
      }
    }
  }

  const moved = Math.hypot(scene.attacker.x - (aiController._aiLastPos?.x || 0), scene.attacker.y - (aiController._aiLastPos?.y || 0));
  if (moved < 0.4 && (performance.now() - (aiController._aiStuckAt || 0)) > 350) {
    aiRunnerCruise(scene, aiController);
    aiController._aiLastPos = { x: scene.attacker.x, y: scene.attacker.y };
    aiController._aiStuckAt = performance.now();
  } else if (moved >= 0.4) {
    aiController._aiLastPos = { x: scene.attacker.x, y: scene.attacker.y };
    aiController._aiStuckAt = performance.now();
  }

  if (!aiController._aiVX && !aiController._aiVY) aiRunnerCruise(scene, aiController);

  // Update AI state back to scene (for compatibility)
  scene._aiVX = aiController._aiVX;
  scene._aiVY = aiController._aiVY;
  scene._aiPlanAt = aiController._aiPlanAt;
  scene._aiLastMoveDir = aiController._aiLastMoveDir;
  scene._aiFlipGuardUntil = aiController._aiFlipGuardUntil;
  scene._aiCruiseDir = aiController._aiCruiseDir;
  scene._aiLastPos = aiController._aiLastPos;
  scene._aiStuckAt = aiController._aiStuckAt;
}

/**
 * Fallback cruise movement for AI Runner
 */
function aiRunnerCruise(scene, aiController) {
  const speedBase = scene.runnerSpeed * (scene.hasStash ? scene.carrySlow : 1);
  const dir = aiController._aiCruiseDir || { x: 1, y: 0 };
  const c = scene.toCell(scene.attacker.x, scene.attacker.y);
  const tryDirs = [dir, { x: dir.y, y: -dir.x }, { x: -dir.y, y: dir.x }, { x: -dir.x, y: -dir.y }];

  for (const d of tryDirs) {
    const n = { x: c.x + d.x, y: c.y + d.y };
    if (scene.isWalkableCell(n.x, n.y)) {
      aiController._aiCruiseDir = d;
      const speed = speedBase;
      aiController._aiVX = d.x * speed;
      aiController._aiVY = d.y * speed;
      return;
    }
  }
  aiController._aiVX = 0;
  aiController._aiVY = 0;
}

/**
 * Consider using AI runner powers (Legacy deterministic system - works reliably)
 */
export function considerRunnerPowerUse(scene, aiController, now) {
  if (scene.role === 'runner') return;

  // Don't allow power-ups until round 4
  const round = scene.pveRound || 1;
  if (round < 4) {
    console.log('[RunnerAI] Powers locked until round 4 (current:', round, ')');
    return;
  }

  // AI uses consumable powers (2 random powers, each used once)
  const sel = scene.aiRunnerPowersSelected || [];
  const used = scene.aiRunnerPowersConsumed || [];

  console.log('[RunnerAI] considerRunnerPowerUse - Round:', round, 'Selected:', sel, 'Used:', used);

  if (!sel.length) {
    console.log('[RunnerAI] No powers selected!');
    return;
  }

  // Cooldown between power uses (prevent using both powers simultaneously)
  const cooldown = 2000; // 2 seconds between power uses
  if (aiController._aiRunnerLastPowerAt && (now - aiController._aiRunnerLastPowerAt) < cooldown) return;

  // Calculate distance to plug (defender)
  const dist = Math.hypot(scene.defender.x - scene.attacker.x, scene.defender.y - scene.attacker.y);
  const distInCells = dist / scene.cell;

  console.log('[RunnerAI] Distance to plug:', distInCells.toFixed(2), 'cells');

  // Legacy deterministic system: Use powers based on simple distance checks
  // Check BOTH powers each frame and use the most appropriate one for current situation

  // Helper function to check if phasing through walls would create a tactical advantage
  const shouldPhaseForTactics = () => {
    // Only smart AIs (high powerSkill) use tactical phasing
    if (scene.aiRunner.powerSkill < 0.6) return false; // Round 20+

    const attackerCell = scene.toCell(scene.attacker.x, scene.attacker.y);

    // Determine current objective
    let objectiveCell;
    if (!scene.hasStash) {
      objectiveCell = scene.toCell(scene.stash.x, scene.stash.y);
    } else {
      objectiveCell = scene.toCell(scene.extract.x, scene.extract.y);
    }

    // Calculate direct distance vs pathfinding distance to objective
    const directDist = Math.hypot(
      objectiveCell.x - attackerCell.x,
      objectiveCell.y - attackerCell.y
    );

    // Check if there's a wall in the direct line to objective
    const dx = Math.sign(objectiveCell.x - attackerCell.x);
    const dy = Math.sign(objectiveCell.y - attackerCell.y);
    const nextCell = { x: attackerCell.x + dx, y: attackerCell.y + dy };

    const wallBlocking = scene.inBoundsCell(nextCell.x, nextCell.y) &&
                         !scene.isWalkableCell(nextCell.x, nextCell.y);

    // Tactical shortcut: Phase if wall blocks direct path and objective is close
    if (wallBlocking && directDist <= 8) {
      console.log('[RunnerAI] 🧠 TACTICAL PHASE: Cutting through wall to reach objective (distance:', directDist.toFixed(1), 'cells)');
      return true; // Cut through walls to reach objective faster
    }

    // Evasive maneuver: Being chased and can phase to put wall between us and plug
    const plugCell = scene.toCell(scene.defender.x, scene.defender.y);
    const distToPlug = toroDist(attackerCell, plugCell, scene.cols, scene.rows);

    if (distToPlug <= 6 && distToPlug > 2) {
      // Check if phasing in escape direction would put a wall between us and plug
      const escapeDx = Math.sign(attackerCell.x - plugCell.x) || 1;
      const escapeDy = Math.sign(attackerCell.y - plugCell.y) || 1;
      const escapeCell = { x: attackerCell.x + escapeDx, y: attackerCell.y + escapeDy };

      const wallInEscapeDir = scene.inBoundsCell(escapeCell.x, escapeCell.y) &&
                              !scene.isWalkableCell(escapeCell.x, escapeCell.y);

      if (wallInEscapeDir) {
        console.log('[RunnerAI] 🧠 TACTICAL PHASE: Escaping through wall to break line of sight (plug distance:', distToPlug, 'cells)');
        return true; // Phase through wall to break line of sight and escape
      }
    }

    return false;
  };

  // Helper function to check if a power should be used at this distance
  const shouldUsePower = (power) => {
    switch (power) {
      case 'phase':
        // Defensive: Use when defender is very close (last resort panic escape)
        const defensiveUse = dist <= scene.cell * 5;

        // Tactical: Use to cut through walls for shortcuts or evasive maneuvers (high skill only)
        const tacticalUse = shouldPhaseForTactics();

        return defensiveUse || tacticalUse;
      case 'decoy':
        // Use decoy when defender is within sight range and no decoy exists (strategic distraction)
        return !scene.decoySprite && dist <= scene.cell * 18;
      case 'dash':
        // Use dash when defender is approaching (create separation)
        return dist <= scene.cell * 15 && dist >= scene.cell * 4;
      default:
        return false;
    }
  };

  // Check power 0 first (higher priority)
  if (!used[0] && sel[0]) {
    const power = sel[0];
    const shouldUse = shouldUsePower(power);
    console.log('[RunnerAI] Power 0 (', power, '): check =', shouldUse);

    if (shouldUse) {
      console.log('[RunnerAI] ✓ ACTIVATING POWER 0:', power);
      scene.activateRunnerPowerByIndex(0);
      aiController._aiRunnerLastPowerAt = now;
      return;
    }
  }

  // Check power 1 (only if power 0 wasn't triggered this frame)
  if (!used[1] && sel[1]) {
    const power = sel[1];
    const shouldUse = shouldUsePower(power);
    console.log('[RunnerAI] Power 1 (', power, '): check =', shouldUse);

    if (shouldUse) {
      console.log('[RunnerAI] ✓ ACTIVATING POWER 1:', power);
      scene.activateRunnerPowerByIndex(1);
      aiController._aiRunnerLastPowerAt = now;
    }
  }

  // Update scene state for compatibility
  scene._aiRunnerLastPowerAt = aiController._aiRunnerLastPowerAt;
}
