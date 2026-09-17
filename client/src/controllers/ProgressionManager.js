import { drawBlockComplete } from './BlockComplete.js';
import { crewSigil } from '../logic/crewSigils.js';
import { seasonChapter, seasonCue, seasonFinish } from '../logic/crewSeason.js';
import { CITY_BLOCKS, cityForBlock, cityView } from '../logic/city.js';
import { getCityProgress, completeCityBlock, startCityIntro } from '../utils/cityProgress.js';
import { drawCityMap } from './CityMap.js';
import { missionExitAllowed } from '../logic/missionItem.js';
import { advanceJourney } from '../logic/worldBlocks.js';
import { saveJourneyProgress } from '../utils/journeyProgress.js';
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
import { crewChapter, crewConsultationPages } from '../logic/crewStory.js';
import { contact, gangContacts, contactCue, praiseEarned } from '../logic/contacts.js';
import { showContactPanel } from './ContactPanel.js';
import { claimContact, getContactProgress, finishCrewStory } from '../utils/contactProgress.js';
import { noteHouseObservation } from '../utils/skillEvidence.js';
import { campaignHouseScale } from '../logic/skillEvidence.js';
import { praiseUsedInBlock, praiseMark, crewStoryProgress } from '../logic/contactProgress.js';
import { startBlockRunTracking, getBlockRunStats, noteHouseClear, noteBlockDeath, noteMissionOutcome } from '../utils/blockRunProgress.js';
import { getWindowState } from '../utils/windowProgress.js';
import { isBlockComplete, PVE_BLOCK_MAPS } from '../logic/blockFormat.js';
import { drawBlockMap } from './BlockMap.js';
import { SESSION_RULES, streakBonus } from '../utils/repTracker.js';
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

  saveProgress(data, completed = false) {
    if (this.scene.runKind === 'rivals') return false;
    if (this.scene.runKind !== 'journey') return saveSessionState(this.scene.role, data);
    const checkpoint = { ...data, blockIndex: this.scene.blockIndex,
      swapSpawnCycle: data.swapSpawnCycle ?? this.scene.swapSpawnCycle ?? 0 };
    if (completed && this.scene.pveRound === PVE_BLOCK_MAPS) {
      completeCityBlock({ mode: this.scene.mode, runKind: this.scene.runKind, role: this.scene.role,
        blockIndex: this.scene.blockIndex, clearedHouses: this.scene.pveRound,
        hasStash: this.scene.hasStash === true,
        gangID: this.scene.blockGangID ?? getWindowState().gangID });
    }
    return saveJourneyProgress(completed
      ? advanceJourney({ ...checkpoint, pveRound: this.scene.pveRound })
      : checkpoint);
  }

  /**
   * Initialize RepTracker for a new round
   */
  startRound(roundNum) {
    if (this.scene.runKind === 'rivals') return;
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
    if (this.scene.runKind === 'rivals') return this.scene.rivals?.clearHouse();
    if (this.scene.roundOver) return;
    if (!missionExitAllowed({
      mode: this.scene.mode, runKind: this.scene.runKind, role: this.scene.role,
      required: this.scene.requiresMissionItem || Boolean(this.scene.missionObject),
      tookItem: this.scene.hasMissionItem, hasStash: this.scene.hasStash
    })) {
      this.scene.showMissionExitHint?.();
      return false;
    }

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
      // Plug mode: the AI runner got away. A loss, despite being the
      // "extraction" path — hence the distinct outcome label.
      this.scene.finalizeRun?.('runner_extracted');
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
      const roundCompletion = this.scene.runKind === 'journey'
        ? { earnedStash: true, repMultiplier: 1, completionCount: 1 }
        : recordRoundCompletion(this.scene.role, this.scene.pveRound);
      const stashEarned = roundCompletion.earnedStash ? 1 : 0;

      // Calculate REP using RepTracker
      let repEarned = 0;
      if (this.repTracker) {
        const repResult = this.repTracker.calculateFinalRep(roundCompletion.repMultiplier);
        repEarned = repResult.finalRep;
        console.log('[PvE] REP Breakdown:', repResult.breakdown);
      }

      // Tough spawn cleared: died here, ran it back unswapped, beat it.
      if (this.scene.retryAfterDeath) {
        repEarned = Math.round((repEarned + SESSION_RULES.TOUGH_SPAWN_BONUS) * 10) / 10;
        this.scene.retryAfterDeath = false;
        console.log('[PvE] Tough spawn cleared \u2192 +' + SESSION_RULES.TOUGH_SPAWN_BONUS, 'REP');
      }

      // Clean streak: consecutive completions without a death or swap.
      this.scene.pveCleanStreak = (this.scene.pveCleanStreak || 0) + 1;
      const sBonus = streakBonus(this.scene.pveCleanStreak);
      if (sBonus > 0) {
        repEarned = Math.round((repEarned + sBonus) * 10) / 10;
        console.log('[PvE] Clean streak', this.scene.pveCleanStreak, '\u2192 +' + sBonus, 'REP');
      }

      this.scene.pveSessionStash += stashEarned;
      this.scene.pveSessionRep = Math.round((this.scene.pveSessionRep || 0) + repEarned);
      this.scene.pveBestRound = Math.max(this.scene.pveBestRound, this.scene.pveRound);
      console.log('[PvE] Stats - Stash:', stashEarned, 'Rep:', repEarned, 'Total Stash:', this.scene.pveSessionStash, 'Total Rep:', this.scene.pveSessionRep);
      console.log('[PvE] Completion:', roundCompletion.completionCount, 'times, multiplier:', roundCompletion.repMultiplier);

      // Update user's total accumulated stash and REP
      if (this.scene.runKind !== 'journey') {
      const user = getCurrentUser();
      updateUserStats({
        totalStash: (user.stats?.totalStash || 0) + stashEarned,
        totalRep: Math.round((user.stats?.totalRep || 0) + repEarned)
      });

      // Track route progress for leaderboard
      updateRouteProgress(this.scene.role, this.scene.pveRound);

      }

      // What this house cost, for the contacts. Recorded next to the
      // checkpoint so a clear and its story are saved in the same breath.
      this.noteHouseForContacts();

      // Save session state (for continue feature) - save next round since that's what they'll play
      this.saveProgress({
        pveRound: this.scene.pveRound + 1,
        pveSessionStash: this.scene.pveSessionStash,
        pveSessionRep: this.scene.pveSessionRep,
              pveCleanStreak: this.scene.pveCleanStreak || 0,
              runId: this.scene.runId,
        pveBestRound: this.scene.pveBestRound
      }, true);

      // Submit score to daily leaderboard (don't await - let it happen in background for smooth animation)
      // Stash = current round for both modes (you just completed this round successfully)
      const stashToSubmit = this.scene.pveRound;

      if (this.scene.runKind !== 'journey') (async () => {
        try {
          // Submit SESSION rep (already cumulative across this run's rounds).
          // Previous logic added pveSessionRep to existingScore.rep, which
          // double-counted every round because pveSessionRep is itself the
          // running total, not the per-round delta. Server keeps the max.
          console.log(`[ProgressionManager] 🚀 SUBMITTING DAILY SCORE - Round ${this.scene.pveRound}, Stash: ${stashToSubmit}, Session Rep: ${this.scene.pveSessionRep}`);
          await submitScore(this.scene.role, this.scene.pveRound, stashToSubmit, this.scene.pveSessionRep, this.scene.runId);
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
      if (this.scene.runKind !== 'journey') logRunnerExtract(this.scene.pveRound, stashEarned > 0);

      // Show floating numbers at extraction point (will stay visible during fade and next round's power modal)
      this.scene.vfx?.showFloatingRewards?.(stashEarned, repEarned);
      // Continue with normal extraction sequence (fade, restart, power modal will show automatically)
    }

    this.scene.roundOver = true;
    ReplaySystem.finalize();
    // Runner-mode success. The plug-mode branch above already returned, so
    // reaching here means the player extracted. Close the forensics first so
    // the record carries the leg split for a WIN too — a clean run is the
    // baseline every failure gets compared against.
    this.scene.forensics?.extract(this.scene);
    this.scene.finalizeRun?.('extracted');
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
          } else if (this.scene.mode === 'pve' && isBlockComplete(this.scene.pveRound || 1)) {
            // The block is finished. The ladder used to run forever, which the
            // data says was a fiction — nothing cleared past round 23, so every
            // player's run ended by hitting a wall rather than by finishing.
            // A run that ENDS is one that can be scored, shared and beaten
            // tomorrow, which is the whole point of a daily.
            this.showBlockComplete();
          } else {
            // Restart with new seed (preserve mode for PvE)
            const newSeed = (Math.random() * 2 ** 32) | 0;
            const goNext = () => this.scene.scene.restart({
              mode: this.scene.mode,
              runKind: this.scene.runKind, blockIndex: this.scene.blockIndex,
              role: this.scene.role,
              seed: newSeed,
              pveRound: this.scene.mode === 'pve' ? (this.scene.pveRound || 1) + 1 : undefined,
              pveSessionStash: this.scene.pveSessionStash,
              pveSessionRep: this.scene.pveSessionRep,
              pveCleanStreak: this.scene.pveCleanStreak || 0,
              runId: this.scene.runId,
              pveBestRound: this.scene.pveBestRound
            });
            // The restarted PvE scene shows its entrance map before loadout.
            goNext();
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
    if (this.scene.runKind === 'rivals') return this.scene.rivals?.retryHouse();
    if (this.scene.roundOver) return;
    this.scene.roundOver = true;
    ReplaySystem.finalize();
    // Death or timeout. Which one is recoverable from the record: a run whose
    // durationMs lands at timerMs ran out the clock; anything shorter died.
    this.scene.finalizeRun?.(`round_end_${winner}`);

    // Every call site names the winner by SPRITE ('attacker' / 'defender'),
    // not by role ('runner' / 'plug'), so the old role-worded comparison below
    // was false on every death and the loss penalty never once applied. Accept
    // both vocabularies and settle the question in one place.
    const runnerWon = (winner === 'attacker' || winner === 'runner');

    // Losing the round costs real rep — retrying is not free, it's just
    // cheaper than swapping spawns. Applied before final score submission.
    const playerLost = (this.scene.role === 'runner' && !runnerWon)
                    || (this.scene.role === 'plug' && runnerWon);
    if (this.scene.mode === 'pve' && playerLost) {
      const before = this.scene.pveSessionRep || 0;
      this.scene.pveSessionRep = Math.max(0, Math.round(before - SESSION_RULES.DEATH_PENALTY));
      this.scene._lastDeathPenalty = before - this.scene.pveSessionRep;
      this.scene.pveCleanStreak = 0;
      // Persist the setback: same round, penalty applied, tough-spawn
      // bonus armed — survives a page close mid-grind.
      this.saveProgress({
        pveRound: this.scene.pveRound,
        pveSessionStash: this.scene.pveSessionStash,
        pveSessionRep: this.scene.pveSessionRep,
        pveCleanStreak: 0,
        runId: this.scene.runId,
        pveBestRound: this.scene.pveBestRound,
        retryAfterDeath: true
      });
    }

    // clear bullets & effects
    this.scene.bulletsA?.getChildren?.().forEach(b => b.destroy());
    this.scene.bulletsD?.getChildren?.().forEach(b => b.destroy());
    this.scene.destroyDecoySprite?.();

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
   * Before loadout: reveal the ready house without counting it as cleared.
   *
   * The scene is paused before recording, timers or controls start. Entering
   * resumes startMatch; exiting leaves the saved checkpoint untouched.
   */
  /**
   * The gang's face, on the way into a house.
   *
   * Sits before the entrance map and the loadout so it never covers live
   * movement, and it is the ONLY place check-ins are triggered — Rivals,
   * Tutorial, the bot harness and the legacy daily route all fall straight
   * through. A beat is claimed before it is shown, so a reload while the
   * panel is up costs the line rather than repeating it forever.
   */
  /**
   * Log how the house just cleared went: bullets that landed, powers spent,
   * whether a bunk bag was picked up and whether the spawn had to be swapped.
   * Only Run the Block; everything is read from what the round already
   * tracked, and a failure here can never block the clear.
   */
  noteHouseForContacts() {
    const scene = this.scene;
    if (scene.runKind !== 'journey' || scene.role !== 'runner') return;
    try {
      // The briefed house, settled at the moment it is cleared: the object
      // and the real bag both came out, or they did not. Recorded once, and
      // it grants nothing — it only chooses the debrief line.
      if (scene.missionObject) {
        noteMissionOutcome(scene.blockIndex || 1, scene.hasMissionItem ? 'win' : 'miss');
      }
      // Matchmaking evidence: how long this house actually took at the sticks,
      // how long every attempt on it took, and how many attempts there were.
      // Recorded next to the clear so a crash cannot save one without the
      // other, and never for Rivals, Tutorial or the daily route.
      try {
        const active = Math.round(scene._activePlayMs ?? 0);
        noteHouseObservation({
          block: scene.blockIndex || 1,
          house: scene.pveRound || 1,
          scale: campaignHouseScale(scene.pveRound || 1),
          activeMs: active,
          totalActiveMs: Math.round((this._contactFailedActiveMs || 0) + active),
          attempts: 1 + (this._contactDeathsThisHouse || 0),
          deaths: this._contactDeathsThisHouse || 0,
          hits: this.repTracker?.stats?.damagesTaken || 0,
          bunk: Boolean(this.repTracker?.stats?.gotBunkStash),
          at: Date.now()
        });
        this._contactFailedActiveMs = 0;
      } catch (error) {
        console.warn('[Skill] Could not record the house', error);
      }
      const selected = scene.runnerPowersSelected || [];
      const consumed = scene.runnerPowersConsumed || [];
      noteHouseClear(scene.blockIndex || 1, {
        house: scene.pveRound || 1,
        hits: this.repTracker?.stats?.damagesTaken,
        deaths: this._contactDeathsThisHouse || 0,
        bunk: this.repTracker?.stats?.gotBunkStash,
        swapped: Boolean(scene.swapSpawnCycle),
        powers: Array.isArray(scene.runnerPowersSelected) && Array.isArray(scene.runnerPowersConsumed)
          && selected.length === 2 && consumed.length === 2 && consumed.every(v => typeof v === 'boolean')
          ? selected.filter((p, i) => consumed[i]) : undefined
      });
      this._contactDeathsThisHouse = 0;
      // This method is called by a real-stash extraction, not by a modal.
      // Journey's ordered checkpoint proves the previous fourteen clears,
      // including legacy resumes whose optional per-house stats are missing.
      if (scene.pveRound === PVE_BLOCK_MAPS) {
        const gangID = scene.blockGangID ?? getWindowState().gangID;
        const before = crewStoryProgress(getContactProgress(), gangID);
        const result = finishCrewStory(gangID, scene.blockIndex || 1, PVE_BLOCK_MAPS);
        const chapter = result.applied ? before.chapter
          : Math.max(0, crewStoryProgress(result.state, gangID).chapter - 1);
        this._crewCompletedChapter = chapter;
      }
    } catch (error) {
      console.warn('[Contacts] Could not record the house', error);
    }
  }

  /** A death in Run the Block. Counted for the block and for the house retry. */
  noteDeathForContacts() {
    const scene = this.scene;
    if (scene.runKind !== 'journey' || scene.role !== 'runner') return;
    this._contactDeathsThisHouse = (this._contactDeathsThisHouse || 0) + 1;
    // A failed attempt still cost the player time on this house.
    this._contactFailedActiveMs = (this._contactFailedActiveMs || 0) + Math.round(scene._activePlayMs ?? 0);
    try { noteBlockDeath(scene.blockIndex || 1); } catch {}
  }

  showContactCheckIn(next) {
    const scene = this.scene;
    if (scene.runKind !== 'journey' || scene.role !== 'runner') { next(); return null; }
    let cue = null;
    try {
      const blockIndex = scene.blockIndex || 1;
      startBlockRunTracking(blockIndex, scene.pveRound || 1);
      const record = getContactProgress();
      const gangID = scene.blockGangID ?? getWindowState().gangID;
      const chapter = crewStoryProgress(record, gangID).chapter;
      const season = seasonChapter(gangID, chapter);
      const stats = getBlockRunStats(blockIndex);
      // Coverage must match this exact pre-house checkpoint, not a partial
      // legacy record that happens to contain a few untouched clears.
      const complete = stats.telemetryComplete && stats.houses === (scene.pveRound || 1) - 1;
      const measured = complete ? stats : { ...stats, telemetryComplete: false };
      if (season) {
        const authored = seasonCue(gangID, { chapter, house:scene.pveRound || 1, blockIndex,
          cityName:cityForBlock(blockIndex)?.name, earnedPraise:praiseEarned(measured),
          usedPraise:praiseUsedInBlock(record, blockIndex), telemetryComplete:complete });
        cue = authored ? { ...authored, contact:contact(authored.pages[0].speaker),
          contacts:[gangContacts(gangID).primary, gangContacts(gangID).secondary],
          speaker:authored.pages[0].speaker.toUpperCase(),
          pages:authored.pages.map(page => ({text:page.text, contact:contact(page.speaker)})) } : null;
      } else cue = contactCue({
        gangID,
        house: scene.pveRound || 1,
        blockIndex,
        // Only true things: the praise variants are chosen from what this
        // block actually measured, and one is never repeated in a block.
        stats: measured,
        usedPraise: praiseUsedInBlock(record, blockIndex),
        // No mission exists yet, so no outcome is ever claimed. The debrief
        // beat falls back to ordinary praise until the mission slice lands.
        missionOutcome: stats.mission
      });
      if (cue && !season) {
        const story = crewChapter(gangID, chapter);
        cue = { ...cue,
          pages: crewConsultationPages(gangID, chapter, cue.beat.id, cue.text),
          chapterLabel: 'CHAPTER ' + story.number + ' · ' + story.title.toUpperCase(),
          action: 'VIEW THE BLOCK  >>'
        };
      }
    } catch (error) {
      console.warn('[Contacts] Could not build a cue', error);
    }
    if (!cue) { next(); return null; }
    if (!claimContact(cue.eventID, scene.blockIndex || 1)) { next(); return null; }
    // Remember the compliment, not just the beat, so a reload cannot hand the
    // player the same sentence twice in one block.
    if (cue.praiseKey) claimContact(praiseMark(scene.blockIndex || 1, cue.praiseKey), scene.blockIndex || 1);
    try {
      return showContactPanel(scene, cue, next);
    } catch (error) {
      console.warn('[Contacts] Panel failed, entering the house anyway', error);
      next();
      return null;
    }
  }

  showBlockMap(goNext) {
    const consult = () => this.showContactCheckIn(() => this.showBlockEntranceMap(goNext));
    const scene = this.scene;
    const checkpoint = { blockIndex: scene.blockIndex || 1, pveRound: scene.pveRound || 1 };
    if (scene._showCityOnEntry && scene.mode === 'pve' && scene.runKind === 'journey'
      && scene.role === 'runner' && startCityIntro(checkpoint)) {
      scene._showCityOnEntry = false;
      return this.showCityIntro(consult, checkpoint);
    }
    scene._showCityOnEntry = false;
    return consult();
  }

  showCityIntro(next, checkpoint) {
    const scene = this.scene;
    scene.roundPausedForMenu = true;
    if (scene.input?.keyboard) scene.input.keyboard.enabled = false;
    scene.suspendTouchUI?.(true);
    scene._cityMapOpen = true;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      scene._cityMapOpen = false;
      // Never rebind touch between cinematic, contact and entrance.
      scene.suspendTouchUI?.(true);
      next?.();
    };
    try {
      return drawCityMap(scene, {
        view: cityView(getCityProgress(checkpoint), checkpoint), checkpoint, onDone: done
      });
    } catch (error) {
      console.warn('[City] Intro failed', error);
      done();
      return null;
    }
  }

  showBlockEntranceMap(goNext) {
    const maps = PVE_BLOCK_MAPS;
    const house = Math.min(maps, this.scene.pveRound || 1);
    const cleared = house - 1;
    const block = this.scene.worldBlock;
    const city = this.scene.runKind === 'journey' ? cityForBlock(this.scene.blockIndex) : null;
    const modal = this.scene.gameUI?.showModal?.({
      fullScreen: true,
      title: block ? block.name : 'DAILY BLOCK',
      subtitle: block
        ? city ? city.name + ' · Block ' + (block.number - city.firstBlock + 1) + ' / ' + CITY_BLOCKS
          : block.district + ' · Block #' + block.number
        : 'House ' + house + ' of ' + maps + ' · Follow the light.',
      lines: block && house === 1 ? [block.arrival] : [],
      buttons: [
        { label: house === maps ? 'ENTER HOUSE 15 · TWO PLUGS' : 'ENTER HOUSE ' + house, variant: 'primary', onClick: goNext },
        ...(cleared && !block ? [{
          label: 'Restart Daily Block', variant: 'secondary',
          onClick: () => {
            clearSessionState(this.scene.role);
            this.scene.scene.restart({ mode: 'pve', role: 'runner', runKind: 'daily', pveRound: 1 });
          }
        }] : []),
        { label: 'Back to Menu', variant: 'secondary', onClick: () => this.scene.scene.start('MENU') }
      ]
    });
    if (!modal) { goNext(); return null; }
    drawBlockMap(this.scene, modal, { cleared, maps, entering: true });
    this.scene.gameUI.currentModal = modal;
    return modal;
  }

  /**
   * The block is cleared — the run's ending.
   *
   * Deliberately a different screen from the death modal: this is the only
   * moment the game has ever had that says "you finished", and it is what a
   * daily leaderboard entry and a shared replay hang off.
   */
  showBlockComplete() {
    const scene = this.scene;
    // The two-contact curtain call comes before the revealed block/result.
    // It never advances the story: only the actual final extraction does.
    if (this.scene.runKind === 'journey' && this.scene.role === 'runner') {
      const gangID = scene.blockGangID ?? getWindowState().gangID;
      const pair = gangContacts(gangID);
      const chapter = this._crewCompletedChapter;
      const eventID = 'crew-finish/block-' + (this.scene.blockIndex || 1) + '/' + gangID;
      if (pair && Number.isSafeInteger(chapter) && claimContact(eventID, this.scene.blockIndex || 1)) {
        const authored = seasonChapter(gangID, chapter);
        const story = authored || crewChapter(gangID, chapter);
        const finishPages = authored
          ? seasonFinish(gangID, chapter, cityForBlock(scene.blockIndex)?.name)
              .map(page => ({text:page.text, contact:contact(page.speaker)}))
          : [{text:story.primaryFinish, contact:pair.primary}, {text:story.secondaryFinish, contact:pair.secondary}];
        const cue = {
          contact: pair.primary, contacts: [pair.primary, pair.secondary], celebration: true,
          speaker: finishPages[0].contact.name.toUpperCase(), text: finishPages[0].text,
          pages: finishPages,
          chapterLabel: 'CHAPTER ' + story.number + ' COMPLETE · ' + story.title.toUpperCase(),
          action: 'SEE THE BLOCK  >>'
        };
        try { return showContactPanel(this.scene, cue, () => this.showBlockCompleteResult()); }
        catch (error) { console.warn('[Contacts] Celebration failed', error); }
      }
    }
    return this.showBlockCompleteResult();
  }

  showBlockCompleteResult() {
    const maps = PVE_BLOCK_MAPS;
    const journey = this.scene.runKind === 'journey';
    const gangID = journey ? (this.scene.blockGangID ?? getWindowState().gangID) : null;
    const mark = crewSigil(gangID);
    this.scene.pveBestRound = Math.max(this.scene.pveBestRound ?? 0, maps);
    const menu = { label: 'MAIN MENU', variant: journey ? 'secondary' : 'primary',
      onClick: () => this.scene.scene.start('MENU') };
    const replay = ReplaySystem.hasReplay(this.scene.role) ? {
      label: 'WATCH REPLAY', variant: 'secondary', keepOpen: true,
      onClick: (m) => {
        m.setVisible(false);
        ReplaySystem.play(this.scene, { onDone: () => m.setVisible(true) });
      }
    } : null;
    const modal = this.scene.gameUI?.showModal?.({
      fullScreen: true, completion: true, accent: mark?.color,
      title: 'BLOCK CLEARED',
      subtitle: this.scene.worldBlock ? this.scene.worldBlock.departure : `All ${maps} runs, start to finish.`,
      lines: [],
      buttons: journey ? [
        { label: 'ENTER NEXT BLOCK', variant: 'primary', onClick: () => this.scene.scene.restart({
          mode: 'pve', role: 'runner', runKind: 'journey',
          blockIndex: this.scene.blockIndex + 1, pveRound: 1
        }) },
        ...(replay ? [{ pair: [replay, menu] }] : [menu])
      ] : [...(replay ? [replay] : []), menu]
    });
    if (this.scene.gameUI) this.scene.gameUI.currentModal = modal;
    else this.scene.currentModal = modal;
    if (modal) drawBlockComplete(this.scene, modal, {
      gangID, stash: this.scene.pveSessionStash, rep: this.scene.pveSessionRep, maps
    });
    return modal;
  }

  /**
   * Show PvE game over modal
   */
  async showPvEGameOver(context = {}) {
    if (this.scene.runKind === 'rivals') return this.scene.rivals?.retryHouse();
    this.noteDeathForContacts();
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
    if (this.scene.runKind !== 'journey') updateRouteProgress(this.scene.role, roundNumber);

    // Game over means you failed current round, so stash = last completed round
    // (current - 1). Example: Died on round 7 = completed round 6 = 6 stash.
    // The submission itself happens AFTER the modal is on screen — see below.
    const stashToSubmit = Math.max(0, roundNumber - 1);

    // Build buttons array
    const routeID = this.scene.currentRouteID ?? getCurrentRouteID();
    const continueSeed = getRouteSeed(routeID, roundNumber, this.scene.role);
    const restartSeed = getRouteSeed(routeID, 1, this.scene.role);
    const role = isPlug ? 'plug' : 'runner';

    // Check if spawn swap has been used
    const swapUsed = hasUsedSpawnSwap(role);

    // Single full-width Watch Replay at the top — sharing lives on the
    // replay's end screen, where the clip actually exists.
    const replayShareRow = ReplaySystem.hasReplay(this.scene.role) ? [{
      label: '\u25B6 Watch Replay',
      variant: 'secondary',
      keepOpen: true,
      onClick: (m) => {
        m.setVisible(false);
        ReplaySystem.play(this.scene, { onDone: () => m.setVisible(true) });
      }
    }] : [];

    const buttons = [
      ...replayShareRow,
      {
        label: `Retry Round ${roundNumber}`,
        variant: 'primary',
        onClick: () => this.scene.scene.restart({
          mode: 'pve',
          runKind: this.scene.runKind, blockIndex: this.scene.blockIndex,
          role,
          pveRound: roundNumber, // Same round
          pveSessionStash: this.scene.pveSessionStash,
          pveSessionRep: this.scene.pveSessionRep,
              pveCleanStreak: this.scene.pveCleanStreak || 0,
              runId: this.scene.runId,
          pveBestRound: this.scene.pveBestRound,
          retryAfterDeath: true, // same spawn, no swap — tough-spawn bonus armed
          seed: continueSeed
        })
      },
      {
        // TEMP: Removed daily limit for testing
        label: `Retry Round ${roundNumber} & Swap Spawns`,
        variant: 'secondary',
        disabled: false, // Always enabled for testing
        onClick: () => {
          // Swapping spawns buys information a death doesn't — priced
          // accordingly, and the label says so up front.
          this.scene.pveSessionRep = Math.max(0, Math.round((this.scene.pveSessionRep || 0) - SESSION_RULES.SWAP_PENALTY));
          this.scene.pveCleanStreak = 0;
          // Swapping forfeits the tough-spawn bonus — different spawn,
          // different challenge. Persist the purchase.
          this.saveProgress({
            pveRound: this.scene.pveRound,
            pveSessionStash: this.scene.pveSessionStash,
            pveSessionRep: this.scene.pveSessionRep,
            pveCleanStreak: 0,
            runId: this.scene.runId,
            pveBestRound: this.scene.pveBestRound,
            retryAfterDeath: false,
            swapSpawnCycle: (this.scene.swapSpawnCycle || 0) + 1
          });
          // markSpawnSwapUsed(role); // TEMP: Don't mark as used
          this.scene.scene.restart({
            mode: 'pve',
          runKind: this.scene.runKind, blockIndex: this.scene.blockIndex,
            role,
            pveRound: roundNumber, // Same round
            pveSessionStash: this.scene.pveSessionStash,
            pveSessionRep: this.scene.pveSessionRep,
              pveCleanStreak: this.scene.pveCleanStreak || 0,
              runId: this.scene.runId,
            pveBestRound: this.scene.pveBestRound,
            seed: continueSeed,
            // Advance the spawn cycle each press: original -> opponent's
            // spot -> 2nd opponent's spot (round 8+) -> original again
            swapSpawnCycle: (this.scene.swapSpawnCycle || 0) + 1
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
        ...(this.scene._lastDeathPenalty ? [`Loss penalty: \u2212${this.scene._lastDeathPenalty} REP`] : []),
        `Best Round: ${this.scene.pveBestRound}`
      ],
      buttons
    });

    if (this.scene.gameUI) {
      this.scene.gameUI.currentModal = modal;
    } else {
      this.scene.currentModal = modal;
    }

    if (this.scene.runKind === 'journey') return modal;

    // Scores go out only once the death screen exists. This used to be awaited
    // above, before a single button was built: with no backend reachable the
    // two calls hang or reject, and endRound() invokes this with no .catch(),
    // so the rejection killed the function and the modal never rendered at
    // all — the player was left staring at a frozen board with no way out.
    // Reaching the network is not a precondition for showing a UI.
    console.log(`[ProgressionManager] 🚀 GAME OVER - Submitting final scores - Round ${roundNumber}, Stash: ${stashToSubmit}, Rep: ${this.scene.pveSessionRep}`);
    try {
      await Promise.all([
        submitScore(this.scene.role, roundNumber, stashToSubmit, this.scene.pveSessionRep, this.scene.runId),
        submitAllTimeScore(this.scene.role, roundNumber, stashToSubmit, this.scene.pveSessionRep)
      ]);
      console.log('[ProgressionManager] ✅ Final scores submitted to Supabase!');
    } catch (err) {
      // A lost score is worth a warning, not a broken death screen.
      console.warn('[ProgressionManager] score submission failed:', err);
    }

    return modal;
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