/**
 * trackingController.js
 * A deterministic "Perturb & Observe" hill-climbing optimization
 * controller. It nudges panel azimuth and elevation a small amount,
 * measures the resulting irradiance, and keeps moving in whichever
 * direction increased irradiance. When changes fall below tolerance,
 * it holds its position ("near optimum").
 *
 * This is a mathematical optimization controller — not machine learning.
 */

const MAX_STEP = 2.2; // degrees, initial perturbation size
const MIN_STEP = 0.15; // degrees, smallest perturbation size
const STEP_DECAY = 0.985; // shrinks step size as it converges
const HOLD_TOLERANCE = 0.05; // W/m^2 change considered "near optimum"

class TrackingController {
  constructor({ azimuth = 180, elevation = 45 } = {}) {
    this.azimuth = azimuth;
    this.elevation = elevation;
    this.azStep = MAX_STEP;
    this.elStep = MAX_STEP;
    this.azDirection = 1;
    this.elDirection = 1;
    this.lastIrradiance = 0;
    this.status = 'INITIALIZING';
    this.message = 'Acquiring initial orientation.';
  }

  reset({ azimuth = 180, elevation = 45 } = {}) {
    this.azimuth = azimuth;
    this.elevation = elevation;
    this.azStep = MAX_STEP;
    this.elStep = MAX_STEP;
    this.azDirection = 1;
    this.elDirection = 1;
    this.lastIrradiance = 0;
    this.status = 'INITIALIZING';
    this.message = 'Acquiring initial orientation.';
  }

  /**
   * Advance the controller by one optimization tick.
   * @param {function(number, number): number} measureFn - given (az, el) returns received irradiance
   */
  step(measureFn) {
    const baselineIrradiance = measureFn(this.azimuth, this.elevation);

    // --- Perturb azimuth ---
    const candidateAz = this.azimuth + this.azDirection * this.azStep;
    const irradianceAfterAz = measureFn(candidateAz, this.elevation);

    let azMoved = false;
    if (irradianceAfterAz >= baselineIrradiance) {
      this.azimuth = candidateAz;
      azMoved = true;
    } else {
      this.azDirection *= -1;
    }

    // --- Perturb elevation ---
    const candidateEl = Math.max(
      0,
      Math.min(90, this.elevation + this.elDirection * this.elStep)
    );
    const irradianceAfterEl = measureFn(this.azimuth, candidateEl);

    let elMoved = false;
    if (irradianceAfterEl >= irradianceAfterAz) {
      this.elevation = candidateEl;
      elMoved = true;
    } else {
      this.elDirection *= -1;
    }

    const finalIrradiance = measureFn(this.azimuth, this.elevation);
    const delta = finalIrradiance - this.lastIrradiance;

    // Gradually shrink step size to converge smoothly
    this.azStep = Math.max(MIN_STEP, this.azStep * STEP_DECAY);
    this.elStep = Math.max(MIN_STEP, this.elStep * STEP_DECAY);

    if (Math.abs(delta) < HOLD_TOLERANCE && this.azStep <= MIN_STEP * 1.5) {
      this.status = 'HOLDING';
      this.message = 'Near optimum — holding orientation.';
    } else if (azMoved || elMoved) {
      this.status = 'OPTIMIZING';
      const dir = delta >= 0 ? 'increased' : 'adjusting';
      this.message = `Rotating toward the Sun — irradiance ${dir}.`;
    } else {
      this.status = 'OPTIMIZING';
      this.message = 'Reversing direction — irradiance decreased.';
    }

    this.lastIrradiance = finalIrradiance;

    return {
      azimuth: this.azimuth,
      elevation: this.elevation,
      status: this.status,
      message: this.message,
      irradiance: finalIrradiance
    };
  }
}

module.exports = TrackingController;
