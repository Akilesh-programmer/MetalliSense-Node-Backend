const express = require('express');
const authController = require('../controllers/authController');
const spectrometerController = require('../controllers/spectrometerController');

const router = express.Router();

// Public OPC status route (for testing)
router.get('/opc-status', spectrometerController.getOPCStatus);

// All other routes are protected
router.use(authController.protect);

// Special routes (before generic CRUD routes)
router.post(
  '/create-validated',
  spectrometerController.createReadingWithValidation,
);
router.post(
  '/generate-synthetic',
  spectrometerController.generateSyntheticReading,
);

// OPC UA routes
router.post('/opc-reading', spectrometerController.requestOPCReading);

// Standard CRUD routes
router
  .route('/')
  .get(spectrometerController.getAllReadings)
  .post(spectrometerController.createReading);

router
  .route('/:id')
  .get(spectrometerController.getReading)
  .patch(spectrometerController.updateReading)
  .delete(spectrometerController.deleteReading);

module.exports = router;
