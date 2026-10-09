const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', {
    title: 'SOLARIS — Intelligent Solar Tracking Simulator'
  });
});

module.exports = router;
