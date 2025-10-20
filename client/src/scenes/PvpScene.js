import { BaseGameScene } from './BaseGameScene.js';

export class PvpScene extends BaseGameScene {
  constructor() {
    super('PVP');
  }

  init(data) {
    super.init?.(data);
    this.mode = data?.mode || 'pvp';
    this.role = data?.role ?? null;
  }

  create() {
    this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY, 'Multiplayer coming soon', {
        color: '#cbd1ff',
        fontSize: '20px'
      })
      .setOrigin(0.5);
  }

  update() {}
}
