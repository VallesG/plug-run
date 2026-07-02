# Plug Run LA

**A fast-paced arcade game set in the streets of LA. Run from AI plugs, defend stashes, and climb the leaderboards.**

## Game Modes

### 🏃 Run the Block (PvE Runner)
Chain together successful stash-house escapes. Grab the package, dodge the AI plug, and make it to the getaway car. Progressive difficulty scales from beginner-friendly (Round 1) to expert-level (Round 50+).

### 🛡️ Defend the Stash (PvE Plug)
Stop the AI runner from stealing your stash. Hunt them down with limited ammo and strategic weapon switching. Run out of bullets? Switch to melee combat.

### 📚 Learn the Streets (Tutorial)
Interactive 6-stage tutorial teaching movement, abilities, combat, and extraction mechanics. Perfect for new players.

### 📊 The Board (Leaderboards)
Daily and all-time leaderboards for both Runner and Plug modes. Track your Stash collected and REP earned.

### ⚔️ Street Wars (Coming Soon)
1v1 PvP - Human Runner vs Human Plug in real-time battles.

## Features

### Core Gameplay
- **Dual Roles**: Play as Runner (escape) or Plug (defend)
- **Runner Powers**: Phase (pass through walls), Dash (speed burst), Decoy (distraction)
- **Plug Combat**: 3 weapons with limited ammo, melee fallback, tactical positioning
- **Smart AI**: Progressive difficulty scaling, decoy detection, weapon switching
- **Adaptive Music**: Dynamic audio that intensifies with round progression (volume + filter sweep)

### Progression System
- **Stash Collection**: Earn 1 stash per round (once per day, no duplicates)
- **REP System**: Earn reputation based on performance with diminishing returns
- **Daily Routes**: Seeded daily maps with shared leaderboards
- **All-Time Stats**: Track career-long performance

### Controls
- **Desktop**: WASD/Arrow keys + mouse aiming + keyboard shortcuts (1-4 for weapons, Q/E for powers)
- **Mobile**: Touch controls with virtual joystick and tap-to-shoot
- **Corridor Assist**: Intelligent wall-sliding for smooth navigation

### Technical Features
- **Zoom Detection**: Warning banner when browser zoom ≠ 100%
- **Seeded RNG**: Deterministic daily routes for fair leaderboard competition
- **LocalStorage**: Persistent user data, inventory, and leaderboard scores
- **Responsive Design**: Adapts to all screen sizes (mobile-first)

## Tech Stack

- **Phaser 3** - Game engine
- **Vite** - Build tool & dev server
- **rexUI** - Polished UI components
- **Web Audio API** - Adaptive music system with low-pass filtering
- **LocalStorage** - Persistence layer

## Project Structure

```
plug-run-la/
├── client/
│   ├── src/
│   │   ├── scenes/           # Game scenes (Menu, Runner, Plug, Tutorial, Leaderboard)
│   │   ├── controllers/      # Modular controllers (AI, Combat, VFX, UI, etc.)
│   │   ├── utils/            # Utilities (maze gen, seeded RNG, leaderboards, etc.)
│   │   ├── audio/            # AudioManager with adaptive music
│   │   └── main.js           # Phaser config & initialization
│   ├── public/
│   │   └── audio/            # Music tracks & SFX
│   └── index.html            # Entry point
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
cd client
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173` (or next available port)

### Build for Production

```bash
npm run build
```

Output in `client/dist/`

### Preview Production Build

```bash
npm run preview
```

## AI System

### Plug AI (Runner Mode Opponent)
- **Progressive Difficulty**: Scales from Round 1 (tutorial-easy) → Round 50 (human-level) → ∞
- **Speed Scaling**: 50 px/s → 99 px/s (Round 50) → continues scaling
- **Fire Rate**: 1.8s → 0.75s (Round 50) → 0.3s minimum
- **Accuracy**: 1.0 spread → 0.35 (Round 50) → 0.1 minimum
- **Weapon System**: Random weapon each round (pistol/doublebarrel/rifle), limited ammo
- **Decoy Detection**: 95% fooled (Round 1) → 5% fooled (Round 50+)
- **Melee Fallback**: Automatically switches to melee when out of ammo

### Runner AI (Plug Mode Opponent)
- **Progressive Difficulty**: Scales from Round 1 (very easy) → Round 50 (human-level) → ∞
- **Speed Scaling**: 60 px/s → 98 px/s (Round 50) → continues scaling
- **Human-like Mistakes**: Wander chance, hesitation, panic behavior (all reduce with rounds)
- **Power Usage**: 20% optimal (Round 4) → 95% optimal (Round 30+)
- **Orientation Delay**: 2.5s thinking time (Round 1) → 0.3s (Round 50)

## Adaptive Music System

Music dynamically responds to difficulty progression:

- **Volume Ramping**: Quiet (20-28%) → Loud (45-50%) over rounds 1-30
- **Filter Sweep**: Muffled 600Hz → Clear 20kHz over rounds 1-30
- **Track Selection**: Different beats for Runner (`bg_main`) and Plug (`bg_plug`) modes
- **Music Ducking**: Automatic volume reduction during gunshots/impacts

## Roadmap

### ✅ Completed (Alpha v1.0)
- [x] Dual-mode PvE (Runner & Plug)
- [x] Interactive tutorial system
- [x] Smart AI with progressive difficulty
- [x] Daily & all-time leaderboards
- [x] Adaptive music system
- [x] Mobile + desktop controls
- [x] Weapon system with ammo management
- [x] Runner power system (phase, dash, decoy)
- [x] Stash & REP progression
- [x] Zoom detection warning

### 🚧 In Progress (Alpha Testing)
- [ ] Balance tuning based on player feedback
- [ ] Bug fixes from alpha testers
- [ ] Performance optimization

### 📋 Planned (v1.1+)
- [ ] Account system (Firebase/Supabase)
- [ ] Cloud-synced leaderboards
- [ ] PvP mode (Street Wars)
- [ ] Weekly challenges
- [ ] Cosmetic unlocks
- [ ] Achievement system

### 🔮 Future (v2.0+)
- [ ] Multiple LA-themed maps
- [ ] Battle pass system
- [ ] Ranked matchmaking
- [ ] Tournaments & events
- [ ] Mobile app (Capacitor)

## License

All rights reserved. Private repository - do not distribute.

---

**Built with love in LA** 🌴

Repository: https://github.com/VallesG/plug-run
