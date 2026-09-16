// Portable replay segments: encode, validate, seek, timeline. Headless.
import {
  RIVAL_REPLAY_SCHEMA, RIVAL_REPLAY_STEP_MS, RIVAL_REPLAY_MAX_FRAMES, RIVAL_REPLAY_MAX_BULLETS, FRAME, FLAG,
  newReplaySegment, packFlags, unpackFlags, pushReplayFrame, pushReplayEvent, sealReplaySegment,
  validateReplaySegment, replayFrameIndex, replayStateAt, replayEventsBetween, replayStashesAt,
  replayCardLabel, raceReplayTimeline, timelineCursor, decisiveHouse
} from '../src/logic/rivalReplay.js';

let passed = 0;
function check(name, value) { if (!value) throw new Error(name); passed++; }
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

check('15Hz step is 67ms', RIVAL_REPLAY_STEP_MS === 67);
check('flags round-trip', JSON.stringify(unpackFlags(packFlags({ flip: true, carry: true }))) === JSON.stringify({ flip: true, phase: false, carry: true, hidden: false, hit: false, angle: 0 }));
check('angle rides above the flags', unpackFlags(packFlags({ angle: 270, hit: true })).angle === 270 && unpackFlags(packFlags({ angle: 270, hit: true })).hit);
check('negative and wrapped angles normalise', unpackFlags(packFlags({ angle: -90 })).angle === 270 && unpackFlags(packFlags({ angle: 359.6 })).angle === 0);
check('NaN angle is zero', unpackFlags(packFlags({ angle: NaN })).angle === 0);
check('flag bits distinct', new Set(Object.values(FLAG)).size === 5 && (FLAG.FLIP | FLAG.PHASE | FLAG.CARRY | FLAG.HIDDEN | FLAG.HIT) === 31);

const meta = { house: 2, attempt: 2, houseSeed: 123456, cols: 16, rows: 35, scale: 0.75,
  stashes: [{ x: 3.5, y: 4.5 }, { x: 12.5, y: 30.5 }], car: { x: 8.5, y: 0.5 },
  runnerSpawn: { x: 2.5, y: 20.5 }, plugSpawn: { x: 13.5, y: 10.5 }, weapon: 'rifle' };
let seg = newReplaySegment(meta);
check('segment starts open and empty', seg.v === RIVAL_REPLAY_SCHEMA && !seg.sealed && seg.frames.length === 0 && seg.durationMs === 0);
check('real stash is not recorded', !('real' in seg) && !('realAtPrimary' in seg) && seg.stashes.length === 2);
const state = (t, extra = {}) => ({
  runner: { x: 2.5 + t / 1000, y: 20.5, flags: packFlags({ flip: t > 500 }) },
  plugs: [{ x: 13.5, y: 10.5 - t / 1000, flags: 0 }],
  bullets: extra.bullets || [], decoy: extra.decoy || null
});
check('first frame accepted', pushReplayFrame(seg, 0, state(0)));
check('second frame accepted', pushReplayFrame(seg, 67, state(67, { bullets: [{ x: 5, y: 5 }, { x: 6.123456, y: 5 }] })));
check('backwards time dropped', !pushReplayFrame(seg, 60, state(60)));
check('duplicate time dropped', !pushReplayFrame(seg, 67, state(67)));
check('NaN time dropped', !pushReplayFrame(seg, NaN, state(0)));
check('third frame accepted', pushReplayFrame(seg, 1000, state(1000, { decoy: { x: 4, y: 4 } })));
check('frames are compact arrays', Array.isArray(seg.frames[0]) && seg.frames[0].length === 7 && seg.frames[1][FRAME.BULLETS].length === 4);
check('coordinates quantised to 2dp', seg.frames[1][FRAME.BULLETS][2] === 6.12);
check('decoy encoded as 0 when absent', seg.frames[0][FRAME.DECOY] === 0 && Array.isArray(seg.frames[2][FRAME.DECOY]));
const many = { runner: { x: 1, y: 1, flags: 0 }, plugs: [], bullets: Array.from({ length: 100 }, (_, i) => ({ x: i, y: 1 })) };
pushReplayFrame(seg, 1067, many);
check('bullet count capped', seg.frames[3][FRAME.BULLETS].length === RIVAL_REPLAY_MAX_BULLETS * 2);
check('event accepted', pushReplayEvent(seg, 300, 'bunk', { i: 0 }) && pushReplayEvent(seg, 900, 'pickup', { i: 1 }) && pushReplayEvent(seg, 950, 'sound', { key: 'pickup', v: 0.9 }));
check('unknown event kind dropped', !pushReplayEvent(seg, 400, 'teleport'));
check('event before start dropped', !pushReplayEvent(seg, -1, 'shot'));
sealReplaySegment(seg, 1500);
check('sealed duration kept when longer than frames', seg.sealed && seg.durationMs === 1500);
check('sealed segment refuses frames and events', !pushReplayFrame(seg, 2000, state(2000)) && !pushReplayEvent(seg, 2000, 'death'));
check('short duration stretched to last frame', sealReplaySegment(newReplaySegmentWithFrames(), 10).durationMs === 134);
function newReplaySegmentWithFrames() { const s = newReplaySegment(meta); pushReplayFrame(s, 0, state(0)); pushReplayFrame(s, 134, state(134)); return s; }
check('valid segment validates', validateReplaySegment(seg).ok);

