# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Realm Tracker is a board game health tracker with a fantastical theme. Players can track vitality (health) and arcane shields, with animated damage/healing effects and webcam/upload portrait photos. The roster is saved to localStorage so a reload doesn't lose the game.

## Development Commands

```bash
# Install dependencies (requires Node.js 20.19+ or 22.12+)
npm install

# Development server (runs on localhost:5173)
npm run dev

# Production build
npm run build

# Lint code
npm run lint

# Unit tests (Node's built-in test runner, runs src/**/*.test.js)
npm test

# Preview production build
npm run preview
```

## Docker Commands

```bash
# Build image
docker build -t realm-tracker .

# Run container
docker run -d -p 8080:80 --name realm-tracker realm-tracker

# Update deployment
git pull
docker stop realm-tracker && docker rm realm-tracker
docker build -t realm-tracker .
docker run -d -p 8080:80 --name realm-tracker realm-tracker
```

## Architecture

### State Management

Player state is managed in `App.jsx` with a single `players` array, always updated with functional `setPlayers(prev => ...)`. Each player object:
```js
{ id: number, name: string, health: number, shields: number, photo: string|null }
```

**Persistence (`src/storage.js`):** `players` is saved to localStorage (`realm-tracker:players`) on every change and loaded on startup. Loaded data is validated and malformed players dropped. If photos exceed the storage quota, it falls back to saving without photos. "New Game" resets health/shields but keeps names and photos.

### Game Mechanics (Critical Logic in `src/gameLogic.js`)

Pure functions, unit tested in `src/gameLogic.test.js`. `App.jsx` just maps them over the player list.

**Shield/Health Damage System (`applyHealthChange`):**
- When taking damage (negative amount), shields absorb damage FIRST
- Remaining damage after shield depletion affects health
- Healing (positive amount) only affects health, not shields

**Health Color Thresholds (`getHealthTier`):**
- 0 or below: Gray (defeated)
- 1-3: Red (critical)
- 4-6: Amber (warning)
- 7-10: Green (healthy)
- Initial health: 10

### Photo Capture System (PlayerCard.jsx)

**Two photo methods:**
1. **Webcam capture** - Uses `getUserMedia` API with mirrored preview
2. **File upload** - Standard file input (value reset after each pick so the same file can be chosen again)

Both paths go through `src/imageUtils.js`, which downscales to max 640px and encodes JPEG, keeping photos small enough for state and localStorage.

**Photo controls:** The Camera/Upload overlay and the remove button are shown on mouse hover, on keyboard focus, or after tapping the portrait (touch devices have no hover). While hidden they are `pointer-events-none`, so a tap can't hit an invisible button. Removing a player takes two presses; the confirmation times out after 3s.

**Camera requirements:**
- HTTPS required (except localhost) - browsers block camera access over HTTP
- Video mirroring: CSS `scaleX(-1)` for preview, canvas transform for captured image
- Camera stream initialization happens in `useEffect` after component renders to ensure video element exists; the effect's cleanup stops the stream (on close or unmount)
- Unsupported contexts (no `navigator.mediaDevices`) and permission/device errors show specific messages

### Animation System (index.css)

Custom keyframe animations triggered by state changes in PlayerCard:
- `animate-damage` - Shake on health loss
- `animate-heal` - Glow pulse on health gain
- `animate-shield-break` - Wobble when shields deplete
- `animate-float-up` - Floating damage/heal numbers
- `animate-flash` - Screen flash overlays

`PlayerCard` keeps the previous health/shields in state and, when props change, calls `describeChange(prev, next)` *during render* (React's "adjust state on prop change" pattern - not in an effect, which the `react-hooks/set-state-in-effect` lint rule forbids). That sets an `effect` with an incrementing `id`:
- The floating number and flash overlay are keyed by `id`, so every hit remounts them and restarts the animation
- The card's own animation class is restarted via `getAnimations()` cancel/play in an effect, then the effect is cleared after its duration
- `prefers-reduced-motion` disables the shake/wobble/pulse animations

## Tech Stack

- **React 19** with Vite 7
- **Tailwind CSS 4** (Vite plugin, not PostCSS)
- **No state management library** - React useState only
- **No backend** - fully client-side SPA
- **Docker** - Multi-stage build with nginx for production

## Important Constraints

1. **Node.js version:** Vite 7 requires 20.19+ or 22.12+ (Docker build uses `node:22-alpine`)
2. **Camera API:** Only works over HTTPS or localhost
3. **Photo storage:** Downscaled base64 JPEG in state, persisted to localStorage when the quota allows
4. **Health default:** Always initialize new players at health: 10
