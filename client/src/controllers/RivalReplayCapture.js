// RivalReplayCapture — samples a live Rivals house into portable segments.
//
// NO PHASER IMPORTS ON PURPOSE. This reads plain fields off the scene
// (positions, flags, groups) and writes the format in logic/rivalReplay.js,
// so it can be exercised under plain Node against a stub scene the same way
// BotDriver is. The scene adapter (RivalsRace) owns WHEN to call these; this
// file owns WHAT gets recorded.
//
// WHAT IT RECORDS
// Semantic state in grid cells at 15Hz plus discrete events. The house itself
// is not recorded; playback regenerates it from the house seed. Which stash
// is real is not recorded either; it becomes knowable at the pickup event,
// which is exactly when the runner learned it.
//
// The race-level capture lives on the race object (race.capture) because that
// is the one thing RivalsRace carries across scene.restart(); the scene and
// every display object are rebuilt per house.
import { RIVAL_RULES_VERSION, rivalElapsed } from '../logic/rivals.js';
import {
  RIVAL_REPLAY_STEP_MS, newReplaySegment, packFlags, pushReplayFrame, pushReplayEvent, sealReplaySegment
} from '../logic/rivalReplay.js';
import { buildRivalRunRecord, buildRivalReplayBundle, rivalAttemptErrors } from '../logic/rivalRecords.js';

export function beginRaceCapture(race, { recordingID = null } = {}) {
  race.capture = { recordingID, attempts: [], segments: [], houseAttempts: {}, current: null };
  return race.capture;
}

function cellOf(scene, x, y) {
  const cell = scene.cell || 24, pad = scene.pad || { x: 0, y: 0 };
  return { x: (x - pad.x) / cell, y: (y - pad.y) / cell };
}
function centerOf(cell) { return cell ? { x: cell.x + 0.5, y: cell.y + 0.5 } : { x: 0, y: 0 }; }
function alive(o) { return !!(o && o.active !== false && o.visible !== false); }
function angleOf(dir) { return dir ? Math.atan2(dir.y, dir.x) * 180 / Math.PI : 0; }

/** Call when a house's clock starts (RivalsRace.resumeHouse -> startTimer). */
export function beginAttemptCapture(scene, race, now) {
  const cap = race.capture;
  if (!cap || cap.current) return null;
  const house = scene.pveRound || 1;
  cap.houseAttempts[house] = (cap.houseAttempts[house] || 0) + 1;
  const carSide = scene.egress?.side ?? null;
  const seg = newReplaySegment({
    house, attempt: cap.houseAttempts[house],
    houseSeed: scene.seed >>> 0, cols: scene.cols, rows: scene.rows,
    scale: race.course?.scales?.[house - 1] ?? 1,
    stashes: [centerOf(scene.stashCell), centerOf(scene.extractCell)],
    car: { ...(scene.car ? cellOf(scene, scene.car.x, scene.car.y) : centerOf(scene.egress?.entry)), side: carSide },
    runnerSpawn: scene.attacker ? cellOf(scene, scene.attacker.x, scene.attacker.y) : { x: 0, y: 0 },
    plugSpawn: scene.defender ? cellOf(scene, scene.defender.x, scene.defender.y) : { x: 0, y: 0 },
    weapon: scene.allowedGuns?.[0] ?? scene.weapon ?? null
  });
  cap.current = {
    house, attempt: seg.attempt, startedMs: rivalElapsed(race, now), t0: now, nextSampleAt: now, seg,
    seenBullets: new WeakSet(), lastShotT: -1, hadStash: false, bunked: [false, false],
    powers: [...(scene.runnerPowersConsumed || [false, false])], hp: scene.attacker?.hp ?? null, dead: false
  };
  return cap.current;
}

function sampleState(scene) {
  const a = scene.attacker;
  const hitting = o => !!(o && o.iUntil && performance.now() < o.iUntil);
  const runner = a ? {
    ...cellOf(scene, a.x, a.y),
    flags: packFlags({
      phase: !!scene.runnerIsPhasing?.(), carry: !!scene.hasStash, hidden: !alive(a),
      hit: hitting(a), angle: a._faceAng ?? angleOf(scene._runnerInputDir || scene._runnerLastAim)
    })
  } : { x: 0, y: 0, flags: packFlags({ hidden: true }) };
  const plugs = [scene.defender, scene.defender2].filter(alive).map((p, i) => ({
    ...cellOf(scene, p.x, p.y),
    flags: packFlags({ hit: hitting(p), angle: p._faceAng ?? angleOf(i ? scene.aiAim2 : scene.aiAim) })
  }));
  const bullets = [];
  for (const group of [scene.bulletsD, scene.bulletsA]) {
    for (const b of group?.getChildren?.() || []) if (alive(b)) bullets.push(cellOf(scene, b.x, b.y));
  }
  const decoy = scene.decoySprite && alive(scene.decoySprite) ? cellOf(scene, scene.decoySprite.x, scene.decoySprite.y) : null;
  return { runner, plugs, bullets, decoy };
}

