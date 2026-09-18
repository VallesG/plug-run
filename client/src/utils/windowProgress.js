import { createWindowState, chooseWindowGang, markWindowVisit } from '../logic/window.js';
import { getUserID } from './userManager.js';

const key = () => 'pr_window_v1_' + getUserID();

export function getWindowState() {
  try {
    const stored = JSON.parse(localStorage.getItem(key()) || 'null');
    return createWindowState(stored?.version === 1 ? stored : {});
  } catch {
    return createWindowState();
  }
}

export function saveWindowState(value) {
  const state = createWindowState(value);
  try {
    localStorage.setItem(key(), JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn('[Window] State could not be saved', error);
    return false;
  }
}

export function hasWindowOnboarding() {
  const state = getWindowState();
  return Boolean(state.onboardingComplete && state.gangID);
}

export function selectWindowGang(gangID, at = Date.now()) {
  const result = chooseWindowGang(getWindowState(), gangID, at);
  if (result.applied && !saveWindowState(result.state)) {
    return { ...result, applied: false, reason: 'save-failed' };
  }
  return result;
}

export function recordWindowVisit(routeID) {
  const result = markWindowVisit(getWindowState(), routeID);
  if (result.applied) saveWindowState(result.state);
  return result.state;
}
