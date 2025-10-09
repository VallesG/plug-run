import Phaser from 'phaser'; 
import { RunnerScene } from './scenes/RunnerScene.js';
import { PvpScene } from './scenes/PvpScene.js';
import { MenuScene } from './scenes/MenuScene.js'; // LANDING / MENUSCENE
import { TutorialScene } from './scenes/TutorialScene.js'; // TUTORIAL SCENE (legacy)
import { TutorialV2Scene } from './scenes/TutorialV2Scene.js'; // TUTORIAL SCENE (V2)
import { TutorialMiniScene } from './scenes/TutorialMiniScene.js'; // TUTORIAL SCENE (Mini)
import rexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'; // LANDING / MENUSCENE (rexUI)

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
  // LANDING / MENUSCENE: start at Menu, include tutorial(s) + gameplay scenes
  scene: [MenuScene, TutorialScene, TutorialV2Scene, TutorialMiniScene, PvpScene]
};

const game = new Phaser.Game(config);

// resize handler
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
