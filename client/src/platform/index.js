// Where the game is running: the plain web or Telegram (and later the iOS
// app). The one module that decides; everything else asks it, and on the web
// every answer is "nothing to do".
import { isTelegramShell, WEB_CONTEXT, scrubbedUrl, versionAtLeast, startParamKind } from '../logic/telegramLaunch.js';
import { createCloudBackup } from './cloudBackup.js';
import { startTelegram, attachTelegramGame } from './telegram.js';
import { setAnalyticsContext, trackPageView, setAnalyticsClientId, trackVisit } from '../utils/analytics.js';
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
  trackVisit();
  return platform;
}

export function attachGame(game) {
  if (platform.id === 'telegram') attachTelegramGame(game, platform.telegram);
}

/** Telegram's signed launch data, for the server to check; null on the web. */
export function identityProof() {
  return platform.id === 'telegram' ? platform.telegram?.initData || null : null;
}

// A challenge link (t.me/<bot>/play?startapp=c_<id>) opens the game with that
// id as its start param. Handed out once: returning to the menu later must not
// start the same challenge again.
let challengeTaken = false;
export function takeLaunchChallenge() {
  if (challengeTaken || platform.id !== 'telegram') return null;
  challengeTaken = true;
  const param = platform.telegram?.initDataUnsafe?.start_param;
  return startParamKind(param) === 'challenge' ? param.slice(2) : null;
}

/**
 * Send a challenge. In Telegram: the prepared card through Telegram's own
 * share dialog (Bot API 8.0+), else Telegram's share-link picker. On the web:
 * the system share sheet, else the clipboard. Resolves 'sent' | 'declined' |
 * 'opened' | 'copied' | 'failed'.
 */
export function shareChallenge({ link, text, preparedId }) {
  const wa = platform.id === 'telegram' ? platform.telegram : null;
  if (wa) {
    if (preparedId && versionAtLeast(wa.version, '8.0') && typeof wa.shareMessage === 'function') {
      return new Promise((resolve) => {
        try { wa.shareMessage(preparedId, (sent) => resolve(sent ? 'sent' : 'declined')); }
        catch { resolve('failed'); }
      });
    }
    try {
      wa.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text));
      return Promise.resolve('opened');
    } catch { return Promise.resolve('failed'); }
  }
  const nav = globalThis.navigator;
  if (nav?.share) return nav.share({ text, url: link }).then(() => 'sent', (e) => (e?.name === 'AbortError' ? 'declined' : 'failed'));
  if (nav?.clipboard?.writeText) return nav.clipboard.writeText(text + ' ' + link).then(() => 'copied', () => 'failed');
  return Promise.resolve('failed');
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
