import RepTracker from '../utils/repTracker.js';
import { getCurrentRouteID, getRouteSeed } from '../utils/seededRandom.js';
import {
  updateRouteProgress,
  recordRoundCompletion,
  saveSessionState,
  clearSessionState
} from '../utils/routeProgress.js';
import { submitScore, submitAllTimeScore } from '../utils/leaderboardManager.js';
import { getCurrentUser, updateUserStats } from '../utils/userManager.js';
import { rectsOverlap, overlaps } from '../utils/gameUtils.js';
import { trackGameStart, trackRoundComplete, trackGameOver } from '../utils/analytics.js';

/**
 * ProgressionManager - Handles round flow, extraction, and session state
 *
 * Manages round start/end, extraction sequences, REP calculations,
 * and persistent session state for continue feature.
 */
export default class ProgressionManager {
  constructor(scene) {
    this.scene = scene;
    this.repTracker = null;
  }

  /**
   * Initialize RepTracker for a new round
   */
  startRound(roundNum) {
    // Track game start on round 1
    if (roundNum === 1) {
      trackGameStart('pve', this.scene.role, roundNum);
    }

    if (!this.repTracker) {
      this.repTracker = new RepTracker(this.scene.role, this.scene);
    }
    this.repTracker.startRound(roundNum || 1);
  }

