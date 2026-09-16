// Pure state, economy and layout for The Window. No imports.
export const WINDOW_STATE_VERSION = 1;

export const WINDOW_GANGS = Object.freeze([
  Object.freeze({
    id: 'crossline',
    name: 'Crossline',
    motto: 'Read the street. Keep it moving.',
    color: 0x43b5c7,
    css: '#43b5c7',
    primary: 'Switch',
    jobs: 'Mags',
    pitch: 'We keep the streets talking. Bring the stash home before the story changes.'
  }),
  Object.freeze({
    id: 'iron-row',
    name: 'Iron Row',
    motto: 'Finish clean. Stand your ground.',
    color: 0xb85f45,
    css: '#b85f45',
    primary: 'Brick',
    jobs: 'Rook',
    pitch: 'No wasted motion. No excuses. Get in, get out, and look after your people.'
  }),
  Object.freeze({
    id: 'afterlight',
    name: 'Afterlight',
    motto: 'Move fast. Leave a mark.',
    color: 0x9b78d0,
    css: '#9b78d0',
    primary: 'Vee',
    jobs: 'Sol',
    pitch: 'Style counts when the whole city is watching. Win fast and make them remember it.'
  })
]);

export const WINDOW_INTRO = Object.freeze([
  'First time running? Then listen before somebody gets you embarrassed.',
  'Three crews move the stash. Same streets. Different way of carrying themselves.',
  'Listen to their pitch. Pick who you want at your back.'
]);

const finiteInt = (value, fallback = 0) =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;

const cleanText = (value, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : fallback;

export function windowGang(gangID) {
  return WINDOW_GANGS.find(gang => gang.id === gangID) || null;
}

export function createWindowState(value = {}) {
  const ledger = Array.isArray(value.ledger)
    ? value.ledger.slice(-200).map(entry => ({
        id: cleanText(entry?.id),
        kind: entry?.kind === 'spend' ? 'spend' : 'grant',
        amount: finiteInt(entry?.amount),
        source: cleanText(entry?.source, 'unknown'),
        routeID: cleanText(entry?.routeID),
        at: finiteInt(entry?.at)
      })).filter(entry => entry.id && entry.amount > 0)
    : [];
  const seen = new Set();
  const uniqueLedger = ledger.filter(entry => !seen.has(entry.id) && seen.add(entry.id));
  const derivedBalance = uniqueLedger.reduce(
    (sum, entry) => Math.max(0, sum + (entry.kind === 'grant' ? entry.amount : -entry.amount)),
    0
  );
  const gang = windowGang(value.gangID);
  return {
    version: WINDOW_STATE_VERSION,
    gangID: gang?.id || null,
    chosenAt: gang ? finiteInt(value.chosenAt) : 0,
    onboardingComplete: Boolean(gang && value.onboardingComplete),
    credits: derivedBalance,
    ledger: uniqueLedger,
    ownedCosmetics: Array.isArray(value.ownedCosmetics)
      ? [...new Set(value.ownedCosmetics.map(item => cleanText(item)).filter(Boolean))].slice(0, 100)
      : [],
    equippedCosmetic: cleanText(value.equippedCosmetic) || null,
    lastVisitRouteID: cleanText(value.lastVisitRouteID) || null
  };
}

export function chooseWindowGang(value, gangID, at = Date.now()) {
  const gang = windowGang(gangID);
  const state = createWindowState(value);
  if (!gang) return { state, applied: false, reason: 'unknown-gang' };
  if (state.gangID) return { state, applied: false, reason: 'already-chosen' };
  return {
    state: {
      ...state,
      gangID: gang.id,
      chosenAt: finiteInt(at),
      onboardingComplete: true
    },
    applied: true,
    reason: null
  };
}

export function markWindowVisit(value, routeID) {
  const state = createWindowState(value);
  const nextRoute = cleanText(routeID);
  if (!nextRoute || nextRoute === state.lastVisitRouteID) {
    return { state, applied: false };
  }
  return { state: { ...state, lastVisitRouteID: nextRoute }, applied: true };
}

export function grantStoreCredit(value, event = {}) {
  const state = createWindowState(value);
  const id = cleanText(event.id);
  const amount = finiteInt(event.amount);
  if (!id || amount < 1) return { state, applied: false, reason: 'invalid-grant' };
  if (state.ledger.some(entry => entry.id === id)) {
    return { state, applied: false, reason: 'duplicate' };
  }
  const entry = {
    id,
    kind: 'grant',
    amount,
    source: cleanText(event.source, 'unknown'),
    routeID: cleanText(event.routeID),
    at: finiteInt(event.at)
  };
  return {
    state: createWindowState({ ...state, ledger: [...state.ledger, entry] }),
    applied: true,
    reason: null
  };
}

export function spendStoreCredit(value, purchase = {}) {
  const state = createWindowState(value);
  const id = cleanText(purchase.id);
  const amount = finiteInt(purchase.amount);
  if (!id || amount < 1) return { state, applied: false, reason: 'invalid-purchase' };
  if (state.ledger.some(entry => entry.id === id)) {
    return { state, applied: false, reason: 'duplicate' };
  }
  if (state.credits < amount) return { state, applied: false, reason: 'insufficient-credit' };
  const entry = {
    id,
    kind: 'spend',
    amount,
    source: cleanText(purchase.source, 'shelf'),
    routeID: cleanText(purchase.routeID),
    at: finiteInt(purchase.at)
  };
  return {
    state: createWindowState({ ...state, ledger: [...state.ledger, entry] }),
    applied: true,
    reason: null
  };
}

export function windowLayout(width, height) {
  const w = Math.max(280, Number.isFinite(width) ? width : 390);
  const h = Math.max(480, Number.isFinite(height) ? height : 844);
  const pad = Math.max(12, Math.floor(Math.min(w, h) * 0.035));
  const panelW = Math.min(560, w - pad * 2);
  const panelH = Math.min(720, h - pad * 2);
  const headerH = Math.max(58, Math.min(82, Math.floor(panelH * 0.105)));
  const actionH = 46;
  const portrait = Math.min(164, Math.max(104, Math.floor(panelW * 0.38)));
  return {
    w, h, pad, panelW, panelH, headerH, actionH, portrait,
    cx: w / 2,
    cy: h / 2,
    panelTop: (h - panelH) / 2,
    panelBottom: (h + panelH) / 2,
    contentW: panelW - pad * 2
  };
}
