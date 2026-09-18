// Device-local personal territory, not shared gang standings or trusted scoring.
import { createCityState, beginCityBlock, claimCityBlock, claimCityIntro } from '../logic/city.js';
import { getUserID } from './userManager.js';
const key = () => 'pr_city_v1_' + getUserID();
const volatile = new Map();
function save(state) {
  const account = key();
  try { localStorage.setItem(account, JSON.stringify(state)); volatile.delete(account); return true; }
  catch (error) { volatile.set(account, state); console.warn('[City] Local territory could not be saved', error); return false; }
}
export function getCityProgress(checkpoint = {}) {
  const account = key();
  let value = volatile.get(account);
  if (!value) {
    try { const stored = JSON.parse(localStorage.getItem(account) || 'null'); value = stored?.version === 1 ? stored : {}; }
    catch { value = {}; }
  }
  return createCityState(value, checkpoint);
}
export function startCityBlock(checkpoint, gangID) {
  const result = beginCityBlock(getCityProgress(checkpoint), checkpoint.blockIndex, gangID, checkpoint);
  save(result.state);
  return result.gangID;
}
export function completeCityBlock(event) {
  const result = claimCityBlock(getCityProgress(), event);
  if (result.applied) save(result.state);
  return result;
}

export function startCityIntro(checkpoint) {
  const result = claimCityIntro(getCityProgress(checkpoint), checkpoint);
  if (result.applied) save(result.state);
  return result.applied;
}
