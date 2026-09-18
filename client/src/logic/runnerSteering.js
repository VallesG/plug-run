// Runner drag steering direction, shared by the real game (PlayerController)
// and the tutorial (TutorialMiniScene) so the two can never drift apart. The
// tutorial used to carry a hand-copy of an older version of this maths, which
// is how it ended up without cardinal preference or angular hysteresis while
// the real game had both.
//
// Cardinal preference with hysteresis: a drag within 22 degrees of an axis
// snaps to that exact cardinal, and once snapped it HOLDS up to 28 degrees so
// ordinary thumb jitter cannot shake it loose. A snapped diagonal holds up to
// 17 degrees from its diagonal axis. Outside those regions the drag keeps its
// free angle. This is a feel setting, not a wall/collision correction: it sees
// only the gesture, never the map or any other actor.

const CARDINAL_HOLD_DEG = 28;
const DIAGONAL_HOLD_DEG = 17;
const CARDINAL_FRESH_DEG = 22;
const DIAGONAL_FRESH_RAD = 0.26; // ~15 degrees

// Drag anchor: the gesture vector runs from a floating origin to the finger,
// so a small drag anywhere on screen is full steering control. Past full
// deflection the origin follows the finger, which is what makes reversing
// mid-drag respond without a return trip across the whole drag distance.
export const MOVE_MAX_PX = 56;
export const MOVE_DEAD_PX = 10;

// Turning a corner. Because the origin trails MOVE_MAX_PX behind along the
// OLD heading, a 90-degree turn leaves the origin 56px off to the side, and
// the origin->finger vector stays diagonal until the new direction finally
// outweighs it — measured at 81px of sideways travel to read as a clean
// cardinal, 50px of which steered diagonally. That is the "it goes diagonal
// instead of turning the corner" case. So watch the finger's recent travel:
// once it has covered TURN_SAMPLE_PX in a heading more than TURN_DEG off what
// the runner is currently doing, treat it as a deliberate turn and re-anchor
// to where that turn began, so the new heading is measured from the corner
// rather than from 56px back up the old corridor. A straight drag and a
// sustained deliberate diagonal both keep agreeing with the committed
// direction, so neither ever trips this.
// A turn is roughly PERPENDICULAR to the current heading. Travel that runs
// back along it is the finger easing off toward the anchor, or reversing
// outright — both of which the floating anchor already handles, and
// re-anchoring there would turn "pull back to centre" into "steer the
// opposite way", which is not what a returning thumb means.
const TURN_SAMPLE_PX = 14;
const TURN_DEG = 45;
const TURN_MAX_DEG = 135;

const radians = degrees => degrees * Math.PI / 180;

// Unsigned angle between two vectors, wrap-safe.
const angleBetween = (ax, ay, bx, by) =>
  Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));

/**
 * @param {number} dx gesture delta x
 * @param {number} dy gesture delta y
 * @param {object|null} previous the snap this gesture last committed to
 * @returns {{vector:{x:number,y:number}, snap:object|null}} the direction to
 *   move, and the snap state to carry into the next call (null = free angle).
 */
export function runnerDragVector(dx, dy, previous = null) {
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const distance = other => Math.abs(Math.atan2(
    Math.sin(angle - other), Math.cos(angle - other)));

  if (previous && distance(previous.angle) <= radians(previous.cardinal ? CARDINAL_HOLD_DEG : DIAGONAL_HOLD_DEG)) {
    return { vector: previous.vector, snap: previous };
  }

  // A hold just broke, or this is a fresh gesture. A FRESH gesture (no
  // previous) uses the tight bands below (22 / ~15 degrees) so a first touch
  // still has real free-angle room between them. A BROKEN hold uses the same
  // width as the hold band it just left (28 / 17), so leaving one snapped
  // direction always lands in the contiguous adjacent one instead of falling
  // through the gap between the tight bands — that gap is what let a smooth,
  // continuous drag (no new gesture at all) jump from a held cardinal straight
  // to an arbitrary unsnapped angle the instant the hold gave out, e.g. 28
  // degrees held dead straight, then one more degree of ordinary thumb drift
  // reporting a ~29-degree half-diagonal.
  const cardinal = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
  const cardinalBand = radians(previous ? CARDINAL_HOLD_DEG : CARDINAL_FRESH_DEG);
  if (distance(cardinal) <= cardinalBand) {
    const vector = { x: Math.round(Math.cos(cardinal)), y: Math.round(Math.sin(cardinal)) };
    return { vector, snap: { angle: cardinal, cardinal: true, vector } };
  }

  const nearest = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  const diagonalBand = previous ? radians(DIAGONAL_HOLD_DEG) : DIAGONAL_FRESH_RAD;
  if (distance(nearest) < diagonalBand) {
    const vector = { x: Math.cos(nearest), y: Math.sin(nearest) };
    return { vector, snap: { angle: nearest, cardinal: false, vector } };
  }

  return { vector: { x: dx / length, y: dy / length }, snap: null };
}

