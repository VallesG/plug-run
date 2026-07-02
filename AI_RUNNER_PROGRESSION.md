# AI Runner Progression - Implementation Checklist

## Goal
Design AI runner difficulty that:
- Rounds 1-10: Very beatable (easy for new players learning plug role)
- Rounds 10-50: Clear progression, runner gets noticeably smarter each round
- Round 50: "Human level" difficulty (matches Street Wars AI skill)
- Round 50+: Continues scaling to elite level

---

## Philosophy

The AI runner was already 65% of the way there with good movement fluidity and solid base mechanics. The remaining 35% is about making it feel **human-like**:

1. **Imperfect decision-making** - Humans make routing mistakes, especially under pressure
2. **Panic behavior** - Humans get frantic when being chased
3. **Learning curve** - Powers and tactics improve with "experience" (rounds)
4. **Orientation time** - Humans need a moment to assess the map at round start

**Street Wars AI = Our Round 50 Target**
Street Wars mode already has human-like behaviors tuned for "skilled human" level. We'll scale from terrible (R1) to Street Wars level (R50) to elite (R100).

---

## Phase 1: Base Stats Design ✅

### Round 1 Stats (Tutorial Phase)
- [x] Speed: 60 px/s (very slow, easy to catch)
- [ ] Planning interval: 340ms (slow decision-making)
- [ ] Sprint multiplier: 1.05x (barely faster when close to plug)
- [x] Orientation delay: 2.5 seconds (confused at round start)
- [x] Wander chance: 0.4 (40% chance to take wrong path)
- [x] Hesitation chance: 0.3 (30% chance to pause/replan unnecessarily)
- [x] Overcommit chance: 0.5 (50% chance to chase plug instead of objective)
- [x] Panic threshold: 6 cells (panics when plug is within 6 cells)
- [x] Power skill: 0.2 (20% chance to use power optimally)

---

## Phase 2: Progression Formulas ✅

### Speed (pixels per second)
- [x] Formula: `60 + (round - 1) × 0.77`
- [x] No cap - scales infinitely
- [x] Round 1: 60 px/s (very slow)
- [x] Round 10: 67 px/s
- [x] Round 25: 78 px/s
- [x] Round 50: 98 px/s (matches mobile runner - human level)
- [x] Round 100: 136 px/s (approaching desktop runner at 140)
- [x] Round 104: 140 px/s (matches desktop runner)

### Orientation Delay (seconds)
- [ ] Formula: `2.5 - (round - 1) × 0.0449`
- [ ] Minimum: 0.1 seconds
- [ ] Round 1: 2.5s (looks around confused before moving)
- [ ] Round 10: 2.1s
- [ ] Round 25: 1.4s
- [ ] Round 50: 0.3s (quick human orientation)
- [ ] Round 100: 0.1s (instant assessment)

### Wander Chance (probability of taking suboptimal path)
- [ ] Formula: `0.4 - (round - 1) × 0.00714`
- [ ] Minimum: 0.01 (1%)
- [ ] Round 1: 0.40 (40% chance of mistakes)
- [ ] Round 10: 0.34 (34%)
- [ ] Round 25: 0.23 (23%)
- [ ] Round 50: 0.05 (5%, matches Street Wars)
- [ ] Round 100: 0.01 (1%, nearly perfect)

### Hesitation Chance (probability of unnecessary replanning)
- [ ] Formula: `0.3 - (round - 1) × 0.00612`
- [ ] Minimum: 0.0 (0%)
- [ ] Round 1: 0.30 (30%)
- [ ] Round 10: 0.24 (24%)
- [ ] Round 25: 0.15 (15%)
- [ ] Round 50: 0.05 (5%, matches Street Wars)
- [ ] Round 100: 0.0 (0%, no hesitation)

### Overcommit Chance (probability of chasing plug instead of objective)
- [ ] Formula: `0.5 - (round - 1) × 0.00816`
- [ ] Minimum: 0.05 (5%)
- [ ] Round 1: 0.50 (50% chance to chase instead of go to objective)
- [ ] Round 10: 0.43 (43%)
- [ ] Round 25: 0.30 (30%)
- [ ] Round 50: 0.10 (10%, matches Street Wars)
- [ ] Round 100: 0.05 (5%, tactical aggression only)

### Panic Threshold (distance in cells where AI starts panicking)
- [ ] Formula: `6 - (round - 1) × 0.0408`
- [ ] Minimum: 2 cells
- [ ] Round 1: 6 cells (panics early)
- [ ] Round 10: 5.6 cells
- [ ] Round 25: 5.0 cells
- [ ] Round 50: 4.0 cells (reasonable panic range)
- [ ] Round 100: 2.0 cells (stays composed until very close)

### Panic Multiplier (how much mistakes increase when panicking)
- [ ] Formula: `5.0 - (round - 1) × 0.0408`
- [ ] Minimum: 1.5x
- [ ] Round 1: 5.0x (total chaos when panicked)
- [ ] Round 10: 4.6x
- [ ] Round 25: 4.0x
- [ ] Round 50: 3.0x (still makes mistakes but less severe)
- [ ] Round 100: 1.5x (slight degradation under pressure)

### Power Usage Skill (probability of using power optimally)
- [ ] Formula: `0.2 + (round - 1) × 0.0153`
- [ ] Maximum: 0.95 (95%)
- [ ] Round 1-3: 0.0 (no powers unlocked)
- [ ] Round 4: 0.25 (25% optimal, 75% random/wasted)
- [ ] Round 10: 0.34 (34%)
- [ ] Round 25: 0.57 (57%)
- [ ] Round 50: 0.95 (95%, nearly perfect)
- [ ] Round 100: 0.95 (capped at 95%)

