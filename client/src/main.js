import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { RunnerScene } from './scenes/RunnerScene.js';
import { PlugScene } from './scenes/PlugScene.js';
import { TutorialMiniScene } from './scenes/TutorialMiniScene.js';
import LeaderboardScene from './scenes/LeaderboardScene.js';
// import { PvpScene } from './scenes/PvpScene.js'; // Future multiplayer
import rexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: window.innerWidth,     // fill browser width
  height: window.innerHeight,   // fill browser height
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
  autoCenter: Phaser.Scale.CENTER_BOTH
},
  // Start at Menu, include tutorial and game scenes
  scene: [MenuScene, RunnerScene, PlugScene, TutorialMiniScene, LeaderboardScene]
};

const game = new Phaser.Game(config);

// resize handler
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
