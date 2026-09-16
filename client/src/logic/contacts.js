// Gang contacts in the running loop. Pure: no imports, no Phaser, no storage.
//
// WHAT THIS OWNS
// Who talks, where they stand, what they say and when. Rendering lives in
// controllers/ContactPanel.js; persistence lives in utils/contactProgress.js.
// Keeping the content here means the whole cast can be exercised headlessly —
// every gang, every beat, every line length — without a browser.
//
// WHAT IT DELIBERATELY DOES NOT OWN
// Mission definition, item placement, REP or Cash. Those are later slices with
// their own state contracts. `CONTACT_TARGET_HOUSE` below is a provisional
// pacing number, not a shipped mission.
export const CONTACT_CONTENT_VERSION = 1;

// Beats are placed on the PRE-house entrance seam: the number is the house the
// player is about to enter, so house 4 is the check-in after three clears.
// Derived from the suggested pacing in CLAUDE_GAMEPLAY_CONTACTS_HANDOFF.md.
export const CONTACT_TARGET_HOUSE = 9;      // provisional; mission slice decides
export const CONTACT_BEATS = Object.freeze([
  Object.freeze({ id: 'open',      house: 1,  role: 'primary',   kind: 'open',    clears: 0 }),
  Object.freeze({ id: 'checkin-1', house: 4,  role: 'primary',   kind: 'praise',  clears: 3,  praise: 0 }),
  Object.freeze({ id: 'tease',     house: 7,  role: 'primary',   kind: 'tease',   clears: 6 }),
  Object.freeze({ id: 'brief',     house: 9,  role: 'secondary', kind: 'brief',   clears: 8 }),
  Object.freeze({ id: 'debrief',   house: 10, role: 'primary',   kind: 'debrief', clears: 9,  praise: 1 }),
  Object.freeze({ id: 'checkin-2', house: 13, role: 'primary',   kind: 'praise',  clears: 12, praise: 2 })
]);

// Placement fractions below are the reviewed values from the art manifest, and
// contactArt.test.mjs asserts the two never drift apart. Only The Dispatch and
// The Map Room carry a foreground crop: rendering the six rooms showed that
// Brick's garage, Rook's service room, Vee's studio and Sol's night bay have
// no full-width furniture at body height to pass in front of a character.
// The two desk lines are Codex's starting fractions and still want a phone
// review — too low and a desk covers hands and faces.
//
// Portrait frames mirror WINDOW_ART in logic/window.js. They are repeated here
// rather than imported because this module must stay import-free; the contact
// art suite asserts the two agree, so a drift fails a test instead of shipping.
const SWITCH_FRAME = Object.freeze({ x: 0, width: 724, height: 724, sheetWidth: 2172 });
const castFrame = (x, width) => Object.freeze({ x, width, height: 793, sheetWidth: 1983 });

