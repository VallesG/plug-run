// installBotDriver — attaches BotDriver to the game without touching it.
//
// Split from BotDriver.js so the bot's decision logic stays importable under
// plain Node (no Phaser, no DOM) for testing. This file is the only part that
// needs the scene class, and it does nothing at all unless the bot is on.

import { BaseGameScene } from '../scenes/BaseGameScene.js';
import GameUI from './GameUI.js';
import AIController from './AIController.js';
import ProgressionManager from './ProgressionManager.js';
import { getCurrentRouteID, getRouteSeed, createSeededRNG } from '../utils/seededRandom.js';
import { applyRunnerProgression, updateRunnerBehavior, considerRunnerPowerUse } from './RunnerAI.js';
import BotDriver, { DEFAULTS, botConfig } from './BotDriver.js';
import { mapStats } from '../logic/runStats.js';
import { advanceCursor, advanceSweep } from '../logic/seedCursor.js';
import { MenuScene } from '../scenes/MenuScene.js';
import RivalsRace from './RivalsRace.js';
import { exportRaceCapture } from './RivalReplayCapture.js';
import { rivalPoolEntry, validRivalPowers } from '../logic/rivals.js';
import { RIVAL_BOT_DRIVER_VERSION, rivalPreset, rivalBotDisplayName, rivalBankLoadout, rivalRecordingID, rivalDriverKnobs } from '../logic/rivalPresets.js';

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

    // Skip keepOpen buttons. Those don't advance anything — "▶ Watch Replay"
    // is one, and clicking it would park the bot in the replay viewer
    // indefinitely instead of starting the next round.
    const actionable = live.filter((b) => !b.keepOpen);
    if (!actionable.length) return modal;
    const target = actionable[0];

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

  installGameOverBypass(cfg);
}

// Consecutive losses on the current MAP, so the bot knows when retrying the
// same spawn has stopped being worth it.
//
// Keyed on the seed, not the round. It used to key on the round, which is the
// same thing on a ladder — one map per round — and quietly wrong under
// lockRound, where the round is held still and the map changes underneath it.
// The counter never reset, so the swap fired on every second death no matter
// which map that death was on, and a fresh map could inherit a swapped spawn
// it had never earned. Both clears in the first properly-locked batch landed
// on a swapped spawn, which is not a fact about those maps so much as about
// this counter.
let failsOnMap = { seed: null, count: 0 };

/**
 * Replace the death screen with a direct restart.
 *
 * WHY BYPASS RATHER THAN CLICK
 * showPvEGameOver awaits submitScore/submitAllTimeScore BEFORE it builds any
 * buttons. Those calls go to a backend that isn't reachable here, so they
 * hang or reject — and endRound calls showPvEGameOver() with no .catch(), so
 * a rejection is an unhandled promise and execution never reaches the modal.
 * Nothing is ever rendered, so there is nothing to click and the session
 * stops dead on the first death. It only bites on death because the
 * extraction path restarts without awaiting any submission.
 *
 * The telemetry is safe either way: finalizeRun() runs inside endRound,
 * before any of this.
 *
 * SPAWN SWAPPING
 * Some seeds drop the runner inside the plug's opening line of fire, and no
 * skill level beats that — retrying the identical spawn just burns rounds. A
 * human reaches for "Retry & Swap Spawns" after a couple of those, so after
 * cfg.swapAfterFails losses on one round the bot advances swapSpawnCycle,
 * which is the same thing that button does.
 */
