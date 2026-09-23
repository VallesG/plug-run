// Device-local, account-scoped record of which contact beats have been shown.
// Separate key from journey, window and rivals state on purpose: a contact
// beat is presentation, and losing it must never touch progression or Cash.
import { createContactProgress, contactShown, markContactShown, completeCrewStory } from '../logic/contactProgress.js';
import { getUserID } from './userManager.js';

const key = () => 'pr_contacts_v1_' + getUserID();
const volatile = new Map();
export function clearContactProgressCache() { volatile.delete(key()); }
const save = state => {
  const account = key();
  try { localStorage.setItem(account, JSON.stringify(state)); volatile.delete(account); }
  catch (error) { volatile.set(account, state); console.warn('[Contacts] Progress could not be saved', error); }
};

export function getContactProgress() {
  if (volatile.has(key())) return createContactProgress(volatile.get(key()));
  try {
    const stored = JSON.parse(localStorage.getItem(key()) || 'null');
    return createContactProgress(stored?.version === 1 ? stored : {});
  } catch { return createContactProgress(); }
}

export function hasSeenContact(eventID) {
  return contactShown(getContactProgress(), eventID);
}

/**
 * Claim a beat. Returns true only for the call that actually claimed it, so a
 * caller can use it as the gate for showing the panel at all.
 *
 * A storage failure returns true rather than false: the panel then shows once
 * this session and simply is not remembered, which is better than either
 * silently skipping the contact or looping it on every entrance.
 */
export function claimContact(eventID, blockIndex) {
  const result = markContactShown(getContactProgress(), eventID, blockIndex);
  if (!result.applied) return false;
  save(result.state);
  return true;
}

/** Successful final extraction only. No rewards; story is persisted with contact beats. */
export function finishCrewStory(gangID, blockIndex, clearedHouses) {
  const result = completeCrewStory(getContactProgress(), { gangID, blockIndex, clearedHouses });
  if (result.applied) save(result.state);
  return result;
}