/** Call every frame while racing. Samples at 15Hz; events on transitions. */
export function tickAttemptCapture(scene, race, now) {
  const cur = race.capture?.current;
  if (!cur) return false;
  const t = now - cur.t0;
  // Events are checked every frame so a one-frame transition is never missed
  // between samples.
  for (const group of [scene.bulletsD, scene.bulletsA]) {
    for (const b of group?.getChildren?.() || []) {
      if (!b || cur.seenBullets.has(b)) continue;
      cur.seenBullets.add(b);
      // One event per burst, not per pellet: a triple barrel is one shot.
      if (Math.round(t) !== cur.lastShotT) {
        cur.lastShotT = Math.round(t);
        const c = cellOf(scene, b.x, b.y);
        pushReplayEvent(cur.seg, t, 'shot', { who: group === scene.bulletsA ? 'r' : 'p', x: Math.round(c.x * 100) / 100, y: Math.round(c.y * 100) / 100 });
      }
    }
  }
  if (!cur.hadStash && scene.hasStash) {
    cur.hadStash = true;
    const real = scene.stash ? cellOf(scene, scene.stash.x, scene.stash.y) : null;
    const i = real ? nearestStash(cur.seg.stashes, real) : 0;
    pushReplayEvent(cur.seg, t, 'pickup', { i });
  }
  const bunk = scene.bunkStash;
  if (bunk && bunk._fading && !cur.bunked[0] && !cur.bunked[1]) {
    const i = nearestStash(cur.seg.stashes, cellOf(scene, bunk.x, bunk.y));
    cur.bunked[i] = true;
    pushReplayEvent(cur.seg, t, 'bunk', { i });
  }
  const used = scene.runnerPowersConsumed || [];
  for (let slot = 0; slot < used.length; slot++) {
    if (used[slot] && !cur.powers[slot]) {
      cur.powers[slot] = true;
      pushReplayEvent(cur.seg, t, 'power', { slot, power: scene.runnerPowersSelected?.[slot] ?? null });
    }
  }
  const hp = scene.attacker?.hp;
  if (Number.isFinite(hp) && Number.isFinite(cur.hp) && hp < cur.hp) {
    pushReplayEvent(cur.seg, t, hp <= 0 ? 'death' : 'hit', { hp });
    if (hp <= 0) cur.dead = true;
  }
  if (Number.isFinite(hp)) cur.hp = hp;

  if (now < cur.nextSampleAt) return false;
  cur.nextSampleAt = Math.max(cur.nextSampleAt + RIVAL_REPLAY_STEP_MS, now - RIVAL_REPLAY_STEP_MS);
  return pushReplayFrame(cur.seg, t, sampleState(scene));
}
function nearestStash(stashes, c) {
  const d = stashes.map(s => Math.hypot(s.x - c.x, s.y - c.y));
  return d[1] < d[0] ? 1 : 0;
}

/**
 * Close the attempt. outcome: 'extracted' | 'caught' | 'timeout' | 'abandoned'.
 * 'abandoned' (a resize, a forfeit, the opponent finishing first) is kept for
 * the spectator bundle but makes the race unexportable as a record.
 */
export function endAttemptCapture(scene, race, outcome, now) {
  const cap = race.capture, cur = cap?.current;
  if (!cur) return null;
  const t = now - cur.t0;
  // A final sample so the last frame is where the attempt actually ended.
  pushReplayFrame(cur.seg, t, sampleState(scene));
  if (outcome === 'extracted') pushReplayEvent(cur.seg, t, 'extract');
  else if (outcome === 'timeout') pushReplayEvent(cur.seg, t, 'timeout');
  else if (outcome === 'caught' && !cur.dead) pushReplayEvent(cur.seg, t, 'death', { hp: 0 });
  sealReplaySegment(cur.seg, t);
  const endedMs = rivalElapsed(race, now);
  const attempt = { house: cur.house, attempt: cur.attempt, startedMs: cur.startedMs, endedMs, outcome };
  if (outcome === 'extracted') attempt.clearMs = endedMs;
  cap.attempts.push(attempt);
  cap.segments.push(cur.seg);
  cap.current = null;
  return attempt;
}

/**
 * Turn a finished capture into the two artifacts, or explain why not. A race
 * that did not clear all seven houses, or has an abandoned attempt, is
 * reported, never exported.
 */
export function exportRaceCapture(race, { opponent, recordingID, recordedAt = null, driverConfig = null } = {}) {
  const cap = race.capture;
  if (!cap) return { ok: false, reason: 'no capture' };
  if (cap.current) return { ok: false, reason: 'attempt still open' };
  if (cap.attempts.some(a => a.outcome === 'abandoned')) return { ok: false, reason: 'race has an abandoned attempt' };
  const errors = rivalAttemptErrors(cap.attempts);
  if (errors.length) return { ok: false, reason: errors[0] };
  // The race clock is the record; the attempt list must agree with it.
  const clears = cap.attempts.filter(a => a.outcome === 'extracted').map(a => a.clearMs);
  if (JSON.stringify(clears) !== JSON.stringify(race.clearTimes)) return { ok: false, reason: 'capture clears disagree with race clock' };
  try {
    const record = buildRivalRunRecord({
      rulesVersion: RIVAL_RULES_VERSION, course: race.course, opponent, orderedPowers: race.powers,
      attempts: cap.attempts, recordingID: recordingID ?? cap.recordingID, recordedAt, driverConfig
    });
    return { ok: true, record, bundle: buildRivalReplayBundle(record, cap.segments) };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}
