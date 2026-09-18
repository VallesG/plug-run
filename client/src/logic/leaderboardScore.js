// How a run becomes one number a sorted set can rank. Pure: no imports.
//
// TWO BOARDS, TWO SHAPES
//   Run the Block — stash is the score, REP breaks ties.
//   Block Rivals  — wins, stacked. Nothing else.
//
// WHY A COMPOSITE AND NOT TWO SETS
// A Redis sorted set ranks by ONE float. The old layout kept stash and REP in
// separate sets, which can rank a player first on one board and twentieth on
// the other and cannot express "stash first, REP only when stash ties". So
// stash and REP are packed into a single score: stash occupies the high part,
// REP the low part, and ordinary numeric descending order gives exactly the
// rule we want.
//
// THE PACKING, AND WHY THESE NUMBERS
// REP is validated to [-2000, 2000], so it is shifted to [0, 4000] to keep the
// low part non-negative — a negative low part would borrow from the stash part
// and rank a player below someone with less stash. REP_SPAN is 10000, safely
// above 4000, so REP can never carry into stash.
//
// Stash is validated to at most round * 500 with round at most 100, i.e.
// 50,000. Worst case score is 50,000 * 10,000 + 4,000 = 500,004,000, far below
// Number.MAX_SAFE_INTEGER (~9.007e15), so every score is exactly representable
// and decoding is lossless. Do not raise the stash or REP caps without
// re-checking that: silent float rounding would corrupt rankings rather than
// fail loudly.
export const REP_OFFSET = 2000;   // matches the backend's MAX_REP
export const REP_SPAN = 10000;    // > 2 * REP_OFFSET, with headroom
export const MAX_PACKED_STASH = 50000;

const int = v => Number.isFinite(v) ? Math.floor(v) : null;

/**
 * Pack a Run the Block result into one rankable score.
 *
 * Returns null rather than a wrong number when the inputs are out of the range
 * the packing can represent. A caller that ignores null and stores garbage
 * would corrupt the board silently, which is worse than a refused submission.
 */
export function packBlockScore(stash, rep) {
  const s = int(stash);
  const r = int(rep);
  if (s === null || r === null) return null;
  if (s < 0 || s > MAX_PACKED_STASH) return null;
  if (r < -REP_OFFSET || r > REP_OFFSET) return null;
  return s * REP_SPAN + (r + REP_OFFSET);
}

/** Recover the stash and REP a packed score was built from. */
export function unpackBlockScore(score) {
  const n = int(score);
  if (n === null || n < 0) return null;
  const stash = Math.floor(n / REP_SPAN);
  const rep = (n % REP_SPAN) - REP_OFFSET;
  return { stash, rep };
}

/**
 * Order two Run the Block entries the way the board does.
 *
 * Exported so the client can sort a locally-held list identically to the
 * server instead of re-deriving the rule and drifting from it.
 */
export function compareBlockEntries(a, b) {
  const sa = packBlockScore(a?.stash, a?.rep) ?? -1;
  const sb = packBlockScore(b?.stash, b?.rep) ?? -1;
  if (sa !== sb) return sb - sa;                 // higher score first
  // A genuine tie on both stash and REP: order by name so the board is stable
  // between reads rather than shuffling on every fetch.
  return String(a?.username ?? '').localeCompare(String(b?.username ?? ''));
}

/**
 * Block Rivals: wins, stacked.
 *
 * A win is worth one and nothing else counts — not elapsed time, not the
 * opponent's band. Losses do not subtract: the board is a tally of what you
 * did, not a rating, so a player who races often is not punished for it.
 */
export const MAX_RIVALS_WINS = 100000;
export function rivalsWinScore(wins) {
  const w = int(wins);
  if (w === null || w < 0 || w > MAX_RIVALS_WINS) return null;
  return w;
}
