// REP (Reputation) Tracker - Performance rating system
// Measures how efficiently/skillfully a player completes a round
// Uses WAR-like scale (0-20) for meaningful comparison

const BASE_REP_PER_ROUND = 10.0;
const TIME_DECAY_PER_SECOND = 0.02;

// Runner penalties
const RUNNER_PENALTIES = {
  HIT_BY_BULLET: -0.5,
  BUNK_STASH: -1.0,
  POWER_GHOST: -0.75,
  POWER_DECOY: -0.6,
  POWER_SPEED: -0.6
};

// Runner bonuses
const RUNNER_BONUSES = {
  ROUND_COMPLETE: 1.0,
  SPEED_LIGHTNING: 2.0,  // < 30s
  SPEED_FAST: 1.0,       // < 45s
  SPEED_GOOD: 0.5,       // < 60s
  FLAWLESS: 1.5,         // No damage
  NO_POWERS: 1.0,        // No powers used
  PERFECT: 3.0,          // Flawless + No powers (replaces both)
  FIRST_TRY: 0.75        // Got real stash first try
};

// Plug penalties
const PLUG_PENALTIES = {
  MISSED_SHOT: -0.03,
  MISSED_MELEE: -0.05,
  POWER_TRAP: -0.75,
  POWER_VISION: -0.6,
  POWER_SPEED: -0.6,
  RUNNER_GOT_STASH: -2.0,
  RUNNER_EXTRACTED: -5.0
};

// Plug bonuses
const PLUG_BONUSES = {
  ELIMINATED_RUNNER: 2.0,
  QUICK_KILL_FAST: 2.0,      // < 20s
  QUICK_KILL_GOOD: 1.0,      // < 40s
  QUICK_KILL_DECENT: 0.5,    // < 60s
  ACCURACY_HIGH: 1.5,        // >= 80%
  ACCURACY_GOOD: 0.75,       // >= 60%
  NO_POWERS: 1.0,
  EARLY_ELIMINATION: 1.0     // Before stash pickup
};

export class RepTracker {
  constructor(role, scene) {
    this.role = role; // 'runner' or 'plug'
    this.scene = scene; // Phaser scene for displaying floating text
    this.reset();
  }

  reset() {
    this.baseRep = BASE_REP_PER_ROUND;
    this.startTime = Date.now();
    this.events = []; // Track all events for validation

    // Stats tracking
    this.stats = {
      shotsFired: 0,
      shotsHit: 0,
      damagesTaken: 0,
      powersUsed: [],
      roundComplete: false,
      runnerEliminated: false,
      runnerGotStash: false,
      runnerExtracted: false,
      gotBunkStash: false,
      gotRealStashFirstTry: true,
      eliminatedBeforeStash: false
    };
  }

  startRound(roundNumber) {
    this.roundNumber = roundNumber;
    this.reset();
  }

  // ============ EVENT HANDLERS ============

  onBulletFired(hit) {
    if (this.role === 'plug') {
      this.stats.shotsFired++;
      if (hit) {
        this.stats.shotsHit++;
      } else {
        this.applyChange(PLUG_PENALTIES.MISSED_SHOT, 'MISSED_SHOT');
      }
    }
  }

  onBulletHitPlayer() {
    if (this.role === 'runner') {
      this.stats.damagesTaken++;
      this.applyChange(RUNNER_PENALTIES.HIT_BY_BULLET, 'HIT_BY_BULLET');
    }
  }

  onMeleeMiss() {
    if (this.role === 'plug') {
      this.applyChange(PLUG_PENALTIES.MISSED_MELEE, 'MISSED_MELEE');
    }
  }

  onPowerUsed(powerType) {
    this.stats.powersUsed.push(powerType);

    if (this.role === 'runner') {
      const penalties = {
        'ghost': RUNNER_PENALTIES.POWER_GHOST,
        'decoy': RUNNER_PENALTIES.POWER_DECOY,
        'speed': RUNNER_PENALTIES.POWER_SPEED
      };
      this.applyChange(penalties[powerType] || -0.6, `POWER_${powerType.toUpperCase()}`);
    } else if (this.role === 'plug') {
      const penalties = {
        'trap': PLUG_PENALTIES.POWER_TRAP,
        'vision': PLUG_PENALTIES.POWER_VISION,
        'speed': PLUG_PENALTIES.POWER_SPEED
      };
      this.applyChange(penalties[powerType] || -0.6, `POWER_${powerType.toUpperCase()}`);
    }
  }

