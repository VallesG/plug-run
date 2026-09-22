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
import { pathDistances, plannedRoute, routeFacts, MOVEMENT_KEYS, MOVEMENT_WORDS } from '../src/logic/jevStrategy.js';

let passed = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

const botFor = (scene) => new BotDriver(scene, { aiLevel: 5, dangerCells: 5, coverPenalty: 0,
  wrongTurnChance: 0, hesitateChance: 0, strategist: { tick: () => ({ objective: null, posture: 'balanced' }), report: () => ({}) } }, AI_HOOKS);

function payloadFor(scene, trigger = 'house_start', deaths = []) {
  const view = botFor(scene)._jevView(scene.attacker);
  const dist = pathDistances(view, view.runner);
  const plugDists = view.plugs.map((p) => pathDistances(view, p, 60));
  return { view, payload: jevState(view, { dist, plugDists, trigger, deaths }) };
}

console.log('\njevState — strategic payload\n');

// 1. Only strategic questions, only legal choices.
{
  const { payload } = payloadFor(makeScene());
  const q = payload.questions;
  check('asks objective and posture with routing owned by the motor',
    JSON.stringify(Object.keys(q).sort()) === '["objective","posture","power"]',
    Object.keys(q).join(','));
  check('objective choices are the two bags, safest first; no plug near, so no hold',
    JSON.stringify(Object.keys(q.objective.criteria)) === '["target_b","target_a"]', Object.keys(q.objective.criteria).join());
  check('each bag choice states its distance', /^Bag, 3 steps/.test(q.objective.criteria.target_b) &&
    /^Bag, \d+ steps/.test(q.objective.criteria.target_a), JSON.stringify(q.objective.criteria));
  check('and the walk on from it to the car', Object.values(q.objective.criteria).every((d) => /then \d+ steps? to the car/.test(d)),
    JSON.stringify(q.objective.criteria));
  check('extract is not offered before pickup', !('extract' in q.objective.criteria));
  check('posture choices', JSON.stringify(Object.keys(q.posture.criteria)) === '["safe","balanced","aggressive"]');
  check('dash is offered for a bag approach and close-plug escape', !!q.power?.criteria.dash_objective && !!q.power?.criteria.dash_escape);
  check('phase wall shortcut is offered before pickup', !!q.power?.criteria.phase_shortcut);
  check('Jev cannot prescribe intermediate route waypoints', !q.route);
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
  check('targets are summarised by distance, exposure and deaths on the route only',
    payload.state.targets.every((t) => JSON.stringify(Object.keys(t)) === '["id","dist","car","plug","exposed","died"]'));
}

