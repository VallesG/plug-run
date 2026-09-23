// The Block Rivals match, as data. Pure: no Phaser, no clock, no storage.
//
// A match moves through fixed stages, one at a time:
//
//   block -> searching -> found -> selecting -> ready -> (countdown -> racing)
//
// with two ways back: cancel/leave returns to the block, and a search that
// finds nobody lands on 'unavailable', from where the player can search again
// or go back. RivalsRace keeps the stage on the race object, so a scene restart
// (a resize, a phone rotating) resumes the same stage and cannot skip one.
//
// Nothing here chooses an opponent; utils/rivalSession.findRivalMatch does,
// from real records only. This module decides how long the search looks, how
// the lobby is laid out, and which words the moment uses.

export const RIVAL_MATCH_STAGES = Object.freeze({
  block: Object.freeze(['searching']),
  searching: Object.freeze(['found', 'unavailable', 'block']),
  unavailable: Object.freeze(['searching', 'block']),
  found: Object.freeze(['selecting', 'block']),
  selecting: Object.freeze(['ready', 'block']),
  ready: Object.freeze(['countdown']),
  countdown: Object.freeze(['racing']),
  racing: Object.freeze([])
});

export function canAdvanceMatch(from, to) {
  return !!RIVAL_MATCH_STAGES[from]?.includes(to);
}

/** Move `holder.entryStage` to `to` if that is the next legal stage. */
export function advanceMatch(holder, to) {
  if (!holder || !canAdvanceMatch(holder.entryStage, to)) return false;
  holder.entryStage = to;
  return true;
}

// ---------------------------------------------------------------------------
// Search length. Never longer than MATCH_SEARCH_CAP_MS. Most rivals turn up in
// a few seconds, some almost at once, a few near the cap. Each search first
// draws its own tempo, which shifts the weight between quick and slow, so two
// matches never share one fixed distribution; recent searches damp a band that
// just repeated and never allow two near-cap waits in a row.
// ---------------------------------------------------------------------------
export const MATCH_SEARCH_CAP_MS = 10000;
export const MATCH_SEARCH_BANDS = Object.freeze([
  Object.freeze({ band: 'quick', min: 650, max: 2100 }),
  Object.freeze({ band: 'steady', min: 2100, max: 5000 }),
  Object.freeze({ band: 'slow', min: 5000, max: 8000 }),
  Object.freeze({ band: 'edge', min: 8000, max: 9500 })
]);
// A search that finds nobody still looks for a while before saying so.
export const MATCH_EMPTY_MIN_MS = 3800;

export function planMatchSearch({ random = Math.random, recent = [] } = {}) {
  const r = () => { const v = Number(random()); return Number.isFinite(v) ? Math.min(0.999999, Math.max(0, v)) : 0.5; };
  const tempo = r();
  const weights = [0.44 - 0.3 * tempo, 0.34 + 0.04 * tempo, 0.15 + 0.2 * tempo, 0.04 + 0.08 * tempo];
  const last = (Array.isArray(recent) ? recent : []).slice(-2);
  const index = (band) => MATCH_SEARCH_BANDS.findIndex((b) => b.band === band);
  if (last.length === 2 && last[0] === last[1] && index(last[0]) >= 0) weights[index(last[0])] *= 0.3;
  if (last.at(-1) === 'edge') weights[3] = 0;
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = r() * total, pick = 0;
  while (pick < weights.length - 1 && roll >= weights[pick]) { roll -= weights[pick]; pick++; }
  const { band, min, max } = MATCH_SEARCH_BANDS[pick];
  // Skewed inside the band, and the skew itself varies per search.
  const revealMs = Math.round(min + (max - min) * Math.pow(r(), 0.7 + r() * 0.9));
  return { band, revealMs: Math.min(revealMs, MATCH_SEARCH_CAP_MS - 400) };
}

/**
 * When the search screen should settle, given the plan and when (if) the
 * lookup finished: the later of the two, never past the cap. Null while the
 * lookup is still running and the cap has not come.
 */
export function matchSettleAt({ startedAt, revealMs, loadedAt = null, found = false, cap = MATCH_SEARCH_CAP_MS }) {
  const capAt = startedAt + cap;
  if (!Number.isFinite(loadedAt)) return null;
  const wanted = startedAt + (found ? revealMs : Math.max(revealMs, MATCH_EMPTY_MIN_MS));
  return Math.min(capAt, Math.max(wanted, loadedAt));
}

/**
 * How the rival compares, from measured numbers only: the player's pace
 * estimate and the rival's benchmark on this course's house scales. Null
 * when either is unknown — nothing is shown rather than a guess.
 */
