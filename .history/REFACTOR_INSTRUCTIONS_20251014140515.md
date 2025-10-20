# Refactoring PvpScene.js - Instructions for Codex

## Goal
Split the massive `PvpScene.js` into three separate scene files for better maintainability:
1. **RunnerScene.js** - "Run the Block" mode (player as runner vs AI plug)
2. **PlugScene.js** - "Defend the Stash" mode (player as plug vs AI runner)
3. **PvpScene.js** - Future 1v1 multiplayer backbone (skeleton for now)

## CRITICAL: File Location Context
**THE CORRECT FILE TO REFACTOR IS:** `client/src/scenes/PvpScene.js`

**DO NOT USE:** Any `PvpScene.js` file in the client root folder (it was legacy and has been moved to recycle bin)

Always work from `client/src/scenes/PvpScene.js` - this is the active, current implementation!

## Important Context
- The current `PvpScene.js` already branches logic based on `this.role === 'runner'` vs `this.role === 'plug'`
- `this.attacker` is ALWAYS the runner sprite
- `this.defender` is ALWAYS the plug sprite
- When player is runner: they control `this.attacker`, AI controls `this.defender`
- When player is plug: they control `this.defender`, AI controls `this.attacker`

## Step 1: Extract Shared Utilities (Do this first!)

### Create: `client/src/utils/gameUtils.js`
Extract these helper functions from PvpScene.js:
- `rectsOverlap(a, b)` - AABB collision detection
- `stepCell(c, dir, cols, rows)` - Move cell in direction with wrapping
- `isWalkableDirFrom(scene, sprite, dir)` - Check if direction is walkable
- `applyCenterBias(scene, sprite, dir, dt)` - AI corridor centering
- `corridorAssist(scene, sprite, dir, dt)` - Player corridor assist (touch controls)
- `toroDist(a, b, cols, rows)` - Toroidal distance calculation
- `randomCardinal()` - Random direction picker

### Create: `client/src/utils/spriteFactory.js`
Extract these sprite creation functions:
- `makeRunnerSprite(scene, x, y, cell)` - Creates runner sprite container
- `makePlugSprite(scene, x, y, cell)` - Creates plug sprite container
- `updateAvatarVisuals(scene, dt)` - Updates sprite animations and orientation

**CRITICAL**: Keep the orientation fix! Lines 411-441 and 449-464 check `isPlayer` to prevent AI aim from affecting player sprites.

### Create: `client/src/utils/mazeGenerator.js`
Extract these maze/arena generation functions:
- `generateSquareMaze(cols, rows)` - Main maze generation
- `pickObjectives(g, cols, rows)` - Pick stash/extract/spawn locations
- All the furniture/decoration placement logic

## Step 2: Create Base Scene Class

### Create: `client/src/scenes/BaseGameScene.js`
This will be a Phaser Scene base class containing:

**Properties both modes share:**
- `mode` (pve/pvp)
- `pveRound`, `pveSession`
- `cols`, `rows`, `cell`, `pad`
- `grid`, `walls`, `stash`, `extract`, `car`
- `hasStash`, `carrySlow`, `meleeEnabled`
- `unlockDelayMs`, `stashUnlockAt`
- `timerMs`, `endAt`, `roundOver`, `roundPausedForMenu`
- Trail tracking: `_runnerTrailTimer`, `_plugTrailTimer`, etc.

