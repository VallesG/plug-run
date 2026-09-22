// Browser discovery, including the Windows paths this container cannot try
// for real. Written because the alternative is finding out on someone else's
// machine that PROGRAMFILES(X86) was spelled wrong.
//
//   node client/test/toolBrowsers.test.mjs

let passed = 0;
const failures = [];
const check = (name, cond) => { cond ? passed++ : failures.push(name); };

const realPlatform = process.platform;
const setPlatform = (v) => Object.defineProperty(process, 'platform', { value: v, configurable: true });

const savedEnv = { ...process.env };
const restoreEnv = () => {
  for (const k of Object.keys(process.env)) if (!(k in savedEnv)) delete process.env[k];
  Object.assign(process.env, savedEnv);
};

const { chromiumCandidates } = await import('../tools/lib/browsers.mjs');
const { JEV_STRATEGIC_QUESTIONS } = await import('../tools/rivals-record.mjs');

check('the recorder permits strategic route plans',
  JEV_STRATEGIC_QUESTIONS.includes('route'));
check('the recorder still refuses raw movement questions',
  !JEV_STRATEGIC_QUESTIONS.includes('move') && !JEV_STRATEGIC_QUESTIONS.includes('direction'));

/* --- the override always wins ------------------------------------------- */
{
  process.env.PLUGRUN_CHROMIUM = '/somewhere/else/chrome';
  const list = chromiumCandidates();
  check('PLUGRUN_CHROMIUM is tried first', list[0] === '/somewhere/else/chrome');
  restoreEnv();
}

/* --- Windows ------------------------------------------------------------- */
{
  setPlatform('win32');
  process.env.LOCALAPPDATA = 'C:\\Users\\me\\AppData\\Local';
  process.env.PROGRAMFILES = 'C:\\Program Files';
  process.env['PROGRAMFILES(X86)'] = 'C:\\Program Files (x86)';

  const list = chromiumCandidates();
  const has = (s) => list.some((p) => p.replace(/\//g, '\\').includes(s));

  check('per-user Chrome', has('AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'));
  check('machine-wide Chrome', has('Program Files\\Google\\Chrome\\Application\\chrome.exe'));
  check('x86 Chrome', has('Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'));
  check('per-user Edge', has('AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe'));
  check('machine-wide Edge', has('Program Files\\Microsoft\\Edge\\Application\\msedge.exe'));
  check('x86 Edge', has('Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'));

  // Chrome is the more deliberate install of the two, so it is preferred
  // wherever it lives.
  const firstChrome = list.findIndex((p) => /chrome\.exe$/i.test(p));
  const firstEdge = list.findIndex((p) => /msedge\.exe$/i.test(p));
  check('Chrome is preferred over Edge', firstChrome >= 0 && firstChrome < firstEdge);

  check('no undefined path segments', list.every((p) => !/undefined/.test(p)));
  restoreEnv();
}

/* --- Windows with nothing set -------------------------------------------- */
{
  setPlatform('win32');
  delete process.env.LOCALAPPDATA;
  delete process.env.PROGRAMFILES;
  delete process.env['PROGRAMFILES(X86)'];
  const list = chromiumCandidates();
  check('a Windows box with no env vars still returns a usable list',
    Array.isArray(list) && list.every((p) => typeof p === 'string' && p.length));
  restoreEnv();
}

/* --- Linux is unchanged --------------------------------------------------- */
{
  setPlatform('linux');
  const list = chromiumCandidates();
  check('no .exe paths off Windows', list.every((p) => !/\.exe$/i.test(p)));
  check('the system packages are still tried', list.includes('/usr/bin/chromium'));
  restoreEnv();
}

setPlatform(realPlatform);

if (failures.length) {
  console.log(`toolBrowsers: ${passed} passed, ${failures.length} FAILED`);
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('toolBrowsers: ' + passed + ' assertions passed');

