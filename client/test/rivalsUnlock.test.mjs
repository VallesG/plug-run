// The unlock, against the real menu helper: legacy saves, partial progress and
// the difference between opening the first block and finishing it.
import { readFileSync } from 'node:fs';
import { rivalsUnlocked, rivalsUnlockProgress } from '../src/logic/rivalSkill.js';
import { createSkillEvidence, recordHouseObservation, skillCoverage } from '../src/logic/skillEvidence.js';

let passed = 0;
function check(name, ok) { if (!ok) throw new Error(name); passed++; }

const source = readFileSync(new URL('../src/utils/rivalsUnlock.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\s*/gm, '')
  .replace(/^export /gm, '');
let journey = { blockIndex: 1, pveRound: 1 };
let coverage = skillCoverage(createSkillEvidence());
let coverageThrows = false;
const bindings = {
  rivalsUnlocked, rivalsUnlockProgress,
  getSkillCoverage: () => { if (coverageThrows) throw new Error('storage gone'); return coverage; },
  getJourneyProgress: () => journey
};
const mod = new Function(...Object.keys(bindings),
  source + '\nreturn { rivalsMenuState, campaignStashes };')(...Object.values(bindings));

const full = blocks => {
  let ev = createSkillEvidence();
  for (let b = 1; b <= blocks; b++) {
    for (let h = 1; h <= 15; h++) {
      ev = recordHouseObservation(ev, { block: b, house: h, activeMs: 25_000, totalActiveMs: 25_000, attempts: 1, at: 1 }).state;
    }
  }
  return skillCoverage(ev);
};

// Block Rivals is open from the start: every save, any progress, even lost evidence.
check('a brand new player can race', mod.rivalsMenuState().unlocked === true);
journey = { blockIndex: 1, pveRound: 5 };
coverage = full(0);
check('partway through block one: open', mod.rivalsMenuState().unlocked === true);
check('stashes are still counted from the campaign', mod.campaignStashes() === 4);
coverageThrows = true;
check('lost evidence: still open', mod.rivalsMenuState().unlocked === true);
coverageThrows = false;

// The menu wires the locked row without making it clickable.
const menu = readFileSync(new URL('../src/scenes/MenuScene.js', import.meta.url), 'utf8');
check('the menu asks the unlock helper', menu.includes('rivalsMenuState()'));
check('the row is built locked when it should be', /makeTitleOption\('Block Rivals'[\s\S]{0,220}progressText\)/.test(menu));
check('a locked row registers no click handler', /if \(!locked\) \{[\s\S]{0,260}pointerup/.test(menu));
check('a locked row is still drawn', menu.includes("c._locked = true"));
console.log(passed + ' rivals unlock assertions passed');
