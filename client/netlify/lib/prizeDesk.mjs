// The Daily Race prize desk (rules in src/logic/dailyPrize.js): which days
// pay, who won, the wallet they claimed with, and the owner's bot commands.
// Server-only; the telegram function wires it in. State in Redis:
//   prize:config   { gram, from, until }  the standing setting (/prize)
//   prize:day:{n}  { gram }               a day's prize, fixed the first time it is touched
//   prize:win:{n}  { day, gram, userId, telegramId, name, ms, rank, ranked, status, claimBy, wallet, ... }
//                  status 'won' -> 'claimed' -> 'paid', or 'none' (no Telegram runs)
//   prize:dq:{n}   hash userId -> reason
// Payouts are sent by hand from the owner's wallet: the desk never holds a key.
import { dailyNumber, dailyDateLabel, raceTimeLabel } from '../../src/logic/dailyRace.js';
import {
  PRIZE_CLAIM_DAYS, TON_MAINNET, settleable, prizeForDay, gramLabel, gramNano, parsePrizeCommand, pickWinner,
  tonkeeperLink, winState, winLine
} from '../../src/logic/dailyPrize.js';
import { parseRawAddress, parseFriendlyAddress, friendlyAddress, shortAddress } from '../../src/logic/tonAddress.js';

const KEEP_S = String(60 * 86400);
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const parse = (v) => { if (!v) return null; try { return JSON.parse(v); } catch { return null; } };

