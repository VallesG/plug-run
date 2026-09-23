// Switch the active story between gangs without throwing away a completed run.
// Rivals territory, earned credit, daily runs and account stats remain global.
import { getUserID } from './userManager.js';
import { getWindowState, saveWindowState } from './windowProgress.js';
import { getJourneyProgress } from './journeyProgress.js';
import { getCityProgress, clearCityProgressCache } from './cityProgress.js';
import { getContactProgress, clearContactProgressCache } from './contactProgress.js';
import { getSkillEvidence } from './skillEvidence.js';
import { windowGang } from '../logic/window.js';

const fields = ['journey', 'city', 'contacts', 'skill', 'blockrun'];
const activeKeys = user => ({
  journey: 'pr_journey_v1_' + user,
  city: 'pr_city_v1_' + user,
  contacts: 'pr_contacts_v1_' + user,
  skill: 'pr_skill_v1_' + user,
  blockrun: 'pr_blockrun_v1_' + user
});
const archiveKey = user => 'pr_crew_saves_v1_' + user;
const rawSnapshot = keys => Object.fromEntries(fields.map(field => [field, localStorage.getItem(keys[field])]));
const writeSnapshot = (keys, snapshot) => {
  for (const field of fields) {
    const value = snapshot?.[field];
    if (typeof value === 'string') localStorage.setItem(keys[field], value);
    else localStorage.removeItem(keys[field]);
  }
};

export function switchCrewStory(targetGangID) {
  const current = getWindowState();
  if (!current.gangID || !windowGang(targetGangID) || targetGangID === current.gangID)
    return { applied: false, reason: 'invalid-gang' };
  const user = getUserID(), keys = activeKeys(user), archiveName = archiveKey(user);
  try {
    const oldActive = rawSnapshot(keys);
    const oldArchive = localStorage.getItem(archiveName);
    const archive = oldArchive ? JSON.parse(oldArchive) : { version: 1, gangs: {} };
    if (archive?.version !== 1 || !archive.gangs || typeof archive.gangs !== 'object')
      return { applied: false, reason: 'archive-unreadable' };
    // Read through the adapters so their in-session fallback state is saved too.
    const currentStory = {
      journey: JSON.stringify(getJourneyProgress()),
      city: JSON.stringify(getCityProgress(getJourneyProgress())),
      contacts: JSON.stringify(getContactProgress()),
      skill: JSON.stringify(getSkillEvidence()),
      blockrun: oldActive.blockrun
    };
    const targetStory = archive.gangs[targetGangID] || null;
    archive.gangs[current.gangID] = currentStory;
    // Archive first. A failed write leaves the active story untouched.
    localStorage.setItem(archiveName, JSON.stringify(archive));
    try {
      writeSnapshot(keys, targetStory);
      const next = { ...current, gangID: targetGangID, chosenAt: Date.now(), onboardingComplete: true };
      if (!saveWindowState(next)) throw new Error('window-save-failed');
      clearCityProgressCache();clearContactProgressCache();
      return { applied: true, restored: !!targetStory, state: getWindowState() };
    } catch (error) {
      try {
        writeSnapshot(keys, oldActive);
        if (oldArchive === null) localStorage.removeItem(archiveName);
        else localStorage.setItem(archiveName, oldArchive);
        saveWindowState(current);
      } catch (rollbackError) { console.warn('[Crew] Story restore could not roll back', rollbackError); }
      console.warn('[Crew] Story switch could not be saved', error);
      return { applied: false, reason: 'save-failed' };
    }
  } catch (error) {
    console.warn('[Crew] Story switch could not start', error);
    return { applied: false, reason: 'storage-unavailable' };
  }
}
