// The Daily Race prize, as data. Pure: no storage, network or clock.
//
// A prize day pays one prize, in TON, to the fastest verified official run
// from a Telegram account. The owner turns prizes on and off from the bot
// (/prize 5 6 = $5 a day for six days); each day's amount is fixed the first
// time that day is touched, so a change never alters a race in progress. The
// day closes at midnight UTC, the winner is settled half an hour later (late
// finishes land by then), and the winner has a week to connect a wallet.
// Payment is sent by hand from the owner's wallet.

import { DAILY_EPOCH_MS, raceTimeLabel } from './dailyRace.js';

export const PRIZE_SETTLE_DELAY_S = 30 * 60;
export const PRIZE_CLAIM_DAYS = 7;
export const PRIZE_MAX_USD = 100;
export const PRIZE_MAX_DAYS = 60;
export const TON_MAINNET = '-239';

/** When Daily #n ends (UTC midnight after it), in seconds. */
export function dayEndSec(n) {
  return DAILY_EPOCH_MS / 1000 + n * 86400;
}

/** A day can be settled once it is over and late finishes have landed. */
export function settleable(n, nowSec) {
  return Number.isInteger(n) && n >= 1 && nowSec >= dayEndSec(n) + PRIZE_SETTLE_DELAY_S;
}

/** The prize the standing config gives Daily #n: { usd } or null. */
export function prizeForDay(config, n) {
  if (!config || !Number.isFinite(config.usd) || config.usd <= 0) return null;
  if (!Number.isInteger(config.from) || n < config.from) return null;
  if (Number.isInteger(config.until) && n > config.until) return null;
  return { usd: config.usd };
}

export const usdLabel = (usd) => '$' + (Number.isInteger(usd) ? String(usd) : Number(usd).toFixed(2));

/**
 * The owner's bot commands. Returns null for anything else.
 *   /prize                 status
 *   /prize 5  | /prize 5 6 on: $5 a day (for 6 days)
 *   /prize off             off from tomorrow (today's prize stands)
 *   /paid 12 [tx]          Daily #12 was paid
 *   /dq 12 reason          pass Daily #12 to the next runner
 */
export function parsePrizeCommand(text) {
  const t = String(text ?? '').trim().replace(/@\w+/, '');
  let m;
  if (/^\/prize$/i.test(t)) return { cmd: 'status' };
  if (/^\/prize\s+off$/i.test(t)) return { cmd: 'off' };
  if ((m = /^\/prize\s+\$?(\d+(?:\.\d{1,2})?)(?:\s+(\d+))?$/i.exec(t))) {
    const usd = Number(m[1]), days = m[2] ? Number(m[2]) : null;
    if (!(usd > 0 && usd <= PRIZE_MAX_USD) || (days !== null && !(days >= 1 && days <= PRIZE_MAX_DAYS))) return { cmd: 'bad' };
    return { cmd: 'on', usd, days };
  }
  if ((m = /^\/paid\s+#?(\d+)(?:\s+(\S{1,128}))?$/i.exec(t))) return { cmd: 'paid', day: Number(m[1]), tx: m[2] || null };
  if ((m = /^\/dq\s+#?(\d+)(?:\s+([\s\S]{1,200}))?$/i.exec(t))) return { cmd: 'dq', day: Number(m[1]), reason: (m[2] || 'disqualified').trim() };
  if (/^\/(prize|paid|dq)\b/i.test(t)) return { cmd: 'bad' };
  return null;
}

/**
 * The winner from a day's board, fastest first ([{ userId, ms }]): the first
 * run from a Telegram account that was not disqualified.
 */
export function pickWinner(board, telegramIds, disqualified = new Set()) {
  for (const e of board || []) {
    if (!e?.userId || disqualified.has(e.userId)) continue;
    const tg = telegramIds instanceof Map ? telegramIds.get(e.userId) : telegramIds?.[e.userId];
    if (tg) return { ...e, telegramId: String(tg) };
  }
  return null;
}

/** Nanotons for a dollar amount at a TON price, rounded up to the next 0.01 TON. */
export function tonNano(usd, priceUsd) {
  if (!(usd > 0) || !(priceUsd > 0)) return null;
  const cents = Math.ceil((usd / priceUsd) * 100 - 1e-9);
  return String(BigInt(cents) * 10_000_000n);
}

export const tonLabel = (nano) => (Number(BigInt(nano) / 10_000_000n) / 100).toFixed(2) + ' TON';

/** Tonkeeper's transfer link, with the amount and a comment filled in when known. */
export function tonkeeperLink(address, nano = null, text = '') {
  // Spaces as %20, not '+': wallets read the comment literally.
  const q = [nano ? 'amount=' + encodeURIComponent(nano) : '', text ? 'text=' + encodeURIComponent(text) : ''].filter(Boolean).join('&');
  return 'https://app.tonkeeper.com/transfer/' + encodeURIComponent(address) + (q ? '?' + q : '');
}

/** A win as a player sees it: 'won' (claim it), 'claimed', 'paid' or 'expired'. */
export function winState(win, nowSec) {
  if (!win) return null;
  if (win.status === 'won' && Number.isFinite(win.claimBy) && nowSec > win.claimBy) return 'expired';
  return win.status;
}

/** One line of a day's result for the owner's status message. */
export function winLine(n, win, nowSec) {
  if (!win) return '#' + n + ' not settled yet';
  if (win.status === 'none') return '#' + n + ' no Telegram runs';
  const state = winState(win, nowSec);
  const what = state === 'won' ? 'waiting for a wallet' : state === 'claimed' ? 'claimed, not paid (/paid ' + n + ')' : state;
  return '#' + n + ' ' + win.name + ' ' + raceTimeLabel(win.ms) + ' · ' + usdLabel(win.usd) + ' · ' + what;
}