function installGameOverBypass(cfg) {
  const swapAfter = cfg.swapAfterFails ?? DEFAULTS.swapAfterFails;

  ProgressionManager.prototype.showPvEGameOver = function () {
    const s = this.scene;
    // Rivals owns its own retry rules (race clock keeps running, same house
    // again after 650ms). The daily restart below would drop the race.
    if (s.runKind === 'rivals') return s.rivals?.retryHouse();
    const round = s.pveRound || 1;
    const role = s.role === 'plug' ? 'plug' : 'runner';

    const mapKey = s.seed ?? null;
    if (failsOnMap.seed !== mapKey) failsOnMap = { seed: mapKey, count: 0 };
    failsOnMap.count++;

    const shouldSwap = failsOnMap.count >= swapAfter;
    if (shouldSwap) failsOnMap.count = 0; // give the new spawn a fair run

    const routeID = s.currentRouteID ?? getCurrentRouteID();
    const seed = getRouteSeed(routeID, round, role);

    const params = {
      mode: 'pve',
      role,
      pveRound: round,
      pveSessionStash: s.pveSessionStash,
      pveSessionRep: s.pveSessionRep,
      pveCleanStreak: s.pveCleanStreak || 0,
      runId: s.runId,
      pveBestRound: s.pveBestRound,
      seed
    };
    if (shouldSwap) params.swapSpawnCycle = (s.swapSpawnCycle || 0) + 1;

    console.log(
      `[BOT] died on round ${round} (loss ${failsOnMap.count || swapAfter}/${swapAfter} on this map)` +
      (shouldSwap ? ' — retrying with SWAPPED SPAWNS' : ' — retrying same spawn')
    );

    // Deferred so the restart doesn't happen inside endRound's own stack.
    const delay = Math.max(0, cfg.modalDelayMs ?? DEFAULTS.modalDelayMs);
    s.time?.delayedCall?.(delay, () => {
      try {
        s.scene.restart(params);
      } catch (e) {
        console.error('[BOT] restart after death failed:', e);
      }
    });

    return null;
  };
}

/* ---------------- round locking ---------------- */

// The knobs this session is actually running with. Recorded into every export
// because a batch that doesn't say what produced it cannot be compared with
// another one — aiLevel and lockRound change what the numbers mean, and
// reconstructing them afterwards from a filename is guesswork.
let activeConfig = null;

// Which map we are on and how many attempts it has had. Module-level because
// every attempt is a scene.restart() — nothing on the scene survives one.
let seedCursor = { routeID: null, attempts: 0, repeats: 1, mapsDone: 0, round: 0 };

/**
 * Hold the round number still and walk the MAP forward instead.
 *
 * WHY THE SEED HAS TO MOVE
 * PvE map generation is `getRouteSeed(todaysRouteID, pveRound, role)`, and the
 * scene recomputes it on every init — the `seed` that showPvEGameOver passes
 * into restart() is ignored outright in this mode. So pinning the round
 * without touching anything else would hand out the same map forever, which
 * is the opposite of the point.
 *
 * routeID is normally today's date. Advancing it by one is the game's own
 * seed derivation asked for "this same round, on a different day" — a fresh
 * map drawn from exactly the distribution real players see at this round
 * number, rather than an arbitrary number pushed into the generator.
 *
 * WHAT STAYS FIXED
 * Difficulty. Every scaling curve — runner speed, plan interval, wander
 * chance, power skill, the round-8 second plug — reads scene.pveRound, and
 * that is what gets held. The only thing varying is layout.
 *
 * WHY IT HOOKS create() AND NOT init()
 * It hooked init() first, and the round-pinning half silently did nothing.
 * RunnerScene.init and PlugScene.init both call super.init(data) and then
 * immediately reassign `this.pveRound = data?.pveRound ?? ...`, so a wrap on
 * BaseGameScene.prototype.init is overwritten by the subclass a line later.
 * The seed half survived (the subclasses don't touch it), which made the logs
 * look right while the round climbed anyway — a locked run that wasn't.
 * create() runs after every init in the chain, and before the seed is consumed
 * by maze generation. Both subclasses' create() bodies are a bare
 * super.create(), so nothing can get in ahead of it.
 *
 * WHAT GOES QUIET
 * Spawn swapping after repeat losses is meaningless when each attempt is a
 * different map, so at seedRepeats 1 the bypass below never reaches for it.
 * Route progress and the leaderboard read the real routeID from the clock
 * themselves, so the synthetic one stays confined to seed derivation and the
 * telemetry row — where it is the map's identity, and wanted.
 */