  onStashPickup(isBunk) {
    if (this.role === 'runner') {
      if (isBunk) {
        this.stats.gotBunkStash = true;
        this.stats.gotRealStashFirstTry = false;
        this.applyChange(RUNNER_PENALTIES.BUNK_STASH, 'BUNK_STASH');
      }
    } else if (this.role === 'plug') {
      this.stats.runnerGotStash = true;
      this.applyChange(PLUG_PENALTIES.RUNNER_GOT_STASH, 'RUNNER_GOT_STASH');
    }
  }

  onRunnerEliminated() {
    if (this.role === 'plug') {
      this.stats.runnerEliminated = true;

      // Check if eliminated before getting stash
      if (!this.stats.runnerGotStash) {
        this.stats.eliminatedBeforeStash = true;
      }
    }
  }

  onRunnerExtracted() {
    if (this.role === 'plug') {
      this.stats.runnerExtracted = true;
      this.applyChange(PLUG_PENALTIES.RUNNER_EXTRACTED, 'RUNNER_EXTRACTED');
    }
  }

  onRoundComplete() {
    this.stats.roundComplete = true;
  }

  // ============ CALCULATION ============

  applyChange(amount, reason) {
    this.events.push({
      time: Date.now() - this.startTime,
      amount,
      reason
    });

    // Show floating text in game (optional - can be disabled)
    if (this.scene && amount < 0) {
      this.showRepChange(amount, reason);
    }
  }

  showRepChange(amount, reason) {
    // Could implement floating text display here
    // For now just log
    // console.log(`[REP] ${amount > 0 ? '+' : ''}${amount} (${reason})`);
  }

  calculateFinalRep(repMultiplier = 1.0) {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    let finalRep = this.baseRep;

    // Apply all event changes
    for (const event of this.events) {
      finalRep += event.amount;
    }

    // Time decay
    const timePenalty = elapsed * -TIME_DECAY_PER_SECOND;
    finalRep += timePenalty;

    // Role-specific bonuses
    if (this.role === 'runner' && this.stats.roundComplete) {
      finalRep += this.calculateRunnerBonuses(elapsed);
    } else if (this.role === 'plug' && this.stats.runnerEliminated) {
      finalRep += this.calculatePlugBonuses(elapsed);
    }

    // Apply multiplier (for repeat completions)
    finalRep = finalRep * repMultiplier;

    // Round to 1 decimal place for clean display
    finalRep = Math.round(finalRep * 10) / 10;

    // Never go below 0
    finalRep = Math.max(0, finalRep);

    return {
      finalRep,
      baseRep: this.baseRep,
      timePenalty,
      elapsed,
      repMultiplier,
      breakdown: this.getBreakdown(elapsed, repMultiplier)
    };
  }

  calculateRunnerBonuses(elapsed) {
    let bonuses = 0;

    // Round complete
    bonuses += RUNNER_BONUSES.ROUND_COMPLETE;

    // Speed bonuses
    if (elapsed < 30) {
      bonuses += RUNNER_BONUSES.SPEED_LIGHTNING;
    } else if (elapsed < 45) {
      bonuses += RUNNER_BONUSES.SPEED_FAST;
    } else if (elapsed < 60) {
      bonuses += RUNNER_BONUSES.SPEED_GOOD;
    }

    // Flawless & no powers check
    const flawless = this.stats.damagesTaken === 0;
    const noPowers = this.stats.powersUsed.length === 0;

    if (flawless && noPowers) {
      // Perfect round - replaces individual bonuses
      bonuses += RUNNER_BONUSES.PERFECT;
    } else {
      if (flawless) bonuses += RUNNER_BONUSES.FLAWLESS;
      if (noPowers) bonuses += RUNNER_BONUSES.NO_POWERS;
    }

    // First try bonus
    if (this.stats.gotRealStashFirstTry) {
      bonuses += RUNNER_BONUSES.FIRST_TRY;
    }

    return bonuses;
  }