/**
 * One pointer sample of a runner drag: advance the floating anchor (with
 * corner-turn detection) and classify the resulting gesture vector.
 *
 * @param {object} anchor the live gesture origin — the caller's _swipeStart.
 *   Mutated in place: x/y float with the finger, and lastX/lastY/turnX/turnY/
 *   dir carry the recent-travel window. x0/y0/t are left alone for the
 *   caller's own commit thresholds.
 * @param {number} px pointer x
 * @param {number} py pointer y
 * @param {object|null} snap the snap state from the previous sample
 * @returns {{vector:{x:number,y:number}, snap:object|null}|null} null while
 *   inside the dead zone, meaning this sample should not steer.
 */
export function runnerDragStep(anchor, px, py, snap = null) {
  // Recent-travel window, for spotting a genuine change of heading.
  const lastX = anchor.lastX ?? px, lastY = anchor.lastY ?? py;
  const movedX = px - lastX, movedY = py - lastY;
  let turnX = (anchor.turnX || 0) + movedX;
  let turnY = (anchor.turnY || 0) + movedY;
  // Only a sample that actually moved is evidence of anything.
  let turnN = (anchor.turnN || 0) + ((movedX || movedY) ? 1 : 0);
  anchor.lastX = px; anchor.lastY = py;

  // A turn has to be sustained across samples. One outsized jump — a dropped
  // frame, or a synthetic event — is not evidence of a new heading, so the
  // window keeps accumulating until it spans at least two samples rather than
  // being spent on the strength of a single delta.
  if (Math.hypot(turnX, turnY) >= TURN_SAMPLE_PX && turnN >= 2) {
    const dir = anchor.dir;
    const off = dir ? angleBetween(turnX, turnY, dir.x, dir.y) : 0;
    if (dir && off > radians(TURN_DEG) && off < radians(TURN_MAX_DEG)) {
      anchor.x = px - turnX;
      anchor.y = py - turnY;
    }
    turnX = 0; turnY = 0; turnN = 0; // window spent; measure the next one fresh
  }
  anchor.turnX = turnX; anchor.turnY = turnY; anchor.turnN = turnN;

  let dx = px - anchor.x, dy = py - anchor.y;
  let L = Math.hypot(dx, dy);
  if (L > MOVE_MAX_PX) {
    const over = L - MOVE_MAX_PX;
    anchor.x += (dx / L) * over;
    anchor.y += (dy / L) * over;
    dx = px - anchor.x; dy = py - anchor.y; L = MOVE_MAX_PX;
  }
  if (L < MOVE_DEAD_PX) return null;

  const stepped = runnerDragVector(dx, dy, snap);
  anchor.dir = stepped.vector;
  return stepped;
}

/**
 * Cardinal a release resolves to, for the quick-swipe path. Shared so the
 * tutorial classifies a flick exactly like the real game does.
 */
export function releaseCardinal(dx, dy) {
  return (Math.abs(dx) > Math.abs(dy))
    ? { x: dx > 0 ? 1 : -1, y: 0 }
    : { x: 0, y: dy > 0 ? 1 : -1 };
}
