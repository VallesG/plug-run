// Device-local, account-scoped record of how the current block has gone.
// Its own key, separate from journey progression: losing this may only cost a
// contact a better sentence, never a cleared house or a saved checkpoint.
import { createBlockRun, beginBlockRun, recordHouseClear, recordBlockDeath, recordMissionOutcome, blockRunStats } from '../logic/blockRun.js';
import { getUserID } from './userManager.js';

const key = () => 'pr_blockrun_v1_' + getUserID();

function raw() {
  try {
    const text = localStorage.getItem(key());
    if (text === null) return null;
    const value = JSON.parse(text);
    return value && typeof value === 'object' && Number.isSafeInteger(value.blockIndex)
      ? value : { unreadable: true };
  } catch { return { unreadable: true }; }
}
function read(blockIndex) { return createBlockRun(raw(), blockIndex); }
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

/** Called before play, not after a clear; a mid-block resume cannot invent history. */
export function startBlockRunTracking(blockIndex, house) {
  const result = beginBlockRun(raw(), blockIndex, house);
  if (result.applied) write(result.state);
  return result.applied;
}
