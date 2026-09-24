// Where the game is running: the plain web or Telegram (and later the iOS
// app). The one module that decides; everything else asks it, and on the web
// every answer is "nothing to do".
import { isTelegramShell, WEB_CONTEXT, scrubbedUrl, versionAtLeast } from '../logic/telegramLaunch.js';
import { createCloudBackup } from './cloudBackup.js';
import { startTelegram, attachTelegramGame } from './telegram.js';
import { setAnalyticsContext, trackPageView, setAnalyticsClientId } from '../utils/analytics.js';
import { signInWithTelegram } from '../utils/userManager.js';

export const platform = { id: 'web', context: WEB_CONTEXT, telegram: null };

/** Runs once, before the game boots. Never rejects. */
export async function initPlatform(loc = globalThis.location) {
  const shell = isTelegramShell(loc?.pathname);
  if (shell) {
    const tg = await startTelegram().catch(() => null);
    if (tg) {
      Object.assign(platform, { id: 'telegram', context: tg.context, telegram: tg.webApp });
      // Before the menu draws, so it shows the right name and identity. Bounded:
      // a slow or failed sign-in leaves the local identity and boots anyway.
      platform.signIn = await signInWithTelegram(tg.webApp.initData);
      if (platform.signIn) platform.context = { ...platform.context, player_status: platform.signIn.isNew ? 'new' : 'returning' };
      // Progress backup: fill in what this device is missing, then keep the cloud copy current.
      if (platform.signIn && tg.webApp.CloudStorage && versionAtLeast(tg.webApp.version, '6.9')) {
        const backup = createCloudBackup(tg.webApp.CloudStorage);
        platform.restored = await Promise.race([
          backup.restore().catch(() => []),
          new Promise((r) => setTimeout(() => r([]), 4000))
        ]);
        backup.start();
        try { tg.webApp.onEvent('deactivated', () => backup.flush()); } catch {}
      }
    }
    // Telegram's signed launch data (user id, name) rides in the #fragment.
    // Telegram's script has read it by now; drop it before analytics sees the address.
    const clean = scrubbedUrl(loc.href);
    if (clean && clean !== loc.href) {
      try { globalThis.history?.replaceState(globalThis.history.state, '', clean); } catch {}
    }
  }
  if (platform.id === 'telegram') setAnalyticsClientId(analyticsClientId());
  setAnalyticsContext(platform.context);
  // index.html turns GA's automatic page view off on /tg; send it now the address is clean.
  if (shell) trackPageView();
  return platform;
}

export function attachGame(game) {
  if (platform.id === 'telegram') attachTelegramGame(game, platform.telegram);
}

/** A random GA client id kept by the game (and backed up to CloudStorage in Telegram). */
export function analyticsClientId(storage = globalThis.localStorage) {
  const KEY = 'pr_analytics_cid';
  try {
    const have = storage.getItem(KEY);
    if (have && /^[0-9]+\.[0-9]+$/.test(have)) return have;
    const id = Math.floor(Math.random() * 2147483647) + '.' + Math.floor(Date.now() / 1000);
    storage.setItem(KEY, id);
    return id;
  } catch { return null; }
}