**Methods both modes share:**
- `computeLayoutFromViewport()` - Responsive sizing
- `recomputeSpeedsFromCell()` - Speed scaling
- `toCell(x, y)`, `toWorldX(cx)`, `toWorldY(cy)` - Coordinate conversion
- `isWallAtWorld(x, y)`, `isWalkableCell(cx, cy)` - Collision checking
- `canMoveTo(sprite, nx, ny)` - AABB collision for sprites
- `isBulletBlockedAtWorld(x, y)` - Bullet collision
- `ensureUnstuck(sprite)` - Unstuck logic
- `neighbors4(cell)` - Get 4-neighbors
- `findNextStepTowards(start, goal)` - BFS pathfinding
- `randomFloorCellFarFrom(avoid, minDist)` - Random spawn point
- `drawNeonArena()` - Wall rendering
- `makeObjectives(stashCell, extractCell)` - Stash/extract sprites
- `placeGetawayCar()` - Car sprite
- `showCarBeacon()` - Car lights animation
- `addCarryPackage()`, `removeCarryPackage()` - Package sprite on runner
- `updateRunnerTrail(dt)`, `updateDefenderTrail(dt)` - Flame trails
- `updateBullets(delta)` - Bullet movement
- `checkHits()` - Bullet collision detection
- `hit(who)` - Damage logic
- `canDamage(who)` - i-frame check
- `spawnWeaponBurst(who, aim, weapon, bulletGroup)` - Shooting
- `showModal(config)` - Modal UI system
- `toast(msg)` - Toast notifications

**Runner power methods (both modes need these for AI):**
- `activateRunnerPower(isAI)` - Activate runner ability
- `runnerIsPhasing()` - Check if runner is phasing
- `destroyDecoySprite()` - Destroy decoy
- `getRunnerFacing()` - Get runner facing direction

## Step 3: Create RunnerScene.js

### File: `client/src/scenes/RunnerScene.js`
```javascript
import { BaseGameScene } from './BaseGameScene.js';

export class RunnerScene extends BaseGameScene {
  constructor() { super('RUNNER'); }

  init(data) {
    super.init?.(data);
    this.mode = data?.mode || 'pve';
    this.pveRound = data?.pveRound || 1;
    this.pveSession = data?.pveSession || { rounds: 0, bestRound: 0 };
    this.role = 'runner'; // Fixed role
  }

  create() {
    // Generate maze
    // Create sprites: this.attacker (player), this.defender (AI)
    // Setup runner power selection modal
    // Setup touch controls
    // Start match
  }

  update(_, delta) {
    // Move player (this.attacker)
    // Run AI plug (this.defender) via updateDefenderAI(dt)
    // Update bullets, trails, etc.
    // Check win conditions
  }

  updateDefenderAI(dt) {
    // AI plug logic (from current PvpScene lines ~2215-2268)
  }

  // Include runner-specific methods:
  // - promptRunnerPowerSelection()
  // - updateRunnerAbilityUI()
  // - firePlug() - NO, runner can't shoot
}
```

