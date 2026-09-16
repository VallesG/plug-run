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
      praise: [
        'Three houses, three ways out. The street noticed.',
        'Nine houses. You keep moving like that and I stop worrying.',
        'Twelve down. Nobody on this frequency is doubting you now.'
      ],
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
      brief: 'There is a document tube in this house. Bring it out with the real stash — not instead of it.',
      reminder: 'Tube first if you can. The bag is still what gets you paid.'
    }
  },
  {
    id: 'brick', name: 'Brick', gangID: 'iron-row', gang: 'Iron Row', role: 'primary',
    setting: 'The Garage',
    voice: 'Direct and protective. Counts exits before compliments.',
    accent: 0xb85f45, css: '#b85f45',
    portraitKey: 'contact_cast', portraitSource: '/art/the-window/cast.webp',
    frame: castFrame(0, 397), expressions: 1,
    background: '/art/the-window/contacts/locations/brick-garage.webp',
    heightFraction: 0.6, baseFraction: 0.76, foregroundStartFraction: null,
    lines: {
      praise: [
        'Three clean exits. Keep your head on the next one.',
        'Nine deep and still walking. That is the whole job.',
        'Twelve. You have earned the right to be tired — not careless.'
      ],
      tease: 'Rook has a job he will not hand to just anyone. He wants to see you first.',
      debriefWin: 'You brought back his keys and the bag. Iron Row finishes what it starts.',
      debriefMiss: 'No keys, but you got out. Do it right next time.'
    }
  },
  {
    id: 'rook', name: 'Rook', gangID: 'iron-row', gang: 'Iron Row', role: 'secondary',
    setting: 'The Service Room',
    voice: 'Keeps the building honest. Dry, practical, everything on a keyring.',
    accent: 0x7d97ad, css: '#7d97ad',
    portraitKey: 'contact_cast', portraitSource: '/art/the-window/cast.webp',
    frame: castFrame(1587, 396), expressions: 1,
    background: '/art/the-window/contacts/locations/rook-maintenance.webp',
    heightFraction: 0.6, baseFraction: 0.76, foregroundStartFraction: null,
    lines: {
      brief: 'Service keys are in that house. Take them and the real stash — either one alone wastes the trip.',
      reminder: 'Keys and the bag. Both, or neither counts.'
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
      praise: [
        'Three in a row and you made it look easy. Keep it that way.',
        'Nine houses in and they are describing you, not your gang.',
        'Twelve houses. Whatever you are doing, do it where they can see you.'
      ],
      tease: 'Sol wants you for something. He only asks runners he expects to finish.',
      debriefWin: 'Sol got his marker and you kept the bag. That is the version people repeat.',
      debriefMiss: 'You left it behind. The run still counts — the story does not.'
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
      brief: 'My paint marker is sitting in that house. Grab it and the real stash on the way out.',
      reminder: 'Marker and bag. Two pickups, one exit.'
    }
  }
];

export const CONTACTS = Object.freeze(CONTACT_LIST.map(c => Object.freeze({
  ...c, lines: Object.freeze({ ...c.lines, praise: c.lines.praise ? Object.freeze([...c.lines.praise]) : undefined })
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
export function contactBeat(house) {
  return CONTACT_BEATS.find(b => b.house === house) || null;
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
export function contactCue({ gangID, house, blockIndex = 1, missionOutcome = null } = {}) {
  const beat = contactBeat(house);
  const pair = gangContacts(gangID);
  if (!beat || !pair) return null;
  const who = beat.role === 'secondary' ? pair.secondary : pair.primary;
  const praise = who.lines.praise?.[beat.praise] ?? null;
  let text = null;
  if (beat.kind === 'praise') text = praise;
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
    beat, contact: who, text,
    speaker: who.name.toUpperCase(),
    action: beat.kind === 'brief' ? 'ENTER HOUSE ' + house + '  >>' : 'KEEP MOVING  >>'
  };
}

/** Every beat a gang can show in one block. Used by tests and the preview. */
export function contactScript(gangID, blockIndex = 1) {
  return CONTACT_BEATS.map(b => contactCue({ gangID, house: b.house, blockIndex })).filter(Boolean);
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
