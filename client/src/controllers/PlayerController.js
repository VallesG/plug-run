import { corridorAssist } from '../utils/gameUtils.js';

/**
 * PlayerController - Handles all player movement and input
 *
 * Manages keyboard (WASD/arrows) and touch input (swipes/taps) for player-controlled sprites.
 * Applies corridor assist and smart corner navigation for smoother movement.
 */
export default class PlayerController {
  constructor(scene) {
    this.scene = scene;

    // Movement state
    this.playerMoveDir = { x: 1, y: 0 }; // Current movement direction
    this.playerGunAim = { x: 1, y: 0 };  // Gun aim direction (for plug)
    this.playerIntendedDir = { x: 1, y: 0 }; // Intended movement direction for smart navigation

    // Touch/swipe state
    this._swipePid = null;
    this._swipeStart = null;
    this._aimDragActive = false;
    this._lastTapAt = 0;

    // Runner-specific state
    this._runnerInputDir = { x: 1, y: 0 };
    this._runnerMoveDir = null;
    this._runnerLastAim = null;

    // Legacy-style initial drift (fallback movement when no input)
    this._initDrift = null;
    this.playerDrift = null;
    this.playerAim = null;

    // Input references (set by scene)
    this.cursors = null;
    this.wasdKeys = null;

    // Touch input thresholds
    this.SWIPE_DEAD_PX = 1;    // minimum movement to count as a swipe (reduced from 10 for quicker response)
    this.TAP_TIME_MS = 220;    // maximum duration to count as a tap
    this.TAP_MOVE_PX = 20;     // maximum movement to still count as a tap (increased to prevent accidental swipes during double-tap)
    this.DOUBLE_TAP_MAX_MS = 250; // window for double-tap power
  }

  /**
   * Main update loop - processes input and moves the player
   */
  update(dt) {
    if (!this.scene.attacker || !this.scene.defender) return;
    if (!this.scene.attacker.visible || this.scene.roundOver) return;
    if (this.scene.roundPausedForMenu) return;

    const isRunner = this.scene.role === 'runner';
    const sprite = isRunner ? this.scene.attacker : this.scene.defender;

    // Calculate movement speed
    let speed;
    if (isRunner) {
      speed = this.scene.runnerSpeed * (this.scene.hasStash ? this.scene.carrySlow : 1);
    } else {
      // Plug speed with aim slowdown
      let plugBaseSpeed = this.scene.meleeEnabled ? this.scene.plugSpeedNoAmmo : this.scene.plugSpeed;
      const aimSlow = (this._aimDragActive || (this.scene.isDesktop && this.scene._mouseDown))
        ? (this.scene.aimDragFactorPlug || 0.85) : 1;
      plugBaseSpeed *= aimSlow;
      speed = plugBaseSpeed;
    }

    // Move the player-controlled sprite
    this.handlePlayerMovement(sprite, speed, dt);
  }

