# Plug Run LA

**A fast-paced arcade runner where you escape stash houses and outrun the plug.**

## Concept

You're a runner trying to escape from stash houses across LA. Chain together successful escapes, grab loot, unlock weapons, and make it to the getaway car before the AI plug catches you. The longer your chain, the higher your score.

### Game Modes

- **Run the Block** (PvE): Chain stash-house escapes and build your reputation
- **Learn the Streets**: Quick tutorial with zero pressure
- **Street Wars** (Coming Soon): 1v1 PvP - Human Runner vs Human Plug
- **Daily Drop** (Coming Soon): Shared daily route with leaderboards

## Tech Stack

- **Phaser 3** - Game engine
- **Vite** - Build tool & dev server
- **rexUI** - UI plugin for polished components
- **LocalStorage** - Inventory & progression persistence

## Project Structure

```
plug-run-la/
├── client/
│   ├── src/
│   │   ├── scenes/       # Game scenes (Menu, PvP, Tutorial, etc.)
│   │   ├── logic/        # Game logic (maze, controls, RNG)
│   │   └── state/        # Global state (inventory)
│   ├── public/           # Assets (sprites, tiles, cars)
│   └── index.html        # Entry point
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

## Game Features

### Core Mechanics
- **Smooth movement** with keyboard (WASD/Arrows) + touch/mouse controls
- **Dash mechanic** (double-tap or Shift) for quick escapes
- **Phase ability** (Space) for brief invulnerability
- **Corridor assist** for touch-friendly navigation
- **Auto-drift** to keep you moving even when not actively controlling

### Progression
- Collect coins and product from stash houses
- Unlock weapons (pistol, shotgun, rifle, laser, double barrel)
- Manage ammo across runs
- Build up chain streaks for higher scores

### AI Behavior
- Smart pathfinding that hunts you through the maze
- Only catches you if you mess up - skill-based gameplay
- Adaptive difficulty based on player positioning

## Monetization Plans

- Rewarded video ads (continue runs, unlock items, 2x coins)
- Interstitial ads (between sessions)
- Optional IAPs (remove ads, weapon packs, cosmetics)
- Future: Battle pass for PvP seasons

## Roadmap

### v1.0 (Current)
- [x] Core PvE gameplay loop
- [x] Menu system with mode selection
- [x] Tutorial modes (multiple versions)
- [x] Touch + keyboard controls
- [x] Inventory & weapon system
- [ ] Final polish on chain runs
- [ ] Ad integration

### v2.0 (Planned)
- [ ] 1v1 PvP mode (Runner vs Plug)
- [ ] Leaderboards
- [ ] Daily challenges
- [ ] Account system
- [ ] Cosmetic skins

### v3.0+ (Future)
- [ ] Multiple LA-themed maps
- [ ] More weapon types
- [ ] Power-ups and special items
- [ ] Ranked matchmaking for PvP
- [ ] Tournaments & seasonal events

## Contributing

This is a solo project but feedback is welcome! Open an issue for bugs or feature suggestions.

## License

All rights reserved.

---

**Built with love in LA**
