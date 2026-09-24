// The Daily Race's local record (streak, results, rank), per player.
// Backed up to Telegram CloudStorage with the rest of the progress keys.
import { getUserID } from './userManager.js';
import { EMPTY_DAILY, recordDaily, claimDaily } from '../logic/dailyRace.js';

const key = () => 'pr_daily_v1_' + getUserID();

export function getDailyState() {
  try {
    const v = JSON.parse(localStorage.getItem(key()) || 'null');
    return v && typeof v === 'object' && v.days ? v : { ...EMPTY_DAILY, days: {} };
  } catch { return { ...EMPTY_DAILY, days: {} }; }
}

function save(state) {
  try { localStorage.setItem(key(), JSON.stringify(state)); return true; } catch { return false; }
}

/** Claim today's official run at its GO; true when this run is the official one. */
export function claimDailyRun(n) {
  const out = claimDaily(getDailyState(), n);
  if (out.official) save(out.state);
  return out.official;
}

/** Record a finished Daily Race; returns { state, official }. */
export function saveDailyResult(n, result) {
  const out = recordDaily(getDailyState(), n, result);
  if (out.official) save(out.state);
  return out;
}

/**
 * Remember what the server made of today's official run: its rank, or that it
 * was not ranked (the server could not verify it) and why.
 */
export function saveDailyRank(n, rank, total, { verified = true, reason = null } = {}) {
  const state = getDailyState();
  if (!state.days?.[n]) return;
  const day = { ...state.days[n], total };
  if (verified && Number.isInteger(rank)) { day.rank = rank; delete day.unranked; }
  else if (!verified) { day.unranked = reason || 'not verified'; delete day.rank; }
  state.days[n] = day;
  save(state);
}
