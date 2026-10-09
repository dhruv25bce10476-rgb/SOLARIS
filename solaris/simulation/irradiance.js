/**
 * irradiance.js
 * Simplified clear-sky irradiance model and the cosine-law projection
 * of that irradiance onto a panel surface.
 *
 *   I_received = I_sun * max(0, cos(theta))
 *
 * where theta is the incidence angle between incoming sunlight and the
 * panel normal, computed as the dot product of two unit vectors.
 */

const { dot3, clamp } = require('./panelPhysics');

const SOLAR_CONSTANT = 1000; // W/m^2 — idealized peak clear-sky irradiance

/**
 * Available solar irradiance before hitting any surface.
 * Approximates atmospheric extinction at low sun angles using a
 * simple sine-of-elevation attenuation (simplified clear-sky model).
 * @param {number} sunElevationDeg
 */
function availableIrradiance(sunElevationDeg) {
  if (sunElevationDeg <= 0) return 0;
  const rad = (sunElevationDeg * Math.PI) / 180;
  return SOLAR_CONSTANT * Math.sin(rad);
}

/**
 * Irradiance actually received by a panel, given the available
 * (pre-surface) irradiance and the unit direction vectors of the
 * sun and the panel's normal.
 * @param {number} available W/m^2
 * @param {{x:number,y:number,z:number}} sunVector unit vector
 * @param {{x:number,y:number,z:number}} panelNormal unit vector
 */
function receivedIrradiance(available, sunVector, panelNormal) {
  const cosTheta = clamp(dot3(sunVector, panelNormal), -1, 1);
  return available * Math.max(0, cosTheta);
}

module.exports = {
  SOLAR_CONSTANT,
  availableIrradiance,
  receivedIrradiance
};
