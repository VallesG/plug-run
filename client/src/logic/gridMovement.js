// Runner/plug movement resolution against the wall grid, shared by the real
// game (PlayerController.applyLegacyMovement) and the tutorial
// (TutorialMiniScene.handleMovement). The tutorial used to carry a hand-copy
// that had the sub-stepping and the corner unstick but was missing the
// cornering assist entirely, so corners caught in the tutorial in a way they
// never do in a real round.
//
// `host` is whatever owns the grid — BaseGameScene or TutorialMiniScene. Both
// expose the same surface: cell, canMoveTo, toCell, toWorldX, toWorldY,
// isWalkableCell. Nothing here reads any actor other than the sprite being
// moved: movement is a function of input and wall geometry only, never of
// where an opponent happens to be standing.

/**
 * Move `sprite` by (vx, vy) * dt, resolving walls with sub-steps, cornering
 * assist, and the legacy corner unstick.
 */
export function resolveGridMovement(host, sprite, vx, vy, dt) {
  // Sub-step so fast movement cannot tunnel through thin walls.
  const dxTot = vx * dt;
  const dyTot = vy * dt;
  const stepMax = host.cell * 0.28; // less than half a tile

  const moveAxis = (amount, axis) => {
    let remaining = amount;
    const dir = Math.sign(remaining) || 0;
    const step = stepMax * dir;
    let guard = 0;

    while (Math.abs(remaining) > 0.0001 && guard++ < 32) {
      const d = (Math.abs(remaining) > stepMax) ? step : remaining;
      const nx = axis === 'x' ? sprite.x + d : sprite.x;
      const ny = axis === 'y' ? sprite.y + d : sprite.y;

      if (host.canMoveTo(sprite, nx, ny)) {
        if (axis === 'x') sprite.x = nx;
        else sprite.y = ny;
        remaining -= d;
      } else {
        break; // blocked on this axis
      }
    }
    return remaining; // leftover = how much of the intent was blocked
  };

  // Store position before movement for stuck detection
  const preX = sprite.x, preY = sprite.y;

  // Move on each axis
  const leftX = moveAxis(dxTot, 'x');
  const leftY = moveAxis(dyTot, 'y');

  // CORNERING ASSIST (Pac-Man style): if the player is pushing into a
  // blocked axis but the corridor they're aiming for DOES exist at their
  // current row/column, they're just misaligned with the lane center —
  // convert the blocked motion into perpendicular alignment so the turn
  // "catches" without pixel-perfect input. This is the difference
  // between corridors feeling tight and feeling like they fight you.
  const steerToLane = (blockedLeftover, axis) => {
    const dirSign = Math.sign(blockedLeftover);
    if (!dirSign) return;
    const c = host.toCell(sprite.x, sprite.y);
    if (axis === 'x') {
      if (!host.isWalkableCell?.(c.x + dirSign, c.y)) return; // no lane there — real wall
      const laneY = host.toWorldY(c.y);
      const dy = laneY - sprite.y;
      if (Math.abs(dy) < 0.5) return;
      const stepAmt = Math.min(Math.abs(dy), Math.abs(blockedLeftover)) * Math.sign(dy);
      const ny = sprite.y + stepAmt;
      if (host.canMoveTo(sprite, sprite.x, ny)) {
        sprite.y = ny;
        moveAxis(blockedLeftover * 0.5, 'x'); // retry the turn this frame
      }
    } else {
      if (!host.isWalkableCell?.(c.x, c.y + dirSign)) return;
      const laneX = host.toWorldX(c.x);
      const dx = laneX - sprite.x;
      if (Math.abs(dx) < 0.5) return;
      const stepAmt = Math.min(Math.abs(dx), Math.abs(blockedLeftover)) * Math.sign(dx);
      const nx = sprite.x + stepAmt;
      if (host.canMoveTo(sprite, nx, sprite.y)) {
        sprite.x = nx;
        moveAxis(blockedLeftover * 0.5, 'y'); // retry the turn this frame
      }
    }
  };
  if (Math.abs(leftX) > 0.0001) steerToLane(leftX, 'x');
  if (Math.abs(leftY) > 0.0001) steerToLane(leftY, 'y');

  // Legacy corner unstick logic:
  // If we barely moved (corner caught), softly nudge toward tile center to unstick
  if (Math.hypot(sprite.x - preX, sprite.y - preY) < 0.5 && (Math.abs(vx) + Math.abs(vy) > 0)) {
    const c = host.toCell(sprite.x, sprite.y);
    const cx = host.toWorldX(c.x);
    const cy = host.toWorldY(c.y);
    const ux = cx - sprite.x, uy = cy - sprite.y;
    const ul = Math.hypot(ux, uy) || 1;
    const nudge = Math.min(host.cell * 0.20, ul);
    const nx = sprite.x + (ux / ul) * nudge;
    const ny = sprite.y + (uy / ul) * nudge;

    if (host.canMoveTo(sprite, nx, ny)) {
      sprite.x = nx;
      sprite.y = ny;
    }
  }
}
