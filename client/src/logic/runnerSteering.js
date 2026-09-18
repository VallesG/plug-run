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

const radians = degrees => degrees * Math.PI / 180;

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
 * Cardinal a release resolves to, for the quick-swipe path. Shared so the
 * tutorial classifies a flick exactly like the real game does.
 */
export function releaseCardinal(dx, dy) {
  return (Math.abs(dx) > Math.abs(dy))
    ? { x: dx > 0 ? 1 : -1, y: 0 }
    : { x: 0, y: dy > 0 ? 1 : -1 };
}