const CONTACT_LIST = [
  {
    id: 'switch', name: 'Switch', gangID: 'crossline', gang: 'Crossline', role: 'primary',
    setting: 'The Dispatch',
    voice: 'Reads the street and keeps everyone pointed the same way. Warm, quick, never still.',
    accent: 0x43b5c7, css: '#43b5c7',
    portraitKey: 'contact_switch', portraitSource: '/art/the-window/switch.webp',
    frame: SWITCH_FRAME, expressions: 3,
    background: '/art/the-window/contacts/locations/switch-dispatch.webp',
    heightFraction: 0.44, baseFraction: 0.74, foregroundStartFraction: 0.7,
    lines: {
      open: 'We need this whole block emptied, quiet. Something bigger is coming and it runs on what you carry out.',
      praise: {
        base: [
          'Three houses, three ways out. The street noticed.',
          'Nine houses. You keep moving like that and I stop worrying.',
          'Twelve down. Nobody on this frequency is doubting you now.'
        ],
        flawless: 'Nobody has laid a finger on you yet. I am going to start making things up about you.',
        comeback: 'You have been put down more than once and you are still on my frequency. That counts.',
        noPowers: 'All that and you have not burned a single power. Showing off is allowed.',
        phase: 'You keep walking straight through the walls. Half the street thinks I am lying about you.',
        dash: 'Every time it gets close you are already gone. Keep moving like that.',
        decoy: 'Sending doubles into the dark. That is the kind of thing people repeat.',
        bunk: 'You have come up with a couple of empty bags. Slow down one beat and read the room.',
        noDeaths: 'Still nobody has put you down. Keep it that way.'
      },
      tease: 'Mags has been asking about you. She has something she only trusts to a runner who finishes.',
      debriefWin: 'Mags got her tube. Crossline owes you one, and I do not say that twice.',
      debriefMiss: 'You came out without it, but the bag still counts. Go again.'
    }
  },
  {
    id: 'mags', name: 'Mags', gangID: 'crossline', gang: 'Crossline', role: 'secondary',
    setting: 'The Map Room',
    voice: 'Plans the route before anyone moves. Precise, unhurried, allergic to guessing.',
    accent: 0x6fbf8f, css: '#6fbf8f',
    portraitKey: 'contact_cast', portraitSource: '/art/the-window/cast.webp',
    frame: castFrame(1191, 396), expressions: 1,
    background: '/art/the-window/contacts/locations/mags-planning.webp',
    heightFraction: 0.58, baseFraction: 0.75, foregroundStartFraction: 0.65,
    lines: {
      brief: 'The document tube is in this house. Grab it and the stash; you need both to leave.',
      reminder: 'Tube and bag. Find the violet case before you head for the car.'
    }
  },
  {
    id: 'brick', name: 'Brick', gangID: 'iron-row', gang: 'Iron Row', role: 'primary',
    setting: 'The Garage',
    voice: 'Direct and protective. Counts exits before compliments.',
    accent: 0xd2c66a, css: '#d2c66a',
    portraitKey: 'contact_cast', portraitSource: '/art/the-window/cast.webp',
    frame: castFrame(0, 397), expressions: 1,
    background: '/art/the-window/contacts/locations/brick-garage.webp',
    heightFraction: 0.6, baseFraction: 0.76, foregroundStartFraction: null,
    lines: {
      open: 'Fifteen houses on this block. Iron Row needs every bag, because what comes after is not small.',
      praise: {
        base: [
          'Three clean exits. Keep your head on the next one.',
          'Nine deep and still walking. That is the whole job.',
          'Twelve. You have earned the right to be tired — not careless.'
        ],
        flawless: 'Not a mark on you. That is what finishing clean actually looks like.',
        comeback: 'You have been dropped and you keep getting back up. I respect that more than a clean run.',
        noPowers: 'You have not spent a thing yet. Save it for the house that needs it.',
        phase: 'Straight through the walls every time. Just do not get comfortable in there.',
        dash: 'You run when it is time to run. That is what keeps people alive.',
        decoy: 'Letting the double take the shots. Smart, and cheaper than getting hit.',
        bunk: 'Couple of empty bags now. Look before you commit to one.',
        noDeaths: 'Nobody has dropped you yet. Do not make me come out there.'
      },
      tease: 'Rook has a job he will not hand to just anyone. He wants to see you first.',
      debriefWin: 'You brought back his keys and the bag. Iron Row finishes what it starts.',
      debriefMiss: 'No keys, but you got out. Do it right next time.'
    }
  },
  {
    id: 'rook', name: 'Rook', gangID: 'iron-row', gang: 'Iron Row', role: 'secondary',
    setting: 'The Service Room',
    voice: 'Keeps the building honest. Dry, practical, everything on a keyring.',
    accent: 0xa7b58a, css: '#a7b58a',
    portraitKey: 'contact_cast', portraitSource: '/art/the-window/cast.webp',
    frame: castFrame(1587, 396), expressions: 1,
    background: '/art/the-window/contacts/locations/rook-maintenance.webp',
    heightFraction: 0.6, baseFraction: 0.76, foregroundStartFraction: null,
    lines: {
      brief: 'Service keys are in the violet case. Grab them and the stash; you need both to leave.',
      reminder: 'Keys and bag. The car is not leaving without both.'
    }
  },
  {
    id: 'vee', name: 'Vee', gangID: 'afterlight', gang: 'Afterlight', role: 'primary',
    setting: 'The Paint Room',
    voice: 'Stylish and competitive. Treats every run as something the city is watching.',
    accent: 0x9b78d0, css: '#9b78d0',
    portraitKey: 'contact_cast', portraitSource: '/art/the-window/cast.webp',
    frame: castFrame(397, 397), expressions: 1,
    background: '/art/the-window/contacts/locations/vee-studio.webp',
    heightFraction: 0.6, baseFraction: 0.76, foregroundStartFraction: null,
    lines: {
      open: 'Empty this block for us. There is something big on the other side of it and I want us holding the bags.',
      praise: {
        base: [
          'Three in a row and you made it look easy. Keep it that way.',
          'Nine houses in and they are describing you, not your gang.',
          'Twelve houses. Whatever you are doing, do it where they can see you.'
        ],
        flawless: 'Not one scratch on you. Do you have any idea how that looks from out here?',
        comeback: 'You have hit the floor more than once and got back up. Better story anyway.',
        noPowers: 'No powers spent and you are still ahead. That is the flex.',
        phase: 'Walking through walls like it costs nothing. Keep doing it where people can see.',
        dash: 'Gone before they finish aiming. That is the whole look.',
        decoy: 'You let a fake take the heat for you, and I love it.',
        bunk: 'You keep coming up with empty bags. Not your best angle.',
        noDeaths: 'Still standing. Stay that way, it photographs better.'
      },
      tease: 'Sol wants you for something. He only asks runners he expects to finish.',
      debriefWin: 'Sol got his marker and you kept the bag. That is the version people repeat.',
      debriefMiss: 'That earlier job slipped past us. Keep the bags coming; Sol will have another setup next block.'
    }
  },
  {
    id: 'sol', name: 'Sol', gangID: 'afterlight', gang: 'Afterlight', role: 'secondary',
    setting: 'The Night Bay',
    voice: 'Fast talker, faster hands. Turns every job into a time to beat.',
    accent: 0xe2a24f, css: '#e2a24f',
    portraitKey: 'contact_cast', portraitSource: '/art/the-window/cast.webp',
    frame: castFrame(794, 397), expressions: 1,
    background: '/art/the-window/contacts/locations/sol-race.webp',
    heightFraction: 0.6, baseFraction: 0.76, foregroundStartFraction: null,
    lines: {
      brief: 'My paint marker is in the violet case. Grab it and the stash before you head for the car.',
      reminder: 'Marker and bag. Two pickups, one exit.'
    }
  }
];

