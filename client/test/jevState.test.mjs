// The strategic payload, under plain Node.
//
//   node client/test/jevState.test.mjs
//
// Two properties matter above all. The payload asks for STRATEGY (objective,
// posture, power) and carries nothing a steering answer could be built from.
// And it cannot tell which bag is real: the view BotDriver builds drops the
// scene's stash/bunkStash names, and a board with the real bag swapped to the
// other position produces a byte-identical payload.

import { makeScene, keyPaths, AI_HOOKS } from './_jevWorld.mjs';
import BotDriver from '../src/controllers/BotDriver.js';
import { jevState } from '../src/logic/jevState.js';
import { pathDistances, MOVEMENT_KEYS, MOVEMENT_WORDS } from '../src/logic/jevStrategy.js';

let passed = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

const botFor = (scene) => new BotDriver(scene, { aiLevel: 5, dangerCells: 5, coverPenalty: 0,
  wrongTurnChance: 0, hesitateChance: 0, strategist: { tick: () => ({ objective: null, posture: 'balanced' }), report: () => ({}) } }, AI_HOOKS);

function payloadFor(scene, trigger = 'house_start') {
  const view = botFor(scene)._jevView(scene.attacker);
  const dist = pathDistances(view, view.runner);
  const plugDists = view.plugs.map((p) => pathDistances(view, p, 60));
  return { view, payload: jevState(view, { dist, plugDists, trigger }) };
}

console.log('\njevState — strategic payload\n');

// 1. Only strategic questions, only legal choices.
{
  const { payload } = payloadFor(makeScene());
  const q = payload.questions;
  check('asks exactly objective, posture and power', JSON.stringify(Object.keys(q).sort()) === '["objective","posture","power"]',
    Object.keys(q).join(','));
  check('objective choices are the two bags and hold',
    JSON.stringify(Object.keys(q.objective.criteria)) === '["target_a","target_b","hold"]');
  check('extract is not offered before pickup', !('extract' in q.objective.criteria));
  check('posture choices', JSON.stringify(Object.keys(q.posture.criteria)) === '["safe","balanced","aggressive"]');
  check('power choices are the ready powers plus none', JSON.stringify(Object.keys(q.power.criteria)) === '["none","phase","dash"]');
  check('every question is a choice with object criteria',
    Object.values(q).every((x) => x.type === 'choice' && x.criteria && !Array.isArray(x.criteria)));
}

// 2. Nothing a direction could be built from.
{
  const { payload } = payloadFor(makeScene({ plug: { x: 6, y: 4 } }));
  const all = keyPaths(payload);
  const badKey = all.find((p) => MOVEMENT_KEYS.includes(p.key) || ['open', 'x', 'y', 'me', 'grid', 'local'].includes(p.key));
  check('no movement or coordinate keys anywhere', !badKey, badKey?.path);
  const text = JSON.stringify(payload).toLowerCase();
  const word = MOVEMENT_WORDS.find((w) => new RegExp('\\b' + w + '\\b').test(text));
  check('no direction words anywhere, not even in instructions', !word, word);
  check('targets are summarised by distance and exposure only',
    payload.state.targets.every((t) => JSON.stringify(Object.keys(t)) === '["id","dist","plug","exposed"]'));
}

// 3. Carrying: extraction (or a pause) is the only choice.
{
  const scene = makeScene();
  scene.hasStash = true;
  const { payload } = payloadFor(scene, 'extract_available');
  check('carrying offers extract and hold only',
    JSON.stringify(Object.keys(payload.questions.objective.criteria)) === '["extract","hold"]');
  check('no bag summaries once carrying', !('targets' in payload.state));
  check('extract marked available', payload.state.extract.available === true);
  check('the trigger is named', payload.state.event === 'extract_available');
}

// 4. A decoy already out is not offered again; spent powers are listed apart.
{
  const scene = makeScene({ over: { runnerPowersSelected: ['decoy', 'dash'], runnerPowersConsumed: [false, true], decoySprite: { active: true } } });
  const { payload } = payloadFor(scene);
  check('a second decoy is not offered while one is out', !payload.questions.power);
  check('ready and spent are reported apart',
    JSON.stringify(payload.state.powers) === JSON.stringify({ ready: ['decoy'], spent: ['dash'] }));
  check('decoyOut reported', payload.state.decoyOut === true);
}

// 5. THE FAIRNESS TEST. Swap which bag is real; nothing strategic may change.
{
  const a = payloadFor(makeScene({ realTop: true }));
  const b = payloadFor(makeScene({ realTop: false }));
  check('swapping the real bag leaves the payload byte-identical',
    JSON.stringify(a.payload) === JSON.stringify(b.payload));
  check('and the candidate list identical', JSON.stringify(a.view.candidates) === JSON.stringify(b.view.candidates));

  // Recursive scan of payload AND view: no identity words or keys, and no
  // object reference to either scene sprite.
  const scene = makeScene();
  const bot = botFor(scene);
  const view = bot._jevView(scene.attacker);
  const { payload } = payloadFor(scene);
  const ident = /\b(stash|bunk|bunkstash|real|genuine|fake|decoybag|isreal)\b/i;
  for (const [label, obj] of [['payload', payload], ['view', view]]) {
    const paths = keyPaths(obj);
    const hit = paths.find((p) => ident.test(p.key) || (typeof p.value === 'string' && ident.test(p.value)));
    check(`${label}: no key or string names a real or bunk bag`, !hit, hit?.path);
    const ref = paths.find((p) => p.value === scene.stash || p.value === scene.bunkStash);
    check(`${label}: holds no reference to either bag sprite`, !ref, ref?.path);
  }
  check('A is the top bag by position, whichever is real',
    view.candidates[0].id === 'target_a' && view.candidates[0].cell.y === 2);
}

// 6. A bag mid-fade (a bunk just picked up) is not a candidate — the player
//    sees it vanish — and the remaining bag is relabelled by position.
{
  const scene = makeScene({ realTop: true });
  scene.bunkStash._fading = true;           // bottom bag was the bunk
  const { view, payload } = payloadFor(scene, 'stash_change');
  check('a fading bag drops out', view.candidates.length === 1 && view.candidates[0].cell.y === 2);
  check('the survivor is target_a', payload.state.targets.length === 1 && payload.state.targets[0].id === 'target_a');
  check('and B is no longer offered', !('target_b' in payload.questions.objective.criteria));
}

// 7. It is still cheap. The old per-frame payload measured ~136 tokens; this
//    one is sent tens of times a race, not several times a second.
{
  const { payload } = payloadFor(makeScene({ plug: { x: 2, y: 3 } }));
  const approx = Math.ceil(JSON.stringify(payload).length / 4);
  check('payload stays compact (<450 estimated tokens)', approx < 450, `${approx}`);
}

console.log('');
if (failures.length) {
  console.log(`jevState: ${passed} passed, ${failures.length} FAILED`);
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log(`jevState: ${passed} assertions passed`);
