// Telegram Mini App wiring. Only src/platform/index.js imports this, and only
// on the /tg address; nothing in gameplay knows Telegram exists.
//
// Deliberately NOT here: pausing. Telegram can minimize the app, and the view
// can resize, but game time never stops (Block Rivals is a race against the
// clock). Resizes go through the game's own relayout, as on the web.
import { TELEGRAM_SDK_URL, TELEGRAM_BG, telegramContext, versionAtLeast } from '../logic/telegramLaunch.js';

export function loadTelegramSdk({ timeoutMs = 6000, doc = globalThis.document } = {}) {
  if (globalThis.Telegram?.WebApp) return Promise.resolve(globalThis.Telegram.WebApp);
  if (!doc?.head) return Promise.resolve(null);
  return new Promise((resolve) => {
    let done = false;
    const finish = (value) => { if (done) return; done = true; clearTimeout(timer); resolve(value); };
    const timer = setTimeout(() => finish(null), timeoutMs);
    const script = doc.createElement('script');
    script.src = TELEGRAM_SDK_URL;
    script.onload = () => finish(globalThis.Telegram?.WebApp || null);
    script.onerror = () => finish(null);
    doc.head.appendChild(script);
  });
}

/**
 * Load Telegram's script and set the app up. Resolves { webApp, context }, or
 * null outside a real Telegram launch: the script defines Telegram.WebApp in
 * any browser, but only Telegram hands the page signed initData.
 */
export async function startTelegram(options) {
  const webApp = await loadTelegramSdk(options);
  if (!webApp || typeof webApp.initData !== 'string' || !webApp.initData) return null;
  const at = (v) => versionAtLeast(webApp.version, v);
  const call = (fn) => { try { fn(); } catch {} };
  call(() => webApp.expand());
  // A vertical drag while steering must not close or minimize the app.
  if (at('7.7')) call(() => webApp.disableVerticalSwipes());
  if (at('6.1')) {
    call(() => webApp.setHeaderColor(TELEGRAM_BG));
    call(() => webApp.setBackgroundColor(TELEGRAM_BG));
  }
  if (at('7.10')) call(() => webApp.setBottomBarColor(TELEGRAM_BG));
  return { webApp, context: telegramContext(webApp) };
}

// Telegram keeps its own loading screen up until ready(). Hand over when the
// menu first draws; the fallback covers a menu that never gets there.
export const READY_FALLBACK_MS = 10000;
export function attachTelegramGame(game, webApp, { fallbackMs = READY_FALLBACK_MS } = {}) {
  let sent = false;
  const ready = () => {
    if (sent) return;
    sent = true;
    clearTimeout(fallback);
    try { webApp.ready(); } catch {}
  };
  const fallback = setTimeout(ready, fallbackMs);
  const hook = () => {
    const menu = game?.scene?.getScene?.('MENU');
    if (menu?.events) menu.events.once('create', ready);
    else ready();
  };
  if (game?.isBooted) hook();
  else if (game?.events) game.events.once('ready', hook);
  else ready();
  return { ready, get sent() { return sent; } };
}
