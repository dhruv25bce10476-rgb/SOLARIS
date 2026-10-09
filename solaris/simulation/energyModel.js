/**
 * energyModel.js
 * Integrates instantaneous power (Watts) over elapsed simulated time
 * to accumulate energy in watt-hours.
 */

class EnergyAccumulator {
  constructor() {
    this.totalWh = 0;
  }

  reset() {
    this.totalWh = 0;
  }

  /**
   * @param {number} powerW instantaneous power in Watts
   * @param {number} dtHours elapsed simulated time in hours
   */
  integrate(powerW, dtHours) {
    if (powerW > 0 && dtHours > 0) {
      this.totalWh += powerW * dtHours;
    }
    return this.totalWh;
  }

  get kWh() {
    return this.totalWh / 1000;
  }
}

module.exports = EnergyAccumulator;
