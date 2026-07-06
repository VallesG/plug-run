import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { RunnerScene } from './scenes/RunnerScene.js';
import { PlugScene } from './scenes/PlugScene.js';
import { TutorialMiniScene } from './scenes/TutorialMiniScene.js';
import LeaderboardScene from './scenes/LeaderboardScene.js';
// import { PvpScene } from './scenes/PvpScene.js'; // Future multiplayer
import rexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

// The canvas fills the whole window (Phaser.Scale.RESIZE) — no letterbox
// bars on any screen or zoom level. Map fairness is enforced one level
// down: the maze GRID is a fixed 16x35 for every player (see
// BaseGameScene GRID_COLS/GRID_ROWS); only the cell pixel size and
// centering margins adapt to the screen, and margins are painted with
// the arena's brick border so nothing reads as empty space.
const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: window.innerWidth,
  height: window.innerHeight,
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
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  // Start at Menu, include tutorial and game scenes
  scene: [MenuScene, RunnerScene, PlugScene, TutorialMiniScene, LeaderboardScene]
};

const game = new Phaser.Game(config);

// Zoom/resize handling: no warning banner needed — every scene rebuilds
// itself on layout-viewport changes (RESIZE mode + per-scene restart
// handlers), so desktop browser zoom just relayouts. Mobile pinch zoom is
// user-intent zoom INTO the canvas; the viewport meta discourages it and
// nothing breaks structurally.