  /**
   * Handle successful extraction sequence (runner reached car with stash)
   */
  startExtractionSequence() {
    if (this.scene.roundOver) return;

    const cleanupArena = () => {
      this.scene.destroyDecoySprite?.();
      const destroyGroup = (group) => {
        const children = group?.getChildren?.() || [];
        children.forEach((b) => b.destroy());
      };
      destroyGroup(this.scene.bulletsA);
      destroyGroup(this.scene.bulletsD);
      this.scene.vfx?.hideCarBeacon?.();
      this.scene.removeCarryPackage?.();
      // Stop engine idle loop (extraction complete)
      try {
        this.scene.audio?.stopEngineLoop();
      } catch {}
      this.scene.hasStash = false;
    };

    // PvE Plug mode: runner extracted (plug failed)
    if (this.scene.mode === 'pve' && this.scene.role === 'plug') {
      this.scene.roundOver = true;
      this.scene.roundPausedForMenu = true;
      this.scene.input.keyboard.enabled = false;
      this.scene._mouseDown = false;
      cleanupArena();
      this.scene.attacker?.setVisible(false);

      // Track runner extraction for REP calculation (plug failed)
      if (this.repTracker) {
        this.repTracker.onRunnerExtracted();
      }

      this.scene.pveBestRound = Math.max(this.scene.pveBestRound ?? 0, this.scene.pveRound || 1);
      this.scene.gameUI?.showPvEGameOver?.({ reason: 'runner_extracted' }) || this.scene.showPvEGameOver?.({ reason: 'runner_extracted' });
      return;
    }

    // PvE mode: update stats and show floating rewards, then continue with normal extraction
    if (this.scene.mode === 'pve') {
      // Track successful round completion
      trackRoundComplete(this.scene.role, this.scene.pveRound || 1, true);
      console.log('[PvE] Extraction! Round:', this.scene.pveRound, 'Mode:', this.scene.mode);

      // Track round completion for REP calculation
      if (this.repTracker) {
        this.repTracker.onRoundComplete();
      }

      // Calculate rewards using new tracking system
      const roundCompletion = recordRoundCompletion(this.scene.role, this.scene.pveRound);
      const stashEarned = roundCompletion.earnedStash ? 1 : 0;

      // Calculate REP using RepTracker
      let repEarned = 0;
      if (this.repTracker) {
        const repResult = this.repTracker.calculateFinalRep(roundCompletion.repMultiplier);
        repEarned = repResult.finalRep;
        console.log('[PvE] REP Breakdown:', repResult.breakdown);
      }

      this.scene.pveSessionStash += stashEarned;
      this.scene.pveSessionRep += repEarned;
      this.scene.pveBestRound = Math.max(this.scene.pveBestRound, this.scene.pveRound);
      console.log('[PvE] Stats - Stash:', stashEarned, 'Rep:', repEarned, 'Total Stash:', this.scene.pveSessionStash, 'Total Rep:', this.scene.pveSessionRep);
      console.log('[PvE] Completion:', roundCompletion.completionCount, 'times, multiplier:', roundCompletion.repMultiplier);

      // Update user's total accumulated stash and REP
      const user = getCurrentUser();
      updateUserStats({
        totalStash: (user.stats?.totalStash || 0) + stashEarned,
        totalRep: (user.stats?.totalRep || 0) + repEarned
      });

      // Track route progress for leaderboard
      updateRouteProgress(this.scene.role, this.scene.pveRound);

      // Save session state (for continue feature) - save next round since that's what they'll play
      saveSessionState(this.scene.role, {
        pveRound: this.scene.pveRound + 1,
        pveSessionStash: this.scene.pveSessionStash,
        pveSessionRep: this.scene.pveSessionRep,
        pveBestRound: this.scene.pveBestRound
      });

      // Submit score to daily leaderboard
      submitScore(this.scene.role, this.scene.pveRound, this.scene.pveSessionStash, this.scene.pveSessionRep);

      // Submit to all-time leaderboard
      submitAllTimeScore(this.scene.role, this.scene.pveRound, this.scene.pveSessionStash, this.scene.pveSessionRep);

      // Show floating numbers at extraction point (will stay visible during fade and next round's power modal)
      this.scene.vfx?.showFloatingRewards?.(stashEarned, repEarned);
      // Continue with normal extraction sequence (fade, restart, power modal will show automatically)
    }

    this.scene.roundOver = true;
    this.scene.input.keyboard.enabled = false;
    this.scene._mouseDown = false;
    cleanupArena();

    const doFade = () => {
      const veil = this.scene.add.rectangle(
        this.scene.cameras.main.centerX,
        this.scene.cameras.main.centerY,
        this.scene.scale.gameSize.width,
        this.scene.scale.gameSize.height,
        0x000000,
        0
      ).setScrollFactor(0).setDepth(5000);

      this.scene.tweens.add({
        targets: veil,
        alpha: 1,
        duration: 500,
        ease: 'Sine.easeIn',
        onComplete: () => {
          // If in tutorial mode, transition back to tutorial scene for next stage
          if (this.scene.tutorialStage === 4) {
            // Completed runner tutorial, go to plug tutorial
            this.scene.scene.start('TUTORIAL_MINI', { continueToStage: 5 });
          } else if (this.scene.tutorialStage === 5) {
            // Completed plug tutorial, show completion
            this.scene.scene.start('TUTORIAL_MINI', { continueToStage: 6 });
          } else {
            // Restart with new seed (preserve mode for PvE)
            const newSeed = (Math.random() * 2 ** 32) | 0;
            this.scene.scene.restart({
              mode: this.scene.mode,
              role: this.scene.role,
              seed: newSeed,
              pveRound: this.scene.mode === 'pve' ? (this.scene.pveRound || 1) + 1 : undefined,
              pveSessionStash: this.scene.pveSessionStash,
              pveSessionRep: this.scene.pveSessionRep,
              pveBestRound: this.scene.pveBestRound
            });
          }
        }
      });
    };

    // Runner boards the car: move to the car nose and shrink/fade
    const boardThenDrive = () => {
      if (this.scene.car) {
        const dist = this.scene.cell * 8;
        const dx = this.scene.carOutDir?.x || 0;
        const dy = this.scene.carOutDir?.y || 0;

        // Move car, lights, and beacon together (matching tutorial)
        const targets = [this.scene.car];
        if (this.scene.carLights) targets.push(this.scene.carLights);
        if (this.scene.vfx?.carBeacon) targets.push(this.scene.vfx.carBeacon);

        this.scene.tweens.add({
          targets: targets,
          x: `+=${dx * dist}`,
          y: `+=${dy * dist}`,
          duration: 1200,
          ease: 'Sine.easeIn',
          onComplete: doFade
        });
      } else {
        doFade();
      }
    };

    if (this.scene.attacker && this.scene.car) {
      const noseX = this.scene.car.x + (this.scene.carOutDir?.x || 0) * (this.scene.cell * 0.8);
      const noseY = this.scene.car.y + (this.scene.carOutDir?.y || 0) * (this.scene.cell * 0.8);
      // "Sucked into vehicle" effect matching tutorial animation
      // Keep carry package attached so it shrinks with runner (looks more natural)
      this.scene.tweens.add({
        targets: this.scene.attacker,
        x: noseX,
        y: noseY,
        scaleX: 0.1,
        scaleY: 0.1,
        alpha: 0,
        duration: 400,
        ease: 'Sine.easeIn',
        onComplete: () => {
          this.scene.attacker.setVisible(false);
          // Remove carry package after animation completes
          try {
            this.scene.removeCarryPackage?.();
          } catch {}
          boardThenDrive();
        }
      });
    } else {
      boardThenDrive();
    }
  }

