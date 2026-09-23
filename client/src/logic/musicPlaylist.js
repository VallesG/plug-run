export const GAMEPLAY_BEATS = Object.freeze(['bg_main', 'bg_plug', 'bg_learn', 'bg_beat4', 'bg_beat5', 'bg_beat6']);

// Presentation randomness only: never consume the course/AI seeded RNG.
export function selectBeat(previous, context, available, random = Math.random) {
  const keys = [...new Set(available)].filter(key => GAMEPLAY_BEATS.includes(key));
  if (!keys.length) return previous || null;
  if (previous?.context === context && keys.includes(previous.key)) return previous;
  let bag = (previous?.bag || []).filter(key => keys.includes(key));
  if (!bag.length) {
    bag = [...keys];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  if (bag.length > 1 && bag[0] === previous?.key) [bag[0], bag[1]] = [bag[1], bag[0]];
  return { context, key: bag[0], bag: bag.slice(1) };
}

// Tiny original D-minor earcons, synthesized locally; no downloaded samples.
export function momentNotes(kind) {
  const frequencies = kind === 'city' ? [293.66, 349.23, 440, 587.33, 698.46]
    : kind === 'block' ? [293.66, 349.23, 440, 587.33] : [587.33, 440];
  return frequencies.map((hz, i) => ({ hz, delay: i * (kind === 'contact' ? 0.055 : 0.11),
    duration: kind === 'contact' ? 0.09 : (i === frequencies.length - 1 ? 0.55 : 0.22),
    volume: kind === 'contact' ? 0.045 : 0.14 }));
}
