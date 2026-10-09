/**
 * app.js
 * Application entry point. Boots the Three.js scenes, canvas charts,
 * control bindings, and the state-polling loop once the DOM is ready.
 */

document.addEventListener('DOMContentLoaded', () => {
  SolarisSim.initScenes();
  SolarisSim.initCharts();
  SolarisControls.init();
  SolarisSim.startPolling();
});
