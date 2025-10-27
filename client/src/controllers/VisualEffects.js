/**
 * VisualEffects - Handles all visual effects and particles
 *
 * Manages character trails, stash halos, floating rewards, car beacons,
 * and all tween animations for visual feedback.
 */
export default class VisualEffects {
  constructor(scene) {
    this.scene = scene;

    // Trail state
    this._runnerTrailTimer = 0;
    this._runnerLastTrailPos = null;
    this._defenderTrailTimer = 0;
    this._defenderLastTrailPos = null;

    // Dual AI trail state
    this._runner2TrailTimer = 0;
    this._runner2LastTrailPos = null;
    this._defender2TrailTimer = 0;
    this._defender2LastTrailPos = null;

    // Stash halo state
    this._drawStashHalo = null;
    this.stashHalo = null;

    // Car beacon state
    this.carBeacon = null;
    this._drawCarBeacon = null;
  }

  /**
   * Main update loop - updates all active visual effects
   */
  update(dt) {
    // Update stash halo position if active
    this._drawStashHalo?.();

    // Update car beacon position if active
    this._drawCarBeacon?.();

    // Update character trails
    this.updateRunnerTrail(dt);
    this.updateDefenderTrail(dt);

    // Dual AI: Update second AI trails if they exist and are alive
    if (this.scene.attacker2 && this.scene.attacker2.visible && this.scene.attacker2.active && this.scene.attacker2.hp > 0) {
      this.updateRunner2Trail(dt);
    }
    if (this.scene.defender2 && this.scene.defender2.visible && this.scene.defender2.active && this.scene.defender2.hp > 0) {
      this.updateDefender2Trail(dt);
    }
  }