  calculatePlugBonuses(elapsed) {
    let bonuses = 0;

    // Elimination bonus
    bonuses += PLUG_BONUSES.ELIMINATED_RUNNER;

    // Quick kill bonuses
    if (elapsed < 20) {
      bonuses += PLUG_BONUSES.QUICK_KILL_FAST;
    } else if (elapsed < 40) {
      bonuses += PLUG_BONUSES.QUICK_KILL_GOOD;
    } else if (elapsed < 60) {
      bonuses += PLUG_BONUSES.QUICK_KILL_DECENT;
    }

    // Accuracy bonus
    if (this.stats.shotsFired > 0) {
      const accuracy = this.stats.shotsHit / this.stats.shotsFired;
      if (accuracy >= 0.8) {
        bonuses += PLUG_BONUSES.ACCURACY_HIGH;
      } else if (accuracy >= 0.6) {
        bonuses += PLUG_BONUSES.ACCURACY_GOOD;
      }
    }

    // No powers bonus
    if (this.stats.powersUsed.length === 0) {
      bonuses += PLUG_BONUSES.NO_POWERS;
    }

    // Early elimination (before stash pickup)
    if (this.stats.eliminatedBeforeStash) {
      bonuses += PLUG_BONUSES.EARLY_ELIMINATION;
    }

    return bonuses;
  }

  getBreakdown(elapsed, repMultiplier) {
    const breakdown = {
      base: this.baseRep,
      time: elapsed * -TIME_DECAY_PER_SECOND,
      events: {},
      bonuses: {},
      multiplier: repMultiplier
    };

    // Group events by reason
    for (const event of this.events) {
      if (!breakdown.events[event.reason]) {
        breakdown.events[event.reason] = 0;
      }
      breakdown.events[event.reason] += event.amount;
    }

    // Calculate bonuses
    if (this.role === 'runner' && this.stats.roundComplete) {
      breakdown.bonuses = {
        complete: RUNNER_BONUSES.ROUND_COMPLETE,
        speed: this.getSpeedBonus(elapsed),
        performance: this.getPerformanceBonus()
      };
    } else if (this.role === 'plug' && this.stats.runnerEliminated) {
      breakdown.bonuses = {
        elimination: PLUG_BONUSES.ELIMINATED_RUNNER,
        speed: this.getPlugSpeedBonus(elapsed),
        accuracy: this.getAccuracyBonus(),
        other: this.getPlugOtherBonuses()
      };
    }

    return breakdown;
  }

  getSpeedBonus(elapsed) {
    if (elapsed < 30) return RUNNER_BONUSES.SPEED_LIGHTNING;
    if (elapsed < 45) return RUNNER_BONUSES.SPEED_FAST;
    if (elapsed < 60) return RUNNER_BONUSES.SPEED_GOOD;
    return 0;
  }

  getPerformanceBonus() {
    const flawless = this.stats.damagesTaken === 0;
    const noPowers = this.stats.powersUsed.length === 0;

    if (flawless && noPowers) return RUNNER_BONUSES.PERFECT;

    let bonus = 0;
    if (flawless) bonus += RUNNER_BONUSES.FLAWLESS;
    if (noPowers) bonus += RUNNER_BONUSES.NO_POWERS;
    if (this.stats.gotRealStashFirstTry) bonus += RUNNER_BONUSES.FIRST_TRY;
    return bonus;
  }

  getPlugSpeedBonus(elapsed) {
    if (elapsed < 20) return PLUG_BONUSES.QUICK_KILL_FAST;
    if (elapsed < 40) return PLUG_BONUSES.QUICK_KILL_GOOD;
    if (elapsed < 60) return PLUG_BONUSES.QUICK_KILL_DECENT;
    return 0;
  }

  getAccuracyBonus() {
    if (this.stats.shotsFired === 0) return 0;
    const accuracy = this.stats.shotsHit / this.stats.shotsFired;
    if (accuracy >= 0.8) return PLUG_BONUSES.ACCURACY_HIGH;
    if (accuracy >= 0.6) return PLUG_BONUSES.ACCURACY_GOOD;
    return 0;
  }

  getPlugOtherBonuses() {
    let bonus = 0;
    if (this.stats.powersUsed.length === 0) bonus += PLUG_BONUSES.NO_POWERS;
    if (this.stats.eliminatedBeforeStash) bonus += PLUG_BONUSES.EARLY_ELIMINATION;
    return bonus;
  }

  // ============ DISPLAY HELPERS ============

  getStatsDisplay() {
    return {
      role: this.role,
      time: Math.floor((Date.now() - this.startTime) / 1000),
      damagesTaken: this.stats.damagesTaken,
      powersUsed: this.stats.powersUsed.length,
      accuracy: this.stats.shotsFired > 0
        ? Math.floor((this.stats.shotsHit / this.stats.shotsFired) * 100)
        : 0
    };
  }
}

export default RepTracker;
