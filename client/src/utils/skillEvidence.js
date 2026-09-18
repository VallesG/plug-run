// Account-scoped campaign timing evidence. Its own key: this is matchmaking
// input, and losing it must never touch progression, stash, REP or territory.
import { createSkillEvidence, recordHouseObservation, skillCoverage, skillSamples } from '../logic/skillEvidence.js';
import { getUserID } from './userManager.js';

const key = () => 'pr_skill_v1_' + getUserID();

export function getSkillEvidence() {
  try {
    const stored = JSON.parse(localStorage.getItem(key()) || 'null');
    return createSkillEvidence(stored?.version === 1 ? stored : {});
  } catch { return createSkillEvidence(); }
}
export function noteHouseObservation(observation) {
  const result = recordHouseObservation(getSkillEvidence(), observation);
  if (!result.applied) return false;
  try { localStorage.setItem(key(), JSON.stringify(result.state)); }
  catch (error) { console.warn('[Skill] Evidence could not be saved', error); }
  return true;
}
export function getSkillCoverage() { return skillCoverage(getSkillEvidence()); }
export function getSkillSamples() { return skillSamples(getSkillEvidence()); }
