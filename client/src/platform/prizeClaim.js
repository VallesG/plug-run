// The Daily Race prize claim: a page-level overlay above the game, in the
// daily's amber. It is DOM rather than a Phaser modal because TON Connect's
// wallet picker (which opens over it) is DOM too, and a claim must survive
// the game resizing underneath.
import { raceTimeLabel } from '../logic/dailyRace.js';
import { gramLabel } from '../logic/dailyPrize.js';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const dateLabel = (sec) => { const d = new Date(sec * 1000); return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate(); };

/** What the claim screen shows in each state. Pure. */
export function claimView(state, win, { wallet = null, error = null } = {}) {
  const head = { title: 'DAILY RACE #' + win.day + ' · WINNER', big: gramLabel(win.gram) };
  if (state === 'claimed') return { ...head, line: 'ON ITS WAY TO ' + (wallet || 'YOUR WALLET'),
    note: 'Prizes are sent within 7 days of a claim.', buttons: [{ label: 'DONE', act: 'close', primary: true }] };
  const line = Number.isFinite(win.ms) ? 'FASTEST TIME ' + raceTimeLabel(win.ms) : '';
  if (state === 'connecting') return { ...head, line, note: 'Approve the connection in your wallet.',
    buttons: [{ label: 'CONNECTING…', act: null, primary: true }, { label: 'CANCEL', act: 'cancel' }] };
  if (state === 'error') return { ...head, line, note: error || 'Could not claim right now.',
    buttons: [{ label: 'TRY AGAIN', act: 'connect', primary: true }, { label: 'LATER', act: 'close' }] };
  return { ...head, line,
    note: 'Connect a TON wallet to receive it.' + (Number.isFinite(win.claimBy) ? ' Claim by ' + dateLabel(win.claimBy) + '.' : ''),
    buttons: [{ label: 'CONNECT WALLET', act: 'connect', primary: true }, { label: 'LATER', act: 'close' }] };
}

/** The server's reason from an api.js error ("HTTP 410 {...}"), for the screen. */
export function claimError(e) {
  const m = /HTTP \d+ (\{.*\})$/.exec(String(e?.message || ''));
  try { const why = m && JSON.parse(m[1]).error; if (why) return why.charAt(0).toUpperCase() + why.slice(1) + '.'; } catch {}
  return 'Could not claim right now. Check your connection and try again.';
}

const STYLE = {
  root: 'position:fixed;inset:0;z-index:900;display:flex;align-items:center;justify-content:center;padding:16px;'
    + 'background:rgba(8,6,3,.92);font-family:monospace;-webkit-user-select:none;user-select:none',
  card: 'width:100%;max-width:360px;box-sizing:border-box;padding:28px 20px 20px;background:#120d06;border:2px solid #8a5a1f;text-align:center',
  title: 'color:#f2b760;font-size:12px;font-weight:bold;letter-spacing:3px',
  big: 'color:#ffb54d;font:bold 36px Arial,sans-serif;margin:18px 0 10px',
  line: 'color:#f6ead2;font-size:13px;font-weight:bold;letter-spacing:2px;min-height:16px;word-break:break-all',
  note: 'color:#b89a6c;font-size:12px;line-height:1.5;margin:14px 0 20px',
  button: 'display:block;width:100%;margin-top:10px;padding:14px 0;font:bold 14px Arial,sans-serif;letter-spacing:1px;cursor:pointer;',
  primary: 'background:#c97b1c;border:2px solid #ffb54d;color:#fff',
  secondary: 'background:#1d1509;border:2px solid #8a5a1f;color:#f5c98a'
};

/**
 * Show the claim for a win ({ day, gram, ms, claimBy }). connect() resolves a
 * wallet ({ address, chain }) or null; claim(wallet) resolves the server's
 * answer ({ wallet }) or throws. onClose(state) runs when it is dismissed.
 */
export function showPrizeClaim(win, { connect, claim, onClose = null, doc = globalThis.document } = {}) {
  if (!doc?.body) return null;
  const root = doc.createElement('div');
  root.setAttribute('style', STYLE.root);
  // Phaser hears pointer releases on the whole window: keep this screen's taps
  // from reaching the game under it (the caller also pauses the scene's input,
  // for TON Connect's picker, which lives outside this element).
  for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click']) {
    root.addEventListener(type, (e) => e.stopPropagation());
  }
  let state = 'won', extra = {}, attempt = 0;
  const el = (tag, style, text) => { const e = doc.createElement(tag); e.setAttribute('style', style); if (text) e.textContent = text; return e; };
  const render = () => {
    const v = claimView(state, win, extra);
    const card = el('div', STYLE.card);
    card.appendChild(el('div', STYLE.title, v.title));
    card.appendChild(el('div', STYLE.big, v.big));
    card.appendChild(el('div', STYLE.line, v.line));
    card.appendChild(el('div', STYLE.note, v.note));
    for (const b of v.buttons) {
      const btn = el('button', STYLE.button + (b.primary ? STYLE.primary : STYLE.secondary), b.label);
      if (b.act) btn.addEventListener('click', () => act(b.act)); else btn.disabled = true;
      card.appendChild(btn);
    }
    root.replaceChildren(card);
  };
  const act = async (what) => {
    if (what === 'close') { root.remove(); if (onClose) onClose(state); return; }
    // A cancelled connect may still answer later; its answer is ignored.
    if (what === 'cancel') { attempt++; state = 'won'; render(); return; }
    const mine = ++attempt;
    state = 'connecting'; render();
    try {
      const wallet = await connect();
      if (mine !== attempt) return;
      if (!wallet) { state = 'won'; render(); return; }
      const res = await claim(wallet);
      if (mine !== attempt) return;
      state = 'claimed'; extra = { wallet: res?.wallet || null }; render();
    } catch (e) {
      if (mine !== attempt) return;
      state = 'error'; extra = { error: claimError(e) }; render();
    }
  };
  render();
  doc.body.appendChild(root);
  return { root, close: () => act('close'), state: () => state };
}
