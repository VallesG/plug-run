// The "finding a rival" moment, as data. Pure: no Phaser, no clock.
//
// It has to feel like being matched with someone, and it may only say true
// things (test/rivalsCopy.test.mjs): no one is claimed to be online, queued
// or playing now, no population is invented, and nothing about recordings
// reaches the screen. What IS true, and shown:
//   - the course being raced;
//   - that the pick is matched to the player's measured pace (it is:
//     chooseCalibratedOpponent);
//   - the names in the actual pool for this course, cycling as candidates;
//   - how the rival's measured pace compares with the player's estimate.

const hash = (value) => {
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  return (h ^ (h >>> 15)) >>> 0;
};

/** How long the search runs at minimum, varied per match: 2.4-4.2s. */
export function matchSearchMs(salt) {
  return 2400 + (hash('search/' + salt) % 1800);
}

/** The steps shown while searching, in order. */
export function matchSearchSteps(courseName) {
  const course = String(courseName || 'the block').toUpperCase();
  return ['CHECKING ' + course, 'MATCHING YOUR PACE', 'PICKING A RIVAL'];
}

/**
 * The candidate names to cycle through, in a per-match order, never showing
 * the same name twice in a row. Real names from the pool only.
 */
export function matchCarousel(names, salt) {
  const pool = [...new Set((names || []).filter(Boolean).map(String))];
  if (!pool.length) return ['RIVAL'];
  return pool
    .map((n, i) => ({ n, k: hash(salt + '/' + n + '/' + i) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.n);
}

/**
 * The slowing tail that lands the carousel on the pick: intervals growing
 * from ~90ms to ~500ms, like a wheel settling. The last name is the pick.
 */
export function matchLanding(carousel, pick, steps = 8) {
  const names = carousel.length ? carousel : [pick];
  const at = Math.max(0, names.indexOf(pick));
  const out = [];
  let ms = 90;
  for (let i = 0; i < steps; i++) {
    // Walk backwards from the pick, so the sequence ends on it.
    const idx = ((at - (steps - 1 - i)) % names.length + names.length) % names.length;
    out.push({ name: names[idx], ms: Math.round(ms) });
    ms *= 1.27;
  }
  out[out.length - 1].name = pick;
  return out;
}

/**
 * How the rival compares, from measured numbers only: the player's pace
 * estimate and the rival's benchmark on this course's house scales. Null
 * when either is unknown — nothing is shown rather than a guess.
 */
export function matchQuality(playerEstimateMs, rivalBenchmarkMs) {
  if (!(playerEstimateMs > 0) || !(rivalBenchmarkMs > 0)) return null;
  const ratio = rivalBenchmarkMs / playerEstimateMs;
  if (ratio < 0.9) return 'TOUGH RIVAL';
  if (ratio > 1.1) return 'YOU HAVE THE EDGE';
  return 'EVEN MATCH';
}

/** Search clock text, 0:00 onwards. */
export function matchClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
