// Cosmetic only. The extraction pad, collision and AI targets stay unchanged.
export function carParkCenter(x, y, dir, cell, viewport = null) {
  // Along the departure axis the roof spans 1.4 cells. Put its rear edge
  // 0.8 cells outside the pad center: a guarding character remains visible.
  const center = { x: x + dir.x * cell * 1.5, y: y + dir.y * cell * 1.5 };
  if (!viewport) return center;
  // Rotated roof + all ink copies must fit, not only the sprite center.
  const ink = Math.max(2, Math.round(cell * 0.09));
  const halfX = cell * (dir.x ? 0.7 : 1.3) + ink;
  const halfY = cell * (dir.x ? 1.3 : 0.7) + ink;
  const clamp = (value, half, span) => Number.isFinite(span) && span > 0
    ? (span >= half * 2 ? Math.max(half, Math.min(span - half, value)) : span / 2)
    : value;
  center.x = clamp(center.x, halfX, viewport.width);
  center.y = clamp(center.y, halfY, viewport.height);
  return center;
}

export function carDepartureTargets(scene) {
  return [...new Set([scene.car, ...(scene.car?._outline || []),
    scene.carLights, scene.vfx?.carBeacon].filter(Boolean))];
}

export function carSkidLines(seed, car, dir, cell) {
  if (!car || !dir || !(cell > 0)) return [];
  // Independent cosmetic hash; retries keep the same mark choice.
  let hash = ((seed >>> 0) ^ 0x534b4944) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0;
  if (hash % 3 !== 0) return [];
  return [-1, 1].map(side => {
    const x = car.x - dir.x * cell * 2 - dir.y * side * cell * 0.42;
    const y = car.y - dir.y * cell * 2 + dir.x * side * cell * 0.42;
    return { x1: x, y1: y, x2: x + dir.x * cell * 1.25, y2: y + dir.y * cell * 1.25 };
  });
}
