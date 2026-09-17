// Controller lifecycle against a tiny display-list stub, not visual Phaser proof.
import { readFileSync } from 'node:fs';
import { CONTACTS, gangContacts, contactCue, contactPanelLayout, contactDialoguePages } from '../src/logic/contacts.js';
import { expressionArt, expressionIndex, contactExpression } from '../src/logic/contactExpressions.js';
let passed = 0;
function check(name, ok) { if (!ok) throw Error(name); passed++; }
const source = readFileSync(new URL('../src/controllers/ContactPanel.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\s*/gm, '').replace(/export default showContactPanel;/, '').replace('export function', 'function');
const show = new Function('CONTACTS', 'contactPanelLayout', 'contactDialoguePages',
  'expressionArt', 'expressionIndex', 'contactExpression', source + '\nreturn showContactPanel;')
  (CONTACTS, contactPanelLayout, contactDialoguePages, expressionArt, expressionIndex, contactExpression);
function stub(existing) {
  const nodes = [], timers = [], removed = [], frames = [], requests = [], handlers = {}, tweens = [];
  const node = (kind, args = []) => {
    const target = { kind, args, active: true, handlers: {},
      destroy() { this.active = false; },
      on(name, fn) { this.handlers[name] = fn; return this; },
      createGeometryMask() { return { destroy() {} }; } };
    const proxy = new Proxy(target, { get(obj, key) {
      if (key in obj) return obj[key];
      return () => proxy;
    } });
    nodes.push(proxy); return proxy;
  };
  const scene = {
    scale: { gameSize: { width: 280, height: 480 } },
    add: new Proxy({}, { get: (_, kind) => (...args) => node(kind, args) }),
    make: { graphics: () => node('mask') }, tweens: { killTweensOf() {}, add: config => tweens.push(config) },
    textures: { exists: key => existing.has(key), remove: key => { removed.push(key); existing.delete(key); },
      get: key => ({ has: () => false, add: (...args) => frames.push([key, ...args]), getSourceImage: () => ({ width: 1024, height: 1536 }) }) },
    time: { delayedCall: (ms, fn) => { timers.push(fn); return { remove() {} }; } },
    load: { image: (...args) => requests.push(args), spritesheet: (...args) => requests.push(args), once() {}, start() {} },
    events: { once: (name, fn) => { handlers[name] = fn; } }
  };
  const tap = () => {
    while (timers.length) timers.shift()();
    const buttons = nodes.filter(n => n.active && n.handlers.pointerup);
    check('one active page advance', buttons.length === 1);
    buttons[0].handlers.pointerup();
  };
  return { scene, nodes, removed, frames, requests, handlers, tap, tweens };
}
for (const gangID of ['crossline', 'iron-row', 'afterlight']) {
  const pair = gangContacts(gangID);
  const data = stub(new Set([pair.primary.portraitKey, pair.secondary.portraitKey,
    expressionArt(pair.primary.id).key, expressionArt(pair.secondary.id).key]));
  let advanced = 0;
  let audioStarts = 0, audioReleases = 0;
  data.scene.audio = { beginContactMoment() { audioStarts++; return () => audioReleases++; } };
  const panel = show(data.scene, {
    contact: pair.primary, contacts: [pair.primary, pair.secondary], celebration: true,
    pages: [{ text: 'Fifteen bags. You finished.', contact: pair.primary }, { text: 'The crew has your next run ready.', contact: pair.secondary }],
    text: 'Fifteen bags. You finished.', speaker: pair.primary.name.toUpperCase(),
    chapterLabel: 'CHAPTER 1 COMPLETE', action: 'SEE THE BLOCK  >>'
  }, () => advanced++);
  check('celebration uses both approved portrait frames ' + gangID, data.nodes.filter(n => n.active && n.kind === 'image').length === 2);
  check('both partners use hyped expression ' + gangID,
    data.nodes.filter(n => n.active && n.kind === 'image').every(n => n.args[3] === 2));
  check('pair scene downloads no new background raster ' + gangID, data.requests.length === 0);
  check('finish text is live, not baked in art ' + gangID, data.nodes.some(n => n.active && n.kind === 'text' && n.args[2] === '15 / 15'));
  check('celebration has bounded comic sparkles ' + gangID,
    data.tweens.length === 5 && data.tweens.every(t => t.yoyo && t.repeat === 2 && t.duration === 300));
  data.tap();
  check('first contact page does not start next block ' + gangID, advanced === 0);
  check('contact sound only once across page turns ' + gangID, audioStarts === 1 && audioReleases === 0);
  check('second contact is the speaker ' + gangID, data.nodes.some(n => n.active && n.kind === 'text' && n.args[2] === pair.secondary.name.toUpperCase()));
  data.tap();
  check('final page advances once ' + gangID, advanced === 1);
  panel.close(); data.handlers.shutdown();
  check('contact mix restored exactly once ' + gangID, audioReleases === 1);
  check('close and shutdown cannot advance twice ' + gangID, advanced === 1);
  check('teardown destroys all tracked display objects ' + gangID, data.nodes.every(n => !n.active));
  check('shared portrait textures retained ' + gangID, data.removed.length === 0);
}
const pair = gangContacts('crossline');
const ordinary = stub(new Set([pair.primary.portraitKey, 'contact_bg_switch']));
let entered = 0;
const panel = show(ordinary.scene, { ...contactCue({ gangID: 'crossline', house: 1 }),
  pages: ['The first page.', 'The second page.'] }, () => entered++);
ordinary.tap();
check('room survives page turn', ordinary.removed.length === 0 && entered === 0);
ordinary.tap();
check('room released only at final teardown', ordinary.removed.join(',') === 'contact_bg_switch' && entered === 1);
panel.close();
check('ordinary continuation is once-only', entered === 1);
const stopped = stub(new Set([pair.primary.portraitKey, 'contact_bg_switch']));
let stoppedCalls = 0;
const aborted = show(stopped.scene, contactCue({ gangID: 'crossline', house: 1 }), () => stoppedCalls++);
aborted.close(false);
check('forced shutdown never enters next scene', stoppedCalls === 0);

// An ordinary consultation can hand the conversation between both contacts.
const iron=gangContacts('iron-row');
const exchange=stub(new Set([iron.primary.portraitKey,'contact_bg_brick']));
let exchanged=0;
show(exchange.scene,{contact:iron.primary,contacts:[iron.primary,iron.secondary],action:'VIEW THE BLOCK  >>',
  pages:[{text:'First door.',contact:iron.primary},{text:'Keep moving.',contact:iron.secondary}]},()=>exchanged++);
exchange.tap();
check('speaker portrait follows the dialogue page',exchange.nodes.some(n=>n.active&&n.kind==='image'&&n.args[3]===iron.secondary.id));
check('speaker label follows the dialogue page',exchange.nodes.some(n=>n.active&&n.kind==='text'&&n.args[2]==='ROOK'));
exchange.tap();
check('two-speaker consultation advances only at its end',exchanged===1);
console.log(passed + ' contact panel assertions passed');
