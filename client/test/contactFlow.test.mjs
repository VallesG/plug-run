// The entrance seam: who speaks, once, and what must never trigger one.
// Exercises the real ProgressionManager source against a stub scene, the same
// way the Rivals adapter is tested — no Phaser, no browser, no storage.
import { readFileSync } from 'node:fs';
import { gangContacts, contactCue, CONTACT_BEATS } from '../src/logic/contacts.js';
import {
  createContactProgress, contactShown, markContactShown, contactsSeenInBlock,
  praiseUsedInBlock, praiseMark, crewStoryProgress, completeCrewStory, CONTACT_PROGRESS_BLOCKS
} from '../src/logic/contactProgress.js';
import { crewChapter, crewConsultationPages } from '../src/logic/crewStory.js';
import { blockRunStats, createBlockRun, recordHouseClear } from '../src/logic/blockRun.js';

let blockStats = blockRunStats(createBlockRun({}, 1), 1);

let passed = 0;
function check(name, ok) { if (!ok) throw new Error(name); passed++; }

// --- the pure record ------------------------------------------------------
let progress = createContactProgress();
check('empty progress is valid', progress.version === 1 && Object.keys(progress.blocks).length === 0);
check('garbage in, empty out',
  Object.keys(createContactProgress(null).blocks).length === 0 &&
  Object.keys(createContactProgress({ blocks: 'nope' }).blocks).length === 0 &&
  Object.keys(createContactProgress({ blocks: { 0: ['a'], x: ['b'] } }).blocks).length === 0);
const first = markContactShown(progress, 'contact/v1/block-1/checkin-1/switch', 1);
check('a beat can be claimed', first.applied && contactShown(first.state, 'contact/v1/block-1/checkin-1/switch'));
check('claiming twice is a no-op',
  markContactShown(first.state, 'contact/v1/block-1/checkin-1/switch', 1).applied === false);
check('a different beat still claims',
  markContactShown(first.state, 'contact/v1/block-1/tease/switch', 1).applied === true);
check('empty id refused', markContactShown(progress, '', 1).applied === false && markContactShown(progress, null, 1).applied === false);
check('unknown beat is not shown', !contactShown(first.state, 'contact/v1/block-1/tease/switch'));
check('record is immutable', Object.keys(progress.blocks).length === 0);

// Pruning must never drop something the player could still be shown.
let walked = createContactProgress();
for (let block = 1; block <= 12; block++) {
  for (const beat of CONTACT_BEATS) {
    walked = markContactShown(walked, 'contact/v1/block-' + block + '/' + beat.id + '/switch', block).state;
  }
}
check('record stays bounded', Object.keys(walked.blocks).length === CONTACT_PROGRESS_BLOCKS);
check('the current block is remembered in full',
  contactsSeenInBlock(walked, 12).length === CONTACT_BEATS.length);
check('the previous block is remembered too',
  contactsSeenInBlock(walked, 11).length === CONTACT_BEATS.length);
check('current-block beats cannot replay',
  CONTACT_BEATS.every(b => contactShown(walked, 'contact/v1/block-12/' + b.id + '/switch')));
check('a far older block is forgotten, and can only be re-entered as a new block',
  !contactShown(walked, 'contact/v1/block-1/checkin-1/switch'));
check('round-trip through JSON survives', (() => {
  const revived = createContactProgress(JSON.parse(JSON.stringify(walked)));
  return CONTACT_BEATS.every(b => contactShown(revived, 'contact/v1/block-12/' + b.id + '/switch'));
})());