function installRoundLock(cfg) {
  const repeats = Math.max(1, Math.round(cfg.seedRepeats ?? DEFAULTS.seedRepeats ?? 1));

  // Sweep mode drives the round itself; lockRound is the single-round case.
  const from = Math.round(cfg.sweepFrom ?? DEFAULTS.sweepFrom ?? 0);
  const to = Math.round(cfg.sweepTo ?? DEFAULTS.sweepTo ?? 0);
  const sweep = (from >= 1)
    ? {
        from,
        to: Math.max(from, to || from),
        mapsPerRound: Math.max(1, Math.round(cfg.mapsPerRound ?? DEFAULTS.mapsPerRound ?? 5)),
        repeats
      }
    : null;

  const lockRound = sweep ? sweep.from : Math.round(cfg.lockRound ?? DEFAULTS.lockRound ?? 0);
  if (!(lockRound >= 1)) return;

  seedCursor = { routeID: getCurrentRouteID(), attempts: 0, repeats, mapsDone: 0, round: lockRound };

  const origCreate = BaseGameScene.prototype.create;
  BaseGameScene.prototype.create = function () {
    if (this.mode === 'pve') {
      // A clear restarts at pveRound + 1 (a death restarts at the same round),
      // so the round the scene arrives holding tells us how the last attempt
      // went without needing a second hook into the outcome. Read off the
      // scene rather than restart data because by now every init in the chain
      // has had its say and this is the value that would have been played.
      const advanced = sweep
        ? advanceSweep(seedCursor, this.pveRound, sweep)
        : advanceCursor(seedCursor, this.pveRound, lockRound, repeats);
      seedCursor = { ...seedCursor, ...advanced };

      const round = sweep ? seedCursor.round : lockRound;

      this.pveRound = round;
      this.currentRouteID = seedCursor.routeID;
      this.seed = getRouteSeed(seedCursor.routeID, round, this.role);
      // Mirrors the scene's own derivation — a different sequence from the one
      // the maze generator draws on, from the same seed.
      this.gameplayRNG = createSeededRNG(this.seed ^ 0xABCDEF01);

      console.log(
        (sweep
          ? `[BOT] sweep round ${round}/${sweep.to} (map ${(seedCursor.mapsDone || 0) + 1}/${sweep.mapsPerRound})`
          : `[BOT] round locked at ${round}`) +
        ` — map ${seedCursor.routeID} (attempt ${seedCursor.attempts}/${repeats}), seed ${this.seed}`
      );
    }

    return origCreate.call(this);
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
  const rec = rivalsRecordConfig();
  // Recording mode drives the bot at a named preset; ?bot=1 knobs still win
  // when both are given so a preset can be probed without editing it.
  const cfg = rec ? { ...rec.preset.knobs, modalDelayMs: 300, openingDecoy: Boolean(rec.openingDecoy), ...(botConfig() || {}) } : botConfig();
  if (!cfg) return false;

  BaseGameScene.prototype.__botInstalled = true;
  activeConfig = { ...DEFAULTS, ...cfg };
  installModalAutoDismiss(cfg);
  installRoundLock(cfg);
  if (rec) installRivalsRecorder(rec, cfg);
  const origUpdate = BaseGameScene.prototype.update;

  BaseGameScene.prototype.update = function (time, delta) {
    origUpdate.call(this, time, delta);
    try {
      // Built lazily: no scene exists at install time, and each round's
      // scene.restart() must get a bot with fresh timers.
      if (!this._bot || this._bot.scene !== this) {
        this._bot = new BotDriver(this, cfg, AI_HOOKS);
      }
      window.__plugRunLiveScene = this; // harness-only handle for inspection
      this._bot.update(delta);
    } catch (e) {
      console.error('[BOT] update error:', e);
    }
  };

  installSummaryHelper();

  console.log('[BOT] installed', JSON.stringify({ ...DEFAULTS, ...cfg }));
  console.log('[BOT] console helpers: __plugRunSummary() | __plugRunDownload() | __plugRunReset()');
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
      completionRate: ((done.length / rows.length) * 100).toFixed(1) + '%',
      grid: rows[0] ? `${rows[0].cols}x${rows[0].rows}` : null,
      avgTraceBytes: Math.round(rows.reduce((s, r) => s + (r.traceBytes || 0), 0) / rows.length),
      byOutcome: out
    };

    const perMap = mapStats(rows);
    if (perMap) summary.perMap = perMap;

    console.table(out);
    console.log('[BOT]', JSON.stringify(summary, null, 2));
    return summary;
  };

  /**
   * window.__plugRunDownload() — save everything collected so far as a file.
   *
   * Copy-pasting rows out of the console stops being practical somewhere
   * around fifty runs, and the input traces are the interesting part for
   * replay work but far too noisy to read inline.
   *
   * Includes the traces by default; pass false to get summary + rows only,
   * which is a fraction of the size.
   */
  window.__plugRunDownload = function (includeTraces = true) {
    const rows = window.__plugRunTelemetry || [];
    if (!rows.length) { console.log('[BOT] nothing to download yet'); return; }

    const payload = {
      exportedAt: new Date().toISOString(),
      // What produced these numbers. aiLevel sets the bot's own skill and
      // lockRound the opposition's; without both on the file, two batches
      // cannot be told apart, let alone compared.
      config: activeConfig,
      summary: window.__plugRunSummary?.(),
      rows,
      traces: includeTraces ? (window.__plugRunTraces || []) : undefined
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plugrun-telemetry-${rows.length}runs-${Date.now()}.json`;
    a.click();
    // Revoke on a delay — Chrome cancels the download if the URL dies first.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);

    console.log(`[BOT] downloading ${rows.length} runs (${(blob.size / 1024).toFixed(1)} KB)`);
  };

  /**
   * window.__plugRunReset() — clear collected data without reloading.
   * A reload would restart the bot's whole climb from round 1; this lets you
   * change a setting and start a clean batch from wherever you are.
   */
  window.__plugRunReset = function () {
    window.__plugRunTelemetry = [];
    window.__plugRunTraces = [];
    // Start the next batch on a map boundary. The map in flight has already
    // spent attempts that the cleared telemetry no longer records, so
    // carrying it over would report a map that took four tries as one that
    // took one. Exhausting its budget sends the next round to a fresh map.
    seedCursor.attempts = seedCursor.repeats;
    console.log('[BOT] telemetry cleared');
  };
}

/* ---------------- Block Rivals recording mode ---------------- */

/**
 * ?rivalsRecord=1&courseSlot=1&skillPreset=street&powers=phase,dash&runs=3
 *
 * A dedicated capture mode rather than pointing the sweep harness at Rivals:
 * the race needs one fixed course, one fixed ordered loadout, the real race
 * clock and retry rules, and an export that refuses anything short of seven
 * clears. None of that is what the daily sweep does.
 *
 * Returns null unless the flag is set, which is the only path players take.
 */
export function rivalsRecordConfig() {
  try {
    if (typeof window === 'undefined') return null;
    const p = new URLSearchParams(window.location.search);
    // rivalsPlay=1 races the bot against the shipped opponent bank like a
    // player would (opponent lookup, independent harness loadout, WATCH
    // button) and exports nothing. Used to check the player-facing path.
    const mode = p.get('rivalsRecord') === '1' ? 'record' : p.get('rivalsPlay') === '1' ? 'play' : null;
    if (!mode) return null;
    const slot = Math.max(1, Math.round(Number(p.get('courseSlot') || 1)));
    const preset = rivalPreset(p.get('skillPreset') || 'street');
    if (!rivalPoolEntry(slot) || !preset) { console.error('[RIVALS-REC] bad courseSlot or skillPreset'); return null; }
    const powersParam = (p.get('powers') || '').split(',').map(x => x.trim()).filter(Boolean);
    const powers = validRivalPowers(powersParam) ? powersParam : rivalBankLoadout(slot, preset.key);
    return {
      mode,
      // A style supplies its own knob set; a legacy preset supplies the four
      // it always had. Either way the driver is described by what it ran with.
      slot, preset: { key: preset.key, knobs: rivalDriverKnobs(preset.key) },
      powers,
      runs: Math.max(1, Math.round(Number(p.get('runs') || 3))),
      // A race that will not finish is not a race. 12 minutes is ~4x a slow clear.
      hardLimitMs: Math.max(60_000, Math.round(Number(p.get('hardLimitMs') || 12 * 60_000))),
      indexBase: Math.max(1, Math.round(Number(p.get('opponentIndex') || 1))),
      // Opt-in driver behaviour, recorded in driverConfig so a bank entry
      // always says whether it was driven with an opening Decoy.
      openingDecoy: p.get('openingDecoy') === '1'
    };
  } catch { return null; }
}

function installRivalsRecorder(rec, cfg) {
  const entry = rivalPoolEntry(rec.slot);
  const store = (window.__plugRunRivals = { config: { ...rec, driver: { ...DEFAULTS, ...cfg } }, course: entry, races: [], done: false });

  // Straight into the race: no menu tap, no picker (fixed loadout), and the
  // placeholder opponent cannot finish before the hard limit.
  const origCreate = MenuScene.prototype.create;
  MenuScene.prototype.create = function () {
    origCreate.call(this);
    if (store.done) return;
    console.log('[RIVALS-REC] launching', entry.name, 'preset', rec.preset.key, 'powers', rec.powers.join(','), 'run', store.races.length + 1, '/', rec.runs);
    // Play mode still passes a loadout: if no recorded opponent is eligible
    // the race falls back to the picker, which the auto-clicker cannot drive.
    // A found opponent keeps its own recorded loadout; the bot uses rec.powers.
    this.scene.start('RUNNER', rec.mode === 'play'
      ? { mode: 'pve', role: 'runner', runKind: 'rivals', rivalSlot: rec.slot, rivalPowers: rec.powers }
      : { mode: 'pve', role: 'runner', runKind: 'rivals', rivalSlot: rec.slot, rivalPowers: rec.powers, rivalHardLimitMs: rec.hardLimitMs, rivalRecording: true });
  };

  // The Rivals entrance now opens the real loadout picker even for a fixed
  // harness mix, and the modal auto-clicker cannot drive that picker's Start
  // button — recordings stalled at status 'ready' forever. Take the same
  // actions the picker's Start handler takes, then arm the countdown. Harness
  // only: production never reaches this path, and the player-facing picker is
  // untouched.
  const origOpenLoadout = RivalsRace.prototype.openLoadout;
  RivalsRace.prototype.openLoadout = function () {
    if (rec.mode !== 'record' || !this.race?.recording || !this.race?.fixedPowers) {
      return origOpenLoadout.call(this);
    }
    if (this.race.status !== 'ready') return;
    this.preparePickupProgress?.();
    this.scene.runnerPowersSelected = this.race.fixedPowers.slice();
    this.scene.runnerPowersConsumed = [false, false];
    this.race.powers = this.race.fixedPowers.slice();
    this.armCountdown();
  };

  // Export after every finish. The auto-clicker then presses REMATCH (the
  // first actionable button; WATCH buttons are keepOpen and skipped), which
  // carries the recording options through harnessRestartData().
  const origFinish = RivalsRace.prototype.finish;
  RivalsRace.prototype.finish = function (result, now) {
    const already = this.race.status === 'finished';
    // Decide "done" before the result modal is built inside origFinish, or
    // the auto-clicker presses REMATCH on the final race and records one more.
    if (!already && store.races.length + 1 >= rec.runs) store.done = true;
    origFinish.call(this, result, now);
    if (already) return;
    if (!this.race.recording) {
      // play mode: keep the outcome, never export
      store.races.push({ ok: false, reason: 'play mode', result: this.race.result, houses: this.race.clearTimes.length,
        retries: this.race.retries, elapsedMs: this.race.finishedMs, opponent: this.race.opponent ?? null, opponentKind: this.race.opponentKind });
      console.log('[RIVALS-REC] play race ' + store.races.length + '/' + rec.runs + ': ' + this.race.result + ' vs ' + (this.race.opponent?.displayName || this.race.opponentKind));
      return;
    }
    const index = rec.indexBase + store.races.length;
    const out = exportRaceCapture(this.race, {
      opponent: {
        id: 'bot-' + rec.preset.key + '-' + entry.slug + '-' + index, displayName: rivalBotDisplayName(rec.preset.key),
        kind: 'bot', driverVersion: RIVAL_BOT_DRIVER_VERSION, skillPreset: rec.preset.key
      },
      recordingID: rivalRecordingID(entry.slug, rec.preset.key, index, this.race.clearTimes),
      recordedAt: new Date().toISOString(),
      driverConfig: { aiLevel: cfg.aiLevel, coverPenalty: cfg.coverPenalty, phaseEscapeCells: cfg.phaseEscapeCells, dangerCells: cfg.dangerCells, openingDecoy: Boolean(cfg.openingDecoy) }
    });
    const traces = (window.__plugRunTraces || []).slice(store._traceMark || 0);
    store._traceMark = (window.__plugRunTraces || []).length;
    store.races.push({
      ok: out.ok, reason: out.ok ? null : out.reason, result: this.race.result,
      houses: this.race.clearTimes.length, retries: this.race.retries, elapsedMs: this.race.finishedMs,
      record: out.record ?? null, bundle: out.bundle ?? null, traces
    });
    console.log('[RIVALS-REC] race ' + store.races.length + '/' + rec.runs + (out.ok ? ' OK ' + Math.round(this.race.finishedMs / 1000) + 's, ' + this.race.retries + ' retries'
      : ' REJECTED: ' + out.reason + ' (' + this.race.result + ', ' + this.race.clearTimes.length + '/7)'));
    if (store.done) {
      console.log('[RIVALS-REC] done. window.__plugRunRivals holds ' + store.races.filter(r => r.ok).length + ' valid races; __plugRunRivalsDownload() saves them.');
    }
  };

  // Stop the auto-clicker from starting a race past the requested count.
  const origShowModal = GameUI.prototype.showModal;
  GameUI.prototype.showModal = function (opts) {
    if (store.done && this.scene.runKind === 'rivals') {
      // Every advancing button, MAIN MENU included: the auto-clicker takes the
      // first enabled one, and leaving for the menu would drop the result the
      // harness is about to inspect. keepOpen buttons (WATCH) stay live.
      const buttons = (opts?.buttons || []).map(b => b.keepOpen ? b : { ...b, disabled: true });
      return origShowModal.call(this, { ...opts, buttons });
    }
    return origShowModal.call(this, opts);
  };

  window.__plugRunRivalsDownload = function () {
    const blob = new Blob([JSON.stringify(store, null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'plugrun-rivals-' + entry.slug + '-' + rec.preset.key + '-' + Date.now() + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };
  console.log('[RIVALS-REC] installed for', entry.name, JSON.stringify({ preset: rec.preset.key, powers: rec.powers, runs: rec.runs, hardLimitMs: rec.hardLimitMs }));
}

export default installBotDriver;