Note: Power skill affects WHEN powers are used (optimal timing vs random/panic usage)

---

## Phase 3: Implementation Tasks

### Update RunnerAI.js - Base Stats
- [ ] Add `orientationDelay: 2.5` to getRunnerBaseStats()
- [ ] Add `wanderChance: 0.4` to getRunnerBaseStats()
- [ ] Add `hesitationChance: 0.3` to getRunnerBaseStats()
- [ ] Add `overcommitChance: 0.5` to getRunnerBaseStats()
- [ ] Add `panicThreshold: 6` to getRunnerBaseStats()
- [ ] Add `panicMultiplier: 5.0` to getRunnerBaseStats()
- [ ] Add `powerSkill: 0.2` to getRunnerBaseStats()

### Update RunnerAI.js - Progression Formulas
- [x] Update speed to pixel-based formula (60 + (round - 1) × 0.77)
- [x] Add orientation delay formula in applyRunnerProgression()
- [x] Add wander chance formula
- [x] Add hesitation chance formula
- [x] Add overcommit chance formula
- [x] Add panic threshold formula
- [x] Add panic multiplier formula
- [x] Add power skill formula
- [x] Add comments explaining each formula

### Update RunnerAI.js - Behavior Implementation
- [ ] Implement orientation delay timer in updateRunnerBehavior()
- [ ] Skip pathfinding/movement during orientation delay
- [ ] Implement wandering (random direction selection)
- [ ] Implement hesitation (unnecessary replanning)
- [ ] Implement overcommit (chase plug instead of objective)
- [ ] Detect panic state (plug within threshold distance)
- [ ] Apply panic multiplier to all mistake chances
- [ ] Create resetRunnerOrientation() helper function

### Update RunnerAI.js - Power Usage
- [ ] Add power skill check in considerRunnerPowerUse()
- [ ] Low skill: Random/suboptimal power usage
- [ ] High skill: Strategic timing (current logic)
- [ ] Panic state increases chance of panic power usage

### Update BaseGameScene.js
- [ ] Import resetRunnerOrientation from RunnerAI.js
- [ ] Call resetRunnerOrientation() in beginRoundTimer()

---

## Phase 4: Testing Checklist

### Round 1-10 (Easy Phase)
- [ ] Round 1: Runner very confused, takes wrong paths, panics easily
- [ ] Round 1: 2.5s orientation delay visible (stands still then moves)
- [ ] Round 5: Noticeable improvement but still makes lots of mistakes
- [ ] Round 10: Better but still beatable for decent plug player
- [ ] Powers (R4+): Often wasted or used at wrong times

### Round 50 (Human Level - Street Wars Target)
- [ ] Speed feels competitive (current progression already good)
- [ ] Pathfinding mostly smart with occasional 5% mistakes
- [ ] Panics at reasonable distance (4 cells), mistakes increase 3x
- [ ] Powers used strategically 95% of the time
- [ ] Orientation delay barely noticeable (0.3s)
- [ ] Overall feels like facing a skilled human player

### Round 100+ (Elite)
- [ ] Nearly perfect pathfinding (1% mistakes)
- [ ] Only panics when plug is very close (2 cells)
- [ ] Even when panicking, only 1.5x mistake increase
- [ ] Powers used with near-perfect timing (95%)
- [ ] Instant orientation (0.1s)
- [ ] Feels like facing a pro player

### General Testing
- [ ] Progression feels smooth (no sudden jumps)
- [ ] Each round is noticeably smarter than previous
- [ ] No stats break the game (negative values, etc.)
- [ ] Mistakes feel "human" not "buggy"
- [ ] Panic behavior looks realistic (frantic but logical)
- [ ] Power usage makes sense for skill level

---

## Phase 5: Balance Tuning

### If Rounds 1-10 are too hard:
- [ ] Increase base wander chance (try 0.5)
- [ ] Increase hesitation chance (try 0.4)
- [ ] Increase panic threshold (try 7 or 8 cells)
- [ ] Lower power skill starting value

### If Round 50 is too easy:
- [ ] Decrease wander chance at R50 (try 0.03 instead of 0.05)
- [ ] Decrease panic threshold (try 3 cells)
- [ ] Decrease panic multiplier (try 2.0x)
- [ ] Adjust Street Wars AI comparison

### If scaling is too fast/slow:
- [ ] Adjust per-round multipliers
- [ ] Test specific milestone rounds (10, 25, 50, 75, 100)
- [ ] Compare against Street Wars AI feel

---

## Notes

**Why these behaviors?**
- Runner already has great movement (fluid, good pathfinding)
- Missing piece is **human-like decision-making imperfection**
- Under pressure (panic), humans make more mistakes
- Skill with powers increases with "experience" (rounds)

**Street Wars as benchmark:**
- Street Wars AI = Round 50 target skill level
- Already has wander (5%), hesitation (5%), overcommit (10%)
- Use these percentages as our Round 50 targets

**Panic system:**
- Key differentiator between beginner and expert AI
- Beginners panic early and make many mistakes
- Experts stay cool and only make slight errors under pressure
- Makes the AI feel reactive and human

**Power progression:**
- Early rounds: Powers exist but AI doesn't know how to use them well
- Mid rounds: Learning, getting better
- Round 50+: Strategic mastery
- Prevents Round 4+ from feeling too hard just because powers unlock