// 3. Carrying: extraction (or a pause) is the only choice.
{
  const scene = makeScene();
  scene.hasStash = true;
  const { payload } = payloadFor(scene, 'extract_available');
  check('carrying offers extract only (no plug near to wait out)',
    JSON.stringify(Object.keys(payload.questions.objective.criteria)) === '["extract"]');
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

// 6b. An allow-list, not a deny-list. The state carries exactly these fields;
//     in particular nothing about previous attempts' bags — which one was
//     bunk or genuine last time — because the genuine bag rerolls on every
//     attempt and A/B are only positions. A field added later must be added
//     here, on purpose.
{
  const scene = makeScene({ plug: { x: 6, y: 4 } });
  const { payload } = payloadFor(scene);
  // deaths: this house's deaths as counts (where they lay, which posture) —
  // the fair tactical history. Never a bag outcome.
  const allowed = ['house', 'attempt', 'runner', 'threat', 'decoyOut', 'powers', 'plan', 'event', 'targets', 'extract', 'deaths', 'routes'];
  const extra = Object.keys(payload.state).filter((k) => !allowed.includes(k));
  check('state carries only allow-listed fields', extra.length === 0, extra.join(','));
  check('targets carry only id, distance, distance on to the car, plug distance, exposure and route deaths',
    payload.state.targets.every((t) => Object.keys(t).join() === 'id,dist,car,plug,exposed,died'));
  check('deaths carry only counts',
    Object.keys(payload.state.deaths).join() === 'here,carrying,safe,balanced,aggressive' &&
    Object.values(payload.state.deaths).every((v) => Number.isInteger(v)));
  check('plan carries only the current strategy, no history',
    Object.keys(payload.state.plan).join() === 'objective,posture,route,ageS,progress');
  const text = JSON.stringify(payload).toLowerCase();
  const leak = ['previous', 'last', 'history', 'revealed', 'was', 'bunk', 'genuine', 'real'].find((w) => new RegExp('\\b' + w + '\\b').test(text));
  check('no word about past bag outcomes anywhere in the payload', !leak, leak);
}

// 6c. Fair tactical memory: where Jev died this house, by position only.
{
  const none = payloadFor(makeScene()).payload;
  check('a fresh house remembers no deaths', none.state.deaths.here === 0 && none.state.targets.every((t) => t.died === 0));

  // Three deaths beside the bottom bag, all on balanced.
  const deaths = [0, 1, 2].map(() => ({ cell: { x: 6, y: 11 }, carrying: false, posture: 'balanced' }));
  const { payload } = payloadFor(makeScene(), 'retry', deaths);
  const t = Object.fromEntries(payload.state.targets.map((x) => [x.id, x]));
  check('deaths count against the route they lay on, and only that one', t.target_b.died === 3 && t.target_a.died === 0,
    JSON.stringify(payload.state.targets));
  check('the route that keeps killing drops behind the other bag',
    Object.keys(payload.questions.objective.criteria)[0] === 'target_a');
  check('and its description says why', /3 deaths on this route this house/.test(payload.questions.objective.criteria.target_b));
  check('deaths per posture are counted', payload.state.deaths.here === 3 && payload.state.deaths.balanced === 3 &&
    payload.state.deaths.safe === 0);
  check('a posture that died 3 more times than the others is rested',
    Object.keys(payload.questions.posture.criteria).join() === 'safe,aggressive',
    Object.keys(payload.questions.posture.criteria).join());
  const two = payloadFor(makeScene(), 'retry', deaths.slice(0, 2)).payload.questions.posture.criteria;
  check('below that it is still offered, listed last, with its deaths', Object.keys(two).join() === 'safe,aggressive,balanced' &&
    /2 deaths with it this house/.test(two.balanced), JSON.stringify(two));
  const rotate = (counts) => Object.keys(payloadFor(makeScene(), 'retry', Object.entries(counts).flatMap(([p, n]) =>
    Array.from({ length: n }, () => ({ cell: { x: 1, y: 13 }, carrying: false, posture: p })))).payload.questions.posture.criteria).join();
  check('the rotation moves on when the next posture dies as often', rotate({ balanced: 3, safe: 3 }) === 'aggressive');
  check('and every posture comes back once all have died alike', rotate({ balanced: 3, safe: 3, aggressive: 3 }) === 'safe,balanced,aggressive');
  check('deaths while carrying count against the car, not a bag', (() => {
    const carried = [{ cell: { x: 6, y: 11 }, carrying: true, posture: 'safe' }];
    const q = payloadFor(makeScene(), 'retry', carried).payload;
    return q.state.targets.every((x) => x.died === 0) && q.state.deaths.carrying === 1;
  })());

  // The swap test again, with deaths remembered.
  const a = payloadFor(makeScene({ realTop: true }), 'retry', deaths);
  const b = payloadFor(makeScene({ realTop: false }), 'retry', deaths);
  check('with deaths remembered, swapping the real bag still leaves the payload byte-identical',
    JSON.stringify(a.payload) === JSON.stringify(b.payload));
}

// 6d. Hold is offered only with a plug close enough to wait out, and a bag
//     with the plug beside it is listed after a clear one.
{
  const near = payloadFor(makeScene({ plug: { x: 6, y: 11 } })).payload;
  check('hold offered with a plug 2 steps off', /plug 2 steps away/.test(near.questions.objective.criteria.hold || ''),
    JSON.stringify(near.questions.objective.criteria));
  check('the bag beside the plug is listed after the farther clear one',
    Object.keys(near.questions.objective.criteria)[0] === 'target_a' &&
    /plug 1 step from it/.test(near.questions.objective.criteria.target_b));
  const far = payloadFor(makeScene({ plug: { x: 11, y: 1 } })).payload;
  check('no hold with the plug far off', !('hold' in far.questions.objective.criteria), JSON.stringify(far.state.threat));
}

// 7. It is still cheap. The old per-frame payload measured ~136 tokens; this
//    one is sent tens of times a race, not several times a second.
{
  const deaths = [{ cell: { x: 6, y: 11 }, carrying: false, posture: 'balanced' }, { cell: { x: 3, y: 3 }, carrying: false, posture: 'safe' }];
  const { payload } = payloadFor(makeScene({ plug: { x: 2, y: 3 } }), 'retry', deaths);
  const approx = Math.ceil(JSON.stringify(payload).length / 4);
  check('payload stays compact (<800 estimated tokens)', approx < 800, `${approx}`);
}

// 8. Route profiles are real paths, not renamed postures. The safer route
//    avoids an exposed short corridor when a covered alternative exists.
{
  const cols = 7, rows = 5;
  const blocked = new Set(['3,2']);
  const view = {
    cols, rows,
    isWalkable: (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && !blocked.has(`${x},${y}`),
    exposedAt: (c) => c.y === 1 && c.x >= 2 && c.x <= 4
  };
  const from = { x: 1, y: 2 }, to = { x: 5, y: 2 };
  const direct = plannedRoute(view, from, to, 'direct');
  const covered = plannedRoute(view, from, to, 'covered');
  const df = routeFacts(view, from, to, 'direct');
  const cf = routeFacts(view, from, to, 'covered');
  check('direct and covered profiles both reach the objective',
    direct.at(-1).x === to.x && covered.at(-1).x === to.x);
  check('covered profile reduces exposure when a safe detour exists', cf.exposed < df.exposed,
    JSON.stringify({ direct: df, covered: cf }));
}

console.log('');
if (failures.length) {
  console.log(`jevState: ${passed} passed, ${failures.length} FAILED`);
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log(`jevState: ${passed} assertions passed`);
