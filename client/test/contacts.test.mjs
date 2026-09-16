// Contact cast, beats, dialogue and panel geometry. Headless, no Phaser.
import {
  CONTACT_CONTENT_VERSION, CONTACT_BEATS, CONTACT_TARGET_HOUSE, CONTACTS,
  contact, gangContacts, contactBeat, contactCue, contactScript, contactPanelLayout
} from '../src/logic/contacts.js';
import { WINDOW_ART, WINDOW_GANGS } from '../src/logic/window.js';

let passed = 0;
function check(name, ok) { if (!ok) throw new Error(name); passed++; }

// --- cast integrity -------------------------------------------------------
check('six contacts', CONTACTS.length === 6 && new Set(CONTACTS.map(c => c.id)).size === 6);
check('cast frozen', Object.isFrozen(CONTACTS) && CONTACTS.every(Object.isFrozen));
check('every gang has a pair', WINDOW_GANGS.every(g => {
  const pair = gangContacts(g.id);
  return pair && pair.primary.name === g.primary && pair.secondary.name === g.jobs;
}));
check('unknown gang has no pair', gangContacts('nope') === null && gangContacts() === null);
check('unknown contact is null', contact('auntie-ro') === null);
check('Auntie Ro is not a gang contact', !CONTACTS.some(c => /^(auntie ro|ro)$/i.test(c.name)));
check('three primaries and three secondaries',
  CONTACTS.filter(c => c.role === 'primary').length === 3 && CONTACTS.filter(c => c.role === 'secondary').length === 3);
check('each contact has its own setting and backdrop',
  new Set(CONTACTS.map(c => c.setting)).size === 6 && new Set(CONTACTS.map(c => c.background)).size === 6);
check('backdrops are the shipped webp', CONTACTS.every(c => c.background.endsWith('.webp') && c.background.startsWith('/art/the-window/contacts/locations/')));
check('portraits reuse the approved atlases', CONTACTS.every(c =>
  c.portraitSource === '/art/the-window/switch.webp' || c.portraitSource === '/art/the-window/cast.webp'));
check('every contact has a voice note', CONTACTS.every(c => c.voice.length > 20));

// Portrait frames must agree with the WINDOW_ART atlas contract, or a face
// gets sliced in half at runtime with no test to catch it.
for (const c of CONTACTS) {
  const expected = c.id === 'switch'
    ? { x: 0, width: WINDOW_ART.switch.frameWidth, height: WINDOW_ART.switch.frameHeight, sheetWidth: WINDOW_ART.switch.frameWidth * WINDOW_ART.switch.frames }
    : { ...WINDOW_ART.cast.frames[c.id], height: WINDOW_ART.cast.height, sheetWidth: WINDOW_ART.cast.width };
  check('frame matches WINDOW_ART ' + c.id, c.frame.x === expected.x && c.frame.width === expected.width
    && c.frame.height === expected.height && c.frame.sheetWidth === expected.sheetWidth);
}
check('only Switch has expressions', CONTACTS.filter(c => c.expressions > 1).length === 1 && contact('switch').expressions === 3);

// --- dialogue -------------------------------------------------------------
for (const c of CONTACTS) {
  const lines = Object.values(c.lines).flat().filter(Boolean);
  check('lines present ' + c.id, lines.length >= 2);
  check('lines are short ' + c.id, lines.every(l => l.length <= 120));
  check('lines are one or two sentences ' + c.id, lines.every(l => (l.match(/[.!?]/g) || []).length <= 2));
  check('no placeholder text ' + c.id, lines.every(l => !/TODO|lorem|xxx/i.test(l)));
  if (c.role === 'primary') check('primary praises, teases and debriefs ' + c.id,
    c.lines.praise.length >= 3 && c.lines.tease && c.lines.debriefWin && c.lines.debriefMiss);
  if (c.role === 'secondary') check('secondary briefs ' + c.id, c.lines.brief && c.lines.reminder);
}
check('secondaries are named in their primary tease', WINDOW_GANGS.every(g => {
  const pair = gangContacts(g.id);
  return pair.primary.lines.tease.includes(pair.secondary.name);
}));

