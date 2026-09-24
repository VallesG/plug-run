// The Daily Race's local record (streak, results, rank), per player.
// Backed up to Telegram CloudStorage with the rest of the progress keys.
import { getUserID } from './userManager.js';
import { EMPTY_DAILY, recordDaily } from '../logic/dailyRace.js';

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

/** Record a finished Daily Race; returns { state, official }. */
export function saveDailyResult(n, result) {
  const out = recordDaily(getDailyState(), n, result);
  if (out.official) save(out.state);
  return out;
}

/** Remember today's rank once the server answers. */
export function saveDailyRank(n, rank, total) {
  const state = getDailyState();
  if (!state.days?.[n] || !Number.isInteger(rank)) return;
  state.days[n] = { ...state.days[n], rank, total };
  save(state);
}