export const CONTACTS = Object.freeze(CONTACT_LIST.map(c => Object.freeze({
  ...c,
  lines: Object.freeze({
    ...c.lines,
    praise: c.lines.praise
      ? Object.freeze({ ...c.lines.praise, base: Object.freeze([...c.lines.praise.base]) })
      : undefined
  })
})));

export function contact(id) {
  return CONTACTS.find(c => c.id === id) || null;
}
/** The two faces a gang shows in the running loop. Null for an unknown gang. */
export function gangContacts(gangID) {
  const primary = CONTACTS.find(c => c.gangID === gangID && c.role === 'primary');
  const secondary = CONTACTS.find(c => c.gangID === gangID && c.role === 'secondary');
  return primary && secondary ? { primary, secondary } : null;
}
/**
 * The job contact whose object belongs in this house, or null.
 *
 * One house per block carries a mission, and only for a chosen gang. The
 * scene asks this rather than comparing house numbers itself, so the brief
 * and the object on the floor can never drift apart.
 */
export function activeMissionContact(gangID, house) {
  const beat = contactBeat(house);
  const pair = gangContacts(gangID);
  if (!beat || beat.kind !== 'brief' || !pair) return null;
  return pair.secondary;
}

export function contactBeat(house) {
  return CONTACT_BEATS.find(b => b.house === house) || null;
}

/**
 * Which praise a run has earned, or null for the plain milestone line.
 *
 * Order is priority, and every branch is something the game observed and the
 * player will remember doing. Nothing here may fire on an absence of data: a
 * block with no cleared houses earns no compliment at all.
 */
export const PRAISE_KEYS = Object.freeze(['flawless', 'comeback', 'noPowers', 'bunk', 'phase', 'dash', 'decoy', 'noDeaths']);

