// Browser smoke test on an isolated ephemeral development server; no paid API calls.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from './lib/browsers.mjs';
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  const { pw, executablePath } = await chromium();
  browser = await pw.launch({ executablePath, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(url);
  await page.waitForFunction(() => window.__plugRunGame?.scene?.isActive('MENU'));
  await page.evaluate(async () => {
    const { default: AudioManager } = await import('/src/audio/AudioManager.js');
    const { newRivalRace, rivalCourse } = await import('/src/logic/rivals.js');
    window.announcerCalls = [];
    const play = AudioManager.prototype.playRivalAnnouncement;
    AudioManager.prototype.playRivalAnnouncement = function(key) {
      window.announcerCalls.push(key); return play.call(this, key);
    };
    const race = newRivalRace(rivalCourse(77), Array.from({ length: 7 }, (_, i) => (i + 1) * 100000));
    race.powers = ['phase', 'dash']; race.recording = true;
    window.__plugRunGame.scene.getScene('MENU').scene.start('RUNNER', {
      mode: 'pve', role: 'runner', runKind: 'rivals', rivalRace: race
    });
  });
  await page.waitForFunction(() => window.__plugRunGame.scene.getScene('RUNNER').rivals?.notice, { timeout: 30000 });
  const decoded = await page.evaluate(async () => {
    const { RIVAL_ANNOUNCER_KEYS } = await import('/src/logic/rivalAnnouncer.js');
    const scene = window.__plugRunGame.scene.getScene('RUNNER');
    scene.physics.world.pause();
    scene.audio.setMute(false);
    scene.rivals.armCountdown();
    return RIVAL_ANNOUNCER_KEYS.filter(key => scene.cache.audio.exists(key));
  });
  assert.equal(decoded.length, 24, 'all assets decoded by Phaser');
  await page.waitForFunction(() => window.announcerCalls.includes('br_go'));
  assert.deepEqual(await page.evaluate(() => window.announcerCalls), ['br_countdown_3', 'br_countdown_2', 'br_countdown_1', 'br_go']);
  for (let house = 1; house <= 7; house++) {
    const result = await page.evaluate(house => {
      const scene = window.__plugRunGame.scene.getScene('RUNNER');
      scene.rivalRace.startedAt = performance.now() - house * 100000 - 5;
      scene.rivals.update();
      return { key: scene.audio._rivalVoice?.key, playing: scene.audio._rivalVoice?.isPlaying,
        active: scene.sound.sounds.filter(s => s.key.startsWith('br_') && s.isPlaying).length };
    }, house);
    assert.match(result.key, new RegExp(`^br_opponent_house_${house}_`));
    assert.equal(result.playing, true);
    assert.equal(result.active, 1);
  }
  await page.evaluate(() => window.__plugRunGame.scene.getScene('RUNNER').audio.setMute(true));
  assert.equal(await page.evaluate(() => window.__plugRunGame.scene.getScene('RUNNER').audio._rivalVoice), null);
  await page.evaluate(() => {
    const scene = window.__plugRunGame.scene.getScene('RUNNER');
    scene.audio.setMute(false); scene.audio.playRivalAnnouncement('br_opponent_house_7_1');
    scene.scene.start('MENU');
  });
  await page.waitForFunction(() => window.__plugRunGame.scene.isActive('MENU'));
  assert.equal(await page.evaluate(() => window.__plugRunGame.sound.sounds.filter(s => s.key.startsWith('br_') && s.isPlaying).length), 0);
  console.log('Browser: all 24 clips decoded; countdown and seven clear events played; no overlap; mute and menu exit stop speech.');
} finally {
  await browser?.close(); await server.close();
}
