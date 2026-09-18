import { journeyCheckpoint } from '../logic/worldBlocks.js';
import { getUserID } from './userManager.js';

// Device-local, account-scoped and independent of the daily route clock.
const key = () => 'pr_journey_v1_' + getUserID();
export function getJourneyProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(key()) || 'null');
    return journeyCheckpoint(value?.version === 1 ? value : {});
  } catch { return journeyCheckpoint(); }
}
export function saveJourneyProgress(value) {
  try { localStorage.setItem(key(), JSON.stringify(journeyCheckpoint(value))); return true; }
  catch (error) { console.warn('[Journey] Progress could not be saved', error); return false; }
}
