// installBotDriver — attaches BotDriver to the game without touching it.
//
// Split from BotDriver.js so the bot's decision logic stays importable under
// plain Node (no Phaser, no DOM) for testing. This file is the only part that
// needs the scene class, and it does nothing at all unless the bot is on.

import { BaseGameScene } from '../scenes/BaseGameScene.js';
import BotDriver, { DEFAULTS, botConfig } from './BotDriver.js';

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
  const origUpdate = BaseGameScene.prototype.update;

  BaseGameScene.prototype.update = function (time, delta) {
    origUpdate.call(this, time, delta);
    try {
      // Built lazily: no scene exists at install time, and each round's
      // scene.restart() must get a bot with fresh timers.
      if (!this._bot || this._bot.scene !== this) {
        this._bot = new BotDriver(this, cfg);
      }
      this._bot.update();
    } catch (e) {
      console.error('[BOT] update error:', e);
    }
  };

  console.log('[BOT] installed', JSON.stringify({ ...DEFAULTS, ...cfg }));
  return true;
}

export default installBotDriver;
