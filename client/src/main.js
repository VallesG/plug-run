import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { RunnerScene } from './scenes/RunnerScene.js';
import { PlugScene } from './scenes/PlugScene.js';
import { TutorialMiniScene } from './scenes/TutorialMiniScene.js';
import LeaderboardScene from './scenes/LeaderboardScene.js';
// import { PvpScene } from './scenes/PvpScene.js'; // Future multiplayer
import rexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

// Desktop: constrain to mobile-like viewport, Mobile: fill screen
// Based on most common mobile resolutions from analytics:
// 390x844, 414x896, 423x1080, 430x932
const isMobile = window.innerWidth < 768;
const gameWidth = isMobile ? window.innerWidth : Math.min(500, window.innerWidth);
const gameHeight = isMobile ? window.innerHeight : Math.min(938, window.innerHeight);

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: gameWidth,
  height: gameHeight,
  backgroundColor: '#0b0b12',
  render: { pixelArt: true },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  plugins: {
    scene: [
      { key: 'rexUI', plugin: rexUIPlugin, mapping: 'rexUI' } // scene.rexUI
    ]
  },
  scale: {
    mode: isMobile ? Phaser.Scale.RESIZE : Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: gameWidth,
    height: gameHeight
  },
  // Start at Menu, include tutorial and game scenes
  scene: [MenuScene, RunnerScene, PlugScene, TutorialMiniScene, LeaderboardScene]
};

const game = new Phaser.Game(config);

// Zoom detection and warning
const checkZoom = () => {
  const zoomWarning = document.getElementById('zoom-warning');
  if (!zoomWarning) return;

  // Detect zoom using visualViewport (most reliable for modern browsers)
  const isZoomed = window.visualViewport
    ? Math.abs(window.visualViewport.scale - 1) > 0.01  // Not 100% (with small tolerance)
    : false;

  if (isZoomed) {
    zoomWarning.classList.add('show');
  } else {
    zoomWarning.classList.remove('show');
  }
};

// Check zoom on load and resize
checkZoom();
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', checkZoom);
}

// resize handler - only resize on mobile
window.addEventListener('resize', () => {
  const isMobileNow = window.innerWidth < 768;
  if (isMobileNow) {
    // Mobile: resize to fill screen
    game.scale.resize(window.innerWidth, window.innerHeight);
  }
  checkZoom();
});
