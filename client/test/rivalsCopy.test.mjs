// Player-facing words. The vocabulary the product asked for, none of the
// technical vocabulary, and no claim that anybody is online.
import { readFileSync } from 'node:fs';
let passed = 0;
function check(name, ok) { if (!ok) throw new Error(name); passed++; }

const race = readFileSync(new URL('../src/controllers/RivalsRace.js', import.meta.url), 'utf8');
const menu = readFileSync(new URL('../src/scenes/MenuScene.js', import.meta.url), 'utf8');
/** Only the quoted strings a player can read, not comments or identifiers. */
const shown = source => (source.match(/'[^'\n]{3,90}'|"[^"\n]{3,90}"/g) || [])
  .map(s => s.slice(1, -1))
  // Sentence-like strings only: an identifier such as 'recorded-bot' or a
  // style key is internal data, not something a player reads.
  .filter(s => /[A-Za-z]/.test(s) && /\s/.test(s) && !s.includes('/') && !s.startsWith('#'));
// The match screen draws what RivalsRace tells it; scan both so a string
// added to either is held to the same rules.
const screen = readFileSync(new URL('../src/controllers/RivalMatchScreen.js', import.meta.url), 'utf8');
const raceCopy = [...shown(race), ...shown(screen)];

for (const word of ['BLOCK RIVALS', 'LOOK FOR MATCH', 'FINDING RIVAL', 'RIVAL FOUND', 'WATCH RIVAL']) {
  check('the product vocabulary is used: ' + word, raceCopy.some(s => s.includes(word)));
}
check('the menu row is named Block Rivals', menu.includes("'Block Rivals'"));

// Technical vocabulary must not reach routine copy.
const technical = /\brecorded\b|\brecording\b|\bbank\b|\bdriver\b|\bbot\b|\bharness\b|\bpayload\b|\bhash\b|\bschema\b|\bskillPreset\b/i;
const offenders = raceCopy.filter(s => technical.test(s));
check('no technical vocabulary in player copy: ' + JSON.stringify(offenders.slice(0, 3)), offenders.length === 0);

// No claim that a rival is live, online, queued or currently playing.
const liveClaim = /\bonline\b|\blive\b|\bqueue\b|\bwaiting\b|\bplayers? (?:online|now|nearby)\b|\bsearching for players\b|\bmatchmaking\b/i;
const liveOffenders = raceCopy.filter(s => liveClaim.test(s));
check('no live-opponent claim: ' + JSON.stringify(liveOffenders.slice(0, 3)), liveOffenders.length === 0);
check('no invented population count', !/\b\d+\s*(players|runners|online)\b/i.test(race));

// The generated fallback is still never dressed up as a rival who ran it.
check('the fallback says what it is', raceCopy.some(s => /PACE TRIAL/.test(s)));
check('the fallback is not called a rival run', !raceCopy.some(s => /PACE TRIAL/.test(s) && /RIVAL RUN/i.test(s)));

// Internal provenance stays honest and intact.
const presets = readFileSync(new URL('../src/logic/rivalPresets.js', import.meta.url), 'utf8');
check('records still carry a driver version', presets.includes('RIVAL_BOT_DRIVER_VERSION'));
check('internal opponent kind is still bot', presets.includes("kind === 'bot'") || readFileSync(new URL('../src/logic/rivalRecords.js', import.meta.url), 'utf8').includes("'bot'"));
check('the visible name strips BOT and AI', race.includes('rivalDisplayName'));
check('no explanatory popup was added', !/showModal\([^)]*How it works|explain/i.test(race));
console.log(passed + ' rivals copy assertions passed');
