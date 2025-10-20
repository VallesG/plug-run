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

    // Corner assist state
    this._cornerAssistActive = false;
    this._cornerAssistIntended = null;
    this._cornerAssistTimeout = 0;

    // Touch/swipe state
    this._swipePid = null;
    this._swipeStart = null;
    this._aimDragActive = false;
    this._lastTapAt = 0;

    // Runner-specific state
    this._runnerInputDir = { x: 1, y: 0 };
    this._runnerMoveDir = null;
    this._runnerLastAim = null;

    // Input references (set by scene)
    this.cursors = null;
    this.wasdKeys = null;

    // Touch input thresholds
    this.SWIPE_DEAD_PX = 3;    // minimum movement to count as a swipe (reduced from 10 for quicker response)
    this.TAP_TIME_MS = 220;    // maximum duration to count as a tap
    this.TAP_MOVE_PX = 8;      // maximum movement to still count as a tap
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
   * Core player movement logic with keyboard and touch support
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
      vx = keyboardInput.vx * speed;
      vy = keyboardInput.vy * speed;

      // Update movement direction when using keys (always cardinal)
      const mag = Math.hypot(vx, vy);
      if (mag > 0.0001) {
        const nx = vx / mag;
        const ny = vy / mag;
        this.playerMoveDir = { x: nx, y: ny };
        if (sprite === this.scene.attacker) {
          this._runnerInputDir = { x: nx, y: ny };
        }
      }
    } else {
      // No keys: use straight-line movement direction (from swipe/touch)
      // ONLY move if player has given input - don't auto-move idle players!
      const moveDir = this.playerMoveDir;
      if (moveDir) {
        const lenDir = Math.hypot(moveDir.x, moveDir.y);
        if (lenDir > 0.0001) {
          vx = (moveDir.x / lenDir) * speed;
          vy = (moveDir.y / lenDir) * speed;
          if (sprite === this.scene.attacker) {
            this._runnerInputDir = { x: moveDir.x / lenDir, y: moveDir.y / lenDir };
          }
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
      const proximityThreshold = this.scene.cell * 4; // 4 cells

      // Temporarily reduce corridor assist when opponent is very close
      const originalStrength = this.scene.corridorAssistStrength;
      if (distToOpponent < proximityThreshold) {
        // Smoothly reduce assist from 1.0 → 0.3 as opponent gets closer
        const proximityFactor = Math.max(0.3, distToOpponent / proximityThreshold);
        this.scene.corridorAssistStrength = originalStrength * proximityFactor;
      }

      corridorAssist(this.scene, sprite, dir, dt);

      // Restore original strength
      this.scene.corridorAssistStrength = originalStrength;
    }

    // Apply smart corner navigation and movement
    this.applySmartMovement(sprite, vx, vy, speed, dt, usingKeys);

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
    this.scene._runnerInputDir = this._runnerInputDir;
    this.scene._runnerMoveDir = this._runnerMoveDir;
    this.scene._runnerLastAim = this._runnerLastAim;
  }

  /**
   * Process keyboard input (WASD/arrows)
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
      // Use keyboard for movement (cardinal only - Snake style)
      // Priority: horizontal > vertical
      if (leftDown || rightDown) {
        // Horizontal movement takes priority
        if (leftDown) vx = -1;
        else if (rightDown) vx = 1;
        vy = 0; // No vertical when moving horizontal
      } else if (upDown || downDown) {
        // Vertical movement only if no horizontal
        vx = 0;
        if (upDown) vy = -1;
        else if (downDown) vy = 1;
      }
    }

    return { vx, vy, usingKeys };
  }

  /**
   * Apply smart corner navigation and wall sliding
   */
  applySmartMovement(sprite, vx, vy, speed, dt, usingKeys) {
    // Check if corner-assist mode has expired
    if (this._cornerAssistActive && performance.now() > this._cornerAssistTimeout) {
      this._cornerAssistActive = false;
      this._cornerAssistIntended = null;
    }

    // Movement with smart positioning - always try intended direction first
    let intendedDir = this.playerIntendedDir || { x: 1, y: 0 };

    // If in corner-assist mode and intended direction is still blocked, find perpendicular
    if (this._cornerAssistActive && this._cornerAssistIntended) {
      const testDist = this.scene.cell * 0.8;
      const testX = sprite.x + this._cornerAssistIntended.x * testDist;
      const testY = sprite.y + this._cornerAssistIntended.y * testDist;

      // If still blocked, use perpendicular direction to navigate around
      if (!this.scene.canMoveTo(sprite, testX, testY)) {
        const perpDirs = this._cornerAssistIntended.x !== 0
          ? [{ x: 0, y: 1 }, { x: 0, y: -1 }]
          : [{ x: 1, y: 0 }, { x: -1, y: 0 }];

        for (const alt of perpDirs) {
          const altX = sprite.x + alt.x * testDist;
          const altY = sprite.y + alt.y * testDist;
          if (this.scene.canMoveTo(sprite, altX, altY)) {
            intendedDir = alt; // Use perpendicular to navigate corner
            break;
          }
        }
      } else {
        // Intended direction is now clear, resume it
        this._cornerAssistActive = false;
        intendedDir = this._cornerAssistIntended;
      }
    }

    // Calculate intended movement
    const intendedDist = Math.hypot(intendedDir.x, intendedDir.y);
    const intendedVx = (intendedDir.x / intendedDist) * (Math.abs(vx) > 0 ? Math.abs(vx) : speed);
    const intendedVy = (intendedDir.y / intendedDist) * (Math.abs(vy) > 0 ? Math.abs(vy) : speed);

    const dxTot = intendedVx * dt;
    const dyTot = intendedVy * dt;

    const targetX = sprite.x + dxTot;
    const targetY = sprite.y + dyTot;

    let movedX = false, movedY = false;

    // Try full movement in intended direction first
    if (this.scene.canMoveTo(sprite, targetX, targetY)) {
      sprite.x = targetX;
      sprite.y = targetY;
      movedX = movedY = true;
    } else {
      // Try moving along each axis independently (wall sliding)
      if (this.scene.canMoveTo(sprite, targetX, sprite.y)) {
        sprite.x = targetX;
        movedX = true;
      }
      if (this.scene.canMoveTo(sprite, sprite.x, targetY)) {
        sprite.y = targetY;
        movedY = true;
      }

      // If still stuck on primary intended axis, try smaller steps
      if (!movedX && Math.abs(intendedDir.x) > 0 && Math.abs(dxTot) > 0.1) {
        const stepX = dxTot * 0.5;
        if (this.scene.canMoveTo(sprite, sprite.x + stepX, sprite.y)) {
          sprite.x += stepX;
          movedX = true;
        }
      }
      if (!movedY && Math.abs(intendedDir.y) > 0 && Math.abs(dyTot) > 0.1) {
        const stepY = dyTot * 0.5;
        if (this.scene.canMoveTo(sprite, sprite.x, sprite.y + stepY)) {
          sprite.y += stepY;
          movedY = true;
        }
      }
    }

    // Smart positioning: gently center when blocked to help navigate corners
    // ONLY apply this on touch/mobile controls - keyboard users have precise control
    if (!usingKeys && (!movedX || !movedY) && (Math.abs(vx) + Math.abs(vy) > 0)) {
      const c = this.scene.toCell(sprite.x, sprite.y);
      const cx = this.scene.toWorldX(c.x);
      const cy = this.scene.toWorldY(c.y);

      // Check if we're off-center in the corridor
      const offsetX = sprite.x - cx;
      const offsetY = sprite.y - cy;
      const threshold = this.scene.cell * 0.35;

      // If blocked horizontally, gently center vertically to help with upcoming turns
      if (!movedX && Math.abs(intendedDir.x) > 0 && Math.abs(offsetY) > threshold) {
        const nudgeY = Math.sign(cy - sprite.y) * this.scene.cell * 0.15 * dt;
        if (this.scene.canMoveTo(sprite, sprite.x, sprite.y + nudgeY)) {
          sprite.y += nudgeY;
        }
      }

      // If blocked vertically, gently center horizontally
      if (!movedY && Math.abs(intendedDir.y) > 0 && Math.abs(offsetX) > threshold) {
        const nudgeX = Math.sign(cx - sprite.x) * this.scene.cell * 0.15 * dt;
        if (this.scene.canMoveTo(sprite, sprite.x + nudgeX, sprite.y)) {
          sprite.x += nudgeX;
        }
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
      // Convert to cardinal for Snake-like feel
      let cardinalX = 0, cardinalY = 0;
      if (Math.abs(nx) > Math.abs(ny)) {
        cardinalX = nx > 0 ? 1 : -1;
        cardinalY = 0;
      } else {
        cardinalX = 0;
        cardinalY = ny > 0 ? 1 : -1;
      }

      // Update gun aim only (cardinal direction)
      this.playerGunAim = { x: cardinalX, y: cardinalY };
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
    } else if (moved >= this.SWIPE_DEAD_PX && dt > this.TAP_TIME_MS) {
      // Quick swipe: change movement direction (cardinal only - like Snake)
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

      // Check if this swipe direction is blocked at a corner
      const who = (this.scene.role === 'plug') ? this.scene.defender : this.scene.attacker;
      if (who) {
        const testDist = this.scene.cell * 0.8;
        const testX = who.x + nx * testDist;
        const testY = who.y + ny * testDist;

        // If swiped direction is blocked, enable corner assist mode temporarily
        if (!this.scene.canMoveTo(who, testX, testY)) {
          // Try perpendicular directions to navigate around corner
          const perpDirs = nx !== 0
            ? [{ x: 0, y: 1 }, { x: 0, y: -1 }]
            : [{ x: 1, y: 0 }, { x: -1, y: 0 }];

          let altDir = null;
          for (const alt of perpDirs) {
            const altX = who.x + alt.x * testDist;
            const altY = who.y + alt.y * testDist;
            if (this.scene.canMoveTo(who, altX, altY)) {
              altDir = alt;
              break;
            }
          }

          if (altDir) {
            // Temporarily move perpendicular to navigate the corner
            this.playerMoveDir = altDir;
            this._cornerAssistActive = true;
            this._cornerAssistIntended = { x: nx, y: ny };
            this._cornerAssistTimeout = performance.now() + 400; // 400ms to clear corner
          } else {
            // Can't navigate - just update intended direction
            this.playerMoveDir = { x: nx, y: ny };
            this.playerIntendedDir = { x: nx, y: ny };
          }
        } else {
          // Clear path in swiped direction
          this.playerMoveDir = { x: nx, y: ny };
          this.playerIntendedDir = { x: nx, y: ny };
          this._cornerAssistActive = false;
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
  }
}