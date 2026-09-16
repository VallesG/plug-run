// Which contact beats a player has already seen. Pure: no imports, no storage.
//
// WHY THIS IS SHAPED BY BLOCK
// A beat's event ID already carries the block it belongs to, so "seen" is
// naturally a set. Storing it as a flat list would grow forever and then need
// truncation — and truncation is exactly the bug the Cash ledger has, where
// dropping old entries silently un-remembers them. Here the record is grouped
// by block and pruned to the blocks that can still be entered: Run the Block
// only moves forward, so a block two behind the current one can never ask
// again. Nothing a player could still see is ever dropped.
export const CONTACT_PROGRESS_VERSION = 1;
export const CONTACT_PROGRESS_BLOCKS = 2;   // current block and the one before
const MAX_IDS_PER_BLOCK = 24;               // five beats today; room to grow

const intOr = (value, fallback) =>
  Number.isSafeInteger(value) && value > 0 ? value : fallback;
const cleanID = value =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 160) : null;

export function createContactProgress(value = {}) {
  const blocks = {};
  const source = value && typeof value.blocks === 'object' && value.blocks ? value.blocks : {};
  for (const [key, ids] of Object.entries(source)) {
    const block = intOr(Number(key), 0);
    if (!block || !Array.isArray(ids)) continue;
    const clean = [...new Set(ids.map(cleanID).filter(Boolean))].slice(-MAX_IDS_PER_BLOCK);
    if (clean.length) blocks[block] = clean;
  }
  const stories = {};
  for (const gangID of ['crossline', 'iron-row', 'afterlight']) {
    const entry = value?.stories?.[gangID];
    if (!entry || !Number.isSafeInteger(entry.chapter) || entry.chapter < 0 ||
        !Number.isSafeInteger(entry.lastBlock) || entry.lastBlock < 0) continue;
    stories[gangID] = { chapter: entry.chapter, lastBlock: entry.lastBlock };
  }
  return { version: CONTACT_PROGRESS_VERSION, blocks, stories };
}

export function contactShown(value, eventID) {
  const id = cleanID(eventID);
  if (!id) return false;
  const state = createContactProgress(value);
  return Object.values(state.blocks).some(ids => ids.includes(id));
}

/**
 * Record a beat as seen.
 *
 * Pruning happens on write, keyed to the block being written, so the record
 * follows the player forward instead of growing. `applied` is false when the
 * beat was already recorded, which is what makes a second call — a retry, a
 * resize restart, a duplicate callback — a no-op rather than a replay.
 */
export function markContactShown(value, eventID, blockIndex = 1) {
  const state = createContactProgress(value);
  const id = cleanID(eventID);
  const block = intOr(blockIndex, 1);
  if (!id) return { state, applied: false, reason: 'invalid-id' };
  if (contactShown(state, id)) return { state, applied: false, reason: 'already-shown' };
  const blocks = { ...state.blocks, [block]: [...(state.blocks[block] || []), id].slice(-MAX_IDS_PER_BLOCK) };
  const keep = Object.keys(blocks)
    .map(Number)
    .sort((a, b) => b - a)
    .slice(0, Math.max(CONTACT_PROGRESS_BLOCKS, 1));
  const pruned = {};
  for (const b of keep) pruned[b] = blocks[b];
  return { state: { ...state, blocks: pruned }, applied: true, reason: null };
}

/**
 * Praise variants already spoken in a block. Stored in the same bucket with a
 * `praise:` prefix, which no beat ID can collide with, so remembering what a
 * contact already said costs no second record and prunes with the first.
 */
export function praiseUsedInBlock(value, blockIndex) {
  return contactsSeenInBlock(value, blockIndex)
    .filter(id => id.startsWith('praise:'))
    .map(id => id.slice(7));
}
export function praiseMark(blockIndex, key) { return 'praise:' + key; }

/** Beats seen in one block, for tests and debugging. Never used to grant anything. */
export function contactsSeenInBlock(value, blockIndex) {
  return createContactProgress(value).blocks[intOr(blockIndex, 1)] || [];
}

/** Independent crew chapters survive beat pruning and old v1 records migrate empty. */
export function crewStoryProgress(value, gangID) {
  return createContactProgress(value).stories[gangID] || { chapter: 0, lastBlock: 0 };
}

/**
 * Called ONLY by the successful final-house extraction seam, never a dialog tap.
 * A monotonic block watermark retains duplicate protection without an event ledger.
 * Cross-device/server accounting is not claimed: this is the existing local account.
 */
export function completeCrewStory(value, { gangID, blockIndex, clearedHouses } = {}) {
  const state = createContactProgress(value);
  if (!['crossline', 'iron-row', 'afterlight'].includes(gangID) ||
      !Number.isSafeInteger(blockIndex) || blockIndex < 1 || clearedHouses !== 15)
    return { state, applied: false, reason: 'unfinished-or-invalid' };
  const previous = crewStoryProgress(state, gangID);
  if (blockIndex <= previous.lastBlock)
    return { state, applied: false, reason: 'already-completed' };
  if (previous.chapter === Number.MAX_SAFE_INTEGER)
    return { state, applied: false, reason: 'chapter-overflow' };
  return {
    state: { ...state, stories: { ...state.stories,
      [gangID]: { chapter: previous.chapter + 1, lastBlock: blockIndex } } },
    applied: true, reason: null
  };
}
