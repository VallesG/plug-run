// Telegram Mini App launch, as data. Pure: no DOM, no Telegram SDK, no storage.
//
// The game runs as a Telegram Mini App only on the /tg address. The same
// build serves plugrun.io and /tg; Telegram's own script is loaded only on
// /tg, and only there does the game talk to Telegram (src/platform/). The
// plain address stays the ordinary web game, so the bot's Launch button can
// keep pointing at it until /tg is ready to replace it.

export const TELEGRAM_SHELL_PATH = '/tg';
// Telegram's docs pin this query version; a newer one is picked up by editing it here.
export const TELEGRAM_SDK_URL = 'https://telegram.org/js/telegram-web-app.js?63';
export const TELEGRAM_BG = '#0b0b12';

export function isTelegramShell(pathname = '') {
  const path = String(pathname ?? '');
  return path === TELEGRAM_SHELL_PATH || path.startsWith(TELEGRAM_SHELL_PATH + '/');
}

// A startapp value is only ever a prefix and an id (see the plan): the race
// itself lives on the server, so a link can't be edited into a custom race.
export function startParamKind(param) {
  const p = typeof param === 'string' ? param : '';
  if (!p) return 'none';
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(p)) return 'invalid';
  if (/^c_./.test(p)) return 'challenge';
  if (/^r_./.test(p)) return 'ref';
  if (/^s_./.test(p)) return 'campaign';
  return 'other';
}

/** "8.0" >= "7.10"? Telegram versions are dotted integers. */
export function versionAtLeast(have, want) {
  const a = String(have || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const b = String(want || '0').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return true;
}

export const WEB_CONTEXT = Object.freeze({ platform: 'web', client: 'web' });

/** Analytics context for a Telegram launch. Never the user id, name or raw start param. */
export function telegramContext(webApp) {
  const startParam = webApp?.initDataUnsafe?.start_param;
  return {
    platform: 'telegram',
    client: 'telegram_miniapp',
    source: 'telegram',
    tg_platform: typeof webApp?.platform === 'string' ? webApp.platform.slice(0, 16) : 'unknown',
    tg_version: typeof webApp?.version === 'string' ? webApp.version.slice(0, 8) : 'unknown',
    start_kind: startParamKind(startParam)
  };
}

/**
 * The address to show (and to hand analytics) once Telegram's launch data has
 * been read: no #fragment, where Telegram puts the signed user data, and no
 * tgWebApp* query values.
 */
export function scrubbedUrl(href) {
  let url;
  try { url = new URL(href); } catch { return null; }
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^tgWebApp/i.test(key)) url.searchParams.delete(key);
  return url.toString();
}
