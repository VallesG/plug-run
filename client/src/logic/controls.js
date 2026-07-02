// basic swipe + tap detection for mobile
export function createTouchControls(scene, { minSwipe = 24 } = {}) {
  let startX = 0, startY = 0, startT = 0;

  scene.input.on('pointerdown', (p) => {
    startX = p.x; startY = p.y; startT = performance.now();
  });

  scene.input.on('pointerup', (p) => {
    const dx = p.x - startX;
    const dy = p.y - startY;
    const dt = performance.now() - startT;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const isTap = absX < minSwipe && absY < minSwipe && dt < 300;

    if (isTap) { scene.events.emit('tap'); return; }

    if (absX > absY) {
      if (dx > minSwipe) scene.events.emit('swipe-right');
      else if (dx < -minSwipe) scene.events.emit('swipe-left');
    } else {
      if (dy < -minSwipe) scene.events.emit('swipe-up');
      else if (dy > minSwipe) scene.events.emit('swipe-down');
    }
  });
}
