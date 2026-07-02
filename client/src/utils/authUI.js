// In-game UI: settings button + settings modal + toasts
// (Account/login UI removed — offline build)

import AudioManager from '../audio/AudioManager.js';

const COLORS = {
  panel: 0x0a0d1a,
  stroke: 0x2f3660,
  claim: 0xfbbf24,  // Gold/yellow (like STASH)
  signIn: 0x60a5fa,  // Blue (like selected card)
  signOut: 0xef4444, // Red (warning)
  success: 0x86efac, // Green
  error: 0xef4444,   // Red
  textPrimary: '#cbd1ff',
  textSecondary: '#aab5ff',
  textError: '#f87171'
};

/**
 * Show claim account modal
 * @param {Phaser.Scene} scene - The scene to create UI in
 * @param {Function} onSuccess - Callback when account is claimed successfully
 * @param {Function} onCancel - Callback when user cancels
 */

/**
 * Create bottom-left buttons for in-game panels (settings only — online accounts removed)
 */
export function createBottomLeftButtons(scene, panelX, panelY, panelW, panelH, Z = 20005) {
  const elements = [];
  const btnH = 22;
  const iconBtnW = 26;

  // Position at top-left of the panel, aligned with title text
  const leftEdge = panelX - panelW/2 + 16;
  const topEdge = panelY - panelH/2 + 28;

  // Settings button - just icon, no text
  const settingsX = leftEdge + iconBtnW/2;
  const settingsBg = scene.add.rectangle(settingsX, topEdge, iconBtnW, btnH, 0x1a2038, 0.95)
    .setStrokeStyle(1, 0x2f3660)
    .setDepth(Z)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });

  const settingsIcon = scene.add.text(settingsX, topEdge, '\u2699', {
    color: '#cbd1ff',
    fontSize: '14px'
  }).setOrigin(0.5).setDepth(Z + 1).setScrollFactor(0);

  settingsBg.on('pointerdown', () => {
    showInGameSettings(scene, Z + 10);
  });

  elements.push(settingsBg, settingsIcon);
  return elements;
}


