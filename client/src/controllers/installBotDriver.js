// installBotDriver — attaches BotDriver to the game without touching it.
//
// Split from BotDriver.js so the bot's decision logic stays importable under
// plain Node (no Phaser, no DOM) for testing. This file is the only part that
// needs the scene class, and it does nothing at all unless the bot is on.

import { BaseGameScene } from '../scenes/BaseGameScene.js';
import GameUI from './GameUI.js';
import AIController from './AIController.js';
import { applyRunnerProgression, updateRunnerBehavior, considerRunnerPowerUse } from './RunnerAI.js';
import BotDriver, { DEFAULTS, botConfig } from './BotDriver.js';

// Injected rather than imported by BotDriver so that file stays clear of the
// Phaser dependency graph and its logic remains runnable under plain Node.
const AI_HOOKS = {
  applyRunnerProgression,
  updateRunnerBehavior,
  considerRunnerPowerUse,
  makeController: (scene) => new AIController(scene)
};

/* ---------------- modal auto-dismissal ---------------- */

// Three modals gate a round and each one waits on a human click: weapon
// select (plug), power select (runner), and the game-over screen after a
// death. The bot returns early while roundPausedForMenu is true, so without
// these it plays exactly one round and then sits there.
//
// These REPLACE the prompt functions rather than driving their buttons. The
// buttons are Phaser rectangles inside closures with no handles reachable
// from out here, and synthesising pointer events against them would be far
// more fragile than doing directly what the START ROUND handler does. The
// bodies below mirror those handlers line for line — if GameUI's start logic
// changes, these need the same change.

const ALL_POWERS = ['phase', 'dash', 'decoy'];

function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

function installModalAutoDismiss(cfg) {
  // Runner: choose two powers, then start.
  GameUI.prototype.promptRunnerPowerSelection = function (onDone) {
    if (this.scene.role !== 'runner') { onDone?.(); return; }

    // Two distinct powers at random. The game permits doubling up on one,
    // but variety exercises more of the power code per session.
    const shuffled = [...ALL_POWERS].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, 2);

    this.scene.runnerPowersSelected = chosen;
    this.scene.runnerPowersConsumed = [false, false];
    this.scene.input.keyboard.enabled = true;
    this.scene.roundPausedForMenu = false;
    console.log('[BOT] auto-picked powers:', chosen.join(', '));
    onDone?.();
  };

  // Plug: choose a weapon, then start.
  GameUI.prototype.promptPlugWeaponSelection = function (onDone) {
    if (this.scene.role !== 'plug') { onDone?.(); return; }

    const options = this.scene.availableGuns || ['pistol'];
    const weapon = pick(options);
    this.scene.selectLoadout(weapon);
    this.scene.input.keyboard.enabled = true;
    this.scene.roundPausedForMenu = false;
    console.log('[BOT] auto-picked weapon:', weapon);
    onDone?.();
  };

  // Game over / any button modal: click one for it.
  //
  // Unlike the two above, this one lets the real modal build — it carries the
  // score readout, and its buttons own restart logic worth reusing rather
  // than reimplementing. We just press one.
  const origShowModal = GameUI.prototype.showModal;
  GameUI.prototype.showModal = function (opts) {
    const modal = origShowModal.call(this, opts);

    const buttons = opts?.buttons || [];
    const live = buttons.filter((b) => !b.disabled && typeof b.onClick === 'function');
    if (!live.length) return modal; // selection modals pass buttons: [] — nothing to press

    // First live button. In showPvEGameOver that's "Continue from Round N",
    // which retries the same seed until it's beaten and then advances — the
    // shape real play takes, and it yields both repeat samples of one map and
    // progression across maps.
    const target = live[0];

    // Deferred, not immediate: these handlers call scene.restart(), and
    // tearing the scene down inside its own modal construction is asking for
    // trouble. The delay also leaves the result on screen long enough to
    // watch, which matters when you're checking whether the bot is sane.
    const delay = Math.max(0, cfg.modalDelayMs ?? DEFAULTS.modalDelayMs);
    this.scene.time?.delayedCall?.(delay, () => {
      try {
        console.log('[BOT] auto-clicking modal button:', target.label);
        modal?.destroy?.();
        target.onClick();
      } catch (e) {
        console.error('[BOT] modal auto-click failed:', e);
      }
    });

    return modal;
  };
}

/**
 * Wrap BaseGameScene.prototype.update so the bot ticks after the scene's own
 * update. Guarded so hot-reload can't stack wrappers on top of each other.
 *
 * Prototype patching is a blunt instrument, chosen deliberately: this is test
 * scaffolding, and the alternative is threading bot hooks through a
 * 3200-line scene that real players depend on. External means it cannot
 * regress the game when switched off — it isn't there at all.
 *
 * Returns true if the bot was actually installed.
 */
export function installBotDriver() {
  if (BaseGameScene.prototype.__botInstalled) return false;
  const cfg = botConfig();
  if (!cfg) return false;

  BaseGameScene.prototype.__botInstalled = true;
  installModalAutoDismiss(cfg);
  const origUpdate = BaseGameScene.prototype.update;

  BaseGameScene.prototype.update = function (time, delta) {
    origUpdate.call(this, time, delta);
    try {
      // Built lazily: no scene exists at install time, and each round's
      // scene.restart() must get a bot with fresh timers.
      if (!this._bot || this._bot.scene !== this) {
        this._bot = new BotDriver(this, cfg, AI_HOOKS);
      }
      this._bot.update(delta);
    } catch (e) {
      console.error('[BOT] update error:', e);
    }
  };

  installSummaryHelper();

  console.log('[BOT] installed', JSON.stringify({ ...DEFAULTS, ...cfg }));
  console.log('[BOT] call __plugRunSummary() in the console for completion stats');
  return true;
}

/**
 * window.__plugRunSummary() — the numbers this harness exists to produce,
 * without anyone having to read raw JSON.
 *
 * Reports per-outcome counts and the duration spread. Median matters more
 * than mean here: a couple of runs where the bot wedged in a corner drag the
 * mean badly, and it's the typical round we're sizing maps against.
 */
function installSummaryHelper() {
  if (typeof window === 'undefined') return;

  window.__plugRunSummary = function () {
    const rows = window.__plugRunTelemetry || [];
    if (!rows.length) { console.log('[BOT] no runs recorded yet'); return null; }

    const byOutcome = {};
    for (const r of rows) (byOutcome[r.outcome] ||= []).push(r);

    const stats = (list) => {
      const ds = list.map((r) => r.durationMs).sort((a, b) => a - b);
      const mid = Math.floor(ds.length / 2);
      return {
        n: ds.length,
        medianS: +((ds.length % 2 ? ds[mid] : (ds[mid - 1] + ds[mid]) / 2) / 1000).toFixed(1),
        minS: +(ds[0] / 1000).toFixed(1),
        maxS: +(ds[ds.length - 1] / 1000).toFixed(1)
      };
    };

    const out = {};
    for (const [k, v] of Object.entries(byOutcome)) out[k] = stats(v);

    const done = rows.filter((r) => r.outcome === 'extracted');
    const summary = {
      totalRuns: rows.length,
      completionRate: +((done.length / rows.length) * 100).toFixed(1) + '%',
      grid: rows[0] ? `${rows[0].cols}x${rows[0].rows}` : null,
      avgTraceBytes: Math.round(rows.reduce((s, r) => s + (r.traceBytes || 0), 0) / rows.length),
      byOutcome: out
    };

    console.table(out);
    console.log('[BOT]', JSON.stringify(summary, null, 2));
    return summary;
  };
}

export default installBotDriver;