// --- the entrance seam ----------------------------------------------------
const source = readFileSync(new URL('../src/controllers/ProgressionManager.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\s*/gm, '')
  .replace('export default class', 'class');

let store = createContactProgress();
let gangID = 'crossline';
let shownPanels = [];
let panelFailure = false;
const bindings = {
  contactCue, gangContacts, crewChapter, crewConsultationPages, crewStoryProgress,
  finishCrewStory: (id, block, cleared) => {
    const result = completeCrewStory(store, { gangID: id, blockIndex: block, clearedHouses: cleared });
    store = result.state;
    return result;
  },
  praiseUsedInBlock, praiseMark,
  getBlockRunStats: () => blockStats,
  noteHouseClear: () => true, noteBlockDeath: () => true, noteMissionOutcome: () => true,
  getContactProgress: () => store,
  getWindowState: () => ({ gangID }),
  claimContact: (id, block) => {
    const result = markContactShown(store, id, block);
    store = result.state;
    return result.applied;
  },
  showContactPanel: (scene, cue, onDone) => {
    if (panelFailure) throw new Error('boom');
    shownPanels.push(cue);
    return { advance: onDone, close: () => {} };
  },
  // Everything else the class closes over but this path never reaches.
  advanceJourney: x => x, saveJourneyProgress: () => true, RepTracker: class {},
  getCurrentRouteID: () => 1, getRouteSeed: () => 1, submitScore: async () => {},
  submitAllTimeScore: async () => {}, ReplaySystem: { finalize() {}, hasReplay: () => false, play() {} },
  isBlockComplete: () => false, PVE_BLOCK_MAPS: 15, drawBlockMap: () => {},
  SESSION_RULES: {}, streakBonus: () => 0, getCurrentUser: () => ({}), updateUserStats: () => {},
  rectsOverlap: () => false, overlaps: () => false, trackGameStart: () => {},
  trackRoundComplete: () => {}, trackGameOver: () => {}, logRunnerExtract: () => {}, logPlugStop: () => {},
  saveSessionState: () => true, clearSessionState: () => {}, getSessionState: () => null,
  updateRouteProgress: () => {}, recordRoundCompletion: () => {}, hasUsedSpawnSwap: () => false,
  markSpawnSwapUsed: () => {}, getTopScores: async () => [], inv: {}, saveInv: () => {}, loadInv: () => {},
  isPremiumUser: () => false, getCurrentRouteProgress: () => ({}), getCurrentUserSync: () => ({})
};
const Manager = new Function(...Object.keys(bindings), source + '\nreturn ProgressionManager;')(...Object.values(bindings));

function seam({ runKind = 'journey', role = 'runner', house = 4, blockIndex = 1 } = {}) {
  const scene = { runKind, role, pveRound: house, blockIndex };
  const manager = new Manager(scene);
  let entered = 0;
  const result = manager.showContactCheckIn(() => { entered++; });
  return { entered: () => entered, result, scene };
}

// The block opens with the primary asking for the job.
shownPanels = [];
let run = seam({ house: 1 });
check('the primary opens the block', shownPanels.length === 1 && shownPanels[0].beat.kind === 'open');
check('the opener waits for a tap', run.entered() === 0);
run.result.advance();
shownPanels = [];
check('the opener does not repeat', (seam({ house: 1 }), shownPanels.length === 0));

// A beat house, with a gang: the contact speaks and the house waits.
shownPanels = [];
run = seam({ house: 4 });
check('a check-in appears at house four', shownPanels.length === 1 && run.entered() === 0);
check('the check-in is the gang primary', shownPanels[0].contact.name === 'Switch');
check('the house starts when the panel advances',
  (shownPanels[0] && run.result.advance(), run.entered() === 1));

// Same beat again: a retry, a resize restart, a second entrance.
shownPanels = [];
run = seam({ house: 4 });
check('a retry does not repeat the line', shownPanels.length === 0);
check('a retry still enters the house', run.entered() === 1);

// Later beats still fire.
shownPanels = [];
run = seam({ house: 7 });
check('the tease still arrives at house seven', shownPanels.length === 1 && shownPanels[0].beat.kind === 'tease');
run.result.advance();
shownPanels = [];
run = seam({ house: 9 });
check('the job contact briefs at the target house',
  shownPanels.length === 1 && shownPanels[0].contact.name === 'Mags' && shownPanels[0].beat.kind === 'brief');
run.result.advance();

// Quiet houses, other modes, no gang, other roles.
for (const house of [2, 3, 5, 6, 8, 11, 12, 14, 15]) {
  shownPanels = [];
  run = seam({ house });
  check('house ' + house + ' is quiet', shownPanels.length === 0 && run.entered() === 1);
}
for (const runKind of ['rivals', 'daily', 'tutorial', null, '']) {
  shownPanels = [];
  run = seam({ runKind, house: 13 });
  check('no contact in ' + runKind, shownPanels.length === 0 && run.entered() === 1);
}
shownPanels = [];
run = seam({ role: 'plug', house: 13 });
check('no contact for the shelved plug role', shownPanels.length === 0 && run.entered() === 1);
gangID = null;
shownPanels = [];
run = seam({ house: 13 });
check('no contact before a gang is chosen', shownPanels.length === 0 && run.entered() === 1);
gangID = 'nonsense';
run = seam({ house: 13 });
check('no contact for an unknown gang', shownPanels.length === 0 && run.entered() === 1);

// A new block speaks again, because it is a different block.
gangID = 'iron-row';
shownPanels = [];
run = seam({ house: 4, blockIndex: 2 });
check('a new block gets its own check-in', shownPanels.length === 1);
check('the new gang speaks', shownPanels[0].contact.name === 'Brick');
run.result.advance();

// Failure must never trap the player between houses.
panelFailure = true;
shownPanels = [];
const warn = console.warn; console.warn = () => {};
run = seam({ house: 7, blockIndex: 2 });
check('a broken panel still enters the house', run.entered() === 1 && shownPanels.length === 0);
console.warn = warn;
panelFailure = false;
gangID = 'afterlight';
shownPanels = [];
run = seam({ house: 9, blockIndex: 3 });
check('the third gang briefs too', shownPanels.length === 1 && shownPanels[0].contact.name === 'Sol');
check('every cue carries a page-turn advance', shownPanels[0].action.endsWith('>>'));

// --- the compliment is earned, and spent ----------------------------------
gangID = 'crossline';
store = createContactProgress();
let real = createBlockRun({}, 7);
for (const house of [1, 2, 3]) real = recordHouseClear(real, 7, { house, powers: ['phase'] }).state;
blockStats = blockRunStats(real, 7);
shownPanels = [];
run = seam({ house: 4, blockIndex: 7 });
check('a clean block is complimented for being clean',
  shownPanels.length === 1 && shownPanels[0].praiseKey === 'flawless');
check('the compliment is recorded, not just the beat',
  praiseUsedInBlock(store, 7).includes('flawless'));
run.result.advance();
shownPanels = [];
run = seam({ house: 10, blockIndex: 7 });
check('the next check-in finds something else to say',
  shownPanels.length === 1 && shownPanels[0].praiseKey !== 'flawless');
check('and it is still true of the run', ['noPowers', 'phase', 'noDeaths'].includes(shownPanels[0].praiseKey));
run.result.advance();
shownPanels = [];
run = seam({ house: 13, blockIndex: 7 });
check('a third beat says a third thing',
  shownPanels.length === 1 && !['flawless'].includes(shownPanels[0].praiseKey));
check('nothing in the block was said twice',
  new Set(praiseUsedInBlock(store, 7)).size === praiseUsedInBlock(store, 7).length);
check('praise marks never collide with beat ids',
  praiseUsedInBlock(store, 7).every(k => !k.includes('/')));


// --- consult BEFORE the exterior map, including the very first house -------
store = createContactProgress();
gangID = 'crossline';
shownPanels = [];
let loadouts = 0;
const order = [];
const firstScene = { runKind: 'journey', role: 'runner', pveRound: 1, blockIndex: 21,
  gameUI: { showModal: config => { order.push('map'); return { config }; } }
};
const firstManager = new Manager(firstScene);
const opener = firstManager.showBlockMap(() => { loadouts++; order.push('loadout'); });
check('opening consultation waits before creating the map', shownPanels.length === 1 && order.length === 0);
check('opening is fleshed out in short pages', shownPanels[0].pages.length === 2);
opener.advance();
check('map appears only after the opening conversation', order.join(',') === 'map' && loadouts === 0);
firstScene.gameUI.currentModal.config.buttons[0].onClick();
check('enter-house proceeds directly to loadout, no second contact', order.join(',') === 'map,loadout' && shownPanels.length === 1);
shownPanels = [];
order.length = 0;
firstManager.showBlockMap(() => loadouts++);
check('retry goes straight to map without replaying the consultation', order.join(',') === 'map' && shownPanels.length === 0);

// The ordered Journey final extraction is the only story-writing seam.
store = createContactProgress();
const winnerScene = { runKind: 'journey', role: 'runner', pveRound: 14, blockIndex: 30 };
const winner = new Manager(winnerScene);
winner.noteHouseForContacts();
check('fourteen clears never advance story', crewStoryProgress(store, gangID).chapter === 0);
winnerScene.pveRound = 15;
winner.noteHouseForContacts();
check('fifteenth successful extraction advances story once', crewStoryProgress(store, gangID).chapter === 1);
winner.noteHouseForContacts();
check('duplicate final extraction does not advance twice', crewStoryProgress(store, gangID).chapter === 1);
shownPanels = [];
let results = 0;
winner.showBlockCompleteResult = () => { results++; };
const curtain = winner.showBlockComplete();
check('both crew contacts appear at block completion', shownPanels.length === 1 && shownPanels[0].contacts.map(c => c.id).join(',') === 'switch,mags');
check('completion speaks the chapter just earned, not the next', shownPanels[0].chapterLabel.includes('CHAPTER 1 COMPLETE'));
check('result waits for celebration', results === 0);
curtain.advance();
check('celebration returns to intact finish result', results === 1);
winner.showBlockComplete();
check('duplicate finish rendering is quiet and never grants anything', shownPanels.length === 1 && results === 2 && crewStoryProgress(store, gangID).chapter === 1);
winnerScene.pveRound = 1;
winnerScene.blockIndex = 31;
shownPanels = [];
winner.showContactCheckIn(() => {});
check('next block consults the new chapter', shownPanels[0].chapterLabel.includes('CHAPTER 2'));

for (const runKind of ['rivals', 'daily', 'tutorial']) {
  const excluded = new Manager({ runKind, role: 'runner', pveRound: 15, blockIndex: 31 });
  excluded.noteHouseForContacts();
  check(runKind + ' cannot advance crew story', crewStoryProgress(store, gangID).chapter === 1);
}
const silent = new Manager({ runKind: 'journey', role: 'plug', pveRound: 15, blockIndex: 31 });
silent.noteHouseForContacts();
check('plug cannot advance crew story', crewStoryProgress(store, gangID).chapter === 1);

console.log(passed + ' contact flow assertions passed');