  /**
   * End round (death or timeout)
   */
  endRound(winner) {
    if (this.scene.roundOver) return;
    this.scene.roundOver = true;

    // clear bullets & effects
    this.scene.bulletsA?.getChildren?.().forEach(b => b.destroy());
    this.scene.bulletsD?.getChildren?.().forEach(b => b.destroy());
    this.scene.destroyDecoySprite?.();

    const runnerWon = (winner === 'attacker');

    // freeze movement input
    this.scene.input.keyboard.enabled = false;

    console.log('[endRound] Mode:', this.scene.mode, 'Winner:', winner, 'Runner won:', runnerWon);

    // PvE mode: only show game over modal on death
    // (successful extraction handled by startExtractionSequence)
    if (this.scene.mode === 'pve') {
      console.log('[endRound] PvE mode detected!');
      if (!runnerWon) {
        console.log('[endRound] Runner died, showing game over modal');
        this.showPvEGameOver();
      }
      return;
    }

    // PvP mode: original behavior
    const title = runnerWon ? 'Runner Extracted!' : 'Plug Defended!';
    const sub = runnerWon ? 'Package delivered to the getaway.' : 'Runner was stopped (or time ran out).';

    const modal = this.scene.gameUI?.showModal?.({
      title,
      lines: [sub],
      buttons: [
        {
          label: 'Rematch (same role)',
          bg: 0x1a2038,
          color: '#cbd1ff',
          onClick: () => this.scene.scene.restart({ role: this.scene.role, seed: (Math.random() * 2 ** 32) | 0 })
        },
        {
          label: 'Switch Role',
          bg: 0x1a2038,
          color: '#cbd1ff',
          onClick: () => this.scene.scene.restart({ role: (this.scene.role === 'runner' ? 'plug' : 'runner'), seed: (Math.random() * 2 ** 32) | 0 })
        },
      ]
    });

    if (this.scene.gameUI) {
      this.scene.gameUI.currentModal = modal;
    } else {
      this.scene.currentModal = modal;
    }
  }

  /**
   * Show PvE game over modal
   */
  showPvEGameOver(context = {}) {
    const roundNumber = this.scene.pveRound || 1;
    const isPlug = this.scene.role === 'plug';
    const reason = context.reason || (isPlug ? 'runner_eliminated' : 'runner_eliminated');
    const roundLabel = `ROUND ${roundNumber}`;

    let title;
    let descriptor;
    if (isPlug) {
      if (reason === 'runner_extracted') {
        title = `STASH STOLEN - ${roundLabel}`;
        descriptor = 'The AI runner escaped with the stash.';
      } else {
        title = `DEFENSE ENDED - ${roundLabel}`;
        descriptor = 'Defense concluded.';
      }
    } else {
      title = `ELIMINATED - ${roundLabel}`;
      descriptor = 'Run Ended';
    }

    this.scene.pveBestRound = Math.max(this.scene.pveBestRound ?? 0, roundNumber);

    // Track game over event
    trackGameOver(
      this.scene.role,
      roundNumber,
      this.scene.pveSessionStash || 0,
      this.scene.pveSessionRep || 0
    );

    // Track route progress for leaderboard
    updateRouteProgress(this.scene.role, roundNumber);

    // Submit score to daily leaderboard
    submitScore(this.scene.role, roundNumber, this.scene.pveSessionStash, this.scene.pveSessionRep);

    // Submit to all-time leaderboard
    submitAllTimeScore(this.scene.role, roundNumber, this.scene.pveSessionStash, this.scene.pveSessionRep);

    // Build buttons array
    const routeID = this.scene.currentRouteID ?? getCurrentRouteID();
    const continueSeed = getRouteSeed(routeID, roundNumber, this.scene.role);
    const restartSeed = getRouteSeed(routeID, 1, this.scene.role);

    const buttons = [
      {
        label: `Continue from Round ${roundNumber}`,
        bg: 0x2a1a38,
        color: '#fbbf24',
        onClick: () => this.scene.scene.restart({
          mode: 'pve',
          role: isPlug ? 'plug' : 'runner',
          pveRound: roundNumber, // Same round
          pveSessionStash: this.scene.pveSessionStash,
          pveSessionRep: this.scene.pveSessionRep,
          pveBestRound: this.scene.pveBestRound,
          seed: continueSeed
        })
      },
      {
        label: isPlug ? 'Defend Again (Round 1)' : 'Run Again (Round 1)',
        bg: 0x1a2038,
        color: '#86efac',
        onClick: () => {
          this.scene.scene.restart({
            mode: 'pve',
            role: isPlug ? 'plug' : 'runner',
            pveRound: 1,
            pveSessionStash: 0,
            pveSessionRep: 0,
            pveBestRound: 0,
            seed: restartSeed
          });
        }
      },
      {
        label: 'Exit',
        bg: 0x1a2038,
        color: '#cbd1ff',
        onClick: () => this.scene.scene.start('MENU')
      }
    ];

    const modal = this.scene.gameUI?.showModal?.({
      title,
      lines: [
        descriptor,
        ``,
        `Total Stash Collected: ${this.scene.pveSessionStash}`,
        `Total Rep Earned: ${this.scene.pveSessionRep}`,
        `Best Round: ${this.scene.pveBestRound}`
      ],
      buttons
    });

    if (this.scene.gameUI) {
      this.scene.gameUI.currentModal = modal;
    } else {
      this.scene.currentModal = modal;
    }
  }

  /**
   * Check if runner reached extraction point (using precise overlaps for fair detection)
   */
  checkExtractionProgress() {
    if (this.scene.hasStash && overlaps(this.scene.attacker, this.scene.extract)) {
      return this.startExtractionSequence();
    }
  }

  /**
   * Cleanup progression state
   */
  cleanup() {
    this.repTracker = null;
  }
}