  /**
   * Update runner character flame trail effect
   */
  updateRunnerTrail(dt) {
    if (!this.scene.attacker || !this.scene.attacker.visible) return;

    // Initialize trail tracking
    if (!this._runnerLastTrailPos) {
      this._runnerLastTrailPos = { x: this.scene.attacker.x, y: this.scene.attacker.y };
    }

    this._runnerTrailTimer += dt * 1000; // Convert to milliseconds

    // Calculate movement direction
    const dx = this.scene.attacker.x - this._runnerLastTrailPos.x;
    const dy = this.scene.attacker.y - this._runnerLastTrailPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1 && this._runnerTrailTimer >= 40) {
      this._runnerTrailTimer = 0;

      // Normalize direction to get unit vector
      const dirX = dx / distance;
      const dirY = dy / distance;

      // Place trail BEHIND the character (opposite of movement direction)
      const baseX = this._runnerLastTrailPos.x;
      const baseY = this._runnerLastTrailPos.y;

      this._runnerLastTrailPos = { x: this.scene.attacker.x, y: this.scene.attacker.y };

      // Create 2 particles behind the character
      for (let i = 0; i < 2; i++) {
        // Small perpendicular offset for width
        const perpX = -dirY * (Math.random() - 0.5) * this.scene.cell * 0.3;
        const perpY = dirX * (Math.random() - 0.5) * this.scene.cell * 0.3;

        // Blue flame colors - brighter to darker
        const colors = [0x60a5fa, 0x3b82f6, 0x2563eb];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const trail = this.scene.add.circle(
          baseX + perpX,
          baseY + perpY,
          this.scene.cell * 0.35,
          color,
          0.7
        ).setDepth(1);

        // Fade and shrink
        this.scene.tweens.add({
          targets: trail,
          alpha: 0,
          scale: 0.2,
          duration: 500,
          ease: 'Cubic.easeOut',
          onComplete: () => trail.destroy()
        });
      }
    }
  }

  /**
   * Update defender character flame trail effect
   */
  updateDefenderTrail(dt) {
    if (!this.scene.defender || !this.scene.defender.visible) return;

    // Initialize trail tracking
    if (!this._defenderLastTrailPos) {
      this._defenderLastTrailPos = { x: this.scene.defender.x, y: this.scene.defender.y };
    }

    this._defenderTrailTimer += dt * 1000; // Convert to milliseconds

    // Calculate movement direction
    const dx = this.scene.defender.x - this._defenderLastTrailPos.x;
    const dy = this.scene.defender.y - this._defenderLastTrailPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1 && this._defenderTrailTimer >= 40) {
      this._defenderTrailTimer = 0;

      // Normalize direction to get unit vector
      const dirX = dx / distance;
      const dirY = dy / distance;

      // Place trail BEHIND the character (opposite of movement direction)
      const baseX = this._defenderLastTrailPos.x;
      const baseY = this._defenderLastTrailPos.y;

      this._defenderLastTrailPos = { x: this.scene.defender.x, y: this.scene.defender.y };

      // Create 2 particles behind the character
      for (let i = 0; i < 2; i++) {
        // Small perpendicular offset for width
        const perpX = -dirY * (Math.random() - 0.5) * this.scene.cell * 0.3;
        const perpY = dirX * (Math.random() - 0.5) * this.scene.cell * 0.3;

        // Red flame colors - brighter to darker
        const colors = [0xef4444, 0xdc2626, 0xb91c1c];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const trail = this.scene.add.circle(
          baseX + perpX,
          baseY + perpY,
          this.scene.cell * 0.35,
          color,
          0.7
        ).setDepth(1);

        // Fade and shrink
        this.scene.tweens.add({
          targets: trail,
          alpha: 0,
          scale: 0.2,
          duration: 500,
          ease: 'Cubic.easeOut',
          onComplete: () => trail.destroy()
        });
      }
    }
  }

  /**
   * Update second runner character flame trail effect (Dual AI)
   */
  updateRunner2Trail(dt) {
    if (!this.scene.attacker2 || !this.scene.attacker2.visible) return;

    // Initialize trail tracking
    if (!this._runner2LastTrailPos) {
      this._runner2LastTrailPos = { x: this.scene.attacker2.x, y: this.scene.attacker2.y };
    }

    this._runner2TrailTimer += dt * 1000;

    const dx = this.scene.attacker2.x - this._runner2LastTrailPos.x;
    const dy = this.scene.attacker2.y - this._runner2LastTrailPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1 && this._runner2TrailTimer >= 40) {
      this._runner2TrailTimer = 0;

      const dirX = dx / distance;
      const dirY = dy / distance;
      const baseX = this._runner2LastTrailPos.x;
      const baseY = this._runner2LastTrailPos.y;

      this._runner2LastTrailPos = { x: this.scene.attacker2.x, y: this.scene.attacker2.y };

      for (let i = 0; i < 2; i++) {
        const perpX = -dirY * (Math.random() - 0.5) * this.scene.cell * 0.3;
        const perpY = dirX * (Math.random() - 0.5) * this.scene.cell * 0.3;

        const colors = [0x60a5fa, 0x3b82f6, 0x2563eb];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const trail = this.scene.add.circle(
          baseX + perpX,
          baseY + perpY,
          this.scene.cell * 0.35,
          color,
          0.7
        ).setDepth(1);

        this.scene.tweens.add({
          targets: trail,
          alpha: 0,
          scale: 0.2,
          duration: 500,
          ease: 'Cubic.easeOut',
          onComplete: () => trail.destroy()
        });
      }
    }
  }

  /**
   * Update second defender character flame trail effect (Dual AI)
   */
  updateDefender2Trail(dt) {
    if (!this.scene.defender2 || !this.scene.defender2.visible) return;

    // Initialize trail tracking
    if (!this._defender2LastTrailPos) {
      this._defender2LastTrailPos = { x: this.scene.defender2.x, y: this.scene.defender2.y };
    }

    this._defender2TrailTimer += dt * 1000;

    const dx = this.scene.defender2.x - this._defender2LastTrailPos.x;
    const dy = this.scene.defender2.y - this._defender2LastTrailPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1 && this._defender2TrailTimer >= 40) {
      this._defender2TrailTimer = 0;

      const dirX = dx / distance;
      const dirY = dy / distance;
      const baseX = this._defender2LastTrailPos.x;
      const baseY = this._defender2LastTrailPos.y;

      this._defender2LastTrailPos = { x: this.scene.defender2.x, y: this.scene.defender2.y };

      for (let i = 0; i < 2; i++) {
        const perpX = -dirY * (Math.random() - 0.5) * this.scene.cell * 0.3;
        const perpY = dirX * (Math.random() - 0.5) * this.scene.cell * 0.3;

        const colors = [0xef4444, 0xdc2626, 0xb91c1c];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const trail = this.scene.add.circle(
          baseX + perpX,
          baseY + perpY,
          this.scene.cell * 0.35,
          color,
          0.7
        ).setDepth(1);

        this.scene.tweens.add({
          targets: trail,
          alpha: 0,
          scale: 0.2,
          duration: 500,
          ease: 'Cubic.easeOut',
          onComplete: () => trail.destroy()
        });
      }
    }
  }

  /**
   * Create animated halo around both stash packages (real and bunk)
   */
  createStashHalo() {
    // Destroy any existing halo
    this.destroyStashHalo();

    // Create a graphics object for drawing halos around both stashes
    this.stashHalo = this.scene.add.graphics().setDepth(999).setVisible(true);

    this._drawStashHalo = () => {
      if (!this.stashHalo) return;
      this.stashHalo.clear();

      // Animate the radius with a sine wave
      const t = (performance.now() % 1200) / 1200;
      const r = this.scene.cell * (0.65 + 0.15 * Math.sin(t * 2 * Math.PI));

      // Helper function to draw halo around an object
      const drawAt = (obj) => {
        if (!obj || !obj.active || obj.visible === false) return;
        const a = Math.max(0.0, Math.min(1.0, obj.alpha ?? 1));

        // Draw main halo circle
        this.stashHalo.lineStyle(3, 0x86efac, 0.9 * a);
        this.stashHalo.strokeCircle(obj.x, obj.y, r);

        // Draw outer faint circle
        this.stashHalo.lineStyle(1, 0x86efac, 0.4 * a);
        this.stashHalo.strokeCircle(obj.x, obj.y, r + 6);
      };

      // Draw halos around both real and bunk stashes
      drawAt(this.scene.stash);
      drawAt(this.scene.bunkStash);
    };
  }

  /**
   * Destroy stash halo effect
   */
  destroyStashHalo() {
    this._drawStashHalo = null;
    if (this.stashHalo) {
      this.stashHalo.clear();
      this.stashHalo.setVisible(false);
      this.stashHalo.destroy();
      this.stashHalo = null;
    }
  }

  /**
   * Show floating reward numbers (stash and REP) with animation
   */
  showFloatingRewards(stashEarned, repEarned, origin) {
    // Use provided origin (e.g., runner death spot) or fall back to extraction/car location
    const originX = origin?.x ?? this.scene.car?.x ?? this.scene.attacker?.x ?? (this.scene.scale.width / 2);
    const originY = origin?.y ?? this.scene.car?.y ?? this.scene.attacker?.y ?? (this.scene.scale.height / 2);

    // Convert world position to screen position
    const cam = this.scene.cameras.main;
    const screenX = (originX - cam.scrollX) * cam.zoom + cam.x;
    const screenY = (originY - cam.scrollY) * cam.zoom + cam.y;

    // Calculate direction towards screen center
    const centerX = this.scene.cameras.main.centerX;
    const centerY = this.scene.cameras.main.centerY;

    // Vector from extraction point to center
    const dx = centerX - screenX;
    const dy = centerY - screenY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Normalize and scale to float distance (60% of the way to center)
    const floatDistance = Math.min(120, distance * 0.6);
    const normalizedDx = distance > 0 ? (dx / distance) * floatDistance : 0;
    const normalizedDy = distance > 0 ? (dy / distance) * floatDistance : -80; // fallback: float up if already at center

    // Add some perpendicular offset to space them out (perpendicular to the direction vector)
    const perpX = -normalizedDy; // perpendicular vector
    const perpY = normalizedDx;

    // When near center, use fixed vertical offset instead of perpendicular offset to prevent overlap
    let stashEndX, stashEndY, repEndX, repEndY;

    if (distance < 150) {
      // NEAR CENTER: Use fixed vertical separation to prevent overlap
      const verticalOffset = 55;
      stashEndX = screenX + normalizedDx;
      stashEndY = screenY + normalizedDy - verticalOffset;
      repEndX = screenX + normalizedDx;
      repEndY = screenY + normalizedDy + verticalOffset;
    } else {
      // FAR FROM CENTER: Use perpendicular offset as before
      const perpScale = 0.44; // how much to offset perpendicular
      stashEndX = screenX + normalizedDx + perpX * perpScale;
      stashEndY = screenY + normalizedDy + perpY * perpScale;
      repEndX = screenX + normalizedDx - perpX * perpScale;
      repEndY = screenY + normalizedDy - perpY * perpScale;
    }

    // Create floating stash text
    const stashText = this.scene.add.text(screenX, screenY, `+${stashEarned} STASH`, {
      color: '#86efac',
      fontSize: '28px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(20001).setScrollFactor(0);

    // Create floating rep text (at same start position)
    const repText = this.scene.add.text(screenX, screenY, `+${repEarned} REP`, {
      color: '#ffd166',
      fontSize: '22px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(20001).setScrollFactor(0);

    // Animate stash: float towards center (with slight offset) and fade out
    stashText.setAlpha(0);
    this.scene.tweens.add({
      targets: stashText,
      alpha: 1,
      x: stashEndX,
      y: stashEndY,
      duration: 2000,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: stashText,
          alpha: 0,
          duration: 500,
          onComplete: () => stashText.destroy()
        });
      }
    });

    // Animate rep: float towards center (with offset on opposite side) and fade out
    repText.setAlpha(0);
    this.scene.tweens.add({
      targets: repText,
      alpha: 1,
      x: repEndX,
      y: repEndY,
      duration: 2000,
      delay: 100, // slight delay after stash
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: repText,
          alpha: 0,
          duration: 500,
          onComplete: () => repText.destroy()
        });
      }
    });
  }

  /**
   * Show animated beacon at extraction car
   */
  showCarBeacon() {
    if (!this.scene.car) return;
    this.hideCarBeacon();

    const noseX = this.scene.car.x + (this.scene.carOutDir?.x || 0) * (this.scene.cell * 0.8);
    const noseY = this.scene.car.y + (this.scene.carOutDir?.y || 0) * (this.scene.cell * 0.8);
    const c = this.scene.add.container(noseX, noseY).setDepth(1300);
    const w = this.scene.cell * 1.8, h = this.scene.cell * 1.2;

    const glow = this.scene.add.ellipse(0, 0, w, h, 0x60a5fa, 0.55)
      .setBlendMode(Phaser.BlendModes.ADD);
    const inner = this.scene.add.ellipse(0, 0, w * 0.6, h * 0.5, 0xffffff, 0.35)
      .setBlendMode(Phaser.BlendModes.ADD);

    c.add([glow, inner]);

    this.scene.tweens.add({
      targets: glow,
      alpha: 0.25,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.scene.tweens.add({
      targets: c,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.carBeacon = c;

    this._drawCarBeacon = () => {
      if (!this.scene.car || !this.carBeacon) return;
      const nx = this.scene.car.x + (this.scene.carOutDir?.x || 0) * (this.scene.cell * 0.8);
      const ny = this.scene.car.y + (this.scene.carOutDir?.y || 0) * (this.scene.cell * 0.8);
      this.carBeacon.x = nx;
      this.carBeacon.y = ny;
    };
  }

  /**
   * Hide/destroy car beacon
   */
  hideCarBeacon() {
    this._drawCarBeacon = null;
    if (this.carBeacon) {
      this.carBeacon.destroy();
      this.carBeacon = null;
    }
  }

  /**
   * Cleanup all effects
   */
  cleanup() {
    this.destroyStashHalo();
    this.hideCarBeacon();
    this._runnerLastTrailPos = null;
    this._defenderLastTrailPos = null;
    this._runnerTrailTimer = 0;
    this._defenderTrailTimer = 0;
  }
}
