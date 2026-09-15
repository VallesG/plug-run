import { BaseGameScene } from './BaseGameScene.js';
import { PVE_BLOCK_MAPS } from '../logic/blockFormat.js';

export class PlugScene extends BaseGameScene {
  constructor() {
    super('PLUG');
  }

  init(data) {
    super.init?.(data);
    this.mode = data?.mode || 'pve';
    this.pveRound = data?.pveRound || 1;
    // A session saved under the old endless ladder can sit past the end of the
    // block (round 17, 25...). Resuming there would play a finale map beyond
    // map 15. Treat it as a finished block and start a new one.
    if (this.mode === 'pve' && this.pveRound > PVE_BLOCK_MAPS) this.pveRound = 1;
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
