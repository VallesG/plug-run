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
    });

    this.scene.bulletsA.getChildren().forEach(b => {
      if (rectsOverlap(b, this.scene.defender)) {
        this.scene._spawnBulletImpact?.(b.x, b.y, b._color || 0xffffff);
        b._glow?.destroy?.();
        b._rim?.destroy?.();
        b.destroy();
        this.hit(this.scene.defender);
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

    this.scene.cameras.main.shake(80, 0.006);
    this.scene.tweens.add({
      targets: who,
      alpha: 0.2,
      duration: 70,
      yoyo: true,
      repeat: Math.max(1, Math.floor((this.scene.iFrameMs || 900) / (70 * 2)) - 1),
      onComplete: () => who.setAlpha(1)
    });

    if (who.hp <= 0) {
      if (who === this.scene.attacker) {
        if (this.scene.mode === 'pve' && this.scene.role === 'plug') {
          this.scene.handlePlugRunnerDefeated({ x: who.x, y: who.y });
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