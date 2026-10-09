/**
 * panelPhysics.js
 * Vector geometry helpers used to translate azimuth/elevation angles
 * into 3D unit direction vectors, and to compute the incidence angle
 * between the Sun direction and a panel's surface normal.
 *
 * Convention (right-handed, Y-up):
 *   azimuth  - degrees clockwise from North (0-360)
 *   elevation - degrees above the horizon (0-90)
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function toVector(azimuthDeg, elevationDeg) {
  const az = azimuthDeg * DEG2RAD;
  const el = elevationDeg * DEG2RAD;
  return {
    x: Math.cos(el) * Math.sin(az),
    y: Math.sin(el),
    z: Math.cos(el) * Math.cos(az)
  };
}

function dot3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Angle (degrees) between the sun direction vector and the panel normal.
 */
function incidenceAngleDeg(sunVector, panelNormal) {
  const d = clamp(dot3(sunVector, panelNormal), -1, 1);
  return Math.acos(d) * RAD2DEG;
}

/**
 * Simplified electrical power output.
 * P = I * A * eta
 * @param {number} irradiance W/m^2
 * @param {number} areaM2 panel area in square meters
 * @param {number} efficiency 0-1 conversion efficiency
 */
function computePower(irradiance, areaM2, efficiency) {
  return Math.max(0, irradiance * areaM2 * efficiency);
}

module.exports = {
  toVector,
  dot3,
  clamp,
  incidenceAngleDeg,
  computePower
};