**What to remove:**
- All `if (this.role === 'plug')` branches
- `updateAIRunner()` function
- `promptPlugWeaponSelection()`
- Plug shooting mechanics (runner doesn't shoot)

**What to keep:**
- Runner power system (phase, dash, decoy)
- AI plug defender logic
- Touch controls for runner movement

## Step 4: Create PlugScene.js

### File: `client/src/scenes/PlugScene.js`
```javascript
import { BaseGameScene } from './BaseGameScene.js';

export class PlugScene extends BaseGameScene {
  constructor() { super('PLUG'); }

  init(data) {
    super.init?.(data);
    this.mode = data?.mode || 'pve';
    this.pveRound = data?.pveRound || 1;
    this.pveSession = data?.pveSession || { rounds: 0, bestRound: 0 };
    this.role = 'plug'; // Fixed role

    // Track kills for "Defend the Stash" mode scoring
    this.killCount = 0;
  }

  create() {
    // Generate maze
    // Create sprites: this.attacker (AI), this.defender (player)
    // Setup plug weapon selection modal
    // Setup touch controls (including shoot button)
    // Start match - ENDLESS run for AI runner
  }

  update(_, delta) {
    // Move player (this.defender)
    // Run AI runner (this.attacker) via updateAIRunner(delta)
    // Update bullets, trails, etc.
    // Check win/lose conditions
  }

  updateAIRunner(delta) {
    // AI runner logic (from current PvpScene lines ~2288-2381)
    // Includes: pathfinding, juking, sprinting, cruise mode
  }

  // Include plug-specific methods:
  // - promptPlugWeaponSelection()
  // - firePlug()
  // - tryMouseFire()
  // - considerAIRunnerPower() - AI uses runner powers
  // - handleRunnerKilled() - NEW: Track kills, show +1 stash popup
  // - handleRunnerExtracted() - NEW: End round, show results
}
```

### **NEW: "Defend the Stash" Round Logic**

PlugScene should follow the **endless run the block mode** behavior where:

1. **AI Runner Behavior:**
   - AI runner spawns and runs endless attempts to extract
   - When killed, AI respawns after a delay and tries again
   - Round continues until AI runner successfully extracts

2. **Player Plug Scoring (from kills, NOT extractions):**
   - When player plug kills the AI runner:
     - Show "+1 Stash" popup (same style as Run the Block mode)
     - Award reputation points for the kill
     - Increment `this.killCount`
   - NO scoring from preventing extractions (that's not how plug mode works)

3. **Round End Condition:**
   - Round ends ONLY when AI runner successfully reaches extraction with the package
   - This counts as a "loss" for the player plug
   - Show round done screen (same as Run the Block mode) with stats:
     - "Round Failed" or "Stash Lost"
     - Total kills achieved this round
     - Stashes defended (total across session)
     - Option to retry same round or quit to menu

4. **Implementation Details:**
   ```javascript
   // In PlugScene.js

   handleRunnerKilled() {
     // Increment kill count
     this.killCount++;

     // Show +1 stash popup (reuse from RunnerScene)
     this.showStashPopup();

     // Award reputation
     this.awardReputation(10); // Or scale by round difficulty

     // Respawn AI runner after delay (like endless mode)
     this.time.delayedCall(3000, () => {
       this.respawnAIRunner();
     });
   }

   handleRunnerExtracted() {
     // AI runner made it to extraction = round over (player loses)
     this.roundOver = true;

     // Show round done screen
     this.showRoundDoneModal({
       result: 'lost',
       killsThisRound: this.killCount,
       totalStashesDefended: this.pveSession.totalKills || 0,
       round: this.pveRound
     });
   }
   ```

**What to remove:**
- All `if (this.role === 'runner')` branches
- `updateDefenderAI()` function
- `promptRunnerPowerSelection()`
- Runner ability UI

**What to keep:**
- Plug shooting mechanics
- Weapon selection system
- AI runner attacker logic
- AI runner power usage
- Endless respawn logic (like Run the Block mode)

## Step 5: Update Menu to Launch Correct Scenes

### File: `client/src/scenes/MenuScene.js`

Change lines 859-876:
```javascript
} else if (k === 'runner'){
  // Run the Block - play as runner
  cam.fadeOut(250, 0,0,0);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, ()=>{
    this.scene.transition({
      target: 'RUNNER',  // Changed from 'PVP'
      duration: 250,
      moveBelow: true,
      data: { mode: 'pve', pveRound: 1, pveSession: /* load from storage */ }
    });
  });
} else if (k === 'plug'){
  // Defend the Stash - play as plug
  cam.fadeOut(250, 0,0,0);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, ()=>{
    this.scene.transition({
      target: 'PLUG',  // Changed from 'PVP'
      duration: 250,
      moveBelow: true,
      data: { mode: 'pve', pveRound: 1, pveSession: /* load from storage */ }
    });
  });
}
```

## Step 6: Update Phaser Game Config

### File: `client/src/main.js` (or wherever game config is)

Update the scene array:
```javascript
import { MenuScene } from './scenes/MenuScene.js';
import { RunnerScene } from './scenes/RunnerScene.js';
import { PlugScene } from './scenes/PlugScene.js';
import { TutorialMiniScene } from './scenes/TutorialMiniScene.js';
// import { PvpScene } from './scenes/PvpScene.js'; // Keep for future multiplayer

const config = {
  // ...
  scene: [MenuScene, RunnerScene, PlugScene, TutorialMiniScene]
};
```

## Step 7: Handle End Round Transitions

In both RunnerScene and PlugScene, update `endRound()` method:

```javascript
endRound(winner) {
  // ... existing win/lose logic ...

  // For PvE mode, transition back to same scene with updated round
  if (this.mode === 'pve' && winner === (this.role === 'runner' ? 'attacker' : 'defender')) {
    // Player won - advance to next round
    modal.registerExtra(/* continue button that does: */
      this.scene.restart({
        mode: 'pve',
        pveRound: this.pveRound + 1,
        pveSession: this.pveSession
      })
    );
  } else {
    // Player lost or quit - return to menu
    this.scene.start('MENU');
  }
}
```

## Step 8: Testing Checklist

### RunnerScene:
- [ ] Runner movement feels responsive (no AI hijacking!)
- [ ] AI plug chases and shoots correctly
- [ ] Runner powers (phase, dash, decoy) work
- [ ] Can collect stash and reach extraction
- [ ] Win/lose conditions trigger correctly
- [ ] Round progression works (round 1 → 2 → 3...)
- [ ] Difficulty scales properly with rounds

### PlugScene:
- [ ] Plug movement feels responsive
- [ ] AI runner pathfinds to stash then extraction (endless attempts)
- [ ] Plug shooting works (mouse + touch)
- [ ] Weapon selection modal works
- [ ] Killing AI runner shows "+1 Stash" popup
- [ ] Killing AI runner awards reputation points
- [ ] AI runner respawns after being killed
- [ ] Round ends when AI runner successfully extracts
- [ ] Round done screen shows correct stats (kills, stashes defended)
- [ ] Difficulty scales properly with rounds (AI gets faster/smarter)

### Both:
- [ ] No console errors
- [ ] Flame trails render correctly
- [ ] Corridor assist works smoothly
- [ ] Game timer displays correctly
- [ ] Menu transitions work
- [ ] Mobile touch controls work
- [ ] Desktop keyboard/mouse works

## Important Notes

1. **Don't rush** - Do one file at a time, test after each step
2. **Keep the orientation fix** - The `isPlayer` checks in `updateAvatarVisuals` are critical
3. **Preserve difficulty scaling** - The `applyPvEDifficulty()` method with proper cell-based units
4. **Test on mobile** - Corridor assist and touch controls are critical
5. **Keep git history** - Commit after each major step so you can revert if needed

## Key Differences Between the Two Modes

### RunnerScene ("Run the Block"):
- **Player goal:** Collect stash and extract
- **Win condition:** Player reaches extraction with package
- **Lose condition:** AI plug kills player (player has limited HP)
- **Scoring:** +1 stash on successful extraction
- **Round ends:** When player extracts OR player dies

### PlugScene ("Defend the Stash"):
- **Player goal:** Stop AI runner from extracting for as long as possible
- **Win condition:** N/A (endless survival mode)
- **Lose condition:** AI runner reaches extraction with package
- **Scoring:** +1 stash per kill, +reputation per kill
- **Round ends:** ONLY when AI runner successfully extracts (AI respawns indefinitely when killed)
- **Gameplay loop:** Like endless Run the Block mode - AI keeps trying, player racks up kills until AI finally succeeds

## Order of Operations

1. ✅ Create new project "plug-run" (copy current project)
2. Create `gameUtils.js` - test imports work
3. Create `spriteFactory.js` - test imports work
4. Create `mazeGenerator.js` - test imports work
5. Create `BaseGameScene.js` - test it extends Phaser.Scene
6. Create `RunnerScene.js` - test it launches and works
7. Create `PlugScene.js` - test it launches and works
8. Update MenuScene.js transitions
9. Full gameplay testing
10. Celebrate! 🎉

## File Size Expectations

After refactor:
- `gameUtils.js` - ~200 lines
- `spriteFactory.js` - ~250 lines
- `mazeGenerator.js` - ~600 lines
- `BaseGameScene.js` - ~1500 lines
- `RunnerScene.js` - ~800 lines
- `PlugScene.js` - ~800 lines
- Total: ~4150 lines (vs 2200+ lines currently in PvpScene.js)

The increase is due to less duplication and clearer separation of concerns.

Good luck! This will make the codebase SO much more maintainable. 🚀
