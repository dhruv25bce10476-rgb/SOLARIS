const simulationService = require('../services/simulationService');

function ok(res, data) {
  res.json({ success: true, data });
}

function fail(res, message, code = 400) {
  res.status(code).json({ success: false, error: message });
}

exports.getState = (req, res) => {
  try {
    ok(res, simulationService.getState());
  } catch (err) {
    fail(res, err.message, 500);
  }
};

exports.getResults = (req, res) => {
  try {
    ok(res, simulationService.getResults());
  } catch (err) {
    fail(res, err.message, 500);
  }
};

exports.start = (req, res) => {
  try {
    ok(res, simulationService.start());
  } catch (err) {
    fail(res, err.message, 500);
  }
};

exports.pause = (req, res) => {
  try {
    ok(res, simulationService.pause());
  } catch (err) {
    fail(res, err.message, 500);
  }
};

exports.reset = (req, res) => {
  try {
    ok(res, simulationService.reset());
  } catch (err) {
    fail(res, err.message, 500);
  }
};

exports.step = (req, res) => {
  try {
    ok(res, simulationService.step());
  } catch (err) {
    fail(res, err.message, 500);
  }
};

exports.setTrackingMode = (req, res) => {
  const { mode } = req.body;
  if (!['fixed', 'manual', 'automatic'].includes(mode)) {
    return fail(res, 'Invalid tracking mode. Use fixed, manual, or automatic.');
  }
  try {
    ok(res, simulationService.setTrackingMode(mode));
  } catch (err) {
    fail(res, err.message, 500);
  }
};

exports.setPanelOrientation = (req, res) => {
  const { azimuth, elevation } = req.body;
  if (typeof azimuth !== 'number' || typeof elevation !== 'number') {
    return fail(res, 'azimuth and elevation must be numbers.');
  }
  try {
    ok(res, simulationService.setPanelOrientation(azimuth, elevation));
  } catch (err) {
    fail(res, err.message, 500);
  }
};

exports.setSpeed = (req, res) => {
  const { speed } = req.body;
  try {
    ok(res, simulationService.setSpeed(speed));
  } catch (err) {
    fail(res, err.message, 500);
  }
};
