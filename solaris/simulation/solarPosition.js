/**
 * solarPosition.js
 * Simplified solar position model.
 * Computes the Sun's azimuth and elevation for a given simulated time of day.
 *
 * This is a deliberately simplified astronomical model intended for
 * educational simulation purposes (see "Simulation Assumptions").
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Compute solar declination angle (degrees) for a given day of year.
 * @param {number} dayOfYear 1-365
 */
function solarDeclination(dayOfYear) {
  return 23.45 * Math.sin(DEG2RAD * (360 / 365) * (284 + dayOfYear));
}

/**
 * Compute the Sun's position in the sky.
 * @param {number} timeHours - simulated time of day, 0-24 (decimal hours)
 * @param {number} latitudeDeg - observer latitude in degrees
 * @param {number} dayOfYear - day of year, 1-365 (defaults to summer solstice)
 * @returns {{azimuth: number, elevation: number}} degrees
 */
function getSunPosition(timeHours, latitudeDeg = 28, dayOfYear = 172) {
  const lat = latitudeDeg * DEG2RAD;
  const dec = solarDeclination(dayOfYear) * DEG2RAD;

  // Hour angle: 15 degrees per hour from solar noon
  const hourAngleDeg = 15 * (timeHours - 12);
  const hourAngle = hourAngleDeg * DEG2RAD;

  // Elevation
  const sinElevation =
    Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(hourAngle);
  const elevationRad = Math.asin(Math.max(-1, Math.min(1, sinElevation)));
  const elevationDeg = elevationRad * RAD2DEG;

  // Azimuth (measured clockwise from North, 0-360)
  let cosAzimuth =
    (Math.sin(dec) - Math.sin(elevationRad) * Math.sin(lat)) /
    (Math.cos(elevationRad) * Math.cos(lat) || 1e-9);
  cosAzimuth = Math.max(-1, Math.min(1, cosAzimuth));
  let azimuthDeg = Math.acos(cosAzimuth) * RAD2DEG;

  if (hourAngleDeg > 0) {
    azimuthDeg = 360 - azimuthDeg;
  }

  return {
    azimuth: Number(azimuthDeg.toFixed(3)),
    elevation: Number(elevationDeg.toFixed(3))
  };
}

module.exports = {
  getSunPosition,
  solarDeclination
};
