import { BaseGameScene } from './BaseGameScene.js';

export class RunnerScene extends BaseGameScene {
  constructor() {
    super('RUNNER');
  }

  init(data) {
    super.init?.(data);
    this.mode = data?.mode || 'pve';
    this.pveRound = data?.pveRound || 1;
    this.pveSession = data?.pveSession || { rounds: 0, bestRound: 0 };
    this.role = 'runner';
  }

  create() {
    super.create();
  }

  update(time, delta) {
    super.update(time, delta);
  }
}
