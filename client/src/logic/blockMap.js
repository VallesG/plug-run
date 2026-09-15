// The block map — a street of houses, one per map, lighting up as you clear
// them. Pure layout and state; the drawing lives in controllers/BlockMap.js.
//
// WHY
// Between maps the game showed a blank "ROUND N / Continue" modal (with a
// comment that it would be an ad slot later). That is the moment a daily
// needs a picture of progress: which houses are lit, which is next, and the
// big one at the end of the street where the second plug waits. It is also
// the image a finished night can be shared as — "12 of 15 lit".
//
// Houses past the furthest one reached are dark silhouettes, the way an
// unexplored region is fog on a world map. The finale is drawn bigger and
// carries a tell, so by night three you know what the end of the street means.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * State of house i (1-based) given how many maps are cleared.
 *   lit    cleared
 *   next   the one about to be played
 *   dark   not reached yet
 * The last house is the finale and gets a 'finale-' prefix on the same states.
 */
export function houseState(i, cleared, maps) {
  const c = clamp(cleared | 0, 0, maps);
  const base = i <= c ? 'lit' : (i === c + 1 ? 'next' : 'dark');
  return i === maps ? `finale-${base}` : base;
}

/**
 * Lay the street out across `width` px starting at `x0`.
 *
 * Every house gets an equal slot; the finale takes most of its slot, the rest
 * take about two thirds so there is street between them. Heights are in px
 * and deliberately small: this draws inside a modal, above the buttons.
 */
export function layoutBlock({ maps = 15, cleared = 0, width, x0 = 0, baseY = 0 }) {
  const c = clamp(cleared | 0, 0, maps);
  const slot = width / maps;
  const houses = [];
  for (let i = 1; i <= maps; i++) {
    const finale = i === maps;
    const w = finale ? slot * 0.95 : slot * 0.66;
    const h = finale ? 30 : 22;
    houses.push({
      index: i,
      state: houseState(i, c, maps),
      finale,
      x: x0 + slot * (i - 0.5),   // centre
      w, h,
      baseY                        // where it stands (bottom edge)
    });
  }
  return { houses, slot, cleared: c, maps };
}