  /**
   * Core player movement logic with keyboard and touch support - Legacy style
   */
  handlePlayerMovement(sprite, speed, dt) {
    // Verify this is the user-controlled sprite
    const isUserControlled =
      (this.scene.role === 'runner' && sprite === this.scene.attacker) ||
      (this.scene.role === 'plug' && sprite === this.scene.defender);

    if (!isUserControlled) {
      console.error('handlePlayerMovement called on non-player sprite!');
      return;
    }

    let vx = 0;
    let vy = 0;

    // Process keyboard input
    const keyboardInput = this.processKeyboardInput();
    const usingKeys = keyboardInput.usingKeys;

    if (usingKeys) {
      // Update gun aim direction for plug when using keyboard
      if (keyboardInput.vx !== 0 || keyboardInput.vy !== 0) {
        // Normalize diagonal movement to prevent speed boost
        const normLen = Math.hypot(keyboardInput.vx, keyboardInput.vy);
        const nx = keyboardInput.vx / normLen;
        const ny = keyboardInput.vy / normLen;

        // Use normalized values for movement (fixes diagonal speed boost)
        vx = nx * speed;
        vy = ny * speed;

        if (sprite === this.scene.defender) {
          // Desktop plug mode: Don't update gun aim from keyboard (mouse controls aim independently)
          // Mobile plug mode: Update gun aim from keyboard
          if (!(this.scene.isDesktop && this.scene.role === 'plug')) {
            this.playerGunAim = { x: nx, y: ny };
          }
        }
        this.playerMoveDir = { x: nx, y: ny };
        this.playerDrift = { x: nx, y: ny }; // Update drift so player continues in this direction

        if (sprite === this.scene.attacker) {
          this._runnerInputDir = { x: nx, y: ny };
        }
      }
    } else {
      // Legacy fallback: use player's aim or drift
      // After first user interaction, never fall back to initial drift
      const drift = this.scene.userTookOver ? (this.playerDrift || null) : (this.playerDrift || this._initDrift || null);
      const aim = this.playerAim || drift;

      // Only move if there's a valid aim/drift (don't default to right movement)
      if (aim) {
        const lenAim = Math.hypot(aim.x, aim.y);
        if (lenAim > 0.0001) {
          vx = (aim.x / lenAim) * speed;
          vy = (aim.y / lenAim) * speed;
        }
      }
    }

    // Apply corridor assist when not using keys (touch controls)
    // Reduce strength when AI opponent is very close to prevent twitching
    if (!usingKeys && (vx || vy)) {
      const dir = (Math.abs(vx) > Math.abs(vy))
        ? { x: Math.sign(vx), y: 0 }
        : { x: 0, y: Math.sign(vy) };

      // Calculate distance to opponent
      const opponent = (this.scene.role === 'runner') ? this.scene.defender : this.scene.attacker;
      const distToOpponent = Math.hypot(sprite.x - opponent.x, sprite.y - opponent.y);

      // Check if we're in a tight corridor (1x1 entrance)
      const spriteCell = this.scene.toCell(sprite.x, sprite.y);
      let wallsOnSides = 0;
      if (dir.x !== 0) {
        // Moving horizontally - check for walls above and below
        const northWall = this.scene.isWallAtWorld(sprite.x, sprite.y - this.scene.cell);
        const southWall = this.scene.isWallAtWorld(sprite.x, sprite.y + this.scene.cell);
        if (northWall) wallsOnSides++;
        if (southWall) wallsOnSides++;
      } else if (dir.y !== 0) {
        // Moving vertically - check for walls left and right
        const westWall = this.scene.isWallAtWorld(sprite.x - this.scene.cell, sprite.y);
        const eastWall = this.scene.isWallAtWorld(sprite.x + this.scene.cell, sprite.y);
        if (westWall) wallsOnSides++;
        if (eastWall) wallsOnSides++;
      }
      const inTightCorridor = wallsOnSides === 2;

      // Only reduce corridor assist when opponent is close AND we're NOT in a tight corridor
      // In tight corridors, we need maximum assist to navigate properly
      const proximityThreshold = this.scene.cell * 4; // 4 cells
      const originalStrength = this.scene.corridorAssistStrength;

      if (!inTightCorridor && distToOpponent < proximityThreshold) {
        // Smoothly reduce assist from 1.0 → 0.3 as opponent gets closer
        const proximityFactor = Math.max(0.3, distToOpponent / proximityThreshold);
        this.scene.corridorAssistStrength = originalStrength * proximityFactor;
      }

      corridorAssist(this.scene, sprite, dir, dt);

      // Restore original strength
      this.scene.corridorAssistStrength = originalStrength;
    }

    // Legacy-style movement with sub-stepping to prevent tunneling
    this.applyLegacyMovement(sprite, vx, vy, dt);

    // Cache facing direction for runner powers when moving
    const spdLen = Math.hypot(vx, vy);
    if (spdLen > 0.0001) {
      const norm = { x: vx / spdLen, y: vy / spdLen };
      if (sprite === this.scene.attacker) {
        this._runnerMoveDir = norm;
        // Only update _runnerLastAim when the player is actively driving movement
        if (usingKeys || this.scene.userTookOver) {
          this._runnerLastAim = norm;
        }
      }
    }

    // Update scene's cached values
    this.scene.playerMoveDir = this.playerMoveDir;
    this.scene.playerGunAim = this.playerGunAim;
    this.scene.playerIntendedDir = this.playerIntendedDir;
    this.scene.playerDrift = this.playerDrift;
    this.scene.playerAim = this.playerAim;
    this.scene._initDrift = this._initDrift;
    this.scene._runnerInputDir = this._runnerInputDir;
    this.scene._runnerMoveDir = this._runnerMoveDir;
    this.scene._runnerLastAim = this._runnerLastAim;
  }

