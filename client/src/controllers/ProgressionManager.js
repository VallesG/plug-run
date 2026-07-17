import RepTracker from '../utils/repTracker.js';
import { getCurrentRouteID, getRouteSeed } from '../utils/seededRandom.js';
import {
  updateRouteProgress,
  recordRoundCompletion,
  saveSessionState,
  clearSessionState,
  hasUsedSpawnSwap,
  markSpawnSwapUsed
} from '../utils/routeProgress.js';
import { submitScore, submitAllTimeScore } from '../utils/leaderboardManager.js';
import ReplaySystem from './ReplaySystem.js';
import { getCurrentUser, updateUserStats } from '../utils/userManager.js';
import { rectsOverlap, overlaps } from '../utils/gameUtils.js';
import { trackGameStart, trackRoundComplete, trackGameOver } from '../utils/analytics.js';
import { logRunnerExtract, logPlugStop } from '../utils/activityFeed.js';

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
  async startExtractionSequence() {
    if (this.scene.roundOver) return;

    // Set roundOver immediately to prevent multiple calls from update loop
    this.scene.roundOver = true;
    ReplaySystem.finalize();

    const cleanupArena = () => {
      this.scene.destroyDecoySprite?.();
      const destroyGroup = (group) => {
        const children = group?.getChildren?.() || [];
        children.forEach((b) => b.destroy());
      };
      destroyGroup(this.scene.bulletsA);
      destroyGroup(this.scene.bulletsD);
      this.scene.vfx?.hideCarBeacon?.();
      // DON'T remove carry package here - let it animate with runner (removed in animation onComplete)
      // Stop engine idle loop (extraction complete)
      try {
        this.scene.audio?.stopEngineLoop();
      } catch {}
      this.scene.hasStash = false;
    };

    // PvE Plug mode: runner extracted (plug failed)
    if (this.scene.mode === 'pve' && this.scene.role === 'plug') {
      this.scene.roundOver = true;
    ReplaySystem.finalize();
      this.scene.roundPausedForMenu = true;
      this.scene.input.keyboard.enabled = false;
      this.scene._mouseDown = false;
      cleanupArena();

      // Remove carry package (no animation in plug mode - runner just extracted)
      this.scene.removeCarryPackage?.();

      // Dual AI: Hide the runner who extracted (carrier), not just attacker
      const carrier = this.scene.stashCarrier || this.scene.attacker;
      carrier?.setVisible(false);
      // Also hide the other attacker if it exists
      if (this.scene.attacker2 && carrier !== this.scene.attacker2) {
        this.scene.attacker2.setVisible(false);
      } else if (carrier !== this.scene.attacker) {
        this.scene.attacker?.setVisible(false);
      }

      // Track runner extraction for REP calculation (plug failed)
      if (this.repTracker) {
        this.repTracker.onRunnerExtracted();
      }

      // Log activity feed event: AI Runner extracted (plug failed - don't log this, only human successes)
      // Note: We don't log AI runner extracts to avoid spam in feed

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
      this.scene.pveSessionRep = Math.round((this.scene.pveSessionRep || 0) + repEarned);
      this.scene.pveBestRound = Math.max(this.scene.pveBestRound, this.scene.pveRound);
      console.log('[PvE] Stats - Stash:', stashEarned, 'Rep:', repEarned, 'Total Stash:', this.scene.pveSessionStash, 'Total Rep:', this.scene.pveSessionRep);
      console.log('[PvE] Completion:', roundCompletion.completionCount, 'times, multiplier:', roundCompletion.repMultiplier);

      // Update user's total accumulated stash and REP
      const user = getCurrentUser();
      updateUserStats({
        totalStash: (user.stats?.totalStash || 0) + stashEarned,
        totalRep: Math.round((user.stats?.totalRep || 0) + repEarned)
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

      // Submit score to daily leaderboard (don't await - let it happen in background for smooth animation)
      // Stash = current round for both modes (you just completed this round successfully)
      const stashToSubmit = this.scene.pveRound;

      (async () => {
        try {
          // Submit SESSION rep (already cumulative across this run's rounds).
          // Previous logic added pveSessionRep to existingScore.rep, which
          // double-counted every round because pveSessionRep is itself the
          // running total, not the per-round delta. Server keeps the max.
          console.log(`[ProgressionManager] 🚀 SUBMITTING DAILY SCORE - Round ${this.scene.pveRound}, Stash: ${stashToSubmit}, Session Rep: ${this.scene.pveSessionRep}`);
          await submitScore(this.scene.role, this.scene.pveRound, stashToSubmit, this.scene.pveSessionRep);
          console.log('[ProgressionManager] ✅ Daily score submitted successfully!');

          // Also submit to all-time leaderboard (successful extraction = earned stash)
          console.log(`[ProgressionManager] 🚀 SUBMITTING ALL-TIME - Stash earned: ${stashEarned}, Session Rep: ${this.scene.pveSessionRep}`);
          await submitAllTimeScore(this.scene.role, this.scene.pveRound, stashEarned, this.scene.pveSessionRep);
          console.log('[ProgressionManager] ✅ All-time score submitted successfully!');
        } catch (err) {
          console.error('[ProgressionManager] ❌ Score submission failed:', err);
        }
      })();

      // Log activity feed event: Runner extracted successfully
      logRunnerExtract(this.scene.pveRound, stashEarned > 0);

      // Show floating numbers at extraction point (will stay visible during fade and next round's power modal)
      this.scene.vfx?.showFloatingRewards?.(stashEarned, repEarned);
      // Continue with normal extraction sequence (fade, restart, power modal will show automatically)
    }

    this.scene.roundOver = true;
    ReplaySystem.finalize();
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

    // Dual AI: Animate the CARRIER (who has the stash), not just attacker
    const carrier = this.scene.stashCarrier || this.scene.attacker;

    if (carrier && carrier.active && this.scene.car) {
      const noseX = this.scene.car.x + (this.scene.carOutDir?.x || 0) * (this.scene.cell * 0.8);
      const noseY = this.scene.car.y + (this.scene.carOutDir?.y || 0) * (this.scene.cell * 0.8);
      // "Sucked into vehicle" effect matching tutorial animation
      // Keep carry package attached so it shrinks with runner (looks more natural)
      this.scene.tweens.add({
        targets: carrier,
        x: noseX,
        y: noseY,
        scaleX: 0.1,
        scaleY: 0.1,
        alpha: 0,
        duration: 400,
        ease: 'Sine.easeIn',
        onComplete: () => {
          carrier.setVisible(false);
          // Remove carry package after animation completes
          try {
            this.scene.removeCarryPackage?.();
          } catch {}
          boardThenDrive();
        }
      });
    } else {
      // No animation, just cleanup and proceed
      this.scene.removeCarryPackage?.();
      boardThenDrive();
    }
  }

  /**
   * End round (death or timeout)
   */
  endRound(winner) {
    if (this.scene.roundOver) return;
    this.scene.roundOver = true;
    ReplaySystem.finalize();

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
          variant: 'primary',
          onClick: () => this.scene.scene.restart({ role: this.scene.role, seed: (Math.random() * 2 ** 32) | 0 })
        },
        {
          label: 'Switch Role',
          variant: 'secondary',
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
  async showPvEGameOver(context = {}) {
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

    // Submit score to daily and all-time leaderboards (await to ensure completion)
    // Game over means you failed current round, so stash = last completed round (current - 1)
    // Example: Died on round 7 = completed round 6 = 6 stash
    const stashToSubmit = Math.max(0, roundNumber - 1);
    console.log(`[ProgressionManager] 🚀 GAME OVER - Submitting final scores - Round ${roundNumber}, Stash: ${stashToSubmit}, Rep: ${this.scene.pveSessionRep}`);
    await Promise.all([
      submitScore(this.scene.role, roundNumber, stashToSubmit, this.scene.pveSessionRep),
      submitAllTimeScore(this.scene.role, roundNumber, stashToSubmit, this.scene.pveSessionRep)
    ]);
    console.log('[ProgressionManager] ✅ Final scores submitted to Supabase!');

    // Build buttons array
    const routeID = this.scene.currentRouteID ?? getCurrentRouteID();
    const continueSeed = getRouteSeed(routeID, roundNumber, this.scene.role);
    const restartSeed = getRouteSeed(routeID, 1, this.scene.role);
    const role = isPlug ? 'plug' : 'runner';

    // Check if spawn swap has been used
    const swapUsed = hasUsedSpawnSwap(role);

    // Replay + Share as a compact pair at the top of the stack. Both keep the
    // modal alive (keepOpen) — it's hidden during playback and restored after.
    const replayShareRow = ReplaySystem.hasReplay(this.scene.role) ? [{
      pair: [
        {
          label: '\u25B6 Watch Replay',
          variant: 'secondary',
          keepOpen: true,
          onClick: (m) => {
            m.setVisible(false);
            ReplaySystem.play(this.scene, { onDone: () => m.setVisible(true) });
          }
        },
        {
          label: '\u2934 Share Clip',
          variant: 'secondary',
          keepOpen: true,
          onClick: (m) => {
            // Clip already rendered for this round? Share NOW, inside this
            // tap — iOS's share sheet demands a live user gesture.
            if (ReplaySystem.hasCurrentClip()) { ReplaySystem.shareClip(); return; }
            // Otherwise the clip gets rendered by watching the replay once;
            // the end screen's Share button opens the sheet from a fresh tap.
            m.setVisible(false);
            ReplaySystem.play(this.scene, { onDone: () => m.setVisible(true) });
          }
        }
      ]
    }] : [];

    const buttons = [
      ...replayShareRow,
      {
        label: `Play Round ${roundNumber} Again`,
        variant: 'primary',
        onClick: () => this.scene.scene.restart({
          mode: 'pve',
          role,
          pveRound: roundNumber, // Same round
          pveSessionStash: this.scene.pveSessionStash,
          pveSessionRep: this.scene.pveSessionRep,
          pveBestRound: this.scene.pveBestRound,
          seed: continueSeed
        })
      },
      {
        // TEMP: Removed daily limit for testing
        label: `Again & Swap Spawns`,
        variant: 'secondary',
        disabled: false, // Always enabled for testing
        onClick: () => {
          // markSpawnSwapUsed(role); // TEMP: Don't mark as used
          this.scene.scene.restart({
            mode: 'pve',
            role,
            pveRound: roundNumber, // Same round
            pveSessionStash: this.scene.pveSessionStash,
            pveSessionRep: this.scene.pveSessionRep,
            pveBestRound: this.scene.pveBestRound,
            seed: continueSeed,
            // Advance the spawn cycle each press: original -> opponent's
            // spot -> 2nd opponent's spot (round 8+) -> original again
            swapSpawnCycle: (this.scene.swapSpawnCycle || 0) + 1
          });
        }
      },
      {
        label: isPlug ? 'New Defense (Round 1)' : 'New Run (Round 1)',
        variant: 'tertiary',
        onClick: () => {
          this.scene.scene.restart({
            mode: 'pve',
            role,
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
        variant: 'danger',
        onClick: () => this.scene.scene.start('MENU')
      }
    ];

    const modal = this.scene.gameUI?.showModal?.({
      title,
      subtitle: descriptor,
      lines: [
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
      console.log('[EXTRACTION] ===== EXTRACTION TRIGGERED =====');
      console.log('[EXTRACTION] Round:', this.scene.pveRound);
      console.log('[EXTRACTION] Attacker:', this.scene.attacker === this.scene.attacker2 ? 'attacker2' : 'attacker');
      console.log('[EXTRACTION] Time since startMatch:', performance.now() - (this.scene._startMatchTime || 0), 'ms');
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