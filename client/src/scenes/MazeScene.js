import Phaser from 'phaser';
import { getDailySeed, createRNG } from '../logic/rng.js';
import { generateMaze } from '../logic/maze.js';

export class MazeScene extends Phaser.Scene {
  constructor() { super('Maze'); }

  init() {
    // grid & render config
    this.cell = 24;                // pixels per cell
    this.cols = 37;                // odd numbers look best
    this.rows = 25;
    this.pad = { x: 40, y: 40 };
  }

  create() {
    // RNG / seed
    this.seed = getDailySeed();
    this.rng = createRNG(this.seed);

    // Generate and draw
    this.grid = generateMaze(this.cols, this.rows, this.rng);
    this.drawMaze();

    // Player
    this.player = this.spawnPlayer();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wsad = this.input.keyboard.addKeys('W,A,S,D');

    // Physics collisions
    this.physics.add.collider(this.player, this.wallsLayer);

    // Camera
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // HUD
    this.hud = this.add.text(14, 8, '', { color: '#cbd1ff', fontSize: '14px' })
      .setScrollFactor(0)
      .setDepth(10);

    // Debug: press R to reroll (dev only)
    this.input.keyboard.on('keydown-R', () => {
      const s = Math.floor(Math.random() * 1e9).toString();
      localStorage.setItem('prla_seed', s);
      location.reload();
    });
  }

  drawMaze() {
    const { cell, cols, rows, pad } = this;
    this.worldW = cols * cell + pad.x * 2;
    this.worldH = rows * cell + pad.y * 2;

    // subtle floor
    this.add.rectangle(this.worldW / 2, this.worldH / 2, this.worldW, this.worldH, 0x0e1020, 0.95);

    // walls (static bodies)
    const walls = this.add.group();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (this.grid[y][x] === 0) {
          const wx = pad.x + x * cell + cell / 2;
          const wy = pad.y + y * cell + cell / 2;
          const rect = this.add.rectangle(wx, wy, cell, cell, 0x15192b).setStrokeStyle(1, 0x232b4d);
          walls.add(rect);
        }
      }
    }
    this.wallsLayer = this.physics.add.staticGroup();
    walls.getChildren().forEach(w => this.wallsLayer.add(w));

    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
  }

  spawnPlayer() {
    const start = this.findFloorNear(1, 1) || { x: 2, y: 2 };
    const px = this.pad.x + start.x * this.cell + this.cell / 2;
    const py = this.pad.y + start.y * this.cell + this.cell / 2;

    const p = this.add.rectangle(px, py, this.cell * 0.6, this.cell * 0.6, 0x7c4dff);
    this.physics.add.existing(p);
    p.body.setCollideWorldBounds(true);
    p.speed = 180;
    return p;
  }

  findFloorNear(x, y) {
    for (let r = 0; r < 8; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx, ny = y + dy;
          if (ny >= 0 && ny < this.rows && nx >= 0 && nx < this.cols && this.grid[ny][nx] === 1) {
            return { x: nx, y: ny };
          }
        }
      }
    }
    return null;
  }

  update() {
    // movement
    const b = this.player.body;
    const s = this.player.speed;
    let vx = 0, vy = 0;

    if (this.cursors.left.isDown || this.wsad.A.isDown) vx = -s;
    else if (this.cursors.right.isDown || this.wsad.D.isDown) vx = s;
    if (this.cursors.up.isDown || this.wsad.W.isDown) vy = -s;
    else if (this.cursors.down.isDown || this.wsad.S.isDown) vy = s;

    b.setVelocity(vx, vy);

    // HUD
    this.hud.setText(`Seed: ${this.seed}   Pos: ${Math.round(this.player.x)},${Math.round(this.player.y)}   R to reroll (dev)`);
  }
}
