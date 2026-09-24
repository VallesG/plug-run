// Catch an event listener removed before it exists.
//
// WHY THIS EXISTS
// BaseGameScene.create called this.scale.off('resize', this._onResizeCb) on
// its first run, while _onResizeCb was still undefined. Phaser's emitter
// treats off(event) with no listener as "remove every listener for event", so
// starting a house silently dropped the renderer's own resize handler (and
// every scene camera's). From then on the canvas resized but the renderer kept
// drawing at the first house's size: shrink the window and the maze slid up
// off the top with black below it. Telegram resizes its Mini App view often,
// which is where it showed.
//
// WHAT IT CHECKS
// Every `.off('event', this.name)` under src/ must either sit behind a guard on
// the same property (`if (this.name)` on that line or the one before), or come
// after `this.name =` has already been assigned earlier in the same file.
// Conservative in the same way as unresolvedCalls: file-level, never scoped,
// so it cannot cry wolf on the patterns already in use.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientRoot = fileURLToPath(new URL('../', import.meta.url));
const files = [];
(function collect(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (entry.isFile() && /\.js$/.test(entry.name)) files.push(path);
  }
})(join(clientRoot, 'src'));

const OFF = /\.off\(\s*(['"])[^'"]+\1\s*,\s*this\.([A-Za-z_$][\w$]*)\s*\)/g;
// A guard opening the enclosing block a few lines up counts:
//   if (this._handler) { off(a, …); off(b, …); off(c, …); this._handler = null; }
const GUARD_LINES = 4;
export function unsafeRemovals(source) {
  const problems = [];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(OFF)) {
      const prop = m[2];
      const guard = new RegExp('if\\s*\\(\\s*this\\.' + prop.replace(/\$/g, '\\$') + '\\b');
      if (guard.test(lines[i]) || lines.slice(Math.max(0, i - GUARD_LINES), i).some((line) => guard.test(line))) continue;
      const assigned = new RegExp('this\\.' + prop.replace(/\$/g, '\\$') + '\\s*=(?!=)');
      if (lines.slice(0, i).some((line) => assigned.test(line))) continue;
      problems.push({ line: i + 1, prop, text: lines[i].trim() });
    }
  }
  return problems;
}

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL ' + msg); };

// The checker itself: the exact shape that broke, and the shapes that are fine.
{
  const broken = "create(){\n  this.scale.off('resize', this._onResizeCb);\n  this._onResizeCb = () => {};\n}";
  if (unsafeRemovals(broken).length !== 1) fail('checker misses an off() before the listener exists');
  const guarded = "create(){\n  if (this._onResizeCb) this.scale.off('resize', this._onResizeCb);\n  this._onResizeCb = () => {};\n}";
  if (unsafeRemovals(guarded).length) fail('checker flags a guarded off()');
  const guardedAbove = "if (this._cb){\n  this.input.off('pointerup', this._cb);\n  this.input.off('pointerupoutside', this._cb);\n  this.input.off('gameout', this._cb);\n}";
  if (unsafeRemovals(guardedAbove).length) fail('checker flags off() calls inside a block guarded on the same listener');
  const commentedButBroken = "create(){\n  // one\n  // two\n  // three\n  // four\n  // five\n  this.scale.off('resize', this._cb);\n  this._cb = () => {};\n}";
  if (unsafeRemovals(commentedButBroken).length !== 1) fail('checker misses an unguarded off() under a comment block');
  const afterAssign = "this._onResize = () => {};\nthis.scale.on('resize', this._onResize);\nthis.events.once('shutdown', () => this.scale.off('resize', this._onResize));";
  if (unsafeRemovals(afterAssign).length) fail('checker flags an off() after the listener was assigned');
}

let checked = 0;
for (const file of files) {
  const found = unsafeRemovals(readFileSync(file, 'utf8'));
  checked++;
  for (const p of found) fail(relative(clientRoot, file) + ':' + p.line + ' removes this.' + p.prop + ' before it is ever assigned: ' + p.text);
}

if (failures) { console.error(failures + ' listener removal problem(s)'); process.exit(1); }
console.log('listenerRemoval: ' + checked + ' modules, every off(event, this.listener) is guarded or follows its assignment');
