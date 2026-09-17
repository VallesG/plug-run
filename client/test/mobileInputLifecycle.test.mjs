// Real controller and scene touch lifecycle. No Phaser/browser required.
// The lost-release fixture must fail against the pre-fix source.
import { readFileSync } from 'node:fs';
import { CONTACTS, gangContacts, contactCue, contactPanelLayout, contactDialoguePages } from '../src/logic/contacts.js';
import { expressionArt, expressionIndex, contactExpression } from '../src/logic/contactExpressions.js';

const playerSource = readFileSync(new URL('../src/controllers/PlayerController.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\s*/gm, '').replace('export default class', 'class');
const sceneSource = readFileSync(new URL('../src/scenes/BaseGameScene.js', import.meta.url), 'utf8');
const panelSource = readFileSync(new URL('../src/controllers/ContactPanel.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\s*/gm, '').replace(/export default showContactPanel;/, '').replace('export function', 'function');
const methodsStart = sceneSource.indexOf('  makeMobileControls(){');
const methodsEnd = sceneSource.indexOf('  /* ----------------- Movement Trails', methodsStart);
if (methodsStart < 0 || methodsEnd < methodsStart) throw Error('mobile lifecycle source seam moved');
let now = 1000;
const Player = new Function('corridorAssist', 'performance', playerSource + '\nreturn PlayerController;')(
  () => {}, { now: () => now });
const Host = new Function('class Host {\n' + sceneSource.slice(methodsStart, methodsEnd) + '\n}\nreturn Host;')();
const showPanel = new Function('CONTACTS', 'contactPanelLayout', 'contactDialoguePages',
  'expressionArt', 'expressionIndex', 'contactExpression', panelSource + '\nreturn showContactPanel;')(
  CONTACTS, contactPanelLayout, contactDialoguePages, expressionArt, expressionIndex, contactExpression);

let passed = 0;
function check(name, ok) { if (!ok) throw Error(name); passed++; }
function emitter() {
  const handlers = new Map();
  return {
    on(name, fn) { handlers.set(name, [...(handlers.get(name) || []), fn]); return this; },
    once(name, fn) { return this.on(name, fn); },
    off(name, fn) { handlers.set(name, (handlers.get(name) || []).filter(x => x !== fn)); return this; },
    emit(name, value) { for (const fn of [...(handlers.get(name) || [])]) fn(value); },
    count(name) { return (handlers.get(name) || []).length; },
    clear() { handlers.clear(); }
  };
}
function makeHost(role = 'runner') {
  const host = new Host(), nodes = [], timers = [], moves = [], powers = [];
  const dom = emitter();
  host.role = role; host.roundOver = false; host.roundPausedForMenu = false;
  host.input = Object.assign(emitter(), { keyboard: { enabled: true } });
  host.events = emitter();
  host.scale = { gameSize: { width: 390, height: 844 } };
  host.cameras = { main: { centerX: 195, centerY: 422 } };
  const node = (kind, args) => {
    const target = Object.assign(emitter(), { kind, args, active: true,
      destroy() { this.active = false; this.clear(); },
      createGeometryMask() { return { destroy() {} }; } });
    const value = new Proxy(target, { get(obj, key) { return key in obj ? obj[key] : () => value; } });
    nodes.push(value); return value;
  };
  host.add = new Proxy({}, { get: (_, kind) => (...args) => node(kind, args) });
  host.make = { graphics: () => node('mask', []) };
  host.tweens = { killTweensOf() {} };
  host.textures = { exists: () => true, remove() {}, get: () => ({
    has: () => true, add() {}, getSourceImage: () => ({ width: 1024, height: 1536 })
  }) };
  host.time = { delayedCall: (ms, fn) => { timers.push(fn); return { remove() {} }; } };
  host.sys = { game: { canvas: {
    width: 390, height: 844,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }),
    addEventListener: (name, fn) => dom.on(name, fn),
    removeEventListener: (name, fn) => dom.off(name, fn)
  } } };
  host.attacker = {}; host.defender = {};
  host.intent = { recordMove: (x,y) => moves.push([x,y]), recordGun() {} };
  host.combatSystem = { tryMouseFire: () => powers.push('fire') };
  host.activateRunnerPowerByIndex = index => powers.push(index);
  host.playerController = new Player(host);
  host.makeMobileControls();
  const tapPage = () => {
    while (timers.length) timers.shift()();
    const buttons = nodes.filter(n => n.active && n.count('pointerup') && n.kind === 'rectangle');
    check('one contact advance is live', buttons.length === 1);
    buttons[0].emit('pointerup');
  };
  const swipe = (id, direction = 'down') => {
    now += 500;
    const start = { id, x: 100, y: 100, isDown: true };
    const end = { id, x: direction === 'right' ? 160 : 100,
      y: direction === 'down' ? 160 : direction === 'up' ? 40 : 100, isDown: true };
    host._touchHandlers.downHandler(start);
    now += 20; host._touchHandlers.moveHandler(end);
    now += 20; host._touchHandlers.upHandler({ ...end, isDown: false });
  };
  return { host, nodes, dom, moves, powers, tapPage, swipe };
}

// Exact lost-release failure: listener teardown happens inside modal advance.
const lost = makeHost();
lost.host._touchHandlers.downHandler({ id: 42, x: 20, y: 20, isDown: true });
check('fixture acquires old finger before teardown', lost.host.playerController._swipePid === 42);
lost.host.suspendTouchUI(true);
check('teardown cancels controller-owned finger ID', lost.host.playerController._swipePid === null);
lost.host.suspendTouchUI(false);
lost.swipe(43);
check('fresh finger can steer after listener rebind', lost.host.playerController._runnerInputDir.y === 1);
check('fresh finger releases cleanly', lost.host.playerController._swipePid === null);

// Reset even when handlers have already disappeared. Never reset movement.
const controller = lost.host.playerController;
controller.playerDrift = { x: 0, y: -1 };
controller._swipePid = 99; controller._swipeStart = { x: 4 };
controller._aimDragActive = true; controller._dragMoveActive = true; controller._lastTapAt = now;
lost.host._touchHandlers = null;
lost.host.destroyTouchUI();
check('no-handler teardown still clears all gesture flags',
  controller._swipePid === null && controller._swipeStart === null &&
  !controller._aimDragActive && !controller._dragMoveActive && controller._lastTapAt === 0);
check('cancellation preserves movement/drift', controller.playerDrift.y === -1);

// Actual contact panel + actual input code; simulate the existing map/loadout
// suspend/resume contract rather than substituting a fake controller.
for (const gangID of ['crossline', 'iron-row', 'afterlight']) {
  const data = makeHost(), host = data.host;
  for (const house of [1, 4, 7, 9, 10, 13]) {
    const old = host._touchHandlers;
    old.downHandler({ id: 40 + house, x: 100, y: 100, isDown: true });
    const beforeMoves = data.moves.length, beforePowers = data.powers.length;
    let mapShown = 0;
    const cue = { ...contactCue({ gangID, house }),
      pages: ['Listen before you go.', 'Now look at your route.'] };
    const panel = showPanel(host, cue, () => {
      mapShown++;
      host.suspendTouchUI(true); // entrance modal opens, still paused
    });
    const label = gangID + '/' + house;
    check('dialogue freezes world and keyboard ' + label, host.roundPausedForMenu && !host.input.keyboard.enabled);
    check('dialogue removes raw DOM and Phaser listeners ' + label,
      host.input.count('pointerdown') === 0 && data.dom.count('touchstart') === 0);
    check('dialogue clears interrupted gesture ' + label, host.playerController._swipePid === null);
    old.downHandler({ id: 99, x: 100, y: 100, isDown: true });
    old.moveHandler({ id: 99, x: 100, y: 160, isDown: true });
    old.upHandler({ id: 99, x: 100, y: 160, isDown: false });
    check('queued modal events cannot steer or spend ' + label,
      host.playerController._swipePid === null && data.moves.length === beforeMoves && data.powers.length === beforePowers);
    data.tapPage();
    check('page turn remains paused and cannot enter house ' + label, mapShown === 0 && host.roundPausedForMenu && host._touchHandlers === null);
    data.tapPage();
    check('last page hands off to entrance once ' + label, mapShown === 1 && host.roundPausedForMenu);
    panel.close();
    check('duplicate close cannot replay entrance ' + label, mapShown === 1);
    host.suspendTouchUI(false); // entrance modal destroy
    host.roundPausedForMenu = false;
    host.makeMobileControls(); // startMatch rebuild
    host.roundPausedForMenu = true; host.suspendTouchUI(true); // loadout opens
    host.suspendTouchUI(false); host.input.keyboard.enabled = true;
    host.roundPausedForMenu = false; // selected loadout begins round
    data.swipe(200 + house, house % 2 ? 'up' : 'down');
    check('steering works immediately after contact/map/loadout ' + label,
      host.playerController._runnerInputDir.y === (house % 2 ? -1 : 1));
    check('input has exactly one live listener set ' + label,
      host.input.count('pointerdown') === 1 && host.input.count('pointermove') === 1 &&
      host.input.count('pointerup') === 1 && data.dom.count('touchstart') === 1 &&
      data.dom.count('touchmove') === 1 && data.dom.count('touchend') === 1);
    check('new gesture is not stuck ' + label, host.playerController._swipePid === null);
  }
}

// Phaser/DOM identifiers differ. A foreign release cannot steer or spend,
// but the active stream must still release. No gameplay double-tap across UI.
for (const role of ['runner', 'plug']) {
  const data = makeHost(role), host = data.host, pc = host.playerController;
  now += 500;
  pc.beginSwipe({ id: 7, x: 100, y: 100 });
  pc.endSwipe({ id: 8, x: 100, y: 160 });
  check('foreign release preserves active gesture ' + role, pc._swipePid === 7);
  check('foreign release does nothing ' + role, data.moves.length === 0 && data.powers.length === 0);
  pc.endSwipe({ id: 7, x: 100, y: 160 });
  check('active release still steers ' + role, pc._swipePid === null && pc.playerMoveDir.y === 1);
  host.roundOver = true;
  pc.beginSwipe({ id: 9, x: 100, y: 100 });
  pc.updateSwipe({ id: 9, x: 160, y: 100, isDown: true });
  const count = data.moves.length;
  pc.endSwipe({ id: 9, x: 160, y: 100 });
  check('round-over gestures cannot take over ' + role, pc._swipePid === null && data.moves.length === count);
  host.roundOver = false;
  pc.beginSwipe({ id: 10, x: 100, y: 100 });
  pc.endSwipe(undefined);
  check('pointerless cancellation cannot stick or fire ' + role, pc._swipePid === null && data.powers.length === 0);
}

const tap = makeHost(), pc = tap.host.playerController;
now += 500;
pc.beginSwipe({ id: 1, x: 100, y: 100 }); pc.endSwipe({ id: 1, x: 100, y: 100 });
check('first tap prepares double tap', pc._lastTapAt === now);
tap.host.suspendTouchUI(true); tap.host.suspendTouchUI(false);
now += 100;
pc.beginSwipe({ id: 2, x: 100, y: 100 }); pc.endSwipe({ id: 2, x: 100, y: 100 });
check('menu boundary cancels double-tap carryover', tap.powers.length === 0);
now += 100;
pc.beginSwipe({ id: 3, x: 100, y: 100 }); pc.endSwipe({ id: 3, x: 100, y: 100 });
check('ordinary gameplay double-tap still works', tap.powers.length === 1);


// Actual Safari DOM fallback stays usable after a modal, not just direct calls.
const safari = makeHost();
const touchEvent = (id, x, y) => ({
  changedTouches: [{ identifier: id, clientX: x, clientY: y }], preventDefault() {}
});
now += 500;
safari.dom.emit('touchstart', touchEvent(501, 100, 100));
check('DOM fallback owns its real identifier', safari.host.playerController._swipePid === 501);
safari.host.suspendTouchUI(true); safari.host.suspendTouchUI(false);
now += 500;
safari.dom.emit('touchstart', touchEvent(502, 100, 100));
now += 20; safari.dom.emit('touchmove', touchEvent(502, 40, 100));
now += 20; safari.dom.emit('touchend', touchEvent(502, 40, 100));
check('DOM fallback can steer after interrupted prior touch', safari.host.playerController._runnerInputDir.x === -1);
check('DOM fallback releases replacement identifier', safari.host.playerController._swipePid === null);
safari.host._touchHandlers.downHandler({ id: 1, x: 100, y: 100 });
safari.dom.emit('touchstart', touchEvent(503, 100, 100));
check('second transport cannot overwrite active Phaser ID', safari.host.playerController._swipePid === 1);
const beforeForeign = safari.moves.length;
safari.dom.emit('touchend', touchEvent(503, 100, 160));
check('foreign DOM release cannot steer active Phaser gesture', safari.moves.length === beforeForeign && safari.host.playerController._swipePid === 1);
safari.host._touchHandlers.upHandler({ id: 1, x: 100, y: 160 });
check('Phaser release still clears after DOM duplicate', safari.host.playerController._swipePid === null);
safari.host.destroyTouchUI();
check('final cleanup removes all DOM fallback listeners',
  ['touchstart','touchmove','touchend','touchcancel'].every(name => safari.dom.count(name) === 0));

console.log(passed + ' mobile input lifecycle assertions passed');

const goneCamera=makeHost();
goneCamera.host.cameras.main=undefined;
goneCamera.host.suspendTouchUI(false);
check('camera removed before modal disposal never rebinds',!goneCamera.host._touchHandlers);
check('camera-removed cleanup releases DOM listeners',goneCamera.dom.count('touchstart')===0);
const closing=makeHost();closing.host._touchSceneClosing=true;closing.host.suspendTouchUI(false);
check('closing scene never rebinds even with camera',!closing.host._touchHandlers);
closing.host._touchSceneClosing=false;closing.host.suspendTouchUI(false);
check('restarted scene can create touch again',!!closing.host._touchHandlers);
closing.host.destroyTouchUI();closing.host.input=null;closing.host.makeMobileControls();
check('removed input plugin is safe',!closing.host._touchHandlers);
console.log('shutdown touch lifecycle: '+passed+' total assertions passed');

const uiSource=readFileSync(new URL('../src/controllers/GameUI.js',import.meta.url),'utf8').replace(/^import[\s\S]*?;\s*/gm,'').replace('export default class','class');
const UI=new Function(uiSource+';return GameUI;')();
const teardown=makeHost(),ui=new UI(teardown.host);
const realModal=ui.showModal({title:'YOU WIN',lines:[],buttons:[]});
teardown.host.cameras.main=undefined;
realModal.destroy();realModal.destroy();
check('actual GameUI destroy after camera shutdown is safe',!teardown.host._touchHandlers);
const live=makeHost(),liveUI=new UI(live.host);let resumes=0;
const originalResume=live.host.suspendTouchUI.bind(live.host);
live.host.suspendTouchUI=value=>{if(!value)resumes++;originalResume(value);};
const once=liveUI.showModal({title:'DIALOGUE',buttons:[]});once.destroy();once.destroy();
check('modal destroy resumes live touch only once',resumes===1);
const silent=liveUI.showModal({title:'SHUTDOWN',buttons:[]});silent.destroy({resumeTouch:false});
check('explicit cleanup does not resume touch',resumes===1);
live.host.destroyTouchUI();
const raceSource=readFileSync(new URL('../src/controllers/RivalsRace.js',import.meta.url),'utf8').replace(/^import[\s\S]*?;\s*/gm,'').replace('export default class','class');
const Race=new Function('clearTimeout',raceSource+';return RivalsRace;')(()=>{});
const exact=makeHost();exact.host.rivalRace={status:'finished'};exact.host.gameUI=new UI(exact.host);
const race=new Race(exact.host);race.entryModal=exact.host.gameUI.showModal({title:'BLOCK RIVALS',buttons:[]});
exact.host.cameras.main=undefined;race.dispose();race.dispose();
check('actual Rivals dispose closes modal after camera removed',race.disposed&&exact.host._touchSceneClosing&&!exact.host._touchHandlers);
console.log('actual modal/rivals shutdown: '+passed+' total assertions passed');
