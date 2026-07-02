# AI Difficulty Progression - Implementation Checklist

## Goal
Design AI opponent difficulty that:
- ✅ Rounds 1-10: Very forgiving (almost everyone makes it)
- ✅ Rounds 10-50: Clear progression, noticeable improvement each round
- ✅ Round 50: "Basic human level" difficulty
- ✅ Round 50+: Continues scaling infinitely

---

## Phase 1: Base Stats Design ✅

### Round 1 Stats (Tutorial Phase)
- [x] Speed: 50 pixels/sec (very slow movement)
- [x] Fire Rate: 1.8 seconds (very slow shooting)
- [x] Vision: 250 pixels (slightly reduced)
- [x] Accuracy: 1.0 inaccuracy (terrible aim)
- [x] Reaction: 800ms (slow reactions)

---

## Phase 2: Progression Formulas ✅

### Linear Scaling Formulas (Round 1 → 50 → 100+)

#### Speed (pixels/sec)
- [x] Formula: `50 + (round - 1) × 1.84`
- [x] Round 1: 50 px/s
- [x] Round 10: 67 px/s
- [x] Round 50: 140 px/s (human level)
- [x] Round 100: 232 px/s
- [x] No cap - scales forever

#### Fire Rate (seconds between shots)
- [x] Formula: `1.8 - (round - 1) × 0.0214`
- [x] Minimum: 0.3 seconds
- [x] Round 1: 1.8s
- [x] Round 10: 1.6s
- [x] Round 50: 0.75s (human level)
- [x] Round 100: 0.3s (capped)

#### Accuracy (inaccuracy value 0-1)
- [x] Formula: `1.0 - (round - 1) × 0.0133`
- [x] Minimum: 0.1 inaccuracy
- [x] Round 1: 1.0 (spray everywhere)
- [x] Round 10: 0.88 (still bad)
- [x] Round 50: 0.35 (human level)
- [x] Round 100: 0.1 (capped)

#### Reaction Time (milliseconds)
- [x] Formula: `800 - (round - 1) × 8.16`
- [x] Minimum: 100ms
- [x] Round 1: 800ms
- [x] Round 10: 726ms
- [x] Round 50: 400ms (human level)
- [x] Round 100: 100ms (capped)

#### Vision Range (pixels)
- [x] Formula: `250 + (round - 1) × 2.04`
- [x] Round 1: 250 px
- [x] Round 10: 268 px
- [x] Round 50: 350 px (human level)
- [x] Round 100: 452 px
- [x] No cap - scales forever

---

## Phase 3: Implementation Tasks ✅

### Update PlugAI.js
- [x] Update `getPlugBaseStats()` with new Round 1 values
- [x] Rewrite `applyPlugProgression()` with linear formulas
- [x] Add minimum bounds for fire rate (0.3s)
- [x] Add minimum bounds for accuracy (0.1 inaccuracy)
- [x] Add minimum bounds for reaction (100ms)
- [x] Remove old percentage-based scaling
- [x] Add comments explaining the progression system

---

## Phase 4: Testing Checklist

### Round 1-10 (Easy Phase)
- [ ] Round 1: AI barely moves, shots spray wildly, very slow
- [ ] Round 5: Noticeable improvement but still easy
- [ ] Round 10: Clearly better than round 1, but forgiving

### Round 50 (Human Level)
- [ ] Speed feels like a decent player
- [ ] Accuracy is good but not perfect
- [ ] Reaction time feels responsive
- [ ] Overall challenge is "fair human opponent"

### Round 100+ (Expert)
- [ ] Speed continues increasing past round 50
- [ ] Fire rate capped at reasonable minimum
- [ ] Accuracy capped at slight randomness
- [ ] Reaction capped at near-instant
- [ ] Vision continues expanding

### General Testing
- [ ] Progression feels smooth (no sudden jumps)
- [ ] Each round is noticeably harder than previous
- [ ] No stats break the game (negative values, etc.)
- [ ] AI orientation still works correctly
- [ ] AI shooting still works correctly

---

## Phase 5: Balance Tuning

### If Rounds 1-10 are too hard:
- [ ] Reduce base speed further (try 40 px/s)
- [ ] Increase base fire rate (try 2.0s)
- [ ] Increase base inaccuracy (try 1.2)

### If Round 50 is too easy:
- [ ] Increase target values (speed 160, fire 0.6, etc.)
- [ ] Adjust per-round increments

### If scaling is too fast/slow:
- [ ] Adjust per-round multipliers
- [ ] Test specific milestone rounds (10, 25, 50, 75, 100)

---

## Notes

**Why these stats?**
- Speed is PRIMARY difficulty (user priority #1)
- Accuracy is SECONDARY (user priority #2)
- Fire rate is TERTIARY (user priority #3)
- Vision and reaction support the core difficulty

**Infinite scaling approach:**
- Speed/Vision scale forever (no mechanical limits)
- Fire rate/Accuracy/Reaction hit reasonable minimums
- This creates asymptotic difficulty curve at high rounds
