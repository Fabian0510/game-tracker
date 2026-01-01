# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Realm Tracker is a board game health tracker with a fantastical theme. Players can track vitality (health) and arcane shields, with animated damage/healing effects and webcam/upload portrait photos.

## Development Commands

```bash
# Install dependencies (requires Node.js 21.7+)
npm install

# Development server (runs on localhost:5173)
npm run dev

# Production build
npm run build

# Lint code
npm run lint

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

Player state is managed in `App.jsx` with a single `players` array. Each player object:
```js
{ id: number, name: string, health: number, shields: number, photo: string|null }
```

### Game Mechanics (Critical Logic in App.jsx)

**Shield/Health Damage System (`adjustHealth` function):**
- When taking damage (negative amount), shields absorb damage FIRST
- Remaining damage after shield depletion affects health
- Healing (positive amount) only affects health, not shields

**Health Color Thresholds:**
- 0 or below: Gray (defeated)
- 1-3: Red (critical)
- 4-6: Amber (warning)
- 7-10: Green (healthy)
- Initial health: 10

### Photo Capture System (PlayerCard.jsx)

**Two photo methods:**
1. **Webcam capture** - Uses `getUserMedia` API with mirrored preview
2. **File upload** - Standard file input with FileReader

**Camera requirements:**
- HTTPS required (except localhost) - browsers block camera access over HTTP
- Video mirroring: CSS `scaleX(-1)` for preview, canvas transform for captured image
- Camera stream initialization happens in `useEffect` after component renders to ensure video element exists

### Animation System (index.css)

Custom keyframe animations triggered by state changes in PlayerCard:
- `animate-damage` - Shake on health loss
- `animate-heal` - Glow pulse on health gain
- `animate-shield-break` - Wobble when shields deplete
- `animate-float-up` - Floating damage/heal numbers
- `animate-flash` - Screen flash overlays

Animations are triggered by tracking previous health/shield values with refs and comparing in useEffect.

## Tech Stack

- **React 19** with Vite 7
- **Tailwind CSS 4** (Vite plugin, not PostCSS)
- **No state management library** - React useState only
- **No backend** - fully client-side SPA
- **Docker** - Multi-stage build with nginx for production

## Important Constraints

1. **Node.js version:** Requires 21.7+ for Vite 7 (uses `crypto.hash`)
2. **Camera API:** Only works over HTTPS or localhost
3. **Photo storage:** Base64 encoded in state (not persisted - lost on reload)
4. **Health default:** Always initialize new players at health: 10
