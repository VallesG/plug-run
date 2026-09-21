// Where to find a browser, on whatever machine this is running on.
//
// Shared by rivals-record.mjs and jev-spike.mjs because they had the same
// list twice and it had already drifted once. One list, one place.
//
// ORDER MATTERS
// PLUGRUN_CHROMIUM always wins: it is the override someone sets precisely
// because the search below found the wrong thing. After that, the Playwright
// bundle (the known-good build), then the Linux system packages, then the
// Windows installs of Chrome and Edge.
//
// WINDOWS, AND WHY EDGE IS IN HERE
// Chrome is not guaranteed to be installed on Windows; Edge is, on every
// supported version. Both are Chromium and both drive fine through
// playwright-core's CDP client, so listing Edge means a fresh Windows box
// needs no download at all. Machine-wide installs land under Program Files
// (with the x86 tree still used by some Chrome channels), per-user installs
// under LOCALAPPDATA.

import { existsSync } from 'node:fs';
import { join } from 'node:path';

function windowsCandidates() {
  const roots = [
    process.env.LOCALAPPDATA,
    process.env.PROGRAMFILES,
    process.env['PROGRAMFILES(X86)']
  ].filter(Boolean);

  const apps = [
    ['Google', 'Chrome', 'Application', 'chrome.exe'],
    ['Microsoft', 'Edge', 'Application', 'msedge.exe']
  ];

  const out = [];
  // App before root, so Chrome anywhere beats Edge anywhere — a Chrome
  // install is the more deliberate choice of the two.
  for (const app of apps) for (const root of roots) out.push(join(root, ...app));
  return out;
}

/** Every path worth trying, best first. */
export function chromiumCandidates() {
  return [
    process.env.PLUGRUN_CHROMIUM,
    process.env.PLAYWRIGHT_BROWSERS_PATH &&
      join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium-1194/chrome-linux/chrome'),
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
    ...(process.platform === 'win32' ? windowsCandidates() : [])
  ].filter(Boolean);
}

/**
 * playwright-core plus a browser binary, or a clear exit.
 *
 * Exits rather than throws: every caller is a CLI whose only sensible
 * response is to print the list it tried and stop.
 */
export async function chromium() {
  let pw;
  try { pw = await import('playwright-core'); }
  catch {
    console.error('playwright-core is not installed. Run: npm i -D playwright-core');
    process.exit(2);
  }
  const candidates = chromiumCandidates();
  const executablePath = candidates.find((p) => existsSync(p));
  if (!executablePath) {
    console.error('No Chromium found. Set PLUGRUN_CHROMIUM to a Chromium, Chrome or Edge binary.' +
      '\nTried:\n  ' + candidates.join('\n  '));
    process.exit(2);
  }
  return { pw: pw.chromium, executablePath };
}
