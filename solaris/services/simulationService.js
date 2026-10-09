/**
 * simulationService.js
 * Manages a single server-side simulation instance and its update loop.
 * The frontend polls /api/simulation/state at a controlled interval
 * rather than requesting a new value on every animation frame.
 */

const SimulationEngine = require('../simulation/simulationEngine');

const TICK_INTERVAL_MS = 200;
// Simulated hours advanced per tick at 1x speed.
const BASE_HOURS_PER_TICK = 0.5 / 60; // 30 simulated seconds per tick at 1x

class SimulationService {
  constructor() {
    this.engine = new SimulationEngine();
    this.intervalHandle = null;
  }

  getConfig() {
    return this.engine.config;
  }

  updateConfig(partial) {
    this.engine.updateConfig(partial);
    return this.engine.getSnapshot();
  }

  getState() {
    return this.engine.getSnapshot();
  }

  getResults() {
    return this.engine.getResults();
  }

  start() {
    if (this.engine.time >= 18) {
      // day already complete — reset before starting again
      this.engine.reset();
    }
    this.engine.running = true;
    this._startLoop();
    return this.engine.getSnapshot();
  }

  pause() {
    this.engine.running = false;
    this._stopLoop();
    return this.engine.getSnapshot();
  }

  reset() {
    this._stopLoop();
    return this.engine.reset();
  }

  /** Advance the simulation by a single manual step (used for testing / manual stepping). */
  step() {
    const dtHours = BASE_HOURS_PER_TICK * this.engine.speed;
    return this.engine.tick(dtHours);
  }

  setTrackingMode(mode) {
    this.engine.setMode(mode);
    return this.engine.getSnapshot();
  }

  setSpeed(speed) {
    this.engine.setSpeed(speed);
    return this.engine.getSnapshot();
  }

  setPanelOrientation(azimuth, elevation) {
    this.engine.setManualOrientation(azimuth, elevation);
    return this.engine.getSnapshot();
  }

  _startLoop() {
    if (this.intervalHandle) return;
    this.intervalHandle = setInterval(() => {
      if (!this.engine.running) {
        this._stopLoop();
        return;
      }
      const dtHours = BASE_HOURS_PER_TICK * this.engine.speed;
      this.engine.tick(dtHours);
      if (this.engine.time >= 18) {
        this.engine.running = false;
        this._stopLoop();
      }
    }, TICK_INTERVAL_MS);
  }

  _stopLoop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}

// Singleton instance shared across requests
module.exports = new SimulationService();
