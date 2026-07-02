import { BaseGameScene } from './BaseGameScene.js';

export class PlugScene extends BaseGameScene {
  constructor() {
    super('PLUG');
  }

  init(data) {
    super.init?.(data);
    this.mode = data?.mode || 'pve';
    this.pveRound = data?.pveRound || 1;
    this.pveSession = data?.pveSession || { rounds: 0, bestRound: 0 };
    this.role = 'plug';
  }

  create() {
    super.create();
  }

  update(time, delta) {
    super.update(time, delta);
  }
}