  /**
   * Process keyboard input (WASD/arrows) - Legacy style with diagonal movement
   */
  processKeyboardInput() {
    const k = this.cursors || this.scene.cursors;
    const wasd = this.wasdKeys || this.scene.wasdKeys || {};

    // Determine if any keyboard movement keys are pressed
    const leftDown = k?.left?.isDown || wasd.A?.isDown;
    const rightDown = k?.right?.isDown || wasd.D?.isDown;
    const upDown = k?.up?.isDown || wasd.W?.isDown;
    const downDown = k?.down?.isDown || wasd.S?.isDown;
    const usingKeys = leftDown || rightDown || upDown || downDown;

    let vx = 0;
    let vy = 0;

    if (usingKeys) {
      // Legacy-style movement - allows diagonal movement (8-directional)
      if (leftDown) vx = -1;
      else if (rightDown) vx = 1;

      if (upDown) vy = -1;
      else if (downDown) vy = 1;
    }

    return { vx, vy, usingKeys };
  }

  /**
   * Apply legacy-style movement with sub-stepping to prevent tunneling through thin walls
   */
  applyLegacyMovement(sprite, vx, vy, dt) {
    // Attempt to move in X and Y with sub-steps to prevent tunneling through thin walls
    const dxTot = vx * dt;
    const dyTot = vy * dt;
    const stepMax = this.scene.cell * 0.28; // less than half a tile

    const moveAxis = (amount, axis) => {
      let remaining = amount;
      const dir = Math.sign(remaining) || 0;
      const step = stepMax * dir;
      let guard = 0;

      while (Math.abs(remaining) > 0.0001 && guard++ < 32) {
        const d = (Math.abs(remaining) > stepMax) ? step : remaining;
        const nx = axis === 'x' ? sprite.x + d : sprite.x;
        const ny = axis === 'y' ? sprite.y + d : sprite.y;

        if (this.scene.canMoveTo(sprite, nx, ny)) {
          if (axis === 'x') sprite.x = nx;
          else sprite.y = ny;
          remaining -= d;
        } else {
          break; // blocked on this axis
        }
      }
    };

    // Store position before movement for stuck detection
    const preX = sprite.x, preY = sprite.y;

    // Move on each axis
    moveAxis(dxTot, 'x');
    moveAxis(dyTot, 'y');

    // Legacy corner unstick logic:
    // If we barely moved (corner caught), softly nudge toward tile center to unstick
    if (Math.hypot(sprite.x - preX, sprite.y - preY) < 0.5 && (Math.abs(vx) + Math.abs(vy) > 0)) {
      const c = this.scene.toCell(sprite.x, sprite.y);
      const cx = this.scene.toWorldX(c.x);
      const cy = this.scene.toWorldY(c.y);
      const ux = cx - sprite.x, uy = cy - sprite.y;
      const ul = Math.hypot(ux, uy) || 1;
      const nudge = Math.min(this.scene.cell * 0.20, ul);
      const nx = sprite.x + (ux/ul) * nudge;
      const ny = sprite.y + (uy/ul) * nudge;

      if (this.scene.canMoveTo(sprite, nx, ny)) {
        sprite.x = nx;
        sprite.y = ny;
      }
    }
  }

  /**
   * Touch input handlers
   */
  beginSwipe(pointer) {
    // Track one touch ID at a time
    if (this._swipePid !== null) return;
    this._swipePid = pointer.id;
    this._swipeStart = { x: pointer.x, y: pointer.y, t: performance.now() };
    // When defending, treat drag as an aim gesture and slightly slow movement to help aiming
    if (this.scene.role === 'plug') this._aimDragActive = true;
  }

  updateSwipe(pointer) {
    if (pointer.id !== this._swipePid || !pointer.isDown) return;
    // Continuously update aim towards the current touch position relative to the controlled sprite
    const who = (this.scene.role === 'plug') ? this.scene.defender : this.scene.attacker;
    if (!who) return;
    const dx = pointer.x - who.x;
    const dy = pointer.y - who.y;
    const L = Math.hypot(dx, dy);
    if (L >= this.SWIPE_DEAD_PX) {
      const nx = dx / (L || 1), ny = dy / (L || 1);

      // During drag: update gun aim in cardinal direction closest to drag
      // Update gun aim with smooth 360° direction (no cardinal snapping)
      // This allows full circular aiming without affecting movement
      this.playerGunAim = { x: nx, y: ny };
      // DON'T update playerMoveDir during drag - keeps movement straight
    }
  }

