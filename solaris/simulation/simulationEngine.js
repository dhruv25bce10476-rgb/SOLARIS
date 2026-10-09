/**
 * simulationEngine.js
 * Orchestrates the full SOLARIS simulation tick:
 *  1. Compute Sun position for the current simulated time.
 *  2. Compute irradiance/power for a fixed panel and a tracking panel.
 *  3. Advance the Perturb & Observe tracking controller.
 *  4. Integrate energy for both scenarios.
 *  5. Record a history sample for charting.
 */

const { getSunPosition } = require('./solarPosition');
const { toVector, incidenceAngleDeg, computePower } = require('./panelPhysics');
const { availableIrradiance, receivedIrradiance } = require('./irradiance');
const TrackingController = require('./trackingController');
const EnergyAccumulator = require('./energyModel');

const DAY_START = 6;
const DAY_END = 18;
const MAX_HISTORY_POINTS = 400;

class SimulationEngine {
  constructor(config = {}) {
    this.config = {
      latitude: config.latitude ?? 28,
      dayOfYear: config.dayOfYear ?? 172,
      panelArea: config.panelArea ?? 1.7, // m^2
      efficiency: config.efficiency ?? 0.21, // 21%
      fixedTiltElevation: config.fixedTiltElevation ?? 55, // degrees, typical fixed tilt
      fixedAzimuth: config.fixedAzimuth ?? 180 // facing south
    };

    this.reset();
  }

  reset() {
    this.time = DAY_START;
    this.running = false;
    this.mode = 'automatic'; // 'fixed' | 'manual' | 'automatic'
    this.speed = 10; // multiplier

    this.fixedPanel = {
      azimuth: this.config.fixedAzimuth,
      elevation: this.config.fixedTiltElevation
    };

    this.manualPanel = {
      azimuth: this.config.fixedAzimuth,
      elevation: this.config.fixedTiltElevation
    };

    this.tracker = new TrackingController({
      azimuth: this.config.fixedAzimuth,
      elevation: this.config.fixedTiltElevation
    });

    this.fixedEnergy = new EnergyAccumulator();
    this.trackedEnergy = new EnergyAccumulator();

    this.history = [];
    this.lastTick = null;

    return this.getSnapshot();
  }

  updateConfig(partial = {}) {
    this.config = { ...this.config, ...partial };
  }

  setMode(mode) {
    if (['fixed', 'manual', 'automatic'].includes(mode)) {
      this.mode = mode;
    }
  }

  setSpeed(speed) {
    const allowed = [1, 10, 50];
    if (allowed.includes(Number(speed))) {
      this.speed = Number(speed);
    }
  }

  setManualOrientation(azimuth, elevation) {
    this.manualPanel = {
      azimuth: Math.max(0, Math.min(360, Number(azimuth))),
      elevation: Math.max(0, Math.min(90, Number(elevation)))
    };
  }