export function createPrizeDesk({ redis, botApi, nowSec, adminId, channelId = () => null, dailyRuns, botName, telegramUser }) {
  const today = () => dailyNumber(nowSec() * 1000);
  const getJson = async (key) => parse(await redis(['GET', key]));
  const setJson = (key, value, ...extra) => redis(['SET', key, JSON.stringify(value), ...extra]);
  const say = async (chatId, text, buttons = null) => {
    try {
      const res = await botApi('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true,
        ...(buttons ? { reply_markup: { inline_keyboard: buttons.map((b) => [b]) } } : {}) });
      return res?.ok === true;
    } catch { return false; }
  };
  const tellOwner = (text, buttons) => (adminId() ? say(adminId(), text, buttons) : Promise.resolve(false));

  /** Daily #n's prize: { gram } or null. Today's is fixed from the config the first time it is asked for. */
  async function dayPrize(n, { create = false } = {}) {
    const have = await getJson('prize:day:' + n);
    if (have || !create || n !== today()) return have;
    const p = prizeForDay(await getJson('prize:config'), n);
    if (!p) return null;
    await setJson('prize:day:' + n, p, 'NX', 'EX', KEEP_S);
    return getJson('prize:day:' + n);
  }

  // A day's board, fastest first; scores carry a sub-millisecond tiebreak.
  async function boardEntries(n, count = 200) {
    const flat = (await redis(['ZRANGE', 'daily:' + n, '0', String(count - 1), 'WITHSCORES'])) || [];
    const out = [];
    for (let i = 0; i + 1 < flat.length; i += 2) out.push({ userId: String(flat[i]), ms: Math.floor(Number(flat[i + 1])), rank: out.length + 1 });
    return out;
  }
  async function telegramOf(n, ids) {
    const tg = ids.length ? (await redis(['HMGET', 'daily:' + n + ':telegram', ...ids])) || [] : [];
    return new Map(ids.map((id, i) => [id, tg[i]]).filter(([, v]) => v));
  }
  async function disqualified(n) {
    const flat = (await redis(['HGETALL', 'prize:dq:' + n])) || [];
    return new Set(flat.filter((_, i) => i % 2 === 0));
  }
  async function leaderOf(n) {
    const board = await boardEntries(n);
    const tg = await telegramOf(n, board.map((e) => e.userId));
    const lead = pickWinner(board, tg, await disqualified(n));
    if (!lead) return { lead: null, board, telegram: tg.size };
    const name = (await redis(['HGET', 'daily:' + n + ':names', lead.userId])) || 'Runner';
    return { lead: { ...lead, name }, board, telegram: tg.size };
  }

  /** For the public board: { gram, leader: { rank, name, ms } | null }, or null on a day without a prize. */
  async function boardPrize(n) {
    const prize = await dayPrize(n, { create: true });
    if (!prize) return null;
    const { lead } = await leaderOf(n);
    return { gram: prize.gram, leader: lead ? { rank: lead.rank, name: lead.name, ms: lead.ms } : null };
  }

  // The winner's run, in brief, for the owner's review message.
  async function runBrief(n, userId) {
    try {
      const run = await (await dailyRuns()).get(n + '/' + userId, { type: 'json' });
      const t = run?.record?.clearTimes;
      if (!Array.isArray(t) || t.length !== 7) return 'Run not found in daily-runs.';
      const splits = t.map((x, i) => ((x - (i ? t[i - 1] : 0)) / 1000).toFixed(1));
      const powers = (run.record.orderedPowers || []).join('/').toUpperCase() || 'none';
      return 'Houses (s): ' + splits.join(' · ') + '\nRetries ' + (run.record.retries ?? '?') + ' · powers ' + esc(powers)
        + '\nStored run: daily-runs/' + n + '/' + esc(userId);
    } catch { return 'Stored run unavailable.'; }
  }

  async function announce(win) {
    const n = win.day;
    if (win.status === 'none') {
      await tellOwner('Daily #' + n + ': no Telegram runs among ' + win.ranked + ' ranked. Nothing to pay.');
      return;
    }
    const bot = await botName().catch(() => 'PlugRunBot');
    const told = await say(win.telegramId,
      '🏆 <b>You won Plug Run Daily #' + n + '!</b>\n\nYour official time ' + raceTimeLabel(win.ms) + ' was the fastest of the day. '
      + 'Your prize: <b>' + gramLabel(win.gram) + '</b>.\n\nTap below and connect a TON wallet to claim it within ' + PRIZE_CLAIM_DAYS + ' days.',
      [{ text: '🏆 CLAIM ' + gramLabel(win.gram), url: 'https://t.me/' + bot + '/play?startapp=prize_' + n }]);
    // The public results channel: the winner, and today's race.
    if (channelId()) {
      await say(channelId(), '🏁 <b>Daily Race #' + n + ' winner: ' + esc(win.name) + '</b> · ' + raceTimeLabel(win.ms) + ' · wins ' + gramLabel(win.gram)
        + '\n\nToday\'s race is live. Fastest run wins.', [{ text: '▶ RACE TODAY', url: 'https://t.me/' + bot + '/play' }]);
    }
    await tellOwner('🏁 <b>Daily #' + n + ' winner: ' + esc(win.name) + '</b> · ' + raceTimeLabel(win.ms)
      + '\nRank ' + win.rank + ' of ' + win.ranked + ' ranked · ' + gramLabel(win.gram)
      + '\n' + (await runBrief(n, win.userId))
      + '\n\n' + (told ? 'Told them in Telegram.' : 'Could not message them; they will see it when they open the game.')
      + ' Waiting for their wallet.\nNot a fair run? /dq ' + n + ' reason passes it to the next runner.');
  }

  /** Settle a closed prize day once: the fastest Telegram run that is not disqualified. */
  async function settleDay(n) {
    if (!settleable(n, nowSec())) return null;
    const existing = await getJson('prize:win:' + n);
    if (existing) return existing;
    // Every ranked run fixes its day's prize; the standing config covers a day that somehow missed it.
    const prize = (await dayPrize(n)) ?? prizeForDay(await getJson('prize:config'), n);
    if (!prize) return null;
    const { lead, board } = await leaderOf(n);
    const now = nowSec();
    const win = lead
      ? { day: n, gram: prize.gram, userId: lead.userId, telegramId: lead.telegramId, name: lead.name, ms: lead.ms,
          rank: lead.rank, ranked: board.length, status: 'won', settledAt: now, claimBy: now + PRIZE_CLAIM_DAYS * 86400 }
      : { day: n, gram: prize.gram, ranked: board.length, status: 'none', settledAt: now };
    if ((await setJson('prize:win:' + n, win, 'NX', 'EX', KEEP_S)) !== 'OK') return getJson('prize:win:' + n);
    await announce(win);
    return win;
  }

  /** Yesterday and the day before (a missed run of the schedule only delays a day). */
  async function settleClosed() {
    const t = today(), out = [];
    for (const n of [t - 2, t - 1]) if (n >= 1) out.push(await settleDay(n));
    return out;
  }

  /** What a signed-in player's game shows: today's prize and their wins of the last week. */
  async function playerStatus(userId) {
    await settleClosed().catch(() => {});
    const t = today(), now = nowSec();
    const p = await dayPrize(t, { create: true });
    const days = [];
    for (let d = t - 1; d >= Math.max(1, t - PRIZE_CLAIM_DAYS - 1); d--) days.push(d);
    const raw = days.length ? (await redis(['MGET', ...days.map((d) => 'prize:win:' + d)])) || [] : [];
    const wins = [];
    raw.forEach((v, i) => {
      const w = parse(v);
      if (!w || w.userId !== userId || w.status === 'none') return;
      wins.push({ day: days[i], gram: w.gram, ms: w.ms, status: winState(w, now), claimBy: w.claimBy ?? null, wallet: w.wallet ? shortAddress(w.wallet) : null });
    });
    return { today: p ? { day: t, gram: p.gram } : null, wins };
  }

  async function tellOwnerClaim(win) {
    const n = win.day, comment = 'Plug Run Daily #' + n;
    await tellOwner('💰 <b>' + esc(win.name) + ' claimed Daily #' + n + '</b>.\nWallet: <code>' + win.wallet + '</code>\n'
      + 'Send: <b>' + gramLabel(win.gram) + '</b>\nComment: ' + comment + '\n\nThen send /paid ' + n,
    [{ text: 'Pay ' + gramLabel(win.gram) + ' in Tonkeeper', url: tonkeeperLink(win.wallet, gramNano(win.gram), comment) }]);
  }

  /** A winner connects their wallet. Returns [httpStatus, body]. */
  async function claim(userId, body) {
    const n = Number(body?.day);
    const win = Number.isInteger(n) ? await getJson('prize:win:' + n) : null;
    if (!win || win.status === 'none' || win.userId !== userId) return [404, { ok: false, error: 'no prize to claim' }];
    const tg = telegramUser(body?.initData);
    if (!tg || String(tg.id) !== String(win.telegramId)) return [403, { ok: false, error: 'open Plug Run in Telegram to claim' }];
    const state = winState(win, nowSec());
    if (state === 'paid') return [409, { ok: false, error: 'already paid' }];
    if (state === 'expired') return [410, { ok: false, error: 'the claim window has closed' }];
    if (String(body?.chain ?? TON_MAINNET) !== TON_MAINNET) return [400, { ok: false, error: 'connect a mainnet TON wallet' }];
    const given = typeof body?.wallet === 'string' ? body.wallet.trim() : '';
    const friendlyIn = parseRawAddress(given) ? null : parseFriendlyAddress(given);
    if (friendlyIn?.testOnly) return [400, { ok: false, error: 'connect a mainnet TON wallet' }];
    const raw = parseRawAddress(given) ? given.toLowerCase() : friendlyIn?.raw;
    const wallet = raw ? friendlyAddress(raw) : null;
    if (!wallet) return [400, { ok: false, error: 'not a TON wallet address' }];
    const next = { ...win, status: 'claimed', wallet, walletRaw: raw, claimedAt: nowSec() };
    await setJson('prize:win:' + n, next, 'EX', KEEP_S);
    if (win.status !== 'claimed' || win.wallet !== wallet) await tellOwnerClaim(next);
    return [200, { ok: true, day: n, status: 'claimed', wallet: shortAddress(wallet) }];
  }

  /** The owner's commands in the bot chat. True when the message was one (and handled). */
  async function command(msg) {
    const chatId = msg?.chat?.id, from = msg?.from?.id;
    if (/^\/whoami\b/i.test(msg?.text || '')) {
      await say(chatId, 'Your Telegram ID: <code>' + esc(from) + '</code>');
      return true;
    }
    const c = parsePrizeCommand(msg?.text);
    if (!c || !adminId() || String(from) !== String(adminId())) return false;
    const t = today(), now = nowSec();
    const reply = (text) => say(chatId, text);
    if (c.cmd === 'bad') {
      await reply('Commands:\n/prize (status)\n/prize 1 (on: 1 GRAM a day) · /prize 1 6 (for six days)\n/prize off (off from tomorrow)\n/paid 12 [tx]\n/dq 12 reason');
    } else if (c.cmd === 'on') {
      const config = { gram: c.gram, from: t, until: c.days ? t + c.days - 1 : null };
      await setJson('prize:config', config);
      await setJson('prize:day:' + t, { gram: c.gram }, 'EX', KEEP_S);
      await reply('Daily prize on: <b>' + gramLabel(c.gram) + ' a day</b>, from Daily #' + t + ' (' + dailyDateLabel(t) + ')'
        + (config.until ? ' through #' + config.until + ' (' + dailyDateLabel(config.until) + ')' : ' until /prize off')
        + '. Today\'s race shows it now.');
    } else if (c.cmd === 'off') {
      const config = await getJson('prize:config');
      if (config) await setJson('prize:config', { ...config, until: Math.min(config.until ?? t, t) });
      const p = await getJson('prize:day:' + t);
      await reply('Daily prize off from tomorrow.' + (p ? ' Today\'s ' + gramLabel(p.gram) + ' (Daily #' + t + ') still stands.' : ''));
    } else if (c.cmd === 'status') {
      const config = await getJson('prize:config');
      const p = await dayPrize(t, { create: true });
      const lines = [];
      const on = config && prizeForDay(config, t);
      lines.push(on ? 'Daily prize: ' + gramLabel(config.gram) + ' a day' + (config.until ? ', through #' + config.until : ', until /prize off') + '.' : 'Daily prize: off.');
      if (p) {
        const { lead, board } = await leaderOf(t);
        lines.push('Today #' + t + ': ' + gramLabel(p.gram) + ' · ' + board.length + ' ranked · leader ' + (lead ? esc(lead.name) + ' ' + raceTimeLabel(lead.ms) : 'none yet'));
      }
      const recent = [];
      for (let d = t - 1; d >= Math.max(1, t - 7); d--) {
        const [win, dp] = [await getJson('prize:win:' + d), await getJson('prize:day:' + d)];
        if (win || dp) recent.push(esc(winLine(d, win, now)));
      }
      if (recent.length) lines.push('\nRecent:\n' + recent.join('\n'));
      lines.push('\n/prize 1 [days] · /prize off · /paid N [tx] · /dq N reason');
      await reply(lines.join('\n'));
    } else if (c.cmd === 'paid') {
      const win = await getJson('prize:win:' + c.day);
      if (!win || win.status === 'none') await reply('Daily #' + c.day + ' has no winner.');
      else if (win.status === 'paid') await reply('Daily #' + c.day + ' is already marked paid.');
      else if (win.status !== 'claimed') await reply(esc(win.name) + ' has not connected a wallet for Daily #' + c.day + ' yet.');
      else {
        await setJson('prize:win:' + c.day, { ...win, status: 'paid', paidAt: now, tx: c.tx }, 'EX', KEEP_S);
        await say(win.telegramId, '💸 Your ' + gramLabel(win.gram) + ' for Plug Run Daily #' + c.day + ' has been sent to <code>' + shortAddress(win.wallet) + '</code>. Thanks for racing!');
        await reply('Daily #' + c.day + ' marked paid.');
      }
    } else if (c.cmd === 'dq') {
      const win = await getJson('prize:win:' + c.day);
      if (!win || win.status === 'none') await reply('Daily #' + c.day + ' has no winner to pass on.');
      else if (win.status === 'paid') await reply('Daily #' + c.day + ' is already paid.');
      else {
        await redis(['HSET', 'prize:dq:' + c.day, win.userId, c.reason.slice(0, 200)]);
        await redis(['EXPIRE', 'prize:dq:' + c.day, KEEP_S]);
        await redis(['DEL', 'prize:win:' + c.day]);
        await say(win.telegramId, 'Your Daily #' + c.day + ' run could not be confirmed for the prize, so it passes to the next runner.');
        await reply(esc(win.name) + ' disqualified from Daily #' + c.day + ' (' + esc(c.reason) + '). Settling again…');
        await settleDay(c.day);
      }
    }
    return true;
  }

  /** The bot's welcome card adds the prize on prize days only. */
  async function welcomeLine() {
    try { const p = await dayPrize(today(), { create: true }); return p ? '\n\n🏆 Today\'s fastest Daily Race run wins ' + gramLabel(p.gram) + '.' : ''; }
    catch { return ''; }
  }

  return { welcomeLine, dayPrize, boardPrize, settleDay, settleClosed, playerStatus, claim, command };
}