function showInGameSettings(scene, Z = 25000) {
  const cx = scene.cameras.main.centerX;
  const cy = scene.cameras.main.centerY;
  const W = scene.scale.gameSize?.width || scene.scale.width;
  const H = scene.scale.gameSize?.height || scene.scale.height;

  // Semi-transparent veil
  const veil = scene.add.rectangle(cx, cy, W, H, 0x000000, 0.7)
    .setScrollFactor(0).setDepth(Z).setInteractive();

  // Compact panel
  const panelW = Math.min(280, W - 60);
  const panelH = 160;
  const panel = scene.add.rectangle(cx, cy, panelW, panelH, 0x0a0d1a, 0.98)
    .setStrokeStyle(2, 0x2f3660).setScrollFactor(0).setDepth(Z + 1);

  const title = scene.add.text(cx, cy - panelH/2 + 20, 'Settings', {
    color: '#cbd1ff',
    fontSize: '16px',
    fontStyle: 'bold'
  }).setOrigin(0.5).setDepth(Z + 2).setScrollFactor(0);

  const elements = [veil, panel, title];

  // Get AudioManager
  const audio = AudioManager.get(scene);

  const btnW = 84, btnH = 28;
  const labelX = cx - panelW/2 + 16;

  // Music toggle
  const musicY = cy - 10;
  const musicLabel = scene.add.text(labelX, musicY, 'Music', {
    color: '#aab5ff',
    fontSize: '13px'
  }).setOrigin(0, 0.5).setDepth(Z + 2).setScrollFactor(0);

  const musicBg = scene.add.rectangle(cx + panelW/2 - btnW/2 - 12, musicY, btnW, btnH, 0x1a2038, 1)
    .setStrokeStyle(1, 0x2f3660)
    .setDepth(Z + 2)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });

  let musicOn = audio ? !audio.isMusicMuted() : true;
  const musicText = scene.add.text(musicBg.x, musicBg.y, musicOn ? 'ON' : 'OFF', {
    color: musicOn ? '#86efac' : '#cbd1ff',
    fontSize: '13px'
  }).setOrigin(0.5).setDepth(Z + 3).setScrollFactor(0);

  musicBg.on('pointerdown', () => {
    musicOn = !musicOn;
    musicText.setText(musicOn ? 'ON' : 'OFF').setColor(musicOn ? '#86efac' : '#cbd1ff');
    if (audio) {
      audio.setMusicMute(!musicOn);
    }
  });

  elements.push(musicLabel, musicBg, musicText);

  // Sounds toggle
  const soundsY = cy + 30;
  const soundsLabel = scene.add.text(labelX, soundsY, 'Sounds', {
    color: '#aab5ff',
    fontSize: '13px'
  }).setOrigin(0, 0.5).setDepth(Z + 2).setScrollFactor(0);

  const soundsBg = scene.add.rectangle(cx + panelW/2 - btnW/2 - 12, soundsY, btnW, btnH, 0x1a2038, 1)
    .setStrokeStyle(1, 0x2f3660)
    .setDepth(Z + 2)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });

  let soundsOn = audio ? !audio.isMuted() : true;
  const soundsText = scene.add.text(soundsBg.x, soundsBg.y, soundsOn ? 'ON' : 'OFF', {
    color: soundsOn ? '#86efac' : '#cbd1ff',
    fontSize: '13px'
  }).setOrigin(0.5).setDepth(Z + 3).setScrollFactor(0);

  soundsBg.on('pointerdown', () => {
    soundsOn = !soundsOn;
    soundsText.setText(soundsOn ? 'ON' : 'OFF').setColor(soundsOn ? '#86efac' : '#cbd1ff');
    if (audio) {
      audio.setMute(!soundsOn);
    }
  });

  elements.push(soundsLabel, soundsBg, soundsText);

  // Close button
  const closeBg = scene.add.rectangle(cx, cy + panelH/2 - 20, 80, 26, 0x1a2038, 1)
    .setStrokeStyle(1, 0x2f3660)
    .setDepth(Z + 2)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });

  const closeText = scene.add.text(cx, cy + panelH/2 - 20, 'Close', {
    color: '#cbd1ff',
    fontSize: '13px'
  }).setOrigin(0.5).setDepth(Z + 3).setScrollFactor(0);

  elements.push(closeBg, closeText);

  const destroyAll = () => {
    elements.forEach(el => el?.destroy?.());
  };

  closeBg.on('pointerdown', destroyAll);
  veil.on('pointerdown', destroyAll);

  return { destroy: destroyAll };
}

/**
 * Show a toast message
 * @param {Phaser.Scene} scene
 * @param {string} message
 * @param {number} color - Background color (optional, defaults to error red)
 */
function showToast(scene, message, color = COLORS.error) {
  const Z = 30000;
  const cx = scene.cameras.main.centerX;
  const W = scene.scale.gameSize?.width || scene.scale.width;
  const H = scene.scale.gameSize?.height || scene.scale.height;

  const y = H * 0.15;
  const maxW = Math.min(360, W - 40);

  // Create toast container
  const bg = scene.add.rectangle(cx, y, maxW, 50, color, 0.95)
    .setStrokeStyle(2, color === COLORS.success ? 0xa7f3d0 : 0xfca5a5)
    .setDepth(Z).setScrollFactor(0);

  const text = scene.add.text(cx, y, message, {
    color: '#ffffff',
    fontSize: '14px',
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: maxW - 20 }
  }).setOrigin(0.5).setDepth(Z + 1).setScrollFactor(0);

  // Fade in
  bg.setAlpha(0);
  text.setAlpha(0);

  scene.tweens.add({
    targets: [bg, text],
    alpha: 1,
    duration: 200,
    ease: 'Cubic.easeOut'
  });

  // Fade out and destroy
  scene.time.delayedCall(2500, () => {
    scene.tweens.add({
      targets: [bg, text],
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        bg.destroy();
        text.destroy();
      }
    });
  });
}
