const express = require('express');
const router = express.Router();

const simulationController = require('../controllers/simulationController');
const configurationController = require('../controllers/configurationController');

// Health & config
router.get('/health', configurationController.health);
router.get('/config', configurationController.getConfig);
router.post('/simulation/config', configurationController.updateConfig);

// Simulation state & results
router.get('/simulation/state', simulationController.getState);
router.get('/simulation/results', simulationController.getResults);

// Simulation lifecycle
router.post('/simulation/start', simulationController.start);
router.post('/simulation/pause', simulationController.pause);
router.post('/simulation/reset', simulationController.reset);
router.post('/simulation/step', simulationController.step);

// Tracking & panel control
router.post('/tracking/mode', simulationController.setTrackingMode);
router.post('/panel/orientation', simulationController.setPanelOrientation);
router.post('/simulation/speed', simulationController.setSpeed);

module.exports = router;