  endSwipe(pointer) {
    // Determine if the gesture qualifies as a tap (short duration and limited movement)
    const sx = this._swipeStart?.x ?? pointer.x;
    const sy = this._swipeStart?.y ?? pointer.y;
    const dt = performance.now() - (this._swipeStart?.t || 0);
    const moved = Math.hypot(pointer.x - sx, pointer.y - sy);

    if (dt <= this.TAP_TIME_MS && moved <= this.TAP_MOVE_PX) {
      // Handle tap
      if (this.scene.role === 'plug') {
        // Single tap on mobile plugs fires a shot
        this.scene.combatSystem?.tryMouseFire();
      } else if (this.scene.role === 'runner') {
        // Runner: only trigger power on a confirmed double-tap
        const now = performance.now();
        const diff = now - (this._lastTapAt || 0);
        if (diff > 0 && diff <= this.DOUBLE_TAP_MAX_MS) {
          this._lastTapAt = 0;
          const used = this.scene.runnerPowersConsumed || [];
          const idxPow = used[0] ? 1 : 0;
          this.scene.activateRunnerPowerByIndex(idxPow);
        } else {
          this._lastTapAt = now;
        }
      }
    } else if (moved >= this.SWIPE_DEAD_PX) {
      // Determine if this is a quick swipe (direction change) or slow drag (aim only)
      // Quick swipe = fast motion (< 400ms), Slow drag = slower deliberate motion (>= 400ms)
      const SWIPE_SPEED_THRESHOLD_MS = 400;
      const isQuickSwipe = dt < SWIPE_SPEED_THRESHOLD_MS;

      // In plug mode: quick swipes change direction, slow drags only aim
      if (this.scene.role === 'plug' && !isQuickSwipe) {
        // Slow drag in plug mode - aim drag completed, gun aim was already updated during updateSwipe
        // Don't change movement direction
      } else {
        // Quick swipe: change intended movement direction
        const dx = pointer.x - sx, dy = pointer.y - sy;

        // Convert to cardinal direction only (no diagonals)
        let nx = 0, ny = 0;
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal swipe
          nx = dx > 0 ? 1 : -1;
          ny = 0;
        } else {
          // Vertical swipe
          nx = 0;
          ny = dy > 0 ? 1 : -1;
        }

        // Simply update the movement direction
        this.playerMoveDir = { x: nx, y: ny };
        this.playerIntendedDir = { x: nx, y: ny };
        this.playerDrift = { x: nx, y: ny };  // Legacy-style drift

        // Update gun aim for plug so orientation updates correctly
        if (this.scene.role === 'plug') {
          this.playerGunAim = { x: nx, y: ny };
        }

        // Update running direction for sprite
        const who = (this.scene.role === 'plug') ? this.scene.defender : this.scene.attacker;
        if (who && this.scene.role === 'runner') {
          this._runnerInputDir = { x: nx, y: ny };
        }
      }
    }

    // Reset swipe state
    if (pointer.id === this._swipePid) {
      this._swipePid = null;
      this._swipeStart = null;
      this._aimDragActive = false;
    }
  }

  /**
   * Initialize input controls
   */
  initializeInputs() {
    // Get references from scene
    this.cursors = this.scene.cursors;
    this.wasdKeys = this.scene.wasdKeys;

    // Set initial drift from scene if available
    if (this.scene._initDrift) {
      this._initDrift = this.scene._initDrift;
      this.playerDrift = this._initDrift;
      this.playerMoveDir = this._initDrift;
    }
  }

  /**
   * Set initial drift direction (legacy support)
   */
  setInitialDrift(dir) {
    if (dir && Math.hypot(dir.x, dir.y) > 0.0001) {
      this._initDrift = { ...dir };
      if (!this.scene.userTookOver) {
        this.playerDrift = { ...dir };
        this.playerMoveDir = { ...dir };
      }
    }
  }
}