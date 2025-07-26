const express = require('express');
const authController = require('../controllers/authController');
const spectrometerController = require('../controllers/spectrometerController');

const router = express.Router();

// All routes are protected
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
