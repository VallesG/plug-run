import Phaser from 'phaser';
import { rectsOverlap } from '../utils/gameUtils.js';

/**
 * CombatSystem - Handles all weapon and combat mechanics
 *
 * Manages weapon firing, bullet physics, hit detection, damage,
 * and visual effects for combat.
 */
export default class CombatSystem {
  constructor(scene) {
    this.scene = scene;

    // Fire rate control
    this._mouseCDAt = 0;
    this._mouseRateMs = 140;

    // Shooting state
    this._shootTicker = 0;
  }

  /**
   * Main update loop for combat
   */
  update(delta) {
    this.updateBullets(delta);
    this.checkHits();
  }

  /**
   * Fire a weapon burst from origin in aim direction
   */
  spawnWeaponBurst(origin, aim, weapon, group) {
    // Fire SFX for weapon burst (uses real asset if present; else oscillator fallback)
    try {
      this.scene.audio?.play('gun_fire', { volume: 0.8, rateRand: 0.06 });
      this.scene.audio?.duckForGunshot?.();
    } catch {}

    const stats = this.scene.getWeaponStats(weapon);
    const ax = aim?.x ?? 0;
    const ay = aim?.y ?? 0;
    const len = Math.hypot(ax, ay) || 1;
    const baseAngle = Math.atan2(ay / len, ax / len);
    const pellets = stats?.spreadAngles?.length ? stats.spreadAngles : [0];

    // Subtle muzzle flash: cyan ring + short directional streak (smaller, high-contrast)
    const flashColor = 0x60a5fa; // electric blue for contrast on wood/brown floors
    const flashR = Math.max(4, Math.floor(this.scene.cell * 0.14));
    const deg = (baseAngle * 180) / Math.PI;

    // ring
    const flashRing = this.scene.add.graphics().setDepth(11);
    flashRing.lineStyle(Math.max(1, Math.floor(this.scene.cell * 0.07)), flashColor, 1);
    flashRing.strokeCircle(0, 0, Math.floor(flashR * 0.9));
    flashRing.setBlendMode(Phaser.BlendModes.ADD);
    flashRing.setPosition(origin.x, origin.y);
    this.scene.tweens.add({
      targets: flashRing,
      alpha: 0,
      scaleX: 1.35,
      scaleY: 1.35,
      duration: 80,
      ease: 'Cubic.easeOut',
      onComplete: () => flashRing.destroy()
    });

    // streak
    const streakLen = Math.max(6, Math.floor(this.scene.cell * 0.40));
    const streakThk = Math.max(2, Math.floor(this.scene.cell * 0.06));
    const streak = this.scene.add.rectangle(
      origin.x + Math.cos(baseAngle) * flashR,
      origin.y + Math.sin(baseAngle) * flashR,
      streakLen,
      streakThk,
      flashColor,
      0.95
    )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(11)
      .setAngle(deg);
    this.scene.tweens.add({
      targets: streak,
      alpha: 0,
      scaleX: 1.5,
      duration: 80,
      ease: 'Cubic.easeOut',
      onComplete: () => streak.destroy()
    });

    // Pick high-contrast bullet palette based on floor appearance
    const isLightFloor = (() => {
      if (Array.isArray(this.scene.theme?.checkerColors) && this.scene.theme.checkerColors.length >= 2) {
        const lum = (hex) => {
          const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
          return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        };
        const avg = this.scene.theme.checkerColors.reduce((s, c) => s + lum(c), 0) / this.scene.theme.checkerColors.length;
        return avg > 0.7;
      }
      if (this.scene.theme?.floorSet === 'wood') return false;
      if (typeof this.scene.theme?.floorTint === 'number') {
        const r = (this.scene.theme.floorTint >> 16) & 255;
        const g = (this.scene.theme.floorTint >> 8) & 255;
        const b = this.scene.theme.floorTint & 255;
        const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return L > 0.7;
      }
      return false;
    })();

    const palette = (() => {
      if (!this.scene.fxBulletHighContrast) {
        // default behavior: theme-aware but softer (lean on weapon tint/PvE red)
        const base = (this.scene.mode === 'pve') ? 0xef4444 : (stats?.color ?? 0xffd166);
        const rim = isLightFloor ? 0xffffff : 0xef4444;
        return { fill: base, rim };
      }
      // High contrast: strong red on light floors, pure white on dark floors
      return isLightFloor ? { fill: 0xef4444, rim: 0xffffff } : { fill: 0xffffff, rim: 0xef4444 };
    })();

    const useNormalBlend = !!(this.scene.fxBulletHighContrast && isLightFloor);
    pellets.forEach((offset) => {
      const ang = baseAngle + Phaser.Math.DegToRad(offset);
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      // Use high-contrast color based on floor theme
      const color = palette.fill;
      const radius = Math.max(3, Math.floor(this.scene.cell * 0.13));
      const bullet = this.scene.add.circle(origin.x, origin.y, radius, color, 1)
        .setDepth(10)
        .setBlendMode(useNormalBlend ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
      group.add(bullet);
      bullet.vx = dx * (stats?.speed ?? 300);
      bullet.vy = dy * (stats?.speed ?? 300);
      bullet.life = 1200;
      bullet._color = color;
      bullet._radius = radius;
      bullet._trailAt = performance.now();
      bullet._repTracked = false; // Mark if we've tracked this bullet's outcome for REP

      // Soft glow that follows the projectile
      bullet._glow = this.scene.add.circle(origin.x, origin.y, Math.floor(radius * 1.7), color, 0.28)
        .setDepth(9)
        .setBlendMode(Phaser.BlendModes.ADD);

      // high-contrast rim; on very light floors, use a darker NORMAL-blend outline so it doesn't wash out
      const rim = this.scene.add.graphics().setDepth(10);
      const rimColor = (isLightFloor && this.scene.fxBulletHighContrast) ? 0xb91c1c : palette.rim;
      const rimBlend = (isLightFloor && this.scene.fxBulletHighContrast) ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD;
      const rimRadius = Math.floor(radius * 1.12); // consistent rim size across all themes
      const rimThk = Math.max(1, Math.floor(this.scene.cell * 0.06)); // thicker rim for better visibility
      rim.lineStyle(rimThk, rimColor, 0.95);
      rim.strokeCircle(0, 0, rimRadius);
      rim.setBlendMode(rimBlend);
      rim.setPosition(origin.x, origin.y);
      bullet._rim = rim;
    });
  }

  /**
   * Update bullet movement and lifetime
   */
  updateBullets(delta) {
    const dt = delta / 1000;
    const now = performance.now();

    const spawnTrail = (x, y, color) => {
      const t = this.scene.add.circle(x, y, Math.max(2, Math.floor(this.scene.cell * 0.10)), color, 0.55)
        .setDepth(8)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: t,
        alpha: 0,
        scale: 0.6,
        duration: 220,
        ease: 'Cubic.easeOut',
        onComplete: () => t.destroy()
      });
    };

