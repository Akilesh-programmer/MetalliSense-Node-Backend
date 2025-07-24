const express = require('express');
const authController = require('../controllers/authController');
const spectrometerController = require('../controllers/spectrometerController');

const router = express.Router();

// Protect all routes (authentication required)
router.use(authController.protect);

// Spectrometer connection routes
router.post('/connect', spectrometerController.connectToSpectrometer);
router.post('/disconnect', spectrometerController.disconnectFromSpectrometer);

// Data and status routes
router.get('/latest-reading', spectrometerController.getLatestReading);
router.get('/status', spectrometerController.getStatus);

// Configuration route
router.put('/config', spectrometerController.updateConfiguration);

module.exports = router;
