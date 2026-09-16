// Device-local, account-scoped record of how the current block has gone.
// Its own key, separate from journey progression: losing this may only cost a
// contact a better sentence, never a cleared house or a saved checkpoint.
import { createBlockRun, recordHouseClear, recordBlockDeath, recordMissionOutcome, blockRunStats } from '../logic/blockRun.js';
import { getUserID } from './userManager.js';

const key = () => 'pr_blockrun_v1_' + getUserID();

function read(blockIndex) {
  try {
    const stored = JSON.parse(localStorage.getItem(key()) || 'null');
    return createBlockRun(stored, blockIndex);
  } catch { return createBlockRun(null, blockIndex); }
}
function write(state) {
  try { localStorage.setItem(key(), JSON.stringify(state)); return true; }
  catch (error) { console.warn('[BlockRun] Could not save', error); return false; }
}

export function getBlockRunStats(blockIndex) {
  return blockRunStats(read(blockIndex), blockIndex);
}
export function noteHouseClear(blockIndex, house) {
  const result = recordHouseClear(read(blockIndex), blockIndex, house);
  if (result.applied) write(result.state);
  return result.applied;
}
export function noteMissionOutcome(blockIndex, outcome) {
  const result = recordMissionOutcome(read(blockIndex), blockIndex, outcome);
  if (result.applied) write(result.state);
  return result.applied;
}
export function noteBlockDeath(blockIndex) {
  const result = recordBlockDeath(read(blockIndex), blockIndex);
  write(result.state);
  return result.applied;
}