// validation catches corruption
const corrupt = mutate => { const s = JSON.parse(JSON.stringify(seg)); mutate(s); return validateReplaySegment(s); };
check('wrong schema refused', !corrupt(s => { s.v = 9; }).ok);
check('runner outside grid refused', !corrupt(s => { s.frames[0][FRAME.RX] = 40; }).ok);
check('time regression refused', !corrupt(s => { s.frames[2][FRAME.T] = 10; }).ok);
check('malformed frame refused', !corrupt(s => { s.frames[1] = [1, 2]; }).ok);
check('odd bullet list refused', !corrupt(s => { s.frames[1][FRAME.BULLETS].push(1); }).ok);
check('bad plug tuple refused', !corrupt(s => { s.frames[0][FRAME.PLUGS] = [[1, 2]]; }).ok);
check('bad decoy refused', !corrupt(s => { s.frames[2][FRAME.DECOY] = [1]; }).ok);
check('one stash refused', !corrupt(s => { s.stashes.pop(); }).ok);
check('missing car refused', !corrupt(s => { delete s.car; }).ok);
check('bad event refused', !corrupt(s => { s.events.push({ t: 1, k: 'nope' }); }).ok);
check('duration shorter than frames refused', !corrupt(s => { s.durationMs = 500; }).ok);
check('single frame refused', !corrupt(s => { s.frames = s.frames.slice(0, 1); }).ok);
check('too many frames refused', !corrupt(s => { s.frames = Array.from({ length: RIVAL_REPLAY_MAX_FRAMES + 1 }, (_, i) => [i, 1, 1, 0, [], [], 0]); s.durationMs = 1e9; }).ok);
check('garbage refused', !validateReplaySegment(null).ok && !validateReplaySegment({}).ok);

// seeking
check('index before first frame is -1', replayFrameIndex(seg, -5) === -1);
check('index exact hit', replayFrameIndex(seg, 67) === 1);
check('index between frames', replayFrameIndex(seg, 500) === 1);
check('index after last', replayFrameIndex(seg, 99999) === 3);
let st = replayStateAt(seg, 0);
check('state at start', near(st.runner.x, 2.5) && st.plugs.length === 1 && st.bullets.length === 0 && st.decoy === null);
st = replayStateAt(seg, 533.5);
check('positions lerp between samples', near(st.runner.x, 2.57 + (3.5 - 2.57) * ((533.5 - 67) / (1000 - 67)), 1e-3));
check('bullets step, not lerp', st.bullets.length === 2 && st.bullets[0].x === 5);
check('flags step from earlier frame', st.runner.flags === packFlags({ flip: false }));
st = replayStateAt(seg, 1000);
check('decoy appears at its frame', st.decoy && st.decoy.x === 4);
check('state past the end holds last frame', replayStateAt(seg, 1e6).runner.x === 1);
check('state before start holds first frame', near(replayStateAt(seg, -100).runner.x, 2.5));
check('empty segment yields null state', replayStateAt({ frames: [] }, 0) === null);
check('events between exclusive-inclusive', replayEventsBetween(seg, 300, 950).map(e => e.k).join() === 'pickup,sound' && replayEventsBetween(seg, 299, 300).length === 1);
check('stashes both visible at start', replayStashesAt(seg, 0).every(s => s.visible));
check('bunk removes only that pocket', replayStashesAt(seg, 300).map(s => s.visible).join() === 'false,true');
check('pickup removes both', replayStashesAt(seg, 900).every(s => !s.visible));

// timeline
check('card label plain first attempt', replayCardLabel({ house: 1, attempt: 1 }) === 'HOUSE 1');
check('card label counts retries', replayCardLabel({ house: 3, attempt: 3 }) === 'HOUSE 3  ·  RETRY 2');
const bundle = { segments: [
  { house: 1, attempt: 1, startedMs: 0, durationMs: 9000, outcome: 'extracted', replay: { durationMs: 9000 } },
  { house: 2, attempt: 1, startedMs: 9180, durationMs: 4820, outcome: 'caught', replay: { durationMs: 4820 } },
  { house: 2, attempt: 2, startedMs: 14650, durationMs: 9350, outcome: 'extracted', replay: { durationMs: 9350 } }
] };
const tl = raceReplayTimeline(bundle, { cardMs: 1000, tailMs: 500 });
check('timeline alternates card and segment', tl.items.map(i => i.kind).join() === 'card,segment,card,segment,card,segment');
check('timeline total is sum of parts', tl.total === 3 * 1000 + (9000 + 4820 + 9350) + 3 * 500);
check('timeline items contiguous', tl.items.every((it, i) => i === 0 || it.start === tl.items[i - 1].end));
let cur = timelineCursor(tl, 0);
check('cursor starts on first card', cur.item.kind === 'card' && cur.item.index === 0 && cur.local === 0);
cur = timelineCursor(tl, 1000);
check('cursor enters first segment at its start', cur.item.kind === 'segment' && cur.local === 0);
cur = timelineCursor(tl, 1000 + 9500 + 1000 + 100);
check('cursor finds the second segment', cur.item.kind === 'segment' && cur.item.index === 1 && cur.local === 100);
cur = timelineCursor(tl, tl.total + 5);
check('cursor past the end reports done', cur.done && cur.item.index === 2);
check('empty timeline has no cursor', timelineCursor(raceReplayTimeline({ segments: [] }), 0) === null);
check('missing replay counts as zero length', raceReplayTimeline({ segments: [{ house: 1, attempt: 1, outcome: 'caught' }] }, { cardMs: 100, tailMs: 0 }).total === 100);
check('decisive house is first opponent lead', decisiveHouse([10, 20, 30], [12, 18, 40]) === 2);
check('no decisive house when player leads throughout', decisiveHouse([10, 20], [11, 21]) === null);
check('decisive house when player never cleared', decisiveHouse([], [5]) === 1);
console.log(passed + ' rival replay assertions passed');