    const impact = (x, y, color, playSound = false) => {
      const f = this.scene.add.circle(x, y, Math.max(5, Math.floor(this.scene.cell * 0.20)), color, 0.95)
        .setDepth(12)
        .setBlendMode(Phaser.BlendModes.ADD);
      const ring = this.scene.add.circle(x, y, Math.max(7, Math.floor(this.scene.cell * 0.26)), 0xffffff, 0.25)
        .setDepth(12)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: [f, ring],
        alpha: 0,
        scale: 1.4,
        duration: 160,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          f.destroy();
          ring.destroy();
        }
      });
      // a couple quick sparkles
      for (let i = 0; i < 2; i++) {
        spawnTrail(x + (Math.random() - 0.5) * this.scene.cell * 0.2, y + (Math.random() - 0.5) * this.scene.cell * 0.2, color);
      }
      // Impact SFX only when hitting players (not walls)
      if (playSound) {
        try {
          this.scene.audio?.play('impact', { volume: 0.85, rateRand: 0.05 });
        } catch {}
      }
    };

    // expose impact helper for hit() to use when we destroy bullets in other paths
    this.scene._spawnBulletImpact = (x, y, color) => impact(x, y, color, true); // player hits play sound

    const step = (group) => {
      group.getChildren().forEach(b => {
        b.x += (b.vx || 0) * dt;
        b.y += (b.vy || 0) * dt;
        if (b._glow) {
          b._glow.x = b.x;
          b._glow.y = b.y;
        }
        if (b._rim) {
          b._rim.x = b.x;
          b._rim.y = b.y;
        }
        if (!b._trailAt || (now - b._trailAt) > 45) {
          spawnTrail(b.x, b.y, b._color || 0xffffff);
          b._trailAt = now;
        }
        b.life -= delta;
        if (this.scene.isBulletBlockedAtWorld(b.x, b.y) || b.life <= 0) {
          // Track bullet miss for REP (if it expires/hits wall without hitting target)
          if (this.scene.progressionManager?.repTracker && this.scene.role === 'plug' && group === this.scene.bulletsD && !b._repTracked) {
            this.scene.progressionManager.repTracker.onBulletFired(false); // Missed shot
            b._repTracked = true;
          }
          impact(b.x, b.y, b._color || 0xffffff);
          b._glow?.destroy?.();
          b._rim?.destroy?.();
          b.destroy();
        }
      });
    };

    step(this.scene.bulletsA);
    step(this.scene.bulletsD);
  }

  /**
   * Check for bullet collisions with players
   */
  checkHits() {
    const phasing = this.scene.runnerIsPhasing();

    this.scene.bulletsD.getChildren().forEach(b => {
      if (this.scene.decoySprite && rectsOverlap(b, this.scene.decoySprite)) {
        this.scene._spawnBulletImpact?.(b.x, b.y, b._color || 0xffffff);
        // Track bullet hit decoy (counts as hit for plug)
        if (this.scene.progressionManager?.repTracker && this.scene.role === 'plug' && !b._repTracked) {
          this.scene.progressionManager.repTracker.onBulletFired(true);
          b._repTracked = true;
        }
        b._glow?.destroy?.();
        b._rim?.destroy?.();
        b.destroy();
        this.scene.destroyDecoySprite();
        return;
      }
      if (rectsOverlap(b, this.scene.attacker)) {
        if (phasing) return;
        this.scene._spawnBulletImpact?.(b.x, b.y, b._color || 0xffffff);
        // Track bullet hit runner (counts as hit for plug)
        if (this.scene.progressionManager?.repTracker && this.scene.role === 'plug' && !b._repTracked) {
          this.scene.progressionManager.repTracker.onBulletFired(true);
          b._repTracked = true;
        }
        b._glow?.destroy?.();
        b._rim?.destroy?.();
        b.destroy();
        if (this.scene.canDamage(this.scene.attacker)) {
          this.hit(this.scene.attacker);
        }
      }
      // Dual AI: Check collision with second attacker
      if (this.scene.attacker2 && this.scene.attacker2.active && rectsOverlap(b, this.scene.attacker2)) {
        if (phasing) return; // TODO: Check if attacker2 is also phasing
        this.scene._spawnBulletImpact?.(b.x, b.y, b._color || 0xffffff);
        b._glow?.destroy?.();
        b._rim?.destroy?.();
        b.destroy();
        if (this.scene.canDamage(this.scene.attacker2)) {
          this.hit(this.scene.attacker2);
        }
      }
    });

    this.scene.bulletsA.getChildren().forEach(b => {
      if (rectsOverlap(b, this.scene.defender)) {
        this.scene._spawnBulletImpact?.(b.x, b.y, b._color || 0xffffff);
        b._glow?.destroy?.();
        b._rim?.destroy?.();
        b.destroy();
        this.hit(this.scene.defender);
      }
      // Dual AI: Check collision with second defender
      if (this.scene.defender2 && this.scene.defender2.active && rectsOverlap(b, this.scene.defender2)) {
        this.scene._spawnBulletImpact?.(b.x, b.y, b._color || 0xffffff);
        b._glow?.destroy?.();
        b._rim?.destroy?.();
        b.destroy();
        this.hit(this.scene.defender2);
      }
    });
  }

  /**
   * Apply damage to a character
   */
  hit(who) {
    if (!this.scene.canDamage(who)) return;

    who.hp -= 1;
    who.iUntil = performance.now() + (this.scene.iFrameMs || 900);

    // Track damage for REP system
    if (this.scene.progressionManager?.repTracker && who === this.scene.attacker && this.scene.role === 'runner') {
      this.scene.progressionManager.repTracker.onBulletHitPlayer();
    }

    // Play a quick 'ouch' hit SFX
    try {
      this.scene.audio?.play('ouch', { volume: 0.7, rateRand: 0.03 });
    } catch {}

    this.scene.cameras.main.shake(90, 0.007);

    // === DAMAGE FEEDBACK: three distinct visual states ===
    // 1) IMPACT FLASH — hard white tint-fill snap decaying through red.
    //    Reads as "hit landed" even in peripheral vision, and (since tint is
    //    a recorded property) shows up in replays automatically.
    const flashTargets = [who.sprite, ...(who.outline || [])].filter(Boolean);
    const savedTints = flashTargets.map(t => (t.isTinted && !t.tintFill) ? t.tintTopLeft : null);
    flashTargets.forEach(t => { try { t.setTintFill(0xffffff); } catch {} });
    this.scene.time.delayedCall(80, () => flashTargets.forEach(t => {
      if (t.active) { try { t.setTintFill(0xff5544); } catch {} }
    }));
    this.scene.time.delayedCall(200, () => flashTargets.forEach((t, i) => {
      if (!t.active) return;
      try { if (savedTints[i] !== null) t.setTint(savedTints[i]); else t.clearTint(); } catch {}
    }));

    // 2) I-FRAME STROBE — high-contrast 1.0 <-> 0.25 (~11Hz), the universal
    //    "temporarily untouchable" signal. Starts after the impact frame so
    //    the flash lands clean, runs the rest of the i-frame window.
    const iMs = this.scene.iFrameMs || 900;
    this.scene.time.delayedCall(120, () => {
      if (!who.active) return;
      this.scene.tweens.add({
        targets: who,
        alpha: 0.25,
        duration: 45,
        yoyo: true,
        repeat: Math.max(1, Math.floor((iMs - 120) / 90) - 1),
        onComplete: () => { if (who.active) who.setAlpha(1); }
      });
    });

    // 3) HURT STATE — at 1 HP, once the strobe ends the glow outline wears
    //    a pulsing amber warning until death or round end: "next one ends it."
    if (who.hp === 1 && who.outline?.length) {
      this.scene.time.delayedCall(iMs, () => {
        if (!who.active || who.hp !== 1) return;
        who.outline.forEach(o => { if (o.active) { try { o.setTint(0xffb020); } catch {} } });
        who._hurtTween = this.scene.tweens.add({
          targets: who.outline,
          alpha: { from: 0.85, to: 0.35 },
          duration: 550,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      });
    }

    if (who.hp <= 0) {
      if (who === this.scene.attacker || who === this.scene.attacker2) {
        if (this.scene.mode === 'pve' && this.scene.role === 'plug') {
          // Dual AI: Check if BOTH attackers are dead before ending round
          const attacker1Dead = !this.scene.attacker || !this.scene.attacker.active || this.scene.attacker.hp <= 0;
          const attacker2Dead = !this.scene.attacker2 || !this.scene.attacker2.active || this.scene.attacker2.hp <= 0;

          console.log('[DualAI] Death check - attacker1Dead:', attacker1Dead, 'attacker2Dead:', attacker2Dead);
          console.log('[DualAI] Killed attacker:', who === this.scene.attacker ? 'attacker' : who === this.scene.attacker2 ? 'attacker2' : 'unknown');

          if (attacker1Dead && attacker2Dead) {
            // Both attackers defeated - round over
            console.log('[DualAI] Both attackers dead - ending round');
            this.scene.handlePlugRunnerDefeated({ x: who.x, y: who.y });
          } else {
            // One attacker still alive
            console.log('[DualAI] One attacker defeated, stashCarrier:', this.scene.stashCarrier);

            // Hide the dead attacker FIRST before any other operations
            who.setVisible(false);
            who.setActive(false);

            // Check if THIS killed runner was carrying stash
            if (this.scene.hasStash && who === this.scene.stashCarrier) {
              try {
                console.log('[DualAI] Stash carrier defeated, attempting to drop stash');

                // Remove carry package FIRST (while we can still access the container)
                if (this.scene.carrySprite) {
                  console.log('[DualAI] Destroying carry sprite');
                  this.scene.carrySprite.destroy();
                  this.scene.carrySprite = null;
                  this.scene.stashCarrier = null;
                }

                console.log('[DualAI] Positioning dropped stash at:', who.x, who.y);
                // Position stash at death location
                const dropX = who.x;
                const dropY = who.y;
                this.scene.stash.setPosition(dropX, dropY);
                this.scene.stash.setVisible(true);
                this.scene.stash.setActive(true);

                console.log('[DualAI] Restoring stash halo');
                // Restore stash halo visibility and drawing function
                if (this.scene.stashHalo) {
                  this.scene.stashHalo.setVisible(true);

                  // Restore the halo drawing function (was set to null on pickup)
                  this.scene._drawStashHalo = () => {
                    if (!this.scene.stashHalo) return;
                    this.scene.stashHalo.clear();
                    const t = (performance.now() % 1200) / 1200;
                    const r = this.scene.cell * (0.65 + 0.15 * Math.sin(t * 2 * Math.PI));
                    const drawAt = (obj) => {
                      if (!obj || !obj.active || obj.visible === false) return;
                      const a = Math.max(0.0, Math.min(1.0, obj.alpha ?? 1));
                      this.scene.stashHalo.lineStyle(3, 0x86efac, 0.9 * a);
                      this.scene.stashHalo.strokeCircle(obj.x, obj.y, r);
                    };
                    drawAt(this.scene.stash);
                  };
                }

                console.log('[DualAI] Hiding car beacon and stopping sounds');
                // Hide beacon and reset hasStash
                this.scene.hideCarBeacon?.();
                this.scene.hasStash = false;

                // Stop engine sounds
                try { this.scene.audio?.stopEngineLoop(); } catch {}

                console.log('[DualAI] Stash drop complete');
              } catch (e) {
                console.error('[DualAI] Error dropping stash:', e);
                console.error('[DualAI] Stack trace:', e.stack);
                // Ensure hasStash is reset even if drop fails
                this.scene.hasStash = false;
              }
            }

            console.log('[DualAI] One attacker defeated, one still active - continuing round');

            // Immediately clean up dead attacker references to prevent stale references
            if (who === this.scene.attacker && this.scene.attacker2 && this.scene.attacker2.active && this.scene.attacker2.hp > 0) {
              // Primary attacker died, promote attacker2
              console.log('[DualAI Death] Primary attacker died, promoting attacker2 to primary');
              this.scene.attacker = this.scene.attacker2;
              this.scene.aiRunnerPowersSelected = this.scene.aiRunnerPowersSelected2;
              this.scene.aiRunnerPowersConsumed = this.scene.aiRunnerPowersConsumed2;
              this.scene.attacker2 = null;
              this.scene.aiController2 = null;
              this.scene.aiRunnerPowersSelected2 = null;
              this.scene.aiRunnerPowersConsumed2 = null;
            } else if (who === this.scene.attacker2) {
              // Secondary attacker died, clean it up
              console.log('[DualAI Death] Secondary attacker died, cleaning up attacker2 references');
              this.scene.attacker2 = null;
              this.scene.aiController2 = null;
              this.scene.aiRunnerPowersSelected2 = null;
              this.scene.aiRunnerPowersConsumed2 = null;
            }
          }
        } else {
          this.scene.endRound('defender');
        }
      } else {
        this.scene.endRound('attacker');
      }
    }
  }

  /**
   * Fire weapon as plug
   */
  firePlug() {
    if (this.scene.role !== 'plug') return;
    const weapon = this.scene.weapon;
    if (!weapon) return;
    if ((this.scene.roundAmmo[weapon] || 0) <= 0) return;

    this.scene.roundAmmo[weapon] -= 1;

    // Use playerGunAim for both desktop AND mobile when available (fixes drag-aim on mobile)
    const aim = (this.scene.playerController?.playerGunAim || this.scene.playerAim) || { x: 1, y: 0 };
    this.spawnWeaponBurst(this.scene.defender, aim, weapon, this.scene.bulletsD);

    // Play a quick shooting animation if available
    if (this.scene.defender?.sprite?.anims && !this.scene.defender?.usesTD) {
      this.scene.defender.sprite.play('plug-shot', true);
      if (this.scene.defender.outline) {
        for (const o of this.scene.defender.outline) o.play('plug-shot', true);
      }
      this.scene.defender.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        // resume appropriate loop based on motion handled in updateAvatarVisuals
      });
    }

    if (this.scene.totalRoundsLeft() === 0) this.scene.meleeEnabled = true;
  }

  /**
   * Try to fire mouse-controlled weapon
   */
  tryMouseFire() {
    if (this.scene.role !== 'plug') return;
    const now = performance.now();
    if (now < (this._mouseCDAt || 0)) return;
    this._mouseCDAt = now + (this._mouseRateMs || 140);
    this.firePlug();
  }
}