// --- beats ----------------------------------------------------------------
check('five beats, ascending, unique houses',
  CONTACT_BEATS.length === 5 && CONTACT_BEATS.every((b, i) => i === 0 || b.house > CONTACT_BEATS[i - 1].house));
check('beats sit inside a fifteen-house block', CONTACT_BEATS.every(b => b.house >= 2 && b.house <= 15));
check('house one is never interrupted', !contactBeat(1));
check('beat clears are the house before', CONTACT_BEATS.every(b => b.clears === b.house - 1));
check('one secondary beat, at the target house',
  CONTACT_BEATS.filter(b => b.role === 'secondary').length === 1 && contactBeat(CONTACT_TARGET_HOUSE).kind === 'brief');
check('tease comes before the brief',
  CONTACT_BEATS.find(b => b.kind === 'tease').house < CONTACT_TARGET_HOUSE);
check('debrief comes after the brief',
  CONTACT_BEATS.find(b => b.kind === 'debrief').house > CONTACT_TARGET_HOUSE);
check('quiet houses stay quiet', [1, 2, 3, 5, 6, 8, 11, 12, 14, 15].every(h => contactBeat(h) === null));

for (const gang of WINDOW_GANGS) {
  const script = contactScript(gang.id);
  check('full script for ' + gang.id, script.length === CONTACT_BEATS.length);
  check('never two speakers at one house ' + gang.id, new Set(script.map(c => c.beat.house)).size === script.length);
  check('brief comes from the job contact ' + gang.id,
    script.find(c => c.beat.kind === 'brief').contact.name === gang.jobs);
  check('check-ins come from the primary ' + gang.id,
    script.filter(c => c.beat.kind !== 'brief').every(c => c.contact.name === gang.primary));
  check('unique event ids ' + gang.id, new Set(script.map(c => c.eventID)).size === script.length);
  check('event ids carry content version ' + gang.id,
    script.every(c => c.eventID.includes('/v' + CONTACT_CONTENT_VERSION + '/')));
  check('advance reads as a page turn ' + gang.id, script.every(c => c.action.endsWith('>>')));
}
check('event ids differ per block',
  contactCue({ gangID: 'crossline', house: 4, blockIndex: 1 }).eventID !== contactCue({ gangID: 'crossline', house: 4, blockIndex: 2 }).eventID);
check('same block and house always says the same thing',
  contactCue({ gangID: 'iron-row', house: 4, blockIndex: 3 }).text === contactCue({ gangID: 'iron-row', house: 4, blockIndex: 3 }).text);
check('a block later says the same thing too',
  contactCue({ gangID: 'iron-row', house: 4, blockIndex: 1 }).text === contactCue({ gangID: 'iron-row', house: 4, blockIndex: 9 }).text);
check('no beat repeats a line within a block', ['crossline', 'iron-row', 'afterlight'].every(g => {
  const texts = contactScript(g).map(c => c.text);
  return new Set(texts).size === texts.length;
}));
check('each praise line is used by exactly one beat', ['crossline', 'iron-row', 'afterlight'].every(g => {
  const used = CONTACT_BEATS.filter(b => Number.isInteger(b.praise)).map(b => b.praise);
  return new Set(used).size === used.length && used.length === gangContacts(g).primary.lines.praise.length;
}));
check('the first check-in congratulates three clears, the last twelve', ['crossline', 'iron-row', 'afterlight'].every(g => {
  const p = gangContacts(g).primary.lines.praise;
  return contactCue({ gangID: g, house: 4 }).text === p[0] && contactCue({ gangID: g, house: 13 }).text === p[2];
}));
check('no cue without a gang', contactCue({ house: 4 }) === null && contactCue({ gangID: 'nope', house: 4 }) === null);
check('no cue on a quiet house', contactCue({ gangID: 'crossline', house: 5 }) === null);
check('no cue without arguments', contactCue() === null);
const debrief = h => contactCue({ gangID: 'afterlight', house: 10, missionOutcome: h });
check('debrief follows the mission outcome',
  debrief('win').text === contact('vee').lines.debriefWin && debrief('miss').text === contact('vee').lines.debriefMiss);
