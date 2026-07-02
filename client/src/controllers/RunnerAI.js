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
 * These are the STARTING values for Round 1 - now more aggressive to match AI Plug intensity.
 * The progression system scales these up quickly for challenging gameplay.
 */
export function getRunnerBaseStats() {
  return {
    // Movement & pathfinding (balanced for smooth gameplay)
    planEvery: 150,           // Replan frequently enough for smart paths, not too much for flip-flopping
    jukeDist: 0,
    centerBias: 10,           // Smooth centering (fixed - navigation constant)
    keepDirMs: 350,           // Commit to direction long enough for smooth corridors
    slideNudge: 0.11,         // Wall-sliding (fixed at 0.11 - smooth navigation without exploits)

    // Human-like behavior (nearly perfect from start)
    orientationDelay: 0.05,   // Basically instant start
    wanderChance: 0.0,        // Never wanders - always optimal path
    hesitationChance: 0.0,    // Never hesitates
    overcommitChance: 0.0,    // Perfect prioritization - always goes for objective
    panicThreshold: 5,        // Distance when AI starts panicking (more mistakes)
    panicMultiplier: 1.5,     // How much panic affects mistake chance (not speed!)
    powerSkill: 0.75          // Excellent power usage from start
  };
}

/**
 * Apply progressive difficulty scaling based on PvE round
 * Only applies when player is in plug mode
 *
 * Scaling progression (Human-like by Round 20):
 * - Speed: 60 px/s → 97 px/s (round 20) → 137 px/s (round 40)
 * - Planning: Starts at 240-340ms, improves to 90ms at round 40
 * - Sprint multiplier: 1.05x to 1.45x at round 40
 * - Sprint distance: 5 cells to 9 cells at round 40
 * - Orientation delay: 2.5s → 0.37s (round 20) → 0.1s (round 40)
 * - Wander chance: 40% → 0.09% (round 20) → 0.01% (round 40)
 * - Panic threshold: 6 cells → 4 cells (round 20) → 2 cells (round 40)
 * - Power skill: 20% → 95% (round 20+)
 */