  /**
   * Advance the simulation by dtHours of simulated time.
   */
  tick(dtHours) {
    if (this.time >= DAY_END) {
      this.time = DAY_END;
      this.running = false;
      return this.getSnapshot();
    }

    const sun = getSunPosition(this.time, this.config.latitude, this.config.dayOfYear);
    const sunVector = toVector(sun.azimuth, sun.elevation);
    const available = availableIrradiance(sun.elevation);

    // --- Fixed panel (baseline, never moves) ---
    const fixedNormal = toVector(this.fixedPanel.azimuth, this.fixedPanel.elevation);
    const fixedIrradiance = receivedIrradiance(available, sunVector, fixedNormal);
    const fixedPower = computePower(fixedIrradiance, this.config.panelArea, this.config.efficiency);
    this.fixedEnergy.integrate(fixedPower, dtHours);

    // --- Tracking panel (Perturb & Observe optimization) ---
    const measure = (az, el) => {
      const normal = toVector(az, el);
      return receivedIrradiance(available, sunVector, normal);
    };
    const trackResult = this.tracker.step(measure);
    const trackIrradiance = trackResult.irradiance;
    const trackPower = computePower(trackIrradiance, this.config.panelArea, this.config.efficiency);
    this.trackedEnergy.integrate(trackPower, dtHours);

    // --- Displayed panel depends on active mode ---
    let displayPanel;
    let displayIrradiance;
    let displayPower;
    if (this.mode === 'fixed') {
      displayPanel = this.fixedPanel;
      displayIrradiance = fixedIrradiance;
      displayPower = fixedPower;
    } else if (this.mode === 'manual') {
      displayPanel = this.manualPanel;
      const manualNormal = toVector(this.manualPanel.azimuth, this.manualPanel.elevation);
      displayIrradiance = receivedIrradiance(available, sunVector, manualNormal);
      displayPower = computePower(displayIrradiance, this.config.panelArea, this.config.efficiency);
    } else {
      displayPanel = { azimuth: this.tracker.azimuth, elevation: this.tracker.elevation };
      displayIrradiance = trackIrradiance;
      displayPower = trackPower;
    }

    const displayNormal = toVector(displayPanel.azimuth, displayPanel.elevation);
    const incidence = sun.elevation > 0 ? incidenceAngleDeg(sunVector, displayNormal) : 90;

    // Optimal possible irradiance right now (panel pointed exactly at sun)
    const maxPossible = available;
    const trackingEfficiencyPct =
      maxPossible > 0.01 ? Math.min(100, (displayIrradiance / maxPossible) * 100) : 100;

    this.time += dtHours;

    const sample = {
      time: Number(this.time.toFixed(4)),
      sunAzimuth: sun.azimuth,
      sunElevation: sun.elevation,
      fixedIrradiance: Number(fixedIrradiance.toFixed(2)),
      trackIrradiance: Number(trackIrradiance.toFixed(2)),
      fixedPower: Number(fixedPower.toFixed(2)),
      trackPower: Number(trackPower.toFixed(2))
    };
    this.history.push(sample);
    if (this.history.length > MAX_HISTORY_POINTS) {
      this.history.shift();
    }

    this.lastTick = {
      sun,
      panel: displayPanel,
      incidence,
      irradiance: displayIrradiance,
      power: displayPower,
      trackingEfficiencyPct,
      trackerStatus: trackResult.status,
      trackerMessage: trackResult.message
    };

    return this.getSnapshot();
  }

  getSnapshot() {
    const last = this.lastTick;
    const gainPct =
      this.fixedEnergy.totalWh > 0.01
        ? ((this.trackedEnergy.totalWh - this.fixedEnergy.totalWh) / this.fixedEnergy.totalWh) * 100
        : 0;

    return {
      time: Number(this.time.toFixed(3)),
      timeLabel: SimulationEngine.formatTime(this.time),
      running: this.running,
      mode: this.mode,
      speed: this.speed,
      dayComplete: this.time >= DAY_END,
      sun: last ? last.sun : getSunPosition(this.time, this.config.latitude, this.config.dayOfYear),
      panel: last ? last.panel : this.fixedPanel,
      fixedPanel: this.fixedPanel,
      trackingPanel: { azimuth: this.tracker.azimuth, elevation: this.tracker.elevation },
      manualPanel: this.manualPanel,
      incidenceAngle: last ? Number(last.incidence.toFixed(2)) : 0,
      irradiance: last ? Number(last.irradiance.toFixed(1)) : 0,
      power: last ? Number(last.power.toFixed(1)) : 0,
      trackingEfficiency: last ? Number(last.trackingEfficiencyPct.toFixed(1)) : 0,
      trackerStatus: last ? last.trackerStatus : 'INITIALIZING',
      trackerMessage: last ? last.trackerMessage : 'Waiting to start.',
      fixedEnergyWh: Number(this.fixedEnergy.totalWh.toFixed(2)),
      trackedEnergyWh: Number(this.trackedEnergy.totalWh.toFixed(2)),
      energyGainPct: Number(gainPct.toFixed(2)),
      config: this.config
    };
  }

  getResults() {
    return {
      history: this.history,
      fixedEnergyWh: Number(this.fixedEnergy.totalWh.toFixed(2)),
      trackedEnergyWh: Number(this.trackedEnergy.totalWh.toFixed(2)),
      energyGainPct: Number(this.getSnapshot().energyGainPct)
    };
  }

  static formatTime(hoursDecimal) {
    const h = Math.floor(hoursDecimal);
    const m = Math.floor((hoursDecimal - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}

module.exports = SimulationEngine;
module.exports.DAY_START = DAY_START;
module.exports.DAY_END = DAY_END;
