// Exterior-only city cartography. Personal claims, no live/shared gang scores.
import { cityMapLayout } from '../logic/city.js';
import { windowGang } from '../logic/window.js';
const INK = 0x07090b;
const WARM = 0xf1d28a;
export function drawCityMap(scene, modal, { view, focusBlock = view.currentBlock, claimedBlock = null, onSelect } = {}) {
  if (!modal?.contentBounds || !modal.registerExtra) return null;
  const area = modal.contentBounds;
  const a = cityMapLayout({ ...area, height: Math.max(0, area.height - 18) });
  if (!a.scale) return null;
  let destroyed = false, zooming = false;
  const animated = [];
  const root = scene.add.container(a.x, a.y).setScale(a.scale).setScrollFactor(0).setDepth(20002);
  const g = scene.add.graphics();
  root.add(g);
  const rect = (color, x, y, w, h, alpha = 1) => { g.fillStyle(color, alpha); g.fillRect(x, y, w, h); };
  const line = (color, width, x1, y1, x2, y2, alpha = 1) => {
    g.lineStyle(width, color, alpha); g.lineBetween(x1, y1, x2, y2);
  };
  const text = (x, y, value, color, size = 12) => {
    const label = scene.add.text(x, y, value, {
      fontFamily: 'Arial, sans-serif', fontSize: Math.max(size, 10 / a.scale) + 'px',
      fontStyle: 'bold', color, align: 'center'
    }).setOrigin(0.5);
    root.add(label); return label;
  };
  rect(INK, 0, 0, a.width, a.height);
  // Water edge and rail corridor give the city a recognizable silhouette.
  for (let y = 4; y < a.height; y += 8) {
    rect(0x112126, 3, y, 12 + (Math.floor(y / 40) % 3) * 3, 6, 0.65);
    rect(0x24302a, 300, y, 14, 5, 0.35);
  }
  line(0x303936, 1, 303, 0, 303, 390);
  line(0x303936, 1, 308, 0, 308, 390);
  for (let i = 1; i < a.nodes.length; i++) {
    const prev = a.nodes[i - 1], node = a.nodes[i];
    const reached = view.blocks[i - 1].status !== 'locked';
    line(0x626653, 12, prev.x, prev.y, node.x, node.y, reached ? 0.6 : 0.08);
    line(0x242e30, 8, prev.x, prev.y, node.x, node.y, reached ? 1 : 0.2);
    const length = Math.hypot(node.x - prev.x, node.y - prev.y);
    for (let d = 4; d < length - 4; d += 12) {
      const t = d / length;
      rect(0xafa17a, prev.x + (node.x - prev.x) * t - 1,
        prev.y + (node.y - prev.y) * t - 1, 2, 2, reached ? 0.65 : 0.08);
    }
  }
  for (const [i, node] of a.nodes.entries()) {
    const block = view.blocks[i], lit = block.status !== 'locked';
    const crew = windowGang(block.owner);
    const accent = crew?.color ?? (block.status === 'current' ? WARM : 0x889080);
    const left = node.x - node.w / 2, top = node.y - node.h / 2;
    if (lit) {
      rect(0x151e18, left - 5, top + 6, node.w + 10, node.h - 8);
      rect(0x384132, left, top, node.w, node.h - 6);
      rect(accent, left, top, node.w, 2, block.owner ? 0.85 : 0.35);
      line(0x777763, 3, left + 3, node.y + 5, left + node.w - 3, node.y + 5);
      line(0x293234, 2, left + 3, node.y + 5, left + node.w - 3, node.y + 5);
      for (let house = 0; house < 4; house++) {
        const x = left + 8 + house * 26, y = top + 8;
        rect(0x060a0b, x + 2, y + 3, 20, 21, 0.85);
        rect(house % 2 ? 0x697062 : 0x62635a, x, y, 20, 21);
        rect(0x17211d, x + 10, y, 10, 21, 0.28);
        line(0xa0a18a, 0.6, x + 10, y, x + 10, y + 21, 0.6);
        rect(0x11191a, x + 14, y + 4, 3, 4);
        g.fillStyle(WARM, 0.07).fillCircle(x + 10, node.y + 7, 9);
        g.fillStyle(WARM, 0.13).fillCircle(x + 10, node.y + 7, 5);
        rect(WARM, x + 9, node.y + 5, 2, 3);
      }
      if (block.owner) {
        line(0xede4c8, 1, left + node.w - 6, top - 4, left + node.w - 6, top + 8);
        rect(accent, left + node.w - 5, top - 4, 8, 5);
      }
    } else {
      rect(0x0d1213, left + 5, top + 5, node.w - 10, node.h - 10, 0.8);
      line(0x313a36, 0.8, left + 12, top + 10, left + node.w - 12, top + 10, 0.3);
    }
    const number = String(block.local).padStart(2, '0');
    text(node.x, node.y + 20, number + (block.owner ? ' · ' + ({ crossline: 'CL', 'iron-row': 'IR', afterlight: 'AL' })[block.owner]
      : block.status === 'cleared' ? ' · —' : block.status === 'current' ? ' · YOU' : ''),
      lit ? crew?.css || '#e9dfc7' : '#4c5654', 11);
    if (block.blockIndex === focusBlock) {
      g.lineStyle(1.5, WARM, 0.9).strokeRect(left - 3, top - 3, node.w + 6, node.h + 4);
      text(node.x, top - 10, '▼', '#f1d28a', 12);
      if (onSelect) {
        const hit = scene.add.rectangle(node.x, node.y, node.w, Math.max(node.h, 44 / a.scale),
          0xffffff, 0.001).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => { if (!zooming && !destroyed) onSelect(); });
        root.add(hit);
      }
    }
  }
  const claimed = view.blocks.find(b => b.blockIndex === claimedBlock);
  if (claimed?.status === 'cleared' && scene.tweens?.add) {
    // A short pull-back from the newly claimed district, not another house modal.
    root.setScale(a.scale * 1.12).setAlpha(0);
    root.setPosition(a.x - a.width * a.scale * 0.06, a.y - a.height * a.scale * 0.06);
    scene.tweens.add({ targets: root, scaleX: a.scale, scaleY: a.scale,
      x: a.x, y: a.y, alpha: 1, duration: 500, ease: 'Sine.easeOut' });
    const node = a.nodes[claimed.local - 1];
    const glow = scene.add.graphics();
    glow.lineStyle(2, windowGang(claimed.owner)?.color || WARM, 0.8)
      .strokeRect(node.x - node.w / 2 - 5, node.y - node.h / 2 - 5, node.w + 10, node.h + 10);
    root.add(glow); animated.push(glow);
    scene.tweens.add({ targets: glow, alpha: 0, duration: 350, yoyo: true, repeat: 1 });
  }
  const legend = scene.add.text(area.x + area.width / 2, area.y + area.height - 7,
    'CL Crossline · IR Iron Row · AL Afterlight', {
      fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#a2aca0', align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20003);
  modal.registerExtra(legend);
  modal.registerExtra({ get active() { return !destroyed; }, get visible() { return root.visible; },
    setVisible(value) { root.setVisible(value); },
    destroy() { if (destroyed) return; destroyed = true; scene.tweens?.killTweensOf(root); animated.forEach(o => scene.tweens?.killTweensOf(o)); root.destroy(true); }
  });
  return {
    focus(blockIndex, done) {
      if (destroyed || zooming) return;
      zooming = true;
      const node = a.nodes[view.blocks.findIndex(b => b.blockIndex === blockIndex)];
      if (!node || !scene.tweens?.add) { done?.(); return; }
      scene.tweens.killTweensOf(root);
      const scale = a.scale * 3.2;
      scene.tweens.add({ targets: root, scaleX: scale, scaleY: scale,
        x: modal.contentBounds.x + modal.contentBounds.width / 2 - node.x * scale,
        y: modal.contentBounds.y + modal.contentBounds.height / 2 - node.y * scale,
        alpha: 0, duration: 380, ease: 'Sine.easeInOut', onComplete: () => { if (!destroyed) done?.(); }
      });
    }
  };
}
