// Threat selection — which opponent is the dangerous one right now.
//
// Lives in logic/ rather than next to its caller because everything here is
// pure arithmetic over {x, y} and a couple of scene lookups. utils/gameUtils.js
// imports Phaser, which drags a browser into anything that touches it; this
// module imports nothing, so the headless test suite can exercise it directly.

// Manhattan distance on a grid that wraps at both edges. The maze is a torus:
// walking off the right edge arrives at the left, so the short way round is
// often the way round.
export function toroDist(a, b, cols, rows) {
  const dx = Math.min(Math.abs(a.x - b.x), cols - Math.abs(a.x - b.x));
  const dy = Math.min(Math.abs(a.y - b.y), rows - Math.abs(a.y - b.y));
  return dx + dy;
}

/**
 * The plug a runner should actually be afraid of right now.
 *
 * From round 8 the game spawns a second opponent, and when the PLAYER is the
 * runner that second opponent is a second PLUG (scene.defender2). RunnerAI was
 * written for the opposite arrangement — it drives the AI runner while a human
 * plugs, where the dual spawn produces a second RUNNER and there is only ever
 * one defender — so every threat check in it reached for scene.defender and
 * nothing else. Borrowed to drive a runner, which is exactly what BotDriver
 * does, that blindness is total: from round 8 half the guns on screen do not
 * exist as far as that AI is concerned. It panics at the wrong distance, spends
 * its escape powers on the wrong threat, and phases straight into the other one.
 *
 * Nearest wins, measured the same toroidal way the rest of the pathfinding
 * measures. A dead or unspawned plug is not a threat and is skipped. With no
 * live defender2 this returns scene.defender unchanged, so shipped plug-mode
 * behaviour is bit-for-bit what it was.
 */
export function nearestPlug(scene, from) {
  const d1 = scene.defender;
  const d2 = scene.defender2;
  const live = (p) => !!(p && p.active && p.visible);

  if (!live(d2)) return d1;
  if (!live(d1)) return d2;

  const origin = scene.toCell(from.x, from.y);
  const near = (p) => toroDist(origin, scene.toCell(p.x, p.y), scene.cols, scene.rows);
  return near(d2) < near(d1) ? d2 : d1;
}
