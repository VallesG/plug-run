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

// A brand new account.
check('a new player sees a locked row', mod.rivalsMenuState().unlocked === false);
check('and is told how far along they are', mod.rivalsMenuState().progressText === '0 of 1 block run');
check('the row copy is short and in-world',
  mod.rivalsMenuState().progressText.length <= 20 && !/unlock|require|complete the/i.test(mod.rivalsMenuState().progressText));

// Partway through.
journey = { blockIndex: 1, pveRound: 5 };
coverage = full(0);
check('partial first block is still locked', mod.rivalsMenuState().unlocked === false);
check('progress stays at zero until the claim', mod.rivalsMenuState().progressText === '0 of 1 block run');
check('stashes are counted from the campaign', mod.campaignStashes() === 4);

// Reaching the last house of block one is not finishing it.
journey = { blockIndex: 1, pveRound: 15 };
check('opening house fifteen does not unlock', mod.rivalsMenuState().unlocked === false);

// First block claimed.
journey = { blockIndex: 2, pveRound: 1 };
coverage = full(1);
check('one complete block unlocks it', mod.rivalsMenuState().unlocked === true);
check('and fifteen stashes agree', mod.campaignStashes() === 15);

// A legacy save: real completion, no timing evidence at all.
coverage = skillCoverage(createSkillEvidence());
journey = { blockIndex: 2, pveRound: 1 };
check('a legacy save with proven completion qualifies', mod.rivalsMenuState().unlocked === true);
check('its coverage is honestly empty', mod.rivalsMenuState().coverage.observations === 0);
journey = { blockIndex: 1, pveRound: 15 };
check('a legacy save one house short does not', mod.rivalsMenuState().unlocked === false && mod.campaignStashes() === 14);

// Storage failure must not hand out or withhold the unlock wrongly.
coverageThrows = true;
journey = { blockIndex: 2, pveRound: 1 };
check('lost evidence still honours a proven campaign', mod.rivalsMenuState().unlocked === true);
journey = { blockIndex: 1, pveRound: 1 };
check('lost evidence does not invent progress', mod.rivalsMenuState().unlocked === false);
coverageThrows = false;

// The menu wires the locked row without making it clickable.
const menu = readFileSync(new URL('../src/scenes/MenuScene.js', import.meta.url), 'utf8');
check('the menu asks the unlock helper', menu.includes('rivalsMenuState()'));
check('the row is built locked when it should be', /makeTitleOption\('Block Rivals'[\s\S]{0,220}progressText\)/.test(menu));
check('a locked row registers no click handler', /if \(!locked\) \{[\s\S]{0,260}pointerup/.test(menu));
check('a locked row is still drawn', menu.includes("c._locked = true"));
console.log(passed + ' rivals unlock assertions passed');
