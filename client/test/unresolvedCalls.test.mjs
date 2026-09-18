// Catch a call to a function that was never imported or declared.
//
// WHY THIS EXISTS
// ProgressionManager called noteHouseObservation without importing it. The
// try/catch around the call swallowed the ReferenceError, so campaign skill
// evidence was never recorded in the live game and the Rivals unlock was
// permanently unreachable — with every suite green. `node --check` cannot see
// this: an undeclared identifier is valid syntax and only fails when the line
// actually runs, which in a wrapped seam may be never in a test.
//
// WHAT IT CHECKS
// For every module under src/, every identifier used in CALL POSITION must be
// imported, declared somewhere in the file, or a known global.
//
// DELIBERATELY CONSERVATIVE
// Bindings are collected from the whole file rather than per scope, so an
// inner-scope name satisfies an outer call site. That trades some false
// negatives for zero false positives: this check must never cry wolf, or it
// gets muted and stops protecting anything. It is a floor, not a linter.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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

const GLOBALS = new Set([
  'require', 'import', 'super', 'this', 'typeof', 'void', 'await', 'yield', 'new',
  'async', 'delete', 'in', 'instanceof', 'of',
  'if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'do', 'else', 'try',
  'Object', 'Array', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt', 'Math', 'JSON',
  'Date', 'RegExp', 'Error', 'TypeError', 'RangeError', 'Promise', 'Map', 'Set',
  'WeakMap', 'WeakSet', 'Proxy', 'Reflect', 'parseInt', 'parseFloat', 'isNaN',
  'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask',
  'requestAnimationFrame', 'cancelAnimationFrame', 'fetch', 'structuredClone',
  'console', 'window', 'document', 'navigator', 'localStorage', 'sessionStorage',
  'location', 'history', 'performance', 'screen', 'alert', 'confirm', 'prompt',
  'Image', 'Audio', 'Blob', 'File', 'FileReader', 'FormData', 'Headers', 'Request',
  'Response', 'URL', 'URLSearchParams', 'TextEncoder', 'TextDecoder', 'AbortController',
  'Event', 'CustomEvent', 'EventTarget', 'MutationObserver', 'ResizeObserver',
  'IntersectionObserver', 'WebSocket', 'Worker', 'atob', 'btoa', 'crypto',
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'ArrayBuffer',
  'DataView', 'Phaser', 'AudioContext', 'webkitAudioContext', 'matchMedia',
  'getComputedStyle', 'CanvasRenderingContext2D', 'OffscreenCanvas', 'Intl',
  'MediaStream', 'MediaRecorder', 'CanvasCaptureMediaStreamTrack'
]);

/** Strip strings, template literals, regex-ish literals and comments. */
function strip(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/`(?:\\.|\$\{[^}]*\}|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

/**
 * Every name the file binds anywhere: imports, declarations, classes, function
 * and catch parameters, destructuring, labels and object-method shorthand.
 */
function boundNames(code) {
  const names = new Set();
  const add = value => { if (value) for (const n of value.split(/[^A-Za-z0-9_$]+/)) if (n && !/^\d/.test(n)) names.add(n); };
  for (const m of code.matchAll(/import\s+([\s\S]*?)\s+from\s*['"]/g)) add(m[1]);
  for (const m of code.matchAll(/\b(?:const|let|var)\s+([\s\S]{0,400}?)=/g)) add(m[1]);
  for (const m of code.matchAll(/\b(?:function|class)\s*\*?\s*([A-Za-z_$][\w$]*)/g)) add(m[1]);
  for (const m of code.matchAll(/\bcatch\s*\(([^)]*)\)/g)) add(m[1]);
  // Any parenthesised group can be a parameter list; over-collecting is the point.
  for (const m of code.matchAll(/\(([^()]*)\)\s*(?:=>|\{)/g)) add(m[1]);
  // Method shorthand and class methods: `name(args) {`
  for (const m of code.matchAll(/(?:^|[\s;{,])([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\{/gm)) names.add(m[1]);
  for (const m of code.matchAll(/\b([A-Za-z_$][\w$]*)\s*:/g)) names.add(m[1]);
  return names;
}

let checked = 0, failures = [];
for (const path of files) {
  const code = strip(readFileSync(path, 'utf8'));
  const bound = boundNames(code);
  checked++;
  const seen = new Set();
  // Call position, not preceded by `.`, `?.` or a word character.
  for (const m of code.matchAll(/(^|[^.\w$?])([A-Za-z_$][\w$]*)\s*\(/gm)) {
    const name = m[2];
    if (GLOBALS.has(name) || bound.has(name) || seen.has(name)) continue;
    seen.add(name);
    failures.push(path.replace(clientRoot, '') + ': ' + name + '() is neither imported nor declared');
  }
}

if (failures.length) {
  for (const line of failures) console.error('  ' + line);
  console.error(failures.length + ' unresolved call(s) across ' + checked + ' modules');
  process.exit(1);
}
console.log('Unresolved calls: ' + checked + ' modules checked, 0 found');
