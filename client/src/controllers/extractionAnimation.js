import { carDepartureTargets, carSkidLines } from '../logic/getawayCar.js';

// Shared getaway animation: the runner is pulled into the car, then the car
// drives off leaving skid marks.
//
// Campaign and Block Rivals both play this. Rivals used to skip it entirely
// and cut straight to a "NEXT HOUSE" card the moment the extraction sensor
// tripped, which read as the round breaking off mid-run. Keeping one
// implementation means the modes cannot drift apart again the way a
// hand-copied version would.
export const EXTRACTION_BOARD_MS = 400;
export const EXTRACTION_DRIVE_MS = 1200;

/**
 * @param scene     the game scene (needs car, carOutDir, cell, seed, tweens)
 * @param boardMs   how long the runner takes to be pulled in
 * @param driveMs   how long the car takes to leave frame
 * @param onComplete fires once the car is gone (or immediately if there is no car)
 * @returns the total animation length in ms, so a caller on a clock can
 *          account for it.
 */
export function playExtraction(scene, { boardMs = EXTRACTION_BOARD_MS,
  driveMs = EXTRACTION_DRIVE_MS, onComplete } = {}) {
  const done = () => { try { onComplete?.(); } catch (e) { console.error('[extraction]', e); } };

  const drive = () => {
    if (!scene.car) { done(); return; }
    const dist = scene.cell * 8;
    // A car parked along the curb pulls away the way it faces; an older
    // street-facing car drives straight out.
    const heading = scene.car._heading || scene.carOutDir;
    const dx = heading?.x || 0;
    const dy = heading?.y || 0;

    // The ink silhouette is part of the car, not a parked floor decal.
    const targets = carDepartureTargets(scene);
    const skidLines = carSkidLines(scene.seed, scene.car, heading, scene.cell);
    if (skidLines.length) {
      const marks = scene.add.graphics().setDepth(5);
      marks.lineStyle(Math.max(1, scene.cell * 0.08), 0x080b0c, 0.55);
      for (const line of skidLines) marks.lineBetween(line.x1, line.y1, line.x2, line.y2);
    }

    scene.tweens.add({
      targets,
      x: `+=${dx * dist}`,
      y: `+=${dy * dist}`,
      duration: driveMs,
      ease: 'Sine.easeIn',
      // Along the curb the street can be short: fade out as it goes.
      ...(scene.car._heading ? { alpha: 0 } : {}),
      onComplete: done
    });
  };

  // Dual AI: animate the CARRIER (who has the stash), not just attacker.
  const carrier = scene.stashCarrier || scene.attacker;

  if (carrier && carrier.active && scene.car) {
    const noseX = scene.car.x + (scene.carOutDir?.x || 0) * (scene.cell * 0.8);
    const noseY = scene.car.y + (scene.carOutDir?.y || 0) * (scene.cell * 0.8);
    // "Sucked into vehicle" effect matching the tutorial animation. The carry
    // package stays attached so it shrinks with the runner.
    scene.tweens.add({
      targets: carrier,
      x: noseX,
      y: noseY,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: boardMs,
      ease: 'Sine.easeIn',
      onComplete: () => {
        carrier.setVisible(false);
        try { scene.removeCarryPackage?.(); } catch {}
        drive();
      }
    });
  } else {
    // No runner or no car to animate: clean up and carry on.
    scene.removeCarryPackage?.();
    drive();
  }

  return boardMs + driveMs;
}
