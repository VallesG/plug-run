// Art contract: what ships must be what the manifest and the runtime claim.
//
// The six rooms are now WebP under public/ and the PNG originals are archived
// outside the served directory, so this suite checks both halves: the served
// file is the one recorded, and the source it came from is still in the repo.
import { readFileSync, existsSync } from 'node:fs';
import { WINDOW_ART, WINDOW_GANGS } from '../src/logic/window.js';
import { CONTACTS, contact } from '../src/logic/contacts.js';

const manifest = JSON.parse(readFileSync(new URL('../public/art/the-window/contacts/manifest.json', import.meta.url), 'utf8'));
const preview = readFileSync(new URL('../public/contact-art-preview.html', import.meta.url), 'utf8');
let passed = 0;
function check(name, ok) { if (!ok) throw new Error(name); passed++; }

/** Width/height out of a WebP header: VP8 (lossy), VP8L (lossless) or VP8X. */
function webpSize(buf) {
  const fourcc = buf.toString('ascii', 12, 16);
  if (fourcc === 'VP8 ') {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (fourcc === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (fourcc === 'VP8X') {
    const read24 = (o) => buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16);
    return { width: read24(24) + 1, height: read24(27) + 1 };
  }
  return null;
}
function checkWebP(source, size) {
  const file = readFileSync(new URL('../public' + source, import.meta.url));
  check('RIFF/WEBP container ' + source,
    file.toString('ascii', 0, 4) === 'RIFF' && file.toString('ascii', 8, 12) === 'WEBP');
  const dims = webpSize(file);
  check('readable WebP header ' + source, !!dims);
  check('WebP dimensions ' + source, dims.width === size.width && dims.height === size.height);
  check('WebP bytes ' + source, file.length === size.bytes);
  // The pass was worth doing, and saying so keeps a future regression visible.
  check('smaller than its PNG source ' + source, file.length < size.pngBytes / 5);
}
function checkPNGSource(relative, size) {
  const png = readFileSync(new URL('../' + relative, import.meta.url));
  check('archived PNG signature ' + relative, png.subarray(0, 8).toString('hex') === '89504e470d0a1a0a');
  check('archived PNG dimensions ' + relative, png.readUInt32BE(16) === size.width && png.readUInt32BE(20) === size.height);
  check('archived PNG bytes ' + relative, png.length === size.pngBytes);
}

check('manifest describes the shipped runtime art',
  manifest.schemaVersion === 2 && manifest.status === 'art-integrated-runtime-webp');
check('manifest names the source archive', manifest.sourceArchive === 'client/art-sources/the-window/');
check('six unique contact identities', manifest.contacts.length === 6 && new Set(manifest.contacts.map(c => c.id)).size === 6);
check('six distinct settings', new Set(manifest.contacts.map(c => c.background)).size === 6);
for (const gang of WINDOW_GANGS) {
  const pair = manifest.contacts.filter(c => c.gang === gang.name);
  check('correct pair ' + gang.id, pair.length === 2
    && pair.some(c => c.id === gang.primary.toLowerCase())
    && pair.some(c => c.id === gang.jobs.toLowerCase()));
}

for (const c of manifest.contacts) {
  checkWebP(c.background, c.backgroundSize);
  checkPNGSource(c.backgroundSize.pngSource, c.backgroundSize);
  const f = c.portrait.frame;
  const expected = c.id === 'switch' ? { x: 0, width: WINDOW_ART.switch.frameWidth } : WINDOW_ART.cast.frames[c.id];
  check('canonical atlas frame ' + c.id, f.x === expected.x && f.width === expected.width
    && f.height === (c.id === 'switch' ? WINDOW_ART.switch.frameHeight : WINDOW_ART.cast.height));
  check('canonical source sheet ' + c.id, c.portrait.source === '/art/the-window/' + (c.id === 'switch' ? 'switch.webp' : 'cast.webp')
    && f.sheetWidth === (c.id === 'switch' ? WINDOW_ART.switch.frameWidth * WINDOW_ART.switch.frames : WINDOW_ART.cast.width));
  check('portrait fractions bounded ' + c.id, c.portrait.heightFraction > 0 && c.portrait.heightFraction <= 1
    && c.portrait.baseFraction >= c.portrait.heightFraction && c.portrait.baseFraction <= 1
    && c.portrait.centerXFraction === 0.5);
  check('foreground fractions bounded ' + c.id, c.foregroundStartFraction === null
    || (c.foregroundStartFraction > 0 && c.foregroundStartFraction < 1));
  check('preview uses real assets ' + c.id, preview.includes(c.background) && preview.includes(c.portrait.source));

  // The runtime reads logic/contacts.js, not this manifest. They must agree,
  // or a reviewed placement silently stops being what the player sees.
  const runtime = contact(c.id);
  check('runtime knows this contact ' + c.id, !!runtime);
  check('runtime uses the manifest backdrop ' + c.id, runtime.background === c.background);
  check('runtime uses the manifest portrait ' + c.id, runtime.portraitSource === c.portrait.source);
  check('runtime matches reviewed placement ' + c.id,
    runtime.heightFraction === c.portrait.heightFraction
    && runtime.baseFraction === c.portrait.baseFraction
    && runtime.foregroundStartFraction === c.foregroundStartFraction);
  check('runtime matches the manifest setting ' + c.id, runtime.setting === c.setting);
  check('runtime matches the manifest gang ' + c.id, runtime.gang === c.gang);
}
check('runtime cast is exactly the manifest cast',
  CONTACTS.length === manifest.contacts.length
  && CONTACTS.every(r => manifest.contacts.some(c => c.id === r.id)));

// Nothing large should reach the deploy by accident.
const served = ['bodega-night', 'auntie-ro', 'switch', 'cast'];
for (const name of served) {
  const webp = new URL('../public/art/the-window/' + name + '.webp', import.meta.url);
  check('runtime window art is webp ' + name, existsSync(webp));
  check('runtime window art is not a megabyte ' + name, readFileSync(webp).length < 600_000);
  check('png original archived, not served ' + name,
    !existsSync(new URL('../public/art/the-window/' + name + '.png', import.meta.url))
    && existsSync(new URL('../art-sources/the-window/' + name + '.png', import.meta.url)));
}
check('concept sheets are not served', !existsSync(new URL('../public/art/the-window/concepts', import.meta.url)));
check('mission props ship as webp', existsSync(new URL('../public/art/the-window/contacts/mission-props.webp', import.meta.url))
  && !existsSync(new URL('../public/art/the-window/contacts/mission-props.png', import.meta.url)));

console.log(passed + ' contact art assertions passed');
