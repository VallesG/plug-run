import { CREW_STORIES, crewChapter, crewConsultationPages } from '../src/logic/crewStory.js';
import { createContactProgress, markContactShown, crewStoryProgress, completeCrewStory } from '../src/logic/contactProgress.js';
import { gangContacts, contactCue, CONTACT_BEATS, contactPanelLayout, contactDialoguePages } from '../src/logic/contacts.js';

let passed = 0;
function check(name, ok) { if (!ok) throw Error(name); passed++; }
const gangs = ['crossline', 'iron-row', 'afterlight'];
check('exactly the approved three crews', Object.keys(CREW_STORIES).join(',') === gangs.join(','));
check('unknown crew has no fiction', crewChapter('nope') === null);
check('old v1 records migrate with no invented completions', Object.keys(createContactProgress({ version: 1, blocks: { 1: ['old'] } }).stories).length === 0);
check('invalid stories discarded', Object.keys(createContactProgress({ stories: { crossline: { chapter: -1, lastBlock: 'x' } } }).stories).length === 0);
check('empty dialogue is still drawable', contactDialoguePages('', 280, 480).length === 1);
for (const gangID of gangs) {
  let state = createContactProgress();
  const original = JSON.stringify(state);
  for (const clearedHouses of [undefined, null, '15', 0, 1, 7, 14, 16, NaN]) {
    const result = completeCrewStory(state, { gangID, blockIndex: 1, clearedHouses });
    check('unfinished block refuses story advance ' + gangID + '/' + clearedHouses, !result.applied && crewStoryProgress(result.state, gangID).chapter === 0);
  }
  let result = completeCrewStory(state, { gangID, blockIndex: 1, clearedHouses: 15 });
  check('exact fifteen advances one chapter ' + gangID, result.applied && crewStoryProgress(result.state, gangID).chapter === 1);
  check('input state is immutable ' + gangID, JSON.stringify(state) === original);
  state = result.state;
  result = completeCrewStory(state, { gangID, blockIndex: 1, clearedHouses: 15 });
  check('same block never advances twice ' + gangID, !result.applied && crewStoryProgress(result.state, gangID).chapter === 1);
  for (let block = 2; block <= 220; block++) {
    state = completeCrewStory(state, { gangID, blockIndex: block, clearedHouses: 15 }).state;
    state = markContactShown(state, 'beat/' + block, block).state;
  }
  const revived = createContactProgress(JSON.parse(JSON.stringify(state)));
  check('chapter survives JSON and pruning beyond 200 entries ' + gangID, crewStoryProgress(revived, gangID).chapter === 220 && Object.keys(revived.blocks).length === 2);
  check('old completion still cannot be re-claimed ' + gangID, !completeCrewStory(revived, { gangID, blockIndex: 1, clearedHouses: 15 }).applied);
  check('another crew starts independently ' + gangID, crewStoryProgress(revived, gangs.find(g => g !== gangID)).chapter === 0);
  check('six authored chapters ' + gangID, CREW_STORIES[gangID].chapters.length === 6);
  check('chapters do not repeat openings ' + gangID, new Set(CREW_STORIES[gangID].chapters.map(c => c[1])).size === 6);
  const pair = gangContacts(gangID);
  for (const chapter of [0, 1, 2, 3, 4, 5, 6, 219]) {
    const story = crewChapter(gangID, chapter);
    check('stable chapter identity ' + gangID + '/' + chapter, story.number === chapter + 1 && JSON.stringify(story) === JSON.stringify(crewChapter(gangID, chapter)));
    const texts = [story.context, story.goal, story.primaryFinish, story.secondaryFinish];
    check('no Cash or imaginary competitive result ' + gangID + '/' + chapter, texts.every(text => !/cash|credit|won the race|first place|ahead of your rival/i.test(text)));
    for (const beat of CONTACT_BEATS) {
      const cue = contactCue({ gangID, house: beat.house, blockIndex: 1 });
      const pages = crewConsultationPages(gangID, chapter, beat.id, cue.text);
      check('mission and earned praise unchanged ' + gangID + '/' + chapter + '/' + beat.id, beat.id === 'open' || pages[0] === cue.text);
      texts.push(...pages);
    }
    check('dialogue uses plain stash/bag vocabulary ' + gangID + '/' + chapter,
      texts.every(text => !/real (?:stash|bag)/i.test(text)));
    for (const [w, h] of [[280,480],[320,568],[390,844],[414,896],[768,1024],[1440,900]]) {
      for (const text of texts) {
        const pages = contactDialoguePages(text, w, h);
        check('paging preserves every word ' + gangID + '/' + chapter + '/' + w, pages.join(' ') === text);
        for (const page of pages) {
          const a = contactPanelLayout(w, h, pair.primary, page);
          const bottom = a.dialogue.y - a.dialogue.h / 2 + a.dialogue.copyTop + a.dialogue.lines * a.dialogue.lineHeight;
          check('every story page clears advance ' + gangID + '/' + chapter + '/' + w, bottom <= a.action.y - a.action.h / 2 + 0.001);
        }
      }
    }
  }
}
check('invalid block never advances', !completeCrewStory({}, { gangID: 'crossline', blockIndex: 0, clearedHouses: 15 }).applied);
check('unknown gang never advances', !completeCrewStory({}, { gangID: 'nope', blockIndex: 1, clearedHouses: 15 }).applied);
check('overflow is refused', !completeCrewStory({ stories: { crossline: { chapter: Number.MAX_SAFE_INTEGER, lastBlock: 1 } } }, { gangID: 'crossline', blockIndex: 2, clearedHouses: 15 }).applied);
console.log(passed + ' crew story assertions passed');
