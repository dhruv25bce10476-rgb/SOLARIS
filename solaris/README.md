# SOLARIS — Intelligent Solar Tracking Simulator

A physics-inspired interactive solar tracking simulator. A deterministic
Perturb & Observe optimization controller continuously reorients a
simulated solar panel to maximize captured irradiance, and compares the
result against a fixed panel over a simulated day (06:00–18:00).

## Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript (ES6+), Bootstrap 5, Bootstrap
  Icons, Three.js (loaded directly, no React/Next/TypeScript/Tailwind).
- **Backend:** Node.js, Express.js, EJS server-side rendering, a REST API.
- **No database** — the simulation is stateful in-memory per server process.

## Getting started

```bash
npm install
npm run dev     # nodemon, auto-restarts on change
# or
npm start       # plain node
```

Then open **http://localhost:3000**.

## Project structure

```
solaris/
├── server.js                  Express app entry point
├── routes/                    Page + REST API routes
├── controllers/                Request handlers
├── services/simulationService.js   Singleton simulation lifecycle + tick loop
├── simulation/                 Pure physics/optimization modules (no UI deps)
│   ├── solarPosition.js         Simplified solar-position model
│   ├── irradiance.js            Clear-sky + cosine-law irradiance
│   ├── panelPhysics.js          Vector geometry helpers
│   ├── trackingController.js    Perturb & Observe optimization controller
│   ├── energyModel.js           Power → energy integration
│   └── simulationEngine.js      Orchestrates a full simulation tick
├── views/                      EJS templates (index + partials)
└── public/                     CSS, client JS, assets
```

## REST API

| Method | Path                        | Description                          |
|--------|-----------------------------|---------------------------------------|
| GET    | /api/health                 | Health check                          |
| GET    | /api/config                 | Current simulation configuration      |
| GET    | /api/simulation/state       | Current telemetry snapshot            |
| GET    | /api/simulation/results     | Full history + energy comparison      |
| POST   | /api/simulation/start       | Start/resume the simulation loop      |
| POST   | /api/simulation/pause       | Pause the simulation loop             |
| POST   | /api/simulation/reset       | Reset time, energy, and history       |
| POST   | /api/simulation/step        | Advance a single tick manually        |
| POST   | /api/simulation/config      | Update panel area, efficiency, etc.   |
| POST   | /api/simulation/speed       | Set playback speed (1 / 10 / 50)      |
| POST   | /api/tracking/mode          | fixed / manual / automatic            |
| POST   | /api/panel/orientation      | Set manual panel azimuth/elevation    |

The frontend polls `/api/simulation/state` and `/api/simulation/results` on a
controlled interval (not on every animation frame); Three.js interpolates
panel motion locally between polls so nothing ever teleports.

## Physics model

```
I_received = I_sun × max(0, cos(θ))
P = I × A × η
```

`I_sun` (available irradiance) uses a simplified clear-sky model that
attenuates with sun elevation. `θ` is the incidence angle between the sun
direction vector and the panel's surface normal, computed as their dot
product. See the in-app "Simulation assumptions" section for the full list
of simplifications (no clouds, shading, temperature/inverter/mechanical
losses, etc.) — this is a physics-inspired educational simulator, not a
model of real-world measured solar performance.

## Note on this environment

This sandbox has no outbound network access, so `npm install` could not be
run here to produce a live demo. Every backend module was verified directly
with Node (`node --check` on all files, plus scripted runs of the physics
engine confirming the spec's test cases: 0° incidence → 100% of available
irradiance, 60° → ~50%, 90° → ~0%, and tracking accumulating more energy
than a fixed panel over a full simulated day). Run `npm install && npm run
dev` locally to launch it in a browser.