export function matchQuality(playerEstimateMs, rivalBenchmarkMs) {
  if (!(playerEstimateMs > 0) || !(rivalBenchmarkMs > 0)) return null;
  const ratio = rivalBenchmarkMs / playerEstimateMs;
  if (ratio < 0.9) return 'TOUGH RIVAL';
  if (ratio > 1.1) return 'YOU HAVE THE EDGE';
  return 'EVEN MATCH';
}

/** Search clock text, 0:00 onwards. */
export function matchClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

/** The one letter on a rival's badge. */
const NAME_PREFIX = /^\s*(?:RIVAL|BOT|AI)\s*[·:—-]?\s*/i;
export function rivalMonogram(name) {
  const clean = String(name ?? "").replace(NAME_PREFIX, "").trim();
  const letter = clean.match(/[A-Za-z0-9]/)?.[0];
  return letter ? letter.toUpperCase() : 'R';
}

/** A name short enough for the race HUD, or null when only RIVAL fits. */
export function rivalShortName(name, max = 10) {
  const clean = String(name || '').trim();
  if (!clean || clean.length > max || /\bBOT\b|\bAI\b|·/i.test(clean)) return null;
  return clean.toUpperCase();
}

// ---------------------------------------------------------------------------
// Lobby geometry. Search, reveal and lobby are the SAME screen in different
// states: the you-vs-rival header and the block stay put from the first tap
// to READY; the rival's empty slot fills when one is found, and the zone under
// the block goes from the search status to your powers. The rival's powers are
// never shown before the race.
//
//   header  you vs rival
//   art     the block (existing block-map art)
//   name    the course name, with arrows when there is a choice
//   zone    = powers: search status, reveal, then your power picker
//   footer  CANCEL, or LEAVE / READY
//
// Wide screens put art and name on the left and the rest on the right. Every
// rectangle is inside the screen and none overlap; test/rivalMatchmaking.test
// checks phones down to 320x568 and landscape phones.
// ---------------------------------------------------------------------------
export const LOBBY_NAME_ROW = 34;
export function rivalLobbyLayout(width, height) {
  const W = Math.max(1, Number(width) || 1), H = Math.max(1, Number(height) || 1);
  const wide = W >= 520 && W >= H * 1.25;
  const edge = W < 360 ? 12 : 16;
  const buttonH = H < 600 ? 44 : 48;
  if (!wide) {
    const colW = Math.min(W - edge * 2, 440), x = (W - colW) / 2;
    const top = H < 620 ? 8 : 16;
    const header = { x, y: top, w: colW, h: Math.round(Math.max(80, Math.min(100, H * 0.115))) };
    const footer = { x, y: H - (H < 620 ? 12 : 20) - buttonH, w: colW, h: buttonH };
    const powers = { x, y: footer.y - 14 - Math.round(Math.max(112, Math.min(150, H * 0.18))), w: colW, h: 0 };
    powers.h = footer.y - 14 - powers.y;
    const art = { x, y: header.y + header.h + 6, w: colW, h: 0 };
    art.h = Math.max(60, powers.y - 8 - LOBBY_NAME_ROW - art.y);
    const name = { x, y: art.y + art.h, w: colW, h: LOBBY_NAME_ROW };
    return { wide, header, art, name, powers, zone: { ...powers }, footer, buttonH };
  }
  const gap = 24;
  const total = Math.min(W - edge * 2, 980);
  const left = (W - total) / 2;
  const top = H < 480 ? 8 : 18;
  const mapW = Math.round(Math.min(total * 0.5, (H - top * 2 - LOBBY_NAME_ROW) * 200 / 220 + 24));
  const colX = left + mapW + gap, colW = total - mapW - gap;
  const header = { x: colX, y: top, w: colW, h: Math.round(Math.max(72, Math.min(100, H * 0.2))) };
  const footer = { x: colX, y: H - (H < 480 ? 10 : 20) - buttonH, w: colW, h: buttonH };
  // Your powers sit centred between header and footer.
  const bandTop = header.y + header.h + 8, bandBottom = footer.y - 12;
  const powersH = Math.round(Math.max(100, Math.min(150, bandBottom - bandTop)));
  const powers = { x: colX, y: Math.max(bandTop, Math.round(bandTop + (bandBottom - bandTop - powersH) / 2)), w: colW, h: powersH };
  const art = { x: left, y: top, w: mapW, h: H - top * 2 - LOBBY_NAME_ROW };
  const name = { x: left, y: art.y + art.h, w: mapW, h: LOBBY_NAME_ROW };
  return { wide, header, art, name, powers, zone: { ...powers }, footer, buttonH };
}