check('unknown outcome never claims one happened',
  debrief(null).text !== contact('vee').lines.debriefWin && debrief(null).text !== contact('vee').lines.debriefMiss);
check('brief action names the house it briefs',
  contactCue({ gangID: 'crossline', house: CONTACT_TARGET_HOUSE }).action.includes(String(CONTACT_TARGET_HOUSE)));

// --- panel geometry -------------------------------------------------------
const VIEWPORTS = [[280, 480], [320, 568], [390, 844], [414, 896], [768, 1024], [1440, 900]];
for (const [w, h] of VIEWPORTS) {
  for (const c of CONTACTS) {
    const a = contactPanelLayout(w, h, c);
    const tag = c.id + ' at ' + w + 'x' + h;
    // Every real line this contact can speak must fit above the advance.
    for (const line of Object.values(c.lines).flat().filter(Boolean)) {
      const box = contactPanelLayout(w, h, c, line);
      const copyBottom = box.dialogue.y - box.dialogue.h / 2 + box.dialogue.copyTop
        + box.dialogue.lines * box.dialogue.lineHeight;
      check('copy clears the advance ' + tag, copyBottom <= box.action.y - box.action.h / 2 + 0.001);
      check('copy stays inside its box ' + tag, copyBottom <= box.dialogue.y + box.dialogue.h / 2);
      check('box never eats the panel ' + tag, box.dialogue.h <= box.panelH * 0.42 + 0.001);
      check('box still fits the panel ' + tag,
        box.dialogue.y - box.dialogue.h / 2 > box.panelTop && box.dialogue.y + box.dialogue.h / 2 <= box.panelBottom);
    }
    check('panel inside the viewport ' + tag,
      a.panelW <= w && a.panelH <= h && a.panelTop >= 0 && a.panelBottom <= h);
    check('backdrop covers the panel ' + tag, a.coverW >= a.panelW - 0.001 && a.coverH >= a.panelH - 0.001);
    check('backdrop keeps its 2:3 ratio ' + tag, Math.abs(a.coverW / a.coverH - 1024 / 1536) < 1e-6);
    check('dialogue inside the panel ' + tag,
      a.dialogue.y - a.dialogue.h / 2 > a.panelTop && a.dialogue.y + a.dialogue.h / 2 <= a.panelBottom);
    check('advance inside the dialogue ' + tag,
      a.action.x + a.action.w / 2 <= a.dialogue.x + a.dialogue.w / 2 &&
      a.action.y + a.action.h / 2 <= a.dialogue.y + a.dialogue.h / 2 + 0.001);
    check('advance sits bottom right ' + tag, a.action.x > a.dialogue.x);
    check('portrait never covers the copy ' + tag, a.portraitBaseY <= a.dialogue.y - a.dialogue.h / 2 + 8.001);
    check('portrait has real height ' + tag, a.portraitH > 40);
    check('portrait stays below the panel top ' + tag, a.portraitCenterY - a.portraitH / 2 >= a.panelTop - a.panelH * 0.5);
    check('body copy stays legible ' + tag, a.bodyFontPx >= 14 && a.bodyFontPx <= 20);
  }
}
check('foreground only where the art has one',
  contactPanelLayout(390, 844, contact('switch')).foreground !== null &&
  contactPanelLayout(390, 844, contact('brick')).foreground === null);
check('bad fractions cannot push a face off screen', (() => {
  const a = contactPanelLayout(390, 844, { heightFraction: 9, baseFraction: -4, foregroundStartFraction: 40 });
  return a.portraitH <= a.panelH * 0.95 && a.portraitBaseY <= a.dialogue.y && a.foreground.startFraction <= 0.95;
})());
check('missing fractions fall back', (() => {
  const a = contactPanelLayout(390, 844, {});
  return a.portraitH > 0 && a.foreground === null;
})());
check('tiny viewport clamps up', contactPanelLayout(10, 10, {}).w === 280);

console.log(passed + ' contact assertions passed');