export function praiseEarned(stats) {
  if (!stats || !stats.houses || stats.telemetryComplete === false) return [];
  const earned = [];
  if (stats.flawless) earned.push('flawless');
  if (stats.deaths >= 3) earned.push('comeback');
  if (stats.powersUsed === 0) earned.push('noPowers');
  if (stats.bunks >= 2) earned.push('bunk');
  if (stats.topPower) earned.push(stats.topPower);
  if (stats.noDeaths) earned.push('noDeaths');
  return earned;
}

/**
 * Which praise a run has earned, or null for the plain milestone line.
 *
 * Priority order, and every branch is something the game observed. A variant
 * already spoken in this block is skipped: on a clean run the same compliment
 * would otherwise land at houses 4, 10 and 13 word for word, which reads like
 * a machine. Falling through to the milestone line is the honest alternative.
 */
export function praiseKey(stats, used = []) {
  const spent = new Set(Array.isArray(used) ? used : []);
  return praiseEarned(stats).find(key => !spent.has(key)) ?? null;
}

// No randomness anywhere in here. Each praise line is written for a specific
// number of clears ("Three houses...", "Halfway...", "Twelve..."), so the beat
// names its line by index. A reload, resize or retry cannot reroll dialogue,
// and a check-in cannot congratulate the player for the wrong milestone.
/**
 * The panel to show before entering `house`, or null when nobody speaks.
 *
 * `missionOutcome` is 'win' | 'miss' | null and only affects the debrief beat;
 * until the mission slice exists it is always null, which reads as a miss-free
 * generic line rather than claiming an outcome that never happened.
 */
export function contactCue({ gangID, house, blockIndex = 1, missionOutcome = null, stats = null, usedPraise = [] } = {}) {
  const beat = contactBeat(house);
  const pair = gangContacts(gangID);
  if (!beat || !pair) return null;
  const who = beat.role === 'secondary' ? pair.secondary : pair.primary;
  // The milestone line is the floor. A run that earned something specific
  // gets said back to it instead; if that line is missing, the floor holds.
  const earned = praiseKey(stats, usedPraise);
  const base = who.lines.praise?.base?.[beat.praise] ?? null;
  const praise = (earned && who.lines.praise?.[earned]) || base;
  let text = null;
  if (beat.kind === 'open') text = who.lines.open;
  else if (beat.kind === 'praise') text = praise;
  else if (beat.kind === 'tease') text = who.lines.tease;
  else if (beat.kind === 'brief') text = who.lines.brief;
  else if (beat.kind === 'debrief') {
    if (missionOutcome === 'win') text = who.lines.debriefWin;
    else if (missionOutcome === 'miss') text = who.lines.debriefMiss;
    else text = praise;   // no mission ran: never claim an outcome
  }
  if (!text) return null;
  return {
    // Scoped to account + block + beat by the caller; this half is the stable
    // content identity, so a content change does not silently replay a beat.
    eventID: 'contact/v' + CONTACT_CONTENT_VERSION + '/block-' + blockIndex + '/' + beat.id + '/' + who.id,
    beat, contact: who, text, praiseKey: earned && text === who.lines.praise?.[earned] ? earned : null,
    speaker: who.name.toUpperCase(),
    action: beat.kind === 'brief' ? 'ENTER HOUSE ' + house + '  >>'
      : beat.kind === 'open' ? 'RUN THE BLOCK  >>' : 'KEEP MOVING  >>'
  };
}

/** Every beat a gang can show in one block. Used by tests and the preview. */
export function contactScript(gangID, blockIndex = 1, stats = null) {
  // Walks the block the way a player does, so a repeated compliment shows up
  // in a test rather than in someone's game.
  const usedPraise = [];
  return CONTACT_BEATS.map(b => {
    const cue = contactCue({ gangID, house: b.house, blockIndex, stats, usedPraise });
    if (cue?.praiseKey) usedPraise.push(cue.praiseKey);
    return cue;
  }).filter(Boolean);
}

/**
 * Panel geometry, in the Auntie Ro grammar: backdrop fills the panel at its
 * own 2:3 ratio, portrait stands on the floor line, dialogue sits along the
 * bottom with the advance in its lower right.
 *
 * Fractions come from the reviewed art manifest but are clamped here, so a bad
 * manifest value cannot push a face off screen.
 */
