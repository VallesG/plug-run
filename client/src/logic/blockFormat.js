// The shape of a run: how many maps, and where the teeth are.
//
// One source of truth, because these numbers were scattered as literals and
// the most consequential one — "round 8" — turned out to be the single worst
// thing in the game.
//
// WHAT THE DATA SAID
// A 227-run sweep at fixed skill, per-map clear rate:
//
//   rounds 1-7    50%     one plug
//   rounds 8-14   17%     two plugs, and defender2 takes 56-76% of the kills
//   rounds 15-24   4%
//   rounds 25+     0%     last clear anywhere was round 23
//
// The collapse is not the difficulty curve, it is the second plug. Rounds 1-7
// slope gently (61% -> 55%); round 8 falls off a table, and the character of
// the deaths changes with it — 67% of deaths on rounds 1-7 happen CARRYING the
// stash, which is the late-flip drama the game is for. From round 8, 71% never
// reach the stash at all. That is a gate, not tension.
//
// So the second plug stops being a difficulty step and becomes the finale: one
// map, at the end, where the run is already won or lost and the stakes are
// obvious. Everything before it is the game that measured well.

/** Maps in a daily PvE block. Long enough that scores actually spread. */
export const PVE_BLOCK_MAPS = 15;

/** Maps in a PvP block. Shorter — it is a race, and it is played repeatedly. */
export const PVP_BLOCK_MAPS = 7;

/**
 * The map on which the second opponent appears, 1-based.
 *
 * Only the last one. It used to be every map from 8 onward, which is where
 * the game stopped being winnable.
 */
export function dualOpponentMap(blockMaps = PVE_BLOCK_MAPS) {
  return blockMaps;
}

/** Does this map in the block carry the second opponent? */
export function hasDualOpponent(mapIndex, blockMaps = PVE_BLOCK_MAPS) {
  return mapIndex >= dualOpponentMap(blockMaps);
}

/**
 * Is the block finished after clearing this map?
 *
 * The ladder used to be endless, which the data says is a fiction: nothing
 * cleared past round 23. A run that ends is a run that can be scored, shared
 * and beaten tomorrow.
 */
export function isBlockComplete(mapIndex, blockMaps = PVE_BLOCK_MAPS) {
  return mapIndex >= blockMaps;
}
