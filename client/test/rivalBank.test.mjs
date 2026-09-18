// Integrity of the shipped opponent bank under client/public/rivals/v2/.
// Every entry must be a valid, unmodified record for its course with a replay
// bundle that validates against it. Skips (passes) when no bank is present.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { RIVAL_RULES_VERSION, RIVAL_COURSE_POOL, rivalPoolCourse } from '../src/logic/rivals.js';
import { validateRivalRunRecord, validateRivalReplayBundle, rivalRecordMatchesCourse, RIVAL_MAX_BUNDLE_BYTES } from '../src/logic/rivalRecords.js';
import { validateReplaySegment } from '../src/logic/rivalReplay.js';
import { rivalPreset } from '../src/logic/rivalPresets.js';
let passed = 0;
function check(name, value) { if (!value) throw new Error(name); passed++; }
const root = new URL('../public/rivals/v2/', import.meta.url);
if (!existsSync(root)) { console.log('rival bank: none present, nothing to check'); process.exit(0); }
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
check('manifest rules version', manifest.schemaVersion === 1 && manifest.rulesVersion === RIVAL_RULES_VERSION);
check('manifest lists the pool', manifest.courses.length === RIVAL_COURSE_POOL.length);
const ids = new Set();
let total = 0;
for (const c of RIVAL_COURSE_POOL) {
  const file = new URL('courses/' + c.courseID + '/opponents.json', root);
  check(c.name + ' has an opponents file', existsSync(file));
  const data = JSON.parse(readFileSync(file, 'utf8'));
  check(c.name + ' file identifies its course', data.courseID === c.courseID && data.rulesVersion === RIVAL_RULES_VERSION);
  const course = rivalPoolCourse(c.slot);
  for (const entry of data.opponents) {
    const r = entry.record, tag = c.name + ' / ' + r?.recordingID;
    check(tag + ' record valid', validateRivalRunRecord(r).ok);
    check(tag + ' matches its course', rivalRecordMatchesCourse(r, course, RIVAL_RULES_VERSION));
    check(tag + ' is a labelled bot', r.opponent.kind === 'bot' && r.opponent.displayName.startsWith('BOT') && rivalPreset(r.opponent.skillPreset));
    check(tag + ' unique id', !ids.has(r.recordingID)); ids.add(r.recordingID);
    check(tag + ' replay path present', typeof entry.replay === 'string' && existsSync(new URL(entry.replay, root)));
    const text = readFileSync(new URL(entry.replay, root), 'utf8');
    check(tag + ' bundle within size cap', text.length <= RIVAL_MAX_BUNDLE_BYTES);
    const bundle = JSON.parse(text);
    check(tag + ' bundle validates against record', validateRivalReplayBundle(bundle, r, { validateSegment: validateReplaySegment }).ok);
    total++;
  }
}
check('replay directory holds only referenced bundles', readdirSync(new URL('replays/', root)).every(f => ids.has(f.replace(/\.json$/, ''))));
console.log(passed + ' rival bank assertions passed across ' + total + ' recordings');