export function contactPanelLayout(width, height, portraitFractions = {}, text = '') {
  const w = Math.max(280, Number.isFinite(width) ? width : 390);
  const h = Math.max(480, Number.isFinite(height) ? height : 844);
  const pad = Math.max(12, Math.floor(Math.min(w, h) * 0.035));
  const panelW = Math.min(560, w - pad * 2);
  const panelH = Math.min(760, h - pad * 2);
  const panelTop = (h - panelH) / 2;
  const panelBottom = panelTop + panelH;

  // Backdrops are 2:3. Cover the panel and centre the overflow rather than
  // stretching a painted room.
  const ratio = 1024 / 1536;
  const coverW = Math.max(panelW, panelH * ratio);
  const coverH = Math.max(panelH, panelW / ratio);

  const dialogueW = Math.min(panelW - pad * 2, 480);
  const bodyFontPx = Math.max(14, Math.min(20, Math.round(panelW * 0.046)));
  const actionH = 40;
  const actionW = Math.min(184, dialogueW - 28);

  // Size the box to the copy instead of guessing a range. Georgia averages
  // close to 0.5em per character at these sizes; the estimate is deliberately
  // generous, because a box one line too tall is invisible and a box one line
  // too short puts the advance button on top of the last sentence — which is
  // exactly what the first render of this panel did at 280x480.
  const charWidth = bodyFontPx * 0.5;
  const perLine = Math.max(10, Math.floor((dialogueW - 36) / charWidth));
  const words = String(text || '').split(/\s+/).filter(Boolean);
  let lines = words.length ? 1 : 1, used = 0;
  for (const word of words) {
    const add = used ? used + 1 + word.length : word.length;
    if (add > perLine) { lines++; used = word.length; } else used = add;
  }
  const lineHeight = Math.round(bodyFontPx * 1.2) + 5;
  const copyTop = 42;                       // speaker label sits above this
  const needed = copyTop + lines * lineHeight + 10 + actionH + 14;
  const dialogueH = Math.max(124, Math.min(needed, Math.floor(panelH * 0.42)));
  const dialogueY = panelBottom - dialogueH / 2 - pad;

  const clamp = (v, lo, hi, fallback) =>
    Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
  const heightFraction = clamp(portraitFractions.heightFraction, 0.2, 0.95, 0.55);
  const baseFraction = clamp(portraitFractions.baseFraction, heightFraction, 1, 0.75);
  const portraitH = panelH * heightFraction;
  // Keep the face clear of the dialogue box: the portrait's base may sit no
  // lower than the top of the copy.
  const baseY = Math.min(panelTop + panelH * baseFraction, dialogueY - dialogueH / 2 + 8);

  const foreground = Number.isFinite(portraitFractions.foregroundStartFraction)
    ? { startFraction: clamp(portraitFractions.foregroundStartFraction, 0.1, 0.95, 0.7) }
    : null;

  return {
    w, h, pad, panelW, panelH, panelTop, panelBottom,
    cx: w / 2, cy: panelTop + panelH / 2,
    coverW, coverH,
    portraitH, portraitCenterY: baseY - portraitH / 2, portraitBaseY: baseY,
    foreground,
    dialogue: { x: w / 2, y: dialogueY, w: dialogueW, h: dialogueH, copyTop, lines, lineHeight },
    action: {
      w: actionW, h: actionH,
      x: w / 2 + dialogueW / 2 - actionW / 2 - 14,
      y: dialogueY + dialogueH / 2 - actionH / 2 - 10
    },
    bodyFontPx
  };
}

/** Paginate prose before rendering; never shrink type or cover the last line. */
export function contactDialoguePages(text, width, height) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const pages = [];
  let current = '';
  const fits = value => {
    const a = contactPanelLayout(width, height, {}, value);
    const bottom = a.dialogue.y - a.dialogue.h / 2 + a.dialogue.copyTop
      + a.dialogue.lines * a.dialogue.lineHeight;
    return bottom <= a.action.y - a.action.h / 2;
  };
  for (const word of words) {
    const next = current ? current + ' ' + word : word;
    if (current && !fits(next)) { pages.push(current); current = word; }
    else current = next;
  }
  if (current) pages.push(current);
  return pages;
}
