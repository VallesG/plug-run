import {
  isWalkableDirFrom,
  applyCenterBias,
  corridorAssist,
  toroDist
} from '../utils/gameUtils.js';
import {
  updateStreetWarsPlugAI,
  updateStreetWarsRunnerAI,
  considerStreetWarsPowerUse,
  applyStreetWarsShootingBehavior
} from '../utils/streetWarsAI.js';
import { updatePlugBehavior } from './PlugAI.js';
import { updateRunnerBehavior, considerRunnerPowerUse } from './RunnerAI.js';

/**
 * AIController - Handles all AI behavior for runners and plugs
 *
 * Manages AI movement, decision making, power usage, and shooting
 * for both the runner (attacker) and plug (defender) AI opponents.
 */
export default class AIController {
  constructor(scene) {
    this.scene = scene;

    // AI state
    this._aiVX = 0;
    this._aiVY = 0;
    this._aiPlanAt = 0;
    this._aiLastMoveDir = null;
    this._aiFlipGuardUntil = 0;
    this._aiCruiseDir = { x: 1, y: 0 };
    this._aiLastPos = null;
    this._aiStuckAt = 0;

    // Plug AI state
    this._aiPlugStrafeDir = null;
    this._aiPlugStrafeUntil = 0;

    // Runner power state
    this._aiRunnerLastPowerAt = 0;
  }

  /**
   * Update AI Runner (attacker) - Delegated to RunnerAI.js
   */
  updateRunner(delta) {
    // Street Wars: Apply human-like runner behaviors
    updateStreetWarsRunnerAI(this.scene, delta);

    // Delegate to RunnerAI module
    updateRunnerBehavior(this.scene, this, delta);
  }

  /**
   * Update AI Defender (plug) - Delegated to PlugAI.js
   */
  updatePlug(dt) {
    // Street Wars: Apply human-like behaviors
    if (updateStreetWarsPlugAI(this.scene, dt)) {
      // Street Wars behavior handled movement, skip default logic
      return;
    }

    // Street Wars: Apply human-like shooting behavior
    const vx = this.scene.attacker.x - this.scene.defender.x;
    const vy = this.scene.attacker.y - this.scene.defender.y;
    const dist = Math.hypot(vx, vy);
    if (applyStreetWarsShootingBehavior(this.scene, vx, vy, dist)) {
      // Street Wars handled shooting, but still need to move
      const d = this.scene.defender;
      const speed = this.scene.meleeEnabled ? this.scene.plugSpeedNoAmmo : this.scene.aiPlug.speed;
      const dirX = Math.sign(vx), dirY = Math.sign(vy);
      const nx = d.x + dirX * speed * dt;
      const ny = d.y + dirY * speed * dt;
      if (this.scene.canMoveTo(d, nx, d.y)) d.x = nx;
      if (this.scene.canMoveTo(d, d.x, ny)) d.y = ny;
      return;
    }

    // Delegate to PlugAI module
    updatePlugBehavior(this.scene, dt);

    // Update state back to scene for compatibility
    this.scene._aiPlugStrafeDir = this._aiPlugStrafeDir;
    this.scene._aiPlugStrafeUntil = this._aiPlugStrafeUntil;
  }

  /**
   * Consider using AI runner powers - Delegated to RunnerAI.js
   */
  considerAIRunnerPower(now) {
    considerRunnerPowerUse(this.scene, this, now);
  }
}