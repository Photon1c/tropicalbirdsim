# Spitball Simulator

A modular, browser-based Three.js simulator for launching soft-body spitballs at arcade cup towers, featuring interactive controls, physics, and fun effects.

## Structure

- `public/` — Static assets and `index.html` entry point.
- `src/` — Modular source code:
  - `main.js` — App entry point, scene setup, and main loop.
  - `physics/` — Physics world and integration (Ammo.js, soft/rigid bodies).
  - `objects/` — 3D objects: spitball, cups, launcher, etc.
  - `ui/` — User interface controls and overlays.
  - `utils/` — Helper functions and utilities.

## Features
- Mouse-driven projectile launcher
- Deployable, stackable arcade cup targets
- Soft-body spitball with burst/splash effect
- Collapsible/expandable interactive controls
- Timeline scrubbing and replay (planned)

## Getting Started

### 1. Install dependencies

```
npm install
```

### 2. Start the development server

This project uses [`serve`](https://www.npmjs.com/package/serve) to serve static files. If you don't have it globally, the `npm start` script will use `npx` to run it:

```
npm start
```

### 3. Open the app in your browser

Go to:

```
http://localhost:3000
```

or the port shown in your terminal.

> **Note:** If you open `public/index.html` directly in your browser (file://), you may encounter CORS or module loading issues. Always use a local server.

## Technologies Used
- [Three.js](https://threejs.org/) — 3D rendering
- [Ammo.js](https://github.com/kripken/ammo.js/) — Physics engine (soft/rigid bodies)
- [dat.GUI](https://github.com/dataarts/dat.gui) — UI controls

## Troubleshooting
- **Black screen or errors?** Make sure you are running a local server (see above).
- **Module not found?** Double-check your `npm install` completed successfully.
- **Physics not working?** Ammo.js is loaded asynchronously; some features are placeholders and will be improved.

## Modularity
Each major feature is in its own file or directory for maintainability and scalability. You can extend or swap out modules (e.g., add new cup types, change the launcher, etc.) easily.

---

Have fun launching spitballs! 