export function applyRunnerProgression(scene) {
  if (scene.role !== 'plug') return; // Only scale when player is defender

  const round = Math.max(1, scene.pveRound || 1);

  // SPEED: Moderate start, scales up progressively
  // Formula: 85 + (round - 1) * 3.5
  // Round 1: 85 | Round 5: 99 | Round 10: 116.5 | Round 15: 134 | Round 20: 151.5
  scene.runnerSpeed = 85 + (round - 1) * 3.5;

  // Keep dependent stats (e.g., decoy) in sync with new speed
  if (scene.runnerPowerStats?.decoy) {
    scene.runnerPowerStats.decoy.speed = scene.runnerSpeed * 0.9;
  }
  if (scene.runnerPowerStats?.phase) {
    scene.runnerPowerStats.phase.dashDist = scene.cell * 3.5;
  }

  if (!scene.aiRunner) return;

  // Pathfinding timing: Fixed values balancing smooth corridors with smart pathfinding
  scene.aiRunner.planEvery = 150;   // Fixed - replanning frequency (6.6x/sec - balance between smart paths and stability)
  scene.aiRunner.centerBias = 10;   // Fixed - centerBias is a navigation constant
  scene.aiRunner.keepDirMs = 350;   // Fixed - direction commitment (balance between smoothness and reactivity)

  // SLIDE NUDGE: Fixed at 0.11 (doesn't scale - it's a physics constant, not skill)
  // This provides smooth corridor navigation without exploitative wall-hugging
  // No progression needed - works the same at all speeds

  // ORIENTATION DELAY: Instant from round 1
  scene.aiRunner.orientationDelay = 0.05; // Fixed - always instant

  // WANDER/HESITATION/OVERCOMMIT: Always 0 (perfect pathfinding)
  scene.aiRunner.wanderChance = 0.0;      // Never wanders
  scene.aiRunner.hesitationChance = 0.0;  // Never hesitates
  scene.aiRunner.overcommitChance = 0.0;  // Always prioritizes objective

  // PANIC THRESHOLD: Aggressive panic activation
  // Round 1: 5 cells | Round 10: 4.1 | Round 20: 3.1 | Round 31: 2.0 (capped)
  scene.aiRunner.panicThreshold = Math.max(2, 5 - (round - 1) * 0.10);

  // PANIC MULTIPLIER: Low mistakes even when panicking
  // Round 1: 1.5x | Round 10: 1.5x (stays at 1.5x)
  scene.aiRunner.panicMultiplier = 1.5; // Fixed - always calm under pressure

  // POWER SKILL: Excellent from start, perfect quickly
  // Round 1: 0.75 (75%) | Round 3: 0.89 (89%) | Round 4: 0.95 (95% capped)
  scene.aiRunner.powerSkill = Math.min(0.95, 0.75 + (round - 1) * 0.07);
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

    // Dual AI: Check if THIS runner is the stash carrier
    const thisRunnerHasStash = scene.stashCarrier === scene.attacker;

    if (!scene.hasStash) {
      // No one has stash yet - go pick it up
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
    } else if (thisRunnerHasStash) {
      // THIS runner has the stash - go to extraction ASAP
      objectiveTarget = scene.toCell(scene.extract.x, scene.extract.y);
    } else {
      // Someone else has stash (dual AI mode) - go to extraction and wait
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
    const speed = scene.runnerSpeed * (scene.hasStash ? scene.carrySlow : 1); // No sprint boost - players can't sprint

    const opp = (a, b) => (a.x === -b.x && a.y === -b.y);
    if (aiController._aiLastMoveDir && opp(dir, aiController._aiLastMoveDir) && performance.now() < aiController._aiFlipGuardUntil) {
      dir = aiController._aiLastMoveDir;
    }

    if (!isWalkableDirFrom(scene, scene.attacker, dir)) {
      aiRunnerCruise(scene, aiController);
    } else {
      aiController._aiCruiseDir = dir;

      // Normalize direction vector to prevent faster diagonal movement
      const magnitude = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
      const normalizedDir = magnitude > 0
        ? { x: dir.x / magnitude, y: dir.y / magnitude }
        : dir;

      aiController._aiVX = normalizedDir.x * speed;
      aiController._aiVY = normalizedDir.y * speed;
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
  if (moved < 0.3 && (performance.now() - (aiController._aiStuckAt || 0)) > 600) {
    aiRunnerCruise(scene, aiController);
    aiController._aiLastPos = { x: scene.attacker.x, y: scene.attacker.y };
    aiController._aiStuckAt = performance.now();
  } else if (moved >= 0.3) {
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

      // Normalize direction vector to prevent faster diagonal movement
      const magnitude = Math.sqrt(d.x * d.x + d.y * d.y);
      const normalizedDir = magnitude > 0
        ? { x: d.x / magnitude, y: d.y / magnitude }
        : d;

      aiController._aiVX = normalizedDir.x * speed;
      aiController._aiVY = normalizedDir.y * speed;
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

  const round = scene.pveRound || 1;

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
    // AI uses tactical phasing from round 1 for offensive plays
    if (scene.aiRunner.powerSkill < 0.4) return false; // Very low skill rounds only

    const attackerCell = scene.toCell(scene.attacker.x, scene.attacker.y);

    // Determine current objective (dual AI: use stashCarrier check)
    let objectiveCell;
    const thisRunnerHasStash = scene.stashCarrier === scene.attacker;
    if (!scene.hasStash) {
      objectiveCell = scene.toCell(scene.stash.x, scene.stash.y);
    } else {
      // Go to extraction regardless of who has stash
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

    // Tactical shortcut: Phase if wall blocks direct path and objective is within range
    // More aggressive range for offensive play
    if (wallBlocking && directDist <= 15) {
      console.log('[RunnerAI] 🧠 OFFENSIVE PHASE: Cutting through wall to reach objective (distance:', directDist.toFixed(1), 'cells)');
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
    const attackerCell = scene.toCell(scene.attacker.x, scene.attacker.y);

    // Calculate distance to current objective (dual AI: use stashCarrier check)
    let objectiveCell;
    const thisRunnerHasStash = scene.stashCarrier === scene.attacker;
    if (!scene.hasStash) {
      objectiveCell = scene.toCell(scene.stash.x, scene.stash.y);
    } else {
      // Go to extraction regardless of who has stash
      objectiveCell = scene.toCell(scene.extract.x, scene.extract.y);
    }
    const distToObjective = Math.hypot(
      objectiveCell.x - attackerCell.x,
      objectiveCell.y - attackerCell.y
    );

    switch (power) {
      case 'phase':
        // Defensive: Use when defender is very close (last resort panic escape)
        const defensiveUse = dist <= scene.cell * 5;

        // Offensive: Use to cut through walls for shortcuts or evasive maneuvers
        const offensiveUse = shouldPhaseForTactics();

        return defensiveUse || offensiveUse;
      case 'decoy':
        // Use decoy when defender is within sight range and no decoy exists (strategic distraction)
        return !scene.decoySprite && dist <= scene.cell * 18;
      case 'dash':
        // OFFENSIVE: Dash to grab stash quickly or reach extraction quickly
        const offensiveDash = distToObjective <= 8 && distToObjective >= 3;

        // DEFENSIVE: Dash when defender is approaching (create separation)
        const defensiveDash = dist <= scene.cell * 15 && dist >= scene.cell * 4;

        return offensiveDash || defensiveDash;
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
