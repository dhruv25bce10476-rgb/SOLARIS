const simulationService = require('../services/simulationService');

exports.health = (req, res) => {
  res.json({ success: true, data: { status: 'ok', service: 'SOLARIS', time: new Date().toISOString() } });
};

exports.getConfig = (req, res) => {
  res.json({ success: true, data: simulationService.getConfig() });
};

exports.updateConfig = (req, res) => {
  const allowedKeys = ['latitude', 'dayOfYear', 'panelArea', 'efficiency', 'fixedTiltElevation', 'fixedAzimuth'];
  const partial = {};
  for (const key of allowedKeys) {
    if (req.body[key] !== undefined) {
      const val = Number(req.body[key]);
      if (Number.isNaN(val)) {
        return res.status(400).json({ success: false, error: `Invalid value for ${key}` });
      }
      partial[key] = val;
    }
  }
  const state = simulationService.updateConfig(partial);
  res.json({ success: true, data: state });
};
