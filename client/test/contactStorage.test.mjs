// Real persistence wrapper, including storage denial and account isolation.
import { readFileSync } from 'node:fs';
import { createContactProgress, contactShown, markContactShown, completeCrewStory, crewStoryProgress } from '../src/logic/contactProgress.js';
let passed = 0;
function check(name, ok) { if (!ok) throw Error(name); passed++; }
const source = readFileSync(new URL('../src/utils/contactProgress.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\s*/gm, '').replace(/export function /g, 'function ');
let user = 'one', denied = false;
const records = new Map();
const storage = {
  getItem: key => records.get(key) || null,
  setItem: (key, value) => { if (denied) throw Error('storage denied'); records.set(key, value); }
};
const make = () => new Function('createContactProgress', 'contactShown', 'markContactShown', 'completeCrewStory', 'getUserID', 'localStorage', 'console',
  source + '\nreturn { getContactProgress, claimContact, finishCrewStory };')(
    createContactProgress, contactShown, markContactShown, completeCrewStory, () => user, storage, { warn() {} });
let utils = make();
records.set('pr_contacts_v1_one', JSON.stringify({ version: 1, blocks: { 1: ['old'] } }));
check('old records preserve shown beats', contactShown(utils.getContactProgress(), 'old'));
check('old records invent no chapters', crewStoryProgress(utils.getContactProgress(), 'crossline').chapter === 0);
check('unfinished block writes nothing', !utils.finishCrewStory('crossline', 1, 14).applied && records.size === 1);
check('complete block persists chapter', utils.finishCrewStory('crossline', 1, 15).applied);
utils = make();
check('reload preserves chapter', crewStoryProgress(utils.getContactProgress(), 'crossline').chapter === 1);
check('reload cannot complete same block twice', !utils.finishCrewStory('crossline', 1, 15).applied);
utils.claimContact('next-beat', 2);
check('claiming a beat cannot erase story', crewStoryProgress(utils.getContactProgress(), 'crossline').chapter === 1);
denied = true;
check('denied storage still claims a beat this session', utils.claimContact('denied-beat', 2));
check('denied storage cannot repeat a beat this session', !utils.claimContact('denied-beat', 2));
check('denied storage still advances session story once', utils.finishCrewStory('crossline', 2, 15).applied);
check('denied storage cannot re-advance session story', !utils.finishCrewStory('crossline', 2, 15).applied);
user = 'two';
check('volatile story never leaks accounts', crewStoryProgress(utils.getContactProgress(), 'crossline').chapter === 0);
check('volatile beats never leak accounts', !contactShown(utils.getContactProgress(), 'denied-beat'));
denied = false;
utils.finishCrewStory('iron-row', 4, 15);
check('new account crew starts its own story', crewStoryProgress(utils.getContactProgress(), 'iron-row').chapter === 1);
user = 'one';
check('first account retains its in-session progress', crewStoryProgress(utils.getContactProgress(), 'crossline').chapter === 2);
check('only existing contact storage keys were written', [...records.keys()].sort().join(',') === 'pr_contacts_v1_one,pr_contacts_v1_two');
console.log(passed + ' contact storage assertions passed');
