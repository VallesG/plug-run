import { rivalElapsed, rivalProgress } from './rivals.js';

export const RIVAL_ANNOUNCER_COUNTS = [3, 3, 3, 3, 3, 2, 3];
export const RIVAL_ANNOUNCER_KEYS = [
  'br_countdown_3', 'br_countdown_2', 'br_countdown_1', 'br_go',
  ...RIVAL_ANNOUNCER_COUNTS.flatMap((count, i) =>
    Array.from({ length: count }, (_, variant) => `br_opponent_house_${i + 1}_${variant + 1}`))
];

// Session-only variety; race progress lives on the race and survives house restarts.
const lastVariants = new Map();
export function nextRivalAnnouncement(race, now, random = Math.random) {
  const state = race.announcerState ??= { countdown: 4, cleared: 0 };
  if (race.status === 'countdown') {
    const step = Math.max(0, Math.ceil((race.countdownEndsAt - now) / 1000));
    if (step > 3 || step >= state.countdown) return null;
    state.countdown = step;
    return step === 0 ? 'br_go' : `br_countdown_${step}`;
  }
  if (race.status !== 'racing') return null;
  const cleared = Math.min(7, rivalProgress(race.rivalTimes, rivalElapsed(race, now)));
  if (cleared <= state.cleared) return null;
  state.cleared = cleared;
  const variants = Array.from({ length: RIVAL_ANNOUNCER_COUNTS[cleared - 1] }, (_, i) => i + 1)
    .filter(i => i !== lastVariants.get(cleared));
  const variant = variants[Math.min(variants.length - 1, Math.floor(random() * variants.length))];
  lastVariants.set(cleared, variant);
  // On a late/backgrounded frame announce only the latest cleared house.
  return `br_opponent_house_${cleared}_${variant}`;
}
