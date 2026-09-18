// Is Block Rivals open yet, and what does the locked row say?
//
// Three complete campaign blocks — forty-five extracted stashes — not three
// blocks opened and not reaching house three. Two sources are consulted: the
// timing evidence this build records, and the campaign's own long-standing
// stash count, so a save that finished blocks before any of this existed still
// qualifies. Never the other way round: a stash count alone cannot fake blocks
// it did not complete, and an absent record is absent rather than zero.
import { rivalsUnlocked, rivalsUnlockProgress } from '../logic/rivalSkill.js';
import { getSkillCoverage } from './skillEvidence.js';
import { getJourneyProgress } from './journeyProgress.js';

/** Stashes the campaign can prove, from completed blocks plus the current one. */
export function campaignStashes() {
  try {
    const journey = getJourneyProgress();
    const blocks = Math.max(0, (journey.blockIndex || 1) - 1);
    return blocks * 15 + Math.max(0, (journey.pveRound || 1) - 1);
  } catch { return 0; }
}

export function rivalsMenuState() {
  let coverage = null;
  try { coverage = getSkillCoverage(); } catch { coverage = null; }
  const stashes = campaignStashes();
  const unlocked = rivalsUnlocked(coverage, { stashes });
  const progress = rivalsUnlockProgress(coverage, { stashes });
  return { unlocked, coverage, stashes, progress, progressText: progress.text };
}
