// tiny helpers to add "graphic" neon vibes without external assets

export function makeParticleTextures(scene) {
  // create tiny circle + star textures for particle emitters
  if (scene.textures.exists('px-circle')) return; // already made

  const g = scene.add.graphics();

  g.clear(); g.fillStyle(0xffffff, 1); g.fillCircle(4,4,4);
  g.generateTexture('px-circle', 8, 8);

  g.clear();
  g.fillStyle(0xffffff, 1);
  g.beginPath();
  g.moveTo(8,0); g.lineTo(10,6); g.lineTo(16,8); g.lineTo(10,10); g.lineTo(8,16);
  g.lineTo(6,10); g.lineTo(0,8); g.lineTo(6,6); g.closePath(); g.fillPath();
  g.generateTexture('px-star', 16, 16);

  g.destroy();
}

export function createParallaxCity(scene) {
  // two side columns of silhouette "buildings" that scroll down
  const leftX = 40, rightX = scene.game.config.width - 40;
  const H = scene.game.config.height;

  const makeStrip = (x, tint, speed) => {
    const group = scene.add.group();
    for (let y=-H; y<=H; y+=40) {
      const w = 22;
      const h = 20 + Math.floor(Math.random()*36);
      const r = scene.add.rectangle(x, y, w, h, tint).setAlpha(0.42);
      group.add(r);
    }
    return { group, speed };
  };

  const back  = makeStrip(24, 0x1a1f38, 40);
  const front = makeStrip(scene.game.config.width-24, 0x232b4d, 70);

  return {
    update(delta) {
      const adv = (layer) => {
        const dy = (layer.speed * delta) / 1000;
        layer.group.getChildren().forEach(b => {
          b.y += dy;
          if (b.y > H + 30) b.y -= H + 80;
        });
      };
      adv(back); adv(front);
    }
  };
}

export function pulseTween(scene, target) {
  scene.tweens.add({
    targets: target,
    scale: 1.15,
    duration: 220,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
}

export function glowBehind(scene, x, y, radius, color, alpha=0.35) {
  // soft "glow" using a larger translucent circle below the object
  const glow = scene.add.circle(x, y, radius, color).setAlpha(alpha);
  glow.setDepth(-1);
  return glow;
}
