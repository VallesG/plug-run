
  # BaseGameScene.js Refactoring Task

  ## Context
  You're refactoring a 3500+ line Phaser.js game scene file that has grown into a "God Object".
  The game is "Plug Run LA" - a grid-based action game with two roles (runner/plug), AI opponents,
  weapons, powers, and daily route progression.

  ## Current File Structure Problem
  - All game logic crammed into BaseGameScene.js (~3500 lines)
  - Hard to maintain, test, or balance individual systems
  - Difficult to debug because changes in one area affect unpredictable parts
  - Poor separation of concerns

  ## Extraction Order (CRITICAL - Do in this order)

  ### Phase 1: PlayerController.js
  Extract ALL player movement and input handling:
  - `handlePlayerMovement(sprite, speed, dt)` - main movement loop with wall sliding
  - `processKeyboardInput()` - arrow keys / WASD handling
  - `processTouchInput(swipeData)` - swipe and drag input (mobile)
  - `applyCorridorAssist(sprite, direction, dt)` - corridor centering logic
  - Related properties: `playerMoveDir`, `playerGunAim`, `playerIntendedDir`, `corridorAssistStrength`, `_cornerAssistActive`

  **File locations in BaseGameScene:**
  - Movement logic: lines ~2026-2228 (moveHuman function)
  - Touch handlers: lines ~2800-2922 (beginSwipe, updateSwipe, endSwipe)
  - Corridor assist: lines ~41-80 in gameUtils.js (use existing helper)

  **Integration:** BaseGameScene should call `this.playerController.update(dt)` in main update loop

  ---

  ### Phase 2: AIController.js
  Extract ALL AI behavior:
  - `updateAIRunner(delta)` - runner/attacker AI
  - `updateDefenderAI(dt)` - plug/defender AI
  - `aiRunnerCruise()` - fallback wandering
  - `considerAIRunnerPower(now)` - AI power usage
  - Street Wars AI calls: `applyStreetWarsAI()`, `updateStreetWarsRunnerAI()`, `updateStreetWarsPlugAI()`

  **File locations:**
  - updateAIRunner: lines ~2436-2545
  - updateDefenderAI: lines ~2335-2374
  - Related properties: `aiRunner`, `aiPlug`, `_aiVX`, `_aiVY`, `_aiLastMoveDir`, etc.

  **Integration:** BaseGameScene calls `this.aiController.updateRunner(delta)` and `updatePlug(delta)`

  ---

  ### Phase 3: CombatSystem.js
  Extract weapons, bullets, and combat:
  - `spawnWeaponBurst(origin, aim, weapon, group)` - fire bullets
  - `updateBullets(delta)` - move bullets, check expiry
  - `checkHits()` - collision detection with player
  - `firePlugWeapon()` / `tryMouseFire()` - plug firing logic
  - `fireRunnerWeapon()` - runner weapon fire (if applicable)
  - Weapon stats and balancing

  **File locations:**
  - spawnWeaponBurst: lines ~1383-1478
  - updateBullets: lines ~2547-2595
  - checkHits: lines ~2597-2650
  - firePlugWeapon/tryMouseFire: search for these methods

  **Integration:** BaseGameScene calls `this.combatSystem.update(delta)` and `fire(aim, weapon)`

  ---

  ### Phase 4: VisualEffects.js
  Extract ALL particle effects, tweens, trails:
  - `spawnBulletTrail(x, y, color)` - bullet trail particles
  - `spawnImpactEffect(x, y, color)` - bullet hit VFX
  - `updateCharacterTrails(dt)` - runner/plug flame trails
  - `drawStashHalo()` - animated stash glow
  - `showFloatingRewards(stash, rep)` - floating numbers
  - `showCarBeacon()` - extraction car lights
  - All tween animations

  **File locations:**
  - Bullet effects: lines ~2550-2595
  - Stash halo: lines ~1282-1297
  - Character trails: search for updateRunnerTrail, updateDefenderTrail

  **Integration:** BaseGameScene calls `this.vfx.update(dt)` and VFX methods as needed

  ---

  ### Phase 5: GameUI.js
  Extract ALL UI and modal logic:
  - `promptPlugWeaponSelection(onDone)` - weapon modal with continue button
  - `promptRunnerPowerSelection(onDone)` - power modal with continue button
  - `showModal()` - generic modal helper
  - Continue button logic (NEW - check for premium + route progress)
  - Round label, stage label UI
  - All button creation and interaction

  **File locations:**
  - promptPlugWeaponSelection: lines ~1487-1620
  - promptRunnerPowerSelection: lines ~1623-1823
  - showModal: lines ~92-160
  - Continue button code: lines ~1559-1611, 1754-1806

  **Integration:** BaseGameScene calls `this.gameUI.showWeaponSelection()` and `showPowerSelection()`

  ---

  ### Phase 6: ProgressionManager.js
  Extract round/extraction/session flow:
  - `startRound(roundNum)` - round initialization
  - `startExtractionSequence()` - runner reached extraction
  - `endRound(winner)` - end of round logic, scoring
  - `recordRoundStats()` - save to leaderboard, route progress
  - REP calculation and tracking
  - Session state management

  **File locations:**
  - startExtractionSequence: lines ~1058-1204
  - endRound: search for this method
  - REP tracking: lines ~1100-1143

  **Integration:** BaseGameScene calls `this.progressionManager.startRound()` etc.

  ---

  ## Requirements for Each File

  1. **Constructor** - takes `scene` reference (the BaseGameScene instance)
  2. **update(delta)** - called every frame
  3. **init properties** - set up in constructor, don't pollute BaseGameScene
  4. **Use scene references carefully** - avoid circular dependencies
  5. **Keep helper methods** - e.g., `this.scene.toCell()`, `this.scene.canMoveTo()` (these stay in BaseGameScene)
  6. **Use dependency injection** - pass needed data as parameters, don't reach into scene

  ## After All Phases

  Cleanup BaseGameScene.js:
  - Remove extracted methods and properties
  - Add clear comments showing what each controller does
  - Main update loop should look like:
    ```javascript
    update(time, delta) {
      this.playerController.update(delta);
      this.aiController.updateRunner(delta);
      this.aiController.updatePlug(delta);
      this.combatSystem.update(delta);
      this.vfx.update(delta);
      this.progressionManager.checkRoundProgress();
      // ... etc
    }

  Testing Requirements

  After each phase:
  1. Game must run without errors
  2. Movement/AI/UI must work identically to before
  3. No console warnings about undefined properties
  4. Build must succeed with no changes to bundle size (roughly)

  Output Format

  For each phase, provide:
  1. New file (e.g., PlayerController.js)
  2. Updated BaseGameScene.js (with extracts removed and calls added)
  3. Summary of what was moved
  4. Any breaking changes or gotchas

  Start with Phase 1: PlayerController.js and wait for confirmation before moving to Phase 2.
